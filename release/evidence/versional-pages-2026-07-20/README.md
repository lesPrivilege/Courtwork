# VERSIONAL-LANG-1 · Pages 线上复核证据

公开入口：<https://lesprivilege.github.io/Courtwork/>。这不是 `v0.1.2` 重发；tag、Release、DMG
及未公证边界不变。本目录只记录版本学皮层与新产品图在 GitHub Pages 的真实部署状态。

## 第一轮 · 产品提交 `2e2a570`

Pages workflow [`29702923819`](https://github.com/lesPrivilege/Courtwork/actions/runs/29702923819) /
job [`88234949698`](https://github.com/lesPrivilege/Courtwork/actions/runs/29702923819/job/88234949698)
对精确 head `2e2a570e3ef53bc5dd286433571c89f17ad5b119` 成功；guard、build、artifact 与 deploy
全为 success，运行时间 `2026-07-19T20:39:35Z` 至 `20:40:01Z`。

仓内固定 Playwright Chromium `1.61.1` 直接访问公开 URL，分别取 `1280×860`、`375×900`、
reduced-motion 与 JS-off 四个独立上下文。完整机器结果见 `round-1.json`：

- 四种上下文均 HTTP 200、零 console/page error、零破图；桌面与窄屏均
  `scrollWidth === clientWidth`。
- 桌面选择三枚 1440 WebP，窄屏与 JS-off 选择三枚 720 WebP。远端 HTML/CSS/JS 与本提交
  逐字节相等；六枚 WebP 亦逐字节相等并复现 `SITE-SHOTS-VERSIONAL-1` 的六个 SHA。
- 版本学计算态成立：`.scenario-proof` 左右界均 `0px`；前三条 promise 内界均 `0px`，末界
  `1px`；`.site-marginalia` 为 `1px 0 1px 0`。平框刊记仍显示 `v0.1.2`、ad-hoc／未公证边界与
  既有 64 位 DMG SHA。
- reduced-motion 的三条 720 请求因桌面布局最终选择 1440 `srcset` 候选而以
  `net::ERR_ABORTED` 取消；这不是资源失败：最终三图完整，六枚远端候选另经 curl HTTP/字节
  校验全部通过。
- DMG 入口跟随重定向返回 HTTP 200；本批不重建或替换既有制品。

| 文件 | 像素尺寸 | SHA-256 |
|---|---:|---|
| `round-1-desktop-1280x860.png` | 1280×6301 | `d9d7c8e5d5de600ad1bc956bf7eaa0757cf007d361e7d854b369b40e178cb7a0` |
| `round-1-narrow-375x900.png` | 375×8673 | `71f281a80fe3858b8fbd0ccbbbc918589f6ae065c29f5d691890593d56225344` |
| `round-1-reduced-1280x860.png` | 1280×6301 | `924fda6093c0946f9f2dcd41db9db2443158bf02cea9d93369f1dc64b1da5552` |
| `round-1-js-off-375x900.png` | 375×8673 | `61f172312151a554bc4ec9b6f782ad0e84aafcf801f44a0483d429566e81040a` |

四张全页帧逐张目视：抬头、刊记、版本学 proof、三幅新产品图、scenario 台账、承诺组界、眉批与
卷尾均没有遮挡、破图或旧皮层回流。窄屏为单列，不发生裁切。

## 第二轮 · 记录提交 `71299a6`

Pages workflow [`29703178460`](https://github.com/lesPrivilege/Courtwork/actions/runs/29703178460) /
job [`88235631001`](https://github.com/lesPrivilege/Courtwork/actions/runs/29703178460/job/88235631001)
对精确 head `71299a6c9f449ab402f657c14f60bfe998837f82` 成功；guard、build、artifact 与 deploy
全为 success，运行时间 `2026-07-19T20:47:46Z` 至 `20:48:08Z`。

使用全新的四个浏览器上下文重跑同一协议，`round-2.json` 与第一轮的结构性结果逐项相等：
四上下文 HTTP 200、零 console/page error、零破图；桌面／窄屏无横向溢出；响应式候选分别为
1440／720；proof、promise 与眉批计算线级仍为 `0/0`、`0/0/0 + 1` 与 `1/0/1/0`。
公开 HTML/CSS/JS 和六枚 WebP 再次与本地逐字节相等。两张主帧逐张目视也未见遮挡、破图、旧皮层
或例行分隔线回流。

| 文件 | 像素尺寸 | SHA-256 |
|---|---:|---|
| `round-2-desktop-1280x860.png` | 1280×6301 | `c0272a6faa977adee681ec4dbd8cd96d18c3b5de7bc658eaf99ecfe253c439d5` |
| `round-2-narrow-375x900.png` | 375×8673 | `4d246577d361b145a26d84b48d93589d353b83424515df7cc60df55991fe49dc` |
| `round-2-reduced-1280x860.png` | 1280×6301 | `924fda6093c0946f9f2dcd41db9db2443158bf02cea9d93369f1dc64b1da5552` |
| `round-2-js-off-375x900.png` | 375×8673 | `e8ac9ed50db7243399d3cbae93d02e775155c217376d9cbc750cf5e2686a4a28` |

> **两轮公开页复核放行。** 第一轮产品提交与第二轮记录提交都由精确 head 的 Pages workflow
> 成功部署；版本学编排、新产品图、响应式／JS-off／reduced-motion 和既有发布真值均成立。
