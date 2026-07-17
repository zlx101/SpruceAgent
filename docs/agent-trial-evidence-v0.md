# Agent Trial Evidence v0

Agent Trial v0 gives SpruceAgent a factual ledger for external Agent experiments. It exists because command discovery, a version string, a zero exit code, or an Agent's own summary does not prove that a task succeeded.

## Pass Rule

A trial is `passed` only when all four checks are true:

1. the Agent process exits with code `0`;
2. the expected workspace effect is observed;
3. an independent acceptance command passes;
4. execution was not blocked by policy.

Formally:

```text
passed = processCompleted
      && workspaceEffectObserved
      && acceptancePassed
      && policyAllowed
```

A zero process exit with no diff is a failed trial when the task expected a workspace change. Authentication errors, insufficient credit, timeouts, read-only policy blocks, missing diffs, and failed acceptance checks remain failures.

## Provenance

Trial v0 records supplied observations. Records therefore include:

```json
{
  "provenance": {
    "kind": "supplied_observation",
    "attestedByLauncher": false
  }
}
```

This distinction is intentional. A recorded outcome is not yet a Launcher-attested benchmark. Capability Probe exposes it as `status: reported` with a separate `reportedOutcome`. SpruceAgent must not market a reported pass as independently verified execution.

The next evidence level requires Agent Launcher to create the trial directly from immutable launch, Git, and acceptance artifacts.

## Stored Data

Trial v0 stores bounded structured fields only:

- adapter ID and provider;
- task ID and category, not the task prompt;
- process and acceptance exit codes;
- duration and changed-file count;
- policy status;
- derived checks and failure codes;
- supplied-observation provenance.

It does not store prompts, free-text notes, terminal logs, source diffs, credentials, model responses, or environment values.

## Statistics

`listAgentTrials` reports totals, pass/fail counts, pass rate, median duration, and latest reported outcome per adapter. These statistics are descriptive. They do not create a quality score or choose a winner.

Before quality-based routing is permitted, SpruceAgent needs repeated, comparable tasks segmented by category, model/version, repository class, context size, cost, latency, and acceptance quality.

## CLI

```text
spruce agent trial-record <adapterId> \
  --processExitCode <code> \
  --durationMs <milliseconds> \
  --changedFileCount <count> \
  --acceptanceStatus <passed|failed|not_run> \
  --acceptanceExitCode <code> \
  --policyStatus <allowed|blocked> \
  [--failureCode <code>]

spruce agent trials [--adapterId <adapterId>] [--status passed|failed]
spruce agent trial-detail <trialId>
spruce agent trial-contract
```

## Gateway

```text
GET  /v1/agent-trials
GET  /v1/agent-trials/:trialId
POST /v1/agent-trials
GET  /v1/agent-trials/contract
```

## Storage

```text
.spruceagent/
  agent-trial-index.jsonl
  agent-trials/
    agent_trial_*.json
```

## Safety Boundary

Agent Trial v0 never launches an Agent, calls a model, mutates Git, executes acceptance commands, or selects a winning adapter. It records and derives outcomes from supplied observations only.
