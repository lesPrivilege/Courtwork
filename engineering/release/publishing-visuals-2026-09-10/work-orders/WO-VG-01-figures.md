# WO-VG-01 · 图的盘点、首张 plate、影像 QA

状态：**骨架**。写者待 U-VG2；EX-VG1 回来后补第 3 项的断言清单。

## 输入

- [intake](../intake.md) VG-1…VG-12
- [registry 草案](../visual-semantic-registry.md)
- 现有图：`site/src/page.mjs:117`（FIG. 00）、Anatomy 仪器、`site/src/assets/diagram.svg`、`site/src/pricing.mjs`
- 权威语义：SE `papers/src/canonical.md` 9.6 §5.4（`:427-445`）、`:25-29`、`:526`

## 工作项

1. **盘点**：registry 末表四类图逐一对照 registry 条目、VG-2 ②③、VG-5，结论分为保持 / 修订 / 移除。修订先出对照图，不直接改。
2. **首张新 plate · `pipeline`**：SVG，`plate` grammar。必须表达：Store 中存量随时间增长；Govern 是视觉重心（contract、status、version、authority、applicability）；Retrieve 只“定位候选”，不授予效力；Compile 产出宽度不随存量增长的工作集。位置：`#long-work` 或 Paper 入口，二者择一，由写者提出、Fable 裁定。caption 标 `concept`。
3. **影像 QA 检查**：`site/scripts/check-figures.mjs`，覆盖 VG-10，并注册进现有构建检查与 `pages.yml`。失败态必须能复现为退出码 1。
4. **manifest**：`site/src/assets/figures/figures.json`，每图记录 id、registry 概念、status、grammar、renderer、源文件哈希、reduced-motion 回退、alt/desc。

## 写入范围

`site/src/assets/**`、`site/src/page.mjs`（仅图的挂载点）、`site/scripts/check-figures.mjs`、`.github/workflows/pages.yml`（仅注册检查）。不改 campaign token，不改 `app/web`。

## 验收

- 构建、`check-links`、`check-material`、`check-figures` 全过；双主题、390 / 1440、reduced-motion、无 JS 截图各一。
- 首张 plate 去色后仍可读。
- 用户按四轴判定；Fable 核对语义；Astra 合流。
