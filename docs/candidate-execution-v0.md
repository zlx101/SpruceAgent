# Candidate Execution v0

SpruceAgent now has an explicit execution bridge for promoted candidate plans.

This is the next step after Planner Promotion v0:

```text
LLM Draft -> Candidate Plan -> Candidate Execution -> TrustKernel -> Tool Result
```

Candidate Execution v0 is deliberately narrow. It exists to prove that a promoted LLM plan can run through the same audited tool path as every other SpruceAgent action.

## Known Facts

Before this layer, SpruceAgent could:

- ask an LLM provider for a draft plan
- normalize provider output into non-executing draft steps
- promote safe draft steps into a candidate plan
- preview TrustKernel policy decisions
- execute normal rule-based plan steps through `executeTool`

It could not execute a promoted candidate plan as its own explicit mode.

## What Candidate Execution v0 Adds

Core now exports:

- `getCandidateExecutionContract()`
- `executeCandidatePlan()`

Agent runs now accept:

- `promotePlan: true`
- `executeCandidatePlan: true`

The CLI exposes:

```bash
npm run spruce -- candidate contract
npm run spruce -- run "Execute promoted candidate" --context "TrustKernel" --llm <provider> --promotePlan --executeCandidatePlan
```

## Execution Boundary

Candidate Execution v0 executes only candidate steps that satisfy all of these conditions:

- `promotionStatus` is `ready`
- `executable` is `true`
- `toolName` is present
- `input` is present or defaults to an empty object

Every ready step is still executed through `executeTool`, so TrustKernel policy, approval tickets, trace events, and tool registry boundaries remain active.

Non-ready steps are reported but not executed:

| Promotion status | Execution status |
| --- | --- |
| `requires_approval` | `requires_approval` |
| `blocked` | `blocked` |
| `not_promotable` | `skipped` |

If any step is blocked, failed, or skipped, the candidate execution status is `completed_with_blockers`.

Approval-gated execution is handled by [Candidate Approval Flow v0](candidate-approval-flow-v0.md), not by silently treating `requires_approval` as `ready`.

## No Fallback Execution

If `executeCandidatePlan` is requested but no candidate plan exists, SpruceAgent returns a blocked candidate execution result and does not execute the rule-based plan as a fallback.

This prevents a dangerous ambiguity:

> The user asked to execute a promoted candidate plan, but the system silently ran a different plan.

## Safety Boundary

Candidate Execution v0:

- does not execute unless explicitly requested
- does not execute during dry-run
- does not bypass Planner Promotion
- does not execute non-ready steps
- does not create a new tool execution path
- does not treat policy previews as approval tickets
- does not silently fall back to rule-based plan execution

## Why It Matters

This is the first closed loop from model planning to governed action.

The point is not maximum autonomy. The point is a reliable execution spine:

1. Model proposes.
2. Promotion classifies.
3. TrustKernel governs.
4. Executor acts.
5. Trace records.
6. Evaluation can inspect.

That spine is the minimum foundation for moving from `Skill -> Workflow -> Agent -> Super-Agent -> Super AI Assistant` without turning the system into an ungoverned black box.
