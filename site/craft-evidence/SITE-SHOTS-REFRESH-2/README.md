# SITE-SHOTS-REFRESH-2 · 完整工作台重拍

日期：2026-07-17；应用来源：本分支 `apps/desktop`，独立 Vite `127.0.0.1:18431`，浏览器画幅 `1440×900`。

本轮只替换 Pages 的工作台媒体与响应式展示规则：每张源帧都是完整浏览器视口，不做横向偏移或工作面裁切。

- `01-revision-full-1440x900.png`：修订预览与逐项确认。
- `02-timeline-full-1440x900.png`：47 件时间线与来源引用。
- `03-party-graph-full-1440x900.png`：14 个主体、15 条关系，待布局稳定后截取。
- `04-review-matrix-full-1440x900.png`：10×7 审查矩阵。
- `05-pages-wide-1280x720.png`：重拍后的 Pages 首屏；标题与完整工作台在桌面双栏内并列。

Pages 资产由以上 PNG 等比转码为 `1440×900` 与 `720×450` WebP。`work-crop` 改为完整 `16 / 10` 画幅与 `object-fit: contain`，宽屏容器上限由 `1120px` 调整为 `1440px`。
