# 本仓库控制面收口 v0

日期：2026-10-21

策略：向内、本机本仓库、日用一条环。

## 1. 问题

SpruceAgent 的控制平面已经能在本机跑。对外承诺和 Workbench 前门仍按「SuperAgent OS / 多入口 / 超级团队」铺开，日用路径被 Fleet、Squad、Showcase 冲淡。这与「不要以平台视角看用户、产出必须属于你、信息必须能溯源、智能体要的是结果」不一致。

本切片不解决外部 Agent 验收，不解决 Gateway soak，不引入新模型或新通道。

## 2. 边界

SpruceAgent 只服务一个人、一台机器、一个工作区。

日用闭环（也叫日用环）只有一条，是本机每天走完的那一圈，不是功能清单：

```text
Connect → Onboard → 索引/证据 → dry-run 或草稿 → 审批 → 在本仓库执行或恢复 → 看痕迹与产物
```

三句硬约束：

1. **结果**：一次动作必须留下本仓库里可打开的痕迹（trace / artifact / 审批）。不能只剩「系统很全」。
2. **归自己**：产物只写本地 `.spruceagent`。不把密钥、模型、通道变成平台锁。
3. **能溯源**：每一步能指回文件、记忆、技能、审批或 mock 草稿。指不回去的不进日用闭环。

明确不做：

- 全能 OS、随处召唤、多入口叙事
- 把 Fleet / Squad / Showcase 当日用入口
- 新规划面、新聊天通道、新 API
- 删除 Fleet / Squad / Autopilot 源码

TrustKernel、ContextOS、Workflow 不另起炉灶，只当这条环的骨头。

## 3. 接法

日用一条环：不删旁路代码，只把它们从前门拿掉，并冻结扩面。

## 4. 改哪些

### 4.1 对外承诺

改这些文件的第一句和入口顺序，使与第 2 节一致：

- `README.md`
- `README.zh-CN.md`
- `docs/open-source-alpha-quickstart.md`
- `docs/desktop-ui-workbench-v0.md`
- `apps/showcase/index.html`（以及该页上同样自称 SuperAgent OS 的句子）

Showcase 不是日用入口，但公开句子不能和边界打架。

### 4.2 Workbench 前门

`apps/desktop/index.html` 与 `apps/desktop/app.js`：

- 导航分成两组。
- 日用：System、Launch、Evidence、Builder、Queue、Approvals、Resumable、Artifacts、Detail。
- 旁路（仍可点开，不出现在第一屏承诺里）：Editor、Skills、SkillForge、Workflows、Agents、Fleet、Squads、Tasks、Workflow Runs、Recent。
- System Overview 的 Run Onboarding 保持现有 `POST /v1/onboarding`（空 body）。不保存 workflow，不执行工具。
- 不新增页面，不新增 API，不新增规划面。

### 4.3 不改的骨头

- TrustKernel 与审批票
- ContextOS 索引、新鲜度、证据、源映射
- 本地 `.spruceagent` 账本
- 用户命令 `shell:false`
- Gateway `trustMode` 仅 `observe` / `draft` / `approve`
- Gateway LLM 仅 `mock` 或已登记 ready profile；拒绝调用方覆盖 endpoint / model / timeout / 凭证
- Fleet / Squad / Autopilot 源码与测试保留，本切片不扩面

## 5. 数据流

不新开路由。日用闭环使用已有 Gateway：

```text
本机 store
  → GET/POST /v1/onboarding
  → GET /v1/context/freshness
    GET /v1/context/evidence
  → POST /v1/runs 或 /v1/workflow-builder/draft
  → 审批票 / resume
  → GET /v1/runs/:id
    GET /v1/artifacts
```

模型不是日用闭环的条件。Onboarding dry-run 使用 mock planner。

## 6. 失败必须露在日用面

| 情况 | 日用面上的结果 |
| --- | --- |
| 未 Connect / 无 token | 停在 System，不假装已 onboard |
| 索引缺失或过期 | Onboarding / Evidence 标 pending，不发明上下文 |
| dry-run 或草稿失败 | status 行写原因；onboarding ledger 不写密钥 |
| 审批未过 | Queue / Approvals / Resumable 有待办，不自动 resume |
| 一步指不回源 | 不进入完成，只标待审或失败 |

旁路 JSON 可以继续存在，但不能是唯一失败出口。

## 7. 完成线

本切片完成当且仅当：

1. README / 中文 README / Quickstart / Workbench 文档的第一句与日用闭环一致，不再写全能 OS。
2. Workbench 导航分成日用 / 旁路；Onboarding 按钮行为不变。
3. Showcase 不再自称 SuperAgent OS。
4. 现有测试仍过；只改被文案或导航碰到的正则。
5. 不删 Fleet / Squad 代码，不新增 API。

本切片不验收：外部 Agent 试验、Gateway soak、新模型、新通道。

## 8. 测试范围

- 更新 `tests/core.test.js` 中 Workbench 静态资源正则，使其匹配新导航分组与收口文案。
- 不为「收口」新写功能测试。
- 不降低既有安全与 onboarding 断言。
