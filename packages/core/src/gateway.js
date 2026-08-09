import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createAgentAdapterRunPlan,
  getAgentAdapter,
  getAgentAdapterContract,
  listAgentAdapters,
} from "./agent-adapters.js";
import {
  getAgentWorkspace,
  getAgentWorkspaceContract,
  listAgentWorkspaces,
  prepareAgentWorkspace,
} from "./agent-workspaces.js";
import {
  getAgentLaunch,
  getAgentLauncherContract,
  launchAgentWorkspace,
  listAgentLaunches,
} from "./agent-launcher.js";
import { getExternalCliLauncherContract } from "./external-cli-launcher.js";
import {
  approveFleetRun,
  cancelFleetRun,
  createFleetRun,
  executeFleetRun,
  getFleetRun,
  getFleetRunProgress,
  getFleetRunContract,
  listFleetRuns,
  requestFleetRunApprovals,
} from "./fleet-runs.js";
import { bindSquadHandoffReview, bindSquadMemberWorkspace, createSquad, getSquad, getSquadContract, getSquadReadiness, listSquads, requestSquadMemberApproval } from "./squads.js";
import {
  createLaunchReview,
  decideLaunchReview,
  getLaunchReview,
  getLaunchReviewContract,
  listLaunchReviews,
} from "./launch-review.js";
import {
  getCapabilityProbe,
  getCapabilityProbeContract,
  listCapabilityProbes,
  probeAgentCapabilities,
} from "./capability-probe.js";
import {
  getAgentTrial,
  getAgentTrialContract,
  listAgentTrials,
  recordAgentTrial,
} from "./agent-trials.js";
import { attestAgentLaunchTrial, getAgentTrialAttestationContract } from "./agent-trial-attestation.js";
import { assessAgentExecutionReadiness, getAgentExecutionReadinessContract } from "./agent-execution-readiness.js";
import {
  createTaskRoute,
  getTaskRoute,
  getTaskRouterContract,
  listTaskRoutes,
} from "./task-router.js";
import { approveTicket, getApprovalTicket, listApprovalTickets, rejectTicket } from "./approvals.js";
import { getApprovalQueue, getApprovalQueueContract } from "./approval-queue.js";
import { claimExecutionTask, createExecutionTask, createExecutionTaskFollowUp, getExecutionTask, getExecutionTaskBoard, getExecutionTaskClosure, getExecutionTaskContract, getExecutionTaskEvidence, getExecutionTaskLineage, handoffExecutionTask, listExecutionTasks, resumeExecutionTask, updateExecutionTask } from "./execution-tasks.js";
import { createAutopilot, getAutopilot, getAutopilotContract, listAutopilotTriggers, listAutopilots, listDueAutopilots, runDueAutopilots, triggerAutopilot } from "./autopilots.js";
import { getArtifact, getArtifactContract, listArtifacts } from "./artifacts.js";
import { assessWorkspaceIndexFreshness, buildWorkspaceIndex, readWorkspaceIndex, searchWorkspaceContext } from "./context.js";
import { createContextEvidencePack, getContextEvidenceContract } from "./context-evidence.js";
import { evaluateTrace, getEvaluation, listEvaluations } from "./evaluations.js";
import {
  createOutcomeFixture,
  evaluateOutcomeFixture,
  getOutcomeEvaluationContract,
  getOutcomeEvaluationResult,
  getOutcomeFixture,
  listOutcomeEvaluationResults,
  listOutcomeFixtures,
  summarizeOutcomeFixture,
} from "./outcome-evaluations.js";
import {
  evaluateSkillCandidate,
  getSkillEvaluation,
  getSkillEvaluationContract,
  listSkillEvaluations,
} from "./skill-evaluations.js";
import { getSkillPromotionContract, promoteSkillCandidate } from "./skill-promotion.js";
import {
  exportSkillPackage,
  getSkillPackage,
  getSkillPackageContract,
  getSkillPackageImport,
  importSkillPackage,
  listSkillPackageImports,
  listSkillPackages,
} from "./skill-packages.js";
import {
  createSkillReplayFixture,
  getSkillReplayContract,
  getSkillReplayFixture,
  getSkillReplayResult,
  listSkillReplayFixtures,
  listSkillReplayResults,
  replaySkillFixture,
} from "./skill-replay.js";
import { executeTool } from "./executor.js";
import { listMemory } from "./memory.js";
import {
  executeApprovedCandidateStep,
  getCandidateApprovalContract,
  requestCandidateApprovals,
} from "./candidate-approvals.js";
import { getCandidateExecutionContract } from "./candidate-executor.js";
import { getRunContinuationContract, resumeAgentRun } from "./agent-continuation.js";
import { getRunDetail, getRunDetailContract } from "./run-detail.js";
import { getRunInbox, getRunInboxContract } from "./run-inbox.js";
import { getTraceReport, getTraceReportContract } from "./trace-report.js";
import { getLlmAdapterContract } from "./llm.js";
import {
  configureLlmProvider,
  getLlmProviderConfig,
  getLlmProviderRegistryContract,
  listLlmProviderConfigs,
  removeLlmProviderConfig,
  validateLlmProviderConfig,
} from "./llm-provider-registry.js";
import { runAgent } from "./agent-runner.js";
import { assessRunRisk, runPreflight } from "./preflight.js";
import { readJson, writeJson } from "./storage.js";
import { listTools } from "./tools.js";
import { listTraces } from "./trace.js";
import {
  getWorkflowDetailContract,
  getWorkflowInbox,
  getWorkflowInboxContract,
  getWorkflowRunDetail,
} from "./workflow-state.js";
import { getWorkflowContinuationContract, resumeWorkflowRun } from "./workflow-continuation.js";
import {
  createWorkflowFromDraft,
  draftWorkflow,
  getWorkflowBuilderContract,
} from "./workflow-builder.js";
import {
  archiveWorkflow,
  createWorkflow,
  getWorkflow,
  getWorkflowVersion,
  listWorkflowVersions,
  listWorkflows,
  restoreWorkflowVersion,
  runWorkflow,
  updateWorkflow,
} from "./workflows.js";
import { getSkillVersion, listSkillVersions, listSkills, restoreSkillVersion } from "./skills.js";

const DEFAULT_GATEWAY_HOST = "127.0.0.1";
const DEFAULT_GATEWAY_PORT = 7357;
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const WORKBENCH_ROOT = path.join(PROJECT_ROOT, "apps", "desktop");
const SHOWCASE_ROOT = path.join(PROJECT_ROOT, "apps", "showcase");

export const GATEWAY_ROUTE_CONTRACT = Object.freeze({
  version: "0.1.0",
  basePath: "/v1",
  localOnly: true,
  auth: {
    type: "bearer-token",
    requiredForV1: true,
  },
  routes: [
    {
      id: "health",
      method: "GET",
      path: "/health",
      authRequired: false,
      description: "Check that the local gateway process is alive.",
    },
    {
      id: "workbench",
      method: "GET",
      path: "/workbench",
      authRequired: false,
      description: "Serve the local SpruceAgent Workbench UI.",
    },
    {
      id: "showcase",
      method: "GET",
      path: "/showcase",
      authRequired: false,
      description: "Serve the public SpruceAgent showcase page.",
    },
    {
      id: "status",
      method: "GET",
      path: "/v1/status",
      authRequired: true,
      description: "Read local workspace and gateway status.",
    },
    {
      id: "context.freshness",
      method: "GET",
      path: "/v1/context/freshness",
      authRequired: true,
      description: "Check whether the current workspace still matches the latest ContextOS index.",
    },
    {
      id: "inbox",
      method: "GET",
      path: "/v1/inbox",
      authRequired: true,
      description: "Read the Run State / Inbox workbench projection.",
    },
    {
      id: "inbox.contract",
      method: "GET",
      path: "/v1/inbox/contract",
      authRequired: true,
      description: "Read the Run Inbox contract.",
    },
    {
      id: "approval_queue",
      method: "GET",
      path: "/v1/approval-queue",
      authRequired: true,
      description: "Read the unified approval and resume decision queue.",
    },
    {
      id: "approval_queue.contract",
      method: "GET",
      path: "/v1/approval-queue/contract",
      authRequired: true,
      description: "Read the Approval Queue contract.",
    },
    {
      id: "execution_tasks.list",
      method: "GET",
      path: "/v1/execution-tasks",
      authRequired: true,
      description: "List durable local execution-control tasks without executing them.",
    },
    {
      id: "execution_tasks.board",
      method: "GET",
      path: "/v1/execution-tasks/board",
      authRequired: true,
      description: "Read the operator-prioritized execution-task board.",
    },
    {
      id: "execution_tasks.contract",
      method: "GET",
      path: "/v1/execution-tasks/contract",
      authRequired: true,
      description: "Read the Execution Tasks safety contract.",
    },
    {
      id: "execution_tasks.get",
      method: "GET",
      path: "/v1/execution-tasks/:taskId",
      authRequired: true,
      description: "Read one durable execution-control task.",
    },
    {
      id: "execution_tasks.evidence",
      method: "GET",
      path: "/v1/execution-tasks/:taskId/evidence",
      authRequired: true,
      description: "Resolve typed local task links as read-only evidence without granting authority.",
    },
    {
      id: "execution_tasks.closure",
      method: "GET",
      path: "/v1/execution-tasks/:taskId/closure",
      authRequired: true,
      description: "Read a completion outcome and its immutable evidence snapshot without granting authority.",
    },
    {
      id: "execution_tasks.lineage",
      method: "GET",
      path: "/v1/execution-tasks/:taskId/lineage",
      authRequired: true,
      description: "Read parent and follow-up task lineage without changing task control state.",
    },
    {
      id: "execution_tasks.create",
      method: "POST",
      path: "/v1/execution-tasks",
      authRequired: true,
      description: "Create local execution-control state; does not launch an agent or tool.",
    },
    {
      id: "execution_tasks.follow_up",
      method: "POST",
      path: "/v1/execution-tasks/:taskId/follow-up",
      authRequired: true,
      description: "Create a new control-state follow-up for a terminal task without reopening it.",
    },
    {
      id: "execution_tasks.claim",
      method: "POST",
      path: "/v1/execution-tasks/:taskId/claim",
      authRequired: true,
      description: "Claim a task through its durable owner mutex.",
    },
    {
      id: "execution_tasks.handoff",
      method: "POST",
      path: "/v1/execution-tasks/:taskId/handoff",
      authRequired: true,
      description: "Transfer task ownership only with the current owner, a handoff summary, and next action.",
    },
    {
      id: "execution_tasks.update",
      method: "POST",
      path: "/v1/execution-tasks/:taskId/update",
      authRequired: true,
      description: "Update task control state; terminal tasks cannot reopen, human waiting and blocked states require concrete reasons, and first completion or cancellation requires a recorded outcome.",
    },
    {
      id: "execution_tasks.resume",
      method: "POST",
      path: "/v1/execution-tasks/:taskId/resume",
      authRequired: true,
      description: "Resume a blocked or waiting task with a recorded reason and next action; does not execute work.",
    },
    {
      id: "autopilots.list",
      method: "GET",
      path: "/v1/autopilots",
      authRequired: true,
      description: "List durable interval rules whose only v0 action is creating a local execution task.",
    },
    {
      id: "autopilots.due",
      method: "GET",
      path: "/v1/autopilots/due",
      authRequired: true,
      description: "Evaluate due Autopilot rules without changing state.",
    },
    {
      id: "autopilots.contract",
      method: "GET",
      path: "/v1/autopilots/contract",
      authRequired: true,
      description: "Read Autopilot v0 safety and idempotency contract.",
    },
    {
      id: "autopilots.get",
      method: "GET",
      path: "/v1/autopilots/:autopilotId",
      authRequired: true,
      description: "Read one durable Autopilot rule.",
    },
    {
      id: "autopilots.triggers",
      method: "GET",
      path: "/v1/autopilots/:autopilotId/triggers",
      authRequired: true,
      description: "Read a rule's durable trigger ledger.",
    },
    {
      id: "autopilots.create",
      method: "POST",
      path: "/v1/autopilots",
      authRequired: true,
      description: "Create an interval Autopilot rule; it does not start a background timer or execute work.",
    },
    {
      id: "autopilots.run_due",
      method: "POST",
      path: "/v1/autopilots/run-due",
      authRequired: true,
      description: "Trigger currently due rules with durable idempotency; each result only creates an open local task.",
    },
    {
      id: "autopilots.trigger",
      method: "POST",
      path: "/v1/autopilots/:autopilotId/trigger",
      authRequired: true,
      description: "Trigger one due rule and record its task-creation result; never launches an agent or tool.",
    },
    {
      id: "artifacts.list",
      method: "GET",
      path: "/v1/artifacts",
      authRequired: true,
      description: "List run artifacts and execution journal entries.",
    },
    {
      id: "artifacts.get",
      method: "GET",
      path: "/v1/artifacts/:artifactId",
      authRequired: true,
      description: "Read a run artifact detail by id.",
    },
    {
      id: "artifacts.contract",
      method: "GET",
      path: "/v1/artifacts/contract",
      authRequired: true,
      description: "Read the Artifacts contract.",
    },
    {
      id: "trace_reports.get",
      method: "GET",
      path: "/v1/reports/traces/:traceId",
      authRequired: true,
      description: "Read an exportable trace report for an agent or workflow run.",
    },
    {
      id: "trace_reports.contract",
      method: "GET",
      path: "/v1/reports/contract",
      authRequired: true,
      description: "Read the Trace Report contract.",
    },
    {
      id: "agent_adapters.list",
      method: "GET",
      path: "/v1/agent-adapters",
      authRequired: true,
      description: "List CLI agent adapter specifications.",
    },
    {
      id: "agent_adapters.get",
      method: "GET",
      path: "/v1/agent-adapters/:adapterId",
      authRequired: true,
      description: "Read a CLI agent adapter specification.",
    },
    {
      id: "agent_adapters.plan",
      method: "POST",
      path: "/v1/agent-adapters/:adapterId/plan",
      authRequired: true,
      description: "Preview an isolated adapter run plan without executing an external CLI.",
    },
    {
      id: "agent_adapters.contract",
      method: "GET",
      path: "/v1/agent-adapters/contract",
      authRequired: true,
      description: "Read the Agent Adapter Registry contract.",
    },
    {
      id: "agent_workspaces.list",
      method: "GET",
      path: "/v1/agent-workspaces",
      authRequired: true,
      description: "List prepared isolated agent workspaces.",
    },
    {
      id: "agent_workspaces.get",
      method: "GET",
      path: "/v1/agent-workspaces/:workspaceId",
      authRequired: true,
      description: "Read an isolated agent workspace record.",
    },
    {
      id: "agent_workspaces.prepare",
      method: "POST",
      path: "/v1/agent-workspaces",
      authRequired: true,
      description: "Prepare an isolated workspace from an adapter run plan without launching an external CLI.",
    },
    {
      id: "agent_workspaces.contract",
      method: "GET",
      path: "/v1/agent-workspaces/contract",
      authRequired: true,
      description: "Read the Agent Workspace contract.",
    },
    {
      id: "agent_launches.list",
      method: "GET",
      path: "/v1/agent-launches",
      authRequired: true,
      description: "List gated Agent Launcher records.",
    },
    {
      id: "agent_launches.get",
      method: "GET",
      path: "/v1/agent-launches/:launchId",
      authRequired: true,
      description: "Read one gated Agent Launcher record.",
    },
    {
      id: "agent_launches.create",
      method: "POST",
      path: "/v1/agent-launches",
      authRequired: true,
      description: "Plan or execute a gated Agent Workspace launch.",
    },
    {
      id: "agent_launches.contract",
      method: "GET",
      path: "/v1/agent-launches/contract",
      authRequired: true,
      description: "Read the Agent Launcher contract.",
    },
    {
      id: "external_cli_launcher.contract",
      method: "GET",
      path: "/v1/external-cli-launcher/contract",
      authRequired: true,
      description: "Read the shell-free External CLI Launcher contract.",
    },
    {
      id: "launch_reviews.list",
      method: "GET",
      path: "/v1/launch-reviews",
      authRequired: true,
      description: "List Agent Launch review packages.",
    },
    {
      id: "launch_reviews.get",
      method: "GET",
      path: "/v1/launch-reviews/:reviewId",
      authRequired: true,
      description: "Read one evidence-backed Agent Launch review package.",
    },
    {
      id: "launch_reviews.create",
      method: "POST",
      path: "/v1/launch-reviews",
      authRequired: true,
      description: "Create a review package from one or more Agent Launch records.",
    },
    {
      id: "launch_reviews.decide",
      method: "POST",
      path: "/v1/launch-reviews/:reviewId/decision",
      authRequired: true,
      description: "Record an approve, reject, or needs-changes review decision without Git mutation.",
    },
    {
      id: "launch_reviews.contract",
      method: "GET",
      path: "/v1/launch-reviews/contract",
      authRequired: true,
      description: "Read the Launch Review contract.",
    },
    {
      id: "agent_trials.list",
      method: "GET",
      path: "/v1/agent-trials",
      authRequired: true,
      description: "List empirical Agent execution trial evidence and descriptive statistics.",
    },
    {
      id: "agent_trials.get",
      method: "GET",
      path: "/v1/agent-trials/:trialId",
      authRequired: true,
      description: "Read one empirical Agent execution trial.",
    },
    {
      id: "agent_trials.create",
      method: "POST",
      path: "/v1/agent-trials",
      authRequired: true,
      description: "Record a supplied execution observation without prompts, logs, diffs, or credentials.",
    },
    {
      id: "agent_trials.contract",
      method: "GET",
      path: "/v1/agent-trials/contract",
      authRequired: true,
      description: "Read the Agent Trial evidence contract.",
    },
    {
      id: "agent_trials.attest",
      method: "POST",
      path: "/v1/agent-trials/attest",
      authRequired: true,
      description: "Run independently approved acceptance and create Launcher-attested Trial evidence.",
    },
    {
      id: "agent_trials.attestation_contract",
      method: "GET",
      path: "/v1/agent-trials/attestation-contract",
      authRequired: true,
      description: "Read the Agent Trial attestation contract.",
    },
    {
      id: "agent_adapters.readiness",
      method: "GET",
      path: "/v1/agent-adapters/:adapterId/readiness",
      authRequired: true,
      description: "Read-only execution readiness projection; it never prepares, approves, or launches an agent.",
    },
    {
      id: "capability_probes.list",
      method: "GET",
      path: "/v1/capability-probes",
      authRequired: true,
      description: "List redacted local Agent capability snapshots.",
    },
    {
      id: "capability_probes.get",
      method: "GET",
      path: "/v1/capability-probes/:probeId",
      authRequired: true,
      description: "Read one Agent capability snapshot.",
    },
    {
      id: "capability_probes.create",
      method: "POST",
      path: "/v1/capability-probes",
      authRequired: true,
      description: "Probe allowlisted local Agent commands and redacted provider configuration.",
    },
    {
      id: "capability_probes.contract",
      method: "GET",
      path: "/v1/capability-probes/contract",
      authRequired: true,
      description: "Read the Capability Probe contract.",
    },
    {
      id: "task_routes.list",
      method: "GET",
      path: "/v1/agent-routes",
      authRequired: true,
      description: "List explainable Agent route drafts.",
    },
    {
      id: "task_routes.get",
      method: "GET",
      path: "/v1/agent-routes/:routeId",
      authRequired: true,
      description: "Read one explainable Agent route draft.",
    },
    {
      id: "task_routes.create",
      method: "POST",
      path: "/v1/agent-routes",
      authRequired: true,
      description: "Create a non-executing route draft from task constraints and observed capabilities.",
    },
    {
      id: "task_routes.contract",
      method: "GET",
      path: "/v1/agent-routes/contract",
      authRequired: true,
      description: "Read the Task Router contract.",
    },
    {
      id: "fleet_runs.list",
      method: "GET",
      path: "/v1/fleet-runs",
      authRequired: true,
      description: "List Fleet Run orchestration records.",
    },
    {
      id: "fleet_runs.get",
      method: "GET",
      path: "/v1/fleet-runs/:fleetRunId",
      authRequired: true,
      description: "Read one Fleet Run orchestration record.",
    },
    {
      id: "fleet_runs.progress",
      method: "GET",
      path: "/v1/fleet-runs/:fleetRunId/progress",
      authRequired: true,
      description: "Read compact Fleet member status and incremental audit events for a live operations view.",
    },
    {
      id: "fleet_runs.create",
      method: "POST",
      path: "/v1/fleet-runs",
      authRequired: true,
      description: "Prepare comparable isolated candidates from an executable Task Route.",
    },
    {
      id: "fleet_runs.request_approvals",
      method: "POST",
      path: "/v1/fleet-runs/:fleetRunId/approvals",
      authRequired: true,
      description: "Create exact Agent Launcher approval tickets for every Fleet candidate.",
    },
    {
      id: "fleet_runs.approve",
      method: "POST",
      path: "/v1/fleet-runs/:fleetRunId/approve",
      authRequired: true,
      description: "Explicitly batch-approve reviewed Fleet candidate invocations.",
    },
    {
      id: "fleet_runs.execute",
      method: "POST",
      path: "/v1/fleet-runs/:fleetRunId/execute",
      authRequired: true,
      description: "Execute an approved Fleet within its bounded parallelism.",
    },
    {
      id: "fleet_runs.cancel",
      method: "POST",
      path: "/v1/fleet-runs/:fleetRunId/cancel",
      authRequired: true,
      description: "Cancel pending Fleet candidates and abort active candidates in this Gateway process.",
    },
    {
      id: "fleet_runs.contract",
      method: "GET",
      path: "/v1/fleet-runs/contract",
      authRequired: true,
      description: "Read the Fleet Run Orchestrator contract.",
    },
    {
      id: "squads.list",
      method: "GET",
      path: "/v1/squads",
      authRequired: true,
      description: "List reviewable cross-role Squad coordination plans.",
    },
    {
      id: "squads.get",
      method: "GET",
      path: "/v1/squads/:squadId",
      authRequired: true,
      description: "Read one Squad coordination plan and its explicit handoffs.",
    },
    {
      id: "squads.create",
      method: "POST",
      path: "/v1/squads",
      authRequired: true,
      description: "Create a non-executing Squad plan from a fully routed Task Route.",
    },
    {
      id: "squads.contract",
      method: "GET",
      path: "/v1/squads/contract",
      authRequired: true,
      description: "Read the Squad v0 safety and coordination contract.",
    },
    {
      id: "squads.readiness",
      method: "GET",
      path: "/v1/squads/:squadId/readiness",
      authRequired: true,
      description: "Project member readiness from bound workspaces and approved handoff reviews without launching an agent.",
    },
    {
      id: "squads.bind_workspace",
      method: "POST",
      path: "/v1/squads/:squadId/members/:role/workspace",
      authRequired: true,
      description: "Bind an already prepared, adapter-matching Agent Workspace to a Squad member.",
    },
    {
      id: "squads.accept_handoff",
      method: "POST",
      path: "/v1/squads/:squadId/handoffs/:from/:to/review",
      authRequired: true,
      description: "Accept a Squad handoff only with an approved review tied to the source workspace.",
    },
    {
      id: "squads.request_approval",
      method: "POST",
      path: "/v1/squads/:squadId/members/:role/approval-request",
      authRequired: true,
      description: "Create an exact existing Agent Launcher approval ticket only for a ready Squad member; it does not execute the agent.",
    },
    {
      id: "tools.list",
      method: "GET",
      path: "/v1/tools",
      authRequired: true,
      description: "List registered tools.",
    },
    {
      id: "skills.list",
      method: "GET",
      path: "/v1/skills",
      authRequired: true,
      description: "List local skills by status.",
    },
    {
      id: "skill_evaluations.contract",
      method: "GET",
      path: "/v1/skill-evaluations/contract",
      authRequired: true,
      description: "Read the SkillForge Evaluation Harness contract.",
    },
    {
      id: "skill_evaluations.list",
      method: "GET",
      path: "/v1/skill-evaluations",
      authRequired: true,
      description: "List skill evaluation reports.",
    },
    {
      id: "skill_evaluations.get",
      method: "GET",
      path: "/v1/skill-evaluations/:evaluationId",
      authRequired: true,
      description: "Read a skill evaluation report by id.",
    },
    {
      id: "skill_evaluations.create",
      method: "POST",
      path: "/v1/skills/:skillId/evaluations",
      authRequired: true,
      description: "Evaluate a candidate or approved skill without executing it.",
    },
    {
      id: "skill_promotion.contract",
      method: "GET",
      path: "/v1/skills/promotion-contract",
      authRequired: true,
      description: "Read the Skill Promotion Gate contract.",
    },
    {
      id: "skills.promote",
      method: "POST",
      path: "/v1/skills/:skillId/promote",
      authRequired: true,
      description: "Promote a candidate skill after passing the evaluation gate.",
    },
    {
      id: "skills.versions",
      method: "GET",
      path: "/v1/skills/:skillId/versions",
      authRequired: true,
      description: "List skill version snapshots.",
    },
    {
      id: "skills.version",
      method: "GET",
      path: "/v1/skills/:skillId/versions/:revision",
      authRequired: true,
      description: "Read a skill version snapshot.",
    },
    {
      id: "skills.restore",
      method: "POST",
      path: "/v1/skills/:skillId/versions/:revision/restore",
      authRequired: true,
      description: "Restore an approved skill from a version snapshot.",
    },
    {
      id: "skill_packages.contract",
      method: "GET",
      path: "/v1/skills/package-contract",
      authRequired: true,
      description: "Read the portable Skill Package contract.",
    },
    {
      id: "skill_packages.export",
      method: "POST",
      path: "/v1/skills/:skillId/package-export",
      authRequired: true,
      description: "Export an approved skill and evidence as a portable package.",
    },
    {
      id: "skill_packages.list",
      method: "GET",
      path: "/v1/skill-packages",
      authRequired: true,
      description: "List exported local skill packages.",
    },
    {
      id: "skill_packages.get",
      method: "GET",
      path: "/v1/skill-packages/:packageId",
      authRequired: true,
      description: "Read a skill package.",
    },
    {
      id: "skill_packages.import",
      method: "POST",
      path: "/v1/skill-packages/import",
      authRequired: true,
      description: "Import a skill package as a candidate skill.",
    },
    {
      id: "skill_packages.imports.list",
      method: "GET",
      path: "/v1/skill-package-imports",
      authRequired: true,
      description: "List skill package import records.",
    },
    {
      id: "skill_packages.imports.get",
      method: "GET",
      path: "/v1/skill-package-imports/:importId",
      authRequired: true,
      description: "Read a skill package import record.",
    },
    {
      id: "skill_replay.contract",
      method: "GET",
      path: "/v1/skills/replay-contract",
      authRequired: true,
      description: "Read the static Skill Replay contract.",
    },
    {
      id: "skill_replay.fixtures.list",
      method: "GET",
      path: "/v1/skill-replay/fixtures",
      authRequired: true,
      description: "List skill replay fixtures.",
    },
    {
      id: "skill_replay.fixtures.get",
      method: "GET",
      path: "/v1/skill-replay/fixtures/:fixtureId",
      authRequired: true,
      description: "Read a skill replay fixture.",
    },
    {
      id: "skill_replay.fixtures.create",
      method: "POST",
      path: "/v1/skills/:skillId/replay-fixtures",
      authRequired: true,
      description: "Create a static replay fixture for a skill.",
    },
    {
      id: "skill_replay.run",
      method: "POST",
      path: "/v1/skill-replay/fixtures/:fixtureId/run",
      authRequired: true,
      description: "Run static replay checks for a fixture.",
    },
    {
      id: "skill_replay.results.list",
      method: "GET",
      path: "/v1/skill-replay/results",
      authRequired: true,
      description: "List skill replay results.",
    },
    {
      id: "skill_replay.results.get",
      method: "GET",
      path: "/v1/skill-replay/results/:resultId",
      authRequired: true,
      description: "Read a skill replay result.",
    },
    {
      id: "tools.run",
      method: "POST",
      path: "/v1/tools/run",
      authRequired: true,
      description: "Execute a tool through TrustKernel policy and approval gates.",
    },
    {
      id: "preflight.run",
      method: "POST",
      path: "/v1/preflight",
      authRequired: true,
      description: "Run deterministic local readiness checks before agent or workflow execution.",
    },
    {
      id: "preflight.risk",
      method: "POST",
      path: "/v1/preflight/risk",
      authRequired: true,
      description: "Preview TrustKernel policy risk for planned agent, workflow, or candidate steps.",
    },
    {
      id: "context.index",
      method: "POST",
      path: "/v1/context/index",
      authRequired: true,
      description: "Build or refresh the local workspace index.",
    },
    {
      id: "context.search",
      method: "POST",
      path: "/v1/context/search",
      authRequired: true,
      description: "Search indexed workspace context.",
    },
    {
      id: "context.evidence_contract",
      method: "GET",
      path: "/v1/context/evidence-contract",
      authRequired: true,
      description: "Read the Context Evidence Contract and its safety boundaries.",
    },
    {
      id: "context.evidence",
      method: "POST",
      path: "/v1/context/evidence",
      authRequired: true,
      description: "Build a read-only, provenance-aware context evidence pack.",
    },
    {
      id: "runs.create",
      method: "POST",
      path: "/v1/runs",
      authRequired: true,
      description: "Start an Agent Run Loop v0 run.",
    },
    {
      id: "runs.get",
      method: "GET",
      path: "/v1/runs/:traceId",
      authRequired: true,
      description: "Read a structured run detail and trace view.",
    },
    {
      id: "run_detail.contract",
      method: "GET",
      path: "/v1/runs/detail-contract",
      authRequired: true,
      description: "Read the Run Detail contract.",
    },
    {
      id: "workflows.list",
      method: "GET",
      path: "/v1/workflows",
      authRequired: true,
      description: "List local workflows.",
    },
    {
      id: "workflows.create",
      method: "POST",
      path: "/v1/workflows",
      authRequired: true,
      description: "Create a local workflow definition without executing it.",
    },
    {
      id: "workflows.update",
      method: "PATCH",
      path: "/v1/workflows/:workflowId",
      authRequired: true,
      description: "Update a workflow definition and preserve the previous revision.",
    },
    {
      id: "workflows.archive",
      method: "POST",
      path: "/v1/workflows/:workflowId/archive",
      authRequired: true,
      description: "Archive a workflow definition without deleting history.",
    },
    {
      id: "workflows.versions",
      method: "GET",
      path: "/v1/workflows/:workflowId/versions",
      authRequired: true,
      description: "List workflow revision history.",
    },
    {
      id: "workflows.version",
      method: "GET",
      path: "/v1/workflows/:workflowId/versions/:revision",
      authRequired: true,
      description: "Read one workflow revision.",
    },
    {
      id: "workflows.restore",
      method: "POST",
      path: "/v1/workflows/:workflowId/versions/:revision/restore",
      authRequired: true,
      description: "Restore a workflow from a prior revision.",
    },
    {
      id: "workflow_inbox",
      method: "GET",
      path: "/v1/workflows/inbox",
      authRequired: true,
      description: "Read workflow run inbox state.",
    },
    {
      id: "workflow_inbox.contract",
      method: "GET",
      path: "/v1/workflows/inbox-contract",
      authRequired: true,
      description: "Read the Workflow Inbox contract.",
    },
    {
      id: "workflow_detail.contract",
      method: "GET",
      path: "/v1/workflows/detail-contract",
      authRequired: true,
      description: "Read the Workflow Detail contract.",
    },
    {
      id: "workflow_continuation.contract",
      method: "GET",
      path: "/v1/workflows/continuation-contract",
      authRequired: true,
      description: "Read the Workflow Continuation contract.",
    },
    {
      id: "workflow_runs.get",
      method: "GET",
      path: "/v1/workflows/runs/:traceId",
      authRequired: true,
      description: "Read a structured workflow run detail and trace view.",
    },
    {
      id: "workflow_runs.resume",
      method: "POST",
      path: "/v1/workflows/runs/:traceId/resume",
      authRequired: true,
      description: "Resume an approval-gated workflow tool step from an existing workflow trace.",
    },
    {
      id: "workflows.get",
      method: "GET",
      path: "/v1/workflows/:workflowId",
      authRequired: true,
      description: "Read a workflow by id.",
    },
    {
      id: "workflows.run",
      method: "POST",
      path: "/v1/workflows/:workflowId/run",
      authRequired: true,
      description: "Run a workflow through the local runtime.",
    },
    {
      id: "approvals.list",
      method: "GET",
      path: "/v1/approvals",
      authRequired: true,
      description: "List approval tickets, optionally filtered by status.",
    },
    {
      id: "approvals.get",
      method: "GET",
      path: "/v1/approvals/:approvalId",
      authRequired: true,
      description: "Read an approval ticket by id.",
    },
    {
      id: "approvals.approve",
      method: "POST",
      path: "/v1/approvals/:approvalId/approve",
      authRequired: true,
      description: "Approve a pending approval ticket.",
    },
    {
      id: "approvals.reject",
      method: "POST",
      path: "/v1/approvals/:approvalId/reject",
      authRequired: true,
      description: "Reject a pending approval ticket.",
    },
    {
      id: "evaluations.list",
      method: "GET",
      path: "/v1/evaluations",
      authRequired: true,
      description: "List evaluation reports.",
    },
    {
      id: "evaluations.get",
      method: "GET",
      path: "/v1/evaluations/:evaluationId",
      authRequired: true,
      description: "Read an evaluation report by id.",
    },
    {
      id: "evaluations.trace",
      method: "POST",
      path: "/v1/evaluations/trace",
      authRequired: true,
      description: "Evaluate a trace by id.",
    },
    {
      id: "outcomes.contract",
      method: "GET",
      path: "/v1/outcomes/contract",
      authRequired: true,
      description: "Read the Outcome Evaluation Suite v1 contract.",
    },
    {
      id: "outcomes.fixtures.list",
      method: "GET",
      path: "/v1/outcomes/fixtures",
      authRequired: true,
      description: "List immutable outcome evaluation fixtures.",
    },
    {
      id: "outcomes.fixtures.get",
      method: "GET",
      path: "/v1/outcomes/fixtures/:fixtureId",
      authRequired: true,
      description: "Read an immutable outcome evaluation fixture.",
    },
    {
      id: "outcomes.fixtures.create",
      method: "POST",
      path: "/v1/outcomes/fixtures",
      authRequired: true,
      description: "Create an immutable deterministic outcome evaluation fixture.",
    },
    {
      id: "outcomes.fixtures.evaluate",
      method: "POST",
      path: "/v1/outcomes/fixtures/:fixtureId/evaluate",
      authRequired: true,
      description: "Evaluate an existing trace and optional Fleet record against a fixture without re-execution.",
    },
    {
      id: "outcomes.fixtures.summary",
      method: "GET",
      path: "/v1/outcomes/fixtures/:fixtureId/summary",
      authRequired: true,
      description: "Summarize repeated outcome evaluation evidence for one fixture.",
    },
    {
      id: "outcomes.results.list",
      method: "GET",
      path: "/v1/outcomes/results",
      authRequired: true,
      description: "List deterministic outcome evaluation results.",
    },
    {
      id: "outcomes.results.get",
      method: "GET",
      path: "/v1/outcomes/results/:resultId",
      authRequired: true,
      description: "Read one deterministic outcome evaluation result.",
    },
    {
      id: "contract",
      method: "GET",
      path: "/v1/contract",
      authRequired: true,
      description: "Read the GatewayMesh route contract.",
    },
    {
      id: "llm.contract",
      method: "GET",
      path: "/v1/llm/contract",
      authRequired: true,
      description: "Read the LLM adapter contract.",
    },
    {
      id: "llm.providers.contract",
      method: "GET",
      path: "/v1/llm/providers/contract",
      authRequired: true,
      description: "Read the offline LLM Provider Registry contract.",
    },
    {
      id: "llm.providers.list",
      method: "GET",
      path: "/v1/llm/providers",
      authRequired: true,
      description: "List redacted LLM provider profiles and offline readiness.",
    },
    {
      id: "llm.providers.configure",
      method: "POST",
      path: "/v1/llm/providers",
      authRequired: true,
      description: "Configure provider metadata and an API-key environment variable name without sending a provider request.",
    },
    {
      id: "llm.providers.get",
      method: "GET",
      path: "/v1/llm/providers/:providerId",
      authRequired: true,
      description: "Read one redacted LLM provider profile.",
    },
    {
      id: "llm.providers.validate",
      method: "GET",
      path: "/v1/llm/providers/:providerId/validate",
      authRequired: true,
      description: "Validate one provider profile offline without network access.",
    },
    {
      id: "llm.providers.remove",
      method: "DELETE",
      path: "/v1/llm/providers/:providerId",
      authRequired: true,
      description: "Remove one local LLM provider profile without contacting the provider.",
    },    {
      id: "workflow_builder.contract",
      method: "GET",
      path: "/v1/workflow-builder/contract",
      authRequired: true,
      description: "Read the Workflow Builder contract.",
    },
    {
      id: "workflow_builder.draft",
      method: "POST",
      path: "/v1/workflow-builder/draft",
      authRequired: true,
      description: "Draft a workflow definition from a goal without executing it.",
    },
    {
      id: "workflow_builder.save",
      method: "POST",
      path: "/v1/workflow-builder/save",
      authRequired: true,
      description: "Save a reviewed workflow draft as a workflow definition without running it.",
    },
    {
      id: "candidate.contract",
      method: "GET",
      path: "/v1/candidate/contract",
      authRequired: true,
      description: "Read the Candidate Execution contract.",
    },
    {
      id: "candidate.approval_contract",
      method: "GET",
      path: "/v1/candidate/approval-contract",
      authRequired: true,
      description: "Read the Candidate Approval contract.",
    },
    {
      id: "candidate.request_approvals",
      method: "POST",
      path: "/v1/candidate/approvals",
      authRequired: true,
      description: "Create approval tickets for approval-gated candidate steps.",
    },
    {
      id: "candidate.execute_approved",
      method: "POST",
      path: "/v1/candidate/execute-approved",
      authRequired: true,
      description: "Execute an approved candidate step through TrustKernel.",
    },
    {
      id: "run_continuation.contract",
      method: "GET",
      path: "/v1/runs/continuation-contract",
      authRequired: true,
      description: "Read the Run Continuation contract.",
    },
    {
      id: "runs.resume",
      method: "POST",
      path: "/v1/runs/:traceId/resume",
      authRequired: true,
      description: "Resume an approval-gated candidate step from an existing run trace.",
    },
  ],
});

export function getGatewayRouteContract() {
  return GATEWAY_ROUTE_CONTRACT;
}

export function ensureGatewayToken(store, options = {}) {
  const config = readConfig(store);
  const gateway = config.gateway ?? {};
  if (!options.rotate && gateway.localApiTokenHash) {
    return {
      created: false,
      token: null,
      tokenPrefix: gateway.localApiTokenPrefix ?? null,
    };
  }

  const token = `spruce_local_${crypto.randomBytes(32).toString("base64url")}`;
  config.gateway = {
    ...gateway,
    localApiTokenHash: hashToken(token),
    localApiTokenPrefix: token.slice(0, 18),
    localOnly: true,
    updatedAt: new Date().toISOString(),
  };
  writeJson(configPath(store), config);
  return {
    created: true,
    token,
    tokenPrefix: config.gateway.localApiTokenPrefix,
  };
}

export function getGatewayAuthStatus(store) {
  const config = readConfig(store);
  return {
    tokenConfigured: Boolean(config.gateway?.localApiTokenHash),
    tokenPrefix: config.gateway?.localApiTokenPrefix ?? null,
    localOnly: true,
  };
}

export function verifyGatewayToken(store, token) {
  const expected = readConfig(store).gateway?.localApiTokenHash;
  if (!expected || !token) return false;
  const actual = hashToken(token);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

export function createGatewayServer(store, options = {}) {
  const handler = createGatewayHandler(store, options);
  return http.createServer(handler);
}

export async function startGatewayServer(store, options = {}) {
  const host = options.host ?? DEFAULT_GATEWAY_HOST;
  const port = Number(options.port ?? DEFAULT_GATEWAY_PORT);
  if (!isLocalHost(host) && !options.allowRemote) {
    throw new Error("gateway refuses non-local host unless allowRemote is explicitly set");
  }

  const token = ensureGatewayToken(store);
  const server = createGatewayServer(store, options);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return {
    server,
    host,
    port: typeof address === "object" && address ? address.port : port,
    tokenCreated: token.created,
    token: token.token,
    tokenPrefix: token.tokenPrefix,
  };
}

export function createGatewayHandler(store, options = {}) {
  return async function gatewayHandler(request, response) {
    try {
      const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
      if (request.method === "GET" && url.pathname === "/health") {
        return sendJson(response, 200, {
          ok: true,
          service: "spruceagent-gateway",
          localOnly: true,
        });
      }

      if (request.method === "GET" && isStaticPagePath(url.pathname)) {
        return sendStaticPageAsset(response, url.pathname);
      }

      if (!verifyRequest(store, request, options)) {
        return sendJson(response, 401, {
          error: "unauthorized",
          message: "Bearer token is required for GatewayMesh Local API.",
        });
      }

      const body = await readBody(request);
      const result = await routeRequest(store, request, url, body);
      return sendJson(response, result.statusCode ?? 200, result.body);
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        error: "gateway_error",
        message: error.message,
      });
    }
  };
}

async function routeRequest(store, request, url, body) {
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts[0] !== "v1") {
    return notFound();
  }

  if (request.method === "GET" && url.pathname === "/v1/status") {
    return ok(gatewayStatus(store));
  }

  if (request.method === "GET" && url.pathname === "/v1/inbox") {
    return ok(getRunInbox(store, {
      limit: url.searchParams.get("limit") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/inbox/contract") {
    return ok(getRunInboxContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/approval-queue") {
    return ok(getApprovalQueue(store, {
      limit: url.searchParams.get("limit") ?? undefined,
      traceKind: url.searchParams.get("traceKind") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/approval-queue/contract") {
    return ok(getApprovalQueueContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/execution-tasks") return ok(listExecutionTasks(store, { status: url.searchParams.get("status") ?? undefined, owner: url.searchParams.get("owner") ?? undefined }));
  if (request.method === "GET" && url.pathname === "/v1/execution-tasks/board") return ok(getExecutionTaskBoard(store));
  if (request.method === "GET" && url.pathname === "/v1/execution-tasks/contract") return ok(getExecutionTaskContract());
  if (request.method === "GET" && pathParts[1] === "execution-tasks" && pathParts[2] && pathParts[3] === "evidence" && !pathParts[4]) return ok(getExecutionTaskEvidence(store, pathParts[2]));
  if (request.method === "GET" && pathParts[1] === "execution-tasks" && pathParts[2] && pathParts[3] === "closure" && !pathParts[4]) return ok(getExecutionTaskClosure(store, pathParts[2]));
  if (request.method === "GET" && pathParts[1] === "execution-tasks" && pathParts[2] && pathParts[3] === "lineage" && !pathParts[4]) return ok(getExecutionTaskLineage(store, pathParts[2]));
  if (request.method === "POST" && url.pathname === "/v1/execution-tasks") return ok(createExecutionTask(store, { ...body, actor: body.actor ?? "gateway-user" }));
  if (request.method === "POST" && pathParts[1] === "execution-tasks" && pathParts[2] && pathParts[3] === "follow-up" && !pathParts[4]) return ok(createExecutionTaskFollowUp(store, pathParts[2], { ...body, actor: body.actor ?? "gateway-user" }));
  if (request.method === "GET" && pathParts[1] === "execution-tasks" && pathParts[2] && !pathParts[3]) return ok(getExecutionTask(store, pathParts[2]));
  if (request.method === "POST" && pathParts[1] === "execution-tasks" && pathParts[2] && pathParts[3] === "claim" && !pathParts[4]) return ok(claimExecutionTask(store, pathParts[2], { ...body, actor: body.actor ?? "gateway-user" }));
  if (request.method === "POST" && pathParts[1] === "execution-tasks" && pathParts[2] && pathParts[3] === "handoff" && !pathParts[4]) return ok(handoffExecutionTask(store, pathParts[2], { ...body, actor: body.actor ?? "gateway-user" }));
  if (request.method === "POST" && pathParts[1] === "execution-tasks" && pathParts[2] && pathParts[3] === "resume" && !pathParts[4]) return ok(resumeExecutionTask(store, pathParts[2], { ...body, actor: body.actor ?? "gateway-user" }));
  if (request.method === "POST" && pathParts[1] === "execution-tasks" && pathParts[2] && pathParts[3] === "update" && !pathParts[4]) return ok(updateExecutionTask(store, pathParts[2], { ...body, actor: body.actor ?? "gateway-user" }));

  if (request.method === "GET" && url.pathname === "/v1/autopilots") return ok(listAutopilots(store, { enabled: url.searchParams.has("enabled") ? url.searchParams.get("enabled") === "true" : undefined }));
  if (request.method === "GET" && url.pathname === "/v1/autopilots/due") return ok(listDueAutopilots(store, { now: url.searchParams.get("now") ?? undefined }));
  if (request.method === "GET" && url.pathname === "/v1/autopilots/contract") return ok(getAutopilotContract());
  if (request.method === "POST" && url.pathname === "/v1/autopilots") return ok(createAutopilot(store, { ...body, actor: body.actor ?? "gateway-user" }));
  if (request.method === "POST" && url.pathname === "/v1/autopilots/run-due") return ok(runDueAutopilots(store, { ...body, actor: body.actor ?? "gateway-user" }));
  if (request.method === "GET" && pathParts[1] === "autopilots" && pathParts[2] && pathParts[3] === "triggers" && !pathParts[4]) return ok(listAutopilotTriggers(store, pathParts[2], { limit: url.searchParams.get("limit") ?? undefined }));
  if (request.method === "POST" && pathParts[1] === "autopilots" && pathParts[2] && pathParts[3] === "trigger" && !pathParts[4]) return ok(triggerAutopilot(store, pathParts[2], { ...body, actor: body.actor ?? "gateway-user" }));
  if (request.method === "GET" && pathParts[1] === "autopilots" && pathParts[2] && !pathParts[3]) return ok(getAutopilot(store, pathParts[2]));

  if (request.method === "GET" && url.pathname === "/v1/artifacts") {
    return ok(listArtifacts(store, {
      limit: url.searchParams.get("limit") ?? undefined,
      traceId: url.searchParams.get("traceId") ?? undefined,
      kind: url.searchParams.get("kind") ?? undefined,
      sourceKind: url.searchParams.get("sourceKind") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/artifacts/contract") {
    return ok(getArtifactContract());
  }

  if (request.method === "GET" && pathParts[1] === "artifacts" && pathParts[2]) {
    return ok(getArtifact(store, pathParts[2]));
  }

  if (request.method === "GET" && url.pathname === "/v1/reports/contract") {
    return ok(getTraceReportContract());
  }

  if (request.method === "GET" && pathParts[1] === "reports" && pathParts[2] === "traces" && pathParts[3]) {
    return ok(getTraceReport(store, pathParts[3], {
      format: url.searchParams.get("format") ?? "json",
      includeRaw: url.searchParams.get("includeRaw") === "true",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-adapters") {
    return ok(listAgentAdapters({
      kind: url.searchParams.get("kind") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-adapters/contract") {
    return ok(getAgentAdapterContract());
  }

  if (request.method === "GET" && pathParts[1] === "agent-adapters" && pathParts[2] && pathParts[3] === "readiness" && !pathParts[4]) {
    return ok(assessAgentExecutionReadiness(store, { adapterId: pathParts[2], maxChanges: url.searchParams.get("maxChanges") ?? undefined }));
  }

  if (request.method === "GET" && pathParts[1] === "agent-adapters" && pathParts[2] && !pathParts[3]) {
    return ok(getAgentAdapter(pathParts[2]));
  }

  if (request.method === "POST" && pathParts[1] === "agent-adapters" && pathParts[2] && pathParts[3] === "plan") {
    return ok(createAgentAdapterRunPlan(store, {
      ...body,
      adapterId: pathParts[2],
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-workspaces") {
    return ok(listAgentWorkspaces(store, {
      status: url.searchParams.get("status") ?? undefined,
      adapterId: url.searchParams.get("adapterId") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-workspaces/contract") {
    return ok(getAgentWorkspaceContract());
  }

  if (request.method === "GET" && pathParts[1] === "agent-workspaces" && pathParts[2]) {
    return ok(getAgentWorkspace(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/agent-workspaces") {
    return ok(prepareAgentWorkspace(store, body));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-launches") {
    return ok(listAgentLaunches(store, {
      status: url.searchParams.get("status") ?? undefined,
      workspaceId: url.searchParams.get("workspaceId") ?? undefined,
      adapterId: url.searchParams.get("adapterId") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-launches/contract") {
    return ok(getAgentLauncherContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/external-cli-launcher/contract") {
    return ok(getExternalCliLauncherContract());
  }

  if (request.method === "GET" && pathParts[1] === "agent-launches" && pathParts[2]) {
    return ok(getAgentLaunch(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/agent-launches") {
    return ok(await launchAgentWorkspace(store, {
      ...body,
      actor: body.actor ?? "gateway-user",
      channel: "gateway",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/launch-reviews") {
    return ok(listLaunchReviews(store, {
      status: url.searchParams.get("status") ?? undefined,
      launchId: url.searchParams.get("launchId") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/launch-reviews/contract") {
    return ok(getLaunchReviewContract());
  }

  if (request.method === "GET" && pathParts[1] === "launch-reviews" && pathParts[2]) {
    return ok(getLaunchReview(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/launch-reviews") {
    return ok(createLaunchReview(store, {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "POST" && pathParts[1] === "launch-reviews" && pathParts[2] && pathParts[3] === "decision") {
    return ok(decideLaunchReview(store, pathParts[2], {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/capability-probes") {
    return ok(listCapabilityProbes(store));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-trials") {
    return ok(listAgentTrials(store, {
      adapterId: url.searchParams.get("adapterId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      attested: url.searchParams.has("attested") ? url.searchParams.get("attested") === "true" : undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-trials/contract") {
    return ok(getAgentTrialContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-trials/attestation-contract") {
    return ok(getAgentTrialAttestationContract());
  }

  if (request.method === "POST" && url.pathname === "/v1/agent-trials/attest") {
    return ok(await attestAgentLaunchTrial(store, {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && pathParts[1] === "agent-trials" && pathParts[2]) {
    return ok(getAgentTrial(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/agent-trials") {
    return ok(recordAgentTrial(store, {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/capability-probes/contract") {
    return ok(getCapabilityProbeContract());
  }

  if (request.method === "GET" && pathParts[1] === "capability-probes" && pathParts[2]) {
    return ok(getCapabilityProbe(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/capability-probes") {
    return ok(probeAgentCapabilities(store, {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-routes") {
    return ok(listTaskRoutes(store, {
      status: url.searchParams.get("status") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/agent-routes/contract") {
    return ok(getTaskRouterContract());
  }

  if (request.method === "GET" && pathParts[1] === "agent-routes" && pathParts[2]) {
    return ok(getTaskRoute(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/agent-routes") {
    return ok(createTaskRoute(store, {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/fleet-runs") {
    return ok(listFleetRuns(store, {
      status: url.searchParams.get("status") ?? undefined,
      routeId: url.searchParams.get("routeId") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/fleet-runs/contract") {
    return ok(getFleetRunContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/squads") return ok(listSquads(store));
  if (request.method === "GET" && url.pathname === "/v1/squads/contract") return ok(getSquadContract());
  if (request.method === "GET" && pathParts[1] === "squads" && pathParts[2] && pathParts[3] === "readiness" && !pathParts[4]) return ok(getSquadReadiness(store, pathParts[2]));
  if (request.method === "POST" && pathParts[1] === "squads" && pathParts[2] && pathParts[3] === "members" && pathParts[4] && pathParts[5] === "workspace" && !pathParts[6]) return ok(bindSquadMemberWorkspace(store, pathParts[2], { ...body, role: pathParts[4], actor: body.actor ?? "gateway-user" }));
  if (request.method === "POST" && pathParts[1] === "squads" && pathParts[2] && pathParts[3] === "handoffs" && pathParts[4] && pathParts[5] && pathParts[6] === "review" && !pathParts[7]) return ok(bindSquadHandoffReview(store, pathParts[2], { ...body, from: pathParts[4], to: pathParts[5], actor: body.actor ?? "gateway-user" }));
  if (request.method === "POST" && pathParts[1] === "squads" && pathParts[2] && pathParts[3] === "members" && pathParts[4] && pathParts[5] === "approval-request" && !pathParts[6]) return ok(await requestSquadMemberApproval(store, pathParts[2], { ...body, role: pathParts[4], actor: body.actor ?? "gateway-user" }));
  if (request.method === "GET" && pathParts[1] === "squads" && pathParts[2] && !pathParts[3]) return ok(getSquad(store, pathParts[2]));
  if (request.method === "POST" && url.pathname === "/v1/squads") return ok(createSquad(store, { ...body, actor: body.actor ?? "gateway-user" }));

  if (request.method === "GET" && pathParts[1] === "fleet-runs" && pathParts[2] && pathParts[3] === "progress" && !pathParts[4]) {
    return ok(getFleetRunProgress(store, pathParts[2], {
      after: url.searchParams.get("after") ?? undefined,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "fleet-runs" && pathParts[2] && !pathParts[3]) {
    return ok(getFleetRun(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/fleet-runs") {
    return ok(createFleetRun(store, {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "POST" && pathParts[1] === "fleet-runs" && pathParts[2] && pathParts[3] === "approvals") {
    return ok(await requestFleetRunApprovals(store, pathParts[2], {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "POST" && pathParts[1] === "fleet-runs" && pathParts[2] && pathParts[3] === "approve") {
    return ok(approveFleetRun(store, pathParts[2], {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "POST" && pathParts[1] === "fleet-runs" && pathParts[2] && pathParts[3] === "execute") {
    return ok(await executeFleetRun(store, pathParts[2], {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "POST" && pathParts[1] === "fleet-runs" && pathParts[2] && pathParts[3] === "cancel") {
    return ok(cancelFleetRun(store, pathParts[2], {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/contract") {
    return ok(getGatewayRouteContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/llm/contract") {
    return ok(getLlmAdapterContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/llm/providers/contract") {
    return ok(getLlmProviderRegistryContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/llm/providers") {
    return ok(listLlmProviderConfigs(store));
  }

  if (request.method === "POST" && url.pathname === "/v1/llm/providers") {
    return ok(configureLlmProvider(store, {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && pathParts[1] === "llm" && pathParts[2] === "providers" && pathParts[3] && pathParts[4] === "validate") {
    return ok(validateLlmProviderConfig(store, pathParts[3]));
  }

  if (request.method === "GET" && pathParts[1] === "llm" && pathParts[2] === "providers" && pathParts[3]) {
    return ok(getLlmProviderConfig(store, pathParts[3]));
  }

  if (request.method === "DELETE" && pathParts[1] === "llm" && pathParts[2] === "providers" && pathParts[3]) {
    return ok(removeLlmProviderConfig(store, pathParts[3], { actor: body.actor ?? "gateway-user" }));
  }
  if (request.method === "GET" && url.pathname === "/v1/workflow-builder/contract") {
    return ok(getWorkflowBuilderContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/candidate/contract") {
    return ok(getCandidateExecutionContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/candidate/approval-contract") {
    return ok(getCandidateApprovalContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/runs/continuation-contract") {
    return ok(getRunContinuationContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/runs/detail-contract") {
    return ok(getRunDetailContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/tools") {
    return ok(listTools());
  }

  if (request.method === "GET" && url.pathname === "/v1/skills") {
    return ok(listSkills(store, url.searchParams.get("status") ?? "approved"));
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-evaluations/contract") {
    return ok(getSkillEvaluationContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-evaluations") {
    return ok(listSkillEvaluations(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-evaluations" && pathParts[2]) {
    return ok(getSkillEvaluation(store, pathParts[2]));
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "evaluations") {
    return ok(evaluateSkillCandidate(store, pathParts[2], {
      status: body.status,
      traceId: body.traceId,
      trustMode: body.trustMode,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skills/promotion-contract") {
    return ok(getSkillPromotionContract());
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "promote") {
    return ok(promoteSkillCandidate(store, pathParts[2], {
      evaluationId: body.evaluationId,
      minimumScore: body.minimumScore,
      useLatestEvaluation: Boolean(body.useLatestEvaluation),
      trustMode: body.trustMode,
      by: body.by ?? body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "versions" && !pathParts[4]) {
    return ok(listSkillVersions(store, pathParts[2]));
  }

  if (request.method === "GET" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "versions" && pathParts[4] && !pathParts[5]) {
    return ok(getSkillVersion(store, pathParts[2], pathParts[4]));
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "versions" && pathParts[4] && pathParts[5] === "restore") {
    return ok(restoreSkillVersion(store, pathParts[2], pathParts[4], {
      by: body.by ?? body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skills/package-contract") {
    return ok(getSkillPackageContract());
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "package-export") {
    return ok(exportSkillPackage(store, pathParts[2], {
      status: body.status,
      by: body.by ?? body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-packages") {
    return ok(listSkillPackages(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-packages" && pathParts[2] && !pathParts[3]) {
    return ok(getSkillPackage(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/skill-packages/import") {
    const pkg = body.packageId ? getSkillPackage(store, body.packageId) : body.package;
    return ok(importSkillPackage(store, pkg, {
      name: body.name,
      summary: body.summary,
      preserveSourceTraceIds: Boolean(body.preserveSourceTraceIds),
      includeSourceMetadata: body.includeSourceMetadata,
      by: body.by ?? body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-package-imports") {
    return ok(listSkillPackageImports(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-package-imports" && pathParts[2]) {
    return ok(getSkillPackageImport(store, pathParts[2]));
  }

  if (request.method === "GET" && url.pathname === "/v1/skills/replay-contract") {
    return ok(getSkillReplayContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-replay/fixtures") {
    return ok(listSkillReplayFixtures(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-replay" && pathParts[2] === "fixtures" && pathParts[3] && !pathParts[4]) {
    return ok(getSkillReplayFixture(store, pathParts[3]));
  }

  if (request.method === "POST" && pathParts[1] === "skills" && pathParts[2] && pathParts[3] === "replay-fixtures") {
    return ok(createSkillReplayFixture(store, pathParts[2], {
      status: body.status,
      evaluationId: body.evaluationId,
      name: body.name,
      description: body.description,
      minimumScore: body.minimumScore,
    }));
  }

  if (request.method === "POST" && pathParts[1] === "skill-replay" && pathParts[2] === "fixtures" && pathParts[3] && pathParts[4] === "run") {
    return ok(replaySkillFixture(store, pathParts[3], {
      status: body.status,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/skill-replay/results") {
    return ok(listSkillReplayResults(store));
  }

  if (request.method === "GET" && pathParts[1] === "skill-replay" && pathParts[2] === "results" && pathParts[3]) {
    return ok(getSkillReplayResult(store, pathParts[3]));
  }

  if (request.method === "POST" && url.pathname === "/v1/tools/run") {
    return ok(await executeTool(store, {
      toolName: body.toolName,
      input: body.input ?? {},
      trustMode: body.trustMode ?? "approve",
      approvalId: body.approvalId,
      traceId: body.traceId,
      timeoutMs: body.timeoutMs,
      requester: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/preflight") {
    return ok(runPreflight(store, {
      kind: body.kind ?? "gateway.preflight",
      requireFreshContext: Boolean(body.requireFreshContext),
      refreshContext: Boolean(body.refreshContext),
      contextMaxBytes: body.contextMaxBytes ?? body.maxBytes,
      maxChanges: body.maxChanges,
      incremental: body.incremental,
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/preflight/risk") {
    return ok(assessRunRisk(store, {
      kind: body.kind ?? "gateway.risk_preflight",
      trustMode: body.trustMode ?? "approve",
      plan: body.plan,
      workflow: body.workflow,
      steps: body.steps,
      candidatePlan: body.candidatePlan,
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/context/index") {
    const index = buildWorkspaceIndex(store, {
      maxBytes: body.maxBytes,
    });
    return ok({
      indexedAt: index.indexedAt,
      documentCount: index.documentCount,
      skippedCount: index.skippedCount,
      redactedDocumentCount: index.redactedDocumentCount,
      maxBytes: index.maxBytes,
      incremental: index.incremental,
      safety: index.safety,
    });
  }

  if (request.method === "GET" && url.pathname === "/v1/context/freshness") {
    return ok(assessWorkspaceIndexFreshness(store, {
      maxChanges: url.searchParams.get("maxChanges") ?? undefined,
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/context/search") {
    return ok(searchWorkspaceContext(store, body.query ?? "", {
      limit: body.limit,
      snippetLength: body.snippetLength,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/context/evidence-contract") {
    return ok(getContextEvidenceContract());
  }

  if (request.method === "POST" && url.pathname === "/v1/context/evidence") {
    return ok(createContextEvidencePack(store, {
      query: body.query ?? body.context,
      limit: body.limit,
      snippetLength: body.snippetLength,
      memoryLimit: body.memoryLimit,
      includeMemory: body.includeMemory !== false,
      maxChanges: body.maxChanges,
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/runs") {
    return ok(await runAgent(store, {
      goal: body.goal,
      contextQuery: body.contextQuery ?? body.context,
      trustMode: body.trustMode ?? "approve",
      dryRun: Boolean(body.dryRun),
      contextLimit: body.contextLimit ?? body.limit,
      skillId: body.skillId,
      executeSkill: Boolean(body.executeSkill),
      llmProvider: body.llmProvider,
      llmModel: body.llmModel,
      llmBaseUrl: body.llmBaseUrl,
      llmTimeoutMs: body.llmTimeoutMs,
      llmTemperature: body.llmTemperature,
      llmMaxTokens: body.llmMaxTokens,
      promotePlan: Boolean(body.promotePlan),
      plannerAllowedTools: body.plannerAllowedTools,
      requestCandidateApprovals: Boolean(body.requestCandidateApprovals),
      executeCandidatePlan: Boolean(body.executeCandidatePlan),
      candidateApprovalIds: body.candidateApprovalIds,
      requireFreshContext: Boolean(body.requireFreshContext),
      refreshContext: Boolean(body.refreshContext),
      contextMaxBytes: body.contextMaxBytes ?? body.maxBytes,
      actor: body.actor ?? "gateway-user",
      channel: "gateway",
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/workflow-builder/draft") {
    return ok(await draftWorkflow(store, {
      goal: body.goal,
      contextQuery: body.contextQuery ?? body.context,
      contextLimit: body.contextLimit ?? body.limit,
      skillId: body.skillId,
      name: body.name,
      summary: body.summary,
      includeMemoryStep: body.includeMemoryStep,
      llmProvider: body.llmProvider ?? "mock",
      llmModel: body.llmModel,
      llmBaseUrl: body.llmBaseUrl,
      llmTimeoutMs: body.llmTimeoutMs,
      llmTemperature: body.llmTemperature,
      llmMaxTokens: body.llmMaxTokens,
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/workflow-builder/save") {
    return ok(await createWorkflowFromDraft(store, {
      draft: body.draft,
      goal: body.goal,
      contextQuery: body.contextQuery ?? body.context,
      contextLimit: body.contextLimit ?? body.limit,
      skillId: body.skillId,
      name: body.name,
      summary: body.summary,
      includeMemoryStep: body.includeMemoryStep,
      llmProvider: body.llmProvider ?? "mock",
      llmModel: body.llmModel,
      llmBaseUrl: body.llmBaseUrl,
      llmTimeoutMs: body.llmTimeoutMs,
      llmTemperature: body.llmTemperature,
      llmMaxTokens: body.llmMaxTokens,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "runs" && pathParts[2] && !pathParts[3]) {
    return ok(getRunDetail(store, pathParts[2]));
  }

  if (request.method === "POST" && pathParts[1] === "runs" && pathParts[2] && pathParts[3] === "resume") {
    return ok(await resumeAgentRun(store, {
      traceId: pathParts[2],
      stepId: body.stepId,
      approvalId: body.approvalId,
      approvalIds: body.approvalIds,
      trustMode: body.trustMode ?? "approve",
      actor: body.actor ?? "gateway-user",
      timeoutMs: body.timeoutMs,
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/candidate/approvals") {
    return ok(requestCandidateApprovals(store, {
      candidatePlan: body.candidatePlan,
      traceId: body.traceId,
      trustMode: body.trustMode ?? "approve",
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/candidate/execute-approved") {
    return ok(await executeApprovedCandidateStep(store, {
      candidatePlan: body.candidatePlan,
      stepId: body.stepId,
      approvalId: body.approvalId,
      traceId: body.traceId,
      trustMode: body.trustMode ?? "approve",
      actor: body.actor ?? "gateway-user",
      timeoutMs: body.timeoutMs,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows") {
    return ok(listWorkflows(store, {
      status: url.searchParams.get("status") ?? "active",
    }));
  }

  if (request.method === "POST" && url.pathname === "/v1/workflows") {
    return ok(createWorkflow(store, {
      name: body.name,
      summary: body.summary,
      steps: body.steps ?? [],
      metadata: {
        ...(body.metadata ?? {}),
        createdFrom: body.createdFrom ?? "gateway",
      },
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows/inbox") {
    return ok(getWorkflowInbox(store, {
      limit: url.searchParams.get("limit") ?? undefined,
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows/inbox-contract") {
    return ok(getWorkflowInboxContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows/detail-contract") {
    return ok(getWorkflowDetailContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/workflows/continuation-contract") {
    return ok(getWorkflowContinuationContract());
  }

  if (request.method === "GET" && pathParts[1] === "workflows" && pathParts[2] === "runs" && pathParts[3]) {
    return ok(getWorkflowRunDetail(store, pathParts[3]));
  }

  if (request.method === "POST" && pathParts[1] === "workflows" && pathParts[2] === "runs" && pathParts[3] && pathParts[4] === "resume") {
    return ok(await resumeWorkflowRun(store, {
      traceId: pathParts[3],
      stepId: body.stepId,
      approvalId: body.approvalId,
      approvalIds: body.approvalIds,
      trustMode: body.trustMode ?? "approve",
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "PATCH" && pathParts[1] === "workflows" && pathParts[2] && !pathParts[3]) {
    return ok(updateWorkflow(store, pathParts[2], {
      name: body.name,
      summary: body.summary,
      steps: body.steps,
      status: body.status,
      metadata: body.metadata,
      updatedBy: body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "POST" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "archive") {
    return ok(archiveWorkflow(store, pathParts[2], {
      archivedBy: body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "versions" && !pathParts[4]) {
    return ok(listWorkflowVersions(store, pathParts[2]));
  }

  if (request.method === "GET" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "versions" && pathParts[4] && !pathParts[5]) {
    return ok(getWorkflowVersion(store, pathParts[2], pathParts[4]));
  }

  if (request.method === "POST" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "versions" && pathParts[4] && pathParts[5] === "restore") {
    return ok(restoreWorkflowVersion(store, pathParts[2], pathParts[4], {
      restoredBy: body.actor ?? "gateway-user",
      reason: body.reason,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "workflows" && pathParts[2]) {
    return ok(getWorkflow(store, pathParts[2]));
  }

  if (request.method === "POST" && pathParts[1] === "workflows" && pathParts[2] && pathParts[3] === "run") {
    return ok(await runWorkflow(store, pathParts[2], {
      goal: body.goal,
      trustMode: body.trustMode ?? "approve",
      dryRun: Boolean(body.dryRun),
      requireFreshContext: Boolean(body.requireFreshContext),
      refreshContext: Boolean(body.refreshContext),
      contextMaxBytes: body.contextMaxBytes ?? body.maxBytes,
      actor: body.actor ?? "gateway-user",
      channel: "gateway",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/approvals") {
    return ok(listApprovalTickets(store, url.searchParams.get("status") ?? undefined));
  }

  if (request.method === "GET" && pathParts[1] === "approvals" && pathParts[2]) {
    return ok(getApprovalTicket(store, pathParts[2]));
  }

  if (request.method === "POST" && pathParts[1] === "approvals" && pathParts[2] && pathParts[3] === "approve") {
    return ok(approveTicket(store, pathParts[2], {
      resolvedBy: body.by ?? body.actor ?? "gateway-user",
      reason: body.reason ?? "approved from gateway",
    }));
  }

  if (request.method === "POST" && pathParts[1] === "approvals" && pathParts[2] && pathParts[3] === "reject") {
    return ok(rejectTicket(store, pathParts[2], {
      resolvedBy: body.by ?? body.actor ?? "gateway-user",
      reason: body.reason ?? "rejected from gateway",
    }));
  }

  if (request.method === "GET" && url.pathname === "/v1/evaluations") {
    return ok(listEvaluations(store));
  }

  if (request.method === "GET" && pathParts[1] === "evaluations" && pathParts[2]) {
    return ok(getEvaluation(store, pathParts[2]));
  }

  if (request.method === "POST" && url.pathname === "/v1/evaluations/trace") {
    return ok(evaluateTrace(store, body.traceId));
  }

  if (request.method === "GET" && url.pathname === "/v1/outcomes/contract") {
    return ok(getOutcomeEvaluationContract());
  }

  if (request.method === "GET" && url.pathname === "/v1/outcomes/fixtures") {
    return ok(listOutcomeFixtures(store));
  }

  if (request.method === "POST" && url.pathname === "/v1/outcomes/fixtures") {
    return ok(createOutcomeFixture(store, {
      ...body,
      actor: body.actor ?? "gateway-user",
    }));
  }

  if (request.method === "GET" && pathParts[1] === "outcomes" && pathParts[2] === "fixtures" && pathParts[3] && pathParts[4] === "summary") {
    return ok(summarizeOutcomeFixture(store, pathParts[3]));
  }

  if (request.method === "POST" && pathParts[1] === "outcomes" && pathParts[2] === "fixtures" && pathParts[3] && pathParts[4] === "evaluate") {
    return ok(evaluateOutcomeFixture(store, pathParts[3], {
      traceId: body.traceId,
      fleetRunId: body.fleetRunId,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "outcomes" && pathParts[2] === "fixtures" && pathParts[3] && !pathParts[4]) {
    return ok(getOutcomeFixture(store, pathParts[3]));
  }

  if (request.method === "GET" && url.pathname === "/v1/outcomes/results") {
    return ok(listOutcomeEvaluationResults(store, {
      fixtureId: url.searchParams.get("fixtureId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    }));
  }

  if (request.method === "GET" && pathParts[1] === "outcomes" && pathParts[2] === "results" && pathParts[3] && !pathParts[4]) {
    return ok(getOutcomeEvaluationResult(store, pathParts[3]));
  }

  return notFound();
}

function gatewayStatus(store) {
  const index = readWorkspaceIndex(store);
  const executionTaskBoard = getExecutionTaskBoard(store);
  const autopilots = listAutopilots(store);
  const dueAutopilots = listDueAutopilots(store);
  return {
    root: store.root,
    auth: getGatewayAuthStatus(store),
    memoryCount: listMemory(store).length,
    traceCount: listTraces(store).length,
    pendingApprovalCount: listApprovalTickets(store, "pending").length,
    indexedDocumentCount: index?.documentCount ?? 0,
    indexedAt: index?.indexedAt ?? null,
    candidateSkillCount: listSkills(store, "candidates").length,
    approvedSkillCount: listSkills(store, "approved").length,
    workflowCount: listWorkflows(store).length,
    agentAdapterCount: listAgentAdapters().summary.total,
    agentWorkspaceCount: listAgentWorkspaces(store).summary.total,
    agentLaunchCount: listAgentLaunches(store).summary.total,
    launchReviewCount: listLaunchReviews(store).summary.total,
    capabilityProbeCount: listCapabilityProbes(store).summary.total,
    agentTrialCount: listAgentTrials(store).summary.total,
    taskRouteCount: listTaskRoutes(store).summary.total,
    executionTaskCount: listExecutionTasks(store).summary.total,
    executionTaskEvidenceIssueCount: executionTaskBoard.evidenceAttention.length,
    executionTaskClosureDiagnosticCount: executionTaskBoard.closureAttention.length,
    autopilotCount: autopilots.items.length,
    autopilotDueCount: dueAutopilots.items.length,
    fleetRunCount: listFleetRuns(store).summary.total,
    artifactCount: listArtifacts(store).summary.total,
    evaluationCount: listEvaluations(store).length,
    outcomeFixtureCount: listOutcomeFixtures(store).summary.total,
    outcomeResultCount: listOutcomeEvaluationResults(store).summary.total,
    skillEvaluationCount: listSkillEvaluations(store).length,
    skillReplayFixtureCount: listSkillReplayFixtures(store).length,
    skillReplayResultCount: listSkillReplayResults(store).length,
    skillPackageCount: listSkillPackages(store).length,
    skillPackageImportCount: listSkillPackageImports(store).length,
  };
}

function verifyRequest(store, request, options) {
  if (options.disableAuth) return true;
  const header = request.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
  return verifyGatewayToken(store, token);
}

async function readBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return {};
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      const error = new Error("request body too large");
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(`${JSON.stringify(body, null, 2)}\n`);
}

function sendStaticPageAsset(response, pathname) {
  const filePath = resolveStaticPageAsset(pathname);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(response, 404, {
      error: "not_found",
      message: "Static asset not found.",
    });
  }
  response.writeHead(200, {
    "content-type": contentTypeFor(filePath),
    "cache-control": "no-store",
  });
  response.end(fs.readFileSync(filePath));
}

function ok(body) {
  return { statusCode: 200, body };
}

function notFound() {
  return {
    statusCode: 404,
    body: {
      error: "not_found",
      message: "Gateway route not found.",
    },
  };
}

function isStaticPagePath(pathname) {
  return isWorkbenchPath(pathname) || isShowcasePath(pathname);
}

function isWorkbenchPath(pathname) {
  return pathname === "/workbench" || pathname.startsWith("/workbench/");
}

function isShowcasePath(pathname) {
  return pathname === "/" || pathname === "/showcase" || pathname.startsWith("/showcase/");
}

function resolveStaticPageAsset(pathname) {
  if (isWorkbenchPath(pathname)) return resolveAsset(WORKBENCH_ROOT, pathname, "/workbench");
  if (isShowcasePath(pathname)) return resolveAsset(SHOWCASE_ROOT, pathname, "/showcase");
  return null;
}

function resolveAsset(root, pathname, mountPath) {
  const relativePath = pathname === "/" || pathname === mountPath
    ? "index.html"
    : pathname.replace(new RegExp(`^${mountPath}/?`), "");
  const resolved = path.resolve(root, relativePath);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolved;
}

function contentTypeFor(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

function isLocalHost(host) {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function readConfig(store) {
  return readJson(configPath(store));
}

function configPath(store) {
  return path.join(store.root, "config.json");
}
