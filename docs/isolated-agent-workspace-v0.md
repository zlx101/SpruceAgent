# Isolated Agent Workspace v0

SpruceAgent now prepares isolated agent workspaces from Agent Adapter run plans.

This is the next Orca-inspired control-plane step after the read-only Adapter Registry. The value is narrow and concrete: give each future CLI agent run a separate git worktree before any external agent is allowed to execute.

## What It Provides

- a stable `spruceagent.agent-workspaces` contract
- git worktree creation under `.spruceagent/worktrees`
- workspace records under `.spruceagent/agent-workspaces`
- a JSONL workspace index for Workbench, Gateway, and CLI
- adapter, goal, branch, workspace path, git state, launch preview, and review gate metadata
- readonly fallback records for adapters that do not require git worktrees

## CLI

Prepare a workspace:

```bash
npm run spruce -- agent prepare codex-cli --goal "Implement task" --context "Context query"
```

List prepared workspaces:

```bash
npm run spruce -- agent workspaces
```

Read one workspace:

```bash
npm run spruce -- agent workspace <workspaceId>
```

Read the contract:

```bash
npm run spruce -- agent workspace-contract
```

## Gateway

Routes:

```text
GET  /v1/agent-workspaces
GET  /v1/agent-workspaces/:workspaceId
POST /v1/agent-workspaces
GET  /v1/agent-workspaces/contract
```

## Workbench

The Agent Adapters panel now has:

- `Plan`: preview adapter isolation and launch metadata
- `Prepare`: create the isolated workspace from the current Launch Run goal and context
- `Agent Workspaces`: inspect prepared workspace records

## Safety Boundary

Agent Workspace v0 is deliberately conservative:

- it does not start Codex CLI, Claude Code, OpenCode, Hermes, Gemini, or shell agents
- it does not commit
- it does not push
- it does not merge
- it does not approve changes
- it only creates local worktrees under `.spruceagent/worktrees`
- it records enough metadata for later Trace Report and review gates

External coding agent execution remains disabled in v0. Agent Launcher v0 is the next gated layer: it can create launch previews and execute only `local-shell-agent` commands through TrustKernel approval checks.

## Why It Matters

SuperAgent needs parallelism, but useful parallelism starts with isolation.

```text
Goal -> Adapter Plan -> Isolated Workspace -> Gated Launch -> Diff -> Artifact -> Trace Report -> Review
```

This turns adapter plans into a real fleet substrate without compromising safety.
