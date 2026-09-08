# WO-WK4 · Review 纵切（Opus）

状态：骨架；依赖 WO-WK3 冻结、WO-RC 合流。端口 8851，数据目录 `/private/tmp/se-agent-wk4-data`（schema 4，独立 fixture）。

## 问题

Thread 内问题卡 / 授权卡与 Dashboard 三集合成为同一 `ReviewProjection` 的两个投影；`outcome` 为只读摘要；四态与两宽度、深浅色、键盘、reduced-motion 全部由 fixture 验证。

## 输入

`../contracts/review-projection.md`（WK-3 冻结）；EX-WK2 anatomy 表指定行；ux-conventions §1–5；UP 批次 token 与 SH-4 状态规则；`docs/ui-composition.md` 保留项。

## 写权

`app/web/**`；`app.mjs` 只在 EX-WK1 §4 标出的问题 / 授权处理与 Dashboard 分区内改动，其余区间不动。

## 不得

新增 review 状态、字段、端点；出现 accept / reject / revise 按钮；批量审批；新依赖；改 DOM id、ARIA 关系、Run / File 身份、草稿与 renderer owner；引入颜色或图标家族（UP-2 / UP-12 / DC-4）。

## 交付物

1. 两投影的实现与 fixture 种子脚本（只经 `/api/v5`）。
2. `delivery.md`：SHA、文件、验证原文、未验证、"哪一像素改变了哪一判断"。
3. 捕获：390 / 1440 × light / dark × waiting_user / failed / resolved / expired_restart。

## 必须验证（fixture 列）

inline 解决后 inbox 即时反映且反之；非 pending 永不显示按钮；失败初次展开；断连期间按钮不可用且保留最后状态；Tab 顺序与 Escape 次序不变；reduced-motion 下无动画残留；无横向溢出。

真实 provider 列：`not_run`。

## 验收

Astra / Luna 独立执行；作者不自验。
