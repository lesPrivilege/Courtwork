# BG 线接续裁定 · Claude 接手

2026-09-10。用户裁定：BG 线后续由 Claude 接手，工单派 Opus，Fable 持架构。基线 `main@461ab12`（BG-01 验收记录之后，无产品代码变动）。BG-01 已有界接受，见 [验收记录](acceptance-20260910.md)。

## 顺序

| 片 | 状态 | 依据 |
|---|---|---|
| BG-02 首片：Run 显式承接血缘 | 本轮派单，[WO-BG-02](work-orders/WO-BG-02-run-lineage.md) | 认领文档要求"新增 attempt 前定义 lineage/权限/不可变历史"；human-loop 研究要求不可恢复的执行"进入显式关联的新执行流程"，不偷偷重发。今日 restart 后 Run=unknown，人只能以新 commandId 重发，两次执行之间无持久关联。 |
| BG-03 外部动作回执 | 延后 | DS-04 触发条件（产品出现明确受权外发需求）尚未成立；无真实消费者不建 intent/receipt 存储。 |
| 授权编辑器 UI | 排队 | `app/web` 当前已有 CC-I（`settings-view.mjs`/`styles.css`）与 MA2-02（coordination 视图）两个显式不重叠写者，不派第三写者。待两者合流后按单 writer 队列进入，消费 BG-01 的 `policy`/`inspect`/disclosure 接口。 |

## BG-02 裁定

- **BG02-D01 Attempt owner 是 host 执行 owner（RuntimeStore Run）。** Core `app_run` 不改，Core4/app5 不动。不新建 attempt 实体或表；血缘是 Run 记录上的一个字段 `supersedes`（前一次 Run 的 ID 或 null）。attempt 序号沿链推导，不存储。
- **BG02-D02 只在创建时设定，此后不可变。** `POST /sessions/:id/runs` 请求体扩为 `{input, commandId, supersedes?}`；无更新路径。模型与 runtime 不创建 Run，故无法自报血缘。
- **BG02-D03 合法目标。** 目标 Run 须存在、同一 Session、已终态且状态属 `unknown|failed|cancelled`。`completed` 拒绝（`supersede_completed`）；目标已被另一 Run 承接则拒绝（`supersede_conflict`，血缘为链不为树）；目标 `error.code === 'mcp_effect_unknown'` 拒绝（`effect_unreconciled`，外部效果核对属 BG-03）；目标不存在或跨 Session 统一 `404 not_found`，不泄漏他 Session 的 Run 存在性。
- **BG02-D04 不复制输入。** 承接 Run 带自己的 `input` 与 `commandId`，服务端不从目标 Run 复制 prompt；旧 prompt 与旧 launch 不重放（沿 AM-B 合同）。承接 Run 读取旧 async task 走既有同 Session 显式 get/wait，本片不改 async。
- **BG02-D05 幂等身份含血缘。** command 回执比较 `(sessionId, commandId, input, supersedes)`：同 commandId 而 `supersedes` 不同即 `409 command_conflict`。唯一性与链检查在 `store._mutate` 串行闭包内完成，与 commandId 检查同处。
- **BG02-D06 迁移。** RuntimeStore 8→9，沿既有模式：先按旧 schema 完整校验，再以 `wx` 写精确字节备份 `runtime-state.schema8.<sha256>.json`，再发布；旧 Run 补 `supersedes: null`；可升级列表加入 8；旧 host 拒绝 schema 9。`validateState` 的 Run `exactKeys` 按 `schema >= 9` 接纳该字段。
- **BG02-D07 不加事件类型。** 本片不新增 `run.*` 事件；`GET /sessions/:id` 返回的 runs 已含记录字段。UI 投影若需血缘，另单裁定。
- **BG02-D08 恢复。** 承接 Run 在重启时与其他 Run 一样转 `unknown`，链仍合法，可再被承接。Run 创建是单次 `_mutate`，无可撕裂的第二标记。
- **BG02-D09 范围外。** 无调度器、无自动重试、无 Core 变更、无 UI、无 async/MCP/coordination 变更、无真实 provider。
- **BG02-D10 证据格式。** 每份测试日志首行记录命令、并发参数与工作树 SHA（BG-01 验收非阻断项 1 转为规则）。作者验证不等于接受；固定 SHA 的 Sonnet 只读探查与 Fable 裁定另记。

## 待裁定（不阻塞施工）

- `completed` Run 是否允许"重做"式承接。本片拒绝；若产品需要，另定语义与理由。
- 是否在 inspect 的 `recovery` 提示中加入 `lineage: 'supersedes'`。本片不改。
