# Run Artifact Store v0

Run Artifact Store v0 gives SpruceAgent a read-only execution journal for agent runs and workflow runs.

## What It Does

- Reconstructs run artifacts from local traces, approval tickets, evaluations, and memory references.
- Lists artifacts across agent runs and workflow runs.
- Reads artifact detail by stable artifact id.
- Adds artifact references to Run Detail and Workflow Detail.
- Exposes artifacts through CLI, Gateway, and Gateway Client.

## Artifact Kinds

- `run_summary`: completed agent or workflow run snapshot.
- `tool_result`: tool execution result captured in trace events.
- `approval_decision`: approval ticket lifecycle record.
- `continuation_result`: resume attempt result.
- `evaluation_report`: trace evaluation report.
- `memory_write`: memory record created by a run or workflow step.

## CLI

```bash
npm run spruce -- artifact list
npm run spruce -- artifact list --traceId <traceId>
npm run spruce -- artifact list --kind tool_result
npm run spruce -- artifact get <artifactId>
npm run spruce -- artifact contract
```

## Gateway

```http
GET /v1/artifacts
GET /v1/artifacts?traceId=<traceId>
GET /v1/artifacts?kind=tool_result
GET /v1/artifacts/:artifactId
GET /v1/artifacts/contract
```

## Safety Boundary

Artifacts v0 is read-only. It does not execute tools, approve or reject tickets, resume runs, mutate workflows, write files, or copy workspace outputs.

Artifact list items stay lightweight. Artifact detail can expose existing local trace payloads, tool outputs, approval records, evaluations, and memory records. v0 does not redact large outputs or file contents in detail views.

## Why It Matters

SpruceAgent needs durable task understanding, not just live execution state. Run Artifact Store v0 turns each run into a reviewable execution journal:

```text
Run / Workflow -> Tool Results -> Approvals -> Resume Results -> Evaluations -> Memory Writes -> Artifacts
```

This becomes the base layer for later team handoff, reproducible task reports, artifact search, and publishable run evidence.

## Limits

- v0 is a deterministic projection over local state.
- v0 does not create separate artifact files.
- v0 artifact IDs are stable as long as trace, approval, and evaluation ids remain stable.
- v0 detail views can include raw payloads from existing traces.
