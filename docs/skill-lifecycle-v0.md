# Skill Lifecycle v0

SpruceAgent now supports the first review-first skill lifecycle:

```text
trace
  -> extract candidate skill
  -> evaluate candidate
  -> promote candidate
  -> create replay fixture
  -> export/import package when sharing
  -> restore from version if needed
  -> explicitly invoke approved skill as run guidance
```

## Known Facts

Before this feature, SpruceAgent could:

- extract candidate skills from real traces
- store candidate skills
- list candidate and approved skills
- run Agent Run Loop v0

It could not approve candidate skills or explicitly use an approved skill in a run.

## What v0 Adds

Skill Lifecycle v0 adds:

- `approveSkill`
- approved skill lookup
- static skill evaluation before approval
- promotion gate with version history
- static replay fixtures
- portable package import/export
- version restore
- CLI `skill approve`
- CLI `skill evaluate`
- CLI `skill promote`
- CLI `run --skill`
- trace event `agent.skill.invoked`
- run metadata showing `skillsInvoked: true`

## CLI

Extract a candidate:

```bash
npm run spruce -- skill extract <traceId>
```

Approve a candidate:

```bash
npm run spruce -- skill approve <skillId> --reason "reviewed"
```

Evaluate a candidate before approval:

```bash
npm run spruce -- skill evaluate <skillId>
```

Promote a passing candidate:

```bash
npm run spruce -- skill promote <skillId>
```

Create and run a static replay fixture:

```bash
npm run spruce -- skill fixture-create <skillId>
npm run spruce -- skill replay <fixtureId>
```

Export or import a portable skill package:

```bash
npm run spruce -- skill package-export <skillId>
npm run spruce -- skill package-import <packageId|file>
```

Restore an approved skill definition:

```bash
npm run spruce -- skill restore <skillId> <revision>
```

Run with an approved skill as guidance:

```bash
npm run spruce -- run "Use approved guidance" --context "TrustKernel" --skill <skillId>
```

Execute typed steps from an approved skill:

```bash
npm run spruce -- run "Execute approved skill" --skill <skillId> --executeSkill
```

List approved skills:

```bash
npm run spruce -- skill list --status approved
```

## Safety Boundary

Skill invocation is guidance-only by default.

Typed executable steps can run only when the user explicitly passes `--executeSkill`. Natural-language steps remain guidance only.

In v0:

- candidate skills cannot be invoked
- candidate skills can be statically evaluated before approval
- promotion requires a passing evaluation by default
- promoted skills receive immutable version snapshots
- restore creates a new audited revision
- replay fixtures are static and do not execute tools
- imported packages become candidates only
- approved skills must be selected explicitly
- skill steps are written into the plan as guidance by default
- typed executable steps still go through policy and approval
- high-risk tool execution remains controlled by policy and approvals

## What This Does Not Solve Yet

Skill Lifecycle v0 does not yet provide:

- semantic skill evals or replay fixtures
- semantic version bump policy beyond `0.1.0`
- execution replay fixtures
- signed package registry
- automatic skill selection
- LLM-based skill matching
- team review roles

Those should come after approved skills can be versioned and tested against replayable fixtures.
