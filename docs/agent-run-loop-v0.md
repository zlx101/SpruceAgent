# Agent Run Loop v0

SpruceAgent now has a first runnable agent loop.

This is deliberately not presented as a full autonomous AI agent. It is a rule-based v0 loop that verifies the load-bearing path:

```text
goal
  -> trace
  -> known facts
  -> workspace context retrieval
  -> rule-based plan
  -> policy-governed tool execution
  -> session memory
  -> final structured result
```

## Known Facts

Before this feature, SpruceAgent had:

- workspace context index and lexical retrieval
- trace events
- memory writes
- policy decisions
- approval tickets
- policy-governed tool execution

It did not have one command that joined these parts into a single run.

## What v0 Does

The v0 runner:

1. creates a trace
2. records known system facts
3. retrieves workspace context
4. creates a rule-based plan
5. executes safe read-only context steps
6. records step results
7. writes a session summary memory
8. returns a structured run result

## CLI

Dry run:

```bash
npm run spruce -- run "Summarize TrustKernel from current workspace" --context "TrustKernel" --dryRun
```

Execute the v0 loop:

```bash
npm run spruce -- run "Read TrustKernel context safely" --context "TrustKernel" --limit 2
```

## Explicit Limits

Agent Run Loop v0 does not yet include:

- LLM planning
- gateway integration
- desktop UI
- background scheduling
- autonomous multi-step tool use
- semantic vector retrieval

Those are future layers. The current value is proving the execution path safely and locally.

## When LLM, Skills, Gateway, Or Desktop UI Become Necessary

The next layer needs an LLM when SpruceAgent must generate non-trivial plans, synthesize retrieved context, or choose tools dynamically.

Skills are now supported as explicit approved guidance. Structured skill execution becomes necessary when approved skills need typed tool steps that can be executed safely rather than read as natural-language guidance.

Gateway becomes necessary when runs need to be triggered outside the CLI, such as from webhooks, chat channels, desktop, or scheduled events.

Desktop UI becomes necessary when approval inboxes, memory views, trace inspection, and non-technical user workflows need a product surface.

None of those are required to validate v0.

## Why This Matters

This is the first point where SpruceAgent behaves like a system rather than a collection of modules.

It is still small, but it now has a full local loop from goal to context to execution to memory.
