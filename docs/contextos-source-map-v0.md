# ContextOS Source Map v0

SpruceAgent now exposes source maps for context-backed work.

Source Map v0 answers a practical question:

> What did SpruceAgent use as evidence when it drafted or ran this workflow?

## What It Adds

Core exports:

- `createSourceMap(store, input)`

Source types:

- `workspace`
- `memory`
- `skill`
- `llm`

Each source includes:

- `type`
- `path`
- `title`
- `score`
- `snippet`
- `hash`
- `bytes`
- `lineCount`
- `indexedAt`
- `freshness`
- `confidence`
- `metadata`

## Where It Appears

Workflow Builder drafts now include:

- `sourceMap`
- `review.sourceCount`
- workflow metadata summary after save

Run Detail now includes:

- `sourceMap` built from agent run context, selected skill, and LLM draft

Workflow Detail now includes:

- `sourceMap` built from workflow context step events

Workbench now renders Source Map panels in:

- Workflow Builder draft review
- Run Detail
- Workflow Run Detail

## Safety Boundary

Source Map v0 is evidence metadata, not proof of correctness.

- workspace confidence is based on lexical retrieval score
- freshness is based on index/source timestamps
- LLM source means "provider draft influenced planning", not that the claim is true
- source snippets are not redacted in v0
- source maps do not grant execution authority

## Why It Matters

SpruceAgent's trust model depends on inspectability.

The user should not only see what the agent did. They should see what context influenced it.

This supports the larger loop:

```text
Goal -> ContextOS -> Source Map -> Workflow Builder -> Step Review -> TrustKernel -> Run -> Trace
```

## Current Limits

Source Map v0 does not yet provide:

- entity graph
- source sensitivity labels
- citation-level line ranges
- memory search integration by default
- source redaction policy
- visual graph view

Those should come after source visibility is stable.
