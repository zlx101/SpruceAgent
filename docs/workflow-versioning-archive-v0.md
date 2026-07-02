# Workflow Versioning / Archive v0

SpruceAgent workflows now keep revision history and support reversible archive.

This turns workflow definitions into governed assets instead of disposable JSON files.

## What It Adds

Each workflow now includes:

- `revision`
- `archivedAt`
- update history in `.spruceagent/workflow-history/<workflowId>.jsonl`

Supported operations:

- update a workflow definition and preserve the previous revision
- list workflow revisions
- read one workflow revision
- archive a workflow without deleting it
- restore a prior revision as a new current revision

Restore does not erase history. It creates a new revision.

## CLI

```bash
npm run spruce -- workflow update <workflowId> --file workflow-steps.json --reason "tighten review"
npm run spruce -- workflow archive <workflowId> --reason "replaced by v2"
npm run spruce -- workflow list --status archived
npm run spruce -- workflow list --status all
npm run spruce -- workflow versions <workflowId>
npm run spruce -- workflow version <workflowId> <revision>
npm run spruce -- workflow restore <workflowId> <revision>
```

`workflow update` also accepts:

- `--name`
- `--summary`
- `--steps <json>`
- `--file <path>`
- `--status`
- `--reason`
- `--by`

## Gateway Routes

- `GET /v1/workflows?status=active|archived|all`
- `PATCH /v1/workflows/:workflowId`
- `POST /v1/workflows/:workflowId/archive`
- `GET /v1/workflows/:workflowId/versions`
- `GET /v1/workflows/:workflowId/versions/:revision`
- `POST /v1/workflows/:workflowId/versions/:revision/restore`

## Workbench

The local Workbench now shows a `Workflow Versions` section.

From the Workflows list, it can:

- load version history
- archive a workflow
- restore a previous revision

## Safety Boundary

- Archive never deletes the workflow file or history.
- Archived workflows are excluded from default workflow lists.
- Archived workflows cannot be run.
- Restore clears `archivedAt` and writes a new revision.
- All workflow execution still goes through TrustKernel.

## Current Limits

Workflow Versioning / Archive v0 does not yet provide:

- visual diff between revisions
- branch/merge workflow definitions
- team identity or role permissions
- signed revisions
- remote sync

Those should come after local governance is stable.
