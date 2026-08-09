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
   → **已由 `PI-BOUNDED-SITE-1`（2026-08-09）二选一裁定乙路收口，见十。**
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
   后者本票补齐反例。前者已由 `PI-BOUNDED-SITE-1`（2026-08-09）二选一裁定乙路收口，见十。

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
  → 已立票 `PI-BOUNDED-SITE-1`，2026-08-09 二选一裁定乙路收口，见十。
- **结转，本单未碰**：`logicalPath` 空串两侧异源／②游标二元性／④`cost_usd` Disabled 臂裸 inf／
  Node↔Rust 两份 `TOOL_CAPABILITY`（须先动 wire）。

---

## 十 · `PI-BOUNDED-SITE-1`（2026-08-05④上浮，2026-08-09 收口）——`BoundedInput::site` 二选一裁定

票面（`docs/architecture/implementation-readiness.md` 「随批小票」`PI-BOUNDED-SITE-1` 行，逐字
为验收判据）：`BoundedInput::site` 零断言消费——`PI-HOST-LOOP-1R4` 回执宣称的 `(site, judgment)`
双向锁只存在于注释，宣称的源码锚点扫描并不存在；二选一并留痕：甲＝补真实断言使宣称成立，
乙＝把 1R4 宣称订正为单向。边界：只动测试与文档宣称，不改 `BoundedInput` 生产语义。

### 现读结论（开工先查，先于选路）

`.site` 字段在 `apps/desktop/src-tauri/src/pi_loop.rs` 里只在 `BoundedInput` 定义
（一处）与 `bounded_input_manifest()` 的十六条清单行（初始化，各一处）出现；全仓
`grep -rn '\.site\b' apps/desktop/src-tauri/src/*.rs` 零命中——没有任何测试、断言或生产码
读取过它。票面前提成立。

进一步核实：1R4 落实 `(site, judgment)` 双向锁的装置——`scan_bounded_judgment_uses`、
`bounded_judgment_ledger_matches_the_source_and_covers_every_frozen_bound`、
`production_section`、`function_name`、`bounded_predicates_in` 等一整套按函数体做文本行
扫描的辅助件——**在当前树里一件都不存在**。`git log -S"scan_bounded_judgment_uses" --oneline
-- apps/desktop/src-tauri/src/pi_loop.rs` 只有两条命中：`e269ce5`（1R4 引入）与 `d70c1b5`
（1R6 删除）。`d70c1b5` 提交信息自陈「H2：退役文本扫描双轴与 75 行同步账（删 2258 行、
3 测试+35 符号逐名对应授权条），保留面 3129 行逐字节核对……新增 142 枚违规电池普适不变量
探针（Err⇒副作用恰零）」——即架构在 1R6 已明确裁定退役这整套装置，理由记入
`docs/engineering/workflow.md`「闭口按族，不按验收点名的实例」判例终局形态段：
常量名单（1R3）→ 函数名单（1R4，即本字段的扫描轴）→ `return Err(` 字面量（1R5）三代
同类装置逐轮被下一轮验收找出新盲区，终判「在富语言里用文本模式枚举语义构造结构性
不可胜」，出路是**消灭需要同步的账**（1R6 encode-before-effect），不是造第四个更聪明的
扫描器。

### 选路评估：甲路技术上写得出红，但前提不成立

甲路要求的断言（枚举 `BoundedInput` 构造点的 `site` 值并与源码真实锚点对照）在语法上完全
可写——1R3/1R4/1R5 三轮都写出过有区分力的红（各自撞上真缺陷才被下一轮否证）。但票面选择
标准问的不是「写不写得出语法上的红」，而是「使宣称成立」是否站得住；这里站不住：

1. **重建的就是被明确退役的那个装置本身**，不是一个新设计。1R4 的 `(site, judgment)`
   双向锁与它的实现手法（逐行文本扫描、按函数体切段、按标识符边界匹配判据名）是同一件
   事；要让"1R4 宣称成立"，唯一忠实的做法就是把 `d70c1b5` 删掉的那 2258 行原样或近似
   地搬回来。
2. **这正是 1R6 判定要连根拔除的那类文本模式装置**，且历史上连续三代（1R3→1R4→1R5）都
   在下一轮验收里被找出新盲区，无一次终局站稳过。没有理由相信"site 版"会是第四代里
   幸存的那一个；相反，`site`（函数名字符串）比判据函数名单（1R4 已试并败）更粗——
   一个函数体内可以合法调用多个判据，`site` 粒度的扫描会比 1R4 已退役的判据粒度扫描
   更容易被"同一函数里塞两枚判据、其中一枚裸眼看着对但语义错"这类构造绕过。
3. **重建退役装置是契约级决定，不是实现级动作**。`docs/engineering/workflow.md`「架构
   角色」条款把「跨层接口与验收标准」的拍板权收在架构；1R6 的退役本身就是一次这样的
   拍板（`d70c1b5` 承接 1R5 复验后的架构裁定）。本票边界「只动测试与文档宣称，不改
   `BoundedInput` 生产语义」已暗示不得做契约级恢复；撤销一次已落痕的架构退役裁定，
   更须由架构重新拍板，不由本会话单方面执行。

据此判定：**红测在语法上写得出，但它要证成的前提（"补一个称职的 site 扫描器"）已被
架构证伪三次并明确退役，第四次重试不构成"使宣称成立"，只构成对已裁决历史的静默复活。
选路二・乙。**

### 乙路收口：旧宣称零残留（首轮，203cb1c）——已被独立验收判非

首轮把「零残留」核对做成了对 `grep -rn "site.*judgment\|双向锁" --include='*.md' --include='*.rs'`
命中文件的**目录级枚举**（`-l`，只到文件名），逐文件核对时又只手工重读了当轮刚编辑过的
`pi_loop.rs` 那一段（`BoundedInput` 结构体注释），没有对本文件本身重新逐行核对——而
`pi_loop.rs` 同样在命中文件列表里。独立验收（`5f3e1ca`，`packages/pi-lane/ACCEPTANCE.md`
「PI-BOUNDED-SITE-1 · 独立验收」节）把同一枚检索命令逐字复跑并加 `-n`，在同一文件里
找出两处未被首轮列出的命中：

1. `pi_loop.rs:5286-5307`（D1 覆盖自证段）——通篇现在时：「手写冻结清单……并与源码扫描
   **双向**核对」「清账表登记四模块生产段每一处受验门消费点，**新增一道门而不补表即红**」
   「清单与 `pi_loop.rs` 生产段的前置门在 `(site, judgment)` 粒度上**一一对应**」。②那句
   陈述的是一道机器门的现状，而该门自 `d70c1b5` 起不存在——今天新增一道门不补表恒绿。
2. `pi_loop.rs:7387-7390`——活测 `safe_token_family_is_fully_accounted_for` 的文档注释：
   「清单又由 ②（`(site, judgment)` 双向锁）接到生产段消费点。三段接完……才闭合」，与
   本票新写的 `:5372-5375`（「两者都不回锚清单行到生产段源码位置」）在同一文件内互斥，
   且落在同一枚测试上——本票要消除的形态在交付树内复现。

**决定性教训（同族失守）**：首轮 SPEC 把残留族定义为两条**文本模式**（`site.*judgment`、
`双向锁`），而命中 1 的三句现在时宣称（「双向核对」「不补表即红」）**都不匹配这两条模式**
——按文本模式枚举语义构造，正是本票在甲路评估里判定「结构性不可胜」的那件事，施于自查
同样失守。返修改法：族改按**语义**定义——「凡以现在时宣称退役装置（源码扫描器、清账表、
`(site, judgment)` 双向锁）在场的句子」，逐句通读 `pi_loop.rs` 内 D1 覆盖自证段
（改前 `:5286-5307`）与 SafeToken 族清账段（`:7302-7402`）的全部注释判定，不再用检索
命令的命中/未命中代替阅读。

### 返修（2026-08-09，回应独立验收 REJECT `5f3e1ca`）

按 `pi_loop.rs:263-271`（1R7 改写、经 1R6 验收以「自陈漂移」立案，`ACCEPTANCE.md:1657-1659`）
的既有正确形态——过去时叙述退役事实，指向今日真自证——逐句重写两处：

- **`:5286-5307`（D1 覆盖自证段，改后延伸至 `:5314`）**：①（清单每行 pre-journal/pre-spawn 红例）保留为现在时，
  它今天仍真实存在。②③④（源码扫描双向核对、清账表、`(site, judgment)` 粒度一一对应）
  改写为「1R3-1R5 三轮曾……」的过去时历史叙述，紧接一段显式否定现状的陈述：「这套装置已
  按 1R6 H2 整体退役……源码侧今天不存在任何扫描器或清账表，『新增一道门不补表即红』不再
  是真的」，并指出今日的自证收窄为①的行为反例加违规电池普适不变量
  （`violation_battery`／`universal_invariant_refused_host_input_leaves_zero_side_effects`）。
- **`:7394-7402`**（`safe_token_family_is_fully_accounted_for` doc，改前 `:7387-7390`）：删「清单又由 ②
  （双向锁）接到生产段消费点，三段接完才闭合」，改写为两条已验证单向关系（ADR 族 → 清单
  行存在，本测试验证；清单 → 运行时行为，`counterexample_every_bounded_host_input_is_
  refused_before_journal_and_spawn` 验证）＋ 显式声明「两段都不回锚清单行到生产段源码
  位置」，并指向 D1 段与 1R6 H2 退役事实。

订正后按语义口径逐句复核（非文本模式）：通读 `pi_loop.rs` 内提及 `site`／`judgment`／
`双向`／`扫描`／`清账表` 的全部段落（`:263-271`、`:281`、`:365-373`、`:5286-5314`、
`:5361-5388`、`:5504-5508`、`:5996-6013`、`:6000`、`:7394-7402`、`:7411`、`:8320`、
`:10081`），逐段判定是否以现在时断言退役装置在场：

| 位置 | 断言的是什么 | 是否残留 |
|---|---|---|
| `:263-271` | 1R3 双向自证已退役，今日自证是行为反例＋普适不变量 | 否（既有正确先例） |
| `:281` | SafeToken 四员 NUL 判据登记进清账表（`safe_token_ledger`，本票未动、非退役对象） | 否（另一张活表） |
| `:365-373` | 1R3→1R5 手工同步扫描器已退役，改道 encode-before-effect | 否（既有正确先例） |
| `:5286-5314` | 本票改写后：①现在时（今天仍真）＋②③④过去时（曾有、已退役）＋显式退役声明 | 否（本轮已订正） |
| `:5361-5388` | `BoundedInput` 结构体注释：1R4 设计意图（过去）＋装置已退役（现在的否定）＋今日单向关系（现在） | 否（首轮已正确，验收未点名） |
| `:5504-5508` | 1R4 抓到 `requestId` 躲过清单与扫描轴的历史，「当时」显式过去时 | 否（既有正确先例） |
| `:5996-6013`／`:6000` | 三代装置同败的历史叙述＋今日普适不变量装置的现状描述（该装置是活的，非退役对象） | 否 |
| `:7394-7402` | 本票改写后：ADR族→清单行、清单→行为两条单向关系（现在，均活）＋双向锁已随扫描器退役（现在的否定） | 否（本轮已订正） |
| `:7411` | `safe_token_ledger()` 自身的「清账表」措辞，与被退役的 `bounded_judgment_ledger` 同名不同物 | 否（同名异物，非残留） |
| `:8320` | 测试函数名 `the_tool_capability_mapping_has_exactly_one_site`，`site` 与 tool↔capability 映射相关，非本字段 | 否（同词异指） |
| `:10081` | WRITE-HOST 域 codec 双向唯一性，与 `(site, judgment)` 无关 | 否（同词异指） |

`packages/pi-lane/ACCEPTANCE.md`／`PI-WRITE-HOST-1-RECON.md`／`sandbox-probe-1.md`／
`workflow.md` 四份文档命中沿用首轮核对结论（均与本字段无关，见下方历史记录），复核未变。
本文件（`PI-HOST-CONCURRENCY-1.md`）§三-3 之一、§七之 7、§九「上浮」行的收口指针不变。
`docs/architecture/implementation-readiness.md` `PI-BOUNDED-SITE-1` 行仍留给清账/架构
会话核销。

**架构裁定留痕（不展开实现，本票边界不变）**：验收移交观察项——存在一条不复活退役装置
的甲路，判**结果**而非**形状**（如判据 helper 上加 `#[track_caller]`，由反例驱动器断言
实测 `site` 等于清单行 `site`，不读源码一个字，与 1R6 退役的文本扫描不同族）。架构已裁：
**不重开甲路、不放宽票面边界**——既有两条已验证单向关系已覆盖行为约束，`track_caller`
型结果锁的增益仅是「锚点定位精度」而非新增行为保证，且触碰生产码（`#[track_caller]` 落
在判据函数签名上）不符合复杂度节制预算（`CLAUDE.md`「复杂度节制」条：能删的方案优于能
配置的方案，能不加新生产码就不加）。本票维持乙路收口，不实现该路径。

### 退出证据

- 现读证据：`grep -rn '\.site\b' apps/desktop/src-tauri/src/*.rs` 零命中。
- 历史证据：`git log -S"scan_bounded_judgment_uses" --oneline -- apps/desktop/src-tauri/src/pi_loop.rs`
  → `e269ce5`（引入）、`d70c1b5`（退役），`git show d70c1b5 --stat` 净删 1473 行。
- 判例证据：`docs/engineering/workflow.md`「闭口按族，不按验收点名的实例」段终局形态
  （2026-08-02，源 1R4 复验）与再订正（2026-08-02，源 1R5 复验）两段，逐字引用见上。
- 首轮 REJECT：`5f3e1ca`（`packages/pi-lane/ACCEPTANCE.md`「PI-BOUNDED-SITE-1 · 独立验收」
  节），拒因见上「首轮……已被独立验收判非」。
- 旧宣称残留扫描（返修版，语义口径）：见上表，逐段核对零处仍以现在时暗示退役装置在场。
- 既有 cargo 面零回归：本轮只改注释文本，未触碰任何生产语义、字段类型或测试断言。

### 门禁实跑（返修后本票自跑，clean 重建后，逐条记退出码，未经管道吞码）

| 门 | 读数 | 退出码 |
|---|---|---|
| `pnpm --filter @courtwork/pi-lane run build:product-sidecar` | 通过，产出 `pi-loop-resources/sidecar.cjs`（547893 字节，reproducible） | 0 |
| `pnpm --filter @courtwork/pi-lane run build:headless-sidecar` | 通过，产出 `headless-sidecar.cjs`（555314 字节，reproducible） | 0 |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint` | 通过 | 0 |
| `pnpm test`（root vitest） | **1941 passed / 170 files** | 0 |
| `cargo clean` ＋ `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`（sidecar 重建后 clean 重跑） | **250 passed / 0 failed / 1 ignored** | 0 |

未跑 Playwright：本票不动 desktop 行为，只改 Rust 注释与本 SPEC 文档，`apps/desktop/src` 零改动。
