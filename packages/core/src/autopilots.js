import fs from "node:fs";
import path from "node:path";
import { createExecutionTask } from "./execution-tasks.js";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export const AUTOPILOT_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.autopilots",
  actionKinds: ["create_execution_task"],
  scheduleKinds: ["interval"],
  safetyBoundary: [
    "Autopilot v0 persists schedules and durable trigger evidence; it does not run a hidden background timer.",
    "A due run only creates a local open Execution Task. It never launches agents, executes tools, starts a workflow, or grants approval.",
    "Each scheduled occurrence uses a stable trigger key. Replaying the same occurrence returns the existing ledger result instead of creating another task.",
    "Rules are restricted to static human-authored task fields; no template expansion, shell interpolation, webhook dispatch, or remote side effect is performed.",
    "A hosting process may poll the due runner, but execution authority remains with the normal task, readiness, TrustKernel, and approval controls.",
    "Enabling or disabling a rule is an explicit audited mutation. A caller may require the exact last updatedAt value to avoid overwriting a newer operator decision.",
  ],
});

const MIN_INTERVAL_MINUTES = 5;
const MAX_INTERVAL_MINUTES = 10080;

export function getAutopilotContract() {
  return AUTOPILOT_CONTRACT;
}

export function createAutopilot(store, input = {}) {
  const now = parseTime(input.now, "now") ?? nowIso();
  const intervalMinutes = boundedInteger(input.intervalMinutes, "intervalMinutes");
  const firstDueAt = parseTime(input.firstDueAt, "firstDueAt") ?? addMinutes(now, intervalMinutes);
  const record = {
    version: AUTOPILOT_CONTRACT.version,
    interface: AUTOPILOT_CONTRACT.interface,
    id: createId("autopilot"),
    name: requiredText(input.name, "name", 160),
    enabled: input.enabled === undefined ? true : Boolean(input.enabled),
    schedule: {
      kind: "interval",
      intervalMinutes,
      nextDueAt: firstDueAt,
    },
    action: {
      kind: "create_execution_task",
      goal: requiredText(input.goal, "goal", 500),
      scope: optionalText(input.scope, 1000),
      nextAction: optionalText(input.nextAction, 500),
      evidenceRefs: normalizeRefs(input.evidenceRefs),
      links: normalizeLinks(input.links),
    },
    createdAt: now,
    updatedAt: now,
    createdBy: optionalText(input.actor, 120) ?? "local-user",
    lastTriggeredAt: null,
    lastTaskId: null,
    limits: AUTOPILOT_CONTRACT.safetyBoundary,
  };
  writeJson(autopilotPath(store, record.id), record);
  appendJsonl(autopilotIndexPath(store), summary(record));
  audit(store, "autopilot.created", record, { actor: record.createdBy });
  return record;
}

export function getAutopilot(store, autopilotId) {
  const filePath = autopilotPath(store, requiredId(autopilotId, "autopilotId"));
  if (!fs.existsSync(filePath)) throw new Error(`autopilot not found: ${autopilotId}`);
  return readJson(filePath);
}

export function listAutopilots(store, options = {}) {
  const items = latestAutopilots(store)
    .filter((item) => options.enabled === undefined || item.enabled === Boolean(options.enabled))
    .sort((a, b) => String(a.schedule.nextDueAt).localeCompare(String(b.schedule.nextDueAt)) || a.id.localeCompare(b.id));
  return {
    version: AUTOPILOT_CONTRACT.version,
    interface: AUTOPILOT_CONTRACT.interface,
    status: items.length ? "available" : "empty",
    createdAt: nowIso(),
    items,
    limits: AUTOPILOT_CONTRACT.safetyBoundary,
  };
}

export function listDueAutopilots(store, input = {}) {
  const at = parseTime(input.now, "now") ?? nowIso();
  const items = latestAutopilots(store)
    .filter((item) => item.enabled && item.schedule.nextDueAt <= at)
    .sort((a, b) => String(a.schedule.nextDueAt).localeCompare(String(b.schedule.nextDueAt)) || a.id.localeCompare(b.id));
  return {
    version: AUTOPILOT_CONTRACT.version,
    interface: "spruceagent.autopilot-due-list",
    evaluatedAt: at,
    items,
    limits: AUTOPILOT_CONTRACT.safetyBoundary,
  };
}

export function setAutopilotEnabled(store, autopilotId, input = {}) {
  const record = getAutopilot(store, autopilotId);
  assertAutopilotRevision(record, input);
  if (typeof input.enabled !== "boolean") throw new Error("enabled must be a boolean");
  if (record.enabled === input.enabled) return record;
  record.enabled = input.enabled;
  record.updatedAt = nowIso();
  writeJson(autopilotPath(store, record.id), record);
  appendJsonl(autopilotIndexPath(store), summary(record));
  audit(store, input.enabled ? "autopilot.enabled" : "autopilot.disabled", record, {
    actor: optionalText(input.actor, 120) ?? "local-user",
    previousEnabled: !input.enabled,
  });
  return record;
}

export function updateAutopilot(store, autopilotId, input = {}) {
  const record = getAutopilot(store, autopilotId);
  assertAutopilotRevision(record, input);
  const changes = [];
  if (input.name !== undefined) { record.name = requiredText(input.name, "name", 160); changes.push("name"); }
  if (input.intervalMinutes !== undefined) { record.schedule.intervalMinutes = boundedInteger(input.intervalMinutes, "intervalMinutes"); changes.push("intervalMinutes"); }
  if (input.nextDueAt !== undefined) { record.schedule.nextDueAt = parseTime(input.nextDueAt, "nextDueAt"); changes.push("nextDueAt"); }
  if (input.goal !== undefined) { record.action.goal = requiredText(input.goal, "goal", 500); changes.push("goal"); }
  if (input.scope !== undefined) { record.action.scope = optionalText(input.scope, 1000); changes.push("scope"); }
  if (input.nextAction !== undefined) { record.action.nextAction = optionalText(input.nextAction, 500); changes.push("nextAction"); }
  if (input.evidenceRefs !== undefined) { record.action.evidenceRefs = normalizeRefs(input.evidenceRefs); changes.push("evidenceRefs"); }
  if (input.links !== undefined) { record.action.links = normalizeLinks(input.links); changes.push("links"); }
  if (!changes.length) throw new Error("Autopilot update requires at least one editable field");
  record.updatedAt = nowIso();
  writeJson(autopilotPath(store, record.id), record);
  appendJsonl(autopilotIndexPath(store), summary(record));
  audit(store, "autopilot.updated", record, { actor: optionalText(input.actor, 120) ?? "local-user", fields: changes });
  return record;
}

export function triggerAutopilot(store, autopilotId, input = {}) {
  const record = getAutopilot(store, autopilotId);
  const triggerKey = optionalText(input.triggerKey, 240) ?? `${record.id}:${record.schedule.nextDueAt}`;
  const existing = listTriggers(store, record.id).find((item) => item.triggerKey === triggerKey);
  if (existing) return { ...existing, reused: true };
  if (!record.enabled) throw new Error(`autopilot is disabled: ${record.id}`);
  const now = parseTime(input.now, "now") ?? nowIso();
  if (record.schedule.nextDueAt > now) throw new Error(`autopilot is not due until ${record.schedule.nextDueAt}`);

  const triggerId = createId("autopilot_trigger");
  const task = createExecutionTask(store, {
    goal: record.action.goal,
    scope: record.action.scope ?? undefined,
    nextAction: record.action.nextAction ?? undefined,
    evidenceRefs: record.action.evidenceRefs,
    links: record.action.links,
    origin: {
      kind: "autopilot",
      autopilotId: record.id,
      triggerId,
      triggerKey,
      scheduledFor: record.schedule.nextDueAt,
    },
    actor: `autopilot:${record.id}`,
  });
  const trigger = {
    version: AUTOPILOT_CONTRACT.version,
    interface: "spruceagent.autopilot-trigger",
    id: triggerId,
    autopilotId: record.id,
    triggerKey,
    scheduledFor: record.schedule.nextDueAt,
    triggeredAt: now,
    actor: optionalText(input.actor, 120) ?? "local-user",
    outcome: "execution_task_created",
    taskId: task.id,
    limits: AUTOPILOT_CONTRACT.safetyBoundary,
  };
  appendJsonl(autopilotTriggerIndexPath(store), trigger);
  record.lastTriggeredAt = now;
  record.lastTaskId = task.id;
  record.schedule.nextDueAt = nextDueAt(record.schedule.nextDueAt, record.schedule.intervalMinutes, now);
  record.updatedAt = now;
  writeJson(autopilotPath(store, record.id), record);
  appendJsonl(autopilotIndexPath(store), summary(record));
  audit(store, "autopilot.triggered", record, { triggerId: trigger.id, triggerKey, taskId: task.id, actor: trigger.actor });
  return { ...trigger, reused: false };
}

export function runDueAutopilots(store, input = {}) {
  const now = parseTime(input.now, "now") ?? nowIso();
  const limit = boundedLimit(input.limit);
  const due = listDueAutopilots(store, { now }).items.slice(0, limit);
  const results = due.map((item) => {
    try {
      return triggerAutopilot(store, item.id, { now, actor: input.actor });
    } catch (error) {
      const failure = {
        id: createId("autopilot_failure"),
        autopilotId: item.id,
        outcome: "failed",
        failedAt: now,
        error: String(error?.message ?? error ?? "unknown autopilot trigger error").slice(0, 500),
      };
      appendJsonl(autopilotFailureIndexPath(store), failure);
      appendJsonl(path.join(store.root, "audit.jsonl"), {
        type: "autopilot.trigger_failed",
        autopilotId: item.id,
        failureId: failure.id,
        error: failure.error,
        createdAt: now,
      });
      return failure;
    }
  });
  const failed = results.filter((item) => item.outcome === "failed");
  return {
    version: AUTOPILOT_CONTRACT.version,
    interface: "spruceagent.autopilot-due-run",
    evaluatedAt: now,
    considered: due.length,
    results,
    failedCount: failed.length,
    limits: AUTOPILOT_CONTRACT.safetyBoundary,
  };
}

export function listAutopilotTriggers(store, autopilotId, options = {}) {
  const id = requiredId(autopilotId, "autopilotId");
  const limit = boundedLimit(options.limit);
  return {
    version: AUTOPILOT_CONTRACT.version,
    interface: "spruceagent.autopilot-triggers",
    autopilotId: id,
    items: listTriggers(store, id).sort((a, b) => String(b.triggeredAt).localeCompare(String(a.triggeredAt))).slice(0, limit),
    limits: AUTOPILOT_CONTRACT.safetyBoundary,
  };
}

export function listAutopilotFailures(store, autopilotId, options = {}) {
  const id = requiredId(autopilotId, "autopilotId");
  const limit = boundedLimit(options.limit);
  return {
    version: AUTOPILOT_CONTRACT.version,
    interface: "spruceagent.autopilot-failures",
    autopilotId: id,
    items: readJsonl(autopilotFailureIndexPath(store)).filter((item) => item.autopilotId === id).sort((a, b) => String(b.failedAt).localeCompare(String(a.failedAt))).slice(0, limit),
    limits: AUTOPILOT_CONTRACT.safetyBoundary,
  };
}

function latestAutopilots(store) {
  const latest = new Map();
  for (const item of readJsonl(autopilotIndexPath(store))) latest.set(item.id, item);
  return [...latest.values()].map((item) => {
    try { return summary(getAutopilot(store, item.id)); } catch { return item; }
  });
}

function listTriggers(store, autopilotId) {
  return readJsonl(autopilotTriggerIndexPath(store)).filter((item) => item.autopilotId === autopilotId);
}

function summary(record) {
  return {
    id: record.id,
    name: record.name,
    enabled: record.enabled,
    schedule: { ...record.schedule },
    actionKind: record.action.kind,
    goal: record.action.goal,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastTriggeredAt: record.lastTriggeredAt,
    lastTaskId: record.lastTaskId,
  };
}

function audit(store, type, record, details) {
  appendJsonl(path.join(store.root, "audit.jsonl"), {
    type,
    autopilotId: record.id,
    enabled: record.enabled,
    nextDueAt: record.schedule.nextDueAt,
    details,
    createdAt: nowIso(),
  });
}

function autopilotPath(store, id) { return path.join(store.root, "autopilots", `${id}.json`); }
function autopilotIndexPath(store) { return path.join(store.root, "autopilot-index.jsonl"); }
function autopilotTriggerIndexPath(store) { return path.join(store.root, "autopilot-trigger-index.jsonl"); }
function autopilotFailureIndexPath(store) { return path.join(store.root, "autopilot-failure-index.jsonl"); }
function addMinutes(at, minutes) { return new Date(new Date(at).getTime() + minutes * 60000).toISOString(); }
function nextDueAt(previousDueAt, intervalMinutes, now) {
  let due = previousDueAt;
  while (due <= now) due = addMinutes(due, intervalMinutes);
  return due;
}
function boundedInteger(value, name) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < MIN_INTERVAL_MINUTES || number > MAX_INTERVAL_MINUTES) {
    throw new Error(`${name} must be an integer between ${MIN_INTERVAL_MINUTES} and ${MAX_INTERVAL_MINUTES}`);
  }
  return number;
}
function boundedLimit(value) {
  if (value === undefined || value === null || value === "") return 100;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > 100) throw new Error("limit must be an integer between 1 and 100");
  return number;
}
function parseTime(value, name) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) throw new Error(`${name} must be a valid ISO timestamp`);
  return parsed.toISOString();
}
function requiredText(value, name, maximum) {
  const text = optionalText(value, maximum);
  if (!text) throw new Error(`${name} is required`);
  return text;
}
function optionalText(value, maximum) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maximum) throw new Error(`text must be at most ${maximum} characters`);
  return text;
}
function requiredId(value, name) {
  const id = String(value ?? "").trim();
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw new Error(`${name} must be a single safe identifier`);
  return id;
}
function assertAutopilotRevision(record, input) {
  if (input.ifUpdatedAt === undefined) return;
  const expected = requiredText(input.ifUpdatedAt, "ifUpdatedAt", 80);
  if (expected !== record.updatedAt) throw new Error(`autopilot revision conflict: expected ${expected}, found ${record.updatedAt}`);
}
function normalizeRefs(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("evidenceRefs must be an array");
  if (value.length > 20) throw new Error("evidenceRefs supports at most 20 entries");
  return value.map((item) => requiredText(item, "evidenceRefs entry", 500));
}
function normalizeLinks(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("links must be an array");
  if (value.length > 20) throw new Error("links supports at most 20 entries");
  return [...new Set(value.map((item) => requiredText(item, "links entry", 240)))];
}
