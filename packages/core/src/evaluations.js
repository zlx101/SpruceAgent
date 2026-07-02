import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { readTraceEvents } from "./trace.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export function evaluateTrace(store, traceId) {
  const events = readTraceEvents(store, traceId);
  if (!events.length) {
    throw new Error(`trace not found or empty: ${traceId}`);
  }

  const workflowCompleted = lastEvent(events, "workflow.completed");
  const stepResults = events
    .filter((event) => event.type === "workflow.step.completed")
    .map((event) => event.payload);
  const toolResults = events
    .filter((event) => event.type === "tool.result")
    .map((event) => event.payload);
  const policyResults = events
    .filter((event) => event.type === "tool.policy")
    .map((event) => event.payload.decision)
    .filter(Boolean);
  const approvalEvents = events
    .filter((event) => event.type === "approval.created")
    .map((event) => event.payload);

  const evaluation = {
    id: createId("evaluation"),
    traceId,
    targetKind: workflowCompleted ? "workflow.run" : "trace",
    workflowId: workflowCompleted?.payload?.workflow?.id ?? workflowCompleted?.payload?.workflowId ?? null,
    status: deriveEvaluationStatus({ workflowCompleted, stepResults, toolResults }),
    createdAt: nowIso(),
    summary: {
      eventCount: events.length,
      workflowStatus: workflowCompleted?.payload?.status ?? null,
      stepCount: stepResults.length,
      stepStatusCounts: countBy(stepResults, (result) => result.status ?? "unknown"),
      toolCallCount: toolResults.length,
      toolStatusCounts: countBy(toolResults, (result) => result.status ?? "unknown"),
      approvalCount: approvalEvents.length,
      policyDecisionCounts: countBy(policyResults, (decision) => decision.decision ?? "unknown"),
      riskCounts: countBy(policyResults, (decision) => decision.riskLevel ?? "unknown"),
      reliabilityScore: scoreRun({ workflowCompleted, stepResults, toolResults, policyResults, approvalEvents }),
    },
    findings: buildFindings({ workflowCompleted, stepResults, toolResults, policyResults, approvalEvents }),
    recommendedNextActions: buildRecommendedNextActions({
      workflowCompleted,
      stepResults,
      toolResults,
      policyResults,
      approvalEvents,
    }),
    limits: v0Limits(),
  };

  writeJson(evaluationPath(store, evaluation.id), evaluation);
  appendJsonl(path.join(store.root, "evaluation-index.jsonl"), {
    id: evaluation.id,
    traceId: evaluation.traceId,
    targetKind: evaluation.targetKind,
    workflowId: evaluation.workflowId,
    status: evaluation.status,
    reliabilityScore: evaluation.summary.reliabilityScore,
    createdAt: evaluation.createdAt,
  });
  return evaluation;
}

export function listEvaluations(store) {
  return readJsonl(path.join(store.root, "evaluation-index.jsonl"));
}

export function getEvaluation(store, evaluationId) {
  const filePath = evaluationPath(store, evaluationId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`evaluation not found: ${evaluationId}`);
  }
  return readJson(filePath);
}

function deriveEvaluationStatus({ workflowCompleted, stepResults, toolResults }) {
  if (!workflowCompleted) return "incomplete";
  if (hasStatus(stepResults, "failed") || hasStatus(stepResults, "blocked") || hasStatus(toolResults, "failed")) {
    return "needs_attention";
  }
  if (hasStatus(stepResults, "requires_approval") || hasStatus(toolResults, "requires_approval")) {
    return "requires_approval";
  }
  return "passed";
}

function scoreRun({ workflowCompleted, stepResults, toolResults, policyResults, approvalEvents }) {
  let score = 100;
  if (!workflowCompleted) score -= 25;
  score -= countStatus(stepResults, "failed") * 25;
  score -= countStatus(stepResults, "blocked") * 25;
  score -= countStatus(toolResults, "failed") * 20;
  score -= countStatus(stepResults, "requires_approval") * 10;
  score -= approvalEvents.length * 5;
  score -= policyResults.filter((decision) => decision.riskLevel === "high").length * 10;
  score -= policyResults.filter((decision) => decision.riskLevel === "critical").length * 20;
  return Math.max(0, Math.min(100, score));
}

function buildFindings({ workflowCompleted, stepResults, toolResults, policyResults, approvalEvents }) {
  const findings = [];
  if (!workflowCompleted) {
    findings.push({
      severity: "error",
      code: "workflow_completion_missing",
      message: "Trace does not contain a workflow.completed event.",
    });
  }
  for (const result of stepResults.filter((item) => item.status === "failed" || item.status === "blocked")) {
    findings.push({
      severity: "error",
      code: "workflow_step_not_completed",
      stepId: result.stepId,
      message: `Workflow step ${result.stepId} ended with status ${result.status}.`,
    });
  }
  for (const result of toolResults.filter((item) => item.status === "failed")) {
    findings.push({
      severity: "error",
      code: "tool_failed",
      toolName: result.toolName,
      message: `Tool ${result.toolName} failed.`,
    });
  }
  if (approvalEvents.length) {
    findings.push({
      severity: "warning",
      code: "approval_required",
      message: `${approvalEvents.length} approval ticket(s) were created during the run.`,
    });
  }
  const elevatedRisks = policyResults.filter((decision) => decision.riskLevel === "high" || decision.riskLevel === "critical");
  if (elevatedRisks.length) {
    findings.push({
      severity: "warning",
      code: "elevated_risk_policy",
      message: `${elevatedRisks.length} policy decision(s) had high or critical risk.`,
    });
  }
  if (!findings.length) {
    findings.push({
      severity: "info",
      code: "run_passed",
      message: "No blockers, failed tools, or approval gates were found.",
    });
  }
  return findings;
}

function buildRecommendedNextActions({ workflowCompleted, stepResults, toolResults, policyResults, approvalEvents }) {
  const actions = [];
  if (!workflowCompleted) {
    actions.push("Inspect the trace and rerun the workflow if the run was interrupted.");
  }
  if (approvalEvents.length) {
    actions.push("Review pending approval tickets before rerunning the blocked workflow steps.");
  }
  if (hasStatus(stepResults, "failed") || hasStatus(toolResults, "failed")) {
    actions.push("Inspect failed step and tool outputs, then add a narrower workflow step or test fixture.");
  }
  if (policyResults.some((decision) => decision.riskLevel === "high" || decision.riskLevel === "critical")) {
    actions.push("Split elevated-risk actions into explicit approval steps with clear inputs and rollback notes.");
  }
  if (!actions.length) {
    actions.push("Promote this run as a candidate reference trace if the workflow represents a reusable task.");
  }
  return actions;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function countStatus(items, status) {
  return items.filter((item) => item.status === status).length;
}

function hasStatus(items, status) {
  return countStatus(items, status) > 0;
}

function lastEvent(events, type) {
  return [...events].reverse().find((event) => event.type === type);
}

function evaluationPath(store, evaluationId) {
  return path.join(store.root, "evaluations", `${evaluationId}.json`);
}

function v0Limits() {
  return [
    "Evaluation v0 reads trace events only and never re-executes tools.",
    "Reliability score is a deterministic heuristic, not a statistical model.",
    "Evaluation v0 does not yet compare expected outputs or semantic quality.",
    "Evaluation v0 does not yet replay failed steps.",
  ];
}
