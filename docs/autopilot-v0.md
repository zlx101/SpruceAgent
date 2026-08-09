# Autopilot v0

Autopilot v0 gives SpruceAgent a durable, auditable scheduling control plane without introducing an unattended execution engine. It is intended for recurring operational reminders and review work that must survive CLI, Gateway, and process restarts.

## What it does

An Autopilot rule has a bounded interval (5 minutes through 7 days), a static task payload, a next due time, and an append-only trigger ledger. When a rule is due, its only action is to create an **open local Execution Task**. That task is then handled through the ordinary owner, evidence, readiness, TrustKernel, and approval flows.

It does not launch an Agent, run a tool, execute a workflow, issue an approval ticket, approve anything, interpolate shell text, dispatch a webhook, or call a remote endpoint.

The persisted files are:

```text
.spruceagent/autopilots/<autopilotId>.json
.spruceagent/autopilot-index.jsonl
.spruceagent/autopilot-trigger-index.jsonl
.spruceagent/audit.jsonl
```

## Trigger and idempotency model

`nextDueAt` is advanced only after a trigger has created its task and recorded the trigger ledger entry. The default trigger key is stable for that scheduled occurrence:

```text
<autopilotId>:<scheduled-nextDueAt>
```

Replaying the same key returns the recorded task result with `reused: true`; it never creates a second task. This applies after a process restart as well because the trigger ledger is durable. If a host resumes late, the next schedule is advanced in interval increments until it lies after the evaluation time; v0 creates at most one task per due rule per `run-due` call rather than silently backfilling an unbounded backlog.

There is deliberately no hidden in-process timer. A long-running local host can poll `run-due`, and every poll is observable and auditable. Future cron or webhook adapters must use this same idempotent trigger boundary rather than gaining direct execution authority.

## CLI

```bash
# Create a rule. This does not start a daemon or execute work.
npm run spruce -- autopilot create \
  --name "Daily evidence review" \
  --goal "Review the prior development evidence" \
  --intervalMinutes 1440 \
  --nextAction "Claim the generated review task"

npm run spruce -- autopilot list
npm run spruce -- autopilot due
npm run spruce -- autopilot run-due
npm run spruce -- autopilot get <autopilotId>
npm run spruce -- autopilot triggers <autopilotId>

# A direct trigger still requires that the rule is due, unless the supplied key
# already records an earlier result, in which case it safely returns that result.
npm run spruce -- autopilot trigger <autopilotId>
```

For deterministic operational testing, `--firstDueAt` and `--now` accept ISO timestamps. `--evidenceRefs` and `--links` use the same comma-separated static strings as Execution Tasks. They are copied into the created task as references only.

## Gateway and SDK

All endpoints are local and require the existing Gateway Bearer token.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/v1/autopilots` | List rules, optionally `?enabled=true|false`. |
| `GET` | `/v1/autopilots/due?now=<ISO>` | Evaluate due rules without modifying state. |
| `GET` | `/v1/autopilots/contract` | Read the v0 safety contract. |
| `POST` | `/v1/autopilots` | Create a durable interval rule. |
| `POST` | `/v1/autopilots/run-due` | Trigger due rules; only creates local open tasks. |
| `GET` | `/v1/autopilots/:autopilotId` | Read a rule. |
| `GET` | `/v1/autopilots/:autopilotId/triggers` | Read its durable trigger ledger. |
| `POST` | `/v1/autopilots/:autopilotId/trigger` | Trigger one due rule with a stable key. |

`createGatewayClient()` exposes matching methods: `listAutopilots`, `listDueAutopilots`, `autopilotContract`, `getAutopilot`, `listAutopilotTriggers`, `createAutopilot`, `runDueAutopilots`, and `triggerAutopilot`.

## Operational boundary

Autopilot is a scheduler for **control state**, not a scheduler for execution. Creating a task gives no actor ownership, no execution permission, and no evidence conclusion. Operators should inspect the generated task, claim it explicitly, and use the existing approved execution paths only when their own readiness and authority requirements are satisfied.
