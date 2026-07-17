# Capability Probe and Task Router v0

SpruceAgent can only orchestrate an Agent fleet honestly when it distinguishes declared integrations from capabilities observed on the current machine.

Capability Probe v0 creates that evidence. Task Router v0 consumes the evidence and produces an explainable, non-executing route draft. Reported execution outcomes follow the separate [Agent Trial Evidence v0](agent-trial-evidence-v0.md) contract.

## Capability Probe

The `spruceagent.capability-probe` contract records:

- whether each allowlisted CLI command exists on `PATH`;
- an optional bounded `--version` result where shell-free execution is safe and the caller explicitly requests it;
- whether the gated Agent Launcher currently supports execution for that adapter;
- declared isolation and review capabilities;
- whether supported LLM provider configuration is present;
- reported Agent Trial outcomes and their non-attested provenance.

Provider configuration is redacted. The snapshot records property presence without returning or persisting its value.

The probe does not launch an Agent, send a model request, access the network, or modify Git state. Version execution is disabled by default. Windows `.cmd` and `.bat` wrappers are detected but not executed during version checks.

## Task Router

The `spruceagent.task-router` contract accepts:

- a goal;
- explicit roles, or a transparent low-confidence keyword classification;
- `plan` or `execute` mode;
- required capabilities;
- preferred adapters and providers;
- an existing capability probe or an explicit request to refresh it.

Route creation rejects capability snapshots older than 15 minutes by default. A caller may set a stricter threshold, up to a hard maximum of 24 hours.

Supported roles are:

- `planning`
- `coding`
- `research`
- `review`
- `deterministic_automation`

Each role is assigned independently. A coding Agent and a research Agent can therefore serve different phases of one task instead of forcing one model to act as a universal worker.

## Selection Rules

The route order is deterministic:

1. observed availability and hard execution eligibility;
2. role support;
3. required capabilities;
4. explicit adapter preference;
5. explicit provider preference;
6. stable adapter ID ordering for display only.

There is no model-quality score in v0. If multiple adapters satisfy the same role and hard constraints, the assignment becomes `requires_preference` instead of selecting an arbitrary winner. If several real LLM providers are configured, the router likewise requires an explicit preference because SpruceAgent does not yet have benchmark evidence for a quality-based choice.

In `execute` mode, external CLI adapters remain ineligible until Agent Launcher support is promoted. A latest reported failed trial also conservatively blocks execute routing. Reported trials never create an automatic winner. `local-shell-agent` is the only executable adapter in v0, and subsequent execution still requires Workspace, TrustKernel, Launcher, and Review gates.

## Storage

```text
.spruceagent/
  capability-probe-index.jsonl
  capability-probes/
    cap_probe_*.json
  agent-route-index.jsonl
  agent-routes/
    agent_route_*.json
```

## Gateway

```text
GET  /v1/capability-probes
GET  /v1/capability-probes/:probeId
POST /v1/capability-probes
GET  /v1/capability-probes/contract

GET  /v1/agent-routes
GET  /v1/agent-routes/:routeId
POST /v1/agent-routes
GET  /v1/agent-routes/contract
```

Example route request:

```json
{
  "goal": "Implement the feature, research edge cases, then review the diff",
  "roles": ["coding", "research", "review"],
  "mode": "plan",
  "preferredAdapterIds": ["codex-cli", "claude-code"],
  "preferredLlmProviders": ["deepseek"],
  "refreshCapabilities": true
}
```

## CLI

```text
spruce agent probe
spruce agent probe --version
spruce agent probes
spruce agent probe-detail <probeId>
spruce agent route --goal "Implement task" --roles coding,review --refreshCapabilities
spruce agent routes
spruce agent route-detail <routeId>
spruce agent probe-contract
spruce agent router-contract
```

The Workbench exposes `Probe` and `Route Goal` actions. Both create inspectable local records and neither starts an external Agent.

## Next Boundary

The next step is Launcher-attested Agent Trials followed by a benchmark-backed Model Registry and orchestration manifest. Repeated comparable trials must add measured latency, cost, context limits, structured-output reliability, task evaluations, and policy constraints before SpruceAgent attempts automatic model selection.
