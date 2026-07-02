import { listApprovalTickets } from "./approvals.js";
import { createSourceMap } from "./context.js";
import { listEvaluations } from "./evaluations.js";
import { listTraces, readTraceEvents } from "./trace.js";

export const WORKFLOW_INBOX_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.workflow-inbox",
  sourceKind: "workflow.run.trace",
  outputKind: "desktop_workbench_state",
  safetyBoundary: [
    "Workflow Inbox v0 is read-only.",
    "It aggregates workflow.run traces and approval tickets without executing tools.",
    "It does not approve, reject, retry, resume, or mutate workflows.",
  ],
});

export const WORKFLOW_DETAIL_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.workflow-detail",
  sourceKind: "workflow.run.trace",
  outputKind: "audit_view",
  safetyBoundary: [
    "Workflow Detail v0 is read-only.",
    "It reconstructs a workflow run from trace events, approvals, and evaluations.",
    "It does not retry workflow steps or execute tools.",
    "Raw trace events remain available for auditability.",
  ],
});

export function getWorkflowInboxContract() {
  return WORKFLOW_INBOX_CONTRACT;
}

export function getWorkflowDetailContract() {
  return WORKFLOW_DETAIL_CONTRACT;
}

export function getWorkflowInbox(store, options = {}) {
  const limit = Number(options.limit ?? 20);
  const traces = listTraces(store)
    .filter((trace) => trace.metadata?.kind === "workflow.run")
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, Math.max(limit, 1));
  const approvals = listApprovalTickets(store);
  const workflowRuns = traces.map((trace) => workflowRunItem(store, trace, approvals));
  const pendingApprovalCount = workflowRuns.reduce((sum, item) => sum + item.pendingApprovalCount, 0);

  return {
    version: WORKFLOW_INBOX_CONTRACT.version,
    createdAt: new Date().toISOString(),
    status: pendingApprovalCount > 0 ? "action_required" : "clear",
    summary: {
      workflowRunCount: workflowRuns.length,
      pendingApprovalCount,
    },
    workflowRuns,
    limits: [
      "Workflow Inbox v0 is a read-only projection.",
      "It only includes workflow.run traces.",
      "It does not retry, resume, approve, reject, or execute workflow steps.",
    ],
  };
}

export function getWorkflowRunDetail(store, traceId) {
  if (!traceId) throw new Error("traceId is required");
  const events = readTraceEvents(store, traceId);
  const completed = latestEvent(events, "workflow.completed");
  if (!completed) throw new Error(`workflow completion not found in trace: ${traceId}`);

  const output = completed.payload;
  const resumeEvents = events
    .filter((event) => event.type === "workflow.resume.completed")
    .map((event) => ({
      id: event.id,
      createdAt: event.createdAt,
      status: event.payload?.status,
      resultCount: event.payload?.resultCount ?? 0,
      results: event.payload?.results ?? [],
    }));
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
  const toolResults = events
    .filter((event) => event.type === "tool.result")
    .map((event) => ({
      id: event.id,
      createdAt: event.createdAt,
      toolName: event.payload?.toolName,
      status: event.payload?.status,
      decision: event.payload?.decision,
      output: event.payload?.output,
      error: event.payload?.error,
    }));
  const contextEvents = events
    .filter((event) => event.type === "workflow.context")
    .map((event) => event.payload?.context)
    .filter(Boolean);
  const context = mergeWorkflowContexts(contextEvents, output.workflow?.name);
  const sourceMap = createSourceMap(store, {
    query: context.query,
    context,
  });

  return {
    version: WORKFLOW_DETAIL_CONTRACT.version,
    traceId,
    status: resumeEvents.at(-1)?.status ?? output.status,
    summary: {
      goal: startedGoal(events),
      workflowId: output.workflow?.id ?? null,
      workflowName: output.workflow?.name ?? null,
      eventCount: events.length,
      stepCount: output.workflow?.steps?.length ?? 0,
      resultCount: output.results?.length ?? 0,
      pendingApprovalCount: approvals.filter((approval) => approval.status === "pending").length,
      resumableStepCount: countResumableWorkflowSteps(output.results ?? [], approvals),
      toolResultCount: toolResults.length,
      evaluationCount: evaluations.length,
    },
    workflow: output.workflow,
    sourceMap,
    results: output.results ?? [],
    steps: buildWorkflowSteps(output.workflow, output.results ?? [], events),
    approvals,
    toolResults,
    resumeEvents,
    evaluations,
    timeline: events.map((event) => workflowTimelineEvent(event)),
    events,
    limits: [
      "Workflow Detail v0 is read-only and does not execute actions.",
      "The raw events array is included for auditability.",
      "Large outputs are not summarized or redacted in v0.",
    ],
  };
}

function mergeWorkflowContexts(contexts, fallbackQuery) {
  const results = [];
  for (const context of contexts) {
    results.push(...(context.results ?? []));
  }
  return {
    query: contexts.map((context) => context.query).filter(Boolean).join(" | ") || fallbackQuery || null,
    createdAt: contexts.at(-1)?.createdAt ?? null,
    resultCount: results.length,
    results,
  };
}

function workflowRunItem(store, trace, approvals) {
  const events = readTraceEvents(store, trace.id);
  const completed = latestEvent(events, "workflow.completed");
  const started = latestEvent(events, "workflow.started");
  const traceApprovals = approvals.filter((ticket) => ticket.traceId === trace.id);
  const pendingApprovalCount = traceApprovals.filter((ticket) => ticket.status === "pending").length;
  const output = completed?.payload ?? {};
  const workflow = output.workflow ?? {};
  const lastResume = latestEvent(events, "workflow.resume.completed");
  const resumableStepCount = countResumableWorkflowSteps(output.results ?? [], traceApprovals);

  return {
    traceId: trace.id,
    workflowId: trace.metadata?.workflowId ?? workflow.id ?? started?.payload?.workflowId ?? null,
    workflowName: workflow.name ?? started?.payload?.name ?? null,
    goal: startedGoal(events) ?? trace.goal,
    status: lastResume?.payload?.status ?? output.status ?? trace.status,
    workflowStatus: output.status ?? null,
    continuationStatus: lastResume?.payload?.status ?? null,
    stepCount: workflow.steps?.length ?? started?.payload?.stepCount ?? 0,
    resultCount: output.results?.length ?? 0,
    pendingApprovalCount,
    resumableStepCount,
    canResume: resumableStepCount > 0,
    createdAt: trace.createdAt,
    updatedAt: latestTimestamp([lastResume?.createdAt, completed?.createdAt, trace.updatedAt, trace.createdAt]),
    route: `/v1/workflows/runs/${trace.id}`,
    resumeRoute: `/v1/workflows/runs/${trace.id}/resume`,
  };
}

function countResumableWorkflowSteps(results, approvals) {
  return results.filter((result) => {
    if (result.kind !== "tool" || result.status !== "requires_approval") return false;
    return approvals.some((ticket) => (
      ticket.status === "approved"
      && ticket.toolName === result.toolName
      && JSON.stringify(ticket.input) === JSON.stringify(result.input ?? {})
    ));
  }).length;
}

function buildWorkflowSteps(workflow, results, events) {
  return (workflow?.steps ?? []).map((step) => {
    const result = results.find((item) => item.stepId === step.id) ?? null;
    const started = events.find((event) => event.type === "workflow.step.started" && event.payload?.id === step.id);
    const completed = events.find((event) => event.type === "workflow.step.completed" && event.payload?.stepId === step.id);
    return {
      id: step.id,
      kind: step.kind,
      status: result?.status ?? null,
      startedAt: started?.createdAt ?? null,
      completedAt: completed?.createdAt ?? null,
      definition: step,
      result,
    };
  });
}

function approvalSummary(ticket) {
  return {
    approvalId: ticket.id,
    status: ticket.status,
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

function workflowTimelineEvent(event) {
  return {
    id: event.id,
    type: event.type,
    createdAt: event.createdAt,
    label: labelForWorkflowEvent(event),
    status: event.payload?.status ?? event.payload?.decision?.decision ?? null,
  };
}

function labelForWorkflowEvent(event) {
  if (event.type === "trace.started") return "Trace started";
  if (event.type === "workflow.started") return `Workflow started: ${event.payload?.name ?? "workflow"}`;
  if (event.type === "workflow.step.started") return `Step started: ${event.payload?.id ?? "step"}`;
  if (event.type === "workflow.context") return `Context retrieved: ${event.payload?.stepId ?? "step"}`;
  if (event.type === "workflow.step.completed") return `Step completed: ${event.payload?.stepId ?? "step"}`;
  if (event.type === "tool.policy") return `Policy checked: ${event.payload?.toolName ?? "tool"}`;
  if (event.type === "tool.result") return `Tool result: ${event.payload?.toolName ?? "tool"}`;
  if (event.type === "workflow.completed") return "Workflow completed";
  return event.type;
}

function startedGoal(events) {
  return events.find((event) => event.type === "trace.started")?.payload?.goal ?? null;
}

function latestEvent(events, type) {
  return [...events].reverse().find((event) => event.type === type) ?? null;
}

function latestTimestamp(values) {
  return values
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0] ?? null;
}
