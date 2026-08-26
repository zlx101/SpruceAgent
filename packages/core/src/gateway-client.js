export function createGatewayClient(options = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? "http://127.0.0.1:7357");
  const token = options.token;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch is required to create a gateway client");
  }

  async function request(method, path, body, requestOptions = {}) {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(requestOptions.auth === false || !token ? {} : { authorization: `Bearer ${token}` }),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const payload = await readResponseBody(response);
    if (!response.ok) {
      const error = new Error(payload?.message ?? `gateway request failed: ${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  return {
    baseUrl,
    request,
    health: () => request("GET", "/health", undefined, { auth: false }),
    status: () => request("GET", "/v1/status"),
    deploymentPreflight: (input = {}) => request("GET", `/v1/deployment/preflight${deploymentPreflightParams(input)}`),
    deploymentPreflightContract: () => request("GET", "/v1/deployment/preflight/contract"),
    gatewayRuntime: () => request("GET", "/v1/gateway/runtime"),
    gatewayRuntimeContract: () => request("GET", "/v1/gateway/runtime/contract"),
    inbox: (input = {}) => request("GET", `/v1/inbox${input.limit ? `?limit=${encodeURIComponent(input.limit)}` : ""}`),
    inboxContract: () => request("GET", "/v1/inbox/contract"),
    approvalQueue: (input = {}) => request("GET", `/v1/approval-queue${queueParams(input)}`),
    approvalQueueContract: () => request("GET", "/v1/approval-queue/contract"),
    listExecutionTasks: (input = {}) => request("GET", `/v1/execution-tasks${executionTaskParams(input)}`),
    executionTaskBoard: () => request("GET", "/v1/execution-tasks/board"),
    executionTaskContract: () => request("GET", "/v1/execution-tasks/contract"),
    getExecutionTask: (taskId) => request("GET", `/v1/execution-tasks/${encodePathPart(taskId)}`),
    executionTaskEvidence: (taskId) => request("GET", `/v1/execution-tasks/${encodePathPart(taskId)}/evidence`),
    executionTaskClosure: (taskId) => request("GET", `/v1/execution-tasks/${encodePathPart(taskId)}/closure`),
    executionTaskLineage: (taskId) => request("GET", `/v1/execution-tasks/${encodePathPart(taskId)}/lineage`),
    createExecutionTask: (input = {}) => request("POST", "/v1/execution-tasks", input),
    createExecutionTaskFollowUp: (taskId, input = {}) => request("POST", `/v1/execution-tasks/${encodePathPart(taskId)}/follow-up`, input),
    claimExecutionTask: (taskId, input = {}) => request("POST", `/v1/execution-tasks/${encodePathPart(taskId)}/claim`, input),
    handoffExecutionTask: (taskId, input = {}) => request("POST", `/v1/execution-tasks/${encodePathPart(taskId)}/handoff`, input),
    resumeExecutionTask: (taskId, input = {}) => request("POST", `/v1/execution-tasks/${encodePathPart(taskId)}/resume`, input),
    updateExecutionTask: (taskId, input = {}) => request("POST", `/v1/execution-tasks/${encodePathPart(taskId)}/update`, input),
    listAutopilots: (input = {}) => request("GET", `/v1/autopilots${autopilotParams(input)}`),
    listDueAutopilots: (input = {}) => request("GET", `/v1/autopilots/due${input.now ? `?now=${encodeURIComponent(input.now)}` : ""}`),
    autopilotContract: () => request("GET", "/v1/autopilots/contract"),
    getAutopilot: (autopilotId) => request("GET", `/v1/autopilots/${encodePathPart(autopilotId)}`),
    listAutopilotTriggers: (autopilotId, input = {}) => request("GET", `/v1/autopilots/${encodePathPart(autopilotId)}/triggers${input.limit ? `?limit=${encodeURIComponent(input.limit)}` : ""}`),
    listAutopilotFailures: (autopilotId, input = {}) => request("GET", `/v1/autopilots/${encodePathPart(autopilotId)}/failures${input.limit ? `?limit=${encodeURIComponent(input.limit)}` : ""}`),
    createAutopilot: (input = {}) => request("POST", "/v1/autopilots", input),
    runDueAutopilots: (input = {}) => request("POST", "/v1/autopilots/run-due", input),
    triggerAutopilot: (autopilotId, input = {}) => request("POST", `/v1/autopilots/${encodePathPart(autopilotId)}/trigger`, input),
    updateAutopilot: (autopilotId, input = {}) => request("POST", `/v1/autopilots/${encodePathPart(autopilotId)}/update`, input),
    enableAutopilot: (autopilotId, input = {}) => request("POST", `/v1/autopilots/${encodePathPart(autopilotId)}/enable`, input),
    disableAutopilot: (autopilotId, input = {}) => request("POST", `/v1/autopilots/${encodePathPart(autopilotId)}/disable`, input),
    artifacts: (input = {}) => request("GET", `/v1/artifacts${artifactParams(input)}`),
    artifact: (artifactId) => request("GET", `/v1/artifacts/${encodePathPart(artifactId)}`),
    artifactContract: () => request("GET", "/v1/artifacts/contract"),
    traceReport: (traceId, input = {}) => request("GET", `/v1/reports/traces/${encodePathPart(traceId)}${traceReportParams(input)}`),
    traceReportContract: () => request("GET", "/v1/reports/contract"),
    listAgentAdapters: (input = {}) => request("GET", `/v1/agent-adapters${agentAdapterParams(input)}`),
    getAgentAdapter: (adapterId) => request("GET", `/v1/agent-adapters/${encodePathPart(adapterId)}`),
    getAgentExecutionReadiness: (adapterId, input = {}) => request("GET", `/v1/agent-adapters/${encodePathPart(adapterId)}/readiness${input.maxChanges ? `?maxChanges=${encodeURIComponent(input.maxChanges)}` : ""}`),
    agentAdapterContract: () => request("GET", "/v1/agent-adapters/contract"),
    planAgentAdapterRun: (adapterId, input = {}) => request("POST", `/v1/agent-adapters/${encodePathPart(adapterId)}/plan`, input),
    listAgentWorkspaces: (input = {}) => request("GET", `/v1/agent-workspaces${agentWorkspaceParams(input)}`),
    getAgentWorkspace: (workspaceId) => request("GET", `/v1/agent-workspaces/${encodePathPart(workspaceId)}`),
    agentWorkspaceContract: () => request("GET", "/v1/agent-workspaces/contract"),
    prepareAgentWorkspace: (input = {}) => request("POST", "/v1/agent-workspaces", input),
    retireAgentWorkspace: (workspaceId, input = {}) => request("POST", `/v1/agent-workspaces/${encodePathPart(workspaceId)}/retire`, input),
    listAgentLaunches: (input = {}) => request("GET", `/v1/agent-launches${agentLaunchParams(input)}`),
    getAgentLaunch: (launchId) => request("GET", `/v1/agent-launches/${encodePathPart(launchId)}`),
    agentLauncherContract: () => request("GET", "/v1/agent-launches/contract"),
    externalCliLauncherContract: () => request("GET", "/v1/external-cli-launcher/contract"),
    launchAgentWorkspace: (input = {}) => request("POST", "/v1/agent-launches", input),
    listLaunchReviews: (input = {}) => request("GET", `/v1/launch-reviews${launchReviewParams(input)}`),
    getLaunchReview: (reviewId) => request("GET", `/v1/launch-reviews/${encodePathPart(reviewId)}`),
    launchReviewContract: () => request("GET", "/v1/launch-reviews/contract"),
    createLaunchReview: (input = {}) => request("POST", "/v1/launch-reviews", input),
    decideLaunchReview: (reviewId, input = {}) => request("POST", `/v1/launch-reviews/${encodePathPart(reviewId)}/decision`, input),
    listAgentTrials: (input = {}) => request("GET", `/v1/agent-trials${agentTrialParams(input)}`),
    getAgentTrial: (trialId) => request("GET", `/v1/agent-trials/${encodePathPart(trialId)}`),
    agentTrialContract: () => request("GET", "/v1/agent-trials/contract"),
    agentTrialAttestationContract: () => request("GET", "/v1/agent-trials/attestation-contract"),
    recordAgentTrial: (input = {}) => request("POST", "/v1/agent-trials", input),
    attestAgentLaunchTrial: (input = {}) => request("POST", "/v1/agent-trials/attest", input),
    listCapabilityProbes: () => request("GET", "/v1/capability-probes"),
    getCapabilityProbe: (probeId) => request("GET", `/v1/capability-probes/${encodePathPart(probeId)}`),
    capabilityProbeContract: () => request("GET", "/v1/capability-probes/contract"),
    probeAgentCapabilities: (input = {}) => request("POST", "/v1/capability-probes", input),
    listTaskRoutes: (input = {}) => request("GET", `/v1/agent-routes${taskRouteParams(input)}`),
    getTaskRoute: (routeId) => request("GET", `/v1/agent-routes/${encodePathPart(routeId)}`),
    taskRouterContract: () => request("GET", "/v1/agent-routes/contract"),
    createTaskRoute: (input = {}) => request("POST", "/v1/agent-routes", input),
    listFleetRuns: (input = {}) => request("GET", `/v1/fleet-runs${fleetRunParams(input)}`),
    getFleetRun: (fleetRunId) => request("GET", `/v1/fleet-runs/${encodePathPart(fleetRunId)}`),
    getFleetRunProgress: (fleetRunId, input = {}) => request("GET", `/v1/fleet-runs/${encodePathPart(fleetRunId)}/progress${fleetProgressParams(input)}`),
    fleetRunContract: () => request("GET", "/v1/fleet-runs/contract"),
    createFleetRun: (input = {}) => request("POST", "/v1/fleet-runs", input),
    requestFleetRunApprovals: (fleetRunId, input = {}) => request("POST", `/v1/fleet-runs/${encodePathPart(fleetRunId)}/approvals`, input),
    approveFleetRun: (fleetRunId, input = {}) => request("POST", `/v1/fleet-runs/${encodePathPart(fleetRunId)}/approve`, input),
    executeFleetRun: (fleetRunId, input = {}) => request("POST", `/v1/fleet-runs/${encodePathPart(fleetRunId)}/execute`, input),
    cancelFleetRun: (fleetRunId, input = {}) => request("POST", `/v1/fleet-runs/${encodePathPart(fleetRunId)}/cancel`, input),
    listSquads: () => request("GET", "/v1/squads"),
    getSquad: (squadId) => request("GET", `/v1/squads/${encodePathPart(squadId)}`),
    getSquadReadiness: (squadId) => request("GET", `/v1/squads/${encodePathPart(squadId)}/readiness`),
    bindSquadMemberWorkspace: (squadId, role, input = {}) => request("POST", `/v1/squads/${encodePathPart(squadId)}/members/${encodePathPart(role)}/workspace`, input),
    acceptSquadHandoff: (squadId, from, to, input = {}) => request("POST", `/v1/squads/${encodePathPart(squadId)}/handoffs/${encodePathPart(from)}/${encodePathPart(to)}/review`, input),
    requestSquadMemberApproval: (squadId, role, input = {}) => request("POST", `/v1/squads/${encodePathPart(squadId)}/members/${encodePathPart(role)}/approval-request`, input),
    squadContract: () => request("GET", "/v1/squads/contract"),
    createSquad: (input = {}) => request("POST", "/v1/squads", input),
    contract: () => request("GET", "/v1/contract"),
    llmContract: () => request("GET", "/v1/llm/contract"),
    llmProviderContract: () => request("GET", "/v1/llm/providers/contract"),
    listLlmProviders: () => request("GET", "/v1/llm/providers"),
    getLlmProvider: (providerId) => request("GET", `/v1/llm/providers/${encodePathPart(providerId)}`),
    validateLlmProvider: (providerId) => request("GET", `/v1/llm/providers/${encodePathPart(providerId)}/validate`),
    configureLlmProvider: (input = {}) => request("POST", "/v1/llm/providers", input),
    removeLlmProvider: (providerId, input = {}) => request("DELETE", `/v1/llm/providers/${encodePathPart(providerId)}`, input),
    workflowBuilderContract: () => request("GET", "/v1/workflow-builder/contract"),
    draftWorkflow: (input) => request("POST", "/v1/workflow-builder/draft", input),
    saveWorkflowDraft: (input) => request("POST", "/v1/workflow-builder/save", input),
    candidateContract: () => request("GET", "/v1/candidate/contract"),
    candidateApprovalContract: () => request("GET", "/v1/candidate/approval-contract"),
    runContinuationContract: () => request("GET", "/v1/runs/continuation-contract"),
    runDetailContract: () => request("GET", "/v1/runs/detail-contract"),
    requestCandidateApprovals: (input) => request("POST", "/v1/candidate/approvals", input),
    executeApprovedCandidateStep: (input) => request("POST", "/v1/candidate/execute-approved", input),
    listTools: () => request("GET", "/v1/tools"),
    listSkills: (status = "approved") => request("GET", `/v1/skills?status=${encodeURIComponent(status)}`),
    skillEvaluationContract: () => request("GET", "/v1/skill-evaluations/contract"),
    listSkillEvaluations: () => request("GET", "/v1/skill-evaluations"),
    getSkillEvaluation: (evaluationId) => request("GET", `/v1/skill-evaluations/${encodePathPart(evaluationId)}`),
    evaluateSkill: (skillId, input = {}) => request("POST", `/v1/skills/${encodePathPart(skillId)}/evaluations`, input),
    skillPromotionContract: () => request("GET", "/v1/skills/promotion-contract"),
    promoteSkill: (skillId, input = {}) => request("POST", `/v1/skills/${encodePathPart(skillId)}/promote`, input),
    listSkillVersions: (skillId) => request("GET", `/v1/skills/${encodePathPart(skillId)}/versions`),
    getSkillVersion: (skillId, revision) => request("GET", `/v1/skills/${encodePathPart(skillId)}/versions/${encodePathPart(revision)}`),
    restoreSkillVersion: (skillId, revision, input = {}) => request("POST", `/v1/skills/${encodePathPart(skillId)}/versions/${encodePathPart(revision)}/restore`, input),
    skillPackageContract: () => request("GET", "/v1/skills/package-contract"),
    exportSkillPackage: (skillId, input = {}) => request("POST", `/v1/skills/${encodePathPart(skillId)}/package-export`, input),
    listSkillPackages: () => request("GET", "/v1/skill-packages"),
    getSkillPackage: (packageId) => request("GET", `/v1/skill-packages/${encodePathPart(packageId)}`),
    importSkillPackage: (input) => request("POST", "/v1/skill-packages/import", input),
    listSkillPackageImports: () => request("GET", "/v1/skill-package-imports"),
    getSkillPackageImport: (importId) => request("GET", `/v1/skill-package-imports/${encodePathPart(importId)}`),
    skillReplayContract: () => request("GET", "/v1/skills/replay-contract"),
    createSkillReplayFixture: (skillId, input = {}) => request("POST", `/v1/skills/${encodePathPart(skillId)}/replay-fixtures`, input),
    listSkillReplayFixtures: () => request("GET", "/v1/skill-replay/fixtures"),
    getSkillReplayFixture: (fixtureId) => request("GET", `/v1/skill-replay/fixtures/${encodePathPart(fixtureId)}`),
    replaySkillFixture: (fixtureId, input = {}) => request("POST", `/v1/skill-replay/fixtures/${encodePathPart(fixtureId)}/run`, input),
    listSkillReplayResults: () => request("GET", "/v1/skill-replay/results"),
    getSkillReplayResult: (resultId) => request("GET", `/v1/skill-replay/results/${encodePathPart(resultId)}`),
    runTool: (input) => request("POST", "/v1/tools/run", input),
    preflight: (input = {}) => request("POST", "/v1/preflight", input),
    riskPreflight: (input = {}) => request("POST", "/v1/preflight/risk", input),
    indexContext: (input = {}) => request("POST", "/v1/context/index", input),
    contextFreshness: (input = {}) => request("GET", `/v1/context/freshness${input.maxChanges ? `?maxChanges=${encodeURIComponent(input.maxChanges)}` : ""}`),
    searchContext: (input) => request("POST", "/v1/context/search", input),
    contextEvidenceContract: () => request("GET", "/v1/context/evidence-contract"),
    createContextEvidence: (input) => request("POST", "/v1/context/evidence", input),
    runAgent: (input) => request("POST", "/v1/runs", input),
    getRun: (traceId) => request("GET", `/v1/runs/${encodePathPart(traceId)}`),
    resumeRun: (traceId, input = {}) => request("POST", `/v1/runs/${encodePathPart(traceId)}/resume`, input),
    listWorkflows: (input = {}) => request("GET", `/v1/workflows${input.status ? `?status=${encodeURIComponent(input.status)}` : ""}`),
    createWorkflow: (input) => request("POST", "/v1/workflows", input),
    updateWorkflow: (workflowId, input) => request("PATCH", `/v1/workflows/${encodePathPart(workflowId)}`, input),
    archiveWorkflow: (workflowId, input = {}) => request("POST", `/v1/workflows/${encodePathPart(workflowId)}/archive`, input),
    listWorkflowVersions: (workflowId) => request("GET", `/v1/workflows/${encodePathPart(workflowId)}/versions`),
    getWorkflowVersion: (workflowId, revision) => request("GET", `/v1/workflows/${encodePathPart(workflowId)}/versions/${encodePathPart(revision)}`),
    restoreWorkflowVersion: (workflowId, revision, input = {}) => request("POST", `/v1/workflows/${encodePathPart(workflowId)}/versions/${encodePathPart(revision)}/restore`, input),
    workflowInbox: (input = {}) => request("GET", `/v1/workflows/inbox${input.limit ? `?limit=${encodeURIComponent(input.limit)}` : ""}`),
    workflowInboxContract: () => request("GET", "/v1/workflows/inbox-contract"),
    workflowDetailContract: () => request("GET", "/v1/workflows/detail-contract"),
    workflowContinuationContract: () => request("GET", "/v1/workflows/continuation-contract"),
    getWorkflowRun: (traceId) => request("GET", `/v1/workflows/runs/${encodePathPart(traceId)}`),
    resumeWorkflowRun: (traceId, input = {}) => request("POST", `/v1/workflows/runs/${encodePathPart(traceId)}/resume`, input),
    getWorkflow: (workflowId) => request("GET", `/v1/workflows/${encodePathPart(workflowId)}`),
    runWorkflow: (workflowId, input = {}) => request("POST", `/v1/workflows/${encodePathPart(workflowId)}/run`, input),
    listApprovals: (status) => request("GET", `/v1/approvals${status ? `?status=${encodeURIComponent(status)}` : ""}`),
    getApproval: (approvalId) => request("GET", `/v1/approvals/${encodePathPart(approvalId)}`),
    approve: (approvalId, input = {}) => request("POST", `/v1/approvals/${encodePathPart(approvalId)}/approve`, input),
    reject: (approvalId, input = {}) => request("POST", `/v1/approvals/${encodePathPart(approvalId)}/reject`, input),
    listEvaluations: () => request("GET", "/v1/evaluations"),
    getEvaluation: (evaluationId) => request("GET", `/v1/evaluations/${encodePathPart(evaluationId)}`),
    evaluateTrace: (traceId) => request("POST", "/v1/evaluations/trace", { traceId }),
    outcomeEvaluationContract: () => request("GET", "/v1/outcomes/contract"),
    listOutcomeFixtures: () => request("GET", "/v1/outcomes/fixtures"),
    getOutcomeFixture: (fixtureId) => request("GET", `/v1/outcomes/fixtures/${encodePathPart(fixtureId)}`),
    createOutcomeFixture: (input) => request("POST", "/v1/outcomes/fixtures", input),
    evaluateOutcomeFixture: (fixtureId, input = {}) => request("POST", `/v1/outcomes/fixtures/${encodePathPart(fixtureId)}/evaluate`, input),
    summarizeOutcomeFixture: (fixtureId) => request("GET", `/v1/outcomes/fixtures/${encodePathPart(fixtureId)}/summary`),
    listOutcomeResults: (input = {}) => request("GET", `/v1/outcomes/results${outcomeResultParams(input)}`),
    getOutcomeResult: (resultId) => request("GET", `/v1/outcomes/results/${encodePathPart(resultId)}`),
  };
}

function normalizeBaseUrl(value) {
  return String(value).replace(/\/+$/, "");
}

function queueParams(input = {}) {
  const params = new URLSearchParams();
  if (input.limit) params.set("limit", input.limit);
  if (input.traceKind) params.set("traceKind", input.traceKind);
  if (input.status) params.set("status", input.status);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function deploymentPreflightParams(input = {}) {
  const params = new URLSearchParams();
  if (input.host) params.set("host", input.host);
  if (input.port !== undefined) params.set("port", input.port);
  if (input.autopilotPollMs !== undefined) params.set("autopilotPollMs", input.autopilotPollMs);
  if (input.requireToken !== undefined) params.set("requireToken", input.requireToken === true ? "true" : "false");
  if (input.allowRemote !== undefined) params.set("allowRemote", input.allowRemote === true ? "true" : "false");
  const value = params.toString();
  return value ? `?${value}` : "";
}

function artifactParams(input = {}) {
  const params = new URLSearchParams();
  if (input.limit) params.set("limit", input.limit);
  if (input.traceId) params.set("traceId", input.traceId);
  if (input.kind) params.set("kind", input.kind);
  if (input.sourceKind) params.set("sourceKind", input.sourceKind);
  if (input.status) params.set("status", input.status);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function outcomeResultParams(input = {}) {
  const params = new URLSearchParams();
  if (input.fixtureId) params.set("fixtureId", input.fixtureId);
  if (input.status) params.set("status", input.status);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function traceReportParams(input = {}) {
  const params = new URLSearchParams();
  if (input.format) params.set("format", input.format);
  if (input.includeRaw) params.set("includeRaw", "true");
  const value = params.toString();
  return value ? `?${value}` : "";
}

function agentAdapterParams(input = {}) {
  const params = new URLSearchParams();
  if (input.kind) params.set("kind", input.kind);
  if (input.status) params.set("status", input.status);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function agentWorkspaceParams(input = {}) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.adapterId) params.set("adapterId", input.adapterId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function agentLaunchParams(input = {}) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.workspaceId) params.set("workspaceId", input.workspaceId);
  if (input.adapterId) params.set("adapterId", input.adapterId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function launchReviewParams(input = {}) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.launchId) params.set("launchId", input.launchId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function taskRouteParams(input = {}) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function fleetRunParams(input = {}) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.routeId) params.set("routeId", input.routeId);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function fleetProgressParams(input = {}) {
  const params = new URLSearchParams();
  if (input.after) params.set("after", input.after);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function agentTrialParams(input = {}) {
  const params = new URLSearchParams();
  if (input.adapterId) params.set("adapterId", input.adapterId);
  if (input.status) params.set("status", input.status);
  if (input.attested !== undefined) params.set("attested", String(Boolean(input.attested)));
  const value = params.toString();
  return value ? `?${value}` : "";
}

function executionTaskParams(input = {}) {
  const params = new URLSearchParams();
  if (input.status) params.set("status", input.status);
  if (input.owner) params.set("owner", input.owner);
  const value = params.toString();
  return value ? `?${value}` : "";
}

function autopilotParams(input = {}) {
  const params = new URLSearchParams();
  if (input.enabled !== undefined) params.set("enabled", String(Boolean(input.enabled)));
  const value = params.toString();
  return value ? `?${value}` : "";
}

function encodePathPart(value) {
  if (!value || !String(value).trim()) {
    throw new Error("path id is required");
  }
  return encodeURIComponent(value);
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}
