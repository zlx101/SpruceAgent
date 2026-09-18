# Squad Coordination v0

Squad v0 is a gated planning layer for cross-role work. It turns a fully routed multi-role Task Route into a reviewable coordination plan. It does not start agents, auto-approve tickets, merge changes, or invoke a Fleet Run.

## Known Facts

Before this layer, SpruceAgent could:

- route roles onto adapters
- prepare isolated Agent Workspaces
- request exact Agent Launcher approvals
- run comparable Fleet candidates for one role

It could not record an explicit, acyclic handoff graph across planning, research, coding, review, and deterministic automation.

## What Squad v0 Adds

A Squad is a local JSON object under `.spruceagent/squads/`.

It records:

- the source Task Route
- one member per routed role, inheriting that role's adapter
- explicit predecessor handoffs
- optional workspace and Launch Review bindings
- readiness that blocks retired workspaces and unsatisfied handoffs

## Safety Boundary

- Squad can request an exact Agent Launcher approval for a ready member. It never starts the process itself.
- Members cannot silently substitute another adapter.
- Downstream roles stay blocked until declared predecessors have reviewable output.
- Retired Agent Workspaces cannot be bound or used for approval requests.
- Workspace and review bindings only record independently created evidence.

## CLI

```bash
npm run spruce -- squad contract
npm run spruce -- squad create --routeId <routeId>
npm run spruce -- squad list
npm run spruce -- squad get <squadId>
npm run spruce -- squad readiness <squadId>
```

## Why It Matters

Squad is the coordination layer between a multi-role Task Route and later execution. It keeps role graphs inspectable without granting execution authority.
