# Repo Release Kit v0

Repo Release Kit v0 turns SpruceAgent from a local alpha codebase into a GitHub project that external contributors can inspect, test, and improve.

## What It Adds

- Apache-2.0 license with explicit patent grant.
- Contribution rules focused on safety, reliability, and evidence-based agent behavior.
- Security reporting policy for TrustKernel, GatewayMesh, SkillForge, LLM adapters, and context handling.
- Code of conduct for direct, respectful, multilingual collaboration.
- Bug, feature, and engineering task issue templates.
- Pull request template with explicit safety-impact review.
- Release checklist for alpha publishing and regression control.

## Why It Matters

SpruceAgent is not a generic demo app. It controls local context, skills, workflows, LLM plans, and tool execution. Open-source growth only helps if the project makes its trust boundaries visible and reviewable.

The release kit makes every public contribution answer three questions:

1. What changed?
2. How was it verified?
3. What safety boundary protects the user?

## Non-Goals

- This does not make the project production-stable.
- This does not publish an npm package.
- This does not approve third-party skills automatically.
- This does not replace technical tests or security review.

## Verification

The release surface is now checked by `npm run doctor`.
