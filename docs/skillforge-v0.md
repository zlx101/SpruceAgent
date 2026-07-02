# SkillForge v0

SpruceAgent now has the first trace-to-skill extraction path.

This is a conservative rule-based extractor. It does not use an LLM, does not silently approve skills, and does not automatically invoke extracted skills.

## Known Facts

Before this feature, SpruceAgent had:

- trace events
- Agent Run Loop v0
- candidate skill storage
- CLI skill proposal

It did not have a way to create a skill candidate from a real trace.

## What v0 Does

```text
trace id
  -> read trace events
  -> find agent.plan
  -> find tool.result events
  -> extract reusable steps
  -> create candidate skill
```

The generated skill includes:

- name
- summary
- version
- candidate status
- extracted steps
- source trace id
- extractor metadata
- explicit limits

## CLI

Extract a skill candidate from a trace:

```bash
npm run spruce -- skill extract <traceId>
```

Override the generated name:

```bash
npm run spruce -- skill extract <traceId> --name "TrustKernel Context Review"
```

List candidate skills:

```bash
npm run spruce -- skill list --status candidates
```

## Guardrails

SkillForge v0 refuses to extract when:

- the trace has no events
- the trace does not contain enough reusable steps

Extracted skills remain `candidate`. They are not approved automatically.

Approval and explicit invocation are covered by [Skill Lifecycle v0](skill-lifecycle-v0.md).

Pre-approval quality gates are covered by [SkillForge Evaluation Harness v0](skillforge-evaluation-harness-v0.md).

Promotion and version history are covered by [Skill Promotion / Versioning v0](skill-promotion-versioning-v0.md).

Restore and static replay fixtures are covered by [Skill Restore / Replay Fixtures v0](skill-restore-replay-fixtures-v0.md).

Portable package import/export is covered by [Skill Package / Import-Export v0](skill-package-import-export-v0.md).

## What This Does Not Solve Yet

SkillForge v0 does not yet provide:

- LLM-based skill synthesis
- signed marketplace/package registry

The current lifecycle supports manual approval, promotion-gated approval, version snapshots, restore, guidance invocation, typed executable skill steps, static candidate evaluation, static replay fixtures, and portable package import/export. It does not yet provide semantic output tests or execution replay fixtures.

## Why It Matters

This is the first step toward SpruceAgent becoming self-improving without becoming unsafe.

It converts observed work into a reviewable candidate instead of mutating behavior silently.
