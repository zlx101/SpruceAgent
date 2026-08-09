import { exec, execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { consumeApprovalTicket, createApprovalTicket, getApprovalTicket } from "./approvals.js";
import {
  buildExternalCliInvocation,
  executeExternalCliInvocation,
  publicExternalCliInvocation,
} from "./external-cli-launcher.js";
import { getAgentWorkspace } from "./agent-workspaces.js";
import { createId, nowIso } from "./id.js";
import { auditPolicyDecision, evaluatePolicy } from "./policy.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";
import { appendTraceEvent, startTrace } from "./trace.js";

const execAsync = promisify(exec);

export const AGENT_LAUNCHER_CONTRACT = Object.freeze({
  version: "0.2.0",
  interface: "spruceagent.agent-launcher",
  sourceKind: "isolated_agent_workspace",
  outputKind: "gated_agent_launch_record",
  executableAdaptersInV1: ["local-shell-agent", "codex-cli"],
  safetyBoundary: [
    "Agent Launcher v0 records and gates launches from prepared Agent Workspaces.",
    "Codex CLI v1 executes only through an internally generated, shell-free invocation in a prepared Git worktree.",
    "Other external coding CLI adapters remain preview-only.",
    "Only local-shell-agent can execute a user-supplied command.",
    "Commands flow through TrustKernel policy and approval tickets.",
    "Git commit, push, merge, rebase, reset, and worktree mutation are blocked in user-supplied local-shell commands.",
    "External-agent subprocess choices are controlled by worktree isolation, Codex sandboxing, prompt constraints, Git evidence, and mandatory review rather than per-command interception.",
    "Launcher records terminal logs, git status, and diff summaries, but never commits, pushes, merges, or approves changes.",
  ],
});

const FORBIDDEN_COMMAND_PATTERNS = [
  /\bgit\s+commit\b/i,
  /\bgit\s+push\b/i,
  /\bgit\s+merge\b/i,
  /\bgit\s+rebase\b/i,
  /\bgit\s+reset\b/i,
  /\bgit\s+worktree\b/i,
  /\bgh\s+pr\s+merge\b/i,
];

export function getAgentLauncherContract() {
  return AGENT_LAUNCHER_CONTRACT;
}

export async function launchAgentWorkspace(store, input = {}, runtime = {}) {
  const workspace = getAgentWorkspace(store, input.workspaceId);
  const executionTaskId = normalizeExecutionTaskId(input.executionTaskId);
  const launchId = createId("agent_launch");
  const createdAt = nowIso();
  const execute = input.execute === true;
  const trace = startTrace(store, {
    goal: `Launch ${workspace.adapter.name}: ${workspace.goal}`,
    actor: input.actor ?? "local-user",
    channel: input.channel ?? "agent-launcher",
    trustMode: input.trustMode ?? "approve",
    metadata: {
      kind: "agent.launch",
      launchId,
      workspaceId: workspace.id,
      adapterId: workspace.adapter.id,
      executionTaskId,
    },
  });

  appendTraceEvent(store, trace.id, "agent.launch.started", {
    launchId,
    workspaceId: workspace.id,
    adapter: workspace.adapter,
    execute,
  });

  if (!execute) {
    const record = buildLaunchRecord({
      launchId,
      createdAt,
      status: "planned",
      executionMode: "preview_only",
      workspace,
      traceId: trace.id,
      executionTaskId,
      command: plannedCommand(workspace, input),
      notes: [
        "Launch was planned only.",
        "No external command was executed.",
      ],
    });
    appendTraceEvent(store, trace.id, "agent.launch.planned", recordSummary(record));
    persistLaunch(store, record);
    return record;
  }

  if (!AGENT_LAUNCHER_CONTRACT.executableAdaptersInV1.includes(workspace.adapter.id)) {
    const record = buildLaunchRecord({
      launchId,
      createdAt,
      status: "blocked",
      executionMode: "external_cli_disabled",
      workspace,
      traceId: trace.id,
      executionTaskId,
      command: plannedCommand(workspace, input),
      notes: [
        `${workspace.adapter.name} execution is not enabled in External CLI Launcher v1.`,
        "Prepare workspaces and inspect launch previews until its command contract is independently verified.",
      ],
    });
    appendTraceEvent(store, trace.id, "agent.launch.blocked", recordSummary(record));
    persistLaunch(store, record);
    return record;
  }

  const externalInvocation = workspace.adapter.id === "codex-cli"
    ? buildExternalCliInvocation(workspace, input, runtime.externalCli ?? {})
    : null;
  const command = externalInvocation
    ? externalInvocation.displayCommand
    : String(input.command ?? "").trim();
  if (!command) throw new Error("command is required when executing local-shell-agent");
  if (!externalInvocation) assertAllowedLauncherCommand(command);
  const approvalInput = externalInvocation
    ? {
        command,
        cwd: workspace.workspacePath,
        adapterId: workspace.adapter.id,
        invocation: publicExternalCliInvocation(externalInvocation),
      }
    : { command, cwd: workspace.workspacePath };

  const decision = evaluatePolicy({
    toolName: "shell.execute",
    trustMode: input.trustMode ?? "approve",
    input: approvalInput,
  });
  auditPolicyDecision(store, decision);
  appendTraceEvent(store, trace.id, "agent.launch.policy", {
    launchId,
    command,
    invocation: externalInvocation ? publicExternalCliInvocation(externalInvocation) : null,
    decision,
  });

  if (decision.decision === "deny") {
    const record = buildLaunchRecord({
      launchId,
      createdAt,
      status: "blocked",
      executionMode: "policy_denied",
      workspace,
      traceId: trace.id,
      executionTaskId,
      command,
      invocation: externalInvocation ? publicExternalCliInvocation(externalInvocation) : null,
      policyDecision: decision,
      notes: ["TrustKernel denied the launch command."],
    });
    appendTraceEvent(store, trace.id, "agent.launch.blocked", recordSummary(record));
    persistLaunch(store, record);
    return record;
  }

  if (decision.decision === "requires_approval" && !input.approvalId) {
    const approval = createApprovalTicket(store, {
      toolName: "shell.execute",
      input: approvalInput,
      decision,
      traceId: trace.id,
      executionTaskId,
      requester: input.actor ?? "local-user",
      reason: "Agent Launcher invocation requires approval before execution.",
      metadata: {
        launchId,
        workspaceId: workspace.id,
      },
    });
    appendTraceEvent(store, trace.id, "approval.created", {
      approvalId: approval.id,
      launchId,
      toolName: "shell.execute",
      riskLevel: decision.riskLevel,
    });
    const record = buildLaunchRecord({
      launchId,
      createdAt,
      status: "requires_approval",
      executionMode: "approval_required",
      workspace,
      traceId: trace.id,
      executionTaskId,
      command,
      invocation: externalInvocation ? publicExternalCliInvocation(externalInvocation) : null,
      policyDecision: decision,
      approval,
      notes: ["Approval ticket created. Re-run with approvalId after approval."],
    });
    appendTraceEvent(store, trace.id, "agent.launch.requires_approval", recordSummary(record));
    persistLaunch(store, record);
    return record;
  }

  if (input.approvalId) {
    const ticket = getApprovalTicket(store, input.approvalId);
    assertApprovalMatchesLaunch(ticket, approvalInput);
    consumeApprovalTicket(store, input.approvalId);
  }

  const startedAt = nowIso();
  const beforeGit = readGitSnapshot(workspace.workspacePath);
  const execution = externalInvocation
    ? {
        ...await executeExternalCliInvocation(externalInvocation, input, runtime.externalCli ?? {}),
        finishedAt: nowIso(),
      }
    : await runCommand(command, workspace.workspacePath, input);
  const afterGit = readGitSnapshot(workspace.workspacePath);
  const terminalLog = writeTerminalLog(store, launchId, {
    command,
    cwd: workspace.workspacePath,
    startedAt,
    finishedAt: execution.finishedAt,
    stdout: execution.stdout,
    stderr: execution.stderr,
    exitCode: execution.exitCode,
    terminationReason: execution.terminationReason,
    outputSummary: execution.outputSummary,
  });
  const record = buildLaunchRecord({
    launchId,
    createdAt,
    status: execution.exitCode === 0 ? "completed" : "failed",
    executionMode: externalInvocation ? "external_cli" : "local_shell",
    workspace,
    traceId: trace.id,
    executionTaskId,
    command,
    policyDecision: decision,
    startedAt,
    finishedAt: execution.finishedAt,
    exitCode: execution.exitCode,
    invocation: externalInvocation ? publicExternalCliInvocation(externalInvocation) : null,
    outputSummary: execution.outputSummary ?? null,
    terminationReason: execution.terminationReason ?? "process_exit",
    terminalLog,
    git: {
      before: beforeGit,
      after: afterGit,
      changed: afterGit.status.length > 0,
    },
    notes: [
      externalInvocation
        ? "Executed codex-cli through the shell-free External CLI Launcher v1 contract."
        : "Executed local-shell-agent command through Agent Launcher.",
      "Review required before any merge or promotion.",
    ],
  });
  appendTraceEvent(store, trace.id, "agent.launch.completed", recordSummary(record));
  persistLaunch(store, record);
  return record;
}

export function listAgentLaunches(store, options = {}) {
  const items = readJsonl(launchIndexPath(store))
    .filter((item) => !options.status || item.status === options.status)
    .filter((item) => !options.workspaceId || item.workspaceId === options.workspaceId)
    .filter((item) => !options.adapterId || item.adapter?.id === options.adapterId)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));

  return {
    version: AGENT_LAUNCHER_CONTRACT.version,
    createdAt: nowIso(),
    status: items.length ? "available" : "empty",
    summary: {
      total: items.length,
      byStatus: countBy(items, (item) => item.status),
      byAdapter: countBy(items, (item) => item.adapter?.id ?? "unknown"),
      completedCount: items.filter((item) => item.status === "completed").length,
      requiresApprovalCount: items.filter((item) => item.status === "requires_approval").length,
    },
    items,
    limits: AGENT_LAUNCHER_CONTRACT.safetyBoundary,
  };
}

export function getAgentLaunch(store, launchId) {
  if (!launchId) throw new Error("launchId is required");
  const filePath = path.join(store.root, "agent-launches", `${launchId}.json`);
  if (!fs.existsSync(filePath)) throw new Error(`agent launch not found: ${launchId}`);
  return readJson(filePath);
}

function buildLaunchRecord(input) {
  return {
    version: AGENT_LAUNCHER_CONTRACT.version,
    id: input.launchId,
    createdAt: input.createdAt,
    startedAt: input.startedAt ?? null,
    finishedAt: input.finishedAt ?? null,
    status: input.status,
    executionMode: input.executionMode,
    traceId: input.traceId,
    executionTaskId: normalizeExecutionTaskId(input.executionTaskId),
    workspaceId: input.workspace.id,
    workspacePath: input.workspace.workspacePath,
    adapter: input.workspace.adapter,
    goal: input.workspace.goal,
    command: input.command,
    exitCode: input.exitCode ?? null,
    terminationReason: input.terminationReason ?? null,
    invocation: input.invocation ?? null,
    outputSummary: input.outputSummary ?? null,
    policyDecision: input.policyDecision ?? null,
    approval: input.approval ?? null,
    terminalLog: input.terminalLog ?? null,
    git: input.git ?? null,
    reviewGate: {
      required: true,
      mergeAllowedInV0: false,
      requiredArtifacts: ["terminal_log", "diff_summary", "trace_report"],
    },
    notes: input.notes ?? [],
    limits: AGENT_LAUNCHER_CONTRACT.safetyBoundary,
  };
}

function persistLaunch(store, record) {
  writeJson(path.join(store.root, "agent-launches", `${record.id}.json`), record);
  appendJsonl(launchIndexPath(store), {
    id: record.id,
    createdAt: record.createdAt,
    status: record.status,
    executionMode: record.executionMode,
    traceId: record.traceId,
    executionTaskId: record.executionTaskId,
    workspaceId: record.workspaceId,
    adapter: record.adapter,
    goal: record.goal,
    command: record.command,
    exitCode: record.exitCode,
    terminalLogPath: record.terminalLog?.path ?? null,
    invocationProtocol: record.invocation?.protocol ?? null,
    terminationReason: record.terminationReason,
    changed: record.git?.changed ?? false,
    reviewRequired: true,
  });
}

function plannedCommand(workspace, input) {
  return input.command ?? `${workspace.launchPreview.command} ${workspace.launchPreview.args.join(" ")}`.trim();
}

function normalizeExecutionTaskId(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const id = String(value).trim();
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw new Error("executionTaskId must be a single safe identifier");
  return id;
}

async function runCommand(command, cwd, input) {
  try {
    const result = await execAsync(command, {
      cwd,
      timeout: Number(input.timeoutMs ?? 30000),
      maxBuffer: Number(input.maxBuffer ?? 1024 * 1024),
      windowsHide: true,
    });
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: 0,
      finishedAt: nowIso(),
    };
  } catch (error) {
    return {
      stdout: error.stdout ?? "",
      stderr: error.stderr ?? "",
      exitCode: Number.isInteger(error.code) ? error.code : 1,
      finishedAt: nowIso(),
    };
  }
}

function writeTerminalLog(store, launchId, input) {
  const relativePath = path.join("agent-launches", `${launchId}.log`);
  const logPath = path.join(store.root, relativePath);
  const content = [
    `launchId: ${launchId}`,
    `cwd: ${input.cwd}`,
    `command: ${input.command}`,
    `startedAt: ${input.startedAt}`,
    `finishedAt: ${input.finishedAt}`,
    `exitCode: ${input.exitCode}`,
    `terminationReason: ${input.terminationReason ?? "process_exit"}`,
    `outputSummary: ${JSON.stringify(input.outputSummary ?? null)}`,
    "",
    "----- stdout -----",
    input.stdout ?? "",
    "----- stderr -----",
    input.stderr ?? "",
  ].join("\n");
  fs.writeFileSync(logPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");
  return {
    path: relativePath,
    bytes: Buffer.byteLength(content, "utf8"),
  };
}

function readGitSnapshot(cwd) {
  try {
    return {
      insideWorkTree: runGit(cwd, ["rev-parse", "--is-inside-work-tree"]).trim() === "true",
      head: runGit(cwd, ["rev-parse", "--short", "HEAD"]).trim(),
      branch: runGit(cwd, ["branch", "--show-current"]).trim() || null,
      status: runGit(cwd, ["status", "--porcelain"]).trim().split(/\r?\n/).filter(Boolean),
      diffNameStatus: runGit(cwd, ["diff", "--name-status"]).trim().split(/\r?\n/).filter(Boolean),
      diffStat: runGit(cwd, ["diff", "--stat"]).trim(),
    };
  } catch {
    return {
      insideWorkTree: false,
      head: null,
      branch: null,
      status: [],
      diffNameStatus: [],
      diffStat: "",
    };
  }
}

function runGit(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertAllowedLauncherCommand(command) {
  const blocked = FORBIDDEN_COMMAND_PATTERNS.find((pattern) => pattern.test(command));
  if (blocked) {
    throw new Error("agent launcher blocks git mutation commands in v0");
  }
}

function assertApprovalMatchesLaunch(ticket, approvalInput) {
  if (ticket.status !== "approved") {
    throw new Error(`approval is not approved: ${ticket.id}`);
  }
  if (ticket.toolName !== "shell.execute") {
    throw new Error(`approval tool mismatch: ${ticket.toolName} !== shell.execute`);
  }
  if (JSON.stringify(ticket.input) !== JSON.stringify(approvalInput)) {
    throw new Error("approval input mismatch");
  }
}

function recordSummary(record) {
  return {
    id: record.id,
    status: record.status,
    executionMode: record.executionMode,
    traceId: record.traceId,
    workspaceId: record.workspaceId,
    adapter: record.adapter,
    command: record.command,
    exitCode: record.exitCode,
    terminationReason: record.terminationReason,
    invocation: record.invocation,
    outputSummary: record.outputSummary,
    terminalLog: record.terminalLog,
    git: record.git,
    reviewGate: record.reviewGate,
    notes: record.notes,
  };
}

function launchIndexPath(store) {
  return path.join(store.root, "agent-launch-index.jsonl");
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
