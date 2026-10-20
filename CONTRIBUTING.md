# Contributing to SpruceAgent

SpruceAgent is the control plane needed to make an Agent. One person, one machine, one workspace. The daily closed loop is the everyday path on this machine and in this workspace, from onboarding to an approved local result you can open. Contributions are welcome when they improve safety, reliability, traceability, or that path.

## Contribution Priorities

We prioritize work in this order:

1. Safety and trust boundaries: permissioning, approvals, audit trails, replay, rollback, and clear user control.
2. Core agent capability: ContextOS retrieval, SkillForge lifecycle, workflow execution, GatewayMesh routes, and LLM provider adapters.
3. Developer experience: CLI quality, test coverage, schema contracts, docs, and reproducible smoke tests.
4. Product experience: desktop workbench, clear run state, trace review, and safe action controls.
5. Ecosystem readiness: package import/export, localization, templates, examples, and public release assets.

## Local Setup

Requirements:

- Node.js 20 or newer
- npm

Run:

```bash
npm run doctor
npm run check
npm test
npm run alpha:smoke
```

`npm run doctor` verifies the alpha release surface. `npm run check` parses every JavaScript file under `apps/`, `packages/core/src/`, `scripts/`, and `tests/`. `npm run alpha:smoke` runs a complete local flow from workspace index to skill package export.

## Pull Request Rules

Before opening a PR:

- Keep changes scoped to one clear problem.
- Add or update tests for behavior changes.
- Changes to the daily loop (onboard, `status.daily`, approvals, resume, traces, artifacts) must be reproduced on the CLI or Workbench daily surface. Sidecar JSON alone is not enough.
- Update schemas and docs when contracts change.
- Do not commit `.spruceagent/`, secrets, exported `*.skillpkg.json` files, local logs, or credentials.
- Explain the safety impact when changing tool execution, approvals, policy, LLM planning, or skill execution.

## Design Principles

SpruceAgent should stay local-first, evidence-based, and user-controlled.

- Do not fabricate project context. Use indexed source evidence or say what is missing.
- Do not execute LLM-generated actions directly. Drafts must pass promotion and policy gates.
- Do not allow imported skills to become approved automatically.
- Do not weaken TrustKernel for convenience.
- Prefer small, inspectable primitives over hidden automation.

## Localization

English is the default repository language for broad collaboration. High-value user-facing docs should progressively support Simplified Chinese, Spanish, Hindi, and Arabic when the English source is stable.

## Reporting Security Issues

Do not open public issues for vulnerabilities. Follow `SECURITY.md`.
