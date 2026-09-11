# CW Pages common-red 修补回执

2026-09-11 · Luna 有界施工。基线为 `cf4ab5604ba5a7319fc35121c818d75f516e79b3`，分支为 `codex/pages-common-red-20260911`，工作树为独立的 `pages-common-red-20260911/Courtwork`。本回执只覆盖 CourtWork Pages 的普通 Hero action 色；不覆盖 App、schema、provider、部署或 Paper 正文。

## 改动

现有 [site/src/site.css](../../../site/src/site.css) 将 Hero 的 `Review the paper` 链接从 `--campaign-attention-review` 拆到独立的普通 action role：

- `--campaign-action: #c95e55` 在浅色和深色 media 分支保持同一个 Paper 已接收的 common-red 值。
- `--campaign-action-ink: #10161a` 在两个 scheme 保持同一深墨色，14px 标签在红色填充上达到 4.529:1，满足 4.5:1 文字门槛。
- `.hero-action-paper` 仍是可点击的 Paper 链接，保留 href、48px 最小命中高度、窄屏布局、hover 下划线和 forced-colors 的系统色回退。
- `.review-attention` 与 `.fig .fig-attention` 继续使用 `--campaign-attention-review`（浅 `#b3262d`、深 `#ed9396`）；`--campaign-diff-*` 声明不变。Review、danger、diff 的角色没有被普通 action 色覆盖。
- [page.mjs](../../../site/src/page.mjs) 的品牌锁定仍是中性墨色；当前 Pages 源没有另一个普通 brand-red 使用点，因此没有改 `brandIcon()`、brand SVG、图形 registry 或截图。品牌资产的 common-red 来源仍由 Paper 接收记录维护。

这是 Visual 层的局部 token/selector 修正。最近先例是同一文件已有的 `.hero-actions .hero-action` action 几何，以及 [red-control-research.md](red-control-research.md) 对 Pages CTA 与 Review marker 分离的记录；Semantic、Projection/Control 和 Placement 关系保持不变。

## 检查

作者在独立 worktree 运行了与变更对应的检查，原始输出见 [evidence/pages-common-red-20260911](../../../evidence/pages-common-red-20260911/)：

- `node site/build.mjs`：构建完成，输出记录在 [build.log](../../../evidence/pages-common-red-20260911/build.log)。
- `node site/scripts/check-figures.mjs`：15 个 registry figure 通过，Review 红点仍按 registry 记录，见 [figures.log](../../../evidence/pages-common-red-20260911/figures.log)。
- `node site/scripts/check-links.mjs`：263 个本地引用通过，见 [links.log](../../../evidence/pages-common-red-20260911/links.log)。
- `node site/scripts/check-material.mjs`：Pages 独立材料规则通过，见 [site-material.log](../../../evidence/pages-common-red-20260911/site-material.log)。
- `node tools/lint-colors.mjs`、`node tools/lint-materials.mjs` 与 `node tools/contrast-report.mjs` 均通过；这些既有工具主要覆盖产品 token，普通 Pages action 的专门对比度结果见 [action-contrast.json](../../../evidence/pages-common-red-20260911/action-contrast.json)。
- `node --test site/scripts/public-data.test.mjs site/scripts/capture-plan.test.mjs`：5/5 通过；`node tools/check-pages-semantics.mjs` 报告 13 slots / 15 figures，见 [public-data-capture-plan.log](../../../evidence/pages-common-red-20260911/public-data-capture-plan.log) 与 [pages-semantics.log](../../../evidence/pages-common-red-20260911/pages-semantics.log)。
- `node tools/check-doc-links.mjs` 与 `git diff --check` 通过，见 [doc-links.log](../../../evidence/pages-common-red-20260911/doc-links.log) 与 [diff-check.log](../../../evidence/pages-common-red-20260911/diff-check.log)。
- `node site/scripts/check-capture-ready.mjs` 通过；由于本次明确不重拍既有截图，capture batch 与 source 关系保持不变，见 [capture-ready.log](../../../evidence/pages-common-red-20260911/capture-ready.log)。

本次未运行 CUA 或全量 App 测试，也未部署；Root/Astra 负责把同一候选放进独立浏览器检查并作非作者 diff/视觉复核。本记录是作者施工与源级自检，不是产品接受或线上发布回执。
