# ContextOS Staleness Guard v0

ContextOS Staleness Guard v0 checks whether the workspace still matches the latest ContextOS index before agent or workflow execution relies on indexed context.

## What It Does

- Reports `missing` when no workspace index exists.
- Reports `fresh` when indexed file metadata still matches active workspace files.
- Reports `stale` when eligible files were added, changed, or removed since the last index.
- Records a `context.staleness` trace event in agent runs and workflow runs.
- Supports execution blocking with `requireFreshContext`.

## CLI

Check freshness:

```bash
npm run spruce -- context freshness
```

Block an agent run when context is stale:

```bash
npm run spruce -- run "Review the project" --context "TrustKernel" --requireFreshContext
```

Block a workflow run when context is stale:

```bash
npm run spruce -- workflow run <workflowId> --requireFreshContext
```

## Why It Matters

SpruceAgent should not quietly act on stale evidence. This guard gives the runtime a concrete preflight check before using ContextOS as the basis for plans, workflows, approvals, and skills.

By default, the guard warns through run results and trace events. With `requireFreshContext`, it becomes a hard execution boundary.

## Limits

- v0 compares path, size, and mtime.
- It does not prove semantic correctness.
- Added files are reported only when eligible for indexing under current safety rules.
- Users should re-run `context index` after a stale report.
