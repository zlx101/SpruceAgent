# Workbench Run Launcher v0

SpruceAgent Workbench can now start agent runs through the existing Gateway API.

This turns the desktop surface from an approval console into the first local operating loop:

```text
Launch -> Inspect -> Approve / Reject -> Resume -> Audit
```

## Known Facts

Before this layer, Workbench could read Inbox state, approve or reject tickets, resume approval-gated runs, and inspect run detail.

It could not start a new run. Users still had to use CLI for the first step.

## What This Adds

Workbench adds a `Launch Run` panel backed by:

```text
POST /v1/runs
```

Supported fields:

- `goal`
- `contextQuery`
- `trustMode`
- `dryRun`
- `llmProvider`
- `llmModel`
- `promotePlan`
- `requestCandidateApprovals`
- `executeCandidatePlan`

After a run is created, Workbench:

- refreshes Inbox
- loads `GET /v1/runs/:traceId`
- scrolls to Run Detail

## Default Posture

The UI defaults to:

- `trustMode=approve`
- `dryRun=true`
- no LLM provider selected

That default is intentional. It keeps the first click conservative and makes execution an explicit choice.

## Safety Boundary

Run Launcher v0 does not add a new execution path.

- it calls the same Gateway route as other clients
- `/v1/*` still requires Bearer auth
- Gateway still runs `runAgent()`
- tool execution still flows through TrustKernel
- approval-gated actions still require approval tickets
- dry-run mode executes no tools

## Why It Matters

This is the first usable SuperAgent loop in one surface:

```text
User intent -> Agent run -> Detail -> Approval -> Continuation -> Audit
```

It is still local-first, conservative, and auditable, which matches the SpruceAgent direction: more capable, but not less controllable.
