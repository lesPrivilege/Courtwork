# 文案交付与作者检查

基线 `d03b1198cc3cb3dd65388c0b55f6b02c89efbcf9`。本轮由Astra修改与检查，不声称独立接受。实际变更为首页、Paper入口、Features/Experts、README及其生成源；`PAPER.md`只改导读。

## 最近先例与grammar

沿基线 `site/src/page.mjs` 的 `hero()` / `primaryEntries()` 和 `site/src/product-pages.mjs` 的 `shell()`；前次[发布面裁定](../pages-ordered-integration-2026-09-11/README.md)与[自然叙事](../public-narrative-2026-09-10/README.md)提供最近实现。已读前端连续性合同与先例索引，本片属于现有Pages排版内的文字替换，没有新增控件、皮肤、状态语义或视觉grammar。保留字号、布局、材质、SVG和固定合成媒体。

## 检查记录

- 构建与README生成源同步；[两次构建哈希](verification/build-parity.json)一致。
- Pages本地链接104文件/263引用、14图、材质1样式表检查通过。
- [三路由矩阵](verification/results.json)：首页、Features、Experts各1440/1280/390、light/dark共18场景无横向溢出。Paper入口同宽度与主题附加采图。
- 作者逐图检查首页1440浅色/390深色、Paper同两场景、Features390浅色、Experts1440浅色，文字未截断、重叠；此处保存六张候选截图，不替代历史baseline。
- 既有无脚本检查原先硬编码旧标题，第一次53/54通过；已更新DOM和原始HTML两处标题断言，保留来源媒体、正文与无脚本完整性检查。最终[浏览器回执](verification/browser.json) **54/54通过**，见[完整日志](verification/browser.log)；覆盖无脚本、键盘、200%缩放、明暗对比度、reduced-motion/transparency、forced-colors与图矩阵。另一次浏览器运行在构建一致性检查同时进行时中断于页面节点读取；该运行不算通过，停止重建后重新运行。

[桌面首页](verification/index.html-1440-light.png) · [手机首页](verification/index.html-390-dark.png) · [桌面Paper](verification/paper-1440-light.png) · [手机Paper](verification/paper-390-dark.png) · [Features](verification/features.html-390-light.png) · [Experts](verification/experts.html-1440-light.png)

原生宿主和读屏软件未测；App、Core与provider无改动，不跑其全套测试或付费模型。论文正文、历史快照、产品截图和SVG源未修改。未部署；现有Chat设计及后端研发余项沿原合同保留。

仓库[文档链接](verification/doc-links.json)检查952份文档/4592引用通过（添加本回执链接前计数）；提交前再次检查。
