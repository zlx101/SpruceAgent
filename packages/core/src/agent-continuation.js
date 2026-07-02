import { getApprovalTicket, listApprovalTickets } from "./approvals.js";
import { executeApprovedCandidateStep } from "./candidate-approvals.js";
import { appendTraceEvent, readTraceEvents } from "./trace.js";

export const RUN_CONTINUATION_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.run-continuation",
  sourceKind: "agent.run.trace",
  safetyBoundary: [
    "Run Continuation v0 resumes only from an existing agent run trace.",
    "Only approval-gated candidate steps can be resumed.",
    "A resumed step requires an approved matching approval ticket.",
    "Continuation execution still goes through executeApprovedCandidateStep and TrustKernel.",
  ],
});

export function getRunContinuationContract() {
  return RUN_CONTINUATION_CONTRACT;
}

export async function resumeAgentRun(store, input = {}) {
  const traceId = input.traceId;
  if (!traceId) throw new Error("traceId is required");

  const snapshot = getAgentRunSnapshot(store, traceId);
  const candidatePlan = snapshot.run?.candidatePlan;
  appendTraceEvent(store, traceId, "agent.resume.started", {
    stepId: input.stepId ?? null,
    approvalId: input.approvalId ?? null,
  });

  if (!candidatePlan || !Array.isArray(candidatePlan.promotedSteps)) {
    const blocked = createBlockedContinuation(traceId, snapshot.run, "run trace does not contain a candidatePlan");
    appendTraceEvent(store, traceId, "agent.resume.completed", blocked);
    return blocked;
  }

  const selectedSteps = candidatePlan.promotedSteps
    .filter((step) => step.promotionStatus === "requires_approval")
    .filter((step) => !input.stepId || step.id === input.stepId);

  if (input.stepId && selectedSteps.length === 0) {
    const blocked = createBlockedContinuation(traceId, snapshot.run, `approval-gated candidate step not found: ${input.stepId}`);
    appendTraceEvent(store, traceId, "agent.resume.completed", blocked);
    return blocked;
  }

  const results = [];
  for (const step of selectedSteps) {
    const approvalId = resolveApprovalId(store, traceId, step, input);
    if (!approvalId) {
      results.push({
        stepId: step.id,
        status: "requires_approval",
        promotionStatus: step.promotionStatus,
        reason: "no approved approval ticket found for candidate step",
      });
      continue;
    }

    const ticket = getApprovalTicket(store, approvalId);
    if (ticket.status !== "approved") {
      results.push({
        stepId: step.id,
        status: "requires_approval",
        promotionStatus: step.promotionStatus,
        approvalId,
        reason: `approval is ${ticket.status}`,
      });
      continue;
    }

    const execution = await executeApprovedCandidateStep(store, {
      candidatePlan,
      stepId: step.id,
      approvalId,
      traceId,
      trustMode: input.trustMode ?? snapshot.run?.trace?.trustMode ?? "approve",
      actor: input.actor ?? "local-user",
      timeoutMs: input.timeoutMs,
    });
    results.push(execution);
  }

  const output = {
    version: RUN_CONTINUATION_CONTRACT.version,
    status: summarizeContinuationStatus(results),
    traceId,
    sourceRun: {
      id: snapshot.run?.id ?? traceId,
      goal: snapshot.run?.goal ?? snapshot.trace?.goal ?? null,
      status: snapshot.run?.status ?? null,
    },
    resultCount: results.length,
    summary: summarizeResults(results),
    results,
    limits: [
      "Run Continuation v0 does not re-plan.",
      "Run Continuation v0 does not create approval tickets.",
      "Only approved matching candidate approval tickets can resume execution.",
    ],
  };
  appendTraceEvent(store, traceId, "agent.resume.completed", output);
  return output;
}

export function getAgentRunSnapshot(store, traceId) {
  const events = readTraceEvents(store, traceId);
  const started = events.find((event) => event.type === "trace.started")?.payload ?? null;
  const completed = [...events].reverse().find((event) => event.type === "agent.completed")?.payload ?? null;
  if (!completed) {
    throw new Error(`agent run completion not found in trace: ${traceId}`);
  }
  return {
    traceId,
    trace: started,
    run: completed,
    eventCount: events.length,
  };
}

function resolveApprovalId(store, traceId, step, input) {
  const explicit = input.approvalIds?.[step.id] ?? input.approvalId;
  if (explicit) return explicit;

  const toolName = step.toolName ?? step.requestedToolName;
  const candidateInput = step.input ?? step.requestedInput;
  const ticket = listApprovalTickets(store, "approved").find((item) => (
    item.traceId === traceId
    && item.toolName === toolName
    && JSON.stringify(item.input) === JSON.stringify(candidateInput)
    && item.metadata?.kind === "candidate_step"
    && item.metadata?.candidateStepId === step.id
  ));
  return ticket?.id ?? null;
}

function createBlockedContinuation(traceId, run, reason) {
  return {
    version: RUN_CONTINUATION_CONTRACT.version,
    status: "completed_with_blockers",
    traceId,
    sourceRun: {
      id: run?.id ?? traceId,
      goal: run?.goal ?? null,
      status: run?.status ?? null,
    },
    resultCount: 1,
    summary: {
      blocked: 1,
    },
    results: [
      {
        stepId: "run_resume",
        status: "blocked",
        reason,
      },
    ],
    limits: [
      "Run Continuation v0 requires an existing candidatePlan in the run trace.",
    ],
  };
}

function summarizeContinuationStatus(results) {
  if (results.some((result) => result.status === "requires_approval")) return "requires_approval";
  if (results.some((result) => ["failed", "blocked", "skipped"].includes(result.status))) {
    return "completed_with_blockers";
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
