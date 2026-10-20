# SpruceAgent

> 给一个人、一台机器、一个工作区的本机控制面：结果归自己，每一步能溯源。

SpruceAgent 是 local-first、信任治理的控制面。你连上本机 Gateway，给当前工作区做 Onboard，看证据，dry-run 或出草稿，审批后在本仓库执行或恢复，再看痕迹与产物。

## 这是不是给你用的

适合在本机、本仓库里造 / 跑 / 管 Agent 的人。你会用终端和 Git。你要的是能打开、归自己、能溯源的结果。

不适合只想用对话把生活办完的人，也不适合只用 IDE 写代码的人。

## 先拿到结果

不需要模型密钥。

```bash
npm run spruce -- onboard
npm run spruce -- status
```

看 `status.daily` 能不能继续。用 onboard 账本里的 dry-run trace 打开痕迹：

```bash
npm run spruce -- run detail <traceId>
npm run spruce -- artifact list --traceId <traceId>
```

一步指不回本机文件、审批票或 mock 草稿，日用环就不算完成。

它由四个核心能力构成：

- **GatewayMesh**：本机 Gateway、CLI 和 Workbench，同一身份、同一权限。
- **ContextOS**：把项目和个人上下文变成长程操作层，而不只是保存聊天记录。
- **SkillForge**：把重复工作沉淀成可版本化、可测试、可复用的技能。
- **TrustKernel**：每一个行动都受到身份、权限、风险、审批、审计和回滚边界约束。

## 名字由来

SpruceAgent 的名字来自“云杉”。

云杉常青、耐寒、挺拔、有秩序。这个隐喻不是装饰，而是项目的气质：扎根于个人上下文，分枝到本机工具和痕迹，像常青树一样保留长期记忆，并在用户控制之下持续生长。

详见：[名字由来](docs/spruceagent-name-origin.md)

## 为什么是 SpruceAgent

OpenClaw 证明了 Agent 需要操作面。

Hermes Agent 证明了 Agent 需要自我进化的运行时。

OpenHuman 证明了 Agent 需要个人上下文和产品体验。

SpruceAgent 做的是更窄的一层：

> 一个人在自己仓库里拿到结果、结果归自己、每一步能溯源的控制面。

## 当前阶段

SpruceAgent 目前处于本地开源 alpha：信任治理控制平面已可在本机运行。模型调用不是本地 alpha 的功能阻塞；doctor、preflight、Gateway、Workbench 都不依赖它。生产信心证据仍缺少可重复的外部 Agent 验收试验。

建议先读：

- [Open Source Alpha Quickstart](docs/open-source-alpha-quickstart.md)
- [Desktop UI Workbench v0](docs/desktop-ui-workbench-v0.md)
- [Gateway Onboarding v0](docs/gateway-onboarding-v0.md)
- [贡献指南](CONTRIBUTING.md)
- [安全策略](SECURITY.md)

其余文档：

- [公开展示页](apps/showcase/index.html)
- [Public Showcase v0](docs/public-showcase-v0.md)
- [发布检查清单](docs/release-checklist.md)
- [Repo Release Kit v0](docs/repo-release-kit-v0.md)
- [SuperAgent 蓝图](docs/spruceagent-superagent-blueprint.md)
- [开源增长与架构战略](docs/spruceagent-open-source-growth-strategy.md)
- [研究升级记录](docs/spruceagent-research-upgrade-2026.md)
- [三大基石项目再核验](docs/foundation-projects-revalidation-2026-07-01.md)
- [核心工具执行引擎](docs/core-tool-execution-engine.md)
- [审批票据系统](docs/approval-ticket-system.md)
- [工作区上下文检索](docs/workspace-context-retrieval.md)
- [ContextOS Index Safety v0](docs/contextos-index-safety-v0.md)
- [ContextOS Incremental Index v0](docs/contextos-incremental-index-v0.md)
- [ContextOS Staleness Guard v0](docs/contextos-staleness-guard-v0.md)
- [Run Preflight / Auto-Reindex v0](docs/run-preflight-auto-reindex-v0.md)
- [Run Risk Preflight v0](docs/run-risk-preflight-v0.md)
- [Approval Queue v0](docs/approval-queue-v0.md)
- [Run Artifact Store v0](docs/run-artifact-store-v0.md)
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
- [Workbench Run Launcher v0](docs/workbench-run-launcher-v0.md)
- [Workbench Workflow Editor v0](docs/workbench-workflow-editor-v0.md)
- [Workbench Skill / Workflow Runner v0](docs/workbench-skill-workflow-runner-v0.md)
- [Squad Coordination v0](docs/squad-coordination-v0.md)
- [Execution Evidence Guard v0](docs/execution-evidence-guard-v0.md)
- [方向自查 - 2026-06-29](docs/direction-alignment-check-2026-06-29.md)
- [工程原则](docs/engineering-principles.md)

## 本地快速开始

先拿到本机结果：

```bash
npm run spruce -- onboard
npm run spruce -- status
npm run spruce -- run detail <traceId>
npm run spruce -- artifact list --traceId <traceId>
```

贡献者检查放在拿到结果之后：

```bash
npm run doctor
npm run daily:smoke
npm run alpha:smoke
npm test
npm run spruce -- init
npm run spruce -- onboard
npm run spruce -- status
npm run spruce -- context index
npm run spruce -- context search "TrustKernel" --limit 3
npm run spruce -- run "Read TrustKernel context safely" --context "TrustKernel" --limit 2
```

## Gateway 与 Workbench

```bash
npm run spruce -- gateway token
npm run spruce -- gateway serve --port 7357
# 显式启用本地 Autopilot 轮询；它只创建开放的本地 Execution Task
npm run spruce -- gateway serve --port 7357 --autopilotPollMs 60000
```

打开：

```text
http://127.0.0.1:7357/workbench
```

连接 Token 后，日用环是：Connect → Onboard → 索引/证据 → dry-run 或草稿 → 审批 → 在本仓库执行或恢复 → 看痕迹与产物。System Overview 的 Run Onboarding 与 `spruce onboard` 相同：本地 mock dry-run，不保存 workflow，不执行工具。

Workbench 日用面是 System、Launch、Evidence、Builder、Queue、Approvals、Resumable、Artifacts、Detail。Editor、Skills、SkillForge、Fleet、Squads 等仍可打开，不是日用入口。

## 安全边界

SpruceAgent 的核心原则是：智能可以增强，但控制权必须留在用户手里。

- LLM 输出默认只是 draft，不会直接执行。
- 候选计划必须经过 promotion 和 policy gate。
- 中高风险工具动作必须经过审批票据。
- 导入的 skill package 只会成为 candidate，不会自动变成 approved skill。
- `.spruceagent/`、密钥、运行态数据和本地 skill 包不应提交到仓库。

## 许可证

SpruceAgent 使用 Apache-2.0 许可证。
