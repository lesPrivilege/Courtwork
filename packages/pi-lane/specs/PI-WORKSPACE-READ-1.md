# `PI-WORKSPACE-READ-1` 回执

侦察落痕另见 [`PI-WORKSPACE-READ-1-RECON.md`](PI-WORKSPACE-READ-1-RECON.md)（含定序阻断的登记与解除前的现读事实）。

## 一 · 结论速览

`/workspace` 面**读得通了**：write → 批准 → Rust 真落盘 → 同 leg 逐字节回读 → 跨 leg（
`session_interrupted → session_resumed`）仍逐字节回读；glob/grep 双根各按自己的逻辑绝对路径
出面；`openWorkspaceMarkdown` 只读查询面就位。

**wire 零 schema 变更**——读面闭集（`workspace_read`／`exists|read_file|list`／`ListEntry`／
`TOOL_CAPABILITY` 三件映射／read 出包分支／同一 tc 多 operation 子循环）当初已双端铺齐，本票
是接线不是扩契约。**journal 十九型 payload 闭集零变化**：读不落账。

## 二 · 本单新增了什么概念、为何非加不可

四枚，逐条给出「不加会怎样」：

| 新增 | 不加会怎样 |
|---|---|
| `workspace-read-env.ts`（host-mediated 只读容器） | pi 的工具一律经 `ExecutionEnv` 触碰文件系统。`/workspace` 的物理根只在 Rust 侧，没有这一层就没有地方把「一次读」翻成「一枚 host request」，Node 侧也就必须自己碰 fs——本包「生产码零 fs 写」的静态锁会连同读面一起松掉 |
| `dual-root-env.ts`（双根路由容器） | 三件工具只拿到**一枚** env。分派不落 env 层，就要在 `read`／`glob`／`grep` 里各写一遍前缀判定——三处可漂移的真源，且 `read` 是上游原件，本就没有可插判定的地方 |
| Rust `WorkspaceReadHost` trait | 读没有 probe/decide/perform 三段。并进 `WorkspaceWriteHost` 会逼出「读的 `decide` 恒 `Approved`」这种恒真桩，那正是 ADR-022 六-C 明禁的「用恒批准冒充授权」的形状 |
| `WorkspaceViewError`（viewer 八枚闭集） | 与模型面 `HostFailureCode` 受众不同（WebView vs 模型）。合成一枚会让两侧共用一份措辞，将来任一侧调文案都会误伤另一侧 |

**未新增**：模型工具（`list` 不成为工具）、第二套路径 grammar、第二份 journal、任何编排抽象、
任何新依赖。

## 三 · 实装逐处

### 3.1 Node

- **`workspace-read-env.ts`**：grammar（与写面共用 segment 闭集，差别恰两条——读面不要求
  `.md`，读面认 `list` 的根 `"."`）；proposalHash（域串 `courtwork.pi.workspace_read.v1`，
  六枚 frame 含 `operation`——省掉它则同路径的 `exists` 与 `read_file` 同 hash，改操作不可判）；
  **回读双验**（正文重编码后重算 hash 与 byteLength，并复核 `logicalPath`／`operation` 就是本次
  请求的那一枚，四项任一不符即读失败）；**门先于铸号**（grammar 不过则 op 零分配、port 零调用）；
  公开 tc **在每次真要发请求时**才查表（查表若排在容器构造期，一次纯 `/case` 的读也会被迫要求
  一枚已登记的 tc——那是把读面的前置条件安在了另一个根上）。
- **`dual-root-env.ts`**：只分派、不改写返回值。`/casex` 这类同前缀兄弟不命中 `/case`
  （只认「恰等于根」或「根 + `/`」）。临时件与 shell 没有路径可分派，恒交默认根。
- **`tools.ts` 双根**：投影从「相对 `env.cwd`」改成「相对**各自根**」，`../workspace` 因此
  **结构性产不出**——跨根相对路径从来不被构造，而不是构造后再改写掉。同批收口 `/case/` 尾斜杠
  （空相对路径出根名本身）。扫描/命中额度仍是**全次调用**口径：第二根接第一根余额走
  （`PI-TOOLS-HONESTY-1` 移交 4）；额度用尽即 `break`，不让第二根凭空多拿一份。
- **`product-runtime.ts`**：`PRODUCT_CAPABILITIES` 加 `workspace_read`；`readRegistry`／`readPort`
  与写面逐条同构；`pendingHostOperation` 改判别式（写的待办收不到读的回执，反之亦然）；
  读**不碰** `settledWriteOutcome`（并进 write 那条通道会让一次 glob 顶掉一次 write 的账）；
  每次 read/glob/grep 调用一只 invocation-scoped 双根容器。

### 3.2 Rust

- **读臂 `serve_read_request`**，与写臂三处结构性不同：① `active_tool_call` 只 peek 不 take
  （一次 glob 要逐层 list）；② 零 journal 记录（四段账描述的是 effect 生命周期）；③ 零授权
  （没有 effect 就没有可授权的对象）。`proposalHash` 本侧重算，不认对端自报。
- **真读件**复用写面同两枚函数（STAGE4 移交 5）：capability 根与 `dev`/`ino` 回证、
  `session_root` 三段、`descend` 逐段 no-follow。读面自己只多两件：末段以
  `FollowSymlinks::No` 打开；**UTF-8 fail-closed**（`from_utf8_lossy` 会静默改写正文，
  并连带把回读双验废掉——hash 对的是被改写后的字节）。**读是纯读**：一次没写过的 session
  跑三枚读操作，workspace 根一个字节都不许因读而出现。
- **`openWorkspaceMarkdown`**（`lib.rs` 命令 + `pi_loop_workspace` 核心）：**双验**——session
  token 闭集门先于任何 I/O；path 走同一 grammar 外加 `.md` 强制；UTF-8 与 131,072 上限由读件
  兑现；hash 从**当前**正文重算，故可异于已落账 hash（那正是 UI 要提示「当前内容已不同于已确认
  版本」的依据，比对属 `PI-LANE-UI-1`，本层只给事实）。入参 `deny_unknown_fields`，出参无物理
  路径字段，正文不入 journal。
- **握手闭集**加 `workspace_read`；`LEGAL_CAPABILITY_SETS` 循裁定A先例**只扩员**（三员并存，
  旧档续 valid）；`revoke_workspace_write` 旁补 `revoke_workspace_read`，0.1 门对读的可证否
  形态同批保住。
- **fail-closed 扫描器**：`OpenOptions` 从禁用清单移入 `READ-NOFOLLOW` 具名理由行 + 恰三处
  计数门。取「保留最强原语并登记」而非「换弱原语过门」——`Dir::open` 只保证不逃出 root，
  不保证 root 内不跟随，换它反而更弱。

### 3.3 握手 seed 的逐枚处置（禁区「不 sed」）

37 枚字面 seed **先按所在 `fn` 归类、确认全部是正向握手种子**（无一是故意的 drift fixture——
两枚 `counterexample_*_drift_*` 的 capability 是**基线**，漂移注入在 `config` 上）**再改**：

`fresh_start_records_session_started…`×2、`session_started_records_the_prompt_and_capabilities_actually_in_force`、
`prompt_journals_every_outward_event…`、`counterexample_append_failure…`、`counterexample_out_of_order_turn…`、
`budget_terminal_writes_both…`、`retryable_provider_error…`、`second_prompt_and_new_leg…`×2、
`counterexample_resume_refuses_every_drift_class…`×2、`counterexample_journal_route_identity_drift…`×2、
`shutdown_writes_session_completed…`×2、`lifecycle_timeout_and_protocol_error…`、`replay_projects_the_context_break…`、
`leg_arms_with_terminal_budget`、`real_child_killed_mid_prompt…`、`a_packet_after_the_shutdown_terminal…`、
`ready_leg`、`counterexample_prompt_gate_runs_before…`、`counterexample_terminal_budget_comes_from_the_rust_fold…`×2、
`counterexample_wire_fault_folds_and_reclaims…`×2、`counterexample_shutdown_exit_status…`、
`counterexample_resume_checks_every_prior_value…`、`prompt_axis_probe`、`universal_prompt_case`、
`universal_invariant_refused_host_input…`、`the_bytes_validated_before_the_effect…`、`write_leg`、
`counterexample_host_request_gates_refuse_before_any_effect`、`counterexample_one_tool_call_serves_at_most_one_operation`、
`real_write_leg_with`。

## 四 · 证据表

### 4.1 变异（逐枚 apply → 跑 → restore，命中数校验恰为 1；还原后前推 mtime 复跑）

| 编号 | 变异 | 结果 |
|---|---|---|
| M1 | 撤 `rootProjection` 的空相对路径特例（回到 `${root}/${relative}`） | 定点红 2 枚：根自身被拒读时出 `/case/`、`/workspace/`（尾斜杠回潮） |
| M2 | glob 的相对基准换回 `context.env.cwd` | 红 3 枚，实测产出 `/workspace/../workspace/简报.md`——票面点名要禁的形态原样复现 |
| M3 | 读臂 `active_tool_call` 由 peek 改 take | 定点红「同 tc 多 op」一枚 |
| M4 | 读 proposalHash 域串换成写域串 | 红 3 枚正向读用例（hash 反例仍绿——它本就要求不符，正是定向性的体现） |

### 4.2 先红后绿

- `workspace-read-env.test.ts` 首建时整文件红（模块不存在），实装后 19→21 枚全绿。
- 双根七枚（`tools.test.ts`）的红证由 M1/M2 承担，**如实登记不冒充 born-red**：实装与用例同批
  写入，故那七枚从未在旧实装上跑过（承 `PI-TOOLS-HONESTY-1` D7 的登记体例）。
- Rust 侧 10 枚新用例中，`real_read_arm_returns_the_bytes_the_write_arm_landed` 与
  `read_arm_serves_many_operations_under_one_tool_call` 首跑**真红**（`NotFound`）——自伤见六节。

### 4.3 门

| 门 | 结果 |
|---|---|
| `tsc -p packages/pi-lane` | 绿 |
| `eslint packages/pi-lane` | 绿 |
| `vitest run packages/pi-lane` | **531 / 531（17 文件）** |
| `cargo test`（`build:product-sidecar` 先行，`pgrep chrome-headless-[s]hell` 计零） | **232 过 / 0 failed / 1 ignored** |
| `cargo clippy --all-targets` | 本票零新增警告（余 7 枚属 `lib.rs` 既有 unsafe/return） |

仓级门未跑（按票面「不跑仓级门，完工链由协调放」）。

## 五 · 偏离登记

| # | 偏离 | 理由与处置 |
|---|---|---|
| D1 | `ReadOnlyToolsOptions.logicalRoot`（单值）改为 `logicalRoots`（数组），7 处调用点同批改写形 | 两个字段就是两份真值。改的只是**调用形**，`PI-TOOLS-HONESTY-1` 的断言一字未动，其 47 枚用例改形后逐枚仍绿 |
| D2 | 改了 `PI-TOOLS-HONESTY-1` 之外、`PI-WRITE-HOST-1` 期写下的四枚契约面测试 | 它们编码的是**本票要改的那条契约**：`/workspace` 曾是拒绝面。逐枚如实换成新契约的判据——「宿主 `not_found` 如实成为失败」＋「存在即读得到」对照、「读面零 operation」按根拆两枚（`/case` 仍恒零）、ready 三枚能力、golden 双根那一枚把 glob 起点显式限回 `/case`（该枚 transport 是空实现，不给起点会连 `/workspace` 一起检索而无人应答） |
| D3 | 两枚 tracked golden fixture（wire/journal）的 `capabilities` 重烤 | 跨端常量，与 Rust `EXPECTED_CAPABILITIES`／`LEGAL_CAPABILITY_SETS` 同批。只改这一个字段 |
| D4 | sealed CJS 身份**第五、第六录**：`536,123`/`060cc00a…` → `546,665`/`58106760…` → **`546,906`/`36615e5b…`** | Node 产品源一改必移（D1 家族先例）。第六录是五节「读容器 fail-closed」那一改带来的。同批改 `route-manifest.json` 二值与 `pi_loop_process.rs` 冻结表二值、负注入二靶、变迁注释；旧值零活体残留 |
| D5 | `ScriptedHost` 由同步改为「同步或 Promise」 | 读面回执要真 SHA-256，而 `crypto.subtle` 是异步的。喂假 hash 等于把回读双验那道门自己拆了 |
| D6 | 扫描器 `FORBIDDEN_CONSTRUCTS` 移出 `OpenOptions`，改由 `READ-NOFOLLOW` 具名理由行 + 恰三处计数门约束 | 见 3.2 末条。禁用清单少一员但新增一条同形的具名门，净判据不减 |
| D7 | 新增 `packages/pi-lane/specs/PI-WORKSPACE-READ-1-RECON.md` | 票面无专属 RECON，自侦察落痕循 `PI-WRITE-HOST-1-RECON` 先例独立成件；其零节记录了定序阻断（已由协调裁定 (a) 解除） |
| D8 | SPEC §一 补两枚模块行、§十 订数 500/16 → 531/17、§五-8 补处置段、当期不变量补「prompt 第④条缺口已闭合」 | 该行体例自陈「每票据实更新」；缺口闭合登记在**现行** SPEC，`PI-WRITE-HOST-1` ⑤/⑦ 两处历史回执**不改**（改历史回执才是造假，承 D10 先例） |

## 六 · 自伤留痕

- **读回测试首跑 `NotFound`，根因不在读臂**：写请求误用了 `write_request_packet`（它把
  `contentSha256` 固定成 `PROBE_SHA`），真件的内容 hash 重算门当场拒，**写从来没落盘**。
  换成 `real_write_request_packet` 即通。教训：拿「脚本用的请求」去证「真件的行为」，
  红的是前提不是被测面——先确认前置真的成立，再读断言。
- **跨腿回读首跑 `ResumeRefused("requestId 在本 logical session 内已用过")`**：第二腿沿用了
  `req-1`。三枚固定 `"req-1"` 的行构造器因此参数化。教训同上：跨腿的脚本不能照抄同腿的。
- **`viewer_double_gate` 里一格标签失实**：`("目标是目录", …, "子目录", IsDirectory)` 实际先被
  `.md` 门拦下。已按**实际拒因**改名为「目录名不是 Markdown」并加注「顺序即语义」——
  标签写成期望的理由而不是真实的理由，就是一枚会骗过下一个人的绿。

## 七 · 移交与 [需架构拍板]

### 7.1 本票处置的移交件（逐件不悬置）

| 移交件 | 处置 |
|---|---|
| `/case/` 尾斜杠形态 | **已收口**：`rootProjection` 的空相对路径出根名本身；M1 是它的红证 |
| 容器层三边界（grammar 排除／单条目 `lstat`／U+FFFD 替换） | **维持显式登记**（协调给的「二选一」之乙路）：收口要改 `ExecutionEnv` 契约本身（多一条 per-entry 失败通道），属 ADR 级跨层变更，实现会话不自裁。但本票**没让这一族多一个成员**——新增的读容器在同一位置取 fail-closed 而非 `continue`（宿主已按同一 segment 闭集筛过，故 Node 侧再见不合规名字只可能是两端 grammar 分叉）；(c) 的 U+FFFD 在读容器里结构性不成立（Rust 侧 UTF-8 fail-closed ＋ Node 侧重编码双验）。SPEC 五-8 已落这段处置 |
| `PI-TOOLS-HONESTY-1` 九分支族表 | 已对表：本票动了 `walkFiles`／两件工具的**遍历与投影**，未动任何一条丢弃/限幅分支的判据、位置或口径；六类来源与九条分支的对应关系不变 |

### 7.2 [需架构拍板]

- **A（本票自我更正，非新缺口）**：RECON 曾把「读面 `proposalHash` 语义未定义」上浮为待裁。
  **该判断有误**——ADR-022 六-B.2 的 frame 定义**已经**逐字列了 read 行（域串
  `courtwork.pi.workspace_read.v1` ＋ sessionId/requestId/operationId/operation/logicalPath）。
  协调 2026-08-05 的裁定与 ADR 原文逐字一致，实装照 ADR 落地。如实登记这次漏读：RECON 只读到
  六-B.2 的 request/result 段就下了「未定义」的结论，而定义在同节靠后的 hash 段。
- **B（原样承接，不自裁）**：journal 侧 `logicalPath` 用 `read_string`（允许空串），wire 侧
  `read_logical_path` 用 `read_non_empty_string`——非空判据两侧不同源。本票读面 wire 的根写作
  `"."`（非空），故这条在读面不产生新触发面。
- **D（原样承接，不顺手修）**：resume prompt/capability 漂移门缺席。本票扩了握手闭集，
  该门的缺席因此**多覆盖一枚值**；门本身挂 UI/HEADLESS 开工门。

## 八 · 成立范围与不宣称

**成立**：`/workspace` 读面在 **package／host 级**成立——双端零 schema 变更、Rust 真读件与
三段 no-follow、读臂零账零授权、双根投影无 `../`、viewer 双验与物理路径零泄漏、跨腿回读。

**不宣称**：headless 总验（`PI-BASE-HEADLESS-ACCEPT`）、真 key 端到端、GUI 消费面
（`PI-LANE-UI-1`）、`current.md` 的成熟度升档。本票不更新 `docs/status/current.md` 与就绪图
（架构面）；未 merge、未 push、未开下游票。
