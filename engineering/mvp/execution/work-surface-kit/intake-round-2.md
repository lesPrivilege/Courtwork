# Work Surface Kit · 第二轮接管（Fable 架构，2026-09-08 深夜）

基线：`codex/fresh-courtwork` `f8aff61`（导入 `9f13ca3`，远端克隆一致）。Astra 已交付 [UI 编排体例](../../../design/ui-composition-standard.md)、[图标体例](../../../design/icon-controls.md)、[表面层级](../../../design/surface-hierarchy.md)；首页改为 composer 主导。用户指令：首页预留呼吸空间，参照两版 Claude Desktop 首页；各级留白、Button 与文本、SVG 尺寸进入统一体例；稳定语义优先用视觉元素表达，删去不承重的纯视觉文本；每一笔用外部成熟实践，最小自研，收敛于 SE Paper 理念；本轮 polish 语义更细，取得层级、成熟感、厚重感而仍 clean；确定色彩层级与治理规则，以体例区分而非具体颜色，区分随宗 / skin 可换与应稳定的取色；推荐 dystopia 语言（冷峻、专业）；品牌语义以重构后语义为准，旧 icon 的 Design 不作权威，Fable 可裁决。

## 1. 现状事实（8845 实测，1440 与 375）

| 项 | 事实 |
|---|---|
| 首页顶部 | header 行 "WORKSPACE / Home"，正文 eyebrow "YOUR WORKSPACE"，hero "What would you like to work on?"；hero 顶距视口约 90 px，不随视口高度变化 |
| composer 下方 | 一行 Project / File writes / New project；一句 "Create a project to send. Your instruction is kept here."；一句 "Enter to send · Shift+Enter for a new line"；随后 Continue 空态一句 |
| composer 内 | "Local test" chip 置于左下，与 Send 同行 |
| 品牌 | 无品牌符号；`brand/` 未接入 |
| 色 | `styles.css` 只有浅色 `:root`；无 `prefers-color-scheme` 或 `data-theme` 块；scale 为 Radix gray 1–12 加 blue-3 / red-3 / green-3，accent `#315c8a`、danger `#9b3c35`、success `#3e704e` 为自定 hex；role 别名 canvas / panel / hover / selected / pressed / line / ink / muted / accent |
| 图标 | Lucide 1.41.0 静态子集（IC-5）；当前用 file-text / chevron-right / search / message-square / folder / activity 六枚 |

Claude Desktop 两版首页（用户截图，目测转录，非精确量测）：导航列约 350 px、行高约 34 px、组间距约 24 px、组名 13 px 灰；主区无 header 行；hero 一行 26–32 px 加品牌星标，位于视口 12%（Code 版）或 35%（Cowork 版）高度；composer 宽约 810 px、内距 24 px、圆角 16 px，控件行在 composer 内底部；列表区标题 14 px 灰，位于 composer 下方约 64 px；除 placeholder 外无说明文字。

## 2. 裁定

| 编号 | 裁定 | 理由 | 来源 |
|---|---|---|---|
| WK-11 | **首页构图**：去掉主区 header 行（导航标题已在侧栏）；hero = 品牌符号（48 px）+ 一行标题，无 eyebrow；空态时 hero + composer 组垂直置于视口 32–40% 高度（`min-height` + flex，参照 Cowork 版）；有列表时组顶距为 `clamp(64px, 14vh, 160px)`；列表区标题距 composer 底 `--space-8`；列宽仍 740 | 呼吸空间来自顶部留白与单一标题，不来自更多分隔 | Claude Desktop 两版；编排体例"页面"行 |
| WK-12 | **文本收编规则**：每段 UX 文本须承担定义、条件或后果之一，否则删。删 "YOUR WORKSPACE" eyebrow、"Enter to send · Shift+Enter for a new line"（成熟实践不显示，Enter 行为由 placeholder 与按钮名承担）、"Create a project to send. Your instruction is kept here." 改为仅无项目时一句 "Choose or create a project to send"（条件），有项目后消失；"Local test" chip 移入 composer 底部控件行与 Project / File writes 同行（Claude Desktop 的 context 行）；Continue 空态保留一句 | 减少 UX 文本；空态一句 | 用户指令；ux-conventions §4 |
| WK-13 | **图标与文本分工**：稳定语义（对象类型、位置、高频操作）用 Lucide 子集 glyph；状态、授权范围、后果保持文字（IC-1 不变）。尺寸档：行内 16、控件 18、导航 20；图标与文字间距 8；icon-only 必有 accessible name。品牌符号只出现于三处：首页 hero（48）、侧栏顶 wordmark（20，mono）、会话 header 的在场标记（16，mono，映射 activity）；不进列表行 | 视觉元素承担稳定语义，不侵入其他 UI | icon-controls IC-1/IC-2；interface-components 尺寸 |
| WK-14 | **品牌语义再基**：几何保留（竖线 + 三行 = 记录成形，与 Paper "work takes form" 一致）；八动词按 Canon 与 SE 既有事实重新绑定，只接线有宿主事实者：summon ← 会话打开、write ← run 开始输出、retrieve ← tool.start（读 / 搜索类）、scope ← 授权卡出现、withdraw ← 会话关闭；take-floor 不用（无 peer 事实）；commit / review 休眠至 Core 契约成立。`activity` ← run 八态（running / stopping → thinking；completed / cancelled / failed / unknown → complete 或 idle）；`authority` ← question 四态（pending 授权类 → requested；allow → scoped；deny / expired → revoked）；`presence` ← 连接状态。旧包对 presence / authority 的语义解释不作权威，以本表为准 | 用户：重构后语义为准 | brand CONTRACT.md；ux-conventions §1 |
| WK-15 | **材质在应用内**：≤24 mono；32–40 hierarchical；glass 只在首页 hero（≥48）与浮层（UP-11 扩展一处）；depth / luminous 不进产品；hero 首次加载可播一次 `summon`（说明档 640 ms），reduced-motion 静态；其余动作全部 140 ms 档，不循环，不 hover 触发 | 厚重感来自 hero 一处材质，不来自遍布 | UP-11；brand 契约 |
| WK-16 | **色彩三层治理**：Tier S（scale）= `--gray-1…12`、`--accent-1…12`、`--danger-*`、`--success-*`，可随宗 / skin 整体替换；Tier R（role）= canvas / panel / panel-muted / hover / selected / pressed / line / line-strong / ink / muted / muted-strong / accent / accent-strong / accent-soft / on-accent / danger / danger-soft / success / success-soft / focus / backdrop / scrim，名称与层级比稳定；Tier U（usage）= 组件 CSS 只写 role，不写 hex 或 scale 号。skin = 换 Tier S 来源（Radix gray → slate / mauve / sand；accent → indigo / steel），深宗 = 同 role 名映射 Radix dark 同号步；稳定项 = role 名、"1–2 纸 / 3–5 交互 / 6–8 线 / 11–12 文" 比例、对比门槛（文字 ≥ 4.5:1，非文字 ≥ 3:1）、状态色只 failed 与 waiting_user；可变项 = hue、scale 来源、accent。杂色禁令：hex 只允许出现在 Tier S 定义处，脚本 lint | 以体例区分而非具体颜色；替换色阶兼容 | PD-KIT / UP-2 既有 scale 纪律 |
| WK-17 | **dystopia 方向**：登记为用户命名的方向词（冷峻、专业）；架构映射 = 低彩度冷灰 scale（Radix Slate 系）+ 钢蓝 accent + 无暖色；是否存在同名成熟系统由 EX-WK3 溯源，未证实前不引用其值 | 不以未核实来源定值 | 用户指令 |
| WK-18 | **深宗**：当前无 dark。WO-WK7 引入 `:root[data-theme="dark"]` 与 `prefers-color-scheme` 两路，只改 Tier S；brand `theme` 属性由宿主传，不读取全局 | 事实 §1 | brand 契约 |
| WK-19 | **最小自研**：留白与字阶沿 Astra 编排体例；色阶沿 Radix 12 步语义；theming 变量契约参照 shadcn 的 background / foreground 配对与 Radix gray-pairing 表；tooltip / popover 用 Floating UI（IC-5）；不引入新库。每条视觉规则须指回 Paper Human Work Surface（投影、不授予权威、渐进披露）或 Motto 注意力策略 | 无边际防线 | 用户指令；DEC-UI-10 |
| WK-20 | **次序与端口**：Opus 首单 WO-WK6（品牌注入 + 首页呼吸 + 文本收编，不改色，吸收 WO-WK5）8853；Fable WO-WK7 色彩治理（依赖 EX-WK3）8854；WO-RC 与 WO-WK4 在其后串行；Sonnet EX-WK1、EX-WK3 即刻并行 | 单写者 | 体例 §6 |

## 3. 未决（留用户）

1. 首页 hero 一行文案：现 "What would you like to work on?"；备选与品牌方向一致的 "A place for expert work to take form." 作 wordmark 副句而非问句。
2. 默认宗：浅宗仍为默认，深宗跟随系统；或深宗为默认（dystopia 倾向）。
3. accent hue：保持现钢蓝 `#315c8a` 系，或改为 Radix Slate 配对的 indigo。

## 4. 消费记录（2026-09-08 深夜）

用户裁定：同意架构推荐（浅宗默认、深宗跟随系统；Opus 设计 + 实现、Astra 独验）；slogan 回看 Paper 另拟；色系不取蓝，先以灰阶 / 铅灰宗确立稳定层级与 skin 各阶可修改度，推荐冷色、冷白底。

| 编号 | 裁定 | 来源 |
|---|---|---|
| WK-21 | **默认 skin = lead-gray**：Radix Slate 浅 / 深逐字，冷白 paper `#fdfdfe`，accent 本轮单色（实心 = ink），等待态由状态词与字重承担；钢蓝 gray-steel 降为备用 skin 文件，不接入 | 用户裁定；EX-WK3 表 C、§5 |
| WK-22 | **深宗规则**：canvas = 2、panel = 3、panel-muted = 1（层级越高越亮）；`--accent` / `--accent-ink` / `--focus` / `--on-accent` 四角色分立；边线不设对比门槛 | EX-WK3 表 B；WCAG 1.4.11 只约束唯一指示 |
| WK-23 | **slogan 候选**（hero 一行，placeholder 仍承担功能提示）：(a) "Work that exists beyond the model."（Paper 主标题"让工作存在于模型之外"）；(b) "Where proposals become commitments."（Paper 主轴 proposal → commitment）；(c) 现有 brand 句 "A place for expert work to take form."。架构推荐 (a)：与 Paper 同源、不像 SaaS 欢迎语、不宣称专家编排已实现 | Paper canonical.md 标题、§96–97 |
| WK-24 | **事实修正**：`outcome` kind 只存在于规划文档（ux-conventions、dashboard 裁定），`thread-projection.mjs` / `app.mjs` / `inspector.mjs` 无实现；intake §2 "已有 Canon 对应" 一行据此改读：proposal review 与 commit gate 在源码中零足迹，WO-WK3 的映射以 EX-WK1 §3 为准 | EX-WK1 |

WO-WK7 交付见 `delivery-wk7.md`（分支 `claude/wk7-color-governance`）。

## 5. 消费记录（2026-09-08 深夜，第二批用户裁定）

用户：同意按推荐实施（slogan 取 WK-23 (a)）；现有 UI 内的蓝钢按钮退到必要处，优先灰阶；随后按工单依次消费；Settings 页可消费后端更细的 runtime 编排；后端未提供但认为应有的，可先绘制，留报后续实现。

| 编号 | 裁定 | 来源 |
|---|---|---|
| WK-25 | **实心按钮只给一个表面上唯一的当前提交**：composer Send、dialog 内的 Create project / Create session / Add material / Save connection / Create binding、授权卡 Allow this write。其余降为 secondary（边框）或 quiet：`Use as draft`（永不发送）降 secondary。铅灰 skin 下实心 = ink，蓝钢已由 WK-21 退出 | 用户；编排体例 Button 行 |
| WK-26 | **hero 文案 = "Work that exists beyond the model."**，placeholder 保留功能提示；侧栏 wordmark 不带副句 | WK-23 (a) |
| WK-27 | **后端未提供的能力可先绘制**：在 WO-RC 交付中以 `runtime-ui-gaps.md` 登记每个已绘制但无后端的控件（名称、语义、所需 API、所在作用域），并附静态样板（evidence 下的 HTML fixture，不入产品）；产品内只允许出现在 Settings 底部一个折叠的 "Planned" 区，作文字行 + "Backend pending" 标记，无可交互控件。DC-11 的"不画缺席能力控件"改读为"不给缺席能力可交互控件" | 用户；RC-1 |
| WK-28 | **次序**：WO-WK6（施工中）→ WO-WK8（slogan + 按钮降级，Fable，小单）→ WO-RC（Opus，Settings 三处扩展 + `runtime` 内容模块，消费 `control-contract.d.ts` 全部 15 路由）→ WO-WK3（Fable，契约，可与前两者并行）→ WO-WK4 | 单写者 |

## 6. 消费记录（2026-09-08 深夜，第三批用户裁定）

用户：给 macOS 界面留空间（左上红绿灯不得视觉侵占任何 UI，参照 Claude / Codex 桌面版侧栏头部）；"Schema Engineering" 改写为 CourtWork 后重新审视侧栏头部；优先使用原生 / 官方文档接口引入。

| 编号 | 裁定 | 来源 |
|---|---|---|
| WK-29 | **产品名在 UI 内一律 CourtWork**：`<title>`、侧栏头部 wordmark（品牌符号 20 mono + "CourtWork"）、空态与说明文案；"Schema Engineering" 只出现在 PAPER 链接与文档 | 用户 |
| WK-30 | **窗口控件留位契约**：侧栏顶部第一行为 52 px 的 shell 条（拖拽区），左侧 80 × 52 px 保留给 macOS 红绿灯，此区内无任何可交互或可读元素；其后依次为侧栏开合、后退 / 前进；第二行才是 wordmark 行（右侧 search / 通知类图标）；第三行起主导航（New session…）。仅当 `html[data-shell="desktop"]` 或 `navigator.windowControlsOverlay.visible` 时启用留位，纯浏览器不留；高度取 `env(titlebar-area-height, 52px)`，左留白取 `env(titlebar-area-x, 80px)`。接口只用官方文档记载者：Window Controls Overlay（`env(titlebar-area-*)`、`navigator.windowControlsOverlay`）、Tauri v2 `titleBarStyle: "Overlay"` + `trafficLightPosition` + `hiddenTitle`、Electron `titleBarStyle: "hiddenInset"` + `trafficLightPosition`；具体键名与版本由 EX-WK4 固定后再写入 CSS 注释 | 用户；Claude / Codex 桌面版截图 |
| WK-31 | **fresh 目前无桌面壳**（只有 node 服务 + web）：留位以 CSS 契约 + fixture 开关（`data-shell`）先行，壳的选型（legacy 为 Tauri）另立裁定；不为预览引入壳依赖 | 事实 |

## 7. 消费记录（2026-09-09 凌晨，Home 与工作页版式参考）

用户提供两张概念板（"Schema Engineering" 首页 / 工作页 A–C）与 Claude 桌面首页：版式可参，Home 不视为最终裁决；放大 icon 可从 Home 取消，改以整个 UI 复现 icon；工作中的三栏，尤其右侧 preview 系列卡片与展开后的 tab 设计尤为可观。Home 分两块：左侧较窄 dashboard，右侧占大，为横向三版——上方 today、热力图等，中间 composer，下方工作中的事件；收敛态为悬浮卡片，展开为 chrome tab。先评估视觉 clean 以免引入不平衡；cards 类实现应解耦。

| 编号 | 裁定 | 来源 |
|---|---|---|
| WK-32 | **Home = 版式复现品牌几何**：左侧窄栏（竖线）+ 右侧三条横带（三行）：上带 = 已记录事实的今日与活动（Today 计数、run 活动热力图），中带 = composer（保留 WK-12 文本收编与 context 行），下带 = 工作中（三集合，收敛态为卡片）。Home 上取消 48 px 品牌符号；WK-13 的品牌落点减为侧栏 wordmark 20 与会话 header 16。WK-11 的垂直居中被三带布局取代；仍无 header 行、无 eyebrow | 用户；brand 几何 |
| WK-33 | **工作页三栏**：右栏收敛态 = 悬浮卡片系列（Progress / Preview / Context，对应既有 Run / File / Workspace 三 kind 与 WS-09 静态映射），展开态 = chrome tab 面板（既有"放大工作面"改为带文档 tab 条的面板，同一 renderer 实例、Escape 次序与 Run / File 身份不变） | 用户；docs/ui-composition.md 保留项 |
| WK-34 | **卡片为解耦的 presentation primitives**（WK-6 门在此打开，限六种）：StatTile（Today）、Heatmap、WorkCard（工作中）、ProgressList、PreviewList、ContextList。每种先冻结输入 schema（`contracts/presentation-primitives.d.ts`）与 adapter（work-summary / runs / session → schema），组件不知数据来源。只画已记录字段（DC-3）：热力图取 run `startedAt` 按日计数；Today 取今日 pending / run 计数；参考图中的日历事件、专注小时、进度百分比、"Focus mode"、吉祥物、彩色状态胶囊无数据源或违反 WK-16，不进产品；日历类按 WK-27 只在设计中绘制并登记 gaps | 用户；DC-3；WK-16；WK-27 |
| WK-35 | **次序**：EX-WK5（Sonnet，本地数据与表面清单：哪些聚合数据可由既有 API 得到、右栏三 kind 与"放大工作面"的现有结构与生命周期）→ WO-WK9（Opus 设计画布：Home 三带 A/B 与工作页收敛 / 展开两态，附 clean 评估）→ 用户四轴判断 → 实现单（Home 带、Work 卡片 / tab）排在 WO-RC 之后。WO-WK6 的 hero 部分在合流时被取代，品牌接线部分保留 | 用户"先评估视觉 clean" |
| WK-36 | **clean 评估判准**（用于 WO-WK9 A/B）：每屏 accent 使用 ≤ 3 处；每带一个网格、无嵌套卡片；无装饰插画与渐变；状态一律文字（不用彩色胶囊）；热力图灰阶，单一强度轴；三带高度比例在 1440 × 900 下为约 1 : 1.2 : 1.8，上带不高于 160 px；卡片内距 20、间距 12（编排体例） | 参考图问题：彩色胶囊、吉祥物、蓝系强调 |

### WK-30 消费记录（EX-WK4，2026-09-09）

- `env(titlebar-area-*)` 与 `navigator.windowControlsOverlay` 仅 Chromium 桌面 PWA 与 Electron `titleBarOverlay` 提供（Electron 文档明示实现同一 WCO 接口）；Tauri v2 `titleBarStyle: "Overlay"` + `trafficLightPosition` 为 macOS 专属且无 CSS 变量信号。
- CSS 契约因此写成两路：`html[data-shell="desktop"]` 由壳注入固定值（默认左 80 px、高 52 px，Tauri 路径），`env(titlebar-area-x, 80px)` / `env(titlebar-area-height, 52px)` 覆盖（WCO / Electron 路径）；拖拽区用无前缀 `app-region: drag`，可交互控件 `app-region: no-drag`。
- Apple HIG "Windows"：不自建窗口 UI、不复制系统 chrome；留位只做避让，不绘制假红绿灯。

### WK-32…36 消费记录（EX-WK5，2026-09-09）→ WK-37

EX-WK5 事实：work-summary 三集合是唯一跨会话、分页的数据源；无跨会话 run 列表端点（`sessionCandidates.latestRun` 每会话折成一条）；所有时间为 UTC ISO 字符串，无时区元数据；右栏三 kind（workspace / run / file）共用一个面板与 tablist，只有 workspace（扩展绑定时）有 mount / update / dispose，file 有独立 load / pause / dispose，run 整体重绘；参考图中 Progress 步骤、Context 的链接与百分比、多文档 tab 无本地数据源；"WS-09" 编号不存在于本仓（来自私有 dashboard 契约），此后一律写"`app.mjs` 的 kind 静态映射"。

| 编号 | 裁定 |
|---|---|
| WK-37 | **WK9 设计输入按可得数据收窄**：上带 = 三个 StatTile（Waiting for you / In progress / Needs a look，取三集合 `total`，时间窗口为"当前"，无今日口径）+ 热力图作为 gap（需后端 `GET /work-activity?days=N` 按日返回 recorded run 计数与 UTC 日界；设计中绘制、产品内 Planned，不用 latestRun 冒充）；中带 composer 不变；下带 WorkCard 取 `sessionCandidates` item：title、project、latestRun.status 状态词、recorded run 时间（startedAt / endedAt，浏览器本地化，adapter 注明 UTC 来源），不写 "edited 2h ago" 一类推断。右栏收敛态三卡 = Run（Results / Usage 摘要）、File（Current / Recorded versions 列表）、Workspace（目录分组文件 + materials）；Progress 步骤卡与百分比不画；展开态 = 同一 tablist 的三 kind tab 面板，多文档 tab 登记 gap。六种 primitive 名称改为 StatTile、Heatmap（gap）、WorkCard、RunSummary、FileList、WorkspaceList |

## 8. 消费记录（2026-09-09，品牌符号两层取色）

用户：icon 左侧（竖线）深色，右侧（三行）浅些以示区分，并保持视觉协调。

| 编号 | 裁定 |
|---|---|
| WK-38 | **应用内品牌符号一律 `material="hierarchical"`**（WK-15 的"≤24 用 mono"改读）：竖线 = actor 取 ink，三行 = record 取较浅灰；两处落点（侧栏 wordmark 20、会话在场标记 16）已切换（`claude/wk6-home-brand`）。取色目标为宿主 token：actor = `--ink`，record = `--muted-strong`（对 panel ≥ 4.5:1，深浅宗自动跟随）。现状：`brand/src/symbol.mjs` 在 shadow 内以 `svg{--cw-ink:#283849;--cw-record:#6f8191}`（深宗 `#e0e8f1` / `#b4c0ce`）硬编码，宿主无法覆盖，且带蓝倾向；已向 Astra 登记品牌包修改请求（`brand-requests.md` BR-1），在其落地前应用内暂用包内取色 |

## 9. 消费记录（2026-09-09，侧栏次序）

用户：Home 的 New session 亦可上调，底部保留作者头像即可；Claude 自身界面皆可参考。

| 编号 | 裁定 |
|---|---|
| WK-39 | **侧栏次序**：shell 条（桌面壳）→ wordmark 行（New project、Close nav 在右）→ New session（首行，图标 + 文字）→ Home → 筛选 → Projects → 底部 account 式一行（首字母圆标 + 连接名标签 + Refresh / Settings icon-only）。无用户身份来源，底部行只显示连接名，不做菜单、不虚构头像图片。已实现于 `claude/wk6-home-brand` `dbea510` |

## 10. 消费记录（2026-09-09，装饰文本、右栏解耦与三栏对齐）

用户：UI 中的装饰性文本省去，优先用语义稳定的原生 SVG；chat title 减少无用信息；右侧卡片式收敛态与展开后的 chrome tab 在 map 中，需更好的解耦实现，context / task / source 等右侧信息同层级；右栏展开、中栏顶部、左侧 dashboard 应对齐或留白，需 Design 且解耦实现，不用扁平无层级的版式。

| 编号 | 裁定 |
|---|---|
| WK-40 | **装饰文本清退与 chat title**：会话 header 只保留在场标记 + 会话标题一行 + run 状态词（事实）；去掉 eyebrow（项目名由侧栏承担；侧栏折叠时标题行可显示"项目 · 会话"一行，不另起一行）；header 右侧的连接徽标改为 icon-only（accessible name "Connection · <连接名>"，连接名已在 composer 的 context 行可见）；Session overview / Open workspace preview 保持 icon-only。全站规则：一段文字若不承担定义 / 条件 / 后果 / 对象名，删；位置与类型语义用 Lucide 子集 glyph（IC-1） |
| WK-41 | **右栏 = 模块导轨（module rail）**：右栏的每个信息面是同层级模块，统一登记于 `app/web/surface-modules.mjs` 的静态表：`{ kind, title, icon, adapter(state) → schema, card(schema) → 收敛态卡片, pane(schema, host) → 展开态面板, lifecycle? }`。首批模块 = run / file / workspace（既有 kind），后续 context / task / source / runtime 只增表项，不改宿主。宿主（`app.mjs` 内一个 rail host）拥有：模块顺序、收敛 / 展开两态切换、选中项、tab 条、Escape 与焦点次序、renderer 生命周期委托；模块不拥有列布局、不互相引用、不写正式状态。收敛态 = 卡片纵列（每模块一卡，一个标题、一个打开动作、无嵌套）；展开态 = 同一 tablist 的 tab 面板。既有保留项（DOM id、ARIA、Run / File 身份、renderer owner）不变，迁移为"宿主仍持有这些 id，模块只填内容" |
| WK-42 | **三栏对齐带**：侧栏 wordmark 行、中栏 chat header、右栏 rail header 共用一条顶部带，高度由一个 token `--band-top`（桌面 56 px，桌面壳 = 52 + shell 条）决定，三者基线对齐；列间距 `--col-gap: 24px`；右栏展开态的 tab 条落在同一带内；中栏内容列 740 与右栏卡片的左边缘对齐于同一 gutter；窄屏抽屉与整幅工作面沿用既有规则。对齐由宿主 grid 与 token 实现，模块内容不自带外边距。WK9 设计画布须画出对齐线与三栏顶部带；实现单为 WO-WK10（rail host + 首批三模块 + 对齐 token），排在 WO-RC 之后 |

用户补充（2026-09-09）：以上仅为举例，体例治理下同级 UX 按相近思路处理，原附图可参；下一个节点是 Web UI build 后前后端联调、测试自研 harness extensions 封装，但 UI 应在这一步提供基本的热插拔组件。

| 编号 | 裁定 |
|---|---|
| WK-43 | **热插拔槽位属于本单**：WK-41 的模块导轨登记表在运行时接受扩展声明的模块——来源为既有 trusted extension / renderer ABI 与 `control-contract.d.ts` 的 `uiSlots: 'runtime.inspector' \| 'work.surface'`；插入 = 向表登记并由宿主挂载（mount），拔出 = dispose 并从表移除，宿主不重载、不清会话；未声明槽位的扩展不出现在导轨。Settings / runtime 面（WO-RC）显示 plugin 的 installed / running / exposed 与其 UI 槽位占用；扩展缺席时相应模块显示"provider 缺席"的只读占位而非空白（boundaries §4）。这是 harness extensions 封装联调的前置 UI 条件 |
| WK-44 | **同级 UX 按体例统一处理**：WK-40 的文本清退与图标化规则由 WO-WK10 做一次全站扫描（Settings、dialogs、inspector、workspace、materials、空态），产出"删 / 改 glyph / 保留（承担何种事实）"三列清单并实施；不逐页另议 |

### WK-41 / WK-43 与后端 H0–H5 的兼容裁定（2026-09-09）→ WK-45

Astra 已落定 `engineering/research/experts-hotplug-2026-09-08/`（README 架构结论 §3 "热插拔按现有 next-run 语义起步"、§4 "成果接受与工具批准独立"；pr-plan H3 "同一 Work state 的 Review 与历史 fallback：renderer 缺失仍可读取已产出状态与裁决，不出现空卡或错误可操作按钮"、H4 "卸载须等 active run 结束，不承诺 mid-run live swap；v2 不静默改写 v1 历史结论"）与重写的 Long-life Roadmap。前端导轨据此收窄：

| 编号 | 裁定 |
|---|---|
| WK-45 | **导轨只消费后端事实，不自建模块状态机**：(1) 扩展模块的存在与槽位来自控制面快照（`RuntimeResource` kind plugin / extension 的 installed / running / exposed 与 `uiSlots`，以 `revision` 为准），mount 条件 = running 且 exposed 且声明槽位，dispose 条件 = 快照中消失或 exposed=false；(2) 生命周期按 next-run 语义：active run 期间导轨不卸载已挂模块、只标"将于本次 Run 结束后生效"（沿 RC-4 冻结），不做 mid-run 热替换；(3) provider / renderer 缺席时的内容一律走 H3 的 host-owned fallback query（已产出状态 + Decision + 版本），前端不推断 Evidence / accepted，不显示可操作按钮；(4) 模块 adapter 的输入只来自既有 query 契约与 H1/H3 新增的显式 type 映射，不新增前端私有字段；(5) 成果接受动作在 H1 事务 / 权限成立前不出现（WK-3 不变）。WO-WK10 的"扩展模拟插拔"验证改为：以控制面 fixture 改 exposed / running 触发 mount / dispose，并覆盖 active run 期间的延迟生效 |

## 11. WO-WK9 画布消费（Fable，2026-09-09）→ WK-46

画布 `design/wk9/`（本机预览 `http://127.0.0.1:8856/index.html`）：Home A（卡片）/ B（行）、桌面壳变体、390；工作页收敛（右栏 Run / File / Workspace 三卡）与展开（tab 面板）。accent 每屏 ≤ 2 + 1 danger；无溢出。`clean-evaluation.md` §7 三点与 `gaps-wk9.md` G-1…G-7 裁定：

| 编号 | 裁定 |
|---|---|
| WK-46 | (1) **带高**：取画布方案 1——上带固定 ≤ 160、中带 ≈ 192、下带 `minmax(1.8 × 上带, 1fr)` 吸收余量并内部滚动；WK-36 的 1 : 1.2 : 1.8 改读为下限而非恒等式。(2) **深宗等待态**：接受单色 accent 下 `Waiting for you` 只靠字重与措辞（WK-21）；色相留给后续 skin。(3) **G-5 / G-4**：shell 条为惰性拖拽区（实现 `bd54107` / `af7cf8b` 为准），侧栏开合留在 wordmark 行，应用无历史导航故不画 Back / Forward；WK-30 原句中"其后依次为侧栏开合、后退 / 前进"作废。(4) **G-6**：展开面板正文列仍 740，文件列表 / 版本表 / diff 可放宽至 960（体例例外，注明用途）。(5) **G-1 / G-2 / G-3**：热力图端点、多文档 tab、"今日"口径三项转交 Astra 作后端 gap；产品内只留 Planned 文字行。(6) **G-7** 已由 BR-1 解决。(7) 画布侧栏须更新为 WK-39 次序（New session 首行、account 式底部）与 WK-40 标题行；r2 补 WK-42 对齐带 |

## 12. 消费记录（2026-09-09，frontier 案例与减法原则）

用户提供 Codex 桌面（右栏 Environment / Subagents / Background processes / Sources 为同层级可折叠模块；每模块 = 标题 + 计数或状态 + 一个尾部动作 + 行）与 Claude Code 桌面截图；指示：frontier 案例仅供参考，SE 理念下只做减法与消融实验，以更有机、模块化。

| 编号 | 裁定 |
|---|---|
| WK-47 | **减法与消融为设计与实现的通过判据**：(1) 导轨每个模块、模块内每个元素须通过"去除测试"——去掉后用户判断（该做什么 / 发生了什么 / 依据在哪）是否仍成立；不成立才保留，成立即删。WO-WK10 与 WK9 r2 交付须附消融表（元素 · 去除后失去的判断 · 保留 / 删除）。(2) Codex 右栏 anatomy 作为 WK-41 模块的形态参考：标题行 + 计数 / 状态词 + 一个尾部动作，行内不嵌卡；不引入其模块清单（Environment / Subagents 等）本身，只在本地事实存在时登记对应模块（run / file / workspace，其后 runtime / context）。(3) 有机与模块化的实现含义：模块自描述（登记表一条即可插拔）、宿主无模块特判、样式只用 role token 与体例节奏，删除任一模块不留空位与死样式 |

## 13. 更正记录（2026-09-09，画布 Send 形态）

用户询问 Send 按钮为何被回退。核查：产品分支 `#send-button` 仍为圆形 icon-only（UP-3 冻结构图，`setAction(arrow-up)` + pill 半径）；回退只发生在 WK9 画布 r1——Opus 按 WK-25"实心 = 当前提交"画成矩形文字按钮 "Send"，简报未引用 UP-3。

| 编号 | 裁定 |
|---|---|
| WK-48 | **冻结控件按产品 anatomy 转录**：画布与工单中，已被裁定冻结的控件（UP-3：圆形 Send / Stop、右对齐用户气泡、radius 4 / 8 / 12 / 16；IC-1 图标位次；WK-39 侧栏；WK-40 标题行）一律复制产品实际 markup 与样式，不得按通用形式重画；设计简报须列出冻结控件清单。r2 交付后由 Fable 把画布的 Send 改回圆形 icon-only 并复测 accent 计数（实心 Send 仍计 1） |

## 14. 消费记录（2026-09-09，扩展模块的预留版式）

用户：画布侧 extensions 可先读后端 roadmap，预留版式以供真实消费；难点在热插拔，类似低代码平台。后端事实（roadmap §5 / §12、experts-hotplug README §3、`control-contract.d.ts`）：`RuntimeComposition { status: compatible | unavailable | incompatible, uiSlots, missing[] }`；槽位只有 `work.surface` 与 `runtime.inspector`；资源四维 installed / running / exposed / permitted；active run 期间变更冻结、下一 run 绑定版本；卸载 = 禁用后续 run、保留活体投影；producer 缺席的历史读取待 H3。

| 编号 | 裁定 |
|---|---|
| WK-49 | **扩展模块预留版式（画布 r3，实现归 WO-WK10）**：导轨中的扩展模块与首批三模块同形（标题 + 状态词 + 一个尾部动作 + 行），其存在与状态全部由后端事实派生，画布按六态各画一板：① 未登记 → 不画任何占位（消融）；② installed 且未 exposed → 只出现在 Settings / runtime 面，导轨无痕；③ exposed 且 `compatible` → 模块卡：扩展标题、版本 / hash 一行、一个打开动作，内容由其 adapter 提供；④ 冻结 → 同 ③ 加状态词 "生效于本次 Run 结束后"，动作禁用；⑤ `unavailable` / `incompatible` → 只读一行：状态词 + `missing[]` 原因，无动作；⑥ producer 缺席（H3 fallback）→ 只读已产出状态、Decision 与版本，标 "provider 缺席"，无按钮。`runtime.inspector` 槽位落在 Run 检查栏的 recorded-run 上下文内（composition 版本 / hash / 加载事件），不另开面。低代码类比的边界：模块 = 登记表一行（manifest）+ adapter + card / pane，宿主无逐扩展代码；但 Contract、校验与状态后果仍由扩展的领域 Core 提供，manifest 不替代之（boundaries §1、WK-7） |

## 15. WO-RC 消费（Fable，2026-09-09）→ WK-50

交付 `claude/rc-runtime-ui` `988f606`（基线 `9ef1710`）：契约 19/19、反例 9/9、视口 36/36、134/134；两处浏览器暴露的修正（`inert` 冻结改为只读可读；exposure 开关只读 `resource.exposed`）。

| 编号 | 裁定 |
|---|---|
| WK-50 | (1) 产品文案取英文语域，intake §5 中文串为语义规格（交付 §2 映射表接受）；(2) STATIC allowlist 加 `runtime-view.mjs` 一行接受（IC-2 正规流程，非服务端行为变更）；(3) 转 Astra 的控制面 gap：B-1 `provenance[]` 不含 MCP 服务器闸门、B-2 `catalog-only` 的 `characters` 语义、B-4 `prompt_template` 出现在 `context[]`、B-10 `unknown` 远端效果无 fixture 入口；(4) B-3 比例条恒单段：保留条与分桶字符行，条只在 ≥ 2 桶时显示（WO-WK10 顺带）；(5) B-7 由 WK7 合流解决；(6) B-8 profile 选择与 B-9 policy 编辑作为后续 Settings 单（RC-2 续），不在本节点；(7) 三支整合为 `claude/wsk-integration` 交 Astra 独验合流 |

## 16. 消费记录（2026-09-09，品牌克制、区分度、WK9 r2、整合）

用户：品牌 icon 使用亦应克制，只有十分有限且必要的面引用；目前页面依然扁平、没有建立区分度；并附成熟 Mac 应用"厚度 / 层级 / 通透感"的来源分析（空间角色、注意力预算、连续性、光学校正；参考按交互片段采样；先冻结一套骨架语法；同时固化值 / 结构 / 行为；验收针对具体关系；给 agent 视觉反馈回路；先做一个完整切片）。

| 编号 | 裁定 |
|---|---|
| WK-51 | **品牌符号只出现在侧栏 wordmark 一处**（20，hierarchical，宿主取色）。会话 header 的在场标记与其八动词播放全部移除，状态由 run 状态词承担；Home 无符号（WK-32）。品牌动效只属品牌面（预览页 / 未来 about），不进工作 UI。WK-13 / WK-14 / WK-15 据此收窄 |
| WK-52 | **空间角色的物性分层**（回应"扁平"）：应用框架（侧栏）= 新 role `--frame`（浅 slate-3 / 深 slate-1，列入 role→step 例外表），主工作面 = `--panel`（冷白 / slate-3），内收与检查面 = `--panel-muted`（slate-2），浮层 = glass + `--shadow-float`。四种角色四种物性，不靠更多卡片；框架与工作面之间保留 1 px `--line`。已实现于整合支 `e1bd5d9`，四轴留用户（8857） |
| WK-53 | **设计流程固化**：参考按"交互片段"采样（画面 / 行为 / 解释三件），主导视觉语法只有一套（编排体例 + 铅灰 skin + 本批裁定），局部参考须服从；值 / 结构 / 行为同时固化（token、组合、状态样例）；验收写具体关系（导航不比正文醒目、检查面打开后正文仍可读、trace 非一级、新增输出不抢滚动位、完成 / 等待 / 失败三种表达不同）；回归与设计评审分开；在目标平台（Mac 壳）结束校准。这些进入体例 §2 工单必填项与 WO-WK10 验收 |
| WK-54 | **WK9 r2 消费**：对齐带成立（三栏 header top 相等、高 56；卡片左缘 = rail 内容 + 24；740 列与 header 内容左缘 0 差）；展开面板改为壳内（tab 条入带），Escape 保持两步：展开 → 收敛卡 → 关闭导轨（WO-WK10 调整 `renderSurfaceVisibility` / `handleSurfaceEscape`）；连接徽标 glyph 以 Lucide `plug`（bca7e75，ISC）准入 sprite，r2 的"复用在场点"作废；Home A（卡片）与 B（行）留用户；画布 Send 已改回圆形 icon-only（WK-48）；r3 只剩扩展六态板与消融表（WK-49 / 47） |

## 17. 消费记录（2026-09-09，composer 稳定部分、行与卡片、Chat Flow 卡片）

用户：composer 下方是否也放上下文，composer 本身保留稳定部分；卡片与行不是瓶颈，行展开就是卡片，只是呈现哪些信息需要选择；Chat Flow 中 output、ask user 等通用必要卡片只需从 frontier 做减法（附 Claude 桌面的 output 卡与右栏 Progress / files / Context 折叠模块、Codex 的 Edited files 卡与右栏）。

| 编号 | 裁定 |
|---|---|
| WK-55 | **composer 只保留稳定部分**（输入、附件、连接 chip、Send）；随 Home / 会话变动的上下文（Project、File writes / File permissions、New project）放到 composer 下方一行安静文本控件 `#composer-below`（同 Claude 的 "Project or folder · Auto"）。已实现于整合支 `06e0d93`：Home 三项、会话态权限项各自落位，390 纵向堆叠无溢出 |
| WK-56 | **行与卡片是同一 primitive 的两态**：WorkCard 收敛 = 行（标题、项目、状态词），展开 = 卡（加 recorded run 时间、打开动作）；Home A / B 之争取消，设计只裁"哪一态显示哪些字段"。导轨模块同理：header 行 → 卡 → 面板三态 |
| WK-57 | **Chat Flow 通用卡片从 frontier 做减法**：output / artifact 卡 = 类型 glyph + 标题 + 类型元数据 + 一个主动作（+ 溢出菜单），无嵌套卡；ask-user（question / permission）卡沿 review-projection 契约；edits 卡 = 摘要行 + 文件列表 + 一个 Review 动作；全部只用 role token，状态文字。以 Claude / Codex 的卡为 anatomy 起点逐项去除，进入 WO-WK10 的消融表 |

## 18. 消费记录（2026-09-09，composer 层级、文案收敛、窄宗）

用户：composer 在 Home 位置亦应稳定、上方留白、框内只留稳定一行语义；过程中的 PR 有些未在终态呈现，回顾最初工单确保每笔消费（右侧 cards 未完成）；两条裁定按 Fable 推荐实现；视觉元素大小、对齐、window control 预留；原生 SVG 与文本组合、外部库与选型 index 须确保消费而非临时绘制；Button 与文本协同时保留稳定、符合习惯的最小语义（单词而非词组），UX 文案整体收敛并去除不承重装饰文字、做消融；窄宗过扁平——composer 沉底、首页留白；宽宗首页留白、composer 是更高的悬浮层级、居中即可、位置稳定不被排挤；窄宗单行 composer 属 iOS 视图，不急做但范式稳定。附 ChatGPT / Claude iOS 的 composer 与抽屉截图。

| 编号 | 裁定 |
|---|---|
| WK-58 | **composer = 工作面上最高的悬浮层**：桌面 Home 居中于内容列、上方留白（现有 `.home-active .composer-area` 规则），位置只随视口高度变化、不被其他 UI 排挤；会话态沉底；窄宗（< 768）Home 与会话均沉底并留 safe-area，材质取浮层（`--shadow-float` + `--panel` + 1 px `--line-strong`）；框内只保留稳定一行（附件、连接 chip … Send），上下文行在框外（WK-55，整合支 `9cb1d7e` 已修正 markup） |
| WK-59 | **UX 文案收敛**：Button 与文本协同时用单词（Send / Allow / Deny / Answer / Cancel / Open / Retry），词组只在必须承载范围或后果时出现（"Allow this write"保留，因其绑定确切写入）；全站扫描（WK-44）按"删 / 单词化 / 保留并注明承重"三列执行并做消融；原生 SVG 与文本的组合、外部库与选型 index 一律先查已登记来源（icon-controls IC-5、source registers），不临时绘制 |
| WK-60 | **窄宗层级**：< 768 时 header 带、列表行、沉底 composer 三层物性分明（框架 `--frame`、面 `--panel`、浮层阴影），不得与桌面同一扁平；侧栏为抽屉（既有），抽屉内次序同 WK-39 |
| WK-61 | **iOS 单行 composer**（收起为一行、展开为多行）登记为稳定范式，留待壳选型后做，不入本节点 |
| WK-62 | **WO-WK10 拆为 a / b**：a = 版式（WK-58 composer 层、WK-42 对齐带、WK-41 / 56 导轨卡片与 tab、WK-13 尺寸档、WK-44 / 59 文案扫描、WK-47 消融表），Opus 即刻施工于整合头 `9cb1d7e`；b = 热插拔槽位（WK-43 / 45）、Chat Flow 卡片（WK-57）、Review 纵切（WO-WK4），合流后开工 |

## 19. 消费记录（2026-09-09，Runtime Workbench 与 frontier 兼容）

用户：dashboard 与 settings 较单一，应为 user 提供更精细的 harness orchestra 自定义；附此前两轮 Runtime Control Plane / Frontier Runtime Compatibility 讨论（转录于 `inputs/runtime-workbench-discussion-2026-09-09.md`）；考虑为哪些单独做 UI。

| 编号 | 裁定 |
|---|---|
| WK-63 | **Settings → Runtime Workbench**：沿转录 §7 的一级 IA 冻结导航（Overview / Agents / Capabilities / Context / Extensions / Models / Governance / Registries / Diagnostics），但每个节点只画后端契约已有的对象：Overview = 当前 effective runtime（`/runtime-control` 快照 + `/runtime-context` 字符计数）+ Attention（health ≠ healthy、pending 权限、未签名插件）；Capabilities = RC 模块的 tool / mcp_server / skill 三 kind；Context = instruction / prompt_template / reference 三 kind + Effective Context Inspector（按 `ContextItem` 分块）；Extensions = plugin kind（hooks 无契约 → Planned）；Models = 既有 provider-config；Governance = 权限解释（只读）+ policy 编辑（B-9，待后端 operation 'policy' 的 UI 单）；Registries / Memory / Secrets / Sandboxes = Planned 文字行（WK-27）。四态分列（RC-2）、Source / Effective 双视图（RC-3）、409 权威（RC-4）不变 |
| WK-64 | **次序与归属**：R1 Inspector = 现 RC 模块扩展为 Workbench（前端单 WO-WK11，Opus，排在 WK10a 之后）；R2 Source Resolver（"Add to runtime…" 统一入口）、R4 Runtime Proposal + Diff、R5 事务化 apply / rollback、R3 兼容矩阵、R6 Expert 快照为后端契约先行（转 Astra，与 H0–H5 及 Long-life Roadmap 对齐），前端只在契约冻结后消费；Runtime Proposal 在 UI 上是一张 diff 卡（source、operations、permission delta、context impact、persistence 单选、Apply = CAS PUT），不借 WK-3 的 proposal review 语义 |
| WK-65 | **模型侧入口**：runtime.resolve / inspect / propose / apply 四个 primitive 作为工具面与 UI 共用同一 Proposal；用户贴链接时模型走 resolve → inspect → propose → 人审 → apply，不执行安装脚本。属后端 + Expert 单，登记不施工 |

## 20. 消费记录（2026-09-09，颗粒度与 DSH 参考）

用户：frontier dashboard 皆可参，Paper 理念下一级界面与二阶呈现颗粒度不同，但底层保证 user 大多可以从 UI 编排注入；DeepSeek Harness 的插件系统与 web UI 页面可参考，可派 explore。附 Codex / Claude Code / Claude 桌面侧栏截图（主导航 = 图标 + 单词行；Projects 节；recents；底部账户行）。

| 编号 | 裁定 |
|---|---|
| WK-66 | **两级颗粒度、同一注入底层**：一级界面（Home 三带、会话、右栏导轨）只显示 effective runtime 的粗粒度事实（Overview 计数、Attention、当前模块），二级 Workbench（WK-63）显示细粒度对象与 Source / Effective 双视图；两级共用同一注入通道——会话内 "Add to runtime…" 与 Workbench 的变更都生成同一 Runtime Proposal 并经同一 CAS apply（WK-64），一级界面不另开写路径。主导航行按 frontier 共识 = 图标 + 单词（WK-59 扩展到导航），Projects 节与 recents 沿 WK-39 |
| WK-67 | **DSH 作为 R5 / R6 的主参考**：派 EX-WK6 只读溯源 DeepSeek Harness 的插件系统（define / run / update / rollback、immutable package + current pointer、inspect、creator mode、preset / generation、approval）与其 web UI 页面结构，输出 anatomy 与"借 / 不借 / adapter seam"表；不把 DSH 模板当本仓规则（AGENTS 既定边界） |

### WK-67 消费记录（EX-WK6 r2，官方 `c389f96`，2026-09-09）→ WK-68

定本 `explore/ex-wk6-r2-dsh-official.md`（官方 deepseek-ai/deepseek-harness @ `c389f96bf3a9`，MIT，2026-09-08；对照本机下游 rc.7 仅作差异标注）。事实：Cordis 动态包为 inspect / define / run / stop / undefine，update 是 run 的一种模式、rollback 即重跑旧的不可变 packageId；`currentPackageId / nextPackageId` 指针只在进程内存、不持久；define 前有语法校验门（HEAD 改用 `new Function`，`vm.Script` 降为错误美化）；**update 失败为 fail-stop（activeRun 置空）而非 fail-back**（`versioning.spec.ts`）；客户端包的批准为 frame 级、无审计痕迹，`approveFutureVersions` 允许一次批准覆盖未来任意内容版本；agent preset 为会话挂载即绑定一代（session-mount-once），无重发现与版本追溯；"Creator mode"无源码对应词；web UI 分为 Settings → Models / Agent Presets / Plugins（Configurable + Inventory 两 tab）与一个 frame 级悬浮 Cordis 面板；破坏性变更两处（`pluginInventory/list` 同步 → 异步并新增 `agentPresets`；校验门解析器更换）+ 新文件 `composition-inventory.ts`，六个 preset 源文件有未逐项审阅的漂移。

| 编号 | 裁定 |
|---|---|
| WK-68 | **R5 / R6 契约要求（转 Astra，前端不施工）**：(1) R5 事务化 apply 必须 fail-back：失败保留 current 指针并回到上一有效包，不采 DSH 的 fail-stop；(2) 指针与 proposal / apply 记录持久化并可 inspect（同 boundaries §3 的 effect receipt），不采进程内存指针；(3) 批准按包版本逐次、留 DecisionReceipt，不提供"批准未来版本"（permission only tightens）；(4) R6 采 DSH 的 session-mount-once 一代绑定，另加 version / hash 与重发现事件，新会话取新代、旧会话不换代；(5) DSH adapter 在 R3 兼容矩阵中按固定 commit 登记，`pluginInventory/list` 异步化与校验门变更计入 adapter 版本，不让业务 runtime 感知；(6) 不用"Creator mode"一词，用"plugin authoring（模型写插件）"并归入 Governance 的 trust 层。**前端**：WK-63 的 Extensions 节点取 DSH 的 Configurable / Inventory 两 tab 形态，动态包的 run / stop / approve 不做 frame 级悬浮面板，而是导轨的 `runtime` 模块内的一个对象行 + Attention 条目（WK-41 / 66） |

## 21. 消费记录（2026-09-09，深宗层级的第一性原理）

用户：8855（WK10a 施工中）窄视口深宗看起来奇怪——主列比外围 body 更暗、header 更暗、composer 又是另一层；推荐从第一性原理解耦实现，不对局部过拟合。

| 编号 | 裁定 |
|---|---|
| WK-69 | **高度层级模型（唯一规则）**：界面只有四个高度层，层级由"离观者的距离"定义，取色由层级决定，区域不单独取色。深宗：层越高越亮；浅宗：层越高越白、越靠阴影。<br>L0 frame（应用框架：body 背景、侧栏、抽屉底、留位条）= `--frame`（浅 slate-3 / 深 slate-1）；<br>L1 surface（工作面：主列、header 带、右栏导轨面板、卡片底）= `--panel`（浅 #fdfdfe / 深 slate-3）；相邻 L1 之间只用 1 px `--line`；<br>L2 float（悬浮：composer、popover、菜单、导轨收敛态悬浮卡、tooltip）= 新 role `--float`（浅 = `--panel` / 深 slate-4 `#272a2d`）+ `--shadow-float` + 1 px `--line-strong`；<br>L3 overlay（dialog、整幅工作面）= `--float` 置于 `--scrim` 之上。<br>`--canvas` 退役为 `--frame` 的别名（不再有第二个 L0）；`--panel-muted` 只用于 L1 内的内收区（深宗低于 panel 一步）。区域→层级表写入 color-governance §7，lint 增加"区域背景只允许四个层 role"的检查；四轴留用户 |
| WK-70 | **实施归属**：WK10a 交付后由 Fable 在整合支按 WK-69 统一区域映射（body / chat-panel / surface-panel / composer / sidebar / dialog），删除各处零散的背景取色；Opus 的 composer 材质（WK-58）若与 `--float` 不一致，以 WK-69 为准归并 |

## 22. 消费记录（2026-09-09，文本 UX 图标化）

用户：当前有些 UX 仍主要靠文本实现，本轮完成后值得建立更稳定的语义，并按实际情况换用原生绘制 / 库引用的 Button。

| 编号 | 裁定 |
|---|---|
| WK-71 | **语义 → glyph 表（WK10b 首项）**：以 WK10a 的 `text-sweep.md` 为清单，建 `contracts/glyph-semantics.md`：每个稳定动作一行（语义 · 出现面 · 频率 · 位置稳定性 · IC-1 档位 P0 / P1 / 保留文字 · Lucide glyph（固定 `bca7e75`，逐枚准入 sprite）· accessible name · tooltip）。换用图标的判据：高频、位置稳定、语义在 frontier 已收敛（Close / Expand / Back / Copy / Refresh / Send / Cancel / New / Search / Settings / Attach / Open external）；保留文字的判据：授权范围、后果、对象名、状态（IC-1 "文字优先"行）。图标只来自已登记来源，不临时绘制；与文字并列时文字为单词（WK-59）。实施随 WK10b，验收含 IC-4 五组代表控件 |

## 23. 消费记录（2026-09-09，工作面悬浮于 Chat Flow 之上）

用户：work space 不必做单独的标题及版面，只悬浮于 Chat Flow 底卡之上，title、dashboard、window control 的对齐与留白管理会更便捷。

| 编号 | 裁定 |
|---|---|
| WK-72 | **工作面 = L2 悬浮层，不是第三列**：主区只有一个 L1 面（Chat Flow）与一条 header 带；导轨模块的收敛态是悬浮卡（`--float` + `--shadow-float` + 1 px `--line-strong`，WK-69），锚定在主区右侧 gutter、位于 thread 之上、composer 顶边之上，无独立标题与版面；展开态是 L3 覆盖层（沿既有"放大工作面"语义，覆盖层内一条 tab 条 + Return），不再有 rail header。对齐带（WK-42）简化为两方：侧栏 wordmark 行与主区 header；window control 留位只在侧栏 / 主区 header 一处（WK-30）。宽度规则：主区宽 ≥ 740 + 2·gap + 360 时悬浮卡与 740 列并存不重叠；不足时收成右缘的模块 glyph 竖条（每模块一图标，点开即覆盖层）；< 768 沿既有整幅工作面。Escape 次序、renderer 身份、模块登记表（WK-41）与热插拔（WK-45）不变。取代 WK-33 / 41 / 42 中"第三列 + rail header"的表述；WK10a 交付后在整合时按此归并（WK-70） |

## 24. 消费记录（2026-09-09，composer 语义）

用户：定 composer 语义——发送、模型（含推理强度，对齐 provider）、附件、work space 选择；考虑框内与框外的编排；frontier 可参考（Claude Code：框内左 + 与 Full access，右 模型·强度 · 麦克风 · 发送；Claude 桌面：框内 + 与麦克风，框外左 Add folder · Auto，右 Opus 4.6 High）。

| 编号 | 裁定 |
|---|---|
| WK-73 | **composer anatomy（框内 = 绑定本次发送与本次 Run 的事物；框外 = 会话 / 工作区的常设上下文）**。框内一行，左至右：附件（paperclip，"Session files"，Home 无会话时隐藏）· 模型 chip（文字 = `<model>`，provider 暴露推理强度时为 `<model> · <effort>`，chevron，点开既有连接 popover：provider / model / key / effort；连接名如 "Local test" 即此 chip 的当前值）· 弹性空隙 · Send / Stop 圆形 icon-only 同槽（运行中 Send 位换 Stop，square 图标，`Cancel run` 为 accessible name）。框外一行（`#composer-below`，13 px 安静控件）：左 = Project / workspace 选择（Home：Project select + New project；会话：项目名只读、可打开）· File writes 模式（Ask / Workspace writes / Read only，单词化为 Ask / Write / Read，accessible name 保留全句）；右 = 空（模型已在框内，不重复）。不画麦克风（无语音能力，DC-11）。窄宗同一框内行，框外行可换行。推理强度只在 `provider-config` / `provider-models` 暴露该字段时出现，否则不画（WK-27 登记为 BE-12） |

## 25. WO-WK10a 消费（Fable，2026-09-09）→ WK-74

交付 `claude/wk10-rail` 六提交（`c1b2969`…`5f76b2e`），合入整合支 `5f76b2e`。测试 136 / 136、lint、对比 76 / 76、WK6 7 / 7、DOM 断言 16 / 16、RC 18 / 19 · 8 / 9 · 36 / 36。消融删去：Run 卡的 usage 表、Runtime 卡的十三项分 kind 计数（收成 Capabilities / Context）、无 run / file 时的空卡、展开面的 scrim 与假 `aria-modal`、"Inspect" eyebrow、"Current files, grouped by folder."、目录外框、五个 Retry 按钮；Recover / Remove 单词化。

| 编号 | 裁定 |
|---|---|
| WK-74 | (1) 展开态壳内面板：侧栏保持可操作，`aria-modal` 只在 < 1024 覆盖态；`docs/surface-assignment.md` §3 的"侧栏退出交互树"改读为仅覆盖态；(2) 右列 band 标题与卡片共用一个左缘（1085），画布 §8.2 的 1061 作废；(3) RC 的 MCP disconnect 不回翻为 wire 侧问题，登记 BE-13；(4) **归并轮 WK10a-r2**（Opus，同支继续）：按 WK-69 统一区域→层级映射并新增 `--float`、`--canvas` 退役；按 WK-72 把右列改为 L2 悬浮卡（无 rail header、锚定主区右 gutter、宽度不足收成 glyph 竖条），展开态为 L3 覆盖层；按 WK-73 重排 composer 框内 / 框外；两方对齐带（侧栏 wordmark 行 + 主区 header）；登记表、宿主、Escape 两步、断言脚本沿用 |

## 26. WK10a-r2 消费（Fable，2026-09-09）→ WK-75

交付 `claude/wk10-r2`（`0486141`…`e170b99`）合入整合支 `e170b99`。实测：深宗 frame `#111113` < panel `#212225` < float `#272a2d`；浅宗 frame `#f0f0f3` < panel = float `#fdfdfe`（以阴影与 line-strong 分层）；1440 下悬浮卡 top 80、右距 24、宽 360、底至 composer 顶边 −24；1200 下 glyph 竖条 44 宽；展开态为主区范围内的 scrim + sheet，侧栏可操作、≥ 1024 无 aria-modal。断言 30 / 30、136 / 136（一次 135 / 1 为偶发，复跑通过，登记为 flaky 待 Astra 定位）、lint 两项、对比 76 / 76、WK6 7 / 7、RC 18 / 19 · 8 / 9 · 36 / 36（MCP 两项 = BE-13）。

| 编号 | 裁定 |
|---|---|
| WK-75 | (1) 会话态项目名只读、不"可打开"——接受，无该意图不造；(2) File writes 的单词标签 Ask / Write / Read 以 `<option aria-label>` 承载全句，读屏未验；若 VoiceOver / NVDA 不读则退为双词可见标签（Astra 独验项）；(3) `docs/surface-assignment.md`、`docs/ui-composition.md` 的"三栏"表述在 WK10b 随语义 → glyph 表一并改写为"主区 + 悬浮工作面"；(4) 偶发失败测试登记为 flaky（Astra 定位）；(5) 整合支到此为**第二个自足节点**，交 Astra 独验合流 |
