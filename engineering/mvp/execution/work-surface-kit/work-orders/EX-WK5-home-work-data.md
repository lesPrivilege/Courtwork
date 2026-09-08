# EX-WK5 · Home 三带与工作页右栏的本地数据与结构清单（Sonnet，只读）

状态：首派于额度上限中止，2026-09-09 额度恢复后重派。输出 `../explore/ex-wk5-home-work-data.md`，卷首标 `直接可消费`。

## 问题

WK-32 / WK-33 / WK-34 需要的两件事实：(1) 上带与下带能从既有 API 得到哪些已记录字段（Today 计数、按日 run 活动、工作中卡片字段）；(2) 右栏三 kind 与"放大工作面"在源码中的结构、生命周期与保留项，作为悬浮卡片 / chrome tab 两态的改造基线。

## 输入

`app/server/*.mjs` 路由与 `docs/`、`engineering/core-contracts.md`、`api` 文档中 work-summary / sessions / runs 的字段；`app/web/app.mjs` 的 surface / inspector / expand 分区（EX-WK1 §4 已给行号区间）、`inspector.mjs`、`workspace-view.mjs`、`docs/ui-composition.md`、`docs/surface-assignment.md`。

## 交付物

1. 数据可得表：字段 · 来源端点 · 是否跨会话聚合 · 分页 / 截断 · 可否按日计数 · 缺失（如无跨会话 run 列表则写明）。
2. 右栏结构表：kind · DOM 容器与 id · renderer 生命周期钩子 · 展开 / 还原 / 关闭次序 · 保留项（不得改的 id / ARIA / 焦点规则）。
3. 参考图元素 → 本地事实对照：Today 四格、热力图、Continue 卡片、Progress / Preview / Context 三卡、tab 条，各自"有数据 / 无数据 / 可派生"。
4. 结论 ≤ 10 行；未核实单列。不下裁定。
