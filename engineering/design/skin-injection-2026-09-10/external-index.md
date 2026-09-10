# 一手资料与裁取

2026-09-10 直接访问。未重跑原讨论 Exa 的48/135等结果集，也未借用其计数。资料提供局部依据，当前 Skin/Review 分离边界来自用户最新裁决。

| 来源 | 本次核验与可用结论 | Courtwork 处置 |
|---|---|---|
| [Radix aliasing](https://www.radix-ui.com/colors/docs/overview/aliasing) | 正文取得；同色阶可有多个语义别名，mode 可改变映射 | 保留 Review 与 Danger 独立 alias；不采用其允许直接用 scale 的宽松选项 |
| [Primer color usage](https://primer.style/product/getting-started/foundations/color-usage/) | 正文取得；base / functional / component，基础 token 不直接消费 | 继续 S→R→U；不引新 token 框架 |
| [Atlassian color](https://atlassian.design/foundations/color) | 正文取得；semantic color 不应用 decorative accent 替代；interaction 状态有独立 token | Review 不是 generic accent；其品牌 CTA 色不照搬 |
| [Salt content](https://www.saltdesignsystem.com/salt/themes/design-tokens/content-characteristic) | 正文取得；attention 适用于短词/符号，区别 warning/error | 支持短标签克制；将其提升至 human loop 是本地推论 |
| [NYS tokens](https://designsystem.ny.gov/foundations/tokens/) | 正文取得；theme 与稳定语义 token 分开，状态/文字/focus 可保持稳定 | 支持能力隔离；不继承品牌 active states 染色 |
| [Linear redesign](https://linear.app/now/how-we-redesigned-the-linear-ui) | 正文取得；黑白透明度探索层级，之后使用 base/accent/contrast 生成主题 | 采灰阶先行方法，不引入宽主题生成器 |
| [Microsoft Acrylic](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic) | 正文取得；transient 适用、竖向内容推荐 opaque，避免多层，提供 solid fallback | 维持两处生产 blur；review tint 不扩名额 |
| [Apple Color](https://developer.apple.com/design/human-interface-guidelines/color) | 本次仅取得 JS 页面壳，未取得正文 | 保留线索，不把原讨论引语标为核实 |
| [Vercel 作者案例](https://rauno.me/craft/vercel) | 正文取得；强 accent 反复出现降低显著性，视觉节奏需要留白 | 仅支持 Pages 色彩预算；不引入 shader/动效 |
| [Resend brand source](https://raw.githubusercontent.com/resend/design-skills/main/brand-guidelines/SKILL.md) | 原仓库 raw 正文取得；Red 为 critical/irreversible，Amber 为 pending | 是反例：红不天然代表 review；不用其品牌字体或 blur 数值 |
| [W3C use of color](https://www.w3.org/WAI/WCAG21/Understanding/use-of-color.html) | 正文取得；颜色不能是唯一信息通道 | 状态词与结构必须在去色后保持 |

原截图约 `#AE3630` 的说法不当作本次取样结果；源码确有同值是另一条可核验事实。原讨论认为成熟系统一致支持 review-only 过强且该方案已由用户纠正：这些来源支持分层、语义与克制，没有统一规定只有一个 review 色槽。

线上 Courtwork URL 本次 web 读取失败；Pages 提案严格基于固定 main 源码，不宣称现网视觉审核或发布状态。
