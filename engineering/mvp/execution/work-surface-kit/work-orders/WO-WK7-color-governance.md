# WO-WK7 · 色彩三层治理与深宗（Fable）

状态：骨架；依赖 EX-WK3 与 WO-WK6 合流。端口 8854。

## 交付

1. `contracts/color-governance.md`：Tier S / R / U 定义、稳定项与可变项、对比门槛、skin 与宗的替换规程、dystopia 映射。
2. `styles.css` 重构：Tier S 完整 scale（含 accent 1–12）；Tier R 别名；`:root[data-theme="dark"]` 与 `prefers-color-scheme` 两路；组件 CSS 去 hex。
3. `tools/lint-colors.mjs`：hex 只允许在 Tier S 块；CI 可跑。
4. 预置两 skin（Radix gray + 钢蓝；Radix slate + indigo）与两宗，四组合对比度表。

验收 Astra / Luna；四轴视觉判断留用户。
