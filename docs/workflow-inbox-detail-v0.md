# Workflow Inbox / Detail v0

SpruceAgent now has read-only workflow run projections for the Gateway API and Workbench.

This closes the first workflow operating loop:

```text
Workflow -> Run -> Inspect -> Approve -> Audit
```

## Known Facts

Workflow v0 already created `workflow.run` traces.

Workbench could list workflows and start workflow runs, but it could not inspect workflow run state in the same structured way as agent runs.

## What This Adds

Core exports:

- `getWorkflowInbox(store, options)`
- `getWorkflowInboxContract()`
- `getWorkflowRunDetail(store, traceId)`
- `getWorkflowDetailContract()`

Gateway adds:

- `GET /v1/workflows/inbox`
- `GET /v1/workflows/inbox-contract`
- `GET /v1/workflows/detail-contract`
- `GET /v1/workflows/runs/:traceId`

The JavaScript Gateway client adds:

- `workflowInbox(input)`
- `workflowInboxContract()`
- `workflowDetailContract()`
- `getWorkflowRun(traceId)`

Workbench adds:

- `Workflow Runs` list
- workflow run `Details`
- workflow run `Resume` when approved resumable steps exist
- workflow detail rendering in the existing detail panel

## Data Model

Workflow Inbox is built from traces where:

```text
trace.metadata.kind = workflow.run
```

Workflow Detail is built from:

- `trace.started`
- `workflow.started`
- `workflow.step.started`
- `workflow.context`
- `tool.policy`
- `tool.result`
- `workflow.step.completed`
- `workflow.completed`
- approval tickets tied to the trace
- evaluations tied to the trace

Schemas:

- `schemas/workflow-inbox.schema.json`
- `schemas/workflow-detail.schema.json`

## Safety Boundary

Workflow Inbox / Detail v0 is read-only.

- it does not approve or reject tickets
- it does not retry steps
- it does not resume workflows
- it does not execute tools
- workflow tool steps still go through TrustKernel
- raw trace events remain available for auditability

## Current Limits

Workflow v0 still has no:

- step retry
- workflow continuation
- general workflow retry engine
- workflow editor
- conditionals
- rollback
- scheduler
- team permission model

Approval-gated workflow tool continuation is covered by [Workflow Continuation v0](workflow-continuation-v0.md). A broader retry engine should be designed later.

## Why It Matters

SpruceAgent cannot become a trustworthy SuperAgent if reusable workflows are opaque.

This layer makes workflow execution inspectable from the same local operating surface as agent runs.
