# Local UI Atlas · 局部行为索引

> **Visual Grammar（WK-125）**：SHAPE / MATERIAL / IDENTITY / MOTION 位于本页组件条目之上；组件只声明角色（shape role、material tier、state contract），视觉由 grammar 解算。**Control Grammar（WK-129）**再靠前一层：Schema / intent → control；Schema constraint ≠ UI affordance。各段见本页末。

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

conventional（wordmark / icon / typography，现有 brand 包）与 generative（glyph grammar / procedural wordmark / semantic mark / state glyph / exportable artifact）。载体：公共站 hero、Home 空态字标、matter initials、`REV nn`、完成 seal。约束：从文书母题生成，不复制 OpenCode 风格；state glyph 只投影 ui-state-vocabulary 里已有状态。待用户点头后派 EX-GI1。

## Shape 段（WK-125）

五个语义角色 `shape.control.compact / control.default / surface / overlay / full` → 现有 token（`--radius-small` 4 / `--radius-control` 8 / `--radius-card` 12 / `--radius-container` 16 / `--radius-pill`）；公理 `R_child = max(R_min, R_parent − inset)`；密度耦合（桌面 rounded rect，capsule 只给 large / isolated / prominent；触控可更圆）；grouping topology；focus ring 派生；forbidden：arbitrary radius、primary 自动更圆、danger 换 shape、pill everywhere、父子同 radius。`corner-shape` 只 progressive enhancement。EX-CS1 已回执 → WK-128：三处沉睡违例、`.context-group` 重名、circle 统一 `--radius-pill`、focus 派生、lint-shapes + SHAPE 断言并入 FE-05a 第 0b 项；`corner-shape` 只进 specimen。

## Motion 段（WK-124 / WK-125）

state transition（原位变态：Send → Sending…、Approve → 回执行）、focus（transition blur 只在小型 text / icon）、material response（不动画 `backdrop-filter`）、identity transition（GI 轨道）；reduced-motion 下全部瞬切；pressed shape morph 只 experimental。

## Control Grammar 段（WK-129）

六类；每格标"今日有 / 候选（待 schema）/ 参照"。行为语义以 React Aria / Base UI 为 donor（不引依赖）。

| 类 | 今日有（schema 存在） | 候选（待后端 schema） | 参照 |
|---|---|---|---|
| Selection | Segmented（Settings 路径 / 模式 / 布局）、Select（provider / model）、checkbox / radio | Token / entity picker（BE-21 连接、reviewer）、ComboBox（大目录搜索） | React Aria ToggleButtonGroup / ComboBox / TagGroup |
| Value | — | NumberField + Stepper + ScrubArea（BE-31 number；context budget / threshold）、Slider（bounded）、Range | Base UI NumberField ScrubArea；React Aria Slider |
| Temporal | — | Date / time range（BE-25 活动区间）、Waveform / Transport（无音频 artifact 契约，仅参照） | waveform-playlist 分层 |
| Command | 顶带槽位、strip 行、Settings 搜索 `/` | contextual toolbar（bubble：tool call → Inspect / Approve、artifact → Open / Download；text / evidence 待 Core）→ CC-I；command palette（未立项） | Tiptap / Nuxt fixed-bubble-floating；cmdk |
| Structure | `<details>` 原位展开、settings row、tab strip、Tree（工作面 workspace 文件树） | Inspector PropertyRow（modified / reset，先本设备偏好）、Rule builder（待 PolicyRule canonical 文本，候选 CC-P） | MetaBind Inspector；Tailscale visual editor ↔ text |
| Governed Action | Approval 两钮（闭集）、Question 卡、cancel requested ≠ stopped | threshold（BE-31 number）、reviewer picker（BE-21 / Attention）、policy editor（CC-P） | review-projection §6；Primer undo over confirmation |
