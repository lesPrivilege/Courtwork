# P03/DRT-03 第一片 · Agents API Runtime Adapter 协议与绑定

2026-09-15 · 本页是 [原研究记录](README.md) P03/DRT-03 第一片（协议与绑定）的裁决与证据回填。原 README、输入包及其哈希不变；本页与 `evidence/` 为追加事实，不替换任何原文。外部依据为 2026-09-15 实际抓取的官方 Agents API 文档与 beta streaming-events reference（`evidence/docs-20260915/` 字节与哈希可复核）。本轮不接触真实凭据、不改 Core schema、不把 managed Codex 绕回 Pi loop、未改任何既有产品文件。

## 裁决

| # | 裁决 | 事实 owner / 后果 |
|---|---|---|
| R1 | 冻结最小 Runtime Adapter DTO 于 [`app/runtime/agents-api-contract.d.ts`](../../../app/runtime/agents-api-contract.d.ts)：createSession / submitInput / cancelTurn / submitToolResult / observe / reconcile / settle / close。远端 session/turn/item/call ID 只作观察并随 CW 身份并列保存，不取代 CW Session/Run。 | Astra 冻结；Host 仍拥有身份、准入与回执。未接 service，不影响 Pi。 |
| R2 | 结算只输出建议：`settle()` 返回 `completed / failed / cancelled / unknown` 建议与理由，Run 状态写入仍归 Host。 | 与 `app/server/service.mjs` 现有 finalStatus 逻辑一致；adapter 无写权。 |
| R3 | 事件按 `event_id` 去重；缺 `event_id` 的事件只能成为 `native.unknown` 诊断，不参与合并、不结算。恢复按 `item_id` 合并；`id: null` 的旧式条目不可键控，计 malformed，不凭位置编造身份。 | 依 S05 恢复程序实现；未恢复的中间事件保留 coverage gap。 |
| R4 | 终态只认根 turn 的原生终局（`turn.subagent_id === null` 的 completed/failed/cancelled）；`idle`、完整文本、流关闭都不是成功；取消 intent（`agent.session.input.cancel`）必须由 `turn.cancelled` 确认，否则保持 unknown；副作用未对账时 completed 也降为 unknown。 | 对应原表“取消有终态或明确未确认”“unknown 不重放”。 |
| R5 | 能力边界：`environment:none` 的协议映射已 fixture 验证；self_hosted / openai_hosted 整条 lane 本轮 unsupported；`exposureOf` 只有 `verification: 'live'` 才能返回 available，文档与 fixture 都不得提升。未核实能力一律 unavailable。 | `capabilityRows()` 29 行逐项标注 support/verification/documented。 |
| R6 | 本片不导入官方 SDK、不发网络请求、不取凭据；SDK 只固定精确 npm 产物。managed harness 未经适配层绕回 Pi loop；Host 的工具准入、审批与回执仍走原 owner。 | 运输层由 Host 注入 `AgentsApiTransport`，实现留待真实探针片。 |
| R7 | 原 README 的“外部 beta、SDK、environment、function 与恢复协议主张本轮未独立核验”更新为：**协议与文档事实已本地核验并固定字节**；**服务端行为、账号资格与真实返回仍未核验**，故 lane 不对外可见。 | 修正事实层级，不扩大为服务可用。 |

## 精确版本与固定身份

| 项 | 冻结值 | 证据 |
|---|---|---|
| 文档修订 | 2026-09-15 抓取；14 个官方 `.md` 页面共 324,388 字节，逐文件 SHA-256 | `evidence/docs-20260915/manifest.json` |
| Beta 头 | `OpenAI-Beta: agents=v1`（SDK 自动附带，cURL 需显式） | quickstart.md |
| 端点 | `POST /v1/agents/sessions`；`POST/GET /v1/agents/sessions/{id}/events`（`?stream=true`）；`GET /v1/agents/sessions/{id}`；`GET .../items`；`DELETE .../sessions/{id}` | `AGENTS_API_PROTOCOL.endpoints` |
| JS SDK | `openai@7.15.0`，tarball `sha256:a9428a67…afb90`（2,654,336 字节），含 `resources/beta/agents/**` 243 路径 | `evidence/docs-20260915/npm-openai-7.15.0.json` |
| streaming reference | 官方 beta 事件参考（7,916 行）固定字节 | `evidence/docs-20260915/ref_streaming-events.md` |
| items list | 参考页无 `.md` 变体；响应 schema 摘录 + 源 HTML 哈希保全 | `items-list.schema-excerpt.txt` / `items-list-source.json` |
| 仓库基线 | `caf3edbceb8cf9b535a28c547088874852752a1e`（main HEAD，含发布回执），分支 `agents-api-adapter-20260915`，隔离树 `~/Projects/.worktrees/courtwork-agents-api-adapter-20260915` | `evidence/tests-20260915/environment.json` |
| 现场 Node | v25.9.0（测试现场；仓库底线仍 `>=22.19.0`，不设新基线） | 同上 |

## native → observation 映射（本片冻结子集）

| 原生事实 | 规范化观察 | 规则 |
|---|---|---|
| `agent.session.turn.output_text.delta` | `assistant.delta` | 带 `item_id/output_index/content_index`；文本可缺席 |
| `agent.session.turn.output_text.done` | `assistant.message` | 完整正文替换缓冲；done 是文本终态，不是 Run 终态 |
| `agent.session.requires_action` → `session.required_actions` | `runtime.function_call.pending` | 函数调用与 environment_connection 分开；adapter 绝不自动执行函数 |
| `agent.session.turn.completed/failed/cancelled`（root） | `run.settlement` 建议 | failed 带限长 error；subagent 终局只出 `run.notice`，不结算 root |
| `agent.session.failed` / `environment.failed` | `run.settlement`（native-session） | 有未决函数调用/未对账副作用时降为 unknown |
| `agent.session.idle` / `in_progress` / `created` / environment.* / item.* | `run.notice` | idle 明示非终态；item 事件只带元数据，不重复正文 |
| `error` | `run.error` | 限长；不单独结算，等原生终局或流关闭 |
| 未知类型 | `native.unknown` | 只诊断，不误判终态 |
| 缺 `event_id` | `native.unknown`（`missing_event_id`） | 不合并、不结算 |

恢复（`reconcile`）按 S05 程序：保持流连接并缓冲 → 分页读取 items（`order: asc`、`limit 100`、`after` 游标）→ 读取 session pending actions → 按 `item_id` 合并、丢弃已 final 条目的缓冲更新 → 重投被保留的更新 → 恢复实时。未回放的中间事件以 `coverage.gap` 明示，不从最终文本反造工具历史。

## 能力边界（environment:none vs self-hosted）

- **none（协议已映射，对外仍 unavailable）**：session 创建/续发/取消、事件流、items 读取与恢复、function 往返（应用执行）。文档明示 none 下 bash、apply-patch、workspace 文件、executor MCP 不可用，本片一律 unsupported。usage 为 best-effort、无完整 trace 导出、无逐命令审批拦截、无 ZDR/非美驻地——均标 unsupported。
- **self_hosted / openai_hosted（整 lane 本轮 unsupported）**：executor、exec-server、自管文件与生命周期、托管 sandbox/artifacts/网络策略均未实现也未实测；即使后续实现，按 R5 未过真实探针前不得在 UI 出现可用按钮。
- 判定函数只有一条：`exposureOf(capability) === 'available'` 当且仅当 `verification === 'live'`；本片不存在 live 证据，故 29 行全部 unavailable。

## 验证证据与结果

- 定向协议测试：`node --test app/tests/drt03-agents-api-protocol.test.mjs` → **12 tests / 12 pass / 0 fail**（创建绑定与离线 fail-closed、事件去重与诊断、completed/failed/cancelled/unknown 结算、子代理与 idle 不结算、取消 intent 与确认分离、流关闭非取消、未对账副作用降级、function 往返、replay helper 一致性、分页恢复与 coverage gap）。
- 架构边界回归：`node --test app/tests/architecture-boundaries.test.mjs` → **3/3 pass**；新 runtime 模块零 import，不违反 Core/runtime/renderer 边界。
- 语法检查：三个新 `.mjs` `node --check` 全过。
- 全量 app 套件回归（隔离树，node_modules 符号链接到同提交主检出）：**1052 tests / 1052 pass / 0 fail**。该次全量在最终两处小修前启动，仅影响新模块与其测试；冻结修订以 targeted.log 的 12/12 为准。见 `evidence/tests-20260915/full-suite.log`。
- 文档链接检查：`tools/check-doc-links.mjs` → pass（1368 documents / 7553 links / 0 problems）。
- 冻结源 SHA-256、命令与未跑项：`evidence/tests-20260915/environment.json`。

**本片没有证明**（不得引用为本片结论）：真实 API 往返、账号资格与配额、SDK 实际运行、服务/UI 接线、Work Core 候选或 Decision、coding/沙箱能力、self-hosted 或托管环境、逐命令审批、精确费用与完整 trace、创建/发送的远端幂等语义（官方文档未提供，代码只做本实例 commandId 回执拒绝，不宣称远端 exactly-once）。原表 G1–G5、DF-04 状态不变。

## 下一步与退出条件

本片是原表“协议与绑定”节点的完成；后续片沿原工单顺序，不新建 roadmap：

1. **单根工具往返**：先由用户授权凭据与有界预算做一次真实探针（create → function 读源 → 回填 → 终局），再实现 Host transport 并接实验性 runtime 配置；拒绝跨源、撤权后读取零执行。真实探针前 lane 保持 unavailable。
2. **断线与取消**：以本片 settlement/cancel 语义为合同，验证 Host 重启对账、pending 回执不重放、无法确认终止保留 unknown。
3. **coding / 同 Work**：托管环境与文件回收另行核验；Core 候选与 Decision 走原 owner 与真实人审。

触发复核的条件：beta 头/事件 schema 变化、SDK 主版本变化、文档声称与本片映射不符、真实探针出现未对账副作用语义差异。相关新文件清单与索引见 [证据目录](evidence/docs-20260915/manifest.json) 与本页表格。

## Independent acceptance · 2026-09-19

The Codex line delivered this slice on 2026-09-15 as uncommitted files in `Projects/.worktrees/courtwork-agents-api-adapter-20260915` (base `caf3edb`). A non-author session (Claude Opus 5) reviewed it, committed it verbatim (`3b03cc9`) and merged it into main (`364ca59`). The four frozen sources match the SHA-256 values in `evidence/tests-20260915/environment.json`. Against slice **A** of the [v4 plan](implementation-plan-20260916.md#串行-pr-切片), the slice meets its scope: it pins the protocol, headers and SDK; it binds identity; its fixture transport shows the create, input, cancel and tool-result request shapes; and every capability stays unavailable without live verification. The plan names the six port responsibilities differently (`describe`/`start`/`recover`/…); the plan leaves naming to P03, so this is not a defect.

| Check | Result |
|---|---|
| Source review of the adapter, contract, fixture and tests | One defect (A-1); three items for slice D (A-2…A-4) |
| `node --test app/tests/drt03-agents-api-protocol.test.mjs app/tests/architecture-boundaries.test.mjs` on main | 15/15 as delivered; 16/16 with the A-1 counterexample and fix |
| `npm test` on the closure tree (main plus this slice, the A-1 fix and gap fixes N-01/N-04/N-06) | **1209/1209**, Node 25.9.0; smoke passes with `realProvider: not_run` |

| ID | Finding | Disposition |
|---|---|---|
| A-1 | `reconcile` marked every event buffered during saved-items retrieval as seen and re-emitted only merged text. A root `turn.completed`/`failed`/`cancelled` or a `requires_action` arriving in that window was therefore lost, and later deduplicated if redelivered. `settle` stayed `null` and the pending call was never seen. Reproduced offline. This contradicts R3 ("re-deliver kept updates") and the recovery row of R4. | **Adopt, fixed in `53ab038`**, which was written at acceptance time and needs its own independent check. Now only a text update for an item already final in history is dropped; every other buffered event takes the ordinary ledger → tracker → Host path. New test `a root terminal or required action buffered during recovery is delivered, not swallowed` fails on `3b03cc9` and passes on the fix. |
| A-2 | `createSession` records the `commandId` only after the transport returns. A lost ACK followed by a retry with the same `commandId` reaches the transport again and can create a second remote session. The doc already disclaims remote exactly-once behaviour | **Defer to slice D** ("首次创建未取得 ID"). The Host must hold the command as in flight or unknown and look it up, never replay it blindly |
| A-3 | `observe()` and `reconcile()` each open a stream, and nothing stops both running at once on one binding; the second overwrites `state.handle` | **Defer to slice B/D**. The Host transport owner runs one pump per binding, or the adapter refuses a second one |
| A-4 | `reconcile` returns the session's `required_actions` but does not load them into the settlement tracker. The existing recovery test settles `completed` after a snapshot that showed `call_9` pending | **Defer to slice D** for a ruling: either the Host passes `effectsUnknown` from the returned `pendingActions`, or the adapter seeds pending calls from the snapshot. The delivered semantics are unchanged here |

Not established: any live API round trip, account access, SDK runtime, service or UI wiring, or anything from slices B–F. The lane stays unavailable, and G1–G5 and DF-04 are unchanged.

### Independent acceptance of A-1 · 2026-09-19

An independent Codex/Astra session reviewed author commit `53ab038` after the gap-closure session. The fix is **accepted** within slice A's offline recovery scope. During reconciliation, only buffered text for an item already final in saved history is marked seen and suppressed; every other buffered native event goes through the same ledger → tracker → Host dispatch path as a live event. This preserves stream order, event-id deduplication, pending-call tracking and root settlement. The counterexample covers a required action followed by a root terminal during the paged saved-items window, verifies the intermediate `effects_unreconciled` decision, then verifies completion after the tool result and one settlement observation after redelivery.

Independent checks on `main@2488e63`: `node --test app/tests/drt03-agents-api-protocol.test.mjs app/tests/architecture-boundaries.test.mjs` passed **16/16**. Source review found no new blocking defect in `53ab038`. A-2…A-4 remain deferred exactly as recorded above. No live API, account, SDK runtime, service/UI wiring or release claim was tested; the lane remains unavailable.
