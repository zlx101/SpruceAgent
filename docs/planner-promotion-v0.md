# Planner Promotion v0

SpruceAgent now has a promotion layer between LLM drafts and executable plans.

This layer is deliberately conservative.

LLM output does not become executable just because it looks like a tool call.
When Context Evidence is available, tool candidates must also cite allowed evidence ids.

## Known Facts

Before Planner Promotion v0, SpruceAgent could:

- retrieve workspace context
- produce rule-based plans
- request LLM plan drafts
- execute tools through TrustKernel
- require approval tickets
- trace LLM request and response events

It did not have a formal bridge from LLM draft steps to candidate executable steps.

## What Planner Promotion v0 Adds

Core now exports:

- `getPlannerPromotionContract()`
- `promoteLlmDraftToCandidatePlan()`

Promotion converts an LLM `planDraft` into a `candidatePlan`.

Each promoted step includes:

- original draft id
- requested tool
- requested input
- promotion status
- policy preview
- evidence refs
- evidence gate result
- executable flag
- reason

## Evidence Binding

Planner Promotion v0.2 accepts an optional Context Evidence pack.

When supplied, every draft step that requests a tool must include `evidenceRefs`.

Promotion blocks the step when:

- no evidence ref is supplied
- an evidence id does not exist in the current evidence pack
- the cited evidence is quarantined
- the cited evidence is withheld from planning

Accepted evidence is recorded as provenance only. It does not grant execution authority.

Stale evidence is surfaced as `passed_with_stale_evidence` in the evidence gate. Freshness enforcement remains owned by run preflight, so callers that require current context should use `--requireFreshContext` or `refreshContext`.

## Promotion Status

| Status | Meaning |
| --- | --- |
| `ready` | tool is allowlisted and policy preview allows it |
| `requires_approval` | known tool, but not allowlisted or policy requires approval |
| `blocked` | unknown tool or invalid tool boundary |
| `not_promotable` | no tool/input declared |

## Default Allowlist

Planner Promotion v0 only allows these tools by default:

- `file.read`
- `memory.add`

This is intentionally narrow.

Tools like `file.write`, `shell.execute`, and `skill.propose` can appear in a candidate plan only as `requires_approval`.

## CLI

Read the promotion contract:

```bash
npm run spruce -- planner contract
```

Generate an LLM draft and candidate plan:

```bash
npm run spruce -- run "Promote a safe plan" --context "TrustKernel" --llm mock --promotePlan --dryRun
```

Use a custom allowlist:

```bash
npm run spruce -- run "Promote a safe plan" --context "TrustKernel" --llm mock --promotePlan --plannerAllowedTools file.read,memory.add --dryRun
```

## Safety Boundary

Planner Promotion v0 does not execute tools.

It only classifies candidate steps.

- it never creates approval tickets
- it never writes files
- it never runs shell commands
- it never promotes unknown tools
- it never promotes evidence-bound tool candidates without allowed evidence refs
- it does not treat a policy preview as approval
- it does not treat evidence as tool authority
- `candidatePlan` does not replace the current rule-based execution plan

## Why It Matters

This is the safe bridge toward real LLM planning:

```text
LLM Draft -> Evidence Gate -> Candidate Plan -> Policy Preview -> Candidate Execution -> TrustKernel -> Tool Result
```

Without this layer, model output would either be ignored forever or trusted too early.

Planner Promotion v0 makes the transition explicit and auditable.

The execution side of this bridge is documented in [Candidate Execution v0](candidate-execution-v0.md).
