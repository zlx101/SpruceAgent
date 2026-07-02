# Skill Promotion / Versioning v0

SpruceAgent now has a promotion gate and skill version history.

This turns skill approval from a loose manual action into a reviewable lifecycle:

```text
candidate skill
  -> skill evaluation
  -> promotion gate
  -> approved skill
  -> immutable version snapshot
```

## Known Facts

Before this feature, SpruceAgent could:

- extract candidate skills from traces
- evaluate candidate skills statically
- approve candidates manually
- invoke approved skills

It could not enforce an evaluation gate before promotion or record version snapshots.

## What v0 Adds

Core now exports:

- `getSkillPromotionContract()`
- `promoteSkillCandidate()`
- `listSkillVersions()`
- `getSkillVersion()`
- `restoreSkillVersion()`

Storage now includes:

```text
.spruceagent/skill-history/<skillId>/<revision>.json
.spruceagent/skill-version-index.jsonl
```

Approved skills include:

- `revision`
- `metadata.approvalMode`
- `metadata.evaluationId`
- promotion actor and reason when promoted through the gate

## Promotion Gate

Promotion requires:

- candidate skill exists
- evaluation targets the same skill
- evaluation status is `passed`
- reliability score is at least `85` by default
- promotion writes a version snapshot

When no `evaluationId` is passed, `promoteSkillCandidate()` runs a fresh static evaluation.

## CLI

Read the contract:

```bash
npm run spruce -- skill promotion-contract
```

Promote a candidate through the gate:

```bash
npm run spruce -- skill promote <skillId>
```

Use an existing evaluation report:

```bash
npm run spruce -- skill promote <skillId> --evaluationId <evaluationId>
```

List versions:

```bash
npm run spruce -- skill versions <skillId>
```

Read a version snapshot:

```bash
npm run spruce -- skill version <skillId> <revision>
```

## Gateway

The local Gateway exposes:

- `GET /v1/skills/promotion-contract`
- `POST /v1/skills/:skillId/promote`
- `GET /v1/skills/:skillId/versions`
- `GET /v1/skills/:skillId/versions/:revision`

The Gateway client exposes:

- `skillPromotionContract()`
- `promoteSkill(skillId, input)`
- `listSkillVersions(skillId)`
- `getSkillVersion(skillId, revision)`

## Workbench

Workbench SkillForge now supports:

- `Evaluate` candidate skill
- `Promote` candidate skill
- approved skill refresh after promotion
- candidate list refresh after promotion

The UI calls the same Gateway promotion route and does not add a separate approval path.

Restore and replay fixtures are covered by [Skill Restore / Replay Fixtures v0](skill-restore-replay-fixtures-v0.md).

## Safety Boundary

Promotion / Versioning v0:

- does not execute candidate steps
- does not bypass TrustKernel
- does not approve failed or low-score evaluations
- removes promoted candidates from the candidate list
- records immutable snapshots for audit
- supports definition restore from version snapshots

The older `approveSkill()` path remains available as a low-level/manual path and also records version history, but the recommended path is `promoteSkillCandidate()`.

## What This Does Not Solve Yet

Skill Promotion / Versioning v0 does not yet provide:

- semantic execution regression fixtures
- signed reviewer roles
- marketplace-ready quality badges
- cross-workspace skill package export

Those should come after replay fixtures and skill package metadata exist.
