# Direction Alignment Check - 2026-06-29

This note checks whether recent SpruceAgent work is still aligned with the original direction:

> an open-source SuperAgent OS for future super individuals and super teams: omnichannel, memory-native, self-improving, trust-governed, safe, reliable, compliant, and practical.

## Recent Work Reviewed

Recent implemented layers:

- LLM Adapter v0
- Planner Promotion v0
- Candidate Execution v0
- Candidate Approval Flow v0
- Run Continuation v0
- Run State / Inbox v0

## Alignment Verdict

The work is still aligned.

The direction has not drifted into a generic agent framework because the current implementation keeps building operating-system primitives:

- durable local state
- traceable runs
- explicit approvals
- resumable execution
- gateway contracts
- UI-ready workbench state

These are closer to an agent OS than to a demo agent loop.

## Why This Supports the End Goal

### Super Individual

A single user needs the agent to:

- understand project context
- propose actions
- ask before risky work
- wait without losing state
- resume after approval
- show what needs attention

Run Inbox v0 directly supports this by turning hidden traces and approval tickets into a usable workbench.

### Super Team

A team needs more than autonomy. It needs coordination:

- who requested an action
- what is pending
- what was approved
- what can resume
- what already happened

The current approval and inbox layers are early team-control primitives.

### Open Source Adoption

Open-source users need trust before they grant agency.

The current path is conservative:

```text
LLM Draft -> Planner Promotion -> Candidate Approval -> User Approval -> Run Resume -> TrustKernel -> Tool Result
```

That is a credible open-source story because it is inspectable and auditable.

## Risks of Drift

There are three risks to watch.

### 1. Too Much Backend Plumbing, Not Enough Product Feel

The project now has solid primitives, but users will not feel the value until there is a real UI or highly polished CLI flow.

Mitigation:

- build Desktop UI workbench next
- use `/v1/inbox` as the first screen
- make approve/resume a two-click loop

### 2. Lexical Context Is Not Enough

ContextOS is still lexical retrieval. That is acceptable for v0, but not enough for a serious SuperAgent.

Mitigation:

- add embedding-backed retrieval after the UI/inbox loop is usable
- keep lexical search as transparent fallback

### 3. Self-Evolution Is Still Mostly Structural

SkillForge exists, but true improvement loops are not yet strong.

Mitigation:

- use successful resumed runs as skill candidates
- attach evaluation scores to repeated workflows
- promote high-quality repeated patterns into approved skills

## First-Principles Check

From first principles, a personal/team SuperAgent needs five irreducible capabilities:

1. Perception: know the workspace and user context.
2. Deliberation: propose plans from context and goals.
3. Authority: know what it is allowed to do.
4. Action: execute through governed tools.
5. Memory: retain traces, outcomes, and reusable skills.

Current implementation maps to these:

| Need | Current Layer |
| --- | --- |
| Perception | ContextOS workspace index/retrieval |
| Deliberation | LLM Adapter + Planner Promotion |
| Authority | TrustKernel + Approval Tickets |
| Action | Tool Executor + Candidate Execution + Run Continuation |
| Memory | Trace, Memory, SkillForge, Evaluation |

The missing product layer is the visible operating surface.

## Next Recommendation

The next highest-value step is **Desktop UI Workbench v0** backed by Gateway:

- first screen: Inbox
- sections: pending approvals, resumable runs, recent runs
- actions: approve, reject, resume
- secondary view: run detail from trace

This is the right next move because Run Inbox v0 finally gives the UI a clean product-shaped API instead of forcing it to assemble raw traces and approvals itself.
