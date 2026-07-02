# SkillForge Evaluation Harness v0

SpruceAgent now has a review gate for candidate skills before approval.

The harness is intentionally conservative: it reads skill definitions, parses typed executable steps, previews TrustKernel policy decisions, and checks source trace evidence. It never executes, replays, or approves a skill.

## Known Facts

Before this feature, SpruceAgent could:

- extract candidate skills from traces
- manually approve candidates
- invoke approved skills as guidance
- explicitly execute typed approved skill steps through policy and approvals

It could not evaluate a candidate skill before approval. Promotion is now handled separately by [Skill Promotion / Versioning v0](skill-promotion-versioning-v0.md).

## What v0 Does

```text
candidate skill
  -> compile typed executable steps
  -> preview TrustKernel policy for each step
  -> read source trace evidence
  -> compute deterministic reliability score
  -> write a skill evaluation report
```

Reports are stored in:

```text
.spruceagent/skill-evaluations/<evaluationId>.json
.spruceagent/skill-evaluation-index.jsonl
```

## Report Shape

Each report includes:

- skill id and current skill status
- report status: `passed`, `needs_review`, or `failed`
- reliability score from 0 to 100
- executable step count
- source trace count and event counts
- policy decision and risk counts
- findings with `info`, `warning`, or `error` severity
- recommended next actions
- v0 limits

## CLI

Evaluate a candidate skill:

```bash
npm run spruce -- skill evaluate <skillId>
```

Evaluate an approved skill:

```bash
npm run spruce -- skill evaluate <skillId> --status approved
```

List reports:

```bash
npm run spruce -- skill evaluations
```

Read a report:

```bash
npm run spruce -- skill evaluation <evaluationId>
```

Read the contract:

```bash
npm run spruce -- skill evaluation-contract
```

## Gateway

The local Gateway exposes:

- `GET /v1/skill-evaluations/contract`
- `GET /v1/skill-evaluations`
- `GET /v1/skill-evaluations/:evaluationId`
- `POST /v1/skills/:skillId/evaluations`
- `POST /v1/skills/:skillId/promote`

The Gateway client exposes:

- `skillEvaluationContract()`
- `listSkillEvaluations()`
- `getSkillEvaluation(evaluationId)`
- `evaluateSkill(skillId, input)`

## Workbench

Workbench now has a SkillForge section with:

- candidate skill list
- `Evaluate` action for each candidate
- skill evaluation report list
- report preview panel

This gives the product surface a visible quality gate before skill approval.

## Safety Boundary

Skill Evaluation v0:

- does not execute candidate steps
- does not replay traces
- does not approve skills
- does not bypass TrustKernel
- treats approval-required steps as review warnings, not automatic failures
- treats unknown tools and unreadable source traces as errors

Approval and promotion remain separate explicit actions.

## What This Does Not Solve Yet

Skill Evaluation v0 does not yet provide:

- semantic output comparison
- golden test fixtures
- multi-run statistical scoring
- rollback simulation
- LLM-based critique
- team review roles
- marketplace quality badges

Those should come after skill versioning and replay fixtures exist.
