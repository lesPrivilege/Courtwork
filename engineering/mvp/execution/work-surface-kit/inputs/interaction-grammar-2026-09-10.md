# 用户转交 · Projection Grammar / Interaction Grammar（Exa 94 结果 / 5 workstream，2026-09-10）

用户以消息原文转交（Exa 复核 94 结果、5 条 workstream：agent-native runtime / HITL、schema-driven inspector、policy / rule builder、temporal & usage visualization、pro-app contextual / direct manipulation），Fable 转录要点，链接未经核验。用户同时明确本轮定位：**仅供参考，需要从当前的 UI 范式自然长出**，并派 Sonnet explore。消费裁定见 [intake-round-3 §4ar WK-139…144](../intake-round-3.md)；前置输入为 [S16 Control Grammar](control-grammar-2026-09-09.md)（WK-129）。

**核心命题**：上一轮的 `CONTROL GRAMMAR` 成立，但不完整——Agent GUI 里有大量"可视化"并不是 control：trace、timeline、context meter、token distribution、heatmap、confidence distribution 回答的是"**如何读状态**"；slider、approval、model picker、scrubber 回答的是"**如何改变状态**"。因此应在 Control Grammar 之上并列一层 **Projection Grammar**，二者合称 INTERACTION GRAMMAR：

```text
Governed State / Event / Schema
├── data type · user intent · execution lifecycle · risk / authority · scope · temporal / structural topology
        ↓
INTERACTION GRAMMAR
├── Projection Grammar ← how to read：status / meter / timeline / tree / graph / distribution / heatmap
└── Control Grammar    ← how to act：selection / value / temporal / command / structure / governed action
        ↓
Component Anatomy → Shape / Material / Identity / Motion
```

**四条负规则**（用户建议直接成为 design lint）：`numeric ≠ slider`、`running ≠ progress`、`complex ≠ graph`、`high-risk ≠ confirm dialog`。

**Agent GUI 的一级 canonical grammar**：成熟 Agent UI 正在形成超出通用 GUI 的一级语义——AI Elements 已把 `plan / task / queue / tool / confirmation / branch / context / reasoning / workflow canvas / node toolbar` 当作独立构件；assistant-ui Model Selector 把 **model + reasoning effort** 合成一个 runtime-aware compound control；AG-UI 在协议层定义 interrupt / approve / edit / retry / escalate / cancel / resume。用户给出 20 行 semantic → 默认 projection / control 的映射表：model → picker（provider grouping + capability metadata）；reasoning effort → segmented（层级多则升 Select / Slider）；context consumption → Meter（current / limit，不是 progress）；input / cache / output tokens → stacked meter（hover 才披露绝对数）；TPS → live metric + sparkline；TTFT → metric（群体观察才用 distribution）；tool executing → tool status / receipt 分离；parallel tools → grouped tool row（不制造 N 张重复 card）；known task list → plan / task list（有明确完成单位才可表达 progress）；uncertain agent execution → activity / timeline（**不得伪装成百分比 progress**）；nested / subagent → tree / timeline（只有拓扑关系重要时才 graph）；retry / resume → stateful command（与"重新提交 prompt"区分）；user steering → interrupt / steer（属当前 run，不属新 turn）；pending decision → decision gate（不一律叫 confirmation）；permission request → permission scope（显示被授权的 capability / scope）；structured user input → elicitation form；artifact → artifact surface（open / diff / cite / download）；evidence → evidence row（accept / challenge / link proposition）；review score → meter / score（editable threshold 与实际 score 分开）；model usage over period → ranked bar / time series（分类比较不默认 pie）；model × time → heatmap（只有真正二维密度时）。

**Micro-visualization 的位置**：LangSmith 把 token / cost / latency / TTFT 作为 trace 与 dashboard 的基本 metric；NVIDIA 的 LLM inference dashboard 同时用 TTFT、inter-token latency、tokens/sec、KV cache utilization，并用 heatmap 表达 latency distribution over time。但 Courtwork 不必复制 observability dashboard：composer / message footer 里最合适的是一行 `模型 · 126 t/s ▁▂▄▇▅▆ · 1.1s TTFT`，展开后才是 Input / Cache read / Output / TTFT / TPS / Duration / Cost 的完整清单——**micro visualization 首先承担 ambient awareness，完整 observability 是二三级 disclosure**。

**Resource Meter Grammar**：Context 不应只显示 `32k / 128k`，可形成百分比 meter 并细分 system / governed context / conversation / tool result / cache。关键语义分离：**Context Meter ≠ token usage chart ≠ context policy editor**——分别回答"此刻还剩多少资源""资源过去如何被消耗""未来允许怎样编译和分配资源"，与 SE 的 Event / Matter / Compiled Context 分离同构。

**Inspector → Property Projection**：Base UI NumberField 作为 behavior donor，已把一个 numeric property 的输入拆成 typing / keyboard step / +− step / wheel / scrub / commit——同一个值多种 modality 而不产生五个控件；React Spectrum / React Aria 目录覆盖 ActionBar / ComboBox / DateRange / Meter / RangeSlider / collections / selection。因此 PropertyRow 约为：Label · Description? / Help? · Current value / inherited value · Control · Validation state · Modified indicator · Reset / revert · **Provenance?**——最后一项（`Context budget 64k ← Expert policy`、`Approval threshold .75 modified locally`）是普通设计系统不强调、Courtwork 值得自研的，使 Inspector 从 setting form 升为 **governed state editor**。

**Approval 升为 grammar**：Cloudflare Agents 区分 durable workflow approval、chat tool approval、client-side tool interaction、MCP elicitation，并有 multi-approver pattern；更严格的 governance 把 approval 绑定到 exact action、policy version、approver identity 与 expiry。用户据此建议 ApprovalGate 建模为 requested action · affected object / diff · reason policy · risk · scope · requester · required reviewer(s) · expiry · decision · optional reason · receipt / provenance，UI 形态随后推导（Confirmation / Approval Gate / Reviewer Picker / Reviewer Group / Approval Chain / Quorum / Approve once / Scoped Approval / Time-bound Permission / Threshold rule / Elicitation / Policy Editor + higher-order approval），并特别指出：`Approve once` / `Approve for this run` / `Allow for 1 hour` / `Always allow` 不应画成四个普通 Button，它们实际是在编辑 **authorization scope**，scope 本身应可视化。

**Policy Editor**：Tailscale Visual Policy Editor 的 `visual representation ↕ canonical policy` 双向、GitOps 下 GUI 只能 search / filter / preview 而不能成为 source of truth，可原封转译为 `Human control surface ↕ Canonical governed representation → validation / tests / version / provenance`；policy 的 test 也应是一等 UI（`3 rules changed`、逐条 ✓ / ✕、`View canonical` / `Review diff`）。

**一个 run 天然有多种视图**：LangSmith 把同一 thread 分为 Messages（conversation reading）/ Turns（structural overview）/ Details（debugging）并支持从 message / tool call drill down 到对应 run；Braintrust 用 Spans（hierarchy）/ Thread（narrative）/ Timeline（execution / token efficiency）。原则："**不要要求一种 UI projection 同时解释 agent 的全部事实**"——同一 Event Log 可投影为 Conversation / Trace / Timeline / Matter changes / Usage / Review，不是六份数据也不是六套 state；因此不建议把复杂 trace 全塞进 message card。

**Heatmap canonical 用法**：适合 day × hour usage、model × day token / cost、expert × matter activity、tool × error category、latency distribution × time bucket；不适合单个 context %（→ meter）、单模型 TPS（→ metric / sparkline）、多模型当前 cost（→ ranked bar）、单 run 执行过程（→ timeline）、task completion（→ progress / list）。首页第一张 heatmap 应有含义（Human attention 或 model × 星期活动），而不是抽象的 GitHub contribution clone。

**Waveform 两档**：L1 artifact playback 用 wavesurfer.js（waveform / seek / playback / region / timeline / record，插件式）；L2 temporal review / editor（trim / annotation / multiple tracks / undo / record）才用 waveform-playlist（core / engine / browser / playout / recording / annotations 已分层）。渐进披露：audio chip → waveform player → annotated timeline → editor。

**Contextual Toolbar 治理的是 Applicability**：Tiptap BubbleMenu 提供 selection-driven positioning，Unity Contextual Tooling 给出"aim for contextual, non-global solutions"。因此不是 `toolbarVariant = "floating"`，而是 Action 声明 `appliesTo / requiresSelection / requiresCapability / risk / frequency / preferredSurface`，placement 由此推导：global frequent → fixed chrome；selected evidence → contextual toolbar；rare object command → context menu；discoverable global → command palette；property of current object → inspector；governed irreversible → approval surface。

**Control Specimen Board 由 10 扩为 16**：01 Model Picker + Effort、02 Context Meter、03 Live Generation Metric、04 Composer Tools、05 Reference Token Field、06 Numeric Inspector、07 Threshold Inspector、08 Time Range、09 Tool Run、10 Plan + Queue、11 Approval Gate、12 Approval Policy、13 Evidence Toolbar、14 Run Timeline、15 Usage Visualization、16 Temporal Artifact；board 的目标改写为"**不是展示有多少 component，而是验证同一套 semantic schema 能否稳定推导出恰当的 human projection 与 interaction**"。

**技术选型边界**：React Aria / React Spectrum = accessibility + interaction semantics donor；Base UI = pro-app direct manipulation donor（尤其 NumberField / scrub）；AI Elements = agent-state anatomy reference；assistant-ui = composer / model / thread runtime reference；AG-UI-like event vocabulary = execution / interrupt / tool-state reference（不要求绑定协议）；Tiptap / Floating UI = contextual surface mechanics；Tailscale = governed visual editor ↔ canonical representation；LangSmith / Braintrust = Projection Grammar；wavesurfer = lightweight temporal artifact；waveform-playlist = on-demand advanced temporal editing。**Courtwork 自己拥有的是 semantic registry + projection / control selection rules + visual grammar；不应让任何一个 donor library 反过来定义产品的信息架构。**

用户结论：`CONTROL GRAMMAR` 不只是一个 Design 补丁，而适合成为 **SE → Human Interface 的正式桥层**（governed machine state → semantic contract → projection / control grammar → human-readable + human-operable surface）；"成熟工作软件的厚度"不主要来自阴影、blur、圆角或组件数量，而是**机器中的不同事实在人类面前获得了恰如其分、可预测、可操作的形态**。
