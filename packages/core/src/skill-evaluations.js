import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { evaluatePolicy } from "./policy.js";
import { compileExecutableSteps, getSkill } from "./skills.js";
import { appendJsonl, readJson, readJsonl, storeItemPath, writeJson } from "./storage.js";
import { readTraceEvents } from "./trace.js";
import { findTool } from "./tools.js";

export const SKILL_EVALUATION_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.skill-evaluation",
  targetKind: "skill.candidate",
  outputKind: "skill_evaluation_report",
  policy: {
    defaultTrustMode: "approve",
    approvalRequiredDoesNotFail: true,
  },
  safetyBoundary: [
    "Skill Evaluation v0 is static and trace-evidence based.",
    "Skill Evaluation v0 does not execute, replay, or approve candidate skills.",
    "Policy previews use the current TrustKernel rules for each executable step.",
    "Approval remains an explicit separate action through approveSkill.",
  ],
  requiredEvidence: [
    "Skill name, summary, and steps.",
    "Parsed executable steps when present.",
    "Source trace events when sourceTraceIds or traceId are available.",
  ],
});

export function getSkillEvaluationContract() {
  return SKILL_EVALUATION_CONTRACT;
}

export function evaluateSkillCandidate(store, skillId, input = {}) {
  const skill = readSkillByStatus(store, skillId, input.status);
  const executableSteps = compileExecutableSteps(skill.steps);
  const sourceTraceIds = input.traceId ? [input.traceId] : skill.sourceTraceIds ?? [];
  const traceEvidence = buildTraceEvidence(store, sourceTraceIds);
  const policyPreviews = executableSteps.map((step) => ({
    stepId: step.id,
    toolName: step.toolName,
    decision: evaluatePolicy({
      toolName: step.toolName,
      input: step.input,
      trustMode: input.trustMode ?? "approve",
    }),
  }));
  const findings = buildFindings({
    skill,
    executableSteps,
    policyPreviews,
    traceEvidence,
  });
  const reliabilityScore = scoreSkillEvaluation({
    skill,
    executableSteps,
    policyPreviews,
    traceEvidence,
    findings,
  });
  const evaluation = {
    id: createId("skill_eval"),
    version: SKILL_EVALUATION_CONTRACT.version,
    targetKind: skill.status === "approved" ? "skill.approved" : "skill.candidate",
    skillId: skill.id,
    skillStatus: skill.status,
    status: deriveStatus({ findings, reliabilityScore }),
    createdAt: nowIso(),
    summary: {
      stepCount: skill.steps?.length ?? 0,
      executableStepCount: executableSteps.length,
      sourceTraceCount: traceEvidence.traces.length,
      sourceEventCount: traceEvidence.summary.eventCount,
      toolResultCount: traceEvidence.summary.toolResultCount,
      passedToolResultCount: traceEvidence.summary.passedToolResultCount,
      failedToolResultCount: traceEvidence.summary.failedToolResultCount,
      policyDecisionCounts: countBy(policyPreviews, (preview) => preview.decision.decision),
      riskCounts: countBy(policyPreviews, (preview) => preview.decision.riskLevel),
      reliabilityScore,
    },
    executableSteps,
    policyPreviews,
    traceEvidence,
    findings,
    recommendedNextActions: buildRecommendedNextActions({
      skill,
      executableSteps,
      policyPreviews,
      traceEvidence,
      findings,
    }),
    limits: v0Limits(),
  };

  writeJson(skillEvaluationPath(store, evaluation.id), evaluation);
  appendJsonl(path.join(store.root, "skill-evaluation-index.jsonl"), {
    id: evaluation.id,
    skillId: evaluation.skillId,
    skillStatus: evaluation.skillStatus,
    targetKind: evaluation.targetKind,
    status: evaluation.status,
    reliabilityScore,
    createdAt: evaluation.createdAt,
  });
  return evaluation;
}

export function listSkillEvaluations(store) {
  return readJsonl(path.join(store.root, "skill-evaluation-index.jsonl"));
}

export function getSkillEvaluation(store, evaluationId) {
  const filePath = skillEvaluationPath(store, evaluationId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`skill evaluation not found: ${evaluationId}`);
  }
  return readJson(filePath);
}

function readSkillByStatus(store, skillId, status) {
  if (status) return getSkill(store, skillId, status);
  try {
    return getSkill(store, skillId, "candidates");
  } catch (error) {
    if (!/skill not found/.test(error.message)) throw error;
    return getSkill(store, skillId, "approved");
  }
}

function buildTraceEvidence(store, traceIds) {
  const traces = [];
  for (const traceId of traceIds) {
    let events = [];
    let missing = false;
    try {
      events = readTraceEvents(store, traceId);
      missing = events.length === 0;
    } catch {
      missing = true;
    }
    const toolResults = events
      .filter((event) => event.type === "tool.result")
      .map((event) => event.payload)
      .filter((payload) => payload?.toolName);
    traces.push({
      traceId,
      missing,
      eventCount: events.length,
      toolResults: toolResults.map((result) => ({
        toolName: result.toolName,
        status: result.status ?? "unknown",
        approvalId: result.approval?.id ?? result.approvalId ?? null,
      })),
    });
  }

  const allToolResults = traces.flatMap((trace) => trace.toolResults);
  return {
    traces,
    summary: {
      eventCount: traces.reduce((sum, trace) => sum + trace.eventCount, 0),
      missingTraceCount: traces.filter((trace) => trace.missing).length,
      toolResultCount: allToolResults.length,
      passedToolResultCount: allToolResults.filter((result) => result.status === "succeeded").length,
      failedToolResultCount: allToolResults.filter((result) => result.status === "failed").length,
      toolStatusCounts: countBy(allToolResults, (result) => result.status ?? "unknown"),
    },
  };
}

function buildFindings({ skill, executableSteps, policyPreviews, traceEvidence }) {
  const findings = [];
  if (!skill.name || !skill.summary) {
    findings.push({
      severity: "error",
      code: "skill_identity_missing",
      message: "Skill name and summary are required for evaluation.",
    });
  }
  if (!skill.steps?.length) {
    findings.push({
      severity: "error",
      code: "skill_steps_missing",
      message: "Skill has no reusable steps.",
    });
  }
  if (skill.steps?.length && executableSteps.length === 0) {
    findings.push({
      severity: "warning",
      code: "executable_steps_missing",
      message: "No executable steps could be parsed from the skill steps.",
    });
  }
  for (const step of executableSteps) {
    if (!findTool(step.toolName)) {
      findings.push({
        severity: "error",
        code: "unknown_tool",
        stepId: step.id,
        toolName: step.toolName,
        message: `Executable step references an unknown tool: ${step.toolName}.`,
      });
    }
  }
  for (const preview of policyPreviews) {
    if (preview.decision.decision === "deny") {
      findings.push({
        severity: "error",
        code: "policy_denied",
        stepId: preview.stepId,
        toolName: preview.toolName,
        message: `TrustKernel would deny ${preview.toolName}.`,
      });
    } else if (preview.decision.decision === "requires_approval") {
      findings.push({
        severity: "warning",
        code: "policy_requires_approval",
        stepId: preview.stepId,
        toolName: preview.toolName,
        message: `TrustKernel would require approval for ${preview.toolName}.`,
      });
    }
  }
  if (!traceEvidence.traces.length) {
    findings.push({
      severity: "warning",
      code: "source_trace_missing",
      message: "Skill has no source trace evidence.",
    });
  }
  if (traceEvidence.summary.missingTraceCount) {
    findings.push({
      severity: "error",
      code: "source_trace_not_found",
      message: `${traceEvidence.summary.missingTraceCount} source trace(s) could not be read.`,
    });
  }
  if (traceEvidence.summary.failedToolResultCount) {
    findings.push({
      severity: "warning",
      code: "source_trace_failed_tool",
      message: `${traceEvidence.summary.failedToolResultCount} source trace tool result(s) failed.`,
    });
  }
  if (!findings.length) {
    findings.push({
      severity: "info",
      code: "skill_evaluation_passed",
      message: "No static blockers were found for this skill.",
    });
  }
  return findings;
}

function scoreSkillEvaluation({ skill, executableSteps, policyPreviews, traceEvidence, findings }) {
  let score = 100;
  if (!skill.name || !skill.summary) score -= 25;
  if (!skill.steps?.length) score -= 35;
  if (skill.steps?.length && executableSteps.length === 0) score -= 20;
  score -= findings.filter((finding) => finding.severity === "error").length * 30;
  score -= policyPreviews.filter((preview) => preview.decision.decision === "requires_approval").length * 5;
  score -= policyPreviews.filter((preview) => preview.decision.riskLevel === "high").length * 10;
  score -= policyPreviews.filter((preview) => preview.decision.riskLevel === "critical").length * 20;
  if (!traceEvidence.traces.length) score -= 15;
  score -= traceEvidence.summary.missingTraceCount * 25;
  score -= traceEvidence.summary.failedToolResultCount * 15;
  return Math.max(0, Math.min(100, score));
}

function deriveStatus({ findings, reliabilityScore }) {
  if (findings.some((finding) => finding.severity === "error") || reliabilityScore < 50) return "failed";
  if (findings.some((finding) => finding.severity === "warning") || reliabilityScore < 85) return "needs_review";
  return "passed";
}

function buildRecommendedNextActions({ skill, executableSteps, policyPreviews, traceEvidence, findings }) {
  const actions = [];
  if (!skill.steps?.length) {
    actions.push("Add concrete reusable steps before requesting approval.");
  }
  if (skill.steps?.length && executableSteps.length === 0) {
    actions.push("Add at least one typed executable step in the form: Use <tool.name> with input <json>.");
  }
  if (findings.some((finding) => finding.code === "unknown_tool")) {
    actions.push("Replace unknown tools with registered SpruceAgent tools or add a governed tool adapter first.");
  }
  if (policyPreviews.some((preview) => preview.decision.decision === "requires_approval")) {
    actions.push("Keep approval gates explicit for write, execute, or elevated-risk skill steps.");
  }
  if (!traceEvidence.traces.length) {
    actions.push("Attach at least one source trace that demonstrates the skill on a real task.");
  }
  if (traceEvidence.summary.failedToolResultCount) {
    actions.push("Review failed source trace tool results before approving this skill.");
  }
  if (!actions.length) {
    actions.push("Review the report, then approve the skill only if its behavior matches the intended workflow.");
  }
  return actions;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item) ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function skillEvaluationPath(store, evaluationId) {
  return storeItemPath(store, "skill-evaluations", evaluationId);
}

function v0Limits() {
  return [
    "Skill Evaluation v0 never executes candidate steps.",
    "Static parsing only recognizes typed steps in the form: Use <tool.name> with input <json>.",
    "Trace evidence is observational and does not prove semantic correctness.",
    "Reliability score is a deterministic heuristic, not a statistical benchmark.",
    "A passed evaluation does not auto-approve a skill.",
  ];
}
