# Deployment Operations v0

SpruceAgent now has a local deployment preflight for long-running alpha operation.

This layer is intentionally narrow. It does not deploy to a cloud provider, run Agents, trigger workflows, or start the Gateway. It answers one operational question before a human starts a long-running local process:

```text
Can this checkout safely run the local Gateway and Workbench as an alpha operator process?
```

## Current Top Five Infrastructure Tasks

For the deployment, long-running, and productization track, the current top five infrastructure tasks are:

1. Machine-readable deployment preflight.
2. Lightweight Gateway health with uptime and runner state.
3. CLI and npm entry points for repeatable operator checks.
4. CI release gate coverage for deployment readiness.
5. Gateway runtime state and duplicate-start protection for long-running local processes.

## CLI

Run the deployment preflight:

```bash
npm run deploy:preflight
```

Equivalent direct command:

```bash
npm run spruce -- deploy preflight
```

Check a specific Gateway target:

```bash
npm run spruce -- deploy preflight --host 127.0.0.1 --port 7357 --autopilotPollMs 60000
```

Require an already configured Gateway token:

```bash
npm run spruce -- deploy preflight --requireToken
```

Read the contract:

```bash
npm run spruce -- deploy contract
```

Read the last recorded Gateway process state:

```bash
npm run spruce -- gateway runtime
```

Read the runtime contract:

```bash
npm run spruce -- gateway runtime-contract
```

Run the full local release gate and record summarized evidence:

```bash
npm run release:verify
```

The report is written under:

```text
.spruceagent/release-verifications/
.spruceagent/release-verification-index.jsonl
.spruceagent/release-artifacts/
.spruceagent/release-artifact-index.jsonl
.spruceagent/execution-task-events/
```

After a verification record exists, record the local release material manifest:

```bash
npm run spruce -- release manifest --verificationId <verificationId>
```

## Gateway

Unauthenticated health remains intentionally lightweight:

```bash
curl http://127.0.0.1:7357/health
```

Health includes:

- service name
- contract version
- local-only status
- process start time
- uptime
- whether Gateway auth is configured
- foreground Autopilot runner snapshot when enabled
- pointer to the authenticated deployment preflight route

Authenticated deployment preflight:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/deployment/preflight
```

Authenticated contract:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/deployment/preflight/contract
```

Authenticated Gateway runtime state:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/gateway/runtime
```

Authenticated release verification evidence:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/release-verifications
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/release-verifications/<verificationId>
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/release-verifications/contract
```

`<verificationId>` must be a single persisted release verification id, not a relative or absolute file path.

Authenticated release artifact manifests:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/release-artifacts
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/release-artifacts/<manifestId>
curl -H "Authorization: Bearer <token>" -X POST http://127.0.0.1:7357/v1/release-artifacts/manifest
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/release-artifacts/contract
```

`<manifestId>` must be a single persisted release artifact manifest id, not a relative or absolute file path.

Authenticated Execution Task progress events:

```bash
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/execution-tasks/events/contract
curl -H "Authorization: Bearer <token>" http://127.0.0.1:7357/v1/execution-tasks/<taskId>/events?limit=50
```

`<taskId>` must be a single persisted execution task id. Event reads are local audit/progress views only; they do not execute, resume, approve, or hand off work.

## Workbench

The local Workbench System Overview also reads the authenticated deployment and runtime routes:

- `GET /v1/deployment/preflight`
- `GET /v1/gateway/runtime`
- `GET /v1/release-verifications?limit=10`
- `GET /v1/release-artifacts?limit=10`
- `GET /v1/execution-tasks/:taskId/events?limit=50` when the operator selects Events on a task

It displays:

- deployment preflight pass/fail/warning counts
- the last recorded Gateway runtime status
- the active Gateway base URL and pid when present
- recent release verification records
- recent release artifact manifests
- selected Execution Task control-state events

This is an operator visibility surface only. It does not start Gateway, rotate tokens, kill stale processes, generate release manifests, launch Agents, approve tickets, run workflows, or mutate work from an event view.

## Gateway Runtime State

`npm run spruce -- gateway serve` writes local process state to:

```text
.spruceagent/runtime/gateway.json
```

The record includes pid, host, port, base URL, start time, update time, stop time, and the Autopilot polling interval when one is configured. It does not contain the Gateway token.

Before starting, Gateway checks this runtime record. If another live Gateway process is already recorded for the same SpruceAgent store, startup is rejected instead of creating a second long-running owner. When the server closes normally, the record is marked `stopped`. If the process disappears without a clean close, later diagnostics report the record as `stale` and a new start can replace it.

## Result Semantics

`passed` means the local alpha runtime checks have no blocking errors or warnings.

`warning` means the process can usually run locally, but an operator should review the condition before unattended use. Examples include no token configured yet, pending approvals, or execution-task evidence attention.

`failed` means do not treat the checkout as deployable until the listed failures are fixed. Examples include an invalid host, invalid port, missing static assets, missing required scripts, or a store write failure.

## Safety Boundary

Deployment Preflight v0:

- does not start Gateway
- does not create or rotate a Gateway token
- does not launch Agents
- does not run tools
- does not run workflows
- does not trigger Autopilot rules
- does not expose Gateway token values
- creates and removes only one temporary write-probe file under `.spruceagent`

Release Verification v0:

- does not publish or push source code
- does not deploy to any remote environment
- does not start Gateway
- does not launch Agents
- does not grant approvals
- persists only summarized local gate evidence, not raw stdout or stderr

Gateway Runtime v0:

- does not kill processes
- does not reclaim ports
- does not start Agents
- does not run tools
- does not grant approvals
- only records and checks the local Gateway process for the current SpruceAgent store

## Long-Running Alpha Start

Recommended local sequence:

```bash
npm run release:verify
npm run spruce -- gateway token
npm run spruce -- gateway serve --autopilotPollMs 60000
```

Open Workbench:

```text
http://127.0.0.1:7357/workbench
```
