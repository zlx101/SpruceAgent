# Agent Launcher v0.2

SpruceAgent now has a gated launcher layer for prepared Agent Workspaces.

This is the execution boundary after Agent Adapter Registry and Isolated Agent Workspace. It executes `local-shell-agent` commands and the fixed Codex CLI v1 invocation after TrustKernel policy and exact approval checks. Other external adapters remain preview-only.

## What It Provides

- `spruceagent.agent-launcher` contract
- launch records under `.spruceagent/agent-launches`
- launch index under `.spruceagent/agent-launch-index.jsonl`
- Gateway and CLI launch entry points
- terminal log capture
- git status and diff summary capture
- trace events for launch planned, blocked, approval required, and completed states
- Artifact projection for agent launch records

## CLI

Preview a launch without execution:

```bash
npm run spruce -- agent launch <workspaceId>
```

Execute a local-shell-agent command after approval:

```bash
npm run spruce -- agent launch <workspaceId> --execute --command "node -v"
```

If approval is required, approve the ticket and re-run:

```bash
npm run spruce -- approval approve <approvalId>
npm run spruce -- agent launch <workspaceId> --execute --command "node -v" --approvalId <approvalId>
```

Execute a prepared Codex workspace after approval. Codex commands and arguments cannot be supplied by the caller:

```bash
npm run spruce -- agent launch <workspaceId> --execute
npm run spruce -- approval approve <approvalId>
npm run spruce -- agent launch <workspaceId> --execute --approvalId <approvalId>
```

List launches:

```bash
npm run spruce -- agent launches
```

Read one launch:

```bash
npm run spruce -- agent launch-detail <launchId>
```

## Gateway

Routes:

```text
GET  /v1/agent-launches
GET  /v1/agent-launches/:launchId
POST /v1/agent-launches
GET  /v1/agent-launches/contract
GET  /v1/external-cli-launcher/contract
```

Completed launches can be assembled into single- or multi-candidate evidence packages through Launch Review Gate v0. See `docs/launch-review-gate-v0.md`.

## Workbench

Workbench shows Agent Launches and can create launch previews from prepared workspaces.

It does not expose arbitrary command execution in the browser UI. Execution remains explicit through CLI or Gateway payloads and still requires TrustKernel approval when policy requires it.

## Safety Boundary

Agent Launcher v0.2:

- executes Codex CLI only through the fixed, shell-free External CLI Launcher v1 contract
- keeps Claude Code, OpenCode, Hermes, Gemini, and other external coding agents disabled
- only accepts user-supplied commands for `local-shell-agent`
- routes commands through TrustKernel policy
- creates approval tickets for shell execution
- blocks git commit, push, merge, rebase, reset, and worktree mutation commands
- records terminal logs and diff summaries
- never commits, pushes, merges, or approves changes

## Why It Matters

SpruceAgent needs execution, but execution must be observable and reviewable before it becomes autonomous.

```text
Adapter Plan -> Isolated Workspace -> Gated Launch -> Terminal Log -> Diff Summary -> Artifact -> Trace Report -> Review
```

See `docs/external-cli-launcher-v1.md` for the Codex runtime evidence, fixed invocation, environment boundary, output limits, and current test evidence.
