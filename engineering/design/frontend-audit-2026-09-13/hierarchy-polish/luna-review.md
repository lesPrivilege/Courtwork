# Luna 非作者源码与截图复核

2026-09-13。复核范围是 Settings hierarchy polish 的单文件候选，不构成完整视觉接受。

## 固定对象

- 隔离树分支：`codex/ui-hierarchy-polish-20260913`；基线 HEAD：`11cfe4a5b5e9012a5d21c369ad2808703f37e5d2`。
- 复核源码：[`app/web/styles.css`](../../../../app/web/styles.css)，`git diff HEAD -- app/web/styles.css` 的 SHA-256：`2232ae1c9c8ce0fd8190c8df96708d7f7f65eb41220d2ed847395f1777c14c07`。当前完整样式文件 SHA-256：`ccad4d1d042625b09cd49bd920f0b079f7e8380d1d9b9fb390790fdad1772037`，与[`checks.json`](checks.json)一致。
- 我没有改动产品源码；只新增本审阅记录。检查依据包括[当前状态](../../../current.md)、[前端连续性合同](../../agent-interface-2026-09-10/frontend-contract.md)、[Settings 导航先例索引](../../agent-interface-2026-09-10/precedent-map.md)中的 `settings.navigation`，以及[层级登记](../hierarchy-polish-registration.md)。

## 源码结论

在这个固定 diff 上，没有发现阻止继续的源码合同冲突。M1 把实色边界放在 `.settings-sections`，保留它作为 `overflow: auto` 的垂直滚动 owner；Runtime 控制器仍由 `mounts.overview.closest(".settings-sections")` 找到同一容器，并保存、恢复其 `scrollTop`。宽表仍由 `.runtime-table-scroll` 横向滚动。[`runtime-view.mjs`](../../../../app/web/runtime-view.mjs) 2346–2388、[`styles.css`](../../../../app/web/styles.css) 5358–5411、[`styles.css`](../../../../app/web/styles.css) 4464–4468

候选没有改 Settings DOM、字段、权限或 Runtime mount。`.settings-block` 类仍在原节点上，因此 `settings-view.mjs` 的过滤仍可按行隐藏块；在两个或更多 tabpanel 命中查询时，CSS 只把这些面板的标题切回普通流，避免多个 sticky 标题竞争同一顶部位置。零命中提示仍是滚动面内第一个子节点；窄屏显式 `auto minmax(0, 1fr)` 两行，给导航下方内容保留可收缩的滚动轨。[`index.html`](../../../../app/web/index.html) 422–428、[`settings-view.mjs`](../../../../app/web/settings-view.mjs) 2105–2133、[`styles.css`](../../../../app/web/styles.css) 5374–5398、5434–5438、5616–5620

Settings 几何 token 值未改；本候选复用现有 `--settings-measure`、`--float`、`--line`、`--radius-container` 与 `--focus`。它没有增加 blur、颜色、z-index 档或新的语义状态，符合连续性合同的 owner 与材质边界。应用中已有多处 `:has()` 消费者；本候选沿用该语法，不引入新的浏览器能力类别。

焦点处理也与滚动 owner 对齐：tabpanel 本身不再画随其长内容延伸的轮廓；当直接子 tabpanel 获得 `:focus-visible` 时，完整的内缩焦点环画在可见 `.settings-sections` 面上。它保留可见焦点，同时避免长面板轮廓的上下边缘滚出视口。候选仍用现有焦点 token，并通过 `scroll-padding-top` 为 sticky 标题留出滚动空间。

## 一项非阻塞观察

低严重度：[`styles.css`](../../../../app/web/styles.css) 5409–5412 的 `.settings-block:last-child` 按 DOM 末项收掉底部分隔线和 40px 组间距。搜索过滤在[`settings-view.mjs`](../../../../app/web/settings-view.mjs) 2113–2130 按行切换 `.settings-block[hidden]`；若 DOM 最后一块被隐藏，最后一个可见结果块仍可能保留底部分隔线和组间距，形成结果尾部留白。这不改变设置或搜索语义，也不阻止本片；本轮保留为后续视觉抛光观察。

## 四张图的有限复核

我查看了固定的[before General 1440](before-general-1440.png)、[final General 1440 light](final-general-1440-light.png)、[final Runtime focus 1440 light](final-runtime-focus-1440-light.png)和[final Runtime 390 light](final-runtime-390-light.png)。对比图中，General 保留原左侧对齐与内容列位置，候选以单一实色平面承载配置内容、用底部分隔线组织分组；1440 焦点图里滚动面的完整焦点环及上下边缘可见，标题没有遮住顶边；390 图中导航选择器仍位于内容面上方，长 Runtime 文案正常换行，未见水平溢出。截图只证明这些捕获状态的构图，不证明交互路径或滚动行为。

以上是截图查看，不是我在浏览器中的独立操作或回放。Astra 的作者浏览器覆盖与更广截图按[`README.md`](README.md)及相关图片记录；作者证据与本非作者源码判断分开。

## 检查与边界

我独立运行并通过：

- `node --test app/tests/settings-navigation.test.mjs app/tests/settings-preferences.test.mjs`：35/35。
- `node tools/lint-colors.mjs app/web/styles.css`。
- `node tools/lint-shapes.mjs app/web/styles.css`。
- `node tools/lint-materials.mjs app/web/styles.css`。
- `node tools/check-doc-links.mjs`：全仓库 6,598 个文档链接检查通过，包含本审阅记录。

[`checks.json`](checks.json)另记录了作者对全量 CSS/交互/语义/对比度检查与 `git diff --check` 的结果；我没有重复这些全量命令，也没有运行完整产品 suite 或独立浏览器。本审阅不覆盖原生 200% 缩放、forced-colors、reduced-transparency 系统状态、读屏或所有深浅主题/宽度组合；窄视口截图不能替代这些检查。没有新增 blur 或 motion。

审阅范围到此为止：这是固定源码 diff 的非作者复核与四张静态截图观察，不替代 Astra 的浏览器记录或后续独立裁决。
