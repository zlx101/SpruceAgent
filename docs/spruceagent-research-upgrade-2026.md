# SpruceAgent Research Upgrade Notes

This note records the high-value external signals used to move SpruceAgent from concept to core development.

## Key External Signals

### OpenAI Agents SDK

The OpenAI Agents SDK formalizes agents, tools, handoffs, guardrails, and tracing as first-class building blocks.

SpruceAgent implication:

- tracing must be core infrastructure, not an afterthought
- guardrails and policy should sit on the execution path
- handoffs/subagents should be modeled as traceable events

Reference: https://platform.openai.com/docs/guides/agents

### Model Context Protocol

MCP standardizes how models connect to tools, resources, and prompts.

SpruceAgent implication:

- tool and context access should be schema-first
- SpruceAgent should be MCP-compatible without making MCP the entire architecture
- resources, tools, and prompts need explicit capability boundaries

Reference: https://modelcontextprotocol.io/

### Google Agent Development Kit

Google ADK emphasizes agent composition, tools, sessions, memory, evals, and deployment.

SpruceAgent implication:

- memory, evaluation, and deployment cannot be bolted on later
- multi-agent composition should be a roadmap feature, but trace/policy must exist first

Reference: https://google.github.io/adk-docs/

### Microsoft AutoGen

AutoGen focuses on multi-agent workflows, tool use, human-in-the-loop patterns, and distributed agent applications.

SpruceAgent implication:

- team intelligence requires conversation/workflow state, not just a single agent loop
- human review must be designed into the system for high-impact actions

Reference: https://microsoft.github.io/autogen/

### LangGraph

LangGraph positions durable execution, persistence, human-in-the-loop, and controllable agent workflows as core features.

SpruceAgent implication:

- long-running work needs resumable state
- workflow graphs and traces should eventually converge
- manual checkpoints should be part of trust-governed autonomy

Reference: https://langchain-ai.github.io/langgraph/

### OWASP LLM Application Security

OWASP highlights risks around prompt injection, excessive agency, sensitive information disclosure, supply chain, and tool misuse.

SpruceAgent implication:

- TrustKernel is not optional
- skills/plugins/connectors need supply-chain controls
- tool execution needs risk scoring, approval, audit logs, and sandbox routing

Reference: https://owasp.org/www-project-top-10-for-large-language-model-applications/

## Architecture Decisions From Research

1. Trace Store is mandatory from the first implementation.
2. Tool Registry must declare capability, input schema, output schema, approval need, and risk level.
3. Policy decisions must be generated before execution, not after failure.
4. Memory must support at least session, project, user, team, tool, and skill scopes.
5. Skill learning must use candidate/approved lifecycle, not silent mutation.
6. CLI comes before desktop because it makes the core testable.
7. Desktop and gateway should consume the same core store and schemas later.

## Development Started

The first implementation pass now includes:

- local `.spruceagent/` workspace store
- JSON schemas for trace, trace event, memory, tool, skill, and policy
- core modules for memory, traces, tools, policy, and skill candidates
- CLI commands for init, status, memory, trace, tool registry, policy check, and skill proposal
- policy-governed tool execution for file reads, approved file writes, approved shell commands, and memory writes
- local workspace indexing and lexical context retrieval as the first ContextOS slice
- rule-based Agent Run Loop v0 that joins trace, context retrieval, tool execution, and session memory
- rule-based SkillForge v0 that extracts reviewable candidate skills from real traces
- Skill Lifecycle v0 with manual approval and explicit guidance-only invocation
- Typed Executable Skills v0 with explicit `--executeSkill` and policy-governed tool calls
- Workflow v0 with local durable workflows over context, tool, skill, and memory steps

This is intentionally narrow. It creates the load-bearing foundation before UI, OAuth integrations, omnichannel gateway, and autonomous scheduling.
