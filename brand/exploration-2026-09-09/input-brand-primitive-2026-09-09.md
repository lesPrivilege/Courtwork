# 输入 · 品牌图形层重开（用户转交，2026-09-09）

用户原话开头：「这个 repo 反而让我觉得：不应该继续在现有 Courtwork icon 上做"再加一点玻璃、阴影、立体"的局部润色，而应该重新做一次品牌图形层的裁定。」同日补充：「本地已经收入了 brand Design 的素材库，可以排 fresh Opus 单独考虑 icon 的设计和产品面的注入。」裁定见 [00-brief](00-brief.md)。

## 两个参考 repo 给出的方法

- `video-states-website`：视觉对象组织为 **base state → controlled states → return to base**；Scene / Lighting / Clothing / Cast 围绕同一基准画面变化，变化预制、可控、可逆，不随机生成；实现上把 Scene state 与 Playback state 分离，视觉身份与动态状态是两个维度。
- Amir 的 `brand-system-skill`（https://github.com/amirmushichge/brand-system-skill）：**Anchor Brand Kit** 与场景参考分开：logo、字体、颜色、层级、graphic language、whitespace 属于稳定品牌资产；外部参考只能影响 composition、lighting、material、depth、mood。

> 不是设计"一张漂亮图标"，而是设计一个稳定的 brand primitive，以及它的一族受治理状态。

## 三层

1. **Glyph / invariant geometry**：16 / 24 / 32px 成立、黑白成立、favicon 成立、菜单栏成立；不含玻璃、模糊、渐变、微型文字、复杂层叠、法槌 / 天平 / 法院柱子一类法律 cliché。它只回答 Courtwork 长什么样。primitive 不满意，再好的 material 也救不了。
2. **Material icon**：64–256px 或桌面 App icon；允许 paper / vellum、glass、polished metal、embossed edge、ink / vermilion、depth、refraction、layered shadow；材料附着在第一层的固定几何上，不由视觉效果决定形状。
3. **Stateful / kinetic mark**：Pages Hero、launch animation、loading、Matter 状态。一个 logo 可以有多个语义状态（示例：idle / ingest / govern / review / approved / provenance），全部从同一 base geometry 出发并能回到 base。比"右边三条线逐次写下"的一次性动画更有长期价值。

## Brand Lock

```text
Invariant      mark geometry · proportions · negative space · stroke logic · corner logic
Semi-stable    type · palette · material · elevation
Contextual     lighting · glass · blur · motion · background · campaign composition
```

## 四个几何命题（不保留现有方案优先权）

| 方向 | 核心 | 为什么适合 |
|---|---|---|
| **A · Folio** | 两至三层错开的纸 / record plane | Matter、document、version、provenance 自然包含 |
| **B · Governed Frame** | 开放结构逐渐闭合成一个受约束框架 | 更接近 Schema Engineering，不直接像法律软件 |
| **C · Trace Mark** | 一个主体形状 + 一条不可擦除的侧边 trace | Event Log / provenance 很强，陌生化 |
| **D · Annotation Mark** | 主体 + 极少量朱笔 / 校勘式附加符号 | 把版本学视觉语言转成品牌，而非装饰 |

降低 "C + W 字母组合" 的优先级：monogram 容易像创业 SaaS logo。目标：**看不出是法槌，但看得出这是一个有关文档、治理、状态与审阅的工具。** 最想试 **Folio × Trace**：主平面代表 governed matter；极小错层代表原始 evidence / prior state；一条边缘 trace 不完全被主体吃掉；小尺寸仍是鲜明 silhouette；放大后才展开纸张、玻璃、墨迹、层压结构。

## 目录与顺序

```text
brand/
├── 00-brief · 01-semantic-field · 02-reference-deconstruction · 03-glyph-directions
├── 04-small-size-test · 05-material-studies · 06-motion-states · 07-brand-lock · 08-release-assets
```

顺序：**先 16px 黑白 glyph → 再 App icon → 最后 cinematic / glass / motion。** 现有 icon 保留为候选历史稿，不再当作必须迭代到满意的母版。品牌身份应稳定，表现状态可以丰富。
