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

## 5. 次序（EX-WK7 回执后，见 [dispatch-round-3](dispatch-round-3.md)）

1. 清洁节点（WK-83）→ WK10b 第一段（去掉 Home 下带项）→ WK10b 第二段（NDA Review / 续行 / 只读历史，契约已交付）→ [WK13](work-orders/WO-WK13-home-bands.md) Home 三带 / 表示原语 adapter / j-k 键盘 / 文档清理 → [WK12](work-orders/WO-WK12-settings-page.md) Settings 页壳 → WK11 Runtime 组入壳 → WK10b 第二段（等 H1）。全部 Opus 单一 writer 串行于 `app.mjs` / `styles.css`。后端前置 BE-1 / 3、BE-12 与 allowlist 路径请求登记给 Astra。
2. Pages 文案按 WK-77 改 §3；Home 不改。
3. 用户保留视觉四轴裁定；Astra 接收与独验。
