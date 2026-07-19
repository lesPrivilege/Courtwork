# Pages 线上复核证据 · 2026-07-19

复核对象为公开 Pages `main@19242d273f12b53f4d41086ff2ba18405404ad21`，
workflow run `29688703720`。环境为 macOS `26.5.2`、Safari `26.5.2`；
由 System Events 操作 Safari，使用 `screencapture -l 48987` 直接摄取原生窗口。
PNG 未裁切、缩放、压缩、标注或修图。

## 两轮读法

| 文件 | Safari 状态 | 像素尺寸 | SHA-256 |
|---|---|---:|---|
| `round-1-hero-safari.png` | 第一轮；宽窗、100% 缩放、首屏 | 3164×1942 | `c97a13bb706668939884cf1b936b4c54c6727d2433cc03e91f0ec3bab33e01ac` |
| `round-1-scenarios-safari.png` | 第一轮；宽窗、缩小四档、Legal/卷宗/PM 台账 | 3164×1942 | `49da1ae47f0afd7af37abe616f901ebae2d696dcc20ab5f2ce5a98231f8daf4e` |
| `round-1-ledger-safari.png` | 第一轮；宽窗、缩小四档、承诺与收尾 CTA | 3164×1942 | `78392adf44ba2d73c3828d56fc9fd3f50ef40bc5619e3ce5d6f529c71a477611` |
| `round-2-narrow-safari.png` | 第二轮；逻辑窗宽 430、100% 缩放、首屏单列 | 996×1854 | `3c772cf17fc14313e90f9312188c88ed4becc2837a821b0740f00f63cc40b029` |

第一轮逐帧目视确认 wordmark、四节点微演示、版本/SHA/下载入口、Legal 合同、
卷宗 `20 / 47 / 14 / 8`、PM `Schema catalog preview / 尚未接通运行链`、四项承诺
与收尾 CTA 全部在场且无破图、截断或错误声称。第二轮在窄窗确认导航、标题、两枚 CTA、
64 位 SHA 与微演示按单列重排，未见横向溢出或文字遮挡。

Codex Browser 运行时按现行技能排障后返回可用浏览器列表为空，故本次没有冒充
in-app Browser 证据；采用发布手册既有的 Safari/System Events 真机路径。

## 远端同源与下载真值

- 公开 `index.html`、`styles.css`、`main.js`、`assets/icon.svg`、`assets/og.png`
  分别与 `19242d2` 工作树对应文件逐字节 `cmp` 相等。
- 远端 SHA-256：HTML `41dcfaaf…2d6`、CSS `c8ef7d60…290e`、JS
  `f0f036e7…9620`、icon `0ba0d9cd…71d1`、OG `b6dc58b5…0384`。
- `v0.1.2` DMG 重新下载为 `4,679,277` bytes，SHA-256
  `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d`；
  仓库随附校验文件实跑 `shasum --check` 通过。

本目录只证明本次公开站部署及原生 Safari 实看；现行 desktop 新皮层源帧和 Pages 三幅消费者
另见 `site/craft-evidence/SITE-SHOTS-SKIN-REFRESH-3/`，不在这里重复造证。
