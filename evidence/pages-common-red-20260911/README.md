# Pages common-red 修补证据

2026-09-11 · 基线 `cf4ab5604ba5a7319fc35121c818d75f516e79b3`，分支 `codex/pages-common-red-20260911`。

本目录记录一次有界 CSS 修正：Hero 的可点击 `Review the paper` action 使用 Paper 已接收的 `#c95e55` common-red，浅深相同；文字使用 `#10161a` 深墨色。Review marker 仍为 `--campaign-attention-review`，diff 与 danger 颜色未改。没有改 App、schema、brand SVG、figure registry 或截图。

- [action-contrast.json](action-contrast.json) 对比度与 token 分离结果。
- [build.log](build.log)、[figures.log](figures.log)、[links.log](links.log)、[site-material.log](site-material.log) 为 Pages 构建与站点门输出。
- [lint-colors.log](lint-colors.log)、[lint-materials.log](lint-materials.log)、[contrast-report.log](contrast-report.log) 为既有颜色/材料/产品对比度工具输出。
- [public-data-capture-plan.log](public-data-capture-plan.log)、[pages-semantics.log](pages-semantics.log)、[capture-ready.log](capture-ready.log) 为数据、Pages 语义与截图批次门输出。
- [doc-links.log](doc-links.log)、[diff-check.log](diff-check.log)、[page-syntax.log](page-syntax.log) 为文档、差异与语法检查输出。

日志是作者检查结果；浏览器与最终接受由 Root/Astra 独立完成。完整文件 hash 见 [manifest.json](manifest.json)。
