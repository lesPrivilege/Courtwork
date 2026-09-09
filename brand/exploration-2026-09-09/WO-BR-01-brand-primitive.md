# WO-BR-01 · 品牌图形层：第 1 层 glyph 方向板（Opus，`opus-wo-medium`）

派单：Fable，2026-09-09。裁定依据 [00-brief](00-brief.md) BR-1…BR-6；语义场 [01](01-semantic-field.md)；输入 [input-brand-primitive](input-brand-primitive-2026-09-09.md)。体例：[handoff-convention](../../engineering/mvp/execution/work-surface-kit/handoff-convention.md) §2 工单。

## 问题

为 CourtWork 重开品牌 primitive 的第 1 层：五个几何命题 A Folio、B Governed Frame、C Trace Mark、D Annotation Mark、F Folio × Trace，加现有母题 E Record lines 同台，出同规格的黑白 glyph 方向板与小尺寸量测，停在"待用户选向"。不做材质，不做动画，不改产品。

## 输入

- 语义场四项与不得表达清单（01）；成立标准（BR-3）；板规格（BR-4）。
- 现有几何 `brand/geometry/mark.svg`（E 直接引用，不重画）。
- 光学验收：WK-133 (c) Lucide 设计指南（24 grid、2px 居中描边、round cap / join、1px 安全边、circle / square 密度对照、视觉重心居中、像素对齐）；用作 16 / 24 尺寸的验收，不限定 mark 必须是描边风格——实心剪影亦可，但同样过密度对照。
- 邻居语境：`app/web/vendor/icons.svg` 里的 Lucide 子集（house、square-pen、settings-2 等），用于 16px 并排条。
- 素材库（只在写 rationale 时引用，不取几何）：`brand/sources/visual-runtime-index.json`、`brand/references/`、`engineering/design/identity-specimen/`、`engineering/design/scout/README.md`。

## 基线 SHA

`main` `fa90763`；工作树 `/private/tmp/se-agent-br01`，分支 `claude/br01-brand-primitive`。

## 写权路径

`brand/exploration-2026-09-09/03-glyph-directions/**`、`brand/exploration-2026-09-09/04-small-size-test/**`、`brand/exploration-2026-09-09/delivery-br-01.md`。

## 不得

- 改 `brand/geometry/`、`brand/src/`、`brand/exports/`、`brand/CONTRACT.md`、`app/**`；
- 位图、AI 生成图、描摹外部 logo；渐变、玻璃、模糊、文字、三层以上叠加；法律与 AI cliché（01 §不得表达）；monogram；
- 引入依赖；用 `<image>` 或外链；
- 写"最终方案"或替用户选向。

## 交付物

1. `03-glyph-directions/index.html`：单页静态板，六个方向（A / B / C / D / F / E）同规格并排。每方向：主变体 + 两个变体（每个变体只改一个变量，注明改了什么）；每变体四档 16 / 24 / 32 / 64，各黑底白与白底黑；一条 16px 语境条：该 glyph 与四枚 Lucide 邻居并排、与 macOS 侧栏尺寸模拟并排。每方向一段 rationale（语义场四项各一句：它靠什么表达；不表达哪项），不超过八行。全部 inline SVG，`viewBox="0 0 64 64"`，几何用整数或 0.5 步进坐标；无 CSS 变换缩放冒充小尺寸——16 / 24 / 32 各自独立绘制或经像素对齐验证。
2. `03-glyph-directions/<dir>-<variant>.svg`：每变体一个独立 64 viewBox SVG，附 `<desc>` 写几何规则（比例、圆角、留白）。
3. `04-small-size-test/`：用 Playwright 或 `resvg`（仓内有则用，无则用 Chromium 截图）把每变体在 16 / 24 / 32 真实栅格化为 PNG（1× 与 2×），并给出 `measurements.json`：每变体在 16px 下最细笔画像素、墨量占比（ink coverage）、外接盒与视觉重心偏移、是否出现半像素糊边（相邻像素灰阶 > 2 级视为糊）、与 Lucide 邻居的墨量比。favicon：16 与 32 的 ICO/PNG 各一，附截图放在浏览器 tab 模拟条。菜单栏 template：单色黑 + alpha 的 18px 版本，深浅两底截图。
4. `delivery-br-01.md`：commit SHA、文件清单、量测原文、未验证项、每方向"哪一像素改变了哪一判断"、Fable 复核所需的判据表（01 §判据五项，作者自评只填事实不填分数）、待裁定（含你认为语义场中不可同时满足的项）。

## 必须验证

fixture 列：`node --check` 所有脚本；每个 SVG 通过 `xmllint --noout`（若无 xmllint，用 Node DOMParser 校验）；measurements.json 与 PNG 数量一致；index.html 无外部请求；黑白两极均无低于 3:1 的对比（纯黑白应为 21:1）。真实列：无。

## 验收者

Fable 复核（读几何、复跑量测、对照判据）；选向归用户四轴。

## 端口与数据目录

静态页预览 8910（`python3 -m http.server 8910 --bind 127.0.0.1 --directory brand/exploration-2026-09-09/03-glyph-directions`）；无数据目录。

## 停点

第 1 阶段止于 delivery-br-01；不进入 App icon、材质、动画、`mark.svg` 替换。第 2 阶段（材质与几何替换）、第 3 阶段（产品面注入）在用户选向后另派。
