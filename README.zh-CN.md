# SpruceAgent

> 面向未来超级个人与超级团队的开源 SuperAgent OS：多入口、原生记忆、自我进化、可信可控。

SpruceAgent 是一个 local-first 的智能体平台。它不是再做一个普通 Agent framework，而是要成为未来超级个人与超级团队的神兵利器。

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

SpruceAgent 目前处于开源 alpha 与核心基础设施阶段。

建议先读：

- [Open Source Alpha Quickstart](docs/open-source-alpha-quickstart.md)
- [公开展示页](apps/showcase/index.html)
- [Public Showcase v0](docs/public-showcase-v0.md)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)
- [发布检查清单](docs/release-checklist.md)
- [Repo Release Kit v0](docs/repo-release-kit-v0.md)
- [SuperAgent 蓝图](docs/spruceagent-superagent-blueprint.md)
- [开源增长与架构战略](docs/spruceagent-open-source-growth-strategy.md)
- [研究升级记录](docs/spruceagent-research-upgrade-2026.md)
- [三大基石项目再核验](docs/foundation-projects-revalidation-2026-07-01.md)
- [核心工具执行引擎](docs/core-tool-execution-engine.md)
- [审批票据系统](docs/approval-ticket-system.md)
- [工作区上下文检索](docs/workspace-context-retrieval.md)
- [ContextOS Source Map v0](docs/contextos-source-map-v0.md)
- [Agent Run Loop v0](docs/agent-run-loop-v0.md)
- [SkillForge v0](docs/skillforge-v0.md)
- [Skill 生命周期 v0](docs/skill-lifecycle-v0.md)
- [SkillForge Evaluation Harness v0](docs/skillforge-evaluation-harness-v0.md)
- [Skill Promotion / Versioning v0](docs/skill-promotion-versioning-v0.md)
- [Skill Restore / Replay Fixtures v0](docs/skill-restore-replay-fixtures-v0.md)
- [Skill Package / Import-Export v0](docs/skill-package-import-export-v0.md)
- [Typed Executable Skills v0](docs/typed-executable-skills-v0.md)
- [Skill 与 CLI 生态研究](docs/skill-and-cli-ecosystem-research.md)
- [能力演化链路](docs/capability-evolution-chain.md)
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

## 本地快速开始

```bash
npm run doctor
npm run alpha:smoke
npm test
npm run spruce -- init
npm run spruce -- status
npm run spruce -- context index
npm run spruce -- context search "TrustKernel" --limit 3
npm run spruce -- run "Read TrustKernel context safely" --context "TrustKernel" --limit 2
```

## Gateway 与 Workbench

```bash
npm run spruce -- gateway token
npm run spruce -- gateway serve --port 7357
```

打开：

```text
http://127.0.0.1:7357/workbench
```

公开展示页：

```text
http://127.0.0.1:7357/showcase
```

Workbench 当前用于查看状态、检索上下文、启动 run、审批候选动作、运行 workflow、查看 trace，并进入 SkillForge 的评估、晋升、回放和包导入导出流程。

## 安全边界

SpruceAgent 的核心原则是：智能可以增强，但控制权必须留在用户手里。

- LLM 输出默认只是 draft，不会直接执行。
- 候选计划必须经过 promotion 和 policy gate。
- 中高风险工具动作必须经过审批票据。
- 导入的 skill package 只会成为 candidate，不会自动变成 approved skill。
- `.spruceagent/`、密钥、运行态数据和本地 skill 包不应提交到仓库。

## 许可证

SpruceAgent 使用 Apache-2.0 许可证。
