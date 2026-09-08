# WO-WK8 · slogan、按钮降级、CourtWork 命名与窗口控件留位（Fable）

状态：待 WO-WK6 合流后执行。基线 = WK6 合流 SHA。

## 改动

1. 首页 hero 一行改为 "Work that exists beyond the model."（WK-26）；placeholder 不变。
2. `#use-edit-message`（Use as draft）`primary-button` → `secondary-button`（WK-25）；其余七处保持。
3. 核对铅灰 skin 下实心按钮 = ink，无蓝钢残留（grep `#315c8a` 应仅在 `skins/gray-steel.css`）。
4. 产品名改为 CourtWork（WK-29）：`<title>`、侧栏头部 wordmark 行、文案；grep 不再出现 "Schema Engineering"（PAPER 链接除外）。
5. 侧栏头部三行结构与窗口控件留位（WK-30 / WK-31）：shell 条 52 px、左 80 px 禁区、`data-shell="desktop"` 与 WCO 两路启用；官方接口键名以 EX-WK4 卷为准写入 CSS 注释；fixture 页可切换 `data-shell` 预览。

## 验证

Home 10 项与 UI 20 项反例；编辑弹窗 Tab 顺序不变；`data-shell="desktop"` 下左上 80 × 52 区域内无可点击元素（DOM elementFromPoint 断言）；纯浏览器下布局与 WK6 合流态逐像素一致。验收 Astra / Luna。
