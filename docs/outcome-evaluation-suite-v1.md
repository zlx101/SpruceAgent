# Outcome Evaluation Suite v1

Outcome Evaluation Suite v1 adds deterministic, repeatable task-level evidence above the existing trace evaluator.

`Evaluation v0` answers whether a trace contains failures, policy gates, or approvals. Outcome Evaluation Suite v1 answers a narrower but stronger question:

> Did this existing trace and its declared local evidence satisfy this immutable task fixture?

## Boundary

```text
immutable fixture
  + existing trace
  + optional Fleet record
  + explicitly named workspace artifacts
  -> deterministic checks
  -> safety vetoes
  -> durable outcome result
  -> repeated-run summary
```

It reads evidence only. It never runs an Agent, replays tools, approves tickets, cancels runs, chooses a Fleet winner, merges branches, or promotes a skill.

## Fixtures

Fixtures are immutable JSON records under:

```text
.spruceagent/outcome-fixtures/
.spruceagent/outcome-fixture-index.jsonl
```

Each fixture has a SHA-256 fingerprint over its name, description, validators, and safety policy. Reading a fixture recomputes that fingerprint, so a manually changed fixture is rejected instead of silently becoming a different benchmark under the same identity.

Supported validator kinds:

| Kind | Deterministic evidence |
| --- | --- |
| `trace_event` | Event type count is inside declared bounds. |
| `completion_status` | The final event of a declared type has an allowed status. |
| `workspace_file` | A named local file exists or contains declared text. |
| `json_file` | A named local JSON object has required keys and declared values. |
| `fleet_status` | An attached Fleet Run is in an allowed status. |
| `fleet_candidates` | An attached Fleet Run meets completed/failed/cancelled candidate bounds. |

Workspace paths must be relative to the current project. `.git`, `.spruceagent`, and `node_modules` are blocked, as are traversal and symlink escapes.

## Safety Vetoes

Every fixture includes a deterministic safety policy. Defaults are conservative:

- any recorded TrustKernel `deny` decision fails the result;
- risk above `high` fails the result;
- callers may declare additional forbidden trace event types.

Safety vetoes are recorded separately from ordinary assertion failures. A fixture can permit a known risk level only by explicitly changing its policy; this is not inferred from a successful-looking final status.

## Repeated Evidence

Results are written to:

```text
.spruceagent/outcome-results/
.spruceagent/outcome-result-index.jsonl
```

The fixture summary reports:

- `passAtLeastOne`: Pass@k over recorded completed attempts;
- `passAll`: Pass^k over all recorded attempts;
- `stablePass`: at least two attempts, all passed;
- pass/fail/invalid counts, safety veto count, and observed average trace duration.

One passing attempt is intentionally not called stable. Token usage is shown only when already present in trace evidence; v1 does not invent a provider price or cost estimate.

## CLI

Create a fixture:

```bash
npm run spruce -- outcome fixture-create \
  --name "Completed review workflow" \
  --validators '[
    {"kind":"trace_event","eventType":"workflow.completed","minimumCount":1},
    {"kind":"completion_status","eventType":"workflow.completed","allowedStatuses":["completed"]},
    {"kind":"json_file","path":"report.json","requiredKeys":["status"],"expectedValues":{"status":"ready"}}
  ]'
```

Evaluate existing evidence without re-running it:

```bash
npm run spruce -- outcome evaluate <fixtureId> --trace <traceId>
npm run spruce -- outcome evaluate <fixtureId> --fleet <fleetRunId>
npm run spruce -- outcome summary <fixtureId>
```

Other commands:

```bash
npm run spruce -- outcome contract
npm run spruce -- outcome fixtures
npm run spruce -- outcome fixture <fixtureId>
npm run spruce -- outcome results --fixture <fixtureId> --status passed
npm run spruce -- outcome result <resultId>
```

## Gateway

```text
GET  /v1/outcomes/contract
GET  /v1/outcomes/fixtures
POST /v1/outcomes/fixtures
GET  /v1/outcomes/fixtures/:fixtureId
POST /v1/outcomes/fixtures/:fixtureId/evaluate
GET  /v1/outcomes/fixtures/:fixtureId/summary
GET  /v1/outcomes/results?fixtureId=<fixtureId>&status=passed
GET  /v1/outcomes/results/:resultId
```

The Gateway client exposes matching `outcomeEvaluationContract`, fixture, evaluation, result, and summary methods.

## What Comes Next

This is the prerequisite for, not a substitute for, richer evaluation. Future work may add sandboxed replay, golden task collections in the repository, outcome-specific validators, external judge calibration, and provider cost accounting. None of those should bypass TrustKernel or turn a Fixture result into automatic Fleet merge or Skill promotion authority.
