# Local UI Atlas · 局部行为索引

> **Visual Grammar（WK-125）**：SHAPE / MATERIAL / IDENTITY / MOTION 位于本页组件条目之上；组件只声明角色（shape role、material tier、state contract），视觉由 grammar 解算。**Interaction Grammar** 再靠前一层：Schema / intent → **Projection Grammar（如何读，WK-139）** + **Control Grammar（如何改，WK-129）**；Schema constraint ≠ UI affordance；投影不得创造事实。各段见本页末。**Scout 层（WK-134 / 137）**再靠上：[design/scout](../scout/README.md) 按问题寻址，只出 capture 与候选，经 disposition 才进入本页任一段；60fps 为 Motion 段 C 层 donor。

WK-118 设立，WK-122 升级为六级格式：**Semantic Contract → Interaction Pattern → Anatomy → Behavior Primitive → Motion Recipe → Local Adaptation**。来源分四层（A 语义契约 / B 解剖 / C 微交互 donor / D 探索池，见 [inputs/ui-source-tiers](../../mvp/execution/work-surface-kit/inputs/ui-source-tiers-2026-09-09.md)）。语义契约的正式所在是 [ui-state-vocabulary](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md)（映射后端已有状态）、[primitive-canon](../../mvp/execution/work-surface-kit/contracts/primitive-canon.md) 与 [review-projection](../../mvp/execution/work-surface-kit/contracts/review-projection.md) §6；A 层外部来源（Linear、Primer）只用来检查语义齐全，不替代 Core owner。upstream 是 donor 不是 runtime dependency：一律本地实现（原生 ES module），不引 React / Tailwind / Motion。本页只做索引，不复制内容；一个 entry 有实体前不建子目录。链接未经 Fable 核验。

| entry | 1 semantic contract | 2 interaction pattern | 3 anatomy（B 层） | 4 behavior primitive | 5 motion recipe（C 层，只取行为） | 6 local adaptation / 状态 |
|---|---|---|---|---|---|---|
| composer | Run 词表 §1；在途 `Sending…` | 发送 / 取消原位变态；禁止发送时仍可输入 | assistant-ui Composer；AI Elements PromptInput | Enter / Shift+Enter / IME 三路（已对齐） | Text States（transitions.dev 上游）——已是 `requestLabel` | 已对齐；`/` `@` 同一 trigger、attachment 待契约 |
| tab-chrome | Work surface（canon §2.10）；单文档（BE-2 前） | tab 是状态容器；关闭回目录、焦点归还 | AI Elements FileTree / Sources 只作参照 | WAI-ARIA tablist（现有）；S12 frontier 结构 | chromium-tabs / Atuin / Termany 行为模型 | CC-W 施工中 |
| button | 在途 = 第三类事实（FN-19） | loading 保持宽度与焦点（M-9）；inactive 可解释（未裁） | Primer Button 状态集 | Base UI / React Aria 语义 | Text States morph | CC-W 第 0 项 |
| popover-inspector | 只读 / 可操作两种 payload（WK-119） | 同一浮层随锚点迁移；click / focus 触发 | — | Base UI Popover（多 trigger）；本地 tooltip generation 先例 | Expandable Action Bar（beUI 上游）作局部动作 chrome 参照 | CC-I 骨架（FE-05 后） |
| command | 无全局命令面（`/` 只聚焦搜索） | dialog = 全局命令；popover = 局部选择；渐进披露 | cmdk；Spectrum Command Search（A-） | 键盘 first、group + shortcut | — | 未立项 |
| heatmap | BE-1/3/25：值域、zero ≠ no-data、bucket、时区 | 单格 → 当日 drill-down | Spectrum Recent Activity（B+）作 dashboard 摘要参照 | SVG / CSS grid，每格 accessible name | Skeleton Reveal 只作 hydration 参照 | CC-D0-b 待后端 |
| toast | 短暂结果，不承载决策（FN-26 分工） | loading → success / error 原位；hidden 暂停计时 | — | 现有 `showToast` | Toast Stack（beUI 上游）；Sonner 笔记 | 候选，不引库 |
| tool-card | Run / 工具行词表 §1；`Unknown` 第六词 | pending → running → completed / failed / cancelled / unknown | assistant-ui Tool UI；AI Elements Tool | `<details>` 原位展开（现有） | — | 已对齐；partial args 待 runtime 事件 |
| approval | Question / Permission 词表 §2；**无 Always allow** | 同一张卡原位变化；批准后成为回执行 | assistant-ui Approval Card（不含 Always allow） | 焦点与 alert（FE-04） | — | 已对齐 |
| process-trace | 事件流；时间线待 BE-32 | collapsed → timeline → raw 三层 | assistant-ui Reasoning Panel（process 范式）；S12 Codex Review 面 | — | Skeleton Reveal 不用于 trace | 待后端 |
| question-card | Question 词表 §2；Auto 行为契约（WK-123） | 合并提问：正文 + 编号选项 + 自由回复 + Skip；给选项与建议 | S12 Codex ask-user 卡；assistant-ui / AI Elements 的 elicitation | 现有问题卡（`Answer`、`Sending…`、alert） | — | 结构化选项待 BE-31 |
| reversible-action | **无契约**（词表 §4；候选 BE-34 可逆窗口） | 能 undo 就不要 confirmation（Primer）；摩擦来自 reversibility / blast radius / authority | — | — | Undo Pill（A，仅 motion 参照）；Hold to Confirm 只限特殊 destructive，SE 今日无 | 候选，等后端 |

附：Astra [chat-space 研究索引](../../research/chat-space-2026-09-09/README.md)（main `5ea5ff0`）的 CS-01…10 只作设计检查表，不替换现有消息 / question / permission / run / File / Artifact / Core 对象；Markdown 是显示能力，先评估复用 marked + DOMPurify；回答、授权、执行、接受分别成立；下载绑定确切成果。队列不变。

## Material 段（WK-124）

FE-05 按此五节组织，取值沿 WK-104：**field**（source geometry / color / blur / noise——只作 specimen，不进内容与侧栏）、**translucent surface**（tint / backdrop blur / saturation / vibrancy——Chrome 与 Transient 两档，登记类名 + reduced-transparency 回退）、**edge**（`--rim` 描边 / highlight；无折射）、**depth**（`--shadow-float` / 层级 L0–L3，无新 elevation）、**focus**（progressive blur 与 transition blur——前者只在浮于滚动内容之上的 chrome，后者只在小型 text / icon 状态，禁止动画 `backdrop-filter`）。原则：prefer generated fields over painted decoration；材质表达层次不表达状态（FN-28）。

## Identity 段（WK-124 (d)，候选轨道 GI，品牌线 owner）

conventional（wordmark / icon / typography，现有 brand 包）与 generative（glyph grammar / procedural wordmark / semantic mark / state glyph / exportable artifact）。载体：公共站 hero、Home 空态字标、matter initials、`REV nn`、完成 seal。约束：从文书母题生成，不复制 OpenCode 风格；state glyph 只投影 ui-state-vocabulary 里已有状态。EX-GI1 已回执（WK-130）：三方向 A Baton / B Ruled-grid / C Annotation-mark specimen 入库，选向待用户 / 品牌线。

## Shape 段（WK-125）

五个语义角色 `shape.control.compact / control.default / surface / overlay / full` → 现有 token（`--radius-small` 4 / `--radius-control` 8 / `--radius-card` 12 / `--radius-container` 16 / `--radius-pill`）；公理 `R_child = max(R_min, R_parent − inset)`；密度耦合（桌面 rounded rect，capsule 只给 large / isolated / prominent；触控可更圆）；grouping topology；focus ring 派生；forbidden：arbitrary radius、primary 自动更圆、danger 换 shape、pill everywhere、父子同 radius。`corner-shape` 只 progressive enhancement。EX-CS1 已回执 → WK-128：三处沉睡违例、`.context-group` 重名、circle 统一 `--radius-pill`、focus 派生、lint-shapes + SHAPE 断言并入 FE-05a 第 0b 项；`corner-shape` 只进 specimen。

## Motion 段（WK-124 / WK-125）

state transition（原位变态：Send → Sending…、Approve → 回执行）、focus（transition blur 只在小型 text / icon）、material response（不动画 `backdrop-filter`）、identity transition（GI 轨道）；reduced-motion 下全部瞬切；pressed shape morph 只 experimental。

## Projection Grammar 段（WK-139）

与 Control Grammar 并列：Projection = 如何读，Control = 如何改；二者合称 Interaction Grammar，位置仍在 Schema / intent 之下、Component anatomy 之上。**本段不是新层，是给已有的一层命名**——`app/web/presentation-adapters.mjs` / `usage-projection.mjs` / `thread-projection.mjs` 已是纯 adapter，规则见 [presentation-primitives.d.ts](../../mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts)（WK-34 / WK-80）：① 服务器 UTC 原样透传，adapter 不算相对时间也不重切日界；② 缺失事实是显式 `null`，不是 `0` 也不是 `""`；③ adapter 纯函数（无 fetch / 无缓存 / 无 `Date.now()` / 不覆盖服务器排序）；④ **投影不得创造事实**（WK-139）：没有 unit / scope / timezone 就不投影，形态不得强于事实。

原则句（WK-139 (d)）：**不要求一种 projection 同时解释 agent 的全部事实**；同一份事实可有多个投影，但每个投影必须自报口径。

| 类 | 今日有（owner fact 存在） | 候选（待 owner fact） | 参照 |
|---|---|---|---|
| plain value / table | 绝大多数事实：`dl` 数据行（telemetry 请求测量）、Usage 精确日表 / 模型表、settings 行、stat tiles（`toStatTiles`）；缺失走 `Not available` / `No run recorded` 而非 0 | — | 本段第 ①②③ 条即其全部规则 |
| status | Run / 工具行词表（[ui-state-vocabulary](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) §1）、Attention 五状态（§6）、`Sending…` 在途、`cancel requested ≠ stopped` | partial args、并发工具 grouped row | assistant-ui Tool UI（B 层） |
| meter | **今日无，且这条拒绝已在代码里执行**：`runtime-view.mjs:2483-2486` 逐字拒绝把 context 画成 percentage-of-limit / free space / quota；telemetry 的 context 是启发式估算（`serialized text ÷ 4`），按 WK-140 第五条 `estimate ≠ meter` 不得画刻度 | 需 owner 给出 current / limit 同口径测量后方可立项；review score 与可编辑 threshold 必须分开 | React Aria Meter（只取语义，不引依赖） |
| timeline | **今日无**（BE-32 前） | run / subagent span；`process-trace` 的 collapsed → timeline → raw 第二层。`thread-projection.mjs` 今日只产出线性消息序列，不是带刻度的时间轴 | LangSmith 三投影**未核验**（原 URL 重定向到总览页）；Braintrust 的 spans / thread / timeline 三视图**经核验不成立**，已撤（WK-149 (a)）。本地依据改为 Usage 一个 dialog 内 heatmap / 堆叠 / 明细表三投影并存 |
| tree | 工作面 workspace 文件树 | nested / subagent 执行（拓扑本身是要读的事实时才用） | — |
| graph | **不设**。只有拓扑关系本身是被读的事实才考虑；今日无此事实，也无需求（WK-140 `complex ≠ graph`） | — | — |
| distribution | **今日有**：`renderContextBar`（`runtime-view.mjs:2487-2549`）按 kind 分桶的比例条（`role=img`，无固定上限——**是构成不是余量**）；Usage 的模型堆叠图。单次 run 的量给数值，群体观察才谈分布 | latency / TTFT 分布须先有测量与样本口径（WK-141 (b)：今日无 per-token 时钟） | NVIDIA inference dashboard（线索级，未核验） |
| heatmap | Home 活动格（固定刻度、日 Run 计数、方向键 + 每格 accessible name）、Usage 热图（`quantileLevels` P50 / P75 / P90，零单列一级） | 只用于真正二维离散 / 分箱（day × hour、model × day、tool × error）；单值百分比、单模型速率、单 run 过程一律不用 | [data-visualization](../home-composition-2026-09-10/data-visualization.md)（口径、覆盖率、色彩边界） |

负规则（WK-140 / WK-146，与 Control Grammar 共用），按证据强度三态记，**禁止简写成"四条已通过"**：`running ≠ progress` **已验证合规**（`home-view.mjs:354`、`surface-modules.mjs:57`、`runtime-view.mjs:2483-2486` 三处正面证据）、`high-risk ≠ confirm dialog` **已验证合规**（原位两钮卡，全仓 `confirm(` 零命中）、`numeric ≠ slider` **空集**（从无数值输入控件，未被违反≠已被验证）、`complex ≠ graph` **当前不适用**（无拓扑对象）、`estimate ≠ meter` **已验证合规**（本地新增，代码已执行）。机械可查的三项（`progress` / `meter` / `role=meter` / `aria-valuenow` 的登记制、`input[type=range]` 的空集守恒）由 `tools/lint-interaction.mjs` 承担（WO-PG-01）。

## Control Grammar 段（WK-129）

六类；每格标"今日有 / 候选（待 schema）/ 参照"。行为语义以 React Aria / Base UI 为 donor（不引依赖）。

| 类 | 今日有（schema 存在） | 候选（待后端 schema） | 参照 |
|---|---|---|---|
| Selection | Segmented（Settings 路径 / 模式 / 布局）、Select（provider / model）、checkbox / radio；entity picker for matter / session / run（Attention `attach_relation`，仅 ATT-FE-01 内，WK-136） | Token picker（BE-21 连接、reviewer）、ComboBox（大目录搜索）、policy editor（Attention grant → CC-P） | React Aria ToggleButtonGroup / ComboBox / TagGroup |
| Value | — | NumberField + Stepper + ScrubArea（BE-31 number；context budget / threshold）、Slider（bounded）、Range。**本类今日为空；第一个实例是 CC-I 的 PropertyRow（本设备偏好，schema 最小），不是 specimen board 上的第六 / 第七号**（WK-144 (b)） | Base UI NumberField（**已核验**：typing / 键盘 stepping / ± 按钮 / 滚轮 `allowWheelScrub` / `ScrubArea` 五种 modality，同一值多 modality 而不产生五个控件；**两阶段 commit**：`onValueChange` 交互中即时、`onValueCommitted` blur 或指针释放才提交——这条直接进 PropertyRow）；React Aria Slider |
| Temporal | `next_action.due_at`（Attention，单点 datetime，trigger `at` 必带；WK-136） | Date / time range（BE-25 活动区间）、Waveform / Transport（无音频 artifact 契约，仅参照） | waveform-playlist 分层 |
| Command | 顶带槽位、strip 行、Settings 搜索 `/` | contextual toolbar（bubble：tool call → Inspect / Approve、artifact → Open / Download；text / evidence 待 Core）→ CC-I；command palette（未立项）。**placement 由 action 的 applicability 推导**（`appliesTo / requiresSelection / requiresCapability / risk / frequency / preferredSurface` → fixed chrome / contextual toolbar / context menu / palette / inspector / approval surface），不是选一个 toolbar variant（WK-143） | Tiptap / Nuxt fixed-bubble-floating；cmdk；Unity Contextual Tooling（线索级） |
| Structure | `<details>` 原位展开、settings row、tab strip、Tree（工作面 workspace 文件树）；**PropertyRow 已落地**（WK-152，`settings-view.mjs`）：Label / Description / Control / [Foot: Provenance · Reset]，validation 与行并列而非行内（`codeFontError` 是兄弟节点，`role=alert`）；provenance 闭集两词 `Default` / `Changed on this device`，只作生效值与 `PREFERENCE_DEFAULTS` 的字面比较，草稿值不参与；Reset 默认态不呈现、无确认、重画后焦点落回本行控件 | PropertyRow 扩到本设备偏好之外（需 owner 事实）；**加 Provenance 列**——值从何而来 / 是否本地改写，取 owner 事实不作 UI 推断，使 Inspector 成为 governed state editor 而非 setting form，WK-143）、Rule builder **今日已有一个**：`runtime-view.mjs:2066-2170` 的工具权限 CAS 规则表（action / resource / effect，分层收紧）——与 CC-P 候选的 Attention grant 是两个不同的 policy 对象（WK-147 (b)）；PolicyRule canonical 文本仍待 | MetaBind Inspector；Tailscale visual editor ↔ canonical（GitOps 下 GUI 只 search / filter / preview，不是事实源） |
| Governed Action | Approval 两钮（闭集）、Question 卡、cancel requested ≠ stopped；Attention typed actions（resolve 须 reason；snooze / set_waiting 须 next_action ≠ none；按 `human_actions` 广告生成，WK-136）——**后端合同已有、前端未建**：`human_actions` 只在 `app/core/attention.py`，`attention-view.mjs` 自称只读、`attention-agent-view.mjs` 只有 allow / deny，施工单是 ATT-FE-01（WK-147 (c)） | threshold（BE-31 number）、reviewer picker（BE-21 / Attention）、policy editor（CC-P）。**scope 可视化先于 scope 按钮**：`once / this run / 1 hour / always` 是在编辑 authorization scope，不是四个并列按钮；待 grant scope schema 方可立项，无 Always allow 不变（WK-142） | review-projection §6；Primer undo over confirmation；Cloudflare Agents HITL（线索级，不引入 reviewer 身份 / policy version / 到期钟等今日无 owner 的对象） |

## Iconography 段（WK-133）

Visual Grammar 第五段；来源 S17，裁定 [intake §4al WK-133](../../mvp/execution/work-surface-kit/intake-round-3.md)。

| 节 | 今日 | 规则 / 候选 |
|---|---|---|
| semantic registry | [glyph-semantics](../../mvp/execution/work-surface-kit/contracts/glyph-semantics.md)（WK-71）：语义 · 出现面 · 频率 · 裁取 · glyph · accessible name · tooltip | 不另建 registry；代码层 symbol id 仍是 Lucide 名——换族 / 引 donor 的那一单第 0 项先改为语义 id，此后换族只动 sprite |
| geometry | 24 × 24 canvas、2px 居中描边、round cap / join、currentColor；行 16 / 控件 18 / 导航 20；命中 32 / 44 从 `--control` 来（IC-1、WK-13） | Lucide 设计指南升为验收规则：1px 安全边、圆角 2 / 1 / 2.41、元素间距 ≥ 2、circle / square 光学密度模糊对照、视觉重心居中、像素对齐、一致细节密度；适用于自绘与 donor 归一 glyph |
| state | glyph 不承担状态（WK-71 规则 1 / FN-28）；selected / current / expanded 走 aria 状态 + `--selected` | Line ↔ Fill 配对 = "候选，待 boolean toggle schema"（最近 ATT-* watch），只作冗余线索；duotone 不进入 |
| density | 单一 2px 重量；尺寸档三档 | compact / prominent 不引第二重量；图标与字阶的配对在 FE-05a 后定 |
| source | canonical family = Lucide 1.41.0 静态子集 24 枚（IC-5，冻结）；Courtwork 独有语义 = brand / domain SVG 库；window chrome = 宿主 | 一时一族。候选：MingCute（主要视觉候选，Apache-2.0，Regular / Filled）、Phosphor Regular（表现力局部，六重量不采纳）、Remix（覆盖 donor）、Hugeicons（长尾查询源）。donor 单枚进入须归一 geometry + manifest 来源 / sha / license + 光学验收。EX-IC1 specimen 在 FE-05a 合流后派 |
