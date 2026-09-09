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

## 5. 次序（EX-WK7 回执后，见 [dispatch-round-3](dispatch-round-3.md)）

1. 清洁节点（WK-83）→ WK10b 第一段（去掉 Home 下带项）→ WK10b 第二段（NDA Review / 续行 / 只读历史，契约已交付）→ [WK13](work-orders/WO-WK13-home-bands.md) Home 三带 / 表示原语 adapter / j-k 键盘 / 文档清理 → [WK12](work-orders/WO-WK12-settings-page.md) Settings 页壳 → WK11 Runtime 组入壳 → WK10b 第二段（等 H1）。全部 Opus 单一 writer 串行于 `app.mjs` / `styles.css`。后端前置 BE-1 / 3、BE-12 与 allowlist 路径请求登记给 Astra。
2. Pages 文案按 WK-77 改 §3；Home 不改。
3. 用户保留视觉四轴裁定；Astra 接收与独验。
