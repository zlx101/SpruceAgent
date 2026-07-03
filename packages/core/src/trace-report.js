import { listTraces } from "./trace.js";
import { getRunDetail } from "./run-detail.js";
import { getWorkflowRunDetail } from "./workflow-state.js";

export const TRACE_REPORT_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.trace-report",
  sourceKind: "agent.run.trace|workflow.run.trace",
  outputKind: "exportable_audit_report",
  formats: ["json", "markdown"],
  safetyBoundary: [
    "Trace Report v0 is read-only.",
    "It composes existing run detail, workflow detail, source map, approval, evaluation, and artifact projections.",
    "It does not approve, reject, resume, execute tools, mutate files, or copy workspace outputs.",
    "Raw trace events are excluded by default and only included when explicitly requested.",
  ],
});

export function getTraceReportContract() {
  return TRACE_REPORT_CONTRACT;
}

export function getTraceReport(store, traceId, options = {}) {
  if (!traceId) throw new Error("traceId is required");
  const trace = listTraces(store).find((item) => item.id === traceId);
  if (!trace) throw new Error(`trace not found: ${traceId}`);

  const sourceKind = trace.metadata?.kind === "workflow.run" ? "workflow.run" : "agent.run";
  const detail = sourceKind === "workflow.run"
    ? getWorkflowRunDetail(store, traceId)
    : getRunDetail(store, traceId);
  const report = buildTraceReport(trace, sourceKind, detail, {
    includeRaw: Boolean(options.includeRaw),
  });
  const format = String(options.format ?? "json").toLowerCase();
  if (format === "markdown" || format === "md") {
    return {
      ...report,
      format: "markdown",
      markdown: renderTraceReportMarkdown(report),
    };
  }
  if (format !== "json") {
    throw new Error("trace report format must be json or markdown");
  }
  return {
    ...report,
    format: "json",
  };
}

export function renderTraceReportMarkdown(report) {
  const lines = [
    `# ${report.title}`,
    "",
    "## Summary",
    "",
    table([
      ["Trace", report.traceId],
      ["Kind", report.sourceKind],
      ["Status", report.status],
      ["Goal", report.summary.goal],
      ["Generated", report.createdAt],
      ["Events", report.summary.eventCount],
      ["Approvals", report.summary.approvalCount],
      ["Artifacts", report.summary.artifactCount],
      ["Sources", report.summary.sourceCount],
    ], ["Field", "Value"]),
    "",
    "## Evidence",
    "",
    report.evidence.sources.length
      ? table(report.evidence.sources.map((source) => [
        source.path ?? source.id ?? "-",
        source.type ?? "-",
        source.freshness ?? "-",
        source.score ?? "-",
      ]), ["Source", "Type", "Freshness", "Score"])
      : "No source evidence.",
    "",
    "## Decisions",
    "",
    report.decisions.approvals.length
      ? table(report.decisions.approvals.map((approval) => [
        approval.approvalId,
        approval.status,
        approval.toolName ?? "-",
        approval.stepId ?? "-",
      ]), ["Approval", "Status", "Tool", "Step"])
      : "No approvals.",
    "",
    "## Tool Results",
    "",
    report.operations.toolResults.length
      ? table(report.operations.toolResults.map((result) => [
        result.toolName ?? "-",
        result.status ?? "-",
        result.output?.path ?? result.error?.message ?? "-",
      ]), ["Tool", "Status", "Output"])
      : "No tool results.",
    "",
    "## Artifacts",
    "",
    report.artifacts.length
      ? table(report.artifacts.map((artifact) => [
        artifact.id,
        artifact.kind,
        artifact.status ?? "-",
        artifact.title ?? "-",
      ]), ["Artifact", "Kind", "Status", "Title"])
      : "No artifacts.",
    "",
    "## Timeline",
    "",
    report.operations.timeline.length
      ? report.operations.timeline.map((event) => `- ${event.createdAt} - ${event.label} (${event.status ?? event.type})`).join("\n")
      : "No timeline events.",
    "",
    "## Safety Boundary",
    "",
    report.limits.map((item) => `- ${item}`).join("\n"),
    "",
  ];

  if (report.rawEvents) {
    lines.push("## Raw Events", "", "```json", JSON.stringify(report.rawEvents, null, 2), "```", "");
  }

  return lines.join("\n");
}

function buildTraceReport(trace, sourceKind, detail, options) {
  const isWorkflow = sourceKind === "workflow.run";
  const workflow = isWorkflow ? detail.workflow : null;
  const run = isWorkflow ? null : detail.run;
  const title = isWorkflow
    ? `Workflow Trace Report: ${detail.summary.workflowName ?? detail.summary.goal ?? trace.id}`
    : `Agent Trace Report: ${detail.summary.goal ?? trace.goal}`;
  const operationSteps = isWorkflow ? detail.steps ?? [] : detail.candidateSteps ?? [];
  const sourceMap = detail.sourceMap ?? { summary: {}, sources: [] };

  return {
    version: TRACE_REPORT_CONTRACT.version,
    interface: TRACE_REPORT_CONTRACT.interface,
    createdAt: new Date().toISOString(),
    traceId: trace.id,
    sourceKind,
    status: detail.status,
    title,
    summary: {
      goal: detail.summary.goal ?? trace.goal,
      traceCreatedAt: trace.createdAt,
      actor: trace.actor,
      channel: trace.channel,
      trustMode: trace.trustMode,
      workflowId: detail.summary.workflowId ?? workflow?.id ?? null,
      workflowName: detail.summary.workflowName ?? workflow?.name ?? null,
      runStatus: detail.summary.runStatus ?? detail.status,
      continuationStatus: detail.summary.continuationStatus ?? null,
      eventCount: detail.summary.eventCount,
      sourceCount: sourceMap.summary?.total ?? sourceMap.sources?.length ?? 0,
      approvalCount: detail.summary.approvalCount ?? detail.approvals?.length ?? 0,
      pendingApprovalCount: detail.summary.pendingApprovalCount ?? 0,
      decisionQueueCount: detail.summary.decisionQueueCount ?? 0,
      operationStepCount: operationSteps.length,
      toolResultCount: detail.summary.toolResultCount ?? detail.toolResults?.length ?? 0,
      artifactCount: detail.summary.artifactCount ?? detail.artifacts?.length ?? 0,
      evaluationCount: detail.summary.evaluationCount ?? detail.evaluations?.length ?? 0,
    },
    subject: {
      run: run ? {
        id: run.id,
        status: run.status,
        goal: run.goal,
        llm: run.llm,
        limits: run.limits,
      } : null,
      workflow: workflow ? {
        id: workflow.id,
        name: workflow.name,
        revision: workflow.revision,
        status: workflow.status,
        stepCount: workflow.steps?.length ?? 0,
      } : null,
    },
    evidence: {
      sourceMapSummary: sourceMap.summary ?? {},
      sources: sourceMap.sources ?? [],
    },
    decisions: {
      decisionQueue: detail.decisionQueue ? {
        status: detail.decisionQueue.status,
        summary: detail.decisionQueue.summary,
        items: detail.decisionQueue.items,
      } : null,
      approvals: detail.approvals ?? [],
    },
    operations: {
      steps: operationSteps,
      toolResults: detail.toolResults ?? [],
      resumeEvents: detail.resumeEvents ?? [],
      evaluations: detail.evaluations ?? [],
      timeline: detail.timeline ?? [],
    },
    artifacts: detail.artifacts ?? [],
    limits: [
      ...TRACE_REPORT_CONTRACT.safetyBoundary,
      ...(detail.limits ?? []),
    ],
    rawEvents: options.includeRaw ? detail.events ?? [] : undefined,
  };
}

function table(rows, header) {
  const safeRows = rows.map((row) => row.map((cell) => markdownCell(cell)));
  const allRows = header ? [header.map((cell) => markdownCell(cell)), ...safeRows] : safeRows;
  if (!allRows.length) return "";
  const widths = allRows[0].map((_, index) => Math.max(...allRows.map((row) => row[index]?.length ?? 0)));
  const renderRow = (row) => `| ${row.map((cell, index) => cell.padEnd(widths[index], " ")).join(" | ")} |`;
  const headerRow = renderRow(allRows[0]);
  const divider = `| ${widths.map((width) => "-".repeat(Math.max(width, 3))).join(" | ")} |`;
  const bodyRows = allRows.slice(1).map(renderRow);
  return [headerRow, divider, ...bodyRows].join("\n");
}

function markdownCell(value) {
  return String(value ?? "-")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|");
}
