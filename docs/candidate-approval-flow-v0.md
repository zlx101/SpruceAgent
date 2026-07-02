# Candidate Approval Flow v0

SpruceAgent now has an approval bridge for candidate plan steps that Planner Promotion marks as `requires_approval`.

This fills the gap between candidate classification and governed execution:

```text
LLM Draft -> Candidate Plan -> requires_approval Step -> Approval Ticket -> Approved Candidate Step -> TrustKernel -> Tool Result
```

## Known Facts

Before this layer, SpruceAgent could:

- promote LLM drafts into candidate plans
- execute `ready` candidate steps explicitly
- report `requires_approval` candidate steps without running them
- create approval tickets during normal tool execution
- consume approval tickets for exact tool/input matches

It could not create approval tickets directly from approval-gated candidate steps.

## What Candidate Approval Flow v0 Adds

Core now exports:

- `getCandidateApprovalContract()`
- `requestCandidateApprovals()`
- `executeApprovedCandidateStep()`

The Gateway exposes:

- `GET /v1/candidate/approval-contract`
- `POST /v1/candidate/approvals`
- `POST /v1/candidate/execute-approved`

The JavaScript Gateway client exposes:

- `candidateApprovalContract()`
- `requestCandidateApprovals(input)`
- `executeApprovedCandidateStep(input)`

The CLI exposes:

```bash
npm run spruce -- candidate approval-contract
npm run spruce -- candidate request-approvals --file candidate-plan.json
npm run spruce -- candidate execute-approved --file candidate-plan.json --stepId <stepId> --approvalId <approvalId>
```

## Approval Boundary

Candidate Approval v0 creates tickets only for steps with:

- `promotionStatus: "requires_approval"`
- a known requested tool
- object input

It does not create approval tickets for:

- `ready` steps
- `blocked` steps
- `not_promotable` steps
- unknown tools
- malformed inputs

Each approval ticket is bound to:

- exact tool name
- exact input object
- candidate step id
- candidate plan version when present

If the same pending or approved ticket already exists for the same candidate step, tool, and input, SpruceAgent reuses it instead of creating duplicate approval noise.

## Execution Boundary

`executeApprovedCandidateStep()` requires:

- the original candidate plan
- a `stepId`
- an `approvalId`

Execution still goes through `executeTool`, which means:

- TrustKernel reevaluates policy
- the approval ticket must be approved
- the approval ticket input must exactly match
- the ticket is consumed after successful authorization
- trace events and tool results remain auditable

For product flows that already have an agent run trace, prefer [Run Continuation v0](run-continuation-v0.md). It restores the candidate plan from the trace and executes approved candidate steps without requiring the caller to resend the full candidate plan.

## Why It Matters

This is the minimum product-grade approval spine for Desktop UI and team workflows.

Candidate Execution v0 handles safe `ready` actions. Candidate Approval Flow v0 handles risky but reviewable actions.

Together they form a controlled path from model planning to real work without granting the model unchecked agency.
