# Work Surface Kit · 第三轮接管（Fable，2026-09-08）

承接 [第二轮](intake-round-2.md)（至 WK-76）。基线 `main` `8023e1b`（已合流 Fable 两条线与 DEC-012）。本轮三项用户输入：首屏分层同意、Settings 按 dashboard 编排并开放用户自定义、Home dashboard 前几轮文档与参考图可消费。

## 1. 首屏（用户同意 Fable 分层）→ WK-77

| 编号 | 裁定 | 来源 |
|---|---|---|
| WK-77 | **Pages 首屏与 Home hero 分层。** Pages H1 = Astra 候选 "Turn AI output into work you can build on." / "把 AI 的产出，变成接得下去的工作。"；Paper 句 "Work that exists beyond the model." / "让工作存在于模型之外" 退为 Paper 一图与 §10 Paper 桥的标题；品牌句作字标副句；产品 Home hero 保持 Paper 句（WK-26 不变）。Astra 的 "We're building toward…" 定位段可用，与状态三档一致。DEC-012 首屏项据此修订 | 用户 2026-09-08；[public-copy §3](../../../release/2026-09-08/public-copy.md) |

## 2. Settings 按 dashboard 编排 → WK-78

输入：用户两张参考截图（[登记](inputs/settings-references-2026-09-08.md)）；现有 Settings 对话框（`app/web/index.html:460–517`：Model & connection、Session settings、Runtime resources、Runtime & extensions、Planned）；WK-63/64 Runtime Workbench IA；WK-27 未支持能力只作 Planned 行；WK-69 层级模型；WK7 色彩三层与 `skins/`；EX-RC1 runtime 表面追溯。

| 编号 | 裁定 |
|---|---|
| WK-78 | **Settings 由对话框改为整页面。** (1) 承载：L3 页面替换主区（chat-panel），应用侧栏保留可操作（同 WK-74 展开态），页内左列为设置导航 + 搜索，右列分节；顶部 Back 与 Escape 回到进入前的会话；hash `#settings/<section>` 可深链。窄屏导航折为顶部下拉。(2) 分组只画契约已有的对象：**General**（Connection：provider / API 格式 / base URL / 模型 / API key；New sessions：默认 File writes Ask / Write / Read；Data：数据目录、adapter、host 状态只读）、**Appearance**（Scheme：Light / Dark / System；Skin：Slate 默认 + `gray-steel` + 用户 Tier S token 集；Text size：Small / Medium / Large；Code font：单行输入；Reduced motion：跟随系统 / 开）、**Keyboard**（现有快捷键只读清单；重绑定 Planned）、**Runtime**（WK11 的 Overview / Capabilities / Context / Extensions / Models / Governance 作为本组节，Models 与 General 的 Connection 同一数据源、只在一处编辑）、**Developer**（Extensions 生命周期、Planned 能力清单、runtime-info）。(3) 行的解剖：标题 + 一句作用域 / 后果说明 + 右侧单一控件；Appearance 的 Scheme / Skin / Text size / Code font 行下方各一块真实产品片段预览（一条 Chat Flow 行 + 一段代码），随选择即时变化。(4) 用户自定义的边界："更开放"指 Tier S 色阶、字号、代码字体、reduced motion、快捷键清单可见；不开放任意 CSS / JS 注入。用户 skin = 粘贴或导入一组 Tier S token，按 `tools/lint-colors.mjs` 规则校验（只允许 hex 落在 Tier S），不通过则拒绝并指出行。(5) 持久化：外观与键盘偏好只在本设备（localStorage，键带数据目录标识），不进 runtime-state，不新增后端；Connection / File writes / Runtime 仍走既有 provider-config、permission-mode 与 control plane。(6) 不迁移：Full access 总开关、Pets / Analytics / Billing、无后端的语言与菜单栏项。 |

## 3. Home dashboard 前几轮文档与参考图 → WK-79

| 编号 | 裁定 |
|---|---|
| WK-79 | **Home 三带与 dashboard 施工先消费既有文档与参考图，不重开 explore。** 入口按先后：(a) 第二轮 WK-32…37、WK-46、WK-56、WK-76；(b) [EX-WK5 数据与表面清单](explore/ex-wk5-home-work-data.md)；(c) [WK9 设计画布](design/wk9/)：`home-a-1440.html`、`home-b-1440.html`、`home-shell-1440.html`、`alignment-1440.html`、`work-collapsed / expanded-1440.html`、`clean-evaluation.md`、`gaps-wk9.md`；(d) 2026-09-07 Dashboard 设计轮（SE continuation 私有证据副本 `Courtwork-evidence/2026-09-08/continuation/engineering/mvp/execution/gui-completeness/dashboard-design/`：`design-contract.md` DC-1…11、`canvas/src/DashboardQuiet / DashboardOffline / Main.dc.html`、`dashboard-input/dashboard-reference.jpeg`、两份 Sonnet explore）；(e) [presentation-primitives.d.ts](contracts/presentation-primitives.d.ts)。规则：只画已记录字段（DC-3），上带热力图仍为 BE-1/3 gap，三集合来自 work-summary；画布中的 accent、装饰与未记录字段一律删（WK-47 消融）。WK10b 第一段 Home 下带两态与 WK12 Settings 页共用这套输入。 |

## 4. 前端依赖的表示原语与未消费项 → WK-80 / WK-81

用户补充：热力图、日历一类主要依赖前端的局部，以既有文档 / PR 裁定为准，Fable 掌架构，Opus 按统一体例实现，不得局部自说自话；前几轮另有前端未消费项，派 Sonnet 只读 diff（文档、参考 index、本地源码），Fable 按局部派单。

| 编号 | 裁定 |
|---|---|
| WK-80 | **表示原语只按既有契约实现。** Heatmap / Calendar / StatTile / WorkCard / ProgressList / PreviewList / ContextList 的语义、字段与缺失值处理以 WK-34、WK-37、[work-surface-boundaries §5](../../../design/work-surface-boundaries.md) 与 [presentation-primitives.d.ts](contracts/presentation-primitives.d.ts) 为准：组件不认识数据来源，adapter 只投影已记录字段。Heatmap 等 BE-1 / 3 的 `work-activity` 按日聚合，交付前产品内为 Planned，设计中可画；Calendar 无真实数据源，只在设计与 gap 中存在，不进产品；StatTile 取三集合 `total`，无"今日"口径。实现者引用裁定编号，不新造字段、口径或组件名。 |
| WK-81 | **未消费项只读 diff（EX-WK7，Sonnet）。** 对照前几轮全部前端裁定与输入（WK-1…79、DC-1…11、UP-1…16、RC-1…10、WK9 gaps、EX-WK5、runtime-ui-gaps、backend-requests BE-1…13、consumption-ledger、user-message-audit、design/* 体例）与当前 `main` 源码，逐项标 consumed / partial / not consumed / superseded / backend-blocked，附 `path:line`。输出 `explore/ex-wk7-frontend-consumption-diff.md`；Fable 据此按局部派 Opus 单，每单引用裁定编号与体例条款。 |

## 4a. 前端分层与自定义入口规范 → WK-82

用户提交独立审查候选《前端分层与自定义入口规范 v0.1》（29 条、12 反例），要求从分散设计说明收敛为一份主规范，严明落在对象、接口、状态与权限。

| 编号 | 裁定 |
|---|---|
| WK-82 | **采纳为主规范** [frontend-layering-spec](../../../design/frontend-layering-spec.md)（1.0-候选）：FN-01…29 全部采用或改写，无拒绝；逐条裁决见其附录 A。改写项：FN-07 保留 `app.mjs` 为会话 / 准入 / 生命周期 owner；候选 §3.1 与 WK-63 合并为 Runtime 组的意图分组（Overview / Composition / Instructions & context / Capabilities & connections / Permissions & environment），kind 作过滤；设置条目显示 Source / Requested / Effective / Bound 四层（新增 Requested）；FE-T01…12 分配到 WK10b / WK11 / WK12 / WK13 与 Astra H1 / H3，全部 not_run。三份体例、color-governance、interface-components、ui-orchestration-contract 继续承载产品配置与 owner 事实，不再各自解释分层。 |

## 4b. 清洁节点与 Harness Core 交付 → WK-83

| 编号 | 裁定 |
|---|---|
| WK-83 | **合流后从清洁节点开工。** Astra 交付 `codex/harness-core` `d6247a8`（[证据](../../../../evidence/harness-core-20260908/README.md) 在其工作树，合流后随 main 可读）：通用 Work Core、NDA 后端闭环、跨 Session 续行、独立历史读取；[契约](../../../../docs/work-core/contract.md) 覆盖 [harness-core §4](../../../execution/2026-09-08-two-lines/harness-core.md) 的 H1-a / b / c、H2 执行身份与 H3 只读路径。前端单一律从 Astra 合流 `d6247a8` + `claude/fable-settings` 后的 main 建树；WK10b 第二段按契约改写，排入序 2。G1 真实 provider、G2 / G3 前端验收、G4 / G5 公开演示仍开放。 |

## 4c. WK10b 第一段复核 → WK-84

| 编号 | 裁定 |
|---|---|
| WK-84 | Opus 交付 `claude/wk10b-first` `f1ef5ae`（实现 `84803ad`，基线 `a2c2e4c`）：glyph 语义表、Chat Flow 一行解剖、宿主槽位契约 `work.surface`、四种缺席态分句、两份表面文档改写；170/170，FE-T05 / T07 作者通过。Fable 复核见 [delivery-wk10b-1 §10](delivery-wk10b-1.md)：接受 lint 选择器改名、可见词 `extension`、删除通用 Run action、不为仅声明的 uiSlots 画行。交 Astra 合流；第二段从合流后 main（含 `7941bdb` 接缝）建树。 |

## 4d. WK10b 第二段复核 → WK-85

| 编号 | 裁定 |
|---|---|
| WK-85 | Opus 交付 `claude/wk10b-second` `10f185a`（实现 `e118992`，基线 `62556b7`）：`inbound-nda/renderer.mjs` 逐规则视图、按 `humanActions` 描述符出决定与修订、`request_id` 内容绑定重试、`work-query` 回执行、两段绑定面与 `existingMatterId` 续行、只读历史、历史来源字节；178/178，FE-T06 / T08 / T11 作者通过。Fable 复核见 [delivery-wk10b-2 §11](delivery-wk10b-2.md)：受信 renderer 可 import 固定 kit 导出面；绑定面顺序按数据（有工作则 Continue existing 在上，排入 WK13）；`conflict` 唯一着色。后端请求 BE-14（决定时刻）、BE-15（Matter title）登记。交 Astra 合流。 |

## 4e. WK13 复核 → WK-86

| 编号 | 裁定 |
|---|---|
| WK-86 | Opus 交付 `claude/wk13-home` `f1875ae` + r2 `6de394e`（基线 `b7fa5e2`）：Home 三带、StatTile × 3 带筛选、Heatmap Planned 行、WorkCard 行 / 卡两态、`presentation-adapters.mjs` 按契约、j/k 键盘、绑定面按数据排序、`ui-composition.md` 改写；185/185，FE-T01 / T02 / T12 作者通过。裁定：上带在场时 composer 带按 WK-46（WK-76 留白退役）；`In progress` 为 Continue 集合可见名；`.d.ts` 收编两只读 adapter；空态 31vh 留白留用户确认。合流前置：STATIC 加 `presentation-adapters.mjs`。复核见 [delivery-wk13 §12](delivery-wk13.md)。 |

## 4f. WK12 复核 → WK-87

| 编号 | 裁定 |
|---|---|
| WK-87 | Opus 交付 `claude/wk12-settings` `7599a91`（基线 `429fdd6`）：Settings 整页壳（L3、侧栏保留、分组导航 + 搜索、hash 深链、Back / Escape 回到来处）、五组、外观自定义（Scheme / Skin / Text size / Code font / Reduced motion，用户 skin 按 lint 规则校验）、本设备偏好首帧应用、Runtime 意图分组与 WK11 挂载点；204/204，FE-T09 / T10 作者通过。裁定：预览收为一块（随 WK11）；保留 This session 行；用户 skin 对比度警告（随 WK11）；内联偏好脚本接受；BE-16 登记。复核见 [delivery-wk12 §13](delivery-wk12.md)。 |

## 4g. 两份独立审查的裁决 → WK-88 … WK-95（2026-09-09）

输入：[语义审查](inputs/review-semantics-2026-09-09.md)、[视觉审查](inputs/review-visual-2026-09-09.md)，均为 Request changes 且不推翻视觉骨架。工单见 [WO-FE-round4](work-orders/WO-FE-round4.md)。

| 编号 | 裁定 |
|---|---|
| WK-88 | **处置原则。** 保留视觉骨架、Lucide 静态 vendor 与 glyph 契约、三层视觉层级、Settings 整页壳；语义与 IA 按成熟 agent 语义收敛；Runtime / Session / adapter / compat / composition 留在架构与 Developer 层；Matter 负责持久治理，Chat / Work 只是交互模式。材质 / 动效在语义收敛后。 |
| WK-89 | **用户可见词表（替代 copy-convention §3，FE-01 改写）。** Chat（未绑定 Matter 的会话）· Work（绑定 Matter 的会话）· Project · Run（Work 内）· Session 只在 Developer / 代码 · Workspace 只指真实文件夹绑定 · Models / Provider / Connection · MCP servers · Skills · Plugins · Extension 只在 Developer · 一次动作 = Approval（Approve this write · Approve · Deny）· 文件模式 = File access（Ask before editing · Allow edits · Read only）· Theme（Light / Dark / System）· Skin 词退役，Palette 作 Appearance 高级行 · Instructions / Skills / Sources 取代泛用 Context · Memory（Matter memory · Global memory · Sources · Temporary chat）。Paper 术语仍只在命题段；public-copy §2 随 FE-01 同步。 |
| WK-90 | **Settings IA。** General / Appearance / Models / Tools & Integrations / Skills / Memory / Permissions / Keyboard / Developer。WK11 五节搬家不改内容：Overview + Composition → Developer › Runtime；Instructions & context → Skills；Capabilities & connections → Tools & Integrations；Permissions & environment → Permissions 与 Models。Memory 组一句用户世界句子，无控件（待 BE-19）。frontend-layering-spec §2.1 / §3.1 的 Runtime 顶层组与意图分组据此修订为 Developer 内分组。WK11 在飞，按现契约完成后由 FE-01 搬家。 |
| WK-91 | **Provider UX：Pi 为 capability substrate，DSH 为 interaction reference。** 三条 happy path、Test → Fetch models → Save、内部 provider ID、compat 入 Advanced、credential 与 endpoint 分离、已有会话固定 `runtime.bound`；同一 Add → Configure → Test → Review permissions → Save 模式用于 MCP。后端 BE-17（对未保存连接 Fetch models）、BE-18（Test connection）登记，未交付前不画按钮。 |
| WK-92 | **Chat / Work / Matter。** Chat = 未绑定会话，Work = 绑定 Matter 的会话，Continue in Work = 既有绑定路由，不复制；Project 为容器，Workspace 可选。Memory 前端契约按审查 §4 采用词与 scope；实现待 BE-19（memory adapter）与 BE-20（Temporary chat）。 |
| WK-93 | **Primitive 台账。** 派 Sonnet EX-WK8 逐 primitive 标 REUSE / REVERSE / REFERENCE / PROTOCOL / AVOID-COUPLING（assistant-ui、AI Elements、Agent Elements、BoardUI、CopilotKit、OpenHands / Suna、Gatewerk / AgentGate / FlowGate、agenttrace-react、MCP / AG-UI）；Opus 据此做 Composer / Thread / Tool / Approval / Artifact / Trace 行为审计与修正，实现仍原生 ES module，不引 React。 |
| WK-94 | **Chrome 与 Home 层级。** Lucide 冻结、brand / domain SVG 分库（已是）；sidebar header：`+ New project` 移到 PROJECTS heading，desktop 去 `×`，collapse 用 `panel-left`，`×` 只在 overlay；80px window-control safe area 升为 shell layout contract；Home 三带弱 / 强 / 中，StatTile 为一条 strip 内三个数字，Heatmap Planned 行从 Home 移除（实现态文案不上 production Home），空态 31vh 留白退役为带距（composer 唯一锚点；此前留用户的一项据此收口，用户可否决）；runtime 不可达一行 + Retry；`Local test` 只说一次（header badge 退役）；`File writes  Ask` → `Ask before editing ▾`；尺寸 token 表入 ui-composition-standard；border 只留 input / selected / floating / error。 |
| WK-95 | **次序。** WK11 完成并合流 → FE-01（词表 + IA + chrome + Home 层级）→ FE-02（Models & Connections）→ FE-03（Chat / Work / Memory shell）→ FE-04（primitive 审计；EX-WK8 可先行并行）。四单之后才进材质 / 动效。 |

## 4h. Composition law：Home / Dashboard / Work 三种版面状态 → WK-96 / WK-97

输入：[版面参考与法则草案](inputs/composition-references-2026-09-09.md)（用户"仅供参考"）。与 WK-94 一致并更精确，收为可检查约束；替代 WK-46 的带高数值与 WK13 的"三带等权"读法。

| 编号 | 裁定 |
|---|---|
| WK-96 | **三种 composition state 冻结。** Home = 中心向下：orientation（≤120，只放 hero 句与一行状态，无 greeting 人格化）→ composer（唯一 L1 锚点，宽 760–880，初始 92–112，中心不低于主区高 55%，其上非 chrome 内容 ≤180）→ standing context 行 → 32–48 → 下部 modules（Today 三数字 strip、Continue 行、Activity / Calendar 等 compact card，ragged layout，不填满 grid；首屏下半部必须有可见 continuity 内容）。WK13 的三个 StatTile 从上带移到 composer 下方作 Today 模块头，上带不再承载数字。Dashboard = 可组合背景：card 是模块与编排单位，card 内无框内容，禁止 nested card；Calendar 等窄时 compact，展开进独立 surface。Work = 顶部向下推进：Home dashboard primitive 全部退出，reading column 700–780 为 L1，composer 沉底同 measure，右侧 contextual surface 有内容才出现，正文 measure 不低于 640，不足则 overlay / collapse。层级判断只问"是否真的跨了一层"（沿 WK-69 L0–L3）。以上数值为产品配置，进 `ui-composition-standard.md`；约束进 Home / Work 几何断言。 |
| WK-97 | **Composer 两种 variant，同一 primitive。** Home：primary entry、optical center、可略宽于阅读列、初始 96–112、controls 可完整。Work：continuation control、viewport 底部、与 reading measure 同宽、初始 80–96、controls 压成单层、不承担 hero。不新造第二个 composer 组件。WK-58 桌面居中 / 会话沉底与 WK-73 anatomy 不变。 |

FE-01 第 4 项按本节实施；参考图登记标签：Fable / Cowork Home = Home vertical composition / composer prominence / modules-below-entry；ChatGPT Work = active-work reading measure / bottom composer / dashboard evacuation。

## 4i. WK11 复核 → WK-98

| 编号 | 裁定 |
|---|---|
| WK-98 | Opus 交付 `claude/wk11-workbench` `644cc43`（基线 `14ebd61`）：Runtime 目录入 Settings 五个意图节，四层 Source / Requested / Effective / Bound，profile / policy 编辑、权限解释、Context inspector、Configurable / Inventory、`/` 查找、FN-16 冻结无"排队"，host 清理（删 `runtimeControlRequest`），WK-87 两项；208/208，RC 20 / 9 / 36，FE-T03 / T04 作者通过。裁定：接受删除 L2 Runtime 面板（导轨卡保留粗读数）；RC 断言变更按理由接受；裸 `null` 与深链 401 竞态列 FE-01 首项；BE-13 未复现保留。复核见 [delivery-wk11 §17](delivery-wk11.md)。 |

## 4j. 材质层级与"完成度"次序 → WK-99 … WK-103（2026-09-09）

输入：[材质层级提案](inputs/material-grammar-2026-09-09.md)（用户"仅供参考"；Apple HIG / WWDC25 / Fluent 为转述，图未随附）。基线 main `1688a7b`。与 WK-15 / 52 / 58 / 69 / 88 / 95 与 UP-11 对照后裁决；不新增高度层，不改 WK-69。

| 编号 | 裁定 |
|---|---|
| WK-99 | **完成度次序采纳。** Information → Geometry → Components → Material → Light / Motion 为公开表面的完成次序，与 WK-88 / WK-95 同向：FE-01…04 覆盖前三层，材质与光效为 **FE-05**，位于 FE-04 之后；前三层未收敛的表面不得进入 FE-05。"功能已实现"不是页面完成标准。 |
| WK-100 | **五轮收敛为验收字段。** 每单交付对其触及的每个公开表面附一张五轮收敛表：① 信息层级（同语义 label 同字号 / weight；说明文本退出主视觉；每个表面唯一 primary action，沿 WK-25）；② 光学对齐（标签起点、输入框宽度、行距、图标 optical size 而非 bounding box）；③ 组件几何（同级 input 同高同 radius；相似控件同宽或服从 grid；divider / border / shadow 只用固定 token，沿 WK-94 border 审计）；④ 材质层级（背景只用 WK-69 四层 role；blur 只出现在 WK-101 登记的表面语义）；⑤ 交互状态（SH-4 七态加 running / error）。①②③⑤ 自 FE-01 起验；④ 在 FE-05 前只验"不越层、无未登记 blur"。机械化检查：`tools/lint-colors.mjs` 已管背景 role，FE-01 增加两条——`backdrop-filter` 只出现在登记类名；每处 `backdrop-filter` 有 `prefers-reduced-transparency` 回退（可入 lint-colors 或新 `tools/lint-materials.mjs`，进 `npm test`）。表格式：表面 · 轮次 · 检查项 · 结果 · file:line。 |
| WK-101 | **材质语法映射到 WK-69，六层不新增高度。** Foundation = L0 `--frame`（body、侧栏）：实色、无 blur；**侧栏不做 glass**（WK-52 保留；对应 Fluent 中 Mica 作长期背景的角色），提案中"sidebar / toolbar 入 Chrome glass"不采。Content = L1 `--panel` / `--panel-muted`：近实色，层级靠间距 / 分组 / 1 px line，永不 blur。Chrome = L2 中**浮在滚动内容之上**的控件：`.jump-latest-button`（已是）、Work 态沉底 composer（候选，FE-05 二择）、内容滚过时的主区 header 带（候选）——允许 `--glass` + `--blur-chrome`；Home 态 composer 下无滚动内容，保持 `--float` 实色。Transient = L2 popover / menu / 命令面板 / model picker：`--glass-muted` + `--blur-transient` + `--shadow-float` + `--rim`。Focus = 局部：`--accent-soft` ring、selected 表面、运行中 shimmer（UP-16）；无整屏发光。Modal = L3：`--scrim` + `--float`。禁令：glass-on-glass（transient 打开于 glass chrome 之上时，二者只留一层 glass，FE-05 以消融表二择）；内容区整体玻璃化；折射 / lensing、随尺寸变厚的动态材质不采（UP-11 不变）。 |
| WK-102 | **材质 token 闭集。** blur 只两档：`--blur-chrome` 12 px、`--blur-transient` 16 px（现有两处硬编码收为 token）；`saturate()` 只在 transient；`--glass` / `--glass-muted` / `--rim` / `--shadow-float` 与上述两档为全部材质 token，组件不得私有取值。每处半透明表面必须有 `@media (prefers-reduced-transparency: reduce)` 回退到对应实色 role（`--float`）；现两处（`.jump-latest-button` styles.css:1250、context popover styles.css:2243）无回退，列 **FE-01 第 0 项**。Light / Motion 沿 WK-15（140 ms 档、不循环、hero `summon` 一次、reduced-motion 静态），FE-05 不引运动库。 |
| WK-103 | **来源先行。** 提案三处引用工程内无索引行；派 Sonnet [EX-WK9](work-orders/EX-WK9-material-sources.md) 转录（URL、访问日、许可、取值段落、消费模式 REFERENCE）并列 `prefers-reduced-transparency` 支持面；EX-WK9 与 FE-01…04 并行，FE-05 工单取值在其回执后由 Fable 填写。未公开数值不估算。 |

| WK-104 | **EX-WK9 消费（回执 [ex-wk9](explore/ex-wk9-material-sources.md)，带溯源索引）。** 一手确认：内容层禁 glass 与禁 glass-on-glass（WWDC25 219）；"hierarchy 由 layout / grouping 表达"出自 WWDC25 356；"控件大则更厚"确为 Apple 官方表述，WK-101 不采是主动选择，改为静态两档；Fluent Mica 供长期背景、Acrylic 只供 transient，两页各自禁多层堆叠；Acrylic 与 Liquid Glass 的 blur / tint 数值均未公开，FE-05 不引外部数值，只用本地闭集。回退机制取 Fluent 型（切实色 `--float`）而非 Apple 型（更霜化）：因 `prefers-reduced-transparency` 只有 Chromium 118+ 支持、Safari 全无，回退必须有产品内开关——Appearance 增一行本设备偏好 **Reduce transparency**（与 reduced motion 同类，WK-77 Tier S 范围），置 `:root[data-reduce-transparency]`；CSS 两条规则（媒体查询 + 属性）指向同一实色回退。开关与属性由 FE-05 实现，FE-01 第 0 项只做媒体查询回退。`--glass` 与 `--glass-muted` 现共用同一 alpha、不可区分：FE-05 给 transient 比 chrome 更不透明一档（浅宗 0.86 / 0.92 起，深宗同向），否则合并为一个名字——闭集里不许两个名字一个值。运行时 glass-on-glass（popover 打开于 `.jump-latest-button` 之上）静态 CSS 未验，列 FE-05 反例。来源行登记入 [sources](../../../design/sources.md) S10。 |

未采纳项一览：侧栏 / toolbar 常态 glass；"控件大则更厚"的动态材质；折射 / lensing；以 blur 数值表达层级。派单见 [dispatch-round-4](dispatch-round-4.md)。

## 4k. FE-01 复核 → WK-105（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-105 | Opus 交付 `claude/fe01-vocab-ia` `bfefcd2`（基线 `1688a7b`，六次提交）：WK-98 两缺陷、WK-102 两 token 与回退、`tools/lint-materials.mjs` 入 `npm test`；词表与 text-sweep；Settings 九组 IA；chrome；Home / Work composition 与几何断言；尺寸 token 表、border 审计、shell contract；五轮收敛表；FE-T02 / T09 / T10 12/12、composition 16/16、RC 20/9/36；212/212。Fable 独立重跑一致，范围干净。六项待裁：① 取 WK-96 的 55 %；② 92–112 指输入本体；③ scope strip 多处挂载单一真源，接受；④ 分隔线与对象边框为两个通道，不做全站清扫；⑤ `--nav` 250 → 256 列 FE-02 第 0 项；⑥ 侧栏脚保持工具条，账户行待真实身份对象。接受，交 Astra 合流（先 `claude/fe01-vocab-ia`，再 `claude/fable-round4b`）；复核见 [delivery-fe01 §13](delivery-fe01.md)。 |

## 4l. Astra 集成补丁复核 → WK-106（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-106 | Astra 合流 FE-01 为 `6bdc6db` / `ccc1076`，并以自写两行补丁 `343e59b` 修 WK-98 裸 `null` 遗漏（`runtime-view.mjs` 资源 detail 两处 `append` 改为过滤缺席片段；根因是 `permissionDetail` / `sourceInspector` 可返回 `null`，原生 `append(null)` 变文本）。Fable 非作者复核：读码确认两个 helper 确有 `return null` 路径而 `layerBlock` / `sourceDetail` / `rowActions` 无；在清洁 `main` `2b6c221` 重跑 212/212；用自有端口 8893、新数据目录与新 Chrome profile 复跑 Astra 的 WK-98 追加脚本 10/10（九个深链无 401、`ws_write` 展开无裸 null）。接受；不改数据、权限算法、端点或全局 DOM 工具。清洁节点 `2b6c221`。 |

## 4m. FE-02 复核 → WK-107（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-107 | Opus（`opus-wo-low`，effort low）交付 `claude/fe02-models` `38717bd`（基线 `2b6c221`，五次提交）：第 0 项 `--nav` 256；Settings › Models 重建为 Connections 一行 + Add provider 三条路径 + 五步流程（BE-17/18 两步只留文本、零控件）+ Advanced；Tools 组 MCP 接入六步说明块（零 focusable）；同行级 input / select 收成 32 / 8px 一档；窄屏 segment 命中区 39 → 44（RC 视口脚本量法修正抓出，量法改为以 `.segment` 为命中区，与 `.runtime-switch` 同理，接受）。写权干净（`app/server` / `runtime` / `core` / `domains` / `brand` 差异为空，无 allowlist 请求）。Fable 独立重跑：219/219、lint-colors / lint-materials ok、contrast 全通过；自有端口 8893、新数据目录复跑 `models-checks` 16/16、`composition-checks` 16/16，结果与交付页一致。六项待裁：① Connections 只画后端真有的一条，接受，多行待 BE-21；② 本设备 display name **不接受**——它是连接属性而非设备偏好，存进偏好即第二真源，且是工单禁止的新前端状态与明确待替换的过渡实现，裁定移除，待 BE-21 作为连接字段回来（修订由第二个 `opus-wo-low` 执行为 `a82c192`，Fable 复跑 218/218 + models-checks 16/16 + composition 16/16，复核记于 delivery-fe02 §13，分支头 `565d18c`）；③ provider ID 由后端目录给，前端不生成，接受，"内部生成"归 BE-21；④ `ui-composition-standard.md` 侧栏宽注 250 → 256 由 Fable 在本支改正；⑤ Compatible endpoint 今日只能"给目录身份换端点"，按事实写，接受，独立第三方 provider 归 BE-21；⑥ 冻结错误直出后端原话，接受，错误文案抻平属一次独立裁定（涉及全部 4xx / 409 展示），列入 FE-03 后议题，不在本单。BE-21（连接注册表）、BE-22（MCP server 注册）登记入 [backend-requests](backend-requests.md)。接受，交 Astra 合流（先 `claude/fe02-models` `565d18c`，再 `claude/fable-round4c`）。 |

## 4n. BE-17/18 消费与 FE-03 派单 → WK-108（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-108 | Astra 合流 FE-02 为 `main` `4d9714e`（219/219、两项 lint、contrast、smoke、Models 16/16、几何 16/16、FE-T03 5/5、RC 20/9/36；无产品补丁）。接单 main 已带 BE-17/18 有界探测（`POST /api/v5/provider-models/discover`、`/provider-connection/test`，协议见 `app/docs/runtime-foundation.md`），FE-02 从旧基线出发未消费。裁定：由同一 writer 在 **FE-03 第 0 项**消费（沿 FE-02 第 0 项先例，不另开一单）：两步从文本留位变控件，结果原样呈现后端 `status` / `message`，`ok` 不说成"已验证 key / 可推理"；`discover` 的模型 ID 只作不可信显示数据，不注入 Model 下拉、不入保存配置（保存 / 执行仍受 allowlist，归 BE-21）；改正 FE-02 的 "host has no handshake" 与 MCP "same missing handshake" 旧句。FE-03 正文按 WK-92；无项目 Chat 的创建路径若后端缺失记"待验接口"。派单：`opus-wo-low`，树 `/private/tmp/se-agent-fe03`、分支 `claude/fe03-chat-work`、端口 8895（MCP fixture 8896）、数据 `/private/tmp/se-agent-fe03-data`；提示词全文 [WO-FE03-dispatch-prompt](work-orders/WO-FE03-dispatch-prompt.md)。文档支 `claude/fable-round4d`（r4c 已合流并删除）。 |

## 4o. FE-03 复核 → WK-109（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-109 | Opus（`opus-wo-low`）交付 `claude/fe03-chat-work` `fabfd22`（基线 `4d9714e`，两次提交）。第 0 项：BE-17/18 两步成为控件，只在 Compatible endpoint 路径出现（catalog / local 无可送出的 `baseUrl`，各留一句说明）；请求体逐字按协议，无 key 省略字段，无自定义 header（PRB-6/7 端到端证明目标目录未收到 Authorization）；结果原样呈现 `status · message`，`discover` 的 ID 只列不注入、不保存（PRB-3）；FE-02 两句旧文案改正。FE-03：Chat / Work 只读既有 `extensionBinding`，标题 meta 行加模式词，Work 上加 `Memory · Off` 陈述（零控件），导航只对 Work 加标记，绑定面板统一为 Continue in Work 并说明不复制不迁移，Settings › Memory 按语义审查 §4 重述，Temporary chat 一行零控件。写权干净（server / runtime / core / domains / brand 差异为空，无 allowlist 请求）。Fable 独立重跑：228/228、两项 lint、contrast 76/76；自有端口 8893、新数据目录复跑 Models 18/18、几何 16/16、探测 8/8、shell 12/12，全部一致。`models-checks` MOD-4/5 断言因 BE-17/18 交付而重写（更严），接受。七项待裁：① 无项目 Chat 无创建路径（`createSession` 必填 `projectId`）——接受不伪造入口，登记 BE-23；词表"Workspace 可选绑定"保留为设计意图，copy-convention 不改；② scope 位落在会话标题 meta 行——接受，今天这是唯一能看出"哪个 Matter"的地方，工作面标题带待 CC-W（WK-110）重排后再议；③ `Memory · Off` 为陈述非开关——接受，BE-19 交付日的形态变化是正确代价；④ 探测只在 compatible 路径——接受，local 探测需宿主暴露固定地址，归 BE-21；⑤ BE-21 前 Fetch models 是诊断非流程——接受并记录，界面已按事实写；⑥ 错误文案直出——接受，抻平仍为独立裁定，未排期；⑦ `shell-checks` / `fe-t11` 不幂等——接受，Astra 独验按 README 换空目录。证据目录落在仓根 `evidence/fe03/`（FE-01/02 在 `work-surface-kit/evidence/`），仓根已有 wk6 / wk7 / rc 先例，接受，交付页已写明路径。接受，交 Astra 合流（先 `claude/fe03-chat-work`，再 `claude/fable-round4d`）。 |

## 4p. 设计交接 clean-cool / shell-refinement → WK-110（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-110 | 用户补入 [shell-refinement](../../../design/clean-cool-2026-09-09/shell-refinement.md)（main `386fbc6`，仅文档），四条方向：原生窗口控制沿安全区、展开工作台三面上下贯通独立滚动、首页 composer 主位而热力图与统计退为辅助、优先成熟范式。用户明言"仅为参考，以 Fable 为准"。裁定：(a) 四条方向作为设计输入采纳，生成图不是逐像素合同，新图形一律作废，只用现有 brand 包；(b) 窗口控制安全区已是既有 shell 合同（80×52），`composition-checks` SHELL-1 已断言可聚焦元素不相交，缺的是 Settings 与折叠态两个状态，并入 CC-S；(c) 三面贯通 + 右区 tab strip（CC-W）改变 WK-96/97 的 composition law 与 Work 几何合同（1440 下 256 + 640 + 文档面容不下，必须显式折叠 / 切换策略，不得静默压中面），先探后裁：派 Sonnet EX-CC1 读现有 shell / renderer / BE-2 合同与工作面代码，交宽度策略与 tab identity 方案，Fable 据此改几何合同后再派 Opus；(d) 首页模块化（CC-D0）为一个布局版本，不替代默认简洁 Home；composer 主位与热力图辅助尺寸是待验初值，派 Sonnet EX-CC2 量现有 Home 与数据接缝（work-summary、provider-config 可用；Activity / Usage / Mail / Calendar 缺契约→ BE 请求草案）；(e) Settings 替换全局导航（CC-S）结构已由用户给定、复用现有 API，可由 Fable 直接成单；(f) 成熟范式为通则，不另立工单。次序：FE-04（primitive，`opus-wo-medium`）→ CC-S → CC-W → CC-D0 → FE-05（材质与光在 chrome 定型后）；CC-D1… 各随其来源契约。前端单 writer 不变；并行只用于只读探索（Sonnet），不并行两把写笔。 |

## 4q. Astra 补丁复核、设计研究索引、FE-04 派单 → WK-111 / WK-112（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-111 | Astra 合流 FE-03 为 `main` `af95bcb`（`6c77b54` + `f3d1785`），并以自写补丁 `4b6aef4` 修探测的迟到响应：`runProbe` 等待期间表单可编辑，旧回包到达会覆盖新地址 / key 的空结果；补丁在 `clearProbeResult` 加失效序号，请求记住序号，成功与错误路径都只在序号一致时渲染，切路径与切 provider 同样失效（8 增 1 删，只在 `settings-view.mjs`）。Fable 非作者复核：读码确认序号在 `runProbe` 自身的 clear 之后捕获、三处清空点齐全、不新增状态或端点；在 `af95bcb` 清洁树重跑 228/228、两项 lint；自有端口 8893、新数据目录复跑 Astra 的 `probe-staleness` 3/3（地址 / key / provider 三种迟到）、探测 8/8、Models 18/18。接受。清洁节点 `af95bcb`。 |
| WK-112 | 用户转交 [Claude Design Research Index](inputs/design-research-index-2026-09-09.md)（constraint-driven loop，D-001…D-007）。裁定为**工作方法输入**，不是风格输入；对第五轮（CC-S / CC-W / CC-D0）与复核体例的适用方式：(a) **约束先于生成**——每张 CC 工单头部带 §VI 的 handoff contract 字段（intent / constraints / existing_system / references ± / unresolved），由 Fable 填写，缺项即不派；(b) **先探后建、结构性变体**——CC-W 与 CC-D0 在 Opus 施工前各出 3–4 个结构不同的方向（navigation-first / document-first / workspace-first / composer-first 一类），以线框级画板或静态原型呈现给用户比较，不在产品代码里设计；载体待 EX-CC1 / EX-CC2 回执后定（Claude Design 画布或 worktree 内静态 HTML），一次只变一个维度（composition → density → typography → material → motion）；CC-S 结构已由用户给定，不做变体；(c) **删除是必经一轮**——交付页消融表已是删除轮，复核 §13 增加 §IX 的 anti-slop 门（necessity / hierarchy / system / reference fidelity / AI tells / reality）作为固定行；(d) **状态而非截图**——FE-04 起每个 primitive 交一张状态矩阵（normal / hover / selected / loading / empty / error / disabled / dense / narrow / long-content，每格 file:line 或 `not_applicable` 说明），不新建 gallery 模块（需 allowlist，列为候选 CC-G 待裁）；(e) **真实运行即评审**——已有做法（fixture 端口、RC / 反例脚本、Astra 隔离合流）保留，不引入 preview deployment 基础设施；(f) **misfit 台账**——设 [misfit-ledger](misfit-ledger.md)，反馈先分"局部缺陷 / 约束不合"再施工，Alexander 的 fit 语义作为 Fable 裁定的默认框架；(g) **不采纳**——mood-protocol 依赖、design-builder 的自造 taxonomy 与固定 aesthetic dials、"make it look like X"。 |

FE-04 派单：`opus-wo-medium`（逐 primitive 判断），树 `/private/tmp/se-agent-fe04`、分支 `claude/fe04-primitives`、基线 `af95bcb`、端口 8897（MCP fixture 8898）、数据 `/private/tmp/se-agent-fe04-data`；提示词全文 [WO-FE04-dispatch-prompt](work-orders/WO-FE04-dispatch-prompt.md)。

## 4r. EX-CC1 回执 → WK-113（2026-09-09，CC-W 几何与 tab 契约）

| 编号 | 裁定 |
|---|---|
| WK-113 | Sonnet [EX-CC1](explore/ex-cc1-three-pane-tabs.md) 回执（六条待裁）。事实：`.app-shell` 两栏 grid，工作面是主区内的悬浮层（折叠 360 卡片列）/ 覆盖层（展开盖满主区），`docs/interface-components.md:5` 明定"不是第三栏"；`state.surface` 单值（BE-2 未交付，多文档 tab 无后端形状）；`#surface-tabs` 是四个固定类型 tab（run / file / workspace / runtime），方向键已是 WAI-ARIA 自动激活；FN-22 已冻结 tab key 规则；1440 算术（含两侧 24 页边距）256 + 24 + 640 + 24 + 24 + X + 24 → X ≤ 448；设计稿的 "256 + 640 + 文档面" 未计页边距。裁定：① **不整体推翻"不是第三栏"，改为按视口分档**：≥1680 工作面成为真正的第三栏（三面上下贯通、独立滚动、共享顶部 chrome 基线），1024–1679 保持覆盖 / 折叠语义并加 tab strip（主次视图切换，中面 ≥640 不动），<1024 全屏 sheet 不变；这是显式契约修订，CC-W 第 0 项先改 `interface-components.md` §工作面定性、`ui-composition-standard.md` §右侧 contextual surface、新增 ≥1680 断点与几何断言（WORK-5…），不伪装成 CSS 修复；② 1440 下选 **B**（主次切换 + tab strip），**A**（导航收图标列）不在本轮，无用户裁定不设新宽度 token；③ tab key 复用既有身份（文件 / Run `{sessionId, path, kind, sha256, runId}`，领域渲染器 `{sessionId, extensionId, generation}`，来源 `{artifactId, version, digest}`），**不新增 `scope` 字段**，scope 由 `sessionId` 推出；Memory scope 位随 CC-W 从会话 meta 行搬到工作面标题带（结 M-2）；④ 第一段**只有一个受信活动文档**，不做前端伪多实例，多文档 tab 等 BE-2；tab strip 第一段 = 四个固定类型 tab + 至多一个可关闭的文档实例 tab，关闭回紧凑目录并归还焦点（复用 `restoreLayerFocus`）；⑤ 每 tab 独立滚动位置随 BE-2 多实例一并做，第一段共享阅读位置；⑥ 固定类型 tab 保留为档位，与文档实例 tab 并存但视觉区分（类型 tab 无关闭区；文档 tab 关闭命中区与选中区分离，截断保留可访问全名）。tab strip 高 40–44、正文距其 24–32 为待验初值。按 WK-112 (b)，CC-W 施工前出结构变体供用户比较：A 导航收图标（1440 三面）/ B 主次切换 + strip（1440）/ C 宽屏三栏（1680）三张线框画板，与 CC-D0 的变体同一画布（EX-CC2 回执后由 Fable 出）；Fable 推荐 B + C。 |

## 4s. EX-CC2 回执 → WK-114（2026-09-09，CC-D0 范围与 Home 模块）

| 编号 | 裁定 |
|---|---|
| WK-114 | Sonnet [EX-CC2](explore/ex-cc2-home-modules.md) 回执（七条待裁）。事实：Home 今天已是 composer 主位（HOME-1 实测 0.56，`measureHomeLead()` 按可视区比例算，与下方内容量无关）；当前 Home 没有热力图元素（FE-01 已删 Planned 行）；六模块中只有 Attention（= 现有 Today strip 的 Waiting for you / Needs a look，来自 `work-summary`）与 Models（`provider-config` 已全局加载）有后端事实；Activity 无跨会话 run 端点（BE-1/3 未落地），Mail / Calendar 无 adapter，Usage 只有单 run 的 token 计数无聚合。裁定：① "Attention" 不成为第二个名字——它是设计稿对现有 Today strip 的称呼，产品词表沿用 Waiting for you / In progress / Needs a look，CC-D0 在原位演进 Today strip，不另立 Attention 模块；② 模块化 Home 是一个布局版本：Settings › Appearance 增 `Home layout: Simple / Modules` 本设备偏好，默认 Simple，不替代简洁 Home；③ 热力图落地前不放 Activity 占位，不安装死模块；④ 0.56 不动；⑤ Models 不做第二处展示，composer 底部模型 chip 即首页摘要，Modules 布局只多一行"Manage connections"入口；⑥ 模块显隐走 `cw:prefs` 本设备偏好（纯展示偏好，不触 WK-107 ② 的第二真源边界）；⑦ 不开 BE-24，Today strip 已是快照的完整投影，不加免责句。后端登记：BE-25（`work-activity` 落地时附去重与并发一致性规则，BE-1/3 的补充）、BE-28（`provider-config` 连接健康时间戳，使 Models 摘要能说 stale）、BE-29（跨 run 的 usage 聚合端点，token 分列、计费来源、区间与"Not reported"语义）；BE-26（Mail adapter）/ BE-27（Calendar adapter）记为候选，是否要邮件 / 日历模块属产品裁定，待用户。FE-04 交付页里的 BE 草案在复核时从 BE-30 起重编。**CC-D0 范围结论**：今天可施工的只有 Home shell 的模块带契约（显隐预置、次级带、折叠 / 移除、六态显示约定）+ Today strip 原位演进 + Appearance 布局开关；Activity / Usage 随 BE-1/3/25、BE-29 接入；Mail / Calendar 随产品裁定。CC-D0 因此排在 CC-W 之后且以 BE-1/3 交付为前置，向 Astra 提 BE-1/3 + BE-25 为下一后端单。按 WK-112 (b)，Home 结构变体三张（现状简洁 / composer + 次级模块带 / composer + 右侧折叠摘要列）与 CC-W 三张同一画布：[CourtWork Shell Layouts](https://claude.ai/code/artifact/f0b8d9b9-01fc-4dff-bcdb-390ad6f2a24c)（七张线框，真实 token 几何，待用户选向）。 |

## 4t. FE-04 复核 → WK-115（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-115 | Opus（`opus-wo-medium`）交付 `claude/fe04-primitives` `af29456`（基线 `af95bcb`，两次提交）。逐 primitive 判据：Thread / Message / Artifact 已对齐只记 canon；Composer 与 Approval / Question 的**在途段**本单修——`requestLabel` 一个在途词（`Sending…`）四处共用，授权卡在途的是哪一个决定看得出，问题卡失败改 `role="alert"`，重试前撤旧失败；Tool row 核实 error / cancelled 两词两来源互斥；Approval 四条不采纳（always-allow / 批量 / 多渠道 / edit-then-approve）钉入断言；Inbox 无批量键与数字键钉入断言；Trace 三层与 Question 表单与乐观并发记待验接口。交付 [primitive-canon](contracts/primitive-canon.md)（映射 + 消费台账）与逐 primitive 状态矩阵（WK-112 (d)）。写权干净（server / runtime / core / domains / brand / review-projection / glyph-semantics 差异为空），无 allowlist 请求。Fable 独立重跑：237/237、两项 lint、contrast 76/76；自有端口 8893、新空目录复跑 `primitive-checks` 11/11（FE-T06 含另半条：`allow` 后工具失败 / cancel requested ≠ stopped）、`fe-t07` 6/6，与作者一致。wk10b-1 读数差（三次折叠 / 展开 `/surface` 0 → 2）按事实接受。七项待裁：① Run 终态 `unknown` 时工具行写 `Interrupted` 是正面断言未知事实——**登记第六个词 `Unknown`**（glyph-semantics §3 已改，Fable 写权），实现列 CC-S 第 0 项，BE-33 交付后改由后端原因；② Inbox 加 `Home` / `End`（CC-S 第 0 项）；Home 下带与 Chat Flow 未决卡是**两条列表**（跨会话收件箱 vs 单会话流），各自 `role="list"`，不合并；③ 展开工作面重读一次 `/surface` 是读取非命令，按事实固定 ≤2，缓存复用需失效规则，不在本轮，记 misfit M-5；④ `Sending…`（送出决定）与 `Probing…`（发起读取）两词分工正确，接受；⑤ 没有事件时间就不造时间线，接受，BE-32；⑥ 在途记号复用 `questionSubmitting` 两种粒度键，接受，记 M-6（下次触碰时拆两个 Set，局部可修）；⑦ Question 表单与 MCP "不得索取敏感信息" 捆绑，接受，BE-31 范围含该约束。BE 草案重编入 [backend-requests](backend-requests.md)：BE-30 授权决定 CAS、BE-31 受限 schema + 安全约束、BE-32 事件时间、BE-33 tool 未完成原因（低优先）；Decision receipt 时间沿 BE-14。接受，交 Astra 合流（先 `claude/fe04-primitives`，再 `claude/fable-round4d`）。下一单 CC-S。 |

## 4u. Astra r4d 接缝复读、选向、CC-S 改约 → WK-116（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-116 | Astra 合流 FE-04 为 `main` `683b6d1`（`675da5a` + `ed9584e`，237/237、primitive 11/11、FE-T07 6/6，无产品补丁），并以 [r4d-review](../../../design/clean-cool-2026-09-09/r4d-review.md) 复读 WK-111…114：工程上支持 Work **B + C**、Home **D0-B**；画布两次未能加载，视觉复核未做（Fable 另以静态画板文件交用户）。消费 R4D-1…6：**R4D-1** BE-28 已按 Astra 改写——健康时间戳须绑定被检查配置 / 凭据版本与 check kind，临时表单探测不更新全局 `lastVerifiedAt`，接受；**R4D-2** CC-D0 拆两片：D0-a 外壳 + 现有事实投影（Today strip 原位、Appearance 布局开关、模块带契约、Models 入口行）不依赖新后端，D0-b Activity 随 BE-1/3/25；WK-114 末句"以 BE-1/3 为前置"只对 D0-b 成立，D0-a 是否先做按产品收益排期；**R4D-3** 第一段单文档仍须保留聊天与当前阅读面的滚动位置、草稿与返回焦点（FE-T07 已断言的 DOM 复用不得退化），WK-113 ⑤ "共享阅读位置"改读为"不建多文档位置 map"，不是"可丢位置"；**R4D-4** tab 显示 key 与 renderer 有效性判定分开：`sameSurfaceIdentity` 现有 `status` / `modulePath` 失效条件保留，WK-113 ③ 的字段列举是显示 key 的最小集不是失效条件的全集；**R4D-5** EX-CC1 §1.2 的 360 + 24 = 392 是笔误应为 384，已在报告加注；B / C 均补展开态、返回、断点两侧、短高度、200% 缩放与安全区断言；1680 是起始配置不保证任意缩放 / 密度下三面；**R4D-6** Today strip 覆盖的是既定三类集合，不推广为"所有工作待办"，与 WK-114 ⑦ 一致。邮件 / 日历：保留为产品路线与只读来源合同研究（BE-26/27 候选），不阻塞 CC 单，接入前再裁账户 / scope，本轮不视为已授权集成。**CC-S 改约**：`docs/interface-components.md` §Settings "while the sidebar stays operable"、WK-78 (1)、frontend-layering-spec FN-26 注 → settings-active 时全局侧栏不渲染，Settings 自身导航是唯一导航，Back to app 与 Escape 返回进入前位置；由 CC-S 第 0 项落地文档与代码。派单：CC-S `opus-wo-low`，树 `/private/tmp/se-agent-ccs`、分支 `claude/cc-s-settings-nav`、基线 `683b6d1`、端口 8899（fixture 8900）、数据 `/private/tmp/se-agent-ccs-data`；提示词 [WO-CCS-dispatch-prompt](work-orders/WO-CCS-dispatch-prompt.md)。 |

## 4v. 九图复核与 Attention 路线 → WK-117（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-117 | 用户 / Astra 复核九图（七张线框 + 两张真实产品参照）并落 [attention-surface](../../../design/attention-surface-2026-09-09/README.md)（main `d112beb`，仅文档）。裁定：**(a) 选向不变**：Work B + C、Home D0-B 有条件成立；A 与 D0-C 后置；图 2 右侧裁切、图 7 底部列表不全，不作几何验收。**(b) 逐图要求进工单**：CC-W——面板宽 1136 ≠ 正文行宽，正文设可读上限（沿 `--column` 740 起，宽表 / 代码按内容扩展）；返回控件与 tab 是两种语义，← Chat 不入 tablist；C 态补 composer 完整、长文、短高度；消息不默认全部卡片化（WorkCurrent 对照）；类型切换与对象 tab 分层，改四类型合同须先显式改约（已在第 0 项）。CC-D0-a——不安装 Activity / Usage 占位，不出现 "until BE-29" 类文案；具体待办优先于统计，次级带不得把首屏列表推出可见区（HOME-6 保持）；0.56 是检查基线不是永久审美原则，若改先记显式修订与高度 / 内容反例。**(c) Attention 是一个新对象与新表面，不是 Today strip 的改名**：全局导航常驻入口 → 独立 Attention 工作面（列表 / 筛选、原因、下一动作、有界披露）→ Home 可选摘要，三处读同一治理对象（ATT-BE-01）；对象只存引用、关注理由与需人动作，不复制 PR 状态 / 项目台账 / Matter 治理记录；隐藏 Home 摘要不删除 / resolve / snooze；popover 只承载临时操作。WK-114 ① 细化：Today strip 在 ATT-BE-01 交付前保持既定三类 work-summary 投影与现有词表；Needs You / In Motion / Waiting / Later 是候选分组，须映射后端状态与授权动作后才进词表；count 同样受权限过滤。**(d) 排队**：CC-S → CC-W → CC-D0-a → FE-05 不变；ATT-FE-01 在 ATT-BE-01 真实交付后进入同一前端 writer 队列，默认排 FE-05 之后，提前需用户按产品收益换序；ATT-* 编号由并行包维护，本处不重号、不复述其核验。**(e) 台账**：misfit M-7（Home 具体待办位于计数之后）、M-8（Work 消息层级过平）入 [misfit-ledger](misfit-ledger.md)。 |

## 4w. Local UI Atlas 输入 → WK-118（2026-09-09）

| 编号 | 裁定 |
|---|---|
| WK-118 | 用户转交 Exa 扫描（85 结果 / 7 workstream）的 [Local UI Atlas](inputs/local-ui-atlas-2026-09-09.md)：十二个局部的选型表、八条施工共识、按局部语义四层组织、三项优先（Popover Inspector / Chrome Tab / Composer）。裁定：(a) **组织方式采纳**——建 [engineering/design/atlas](../../../design/atlas/README.md) 作索引，但 behavior contract 与 state board 的正式所在仍是 primitive-canon（FE-04）与 review-projection §6，不另造第二份状态机；有实体前不建子目录；(b) **八条共识采纳为施工规范**，其中 ①②⑦ 已是既有裁定（WK-100 / FN-19 / FN-26），③ Popover Inspector 立候选工单 CC-I（FE-05 后），④⑤ 入 CC-W（tab 是状态容器；agent activity 以微型 indicator 入 tab，不造 banner），⑥ 入 CC-D0-b，⑧ 只取隐性知识（drag-off cancel、pointer / touch、focus restore、collision）不引 React Aria / Base UI 依赖——项目为原生 ES module、无 React（WK-93）；(c) **与 SE 硬边界冲突处不采纳**：Approval 的 `Always allow` 梯度（review-projection §6，FE-04 已钉断言）；Sonner 作为依赖（只取行为笔记）；Reasoning Panel 不用于展示模型 CoT；(d) **Button loading 保持宽度**——FE-04 的 `Sending…` 换词正确（可播报），但换词改变宽度，记 misfit M-9（局部可修：以静止态标签预留 min-width），入 CC-W 第 0 项；(e) Composer 的 `/` `@` 同一 trigger 体系与 attachment staging 为候选，无 attachment 后端契约前不做；Command palette 未立项；(f) 链接未经 Fable 核验，来源登记 sources S11；(g) 派 Sonnet EX-CC3（只读）：现有 context popover / tooltip / inspector 的锚点、payload、焦点与材质现状，评估"同一浮层随锚点迁移"的落点与代价，交 CC-I 成单依据。 |

## 5. 次序（EX-WK7 回执后，见 [dispatch-round-3](dispatch-round-3.md)）

1. 清洁节点（WK-83）→ WK10b 第一段（去掉 Home 下带项）→ WK10b 第二段（NDA Review / 续行 / 只读历史，契约已交付）→ [WK13](work-orders/WO-WK13-home-bands.md) Home 三带 / 表示原语 adapter / j-k 键盘 / 文档清理 → [WK12](work-orders/WO-WK12-settings-page.md) Settings 页壳 → WK11 Runtime 组入壳 → WK10b 第二段（等 H1）。全部 Opus 单一 writer 串行于 `app.mjs` / `styles.css`。后端前置 BE-1 / 3、BE-12 与 allowlist 路径请求登记给 Astra。
2. Pages 文案按 WK-77 改 §3；Home 不改。
3. 用户保留视觉四轴裁定；Astra 接收与独验。
