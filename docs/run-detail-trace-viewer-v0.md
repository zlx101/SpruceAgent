# Run Detail / Trace Viewer v0

SpruceAgent now has a read-only run detail projection built from trace events, approval tickets, resume events, and evaluation summaries.

This is the audit surface behind the Desktop Workbench detail panel.

## Known Facts

Before this layer, Run State / Inbox v0 could show what needed attention, but it did not expose a structured way to inspect why a run reached that state.

The raw trace existed, but future UI and integration code would have needed to parse trace events by itself.

## What This Adds

Core exports:

- `getRunDetail(store, traceId)`
- `getRunDetailContract()`

Gateway adds:

- `GET /v1/runs/:traceId`
- `GET /v1/runs/detail-contract`

The JavaScript gateway client adds:

- `getRun(traceId)`
- `runDetailContract()`

CLI adds:

```bash
npm run spruce -- run detail <traceId>
npm run spruce -- run detail-contract
```

Workbench adds a `Details` action on pending approvals, resumable runs, and recent runs. The detail panel shows:

- run summary
- candidate steps
- approval status
- timeline
- tool results
- raw run JSON for audit

## Data Contract

Schema:

```text
schemas/run-detail.schema.json
```

Top-level fields:

- `traceId`
- `status`
- `summary`
- `run`
- `candidateSteps`
- `approvals`
- `toolResults`
- `resumeEvents`
- `evaluations`
- `timeline`
- `events`
- `limits`

## Safety Boundary

Run Detail v0 is read-only.

- it does not approve or reject tickets
- it does not resume runs
- it does not execute tools
- it does not ask an LLM to reinterpret events
- it includes raw trace events so UI summaries remain auditable

This keeps the product surface useful without adding hidden authority.

## Why It Matters

SpruceAgent needs to become trustworthy before it becomes more autonomous.

Run Detail v0 gives users and future team operators a concrete answer to:

```text
What happened, why did it stop, what is approved, what executed, and what evidence supports that?
```

That is the right next step from:

```text
Inbox -> Approve / Reject -> Resume
```

to:

```text
Inbox -> Inspect -> Approve / Reject -> Resume -> Audit
```
