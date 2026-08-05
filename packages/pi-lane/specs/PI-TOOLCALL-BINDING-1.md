# PI-TOOLCALL-BINDING-1 · 实现回执（2026-08-05，tool↔capability 绑定回归修复）

票面：`docs/architecture/implementation-readiness.md`「2026-08-05 架构/功能层验收批」`PI-TOOLCALL-BINDING-1`
行（逐字为验收判据）；ADR-022 六-B.2「`contentSha256`/`proposalHash` 均为……Rust 必须重算」与
:285-290「模型工具到 host capability 的映射固定为 `write ↔ workspace_write`、
`read|glob|grep ↔ workspace_read`；映射、owner、阶段与宣告能力全部通过后才可烧 operation ordinal」；
`packages/pi-lane/SPEC.md` §九；总纲不变量 3（留人确认）、6（历史不可涂改）。
基线 `claude/pi-toolcall-binding-1@2c8fd7b`（≡ main@2c8fd7b）。

**单文件生产改动**：`apps/desktop/src-tauri/src/pi_loop.rs`。Node/TS、wire、journal 十九型闭集、
codec、`fold()` 推进臂、`uncertain` 压扁、`Cargo.toml`／cap-std 一字未动。

---

## 一 · 本单新增了什么概念、为何非加不可（复杂度节制留痕）

**新增恰一个概念：`active_tool_call` 这枚进程内瞬态从「一枚 id」变成「一枚 id ＋ 它的工具名」。**
不是新抽象、不是新状态机、不是新持久化格式、不是新依赖——是把**已经在手上的一个值不再丢掉**
（`ToolStarted` arm 当场就持有 `tool_name`，此前 `clone` 完 id 就把它扔了）。

为何非加不可：ADR-022 :285-290 冻结的 tool↔capability 映射，在 `PI-READ-TOOLCALL-1` 合入后
**只**活在 Node 侧 `packages/pi-lane/src/product-stdio.ts` 的 `TOOL_CAPABILITY` 表里
（:219-224 定义，:991 reserve 期校验，:1030 send 期复验）——即 ADR-022 六-B.2 明文规定 Rust
**不得**信任的那一方。Rust 这一侧对同一件事只剩「有没有主」：写臂 `take()` 认领任何主，读臂
`is_none()` 放行任何主。后果不是「少一道冗余门」，而是**唯一裁决者会把两件互斥的事同时记下**：
同一枚 `tc_X` 在 journal 上既是一次 `read`（`agent_event`），又提案并完成了一次写入
（`tool_proposed`／`authorization_decided`／`effect_started`／`effect_*`）。账本是本系统对
「谁授权了什么」的唯一凭据，它错一次，不变量 3 与 6 就同时失守。

与 ADR-022 的对照：`proposalHash` 已经是「本侧重算、不认自报」（:1348-1356），capability 已经是
「只认本次握手真谈成的那几枚」（:1313）。tool↔capability 是同一族里唯一一枚**没有本侧真源**的
判据；本单把它补齐到与那两枚同一形态——真源是本 leg 已 durable 的 `tool_started`，不是对端的话。

---

## 二 · 根因：这是本仓上一张票引入的回归（逐字在案）

`PI-READ-TOOLCALL-1`（`6ae50e7`）把 `pump` 的 `ToolStarted` arm 由 write-only 扩为四工具穷举，
**方向正确**（读 host op 此前恒 `StateViolation`，非修不可），但连同旧注释一起删去的那两行是一条
**结构性判据**：

```
-                    // 活动 write tool call 的唯一真源（PI-WRITE-HOST-1 ③）：`host_request` 的
-                    // wire 上没有 `toolCallId`，四段账逐枚要它。只认 `write`——别的工具不经
-                    // 宿主 effect，替它们记一枚只会让 `host_request` 找到不该找的主。
-                            tool_name: ProductToolName::Write,
```

旧形态下「主必是 write」由 `match` 的**模式**结构性成立（不 arm 就没有主可认）；扩 arm 之后四道
工具都成为主，而下游取／peek 两处**一字未改**，于是那条判据没有等价替身。旧注释里「让
`host_request` 找到不该找的主」这句话，恰好是本单反例的字面描述。

作用域缺口同源：`active_tool_call` 只随配对的 `ToolFinished` 收束；`prompt` 起点（:1120 一带）
与 prompt 终态（:1737 一带）都只收束 `active_request`。cancel 与可重试失败下 `tool_started` 没有
配对事件，旧 prompt 的 tc 因此活到下一枚 prompt，被首个 `host_request` 就地认主。

**本回执不改旧回执，不改 `PI-READ-TOOLCALL-1.md`**：那一票的读臂修复本身成立且必要，本单只补它
未补的那一半判据。

---

## 三 · 改法（四道判据，逐条有由）

| # | 落点 | 判据 | 形态 |
|---|---|---|---|
| J0 | `PiLoopHost::active_tool_call`（交付树 :577） | 字段由 `Option<String>` 改 `Option<(String, ProductToolName)>`；arm 处 `Some((tool_call_id.clone(), *tool_name))` | 使能项（名字来自同一枚已 durable 的 `tool_started`） |
| J1 | `serve_host_request` 0.3 | 写 op 的主**必须**是 `ProductToolName::Write`；read/glob/grep 主 ⇒ `state_violation`，零落账零 effect 零出包 | 穷举 `match`，无 `_`：`closed_enum!` 加员即编译失败逼裁定 |
| J2 | `serve_read_request` | 读 op 的主**必须**是 `Read`／`Glob`／`Grep` 三者之一；`write` 主 ⇒ `state_violation` | 同上，穷举无 `_` |
| J3 | `prompt`（`active_request` 认领处） | 起点收束：新 prompt 一律从**无主**开始 | fail-closed 担保，不问上一枚 prompt 怎么结束 |
| J4 | `record_prompt_terminal`（`active_request = None` 处） | 终态收束：tool call 的作用域至多一枚 prompt | 正常出口 |

J1/J2 都写成对 `ProductToolName` 的**穷举** `match`（承 `PI-READ-TOOLCALL-1` 在 arm 处立下的体例）：
将来加一道工具，两处不更新即编译失败，逼出「新工具算写还是算读」的显式裁定——不让它像本次一样
静默继承上一位实现者的分类。

取／peek 的分野**未变**：write 仍 `take`（一 tc 一 op），read 三件仍 peek（一次 `glob` 逐层
`list`，同一 tc 多枚读 op）。本单只在两处各加一道「主是不是该工具」，不动一 tc 一 op 与 peek 语义。

---

## 四 · 门与证据（2026-08-05 实现 worktree 实测）

每次 `cargo` 之前 `pgrep -f "chrome-headless-[s]hell|playwrigh[t]"` 均为**空**（退出码 1），逐次实跑实测。

### 4.1 born-red（**未改生产**，逐格独立驱动）

born-red 相的判定跑在 `2c8fd7b` 原样生产码上，测试文件 SHA
`e41d98e0f91b071fd83609f5d9b71ac04e990c62505cf0d8b11562e10f1536d4`。表内四格住同一张
case 表，逐格红须逐次驱动（表驱动测试首格红即中止），故用 `perl -0777 -i` 精确删除前置格
（每次 `HITS=1`）后重跑，跑完 `cp` 还原并核 SHA 逐字复原。

| # | 反例 | 未改生产的实测 | 决定性 |
|---|---|---|---|
| B1 | 「写 op 落在 read tc 名下」 | `Process(UnexpectedEof)` ≠ `Protocol(StateViolation)` | 写被**服务到底**（probe→提案→授权→落盘→`host_result`），脚本随即耗尽才 EOF |
| B2 | 「写 op 落在 glob tc 名下」 | 同上 | 同上 |
| B3 | 「写 op 落在 grep tc 名下」 | 同上 | 同上 |
| B4 | 「读 op 落在 write tc 名下」 | 同上 | 读 op 被 peek 放行、走到真读件座 |
| B5 | `…never_survives_its_prompt` 相一（终态收束） | panic：`prompt terminal 必须收束活动 tool call` | prompt1 中止后 `active_tool_call` 仍非空 |
| B6 | 同测相二（起点收束） | 撤去相一断言后：`Process(UnexpectedEof)` ≠ `StateViolation` | 陈旧 tc 被新 prompt 的首枚写请求认作主并落账 |

修后：`counterexample_host_request_gates_refuse_before_any_effect`（9 格）与
`counterexample_a_tool_call_never_survives_its_prompt` **全绿**。

### 4.2 反例的闭集完备性（闭口按族）

`ProductToolName` 闭集恰四道，capability 闭集里 host op 恰两类。**两向错配的组合就是四格**，
本单全列，无未点名的同族成员：

| 主（`tool_started`） | 发 `workspace_write` | 发 `workspace_read` |
|---|---|---|
| `write` | 合法（既有正向用例） | **B4：拒** |
| `read` | **B1：拒** | 合法（既有正向用例） |
| `glob` | **B2：拒** | 合法（既有正向用例） |
| `grep` | **B3：拒** | 合法（既有正向用例） |
| 无主 | 拒（既有格「无活动 tool call」） | 拒（既有格「读的无活动 tool call」） |

九格共用同一组断言：`state_violation` ＋ `probes == 0` ＋ `host_result` 恰 0 枚 ＋ effect 六型
一枚不落账 ＋ 失败显式落 `session_failed`。

### 4.3 mutation（全部跑在**交付树** `9b727e4d3089db4fcd748fbc336538da59ebba21095b401b09d68cb9c82b5bac` 上）

体例：`cp` 备份先行 → `perl -0777 -i` 就地（每枚打印命中数，均 `HITS=1`）→ `touch` 前推 mtime →
跑 `cargo test --lib` 全量 → `cp` 还原 → 核 SHA 逐字复原。**零残留**（还原后 SHA 与交付树逐字相同，
`git status` 只余 `pi_loop.rs` 一枚已改文件）。判例「中间树的 mutation SHA 等于没有 SHA」：
本表五枚在 clippy 收口**之后**重跑一遍，绑的就是交付 SHA。

| 编号 | 撤掉哪一道判据 | 变异形 | 实测 |
|---|---|---|---|
| M1 | **J1**（写臂主必是 write） | `Some((tool_call_id, ProductToolName::Write))` ＋读三件拒绝分支 → `Some((tool_call_id, _))` | 1 failed：「写 op 落在 read tc 名下：实得 `Process(UnexpectedEof)`」 |
| M2 | **J2**（读臂主必是读三件） | 读臂 `match` → `Some(_) => {}` | 1 failed：「读 op 落在 write tc 名下：实得 `Process(UnexpectedEof)`」 |
| M3 | **J3**（起点收束） | 删 `prompt` 里那一行 `self.active_tool_call = None;`（文件内该字面量由 3 处减为 2 处，命中校验过） | 1 failed：`…never_survives_its_prompt` 相二 `left: Process(UnexpectedEof) / right: Protocol(StateViolation)` |
| M4 | **J4**（终态收束） | 删 `record_prompt_terminal` 里那一行（同上，3 → 2） | 1 failed：`…never_survives_its_prompt` 相一「prompt terminal 必须收束活动 tool call」 |
| M5 | **J0**（arm 真的记下**那一枚**名字） | `Some((tool_call_id.clone(), *tool_name))` → `…, ProductToolName::Write))` | **7 failed**：四道读臂集成用例 ＋ 读 hash 重算反例 ＋ headless 真跑回读 ＋ 本单 case 表 |

M5 是「载荷在缝上被丢」那一族的靶：字段带上了名字、arm 也拿到了名字，但若在缝上换成常量，
读臂全线失守。它同时证明 J0 不是装饰——名字必须是**这一枚 tool call 的**名字。

四道判据（J1/J2/J3/J4）**逐枚独立可证否**，无一枚靠别处顺带触红；无等价变异，无作废变异。

### 4.4 包级门

| # | 门 | 读数 |
|---|---|---|
| 1 | `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`（交付树） | **237 passed / 0 failed / 1 ignored**；基线 `2c8fd7b` 实测 **236 / 0 / 1** ⇒ 净增恰 1（本单唯一新增测试函数），既有 236 枚零回归 |
| 2 | `cargo clippy --all-targets --offline` | **7 warnings，全部 pre-existing 且全住 `src/lib.rs`**（5 unsafe ＋ 2 return），本单归属 **0** |
| 3 | `rustfmt --edition 2021 --check pi_loop.rs` | 8 处 drift；与 base `2c8fd7b` 同文件的 drift **逐字节相同**（去掉行号后 `diff` 为空），我新增段 **全 clean**——未触既有 drift |

**未跑仓级** `pnpm -r build`／`pnpm lint`／`pnpm test` 与 Playwright，理由如实：本单 TS 零触碰
（`git status` 只 `pi_loop.rs` 一枚），且现时仓内并行 worktree 非空——判例「`.claude/worktrees/` 非空时
根 lint 可能全仓 Parsing error，环境红禁入验收结论」。承 `PI-READ-TOOLCALL-1` 同款登记（包级自由）。

### 4.5 环境前置

本 worktree 起手缺 `packages/pi-lane/dist/`（`.gitignore:4` 忽略面）。按票面从主仓 `cp -R` 整份复制
（537 MiB，含 `product-sidecar` 冻结 Node 218 MiB 与 `headless-sidecar` bundle），**未重跑构建**
——本单 TS 零触碰，制品身份因此不变；`headless_artifacts()` 缺件硬失败的那两道断言由此满足，
`headless_workspace_readback_succeeds_after_read_toolcall_fix` 真跑照常绿。复制物为 gitignore 面，不入提交。

---

## 五 · 偏离与登记

1. **既有 case 表的元组第四位由 `bool` 升为 `Option<ProductToolName>`**（5 行既有格随之改写）。
   语义等价（`true → Some(Write)`、`false → None`），非改判据；不这么改就没法在同一张表里喂四道
   工具名，而另起一张表会让九格分处两处、下一位加格的人只看见半张闭集。
2. **「读能力未谈成」一格的主由 `write` 换成 `read`**。该格要证的是 0.1 capability 门仍在；旧写法
   下 `write` 主发读 op，本单之后会先被 J2 顶掉——**顶名之后这一格就不再证 0.1 还在**（承
   `PI-READ-TOOLCALL-1` §三「转它反而毁掉负例」的同一族判断，方向相反）。换主后该格仍在
   capability 门收束（0.1 先于 J2）。
3. **`type GateCase = (…)` 局部别名**：元组升到五位后 clippy 报 `type_complexity`（本单一度净增
   1 枚 warning）。按 clippy 自身建议以别名收口，随即复跑 clippy 回到基线 7 枚全 pre-existing。
   如实登记：这是本单**自己引入又自己收掉**的一枚 warning，不是既有面。
4. **测试助手 `read_tool_started_line` 现也被 `Write` 调用**，名字里的 `read_` 已不是取值范围。
   未改名（改名要动 8 处调用点，属工单外 churn），改为在其文档注释显式登记「四道工具名通用的
   参数化形，`read_` 是 `READ-TOOLCALL-1` 的出身」。这是**知情接受**的命名残留，下一位改这一族时
   可顺手改名。
5. **新增两枚测试助手**：`write_request_packet_for`（requestId 参数化——`proposalHash` 绑 requestId，
   跨 prompt 脚本必须重算）与 `canceled_line`（中止终态，唯一区别是不要求先来 `tool_finished`）。
   两枚都只是既有助手的参数化/同构版，无新概念。
6. **`counterexample_a_tool_call_never_survives_its_prompt` 相二直接写字段注入陈旧 tc**
   （`host.active_tool_call = Some((TOOL_CALL.to_string(), ProductToolName::Write))`）。理由与
   限度如实写清：
   - `prompt` 的**正常**出口全部经 J4（`pump` 每条非错误出口都走 `record_prompt_terminal`），
     `fail_protocol`／`fail_process` 那些出口一律 `closed = true`、下一枚 prompt 直接
     `SessionClosed`。这两族之外，`pump` 还有**不关闭 session** 的错误出口：`journal.append` 的
     `?`（交付树 :1183／:1197，以及 `record_prompt_terminal` 与 `append_effect_record` 内）与
     `write_encoded` 的 `ProcessFault`（交付树 :943-950 只 `map_err`，不走 fail_*）。读臂是 peek 不 take，故一枚
     `host_result` 发包失败即可留下**仍在场的** tc 而 session 未关——J3 守的正是这一族。
   - 但现行 scripted leg 的 `write_packet` 恒 `Ok`（交付树 :2091-2098），journal 也无故障注入点，两条
     路今日**都不可脚本驱动**；给 harness 加写失败注入属工单外改造。故相二以直接注入那一枚
     受验输入代替，这是本票边界内能让 J3 单独承重的最小手段——不注入就只能登记一枚等价变异、
     留一道零区分力的门。
   - 注入的是 **write** tc 而非 read tc：名分门（J1）对它毫无区分力，咬得住它的只有作用域。
   - born-red 相该行按旧字段型写作 `Some(TOOL_CALL.to_string())`，其余逐字相同——**类型适配，
     不改判据语义**。
7. **不宣称 J3 今日挡下过真实流量**。按上条它可达但不可脚本驱动；`PI-HOST-CONCURRENCY-1` 若按其
   票面把 pump 改成「host 专属线程＋入站命令 channel，每轮 poll」，prompt 的出口形态还会再增，
   届时 J3 的承重面更宽。票面明令「prompt 起点与终态各显式清空」，本单照办并按此如实登记。

### [需架构拍板]（结转，本单未碰）

- ②游标二元性随 `PI-WRITE-HOST-1` 收敛；④ `cost_usd` Disabled 臂裸 inf（`PI-HOST-JOURNAL-1` 移交）。
- 上浮B（journal `logicalPath` 空串两侧异源）。
- 本单**新增一枚观察，不自行处置**：Node 侧 `TOOL_CAPABILITY`（`product-stdio.ts:219-224`）与
  Rust 侧 J1/J2 现为**两份同源真值**（都源自 ADR-022 :285-290 的冻结映射）。按 1R5 判例
  「同步消灭优于同步验证」，理想形态是让两侧共用一处真源；但 wire 上今日没有 `toolCallId`
  （host op 靠 `active_tool_call` 找主，正是本文件多次登记的事实），要合并真源须先动 wire——
  **超出本票边界（票面明令不改 wire）**。此处只登记，不擅改：两侧各自 fail-closed、各自穷举、
  加员各自编译失败，是本票边界内可得的最强形态。

---

## 六 · 与 `PI-READ-TOOLCALL-1` 的关系（如实说明）

1. **那一票的修复不被推翻，其读臂 arm 与 peek 语义原样保留。** 真 read 工具读 `/workspace`
   仍走通（`headless_workspace_readback_succeeds_after_read_toolcall_fix` 在本单交付树上绿），
   一 tc 多读 op 仍成立（`read_arm_serves_many_operations_under_one_tool_call` 绿）。
2. **本单修的是那一票在扩 arm 时未补的另一半判据。** 旧形态里「主必是 write」由 `match` 模式
   结构性承担，扩 arm 后该结构消失而无等价替身——这是**回归**，不是那一票方向有误。
3. **判例增量（供后续票与验收引用）**：*放宽一处匹配面时，须清点原匹配面**顺带**承担了哪些判据。*
   `tool_name: ProductToolName::Write` 这个模式同时在做两件事——「认哪些事件」与「认哪种主」；
   把它扩成四道 variant 只保留了第一件。与既有判例「闭口按族」互补：那一条问「同一判据还辖哪些
   成员」，这一条问「同一处结构还兼着哪些判据」。
4. **那一票的覆盖洞诊断在本单再次被证实为真**：`PI-WORKSPACE-READ-1` 的读臂用例曾一律以 `Write`
   顶名 arm；本单的 M5 变异（arm 恒记 `Write`）让 7 枚测试同时红，正说明「真名驱动」这一改造
   今天是承重的，不是形式主义。

---

## 七 · 移交

- **`PI-UNKNOWN-TOOL-1`**（同批③，Node 侧）：本单只动 Rust，`product-stdio.ts` 与 `product-runtime.ts`
  一字未触，两票无文件冲突，可并行。但请注意本单已把 Rust 侧对「闭集外工具名」的态度定为
  **编译期不可达**（`ProductToolName` 是 `closed_enum!`，wire 解码即拒）——③ 的拆分只在 Node 投影
  入口做，不要反向要求 Rust 放宽。
- **`PI-HOST-CONCURRENCY-1`**（同批④，须先 ADR）：见 §五-6/7，prompt 出口形态一旦改变，J3 的
  承重面变宽，`counterexample_a_tool_call_never_survives_its_prompt` 相二应改由真实竞态驱动，
  届时 §五-6 的直接注入可退役。若谁先给 scripted leg 补上写失败注入（`write_packet` 恒 `Ok` 是
  今日唯一障碍），相二也可当场转为纯脚本驱动。
- **验收提示**：J1/J2 撤除后的红形都是 `Process(UnexpectedEof)`（写/读被服务到底、脚本耗尽），
  不是 `StateViolation` 的近似形——若复验只见「红了」而不见这一具体错型，说明变异没落在判据上。
