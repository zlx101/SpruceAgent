import { createApprovalTicket, listApprovalTickets } from "./approvals.js";
import { executeTool } from "./executor.js";
import { evaluatePolicy } from "./policy.js";
import { appendTraceEvent } from "./trace.js";
import { findTool } from "./tools.js";

export const CANDIDATE_APPROVAL_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.candidate-approval",
  sourceKind: "candidate_plan",
  approvalStatus: "requires_approval",
  safetyBoundary: [
    "Candidate Approval v0 creates approval tickets only for promotionStatus=requires_approval steps.",
    "Approval tickets are bound to the exact requested tool and input.",
    "Approved candidate step execution still goes through executeTool and TrustKernel.",
    "Blocked and not_promotable candidate steps cannot be converted into approvals.",
  ],
});

export function getCandidateApprovalContract() {
  return CANDIDATE_APPROVAL_CONTRACT;
}

export function requestCandidateApprovals(store, input = {}) {
  const candidatePlan = input.candidatePlan;
  if (!candidatePlan || !Array.isArray(candidatePlan.promotedSteps)) {
    throw new Error("candidatePlan with promotedSteps is required");
  }

  const results = candidatePlan.promotedSteps.map((step) => {
    if (step.promotionStatus !== "requires_approval") {
      return {
        stepId: step.id,
        status: "skipped",
        promotionStatus: step.promotionStatus,
        reason: "only requires_approval candidate steps can create approval tickets",
      };
    }

    const candidate = resolveCandidateStepTool(step);
    if (!candidate.ok) {
      return {
        stepId: step.id,
        status: "blocked",
        promotionStatus: step.promotionStatus,
        reason: candidate.reason,
      };
    }

    const existing = findReusableApproval(store, step, candidate);
    if (existing) {
      appendCandidateApprovalEvent(store, input.traceId, "candidate.approval.reused", {
        stepId: step.id,
        approvalId: existing.id,
        status: existing.status,
        toolName: existing.toolName,
      });
      return {
        stepId: step.id,
        status: "approval_reused",
        promotionStatus: step.promotionStatus,
        approval: existing,
      };
    }

    const approval = createApprovalTicket(store, {
      toolName: candidate.toolName,
      input: candidate.input,
      decision: step.policyPreview ?? evaluatePolicy({
        toolName: candidate.toolName,
        input: candidate.input,
        trustMode: input.trustMode ?? "approve",
      }),
      traceId: input.traceId,
      requester: input.actor ?? "local-user",
      reason: step.reason ?? "candidate step requires approval before execution",
      metadata: {
        kind: "candidate_step",
        candidateStepId: step.id,
        candidatePlanVersion: candidatePlan.version ?? null,
        source: "candidate-approval-v0",
      },
    });
    appendCandidateApprovalEvent(store, input.traceId, "candidate.approval.created", {
      stepId: step.id,
      approvalId: approval.id,
      toolName: approval.toolName,
    });
    return {
      stepId: step.id,
      status: "approval_created",
      promotionStatus: step.promotionStatus,
      approval,
    };
  });

  const output = {
    version: CANDIDATE_APPROVAL_CONTRACT.version,
    status: summarizeApprovalStatus(results),
    resultCount: results.length,
    summary: summarizeResults(results),
    results,
    limits: [
      "Candidate Approval v0 does not approve tickets automatically.",
      "Approved tickets must still be supplied to execute an approved candidate step.",
      "Approval tickets remain exact-match tool/input capabilities.",
    ],
  };
  appendCandidateApprovalEvent(store, input.traceId, "candidate.approvals.requested", output);
  return output;
}

export async function executeApprovedCandidateStep(store, input = {}) {
  const candidatePlan = input.candidatePlan;
  if (!candidatePlan || !Array.isArray(candidatePlan.promotedSteps)) {
    throw new Error("candidatePlan with promotedSteps is required");
  }
  if (!input.stepId) throw new Error("stepId is required");
  if (!input.approvalId) throw new Error("approvalId is required");

  const step = candidatePlan.promotedSteps.find((item) => item.id === input.stepId);
  if (!step) throw new Error(`candidate step not found: ${input.stepId}`);
  if (step.promotionStatus !== "requires_approval") {
    throw new Error(`candidate step is not approval-gated: ${input.stepId}`);
  }

  const candidate = resolveCandidateStepTool(step);
  if (!candidate.ok) throw new Error(candidate.reason);

  appendCandidateApprovalEvent(store, input.traceId, "candidate.approved_step.started", {
    stepId: step.id,
    approvalId: input.approvalId,
    toolName: candidate.toolName,
  });

  const execution = await executeTool(store, {
    toolName: candidate.toolName,
    input: candidate.input,
    traceId: input.traceId,
    trustMode: input.trustMode ?? "approve",
    requester: input.actor ?? "local-user",
    approvalId: input.approvalId,
    requireApproval: true,
    timeoutMs: input.timeoutMs,
  });
  const result = {
    version: CANDIDATE_APPROVAL_CONTRACT.version,
    stepId: step.id,
    promotionStatus: step.promotionStatus,
    approvalId: input.approvalId,
    ...execution,
  };
  appendCandidateApprovalEvent(store, input.traceId, "candidate.approved_step.completed", {
    stepId: step.id,
    approvalId: input.approvalId,
    status: result.status,
    toolName: candidate.toolName,
  });
  return result;
}

function resolveCandidateStepTool(step) {
  const toolName = step.toolName ?? step.requestedToolName;
  const candidateInput = step.input ?? step.requestedInput;
  if (!toolName) {
    return {
      ok: false,
      reason: "candidate step does not declare a requested tool",
    };
  }
  if (!findTool(toolName)) {
    return {
      ok: false,
      reason: `unknown tool: ${toolName}`,
    };
  }
  if (!candidateInput || typeof candidateInput !== "object" || Array.isArray(candidateInput)) {
    return {
      ok: false,
      reason: "candidate step does not declare object input",
    };
  }
  return {
    ok: true,
    toolName,
    input: candidateInput,
  };
}

function findReusableApproval(store, step, candidate) {
  return listApprovalTickets(store).find((ticket) => (
    ["pending", "approved"].includes(ticket.status)
    && ticket.toolName === candidate.toolName
    && JSON.stringify(ticket.input) === JSON.stringify(candidate.input)
    && ticket.metadata?.kind === "candidate_step"
    && ticket.metadata?.candidateStepId === step.id
  ));
}

function summarizeApprovalStatus(results) {
  if (results.some((result) => result.status === "blocked")) return "completed_with_blockers";
  if (results.some((result) => ["approval_created", "approval_reused"].includes(result.status))) {
    return "requires_approval";
  }
  return "completed";
}

function summarizeResults(results) {
  const counts = {};
  for (const result of results) {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
  }
  return counts;
}

function appendCandidateApprovalEvent(store, traceId, type, payload) {
  if (traceId) appendTraceEvent(store, traceId, type, payload);
}
