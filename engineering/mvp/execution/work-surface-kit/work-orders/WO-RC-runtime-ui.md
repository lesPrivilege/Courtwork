# WO-RC · Runtime 控制面 UI（Opus）

状态：骨架；基线后第一张施工单。端口 8850，数据目录 `/private/tmp/se-agent-rc-data`（schema 4）。

## 输入

`engineering/migration/2026-09-08/runtime-control-frontend-intake.md`（RC-1…RC-10 与 §5 消费裁定、§6 Agent Limits 模式）；`runtime-control-frontend-explore.md`（EX-RC1）；`docs/runtime-control/INDEX.md`、`api.md`、`acceptance.md`；`app/runtime/control-contract.d.ts`。

## 写权

`app/web/**`；新增 `runtime` 内容模块建议独立文件 `app/web/runtime-view.mjs`，`app.mjs` 只加 WS-09 静态 kind 映射与三处 Settings 扩展入口。

## 不得

画后端未做的能力（OAuth、stdio、插件隔离、memory / workflow / hook / registry）；三态开关图形；Retry 按钮于 unknown 效果；prompt template 直接发送；新颜色或图标家族。

## 交付物与验证

按 `docs/runtime-control/acceptance.md` 前端义务逐条 fixture 验证；409 两类各一反例；`characters` 标注"字符，不是 token"；`delivery.md` 按体例。验收 Astra / Luna。
