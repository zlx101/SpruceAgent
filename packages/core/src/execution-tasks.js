import fs from "node:fs";
import path from "node:path";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";
import { getArtifact } from "./artifacts.js";
import { getAgentTrial } from "./agent-trials.js";
import { getFleetRun } from "./fleet-runs.js";
import { getLaunchReview } from "./launch-review.js";
import { getTaskRoute } from "./task-router.js";

export const EXECUTION_TASK_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.execution-tasks",
  statuses: ["open", "in_progress", "waiting_for_human", "blocked", "completed", "cancelled"],
  safetyBoundary: [
    "Execution Tasks v0 is a durable local control-state ledger; it never launches agents, executes tools, or grants approvals.",
    "A task can name a next action and evidence references, but TrustKernel, ContextOS, readiness, and exact approvals remain the execution authorities.",
    "Waiting-for-human state requires a concrete decision gate instead of silently treating missing authority as a blocker.",
    "A follow-up links durable control state to a terminal task; it does not reopen, rerun, or authorize the prior task.",
    "Completion evidence is captured as a read-only local snapshot for audit; it is not an approval, independent verification, or execution authority.",
  ],
});

const STATUSES = new Set(EXECUTION_TASK_CONTRACT.statuses);

export function getExecutionTaskContract() {
  return EXECUTION_TASK_CONTRACT;
}

export function createExecutionTask(store, input = {}) {
  const goal = requiredText(input.goal, "goal", 500);
  const followUpOf = input.followUpOf === undefined || input.followUpOf === null ? null : requiredTaskId(input.followUpOf, "followUpOf");
  if (followUpOf) {
    const parent = getExecutionTask(store, followUpOf);
    if (!["completed", "cancelled"].includes(parent.status)) throw new Error(`follow-up requires a terminal execution task: ${followUpOf}`);
  }
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
    followUpOf,
    nextAction: optionalText(input.nextAction, 500),
    humanGate: null,
    completion: null,
    evidenceRefs: normalizeRefs(input.evidenceRefs),
    links: normalizeLinks(input.links),
    history: [{ at: now, type: "created", by: optionalText(input.actor, 120) ?? "local-user", note: "task created" }],
    limits: EXECUTION_TASK_CONTRACT.safetyBoundary,
  };
  writeTask(store, task);
  appendJsonl(indexPath(store), taskSummary(task));
  audit(store, task, "execution_task.created", { by: task.createdBy, followUpOf });
  return task;
}

export function createExecutionTaskFollowUp(store, taskId, input = {}) {
  const parent = getExecutionTask(store, taskId);
  if (!["completed", "cancelled"].includes(parent.status)) throw new Error(`follow-up requires a terminal execution task: ${taskId}`);
  return createExecutionTask(store, { ...input, followUpOf: parent.id });
}

export function getExecutionTask(store, taskId) {
  const filePath = taskPath(store, taskId);
  if (!fs.existsSync(filePath)) throw new Error(`execution task not found: ${taskId}`);
  return readJson(filePath);
}

export function listExecutionTasks(store, options = {}) {
  const latestById = new Map();
  for (const item of readJsonl(indexPath(store))) latestById.set(item.id, item);
  const tasks = [...latestById.values()]
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
  if (["completed", "cancelled"].includes(task.status) && status !== task.status) {
    throw new Error(`cannot reopen terminal execution task: ${taskId}; create a follow-up task instead`);
  }
  const humanGate = status === "waiting_for_human"
    ? requiredText(input.humanGate ?? task.humanGate, "humanGate", 500)
    : input.humanGate === undefined ? task.humanGate : optionalText(input.humanGate, 500);
  if (status === "completed" && input.nextAction !== undefined && optionalText(input.nextAction, 500)) {
    throw new Error("completed execution task cannot retain a nextAction");
  }
  const evidenceRefs = input.evidenceRefs === undefined ? task.evidenceRefs : normalizeRefs(input.evidenceRefs);
  const links = input.links === undefined ? task.links : normalizeLinks(input.links);
  const completionRecordedAt = nowIso();
  const completion = status === "completed"
    ? task.completion ?? {
      summary: requiredText(input.completionSummary, "completionSummary", 500),
      recordedAt: completionRecordedAt,
      recordedBy: optionalText(input.actor, 120) ?? "local-user",
      evidenceSnapshot: captureEvidence(store, { ...task, evidenceRefs, links }, completionRecordedAt),
    }
    : null;
  return updateTask(store, task, {
    status,
    owner: input.owner === undefined ? task.owner : optionalText(input.owner, 160),
    nextAction: status === "completed" || status === "cancelled" ? null : input.nextAction === undefined ? task.nextAction : optionalText(input.nextAction, 500),
    humanGate,
    completion,
    evidenceRefs,
    links,
  }, "updated", input.actor, optionalText(input.note, 500) ?? `status ${task.status} -> ${status}`);
}

export function getExecutionTaskBoard(store) {
  const listed = listExecutionTasks(store);
  const rank = { waiting_for_human: 0, blocked: 1, in_progress: 2, open: 3, completed: 4, cancelled: 5 };
  const active = listed.items.filter((item) => !["completed", "cancelled"].includes(item.status));
  return {
    ...listed,
    interface: "spruceagent.execution-task-board",
    attention: [...active]
      .sort((a, b) => (rank[a.status] - rank[b.status]) || String(b.updatedAt).localeCompare(String(a.updatedAt))),
    evidenceAttention: active.map((item) => {
      const evidence = getExecutionTaskEvidence(store, item.id);
      const issues = evidence.links.filter((link) => ["missing", "unsupported"].includes(link.status));
      return issues.length ? { taskId: item.id, goal: item.goal, status: item.status, issues } : null;
    }).filter(Boolean),
    closureAttention: listed.items.map((item) => completionDiagnostic(item)).filter(Boolean),
  };
}

export function getExecutionTaskEvidence(store, taskId) {
  const task = getExecutionTask(store, taskId);
  return captureEvidence(store, task, nowIso());
}

export function getExecutionTaskClosure(store, taskId) {
  const task = getExecutionTask(store, taskId);
  const diagnostic = completionDiagnostic(task);
  return {
    version: EXECUTION_TASK_CONTRACT.version,
    interface: "spruceagent.execution-task-closure",
    taskId: task.id,
    status: task.status,
    completion: task.completion ?? null,
    diagnostic: diagnostic?.diagnostic ?? null,
    limits: EXECUTION_TASK_CONTRACT.safetyBoundary,
  };
}

function captureEvidence(store, task, capturedAt) {
  return {
    version: EXECUTION_TASK_CONTRACT.version,
    interface: "spruceagent.execution-task-evidence",
    taskId: task.id,
    capturedAt,
    links: task.links.map((link) => resolveLink(store, link)),
    evidenceRefs: task.evidenceRefs.map((ref) => ({ ref, status: "declared", authority: "reference_only" })),
    limits: EXECUTION_TASK_CONTRACT.safetyBoundary,
  };
}

function completionDiagnostic(task) {
  if (task.status !== "completed") return null;
  const snapshot = task.completion?.evidenceSnapshot;
  if (!snapshot) return {
    taskId: task.id,
    goal: task.goal,
    status: task.status,
    diagnostic: { code: "completion_evidence_snapshot_missing", message: "This completed task predates completion evidence snapshots." },
  };
  const issues = snapshot.links.filter((link) => ["missing", "unsupported"].includes(link.status));
  return issues.length ? {
    taskId: task.id,
    goal: task.goal,
    status: task.status,
    diagnostic: { code: "completion_evidence_snapshot_issues", issues },
  } : null;
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
  return { id: task.id, createdAt: task.createdAt, updatedAt: task.updatedAt, goal: task.goal, status: task.status, owner: task.owner, followUpOf: task.followUpOf ?? null, nextAction: task.nextAction, humanGate: task.humanGate, completion: task.completion ?? null, evidenceRefs: task.evidenceRefs, links: task.links };
}

function normalizeStatus(value) {
  const status = String(value ?? "").trim();
  if (!STATUSES.has(status)) throw new Error(`status must be one of: ${[...STATUSES].join(", ")}`);
  return status;
}
function normalizeRefs(value) { return normalizeList(value, 160, "evidenceRefs"); }
function normalizeLinks(value) { return normalizeList(value, 240, "links"); }
function resolveLink(store, link) {
  const match = /^(artifact|agent_trial|fleet_run|launch_review|task_route):(.+)$/.exec(link);
  if (!match) return { link, status: "unsupported", authority: "reference_only", message: "Use a typed local link such as artifact:<id> or agent_trial:<id>." };
  const [, kind, id] = match;
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) return { link, kind, id, status: "unsupported", authority: "reference_only", message: "Typed local link IDs must be a single safe identifier." };
  const readers = { artifact: getArtifact, agent_trial: getAgentTrial, fleet_run: getFleetRun, launch_review: getLaunchReview, task_route: getTaskRoute };
  try {
    const record = readers[kind](store, id);
    return { link, kind, id, status: "resolved", recordStatus: record.status ?? null, authority: "reference_only" };
  } catch (error) {
    return { link, kind, id, status: "missing", authority: "reference_only", message: error.message };
  }
}
function normalizeList(value, limit, name) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${name} must be an array`);
  return [...new Set(value.map((item) => optionalText(item, limit)).filter(Boolean))].slice(0, 50);
}
function requiredText(value, name, limit) { const text = optionalText(value, limit); if (!text) throw new Error(`${name} is required`); return text; }
function optionalText(value, limit) { const text = String(value ?? "").trim(); return text ? text.slice(0, limit) : null; }
function requiredTaskId(value, name = "taskId") {
  const id = requiredText(value, name, 160);
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) throw new Error(`${name} must be a single safe identifier`);
  return id;
}
function taskPath(store, id) { return path.join(store.root, "execution-tasks", `${requiredTaskId(id)}.json`); }
function indexPath(store) { return path.join(store.root, "execution-task-index.jsonl"); }
function writeTask(store, task) { writeJson(taskPath(store, task.id), task); }
function audit(store, task, type, extra) { appendJsonl(path.join(store.root, "audit.jsonl"), { type, taskId: task.id, status: task.status, createdAt: nowIso(), ...extra }); }
