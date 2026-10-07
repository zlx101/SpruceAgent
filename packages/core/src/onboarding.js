import fs from "node:fs";
import path from "node:path";
import { runAgent } from "./agent-runner.js";
import { listApprovalTickets } from "./approvals.js";
import { assessWorkspaceIndexFreshness, buildWorkspaceIndex, readWorkspaceIndex } from "./context.js";
import { getExecutionTaskBoard } from "./execution-tasks.js";
import { listFleetRuns } from "./fleet-runs.js";
import { nowIso } from "./id.js";
import { listLlmProviderConfigs } from "./llm-provider-registry.js";
import { getRunInbox } from "./run-inbox.js";
import { readJson, writeJson } from "./storage.js";
import { createWorkflowFromDraft, draftWorkflow } from "./workflow-builder.js";

const FLEET_TERMINAL = new Set(["completed", "partial_failure", "failed", "cancelled"]);
const REQUIRED_STEPS = Object.freeze(["store", "context_index", "dry_run", "workflow_draft"]);

export const GATEWAY_ONBOARDING_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.gateway-onboarding",
  outputKind: "local_onboarding_report",
  requiredSteps: REQUIRED_STEPS,
  optionalSteps: Object.freeze(["gateway_token", "llm_profile"]),
  safetyBoundary: [
    "Onboarding never executes tools, launches agents, or starts the Gateway process.",
    "The first run is dry-run only and uses the mock planner. No LLM provider or API key is required.",
    "The first workflow draft is reviewable. Saving it is opt-in and still does not run the workflow.",
    "Gateway token presence is recorded by prefix only. Token values are never stored in the onboarding ledger.",
    "Onboarding does not open chat channels, OAuth connectors, or external coding CLIs.",
    "Attention counts are a read-only snapshot of pending approvals, resumable runs, Fleet, and execution-task evidence. They grant no authority.",
  ],
});

export function getGatewayOnboardingContract() {
  return GATEWAY_ONBOARDING_CONTRACT;
}

export function getGatewayOnboardingStatus(store) {
  return buildReport(store, readLedger(store), []);
}

export async function runGatewayOnboarding(store, input = {}) {
  const ranAt = nowIso();
  const ledger = readLedger(store);
  const steps = [];

  steps.push(completeStep("store", "passed", "Local .spruceagent store is available."));

  const index = buildWorkspaceIndex(store);
  const freshness = assessWorkspaceIndexFreshness(store);
  steps.push(completeStep("context_index", freshness.status === "missing" ? "failed" : "passed", `Indexed ${index.documentCount} documents (${freshness.status}).`));

  const run = await runAgent(store, {
    goal: input.goal ?? "Onboarding dry run: review local TrustKernel and ContextOS without executing tools",
    contextQuery: input.contextQuery ?? "TrustKernel",
    dryRun: true,
    llmProvider: "mock",
    actor: input.actor ?? "local-user",
    channel: "onboarding",
  });
  const dryRunOk = run.status === "dry_run" && (run.results?.length ?? 0) === 0;
  steps.push(completeStep("dry_run", dryRunOk ? "passed" : "failed", `Mock dry-run ${run.status}; tool results ${run.results?.length ?? 0}.`));

  const draft = await draftWorkflow(store, {
    goal: input.workflowGoal ?? "Onboarding workflow draft: review project context",
    contextQuery: input.contextQuery ?? "TrustKernel",
    llmProvider: "mock",
    name: input.workflowName ?? "Onboarding Review",
  });
  let workflowSaved = false;
  let workflowId = null;
  if (input.saveWorkflow === true && draft.status === "drafted") {
    const saved = await createWorkflowFromDraft(store, { draft });
    workflowSaved = saved.status === "saved";
    workflowId = saved.workflow?.id ?? null;
  }
  steps.push(completeStep(
    "workflow_draft",
    draft.status === "drafted" ? "passed" : "failed",
    workflowSaved ? `Workflow draft saved as ${workflowId}.` : "Workflow draft created and not saved.",
  ));

  const nextLedger = {
    version: GATEWAY_ONBOARDING_CONTRACT.version,
    updatedAt: ranAt,
    completedSteps: steps.filter((step) => step.status === "passed").map((step) => step.id),
    lastDryRunTraceId: run.traceId ?? null,
    lastDryRunStatus: run.status ?? null,
    lastWorkflowDraftStatus: draft.status ?? null,
    workflowSaved,
    workflowId,
  };
  writeJson(ledgerPath(store), nextLedger);
  const report = buildReport(store, nextLedger, steps);
  report.ranAt = ranAt;
  report.dryRun = {
    traceId: run.traceId ?? null,
    status: run.status ?? null,
    toolResultCount: run.results?.length ?? 0,
    llmProvider: run.knownFacts?.llmProvider ?? "mock",
  };
  report.workflowDraft = {
    status: draft.status,
    saved: workflowSaved,
    workflowId,
    name: draft.workflow?.name ?? null,
  };
  return report;
}

function buildReport(store, ledger, ranSteps) {
  const freshness = assessWorkspaceIndexFreshness(store);
  const index = readWorkspaceIndex(store);
  const auth = readGatewayAuth(store);
  const llm = listLlmProviderConfigs(store);
  const inbox = getRunInbox(store, { limit: 20 });
  const board = getExecutionTaskBoard(store);
  const fleet = listFleetRuns(store);
  const activeFleetCount = fleet.items.filter((item) => !FLEET_TERMINAL.has(item.status)).length;
  const optional = [
    completeStep("gateway_token", auth.tokenConfigured ? "passed" : "incomplete", auth.tokenConfigured
      ? `Gateway token configured (${auth.tokenPrefix}).`
      : "No Gateway token. Run spruce gateway token before Workbench."),
    completeStep("llm_profile", llm.summary.readyCount > 0 ? "passed" : "skipped", llm.summary.readyCount > 0
      ? `${llm.summary.readyCount} ready LLM profile(s). Not required for onboarding.`
      : "No LLM profile. Model invocation is optional and was not used."),
  ];
  const required = ranSteps.length
    ? ranSteps
    : REQUIRED_STEPS.map((id) => reconstructRequiredStep(id, ledger, freshness, index));
  const failed = [...required, ...optional].some((step) => step.status === "failed");
  const requiredComplete = required.every((step) => step.status === "passed");
  const attentionCount = inbox.summary.pendingApprovalCount
    + inbox.summary.resumableRunCount
    + (board.evidenceAttention?.length ?? 0)
    + activeFleetCount;

  return {
    version: GATEWAY_ONBOARDING_CONTRACT.version,
    interface: GATEWAY_ONBOARDING_CONTRACT.interface,
    status: failed ? "failed" : requiredComplete ? "ready" : "incomplete",
    updatedAt: ledger.updatedAt ?? null,
    steps: [...required, ...optional],
    attention: {
      pendingApprovalCount: inbox.summary.pendingApprovalCount,
      resumableRunCount: inbox.summary.resumableRunCount,
      executionTaskEvidenceIssueCount: board.evidenceAttention?.length ?? 0,
      activeFleetRunCount: activeFleetCount,
      pendingApprovalTickets: listApprovalTickets(store, "pending").length,
    },
    context: {
      documentCount: index?.documentCount ?? 0,
      freshness: freshness.status,
      indexedAt: index?.indexedAt ?? null,
    },
    gatewayToken: {
      configured: auth.tokenConfigured,
      prefix: auth.tokenPrefix,
    },
    llm: {
      configuredCount: llm.summary.total,
      readyCount: llm.summary.readyCount,
      required: false,
    },
    ledger: {
      lastDryRunTraceId: ledger.lastDryRunTraceId ?? null,
      lastDryRunStatus: ledger.lastDryRunStatus ?? null,
      workflowSaved: Boolean(ledger.workflowSaved),
      workflowId: ledger.workflowId ?? null,
    },
    attentionNeeded: attentionCount > 0,
    limits: GATEWAY_ONBOARDING_CONTRACT.safetyBoundary,
  };
}

function reconstructRequiredStep(id, ledger, freshness, index) {
  if (id === "store") {
    return completeStep("store", "passed", "Local .spruceagent store is available.");
  }
  if (id === "context_index") {
    const ok = Boolean(index) && freshness.status !== "missing";
    return completeStep("context_index", ok ? "passed" : "incomplete", ok
      ? `Indexed ${index.documentCount} documents (${freshness.status}).`
      : "Workspace index is missing. Run spruce onboard.");
  }
  if (id === "dry_run") {
    const ok = ledger.lastDryRunStatus === "dry_run" && ledger.lastDryRunTraceId;
    return completeStep("dry_run", ok ? "passed" : "incomplete", ok
      ? `Last mock dry-run ${ledger.lastDryRunTraceId}.`
      : "No onboarding dry-run has been recorded.");
  }
  const ok = ledger.lastWorkflowDraftStatus === "drafted";
  return completeStep("workflow_draft", ok ? "passed" : "incomplete", ok
    ? "A mock workflow draft was recorded."
    : "No onboarding workflow draft has been recorded.");
}

function completeStep(id, status, detail) {
  return { id, status, detail };
}

function readLedger(store) {
  const filePath = ledgerPath(store);
  if (!fs.existsSync(filePath)) {
    return {
      version: GATEWAY_ONBOARDING_CONTRACT.version,
      updatedAt: null,
      completedSteps: [],
    };
  }
  return readJson(filePath);
}

function ledgerPath(store) {
  return path.join(store.root, "onboarding.json");
}

function readGatewayAuth(store) {
  const configPath = path.join(store.root, "config.json");
  if (!fs.existsSync(configPath)) {
    return { tokenConfigured: false, tokenPrefix: null };
  }
  const config = readJson(configPath);
  return {
    tokenConfigured: Boolean(config.gateway?.localApiTokenHash),
    tokenPrefix: config.gateway?.localApiTokenPrefix ?? null,
  };
}
