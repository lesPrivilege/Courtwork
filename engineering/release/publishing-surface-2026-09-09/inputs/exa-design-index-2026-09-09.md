# 输入 · 发布面设计索引（用户转交，2026-09-09）

用户原话：「本单筹备 git pages 与发布面，Courtwork pages，及 se Paper 修订（可能无需很多），pages 可以引用 Paper 或附内嵌页面，当前依然是中文为主，但只用自然语言，不临时生硬翻译，而保留更易理解的 English。以下仅供参考。」

同日补充：「Sonnet explore，Fable 裁决，一般实现交 Opus，瓶颈在模型能力的 Fable 亲为撰写（尤其是发布面文案）。」

以下为转交内容原文（另一会话的 Exa 检索结论，约 64 个结果、6 个方向）。裁定见 [intake](../intake.md)。

---

可以继续，而且这次 Cal.com 这个入口提供了一个很有价值的补充：**"成熟感"不一定来自更强的视觉效果，也可以来自极严密的 surface hierarchy。**

| 来源 | 值得取的局部 | 对发布面的转译 |
|---|---|---|
| [Cal.com](https://cal.com/khizer-ui/discovery-call) / [design system](https://opendesigner.io/design-systems/cal) | 极少颜色；**ring shadow + contact shadow + diffuse shadow + inset highlight** 构成立体层级；严格 radius scale；展示真实 UI 而非营销插画 | 建立正式 `surface/elevation/radius` token，而不是每张卡临时调 shadow/blur |
| [Otty](https://otty.sh/) | Hero 本身就是一块真实产品工作面；页面一直用产品 chrome 解释产品 | Courtwork 首页第一屏可以直接成为"一次真实 matter 的静态运行切片" |
| [Korren](https://korren.dev/) | **网页就是产品的 preview**：真的 command palette、真的可拖 pane、网页 theme 与 app token 同源 | Pages 不只是 screenshot gallery，而是一个有限、纯前端的"可操作标本" |
| [lpm](https://lpm.cx/mac-terminal-for-developers) | 浏览器里直接放可点击的 app demo | 不需要真实 runtime，可以用 deterministic fixture 重演已有 Courtwork session |
| [Kairn](https://kairnai.com/) | `on disk` 原始 Markdown ↔ rendered UI 两个并置视图；用**数据事实证明理念** | Event Log / Matter State / Compiled View 可以直接视觉并置 |
| [ped.ro](https://ped.ro/) | blur 不是环境装饰，而是**注意力语义**：非当前文本退焦，目标文本锐化 | 可用于 manifesto / architecture explanation / provenance walkthrough，不能铺满全站 |
| [Twill](https://twill.design/) | 大量作品却不变成 SaaS bento；内容自身承担视觉重量 | evidence gallery 可以靠真实截图、diff、paper 页，而不是制造一套营销 icon |

### Cal.com 这一单尤其值得收编

Cal.com 的"厚度"很大程度上不是 glassmorphism，而是**极微弱但分层明确的 elevation**：`1px ring → contact shadow → diffuse ambient shadow → inset highlight`。后续 Courtwork 不应只规定 `card { border-radius: 12px; box-shadow: ... }`，而应正式变成：

```text
surface-0  canvas
surface-1  inset / recessed
surface-2  card
surface-3  floating
surface-4  popover
surface-5  modal

elevation-0 flat
elevation-1 ring
elevation-2 ring + contact
elevation-3 ring + contact + ambient
elevation-4 ... + inset highlight
```

圆角按**对象语义**治理：

```text
r2   inline / tiny control
r4   field
r6   compact button
r8   standard control
r12  card
r16  floating surface
pill status / segmented control only
```

### 推荐的新 GitHub Pages 骨架

定位为 **repository → publication surface → executable evidence**。第一屏：

```text
Courtwork                                    GitHub  Paper  Docs

Work agents need governed state,
not longer transcripts.

A reference implementation of Schema Engineering
for durable professional work.

[ Explore the system ]   [ View source ]

┌─────────────────────────────────────────────┐
│          一块真实 Courtwork chrome          │
│   matter / session / review / provenance    │
└─────────────────────────────────────────────┘
```

接下来不做三张 feature cards，而做连续的 **proof surfaces**：

- **01 · Raw → Governed**（借 Kairn）：`Event Log` ↔ `Matter State` ↔ `Compiled Context`，点不同 tab 看同一事实处于三个层级。
- **02 · A matter in motion**（借 Korren / lpm）：用 deterministic fixture 做**只读 interactive replay**；能点 session、tool event、review、artifact；不接模型、不伪装在线 agent。
- **03 · Why this architecture**：SE 论述，editorial composition，不要 cards；blur/focus 把当前解释层锐化。
- **04 · Review is a first-class surface**：proposal、evidence、decision、provenance，不是 generic chat transcript。
- **05 · Evidence**：`benchmark · fixture · tests · version · decisions · paper revision`。
- **06 · Build / inspect / reproduce**：clone command、repo、paper、architecture、roadmap。
- 深色 footer 封口。

三个可升为 T0 explore 的题目：`publishing-surface-material.md`、`publishing-surface-proof-patterns.md`、`publishing-surface-interactive-specimen.md`。第三项让发布面从"做得漂亮的项目介绍"跃迁成：**Paper 提出命题，repo 给出实现，Pages 允许访客亲手检查这个命题。**

明确排除：大号抽象 3D Hero、满屏 glow、无语义 glass、每个 feature 都做 bento card、无意义 scroll reveal、"假装 live"的 agent animation。
