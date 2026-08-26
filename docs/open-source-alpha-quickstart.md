# Open Source Alpha Quickstart

This is the shortest path to verify SpruceAgent after cloning the repository.

## Requirements

- Node.js 20 or newer
- npm

No external LLM key is required for the alpha smoke path.

## Verify The Environment

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

## Run The Full Local Release Gate

For the same verification sequence used by CI:

```bash
npm run release:verify
```

This runs `doctor`, deployment preflight, syntax checks, the full test suite, and the alpha smoke flow. It stops on the first failing command and prints a machine-readable release verification summary.

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

Open:

```text
http://127.0.0.1:7357/workbench
```

## Safety Boundary

The alpha path stays local-first:

- no tool executes without TrustKernel policy
- approval-gated actions remain blocked until approved
- imported skill packages become candidates only
- replay fixtures are static and do not execute tools
- LLM provider calls are optional
