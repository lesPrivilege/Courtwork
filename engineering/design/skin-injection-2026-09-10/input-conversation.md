# 泛化陌生化设计 · 输入转录

转录仅规范化行尾空白与末尾换行；消息正文不删节。

来源 conversation `6aa19417-4ad8-83ec-9c3d-b4b0effcb6fa`，2026-09-10 读取全部7 turns，hasMore=false。下文是研究输入，不是现行合同；原助手的网页引用、像素取值和数量主张未经本文件背书。三份图片附件未作为本单取色证据。原citation标记保留其来源形态，不当作可恢复引用。

## T1 · userMessage · be47255c-66ac-4ee3-898a-f6a313ed0385

这版取色十分舒朗，能否泛化为 Design 中的陌生化体例？我想，红色只在很少的需要人类 attention 的地方引用

[User attached 1 image; image contents were not included]

## T1 · agentMessage · be47255c-66ac-4ee3-898a-f6a313ed0385

可以，而且我会把它泛化成一种**视觉语法，而不是一套配色主题**。这版真正有价值的不是「红 + 灰」，而是它建立了一个很强的秩序：**绝大多数界面主动退色，只有极少数对象获得色彩权利。** 这本身就足以构成一种稳定的陌生化来源。

可以把它暂时称为 **Dystopia Grammar**：

- **Neutral field 是常态**：白、冷灰、中灰、炭灰、近黑承担 90% 以上 UI。层级主要依赖明度、线重、留白、模糊、材质、排印和空间，而不是不同 hue。
- **Red = Human Attention，不等于 Error**：红色不是品牌装饰色，也不是普通 primary color；它意味着「这里值得人类从自动运行中抬头」。例如需要确认的裁决、冲突、阻塞、风险、待 review 的变更、不可逆动作前的最后状态。
- **红色必须具有稀缺性**：一个正常 viewport 最好是 `0` 个红色对象；出现 `1` 个已经构成视觉事件。若屏幕同时有五六处红色，语义体系基本已经失效。
- **交互本身仍然无彩色**：普通 Send、New、Open、Selected、Hover、Focus 都不应因为“可点”而变红。否则红色会退化成传统 accent color。
- **Attention 也不要全部铺满红底**：可以形成强度梯度：红色微点/细竖线 → 红色文字或 icon → 淡红 tint → 实心红。最后一级只给真正强制的人类介入或危险动作。
- **绿色也尽量克制**：完成、成功通常回归 neutral，而不是满界面的红绿交通灯。真正需要表达 pass/fail 时才临时使用状态色；“没有事情发生”应当在视觉上安静。
- **陌生化来自反传统 SaaS 习惯**：传统产品用品牌色告诉用户「哪里能点」；这套体例用无彩色告诉用户「系统在正常工作」，只有异常的人机关系才获得颜色。

尤其适合 Agent / CourtWork 这一类产品。因为它可以直接把**机器的持续活动**与**人的稀缺 attention**映射到视觉层：Agent trace、tool execution、message、retrieval、背景任务等即使很复杂，也都留在灰阶；只有从机器自治跨越到 human loop 的边界时，颜色才出现。这样红色甚至不再只是 UI token，而成为产品架构语义的一部分。

我会进一步把 token 从传统的 `primary / secondary / destructive` 改成更严明的东西：

```text
surface.canvas
surface.raised
surface.sunken

ink.primary
ink.secondary
ink.muted

line.subtle
line.strong

attention.red
attention.red-muted
attention.red-surface
```

甚至**不要有 `brand.primary = red`**。这条很重要。品牌识别可以来自黑灰比例、字体、圆角、线条、blur、阴影、动画节奏和 icon，而不是让红色承担传统品牌色职责。

这也解释了为什么截图看起来「舒朗」：左侧红块不是和其他五块竞争，而是在一整套稳定灰阶中成为唯一的**色彩断裂**。陌生化不是添加更多奇异元素，而是人为撤走现代 GUI 已经习以为常的大量色彩信号，然后把唯一留下来的色彩重新赋予严格语义。

若迁移到 CW，我会把它作为比「某个组件长什么样」更上层的一条 Design constitution：

> **Color is an interruption. Neutral is the operating state. Red means human attention has entered the loop.**

这样以后无论 composer、review surface、diff、dashboard、tool card、dialog 还是 GitHub Pages，都可以从同一规则推演，而不是逐页重新“设计一套 Dystopia 风格”。

## T2 · userMessage · 1aefe24f-6830-4836-8cb6-538aadfb93ff

同意 explore，并约定规范 token，其他色宗的注入与此相同，除了确定性的颜色之外，skin 注入只接管关键 attention review@Exa

## T2 · agentMessage · 1aefe24f-6830-4836-8cb6-538aadfb93ff

可以。用 Exa 沿三个方向查了成熟 Design System：**token 分层、theme/brand 与确定性语义色的隔离、attention 与 error/status 的区分**。结论相当一致，而且正好支持把我们刚才的判断进一步收紧成一条可以施工和验收的规范：

> **Skin 不是 Theme。Skin 不接管产品配色，只获得一个受限的 `attention.review` 色槽。**
>
> Dystopia 只是该槽的一种红色实现；以后 Cobalt、Moss、Violet 等色宗都替换同一个槽，界面的灰阶、状态语义和交互逻辑不随之漂移。

这比传统的 `primary / accent / secondary` 换肤更适合 CW。

### 1. 外部实践支持这种“窄注入”

最直接的旁证是 [NYS Design System](https://designsystem.ny.gov/foundations/tokens/)：它明确把会随 agency theme 改变的 **theme tokens** 和不随 theme 改变的 **intent/semantic tokens** 分开；success、warning、danger、body text、focus 等保持确定，只有需要品牌表达的位置跟随 theme。它的 Color Tokens 文档甚至直接写明 intent colors “remain consistent regardless of agency theme”。

[Cognite Aura](https://docs.cognite.com/aura-design-system/foundations/customization) 更进一步：品牌定制应该 override **最小可能的 token 子集**，并明确建议不要改 success / warning / error / info，因为这些已经携带稳定意义与 accessibility contract。

而 [Salt Design System](https://www.saltdesignsystem.com/salt/themes/design-tokens/content-characteristic) 对我们尤其有用：它**专门设有 `attention`，并明确说 attention 不应借用 negative、warning 或 error**。也就是说：

```text
attention ≠ warning
attention ≠ error
attention ≠ destructive
```

这是我们需要的语义切口。Salt 目前把 attention 用于短标签/符号；CW 可以把它提升为 **Human Review / Human Attention 的产品级语义**。

[Primer](https://primer.style/product/getting-started/foundations/color-usage/) 和 [HPE](https://design-system.hpe.design/foundation/color) 则共同支持另外两条：组件只消费 semantic token；颜色应有 muted/emphasis 等强度，而不应为了“显眼”随意找一种 hue。HPE 还明确要求 status color 只表示 status。

所以不是自造一套审美理论，而是把成熟系统已有的 **semantic/theme separation** 再收紧一步。

---

## 2. 建议冻结三层，而不是“主题配色”

我会把 CourtWork 的颜色系统约定为：

```text
CORE / PRIMITIVE
        ↓
SEMANTIC CONTRACT
        ↓
COMPONENT / PATTERN
```

Skin 只从旁边注入一个非常窄的 primitive slot：

```text
                         ┌─ Dystopia / red
                         ├─ Cobalt / blue
SKIN ── attention.* ─────├─ Moss / green
                         ├─ Violet / purple
                         └─ ...
                │
                ▼
semantic.attention.review.*
```

而**绝不存在**：

```text
skin.primary
skin.button
skin.link
skin.selected
skin.focus
skin.success
skin.danger
skin.sidebar
skin.surface
```

这条禁止项比允许项重要。

### 固定层

以下都不受 skin 接管：

```text
surface.*
ink.*
line.*

interaction.focus.*
interaction.selected.*
interaction.hover.*

status.info.*
status.success.*
status.warning.*
status.danger.*

diff.added.*
diff.removed.*
diff.changed.*

provenance.*
```

其中哪些最终需要 hue、哪些继续灰阶，可以在各自工作项裁决；但一旦具有**确定性的产品语义**，就不能被 skin 改写。

例如删除 diff 是 red，不应该因为用户选择 Moss skin 就突然变绿；warning 也不能因为 Dystopia 是红色就改红。

---

## 3. Skin 唯一公开能力：`attention.review`

建议正式 token grammar 用**语义而非颜色名**：

```text
color.attention.review.indicator
color.attention.review.foreground
color.attention.review.border
color.attention.review.surface
color.attention.review.surface.strong
color.attention.review.on-strong
```

底下再映射：

```text
skin.attention.faint
skin.attention.weak
skin.attention.default
skin.attention.strong
skin.attention.stronger
```

组件永远不能直接消费 `skin.attention.*`：

```text
review-marker
    → color.attention.review.indicator
    → skin.attention.default
```

这样以后换任何色宗：

```text
Dystopia  ─┐
Cobalt    ─┤
Moss      ─┼→ attention.review.* → ReviewCard / Gate / Marker
Violet    ─┤
Ochre     ─┘
```

**换的是视觉材质，不换产品语义。**

---

## 4. Dystopia 可以作为 canonical skin

我顺手从你给的原图中心像素取了一下这组六色，当前参考值大约是：

```text
attention  #AE3630

neutral-0  #F4F5F6
neutral-1  #E0E4E7
neutral-2  #A6ACB0
neutral-3  #616466
neutral-4  #2A2C2C
```

这组有一个很好的性质：并不是“红黑主题”，而是 **5 个 neutral + 1 个 chromatic interruption**。

因此完全可以把体例抽象成：

```text
5 neutral strata
+
1 injected attention family
```

以后所谓 **Moss skin**，并不是把整个页面染成绿灰色，而仍然是这一整套 neutral field，只把那个 chromatic interruption 换为经校验的 moss ramp。

这会比常见的主题系统陌生得多，同时又极易治理。

---

## 5. `attention.review` 也应有准入条件

这是防止它以后逐渐沦为 `accent` 的关键。我建议 token 文档直接规定：

**只有当 UI 表达“机器希望人类现在审视、裁决或承担责任”时，才能消费 `attention.review.*`。**

因此：

| 场景 | attention |
|---|---|
| Agent 正在运行 | 否 |
| Tool call | 否 |
| 新 message | 否 |
| 当前 tab | 否 |
| Send button | 否 |
| hover / selected | 否 |
| 普通 notification | 否 |
| 已完成 | 否 |
| 系统 error | `status.danger`，不是 attention |
| 模型发现冲突但可自行处理 | 否 |
| 要求人类确认冲突处理 | **是** |
| Review queue 中待裁项 | **是** |
| 不可逆动作最终确认 | **是**，且可同时具 consequence 语义 |
| Evidence provenance 需要专家裁决 | **是** |

这会让“attention”成为真正的 **human-loop boundary token**。

甚至可以写一条 lint 思想：

```text
No human decision required
→ no attention token allowed.
```

---

## 6. 再增加一个“色彩预算”

仅有 token 限制还不够，因为开发者可能合法地到处调用 attention。可以给 Design Constitution 增加：

```text
attention.indicator     — 可以少量出现
attention.foreground    — 仅短文本 / icon
attention.surface       — 同一视区应极少
attention.surface.strong — 同一视区原则上最多一个
```

强 attention 不应用来表达“更漂亮的 CTA”。

这和 HPE/Primer 的 muted → emphasis 梯度相容，同时把稀缺性变成可验收的规则，而非设计师感觉。

最后还有一个 accessibility guardrail：W3C 的 [WCAG 1.4.1](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html) 明确要求不能只靠颜色传递信息。因此真正的 review attention 应至少再有一个非 hue channel：

```text
color + marker
color + icon
color + label
color + border/form
```

这反而很适合我们：**颜色负责“打断”，结构负责“说明为什么打断”。**

### 可以冻结为这一句

> **Chromatic Skin Contract — Neutral is structural; semantic color is deterministic; skin color is scarce. A skin may remap only `attention.review.*`, and no component may consume skin primitives directly.**

我认为这已经足够进入 Design token 的正式 index。尤其应把传统 `primary/accent` 的大范围换肤能力明确列为 **non-goal**：否则日后某个前端框架默认的 `primary` 一接进来，很容易把这一套体例重新污染成普通 SaaS theme。

## T3 · userMessage · 873bf5cc-74a8-4531-a806-35c1e2a5efd1

玻璃和 blur，可以克制消费，因为来自于灰阶，并有限提供其他颜色的克制 blur，是否 explore 选型？@exa

## T3 · agentMessage · 873bf5cc-74a8-4531-a806-35c1e2a5efd1

可以，而且**值得 explore**；但我会把它收敛成一套 **material grammar（材质语法）**，而不是把“玻璃感 / blur”当成可到处滥用的视觉效果。外部成熟实践的共识很明确：颜色与材质都应按**语义角色**使用，而不是按“看起来好看”来挑。SGDS 明确要求 semantic colour 先表达“这是什么角色”，再去映射具体颜色；NYSDS 也把 primitive / semantic / theme 分层，强调只有少数 theme token 应随主题变化，而 body text、status、focus 等确定性语义不应被任意皮肤接管【turn292923view0†L13-L18】【turn292923view0†L34-L41】【turn292923view1†L45-L58】【turn292923view1†L73-L85】。

就 blur / 玻璃本身而言，Fluent 2 给了一个很好的语义框架：**Solid** 是常态底座；**Acrylic** 是半透明磨砂玻璃，适合 transient、light-dismiss 的表层，如 popover、menu；**Mica** 是更克制、偏底层的材质；**Smoke** 则是让背景退后、突出阻断式表层的遮罩。这其实已经说明：blur 不应作为“风格糖”，而应服务于层级、浮起、阻断三种不同语义【turn316464view0†L15-L19】【turn316464view0†L33-L39】【turn316464view0†L44-L57】。

所以我同意你的方向，并建议把 CourtWork 里的这一路冻结成一句话：

> **玻璃与 blur 主要来自灰阶层次；其他颜色只允许以克制的 tint 注入，而且只接管关键 attention / review。**

这与我们前面“skin 只接管 `attention.review.*`”的思路是统一的。SGDS 其实也已经有很接近的材料：默认背景、surface、overlay、5%/10% translucent overlay 等，说明**半透明层本身就应该是一个被治理的语义层**，而不是某个组件临时写一串 `backdrop-filter + rgba()`【turn292923view0†L42-L45】【turn292923view0†L70-L85】。

---

## 我建议的选型框架

### A. 允许的材质层级
我建议只保留 4 类：

1. **Neutral Solid**
   常规页面、消息区、列表区、正文卡片。默认不用 blur。
2. **Neutral Glass / Soft Blur**
   轻浮起表层：popover、dropdown、composer chrome、悬浮工具条、side panel header。
3. **Neutral Smoke / Obscuring Overlay**
   modal、sheet、blocking review。让下层退后，而不是给上层染色。
4. **Chromatic Review Tint**
   仅限 human attention / review surfaces，且必须非常少。可以是 Dystopia red，也可以是其他色宗，但都只映射到 review attention 槽。这个部分是我的规范建议，建立在前述 token 分层与材质分层之上【turn316464view0†L33-L57】【turn292923view1†L112-L138】。

---

## 我建议直接立 token

### 1) Material tokens
```text
material.surface.base
material.surface.raised
material.surface.glass
material.surface.glass-strong
material.overlay.smoke
```

### 2) Blur strength tokens
```text
effect.blur.none
effect.blur.soft
effect.blur.regular
effect.blur.strong
```

先不暴露 px 值给业务层，组件只消费语义强度。这样和 design token 的成熟做法一致：组件消费语义，不消费 primitive【turn292923view1†L58-L72】。

### 3) Tint tokens
```text
color.attention.review.surface
color.attention.review.border
color.attention.review.indicator
color.attention.review.glass-tint
```

如果要接入其他“色宗”，只允许改最后这一簇，不许碰：
- text
- focus
- success / warning / danger
- selected
- default border
- default surface

这一点和 NYSDS / SGDS 的 theme-vs-semantic 分工是一致的：随 theme 变化的是有限主题槽，稳定语义仍然稳定【turn292923view1†L73-L85】【turn292923view1†L112-L138】。

---

## 具体落位建议

### 应当使用 neutral glass / blur 的位置
- chrome tab 顶部条
- composer 外壳或其浮起状态
- popover / command palette / menu
- inspector / preview 的悬浮工具条
- side panel 的局部 header 或 filter bar

### 应当使用 smoke 的位置
- dialog 背后遮罩
- blocking review
- ask-user / final-confirmation 之类不可逆动作前

### 只允许用 chromatic blur / tint 的位置
- 待人工裁定的 review card
- conflict / provenance dispute 的人工接管点
- 不可逆动作最终确认区
- high-attention inline marker（少量）

### 不建议使用 blur 的位置
- 大面积 message list
- 长文正文背景
- data table 主体
- diff 主区域底板
- 大块 dashboard cards 默认态

否则会把“层级”变成持续噪音。

---

## 关于“克制的其他颜色 blur”，我建议再加三条硬规则

### 规则 1：色彩浓度必须低
如果是 chromatic glass，它首先仍然应该是**灰阶材质**，颜色只是轻微 tint。可以借鉴 SGDS 的 translucent 思路，把彩色注入控制在“类似 5%–10% 的轻量覆盖”这一量级，而不是做成完整彩色磨砂板【turn292923view0†L76-L85】。

### 规则 2：只做短表层，不做长阅读面
彩色 blur 最多用于：
- chip
- badge
- small callout
- review box header
- compact control group

不应用来托整段正文。正文仍应回到 neutral surface。

### 规则 3：绝不单靠颜色表达含义
W3C WCAG 1.4.1 明确要求：颜色不能是区分信息、提示动作、催促响应的唯一手段；应同时配 shape、icon、text 等其他视觉信号【turn699056view0†L20-L31】【turn699056view0†L36-L48】。
因此 `attention.review` 即使是红色玻璃，也应同时伴随：
- icon / marker
- label（如 Review / Needs decision）
- 边框或结构性容器变化

这反而很适合你要的“陌生化但不失控”。

---

## 工程实现上也有两点要先约束

`backdrop-filter` 现在已是 **Baseline 2024**，主流新浏览器普遍可用，但旧设备/旧浏览器未必可靠；而且它只对**元素背后**生效，因此宿主元素必须部分透明。另一个很容易踩坑的点是：若父元素本身带 `opacity < 1`，它会变成 backdrop root，子元素的 blur 只会模糊父子之间那一层，常常导致“明明写了 blur 却看不见效果”【turn449312view3†L172-L178】【turn449312view1†L182-L182】【turn449312view0†L275-L286】。
所以实现上我建议：
- 不在深层嵌套里随意叠 blur
- 尽量让 blur surface 自己成为清晰边界
- 避免靠父级 opacity 造透明
- 把 fallback 当成一等公民：无 blur 时仍应是可用的 neutral raised surface

---

## 我给你的收敛结论

我赞成 explore，但不是“再找一些 glass 效果”，而是直接按下面这套去做选型：

### CourtWork Material Constitution（建议稿）
1. **默认世界是灰阶。**
2. **blur 只服务于层级，不服务于装饰。**
3. **neutral glass 用于浮起表层。**
4. **smoke 用于阻断和聚焦。**
5. **chromatic blur 只允许进入 `attention.review.*`。**
6. **确定性语义色（success/warning/danger/focus 等）不被 skin 接管。**
7. **任何 attention 色都必须搭配非颜色信号。**【turn316464view0†L33-L57】【turn292923view0†L34-L41】【turn699056view0†L23-L31】

如果你愿意，我下一步可以继续把它落成一份更具体的 **token 草案 + 组件映射表**，直接列出：
- 哪些组件可用 `glass`
- 哪些只能用 `solid`
- 哪些场景才允许 `review tint`
- 每类对应的 token 名称与禁用项。

## T4 · userMessage · 54d90c2d-9727-4970-96bf-9542ba7c8d30

可以 explore 成熟实践或 Design saas、provider pages 设计

@Exa

## T4 · agentMessage · 54d90c2d-9727-4970-96bf-9542ba7c8d30

可以。这一轮用 Exa 扫了约 **135 个候选结果**，按「系统级 Material、专业工作软件、Design SaaS / Developer SaaS、AI Provider Pages」四个方向归并，重点深读了 13 个一手页面。结论比单纯寻找“漂亮玻璃”更明确：

> **成熟实践并没有收敛到 glassmorphism，而是收敛到“材质有辖区”。**
>
> 对专业工作产品，Glass 是 functional material；对 Provider / Pages，它可以成为 atmospheric material。两者最好从 token 层就隔离。

### 第一组：最值得 CW 直接消费的是 Apple × Fluent × Linear

| 来源 | 成熟做法 | CW 应消费 | 不消费 |
|---|---|---|---|
| [Apple Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | Liquid Glass 是 controls/navigation 上方的独立 functional layer；明确要求不要铺进 content layer，并要求 sparingly | chrome、sidebar、tab、popover、浮动 controls；regular/clear 两级思想 | 正文卡片全面玻璃化 |
| [Microsoft Acrylic](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic) | Acrylic 主要给 transient / overlap UI；纵向内容 pane 默认反而建议 opaque；禁止多层 Acrylic 堆叠 | popover、menu、overlay panel；solid fallback；blur+tint+noise 的材料配方 | glass-on-glass、整页 acrylic |
| [Linear Liquid Glass](https://linear.app/now/linear-liquid-glass) | 很关键：把 Liquid Glass 用 **ProKit philosophy** 重做——面向专业工作、持续专注、clarity > flourish | Gaussian blur + subtle gradient + 微弱高光 + 边界；主要用于 navigation | **refraction**。Linear 明确因 dense professional UI 可读性而放弃折射 |

Linear 几乎可以作为这一笔的 **closest prior**。它甚至回溯了 Aqua / ProKit 的分野：消费级系统可以更丰沛、更触觉化，而专业工具应把这些效果削到只剩下能够解释空间关系的部分。

所以 CW 不应模仿完整 Liquid Glass，而可以定义自己的：

**Pro material = translucency + depth − spectacle**

这与你前面提出的灰阶材料非常一致。

---

### 第二组：一个很有价值的反例是 Vercel

[Vercel Geist](https://vercel.com/geist/materials) 的正式 material 系统甚至完全不以 blur 命名，而是：

```text
On-page
base
small
medium
large

Floating
tooltip
menu
modal
fullscreen
```

也就是说，先描述**空间语义**，再决定 fill / stroke / shadow。

更值得注意的是 Vercel 新公开的 [design.md](https://vercel.com/design)。它针对 report / proposal / benchmark 这种**需要阅读、判断、审计的专业页面**，直接规定：

> monochrome；只有 state/action/data 真有语义时才使用颜色；并 hard reject decorative gradients、glows、textures、glass、fake depth。

这对 CourtWork 特别有启发：**Review / evidence surface 与 marketing surface 本来就不应共享材质自由度。**

也就是说：

```text
CourtWork work surface
≠
CourtWork GitHub Pages / Provider surface
```

后者可以更激进，前者越靠近 evidence/review 越应该回归 Vercel 式平静。

---

### 第三组：Design SaaS 告诉我们“彩色 blur 应该在哪”

[Clerk 的公开 design.md](https://clerk.com/design.md) 是很好的案例，因为它明确区分了 **Marketing = Seed、Dashboard = Mosaic、嵌入 Auth = Appearance API**，而不是拿一套视觉语言硬套三个 surface。

尤其值得抄的是它对 gradient 的约束：紫→天蓝的品牌 gradient 可以用于 **UI demo 后面的 glow halo、timeline indicator、decorative highlight**，但明确“不作为 button fill”。

这几乎可以直接翻译成我们的规则：

```text
Chromatic atmosphere:
可以位于 artifact 背后
不应该涂在 artifact 本身
```

也就是彩色 blur 不是彩色卡片，而是一种**光源**。

[Spline](https://spline.design/) 可以作为较激进端：glass、blur、3D projection、interactive material 都可以用于 showcase；[Rive](https://rive.app/) 则更适合消费其“motion 是 state-driven behavior，而不是 GIF 装饰”的思想。Framer Marketplace 里大量 glass navigation 也反复出现相同拓扑：**floating nav / expanded menu / page dimming / background blur**，而不是正文区域每张 card 都 blur。

所以真正值得借用的不是“Framer glass aesthetic”，而是它已经通过大量市场试验形成的一个局部共识：

> **Navigation island 是玻璃非常稳定的容器。**

这对 CW 的 chrome tab、composer chrome、浮动 preview controls 都有价值。

---

### 第四组：Provider Pages 反而显示出三条不同路线

**Anthropic / OpenAI / xAI 一派是“拒绝材质”。** [Anthropic](https://www.anthropic.com/) 主要靠暖 neutral、排印、留白和大面积明暗反转获得品牌感；[OpenAI](https://openai.com/) 也让内容和真实产品 artifact 承担色彩，而 chrome 本身非常安静。它们证明：**没有 blur 完全可以拥有很高的完成度。**

**Mistral 是“Brand asset 与 UI 分离”。** 官方 [Brand Guidelines](https://mistral.ai/brand/) 允许鲜艳、像素化的 model illustration 和 gradient logo，同时明确 busy background 应使用 monochrome logo。当前 public UI 的观测也明显比品牌资产平静。这一点特别适合我们的 skin：色宗可以拥有完整视觉身份，但不等于把整个 runtime UI 染色。

**Resend / infra SaaS 是 atmospheric 方向。** [Resend 首页](https://resend.com/home) 值得作为 dark / frost 一侧的视觉参考；更重要的是他们自己的 [Design Handbook](https://resend.com/handbook/design/whats-the-role-of-design-at-resend) 强调 product、marketing、brand、support 是一个 living system，但 coherence 不意味着所有表面长得一样。第三方对其 surface 的测量尤其提示了一种好用的方法：**frost border / 极弱 tint / 光感边界可以替代大量真实 blur**。

这可能是 CW 非常值得消费的一招：很多时候我们想要的“玻璃感”，其实只需要：

```text
translucent surface
+ 1px luminous/frost edge
+ tiny luminance shift
+ optional soft backdrop blur
```

不必每次都真的 blur 16–24px。

---

## 因而我会把选型正式拆成两条轨

**Product Material：Linear × Fluent，受 Apple 规范约束，Vercel 作为反例校准。**

```text
opaque content
↓
neutral raised surface
↓
neutral translucent chrome
↓
floating glass
↓
smoke / modal
```

色彩原则不变：默认全部灰阶。只有进入 human-review boundary 时：

```text
neutral glass
+
skin.attention.review tint
```

而不是变成 `red glass / blue glass / green glass` 组件库。

**Provider / Pages Material：Anthropic restraint 为底，允许 Resend / Mistral 式 atmospheric injection。**

这里可以另外开一个 namespace：

```text
provider.atmosphere.glow
provider.atmosphere.blur
provider.atmosphere.gradient
provider.atmosphere.tint
provider.atmosphere.media
```

它**不编译进产品 surface 的可用 token 集合**。这样 Pages 可以有更强的玻璃、光斑、渐变、动态材料，甚至不同色宗完整演绎，而不会逐渐污染 CourtWork 本体。

这是本轮 explore 后我认为最重要的新约束：

> **`attention.review` 是 Product 中唯一的 chromatic material escape hatch；`provider.atmosphere` 是发布面独立的 expressive escape hatch。二者不可互相调用。**

于是 Dystopia 可以在产品中只留下极少的 red review tint；但到了 GitHub Pages，它可以把同一种红进一步扩成远处的 blur、光晕、渐变、材质反射——仍然保持“页面绝大多数内容无彩”，却明显拥有同一个 skin 的气质。

另外我建议**现在就把 refraction 排除出 CW Product**。Linear 已经替我们做过这次取舍：专业、高密度、长时间工作的界面，用精确 blur、mask、lighting 已经足够建立物理感；折射所增加的“神奇感”不抵它造成的阅读扰动。Pages 则可以留作实验项。

这一轮已经足够形成一个很干净的 Material Index：**Apple / Fluent / Linear / Vercel 为规范与反例四锚；Clerk / Framer / Spline 为 Design SaaS；Anthropic / OpenAI / Mistral / Resend 为 Provider Pages 四种不同强度。** 后续本地施工无需再漫无目的找 glassmorphism，而可以围绕这些局部逐项做 reference board。

## T5 · userMessage · 83c00b8a-2076-40db-a474-cc25b969da05

这类可视化或结构化编排，对于 agent UI，应当有丰富的实践和组件库，可以 explore @Exa

热力图和 model usage 会是首先落地的。

[User attached 2 images; image contents were not included]

## T5 · agentMessage · 83c00b8a-2076-40db-a474-cc25b969da05

可以。Exa 这一轮从 **Agent/LLM observability、成熟 Design System 的 data-viz、React dashboard/visualization components、GitHub-style activity graph** 四个方向扫了一遍。结论是：你截图里的两块并不是需要自研的新颖组件，社区已经形成了相当稳定的结构；真正值得 CW 自研的是**语义编排、数据 contract、drill-down 和视觉收敛**。

最值得直接确定的一点是：

> **Heatmap 用 agent-native 的 headless primitive；Model Usage 用 shadcn Chart + Recharts。Tremor / Supabase / Stripe / OpenRouter 作为编排参考，不再额外引入一个 dashboard framework。**

这会非常干净。

### 1. Heatmap：几乎已经有“正解”

这一轮最意外也最契合的是 assistant-ui 已经提供了 [`heat-graph`](https://github.com/assistant-ui/assistant-ui/blob/a989eb0a/apps/docs/content/docs/utilities/heat-graph.mdx)。它就是专门面向 React / agent UI 的 GitHub-style activity heatmap，而且采用 Radix 风格的 headless compound primitives：

```text
HeatGraph.Root
├── MonthLabels
├── DayLabels
├── Grid
│   └── Cell
├── Legend
│   └── LegendLevel
└── Tooltip
```

它没有强塞视觉风格，支持自定义 bucketing、任意 color scale、tooltip、Sunday/Monday 起始，而且可以直接通过 shadcn registry 安装。对于 CW，这比 Nivo Calendar 或普通 `react-calendar-heatmap` 更合适：**取计算与交互，不取其视觉。**

另一个重要细节是它允许自定义 `classify()`。这正好解决你的数据特点：token usage 是严重 heavy-tail 的，不能简单做：

```text
0–2M → level 1
2–4M → level 2
...
```

否则一两个超大 context day 会让剩下全年全部灰掉。首版可以用 quantile / percentile：

```text
0       → empty
< P50   → 1
< P75   → 2
< P90   → 3
>= P90  → 4
```

或者 `log1p(tokens)` 后分桶。**色阶表达相对活动强度，而不是绝对 token 数。tooltip 再披露真实值。**

这也是 GitHub contribution graph 的成熟范式：overview 是 activity density，准确数字属于 hover / detail，而不是要求用户从颜色反推数值。

备选是 [`react-activity-calendar`](https://github.com/grubersjoe/react-activity-calendar) 和 [Nivo Calendar](https://nivo.rocks/calendar)。前者很薄、成熟；后者适合已经全面使用 Nivo 的分析产品。但既然 assistant-ui 已进入我们的 agent UI 参考体系，我会直接把 `heat-graph` 定为 **T0 candidate**。

---

### 2. Model Usage：Recharts 已足够，不需要大型 chart engine

[shadcn Chart](https://ui.shadcn.com/docs/components/base/chart) 目前底层直接使用 Recharts v3，而且有一个很符合我们长期维护原则的设计：

> shadcn **没有包掉 Recharts**；只是提供 `ChartContainer / Tooltip / Legend / config` 等局部辅助组件。

因此：

```text
Recharts primitive
      ↓
CW chart semantic wrapper
      ↓
ModelUsage
```

而不是：

```text
CW
 ↓
巨大 Dashboard Framework
 ↓
内部 wrapper
 ↓
Recharts
```

这与我们前面一直采用的“薄封装、局部可替换”是一致的。

你图二本身就是很标准的 **time-series stacked bar + ranked legend/table**。Recharts 原生就能完成，而且 stacked segment 可以 click。

这里尤其应该消费 [OpenRouter 2026 Activity Dashboard](https://openrouter.ai/blog/announcements/activity-dashboard/) 的交互设计。它现在的逻辑已经非常 agent-native：

```text
Metric
× Dimension
× Time range
× Rollup
→ Visualization
→ click datum
→ filtered logs
```

例如点击：

```text
Aug 5
× Fable 5
× 10.2M tokens
```

不是只弹一个 tooltip，而可以继续进入：

```text
Sessions / runs / requests
filtered by:
date = Aug 5
model = Fable 5
```

这是非常重要的一步：**visualization 不是 dashboard decoration，而是 progressive disclosure 的入口。**

它甚至进一步做到 prompt-level token flamegraph，把 system / user / assistant / tool 分层，并标出 cached prefix。以后 CW 要做 context / cache / TPS 可视化时，这条非常值得继续消费。

---

### 3. 你截图里的整体 anatomy 也已经高度成熟

[Stripe 的 Chart Layout](https://docs.stripe.com/stripe-apps/patterns/chart-layout) 给出了一个很稳定的原则：**先给 headline metric，再给 chart；chart 回答“它是怎样形成/变化的”。** 同一行 chart 固定相同高度，并且 loading / empty / error / populated 四态保持相同尺寸，避免布局跳动。

[Supabase Charts](https://supabase.com/design-system/docs/ui-patterns/charts) 更接近我们要施工的组件 anatomy：

```text
Chart
├── ChartCard
├── ChartHeader
├── ChartMetric
├── ChartContent
│   ├── loading
│   ├── empty
│   ├── disabled
│   └── visualization
└── ChartFooter
    └── table / legend / detail
```

它同样选择 **自己的 presentation components + Recharts**，而不是重新造 visualization engine。这几乎可以原样作为 CW 的工程参考。

你两张图可以因此收敛成同一个 shell，而不是两个临时页面：

```text
UsageSurface
├── ViewTabs         Overview | Models
├── PeriodControl    All | 30d | 7d
└── body
```

`Overview` 和 `Models` 只替换 body。

---

### 4. 第一版我建议直接这样冻结

| 局部 | T0 选型 | 消费什么 | 不消费什么 |
|---|---|---|---|
| Activity Heatmap | [assistant-ui `heat-graph`](https://github.com/assistant-ui/assistant-ui/blob/a989eb0a/apps/docs/content/docs/utilities/heat-graph.mdx) | grid/date/bucketing/tooltip anatomy | 示例蓝色视觉 |
| Model time series | [Recharts](https://recharts.github.io/) + [shadcn Chart](https://ui.shadcn.com/docs/components/base/chart) | stacked bar、axis、tooltip、interaction | 默认 chart palette |
| KPI / Filters / micro-viz | [Tremor](https://tremor.so/) | KPI cards、Tracker、BarList、SparkChart、filter anatomy | 整套 Tremor theme |
| Chart shell | [Supabase Charts](https://supabase.com/design-system/docs/ui-patterns/charts) | Header/Metric/Content/Footer + states | Supabase 品牌视觉 |
| Information architecture | [OpenRouter Activity](https://openrouter.ai/blog/announcements/activity-dashboard/) | overview→explore→logs progressive disclosure | 企业 billing 复杂度 |
| Metrics ontology | [Langfuse Dashboards](https://langfuse.com/docs/metrics/features/custom-dashboards) / [Portkey Analytics](https://portkey.ai/docs/product/observability/analytics) | metric × dimension × filter | 自由拼 dashboard 首版 |
| Chart composition | [Stripe](https://docs.stripe.com/stripe-apps/patterns/chart-layout) | headline→chart、fixed heights、四态 | Stripe visual identity |
| A11y / limits | [GitHub Primer Data Viz](https://primer.style/product/ui-patterns/data-visualization/) | 非颜色编码、series limits、axes | GitHub palette |

Tremor 这一笔我尤其建议**作为视觉组件索引而不是依赖**。它有 35+ dashboard components 和 250+ blocks，里面 `Tracker`、Bar List、Spark Chart、KPI、Filter 等，都很适合逐个拆解取型。

---

### 5. Model Usage 有一个应立即修正的小问题

你截图中同时列出了 6 个 models。视觉上非常漂亮，但 [GitHub Primer](https://primer.style/product/ui-patterns/data-visualization/) 对 stacked bar 的建议是 **5 个 segment 以内**；更重要的是，六个非常接近的蓝色在实际图中已经开始难以准确区分。

因此可以保留下面完整排名：

```text
Fable 5       27.2%
Opus 4.8      23.6%
Opus 5        23.2%
Sonnet 5      18.8%
Fable 5.1      6.9%
Opus 4.6       0.2%
```

但 chart 本身可以变成：

```text
Top 4 models
+
Other
```

点击 `Other` 再展开。

这样 **chart 负责 pattern recognition，list 负责精确 disclosure**。不需要让 chart 承担表格职责。

同理，我不建议在柱子中同时编码：

```text
model × input/output
```

否则 5 models × 2 token types 已经是十种 segment。

正确结构应该是：

```text
Metric:
Total tokens | Input | Output
```

选择一个 metric 后：

```text
stack by model
```

而右下 ranked list 同时披露：

```text
773k in · 24.8M out     27.2%
```

你的截图实际上已经非常接近这个正确解。

---

### 6. 颜色需要单独立一个 `dataviz` contract

这一笔不能走 `skin.attention`。

我们刚才已经约定：

```text
skin color
→ 只接管 attention.review
```

这里则属于**确定性数据编码**，应单独建立：

```text
color.dataviz.activity.0
color.dataviz.activity.1
color.dataviz.activity.2
color.dataviz.activity.3
color.dataviz.activity.4

color.dataviz.series.1
color.dataviz.series.2
color.dataviz.series.3
color.dataviz.series.4
color.dataviz.series.5
```

Dystopia skin **不能把 model chart 全部变红**。

截图里的蓝阶可以作为一个候选 `dataviz.activity` palette，而 Dystopia red 仍然只会在某个“你需要 review 这个异常 usage”的标记上出现。例如：

```text
normal usage     blue / neutral data-vis
                    │
异常 cost spike     │  ← 数据仍然不变
                    ▼
        red review marker / annotation
```

颜色职责就完全清楚了。

---

### 7. 第一版甚至不需要做“Analytics dashboard”

我建议数据 contract 先只有两个很小的对象：

```ts
UsageDay {
  date
  sessions
  messages
  inputTokens
  outputTokens
}

ModelUsageDay {
  date
  model
  inputTokens
  outputTokens
}
```

然后：

```text
UsageDay[]
    ├── KPI
    └── HeatGraph

ModelUsageDay[]
    ├── StackedBar
    └── RankedModelUsage
```

以后才逐渐把：

```text
cost
cache hit
TTFT
TPS
latency
reasoning tokens
tool calls
provider
runtime
agent/expert
```

注入同一个 metric/dimension contract。

这比第一天就复制 Langfuse 的 dashboard builder 更符合现在阶段。

**因此首轮施工选型已经可以非常明确：`assistant-ui/heat-graph + shadcn Chart/Recharts`；Supabase/Stripe 取 shell，Tremor 取局部组件，OpenRouter/Langfuse 取 analytics ontology 和 drill-down。** 这两张现有稿可以作为视觉 fixture，不必推翻，主要是把底下已有的成熟 anatomy 和 token contract 补进去。

## T6 · userMessage · 86f46098-75fc-4e24-bf93-ae45511579e1

https://github.com/lesPrivilege/Courtwork.git

一笔调研单，增加 skin 注入影响的方式和范围，本质是先按灰阶层级编排。目前没有引入 attention 红，这会是十分克制的点睛之笔，可以整体 review 后考虑加入红色的位置（之后亦是其他 theme 更换的点），或者某些其他颜色的 blur ，需要 explore repo 内部和外部选型/成熟实践，dystopia 会作为一个 skin 预设入账。

@Exa

## T7 · userMessage · a2228570-8ea8-42af-91b7-5ab2e5b48a12

同时包括部署页的点睛红色，可以提案。[https://lesprivilege.github.io/Courtwork/](https://lesprivilege.github.io/Courtwork/)

## T7 · agentMessage · a2228570-8ea8-42af-91b7-5ab2e5b48a12

可以直接立一笔独立的 Design/Explore 单，而且这一笔不应只叫“加红色”，更适合定义成：

## EX-SKIN-01 · Skin Injection / Attention Chroma / Dystopia / Pages Atmosphere

核心命题是：

> **CourtWork 先用灰阶、明度、层级、边界和材质把全部信息组织成立，再允许 Skin 向少量已经命名的语义槽位注入色相。**
>
> 换 Skin 不重新设计界面，只改变“哪些已经存在的角色呈现什么色相”。

这和当前代码其实已经非常接近。现有 `styles.css` 已明确分成 **S(scale) → R(role) → U(usage)** 三层，默认 `lead-gray`、备用 `gray-steel` 都只替换 S 层；L0/L1/L2/L3 表面层级也已经独立于具体颜色。

更关键的是，今天仓库里已经出现了这笔研究的“半成品合同”：Home 裁定写明 `needs_you` 不应把整行染红，`--attention-review` 是独立语义角色，而且不能污染 Send、Activity、Focus、Navigation；Material Grammar 又进一步提出了 `review indicator / surface / border / glass-tint` 四个候选槽位。

所以这笔 Explore 的价值，是把这些局部裁定收敛成真正的 **Skin Constitution**。

### 1. Skin 的边界建议这样切

| 层 | 谁控制 | Skin 是否可改 | 说明 |
|---|---|---:|---|
| 几何、字号、间距、圆角 | Design grammar | 否 | 换 Skin 不应导致另一套产品 |
| L0/L1/L2/L3 层级关系 | Surface grammar | 否 | 哪一层高、哪一层 recessed 不变 |
| Neutral scale | Skin | 是 | gray/slate/ash/graphite 等 |
| Paper / frame / float 的具体值 | Skin | 是 | 但层级关系不能反转 |
| Hover / selected / pressed | 由 neutral 推导 | 间接 | **不能突然获得独立彩色** |
| 普通文字/线条 | 由 neutral 推导 | 间接 | 保持灰阶骨架 |
| Generic accent | Skin | 可选 | Dystopia 默认仍建议 ink/monochrome |
| Danger / success | Semantic system | 默认否 | 不因 Skin 换意义 |
| `attention.review.*` | Skin semantic slot | **是** | 此处就是点睛色主要入口 |
| Blur 半径与适用组件 | Material grammar | 否 | Skin 不应让更多东西突然变玻璃 |
| Blur / glow 的 tint | Skin | 有限 | 只能喂给已注册 material recipe |
| Data visualization palette | Chart grammar | 否，另管 | 不跟 Attention 红自动联动 |
| Pages atmosphere | Publishing namespace | 是 | 与产品 namespace 分开 |

这里有一个值得专门 review 的现有泄漏：当前自定义 Skin 的校验不止允许颜色，还允许几个 numeric token，测试明确覆盖了 `--shadow-alpha`、`--glass-alpha`、`--rim-alpha` 等。也就是说，旧的 whole-skin API 实际上能改变材质强度。

这笔单应判断是否收紧为：

```text
scheme      → light / dark + material alpha policy
skin        → neutral scale + chroma scales
roles       → stable semantic mapping
material    → eligibility + blur geometry
atmosphere  → Pages-only decorative projection
```

也就是 **Skin 可以供色，但不能决定哪里用 blur、blur 多大、哪个 pane 从 solid 变成 glass。**

这正好符合 Apple / Fluent 的成熟做法：材质按用途选，不按“这个颜色看起来漂亮”选；Acrylic 更适合 transient UI，长驻内容面优先 opaque，并且透明效果必须有 solid fallback。[Apple Color](https://developer.apple.com/design/human-interface-guidelines/color) · [Microsoft Acrylic](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic)

---

## 2. Attention 红：建议不是 `red = danger`，而是独立 Review scale

外部体系在这一点上反而给了一个很有用的反证。

Atlassian 明确区分 neutral / accent / warning / danger，并强调有语义时不要拿 decorative accent 顶替；Resend 更直接把 Red 定义为 critical / irreversible，而 pending 是 Amber。[Atlassian Color](https://atlassian.design/foundations/color) · [Resend Brand Guidelines](https://github.com/resend/design-skills/blob/main/brand-guidelines/SKILL.md)

所以如果 CourtWork 使用红色表示 `needs_you`，不要做：

```css
--attention-review: var(--danger);
```

而应当是类似：

```text
review-3   → soft tint
review-7   → localized border / indicator
review-9   → reserved emphasis, generally unused
review-11  → short label / icon

attention-review-ink
attention-review-soft
attention-review-border
attention-review-glow
```

Radix 自己也建议：即使两个语义最终引用同一色阶，也应该保留不同 semantic alias，而不是把意义绑到色名上。[Radix Aliasing](https://www.radix-ui.com/colors/docs/overview/aliasing)

首轮 specimen 可以直接比较 **Ruby / Crimson / Red** 三系。我倾向把纯 Red 留作 danger 基准，把稍微偏 Ruby/Crimson 的一支作为 Attention Review——仍然明显是红，但没有系统错误提示那么“报警”。

真正重要的是面积。

### 推荐允许红色出现的位置

| Surface | 红色处理 | 判断 |
|---|---|---|
| Home Attention `needs_you` | 短状态词 / 小 indicator | **首选** |
| Attention workspace `needs_you` | 同样的短标签 | **首选** |
| 人类必须 adjudicate 的 Review header | 小 label / 1px 局部 border | 可 |
| Candidate 正在等待决定 | 很淡的 localized soft tint | specimen 后裁 |
| Review transient glass | 极低浓度 tint | specimen 后裁 |
| 整个 Attention card | 不染红 | 否 |
| selected row | 不染红 | 否 |
| Focus ring | 不染红 | 否 |
| Send / primary action | 不染红 | 否 |
| Activity heatmap | 不染红 | 否 |
|普通 waiting / loading | 不染红 | 否 |
| failed/error | 继续 Danger | 不复用 Review |
| Reject button | 不因为“拒绝”二字自动红 | 动作语义另判 |

这也与当前 Home 实现吻合：`needs_you` 已经有单独 class hook，而且当前设计文件明确禁止红色 selected-row background。

还有一条很值得写成验收标准：

> **把全 UI 转成 grayscale 后，信息层级、选择态、待审阅含义仍然全部成立。色相只能提升 attention，不得承担唯一编码。**

这会是非常适合 CourtWork 的 “grayscale survivability gate”。

Linear 的重设计过程其实就是一个很好的外部旁证：先大量使用 black/white opacity 理清 elevation 和 hierarchy，后来才从 base color、accent color、contrast 三个参数生成完整主题，而且最终还主动减少 chrome 中的色相比例，以回到 neutral/timeless。[Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)

---

# 3. Dystopia 应该正式升格为一个 Skin preset

目前 `color-governance.md` 仍把 dystopia 作为方向词，实际映射到 lead-gray，而不是一个真正独立的 preset。

这笔 Explore 后可以正式改成：

```text
lead-gray
gray-steel
dystopia
custom
```

但 **Dystopia 不应等于“全局红黑主题”**。

更适合它的基因是：

```text
Neutral:
  cold ash / graphite / lead
  cool paper
  deeper black
  sharp but restrained line hierarchy

Generic interaction:
  monochrome
  ink / inverse ink

Attention:
  one deep ruby/crimson family

Material:
  same eligibility as default
  optional review tint only

Motion:
  unchanged

Shape:
  unchanged
```

于是它仍然“像 CourtWork”，而不是另一个 CSS skin pack。

这一点和 Vercel 的经验也一致：强 accent 如果到处重复，就不再具有意义；视觉个性应该来自有限而稳定的 motif，而不是每个元素都抢 attention。[Vercel / What will you ship?](https://rauno.me/craft/vercel)

---

# 4. 部署页的点睛红，我建议做一版 **Red Thread**

当前线上 Pages 本身是非常适合这一笔的：它现在几乎完全使用 neutral + product token，甚至 `status` 的注释明确说三个状态靠文字区分，不给 verified / local / not-yet 分别上颜色。

同时 Pages 已经正式取得自己的 campaign visual/material ownership，可以比产品更激进，而且明确不应反向污染产品 material contract。

因此不建议把首页 CTA、导航链接、CourtWork wordmark 全部改红。那会瞬间从“点睛”变成品牌主色。

更好的落点是：

| 线上位置 | 提案 |
|---|---|
| Hero | **保持完全灰阶** |
| `03 / ATTEND · Selective Attention` | `03` 或一个 5–6px registration mark 使用 review red |
| `04 · Review is a first-class surface` | Section index `04` 使用 review red |
| “待人审阅 · 录制中的候选状态” | 小 review label 使用同一红 |
| Review screenshot 背后 | 一个非常宽、极淡的静态 crimson/ruby atmospheric bloom |
| screenshot 本身 | 不加 overlay，不篡改证据截图 |
| section rule | 可实验 20–40px 的短红线，而非整条 divider |
| Get Courtwork / Tour / Paper | 保持黑灰 |
| Pricing | 保持黑灰 |
| verified / local statuses | 保持黑灰 |
| footer | 保持黑灰 |

其中最值得做 specimen 的是：

```text
neutral page
      ↓
04 REVIEW         ← tiny red register
      ↓
[ real screenshot ]
       ╲
        very low-opacity diffuse red atmosphere
```

这里的 colored blur 不应该用 `backdrop-filter` 模糊正文，而是一个**位于内容背后的 pseudo-element / radial field**：

```text
red tint
→ very low alpha
→ large radius
→ static
→ clipped to Review section
→ pointer-events none
→ disappears under reduced transparency / forced colors if needed
```

即“**有红色的空气，但没有红色的面板**”。

Apple 对透明材质的建议尤其适合这里：色彩应稀少地用于真正需要强调的元素；Microsoft 也提醒不要在 acrylic 上叠大量 accent text。产品 UI 应更加克制，而 Pages 的 atmosphere 则可以独立为 publishing language。

---

## 5. 这笔调研单可直接这样派

1. **Repo inventory**：枚举所有 Tier S/R token、Skin selector、custom-skin validator、所有 chromatic consumer、所有 blur/glass/glow consumer；单独列出 whole-skin 当前能够影响但未来可能不应影响的 numeric/material token。

2. **External index**：至少消费 Linear、Radix、Atlassian、Primer、Apple、Fluent、Vercel、Resend；输出的不是截图收藏，而是逐条映射到 `neutral / semantic / skin / material / publishing` 五个 CourtWork 决策面。

3. **Skin Constitution**：形成 `scheme × skin × semantic role × material × publishing atmosphere` 的正式影响矩阵；定义哪些 token 可以被 skin override，哪些永远稳定；处理现有 gray-steel/custom 的兼容迁移。

4. **Dystopia specimen**：light/dark 两宗；比较至少 Ruby / Crimson / Red 三种 review hue；保持普通交互 monochrome；制作 Home、Attention workspace、Review、popover 四组真实语义槽位，而非 palette board。

5. **Pages Red Thread specimen**：基于当前部署页做 A/B/C；A 只有 Review label，B 加局部 rule/registration mark，C 再加极淡 atmospheric bloom。Hero、CTA、nav 不染色作为对照。

6. **Acceptance**：1440/1280/mobile × light/dark；grayscale survivability；普通/高对比；reduced transparency；red 不作为唯一状态信息；Danger 与 Review 同屏可辨；selected/focus/send/activity 不被 Review skin 污染；Pages atmosphere 不进入 `app/web`；现有 contrast/material lint 继续通过。

建议落档：

```text
engineering/design/skin-injection-2026-09-10/
  README.md
  repo-inventory.md
  external-index.md
  skin-constitution.md
  attention-review-matrix.md
  dystopia-specimen.md
  pages-red-thread.md
  migration-notes.md
```

这笔先保持 **Design / Explore PR，不直接改默认产品**。完成后再拆成 `token contract → Dystopia preset → Attention consumers → Pages Red Thread` 四个施工 PR。这样既能把你说的“点睛红”真正落下来，也会顺手把 Skin 注入的长期边界一次治理清楚。
