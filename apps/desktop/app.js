const state = {
  gatewayUrl: localStorage.getItem("spruce.gatewayUrl") || window.location.origin,
  token: localStorage.getItem("spruce.gatewayToken") || "",
  status: null,
  contextFreshness: null,
  contextEvidence: null,
  inbox: null,
  skills: [],
  candidateSkills: [],
  skillEvaluations: [],
  skillEvaluationDetail: null,
  agentAdapters: null,
  agentPlan: null,
  agentWorkspaces: null,
  agentWorkspaceDetail: null,
  agentLaunches: null,
  agentLaunchDetail: null,
  agentLaunchReadiness: null,
  launchReviews: null,
  launchReviewDetail: null,
  capabilityProbes: null,
  capabilityProbeDetail: null,
  taskRoutes: null,
  taskRouteDetail: null,
  fleetRuns: null,
  fleetRunDetail: null,
  fleetRunProgress: null,
  squads: null,
  squadDetail: null,
  squadReadiness: null,
  squadExecutionReadiness: {},
  executionTasks: null,
  executionTaskDetail: null,
  workflows: [],
  workflowVersions: null,
  workflowDraft: null,
  workflowInbox: null,
  approvalQueue: null,
  artifacts: null,
  artifactDetail: null,
  detail: null,
  busy: false,
};

const nodes = {
  form: document.querySelector("#connection-form"),
  runForm: document.querySelector("#run-form"),
  contextEvidenceForm: document.querySelector("#context-evidence-form"),
  workflowForm: document.querySelector("#workflow-form"),
  workflowBuilderForm: document.querySelector("#workflow-builder-form"),
  gatewayUrl: document.querySelector("#gateway-url"),
  token: document.querySelector("#gateway-token"),
  runGoal: document.querySelector("#run-goal"),
  runContext: document.querySelector("#run-context"),
  runTrust: document.querySelector("#run-trust"),
  runLlm: document.querySelector("#run-llm"),
  runModel: document.querySelector("#run-model"),
  runDryRun: document.querySelector("#run-dry-run"),
  runPromote: document.querySelector("#run-promote"),
  runRequestApprovals: document.querySelector("#run-request-approvals"),
  runExecuteCandidate: document.querySelector("#run-execute-candidate"),
  runSubmit: document.querySelector("#run-submit"),
  contextEvidenceQuery: document.querySelector("#context-evidence-query"),
  contextEvidenceLimit: document.querySelector("#context-evidence-limit"),
  contextEvidenceMemoryLimit: document.querySelector("#context-evidence-memory-limit"),
  contextEvidenceSubmit: document.querySelector("#context-evidence-submit"),
  workflowName: document.querySelector("#workflow-name"),
  workflowSummary: document.querySelector("#workflow-summary"),
  workflowSkill: document.querySelector("#workflow-skill"),
  workflowContext: document.querySelector("#workflow-context"),
  workflowMemory: document.querySelector("#workflow-memory"),
  workflowTags: document.querySelector("#workflow-tags"),
  workflowStepsJson: document.querySelector("#workflow-steps-json"),
  workflowSubmit: document.querySelector("#workflow-submit"),
  workflowBuilderGoal: document.querySelector("#workflow-builder-goal"),
  workflowBuilderContext: document.querySelector("#workflow-builder-context"),
  workflowBuilderSkill: document.querySelector("#workflow-builder-skill"),
  workflowBuilderLlm: document.querySelector("#workflow-builder-llm"),
  workflowBuilderModel: document.querySelector("#workflow-builder-model"),
  workflowBuilderName: document.querySelector("#workflow-builder-name"),
  workflowBuilderSubmit: document.querySelector("#workflow-builder-submit"),
  workflowBuilderSave: document.querySelector("#workflow-builder-save"),
  workflowDraftAddContext: document.querySelector("#workflow-draft-add-context"),
  workflowDraftAddSkill: document.querySelector("#workflow-draft-add-skill"),
  workflowDraftAddMemory: document.querySelector("#workflow-draft-add-memory"),
  workflowDraftList: document.querySelector("#workflow-draft-list"),
  workflowSourceMap: document.querySelector("#workflow-source-map"),
  workflowBuilderPreview: document.querySelector("#workflow-builder-preview"),
  refreshButton: document.querySelector("#refresh-button"),
  statusLine: document.querySelector("#status-line"),
  systemState: document.querySelector("#system-state"),
  systemOverview: document.querySelector("#system-overview"),
  launchState: document.querySelector("#launch-state"),
  contextEvidenceState: document.querySelector("#context-evidence-state"),
  workflowEditorState: document.querySelector("#workflow-editor-state"),
  workflowBuilderState: document.querySelector("#workflow-builder-state"),
  skillState: document.querySelector("#skill-state"),
  workflowState: document.querySelector("#workflow-state"),
  workflowVersionState: document.querySelector("#workflow-version-state"),
  workflowRunState: document.querySelector("#workflow-run-state"),
  pendingCount: document.querySelector("#pending-count"),
  decisionCount: document.querySelector("#decision-count"),
  resumableCount: document.querySelector("#resumable-count"),
  recentCount: document.querySelector("#recent-count"),
  artifactCount: document.querySelector("#artifact-count"),
  agentAdapterCount: document.querySelector("#agent-adapter-count"),
  agentWorkspaceCount: document.querySelector("#agent-workspace-count"),
  agentLaunchCount: document.querySelector("#agent-launch-count"),
  launchReviewCount: document.querySelector("#launch-review-count"),
  taskRouteCount: document.querySelector("#task-route-count"),
  fleetRunCount: document.querySelector("#fleet-run-count"),
  executionTaskCount: document.querySelector("#execution-task-count"),
  decisionQueueState: document.querySelector("#decision-queue-state"),
  approvalState: document.querySelector("#approval-state"),
  resumeState: document.querySelector("#resume-state"),
  recentState: document.querySelector("#recent-state"),
  artifactState: document.querySelector("#artifact-state"),
  agentAdapterState: document.querySelector("#agent-adapter-state"),
  agentWorkspaceState: document.querySelector("#agent-workspace-state"),
  agentLaunchState: document.querySelector("#agent-launch-state"),
  launchReviewState: document.querySelector("#launch-review-state"),
  taskRouteState: document.querySelector("#task-route-state"),
  decisionQueueList: document.querySelector("#decision-queue-list"),
  pendingList: document.querySelector("#pending-list"),
  skillList: document.querySelector("#skill-list"),
  candidateSkillState: document.querySelector("#candidate-skill-state"),
  candidateSkillList: document.querySelector("#candidate-skill-list"),
  skillEvaluationState: document.querySelector("#skill-evaluation-state"),
  skillEvaluationList: document.querySelector("#skill-evaluation-list"),
  skillEvaluationPanel: document.querySelector("#skill-evaluation-panel"),
  agentAdapterList: document.querySelector("#agent-adapter-list"),
  agentPlanPanel: document.querySelector("#agent-plan-panel"),
  agentWorkspaceList: document.querySelector("#agent-workspace-list"),
  agentWorkspacePanel: document.querySelector("#agent-workspace-panel"),
  agentLaunchList: document.querySelector("#agent-launch-list"),
  agentLaunchPanel: document.querySelector("#agent-launch-panel"),
  launchReviewList: document.querySelector("#launch-review-list"),
  launchReviewPanel: document.querySelector("#launch-review-panel"),
  capabilityProbeButton: document.querySelector("#capability-probe-button"),
  taskRouteButton: document.querySelector("#task-route-button"),
  capabilityProbePanel: document.querySelector("#capability-probe-panel"),
  taskRouteList: document.querySelector("#task-route-list"),
  taskRoutePanel: document.querySelector("#task-route-panel"),
  contextEvidenceList: document.querySelector("#context-evidence-list"),
  contextEvidencePanel: document.querySelector("#context-evidence-panel"),
  fleetRunState: document.querySelector("#fleet-run-state"),
  fleetRunList: document.querySelector("#fleet-run-list"),
  fleetLivePanel: document.querySelector("#fleet-live-panel"),
  fleetRunPanel: document.querySelector("#fleet-run-panel"),
  squadState: document.querySelector("#squad-state"),
  squadList: document.querySelector("#squad-list"),
  squadPanel: document.querySelector("#squad-panel"),
  squadReadinessPanel: document.querySelector("#squad-readiness-panel"),
  executionTaskState: document.querySelector("#execution-task-state"),
  executionTaskCreateButton: document.querySelector("#execution-task-create-button"),
  executionTaskList: document.querySelector("#execution-task-list"),
  executionTaskPanel: document.querySelector("#execution-task-panel"),
  workflowList: document.querySelector("#workflow-list"),
  workflowVersionList: document.querySelector("#workflow-version-list"),
  workflowRunList: document.querySelector("#workflow-run-list"),
  resumableList: document.querySelector("#resumable-list"),
  recentList: document.querySelector("#recent-list"),
  artifactList: document.querySelector("#artifact-list"),
  artifactPanel: document.querySelector("#artifact-panel"),
  detailState: document.querySelector("#detail-state"),
  detailPanel: document.querySelector("#detail-panel"),
  emptyTemplate: document.querySelector("#empty-template"),
};

nodes.gatewayUrl.value = state.gatewayUrl;
nodes.token.value = state.token;

nodes.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  state.gatewayUrl = nodes.gatewayUrl.value.trim().replace(/\/+$/, "") || window.location.origin;
  state.token = nodes.token.value.trim();
  localStorage.setItem("spruce.gatewayUrl", state.gatewayUrl);
  localStorage.setItem("spruce.gatewayToken", state.token);
  await refresh();
});

nodes.refreshButton.addEventListener("click", refresh);

nodes.runForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await submitRun();
});

nodes.contextEvidenceForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await searchContextEvidenceFromWorkbench();
});

nodes.workflowForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await createWorkflowFromWorkbench();
});

nodes.workflowBuilderForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await draftWorkflowFromWorkbench();
});

nodes.workflowBuilderSave.addEventListener("click", async () => {
  await saveWorkflowDraftFromWorkbench();
});

nodes.workflowDraftAddContext.addEventListener("click", () => addWorkflowDraftStep("context"));
nodes.workflowDraftAddSkill.addEventListener("click", () => addWorkflowDraftStep("skill"));
nodes.workflowDraftAddMemory.addEventListener("click", () => addWorkflowDraftStep("memory"));

nodes.workflowDraftList.addEventListener("input", (event) => {
  const target = event.target.closest("[data-draft-field]");
  if (!target) return;
  updateWorkflowDraftStepField(Number(target.dataset.stepIndex), target.dataset.draftField, target.value);
});

nodes.workflowDraftList.addEventListener("change", (event) => {
  const target = event.target.closest("[data-draft-field]");
  if (!target) return;
  updateWorkflowDraftStepField(Number(target.dataset.stepIndex), target.dataset.draftField, target.value, { rerender: true });
});

nodes.workflowDraftList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-draft-action]");
  if (!button) return;
  const index = Number(button.dataset.stepIndex);
  if (button.dataset.draftAction === "remove") removeWorkflowDraftStep(index);
  if (button.dataset.draftAction === "up") moveWorkflowDraftStep(index, -1);
  if (button.dataset.draftAction === "down") moveWorkflowDraftStep(index, 1);
});

nodes.skillList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "skill-plan") {
    await runSkill(button.dataset.skillId, { execute: false });
  }
  if (button.dataset.action === "skill-execute") {
    await runSkill(button.dataset.skillId, { execute: true });
  }
  if (button.dataset.action === "skill-evaluate") {
    await evaluateSkillFromWorkbench(button.dataset.skillId);
  }
  if (button.dataset.action === "skill-promote") {
    await promoteSkillFromWorkbench(button.dataset.skillId);
  }
  if (button.dataset.action === "skill-evaluation-view") {
    await loadSkillEvaluation(button.dataset.evaluationId);
  }
});

nodes.agentAdapterList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "agent-plan") {
    await planAgentAdapterRunFromWorkbench(button.dataset.adapterId);
  }
  if (button.dataset.action === "agent-prepare") {
    await prepareAgentWorkspaceFromWorkbench(button.dataset.adapterId);
  }
});

nodes.agentWorkspaceList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "agent-workspace-view") {
    await loadAgentWorkspace(button.dataset.workspaceId);
  }
  if (button.dataset.action === "agent-launch-preview") {
    await previewAgentLaunch(button.dataset.workspaceId);
  }
});

nodes.agentLaunchList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "agent-launch-view") await loadAgentLaunch(button.dataset.launchId);
  if (button.dataset.action === "launch-review-create") await createLaunchReviewFromWorkbench(button.dataset.launchId);
  if (button.dataset.action === "agent-trial-attest") await attestAgentLaunchFromWorkbench(button.dataset.launchId);
});

nodes.launchReviewList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='launch-review-view']");
  if (!button) return;
  await loadLaunchReview(button.dataset.reviewId);
});

nodes.capabilityProbeButton.addEventListener("click", probeCapabilitiesFromWorkbench);
nodes.taskRouteButton.addEventListener("click", routeTaskFromWorkbench);
nodes.taskRouteList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='task-route-view']");
  if (!button) return;
  await loadTaskRoute(button.dataset.routeId);
});

nodes.fleetRunList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "fleet-run-view") await loadFleetRun(button.dataset.fleetRunId);
  if (button.dataset.action === "execution-task-reference-view") await loadExecutionTaskReference(button.dataset.taskId);
});

nodes.squadList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "squad-view") await loadSquad(button.dataset.squadId);
  if (button.dataset.action === "execution-task-reference-view") await loadExecutionTaskReference(button.dataset.taskId);
});

nodes.squadReadinessPanel.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || state.busy || !state.squadDetail) return;
  try {
    if (button.dataset.action === "squad-bind-workspace") {
      const workspaceId = window.prompt(`Bind a prepared ${button.dataset.adapterId} workspace ID for ${button.dataset.role}:`);
      if (!workspaceId?.trim()) return;
      state.busy = true;
      await post(`/v1/squads/${encodeURIComponent(state.squadDetail.id)}/members/${encodeURIComponent(button.dataset.role)}/workspace`, { workspaceId: workspaceId.trim() });
      await loadSquad(state.squadDetail.id);
    }
    if (button.dataset.action === "squad-accept-handoff") {
      const reviewId = window.prompt(`Enter the approved Launch Review ID for ${button.dataset.from} → ${button.dataset.to}:`);
      if (!reviewId?.trim()) return;
      state.busy = true;
      await post(`/v1/squads/${encodeURIComponent(state.squadDetail.id)}/handoffs/${encodeURIComponent(button.dataset.from)}/${encodeURIComponent(button.dataset.to)}/review`, { reviewId: reviewId.trim() });
      await loadSquad(state.squadDetail.id);
    }
    if (button.dataset.action === "squad-request-approval") {
      const member = state.squadReadiness?.members.find((item) => item.role === button.dataset.role);
      const command = member?.adapterId === "local-shell-agent"
        ? window.prompt("Enter the local-shell command to approve. It will be bound exactly to this approval request:")
        : undefined;
      if (member?.adapterId === "local-shell-agent" && !command?.trim()) return;
      state.busy = true;
      const result = await post(`/v1/squads/${encodeURIComponent(state.squadDetail.id)}/members/${encodeURIComponent(button.dataset.role)}/approval-request`, {
        purpose: button.dataset.purpose ?? "execution",
        ...(command ? { command: command.trim() } : {}),
      });
      await loadSquad(state.squadDetail.id);
      setStatus(`${result.reused ? "Existing" : "Created"} ${button.dataset.purpose ?? "execution"} approval request - ${shortId(result.launch.approval.id)}`);
    }
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
});

nodes.executionTaskCreateButton.addEventListener("click", createExecutionTaskFromWorkbench);
nodes.executionTaskList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  await handleExecutionTaskAction(button);
});

nodes.workflowList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "workflow-dry-run") {
    await runWorkflowFromWorkbench(button.dataset.workflowId, { dryRun: true });
  }
  if (button.dataset.action === "workflow-run") {
    await runWorkflowFromWorkbench(button.dataset.workflowId, { dryRun: false });
  }
  if (button.dataset.action === "workflow-versions") {
    await loadWorkflowVersions(button.dataset.workflowId);
  }
  if (button.dataset.action === "workflow-archive") {
    await archiveWorkflowFromWorkbench(button.dataset.workflowId);
  }
});

nodes.workflowVersionList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "workflow-restore") {
    await restoreWorkflowVersionFromWorkbench(button.dataset.workflowId, button.dataset.revision);
  }
});

nodes.workflowRunList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "workflow-details") {
    await loadWorkflowDetail(button.dataset.traceId);
  }
  if (button.dataset.action === "workflow-resume") {
    await resumeWorkflowRunFromWorkbench(button.dataset.traceId);
  }
});

nodes.decisionQueueList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-queue-action]");
  if (button) {
    await handleDecisionQueueAction(button);
    return;
  }
  const detail = event.target.closest("[data-action='decision-details']");
  if (!detail) return;
  if (detail.dataset.traceKind === "workflow.run") {
    await loadWorkflowDetail(detail.dataset.traceId);
  } else {
    await loadDetail(detail.dataset.traceId);
  }
});

nodes.pendingList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const approvalId = button.dataset.approvalId;
  if (!approvalId) return;
  if (button.dataset.action === "approve") {
    await post(`/v1/approvals/${encodeURIComponent(approvalId)}/approve`, {
      reason: "approved from workbench",
    });
    await refreshAfterRunControlAction();
  }
  if (button.dataset.action === "reject") {
    await post(`/v1/approvals/${encodeURIComponent(approvalId)}/reject`, {
      reason: "rejected from workbench",
    });
    await refreshAfterRunControlAction();
  }
});

nodes.resumableList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='resume']");
  if (!button) return;
  await post(`/v1/runs/${encodeURIComponent(button.dataset.traceId)}/resume`, {
    stepId: button.dataset.stepId || undefined,
    approvalId: button.dataset.approvalId || undefined,
  });
  await refreshAfterRunControlAction();
});

nodes.artifactList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  if (button.dataset.action === "artifact-view") {
    await loadArtifact(button.dataset.artifactId);
  }
  if (button.dataset.action === "artifact-run-detail") {
    if (button.dataset.sourceKind === "workflow.run") {
      await loadWorkflowDetail(button.dataset.traceId);
    } else {
      await loadDetail(button.dataset.traceId);
    }
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='details']");
  if (!button) return;
  await loadDetail(button.dataset.traceId);
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='report']");
  if (!button) return;
  await loadTraceReport(button.dataset.traceId);
});

render();
if (state.token) {
  refresh();
}

async function refresh() {
  if (state.busy) return;
  state.busy = true;
  setStatus("Loading");
  try {
    const [status, contextFreshness, inbox, skills, candidateSkills, skillEvaluations, workflows, workflowInbox, approvalQueue, artifacts, agentAdapters, agentWorkspaces, agentLaunches, launchReviews, capabilityProbes, taskRoutes, fleetRuns, squads, executionTasks] = await Promise.all([
      get("/v1/status"),
      get("/v1/context/freshness"),
      get("/v1/inbox"),
      get("/v1/skills?status=approved"),
      get("/v1/skills?status=candidates"),
      get("/v1/skill-evaluations"),
      get("/v1/workflows"),
      get("/v1/workflows/inbox"),
      get("/v1/approval-queue"),
      get("/v1/artifacts?limit=20"),
      get("/v1/agent-adapters"),
      get("/v1/agent-workspaces"),
      get("/v1/agent-launches"),
      get("/v1/launch-reviews"),
      get("/v1/capability-probes"),
      get("/v1/agent-routes"),
      get("/v1/fleet-runs"),
      get("/v1/squads"),
      get("/v1/execution-tasks/board"),
    ]);
    state.status = status;
    state.contextFreshness = contextFreshness;
    state.inbox = inbox;
    state.skills = skills;
    state.candidateSkills = candidateSkills;
    state.skillEvaluations = skillEvaluations;
    state.workflows = workflows;
    state.workflowInbox = workflowInbox;
    state.approvalQueue = approvalQueue;
    state.artifacts = artifacts;
    state.agentAdapters = agentAdapters;
    state.agentWorkspaces = agentWorkspaces;
    state.agentLaunches = agentLaunches;
    state.launchReviews = launchReviews;
    state.capabilityProbes = capabilityProbes;
    state.taskRoutes = taskRoutes;
    state.fleetRuns = fleetRuns;
    state.squads = squads;
    state.executionTasks = executionTasks;
    render();
    setStatus(`Connected - ${state.approvalQueue.status.replace(/_/g, " ")}`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function get(path) {
  return request("GET", path);
}

async function post(path, body) {
  return request("POST", path, body);
}

async function handleDecisionQueueAction(button) {
  if (state.busy) return;
  const action = {
    id: button.dataset.queueAction,
    method: button.dataset.method || "POST",
    path: button.dataset.path,
    body: button.dataset.body ? JSON.parse(button.dataset.body) : {},
  };
  if (!action.path || action.method !== "POST") return;
  state.busy = true;
  setStatus(`${titleCase(action.id)} requested`);
  try {
    const body = decisionActionBody(action);
    await post(action.path, body);
    await refreshAfterRunControlAction();
    if (action.path === "/v1/agent-trials/attest" && body.launchId) {
      await refreshAgentLaunchDetailAndReadiness(body.launchId);
      setStatus(`Independent acceptance complete; execution gate: ${readinessSummary(state.agentLaunchReadiness)}`);
    } else {
      setStatus(`${titleCase(action.id)} complete`);
    }
    if (button.dataset.traceKind === "workflow.run") {
      await loadWorkflowDetail(button.dataset.traceId, { scroll: false });
    } else if (button.dataset.traceId) {
      await loadDetail(button.dataset.traceId, { scroll: false });
    }
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function refreshAfterRunControlAction() {
  const [status, inbox, workflowInbox, approvalQueue, artifacts, fleetRuns, agentLaunches] = await Promise.all([
    get("/v1/status"),
    get("/v1/inbox"),
    get("/v1/workflows/inbox"),
    get("/v1/approval-queue"),
    get("/v1/artifacts?limit=20"),
    get("/v1/fleet-runs"),
    get("/v1/agent-launches"),
  ]);
  state.status = status;
  state.inbox = inbox;
  state.workflowInbox = workflowInbox;
  state.approvalQueue = approvalQueue;
  state.artifacts = artifacts;
  state.fleetRuns = fleetRuns;
  state.agentLaunches = agentLaunches;
  render();
}

async function createExecutionTaskFromWorkbench() {
  if (state.busy) return;
  const goal = window.prompt("Describe the bounded goal for this durable task:");
  if (!goal?.trim()) return;
  const nextAction = window.prompt("What is the next non-authorizing action? (optional)");
  try {
    state.busy = true;
    const task = await post("/v1/execution-tasks", {
      goal: goal.trim(),
      nextAction: nextAction?.trim() || undefined,
      actor: "workbench-user",
    });
    await loadExecutionTasks();
    state.executionTaskDetail = task;
    render();
    setStatus(`Task created - ${shortId(task.id)}`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function handleExecutionTaskAction(button) {
  if (state.busy) return;
  const taskId = button.dataset.taskId;
  if (!taskId) return;
  try {
    state.busy = true;
    let task;
    if (button.dataset.action === "execution-task-view") {
      task = await get(`/v1/execution-tasks/${encodeURIComponent(taskId)}`);
      state.executionTaskDetail = task;
      render();
      return;
    }
    if (button.dataset.action === "execution-task-evidence") {
      task = await get(`/v1/execution-tasks/${encodeURIComponent(taskId)}/evidence`);
      state.executionTaskDetail = task;
      render();
      return;
    }
    if (button.dataset.action === "execution-task-closure") {
      task = await get(`/v1/execution-tasks/${encodeURIComponent(taskId)}/closure`);
      state.executionTaskDetail = task;
      render();
      return;
    }
    if (button.dataset.action === "execution-task-lineage") {
      task = await get(`/v1/execution-tasks/${encodeURIComponent(taskId)}/lineage`);
      state.executionTaskDetail = task;
      render();
      return;
    }
    const currentTask = await get(`/v1/execution-tasks/${encodeURIComponent(taskId)}`);
    if (button.dataset.action === "execution-task-links") {
      const links = window.prompt("Set comma-separated local links (for example agent_trial:<id>). Leave blank to clear all links:", (currentTask.links || []).join(", "));
      if (links === null) return;
      task = await post(`/v1/execution-tasks/${encodeURIComponent(taskId)}/update`, {
        links: links.split(",").map((item) => item.trim()).filter(Boolean),
        ifUpdatedAt: currentTask.updatedAt,
        note: "links updated from workbench",
        actor: "workbench-user",
      });
    }
    if (button.dataset.action === "execution-task-follow-up") {
      const goal = window.prompt("Describe the bounded follow-up goal. The original terminal task will remain unchanged:");
      if (!goal?.trim()) return;
      const nextAction = window.prompt("What is the next action for this follow-up? (optional)");
      task = await post(`/v1/execution-tasks/${encodeURIComponent(taskId)}/follow-up`, {
        goal: goal.trim(),
        nextAction: nextAction?.trim() || undefined,
        ifUpdatedAt: currentTask.updatedAt,
        actor: "workbench-user",
      });
    }
    if (button.dataset.action === "execution-task-claim") {
      task = await post(`/v1/execution-tasks/${encodeURIComponent(taskId)}/claim`, {
        owner: "workbench-user",
        ifUpdatedAt: currentTask.updatedAt,
        actor: "workbench-user",
      });
    }
    if (button.dataset.action === "execution-task-handoff") {
      if (!currentTask.owner) throw new Error("Only a claimed task can be handed off");
      const owner = window.prompt(`Hand off from ${currentTask.owner} to:`);
      if (!owner?.trim()) return;
      const handoffSummary = window.prompt("Record the bounded handoff context for the audit ledger:");
      if (!handoffSummary?.trim()) return;
      const nextAction = window.prompt("State the next non-authorizing action for the new owner:", currentTask.nextAction || "");
      if (!nextAction?.trim()) return;
      task = await post(`/v1/execution-tasks/${encodeURIComponent(taskId)}/handoff`, {
        fromOwner: currentTask.owner,
        owner: owner.trim(),
        handoffSummary: handoffSummary.trim(),
        nextAction: nextAction.trim(),
        ifUpdatedAt: currentTask.updatedAt,
        actor: "workbench-user",
      });
    }
    if (button.dataset.action === "execution-task-wait") {
      const humanGate = window.prompt("State the concrete decision required from a human:");
      if (!humanGate?.trim()) return;
      task = await post(`/v1/execution-tasks/${encodeURIComponent(taskId)}/update`, {
        status: "waiting_for_human",
        humanGate: humanGate.trim(),
        ifUpdatedAt: currentTask.updatedAt,
        actor: "workbench-user",
      });
    }
    if (button.dataset.action === "execution-task-block") {
      const blocker = window.prompt("State the concrete blocker that prevents the next action:");
      if (!blocker?.trim()) return;
      task = await post(`/v1/execution-tasks/${encodeURIComponent(taskId)}/update`, {
        status: "blocked",
        blocker: blocker.trim(),
        ifUpdatedAt: currentTask.updatedAt,
        actor: "workbench-user",
      });
    }
    if (button.dataset.action === "execution-task-resume") {
      const resumptionSummary = window.prompt("Record why this task can resume:");
      if (!resumptionSummary?.trim()) return;
      const nextAction = window.prompt("State the next non-authorizing action:");
      if (!nextAction?.trim()) return;
      task = await post(`/v1/execution-tasks/${encodeURIComponent(taskId)}/resume`, {
        resumptionSummary: resumptionSummary.trim(),
        nextAction: nextAction.trim(),
        ifUpdatedAt: currentTask.updatedAt,
        actor: "workbench-user",
      });
    }
    if (button.dataset.action === "execution-task-complete") {
      if (!window.confirm("Mark this control task completed? This does not approve or execute anything.")) return;
      const completionSummary = window.prompt("Record the completed outcome or verification basis for the audit ledger:");
      if (!completionSummary?.trim()) return;
      task = await post(`/v1/execution-tasks/${encodeURIComponent(taskId)}/update`, {
        status: "completed",
        completionSummary: completionSummary.trim(),
        ifUpdatedAt: currentTask.updatedAt,
        actor: "workbench-user",
      });
    }
    if (button.dataset.action === "execution-task-cancel") {
      if (!window.confirm("Cancel this control task? This does not stop an agent or revoke an approval; use the relevant execution control for that.")) return;
      const cancellationSummary = window.prompt("Record why this task is being cancelled for the audit ledger:");
      if (!cancellationSummary?.trim()) return;
      task = await post(`/v1/execution-tasks/${encodeURIComponent(taskId)}/update`, {
        status: "cancelled",
        cancellationSummary: cancellationSummary.trim(),
        ifUpdatedAt: currentTask.updatedAt,
        actor: "workbench-user",
      });
    }
    if (!task) return;
    await loadExecutionTasks();
    state.executionTaskDetail = task;
    render();
    setStatus(`Task ${task.status.replace(/_/g, " ")} - ${shortId(task.id)}`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function loadExecutionTasks() {
  state.executionTasks = await get("/v1/execution-tasks/board");
}

async function loadExecutionTaskReference(taskId) {
  if (!taskId || state.busy) return;
  setStatus("Loading linked execution task");
  try {
    state.executionTaskDetail = await get(`/v1/execution-tasks/${encodeURIComponent(taskId)}`);
    renderExecutionTaskPanel(state.executionTaskDetail);
    setStatus(`Loaded execution task - ${shortId(taskId)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function decisionActionBody(action) {
  if (action.id === "approve") {
    return { reason: "approved from workbench decision queue" };
  }
  if (action.id === "reject") {
    return { reason: "rejected from workbench decision queue" };
  }
  return pruneEmpty({
    ...(action.body ?? {}),
    trustMode: nodes.runTrust.value,
    actor: "workbench-user",
  });
}

async function draftWorkflowFromWorkbench() {
  if (state.busy) return;
  const input = buildWorkflowBuilderInput();
  if (!input.goal) {
    nodes.workflowBuilderState.textContent = "Goal required";
    setStatus("Workflow builder goal required", true);
    return;
  }
  state.busy = true;
  nodes.workflowBuilderSubmit.disabled = true;
  nodes.workflowBuilderSave.disabled = true;
  nodes.workflowBuilderState.textContent = "Drafting";
  setStatus("Drafting workflow");
  try {
    const draft = await post("/v1/workflow-builder/draft", input);
    state.workflowDraft = draft;
    renderWorkflowDraft(draft);
    nodes.workflowBuilderSave.disabled = false;
    nodes.workflowBuilderState.textContent = draft.status;
    setStatus(`Workflow draft ready - ${draft.workflow.name}`);
  } catch (error) {
    nodes.workflowBuilderState.textContent = "Failed";
    setStatus(error.message, true);
  } finally {
    state.busy = false;
    nodes.workflowBuilderSubmit.disabled = false;
  }
}

async function saveWorkflowDraftFromWorkbench() {
  if (state.busy || !state.workflowDraft) return;
  state.busy = true;
  nodes.workflowBuilderSave.disabled = true;
  nodes.workflowBuilderState.textContent = "Saving";
  setStatus("Saving workflow draft");
  try {
    const saved = await post("/v1/workflow-builder/save", {
      draft: state.workflowDraft,
    });
    state.workflowDraft = saved;
    state.workflows = await get("/v1/workflows");
    render();
    renderWorkflowDraft(saved);
    nodes.workflowBuilderState.textContent = shortId(saved.workflow.id);
    setStatus(`Workflow saved - ${saved.workflow.name}`);
    document.querySelector("#workflows")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    nodes.workflowBuilderState.textContent = "Failed";
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

function addWorkflowDraftStep(kind) {
  if (!state.workflowDraft || state.workflowDraft.status === "saved") return;
  state.workflowDraft.workflow.steps.push(createDraftStep(kind));
  markWorkflowDraftEdited();
  renderWorkflowDraft(state.workflowDraft);
}

function removeWorkflowDraftStep(index) {
  if (!state.workflowDraft || state.workflowDraft.status === "saved") return;
  state.workflowDraft.workflow.steps.splice(index, 1);
  markWorkflowDraftEdited();
  renderWorkflowDraft(state.workflowDraft);
}

function moveWorkflowDraftStep(index, direction) {
  if (!state.workflowDraft || state.workflowDraft.status === "saved") return;
  const nextIndex = index + direction;
  const steps = state.workflowDraft.workflow.steps;
  if (nextIndex < 0 || nextIndex >= steps.length) return;
  const [step] = steps.splice(index, 1);
  steps.splice(nextIndex, 0, step);
  markWorkflowDraftEdited();
  renderWorkflowDraft(state.workflowDraft);
}

function updateWorkflowDraftStepField(index, field, value, options = {}) {
  if (!state.workflowDraft || state.workflowDraft.status === "saved") return;
  const step = state.workflowDraft.workflow.steps[index];
  if (!step) return;
  if (field === "kind") {
    state.workflowDraft.workflow.steps[index] = {
      ...createDraftStep(value),
      id: step.id,
    };
  } else if (field === "limit") {
    step.limit = Number(value || 5);
  } else if (field === "tags") {
    step.tags = splitCsv(value);
  } else {
    step[field] = value;
  }
  markWorkflowDraftEdited();
  if (options.rerender || field === "kind") {
    renderWorkflowDraft(state.workflowDraft);
  } else {
    updateWorkflowDraftPreview(state.workflowDraft);
  }
}

function createDraftStep(kind) {
  if (kind === "skill") {
    return {
      kind: "skill",
      skillId: state.skills[0]?.id ?? "",
    };
  }
  if (kind === "memory") {
    return {
      kind: "memory",
      content: "Record workflow progress.",
      tags: ["workflow-builder", "manual"],
    };
  }
  return {
    kind: "context",
    query: nodes.workflowBuilderContext.value.trim() || nodes.workflowBuilderGoal.value.trim() || "project context",
    limit: 5,
  };
}

function markWorkflowDraftEdited() {
  if (!state.workflowDraft) return;
  state.workflowDraft.status = "drafted";
  state.workflowDraft.review = {
    ...(state.workflowDraft.review ?? {}),
    saved: false,
    edited: true,
    stepCount: state.workflowDraft.workflow.steps.length,
  };
  state.workflowDraft.workflow.metadata = {
    ...(state.workflowDraft.workflow.metadata ?? {}),
    draftEditedAt: new Date().toISOString(),
  };
  nodes.workflowBuilderState.textContent = "edited";
}

async function loadWorkflowVersions(workflowId, options = {}) {
  if (!workflowId) return;
  setStatus("Loading workflow versions");
  try {
    const versions = await get(`/v1/workflows/${encodeURIComponent(workflowId)}/versions`);
    state.workflowVersions = {
      workflowId,
      versions,
    };
    renderWorkflowVersions(state.workflowVersions);
    nodes.workflowVersionState.textContent = `${shortId(workflowId)} - ${versions.length}`;
    setStatus(`Loaded workflow versions - ${shortId(workflowId)}`);
    if (options.scroll !== false) {
      document.querySelector("#workflow-versions")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    nodes.workflowVersionState.textContent = "Failed";
    setStatus(error.message, true);
  }
}

async function archiveWorkflowFromWorkbench(workflowId) {
  if (state.busy || !workflowId) return;
  state.busy = true;
  setStatus("Archiving workflow");
  try {
    const archived = await post(`/v1/workflows/${encodeURIComponent(workflowId)}/archive`, {
      actor: "workbench-user",
      reason: "archived from workbench",
    });
    state.workflows = await get("/v1/workflows");
    render();
    await loadWorkflowVersions(workflowId, { scroll: true });
    setStatus(`Workflow archived - ${archived.name}`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function restoreWorkflowVersionFromWorkbench(workflowId, revision) {
  if (state.busy || !workflowId || !revision) return;
  state.busy = true;
  setStatus("Restoring workflow version");
  try {
    const restored = await post(`/v1/workflows/${encodeURIComponent(workflowId)}/versions/${encodeURIComponent(revision)}/restore`, {
      actor: "workbench-user",
      reason: `restored revision ${revision} from workbench`,
    });
    state.workflows = await get("/v1/workflows");
    render();
    await loadWorkflowVersions(workflowId, { scroll: true });
    setStatus(`Workflow restored - revision ${restored.revision}`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function submitRun() {
  if (state.busy) return;
  const input = buildRunInput();
  if (!input.goal) {
    setStatus("Goal required", true);
    nodes.launchState.textContent = "Goal required";
    return;
  }
  state.busy = true;
  nodes.runSubmit.disabled = true;
  nodes.launchState.textContent = "Running";
  setStatus("Launching run");
  try {
    const run = await post("/v1/runs", input);
    nodes.launchState.textContent = shortId(run.traceId);
    setStatus(`Run created - ${shortId(run.traceId)}`);
    await refreshAfterRunControlAction();
    await loadDetail(run.traceId, { scroll: true });
  } catch (error) {
    nodes.launchState.textContent = "Failed";
    setStatus(error.message, true);
  } finally {
    state.busy = false;
    nodes.runSubmit.disabled = false;
  }
}

async function searchContextEvidenceFromWorkbench() {
  if (state.busy) return;
  const query = nodes.contextEvidenceQuery.value.trim();
  if (!query) {
    nodes.contextEvidenceState.textContent = "Query required";
    setStatus("Context evidence query required", true);
    return;
  }
  state.busy = true;
  nodes.contextEvidenceSubmit.disabled = true;
  nodes.contextEvidenceState.textContent = "Searching";
  setStatus("Searching context evidence");
  try {
    state.contextEvidence = await post("/v1/context/evidence", {
      query,
      limit: Number(nodes.contextEvidenceLimit.value || 5),
      memoryLimit: Number(nodes.contextEvidenceMemoryLimit.value || 3),
    });
    nodes.contextEvidenceState.textContent = `${state.contextEvidence.summary.allowedForModelCount} allowed / ${state.contextEvidence.summary.quarantinedCount} quarantined`;
    renderContextEvidence(state.contextEvidence);
    setStatus(`Evidence ready - ${state.contextEvidence.summary.sourceCount} sources`);
  } catch (error) {
    nodes.contextEvidenceState.textContent = "Failed";
    setStatus(error.message, true);
  } finally {
    state.busy = false;
    nodes.contextEvidenceSubmit.disabled = false;
  }
}

async function runSkill(skillId, options = {}) {
  if (state.busy || !skillId) return;
  const skill = state.skills.find((item) => item.id === skillId);
  const execute = Boolean(options.execute);
  const input = pruneEmpty({
    goal: nodes.runGoal.value.trim() || `${execute ? "Execute" : "Plan with"} skill: ${skill?.name ?? skillId}`,
    contextQuery: nodes.runContext.value.trim(),
    trustMode: nodes.runTrust.value,
    dryRun: !execute,
    skillId,
    executeSkill: execute,
    actor: "workbench-user",
  });
  state.busy = true;
  nodes.launchState.textContent = execute ? "Executing skill" : "Planning skill";
  setStatus(nodes.launchState.textContent);
  try {
    const run = await post("/v1/runs", input);
    await refreshAfterRunControlAction();
    await loadDetail(run.traceId, { scroll: true });
  } catch (error) {
    nodes.launchState.textContent = "Failed";
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function evaluateSkillFromWorkbench(skillId) {
  if (state.busy || !skillId) return;
  state.busy = true;
  setStatus("Evaluating skill");
  try {
    const report = await post(`/v1/skills/${encodeURIComponent(skillId)}/evaluations`, {});
    state.skillEvaluations = await get("/v1/skill-evaluations");
    state.skillEvaluationDetail = report;
    render();
    setStatus(`Skill evaluation ${report.status} - ${shortId(report.id)}`);
    document.querySelector("#skillforge")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function promoteSkillFromWorkbench(skillId) {
  if (state.busy || !skillId) return;
  state.busy = true;
  setStatus("Promoting skill");
  try {
    const promotion = await post(`/v1/skills/${encodeURIComponent(skillId)}/promote`, {
      useLatestEvaluation: true,
      reason: "promoted from workbench",
    });
    const [skills, candidateSkills, skillEvaluations] = await Promise.all([
      get("/v1/skills?status=approved"),
      get("/v1/skills?status=candidates"),
      get("/v1/skill-evaluations"),
    ]);
    state.skills = skills;
    state.candidateSkills = candidateSkills;
    state.skillEvaluations = skillEvaluations;
    state.skillEvaluationDetail = promotion.evaluation;
    render();
    setStatus(`Skill promoted - ${shortId(promotion.skill.id)} r${promotion.skill.revision}`);
    document.querySelector("#skillforge")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function loadSkillEvaluation(evaluationId) {
  if (!evaluationId) return;
  setStatus("Loading skill evaluation");
  try {
    state.skillEvaluationDetail = await get(`/v1/skill-evaluations/${encodeURIComponent(evaluationId)}`);
    renderSkillEvaluationPanel(state.skillEvaluationDetail);
    setStatus(`Loaded skill evaluation - ${shortId(evaluationId)}`);
    document.querySelector("#skillforge")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function runWorkflowFromWorkbench(workflowId, options = {}) {
  if (state.busy || !workflowId) return;
  const workflow = state.workflows.find((item) => item.id === workflowId);
  state.busy = true;
  nodes.launchState.textContent = options.dryRun ? "Dry-running workflow" : "Running workflow";
  setStatus(nodes.launchState.textContent);
  try {
    const result = await post(`/v1/workflows/${encodeURIComponent(workflowId)}/run`, pruneEmpty({
      goal: nodes.runGoal.value.trim() || `Run workflow: ${workflow?.name ?? workflowId}`,
      trustMode: nodes.runTrust.value,
      dryRun: Boolean(options.dryRun),
      actor: "workbench-user",
    }));
    await refreshAfterRunControlAction();
    nodes.launchState.textContent = shortId(result.traceId);
    setStatus(`Workflow ${result.status} - ${shortId(result.traceId)}`);
    await loadWorkflowDetail(result.traceId, { scroll: true });
  } catch (error) {
    nodes.launchState.textContent = "Failed";
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function resumeWorkflowRunFromWorkbench(traceId) {
  if (state.busy || !traceId) return;
  state.busy = true;
  nodes.launchState.textContent = "Resuming workflow";
  setStatus("Resuming workflow");
  try {
    const result = await post(`/v1/workflows/runs/${encodeURIComponent(traceId)}/resume`, {
      trustMode: nodes.runTrust.value,
      actor: "workbench-user",
    });
    await refreshAfterRunControlAction();
    nodes.launchState.textContent = shortId(traceId);
    setStatus(`Workflow resume ${result.status} - ${shortId(traceId)}`);
    await loadWorkflowDetail(traceId, { scroll: true });
  } catch (error) {
    nodes.launchState.textContent = "Failed";
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function createWorkflowFromWorkbench() {
  if (state.busy) return;
  let input;
  try {
    input = buildWorkflowInput();
  } catch (error) {
    nodes.workflowEditorState.textContent = "Invalid";
    setStatus(error.message, true);
    return;
  }
  if (!input.name) {
    nodes.workflowEditorState.textContent = "Name required";
    setStatus("Workflow name required", true);
    return;
  }
  if (!input.steps.length) {
    nodes.workflowEditorState.textContent = "Steps required";
    setStatus("Workflow needs at least one step", true);
    return;
  }

  state.busy = true;
  nodes.workflowSubmit.disabled = true;
  nodes.workflowEditorState.textContent = "Creating";
  setStatus("Creating workflow");
  try {
    const workflow = await post("/v1/workflows", input);
    state.workflows = await get("/v1/workflows");
    render();
    nodes.workflowEditorState.textContent = shortId(workflow.id);
    setStatus(`Workflow created - ${workflow.name}`);
    document.querySelector("#workflows")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    nodes.workflowEditorState.textContent = "Failed";
    setStatus(error.message, true);
  } finally {
    state.busy = false;
    nodes.workflowSubmit.disabled = false;
  }
}

function buildWorkflowInput() {
  const steps = [];
  const contextQuery = nodes.workflowContext.value.trim();
  if (contextQuery) {
    steps.push({
      kind: "context",
      query: contextQuery,
      limit: 5,
    });
  }
  if (nodes.workflowSkill.value) {
    steps.push({
      kind: "skill",
      skillId: nodes.workflowSkill.value,
    });
  }
  const memory = nodes.workflowMemory.value.trim();
  if (memory) {
    steps.push({
      kind: "memory",
      content: memory,
      tags: splitCsv(nodes.workflowTags.value || "workflow"),
    });
  }
  const rawSteps = nodes.workflowStepsJson.value.trim();
  if (rawSteps) {
    const parsed = JSON.parse(rawSteps);
    if (!Array.isArray(parsed)) throw new Error("JSON steps must be an array");
    steps.push(...parsed);
  }
  return {
    name: nodes.workflowName.value.trim(),
    summary: nodes.workflowSummary.value.trim(),
    steps,
    createdFrom: "workbench",
  };
}

function buildWorkflowBuilderInput() {
  return pruneEmpty({
    goal: nodes.workflowBuilderGoal.value.trim(),
    contextQuery: nodes.workflowBuilderContext.value.trim(),
    skillId: nodes.workflowBuilderSkill.value,
    name: nodes.workflowBuilderName.value.trim(),
    llmProvider: nodes.workflowBuilderLlm.value || "mock",
    llmModel: nodes.workflowBuilderModel.value.trim(),
    includeMemoryStep: true,
  });
}

function buildRunInput() {
  return pruneEmpty({
    goal: nodes.runGoal.value.trim(),
    contextQuery: nodes.runContext.value.trim(),
    trustMode: nodes.runTrust.value,
    dryRun: nodes.runDryRun.checked,
    llmProvider: nodes.runLlm.value,
    llmModel: nodes.runModel.value.trim(),
    promotePlan: nodes.runPromote.checked,
    requestCandidateApprovals: nodes.runRequestApprovals.checked,
    executeCandidatePlan: nodes.runExecuteCandidate.checked,
    actor: "workbench-user",
  });
}

function pruneEmpty(input) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== "" && value !== false));
}

async function request(method, path, body) {
  if (!state.token) throw new Error("Token required");
  const response = await fetch(`${state.gatewayUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${state.token}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message || `Request failed: ${response.status}`);
  }
  return payload;
}

function render() {
  const inbox = state.inbox || {
    summary: {
      pendingApprovalCount: 0,
      resumableRunCount: 0,
      recentRunCount: 0,
    },
    pendingApprovals: [],
    resumableRuns: [],
    recentRuns: [],
  };

  const approvalQueue = state.approvalQueue || {
    status: "clear",
    summary: {
      total: 0,
      pendingDecisionCount: 0,
      readyToResumeCount: 0,
      approvedUnresumableCount: 0,
      completedCount: 0,
    },
    items: [],
  };
  const skills = state.skills || [];
  const candidateSkills = state.candidateSkills || [];
  const skillEvaluations = state.skillEvaluations || [];
  const workflows = state.workflows || [];
  const workflowInbox = state.workflowInbox || {
    summary: {
      workflowRunCount: 0,
      pendingApprovalCount: 0,
    },
    workflowRuns: [],
  };
  const artifacts = state.artifacts || {
    summary: {
      total: 0,
      traceCount: 0,
      byKind: {},
      byStatus: {},
    },
    items: [],
  };
  const agentAdapters = state.agentAdapters || {
    summary: {
      total: 0,
      byKind: {},
      byStatus: {},
    },
    items: [],
  };
  const agentWorkspaces = state.agentWorkspaces || {
    summary: {
      total: 0,
      byStatus: {},
      byAdapter: {},
      gitWorktreeCount: 0,
    },
    items: [],
  };
  const agentLaunches = state.agentLaunches || {
    summary: {
      total: 0,
      byStatus: {},
      byAdapter: {},
      completedCount: 0,
      requiresApprovalCount: 0,
    },
    items: [],
  };
  const launchReviews = state.launchReviews || {
    summary: {
      total: 0,
      pendingCount: 0,
      approvedCount: 0,
      multiCandidateCount: 0,
    },
    items: [],
  };
  const capabilityProbes = state.capabilityProbes || {
    summary: { total: 0, latestProbeId: null, latestCreatedAt: null },
    items: [],
  };
  const taskRoutes = state.taskRoutes || {
    summary: { total: 0, routedCount: 0, blockedCount: 0, needsInputCount: 0 },
    items: [],
  };
  const fleetRuns = state.fleetRuns || {
    summary: { total: 0, activeCount: 0, awaitingApprovalCount: 0, completedCount: 0, failedCount: 0, cancelledCount: 0 },
    items: [],
  };
  const squads = state.squads || { summary: { total: 0, plannedCount: 0 }, items: [] };
  const executionTasks = state.executionTasks || {
    summary: { total: 0, attentionCount: 0, byStatus: {} },
    items: [],
    attention: [],
    evidenceAttention: [],
    closureAttention: [],
  };

  nodes.systemState.textContent = state.status ? "Connected" : "Disconnected";
  nodes.pendingCount.textContent = inbox.summary.pendingApprovalCount;
  nodes.decisionCount.textContent = approvalQueue.summary.pendingDecisionCount + approvalQueue.summary.readyToResumeCount;
  nodes.resumableCount.textContent = inbox.summary.resumableRunCount;
  nodes.recentCount.textContent = inbox.summary.recentRunCount;
  nodes.artifactCount.textContent = artifacts.summary.total;
  nodes.agentAdapterCount.textContent = agentAdapters.summary.total;
  nodes.agentWorkspaceCount.textContent = agentWorkspaces.summary.total;
  nodes.agentLaunchCount.textContent = agentLaunches.summary.total;
  nodes.launchReviewCount.textContent = launchReviews.summary.total;
  nodes.taskRouteCount.textContent = taskRoutes.summary.total;
  nodes.fleetRunCount.textContent = fleetRuns.summary.total;
  nodes.executionTaskCount.textContent = executionTasks.summary.total;
  nodes.skillState.textContent = `${skills.length}`;
  nodes.candidateSkillState.textContent = `${candidateSkills.length} candidates`;
  nodes.skillEvaluationState.textContent = `${skillEvaluations.length} reports`;
  nodes.workflowState.textContent = `${workflows.length}`;
  nodes.workflowRunState.textContent = `${workflowInbox.summary.workflowRunCount}`;
  nodes.decisionQueueState.textContent = `${approvalQueue.summary.pendingDecisionCount} pending / ${approvalQueue.summary.readyToResumeCount} ready`;
  nodes.approvalState.textContent = `${inbox.pendingApprovals.length}`;
  nodes.resumeState.textContent = `${inbox.resumableRuns.length}`;
  nodes.recentState.textContent = `${inbox.recentRuns.length}`;
  nodes.artifactState.textContent = `${artifacts.summary.total} artifacts / ${artifacts.summary.traceCount} traces`;
  nodes.agentAdapterState.textContent = `${agentAdapters.summary.total} planned`;
  nodes.agentWorkspaceState.textContent = `${agentWorkspaces.summary.total} prepared / ${agentWorkspaces.summary.gitWorktreeCount} worktrees`;
  nodes.agentLaunchState.textContent = `${agentLaunches.summary.total} launches / ${agentLaunches.summary.requiresApprovalCount} approvals`;
  nodes.launchReviewState.textContent = `${launchReviews.summary.pendingCount} pending / ${launchReviews.summary.approvedCount} approved`;
  nodes.taskRouteState.textContent = capabilityProbes.summary.total
    ? `${taskRoutes.summary.routedCount} routed / ${taskRoutes.summary.needsInputCount ?? 0} needs input / ${taskRoutes.summary.blockedCount} blocked`
    : "No capability probe";
  nodes.fleetRunState.textContent = `${fleetRuns.summary.total} total / ${fleetRuns.summary.activeCount} active / ${fleetRuns.summary.awaitingApprovalCount} awaiting approval`;
  nodes.squadState.textContent = `${squads.summary.total} total / ${squads.summary.plannedCount} planned`;
  nodes.executionTaskState.textContent = `${executionTasks.summary.total} total / ${executionTasks.summary.attentionCount} needs attention / ${(executionTasks.evidenceAttention || []).length} active evidence issues / ${(executionTasks.closureAttention || []).length} closure diagnostics`;

  renderSystemOverview(state.status, state.contextFreshness);
  renderContextEvidence(state.contextEvidence);
  renderSkills(skills);
  renderCandidateSkills(candidateSkills);
  renderSkillEvaluations(skillEvaluations);
  renderSkillEvaluationPanel(state.skillEvaluationDetail);
  renderAgentAdapters(agentAdapters.items);
  renderAgentPlanPanel(state.agentPlan);
  renderAgentWorkspaces(agentWorkspaces.items);
  renderAgentWorkspacePanel(state.agentWorkspaceDetail);
  renderAgentLaunches(agentLaunches.items);
  renderAgentLaunchPanel(state.agentLaunchDetail, state.agentLaunchReadiness);
  renderLaunchReviews(launchReviews.items);
  renderLaunchReviewPanel(state.launchReviewDetail);
  renderCapabilityProbePanel(state.capabilityProbeDetail);
  renderTaskRoutes(taskRoutes.items);
  renderTaskRoutePanel(state.taskRouteDetail);
  renderFleetRuns(fleetRuns.items);
  renderFleetRunPanel(state.fleetRunDetail);
  renderSquads(squads.items);
  renderSquadPanel(state.squadDetail, state.squadReadiness);
  renderExecutionTasks(executionTasks.items, executionTasks.closureAttention || []);
  renderExecutionTaskPanel(state.executionTaskDetail);
  renderWorkflowSkillOptions(skills);
  renderWorkflowDraft(state.workflowDraft);
  renderWorkflows(workflows);
  renderWorkflowVersions(state.workflowVersions);
  renderWorkflowRuns(workflowInbox.workflowRuns);
  renderDecisionQueue(approvalQueue.items);
  renderPending(inbox.pendingApprovals);
  renderResumable(inbox.resumableRuns);
  renderRecent(inbox.recentRuns);
  renderArtifacts(artifacts.items);
  renderArtifactPanel(state.artifactDetail);
  renderDetail(state.detail);
}

function renderSystemOverview(status, freshness) {
  nodes.systemOverview.replaceChildren();
  const modules = [
    ["ContextOS", `${status?.indexedDocumentCount ?? 0} indexed`, freshness?.status ?? "unknown"],
    ["Memory", `${status?.memoryCount ?? 0} notes`, "available"],
    ["TrustKernel", `${status?.pendingApprovalCount ?? 0} pending`, status?.pendingApprovalCount ? "pending" : "clear"],
    ["SkillForge", `${status?.approvedSkillCount ?? 0} approved / ${status?.candidateSkillCount ?? 0} candidate`, "available"],
    ["Workflow", `${status?.workflowCount ?? 0} workflows`, "available"],
    ["Agent Mesh", `${status?.agentAdapterCount ?? 0} adapters / ${status?.taskRouteCount ?? 0} routes`, "available"],
    ["Execution Tasks", `${status?.executionTaskCount ?? 0} tasks / ${status?.executionTaskEvidenceIssueCount ?? 0} evidence issues / ${status?.executionTaskClosureDiagnosticCount ?? 0} closure diagnostics`, (status?.executionTaskEvidenceIssueCount || status?.executionTaskClosureDiagnosticCount) ? "blocked" : "available"],
    ["Fleet", `${status?.fleetRunCount ?? 0} runs`, status?.fleetRunCount ? "available" : "empty"],
    ["Artifacts", `${status?.artifactCount ?? 0} artifacts`, "available"],
  ];
  for (const [name, value, statusText] of modules) {
    const item = document.createElement("article");
    item.className = "overview-item";
    item.append(
      textNode("div", name, "overview-title"),
      textNode("div", value, "overview-value"),
      pillNode(statusText, statusClass(statusText)),
    );
    nodes.systemOverview.appendChild(item);
  }
}

function renderContextEvidence(pack) {
  if (!pack) {
    nodes.contextEvidencePanel.textContent = "{}";
    nodes.contextEvidenceList.replaceChildren();
    nodes.contextEvidenceList.appendChild(emptyInline("Search evidence for a task or repo concept"));
    return;
  }
  replaceList(nodes.contextEvidenceList, pack.sources || [], (source) => itemNode({
    title: source.title || source.id,
    meta: [
      [statusClass(source.safety?.status), source.safety?.status || "-"],
      ["kind", source.kind],
      ["trust", source.trust?.level],
      ["model", source.access?.model],
      ["planning", source.access?.planning],
      ["fresh", source.freshness?.status],
    ],
    actions: [],
  }));
  nodes.contextEvidencePanel.textContent = JSON.stringify({
    query: pack.query,
    summary: pack.summary,
    safety: pack.safety,
    freshness: pack.freshness,
    sources: (pack.sources || []).map((source) => ({
      id: source.id,
      kind: source.kind,
      title: source.title,
      origin: source.origin,
      retrieval: source.retrieval,
      trust: source.trust,
      freshness: source.freshness,
      access: source.access,
      safety: source.safety,
      excerpt: source.excerpt,
    })),
  }, null, 2);
}

function renderFleetRuns(items) {
  replaceList(nodes.fleetRunList, items, (item) => itemNode({
    title: item.goal || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["role", item.role],
      ["adapter", item.adapterId],
      ["candidates", `${item.candidateCount} candidates`],
      ["parallel", item.maxParallel],
      ...(item.executionTaskId ? [["task", shortId(item.executionTaskId)]] : []),
      ["updated", formatTime(item.updatedAt || item.createdAt)],
    ],
    actions: [fleetRunViewButton(item.id), ...(item.executionTaskId ? [executionTaskReferenceButton(item.executionTaskId)] : [])],
  }));
}

function renderFleetRunPanel(fleetRun) {
  nodes.fleetRunPanel.textContent = fleetRun ? JSON.stringify({
    id: fleetRun.id,
    status: fleetRun.status,
    routeId: fleetRun.routeId,
    executionTaskId: fleetRun.executionTaskId ?? null,
    traceId: fleetRun.traceId,
    goal: fleetRun.goal,
    role: fleetRun.role,
    adapterId: fleetRun.adapterId,
    candidateCount: fleetRun.candidateCount,
    maxParallel: fleetRun.maxParallel,
    summary: fleetRun.summary,
    units: fleetRun.units,
    review: fleetRun.review,
    cancellation: fleetRun.cancellation,
    limits: fleetRun.limits,
  }, null, 2) : "{}";
}

function renderSquads(items) {
  replaceList(nodes.squadList, items, (item) => itemNode({
    title: item.name || item.goal || item.id,
    meta: [[statusClass(item.status), item.status], ["members", `${item.memberCount} members`], ["handoffs", `${item.handoffCount} handoffs`], ...(item.executionTaskId ? [["task", shortId(item.executionTaskId)]] : []), ["updated", formatTime(item.updatedAt || item.createdAt)]],
    actions: [squadViewButton(item.id), ...(item.executionTaskId ? [executionTaskReferenceButton(item.executionTaskId)] : [])],
  }));
}

function renderSquadPanel(squad, readiness, executionReadiness = {}) {
  nodes.squadPanel.textContent = squad ? JSON.stringify(squad, null, 2) : "{}";
  nodes.squadReadinessPanel.replaceChildren();
  if (!readiness) return;
  const header = document.createElement("div");
  header.className = "fleet-live-header";
  header.innerHTML = `<div><strong>Coordination readiness</strong><span>${readiness.readyCount}/${readiness.members.length} ready for approval</span></div>`;
  const grid = document.createElement("div");
  grid.className = "fleet-member-grid";
  for (const member of readiness.members) {
    const card = document.createElement("article");
    card.className = `fleet-member unit-${member.status}`;
    const explanation = squadReadinessExplanation(member);
    const execution = executionReadiness[member.adapterId];
    const executionNote = execution ? `Execution gate: ${execution.status}${execution.blockers?.length ? ` — ${execution.blockers.map((item) => item.id).join(", ")}` : ""}` : "Execution gate not loaded.";
    card.innerHTML = `<div class="fleet-member-title"><strong>${escapeHtml(member.role)}</strong><span class="tag">${escapeHtml(member.status.replaceAll("_", " "))}</span></div><p>${escapeHtml(explanation)}</p><p>${escapeHtml(executionNote)}</p>`;
    if (member.status === "needs_workspace") {
      const action = document.createElement("button");
      action.className = "secondary-action squad-action";
      action.type = "button";
      action.dataset.action = "squad-bind-workspace";
      action.dataset.role = member.role;
      action.dataset.adapterId = member.adapterId;
      action.textContent = "Bind workspace";
      card.appendChild(action);
    }
    const approvalPurpose = execution?.canRequestExecutionApproval
      ? "execution"
      : execution?.canRequestTrialApproval
        ? "trial"
        : null;
    if (member.status === "ready_for_approval" && approvalPurpose) {
      const action = document.createElement("button");
      action.className = "primary-action squad-action";
      action.type = "button";
      action.dataset.action = "squad-request-approval";
      action.dataset.role = member.role;
      action.dataset.purpose = approvalPurpose;
      action.textContent = approvalPurpose === "trial" ? "Request controlled trial approval" : "Request execution approval";
      card.appendChild(action);
    }
    grid.appendChild(card);
  }
  const handoffs = document.createElement("div");
  handoffs.className = "fleet-timeline";
  for (const handoff of squad?.handoffs ?? []) {
    const line = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = `${handoff.from} → ${handoff.to}: ${handoff.status}`;
    line.appendChild(label);
    const source = readiness.members.find((member) => member.role === handoff.from);
    if (handoff.status !== "accepted" && source?.workspaceId) {
      const action = document.createElement("button");
      action.className = "secondary-action squad-action";
      action.type = "button";
      action.dataset.action = "squad-accept-handoff";
      action.dataset.from = handoff.from;
      action.dataset.to = handoff.to;
      action.textContent = "Accept approved review";
      line.appendChild(action);
    } else if (handoff.status !== "accepted") {
      const note = document.createElement("span");
      note.textContent = "Bind the source workspace first";
      line.appendChild(note);
    }
    handoffs.appendChild(line);
  }
  nodes.squadReadinessPanel.append(header, grid, handoffs);
}

function squadReadinessExplanation(member) {
  if (member.status === "ready_for_approval") return "Workspace and all required handoffs are verified; the execution gate determines whether a trial or normal execution can be approved.";
  if (member.status === "waiting_for_handoff") return `${member.acceptedHandoffs}/${member.incomingHandoffs} upstream handoffs accepted.`;
  if (member.status === "approval_pending") return `Approval ${shortId(member.launch?.approvalId)} is pending; no process has started.`;
  if (member.status === "execution_not_routed") return "This Squad was created from a planning route. Create a fresh execute-mode Task Route after capability validation.";
  if (member.status === "executing") return "The approved Agent Launcher invocation is currently running.";
  if (member.status === "awaiting_review") return "Execution completed; create and decide a Launch Review before handing work downstream.";
  if (member.status === "handoff_complete") return "Execution and required downstream handoffs are complete.";
  if (member.status === "execution_attention_required") return `Launch status: ${member.launch?.status ?? "unknown"}. Review evidence before retrying.`;
  return "Bind a matching prepared workspace first.";
}

function renderFleetLivePanel(progress) {
  nodes.fleetLivePanel.replaceChildren();
  if (!progress) return;
  const header = document.createElement("div");
  header.className = "fleet-live-header";
  header.innerHTML = `<div><strong>Live operations</strong><span>${escapeHtml(progress.status.replace(/_/g, " "))}</span></div><div>${progress.progress.completed}/${progress.progress.total} completed · ${progress.progress.active} active</div>`;
  const units = document.createElement("div");
  units.className = "fleet-member-grid";
  for (const unit of progress.units) {
    const card = document.createElement("article");
    card.className = `fleet-member ${statusClass(unit.status)} unit-${unit.status}`;
    const detail = unit.error || unit.terminationReason || (unit.status === "running" ? "Working in isolated workspace" : unit.exitCode === 0 ? "Finished successfully" : "Awaiting next transition");
    card.innerHTML = `<div class="fleet-member-title"><strong>Agent ${unit.ordinal}</strong><span class="tag ${statusClass(unit.status)}">${escapeHtml(unit.status.replace(/_/g, " "))}</span></div><p>${escapeHtml(detail)}</p>`;
    units.appendChild(card);
  }
  const timeline = document.createElement("div");
  timeline.className = "fleet-timeline";
  const newest = progress.events.slice(-5).reverse();
  timeline.innerHTML = newest.length
    ? newest.map((event) => `<div><time>${escapeHtml(formatTime(event.createdAt))}</time><span>${escapeHtml(event.type.replace("fleet.run.", "").replaceAll("_", " "))}${event.unitId ? ` · Agent ${escapeHtml(event.unitId.split("_").at(-1))}` : ""}</span></div>`).join("")
    : "<div><span>No fleet activity recorded yet.</span></div>";
  nodes.fleetLivePanel.append(header, units, timeline);
}

function renderWorkflowSkillOptions(skills) {
  const selected = nodes.workflowSkill.value;
  const builderSelected = nodes.workflowBuilderSkill.value;
  nodes.workflowSkill.replaceChildren();
  nodes.workflowBuilderSkill.replaceChildren();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "None";
  nodes.workflowSkill.appendChild(empty.cloneNode(true));
  nodes.workflowBuilderSkill.appendChild(empty);
  for (const skill of skills) {
    const option = document.createElement("option");
    option.value = skill.id;
    option.textContent = skill.name || skill.id;
    nodes.workflowSkill.appendChild(option.cloneNode(true));
    nodes.workflowBuilderSkill.appendChild(option);
  }
  if (skills.some((skill) => skill.id === selected)) {
    nodes.workflowSkill.value = selected;
  }
  if (skills.some((skill) => skill.id === builderSelected)) {
    nodes.workflowBuilderSkill.value = builderSelected;
  }
}

function renderWorkflowRuns(items) {
  replaceList(nodes.workflowRunList, items, (item) => itemNode({
    title: item.workflowName || item.goal || item.traceId,
    meta: [
      [statusClass(item.status), item.status],
      ["trace", shortId(item.traceId)],
      ["steps", `${item.stepCount} steps`],
      ["pending", item.pendingApprovalCount],
      ["updated", formatTime(item.updatedAt)],
    ],
    actions: [
      workflowDetailButton(item.traceId),
      ...(item.canResume ? [workflowResumeButton(item.traceId)] : []),
    ],
  }));
}

function renderDecisionQueue(items) {
  const activeItems = items.filter((item) => item.status !== "completed");
  replaceList(nodes.decisionQueueList, activeItems, (item) => itemNode({
    title: item.run?.goal || item.reason || item.approvalId,
    meta: [
      [statusClass(item.status), item.status],
      [item.traceKind === "workflow.run" ? "workflow" : "agent", item.traceKind || "approval"],
      [item.riskLevel || "risk", item.toolName],
      ["trace", shortId(item.traceId)],
      ["step", item.stepId || "-"],
    ],
    actions: [
      decisionDetailButton(item),
      ...item.actions.map((action) => decisionQueueButton(item, action)),
    ],
  }));
}

function renderArtifacts(items) {
  replaceList(nodes.artifactList, items, (item) => itemNode({
    title: item.title || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["kind", item.kind],
      [item.sourceKind === "workflow.run" ? "workflow" : "agent", item.sourceKind || "trace"],
      ["trace", shortId(item.traceId)],
      ["updated", formatTime(item.updatedAt || item.createdAt)],
    ],
    actions: [
      artifactViewButton(item.id),
      ...(item.traceId ? [artifactRunDetailButton(item)] : []),
    ],
  }));
}

function renderArtifactPanel(detail) {
  if (!detail) {
    nodes.artifactPanel.textContent = "{}";
    return;
  }
  nodes.artifactPanel.textContent = JSON.stringify({
    id: detail.id,
    kind: detail.kind,
    sourceKind: detail.sourceKind,
    traceId: detail.traceId,
    title: detail.title,
    status: detail.status,
    route: detail.route,
    refs: detail.refs,
    summary: detail.summary,
    payload: detail.payload,
    limits: detail.limits,
  }, null, 2);
}

function renderAgentAdapters(items) {
  replaceList(nodes.agentAdapterList, items, (item) => itemNode({
    title: item.name || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["kind", item.kind],
      ["provider", item.provider],
      ["isolation", item.recommendedIsolation],
      ["command", item.command],
    ],
    actions: [
      agentPlanButton(item.id),
      agentPrepareButton(item.id),
    ],
  }));
}

function renderAgentPlanPanel(plan) {
  if (!plan) {
    nodes.agentPlanPanel.textContent = "{}";
    return;
  }
  nodes.agentPlanPanel.textContent = JSON.stringify({
    id: plan.id,
    status: plan.status,
    executionMode: plan.executionMode,
    adapter: plan.adapter,
    goal: plan.goal,
    isolation: plan.isolation,
    launchPreview: plan.launchPreview,
    reviewGate: plan.reviewGate,
    sourceMap: plan.sourceMap,
    limits: plan.limits,
  }, null, 2);
}

function renderAgentWorkspaces(items) {
  replaceList(nodes.agentWorkspaceList, items, (item) => itemNode({
    title: item.goal || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["adapter", item.adapter?.id || "-"],
      ["mode", item.mode],
      ["branch", item.branchName || "-"],
      ["created", formatTime(item.createdAt)],
    ],
    actions: [
      agentWorkspaceViewButton(item.id),
      agentLaunchPreviewButton(item.id),
    ],
  }));
}

function renderAgentWorkspacePanel(workspace) {
  if (!workspace) {
    nodes.agentWorkspacePanel.textContent = "{}";
    return;
  }
  nodes.agentWorkspacePanel.textContent = JSON.stringify({
    id: workspace.id,
    status: workspace.status,
    mode: workspace.mode,
    adapter: workspace.adapter,
    goal: workspace.goal,
    workspacePath: workspace.workspacePath,
    isolation: workspace.isolation,
    git: workspace.git,
    launchPreview: workspace.launchPreview,
    reviewGate: workspace.reviewGate,
    notes: workspace.notes,
    limits: workspace.limits,
  }, null, 2);
}

function renderAgentLaunches(items) {
  replaceList(nodes.agentLaunchList, items, (item) => itemNode({
    title: item.goal || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["mode", item.executionMode],
      ["adapter", item.adapter?.id || "-"],
      ["workspace", shortId(item.workspaceId)],
      ["created", formatTime(item.createdAt)],
    ],
    actions: [
      agentLaunchViewButton(item.id),
      launchReviewCreateButton(item.id),
      ...(item.status === "completed" && item.exitCode === 0 ? [agentTrialAttestationButton(item.id)] : []),
    ],
  }));
}

function renderLaunchReviews(items) {
  replaceList(nodes.launchReviewList, items, (item) => itemNode({
    title: item.goal || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["candidates", `${item.candidateCount ?? 0}`],
      ["reviewable", `${item.reviewableCount ?? 0}`],
      ["created", formatTime(item.createdAt)],
    ],
    actions: [launchReviewViewButton(item.id)],
  }));
}

function renderLaunchReviewPanel(review) {
  nodes.launchReviewPanel.textContent = review ? JSON.stringify(review, null, 2) : "{}";
}

function renderCapabilityProbePanel(probe) {
  nodes.capabilityProbePanel.textContent = probe ? JSON.stringify({
    id: probe.id,
    createdAt: probe.createdAt,
    platform: probe.platform,
    summary: probe.summary,
    adapters: probe.adapters,
    llmProviders: probe.llmProviders,
    limits: probe.limits,
  }, null, 2) : "{}";
}

function renderTaskRoutes(items) {
  replaceList(nodes.taskRouteList, items, (item) => itemNode({
    title: item.goal || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["mode", item.mode],
      ["roles", (item.roles || []).join(", ") || "-"],
      ["created", formatTime(item.createdAt)],
    ],
    actions: [taskRouteViewButton(item.id)],
  }));
}

function renderTaskRoutePanel(route) {
  nodes.taskRoutePanel.textContent = route ? JSON.stringify(route, null, 2) : "{}";
}

function renderExecutionTasks(items, closureAttention = []) {
  const closureByTaskId = new Map(closureAttention.map((item) => [item.taskId, item.diagnostic]));
  replaceList(nodes.executionTaskList, items, (item) => itemNode({
    title: item.goal || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["owner", item.owner || "unclaimed"],
      ["next", item.nextAction || "no next action"],
      ...(closureByTaskId.has(item.id) ? [["failed", `closure: ${closureByTaskId.get(item.id).code}`]] : []),
      ["updated", formatTime(item.updatedAt)],
    ],
    actions: [
      executionTaskButton("execution-task-view", item.id, "&#128065;", "View", "secondary"),
      executionTaskButton("execution-task-evidence", item.id, "&#128269;", "Evidence", "secondary"),
      executionTaskButton("execution-task-lineage", item.id, "&#127795;", "Lineage", "secondary"),
      ... (["completed", "cancelled"].includes(item.status) ? [executionTaskButton("execution-task-closure", item.id, "&#128220;", "Closure", "secondary")] : []),
      executionTaskButton("execution-task-links", item.id, "&#128279;", "Update Links", "secondary"),
      ...(["completed", "cancelled"].includes(item.status) ? [executionTaskButton("execution-task-follow-up", item.id, "&#8618;", "Follow Up", "secondary")] : []),
      ...(item.status === "open" && !item.owner ? [executionTaskButton("execution-task-claim", item.id, "&#9998;", "Claim")] : []),
      ...(!["completed", "cancelled"].includes(item.status) && item.owner ? [executionTaskButton("execution-task-handoff", item.id, "&#8644;", "Handoff", "secondary")] : []),
      ...(!["completed", "cancelled", "waiting_for_human"].includes(item.status) ? [executionTaskButton("execution-task-wait", item.id, "&#9888;", "Need Decision", "secondary")] : []),
      ...(!["completed", "cancelled", "blocked"].includes(item.status) ? [executionTaskButton("execution-task-block", item.id, "&#128683;", "Block", "secondary")] : []),
      ...(["blocked", "waiting_for_human"].includes(item.status) ? [executionTaskButton("execution-task-resume", item.id, "&#9654;", "Resume", "secondary")] : []),
      ...(!["completed", "cancelled"].includes(item.status) ? [executionTaskButton("execution-task-complete", item.id, "&#10003;", "Complete", "secondary")] : []),
      ...(!["completed", "cancelled"].includes(item.status) ? [executionTaskButton("execution-task-cancel", item.id, "&#10005;", "Cancel", "secondary")] : []),
    ],
  }));
}

function renderExecutionTaskPanel(task) {
  nodes.executionTaskPanel.textContent = task ? JSON.stringify(task, null, 2) : "{}";
}

function renderAgentLaunchPanel(launch, readiness = null) {
  if (!launch) {
    nodes.agentLaunchPanel.textContent = "{}";
    return;
  }
  nodes.agentLaunchPanel.textContent = JSON.stringify({
    id: launch.id,
    status: launch.status,
    executionMode: launch.executionMode,
    traceId: launch.traceId,
    workspaceId: launch.workspaceId,
    adapter: launch.adapter,
    goal: launch.goal,
    command: launch.command,
    exitCode: launch.exitCode,
    policyDecision: launch.policyDecision,
    approval: launch.approval,
    terminalLog: launch.terminalLog,
    git: launch.git,
    reviewGate: launch.reviewGate,
    executionReadiness: readiness ? {
      status: readiness.status,
      canRequestTrialApproval: readiness.canRequestTrialApproval,
      canRequestExecutionApproval: readiness.canRequestExecutionApproval,
      blockers: readiness.blockers,
      context: readiness.context,
      trials: readiness.trials,
    } : null,
    notes: launch.notes,
    limits: launch.limits,
  }, null, 2);
}

function renderSkills(items) {
  replaceList(nodes.skillList, items, (item) => itemNode({
    title: item.name || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["steps", `${item.steps?.length ?? 0} steps`],
      ["typed", `${item.executableSteps?.length ?? 0} executable`],
      ["updated", formatTime(item.updatedAt)],
    ],
    actions: [
      libraryButton("skill-plan", item.id, "&#8981;", "Plan"),
      libraryButton("skill-execute", item.id, "&#9654;", "Execute"),
    ],
  }));
}

function renderCandidateSkills(items) {
  replaceList(nodes.candidateSkillList, items, (item) => itemNode({
    title: item.name || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["steps", `${item.steps?.length ?? 0} steps`],
      ["source", `${item.sourceTraceIds?.length ?? 0} traces`],
      ["updated", formatTime(item.updatedAt)],
    ],
    actions: [
      libraryButton("skill-evaluate", item.id, "&#9878;", "Evaluate"),
      libraryButton("skill-promote", item.id, "&#8593;", "Promote"),
    ],
  }));
}

function renderSkillEvaluations(items) {
  replaceList(nodes.skillEvaluationList, items, (item) => itemNode({
    title: item.skillId || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["score", item.reliabilityScore],
      ["skill", item.skillStatus],
      ["created", formatTime(item.createdAt)],
    ],
    actions: [
      libraryButton("skill-evaluation-view", item.id, "&#128065;", "View"),
    ],
  }));
}

function renderSkillEvaluationPanel(report) {
  if (!report) {
    nodes.skillEvaluationPanel.textContent = "{}";
    return;
  }
  nodes.skillEvaluationPanel.textContent = JSON.stringify({
    id: report.id,
    status: report.status,
    skillId: report.skillId,
    summary: report.summary,
    findings: report.findings,
    recommendedNextActions: report.recommendedNextActions,
    policyPreviews: report.policyPreviews,
    limits: report.limits,
  }, null, 2);
}

function renderWorkflows(items) {
  replaceList(nodes.workflowList, items, (item) => itemNode({
    title: item.name || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["steps", `${item.steps?.length ?? 0} steps`],
      ["revision", item.revision ?? 1],
      ["updated", formatTime(item.updatedAt)],
    ],
    actions: [
      libraryButton("workflow-dry-run", item.id, "&#8981;", "Dry Run"),
      libraryButton("workflow-run", item.id, "&#9654;", "Run"),
      libraryButton("workflow-versions", item.id, "&#8635;", "Versions"),
      libraryButton("workflow-archive", item.id, "&#128452;", "Archive"),
    ],
  }));
}

function renderWorkflowVersions(input) {
  if (!input) {
    nodes.workflowVersionState.textContent = "No workflow selected";
    replaceList(nodes.workflowVersionList, [], () => null);
    return;
  }
  const versions = input.versions || [];
  nodes.workflowVersionState.textContent = `${shortId(input.workflowId)} - ${versions.length}`;
  replaceList(nodes.workflowVersionList, versions, (item) => itemNode({
    title: item.name || item.id,
    meta: [
      [statusClass(item.status), item.status],
      ["revision", item.revision ?? 1],
      ["steps", `${item.steps?.length ?? 0} steps`],
      ["updated", formatTime(item.updatedAt)],
    ],
    actions: [
      workflowRestoreButton(input.workflowId, item.revision),
    ],
  }));
}

function renderWorkflowDraft(draft) {
  renderWorkflowDraftSteps(draft);
  renderSourceMap(draft?.sourceMap, nodes.workflowSourceMap);
  updateWorkflowDraftPreview(draft);
  const editable = Boolean(draft && draft.status !== "saved");
  nodes.workflowBuilderSave.disabled = !editable;
  nodes.workflowDraftAddContext.disabled = !editable;
  nodes.workflowDraftAddSkill.disabled = !editable;
  nodes.workflowDraftAddMemory.disabled = !editable;
}

function renderWorkflowDraftSteps(draft) {
  nodes.workflowDraftList.replaceChildren();
  if (!draft) {
    nodes.workflowDraftList.appendChild(emptyInline("Draft a workflow to review steps"));
    return;
  }
  const steps = draft.workflow?.steps || [];
  if (!steps.length) {
    nodes.workflowDraftList.appendChild(emptyInline("No draft steps"));
    return;
  }
  steps.forEach((step, index) => {
    nodes.workflowDraftList.appendChild(workflowDraftStepNode(step, index, steps.length));
  });
}

function renderSourceMapBlock(sourceMap) {
  const block = detailBlock("Source Map");
  const list = document.createElement("div");
  list.className = "source-map-list";
  renderSourceMap(sourceMap, list);
  block.appendChild(list);
  return block;
}

function renderSourceMap(sourceMap, container) {
  container.replaceChildren();
  const sources = sourceMap?.sources || [];
  if (!sources.length) {
    container.appendChild(emptyInline("No source map"));
    return;
  }
  const summary = document.createElement("div");
  summary.className = "source-map-summary";
  for (const [kind, value] of [
    ["sources", sourceMap.summary?.sourceCount ?? sources.length],
    ["workspace", sourceMap.summary?.byType?.workspace ?? 0],
    ["memory", sourceMap.summary?.byType?.memory ?? 0],
    ["skill", sourceMap.summary?.byType?.skill ?? 0],
    ["llm", sourceMap.summary?.byType?.llm ?? 0],
  ]) {
    summary.appendChild(pillNode(`${kind}: ${value}`));
  }
  container.appendChild(summary);
  for (const source of sources) {
    const item = document.createElement("article");
    item.className = "source-item";
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = source.title || source.path || source.type;
    const meta = document.createElement("div");
    meta.className = "item-meta";
    for (const [kind, value] of [
      [source.type, source.type],
      ["confidence", source.confidence],
      ["freshness", source.freshness],
      ["score", source.score ?? "-"],
      ["hash", source.hash ? shortId(source.hash) : "-"],
    ]) {
      meta.appendChild(pillNode(value, kind));
    }
    const snippet = document.createElement("div");
    snippet.className = "source-snippet";
    snippet.textContent = source.snippet || source.path || "-";
    item.append(title, meta, snippet);
    container.appendChild(item);
  }
}

function workflowDraftStepNode(step, index, total) {
  const item = document.createElement("article");
  item.className = "draft-step";

  const heading = document.createElement("div");
  heading.className = "draft-step-heading";
  const title = document.createElement("div");
  title.className = "item-title";
  title.textContent = `Step ${index + 1}`;
  const actions = document.createElement("div");
  actions.className = "item-actions";
  actions.append(
    draftActionButton("up", index, "&#8593;", "Up", index === 0),
    draftActionButton("down", index, "&#8595;", "Down", index === total - 1),
    draftActionButton("remove", index, "&#10005;", "Remove", total === 1, "danger"),
  );
  heading.append(title, actions);

  const fields = document.createElement("div");
  fields.className = "draft-step-fields";
  fields.appendChild(draftKindField(step, index));
  if (step.kind === "skill") {
    fields.appendChild(draftInputField("Skill ID", "skillId", step.skillId, index));
  } else if (step.kind === "memory") {
    fields.appendChild(draftTextAreaField("Content", "content", step.content, index));
    fields.appendChild(draftInputField("Tags", "tags", (step.tags || []).join(", "), index));
  } else {
    fields.appendChild(draftInputField("Query", "query", step.query, index));
    fields.appendChild(draftInputField("Limit", "limit", step.limit ?? 5, index, "number"));
  }

  item.append(heading, fields);
  return item;
}

function draftKindField(step, index) {
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = "Kind";
  const select = document.createElement("select");
  select.dataset.stepIndex = String(index);
  select.dataset.draftField = "kind";
  for (const value of ["context", "skill", "memory"]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  select.value = step.kind || "context";
  label.append(span, select);
  return label;
}

function draftInputField(labelText, field, value, index, type = "text") {
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = type;
  input.value = value ?? "";
  input.dataset.stepIndex = String(index);
  input.dataset.draftField = field;
  label.append(span, input);
  return label;
}

function draftTextAreaField(labelText, field, value, index) {
  const label = document.createElement("label");
  label.className = "field-wide";
  const span = document.createElement("span");
  span.textContent = labelText;
  const textarea = document.createElement("textarea");
  textarea.rows = 2;
  textarea.value = value ?? "";
  textarea.dataset.stepIndex = String(index);
  textarea.dataset.draftField = field;
  label.append(span, textarea);
  return label;
}

function draftActionButton(action, index, iconHtml, label, disabled = false, variant = "") {
  const button = document.createElement("button");
  button.className = `item-action secondary ${variant}`.trim();
  button.type = "button";
  button.dataset.draftAction = action;
  button.dataset.stepIndex = String(index);
  button.disabled = disabled;
  button.innerHTML = `<span aria-hidden="true">${iconHtml}</span><span>${label}</span>`;
  return button;
}

function updateWorkflowDraftPreview(draft) {
  nodes.workflowBuilderPreview.textContent = JSON.stringify(draft
    ? {
        status: draft.status,
        workflow: draft.workflow,
        sourceMap: draft.sourceMap,
        review: draft.review,
        llm: draft.llm
          ? {
              provider: draft.llm.provider,
              model: draft.llm.model,
              status: draft.llm.status,
              planDraft: draft.llm.planDraft,
            }
          : null,
      }
    : {}, null, 2);
}

function renderPending(items) {
  replaceList(nodes.pendingList, items, (item) => {
    const title = item.run?.goal || item.reason || item.approvalId;
    return itemNode({
      title,
      meta: [
        ["pending", item.kind || "approval"],
        [item.riskLevel || "risk", item.toolName],
        ["trace", shortId(item.traceId)],
        ["step", item.stepId || "-"],
      ],
      actions: [
        detailButton(item.traceId),
        actionButton("approve", item.approvalId, "&#10003;", "Approve"),
        actionButton("reject", item.approvalId, "&#10005;", "Reject", "danger"),
      ],
    });
  });
}

function renderResumable(items) {
  replaceList(nodes.resumableList, items, (item) => {
    const firstStep = item.approvedSteps[0] || {};
    return itemNode({
      title: item.goal || item.traceId,
      meta: [
        ["ready", `${item.approvedStepCount} approved`],
        ["trace", shortId(item.traceId)],
        ["updated", formatTime(item.updatedAt)],
      ],
      actions: [
        detailButton(item.traceId),
        resumeButton(item.traceId, firstStep.stepId, firstStep.approvalId),
      ],
    });
  });
}

function renderRecent(items) {
  replaceList(nodes.recentList, items, (item) => itemNode({
    title: item.goal || item.traceId,
    meta: [
      [statusClass(item.status), item.status],
      ["trace", shortId(item.traceId)],
      ["pending", item.pendingApprovalCount],
      ["ready", item.approvedCandidateApprovalCount],
      ["updated", formatTime(item.updatedAt)],
    ],
    actions: item.canResume
      ? [detailButton(item.traceId), resumeButton(item.traceId, "", "")]
      : [detailButton(item.traceId)],
  }));
}

async function loadDetail(traceId, options = {}) {
  if (!traceId) return;
  setStatus("Loading run detail");
  try {
    state.detail = await get(`/v1/runs/${encodeURIComponent(traceId)}`);
    renderDetail(state.detail);
    setStatus(`Loaded detail - ${shortId(traceId)}`);
    if (options.scroll !== false) {
      document.querySelector("#detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadWorkflowDetail(traceId, options = {}) {
  if (!traceId) return;
  setStatus("Loading workflow detail");
  try {
    state.detail = await get(`/v1/workflows/runs/${encodeURIComponent(traceId)}`);
    state.detail.kind = "workflow";
    renderDetail(state.detail);
    setStatus(`Loaded workflow detail - ${shortId(traceId)}`);
    if (options.scroll !== false) {
      document.querySelector("#detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadArtifact(artifactId) {
  if (!artifactId) return;
  setStatus("Loading artifact");
  try {
    state.artifactDetail = await get(`/v1/artifacts/${encodeURIComponent(artifactId)}`);
    renderArtifactPanel(state.artifactDetail);
    setStatus(`Loaded artifact - ${shortId(artifactId)}`);
    document.querySelector("#artifacts")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadTraceReport(traceId) {
  if (!traceId) return;
  setStatus("Exporting trace report");
  try {
    const report = await get(`/v1/reports/traces/${encodeURIComponent(traceId)}?format=markdown`);
    downloadText(`${traceId}-trace-report.md`, report.markdown);
    setStatus(`Exported report - ${shortId(traceId)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function planAgentAdapterRunFromWorkbench(adapterId) {
  const goal = nodes.runGoal.value.trim();
  if (!goal) {
    setStatus("Goal required before planning an agent adapter run", true);
    document.querySelector("#launch")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  setStatus("Planning agent adapter run");
  try {
    state.agentPlan = await post(`/v1/agent-adapters/${encodeURIComponent(adapterId)}/plan`, {
      goal,
      contextQuery: nodes.runContext.value.trim(),
    });
    renderAgentPlanPanel(state.agentPlan);
    setStatus(`Planned ${state.agentPlan.adapter.name} run`);
    document.querySelector("#agents")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function prepareAgentWorkspaceFromWorkbench(adapterId) {
  const goal = nodes.runGoal.value.trim();
  if (!goal) {
    setStatus("Goal required before preparing an agent workspace", true);
    document.querySelector("#launch")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  setStatus("Preparing isolated agent workspace");
  try {
    state.agentWorkspaceDetail = await post("/v1/agent-workspaces", {
      adapterId,
      goal,
      contextQuery: nodes.runContext.value.trim(),
    });
    state.agentWorkspaces = await get("/v1/agent-workspaces");
    render();
    setStatus(`Prepared workspace - ${shortId(state.agentWorkspaceDetail.id)}`);
    document.querySelector("#agents")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadAgentWorkspace(workspaceId) {
  if (!workspaceId) return;
  setStatus("Loading agent workspace");
  try {
    state.agentWorkspaceDetail = await get(`/v1/agent-workspaces/${encodeURIComponent(workspaceId)}`);
    renderAgentWorkspacePanel(state.agentWorkspaceDetail);
    setStatus(`Loaded workspace - ${shortId(workspaceId)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function previewAgentLaunch(workspaceId) {
  if (!workspaceId) return;
  setStatus("Creating agent launch preview");
  try {
    state.agentLaunchDetail = await post("/v1/agent-launches", {
      workspaceId,
      execute: false,
    });
    state.agentLaunchReadiness = null;
    state.agentLaunches = await get("/v1/agent-launches");
    render();
    setStatus(`Created launch preview - ${shortId(state.agentLaunchDetail.id)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadAgentLaunch(launchId) {
  if (!launchId) return;
  setStatus("Loading agent launch");
  try {
    await refreshAgentLaunchDetailAndReadiness(launchId);
    renderAgentLaunchPanel(state.agentLaunchDetail, state.agentLaunchReadiness);
    setStatus(`Loaded launch - ${shortId(launchId)}; execution gate: ${readinessSummary(state.agentLaunchReadiness)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function createLaunchReviewFromWorkbench(launchId) {
  if (!launchId) return;
  setStatus("Creating launch review package");
  try {
    state.launchReviewDetail = await post("/v1/launch-reviews", { launchId });
    state.launchReviews = await get("/v1/launch-reviews");
    render();
    setStatus(`Created launch review - ${shortId(state.launchReviewDetail.id)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function attestAgentLaunchFromWorkbench(launchId) {
  if (!launchId || state.busy) return;
  const acceptanceCommand = window.prompt("Enter a read-only independent acceptance command. It will be bound exactly to a separate approval before it can run:");
  if (!acceptanceCommand?.trim()) return;
  state.busy = true;
  setStatus("Requesting independent acceptance approval");
  try {
    const result = await post("/v1/agent-trials/attest", {
      launchId,
      acceptanceCommand: acceptanceCommand.trim(),
    });
    if (result.status === "requires_approval") {
      await refreshAfterRunControlAction();
      setStatus(`Independent acceptance needs approval - ${shortId(result.approval.id)}. Approve it, then select Resume in the decision queue.`);
      return;
    }
    const [launches, detail] = await Promise.all([
      get("/v1/agent-launches"),
      get(`/v1/agent-launches/${encodeURIComponent(launchId)}`),
    ]);
    state.agentLaunches = launches;
    state.agentLaunchDetail = detail;
    state.agentLaunchReadiness = await get(`/v1/agent-adapters/${encodeURIComponent(detail.adapter.id)}/readiness`);
    render();
    setStatus(`Independent acceptance recorded - ${shortId(result.trial.id)}; execution gate: ${readinessSummary(state.agentLaunchReadiness)}`);
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    state.busy = false;
  }
}

async function refreshAgentLaunchDetailAndReadiness(launchId) {
  const detail = await get(`/v1/agent-launches/${encodeURIComponent(launchId)}`);
  const readiness = await get(`/v1/agent-adapters/${encodeURIComponent(detail.adapter.id)}/readiness`);
  state.agentLaunchDetail = detail;
  state.agentLaunchReadiness = readiness;
}

async function loadLaunchReview(reviewId) {
  if (!reviewId) return;
  setStatus("Loading launch review");
  try {
    state.launchReviewDetail = await get(`/v1/launch-reviews/${encodeURIComponent(reviewId)}`);
    renderLaunchReviewPanel(state.launchReviewDetail);
    setStatus(`Loaded launch review - ${shortId(reviewId)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function probeCapabilitiesFromWorkbench() {
  setStatus("Probing local agent capabilities");
  try {
    state.capabilityProbeDetail = await post("/v1/capability-probes", {});
    state.capabilityProbes = await get("/v1/capability-probes");
    render();
    setStatus(`Capability probe complete - ${state.capabilityProbeDetail.summary.availableAdapterCount} adapters available`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function routeTaskFromWorkbench() {
  const goal = nodes.runGoal.value.trim();
  if (!goal) {
    setStatus("Enter a run goal before routing", true);
    nodes.runGoal.focus();
    return;
  }
  setStatus("Creating explainable agent route");
  try {
    state.taskRouteDetail = await post("/v1/agent-routes", {
      goal,
      mode: "plan",
      refreshCapabilities: !state.capabilityProbes?.summary?.total,
    });
    state.capabilityProbes = await get("/v1/capability-probes");
    state.taskRoutes = await get("/v1/agent-routes");
    if (!state.capabilityProbeDetail && state.taskRouteDetail.capabilityProbe?.id) {
      state.capabilityProbeDetail = await get(`/v1/capability-probes/${encodeURIComponent(state.taskRouteDetail.capabilityProbe.id)}`);
    }
    render();
    setStatus(`Agent route ${state.taskRouteDetail.status} - ${shortId(state.taskRouteDetail.id)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadTaskRoute(routeId) {
  if (!routeId) return;
  setStatus("Loading agent route");
  try {
    state.taskRouteDetail = await get(`/v1/agent-routes/${encodeURIComponent(routeId)}`);
    renderTaskRoutePanel(state.taskRouteDetail);
    setStatus(`Loaded agent route - ${shortId(routeId)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadFleetRun(fleetRunId) {
  if (!fleetRunId) return;
  setStatus("Loading fleet run");
  try {
    state.fleetRunDetail = await get(`/v1/fleet-runs/${encodeURIComponent(fleetRunId)}`);
    state.fleetRunProgress = await get(`/v1/fleet-runs/${encodeURIComponent(fleetRunId)}/progress`);
    renderFleetRunPanel(state.fleetRunDetail);
    renderFleetLivePanel(state.fleetRunProgress);
    setStatus(`Loaded fleet run - ${shortId(fleetRunId)}`);
    scheduleFleetProgressRefresh(fleetRunId);
  } catch (error) {
    setStatus(error.message, true);
  }
}

async function loadSquad(squadId) {
  if (!squadId) return;
  setStatus("Loading Squad");
  try {
    [state.squadDetail, state.squadReadiness] = await Promise.all([
      get(`/v1/squads/${encodeURIComponent(squadId)}`),
      get(`/v1/squads/${encodeURIComponent(squadId)}/readiness`),
    ]);
    const adapterIds = [...new Set(state.squadReadiness.members.map((member) => member.adapterId))];
    const readinessItems = await Promise.all(adapterIds.map(async (adapterId) => [adapterId, await get(`/v1/agent-adapters/${encodeURIComponent(adapterId)}/readiness`)]));
    state.squadExecutionReadiness = Object.fromEntries(readinessItems);
    renderSquadPanel(state.squadDetail, state.squadReadiness, state.squadExecutionReadiness);
    setStatus(`Loaded Squad - ${shortId(squadId)}`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

let fleetProgressRefreshTimer = null;

function scheduleFleetProgressRefresh(fleetRunId) {
  if (fleetProgressRefreshTimer) clearTimeout(fleetProgressRefreshTimer);
  if (!state.fleetRunProgress?.isActive) return;
  fleetProgressRefreshTimer = setTimeout(async () => {
    try {
      const after = state.fleetRunProgress?.cursor;
      const suffix = after ? `?after=${encodeURIComponent(after)}` : "";
      state.fleetRunProgress = await get(`/v1/fleet-runs/${encodeURIComponent(fleetRunId)}/progress${suffix}`);
      state.fleetRunDetail = await get(`/v1/fleet-runs/${encodeURIComponent(fleetRunId)}`);
      renderFleetRunPanel(state.fleetRunDetail);
      renderFleetLivePanel(state.fleetRunProgress);
      scheduleFleetProgressRefresh(fleetRunId);
    } catch (error) {
      setStatus(`Fleet live update failed: ${error.message}`, true);
    }
  }, 2000);
}

function renderDetail(detail) {
  nodes.detailPanel.replaceChildren();
  if (!detail) {
    nodes.detailState.textContent = "No run selected";
    nodes.detailPanel.appendChild(nodes.emptyTemplate.content.cloneNode(true));
    return;
  }
  if (detail.kind === "workflow") {
    renderWorkflowDetail(detail);
    return;
  }
  nodes.detailState.textContent = shortId(detail.traceId);
  nodes.detailPanel.append(
    renderDetailSummary(detail),
    renderSourceMapBlock(detail.sourceMap),
    renderCandidateSteps(detail.candidateSteps || []),
    renderTimeline(detail.timeline || []),
    renderToolResults(detail.toolResults || []),
    renderArtifactsBlock(detail.artifacts || []),
    renderRawRun(detail),
  );
}

function renderWorkflowDetail(detail) {
  nodes.detailState.textContent = `workflow ${shortId(detail.traceId)}`;
  nodes.detailPanel.append(
    renderWorkflowSummary(detail),
    renderSourceMapBlock(detail.sourceMap),
    renderWorkflowSteps(detail.steps || []),
    renderTimeline(detail.timeline || []),
    renderToolResults(detail.toolResults || []),
    renderArtifactsBlock(detail.artifacts || []),
    renderRawWorkflow(detail),
  );
}

function renderWorkflowSummary(detail) {
  const block = document.createElement("article");
  block.className = "detail-summary";
  const main = document.createElement("div");
  const title = document.createElement("div");
  title.className = "detail-title";
  title.textContent = detail.summary.workflowName || detail.summary.goal || detail.traceId;
  const meta = document.createElement("div");
  meta.className = "item-meta";
  for (const [kind, value] of [
    [statusClass(detail.status), detail.status],
    ["trace", shortId(detail.traceId)],
    ["events", detail.summary.eventCount],
  ]) {
    const pill = document.createElement("span");
    pill.className = `pill ${kind}`;
    pill.textContent = String(value ?? "-");
    meta.appendChild(pill);
  }
  const grid = document.createElement("div");
  grid.className = "detail-grid";
  for (const [label, value] of [
    ["Steps", detail.summary.stepCount],
    ["Results", detail.summary.resultCount],
    ["Pending", detail.summary.pendingApprovalCount],
    ["Tools", detail.summary.toolResultCount],
    ["Artifacts", detail.summary.artifactCount ?? detail.artifacts?.length ?? 0],
  ]) {
    const stat = document.createElement("div");
    stat.className = "detail-stat";
    stat.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    grid.appendChild(stat);
  }
  main.append(title, meta, grid);
  const actions = document.createElement("div");
  actions.className = "item-actions";
  actions.appendChild(reportButton(detail.traceId));
  if (detail.summary.resumableStepCount > 0) {
    actions.appendChild(workflowResumeButton(detail.traceId));
  }
  block.append(main, actions);
  return block;
}

function renderWorkflowSteps(steps) {
  const block = detailBlock("Workflow Steps");
  if (!steps.length) {
    block.appendChild(emptyInline("No workflow steps"));
    return block;
  }
  for (const step of steps) {
    const row = document.createElement("div");
    row.className = "step-row";
    row.append(
      textNode("div", step.kind || "-", "step-tool"),
      textNode("div", step.id, "step-title"),
      pillNode(step.status || "not_run", statusClass(step.status)),
    );
    block.appendChild(row);
  }
  return block;
}

function renderRawWorkflow(detail) {
  const block = detailBlock("Raw Workflow");
  const pre = document.createElement("pre");
  pre.className = "json-view";
  pre.textContent = JSON.stringify({
    workflow: detail.workflow,
    results: detail.results,
    approvals: detail.approvals,
    resumeEvents: detail.resumeEvents,
    evaluations: detail.evaluations,
    artifacts: detail.artifacts,
  }, null, 2);
  block.appendChild(pre);
  return block;
}

function renderDetailSummary(detail) {
  const block = document.createElement("article");
  block.className = "detail-summary";
  const main = document.createElement("div");
  const title = document.createElement("div");
  title.className = "detail-title";
  title.textContent = detail.summary.goal || detail.traceId;
  const meta = document.createElement("div");
  meta.className = "item-meta";
  for (const [kind, value] of [
    [statusClass(detail.status), detail.status],
    ["trace", shortId(detail.traceId)],
    ["events", detail.summary.eventCount],
  ]) {
    const pill = document.createElement("span");
    pill.className = `pill ${kind}`;
    pill.textContent = String(value ?? "-");
    meta.appendChild(pill);
  }
  const grid = document.createElement("div");
  grid.className = "detail-grid";
  for (const [label, value] of [
    ["Approvals", detail.summary.approvalCount],
    ["Pending", detail.summary.pendingApprovalCount],
    ["Candidate", detail.summary.candidateStepCount],
    ["Evidence", evidenceSummaryLabel(detail.summary.candidateEvidence)],
    ["Tools", detail.summary.toolResultCount],
    ["Artifacts", detail.summary.artifactCount ?? detail.artifacts?.length ?? 0],
  ]) {
    const stat = document.createElement("div");
    stat.className = "detail-stat";
    stat.innerHTML = `<span>${label}</span><strong>${value}</strong>`;
    grid.appendChild(stat);
  }
  main.append(title, meta, grid);
  const actions = document.createElement("div");
  actions.className = "item-actions";
  actions.appendChild(reportButton(detail.traceId));
  if (detail.summary.pendingApprovalCount === 0 && detail.approvals.some((approval) => approval.status === "approved")) {
    actions.appendChild(resumeButton(detail.traceId, "", ""));
  }
  block.append(main, actions);
  return block;
}

function renderCandidateSteps(steps) {
  const block = detailBlock("Candidate Steps");
  if (!steps.length) {
    block.appendChild(emptyInline("No candidate steps"));
    return block;
  }
  for (const step of steps) {
    const row = document.createElement("div");
    row.className = "step-row";
    const body = document.createElement("div");
    body.className = "step-title";
    body.appendChild(textNode("div", step.description || step.id));
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.append(
      pillNode(`evidence ${step.evidenceGate?.status || "not_required"}`, statusClass(step.evidenceGate?.status)),
      pillNode(`${step.evidenceRefs?.length ?? 0} refs`),
    );
    if (step.evidenceGate?.acceptedRefs?.length) {
      meta.appendChild(pillNode(step.evidenceGate.acceptedRefs.map((ref) => ref.id).join(", ")));
    }
    if (step.evidenceGate?.reason) meta.appendChild(pillNode(step.evidenceGate.reason, statusClass(step.evidenceGate.status)));
    body.appendChild(meta);
    row.append(
      textNode("div", step.toolName || "-", "step-tool"),
      body,
      pillNode(step.promotionStatus, statusClass(step.promotionStatus)),
    );
    block.appendChild(row);
  }
  return block;
}

function renderTimeline(events) {
  const block = detailBlock("Timeline");
  for (const event of events) {
    const row = document.createElement("div");
    row.className = "timeline-row";
    row.append(
      textNode("div", formatTime(event.createdAt), "timeline-time"),
      textNode("div", event.label, "timeline-label"),
      pillNode(event.status || event.type, statusClass(event.status)),
    );
    block.appendChild(row);
  }
  return block;
}

function renderToolResults(results) {
  const block = detailBlock("Tool Results");
  if (!results.length) {
    block.appendChild(emptyInline("No tool results"));
    return block;
  }
  for (const result of results) {
    const row = document.createElement("div");
    row.className = "step-row";
    row.append(
      textNode("div", result.toolName || "-", "step-tool"),
      textNode("div", result.error?.message || result.output?.path || "tool result", "step-title"),
      pillNode(result.status, statusClass(result.status)),
    );
    block.appendChild(row);
  }
  return block;
}

function renderArtifactsBlock(items) {
  const block = detailBlock("Artifacts");
  if (!items.length) {
    block.appendChild(emptyInline("No artifacts"));
    return block;
  }
  for (const artifact of items) {
    const row = document.createElement("div");
    row.className = "step-row";
    row.append(
      textNode("div", artifact.kind || "-", "step-tool"),
      textNode("div", artifact.title || artifact.id, "step-title"),
      pillNode(artifact.status, statusClass(artifact.status)),
    );
    block.appendChild(row);
  }
  return block;
}

function renderRawRun(detail) {
  const block = detailBlock("Raw Run");
  const pre = document.createElement("pre");
  pre.className = "json-view";
  pre.textContent = JSON.stringify({
    run: detail.run,
    approvals: detail.approvals,
    resumeEvents: detail.resumeEvents,
    evaluations: detail.evaluations,
    artifacts: detail.artifacts,
  }, null, 2);
  block.appendChild(pre);
  return block;
}

function detailBlock(titleText) {
  const block = document.createElement("article");
  block.className = "detail-block";
  const title = document.createElement("h3");
  title.textContent = titleText;
  block.appendChild(title);
  return block;
}

function replaceList(node, items, renderItem) {
  node.replaceChildren();
  if (!items.length) {
    node.appendChild(nodes.emptyTemplate.content.cloneNode(true));
    return;
  }
  for (const item of items) {
    node.appendChild(renderItem(item));
  }
}

function itemNode(input) {
  const item = document.createElement("article");
  item.className = "work-item";

  const body = document.createElement("div");
  const title = document.createElement("div");
  title.className = "item-title";
  title.textContent = input.title;
  const meta = document.createElement("div");
  meta.className = "item-meta";
  for (const [kind, value] of input.meta) {
    const pill = document.createElement("span");
    pill.className = `pill ${kind}`;
    pill.textContent = String(value ?? "-");
    meta.appendChild(pill);
  }
  body.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "item-actions";
  for (const action of input.actions) actions.appendChild(action);

  item.append(body, actions);
  return item;
}

function actionButton(action, approvalId, iconHtml, label, variant = "") {
  const button = document.createElement("button");
  button.className = `item-action ${variant}`.trim();
  button.type = "button";
  button.dataset.action = action;
  button.dataset.approvalId = approvalId;
  button.innerHTML = `<span aria-hidden="true">${iconHtml}</span><span>${label}</span>`;
  return button;
}

function executionTaskButton(action, taskId, iconHtml, label, variant = "") {
  const button = actionButton(action, taskId, iconHtml, label, variant);
  button.dataset.taskId = taskId;
  return button;
}

function resumeButton(traceId, stepId, approvalId) {
  const button = document.createElement("button");
  button.className = "item-action";
  button.type = "button";
  button.dataset.action = "resume";
  button.dataset.traceId = traceId;
  if (stepId) button.dataset.stepId = stepId;
  if (approvalId) button.dataset.approvalId = approvalId;
  button.innerHTML = '<span aria-hidden="true">&#9654;</span><span>Resume</span>';
  return button;
}

function decisionQueueButton(item, action) {
  const button = document.createElement("button");
  button.className = `item-action ${action.id === "reject" ? "danger" : ""}`.trim();
  button.type = "button";
  button.dataset.queueAction = action.id;
  button.dataset.method = action.method;
  button.dataset.path = action.path;
  button.dataset.traceId = item.traceId || "";
  button.dataset.traceKind = item.traceKind || "";
  if (action.body) button.dataset.body = JSON.stringify(action.body);
  const icon = action.id === "approve" ? "&#10003;" : action.id === "reject" ? "&#10005;" : "&#9654;";
  button.innerHTML = `<span aria-hidden="true">${icon}</span><span>${action.label || titleCase(action.id)}</span>`;
  return button;
}

function decisionDetailButton(item) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "decision-details";
  button.dataset.traceId = item.traceId || "";
  button.dataset.traceKind = item.traceKind || "";
  button.innerHTML = '<span aria-hidden="true">&#9432;</span><span>Details</span>';
  return button;
}

function detailButton(traceId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "details";
  button.dataset.traceId = traceId;
  button.innerHTML = '<span aria-hidden="true">&#9432;</span><span>Details</span>';
  return button;
}

function workflowDetailButton(traceId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "workflow-details";
  button.dataset.traceId = traceId;
  button.innerHTML = '<span aria-hidden="true">&#9432;</span><span>Details</span>';
  return button;
}

function workflowResumeButton(traceId) {
  const button = document.createElement("button");
  button.className = "item-action";
  button.type = "button";
  button.dataset.action = "workflow-resume";
  button.dataset.traceId = traceId;
  button.innerHTML = '<span aria-hidden="true">&#9654;</span><span>Resume</span>';
  return button;
}

function workflowRestoreButton(workflowId, revision) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "workflow-restore";
  button.dataset.workflowId = workflowId;
  button.dataset.revision = revision;
  button.innerHTML = '<span aria-hidden="true">&#8634;</span><span>Restore</span>';
  return button;
}

function artifactViewButton(artifactId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "artifact-view";
  button.dataset.artifactId = artifactId;
  button.innerHTML = '<span aria-hidden="true">&#128065;</span><span>View</span>';
  return button;
}

function artifactRunDetailButton(item) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "artifact-run-detail";
  button.dataset.traceId = item.traceId;
  button.dataset.sourceKind = item.sourceKind || "";
  button.innerHTML = '<span aria-hidden="true">&#9432;</span><span>Run</span>';
  return button;
}

function reportButton(traceId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "report";
  button.dataset.traceId = traceId;
  button.innerHTML = '<span aria-hidden="true">&#8681;</span><span>Report</span>';
  return button;
}

function agentPlanButton(adapterId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "agent-plan";
  button.dataset.adapterId = adapterId;
  button.innerHTML = '<span aria-hidden="true">&#9874;</span><span>Plan</span>';
  return button;
}

function agentPrepareButton(adapterId) {
  const button = document.createElement("button");
  button.className = "item-action";
  button.type = "button";
  button.dataset.action = "agent-prepare";
  button.dataset.adapterId = adapterId;
  button.innerHTML = '<span aria-hidden="true">&#8862;</span><span>Prepare</span>';
  return button;
}

function agentWorkspaceViewButton(workspaceId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "agent-workspace-view";
  button.dataset.workspaceId = workspaceId;
  button.innerHTML = '<span aria-hidden="true">&#128065;</span><span>View</span>';
  return button;
}

function agentLaunchPreviewButton(workspaceId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "agent-launch-preview";
  button.dataset.workspaceId = workspaceId;
  button.innerHTML = '<span aria-hidden="true">&#9655;</span><span>Preview</span>';
  return button;
}

function agentLaunchViewButton(launchId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "agent-launch-view";
  button.dataset.launchId = launchId;
  button.innerHTML = '<span aria-hidden="true">&#128065;</span><span>View</span>';
  return button;
}

function launchReviewCreateButton(launchId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "launch-review-create";
  button.dataset.launchId = launchId;
  button.innerHTML = '<span aria-hidden="true">&#9878;</span><span>Review</span>';
  return button;
}

function agentTrialAttestationButton(launchId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "agent-trial-attest";
  button.dataset.launchId = launchId;
  button.innerHTML = '<span aria-hidden="true">&#9878;</span><span>Independent acceptance</span>';
  return button;
}

function launchReviewViewButton(reviewId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "launch-review-view";
  button.dataset.reviewId = reviewId;
  button.innerHTML = '<span aria-hidden="true">&#128065;</span><span>View</span>';
  return button;
}

function taskRouteViewButton(routeId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "task-route-view";
  button.dataset.routeId = routeId;
  button.innerHTML = '<span aria-hidden="true">&#128065;</span><span>View</span>';
  return button;
}

function fleetRunViewButton(fleetRunId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "fleet-run-view";
  button.dataset.fleetRunId = fleetRunId;
  button.innerHTML = '<span aria-hidden="true">&#128065;</span><span>View</span>';
  return button;
}

function squadViewButton(squadId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "squad-view";
  button.dataset.squadId = squadId;
  button.innerHTML = '<span aria-hidden="true">&#128065;</span><span>View</span>';
  return button;
}

function executionTaskReferenceButton(taskId) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = "execution-task-reference-view";
  button.dataset.taskId = taskId;
  button.innerHTML = '<span aria-hidden="true">&#128203;</span><span>View Task</span>';
  return button;
}

function libraryButton(action, id, iconHtml, label) {
  const button = document.createElement("button");
  button.className = "item-action secondary";
  button.type = "button";
  button.dataset.action = action;
  if (action.startsWith("skill-evaluation")) button.dataset.evaluationId = id;
  if (action.startsWith("skill-")) button.dataset.skillId = id;
  if (action.startsWith("workflow-")) button.dataset.workflowId = id;
  button.innerHTML = `<span aria-hidden="true">${iconHtml}</span><span>${label}</span>`;
  return button;
}

function textNode(tagName, text, className) {
  const node = document.createElement(tagName);
  if (className) node.className = className;
  node.textContent = String(text ?? "-");
  return node;
}

function pillNode(text, className = "") {
  const pill = document.createElement("span");
  pill.className = `pill ${className}`.trim();
  pill.textContent = String(text ?? "-");
  return pill;
}

function emptyInline(text) {
  const empty = nodes.emptyTemplate.content.cloneNode(true);
  empty.querySelector(".empty-text").textContent = text;
  return empty;
}

function shortId(value) {
  if (!value) return "-";
  const text = String(value);
  return text.length <= 18 ? text : `${text.slice(0, 10)}...${text.slice(-6)}`;
}

function statusClass(value) {
  if (["available", "allowed", "clear", "completed", "dry_run", "approved", "passed", "recorded", "fresh", "not_required"].includes(value)) return "completed";
  if (["failed", "blocked", "completed_with_blockers", "quarantined", "stale"].includes(value)) return "failed";
  if (["requires_approval", "action_required", "pending_decision", "candidate", "needs_review", "planned", "passed_with_stale_evidence"].includes(value)) return "pending";
  if (["ready_to_resume", "approved_unresumable"].includes(value)) return "ready";
  return "";
}

function readinessSummary(readiness) {
  if (!readiness) return "not loaded";
  const blockerIds = readiness.blockers?.map((item) => item.id).join(", ");
  return blockerIds ? `${readiness.status} (${blockerIds})` : readiness.status;
}

function evidenceSummaryLabel(evidence) {
  if (!evidence?.required) return "not required";
  return `${evidence.citedStepCount ?? 0}/${evidence.sourceCount ?? 0} cited`;
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function setStatus(message, isError = false) {
  nodes.statusLine.textContent = message;
  nodes.statusLine.classList.toggle("error", isError);
}

function titleCase(value) {
  return String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function downloadText(filename, content) {
  const blob = new Blob([content || ""], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
