import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export const EXECUTION_TASK_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.execution-tasks",
  statuses: ["open", "in_progress", "waiting_for_human", "blocked", "completed", "cancelled"],
  safetyBoundary: [
    "Execution Tasks v0 is a durable local control-state ledger; it never launches agents, executes tools, or grants approvals.",
    "A task can name a next action and evidence references, but TrustKernel, ContextOS, readiness, and exact approvals remain the execution authorities.",
    "Waiting-for-human state requires a concrete decision gate instead of silently treating missing authority as a blocker.",
  ],
});

const STATUSES = new Set(EXECUTION_TASK_CONTRACT.statuses);

export function getExecutionTaskContract() {
  return EXECUTION_TASK_CONTRACT;
}

export function createExecutionTask(store, input = {}) {
  const goal = requiredText(input.goal, "goal", 500);
  const now = nowIso();
  const task = {
    version: EXECUTION_TASK_CONTRACT.version,
    interface: EXECUTION_TASK_CONTRACT.interface,
    id: createId("execution_task"),
    createdAt: now,
    updatedAt: now,
    createdBy: optionalText(input.actor, 120) ?? "local-user",
    goal,
    scope: optionalText(input.scope, 1000),
    status: "open",
    owner: optionalText(input.owner, 160) ?? null,
    nextAction: optionalText(input.nextAction, 500),
    humanGate: null,
    evidenceRefs: normalizeRefs(input.evidenceRefs),
    links: normalizeLinks(input.links),
    history: [{ at: now, type: "created", by: optionalText(input.actor, 120) ?? "local-user", note: "task created" }],
    limits: EXECUTION_TASK_CONTRACT.safetyBoundary,
  };
  writeTask(store, task);
  appendJsonl(indexPath(store), taskSummary(task));
  audit(store, task, "execution_task.created", { by: task.createdBy });
  return task;
}

export function getExecutionTask(store, taskId) {
  const filePath = taskPath(store, taskId);
  if (!fs.existsSync(filePath)) throw new Error(`execution task not found: ${taskId}`);
  return readJson(filePath);
}

export function listExecutionTasks(store, options = {}) {
  const tasks = readJsonl(indexPath(store))
    .map((item) => {
      try { return getExecutionTask(store, item.id); } catch { return item; }
    })
    .filter((item) => !options.status || item.status === options.status)
    .filter((item) => !options.owner || item.owner === options.owner)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  return {
    version: EXECUTION_TASK_CONTRACT.version,
    status: tasks.length ? "available" : "empty",
    createdAt: nowIso(),
    summary: summarizeTasks(tasks),
    items: tasks.map(taskSummary),
    limits: EXECUTION_TASK_CONTRACT.safetyBoundary,
  };
}

export function claimExecutionTask(store, taskId, input = {}) {
  const task = getExecutionTask(store, taskId);
  if (["completed", "cancelled"].includes(task.status)) throw new Error(`cannot claim terminal execution task: ${taskId}`);
  const owner = requiredText(input.owner ?? input.actor, "owner", 160);
  if (task.owner && task.owner !== owner) throw new Error(`execution task is already claimed by ${task.owner}`);
  return updateTask(store, task, { owner, status: task.status === "open" ? "in_progress" : task.status }, "claimed", input.actor, `claimed by ${owner}`);
}

export function updateExecutionTask(store, taskId, input = {}) {
  const task = getExecutionTask(store, taskId);
  const status = input.status === undefined ? task.status : normalizeStatus(input.status);
  const humanGate = status === "waiting_for_human"
    ? requiredText(input.humanGate ?? task.humanGate, "humanGate", 500)
    : input.humanGate === undefined ? task.humanGate : optionalText(input.humanGate, 500);
  if (status === "completed" && input.nextAction !== undefined && optionalText(input.nextAction, 500)) {
    throw new Error("completed execution task cannot retain a nextAction");
  }
  return updateTask(store, task, {
    status,
    owner: input.owner === undefined ? task.owner : optionalText(input.owner, 160),
    nextAction: status === "completed" || status === "cancelled" ? null : input.nextAction === undefined ? task.nextAction : optionalText(input.nextAction, 500),
    humanGate,
    evidenceRefs: input.evidenceRefs === undefined ? task.evidenceRefs : normalizeRefs(input.evidenceRefs),
    links: input.links === undefined ? task.links : normalizeLinks(input.links),
  }, "updated", input.actor, optionalText(input.note, 500) ?? `status ${task.status} -> ${status}`);
}

export function getExecutionTaskBoard(store) {
  const listed = listExecutionTasks(store);
  const rank = { waiting_for_human: 0, blocked: 1, in_progress: 2, open: 3, completed: 4, cancelled: 5 };
  return {
    ...listed,
    interface: "spruceagent.execution-task-board",
    attention: [...listed.items]
      .filter((item) => !["completed", "cancelled"].includes(item.status))
      .sort((a, b) => (rank[a.status] - rank[b.status]) || String(b.updatedAt).localeCompare(String(a.updatedAt))),
  };
}

function updateTask(store, task, changes, type, actor, note) {
  const now = nowIso();
  const updated = {
    ...task,
    ...changes,
    updatedAt: now,
    history: [...(task.history ?? []), { at: now, type, by: optionalText(actor, 120) ?? "local-user", note }],
  };
  writeTask(store, updated);
  appendJsonl(indexPath(store), taskSummary(updated));
  audit(store, updated, `execution_task.${type}`, { by: optionalText(actor, 120) ?? "local-user", note });
  return updated;
}

function summarizeTasks(tasks) {
  const byStatus = Object.fromEntries(EXECUTION_TASK_CONTRACT.statuses.map((status) => [status, tasks.filter((item) => item.status === status).length]));
  return { total: tasks.length, byStatus, attentionCount: tasks.filter((item) => ["waiting_for_human", "blocked"].includes(item.status)).length };
}

function taskSummary(task) {
  return { id: task.id, createdAt: task.createdAt, updatedAt: task.updatedAt, goal: task.goal, status: task.status, owner: task.owner, nextAction: task.nextAction, humanGate: task.humanGate, evidenceRefs: task.evidenceRefs, links: task.links };
}

function normalizeStatus(value) {
  const status = String(value ?? "").trim();
  if (!STATUSES.has(status)) throw new Error(`status must be one of: ${[...STATUSES].join(", ")}`);
  return status;
}
function normalizeRefs(value) { return normalizeList(value, 160, "evidenceRefs"); }
function normalizeLinks(value) { return normalizeList(value, 240, "links"); }
function normalizeList(value, limit, name) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return [...new Set(value.map((item) => optionalText(item, limit)).filter(Boolean))].slice(0, 50);
}
function requiredText(value, name, limit) { const text = optionalText(value, limit); if (!text) throw new Error(`${name} is required`); return text; }
function optionalText(value, limit) { const text = String(value ?? "").trim(); return text ? text.slice(0, limit) : null; }
function taskPath(store, id) { return path.join(store.root, "execution-tasks", `${id}.json`); }
function indexPath(store) { return path.join(store.root, "execution-task-index.jsonl"); }
function writeTask(store, task) { writeJson(taskPath(store, task.id), task); }
function audit(store, task, type, extra) { appendJsonl(path.join(store.root, "audit.jsonl"), { type, taskId: task.id, status: task.status, createdAt: nowIso(), ...extra }); }
