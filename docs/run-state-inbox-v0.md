# Run State / Inbox v0

SpruceAgent now has a read-only workbench projection for current agent activity.

This is the first UI-facing aggregation layer for Desktop UI:

```text
Traces + Approval Tickets + Continuation State -> Run Inbox -> Desktop Workbench
```

## Known Facts

Before this layer, SpruceAgent could:

- create agent runs
- create candidate approval tickets
- approve or reject tickets
- resume approval-gated runs from trace
- expose all of the above through Gateway routes

It could not answer a product-level question directly:

> What needs my attention right now?

## What Run Inbox v0 Adds

Core now exports:

- `getRunInboxContract()`
- `getRunInbox()`

The Gateway exposes:

- `GET /v1/inbox`
- `GET /v1/inbox/contract`

The JavaScript Gateway client exposes:

- `inbox(input)`
- `inboxContract()`

The CLI exposes:

```bash
npm run spruce -- inbox
npm run spruce -- inbox contract
```

## Inbox Sections

Run Inbox v0 returns:

- `pendingApprovals`: approval tickets that require user action
- `resumableRuns`: runs with approved candidate-step tickets ready to resume
- `recentRuns`: recent agent runs with compact status metadata

It also returns summary counts:

- `pendingApprovalCount`
- `resumableRunCount`
- `recentRunCount`

## Status

| Status | Meaning |
| --- | --- |
| `action_required` | at least one approval is pending |
| `ready_to_resume` | at least one approved candidate step can be resumed |
| `clear` | no pending approval or approved resumable run is present |

## Safety Boundary

Run Inbox v0 is deliberately read-only.

It does not:

- approve tickets
- reject tickets
- resume runs
- execute tools
- call LLM providers
- re-plan

It only projects existing local state into a shape a UI can render.

## Why It Matters

This layer makes SpruceAgent feel less like a bag of commands and more like an operating system.

An agent OS needs a workbench:

- what is waiting for me
- what can continue now
- what just happened

Run Inbox v0 is that workbench boundary.
