# WO-BG-02 交付 · Run 显式承接血缘（RuntimeStore 9）

执行 Claude Opus（`opus-wo-medium`），隔离工作树 `/private/tmp/se-bg02`，分支
`claude/bg02-run-lineage`，基线 `29e1eac`（= `main@461ab12` + 两次文档提交，产品代码与
461ab12 相同）。**作者验证，不等于接受**；固定 SHA 的只读探查与裁定另记。

## 1. 落点

| 项 | 符号 | 位置 |
|---|---|---|
| S1 schema 号 | `SCHEMA_VERSION = 9` | `app/server/store.mjs` |
| S1 字段与校验 | `validateState` Run `exactKeys` 加 `supersedes`（`schema >= 9`）；其后的血缘遍历 | `app/server/store.mjs` |
| S1 迁移 | `open()` 可升级列表 `[3,4,5,6,7,8]`；旧 Run 补 `supersedes: null`；schema 8 的 `coordination` 原样保留 | `app/server/store.mjs` |
| S1 幂等身份 | `commandReceipt(state, sessionId, commandId, input, supersedes)` | `app/server/store.mjs` |
| S1 D03 检查 | `assertSupersedable(state, sessionId, supersedes)`，在 `createRun` 的 `_mutate` 闭包内、`commandReceipt` 之后、active-run 门之前调用 | `app/server/store.mjs` |
| S2 解析 | `#createRun` 的 `assertKeys` 加 `supersedes`；`text(value.supersedes, "supersedes", { max: 200 })` | `app/server/service.mjs` |
| S2 回执快路径 | `getCommandReceipt(sessionId, commandId, instruction, supersedes)` | `app/server/service.mjs` |
| S2 错误映射 | `createRun` catch 中五个 `error.code` 分支 | `app/server/service.mjs` |
| S3 合同 | `Run attempts and lineage v1 · BG-02 / RuntimeStore 9` | `app/docs/run-attempts.md` |
| S3 索引 | 一行 | `app/docs/README.md` |
| 测试 | 8 个用例覆盖 T1–T7 | `app/tests/run-lineage.test.mjs` |

错误码映射（store → HTTP）：`SUPERSEDE_NOT_FOUND` → 404 `not_found`；
`SUPERSEDE_NOT_TERMINAL` → 409 `supersede_active`；`SUPERSEDE_COMPLETED` → 409
`supersede_completed`；`SUPERSEDE_CONFLICT` → 409 `supersede_conflict`；
`EFFECT_UNRECONCILED` → 409 `effect_unreconciled`。消息为固定字符串，不含调用方数据；
404 的两种成因（不存在、跨 Session）响应体逐字节相同。

## 2. 测试与证据

| 项 | 结果 |
|---|---|
| 基线全量（`29e1eac`） | tests 467 / pass 467 / fail 0 — `evidence/backend-attempts-20260910/full-baseline.log` |
| 完工全量（`c1e7595`） | tests 475 / pass 475 / fail 0 — `full.log` |
| 本片专项 | 8 用例全通过 — `focused.log` |
| smoke | `npm --prefix app run smoke` — `smoke.log` |

测试映射：T1 与 T7 合在两个用例里（`cancelled`/`failed` 一例，SIGKILL 后 `unknown`
一例，后者同时给出 T1 要求的"`unknown` 用 restart 得到"和 T7 的链续接）；T2、T3、T4、T5
各一例；T6 两例（升级 + 备份占位拒绝；坏血缘失败关闭 + `461ab12` 旧 host 拒绝 schema 9）。
所有服务一律 `port: 0` 与 `mkdtemp` 数据目录。

## 3. 既有测试的改动

只改对 schema 号的期望，未改任何行为断言：

| 文件 | 改动 | 理由 |
|---|---|---|
| `app/tests/coordination.test.mjs` | 两处 `schemaVersion` 8→9；旧 host 拒绝正则 `/schemaVersion 8…/`→`9`；一处用例标题里的 `schema8`→`schema9` | schema 号推进 |
| `app/tests/durability.test.mjs` | `beforeRestart.schemaVersion` 8→9 | 同上 |
| `app/tests/control-plane.test.mjs` | `state.schemaVersion` 8→9 | 同上 |
| `app/tests/runtime.test.mjs` | 持久文件 `schemaVersion` 8→9 | 同上 |
| `app/tests/async-tasks.test.mjs` | `store.state.schemaVersion` 8→9 | 同上 |
| `app/tests/async-recovery-independent.test.mjs` | 两处 `schemaVersion` 8→9；旧 host 拒绝正则 8→9 | 同上 |
| `app/tests/attention-agent.test.mjs` | `store.state.schemaVersion` 8→9 | 同上 |
| `app/tests/request-telemetry.test.mjs` | `store.state.schemaVersion` 8→9 | 同上 |

`app/tests/runtime.test.mjs:13` 的用例**标题**仍写 `schemaVersion 8`。它不是断言，按红线
"不改既有测试断言"未动，列入下方待裁定。

## 4. 限度

- 血缘串行性由 `store._mutate` 的单队列保证，论证在代码注释里；**没有**针对"两个请求同时承接
  同一 Run"的竞态用例。既有 `control-plane.test.mjs` 的 race 用例覆盖的是 commandId 竞态。
- `mcp_effect_unknown` 目标用 store 直写夹具状态构造（工单允许），未走真实 MCP unknown 路径。
- 未测 schema 3/4/5/6/7 直升 9 的完整链路；既有迁移用例覆盖 6→9 与 7→9，本片新增 8→9。
- 无 UI、无新事件类型、无 Core/async/MCP/coordination 变更、无真实 provider（D09）。

## 5. 待裁定

1. **请求体里显式写 `supersedes: null`** 目前是 400 `invalid_input`（工单："出现时须为非空字符串
   ≤200"）。若产品希望"显式声明无血缘"合法，需另裁。
2. **`validateState` 的血缘校验弱于创建门。** 按工单 T6 只校验：`null`、或指向同 state 内同
   Session 的**已终态** Run。因此一个（只可能由外部改写产生的）状态文件若含分叉（两个 Run 承接同一
   目标）、承接 `completed` Run、或承接 `error.code === 'mcp_effect_unknown'` 的 Run，仍可打开。
   是否把链唯一性也提升为文件级不变量，待裁定。
3. **拒绝优先级未在裁定中给出。** 实现取 D03 的列举顺序：不存在/跨 Session → 未终态 →
   `completed` → 已被承接 → `effect_unreconciled`。多个条件同时成立时的答案由此确定。
4. **`app/README.md` 仍写 "Store schema v8（validated v3/v4/v5/v6/v7 upgrade）"**，`app/docs/README.md`
   第 8 行的锚点指向它。该文件不在本片写权内，未动；需要一次跨片的 schema 文案更新。
5. **不可变性靠"没有路径"而非存储拒绝。** `store.updateRun(id, patch)` 仍是通用 `Object.assign`，
   进程内调用方理论上可以事后写 `supersedes`。是否让 `updateRun` 显式拒绝该字段，待裁定。
6. `app/tests/runtime.test.mjs:13` 的用例标题仍称 schema 8（见上）。是否允许修正标题，待裁定。
7. **投影面。** `publicRun` 整体克隆记录，故 `GET /runs/:id`、`GET /sessions/:id` 与既有 work
   投影自动带上 `supersedes`。D07 只说不新增事件；UI 如何呈现血缘仍未裁定。
8. 承接 `completed` Run 的"重做"语义、以及 `inspect.recovery` 是否加 `lineage: 'supersedes'`，
   沿用 bg02-rulings.md 已列的两条待裁定，本片未动。

## 6. 状态

停在 `claude/bg02-run-lineage`，不合流、不推送、不 rebase。等 Fable 派 Sonnet 做固定 SHA 只读探查。
