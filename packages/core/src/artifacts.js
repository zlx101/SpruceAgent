import { listApprovalTickets } from "./approvals.js";
import { getEvaluation, listEvaluations } from "./evaluations.js";
import { listTraces, readTraceEvents } from "./trace.js";

export const ARTIFACT_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.artifacts",
  sourceKind: "workspace_traces",
  outputKind: "execution_journal",
  artifactKinds: [
    "run_summary",
    "tool_result",
    "approval_decision",
    "continuation_result",
    "agent_launch",
    "evaluation_report",
    "memory_write",
  ],
  safetyBoundary: [
    "Artifacts v0 is read-only.",
    "It reconstructs execution artifacts from traces, approvals, evaluations, and memory references.",
    "It does not execute tools, approve tickets, resume runs, mutate files, or copy workspace outputs.",
    "Artifact payloads are references or existing trace/evaluation data; large or sensitive outputs are not redacted in v0 detail views.",
  ],
});

export function getArtifactContract() {
  return ARTIFACT_CONTRACT;
}

export function listArtifacts(store, options = {}) {
  const artifacts = buildArtifacts(store)
    .filter((artifact) => matchesArtifactFilter(artifact, options))
    .sort((a, b) => String(b.updatedAt ?? b.createdAt).localeCompare(String(a.updatedAt ?? a.createdAt)));
  const limit = options.limit === undefined ? null : Math.max(Number(options.limit), 1);
  const items = limit ? artifacts.slice(0, limit) : artifacts;

  return {
    version: ARTIFACT_CONTRACT.version,
    createdAt: new Date().toISOString(),
    status: items.length ? "available" : "empty",
    summary: summarizeArtifacts(items),
    items: items.map((artifact) => artifactListItem(artifact)),
    limits: [
      "Artifacts v0 is a read-only projection.",
      "Artifact IDs are deterministic for the current trace, approval, and evaluation records.",
      "Use artifact detail routes only when raw payload inspection is necessary.",
    ],
  };
}

export function listArtifactsForTrace(store, traceId) {
  return listArtifacts(store, { traceId }).items;
}

export function getArtifact(store, artifactId) {
  if (!artifactId) throw new Error("artifactId is required");
  const artifact = buildArtifacts(store).find((item) => item.id === artifactId);
  if (!artifact) throw new Error(`artifact not found: ${artifactId}`);
  return {
    version: ARTIFACT_CONTRACT.version,
    ...artifact,
    limits: [
      "Artifact detail v0 is read-only.",
      "The payload is reconstructed from existing local trace, approval, evaluation, or memory state.",
      "Inspect payloads carefully before sharing because v0 does not redact large outputs or file contents.",
    ],
  };
}

function buildArtifacts(store) {
  const approvals = listApprovalTickets(store);
  const evaluations = listEvaluations(store);
  const traces = listTraces(store);
  const artifacts = [];

  for (const trace of traces) {
    const events = safeReadTraceEvents(store, trace.id);
    const traceApprovals = approvals.filter((ticket) => ticket.traceId === trace.id);
    const traceEvaluations = evaluations.filter((evaluation) => evaluation.traceId === trace.id);
    artifacts.push(...traceArtifacts(store, trace, events, traceApprovals, traceEvaluations));
  }

  const orphanApprovals = approvals.filter((ticket) => !ticket.traceId);
  for (const ticket of orphanApprovals) {
    artifacts.push(approvalArtifact(ticket, null));
  }

  const evaluationTraceIds = new Set(traces.map((trace) => trace.id));
  for (const evaluation of evaluations.filter((item) => !evaluationTraceIds.has(item.traceId))) {
    artifacts.push(evaluationArtifact(store, evaluation, null));
  }

  return artifacts;
}

function traceArtifacts(store, trace, events, approvals, evaluations) {
  const sourceKind = trace.metadata?.kind ?? "trace";
  const completed = latestEvent(events, sourceKind === "workflow.run" ? "workflow.completed" : "agent.completed");
  const artifacts = [];

  if (completed) {
    artifacts.push(runSummaryArtifact(trace, completed, sourceKind));
    artifacts.push(...memoryArtifacts(trace, completed, sourceKind));
  }

  for (const event of events.filter((item) => item.type === "tool.result")) {
    artifacts.push(toolResultArtifact(trace, event, sourceKind));
  }

  for (const event of events.filter((item) => item.type === "agent.resume.completed" || item.type === "workflow.resume.completed")) {
    artifacts.push(continuationArtifact(trace, event, sourceKind));
  }

  for (const event of events.filter((item) => item.type === "agent.launch.completed" || item.type === "agent.launch.blocked" || item.type === "agent.launch.planned" || item.type === "agent.launch.requires_approval")) {
    artifacts.push(agentLaunchArtifact(trace, event, sourceKind));
  }

  for (const ticket of approvals) {
    artifacts.push(approvalArtifact(ticket, trace));
  }

  for (const evaluation of evaluations) {
    artifacts.push(evaluationArtifact(store, evaluation, trace));
  }

  return artifacts;
}

function runSummaryArtifact(trace, event, sourceKind) {
  const payload = event.payload ?? {};
  const workflow = payload.workflow ?? {};
  return {
    id: `artifact_${trace.id}_run_summary`,
    kind: "run_summary",
    sourceKind,
    traceId: trace.id,
    title: sourceKind === "workflow.run"
      ? `Workflow run: ${workflow.name ?? trace.goal}`
      : `Agent run: ${payload.goal ?? trace.goal}`,
    status: payload.status ?? trace.status,
    createdAt: event.createdAt,
    updatedAt: event.createdAt,
    route: detailRoute(sourceKind, trace.id),
    refs: {
      traceId: trace.id,
      eventId: event.id,
      workflowId: workflow.id ?? trace.metadata?.workflowId ?? null,
    },
    summary: {
      goal: payload.goal ?? trace.goal,
      resultCount: payload.results?.length ?? 0,
      stepCount: workflow.steps?.length ?? payload.plan?.stepCount ?? payload.candidatePlan?.promotedSteps?.length ?? 0,
      status: payload.status ?? trace.status,
    },
    payload,
  };
}

function toolResultArtifact(trace, event, sourceKind) {
  const payload = event.payload ?? {};
  return {
    id: `artifact_${trace.id}_tool_${event.id}`,
    kind: "tool_result",
    sourceKind,
    traceId: trace.id,
    title: `Tool result: ${payload.toolName ?? "tool"}`,
    status: payload.status ?? "unknown",
    createdAt: event.createdAt,
    updatedAt: payload.finishedAt ?? event.createdAt,
    route: detailRoute(sourceKind, trace.id),
    refs: {
      traceId: trace.id,
      eventId: event.id,
      toolName: payload.toolName ?? null,
      outputPath: payload.output?.path ?? null,
    },
    summary: {
      toolName: payload.toolName ?? null,
      riskLevel: payload.decision?.riskLevel ?? null,
      decision: payload.decision?.decision ?? null,
      outputPath: payload.output?.path ?? null,
      bytes: payload.output?.bytes ?? null,
      error: payload.error?.message ?? null,
    },
    payload,
  };
}

function approvalArtifact(ticket, trace) {
  const sourceKind = trace?.metadata?.kind ?? null;
  return {
    id: `artifact_approval_${ticket.id}`,
    kind: "approval_decision",
    sourceKind,
    traceId: ticket.traceId ?? null,
    title: `Approval ${ticket.status}: ${ticket.toolName}`,
    status: ticket.status,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    route: ticket.traceId ? detailRoute(sourceKind, ticket.traceId) : null,
    refs: {
      traceId: ticket.traceId ?? null,
      approvalId: ticket.id,
      toolName: ticket.toolName,
      candidateStepId: ticket.metadata?.candidateStepId ?? null,
    },
    summary: {
      toolName: ticket.toolName,
      riskLevel: ticket.decision?.riskLevel ?? null,
      decision: ticket.decision?.decision ?? null,
      requester: ticket.requester,
      resolvedBy: ticket.resolvedBy ?? null,
      reason: ticket.resolutionReason ?? ticket.reason,
    },
    payload: ticket,
  };
}

function continuationArtifact(trace, event, sourceKind) {
  const payload = event.payload ?? {};
  return {
    id: `artifact_${trace.id}_continuation_${event.id}`,
    kind: "continuation_result",
    sourceKind,
    traceId: trace.id,
    title: `${sourceKind === "workflow.run" ? "Workflow" : "Agent"} continuation: ${payload.status ?? "unknown"}`,
    status: payload.status ?? "unknown",
    createdAt: event.createdAt,
    updatedAt: event.createdAt,
    route: detailRoute(sourceKind, trace.id),
    refs: {
      traceId: trace.id,
      eventId: event.id,
    },
    summary: {
      resultCount: payload.resultCount ?? payload.results?.length ?? 0,
      status: payload.status ?? null,
      results: summarizeResultStatuses(payload.results ?? []),
    },
    payload,
  };
}

function agentLaunchArtifact(trace, event, sourceKind) {
  const payload = event.payload ?? {};
  return {
    id: `artifact_${trace.id}_agent_launch_${event.id}`,
    kind: "agent_launch",
    sourceKind,
    traceId: trace.id,
    title: `Agent launch: ${payload.status ?? "unknown"}`,
    status: payload.status ?? "unknown",
    createdAt: event.createdAt,
    updatedAt: event.createdAt,
    route: payload.id ? `/v1/agent-launches/${payload.id}` : detailRoute(sourceKind, trace.id),
    refs: {
      traceId: trace.id,
      eventId: event.id,
      launchId: payload.id ?? null,
      workspaceId: payload.workspaceId ?? null,
      terminalLogPath: payload.terminalLog?.path ?? null,
    },
    summary: {
      executionMode: payload.executionMode ?? null,
      adapterId: payload.adapter?.id ?? null,
      exitCode: payload.exitCode ?? null,
      changed: payload.git?.changed ?? false,
      terminalLogPath: payload.terminalLog?.path ?? null,
    },
    payload,
  };
}

function evaluationArtifact(store, evaluation, trace) {
  const detail = safeGetEvaluation(store, evaluation.id);
  const sourceKind = trace?.metadata?.kind ?? evaluation.targetKind ?? null;
  return {
    id: `artifact_evaluation_${evaluation.id}`,
    kind: "evaluation_report",
    sourceKind,
    traceId: evaluation.traceId ?? trace?.id ?? null,
    title: `Evaluation ${evaluation.status}: ${evaluation.id}`,
    status: evaluation.status,
    createdAt: evaluation.createdAt,
    updatedAt: evaluation.createdAt,
    route: evaluation.traceId ? detailRoute(sourceKind, evaluation.traceId) : null,
    refs: {
      traceId: evaluation.traceId ?? null,
      evaluationId: evaluation.id,
      workflowId: evaluation.workflowId ?? null,
    },
    summary: {
      reliabilityScore: evaluation.reliabilityScore ?? detail?.summary?.reliabilityScore ?? null,
      findingCount: detail?.findings?.length ?? null,
      targetKind: evaluation.targetKind ?? detail?.targetKind ?? null,
    },
    payload: detail ?? evaluation,
  };
}

function memoryArtifacts(trace, completed, sourceKind) {
  const payload = completed.payload ?? {};
  const artifacts = [];
  if (payload.memory) {
    artifacts.push(memoryArtifact(trace, completed, sourceKind, payload.memory, "run_summary_memory"));
  }
  for (const result of payload.results ?? []) {
    if (result.kind === "memory" && result.memory) {
      artifacts.push(memoryArtifact(trace, completed, sourceKind, result.memory, result.stepId ?? result.memory.id));
    }
  }
  return artifacts;
}

function memoryArtifact(trace, event, sourceKind, memory, sourceId) {
  return {
    id: `artifact_${trace.id}_memory_${sourceId}`,
    kind: "memory_write",
    sourceKind,
    traceId: trace.id,
    title: `Memory write: ${memory.kind ?? "note"}`,
    status: "recorded",
    createdAt: memory.createdAt ?? event.createdAt,
    updatedAt: memory.createdAt ?? event.createdAt,
    route: detailRoute(sourceKind, trace.id),
    refs: {
      traceId: trace.id,
      eventId: event.id,
      memoryId: memory.id ?? null,
    },
    summary: {
      scope: memory.scope ?? null,
      kind: memory.kind ?? null,
      tags: memory.tags ?? [],
      contentPreview: preview(memory.content),
    },
    payload: memory,
  };
}

function artifactListItem(artifact) {
  return {
    id: artifact.id,
    kind: artifact.kind,
    sourceKind: artifact.sourceKind,
    traceId: artifact.traceId,
    title: artifact.title,
    status: artifact.status,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    route: artifact.route,
    refs: artifact.refs,
    summary: artifact.summary,
    detailRoute: `/v1/artifacts/${artifact.id}`,
  };
}

function matchesArtifactFilter(artifact, options) {
  if (options.traceId && artifact.traceId !== options.traceId) return false;
  if (options.kind && artifact.kind !== options.kind) return false;
  if (options.sourceKind && artifact.sourceKind !== options.sourceKind) return false;
  if (options.status && artifact.status !== options.status) return false;
  return true;
}

function summarizeArtifacts(items) {
  return {
    total: items.length,
    traceCount: new Set(items.map((item) => item.traceId).filter(Boolean)).size,
    byKind: countBy(items, (item) => item.kind),
    byStatus: countBy(items, (item) => item.status ?? "unknown"),
  };
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function latestEvent(events, type) {
  return [...events].reverse().find((event) => event.type === type) ?? null;
}

function safeReadTraceEvents(store, traceId) {
  try {
    return readTraceEvents(store, traceId);
  } catch {
    return [];
  }
}

function safeGetEvaluation(store, evaluationId) {
  try {
    return getEvaluation(store, evaluationId);
  } catch {
    return null;
  }
}

function summarizeResultStatuses(results) {
  return countBy(results, (result) => result.status ?? "unknown");
}

function detailRoute(sourceKind, traceId) {
  if (!traceId) return null;
  return sourceKind === "workflow.run"
    ? `/v1/workflows/runs/${traceId}`
    : `/v1/runs/${traceId}`;
}

function preview(value) {
  const text = String(value ?? "");
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}
