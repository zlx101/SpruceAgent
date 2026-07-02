import { executeTool } from "./executor.js";
import { appendTraceEvent } from "./trace.js";

export const CANDIDATE_EXECUTION_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.candidate-execution",
  sourceKind: "candidate_plan",
  defaultExecutableStatus: "ready",
  safetyBoundary: [
    "Candidate Execution v0 only runs explicitly requested candidate plans.",
    "Only promotionStatus=ready steps are executed.",
    "All execution still goes through executeTool and TrustKernel.",
    "requires_approval, blocked, and not_promotable steps are reported but not executed.",
  ],
});

export function getCandidateExecutionContract() {
  return CANDIDATE_EXECUTION_CONTRACT;
}

export async function executeCandidatePlan(store, input = {}) {
  const candidatePlan = input.candidatePlan;
  if (!candidatePlan || !Array.isArray(candidatePlan.promotedSteps)) {
    throw new Error("candidatePlan with promotedSteps is required");
  }

  const results = [];
  for (const step of candidatePlan.promotedSteps) {
    appendCandidateEvent(store, input.traceId, "candidate.step.started", {
      stepId: step.id,
      promotionStatus: step.promotionStatus,
      toolName: step.toolName,
    });

    if (step.promotionStatus !== "ready" || !step.executable || !step.toolName) {
      const skipped = {
        stepId: step.id,
        status: mapSkippedStatus(step.promotionStatus),
        promotionStatus: step.promotionStatus,
        reason: step.reason ?? "candidate step is not ready for execution",
      };
      results.push(skipped);
      appendCandidateEvent(store, input.traceId, "candidate.step.completed", skipped);
      continue;
    }

    const execution = await executeTool(store, {
      toolName: step.toolName,
      input: step.input ?? {},
      traceId: input.traceId,
      trustMode: input.trustMode ?? "approve",
      requester: input.actor ?? "local-user",
      approvalId: input.approvalIds?.[step.id],
      timeoutMs: input.timeoutMs,
    });
    const result = {
      stepId: step.id,
      promotionStatus: step.promotionStatus,
      ...execution,
    };
    results.push(result);
    appendCandidateEvent(store, input.traceId, "candidate.step.completed", {
      stepId: step.id,
      status: execution.status,
      toolName: step.toolName,
    });
  }

  const output = {
    version: CANDIDATE_EXECUTION_CONTRACT.version,
    status: summarizeStatus(results),
    resultCount: results.length,
    summary: summarizeResults(results),
    results,
    limits: [
      "Candidate Execution v0 does not execute requires_approval, blocked, or not_promotable steps.",
      "Approval tickets are still created by executeTool when TrustKernel requires approval.",
      "Candidate execution does not mutate the candidate plan.",
    ],
  };
  appendCandidateEvent(store, input.traceId, "candidate.execution.completed", output);
  return output;
}

function mapSkippedStatus(promotionStatus) {
  if (promotionStatus === "requires_approval") return "requires_approval";
  if (promotionStatus === "blocked") return "blocked";
  return "skipped";
}

function summarizeStatus(results) {
  if (results.some((result) => ["failed", "blocked", "skipped"].includes(result.status))) {
    return "completed_with_blockers";
  }
  if (results.some((result) => result.status === "requires_approval")) {
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

function appendCandidateEvent(store, traceId, type, payload) {
  if (traceId) appendTraceEvent(store, traceId, type, payload);
}
