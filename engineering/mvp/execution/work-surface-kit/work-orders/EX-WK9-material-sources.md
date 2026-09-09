# EX-WK9 · 材质规范来源转录（Sonnet，只读）

2026-09-09，Fable 发出。依据 [intake-round-3 §4j](../intake-round-3.md) WK-103；输入 [材质层级提案](../inputs/material-grammar-2026-09-09.md)。

## 问题

提案引用 Apple HIG Materials、WWDC25 Liquid Glass 与 Microsoft Fluent Mica / Acrylic，均为转述；FE-05（材质与光效）取值前需要来源行与转录值。既有 explore 卷未覆盖这三处（EX-WK3 只覆盖颜色与间距来源）。

## 输出

`explore/ex-wk9-material-sources.md`，卷首标"直接可消费"或"带溯源索引"，注明访问日与未访问的 URL。

1. **溯源表**（体例 §3 一来源一行）：
   - Apple HIG Materials（含 Liquid Glass 条目）：功能层定义、允许 / 禁止对象（glass-on-glass、内容区玻璃化）、Reduce Transparency 行为。
   - WWDC25 与 Liquid Glass 相关的设计 session（"Meet Liquid Glass"、"Get to know the new design system" 或同等官方页）：材质构成分层（sampling / blur / tint / highlight / shadow / lensing / glow）、"控件大则更厚"是否官方表述、hierarchy by layout and grouping 原句出处。
   - Microsoft Fluent 2 / WinUI Materials：Mica 与 Acrylic 各自适用面、官方 Acrylic 参数（tint opacity、luminosity opacity、blur 半径若公开）、多层 Acrylic 警告原文、Fallback 色规则。
   - `prefers-reduced-transparency` 媒体查询：规范状态与 Chromium / WebKit / Gecko 支持面（MDN 或 caniuse，标访问日）。
   - Radix Themes Shadows 档位（已在 surface-hierarchy 引用，只登记行，不再摘录）。
2. **转录值表**：每条只写可直接进 token 的数字或闭集词（blur 半径、tint / opacity、阴影档、允许对象集合），标来源行与段落；没有公开数值的写"未公开"，不估算。
3. **本地对照**：`app/web/styles.css` 中现有材质 token（`--glass`、`--glass-muted`、`--glass-alpha`、`--rim`、`--rim-alpha`、`--shadow-float`、`--shadow-alpha`）与两处 `backdrop-filter`（`.jump-latest-button` 12px、context popover 16px saturate 1.4）按 file:line 列出；对照 WK-69 四层与 WK-101 六层映射，标"符合 / 越层 / 无回退"，不改文件。
4. 结论 ≤ 10 行，只陈述观察；不写"建议采用"。

## 不得

写产品代码；下裁定；把整篇 HIG 塞进卷；估算未公开数值；访问需要登录的页面。

## 验收

Fable 消费为 FE-05 取值与 WK-102 token 闭集；来源行进 `engineering/design/sources.md` 由 Fable 转录。
