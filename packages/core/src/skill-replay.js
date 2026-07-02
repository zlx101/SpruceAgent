import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { evaluateSkillCandidate, getSkillEvaluation } from "./skill-evaluations.js";
import { compileExecutableSteps, getSkill } from "./skills.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export const SKILL_REPLAY_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.skill-replay",
  targetKind: "skill.approved",
  fixtureKind: "static_skill_fixture",
  resultKind: "static_replay_result",
  safetyBoundary: [
    "Skill Replay v0 is static and does not execute tools.",
    "Replay fixtures compare skill shape, typed executable steps, policy previews, and trace evidence.",
    "Replay results are regression signals, not proof of semantic correctness.",
  ],
});

export function getSkillReplayContract() {
  return SKILL_REPLAY_CONTRACT;
}

export function createSkillReplayFixture(store, skillId, input = {}) {
  const status = input.status ?? "approved";
  const skill = getSkill(store, skillId, status);
  const evaluation = input.evaluationId
    ? getSkillEvaluation(store, input.evaluationId)
    : evaluateSkillCandidate(store, skillId, { status });
  if (evaluation.skillId !== skillId) {
    throw new Error(`evaluation ${evaluation.id} does not target skill ${skillId}`);
  }

  const fixture = {
    id: createId("skill_fixture"),
    version: SKILL_REPLAY_CONTRACT.version,
    skillId,
    skillStatus: skill.status,
    skillRevision: skill.revision ?? null,
    evaluationId: evaluation.id,
    name: input.name ?? `${skill.name} Fixture`,
    description: input.description ?? `Static replay fixture for ${skill.name}.`,
    createdAt: nowIso(),
    expected: {
      skillName: skill.name,
      stepCount: skill.steps?.length ?? 0,
      executableSteps: normalizeExecutableSteps(compileExecutableSteps(skill.steps)),
      minimumScore: Number(input.minimumScore ?? evaluation.summary.reliabilityScore),
      evaluationStatus: input.evaluationStatus ?? evaluation.status,
      policyDecisionCounts: evaluation.summary.policyDecisionCounts,
      riskCounts: evaluation.summary.riskCounts,
      sourceTraceIds: skill.sourceTraceIds ?? [],
      sourceTraceCount: evaluation.summary.sourceTraceCount,
    },
    limits: [
      "Replay Fixture v0 stores static expectations only.",
      "Fixture replay does not execute tools or replay source traces.",
      "Fixture replay should be replaced or supplemented by execution replay once sandboxing exists.",
    ],
  };

  writeJson(skillReplayFixturePath(store, fixture.id), fixture);
  appendJsonl(skillReplayFixtureIndexPath(store), {
    id: fixture.id,
    skillId: fixture.skillId,
    skillRevision: fixture.skillRevision,
    evaluationId: fixture.evaluationId,
    createdAt: fixture.createdAt,
  });
  return fixture;
}

export function replaySkillFixture(store, fixtureId, input = {}) {
  const fixture = getSkillReplayFixture(store, fixtureId);
  const status = input.status ?? "approved";
  let skill = null;
  let evaluation = null;
  const checks = [];

  try {
    skill = getSkill(store, fixture.skillId, status);
    checks.push(pass("skill_found", `Skill ${fixture.skillId} found with status ${status}.`));
  } catch (error) {
    checks.push(fail("skill_missing", error.message));
  }

  if (skill) {
    const actualSteps = normalizeExecutableSteps(compileExecutableSteps(skill.steps));
    compare("skill_name", fixture.expected.skillName, skill.name, checks);
    compare("step_count", fixture.expected.stepCount, skill.steps?.length ?? 0, checks);
    compareJson("executable_steps", fixture.expected.executableSteps, actualSteps, checks);
    compareJson("source_trace_ids", fixture.expected.sourceTraceIds, skill.sourceTraceIds ?? [], checks);
    evaluation = evaluateSkillCandidate(store, fixture.skillId, { status });
    compare("evaluation_status", fixture.expected.evaluationStatus, evaluation.status, checks);
    if (evaluation.summary.reliabilityScore >= fixture.expected.minimumScore) {
      checks.push(pass("minimum_score", `Reliability score ${evaluation.summary.reliabilityScore} meets ${fixture.expected.minimumScore}.`));
    } else {
      checks.push(fail("minimum_score", `Reliability score ${evaluation.summary.reliabilityScore} is below ${fixture.expected.minimumScore}.`));
    }
    compareJson("policy_decision_counts", fixture.expected.policyDecisionCounts, evaluation.summary.policyDecisionCounts, checks);
    compareJson("risk_counts", fixture.expected.riskCounts, evaluation.summary.riskCounts, checks);
    compare("source_trace_count", fixture.expected.sourceTraceCount, evaluation.summary.sourceTraceCount, checks);
  }

  const result = {
    id: createId("skill_replay"),
    version: SKILL_REPLAY_CONTRACT.version,
    fixtureId,
    skillId: fixture.skillId,
    status: checks.some((check) => check.status === "failed") ? "failed" : "passed",
    createdAt: nowIso(),
    summary: {
      checkCount: checks.length,
      passedCount: checks.filter((check) => check.status === "passed").length,
      failedCount: checks.filter((check) => check.status === "failed").length,
      evaluationId: evaluation?.id ?? null,
      reliabilityScore: evaluation?.summary?.reliabilityScore ?? null,
    },
    checks,
    limits: [
      "Replay Result v0 is static and does not execute tools.",
      "A passed replay means the current skill still matches fixture expectations.",
    ],
  };

  writeJson(skillReplayResultPath(store, result.id), result);
  appendJsonl(skillReplayResultIndexPath(store), {
    id: result.id,
    fixtureId: result.fixtureId,
    skillId: result.skillId,
    status: result.status,
    createdAt: result.createdAt,
  });
  return result;
}

export function listSkillReplayFixtures(store) {
  return readJsonl(skillReplayFixtureIndexPath(store));
}

export function getSkillReplayFixture(store, fixtureId) {
  const filePath = skillReplayFixturePath(store, fixtureId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`skill replay fixture not found: ${fixtureId}`);
  }
  return readJson(filePath);
}

export function listSkillReplayResults(store) {
  return readJsonl(skillReplayResultIndexPath(store));
}

export function getSkillReplayResult(store, resultId) {
  const filePath = skillReplayResultPath(store, resultId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`skill replay result not found: ${resultId}`);
  }
  return readJson(filePath);
}

function normalizeExecutableSteps(steps) {
  return steps.map((step) => ({
    toolName: step.toolName,
    input: step.input,
  }));
}

function compare(code, expected, actual, checks) {
  if (Object.is(expected, actual)) {
    checks.push(pass(code, `${code} matched.`));
  } else {
    checks.push(fail(code, `${code} expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}.`));
  }
}

function compareJson(code, expected, actual, checks) {
  if (JSON.stringify(expected) === JSON.stringify(actual)) {
    checks.push(pass(code, `${code} matched.`));
  } else {
    checks.push(fail(code, `${code} did not match.`, { expected, actual }));
  }
}

function pass(code, message) {
  return { status: "passed", code, message };
}

function fail(code, message, detail = {}) {
  return { status: "failed", code, message, ...detail };
}

function skillReplayFixtureIndexPath(store) {
  return path.join(store.root, "skill-replay-fixture-index.jsonl");
}

function skillReplayResultIndexPath(store) {
  return path.join(store.root, "skill-replay-result-index.jsonl");
}

function skillReplayFixturePath(store, fixtureId) {
  return path.join(store.root, "skill-replay-fixtures", `${fixtureId}.json`);
}

function skillReplayResultPath(store, resultId) {
  return path.join(store.root, "skill-replay-results", `${resultId}.json`);
}
