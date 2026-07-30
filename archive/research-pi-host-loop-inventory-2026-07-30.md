# PI-HOST-LOOP-1 仓内契约盘点（2026-07-30）

性质：开工前仓内盘点，由 Sonnet 跑腿在 main（`6908009`）只读产出，Fable 主会话待冻结时
逐条复核载重项。**本件不做设计拍板**；票面与契约仍只认 implementation-readiness 的
PI-HOST-LOOP-1 行、ADR-022 与 `packages/pi-lane/SPEC.md`。该票在 `PI-SIDECAR-DIST-1R4`
独立放行与架构裁路线之前继续 blocked。

## 一、Rust driver 必须满足的 wire/状态机不变量（R2 已验收基线，可直读）

**Packet 与 framing**：顶层精确六字段 `{protocolVersion,seq,sessionId,requestId,type,payload}`
（`product-protocol.ts:1373-1381` closedRecord 锁六键；ADR-022:171-176）；单 packet 含 LF
≤1 MiB，LF-only delimiter，CRLF/空行/BOM/partial 拒，fatal UTF-8，解码序＝字节 framing→
行形状→UTF-8→严格 JSON→闭集校验（`product-protocol.ts:1509-1540`；ADR-022:151-157）；自研
严格 JSON 扫描器拒任一层重复 member、保留 number 原始 lexeme、只收 SP/TAB、深度上限 32
（`product-protocol.ts:533-728`）；全层 closedRecord（738-749）。

**seq 与生命周期**：host/sidecar 各自 per-leg seq 从 1 严格递增，error 亦计数
（`product-stdio.ts:352-368,700-704`）；`sessionId:null` 只许 bootstrap 未成立时首枚 fatal
`protocol_error`；`requestId:null` 只许 bootstrap/ready/shutdown/shutdown-terminal/不可归因
protocol_error（`product-protocol.ts:1399-1423`）；phase 单向
`awaiting_bootstrap→idle→prompting→(idle|closed)`，首包必 bootstrap，有效 bootstrap 后首枚
sidecar 包必 `seq:1 ready`，`completed|canceled` 回 idle，仅 `retryable:true` 的
`provider_error|host_error` 失败回 idle，其余关 leg（`product-stdio.ts:549-690,424-438`）。

**tc/op 铸造与 host correlation**：tc 在 `tool_started` 首见 raw id 时铸出
（`tc_<leg>_<ordinal>`），身份 `{requestId,toolName}` 不可变，phase 单向
`started→reserved→pending→settled(仅 write)→finished`，每 prompt 至多一枚未 finished tc
（`product-stdio.ts:210-221,296-303,811-838,905-923`）；op 只在 reserve 过全部本地门后铸号，
reserve 未 send 即失败只烧 ordinal 不出 wire；send 当场重验 phase/tc/request/capability
（944-1045）；工具↔capability 固定 `write↔workspace_write`、`read|glob|grep↔workspace_read`
（195-200）；`host_result` 逐值比对已发出请求的不可变镜像，仅 `status:'ok'` 才比 value
（611-678,223-236）；write 的 outcome 一旦 `operation_pending` 只认 `host_result.status`，
pre-operation 的 `succeeded|uncertain` 先改判 `failed` 再按上游违约关闭（245-248,858-876）。

**违约闩锁与预算**：`pending_upstream_failure` 冻结新 runtime 输出，仍收 ≤1 次 cancel 与
严格匹配 `host_result`，状态机自发恰一枚 `tool_finished` 后按优先级 terminal
（307-524）；进入闩锁即把累计 `usd` 传染为 `null`（511-512）；终态优先级
`effect_uncertain > budget_unknown > 已知 limit reached > cancel > 其他`，decoder 另有自洽
反校验（`product-stdio.ts:389-422`；`product-protocol.ts:1246-1289,1318-1334`）；
`turn_finished` 的 `aborted|error` 固定 `countedTowardTurnLimit:false` 且 usage 全 null，
observed turn ordinal 跨 prompt/leg 严格递增、从 `priorObservedTurns` 起算
（`product-protocol.ts:1207-1223`；`product-stdio.ts:879-895`）。

**callback 边界与错误信封**：五枚 runtime callback 共用 callback-depth guard，callback 未
返回时同步调 `receive/endOfInput` 必须先抛；callback 抛出的原 Error 一律替换为固定字面量、
无 cause 的 `ProductSidecarError`（`product-stdio.ts:314-344,692-736`）；terminal message
只出自本地 code→固定文案表（62-70,142-145）；未知 kind/toolName/未来上游事件一律
`upstream_event_unsupported`，不得逃逸为 TypeError（788-800,897-902）。

## 二、票面 journal 语义与现有定义的对应

**已在 TS 层实现**（Rust 复用词表/优先级，不重新设计）：`budget_unknown`/`effect_uncertain`/
`budget_stopped`/`uncertain` 闭集与判定优先级（`product-stdio.ts:389-422` 等）；tc 在
`tool_started` 分配、raw gate block 零 op（811-838）；leg 内预算从
`resume.priorTurns/priorObservedTurns/priorUsd` 起算不清零（283-286,556-561）。

**ADR 文本精确定义、零代码实现**（Rust 是唯一施工方）：journal 十九项 type 闭集
（ADR-022:526-530，`session_started…session_interrupted` 逐字精确）；crash fold 五步固定
次序（540-561：补半闭合终态→收 dangling effect→收 active prompt 预算→open 预算按 maxUsd
有无分叉→纯 `session_interrupted`）——**比退出证据摘要句更细，实现应对齐 ADR 文本**；
partial-tail 截断与 quarantine 规则（536-539，仓内零实现）；journal terminal 映射表
（562-573）；`leg=previous+1`、跨 leg requestId 去重、`prior*` 精确 fold、model/limits/
grant/container/capability 漂移必拒（411-421）；`pi-loop/<containerId>/<sessionId>.jsonl`
物理路径、append+sync_all 后才发布、container 整删（578-582，决定四窄修订 65-67）。

**全新（ADR 未展开，冻结时须架构定形）**：`/case` 虚拟 env 隐物理路径（现状是反例——
`scoped-env.ts:64-65,75-81,88` 与 `authorized-root.ts:65` 把真实绝对路径写进 cwd/
FileInfo.path/错误 reason；是净新增不是收紧）；「显示断点」无 outbound wire 落点
（`resume.kind` 只是 inbound 字段，`product-protocol.ts:170-176,894-909`）；Rust 进程
生命周期管理本体（spawn/monitor/respawn/kill-confirm，纯新概念）。

## 三、pi-agent-core@0.82.1 生命周期事实

版本确认（`node_modules/@earendil-works/pi-agent-core/package.json:3`）；产品只挂 `Agent`
不挂 `AgentHarness`（dev `session.ts:4-11` 留痕）。

- 单飞行运行：`prompt()/continue()` 在 `activeRun` 非空时直接抛（`dist/agent.js:222-232`）。
- **abort() 是协作式信号非抢占**：只是 `abortController.abort()`（200-202），信号只在
  `beforeToolCall` 返回后、`tool.execute()` 调用前、sequential/parallel 批次逐项之间被读
  （`dist/agent-loop.js:412-433,323-352`），不注入 `tool.execute()` 内部——工具不自查
  signal 则 abort 后仍跑完。此即 WRITE-PROOF 已锁「pre-write abort 零 port 调用、post-write
  abort 可一次调用但 tool error」的运行时依据。
- **两条失败面**：协议内失败＝合规 streamFn 从不抛，只以 `stopReason:'error'|'aborted'`+
  `errorMessage` 终态收尾，走普通事件路径；逃逸异常唯一入口是 `runWithLifecycle` 的
  try/catch（`dist/agent.js:330-335`），捕获后合成假 assistant message 并回放
  `message_start→message_end→turn_end→agent_end` 四事件（340-356）。工具路径上
  `prepareArguments`/`validateToolArguments`/`beforeToolCall`/`tool.execute`/`afterToolCall`
  全部本地 try/catch 转 error tool-result，不上抛（agent-loop.js:402-508）。
- `finishRun()` 只在 finally 保证（336-363），对 SIGKILL 零保证；一切状态只活在内存
  `_state`（26-50），`Agent`/`agent-loop` 零序列化零落盘（JSONL 持久只在产品不用的
  AgentHarness）。**crash fold 必须完全落 Rust/journal 侧的 pi 侧实证**。
- message context：`_state.messages` 纯内存数组，只在 `message_end` 追加（379-382），构造时
  从 `initialState.messages`（默认空）初始化；无增量加载/回放 API。「新 leg context 从空
  开始」＝不给新 Agent 传旧消息即自然成立，driver 责任只是不回填＋在 journal 层标断点。
- turn 序号非 pi 原生：`turn_end`/`message_end` 不带序号（`dist/types.d.ts:368-406`）；
  wire 的 `turn_finished.turn` 是 Courtwork 自造计数器，projector 自行数 `turn_end`。
- 字段翻译全在 projector：pi-ai `Usage.input/output/cacheRead/cacheWrite/cost.total` 与
  `StopReason` 闭集 `'stop'|'length'|'toolUse'|'error'|'aborted'` → wire `TurnUsage.*` 与
  `TurnStopReason`（`'toolUse'→'tool'`，新增 `'unknown'` 兜底）。
- `toolExecution:'sequential'` 走 `executeToolCallsSequential`（agent-loop.js:287-293），
  abort 后批次逐项间 break（323-325）；与 product-stdio「每 prompt 至多一枚未 finished tc」
  互相独立加固（ADR-022:637-641 已留痕两件分测）。

## 四、仓内可复用面（坐标＋手法名）

- `apps/desktop/src-tauri/src/work_state.rs:150-187` `atomic_write_framed`——同目录临时文件
  + `sync_all()`(F_FULLFSYNC) + rename + 目录项 sync 三段耐久替换；213-230 `commit_blob`
  单调 generation 整包 CAS；107-116 `safe_token` id 安全 token；131-146 `read_framed` 帧
  损坏 fail-closed。
- `apps/desktop/src-tauri/src/case_output_fs.rs:149-194`——同款三段替换＋dirfd-anchored
  `openat`/`mkdirat`＋errno 闭集分类，no-follow 防 symlink 逃逸。
- `apps/desktop/src-tauri/src/host_auth.rs:150-221`——tempfile+sync_all+rename，另有
  `link`-based 不覆盖式提交变体。
- `packages/core/src/turn/turn-store.ts:290-375`——fold/replay 与 corrupt fail-closed 的
  事件溯源手法（TS 形状参照）；`turn-store-file.ts:17-34`、`event-log-file.ts:11-36`
  append-only JSONL 壳但 `appendFileSync` 无 fsync——**仅形状先例，非耐久先例**。
- 反面教材：dev `session.ts:107` 的 per-prompt `budget.reset()`（SPEC.md:589-591 已点名）；
  Rust fold 必须按 sessionId 累计，「第二次 prompt 重置累计值」是回归信号。

## 五、[需架构拍板]（冻结 HOST-LOOP 时逐项落 SPEC/ADR）

1. `/case` 虚拟 env 落点包/模块：改写 dev 的 `scoped-env.ts`/`authorized-root.ts`、新增第三
   份 env、还是与 WORKSPACE-READ/WRITE-HOST 一并处理，SPEC 未交代落哪个文件。
2. `/case` 虚拟路径展示 grammar：`/workspace` 有精确 grammar（六-B.2），`/case` 因读操作
   不过 `host_request` 而全 ADR 无 wire-level grammar；今天 dev glob/grep 用 cwd-relative
   裸段（`tools.ts:115,154`）。
3. `case_read` 结构性无 `host_request` 对应（`product-protocol.ts:198-210` 精确排除；
   journal 闭集亦无 read-only 事件型）：replay 靠既有 `agent_event` 重放还是新增记录，须裁。
4. 「显示断点」缺 wire 落点：新增 outbound 事件，还是消费端比较 `leg>1`/读
   `session_resumed` 的隐式做法，须裁。
5. crash fold 规范文本：建议明确以 ADR 五步为规范，退出证据句只作验收摘要。
6. R4 未放行：「Rust 按裁定路线管理 sidecar」的 spawn 产物形态未定，直接影响 Rust
   `Command` 启动方式。
7. journal 的 Rust 落地模块未定：src-tauri 无任何 pi-loop/jsonl 文件；新文件命名、复用
   `work_state.rs` 整包 CAS 还是新写 append+partial-tail-quarantine 原语，均未定。

## 六、载重结论四栏表

| claim | primary source + file:line | 状态 | implication |
|---|---|---|---|
| HOST-LOOP 未开工，`index.ts` 未导出 product-* | `packages/pi-lane/src/index.ts:1-25` | current | 协议存在但零消费方，无既有装配冲突 |
| R2 wire/状态机已独立验收放行 | `SPEC.md:272-276`，merge `db4f360` | current | 一节不变量可当冻结基线直读 |
| HOST-LOOP 被 R4 独立验收阻塞 | readiness:381；main `specs/` 无 R4 回执 | current | spawn 形态待路线裁定 |
| 现有 scoped-env 把真实绝对路径写进 cwd/FileInfo/错误 reason | `scoped-env.ts:64-88`；`authorized-root.ts:65` | current（反例） | `/case` 虚拟化是净新增工作 |
| pi-agent-core `Agent` 零持久化零 crash 恢复原语 | `dist/agent.js:26-50`；`session.ts:4-11` | current | crash fold 全落 Rust/journal |
| journal 十九型闭集与 crash fold 五步已在 ADR 写死 | ADR-022:526-530,540-561 | current | Rust 逐项对齐 ADR 文本非摘要句 |
| 预算判定优先级已在 TS 层实现 | `product-stdio.ts:389-422` | current | Rust 复用同一词表 |
| `case_read` 无 `host_request` 对应 | `product-protocol.ts:198-210` | current | `/case` 读取属 sidecar 本地虚拟化 |
| 跨 leg 精确 fold 显式留 Rust，TS 无可复用实现 | `product-stdio.ts:283-286`；ADR-022:415-417 | current | fold 算法净新写 |
| dev per-prompt `budget.reset()` 是反面教材 | `SPEC.md:589-591`；`session.ts:107` | current（反例） | 按 sessionId 累计是验收断言点 |
| Work 线耐久手法是整包 CAS 非 append-only | `work_state.rs:150-230` | current | tempfile+sync_all+rename 可复用，append+quarantine 新写 |
| TS Turn journal 是 append-only 形状先例但无 fsync | `event-log-file.ts:26-31` | current | 参照 replay/fold 须另补 sync 与 partial-tail |
| HEADLESS-ACCEPT 要求 restart 后 context 从空开始不伪装续聊 | `SPEC.md:541-543` | current | 与 pi 天然行为一致，driver 只需不回填 |
