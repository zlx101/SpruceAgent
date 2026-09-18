# Isolated Agent Workspace v0

SpruceAgent now prepares isolated agent workspaces from Agent Adapter run plans.

This is the next Orca-inspired control-plane step after the read-only Adapter Registry. The value is narrow and concrete: give each supported coding CLI run a separate git worktree before execution.

## What It Provides

- a stable `spruceagent.agent-workspaces` contract
- git worktree creation under `.spruceagent/worktrees`
- workspace records under `.spruceagent/agent-workspaces`
- a JSONL workspace index for Workbench, Gateway, and CLI
- adapter, goal, branch, workspace path, git state, launch preview, and review gate metadata
- explicit current-workspace records for approval-gated local adapters; these records do not claim the workspace is read-only
- audited workspace retirement; retired workspaces are blocked from later Launch, Fleet, Squad, and trial-attestation paths

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

Retire a completed workspace. This removes a clean managed Git worktree but retains the workspace record and Agent branch for audit and recovery:

```bash
npm run spruce -- agent retire-workspace <workspaceId> --reason "review complete"
```

Use `--deleteBranch` only when Git accepts a safe non-forced deletion of an already-merged Agent branch. If Git refuses that deletion, retirement still completes and records that the branch was retained. Retirement refuses worktrees with uncommitted changes. Current-workspace records are retired as metadata only and never remove the project directory.

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
POST /v1/agent-workspaces/:workspaceId/retire
GET  /v1/agent-workspaces/contract
```

## Workbench

The Agent Adapters panel now has:

- `Plan`: preview adapter isolation and launch metadata
- `Prepare`: create the isolated workspace from the current Launch Run goal and context
- `Agent Workspaces`: inspect prepared workspace records
- `Retire`: remove a clean managed worktree after confirmation while retaining the audit record

## Safety Boundary

Agent Workspace v0 is deliberately conservative:

- the workspace component does not start Codex CLI, Claude Code, OpenCode, Hermes, Gemini, or shell agents
- it does not commit
- it does not push
- it does not merge
- it does not approve changes
- it only creates local worktrees under `.spruceagent/worktrees`
- it records enough metadata for later Trace Report and review gates
- External CLI workspace preparation rejects a dirty source repository and stale attached ContextOS evidence
- retirement refuses uncommitted worktrees and never removes paths outside `.spruceagent/worktrees`
- retired workspace records cannot be used for new Agent Launch previews, execution approvals, or Squad member bindings

Agent Launcher v0.2 is the next gated layer. It can create launch previews, execute `local-shell-agent`, and execute verified external CLIs (currently Codex CLI and Claude Code) through External CLI Launcher v1 after exact TrustKernel approval. Cursor Agent, Grok CLI, and other external adapters remain disabled until their CLI contracts are verified.

## Why It Matters

SuperAgent needs parallelism, but useful parallelism starts with isolation.

```text
Goal -> Adapter Plan -> Isolated Workspace -> Gated Launch -> Diff -> Artifact -> Trace Report -> Review
```

This turns adapter plans into a real fleet substrate without compromising safety.
