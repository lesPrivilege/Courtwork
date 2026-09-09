# 独立审查 · 产品语义与成熟 agent primitive 对齐（2026-09-09，用户转交）

审查对象：`main@62556b7` 与 Fable 文档提交 `99a9279`；结论 **Request changes**：保留布局、密度、三层视觉层级与 Settings 整页壳，未完成早期 index 要求的"产品语义与成熟 agent primitive 对齐"（逐 primitive 的 REUSE / REVERSE / REFERENCE / PROTOCOL / AVOID-COUPLING，语义收敛后再做材质 / 动效）。裁决见 [intake-round-3 §4g](../intake-round-3.md)。以下按原文登记要点，不作改写。

## 1. P0：重新收敛用户可见 ontology

copy-convention 为建立自身一致性而避开已有用户心智的词。建议逆转：

| 当前 / 拟议词 | 建议 | 理由 |
|---|---|---|
| `Chat` 禁用 | 恢复 Chat | 稳定用户概念；Frontier 明确区分 Chat / Work |
| `Session` 作主要名词 | 内部保留；用户看到 Chat | session 属 runtime / state 层 |
| `Runtime` | 从普通 Settings 顶层撤下 | 架构词；放 Developer › Runtime diagnostics |
| `Workspace` | 只表示真实文件夹 / workspace binding | 不泛指右侧工作面或 Matter |
| `Provider` | 在 Models 设置中正常使用 | 模型生态稳定概念 |
| `Connection` | 保留 | 已配置 provider / MCP / service 实例 |
| `MCP` | 显示 MCP servers | 不改造为 runtime connections |
| `Skill` | Skills | 可复用 instruction / workflow / resource package |
| `Plugin` | Plugins | 可安装能力包 |
| `Extension` | 只给 Developer / SDK 层 | 不与 Plugin 混作用户概念 |
| `Tool permission` | Approval / Ask before running tools | permission 适合持久策略，一次动作是 approval |
| `Write permission` | File access / Ask before editing files | 更易预测 |
| `Scheme` | Color scheme 或 Theme | 单独 Scheme 语义弱 |
| `Skin` | 删除 | 非成熟软件常用 IA |
| `Context` | 不作万能抽屉 | 分 Instructions / Skills / Sources / Memory |

assistant-ui 内部大量使用 runtime，但定义为前端 state / runtime adapter；用户看到的是 Thread、Composer、Tools、Approval。技术上存在 runtime 不意味着产品 UI 应有大写 Runtime 页面。

建议 Settings：**General / Appearance / Models / Tools & Integrations / Skills / Memory / Permissions / Keyboard / Developer**。Models = Provider、Connection、默认模型、per-chat override；Tools & Integrations = MCP servers 与普通服务连接；Skills = 安装 / 启用 / 禁用 / 来源；Plugins 先在 Integrations 内；Memory 独立；Developer 放 Runtime、raw config、logs、event / trace、experimental extensions。

## 2. Provider：Pi 做 capability substrate，DSH 做 interaction reference

Pi 已解决自定义 provider、baseUrl、API dialect、OpenAI-compatible 与 compat quirks。DSH 把这些包装成适合普通人的连接流程：内置 provider 少字段连接；Custom Provider 才暴露 Base URL、协议、credential、models，并支持对未保存表单 `Fetch available models`，取回后不自动持久化。

分层：CourtWork Provider UX → Provider / Connection Registry → Pi-compatible provider adapter → OpenAI / Responses / Anthropic / local / custom。用户交互不复刻 Pi 的 `models.json`。

Settings › Models › Add provider 三条 happy path：

| 入口 | 首屏字段 | Advanced |
|---|---|---|
| catalog provider（DeepSeek / OpenAI / Anthropic…） | API key → Connect | endpoint override |
| OpenAI-compatible / Anthropic-compatible | Base URL + API key → Fetch models | API format、headers、compat |
| Local endpoint | Base URL → Detect / Fetch models | protocol、manual model ID |

统一：Test connection → Fetch models → 选 model → Save connection。Provider ID 内部生成，用户只设 display name；compat quirks 不上首屏；credential 与 endpoint metadata 分离；已有 Chat / Work 固定实际使用的 model / provider revision，改默认只影响以后。同一 Add → Configure → Test → Review permissions → Save / Enable → Advanced 模式扩展到 MCP 等一切接入。

## 3. Chat 恢复；不恢复旧 CourtWork 的独立数据世界

Frontier（2026-07 后）区分 Chat（提问、讨论）、Work（明确 deliverable、长时间规划执行）、Project（跨多个 Chat / Work 共享文件、来源、instructions 的持久容器）；Chat 与 Work 都属于 conversations，同一 Project 可同时包含两者。

```text
Matter                           ← durable SE boundary
├── Chats
│   ├── mode = chat
│   └── mode = work
│        └── Run(s)
├── Sources / Files
├── Matter Memory
├── Policies
└── Workspace binding?           ← optional
```

Matter 是持久状态 / 治理边界；Chat 与 Work 是交互模式；Workspace 只是可选资源绑定。本地主权模型用户可以 New Chat 无 workspace；需要 agentic execution 时 Continue in Work，不复制、不迁移存储，只切换交互契约。恢复 Chat shell 列为前端 P0。

## 4. Memory

Frontier Memory 已从手工条目转向从 chats / files / connected sources 综合并披露 sources；Project-only memory 提供 scope boundary。CourtWork 前端契约：

```text
Current Chat      transient conversational context
Matter Memory     cross-chat, scoped to this Matter
Global Memory     cross-matter reusable user context; explicit / inspectable / disable-able
Sources           files / connected data ≠ Memory
Temporary Chat    does not read/write durable memory
```

不用 `Session Memory` 作 UI 词。Matter header 一个小 scope popover：`Memory · Matter only` → `Matter only / Matter + Global / Off` 与 sources。

## 5. 早期 agent-UI index 只消费了一半

早期 index：generic agent UI 不由 Expert 重写；Chrome 持有 chat shell、tool cards、trace viewer、approval widget、diff / artifact / permission / commit primitives；每个 primitive 得到 source-level reuse / reverse / reference 判断。Definition of Done：component → Canon mapping、per-primitive 决定、stable shared vocabulary、source-level P0 inspection、keyboard / narrow / reduced-motion 验证、语义收敛后才应用 material / motion。当前消费了 composition，缺 primitive contract + vocabulary + consumption ledger。

| 来源 | 消费方式 | 取得什么 |
|---|---|---|
| assistant-ui | REVERSE / REFERENCE | Thread、Composer、message / tool state、approval、auto-scroll、attachments、cancel / edit |
| Vercel AI Elements | REVERSE / REFERENCE | tool / reasoning / message / artifact 组件拆法 |
| Agent Elements | REVERSE；未来可能 REUSE | copy / source-owned component philosophy |
| BoardUI | REFERENCE / REVERSE | agent work surface / composition |
| CopilotKit | REFERENCE / REVERSE | governed actions、HITL |
| OpenHands / Suna | REFERENCE | execution / work surface、review center |
| Gatewerk / AgentGate / FlowGate | REVERSE | action gate、approval lifecycle |
| agenttrace-react | REFERENCE | trace progressive disclosure |
| MCP / AG-UI 等 | PROTOCOL | interoperability boundary |
| React-specific coupling | AVOID-COUPLING for now | 不为组件库把 fresh app 绑成 React |

assistant-ui 把 Thread 做成 scroll / empty / message / auto-scroll primitive，Composer 做成 submit、keyboard、focus、attachment、streaming / cancel primitive；Tool UI 已把 allow once / allow for session / always allow / deny、expired / cancelled 做成 contract。这些应成为 CourtWork 的行为验收规范，而非引入 React。正确消费是"CourtWork Composer 已对照 assistant-ui Composer 完成 keyboard / send / cancel / attachment / focus / streaming state audit；实现仍为 source-owned native component"。

## 6. 四个可逆前端 PR

| Slice | 范围 | Backend 可暂缺 |
|---|---|---|
| FE-01 Product vocabulary & Settings IA | 删自造 taxonomy；重做 Settings nav / copy；建立 canonical user vocabulary | 是 |
| FE-02 Models & Connections | DSH-style provider cards、compatible endpoint、Fetch models / Test、Advanced | 部分 mock adapter |
| FE-03 Chat / Work / Memory shell | 恢复 Chat；Chat ↔ Work 模式；Matter Memory / Global Memory / Sources 前端 IA | 是 |
| FE-04 Primitive reconciliation | Thread / Composer / Tool / Approval / Artifact / Trace primitive canon + external-consumption ledger | 是 |

动画、玻璃、推理动效、GUI 性能优化放在四块之后。最终裁决：保留视觉骨架，不把 vocabulary / Runtime IA 冻结为产品 contract。**底层按 Pi 建兼容能力，连接体验按 DSH；普通 agent UX 对齐 Chat / Work / Models / Tools / MCP servers / Skills / Plugins / Memory / Permissions；Runtime / Session / adapter / compat / composition 留在 architecture 与 Developer 层。Matter 负责 SE 持久治理，Chat / Work 只负责交互方式。**

来源链接（审查者提供）：assistant-ui primitives / thread 文档；Pi custom models 文档；DeepSeek Harness providers 指南；ChatGPT Learn projects / web；OpenAI release notes（Memory、Project memory）。本轮未逐一复核。
