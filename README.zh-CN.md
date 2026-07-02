# SpruceAgent

> 面向未来超级个人与超级团队的开源超级智能体操作系统：多入口、原生记忆、自我进化、可信可控。

SpruceAgent 是一个 local-first 的 Agent 平台。目标不是再做一个普通 Agent framework，而是成为未来超级个人与超级团队的神兵利器。

它由四个核心能力构成：

- **GatewayMesh**：一个 Agent，可以从桌面、CLI、Web、聊天软件、移动端、浏览器、Webhook 和自动化触发器唤起。
- **ContextOS**：把项目和个人上下文变成长程操作层，而不只是保存聊天记录。
- **SkillForge**：把重复工作沉淀成可版本化、可测试、可复用的技能。
- **TrustKernel**：每一个行动都受到身份、权限、风险、审批、审计和回滚边界约束。

## 名字由来

SpruceAgent 的名字来自“云杉”。

云杉常青、耐寒、挺拔、有秩序。这个隐喻不是装饰，而是项目的气质：扎根于个人上下文，分枝到工具和入口，像常青树一样保留长期记忆，并在用户控制之下持续生长。

详见：[名字由来](docs/spruceagent-name-origin.md)

## 为什么是 SpruceAgent

OpenClaw 证明了 Agent 需要入口。

Hermes Agent 证明了 Agent 需要自我进化的运行时。

OpenHuman 证明了 Agent 需要个人上下文和产品体验。

SpruceAgent 要做的是它们之上的下一层：

> 一个可以从任何地方被召唤、理解你的工作、从重复任务中学习，并且始终处在用户控制之下的 SuperAgent。

## 当前阶段

SpruceAgent 目前处于架构和核心基础开发阶段。

建议先读：

- [SuperAgent 蓝图](docs/spruceagent-superagent-blueprint.md)
- [开源增长与架构战略](docs/spruceagent-open-source-growth-strategy.md)
- [研究升级记录](docs/spruceagent-research-upgrade-2026.md)
- [核心工具执行引擎](docs/core-tool-execution-engine.md)
- [审批票据系统](docs/approval-ticket-system.md)
- [工作区上下文检索](docs/workspace-context-retrieval.md)
- [Agent Run Loop v0](docs/agent-run-loop-v0.md)
- [SkillForge v0](docs/skillforge-v0.md)
- [Skill Lifecycle v0](docs/skill-lifecycle-v0.md)
- [Typed Executable Skills v0](docs/typed-executable-skills-v0.md)
- [Skill 与 CLI 生态研究](docs/skill-and-cli-ecosystem-research.md)
- [能力演化链](docs/capability-evolution-chain.md)
- [Workflow v0](docs/workflow-v0.md)
- [Workflow Builder v0](docs/workflow-builder-v0.md)
- [Workflow Versioning / Archive v0](docs/workflow-versioning-archive-v0.md)
- [Workflow Inbox / Detail v0](docs/workflow-inbox-detail-v0.md)
- [Workflow Continuation v0](docs/workflow-continuation-v0.md)
- [Evaluation v0](docs/evaluation-v0.md)
- [GatewayMesh Local API v0](docs/gatewaymesh-local-api-v0.md)
- [Gateway Client and Route Contract v0](docs/gateway-client-and-contract-v0.md)
- [LLM Adapter v0](docs/llm-adapter-v0.md)
- [Planner Promotion v0](docs/planner-promotion-v0.md)
- [Candidate Execution v0](docs/candidate-execution-v0.md)
- [Candidate Approval Flow v0](docs/candidate-approval-flow-v0.md)
- [Run Continuation v0](docs/run-continuation-v0.md)
- [Run State / Inbox v0](docs/run-state-inbox-v0.md)
- [Run Detail / Trace Viewer v0](docs/run-detail-trace-viewer-v0.md)
- [Desktop UI Workbench v0](docs/desktop-ui-workbench-v0.md)
- [Workbench Run Launcher v0](docs/workbench-run-launcher-v0.md)
- [Workbench Workflow Editor v0](docs/workbench-workflow-editor-v0.md)
- [Workbench Skill / Workflow Runner v0](docs/workbench-skill-workflow-runner-v0.md)
- [方向自查 - 2026-06-29](docs/direction-alignment-check-2026-06-29.md)
- [工程原则](docs/engineering-principles.md)

## 本地核心快速开始

```bash
npm test
npm run spruce -- init
npm run spruce -- status
npm run spruce -- memory add "SpruceAgent serves future super individuals and super teams." --tags positioning
npm run spruce -- memory search "super teams"
npm run spruce -- trace start "Ship the first SpruceAgent core"
npm run spruce -- tool list
npm run spruce -- tool run file.read --path README.md
npm run spruce -- tool run file.write --path notes.txt --content "hello"
npm run spruce -- approval list --status pending
npm run spruce -- approval approve <approvalId>
npm run spruce -- tool run file.write --path notes.txt --content "hello" --approvalId <approvalId>
npm run spruce -- context index
npm run spruce -- context search "TrustKernel" --limit 3
npm run spruce -- run "Read TrustKernel context safely" --context "TrustKernel" --limit 2
npm run spruce -- run "Plan only" --context "TrustKernel" --dryRun
npm run spruce -- run "Draft with mock LLM" --context "TrustKernel" --llm mock --dryRun
npm run spruce -- run "Promote draft" --context "TrustKernel" --llm mock --promotePlan --dryRun
npm run spruce -- run "Request candidate approvals" --llm <provider> --promotePlan --requestCandidateApprovals
npm run spruce -- run resume <traceId>
npm run spruce -- run detail <traceId>
npm run spruce -- run detail-contract
npm run spruce -- inbox
npm run spruce -- inbox contract
DEEPSEEK_API_KEY=<token> npm run spruce -- run "Draft with DeepSeek" --context "TrustKernel" --llm deepseek --llmModel deepseek-v4-flash --dryRun
npm run spruce -- skill extract <traceId>
npm run spruce -- skill approve <skillId>
npm run spruce -- run "Use approved skill" --context "TrustKernel" --skill <skillId>
npm run spruce -- run "Execute approved skill" --skill <skillId> --executeSkill
npm run spruce -- skill list --status candidates
npm run spruce -- workflow draft "Create a project review workflow" --context "TrustKernel" --llm mock
npm run spruce -- workflow save-draft --file workflow-draft.json
npm run spruce -- workflow create --name "Review" --context "TrustKernel" --skill <skillId> --memory "Done"
npm run spruce -- workflow versions <workflowId>
npm run spruce -- workflow archive <workflowId>
npm run spruce -- workflow restore <workflowId> <revision>
npm run spruce -- workflow run <workflowId>
npm run spruce -- workflow resume <traceId>
npm run spruce -- eval trace <traceId>
npm run spruce -- eval list
npm run spruce -- llm contract
npm run spruce -- planner contract
npm run spruce -- candidate contract
npm run spruce -- candidate approval-contract
npm run spruce -- candidate continuation-contract
npm run spruce -- gateway token
npm run spruce -- gateway contract
npm run spruce -- gateway serve
# 然后打开 http://127.0.0.1:7357/workbench
npm run spruce -- tool run shell.execute --command "echo spruce" --approved
npm run spruce -- policy check --tool shell.execute --command "git status"
```

第一版核心会创建本地 `.spruceagent/` 工作区存储，用来保存 memory、trace、audit log、skill candidate，并支持 skill approval、显式 typed skill execution、workflow、workflow versioning/archive、workflow evaluation、workflow inbox/detail、workflow continuation、GatewayMesh Local API、Desktop UI Workbench v0、Workbench Run Launcher v0、Workbench Workflow Editor v0、Workbench Skill / Workflow Runner v0、LLM Adapter v0、Planner Promotion v0、Candidate Execution v0、Candidate Approval Flow v0、Run Continuation v0、Run State / Inbox v0、Run Detail / Trace Viewer v0、trace-to-skill extraction、policy decision、approval ticket、workspace context index、受 policy 约束的工具执行，以及规则化 Agent Run Loop v0。

## 语言策略

Canonical language：English。

社区语言优先级：

1. English
2. 简体中文 / 繁体中文
3. Spanish
4. Hindi
5. Arabic

## 北极星

SpruceAgent 不是一个更失控的自治黑箱，也不只是个人效率工具。

它是在用户拥有控制权前提下，服务个人与团队的持续智能复利。

所有执行都必须遵守一条规则：安全到值得信任，可靠到可以依赖，合规到可以采用，实用到每天可用，简单到能用第一性原理解释。
