# Gateway Onboarding v0

Gateway Onboarding v0 is the local guided setup path. It does not require a model, an external coding CLI, or a running Gateway daemon.

This closes the remaining item from [Foundation Project Revalidation](foundation-projects-revalidation-2026-07-01.md): a guided path for store, context index, first dry run, and first workflow draft. Token issuance stays on `spruce gateway token`. LLM profiles stay optional.

## Why this exists

Public snapshots checked on 2026-10-07:

- OpenClaw 2026.9.8 / 2026.9.7: onboarding remains the entrance; the product also emphasizes picking up work after a restart instead of dropping the operator into a blank session.
- Hermes Agent 0.21.x: the runtime is steered and interruptible; silent unfinished work is the failure mode to avoid.
- OpenHuman 0.64.10: workflows stay approval-gated; first-turn work is local and inspectable. The project is GPL-3.0, so SpruceAgent does not copy its code.

SpruceAgent absorbs those as a local control-plane path, not as new channels or model lock-in.

## What it does

```text
store
  -> context index
  -> mock dry-run (no tools)
  -> reviewable workflow draft (not saved unless requested)
  -> optional token / LLM profile checks
  -> read-only attention snapshot
```

CLI:

```bash
npm run spruce -- onboard
npm run spruce -- onboard status
npm run spruce -- onboard contract
```

Saving the workflow draft is opt-in:

```bash
npm run spruce -- onboard --saveWorkflow
```

Gateway:

```text
GET  /v1/onboarding/contract
GET  /v1/onboarding
POST /v1/onboarding
```

`POST` accepts `{ "saveWorkflow": true }` only as an extra. It does not accept endpoint, model, timeout, or credential fields.

## Safety boundary

- The dry-run uses the mock planner. No provider request is sent.
- Tool execution count on the onboarding dry-run is zero.
- The workflow draft is not executed. Saving it creates a definition only.
- The onboarding ledger is `.spruceagent/onboarding.json`. It stores trace ids and step names, never API keys or Gateway tokens.
- Attention counts (pending approvals, resumable runs, Fleet, execution-task evidence) are read-only. They do not resume, approve, or launch anything.

## Status

`ready` means the required local steps passed. It is not live soak evidence, not an accepted external-agent trial, and not a claim that a model is configured.
