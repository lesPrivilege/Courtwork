# UI生态调研摘要 · 完整转录

来源会话 6aa37f46-e5a8-83ec-a010-55528ecd74ba


## userMessage · 436a182c-0e30-4d5f-a7cc-d951056b9e40

https://great-ui.com/ 此类想必不少。

 @Exa


## agentMessage · b954c993-2ad0-4edc-b3f2-1167e8146015

我用 Exa 扫了 **52 个结果、3 条 workstream**。结论是：**Great UI 只是其中一个分支，而且现在真正值得建档的已经不是“UI library 列表”，而是一整套 UI prior-art / registry 生态。**

[Great UI](https://great-ui.com/) 本身的定位很清楚：React + Tailwind、开源、可复制源码，当前展示约 40 个 production-ready 元素，重点是视觉完成度和 motion。对 Courtwork 来说，它更适合作为 **specimen source**，而不是基础 design system。

| 层 | 高信号来源 | 对 CW 最有价值的东西 |
|---|---|---|
| **功能性 motion / control** | [Fluid Functionalism](https://www.fluidfunctionalism.com/) | 非常命中。“motion is information”，proximity hover、spring interruption、surface elevation；可以直接进入 Control Grammar |
|  | [beUI](https://beui.dev/) | morphing modal、action swap、expandable action bar、tabs、toast stack、command palette；大量成熟微交互 |
|  | [Motiq](https://motiq.dev/) | 不只 component，而是 workflow surface；agent runs / streaming / multiplayer / data motion |
|  | FLUX UI | 把 motion 明确做成 **grammar + named physics presets**，比逐组件随意调 duration 更值得借 |
| **AI / Agent UI** | [assistant-ui Elements](https://www.assistant-ui.com/elements) | 目前最应该继续吃的一支：122 个 assistant state，tool timeline、approval、handoff、background runs、cost meter、context breakdown、composer 等 |
|  | [BehaviorAI](https://www.behaviorai.eu/) | 从真实 AI 产品抽象 `Model Selection / Confidence / Suggested Prompts / Citations / Structured Output`，非常适合做语义 prior art |
| **真实桌面产品 prior art** | [Interface Index](https://interface-index.com/) | 很适合 CW。专门收 B2B / SaaS / desktop 的细粒度 element，而不是营销页 |
|  | [Page Flows](https://pageflows.com/) | element 位于**真实完整 flow**里；适合研究 dropdown、upload、modal、table、sidebar 等到底怎样工作 |
|  | [SaaSBoat](https://saasboat.com/) | screenshots + flow + heuristic audit + microinteraction，比纯截图站多一层“为什么” |
|  | [Mobbin](https://mobbin.com/) | 大规模 baseline，适合查惯例，不适合作为单一审美来源 |
| **Agent-readable Design System** | [VLLNT UI](https://ui.vllnt.com/) | **313 components + JSON descriptor + llms.txt + MCP**；已经把 UI library 当成 coding-agent 可消费知识库 |
|  | [Hex Core](https://github.com/oscarabcorona/hex-core) | 更值得研究架构：`whenToUse / whenNotToUse / commonMistakes / accessibilityNotes / token budget / recipe / resolve_spec` |
|  | [shadcn Registry / MCP](https://ui.shadcn.com/docs/mcp) | 已经形成事实上的 distribution protocol：registry、namespace、MCP、agent discovery |
| **视觉 specimen / 发布面** | [Aceternity UI](https://ui.aceternity.com/) | landing / hero / background / animated block 很丰富 |
|  | Great UI | 较克制，可挑微动效、文本和小组件 |
|  | Velora / Senko / Kokonut 等 | 可扩展视觉候选池，但不宜整套引入 |

其中有两个新发现，我认为比 Great UI 本身更值得记一笔。

**第一是 Hex Core。** 它不是简单给 agent 一份组件源码，而是在组件旁边定义：

```text
whenToUse
whenNotToUse
commonMistakes
accessibilityNotes
token intents
recipes
post-install checklist
```

这基本就是我们此前谈的“**coding agent 后期施工如何仍然像同一个项目**”的一个外部实现方向。Courtwork 将来自己的 Design index 完全可以采用类似 schema，而不必让 agent 每次凭视觉感觉选组件。

**第二是 VLLNT / beUI / shadcn 这一条线已经收敛出了 distribution stack：**

```text
human visual docs
        +
registry.json / item.json
        +
llms.txt / DESIGN.md
        +
MCP
        +
agent skill / conventions
```

这说明前面 Courtwork 在做的 **Design precedent → agent rule → implementation → review gate** 并不是孤立想法；现在外部 ecosystem 正明显朝这个方向收敛。

### 因而我建议 CW 不再建一个“Great UI alternatives.md”

应该升级成类似：

```text
UI Prior Art Index
├── primitives
├── controls
├── compound controls
├── interaction / motion
├── app shell / navigation
├── workflow surfaces
├── AI / agent states
├── review / HITL
├── visualization
├── marketing / Pages
└── agent-readable registries
```

每个候选记录：

```text
semantic slot
source
real-product / specimen / implementation
visual precedent
interaction precedent
states
motion grammar
a11y
source ownership
dependencies
license
registry / MCP / llms support
CW token compatibility
CW target surface
adopt / adapt / reference-only
```

这样 **Great UI、beUI、Fluid Functionalism 不会变成三个互相争夺视觉风格的库**；它们只是针对某个 `semantic slot` 提供 specimen。最后仍由 CW 自己的 token、control grammar、motion grammar 和 review gate 熔炼成一套基因。

就目前这一轮，我会把优先级定成：

**P0 消费：`assistant-ui Elements → Fluid Functionalism → Interface Index → BehaviorAI → beUI`。**  
**P1 架构研究：`Hex Core → VLLNT → shadcn Registry/MCP`。**  
**P2 视觉候选池：`Great UI → Aceternity → Motiq → 其余 motion-heavy libraries`。**

这比继续逐个发现 UI 网站再临时丢给施工 agent，要稳定得多，也恰好可以成为前面 **Control Grammar / UI Continuity** 的上游索引层。


## userMessage · d527b648-dae0-4a34-9cd9-d624344d82bd

关于色彩层级，哪些用浅色哪些用深色，衬线、blur、fover、glass 等等亦要严明体例@@Exa


## agentMessage · cd3923ef-4cad-4161-8848-82893e8d9aee

是。用 Exa 继续按 **色彩层级 / 材质 / typography / interaction state** 四条线过了约 **48 个结果**，这应该独立成一层 **Visual Grammar**，而不是散落在各组件的 CSS 里。

最重要的外部共识是：

> **浅/深、透明/实体、serif/sans、blur/glass、shadow、hover 都必须表达某种语义变化；不能只是“这个地方这样更漂亮”。**

这与我们之前的 Control Grammar 正好上下咬合。

### 我建议 Courtwork 最终形成五条严格 grammar

| Grammar | CW 应回答的问题 | 外部成熟依据 |
|---|---|---|
| **Surface Grammar** | 哪些区域浅、哪些深，谁在谁上面 | [Carbon layering](https://carbondesignsystem.com/elements/color/usage/)、[Atlassian Elevation](https://atlassian.design/foundations/elevation) |
| **Color Grammar** | neutral / accent / semantic color 分别能表达什么 | [Material 3 color roles](https://m3.material.io/styles/color/roles)、[Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) |
| **Material Grammar** | solid / blur / glass / scrim 分别出现在哪里 | [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials)、[Fluent Material](https://fluent2.microsoft.design/material) |
| **Type Grammar** | sans / mono / serif，以及 productive / expressive 的边界 | [Carbon Typography](https://preview.carbondesignsystem.com/building-blocks/foundations/typography/style-strategies) |
| **State Grammar** | hover / active / selected / focus 如何改变表面 | Material、Carbon、Atlassian 都已有完整 state model |

其中 **Surface Grammar 是骨架**。

我会给 CW 定成近似：

```text
surface.canvas
    ↓
surface.sunken
    ↓
surface.content
    ↓
surface.raised
    ↓
surface.overlay
    ↓
surface.inverse
```

但注意这不是“颜色越来越黑”。

在 **light mode** 中，可以明确规定：

```text
最清洁 / 最亮
    → 当前主要阅读、编辑、conversation / document workspace

略带灰 / tinted neutral
    → sidebar、secondary chrome、inactive region

更明显 neutral
    → grouped well、sunken region、secondary controls

高反差深色
    → inverse moment / 极少数强调 surface
```

Fluent 明确提出：**更浅的 neutral surface 用来吸引 primary focus**。Carbon 甚至直接给出“light content + dark shell/right panel”的 inline theme 例子，但强调这种深浅翻转只能用于 **major high-contrast moment**，不能拿来做普通分区。

所以对于 Courtwork，我会禁止这种施工习惯：

```text
“这里是一个新的 card”
→ 随便把背景加深一点
```

应该变成：

```text
它在空间层级上是否真的升高？
它是否是独立工作区？
它是否覆盖原内容？
它是否需要从父 surface 中凹下去？
```

答不出来，就**不得产生新的 surface color**。

---

### Dark mode 更不能是 light mode 反色

这是 Carbon、Atlassian、Material 的共同经验。

尤其 Atlassian 很明确：dark theme 中 shadow 不够可见，因此：

> **越高的 surface，反而越亮。**

也就是：

```text
dark canvas
   < default
   < raised
   < overlay
```

这是“被前方光源照亮”的空间模型。

因此以后 CW 如果做 dark：

**不要**：

```text
light:
white → gray → darker

dark:
black → darker → darkest
```

而应该保持**同一个 semantic depth model**，只改变 token mapping。

---

## Blur / Glass 应该尤其严格

这里 Apple 2026 的指导非常有用。

Apple 对 Liquid Glass 已经直接下了语义定义：

> Glass 是 **functional layer for controls and navigation**，不是 content styling。

并且明确说：

> **Don’t use Liquid Glass in the content layer.**

这对 CW 极其合适。

我会把材质限定成：

| Material | CW 允许使用 | 禁止 |
|---|---|---|
| `solid` | conversation、document、settings、cards、tables、forms | — |
| `subtle-translucent` | shell / title chrome 的极轻层次 | 不用于正文 |
| `blur / acrylic` | popover、floating menu、command palette、temporary inspector | 普通 card |
| `glass` | 浮于内容之上的 navigation / transient control | message、tool card、document body |
| `scrim / smoke` | modal / blocking approval | 非阻断 UI |

[Fluent](https://fluent2.microsoft.design/material) 几乎给出了同样分类：

**Solid** 是默认；**Acrylic** 只适合 transient、light-dismiss 的 menu/popover；**Mica** 是长期 window backdrop；**Smoke** 专门表达 modal 阻断。

这意味着 **blur 的有无甚至可以反映 lifetime**：

```text
persistent content     → solid
persistent shell       → solid / restrained material
temporary contextual UI → blur/acrylic
blocking overlay       → solid overlay + scrim
```

这比“某张卡需要高级感，所以 backdrop-filter: blur(16px)”严谨得多。

而且可以直接写成硬禁令：

> **No glass-on-glass.**

Apple 和 Microsoft 都警告叠加半透明材质会破坏 hierarchy / 产生 visual noise。

---

## Serif 也应该变成语义，而不是字体装饰

Carbon 有一个非常好的二分法：

**Productive**：人在做事。  
**Expressive**：人在读、探索、停下来。

Productive 用于：

```text
controls
forms
settings
tables
toolbars
navigation
workflow
dense information
```

Expressive 用于：

```text
editorial
long-form reading
landing / introduction
large uncontained moments
```

Carbon 甚至明确说 expressive typography 放进 dense product UI 会 distracting。

因此 CW 可以比普通设计系统再推进一步，把字体本身作为**voice**：

```text
UI voice
→ sans

machine / technical voice
→ mono

document / authored voice
→ serif（可选，而且必须限定）
```

这其实很适合 Courtwork。

例如未来 Contract / Expert 输出：

```text
App chrome             sans
Attention              sans
Tool trace             sans + mono
Code / IDs / metrics   mono
Document preview       可以允许 serif
Quoted legal material  可以允许 document serif
Marketing Pages        可大量使用 expressive / serif
```

但 **serif 不应进入 Button、Tab、Sidebar、Setting、Status、Tool Call、Composer**。

这样 serif 一出现，用户会自然理解：

> “我从操作软件，进入了阅读一个 document / authored artifact。”

这就不是装饰，而是模式切换。

---

## Hover 也不能让 agent 自己“加点感觉”

[Radix Colors](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) 的 12 级系统特别适合作为我们的底层参考：

```text
1–2   backgrounds
3     UI rest
4     hover
5     active / selected
6     subtle border
7     interactive border
8     hover / focus border
9     solid accent
10    solid accent hover
11    secondary text
12    primary text
```

Carbon 更进一步，**hover token 只能用于 hover**，甚至不会把其 palette 中间值开放给其他用途。

因此 CW 应该禁止：

```css
:hover {
  background: 随便挑个灰;
  transform: translateY(-1px);
  box-shadow: ...;
  border-color: ...;
}
```

一个普通 row hover 很可能只需要：

```text
surface.rest
      ↓
surface.hover
```

而不是同时：

```text
变亮
+ 浮起
+ shadow
+ border
+ scale
```

真正可以发生 elevation transition 的，应只有 card / draggable / floating control 等**空间语义本来就在变化**的对象。

Atlassian 甚至明确要求：

> 用 surface state change 或 elevation transition **二选一**，不要两个都用。

这个规则很值得直接吸收。

---

### 因而前面的 UI Prior Art Index 还要再补一层

不是：

```text
component
→ visual precedent
```

而应变成：

```text
Visual Grammar
│
├── Surface
│   ├── canvas
│   ├── sunken
│   ├── content
│   ├── raised
│   ├── overlay
│   └── inverse
│
├── Material
│   ├── solid
│   ├── translucent
│   ├── blur
│   ├── glass
│   └── scrim
│
├── Type
│   ├── productive
│   ├── expressive
│   ├── document
│   └── technical
│
├── Color
│   ├── neutral
│   ├── accent
│   ├── semantic
│   └── inverse
│
└── State
    ├── rest
    ├── hover
    ├── focus
    ├── active
    ├── selected
    ├── dragged
    └── disabled
```

然后任何组件只能从这些合法组合里取值。

例如：

```text
Popover
surface = overlay
material = blur
type = productive
state = overlay-state-set
```

而：

```text
Contract document
surface = content
material = solid
type = document
state = none
```

`Attention row`：

```text
surface = default
material = solid
type = productive
hover = surface.hover only
selected = surface.selected + indicator
```

这样以后无论 Sonnet、Codex、Opus 还是其他施工 agent，**它们没有“这儿加个 glass 看起来不错”的自由度**；只能选择已经获准的语义组合。

我认为这一层应该和之前的 **Control Grammar + Iconography Governance + Motion Grammar** 并列，最终形成 Courtwork 的 **Visual Constitution**。组件库只是它的下游实现材料，而不是设计权威。
