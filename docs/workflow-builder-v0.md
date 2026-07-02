# Workflow Builder v0

SpruceAgent now has an LLM-powered workflow builder.

It converts a natural language goal into a reviewable workflow draft, then saves it only when explicitly requested.

## What It Adds

Core exports:

- `getWorkflowBuilderContract()`
- `draftWorkflow(store, input)`
- `createWorkflowFromDraft(store, input)`

Gateway routes:

- `GET /v1/workflow-builder/contract`
- `POST /v1/workflow-builder/draft`
- `POST /v1/workflow-builder/save`

CLI:

```bash
npm run spruce -- workflow draft "Create a project review workflow" --context "TrustKernel" --llm mock
npm run spruce -- workflow save-draft --file workflow-draft.json
```

Workbench:

- `Workflow Builder` panel
- goal, context query, approved skill, provider, model, and name inputs
- editable step review list before saving
- add context, skill, and memory steps
- edit step fields
- move steps up or down
- remove draft steps
- JSON preview for audit before saving
- explicit `Save Draft` button

## Safety Boundary

Workflow Builder v0 does not execute tools.

- LLM output is planning input only.
- LLM-proposed tool steps are preserved in metadata for review, not auto-converted into executable workflow tool steps.
- The Step Review editor supports only `context`, `skill`, and `memory` draft steps in v0.
- Saved drafts create workflow definitions only.
- Failed drafts cannot be saved.
- Edited drafts are normalized and validated before saving.
- Running a saved workflow still uses Workflow runtime and TrustKernel.
- Archived/versioned workflow governance still applies after save.

## Draft Shape

The draft includes:

- `goal`
- retrieved `context`
- `sourceMap`
- normalized `llm` response
- suggested `workflow`
- `review` metadata

The generated workflow may include:

- `context` step when matching workspace context exists
- `skill` step when an approved skill is selected
- `memory` step to record completion

## Source Map

Workflow Builder v0 includes a ContextOS source map for every draft.

The source map shows:

- workspace files used as context
- selected skill, when present
- LLM provider/model draft source
- score, freshness, confidence, snippet, hash, and metadata

See: [ContextOS Source Map v0](contextos-source-map-v0.md)

## Current Limits

Workflow Builder v0 does not yet provide:

- drag-and-drop step ordering
- LLM tool-step promotion into workflow tool steps
- conditionals or branches
- workflow diff before save
- provider settings UI
- team approval workflow

Those should come after the draft/save loop proves stable.
