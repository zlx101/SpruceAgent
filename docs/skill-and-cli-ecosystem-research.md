# Skill And CLI Ecosystem Research Notes

This note records the current design signals used for SpruceAgent's next evolution.

It is intentionally practical: only ideas that can influence near-term implementation are included.

## Skill Ecosystem Signals

### ClawHub

Reference: https://clawhub.ai/

Observed design signal:

- skills should be discoverable outside the core runtime
- skills need clear names, summaries, and installation/use intent
- an ecosystem around agent skills needs trust and review boundaries

SpruceAgent implication:

- skills need lifecycle states, not a flat script folder
- candidate, approved, deprecated, and blocked states should remain explicit
- future package metadata should support publisher, source, permissions, and compatibility

### SkillHub

Reference: https://www.skillhub.cn/

Observed design signal:

- skill marketplaces make skills understandable through human-readable cards and categories
- users need to inspect what a skill is for before using it
- localized skill discovery matters for Chinese users

SpruceAgent implication:

- Chinese skill metadata and docs should be first-class
- skills should have summaries, tags, categories, and examples
- approved skills still need visible limitations and execution boundaries

## CLI Ecosystem Signals

### Claude Code CLI

Reference: https://docs.anthropic.com/en/docs/claude-code/overview

Observed design signal:

- an agentic coding CLI should be project-aware
- command UX should support natural-language tasks while keeping operational controls available
- slash-style or structured commands are useful for advanced operations

SpruceAgent implication:

- keep `spruce run "goal"` as the primary entry
- keep structured commands for memory, trace, context, policy, approval, skill, and tool
- do not hide safety operations behind magic

### OpenAI Codex CLI

Reference: https://developers.openai.com/codex/cli/

Observed design signal:

- a serious coding agent CLI needs explicit configuration, execution modes, and local project grounding
- user trust depends on clear command behavior and reviewable changes

SpruceAgent implication:

- every run should remain traceable
- tool execution should be policy-governed
- context should come from the current workspace before broader sources

### Feishu / Lark CLI Direction

References:

- https://open.feishu.cn/
- https://open.larksuite.com/

Observed design signal:

- enterprise/productivity CLIs tend to be integration-oriented
- auth, app identity, permissions, and workspace boundaries matter
- commands should map to clear operational objects rather than hidden automation

SpruceAgent implication:

- future GatewayMesh and team mode should treat identity, tenant/workspace, and permissions as first-class
- CLI should expose durable objects: approvals, traces, memories, skills, contexts
- team adoption will require auditability before convenience

## Near-Term Decisions

Based on the current SpruceAgent codebase, the implemented decision is:

> Approved skills should gain typed executable steps, but execution must remain explicit and policy-governed.

Why:

- candidate skills already exist
- approval already exists
- run loop already accepts an approved skill as guidance
- tool execution already has policy/approval controls

Boundary:

- no automatic skill selection yet
- no marketplace installation yet
- no LLM synthesis yet
- no hidden execution of natural-language steps
- typed executable steps require explicit `--executeSkill`

## Design Rule

Skill execution must satisfy all four:

1. the skill is approved
2. the step is typed and parseable
3. the user explicitly asks to execute skill steps
4. each tool call still passes policy and approval gates

## Sources Used

- ClawHub: https://clawhub.ai/
- SkillHub: https://www.skillhub.cn/
- Claude Code docs: https://code.claude.com/docs/en/overview
- OpenAI Codex CLI docs: https://developers.openai.com/codex/cli
- Feishu Open Platform: https://open.feishu.cn/
