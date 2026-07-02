# Run Preflight / Auto-Reindex v0

Run Preflight / Auto-Reindex v0 gives SpruceAgent a deterministic readiness check before an agent run or workflow run executes.

## What It Does

- Checks ContextOS freshness before execution.
- Reports `passed`, `warning`, or `blocked`.
- Blocks execution when `requireFreshContext` is set and the final ContextOS index is stale or missing.
- Optionally refreshes the local ContextOS index when `refreshContext` is set.
- Records a `run.preflight` trace event before planning or workflow steps continue.

## CLI

Inspect runtime readiness:

```bash
npm run spruce -- context preflight
```

Require fresh context and refresh it first when needed:

```bash
npm run spruce -- run "Review this workspace" --context "ContextOS" --requireFreshContext --refreshContext
```

Use the same gate for workflows:

```bash
npm run spruce -- workflow run <workflowId> --requireFreshContext --refreshContext
```

## Gateway

The local gateway exposes:

```http
POST /v1/preflight
```

Example body:

```json
{
  "requireFreshContext": true,
  "refreshContext": true
}
```

## Safety Boundary

`refreshContext` only rebuilds the local ContextOS index. It does not execute tools, call external providers, approve tickets, mutate workflow definitions, or bypass TrustKernel policy.

Preflight v0 is intentionally narrow: it gives the runtime a concrete go/no-go check before evidence-grounded execution, while keeping side effects limited to local index refresh when explicitly requested.

## Limits

- v0 checks deterministic local readiness only.
- Fresh context means file metadata matches the latest index; it does not prove semantic correctness.
- More gates can be added later, including approval readiness, candidate-plan readiness, provider availability, and workspace risk posture.
