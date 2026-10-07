# Delivery Progress Review — 2026-08-18

## Evidence reviewed

- Git history now shows a coherent sequence from ContextOS and TrustKernel foundations to Agent Adapter, Workspace, Launcher, Trial, Task Router, Fleet, Outcome Evaluation, Autopilot, and Workbench surfaces.
- The local `.spruceagent` store contains recorded Task Routes, Agent Trials, capability probes, and historical dry-run/workflow traces. Runtime store contents are operator evidence, not release proof by themselves.
- Earlier empirical trials did not prove accepted external-agent output: Codex reported no accepted workspace effect under read-only/policy conditions; Claude Code reported insufficient credit and did not complete.

## Delivery state

| Plane | State | Evidence |
| --- | --- | --- |
| Trust and audit foundation | implemented | Policy, approval tickets, traces, artifacts, reports, and outcome evaluation are present in core and tests. |
| Context and reusable skills | implemented | ContextOS indexing/evidence and SkillForge evaluation, promotion, replay, versioning, import/export are present. |
| Agent routing and launch control | implemented with bounded real-world validation | Capability probes, task routes, isolated workspaces, exact launcher approvals, and trials exist; real Agent trial acceptance is not yet proven. |
| Workspace lifecycle safety | implemented | Workspaces can be retired with audit history; clean managed worktrees are removed, branches are retained unless safe deletion is explicitly requested, and retired workspaces are blocked from new Launch and Squad approval paths. |
| Parallel Fleet candidates | implemented | Fleet creates isolated comparable Codex candidates with individual approvals and review evidence; the local store has not yet recorded a real Fleet execution. |
| Fleet operations observability | implemented | Member start/end evidence, incremental progress API, and auto-refreshing Workbench view are present. |
| Cross-role Squad coordination | implemented as a gated planning layer | Squad v0 creates a reviewable, dependency-checked coordination plan from a fully routed multi-role Task Route, can request exact Agent Launcher approvals for ready members, and does not auto-approve or start processes by itself. |
| Scheduling / Autopilot | implemented with conservative authority | Autopilot rules, due-run detection, trigger ledgers, failure ledgers, runner controls, CLI/Gateway/Workbench surfaces, and safety docs are present. Autopilot creates local execution tasks and does not launch agents or bypass approval. |

## Practical conclusion

The project is strong as a **trust-governed agent control plane** and is past the pure prototype stage. The practical completion estimate is about **72%** for a real local alpha: core control surfaces are implemented. Repeatable accepted external-agent trials remain an evidence gap, not a local-alpha functional blocker. Model invocation is optional. Durable operator deployment is now limited to live soak evidence after a human starts Gateway.

On 2026-09-16, Execution Evidence Guard v0 closed the stale/retired workspace negative path for attestation and Fleet approval/execution, added shared store-id path safety, sandboxed skill-package export files, and limited Gateway execution trustMode to `observe` / `draft` / `approve`.

On 2026-09-16 later the same day, External CLI Launcher v1 was generalized from Codex-only to verified-adapter execution: Claude Code is executable; Cursor Agent and Grok CLI are registered and still launch-disabled until a native CLI contract exists. A live Codex launch failed on an unsupported ChatGPT-account model. A live Claude Code launch reached the installed CLI with `permissionMode=acceptEdits`, then failed with `403 Request not allowed`. No launcher-attested passing trial exists yet.

On 2026-09-18, Gateway Runtime v0.2 implemented the documented long-running stop path: `spruce gateway serve` handles SIGINT/SIGTERM, closes the HTTP server, and marks `.spruceagent/runtime/gateway.json` `stopped` instead of leaving a stale lock. The owning process also refreshes `updatedAt` every 30 seconds while running. The previously listed preflight / health / CLI / CI / duplicate-start tasks were already present.
