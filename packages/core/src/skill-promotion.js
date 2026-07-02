import { approveSkill, getSkill, listSkillVersions } from "./skills.js";
import {
  evaluateSkillCandidate,
  getSkillEvaluation,
  listSkillEvaluations,
} from "./skill-evaluations.js";

export const SKILL_PROMOTION_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.skill-promotion",
  targetKind: "skill.candidate",
  outputKind: "skill.promotion",
  defaultMinimumScore: 85,
  promotionGate: [
    "Candidate skill must exist.",
    "Skill evaluation must target the same skill.",
    "Skill evaluation status must be passed.",
    "Skill evaluation reliability score must meet the minimum score.",
    "Promotion writes an immutable skill version snapshot.",
  ],
  safetyBoundary: [
    "Promotion Gate v0 does not execute skill steps.",
    "Promotion Gate v0 does not bypass TrustKernel.",
    "Promotion Gate v0 only approves candidates after evaluation passes.",
  ],
});

export function getSkillPromotionContract() {
  return SKILL_PROMOTION_CONTRACT;
}

export function promoteSkillCandidate(store, skillId, input = {}) {
  const candidate = getSkill(store, skillId, "candidates");
  if (candidate.status !== "candidate") {
    throw new Error(`skill is not a candidate: ${skillId}`);
  }

  const minimumScore = Number(input.minimumScore ?? SKILL_PROMOTION_CONTRACT.defaultMinimumScore);
  const evaluation = resolvePromotionEvaluation(store, skillId, input);
  validatePromotionEvaluation(evaluation, {
    skillId,
    minimumScore,
  });

  const approved = approveSkill(store, skillId, {
    approvedBy: input.by ?? input.actor ?? "local-user",
    promotedBy: input.by ?? input.actor ?? "local-user",
    promotedAt: evaluation.createdAt,
    reason: input.reason ?? `promoted with ${evaluation.id}`,
    approvalMode: "promotion_gate",
    evaluationId: evaluation.id,
  });
  const versions = listSkillVersions(store, skillId);

  return {
    id: `promotion_${approved.id}_${approved.revision}`,
    version: SKILL_PROMOTION_CONTRACT.version,
    status: "promoted",
    skill: approved,
    evaluation,
    gate: {
      minimumScore,
      reliabilityScore: evaluation.summary.reliabilityScore,
      evaluationStatus: evaluation.status,
      passed: true,
    },
    versionSnapshot: versions.at(-1) ?? null,
    limits: [
      "Promotion Gate v0 promotes candidate skills only.",
      "Promotion Gate v0 uses static evaluation reports and does not execute skill steps.",
      "Promotion Gate v0 records version history but does not yet support rollback.",
    ],
  };
}

function resolvePromotionEvaluation(store, skillId, input) {
  if (input.evaluationId) {
    return getSkillEvaluation(store, input.evaluationId);
  }
  if (input.useLatestEvaluation) {
    const latest = [...listSkillEvaluations(store)]
      .filter((evaluation) => evaluation.skillId === skillId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
    if (latest) return getSkillEvaluation(store, latest.id);
  }
  return evaluateSkillCandidate(store, skillId, {
    status: "candidates",
    trustMode: input.trustMode,
  });
}

function validatePromotionEvaluation(evaluation, input) {
  if (evaluation.skillId !== input.skillId) {
    throw new Error(`evaluation ${evaluation.id} does not target skill ${input.skillId}`);
  }
  if (evaluation.status !== "passed") {
    throw new Error(`skill evaluation must pass before promotion: ${evaluation.status}`);
  }
  if (evaluation.summary.reliabilityScore < input.minimumScore) {
    throw new Error(`skill evaluation score ${evaluation.summary.reliabilityScore} is below minimum ${input.minimumScore}`);
  }
}
