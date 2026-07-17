import fs from "node:fs";
import path from "node:path";
import { getAgentAdapter } from "./agent-adapters.js";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export const AGENT_TRIAL_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.agent-trials",
  sourceKind: "supplied_execution_observation",
  outputKind: "reported_empirical_agent_trial_ledger",
  statuses: ["passed", "failed"],
  safetyBoundary: [
    "Agent Trial v0 records supplied execution observations and never launches an agent or model.",
    "A trial passes only when the process exits successfully, the expected workspace effect is observed, acceptance passes, and policy did not block execution.",
    "Agent self-reports and a zero process exit code are never sufficient evidence by themselves.",
    "Prompts, free-text notes, terminal logs, source diffs, credentials, and environment values are not stored.",
    "Trial statistics are descriptive evidence only and never select a winning agent automatically.",
  ],
});

const ACCEPTANCE_STATUSES = new Set(["passed", "failed", "not_run"]);
const POLICY_STATUSES = new Set(["allowed", "blocked"]);

export function getAgentTrialContract() {
  return AGENT_TRIAL_CONTRACT;
}

export function recordAgentTrial(store, input = {}) {
  const adapter = getAgentAdapter(input.adapterId);
  const processExitCode = normalizeExitCode(input.processExitCode, "processExitCode");
  const changedFileCount = normalizeCount(input.changedFileCount, "changedFileCount");
  const durationMs = normalizeCount(input.durationMs, "durationMs");
  const acceptanceStatus = String(input.acceptanceStatus ?? "not_run");
  const policyStatus = String(input.policyStatus ?? "allowed");
  if (!ACCEPTANCE_STATUSES.has(acceptanceStatus)) {
    throw new Error("acceptanceStatus must be passed, failed, or not_run");
  }
  if (!POLICY_STATUSES.has(policyStatus)) {
    throw new Error("policyStatus must be allowed or blocked");
  }
  const acceptanceExitCode = normalizeExitCode(input.acceptanceExitCode, "acceptanceExitCode", true);
  assertAcceptanceConsistency(acceptanceStatus, acceptanceExitCode);

  const expectedWorkspaceChange = input.expectedWorkspaceChange !== false;
  const checks = {
    processCompleted: processExitCode === 0,
    workspaceEffectObserved: !expectedWorkspaceChange || changedFileCount > 0,
    acceptancePassed: acceptanceStatus === "passed",
    policyAllowed: policyStatus === "allowed",
  };
  const failureCodes = deriveFailureCodes(checks, input.failureCode);
  const createdAt = nowIso();
  const trial = {
    version: AGENT_TRIAL_CONTRACT.version,
    interface: AGENT_TRIAL_CONTRACT.interface,
    id: createId("agent_trial"),
    createdAt,
    createdBy: input.actor ?? "local-user",
    adapter: {
      id: adapter.id,
      name: adapter.name,
      provider: adapter.provider,
      kind: adapter.kind,
    },
    taskProfile: {
      taskId: normalizeOptionalText(input.taskId, 120),
      category: normalizeOptionalText(input.category, 80) ?? "unspecified",
      expectedWorkspaceChange,
    },
    provenance: {
      kind: "supplied_observation",
      attestedByLauncher: false,
    },
    observation: {
      source: normalizeOptionalText(input.source, 80) ?? "manual_observation",
      processExitCode,
      durationMs,
      changedFileCount,
      acceptance: {
        status: acceptanceStatus,
        exitCode: acceptanceExitCode,
      },
      policy: { status: policyStatus },
    },
    checks,
    status: Object.values(checks).every(Boolean) ? "passed" : "failed",
    failureCodes,
    evidenceLevel: Object.values(checks).every(Boolean) ? "reported_execution_diff_and_acceptance" : "diagnostic_observation",
    limits: AGENT_TRIAL_CONTRACT.safetyBoundary,
  };

  writeJson(trialPath(store, trial.id), trial);
  appendJsonl(trialIndexPath(store), trialListItem(trial));
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type: "agent_trial.recorded",
    trialId: trial.id,
    adapterId: adapter.id,
    status: trial.status,
    failureCodes: trial.failureCodes,
    createdAt,
    actor: trial.createdBy,
  });
  return trial;
}

export function getAgentTrial(store, trialId) {
  if (!trialId) throw new Error("trialId is required");
  const filePath = trialPath(store, trialId);
  if (!fs.existsSync(filePath)) throw new Error(`agent trial not found: ${trialId}`);
  return readJson(filePath);
}

export function listAgentTrials(store, options = {}) {
  const trials = readJsonl(trialIndexPath(store))
    .filter((item) => !options.adapterId || item.adapterId === options.adapterId)
    .filter((item) => !options.status || item.status === options.status)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  return {
    version: AGENT_TRIAL_CONTRACT.version,
    createdAt: nowIso(),
    status: trials.length ? "available" : "empty",
    summary: summarizeAgentTrials(trials),
    items: trials,
    limits: AGENT_TRIAL_CONTRACT.safetyBoundary,
  };
}

export function summarizeAgentTrials(items) {
  const trials = Array.isArray(items) ? items : [];
  const adapterIds = [...new Set(trials.map((item) => item.adapterId))].sort();
  return {
    total: trials.length,
    passedCount: trials.filter((item) => item.status === "passed").length,
    failedCount: trials.filter((item) => item.status === "failed").length,
    byAdapter: Object.fromEntries(adapterIds.map((adapterId) => {
      const adapterTrials = trials.filter((item) => item.adapterId === adapterId);
      const passedCount = adapterTrials.filter((item) => item.status === "passed").length;
      return [adapterId, {
        total: adapterTrials.length,
        passedCount,
        failedCount: adapterTrials.length - passedCount,
        passRate: adapterTrials.length ? passedCount / adapterTrials.length : null,
        medianDurationMs: median(adapterTrials.map((item) => item.durationMs).filter(Number.isFinite)),
        latestStatus: adapterTrials[0]?.status ?? null,
        latestTrialId: adapterTrials[0]?.id ?? null,
      }];
    })),
  };
}

function deriveFailureCodes(checks, suppliedCode) {
  const codes = [];
  if (!checks.processCompleted) codes.push("process_not_completed");
  if (!checks.workspaceEffectObserved) codes.push("workspace_effect_missing");
  if (!checks.acceptancePassed) codes.push("acceptance_not_passed");
  if (!checks.policyAllowed) codes.push("policy_blocked");
  const normalized = normalizeOptionalText(suppliedCode, 80);
  if (normalized) codes.push(normalized.replace(/[^a-zA-Z0-9._-]+/g, "_"));
  return [...new Set(codes)];
}

function normalizeCount(value, name) {
  const number = Number(value ?? 0);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error(`${name} must be a non-negative integer`);
  return number;
}

function normalizeExitCode(value, name, optional = false) {
  if ((value === undefined || value === null || value === "") && optional) return null;
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error(`${name} must be an integer`);
  return number;
}

function normalizeOptionalText(value, limit) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, limit) : null;
}

function assertAcceptanceConsistency(status, exitCode) {
  if (status === "passed" && exitCode !== 0) {
    throw new Error("acceptanceExitCode must be 0 when acceptanceStatus is passed");
  }
  if (status === "failed" && exitCode === 0) {
    throw new Error("acceptanceExitCode cannot be 0 when acceptanceStatus is failed");
  }
  if (status === "not_run" && exitCode !== null) {
    throw new Error("acceptanceExitCode must be omitted when acceptanceStatus is not_run");
  }
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function trialListItem(trial) {
  return {
    id: trial.id,
    createdAt: trial.createdAt,
    adapterId: trial.adapter.id,
    provider: trial.adapter.provider,
    category: trial.taskProfile.category,
    status: trial.status,
    evidenceLevel: trial.evidenceLevel,
    failureCodes: trial.failureCodes,
    processExitCode: trial.observation.processExitCode,
    acceptanceStatus: trial.observation.acceptance.status,
    changedFileCount: trial.observation.changedFileCount,
    durationMs: trial.observation.durationMs,
  };
}

function trialPath(store, trialId) {
  return path.join(store.root, "agent-trials", `${trialId}.json`);
}

function trialIndexPath(store) {
  return path.join(store.root, "agent-trial-index.jsonl");
}
