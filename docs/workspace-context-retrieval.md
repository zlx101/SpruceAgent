# Workspace Index And Context Retrieval

SpruceAgent now has the first usable slice of ContextOS: local workspace indexing and lexical context retrieval.

This is intentionally narrow and verifiable. It is not a vector database, full RAG system, OAuth personal data layer, or team knowledge graph.

## Known Facts

The current SpruceAgent core already has:

- local workspace store
- memory
- trace
- policy decisions
- approval tickets
- policy-governed tool execution

Before this feature, it did not have a way to inspect and retrieve relevant project files as context.

## What This Adds

```text
workspace files
  -> safe text-file scan
  -> workspace-index.json
  -> lexical search
  -> context pack
```

The index stores:

- relative path
- extension
- byte size
- mtime
- SHA-256 hash
- line count
- text content

The search returns:

- path
- score
- size
- line count
- hash
- snippet

## Safety Boundaries

The indexer skips:

- `.spruceagent`
- `.git`
- `node_modules`
- build/cache directories
- unsupported extensions
- files larger than the configured max size
- likely binary files

Default max file size:

```text
256 KB
```

## CLI

Index the current workspace:

```bash
npm run spruce -- context index
```

Search indexed context:

```bash
npm run spruce -- context search "TrustKernel" --limit 3
```

Show an indexed document:

```bash
npm run spruce -- context show README.md
```

Create a context pack:

```bash
npm run spruce -- context pack "approval tickets"
```

## What This Does Not Solve Yet

This feature does not yet provide:

- semantic embedding search
- incremental indexing
- file watchers
- PDF parsing
- OCR
- personal app integrations
- team knowledge permissions
- cross-workspace retrieval

Those should be added only after the local index/search path remains reliable under tests and real use.

## Why It Matters

This is the first practical ContextOS layer.

It lets future agent loops retrieve local project facts before planning or executing. That reduces hallucination risk and makes recommendations more grounded in the actual repository.
