import fs from "node:fs";
import path from "node:path";

export function createStore(cwd = process.cwd()) {
  return {
    cwd,
    root: path.join(cwd, ".spruceagent"),
  };
}

export function ensureStore(store) {
  fs.mkdirSync(store.root, { recursive: true });
  fs.mkdirSync(path.join(store.root, "traces"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "approvals"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "context"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "skills", "candidates"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "skills", "approved"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "skill-history"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "skill-replay-fixtures"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "skill-replay-results"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "skill-packages"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "skill-imports"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "workflows"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "workflow-history"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "evaluations"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "skill-evaluations"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "agent-workspaces"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "agent-launches"), { recursive: true });
  fs.mkdirSync(path.join(store.root, "worktrees"), { recursive: true });

  const configPath = path.join(store.root, "config.json");
  if (!fs.existsSync(configPath)) {
    writeJson(configPath, {
      version: 1,
      projectName: path.basename(store.cwd),
      defaultTrustMode: "approve",
      createdAt: new Date().toISOString(),
    });
  }

  touch(path.join(store.root, "memory.jsonl"));
  touch(path.join(store.root, "trace-index.jsonl"));
  touch(path.join(store.root, "approval-index.jsonl"));
  touch(path.join(store.root, "evaluation-index.jsonl"));
  touch(path.join(store.root, "skill-evaluation-index.jsonl"));
  touch(path.join(store.root, "skill-version-index.jsonl"));
  touch(path.join(store.root, "skill-replay-fixture-index.jsonl"));
  touch(path.join(store.root, "skill-replay-result-index.jsonl"));
  touch(path.join(store.root, "skill-package-index.jsonl"));
  touch(path.join(store.root, "skill-package-import-index.jsonl"));
  touch(path.join(store.root, "agent-workspace-index.jsonl"));
  touch(path.join(store.root, "agent-launch-index.jsonl"));
  touch(path.join(store.root, "audit.jsonl"));
  return store;
}

export function touch(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "", "utf8");
  }
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function appendJsonl(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}
