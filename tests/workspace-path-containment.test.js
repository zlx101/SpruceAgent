import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createAgentAdapterRunPlan } from "../packages/core/src/agent-adapters.js";
import { createStore, ensureStore } from "../packages/core/src/index.js";

function assertInsideWorktrees(store, workspacePath) {
  const worktreeRoot = path.resolve(store.root, "worktrees");
  const resolved = path.resolve(workspacePath);
  const relative = path.relative(worktreeRoot, resolved);
  assert.equal(path.isAbsolute(relative), false);
  const segments = relative.split(/[\\/]+/).filter(Boolean);
  assert.ok(segments.length > 0);
  assert.notEqual(segments[0], "..");
  assert.notEqual(resolved, path.resolve(store.root));
}

function assertRejectedOrContained(store, branchName) {
  try {
    const plan = createAgentAdapterRunPlan(store, {
      goal: "contain workspace path",
      branchName,
    });
    assertInsideWorktrees(store, plan.isolation.workspacePath);
  } catch (error) {
    assert.match(error.message, /branch name/);
  }
}

test("adapter plans keep workspace paths inside the store worktrees directory", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-workspace-path-"));
  const store = ensureStore(createStore(dir));

  assert.throws(
    () => createAgentAdapterRunPlan(store, {
      goal: "reject parent branch",
      branchName: "..",
    }),
    /branch name/,
  );

  assertRejectedOrContained(store, "../../outside");

  const plan = createAgentAdapterRunPlan(store, {
    goal: "keep normal branch",
    branchName: "codex/agent-demo",
  });
  assertInsideWorktrees(store, plan.isolation.workspacePath);
  assert.equal(
    path.resolve(plan.isolation.workspacePath),
    path.resolve(store.root, "worktrees", "codex__agent-demo"),
  );

  const longBranch = createAgentAdapterRunPlan(store, {
    goal: "keep dotted normal branch",
    branchName: "codex/agent-local-shell-agent-0ecf6a",
  });
  assertInsideWorktrees(store, longBranch.isolation.workspacePath);
});
