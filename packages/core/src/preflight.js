import { assessWorkspaceIndexFreshness, buildWorkspaceIndex } from "./context.js";
import { nowIso } from "./id.js";

export function runPreflight(store, options = {}) {
  const startedAt = nowIso();
  const requireFreshContext = Boolean(options.requireFreshContext);
  const refreshContext = Boolean(options.refreshContext);
  const initialContextFreshness = assessWorkspaceIndexFreshness(store, {
    maxChanges: options.maxChanges,
  });
  const actions = [];
  let contextIndex = null;
  let finalContextFreshness = initialContextFreshness;

  if (refreshContext && initialContextFreshness.status !== "fresh") {
    contextIndex = buildWorkspaceIndex(store, {
      maxBytes: options.contextMaxBytes ?? options.maxBytes,
      incremental: options.incremental,
    });
    actions.push({
      id: "context.index",
      status: "completed",
      reason: `ContextOS was ${initialContextFreshness.status}; refreshContext requested an incremental index refresh.`,
      indexedAt: contextIndex.indexedAt,
      documentCount: contextIndex.documentCount,
      skippedCount: contextIndex.skippedCount,
      redactedDocumentCount: contextIndex.redactedDocumentCount,
      incremental: summarizeIncrementalIndex(contextIndex.incremental),
    });
    finalContextFreshness = assessWorkspaceIndexFreshness(store, {
      maxChanges: options.maxChanges,
    });
  }

  const blockers = [];
  const warnings = [];
  if (requireFreshContext && finalContextFreshness.status !== "fresh") {
    blockers.push({
      id: "context.freshness",
      reason: "Fresh ContextOS evidence is required, but the workspace index is stale or missing.",
      status: finalContextFreshness.status,
      summary: finalContextFreshness.summary,
    });
  } else if (finalContextFreshness.status !== "fresh") {
    warnings.push({
      id: "context.freshness",
      reason: "ContextOS evidence is stale or missing; execution may use incomplete or outdated context.",
      status: finalContextFreshness.status,
      summary: finalContextFreshness.summary,
    });
  }

  const status = blockers.length ? "blocked" : warnings.length ? "warning" : "passed";

  return {
    version: "0.1.0",
    kind: options.kind ?? "run.preflight",
    startedAt,
    completedAt: nowIso(),
    status,
    canProceed: status !== "blocked",
    policy: {
      requireFreshContext,
      refreshContext,
    },
    context: {
      initial: initialContextFreshness,
      final: finalContextFreshness,
      refreshed: Boolean(contextIndex),
      index: contextIndex
        ? {
            indexedAt: contextIndex.indexedAt,
            documentCount: contextIndex.documentCount,
            skippedCount: contextIndex.skippedCount,
            redactedDocumentCount: contextIndex.redactedDocumentCount,
          }
        : null,
    },
    actions,
    blockers,
    warnings,
    limits: [
      "Preflight v0 only checks local deterministic readiness signals.",
      "refreshContext can update the local ContextOS index, but it does not execute tools or external actions.",
      "A passed preflight does not prove task correctness; it only means configured runtime gates are satisfied.",
    ],
  };
}

function summarizeIncrementalIndex(incremental = {}) {
  return {
    enabled: Boolean(incremental.enabled),
    previousIndexedAt: incremental.previousIndexedAt ?? null,
    addedCount: incremental.addedCount ?? 0,
    changedCount: incremental.changedCount ?? 0,
    unchangedCount: incremental.unchangedCount ?? 0,
    deletedCount: incremental.deletedCount ?? 0,
    skippedCount: incremental.skippedCount ?? 0,
    reusedDocumentCount: incremental.reusedDocumentCount ?? 0,
  };
}
