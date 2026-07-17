import path from "node:path";
import { createContextPack, createSourceMap } from "./context.js";
import { createId, nowIso } from "./id.js";

export const AGENT_ADAPTER_CONTRACT = Object.freeze({
  version: "0.2.0",
  interface: "spruceagent.agent-adapters",
  sourceKind: "cli_agent_adapter_registry",
  outputKind: "agent_fleet_control_plane",
  safetyBoundary: [
    "Agent Adapter Registry v0 is read-only except for returning an execution plan object.",
    "It does not start external CLI agents; execution flows through Agent Launcher.",
    "It does not create git worktrees, branches, commits, or pull requests.",
    "Codex CLI plans can flow through the TrustKernel-approved External CLI Launcher v1; other external adapters remain preview-only.",
  ],
  adapterKinds: ["coding_cli", "local_cli", "research_cli"],
  plannedIsolationModes: ["git_worktree", "current_workspace_approved", "current_workspace_readonly"],
});

const BUILTIN_ADAPTERS = Object.freeze([
  {
    id: "codex-cli",
    name: "Codex CLI",
    kind: "coding_cli",
    provider: "openai",
    command: "codex",
    status: "executable_gated",
    maturity: "controlled_execution_v1",
    summary: "OpenAI Codex command-line coding agent adapter.",
    strengths: ["repo editing", "test-driven coding", "patch review", "terminal-native workflows"],
    limitations: ["requires local Codex CLI installation and authentication", "requires an isolated Git worktree and exact approval"],
    recommendedIsolation: "git_worktree",
    promptDelivery: "stdin_or_arg",
    outputCapture: "terminal_log_and_diff",
    safetyNotes: [
      "Run only in an isolated worktree through the shell-free launcher.",
      "Require Trace Report and diff review before merge.",
    ],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    kind: "coding_cli",
    provider: "anthropic",
    command: "claude",
    status: "planned",
    maturity: "adapter_spec",
    summary: "Anthropic Claude Code command-line coding agent adapter.",
    strengths: ["large-context code work", "multi-file reasoning", "terminal-native workflows"],
    limitations: ["requires local Claude Code installation", "execution is not enabled in v0"],
    recommendedIsolation: "git_worktree",
    promptDelivery: "stdin_or_arg",
    outputCapture: "terminal_log_and_diff",
    safetyNotes: [
      "Run only in an isolated worktree when execution is enabled.",
      "Require user approval for filesystem writes and merge.",
    ],
  },
  {
    id: "opencode",
    name: "OpenCode",
    kind: "coding_cli",
    provider: "community",
    command: "opencode",
    status: "planned",
    maturity: "adapter_spec",
    summary: "OpenCode-compatible CLI agent adapter.",
    strengths: ["open agent workflows", "local customization", "coding task execution"],
    limitations: ["CLI flags vary by installation", "execution is not enabled in v0"],
    recommendedIsolation: "git_worktree",
    promptDelivery: "stdin_or_arg",
    outputCapture: "terminal_log_and_diff",
    safetyNotes: [
      "Normalize command flags before execution support.",
      "Treat output as untrusted until tests and review pass.",
    ],
  },
  {
    id: "hermes-agent",
    name: "Hermes Agent",
    kind: "research_cli",
    provider: "nousresearch",
    command: "hermes-agent",
    status: "planned",
    maturity: "adapter_spec",
    summary: "Hermes-inspired autonomous agent adapter for evolution and research loops.",
    strengths: ["agentic exploration", "self-improvement loops", "research workflows"],
    limitations: ["local CLI contract must be verified before execution", "execution is not enabled in v0"],
    recommendedIsolation: "git_worktree",
    promptDelivery: "stdin_or_arg",
    outputCapture: "terminal_log_artifacts_and_diff",
    safetyNotes: [
      "Constrain self-improvement loops with explicit evaluation gates.",
      "Never allow unattended recursive execution in v0.",
    ],
  },
  {
    id: "gemini-cli",
    name: "Gemini CLI",
    kind: "coding_cli",
    provider: "google",
    command: "gemini",
    status: "planned",
    maturity: "adapter_spec",
    summary: "Gemini command-line agent adapter.",
    strengths: ["coding assistance", "large-context reasoning", "CLI workflows"],
    limitations: ["CLI contract varies", "execution is not enabled in v0"],
    recommendedIsolation: "git_worktree",
    promptDelivery: "stdin_or_arg",
    outputCapture: "terminal_log_and_diff",
    safetyNotes: [
      "Verify installed CLI behavior before enabling execution.",
      "Keep provider credentials outside trace payloads.",
    ],
  },
  {
    id: "local-shell-agent",
    name: "Local Shell Agent",
    kind: "local_cli",
    provider: "local",
    command: "shell",
    status: "executable_gated",
    maturity: "controlled_execution_v0",
    summary: "Local scripted agent adapter for deterministic shell workflows.",
    strengths: ["repeatable scripts", "local-only execution", "deterministic automation"],
    limitations: ["not a general reasoning agent", "approved commands may modify the current workspace"],
    recommendedIsolation: "current_workspace_approved",
    promptDelivery: "config_file",
    outputCapture: "terminal_log_artifacts",
    safetyNotes: [
      "Treat every command as high risk and require exact approval.",
      "Use an isolated Git worktree instead when source mutation needs stronger containment.",
    ],
  },
]);

export function getAgentAdapterContract() {
  return AGENT_ADAPTER_CONTRACT;
}

export function listAgentAdapters(options = {}) {
  const adapters = BUILTIN_ADAPTERS
    .filter((adapter) => !options.kind || adapter.kind === options.kind)
    .filter((adapter) => !options.status || adapter.status === options.status)
    .map((adapter) => adapterListItem(adapter));

  return {
    version: AGENT_ADAPTER_CONTRACT.version,
    createdAt: nowIso(),
    status: "available",
    summary: {
      total: adapters.length,
      byKind: countBy(adapters, (adapter) => adapter.kind),
      byStatus: countBy(adapters, (adapter) => adapter.status),
    },
    items: adapters,
    limits: [
      "Adapter Registry returns specifications and execution plans; it does not launch processes itself.",
      "Codex CLI is the only external adapter enabled by External CLI Launcher v1.",
      "Use Capability Probe before preparing and approving an external launch.",
    ],
  };
}

export function getAgentAdapter(adapterId) {
  if (!adapterId) throw new Error("adapterId is required");
  const adapter = BUILTIN_ADAPTERS.find((item) => item.id === adapterId);
  if (!adapter) throw new Error(`agent adapter not found: ${adapterId}`);
  return {
    version: AGENT_ADAPTER_CONTRACT.version,
    ...adapter,
    capabilities: {
      parallelRuns: true,
      worktreeIsolation: adapter.recommendedIsolation === "git_worktree",
      diffReview: true,
      traceReportRequired: true,
      directExecution: adapter.id === "codex-cli",
    },
    integrationChecklist: [
      "Verify CLI binary and version.",
      "Create isolated workspace.",
      "Inject ContextOS evidence packet.",
      "Capture terminal log, artifacts, diff, and exit status.",
      "Generate Trace Report.",
      "Require review before merge or promotion.",
    ],
    limits: AGENT_ADAPTER_CONTRACT.safetyBoundary,
  };
}

export function createAgentAdapterRunPlan(store, input = {}) {
  const adapter = getAgentAdapter(input.adapterId ?? "codex-cli");
  const goal = String(input.goal ?? "").trim();
  if (!goal) throw new Error("goal is required");

  const planId = createId("agent_plan");
  const context = input.contextQuery
    ? createContextPack(store, input.contextQuery, { limit: input.contextLimit ?? 5 })
    : null;
  const sourceMap = createSourceMap(store, {
    query: input.contextQuery ?? goal,
    context,
  });
  const branchName = sanitizeBranchName(input.branchName ?? `codex/agent-${adapter.id}-${planId.slice(-6)}`);
  const workspacePath = path.join(store.root, "worktrees", branchName.replace(/[\\/]/g, "__"));
  const isolationMode = input.isolationMode ?? adapter.recommendedIsolation;

  return {
    version: AGENT_ADAPTER_CONTRACT.version,
    id: planId,
    createdAt: nowIso(),
    status: "planned",
    executionMode: "preview_only",
    adapter: {
      id: adapter.id,
      name: adapter.name,
      kind: adapter.kind,
      provider: adapter.provider,
      command: adapter.command,
    },
    goal,
    context,
    sourceMap,
    isolation: {
      mode: isolationMode,
      baseBranch: input.baseBranch ?? "current",
      branchName,
      workspacePath,
      requiresGitWorktree: isolationMode === "git_worktree",
    },
    launchPreview: {
      command: adapter.command,
      args: buildLaunchArgs(adapter, {
        goal,
        workspacePath,
      }),
      env: {
        SPRUCE_AGENT_PLAN_ID: planId,
        SPRUCE_AGENT_ADAPTER_ID: adapter.id,
      },
    },
    reviewGate: {
      required: true,
      requiredArtifacts: ["terminal_log", "diff_summary", "trace_report"],
      mergeAllowedInV0: false,
    },
    limits: [
      ...AGENT_ADAPTER_CONTRACT.safetyBoundary,
      adapter.id === "codex-cli"
        ? "This plan becomes executable only after isolated workspace preparation and exact approval."
        : "This external adapter remains preview-only.",
      "Execution must create the isolated workspace before launching the adapter.",
    ],
  };
}

function adapterListItem(adapter) {
  return {
    id: adapter.id,
    name: adapter.name,
    kind: adapter.kind,
    provider: adapter.provider,
    command: adapter.command,
    status: adapter.status,
    maturity: adapter.maturity,
    recommendedIsolation: adapter.recommendedIsolation,
    summary: adapter.summary,
  };
}

function buildLaunchArgs(adapter, input) {
  if (adapter.promptDelivery === "config_file") {
    return ["--config", "<spruce-agent-plan.json>"];
  }
  if (adapter.id === "codex-cli") {
    return [
      "exec",
      "--sandbox",
      "workspace-write",
      "--ephemeral",
      "--json",
      "--color",
      "never",
      "--cd",
      input.workspacePath,
      "-",
    ];
  }
  return ["<adapter-contract-not-yet-verified>"];
}

function sanitizeBranchName(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._/-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "codex/agent-plan";
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
