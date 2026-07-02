import { createContextPack, createSourceMap } from "./context.js";
import { createLlmProvider, draftLlmPlan } from "./llm.js";
import { createWorkflow } from "./workflows.js";
import { listSkills } from "./skills.js";

export const WORKFLOW_BUILDER_CONTRACT = Object.freeze({
  version: "0.1.0",
  interface: "spruceagent.workflow-builder",
  outputKind: "workflow_draft",
  safetyBoundary: [
    "Workflow Builder v0 never executes tools.",
    "LLM output is converted into a reviewable workflow draft only.",
    "Saving a draft creates a workflow definition but does not run it.",
    "Workflow execution remains owned by Workflow runtime and TrustKernel.",
  ],
  supportedDraftSteps: ["context", "skill", "memory"],
  editableFields: {
    workflow: ["name", "summary"],
    context: ["query", "limit"],
    skill: ["skillId"],
    memory: ["content", "tags"],
  },
});

export function getWorkflowBuilderContract() {
  return WORKFLOW_BUILDER_CONTRACT;
}

export async function draftWorkflow(store, input = {}) {
  const goal = String(input.goal ?? "").trim();
  if (!goal) throw new Error("workflow builder goal is required");

  const contextQuery = String(input.contextQuery ?? goal).trim();
  const context = createContextPack(store, contextQuery, {
    limit: input.contextLimit ?? 5,
  });
  const skills = listSkills(store, "approved");
  const selectedSkill = selectSkill(skills, input.skillId);
  const provider = createLlmProvider(input.llmProvider ?? "mock", {
    model: input.llmModel,
    baseUrl: input.llmBaseUrl,
    apiKey: input.llmApiKey,
    timeoutMs: input.llmTimeoutMs,
    temperature: input.llmTemperature,
    maxTokens: input.llmMaxTokens,
  });
  const knownFacts = {
    hasWorkspaceIndex: true,
    contextQuery,
    approvedSkillCount: skills.length,
    selectedSkillId: selectedSkill?.id ?? null,
    builderVersion: WORKFLOW_BUILDER_CONTRACT.version,
    safety: WORKFLOW_BUILDER_CONTRACT.safetyBoundary,
  };
  const llm = await draftLlmPlan(store, {
    provider,
    goal,
    context,
    knownFacts,
    skill: selectedSkill,
  });
  const workflow = buildWorkflowDraft({
    goal,
    contextQuery,
    context,
    llm,
    selectedSkill,
    includeMemoryStep: input.includeMemoryStep !== false,
    name: input.name,
    summary: input.summary,
  });
  const sourceMap = createSourceMap(store, {
    query: contextQuery,
    context,
    skills: selectedSkill ? [selectedSkill] : [],
    llm,
  });

  return {
    version: WORKFLOW_BUILDER_CONTRACT.version,
    status: llm.status === "drafted" ? "drafted" : "failed",
    goal,
    context,
    sourceMap,
    llm,
    workflow,
    review: {
      source: {
        provider: llm.provider,
        model: llm.model,
        llmStatus: llm.status,
      },
      contextPaths: context.results.map((item) => item.path),
      sourceCount: sourceMap.summary.sourceCount,
      approvedSkill: selectedSkill
        ? {
            id: selectedSkill.id,
            name: selectedSkill.name,
            version: selectedSkill.version,
          }
        : null,
      proposedStepCount: llm.planDraft?.proposedSteps?.length ?? 0,
      saved: false,
      limits: [
        "This is a workflow draft, not a run.",
        "Tool steps from LLM output are not auto-converted into workflow tool steps.",
        "Save explicitly, then run through Workflow runtime if accepted.",
      ],
    },
  };
}

export async function createWorkflowFromDraft(store, input = {}) {
  const draft = normalizeWorkflowDraft(input.draft ?? await draftWorkflow(store, input));
  if (draft.status !== "drafted") {
    throw new Error(`cannot save workflow draft with status: ${draft.status}`);
  }
  if (!draft.workflow?.name || !Array.isArray(draft.workflow.steps)) {
    throw new Error("workflow draft with name and steps is required");
  }
  const workflow = createWorkflow(store, {
    ...draft.workflow,
    metadata: {
      ...(draft.workflow.metadata ?? {}),
      createdFrom: "workflow-builder",
      builderVersion: WORKFLOW_BUILDER_CONTRACT.version,
      sourceGoal: draft.goal,
      sourceProvider: draft.llm?.provider,
      sourceModel: draft.llm?.model,
      sourceMap: draft.sourceMap
        ? {
            version: draft.sourceMap.version,
            sourceCount: draft.sourceMap.summary?.sourceCount ?? 0,
            byType: draft.sourceMap.summary?.byType ?? {},
            topWorkspacePath: draft.sourceMap.summary?.topWorkspacePath ?? null,
          }
        : null,
    },
  });
  return {
    ...draft,
    status: "saved",
    workflow,
    review: {
      ...draft.review,
      saved: true,
      workflowId: workflow.id,
    },
  };
}

export function normalizeWorkflowDraft(draft) {
  if (!draft || typeof draft !== "object") {
    throw new Error("workflow draft is required");
  }
  if (!draft.workflow || typeof draft.workflow !== "object") {
    throw new Error("workflow draft must include workflow");
  }
  const workflow = {
    ...draft.workflow,
    name: String(draft.workflow.name ?? "").trim(),
    summary: String(draft.workflow.summary ?? "").trim(),
    steps: normalizeEditableSteps(draft.workflow.steps ?? []),
    metadata: {
      ...(draft.workflow.metadata ?? {}),
      draftEditedAt: draft.workflow.metadata?.draftEditedAt ?? null,
    },
  };
  if (!workflow.name) {
    throw new Error("workflow draft name is required");
  }
  if (!workflow.steps.length) {
    throw new Error("workflow draft must include at least one step");
  }
  return {
    ...draft,
    workflow,
    review: {
      ...(draft.review ?? {}),
      stepCount: workflow.steps.length,
    },
  };
}

function buildWorkflowDraft(input) {
  const name = String(input.name ?? "").trim() || titleFromGoal(input.goal);
  const summary = String(input.summary ?? "").trim()
    || input.llm.planDraft?.summary
    || `Generated workflow draft for: ${input.goal}`;
  const steps = [];
  if (input.context.resultCount > 0) {
    steps.push({
      kind: "context",
      query: input.contextQuery,
      limit: 5,
    });
  }
  if (input.selectedSkill) {
    steps.push({
      kind: "skill",
      skillId: input.selectedSkill.id,
    });
  }
  if (input.includeMemoryStep) {
    steps.push({
      kind: "memory",
      content: `Workflow draft completed for: ${input.goal}`,
      tags: ["workflow-builder", "draft"],
    });
  }
  if (!steps.length) {
    steps.push({
      kind: "memory",
      content: `Workflow draft needs manual steps for: ${input.goal}`,
      tags: ["workflow-builder", "needs-review"],
    });
  }

  return {
    name,
    summary,
    steps,
    metadata: {
      draftKind: "llm_workflow_builder_v0",
      proposedSteps: input.llm.planDraft?.proposedSteps ?? [],
      constraints: input.llm.planDraft?.constraints ?? [],
      contextPaths: input.context.results.map((item) => item.path),
    },
  };
}

function normalizeEditableSteps(steps) {
  if (!Array.isArray(steps)) {
    throw new Error("workflow draft steps must be an array");
  }
  return steps.map((step, index) => normalizeEditableStep(step, index));
}

function normalizeEditableStep(step, index) {
  const kind = String(step?.kind ?? "").trim();
  if (!WORKFLOW_BUILDER_CONTRACT.supportedDraftSteps.includes(kind)) {
    throw new Error(`unsupported workflow draft step kind: ${kind || "missing"}`);
  }
  const id = step.id ?? `workflow_step_${index + 1}`;
  if (kind === "context") {
    const query = String(step.query ?? "").trim();
    if (!query) throw new Error(`context step ${id} requires query`);
    return {
      id,
      kind,
      query,
      limit: Number(step.limit ?? 5),
    };
  }
  if (kind === "skill") {
    const skillId = String(step.skillId ?? "").trim();
    if (!skillId) throw new Error(`skill step ${id} requires skillId`);
    return {
      id,
      kind,
      skillId,
    };
  }
  const content = String(step.content ?? "").trim();
  if (!content) throw new Error(`memory step ${id} requires content`);
  return {
    id,
    kind,
    content,
    tags: Array.isArray(step.tags)
      ? step.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : String(step.tags ?? "workflow-builder,draft")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
  };
}

function selectSkill(skills, skillId) {
  if (!skillId) return null;
  const skill = skills.find((item) => item.id === skillId);
  if (!skill) throw new Error(`approved skill not found: ${skillId}`);
  return skill;
}

function titleFromGoal(goal) {
  const compact = String(goal)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
  return compact ? `Workflow: ${compact}` : "Workflow Draft";
}
