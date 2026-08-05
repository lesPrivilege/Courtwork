# PI-HOST-LOOP-1R · 首轮验收拒绝的十一项闭口

状态：**待 Fable 实现（返修）**

角色与纪律同 `PI-HOST-LOOP-1.md`（下称原票）：Fable 实现、Sonnet 只读跑腿、完成后交
全新 Codex 会话独立验收。原票全部合同条款、文件白名单、九门与禁止面**原样有效**；本件只
新增闭口，不回退任何既有门，不改 wire/payload 闭集本身——十一项全部是把既有契约语义收紧
到实现里。

拒绝证据：`PI-HOST-LOOP-1@0d4799c` 经独立验收 `314117d` **REJECT**（报告见其
`packages/pi-lane/ACCEPTANCE.md`「PI-HOST-LOOP-1 独立验收（2026-08-01，拒绝）」节）。
Node 三枚与 Rust 八枚反例全部命中 production 方法；正向 Route A controls 通过不抵消。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d` 六枚；逐枚 patch-id 与源提交相同，
冲突即停回架构。`314117d`（拒绝报告）随链入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、十一项闭口

**Node（原票 §二.1/2 语义内）**

- **N1 非法输入零回显**：`FileError` 与一切工具错误/安全提示的任何字段（含 `path`、
  message）不得包含不满足 `/case` grammar 的输入原文；非法输入一律以固定占位符
  `（非法路径）` 表示，合法输入只以归一化逻辑路径出现。canary：把真实 caseRoot 本身作
  read 参数，序列化整个错误对象零物理字节。
- **N2 provider 失败终态如实**：上游 `stopReason:'error'` 的 prompt 必以
  `failed{code:'provider_error'}`（retryable 按既有闭集）收场，`'aborted'` 走 canceled 路径；
  一切非 `'stop'|'toolUse'` 收尾不得产出 `{status:'completed'}`。
- **N3 政策拒绝的工具账如实**：case-env/policy 拒绝的 read/glob/grep，
  `tool_finished.outcome` 必为 `denied`，不得 `succeeded`；上游 error tool-result 到
  outcome 的翻译按此冻结。

**Rust（原票 §二.3/5/6/7 语义内）**

- **R1 preflight 全序冻结**：`start_inner` 次序恰为 route-pair 身份门 → case root →
  credential（Keychain read）→ durable `session_started|session_resumed` → cwd → spawn。
  counting-credential 探针下任何 route/root 失败 credential reads 恰 0；任何 preflight
  失败 journal 零字节、spawn 计数 0。
- **R2 start config 闭集前置**：`maxTurns≥1`、`maxUsd` 为正或 null 等 bootstrap/config
  非法值在 journal/spawn 前以具名错误拒绝；`maxTurns=0` 反例 spawn 计数恰 0。
- **R3 prompt 门前置**：trim 非空与 ≤131,072 bytes 校验先于 `user_prompted` append；
  非法 prompt 返回具名错误且盘上 journal bytes 逐字节不变。
- **R4 预算真值归 fold**：prompt terminal 的 `budget` 由 Rust 对本 request 已 durable
  `turn_usage_recorded` fold 得出；sidecar 自报 budget 只作 parity，逐值漂移按
  `session_failed{cause:{kind:'protocol',code:'state_violation'}}` 关 leg，不得采信或
  静默覆盖。
- **R5 wire fault 先 fold 再抛**：decode 失败、意外 EOF、超限与其他 fault 不得经 `?`
  直接逸出 `expect_packet`/driver；必须先按已 durable journal 执行 crash fold、按
  SIGTERM→SIGKILL→confirm 回收 child、落对应 durable 终态，才停止 outward publish 并
  返回错误。malformed `{` 反例：child `terminated=true` 且 session 有 durable terminal。
- **R6 shutdown 出口如实**：deadline 内 EOF + exit 0 才落 `session_completed`；
  nonzero/signal 按 `session_failed{runtime:'nonzero_exit'|'signal'}`，超时按
  `'lifecycle_timeout'` 族既有语义。child exit 7 反例必落 failed，不得 completed。
- **R7 resume fold 逐值**：`session_resumed` 的 `priorObservedTurns/priorTurns/priorUsd`
  逐值等于前序 journal fold（validator 不得只核 `previousLeg`）；篡改任一值
  `load_session`/start 必拒且零 spawn。
- **R8 单写者独占**：同一 logical session 的 journal 以 OS 级独占 advisory lock（flock
  同义，随 Host 持有至 teardown）保证单写者；第二 Host 对 live session 的 start/load 以
  具名 `session_active` 拒绝，零 journal 变化、零 spawn。锁实物路径不进模型/journal/error
  正文。`delete_container` 的 active 判定与该锁同源，不得双真源。

## 三、首红、mutation 与门

1. **首红＝验收反例原形转 permanent 测试**：十一枚按报告形态各写一枚常驻测试（Node 三枚
   入既有 `product-*.test.ts`；Rust 八枚入对应模块测试区），先在 untouched 组合树
   （`314117d` 链尖）上逐枚见红（Node 跑包内 vitest、Rust 逐测试名跑），留原始输出，再
   实现。禁 helper 缺失/stub/module-load 冒充红。
2. **mutation ≥6 枚**：分别撤 R1 次序、R3 前置、R4 fold 真值、R5 fold-before-throw、
   R7 逐值、R8 锁；逐枚验证命中、定向红、byte-identical 恢复；等价项如实登记不计红证。
3. **九门全量**（原票 §五 清单与形态不变，逐门独立 exit）。受限执行域的 localhost bind
   三红属环境事实，如实登记不计本票；门取数须在非受限域完成。
4. 回执追加在本文件尾部；实现提交先于回执提交；停在待独立验收；不 push、不 merge、不
   启动 `PI-WRITE-HOST-1`、不更新 `current.md`。

## 三·补 · 2026-08-01 架构追加裁定（Stage 2 回报四件）

1. **bundle 身份漂移随批订正**：N1–N3 改产品源码必然换 sealed CJS 身份
   （`522,649`/`4c09a985…` → `523,057`/`b72fe521439022c494477b2d41bc7b230d6aa5df2bde8668dba248d3cbf4107d`）。
   tracked manifest、`pi_loop_process.rs` 真值表与变异靶字面量同批订正为该值；runtime 两件与
   `routeId/nodeVersion/targets` 不动。该漂移由门先抓（1a 期望值红 → 2a 编译期真值表红 →
   2c 变异靶失效守卫红），属门在工作，回执须保留这条「门先于自查」的实测链。
2. **第三批既有测试调整追认**：`tail_turn_finished_without_usage_is_repaired_exactly_once`
   （单写者下二次 `load_session` 即两并存写者，插 `drop` 改为接手）、
   `budget_terminal_writes_both…`（原脚本自报 `turns:12` 而 journal 零 usage 记录，改真跑挣满
   限额）、`real_child_killed_mid_prompt…`（resume leg 沿用 fresh leg 的 `usd`，而该 leg
   `priorUsd` 已被 `costCoverage:'unknown'` 毒成 null，拆出独立断言）。三枚同属「世界变了」，
   按本意重写、强度未放宽，逐枚在回执登记前后断言对照。
3. **门 3/4 驱动器入白名单**：`packages/pi-lane/scripts/verified-node-gate.mjs` 追加为 tracked
   实现件。理由：票面 §五 把「冻结 Node × production CJS」与「冻结 Node × scripted control
   CJS」列为必跑硬门，而其唯一装置若只活在 scratchpad，门就退化为轶事——R5 验收已就同型
   evidence-packaging 缺口留过批评。约束四条：确定性、零网络、缺快照硬失败（不静默跳过）、
   不进 root `pnpm test`（循 `build-product-sidecar.test.mjs` 先例由独占命令调用）。白名单
   仅扩此一件。
4. **门 4 强化追认**：scripted 脚本改双 read（`/case` 与 `/workspace` 各一），实测 outcome
   恰 `["succeeded","denied"]`——N3 在真实 sealed 产品字节上端到端成立。

## 四、白名单

同原票 §三 全部文件（Node 产品四对＋tools＋fixture＋build 脚本＋package.json；Rust 四模块
＋lib.rs＋Cargo.toml 注释＋manifest＋tauri.conf；isolation 两件），另加本文件回执区。
`ACCEPTANCE.md`、原票合同区与其余一切只读。R8 若需锁文件落点，物理上只许住
`app_data_dir()/pi-loop/<containerId>/` 既有层级内（如 `<sessionId>.jsonl.lock`），不新增
顶层目录；命名在回执登记。

---

## 五、实现回执（2026-08-01）

状态：**返修完成，停在待独立验收**。未提交、未 push、未 merge、未启动 WRITE/GUI/DMG/Pages，
`docs/status/current.md` 未动。

基线为 `main@70dae96`（含本件「三·补」四件裁定）；六枚组合链已变基其上，逐枚 patch-id 与变基前
相同（`ab383353…`／`e30451ee…`／`d10ae811…`／`c08eb7d5…`／`4c0a1ac5…`／`dd0aa316…`）。
分支 `codex/pi-host-loop-1r`。
实现改动面十份，另加本文件回执区，全在 §四 白名单内；`ACCEPTANCE.md`、原票合同区、
`Cargo.lock`、`pnpm-lock.yaml` 零触碰。实现与回执分提交，由架构角色决定提交时点。

| 文件 | +/− |
|---|---|
| `apps/desktop/src-tauri/src/pi_loop.rs` | 973 / 117 |
| `apps/desktop/src-tauri/src/pi_loop_journal.rs` | 181 / 0 |
| `apps/desktop/src-tauri/src/pi_loop_process.rs` | 8 / 5 |
| `apps/desktop/src-tauri/pi-sidecar/route-manifest.json` | 2 / 2 |
| `packages/pi-lane/src/product-case-env.ts` | 25 / 6 |
| `packages/pi-lane/src/product-case-env.test.ts` | 63 / 0 |
| `packages/pi-lane/src/product-runtime.ts` | 49 / 3 |
| `packages/pi-lane/src/product-runtime.test.ts` | 101 / 0 |
| `packages/pi-lane/scripts/verified-node-gate.mjs` | 新增（「三·补」裁定三扩入白名单） |
| `packages/pi-lane/package.json` | 只加两枚独占 gate script，零依赖 |

### 1. 首红账

十一枚验收反例按报告形态转为常驻测试，先在**未改一行 production** 的组合链尖上逐枚见红，
再实现。首红那一轮跑在变基前的 `78103d3`；变基到 `70dae96` 后同一枚是 `39426e8`，patch-id
`dd0aa316…` 不变，故首红读数对交付基线同样成立。该轮 `git diff --numstat` 为 `640/0` `pi_loop.rs`（单一 hunk `@@ -2775,0 +2776,640`，
全落 `mod tests` 内）、`63/0` 与 `101/0` 两份 Node 测试，零删除。

Node 跑包内 vitest：14 files / 443 tests，**7 failed / 436 passed，exit 1**（基线 433，
新增十枚＝七红＋三对照绿）。Rust 逐测试名 `cargo test --lib <name> -- --exact`，
**八枚全部 exit 101**；全量 `cargo test --lib` 为 150 passed / 8 failed / 1 ignored。

| 枚 | 测试 | 首红输出 | 命中的 production 坐标 |
|---|---|---|---|
| N1 | `非法输入零回显（N1）` 三枚（`product-case-env.test.ts`） | `"path":"/private/var/…/案卷"` 原样回显；写面拒绝给 `undefined` | `product-case-env.ts:165-166`、`:212` |
| N2 | `provider 失败终态如实（N2）` 两枚 | `expected 'completed' to be 'failed'` | `product-runtime.ts:288`；stop reason 在 `:211-235` 被丢弃 |
| N3 | `政策拒绝的工具账如实（N3）` 两枚 | `['succeeded']` ≠ `['denied']` | `product-runtime.ts:265`；denied 信号在 `tools.ts:122/153/211` |
| R1 | `counterexample_credential_is_read_only_after_route_and_case_root_pass` | 「route 身份门必须先于 Keychain read」left **1** right 0 | `pi_loop.rs:339` 凭证 → `:342` 根 → `:352` route |
| R2 | `counterexample_start_config_closed_set_is_refused_before_journal_and_spawn` | 「maxTurns=0 须以具名错误拒绝，实得 `Protocol(InvalidSchema)`」 | 闭集只在 `:491` bootstrap 编码时兑现，晚于 `:384` journal 与 `:437` spawn |
| R3 | `counterexample_prompt_gate_runs_before_the_user_prompted_append` | 「空串 须以具名错误拒绝，实得 `Protocol(InvalidSchema)`」 | `:593-599` append 先于 `:604` send |
| R4 | `counterexample_terminal_budget_comes_from_the_rust_fold_not_the_self_report` | `prompt()` 返回 `Ok(Completed{turns:9, usd:7.5})` | `:695-724` 直接采信 `terminal.budget` |
| R5 | `counterexample_wire_fault_folds_and_reclaims_before_throwing` | 「fault 必须先回收 child 再抛」`terminated=false` | `:534-537` decode/Eof/Fault 经 `?` 与 `return Err` 逸出 |
| R6 | `counterexample_shutdown_exit_status_is_reported_truthfully` | child exit 7 下 `shutdown()` 返回 `Ok(())` | `:779-785` 只特判 `Pending` |
| R7 | `counterexample_resume_checks_every_prior_value_against_the_preceding_fold` | priorTurns 1→0 未被拒，实得 `Process(UnexpectedEof)`（即已过验证并 spawn） | `pi_loop_journal.rs:1735-1744` 只核 `previous_leg` |
| R8 | `counterexample_a_second_host_on_a_live_session_is_refused_as_session_active` | 第二 Host 成功起为 `leg: 2` | `pi_loop.rs:180-205` 进程内登记册；`pi_loop_journal.rs:1929` 零锁 |

反例均直接驱动 production 方法或 factory；counting credential 与 scripted leg/spawner 只隔离
Keychain 与真进程两处外部 I/O，未复制被判状态机。R1 的计数探针与 R8 的双 Host 形态都不依赖
临时补丁，随测试常驻。每族另附对照绿（合法输入仍归一化、`stop|toolUse` 仍 completed、
界内调用仍 succeeded、三门齐过仍能起、parity 相符仍放行、还原后仍能 resume、
锁交出后仍能起新 leg），证明断言非恒红。

### 2. 逐项实现摘要

**N1 非法输入零回显**。`product-case-env.ts:50` 新增 `ILLEGAL_PATH_PLACEHOLDER = '（非法路径）'`；
`locate()`（`:173-179`）与 `denyWrite()`（`:226-232`）的非法分支一律投影该常量，不再复述入参原文。
`createTempDir` / `createTempFile` 无目标可投影，改走 `denyWrite(undefined, false)` 保持不带 `path`。
测试侧持契约字面量而非引用产品常量：两处一旦漂移即触红。

**N2 provider 失败终态如实**。新增 `completionFor()`（`product-runtime.ts:160`）与
per-prompt 的 `lastStopReason`（`:214`，`onTurnEnd` 记、`startPrompt` 清）。`finish()`（`:333`）
不再无条件发 `completed`：`stop|tool` 收 completed，`error` 收 `failed{provider_error, retryable:true}`，
其余（`aborted`、`length`、`unknown`）落七格闭集兜底 `unknown`。`aborted` 不单列一支——
状态机的 `budget_stopped > cancel > 其他 outcome` 优先级会压过此处 intent，真有 cancel 或越限时
仍走 canceled / budget_stopped。

**N3 政策拒绝的工具账如实**。新增 `isDeniedToolResult()`（`:146`），读上游
`tool_execution_end.result.details.denied`；`onAgentEvent` 的翻译（`:309`）冻结为
denied > failed > succeeded。上游 `harness/tools` 从不写 `details.denied`，该键的唯一来源是本包
`tools.ts` 的三处容器拒绝分支。

**R1 preflight 全序**。`start_inner` 改为 token → config → route → case root → credential →
durable → cwd → spawn（`pi_loop.rs:350-453`，六段编号注释即次序）。原序的三行注释也是错的，一并订正。

**R2 config 闭集前置**。新增 `validate_start_config()`（`pi_loop.rs:213`，调用点 `:352`）：`maxTurns ≥ 1`、
`maxUsd` 为正有限数或 null、`modelId` trim 非空，均在 route 之前兑现。落点取在最前是因为它零 I/O：
非法配置不该先花掉一次 Keychain read、一条 journal 记录与一枚进程，再由 encoder 兜底。

**R3 prompt 门前置**。`prompt()` 在 `user_prompted` append 之前校验 trim 非空与
`text.len() ≤ MAX_TEXT_BYTES`（`pi_loop.rs:634-640`），具名 `HostError::InvalidPrompt`。

**R4 预算真值归 fold**。`pi_loop_journal.rs` 导出 `budget_of(records, max_turns, max_usd)`；
`pi_loop.rs` 新增 `folded_budget()`（`:740`），`budget_stopped` 的 `stopReason` 由同一份 fold 的
limit 状态派生。`record_prompt_terminal()`（`:753`）先算真值、再与自报值逐值比对，
不等即 `fail_protocol(StateViolation)` 关 leg；相等则落 Rust 算出的那一份，session 侧第二笔同源。
浮点可逐位比较的依据：两侧对同一串 `turn_usage_recorded` 按同序作同一左折叠，
`prior_usd` 亦由同一折叠产生。

**R5 fault 先 fold 再抛**。`expect_packet()`（`pi_loop.rs:544`）不再让 decode 失败、EOF 与
其他 fault 经 `?` 逸出：decode 失败走 `fail_protocol`，进程侧 fault 走新增的 `fail_process()`（`:575`）。归因不在该函数定，仍由 `load_session` 的五步 crash fold 按已 durable journal 决定；
`fail_process` 只保证「fold 先于抛」这一条次序，`LifecycleTimeout` 与其余 fault 分别映射到
`SessionInterruptReason` 两枚既有值。

**R6 shutdown 出口如实**。`shutdown()` 拆成两阶段（`pi_loop.rs:839`）：阶段一取回 EOF 观察与
退出结局并结束对 leg 的借用，阶段二判定。只有 deadline 内 EOF 且 exit 0 才落 `session_completed`；
`Code(_)` / `Signal(_)` / `Pending` 分别走既有
`session_failed{cause:{kind:'runtime',code:'nonzero_exit'|'signal'|'lifecycle_timeout'}}`，
经既有 `fail_runtime()` 落账，未新增 runtime code。

**R7 resume 逐值**。`validate_records()` 边走边维护一份与 `fold` 同序同运算的累计
（`pi_loop_journal.rs:1883`），遇 `session_resumed` 时把 `priorObservedTurns / priorTurns /
priorUsd` 与前序 fold 逐值比对（`:1845-1856`），不等即 `StructureProblem`，由既有路径整份 quarantine。

**R8 单写者独占**。`pi_loop_journal.rs:1477` 新增 `SessionLock`：
`flock(LOCK_EX|LOCK_NB)`，Drop 时 `LOCK_UN`。取 `flock` 而非 `fcntl` 记录锁，是因为后者按进程归属，
同进程的第二把总能拿到，对「同一宿主里起第二枚 Host」零区分力；`flock` 按 open file description
归属，同进程不同 fd 之间同样冲突。锁在 `load_session` 的**任何读写之前**取，被拒的 Host 因此零
journal 变化、零 spawn。`PiLoopHost` 持 `lock: Option<SessionLock>` 至 teardown；干净 shutdown 与
Drop 各交出一次。`reclaim_after_fault` 走新增的 `load_session_holding`，交回同一把锁——
先放再取既会自锁，也会在窗口里把写权对外开一条缝。`delete_container` 的 active 判定改由
`container_has_live_session()`（`:1526`）逐 session 试取同一把锁得出，进程内 `active_containers` 登记册
（旧 `pi_loop.rs:180-205`）整段删除：那是第二个可漂移的真源。

**锁文件命名**：`app_data_dir()/pi-loop/<containerId>/<sessionId>.jsonl.lock`，与 journal 同级同名加
`.lock`，未新增顶层目录。它只是句柄载体，路径与内容都不进模型、journal 或 error 正文。

### 3. mutation 分账

十一枚 production mutation，逐枚命中校验（替换命中数不符即作废，不计红证）、逐枚定向红、
逐枚 `cp` 还原后 shasum 与 pristine 逐位相同。合同点名的六枚为 M1、M2、M3、M4、M5、M6；
其余五枚补齐十一项闭口的一一对应。

| 编号 | 撤销的闭口 | 变异 | 定向红 |
|---|---|---|---|
| M1 | R1 次序 | credential 读取移回 route 之前 | R1 反例 + 重写后的三门测试**双双**转红 |
| M2 | R3 前置 | 删 trim/容量两条判据 | R3 反例（实得 `Protocol(InvalidSchema)`） |
| M3 | R4 fold 真值 | 删 parity 门并改用自报 budget | R4 反例（`Ok(Completed{turns:9, usd:7.5})`） |
| M4 | R5 fold-before-throw | 恢复 `?` 与裸 `return Err` | R5 反例（`terminated=false`） |
| M5 | R7 逐值 | 删 prior 三值比对 | R7 反例（篡改仍放行并 spawn） |
| M6 | R8 锁 | `flock` 判据改 `if false` | R8 反例 + 重写后的 `delete_container` 测试**双双**转红 |
| M7 | R2 前置 | 摘掉 `validate_start_config` 调用 | R2 反例 |
| M8 | R6 出口 | 退出结局一律折成 `None` | R6 反例（`shutdown()` 返回 `Ok(())`） |
| M9 | N1 占位符 | `path` 改回入参原文 | N1 三枚 |
| M10 | N2 映射 | `finish()` 改回无条件 `completed` | N2 两枚 |
| M11 | N3 denied | 翻译改回只按 `isError` 二分 | N3 两枚 |

无等价项、无作废项。

十一枚在 §五.5 偏离二（manifest 订正）与偏离六（rustfmt / clippy 修正）落定**之后**于交树态整批
重跑一轮，故下列 pristine shasum 与交付的工作树逐位相同，验收者可直接比对：

| 文件 | pristine sha256 |
|---|---|
| `apps/desktop/src-tauri/src/pi_loop.rs` | `1bb635183f1b3a8f092c70e847cf249d54855ebe4bd709c031db043dd3133b96` |
| `apps/desktop/src-tauri/src/pi_loop_journal.rs` | `8396d690fe7e31d5fa21256453942ae9a67b7d81ee493a04df41a6e06b1da897` |
| `packages/pi-lane/src/product-case-env.ts` | `12bdb7e549823ef2b44d7f9605406d6cb98e0e2b48c28b40d8840d82d4441f2d` |
| `packages/pi-lane/src/product-runtime.ts` | `2a0015aba2ff307b369fb5af785b3fdb18d213ec8a65a1d35e7d59612b0ec691` |

重跑读数：Rust 八枚 `cargo test --lib … -- --exact` 全 exit 101（M1 与 M6 各带出第二枚红，
即两枚重写测试），Node 三枚 vitest 全 exit 1（M9 `3 failed | 47 passed`、M10 与 M11 各
`2 failed | 27 passed`）；十一枚还原后 shasum 与上表逐位相同。

### 4. 九门数字

各门单独取 exit，不经管道，跑在最终树上。

| 门 | 命令 | 读数 | exit |
|---|---|---|---|
| 1a | `pnpm --filter @courtwork/pi-lane test` | 14 files / 443 tests | 0 |
| 1b | `pnpm --filter @courtwork/pi-lane test:product-sidecar` | 10 tests / 10 pass | 0 |
| 1c | `node --test scripts/assert-isolation-binding.test.mjs` | 43 tests / 43 pass | 0 |
| 2a | `cargo test` | 158 passed / 0 failed / 1 ignored | 0 |
| 2b | `cargo test --lib -- --ignored` | 1 passed（快照 E2E，15.50 s） | 0 |
| 2c | `rustfmt --check` 本票四模块 | 零行 | 0 |
| 2d | `cargo clippy --all-targets -- -D warnings` | 7 处全落 `src/lib.rs`；本票四模块零命中 | 101（既有基线，见偏离六） |
| 3 | `pnpm --filter @courtwork/pi-lane gate:verified-node-production` | 10/10 | 0 |
| 4 | `pnpm --filter @courtwork/pi-lane gate:verified-node-control` | 14/14 | 0 |
| 5 | `pnpm -r build` | 全包通过 | 0 |
| 6 | `pnpm lint` | 零命中 | 0 |
| 7 | `pnpm test` | 166 files / 1,766 tests | 0 |
| 8 | `pnpm --filter @courtwork/desktop lint:isolation-binding` | 扫 10 份宿主源码、30 份 pi lane 源码 | 0 |
| 9 | `git diff --check` | 零行 | 0 |

**执行域**：本域不受限。验收报告记录的 3 枚 localhost bind `Operation not permitted`
（cancel endpoint 与两枚 mock endpoint）在本域**不复现**——除首红那 8 枚外，
`cargo test --lib` 的既有 150 枚全绿。九门取数因此全部在非受限域完成，无跳过项。

**门 3 物理读数**：`pi-sidecar-aarch64-apple-darwin`（112,928,848 B）跑 production sealed CJS
（523,057 B）：bootstrap → `ready{capabilities:["case_read"]}` → shutdown →
`terminal{status:"shutdown"}` → EOF → exit 0。恰两枚出包，stderr 0 B，EOF 前无残留半行，
出包不含 key 与物理案件根，production bundle 不含 control canary。

**门 4 物理读数**：同一枚冻结 runtime 跑由同一 `createProductRuntime` factory 现编的 control CJS：
`ready → tool_started → tool_finished{read,succeeded} → turn_finished → tool_started →
tool_finished{read,denied} → turn_finished → assistant_text_delta ×2 → turn_finished →
terminal{completed} → terminal{shutdown}`，exit 0，stderr 0 B。两枚 read 一界内一界外，
outcome 恰为 `["succeeded","denied"]`——N3 在真实 sealed 字节上端到端成立，且拒绝不再伪成成功。
助手正文按 delta 拼回后含案件实物里的 `HT-2024-081`。门 3 / 门 4 的判定层不复用仓内 codec，
只做裸 JSON 行解析与逐字段断言。

### 5. 偏离与登记

**一、Route A 快照重建与下载（架构已追认）**。desktop crate 的 `tauri-build` 校验
`bundle.externalBin` 实物存在，无快照则一枚 Rust 测试都编译不了，故执行票面独占命令
`pnpm --filter @courtwork/pi-lane build:product-sidecar`，从 `https://nodejs.org/dist/v22.23.1/`
取两枚官方 archive（约 101 MB，脚本按冻结 SHA-256 与同次 `SHASUMS256.txt` 双验）。
首建三件与原票 §二.4 冻结真值逐位相同：arm64 `112,928,848` /
`2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`，x64 `115,447,952` /
`03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`，`sidecar.cjs` `522,649` /
`4c09a985f489bbc791686197f44a5303fb1295a657c855d3df679bf776967f6b`。
另跑 `pnpm install --frozen-lockfile`，`pnpm-lock.yaml` 未变。

**二、bundle 身份随 product source 更新**。N1–N3 改的是产品源码，sealed CJS 因此换身份：
`523,057` B / `b72fe521439022c494477b2d41bc7b230d6aa5df2bde8668dba248d3cbf4107d`（现编两次
byte-identical）。tracked `route-manifest.json` 的 `bundle.bytes/sha256` 同批更新；
`pi_loop_process.rs` 的冻结真值表与其「零字节 / 大写 SHA」两枚变异靶字面量随之订正。
两枚 runtime bytes/SHA 与 `routeId/nodeVersion/targets` 未变。

**这条漂移由门先抓，不是自查发现的**——三级实测链逐级留档：

| 级 | 门 | 实测输出 | 它证明了什么 |
|---|---|---|---|
| 一 | 1a `product-main.test.ts` 的跨侧核验 | `AssertionError: expected 522649 to be 523057`（`product-main.test.ts:672`） | tracked manifest 与**现编** product CJS 逐值绑定，source 一动即红，不必等独占下载或发布命令 |
| 二 | 2a `compiled_manifest_decodes_and_matches_the_frozen_truth_table` | `left: 523057 / right: 522649`（`pi_loop_process.rs:915`） | `include_bytes!` 的编译期 expected-side 与真值表同样锁死，Rust 侧不吃 Node 侧的一面之词 |
| 三 | 2c `counterexample_manifest_shape_drift_goes_red_one_by_one` | `assertion left != right failed: 零字节：变异必须真的命中` | 连**变异靶字面量失效**都被守卫抓住——旧 bytes 串已不在 manifest 里，那一枚注入会退化成 no-op，守卫拒绝把 no-op 记成红证 |

三级都在实现者自查之前先红。第三级尤其值得留档：它是「0 红可能是补丁没生效」这条判例的正向兑现
——门自己不肯把失效的注入当成有效反例。
快照按生成器规则显式清根后重建（`rm -rf packages/pi-lane/dist/product-sidecar`，
archive 走本地缓存，无二次下载）。

**三、重写既有绿测之一：preflight 三门**（架构裁定三已追认）。
`credential_and_case_root_gates_run_before_route_journal_and_spawn` 把**错误次序**编码成了规范
——那正是被判的病灶本身，故按本意重写为
`route_then_case_root_then_credential_gate_in_order_before_journal_and_spawn`。
前后对照：旧形态三段依次断言「无凭证 → `CredentialUnconfigured`」「symlink 根 → `CaseRoot`」
「坏 route → `Route`」，对 Keychain 读了几次没有任何约束，且后两段在正序下根本走不到；
新形态改为四段——坏 route（credential reads 恰 0）、symlink 根（credential reads 恰 0、
spawn 0、journal 零字节）、无存档（spawn 0、journal 零字节）、三门齐过（credential reads 恰 1、
spawn 1、journal 存在）。只加约束，未放宽、未删除、未加豁免。可红性已复验：M1 下该枚与 R1 反例
双双转红。

**四、重写既有绿测之二：`delete_container` active 判定**（同上追认）。旧形态用
`mark_active("cnt-a")` 往进程内登记册塞名字，该登记册已按 R8 废除。改为真持一把 session 单写者锁，
并把「零 effect」从「文件仍存在」收紧为「journal bytes 逐位不变」，另加「邻居 `cnt-b` 的 active
判定必须为 false」。原意（active 拒删零 effect、幂等、邻居 byte-identical）全部保留。
可红性已复验：M6 下该枚与 R8 反例双双转红。

**五、随 R8 调整的第三枚既有测试**。`tail_turn_finished_without_usage_is_repaired_exactly_once`
的「幂等：再载一次」原先在前一枚 `LoadedJournal` 仍存活时二次 `load_session`；单写者语义下那是
两个并存写者，故插入一行 `drop(reloaded)` 使其成为**接手**而非并肩。幂等断言本身未动。
同批另有两枚测试因 R4 而调整，均属「自报 budget 无 journal 背书」的旧形态：
`budget_terminal_writes_both_prompt_and_session_records_before_publishing` 原脚本
`turns:12 / usd:0.5 / reached` 而 journal 里一条 `turn_usage_recorded` 都没有，改为
`maxTurns=2` 下真跑满两个回合把限额挣到（本意「两笔都落账后才发布」不变）；
`real_child_killed_mid_prompt_folds_to_interrupted_and_resumes_on_a_new_leg` 的 resume leg
沿用了 fresh leg 的 `usd:0.25` 应答，而该 leg 的 `priorUsd` 已被 `costCoverage:'unknown'` 毒成 null
——真 sidecar 拿到 `priorUsd:null` 只会回 null，故 `leg_arms` 拆出
`leg_arms_with_terminal_budget`，resume 路给 `usd:null`。三枚都是「1R 改变了世界」，
不是原先写错，也未放宽任一断言。

**六、clippy 与 fmt 的既有基线**。`cargo clippy --all-targets -- -D warnings` 现有 7 处命中，
全部落 `src/lib.rs`（5 处 unnecessary `unsafe` 与 2 处其余），与原票 §八.7 偏离五登记的基线逐项相同；
本票四模块零命中。本轮曾在 `pi_loop_journal.rs` 引入一处 `collapsible_match`，已改 match guard 消除。
`rustfmt --check` 对本票四模块零行；应用 rustfmt 之前先核过五处待格式化区间全部落在本轮新增行内
（四模块在原票已认证 rustfmt-clean），未触及既有代码。既有文件的 `cargo fmt` 基线仍不动。

**七、门 3 / 门 4 驱动器已入白名单**（「三·补」裁定三）。初稿驱动器只活在会话 scratchpad，
与 R5 验收批评过的 evidence-packaging 缺口同类；按裁定收为 tracked 实现件
`packages/pi-lane/scripts/verified-node-gate.mjs`（404 行），`package.json` 加两枚独占 script 调用。
四条约束的落点与实测证据见 §五.7。

**八、external smoke 未跑**。本机无真实 DeepSeek key，`case-read external smoke` 记 blocked，
按原票 §二.2 不冒充 deterministic harness 失败，也不阻断本票。

无 `[需架构拍板]` 悬置项。

### 6. 第三批既有测试的前后断言对照

「三·补」裁定二追认的三枚。三枚都不是原先写错，而是 1R 的语义改变了它们的前提；
逐枚按本意重写，断言强度只增不减。

| 测试 | 旧断言（1R 前成立） | 与 1R 的冲突 | 新断言 |
|---|---|---|---|
| `tail_turn_finished_without_usage_is_repaired_exactly_once` | 在前一枚 `LoadedJournal` **仍存活**时二次 `load_session`，断言 `!again.repaired_turn_usage` 且 usage 行恰 1 | R8 把 journal 收为单写者独占，二次 `load_session` 即两个并存写者，实测 `SessionActive` | 幂等断言逐字不动，只在其前插 `drop(reloaded)`——「再载一次」由**并肩**改为**接手** |
| `budget_terminal_writes_both_prompt_and_session_records_before_publishing` | 脚本一枚 `turns:12 / usd:0.5 / turnLimit:reached / stopReason:turns` 的自报 budget，journal 里**零条** `turn_usage_recorded`；断言末两笔恰为 `prompt_budget_stopped` + `session_budget_stopped`，且两笔都落账后才发布 | R4 令预算真值归 Rust fold，该形态正是要被 `state_violation` 关 leg 的漂移 | `maxTurns` 收为 2，真跑两个 counted turn（各 0.25）把限额**挣**到；自报值改 `turns:2 / usd:0.5 / reached / turns`，与 fold 逐值相同。末两笔与发布次序的断言逐字不动 |
| `real_child_killed_mid_prompt_folds_to_interrupted_and_resumes_on_a_new_leg` | resume leg 复用 `leg_arms()`，其终态 budget 为 `open_budget(1, Some(0.25))` | 该 leg 的 `priorUsd` 已被 `session_interrupted{costCoverage:'unknown'}` 毒成 null（同一测试的 `priorUsd:null` 断言自证），Rust fold 因此给 `usd:None`；拿到 `priorUsd:null` 的**真** sidecar 也只会回 null，旧应答本就不是真实行为 | 拆出 `leg_arms_with_terminal_budget(request_id, budget)`：fresh 路仍 `open_budget(1, Some(0.25))`，resume 路改 `open_budget(1, None)`。leg 号、prior 三值、跨 leg requestId 去重等断言逐字不动 |

### 7. 新增白名单件与四条约束的实测

`packages/pi-lane/scripts/verified-node-gate.mjs`（404 行），`package.json` 加两枚独占 script：
`gate:verified-node-production` 与 `gate:verified-node-control`，两形态各自独立退出码。

| 约束 | 落点 | 实测 |
|---|---|---|
| 确定性 | 输入全固定；每步等**条件**（收够 N 枚出包或进程退出）并带 30,000 ms 上界，不睡定长 | 两门各跑两轮，出包序列与断言集逐轮相同；「未触任一步的等待上界」是独立断言，超界即杀 child 并具名报是哪一步 |
| 零网络 | production 形态只用内存 dummy key，control 形态把 provider 换成 pi-ai faux；child `env: {}`，代理变量也带不进去；文件内零 fetch/download，快照与 archive 只读既有实物 | 两门 stderr 均 0 字节；两门各带「出包不含 provider key」与「出包不含物理案件根」两枚 canary |
| 缺快照 / 缺产物硬失败 | `requireFile()` 三件必在且非空，再与 tracked manifest 逐值比对 bytes/SHA；任一不满足即 `process.exit(2)`。全文件零 `\|\| true`、零静默跳过分支 | 见下两枚 |
| 不进 root `pnpm test` | 循 `build-product-sidecar.test.mjs` 先例，只由独占 script 调用；root vitest 的 include 是 `packages/*/src/**/*.test.ts`，`scripts/*.mjs` 结构上在其外 | 加件前后 root `pnpm test` 同为 166 files / 1,766 tests、exit 0 |

硬失败两枚实测（移走产物 → 跑门 → 还原；`sidecar.cjs` 还原后 sha256 仍为
`b72fe521439022c494477b2d41bc7b230d6aa5df2bde8668dba248d3cbf4107d`）：

- **缺产物**：移走 `dist/product-sidecar/sidecar.cjs` 后跑 production 门，**exit 2**，
  输出 `verified-node-gate: 缺production sealed CJS：…/sidecar.cjs`，并附补救命令
  `先跑独占命令生成快照：pnpm --filter @courtwork/pi-lane build:product-sidecar`。
- **bytes 漂移**：把 `sidecar.cjs` 截成 100 字节后跑 control 门，**exit 2**，
  输出 `verified-node-gate: sealed CJS bytes 漂移：实物 100 ≠ manifest 523057`。

两枚都在跑门**之前**停下，未产出任何一行伪绿。还原后两门复跑：production 10 项全 PASS、
control 14 项全 PASS，各自 exit 0；§五.4 门 3 / 门 4 的读数即取自该轮。

### 8. 停点

实现停在本分支，未提交。交全新 Codex 会话在独立 clean worktree 复验；验收者按原票 §六 独立重建
Node/CJS 快照，不消费本会话的 ignored `dist/product-sidecar`、runtime cache 或 manifest 读数——
`verified-node-gate.mjs` 已 tracked，验收者可在自建快照上直接复跑门 3 与门 4。
