# Fleet Run Orchestrator v0

Fleet Run Orchestrator v0 turns one executable Task Route assignment into one to five comparable Codex candidates. Each candidate receives the same approved goal in a separate Git worktree, runs through its own exact approval ticket, and ends in one Launch Review evidence matrix.

The v0 unit of comparison is deliberately narrow: one role, one adapter, one goal, multiple isolated candidates. Different roles are not presented as competing solutions because their diffs are not semantically comparable.

## State Flow

```text
Task Route (execute/routed)
  -> prepare isolated candidate worktrees
  -> request exact launcher approvals
  -> explicit batch approval
  -> bounded parallel execution
  -> collect launch, terminal, Git, and trace evidence
  -> Launch Review evidence matrix
```

Fleet records use these operational states:

```text
preparing -> prepared -> awaiting_approval -> approved -> running
running -> completed | partial_failure | failed | cancelled
```

Preparation and approval failures remain persisted. Worktrees are never silently deleted.

## Hard Limits

- Adapter: `codex-cli` only.
- Candidate count: 1-5.
- Parallel active candidates: 1-3.
- Route: must already be `mode=execute` and `status=routed`.
- Source repository: must satisfy the Codex workspace clean-source gate.
- Context-grounded candidates: require a fresh ContextOS index.
- Every candidate: separate Agent Workspace and Agent Launcher approval.
- Result: evidence matrix only; no automatic winner.

## Approval

Approval requests build every final Codex invocation without starting a process. Batch approval is a separate operation and requires both:

```text
confirmation = approve_all_invocations
reason       = a non-trivial review reason
```

The batch action validates that every pending ticket belongs to the expected candidate workspace before approving any ticket. Execution reuses the timeout and output limit that were part of the approved invocation.

## Cancellation

When execution and cancellation occur in the same long-running Gateway process, Fleet Run uses `AbortController` to terminate active candidate process trees. Candidates not yet started are marked cancelled, and unused pending or approved tickets are made non-executable.

A standalone CLI execution command owns a short-lived process. A second CLI process cannot reach its in-memory process controllers; it can still cancel a fleet before execution, but live cancellation should use Gateway.

Cancellation preserves worktrees, launch records, terminal evidence, traces, and any partial changes for review. It does not run destructive Git cleanup.

## CLI

```powershell
spruce agent route --goal "Implement the task" --roles coding --mode execute --refreshCapabilities
spruce fleet create <routeId> --role coding --candidates 2 --parallel 2 --context "relevant code" --executionTaskId <taskId>
spruce fleet approvals <fleetRunId> --timeoutMs 600000
spruce fleet approve <fleetRunId> --confirm approve_all_invocations --reason "Reviewed exact invocations"
spruce fleet execute <fleetRunId>
spruce fleet detail <fleetRunId>
spruce fleet list
spruce fleet contract
```

Use the Gateway cancel route for an active fleet:

```text
POST /v1/fleet-runs/:fleetRunId/cancel
```

## Gateway

```text
GET  /v1/fleet-runs
GET  /v1/fleet-runs/contract
GET  /v1/fleet-runs/:fleetRunId
POST /v1/fleet-runs
POST /v1/fleet-runs/:fleetRunId/approvals
POST /v1/fleet-runs/:fleetRunId/approve
POST /v1/fleet-runs/:fleetRunId/execute
POST /v1/fleet-runs/:fleetRunId/cancel
```

All routes require the local Gateway bearer token.

## Execution-task reference

`executionTaskId` is optional, safe-identifier metadata that can be supplied when a Fleet Run is created. SpruceAgent records it on the Fleet Run, its trace and audit events, and every approval or execution Agent Launch created for the fleet. This lets an Execution Task's evidence view collect the whole candidate set through declared launch references. The value is deliberately reference-only: it does not validate the task, change task state, grant approval, or authorize Fleet execution.

## Evidence Level

Automated tests use temporary Git repositories and an injected process runner. They verify isolated candidates, exact batch approval, bounded parallelism, cancellation, approval revocation, result collection, and multi-candidate Diff review without calling Codex or an LLM.

This proves the orchestration contract and state transitions. It does not prove model quality. Real provider verification is tracked separately and must identify the provider, model, request contract, response evidence, cost/usage when available, and whether the call was live or mocked.
