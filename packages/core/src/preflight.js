import { assessWorkspaceIndexFreshness, buildWorkspaceIndex } from "./context.js";
import { nowIso } from "./id.js";
import { evaluatePolicy } from "./policy.js";
import { getApprovedSkill } from "./skills.js";

export function runPreflight(store, options = {}) {
  const startedAt = nowIso();
  const requireFreshContext = Boolean(options.requireFreshContext);
  const refreshContext = Boolean(options.refreshContext);
  const initialContextFreshness = assessWorkspaceIndexFreshness(store, {
    maxChanges: options.maxChanges,
  });
  const actions = [];
  let contextIndex = null;
  let finalContextFreshness = initialContextFreshness;

  if (refreshContext && initialContextFreshness.status !== "fresh") {
    contextIndex = buildWorkspaceIndex(store, {
      maxBytes: options.contextMaxBytes ?? options.maxBytes,
      incremental: options.incremental,
    });
    actions.push({
      id: "context.index",
      status: "completed",
      reason: `ContextOS was ${initialContextFreshness.status}; refreshContext requested an incremental index refresh.`,
      indexedAt: contextIndex.indexedAt,
      documentCount: contextIndex.documentCount,
      skippedCount: contextIndex.skippedCount,
      redactedDocumentCount: contextIndex.redactedDocumentCount,
      incremental: summarizeIncrementalIndex(contextIndex.incremental),
    });
    finalContextFreshness = assessWorkspaceIndexFreshness(store, {
      maxChanges: options.maxChanges,
    });
  }

  const blockers = [];
  const warnings = [];
  if (requireFreshContext && finalContextFreshness.status !== "fresh") {
    blockers.push({
      id: "context.freshness",
      reason: "Fresh ContextOS evidence is required, but the workspace index is stale or missing.",
      status: finalContextFreshness.status,
      summary: finalContextFreshness.summary,
    });
  } else if (finalContextFreshness.status !== "fresh") {
    warnings.push({
      id: "context.freshness",
      reason: "ContextOS evidence is stale or missing; execution may use incomplete or outdated context.",
      status: finalContextFreshness.status,
      summary: finalContextFreshness.summary,
    });
  }

  const status = blockers.length ? "blocked" : warnings.length ? "warning" : "passed";

  return {
    version: "0.1.0",
    kind: options.kind ?? "run.preflight",
    startedAt,
    completedAt: nowIso(),
    status,
    canProceed: status !== "blocked",
    policy: {
      requireFreshContext,
      refreshContext,
    },
    context: {
      initial: initialContextFreshness,
      final: finalContextFreshness,
      refreshed: Boolean(contextIndex),
      index: contextIndex
        ? {
            indexedAt: contextIndex.indexedAt,
            documentCount: contextIndex.documentCount,
            skippedCount: contextIndex.skippedCount,
            redactedDocumentCount: contextIndex.redactedDocumentCount,
          }
        : null,
    },
    actions,
    blockers,
    warnings,
    limits: [
      "Preflight v0 only checks local deterministic readiness signals.",
      "refreshContext can update the local ContextOS index, but it does not execute tools or external actions.",
      "A passed preflight does not prove task correctness; it only means configured runtime gates are satisfied.",
    ],
  };
}

export function assessRunRisk(store, input = {}) {
  const startedAt = nowIso();
  const trustMode = input.trustMode ?? "approve";
  const entries = collectRiskEntries(store, input);
  const decisions = entries.map((entry, index) => assessRiskEntry(entry, index, trustMode));
  const summary = summarizeRiskDecisions(decisions);
  const blockers = decisions
    .filter((decision) => decision.decision === "deny" || decision.decision === "blocked")
    .map((decision) => ({
      id: decision.id,
      reason: decision.reason,
      toolName: decision.toolName,
      decision: decision.decision,
      riskLevel: decision.riskLevel,
    }));
  const warnings = decisions
    .filter((decision) => decision.decision === "requires_approval")
    .map((decision) => ({
      id: decision.id,
      reason: decision.reason,
      toolName: decision.toolName,
      decision: decision.decision,
      riskLevel: decision.riskLevel,
    }));
  const status = blockers.length ? "blocked" : warnings.length ? "warning" : "passed";

  return {
    version: "0.1.0",
    kind: input.kind ?? "run.risk_preflight",
    startedAt,
    completedAt: nowIso(),
    status,
    canProceed: status !== "blocked",
    trustMode,
    summary,
    decisions,
    blockers,
    warnings,
    limits: [
      "Risk Preflight v0 previews local TrustKernel policy decisions; it does not execute tools.",
      "requires_approval is not a blocker; execution may continue until an approval ticket is needed.",
      "deny and blocked decisions stop execution before tool calls when enforced by the runner.",
    ],
  };
}

function summarizeIncrementalIndex(incremental = {}) {
  return {
    enabled: Boolean(incremental.enabled),
    previousIndexedAt: incremental.previousIndexedAt ?? null,
    addedCount: incremental.addedCount ?? 0,
    changedCount: incremental.changedCount ?? 0,
    unchangedCount: incremental.unchangedCount ?? 0,
    deletedCount: incremental.deletedCount ?? 0,
    skippedCount: incremental.skippedCount ?? 0,
    reusedDocumentCount: incremental.reusedDocumentCount ?? 0,
  };
}

function collectRiskEntries(store, input) {
  const entries = [];
  if (input.plan?.steps) {
    entries.push(...input.plan.steps.map((step) => ({
      source: "agent.plan",
      stepId: step.id,
      kind: step.kind,
      description: step.description,
      toolName: step.toolName,
      toolInput: step.input,
    })));
  }

  if (input.workflow?.steps || input.steps) {
    const workflow = input.workflow ?? { steps: input.steps };
    entries.push(...collectWorkflowEntries(store, workflow));
  }

  if (input.candidatePlan?.promotedSteps) {
    entries.push(...input.candidatePlan.promotedSteps.map((step) => ({
      source: "candidate.plan",
      stepId: step.id,
      kind: step.sourceKind ?? "candidate",
      description: step.description,
      toolName: step.toolName ?? step.requestedToolName,
      toolInput: step.input ?? step.requestedInput,
      promotionStatus: step.promotionStatus,
      reason: step.reason,
    })));
  }

  return entries;
}

function collectWorkflowEntries(store, workflow) {
  const entries = [];
  for (const step of workflow.steps ?? []) {
    if (step.kind === "skill") {
      entries.push(...collectWorkflowSkillEntries(store, step));
      continue;
    }
    entries.push({
      source: "workflow.step",
      stepId: step.id,
      kind: step.kind,
      description: step.description,
      toolName: step.toolName,
      toolInput: step.input,
    });
  }
  return entries;
}

function collectWorkflowSkillEntries(store, step) {
  try {
    const skill = getApprovedSkill(store, step.skillId);
    const executableSteps = skill.executableSteps ?? [];
    if (!executableSteps.length) {
      return [{
        source: "workflow.skill",
        stepId: step.id,
        kind: "skill",
        description: `Approved skill has no typed executable steps: ${skill.name}`,
        toolName: null,
        toolInput: null,
      }];
    }
    return executableSteps.map((executableStep) => ({
      source: "workflow.skill",
      stepId: `${step.id}:${executableStep.id}`,
      kind: "skill_tool",
      description: `Approved skill step: ${skill.name}`,
      toolName: executableStep.toolName,
      toolInput: executableStep.input,
    }));
  } catch (error) {
    return [{
      source: "workflow.skill",
      stepId: step.id,
      kind: "skill",
      description: "Workflow references a skill that cannot be loaded.",
      toolName: null,
      toolInput: null,
      blocked: true,
      reason: error.message,
    }];
  }
}

function assessRiskEntry(entry, index, trustMode) {
  const id = entry.stepId ?? `risk_step_${index + 1}`;
  if (entry.blocked) {
    return {
      id,
      source: entry.source,
      kind: entry.kind,
      description: entry.description ?? "",
      decision: "blocked",
      riskLevel: "high",
      toolName: entry.toolName ?? null,
      input: entry.toolInput ?? null,
      reason: entry.reason ?? "entry is blocked",
      policyPreview: null,
    };
  }

  if (entry.promotionStatus === "blocked") {
    return {
      id,
      source: entry.source,
      kind: entry.kind,
      description: entry.description ?? "",
      decision: "blocked",
      riskLevel: "high",
      toolName: entry.toolName ?? null,
      input: entry.toolInput ?? null,
      reason: entry.reason ?? "candidate step promotion is blocked",
      policyPreview: null,
    };
  }

  if (!entry.toolName) {
    return {
      id,
      source: entry.source,
      kind: entry.kind,
      description: entry.description ?? "",
      decision: "not_executable",
      riskLevel: "low",
      toolName: null,
      input: null,
      reason: "step has no tool call",
      policyPreview: null,
    };
  }

  if (entry.promotionStatus === "not_promotable") {
    return {
      id,
      source: entry.source,
      kind: entry.kind,
      description: entry.description ?? "",
      decision: "not_executable",
      riskLevel: "low",
      toolName: entry.toolName,
      input: entry.toolInput ?? null,
      reason: entry.reason ?? "candidate step is not promotable",
      policyPreview: null,
    };
  }

  const policyPreview = evaluatePolicy({
    toolName: entry.toolName,
    trustMode,
    input: entry.toolInput ?? {},
  });

  return {
    id,
    source: entry.source,
    kind: entry.kind,
    description: entry.description ?? "",
    decision: policyPreview.decision,
    riskLevel: policyPreview.riskLevel,
    toolName: entry.toolName,
    input: entry.toolInput ?? {},
    reason: policyPreview.reasons.join("; "),
    policyPreview,
  };
}

function summarizeRiskDecisions(decisions) {
  const summary = {
    total: decisions.length,
    allow: 0,
    requires_approval: 0,
    deny: 0,
    blocked: 0,
    not_executable: 0,
    unknownTool: 0,
    byRiskLevel: {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    },
  };

  for (const decision of decisions) {
    summary[decision.decision] = (summary[decision.decision] ?? 0) + 1;
    if (summary.byRiskLevel[decision.riskLevel] !== undefined) {
      summary.byRiskLevel[decision.riskLevel] += 1;
    }
    if (decision.policyPreview?.reasons?.some((reason) => reason.startsWith("unknown tool:"))) {
      summary.unknownTool += 1;
    }
  }

  return summary;
}
