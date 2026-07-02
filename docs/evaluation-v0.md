# Evaluation v0

SpruceAgent now has the first workflow evaluation layer.

Evaluation v0 answers a narrow but important question:

> After a workflow runs, what actually happened, what was blocked, and what should be inspected next?

## Known Facts

Before Evaluation v0, SpruceAgent could:

- compose durable workflows
- run context, tool, skill, and memory steps
- enforce TrustKernel policy
- create approval tickets
- write trace events

It could not turn a workflow trace into a concise run assessment.

## What Evaluation v0 Adds

An evaluation is a local JSON object stored under `.spruceagent/evaluations/`.

It contains:

- evaluation id
- trace id
- target kind
- workflow id when available
- status
- deterministic summary counts
- reliability score
- findings
- recommended next actions
- explicit limits

## Evaluation Status

| Status | Meaning |
| --- | --- |
| `passed` | completed without failed steps, blocked tools, or approval gates |
| `requires_approval` | at least one step or tool was blocked by approval |
| `needs_attention` | at least one step or tool failed or was blocked |
| `incomplete` | trace does not contain a workflow completion event |

## CLI

Evaluate a workflow run trace:

```bash
npm run spruce -- eval trace <traceId>
```

List evaluations:

```bash
npm run spruce -- eval list
```

Read an evaluation:

```bash
npm run spruce -- eval get <evaluationId>
```

## Safety Boundary

Evaluation v0 is intentionally read-only.

- it reads trace events only
- it never re-executes tools
- it never approves tickets
- it never changes workflow state
- it never claims semantic task quality

The reliability score is a deterministic heuristic. It is useful for sorting and triage, not as a scientific metric.

## Why It Matters

Workflow without evaluation becomes automation theater.

Evaluation v0 gives SpruceAgent a feedback surface:

```text
Run -> Trace -> Evaluation -> Skill/Workflow improvement
```

That is the safe path toward self-improving agents.

LLM planning should come after this surface exists, because the system needs a way to audit and compare agent behavior before adding more autonomy.
