# Agent Adapter Registry v0

SpruceAgent has a read-only registry and planner for external CLI agent adapters. Process execution remains a separate launcher responsibility.

This is the first Orca-inspired building block for an Agent Fleet control plane. The goal is not to copy an ADE, but to let SpruceAgent safely reason about external coding agents before it launches them.

## What It Provides

Built-in adapter specs:

- Codex CLI
- Claude Code
- OpenCode
- Hermes Agent
- Gemini CLI
- Local Shell Agent

Each adapter describes:

- provider and command name
- adapter kind
- strengths and limitations
- recommended isolation mode
- prompt delivery style
- output capture expectation
- safety notes

## CLI

List adapters:

```bash
npm run spruce -- agent adapters
```

Read one adapter:

```bash
npm run spruce -- agent adapter codex-cli
```

Preview an isolated run plan:

```bash
npm run spruce -- agent plan codex-cli --goal "Implement search filters" --context "Run Inbox"
```

Read the contract:

```bash
npm run spruce -- agent contract
```

Prepare an isolated workspace from a plan:

```bash
npm run spruce -- agent prepare codex-cli --goal "Implement search filters" --context "Run Inbox"
```

## Gateway

Routes:

```text
GET  /v1/agent-adapters
GET  /v1/agent-adapters/:adapterId
POST /v1/agent-adapters/:adapterId/plan
GET  /v1/agent-adapters/contract
GET  /v1/agent-workspaces
GET  /v1/agent-workspaces/:workspaceId
POST /v1/agent-workspaces
GET  /v1/agent-workspaces/contract
GET  /v1/agent-launches
GET  /v1/agent-launches/:launchId
POST /v1/agent-launches
GET  /v1/agent-launches/contract
```

## Workbench

The Workbench now has an Agent Adapters section.

The `Plan` action uses the current Launch Run goal and context query to preview:

- selected adapter
- isolation mode
- branch name
- workspace path
- command preview
- required review gate
- ContextOS source map

The `Prepare` action creates an isolated Agent Workspace record and, for coding CLI adapters, a git worktree under `.spruceagent/worktrees`.

The `Launch Preview` action creates an Agent Launcher record without executing an external CLI.

## Safety Boundary

Adapter Registry v0 is intentionally conservative:

- the registry itself does not start external CLI agents
- plan preview does not create worktrees or branches
- it does not mutate files
- it does not merge changes
- it only returns adapter specs and execution plan previews

Agent Workspace v0 is the separate, explicit step that may create a local git worktree. It still does not execute external CLI agents, commit, push, merge, or approve changes.

Agent Launcher v0.2 is the separate, explicit step after workspace preparation. It executes `local-shell-agent` commands and Codex CLI through External CLI Launcher v1 after TrustKernel policy and exact approval. Other external coding CLI adapters remain preview-only.

All external execution must go through TrustKernel, isolated workspaces, artifact capture, diff review, and Trace Report export. See `docs/external-cli-launcher-v1.md`.

Capability Probe and Task Router v0 now distinguish declared adapters from locally observed availability and produce explainable route drafts. See `docs/capability-probe-task-router-v0.md`.

## Why It Matters

Orca shows that parallel CLI agents become valuable when they are isolated, visible, and comparable.

SpruceAgent should absorb that lesson through its own architecture:

```text
Goal -> Adapter Plan -> Isolated Workspace -> Agent Run -> Diff -> Artifact -> Trace Report -> Review
```

This moves SpruceAgent from a single-agent tool toward a trustworthy SuperAgent operating system.
