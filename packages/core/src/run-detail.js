import { listApprovalTickets } from "./approvals.js";
import { getApprovalQueue } from "./approval-queue.js";
import { listArtifactsForTrace } from "./artifacts.js";
import { createSourceMap } from "./context.js";
import { listEvaluations } from "./evaluations.js";
import { readTraceEvents } from "./trace.js";

export const RUN_DETAIL_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.run-detail",
  sourceKind: "agent.run.trace",
  outputKind: "audit_view",
  safetyBoundary: [
    "Run Detail v0 is read-only.",
    "It reconstructs a run view from trace events and approval tickets.",
    "It does not approve, reject, resume, re-plan, or execute tools.",
    "Raw trace events remain available for auditability.",
  ],
});

export function getRunDetailContract() {
  return RUN_DETAIL_CONTRACT;
}

export function getRunDetail(store, traceId) {
  if (!traceId) throw new Error("traceId is required");
  const events = readTraceEvents(store, traceId);
  const completed = latestEvent(events, "agent.completed");
  if (!completed) throw new Error(`agent run completion not found in trace: ${traceId}`);

  const run = completed.payload;
  const sourceMap = createSourceMap(store, {
    query: run.context?.query ?? run.goal,
    context: run.context,
    skills: run.skill ? [run.skill] : [],
    llm: run.llm,
  });
  const approvals = listApprovalTickets(store)
    .filter((ticket) => ticket.traceId === traceId)
    .map((ticket) => approvalSummary(ticket));
  const evaluations = listEvaluations(store)
    .filter((evaluation) => evaluation.traceId === traceId)
    .map((evaluation) => ({
      id: evaluation.id,
      status: evaluation.status,
      reliabilityScore: evaluation.summary?.reliabilityScore ?? null,
      createdAt: evaluation.createdAt,
    }));
  const resumeEvents = events
    .filter((event) => event.type === "agent.resume.completed")
    .map((event) => ({
      id: event.id,
      createdAt: event.createdAt,
      status: event.payload?.status,
      resultCount: event.payload?.resultCount ?? 0,
      results: event.payload?.results ?? [],
    }));
  const decisionQueue = getApprovalQueue(store, {
    traceKind: "agent.run",
  });
  const traceDecisionQueue = {
    ...decisionQueue,
    items: decisionQueue.items.filter((item) => item.traceId === traceId),
  };
  traceDecisionQueue.summary = summarizeDecisionQueue(traceDecisionQueue.items);
  traceDecisionQueue.status = deriveDecisionQueueStatus(traceDecisionQueue.items);
  const artifacts = listArtifactsForTrace(store, traceId);

  return {
    version: RUN_DETAIL_CONTRACT.version,
    traceId,
    status: resumeEvents.at(-1)?.status ?? run.status,
    summary: {
      goal: run.goal,
      runStatus: run.status,
      continuationStatus: resumeEvents.at(-1)?.status ?? null,
      eventCount: events.length,
      approvalCount: approvals.length,
      pendingApprovalCount: approvals.filter((approval) => approval.status === "pending").length,
      decisionQueueCount: traceDecisionQueue.summary.total,
      candidateStepCount: run.candidatePlan?.promotedSteps?.length ?? 0,
      toolResultCount: events.filter((event) => event.type === "tool.result").length,
      artifactCount: artifacts.length,
      evaluationCount: evaluations.length,
    },
    run: {
      id: run.id,
      goal: run.goal,
      traceId: run.traceId,
      status: run.status,
      knownFacts: run.knownFacts,
      context: run.context,
      llm: run.llm,
      plan: run.plan,
      candidatePlan: run.candidatePlan,
      candidateApprovals: run.candidateApprovals,
      candidateExecution: run.candidateExecution,
      results: run.results,
      memory: run.memory,
      summary: run.summary,
      limits: run.limits,
    },
    sourceMap,
    candidateSteps: buildCandidateSteps(run.candidatePlan, approvals),
    approvals,
    decisionQueue: traceDecisionQueue,
    artifacts,
    toolResults: events
      .filter((event) => event.type === "tool.result")
      .map((event) => ({
        id: event.id,
        createdAt: event.createdAt,
        toolName: event.payload?.toolName,
        status: event.payload?.status,
        decision: event.payload?.decision,
        output: event.payload?.output,
        error: event.payload?.error,
      })),
    resumeEvents,
    evaluations,
    timeline: events.map((event) => timelineEvent(event)),
    events,
    limits: [
      "Run Detail v0 is read-only and does not execute actions.",
      "The raw events array is included for auditability.",
      "Large outputs are not summarized or redacted in v0.",
    ],
  };
}

function buildCandidateSteps(candidatePlan, approvals) {
  return (candidatePlan?.promotedSteps ?? []).map((step) => {
    const stepApprovals = approvals.filter((approval) => approval.stepId === step.id);
    return {
      id: step.id,
      description: step.description,
      promotionStatus: step.promotionStatus,
      executable: step.executable,
      toolName: step.toolName ?? step.requestedToolName,
      input: step.input ?? step.requestedInput,
      reason: step.reason,
      policyPreview: step.policyPreview,
      approvals: stepApprovals,
      latestApprovalStatus: stepApprovals.at(-1)?.status ?? null,
    };
  });
}

function approvalSummary(ticket) {
  return {
    approvalId: ticket.id,
    status: ticket.status,
    stepId: ticket.metadata?.candidateStepId ?? null,
    kind: ticket.metadata?.kind ?? "tool",
    toolName: ticket.toolName,
    input: ticket.input,
    decision: ticket.decision,
    reason: ticket.reason,
    requester: ticket.requester,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    expiresAt: ticket.expiresAt,
    resolvedAt: ticket.resolvedAt,
    resolvedBy: ticket.resolvedBy,
    resolutionReason: ticket.resolutionReason,
  };
}

function timelineEvent(event) {
  return {
    id: event.id,
    type: event.type,
    createdAt: event.createdAt,
    label: labelForEvent(event),
    status: event.payload?.status ?? event.payload?.decision?.decision ?? null,
  };
}

function labelForEvent(event) {
  if (event.type === "trace.started") return "Trace started";
  if (event.type === "agent.known_facts") return "Known facts collected";
  if (event.type === "agent.context") return "Context retrieved";
  if (event.type === "agent.plan") return "Rule-based plan created";
  if (event.type === "llm.request") return "LLM draft requested";
  if (event.type === "llm.response") return "LLM draft received";
  if (event.type === "planner.promotion") return "Draft promoted to candidate plan";
  if (event.type === "candidate.approvals.requested") return "Candidate approvals requested";
  if (event.type === "candidate.approval.created") return "Candidate approval created";
  if (event.type === "candidate.execution.completed") return "Candidate execution completed";
  if (event.type === "agent.resume.started") return "Run resume started";
  if (event.type === "agent.resume.completed") return "Run resume completed";
  if (event.type === "tool.policy") return `Policy checked: ${event.payload?.toolName ?? "tool"}`;
  if (event.type === "tool.result") return `Tool result: ${event.payload?.toolName ?? "tool"}`;
  if (event.type === "agent.completed") return "Agent run completed";
  return event.type;
}

function latestEvent(events, type) {
  return [...events].reverse().find((event) => event.type === type) ?? null;
}

function deriveDecisionQueueStatus(items) {
  if (items.some((item) => item.status === "pending_decision")) return "action_required";
  if (items.some((item) => item.status === "ready_to_resume")) return "ready_to_resume";
  return "clear";
}

function summarizeDecisionQueue(items) {
  return items.reduce((summary, item) => ({
    total: summary.total + 1,
    pendingDecisionCount: summary.pendingDecisionCount + (item.status === "pending_decision" ? 1 : 0),
    readyToResumeCount: summary.readyToResumeCount + (item.status === "ready_to_resume" ? 1 : 0),
    approvedUnresumableCount: summary.approvedUnresumableCount + (item.status === "approved_unresumable" ? 1 : 0),
    completedCount: summary.completedCount + (item.status === "completed" ? 1 : 0),
  }), {
    total: 0,
    pendingDecisionCount: 0,
    readyToResumeCount: 0,
    approvedUnresumableCount: 0,
    completedCount: 0,
  });
}
