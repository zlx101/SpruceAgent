# Launch Review Gate v0

Launch Review Gate turns one or more Agent Launcher records into a local, evidence-backed change package. It is the review boundary between isolated agent execution and any future Git promotion workflow.

## Why this exists

Running several coding agents in isolated worktrees only solves execution isolation. SpruceAgent also needs a durable answer to:

- what each candidate actually ran;
- whether it completed successfully;
- which files changed;
- what the terminal and trace recorded;
- which candidate a reviewer selected and why.

Launch Review v0 makes those facts comparable without pretending that a deterministic score can judge semantic code quality.

## Contract

The `spruceagent.launch-review` contract accepts one to eight Agent Launch IDs and produces a `reviewable_change_package`.

Each candidate includes:

- adapter, workspace, command, status, and exit code;
- TrustKernel policy decision;
- Git status, name/status diff, diff stat, branch, and head;
- launch-time baseline status, current status delta, and a warning for pre-existing workspace changes;
- a bounded unified Diff excerpt plus SHA-256 evidence fingerprint when Git evidence is available;
- a bounded terminal log excerpt;
- trace ID, trace report route, and event count;
- artifacts associated with the launch trace;
- explicit risk signals.

The comparison matrix has no automatic recommendation. Tests and human review remain responsible for semantic correctness and code quality.

## Decisions

Supported outcomes are:

- `approved`: requires a completed, zero-exit candidate and records it as `approved_for_manual_followup`;
- `rejected`;
- `needs_changes`.

Every decision requires a reason. Approval identifies a candidate but has `effect: record_only`.

Before approval, SpruceAgent recomputes terminal and Diff fingerprints. If evidence changed after package creation, approval fails and a new review package is required. A `needs_changes` outcome is terminal for that package for the same reason.

Launch Review v0 never commits, merges, pushes, opens a pull request, or promotes workspace changes.

## Storage

```text
.spruceagent/
  launch-review-index.jsonl
  launch-reviews/
    launch_review_*.json
```

Creation and decision events are also appended to candidate traces and `.spruceagent/audit.jsonl`.

## Gateway API

```text
GET  /v1/launch-reviews
GET  /v1/launch-reviews/:reviewId
POST /v1/launch-reviews
POST /v1/launch-reviews/:reviewId/decision
GET  /v1/launch-reviews/contract
```

Create a comparison package:

```json
{
  "launchIds": ["agent_launch_a", "agent_launch_b"]
}
```

Record a decision:

```json
{
  "decision": "approved",
  "selectedLaunchId": "agent_launch_b",
  "reason": "Tests passed and the diff matches the requested scope."
}
```

## CLI

```text
spruce agent review <launchId> [moreLaunchIds...]
spruce agent reviews [--status pending_review]
spruce agent review-detail <reviewId>
spruce agent review-decide <reviewId> --decision approved --selectedLaunchId <launchId> --reason "reviewed"
spruce agent review-contract
```

The Workbench can create a review package from an Agent Launch and inspect existing packages. Multi-candidate creation and decisions are available through the Gateway and CLI in v0.

## Next boundary

The next orchestration layer should use measured task capabilities, installed adapter probes, policy constraints, context requirements, latency, and budget as routing inputs. It must keep planning, execution, research, and review roles explicit, and it must not infer a model's quality from brand name alone.
