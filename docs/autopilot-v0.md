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
# Explicitly run the opt-in local polling host; Ctrl+C stops it.
npm run spruce -- autopilot runner --intervalMs 60000
npm run spruce -- autopilot get <autopilotId>
npm run spruce -- autopilot triggers <autopilotId>
npm run spruce -- autopilot disable <autopilotId> --ifUpdatedAt "2026-08-10T03:00:00.000Z"
npm run spruce -- autopilot enable <autopilotId> --ifUpdatedAt "2026-08-10T03:01:00.000Z"

# A direct trigger still requires that the rule is due, unless the supplied key
# already records an earlier result, in which case it safely returns that result.
npm run spruce -- autopilot trigger <autopilotId>
```

For deterministic operational testing, `--firstDueAt` and `--now` accept ISO timestamps. `--evidenceRefs` and `--links` use the same comma-separated static strings as Execution Tasks. They are copied into the created task as references only.

## Rule lifecycle and concurrent operators

Rules are enabled when created. An explicit disable preserves the complete rule, its due time, trigger ledger, audit history, and every task it has already created; it merely removes the rule from future due scans and prevents new direct triggers. It does not cancel, claim, change, or execute any existing Execution Task.

An explicit enable resumes normal due eligibility at the persisted `nextDueAt`; it does not run the rule by itself. Both operations are written to `.spruceagent/audit.jsonl` as `autopilot.enabled` or `autopilot.disabled`.

All mutation callers may pass the exact last-read `updatedAt` value as `ifUpdatedAt`. A mismatch is rejected as an Autopilot revision conflict, so an older CLI, Gateway, or Workbench view cannot silently undo a more recent operator lifecycle decision.

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
| `POST` | `/v1/autopilots/:autopilotId/enable` | Explicitly enable a rule without triggering it. |
| `POST` | `/v1/autopilots/:autopilotId/disable` | Explicitly disable a rule without deleting history or cancelling tasks. |

`createGatewayClient()` exposes matching methods: `listAutopilots`, `listDueAutopilots`, `autopilotContract`, `getAutopilot`, `listAutopilotTriggers`, `createAutopilot`, `runDueAutopilots`, `triggerAutopilot`, `enableAutopilot`, and `disableAutopilot`.

## Operational boundary

Autopilot is a scheduler for **control state**, not a scheduler for execution. Creating a task gives no actor ownership, no execution permission, and no evidence conclusion. Operators should inspect the generated task, claim it explicitly, and use the existing approved execution paths only when their own readiness and authority requirements are satisfied.

The Workbench exposes the same lifecycle actions with an explicit confirmation and the last-read rule revision. A stale Workbench action is rejected rather than overwriting a newer enable or disable decision.

## Opt-in local runner

`spruce autopilot runner` is the built-in foreground polling host. It performs one safe due tick at startup, then repeats at the bounded `--intervalMs` interval (1,000 to 3,600,000 milliseconds). It reports a health snapshot on start and on a `SIGINT` / `SIGTERM` shutdown. It is never started automatically by rule creation or the Workbench.

For a single local operational process, Gateway can explicitly host the same runner:

```bash
npm run spruce -- gateway serve --autopilotPollMs 60000
```

This option is off by default. When supplied, Gateway performs one safe due tick before listening, starts the bounded polling timer only after it is listening, and stops that timer when the Gateway server closes. `GET /v1/status` then includes an `autopilotRunner` health snapshot; it is `null` when no runner is attached. The Workbench displays that Gateway-reported state, including the last tick result or error. Neither hosting mode grants task execution authority: every tick can only create the same open local Execution Tasks described above.
