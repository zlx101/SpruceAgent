# Execution Tasks v0

Execution Tasks v0 is SpruceAgent's durable, local control-state ledger for a bounded objective. It adapts the useful control-plane idea behind long-running agent loops: objective, owner, next action, evidence, and explicit human gates survive across CLI, Gateway, and Workbench sessions.

It is deliberately **not** a second execution engine.

## Problem it solves

Runs, workflows, routes, Fleet Runs, launch reviews, and trials already hold their own authoritative data. Operators still need one small durable record that answers:

- What bounded outcome is being pursued?
- Who currently owns the next slice?
- What is the next action?
- What evidence or existing records support the state?
- Is progress blocked by a concrete human decision rather than a vague status?

An Execution Task supplies that layer without treating a task label as permission to act.

## Contract and local storage

The core contract is `spruceagent.execution-tasks` version `0.1.0`:

```text
open -> in_progress -> waiting_for_human | blocked | completed | cancelled
```

Records are stored in the user-owned workspace store:

```text
.spruceagent/execution-tasks/<taskId>.json
.spruceagent/execution-task-index.jsonl
.spruceagent/audit.jsonl
```

Each record includes a bounded goal, optional scope and owner, next action, concrete `humanGate`, evidence references, links, and append-only history. The list projection keeps the newest index entry per task id, so an update cannot make the same task appear multiple times.

## Invariants

- Claiming uses a durable owner mutex. A task already claimed by a different owner cannot be claimed again.
- `waiting_for_human` requires a non-empty concrete `humanGate`.
- `completed` and `cancelled` clear `nextAction`; terminal tasks cannot be claimed.
- Terminal tasks cannot be reopened through an update. A regression or newly discovered scope must be represented by a new follow-up task, keeping the original task's outcome record intact.
- A follow-up can only reference a terminal parent and persists `followUpOf` on the new task. It creates no execution, approval, or inherited ownership authority.
- On first completion or cancellation, the ledger captures a read-only snapshot of its typed local links and declared evidence references. Later record changes cannot rewrite the original terminal snapshot.
- The first transition to `completed` requires a bounded `completionSummary`, retained with its recorder and timestamp. It is an operator's auditable outcome statement, not an execution authorization or a claim that the linked evidence was independently verified.
- The first transition to `cancelled` likewise requires a bounded `cancellationSummary`, so a cancelled task is not an unexplained disappearance from the control ledger.
- All create, claim, and update events are appended to the audit ledger.
- The board orders unresolved attention as `waiting_for_human`, `blocked`, `in_progress`, then `open`.
- The board also exposes `evidenceAttention` for unresolved tasks whose typed links are missing or unsupported; this is diagnostic state only and never changes task or execution authority.

## CLI

```bash
# Create durable control state. This does not run an agent.
npm run spruce -- task create \
  --goal "Validate the isolated coding slice" \
  --nextAction "Run the focused integration test" \
  --evidenceRefs "tests/core.test.js" \
  --links "agent_route_example"

npm run spruce -- task list --status open
npm run spruce -- task claim <taskId> --owner "reviewer"
npm run spruce -- task update <taskId> \
  --status waiting_for_human \
  --humanGate "Approve the reviewed release decision"
npm run spruce -- task update <taskId> \
  --status completed \
  --completionSummary "Focused checks passed and release handoff was recorded"
npm run spruce -- task update <taskId> \
  --status cancelled \
  --cancellationSummary "Scope was removed from this release"
npm run spruce -- task follow-up <terminalTaskId> \
  --goal "Investigate the newly discovered regression"
npm run spruce -- task closure <completedTaskId>
npm run spruce -- task board
npm run spruce -- task contract
```

`--evidenceRefs` and `--links` accept comma-separated values. A caller can use IDs from existing routes, traces, artifacts, launch reviews, or trials, but the ledger does not reinterpret those values as authority.

For a resolvable local link, use `kind:<id>` where `<id>` is a single safe identifier (`A-Z`, `a-z`, `0-9`, `_`, or `-`, at most 160 characters). Paths, URLs, and IDs containing separators are reported as unsupported and are never passed to a local record reader.

## Gateway and client

All routes are local and require the existing Gateway Bearer token:

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/execution-tasks` | List, optionally filtering by `status` or `owner`. |
| `GET` | `/v1/execution-tasks/board` | Read the prioritized unresolved-task board. |
| `GET` | `/v1/execution-tasks/contract` | Read the safety contract. |
| `POST` | `/v1/execution-tasks` | Create local control state. |
| `POST` | `/v1/execution-tasks/:taskId/follow-up` | Create a fresh, linked task for a terminal task without reopening it. |
| `GET` | `/v1/execution-tasks/:taskId` | Read one record. |
| `GET` | `/v1/execution-tasks/:taskId/evidence` | Resolve typed local links as read-only evidence. |
| `GET` | `/v1/execution-tasks/:taskId/closure` | Read a terminal task's completed or cancellation outcome and captured evidence snapshot. |
| `POST` | `/v1/execution-tasks/:taskId/claim` | Claim with an owner mutex. |
| `POST` | `/v1/execution-tasks/:taskId/update` | Update state, evidence, or a concrete human gate. |

`createGatewayClient()` provides matching high-level methods: `listExecutionTasks`, `executionTaskBoard`, `executionTaskContract`, `getExecutionTask`, `executionTaskEvidence`, `executionTaskClosure`, `createExecutionTask`, `createExecutionTaskFollowUp`, `claimExecutionTask`, and `updateExecutionTask`.

## Workbench

The local Workbench has an **Execution Tasks** section with summary count, task board, raw task detail, and explicit actions:

- **Create Task** prompts for a bounded goal and optional next action.
- **Claim** records the fixed `workbench-user` owner through the normal Gateway route.
- **Need Decision** prompts for the mandatory concrete human gate.
- **Complete** asks for browser confirmation plus a bounded completion summary, then only records control state and that audit statement.
- **Cancel** asks for browser confirmation plus a bounded cancellation reason; it only records task control state and never stops a running Agent or revokes an approval.
- **Closure** reads a terminal outcome statement and its preserved evidence snapshot.
- **Follow Up** appears on a terminal task and creates a new, linked control-state record; it does not reopen or execute the original task.
- **View** reads the stored ledger record.

The UI has no action that launches an agent, runs a tool, creates an approval, approves a ticket, or starts Fleet execution.

## Authority boundary

An Execution Task is metadata and audit state only. It never:

- launches an Agent or external CLI;
- executes a tool or workflow;
- grants, requests, consumes, or approves an approval ticket;
- changes ContextOS freshness or execution readiness;
- turns a linked route, trial, trace, or Fleet Run into authorization.

Actual execution remains with the existing TrustKernel, ContextOS freshness checks, readiness evidence, exact approval tickets, Agent Launcher, and Fleet controls. This split is intentional: durable coordination makes work visible, while the existing execution boundaries continue to decide what may happen.

## Terminal snapshots and diagnostics

The snapshot records what the local typed-link resolver reported at the exact moment an operator completed or cancelled a task. It does **not** prove the external work, re-validate a tool result, stop a running Agent, revoke an approval, or authorize a later action. The task board exposes `closureAttention` only when a terminal record lacks a snapshot or a captured typed link was already missing or unsupported. It is a migration/audit diagnostic, never an execution gate.
