# 第四轮前端工单 FE-01 … FE-04（Claude Opus，串行）

2026-09-09。依据 [intake-round-3 §4g](../intake-round-3.md) WK-88…95，输入 [语义审查](../inputs/review-semantics-2026-09-09.md)、[视觉审查](../inputs/review-visual-2026-09-09.md)。基线：WK11 合流后的清洁 `main` `1688a7b`（Astra 回执 [wk11-main-integration](../../../../../evidence/wk11-main-integration-20260909/README.md)）。写权同前：`app/web/**`、扩展 renderer、体例与契约文档；不改 server / runtime / core / domains / brand 几何 / HTTP 契约；新 web 模块向 Astra 提 allowlist 路径请求。主规范 [frontend-layering-spec](../../../../design/frontend-layering-spec.md)；材质 / 动效为 FE-05，在四单之后（WK-99）；每单交付附五轮收敛表（WK-100）。

## FE-01 · 产品词表与 Settings IA + chrome / Home 层级

0. **WK11 遗留缺陷（WK-98）**：Explain permission 评估为空时渲染裸 `null`（改为条件句，FN-28）；深链 `#settings/<section>` 在 bootstrap 取得 token 前发读取导致 401 重试（先 bootstrap 再读）。 **追加（WK-102）**：`.jump-latest-button`（styles.css:1250）与 context popover（styles.css:2243）两处 `backdrop-filter` 收为 `--blur-chrome` 12 px / `--blur-transient` 16 px 两个 token，并各加 `@media (prefers-reduced-transparency: reduce)` 回退为 `--float` 实色；lint 增加两条检查（`backdrop-filter` 只出现在登记类名；每处有回退），进 `npm test`。
1. **词表（WK-89）**：重写 `engineering/design/copy-convention.md` §3 为用户可见词表；全站字符串按表替换，`text-sweep.md` 记三列。要点：Chat 恢复（未绑定 Matter 的会话）；Work（绑定 Matter 的会话）；Session 只在 Developer 与代码；Project 保留；Workspace 只指真实文件夹绑定；Models / Provider / Connection；MCP servers；Skills；Plugins；Extension 只在 Developer；一次动作 = Approval（Approve this write · Approve · Deny）；文件模式 = File access（Ask before editing · Allow edits · Read only）；Theme（Light / Dark / System）；Skin 词退役，Palette 作 Appearance 高级行（Slate · Gray steel · Custom tokens）；Instructions / Skills / Sources 取代泛用 Context；Memory 词按 WK-92。
2. **Settings IA（WK-90）**：导航改为 General / Appearance / Models / Tools & Integrations / Skills / Memory / Permissions / Keyboard / Developer。WK11 五节只搬家不改内容：Overview 与 Composition → Developer › Runtime；Instructions & context → Skills（Instructions · Skills · References · Prompt templates）；Capabilities & connections → Tools & Integrations（Tools · MCP servers · Plugins）；Permissions & environment → Permissions（policy · scopes · 解释）与 Models（provider / model 只读摘要，编辑在 Models）。Memory 组：一句用户世界的句子（CourtWork 目前不跨 Chat 记忆），无控件。Developer：Runtime、Extensions、runtime-info、Planned、logs 入口。
3. **Chrome（WK-94）**：sidebar header 只剩 window-safe-area + brand；`+ New project` 移到 PROJECTS heading；desktop 去 `×`，collapse 用 `panel-left`（chrome 行）；`×` 只在 < 1024 overlay；80px window-control safe area 与 shell strip 写入 `docs/interface-components.md` 作 shell layout contract。
4. **Home / Work composition（WK-94 / 96 / 97）**：按 [composition law](../inputs/composition-references-2026-09-09.md) 冻结的数值与约束实施：Home orientation ≤120 无数字；composer 中心 ≥ 主区高 55%、其上内容 ≤180、宽 760–880、初始 92–112；三个 StatTile 移到 composer 下方作 Today 模块头（一条 strip 三数字），Continue 行随后，Activity / Calendar 位只在有数据源时出现（Heatmap Planned 行移除）；ragged layout；Work 态不渲染任何 Home dashboard primitive，composer 沉底同 measure、初始 80–96、单层 controls；右侧 surface 出现时正文 ≥640；把这些写成 `home-geometry.mjs` / 会话几何脚本的断言。原第 4 项其余要点：上带弱（三数字一条 strip，无卡感，去 Heatmap Planned 行）、中带强（composer 唯一锚点；空态 31vh 留白退役为带距）、下带中（row 默认，card 只给可打开的 Work）；runtime 不可达收成一行连接状态 + Retry，诊断 disclosure；`Local test` 只在 composer 上下文行说一次，header capability badge 退役；`File writes  Ask` 收成 `Ask before editing ▾`；无持久装饰物。
5. **Tokens（WK-94）**：`ui-composition-standard.md` 加尺寸 token 表（sidebar 256–280、chrome 44–52、nav row 32–36、measure 740–800、Home composer 800–920、gaps 8 / 12 / 16、section 24 / 32、band 48 / 64）；border 审计：只留 input / selected / floating / error。
6. 反例：FE-T02（同动作多入口）、FE-T09（IA 变更后状态与合法动作不变）、FE-T10。既有回归（Home、Settings、RC 视口）按新 IA 更新断言并说明。
7. **五轮收敛表（WK-100）**：对 Home、Work、Settings 每一节各附一张（表面 · 轮次 · 检查项 · 结果 · file:line）；第 ④ 轮只验不越层与无未登记 blur。

## FE-02 · Models & Connections（WK-91）

Settings › Models：Connections 列表 + Add provider 三条 happy path（catalog：API key → Connect；compatible：Base URL + key → Fetch models；local：Base URL → Detect / Fetch）；统一 Test connection → Fetch models → 选 model → Save connection；display name 用户填、provider ID 内部生成；compat / headers / API format 在 Advanced；credential 与 endpoint 分离；默认模型只影响以后的 Chat / Work，已有会话固定其 `runtime.bound`。MCP servers 沿同一 Add → Configure → Test → Review permissions → Save / Enable → Advanced。前端先按现有 `provider-config` / `provider-credential` / `provider-models` 做；Fetch models（未保存表单）与 Test connection 待 BE-17 / BE-18，未交付前按钮不出现。反例 FE-T03（请求值 / 有效值 / 绑定值）。

## FE-03 · Chat / Work / Memory shell（WK-92）

Chat = 未绑定会话（无 workspace、无项目文件夹也可）；Work = 绑定 Matter 的会话；`Continue in Work` = 既有 `POST /sessions/:id/extension`（新建或 `existingMatterId`），不复制、不迁移；Home、导航、标题用 Chat / Work 词；Project 为容器；Workspace 可选绑定。Memory：Settings › Memory 一句话与 Matter header 的 scope 位（无 BE-19 前只显示 `Memory · Off`，无 popover）；Temporary chat 待 BE。反例 FE-T01、FE-T11。

## FE-04 · Primitive reconciliation（WK-93）

先由 Sonnet EX-WK8 产出 [primitive ledger](../explore/ex-wk8-primitive-ledger.md)：Thread / Composer / Message / Tool row / Approval / Artifact / Trace / Inbox 逐 primitive 对照 assistant-ui、AI Elements、Agent Elements、BoardUI、CopilotKit、OpenHands / Suna、Gatewerk / AgentGate / FlowGate、agenttrace-react、MCP / AG-UI，标 REUSE / REVERSE / REFERENCE / PROTOCOL / AVOID-COUPLING，每行固定版本 / 路径与可迁移行为清单（keyboard、send / cancel、attachment、focus、streaming、auto-scroll、approval 状态机、expired / cancelled）。Opus 据 ledger 做行为审计与修正，实现仍为原生 ES module；交付 `contracts/primitive-canon.md`（component → Canon 映射 + 消费台账）与差异修复。反例 FE-T06、FE-T07 复跑。

## FE-05 · 材质与光效（WK-99 / 101 / 102，EX-WK9 回执后由 Fable 填值）

前置：FE-01…04 合流，且各表面五轮收敛表 ①②③⑤ 通过；[EX-WK9](EX-WK9-material-sources.md) 回执。范围只在 WK-101 登记的表面：Chrome 二择（Work 态沉底 composer、滚动时主区 header 带是否取 `--glass` + `--blur-chrome`，每项给消融表与去 blur 对照截图，四轴留用户）；Transient 统一 `--glass-muted` + `--blur-transient` + `--rim` + `--shadow-float`；glass-on-glass 二择；Focus 局部化审计；Modal 沿 L3。Token 只用 WK-102 闭集；每处半透明表面有 reduced-transparency 回退；深浅两宗与 reduced motion 各验。不得：侧栏 / 内容区 blur；折射 / lensing；随尺寸变化的材质；引入运动库；新增高度层。交付附"哪一像素改变了哪一判断"。

取值（WK-104，EX-WK9 回执后填）：`--blur-chrome: 12px`、`--blur-transient: 16px`；`--glass-alpha-chrome` 浅 0.86 / 深 0.10，`--glass-alpha-transient` 浅 0.92 / 深 0.16（深宗为起点值，contrast-report 通过为准）；`saturate(1.4)` 只在 transient；`--rim`、`--shadow-float` 不变。回退：`@media (prefers-reduced-transparency: reduce)` 与 `:root[data-reduce-transparency]` 两条规则同指 `background: var(--float); backdrop-filter: none`。Appearance 增本设备偏好行 `Reduce transparency`（存法同 reduced motion 偏好，无后端）。反例：transient 打开于 chrome glass 之上时只剩一层 glass；开关开启后页面无任何生效的 `backdrop-filter`（lint + 运行时断言）；深浅两宗对比度不降。

## 交付与验收

每单：固定 SHA、受影响文件、消融表、五轮收敛表（WK-100）、`text-sweep.md` 增量、分配反例结果、allowlist / 后端请求、未检项（触控 / 读屏 / 真实 provider 分列）；作者验证与 Astra 独验分列；视觉四轴留用户。
