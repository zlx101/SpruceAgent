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

The first screen is backed by `GET /v1/inbox` and renders:

- run launcher
- workflow editor
- workflow builder
- source map panels
- approved skills
- candidate skills
- skill evaluation reports
- skill promotion actions
- workflows
- workflow versions
- workflow runs
- pending approvals
- runs ready to resume
- recent runs
- summary counts
- run detail for a selected trace

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
- refresh Inbox state
- approve pending approval tickets
- reject pending approval tickets
- resume approval-gated runs
- inspect run detail, candidate steps, timeline, tool results, and raw run JSON

## Safety Boundary

Workbench v0 does not bypass TrustKernel.

- static UI assets do not expose workspace data
- `/v1/*` routes still require Bearer auth
- launch calls use existing `POST /v1/runs`
- workflow creation calls only create definitions and do not execute steps
- workflow builder calls only draft or save definitions and do not execute steps
- workflow draft editing is local UI state until `Save Draft`
- source map panels are read-only evidence views
- SkillForge evaluation calls do not execute, replay, or approve skill steps
- SkillForge promotion calls require the evaluation gate
- workflow archive calls do not delete workflow history
- workflow restore calls create a new current revision
- skill execution calls use existing `POST /v1/runs` with `skillId`
- workflow execution calls use existing workflow routes
- workflow detail calls use read-only workflow trace routes
- workflow resume calls use Workflow Continuation v0 and matching approval tickets
- approve/reject calls use existing approval routes
- resume calls use `POST /v1/runs/:traceId/resume`
- detail calls use read-only `GET /v1/runs/:traceId`
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
Draft Workflow -> Review Steps -> Save Workflow -> Version / Archive / Restore -> Evaluate Skill -> Launch / Skill / Workflow -> Inspect -> Approve / Reject -> Resume -> Audit
```

It is still local-first, conservative, and auditable.
