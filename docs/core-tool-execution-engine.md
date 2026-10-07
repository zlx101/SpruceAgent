# Core Tool Execution Engine

SpruceAgent now has a first-pass policy-governed execution engine.

This is the most valuable next layer after memory, trace, tool registry, and policy because it turns SpruceAgent from a planner into a controlled actor.

## Execution Flow

```text
tool request
  -> tool registry lookup
  -> policy evaluation
  -> audit log write
  -> optional trace event: tool.policy
  -> execute / create approval ticket / deny
  -> optional trace event: tool.result
  -> structured result
```

## Trust Rules

| Path | Behavior |
| --- | --- |
| low-risk allowed tool | executes automatically |
| medium/high-risk tool | creates an approval ticket unless a valid approval is supplied |
| denied tool | never executes |
| critical-risk tool | blocked unless `allowCritical` is explicit |
| Gateway execution routes | `observe`, `draft`, and `approve` only; `delegate` / `autonomous` stay CLI-local |
| trace-linked execution | writes `tool.policy` and `tool.result` events |

## Current Built-in Tools

| Tool | Risk | Approval | Status |
| --- | --- | --- | --- |
| `file.read` | low | no | executable |
| `file.write` | medium | yes | executable after approval |
| `shell.execute` | high | yes | executable after approval, critical commands blocked by default |
| `memory.add` | low | no | executable |
| `skill.propose` | medium | yes | registered, candidate creation exists |

## CLI Examples

```bash
npm run spruce -- tool run file.read --path README.md
npm run spruce -- tool run file.write --path notes.txt --content "hello"
npm run spruce -- approval approve <approvalId>
npm run spruce -- tool run file.write --path notes.txt --content "hello" --approvalId <approvalId>
npm run spruce -- tool run shell.execute --command "node -v" --approved
npm run spruce -- tool run shell.execute --command "git reset --hard" --approved
```

The last command is blocked as critical unless `--allowCritical` is passed. This is intentional. SpruceAgent should be useful before it is autonomous, and governed before it is powerful.

`shell.execute` does not start a shell. The command is split into an executable and arguments (double or single quotes group an argument) and started with `execFile`. Consequences:

- shell builtins such as `echo`, `dir`, `cd`, or `type` are not available; run a real program such as `node`, `git`, or a full executable path
- Windows `.cmd` / `.bat` wrappers such as `npm` are not resolved; call `node` with the script path instead
- shell interpreters (`cmd`, `powershell`, `pwsh`, `bash`, `sh`, `zsh`, `wsl`, and similar) are rejected as the executable
- unquoted shell separators (`& | ; < >`, newline) and caret escapes are rejected; backticks, `$`, and `%` are rejected even inside quotes; a quoted `node -e` script may contain `;`
- an unterminated quote is rejected
- `timeoutMs` must be an integer from 1000 to 300000 (default 30000) and `maxBuffer` from 64 KiB to 4 MiB (default 1 MiB); other values are rejected before the program starts

`allowCritical` does not bypass these checks. The same rules apply to `local-shell-agent` launches and Agent Trial acceptance commands.

## Why This Matters

This layer is the first real version of TrustKernel in code.

It creates the control path needed for:

- desktop approvals
- team policies
- remote node execution
- MCP tool execution
- skill execution
- long-running autonomous jobs
- audit and replay

Future work should extend this with typed tool adapters, sandbox routing, policy profiles, approval tickets, and rollback hooks.
