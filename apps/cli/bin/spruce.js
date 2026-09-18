#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  addMemory,
  attestAgentLaunchTrial,
  archiveWorkflow,
  assessWorkspaceIndexFreshness,
  assessAgentExecutionReadiness,
  approveSkill,
  approveFleetRun,
  appendTraceEvent,
  approveTicket,
  buildWorkspaceIndex,
  auditPolicyDecision,
  createAgentAdapterRunPlan,
  createLaunchReview,
  createTaskRoute,
  createContextPack,
  createContextEvidencePack,
  createExecutionTask,
  createExecutionTaskFollowUp,
  createAutopilot,
  createAutopilotRunner,
  configureLlmProvider,
  createSkillReplayFixture,
  createGatewayClient,
  createFleetRun,
  createOutcomeFixture,
  createReleaseArtifactManifest,
  createStore,
  createWorkflow,
  createWorkflowFromDraft,
  draftWorkflow,
  decideLaunchReview,
  ensureStore,
  ensureGatewayToken,
  evaluatePolicy,
  evaluateSkillCandidate,
  evaluateTrace,
  evaluateOutcomeFixture,
  exportSkillPackage,
  executeApprovedCandidateStep,
  executeTool,
  extractSkillFromTrace,
  getEvaluation,
  getFleetRun,
  getFleetRunContract,
  getOutcomeEvaluationContract,
  getOutcomeEvaluationResult,
  getOutcomeFixture,
  getCandidateApprovalContract,
  getContextEvidenceContract,
  getDeploymentPreflightContract,
  getReleaseVerification,
  getReleaseVerificationContract,
  getReleaseArtifactManifest,
  getReleaseArtifactManifestContract,
  getExecutionTask,
  getExecutionTaskEvidence,
  getExecutionTaskClosure,
  getExecutionTaskEvents,
  getExecutionTaskEventStreamContract,
  getExecutionTaskLineage,
  getExecutionTaskBoard,
  getExecutionTaskContract,
  getAutopilot,
  getAutopilotContract,
  getCandidateExecutionContract,
  getGatewayAuthStatus,
  getGatewayRouteContract,
  getGatewayRuntimeContract,
  getGatewayRuntimeState,
  getIndexedDocument,
  getApprovalTicket,
  getApprovalQueue,
  getApprovalQueueContract,
  getArtifact,
  getArtifactContract,
  getAgentAdapter,
  getAgentAdapterContract,
  getAgentLaunch,
  getAgentLauncherContract,
  getExternalCliLauncherContract,
  getAgentTrial,
  getAgentTrialContract,
  getAgentTrialAttestationContract,
  getAgentWorkspace,
  getAgentWorkspaceContract,
  getLaunchReview,
  getLaunchReviewContract,
  getCapabilityProbe,
  getCapabilityProbeContract,
  getTaskRoute,
  getTaskRouterContract,
  getLlmAdapterContract,
  getLlmProviderConfig,
  getLlmProviderRegistryContract,
  getPlannerPromotionContract,
  getRunInbox,
  getRunInboxContract,
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
  getRunContinuationContract,
  getRunDetail,
  getRunDetailContract,
  getTraceReport,
  getTraceReportContract,
  getWorkflowDetailContract,
  getWorkflowBuilderContract,
  getWorkflowInbox,
  getWorkflowInboxContract,
  getWorkflowVersion,
  getWorkflowRunDetail,
  getWorkflowContinuationContract,
  getWorkflow,
  listApprovalTickets,
  listAgentAdapters,
  listAgentLaunches,
  listAgentTrials,
  listAgentWorkspaces,
  listLaunchReviews,
  listCapabilityProbes,
  listTaskRoutes,
  listArtifacts,
  listEvaluations,
  listExecutionTasks,
  listAutopilotFailures,
  listAutopilots,
  listAutopilotTriggers,
  listDueAutopilots,
  listReleaseVerifications,
  listReleaseArtifactManifests,
  listFleetRuns,
  listOutcomeEvaluationResults,
  listOutcomeFixtures,
  listSkillEvaluations,
  listSkillPackageImports,
  listSkillPackages,
  listSkillReplayFixtures,
  listSkillReplayResults,
  listSkillVersions,
  listMemory,
  listLlmProviderConfigs,
  listSkills,
  listTools,
  listTraces,
  listWorkflowVersions,
  listWorkflows,
  proposeSkill,
  promoteSkillCandidate,
  prepareAgentWorkspace,
  retireAgentWorkspace,
  probeAgentCapabilities,
  recordAgentTrial,
  launchAgentWorkspace,
  importSkillPackage,
  readSkillPackageFile,
  requestCandidateApprovals,
  rejectTicket,
  removeLlmProviderConfig,
  readWorkspaceIndex,
  resumeAgentRun,
  resumeWorkflowRun,
  replaySkillFixture,
  restoreSkillVersion,
  restoreWorkflowVersion,
  runDeploymentPreflight,
  runDoctor,
  runDueAutopilots,
  setAutopilotEnabled,
  runAgent,
  runPreflight,
  runWorkflow,
  executeFleetRun,
  searchWorkspaceContext,
  searchMemory,
  summarizeOutcomeFixture,
  startTrace,
  startGatewayServer,
  updateWorkflow,
  claimExecutionTask,
  handoffExecutionTask,
  updateExecutionTask,
  updateAutopilot,
  resumeExecutionTask,
  triggerAutopilot,
  validateLlmProviderConfig,
  requestFleetRunApprovals,
  cancelFleetRun,
} from "../../../packages/core/src/index.js";

const store = createStore(process.cwd());
const [, , command, subcommand, ...rest] = process.argv;

try {
  await main();
} catch (error) {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
}

async function main() {
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (command === "init") {
    ensureStore(store);
    printJson({
      ok: true,
      root: store.root,
      message: "SpruceAgent workspace initialized.",
    });
    return;
  }

  if (command === "doctor") {
    const report = runDoctor(process.cwd());
    printJson(report);
    if (report.status === "failed") {
      process.exitCode = 1;
    }
    return;
  }

  ensureStore(store);

  if (command === "status") {
    printJson({
      root: store.root,
      memoryCount: listMemory(store).length,
      traceCount: listTraces(store).length,
      pendingApprovalCount: listApprovalTickets(store, "pending").length,
      indexedDocumentCount: readWorkspaceIndex(store)?.documentCount ?? 0,
      indexedAt: readWorkspaceIndex(store)?.indexedAt ?? null,
      candidateSkillCount: listSkills(store, "candidates").length,
      approvedSkillCount: listSkills(store, "approved").length,
      workflowCount: listWorkflows(store).length,
      agentAdapterCount: listAgentAdapters().summary.total,
      agentWorkspaceCount: listAgentWorkspaces(store).summary.total,
      agentLaunchCount: listAgentLaunches(store).summary.total,
      launchReviewCount: listLaunchReviews(store).summary.total,
      capabilityProbeCount: listCapabilityProbes(store).summary.total,
      taskRouteCount: listTaskRoutes(store).summary.total,
      executionTaskCount: listExecutionTasks(store).summary.total,
      executionTaskEvidenceIssueCount: getExecutionTaskBoard(store).evidenceAttention.length,
      artifactCount: listArtifacts(store).summary.total,
      evaluationCount: listEvaluations(store).length,
      outcomeFixtureCount: listOutcomeFixtures(store).summary.total,
      outcomeResultCount: listOutcomeEvaluationResults(store).summary.total,
      skillEvaluationCount: listSkillEvaluations(store).length,
      skillReplayFixtureCount: listSkillReplayFixtures(store).length,
      skillReplayResultCount: listSkillReplayResults(store).length,
      skillPackageCount: listSkillPackages(store).length,
      skillPackageImportCount: listSkillPackageImports(store).length,
      releaseVerificationCount: listReleaseVerifications(store, { limit: 1 }).summary.total,
      releaseArtifactManifestCount: listReleaseArtifactManifests(store, { limit: 1 }).summary.total,
      gateway: getGatewayAuthStatus(store),
    });
    return;
  }

  if (command === "run") {
    if (subcommand === "detail") {
      handleRunDetail(rest);
      return;
    }
    if (subcommand === "detail-contract") {
      printJson(getRunDetailContract());
      return;
    }
    if (subcommand === "resume") {
      await handleRunResume(rest);
      return;
    }
    await handleRun(subcommand, rest);
    return;
  }

  if (command === "inbox") {
    handleInbox(subcommand, rest);
    return;
  }

  if (command === "memory") {
    handleMemory(subcommand, rest);
    return;
  }

  if (command === "trace") {
    handleTrace(subcommand, rest);
    return;
  }

  if (command === "tool") {
    await handleTool(subcommand, rest);
    return;
  }

  if (command === "policy") {
    handlePolicy(subcommand, rest);
    return;
  }

  if (command === "approval") {
    handleApproval(subcommand, rest);
    return;
  }

  if (command === "task" || command === "tasks") {
    handleExecutionTask(subcommand, rest);
    return;
  }

  if (command === "autopilot" || command === "autopilots") {
    await handleAutopilot(subcommand, rest);
    return;
  }

  if (command === "artifact" || command === "artifacts") {
    handleArtifact(subcommand, rest);
    return;
  }

  if (command === "report" || command === "reports") {
    handleReport(subcommand, rest);
    return;
  }

  if (command === "context") {
    handleContext(subcommand, rest);
    return;
  }

  if (command === "skill") {
    handleSkill(subcommand, rest);
    return;
  }

  if (command === "workflow") {
    await handleWorkflow(subcommand, rest);
    return;
  }

  if (command === "eval" || command === "evaluation") {
    handleEvaluation(subcommand, rest);
    return;
  }

  if (command === "outcome" || command === "outcomes") {
    handleOutcome(subcommand, rest);
    return;
  }

  if (command === "gateway") {
    await handleGateway(subcommand, rest);
    return;
  }

  if (command === "deploy" || command === "deployment") {
    handleDeployment(subcommand, rest);
    return;
  }

  if (command === "release" || command === "releases") {
    handleRelease(subcommand, rest);
    return;
  }

  if (command === "llm") {
    handleLlm(subcommand, rest);
    return;
  }

  if (command === "planner") {
    handlePlanner(subcommand);
    return;
  }

  if (command === "candidate") {
    await handleCandidate(subcommand, rest);
    return;
  }

  if (command === "agent" || command === "agents") {
    await handleAgent(subcommand, rest);
    return;
  }

  if (command === "fleet" || command === "fleets") {
    await handleFleet(subcommand, rest);
    return;
  }

  throw new Error(`unknown command: ${command}`);
}

function handleInbox(action, args = []) {
  if (!action || action === "list") {
    const flags = parseFlags([action, ...args].filter(Boolean));
    printJson(getRunInbox(store, {
      limit: flags.limit,
    }));
    return;
  }

  if (action === "contract") {
    printJson(getRunInboxContract());
    return;
  }

  throw new Error("usage: spruce inbox [list|contract] [--limit 20]");
}

async function handleRun(firstArg, args) {
  const allArgs = [firstArg, ...args].filter((item) => item !== undefined);
  const flags = parseFlags(allArgs);
  const goal = flags._.join(" ").trim();
  const result = await runAgent(store, {
    goal,
    contextQuery: flags.context,
    trustMode: flags.trustMode ?? "approve",
    dryRun: Boolean(flags.dryRun),
    contextLimit: flags.contextLimit ?? flags.limit,
    skillId: flags.skill,
    executeSkill: Boolean(flags.executeSkill),
    llmProvider: flags.llm,
    llmModel: flags.llmModel,
    llmBaseUrl: flags.llmBaseUrl,
    llmTimeoutMs: flags.llmTimeoutMs,
    llmTemperature: flags.llmTemperature,
    llmMaxTokens: flags.llmMaxTokens,
    promotePlan: Boolean(flags.promotePlan),
    plannerAllowedTools: flags.plannerAllowedTools ? splitCsv(flags.plannerAllowedTools) : undefined,
    requestCandidateApprovals: Boolean(flags.requestCandidateApprovals),
    executeCandidatePlan: Boolean(flags.executeCandidatePlan),
    requireFreshContext: Boolean(flags.requireFreshContext),
    refreshContext: Boolean(flags.refreshContext),
    contextMaxBytes: flags.contextMaxBytes ?? flags.maxBytes,
    actor: flags.actor ?? "local-user",
    channel: "cli",
  });
  printJson(result);
}

async function handleRunResume(args) {
  const [traceId, ...flagArgs] = args;
  if (!traceId) throw new Error("usage: spruce run resume <traceId> [--stepId <stepId>] [--approvalId <approvalId>]");
  const flags = parseFlags(flagArgs);
  printJson(await resumeAgentRun(store, {
    traceId,
    stepId: flags.stepId,
    approvalId: flags.approvalId,
    trustMode: flags.trustMode ?? "approve",
    actor: flags.actor ?? "local-user",
  }));
}

function handleRunDetail(args) {
  const [traceId] = args;
  if (!traceId) throw new Error("usage: spruce run detail <traceId>");
  printJson(getRunDetail(store, traceId));
}

function handleMemory(action, args) {
  if (action === "add") {
    const flags = parseFlags(args);
    const content = flags._.join(" ").trim();
    const memory = addMemory(store, {
      content,
      scope: flags.scope ?? "project",
      kind: flags.kind ?? "note",
      tags: splitCsv(flags.tags),
      source: "cli",
    });
    printJson(memory);
    return;
  }

  if (action === "search") {
    const flags = parseFlags(args);
    const query = flags._.join(" ").trim();
    printJson(searchMemory(store, query, { limit: flags.limit ?? 10 }));
    return;
  }

  if (action === "list") {
    printJson(listMemory(store));
    return;
  }

  throw new Error("usage: spruce memory <add|search|list>");
}

function handleTrace(action, args) {
  if (action === "start") {
    const flags = parseFlags(args);
    const goal = flags._.join(" ").trim();
    const trace = startTrace(store, {
      goal,
      actor: flags.actor ?? "local-user",
      channel: flags.channel ?? "cli",
      trustMode: flags.trustMode ?? "approve",
    });
    printJson(trace);
    return;
  }

  if (action === "event") {
    const [traceId, type, ...payloadParts] = args;
    if (!traceId || !type) {
      throw new Error("usage: spruce trace event <traceId> <type> [jsonPayload]");
    }
    const payload = payloadParts.length ? parseJson(payloadParts.join(" ")) : {};
    printJson(appendTraceEvent(store, traceId, type, payload));
    return;
  }

  if (action === "list") {
    printJson(listTraces(store));
    return;
  }

  throw new Error("usage: spruce trace <start|event|list>");
}

async function handleTool(action, args) {
  if (action === "list") {
    printJson(listTools());
    return;
  }

  if (action === "run") {
    const [toolName, ...flagArgs] = args;
    if (!toolName) throw new Error("usage: spruce tool run <toolName> [--input <json>]");
    const flags = parseFlags(flagArgs);
    const result = await executeTool(store, {
      toolName,
      trustMode: flags.trustMode ?? "approve",
      approved: Boolean(flags.approved),
      allowCritical: Boolean(flags.allowCritical),
      approvalId: flags.approvalId,
      traceId: flags.traceId,
      timeoutMs: flags.timeoutMs,
      input: buildToolInput(toolName, flags),
    });
    printJson(result);
    return;
  }

  throw new Error("usage: spruce tool <list|run>");
}

function handlePolicy(action, args) {
  if (action !== "check") {
    throw new Error("usage: spruce policy check --tool <name> --input <json> [--trustMode approve]");
  }

  const flags = parseFlags(args);
  if (!flags.tool) throw new Error("--tool is required");

  const input = flags.command
    ? { command: flags.command }
    : flags.input
      ? parseJson(flags.input)
      : {};

  const decision = evaluatePolicy({
    toolName: flags.tool,
    trustMode: flags.trustMode ?? "approve",
    input,
  });
  auditPolicyDecision(store, decision);
  printJson(decision);
}

function handleApproval(action, args) {
  if (action === "queue") {
    const flags = parseFlags(args);
    printJson(getApprovalQueue(store, {
      limit: flags.limit,
      traceKind: flags.traceKind,
      status: flags.status,
    }));
    return;
  }

  if (action === "queue-contract") {
    printJson(getApprovalQueueContract());
    return;
  }

  if (action === "list") {
    const flags = parseFlags(args);
    printJson(listApprovalTickets(store, flags.status));
    return;
  }

  if (action === "get") {
    const [approvalId] = args;
    if (!approvalId) throw new Error("usage: spruce approval get <approvalId>");
    printJson(getApprovalTicket(store, approvalId));
    return;
  }

  if (action === "approve") {
    const [approvalId, ...flagArgs] = args;
    if (!approvalId) throw new Error("usage: spruce approval approve <approvalId>");
    const flags = parseFlags(flagArgs);
    printJson(approveTicket(store, approvalId, {
      resolvedBy: flags.by ?? "local-user",
      reason: flags.reason ?? "approved from CLI",
    }));
    return;
  }

  if (action === "reject") {
    const [approvalId, ...flagArgs] = args;
    if (!approvalId) throw new Error("usage: spruce approval reject <approvalId>");
    const flags = parseFlags(flagArgs);
    printJson(rejectTicket(store, approvalId, {
      resolvedBy: flags.by ?? "local-user",
      reason: flags.reason ?? "rejected from CLI",
    }));
    return;
  }

  throw new Error("usage: spruce approval <queue|queue-contract|list|get|approve|reject>");
}

function handleExecutionTask(action, args) {
  if (!action || action === "list") {
    const flags = parseFlags(args);
    printJson(listExecutionTasks(store, { status: flags.status, owner: flags.owner }));
    return;
  }

  if (action === "board") {
    printJson(getExecutionTaskBoard(store));
    return;
  }

  if (action === "contract") {
    printJson(getExecutionTaskContract());
    return;
  }

  if (action === "event-contract") {
    printJson(getExecutionTaskEventStreamContract());
    return;
  }

  if (action === "get") {
    const [taskId] = args;
    if (!taskId) throw new Error("usage: spruce task get <taskId>");
    printJson(getExecutionTask(store, taskId));
    return;
  }

  if (action === "evidence") {
    const [taskId] = args;
    if (!taskId) throw new Error("usage: spruce task evidence <taskId>");
    printJson(getExecutionTaskEvidence(store, taskId));
    return;
  }

  if (action === "closure") {
    const [taskId] = args;
    if (!taskId) throw new Error("usage: spruce task closure <taskId>");
    printJson(getExecutionTaskClosure(store, taskId));
    return;
  }

  if (action === "lineage") {
    const [taskId] = args;
    if (!taskId) throw new Error("usage: spruce task lineage <taskId>");
    printJson(getExecutionTaskLineage(store, taskId));
    return;
  }

  if (action === "events") {
    const [taskId, ...flagArgs] = args;
    if (!taskId) throw new Error("usage: spruce task events <taskId> [--limit 50]");
    const flags = parseFlags(flagArgs);
    printJson(getExecutionTaskEvents(store, taskId, { limit: flags.limit }));
    return;
  }

  if (action === "create") {
    const flags = parseFlags(args);
    printJson(createExecutionTask(store, {
      goal: flags.goal ?? flags._.join(" ").trim(),
      scope: flags.scope,
      owner: flags.owner,
      nextAction: flags.nextAction,
      evidenceRefs: splitCsv(flags.evidenceRefs),
      links: splitCsv(flags.links),
      actor: flags.by ?? "local-user",
    }));
    return;
  }

  if (action === "follow-up") {
    const [taskId, ...flagArgs] = args;
    if (!taskId) throw new Error("usage: spruce task follow-up <taskId> --goal <goal>");
    const flags = parseFlags(flagArgs);
    printJson(createExecutionTaskFollowUp(store, taskId, {
      goal: flags.goal ?? flags._.join(" ").trim(),
      scope: flags.scope,
      owner: flags.owner,
      nextAction: flags.nextAction,
      evidenceRefs: splitCsv(flags.evidenceRefs),
      links: splitCsv(flags.links),
      ifUpdatedAt: flags.ifUpdatedAt,
      actor: flags.by ?? "local-user",
    }));
    return;
  }

  if (action === "claim") {
    const [taskId, ...flagArgs] = args;
    if (!taskId) throw new Error("usage: spruce task claim <taskId> --owner <owner>");
    const flags = parseFlags(flagArgs);
    printJson(claimExecutionTask(store, taskId, {
      owner: flags.owner,
      ifUpdatedAt: flags.ifUpdatedAt,
      actor: flags.by ?? "local-user",
    }));
    return;
  }

  if (action === "resume") {
    const [taskId, ...flagArgs] = args;
    if (!taskId) throw new Error("usage: spruce task resume <taskId> --nextAction <action> --resumptionSummary <summary>");
    const flags = parseFlags(flagArgs);
    printJson(resumeExecutionTask(store, taskId, {
      nextAction: flags.nextAction,
      resumptionSummary: flags.resumptionSummary,
      ifUpdatedAt: flags.ifUpdatedAt,
      actor: flags.by ?? "local-user",
    }));
    return;
  }

  if (action === "handoff") {
    const [taskId, ...flagArgs] = args;
    if (!taskId) throw new Error("usage: spruce task handoff <taskId> --fromOwner <owner> --owner <nextOwner> --handoffSummary <summary> --nextAction <action>");
    const flags = parseFlags(flagArgs);
    printJson(handoffExecutionTask(store, taskId, {
      fromOwner: flags.fromOwner,
      owner: flags.owner,
      handoffSummary: flags.handoffSummary,
      nextAction: flags.nextAction,
      ifUpdatedAt: flags.ifUpdatedAt,
      actor: flags.by ?? "local-user",
    }));
    return;
  }

  if (action === "update") {
    const [taskId, ...flagArgs] = args;
    if (!taskId) throw new Error("usage: spruce task update <taskId> [--status <status>] [--nextAction <action>]");
    const flags = parseFlags(flagArgs);
    const input = {
      status: flags.status,
      nextAction: flags.nextAction,
      humanGate: flags.humanGate,
      blocker: flags.blocker,
      completionSummary: flags.completionSummary,
      cancellationSummary: flags.cancellationSummary,
      ifUpdatedAt: flags.ifUpdatedAt,
      note: flags.note,
      actor: flags.by ?? "local-user",
    };
    if (flags.evidenceRefs !== undefined) input.evidenceRefs = splitCsv(flags.evidenceRefs);
    if (flags.links !== undefined) input.links = splitCsv(flags.links);
    printJson(updateExecutionTask(store, taskId, input));
    return;
  }

  throw new Error("usage: spruce task <list|board|contract|event-contract|get|evidence|closure|lineage|events|create|follow-up|claim|handoff|resume|update>");
}

async function handleAutopilot(action, args) {
  if (!action || action === "list") {
    const flags = parseFlags(args);
    printJson(listAutopilots(store, { enabled: flags.enabled === undefined ? undefined : flags.enabled === "true" }));
    return;
  }
  if (action === "contract") {
    printJson(getAutopilotContract());
    return;
  }
  if (action === "due") {
    const flags = parseFlags(args);
    printJson(listDueAutopilots(store, { now: flags.now }));
    return;
  }
  if (action === "get" || action === "detail") {
    const [autopilotId] = args;
    if (!autopilotId) throw new Error("usage: spruce autopilot get <autopilotId>");
    printJson(getAutopilot(store, autopilotId));
    return;
  }
  if (action === "triggers") {
    const [autopilotId, ...flagArgs] = args;
    if (!autopilotId) throw new Error("usage: spruce autopilot triggers <autopilotId> [--limit 50]");
    const flags = parseFlags(flagArgs);
    printJson(listAutopilotTriggers(store, autopilotId, { limit: flags.limit }));
    return;
  }
  if (action === "failures") {
    const [autopilotId, ...flagArgs] = args;
    if (!autopilotId) throw new Error("usage: spruce autopilot failures <autopilotId> [--limit 50]");
    const flags = parseFlags(flagArgs);
    printJson(listAutopilotFailures(store, autopilotId, { limit: flags.limit }));
    return;
  }
  if (action === "update") {
    const [autopilotId, ...flagArgs] = args;
    if (!autopilotId) throw new Error("usage: spruce autopilot update <autopilotId> --ifUpdatedAt <ISO> [--goal <text>] [--intervalMinutes <n>] [--nextDueAt <ISO>]");
    const flags = parseFlags(flagArgs);
    printJson(updateAutopilot(store, autopilotId, {
      name: flags.name, goal: flags.goal, scope: flags.scope, nextAction: flags.nextAction,
      intervalMinutes: flags.intervalMinutes ?? flags.interval, nextDueAt: flags.nextDueAt,
      evidenceRefs: flags.evidenceRefs === undefined ? undefined : splitCsv(flags.evidenceRefs),
      links: flags.links === undefined ? undefined : splitCsv(flags.links),
      ifUpdatedAt: flags.ifUpdatedAt, actor: flags.by ?? "local-user",
    }));
    return;
  }
  if (action === "create") {
    const flags = parseFlags(args);
    printJson(createAutopilot(store, {
      name: flags.name,
      goal: flags.goal ?? flags._.join(" ").trim(),
      intervalMinutes: flags.intervalMinutes ?? flags.interval,
      firstDueAt: flags.firstDueAt,
      scope: flags.scope,
      nextAction: flags.nextAction,
      evidenceRefs: splitCsv(flags.evidenceRefs),
      links: splitCsv(flags.links),
      actor: flags.by ?? "local-user",
    }));
    return;
  }
  if (action === "trigger") {
    const [autopilotId, ...flagArgs] = args;
    if (!autopilotId) throw new Error("usage: spruce autopilot trigger <autopilotId> [--now <ISO>] [--triggerKey <key>]");
    const flags = parseFlags(flagArgs);
    printJson(triggerAutopilot(store, autopilotId, { now: flags.now, triggerKey: flags.triggerKey, actor: flags.by ?? "local-user" }));
    return;
  }
  if (action === "run-due") {
    const flags = parseFlags(args);
    printJson(runDueAutopilots(store, { now: flags.now, limit: flags.limit, actor: flags.by ?? "local-user" }));
    return;
  }
  if (action === "runner") {
    const flags = parseFlags(args);
    const runner = createAutopilotRunner(store, {
      intervalMs: flags.intervalMs ?? flags.interval,
      actor: flags.by ?? "autopilot-runner",
    });
    const initial = await runner.tick({ limit: flags.limit });
    runner.start();
    printJson({ message: "Autopilot runner started. Press Ctrl+C to stop.", initial, health: runner.snapshot() });
    await new Promise((resolve) => {
      process.once("SIGINT", resolve);
      process.once("SIGTERM", resolve);
    });
    printJson({ message: "Autopilot runner stopped.", health: runner.stop() });
    return;
  }
  if (action === "enable" || action === "disable") {
    const [autopilotId, ...flagArgs] = args;
    if (!autopilotId) throw new Error(`usage: spruce autopilot ${action} <autopilotId> [--ifUpdatedAt <ISO>]`);
    const flags = parseFlags(flagArgs);
    printJson(setAutopilotEnabled(store, autopilotId, { enabled: action === "enable", ifUpdatedAt: flags.ifUpdatedAt, actor: flags.by ?? "local-user" }));
    return;
  }
  throw new Error("usage: spruce autopilot <list|contract|due|get|detail|triggers|failures|create|update|trigger|run-due|runner|enable|disable>");
}

function handleArtifact(action, args) {
  if (!action || action === "list") {
    const flags = parseFlags(args);
    printJson(listArtifacts(store, {
      limit: flags.limit,
      traceId: flags.traceId,
      kind: flags.kind,
      sourceKind: flags.sourceKind,
      status: flags.status,
    }));
    return;
  }

  if (action === "get") {
    const [artifactId] = args;
    if (!artifactId) throw new Error("usage: spruce artifact get <artifactId>");
    printJson(getArtifact(store, artifactId));
    return;
  }

  if (action === "contract") {
    printJson(getArtifactContract());
    return;
  }

  throw new Error("usage: spruce artifact <list|get|contract>");
}

function handleReport(action, args) {
  if (action === "contract") {
    printJson(getTraceReportContract());
    return;
  }

  if (action === "trace") {
    const [traceId, ...flagArgs] = args;
    if (!traceId) throw new Error("usage: spruce report trace <traceId> [--format json|markdown] [--includeRaw] [--out report.md]");
    const flags = parseFlags(flagArgs);
    const format = flags.format ?? inferReportFormat(flags.out);
    const report = getTraceReport(store, traceId, {
      format,
      includeRaw: Boolean(flags.includeRaw),
    });
    writeOrPrintReport(report, {
      format,
      out: flags.out,
    });
    return;
  }

  throw new Error("usage: spruce report <trace|contract>");
}

function handleContext(action, args) {
  if (action === "index") {
    const flags = parseFlags(args);
    const index = buildWorkspaceIndex(store, {
      maxBytes: flags.maxBytes,
    });
    printJson({
      indexedAt: index.indexedAt,
      documentCount: index.documentCount,
      skippedCount: index.skippedCount,
      redactedDocumentCount: index.redactedDocumentCount,
      maxBytes: index.maxBytes,
      incremental: index.incremental,
      safety: index.safety,
    });
    return;
  }

  if (action === "search") {
    const flags = parseFlags(args);
    const query = flags._.join(" ").trim();
    printJson(searchWorkspaceContext(store, query, {
      limit: flags.limit,
      snippetLength: flags.snippetLength,
    }));
    return;
  }

  if (action === "freshness") {
    const flags = parseFlags(args);
    printJson(assessWorkspaceIndexFreshness(store, {
      maxChanges: flags.maxChanges,
    }));
    return;
  }

  if (action === "preflight") {
    const flags = parseFlags(args);
    printJson(runPreflight(store, {
      kind: "context.preflight",
      requireFreshContext: Boolean(flags.requireFreshContext),
      refreshContext: Boolean(flags.refreshContext),
      contextMaxBytes: flags.contextMaxBytes ?? flags.maxBytes,
      maxChanges: flags.maxChanges,
    }));
    return;
  }

  if (action === "pack") {
    const flags = parseFlags(args);
    const query = flags._.join(" ").trim();
    printJson(createContextPack(store, query, {
      limit: flags.limit,
      snippetLength: flags.snippetLength,
    }));
    return;
  }

  if (action === "evidence-contract") {
    printJson(getContextEvidenceContract());
    return;
  }

  if (action === "evidence") {
    const flags = parseFlags(args);
    const query = flags._.join(" ").trim();
    printJson(createContextEvidencePack(store, {
      query,
      limit: flags.limit,
      memoryLimit: flags.memoryLimit,
      includeMemory: flags.includeMemory !== false,
      maxChanges: flags.maxChanges,
    }));
    return;
  }

  if (action === "show") {
    const [relativePath] = args;
    if (!relativePath) throw new Error("usage: spruce context show <path>");
    printJson(getIndexedDocument(store, relativePath));
    return;
  }

  throw new Error("usage: spruce context <index|freshness|preflight|search|pack|evidence|evidence-contract|show>");
}

function handleSkill(action, args) {
  if (action === "evaluation-contract") {
    printJson(getSkillEvaluationContract());
    return;
  }

  if (action === "promotion-contract") {
    printJson(getSkillPromotionContract());
    return;
  }

  if (action === "replay-contract") {
    printJson(getSkillReplayContract());
    return;
  }

  if (action === "package-contract") {
    printJson(getSkillPackageContract());
    return;
  }

  if (action === "list") {
    const flags = parseFlags(args);
    printJson(listSkills(store, flags.status ?? "approved"));
    return;
  }

  if (action === "propose") {
    const flags = parseFlags(args);
    const steps = flags.steps ? splitCsv(flags.steps) : [];
    const skill = proposeSkill(store, {
      name: flags.name,
      summary: flags.summary,
      steps,
      sourceTraceIds: splitCsv(flags.traceIds),
    });
    printJson(skill);
    return;
  }

  if (action === "extract") {
    const [traceId, ...flagArgs] = args;
    if (!traceId) throw new Error("usage: spruce skill extract <traceId>");
    const flags = parseFlags(flagArgs);
    printJson(extractSkillFromTrace(store, traceId, {
      name: flags.name,
      summary: flags.summary,
      minSteps: flags.minSteps,
    }));
    return;
  }

  if (action === "approve") {
    const [skillId, ...flagArgs] = args;
    if (!skillId) throw new Error("usage: spruce skill approve <skillId>");
    const flags = parseFlags(flagArgs);
    printJson(approveSkill(store, skillId, {
      approvedBy: flags.by ?? "local-user",
      reason: flags.reason ?? "approved from CLI",
    }));
    return;
  }

  if (action === "evaluate") {
    const [skillId, ...flagArgs] = args;
    if (!skillId) throw new Error("usage: spruce skill evaluate <skillId> [--status candidates|approved] [--traceId <traceId>]");
    const flags = parseFlags(flagArgs);
    printJson(evaluateSkillCandidate(store, skillId, {
      status: flags.status,
      traceId: flags.traceId,
      trustMode: flags.trustMode,
    }));
    return;
  }

  if (action === "promote") {
    const [skillId, ...flagArgs] = args;
    if (!skillId) throw new Error("usage: spruce skill promote <skillId> [--evaluationId <evaluationId>] [--minimumScore 85]");
    const flags = parseFlags(flagArgs);
    printJson(promoteSkillCandidate(store, skillId, {
      evaluationId: flags.evaluationId,
      minimumScore: flags.minimumScore,
      useLatestEvaluation: Boolean(flags.useLatestEvaluation),
      trustMode: flags.trustMode,
      by: flags.by,
      reason: flags.reason,
    }));
    return;
  }

  if (action === "evaluations") {
    printJson(listSkillEvaluations(store));
    return;
  }

  if (action === "evaluation") {
    const [evaluationId] = args;
    if (!evaluationId) throw new Error("usage: spruce skill evaluation <evaluationId>");
    printJson(getSkillEvaluation(store, evaluationId));
    return;
  }

  if (action === "versions") {
    const [skillId] = args;
    if (!skillId) throw new Error("usage: spruce skill versions <skillId>");
    printJson(listSkillVersions(store, skillId));
    return;
  }

  if (action === "version") {
    const [skillId, revision] = args;
    if (!skillId || !revision) throw new Error("usage: spruce skill version <skillId> <revision>");
    printJson(getSkillVersion(store, skillId, revision));
    return;
  }

  if (action === "restore") {
    const [skillId, revision, ...flagArgs] = args;
    if (!skillId || !revision) throw new Error("usage: spruce skill restore <skillId> <revision>");
    const flags = parseFlags(flagArgs);
    printJson(restoreSkillVersion(store, skillId, revision, {
      by: flags.by,
      reason: flags.reason,
    }));
    return;
  }

  if (action === "fixture-create") {
    const [skillId, ...flagArgs] = args;
    if (!skillId) throw new Error("usage: spruce skill fixture-create <skillId> [--evaluationId <evaluationId>]");
    const flags = parseFlags(flagArgs);
    printJson(createSkillReplayFixture(store, skillId, {
      status: flags.status,
      evaluationId: flags.evaluationId,
      name: flags.name,
      description: flags.description,
      minimumScore: flags.minimumScore,
    }));
    return;
  }

  if (action === "fixture-list") {
    printJson(listSkillReplayFixtures(store));
    return;
  }

  if (action === "fixture") {
    const [fixtureId] = args;
    if (!fixtureId) throw new Error("usage: spruce skill fixture <fixtureId>");
    printJson(getSkillReplayFixture(store, fixtureId));
    return;
  }

  if (action === "replay") {
    const [fixtureId, ...flagArgs] = args;
    if (!fixtureId) throw new Error("usage: spruce skill replay <fixtureId>");
    const flags = parseFlags(flagArgs);
    printJson(replaySkillFixture(store, fixtureId, {
      status: flags.status,
    }));
    return;
  }

  if (action === "replay-results") {
    printJson(listSkillReplayResults(store));
    return;
  }

  if (action === "replay-result") {
    const [resultId] = args;
    if (!resultId) throw new Error("usage: spruce skill replay-result <resultId>");
    printJson(getSkillReplayResult(store, resultId));
    return;
  }

  if (action === "package-export") {
    const [skillId, ...flagArgs] = args;
    if (!skillId) throw new Error("usage: spruce skill package-export <skillId> [--file <path>]");
    const flags = parseFlags(flagArgs);
    printJson(exportSkillPackage(store, skillId, {
      status: flags.status,
      file: flags.file,
      by: flags.by,
    }));
    return;
  }

  if (action === "packages") {
    printJson(listSkillPackages(store));
    return;
  }

  if (action === "package") {
    const [packageId] = args;
    if (!packageId) throw new Error("usage: spruce skill package <packageId>");
    printJson(getSkillPackage(store, packageId));
    return;
  }

  if (action === "package-import") {
    const [packageRef, ...flagArgs] = args;
    if (!packageRef) throw new Error("usage: spruce skill package-import <packageId|file>");
    const flags = parseFlags(flagArgs);
    const packageInput = fs.existsSync(packageRef)
      ? readSkillPackageFile(path.resolve(packageRef))
      : getSkillPackage(store, packageRef);
    printJson(importSkillPackage(store, packageInput, {
      name: flags.name,
      summary: flags.summary,
      preserveSourceTraceIds: Boolean(flags.preserveSourceTraceIds),
      includeSourceMetadata: flags.includeSourceMetadata === undefined ? true : flags.includeSourceMetadata !== "false",
      by: flags.by,
    }));
    return;
  }

  if (action === "package-imports") {
    printJson(listSkillPackageImports(store));
    return;
  }

  if (action === "package-import-record") {
    const [importId] = args;
    if (!importId) throw new Error("usage: spruce skill package-import-record <importId>");
    printJson(getSkillPackageImport(store, importId));
    return;
  }

  throw new Error("usage: spruce skill <list|propose|extract|approve|evaluate|promote|restore|evaluations|evaluation|versions|version|fixture-create|fixture-list|fixture|replay|replay-results|replay-result|package-export|packages|package|package-import|package-imports|package-import-record|evaluation-contract|promotion-contract|replay-contract|package-contract>");
}

async function handleWorkflow(action, args) {
  if (action === "inbox") {
    const flags = parseFlags(args);
    printJson(getWorkflowInbox(store, {
      limit: flags.limit,
    }));
    return;
  }

  if (action === "inbox-contract") {
    printJson(getWorkflowInboxContract());
    return;
  }

  if (action === "detail-contract") {
    printJson(getWorkflowDetailContract());
    return;
  }

  if (action === "continuation-contract") {
    printJson(getWorkflowContinuationContract());
    return;
  }

  if (action === "builder-contract") {
    printJson(getWorkflowBuilderContract());
    return;
  }

  if (action === "detail") {
    const [traceId] = args;
    if (!traceId) throw new Error("usage: spruce workflow detail <traceId>");
    printJson(getWorkflowRunDetail(store, traceId));
    return;
  }

  if (action === "resume") {
    const [traceId, ...flagArgs] = args;
    if (!traceId) throw new Error("usage: spruce workflow resume <traceId> [--stepId <stepId>] [--approvalId <approvalId>]");
    const flags = parseFlags(flagArgs);
    printJson(await resumeWorkflowRun(store, {
      traceId,
      stepId: flags.stepId,
      approvalId: flags.approvalId,
      trustMode: flags.trustMode ?? "approve",
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (action === "create") {
    const flags = parseFlags(args);
    const input = flags.input ? parseJson(flags.input) : buildWorkflowInput(flags);
    printJson(createWorkflow(store, input));
    return;
  }

  if (action === "draft") {
    const flags = parseFlags(args);
    const goal = flags.goal ?? flags._.join(" ").trim();
    printJson(await draftWorkflow(store, {
      goal,
      contextQuery: flags.context,
      contextLimit: flags.limit,
      skillId: flags.skill,
      name: flags.name,
      summary: flags.summary,
      includeMemoryStep: flags.includeMemoryStep === undefined ? undefined : Boolean(flags.includeMemoryStep),
      llmProvider: flags.llm ?? "mock",
      llmModel: flags.model,
      llmBaseUrl: flags.baseUrl,
      llmTimeoutMs: flags.timeoutMs,
      llmTemperature: flags.temperature,
      llmMaxTokens: flags.maxTokens,
    }));
    return;
  }

  if (action === "save-draft") {
    const flags = parseFlags(args);
    const draft = flags.file ? parseJson(readTextFile(flags.file)) : flags.input ? parseJson(flags.input) : undefined;
    printJson(await createWorkflowFromDraft(store, {
      draft,
      goal: flags.goal ?? flags._.join(" ").trim(),
      contextQuery: flags.context,
      contextLimit: flags.limit,
      skillId: flags.skill,
      name: flags.name,
      summary: flags.summary,
      llmProvider: flags.llm ?? "mock",
      llmModel: flags.model,
      llmBaseUrl: flags.baseUrl,
      llmTimeoutMs: flags.timeoutMs,
      llmTemperature: flags.temperature,
      llmMaxTokens: flags.maxTokens,
    }));
    return;
  }

  if (action === "update") {
    const [workflowId, ...flagArgs] = args;
    if (!workflowId) throw new Error("usage: spruce workflow update <workflowId> [--name <name>] [--summary <summary>] [--steps <json>] [--file <path>] [--reason <reason>] [--by <actor>]");
    const flags = parseFlags(flagArgs);
    printJson(updateWorkflow(store, workflowId, {
      name: flags.name,
      summary: flags.summary,
      steps: readWorkflowStepsFromFlags(flags),
      status: flags.status,
      updatedBy: flags.by ?? "local-user",
      reason: flags.reason,
    }));
    return;
  }

  if (action === "archive") {
    const [workflowId, ...flagArgs] = args;
    if (!workflowId) throw new Error("usage: spruce workflow archive <workflowId> [--reason <reason>] [--by <actor>]");
    const flags = parseFlags(flagArgs);
    printJson(archiveWorkflow(store, workflowId, {
      archivedBy: flags.by ?? "local-user",
      reason: flags.reason,
    }));
    return;
  }

  if (action === "list") {
    const flags = parseFlags(args);
    printJson(listWorkflows(store, { status: flags.status ?? "active" }));
    return;
  }

  if (action === "get") {
    const [workflowId] = args;
    if (!workflowId) throw new Error("usage: spruce workflow get <workflowId>");
    printJson(getWorkflow(store, workflowId));
    return;
  }

  if (action === "versions") {
    const [workflowId] = args;
    if (!workflowId) throw new Error("usage: spruce workflow versions <workflowId>");
    printJson(listWorkflowVersions(store, workflowId));
    return;
  }

  if (action === "version") {
    const [workflowId, revision] = args;
    if (!workflowId || !revision) throw new Error("usage: spruce workflow version <workflowId> <revision>");
    printJson(getWorkflowVersion(store, workflowId, revision));
    return;
  }

  if (action === "restore") {
    const [workflowId, revision, ...flagArgs] = args;
    if (!workflowId || !revision) throw new Error("usage: spruce workflow restore <workflowId> <revision> [--reason <reason>] [--by <actor>]");
    const flags = parseFlags(flagArgs);
    printJson(restoreWorkflowVersion(store, workflowId, revision, {
      restoredBy: flags.by ?? "local-user",
      reason: flags.reason,
    }));
    return;
  }

  if (action === "run") {
    const [workflowId, ...flagArgs] = args;
    if (!workflowId) throw new Error("usage: spruce workflow run <workflowId>");
    const flags = parseFlags(flagArgs);
    printJson(await runWorkflow(store, workflowId, {
      goal: flags.goal,
      trustMode: flags.trustMode ?? "approve",
      dryRun: Boolean(flags.dryRun),
      requireFreshContext: Boolean(flags.requireFreshContext),
      refreshContext: Boolean(flags.refreshContext),
      contextMaxBytes: flags.contextMaxBytes ?? flags.maxBytes,
      actor: flags.actor ?? "local-user",
      channel: "cli",
    }));
    return;
  }

  throw new Error("usage: spruce workflow <create|draft|save-draft|update|archive|list|get|versions|version|restore|run|resume|inbox|detail|inbox-contract|detail-contract|continuation-contract|builder-contract>");
}

function handleEvaluation(action, args) {
  if (action === "trace") {
    const [traceId] = args;
    if (!traceId) throw new Error("usage: spruce eval trace <traceId>");
    printJson(evaluateTrace(store, traceId));
    return;
  }

  if (action === "list") {
    printJson(listEvaluations(store));
    return;
  }

  if (action === "get") {
    const [evaluationId] = args;
    if (!evaluationId) throw new Error("usage: spruce eval get <evaluationId>");
    printJson(getEvaluation(store, evaluationId));
    return;
  }

  throw new Error("usage: spruce eval <trace|list|get>");
}

function handleOutcome(action, args = []) {
  if (action === "contract") {
    printJson(getOutcomeEvaluationContract());
    return;
  }

  if (action === "fixture-create") {
    const flags = parseFlags(args);
    if (!flags.name || !flags.validators) {
      throw new Error("usage: spruce outcome fixture-create --name <name> --validators <json> [--description <text>] [--safety <json>]");
    }
    printJson(createOutcomeFixture(store, {
      name: flags.name,
      description: flags.description,
      validators: parseJson(flags.validators),
      safety: flags.safety ? parseJson(flags.safety) : undefined,
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (!action || action === "fixtures") {
    printJson(listOutcomeFixtures(store));
    return;
  }

  if (action === "fixture") {
    const [fixtureId] = args;
    if (!fixtureId) throw new Error("usage: spruce outcome fixture <fixtureId>");
    printJson(getOutcomeFixture(store, fixtureId));
    return;
  }

  if (action === "evaluate") {
    const [fixtureId, ...flagArgs] = args;
    if (!fixtureId) throw new Error("usage: spruce outcome evaluate <fixtureId> --trace <traceId> [--fleet <fleetRunId>]");
    const flags = parseFlags(flagArgs);
    printJson(evaluateOutcomeFixture(store, fixtureId, {
      traceId: flags.trace,
      fleetRunId: flags.fleet,
    }));
    return;
  }

  if (action === "results") {
    const flags = parseFlags(args);
    printJson(listOutcomeEvaluationResults(store, {
      fixtureId: flags.fixture,
      status: flags.status,
    }));
    return;
  }

  if (action === "result") {
    const [resultId] = args;
    if (!resultId) throw new Error("usage: spruce outcome result <resultId>");
    printJson(getOutcomeEvaluationResult(store, resultId));
    return;
  }

  if (action === "summary") {
    const [fixtureId] = args;
    if (!fixtureId) throw new Error("usage: spruce outcome summary <fixtureId>");
    printJson(summarizeOutcomeFixture(store, fixtureId));
    return;
  }

  throw new Error("usage: spruce outcome <contract|fixture-create|fixtures|fixture|evaluate|results|result|summary>");
}

async function handleGateway(action, args) {
  if (action === "token") {
    const flags = parseFlags(args);
    const token = ensureGatewayToken(store, {
      rotate: Boolean(flags.rotate),
    });
    printJson({
      created: token.created,
      token: token.token,
      tokenPrefix: token.tokenPrefix,
      message: token.token
        ? "Store this token now. It is shown only when created or rotated."
        : "Gateway token already exists. Use --rotate to create a new one.",
    });
    return;
  }

  if (action === "info") {
    printJson(getGatewayAuthStatus(store));
    return;
  }

  if (action === "contract") {
    printJson(getGatewayRouteContract());
    return;
  }

  if (action === "runtime") {
    printJson(getGatewayRuntimeState(store));
    return;
  }

  if (action === "runtime-contract") {
    printJson(getGatewayRuntimeContract());
    return;
  }

  if (action === "call") {
    const flags = parseFlags(args);
    if (!flags.path) {
      throw new Error("usage: spruce gateway call --path /v1/status [--method GET] [--body <json>] [--token <token>] [--url <baseUrl>]");
    }
    const client = createGatewayClient({
      baseUrl: flags.url ?? "http://127.0.0.1:7357",
      token: flags.token ?? process.env.SPRUCE_GATEWAY_TOKEN,
    });
    const method = flags.method ?? (flags.body ? "POST" : "GET");
    const body = flags.body ? parseJson(flags.body) : undefined;
    printJson(await clientRequest(client, method, flags.path, body));
    return;
  }

  if (action === "serve") {
    const flags = parseFlags(args);
    const host = flags.host ?? "127.0.0.1";
    const port = flags.port ?? 7357;
    const result = await startGatewayServer(store, {
      host,
      port,
      autopilotPollMs: flags.autopilotPollMs,
    });
    const baseUrl = `http://${result.host}:${result.port}`;
    console.log(JSON.stringify({
      ok: true,
      url: baseUrl,
      health: `${baseUrl}/health`,
      workbench: `${baseUrl}/workbench`,
      tokenCreated: result.tokenCreated,
      token: result.token,
      tokenPrefix: result.tokenPrefix,
      authHeader: result.token ? `Authorization: Bearer ${result.token}` : "Authorization: Bearer <gateway-token>",
      localOnly: true,
      autopilotRunner: result.autopilotRunner,
    }, null, 2));
    return await new Promise(() => {});
  }

  throw new Error("usage: spruce gateway <token|info|contract|runtime|runtime-contract|call|serve>");
}

function handleDeployment(action, args = []) {
  if (action === "preflight") {
    const flags = parseFlags(args);
    const report = runDeploymentPreflight(store, {
      host: flags.host,
      port: flags.port,
      autopilotPollMs: flags.autopilotPollMs,
      requireToken: Boolean(flags.requireToken),
      allowRemote: Boolean(flags.allowRemote),
    });
    printJson(report);
    if (report.status === "failed") process.exitCode = 1;
    return;
  }

  if (action === "contract") {
    printJson(getDeploymentPreflightContract());
    return;
  }

  throw new Error("usage: spruce deploy <preflight|contract>");
}

function handleRelease(action, args = []) {
  if (action === "manifest") {
    const flags = parseFlags(args);
    printJson(createReleaseArtifactManifest(store, {
      releaseVerificationId: flags.verificationId,
      sourceRevision: flags.sourceRevision,
      dirtyState: flags.dirtyState,
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (action === "manifests" || action === "artifact-list") {
    const flags = parseFlags(args);
    printJson(listReleaseArtifactManifests(store, { limit: flags.limit }));
    return;
  }

  if (action === "manifest-get" || action === "artifact") {
    const [manifestId] = args;
    if (!manifestId) throw new Error("usage: spruce release manifest-get <manifestId>");
    printJson(getReleaseArtifactManifest(store, manifestId));
    return;
  }

  if (action === "artifact-contract" || action === "manifest-contract") {
    printJson(getReleaseArtifactManifestContract());
    return;
  }

  if (!action || action === "list") {
    const flags = parseFlags([action, ...args].filter(Boolean));
    printJson(listReleaseVerifications(store, { limit: flags.limit }));
    return;
  }

  if (action === "get") {
    const [verificationId] = args;
    if (!verificationId) throw new Error("usage: spruce release get <verificationId>");
    printJson(getReleaseVerification(store, verificationId));
    return;
  }

  if (action === "contract") {
    printJson(getReleaseVerificationContract());
    return;
  }

  throw new Error("usage: spruce release <list|get|contract|manifest|manifests|manifest-get|manifest-contract> [id]");
}

function handleLlm(action, args = []) {
  if (action === "contract") {
    printJson(getLlmAdapterContract());
    return;
  }
  if (action === "provider-contract") {
    printJson(getLlmProviderRegistryContract());
    return;
  }
  if (action === "providers" || action === "list") {
    printJson(listLlmProviderConfigs(store));
    return;
  }
  if (action === "configure") {
    const [providerId, ...flagArgs] = args;
    if (!providerId) throw new Error("usage: spruce llm configure <providerId> --kind <kind> --model <model> [--baseUrl <url>] [--apiKeyEnv <name>] [--default]");
    const flags = parseFlags(flagArgs);
    printJson(configureLlmProvider(store, {
      id: providerId,
      kind: flags.kind,
      model: flags.model,
      baseUrl: flags.baseUrl,
      path: flags.path,
      apiKeyEnv: flags.apiKeyEnv,
      timeoutMs: flags.timeoutMs,
      maxTokens: flags.maxTokens,
      temperature: flags.temperature,
      jsonMode: flags.noJsonMode ? false : undefined,
      enabled: flags.disabled ? false : undefined,
      thinking: flags.thinking,
      reasoningEffort: flags.reasoningEffort,
      default: Boolean(flags.default),
      actor: flags.actor ?? "local-user",
    }));
    return;
  }
  if (action === "detail") {
    const [providerId] = args;
    if (!providerId) throw new Error("usage: spruce llm detail <providerId>");
    printJson(getLlmProviderConfig(store, providerId));
    return;
  }
  if (action === "validate") {
    const [providerId] = args;
    if (!providerId) throw new Error("usage: spruce llm validate <providerId>");
    printJson(validateLlmProviderConfig(store, providerId));
    return;
  }
  if (action === "remove") {
    const [providerId, ...flagArgs] = args;
    if (!providerId) throw new Error("usage: spruce llm remove <providerId>");
    const flags = parseFlags(flagArgs);
    printJson(removeLlmProviderConfig(store, providerId, { actor: flags.actor ?? "local-user" }));
    return;
  }

  throw new Error("usage: spruce llm <contract|provider-contract|providers|configure|detail|validate|remove>");
}

function handlePlanner(action) {
  if (action === "contract") {
    printJson(getPlannerPromotionContract());
    return;
  }

  throw new Error("usage: spruce planner contract");
}

async function handleCandidate(action, args = []) {
  if (action === "contract") {
    printJson(getCandidateExecutionContract());
    return;
  }

  if (action === "approval-contract") {
    printJson(getCandidateApprovalContract());
    return;
  }

  if (action === "continuation-contract") {
    printJson(getRunContinuationContract());
    return;
  }

  if (action === "request-approvals") {
    const flags = parseFlags(args);
    const candidatePlan = readCandidatePlanFromFlags(flags);
    printJson(requestCandidateApprovals(store, {
      candidatePlan,
      traceId: flags.traceId,
      trustMode: flags.trustMode ?? "approve",
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (action === "execute-approved") {
    const flags = parseFlags(args);
    const candidatePlan = readCandidatePlanFromFlags(flags);
    printJson(await executeApprovedCandidateStep(store, {
      candidatePlan,
      stepId: flags.stepId,
      approvalId: flags.approvalId,
      traceId: flags.traceId,
      trustMode: flags.trustMode ?? "approve",
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  throw new Error("usage: spruce candidate <contract|approval-contract|continuation-contract|request-approvals|execute-approved>");
}

async function handleFleet(action, args = []) {
  if (!action || action === "list") {
    const flags = parseFlags(args);
    printJson(listFleetRuns(store, {
      status: flags.status,
      routeId: flags.routeId,
    }));
    return;
  }

  if (action === "create") {
    const [routeId, ...flagArgs] = args;
    if (!routeId) throw new Error("usage: spruce fleet create <routeId> [--role coding] [--candidates 2] [--parallel 2] [--context <query>] [--executionTaskId <taskId>]");
    const flags = parseFlags(flagArgs);
    printJson(createFleetRun(store, {
      routeId,
      role: flags.role,
      candidateCount: flags.candidates ?? flags.candidateCount,
      maxParallel: flags.parallel ?? flags.maxParallel,
      contextQuery: flags.context,
      executionTaskId: flags.executionTaskId,
    }));
    return;
  }

  if (action === "approvals" || action === "request-approvals") {
    const [fleetRunId, ...flagArgs] = args;
    if (!fleetRunId) throw new Error("usage: spruce fleet approvals <fleetRunId> [--timeoutMs <ms>] [--maxBuffer <bytes>]");
    const flags = parseFlags(flagArgs);
    printJson(await requestFleetRunApprovals(store, fleetRunId, {
      timeoutMs: flags.timeoutMs,
      maxBuffer: flags.maxBuffer,
    }));
    return;
  }

  if (action === "approve") {
    const [fleetRunId, ...flagArgs] = args;
    if (!fleetRunId) throw new Error("usage: spruce fleet approve <fleetRunId> --confirm approve_all_invocations --reason <reason>");
    const flags = parseFlags(flagArgs);
    printJson(approveFleetRun(store, fleetRunId, {
      confirmation: flags.confirm,
      reason: flags.reason,
    }));
    return;
  }

  if (action === "execute") {
    const [fleetRunId] = args;
    if (!fleetRunId) throw new Error("usage: spruce fleet execute <fleetRunId>");
    printJson(await executeFleetRun(store, fleetRunId));
    return;
  }

  if (action === "cancel") {
    const [fleetRunId, ...flagArgs] = args;
    if (!fleetRunId) throw new Error("usage: spruce fleet cancel <fleetRunId> --reason <reason>");
    const flags = parseFlags(flagArgs);
    printJson(cancelFleetRun(store, fleetRunId, { reason: flags.reason }));
    return;
  }

  if (action === "detail" || action === "get") {
    const [fleetRunId] = args;
    if (!fleetRunId) throw new Error("usage: spruce fleet detail <fleetRunId>");
    printJson(getFleetRun(store, fleetRunId));
    return;
  }

  if (action === "contract") {
    printJson(getFleetRunContract());
    return;
  }

  throw new Error(`unknown fleet action: ${action}`);
}

async function handleAgent(action, args = []) {
  if (!action || action === "adapters" || action === "adapter-list" || action === "list") {
    const flags = parseFlags(args);
    printJson(listAgentAdapters({
      kind: flags.kind,
      status: flags.status,
    }));
    return;
  }

  if (action === "adapter" || action === "get") {
    const [adapterId] = args;
    if (!adapterId) throw new Error("usage: spruce agent adapter <adapterId>");
    printJson(getAgentAdapter(adapterId));
    return;
  }

  if (action === "plan") {
    const [adapterId, ...flagArgs] = args;
    if (!adapterId) throw new Error("usage: spruce agent plan <adapterId> --goal <goal> [--context <query>]");
    const flags = parseFlags(flagArgs);
    printJson(createAgentAdapterRunPlan(store, {
      adapterId,
      goal: flags.goal ?? flags._.join(" ").trim(),
      contextQuery: flags.context,
      contextLimit: flags.limit,
      branchName: flags.branch,
      baseBranch: flags.baseBranch,
      isolationMode: flags.isolationMode,
    }));
    return;
  }

  if (action === "prepare") {
    const [adapterId, ...flagArgs] = args;
    if (!adapterId) throw new Error("usage: spruce agent prepare <adapterId> --goal <goal> [--context <query>]");
    const flags = parseFlags(flagArgs);
    printJson(prepareAgentWorkspace(store, {
      adapterId,
      goal: flags.goal ?? flags._.join(" ").trim(),
      contextQuery: flags.context,
      contextLimit: flags.limit,
      branchName: flags.branch,
      baseBranch: flags.baseBranch,
      baseRef: flags.baseRef,
      isolationMode: flags.isolationMode,
    }));
    return;
  }

  if (action === "workspaces" || action === "workspace-list") {
    const flags = parseFlags(args);
    printJson(listAgentWorkspaces(store, {
      status: flags.status,
      adapterId: flags.adapterId,
    }));
    return;
  }

  if (action === "workspace") {
    const [workspaceId] = args;
    if (!workspaceId) throw new Error("usage: spruce agent workspace <workspaceId>");
    printJson(getAgentWorkspace(store, workspaceId));
    return;
  }

  if (action === "retire-workspace") {
    const [workspaceId, ...flagArgs] = args;
    if (!workspaceId) throw new Error("usage: spruce agent retire-workspace <workspaceId> [--deleteBranch] [--reason <text>] [--ifUpdatedAt <timestamp>]");
    const flags = parseFlags(flagArgs);
    printJson(retireAgentWorkspace(store, workspaceId, {
      deleteBranch: Boolean(flags.deleteBranch),
      reason: flags.reason,
      ifUpdatedAt: flags.ifUpdatedAt,
    }));
    return;
  }

  if (action === "workspace-contract") {
    printJson(getAgentWorkspaceContract());
    return;
  }

  if (action === "launch") {
    const [workspaceId, ...flagArgs] = args;
    if (!workspaceId) throw new Error("usage: spruce agent launch <workspaceId> [--execute] [--command <command>] [--approvalId <approvalId>]");
    const flags = parseFlags(flagArgs);
    printJson(await launchAgentWorkspace(store, {
      workspaceId,
      command: flags.command,
      execute: Boolean(flags.execute),
      trustMode: flags.trustMode ?? "approve",
      approvalId: flags.approvalId,
      executionTaskId: flags.executionTaskId,
      timeoutMs: flags.timeoutMs,
      actor: flags.actor ?? "local-user",
      channel: "cli",
    }));
    return;
  }

  if (action === "launches" || action === "launch-list") {
    const flags = parseFlags(args);
    printJson(listAgentLaunches(store, {
      status: flags.status,
      workspaceId: flags.workspaceId,
      adapterId: flags.adapterId,
    }));
    return;
  }

  if (action === "launch-detail") {
    const [launchId] = args;
    if (!launchId) throw new Error("usage: spruce agent launch-detail <launchId>");
    printJson(getAgentLaunch(store, launchId));
    return;
  }

  if (action === "launcher-contract") {
    printJson(getAgentLauncherContract());
    return;
  }

  if (action === "external-launcher-contract") {
    printJson(getExternalCliLauncherContract());
    return;
  }

  if (action === "review") {
    const flags = parseFlags(args);
    const launchIds = splitCsv(flags.launchIds).length ? splitCsv(flags.launchIds) : flags._;
    if (!launchIds.length) throw new Error("usage: spruce agent review <launchId> [moreLaunchIds...] [--launchIds id1,id2]");
    printJson(createLaunchReview(store, {
      launchIds,
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (action === "reviews" || action === "review-list") {
    const flags = parseFlags(args);
    printJson(listLaunchReviews(store, {
      status: flags.status,
      launchId: flags.launchId,
    }));
    return;
  }

  if (action === "review-detail") {
    const [reviewId] = args;
    if (!reviewId) throw new Error("usage: spruce agent review-detail <reviewId>");
    printJson(getLaunchReview(store, reviewId));
    return;
  }

  if (action === "review-decide") {
    const [reviewId, ...flagArgs] = args;
    if (!reviewId) throw new Error("usage: spruce agent review-decide <reviewId> --decision <approved|rejected|needs_changes> --reason <reason> [--selectedLaunchId <launchId>]");
    const flags = parseFlags(flagArgs);
    printJson(decideLaunchReview(store, reviewId, {
      decision: flags.decision,
      selectedLaunchId: flags.selectedLaunchId,
      reason: flags.reason,
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (action === "review-contract") {
    printJson(getLaunchReviewContract());
    return;
  }

  if (action === "trial-attest") {
    const [launchId, ...flagArgs] = args;
    if (!launchId) throw new Error("usage: spruce agent trial-attest <launchId> --command <acceptanceCommand> [--approvalId <id>] [--timeoutMs <ms>] [--noWorkspaceChange]");
    const flags = parseFlags(flagArgs);
    if (!flags.command && !flags.approvalId) {
      throw new Error("--command is required when --approvalId is not supplied");
    }
    printJson(await attestAgentLaunchTrial(store, {
      launchId,
      acceptanceCommand: flags.command,
      approvalId: flags.approvalId,
      timeoutMs: flags.timeoutMs,
      maxBuffer: flags.maxBuffer,
      category: flags.category,
      failureCode: flags.failureCode,
      expectedWorkspaceChange: !Boolean(flags.noWorkspaceChange),
      trustMode: flags.trustMode,
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (action === "trial-record") {
    const [adapterId, ...flagArgs] = args;
    if (!adapterId) throw new Error("usage: spruce agent trial-record <adapterId> --processExitCode <code> --changedFileCount <count> --baselineWorkspaceClean true|false --acceptanceStatus <passed|failed|not_run> [--acceptanceExitCode <code>] --acceptanceWorkspaceStable true|false --policyStatus <allowed|blocked>");
    const flags = parseFlags(flagArgs);
    printJson(recordAgentTrial(store, {
      adapterId,
      taskId: flags.taskId,
      category: flags.category,
      source: flags.source,
      processExitCode: flags.processExitCode,
      durationMs: flags.durationMs,
      changedFileCount: flags.changedFileCount,
      acceptanceStatus: flags.acceptanceStatus,
      acceptanceExitCode: flags.acceptanceExitCode,
      policyStatus: flags.policyStatus,
      failureCode: flags.failureCode,
      expectedWorkspaceChange: !Boolean(flags.noWorkspaceChange),
      baselineWorkspaceClean: String(flags.baselineWorkspaceClean) === "true",
      acceptanceWorkspaceStable: String(flags.acceptanceWorkspaceStable) === "true",
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (action === "trials" || action === "trial-list") {
    const flags = parseFlags(args);
    printJson(listAgentTrials(store, {
      adapterId: flags.adapterId,
      status: flags.status,
      attested: flags.attested === undefined ? undefined : String(flags.attested) === "true",
    }));
    return;
  }

  if (action === "trial-detail") {
    const [trialId] = args;
    if (!trialId) throw new Error("usage: spruce agent trial-detail <trialId>");
    printJson(getAgentTrial(store, trialId));
    return;
  }

  if (action === "trial-attestation-contract") {
    printJson(getAgentTrialAttestationContract());
    return;
  }

  if (action === "trial-contract") {
    printJson(getAgentTrialContract());
    return;
  }

  if (action === "probe") {
    const flags = parseFlags(args);
    printJson(probeAgentCapabilities(store, {
      adapterIds: splitCsv(flags.adapterIds),
      versionCheck: Boolean(flags.version),
      versionTimeoutMs: flags.timeoutMs,
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (action === "readiness") {
    const [adapterId, ...flagArgs] = args;
    if (!adapterId) throw new Error("usage: spruce agent readiness <adapterId>");
    const flags = parseFlags(flagArgs);
    printJson(assessAgentExecutionReadiness(store, { adapterId, maxChanges: flags.maxChanges }));
    return;
  }

  if (action === "probes" || action === "probe-list") {
    printJson(listCapabilityProbes(store));
    return;
  }

  if (action === "probe-detail") {
    const [probeId] = args;
    if (!probeId) throw new Error("usage: spruce agent probe-detail <probeId>");
    printJson(getCapabilityProbe(store, probeId));
    return;
  }

  if (action === "probe-contract") {
    printJson(getCapabilityProbeContract());
    return;
  }

  if (action === "route") {
    const flags = parseFlags(args);
    const goal = flags.goal ?? flags._.join(" ").trim();
    if (!goal) throw new Error("usage: spruce agent route --goal <goal> [--roles coding,review] [--refreshCapabilities]");
    printJson(createTaskRoute(store, {
      goal,
      roles: splitCsv(flags.roles),
      taskType: flags.taskType,
      mode: flags.mode ?? "plan",
      requiredCapabilities: splitCsv(flags.requiredCapabilities),
      preferredAdapterIds: splitCsv(flags.preferredAdapterIds),
      preferredProviders: splitCsv(flags.preferredProviders),
      preferredLlmProviders: splitCsv(flags.preferredLlmProviders),
      maxAlternatives: flags.maxAlternatives,
      probeId: flags.probeId,
      refreshCapabilities: Boolean(flags.refreshCapabilities),
      versionCheck: Boolean(flags.version),
      maxProbeAgeMs: flags.maxProbeAgeMs,
      actor: flags.actor ?? "local-user",
    }));
    return;
  }

  if (action === "routes" || action === "route-list") {
    const flags = parseFlags(args);
    printJson(listTaskRoutes(store, { status: flags.status }));
    return;
  }

  if (action === "route-detail") {
    const [routeId] = args;
    if (!routeId) throw new Error("usage: spruce agent route-detail <routeId>");
    printJson(getTaskRoute(store, routeId));
    return;
  }

  if (action === "router-contract") {
    printJson(getTaskRouterContract());
    return;
  }

  if (action === "contract" || action === "adapter-contract") {
    printJson(getAgentAdapterContract());
    return;
  }

  throw new Error("usage: spruce agent <adapters|adapter|probe|probes|route|routes|plan|prepare|workspaces|workspace|launch|launches|review|reviews|contract>");
}

function parseFlags(args) {
  const result = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (item.startsWith("--")) {
      const key = item.slice(2);
      const next = args[index + 1];
      if (!next || next.startsWith("--")) {
        result[key] = true;
      } else {
        result[key] = next;
        index += 1;
      }
    } else {
      result._.push(item);
    }
  }
  return result;
}

function parseJson(value) {
  try {
    return JSON.parse(String(value).replace(/^\uFEFF/, ""));
  } catch {
    throw new Error(`invalid JSON: ${value}`);
  }
}

function splitCsv(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildToolInput(toolName, flags) {
  if (flags.input) return parseJson(flags.input);
  if (toolName === "shell.execute") {
    return {
      command: flags.command,
      cwd: flags.cwd,
    };
  }
  if (toolName === "file.read") {
    return {
      path: flags.path,
    };
  }
  if (toolName === "file.write") {
    return {
      path: flags.path,
      content: flags.content ?? "",
    };
  }
  if (toolName === "memory.add") {
    return {
      content: flags._.join(" ").trim() || flags.content,
      scope: flags.scope,
      kind: flags.kind,
      tags: splitCsv(flags.tags),
      source: "tool.run",
    };
  }
  return {};
}

function buildWorkflowInput(flags) {
  const steps = [];
  if (flags.context) {
    steps.push({
      kind: "context",
      query: flags.context,
      limit: flags.limit,
    });
  }
  if (flags.skill) {
    steps.push({
      kind: "skill",
      skillId: flags.skill,
    });
  }
  if (flags.tool) {
    steps.push({
      kind: "tool",
      toolName: flags.tool,
      input: flags.toolInput ? parseJson(flags.toolInput) : {},
    });
  }
  if (flags.memory) {
    steps.push({
      kind: "memory",
      content: flags.memory,
      tags: splitCsv(flags.tags),
    });
  }
  return {
    name: flags.name,
    summary: flags.summary ?? "",
    steps,
  };
}

function readCandidatePlanFromFlags(flags) {
  if (flags.input) return parseJson(flags.input);
  if (flags.file) {
    return parseJson(readTextFile(flags.file));
  }
  throw new Error("--input <json> or --file <path> is required");
}

function readWorkflowStepsFromFlags(flags) {
  if (flags.steps) return parseJson(flags.steps);
  if (flags.file) return parseJson(readTextFile(flags.file));
  return undefined;
}

function readTextFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function inferReportFormat(outputPath) {
  if (!outputPath) return "json";
  return String(outputPath).toLowerCase().endsWith(".md") ? "markdown" : "json";
}

function writeOrPrintReport(report, options) {
  const format = String(options.format ?? report.format ?? "json").toLowerCase();
  const content = format === "markdown" || format === "md"
    ? report.markdown
    : `${JSON.stringify(report, null, 2)}\n`;
  if (options.out) {
    fs.mkdirSync(path.dirname(path.resolve(options.out)), { recursive: true });
    fs.writeFileSync(options.out, content, "utf8");
    printJson({
      ok: true,
      path: path.resolve(options.out),
      traceId: report.traceId,
      format: report.format,
    });
    return;
  }
  process.stdout.write(content.endsWith("\n") ? content : `${content}\n`);
}

async function clientRequest(client, method, routePath, body) {
  return client.request(String(method).toUpperCase(), routePath, body);
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function printHelp() {
  const executable = path.basename(process.argv[1] ?? "spruce");
  console.log(`SpruceAgent CLI

Usage:
  ${executable} init
  ${executable} doctor
  ${executable} deploy preflight [--host 127.0.0.1] [--port 7357] [--autopilotPollMs 60000] [--requireToken]
  ${executable} deploy contract
  ${executable} status
  ${executable} run "Summarize TrustKernel" --context "TrustKernel"
  ${executable} run "Summarize TrustKernel" --context "TrustKernel" --requireFreshContext
  ${executable} run "Summarize TrustKernel" --context "TrustKernel" --requireFreshContext --refreshContext
  ${executable} run "Summarize TrustKernel" --context "TrustKernel" --skill <skillId>
  ${executable} run "Draft with mock LLM" --context "TrustKernel" --llm mock --dryRun
  ${executable} run "Promote draft" --context "TrustKernel" --llm mock --promotePlan --dryRun
  ${executable} run "Request candidate approvals" --llm <provider> --promotePlan --requestCandidateApprovals
  ${executable} run "Execute promoted candidate" --context "TrustKernel" --llm <provider> --promotePlan --executeCandidatePlan
  ${executable} run resume <traceId> [--stepId <stepId>] [--approvalId <approvalId>]
  ${executable} run detail <traceId>
  ${executable} run detail-contract
  ${executable} run "Execute approved skill" --skill <skillId> --executeSkill
  ${executable} run "Plan safely" --dryRun
  ${executable} inbox
  ${executable} inbox contract
  ${executable} memory add "content" [--scope project] [--kind note] [--tags a,b]
  ${executable} memory search "query"
  ${executable} memory list
  ${executable} trace start "goal" [--trustMode approve]
  ${executable} trace event <traceId> <type> [jsonPayload]
  ${executable} trace list
  ${executable} tool list
  ${executable} tool run file.read --path README.md
  ${executable} tool run shell.execute --command "git status" --approved
  ${executable} approval list [--status pending]
  ${executable} approval queue [--traceKind agent.run|workflow.run]
  ${executable} approval approve <approvalId>
  ${executable} task create --goal "Ship a reviewed change" --nextAction "Run the focused test"
  ${executable} task list [--status open] [--owner <owner>]
  ${executable} task claim <taskId> --owner <owner>
  ${executable} task update <taskId> --status waiting_for_human --humanGate "Approve production release"
  ${executable} task update <taskId> --status blocked --blocker "Waiting for the repository access decision"
  ${executable} task update <taskId> --status completed --completionSummary "Focused checks passed; release handoff recorded"
  ${executable} task update <taskId> --status cancelled --cancellationSummary "Scope removed from this release"
  ${executable} task follow-up <terminalTaskId> --goal "Investigate the discovered regression"
  ${executable} task handoff <taskId> --fromOwner "coding-agent" --owner "reviewer" --handoffSummary "Implementation is ready for review" --nextAction "Review the focused diff"
  ${executable} task resume <taskId> --nextAction "Run the focused validation" --resumptionSummary "Repository access was granted"
  ${executable} task board
  ${executable} task evidence <taskId>
  ${executable} task closure <taskId>
  ${executable} task lineage <taskId>
  ${executable} task events <taskId> [--limit 50]
  ${executable} task contract
  ${executable} task event-contract
  ${executable} autopilot runner [--intervalMs 60000] [--limit 100]
  ${executable} artifact list [--traceId <traceId>] [--kind tool_result]
  ${executable} artifact get <artifactId>
  ${executable} artifact contract
  ${executable} report trace <traceId> [--format json|markdown] [--includeRaw] [--out trace-report.md]
  ${executable} report contract
  ${executable} tool run file.write --path notes.txt --content "hello" --approvalId <approvalId>
  ${executable} context index
  ${executable} context freshness
  ${executable} context preflight [--requireFreshContext] [--refreshContext]
  ${executable} context search "TrustKernel"
  ${executable} context evidence "TrustKernel approval" [--limit 5] [--memoryLimit 3]
  ${executable} context evidence-contract
  ${executable} context show README.md
  ${executable} policy check --tool shell.execute --command "git status"
  ${executable} skill propose --name "Name" --summary "Summary" --steps "step one,step two"
  ${executable} skill extract <traceId>
  ${executable} skill approve <skillId>
  ${executable} skill evaluate <skillId>
  ${executable} skill promote <skillId>
  ${executable} skill fixture-create <skillId>
  ${executable} skill replay <fixtureId>
  ${executable} skill package-export <skillId> [--file skill.skillpkg.json]
  ${executable} skill package-import <packageId|file>
  ${executable} skill list [--status candidates]
  ${executable} workflow create --input "{\\"name\\":\\"Review\\",\\"steps\\":[{\\"kind\\":\\"context\\",\\"query\\":\\"TrustKernel\\"}]}"
  ${executable} workflow create --name "Review" --context "TrustKernel" --skill <skillId> --memory "Done"
  ${executable} workflow draft "Build a review workflow" --context "TrustKernel" --llm mock
  ${executable} workflow save-draft --file workflow-draft.json
  ${executable} workflow update <workflowId> --file workflow-steps.json --reason "tighten review"
  ${executable} workflow archive <workflowId> --reason "replaced by v2"
  ${executable} workflow list [--status active|archived|all]
  ${executable} workflow versions <workflowId>
  ${executable} workflow restore <workflowId> <revision>
  ${executable} workflow run <workflowId> [--requireFreshContext] [--refreshContext]
  ${executable} workflow resume <traceId> [--stepId <stepId>] [--approvalId <approvalId>]
  ${executable} workflow inbox
  ${executable} workflow detail <traceId>
  ${executable} eval trace <traceId>
  ${executable} eval list
  ${executable} outcome contract
  ${executable} outcome fixture-create --name "Readme exists" --validators "[{\"kind\":\"completion_status\",\"allowedStatuses\":[\"completed\"]}]"
  ${executable} outcome fixtures
  ${executable} outcome evaluate <fixtureId> --trace <traceId> [--fleet <fleetRunId>]
  ${executable} outcome summary <fixtureId>
  ${executable} llm contract
  ${executable} llm provider-contract
  ${executable} llm providers
  ${executable} llm configure deepseek --kind deepseek --model deepseek-v4-flash --apiKeyEnv DEEPSEEK_API_KEY --default
  ${executable} llm detail <providerId>
  ${executable} llm validate <providerId>
  ${executable} llm remove <providerId>
  ${executable} planner contract
  ${executable} candidate contract
  ${executable} candidate approval-contract
  ${executable} candidate continuation-contract
  ${executable} candidate request-approvals --file candidate-plan.json
  ${executable} candidate execute-approved --file candidate-plan.json --stepId <stepId> --approvalId <approvalId>
  ${executable} agent adapters [--kind coding_cli]
  ${executable} agent adapter <adapterId>
  ${executable} agent plan <adapterId> --goal "Implement task" [--context "query"]
  ${executable} agent prepare <adapterId> --goal "Implement task" [--context "query"]
  ${executable} agent workspaces [--adapterId codex-cli]
  ${executable} agent workspace <workspaceId>
  ${executable} agent retire-workspace <workspaceId> [--deleteBranch] [--reason "completed"]
  ${executable} agent launch <workspaceId>
  ${executable} agent launch <externalCliWorkspaceId> --execute [--approvalId <approvalId>]
  ${executable} agent launch <localShellWorkspaceId> --execute --command "node -v" [--approvalId <approvalId>]
  ${executable} agent launches [--workspaceId <workspaceId>]
  ${executable} agent launch-detail <launchId>
  ${executable} agent review <launchId> [moreLaunchIds...]
  ${executable} agent reviews [--status pending_review]
  ${executable} agent review-detail <reviewId>
  ${executable} agent review-decide <reviewId> --decision approved --selectedLaunchId <launchId> --reason "reviewed"
  ${executable} agent contract
  ${executable} agent workspace-contract
  ${executable} agent launcher-contract
  ${executable} agent external-launcher-contract
  ${executable} agent review-contract
  ${executable} agent trial-attest <launchId> --command "npm test" [--approvalId <id>] [--timeoutMs 120000]
  ${executable} agent trial-attest <launchId> --approvalId <approvedAttestationId>
  ${executable} agent trial-record <adapterId> --processExitCode 0 --changedFileCount 1 --baselineWorkspaceClean true --acceptanceStatus passed --acceptanceExitCode 0 --acceptanceWorkspaceStable true --policyStatus allowed
  ${executable} agent trials [--adapterId codex-cli] [--status passed|failed] [--attested true|false]
  ${executable} agent trial-detail <trialId>
  ${executable} agent trial-contract
  ${executable} agent trial-attestation-contract
  ${executable} agent probe [--adapterIds codex-cli,claude-code,cursor-agent,grok-cli] [--version]
  ${executable} agent probes
  ${executable} agent probe-detail <probeId>
  ${executable} agent route --goal "Implement task" --roles coding,review --refreshCapabilities
  ${executable} agent route --goal "Execute script" --roles deterministic_automation --mode execute
  ${executable} agent routes [--status routed|blocked]
  ${executable} agent route-detail <routeId>
  ${executable} agent probe-contract
  ${executable} agent router-contract
  ${executable} fleet create <routeId> --role coding --candidates 2 --parallel 2 [--context "query"] [--executionTaskId <taskId>]
  ${executable} fleet approvals <fleetRunId> [--timeoutMs 600000]
  ${executable} fleet approve <fleetRunId> --confirm approve_all_invocations --reason "reviewed exact invocations"
  ${executable} fleet execute <fleetRunId>
  ${executable} fleet cancel <fleetRunId> --reason "operator requested cancellation"
  ${executable} fleet list [--status completed]
  ${executable} fleet detail <fleetRunId>
  ${executable} fleet contract
  ${executable} gateway token
  ${executable} gateway token --rotate
  ${executable} gateway contract
  ${executable} gateway runtime
  ${executable} gateway runtime-contract
  ${executable} gateway call --path /v1/status --token <token>
  ${executable} gateway serve [--host 127.0.0.1] [--port 7357] [--autopilotPollMs 60000]
  ${executable} release list [--limit 20]
  ${executable} release get <verificationId>
  ${executable} release contract
  ${executable} release manifest [--verificationId <verificationId>]
  ${executable} release manifests [--limit 20]
  ${executable} release manifest-get <manifestId>
  ${executable} release manifest-contract

Workspace:
  ${path.join(process.cwd(), ".spruceagent")}
`);
}
