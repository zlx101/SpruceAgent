# Capability Evolution Chain

SpruceAgent's shared target is:

```text
Skill -> Workflow -> Agent -> Super-Agent -> Super AI Assistant
```

This chain describes how every concrete task should become increasingly reusable, governable, and valuable.

## 1. Skill

A Skill is the smallest reusable unit of capability.

In SpruceAgent today:

- candidate skills can be extracted from traces
- candidate skills can be manually approved
- approved skills can contain typed executable steps
- typed executable steps still go through policy and approval

Current boundary:

- skills are not automatically selected
- natural-language skill steps are guidance only
- executable steps require explicit syntax and explicit `--executeSkill`

## 2. Workflow

A Workflow is an ordered task process built from skills, tools, context retrieval, approvals, and memory writes.

Target properties:

- multi-step
- inspectable
- repeatable
- resumable
- policy-governed
- traceable

Near-term implication:

Workflow v0 now exists as a durable object that can reference context queries, approved skills, typed tool steps, approval requirements, memory writes, and expected outputs.

## 3. Agent

An Agent is the runtime that executes a goal using context, workflows, skills, tools, memory, traces, and policy.

In SpruceAgent today:

- Agent Run Loop v0 exists
- it can retrieve workspace context
- it can invoke approved skills explicitly
- it can execute typed skill steps under policy
- it writes traces and memory

Current boundary:

- LLM planner exists as draft-only promotion, not direct execution
- tool selection is policy-gated, not fully autonomous
- Gateway and Desktop Workbench exist for local alpha operation

## 4. Super-Agent

A Super-Agent is a long-running, self-improving, multi-context agent system.

Target properties:

- cross-session memory
- workflow reuse
- skill evolution
- approval-aware autonomy
- multi-entry gateway
- background execution
- team-aware permissions
- auditability

This is where SpruceAgent should combine:

- GatewayMesh
- ContextOS
- SkillForge
- TrustKernel

## 5. Super AI Assistant

A Super AI Assistant is the productized form of the Super-Agent.

It is not just a backend runtime. It is what future super individuals and super teams actually use every day.

Target product surfaces:

- CLI
- desktop UI
- web UI
- chat and messaging channels
- browser extension
- mobile companion
- approval inbox
- memory and trace viewer
- skill/workflow marketplace

## Task Execution Principle

Every concrete task should be handled through this lens:

1. Can this be done once safely?
2. Can the execution be traced?
3. Can the useful pattern become a skill?
4. Can multiple skills become a workflow?
5. Can the agent execute the workflow under policy?
6. Can the Super-Agent reuse it across sessions, contexts, and teams?
7. Can the Super AI Assistant make it understandable and controllable for real users?

## Current Position

SpruceAgent currently has:

- Skill v0 and the SkillForge lifecycle
- typed executable skill steps v0
- Workflow v0
- Agent Run Loop v0
- GatewayMesh, Workbench, Fleet, Squad, and Autopilot
- TrustKernel plus Execution Evidence Guard v0

The remaining production-confidence gap is:

> repeatable accepted external-agent trials, not another planning surface

On 2026-09-16, External CLI Launcher v1 stopped being Codex-only. Codex CLI and Claude Code are executable after independently verified native argv contracts. Cursor Agent and Grok CLI are registered first-class adapters and remain launch-disabled until a native CLI is present. Live Codex execution failed because the ChatGPT-account default model `gpt-6-astra` is unsupported. Live Claude Code execution started through TrustKernel and then failed with `403 Request not allowed` / `authentication_failed`. Neither live run produced an accepted workspace effect.

