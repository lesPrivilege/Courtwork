# VERSIONAL-LANG-3 · Pages 首轮线上证据

验收对象：`main@4531f036012ea6cde04e6604f27a70cc23ed136d`。
公开入口：<https://lesprivilege.github.io/Courtwork/>。本轮只发布 Agent／Pages 共用的
磁青深宗、冷白浅宗、泥金重要标题和重摄产品截图；`v0.1.2` tag、DMG 与签名／公证边界不变。

## Workflow 真值

- Pages run [`29711205146`](https://github.com/lesPrivilege/Courtwork/actions/runs/29711205146)／
  job [`88255270285`](https://github.com/lesPrivilege/Courtwork/actions/runs/29711205146/job/88255270285)：
  `success`，精确 head `4531f036012ea6cde04e6604f27a70cc23ed136d`。
- workflow 的 deslop guard、静态构建、artifact 上传和 Pages deployment 全绿；artifact ID
  `8448991288`，deployment 日志明确创建并放行同一 head。
- `origin/accept/pilot-live-2` 与 `origin/codex/site-shots-refresh` 在删除前再次证明为远端 main
  祖先，随后逐枝删除；未做广域 prune。

## 线上字节同源

公开 HTML、CSS、JS 和本轮六枚响应式 WebP 均与该 head 的 `site/` 文件逐字节相等：

| 资源 | SHA-256 |
|---|---|
| `index.html` | `c20e4982db8e3fae99a85503e563aa948d104a215686c4e9d6183bf205b6021d` |
| `styles.css` | `1a2bb13c83e2f1b4f694ca06c601a6ec1285f0f3fbc82e32b7ad01f15f6a9259` |
| `main.js` | `f0f036e78e463bc8710f1ce9bbdf32b2777277f0151fc5742b8a8e28bbba9620` |
| `11-milestone-dossier-1440.webp` | `4a5977fb9fc87a3624efe62ec6bd47c745429d2d1303611e6343adbaf4f13460` |
| `11-milestone-dossier-720.webp` | `253ede4ad467b9b6472663314c6c6b00dcb02701324b4560ef6bf80870c173a2` |
| `12-milestone-risklist-1440.webp` | `49c01137331d4f31b06279a5a85670543b10e7c36d5a4fc124d100141cd21afe` |
| `12-milestone-risklist-720.webp` | `3cf9838856c090f4eed0c115a815632181ae0c4f8e242ddd6cfc1ab7569d512b` |
| `13-milestone-redline-1440.webp` | `4e32c70791fd6d8ce8fdcbde7a3cfcbed131d0df8d0a9c9eb2d4e010be81c407` |
| `13-milestone-redline-720.webp` | `3d6746af4cf5ceb35403b06b32c0be149613907588693a2d4aabf4e9d5e73f42` |

## 实看与强制双宗矩阵

macOS `26.5.2` 的应用内真实浏览器先在 `1280` 宽公开页实看：Hero 文字为
“模型只生成，不裁决。”，宋体栈解析为 `Noto Serif SC` 首选、`font-weight:700`；页面
`scrollWidth === clientWidth === 1280`，四图全载入，console／page error 为空，两个 DMG
入口、`v0.1.2` 与 64 位 SHA 均在。

随后用仓库锁定的 Chromium `149.0.7827.55` 对同一公开 URL 强制 light／dark、
`1280×900`／`375×900` 四上下文，滚遍页面并等待全部图片 `naturalWidth > 0` 后取证：

| 宽度 | 宗 | `--bg-app` | `--important-title` | Hero / 正文 | Hero weight | 横溢出 | 破图 |
|---:|---|---|---|---|---:|---:|---:|
| 1280 | light | `#F7F8FA` | `#232B38` | `rgb(35,43,56)` / `rgb(35,43,56)` | 700 | 0 | 0 |
| 1280 | dark | `#0F1622` | `#D9AE6A` | `rgb(217,174,106)` / `rgb(228,233,241)` | 700 | 0 | 0 |
| 375 | light | `#F7F8FA` | `#232B38` | `rgb(35,43,56)` / `rgb(35,43,56)` | 700 | 0 | 0 |
| 375 | dark | `#0F1622` | `#D9AE6A` | `rgb(217,174,106)` / `rgb(228,233,241)` | 700 | 0 | 0 |

四张全页帧均为公开 URL 原始浏览器截图，未裁切、缩放、压缩、标注或修图：

| 文件 | 像素 | bytes | SHA-256 |
|---|---:|---:|---|
| [`pages-light-1280.png`](pages-light-1280.png) | 1280×6324 | 1,232,617 | `04ede265421b556b39ebffdb61110c851fc5e3177fae20ac861db3f3d3556f47` |
| [`pages-dark-1280.png`](pages-dark-1280.png) | 1280×6324 | 1,232,792 | `b0fbe1e882620856331e4fae11db08e53b966a62d1ff8f72fcefdb2e71c903d3` |
| [`pages-light-375.png`](pages-light-375.png) | 375×8687 | 691,151 | `98dc47cc2442ee8260853580028fdaf2e46ea2d1c2bd2406f8e3eedb9351c94e` |
| [`pages-dark-375.png`](pages-dark-375.png) | 375×8687 | 693,277 | `84e278a5bf09187970d8d48871e5e99add40adbd0553ec812b24a2e33bf26afe` |

逐张实看确认：深宗保持深磁青语义，泥金只落 Hero／卷级主句；正文、数据和 Agent 截图内
数据轨没有被金色污染。窄屏单列无裁切、叠压或水平滚动，三枚重摄 Agent 产品图均清晰可达。

> **首轮线上复核放行。** 本记录提交只补部署证据，不改变站面消费值；它触发的下一次 Pages
> run 作为第二轮线上同源复核对象。
