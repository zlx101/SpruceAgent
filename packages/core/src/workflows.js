import fs from "node:fs";
import path from "node:path";
import { addMemory } from "./memory.js";
import { createContextPack } from "./context.js";
import { executeTool } from "./executor.js";
import { createId, nowIso } from "./id.js";
import { runPreflight } from "./preflight.js";
import { getApprovedSkill } from "./skills.js";
import { appendTraceEvent, startTrace } from "./trace.js";
import { appendJsonl, readJson, readJsonl, writeJson } from "./storage.js";

export function createWorkflow(store, input) {
  const workflow = {
    id: createId("workflow"),
    name: input.name,
    version: "0.1.0",
    revision: 1,
    status: "draft",
    summary: input.summary ?? "",
    steps: normalizeWorkflowSteps(input.steps ?? []),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    archivedAt: null,
    metadata: input.metadata ?? {},
  };

  if (!workflow.name || !workflow.name.trim()) {
    throw new Error("workflow name is required");
  }
  if (!workflow.steps.length) {
    throw new Error("workflow must include at least one step");
  }

  writeJson(workflowPath(store, workflow.id), workflow);
  return workflow;
}

export function listWorkflows(store, options = {}) {
  const dir = workflowsDir(store);
  if (!fs.existsSync(dir)) return [];
  const status = options.status ?? "active";
  const workflows = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => readJson(path.join(dir, file)));
  if (status === "all") return workflows;
  if (status === "archived") return workflows.filter((workflow) => workflow.status === "archived");
  return workflows.filter((workflow) => workflow.status !== "archived");
}

export function getWorkflow(store, workflowId) {
  const filePath = workflowPath(store, workflowId);
  if (!fs.existsSync(filePath)) {
    throw new Error(`workflow not found: ${workflowId}`);
  }
  return readJson(filePath);
}

export function updateWorkflow(store, workflowId, input = {}) {
  const current = getWorkflow(store, workflowId);
  if (current.status === "archived" && !input.allowArchivedUpdate) {
    throw new Error(`workflow is archived: ${workflowId}`);
  }
  const next = {
    ...current,
    name: input.name ?? current.name,
    summary: input.summary ?? current.summary,
    steps: input.steps ? normalizeWorkflowSteps(input.steps) : current.steps,
    status: input.status ?? current.status,
    revision: Number(current.revision ?? 1) + 1,
    updatedAt: nowIso(),
    metadata: {
      ...current.metadata,
      ...(input.metadata ?? {}),
      lastUpdatedBy: input.updatedBy ?? "local-user",
      lastUpdateReason: input.reason ?? "workflow updated",
    },
  };
  validateWorkflow(next);
  appendWorkflowHistory(store, current, {
    action: "update",
    actor: input.updatedBy ?? "local-user",
    reason: input.reason ?? "workflow updated",
  });
  writeJson(workflowPath(store, workflowId), next);
  return next;
}

export function archiveWorkflow(store, workflowId, input = {}) {
  const current = getWorkflow(store, workflowId);
  if (current.status === "archived") return current;
  const archived = {
    ...current,
    status: "archived",
    revision: Number(current.revision ?? 1) + 1,
    archivedAt: nowIso(),
    updatedAt: nowIso(),
    metadata: {
      ...current.metadata,
      archivedBy: input.archivedBy ?? "local-user",
      archiveReason: input.reason ?? "workflow archived",
    },
  };
  appendWorkflowHistory(store, current, {
    action: "archive",
    actor: input.archivedBy ?? "local-user",
    reason: input.reason ?? "workflow archived",
  });
  writeJson(workflowPath(store, workflowId), archived);
  return archived;
}

export function listWorkflowVersions(store, workflowId) {
  const current = getWorkflow(store, workflowId);
  return [
    ...readJsonl(workflowHistoryPath(store, workflowId)),
    {
      action: "current",
      revision: current.revision ?? 1,
      savedAt: current.updatedAt,
      actor: current.metadata?.lastUpdatedBy ?? null,
      reason: "current workflow definition",
      workflow: current,
    },
  ];
}

export function getWorkflowVersion(store, workflowId, revision) {
  const target = Number(revision);
  const version = listWorkflowVersions(store, workflowId).find((item) => Number(item.revision) === target);
  if (!version) throw new Error(`workflow version not found: ${workflowId}@${revision}`);
  return version;
}

export function restoreWorkflowVersion(store, workflowId, revision, input = {}) {
  const current = getWorkflow(store, workflowId);
  const version = getWorkflowVersion(store, workflowId, revision);
  const restored = {
    ...version.workflow,
    id: current.id,
    revision: Number(current.revision ?? 1) + 1,
    status: version.workflow.status === "archived" ? "draft" : version.workflow.status,
    archivedAt: null,
    updatedAt: nowIso(),
    metadata: {
      ...version.workflow.metadata,
      restoredFromRevision: Number(revision),
      restoredBy: input.restoredBy ?? "local-user",
      restoreReason: input.reason ?? "workflow restored",
    },
  };
  validateWorkflow(restored);
  appendWorkflowHistory(store, current, {
    action: "restore",
    actor: input.restoredBy ?? "local-user",
    reason: input.reason ?? `restored from revision ${revision}`,
  });
  writeJson(workflowPath(store, workflowId), restored);
  return restored;
}

export async function runWorkflow(store, workflowId, input = {}) {
  const workflow = getWorkflow(store, workflowId);
  if (workflow.status === "archived") {
    throw new Error(`workflow is archived: ${workflowId}`);
  }
  const trace = startTrace(store, {
    goal: input.goal ?? `Run workflow: ${workflow.name}`,
    actor: input.actor ?? "local-user",
    channel: input.channel ?? "cli",
    trustMode: input.trustMode ?? "approve",
    metadata: {
      kind: "workflow.run",
      workflowId,
      dryRun: Boolean(input.dryRun),
    },
  });

  appendTraceEvent(store, trace.id, "workflow.started", {
    workflowId,
    name: workflow.name,
    stepCount: workflow.steps.length,
  });
  const preflight = runPreflight(store, {
    kind: "workflow.run.preflight",
    requireFreshContext: input.requireFreshContext,
    refreshContext: input.refreshContext,
    contextMaxBytes: input.contextMaxBytes,
  });
  appendTraceEvent(store, trace.id, "run.preflight", preflight);
  const contextFreshness = preflight.context.final;
  appendTraceEvent(store, trace.id, "context.staleness", contextFreshness);

  if (!preflight.canProceed) {
    const result = {
      id: trace.id,
      status: "blocked",
      workflow,
      traceId: trace.id,
      preflight,
      contextFreshness,
      results: [],
      limits: [
        "Execution was blocked because preflight found one or more required runtime gates unsatisfied.",
        ...v0Limits(),
      ],
    };
    appendTraceEvent(store, trace.id, "workflow.completed", result);
    return result;
  }

  if (input.dryRun) {
    const result = {
      id: trace.id,
      status: "dry_run",
      workflow,
      traceId: trace.id,
      preflight,
      contextFreshness,
      results: [],
      limits: v0Limits(),
    };
    appendTraceEvent(store, trace.id, "workflow.completed", result);
    return result;
  }

  const results = [];
  for (const step of workflow.steps) {
    appendTraceEvent(store, trace.id, "workflow.step.started", step);
    const result = await executeWorkflowStep(store, trace.id, workflow, step, input);
    results.push(result);
    appendTraceEvent(store, trace.id, "workflow.step.completed", result);
  }

  const status = results.some((result) => result.status === "requires_approval")
    ? "requires_approval"
    : results.some((result) => result.status === "failed" || result.status === "blocked")
      ? "completed_with_blockers"
      : "completed";

  const output = {
    id: trace.id,
    status,
    workflow,
    traceId: trace.id,
    preflight,
    contextFreshness,
    results,
    limits: v0Limits(),
  };
  appendTraceEvent(store, trace.id, "workflow.completed", output);
  return output;
}

export async function executeWorkflowStep(store, traceId, workflow, step, input = {}) {
  if (step.kind === "context") {
    const context = createContextPack(store, step.query ?? workflow.name, {
      limit: step.limit ?? 5,
    });
    appendTraceEvent(store, traceId, "workflow.context", {
      stepId: step.id,
      context,
    });
    return {
      stepId: step.id,
      kind: step.kind,
      status: "succeeded",
      context,
    };
  }

  if (step.kind === "tool") {
    const execution = await executeTool(store, {
      toolName: step.toolName,
      input: step.input ?? {},
      traceId,
      trustMode: input.trustMode ?? "approve",
      requester: input.actor ?? "local-user",
      approvalId: input.approvalIds?.[step.id] ?? input.approvalId,
    });
    return {
      stepId: step.id,
      kind: step.kind,
      ...execution,
    };
  }

  if (step.kind === "skill") {
    const skill = getApprovedSkill(store, step.skillId);
    const skillResults = [];
    for (const executableStep of skill.executableSteps ?? []) {
      const execution = await executeTool(store, {
        toolName: executableStep.toolName,
        input: executableStep.input,
        traceId,
        trustMode: input.trustMode ?? "approve",
        requester: input.actor ?? "local-user",
      });
      skillResults.push({
        executableStepId: executableStep.id,
        ...execution,
      });
    }
    return {
      stepId: step.id,
      kind: step.kind,
      status: skillResults.some((result) => result.status === "requires_approval")
        ? "requires_approval"
        : "succeeded",
      skillId: skill.id,
      results: skillResults,
    };
  }

  if (step.kind === "memory") {
    const memory = addMemory(store, {
      scope: step.scope ?? "project",
      kind: step.memoryKind ?? "note",
      content: step.content,
      tags: step.tags ?? ["workflow"],
      source: "workflow",
      metadata: {
        workflowId: workflow.id,
        stepId: step.id,
        traceId,
      },
    });
    return {
      stepId: step.id,
      kind: step.kind,
      status: "succeeded",
      memory,
    };
  }

  return {
    stepId: step.id,
    kind: step.kind,
    status: "failed",
    error: `unsupported workflow step kind: ${step.kind}`,
  };
}

function normalizeWorkflowSteps(steps) {
  return steps.map((step, index) => ({
    id: step.id ?? `workflow_step_${index + 1}`,
    ...step,
  }));
}

function validateWorkflow(workflow) {
  if (!workflow.name || !workflow.name.trim()) {
    throw new Error("workflow name is required");
  }
  if (!workflow.steps.length) {
    throw new Error("workflow must include at least one step");
  }
}

function appendWorkflowHistory(store, workflow, input) {
  appendJsonl(workflowHistoryPath(store, workflow.id), {
    action: input.action,
    revision: workflow.revision ?? 1,
    savedAt: nowIso(),
    actor: input.actor,
    reason: input.reason,
    workflow,
  });
}

function workflowsDir(store) {
  return path.join(store.root, "workflows");
}

function workflowPath(store, workflowId) {
  return path.join(workflowsDir(store), `${workflowId}.json`);
}

function workflowHistoryPath(store, workflowId) {
  return path.join(store.root, "workflow-history", `${workflowId}.jsonl`);
}

function v0Limits() {
  return [
    "Workflow v0 is local-only.",
    "Workflow v0 has no scheduler, conditionals, retries, or parallel branches.",
    "Workflow skill steps execute only typed executable steps from approved skills.",
    "Every tool call still passes policy and approval gates.",
  ];
}
