# VERSIONAL-LANG-3 · 双宗后帧与 Pages 截图替换

采集日期：2026-07-20。desktop 由本工作树在独立 Vite 端口启动；Chromium 新上下文固定
`1440×900`、DPR 1、`colorScheme: dark`、`prefers-reduced-motion: reduce`。三帧都实际断言根
`data-theme="dark"` 后采集；首帧通过测试 profile 写入已完成 turn journal，再由应用真实
`ChatMarkdown` 路径渲染，未改 DOM；后两帧沿既有合成数据试点交互采集。

| 原始帧 | 状态 | SHA-256 |
|---|---|---|
| `frames/01-chat-markdown-dark-1440x900.png` | Chat Markdown 真渲：任务清单、删除线、引文、斜体、三层列表、代码与表格；危险链接无导航、原始 HTML 不执行 | `ff910fe11cf6344610ca8024b2719542e617ea8196b35c9dfe555f93399a7178` |
| `frames/02-risklist-settled-dark-1440x900.png` | RiskList R04 已确认 | `00dfbce9b5eadb49c4175be90aa1a7835c704c82970fbeb4cfa9b1f31407d711` |
| `frames/03-revision-focus-dark-1440x900.png` | Focus 修订工作面 | `22b26eca1907432667aff12856fc62a084a20ee3b2a47cad08f4cd96c93d03f8` |

以 `cwebp -q 85` 原尺寸生成 1440×900，以同源 PNG `-resize 720 450` 生成响应式配对：

| Pages 资产 | SHA-256 |
|---|---|
| `11-milestone-markdown-1440.webp` | `490a61d83675223d6c104deac03f82e2d5fdadd5772bfa01e47fd0994ff0aa9d` |
| `11-milestone-markdown-720.webp` | `eb9f078813b8dee0edce015abac395ac0aef01789deb1dbd3944aa56860ce11e` |
| `12-milestone-risklist-1440.webp` | `998fdead2c8c588e015f88f4e03fa4ee654d25e48a9914abaf0d1367fd8cbaf8` |
| `12-milestone-risklist-720.webp` | `311d95ec9ac48f90ecdec96dcf12a429dab632aa7b3cd14be657bc13f436e6a1` |
| `13-milestone-redline-1440.webp` | `4e32c70791fd6d8ce8fdcbde7a3cfcbed131d0df8d0a9c9eb2d4e010be81c407` |
| `13-milestone-redline-720.webp` | `3d6746af4cf5ceb35403b06b32c0be149613907588693a2d4aabf4e9d5e73f42` |

`screenshot-manifest.json` 以固定清单把三张源 PNG 与六枚 Pages WebP 双向逐字节封存；
`site:guard` 逐项复算，任一资产缺失、增删或改一个字节都会定点失败。RELEASE-VERIFY-1
还对源 PNG 与 Pages WebP 分别落盘追加一字节，均观测定点红；还原后复绿，截图替换不依赖
本说明表的口述可信度。

视觉读法：三层磁青负责空间，泥金只落案件重要标题；文书正文、风险数据、状态语义与人工朱印
仍守各自色槽。Focus 帧左上标题完整、不碰窗口安全区；三态均无 composer 横向溢出。

线级迁移补账：VERSIONAL-LANG-2 已退去 `.progress-card` 上下线、文书纸面外框、文书标题底线与
粘贴展开顶线，但 P1 平铺账及 `assert-rule-grammar` 的活分类仍误留旧值。本批没有再改消费 CSS；
只把 P1-N038／N039／N052／N085／N092 从“留/minor”前向迁为“退/none”，逐行记
`supersededBy=VL2-L02`，并加入退役复活门。此修正让账面与已经独立验收的消费事实一致。

证据边界：这些是浏览器承载的真实 desktop UI，用于 Pages 产品图，不冒充 Tauri 原生壳证据。
本批没有改变壳行为；P4 双主题与 P2-L21 溢出的 WKWebView 权威证据仍由各自独立验收承担。

## Pages 双宗后帧

`capture-site.mjs` 在同一 1280×900 Chromium 上分别以 light／dark 媒体宗重载完整站面；两宗
均 `overflow=0`、`brokenImages=0`，Hero 字重均为 700。浅宗解析为
`bg #F7F8FA / important-title #232B38`；深宗解析为
`bg #0F1622 / important-title #D9AE6A`，正文仍为 `#E4E9F1`，没有跟随标题变金。

| 后帧 | SHA-256 |
|---|---|
| `site-frames/pages-light-1280.png` | `71245229ceedf4b3d33fd7a8f6d0178cac1707b5b363c9aa088c276b0fb0679c` |
| `site-frames/pages-dark-1280.png` | `625fc12a56901c79b64e00e861ed7b3024ea9998518e3887e79445634345bf15` |
