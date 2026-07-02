# GatewayMesh Local API v0

SpruceAgent now has the first local GatewayMesh API.

This is the entrance layer for future desktop UI, browser companion, webhook bridge, and LLM planner integration.

## Known Facts

Before GatewayMesh Local API v0, SpruceAgent had:

- CLI commands
- TrustKernel policy checks
- approval tickets
- ContextOS retrieval
- SkillForge approved skills
- workflow runs
- evaluation reports

It did not have a durable local HTTP entrance that another app could call.

## What GatewayMesh Local API v0 Adds

Gateway v0 adds a local HTTP server with:

- local bind by default: `127.0.0.1`
- Bearer token auth for all `/v1/*` routes
- health check without sensitive workspace data
- static Desktop UI Workbench at `/workbench`
- status endpoint
- inbox endpoint for Desktop UI workbench state
- run detail endpoint for trace-backed audit views
- skills list endpoint for Workbench runners
- workflow builder draft/save endpoints
- workflow inbox and workflow detail endpoints
- tool execution endpoint
- context index and search endpoints
- agent run endpoint
- workflow list/read/create/update/archive/version/run endpoints
- approval list/read/approve/reject endpoints
- evaluation list/read/trace endpoints
- route contract endpoint
- LLM adapter contract endpoint
- Candidate Execution contract endpoint
- Candidate Approval contract and execution endpoints
- Run Continuation contract and resume endpoint
- Run Detail contract and read endpoint
- JavaScript client for future UI and adapter layers

## CLI

Create a local API token:

```bash
npm run spruce -- gateway token
```

Rotate the token:

```bash
npm run spruce -- gateway token --rotate
```

Inspect auth status:

```bash
npm run spruce -- gateway info
```

Start the local gateway:

```bash
npm run spruce -- gateway serve
```

Default URL:

```text
http://127.0.0.1:7357
```

## Routes

Health check:

```bash
curl http://127.0.0.1:7357/health
```

Workbench:

```text
http://127.0.0.1:7357/workbench
```

Authenticated status:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/status
```

Launch an agent run:

```bash
curl -X POST http://127.0.0.1:7357/v1/runs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"goal\":\"Plan safely\",\"dryRun\":true,\"trustMode\":\"approve\"}"
```

Create a workflow definition:

```bash
curl -X POST http://127.0.0.1:7357/v1/workflows \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Review\",\"steps\":[{\"kind\":\"context\",\"query\":\"TrustKernel\"}]}"
```

Update a workflow definition:

```bash
curl -X PATCH http://127.0.0.1:7357/v1/workflows/<workflowId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Review v2\",\"reason\":\"tighten review\"}"
```

Archive a workflow definition:

```bash
curl -X POST http://127.0.0.1:7357/v1/workflows/<workflowId>/archive \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"reason\":\"replaced by v2\"}"
```

Read workflow versions:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/workflows/<workflowId>/versions
```

Restore a workflow version:

```bash
curl -X POST http://127.0.0.1:7357/v1/workflows/<workflowId>/versions/<revision>/restore \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"reason\":\"restore known-good revision\"}"
```

Inbox:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/inbox
```

Approved skills:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/skills?status=approved
```

Workflow inbox:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/workflows/inbox
```

Workflow run detail:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/workflows/runs/<traceId>
```

Workflow continuation contract:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/workflows/continuation-contract
```

Resume an approval-gated workflow tool step:

```bash
curl -X POST http://127.0.0.1:7357/v1/workflows/runs/<traceId>/resume \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"stepId\":\"<optionalStepId>\"}"
```

Route contract:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/contract
```

LLM adapter contract:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/llm/contract
```

Workflow Builder contract:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/workflow-builder/contract
```

Draft a workflow without executing it:

```bash
curl -X POST http://127.0.0.1:7357/v1/workflow-builder/draft \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"goal\":\"Create a project review workflow\",\"contextQuery\":\"TrustKernel\",\"llmProvider\":\"mock\"}"
```

Save a reviewed workflow draft:

```bash
curl -X POST http://127.0.0.1:7357/v1/workflow-builder/save \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"draft\":{...}}"
```

Candidate Execution contract:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/candidate/contract
```

Candidate Approval contract:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/candidate/approval-contract
```

Request approval tickets for candidate steps:

```bash
curl -X POST http://127.0.0.1:7357/v1/candidate/approvals \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"candidatePlan\":{\"promotedSteps\":[]}}"
```

Execute an approved candidate step:

```bash
curl -X POST http://127.0.0.1:7357/v1/candidate/execute-approved \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"candidatePlan\":{\"promotedSteps\":[]},\"stepId\":\"<stepId>\",\"approvalId\":\"<approvalId>\"}"
```

Run Continuation contract:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/runs/continuation-contract
```

Resume an approval-gated run after approval:

```bash
curl -X POST http://127.0.0.1:7357/v1/runs/<traceId>/resume \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"stepId\":\"<optionalStepId>\"}"
```

Run Detail contract:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/runs/detail-contract
```

Read a trace-backed run detail:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/runs/<traceId>
```

Run a safe tool:

```bash
curl -X POST http://127.0.0.1:7357/v1/tools/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"toolName\":\"file.read\",\"input\":{\"path\":\"README.md\"}}"
```

Run a workflow:

```bash
curl -X POST http://127.0.0.1:7357/v1/workflows/<workflowId>/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"trustMode\":\"approve\"}"
```

Evaluate a trace:

```bash
curl -X POST http://127.0.0.1:7357/v1/evaluations/trace \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"traceId\":\"<traceId>\"}"
```

## Safety Boundary

Gateway v0 does not bypass TrustKernel.

- `/v1/*` routes require Bearer token auth
- the default host is local-only
- non-local host binding is refused by core unless explicitly enabled by code
- gateway tool execution does not accept direct `approved: true`
- medium, high, and critical actions still create or require approval tickets
- approval ticket input matching remains enforced
- all tool execution still goes through the same `executeTool` engine
- archived workflows cannot be run through Gateway
- workflow restore creates a new revision instead of deleting history
- workflow builder routes draft or save definitions only; they do not run workflows

This matters because GatewayMesh is an attack surface. The first useful version must be boring, local, auditable, and policy-governed.

## Current Limits

Gateway v0 does not yet provide:

- browser extension
- remote tunnel
- multi-user identity
- OAuth
- role-based access control
- CORS policy configuration
- rate limiting
- websocket streaming
- LLM planner integration

Those should come after the local API surface is stable.

## Client Boundary

Future Desktop UI and LLM adapters should use `createGatewayClient()` instead of constructing URLs manually.

See: [Gateway Client and Route Contract v0](gateway-client-and-contract-v0.md)

## Why It Matters

The capability chain now has a real entrance layer:

```text
Skill -> Workflow -> Evaluation -> Gateway -> Agent -> Super-Agent -> Super AI Assistant
```

The next high-value layers can be built on this API instead of coupling every future interface directly to CLI internals.
