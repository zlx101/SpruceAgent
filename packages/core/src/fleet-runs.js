import fs from "node:fs";
import path from "node:path";
import {
  approveTicket,
  consumeApprovalTicket,
  getApprovalTicket,
  rejectTicket,
} from "./approvals.js";
import { launchAgentWorkspace } from "./agent-launcher.js";
import { prepareAgentWorkspace } from "./agent-workspaces.js";
import { redactExternalCliOutput } from "./external-cli-launcher.js";
import { createId, nowIso } from "./id.js";
import { createLaunchReview } from "./launch-review.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";
import { getTaskRoute } from "./task-router.js";
import { appendTraceEvent, readTraceEvents, startTrace } from "./trace.js";

export const FLEET_RUN_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.fleet-runs",
  sourceKind: "executable_task_route",
  outputKind: "reviewable_parallel_agent_candidates",
  statuses: [
    "preparing",
    "prepared",
    "preparation_failed",
    "awaiting_approval",
    "approval_partial",
    "approved",
    "running",
    "cancelling",
    "cancelled",
    "completed",
    "partial_failure",
    "failed",
  ],
  safetyBoundary: [
    "Fleet Run v0 creates comparable candidates for one routed role and one approved goal.",
    "It supports codex-cli only; each candidate receives its own prepared Git worktree.",
    "Candidate count is limited to five and active parallelism is limited to three.",
    "Every candidate invocation requires its own exact Agent Launcher approval ticket.",
    "Batch approval requires an explicit confirmation phrase and reason; it never occurs during fleet creation.",
    "Cancellation prevents pending candidates and terminates active process trees when running in the same Gateway process.",
    "Cancellation does not delete worktrees or changes; evidence remains available for audit and manual cleanup.",
    "Completion creates a Launch Review evidence matrix but never selects, commits, merges, pushes, or promotes a winner.",
  ],
});

const MAX_CANDIDATES = 5;
const MAX_PARALLEL = 3;
const ACTIVE_FLEETS = new Map();

export function getFleetRunContract() {
  return FLEET_RUN_CONTRACT;
}

export function createFleetRun(store, input = {}) {
  const routeId = String(input.routeId ?? "").trim();
  if (!routeId) throw new Error("routeId is required");
  const route = getTaskRoute(store, routeId);
  if (route.mode !== "execute" || route.status !== "routed") {
    throw new Error("fleet run requires a routed execute-mode Task Route");
  }

  const role = selectRole(route, input.role);
  const assignment = route.assignments.find((item) => item.role === role);
  if (assignment?.status !== "routed" || !assignment.selectedAdapterId) {
    throw new Error(`task route role is not executable: ${role}`);
  }
  if (assignment.selectedAdapterId !== "codex-cli") {
    throw new Error("Fleet Run v0 supports codex-cli candidates only");
  }

  const candidateCount = boundedInteger(input.candidateCount, 2, 1, MAX_CANDIDATES, "candidateCount");
  const maxParallel = boundedInteger(
    input.maxParallel,
    Math.min(2, candidateCount),
    1,
    Math.min(MAX_PARALLEL, candidateCount),
    "maxParallel",
  );
  const fleetRunId = createId("fleet_run");
  const createdAt = nowIso();
  const trace = startTrace(store, {
    goal: `Fleet ${role}: ${route.goal}`,
    actor: input.actor ?? "local-user",
    channel: input.channel ?? "fleet-runner",
    trustMode: input.trustMode ?? "approve",
    metadata: {
      kind: "fleet.run",
      fleetRunId,
      routeId,
      role,
      adapterId: assignment.selectedAdapterId,
    },
  });
  const record = {
    version: FLEET_RUN_CONTRACT.version,
    interface: FLEET_RUN_CONTRACT.interface,
    id: fleetRunId,
    routeId,
    traceId: trace.id,
    createdAt,
    updatedAt: createdAt,
    createdBy: input.actor ?? "local-user",
    status: "preparing",
    goal: route.goal,
    role,
    adapterId: assignment.selectedAdapterId,
    candidateCount,
    maxParallel,
    contextQuery: input.contextQuery ? String(input.contextQuery) : null,
    executionLimits: null,
    units: Array.from({ length: candidateCount }, (_, index) => ({
      id: `${fleetRunId}_candidate_${index + 1}`,
      ordinal: index + 1,
      status: "pending_preparation",
      workspaceId: null,
      workspacePath: null,
      branchName: null,
      approvalLaunchId: null,
      approvalId: null,
      launchId: null,
      startedAt: null,
      finishedAt: null,
      exitCode: null,
      terminationReason: null,
      error: null,
    })),
    review: null,
    cancellation: {
      requested: false,
      requestedAt: null,
      requestedBy: null,
      reason: null,
      activeAbortCount: 0,
    },
    summary: summarizeUnits([]),
    limits: FLEET_RUN_CONTRACT.safetyBoundary,
  };
  record.summary = summarizeUnits(record.units);
  persistNewFleet(store, record);
  appendTraceEvent(store, trace.id, "fleet.run.preparing", fleetEvent(record));

  for (const unit of record.units) {
    try {
      const workspace = prepareAgentWorkspace(store, {
        adapterId: record.adapterId,
        goal: record.goal,
        contextQuery: record.contextQuery ?? undefined,
        branchName: fleetBranchName(record, unit),
        actor: record.createdBy,
      });
      unit.status = "prepared";
      unit.workspaceId = workspace.id;
      unit.workspacePath = workspace.workspacePath;
      unit.branchName = workspace.isolation.branchName;
    } catch (error) {
      unit.status = "preparation_failed";
      unit.error = safeError(error);
      record.status = "preparation_failed";
      updateFleet(store, record, "fleet.run.preparation_failed");
      return record;
    }
    updateFleet(store, record, "fleet.run.candidate_prepared", { unitId: unit.id });
  }

  record.status = "prepared";
  updateFleet(store, record, "fleet.run.prepared");
  return record;
}

export async function requestFleetRunApprovals(store, fleetRunId, input = {}, runtime = {}) {
  const record = getFleetRun(store, fleetRunId);
  if (!new Set(["prepared", "approval_partial"]).has(record.status)) {
    throw new Error(`fleet run is not ready for approval requests: ${record.status}`);
  }

  for (const unit of record.units.filter((item) => new Set(["prepared", "approval_failed"]).has(item.status))) {
    unit.error = null;
    try {
      const launch = await launchAgentWorkspace(store, {
        workspaceId: unit.workspaceId,
        execute: true,
        trustMode: input.trustMode ?? "approve",
        actor: input.actor ?? record.createdBy,
        timeoutMs: input.timeoutMs,
        maxBuffer: input.maxBuffer,
      }, runtime);
      unit.approvalLaunchId = launch.id;
      unit.approvalId = launch.approval?.id ?? null;
      record.executionLimits ??= launch.invocation?.executionLimits ?? null;
      unit.status = launch.status === "requires_approval" ? "awaiting_approval" : "approval_failed";
      if (!unit.approvalId) unit.error = `unexpected launcher status: ${launch.status}`;
    } catch (error) {
      unit.status = "approval_failed";
      unit.error = safeError(error);
    }
    updateFleet(store, record, "fleet.run.approval_requested", { unitId: unit.id });
  }

  record.status = record.units.every((item) => item.status === "awaiting_approval")
    ? "awaiting_approval"
    : "approval_partial";
  updateFleet(store, record, "fleet.run.approvals_ready");
  return record;
}

export function approveFleetRun(store, fleetRunId, input = {}) {
  const record = getFleetRun(store, fleetRunId);
  if (record.status !== "awaiting_approval") {
    throw new Error(`fleet run is not awaiting approval: ${record.status}`);
  }
  if (input.confirmation !== "approve_all_invocations") {
    throw new Error("confirmation must equal approve_all_invocations");
  }
  const reason = String(input.reason ?? "").trim();
  if (reason.length < 8) throw new Error("batch approval reason must contain at least 8 characters");
  const actor = input.actor ?? "local-user";

  for (const unit of record.units) {
    const ticket = getApprovalTicket(store, unit.approvalId);
    if (ticket.status !== "pending") throw new Error(`fleet approval is not pending: ${ticket.id}`);
    if (ticket.metadata?.workspaceId !== unit.workspaceId) {
      throw new Error(`fleet approval workspace mismatch: ${ticket.id}`);
    }
  }
  for (const unit of record.units) {
    approveTicket(store, unit.approvalId, { reason, resolvedBy: actor });
    unit.status = "approved";
  }
  record.status = "approved";
  updateFleet(store, record, "fleet.run.approved", { actor, reason });
  return record;
}

export async function executeFleetRun(store, fleetRunId, input = {}, runtime = {}) {
  const record = getFleetRun(store, fleetRunId);
  if (record.status !== "approved") {
    throw new Error(`fleet run is not approved for execution: ${record.status}`);
  }
  if (ACTIVE_FLEETS.has(record.id)) throw new Error(`fleet run is already active: ${record.id}`);

  const active = { record, controllers: new Map() };
  ACTIVE_FLEETS.set(record.id, active);
  record.status = "running";
  updateFleet(store, record, "fleet.run.started");

  let cursor = 0;
  const worker = async () => {
    while (cursor < record.units.length) {
      const unit = record.units[cursor];
      cursor += 1;
      if (record.cancellation.requested) {
        unit.status = "cancelled";
        unit.terminationReason = "cancelled_before_start";
        updateFleet(store, record, "fleet.run.candidate_cancelled", { unitId: unit.id });
        continue;
      }
      const controller = new AbortController();
      active.controllers.set(unit.id, controller);
      unit.status = "running";
      unit.startedAt = nowIso();
      updateFleet(store, record, "fleet.run.candidate_started", { unitId: unit.id });
      try {
        const launch = await launchAgentWorkspace(store, {
          workspaceId: unit.workspaceId,
          execute: true,
          approvalId: unit.approvalId,
          trustMode: input.trustMode ?? "approve",
          actor: input.actor ?? record.createdBy,
          timeoutMs: record.executionLimits?.timeoutMs,
          maxBuffer: record.executionLimits?.maxBuffer,
          signal: controller.signal,
        }, runtime);
        unit.launchId = launch.id;
        unit.exitCode = launch.exitCode;
        unit.terminationReason = launch.terminationReason;
        unit.status = launch.terminationReason === "cancelled"
          ? "cancelled"
          : launch.status === "completed"
            ? "completed"
            : "failed";
      } catch (error) {
        unit.status = controller.signal.aborted ? "cancelled" : "failed";
        unit.terminationReason = controller.signal.aborted ? "cancelled" : "launcher_error";
        unit.error = safeError(error);
      } finally {
        unit.finishedAt = nowIso();
        active.controllers.delete(unit.id);
        updateFleet(store, record, "fleet.run.candidate_finished", { unitId: unit.id });
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: record.maxParallel }, () => worker()));
    const launchIds = record.units.map((unit) => unit.launchId).filter(Boolean);
    if (launchIds.length) {
      const review = createLaunchReview(store, {
        launchIds,
        actor: input.actor ?? record.createdBy,
      });
      record.review = {
        id: review.id,
        status: review.status,
        candidateCount: review.candidateCount,
        comparison: review.comparison,
      };
    }
    record.status = finalFleetStatus(record);
    updateFleet(store, record, "fleet.run.finished");
    return record;
  } finally {
    ACTIVE_FLEETS.delete(record.id);
  }
}

export function cancelFleetRun(store, fleetRunId, input = {}) {
  const active = ACTIVE_FLEETS.get(fleetRunId);
  const record = active?.record ?? getFleetRun(store, fleetRunId);
  if (new Set(["completed", "partial_failure", "failed", "cancelled"]).has(record.status)) {
    throw new Error(`fleet run is already terminal: ${record.status}`);
  }
  const reason = String(input.reason ?? "").trim();
  if (!reason) throw new Error("cancellation reason is required");

  record.cancellation = {
    requested: true,
    requestedAt: nowIso(),
    requestedBy: input.actor ?? "local-user",
    reason,
    activeAbortCount: active?.controllers.size ?? 0,
  };
  for (const controller of active?.controllers.values() ?? []) controller.abort();
  revokeUnusedApprovals(store, record);
  record.status = active ? "cancelling" : "cancelled";
  for (const unit of record.units) {
    if (new Set(["pending_preparation", "prepared", "awaiting_approval", "approved"]).has(unit.status)) {
      unit.status = "cancelled";
      unit.terminationReason = "cancelled_before_start";
    }
  }
  updateFleet(store, record, "fleet.run.cancel_requested");
  return structuredClone(record);
}

export function getFleetRun(store, fleetRunId) {
  if (!fleetRunId) throw new Error("fleetRunId is required");
  const filePath = fleetPath(store, fleetRunId);
  if (!fs.existsSync(filePath)) throw new Error(`fleet run not found: ${fleetRunId}`);
  return readJson(filePath);
}

/**
 * Return a compact, polling-friendly view of a Fleet Run. This is deliberately
 * derived from the audit trace rather than keeping a second mutable progress
 * store, so operators see the same evidence that is available for review.
 */
export function getFleetRunProgress(store, fleetRunId, options = {}) {
  const record = getFleetRun(store, fleetRunId);
  const after = String(options.after ?? "").trim();
  const fleetEvents = readTraceEvents(store, record.traceId)
    .filter((event) => event.type.startsWith("fleet.run."));
  const cursorIndex = after ? fleetEvents.findIndex((event) => event.id === after) : -1;
  const events = (cursorIndex >= 0 ? fleetEvents.slice(cursorIndex + 1) : fleetEvents)
    .map((event) => ({
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      unitId: event.payload?.unitId ?? null,
      status: event.payload?.status ?? null,
    }));
  const units = record.units.map((unit) => ({
    id: unit.id,
    ordinal: unit.ordinal,
    status: unit.status,
    startedAt: unit.startedAt ?? null,
    finishedAt: unit.finishedAt ?? null,
    exitCode: unit.exitCode ?? null,
    terminationReason: unit.terminationReason ?? null,
    error: unit.error ?? null,
  }));
  const active = units.filter((unit) => unit.status === "running");
  const latestEvent = events.at(-1) ?? null;
  return {
    version: FLEET_RUN_CONTRACT.version,
    fleetRunId: record.id,
    status: record.status,
    updatedAt: record.updatedAt,
    isActive: new Set(["running", "cancelling"]).has(record.status),
    progress: {
      completed: record.summary.completedCount,
      failed: record.summary.failedCount,
      cancelled: record.summary.cancelledCount,
      active: active.length,
      pending: units.filter((unit) => ["prepared", "approved"].includes(unit.status)).length,
      total: units.length,
    },
    units,
    events,
    cursor: (latestEvent?.id ?? after) || null,
  };
}

export function listFleetRuns(store, options = {}) {
  const seen = new Set();
  const items = readJsonl(fleetIndexPath(store))
    .filter((item) => !seen.has(item.id) && seen.add(item.id))
    .map((item) => {
      try {
        return getFleetRun(store, item.id);
      } catch {
        return item;
      }
    })
    .filter((item) => !options.status || item.status === options.status)
    .filter((item) => !options.routeId || item.routeId === options.routeId)
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
  return {
    version: FLEET_RUN_CONTRACT.version,
    createdAt: nowIso(),
    status: items.length ? "available" : "empty",
    summary: {
      total: items.length,
      activeCount: items.filter((item) => new Set(["running", "cancelling"]).has(item.status)).length,
      awaitingApprovalCount: items.filter((item) => item.status === "awaiting_approval").length,
      completedCount: items.filter((item) => item.status === "completed").length,
      failedCount: items.filter((item) => new Set(["preparation_failed", "approval_partial", "partial_failure", "failed"]).has(item.status)).length,
      cancelledCount: items.filter((item) => item.status === "cancelled").length,
    },
    items: items.map(fleetListItem),
    limits: FLEET_RUN_CONTRACT.safetyBoundary,
  };
}

function selectRole(route, requestedRole) {
  if (requestedRole) return String(requestedRole).trim();
  const coding = route.assignments.find((item) => item.role === "coding" && item.status === "routed");
  if (coding) return "coding";
  const codex = route.assignments.find((item) => item.status === "routed" && item.selectedAdapterId === "codex-cli");
  if (!codex) throw new Error("task route has no routed codex-cli role");
  return codex.role;
}

function fleetBranchName(record, unit) {
  const suffix = record.id.split("_").at(-1).slice(-8);
  return `codex/fleet-${suffix}-${record.role}-${unit.ordinal}`;
}

function finalFleetStatus(record) {
  const completed = record.units.filter((item) => item.status === "completed").length;
  const cancelled = record.units.filter((item) => item.status === "cancelled").length;
  if (cancelled === record.units.length) return "cancelled";
  if (completed === record.units.length) return "completed";
  if (completed > 0) return "partial_failure";
  return record.cancellation.requested ? "cancelled" : "failed";
}

function revokeUnusedApprovals(store, record) {
  for (const unit of record.units) {
    if (!unit.approvalId || unit.status === "running" || unit.launchId) continue;
    try {
      const ticket = getApprovalTicket(store, unit.approvalId);
      if (ticket.status === "pending") rejectTicket(store, ticket.id, {
        reason: "Fleet run cancelled before execution.",
        resolvedBy: "fleet-runner",
      });
      if (ticket.status === "approved") consumeApprovalTicket(store, ticket.id);
    } catch {
      // Cancellation remains best-effort if an approval already became terminal.
    }
  }
}

function persistNewFleet(store, record) {
  writeJson(fleetPath(store, record.id), record);
  appendJsonl(fleetIndexPath(store), {
    id: record.id,
    routeId: record.routeId,
    traceId: record.traceId,
    createdAt: record.createdAt,
    role: record.role,
    adapterId: record.adapterId,
  });
  appendAudit(store, "fleet.run.created", record);
}

function updateFleet(store, record, eventType, details = {}) {
  record.updatedAt = nowIso();
  record.summary = summarizeUnits(record.units);
  writeJson(fleetPath(store, record.id), record);
  appendTraceEvent(store, record.traceId, eventType, {
    ...fleetEvent(record),
    ...details,
  });
  appendAudit(store, eventType, record, details);
}

function appendAudit(store, type, record, details = {}) {
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type,
    fleetRunId: record.id,
    routeId: record.routeId,
    status: record.status,
    summary: record.summary,
    details,
    createdAt: nowIso(),
  });
}

function fleetEvent(record) {
  return {
    fleetRunId: record.id,
    routeId: record.routeId,
    status: record.status,
    role: record.role,
    adapterId: record.adapterId,
    candidateCount: record.candidateCount,
    maxParallel: record.maxParallel,
    summary: record.summary,
    reviewId: record.review?.id ?? null,
  };
}

function summarizeUnits(units) {
  return {
    total: units.length,
    byStatus: units.reduce((counts, unit) => {
      counts[unit.status] = (counts[unit.status] ?? 0) + 1;
      return counts;
    }, {}),
    completedCount: units.filter((item) => item.status === "completed").length,
    failedCount: units.filter((item) => new Set(["preparation_failed", "approval_failed", "failed"]).has(item.status)).length,
    cancelledCount: units.filter((item) => item.status === "cancelled").length,
  };
}

function fleetListItem(record) {
  return {
    id: record.id,
    routeId: record.routeId,
    traceId: record.traceId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
    goal: record.goal,
    role: record.role,
    adapterId: record.adapterId,
    candidateCount: record.candidateCount,
    maxParallel: record.maxParallel,
    summary: record.summary,
    reviewId: record.review?.id ?? null,
  };
}

function fleetPath(store, fleetRunId) {
  return path.join(store.root, "fleet-runs", `${fleetRunId}.json`);
}

function fleetIndexPath(store) {
  return path.join(store.root, "fleet-run-index.jsonl");
}

function safeError(error) {
  return redactExternalCliOutput(String(error?.message ?? error ?? "unknown error")).slice(0, 2000);
}

function boundedInteger(value, fallback, minimum, maximum, name) {
  const number = value === undefined || value === null || value === "" ? fallback : Number(value);
  if (!Number.isSafeInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}`);
  }
  return number;
}
