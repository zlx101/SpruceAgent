# SpruceAgent Engineering Principles

SpruceAgent is built for future super individuals and super teams, but power is only valuable when it is safe, reliable, compliant, and practical.

These principles govern architecture, product decisions, and implementation priority.

## 1. Safety Before Capability

SpruceAgent must not treat autonomy as the highest goal.

Execution must be constrained by:

- explicit permissions
- risk classification
- approval flow
- audit logs
- rollback design where possible
- least-privilege tool access
- clear user ownership

If a capability cannot be made safe enough, it should remain unavailable, draft-only, or approval-gated.

## 2. Reliability Before Scale

SpruceAgent should become dependable before becoming expansive.

Reliability means:

- deterministic local state
- traceable execution
- recoverable errors
- test coverage for policy boundaries
- conservative defaults
- clear failure modes
- no silent high-impact mutation

The first useful version should be narrow and solid rather than broad and fragile.

## 3. Compliance Before Convenience

SpruceAgent will eventually touch personal data, team data, credentials, files, messages, and third-party systems.

That means compliance cannot be postponed.

Design requirements:

- local-first storage where practical
- explicit consent for integrations
- data minimization
- clear retention boundaries
- secret isolation
- private audit trails
- permissioned team access
- no hidden data sharing

Compliance is not just legal defense. It is part of user trust.

## 4. Practicality Before Theater

SpruceAgent should solve real work.

Avoid:

- impressive demos that do not survive daily use
- vague agent autonomy claims
- complex abstractions before simple workflows work
- integrating many tools before the execution path is reliable
- self-improvement without evaluation

Prioritize:

- five-minute runnable loops
- visible user value
- simple operational model
- inspectable memory and trace
- repeatable workflows becoming skills

## 5. First Principles Reasoning

Elon Musk's first-principles reasoning is an important reference for SpruceAgent's decision style.

For SpruceAgent, first principles means:

1. Break a problem down to irreducible truths.
2. Remove inherited assumptions from existing agent frameworks.
3. Identify the smallest mechanism that creates real user value.
4. Rebuild upward from physics, incentives, constraints, and user control.

Applied to SpruceAgent:

| Question | First-Principles Answer |
| --- | --- |
| What is an agent? | A system that can observe, decide, and act through tools. |
| Why is it risky? | Because action creates side effects in the real world. |
| What must exist before action? | Identity, permission, risk policy, trace, and audit. |
| What creates compounding value? | Memory, skill reuse, and feedback-driven improvement. |
| What makes it useful to teams? | Shared context, shared skills, controlled delegation, and governance. |
| What should not be copied blindly? | Chatbot UX, unlimited autonomy, unbounded plugins, and opaque memory. |

## 6. Priority Rule

When choosing what to build next, use this order:

1. Does it improve safety, trust, or control?
2. Does it make the core execution loop more reliable?
3. Does it create visible value for a super individual or super team?
4. Does it reduce future complexity?
5. Does it help the open-source community understand or extend the system?

If a feature is exciting but fails the first two checks, it should wait.

## 7. Operating Sentence

SpruceAgent's execution rule:

> Safe enough to trust, reliable enough to depend on, compliant enough to adopt, practical enough to use every day, and simple enough to reason from first principles.

## 8. Evidence-Based Planning

SpruceAgent planning must be grounded in existing facts.

Recommendations should not be inflated, speculative, or presented as certainty without evidence.

Every major recommendation should state:

1. **Known facts**: what exists in the current codebase, documents, tests, or verified external sources.
2. **Why now**: why this is the highest-value next step given the current state.
3. **Concrete deliverable**: what files, commands, tests, or behavior will exist after the work.
4. **Risk boundary**: what the recommendation does not solve yet.

If a claim is an inference, label it as an inference.

If a fact is unknown, say it is unknown.

If a feature sounds impressive but cannot be verified locally, it should not be used as a progress claim.

Planning standard:

> Facts first. Inference second. Delivery third. No theater.
