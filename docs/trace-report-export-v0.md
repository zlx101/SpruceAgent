# Trace Report / Artifact Export v0

SpruceAgent now exposes a read-only trace report projection for agent and workflow runs.

The report composes existing audit surfaces instead of creating a new execution path:

- Run Detail / Workflow Detail
- ContextOS Source Map
- Approval Queue and approval tickets
- Tool results
- Evaluations
- Run Artifact Store
- Timeline events

## CLI

Export JSON:

```bash
npm run spruce -- report trace <traceId>
```

Export Markdown:

```bash
npm run spruce -- report trace <traceId> --format markdown
```

Write to a file:

```bash
npm run spruce -- report trace <traceId> --format markdown --out trace-report.md
```

Include raw trace events only when explicitly needed:

```bash
npm run spruce -- report trace <traceId> --includeRaw
```

## Gateway

Read a report:

```text
GET /v1/reports/traces/:traceId
```

Read a Markdown report payload:

```text
GET /v1/reports/traces/:traceId?format=markdown
```

Read the contract:

```text
GET /v1/reports/contract
```

## Safety Boundary

Trace Report v0 is conservative by design:

- it is read-only
- it does not approve, reject, resume, or execute tools
- it does not mutate files
- it does not copy workspace outputs
- raw trace events are excluded unless `includeRaw=true` or `--includeRaw` is used
- large payloads are not redacted in v0 when raw output is requested

## Why It Matters

Artifact Store made run outputs visible. Trace Report makes a run portable as an evidence packet.

This is the first exportable audit unit for SpruceAgent:

```text
Trace -> Source Map -> Decisions -> Tool Results -> Artifacts -> Timeline -> Report
```

That matters for personal work, team handoff, debugging, public demos, and future SuperAgent reliability loops.
