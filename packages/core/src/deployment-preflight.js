import fs from "node:fs";
import path from "node:path";
import { listAgentLaunches } from "./agent-launcher.js";
import { listAgentWorkspaces } from "./agent-workspaces.js";
import { listApprovalTickets } from "./approvals.js";
import { listAutopilots, listDueAutopilots } from "./autopilots.js";
import { listFleetRuns } from "./fleet-runs.js";
import { getGatewayRuntimeState } from "./gateway-runtime.js";
import { nowIso } from "./id.js";
import { getExecutionTaskBoard, listExecutionTasks } from "./execution-tasks.js";
import { readJson } from "./storage.js";

const DEFAULT_GATEWAY_HOST = "127.0.0.1";
const DEFAULT_GATEWAY_PORT = 7357;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

export const DEPLOYMENT_PREFLIGHT_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.deployment-preflight",
  outputKind: "local_runtime_readiness_report",
  safetyBoundary: [
    "Deployment Preflight is a local diagnostic; it does not start Gateway, Agents, tools, workflows, Fleet Runs, or Autopilot work.",
    "The write probe creates and removes only one temporary file directly under the local .spruceagent store.",
    "Gateway token values are never returned; the report only states whether a token is configured.",
    "A failed report blocks deployment; a warning report may run locally but needs operator review before unattended use.",
  ],
});

export function getDeploymentPreflightContract() {
  return DEPLOYMENT_PREFLIGHT_CONTRACT;
}

export function runDeploymentPreflight(store, input = {}) {
  const checkedAt = nowIso();
  const host = String(input.host ?? DEFAULT_GATEWAY_HOST).trim() || DEFAULT_GATEWAY_HOST;
  const port = normalizePort(input.port ?? DEFAULT_GATEWAY_PORT);
  const autopilotPollMs = input.autopilotPollMs === undefined || input.autopilotPollMs === null
    ? null
    : Number(input.autopilotPollMs);
  const requireToken = input.requireToken === true;
  const checks = [
    checkNodeVersion(),
    checkPackageScripts(store.cwd),
    checkStorePaths(store),
    checkStoreWriteProbe(store),
    checkGitIgnore(store.cwd),
    checkHost(host, input.allowRemote === true),
    checkPort(port),
    checkGatewayToken(store, requireToken),
    checkGatewayRuntime(store),
    checkWorkbenchAssets(store.cwd),
    checkAutopilotPollMs(autopilotPollMs),
    checkOperatorQueues(store),
  ];
  const failedCount = checks.filter((check) => check.status === "failed").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const agentWorkspaces = listAgentWorkspaces(store);
  const autopilots = listAutopilots(store);
  const dueAutopilots = listDueAutopilots(store);
  const executionTasks = listExecutionTasks(store);
  const executionTaskBoard = getExecutionTaskBoard(store);
  const pendingApprovals = listApprovalTickets(store, "pending");

  return {
    version: DEPLOYMENT_PREFLIGHT_CONTRACT.version,
    interface: DEPLOYMENT_PREFLIGHT_CONTRACT.interface,
    checkedAt,
    status: failedCount ? "failed" : warningCount ? "warning" : "passed",
    target: {
      host,
      port: port.valid ? port.value : null,
      baseUrl: port.valid ? `http://${host}:${port.value}` : null,
      localOnly: LOCAL_HOSTS.has(host),
      autopilotPollMs,
    },
    summary: {
      checkCount: checks.length,
      passedCount: checks.filter((check) => check.status === "passed").length,
      warningCount,
      failedCount,
    },
    runtime: {
      storeRoot: store.root,
      tokenConfigured: readGatewayTokenStatus(store).tokenConfigured,
      gatewayRuntime: gatewayRuntimeSummary(store),
      pendingApprovalCount: pendingApprovals.length,
      executionTaskCount: itemCount(executionTasks),
      executionTaskEvidenceIssueCount: executionTaskBoard.evidenceAttention.length,
      autopilotCount: itemCount(autopilots),
      autopilotDueCount: itemCount(dueAutopilots),
      agentWorkspaceCount: itemCount(agentWorkspaces),
      agentActiveWorkspaceCount: agentWorkspaces.summary.activeCount,
      agentRetiredWorkspaceCount: agentWorkspaces.summary.retiredCount,
      agentLaunchCount: itemCount(listAgentLaunches(store)),
      fleetRunCount: itemCount(listFleetRuns(store)),
    },
    checks,
    nextActions: buildNextActions(checks),
    limits: DEPLOYMENT_PREFLIGHT_CONTRACT.safetyBoundary,
  };
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  return major >= 20
    ? pass("runtime.node", `Node.js ${process.versions.node} satisfies >=20.`)
    : fail("runtime.node", `Node.js ${process.versions.node} is below required >=20.`);
}

function checkPackageScripts(cwd) {
  const packagePath = path.join(cwd, "package.json");
  if (!fs.existsSync(packagePath)) return fail("package.scripts", "package.json is missing.");
  try {
    const pkg = readJson(packagePath);
    const required = ["spruce", "doctor", "check", "test", "alpha:smoke", "deploy:preflight", "release:verify"];
    const missing = required.filter((script) => !pkg.scripts?.[script]);
    return missing.length
      ? fail("package.scripts", `Missing deployment scripts: ${missing.join(", ")}.`)
      : pass("package.scripts", "Required verification and deployment preflight scripts are present.");
  } catch (error) {
    return fail("package.scripts", `package.json cannot be read: ${error.message}`);
  }
}

function checkStorePaths(store) {
  const required = [
    "config.json",
    "trace-index.jsonl",
    "approval-index.jsonl",
    "execution-task-index.jsonl",
    "autopilot-index.jsonl",
    "release-verification-index.jsonl",
    "agent-workspace-index.jsonl",
    "agent-launch-index.jsonl",
  ];
  const missing = required.filter((relativePath) => !fs.existsSync(path.join(store.root, relativePath)));
  return missing.length
    ? fail("store.paths", `Store is missing required files: ${missing.join(", ")}.`)
    : pass("store.paths", "Local .spruceagent store has required runtime indexes.");
}

function checkStoreWriteProbe(store) {
  const probePath = path.join(store.root, "deployment-preflight.tmp");
  const payload = `deployment-preflight:${nowIso()}`;
  try {
    fs.writeFileSync(probePath, payload, "utf8");
    const readBack = fs.readFileSync(probePath, "utf8");
    fs.rmSync(probePath, { force: true });
    return readBack === payload
      ? pass("store.write", "Local .spruceagent store accepts read/write probes.")
      : fail("store.write", "Local .spruceagent store write probe read back unexpected data.");
  } catch (error) {
    try {
      fs.rmSync(probePath, { force: true });
    } catch {
      // Best-effort cleanup only.
    }
    return fail("store.write", `Local .spruceagent store write probe failed: ${error.message}`);
  }
}

function checkGitIgnore(cwd) {
  const gitignorePath = path.join(cwd, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return warn("repo.gitignore", ".gitignore is missing.");
  const content = fs.readFileSync(gitignorePath, "utf8");
  const missing = [];
  if (!content.split(/\r?\n/).includes(".spruceagent/")) missing.push(".spruceagent/");
  if (!content.split(/\r?\n/).includes("*.skillpkg.json")) missing.push("*.skillpkg.json");
  return missing.length
    ? warn("repo.gitignore", `.gitignore is missing runtime/private patterns: ${missing.join(", ")}.`)
    : pass("repo.gitignore", ".gitignore excludes local runtime state and skill packages.");
}

function checkHost(host, allowRemote) {
  if (LOCAL_HOSTS.has(host)) {
    return pass("gateway.host", `Gateway host ${host} is local-only.`);
  }
  return allowRemote
    ? warn("gateway.host", `Gateway host ${host} is remote-capable because allowRemote is explicit.`)
    : fail("gateway.host", `Gateway refuses non-local host ${host} unless allowRemote is explicit.`);
}

function checkPort(port) {
  return port.valid
    ? pass("gateway.port", `Gateway port ${port.value} is valid.`)
    : fail("gateway.port", "Gateway port must be an integer between 0 and 65535.");
}

function checkGatewayToken(store, requireToken) {
  const auth = readGatewayTokenStatus(store);
  if (auth.tokenConfigured) return pass("gateway.token", "Gateway bearer token is configured.");
  return requireToken
    ? fail("gateway.token", "Gateway bearer token is required but not configured.")
    : warn("gateway.token", "Gateway bearer token is not configured yet; gateway serve will create one and print it once.");
}

function checkGatewayRuntime(store) {
  const state = getGatewayRuntimeState(store);
  if (state.processAlive && state.record?.pid !== process.pid) {
    return fail("gateway.runtime", `Another Gateway process is already recorded for this store: pid ${state.record.pid}.`);
  }
  if (state.processAlive && state.record?.pid === process.pid) {
    return pass("gateway.runtime", "Current Gateway process owns this store runtime record.");
  }
  if (state.status === "stale") {
    return warn("gateway.runtime", "Gateway runtime record is stale and can be replaced on the next start.");
  }
  if (state.status === "stopped") {
    return pass("gateway.runtime", "Last Gateway runtime record is stopped.");
  }
  return pass("gateway.runtime", "No active Gateway runtime is recorded for this store.");
}

function checkWorkbenchAssets(cwd) {
  const required = [
    "apps/desktop/index.html",
    "apps/desktop/app.js",
    "apps/desktop/styles.css",
    "apps/showcase/index.html",
    "apps/showcase/app.js",
    "apps/showcase/styles.css",
  ];
  const missing = required.filter((relativePath) => !fs.existsSync(path.join(cwd, relativePath)));
  return missing.length
    ? fail("gateway.static_assets", `Missing static assets: ${missing.join(", ")}.`)
    : pass("gateway.static_assets", "Workbench and showcase static assets are present.");
}

function gatewayRuntimeSummary(store) {
  const state = getGatewayRuntimeState(store);
  return {
    status: state.status,
    processAlive: state.processAlive,
    pid: state.record?.pid ?? null,
    baseUrl: state.record?.baseUrl ?? null,
    startedAt: state.record?.startedAt ?? null,
    stoppedAt: state.record?.stoppedAt ?? null,
  };
}

function checkAutopilotPollMs(value) {
  if (value === null) {
    return pass("autopilot.runner", "Autopilot foreground runner is disabled unless explicitly requested.");
  }
  return Number.isSafeInteger(value) && value >= 1000 && value <= 3600000
    ? pass("autopilot.runner", `Autopilot poll interval ${value}ms is within the safe runtime range.`)
    : fail("autopilot.runner", "Autopilot poll interval must be an integer between 1000 and 3600000ms.");
}

function checkOperatorQueues(store) {
  const pendingApprovals = listApprovalTickets(store, "pending");
  const board = getExecutionTaskBoard(store);
  const issues = [];
  if (pendingApprovals.length) issues.push(`${pendingApprovals.length} pending approval(s)`);
  if (board.evidenceAttention.length) issues.push(`${board.evidenceAttention.length} execution task evidence issue(s)`);
  return issues.length
    ? warn("operator.attention", `Operator attention is required before unattended operation: ${issues.join(", ")}.`)
    : pass("operator.attention", "No pending approvals or execution-task evidence issues require operator attention.");
}

function readGatewayTokenStatus(store) {
  try {
    const config = readJson(path.join(store.root, "config.json"));
    return { tokenConfigured: Boolean(config.gateway?.localApiTokenHash) };
  } catch {
    return { tokenConfigured: false };
  }
}

function normalizePort(value) {
  const port = Number(value);
  return {
    value: port,
    valid: Number.isSafeInteger(port) && port >= 0 && port <= 65535,
  };
}

function itemCount(list) {
  if (Array.isArray(list)) return list.length;
  if (Array.isArray(list?.items)) return list.items.length;
  if (Number.isFinite(list?.summary?.total)) return list.summary.total;
  return 0;
}

function buildNextActions(checks) {
  if (checks.some((check) => check.status === "failed")) {
    return checks
      .filter((check) => check.status === "failed")
      .map((check) => `Fix ${check.id}: ${check.message}`);
  }
  const warnings = checks.filter((check) => check.status === "warning");
  if (warnings.length) {
    return warnings.map((check) => `Review ${check.id}: ${check.message}`);
  }
  return ["Start Gateway with `npm run spruce -- gateway serve` or run the full release checklist."];
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
