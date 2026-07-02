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

Start the Gateway:

```bash
npm run spruce -- gateway serve
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
