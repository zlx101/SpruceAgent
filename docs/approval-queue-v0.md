# Approval Queue v0

Approval Queue v0 gives SpruceAgent one read-only decision queue for approvals and resumable runs.

## What It Does

- Lists pending approval tickets as `pending_decision`.
- Lists approved candidate-step tickets that can resume agent runs as `ready_to_resume`.
- Lists approved workflow tool tickets that can resume workflow runs as `ready_to_resume`.
- Lists consumed tickets as `completed`.
- Provides route hints for `approve`, `reject`, and `resume` actions.
- Feeds Run Inbox, Run Detail, Workflow Inbox, Workflow Detail, CLI, and Gateway.

## CLI

```bash
npm run spruce -- approval queue
npm run spruce -- approval queue --traceKind agent.run
npm run spruce -- approval queue --traceKind workflow.run
```

## Gateway

```http
GET /v1/approval-queue
GET /v1/approval-queue?traceKind=agent.run
GET /v1/approval-queue?status=ready_to_resume
GET /v1/approval-queue/contract
```

## Safety Boundary

Approval Queue v0 is read-only. It does not approve, reject, resume, execute tools, mutate workflows, or create approval tickets.

The `actions` array contains route hints only. The approval and continuation endpoints still enforce exact ticket matching, policy checks, and execution boundaries.

## Why It Matters

SpruceAgent needs a clear human decision surface before desktop UI becomes useful. Approval Queue v0 turns scattered approval tickets and resume states into a single operator-facing queue, while preserving TrustKernel as the authority layer.

## Limits

- v0 uses local trace and approval state only.
- Route hints are local Gateway paths.
- Approved tickets can still fail at resume time if the underlying run is no longer resumable.
