# LE · 原生 SVG 候选

> 历史首稿。对外署名已更正为 **les Privilege**；后续几何与 Anthropic 对照见[当前品牌登记](../../les-privilege/README.md)。本页及预览保留当时输出。

从 `brand/geometry/mark.svg` 的竖笔与长、长、短节奏出发，重新构造 LE 厂商署名。它是独立品牌探索，未替换 CourtWork 产品标识。参考会话与两张用户图见[来源记录](../../../engineering/research/le-brand-2026-09-11/README.md)。

## 造型裁定

短横与竖笔连成连续 L；上两横等长，上横与竖笔顶齐。64 格画布内，墨迹边界为 8–56；笔画厚 10，横向留白 10，行间留白 9，圆角 2.5。底横超出竖笔的长度为 28，上两横长 28，但相对于右侧横线起点，底横可见长度为 18，因此右端提前收住。以平直轮廓、适度圆角和稳定留白建立识别，不添加斜切或尖角。

推荐单色作为基础署名：缩小、反白和印刷时仍保留全部结构。浅色双横版保留用户的另一选型，让连续 L 更先被看见。Anthropic 用户参考仅用于理解紧凑字母拼合与厂商署名场景，没有描摹其字形。

## 文件

- [预览](index.html) / [PNG 对照](preview.png)：原生 CourtWork、LE 单色、LE 分色及 16–64 px 和明暗署名示意。
- [le.svg](le.svg)：`currentColor`，适合内联。
- [le-light.svg](le-light.svg) / [le-dark.svg](le-dark.svg)：明确填色，适合 `<img>`。
- [浅底分色](le-hierarchy-light.svg) / [深底分色](le-hierarchy-dark.svg)。

图标只有 path/rect 等原生 SVG 元素，无字体、位图、脚本或外部资源。外部 `<img>` 中的 currentColor 不会继承宿主 CSS，请用明确填色版本；重复内联时需为 title/desc ID 加唯一前缀。预览中的 Leo/LE 文字是系统字体场景示意，不属于图标导出。

运行 `python3 brand/studies/le-2026-09-11/build.py` 可确定性生成 SVG、HTML 和几何/hash 清单。作者完成 XML 元素与资源检查、重建一致性检查，并实看浏览器对照及 PNG；属于候选自检，不代表独立品牌接受。正式署名采用与部署另行处理。
