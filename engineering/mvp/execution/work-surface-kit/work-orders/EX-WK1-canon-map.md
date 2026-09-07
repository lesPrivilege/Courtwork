# EX-WK1 · 本地 Canon 映射（Sonnet，只读）

状态：骨架；开工待基线 SHA。输出 `../explore/ex-wk1-canon-map.md`，卷首标 `直接可消费`。

## 问题

当前 fresh 候选的每个人机表面属于 Canon 哪一类、事实 owner 在哪、是否重复上游原语、是否编码 SE 不变量。对应索引 §12 Phase A / B。

## 输入

- 基线：`codex/fresh-courtwork` `<SHA>`（待填）。
- `app/web/*.mjs`、`app/web/styles.css`、`app/web/index.html`；`docs/ui-composition.md`、`docs/interface-components.md`、`docs/ui-orchestration-contract.md`；`engineering/design/ux-conventions.md`；`engineering/core-contracts.md`；`app/runtime/control-contract.d.ts`。
- 索引 §3（五类）、§3.2（ReviewItem 信封）、§10（组件树词表），只作对照列，不作评价标准。

## 写权

只写输出卷与 `evidence/ex-wk1/`（如需 grep 结果原文）。不启动服务，不改任何文件。

## 交付物

1. 本地摸底表（体例 §2 格式）：Navigator、Home 三集合、Thread 用户消息 / 助手正文 / 工具 ledger / 活动行、问题卡、授权卡、Run 检查栏（Results / Usage / 诊断）、File（Current / Recorded）、Workspace、Settings、连接卡、composer、放大工作面、`outcome` kind。每行给 `file:line`。
2. 状态词表：run 八态、question 四态、connection、work-summary 字段，各自在 `thread-projection.mjs` / `app.mjs` 的投影位置。
3. ReviewItem 映射草表：信封每字段 → 既有字段或 `无`；`无` 不建议补，只登记。
4. `app.mjs` 职责分区：按函数簇列出行号区间（会话状态、导航、草稿、run 准入 / 恢复、dialog / renderer 生命周期、问题 / 授权处理），供 WO-WK4 决定最小写入面。
5. 结论 ≤ 10 行；未核实项单列。

## 不得

不给"应改为"；不引用社区实现评价本地；不读取数据目录与凭据。
