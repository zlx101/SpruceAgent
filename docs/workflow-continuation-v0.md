# Workflow Continuation v0

SpruceAgent can now resume approval-gated workflow tool steps after approval.

This closes the first safe workflow execution loop:

```text
Workflow -> Run -> Approval -> Resume -> Detail -> Audit
```

## Known Facts

Workflow v0 already used TrustKernel for every tool step.

When a workflow tool step required approval, the run returned `requires_approval`, created an approval ticket, and recorded the event in the workflow trace.

Before this layer, approving that ticket did not provide a workflow-level continuation path.

## What This Adds

Core exports:

- `resumeWorkflowRun(store, input)`
- `getWorkflowContinuationContract()`
- `getWorkflowRunSnapshot(store, traceId)`

Gateway adds:

- `GET /v1/workflows/continuation-contract`
- `POST /v1/workflows/runs/:traceId/resume`

The JavaScript Gateway client adds:

- `workflowContinuationContract()`
- `resumeWorkflowRun(traceId, input)`

CLI adds:

```bash
npm run spruce -- workflow resume <traceId>
npm run spruce -- workflow continuation-contract
```

Workbench adds:

- `Resume` action for workflow runs with approved resumable steps
- `Resume` action in workflow detail when resumable steps exist

## Resume Rules

Workflow Continuation v0 resumes only:

- existing `workflow.run` traces
- workflow `tool` steps
- prior step results with `status=requires_approval`
- steps with an approved approval ticket matching the same trace, tool name, and input

Resume still calls:

```text
executeWorkflowStep -> executeTool -> TrustKernel
```

The approval ticket is consumed by `executeTool`.

## Safety Boundary

Workflow Continuation v0 does not:

- re-plan workflows
- retry arbitrary failed steps
- create approval tickets
- bypass approval ticket matching
- resume non-tool steps
- schedule or parallelize workflow runs

This is deliberately narrower than a workflow retry engine. It restores the minimal missing bridge after human approval.

## Trace Events

Continuation writes:

- `workflow.resume.started`
- `workflow.resume.step.started`
- `workflow.resume.step.completed`
- `workflow.resume.completed`

Workflow Detail includes `resumeEvents` for audit.

## Why It Matters

Reusable workflows are only useful if they can safely cross approval boundaries.

This layer keeps user control intact while making workflow execution practical.
