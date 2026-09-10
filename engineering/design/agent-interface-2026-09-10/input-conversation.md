# 补充控制语法 · 全部输入

转录仅规范化行尾空白与末尾换行；消息正文不删节。

来源 conversation `6aa1b433-6058-83ec-86cc-588841a99017`，2026-09-10读取全部3 turns，hasMore=false。原文是输入材料，不是直接生效的规则；历史数量/截图/外部引用不因转录获得核验。最终处置见 frontend-contract.md。

## T1 · userMessage · e705e304-3830-4726-b3ee-ce364d4dd2b9

是。两张图把上一轮的结论再推进了一层：**不能只治理 Button、Input、Card；应该治理一整套 Control Grammar。**

我用 Exa 又扫了 **56 个结果、5 条 workstream**：成熟桌面/生产力控件、React headless primitives、音频/时间轴、policy/rule builder、contextual toolbar。结论非常明确：

> 成熟工作软件的“厚度”，相当一部分来自**为数据类型和操作语义选择恰当的控件**，而不是把所有东西降级成 `button + text input + dropdown`。

你给的两张图就是很好的样本。

### 这两张图里其实已经有十几类控件

第一张不是“一堆圆角 Button”。实际上包含：

| 图中形态真正的 control                       |                                   |
| ------------------------------------- | --------------------------------- |
| `A / Aa / Tt / emoji / image / list…` | contextual toolbar + toggle group |
| `0:00 … Play ×`                       | recorder transport                |
| 蓝色波形                                  | waveform / temporal scrubber      |
| pause / save / delete                 | stateful transport actions        |
| `12:00 → 12:30 30min`                 | time-range compound field         |
| 顶部三个 icon                             | compact command group             |
| `×`                                   | contextual remove/dismiss action  |

第二张更明显：

| 图中形态Control semantics    |                                         |
| ------------------------ | --------------------------------------- |
| Auto-Approve             | Switch                                  |
| `2-way / 3-way / Manual` | Segmented control                       |
| Confidence `0.75`        | Slider + numeric output                 |
| Pay Before Due `− 3 +`   | Stepper / NumberField                   |
| Yuri / Mara / +Add       | Token field / entity picker             |
| Needs review `6`         | status list + badge                     |
| 每行蓝色小图                   | mini-meter / distribution visualization |
| `0.58 / 0.63 / 0.71`     | confidence score                        |
| Time to approve          | compact metric visualization            |

所以此前的：

```text
Button
Input
Select
Card
```

确实远远不够。

---

# 应增加一个独立的 `CONTROL GRAMMAR`

我建议放在 Component Anatomy 甚至更靠前：

```text
Schema / intent
       ↓
Control grammar
       ↓
Component anatomy
       ↓
Shape / material / motion
```

这有一个很强的 SE 含义：

> **控件本身就是 Schema 的人类可操作 projection。**

例如一个 schema：

```text
confidence: number
range: 0..1
step: .05
```

不应该让设计 agent 自由决定“做个输入框”。

它可以推导出：

```text
bounded number
+ approximate manipulation useful
+ exact value matters
        ↓
Slider + NumberField
```

这比在 UI 层临时编排稳健得多。

---

## 可以形成第一版 canonical mapping

| Schema / Intent默认 control何时升级 |                       |                                      |
| ----------------------------- | --------------------- | ------------------------------------ |
| `boolean` immediate           | Switch                | destructive 则 confirmation/approval  |
| small exclusive enum          | Segmented             | >4/5 项 → Select                      |
| large searchable enum         | ComboBox              | entity → richer picker               |
| discrete multi-value          | Checkbox group        | 大集合 → multi-select                   |
| entities / tags               | Token field           | 加 autocomplete / search              |
| bounded approximate number    | Slider                | 需要精确值 → Slider + NumberField         |
| precise integer               | NumberField / Stepper | 大跨度 → direct input                   |
| numeric interval              | Range slider          | 精确边界 → dual fields                   |
| date                          | DateField + Calendar  | —                                    |
| date/time interval            | Range picker          | —                                    |
| ordered procedure             | Stepper / Plan        | 可分支 → workflow                       |
| short actions                 | Toolbar               | context dependent → floating toolbar |
| hierarchical data             | Tree / disclosure     | 搜索多 → searchable tree                |
| status quantity               | Meter                 | execution progression → Progress     |
| media time                    | Scrubber              | rich audio → waveform                |
| record/play state             | Transport             | —                                    |
| conditions                    | Rule builder          | complex graph → workflow canvas      |
| high-risk action              | Approval control      | quorum / policy / reviewer UI        |

这比“组件库枚举”有用得多。

---

## 实现选型也已经有明显收敛

**React Aria 应该提级。**

它的 catalog 已经包含 Button 之外完整的：

`ToggleButtonGroup / ComboBox / TagGroup / GridList / DateRangePicker / TimeField / ColorPicker / NumberField / Slider / Meter / DropZone ...`

而且它处理的是 interaction semantics、keyboard、screen reader、touch、internationalization，不规定 Courtwork 长什么样。

[React Aria Components](https://reactspectrum.blob.core.windows.net/reactspectrum/d754eaf7d3e203b0a892d800f85e9a0521aa5952/docs/react-aria/components.html)

因此我们可以采用：

```text
React Aria / Base UI
      = behavior donor

Courtwork
      = visual grammar owner
```

而不是自己重新实现 slider 的键盘语义、multi-thumb、date range、token navigation。

---

## Base UI 有一个尤其值得取的控件：NumberField

它已经不是：

```text
[-] 3 [+]
```

这么简单。

还有 **ScrubArea**——拖动 label/value 就可以连续改变数字。这是 Figma、3D/editor 类软件很常见的 pro-app pattern。

这意味着例如：

```text
Context budget   32k
Threshold        .75
Max retries       3
```

既可以：

- 点击直接键入；
- `+ / −` 微调；
- drag/scrub 快速调整。

同一个数值，根据操作意图给三种 interaction modality，而不是做三个组件。

这类细节正是成熟工具的“底蕴”。

[Base UI primitives](https://base-ui.com/react/components/slider)

---

# 第二张图尤其提示：Courtwork 可以拥有 Inspector Grammar

以后 experts、runtime、matter、policy 配置不应该都是传统 Settings form。

可以形成：

```text
Inspector
├── section
│
├── PropertyRow
│   ├── label
│   ├── description
│   ├── control
│   ├── modified indicator
│   └── reset
│
└── conditional disclosure
```

然后 property schema 决定 control：

```text
Boolean → switch
Enum ≤ 4 → segmented
Enum many → dropdown
Number bounded → slider
Number exact → number field
Date → date picker
Array → repeatable/token control
Group → disclosure section
Entity → picker
```

这类 schema-driven inspector 已经存在成熟实践。[MetaBind Inspector](https://docs.metabind.ai/guides/building/inspector-reference)

对 SE 尤其自然，因为：

> **validation 与 inspector 分离。**

UI 可以显示 slider，但真正的：

```text
min/max/type/allowed values
```

仍由 schema/governance 层验证。

即：

```text
Schema constraint ≠ UI affordance
```

这一条很重要。

---

# Waveform 也值得作为正式 control，而不是视觉装饰

第一张图中的 voice control 很漂亮，因为它把：

```text
duration
state
playback position
audio content
```

压到一条非常紧凑的 surface 里。

成熟实现已经可以把它拆为：

```text
Waveform
Transport
Play / Pause / Stop
Scrubber
Current time
Duration
Trim handles
Annotations
Record state
```

`waveform-playlist` 已经发展为独立 engine、React/UI component 和 adapter 分层，还有 recording、annotation、trim、undo/redo 等。[Waveform Playlist](https://github.com/naomiaro/waveform-playlist)

因此 Courtwork 如果将来有：

- voice note
- interview/evidence audio
- meeting material
- dictated prompt

无需退化成：

```text
audio.mp3  ▶
```

可以有真正的 **temporal artifact control**。

但依然只按需要加载，不应该让 DAW runtime 混入 Core。

---

# Contextual Toolbar 也应成为一级模式

你图一顶部那条非常典型：

```text
selection / object
      ↓
relevant actions only
      ↓
compact floating control bar
```

而不是：

```text
所有功能永远放在固定 toolbar
```

Nuxt/Tiptap 已经把同一套 toolbar 明确分成：

- `fixed`
- `bubble`：selection 时出现
- `floating`：empty block / context 出现

[Nuxt Editor Toolbar](https://ui.nuxt.com/raw/docs/components/editor-toolbar.md)

这能扩展到 Courtwork 不只是文本：

```text
select text
→ Quote / Annotate / Ask / Mark issue

select artifact
→ Open / Diff / Download / Cite

select evidence
→ Accept / Challenge / Link proposition

select tool call
→ Inspect / Retry / Approve

select matter item
→ Move / Tag / Assign / Review
```

于是 **control 出现的位置也受到 intent 治理**。

---

# Policy / Rule 控件尤其适合 SE

Tailscale 现在做了一件值得借鉴的事：

```text
Visual editor
↕
canonical policy text
```

可双向切换，而且 GitOps 模式可以保持 VCS 为 source of truth。[Tailscale Visual Policy Editor](https://tailscale.com/docs/features/visual-editor)

这比“漂亮设置页”重要得多。

Courtwork 后续的：

```text
Expert policy
Context policy
Approval policy
Matter governance
Tool permission
Retrieval/compile rules
```

理论上都可以采取：

```text
human-friendly control surface
           ↕
canonical governed representation
```

视觉控件只是**编辑器**，不是事实源。

这非常符合 SE。

---

## 所以 Visual Grammar 可以再扩一层

此前：

```text
Shape
Material
Identity
Motion
```

现在应该补成：

```text
CONTROL GRAMMAR
│
├── Selection
│   ├── segmented
│   ├── toggle
│   ├── combobox
│   └── token
│
├── Value
│   ├── number
│   ├── stepper
│   ├── slider
│   ├── scrubber
│   └── range
│
├── Temporal
│   ├── date/time
│   ├── calendar
│   ├── waveform
│   └── transport
│
├── Command
│   ├── toolbar
│   ├── contextual toolbar
│   ├── menu
│   └── command palette
│
├── Structure
│   ├── disclosure
│   ├── tree
│   ├── inspector
│   └── rule builder
│
└── Governed Action
    ├── approval
    ├── threshold
    ├── reviewer picker
    └── policy editor
```

然后 **Shape Grammar 再决定这些 control 的圆角；Material Grammar 决定其表面；Motion Grammar 决定 state response**。

这就真正形成完整体系了。

我认为下一份 specimen board 应从原来的 `Button / Composer / Card` 扩充为 **Control Specimen Board**，至少放：`segmented / slider+number / stepper / token picker / time range / waveform transport / contextual toolbar / inspector row / approval policy / rule condition`。而且全部使用真实 Courtwork 语义，而不是 `Option A/B/C` 假数据。这样可以一次把“成熟工作软件的控件厚度”纳入后续 Design handoff。

\---

我建议为 Agent GUI 所需的可视化控件进行 explore @Exa

## T1 · agentMessage · e705e304-3830-4726-b3ee-ce364d4dd2b9

我用 Exa 复核了 **94 个结果、5 条 workstream**：agent-native runtime/HITL、schema-driven inspector、policy/rule builder、temporal & usage visualization、pro-app contextual/direct manipulation。你这一轮提出的 `CONTROL GRAMMAR` 基本成立，但调研后我认为还应再补一个与它平行的层：**Projection Grammar**。

因为 Agent GUI 里有大量“可视化”其实不是 control：trace、timeline、context meter、token distribution、heatmap、confidence distribution 都是在回答“如何读状态”；slider、approval、model picker、scrubber 才是在回答“如何改变状态”。

因此体系最好变成：

```text
Governed State / Event / Schema
│
├── data type
├── user intent
├── execution lifecycle
├── risk / authority
├── scope
└── temporal / structural topology
        ↓
INTERACTION GRAMMAR
│
├── Projection Grammar   ← how to read
│   ├── status
│   ├── meter
│   ├── timeline
│   ├── tree
│   ├── graph
│   ├── distribution
│   └── heatmap
│
└── Control Grammar      ← how to act
    ├── selection
    ├── value
    ├── temporal
    ├── command
    ├── structure
    └── governed action
        ↓
Component Anatomy
        ↓
Shape / Material / Identity / Motion
```

这比把 chart、slider、toolbar 全叫“control”更严谨。

## 1. Agent GUI 有一组自己的 canonical grammar

最重要的发现是：成熟 Agent UI 正在自然形成一组**超出通用 GUI 的一级语义**。

[AI Elements](https://elements.ai-sdk.dev/) 已经把 `plan / task / queue / tool / confirmation / branch / context / reasoning / workflow canvas / node toolbar` 当成独立构件；[assistant-ui Model Selector](https://www.assistant-ui.com/docs/ui/model-selector) 甚至已经把 **model + reasoning effort** 合成一个 runtime-aware compound control。AG-UI 则从协议层定义了 interrupt、approve、edit、retry、escalate、cancel/resume 等状态。

所以 Courtwork 不应只做：

```text
React Aria controls
+ some AI cards
```

而应当有自己的 semantic registry：

| Agent / work semantic | 默认 projection / control | Courtwork 规则 |
|---|---|---|
| 当前 model | Model Picker | provider grouping + capability metadata |
| reasoning effort | Segmented | 层级多时升级为 Select/Slider，不硬塞 segmented |
| context consumption | Meter | current / limit；不是 progress |
| input/cache/output tokens | Stacked Meter | hover/detail 才披露绝对数 |
| TPS | Live Metric + Sparkline | 当前值 + 短时间趋势，而非孤立大数字 |
| TTFT | Metric / distribution | 单次 run 显示数值；群体观察才用 distribution |
| tool executing | Tool Status / Receipt | running 与最终 receipt 分离 |
| parallel tools | Grouped Tool Row | 不制造 N 张重复 card |
| known task list | Plan / Task List | 有明确完成单位才可表达 progress |
| uncertain agent execution | Activity / Timeline | **不得伪装成百分比 progress** |
| nested/subagent execution | Tree / Timeline | 只有拓扑关系重要时才 Graph |
| retry/resume | Stateful Command | 与“重新提交 prompt”区分 |
| user steering | Interrupt / Steer control | 属于当前 run，不属于新 turn |
| pending decision | Decision Gate | 不一律叫 confirmation |
| permission request | Permission Scope | 要显示被授权的 capability/scope |
| structured user input | Elicitation Form | schema → appropriate field |
| artifact | Artifact Surface | open / diff / cite / download contextual actions |
| evidence | Evidence Row | accept / challenge / link proposition |
| review score | Meter / score | editable threshold 与实际 score 分开 |
| model usage over period | Ranked Bar / time series | 分类比较不要默认 pie |
| model × time activity | Heatmap | 只有真正二维密度时才使用 |

这里尤其值得冻结四条负面规则：

```text
numeric        ≠ slider
running        ≠ progress
complex        ≠ graph
high-risk      ≠ confirm dialog
```

这四条几乎可以直接成为 Design lint。

---

## 2. 你关心的 TPS，确实值得做成一级 micro-visualization

这轮调研反而强化了这一点。

LangSmith 已经把 token、cost、latency、TTFT 等作为 trace / dashboard 的基本 metric；NVIDIA 的 LLM inference dashboard 同时使用 TTFT、inter-token latency、tokens/sec、KV cache utilization，并用 **heatmap 表达 latency distribution over time**。[LangSmith Dashboards](https://docs.langchain.com/langsmith/dashboards) [NVIDIA Observability](https://docs.nvidia.com/enterprise-reference-architectures/observability-guide/latest/custom-dashboards.html)

但 Courtwork 不必复制 observability dashboard。

Composer / message footer 中的 TPS 最合适是：

```text
Gemini 3 Flash  ·  126 t/s  ▁▂▄▇▅▆  ·  1.1s TTFT
```

展开后才是：

```text
Model
Input       18.4k
Cache read  15.2k
Output       2.3k
TTFT         1.1s
TPS          126
Duration    19.4s
Cost        ...
```

也就是说：

**micro visualization 首先承担 ambient awareness；完整 observability 是二三级 disclosure。**

这样才能让它成为“厚度”，而非监控仪表盘侵入主 Chat。

---

## 3. Context 应该正式拆出一种 `Resource Meter Grammar`

这也是已有 Agent 组件里比较成熟的一块。

不要只显示：

```text
32k / 128k
```

而可以形成：

```text
Context  46%
█████████░░░░░░░
```

再细分：

```text
system / governed context / conversation / tool result / cache
```

但有一个语义上的关键点：

> **Context Meter ≠ token usage chart ≠ context policy editor。**

分别是：

```text
Meter
→ 此刻还剩多少资源

Usage visualization
→ 资源过去如何被消耗

Policy control
→ 未来允许怎样编译和分配资源
```

这和 SE 的 Event / Matter / Compiled Context 分离是同一种治理方法。

---

## 4. Inspector Grammar 可以进一步冻结成真正的 `Property Projection`

Base UI 的 [NumberField](https://base-ui.com/react/components/number-field) 很值得直接作为 behavior donor。它已经把一个 numeric property 的输入拆成：

```text
typing
keyboard step
+/− step
wheel
scrub
commit
```

同一个值可以有多种 modality，而无需产生五个“控件”。

React Spectrum / React Aria 的 catalog 更进一步，已经覆盖 ActionBar、ComboBox、DateRange、Meter、RangeSlider、collections、selection 等完整语义。[React Spectrum component index](https://react-spectrum.adobe.com/llms.txt)

所以 Courtwork Inspector 可以正式约：

```text
PropertyRow
├── Label
├── Description? / Help?
├── Current value / inherited value
├── Control
├── Validation state
├── Modified indicator
├── Reset / revert
└── Provenance?       ← 对 SE 尤其有用
```

最后一个 `Provenance` 是普通设计系统通常不强调、但 Courtwork 值得自研的：

```text
Context budget      64k     [reset]
                     ↑
                Expert policy
```

或者：

```text
Approval threshold  .75
                   modified locally
```

这样 Inspector 不仅是 setting form，而是 **governed state editor**。

---

## 5. Approval 必须从一个组件升级为一整个 Grammar

这是补扫中最值得增加的一项。

Cloudflare Agents 已经区分 durable workflow approval、chat tool approval、client-side tool interaction、MCP elicitation，并有 multi-approver pattern。[Cloudflare HITL](https://github.com/cloudflare/agents/blob/main/docs/human-in-the-loop.md)

更严格的 governance 实践则会把 approval 绑定到 exact action、policy version、approver identity 和 expiry。由此 Courtwork 不宜只有：

```text
Cancel | Approve
```

而应建模为：

```text
ApprovalGate
├── requested action
├── affected object / diff
├── reason policy
├── risk
├── scope
├── requester
├── required reviewer(s)
├── expiry
├── decision
├── optional reason
└── receipt / provenance
```

UI 形态随后才推导：

| governance schema | control |
|---|---|
| user confirms自己的即时低风险操作 | Confirmation |
| agent 请求执行敏感 tool | Approval Gate |
| 需要指定专家 | Reviewer Picker |
| 任意一个成员可批准 | Reviewer Group + `1 required` |
| 多阶段审批 | Approval Chain |
| N 人中的 k 人 | Quorum Control |
| 只批准当前调用 | `Approve once` |
| 当前 run 内同类操作 | Scoped Approval |
| 限时授权 | Time-bound Permission |
| 条件式自动批准 | Threshold / Policy Rule |
| 需要补资料而非批准 | Elicitation |
| 修改授权规则本身 | Policy Editor + higher-order approval |

尤其要避免把：

```text
Approve once
Approve for this run
Allow for 1 hour
Always allow
```

画成四个普通 Button。

它们实际上是在编辑 **authorization scope**，应该把 scope 本身可视化。

---

## 6. Policy Editor 的成熟方向与你的 SE 模型高度吻合

[Tailscale Visual Policy Editor](https://tailscale.com/docs/features/visual-editor) 是目前这一轮最强的 reference 之一。其文档在 2026-03-13 仍有验证记录：

```text
Visual representation
        ↕
HuJSON canonical policy
```

而 GitOps mode 下 GUI 可以：

```text
search
filter
preview
```

却不能成为 source of truth。

这几乎可以原封不动转译成 Courtwork：

```text
Human control surface
        ↕
Canonical governed representation
        ↓
validation / tests / version / provenance
```

甚至 policy 的 test 也应该成为一等 UI：

```text
Context policy
────────────────
3 rules changed

✓ legal matter keeps source documents
✓ private data cannot leave local provider
✕ approval required for external email

[View canonical]   [Review diff]
```

这比单独的 rule-builder component 更接近 SE。

---

## 7. 应增加 `Projection Grammar` 的另一理由：一个 run 天然有多种视图

LangSmith 现在直接将同一个 thread 分为：

```text
Messages → conversation reading
Turns    → structural overview
Details  → debugging
```

并允许从 message/tool call drill down 到对应 run。[LangSmith Trace Views](https://docs.langchain.com/langsmith/view-traces)

Braintrust 的另一套成熟实践则是：

```text
Spans     → hierarchy
Thread    → narrative
Timeline  → execution / token efficiency
```

这说明一个很重要的原则：

> **不要要求一种 UI projection 同时解释 agent 的全部事实。**

Courtwork 后续可以把同一个 Event Log 投影为：

```text
Conversation
Trace
Timeline
Matter changes
Usage
Review
```

它们不是六份数据，也不是六套 state，而是对同一治理底座的不同 projection。

这也是为什么我不建议把复杂 trace 全部塞进 message card。

---

## 8. Heatmap 的 canonical 用法也可以现在冻结

Heatmap 很容易沦为“Dashboard 感”装饰。

Agent GUI 中适合它的实际上只有二维离散/分箱问题：

| 数据 | 是否适合 heatmap |
|---|---|
| day × hour usage | 是 |
| model × day token/cost | 是 |
| expert × matter activity | 是 |
| tool × error category | 是 |
| latency distribution × time bucket | 是 |
| 单个 context % | 否 → Meter |
| 一个 model TPS | 否 → metric/sparkline |
| 多 model 当前 cost | 否 → Ranked Bar |
| 一个 run 的执行过程 | 否 → Timeline |
| task completion | 否 → Progress/List |

NVIDIA 用 TTFT / ITL heatmap 看请求分布随时间变化就是正确范例；这和“画一张漂亮热力图”是两回事。

因此你的首页首个 heatmap 可以更有含义，例如：

```text
Human Attention
Mon  ░ ░ ▒ ▓ ░
Tue  ░ ▒ █ ▓ ░
Wed  ░ ░ ▒ ░ ░
...
```

或者：

```text
Model activity
             M T W T F
Gemini       ░ ▓ █ ▒ ░
Claude       ░ ░ ▒ █ ▓
Local        ▓ ▒ ░ ░ ░
```

而不是抽象 Github-contribution-clone。

---

## 9. Waveform 的选型现在也可以更明确

这里可以做两档，而不是直接引入一套 DAW。

**L1：artifact playback**

用 [wavesurfer.js](https://wavesurfer.xyz/docs/) 很合适：

```text
Waveform
+ seek
+ playback
+ region
+ timeline
+ record
```

插件式加载，主包定位也就是 interactive waveform player。

**L2：temporal review/editor**

只有法律证据、interview、meeting review 真正需要：

```text
trim
annotation
multiple tracks
undo / redo
record
```

再使用 [waveform-playlist](https://github.com/naomiaro/waveform-playlist)。它现在已经把 `core / engine / browser / playout / recording / annotations` 拆开，因此恰好符合“不让 DAW runtime 混入 Core”的要求。

所以 temporal control 也能按能力渐进披露：

```text
audio chip
   ↓
waveform player
   ↓
annotated timeline
   ↓
editor
```

---

## 10. Contextual Toolbar 应治理的是 `Applicability`

[Tiptap BubbleMenu](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu) 提供 selection-driven positioning；Unity 的 [Contextual Tooling](https://www.foundations.unity.com/patterns/contextual-tooling) 则给出了更一般的原则：

> Aim for contextual, non-global solutions.

对 Courtwork 来说，这应当不是：

```text
toolbarVariant = "floating"
```

而是：

```text
Action
├── appliesTo
├── requiresSelection
├── requiresCapability
├── risk
├── frequency
└── preferredSurface
```

随后 placement 才可推导：

```text
global frequent command
→ fixed chrome

selected evidence
→ contextual toolbar

rare object command
→ context menu

discoverable global command
→ command palette

property of current object
→ inspector

governed irreversible action
→ approval surface
```

这会直接解决你前面提到的“同样是 tap / dropdown / 展开，但体例应严明而不必完全一样”的问题。

---

# 我会把 Control Specimen Board 定成 16 个，而不是原来的 10 个

| # | specimen | 真实 Courtwork semantic | 主要验证 |
|---:|---|---|---|
| 01 | Model Picker + Effort | Gemini Flash / reasoning | picker 与 segmented |
| 02 | Context Meter | compiled context 43/128k | meter + stacked disclosure |
| 03 | Live Generation Metric | 126 t/s · TTFT 1.1s | metric + sparkline |
| 04 | Composer Tools | web / attachment / source | toggle/action/menu hierarchy |
| 05 | Reference Token Field | evidence / matter / source | entity tokens |
| 06 | Numeric Inspector | context budget / retries | scrub + number + step |
| 07 | Threshold Inspector | confidence .75 | slider + exact input |
| 08 | Time Range | review 12:00–12:30 | compound temporal field |
| 09 | Tool Run | search / read / write | running → receipt |
| 10 | Plan + Queue | matter ingestion steps | task/progress semantics |
| 11 | Approval Gate | external email / deletion | risk + diff + decision |
| 12 | Approval Policy | reviewer / threshold / scope | governed control |
| 13 | Evidence Toolbar | cite / challenge / link | contextual applicability |
| 14 | Run Timeline | model/tool/subagent spans | temporal projection |
| 15 | Usage Visualization | model × day / tokens / cache | heatmap/ranked/meter |
| 16 | Temporal Artifact | interview evidence | waveform + transport |

这块 board 的目标也应改写成：

> **不是展示 Courtwork 有多少 component，而是验证同一套 semantic schema 能否稳定推导出恰当的 human projection 与 interaction。**

这比 `Button / Composer / Card` specimen 的覆盖力高一个层级。

### 技术选型可以先收敛为这组边界

```text
React Aria / React Spectrum
→ accessibility + interaction semantics donor

Base UI
→ pro-app direct manipulation donor
  尤其 NumberField / scrub

AI Elements
→ agent-state anatomy reference

assistant-ui
→ composer / model / thread runtime reference

AG-UI-like event vocabulary
→ execution / interrupt / tool-state reference
  不要求直接绑定协议

Tiptap / Floating UI
→ contextual surface mechanics

Tailscale
→ governed visual editor ↔ canonical representation

LangSmith / Braintrust
→ Projection Grammar

wavesurfer
→ lightweight temporal artifact

waveform-playlist
→ on-demand advanced temporal editing
```

**Courtwork 自己拥有的则应是 `semantic registry + projection/control selection rules + visual grammar`。** 不应让任何一个 donor library 反过来定义产品的信息架构。

这轮 explore 后，我认为 `CONTROL GRAMMAR` 已经不只是一个 Design 补丁，而很适合成为 **SE → Human Interface 的正式桥层**：

```text
governed machine state
        ↓
semantic contract
        ↓
projection / control grammar
        ↓
human-readable + human-operable surface
```

这也解释了“成熟工作软件的厚度”究竟从哪里来：并不主要来自阴影、blur、圆角或组件数量，而是**机器中的不同事实，在人类面前获得了恰如其分、可预测、可操作的形态**。

## T2 · userMessage · 89715ad4-c040-4957-a4f7-594de2c8e3cc

另外，早期 UI 已经经过 Polish，而后期引入的，由于 agent 在局部施工，可能出现龃龉，是否成熟实践以保证整个项目如出一手，语义、视觉体例一致？

## T2 · agentMessage · 89715ad4-c040-4957-a4f7-594de2c8e3cc

是。成熟实践的核心不是要求后来的施工者“模仿早期风格”，而是把已经 Polish 出来的东西升格为 **可执行的产品契约**。对 Courtwork 这种“一个总体产品、许多短上下文 agent 局部施工”的项目尤其适合。

我会把这一层称为 **UI Continuity Harness**：

```text
Design intent
     ↓
Semantic / Control Grammar
     ↓
Tokens + Components + Patterns
     ↓
Canonical Specimens / Reference Screens
     ↓
Static Conformance
     ↓
Visual Regression
     ↓
Independent UI Review
```

这样后来的 agent 并不是“看起来差不多就行”，而是必须沿既有体系施工。

### 1. 最先冻结的不是截图，而是 `Design Contract`

建议把目前已经逐渐形成的规范压成四类机器可消费 contract：

| Contract | 管什么 | 例子 |
|---|---|---|
| Semantic | 叫什么、意味着什么 | Matter / Run / Expert / Approval / Tool，不临时造同义词 |
| Control | 什么意图用什么 control | bounded approximate → Slider；approval ≠ confirmation |
| Visual | token / shape / density / typography | radius、line、surface、attention color |
| Placement | 什么东西出现在哪里 | property → Inspector；selection action → contextual toolbar |

也就是说，agent 不只是得到：

> “参考现有界面风格。”

而应该得到类似：

```text
Need a model selector?
→ use ModelPicker pattern
→ composer chrome surface
→ existing semantic vocabulary
→ compact control height
→ no new radius
→ no raw provider badge colors
→ specimen: CG-01
```

这恰好是成熟 Design System 从“guideline”变成“contract”的方向。

Atlassian 已经把这做到了很机械的程度：要求代码使用语义 token，并提供 ESLint、Stylelint 和 codemod，甚至会检测 deprecated token 和不安全 token 使用，而不是依赖工程师记住规范。[Atlassian token tooling](https://atlassian.design/foundations/tokens/use-tokens-in-code)

---

### 2. 对 Agent 施工尤其重要的是 `nearest canonical precedent`

传统文档让 agent 读 1000 行 Design Guide 效果并不好。

更有效的是每次局部施工自动给它：

```text
你现在修改：Inspector / Provider

Relevant precedents:
1. Settings / Runtime Inspector
2. Existing Model Picker
3. PropertyRow specimen
4. Compact popover specimen

Relevant rules:
- CG.selection.enum
- CG.property.entity
- VG.surface.secondary
- copy.provider
```

即：

> **不是让 agent 回忆整个 Design System，而是动态披露与当前施工最邻近的先例。**

Figma 现在的 Code Connect + MCP 已经明确沿这个方向做：把真正的生产组件路径、props mapping、实际代码示例以及组件级 instruction 直接提供给 AI coding agent，而非只给它 Figma 像素。官方甚至明确把这描述为使 agent 生成代码时遵循实际 component library 和 design patterns。 [Figma Code Connect + MCP](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/)

Courtwork 不一定需要 Figma，本地完全可以做一个更轻的同类机制。

---

### 3. 把已经 Polish 的早期 UI 变成 `golden fixtures`

你们现在已经做过四视口、多状态、200% zoom 等，这些其实非常适合升格成 continuity infrastructure。

不要只有：

```text
screenshots/
```

而应明确分：

```text
design/
├── specimens/          # 单个 grammar / component
├── canonical-scenes/   # 典型真实组合场景
├── fixtures/           # 固定数据
└── goldens/            # 已批准视觉输出
```

例如：

```text
Canonical scenes

C01 Long conversation
C02 Tool running
C03 Approval waiting
C04 Inspector dense
C05 Narrow chat
C06 Artifact review
C07 Provider picker
C08 Human attention state
```

以后哪怕 agent 只改 Provider Picker，CI 也至少重跑：

```text
Provider specimen
Composer
Settings inspector
Narrow viewport
one canonical full-app scene
```

这样局部改动如果悄悄改变了 line-height、popover shadow、圆角、密度、hover 或 stacking，就会立即暴露。

Storybook/Chromatic 的成熟方法正是把每个 story/state 变成 baseline，PR 中检测像素变化，并允许将视觉检查设为 required check。[Storybook visual testing](https://storybook.js.org/docs/writing-tests/visual-testing)

---

### 4. 但不要把所有旧截图永久像素冻结

这里需要区分三种稳定级别：

```text
LEVEL A — Canonical invariant
几乎不得自行变化
tokens / typography / control anatomy /
focus / radius grammar / chrome density

LEVEL B — Pattern invariant
结构、语义保持一致
Inspector / Toolbar / Approval / Composer

LEVEL C — Product composition
允许演进
页面具体布局、信息组合、局部视觉表达
```

否则 visual regression 会把一次偶然的早期设计也永久固化。

所以：

> **Golden screenshot 是回归探测器，不是设计真理。**

视觉 diff 检测“发生了变化”；是否接受变化仍然应由 design owner 决定。

---

### 5. 最重要的一条：施工 agent 不应有权自行更新 baseline

这是 agentic workflow 中应该额外增加的治理。

错误路径：

```text
Agent changes UI
→ screenshot test fails
→ agent updates screenshots
→ tests green
```

这等于没有测试。

应该是：

```text
Builder Agent
     ↓
code + screenshots + visual diff
     ↓
Design Reviewer
     ↓
intentional?
 ┌───┴───┐
no      yes
↓         ↓
fix     approve new baseline
```

也就是 **baseline mutation 是 governed action**。

甚至可以要求：

```text
ordinary UI PR
→ builder cannot touch /goldens

intentional visual redesign
→ explicit VISUAL_CHANGE annotation
→ independent reviewer
→ baseline update
```

这与 SE 本身的 provenance / governance 思路完全一致。

---

### 6. 静态 lint 可以消灭大量“局部 agent 味”

可以非常务实地禁止：

```text
raw hex
raw shadow
unapproved radius
random z-index
random transition duration
arbitrary font-size
new button height
direct <select>
direct <input type=number>
unregistered icon
new local tooltip implementation
one-off modal shell
```

例如：

```text
✗ border-radius: 11px
✓ var(--radius-control)

✗ color: #72767d
✓ var(--text-secondary)

✗ <button className="...">
✓ <Button variant="quiet">

✗ local ModelDropdown
✓ <ModelPicker>
```

Atlassian 的 ESLint plugin 已经证明了这条路线可以做到非常细，包括 typography、space、shape、motion 等 token enforcement。[Atlassian Design System ESLint](https://www.npmjs.com/package/@atlaskit/eslint-plugin-design-system)

Courtwork 未必马上写完整 ESLint plugin，第一版 grep/AST check 已经足够有效。

---

### 7. 语义一致性也应该拥有自己的 lint

这一块比视觉更容易被局部 agent 破坏。

例如后续分别出现：

```text
Agent
Assistant
Runtime
Worker
Expert
Automation
```

实际上指同一或相邻概念。

建议正式有：

```text
ui-lexicon.yaml

matter:
  preferred: Matter
  forbidden: [Project, Case]   # 特定语义下

run:
  preferred: Run
  distinguish_from: [Thread, Session]

approval:
  preferred: Approval
  distinguish_from:
    - Confirmation
    - Consent
    - Elicitation
```

并为重要组件带上：

```text
semantic_id: approval.request
preferred_copy:
  title: "Approval required"
  positive: "Approve"
  negative: "Decline"
```

不是要求文案全部一样，而是防止 ontology 漂移。

对于 Courtwork，这可能比颜色 token 还重要。

---

### 8. 新 pattern 不应该直接从业务 PR 进入正式 vocabulary

成熟设计系统常见的 lifecycle 也很适合 agent：

```text
local experiment
       ↓
specimen
       ↓
experimental pattern
       ↓
real product adoption
       ↓
canonical
```

例如后续某个 agent 为 Provider 写了一个很漂亮的新“能力选择器”。

不要：

```text
Provider page needs it
→ invent control
→ ship
```

而是：

```text
发现 grammar gap
→ specimen board 增加候选
→ 对比现有 grammar
→ 裁定：
   existing pattern
   / new variant
   / genuinely new control
→ 才进入产品
```

这样组件体系不会随着 agent 数量增加而线性膨胀。

---

## 对现在的 Courtwork，我建议最终形成一个很轻的六件套

```text
design/
├── grammar/
│   ├── semantics.yaml
│   ├── controls.yaml
│   └── placement.yaml
│
├── tokens/
│   └── canonical.css
│
├── specimens/
│   └── control-specimen-board
│
├── scenes/
│   └── canonical real Courtwork fixtures
│
├── goldens/
│   └── approved screenshots
│
└── exceptions.yaml
```

CI：

```text
UI CONTINUITY GATE

1. semantic lint
2. token/style lint
3. component-use lint
4. interaction/a11y tests
5. specimen visual regression
6. affected canonical-scene regression
```

PR 再自动输出：

```text
UI DIFF

Affected grammar:
  CG.Value.Number
  Inspector.PropertyRow

New tokens:        0
New primitives:    0
Raw values:        0
New UI terms:      1 ← REVIEW
Visual changes:    3

1440 Inspector       changed
1280 Inspector       unchanged
390 Settings         changed
```

这时 reviewer 已经不需要重新“从头看一眼整个界面有没有品味”。

### 最适合你们的组织模型

不是大型公司的 federated Design System，而是更简单的：

```text
              DESIGN OWNER
                   │
        owns grammar / baseline
                   │
          ┌────────┴────────┐
          ↓                 ↓
     Agent A             Agent B
   Provider UI          Attention UI
          │                 │
          └────────┬────────┘
                   ↓
          UI Continuity Gate
                   ↓
        independent visual review
```

也就是：

> **centralized taste, decentralized construction.**

agent 可以越来越多，施工可以越来越局部，但“什么算 Courtwork”只有一个中心定义。

这样早期 Polish 不会变成一批只能供后人凭感觉临摹的遗产；它会逐渐被提炼成 **grammar、token、specimen、golden scene 和 executable gate**。到那一步，“如出一手”就不再主要依赖某个 agent 是否有审美，而成为仓库本身的属性。

## T3 · userMessage · dd654a24-5c94-4707-9f7f-74036e23a516

亦可以参考

[User attached 1 image; image contents were not included]

## T3 · agentMessage · dd654a24-5c94-4707-9f7f-74036e23a516

可以，而且这一例比单纯“组件库可参考”更有价值：**Appica UI 恰好在尝试解决我们上一轮说的“后来的 coding agent 如何继续写得像同一个人”这个问题。**

我复核了它目前的文档。截图里还是“60+”，现在官网已经写成 **70+ components**；真正值得 Courtwork 消费的是它背后的 agent-facing design-system 机制，而不只是这些组件长什么样。[Appica UI](https://appica.dev/ui)

### Appica 最值得直接借鉴的是这条链

```text
Design system implementation
        ↓
versioned agent rules
        ↓
AGENTS.md always-on constraints
        ↓
llms.txt discovery index
        ↓
per-component Markdown on demand
        ↓
actual typed component API
```

它专门有一页 [Set up your coding agent](https://appica.dev/ui/docs/react/agents)，而且明确针对 Claude Code、Cursor、Codex 等施工 agent。几个设计非常好。

**第一，规则跟 package 一起版本化。** 它在 `node_modules/@appica/ui-react/` 里直接带 `agent-rules.md`，官网的规则和 `llms.txt` 又从这一份生成。于是：

```text
library v1
→ rules v1

library v2
→ rules v2
```

不会出现“组件已经升级，而 AGENTS.md 还是半年以前的认知”。

这对 Courtwork 很值得拿走。我们前面提出的：

```text
Semantic Grammar
Control Grammar
Visual Grammar
Placement Grammar
```

其中**机器执行部分应该有一份 version-bound agent contract**，而不是只有长篇 Design 文档。

---

Appica 的第二个巧思更契合你目前的工作方法：**拒绝把整个设计系统塞进 context。**

它明确没有提供巨大的 `llms-full.txt`，理由就是约 92 页文档会占满 coding agent context。相反：

```text
AGENTS.md
→ 知道基本规则

llms.txt
→ 知道什么存在

需要 Slider
→ 才读取 slider.md

需要 Dialog
→ 才读取 dialog.md
```

这实际上就是 Design System 自身的 **progressive disclosure**。

Courtwork 可以完全仿照，但进一步做得更 SE：

```text
design/index.md

CONTROL
├── number-field.md
├── segmented.md
├── approval.md
└── ...

PATTERN
├── inspector.md
├── contextual-toolbar.md
├── tool-run.md
└── ...

SCENE
├── long-session.md
├── approval-waiting.md
└── ...
```

施工 agent：

```text
先读 contract
→ 查询 index
→ 只加载相关 grammar + precedent + specimen
→ 施工
```

而不是一次给它几十页 UI guideline。

---

### 第三个尤其值得直接进入 Courtwork lint

Appica 给 coding agent 的规则里已经明确写了：

```text
Never write hex colors
Never write px radii
Never write duration literals

Never use hue-based colors:
bg-gray-100
text-slate-600

Use role-based semantics:
bg-background-muted
text-foreground-intense
border-border-strong
```

这正好验证我们上一轮说的：

> **不能要求 agent “有品味”；应该让不符合品味体系的代码难以写进去。**

而且它不是只治理颜色。[Theming](https://appica.dev/ui/docs/react/theming) 已覆盖：

```text
color
radius
typography
shadow
border
disabled opacity
```

因此 Courtwork 可以把当前已经实测、裁定出来的视觉语言进一步变成：

```text
✗ #8b8d91
✓ --text-secondary

✗ border-radius: 9px
✓ --radius-control

✗ transition: 170ms ease
✓ --motion-control

✗ box-shadow: ...
✓ --surface-floating-shadow
```

这比告诉 Sonnet“参照现有 UI”可靠得多。

---

### 第四个巧思是 `Do not hand-roll what exists`

Appica 明确把这一条写进 Agent Rule：

> Do not hand-roll a component that exists in the library. Check the component list first.

这看似普通，对多 agent 项目却非常关键。

Courtwork 应进一步区分：

```text
Before creating UI:

1. semantic registry 有无？
2. control grammar 有无？
3. canonical component 有无？
4. existing pattern 有无？
5. specimen candidate 有无？

全无
→ 才允许 local experimental primitive
```

否则几个月以后最容易出现：

```text
ProviderPicker
ModelDropdown
ModelSelect
RuntimeModelMenu
ModelChooser
```

五个局部 agent 各自造了一遍。

所以“不得 hand-roll”不仅应指组件代码，也应该覆盖 **UI ontology**。

---

### 第五，它和我们上一轮的 donor 分层也高度吻合

Appica 自己并没有重新发明所有 interaction primitives，它建立在 **Base UI** 上；accessibility 文档也明确把 keyboard、focus、ARIA 等底层行为交给 Base UI，然后 Appica 自己持有 styling/theme convention。[Accessibility](https://appica.dev/ui/docs/react/accessibility)

即：

```text
Base UI
→ behavioral primitive

Appica
→ visual/component grammar

consumer
→ product composition
```

映射到 Courtwork 正好是：

```text
React Aria / Base UI
→ behavior donor

Courtwork Control Grammar
→ semantic choice

Courtwork Components
→ product anatomy

Courtwork Visual Grammar
→ identity

Matter / Agent surfaces
→ composition
```

所以 Appica 进一步证明：**behavior donor 与 visual owner 应该解耦。**

---

## 但我不建议当前直接把 Appica 作为 Courtwork 的基础依赖

它当前要求：

```text
React >= 19
Tailwind >= 4
```

并且整个 packaging/theming 路线就是围绕这套栈构建的。[Installation](https://appica.dev/ui/docs/react/installation)

Courtwork 目前还没有到应该为了一个组件库反向冻结正式 GUI runtime 的节点。

所以现在的消费等级应该是：

| Appica 部分 | Courtwork 处理 |
|---|---|
| visual appearance | **参考** |
| individual controls | **specimen donor** |
| Base UI usage | **重点参考** |
| semantic role tokens | **重点消费** |
| agent-rules.md | **几乎直接消费理念** |
| llms.txt progressive docs | **几乎直接消费结构** |
| package dependency | **暂缓** |
| React/Tailwind architecture | **不由它反向决定** |

---

## 它让我想修改上一轮的六件套：再增加一个 `agent interface`

此前：

```text
design/
├── grammar/
├── tokens/
├── specimens/
├── scenes/
├── goldens/
└── exceptions.yaml
```

现在更完整的是：

```text
design/
├── grammar/
├── tokens/
├── components/
├── specimens/
├── scenes/
├── goldens/
├── exceptions.yaml
│
├── AGENT-RULES.md
└── index.md
```

其中：

```text
AGENT-RULES.md
= 小、稳定、每次施工必读

index.md
= 全量能力目录，不加载正文

grammar/*.md
components/*.md
specimens/*
= 按当前任务渐进披露
```

甚至可以把每个 component/pattern 条目规范成：

```yaml
id: inspector.property.number
status: canonical

intent:
  exact_numeric_property

use:
  NumberField

behavior_donor:
  Base UI

tokens:
  - control.height.compact
  - radius.control
  - text.secondary

precedents:
  - specimen/CG-06
  - scene/runtime-inspector

do_not:
  - raw input[type=number]
  - local +/- buttons
  - arbitrary radius
```

这就已经不仅是给人看的 Design System，而是一个真正的 **agent-consumable UI schema**。

所以这张 Appica 图很值得收进索引，尤其应该标成：

> **Reference: agent-facing design-system distribution / continuity governance**

而不是简单归档在“可用 React UI 库”。它解决的是我们刚才问题中很关键的一半：**如何让一个短上下文、第一次进入项目的 coding agent，迅速获得正确的局部施工先验，而不依赖它自己从整个 repo 猜出品味。**
