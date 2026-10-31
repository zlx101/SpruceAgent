# 控制面原则：日用闭环

这份文档记录从成熟 Agent 运行架构的公开实践中提炼出的**可移植原则**，以及它们在 SpruceAgent 里的落点。只留原则与落点，不留外部名称与链接。

适用范围：本机控制面。这些原则约束「谁决定、凭什么决定、留下什么证据」，**不**约束 Agent 运行时——我们不跑那个 Agent。

## 1. 两层判定：确定性快路径 + 语义慢路径

确定性代码处理稳定、高频、可枚举的判断；模型只处理需要语义的部分。分工理由不是省钱，而是**可审计**：人能复查的必须是代码，模型给的东西只能是提议。

- 已落地：`packages/core/src/policy.js`（策略与风险）、`packages/core/src/planner.js`（模型提议 → 候选计划）
- 已落地：`packages/core/src/daily-loop-attention.js` 是纯函数，不走模型
- 纪律：这条分工不能只出现在 policy 层。任何在新地方引入模型判断的改动，都必须同时给出确定性兜底路径

## 2. 能决定的人不亲手执行

做判定、发票、分派的那一层，不持有执行工具。它一旦能自己动手，「批准」就退化成事后通知。

- 已落地：判定 ≠ 批准 ≠ 执行。`packages/core/src/approvals.js` 发票，执行另走 `run resume`，且 `Resume stays manual.`
- 已落地：Gateway `trustMode` 只有 `observe` / `draft` / `approve`
- 红线：不给判定层加执行入口，哪怕只是「顺手跑一下」

## 3. 证据按引用图给，不整包塞

给摘要 + 下一跳 ID，让对象之间长成引用图，人顺着引用就能从一行文字走到源文件。这不是省 token 的技巧，是**可溯源**的机械化版本。

- 已落地：`packages/core/src/context.js` 的 Source Map 给每条来源稳定 ID（workspace / memory / skill / llm）与秩
- 已落地：`spruce context evidence` / `context freshness` 按需展开
- 纪律：新对象要么有 ID，要么不进证据面。没有 ID 的东西不能引用，也就不能溯源

## 4. 预演有丢弃权

先跑一遍，有价值就交付，没价值就静默丢弃。预演之所以安全，是因为它可以什么都不留下地消失。但**审计痕迹必须留下**——丢弃的是产出，不是证据。

- 已落地：`spruce run --dryRun`、Onboarding 的 mock dry-run（0 工具、不保存 workflow、不要密钥）
- 红线：预演只看不写仓库，不发票，不产生对外副作用；trace 照常落库
- 待办：投机产物只能停在草稿态，不能让「已经做了一半」变成默认推进

## 5. 人的等待是显式状态，不是挂起

人不在的时候，系统不该阻塞，而该把「等你」写成可读状态。人回来接着推，进程不用挂在那儿等。

- 已落地：`packages/core/src/run-inbox.js` 的 `resumableRuns`、`packages/core/src/approval-queue.js` 的待决队列
- 已落地：`status.daily` 把待批 / 队列 / 可恢复三类计数写进一行
- 红线：不自动 resume。等待必须留在人的手里

## 6. 状态活得比进程久

计算可以丢，状态不能丢。判据很硬：**杀掉进程再启，能不能 resume**。

- 已落地：产物与状态只写 `.spruceagent`；`packages/core/src/gateway-runtime.js` 在 SIGINT / SIGTERM 时把 runtime 标 `stopped`，不留陈旧锁
- 纪律：新增状态必须先回答它落在哪个文件、进程重启后怎么读回来

## 7. 输出带宽匹配信道

同一件事，在不同面上给不同精度。日用面给一行决定，证据面给全量。

- 已落地：`status.daily` 一行 `{ kind, text }`；`packages/core/src/run-detail.js` 给完整 trace
- 红线：不把日用面堆成计数器仪表盘。看得见「现在能不能动手」比看得见更多数字重要

## 8. 自曝简化边界

每份设计都要写清「我依赖了哪些简化，超出就坏」。这不是免责声明，是给下一个改代码的人的边界。

- 已落地：三份 `docs/superpowers/specs/2026-10-21-*.md` 都有「本切片不验收」段落
- 纪律：新切片必须写不验收项，且不能悄悄把旧的「不验收」变成「已完成」

## 明确不移植

- 云端计算 + 端侧常驻 daemon：跨机、出网，与本机单工作区定位冲突
- 主动监听外部信道、无人指令即对外提 PR：那是「去办事的那个 Agent」，且是未经批准的外部副作用
- 双层 Router / Worker 当控制面运行时：我们不跑 Agent。Fleet / Squad 继续冻结在旁路
- 让 Session 隐形：我们相反，痕迹必须能打开。可溯源优先于顺滑

## 两个真实缺口

这两条是读完实践后对照代码确认的，不是待办承诺。

1. **只检测索引过期，不检测 run 空转。** `daily-loop-attention.js` 里 `stale` 只用于索引新鲜度；一个 `running` 的 run 无论停多久都会被当成 `ok`。存活 ≠ 进展。可落在现有 `status.daily` 边界内，不需要新路由。
2. **有测试绿，没有效果度量。** 缺的是「审批门到底挡掉了什么」这类对照数据，不是功能。README 里写的「生产信心缺可重复验收」，指的就是这一条。
