# Agent 控制面开发设计 v1

日期：2026-10-21

前序：`docs/superpowers/specs/2026-10-21-personal-repo-control-plane-design.md`（v0 文案与 Workbench 前门收口）。

策略（锁定）：SpruceAgent 是本机 Agent **控制面**，不是去办事的那个 Agent。理念是「AI 时代，做 Agent 需要的事」。类型化判定只做可选插头；票和执行留在控制面。

## 1. 问题

仓库里已经有 TrustKernel、ContextOS、onboard、run、审批票、trace、artifact。日用价值被两件事挡住：

1. 对外仍容易被读成全能 OS / 对话桌面 / 整机助手。
2. CLI 是真接口，但帮助和 `status` 把 Fleet、Squad、技能货架和日用环铺在同一层，操作者看不见「现在能不能动手」。

v0 已改 README / Workbench 导航与日用失败条。v1 把同一条环收到 **core + CLI**，成为可验收的控制面日用面。

本切片不接外部判定云 API，不接 GUI / 桌面聊天代发 / 跨机身份网络，不新开路由，不删 Fleet / Squad 源码。

## 2. 边界

### 2.1 产品

SpruceAgent 只服务一个人、一台机器、一个工作区。

人群：自己造 / 跑 / 管 Agent 的本机操作者。会用终端与 Git。不是「说一句话把生活办完」的通用用户，也不是只想写代码的 IDE 用户。

价值：把「允不允许、有没有证据、停没停住、事后能不能打开」做成可打开的本机事实。模型可换，控制权不换。

日用环：

```text
onboard → 索引/证据 → dry-run 或草稿 → 审批票 → 本工作区执行或恢复 → traces / artifacts
```

三句硬约束：

1. **结果**：一次动作留下本机可打开的 trace / artifact / 审批。
2. **归自己**：产物只写 `.spruceagent`。密钥只登记环境变量名。模型和类型化判定都是可关的插头。
3. **能溯源**：每一步能指回文件、记忆、技能、审批或 mock 草稿。指不回去的不进日用环。

### 2.2 判定 ≠ 批准 ≠ 执行

```text
提议（LLM，可选）
  → 判定（类型化判定插头，本切片不实现，只留接口形状）
    → 批准（TrustKernel 票）
      → 执行（本机，策略内，shell:false）
        → 痕迹（.spruceagent）
```

以后若接类型化判定插头：只回答封闭问题（选项 / 分数 / 是否）。失败必须变成「未判定」，不能发票、不能执行、不能绕开拒绝。策略仍是确定性规则。未配置该插头的环境变量时，控制面必须仍能跑（与无 LLM 相同）。

### 2.3 明确不做

- 全能 OS、随处召唤、对话桌面当产品、整机 GUI、桌面聊天代发、跨机身份网络、技能商城、成长维度、上链
- 把 Fleet / Squad / Showcase / Autopilot 当日用入口
- 本切片接入外部判定服务、新聊天通道、新 HTTP 路由
- 删除 Fleet / Squad / Autopilot 源码
- 用判定插头或 LLM 的概率代替政策或审批票

## 3. 接法

日用一条环落到 **core 函数 + CLI 前门**。Workbench 继续当同一条环的可选视窗，不另起执行路径。

旁路代码保留，帮助与 `status` 不再把旁路当作第一屏。

## 4. 改哪些

### 4.1 日用注意力（core）

新增 `getDailyLoopAttention(store)`，放在 `packages/core/src/`（建议与 onboarding 同层，不进 `gateway.js`，避免循环依赖）。从 `packages/core/src/index.js` 导出。

输入：本地 store。不读 Gateway token。

输出固定为：

```text
{ kind: "ok" | "pending" | "blocked", text: string }
```

判定顺序固定：

1. onboarding 有失败步骤或 `status === "failed"` → `blocked`，text 用失败步骤的 `detail`，没有则用 `Onboarding failed.`
2. onboarding `status === "ready"` 且没有 `ledger.lastDryRunTraceId` → `pending`，text：`Onboarding has no dry-run trace. The step is not complete.`
3. 索引 `missing` 或 `stale` → `pending`，text：`Index {status}. Onboarding and Evidence are pending. Do not invent context.`
4. onboarding 无 `updatedAt` → `pending`，text：`Onboarding has not run.`
5. onboarding `incomplete` → `pending`，text：`Onboarding incomplete.`
6. 存在 pending 审批票、approval-queue 待决、或可恢复 run → `pending`，text 写三类计数，并写 `Resume stays manual.`
7. 否则 `ok`，text：`Daily loop ready. Results stay in this workspace.`

索引状态用现有 `assessWorkspaceIndexFreshness`。onboarding 用现有 `getGatewayOnboardingStatus`。inbox / queue 用现有 `getRunInbox` 与 `getApprovalQueue`。不发明上下文，不写密钥。

### 4.2 CLI 日用面

`apps/cli/bin/spruce.js`：

- `printHelp()` 分成两组。**Daily：** `init`、`doctor`、`onboard`、`onboard status`、`status`、`context freshness`、`context evidence`、`run`（含 `--dryRun`）、`approval list`、`approval approve`、`run resume`、`run detail`、`artifact list`、`artifact get`。**Sidecar：** 其余现有命令，包括 fleet / squad / autopilot / skillforge / gateway serve。不删命令。
- `spruce status` 现有 JSON 字段全部保留；**只增加** `daily`，值为 `getDailyLoopAttention(store)`。
- 无子命令时仍打印 help。help 第一句与产品定位一致：本机 Agent 控制面，不是全能 OS。

不改各命令的默认 JSON 输出形状（除 `status` 的加法字段）。不把 CLI 改成对话 REPL。

### 4.3 Gateway status 加法字段

`GET /v1/status` 的 `gatewayStatus()` **只增加** `daily`，与 CLI 同源。不新开路由。Workbench 本切片可以继续用现有前端 `dailyLoopAttention()`；不强制它改读 `status.daily`。

### 4.4 对外承诺残留

第一句去掉全能 OS：

- `package.json` 的 `description`（以及 keywords 里作为定位的 `superagent` 不再当产品自称；可留作历史检索词，但 description 必须是控制面）
- CLI help 头两行

README / 中文 README / Quickstart / Showcase / CONTRIBUTING / Workbench 文案以 v0 为准，本切片不再扩写叙事。

### 4.5 不改的骨头

- TrustKernel 与审批票
- ContextOS 索引、新鲜度、证据、源映射
- 用户命令 `shell:false`
- Gateway `trustMode` 仅 `observe` / `draft` / `approve`
- Gateway LLM 仅 `mock` 或已登记 ready profile；拒绝调用方覆盖 endpoint / model / timeout / 凭证
- Onboarding `POST /v1/onboarding` 空 body：不保存 workflow，不执行工具
- Fleet / Squad / Autopilot 源码与测试保留，不扩面

## 5. 数据流

不新开路由。

```text
本机 store
  → getDailyLoopAttention(store)
  → spruce status / GET /v1/status 的 daily 字段

日用执行仍走已有路径：
  spruce onboard | GET/POST /v1/onboarding
  spruce context freshness | evidence
  spruce run --dryRun | POST /v1/runs
  spruce approval list | approve
  spruce run resume
  spruce run detail | artifact get
```

模型不是日用环的条件。Onboarding dry-run 仍用 mock planner。

类型化判定插头不在本切片数据流里。以后若接，只允许出现在「提议之后、出票之前」，输入为不含密钥的状态摘要，输出为封闭答案；控制面代码解释答案，判定插头不直接调用工具。

## 6. 失败必须露在日用面

| 情况 | CLI / status.daily |
| --- | --- |
| 索引缺失或过期 | `pending`，不发明上下文 |
| onboard 失败 | `blocked`，text 为步骤原因 |
| onboard 未跑或不完整 | `pending` |
| 审批未过或可恢复 | `pending`，不自动 resume |
| 无 dry-run trace 却自称 ready | `pending` |
| 一步指不回源 | 不进入 `ok` |

Workbench 未 Connect 的失败面维持 v0，不在本切片用 CLI 的 `daily` 覆盖。

## 7. 完成线

本切片完成当且仅当：

1. `getDailyLoopAttention(store)` 存在、已导出，顺序与第 4.1 节一致。
2. `spruce status` 与 `GET /v1/status` 含同源 `daily`；旧字段仍在。
3. `spruce` 无参数的 help 分成 Daily / Sidecar；头两行是控制面，不是全能 OS。
4. `package.json` description 是控制面定位，不再自称 SuperAgent OS。
5. 现有测试仍过；只增加与 `daily` / help / description 相关的断言。不降低安全与 onboarding 断言。
6. 不接入外部判定服务，不新增 HTTP 路由，不删 Fleet / Squad。

本切片不验收：判定插头真接、对话 REPL、整机 GUI、外部 Agent 试验、Gateway soak。

## 8. 测试范围

- `getDailyLoopAttention`：空 store → 未跑 onboard 或索引 missing 为 `pending`；构造失败步骤为 `blocked`；无待办且索引 fresh、onboarding ready 且有 dry-run trace 为 `ok`。
- `spruce status` JSON 含 `daily.kind` 与 `daily.text`。
- help 文本含 Daily / Sidecar 分组标记。
- `package.json` description 匹配控制面，不匹配 `SuperAgent OS`。
- 现有 workbench 静态资源、onboarding、policy、`shell:false` 断言保持。

不为判定插头、不为对话桌面写测试。
