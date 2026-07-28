# PI-CODE-STDIO-1R · 返修回执

状态：**待独立复验**（实现会话不自验收、不自放行）。权威契约只认父级 [`SPEC.md`](../SPEC.md)
「并行相邻票与合流门」、[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-B 与实现就绪图
同名行；本文件是该工单的独占实现回执，不在这里改 wire、状态机、依赖或验收标准。

本单只改 `src/product-protocol.ts`、`src/product-protocol.test.ts`、`src/product-stdio.ts`、
`src/product-stdio.test.ts` 与本文件。未触旧回执、`ACCEPTANCE.md`、父级 SPEC/ADR、
`index.ts`/`scoped-env`/`tools`/`session`、`workspace-write-env`、`package.json`/lock、
Rust/Tauri 与 GUI。

- **目标 SHA**：组合树基线 `cfb4715`。从架构 `main` tip `0e50b03` 新建
  `codex/pi-code-stdio-1r`，按序 cherry-pick `79a13d2 → 223185e → 0ffae46 → cfb4715`，
  四枚均无冲突。

- **实现提交**：`9f9255b`（源码与测试）、本回执一枚。仅上列五份文件；
  `git status` 在变异复原后为空。

- **六类直接先红**：在 **production 完全未动**的 `cfb4715` 树上追加反例后实跑
  `vitest run product-protocol.test.ts product-stdio.test.ts` = **22 failed / 130 passed（152）**。
  逐条红因均落在现有 production 行为，非 stub、非模块解析：

  | 类 | 反例 | 实测红因（原文） |
  |---|---|---|
  | R1 | terminal message 只出自本地固定表 | `expected 'sk-canary-DO-NOT-LEAK-0001 /Users/can…' not to contain 'sk-canary-DO-NOT-LEAK-0001'` |
  | R1 | 每 code 一枚独立 literal | `TypeError: Cannot read properties of undefined (reading 'length')`——旧 `resolveTerminal` 必须由 runtime 供给自由 message，缺之即在 `clampMessage` 内崩 |
  | R1 | callback Error 换固定无 cause | `expected Error: sk-canary-… to be an instance of ProductSidecarError` |
  | R1 | cast 的非 provider/host code 不得 retryable:true | 同上 TypeError（缺 message 路径） |
  | R2 | 不清 pending、不提前 terminal | `expected true to be false`（旧路 `terminate(..., true)` 已发出 terminal） |
  | R2 | 闩锁期停止 runtime 输出 | `expected true to be false` |
  | R2 | 状态机自发恰一枚 tool_finished | `expected [ 'capabilities', 'startPrompt:req-1' ] to include 'hostResult:op_1_1:ok'` |
  | R2 | 逐字映射 host status／uncertain | `expected { kind: 'tool_started', … } to match object { kind: 'tool_finished', … }` |
  | R2 | 闩锁即传染 usd | `expected { …seq: 4 } to match object { type: 'terminal', … }` |
  | R2 | 闩锁期 cancel 与 callback 异常 | `expected [ 'capabilities', 'startPrompt:req-1' ] to include 'cancel:req-1:user'` |
  | R2 | host_result 先到的 race | `expected [] to have a length of 1 but got +0` |
  | R3 | capabilities 内同步 receive | `expected function to throw an error, but it didn't`（旧路发 fatal 后外层仍设 idle 并发 ready） |
  | R3 | 另四枚 callback 内同步 receive | 同形 |
  | R3 | 同步 endOfInput | 同形 |
  | R3 | finally 复位 | `expected error to be instance of ProductSidecarError` |
  | R4 | send 原样消费 op/hash | `TypeError: session.reserveHostOperation is not a function` |
  | R4 | reserve 未 send 只烧号 | 同形 |
  | R4 | send 只接受有效 reservation | `expected [] to deeply equal [ 'op', 'session', 'request', …(2) ]` |
  | R5 | write 三枚镜像字段 | `logicalPath: expected { …seq: 3 } to match object { type: 'protocol_error', … }` |
  | R5 | read 的 logicalPath | 同形 |
  | R5 | tool_finished outcome 须与 host status 一致 | `expected { kind: 'tool_finished', … } to match object { toolCallId: 'tc_1_1', … }`（旧路照抄上游 `succeeded`） |
  | R6 | retryability 闭集 | `budget_unknown + retryable:true: expected true to be false` |

  **如实登记**：R4 两枚的首红是 `reserveHostOperation is not a function`——两段式接缝在旧树上
  根本不存在，这是缺陷本身（stdio 自持第二枚 hasher、自铸 op，proof 的 op/hash 无处交付），
  但它是 API 形状红而非断言红；第三枚 R4 反例给出行为红。R1 两枚为
  `TypeError`，同样是 production 代码在解引用 runtime 自由 message 时崩，不是桩。

- **固定安全文案与 retryability 闭集**：`PromptCompletion` 删自由 `message`，精确为
  `completed | provider_error|host_error + retryable:boolean | invalid_state|unknown + retryable:false`；
  预算、effect 与上游三类失败 runtime 构造不出。terminal message 唯一来源是
  `TERMINAL_MESSAGES`（`product-stdio.ts:26–43`），七枚 code 各一枚本地 source literal，
  零插值、零 `String(error)`、零 `error.message`。`failedTerminal` 同时把 retryability 闭死
  （`(code === 'provider_error' || code === 'host_error') && retryable`），cast 塞
  `unknown + retryable:true` 也只出 `false`。`invokeRuntime` 把任一 callback 逃逸的
  Error/message/cause 换成固定字面量、无 `cause` 的 `ProductSidecarError`。canary 双锁：
  cast 塞入的 `sk-canary-…` 与 `/Users/canary/绝密案卷根`、以及 callback 抛出的含 canary
  Error（并带 canary `cause`），在 wire 字节、`error.message` 与 `cause` 上均零出现。

- **pending failure 闩锁**：`failUpstream()` 不再走 `terminate(..., true)`；`terminate` 的
  `force` 参数随之退役（在途 pending 一律抛 `ProductSidecarError`）。有在途 operation 时置
  `upstreamLatched`，不清 pending、不发 terminal；`requireNotLatched()` 封死后续
  delta/event/reserve/send/finish（逐项抛）。inbound 仍只走既有路径接受当前 request 至多一次
  cancel（闩锁期用 `invokeRuntimeSuppressed`，callback 异常不阻断收束）与严格匹配的
  host_result。收束次序：完成全部 correlation → 交 runtime consumer 解 deferred（其返回或异常
  不再拥有终态）→ 状态机凭 reservation 保存的 tc/toolName 与 host status **自行**发恰一枚
  `tool_finished`（write `ok→succeeded/denied→denied/failed→failed/uncertain→uncertain`；
  read 只保 `denied→denied`，其余合法 status 收为 `failed`）→ 按
  `effect_uncertain > budget_unknown > 已知 limit > cancel > upstream_event_unsupported` 自动
  terminal，不等 runtime finish。`host_result` 已合法收下、`tool_finished` 未到时的违约同路
  闭合（消费已保存 outcome，不等第二枚 result）。

- **runtime reentrancy guard**：`capabilities/startPrompt/cancel/deliverHostResult/shutdown`
  五枚共用 `callbackDepth`。`receive`/`endOfInput` 的**首行**是 `assertNotInsideCallback()`，
  早于消费字节、推进 seq/phase、写 wire 与 exit；`invokeRuntime` 在 `finally` 复位。
  `startPrompt` 的合法同步 outbound（delta/tool_started/reserve/send）不受禁，有专测。
  旧「fatal 后外层仍设 idle 并发 ready」的复活路径就此不可达：capabilities 内重入时
  `out()` 为空、`exits` 为空、phase 停在 `awaiting_bootstrap`。

- **write proof→stdio reserve/send 接缝**：删 `ProductSidecarSessionOptions.hashProposal` 与
  一段式 `requestHost`（连同 `ProposalHasher`、`OutboundHostRequest` 两个导出）。改为
  `reserveHostOperation({publicToolCallId, capability}) → operationId` 与
  `sendReservedHostRequest({sessionId,requestId,operationId,capability,proposalHash,arguments})`，
  与 ADR-022 六-B.1 的两段式签名逐字同构。reserve 在**全部本地 gate 之后**铸号并保存
  public tc/toolName；未 send 的 reservation 只烧 ordinal——不出 wire、不成为 pending、
  不得复用（实测第二枚为 `op_1_2`，wire 上仍只有一枚 host_request）。send 只接受本 prompt
  中仍有效、op/tc/capability/session/request 全同的那一枚 reservation，原样消费调用方的
  op 与 proposalHash（只校验小写 64 位 hex 格式，frame 拼接仍归 `workspace-write-env`）。
  产品源码内**零第二枚 hasher**：注入哨兵 hash `deadbeef…` 后 wire 上零出现。

- **host-result value correlation**：`pending` 存 send 入参的**一次不可变镜像**（八字段中的
  `requestId/operationId/capability/operation/toolCallId/toolName/logicalPath/contentSha256/byteLength`），
  同一枚 snapshot 既出包、又作 correlation，绝不回读 runtime 仍可变的 arguments 对象。全部
  status 比 `requestId/operationId/capability/operation`；仅 `ok` 再逐值比 value——write 比
  `logicalPath/contentSha256/byteLength` 三枚（`disposition` 不参与），exists/read_file/list 比
  `logicalPath`。任一错配 `request_mismatch` fatal、非零退出，且 runtime consumer **零调用**。
  已进入 `operation_pending` 的 write，其 `tool_finished.outcome` 只认已保存的 host status，
  上游改型即按上游违约收束。

- **production mutation 红证**：**23 枚有效变异逐枚实红**（应用 → `cmp` 命中校验 → 跑定向门 →
  cp 备份还原 → 还原校验）。定向门基线为 **153 passed**。

  | 变异 | 语义 | 结果 |
  |---|---|---|
  | M01 | 七枚 code 共用一条 message | 1 红 |
  | M02 | retryability 直通不闭集 | 1 红 |
  | M03b | invokeRuntime 转发原始 Error | 3 红 |
  | M04 | 违约时清 pending 并强发 terminal | 5 红 |
  | M05 | 违约不传染 usd | 2 红 |
  | M06 | 闩锁不自发 tool_finished | 4 红 |
  | M07b | 闩锁不挡后续 runtime 输出 | 1 红 |
  | M08 | 闩锁期 cancel callback 异常不吞 | 1 红 |
  | M09 | receive 无重入闸 | 2 红 |
  | M10 | callbackDepth 不在 finally 复位 | 69 红 |
  | M11 | capabilities callback 不加闸 | 1 红 |
  | M12 | send 二次铸 op | 20 红 |
  | M13 | send 接受过期 reservation | 1 红 |
  | M14 | send 不校 session/request | 1 红 |
  | M15b | reserve 接受未登记的公开 tc | 1 红 |
  | M16 | 撤 write `logicalPath` 门 | 1 红 |
  | M17 | 撤 write `contentSha256` 门 | 1 红 |
  | M18 | 撤 write `byteLength` 门 | 1 红 |
  | M19 | 撤 read `logicalPath` 门 | 1 红 |
  | M20 | consumer 先于 correlation 调用 | 8 红 |
  | M21b | pending 持有并重读调用方可变 arguments | 1 红 |
  | M22 | tool_finished outcome 不校 host status | 1 红 |
  | M23 | 撤 decoder retryability 闭集 | 1 红 |

  **四枚首轮尝试如实作废，不计入上表**：`M03`、`M07` 的 perl 脚本写坏（分隔符与替换串），
  `cmp` 判为未命中／产出语法错，重做为 `M03b`、`M07b`；`M15`（只改错误文案）与 `M21`
  （改取值来源，但字符串标量在赋值时已定值）实跑 **0 红**，属**等价变异**，重做为
  `M15b`、`M21b` 才取得红证。`M10` 的 69 红是失去 depth 复位后每次 inbound 均被误判为重入的
  真实爆炸半径，非改崩：该轮 153 例全部完成收集与执行。

- **全仓门结果**（均在最终树、无未提交改动时实跑）：
  - `pnpm -r build`：**EXIT 0**（日志 `Scope: 14 of 15 workspace projects`）。
  - `pnpm lint`：**EXIT 0**。
  - `pnpm test`（root）：**162 files / 1550 tests passed**，EXIT 0。基线 `cfb4715` 为
    1521，净增 29 例全部来自本单新反例。
  - `pnpm exec vitest run packages/pi-lane`：**10 files / 227 tests passed**，EXIT 0；
    本轮 8 枚 localhost sidecar 用例未受环境限制，无超时。
  - 定向 `product-protocol` + `product-stdio`：**2 files / 153 tests passed**。
  - `node apps/desktop/scripts/assert-isolation-binding.mjs`：**EXIT 0**（6 份宿主源码、
    22 份 pi-lane 源码；等级仍 `none`）。
  - 未跑 Playwright：本单零改 `apps/`，e2e floor 不动。

- **新增概念及必要性**：零新依赖、零新持久化格式、零新通用抽象。新增五个概念，四个由
  ADR-022 六-B.1 明文拉动，只有最后一个是本单收窄倒逼：
  1. `upstreamLatched`（`pending_upstream_failure` 态）——ADR 305–321 明文要求的状态，
     缺之无处落地「不得用 force 清空或提前发普通 failed」。
  2. `SettledWrite`（host_result 已到、`tool_finished` 未到的中间态）——ADR 305 的第二个
     闩锁触发条件与第 3 条「消费已保存的 outcome」直接要求；同时是「write 的 outcome 只认
     host status」这条门的唯一落点。
  3. `PendingOperation` 的不可变镜像字段——ADR 459–465 明文「保存实际发出包的不可变镜像
     字段并逐值关联」。
  4. `reservation` 与 `callbackDepth`——分别是 ADR 274–290 的两段式接缝与 ADR 390–398 的
     callback-depth guard，签名逐字取自 ADR。
  5. `TerminalIntent`（内部类型）——`PromptCompletion` 收窄为 runtime 闭集后，状态机自身仍需
     表达 `budget_unknown|effect_uncertain|upstream_event_unsupported` 三枚**只有它**能判定的
     code。这是唯一一枚不是 ADR 明写的新类型，纯内部、不出 wire、不出公共 API。
  另新增 `toolNames`（公开 tc→toolName）一张 Map，是「reservation 保存 public tc/toolName」
  的必要索引，非新概念。

- **待独立验收项**（本会话不自放行，以下四条须复验角色裁定）：
  1. **`usd` 传染面取 ADR 的「一律」而非 SPEC 的「进入闩锁即」**。SPEC 返修条 2 只写了闩锁
     一路；ADR-022 六-B.1 第 301–303 行写的是「upstream 投影违约**一律**把累计 `usd` 传染为
     null……若 maxUsd 启用，后续 `budget_unknown` 因此高于普通 upstream failure」。按权威层级
     （ADR 高于包内 SPEC）取 ADR。**这是可观测的行为变化**：两枚既有测试（`本 leg raw id 重复`、
     `start 之前先见 progress / finished`）改用 `maxUsd:null` 才继续观察
     `upstream_event_unsupported`，并另立一枚测试锁住「启用 maxUsd 时 budget_unknown 反压过
     upstream 失败」。若架构本意是只在闩锁传染，须回退此面并改回两枚测试。
  2. **`reserve` 要求已登记的公开 tc**。SPEC 返修条 4 要求「reservation 保存 public tc/toolName」，
     故 reserve 必须能从本 leg 的 tc 注册表查到 toolName，未登记即拒。六处既有用例因此补了
     `tool_started`。此约束与 ADR「binder execute 只查既有 raw→tc 映射」一致，但属本单新加的
     可观测前置条件，记此备核。
  3. **runtime callback 抛出不回滚状态机**。ADR 只禁「转发原错误」与「无条件覆盖已 closed/
     terminal 的状态」，未规定回滚。本实现不回滚（phase 停在 `prompting`，activeRequestId 保留），
     只保证 `callbackDepth` 已复位、后续合法 inbound 仍被处理，并以测试锁住该事实。
  4. **`pending` 与 `settledWrite` 同时非空的收束次序** `[需架构拍板]`。ADR 305 列了两个闩锁
     触发条件，第 3 条要求「自行发**恰一枚** tool_finished」。本实现在两者同时非空时优先
     pending，另一枚的 `tool_finished` 不补发。该状态在产品 `toolExecution:'sequential'` 前提下
     不可达（write 的单 operation 必在下一件工具起手前由 `tool_finished` 闭合），前提已写入
     `failUpstream` 的源码注释，**未**为此加额外门——若架构要求把它变成结构性不可达（例如
     `reserve` 在 `settledWrite` 未清时即拒），属另一单。

  另：原独立验收要求的 semantic mutation 证据缺口，本单以上表 23 枚有效红证补齐；是否足量与
  是否另有失效模式，仍由新的独立验收会话裁定。本单**不**更新 `current.md`，不宣称
  `PI-CODE-STDIO-1R` 已放行，也不宣称 coding agent 基础已闭合。
