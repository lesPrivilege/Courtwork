# VERSIONAL-LANG-3 · 双宗后帧与 Pages 截图替换

采集日期：2026-07-20。desktop 由本工作树在独立 Vite 端口启动；Chromium 新上下文固定
`1440×900`、DPR 1、`colorScheme: dark`、`prefers-reduced-motion: reduce`。三帧都实际断言根
`data-theme="dark"` 后采集；fixture、DOM、交互与数据未改。

| 原始帧 | 状态 | SHA-256 |
|---|---|---|
| `frames/01-workbench-dark-1440x900.png` | 三栏工作台 | `de660fe0dfbd39bbb9debaa57b86ce477480b227874284859bd240beeed0d73f` |
| `frames/02-risklist-settled-dark-1440x900.png` | RiskList R04 已确认 | `689e816e9c3078a0de3da4a01fd4356ffdb4a0e2cafe3ac868c2d025fb2249c3` |
| `frames/03-revision-focus-dark-1440x900.png` | Focus 修订工作面 | `22b26eca1907432667aff12856fc62a084a20ee3b2a47cad08f4cd96c93d03f8` |

以 `cwebp -q 85` 原尺寸生成 1440×900，以同源 PNG `-resize 720 450` 生成响应式配对：

| Pages 资产 | SHA-256 |
|---|---|
| `11-milestone-dossier-1440.webp` | `4a5977fb9fc87a3624efe62ec6bd47c745429d2d1303611e6343adbaf4f13460` |
| `11-milestone-dossier-720.webp` | `253ede4ad467b9b6472663314c6c6b00dcb02701324b4560ef6bf80870c173a2` |
| `12-milestone-risklist-1440.webp` | `49c01137331d4f31b06279a5a85670543b10e7c36d5a4fc124d100141cd21afe` |
| `12-milestone-risklist-720.webp` | `3cf9838856c090f4eed0c115a815632181ae0c4f8e242ddd6cfc1ab7569d512b` |
| `13-milestone-redline-1440.webp` | `4e32c70791fd6d8ce8fdcbde7a3cfcbed131d0df8d0a9c9eb2d4e010be81c407` |
| `13-milestone-redline-720.webp` | `3d6746af4cf5ceb35403b06b32c0be149613907588693a2d4aabf4e9d5e73f42` |

`screenshot-manifest.json` 把三张源 PNG 与六枚 Pages WebP 逐字节封存；`site:guard` 逐项复算，
任一资产缺失、增删或改一个字节都会定点失败，截图替换不依赖本说明表的口述可信度。

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
| `site-frames/pages-light-1280.png` | `04ede265421b556b39ebffdb61110c851fc5e3177fae20ac861db3f3d3556f47` |
| `site-frames/pages-dark-1280.png` | `b0fbe1e882620856331e4fae11db08e53b966a62d1ff8f72fcefdb2e71c903d3` |
