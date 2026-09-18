import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getFleetRun } from "./fleet-runs.js";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, storeItemPath, writeJson } from "./storage.js";
import { readTraceEvents } from "./trace.js";

export const OUTCOME_EVALUATION_CONTRACT = Object.freeze({
  version: "1.0.0",
  interface: "spruceagent.outcome-evaluations",
  fixtureKind: "immutable_task_fixture",
  resultKind: "deterministic_outcome_evaluation",
  validatorKinds: [
    "trace_event",
    "completion_status",
    "workspace_file",
    "json_file",
    "fleet_status",
    "fleet_candidates",
  ],
  resultStatuses: ["passed", "failed", "invalid"],
  safetyBoundary: [
    "Outcome Evaluation Suite v1 reads existing traces, Fleet records, and explicitly named workspace files only.",
    "It never executes, replays, approves, cancels, merges, pushes, or promotes any Agent work.",
    "Fixtures are immutable after creation and results retain the fixture fingerprint used for evaluation.",
    "Safety vetoes are explicit deterministic checks; a passed result is evidence for the declared fixture only, not proof of general intelligence.",
    "Token usage is reported only when a trace provides it; v1 never invents provider cost estimates.",
  ],
});

const MAX_VALIDATORS = 16;
const MAX_DESCRIPTION_LENGTH = 2_000;
const RISK_RANK = Object.freeze({ low: 1, medium: 2, high: 3, critical: 4 });

export function getOutcomeEvaluationContract() {
  return OUTCOME_EVALUATION_CONTRACT;
}

export function createOutcomeFixture(store, input = {}) {
  const name = requiredText(input.name, "fixture name", 120);
  const description = optionalText(input.description, MAX_DESCRIPTION_LENGTH) ?? `Outcome fixture for ${name}.`;
  const validators = normalizeValidators(store, input.validators);
  if (!validators.length) throw new Error("outcome fixture requires at least one validator");
  const safety = normalizeSafety(input.safety);
  const definition = { name, description, validators, safety };
  const fixture = {
    id: createId("outcome_fixture"),
    version: OUTCOME_EVALUATION_CONTRACT.version,
    name,
    description,
    createdAt: nowIso(),
    createdBy: optionalText(input.actor, 120) ?? "local-user",
    fixtureFingerprint: fingerprint(definition),
    validators,
    safety,
    limits: OUTCOME_EVALUATION_CONTRACT.safetyBoundary,
  };

  writeJson(outcomeFixturePath(store, fixture.id), fixture);
  appendJsonl(outcomeFixtureIndexPath(store), fixtureIndexItem(fixture));
  return fixture;
}

export function evaluateOutcomeFixture(store, fixtureId, input = {}) {
  const fixture = getOutcomeFixture(store, fixtureId);
  const fleet = input.fleetRunId ? getFleetRun(store, String(input.fleetRunId)) : null;
  const traceId = String(input.traceId ?? fleet?.traceId ?? "").trim();
  if (!traceId) throw new Error("traceId is required unless fleetRunId identifies a Fleet trace");

  const events = readTraceEvents(store, traceId);
  const checks = [];
  if (!events.length) {
    checks.push(fail("trace_available", "Trace is missing or contains no events.", { veto: false }));
  } else {
    checks.push(pass("trace_available", "Trace contains recorded events."));
  }

  for (const validator of fixture.validators) {
    checks.push(runValidator(store, validator, { events, fleet }));
  }
  checks.push(...runSafetyChecks(events, fixture.safety));

  const durationMs = traceDurationMs(events);
  const usage = collectUsage(events);
  const result = {
    id: createId("outcome_result"),
    version: OUTCOME_EVALUATION_CONTRACT.version,
    fixtureId: fixture.id,
    fixtureFingerprint: fixture.fixtureFingerprint,
    traceId,
    fleetRunId: fleet?.id ?? null,
    createdAt: nowIso(),
    status: deriveResultStatus(events, checks),
    summary: summarizeChecks(checks, { durationMs, usage }),
    checks,
    limits: [
      "The result evaluates only the fixture's declared deterministic checks.",
      "No provider price, semantic quality score, or generalization claim is inferred from this result.",
      "Use multiple independent runs before treating a result as reliable evidence.",
    ],
  };

  writeJson(outcomeResultPath(store, result.id), result);
  appendJsonl(outcomeResultIndexPath(store), outcomeResultIndexItem(result));
  return result;
}

export function listOutcomeFixtures(store) {
  const items = uniqueIndexItems(readJsonl(outcomeFixtureIndexPath(store)), (item) => item.id)
    .map((item) => {
      try {
        return fixtureListItem(getOutcomeFixture(store, item.id));
      } catch {
        return { ...item, integrity: "failed" };
      }
    })
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  return {
    version: OUTCOME_EVALUATION_CONTRACT.version,
    status: items.length ? "available" : "empty",
    summary: {
      total: items.length,
      integrityFailedCount: items.filter((item) => item.integrity === "failed").length,
    },
    items,
    limits: OUTCOME_EVALUATION_CONTRACT.safetyBoundary,
  };
}

export function getOutcomeFixture(store, fixtureId) {
  const filePath = outcomeFixturePath(store, fixtureId);
  if (!fs.existsSync(filePath)) throw new Error(`outcome fixture not found: ${fixtureId}`);
  const fixture = readJson(filePath);
  const actualFingerprint = fingerprint({
    name: fixture.name,
    description: fixture.description,
    validators: fixture.validators,
    safety: fixture.safety,
  });
  if (fixture.fixtureFingerprint !== actualFingerprint) {
    throw new Error(`outcome fixture integrity check failed: ${fixtureId}`);
  }
  return fixture;
}

export function listOutcomeEvaluationResults(store, options = {}) {
  const items = uniqueIndexItems(readJsonl(outcomeResultIndexPath(store)), (item) => item.id)
    .filter((item) => !options.fixtureId || item.fixtureId === options.fixtureId)
    .filter((item) => !options.status || item.status === options.status)
    .map((item) => {
      try {
        return getOutcomeEvaluationResult(store, item.id);
      } catch {
        return item;
      }
    })
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  return {
    version: OUTCOME_EVALUATION_CONTRACT.version,
    status: items.length ? "available" : "empty",
    summary: summarizeResultItems(items),
    items: items.map(resultListItem),
    limits: OUTCOME_EVALUATION_CONTRACT.safetyBoundary,
  };
}

export function getOutcomeEvaluationResult(store, resultId) {
  const filePath = outcomeResultPath(store, resultId);
  if (!fs.existsSync(filePath)) throw new Error(`outcome evaluation result not found: ${resultId}`);
  return readJson(filePath);
}

export function summarizeOutcomeFixture(store, fixtureId) {
  const fixture = getOutcomeFixture(store, fixtureId);
  const results = listOutcomeEvaluationResults(store, { fixtureId }).items;
  const total = results.length;
  const passed = results.filter((item) => item.status === "passed").length;
  const failed = results.filter((item) => item.status === "failed").length;
  const invalid = results.filter((item) => item.status === "invalid").length;
  const completed = passed + failed;
  const durations = results.map((item) => item.durationMs).filter(Number.isFinite);
  const safetyVetoCount = results.reduce((sum, item) => sum + (item.safetyVetoCount ?? 0), 0);
  return {
    version: OUTCOME_EVALUATION_CONTRACT.version,
    fixture: fixtureListItem(fixture),
    createdAt: nowIso(),
    summary: {
      attemptCount: total,
      passedCount: passed,
      failedCount: failed,
      invalidCount: invalid,
      passRate: completed ? round(passed / completed) : null,
      passAtLeastOne: passed > 0,
      passAll: total > 0 && passed === total,
      stablePass: total >= 2 && passed === total,
      safetyVetoCount,
      averageDurationMs: durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : null,
    },
    interpretation: [
      "passAtLeastOne corresponds to Pass@k for the recorded attempts.",
      "passAll corresponds to Pass^k for the recorded attempts.",
      "stablePass requires at least two recorded attempts; one passing result is not treated as stability evidence.",
    ],
    recentResults: results.slice(0, 20),
    limits: OUTCOME_EVALUATION_CONTRACT.safetyBoundary,
  };
}

function normalizeValidators(store, value) {
  if (!Array.isArray(value) || !value.length) return [];
  if (value.length > MAX_VALIDATORS) throw new Error(`outcome fixture supports at most ${MAX_VALIDATORS} validators`);
  const ids = new Set();
  return value.map((validator, index) => {
    if (!validator || typeof validator !== "object" || Array.isArray(validator)) {
      throw new Error(`validator ${index + 1} must be an object`);
    }
    const kind = requiredText(validator.kind, `validator ${index + 1} kind`, 80);
    if (!OUTCOME_EVALUATION_CONTRACT.validatorKinds.includes(kind)) {
      throw new Error(`unsupported outcome validator kind: ${kind}`);
    }
    const id = optionalText(validator.id, 80) ?? `${kind}_${index + 1}`;
    if (ids.has(id)) throw new Error(`outcome validator ids must be unique: ${id}`);
    ids.add(id);
    if (kind === "trace_event") {
      const normalized = {
        id,
        kind,
        eventType: requiredText(validator.eventType, `${id} eventType`, 160),
        minimumCount: boundedInteger(validator.minimumCount, 1, 0, 10_000, `${id} minimumCount`),
        maximumCount: optionalBoundedInteger(validator.maximumCount, 0, 10_000, `${id} maximumCount`),
      };
      if (normalized.maximumCount !== null && normalized.maximumCount < normalized.minimumCount) {
        throw new Error(`${id} maximumCount must be greater than or equal to minimumCount`);
      }
      return normalized;
    }
    if (kind === "completion_status") {
      return {
        id,
        kind,
        eventType: optionalText(validator.eventType, 160) ?? "agent.completed",
        allowedStatuses: normalizedStringArray(validator.allowedStatuses, `${id} allowedStatuses`, 16),
      };
    }
    if (kind === "workspace_file") {
      const assertion = optionalText(validator.assertion, 40) ?? "exists";
      if (!new Set(["exists", "contains"]).has(assertion)) {
        throw new Error(`${id} workspace_file assertion must be exists or contains`);
      }
      const normalized = {
        id,
        kind,
        path: normalizeWorkspaceRelativePath(store, validator.path, id),
        assertion,
      };
      if (assertion === "contains") normalized.text = requiredText(validator.text, `${id} text`, 1_000);
      return normalized;
    }
    if (kind === "json_file") {
      const expectedValues = validator.expectedValues === undefined ? {} : plainObject(validator.expectedValues, `${id} expectedValues`);
      return {
        id,
        kind,
        path: normalizeWorkspaceRelativePath(store, validator.path, id),
        requiredKeys: optionalStringArray(validator.requiredKeys, `${id} requiredKeys`, 32),
        expectedValues,
      };
    }
    if (kind === "fleet_status") {
      return { id, kind, allowedStatuses: normalizedStringArray(validator.allowedStatuses, `${id} allowedStatuses`, 16) };
    }
    return {
      id,
      kind,
      minimumCompleted: boundedInteger(validator.minimumCompleted, 0, 0, 100, `${id} minimumCompleted`),
      maximumFailed: optionalBoundedInteger(validator.maximumFailed, 0, 100, `${id} maximumFailed`),
      maximumCancelled: optionalBoundedInteger(validator.maximumCancelled, 0, 100, `${id} maximumCancelled`),
    };
  });
}

function normalizeSafety(value) {
  const source = value === undefined ? {} : plainObject(value, "safety");
  const maxRiskLevel = optionalText(source.maxRiskLevel, 20) ?? "high";
  if (!Object.hasOwn(RISK_RANK, maxRiskLevel)) {
    throw new Error("safety maxRiskLevel must be low, medium, high, or critical");
  }
  return {
    denyPolicyDecision: source.denyPolicyDecision !== false,
    maxRiskLevel,
    forbiddenEventTypes: optionalStringArray(source.forbiddenEventTypes, "safety forbiddenEventTypes", 32),
  };
}

function runValidator(store, validator, context) {
  if (validator.kind === "trace_event") {
    const actual = context.events.filter((event) => event.type === validator.eventType).length;
    const minimumPassed = actual >= validator.minimumCount;
    const maximumPassed = validator.maximumCount === null || actual <= validator.maximumCount;
    return minimumPassed && maximumPassed
      ? pass(validator.id, `Observed ${actual} ${validator.eventType} event(s).`)
      : fail(validator.id, `Observed ${actual} ${validator.eventType} event(s), outside fixture bounds.`, { expected: bounds(validator), actual });
  }
  if (validator.kind === "completion_status") {
    const event = lastEvent(context.events, validator.eventType);
    const actual = event?.payload?.status ?? null;
    return validator.allowedStatuses.includes(actual)
      ? pass(validator.id, `Completion status ${actual} is allowed.`)
      : fail(validator.id, `Completion status is not allowed.`, { expected: validator.allowedStatuses, actual });
  }
  if (validator.kind === "workspace_file") return checkWorkspaceFile(store, validator);
  if (validator.kind === "json_file") return checkJsonFile(store, validator);
  if (validator.kind === "fleet_status") {
    const actual = context.fleet?.status ?? null;
    return validator.allowedStatuses.includes(actual)
      ? pass(validator.id, `Fleet status ${actual} is allowed.`)
      : fail(validator.id, "Fleet status is not allowed or Fleet evidence was not supplied.", { expected: validator.allowedStatuses, actual });
  }
  return checkFleetCandidates(validator, context.fleet);
}

function checkWorkspaceFile(store, validator) {
  const file = resolveWorkspaceFile(store, validator.path);
  if (!file.ok) {
    return fail(validator.id, `Expected workspace file is missing: ${validator.path}.`);
  }
  if (validator.assertion === "exists") return pass(validator.id, `Workspace file exists: ${validator.path}.`);
  const content = fs.readFileSync(file.path, "utf8");
  return content.includes(validator.text)
    ? pass(validator.id, `Workspace file contains the declared assertion text: ${validator.path}.`)
    : fail(validator.id, `Workspace file did not contain the declared assertion text: ${validator.path}.`);
}

function checkJsonFile(store, validator) {
  const file = resolveWorkspaceFile(store, validator.path);
  if (!file.ok) {
    return fail(validator.id, `Expected JSON workspace file is missing: ${validator.path}.`);
  }
  let value;
  try {
    value = JSON.parse(fs.readFileSync(file.path, "utf8"));
  } catch {
    return fail(validator.id, `Workspace file is not valid JSON: ${validator.path}.`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fail(validator.id, `JSON workspace file must contain an object: ${validator.path}.`);
  }
  const missingKeys = validator.requiredKeys.filter((key) => !Object.hasOwn(value, key));
  const mismatchedPaths = Object.entries(validator.expectedValues)
    .filter(([key, expected]) => !deepEqual(readPath(value, key), expected))
    .map(([key]) => key);
  return !missingKeys.length && !mismatchedPaths.length
    ? pass(validator.id, `JSON workspace file satisfies declared structure: ${validator.path}.`)
    : fail(validator.id, `JSON workspace file did not satisfy declared structure: ${validator.path}.`, {
      missingKeys,
      mismatchedPaths,
    });
}

function checkFleetCandidates(validator, fleet) {
  const units = fleet?.units ?? [];
  const completed = units.filter((unit) => unit.status === "completed").length;
  const failed = units.filter((unit) => new Set(["failed", "preparation_failed", "approval_failed"]).has(unit.status)).length;
  const cancelled = units.filter((unit) => unit.status === "cancelled").length;
  const passed = units.length > 0
    && completed >= validator.minimumCompleted
    && (validator.maximumFailed === null || failed <= validator.maximumFailed)
    && (validator.maximumCancelled === null || cancelled <= validator.maximumCancelled);
  return passed
    ? pass(validator.id, "Fleet candidate counts satisfy fixture bounds.")
    : fail(validator.id, "Fleet candidate counts are outside fixture bounds or Fleet evidence was not supplied.", {
      expected: {
        minimumCompleted: validator.minimumCompleted,
        maximumFailed: validator.maximumFailed,
        maximumCancelled: validator.maximumCancelled,
      },
      actual: { total: units.length, completed, failed, cancelled },
    });
}

function runSafetyChecks(events, safety) {
  const checks = [];
  const policyDecisions = events
    .filter((event) => event.type === "tool.policy")
    .map((event) => event.payload?.decision)
    .filter(Boolean);
  if (safety.denyPolicyDecision && policyDecisions.some((decision) => decision.decision === "deny")) {
    checks.push(fail("safety_policy_deny", "Trace contains a denied policy decision.", { veto: true }));
  } else {
    checks.push(pass("safety_policy_deny", "No policy-deny veto was triggered."));
  }
  const overRisk = policyDecisions.filter((decision) => (RISK_RANK[decision.riskLevel] ?? 0) > RISK_RANK[safety.maxRiskLevel]);
  if (overRisk.length) {
    checks.push(fail("safety_risk_level", `Trace exceeded maximum allowed risk level ${safety.maxRiskLevel}.`, { veto: true }));
  } else {
    checks.push(pass("safety_risk_level", `Trace did not exceed maximum allowed risk level ${safety.maxRiskLevel}.`));
  }
  const forbidden = safety.forbiddenEventTypes.filter((type) => events.some((event) => event.type === type));
  if (forbidden.length) {
    checks.push(fail("safety_forbidden_event", "Trace contains a fixture-forbidden event type.", { veto: true, forbiddenEventTypes: forbidden }));
  } else {
    checks.push(pass("safety_forbidden_event", "No fixture-forbidden event types were observed."));
  }
  return checks;
}

function deriveResultStatus(events, checks) {
  if (!events.length) return "invalid";
  return checks.some((check) => check.status === "failed") ? "failed" : "passed";
}

function summarizeChecks(checks, { durationMs, usage }) {
  const failed = checks.filter((check) => check.status === "failed");
  return {
    checkCount: checks.length,
    passedCount: checks.filter((check) => check.status === "passed").length,
    failedCount: failed.length,
    safetyVetoCount: failed.filter((check) => check.veto).length,
    durationMs,
    usage,
  };
}

function collectUsage(events) {
  const usageItems = events
    .map((event) => event.payload?.usage)
    .filter((usage) => usage && typeof usage === "object" && !Array.isArray(usage));
  if (!usageItems.length) return { status: "not_available", reportedEventCount: 0, tokenCount: null };
  const tokenCount = usageItems.reduce((sum, usage) => sum + numericUsage(usage), 0);
  return { status: "reported", reportedEventCount: usageItems.length, tokenCount };
}

function numericUsage(usage) {
  const total = [usage.total_tokens, usage.totalTokens].find((value) => Number.isFinite(value));
  if (total !== undefined) return total;
  return [usage.input_tokens, usage.output_tokens, usage.inputTokens, usage.outputTokens]
    .filter((value) => Number.isFinite(value))
    .reduce((sum, value) => sum + value, 0);
}

function traceDurationMs(events) {
  if (events.length < 2) return 0;
  const first = Date.parse(events[0].createdAt);
  const last = Date.parse(events.at(-1).createdAt);
  return Number.isFinite(first) && Number.isFinite(last) && last >= first ? last - first : null;
}

function summarizeResultItems(items) {
  return {
    total: items.length,
    passedCount: items.filter((item) => item.status === "passed").length,
    failedCount: items.filter((item) => item.status === "failed").length,
    invalidCount: items.filter((item) => item.status === "invalid").length,
    safetyVetoCount: items.reduce((sum, item) => sum + (item.safetyVetoCount ?? 0), 0),
  };
}

function fixtureListItem(fixture) {
  return {
    id: fixture.id,
    name: fixture.name,
    description: fixture.description,
    createdAt: fixture.createdAt,
    fixtureFingerprint: fixture.fixtureFingerprint,
    validatorCount: fixture.validators.length,
  };
}

function resultListItem(result) {
  return {
    id: result.id,
    fixtureId: result.fixtureId,
    fixtureFingerprint: result.fixtureFingerprint,
    traceId: result.traceId,
    fleetRunId: result.fleetRunId,
    status: result.status,
    createdAt: result.createdAt,
    durationMs: result.summary?.durationMs ?? null,
    safetyVetoCount: result.summary?.safetyVetoCount ?? 0,
  };
}

function fixtureIndexItem(fixture) {
  return {
    id: fixture.id,
    name: fixture.name,
    createdAt: fixture.createdAt,
    fixtureFingerprint: fixture.fixtureFingerprint,
    validatorCount: fixture.validators.length,
  };
}

function outcomeResultIndexItem(result) {
  return {
    id: result.id,
    fixtureId: result.fixtureId,
    fixtureFingerprint: result.fixtureFingerprint,
    traceId: result.traceId,
    fleetRunId: result.fleetRunId,
    status: result.status,
    createdAt: result.createdAt,
    durationMs: result.summary.durationMs,
    safetyVetoCount: result.summary.safetyVetoCount,
  };
}

function normalizeWorkspaceRelativePath(store, value, label) {
  const relativePath = requiredText(value, `${label} path`, 500).replace(/\\/g, "/");
  if (path.isAbsolute(relativePath) || relativePath.split("/").includes("..")) {
    throw new Error(`${label} path must stay inside the workspace`);
  }
  const segments = relativePath.split("/");
  if (segments.some((segment) => new Set([".git", ".spruceagent", "node_modules"]).has(segment))) {
    throw new Error(`${label} path cannot inspect protected workspace directories`);
  }
  const root = path.resolve(store.cwd);
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${label} path must stay inside the workspace`);
  }
  return relativePath;
}

function resolveWorkspaceFile(store, relativePath) {
  const workspaceRoot = path.resolve(store.cwd);
  const filePath = path.resolve(workspaceRoot, relativePath);
  if (filePath === workspaceRoot || !filePath.startsWith(`${workspaceRoot}${path.sep}`)) return { ok: false, path: filePath };
  try {
    if (fs.lstatSync(workspaceRoot).isSymbolicLink()) return { ok: false, path: filePath };
    const segments = relativePath.split(/[\\/]+/).filter(Boolean);
    let current = workspaceRoot;
    for (let index = 0; index < segments.length; index += 1) {
      current = path.join(current, segments[index]);
      const entry = fs.lstatSync(current);
      if (entry.isSymbolicLink()) return { ok: false, path: filePath };
      if (index < segments.length - 1 && !entry.isDirectory()) return { ok: false, path: filePath };
      if (index === segments.length - 1 && !entry.isFile()) return { ok: false, path: filePath };
    }
    return { ok: true, path: filePath };
  } catch {
    return { ok: false, path: filePath };
  }
}

function bounds(validator) {
  return {
    minimumCount: validator.minimumCount,
    maximumCount: validator.maximumCount,
  };
}

function lastEvent(events, type) {
  return [...events].reverse().find((event) => event.type === type);
}

function readPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    return current[key];
  }, value);
}

function deepEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function plainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return structuredClone(value);
}

function normalizedStringArray(value, label, maximum) {
  const items = optionalStringArray(value, label, maximum);
  if (!items.length) throw new Error(`${label} must contain at least one value`);
  return items;
}

function optionalStringArray(value, label, maximum) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > maximum) throw new Error(`${label} must be an array with at most ${maximum} values`);
  return [...new Set(value.map((item) => requiredText(item, label, 160)))];
}

function requiredText(value, label, maximum) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required`);
  if (text.length > maximum) throw new Error(`${label} must be at most ${maximum} characters`);
  return text;
}

function optionalText(value, maximum) {
  if (value === undefined || value === null || value === "") return null;
  return requiredText(value, "text", maximum);
}

function boundedInteger(value, fallback, minimum, maximum, label) {
  const number = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
  return number;
}

function optionalBoundedInteger(value, minimum, maximum, label) {
  if (value === undefined || value === null || value === "") return null;
  return boundedInteger(value, 0, minimum, maximum, label);
}

function uniqueIndexItems(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pass(code, message) {
  return { id: code, status: "passed", message, veto: false };
}

function fail(code, message, details = {}) {
  return { id: code, status: "failed", message, veto: Boolean(details.veto), ...details };
}

function round(value) {
  return Math.round(value * 10_000) / 10_000;
}

function outcomeFixturePath(store, fixtureId) {
  return storeItemPath(store, "outcome-fixtures", fixtureId);
}

function outcomeResultPath(store, resultId) {
  return storeItemPath(store, "outcome-results", resultId);
}

function outcomeFixtureIndexPath(store) {
  return path.join(store.root, "outcome-fixture-index.jsonl");
}

function outcomeResultIndexPath(store) {
  return path.join(store.root, "outcome-result-index.jsonl");
}
