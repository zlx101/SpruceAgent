import { listApprovalTickets } from "./approvals.js";
import { listTraces, readTraceEvents } from "./trace.js";

export const APPROVAL_QUEUE_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.approval-queue",
  sourceKind: "workspace_approvals_and_traces",
  outputKind: "decision_queue",
  safetyBoundary: [
    "Approval Queue v0 is read-only.",
    "It does not approve, reject, resume, or execute tools.",
    "Queue actions are route hints; authority still lives in approval and continuation endpoints.",
    "Approved tickets are exact-match capabilities and may still fail if the source run is no longer resumable.",
  ],
});

export function getApprovalQueueContract() {
  return APPROVAL_QUEUE_CONTRACT;
}

export function getApprovalQueue(store, options = {}) {
  const traces = listTraces(store);
  const traceById = new Map(traces.map((trace) => [trace.id, trace]));
  const items = listApprovalTickets(store)
    .map((ticket) => queueItem(store, ticket, traceById.get(ticket.traceId)))
    .filter((item) => matchesQueueFilter(item, options))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const limit = options.limit === undefined ? null : Math.max(Number(options.limit), 1);
  const limitedItems = limit ? items.slice(0, limit) : items;

  return {
    version: APPROVAL_QUEUE_CONTRACT.version,
    createdAt: new Date().toISOString(),
    status: deriveQueueStatus(limitedItems),
    summary: summarizeQueue(limitedItems),
    items: limitedItems,
    limits: [
      "Approval Queue v0 is a read-only projection.",
      "It includes pending approvals, approved resumable tickets, and approved tickets that cannot be resumed automatically.",
      "Approval and resume routes must still enforce their own authority checks.",
    ],
  };
}

function queueItem(store, ticket, trace) {
  const snapshot = trace ? snapshotForTrace(store, trace) : null;
  const resume = resolveResumeHint(ticket, trace, snapshot);
  const status = resolveQueueStatus(ticket, resume);
  const kind = ticket.metadata?.kind ?? "tool";

  return {
    id: `queue_${ticket.id}`,
    approvalId: ticket.id,
    status,
    kind,
    traceId: ticket.traceId ?? null,
    traceKind: trace?.metadata?.kind ?? null,
    stepId: ticket.metadata?.candidateStepId ?? resume.stepId ?? null,
    toolName: ticket.toolName,
    riskLevel: ticket.decision?.riskLevel ?? null,
    decision: ticket.decision?.decision ?? null,
    reason: ticket.reason,
    requester: ticket.requester,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    expiresAt: ticket.expiresAt,
    resolvedAt: ticket.resolvedAt,
    resolvedBy: ticket.resolvedBy,
    run: snapshot
      ? {
          traceId: snapshot.traceId,
          goal: snapshot.goal,
          status: snapshot.status,
          route: snapshot.route,
        }
      : null,
    actions: actionsForQueueItem(ticket, status, resume),
  };
}

function resolveQueueStatus(ticket, resume) {
  if (ticket.status === "pending") return "pending_decision";
  if (ticket.status === "approved" && resume.canResume) return "ready_to_resume";
  if (ticket.status === "approved") return "approved_unresumable";
  if (ticket.status === "consumed") return "completed";
  return ticket.status;
}

function actionsForQueueItem(ticket, status, resume) {
  if (status === "pending_decision") {
    return [
      {
        id: "approve",
        method: "POST",
        path: `/v1/approvals/${ticket.id}/approve`,
        label: "Approve",
      },
      {
        id: "reject",
        method: "POST",
        path: `/v1/approvals/${ticket.id}/reject`,
        label: "Reject",
      },
    ];
  }

  if (status === "ready_to_resume") {
    return [
      {
        id: "resume",
        method: "POST",
        path: resume.path,
        body: {
          stepId: resume.stepId,
          approvalId: ticket.id,
        },
        label: "Resume",
      },
    ];
  }

  return [];
}

function resolveResumeHint(ticket, trace, snapshot) {
  if (!trace || ticket.status !== "approved") {
    return { canResume: false, path: null, stepId: null };
  }

  if (trace.metadata?.kind === "agent.run" && ticket.metadata?.kind === "candidate_step") {
    const candidateStepId = ticket.metadata?.candidateStepId ?? null;
    const candidateStep = snapshot?.run?.candidatePlan?.promotedSteps?.find((step) => step.id === candidateStepId);
    return {
      canResume: Boolean(candidateStep && snapshot?.status !== "completed"),
      path: `/v1/runs/${ticket.traceId}/resume`,
      stepId: candidateStepId,
    };
  }

  if (trace.metadata?.kind === "workflow.run") {
    const result = (snapshot?.run?.results ?? []).find((item) => (
      item.kind === "tool"
      && item.status === "requires_approval"
      && item.toolName === ticket.toolName
      && JSON.stringify(item.input ?? {}) === JSON.stringify(ticket.input ?? {})
    ));
    return {
      canResume: Boolean(result && snapshot?.status !== "completed"),
      path: `/v1/workflows/runs/${ticket.traceId}/resume`,
      stepId: result?.stepId ?? null,
    };
  }

  return { canResume: false, path: null, stepId: null };
}

function snapshotForTrace(store, trace) {
  try {
    const events = readTraceEvents(store, trace.id);
    const completedType = trace.metadata?.kind === "workflow.run" ? "workflow.completed" : "agent.completed";
    const resumeType = trace.metadata?.kind === "workflow.run" ? "workflow.resume.completed" : "agent.resume.completed";
    const completed = latestEvent(events, completedType);
    const lastResume = latestEvent(events, resumeType);
    const run = lastResume?.payload?.status === "completed"
      ? { ...completed?.payload, status: "completed" }
      : completed?.payload;
    return {
      traceId: trace.id,
      goal: run?.goal ?? trace.goal,
      status: lastResume?.payload?.status ?? run?.status ?? trace.status,
      route: trace.metadata?.kind === "workflow.run"
        ? `/v1/workflows/runs/${trace.id}`
        : `/v1/runs/${trace.id}`,
      run,
    };
  } catch {
    return null;
  }
}

function latestEvent(events, type) {
  return [...events].reverse().find((event) => event.type === type) ?? null;
}

function matchesQueueFilter(item, options) {
  if (options.traceKind && item.traceKind !== options.traceKind) return false;
  if (options.status && item.status !== options.status) return false;
  return true;
}

function deriveQueueStatus(items) {
  if (items.some((item) => item.status === "pending_decision")) return "action_required";
  if (items.some((item) => item.status === "ready_to_resume")) return "ready_to_resume";
  return "clear";
}

function summarizeQueue(items) {
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
