# Skin / Review 分离合同 · Astra 裁决

状态：2026-09-10 用户最新纠正后的前端规范。**Review 为稳定语义，不属于 skin；改变 skin 不得改变 review。** 此段覆盖输入对话早期“skin 只注入 review”及本单初稿的相反判断。产品代码尚未修复 custom/gray-steel 的耦合，见迁移单。

## 影响矩阵

| 对象 | owner | skin 可改 | 约束 |
|---|---|---:|---|
| neutral / paper / frame / float 的配色 | 外观 palette | 是，受契约约束 | 灰阶先成立，层级关系与文字可读性不反转 |
| 普通 ink / line / hover / selected / pressed | 固定 R 映射 + skin neutral | 间接 | 由 neutral 派生，不新增装饰色语义 |
| generic accent / 普通 primary | 外观与交互合同 | 只按已批准 palette | Dystopia 保持单色；不能改变 focus/操作意义或冒充 review |
| light / dark、alpha、阴影 | scheme / material | 否 | 浅深可适配；skin 不扩大透明度/blur 名额 |
| 几何、字体、圆角、密度、motion | 对应 grammar | 否 | 换色不改编排 |
| review.* | review 语义合同 | **否** | 独立固定色族；浅深/高对比适配也不来自 skin |
| danger / success / warning、diff、provenance | 各确定性语义 owner | 否 | 不由 skin 重写；同 hue 也不合并 semantic alias |
| focus | interaction / accessibility | 否 | 不用 review 或 brand accent 表示键盘焦点 |
| chart palette / heatmap intensity | data-viz grammar | 否 | 数据尺度与身份不随 skin 漂移 |
| Pages atmosphere | publishing namespace | 产品接口无权 | 独立提案，不反向导入 app/web |

“固定”表示 skin 无权重写，不表示浅深宗必须共用一枚 hex。固定 review 前景遇到任意背景不一定可读，因此 skin 准入需校验与固定语义色的组合；不能为使任意皮肤过关而改 review 颜色。旧 whole-skin 是兼容接口，不代表这些边界已经实施。品牌 SVG 保持独立零依赖。

## Review token

组件只消费 R；不在业务组件直读 skin primitive。沿 [S→R→U](../../mvp/execution/work-surface-kit/contracts/color-governance.md) 与 [material grammar](../home-composition-2026-09-10/material-grammar.md)，但其中旧“review 由 skin override”条款以本次用户裁决为准。

| 设计名 | CSS / 实施状态 | 用途 |
|---|---|---|
| `color.attention.review.foreground` | 现有 `--attention-review`；语义 owner 固定 | Needs you 等短文本；待去除 legacy accent fallback |
| `color.attention.review.indicator` | 有独立消费需求时再新增 | 冗余图形提示，不能代替状态词 |
| `color.attention.review.surface` | 保留，尚未新增 | 小型 review header / callout，正文仍中性 |
| `color.attention.review.border` | 保留，尚未新增 | 局部边界，不接默认 border / focus |
| `color.attention.review.glass-tint` | 保留，尚未新增 | review owner 的注册 material recipe；不是 skin 槽 |
| `surface.strong` / `on-strong` | 暂不开放 | 无已证明必要场景，不能成为第二 primary |

foreground 与 indicator 可同源，但文字仍需≥4.5:1，非文字≥3:1。首片保留现有浅/深 review 值作为语义基线；Ruby / Crimson / Red 对照若重开，是 review 语义设计变更，必须对所有 skins 同时成立，绝不打包为 Dystopia 专用 review 变体。

## Consumer 准入

| 场景 | Review 色资格 | 判定 |
|---|---|---|
| Home / Attention 详情 needs_you | 有 | 只投影 Attention 状态；当前只有部分短标签已接专用 token |
| Review 候选等待决定 | 有条件 | 精确领域状态与实际 human action；不得仅按对象名称着色 |
| provenance/conflict | 有条件 | 只有请求人裁决才使用 |
| failed / runtime error | 无 | 保留 danger |
| waiting_user / question / authorization | 不自动有 | 与 needs_you 不等价；逐个按 owner 登记 |
| queued / running / completed / new message | 无 | 机器活动不获得 review 色 |
| selection / nav / focus / Send / Activity | 无 | 走各自外观/交互/数据角色 |
| 最终危险确认 | 有条件且不替代 danger | 后果由动作合同决定；不因此变 modal |

无待决场景允许零 review 色。多个真实待决项可各有短标签，不为“一屏一红”隐藏事实；不开放大面积实心 review。灰度下保留明确措辞/结构，review 与失败不靠红色深浅区分。整个 Attention agent/chat 不因名字含 Attention 而着色。
