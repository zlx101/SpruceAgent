import { evaluatePolicy } from "./policy.js";
import { findTool } from "./tools.js";

export const PLANNER_PROMOTION_CONTRACT = Object.freeze({
  version: "0.2.0",
  interface: "spruceagent.planner-promotion",
  sourceKind: "llm.planDraft",
  outputKind: "candidate_plan",
  defaultAllowedTools: ["file.read", "memory.add"],
  safetyBoundary: [
    "Planner Promotion v0 never executes tools.",
    "LLM draft steps must be explicitly promoted before they can influence execution.",
    "Only allowlisted tools can be promoted as executable candidate steps.",
    "When Context Evidence is supplied, tool candidate steps must cite allowed evidence ids before promotion.",
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
  const evidenceIndex = buildEvidenceIndex(input.contextEvidence);
  const proposedSteps = planDraft?.proposedSteps ?? [];
  const promotedSteps = proposedSteps.map((step, index) => promoteStep(step, index, {
    allowedTools,
    trustMode,
    evidenceIndex,
    requireEvidence: Boolean(input.contextEvidence),
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
    evidence: summarizeEvidenceBinding(input.contextEvidence, promotedSteps),
    stepCount: promotedSteps.length,
    promotedSteps,
    limits: [
      "Candidate plans are not executed by Planner Promotion v0.",
      "Only promoted steps with promotionStatus=ready can be considered for future execution.",
      "A policy preview is not an approval ticket.",
      "Evidence references are untrusted provenance, not execution authority.",
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
    evidenceRefs: normalizeEvidenceRefs(step),
    evidenceGate: null,
  };

  if (!step.toolName || !step.input || typeof step.input !== "object") {
    candidate.evidenceGate = evidenceGateNotApplicable(options);
    return candidate;
  }

  if (!findTool(step.toolName)) {
    return {
      ...candidate,
      promotionStatus: "blocked",
      reason: `unknown tool: ${step.toolName}`,
      evidenceGate: evidenceGateNotApplicable(options),
    };
  }

  const evidenceGate = evaluateEvidenceGate(candidate.evidenceRefs, options);
  if (evidenceGate.status === "blocked") {
    return {
      ...candidate,
      promotionStatus: "blocked",
      reason: evidenceGate.reason,
      evidenceGate,
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
      evidenceGate,
    };
  }

  if (policyPreview.decision !== "allow") {
    return {
      ...candidate,
      promotionStatus: "requires_approval",
      reason: `policy preview is ${policyPreview.decision}`,
      policyPreview,
      evidenceGate,
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
    evidenceGate,
  };
}

function normalizeEvidenceRefs(step = {}) {
  const refs = Array.isArray(step.evidenceRefs)
    ? step.evidenceRefs
    : Array.isArray(step.evidenceIds)
      ? step.evidenceIds
      : [];
  return [...new Set(refs.map((item) => String(item).trim()).filter(Boolean))];
}

function buildEvidenceIndex(contextEvidence) {
  if (!contextEvidence) return null;
  const sources = Array.isArray(contextEvidence.sources) ? contextEvidence.sources : [];
  return {
    contract: contextEvidence.interface ?? "spruceagent.context-evidence",
    version: contextEvidence.version ?? null,
    query: contextEvidence.query ?? null,
    summary: contextEvidence.summary ?? null,
    sourcesById: new Map(sources.map((source) => [source.id, source])),
  };
}

function evaluateEvidenceGate(evidenceRefs, options) {
  if (!options.requireEvidence) return evidenceGateNotApplicable(options);
  if (!evidenceRefs.length) {
    return {
      status: "blocked",
      reason: "tool candidate step must cite at least one context evidence id",
      refs: [],
      acceptedRefs: [],
      rejectedRefs: [],
    };
  }

  const acceptedRefs = [];
  const rejectedRefs = [];
  for (const ref of evidenceRefs) {
    const source = options.evidenceIndex?.sourcesById?.get(ref);
    if (!source) {
      rejectedRefs.push({ id: ref, reason: "evidence id not found" });
      continue;
    }
    if (source.safety?.status !== "allowed") {
      rejectedRefs.push({ id: ref, reason: `evidence safety is ${source.safety?.status ?? "unknown"}` });
      continue;
    }
    if (source.access?.planning !== "reference_only") {
      rejectedRefs.push({ id: ref, reason: `planning access is ${source.access?.planning ?? "unknown"}` });
      continue;
    }
    acceptedRefs.push({
      id: ref,
      kind: source.kind,
      title: source.title,
      freshness: source.freshness?.status ?? "unknown",
      trust: source.trust?.level ?? "unknown",
      origin: {
        kind: source.origin?.kind ?? null,
        locator: source.origin?.locator ?? null,
        contentHash: source.origin?.contentHash ?? null,
        indexedAt: source.origin?.indexedAt ?? null,
      },
    });
  }

  if (rejectedRefs.length) {
    return {
      status: "blocked",
      reason: `invalid evidence reference: ${rejectedRefs[0].reason}`,
      refs: evidenceRefs,
      acceptedRefs,
      rejectedRefs,
    };
  }

  return {
    status: acceptedRefs.some((ref) => ref.freshness !== "fresh") ? "passed_with_stale_evidence" : "passed",
    reason: acceptedRefs.some((ref) => ref.freshness !== "fresh")
      ? "all evidence refs are allowed, but at least one is not fresh"
      : "all evidence refs are allowed for planning",
    refs: evidenceRefs,
    acceptedRefs,
    rejectedRefs,
  };
}

function evidenceGateNotApplicable(options) {
  return options.requireEvidence
    ? {
        status: "not_applicable",
        reason: "evidence binding applies only to tool candidate steps with object input",
        refs: [],
        acceptedRefs: [],
        rejectedRefs: [],
      }
    : {
        status: "not_required",
        reason: "no context evidence pack was supplied to planner promotion",
        refs: [],
        acceptedRefs: [],
        rejectedRefs: [],
      };
}

function summarizeEvidenceBinding(contextEvidence, promotedSteps) {
  const gates = promotedSteps.map((step) => step.evidenceGate).filter(Boolean);
  return {
    required: Boolean(contextEvidence),
    contract: contextEvidence?.interface ?? "spruceagent.context-evidence",
    query: contextEvidence?.query ?? null,
    sourceCount: contextEvidence?.summary?.sourceCount ?? contextEvidence?.sources?.length ?? 0,
    citedStepCount: promotedSteps.filter((step) => step.evidenceRefs?.length).length,
    blockedStepCount: gates.filter((gate) => gate.status === "blocked").length,
    staleEvidenceStepCount: gates.filter((gate) => gate.status === "passed_with_stale_evidence").length,
  };
}

function summarizePromotedSteps(steps) {
  const counts = {};
  for (const step of steps) {
    counts[step.promotionStatus] = (counts[step.promotionStatus] ?? 0) + 1;
  }
  return counts;
}
