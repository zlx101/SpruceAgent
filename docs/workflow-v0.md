# Workflow v0

SpruceAgent now has the first durable workflow layer.

This is the missing bridge in the chain:

```text
Skill -> Workflow -> Agent -> Super-Agent -> Super AI Assistant
```

## Known Facts

Before Workflow v0, SpruceAgent had:

- typed executable skills
- policy-governed tools
- approval tickets
- workspace context retrieval
- memory writes
- trace events
- Agent Run Loop v0

It did not have a durable object for composing multiple steps into a repeatable task flow.

## What Workflow v0 Adds

A workflow is a local JSON object with:

- id
- name
- version
- revision
- status
- summary
- ordered steps
- archivedAt
- metadata

Supported step kinds:

| Kind | Behavior |
| --- | --- |
| `context` | retrieves workspace context with a query |
| `tool` | executes a policy-governed tool call |
| `skill` | executes typed executable steps from an approved skill |
| `memory` | writes memory |

## CLI

Create a workflow with explicit flags:

```bash
npm run spruce -- workflow create --name "Review" --context "TrustKernel" --skill <skillId> --memory "Done"
```

Create a workflow with JSON:

```bash
npm run spruce -- workflow create --input "{\"name\":\"Review\",\"steps\":[{\"kind\":\"context\",\"query\":\"TrustKernel\"}]}"
```

Draft a workflow from a goal:

```bash
npm run spruce -- workflow draft "Create a project review workflow" --context "TrustKernel" --llm mock
```

Save a reviewed draft:

```bash
npm run spruce -- workflow save-draft --file workflow-draft.json
```

Run a workflow:

```bash
npm run spruce -- workflow run <workflowId>
```

Dry-run a workflow:

```bash
npm run spruce -- workflow run <workflowId> --dryRun
```

List workflows:

```bash
npm run spruce -- workflow list
```

Govern workflow definitions:

```bash
npm run spruce -- workflow update <workflowId> --file workflow-steps.json --reason "tighten review"
npm run spruce -- workflow archive <workflowId> --reason "replaced by v2"
npm run spruce -- workflow versions <workflowId>
npm run spruce -- workflow restore <workflowId> <revision>
```

## Safety Boundary

Workflow v0 does not bypass TrustKernel.

- tool steps go through policy
- medium/high-risk tools create approval tickets
- skill steps use only approved skills
- skill steps execute only typed executable steps
- workflow runs are traced
- updates preserve previous revisions
- archived workflows cannot be run
- LLM-generated workflow drafts must be explicitly saved before use

## What This Does Not Solve Yet

Workflow v0 does not yet provide:

- scheduler
- gateway triggers
- LLM planning
- conditionals
- retries
- visual revision diff
- parallel branches
- team permissions

Those are later layers.

Gateway and Workbench now provide basic workflow creation and running. See:

- [Workbench Workflow Editor v0](workbench-workflow-editor-v0.md)
- [Workbench Skill / Workflow Runner v0](workbench-skill-workflow-runner-v0.md)
- [Workflow Versioning / Archive v0](workflow-versioning-archive-v0.md)
- [Workflow Builder v0](workflow-builder-v0.md)

## Why It Matters

Workflow v0 turns isolated skills and tools into repeatable task flows.

This is the first concrete step from Skill toward Agent and Super-Agent behavior.
