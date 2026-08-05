# PI-READ-TOOLCALL-1 · 实现回执（2026-08-05，read/glob/grep host op 的 `active_tool_call` 缺口修复）

票面：就绪图 `PI-READ-TOOLCALL-1` 注（`docs/architecture/implementation-readiness.md` ~:223）＋
`PI-BASE-HEADLESS-ACCEPT` 行；`PI-HEADLESS-HARNESS-1.md` §三（headline 阻断项定谳 ＋ blocker
characterization）；`PI-WORKSPACE-READ-1.md`（读臂 peek 语义、M3）；`ACCEPTANCE.md` §4；
`SPEC.md` §九；ADR-022 六-B/六-C。基线 `claude/pi-read-toolcall-1@b94cbc5`（main@4ab5671 之后）。

单文件生产改动 ＋ 一枚辅助门校准，两处：
- **组件A（`active_tool_call` 状态机语义）＋ 组件B（覆盖洞闭合）**：`apps/desktop/src-tauri/src/pi_loop.rs`。
- **顺修陈旧辅助门**：`packages/pi-lane/scripts/verified-node-gate.mjs`。

---

## 一 · 根因（三证定谳，harness 验收已下）

真 Agent 经 `read`／`glob`／`grep` 读 `/workspace`（一枚 `workspace_read` host op）**此前恒**
`Protocol(StateViolation)`。三证：

1. **源级**：`pump` 的 `ToolStarted` 处理只在 `tool_name: ProductToolName::Write` 一臂 arm
   `active_tool_call`，读三工具的 `tool_started` 落 `_ => {}` 不 arm；而 `serve_read_request`
   （`PI-WORKSPACE-READ-1` 落地时已正确写成 **peek**：`if self.active_tool_call.is_none() ⇒ StateViolation`）
   要求「读须归属一枚在场 tool call」。读工具从不 arm ⇒ 读 host op 到来时无主 ⇒ 当场翻红。
2. **wire 探针**：`headless_workspace_readback_…blocker`（原 HARNESS-1 钉子）以**真** headless
   sidecar ＋ 真 read 工具驱动 `/workspace` 回读，实测 `Err(Protocol(StateViolation))`。
3. **一行修复变异**：把 arm 扩到读三工具即转绿（见 §四证据表 born-red↔green 与 mutation M-A1）。

**兼覆盖洞（第四例放行后逃逸，与 golden-坏形／quarantine／五-7 同族）**：`PI-WORKSPACE-READ-1`
的全部 Rust 读臂集成用例一律以 `tool_started_line`（`ProductToolName::Write`）**顶名** arm——
即在一枚 workspace_**read** host op 前先发一枚 **write** `tool_started` 顶住 `active_tool_call`，
读 host op 因此从未被真 read 工具驱动过。唯一真 Read `tool_started` 用例读 `/case`（直读、无 host
op），照不到本缺口。故「真 read 工具＋真 host op」组合从未被跑过。

---

## 二 · peek 裁定（核状态机语义变更，极窄，单列）

**改动一处**：`pump` 的 `ToolStarted` 臂由 write-only 改为**凡能发 host op 的工具都 arm**。
`ProductToolName` 闭集恰四道，四道各会发一枚 host op（`write→workspace_write`，
`read/glob/grep→workspace_read`），故四道都 arm。

**取／peek 的分野在下游、不在此处，一字未动**：
- **write**：`serve_host_request` 0.3 步 `self.active_tool_call.take()`——认领即消费（一 tc 一 op），
  同一枚 tool call 的第二枚 `host_request` 因此当场无主。
- **read/glob/grep**：`serve_read_request` `self.active_tool_call.is_none()` 判据——只 **peek** 不
  take，同一枚 tool call 可发多枚读 operation（一次 `glob` 逐层 `list`）。`ToolFinished` 臂在 tool
  call 收束时统一清 `active_tool_call`（tool_call_id 匹配即清，read/write 同路）。

**为何是「凡能发 host op 的工具」而非按名点两三个**：arm 谓词写成对 `tool_name` 的**穷举**
`match`（无 `_`），四道 variant 各列。`closed_enum!` 将来添一道工具，此 `match` 不更新即**编译失败**，
逼出「新工具是否 arm」的显式裁定——不让它像本票的读工具当初一样静默落 `_` 不 arm（那正是本缺口与
read host op 恒 `StateViolation` 的病根，即在案判例「unknown → 跳过是病根」的又一形）。

**边界**：wire schema、`fold()` 推进臂、`uncertain` 压扁、capability 种子、`serve_read_request`
的 peek 判据、`serve_host_request` 的 take、十九型 journal 闭集——**一字未动**。arm 是纯进程内瞬态，
不落 journal、不上 wire，故本变更零契约面。

---

## 三 · 覆盖洞闭合族表（闭口按族：全族转真 read tool_started，非只点名者）

新增测试助手 `read_tool_started_line{,_for}`／`read_tool_finished_line{,_for}`（带 `ProductToolName`
参数），驱动**真** read tool call；`tool_started_line`（write）保留给写臂 bracket。三道 read 工具名
（Read／Glob／Grep）在族内全覆盖。

| # | 用例 | 读 op | 原 tool_started | 改后（真 read 名） | born-red 实测 |
|---|---|---|---|---|---|
| 1 | `real_read_arm_returns_the_bytes_the_write_arm_landed` | ReadFile | Write 顶名 | **Read** | `StateViolation`（"闭环必须走得通"） |
| 2 | `read_arm_serves_many_operations_under_one_tool_call` | List×2＋Exists | Write 顶名 | **Glob** | `StateViolation`（"多枚读必须都被服务"） |
| 3 | `counterexample_read_proposal_hash_is_recomputed_and_binds_every_read_field` | List | Write 顶名 | **Grep** | `StateViolation`（"hash 不符只收束这一枚"） |
| 4 | `read_arm_refuses_symlinks_and_never_leaks_physical_paths` | ReadFile | Write 顶名 | **Read** | `StateViolation`（"拒绝只收束这一枚"） |
| 5 | `a_new_leg_after_interruption_reads_back_what_the_previous_leg_wrote` | ReadFile | Write 顶名 | **Read** | `StateViolation`（"第二腿必须读得到"） |
| C | `headless_workspace_readback_succeeds_after_read_toolcall_fix`（原 blocker 转正） | 真 headless sidecar／真 read 工具 | 断言坏态 StateViolation | 断言 `Ok(Terminal::Completed)` | 得 `Err(Protocol(StateViolation))` |

族边界复核（保留、不转）：`counterexample_host_request_gates_refuse_before_any_effect` 的两枚读
case 属 fail-closed 门反例，非「顶名成功」族——「读能力未谈成」在 0.1 capability 门先于 peek 判据被拒
（tool_started 名无关），「读的无活动 tool call」**故意无 tool_started**，正是证 peek 门在无在场 tool
call 时仍拒的负例（本票 arm 只在 `ToolStarted` 事件落，无事件即不 arm，该负例修后仍红-able）。故此二
case 保持 Write／无 started 原样，转它反而毁掉负例。`headless_driver_runs_a_whole_leg…`（既有真跑）
读 `/case`、无 host op，arm 前后 `active_tool_call` 均净归 None，不受影响。

组件B 的 born-red 语义：真 read tool_started 在**未修** production 下，读 host op 无主 ⇒ 6 枚全红
`StateViolation`（§四），坐实「覆盖洞真实存在、Write 顶名遮蔽了它」。

---

## 四 · 门与证据（包级，2026-08-05 实现 worktree 实测）

制品在位（product `sidecar.cjs` 546,906 B／`36615e5b…`、headless `headless-sidecar.cjs`
554,327 B／`52b65d16…`；pi-lane/src TS 未触 ⇒ 制品身份不变，`build:product-sidecar` 复跑判
reused-identical）。每次 `cargo` 前 `pgrep -f 'chrome-headless-[s]hell|[p]laywright'` 计 **0**。

### 4.1 born-red ↔ green（同一 6 枚，唯一变量＝production arm）

| 相 | production | 6 枚（表三 1-5 ＋ C） | 读数 |
|---|---|---|---|
| born-red | **未改**（write-only arm） | 全红 | `0 passed; 6 failed`（各 `Protocol(StateViolation)`／C 得 `Err(StateViolation)`） |
| green | 应用 peek/take 修复 | 全绿 | `6 passed; 0 failed` |

### 4.2 mutation（cp 备份还原＋前推 mtime，命中恰 1，还原后 SHA 逐字复原）

| 编号 | 变异 | 靶 | 实测红形 | 反向对照 |
|---|---|---|---|---|
| M-A1 | arm 由「四道全 arm」改「Write arm、Read\|Glob\|Grep no-op」（撤读臂 arm） | 表三 6 枚 | `0 passed; 6 failed`（复红 `StateViolation`） | — |
| M-B | `serve_host_request` 的 `active_tool_call.take()` 改 `.clone()`（write 由 take 变 peek） | `counterexample_one_tool_call_serves_at_most_one_operation` | 该枚红（`assert left==right` 失败：第二枚 write 不再无主 ⇒ 得 `Process(UnexpectedEof)` ≠ `StateViolation`）；**同轮两枚读臂用例仍绿** | 读臂 peek 与写臂 take 相互独立、各自承重（read/write 语义分野实证） |

两次变异均 cp 备份先行、`perl -i` 就地、`touch` 前推 mtime、还原一律 `cp` 回写并核 SHA 与 fixed
backup 逐字节相同（`git checkout 清未提交面` 判例回避）。无等价变异作废。

### 4.3 陈旧辅助门校准（base-red 已证）

`verified-node-gate.mjs:461` 硬编码首包 ready caps `["case_read"]`（PI-HOST-LOOP-1R3 `8e217e4`
遗留、早于 workspace caps 上线、不在例行门集故长期无察）。

| 相 | 门 `gate:verified-node-production` | 读数 |
|---|---|---|
| base-red | 未改门 | FAIL 1 项——"首包 ready 且 capabilities 恰 `["case_read"]`"，实收 `["case_read","workspace_read","workspace_write"]` |
| 校准后 | 改为现行三员握手 | **全部通过**（EXIT 0），bundle SHA `36615e5b…`／runtime SHA `2e3f1286…` 逐值核对 |

### 4.4 包级门

| # | 门 | 读数 |
|---|---|---|
| 1 | `cargo test --lib --offline`（`apps/desktop/src-tauri`） | **236 passed / 0 failed / 1 ignored**（与 HARNESS-1 基线同值：族内转换、无净增减） |
| 2 | `pnpm --filter @courtwork/pi-lane test`（vitest） | **531 passed / 17 files**（基线同值，gate 是脚本非 vitest 面、零影响） |
| 3 | `cargo clippy --offline --all-targets` | 本单归属 **0**（7 枚全在 `src/lib.rs`，pre-existing：5 unsafe＋2 return，非本单，未触） |
| 4 | `rustfmt --check` `pi_loop.rs` | 我新增段 **全 clean**；既有 **8** 处 drift（base@b94cbc5 亦恰 8，逐一 pre-existing，属 `PI-WORKSPACE-READ-1`）——**未触**，只做工单范围 |

**未跑仓级** `pnpm -r build`／`pnpm lint`／`pnpm test` 与 Playwright（票面：包级自由、不跑仓级门）。

---

## 五 · 偏离与登记

1. **arm 谓词写成穷举 `match tool_name`（无 `_`）而非 write-only 或按名 or-pattern＋`_`**：为对
   `closed_enum!` 未来加员 fail-closed（加员即编译失败逼裁定）。属复杂度节制内的**本质**结构——正
   是本缺口（`_ => {}` 静默漏读工具）的直接教训，非新抽象。
2. **原 blocker characterization 转正而非删除**（票面明令「convert，不删」）：更名
   `…_currently_stateviolations_blocker → …_succeeds_after_read_toolcall_fix`，断言由「坏态
   StateViolation」翻为 `Ok(Terminal::Completed)`＋写字节回读。原 HARNESS-1 回执作历史证据留档、
   未改。
3. **`headless_smoke_…` 的一处过时注释同步更正**（原称 /workspace 回读被缺口挡住）：改指向新转正
   测试；smoke 自身仍读 `/case`（行为未变）。
4. **辅助门校准触碰 `verified-node-gate.mjs`**：单枚 assert 字面量＋断言值，随本票顺修（票面明列），
   base 亦红。

### [需架构拍板]（结转，本单未碰）

- 上浮B（journal `logicalPath` 空串两侧异源）；②游标二元性随 WRITE-HOST 收敛；④ `cost_usd`
  Disabled 臂裸 inf。均非本票范围。

---

## 六 · 移交 `PI-BASE-HEADLESS-ACCEPT`（开工前必读）

1. **§三 headline 阻断项已解**：真 read 工具经 `serve_read_request` 的 peek 找到在场 tool call，
   `/workspace` agent 回读不再 `StateViolation`。**六格 3/4/5（3 read-back、4 先 read 既有
   workspace、5 resume 后回读）现可跑**；格 1/2（/case 直读）本就通。

2. **转正信号**：`headless_workspace_readback_succeeds_after_read_toolcall_fix` 绿即缺口已闭
   （原 blocker 断言已翻正，不必再找「转绿删测试」的旧钉子）。

3. **门次序不变**：clean worktree 须先 `build:product-sidecar` **与** `build:headless-sidecar`
   再 `cargo test --lib`（`headless_artifacts()` 缺件硬失败）。headless bundle 现值 `554,327 B`／
   `52b65d16…`；product bundle `546,906 B`／`36615e5b…`。

4. **真 key/model 仍缺，另行登记**：本票只解 harness 的读回读缺口，**不触网**；六格 cell 1-6 须真
   DeepSeek key 跑真模型推理（SPEC :744「无 key/model 证据只能记 external-validated blocked」）。
   HEADLESS-ACCEPT 的第二前置（真 key，产品负责人提供）不因本票而消解——faux 只辖 §七自动化 CI 门。
   不得以「harness 非瓶颈」放行。
