# 变体画板（静态 HTML）

2026-09-09，Fable。与 Claude Design 画布 [CourtWork Shell Layouts](https://claude.ai/code/artifact/f0b8d9b9-01fc-4dff-bcdb-390ad6f2a24c) 同源，画布无法加载时用浏览器直接打开这些文件。线框级，几何用真实 token（nav 256 / 220、chat 640 / 740、rail 360、gutter 24、安全区 80×52）；热力格与数字是占位，不是数据。每张画板的根元素固定 1440×900（WorkC 为 1680×900），浏览器窗口小于此宽度时横向滚动即可。

| 文件 | 内容 |
|---|---|
| WorkCurrent.html | 现状：nav 256 · chat 740 · 浮动 rail 360 |
| WorkA.html | A：导航收图标 64 · chat 640 · doc 640（本轮不做） |
| WorkB.html | B：nav 256 · 文档面 1136 + tab strip，← Chat 切回（推荐，1024–1679） |
| WorkC.html | C：1680 真三栏 nav 256 · chat 640 · doc 688（推荐，≥1680） |
| HomeCurrent.html | 现状：composer 820 于 0.56，Today strip，列表 |
| HomeBand.html | D0-B：composer + 次级模块带（Today + 模块位 + Usage 行）（选向） |
| HomeRail.html | D0-C：composer 740 + 右侧折叠摘要列 320 |

选向（WK-116）：Work B + C，Home D0-B；视觉复核待用户。
