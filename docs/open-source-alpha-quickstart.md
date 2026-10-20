# Open Source Alpha Quickstart

This is the shortest path to get a local result on one machine and one workspace after cloning the repository.

Daily closed loop:

```text
onboard → status.daily → open the dry-run trace / artifact
```

## Requirements

- Node.js 20 or newer
- npm

No external LLM key is required for the first result.

## First result

```bash
npm run spruce -- onboard
npm run spruce -- status
npm run spruce -- run detail <traceId>
npm run spruce -- artifact list --traceId <traceId>
```

`onboard` indexes the workspace, runs a mock dry-run (no tools, no model), and creates a reviewable workflow draft. It does not start Gateway, save the workflow, or require an API key. `status.daily` says whether you can continue. The dry-run `traceId` is in the onboard ledger. If detail or artifacts cannot open it, the path is not done.

## Verify The Environment

Contributor checks come after the first result.

```bash
npm run doctor
```

`doctor` checks:

- Node.js version
- package metadata
- core source paths
- CLI and Workbench assets
- temporary `.spruceagent` store initialization
- git repository presence

A missing `.git` directory is a warning, not a runtime failure.

`spruce onboard status` shows pending approvals and resumable runs after a restart.

## Run The Full Local Release Gate

For the same verification sequence used by CI:

```bash
npm run release:verify
```

This runs `doctor`, deployment preflight, syntax checks, the full test suite, the daily-loop smoke, and the alpha smoke flow. It stops on the first failing command, prints a machine-readable release verification summary, and records the summarized result under `.spruceagent/release-verifications/`.

After a verification record exists, capture a local release artifact manifest:

```bash
npm run spruce -- release manifest --verificationId <verificationId>
```

This records release material paths, sizes, SHA-256 checksums, source revision, and the linked verification summary under `.spruceagent/release-artifacts/`. It does not publish, push, deploy, install dependencies, or rerun verification.

## Verify Deployment Readiness

```bash
npm run deploy:preflight
```

Deployment preflight checks the local long-running alpha runtime boundary:

- required npm scripts
- `.spruceagent` store paths and writeability
- `.gitignore` protection for runtime state
- Gateway host and port configuration
- Gateway token presence without exposing the token
- Workbench and showcase static assets
- optional Autopilot foreground runner interval
- pending operator attention before unattended use

## Run The Test Suite

```bash
npm test
```

## Run The Daily Smoke

```bash
npm run daily:smoke
```

The daily smoke creates a temporary workspace, runs onboard, reads `status.daily`, and opens the dry-run trace and artifact. It fails if the trace cannot be opened.

## Run The Alpha Smoke Flow

```bash
npm run alpha:smoke
```

The smoke flow creates a temporary workspace and runs:

```text
Context Index
  -> Agent Run
  -> Trace-to-Skill Extraction
  -> Skill Evaluation
  -> Skill Promotion
  -> Replay Fixture
  -> Static Replay
  -> Skill Package Export
```

It does not require a network call or a real LLM provider.

To keep the temporary workspace for inspection:

```bash
npm run alpha:smoke -- --keep
```

## Start The Workbench

Create a local Gateway token:

```bash
npm run spruce -- gateway token
```

For a bounded recurring control task, create and inspect an Autopilot rule manually first. It only creates open local Execution Tasks; it never starts an Agent or runs tools:

```bash
npm run spruce -- autopilot create --name "Daily evidence review" --goal "Review the prior development evidence" --intervalMinutes 1440
npm run spruce -- autopilot due
npm run spruce -- autopilot run-due
```

Start the Gateway normally with no scheduler:

```bash
npm run spruce -- gateway serve
```

Or, instead, attach the opt-in foreground poller to the local Gateway process with `--autopilotPollMs`:

```bash
npm run spruce -- gateway serve --autopilotPollMs 60000
```

Stop with Ctrl+C. That closes Gateway and marks the local runtime record `stopped`.

Open the daily Workbench surface:

```text
http://127.0.0.1:7357/workbench
```

Connect with the Gateway token. System Overview includes Onboarding; Run Onboarding is the same mock dry-run path as `spruce onboard`. It does not save the workflow draft or execute tools. Pending approvals and resumable runs stay on Queue and Resumable. Showcase is a public static page, not a daily entrance.

## Safety Boundary

The alpha path stays local-first:

- no tool executes without TrustKernel policy
- approval-gated actions remain blocked until approved
- imported skill packages become candidates only
- replay fixtures are static and do not execute tools
- LLM provider calls are optional
- the local doctor, preflight, Gateway, and Workbench path does not require a model invocation
