import { evaluatePolicy } from "./policy.js";
import { findTool } from "./tools.js";

export const PLANNER_PROMOTION_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.planner-promotion",
  sourceKind: "llm.planDraft",
  outputKind: "candidate_plan",
  defaultAllowedTools: ["file.read", "memory.add"],
  safetyBoundary: [
    "Planner Promotion v0 never executes tools.",
    "LLM draft steps must be explicitly promoted before they can influence execution.",
    "Only allowlisted tools can be promoted as executable candidate steps.",
    "Every promoted candidate step includes a TrustKernel policy preview.",
  ],
});

export function getPlannerPromotionContract() {
  return PLANNER_PROMOTION_CONTRACT;
}

export function promoteLlmDraftToCandidatePlan(input = {}) {
  const planDraft = input.llm?.planDraft ?? input.planDraft;
  const allowedTools = input.allowedTools ?? PLANNER_PROMOTION_CONTRACT.defaultAllowedTools;
  const trustMode = input.trustMode ?? "approve";
  const proposedSteps = planDraft?.proposedSteps ?? [];
  const promotedSteps = proposedSteps.map((step, index) => promoteStep(step, index, {
    allowedTools,
    trustMode,
  }));

  const summary = summarizePromotedSteps(promotedSteps);
  return {
    version: PLANNER_PROMOTION_CONTRACT.version,
    source: input.llm
      ? {
          provider: input.llm.provider,
          model: input.llm.model,
          status: input.llm.status,
        }
      : null,
    status: promotedSteps.some((step) => ["blocked", "not_promotable"].includes(step.promotionStatus))
      ? "blocked"
      : promotedSteps.some((step) => step.promotionStatus === "requires_approval")
        ? "requires_approval"
        : "ready",
    summary,
    allowedTools,
    stepCount: promotedSteps.length,
    promotedSteps,
    limits: [
      "Candidate plans are not executed by Planner Promotion v0.",
      "Only promoted steps with promotionStatus=ready can be considered for future execution.",
      "A policy preview is not an approval ticket.",
    ],
  };
}

function promoteStep(step, index, options) {
  const candidate = {
    id: step.id ?? `candidate_step_${index + 1}`,
    sourceKind: step.kind ?? "planning",
    description: step.description ?? "",
    requestedToolName: step.toolName ?? null,
    requestedInput: step.input ?? null,
    executable: false,
    promotionStatus: "not_promotable",
    reason: "draft step does not declare a toolName and input",
    toolName: null,
    input: null,
    policyPreview: null,
  };

  if (!step.toolName || !step.input || typeof step.input !== "object") {
    return candidate;
  }

  if (!findTool(step.toolName)) {
    return {
      ...candidate,
      promotionStatus: "blocked",
      reason: `unknown tool: ${step.toolName}`,
    };
  }

  const policyPreview = evaluatePolicy({
    toolName: step.toolName,
    trustMode: options.trustMode,
    input: step.input,
  });

  if (!options.allowedTools.includes(step.toolName)) {
    return {
      ...candidate,
      promotionStatus: "requires_approval",
      reason: `tool is not in planner promotion allowlist: ${step.toolName}`,
      policyPreview,
    };
  }

  if (policyPreview.decision !== "allow") {
    return {
      ...candidate,
      promotionStatus: "requires_approval",
      reason: `policy preview is ${policyPreview.decision}`,
      policyPreview,
    };
  }

  return {
    ...candidate,
    executable: true,
    promotionStatus: "ready",
    reason: "tool is allowlisted and policy preview allows it",
    toolName: step.toolName,
    input: step.input,
    policyPreview,
  };
}

function summarizePromotedSteps(steps) {
  const counts = {};
  for (const step of steps) {
    counts[step.promotionStatus] = (counts[step.promotionStatus] ?? 0) + 1;
  }
  return counts;
}
