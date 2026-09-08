# 第四轮前端工单 FE-01 … FE-04（Claude Opus，串行）

2026-09-09。依据 [intake-round-3 §4g](../intake-round-3.md) WK-88…95，输入 [语义审查](../inputs/review-semantics-2026-09-09.md)、[视觉审查](../inputs/review-visual-2026-09-09.md)。基线：WK11 合流后的清洁 `main`（以 Astra 回执 SHA 为准）。写权同前：`app/web/**`、扩展 renderer、体例与契约文档；不改 server / runtime / core / domains / brand 几何 / HTTP 契约；新 web 模块向 Astra 提 allowlist 路径请求。主规范 [frontend-layering-spec](../../../../design/frontend-layering-spec.md)；材质 / 动效在四单之后。

## FE-01 · 产品词表与 Settings IA + chrome / Home 层级

1. **词表（WK-89）**：重写 `engineering/design/copy-convention.md` §3 为用户可见词表；全站字符串按表替换，`text-sweep.md` 记三列。要点：Chat 恢复（未绑定 Matter 的会话）；Work（绑定 Matter 的会话）；Session 只在 Developer 与代码；Project 保留；Workspace 只指真实文件夹绑定；Models / Provider / Connection；MCP servers；Skills；Plugins；Extension 只在 Developer；一次动作 = Approval（Approve this write · Approve · Deny）；文件模式 = File access（Ask before editing · Allow edits · Read only）；Theme（Light / Dark / System）；Skin 词退役，Palette 作 Appearance 高级行（Slate · Gray steel · Custom tokens）；Instructions / Skills / Sources 取代泛用 Context；Memory 词按 WK-92。
2. **Settings IA（WK-90）**：导航改为 General / Appearance / Models / Tools & Integrations / Skills / Memory / Permissions / Keyboard / Developer。WK11 五节只搬家不改内容：Overview 与 Composition → Developer › Runtime；Instructions & context → Skills（Instructions · Skills · References · Prompt templates）；Capabilities & connections → Tools & Integrations（Tools · MCP servers · Plugins）；Permissions & environment → Permissions（policy · scopes · 解释）与 Models（provider / model 只读摘要，编辑在 Models）。Memory 组：一句用户世界的句子（CourtWork 目前不跨 Chat 记忆），无控件。Developer：Runtime、Extensions、runtime-info、Planned、logs 入口。
3. **Chrome（WK-94）**：sidebar header 只剩 window-safe-area + brand；`+ New project` 移到 PROJECTS heading；desktop 去 `×`，collapse 用 `panel-left`（chrome 行）；`×` 只在 < 1024 overlay；80px window-control safe area 与 shell strip 写入 `docs/interface-components.md` 作 shell layout contract。
4. **Home 层级（WK-94）**：上带弱（三数字一条 strip，无卡感，去 Heatmap Planned 行）、中带强（composer 唯一锚点；空态 31vh 留白退役为带距）、下带中（row 默认，card 只给可打开的 Work）；runtime 不可达收成一行连接状态 + Retry，诊断 disclosure；`Local test` 只在 composer 上下文行说一次，header capability badge 退役；`File writes  Ask` 收成 `Ask before editing ▾`；无持久装饰物。
5. **Tokens（WK-94）**：`ui-composition-standard.md` 加尺寸 token 表（sidebar 256–280、chrome 44–52、nav row 32–36、measure 740–800、Home composer 800–920、gaps 8 / 12 / 16、section 24 / 32、band 48 / 64）；border 审计：只留 input / selected / floating / error。
6. 反例：FE-T02（同动作多入口）、FE-T09（IA 变更后状态与合法动作不变）、FE-T10。既有回归（Home、Settings、RC 视口）按新 IA 更新断言并说明。

## FE-02 · Models & Connections（WK-91）

Settings › Models：Connections 列表 + Add provider 三条 happy path（catalog：API key → Connect；compatible：Base URL + key → Fetch models；local：Base URL → Detect / Fetch）；统一 Test connection → Fetch models → 选 model → Save connection；display name 用户填、provider ID 内部生成；compat / headers / API format 在 Advanced；credential 与 endpoint 分离；默认模型只影响以后的 Chat / Work，已有会话固定其 `runtime.bound`。MCP servers 沿同一 Add → Configure → Test → Review permissions → Save / Enable → Advanced。前端先按现有 `provider-config` / `provider-credential` / `provider-models` 做；Fetch models（未保存表单）与 Test connection 待 BE-17 / BE-18，未交付前按钮不出现。反例 FE-T03（请求值 / 有效值 / 绑定值）。

## FE-03 · Chat / Work / Memory shell（WK-92）

Chat = 未绑定会话（无 workspace、无项目文件夹也可）；Work = 绑定 Matter 的会话；`Continue in Work` = 既有 `POST /sessions/:id/extension`（新建或 `existingMatterId`），不复制、不迁移；Home、导航、标题用 Chat / Work 词；Project 为容器；Workspace 可选绑定。Memory：Settings › Memory 一句话与 Matter header 的 scope 位（无 BE-19 前只显示 `Memory · Off`，无 popover）；Temporary chat 待 BE。反例 FE-T01、FE-T11。

## FE-04 · Primitive reconciliation（WK-93）

先由 Sonnet EX-WK8 产出 [primitive ledger](../explore/ex-wk8-primitive-ledger.md)：Thread / Composer / Message / Tool row / Approval / Artifact / Trace / Inbox 逐 primitive 对照 assistant-ui、AI Elements、Agent Elements、BoardUI、CopilotKit、OpenHands / Suna、Gatewerk / AgentGate / FlowGate、agenttrace-react、MCP / AG-UI，标 REUSE / REVERSE / REFERENCE / PROTOCOL / AVOID-COUPLING，每行固定版本 / 路径与可迁移行为清单（keyboard、send / cancel、attachment、focus、streaming、auto-scroll、approval 状态机、expired / cancelled）。Opus 据 ledger 做行为审计与修正，实现仍为原生 ES module；交付 `contracts/primitive-canon.md`（component → Canon 映射 + 消费台账）与差异修复。反例 FE-T06、FE-T07 复跑。

## 交付与验收

每单：固定 SHA、受影响文件、消融表、`text-sweep.md` 增量、分配反例结果、allowlist / 后端请求、未检项（触控 / 读屏 / 真实 provider 分列）；作者验证与 Astra 独验分列；视觉四轴留用户。
