# 交付与日用质量门 v0

日期：2026-10-21

前序：`docs/superpowers/specs/2026-10-21-agent-control-plane-design.md`。

策略：只取「先给本机结果、失败露在用户用的那面、绿了才算过」。不新开产品面。仓库不留外部参考项目名称或链接。

## 1. 问题

日用闭环已经能跑。挡住交付的是入口形状：

1. README / Quickstart 像给贡献者验仓库，不像给本机操作者三步拿到结果。
2. 质量门停在测试绿了，没有强制日用路径留下可打开的 trace / artifact，失败必须出现在 `status.daily`。

## 2. 边界

SpruceAgent 仍是一个人、一台机器、一个工作区的本机控制面。

三步：

```text
1. onboard
2. status（看 daily）
3. 打开本次留下的 trace / artifact
```

质量门覆盖这一条日用闭环。全量测试绿了才算过。失败必须出现在 `status.daily`。

不做：安装包、模型网关、新 HTTP 路由、对话 REPL、删 Fleet / Squad、判定插头真接。

## 3. 改哪些

- `README.md` / `README.zh-CN.md`：第一屏「这是不是给你用的」+ 三步。其余文档与命令靠后。
- `docs/open-source-alpha-quickstart.md`：最短路径是这三步。
- `scripts/daily-smoke.js`：临时工作区 `runGatewayOnboarding` → `getDailyLoopAttention` 不是 blocked → `lastDryRunTraceId` 能被 `getRunDetail` 打开，且该 trace 有 artifact。
- `scripts/release-verify.js`：全量测试之后跑日用冒烟；失败则整次失败。现有 alpha smoke 可留，不能代替日用冒烟。
- `CONTRIBUTING.md`：改日用闭环必须在 CLI 或 Workbench 日用面上复现。
- `onboard` 行为不变：mock dry-run、0 工具、不要求密钥、默认不保存 workflow。

## 4. 数据流

```text
本机仓库
  → spruce onboard
  → spruce status.daily
  → spruce run detail / artifact get

release:verify
  → doctor → preflight → syntax-check → 全量测试 → 日用冒烟 →（可选）alpha smoke
```

| 情况 | 日用面 |
| --- | --- |
| 未 onboard / 索引 missing 或 stale | pending，不发明上下文 |
| onboard 失败 | blocked，步骤原因 |
| 无 dry-run trace | pending，不算交付成功 |
| trace/artifact 打不开 | 冒烟失败 |
| 审批未过或可恢复 | pending，不自动 resume |

## 5. 完成线

1. README 中英第一屏是适用对象 + 三步；doctor / 全量测试不排在拿到结果之前。
2. Quickstart 最短路径与三步一致。
3. 日用冒烟满足第 3 节。
4. `release:verify` 含全量测试与日用冒烟。
5. 失败时 `status.daily` 不是 ok。
6. CONTRIBUTING 要求日用面复现。
7. 不降低安全 / onboarding / `shell:false` 断言。不新开路由。无外部参考项目名称。
