import fs from "node:fs";
import path from "node:path";
import { nowIso } from "./id.js";
import { readJson, writeJson } from "./storage.js";

export const GATEWAY_RUNTIME_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.gateway-runtime",
  outputKind: "local_gateway_process_state",
  safetyBoundary: [
    "Gateway Runtime records only the local Gateway process for this SpruceAgent store.",
    "The runtime lock prevents duplicate Gateway starts for one store when the recorded process is still alive.",
    "It never kills a process, reclaims a port, starts an Agent, runs tools, or changes approval state.",
    "Stopped and stale records are retained as operational evidence and can be replaced by a new Gateway start.",
  ],
});

export function getGatewayRuntimeContract() {
  return GATEWAY_RUNTIME_CONTRACT;
}

export function getGatewayRuntimeState(store) {
  const record = readGatewayRuntimeRecord(store);
  const rawProcessAlive = record?.pid ? isProcessAlive(record.pid) : false;
  const processAlive = record?.status === "stopped" ? false : rawProcessAlive;
  const effectiveStatus = record
    ? record.status === "stopped"
      ? "stopped"
      : processAlive
        ? record.status
        : "stale"
    : "empty";
  return {
    version: GATEWAY_RUNTIME_CONTRACT.version,
    interface: GATEWAY_RUNTIME_CONTRACT.interface,
    checkedAt: nowIso(),
    status: effectiveStatus,
    processAlive,
    record: record ? redactRuntimeRecord(record) : null,
    limits: GATEWAY_RUNTIME_CONTRACT.safetyBoundary,
  };
}

export function reserveGatewayRuntime(store, input = {}) {
  const existing = getGatewayRuntimeState(store);
  if (existing.processAlive && ["starting", "running"].includes(existing.status)) {
    throw new Error(`gateway is already running for this store: pid ${existing.record.pid}`);
  }
  const now = nowIso();
  const record = {
    version: GATEWAY_RUNTIME_CONTRACT.version,
    interface: GATEWAY_RUNTIME_CONTRACT.interface,
    status: "starting",
    pid: process.pid,
    host: String(input.host ?? "127.0.0.1"),
    port: input.port === undefined ? null : Number(input.port),
    startedAt: now,
    updatedAt: now,
    stoppedAt: null,
    baseUrl: null,
    autopilotPollMs: input.autopilotPollMs === undefined || input.autopilotPollMs === null ? null : Number(input.autopilotPollMs),
    localOnly: input.localOnly === true,
  };
  writeJson(gatewayRuntimePath(store), record);
  return getGatewayRuntimeState(store);
}

export function markGatewayRuntimeRunning(store, input = {}) {
  const current = readGatewayRuntimeRecord(store) ?? {};
  const host = String(input.host ?? current.host ?? "127.0.0.1");
  const port = input.port === undefined ? current.port ?? null : Number(input.port);
  const record = {
    ...current,
    version: GATEWAY_RUNTIME_CONTRACT.version,
    interface: GATEWAY_RUNTIME_CONTRACT.interface,
    status: "running",
    pid: process.pid,
    host,
    port,
    baseUrl: port === null ? null : `http://${host}:${port}`,
    tokenPrefix: input.tokenPrefix ?? current.tokenPrefix ?? null,
    startedAt: current.startedAt ?? nowIso(),
    updatedAt: nowIso(),
    stoppedAt: null,
    autopilotPollMs: input.autopilotPollMs === undefined ? current.autopilotPollMs ?? null : input.autopilotPollMs,
    localOnly: input.localOnly === true,
  };
  writeJson(gatewayRuntimePath(store), record);
  return getGatewayRuntimeState(store);
}

export function markGatewayRuntimeStopped(store, input = {}) {
  const current = readGatewayRuntimeRecord(store);
  if (!current) return getGatewayRuntimeState(store);
  if (current.pid !== process.pid && isProcessAlive(current.pid)) {
    return getGatewayRuntimeState(store);
  }
  const stoppedAt = nowIso();
  writeJson(gatewayRuntimePath(store), {
    ...current,
    status: "stopped",
    updatedAt: stoppedAt,
    stoppedAt,
    stopReason: input.reason ?? "server_closed",
  });
  return getGatewayRuntimeState(store);
}

export function gatewayRuntimeHealth(store) {
  const state = getGatewayRuntimeState(store);
  return {
    status: state.status,
    processAlive: state.processAlive,
    pid: state.record?.pid ?? null,
    host: state.record?.host ?? null,
    port: state.record?.port ?? null,
    baseUrl: state.record?.baseUrl ?? null,
    startedAt: state.record?.startedAt ?? null,
    updatedAt: state.record?.updatedAt ?? null,
    stoppedAt: state.record?.stoppedAt ?? null,
  };
}

function readGatewayRuntimeRecord(store) {
  const filePath = gatewayRuntimePath(store);
  if (!fs.existsSync(filePath)) return null;
  try {
    return readJson(filePath);
  } catch {
    return {
      status: "corrupt",
      pid: null,
      host: null,
      port: null,
      startedAt: null,
      updatedAt: null,
      stoppedAt: null,
      baseUrl: null,
    };
  }
}

function gatewayRuntimePath(store) {
  return path.join(store.root, "runtime", "gateway.json");
}

function redactRuntimeRecord(record) {
  return {
    status: record.status,
    pid: Number.isSafeInteger(record.pid) ? record.pid : null,
    host: record.host ?? null,
    port: record.port ?? null,
    baseUrl: record.baseUrl ?? null,
    startedAt: record.startedAt ?? null,
    updatedAt: record.updatedAt ?? null,
    stoppedAt: record.stoppedAt ?? null,
    autopilotPollMs: record.autopilotPollMs ?? null,
    localOnly: record.localOnly === true,
    stopReason: record.stopReason ?? null,
  };
}

function isProcessAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}
