# Desktop UI Workbench v0

SpruceAgent now has a local browser workbench served by Gateway.

The UI is intentionally small and dependency-free. It uses the existing Gateway API instead of creating a new execution path.

## Entry

Start Gateway:

```bash
npm run spruce -- gateway serve
```

Open:

```text
http://127.0.0.1:7357/workbench
```

The HTML/CSS/JS assets are local static files. API calls still require the Gateway Bearer token.

## What It Shows

The first screen is backed by Gateway routes including `GET /v1/status`, `GET /v1/context/freshness`, `GET /v1/inbox`, and `GET /v1/fleet-runs`. It renders:

- system overview across ContextOS, Memory, TrustKernel, SkillForge, Workflow, Agent Mesh, Fleet, and Artifacts
- run launcher
- context evidence search
- workflow editor
- workflow builder
- source map panels
- approved skills
- candidate skills
- skill evaluation reports
- skill promotion actions
- workflows
- agent adapters
- agent adapter run plan previews
- agent workspace preparation records
- agent launch previews and records
- workflow versions
- workflow runs
- decision queue
- pending approvals
- runs ready to resume
- recent runs
- artifacts
- summary counts
- run detail for a selected trace
- artifact detail for selected run outputs, approvals, evaluations, and memory records
- trace report export actions on run and workflow detail views

## What It Can Do

Workbench v0 supports:

- connect to a local Gateway URL
- store the Gateway URL and token in browser local storage
- launch an agent run through `POST /v1/runs`
- create workflow definitions through `POST /v1/workflows`
- draft workflow definitions through `POST /v1/workflow-builder/draft`
- review workflow draft steps before saving
- add, edit, move, and remove context/skill/memory draft steps
- inspect Source Map evidence for drafts and run details
- save reviewed workflow drafts through `POST /v1/workflow-builder/save`
- evaluate candidate skills through `POST /v1/skills/:skillId/evaluations`
- promote candidate skills through `POST /v1/skills/:skillId/promote`
- inspect SkillForge evaluation reports through `GET /v1/skill-evaluations/:evaluationId`
- inspect workflow revision history through `GET /v1/workflows/:workflowId/versions`
- archive workflow definitions through `POST /v1/workflows/:workflowId/archive`
- restore workflow revisions through `POST /v1/workflows/:workflowId/versions/:revision/restore`
- plan or execute an approved skill through `POST /v1/runs`
- dry-run or run a workflow through `POST /v1/workflows/:workflowId/run`
- inspect workflow runs through `GET /v1/workflows/runs/:traceId`
- resume approval-gated workflow runs through `POST /v1/workflows/runs/:traceId/resume`
- inspect the unified approval queue through `GET /v1/approval-queue`
- approve, reject, and resume from queue action hints while preserving Gateway authority checks
- refresh Inbox state
- approve pending approval tickets
- reject pending approval tickets
- resume approval-gated runs
- inspect run detail, candidate steps, timeline, tool results, and raw run JSON
- inspect artifact lists through `GET /v1/artifacts`
- inspect artifact detail payloads through `GET /v1/artifacts/:artifactId`
- jump from an artifact back to its agent or workflow run detail
- export a Markdown trace report through `GET /v1/reports/traces/:traceId?format=markdown`
- inspect CLI agent adapters through `GET /v1/agent-adapters`
- preview isolated adapter run plans through `POST /v1/agent-adapters/:adapterId/plan`
- prepare isolated agent workspaces through `POST /v1/agent-workspaces`
- inspect prepared agent workspaces through `GET /v1/agent-workspaces/:workspaceId`
- create agent launch previews through `POST /v1/agent-launches`
- inspect agent launch records through `GET /v1/agent-launches/:launchId`
- create evidence-backed launch review packages through `POST /v1/launch-reviews`
- inspect launch review packages through `GET /v1/launch-reviews/:reviewId`
- create redacted local capability snapshots through `POST /v1/capability-probes`
- create and inspect explainable task route drafts through `/v1/agent-routes`
- inspect Fleet Run orchestration records through `GET /v1/fleet-runs`
- inspect a Fleet Run detail through `GET /v1/fleet-runs/:fleetRunId`
- inspect the prioritized durable task board through `GET /v1/execution-tasks/board`
- create, claim, update, and inspect Execution Tasks through the existing authenticated Gateway routes
- replace an Execution Task's typed local links through an explicit Workbench prompt; this only updates task metadata and audit history
- mark an Execution Task completed only after explicitly recording the bounded outcome or verification basis; this remains task audit state, not an execution approval
- create Context Evidence packs through `POST /v1/context/evidence`

## Safety Boundary

Workbench v0 does not bypass TrustKernel.

- static UI assets do not expose workspace data
- `/v1/*` routes still require Bearer auth
- launch calls use existing `POST /v1/runs`
- workflow creation calls only create definitions and do not execute steps
- workflow builder calls only draft or save definitions and do not execute steps
- workflow draft editing is local UI state until `Save Draft`
- source map panels are read-only evidence views
- context evidence search is read-only; quarantined evidence remains withheld from model/planning/execution authority
- SkillForge evaluation calls do not execute, replay, or approve skill steps
- SkillForge promotion calls require the evaluation gate
- workflow archive calls do not delete workflow history
- workflow restore calls create a new current revision
- skill execution calls use existing `POST /v1/runs` with `skillId`
- workflow execution calls use existing workflow routes
- workflow detail calls use read-only workflow trace routes
- workflow resume calls use Workflow Continuation v0 and matching approval tickets
- decision queue calls use read-only queue action hints and existing approval or continuation routes
- approve/reject calls use existing approval routes
- resume calls use `POST /v1/runs/:traceId/resume`
- detail calls use read-only `GET /v1/runs/:traceId`
- artifact calls are read-only projections and do not copy workspace outputs
- report export calls are read-only and compose existing trace evidence
- agent adapter plan calls do not execute external CLIs or create worktrees
- agent workspace prepare calls may create local git worktrees under `.spruceagent/worktrees`, but do not execute external CLIs, commit, push, merge, or approve changes
- agent launch preview calls do not execute commands from the browser UI
- Agent Launcher v0 external coding CLI execution remains disabled; only explicit `local-shell-agent` execution through CLI or Gateway payloads can run after TrustKernel policy checks
- Fleet Run views are read-only; fleet creation, approvals, execution, and cancellation still require explicit Gateway or CLI calls
- Execution Task controls only write durable local coordination state; they cannot launch Agents, execute tools, or grant approvals
- tool execution still flows through TrustKernel

## Files

- `apps/desktop/index.html`
- `apps/desktop/styles.css`
- `apps/desktop/app.js`
- `apps/desktop/assets/spruce-mark.svg`

## Why It Matters

Run Inbox v0 made the product state visible. Workbench v0 makes it actionable and inspectable.

This is the first real operating surface for SpruceAgent:

```text
System Overview -> Evidence -> Create / Claim Execution Task -> Draft Workflow -> Review Steps -> Save Workflow -> Version / Archive / Restore -> Evaluate Skill -> Plan Agent Adapter -> Prepare Workspace -> Route Task -> Fleet Review -> Launch Preview -> Launch / Skill / Workflow -> Inspect -> Human Gate -> Approve / Reject -> Resume -> Artifact -> Report -> Audit
```

It is still local-first, conservative, and auditable.
