# COMPOSER-FLOW-COMPACT-1 · 首页 composer/chat 流测宽收紧

日期：2026-07-18

来源：隔离 worktree `codex/site-composer-tighten`，desktop Vite `127.0.0.1:18884`，真实样板案 UI，画幅 `1440×900`，`deviceScaleFactor=1`，`prefers-reduced-motion: reduce`。

## 根因

`--content-measure: 760px` 同时约束 chat 正文列和 composer。在首页卷宗局部的宽主栏里，两者一起显得过宽。

## Before / After

- `before/11-dossier-before-1440.webp`：替换前首页卷宗局部。
- `after/11-dossier-composer-tightened-1440.png`：收窄后的真实应用帧；`--content-measure=640px`，`.composer-stack=640px`，内容列与 composer 同轴，零弹层残留。

本帧仍使用虚构样板案数据；「临江精铸」等主体不是生产案件，也不代表 product-live。站点实际消费的 1440/720 WebP 已同步替换为该 After 帧的等比派生。
