# ContextOS Incremental Index v0

ContextOS Incremental Index v0 lets SpruceAgent reuse unchanged workspace documents across indexing runs.

## What It Does

When `buildWorkspaceIndex` runs and a previous index exists, ContextOS compares each active file against the previous document metadata. If the file size, mtime, max byte limit, and redaction pattern set match, the previous indexed document is reused without rereading or re-redacting the file.

The index records:

- `previousIndexedAt`
- `reusedDocumentCount`
- `addedCount`
- `changedCount`
- `unchangedCount`
- `deletedCount`
- `skippedCount`
- path lists for added, changed, unchanged, deleted, and skipped files

## Why It Matters

SpruceAgent depends on workspace context for project understanding, workflow drafting, skill creation, and run evaluation. Incremental indexing gives future long-running agents a concrete way to know what changed since the last context snapshot.

This is also the first step toward file watching, stale context warnings, and task resumption that can notice when evidence has changed.

## Boundaries

- Reuse is disabled when `maxBytes` changes.
- Reuse is disabled when the redaction pattern set changes.
- `deleted` means a previous document is no longer in the active index. It may have been deleted, ignored, or skipped by a new safety rule.
- v0 still scans the file tree; it avoids rereading unchanged document content.

## CLI

```bash
npm run spruce -- context index
```

The command prints the incremental summary together with safety metadata.
