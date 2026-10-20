# Workbench Workflow Editor v0

SpruceAgent Workbench can now create workflow definitions through the local Gateway API.

This moves the reusable workflow creation loop from CLI-only to the desktop surface:

```text
Create Workflow -> Run / Dry Run -> Inspect -> Approve -> Resume -> Audit
```

## Known Facts

Before this layer, workflows could be created from CLI and run from Workbench.

Workbench could not create workflow definitions, so the product loop still depended on command-line setup.

## What This Adds

Gateway adds:

```text
POST /v1/workflows
```

The JavaScript Gateway client adds:

```text
createWorkflow(input)
```

Workbench adds a `Workflow Editor` panel with:

- name
- summary
- context query step
- approved skill step
- memory note step
- advanced JSON steps

After creation, Workbench refreshes the workflow list so the new workflow can be dry-run or run immediately.

## Safety Boundary

Workflow Editor v0 creates definitions only.

- it does not execute workflows on create
- it does not bypass TrustKernel
- approved skill steps remain limited to approved skills
- tool steps are possible only through JSON steps and still pass policy at runtime
- medium, high, and critical tool steps still require approval tickets during execution

## Current Limits

The create form still does not load an existing workflow for in-place PATCH.

Workflow Builder and the Workflows list already provide:

- step field editing before save
- step reorder (up/down), duplicate, and remove
- archive without deletion
- version history and restore-as-new-revision

Still not provided:

- drag-and-drop reorder
- per-step validation preview
- workflow templates
- team permissions

## Why It Matters

The product loop is now local and usable:

```text
Workflow authoring -> Workflow execution -> Workflow continuation -> Workflow audit
```

That is the right foundation before adding schedulers, templates, or team collaboration.
