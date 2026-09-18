import path from "node:path";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJsonl, storeItemPath } from "./storage.js";

export function startTrace(store, input) {
  const trace = {
    id: createId("trace"),
    goal: input.goal,
    actor: input.actor ?? "local-user",
    channel: input.channel ?? "cli",
    trustMode: input.trustMode ?? "approve",
    status: "running",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    metadata: input.metadata ?? {},
  };

  if (!trace.goal || !trace.goal.trim()) {
    throw new Error("trace goal is required");
  }

  appendJsonl(path.join(store.root, "trace-index.jsonl"), trace);
  appendTraceEvent(store, trace.id, "trace.started", { goal: trace.goal });
  return trace;
}

export function appendTraceEvent(store, traceId, type, payload = {}) {
  const event = {
    id: createId("event"),
    traceId,
    type,
    createdAt: nowIso(),
    payload,
  };
  appendJsonl(storeItemPath(store, "traces", traceId, ".jsonl"), event);
  return event;
}

export function listTraces(store) {
  return readJsonl(path.join(store.root, "trace-index.jsonl"));
}

export function readTraceEvents(store, traceId) {
  return readJsonl(storeItemPath(store, "traces", traceId, ".jsonl"));
}
