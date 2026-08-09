# Agent Trial Evidence v0

Agent Trial v0 gives SpruceAgent a factual ledger for Agent execution experiments. It exists because command discovery, a version string, a zero exit code, or an Agent's own summary does not prove task success.

## Pass Rule

A Trial is `passed` only when all six checks are true:

1. the Agent process exits with code `0`;
2. the launch baseline has no pre-existing project changes;
3. the expected workspace effect is observed;
4. an independent acceptance command passes;
5. the workspace fingerprint remains stable while acceptance runs;
6. execution is allowed by policy.

```text
passed = processCompleted
      && baselineWorkspaceClean
      && workspaceEffectObserved
      && acceptancePassed
      && acceptanceWorkspaceStable
      && policyAllowed
```

A zero exit with no expected diff is a failure. An acceptance command that exits `0` but changes the workspace is also a failure.

## Provenance

Two evidence sources are explicit and never conflated:

- `supplied_observation`: bounded facts supplied through `trial-record`; not independently verified by SpruceAgent.
- `launcher_attested`: created from a successful Agent Launch plus a separately approved acceptance command and Git workspace fingerprints.

Capability Probe reports supplied-only evidence as `status: reported` and Launcher evidence as `status: attested`. When both exist for an adapter, the latest Launcher-attested outcome is the effective routing evidence. A supplied pass cannot override Launcher-attested evidence.

Attestation is a local execution-chain claim about one execution under one acceptance command. It is not a cryptographic signature, tamper-proof ledger, universal model-quality claim, benchmark ranking, or permission to merge or publish changes.

## Launcher Attestation Flow

```text
completed Agent Launch
  -> acceptance policy evaluation
  -> exact TrustKernel approval
  -> workspace fingerprint before acceptance
  -> bounded acceptance execution
  -> workspace fingerprint after acceptance
  -> Launcher-attested Trial
```

Attestation rejects Git mutation commands before approval. It never commits, pushes, merges, rebases, resets, cleans, checks out, switches, or creates worktrees.

## Stored Data

The Trial stores bounded structured fields only:

- adapter, task/category, launch ID, and provenance;
- process and acceptance exit codes;
- duration and changed-file count;
- policy and derived checks;
- command/output SHA-256 hashes and output byte counts for attested Trials;
- before/after workspace hashes and stability result.

It does not store prompts, free-text notes, terminal logs, source diffs, credentials, model responses, environment values, acceptance output, or acceptance command text. The exact command remains in the normal approval record required to authorize execution, not in the Trial evidence record.

## Statistics And Routing

`listAgentTrials` reports totals, pass/fail counts, provenance counts, pass rate, median duration, latest supplied outcome, latest attested outcome, and effective outcome per adapter. In execute mode, a failed effective outcome blocks that adapter. Trial statistics never select a winner automatically.

Quality-based selection still requires repeated comparable tasks segmented by category, model/version, repository class, context size, cost, latency, and acceptance quality.

## CLI

```text
spruce agent trial-attest <launchId> --command <acceptanceCommand> \
  [--approvalId <id>] [--timeoutMs <milliseconds>] [--noWorkspaceChange]

spruce agent trial-record <adapterId> \
  --processExitCode <code> \
  --durationMs <milliseconds> \
  --changedFileCount <count> \
  --baselineWorkspaceClean <true|false> \
  --acceptanceStatus <passed|failed|not_run> \
  --acceptanceExitCode <code> \
  --acceptanceWorkspaceStable <true|false> \
  --policyStatus <allowed|blocked> \
  [--failureCode <code>]

spruce agent trials [--adapterId <adapterId>] [--status passed|failed] [--attested true|false]
spruce agent trial-detail <trialId>
spruce agent trial-contract
spruce agent trial-attestation-contract
```

Manual observations must explicitly provide baseline cleanliness and acceptance workspace stability; omitted evidence cannot produce a passing Trial.

The first `trial-attest` call returns `requires_approval`. Approve that exact ticket, then either resume it from `spruce approval queue` or invoke the same launch with `--approvalId`. The CLI reloads the acceptance command exclusively from the exact server-side approval ticket, so a post-approval resume does not require re-entering or exposing the command:

```bash
npm run spruce -- approval queue --status ready_to_resume
npm run spruce -- agent trial-attest <launchId> --approvalId <approvedAttestationId>
```

## Gateway

```text
GET  /v1/agent-trials
GET  /v1/agent-trials/:trialId
POST /v1/agent-trials
GET  /v1/agent-trials/contract
POST /v1/agent-trials/attest
GET  /v1/agent-trials/attestation-contract
```

`GET /v1/agent-trials` accepts `adapterId`, `status`, and `attested=true|false` filters.

## Storage

```text
.spruceagent/
  agent-trial-index.jsonl
  agent-trials/
    agent_trial_*.json
```

## Safety Boundary

Agent Trial recording never launches an Agent or calls a model. Launcher attestation can execute only an independently approved, bounded acceptance command against the completed launch workspace. Neither path mutates Git history, promotes changes, publishes results, or performs automatic model selection.
