#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildWorkspaceIndex,
  createSkillReplayFixture,
  createStore,
  ensureStore,
  evaluateSkillCandidate,
  exportSkillPackage,
  extractSkillFromTrace,
  promoteSkillCandidate,
  replaySkillFixture,
  runAgent,
} from "../packages/core/src/index.js";

const keep = process.argv.includes("--keep");
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-alpha-smoke-"));

try {
  fs.writeFileSync(
    path.join(workspace, "README.md"),
    [
      "# Alpha Smoke Workspace",
      "",
      "TrustKernel governs safe execution through policy, approval, audit, and replayable evidence.",
      "ContextOS retrieves local workspace context before the agent acts.",
    ].join("\n"),
    "utf8",
  );

  const store = ensureStore(createStore(workspace));
  const index = buildWorkspaceIndex(store);
  const run = await runAgent(store, {
    goal: "Read TrustKernel context safely",
    contextQuery: "TrustKernel",
  });
  const candidate = extractSkillFromTrace(store, run.traceId);
  const evaluation = evaluateSkillCandidate(store, candidate.id);
  const promotion = promoteSkillCandidate(store, candidate.id, {
    evaluationId: evaluation.id,
    reason: "alpha smoke promotion",
  });
  const fixture = createSkillReplayFixture(store, candidate.id, {
    evaluationId: promotion.evaluation.id,
  });
  const replay = replaySkillFixture(store, fixture.id);
  const pkg = exportSkillPackage(store, candidate.id);

  const summary = {
    ok: replay.status === "passed",
    workspace,
    indexedDocumentCount: index.documentCount,
    traceId: run.traceId,
    candidateSkillId: candidate.id,
    approvedSkillId: promotion.skill.id,
    evaluationStatus: promotion.evaluation.status,
    replayStatus: replay.status,
    packageId: pkg.id,
    packageHash: pkg.integrity.sha256,
    keptWorkspace: keep,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!summary.ok) process.exitCode = 1;
} finally {
  if (!keep) {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
}
