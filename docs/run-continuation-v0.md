# Run Continuation v0

SpruceAgent now supports resuming an approval-gated agent run from its existing trace.

This removes the manual handoff where callers had to keep the full candidate plan, step id, and approval id in their own state.

```text
Agent Run -> Candidate Approval Ticket -> User Approval -> Run Resume -> Approved Candidate Step -> TrustKernel -> Tool Result
```

## Known Facts

Before Run Continuation v0, SpruceAgent could:

- promote LLM drafts into candidate plans
- create approval tickets for `requires_approval` candidate steps
- execute an approved candidate step if the caller provided the candidate plan, step id, and approval id

It could not resume from a run trace alone.

## What Run Continuation v0 Adds

Core now exports:

- `getRunContinuationContract()`
- `getAgentRunSnapshot()`
- `resumeAgentRun()`

Agent runs now accept:

- `requestCandidateApprovals: true`

The Gateway exposes:

- `GET /v1/runs/continuation-contract`
- `POST /v1/runs/:traceId/resume`

The JavaScript Gateway client exposes:

- `runContinuationContract()`
- `resumeRun(traceId, input)`

The CLI exposes:

```bash
npm run spruce -- run "Plan and request approvals" --llm <provider> --promotePlan --requestCandidateApprovals
npm run spruce -- run resume <traceId>
npm run spruce -- candidate continuation-contract
```

## Resume Boundary

Run Continuation v0:

- reads the existing trace
- finds the latest `agent.completed` payload
- restores the `candidatePlan`
- selects `requires_approval` candidate steps
- finds an approved matching approval ticket
- executes through `executeApprovedCandidateStep`

It does not:

- re-plan
- call an LLM
- create approval tickets
- execute `ready`, `blocked`, or `not_promotable` steps
- bypass TrustKernel

## Product Implication

This is the right primitive for Desktop UI.

The UI can show a run, list pending approvals, let the user approve a ticket, then call:

```text
POST /v1/runs/:traceId/resume
```

No UI layer needs to reconstruct the candidate plan. The trace is the durable coordination object.

## Why It Matters

This is a step from a tool execution engine toward an agent operating system.

An operating system does not just start tasks. It pauses, waits for authority, resumes, records what happened, and keeps the user in control.
