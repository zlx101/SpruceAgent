import { listApprovalTickets } from "./approvals.js";
import { listTraces, readTraceEvents } from "./trace.js";

export const RUN_INBOX_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.run-inbox",
  sourceKind: "workspace_state",
  outputKind: "desktop_workbench_state",
  safetyBoundary: [
    "Run Inbox v0 is read-only.",
    "It aggregates traces and approval tickets without executing tools.",
    "Resumable runs require approved candidate-step approval tickets.",
    "The inbox is a UI/workbench projection, not an authority grant.",
  ],
});

export function getRunInboxContract() {
  return RUN_INBOX_CONTRACT;
}

export function getRunInbox(store, options = {}) {
  const limit = Number(options.limit ?? 20);
  const traces = listTraces(store)
    .filter((trace) => trace.metadata?.kind === "agent.run")
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, Math.max(limit, 1));
  const approvals = listApprovalTickets(store);
  const pendingApprovals = approvals
    .filter((ticket) => ticket.status === "pending")
    .map((ticket) => approvalItem(ticket, snapshotForTrace(store, ticket.traceId)))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const resumableRuns = buildResumableRuns(store, approvals);
  const recentRuns = traces.map((trace) => recentRunItem(store, trace, approvals));

  return {
    version: RUN_INBOX_CONTRACT.version,
    createdAt: new Date().toISOString(),
    status: deriveInboxStatus({ pendingApprovals, resumableRuns }),
    summary: {
      pendingApprovalCount: pendingApprovals.length,
      resumableRunCount: resumableRuns.length,
      recentRunCount: recentRuns.length,
    },
    pendingApprovals,
    resumableRuns,
    recentRuns,
    limits: [
      "Run Inbox v0 is a read-only projection.",
      "It does not re-plan, approve, reject, resume, or execute runs.",
      "It only includes agent.run traces in recentRuns.",
    ],
  };
}

function buildResumableRuns(store, approvals) {
  const approvedCandidateTickets = approvals.filter((ticket) => (
    ticket.status === "approved"
    && ticket.traceId
    && ticket.metadata?.kind === "candidate_step"
    && ticket.metadata?.candidateStepId
  ));
  const grouped = new Map();
  for (const ticket of approvedCandidateTickets) {
    if (!grouped.has(ticket.traceId)) grouped.set(ticket.traceId, []);
    grouped.get(ticket.traceId).push(ticket);
  }

  return [...grouped.entries()].map(([traceId, tickets]) => {
    const snapshot = snapshotForTrace(store, traceId);
    return {
      traceId,
      goal: snapshot?.run?.goal ?? snapshot?.trace?.goal ?? null,
      sourceStatus: snapshot?.run?.status ?? null,
      approvedStepCount: tickets.length,
      approvedSteps: tickets.map((ticket) => ({
        stepId: ticket.metadata.candidateStepId,
        approvalId: ticket.id,
        toolName: ticket.toolName,
        approvedAt: ticket.resolvedAt ?? ticket.updatedAt,
      })),
      resumeRoute: `/v1/runs/${traceId}/resume`,
      updatedAt: latestTimestamp([
        ...tickets.map((ticket) => ticket.updatedAt),
        snapshot?.lastResume?.createdAt,
        snapshot?.completedAt,
      ]),
    };
  }).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function recentRunItem(store, trace, approvals) {
  const snapshot = snapshotForTrace(store, trace.id);
  const traceApprovals = approvals.filter((ticket) => ticket.traceId === trace.id);
  const pendingApprovalCount = traceApprovals.filter((ticket) => ticket.status === "pending").length;
  const approvedCandidateApprovalCount = traceApprovals.filter((ticket) => (
    ticket.status === "approved"
    && ticket.metadata?.kind === "candidate_step"
  )).length;

  return {
    traceId: trace.id,
    goal: snapshot?.run?.goal ?? trace.goal,
    status: snapshot?.lastResume?.payload?.status ?? snapshot?.run?.status ?? trace.status,
    runStatus: snapshot?.run?.status ?? null,
    continuationStatus: snapshot?.lastResume?.payload?.status ?? null,
    createdAt: trace.createdAt,
    updatedAt: latestTimestamp([snapshot?.lastResume?.createdAt, snapshot?.completedAt, trace.updatedAt]),
    pendingApprovalCount,
    approvedCandidateApprovalCount,
    canResume: approvedCandidateApprovalCount > 0,
    route: `/v1/runs/${trace.id}`,
    resumeRoute: `/v1/runs/${trace.id}/resume`,
  };
}

function approvalItem(ticket, snapshot) {
  return {
    approvalId: ticket.id,
    status: ticket.status,
    traceId: ticket.traceId ?? null,
    stepId: ticket.metadata?.candidateStepId ?? null,
    kind: ticket.metadata?.kind ?? "tool",
    toolName: ticket.toolName,
    riskLevel: ticket.decision?.riskLevel ?? null,
    reason: ticket.reason,
    requester: ticket.requester,
    createdAt: ticket.createdAt,
    expiresAt: ticket.expiresAt,
    run: snapshot
      ? {
          traceId: snapshot.traceId,
          goal: snapshot.run?.goal ?? snapshot.trace?.goal ?? null,
          status: snapshot.run?.status ?? null,
        }
      : null,
  };
}

function snapshotForTrace(store, traceId) {
  if (!traceId) return null;
  try {
    const events = readTraceEvents(store, traceId);
    const completed = [...events].reverse().find((event) => event.type === "agent.completed");
    const lastResume = [...events].reverse().find((event) => event.type === "agent.resume.completed");
    const started = events.find((event) => event.type === "trace.started");
    return {
      traceId,
      trace: started?.payload ?? null,
      run: completed?.payload ?? null,
      completedAt: completed?.createdAt ?? null,
      lastResume: lastResume ?? null,
    };
  } catch {
    return null;
  }
}

function deriveInboxStatus({ pendingApprovals, resumableRuns }) {
  if (pendingApprovals.length > 0) return "action_required";
  if (resumableRuns.length > 0) return "ready_to_resume";
  return "clear";
}

function latestTimestamp(values) {
  return values
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0] ?? null;
}
