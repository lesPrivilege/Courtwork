# WO-RC · Runtime 控制面 UI（Opus）

状态：已派发 2026-09-09（额度恢复后）。基线 = `claude/wk6-home-brand` `9ef1710`（WK6 + WK8 之上叠加；WK7 色彩支另行合流）；worktree `<isolated-checkout>`，分支 `claude/rc-runtime-ui`，端口 8850，数据目录 `/private/tmp/se-agent-rc-data`；交付 `delivery-rc.md`。端口 8850，数据目录 `/private/tmp/se-agent-rc-data`（schema 4）。

## 输入

`engineering/migration/2026-09-08/runtime-control-frontend-intake.md`（RC-1…RC-10 与 §5 消费裁定、§6 Agent Limits 模式）；`runtime-control-frontend-explore.md`（EX-RC1）；`docs/runtime-control/INDEX.md`、`api.md`、`acceptance.md`；`app/runtime/control-contract.d.ts`。

## 写权

`app/web/**`；新增 `runtime` 内容模块建议独立文件 `app/web/runtime-view.mjs`，`app.mjs` 只加 WS-09 静态 kind 映射与三处 Settings 扩展入口。

## 不得

画后端未做的能力（OAuth、stdio、插件隔离、memory / workflow / hook / registry）；三态开关图形；Retry 按钮于 unknown 效果；prompt template 直接发送；新颜色或图标家族。

## 交付物与验证

按 `docs/runtime-control/acceptance.md` 前端义务逐条 fixture 验证；409 两类各一反例；`characters` 标注"字符，不是 token"；`delivery.md` 按体例。验收 Astra / Luna。

## 补充（2026-09-08 深夜，WK-26 / WK-27）

- 消费面：`docs/runtime-control/api.md` 全部路由——`GET/PUT /runtime-control`（CAS，revision）、`GET /runtime-resources?kind=`、`GET /runtime-resources/:id`（来源检查）、`POST /runtime-resources/:id/invoke`（draft-only）、`GET /runtime-context`（effective-next-run，`characters` 非 token）与 `?sessionId&runId`（recorded）、`POST /runtime-permissions/evaluate`、`POST /mcp/:id/lifecycle`。类型以 `app/runtime/control-contract.d.ts` 为准（ResourceKind 五种、ScopeKind、Effect allow/ask/deny、PermissionExplanation.trace、RuntimeResource 的 installed/running/exposed/health/provenance、RuntimeComposition、ContextItem）。
- Settings 三处扩展 + `runtime` 内容模块：新文件 `app/web/runtime-view.mjs`，`app.mjs` 只加 WS-09 kind 映射与入口；`settings-view.mjs` 加三处入口。
- 后端未提供但应有的（WK-27）：先绘制，登记 `runtime-ui-gaps.md`（控件、语义、所需 API、作用域），附 `evidence/rc/planned-fixture.html`；产品内只在 Settings 底部折叠 "Planned" 区作文字行 + "Backend pending"，无控件。已知后端未做：OAuth、stdio、第三方插件隔离、memory / workflow / hook / registry adapter、tokenUsage。
- 视觉：铅灰 skin 与 WK7 角色 token；不新增颜色；行 / DataList / tab / 浮层沿编排体例与 IC-1…IC-5。
