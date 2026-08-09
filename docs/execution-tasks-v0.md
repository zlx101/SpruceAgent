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
- An owner cannot be changed through a generic update or resume. A non-terminal claimed task can only move to a distinct owner through an explicit handoff that names the current owner, records a bounded `handoffSummary`, and supplies the incoming owner's `nextAction`; the ledger appends a dedicated `handed_off` event with both `fromOwner` and incoming `owner` in task history and the audit ledger.
- Mutating operations optionally accept the exact `updatedAt` value previously read as `ifUpdatedAt`. A mismatch is rejected as a revision conflict, letting concurrent CLI, SDK, or Workbench users refresh before they overwrite newer local control state.
- `waiting_for_human` requires a non-empty concrete `humanGate`.
- `blocked` requires a non-empty concrete `blocker`; an unexplained blocked status is rejected.
- Resuming a `blocked` or `waiting_for_human` task requires both a bounded `resumptionSummary` and an explicit `nextAction`; it clears the stale blocker or human gate and appends a dedicated `resumed` audit event.
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
npm run spruce -- task handoff <taskId> \
  --fromOwner "reviewer" \
  --owner "release-reviewer" \
  --handoffSummary "Implementation evidence is ready for independent review" \
  --nextAction "Review the focused diff and validation output"
# Pass the last observed version when coordinating with another operator.
npm run spruce -- task update <taskId> \
  --status blocked \
  --blocker "Awaiting a repository-access decision" \
  --ifUpdatedAt "2026-08-09T04:00:00.000Z"
npm run spruce -- task update <taskId> \
  --status waiting_for_human \
  --humanGate "Approve the reviewed release decision"
npm run spruce -- task update <taskId> \
  --status blocked \
  --blocker "Waiting for a repository-access decision"
npm run spruce -- task resume <taskId> \
  --resumptionSummary "Repository access was granted" \
  --nextAction "Run the focused validation"
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

`--evidenceRefs` and `--links` accept comma-separated values. Resolvable `--links` include `agent_launch:<id>`, `agent_trial:<id>`, `artifact:<id>`, `fleet_run:<id>`, `launch_review:<id>`, `task_route:<id>`, and `trace:<id>`; they return only local record presence and status, and never reinterpret evidence as authority.

`--ifUpdatedAt` is optional on `claim`, `follow-up`, `handoff`, `resume`, and `update`; it is a local optimistic-concurrency guard, not an approval or execution token.

An Agent Launch may separately declare `executionTaskId` (CLI: `spruce agent launch <workspaceId> --executionTaskId <taskId>`). A Fleet Run or Squad may also declare the same optional reference when it is created, and propagates it to the Agent Launch records it creates. Evidence views list matching launches, Fleet Runs, and Squads as `declared_reference`; this is traceability metadata only and never validates work, changes task state, or grants authority.

For a resolvable local link, use one of the supported `kind:<id>` values above, where `<id>` is a single safe identifier (`A-Z`, `a-z`, `0-9`, `_`, or `-`, at most 160 characters). Paths, URLs, and IDs containing separators are reported as unsupported and are never passed to a local record reader.

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
| `GET` | `/v1/execution-tasks/:taskId/lineage` | Read the task's parent and Follow Up descendants as a diagnostic-only projection. |
| `POST` | `/v1/execution-tasks/:taskId/claim` | Claim with an owner mutex. |
| `POST` | `/v1/execution-tasks/:taskId/handoff` | Transfer a claimed non-terminal task through an auditable current-owner handoff. |
| `POST` | `/v1/execution-tasks/:taskId/resume` | Resume a blocked or waiting task with an explanation and next action. |
| `POST` | `/v1/execution-tasks/:taskId/update` | Update state, evidence, or a concrete human gate. |

`createGatewayClient()` provides matching high-level methods: `listExecutionTasks`, `executionTaskBoard`, `executionTaskContract`, `getExecutionTask`, `executionTaskEvidence`, `executionTaskClosure`, `executionTaskLineage`, `createExecutionTask`, `createExecutionTaskFollowUp`, `claimExecutionTask`, `handoffExecutionTask`, `resumeExecutionTask`, and `updateExecutionTask`.

## Workbench

The local Workbench has an **Execution Tasks** section with summary count, task board, raw task detail, and explicit actions:

- **Create Task** prompts for a bounded goal and optional next action.
- **Claim** records the fixed `workbench-user` owner through the normal Gateway route.
- **Handoff** appears only for a non-terminal claimed task. It records the matching current owner, a distinct incoming owner, bounded handoff context, and the new next action; it only updates the local control ledger.
- Every Workbench task mutation reads the task's current `updatedAt` first and sends it as `ifUpdatedAt`; a concurrent change produces a revision conflict for the operator to refresh, not a silent overwrite.
- **Need Decision** prompts for the mandatory concrete human gate.
- **Block** prompts for the mandatory concrete blocker; it is a coordination record only, not an escalation or an approval request.
- **Resume** is available only for blocked or human-waiting tasks and requires a resumption explanation plus a next action. It records control state only; it does not run a tool or Agent.
- **Complete** asks for browser confirmation plus a bounded completion summary, then only records control state and that audit statement.
- **Cancel** asks for browser confirmation plus a bounded cancellation reason; it only records task control state and never stops a running Agent or revokes an approval.
- **Closure** reads a terminal outcome statement and its preserved evidence snapshot.
- **Lineage** reads the parent and Follow Up chain of any task, including diagnostics for missing parent records or corrupted cycles.
- **Follow Up** appears on a terminal task and creates a new, linked control-state record; it does not reopen or execute the original task.
- **View** reads the stored ledger record.

The UI has no action that launches an agent, runs a tool, creates an approval, approves a ticket, or starts Fleet execution.

## Authority boundary

An Execution Task is metadata and audit state only. It never:

- launches an Agent or external CLI;
- executes a tool or workflow;
- grants, requests, consumes, or approves an approval ticket;
- changes ContextOS freshness or execution readiness;
- changes an Agent process owner, a workspace owner, or any approval authority merely because a task was handed off;
- turns a linked route, trial, trace, or Fleet Run into authorization.

Actual execution remains with the existing TrustKernel, ContextOS freshness checks, readiness evidence, exact approval tickets, Agent Launcher, and Fleet controls. This split is intentional: durable coordination makes work visible, while the existing execution boundaries continue to decide what may happen.

## Terminal snapshots and diagnostics

The snapshot records what the local typed-link resolver reported at the exact moment an operator completed or cancelled a task. It does **not** prove the external work, re-validate a tool result, stop a running Agent, revoke an approval, or authorize a later action. The task board exposes `closureAttention` when a terminal record lacks a snapshot, a captured typed link was already missing or unsupported, or a resolved linked record had an adverse status (`failed`, `blocked`, `cancelled`, or `requires_approval`) at closure time. It is a read-only migration/audit diagnostic, never an execution gate or a source of authority.

## Follow Up lineage

`Lineage` projects the persisted `followUpOf` records into ordered ancestors and breadth-first descendants. It is read-only and bounded (50 ancestors and 100 descendants). Missing parents, cycles, or limit truncation become diagnostic records; SpruceAgent never repairs them automatically or treats a lineage relation as execution authority.
