# Workbench Skill / Workflow Runner v0

SpruceAgent Workbench can now run approved skills and workflows from the local browser surface.

This connects the capability chain inside one operating panel:

```text
Skill -> Workflow -> Agent -> Super-Agent -> Super AI Assistant
```

## Known Facts

Before this layer, Workbench could launch a generic agent run, inspect run detail, approve or reject tickets, and resume approval-gated candidate runs.

Approved skills and workflows existed, but using them still required CLI commands.

## What This Adds

Gateway adds:

```text
GET /v1/skills?status=approved
```

The JavaScript gateway client adds:

```text
listSkills(status)
```

Workbench adds:

- `Approved Skills` list
- `SkillForge` candidate skill list
- skill `Evaluate` action for candidates
- skill `Promote` action for passing candidates
- skill evaluation report list and preview
- `Workflows` list
- skill `Plan` action
- skill `Execute` action
- workflow `Dry Run` action
- workflow `Run` action

## Behavior

Skill `Plan` calls:

```text
POST /v1/runs
```

with:

- `skillId`
- `dryRun=true`
- `executeSkill=false`

Skill `Execute` calls:

```text
POST /v1/runs
```

with:

- `skillId`
- `executeSkill=true`
- `trustMode=approve`

Workflow actions call:

```text
POST /v1/workflows/:workflowId/run
```

with either `dryRun=true` or `dryRun=false`.

Skill `Evaluate` calls:

```text
POST /v1/skills/:skillId/evaluations
```

and then reads the report list through:

```text
GET /v1/skill-evaluations
```

Skill `Promote` calls:

```text
POST /v1/skills/:skillId/promote
```

## Safety Boundary

This layer does not add authority.

- only approved skills are listed by default
- candidate skills can be evaluated but not invoked
- evaluation never executes or approves skill steps
- promotion requires a passing evaluation and records version history
- skill execution still uses `runAgent()`
- typed skill steps still go through TrustKernel
- workflow tool steps still go through TrustKernel
- approval tickets remain required for medium, high, and critical actions
- workflow dry-run executes no steps

## Current Limits

Workbench v0 still does not include:

- skill editor
- workflow trace detail view
- skill rollback
- workflow continuation
- scheduled workflows
- team permission model

Those should come after the run surfaces are stable.

## Why It Matters

This gives SpruceAgent a real local operating loop for reusable capability:

```text
Select Skill / Workflow -> Run -> Inspect -> Approve -> Resume -> Audit
```

It makes SkillForge and Workflow v0 usable from the same product surface as Agent Run Loop v0.
