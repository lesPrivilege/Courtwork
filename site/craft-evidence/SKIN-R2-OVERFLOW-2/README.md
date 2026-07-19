# SKIN-R2-OVERFLOW-2 · 焦点态窗口首行安全区

状态：独立 clean clone 与真实 Tauri/WKWebView 已放行；验收报告见
`acceptance-b9c1bf1/README.md`。

权威签署投影：`../SKIN-R2-P2/OVERFLOW-SIGNATURE.md` 的 `P2-L21`。

## 实物与红证

- 产品补充帧：`13-milestone-redline-1440 copy.tiff`，SHA-256
  `1b223334e4a96af42670ef3db79e5ed53e08acb202b73094e45d9662398d4af2`。
- 产品原文：「左上仍有溢出」。
- 1440×900 Focus 真状态中，detached chrome 的应用按钮右缘为 `139px`，Preview 返回钮左缘仅
  `19px`；既有 AppKit／应用动作压在返回、标题和计数之上。P2-L21 首跑定点红：要求
  `backLeft ≥ chromeRight + 8`，实际 `19 < 147`。

## 最小实现与后帧

- 唯一消费值：`.workspace.focus-mode .preview-host-head` 的左内距复用既有
  `--window-chrome-detached-title-safe-inline`。
- 该变量继续由 AppKit 动态锚宽、现有 sidebar/search 按钮和净距推导；没有新增固定窗口坐标、
  DOM、状态、token、颜色、字体、字重或动效。
- 1440×900 后测：`chromeRight=139`、`backLeft=148`（净距 `9px`）、`titleLeft=186`、
  `titleRight=242`、`metaLeft=250`（标题与计数净距 `8px`）。
- 浏览器后帧：`../SITE-SHOTS-VERSIONAL-1/frames/03-revision-focus-1440x900.png`，SHA-256
  `04f0d72251aee2e78b1d5f44b31bebe9d4124c8e519f3e66d6d1604fe877df11`。

## 门与边界

`apps/desktop/tests/e2e/p2-layout.spec.ts` 新增 P2-L21 真实几何断言，锁 chrome→back 最少 8px、
back→title 原有 2px、title→meta 原有 8px。平铺档位账新增唯一 Agent 中间档映射，并以缺行注入
定点失败。非 Focus Preview、P2-L19 案件标题、P2-L20 composer、focus/back 行为与数据面均不动。

新概念：**0**。本轮只补上 P2-L19 动态安全区遗漏的第二个真实消费面。
