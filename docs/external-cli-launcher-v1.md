# External CLI Launcher v1

External CLI Launcher v1 is SpruceAgent's first controlled bridge to an installed coding agent. It enables Codex CLI only. Claude Code, OpenCode, Hermes Agent, and Gemini CLI remain preview-only until their installed command contracts are independently verified and implemented.

## Verified runtime contract

The implementation was derived from the locally installed runtime, not from assumed flags:

```text
codex-cli 0.141.0
codex exec [OPTIONS] [PROMPT]
```

The installed `codex exec --help` confirms stdin prompt delivery (`-`), `--cd`, `--sandbox workspace-write`, `--ephemeral`, `--json`, and `--color never`. SpruceAgent fixes those options internally:

```text
codex exec --sandbox workspace-write --ephemeral --json --color never --cd <worktree> -
```

This is evidence for the installed version on the development machine. Capability Probe remains responsible for observing availability and version on each user's machine.

## Execution sequence

1. Adapter Registry creates a Codex run plan.
2. Agent Workspace creates an isolated Git worktree.
3. External CLI Launcher resolves `codex` from `PATH` and builds the fixed argument vector.
4. TrustKernel creates an approval ticket bound to executable path, arguments, clean Git HEAD, worktree path, prompt SHA-256, timeout, and output limit.
5. After exact approval, SpruceAgent starts the executable directly with `shell: false`.
6. The prompt is delivered over stdin and is not copied into the public invocation record.
7. Timeout, output limits, redaction, terminal logging, JSONL event summary, and Git before/after evidence are recorded.
8. Launch Review and independent Agent Trial attestation remain required before manual promotion.

## Security boundary

- Requires a prepared Git worktree. Current-workspace mode is rejected for Codex.
- Workspace preparation requires a clean source repository; context-grounded plans also require a fresh ContextOS index.
- Requires the prepared worktree to remain clean and at the approved Git HEAD before process start.
- On Windows, requires a native Codex executable; `.cmd` and `.bat` wrappers are not launched because that would require a command shell.
- Does not accept caller-supplied prompt overrides, CLI arguments, config overrides, or commands.
- Never enables `--dangerously-bypass-approvals-and-sandbox`, hook trust bypass, additional writable directories, or danger-full-access.
- Inherits an allowlisted environment subset. Other provider keys, such as Anthropic and DeepSeek keys, are not passed to Codex.
- Environment values are not persisted. Approval and launch records contain environment variable names only.
- Captured stdout and stderr are redacted before local persistence.
- ContextOS snippets are bounded, marked as untrusted navigation evidence, and must be verified against worktree files.
- Execution is bounded to 1-30 minutes and 64 KiB-16 MiB of combined output.
- Timeout and output-limit termination target the process tree, with a forced follow-up termination when needed.
- Agent Launcher blocks Git commit, push, merge, rebase, reset, and worktree mutation as user-supplied local commands. It cannot intercept every subprocess chosen inside Codex; the isolated worktree, Codex sandbox, explicit prompt constraints, Git snapshots, and mandatory review are the external-agent controls.

The launcher is a containment and evidence layer. It does not prove model quality, task correctness, or that an installed CLI version behaves identically to another version.

## CLI

```powershell
spruce agent probe --adapterIds codex-cli --version
spruce agent prepare codex-cli --goal "Implement the approved task" --context "relevant code"
spruce agent launch <workspaceId> --execute
spruce approval approve <approvalId> --reason "Invocation reviewed"
spruce agent launch <workspaceId> --execute --approvalId <approvalId>
spruce agent launch-detail <launchId>
spruce agent external-launcher-contract
```

The first execute request creates an approval ticket; it does not start Codex. The second exact request consumes the approved ticket and starts the process.

## Evidence level

Automated tests use an injected process runner to verify argument construction, environment filtering, approval binding, output parsing, log redaction, and Git evidence without calling Codex or an LLM. A real Codex task is intentionally deferred until the project reaches the user-approved live execution stage.
