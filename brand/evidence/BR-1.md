# BR-1 · 小尺寸 hierarchical 宿主取色

2026-09-08 · Astra 实现与浏览器观察。基线 `f8aff61be8ef7ed5e3a3d2b7a1fbb631197383fd`，独立候选 `codex/brand-host-colors`。本轮只修改brand包；应用与Opus活动工作树未改。

## 原因与裁定

16/20px hierarchical 的actor与三行record分别读取两种实色，未使用滤镜。原实现把公共CSS变量重新声明在shadow内svg上，遮住宿主继承值；默认色带蓝倾向，与几何或小尺寸材质降级无关。

WK6候选 `75a366a` 已把 `app/web/index.html` 的20px侧栏wordmark和16px会话在场标记改为hierarchical。本轮确认两处可保留该材质。完整接入须合入BR-1并由应用writer映射 `--cw-ink:var(--ink)`、`--cw-record:var(--muted-strong)`、`--cw-background:var(--panel)`，仅换material仍会使用包默认色。

实现将默认值移到各个 `var()` 使用点，保持未覆盖时的品牌默认值及theme行为；所有40份静态SVG与manifest由原构建器重新生成，geometry不变。未增加shadow piercing、hex应用补丁或新主题状态。

## 作者验证

- `node --check brand/src/symbol.mjs`、品牌构建与 `git diff --check` 通过。
- In-app Chromium 152，原有 [browser checks](../tests/browser.html) **10/10** 通过；包含动画取消、卸载、语义不越权、ID隔离与小尺寸无滤镜。
- [Host color checks](../tests/host-colors.html) **7/7** 通过：16/20px各深浅色默认与宿主填色、CSS即时更新、attribute重绘、同实例主题切换，以及background/depth/amend/mono取色。
- 实测record对WK7候选 `10f1afe` 的panel色对比度：浅宗 **5.84:1**，深宗 **7.64:1**，高于WK38约定4.5:1。测试fixture固定了该候选的role映射值，不冒充应用联调。
- 已目视实际16/20 CSS px的深浅色样板：竖线与三行可分辨，未以放大预览替代小尺寸观察。对比度数值是填色计算，非抗锯齿后逐像素最低值。

## 范围与交接

本轮未验证应用两处真实背景/在场状态、Safari、Firefox、强制色或读屏；原有验证不因此扩大。大尺寸glass/depth/luminous的渐变仍由品牌材质定义，此接口不承诺把其整套渐变染成宿主skin。外链img SVG不能继承页面CSS；应用使用现有Web Component。

应用集成需沿Fable唯一writer边界进行；WO-RC与WO-WK9不因此重排。Luna独立源码/导出复核另见 [BR-1-review](BR-1-review.md)。
