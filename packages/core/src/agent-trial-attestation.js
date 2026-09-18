import crypto from "node:crypto";
import { exec, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { consumeApprovalTicket, createApprovalTicket, getApprovalTicket } from "./approvals.js";
import { getAgentLaunch } from "./agent-launcher.js";
import { recordLauncherAttestedTrial } from "./agent-trials.js";
import { nowIso } from "./id.js";
import { commandMatchesGitMutation } from "./forbidden-commands.js";
import { assertLaunchWorkspaceCurrent } from "./execution-evidence.js";
import { auditPolicyDecision, evaluatePolicy } from "./policy.js";
import { appendJsonl } from "./storage.js";
import { appendTraceEvent } from "./trace.js";

const execAsync = promisify(exec);

export const AGENT_TRIAL_ATTESTATION_CONTRACT = Object.freeze({
  version: "0.2.0",
  interface: "spruceagent.agent-trial-attestation",
  sourceKind: "completed_agent_launch_and_independent_acceptance",
  outputKind: "launcher_attested_agent_trial",
  safetyBoundary: [
    "Attestation v0 accepts completed Agent Launch records from Git workspaces only.",
    "The acceptance command requires its own exact TrustKernel approval ticket.",
    "An approved attestation may resume with its approval id and launch id; the acceptance command is recovered only from that exact server-side ticket.",
    "Git mutation commands are rejected before approval or execution.",
    "Acceptance output and command text are not stored in the Trial; only hashes, byte counts, exit status, and bounded timing are retained.",
    "The workspace fingerprint must remain stable during acceptance for the Trial to pass.",
    "Launcher attestation is a local execution-chain claim, not a cryptographic signature or tamper-proof ledger.",
    "Attestation never commits, pushes, merges, rebases, resets, cleans, or promotes changes.",
    "Retired Agent Workspaces cannot be attested; current workspace status is re-checked from the launch record.",
  ],
});

const MAX_UNTRACKED_FILES = 200;
const MAX_HASHED_FILE_BYTES = 16 * 1024 * 1024;

export function getAgentTrialAttestationContract() {
  return AGENT_TRIAL_ATTESTATION_CONTRACT;
}

export async function attestAgentLaunchTrial(store, input = {}) {
  const launchId = String(input.launchId ?? "").trim();
  if (!launchId) throw new Error("launchId is required");
  const launch = getAgentLaunch(store, launchId);
  if (launch.status !== "completed" || launch.exitCode !== 0) {
    throw new Error(`agent launch must be completed successfully before attestation: ${launchId}`);
  }
  if (!launch.git?.before?.insideWorkTree || !launch.git?.after?.insideWorkTree) {
    throw new Error(`agent launch requires Git evidence before attestation: ${launchId}`);
  }
  assertLaunchWorkspaceCurrent(store, launch);

  let ticket = input.approvalId ? getApprovalTicket(store, input.approvalId) : null;
  // A queued continuation deliberately needs only the approval id. The exact
  // command remains in the server-side capability ticket instead of being
  // replayed through the Workbench after a refresh.
  const command = String(input.acceptanceCommand ?? ticket?.input?.command ?? "").trim();
  if (!command) throw new Error("acceptanceCommand is required");
  assertAllowedAcceptanceCommand(command);
  const cwd = assertWorkspacePath(store, launch.workspacePath);
  const actor = input.actor ?? "local-user";
  const trustMode = input.trustMode ?? "approve";
  const decision = evaluatePolicy({
    toolName: "shell.execute",
    trustMode,
    input: { command, cwd },
  });
  auditPolicyDecision(store, decision);
  appendTraceEvent(store, launch.traceId, "agent.trial.attestation.policy", {
    launchId,
    decision,
    commandSha256: sha256(command),
  });

  if (decision.decision === "deny") {
    return {
      version: AGENT_TRIAL_ATTESTATION_CONTRACT.version,
      interface: AGENT_TRIAL_ATTESTATION_CONTRACT.interface,
      status: "blocked",
      executionMode: "policy_denied",
      launchId,
      decision,
      trial: null,
      limits: AGENT_TRIAL_ATTESTATION_CONTRACT.safetyBoundary,
    };
  }

  if (!input.approvalId) {
    const approval = createApprovalTicket(store, {
      toolName: "shell.execute",
      input: { command, cwd },
      decision,
      traceId: launch.traceId,
      requester: actor,
      reason: "Independent Agent Trial acceptance requires exact approval.",
      metadata: {
        kind: "agent_trial_attestation",
        launchId,
        workspaceId: launch.workspaceId,
      },
    });
    appendTraceEvent(store, launch.traceId, "agent.trial.attestation.requires_approval", {
      launchId,
      approvalId: approval.id,
      commandSha256: sha256(command),
    });
    return {
      version: AGENT_TRIAL_ATTESTATION_CONTRACT.version,
      interface: AGENT_TRIAL_ATTESTATION_CONTRACT.interface,
      status: "requires_approval",
      executionMode: "acceptance_approval_required",
      launchId,
      approval,
      trial: null,
      limits: AGENT_TRIAL_ATTESTATION_CONTRACT.safetyBoundary,
    };
  }

  ticket ??= getApprovalTicket(store, input.approvalId);
  assertApprovalMatchesAttestation(ticket, command, cwd, launchId);
  consumeApprovalTicket(store, ticket.id);

  const beforeAcceptance = readWorkspaceFingerprint(cwd);
  if (!beforeAcceptance.available) {
    throw new Error(`workspace fingerprint unavailable before acceptance: ${launchId}`);
  }
  const startedAt = nowIso();
  const execution = await runAcceptance(command, cwd, input);
  const finishedAt = nowIso();
  const afterAcceptance = readWorkspaceFingerprint(cwd);
  if (!afterAcceptance.available) {
    throw new Error(`workspace fingerprint unavailable after acceptance: ${launchId}`);
  }
  const workspaceStable = beforeAcceptance.sha256 === afterAcceptance.sha256;
  const baselineStatus = filterInternalStatus(launch.git.before.status ?? []);
  const finalStatus = filterInternalStatus(launch.git.after.status ?? []);
  const trial = recordLauncherAttestedTrial(store, {
    adapterId: launch.adapter.id,
    taskId: launch.id,
    category: input.category ?? "agent_launch_acceptance",
    source: "launcher_attestation",
    processExitCode: launch.exitCode,
    durationMs: launchDurationMs(launch),
    changedFileCount: finalStatus.length,
    expectedWorkspaceChange: input.expectedWorkspaceChange !== false,
    baselineWorkspaceClean: baselineStatus.length === 0,
    acceptanceStatus: execution.exitCode === 0 ? "passed" : "failed",
    acceptanceExitCode: execution.exitCode,
    acceptanceWorkspaceStable: workspaceStable,
    policyStatus: "allowed",
    failureCode: input.failureCode,
    actor,
    launchId,
    acceptanceEvidence: {
      commandSha256: sha256(command),
      stdoutSha256: sha256(execution.stdout),
      stderrSha256: sha256(execution.stderr),
      stdoutBytes: Buffer.byteLength(execution.stdout, "utf8"),
      stderrBytes: Buffer.byteLength(execution.stderr, "utf8"),
      startedAt,
      finishedAt,
      workspaceBeforeSha256: beforeAcceptance.sha256,
      workspaceAfterSha256: afterAcceptance.sha256,
      workspaceStable,
    },
  });

  appendTraceEvent(store, launch.traceId, "agent.trial.attestation.completed", {
    launchId,
    trialId: trial.id,
    status: trial.status,
    acceptanceExitCode: execution.exitCode,
    workspaceStable,
  });
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type: "agent_trial.attested",
    trialId: trial.id,
    launchId,
    status: trial.status,
    acceptanceExitCode: execution.exitCode,
    workspaceStable,
    createdAt: nowIso(),
    actor,
  });

  return {
    version: AGENT_TRIAL_ATTESTATION_CONTRACT.version,
    interface: AGENT_TRIAL_ATTESTATION_CONTRACT.interface,
    status: "completed",
    executionMode: "launcher_attested_acceptance",
    launchId,
    approvalId: ticket.id,
    acceptance: {
      exitCode: execution.exitCode,
      workspaceStable,
      stdoutBytes: Buffer.byteLength(execution.stdout, "utf8"),
      stderrBytes: Buffer.byteLength(execution.stderr, "utf8"),
    },
    trial,
    limits: AGENT_TRIAL_ATTESTATION_CONTRACT.safetyBoundary,
  };
}

function assertWorkspacePath(store, workspacePath) {
  const root = path.resolve(store.cwd);
  const resolved = path.resolve(workspacePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("agent launch workspace is outside the SpruceAgent project");
  }
  return resolved;
}

function assertAllowedAcceptanceCommand(command) {
  if (commandMatchesGitMutation(command)) {
    throw new Error("agent trial attestation blocks git mutation commands");
  }
}

function assertApprovalMatchesAttestation(ticket, command, cwd, launchId) {
  if (ticket.status !== "approved") throw new Error(`approval is not approved: ${ticket.id}`);
  if (ticket.toolName !== "shell.execute") throw new Error("approval tool mismatch for Agent Trial attestation");
  if (ticket.input?.command !== command || ticket.input?.cwd !== cwd) {
    throw new Error("approval input mismatch for Agent Trial attestation");
  }
  if (ticket.metadata?.kind !== "agent_trial_attestation" || ticket.metadata?.launchId !== launchId) {
    throw new Error("approval metadata mismatch for Agent Trial attestation");
  }
}

async function runAcceptance(command, cwd, input) {
  const timeout = boundedInteger(input.timeoutMs, 120000, 1000, 300000, "timeoutMs");
  const maxBuffer = boundedInteger(input.maxBuffer, 1024 * 1024, 64 * 1024, 4 * 1024 * 1024, "maxBuffer");
  try {
    const result = await execAsync(command, { cwd, timeout, maxBuffer, windowsHide: true });
    return { stdout: result.stdout ?? "", stderr: result.stderr ?? "", exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      exitCode: Number.isInteger(error.code) ? error.code : 1,
    };
  }
}

function boundedInteger(value, fallback, minimum, maximum, name) {
  const number = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return number;
}
function readWorkspaceFingerprint(cwd) {
  try {
    const status = filterInternalStatus(runGit(cwd, ["status", "--porcelain"]).split(/\r?\n/).filter(Boolean));
    const patch = runGit(cwd, ["diff", "HEAD", "--binary", "--no-ext-diff", "--", ".", ":(exclude).spruceagent/**"]);
    const untrackedOutput = runGit(cwd, ["ls-files", "--others", "--exclude-standard", "-z", "--", ".", ":(exclude).spruceagent/**"]);
    const untrackedPaths = untrackedOutput.split("\0").filter(Boolean);
    if (untrackedPaths.length > MAX_UNTRACKED_FILES) {
      return { available: false, sha256: null, status, reason: "too_many_untracked_files" };
    }
    const untracked = untrackedPaths.map((relativePath) => hashUntrackedFile(cwd, relativePath));
    if (untracked.some((item) => item.kind === "oversized")) {
      return { available: false, sha256: null, status, reason: "oversized_untracked_file" };
    }
    return {
      available: true,
      status,
      sha256: sha256(JSON.stringify({
        patchSha256: sha256(patch),
        untracked,
      })),
    };
  } catch {
    return { available: false, sha256: null, status: [], reason: "git_fingerprint_failed" };
  }
}

function hashUntrackedFile(cwd, relativePath) {
  const root = path.resolve(cwd);
  const filePath = path.resolve(cwd, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`)) throw new Error("untracked path escaped workspace");
  const stat = fs.lstatSync(filePath);
  if (stat.isSymbolicLink()) {
    const target = fs.readlinkSync(filePath);
    return { path: relativePath, kind: "symlink", bytes: Buffer.byteLength(target, "utf8"), sha256: sha256(target) };
  }
  if (!stat.isFile()) return { path: relativePath, kind: "non_file", bytes: 0, sha256: null };
  if (stat.size > MAX_HASHED_FILE_BYTES) {
    return { path: relativePath, kind: "oversized", bytes: stat.size, sha256: null };
  }
  return {
    path: relativePath,
    kind: "file",
    bytes: stat.size,
    sha256: sha256(fs.readFileSync(filePath)),
  };
}

function runGit(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 4 * 1024 * 1024,
  });
}

function filterInternalStatus(status) {
  return status.filter((line) => !line.replace(/\\/g, "/").includes(".spruceagent/"));
}

function launchDurationMs(launch) {
  const started = Date.parse(launch.startedAt);
  const finished = Date.parse(launch.finishedAt);
  if (!Number.isFinite(started) || !Number.isFinite(finished)) return 0;
  return Math.max(0, Math.round(finished - started));
}

function sha256(value) {
  return crypto.createHash("sha256").update(Buffer.isBuffer(value) ? value : String(value)).digest("hex");
}
