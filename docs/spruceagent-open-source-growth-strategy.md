# SpruceAgent 开源增长与架构战略

## 0. 战略判断

SpruceAgent 不能只是另一个 Agent framework。

如果目标是对标 OpenClaw 的开源热度，SpruceAgent 必须同时满足三个条件：

1. 一眼能懂：用户在 10 秒内明白它解决什么问题。
2. 五分钟能跑：开发者在 5 分钟内看到可用结果。
3. 长期有护城河：架构上不只是 demo，而是能持续生长的系统。

OpenClaw 的爆火说明市场已经接受一个判断：

> AI agent 不应该只活在一个网页聊天框里，它应该住进用户自己的设备、工具和工作流。

SpruceAgent 要往前走一步：

> AI agent 不只要随处可达，还要理解用户、越用越强，并且所有行动都在可审计、可授权、可撤销的信任边界内发生。

## 1. 顶级架构师视角下的三项目评判

### 1.1 OpenClaw

OpenClaw 的真正优势不是“能调工具”，而是入口心智。

它把 Agent 从聊天窗口里释放出来，让 Agent 进入用户已有的渠道、设备和本地环境。这是很强的产品叙事：用户不需要迁移到一个新入口，而是在原来的入口里召唤 AI。

优势：

- local-first 叙事强
- gateway/control-plane 架构清晰
- 多渠道、多设备、多节点想象空间大
- skills/plugin 生态容易形成开发者传播
- GitHub 传播语言非常直接：personal AI assistant you run on your own devices

风险：

- 攻击面天然很大
- skills 生态会引入供应链风险
- 本地 gateway、WebSocket、设备权限、自动化执行都可能变成安全焦点
- 非技术用户上手成本高
- 热度可能被安全事故反噬

对 SpruceAgent 的启发：

SpruceAgent 必须继承入口层，但不能复制它的安全债。Gateway 要从第一天就带权限、身份、审计、能力声明和风险分级。

### 1.2 Hermes Agent

Hermes 的真正优势是进化心智。

它不是只执行一次任务，而是强调从历史经验中沉淀 skills、搜索过往会话、改进自身流程。这是 Agent 从工具调用器走向长期工作伙伴的关键。

优势：

- agent loop 更接近长期运行时
- skills learning 是强差异化
- 多 provider、多执行环境、多工具系统适合高级开发者
- trace、memory、tool registry 可以形成基础设施护城河

风险：

- 产品入口弱于 OpenClaw
- 普通用户不容易立刻理解价值
- 自我改进如果没有评估和权限边界，会带来不可控感
- 容易成为“强大的 runtime”，但不是“每天打开的产品”

对 SpruceAgent 的启发：

SpruceAgent 必须继承学习层，但要加上 skill lifecycle：候选、评估、版本、批准、回滚、审计。真正能开源传播的不是“它会自己改”，而是“它能安全地把重复工作变成技能”。

### 1.3 OpenHuman

OpenHuman 的真正优势是个人上下文心智。

它承认一个事实：Agent 做不好事，很多时候不是模型不够强，而是不知道用户是谁、项目是什么、资料在哪里、偏好是什么。

优势：

- desktop-first 更接近日常使用
- 个人数据接入方向正确
- memory tree / vault / local memory 叙事有吸引力
- 相比纯框架，更像产品

风险：

- OAuth 和个人数据集成成本高
- 隐私、安全、授权复杂度极高
- 如果没有强 runtime，容易变成“会搜索个人资料的聊天 UI”
- 如果没有强 gateway，入口和自动化能力受限

对 SpruceAgent 的启发：

SpruceAgent 必须继承上下文层，但要避免一开始做全量个人数据平台。先做 project memory 和 workspace context，再扩展到 email、calendar、notes、drive。

## 2. SpruceAgent 的战略定位

SpruceAgent 的定位应该是：

> The open-source SuperAgent OS for future super individuals and super teams: omnichannel, memory-native, self-improving, and trust-governed.

中文表达：

> SpruceAgent 是面向未来超级个人与超级团队的开源超级智能体操作系统：多入口、原生记忆、自我进化、可信可控。

这意味着 SpruceAgent 的目标用户不是单一的“个人效率用户”，而是两类未来工作主体：

1. **Super Individual**：一个人借助 Agent 具备小团队级别的执行、研究、编码、运营和决策能力。
2. **Super Team**：一个团队借助共享记忆、技能、工具和治理机制，形成跨成员、跨项目、跨入口的组织智能。

不要把自己说成：

- another AI agent framework
- chatbot with tools
- local ChatGPT clone
- workflow automation tool

应该持续强调四个词：

1. Omnichannel：从任何入口召唤。
2. Memory-native：天然理解项目和用户上下文。
3. Self-improving：重复工作沉淀成技能。
4. Trust-governed：每个行动都有权限、审计和边界。

## 3. SpruceAgent 的核心差异化

### 3.1 TrustKernel

这是 SpruceAgent 必须比 OpenClaw 更强的地方。

TrustKernel 是统一的权限、风险和审计系统。

它负责：

- channel identity
- user identity
- device identity
- tool capability declaration
- action risk scoring
- approval policy
- audit log
- rollback hooks
- secret handling
- sandbox routing

开源传播语言：

> Agents are powerful because they can act. SpruceAgent is safe because every action is governed.

### 3.2 ContextOS

这是 SpruceAgent 必须比 Hermes 更产品化、比 OpenHuman 更工程化的地方。

ContextOS 不是简单 RAG，而是用户和项目的长期上下文操作系统。

它包括：

- workspace index
- project memory
- user memory
- task timeline
- entity graph
- file and conversation grounding
- retrieval policy
- privacy boundary

开源传播语言：

> SpruceAgent does not just remember chats. It builds an operating context for your work.

### 3.3 SkillForge

这是 SpruceAgent 必须继承并升级 Hermes 的地方。

SkillForge 把执行 trace 变成可复用技能。

技能生命周期：

1. observe traces
2. detect repetition
3. propose skill
4. test against previous tasks
5. ask for promotion
6. version skill
7. monitor future use
8. rollback on failure

开源传播语言：

> Repeated work should become reusable intelligence.

### 3.4 GatewayMesh

这是 SpruceAgent 必须继承并升级 OpenClaw 的地方。

GatewayMesh 管入口，但不做大脑。

它负责：

- desktop
- CLI
- web
- messaging channels
- mobile companion
- browser extension
- webhook
- cron
- local and remote nodes

开源传播语言：

> One agent. Every entrance. Same memory. Same permissions.

## 4. GitHub 开源爆发策略

### 4.1 README 必须优先于代码复杂度

GitHub 爆火项目的第一屏决定传播。

README 第一屏必须包含：

- 一句话定位
- 30 秒 demo GIF/video
- 5 分钟 quickstart
- 核心架构图
- 为什么不是 OpenClaw/Hermes/OpenHuman 的简单组合
- 安全承诺
- language links
- star CTA

推荐第一句：

> SpruceAgent is an open-source SuperAgent OS for future super individuals and super teams. It connects every entrance, remembers your work, learns reusable skills, and keeps every action under your control.

### 4.2 Demo 要比架构更早出现

第一轮传播 demo 不要展示“全能”，而要展示完整闭环。

最强 demo：

1. 用户从桌面或 CLI 发起任务。
2. SpruceAgent 读取当前项目。
3. 它执行工具调用。
4. 它生成 trace。
5. 它发现重复流程。
6. 它提出一个 skill。
7. 用户批准。
8. 下次同类任务自动调用 skill。
9. 全过程能在 audit log 里看到。

这个 demo 同时击中：

- OpenClaw 的入口
- Hermes 的进化
- OpenHuman 的上下文
- SpruceAgent 自己的可信控制

### 4.3 开源仓库结构要服务传播

推荐首发结构：

```text
SpruceAgent/
  README.md
  README.zh-CN.md
  docs/
    i18n/
    architecture/
    security/
    examples/
  apps/
    desktop/
    cli/
  packages/
    gateway/
    runtime/
    context/
    skills/
    policy/
    tools/
  schemas/
  examples/
    five-minute-demo/
    coding-agent/
    research-agent/
```

### 4.4 首发 issue 和讨论区要提前设计

不要等社区来了再组织社区。

首发前准备：

- good first issue
- help wanted
- architecture discussion
- security discussion
- plugin/skill request
- integration request
- language translation tracking
- roadmap voting

社区贡献入口：

- build a connector
- build a skill
- improve language docs
- test on OS/device
- add examples
- write guides
- report security issues privately

## 5. 五大语言策略

你指定的语言优先级应该写进项目治理：

1. English
2. 简体中文 / 繁体中文
3. Spanish
4. Hindi
5. Arabic

### 5.1 原则

English 是 canonical language。所有架构、API、schema、issue template、release note 先以英文为准。

简体中文是第一等公民，不是英文的附属翻译。原因很简单：AI agent、开源工具和个人效率产品在中文开发者社区传播速度极快。

繁体中文从简体中文维护转换版，但关键页面需要人工校对。

Spanish、Hindi、Arabic 优先覆盖用户入口内容，而不是一开始翻译所有技术细节。

### 5.2 首发必须多语言的页面

首发需要至少准备这些页面：

| File | English | 中文 | Spanish | Hindi | Arabic |
| --- | --- | --- | --- | --- | --- |
| README | required | required | summary | summary | summary |
| Quickstart | required | required | required | required | required |
| Security | required | required | summary | summary | summary |
| Code of Conduct | required | required | optional | optional | optional |
| Contributing | required | required | summary | summary | summary |
| FAQ | required | required | optional | optional | optional |

### 5.3 文档路径

推荐：

```text
README.md
README.zh-CN.md
README.zh-TW.md
docs/i18n/es/quickstart.md
docs/i18n/hi/quickstart.md
docs/i18n/ar/quickstart.md
```

### 5.4 UI 国际化

第一版 UI 不需要完整覆盖所有语言，但必须从第一天支持 i18n key，不要把英文硬编码到组件里。

推荐 locale：

```text
en
zh-CN
zh-TW
es
hi
ar
```

Arabic 是 RTL 语言。前端布局要从第一天避免写死 left/right，使用 start/end。

## 6. 产品路线策略

### 6.1 第一阶段：赢得开发者

目标：

- 让开发者 5 分钟跑起来
- 让他们看见完整闭环
- 让他们能贡献 skill/tool/connector

核心功能：

- CLI
- local gateway
- project memory
- trace store
- basic tool registry
- approval policy
- skill proposal

### 6.2 第二阶段：赢得个人用户

目标：

- 让非框架用户每天打开
- 让 desktop UI 成为主入口

核心功能：

- desktop app
- memory viewer
- task history
- account integrations
- browser extension
- local vault

### 6.3 第三阶段：赢得生态

目标：

- 让别人围绕 SpruceAgent 做 skills、connectors、nodes

核心功能：

- skill package format
- connector SDK
- marketplace index
- security scanner
- verified publisher
- sandbox policy

## 7. 必须避免的错误

1. 不要一开始就做大而全。
2. 不要复制 OpenClaw 的入口，而忽略安全。
3. 不要复制 Hermes 的进化，而缺少产品体验。
4. 不要复制 OpenHuman 的个人数据接入，而低估隐私复杂度。
5. 不要把 self-improving 做成黑箱。
6. 不要让 README 变成论文。
7. 不要只服务英文社区。
8. 不要让插件生态先于安全机制爆炸。

## 8. 当前执行策略

SpruceAgent 下一步应该执行这条路线：

1. 先完成 repo identity：README、logo 方向、tagline、architecture diagram。
2. 定义四个核心模块：GatewayMesh、ContextOS、SkillForge、TrustKernel。
3. 写 schema：trace、tool、skill、memory、policy。
4. 做 5-minute demo：一个完整任务从入口到执行、记忆、技能沉淀、审计。
5. 做英文和中文 README。
6. 做 security model 文档。
7. 再开始实现 CLI 和 local gateway。

优先级判断：

> 先让世界知道 SpruceAgent 是什么，再让开发者跑起来，最后再扩展成生态。

## 9. 一句话北极星

English:

> SpruceAgent is the open-source SuperAgent OS for future super individuals and super teams: omnichannel, memory-native, self-improving, and trust-governed.

简体中文：

> SpruceAgent 是面向未来超级个人与超级团队的开源超级智能体操作系统：多入口、原生记忆、自我进化、可信可控。

繁体中文：

> SpruceAgent 是面向個人工作的開源超級智慧體作業系統：多入口、原生記憶、自我進化、可信可控。

Spanish:

> SpruceAgent es el sistema operativo open source para SuperAgentes de trabajo personal: multicanal, con memoria nativa, auto-mejorable y gobernado por confianza.

Hindi:

> SpruceAgent भविष्य के super individuals और super teams के लिए एक open-source SuperAgent OS है: हर चैनल पर उपलब्ध, memory-native, self-improving, और trust-governed.

Arabic:

> SpruceAgent هو نظام تشغيل مفتوح المصدر للوكيل الفائق للعمل الشخصي: متعدد المداخل، مبني على الذاكرة، يتحسن ذاتيا، ومحكوم بالثقة.

## 10. 外部参考

- OpenClaw: https://github.com/openclaw/openclaw
- Hermes Agent: https://github.com/NousResearch/hermes-agent
- OpenHuman: https://github.com/tinyhumansai/openhuman
