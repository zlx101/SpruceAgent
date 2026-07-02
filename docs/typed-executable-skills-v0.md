# Typed Executable Skills v0

SpruceAgent now supports typed executable steps inside approved skills.

This is the first point where an approved skill can do more than guide a run. It can contribute explicit tool calls, but only when the user asks for execution.

## Known Facts

Before this feature, SpruceAgent could:

- extract candidate skills from traces
- approve candidate skills
- pass approved skills into `run --skill`
- use approved skills as planning guidance

It could not execute typed steps from a skill.

## What v0 Adds

Approved skills now support:

```json
{
  "executableSteps": [
    {
      "id": "skill_step_1",
      "toolName": "file.read",
      "input": { "path": "README.md" },
      "source": "Use file.read with input {\"path\":\"README.md\"}"
    }
  ]
}
```

Steps are compiled only from explicit syntax:

```text
Use <toolName> with input <json>
```

Natural-language steps remain guidance only.

## CLI

Run with an approved skill as guidance:

```bash
npm run spruce -- run "Use approved skill" --skill <skillId>
```

Execute typed steps from an approved skill:

```bash
npm run spruce -- run "Execute approved skill" --skill <skillId> --executeSkill
```

## Safety Rules

Typed skill execution requires all of these:

1. the skill is approved
2. the step is typed and parseable
3. the user passes `--executeSkill`
4. each tool call still goes through policy and approval

Medium/high-risk typed steps still create approval tickets. Skill approval does not bypass TrustKernel.

## Backward Compatibility

Approved skills created before `executableSteps` existed are hydrated on read. SpruceAgent compiles executable steps from their existing `steps` and writes the hydrated skill back to disk.

## What This Does Not Solve Yet

Typed Executable Skills v0 does not yet provide:

- rich step schemas beyond tool name and input
- step-level conditions
- retries
- rollback
- eval gates
- automatic skill selection
- LLM-generated typed plans
- marketplace signature checks

Those should come after typed steps are stable and policy-governed.
