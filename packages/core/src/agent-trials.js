import fs from "node:fs";
import path from "node:path";
import { getAgentAdapter } from "./agent-adapters.js";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export const AGENT_TRIAL_CONTRACT = Object.freeze({
  version: "0.2.0",
  interface: "spruceagent.agent-trials",
  sourceKind: "supplied_or_launcher_attested_execution_observation",
  outputKind: "provenance_aware_empirical_agent_trial_ledger",
  statuses: ["passed", "failed"],
  safetyBoundary: [
    "Agent Trial v0 records supplied observations or evidence signed by the gated SpruceAgent Launcher attestation flow.",
    "A trial passes only when process, clean baseline, expected workspace effect, independent acceptance, acceptance workspace stability, and policy checks all pass.",
    "Agent self-reports and a zero process exit code are never sufficient evidence by themselves.",
    "Prompts, free-text notes, terminal logs, source diffs, credentials, and environment values are not stored.",
    "Launcher attestation is a local execution-chain claim, not a cryptographic signature or tamper-proof ledger.",
    "Trial statistics are descriptive evidence only and never select a winning agent automatically.",
  ],
});

const ACCEPTANCE_STATUSES = new Set(["passed", "failed", "not_run"]);
const POLICY_STATUSES = new Set(["allowed", "blocked"]);

export function getAgentTrialContract() {
  return AGENT_TRIAL_CONTRACT;
}

export function recordAgentTrial(store, input = {}) {
  return recordTrial(store, input, {
    kind: "supplied_observation",
    attestedByLauncher: false,
    launchId: null,
    acceptanceEvidence: null,
  });
}

export function recordLauncherAttestedTrial(store, input = {}) {
  const launchId = normalizeOptionalText(input.launchId, 160);
  if (!launchId) throw new Error("launchId is required for Launcher-attested Trial");
  return recordTrial(store, input, {
    kind: "launcher_attested",
    attestedByLauncher: true,
    launchId,
    acceptanceEvidence: normalizeAcceptanceEvidence(input.acceptanceEvidence),
  });
}

function recordTrial(store, input, provenance) {
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
  const baselineWorkspaceClean = input.baselineWorkspaceClean === true;
  const acceptanceWorkspaceStable = input.acceptanceWorkspaceStable === true;
  const checks = {
    processCompleted: processExitCode === 0,
    baselineWorkspaceClean,
    workspaceEffectObserved: !expectedWorkspaceChange || changedFileCount > 0,
    acceptancePassed: acceptanceStatus === "passed",
    acceptanceWorkspaceStable,
    policyAllowed: policyStatus === "allowed",
  };
  const passed = Object.values(checks).every(Boolean);
  const failureCodes = deriveFailureCodes(checks, input.failureCode, {
    baselineObserved: input.baselineWorkspaceClean !== undefined,
    acceptanceStabilityObserved: input.acceptanceWorkspaceStable !== undefined,
  });
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
      taskId: normalizeOptionalText(input.taskId, 160),
      category: normalizeOptionalText(input.category, 80) ?? "unspecified",
      expectedWorkspaceChange,
    },
    provenance,
    observation: {
      source: normalizeOptionalText(input.source, 80) ?? "manual_observation",
      processExitCode,
      durationMs,
      changedFileCount,
      acceptance: {
        status: acceptanceStatus,
        exitCode: acceptanceExitCode,
        workspaceStable: acceptanceWorkspaceStable,
      },
      policy: { status: policyStatus },
    },
    checks,
    status: passed ? "passed" : "failed",
    failureCodes,
    evidenceLevel: evidenceLevel(provenance, passed),
    limits: AGENT_TRIAL_CONTRACT.safetyBoundary,
  };

  writeJson(trialPath(store, trial.id), trial);
  appendJsonl(trialIndexPath(store), trialListItem(trial));
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type: provenance.attestedByLauncher ? "agent_trial.launcher_attested_recorded" : "agent_trial.recorded",
    trialId: trial.id,
    launchId: provenance.launchId,
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
    .map((item, appendIndex) => ({ item, appendIndex }))
    .filter(({ item }) => !options.adapterId || item.adapterId === options.adapterId)
    .filter(({ item }) => !options.status || item.status === options.status)
    .filter(({ item }) => options.attested === undefined || Boolean(item.attestedByLauncher) === Boolean(options.attested))
    // ISO timestamps have millisecond precision. Preserve append order when
    // two observations share that timestamp so a later failed attestation can
    // never be hidden behind an earlier passing one.
    .sort((left, right) => String(right.item.createdAt).localeCompare(String(left.item.createdAt)) || right.appendIndex - left.appendIndex)
    .map(({ item }) => item);
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
  const attestedTrials = trials.filter((item) => item.attestedByLauncher === true);
  return {
    total: trials.length,
    passedCount: trials.filter((item) => item.status === "passed").length,
    failedCount: trials.filter((item) => item.status === "failed").length,
    attestedCount: attestedTrials.length,
    suppliedCount: trials.length - attestedTrials.length,
    byAdapter: Object.fromEntries(adapterIds.map((adapterId) => {
      const adapterTrials = trials.filter((item) => item.adapterId === adapterId);
      const adapterAttestedTrials = adapterTrials.filter((item) => item.attestedByLauncher === true);
      const passedCount = adapterTrials.filter((item) => item.status === "passed").length;
      const latest = adapterTrials[0] ?? null;
      const latestAttested = adapterAttestedTrials[0] ?? null;
      const effective = latestAttested ?? latest;
      return [adapterId, {
        total: adapterTrials.length,
        passedCount,
        failedCount: adapterTrials.length - passedCount,
        passRate: adapterTrials.length ? passedCount / adapterTrials.length : null,
        medianDurationMs: median(adapterTrials.map((item) => item.durationMs).filter(Number.isFinite)),
        attestedCount: adapterAttestedTrials.length,
        latestStatus: latest?.status ?? null,
        latestTrialId: latest?.id ?? null,
        latestAttestedStatus: latestAttested?.status ?? null,
        latestAttestedTrialId: latestAttested?.id ?? null,
        effectiveOutcome: effective?.status ?? null,
        effectiveAttestation: latestAttested ? "launcher" : latest ? "supplied_observation" : "none",
        effectiveTrialId: effective?.id ?? null,
      }];
    })),
  };
}

function deriveFailureCodes(checks, suppliedCode, evidence = {}) {
  const codes = [];
  if (!checks.processCompleted) codes.push("process_not_completed");
  if (!checks.baselineWorkspaceClean) codes.push(evidence.baselineObserved ? "preexisting_workspace_changes" : "baseline_clean_not_verified");
  if (!checks.workspaceEffectObserved) codes.push("workspace_effect_missing");
  if (!checks.acceptancePassed) codes.push("acceptance_not_passed");
  if (!checks.acceptanceWorkspaceStable) codes.push(evidence.acceptanceStabilityObserved ? "acceptance_workspace_changed" : "acceptance_workspace_stability_not_verified");
  if (!checks.policyAllowed) codes.push("policy_blocked");
  const normalized = normalizeOptionalText(suppliedCode, 80);
  if (normalized) codes.push(normalized.replace(/[^a-zA-Z0-9._-]+/g, "_"));
  return [...new Set(codes)];
}

function normalizeAcceptanceEvidence(value) {
  if (!value || typeof value !== "object") throw new Error("acceptanceEvidence is required for Launcher-attested Trial");
  return {
    commandSha256: normalizeSha256(value.commandSha256, "commandSha256"),
    stdoutSha256: normalizeSha256(value.stdoutSha256, "stdoutSha256"),
    stderrSha256: normalizeSha256(value.stderrSha256, "stderrSha256"),
    stdoutBytes: normalizeCount(value.stdoutBytes, "stdoutBytes"),
    stderrBytes: normalizeCount(value.stderrBytes, "stderrBytes"),
    startedAt: normalizeOptionalText(value.startedAt, 40),
    finishedAt: normalizeOptionalText(value.finishedAt, 40),
    workspaceBeforeSha256: normalizeSha256(value.workspaceBeforeSha256, "workspaceBeforeSha256"),
    workspaceAfterSha256: normalizeSha256(value.workspaceAfterSha256, "workspaceAfterSha256"),
    workspaceStable: value.workspaceStable === true,
  };
}

function normalizeSha256(value, name) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(text)) throw new Error(`${name} must be a SHA-256 hex digest`);
  return text;
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

function evidenceLevel(provenance, passed) {
  if (provenance.attestedByLauncher) {
    return passed ? "launcher_attested_execution_diff_and_acceptance" : "launcher_attested_diagnostic";
  }
  return passed ? "reported_execution_diff_and_acceptance" : "diagnostic_observation";
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
    attestedByLauncher: trial.provenance.attestedByLauncher,
    launchId: trial.provenance.launchId,
    failureCodes: trial.failureCodes,
    processExitCode: trial.observation.processExitCode,
    acceptanceStatus: trial.observation.acceptance.status,
    acceptanceWorkspaceStable: trial.observation.acceptance.workspaceStable,
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
