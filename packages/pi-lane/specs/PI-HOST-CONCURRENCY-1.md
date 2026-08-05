# PI-HOST-CONCURRENCY-1 · 实现回执（2026-08-05，pi host 并发/中断模型）

票面：`docs/architecture/implementation-readiness.md`「2026-08-05 架构/功能层验收批」
`PI-HOST-CONCURRENCY-1` 行（逐字为验收判据）。权威面：ADR-022 **六-C.1**（宿主并发与中断模型，
2026-08-05 修订）＋ ADR-009 **2026-08-05 窄修订**（pi host 并发端口/命令通道）；
随批收口两项的坐标：`packages/pi-lane/ACCEPTANCE.md:3714`（同工具形槽位）与
`packages/pi-lane/specs/PI-TOOLCALL-BINDING-1.md:205`（tool↔capability 双写）。
总纲不变量 3（留人确认）、4（静默降级零容忍）、6（历史不可涂改）。

基线 `claude/pi-host-concurrency-1`，分叉自 `main@480b4ea`。

**纯 Rust 票**：改动全在 `apps/desktop/src-tauri/src/`。Node sidecar、`packages/pi-lane/src/**`、
wire 闭集、journal 十九型 payload 闭集、codec、cap-std 依赖与 `Cargo.toml` 一字未动
（sidecar 制品免重建，判例在 `docs/engineering/workflow.md`）。

---

## 一 · 本单新增了什么概念、为何非加不可（复杂度节制留痕）

**新增恰一个概念：入站命令通道（进程内端口）＋它的宿主专属线程。**

不是新 runtime、不是新状态真源、不是新持久化格式、不是新依赖（`std::sync::mpsc` ＋
`std::thread`，零 crate）。加它的理由是就绪图④已经实证的**形状问题**：

- `prompt()` 落 `user_prompted` 后直接进泵，独占 `&mut self` 且无总时限；
- `cancel()` 需要**同一份**独占借用，故 prompt 在泵中时结构性无人可调——全 `src` 内
  `cancel` 唯一出现即其定义行，零调用点，被文件级 `#![allow(dead_code)]` 遮住；
- `WriteDecisionDriver::decide` 同步跑在同一阻塞泵内，等用户点击期间整条宿主线程卡住。

于是「Stop race 真测」在旧 API 上**写不出来**（借用检查器先拦），零覆盖是零可达的影子。
命令通道把 cancel／decision 从「需要独占借用的方法调用」变成「等待点里可取的一枚消息」，
这一个概念同时解开三处死结，没有第二个概念被引进来。

**同时删了两处**（同步消灭优于同步验证，1R5 判例）：

| 删除 | 理由 |
|---|---|
| `PiLoopHost::cancel(&mut self)` | 零调用点的第二条 cancel 路径；出包与 `cancel→terminal` 有界窗逐字迁入 `service_commands`，wire 语义零改（六-B.1） |
| 写臂／读臂两份 tool↔capability 穷举 `match` | 收敛为单点 `capability_for(ProductToolName)`；加第五道工具只逼**一次**裁定 |

---

## 二 · 三处等待点与它们各自的形态（ADR-022 六-C.1 逐条对照）

ADR 把实现形态（有界轮询切片／reader 线程双源 recv）交实现票冻结。**本票冻结为有界轮询切片**：
`COMMAND_POLL_SLICE = 5ms`。切片是唤醒**延迟上界**，不是超时——切片到点而无事发生只是回到
循环，不构成任何终态；总时限的记账在 `PumpWait` 上，与切片正交。

| 等待点 | 位置 | 总时限 | 命令可唤醒 |
|---|---|---|---|
| ① 空闲等命令 | `pi_loop_command::serve` | 无（阻塞 `recv`） | 本身就是命令入口 |
| ② 泵等 sidecar stdout | `PiLoopHost::pump` → `poll_packet` | 活动 prompt 无总时限（ADR 明写唯一例外）；cancel 之后收紧为 `CANCEL_TERMINAL_DEADLINE` | 每切片先 `service_commands` |
| ③ 授权等回执 | `CommandDecisionDriver::decide` | **无**（授权属用户，系统不代拒） | 每切片自取通道 |

「无总时限」与「可被中断」由此同时成立：可中断性由 Stop 保障，不由时限保障。

**如实登记的两处不服务命令的窗**：`bootstrap→ready` 与 `shutdown→terminal`／`terminal→EOF`
仍走既有 `read_packet(Some(deadline))` 一睡到底。ADR 六-C.1 要求的是**泵**的等待点可唤醒；
这两窗都**自带有界 deadline**、且都不在活动 prompt 内，卡住的上界是那枚 deadline 而非无限期，
故本票不改它们（改动会把 `start`／`shutdown` 全序的既有次序判据一并动到，属票面外）。

### 逐条对照

- **宿主线程独占**：`PiLoopThread::adopt(host)` 把 host 移进一条专属线程，外部只剩
  `CommandSender`。单写者不变量由线程独占继承——`SessionLock` 与 journal 单写者一字未动，
  没有第二状态真源。`start` 是构造入口，不在运行期闭集内（届时由 Tauri command 落形）。
- **入站命令通道**：运行期闭集恰四枚 `prompt|cancel|decision|teardown`，由 `HostCommand`
  枚举在**编译期**锁死——闭集外命令在本进程内构造不出来，故「闭集外一律拒绝」是结构性的。
  通道是进程内端口，零 packet、零 journal payload，不混入六-B 的 sidecar wire 闭集。
- **活动 prompt 期间新 prompt**：具名 `prompt_busy`，**不排队**（与六-D 禁 queue 同源），
  且被拒的 requestId 一个字节都不进账本（用例断言）。
- **cancel 可达**：经通道在泵中可达。六-B.1 的 cancel 包、race-late no-op、在途 host request
  先收束、`effect_uncertain > cancel` 优先级与 `cancel→terminal` 有界 deadline 全部如旧——
  它们住在 sidecar 侧与既有 `PumpWait`，本票只换了入口。第二枚 cancel 不重发，具名
  `cancel_in_flight`。
- **decide 改「投提案＋等回执」**：`WriteDecisionDriver` 的同步签名**保留为内核契约**，
  四段账序与普适电池所锁语义一字不改；改的只是这一枚同步调用在等谁。回执须携 operationId
  对齐当前悬置提案，错配即失效丢弃并显式登记。
- **Stop 蕴含拒绝**：等待期间 Stop 到 ⇒ 悬置提案立即以
  `authorization_decided(denied, user_denied)` durable 收束（不新增 wire 拒绝码），
  `host_result{denied,user_denied}` 照四段账序发出，命令本体**推回**给泵走既有 cancel 路径。
- **回执不追溯生效**：提案收束后到达的回执一律失效丢弃并登记，effect 恰零次。
- **悬置提案不跨 leg**：读侧 `validate_records` 收口——leg 内 `tool_proposed` 必须由同
  operation 的 `authorization_decided` 闭合，唯一例外是 leg 尾部一枚（授权等待期 crash 的真
  形态）；中部无 decision 仍拒（整份 quarantine）。恢复不自动重提、不代答。
- **fail-closed 边界不变**：production **不装** `CommandDecisionDriver`，无 driver 恒
  `policy_denied` 显式落账。本票只定义「有 driver 时的产品形态」，装配点在 `PI-LANE-UI-1`
  与 headless 验收。

---

## 三 · 随批收口三项

### 三-1 同工具形槽位 fail-closed（`ACCEPTANCE.md:3714`）

缺陷原形（`PI-TOOLCALL-BINDING-1` 验收自造探针 P-C）：`tool_started{tc-A,write}` →
`tool_started{tc-B,write}` → 写 op，base 与交付树**双双 served**，tc-A 的认领被静默丢弃、
写入记在 tc-B 名下。BINDING-1 只把它收窄到同名工具内（跨工具形由名分门咬住）。

本票把「槽位被占」判为**状态违约**，门排在 `journal.append` **之前**（与既有 `turn_finished`
序号门逐字同理：坏事件零落盘）。判据只问「槽位在不在场」，不问两枚是不是同一工具——跨工具形
另有名分门（0.3／J2）各咬一次，两道各自承重、互不顶名（用例两相同时覆盖 P-B/P-C）。

配套：新增 `tool_started_line_with_call` 助手。既有两枚助手都把 `tool_call_id` 钉死成
`TOOL_CALL`，「第二枚、不同 id 的 `tool_started`」在整套脚本里此前**造不出来**——那正是该缺陷
长期只能靠人工探针复现的原因。

### 三-2 tool↔capability 双写收敛（`PI-TOOLCALL-BINDING-1.md:205`）

`fn capability_for(ProductToolName) -> WorkspaceCapability` 成为 Rust 侧唯一真源，写臂 0.3 与
读臂 J2 各自比对结论。双写点归零由**两根轴**同时锁：

- 行为轴（M1）：改 `capability_for` 一处，写臂与读臂用例**同时**红（22 枚）——双侧承重实证；
- 结构轴（`the_tool_capability_mapping_has_exactly_one_site`）：生产段提及 `ProductToolName::`
  的连续行块必须恰两块（映射真源＋pump arm 穷举），且第二块不许出现 `WorkspaceCapability::`。
  行为轴挡不住「有人又写第三处、且顺手把新用例也写成两处一致」，故补这一道。

Node 侧 `TOOL_CAPABILITY` 仍是**另一份**同源真值——合并两侧须先在 wire 上放 `toolCallId`，
票面明令不改 wire，故该轴维持 `PI-TOOLCALL-BINDING-1` 的在册状态，本票未动。

### 三-3 `pi_loop.rs:18` crate 级 `#![allow(dead_code)]` 收窄

**已删除该行**，改为「入口根 + 可达性」体例：只在**声明为入口根**的少数项上挂
`#[allow(dead_code)]`（每处带一句为什么它今天没有生产消费点），凡由入口根可达的代码不再被报。
新加一件**不可从任何入口根到达**的东西，即当场告警。入口根清单（8 处）：

| 入口根 | 为何今天无生产消费点 |
|---|---|
| `PiLoopHost::start` / `start_with_pair` / `delete_container` | 构造与容器管理入口，装配随 `PI-LANE-UI-1` |
| `replay` | 投影回放入口，同上 |
| `PiLoopThread::adopt` / `sender` / `join`、`CommandSender::send` | pi 宿主对外的**全部**表面 |
| `HostCommand` / `DecisionVerdict` / `CommandReply` | 构造与读取点都在通道之外 |
| `CommandDecisionDriver::new` | 产品形 driver 的装配点（production 当期不装，fail-closed 不变） |
| `impl CredentialPort for KeychainCredentials`、`impl LegSpawner for ProcessSpawner` | production 真件 |
| `HostError::code`、投影读面六枚访问器、`CommandBus::discarded` | 对外读口 |

收窄当场照出两件此前被遮住的事，**据实登记**：

1. **`BoundedInput::site` 从未被任何断言读取**。1R4 声称的 `(site, judgment)` 双向锁只写在说明
   里，源码侧的锚点扫描并不存在。本票只登记、不擅自扩面（补那道扫描属另一票），字段保留并加
   注——它是那道扫描将来要吃的输入。**上浮请架构排产。**
2. **`install_read_host` 零调用 ⇒「读件座缺席」那道 fail-closed 门没有反例驱动点**。本票随手
   补齐该格（`counterexample_host_request_gates_refuse_before_any_effect` 新增一行，撤门实测
   变红），闭口按族。

---

## 四 · 闭口按族的闭合表（改一道门先 grep 同形调用点全集）

| 族 | 成员（全集） | 本票处置 |
|---|---|---|
| 失效回执登记 `register_discarded` | ①泵内（`service_commands`）②空闲循环（`serve`）③授权等待错配（`CommandDecisionDriver`） | 三处齐备；①由 M6 单独证红、②由 M7 单独证红（两枚用例各咬一处，无一处靠另一处顶名） |
| 命令闭集消费点 | ①`service_commands`（活动 prompt 那一半）②`serve`（空闲那一半）③`decide`（授权等待那一半） | 三处逐枚穷举 `HostCommand`，无 `_` 兜底 |
| tool↔capability 映射 | 收敛前：写臂 0.3、读臂 J2 | 收敛为 `capability_for` 单点；结构轴扫描锁死「不许有第三处」 |
| `SidecarLeg` 实现 | `SidecarProcess`、`ScriptedLeg`、`ExitingLeg`、`RacingLeg`(新) | 四处都实现 `poll_packet`；脚本座恒当场有答案，故既有用例时序一拍不变 |
| leg 尾部未决提案的容忍面 | `validate_records` 一处（`plan_turn_usage_repair` 不涉提案） | 一处收口，两相（尾部/中部）成对驱动 |

---

## 五 · 退出证据（票面逐条）

| 票面判据 | 用例 | 撤判据复红 |
|---|---|---|
| Stop-在-prompt-中 真竞态 | `stop_during_an_active_prompt_reaches_the_pump_through_the_command_channel` | M2（撤 `service_commands`）⇒ 红 |
| 授权等待期间 Stop 真竞态 | `stop_while_waiting_for_authorization_settles_the_proposal_as_user_denied` | M2 ⇒ 红 |
| 回执不追溯生效反例 | `a_decision_receipt_that_arrives_after_the_proposal_settled_never_takes_effect` | M7（撤空闲循环登记）⇒ 红 |
| 同工具形槽位覆盖反例 | `counterexample_a_second_tool_started_never_silently_replaces_the_slot`（P-C/P-B 两相） | 首红即缺陷原形（见六） |
| `capability_for` 收敛后双写点归零 | `the_tool_capability_mapping_has_exactly_one_site` ＋ M1 | M5（复现第二处映射）⇒ 红 |
| `#![allow(dead_code)]` 收窄 | `cargo check` 全 crate dead-code 告警 **0**（lib 与 lib-test 两侧） | 删任一入口根注解即告警复现 |
| 悬置提案不跨 leg | `a_pending_proposal_is_tolerated_only_at_the_tail_of_a_leg`（尾部可续／中部 quarantine） | M3（撤中部那一支）⇒ 红 |
| 授权走通那一支（对照臂） | `an_approving_receipt_carries_the_proposal_through_the_four_stage_ledger` | 无它则「Stop 能收束」可能只是「这条路本来就走不通」的影子 |
| 错序命令具名拒绝、不排队 | `out_of_order_commands_are_named_refusals_never_silent_drops` | M6（泵内改静默丢弃）⇒ 红 |
| teardown 收束＋收摊 | `teardown_during_an_active_prompt_collapses_it_then_closes_the_session` | — |

### 真竞态装置：`RacingLeg`

既有 `ScriptedLeg` 每次读都立刻交出下一行或 `Eof`，泵永远等不到「什么都没来」的那一刻，
可唤醒性因此**无从证否**。`RacingLeg` 反过来：握手之后一律空转，直到宿主真的把 **cancel 包**
写出去——那是「命令确实穿过了泵的等待点」的唯一观察量（判据是**出站字节**，不是宣称）。

`patience = 5s` 是**失败兜底**而非成功条件；所有命令回执一律 `recv_timeout(5s)`，
证否形态因此是一句可读的红，不是整套门挂死（承 `PI-LANE-SIDECAR-HANG-1` 判例
「无信息悬挂改具名 fail-fast」）。

### mutation 总表（逐枚亲跑，restore 后复绿）

| # | 变异 | 落点 | 实测 |
|---|---|---|---|
| M1 | `capability_for` 把 `Write` 映射成 `WorkspaceRead` | 映射真源 | **22 红**（写臂＋读臂同时） |
| M2 | 泵不再 `service_commands` | 等待点② | **4 红**，红形逐字为「…：5s 内没有回执」 |
| M3 | 撤 `validate_records` 中部未决提案那一支 | 读侧 | **1 红**（中部相） |
| M4 | 撤 `read_host.is_none()` 门 | 读件座 | **1 红**（新补的一格） |
| M5 | 读臂重新写第二处映射 | 结构轴 | **1 红**，实得块首行 `[626, 1473, 1880]` |
| M6 | 泵内失效回执改静默丢弃 | 登记族① | **1 红** |
| M7 | 空闲循环失效回执改静默丢弃 | 登记族② | **2 红** |

M6/M7 各只红各自那一枚——这正是「闭口按族」要的读数：两个调用点没有互相顶名。

---

## 六 · 首红（born-red）

`counterexample_a_second_tool_started_never_silently_replaces_the_slot` 在加门**之前**实跑：

```
assertion `left == right` failed: 同工具形（P-C）：实得 Process(UnexpectedEof)
  left: Process(UnexpectedEof)
 right: Protocol(StateViolation)
```

红形是 `Process(UnexpectedEof)` 而**非** `StateViolation`：写 op 被服务到底、脚本耗尽才 EOF
——与 `ACCEPTANCE.md:3714` 记录的「base 与交付树双双 served」逐字同形，不是近似形。

---

## 七 · 偏离登记（待架构追认）

1. **teardown 与 Stop 同形收束悬置提案**。ADR 六-C.1 只对 Stop 写明「以
   `authorization_decided(denied,user_denied)` durable 收束」，teardown 只说「必须可被……收束」。
   本票让 teardown 走同一支：不新增 deny code（wire/journal 闭集零变化），也不改内核
   `WriteAuthorization` 的两支签名（第三支 `Aborted` 会动内核契约，属票面禁区）。
   crash 造成的「尾部未决提案」另有读侧容忍面承接，故该形态**不因此失去覆盖**。
2. **`PiLoopHost::cancel` 删除**（见一）。票面只写「cancel 经命令通道可达」，未写保留旧方法；
   保留即两处各写一遍同一件事。wire 语义零改由六-B.1 对照面与用例保证。
3. **`SidecarLeg` / `WorkspaceWriteHost` / `WorkspaceReadHost` / `WriteDecisionDriver` 加
   `Send` 约束**，`WriteWindow` 与 `ScriptedDecision::before` 两枚测试闭包同批加 `+ Send`。
   host 要移进宿主线程，这是把**已经成立的事实**写进契约（四枚真件本就 `Send`），零行为变化。
4. **`CommandReply::Teardown(Result<..>)` 而非 `Accepted`**：`shutdown` 全序失败必须照实回给
   调用方，不能用 `let _ =` 吞掉（不变量 4）。
5. **`CommandRejection` 未设 `session_closed` 一员**：会话已终态时 `prompt` 的
   `Err(SessionClosed)` 已由 `CommandReply::Prompt` 那一支如实带出，再设一枚同义拒绝码属重复。
6. **新增 `only_host_result` 测试助手**：Stop 之后最后一枚出包是 cancel，既有
   `last_host_result`（取最后一枚）会取空；新助手多于一枚即当场失败，不静默取头。
7. **`BoundedInput::site` 与 `install_read_host` 两项上浮**（见三-3）：前者只登记不修，
   后者本票补齐反例。

---

## 八 · 门禁实跑（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 读数 | 退出码 |
|---|---|---|
| `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` | **246 passed / 0 failed / 1 ignored**（base `480b4ea` 为 237/1） | 0 |
| `cargo check`（lib 与 lib-test 两侧） | dead-code 告警 **0**；余 5 枚 `unnecessary unsafe` 属 `lib.rs` 既有 | 0 |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint` | 通过 | 0 |
| `pnpm test`（root vitest） | **1925 passed / 170 files** | 0 |
| `apps/desktop pnpm test` | **690 passed / 75 files** | 0 |
| `COURTWORK_E2E_PORT=1487 pnpm test:e2e`（隔离端口全链） | **352 passed**（6.2m） | 0 |
| `cargo clippy --all-targets --offline` | 7 warnings **全住 `lib.rs`**，`pi_loop*.rs` 归属 **0**（与 base 同口径） | 0 |

Playwright 走独占端口 1487，全仓同刻只此一条链（排程律）。

---

## 九 · 移交

- **`PI-LANE-UI-1`**：本票交出的就是它要的三件——`PiLoopThread::adopt`（宿主线程）、
  `CommandSender`（Tauri command 薄壳只投命令、零借用宿主状态）、`CommandDecisionDriver`
  （审批按钮只发 `decision` 命令，决定只认 journal）。失效回执登记册 `CommandBus::discarded`
  是投影面要读的第四件。UI 落地后请把入口根注解逐枚撤掉——它们是「今天没有生产消费点」的
  显式登记，不是永久豁免。
- **上浮（请架构裁）**：`BoundedInput::site` 的锚点扫描缺席（三-3 之一），建议单独立票。
- **结转，本单未碰**：`logicalPath` 空串两侧异源／②游标二元性／④`cost_usd` Disabled 臂裸 inf／
  Node↔Rust 两份 `TOOL_CAPABILITY`（须先动 wire）。
