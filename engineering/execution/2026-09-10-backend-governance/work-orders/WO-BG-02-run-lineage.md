# WO-BG-02 · Run 显式承接血缘（RuntimeStore 9）

派单人 Fable，执行 `opus-wo-medium`。裁定见 [bg02-rulings.md](../bg02-rulings.md) BG02-D01…D10。基线 `main@461ab12`。

**这一片要证明的事**：一次 Run 以 `unknown|failed|cancelled` 终结后，人可以发起一次新的 Run 并**持久地**声明它承接前一次；历史不可变，链不分叉，不复制旧输入，不自动重试。今日两次执行之间没有任何持久关联。

## 0. 写权与红线

- 隔离工作树 `/private/tmp/se-bg02`，分支 `claude/bg02-run-lineage`，`app/node_modules` 已软链到主树。测试起服务一律 `port:0`，数据目录一律 `mkdtemp`；不占用任何固定端口。
- **写权**：`app/server/store.mjs`、`app/server/service.mjs`、新增 `app/docs/run-attempts.md`、`app/docs/README.md`（只加一行索引）、新增 `app/tests/run-lineage.test.mjs`、`app/tests/fixtures/` 下本片新增夹具、证据目录 `evidence/backend-attempts-20260910/`、交付文档 `engineering/execution/2026-09-10-backend-governance/delivery-bg02.md`。
- **不得**改 `app/core/**`、`app/web/**`、`app/harness/**`、`app/runtime/**`、`app/extensions/**`、`app/server/async-tasks.mjs`、`app/server/async-task-state.mjs`、`app/server/coordination*.mjs`、`app/server/index.mjs`（路由已存在，请求体在 service 解析）。不新增依赖。不改既有测试断言以迁就新行为；既有测试因 schema 号或 `exactKeys` 而失败的，只改其对 schema 号的期望并逐项记入交付文档。
- 若发现合同与现状冲突，写进交付文档"待裁定"，不自行扩大范围。

## 1. 实现项

**S1 Store 字段与迁移**（`app/server/store.mjs`）。`SCHEMA_VERSION` 8→9；Run 记录增加 `supersedes: string|null`；`validateState` 对 Run 的 `exactKeys` 按 `schema >= 9` 接纳，且校验其值为 `null` 或指向同 state 内同 Session 的已终态 Run（校验发生在 `validateState`，坏文件失败关闭）。升级分支的可升级列表加入 8；升级时给每个旧 Run 补 `supersedes: null`；备份文件名 `runtime-state.schema8.<sha256>.json`，`wx` 写入，沿现有代码。`createRun` 接收 `supersedes`，在 `_mutate` 闭包内、`commandReceipt` 之后、active-run 门之前完成 D03 全部检查；`commandReceipt` 的输入比较扩为含 `supersedes`（同 commandId 不同 supersedes → `COMMAND_CONFLICT`）。错误以 `error.code` 区分：`SUPERSEDE_NOT_FOUND`（不存在/跨 Session，合并为一码）、`SUPERSEDE_NOT_TERMINAL`、`SUPERSEDE_COMPLETED`、`SUPERSEDE_CONFLICT`、`EFFECT_UNRECONCILED`。

**S2 Service 解析与映射**（`app/server/service.mjs` `#createRun`）。`assertKeys` 接纳 `supersedes`（可选；出现时须为非空字符串 ≤200，否则 400 `invalid_input`）。回执快路径 `getCommandReceipt` 同样带 `supersedes`。Store 错误映射：`SUPERSEDE_NOT_FOUND` → 404 `not_found`；`SUPERSEDE_NOT_TERMINAL` → 409 `supersede_active`；`SUPERSEDE_COMPLETED` → 409 `supersede_completed`；`SUPERSEDE_CONFLICT` → 409 `supersede_conflict`；`EFFECT_UNRECONCILED` → 409 `effect_unreconciled`。消息固定、无用户数据。

**S3 合同**（新增 `app/docs/run-attempts.md`，英文，体例沿 `coordination.md`：标题 `Run attempts and lineage v1 · BG-02 / RuntimeStore 9`）。写明：owner、字段、创建时设定且不可变、合法目标与五种拒绝、链不分叉、幂等身份含血缘、不复制输入、不重放、迁移与旧 host 拒绝、重启后承接 Run 自身转 unknown、范围外（调度器/自动重试/Core/UI/async/MCP/BG-03）。`app/docs/README.md` 加一行索引。

## 2. 测试（`app/tests/run-lineage.test.mjs`，体例沿 `coordination.test.mjs` 与 `async-recovery-independent.test.mjs`）

真实 host + `local-fake` provider，HTTP 走 `POST /sessions/:id/runs`：

- T1 正例：Run A 经 stop 或 fake 失败进入终态（分别覆盖 `cancelled`、`failed`；`unknown` 用 restart 得到），Run B 带 `supersedes: A.id` 创建成功；`GET /sessions/:id` 中 B 的 `supersedes === A.id`，A 记录字节不变。
- T2 链：C 承接 B 成功；D 再承接 B → 409 `supersede_conflict`；A 已被 B 承接，E 承接 A → 409 `supersede_conflict`。
- T3 拒绝：承接 `completed` → 409 `supersede_completed`；承接运行中的 Run → 409 `supersede_active`；承接不存在 ID 与另一个 Session 的终态 Run → 两者都是 404 `not_found` 且响应体相同；目标 `error.code==='mcp_effect_unknown'`（用 store 直接写入夹具状态或现有 MCP unknown 路径）→ 409 `effect_unreconciled`。
- T4 幂等：同 commandId + 同 input + 同 supersedes → 返回同一 Run、`idempotent`；同 commandId + 不同 supersedes → 409 `command_conflict`；带 supersedes 的请求体多一个未知字段 → 400。
- T5 不复制：B 的 `user.message` 事件文本是 B 自己的 input，不含 A 的。
- T6 迁移：手写 schema8 状态（体例见 `coordination.test.mjs` 的 schema6 用例）→ 打开 → 备份文件名/字节精确、旧 Run 均 `supersedes:null`、备份只有一份；存在同名备份路径（含符号链接）→ 拒绝且原文件字节不变；schema9 文件交给"旧 host"（断言 `validateState` 对 `schemaVersion:9` 在旧列表下的拒绝路径，或以 git archive 的 `461ab12` store 打开 → 拒绝）。坏 `supersedes`（指向不存在/跨 Session/未终态 Run）的 schema9 文件 → 打开失败关闭。
- T7 重启：B 运行中 SIGKILL（`startCrashHost` 体例）→ 重开 → B 为 `unknown` 且 `supersedes` 仍为 A.id → F 承接 B 成功。

## 3. 验收

- 开工先在基线跑全量 `node --test tests/*.test.mjs ../tests/*.test.mjs`（在 `app/` 下）并记数；完工再跑，记 before/after。
- `npm --prefix app run smoke` 通过。
- 证据目录 `evidence/backend-attempts-20260910/`：`focused.log`（本片测试）、`full.log`（全量）、`smoke.log`，**每份首行写命令、并发参数与 `git rev-parse HEAD`**（BG02-D10）；`README.md` 分列作者验证与未检项，不写"独立接受"。
- 交付文档逐项记：每项落在哪个符号、限度、既有测试的改动与理由、待裁定。
- 不合流。完成后停在分支上等 Fable 派 Sonnet 固定 SHA 探查。
