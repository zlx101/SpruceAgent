# Gateway Client and Route Contract v0

SpruceAgent now has a stable local API contract and a small JavaScript client.

This layer exists so future Desktop UI, browser companion, webhook bridge, and LLM adapter code do not hand-roll HTTP URLs.

## Known Facts

Before this layer, GatewayMesh Local API v0 exposed routes, but the route list lived mostly in documentation and tests.

That was enough for a first local API, but not enough for multiple frontends or adapters.

## What This Adds

Core now exports:

- `GATEWAY_ROUTE_CONTRACT`
- `getGatewayRouteContract()`
- `createGatewayClient()`

The route contract includes:

- contract version
- base path
- auth model
- route ids
- methods
- paths
- auth requirement
- route descriptions

The client includes high-level methods:

- `health()`
- `status()`
- `releaseVerifications(input)`
- `releaseVerification(verificationId)`
- `releaseVerificationContract()`
- `releaseArtifactManifests(input)`
- `releaseArtifactManifest(manifestId)`
- `createReleaseArtifactManifest(input)`
- `releaseArtifactManifestContract()`
- `inbox(input)`
- `inboxContract()`
- `listExecutionTasks(input)`
  - `executionTaskBoard()`
  - `executionTaskContract()`
  - `executionTaskEventContract()`
  - `getExecutionTask(taskId)`
  - `executionTaskEvidence(taskId)`
  - `executionTaskClosure(taskId)`
  - `executionTaskLineage(taskId)`
  - `executionTaskEvents(taskId, input)`
  - `createExecutionTask(input)`
  - `createExecutionTaskFollowUp(taskId, input)`
  - `claimExecutionTask(taskId, input)`
  - `handoffExecutionTask(taskId, input)`
  - `resumeExecutionTask(taskId, input)`
  - `updateExecutionTask(taskId, input)`
- `contract()`
- `llmContract()`
- `workflowBuilderContract()`
- `draftWorkflow(input)`
- `saveWorkflowDraft(input)`
- `candidateContract()`
- `candidateApprovalContract()`
- `runContinuationContract()`
- `runDetailContract()`
- `requestCandidateApprovals(input)`
- `executeApprovedCandidateStep(input)`
- `listTools()`
- `listSkills(status)`
- `skillEvaluationContract()`
- `listSkillEvaluations()`
- `getSkillEvaluation(evaluationId)`
- `evaluateSkill(skillId, input)`
- `skillPromotionContract()`
- `promoteSkill(skillId, input)`
- `listSkillVersions(skillId)`
- `getSkillVersion(skillId, revision)`
- `restoreSkillVersion(skillId, revision, input)`
- `skillPackageContract()`
- `exportSkillPackage(skillId, input)`
- `listSkillPackages()`
- `getSkillPackage(packageId)`
- `importSkillPackage(input)`
- `listSkillPackageImports()`
- `getSkillPackageImport(importId)`
- `skillReplayContract()`
- `createSkillReplayFixture(skillId, input)`
- `listSkillReplayFixtures()`
- `getSkillReplayFixture(fixtureId)`
- `replaySkillFixture(fixtureId, input)`
- `listSkillReplayResults()`
- `getSkillReplayResult(resultId)`
- `runTool(input)`
- `indexContext(input)`
- `searchContext(input)`
- `runAgent(input)`
- `getRun(traceId)`
- `resumeRun(traceId, input)`
- `listWorkflows(input)`
- `createWorkflow(input)`
- `updateWorkflow(workflowId, input)`
- `archiveWorkflow(workflowId, input)`
- `listWorkflowVersions(workflowId)`
- `getWorkflowVersion(workflowId, revision)`
- `restoreWorkflowVersion(workflowId, revision, input)`
- `workflowInbox(input)`
- `workflowInboxContract()`
- `workflowDetailContract()`
- `workflowContinuationContract()`
- `getWorkflowRun(traceId)`
- `resumeWorkflowRun(traceId, input)`
- `getWorkflow(workflowId)`
- `runWorkflow(workflowId, input)`
- `listApprovals(status)`
- `getApproval(approvalId)`
- `approve(approvalId, input)`
- `reject(approvalId, input)`
- `listEvaluations()`
- `getEvaluation(evaluationId)`
- `evaluateTrace(traceId)`

It also exposes low-level `request(method, path, body)` for CLI smoke tests and early integration work.

## CLI

Read the local route contract without starting the gateway:

```bash
npm run spruce -- gateway contract
```

Call a running gateway:

```bash
npm run spruce -- gateway call --path /v1/status --token <token>
```

With `SPRUCE_GATEWAY_TOKEN`:

```bash
SPRUCE_GATEWAY_TOKEN=<token> npm run spruce -- gateway call --path /v1/status
```

## Safety Boundary

This layer does not add new authority.

- the client still calls the local gateway
- the gateway still requires Bearer auth for `/v1/*`
- tool execution still goes through TrustKernel
- approval tickets remain required for medium/high/critical actions
- archived workflows are excluded from default workflow lists
- restoring a workflow creates a new revision
- workflow builder methods do not execute saved drafts
- skill evaluation methods do not execute or approve skill steps
- skill promotion methods require the evaluation gate and write version history
- skill package imports create candidates only
- skill replay methods are static and do not execute tools
- the route contract is descriptive, not a permission grant
- release verification methods are read-only local evidence views; they do not run the release gate or persist new records
- release verification records use the machine-readable schema at `schemas/release-verification.schema.json`
- release artifact manifest reads are read-only local evidence views; manifest creation records local metadata and does not package, publish, push, deploy, install dependencies, or run verification
- release artifact manifests use the machine-readable schema at `schemas/release-artifact-manifest.schema.json`
- execution task methods only manage local control state; they do not create execution or approval authority
- execution task event methods read append-only local progress records from `schemas/execution-task-event.schema.json`; they do not launch Agents, execute tools, resume work, or grant approvals

## Why It Matters

This is the integration boundary for the next layers.

Desktop UI should call `createGatewayClient()`.

LLM adapters should call `createGatewayClient()`.

Tests should assert route ids from `getGatewayRouteContract()` instead of relying on prose docs.

That keeps SpruceAgent from becoming a pile of unrelated entrypoints.
