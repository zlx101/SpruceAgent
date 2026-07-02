import path from "node:path";
import { createId, nowIso } from "./id.js";
import { appendJsonl, readJsonl } from "./storage.js";

export function addMemory(store, input) {
  const memory = {
    id: createId("mem"),
    scope: input.scope ?? "project",
    kind: input.kind ?? "note",
    content: input.content,
    tags: input.tags ?? [],
    source: input.source ?? "cli",
    createdAt: nowIso(),
    metadata: input.metadata ?? {},
  };

  if (!memory.content || !memory.content.trim()) {
    throw new Error("memory content is required");
  }

  appendJsonl(path.join(store.root, "memory.jsonl"), memory);
  return memory;
}

export function listMemory(store) {
  return readJsonl(path.join(store.root, "memory.jsonl"));
}

export function searchMemory(store, query, options = {}) {
  const limit = Number(options.limit ?? 10);
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return [];

  return listMemory(store)
    .map((memory) => {
      const haystack = [
        memory.content,
        memory.scope,
        memory.kind,
        ...(memory.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      const score = haystack.includes(q) ? q.length : tokenScore(haystack, q);
      return { memory, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.memory);
}

function tokenScore(haystack, query) {
  return query
    .split(/\s+/)
    .filter(Boolean)
    .reduce((score, token) => score + (haystack.includes(token) ? token.length : 0), 0);
}
