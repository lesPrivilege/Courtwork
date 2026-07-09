# SPEC: apps/desktop（W9）

状态：占位——core MVP（W1–W6）验收前不开工，先出专项 Design

## 定位

三栏工作台：左 = 案件/session 列表（一案一文件夹一持续上下文）；中 = 对话流 + 场景卡片（按钮是主入口，聊天框是兜底）；右 = 结构化交互（时间线 / 关系图谱 / 矩阵审阅 / 修订预览，全部可点击溯源回原文）+ 确认节点交互。

## 已定约束（Design 阶段的输入）

- 壳选型倾向 Tauri v2（docs/05 结论），Design 阶段最终定
- UI 是 core 事件流协议的纯客户端，不含业务逻辑
- 前端组件基线：vis-timeline / AntV G6 / AG Grid Community / react-pdf-highlighter（license 已核，见 docs/05）
- 每个关键产出节点留人确认（交互护栏，产品纪律）
- 所有对 artifact 的修正是 schema 级操作，经 core 落 RevisionEvent

## 测试策略（W9 排期时细化）

回归：Playwright 驱动，进 CI。探索性 QA：computer use 类 agent（Codex / Claude）按场景剧本自由操作找断点，出缺陷报告，不做回归基础——届时立 spike 工单验证效果。

## TODO（跨层放入区）

（空）
