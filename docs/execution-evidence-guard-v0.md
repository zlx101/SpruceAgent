# Execution Evidence Guard v0

Execution Evidence Guard v0 is the negative-path layer for stale or retired execution records.

Progress review identified this as a production-confidence gap: control surfaces existed, but later mutations could still use retired workspaces as if they were current.

## Known Facts

Before this layer, SpruceAgent already:

- blocked retired workspaces from new Agent Launches
- blocked retired workspaces from Squad bind and approval requests
- expired consumed approval tickets
- treated stale capability probes as unusable for execute-mode routing

Gaps remained:

- trial attestation could continue against a launch whose workspace was later retired
- Fleet approval and execution did not re-check candidate workspaces after preparation
- store record ids were interpolated into filesystem paths without a shared safe-id rule

## What This Adds

Core now exports:

- `getExecutionEvidenceContract()`
- `assertWorkspaceExecutionEvidence()`
- `assertLaunchWorkspaceCurrent()`
- `assertFleetWorkspacesCurrent()`
- `assertSafeStoreId()`
- `storeItemPath()` / `storeNestedItemPath()`

Behavior:

- Attestation re-reads the launch workspace and refuses retired status.
- Fleet approval requests, batch approval, and execution refuse any retired candidate workspace.
- Record ids used in `.spruceagent` filenames must match `^[A-Za-z0-9_-]{1,160}$`.
- Skill package export files must stay inside the workspace and cannot write `.spruceagent` internals.
- Gateway execution routes accept only `observe`, `draft`, and `approve`. `delegate` and `autonomous` remain CLI-local policy modes.

This gate does not delete evidence, restore retired workspaces, or bypass TrustKernel approvals.

## Why It Matters

Durable records outlive the workspace they describe. Execution must check current evidence, not only the id that was valid when the record was created.
