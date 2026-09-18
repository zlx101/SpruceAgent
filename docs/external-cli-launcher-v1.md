# External CLI Launcher v1

External CLI Launcher v1 is SpruceAgent's controlled bridge to installed coding agents. An adapter is executable only after its installed command contract is independently verified. Codex CLI and Claude Code are executable. Cursor Agent and Grok CLI are first-class registered adapters and remain launch-disabled until a native argv contract is verified. OpenCode, Hermes Agent, and Gemini CLI remain preview-only.

## Verified runtime contracts

### Codex CLI

The implementation was derived from the locally installed runtime, not from assumed flags:

```text
codex-cli 0.141.0
codex exec [OPTIONS] [PROMPT]
```

The installed `codex exec --help` confirms stdin prompt delivery (`-`), `--cd`, `--sandbox workspace-write`, `--ephemeral`, `--json`, and `--color never`. SpruceAgent fixes those options internally:

```text
codex exec --sandbox workspace-write --ephemeral --json --color never --cd <worktree> -
```

### Claude Code

The implementation was derived from the locally installed runtime:

```text
claude 2.1.138
claude [options] [command] [prompt]
```

The installed `claude --help` confirms non-interactive `--print`, `--output-format stream-json`, `--permission-mode acceptEdits`, `--no-session-persistence`, and `--no-chrome`. The installed 2.1.138 runtime additionally requires `--verbose` with `--output-format=stream-json`. The prompt is delivered over stdin. SpruceAgent fixes those options internally and never enables `--dangerously-skip-permissions` or `bypassPermissions`.

```text
claude --print --verbose --output-format stream-json --permission-mode acceptEdits --no-session-persistence --no-chrome
```

Capability Probe remains responsible for observing availability and version on each user's machine.

## Execution sequence

1. Adapter Registry creates a run plan.
2. Agent Workspace creates an isolated Git worktree.
3. External CLI Launcher resolves the adapter executable from `PATH` and builds the fixed argument vector for that adapter.
4. TrustKernel creates an approval ticket bound to executable path, arguments, clean Git HEAD, worktree path, prompt SHA-256, timeout, and output limit.
5. After exact approval, SpruceAgent starts the executable directly with `shell: false`.
6. The prompt is delivered over stdin and is not copied into the public invocation record.
7. Timeout, output limits, redaction, terminal logging, JSONL event summary, and Git before/after evidence are recorded.
8. Launch Review and independent Agent Trial attestation remain required before manual promotion.

## Security boundary

- Requires a prepared Git worktree. Current-workspace mode is rejected for executable external CLIs.
- Workspace preparation requires a clean source repository; context-grounded plans also require a fresh ContextOS index.
- Requires the prepared worktree to remain clean and at the approved Git HEAD before process start.
- On Windows, requires a native executable; `.cmd` and `.bat` wrappers are not launched because that would require a command shell.
- Does not accept caller-supplied prompt overrides, CLI arguments, config overrides, or commands.
- Never enables Codex `--dangerously-bypass-approvals-and-sandbox`, Claude `--dangerously-skip-permissions`, `bypassPermissions`, hook trust bypass, additional writable directories, or danger-full-access.
- Inherits an allowlisted environment subset. Provider credentials are adapter-scoped: Codex does not receive Anthropic keys, and Claude Code does not receive OpenAI keys.
- Environment values are not persisted. Approval and launch records contain environment variable names only.
- Captured stdout and stderr are redacted before local persistence.
- ContextOS snippets are bounded, marked as untrusted navigation evidence, and must be verified against worktree files.
- Execution is bounded to 1-30 minutes and 64 KiB-16 MiB of combined output.
- Timeout and output-limit termination target the process tree, with a forced follow-up termination when needed.
- Agent Launcher blocks Git commit, push, merge, rebase, reset, and worktree mutation as user-supplied local commands. It cannot intercept every subprocess chosen inside an external agent; the isolated worktree, adapter sandbox or permission mode, explicit prompt constraints, Git snapshots, and mandatory review are the external-agent controls.

The launcher is a containment and evidence layer. It does not prove model quality, task correctness, or that an installed CLI version behaves identically to another version.

## CLI

```powershell
spruce agent probe --adapterIds codex-cli,claude-code,cursor-agent,grok-cli --version
spruce agent prepare claude-code --goal "Implement the approved task" --context "relevant code"
spruce agent launch <workspaceId> --execute
spruce approval approve <approvalId> --reason "Invocation reviewed"
spruce agent launch <workspaceId> --execute --approvalId <approvalId>
spruce agent launch-detail <launchId>
spruce agent external-launcher-contract
```

The first execute request creates an approval ticket; it does not start the agent. The second exact request consumes the approved ticket and starts the process.

## Evidence level

Automated tests use an injected process runner to verify argument construction, environment filtering, approval binding, output parsing, log redaction, and Git evidence without calling Codex, Claude, or an LLM. A live external-agent task still requires user-approved execution and independent acceptance.
