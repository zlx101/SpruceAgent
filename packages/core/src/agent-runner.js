import { addMemory } from "./memory.js";
import { createContextPack, readWorkspaceIndex } from "./context.js";
import { executeTool } from "./executor.js";
import { requestCandidateApprovals } from "./candidate-approvals.js";
import { executeCandidatePlan } from "./candidate-executor.js";
import { getApprovedSkill } from "./skills.js";
import { createLlmProvider, draftLlmPlan } from "./llm.js";
import { promoteLlmDraftToCandidatePlan } from "./planner.js";
import { runPreflight } from "./preflight.js";
import { appendTraceEvent, startTrace } from "./trace.js";

export async function runAgent(store, input) {
  const goal = String(input.goal ?? "").trim();
  if (!goal) throw new Error("run goal is required");

  const trustMode = input.trustMode ?? "approve";
  const dryRun = Boolean(input.dryRun);
  const contextQuery = String(input.contextQuery ?? goal).trim();
  const selectedSkill = input.skillId ? getApprovedSkill(store, input.skillId) : null;
  const executeSkill = Boolean(input.executeSkill);
  const trace = startTrace(store, {
    goal,
    actor: input.actor ?? "local-user",
    channel: input.channel ?? "cli",
    trustMode,
    metadata: {
      kind: "agent.run",
      dryRun,
      contextQuery,
      skillId: selectedSkill?.id,
      executeSkill,
    },
  });

  const preflight = runPreflight(store, {
    kind: "agent.run.preflight",
    requireFreshContext: input.requireFreshContext,
    refreshContext: input.refreshContext,
    contextMaxBytes: input.contextMaxBytes,
  });
  appendTraceEvent(store, trace.id, "run.preflight", preflight);

  const llmProvider = resolveLlmProvider(input.llmProvider, input);
  const knownFacts = collectKnownFacts(store, selectedSkill, executeSkill, llmProvider);
  appendTraceEvent(store, trace.id, "agent.known_facts", knownFacts);
  if (selectedSkill) {
    appendTraceEvent(store, trace.id, "agent.skill.invoked", {
      id: selectedSkill.id,
      name: selectedSkill.name,
      version: selectedSkill.version,
      stepCount: selectedSkill.steps.length,
      executableStepCount: selectedSkill.executableSteps?.length ?? 0,
      invocationMode: executeSkill ? "explicit_typed_execution_v0" : "planning_guidance_v0",
    });
  }

  const contextPack = loadContextPack(store, contextQuery, {
    limit: input.contextLimit ?? 5,
  });
  appendTraceEvent(store, trace.id, "agent.context", contextPack);
  const contextFreshness = preflight.context.final;
  appendTraceEvent(store, trace.id, "context.staleness", contextFreshness);

  if (!preflight.canProceed) {
    const result = {
      id: trace.id,
      status: "blocked",
      goal,
      traceId: trace.id,
      knownFacts,
      preflight,
      context: contextPack,
      contextFreshness,
      skill: selectedSkill,
      plan: null,
      llm: null,
      candidatePlan: null,
      results: [],
      limits: [
        "Execution was blocked because preflight found one or more required runtime gates unsatisfied.",
        ...v0Limits(Boolean(llmProvider)),
      ],
    };
    appendTraceEvent(store, trace.id, "agent.completed", result);
    return result;
  }

  const plan = createRuleBasedPlan({ goal, contextPack, dryRun, selectedSkill, executeSkill });
  appendTraceEvent(store, trace.id, "agent.plan", plan);
  const llm = llmProvider
    ? await draftLlmPlan(store, {
        traceId: trace.id,
        provider: llmProvider,
        goal,
        context: contextPack,
        knownFacts,
        skill: selectedSkill,
      })
    : null;
  const candidatePlan = input.promotePlan && llm?.status === "drafted"
    ? promoteLlmDraftToCandidatePlan({
        llm,
        trustMode,
        allowedTools: input.plannerAllowedTools,
      })
    : null;
  if (candidatePlan) {
    appendTraceEvent(store, trace.id, "planner.promotion", candidatePlan);
  }

  if (dryRun) {
    const result = {
      id: trace.id,
      status: "dry_run",
      goal,
      traceId: trace.id,
      knownFacts,
      preflight,
      context: contextPack,
      contextFreshness,
      skill: selectedSkill,
      plan,
      llm,
      candidatePlan,
      results: [],
      limits: v0Limits(Boolean(llmProvider)),
    };
    appendTraceEvent(store, trace.id, "agent.completed", result);
    return result;
  }

  const results = [];
  const candidateApprovals = input.requestCandidateApprovals
    ? candidatePlan
      ? requestCandidateApprovals(store, {
          candidatePlan,
          traceId: trace.id,
          trustMode,
          actor: input.actor ?? "local-user",
        })
      : createMissingCandidateApprovals()
    : null;
  if (input.requestCandidateApprovals && !candidatePlan) {
    appendTraceEvent(store, trace.id, "candidate.approvals.requested", candidateApprovals);
  }
  const candidateExecution = input.executeCandidatePlan
    ? candidatePlan
      ? await executeCandidatePlan(store, {
          candidatePlan,
          traceId: trace.id,
          trustMode,
          actor: input.actor ?? "local-user",
          approvalIds: input.candidateApprovalIds,
        })
      : createMissingCandidateExecution()
    : null;
  if (input.executeCandidatePlan && !candidatePlan) {
    appendTraceEvent(store, trace.id, "candidate.execution.completed", candidateExecution);
  }
  const planStepsToExecute = candidateExecution || candidateApprovals ? [] : plan.steps;
  for (const step of planStepsToExecute) {
    appendTraceEvent(store, trace.id, "agent.step.started", step);
    if (step.toolName) {
      const execution = await executeTool(store, {
        toolName: step.toolName,
        input: step.input,
        traceId: trace.id,
        trustMode,
        requester: input.actor ?? "local-user",
      });
      results.push({ stepId: step.id, ...execution });
      appendTraceEvent(store, trace.id, "agent.step.completed", {
        stepId: step.id,
        status: execution.status,
      });
    } else {
      const observation = {
        stepId: step.id,
        status: "not_executable",
        reason: step.reason ?? "no tool assigned",
      };
      results.push(observation);
      appendTraceEvent(store, trace.id, "agent.step.completed", observation);
    }
  }

  const summary = summarizeRun(goal, results, contextPack);
  const memory = addMemory(store, {
    scope: "session",
    kind: "summary",
    content: summary,
    tags: ["agent-run", "v0"],
    source: "agent-runner",
    metadata: { traceId: trace.id },
  });

  const result = {
    id: trace.id,
    status: deriveRunStatus(results, candidateExecution, candidateApprovals),
    goal,
    traceId: trace.id,
    knownFacts,
    preflight,
    context: contextPack,
    contextFreshness,
    skill: selectedSkill,
    plan,
    llm,
    candidatePlan,
    candidateApprovals,
    candidateExecution,
    results,
    memory,
    summary,
    limits: v0Limits(Boolean(llmProvider)),
  };
  appendTraceEvent(store, trace.id, "agent.completed", result);
  return result;
}

function deriveRunStatus(results, candidateExecution, candidateApprovals) {
  if (candidateApprovals?.status === "requires_approval") return "requires_approval";
  if (candidateApprovals?.status === "completed_with_blockers") return "failed";
  if (candidateExecution?.status === "requires_approval") return "requires_approval";
  if (candidateExecution?.status === "completed_with_blockers") return "failed";
  if (results.some((item) => item.status === "requires_approval")) return "requires_approval";
  if (results.some((item) => item.status === "failed" || item.status === "blocked")) return "failed";
  return "completed";
}

function createMissingCandidateApprovals() {
  return {
    version: "0.1.0",
    status: "completed_with_blockers",
    resultCount: 1,
    summary: {
      blocked: 1,
    },
    results: [
      {
        stepId: "candidate_plan_missing",
        status: "blocked",
        reason: "requestCandidateApprovals requires a candidatePlan; enable promotePlan with an LLM provider",
      },
    ],
    limits: [
      "Candidate approvals were explicitly requested, so the rule-based plan was not executed as a fallback.",
    ],
  };
}

function createMissingCandidateExecution() {
  return {
    version: "0.1.0",
    status: "completed_with_blockers",
    resultCount: 1,
    summary: {
      blocked: 1,
    },
    results: [
      {
        stepId: "candidate_plan_missing",
        status: "blocked",
        reason: "executeCandidatePlan requires a candidatePlan; enable promotePlan with an LLM provider",
      },
    ],
    limits: [
      "Candidate execution was explicitly requested, so the rule-based plan was not executed as a fallback.",
    ],
  };
}

function collectKnownFacts(store, selectedSkill, executeSkill, llmProvider) {
  const index = readWorkspaceIndex(store);
  return {
    hasWorkspaceIndex: Boolean(index),
    indexedDocumentCount: index?.documentCount ?? 0,
    indexedAt: index?.indexedAt ?? null,
    runner: llmProvider ? "rule_based_with_llm_draft_v0" : "rule_based_v0",
    llmConnected: Boolean(llmProvider),
    llmProvider: llmProvider?.id ?? null,
    llmModel: llmProvider?.model ?? null,
    skillsInvoked: Boolean(selectedSkill),
    invokedSkillId: selectedSkill?.id ?? null,
    executeSkill,
    gatewayConnected: false,
    desktopUiConnected: false,
  };
}

function resolveLlmProvider(provider, input) {
  return createLlmProvider(provider, {
    model: input.llmModel,
    baseUrl: input.llmBaseUrl,
    apiKey: input.llmApiKey,
    timeoutMs: input.llmTimeoutMs,
    temperature: input.llmTemperature,
    maxTokens: input.llmMaxTokens,
  });
}

function loadContextPack(store, query, options) {
  const index = readWorkspaceIndex(store);
  if (!index) {
    return {
      query,
      createdAt: new Date().toISOString(),
      resultCount: 0,
      results: [],
      warning: "workspace index not found; run context index first",
    };
  }
  return createContextPack(store, query, options);
}

function createRuleBasedPlan({ goal, contextPack, selectedSkill, executeSkill }) {
  const steps = [];

  if (selectedSkill) {
    steps.push({
      id: "step_apply_skill_guidance",
      kind: "skill_guidance",
      description: `Apply approved skill guidance: ${selectedSkill.name}`,
      toolName: null,
      input: {
        skillId: selectedSkill.id,
        skillVersion: selectedSkill.version,
        steps: selectedSkill.steps,
        executableSteps: selectedSkill.executableSteps ?? [],
        executeSkill,
      },
      reason: executeSkill
        ? "Skill invocation v0 executes only typed executable steps from an explicitly selected approved skill."
        : "Skill invocation v0 uses approved skills as planning guidance; it does not execute natural-language skill steps automatically.",
    });

    if (executeSkill) {
      for (const executableStep of selectedSkill.executableSteps ?? []) {
        steps.push({
          id: `step_skill_${executableStep.id}`,
          kind: "skill_tool",
          description: `Execute approved skill step with ${executableStep.toolName}`,
          toolName: executableStep.toolName,
          input: executableStep.input,
          sourceSkillId: selectedSkill.id,
        });
      }
    }
  }

  steps.push({
    id: "step_context_review",
    kind: "context_review",
    description: "Review retrieved workspace context before taking action.",
    toolName: null,
    input: {},
    reason: "Context review is represented in trace events in v0.",
  });

  const firstContextPath = contextPack.results?.[0]?.path;
  if (firstContextPath) {
    steps.push({
      id: "step_read_top_context",
      kind: "tool",
      description: `Read the top ranked context file: ${firstContextPath}`,
      toolName: "file.read",
      input: { path: firstContextPath },
    });
  }

  steps.push({
    id: "step_record_summary",
    kind: "memory",
    description: "Record a session summary after execution.",
    toolName: null,
    input: {},
    reason: "The runner writes summary memory after executable steps.",
  });

  return {
    planner: "rule_based_v0",
    goal,
    stepCount: steps.length,
    steps,
  };
}

function summarizeRun(goal, results, contextPack) {
  const contextFiles = (contextPack.results ?? []).map((item) => item.path).slice(0, 3);
  const statuses = results.map((item) => `${item.stepId}:${item.status}`).join(", ");
  return [
    `Agent run v0 goal: ${goal}`,
    `Context files: ${contextFiles.length ? contextFiles.join(", ") : "none"}`,
    `Step statuses: ${statuses || "none"}`,
  ].join("\n");
}

function v0Limits(hasLlmProvider) {
  return [
    hasLlmProvider
      ? "LLM Adapter v0 is connected in draft-only mode; no real provider SDK is wired by default."
      : "No LLM planner is connected by default.",
    "LLM Adapter v0 can produce plan drafts only; it never executes tools.",
    "Skills are invoked only when explicitly selected; typed executable steps require executeSkill.",
    "No gateway or desktop UI is connected.",
    "The planner is rule-based and only verifies the execution loop.",
    "Context retrieval is lexical, not embedding-based semantic search.",
  ];
}
