import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createAgentAdapterRunPlan } from "./agent-adapters.js";
import { assessWorkspaceIndexFreshness } from "./context.js";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export const AGENT_WORKSPACE_CONTRACT = Object.freeze({
  version: "0.2.0",
  interface: "spruceagent.agent-workspaces",
  sourceKind: "agent_adapter_run_plan",
  outputKind: "isolated_workspace",
  safetyBoundary: [
    "Agent Workspace prepares Git-isolated coding workspaces and explicit current-workspace records for local adapters.",
    "It may create a git worktree under the local .spruceagent/worktrees directory.",
    "It does not start external CLI agents.",
    "It does not commit, push, merge, approve, or execute adapter commands.",
    "Workspace paths must stay inside the SpruceAgent store worktrees directory.",
    "Retirement removes only clean, SpruceAgent-managed Git worktrees and retains an auditable workspace record.",
    "Retirement never deletes an Agent branch unless the caller explicitly requests deletion and Git accepts a safe non-forced delete.",
    "Codex workspaces require a clean source repository and fresh ContextOS evidence when context is attached.",
    "Current-workspace approved mode is not read-only and still requires the Agent Launcher approval gate before execution.",
  ],
  modes: ["git_worktree", "current_workspace_approved", "current_workspace_readonly"],
});

export function getAgentWorkspaceContract() {
  return AGENT_WORKSPACE_CONTRACT;
}

export function prepareAgentWorkspace(store, input = {}) {
  const plan = input.plan ?? createAgentAdapterRunPlan(store, input);
  const workspaceId = createId("agent_ws");
  const createdAt = nowIso();
  const mode = plan.isolation?.mode ?? "git_worktree";
  const worktreeRoot = path.resolve(store.root, "worktrees");
  const workspacePath = path.resolve(plan.isolation?.workspacePath ?? path.join(worktreeRoot, workspaceId));

  fs.mkdirSync(worktreeRoot, { recursive: true });
  assertInside(worktreeRoot, workspacePath, "workspacePath");

  if (mode !== "git_worktree") {
    const record = workspaceRecord({
      workspaceId,
      createdAt,
      plan,
      status: mode === "current_workspace_readonly" ? "prepared_readonly" : "prepared_approval_gated",
      mode,
      workspacePath: store.cwd,
      git: readGitState(store),
      notes: [
        mode === "current_workspace_readonly"
          ? "Readonly workspace mode uses the current workspace as context."
          : "Approved current-workspace mode may execute only after an exact TrustKernel approval.",
        "No external adapter was launched.",
      ],
    });
    persistWorkspace(store, record);
    return record;
  }

  ensureGitRepository(store);
  if (fs.existsSync(workspacePath)) {
    throw new Error(`agent workspace path already exists: ${workspacePath}`);
  }

  const gitBefore = readGitState(store);
  if (plan.adapter?.id === "codex-cli" && hasSourceChanges(store)) {
    throw new Error("codex-cli workspace preparation requires a clean source repository");
  }
  if (plan.adapter?.id === "codex-cli" && plan.context) {
    const freshness = assessWorkspaceIndexFreshness(store);
    if (freshness.status !== "fresh") {
      throw new Error("codex-cli workspace preparation requires a fresh ContextOS index");
    }
  }
  const branchName = plan.isolation.branchName;
  const baseRef = input.baseRef ?? "HEAD";
  fs.mkdirSync(path.dirname(workspacePath), { recursive: true });
  runGit(store, ["worktree", "add", "-b", branchName, workspacePath, baseRef]);

  const record = workspaceRecord({
    workspaceId,
    createdAt,
    plan,
    status: "prepared",
    mode,
    workspacePath,
    git: {
      ...gitBefore,
      baseRef,
      branchName,
      worktreeCreated: true,
    },
    notes: [
      "Git worktree created for isolated agent execution.",
      "No external adapter was launched.",
      "Review gate still blocks merge or promotion in v0.",
    ],
  });
  persistWorkspace(store, record);
  return record;
}

export function retireAgentWorkspace(store, workspaceId, input = {}) {
  if (!workspaceId) throw new Error("workspaceId is required");
  const workspace = getAgentWorkspace(store, workspaceId);
  const currentUpdatedAt = workspace.updatedAt ?? workspace.createdAt;
  if (input.ifUpdatedAt && input.ifUpdatedAt !== currentUpdatedAt) {
    throw new Error(`agent workspace was updated since it was loaded: ${workspaceId}`);
  }
  if (workspace.status === "retired") {
    throw new Error(`agent workspace is already retired: ${workspaceId}`);
  }

  const retiredAt = nowIso();
  const retired = {
    ...workspace,
    status: "retired",
    updatedAt: retiredAt,
    retiredAt,
    retiredBy: input.actor ?? input.by ?? "local-user",
    retirement: {
      requestedBranchDeletion: input.deleteBranch === true,
      worktreeRemoved: false,
      branchDeleted: false,
      reason: input.reason ?? null,
    },
    notes: [...(workspace.notes ?? [])],
  };

  if (workspace.mode === "git_worktree") {
    const worktreeRoot = path.resolve(store.root, "worktrees");
    const workspacePath = path.resolve(workspace.workspacePath);
    assertInside(worktreeRoot, workspacePath, "workspacePath");
    if (!fs.existsSync(workspacePath)) {
      throw new Error(`managed agent worktree is missing: ${workspacePath}`);
    }
    const dirty = runGitAt(workspacePath, ["status", "--porcelain"]).trim();
    if (dirty) {
      throw new Error("agent workspace has uncommitted changes; inspect, commit, or discard them before retirement");
    }
    runGit(store, ["worktree", "remove", workspacePath]);
    retired.retirement.worktreeRemoved = true;
    retired.notes.push("Clean managed Git worktree removed during retirement.");
    if (input.deleteBranch === true && workspace.isolation?.branchName) {
      try {
        runGit(store, ["branch", "-d", workspace.isolation.branchName]);
        retired.retirement.branchDeleted = true;
        retired.notes.push("Merged Agent branch deleted during retirement.");
      } catch {
        retired.notes.push("Agent branch was retained because Git did not allow safe non-forced deletion.");
      }
    }
  } else {
    retired.notes.push("Current-workspace record retired; the project directory was not changed.");
  }

  persistWorkspace(store, retired);
  return retired;
}

export function listAgentWorkspaces(store, options = {}) {
  const latestById = new Map();
  for (const item of readJsonl(workspaceIndexPath(store))) latestById.set(item.id, item);
  const items = [...latestById.values()]
    .filter((item) => !options.status || item.status === options.status)
    .filter((item) => !options.adapterId || item.adapter?.id === options.adapterId)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));

  return {
    version: AGENT_WORKSPACE_CONTRACT.version,
    createdAt: nowIso(),
    status: items.length ? "available" : "empty",
    summary: {
      total: items.length,
      byStatus: countBy(items, (item) => item.status),
      byAdapter: countBy(items, (item) => item.adapter?.id ?? "unknown"),
      activeCount: items.filter((item) => item.status !== "retired").length,
      gitWorktreeCount: items.filter((item) => item.mode === "git_worktree" && item.status !== "retired").length,
      retiredCount: items.filter((item) => item.status === "retired").length,
    },
    items,
    limits: AGENT_WORKSPACE_CONTRACT.safetyBoundary,
  };
}

export function getAgentWorkspace(store, workspaceId) {
  if (!workspaceId) throw new Error("workspaceId is required");
  const filePath = path.join(store.root, "agent-workspaces", `${workspaceId}.json`);
  if (!fs.existsSync(filePath)) throw new Error(`agent workspace not found: ${workspaceId}`);
  return readJson(filePath);
}

export function assertAgentWorkspaceLaunchable(workspace) {
  if (!workspace?.id) throw new Error("agent workspace is required");
  if (workspace.status === "retired") {
    throw new Error(`agent workspace is retired and cannot be launched: ${workspace.id}`);
  }
}

function workspaceRecord(input) {
  return {
    version: AGENT_WORKSPACE_CONTRACT.version,
    id: input.workspaceId,
    planId: input.plan.id,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    status: input.status,
    mode: input.mode,
    adapter: input.plan.adapter,
    goal: input.plan.goal,
    workspacePath: input.workspacePath,
    isolation: {
      ...input.plan.isolation,
      workspacePath: input.workspacePath,
    },
    git: input.git,
    plan: input.plan,
    reviewGate: input.plan.reviewGate,
    launchPreview: input.plan.launchPreview,
    notes: input.notes,
    limits: AGENT_WORKSPACE_CONTRACT.safetyBoundary,
  };
}

function persistWorkspace(store, record) {
  writeJson(path.join(store.root, "agent-workspaces", `${record.id}.json`), record);
  appendJsonl(workspaceIndexPath(store), {
    id: record.id,
    planId: record.planId,
    createdAt: record.createdAt,
    status: record.status,
    mode: record.mode,
    adapter: record.adapter,
    goal: record.goal,
    workspacePath: record.workspacePath,
    branchName: record.isolation.branchName,
    reviewRequired: record.reviewGate?.required === true,
    updatedAt: record.updatedAt ?? record.createdAt,
    retiredAt: record.retiredAt ?? null,
    retirement: record.retirement ?? null,
  });
}

function workspaceIndexPath(store) {
  return path.join(store.root, "agent-workspace-index.jsonl");
}

function ensureGitRepository(store) {
  const inside = runGit(store, ["rev-parse", "--is-inside-work-tree"]);
  if (inside.trim() !== "true") {
    throw new Error("agent workspace requires a git repository");
  }
}

function readGitState(store) {
  try {
    return {
      insideWorkTree: runGit(store, ["rev-parse", "--is-inside-work-tree"]).trim() === "true",
      head: runGit(store, ["rev-parse", "--short", "HEAD"]).trim(),
      currentBranch: runGit(store, ["branch", "--show-current"]).trim() || null,
      dirty: runGit(store, ["status", "--porcelain"]).trim().length > 0,
    };
  } catch {
    return {
      insideWorkTree: false,
      head: null,
      currentBranch: null,
      dirty: null,
    };
  }
}

function hasSourceChanges(store) {
  return runGit(store, [
    "status",
    "--porcelain",
    "--",
    ".",
    ":(exclude).spruceagent/**",
  ]).trim().length > 0;
}

function runGit(store, args) {
  return execFileSync("git", ["-C", store.cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runGitAt(cwd, args) {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertInside(root, target, label) {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside ${root}`);
  }
}

function countBy(items, keyFn) {
  return items.reduce((counts, item) => {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}
