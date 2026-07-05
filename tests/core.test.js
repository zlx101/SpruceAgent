import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  addMemory,
  archiveWorkflow,
  assessRunRisk,
  assessWorkspaceIndexFreshness,
  approveSkill,
  approveTicket,
  buildWorkspaceIndex,
  createContextPack,
  createSourceMap,
  createApprovalTicket,
  createAgentAdapterRunPlan,
  createSkillReplayFixture,
  createStore,
  createWorkflow,
  createWorkflowFromDraft,
  ensureStore,
  ensureGatewayToken,
  evaluatePolicy,
  evaluateSkillCandidate,
  evaluateTrace,
  exportSkillPackage,
  executeApprovedCandidateStep,
  executeTool,
  extractSkillFromTrace,
  compileExecutableSteps,
  createDeepSeekLlmProvider,
  createGatewayClient,
  createOpenAiCompatibleLlmProvider,
  draftWorkflow,
  draftLlmPlan,
  executeCandidatePlan,
  getEvaluation,
  getApprovedSkill,
  getApprovalQueue,
  getApprovalQueueContract,
  getArtifact,
  getArtifactContract,
  getAgentAdapter,
  getAgentAdapterContract,
  getAgentLaunch,
  getAgentLauncherContract,
  getAgentWorkspace,
  getAgentWorkspaceContract,
  getIndexedDocument,
  getApprovalTicket,
  getGatewayRouteContract,
  getLlmAdapterContract,
  getCandidateApprovalContract,
  getCandidateExecutionContract,
  getPlannerPromotionContract,
  getRunInbox,
  getRunInboxContract,
  getRunContinuationContract,
  getRunDetail,
  getRunDetailContract,
  getTraceReport,
  getTraceReportContract,
  getSkillEvaluation,
  getSkillEvaluationContract,
  getSkillPackage,
  getSkillPackageContract,
  getSkillPackageImport,
  getSkillPromotionContract,
  getSkillReplayContract,
  getSkillReplayFixture,
  getSkillReplayResult,
  getSkillVersion,
  getWorkflowDetailContract,
  getWorkflowBuilderContract,
  getWorkflowInbox,
  getWorkflowInboxContract,
  getWorkflowVersion,
  getWorkflowRunDetail,
  getWorkflowContinuationContract,
  listArtifacts,
  listAgentAdapters,
  listAgentLaunches,
  listAgentWorkspaces,
  listTools,
  listEvaluations,
  listSkillEvaluations,
  listSkillPackageImports,
  listSkillPackages,
  listSkillReplayFixtures,
  listSkillReplayResults,
  listSkillVersions,
  listSkills,
  listWorkflowVersions,
  listWorkflows,
  normalizeWorkflowDraft,
  proposeSkill,
  promoteSkillCandidate,
  prepareAgentWorkspace,
  launchAgentWorkspace,
  importSkillPackage,
  promoteLlmDraftToCandidatePlan,
  requestCandidateApprovals,
  readTraceEvents,
  rejectTicket,
  resumeAgentRun,
  resumeWorkflowRun,
  replaySkillFixture,
  restoreSkillVersion,
  restoreWorkflowVersion,
  runDoctor,
  runAgent,
  runPreflight,
  runWorkflow,
  searchWorkspaceContext,
  searchMemory,
  startGatewayServer,
  verifyGatewayToken,
  startTrace,
  updateWorkflow,
} from "../packages/core/src/index.js";

test("workspace store initializes core files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  assert.ok(fs.existsSync(path.join(store.root, "config.json")));
  assert.ok(fs.existsSync(path.join(store.root, "memory.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "trace-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "approval-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "evaluation-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-evaluation-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-version-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-replay-fixture-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-replay-result-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-package-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-package-import-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "agent-workspace-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "agent-launch-index.jsonl")));
  assert.ok(fs.existsSync(path.join(store.root, "evaluations")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-evaluations")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-history")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-replay-fixtures")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-replay-results")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-packages")));
  assert.ok(fs.existsSync(path.join(store.root, "skill-imports")));
  assert.ok(fs.existsSync(path.join(store.root, "agent-workspaces")));
  assert.ok(fs.existsSync(path.join(store.root, "agent-launches")));
  assert.ok(fs.existsSync(path.join(store.root, "worktrees")));
});

test("doctor reports alpha readiness without failed checks", () => {
  const report = runDoctor(path.resolve("."));

  assert.equal(report.version, "0.1.0");
  assert.equal(report.summary.failedCount, 0);
  assert.ok(["passed", "warning"].includes(report.status));
  assert.ok(report.checks.some((check) => check.id === "node.version" && check.status === "passed"));
  assert.ok(report.checks.some((check) => check.id === "store.temp" && check.status === "passed"));
});

test("memory add and search works", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  addMemory(store, {
    content: "SpruceAgent serves future super individuals and super teams.",
    tags: ["positioning"],
  });

  const results = searchMemory(store, "super teams");
  assert.equal(results.length, 1);
  assert.equal(results[0].scope, "project");
});

test("trace starts with a started event", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const trace = startTrace(store, { goal: "test trace" });
  assert.match(trace.id, /^trace_/);
  assert.equal(trace.status, "running");
  assert.ok(fs.existsSync(path.join(store.root, "traces", `${trace.id}.jsonl`)));
});

test("policy flags destructive shell commands", () => {
  const decision = evaluatePolicy({
    toolName: "shell.execute",
    trustMode: "approve",
    input: { command: "rm -rf ." },
  });

  assert.equal(decision.decision, "requires_approval");
  assert.equal(decision.riskLevel, "critical");
});

test("builtin tool registry exposes core planes", () => {
  const names = listTools().map((tool) => tool.name);
  assert.ok(names.includes("file.read"));
  assert.ok(names.includes("shell.execute"));
  assert.ok(names.includes("memory.add"));
  assert.ok(names.includes("skill.propose"));
});

test("tool execution automatically runs low-risk reads", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "hello spruce", "utf8");

  const result = await executeTool(store, {
    toolName: "file.read",
    trustMode: "approve",
    input: { path: "README.md" },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.output.content, "hello spruce");
});

test("tool execution blocks approval-required tools until approved", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const result = await executeTool(store, {
    toolName: "file.write",
    trustMode: "approve",
    input: { path: "out.txt", content: "blocked" },
  });

  assert.equal(result.status, "requires_approval");
  assert.match(result.approval.id, /^approval_/);
  assert.equal(fs.existsSync(path.join(dir, "out.txt")), false);
});

test("tool execution runs approved medium-risk writes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const result = await executeTool(store, {
    toolName: "file.write",
    trustMode: "approve",
    approved: true,
    input: { path: "out.txt", content: "written" },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(fs.readFileSync(path.join(dir, "out.txt"), "utf8"), "written");
});

test("observe mode denies write tools", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const result = await executeTool(store, {
    toolName: "file.write",
    trustMode: "observe",
    approved: true,
    input: { path: "out.txt", content: "blocked" },
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.decision.decision, "deny");
});

test("tool execution appends trace events", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "traceable", "utf8");
  const trace = startTrace(store, { goal: "read file" });

  await executeTool(store, {
    toolName: "file.read",
    traceId: trace.id,
    input: { path: "README.md" },
  });

  const events = readTraceEvents(store, trace.id);
  assert.ok(events.some((event) => event.type === "tool.policy"));
  assert.ok(events.some((event) => event.type === "tool.result"));
});

test("approval ticket can authorize matching tool execution", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const blocked = await executeTool(store, {
    toolName: "file.write",
    trustMode: "approve",
    input: { path: "approved.txt", content: "ok" },
  });
  assert.equal(blocked.status, "requires_approval");

  const approved = approveTicket(store, blocked.approval.id);
  assert.equal(approved.status, "approved");

  const result = await executeTool(store, {
    toolName: "file.write",
    trustMode: "approve",
    approvalId: blocked.approval.id,
    input: { path: "approved.txt", content: "ok" },
  });

  assert.equal(result.status, "succeeded");
  assert.equal(fs.readFileSync(path.join(dir, "approved.txt"), "utf8"), "ok");
  assert.equal(getApprovalTicket(store, blocked.approval.id).status, "consumed");
});

test("approval ticket rejects mismatched tool input", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const blocked = await executeTool(store, {
    toolName: "file.write",
    input: { path: "approved.txt", content: "ok" },
  });
  approveTicket(store, blocked.approval.id);

  await assert.rejects(
    () => executeTool(store, {
      toolName: "file.write",
      approvalId: blocked.approval.id,
      input: { path: "approved.txt", content: "changed" },
    }),
    /approval input mismatch/,
  );
});

test("rejected approval ticket cannot execute", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const blocked = await executeTool(store, {
    toolName: "file.write",
    input: { path: "rejected.txt", content: "no" },
  });
  rejectTicket(store, blocked.approval.id);

  await assert.rejects(
    () => executeTool(store, {
      toolName: "file.write",
      approvalId: blocked.approval.id,
      input: { path: "rejected.txt", content: "no" },
    }),
    /approval is not approved|approval is already rejected/,
  );
  assert.equal(fs.existsSync(path.join(dir, "rejected.txt")), false);
});

test("expired approval ticket cannot be approved", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const decision = evaluatePolicy({
    toolName: "file.write",
    input: { path: "late.txt", content: "too late" },
  });
  const ticket = createApprovalTicket(store, {
    toolName: "file.write",
    input: { path: "late.txt", content: "too late" },
    decision,
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  });

  assert.throws(() => approveTicket(store, ticket.id), /approval is not pending/);
  assert.equal(getApprovalTicket(store, ticket.id).status, "expired");
});

test("workspace index captures text files and skips internal state", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "TrustKernel keeps execution governed.", "utf8");
  fs.mkdirSync(path.join(dir, "src"));
  fs.writeFileSync(path.join(dir, "src", "agent.js"), "export const name = 'SpruceAgent';", "utf8");
  fs.writeFileSync(path.join(store.root, "private.txt"), "internal audit state", "utf8");
  fs.writeFileSync(path.join(dir, "image.png"), Buffer.from([0, 1, 2, 3]));

  const index = buildWorkspaceIndex(store);
  const paths = index.documents.map((document) => document.path);

  assert.ok(paths.includes("README.md"));
  assert.ok(paths.includes("src/agent.js"));
  assert.equal(paths.some((item) => item.startsWith(".spruceagent/")), false);
  assert.ok(index.skipped.some((item) => item.path === "image.png"));
});

test("workspace index respects ignore rules and redacts secrets", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, ".gitignore"), [
    "ignored.md",
    "private/",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(dir, "ignored.md"), "This ignored file mentions SpruceAgent.", "utf8");
  fs.mkdirSync(path.join(dir, "private"));
  fs.writeFileSync(path.join(dir, "private", "notes.md"), "Private notes mention TrustKernel.", "utf8");
  fs.writeFileSync(path.join(dir, ".env"), "DEEPSEEK_API_KEY=sk-should-never-index", "utf8");
  fs.writeFileSync(path.join(dir, "config.json"), JSON.stringify({
    provider: "deepseek",
    apiKey: "sk-1234567890abcdef1234567890",
    note: "SpruceAgent uses redacted provider config.",
  }), "utf8");

  const index = buildWorkspaceIndex(store);
  const paths = index.documents.map((document) => document.path);
  const config = getIndexedDocument(store, "config.json");
  const results = searchWorkspaceContext(store, "provider config");

  assert.equal(paths.includes("ignored.md"), false);
  assert.equal(paths.includes("private/notes.md"), false);
  assert.equal(paths.includes(".env"), false);
  assert.ok(index.skipped.some((item) => item.path === "ignored.md" && item.reason === "ignored_by_rule"));
  assert.ok(index.skipped.some((item) => item.path === ".env" && item.reason === "sensitive_filename"));
  assert.equal(index.redactedDocumentCount, 1);
  assert.equal(index.safety.redactedDocumentCount, 1);
  assert.equal(config.redacted, true);
  assert.equal(config.redactionCount, 1);
  assert.match(config.content, /\[REDACTED\]/);
  assert.doesNotMatch(config.content, /sk-1234567890abcdef1234567890/);
  assert.doesNotMatch(results[0].snippet, /sk-1234567890abcdef1234567890/);
});

test("workspace index reuses unchanged documents and reports changes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "stable.md"), "ContextOS stable document.", "utf8");
  fs.writeFileSync(path.join(dir, "change.md"), "ContextOS first version.", "utf8");
  fs.writeFileSync(path.join(dir, "remove.md"), "ContextOS will remove this.", "utf8");

  const first = buildWorkspaceIndex(store);
  const stableBefore = getIndexedDocument(store, "stable.md");
  fs.writeFileSync(path.join(dir, "change.md"), "ContextOS changed version.", "utf8");
  fs.unlinkSync(path.join(dir, "remove.md"));
  fs.writeFileSync(path.join(dir, "added.md"), "ContextOS added document.", "utf8");

  const second = buildWorkspaceIndex(store);
  const stableAfter = getIndexedDocument(store, "stable.md");
  const paths = second.documents.map((document) => document.path);

  assert.equal(first.incremental.previousIndexedAt, null);
  assert.equal(second.incremental.previousIndexedAt, first.indexedAt);
  assert.ok(second.incremental.changes.unchanged.includes("stable.md"));
  assert.ok(second.incremental.changes.changed.includes("change.md"));
  assert.ok(second.incremental.changes.added.includes("added.md"));
  assert.ok(second.incremental.changes.deleted.includes("remove.md"));
  assert.equal(second.incremental.reusedDocumentCount, 1);
  assert.equal(stableAfter.content, stableBefore.content);
  assert.equal(stableAfter.hash, stableBefore.hash);
  assert.equal(paths.includes("remove.md"), false);
});

test("workspace freshness detects missing, fresh, and stale indexes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const missing = assessWorkspaceIndexFreshness(store);
  assert.equal(missing.status, "missing");

  fs.writeFileSync(path.join(dir, "context.md"), "ContextOS fresh evidence.", "utf8");
  buildWorkspaceIndex(store);
  const fresh = assessWorkspaceIndexFreshness(store);
  assert.equal(fresh.status, "fresh");
  assert.equal(fresh.summary.stale, 0);

  fs.writeFileSync(path.join(dir, "context.md"), "ContextOS changed evidence.", "utf8");
  fs.writeFileSync(path.join(dir, "added.md"), "ContextOS added evidence.", "utf8");
  const stale = assessWorkspaceIndexFreshness(store);
  assert.equal(stale.status, "stale");
  assert.equal(stale.summary.changed, 1);
  assert.equal(stale.summary.added, 1);
  assert.ok(stale.changes.changed.includes("context.md"));
  assert.ok(stale.changes.added.includes("added.md"));
});

test("run preflight can warn, block, and refresh ContextOS", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const warning = runPreflight(store);
  assert.equal(warning.status, "warning");
  assert.equal(warning.canProceed, true);
  assert.equal(warning.context.final.status, "missing");

  const blocked = runPreflight(store, {
    requireFreshContext: true,
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.canProceed, false);
  assert.equal(blocked.blockers[0].id, "context.freshness");

  fs.writeFileSync(path.join(dir, "README.md"), "Preflight refreshes ContextOS.", "utf8");
  const refreshed = runPreflight(store, {
    requireFreshContext: true,
    refreshContext: true,
  });
  assert.equal(refreshed.status, "passed");
  assert.equal(refreshed.canProceed, true);
  assert.equal(refreshed.context.initial.status, "missing");
  assert.equal(refreshed.context.final.status, "fresh");
  assert.equal(refreshed.context.refreshed, true);
  assert.equal(refreshed.actions[0].id, "context.index");
});

test("run risk preflight previews tool policy without executing steps", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const risk = assessRunRisk(store, {
    trustMode: "approve",
    plan: {
      steps: [
        { id: "read", kind: "tool", toolName: "file.read", input: { path: "README.md" } },
        { id: "write", kind: "tool", toolName: "file.write", input: { path: "out.md", content: "x" } },
        { id: "note", kind: "memory", toolName: null, input: {} },
      ],
    },
  });

  assert.equal(risk.status, "warning");
  assert.equal(risk.canProceed, true);
  assert.equal(risk.summary.allow, 1);
  assert.equal(risk.summary.requires_approval, 1);
  assert.equal(risk.summary.not_executable, 1);
  assert.equal(fs.existsSync(path.join(dir, "out.md")), false);
});

test("run risk preflight blocks denied workflow actions", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const risk = assessRunRisk(store, {
    trustMode: "observe",
    workflow: {
      steps: [
        { id: "write", kind: "tool", toolName: "file.write", input: { path: "out.md", content: "x" } },
      ],
    },
  });

  assert.equal(risk.status, "blocked");
  assert.equal(risk.canProceed, false);
  assert.equal(risk.summary.deny, 1);
  assert.equal(risk.blockers[0].id, "write");
});

test("workspace context search returns scored snippets", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "principles.md"), [
    "# Principles",
    "SpruceAgent planning is evidence based.",
    "Facts first. Inference second. Delivery third. No theater.",
  ].join("\n"), "utf8");
  fs.writeFileSync(path.join(dir, "other.md"), "Unrelated content.", "utf8");
  buildWorkspaceIndex(store);

  const results = searchWorkspaceContext(store, "evidence planning");
  assert.equal(results[0].path, "principles.md");
  assert.ok(results[0].score > 0);
  assert.match(results[0].snippet, /evidence based/i);
});

test("context pack and document show use the existing index", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "context.md"), "ContextOS indexes local workspace files.", "utf8");
  buildWorkspaceIndex(store);

  const document = getIndexedDocument(store, "context.md");
  const pack = createContextPack(store, "ContextOS");

  assert.equal(document.path, "context.md");
  assert.equal(document.content, "ContextOS indexes local workspace files.");
  assert.equal(pack.resultCount, 1);
  assert.equal(pack.results[0].path, "context.md");
});

test("source map explains workspace context evidence", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Source map explains context evidence.", "utf8");
  buildWorkspaceIndex(store);

  const context = createContextPack(store, "Source map", { limit: 1 });
  const sourceMap = createSourceMap(store, { context });

  assert.equal(sourceMap.version, "0.1.0");
  assert.equal(sourceMap.summary.sourceCount, 1);
  assert.equal(sourceMap.summary.byType.workspace, 1);
  assert.equal(sourceMap.sources[0].type, "workspace");
  assert.equal(sourceMap.sources[0].path, "README.md");
  assert.ok(["high", "medium", "low"].includes(sourceMap.sources[0].confidence));
  assert.ok(["fresh", "recent", "aging", "stale", "future", "unknown"].includes(sourceMap.sources[0].freshness));
});

test("agent run dry-run creates trace and plan without tool execution", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "TrustKernel governs action.", "utf8");
  buildWorkspaceIndex(store);

  const run = await runAgent(store, {
    goal: "Explain TrustKernel",
    contextQuery: "TrustKernel",
    dryRun: true,
  });

  const events = readTraceEvents(store, run.traceId);
  assert.equal(run.status, "dry_run");
  assert.equal(run.results.length, 0);
  assert.equal(run.knownFacts.llmConnected, false);
  assert.equal(run.preflight.status, "passed");
  assert.equal(run.riskPreflight.status, "passed");
  assert.equal(run.riskPreflight.summary.allow, 1);
  assert.equal(run.contextFreshness.status, "fresh");
  assert.ok(run.plan.steps.some((step) => step.id === "step_read_top_context"));
  assert.ok(events.some((event) => event.type === "agent.plan"));
  assert.ok(events.some((event) => event.type === "run.risk_preflight"));
  assert.ok(events.some((event) => event.type === "context.staleness"));
  assert.equal(events.some((event) => event.type === "tool.result"), false);
});

test("agent run reads top context and writes summary memory", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "trust.md"), "TrustKernel is the policy and approval layer.", "utf8");
  buildWorkspaceIndex(store);

  const run = await runAgent(store, {
    goal: "Use TrustKernel context",
    contextQuery: "TrustKernel",
  });

  const events = readTraceEvents(store, run.traceId);
  assert.equal(run.status, "completed");
  assert.ok(run.results.some((result) => result.toolName === "file.read" && result.status === "succeeded"));
  assert.match(run.summary, /TrustKernel/);
  assert.equal(run.memory.scope, "session");
  assert.ok(events.some((event) => event.type === "agent.completed"));
});

test("agent run blocks execution when fresh context is required and index is stale", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "trust.md"), "TrustKernel old context.", "utf8");
  buildWorkspaceIndex(store);
  fs.writeFileSync(path.join(dir, "trust.md"), "TrustKernel changed context.", "utf8");

  const run = await runAgent(store, {
    goal: "Use TrustKernel context",
    contextQuery: "TrustKernel",
    requireFreshContext: true,
  });

  const events = readTraceEvents(store, run.traceId);
  assert.equal(run.status, "blocked");
  assert.equal(run.preflight.status, "blocked");
  assert.equal(run.contextFreshness.status, "stale");
  assert.equal(run.contextFreshness.summary.changed, 1);
  assert.equal(run.results.length, 0);
  assert.equal(events.some((event) => event.type === "tool.result"), false);
  assert.ok(events.some((event) => event.type === "run.preflight"));
});

test("agent run can refresh stale context before requiring fresh context", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "trust.md"), "TrustKernel old context.", "utf8");
  buildWorkspaceIndex(store);
  fs.writeFileSync(path.join(dir, "trust.md"), "TrustKernel refreshed context.", "utf8");

  const run = await runAgent(store, {
    goal: "Use refreshed TrustKernel context",
    contextQuery: "refreshed",
    requireFreshContext: true,
    refreshContext: true,
    dryRun: true,
  });

  const events = readTraceEvents(store, run.traceId);
  assert.equal(run.status, "dry_run");
  assert.equal(run.preflight.status, "passed");
  assert.equal(run.preflight.context.refreshed, true);
  assert.equal(run.riskPreflight.status, "passed");
  assert.equal(run.contextFreshness.status, "fresh");
  assert.equal(run.context.resultCount, 1);
  assert.equal(run.context.results[0].path, "trust.md");
  assert.match(run.context.results[0].snippet, /refreshed context/);
  assert.ok(events.some((event) => event.type === "run.preflight"));
});

test("agent run does not block on non-executed candidate plan risk", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Fallback execution should still read context.", "utf8");
  buildWorkspaceIndex(store);
  const provider = {
    id: "non-executed-candidate-risk-test",
    model: "non-executed-candidate-risk-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "unknown",
              kind: "tool",
              description: "Unknown tool should not block fallback unless candidate execution is requested.",
              toolName: "unknown.tool",
              input: {},
            },
          ],
        },
      };
    },
  };

  const run = await runAgent(store, {
    goal: "Read fallback context",
    contextQuery: "Fallback",
    llmProvider: provider,
    promotePlan: true,
  });

  assert.equal(run.status, "completed");
  assert.equal(run.candidatePlan.status, "blocked");
  assert.equal(run.riskPreflight.status, "passed");
  assert.ok(run.results.some((result) => result.toolName === "file.read" && result.status === "succeeded"));
});

test("agent run without index reports a warning instead of inventing context", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const run = await runAgent(store, {
    goal: "Find context that is not indexed",
    dryRun: true,
  });

  assert.equal(run.status, "dry_run");
  assert.equal(run.context.resultCount, 0);
  assert.match(run.context.warning, /workspace index not found/);
  assert.equal(run.knownFacts.hasWorkspaceIndex, false);
});

test("skill extraction creates a candidate from an agent run trace", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "trust.md"), "TrustKernel governs safe execution.", "utf8");
  buildWorkspaceIndex(store);
  const run = await runAgent(store, {
    goal: "Read TrustKernel context",
    contextQuery: "TrustKernel",
  });

  const skill = extractSkillFromTrace(store, run.traceId);
  const candidates = listSkills(store, "candidates");

  assert.equal(skill.status, "candidate");
  assert.deepEqual(skill.sourceTraceIds, [run.traceId]);
  assert.ok(skill.steps.some((step) => step.includes("workspace context")));
  assert.ok(skill.steps.some((step) => step.includes("file.read")));
  assert.ok(candidates.some((candidate) => candidate.id === skill.id));
  assert.equal(skill.metadata.extractor, "trace_to_skill_v0");
});

test("skill extraction rejects traces without enough reusable steps", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const trace = startTrace(store, { goal: "single event only" });

  assert.throws(() => extractSkillFromTrace(store, trace.id), /not contain enough reusable steps/);
});

test("skill evaluation scores candidate skills without executing them", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);

  const evaluation = evaluateSkillCandidate(store, candidate.id);
  const loaded = getSkillEvaluation(store, evaluation.id);
  const evaluations = listSkillEvaluations(store);

  assert.equal(evaluation.targetKind, "skill.candidate");
  assert.equal(evaluation.skillId, candidate.id);
  assert.equal(evaluation.summary.executableStepCount, 1);
  assert.equal(evaluation.summary.sourceTraceCount, 1);
  assert.equal(evaluation.summary.toolResultCount, 1);
  assert.equal(evaluation.status, "passed");
  assert.equal(loaded.id, evaluation.id);
  assert.ok(evaluations.some((item) => item.id === evaluation.id));
});

test("skill evaluation flags approval-gated candidate steps without side effects", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = proposeSkill(store, {
    name: "Write Candidate",
    summary: "Writes only after approval.",
    steps: [
      "Use file.write with input {\"path\":\"should-not-exist.txt\",\"content\":\"no side effect\"}",
    ],
  });

  const evaluation = evaluateSkillCandidate(store, candidate.id);

  assert.equal(evaluation.status, "needs_review");
  assert.equal(evaluation.summary.policyDecisionCounts.requires_approval, 1);
  assert.ok(evaluation.findings.some((finding) => finding.code === "policy_requires_approval"));
  assert.equal(fs.existsSync(path.join(dir, "should-not-exist.txt")), false);
});

test("skill evaluation contract exposes static safety boundary", () => {
  const contract = getSkillEvaluationContract();

  assert.equal(contract.version, "0.1.0");
  assert.equal(contract.interface, "spruceagent.skill-evaluation");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("does not execute")));
});

test("skill promotion contract exposes evaluation gate", () => {
  const contract = getSkillPromotionContract();

  assert.equal(contract.version, "0.1.0");
  assert.equal(contract.interface, "spruceagent.skill-promotion");
  assert.equal(contract.defaultMinimumScore, 85);
  assert.ok(contract.promotionGate.some((item) => item.includes("evaluation")));
});

test("skill promotion gate approves passed candidates and records versions", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);

  const promotion = promoteSkillCandidate(store, candidate.id, {
    by: "test",
    reason: "passed promotion gate",
  });
  const approved = getApprovedSkill(store, candidate.id);
  const versions = listSkillVersions(store, candidate.id);
  const version = getSkillVersion(store, candidate.id, 1);

  assert.equal(promotion.status, "promoted");
  assert.equal(promotion.evaluation.status, "passed");
  assert.equal(promotion.gate.passed, true);
  assert.equal(approved.status, "approved");
  assert.equal(approved.revision, 1);
  assert.equal(approved.metadata.approvalMode, "promotion_gate");
  assert.equal(approved.metadata.evaluationId, promotion.evaluation.id);
  assert.equal(listSkills(store, "candidates").some((skill) => skill.id === candidate.id), false);
  assert.equal(versions.length, 1);
  assert.equal(versions[0].event, "skill.promoted");
  assert.equal(version.skill.id, candidate.id);
});

test("skill promotion gate rejects candidates without passing evaluation", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = proposeSkill(store, {
    name: "Ungated Candidate",
    summary: "Only natural language steps.",
    steps: [
      "read positioning",
      "store memory",
    ],
  });

  assert.throws(() => promoteSkillCandidate(store, candidate.id), /must pass before promotion/);
  assert.throws(() => getApprovedSkill(store, candidate.id), /skill not found/);
  assert.equal(listSkillVersions(store, candidate.id).length, 0);
});

test("skill restore creates a new current revision from version history", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);
  const promotion = promoteSkillCandidate(store, candidate.id);
  const approvedPath = path.join(store.root, "skills", "approved", `${candidate.id}.json`);
  const changed = {
    ...promotion.skill,
    revision: 2,
    steps: [
      ...promotion.skill.steps,
      "Use memory.add with input {\"content\":\"changed\"}",
    ],
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(approvedPath, `${JSON.stringify(changed, null, 2)}\n`, "utf8");

  const restored = restoreSkillVersion(store, candidate.id, 1, {
    by: "test",
    reason: "restore fixture baseline",
  });
  const versions = listSkillVersions(store, candidate.id);

  assert.equal(restored.revision, 2);
  assert.deepEqual(restored.steps, promotion.skill.steps);
  assert.equal(restored.metadata.restoredFromRevision, 1);
  assert.equal(versions.length, 2);
  assert.equal(versions[1].event, "skill.restored");
});

test("skill replay fixtures pass against unchanged approved skills", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);
  const promotion = promoteSkillCandidate(store, candidate.id);

  const fixture = createSkillReplayFixture(store, candidate.id, {
    evaluationId: promotion.evaluation.id,
  });
  const result = replaySkillFixture(store, fixture.id);
  const loadedFixture = getSkillReplayFixture(store, fixture.id);
  const loadedResult = getSkillReplayResult(store, result.id);

  assert.equal(fixture.skillId, candidate.id);
  assert.equal(fixture.expected.executableSteps.length, 1);
  assert.equal(result.status, "passed");
  assert.equal(result.summary.failedCount, 0);
  assert.equal(loadedFixture.id, fixture.id);
  assert.equal(loadedResult.id, result.id);
  assert.ok(listSkillReplayFixtures(store).some((item) => item.id === fixture.id));
  assert.ok(listSkillReplayResults(store).some((item) => item.id === result.id));
});

test("skill replay fixtures fail when approved skill shape drifts", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);
  const promotion = promoteSkillCandidate(store, candidate.id);
  const fixture = createSkillReplayFixture(store, candidate.id, {
    evaluationId: promotion.evaluation.id,
  });
  const approvedPath = path.join(store.root, "skills", "approved", `${candidate.id}.json`);
  const changed = {
    ...promotion.skill,
    steps: [
      "Retrieve and review relevant workspace context before execution",
    ],
  };
  fs.writeFileSync(approvedPath, `${JSON.stringify(changed, null, 2)}\n`, "utf8");

  const result = replaySkillFixture(store, fixture.id);

  assert.equal(result.status, "failed");
  assert.ok(result.checks.some((check) => check.status === "failed" && check.code === "executable_steps"));
});

test("skill replay contract exposes static replay boundary", () => {
  const contract = getSkillReplayContract();

  assert.equal(contract.version, "0.1.0");
  assert.equal(contract.interface, "spruceagent.skill-replay");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("does not execute")));
});

test("skill package contract exposes candidate-only import boundary", () => {
  const contract = getSkillPackageContract();

  assert.equal(contract.version, "0.1.0");
  assert.equal(contract.interface, "spruceagent.skill-package");
  assert.equal(contract.importStatus, "candidate");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("never approves")));
});

test("skill package export includes skill evidence and portable integrity", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);
  const promotion = promoteSkillCandidate(store, candidate.id);
  const fixture = createSkillReplayFixture(store, candidate.id, {
    evaluationId: promotion.evaluation.id,
  });
  replaySkillFixture(store, fixture.id);

  const pkg = exportSkillPackage(store, candidate.id, {
    file: "trustkernel.skillpkg.json",
  });
  const loaded = getSkillPackage(store, pkg.id);

  assert.equal(pkg.packageKind, "portable_skill_package");
  assert.equal(pkg.source.originalSkillId, candidate.id);
  assert.equal(pkg.skill.name, promotion.skill.name);
  assert.equal(pkg.evidence.versions.length, 1);
  assert.ok(pkg.evidence.evaluations.length >= 1);
  assert.equal(pkg.evidence.replayFixtures.length, 1);
  assert.equal(pkg.evidence.replayResults.length, 1);
  assert.match(pkg.integrity.sha256, /^[a-f0-9]{64}$/);
  assert.equal(loaded.id, pkg.id);
  assert.ok(fs.existsSync(path.join(dir, "trustkernel.skillpkg.json")));
  assert.ok(listSkillPackages(store).some((item) => item.id === pkg.id));
});

test("skill package import creates candidate without approval authority", async () => {
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-source-"));
  const sourceStore = ensureStore(createStore(sourceDir));
  const candidate = await extractCandidateFromSyntheticRun(sourceStore);
  promoteSkillCandidate(sourceStore, candidate.id);
  const pkg = exportSkillPackage(sourceStore, candidate.id);

  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-target-"));
  const targetStore = ensureStore(createStore(targetDir));
  const imported = importSkillPackage(targetStore, pkg);
  const importRecord = getSkillPackageImport(targetStore, imported.id);
  const candidates = listSkills(targetStore, "candidates");

  assert.equal(imported.status, "imported_as_candidate");
  assert.notEqual(imported.candidateSkill.id, candidate.id);
  assert.equal(imported.candidateSkill.status, "candidate");
  assert.deepEqual(imported.candidateSkill.sourceTraceIds, []);
  assert.deepEqual(imported.candidateSkill.steps, pkg.skill.steps);
  assert.equal(imported.candidateSkill.metadata.importedFrom.originalSkillId, candidate.id);
  assert.equal(imported.candidateSkill.metadata.importedFrom.originalSourceTraceIds.length, 1);
  assert.equal(listSkills(targetStore, "approved").length, 0);
  assert.ok(candidates.some((item) => item.id === imported.candidateSkill.id));
  assert.equal(importRecord.candidateSkillId, imported.candidateSkill.id);
  assert.ok(listSkillPackageImports(targetStore).some((item) => item.id === imported.id));
});

test("skill package import rejects tampered integrity", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);
  promoteSkillCandidate(store, candidate.id);
  const pkg = exportSkillPackage(store, candidate.id);
  const tampered = {
    ...pkg,
    skill: {
      ...pkg.skill,
      summary: "tampered",
    },
  };

  assert.throws(() => importSkillPackage(store, tampered), /integrity hash mismatch/);
});

test("candidate skill can be approved and looked up", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);

  const approved = approveSkill(store, candidate.id, {
    approvedBy: "test",
    reason: "reviewed in test",
  });
  const loaded = getApprovedSkill(store, candidate.id);

  assert.equal(approved.status, "approved");
  assert.equal(loaded.id, candidate.id);
  assert.equal(loaded.metadata.approvedBy, "test");
  assert.ok(loaded.executableSteps.some((step) => step.toolName === "file.read"));
  assert.ok(listSkills(store, "approved").some((skill) => skill.id === candidate.id));
  assert.equal(listSkills(store, "candidates").some((skill) => skill.id === candidate.id), false);
  assert.equal(listSkillVersions(store, candidate.id)[0].event, "skill.approved");
});

test("agent run can explicitly invoke approved skill as guidance", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);
  const approved = approveSkill(store, candidate.id);

  const run = await runAgent(store, {
    goal: "Use approved guidance",
    contextQuery: "TrustKernel",
    skillId: approved.id,
    dryRun: true,
  });
  const events = readTraceEvents(store, run.traceId);

  assert.equal(run.knownFacts.skillsInvoked, true);
  assert.equal(run.knownFacts.invokedSkillId, approved.id);
  assert.equal(run.skill.id, approved.id);
  assert.ok(run.plan.steps.some((step) => step.id === "step_apply_skill_guidance"));
  assert.ok(events.some((event) => event.type === "agent.skill.invoked"));
});

test("agent run executes typed approved skill steps only when explicit", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "trust.md"), "TrustKernel governs safe execution.", "utf8");
  buildWorkspaceIndex(store);
  const candidate = await extractCandidateFromSyntheticRun(store);
  const approved = approveSkill(store, candidate.id);

  const guidanceOnly = await runAgent(store, {
    goal: "Use approved guidance only",
    contextQuery: "TrustKernel",
    skillId: approved.id,
    dryRun: true,
  });
  assert.equal(guidanceOnly.results.length, 0);

  const executed = await runAgent(store, {
    goal: "Execute approved typed skill",
    contextQuery: "TrustKernel",
    skillId: approved.id,
    executeSkill: true,
  });

  assert.equal(executed.knownFacts.executeSkill, true);
  assert.ok(executed.plan.steps.some((step) => step.kind === "skill_tool"));
  assert.ok(executed.results.some((result) => result.stepId.startsWith("step_skill_") && result.status === "succeeded"));
});

test("typed skill execution still obeys approval policy", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = proposeSkill(store, {
    name: "Write File Skill",
    summary: "Writes a file through a typed step.",
    steps: [
      "Use file.write with input {\"path\":\"out.txt\",\"content\":\"hello\"}",
    ],
  });
  const approved = approveSkill(store, candidate.id);

  const run = await runAgent(store, {
    goal: "Try approved write skill",
    skillId: approved.id,
    executeSkill: true,
  });

  assert.equal(run.status, "requires_approval");
  assert.ok(run.results.some((result) => result.status === "requires_approval" && result.approval));
  assert.equal(fs.existsSync(path.join(dir, "out.txt")), false);
});

test("compile executable steps only accepts explicit tool input syntax", () => {
  const steps = compileExecutableSteps([
    "Use file.read with input {\"path\":\"README.md\"}",
    "Read the README somehow",
    "Use file.write with input not-json",
  ]);

  assert.equal(steps.length, 1);
  assert.equal(steps[0].toolName, "file.read");
});

test("workflow can be created, listed, and dry-run", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workflow = createWorkflow(store, {
    name: "Context Review Workflow",
    steps: [
      { kind: "context", query: "TrustKernel" },
    ],
  });

  const workflows = listWorkflows(store);
  const run = await runWorkflow(store, workflow.id, { dryRun: true });

  assert.ok(workflows.some((item) => item.id === workflow.id));
  assert.equal(run.status, "dry_run");
  assert.equal(run.results.length, 0);
});

test("workflow revisions preserve update, archive, and restore history", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workflow = createWorkflow(store, {
    name: "Governed Workflow",
    steps: [
      { kind: "context", query: "first" },
    ],
  });

  const updated = updateWorkflow(store, workflow.id, {
    name: "Governed Workflow v2",
    steps: [
      { kind: "context", query: "second" },
      { kind: "memory", content: "revision two", tags: ["workflow"] },
    ],
    updatedBy: "test",
    reason: "add memory step",
  });
  const revisionOne = getWorkflowVersion(store, workflow.id, 1);
  const archived = archiveWorkflow(store, workflow.id, {
    archivedBy: "test",
    reason: "retire workflow",
  });
  const activeWorkflows = listWorkflows(store);
  const archivedWorkflows = listWorkflows(store, { status: "archived" });

  await assert.rejects(() => runWorkflow(store, workflow.id, { dryRun: true }), /workflow is archived/);

  const restored = restoreWorkflowVersion(store, workflow.id, 1, {
    restoredBy: "test",
    reason: "restore original",
  });
  const versions = listWorkflowVersions(store, workflow.id);

  assert.equal(workflow.revision, 1);
  assert.equal(updated.revision, 2);
  assert.equal(revisionOne.workflow.name, "Governed Workflow");
  assert.equal(archived.revision, 3);
  assert.equal(archived.status, "archived");
  assert.equal(activeWorkflows.some((item) => item.id === workflow.id), false);
  assert.equal(archivedWorkflows.some((item) => item.id === workflow.id), true);
  assert.equal(restored.revision, 4);
  assert.equal(restored.status, "draft");
  assert.equal(restored.name, "Governed Workflow");
  assert.equal(restored.steps.length, 1);
  assert.equal(listWorkflows(store).some((item) => item.id === workflow.id), true);
  assert.deepEqual(versions.map((item) => item.revision), [1, 2, 3, 4]);
});

test("workflow builder drafts and saves reviewable workflow definitions", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Workflow builder should use project context.", "utf8");
  buildWorkspaceIndex(store);

  const draft = await draftWorkflow(store, {
    goal: "Create a workflow that reviews the project context",
    contextQuery: "Workflow builder",
    llmProvider: "mock",
    name: "Builder Draft Workflow",
  });
  const saved = await createWorkflowFromDraft(store, {
    draft,
  });

  assert.equal(draft.status, "drafted");
  assert.equal(draft.workflow.name, "Builder Draft Workflow");
  assert.equal(draft.review.saved, false);
  assert.equal(draft.sourceMap.summary.byType.workspace >= 1, true);
  assert.equal(draft.sourceMap.summary.byType.llm, 1);
  assert.equal(draft.workflow.steps.some((step) => step.kind === "context"), true);
  assert.equal(saved.status, "saved");
  assert.match(saved.workflow.id, /^workflow_/);
  assert.equal(saved.workflow.metadata.createdFrom, "workflow-builder");
  assert.equal(saved.workflow.metadata.sourceMap.sourceCount >= 2, true);
  assert.equal(listWorkflows(store).some((item) => item.id === saved.workflow.id), true);
});

test("workflow builder normalizes edited draft steps before saving", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Editable workflow draft context.", "utf8");
  buildWorkspaceIndex(store);

  const draft = await draftWorkflow(store, {
    goal: "Create an editable workflow draft",
    contextQuery: "Editable workflow",
    llmProvider: "mock",
  });
  draft.workflow.name = "Edited Draft Workflow";
  draft.workflow.steps = [
    { kind: "memory", content: "Review completed.", tags: "edited,draft" },
    { kind: "context", query: "TrustKernel", limit: "3" },
  ];
  const normalized = normalizeWorkflowDraft(draft);
  const saved = await createWorkflowFromDraft(store, { draft });

  assert.equal(normalized.workflow.steps[0].kind, "memory");
  assert.deepEqual(normalized.workflow.steps[0].tags, ["edited", "draft"]);
  assert.equal(normalized.workflow.steps[1].limit, 3);
  assert.equal(saved.workflow.name, "Edited Draft Workflow");
  assert.equal(saved.workflow.steps.length, 2);
});

test("workflow runs context, tool, and memory steps", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Workflow context works.", "utf8");
  buildWorkspaceIndex(store);
  const workflow = createWorkflow(store, {
    name: "Read And Remember",
    steps: [
      { kind: "context", query: "Workflow", limit: 1 },
      { kind: "tool", toolName: "file.read", input: { path: "README.md" } },
      { kind: "memory", content: "Workflow v0 ran successfully.", tags: ["workflow-test"] },
    ],
  });

  const run = await runWorkflow(store, workflow.id);

  assert.equal(run.status, "completed");
  assert.equal(run.preflight.status, "passed");
  assert.equal(run.riskPreflight.status, "passed");
  assert.equal(run.riskPreflight.summary.allow, 1);
  assert.equal(run.contextFreshness.status, "fresh");
  assert.ok(run.results.some((result) => result.kind === "context" && result.status === "succeeded"));
  assert.ok(run.results.some((result) => result.toolName === "file.read" && result.status === "succeeded"));
  assert.ok(run.results.some((result) => result.kind === "memory" && result.memory));
});

test("workflow run blocks execution when fresh context is required and index is stale", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Workflow stale context.", "utf8");
  buildWorkspaceIndex(store);
  fs.writeFileSync(path.join(dir, "README.md"), "Workflow changed context.", "utf8");
  const workflow = createWorkflow(store, {
    name: "Blocked Workflow",
    steps: [
      { kind: "context", query: "Workflow", limit: 1 },
      { kind: "tool", toolName: "file.read", input: { path: "README.md" } },
    ],
  });

  const run = await runWorkflow(store, workflow.id, {
    requireFreshContext: true,
  });

  const events = readTraceEvents(store, run.traceId);
  assert.equal(run.status, "blocked");
  assert.equal(run.preflight.status, "blocked");
  assert.equal(run.riskPreflight.status, "passed");
  assert.equal(run.contextFreshness.status, "stale");
  assert.equal(run.results.length, 0);
  assert.equal(events.some((event) => event.type === "tool.result"), false);
  assert.ok(events.some((event) => event.type === "run.preflight"));
});

test("workflow run can refresh stale context before requiring fresh context", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Workflow old context.", "utf8");
  buildWorkspaceIndex(store);
  fs.writeFileSync(path.join(dir, "README.md"), "Workflow refreshed context.", "utf8");
  const workflow = createWorkflow(store, {
    name: "Refreshed Workflow",
    steps: [
      { kind: "context", query: "refreshed", limit: 1 },
    ],
  });

  const run = await runWorkflow(store, workflow.id, {
    requireFreshContext: true,
    refreshContext: true,
  });

  const events = readTraceEvents(store, run.traceId);
  assert.equal(run.status, "completed");
  assert.equal(run.preflight.status, "passed");
  assert.equal(run.preflight.context.refreshed, true);
  assert.equal(run.riskPreflight.status, "passed");
  assert.equal(run.contextFreshness.status, "fresh");
  assert.equal(run.results[0].status, "succeeded");
  assert.equal(run.results[0].context.results[0].path, "README.md");
  assert.match(run.results[0].context.results[0].snippet, /refreshed context/);
  assert.ok(events.some((event) => event.type === "run.preflight"));
  assert.ok(events.some((event) => event.type === "run.risk_preflight"));
});

test("workflow run blocks denied risk before executing tools", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Workflow denied risk.", "utf8");
  buildWorkspaceIndex(store);
  const workflow = createWorkflow(store, {
    name: "Denied Workflow",
    steps: [
      { id: "write", kind: "tool", toolName: "file.write", input: { path: "blocked.md", content: "no" } },
    ],
  });

  const run = await runWorkflow(store, workflow.id, {
    trustMode: "observe",
  });

  const events = readTraceEvents(store, run.traceId);
  assert.equal(run.status, "blocked");
  assert.equal(run.riskPreflight.status, "blocked");
  assert.equal(run.riskPreflight.summary.deny, 1);
  assert.equal(run.results.length, 0);
  assert.equal(fs.existsSync(path.join(dir, "blocked.md")), false);
  assert.equal(events.some((event) => event.type === "tool.result"), false);
});

test("workflow inbox and detail reconstruct workflow run traces", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Workflow detail context.", "utf8");
  buildWorkspaceIndex(store);
  const workflow = createWorkflow(store, {
    name: "Workflow Detail",
    steps: [
      { kind: "context", query: "Workflow", limit: 1 },
      { kind: "tool", toolName: "file.read", input: { path: "README.md" } },
    ],
  });

  const run = await runWorkflow(store, workflow.id);
  const inbox = getWorkflowInbox(store);
  const detail = getWorkflowRunDetail(store, run.traceId);

  assert.equal(inbox.status, "clear");
  assert.equal(inbox.summary.workflowRunCount, 1);
  assert.equal(inbox.workflowRuns[0].traceId, run.traceId);
  assert.equal(inbox.workflowRuns[0].workflowId, workflow.id);
  assert.equal(detail.status, "completed");
  assert.equal(detail.summary.workflowId, workflow.id);
  assert.equal(detail.summary.stepCount, 2);
  assert.equal(detail.summary.toolResultCount, 1);
  assert.equal(detail.steps[1].status, "succeeded");
  assert.equal(detail.sourceMap.summary.byType.workspace, 1);
  assert.equal(detail.sourceMap.sources[0].path, "README.md");
  assert.ok(detail.timeline.some((event) => event.type === "workflow.completed"));
});

test("workflow skill step executes approved typed skill steps", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "trust.md"), "TrustKernel workflow skill.", "utf8");
  buildWorkspaceIndex(store);
  const candidate = await extractCandidateFromSyntheticRun(store);
  const approved = approveSkill(store, candidate.id);
  const workflow = createWorkflow(store, {
    name: "Skill Workflow",
    steps: [
      { kind: "skill", skillId: approved.id },
    ],
  });

  const run = await runWorkflow(store, workflow.id);

  assert.equal(run.status, "completed");
  assert.ok(run.results.some((result) => result.kind === "skill" && result.status === "succeeded"));
  assert.ok(run.results[0].results.some((result) => result.toolName === "file.read"));
});

test("workflow tool step still obeys approval policy", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workflow = createWorkflow(store, {
    name: "Write Workflow",
    steps: [
      { kind: "tool", toolName: "file.write", input: { path: "out.txt", content: "blocked" } },
    ],
  });

  const run = await runWorkflow(store, workflow.id);

  assert.equal(run.status, "requires_approval");
  assert.ok(run.results.some((result) => result.status === "requires_approval" && result.approval));
  assert.equal(fs.existsSync(path.join(dir, "out.txt")), false);
});

test("workflow continuation resumes approved workflow tool steps", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workflow = createWorkflow(store, {
    name: "Resume Write Workflow",
    steps: [
      { kind: "tool", toolName: "file.write", input: { path: "resumed-workflow.txt", content: "workflow resumed" } },
    ],
  });

  const run = await runWorkflow(store, workflow.id);
  const approvalId = run.results[0].approval.id;
  const pendingDetail = getWorkflowRunDetail(store, run.traceId);
  const beforeApproval = await resumeWorkflowRun(store, { traceId: run.traceId });
  approveTicket(store, approvalId);
  const resumable = getWorkflowInbox(store);
  const workflowQueue = getApprovalQueue(store, { traceKind: "workflow.run" });
  const resumed = await resumeWorkflowRun(store, { traceId: run.traceId });
  const completedDetail = getWorkflowRunDetail(store, run.traceId);

  assert.equal(run.status, "requires_approval");
  assert.equal(pendingDetail.summary.pendingApprovalCount, 1);
  assert.equal(pendingDetail.decisionQueue.items[0].status, "pending_decision");
  assert.equal(beforeApproval.status, "requires_approval");
  assert.equal(resumable.workflowRuns[0].canResume, true);
  assert.equal(resumable.decisionQueue.items[0].status, "ready_to_resume");
  assert.equal(workflowQueue.items[0].actions[0].path, `/v1/workflows/runs/${run.traceId}/resume`);
  assert.equal(resumed.status, "completed");
  assert.equal(resumed.results[0].status, "succeeded");
  assert.equal(fs.readFileSync(path.join(dir, "resumed-workflow.txt"), "utf8"), "workflow resumed");
  assert.equal(getApprovalTicket(store, approvalId).status, "consumed");
  assert.equal(completedDetail.status, "completed");
  assert.equal(completedDetail.decisionQueue.items[0].status, "completed");
  assert.equal(completedDetail.resumeEvents.length, 2);
});

test("evaluation summarizes a completed workflow trace", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Evaluation reads workflow traces.", "utf8");
  buildWorkspaceIndex(store);
  const workflow = createWorkflow(store, {
    name: "Evaluate Successful Workflow",
    steps: [
      { kind: "context", query: "Evaluation", limit: 1 },
      { kind: "tool", toolName: "file.read", input: { path: "README.md" } },
    ],
  });
  const run = await runWorkflow(store, workflow.id);

  const evaluation = evaluateTrace(store, run.traceId);
  const loaded = getEvaluation(store, evaluation.id);

  assert.equal(evaluation.status, "passed");
  assert.equal(evaluation.targetKind, "workflow.run");
  assert.equal(evaluation.workflowId, workflow.id);
  assert.equal(evaluation.summary.stepStatusCounts.succeeded, 2);
  assert.equal(evaluation.summary.toolStatusCounts.succeeded, 1);
  assert.ok(evaluation.summary.reliabilityScore > 80);
  assert.ok(evaluation.findings.some((finding) => finding.code === "run_passed"));
  assert.equal(loaded.id, evaluation.id);
  assert.ok(listEvaluations(store).some((item) => item.id === evaluation.id));
});

test("evaluation flags approval-gated workflow traces", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workflow = createWorkflow(store, {
    name: "Evaluate Approval Workflow",
    steps: [
      { kind: "tool", toolName: "file.write", input: { path: "out.txt", content: "blocked" } },
    ],
  });
  const run = await runWorkflow(store, workflow.id);

  const evaluation = evaluateTrace(store, run.traceId);

  assert.equal(evaluation.status, "requires_approval");
  assert.equal(evaluation.summary.approvalCount, 1);
  assert.equal(evaluation.summary.policyDecisionCounts.requires_approval, 1);
  assert.ok(evaluation.findings.some((finding) => finding.code === "approval_required"));
  assert.ok(evaluation.recommendedNextActions.some((action) => action.includes("approval")));
});

test("gateway token is generated and required for v1 routes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const baseUrl = `http://${gateway.host}:${gateway.port}`;

  try {
    assert.equal(gateway.tokenCreated, true);
    assert.ok(verifyGatewayToken(store, gateway.token));

    const health = await fetchJson(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);

    const workbench = await fetchText(`${baseUrl}/workbench`);
    assert.equal(workbench.status, 200);
    assert.match(workbench.body, /SpruceAgent Workbench/);

    const unauthorized = await fetchJson(`${baseUrl}/v1/status`);
    assert.equal(unauthorized.status, 401);

    const authorized = await fetchJson(`${baseUrl}/v1/status`, {
      token: gateway.token,
    });
    assert.equal(authorized.status, 200);
    assert.equal(authorized.body.auth.tokenConfigured, true);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway tool execution still uses approval tickets", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const token = ensureGatewayToken(store).token;
  const gateway = await startGatewayServer(store, { port: 0 });
  const baseUrl = `http://${gateway.host}:${gateway.port}`;

  try {
    const blocked = await fetchJson(`${baseUrl}/v1/tools/run`, {
      method: "POST",
      token,
      body: {
        toolName: "file.write",
        input: { path: "gateway.txt", content: "from gateway" },
      },
    });
    assert.equal(blocked.status, 200);
    assert.equal(blocked.body.status, "requires_approval");
    assert.equal(fs.existsSync(path.join(dir, "gateway.txt")), false);

    const approvalId = blocked.body.approval.id;
    const approved = await fetchJson(`${baseUrl}/v1/approvals/${approvalId}/approve`, {
      method: "POST",
      token,
      body: { reason: "gateway test" },
    });
    assert.equal(approved.status, 200);
    assert.equal(approved.body.status, "approved");

    const executed = await fetchJson(`${baseUrl}/v1/tools/run`, {
      method: "POST",
      token,
      body: {
        toolName: "file.write",
        approvalId,
        input: { path: "gateway.txt", content: "from gateway" },
      },
    });
    assert.equal(executed.status, 200);
    assert.equal(executed.body.status, "succeeded");
    assert.equal(fs.readFileSync(path.join(dir, "gateway.txt"), "utf8"), "from gateway");
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway route contract exposes stable route ids", () => {
  const contract = getGatewayRouteContract();
  const routeIds = contract.routes.map((route) => route.id);

  assert.equal(contract.version, "0.1.0");
  assert.equal(contract.basePath, "/v1");
  assert.ok(routeIds.includes("workbench"));
  assert.ok(routeIds.includes("showcase"));
  assert.ok(routeIds.includes("status"));
  assert.ok(routeIds.includes("context.freshness"));
  assert.ok(routeIds.includes("preflight.run"));
  assert.ok(routeIds.includes("inbox"));
  assert.ok(routeIds.includes("inbox.contract"));
  assert.ok(routeIds.includes("approval_queue"));
  assert.ok(routeIds.includes("approval_queue.contract"));
  assert.ok(routeIds.includes("artifacts.list"));
  assert.ok(routeIds.includes("artifacts.get"));
  assert.ok(routeIds.includes("artifacts.contract"));
  assert.ok(routeIds.includes("trace_reports.get"));
  assert.ok(routeIds.includes("trace_reports.contract"));
  assert.ok(routeIds.includes("agent_adapters.list"));
  assert.ok(routeIds.includes("agent_adapters.get"));
  assert.ok(routeIds.includes("agent_adapters.plan"));
  assert.ok(routeIds.includes("agent_adapters.contract"));
  assert.ok(routeIds.includes("agent_workspaces.list"));
  assert.ok(routeIds.includes("agent_workspaces.get"));
  assert.ok(routeIds.includes("agent_workspaces.prepare"));
  assert.ok(routeIds.includes("agent_workspaces.contract"));
  assert.ok(routeIds.includes("agent_launches.list"));
  assert.ok(routeIds.includes("agent_launches.get"));
  assert.ok(routeIds.includes("agent_launches.create"));
  assert.ok(routeIds.includes("agent_launches.contract"));
  assert.ok(routeIds.includes("runs.get"));
  assert.ok(routeIds.includes("run_detail.contract"));
  assert.ok(routeIds.includes("skills.list"));
  assert.ok(routeIds.includes("skill_evaluations.contract"));
  assert.ok(routeIds.includes("skill_evaluations.list"));
  assert.ok(routeIds.includes("skill_evaluations.get"));
  assert.ok(routeIds.includes("skill_evaluations.create"));
  assert.ok(routeIds.includes("skill_promotion.contract"));
  assert.ok(routeIds.includes("skills.promote"));
  assert.ok(routeIds.includes("skills.versions"));
  assert.ok(routeIds.includes("skills.version"));
  assert.ok(routeIds.includes("skills.restore"));
  assert.ok(routeIds.includes("skill_packages.contract"));
  assert.ok(routeIds.includes("skill_packages.export"));
  assert.ok(routeIds.includes("skill_packages.list"));
  assert.ok(routeIds.includes("skill_packages.get"));
  assert.ok(routeIds.includes("skill_packages.import"));
  assert.ok(routeIds.includes("skill_packages.imports.list"));
  assert.ok(routeIds.includes("skill_packages.imports.get"));
  assert.ok(routeIds.includes("skill_replay.contract"));
  assert.ok(routeIds.includes("skill_replay.fixtures.list"));
  assert.ok(routeIds.includes("skill_replay.fixtures.get"));
  assert.ok(routeIds.includes("skill_replay.fixtures.create"));
  assert.ok(routeIds.includes("skill_replay.run"));
  assert.ok(routeIds.includes("skill_replay.results.list"));
  assert.ok(routeIds.includes("skill_replay.results.get"));
  assert.ok(routeIds.includes("tools.run"));
  assert.ok(routeIds.includes("workflows.create"));
  assert.ok(routeIds.includes("preflight.risk"));
  assert.ok(routeIds.includes("workflows.update"));
  assert.ok(routeIds.includes("workflows.archive"));
  assert.ok(routeIds.includes("workflows.versions"));
  assert.ok(routeIds.includes("workflows.version"));
  assert.ok(routeIds.includes("workflows.restore"));
  assert.ok(routeIds.includes("workflows.run"));
  assert.ok(routeIds.includes("workflow_inbox"));
  assert.ok(routeIds.includes("workflow_inbox.contract"));
  assert.ok(routeIds.includes("workflow_detail.contract"));
  assert.ok(routeIds.includes("workflow_continuation.contract"));
  assert.ok(routeIds.includes("workflow_runs.get"));
  assert.ok(routeIds.includes("workflow_runs.resume"));
  assert.ok(routeIds.includes("contract"));
  assert.ok(routeIds.includes("llm.contract"));
  assert.ok(routeIds.includes("workflow_builder.contract"));
  assert.ok(routeIds.includes("workflow_builder.draft"));
  assert.ok(routeIds.includes("workflow_builder.save"));
  assert.ok(routeIds.includes("candidate.contract"));
  assert.ok(routeIds.includes("candidate.approval_contract"));
  assert.ok(routeIds.includes("candidate.request_approvals"));
  assert.ok(routeIds.includes("candidate.execute_approved"));
  assert.ok(routeIds.includes("run_continuation.contract"));
  assert.ok(routeIds.includes("runs.resume"));
  assert.equal(contract.routes.find((route) => route.id === "health").authRequired, false);
  assert.equal(contract.routes.find((route) => route.id === "status").authRequired, true);
});

test("gateway serves workbench static assets without API auth", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const baseUrl = `http://${gateway.host}:${gateway.port}`;

  try {
    const html = await fetchText(`${baseUrl}/workbench`);
    const css = await fetchText(`${baseUrl}/workbench/styles.css`);
    const js = await fetchText(`${baseUrl}/workbench/app.js`);
    const mark = await fetchText(`${baseUrl}/workbench/assets/spruce-mark.svg`);

    assert.equal(html.status, 200);
    assert.equal(css.status, 200);
    assert.equal(js.status, 200);
    assert.equal(mark.status, 200);
    assert.match(html.body, /Launch Run|Workflow Editor|Workflow Builder|Add Context|Add Skill|Add Memory|workflow-source-map|Approved Skills|SkillForge|Skill Evaluations|Workflows|Agent Adapters|agent-adapter-list|agent-plan-panel|Agent Workspaces|agent-workspace-list|agent-workspace-panel|Agent Launches|agent-launch-list|agent-launch-panel|Workflow Versions|Workflow Runs|Decision Queue|decision-queue-list|Artifacts|artifact-list|artifact-panel|Run Detail/);
    assert.match(css.body, /Agent Workbench|summary-grid|work-section|detail-panel|run-form|draft-step-list|draft-step-fields|source-map-list|evaluation-preview|artifact-preview|agent-plan-preview|agent-workspace-preview|agent-launch-preview/);
    assert.match(js.body, /submitRun|createWorkflowFromWorkbench|draftWorkflowFromWorkbench|saveWorkflowDraftFromWorkbench|addWorkflowDraftStep|moveWorkflowDraftStep|removeWorkflowDraftStep|runSkill|evaluateSkillFromWorkbench|promoteSkillFromWorkbench|loadSkillEvaluation|runWorkflowFromWorkbench|archiveWorkflowFromWorkbench|restoreWorkflowVersionFromWorkbench|resumeWorkflowRunFromWorkbench|planAgentAdapterRunFromWorkbench|prepareAgentWorkspaceFromWorkbench|previewAgentLaunch|loadAgentWorkspace|loadAgentLaunch|renderAgentAdapters|renderAgentPlanPanel|renderAgentWorkspaces|renderAgentWorkspacePanel|renderAgentLaunches|renderAgentLaunchPanel|agentPlanButton|agentPrepareButton|agentWorkspaceViewButton|agentLaunchPreviewButton|agentLaunchViewButton|loadWorkflowDetail|loadArtifact|loadTraceReport|reportButton|downloadText|handleDecisionQueueAction|renderDecisionQueue|renderArtifacts|renderArtifactPanel|approvalQueue|artifacts|agentAdapters|agentWorkspaces|agentLaunches|resume|inbox|approval/i);
    assert.match(mark.body, /SpruceAgent mark/);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway serves showcase static assets without API auth", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const baseUrl = `http://${gateway.host}:${gateway.port}`;

  try {
    const root = await fetchText(`${baseUrl}/`);
    const html = await fetchText(`${baseUrl}/showcase`);
    const css = await fetchText(`${baseUrl}/showcase/styles.css`);
    const js = await fetchText(`${baseUrl}/showcase/app.js`);

    assert.equal(root.status, 200);
    assert.equal(html.status, 200);
    assert.equal(css.status, 200);
    assert.equal(js.status, 200);
    assert.match(html.body, /SpruceAgent|SuperAgent OS|ContextOS|SkillForge|TrustKernel|GatewayMesh|Run locally/);
    assert.match(css.body, /product-scene|loop-track|plane-grid|feature-matrix|quickstart/);
    assert.match(js.body, /preferredLanguage|scrollIntoView/);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client reads status and route contract", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const health = await client.health();
    const status = await client.status();
    const inbox = await client.inbox();
    const skills = await client.listSkills();
    const skillEvaluationContract = await client.skillEvaluationContract();
    const skillPromotionContract = await client.skillPromotionContract();
    const skillReplayContract = await client.skillReplayContract();
    const skillPackageContract = await client.skillPackageContract();
    const skillEvaluations = await client.listSkillEvaluations();
    const replayFixtures = await client.listSkillReplayFixtures();
    const replayResults = await client.listSkillReplayResults();
    const skillPackages = await client.listSkillPackages();
    const skillPackageImports = await client.listSkillPackageImports();
    const inboxContract = await client.inboxContract();
    const contract = await client.contract();
    const llmContract = await client.llmContract();
    const candidateContract = await client.candidateContract();
    const candidateApprovalContract = await client.candidateApprovalContract();
    const runContinuationContract = await client.runContinuationContract();
    const runDetailContract = await client.runDetailContract();
    const artifactContract = await client.artifactContract();
    const agentAdapterContract = await client.agentAdapterContract();
    const agentWorkspaceContract = await client.agentWorkspaceContract();
    const agentLauncherContract = await client.agentLauncherContract();
    const artifacts = await client.artifacts();
    const workflowInbox = await client.workflowInbox();
    const workflowInboxContract = await client.workflowInboxContract();
    const workflowDetailContract = await client.workflowDetailContract();
    const workflowContinuationContract = await client.workflowContinuationContract();

    assert.equal(health.ok, true);
    assert.equal(status.auth.tokenConfigured, true);
    assert.equal(inbox.version, "0.1.0");
    assert.deepEqual(skills, []);
    assert.equal(skillEvaluationContract.interface, "spruceagent.skill-evaluation");
    assert.equal(skillPromotionContract.interface, "spruceagent.skill-promotion");
    assert.equal(skillReplayContract.interface, "spruceagent.skill-replay");
    assert.equal(skillPackageContract.interface, "spruceagent.skill-package");
    assert.deepEqual(skillEvaluations, []);
    assert.deepEqual(replayFixtures, []);
    assert.deepEqual(replayResults, []);
    assert.deepEqual(skillPackages, []);
    assert.deepEqual(skillPackageImports, []);
    assert.equal(inboxContract.interface, "spruceagent.run-inbox");
    assert.ok(contract.routes.some((route) => route.id === "tools.run"));
    assert.equal(llmContract.interface, "spruceagent.llm-adapter");
    assert.equal(candidateContract.interface, "spruceagent.candidate-execution");
    assert.equal(candidateApprovalContract.interface, "spruceagent.candidate-approval");
    assert.equal(runContinuationContract.interface, "spruceagent.run-continuation");
    assert.equal(runDetailContract.interface, "spruceagent.run-detail");
    assert.equal(artifactContract.interface, "spruceagent.artifacts");
    assert.equal(agentAdapterContract.interface, "spruceagent.agent-adapters");
    assert.equal(agentWorkspaceContract.interface, "spruceagent.agent-workspaces");
    assert.equal(agentLauncherContract.interface, "spruceagent.agent-launcher");
    assert.equal(status.agentAdapterCount >= 5, true);
    assert.equal(status.agentWorkspaceCount, 0);
    assert.equal(status.agentLaunchCount, 0);
    assert.equal(artifacts.status, "empty");
    assert.equal(workflowInbox.version, "0.1.0");
    assert.equal(workflowInboxContract.interface, "spruceagent.workflow-inbox");
    assert.equal(workflowDetailContract.interface, "spruceagent.workflow-detail");
    assert.equal(workflowContinuationContract.interface, "spruceagent.workflow-continuation");
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client tool calls still require approval tickets", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const blocked = await client.runTool({
      toolName: "file.write",
      input: { path: "client.txt", content: "from client" },
    });
    assert.equal(blocked.status, "requires_approval");
    assert.equal(fs.existsSync(path.join(dir, "client.txt")), false);

    await client.approve(blocked.approval.id, { reason: "client test" });
    const executed = await client.runTool({
      toolName: "file.write",
      approvalId: blocked.approval.id,
      input: { path: "client.txt", content: "from client" },
    });
    assert.equal(executed.status, "succeeded");
    assert.equal(fs.readFileSync(path.join(dir, "client.txt"), "utf8"), "from client");
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client can approve and execute candidate step", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });
  const candidatePlan = createWriteCandidatePlan();

  try {
    const requested = await client.requestCandidateApprovals({ candidatePlan });
    const approvalId = requested.results[0].approval.id;
    await client.approve(approvalId, { reason: "candidate gateway test" });
    const executed = await client.executeApprovedCandidateStep({
      candidatePlan,
      stepId: "write_note",
      approvalId,
    });

    assert.equal(requested.results[0].status, "approval_created");
    assert.equal(executed.status, "succeeded");
    assert.equal(fs.readFileSync(path.join(dir, "candidate.txt"), "utf8"), "approved candidate write");
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client can resume approval-gated run", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });
  const provider = {
    id: "gateway-resume-test",
    model: "gateway-resume-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "write_note",
              kind: "tool",
              description: "Write a candidate note.",
              toolName: "file.write",
              input: {
                path: "gateway-resumed.txt",
                content: "gateway resumed",
              },
            },
          ],
        },
      };
    },
  };

  try {
    const run = await runAgent(store, {
      goal: "Gateway resume run",
      llmProvider: provider,
      promotePlan: true,
      requestCandidateApprovals: true,
    });
    const approvalId = run.candidateApprovals.results[0].approval.id;
    await client.approve(approvalId, { reason: "resume gateway test" });
    const resumed = await client.resumeRun(run.traceId);

    assert.equal(run.status, "requires_approval");
    assert.equal(resumed.status, "completed");
    assert.equal(resumed.results[0].status, "succeeded");
    assert.equal(fs.readFileSync(path.join(dir, "gateway-resumed.txt"), "utf8"), "gateway resumed");
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client reads run inbox projection", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });
  const provider = {
    id: "gateway-inbox-test",
    model: "gateway-inbox-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "write_note",
              kind: "tool",
              description: "Write an inbox note.",
              toolName: "file.write",
              input: {
                path: "gateway-inbox.txt",
                content: "gateway inbox",
              },
            },
          ],
        },
      };
    },
  };

  try {
    const run = await runAgent(store, {
      goal: "Gateway inbox run",
      llmProvider: provider,
      promotePlan: true,
      requestCandidateApprovals: true,
    });
    const inbox = await client.inbox();

    assert.equal(inbox.status, "action_required");
    assert.equal(inbox.pendingApprovals[0].traceId, run.traceId);
    assert.equal(inbox.recentRuns.some((item) => item.traceId === run.traceId), true);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client reads unified approval queue", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });
  const provider = {
    id: "gateway-approval-queue-test",
    model: "gateway-approval-queue-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "write_note",
              kind: "tool",
              description: "Write a queued approval note.",
              toolName: "file.write",
              input: {
                path: "gateway-queue.txt",
                content: "gateway queue",
              },
            },
          ],
        },
      };
    },
  };

  try {
    const run = await runAgent(store, {
      goal: "Gateway approval queue run",
      llmProvider: provider,
      promotePlan: true,
      requestCandidateApprovals: true,
    });
    const pendingQueue = await client.approvalQueue({ traceKind: "agent.run" });
    const approvalId = run.candidateApprovals.results[0].approval.id;
    await client.approve(approvalId, { reason: "queue gateway test" });
    const resumableQueue = await client.approvalQueue({ status: "ready_to_resume" });

    assert.equal(pendingQueue.status, "action_required");
    assert.equal(pendingQueue.items[0].traceId, run.traceId);
    assert.equal(pendingQueue.items[0].status, "pending_decision");
    assert.equal(pendingQueue.items[0].actions.some((action) => action.id === "approve"), true);
    assert.equal(resumableQueue.status, "ready_to_resume");
    assert.equal(resumableQueue.items[0].actions[0].path, `/v1/runs/${run.traceId}/resume`);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client reads run detail projection", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });
  const provider = {
    id: "gateway-detail-test",
    model: "gateway-detail-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "write_note",
              kind: "tool",
              description: "Write a gateway detail note.",
              toolName: "file.write",
              input: {
                path: "gateway-detail.txt",
                content: "gateway detail",
              },
            },
          ],
        },
      };
    },
  };

  try {
    const run = await runAgent(store, {
      goal: "Gateway detail run",
      llmProvider: provider,
      promotePlan: true,
      requestCandidateApprovals: true,
    });
    const detail = await client.getRun(run.traceId);

    assert.equal(detail.traceId, run.traceId);
    assert.equal(detail.status, "requires_approval");
    assert.equal(detail.summary.pendingApprovalCount, 1);
    assert.equal(detail.candidateSteps[0].id, "write_note");
    assert.ok(detail.timeline.some((event) => event.type === "agent.completed"));
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client reads run artifacts", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Gateway artifact context.", "utf8");
  buildWorkspaceIndex(store);
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const run = await client.runAgent({
      goal: "Gateway artifact dry run",
      contextQuery: "artifact",
      dryRun: true,
      trustMode: "approve",
    });
    const artifacts = await client.artifacts({ traceId: run.traceId });
    const summary = artifacts.items.find((item) => item.kind === "run_summary");
    const detail = await client.artifact(summary.id);

    assert.equal(artifacts.status, "available");
    assert.equal(artifacts.summary.byKind.run_summary, 1);
    assert.equal(summary.traceId, run.traceId);
    assert.equal(detail.id, summary.id);
    assert.equal(detail.payload.status, "dry_run");
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client reads trace reports in json and markdown", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Gateway report context.", "utf8");
  buildWorkspaceIndex(store);
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const run = await client.runAgent({
      goal: "Gateway report dry run",
      contextQuery: "report",
      dryRun: true,
      trustMode: "approve",
    });
    const contract = await client.traceReportContract();
    const report = await client.traceReport(run.traceId);
    const markdown = await client.traceReport(run.traceId, { format: "markdown" });

    assert.equal(contract.interface, "spruceagent.trace-report");
    assert.equal(report.traceId, run.traceId);
    assert.equal(report.format, "json");
    assert.equal(report.summary.artifactCount > 0, true);
    assert.equal(report.rawEvents, undefined);
    assert.match(markdown.markdown, /# Agent Trace Report: Gateway report dry run/);
    assert.match(markdown.markdown, /## Artifacts/);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client reads and plans agent adapters without execution", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Agent adapter gateway context.", "utf8");
  buildWorkspaceIndex(store);
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const contract = await client.agentAdapterContract();
    const adapters = await client.listAgentAdapters();
    const adapter = await client.getAgentAdapter("codex-cli");
    const plan = await client.planAgentAdapterRun("codex-cli", {
      goal: "Plan adapter gateway run",
      contextQuery: "adapter",
    });

    assert.equal(contract.interface, "spruceagent.agent-adapters");
    assert.equal(adapters.summary.total >= 5, true);
    assert.equal(adapter.id, "codex-cli");
    assert.equal(adapter.capabilities.directExecution, false);
    assert.equal(plan.status, "planned");
    assert.equal(plan.executionMode, "preview_only");
    assert.equal(plan.adapter.id, "codex-cli");
    assert.equal(plan.isolation.requiresGitWorktree, true);
    assert.equal(plan.reviewGate.mergeAllowedInV0, false);
    assert.equal(plan.sourceMap.sources.length > 0, true);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client prepares and reads isolated agent workspaces", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  initGitRepo(dir);
  const store = ensureStore(createStore(dir));
  buildWorkspaceIndex(store);
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const contract = await client.agentWorkspaceContract();
    const prepared = await client.prepareAgentWorkspace({
      adapterId: "codex-cli",
      goal: "Prepare gateway workspace",
      contextQuery: "README",
    });
    const list = await client.listAgentWorkspaces();
    const detail = await client.getAgentWorkspace(prepared.id);
    const status = await client.status();

    assert.equal(contract.interface, "spruceagent.agent-workspaces");
    assert.equal(prepared.status, "prepared");
    assert.equal(prepared.adapter.id, "codex-cli");
    assert.equal(prepared.launchPreview.command, "codex");
    assert.equal(prepared.reviewGate.mergeAllowedInV0, false);
    assert.equal(fs.existsSync(prepared.workspacePath), true);
    assert.equal(fs.existsSync(path.join(prepared.workspacePath, "README.md")), true);
    assert.equal(list.summary.total, 1);
    assert.equal(detail.id, prepared.id);
    assert.equal(status.agentWorkspaceCount, 1);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client gates and records local agent workspace launches", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });
  const command = "node -e \"require('fs').writeFileSync('launch-output.txt','ok')\"";

  try {
    const workspace = await client.prepareAgentWorkspace({
      adapterId: "local-shell-agent",
      goal: "Run local launcher command",
    });
    const contract = await client.agentLauncherContract();
    const preview = await client.launchAgentWorkspace({
      workspaceId: workspace.id,
    });
    const blocked = await client.launchAgentWorkspace({
      workspaceId: workspace.id,
      execute: true,
      command,
    });
    await client.approve(blocked.approval.id, { reason: "launcher gateway test" });
    const completed = await client.launchAgentWorkspace({
      workspaceId: workspace.id,
      execute: true,
      command,
      approvalId: blocked.approval.id,
    });
    const launches = await client.listAgentLaunches();
    const detail = await client.getAgentLaunch(completed.id);
    const artifacts = await client.artifacts({ kind: "agent_launch" });
    const status = await client.status();

    assert.equal(contract.interface, "spruceagent.agent-launcher");
    assert.equal(preview.status, "planned");
    assert.equal(blocked.status, "requires_approval");
    assert.equal(completed.status, "completed");
    assert.equal(completed.executionMode, "local_shell");
    assert.equal(completed.reviewGate.mergeAllowedInV0, false);
    assert.equal(completed.terminalLog.path.endsWith(".log"), true);
    assert.equal(fs.existsSync(path.join(store.root, completed.terminalLog.path)), true);
    assert.equal(fs.readFileSync(path.join(dir, "launch-output.txt"), "utf8"), "ok");
    assert.equal(launches.summary.total, 3);
    assert.equal(detail.id, completed.id);
    assert.equal(artifacts.summary.byKind.agent_launch >= 3, true);
    assert.equal(status.agentLaunchCount, 3);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client can launch a dry-run agent run", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Workbench launcher context.", "utf8");
  buildWorkspaceIndex(store);
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const run = await client.runAgent({
      goal: "Workbench launcher dry run",
      contextQuery: "launcher",
      dryRun: true,
      trustMode: "approve",
    });
    const detail = await client.getRun(run.traceId);

    assert.equal(run.status, "dry_run");
    assert.equal(detail.status, "dry_run");
    assert.equal(detail.summary.goal, "Workbench launcher dry run");
    assert.equal(detail.summary.toolResultCount, 0);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client reads context freshness and can require fresh context", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Gateway freshness context.", "utf8");
  buildWorkspaceIndex(store);
  fs.writeFileSync(path.join(dir, "README.md"), "Gateway stale context.", "utf8");
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const freshness = await client.contextFreshness();
    const preflight = await client.preflight({
      requireFreshContext: true,
      refreshContext: true,
    });
    const run = await client.runAgent({
      goal: "Require fresh gateway context",
      contextQuery: "Gateway",
      requireFreshContext: true,
      refreshContext: true,
    });

    assert.equal(freshness.status, "stale");
    assert.equal(preflight.status, "passed");
    assert.equal(preflight.context.refreshed, true);
    assert.equal(run.status, "completed");
    assert.equal(run.contextFreshness.status, "fresh");
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client previews run risk without executing planned tools", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const risk = await client.riskPreflight({
      trustMode: "approve",
      plan: {
        steps: [
          { id: "write", kind: "tool", toolName: "file.write", input: { path: "gateway-risk.md", content: "x" } },
        ],
      },
    });

    assert.equal(risk.status, "warning");
    assert.equal(risk.summary.requires_approval, 1);
    assert.equal(fs.existsSync(path.join(dir, "gateway-risk.md")), false);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client lists skills and runs workflow dry-runs", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = proposeSkill(store, {
    name: "Gateway Skill",
    summary: "Reads through an approved skill.",
    steps: [
      "Use file.read with input {\"path\":\"README.md\"}",
      "Verify file.read succeeded",
    ],
  });
  approveSkill(store, candidate.id, { approvedBy: "test" });
  const workflow = createWorkflow(store, {
    name: "Gateway Workflow",
    steps: [
      { kind: "context", query: "Gateway" },
    ],
  });
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const skills = await client.listSkills();
    const workflows = await client.listWorkflows();
    const result = await client.runWorkflow(workflow.id, {
      dryRun: true,
      trustMode: "approve",
    });
    const workflowInbox = await client.workflowInbox();
    const detail = await client.getWorkflowRun(result.traceId);

    assert.equal(skills.some((skill) => skill.id === candidate.id), true);
    assert.equal(workflows.some((item) => item.id === workflow.id), true);
    assert.equal(result.status, "dry_run");
    assert.equal(result.workflow.id, workflow.id);
    assert.equal(workflowInbox.workflowRuns[0].traceId, result.traceId);
    assert.equal(detail.status, "dry_run");
    assert.equal(detail.summary.workflowId, workflow.id);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client evaluates candidate skills without executing them", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = proposeSkill(store, {
    name: "Gateway Candidate Evaluation",
    summary: "Checks a write step before approval.",
    steps: [
      "Use file.write with input {\"path\":\"gateway-skill-eval.txt\",\"content\":\"blocked\"}",
    ],
  });
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const evaluation = await client.evaluateSkill(candidate.id);
    const listed = await client.listSkillEvaluations();
    const loaded = await client.getSkillEvaluation(evaluation.id);

    assert.equal(evaluation.skillId, candidate.id);
    assert.equal(evaluation.status, "needs_review");
    assert.equal(evaluation.summary.policyDecisionCounts.requires_approval, 1);
    assert.equal(listed.some((item) => item.id === evaluation.id), true);
    assert.equal(loaded.id, evaluation.id);
    assert.equal(fs.existsSync(path.join(dir, "gateway-skill-eval.txt")), false);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client promotes candidate skills through the evaluation gate", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const promotion = await client.promoteSkill(candidate.id, {
      reason: "gateway promotion test",
    });
    const versions = await client.listSkillVersions(candidate.id);
    const version = await client.getSkillVersion(candidate.id, 1);
    const skills = await client.listSkills();
    const candidates = await client.listSkills("candidates");

    assert.equal(promotion.status, "promoted");
    assert.equal(promotion.skill.status, "approved");
    assert.equal(promotion.evaluation.status, "passed");
    assert.equal(versions.length, 1);
    assert.equal(versions[0].event, "skill.promoted");
    assert.equal(version.skill.id, candidate.id);
    assert.equal(skills.some((skill) => skill.id === candidate.id), true);
    assert.equal(candidates.some((skill) => skill.id === candidate.id), false);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client creates and runs skill replay fixtures", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);
  promoteSkillCandidate(store, candidate.id);
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const fixture = await client.createSkillReplayFixture(candidate.id);
    const fixtures = await client.listSkillReplayFixtures();
    const loadedFixture = await client.getSkillReplayFixture(fixture.id);
    const result = await client.replaySkillFixture(fixture.id);
    const results = await client.listSkillReplayResults();
    const loadedResult = await client.getSkillReplayResult(result.id);

    assert.equal(fixture.skillId, candidate.id);
    assert.equal(fixtures.some((item) => item.id === fixture.id), true);
    assert.equal(loadedFixture.id, fixture.id);
    assert.equal(result.status, "passed");
    assert.equal(results.some((item) => item.id === result.id), true);
    assert.equal(loadedResult.id, result.id);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client restores skill versions", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);
  const promotion = promoteSkillCandidate(store, candidate.id);
  const approvedPath = path.join(store.root, "skills", "approved", `${candidate.id}.json`);
  fs.writeFileSync(approvedPath, `${JSON.stringify({
    ...promotion.skill,
    revision: 2,
    steps: [
      ...promotion.skill.steps,
      "Use memory.add with input {\"content\":\"gateway drift\"}",
    ],
  }, null, 2)}\n`, "utf8");
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const restored = await client.restoreSkillVersion(candidate.id, 1, {
      reason: "gateway restore test",
    });
    const versions = await client.listSkillVersions(candidate.id);

    assert.equal(restored.revision, 2);
    assert.deepEqual(restored.steps, promotion.skill.steps);
    assert.equal(versions.length, 2);
    assert.equal(versions[1].event, "skill.restored");
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client exports and imports skill packages as candidates", async () => {
  const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-source-"));
  const sourceStore = ensureStore(createStore(sourceDir));
  const candidate = await extractCandidateFromSyntheticRun(sourceStore);
  promoteSkillCandidate(sourceStore, candidate.id);
  const sourceGateway = await startGatewayServer(sourceStore, { port: 0 });
  const sourceClient = createGatewayClient({
    baseUrl: `http://${sourceGateway.host}:${sourceGateway.port}`,
    token: sourceGateway.token,
  });

  let pkg;
  try {
    pkg = await sourceClient.exportSkillPackage(candidate.id);
    const packages = await sourceClient.listSkillPackages();
    const loaded = await sourceClient.getSkillPackage(pkg.id);
    assert.equal(packages.some((item) => item.id === pkg.id), true);
    assert.equal(loaded.id, pkg.id);
  } finally {
    await closeServer(sourceGateway.server);
  }

  const targetDir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-target-"));
  const targetStore = ensureStore(createStore(targetDir));
  const targetGateway = await startGatewayServer(targetStore, { port: 0 });
  const targetClient = createGatewayClient({
    baseUrl: `http://${targetGateway.host}:${targetGateway.port}`,
    token: targetGateway.token,
  });

  try {
    const imported = await targetClient.importSkillPackage({ package: pkg });
    const imports = await targetClient.listSkillPackageImports();
    const importRecord = await targetClient.getSkillPackageImport(imported.id);
    const candidates = await targetClient.listSkills("candidates");
    const approved = await targetClient.listSkills("approved");

    assert.equal(imported.status, "imported_as_candidate");
    assert.equal(imported.candidateSkill.status, "candidate");
    assert.equal(candidates.some((item) => item.id === imported.candidateSkill.id), true);
    assert.equal(approved.length, 0);
    assert.equal(imports.some((item) => item.id === imported.id), true);
    assert.equal(importRecord.candidateSkillId, imported.candidateSkill.id);
  } finally {
    await closeServer(targetGateway.server);
  }
});

test("gateway client can create workflow definitions", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const workflow = await client.createWorkflow({
      name: "Gateway Created Workflow",
      summary: "Created through Gateway.",
      steps: [
        { kind: "context", query: "Gateway", limit: 1 },
        { kind: "memory", content: "Gateway workflow created.", tags: ["gateway-test"] },
      ],
      createdFrom: "test",
    });
    const workflows = await client.listWorkflows();
    const result = await client.runWorkflow(workflow.id, { dryRun: true });
    const detail = await client.getWorkflowRun(result.traceId);

    assert.match(workflow.id, /^workflow_/);
    assert.equal(workflow.metadata.createdFrom, "test");
    assert.equal(workflows.some((item) => item.id === workflow.id), true);
    assert.equal(result.status, "dry_run");
    assert.equal(detail.summary.workflowId, workflow.id);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client can update, archive, and restore workflow definitions", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const workflow = await client.createWorkflow({
      name: "Gateway Governed Workflow",
      steps: [
        { kind: "context", query: "Gateway" },
      ],
      createdFrom: "test",
    });
    const updated = await client.updateWorkflow(workflow.id, {
      name: "Gateway Governed Workflow v2",
      steps: [
        { kind: "context", query: "Gateway v2" },
        { kind: "memory", content: "gateway revision two", tags: ["gateway-test"] },
      ],
      actor: "test",
      reason: "gateway update",
    });
    const revisionOne = await client.getWorkflowVersion(workflow.id, 1);
    const archived = await client.archiveWorkflow(workflow.id, {
      actor: "test",
      reason: "gateway archive",
    });
    const active = await client.listWorkflows();
    const archivedList = await client.listWorkflows({ status: "archived" });
    const restored = await client.restoreWorkflowVersion(workflow.id, 1, {
      actor: "test",
      reason: "gateway restore",
    });
    const versions = await client.listWorkflowVersions(workflow.id);

    assert.equal(updated.revision, 2);
    assert.equal(revisionOne.workflow.name, "Gateway Governed Workflow");
    assert.equal(archived.status, "archived");
    assert.equal(active.some((item) => item.id === workflow.id), false);
    assert.equal(archivedList.some((item) => item.id === workflow.id), true);
    assert.equal(restored.revision, 4);
    assert.equal(restored.name, "Gateway Governed Workflow");
    assert.deepEqual(versions.map((item) => item.revision), [1, 2, 3, 4]);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client can draft and save workflow builder output", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Gateway workflow builder context.", "utf8");
  buildWorkspaceIndex(store);
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const draft = await client.draftWorkflow({
      goal: "Create a gateway workflow builder test",
      contextQuery: "Gateway workflow builder",
      llmProvider: "mock",
    });
    const saved = await client.saveWorkflowDraft({
      draft,
    });
    const workflows = await client.listWorkflows();

    assert.equal(draft.status, "drafted");
    assert.equal(draft.review.saved, false);
    assert.equal(saved.status, "saved");
    assert.equal(saved.review.saved, true);
    assert.equal(workflows.some((item) => item.id === saved.workflow.id), true);
  } finally {
    await closeServer(gateway.server);
  }
});

test("gateway client can resume approval-gated workflow run", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workflow = createWorkflow(store, {
    name: "Gateway Workflow Resume",
    steps: [
      { kind: "tool", toolName: "file.write", input: { path: "gateway-workflow-resume.txt", content: "gateway workflow resumed" } },
    ],
  });
  const gateway = await startGatewayServer(store, { port: 0 });
  const client = createGatewayClient({
    baseUrl: `http://${gateway.host}:${gateway.port}`,
    token: gateway.token,
  });

  try {
    const run = await client.runWorkflow(workflow.id);
    const approvalId = run.results[0].approval.id;
    await client.approve(approvalId, { reason: "workflow resume gateway test" });
    const resumed = await client.resumeWorkflowRun(run.traceId);
    const detail = await client.getWorkflowRun(run.traceId);

    assert.equal(run.status, "requires_approval");
    assert.equal(resumed.status, "completed");
    assert.equal(detail.status, "completed");
    assert.equal(fs.readFileSync(path.join(dir, "gateway-workflow-resume.txt"), "utf8"), "gateway workflow resumed");
  } finally {
    await closeServer(gateway.server);
  }
});

test("llm adapter contract exposes draft-only boundary", () => {
  const contract = getLlmAdapterContract();

  assert.equal(contract.interface, "spruceagent.llm-adapter");
  assert.equal(contract.outputKind, "plan_draft");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("never executes tools")));
});

test("agent run can attach mock llm plan draft without executing it", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "trust.md"), "TrustKernel governs safe execution.", "utf8");
  buildWorkspaceIndex(store);

  const run = await runAgent(store, {
    goal: "Draft a safe TrustKernel plan",
    contextQuery: "TrustKernel",
    dryRun: true,
    llmProvider: "mock",
  });
  const events = readTraceEvents(store, run.traceId);

  assert.equal(run.status, "dry_run");
  assert.equal(run.knownFacts.llmConnected, true);
  assert.equal(run.knownFacts.llmProvider, "mock");
  assert.equal(run.llm.status, "drafted");
  assert.equal(run.llm.planDraft.proposedSteps.every((step) => step.executable === false), true);
  assert.ok(events.some((event) => event.type === "llm.request"));
  assert.ok(events.some((event) => event.type === "llm.response"));
  assert.equal(events.some((event) => event.type === "tool.result"), false);
});

test("llm adapter normalizes provider executable steps to non-executable drafts", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const provider = {
    id: "unsafe-mock",
    model: "unsafe-mock-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "attempt_execute",
              kind: "tool",
              description: "Try to execute a write.",
              executable: true,
              toolName: "file.write",
            },
          ],
        },
      };
    },
  };

  const draft = await draftLlmPlan(store, {
    provider,
    goal: "Do not execute this",
    context: { resultCount: 0, results: [] },
    knownFacts: {},
  });

  assert.equal(draft.status, "drafted");
  assert.equal(draft.planDraft.proposedSteps[0].executable, false);
  assert.equal(draft.planDraft.proposedSteps[0].toolName, "file.write");
});

test("openai-compatible llm provider drafts from chat completions response", async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({
      url,
      options,
    });
    return jsonResponse({
      id: "chatcmpl-test",
      model: "provider-model",
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary: "Provider draft.",
              proposedSteps: [
                {
                  id: "provider_step",
                  kind: "planning",
                  description: "Draft only.",
                  executable: true,
                  toolName: "file.write",
                },
              ],
              constraints: ["draft only"],
            }),
          },
        },
      ],
      usage: {
        prompt_tokens: 1,
        completion_tokens: 1,
      },
    });
  };

  try {
    const provider = createOpenAiCompatibleLlmProvider({
      id: "test-compatible",
      baseUrl: "https://example.test/v1",
      model: "provider-model",
      apiKey: "test-key",
    });
    const draft = await provider.draftPlan({
      goal: "Plan safely",
      context: { resultCount: 0, results: [] },
      knownFacts: {},
    });

    assert.equal(calls[0].url, "https://example.test/v1/chat/completions");
    assert.equal(JSON.parse(calls[0].options.body).model, "provider-model");
    assert.equal(draft.provider, "test-compatible");
    assert.equal(draft.planDraft.proposedSteps[0].executable, false);
    assert.equal(draft.planDraft.proposedSteps[0].toolName, "file.write");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("deepseek provider uses official openai-compatible base url by default", () => {
  const provider = createDeepSeekLlmProvider({
    apiKey: "test-key",
  });

  assert.equal(provider.id, "deepseek");
  assert.equal(provider.model, "deepseek-v4-flash");
  assert.equal(provider.baseUrl, "https://api.deepseek.com");
});

test("planner promotion contract exposes allowlisted candidate boundary", () => {
  const contract = getPlannerPromotionContract();

  assert.equal(contract.interface, "spruceagent.planner-promotion");
  assert.ok(contract.defaultAllowedTools.includes("file.read"));
  assert.ok(contract.safetyBoundary.some((item) => item.includes("never executes tools")));
});

test("planner promotion marks allowlisted low-risk tool as ready", () => {
  const candidatePlan = promoteLlmDraftToCandidatePlan({
    llm: {
      provider: "test",
      model: "test",
      status: "drafted",
      planDraft: {
        proposedSteps: [
          {
            id: "read_step",
            kind: "tool",
            description: "Read README.",
            toolName: "file.read",
            input: { path: "README.md" },
          },
        ],
      },
    },
  });

  assert.equal(candidatePlan.status, "ready");
  assert.equal(candidatePlan.promotedSteps[0].promotionStatus, "ready");
  assert.equal(candidatePlan.promotedSteps[0].executable, true);
  assert.equal(candidatePlan.promotedSteps[0].policyPreview.decision, "allow");
});

test("planner promotion blocks unknown tools and gates non-allowlisted tools", () => {
  const candidatePlan = promoteLlmDraftToCandidatePlan({
    planDraft: {
      proposedSteps: [
        {
          id: "unknown",
          toolName: "unknown.tool",
          input: {},
        },
        {
          id: "write",
          toolName: "file.write",
          input: { path: "out.txt", content: "hello" },
        },
      ],
    },
  });

  assert.equal(candidatePlan.status, "blocked");
  assert.equal(candidatePlan.promotedSteps[0].promotionStatus, "blocked");
  assert.equal(candidatePlan.promotedSteps[1].promotionStatus, "requires_approval");
  assert.equal(candidatePlan.promotedSteps[1].executable, false);
});

test("agent run can promote llm draft into candidate plan without executing it", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "TrustKernel planner promotion.", "utf8");
  buildWorkspaceIndex(store);
  const provider = {
    id: "planner-test",
    model: "planner-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "read_readme",
              kind: "tool",
              description: "Read README.",
              toolName: "file.read",
              input: { path: "README.md" },
            },
          ],
        },
      };
    },
  };

  const run = await runAgent(store, {
    goal: "Promote safe read",
    contextQuery: "TrustKernel",
    dryRun: true,
    llmProvider: provider,
    promotePlan: true,
  });
  const events = readTraceEvents(store, run.traceId);

  assert.equal(run.candidatePlan.status, "ready");
  assert.equal(run.results.length, 0);
  assert.ok(events.some((event) => event.type === "planner.promotion"));
  assert.equal(events.some((event) => event.type === "tool.result"), false);
});

test("candidate execution contract exposes ready-only boundary", () => {
  const contract = getCandidateExecutionContract();

  assert.equal(contract.interface, "spruceagent.candidate-execution");
  assert.equal(contract.defaultExecutableStatus, "ready");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("Only promotionStatus=ready")));
  assert.ok(contract.safetyBoundary.some((item) => item.includes("executeTool and TrustKernel")));
});

test("candidate execution runs ready candidate steps through TrustKernel", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Candidate execution reads this.", "utf8");
  const trace = startTrace(store, { goal: "execute candidate" });

  const execution = await executeCandidatePlan(store, {
    traceId: trace.id,
    candidatePlan: {
      promotedSteps: [
        {
          id: "read_readme",
          promotionStatus: "ready",
          executable: true,
          toolName: "file.read",
          input: { path: "README.md" },
        },
      ],
    },
  });
  const events = readTraceEvents(store, trace.id);

  assert.equal(execution.status, "completed");
  assert.equal(execution.results[0].status, "succeeded");
  assert.equal(execution.results[0].output.content, "Candidate execution reads this.");
  assert.ok(events.some((event) => event.type === "candidate.step.started"));
  assert.ok(events.some((event) => event.type === "tool.result"));
  assert.ok(events.some((event) => event.type === "candidate.execution.completed"));
});

test("candidate execution skips non-ready candidate steps", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));

  const execution = await executeCandidatePlan(store, {
    candidatePlan: {
      promotedSteps: [
        {
          id: "write_requires_approval",
          promotionStatus: "requires_approval",
          executable: false,
          reason: "tool is not in allowlist",
          requestedToolName: "file.write",
          requestedInput: { path: "out.txt", content: "blocked" },
        },
        {
          id: "unknown_tool",
          promotionStatus: "blocked",
          executable: false,
          reason: "unknown tool",
          requestedToolName: "unknown.tool",
        },
        {
          id: "plain_text",
          promotionStatus: "not_promotable",
          executable: false,
          reason: "no tool input",
        },
      ],
    },
  });

  assert.equal(execution.status, "completed_with_blockers");
  assert.deepEqual(execution.summary, {
    requires_approval: 1,
    blocked: 1,
    skipped: 1,
  });
  assert.equal(fs.existsSync(path.join(dir, "out.txt")), false);
});

test("candidate approval contract exposes exact-ticket boundary", () => {
  const contract = getCandidateApprovalContract();

  assert.equal(contract.interface, "spruceagent.candidate-approval");
  assert.equal(contract.approvalStatus, "requires_approval");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("exact requested tool and input")));
});

test("candidate approval creates and reuses approval tickets", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidatePlan = createWriteCandidatePlan();

  const first = requestCandidateApprovals(store, {
    candidatePlan,
    actor: "test-user",
  });
  const second = requestCandidateApprovals(store, {
    candidatePlan,
    actor: "test-user",
  });

  assert.equal(first.status, "requires_approval");
  assert.equal(first.results[0].status, "approval_created");
  assert.equal(first.results[0].approval.toolName, "file.write");
  assert.equal(first.results[0].approval.metadata.kind, "candidate_step");
  assert.equal(first.results[0].approval.metadata.candidateStepId, "write_note");
  assert.equal(second.results[0].status, "approval_reused");
  assert.equal(second.results[0].approval.id, first.results[0].approval.id);
  assert.equal(fs.existsSync(path.join(dir, "candidate.txt")), false);
});

test("approved candidate step executes through approval ticket", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const trace = startTrace(store, { goal: "approved candidate execution" });
  const candidatePlan = createWriteCandidatePlan();
  const approvals = requestCandidateApprovals(store, {
    candidatePlan,
    traceId: trace.id,
    actor: "test-user",
  });
  const approvalId = approvals.results[0].approval.id;
  approveTicket(store, approvalId);

  const result = await executeApprovedCandidateStep(store, {
    candidatePlan,
    stepId: "write_note",
    approvalId,
    traceId: trace.id,
  });
  const events = readTraceEvents(store, trace.id);

  assert.equal(result.status, "succeeded");
  assert.equal(result.stepId, "write_note");
  assert.equal(fs.readFileSync(path.join(dir, "candidate.txt"), "utf8"), "approved candidate write");
  assert.equal(getApprovalTicket(store, approvalId).status, "consumed");
  assert.ok(events.some((event) => event.type === "candidate.approval.created"));
  assert.ok(events.some((event) => event.type === "candidate.approved_step.completed"));
  assert.ok(events.some((event) => event.type === "tool.result"));
});

test("approved candidate step consumes ticket even when policy would allow tool", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "approval-bound read", "utf8");
  const candidatePlan = promoteLlmDraftToCandidatePlan({
    allowedTools: [],
    planDraft: {
      proposedSteps: [
        {
          id: "read_readme",
          kind: "tool",
          description: "Read README.",
          toolName: "file.read",
          input: { path: "README.md" },
        },
      ],
    },
  });
  const approvals = requestCandidateApprovals(store, { candidatePlan });
  const approvalId = approvals.results[0].approval.id;
  approveTicket(store, approvalId);

  const result = await executeApprovedCandidateStep(store, {
    candidatePlan,
    stepId: "read_readme",
    approvalId,
  });

  assert.equal(result.status, "succeeded");
  assert.equal(result.output.content, "approval-bound read");
  assert.equal(getApprovalTicket(store, approvalId).status, "consumed");
});

test("run continuation contract exposes trace resume boundary", () => {
  const contract = getRunContinuationContract();

  assert.equal(contract.interface, "spruceagent.run-continuation");
  assert.equal(contract.sourceKind, "agent.run.trace");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("existing agent run trace")));
});

test("run inbox contract exposes read-only workbench boundary", () => {
  const contract = getRunInboxContract();

  assert.equal(contract.interface, "spruceagent.run-inbox");
  assert.equal(contract.outputKind, "desktop_workbench_state");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("read-only")));
});

test("approval queue contract exposes read-only decision queue boundary", () => {
  const contract = getApprovalQueueContract();

  assert.equal(contract.interface, "spruceagent.approval-queue");
  assert.equal(contract.outputKind, "decision_queue");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("read-only")));
});

test("artifact contract exposes read-only execution journal boundary", () => {
  const contract = getArtifactContract();

  assert.equal(contract.interface, "spruceagent.artifacts");
  assert.equal(contract.outputKind, "execution_journal");
  assert.ok(contract.artifactKinds.includes("tool_result"));
  assert.ok(contract.safetyBoundary.some((item) => item.includes("read-only")));
});

test("trace report contract exposes export-only audit boundary", () => {
  const contract = getTraceReportContract();

  assert.equal(contract.interface, "spruceagent.trace-report");
  assert.equal(contract.outputKind, "exportable_audit_report");
  assert.ok(contract.formats.includes("markdown"));
  assert.ok(contract.safetyBoundary.some((item) => item.includes("read-only")));
  assert.ok(contract.safetyBoundary.some((item) => item.includes("execute tools")));
});

test("agent adapter registry exposes planned CLI adapters without execution", () => {
  const contract = getAgentAdapterContract();
  const adapters = listAgentAdapters();
  const codex = getAgentAdapter("codex-cli");

  assert.equal(contract.interface, "spruceagent.agent-adapters");
  assert.equal(contract.outputKind, "agent_fleet_control_plane");
  assert.ok(contract.plannedIsolationModes.includes("git_worktree"));
  assert.equal(adapters.status, "available");
  assert.equal(adapters.summary.byKind.coding_cli >= 3, true);
  assert.equal(codex.id, "codex-cli");
  assert.equal(codex.capabilities.directExecution, false);
  assert.ok(codex.integrationChecklist.some((item) => item.includes("isolated workspace")));
});

test("agent launcher contract exposes gated local execution boundary", () => {
  const contract = getAgentLauncherContract();

  assert.equal(contract.interface, "spruceagent.agent-launcher");
  assert.equal(contract.outputKind, "gated_agent_launch_record");
  assert.deepEqual(contract.executableAdaptersInV0, ["local-shell-agent"]);
  assert.ok(contract.safetyBoundary.some((item) => item.includes("External coding CLI adapters are preview-only")));
  assert.ok(contract.safetyBoundary.some((item) => item.includes("Git commit")));
});

test("run detail contract exposes read-only trace audit boundary", () => {
  const contract = getRunDetailContract();

  assert.equal(contract.interface, "spruceagent.run-detail");
  assert.equal(contract.sourceKind, "agent.run.trace");
  assert.equal(contract.outputKind, "audit_view");
  assert.ok(contract.safetyBoundary.some((item) => item.includes("read-only")));
});

test("workflow inbox and detail contracts expose read-only workflow boundaries", () => {
  const inbox = getWorkflowInboxContract();
  const detail = getWorkflowDetailContract();
  const continuation = getWorkflowContinuationContract();

  assert.equal(inbox.interface, "spruceagent.workflow-inbox");
  assert.equal(inbox.sourceKind, "workflow.run.trace");
  assert.ok(inbox.safetyBoundary.some((item) => item.includes("read-only")));
  assert.equal(detail.interface, "spruceagent.workflow-detail");
  assert.equal(detail.outputKind, "audit_view");
  assert.ok(detail.safetyBoundary.some((item) => item.includes("read-only")));
  assert.equal(continuation.interface, "spruceagent.workflow-continuation");
  assert.equal(continuation.sourceKind, "workflow.run.trace");
  assert.ok(continuation.safetyBoundary.some((item) => item.includes("approved matching approval ticket")));
});

test("agent run can request candidate approvals and resume after approval", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  buildWorkspaceIndex(store);
  const provider = {
    id: "resume-test",
    model: "resume-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "write_note",
              kind: "tool",
              description: "Write a candidate note.",
              toolName: "file.write",
              input: {
                path: "resumed.txt",
                content: "resumed candidate write",
              },
            },
          ],
        },
      };
    },
  };

  const run = await runAgent(store, {
    goal: "Create approval and resume",
    llmProvider: provider,
    promotePlan: true,
    requestCandidateApprovals: true,
  });
  const approvalId = run.candidateApprovals.results[0].approval.id;
  const queueBeforeApproval = getApprovalQueue(store, { traceKind: "agent.run" });
  const beforeApproval = await resumeAgentRun(store, { traceId: run.traceId });
  approveTicket(store, approvalId);
  const queueAfterApproval = getApprovalQueue(store, { traceKind: "agent.run" });
  const resumed = await resumeAgentRun(store, { traceId: run.traceId });
  const queueAfterResume = getApprovalQueue(store, { traceKind: "agent.run" });
  const events = readTraceEvents(store, run.traceId);

  assert.equal(run.status, "requires_approval");
  assert.equal(run.results.length, 0);
  assert.equal(run.candidateApprovals.results[0].status, "approval_created");
  assert.equal(queueBeforeApproval.items[0].status, "pending_decision");
  assert.equal(queueBeforeApproval.items[0].actions.some((action) => action.id === "approve"), true);
  assert.equal(beforeApproval.status, "requires_approval");
  assert.equal(queueAfterApproval.items[0].status, "ready_to_resume");
  assert.equal(queueAfterApproval.items[0].actions[0].path, `/v1/runs/${run.traceId}/resume`);
  assert.equal(resumed.status, "completed");
  assert.equal(resumed.results[0].status, "succeeded");
  assert.equal(fs.readFileSync(path.join(dir, "resumed.txt"), "utf8"), "resumed candidate write");
  assert.equal(getApprovalTicket(store, approvalId).status, "consumed");
  assert.equal(queueAfterResume.items[0].status, "completed");
  assert.ok(events.some((event) => event.type === "agent.resume.started"));
  assert.ok(events.some((event) => event.type === "agent.resume.completed"));
});

test("run detail reconstructs candidate approvals and resume trace", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const provider = {
    id: "detail-test",
    model: "detail-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "write_note",
              kind: "tool",
              description: "Write a detail note.",
              toolName: "file.write",
              input: {
                path: "detail.txt",
                content: "detail resumed",
              },
            },
          ],
        },
      };
    },
  };

  const run = await runAgent(store, {
    goal: "Detail approval run",
    llmProvider: provider,
    promotePlan: true,
    requestCandidateApprovals: true,
  });
  const pending = getRunDetail(store, run.traceId);
  const approvalId = pending.approvals[0].approvalId;
  approveTicket(store, approvalId);
  await resumeAgentRun(store, { traceId: run.traceId });
  const completed = getRunDetail(store, run.traceId);

  assert.equal(pending.status, "requires_approval");
  assert.equal(pending.summary.pendingApprovalCount, 1);
  assert.equal(pending.decisionQueue.items[0].status, "pending_decision");
  assert.equal(pending.candidateSteps[0].id, "write_note");
  assert.equal(pending.candidateSteps[0].latestApprovalStatus, "pending");
  assert.ok(pending.timeline.some((event) => event.type === "planner.promotion"));
  assert.ok(pending.timeline.some((event) => event.type === "candidate.approval.created"));
  assert.equal(completed.status, "completed");
  assert.equal(completed.decisionQueue.items[0].status, "completed");
  assert.equal(completed.summary.toolResultCount, 1);
  assert.equal(completed.resumeEvents.length, 1);
  assert.equal(completed.toolResults[0].toolName, "file.write");
  assert.equal(fs.readFileSync(path.join(dir, "detail.txt"), "utf8"), "detail resumed");
});

test("artifacts reconstruct an agent execution journal", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const provider = {
    id: "artifact-test",
    model: "artifact-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "write_artifact",
              kind: "tool",
              description: "Write an artifact note.",
              toolName: "file.write",
              input: {
                path: "artifact.txt",
                content: "artifact journal",
              },
            },
          ],
        },
      };
    },
  };

  const run = await runAgent(store, {
    goal: "Create artifact journal",
    llmProvider: provider,
    promotePlan: true,
    requestCandidateApprovals: true,
  });
  const approvalId = run.candidateApprovals.results[0].approval.id;
  approveTicket(store, approvalId);
  await resumeAgentRun(store, { traceId: run.traceId });
  const evaluation = evaluateTrace(store, run.traceId);
  const artifacts = listArtifacts(store, { traceId: run.traceId });
  const toolArtifact = artifacts.items.find((item) => item.kind === "tool_result");
  const approvalArtifact = artifacts.items.find((item) => item.kind === "approval_decision");
  const evaluationArtifact = artifacts.items.find((item) => item.kind === "evaluation_report");
  const detail = getArtifact(store, toolArtifact.id);
  const runDetail = getRunDetail(store, run.traceId);

  assert.equal(artifacts.status, "available");
  assert.equal(artifacts.summary.byKind.run_summary, 1);
  assert.equal(artifacts.summary.byKind.tool_result, 1);
  assert.equal(artifacts.summary.byKind.approval_decision, 1);
  assert.equal(artifacts.summary.byKind.continuation_result, 1);
  assert.equal(artifacts.summary.byKind.evaluation_report, 1);
  assert.equal(toolArtifact.summary.outputPath, "artifact.txt");
  assert.equal(approvalArtifact.refs.approvalId, approvalId);
  assert.equal(evaluationArtifact.refs.evaluationId, evaluation.id);
  assert.equal(detail.payload.output.path, "artifact.txt");
  assert.equal(runDetail.summary.artifactCount, artifacts.summary.total);
  assert.equal(runDetail.artifacts.some((item) => item.id === toolArtifact.id), true);
});

test("trace report composes source map decisions artifacts and markdown", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Trace report context.", "utf8");
  buildWorkspaceIndex(store);
  const provider = {
    id: "report-test",
    model: "report-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "write_report_artifact",
              kind: "tool",
              description: "Write a report artifact note.",
              toolName: "file.write",
              input: {
                path: "report-artifact.txt",
                content: "trace report artifact",
              },
            },
          ],
        },
      };
    },
  };

  const run = await runAgent(store, {
    goal: "Create trace report",
    contextQuery: "report",
    llmProvider: provider,
    promotePlan: true,
    requestCandidateApprovals: true,
  });
  approveTicket(store, run.candidateApprovals.results[0].approval.id);
  await resumeAgentRun(store, { traceId: run.traceId });
  evaluateTrace(store, run.traceId);

  const report = getTraceReport(store, run.traceId);
  const rawReport = getTraceReport(store, run.traceId, { includeRaw: true });
  const markdown = getTraceReport(store, run.traceId, { format: "markdown" });

  assert.equal(report.interface, "spruceagent.trace-report");
  assert.equal(report.sourceKind, "agent.run");
  assert.equal(report.summary.goal, "Create trace report");
  assert.equal(report.summary.sourceCount > 0, true);
  assert.equal(report.summary.approvalCount, 1);
  assert.equal(report.summary.artifactCount > 0, true);
  assert.equal(report.decisions.approvals[0].status, "consumed");
  assert.equal(report.artifacts.some((artifact) => artifact.kind === "tool_result"), true);
  assert.equal(report.rawEvents, undefined);
  assert.equal(rawReport.rawEvents.length > 0, true);
  assert.equal(markdown.format, "markdown");
  assert.match(markdown.markdown, /# Agent Trace Report: Create trace report/);
  assert.match(markdown.markdown, /## Safety Boundary/);
});

test("trace report supports workflow run traces", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Workflow report context.", "utf8");
  buildWorkspaceIndex(store);
  const workflow = createWorkflow(store, {
    name: "Workflow Report",
    steps: [
      {
        kind: "context",
        query: "workflow report",
      },
      {
        kind: "memory",
        content: "workflow report complete",
        tags: ["workflow-report"],
      },
    ],
  });
  const run = await runWorkflow(store, workflow.id, {
    trustMode: "approve",
  });

  const report = getTraceReport(store, run.traceId);
  const markdown = getTraceReport(store, run.traceId, { format: "markdown" });

  assert.equal(report.sourceKind, "workflow.run");
  assert.equal(report.summary.workflowId, workflow.id);
  assert.equal(report.summary.operationStepCount, 2);
  assert.equal(report.summary.artifactCount > 0, true);
  assert.equal(report.subject.workflow.name, "Workflow Report");
  assert.match(markdown.markdown, /# Workflow Trace Report: Workflow Report/);
});

test("agent adapter run plan previews isolated worktree execution", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Agent adapter planning context.", "utf8");
  buildWorkspaceIndex(store);

  const plan = createAgentAdapterRunPlan(store, {
    adapterId: "claude-code",
    goal: "Plan isolated adapter work",
    contextQuery: "adapter planning",
    baseBranch: "main",
  });

  assert.equal(plan.status, "planned");
  assert.equal(plan.executionMode, "preview_only");
  assert.equal(plan.adapter.id, "claude-code");
  assert.equal(plan.isolation.mode, "git_worktree");
  assert.equal(plan.isolation.baseBranch, "main");
  assert.equal(plan.isolation.requiresGitWorktree, true);
  assert.match(plan.isolation.branchName, /^codex\/agent-claude-code-/);
  assert.equal(plan.launchPreview.command, "claude");
  assert.equal(plan.reviewGate.required, true);
  assert.equal(plan.reviewGate.requiredArtifacts.includes("trace_report"), true);
  assert.equal(plan.sourceMap.sources.length > 0, true);
});

test("agent workspace prepares git worktrees without launching external agents", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  initGitRepo(dir);
  const store = ensureStore(createStore(dir));
  buildWorkspaceIndex(store);

  const contract = getAgentWorkspaceContract();
  const workspace = prepareAgentWorkspace(store, {
    adapterId: "codex-cli",
    goal: "Prepare isolated workspace",
    contextQuery: "README",
  });
  const listed = listAgentWorkspaces(store);
  const loaded = getAgentWorkspace(store, workspace.id);
  const worktreeList = git(dir, ["worktree", "list"]);

  assert.equal(contract.interface, "spruceagent.agent-workspaces");
  assert.equal(contract.modes.includes("git_worktree"), true);
  assert.equal(workspace.status, "prepared");
  assert.equal(workspace.mode, "git_worktree");
  assert.equal(workspace.adapter.id, "codex-cli");
  assert.equal(workspace.git.worktreeCreated, true);
  assert.equal(workspace.launchPreview.command, "codex");
  assert.equal(workspace.reviewGate.mergeAllowedInV0, false);
  assert.match(workspace.workspacePath, /[\\/]\.spruceagent[\\/]worktrees[\\/]/);
  assert.equal(fs.existsSync(workspace.workspacePath), true);
  assert.equal(fs.existsSync(path.join(workspace.workspacePath, "README.md")), true);
  assert.match(worktreeList, new RegExp(workspace.isolation.branchName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(listed.summary.total, 1);
  assert.equal(listed.summary.gitWorktreeCount, 1);
  assert.equal(loaded.id, workspace.id);
  assert.equal(loaded.plan.executionMode, "preview_only");
});

test("agent workspace records readonly adapter workspace without git worktree", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workspace = prepareAgentWorkspace(store, {
    adapterId: "local-shell-agent",
    goal: "Prepare readonly workspace",
  });

  assert.equal(workspace.status, "prepared_readonly");
  assert.equal(workspace.mode, "current_workspace_readonly");
  assert.equal(workspace.workspacePath, dir);
  assert.equal(listAgentWorkspaces(store).summary.gitWorktreeCount, 0);
});

test("agent launcher blocks external CLI execution in v0", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  initGitRepo(dir);
  const store = ensureStore(createStore(dir));
  buildWorkspaceIndex(store);
  const workspace = prepareAgentWorkspace(store, {
    adapterId: "codex-cli",
    goal: "Do not execute external CLI",
    contextQuery: "README",
  });

  const launch = await launchAgentWorkspace(store, {
    workspaceId: workspace.id,
    execute: true,
  });

  assert.equal(getAgentLauncherContract().interface, "spruceagent.agent-launcher");
  assert.equal(launch.status, "blocked");
  assert.equal(launch.executionMode, "external_cli_disabled");
  assert.equal(listAgentLaunches(store).summary.byStatus.blocked, 1);
  assert.equal(getAgentLaunch(store, launch.id).id, launch.id);
});

test("agent launcher executes local shell agent only after approval", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workspace = prepareAgentWorkspace(store, {
    adapterId: "local-shell-agent",
    goal: "Write launcher output",
  });
  const command = "node -e \"require('fs').writeFileSync('launcher-core.txt','ok')\"";

  const pending = await launchAgentWorkspace(store, {
    workspaceId: workspace.id,
    execute: true,
    command,
  });
  approveTicket(store, pending.approval.id, { reason: "launcher core test" });
  const completed = await launchAgentWorkspace(store, {
    workspaceId: workspace.id,
    execute: true,
    command,
    approvalId: pending.approval.id,
  });
  const artifacts = listArtifacts(store, { kind: "agent_launch" });

  assert.equal(pending.status, "requires_approval");
  assert.equal(completed.status, "completed");
  assert.equal(completed.exitCode, 0);
  assert.equal(fs.readFileSync(path.join(dir, "launcher-core.txt"), "utf8"), "ok");
  assert.equal(fs.existsSync(path.join(store.root, completed.terminalLog.path)), true);
  assert.equal(listAgentLaunches(store).summary.completedCount, 1);
  assert.equal(artifacts.summary.byKind.agent_launch >= 2, true);
});

test("agent launcher rejects git mutation commands before approval", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const workspace = prepareAgentWorkspace(store, {
    adapterId: "local-shell-agent",
    goal: "Reject git mutation",
  });

  await assert.rejects(
    () => launchAgentWorkspace(store, {
      workspaceId: workspace.id,
      execute: true,
      command: "git commit -m blocked",
    }),
    /blocks git mutation/,
  );
});

test("run inbox tracks pending approvals, resumable runs, and recent runs", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const provider = {
    id: "inbox-test",
    model: "inbox-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "write_note",
              kind: "tool",
              description: "Write an inbox note.",
              toolName: "file.write",
              input: {
                path: "inbox.txt",
                content: "inbox resumed",
              },
            },
          ],
        },
      };
    },
  };

  const run = await runAgent(store, {
    goal: "Inbox approval run",
    llmProvider: provider,
    promotePlan: true,
    requestCandidateApprovals: true,
  });
  const pending = getRunInbox(store);
  const approvalId = run.candidateApprovals.results[0].approval.id;
  approveTicket(store, approvalId);
  const resumable = getRunInbox(store);
  await resumeAgentRun(store, { traceId: run.traceId });
  const completed = getRunInbox(store);

  assert.equal(pending.status, "action_required");
  assert.equal(pending.summary.pendingApprovalCount, 1);
  assert.equal(pending.summary.decisionQueueCount, 1);
  assert.equal(pending.decisionQueue.items[0].status, "pending_decision");
  assert.equal(pending.pendingApprovals[0].traceId, run.traceId);
  assert.equal(pending.pendingApprovals[0].stepId, "write_note");
  assert.equal(resumable.status, "ready_to_resume");
  assert.equal(resumable.summary.resumableRunCount, 1);
  assert.equal(resumable.decisionQueue.items[0].status, "ready_to_resume");
  assert.equal(resumable.resumableRuns[0].traceId, run.traceId);
  assert.equal(resumable.resumableRuns[0].approvedSteps[0].approvalId, approvalId);
  assert.equal(completed.status, "clear");
  assert.equal(completed.decisionQueue.items[0].status, "completed");
  assert.equal(completed.recentRuns[0].traceId, run.traceId);
  assert.equal(completed.recentRuns[0].continuationStatus, "completed");
});

test("agent run executes promoted ready candidate plan instead of rule-based plan", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Candidate runner integration.", "utf8");
  buildWorkspaceIndex(store);
  const provider = {
    id: "candidate-test",
    model: "candidate-test-v0",
    async draftPlan() {
      return {
        planDraft: {
          proposedSteps: [
            {
              id: "read_readme",
              kind: "tool",
              description: "Read README.",
              toolName: "file.read",
              input: { path: "README.md" },
            },
          ],
        },
      };
    },
  };

  const run = await runAgent(store, {
    goal: "Execute promoted candidate plan",
    contextQuery: "Candidate",
    llmProvider: provider,
    promotePlan: true,
    executeCandidatePlan: true,
  });
  const events = readTraceEvents(store, run.traceId);

  assert.equal(run.status, "completed");
  assert.equal(run.results.length, 0);
  assert.equal(run.candidateExecution.status, "completed");
  assert.equal(run.candidateExecution.results[0].status, "succeeded");
  assert.match(run.candidateExecution.results[0].output.content, /Candidate runner integration/);
  assert.ok(events.some((event) => event.type === "planner.promotion"));
  assert.ok(events.some((event) => event.type === "candidate.execution.completed"));
  assert.ok(events.some((event) => event.type === "tool.result"));
});

test("agent run blocks candidate execution when no candidate plan exists", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  fs.writeFileSync(path.join(dir, "README.md"), "Should not be read by fallback.", "utf8");
  buildWorkspaceIndex(store);

  const run = await runAgent(store, {
    goal: "Execute missing candidate plan",
    contextQuery: "fallback",
    executeCandidatePlan: true,
  });
  const events = readTraceEvents(store, run.traceId);

  assert.equal(run.status, "failed");
  assert.equal(run.results.length, 0);
  assert.equal(run.candidateExecution.status, "completed_with_blockers");
  assert.equal(run.candidateExecution.results[0].status, "blocked");
  assert.equal(events.some((event) => event.type === "tool.result"), false);
});

test("agent run rejects unapproved skill ids", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spruceagent-"));
  const store = ensureStore(createStore(dir));
  const candidate = await extractCandidateFromSyntheticRun(store);

  await assert.rejects(
    () => runAgent(store, {
      goal: "Use candidate directly",
      skillId: candidate.id,
      dryRun: true,
    }),
    /skill not found/,
  );
});

async function extractCandidateFromSyntheticRun(store) {
  fs.writeFileSync(path.join(store.cwd, "trust.md"), "TrustKernel governs safe execution.", "utf8");
  buildWorkspaceIndex(store);
  const run = await runAgent(store, {
    goal: "Read TrustKernel context",
    contextQuery: "TrustKernel",
  });
  return extractSkillFromTrace(store, run.traceId);
}

function createWriteCandidatePlan() {
  return promoteLlmDraftToCandidatePlan({
    planDraft: {
      proposedSteps: [
        {
          id: "write_note",
          kind: "tool",
          description: "Write a candidate note.",
          toolName: "file.write",
          input: {
            path: "candidate.txt",
            content: "approved candidate write",
          },
        },
      ],
    },
  });
}

function initGitRepo(dir) {
  fs.writeFileSync(path.join(dir, "README.md"), "SpruceAgent test repository.", "utf8");
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "test@spruceagent.local"]);
  git(dir, ["config", "user.name", "SpruceAgent Test"]);
  git(dir, ["add", "README.md"]);
  git(dir, ["commit", "-m", "Initial commit"]);
}

function git(dir, args) {
  return execFileSync("git", ["-C", dir, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return {
    status: response.status,
    body: await response.json(),
  };
}

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
    },
  });
  return {
    status: response.status,
    body: await response.text(),
  };
}

async function closeServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
