#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  createStore,
  ensureStore,
  getDailyLoopAttention,
  getRunDetail,
  listArtifacts,
  runGatewayOnboarding,
} from "../packages/core/src/index.js";

const keep = process.argv.includes("--keep");
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-daily-smoke-"));

try {
  fs.writeFileSync(
    path.join(workspace, "README.md"),
    [
      "# Daily Smoke Workspace",
      "",
      "TrustKernel governs every action.",
      "ContextOS retrieves local workspace context before the agent acts.",
    ].join("\n"),
    "utf8",
  );

  const store = ensureStore(createStore(workspace));
  const onboarding = await runGatewayOnboarding(store);
  const daily = getDailyLoopAttention(store);
  const traceId = onboarding.ledger?.lastDryRunTraceId ?? null;
  let detail = null;
  let detailError = null;
  if (traceId) {
    try {
      detail = getRunDetail(store, traceId);
    } catch (error) {
      detailError = error.message;
    }
  }
  const artifacts = traceId ? listArtifacts(store, { traceId }) : { items: [] };
  const openableArtifact = (artifacts.items || []).find((item) => item.id && item.kind);

  const ok = onboarding.status === "ready"
    && daily.kind !== "blocked"
    && Boolean(traceId)
    && Boolean(detail && detail.traceId === traceId)
    && !detailError
    && Boolean(openableArtifact);

  const summary = {
    ok,
    workspace,
    onboardingStatus: onboarding.status,
    dryRunToolResultCount: onboarding.dryRun?.toolResultCount ?? null,
    lastDryRunTraceId: traceId,
    daily,
    detailOpened: Boolean(detail) && !detailError,
    detailError,
    artifactId: openableArtifact?.id ?? null,
    artifactKind: openableArtifact?.kind ?? null,
    keptWorkspace: keep,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
} finally {
  if (!keep) {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}
