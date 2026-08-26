import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createStore, ensureStore } from "./storage.js";

const REQUIRED_PATHS = [
  "README.md",
  "LICENSE",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODE_OF_CONDUCT.md",
  "package.json",
  ".github/pull_request_template.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  "apps/showcase/index.html",
  "apps/showcase/app.js",
  "apps/showcase/styles.css",
  "apps/cli/bin/spruce.js",
  "apps/desktop/index.html",
  "apps/desktop/app.js",
  "apps/desktop/styles.css",
  "packages/core/src/index.js",
  "packages/core/src/agent-trial-attestation.js",
  "packages/core/src/external-cli-launcher.js",
  "packages/core/src/fleet-runs.js",
  "packages/core/src/gateway-runtime.js",
  "packages/core/src/llm-provider-registry.js",
  "tests/core.test.js",
  "docs/open-source-alpha-quickstart.md",
  "docs/contextos-index-safety-v0.md",
  "docs/contextos-incremental-index-v0.md",
  "docs/contextos-staleness-guard-v0.md",
  "docs/context-evidence-contract-v1.md",
  "docs/run-preflight-auto-reindex-v0.md",
  "docs/run-risk-preflight-v0.md",
  "docs/approval-queue-v0.md",
  "docs/run-artifact-store-v0.md",
  "docs/trace-report-export-v0.md",
  "docs/agent-adapter-registry-v0.md",
  "docs/isolated-agent-workspace-v0.md",
  "docs/agent-launcher-v0.md",
  "docs/external-cli-launcher-v1.md",
  "docs/fleet-run-orchestrator-v0.md",
  "docs/launch-review-gate-v0.md",
  "docs/capability-probe-task-router-v0.md",
  "docs/agent-trial-evidence-v0.md",
  "docs/llm-provider-registry-v0.md",
  "docs/outcome-evaluation-suite-v1.md",
  "docs/deployment-operations-v0.md",
  "docs/public-showcase-v0.md",
  "docs/release-checklist.md",
];

export function runDoctor(cwd = process.cwd()) {
  const checks = [];
  checks.push(checkNodeVersion());
  checks.push(checkPackageJson(cwd));
  checks.push(...REQUIRED_PATHS.map((relativePath) => checkPath(cwd, relativePath)));
  checks.push(checkTempStore());
  checks.push(checkGitRepository(cwd));

  const failedCount = checks.filter((check) => check.status === "failed").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  return {
    version: "0.1.0",
    status: failedCount ? "failed" : warningCount ? "warning" : "passed",
    summary: {
      checkCount: checks.length,
      passedCount: checks.filter((check) => check.status === "passed").length,
      warningCount,
      failedCount,
    },
    checks,
    nextActions: buildNextActions(checks),
  };
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major >= 20) {
    return pass("node.version", `Node.js ${process.versions.node} satisfies >=20.`);
  }
  return fail("node.version", `Node.js ${process.versions.node} is below required >=20.`);
}

function checkPackageJson(cwd) {
  const filePath = path.join(cwd, "package.json");
  if (!fs.existsSync(filePath)) return fail("package.json", "package.json is missing.");
  try {
    const pkg = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const missing = [];
    if (pkg.type !== "module") missing.push("type=module");
    if (pkg.license !== "Apache-2.0") missing.push("license=Apache-2.0");
    if (!pkg.repository?.url) missing.push("repository.url");
    if (!pkg.scripts?.test) missing.push("scripts.test");
    if (!pkg.scripts?.spruce) missing.push("scripts.spruce");
    if (!pkg.engines?.node) missing.push("engines.node");
    return missing.length
      ? warn("package.json", `package.json is missing recommended fields: ${missing.join(", ")}.`)
      : pass("package.json", "package.json exposes module, test, spruce, and node engine metadata.");
  } catch (error) {
    return fail("package.json", `package.json is not valid JSON: ${error.message}`);
  }
}

function checkPath(cwd, relativePath) {
  const filePath = path.join(cwd, relativePath);
  return fs.existsSync(filePath)
    ? pass(`path.${relativePath}`, `${relativePath} exists.`)
    : fail(`path.${relativePath}`, `${relativePath} is missing.`);
}

function checkTempStore() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-doctor-"));
  try {
    const store = ensureStore(createStore(tempDir));
    const configPath = path.join(store.root, "config.json");
    return fs.existsSync(configPath)
      ? pass("store.temp", "Temporary .spruceagent store initializes successfully.")
      : fail("store.temp", "Temporary .spruceagent store did not create config.json.");
  } catch (error) {
    return fail("store.temp", `Temporary store initialization failed: ${error.message}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function checkGitRepository(cwd) {
  return fs.existsSync(path.join(cwd, ".git"))
    ? pass("git.repository", ".git directory exists.")
    : warn("git.repository", "This directory is not a git repository yet.");
}

function buildNextActions(checks) {
  const actions = [];
  if (checks.some((check) => check.status === "failed")) {
    actions.push("Fix failed checks before publishing or running CI.");
  }
  if (checks.some((check) => check.id === "git.repository" && check.status === "warning")) {
    actions.push("Initialize git before preparing the public GitHub repository.");
  }
  if (!actions.length) {
    actions.push("Run npm test and npm run alpha:smoke before publishing.");
  }
  return actions;
}

function pass(id, message) {
  return { id, status: "passed", message };
}

function warn(id, message) {
  return { id, status: "warning", message };
}

function fail(id, message) {
  return { id, status: "failed", message };
}
