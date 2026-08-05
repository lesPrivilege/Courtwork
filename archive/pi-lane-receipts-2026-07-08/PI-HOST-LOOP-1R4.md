# PI-HOST-LOOP-1R4 · 扫描轴对齐族谓词与回执真源在树

状态：**待 Fable 实现（第四轮返修）**

角色与纪律同原票与 1R/1R2/1R3：Fable 实现、Sonnet 只读跑腿、完成后交全新 Codex 会话独立
验收。四件的全部合同、白名单、九门、既有闭口与禁止面**原样有效**；本件只新增闭口，不回退
任何既有门。

拒绝证据：`PI-HOST-LOOP-1R3@51369e4`（实现 tip `51c823f`）经独立复验 `a0644cd`
**REJECT**（报告见其 `packages/pi-lane/ACCEPTANCE.md`「PI-HOST-LOOP-1R3 独立复验
（2026-08-02，拒绝）」节）。D2 三类同步漂移已闭合通过；D3 前向债与八项偏离获追认；
决定性 blocker 恰一枚，落在 **D1 覆盖自证装置自身的盲区**。

## 零、盲区成因（架构自陈）

1R3 的 D1 是双道自证：手写清单＋源码扫描双向锁。但扫描轴选的是**语法标记**（`MAX_*`
常量消费），而族定义是**受验输入**。SafeToken 是函数型判据、无 `MAX_REQUEST_ID_*` 可扫，
于是 prompt header 的 `requestId`（ADR-022 六-B.1 SafeToken 七成员之一）同时躲过两道：
清单手写漏行、扫描轴上不可见。复验实测：production 门本身正确（`pi_loop.rs:678`
`is_safe_token(request_id)` 在 `user_prompted`/send 前以 `invalid_ref` 拒），但撤掉该门后
清单、MAX ledger、既有 prompt 常驻**全部假绿**——「今天恰有一道门」不等于「族被自证覆盖」。

**判据订正：扫描谓词必须从族定义出发，与族同宽；语法标记只是实现便利，不得反过来定义族。**

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r4`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa→
b4175ea→1ab9c03→23f8339→51c823f→51369e4→a0644cd` 十五枚；逐枚 patch-id 与源提交相同，
冲突即停回架构。四枚拒绝报告随链入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、两项闭口

### E1 · SafeToken 族全员入册，扫描轴对齐族谓词（Rust）

1. **`requestId` 入清单**：`bounded_input_manifest()` 增行——输入 `prompt.requestId`、
   判据 `is_safe_token`、拒绝 code `invalid_ref`（既有 code，不新增）；双轴常驻反例
   （超长与非法字符两形态）断言具名 `invalid_ref` ＋ 零副作用（journal bytes、内存
   records、writes 三不变），且先于 durable `user_prompted` 与发包。撤掉
   `prompt()` 的 production 门必红（清单行的源码锚点核对与反例双双报警）。
2. **扫描轴扩到函数型判据**：源码扫描除 `MAX_*` 常量外，同轴枚举 host 方向生产段的
   格式判据消费点（至少 `is_safe_token`、`is_absolute_path_shape` 与 trim 非空门），与
   清单双向核对——生产段出现清单外的受验门即红；清单行在生产段无对应消费点即红。
3. **SafeToken 七成员全员清账**：`containerId/grantId/sessionId/requestId/operationId/
   eventId/toolCallId` 逐枚入表——前四枚为 host 方向受验输入（前三 start、第四 prompt）；
   `operationId/eventId/toolCallId` 按实况登记（宿主生成／反方向校验），写明理由，
   不省行（承 D3 体例）。cancel 复用已验证 active request、shutdown 为 null 两条现状
   一并登记为「不适用另门」的理由行。

### E2 · 回执计数据实、真源必须在树（流程闭口）

1. 订正 1R3 回执两处计数：`bounded_input_manifest()` 实为 10 行/28 枚（本轮加 requestId
   后按实数重报）；ledger 实为 12 Fronted + 27 Other（扫描轴扩后按实数重报）。
2. **回执引用的每一件证据真源必须在 exact target 树内**：清账表的真源是 Rust 函数本身，
   回执引用函数名＋测试实跑输出；scratchpad 路径只可作过程留档补充，不得充当唯一真源
   （1R3 回执引 `12-d3-table1.md` 而该件不在 target，此形不得再现）。
3. 回执计数一律从实跑输出摘取（引用原始行），不得手抄转述。

## 三、first-red、mutation 与门

- **first-red**：在 untouched 链尖复现复验形态——撤 `prompt()` 的 `is_safe_token` 门后
  清单/ledger/常驻全绿（假绿实录），以及新扫描轴上 `requestId` 缺行即红。
- **mutation**：≥3 枚有效——撤 requestId production 门（清单锚点＋反例双红）；扫描轴
  回退为仅 `MAX_*`（requestId 行失去源码锚点即红）；清单删 requestId 行（扫描发现清单外
  受验门即红）。逐枚命中校验、定向红、byte-identical 恢复；等价如实登记。
- **门**：原票九门全量非受限域取数，逐门独立退出码；全部既有常驻保持绿；只收紧不回退；
  身份漂移（若有）按 1R Stage-2 仪式同批。

## 四、回执与停点

实现提交先于回执提交；本文件只追加回执。停在待独立验收：全新 Codex 会话从独立 clean
worktree 复验（自建 snapshot、撤门 mutation 自行实注、七成员清账逐行核）。未获 PASS 前
不 push、不 merge、不更新 `current.md`、不开 `PI-WRITE-HOST-1`、不启动 GUI/DMG/Pages。

## 五、实现回执（2026-08-02，待独立验收）

实现 tip `a204d13`（组合基线 `f20e276`＝main@`157407a` + 十五枚 patch-id 等同证据链，四枚拒绝报告随链入树）。Fable 终审独立复跑：vitest 448、cargo 162+1 ignored、diff --check 净；diff 首 hunk 3710 行起全落 tests 段，生产零触碰与 sealed CJS 零漂移坐实。1R3 常驻测试更名映射：bounded_constant_ledger_matches_the_source_and_covers_every_frozen_bound → bounded_judgment_ledger_matches_the_source_and_covers_every_frozen_bound（验收按新名 grep；更名理由见偏离①）。


施工树 `/private/tmp/courtwork-pi-host-loop-1r4`，分支 `codex/pi-host-loop-1r4`，
基线 tip `f20e276`（main@`157407a` ＋ 十五枚证据链）。改动只落
`apps/desktop/src-tauri/src/pi_loop.rs`，且全部落在 `#[cfg(test)] mod tests` 之内；
生产段（该文件 1–1112 行）与其余三模块一字未动。`packages/pi-lane/ACCEPTANCE.md`
零触碰。

本稿计数一律摘自实跑输出的原始行，行号取自本树 working tree。凡引用的真源都是本树内
的 Rust 函数或本树内命令的实跑输出；scratchpad 只留过程日志，不充当任何一项的唯一真源。

## 一、first-red

### ① 假绿实录（未改造的链尖 `f20e276`）

`prompt()` 的三行 `is_safe_token(request_id)` 门临时撤掉，命中校验恰一：

```
hits=1 expected=1 before_sha256=112b793e3e437d518d0343122235801cbf6820d967776f9ac27168833ef382bf
after_sha256=de4b183ecf7cfdf0967c108ebd66cdad0ff767623efae1823cd8e6d9995b0dca
```

撤门后全仓 Rust 门实跑（`04-firstred-A-gate-removed.txt`）：

```
test result: ok. 161 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out; finished in 5.80s
test pi_loop::tests::bounded_constant_ledger_matches_the_source_and_covers_every_frozen_bound ... ok
test pi_loop::tests::counterexample_prompt_gate_runs_before_the_user_prompted_append ... ok
test pi_loop::tests::counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn ... ok
```

exit 0。1R3 复验报告点名的三枚常驻全部继续绿，与其表格逐格相同。随后 byte-identical 还原，
SHA 回到 `112b793e…`。

### ② 新扫描轴装上、清单尚未加 `requestId` 行

扫描轴扩到函数型判据、清单与生产段的 `(site, judgment)` 双向锁写完，但
`bounded_input_manifest()` 里不加 `prompt.requestId` 行。实跑（`05-firstred-B-…`）：

```
thread 'pi_loop::tests::bounded_judgment_ledger_matches_the_source_and_covers_every_frozen_bound' panicked at src/pi_loop.rs:4748:13:
pi_loop.rs::prompt 的前置门 is_safe_token 不在 D1 手写清单里——族闭集不完整
test result: FAILED. 160 passed; 1 failed; 1 ignored; 0 measured; 0 filtered out; finished in 6.55s
```

exit 101，恰一枚红，报警文案指名缺行。加行后转绿。

## 二、E1 实现 delta

改动全在 `pi_loop.rs` 的 D1 自证段。行号取本树现状。

| 落点 | 内容 |
|---|---|
| `:3710`、`:3714-3723` | D1 节头改写并补 1R4 §零：族定义是受验输入，语法标记只是它的投影；写明 ③ 扫描面与 ④ `(site, judgment)` 粒度 |
| `:3737-3748` | `BoundedProbe` 增 `RequestId` 变体 |
| `:3750-3763` | `BoundedInput` 增 `site`，`judgment: &str` 改 `judgments: &[&str]` |
| `:3765` 起 | `bounded_input_manifest()` 十行全部补 `site`；`provider.modelId`／`provider.apiKey`／`prompt.text` 三行的 `trim_non_empty` 判据显式入列 |
| `:3806-3820` | 新增清单行 `prompt.requestId`：`site: "prompt"`、`judgments: &["is_safe_token"]`、`code: "invalid_ref"`；两枚反例＝129 字符与 `bad/id` |
| `:3913-3977` | 新增 `prompt_axis_probe`：prompt 族反例驱动，三轴断言＝具名 code ＋ journal bytes 逐字节不变 ＋ 内存 records 不增 ＋ 出包一枚不发；`Prompt` 与 `RequestId` 两支共用，另一枚输入恒取合法值 |
| `:4038-4049` | 两支分别以正文／header 形态调用同一驱动 |
| `:4066-4223` | 新增 SafeToken 七成员清账（`SafeTokenMember`／`SafeTokenDisposition`／`ADR_SAFE_TOKEN_MEMBERS`／`SAFE_TOKEN_REUSE_ROWS`／`safe_token_ledger()`）与常驻测试 `safe_token_family_is_fully_accounted_for` |
| `:4225-4248` | `BoundedConstantUse` 更名 `BoundedJudgmentUse`，字段 `constant` 更名 `judgment`；`bounded_constant_ledger` 更名 `bounded_judgment_ledger` |
| `:4543-4704` | 清账表增 20 行函数型判据消费点，10 行 `Fronted`、10 行 `Other` 且逐行具名理由 |
| `:4753-4790` | 新增 `PREDICATE_JUDGMENTS`／`TRIM_JUDGMENT`／`bounded_predicates_in` |
| `:4792-4832` | `scan_bounded_constant_uses` 更名 `scan_bounded_judgment_uses`，同一枚扫描器同时产出常量与函数型判据 |
| `:4843-4975` | 清账测试更名，增两道 `(site, judgment)` 锚点断言（正向 `:4906-4926`、反向 `:4927-4942`）与四枚计数冻结（`:4953-4974`） |

判据取舍两处须记：

- 扫描面认 `.trim()` 而非 `.trim().is_empty()`。后者一旦折行就整条看不见，而扫描器看不见
  的门正是 1R3 栽的那一跤。今日生产段每一处 `.trim()` 都紧跟 `.is_empty()`；将来出现非门用途
  的 trim，须在清账表以 `Other` 具名登记，不得靠收窄扫描面躲开。
- 扫描器不加「这行是 `fn` 声明、跳过它」的过滤。扫描器每加一条过滤就多一个藏身处；三处判据
  函数的签名行照记，由清账表以 `predicate_definition` 具名登记。

## 三、SafeToken 七成员清账

真源是 `pi_loop.rs:4101 safe_token_ledger()`，由 `:4163
safe_token_family_is_fully_accounted_for` 与 `bounded_input_manifest()` 逐行核对；清单又由
`(site, judgment)` 双向锁接到生产段消费点。三段接完，「ADR 说是一族」到「源码里真有那道门」
才闭合。

| 成员 | 归属 | 锚点／理由 |
|---|---|---|
| `containerId` | host 方向受验输入 | 清单行 `containerId`，`start_inner` 的 `is_safe_container_token`，拒 `invalid_ref` |
| `sessionId` | host 方向受验输入 | 清单行 `sessionId`，同上 |
| `grantId` | host 方向受验输入 | 清单行 `grantId`，`start_inner` 的 `is_safe_token`，拒 `invalid_ref` |
| `requestId` | host 方向受验输入 | 清单行 `prompt.requestId`，`prompt` 的 `is_safe_token`，拒 `invalid_ref`（本轮新增） |
| `operationId` | 不适用另门 | 只出现在入站 `host_request` header，由 sidecar 生成、宿主 decode 时经 `read_safe_token` 收口；host 方向的同名字段在出站 `host_result`，而本票 ready capability 恰 `['case_read']`、宿主一枚都不生成（前向债已挂 PI-WRITE-HOST-1） |
| `eventId` | 不适用另门 | journal envelope 字段，宿主按 `event_{seq}` 自产、读回时逐值复核；不由外部输入，也不进 host→sidecar 出包 |
| `toolCallId` | 不适用另门 | 只出现在入站 `agent_event` 的 tool 事件，方向是 sidecar→host，由 decoder 的 `read_safe_token` 收口 |
| `cancel.requestId` | 不适用另门 | `cancel` 出包复用 `active_request`，那一枚已在 `prompt` 前置门过关并落 durable；另立一道门不会更紧，只会多一份可漂移的真源 |
| `shutdown.requestId` | 不适用另门 | `shutdown` 出包的 requestId 恒为 null，没有可判的 SafeToken |

九行经 `assert_eq!(host_inputs, 4)` 与 `assert_eq!(ledger.len() - host_inputs, 5)` 冻结；
`ADR_SAFE_TOKEN_MEMBERS` 七枚逐枚须恰有一行，多出的行只允许是冻结的两条现状行。

## 四、E2 计数订正与冻结

1R3 回执 `PI-HOST-LOOP-1R3.md:157` 称清单「9 行……共 26 枚反例」、`:194` 称「前置闭集 11 行……
非前置 28 行」。两处皆误。对 exact target `51369e4` 的 `pi_loop.rs` 实测：

```
HEAD manifest rows=10 counterexamples=28
HEAD(1R3 exact target)：manifest rows=10  counterexamples=31  ledger total=39 fronted=12 other=27
```

（第二行的 31 是同一脚本对 `Credential` 三元组重复计数所致，改按单一模式取数即上一行的 28。）
即实数为 **10 行 / 28 枚**与 **12 Fronted / 27 Other**，与 1R3 复验报告的订正一致。

本轮加行后的四枚数字，逐枚以 `999` 探针撞出真值再写死，原始行如下：

```
assertion `left == right` failed: D1 手写清单行数        left: 11   right: 999
assertion `left == right` failed: D1 常驻反例枚数        left: 30   right: 999
assertion `left == right` failed: 清账表 Fronted 行数    left: 22   right: 999
assertion `left == right` failed: 清账表 Other 行数      left: 37   right: 999
```

四枚已作为常驻断言写在 `pi_loop.rs:4971-4974`：清单 **11 行 / 30 枚反例**，清账表
**22 Fronted / 37 Other**，合计 59 行。回执与源码自此同源，改一行不改断言必红——手抄转述
的计数不再有落脚点。

「只收紧」的机器自证（对 HEAD 与 working tree 逐枚取判据名、拒绝 code、清单输入名）：

```
judgment: before=18 after=19 removed=[] added=['trim_non_empty']
code: before=3 after=3 removed=[] added=[]
input: before=10 after=11 removed=[] added=['prompt.requestId']
```

删除项恰零。

## 五、mutation 账

逐枚命中校验、定向红、byte-identical 恢复。实现基线
SHA `f84d265ab2e0076a3feb8c2160271bd5b62dfd76c4669f2e7714e376b35c12d1`，
blob `89a97c98ef7811a72cc70917a20428440153c45b`；四枚恢复后逐次复测同值。

| # | 变异 | 命中 | 实跑 | 红点 |
|---|---|---|---|---|
| M1 | 撤 `prompt()` 的 requestId production 门 | 1/1 | exit 101，2 failed | ①`bounded_judgment_ledger_…`：扫描集与清账表不再逐行相同（清单行的源码锚点消失）；②`counterexample_every_bounded_host_input_…`：`prompt.requestId/129 字符 须以 invalid_ref 拒绝，实得 Protocol(InvalidSchema)` |
| M2 | 扫描轴回退为仅 `MAX_*`（去掉 `.chain(bounded_predicates_in(line))`） | 1/1 | exit 101，1 failed | `bounded_judgment_ledger_…`：20 行函数型判据全部失锚 |
| M3 | 清单删 `prompt.requestId` 行 | 1/1 | exit 101，2 failed | ①`bounded_judgment_ledger_…`：`pi_loop.rs::prompt 的前置门 is_safe_token 不在 D1 手写清单里——族闭集不完整`；②`safe_token_family_…`：`requestId 声称由 D1 清单行 prompt.requestId 前置，清单里却没有这一行` |
| M4 | 撤 production 门**并同步删掉**它的清账表行（模拟「补了表的破坏者」） | 1/1 ＋ 1/1 | exit 101，2 failed | ①`bounded_judgment_ledger_…`：`清单行 prompt.requestId 声称由 pi_loop.rs::prompt 的 is_safe_token 前置，生产段却扫不到这处消费点`；②反例红同 M1 |

M4 为票面三枚之外的追加。M1／M2 触发的都是「扫描集 == 清账表」这一道，正向锚点断言被它遮在
后面；M4 让扫描集与清账表重新自洽，正向锚点才现身开火。缺它则该断言的可达性未经实证。

M3 与 1R3 盲区的对照值得单记：旧的按判据名核对在 M3 下**不会**红——`is_safe_token` 同时住在
`start_inner`（grantId）与 `prompt`（requestId），删掉后者的清单行时前者会替它把名字对上。
改按 `(site, judgment)` 锚定后才红。

等价变异零枚，无作废。

四枚变异的靶都落在 `is_safe_token` 一枚判据上；`is_safe_container_token`、
`is_absolute_path_shape`、`trim_non_empty` 三枚走的是同一段扫描器与同两道锚点断言，
本轮未逐枚另注变异，登记为已知的覆盖边界，不作等价推断。

## 六、九门 exit 表

非受限域、逐门独立取 exit、严格串行，全部跑在实现现状上。日志见
`scratchpad/hostloop-1r4/gates/`。

| 门 | 命令 | 读数 | exit |
|---|---|---|---|
| 1a | `pnpm --filter @courtwork/pi-lane test` | `Test Files 14 passed (14)` / `Tests 448 passed (448)` | 0 |
| 1b | `pnpm --filter @courtwork/pi-lane test:product-sidecar` | `pass 10 / fail 0`；`bundle bytes=523235 sha256=75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b` | 0 |
| 1c | `node --test apps/desktop/scripts/assert-isolation-binding.test.mjs` | `pass 43 / fail 0` | 0 |
| 2a | `cargo test` | `162 passed; 0 failed; 1 ignored`（1R3 基线 161/1，本轮新增 `safe_token_family_is_fully_accounted_for` 一枚） | 0 |
| 2b | `cargo test --lib -- --ignored` | `1 passed; 0 failed; 162 filtered out; finished in 16.01s` | 0 |
| 2c | `rustfmt --check` 本票四模块 | 零命中 | 0 |
| 2d | `cargo clippy --all-targets -- -D warnings` | 7 处，逐处归属 `src/lib.rs`（`unnecessary unsafe block` 5、`unneeded return` 2）；本票四模块命中 0 | 101（既有基线，同 1R/1R2/1R3 归属） |
| 3 | `pnpm --filter @courtwork/pi-lane gate:verified-node-production` | 10 PASS / 0 FAIL，`门 production：全部通过` | 0 |
| 4 | `pnpm --filter @courtwork/pi-lane gate:verified-node-control` | 14 PASS / 0 FAIL，`门 control：全部通过` | 0 |
| 5 | `pnpm -r build` | 全包通过 | 0 |
| 6 | `pnpm lint` | 零命中 | 0 |
| 7 | `pnpm test` | `Test Files 166 passed (166)` / `Tests 1771 passed (1771)` | 0 |
| 8 | `pnpm --filter @courtwork/desktop lint:isolation-binding` | 扫 10 份宿主源码 / 30 份 pi lane 源码 | 0 |
| 9 | `git diff --check` | 零命中 | 0 |

sealed CJS 身份未漂移：门 1b 的 523,235 B 与 `75eff9b9…` 与 1R3 复验报告逐位相同；本轮
product source 零触碰。

## 七、偏离登记

以下八项一并提请追认。全部落在「只收紧、不回退」范围内，无一改变 wire、payload 或验收标准。

1. **既有常驻测试更名**：`bounded_constant_ledger_matches_the_source_and_covers_every_frozen_bound`
   改为 `bounded_judgment_ledger_matches_the_source_and_covers_every_frozen_bound`。1R3 复验报告
   按旧名点过该枚常驻，验收者按旧名 grep 会落空，故须登记。更名理由即 §零本身：族按受验输入定义，
   命名应随族走，不随语法标记走。断言只增不减。
2. **结构更名**：`BoundedConstantUse` → `BoundedJudgmentUse`，字段 `constant` → `judgment`，
   函数 `bounded_constant_ledger` → `bounded_judgment_ledger`，
   `scan_bounded_constant_uses` → `scan_bounded_judgment_uses`。39 行既有 ledger 逐行机械改名，
   改名计数经实跑校验：`rows_renamed= 39 constant_fields_renamed= 39`。
3. **清单字段扩形**：`judgment: &'static str` 改为 `judgments: &'static [&'static str]`。
   `provider.modelId`／`provider.apiKey`／`prompt.text` 三行的 trim 非空门自此显式入列——
   这三行原本各含两道门，旧结构只登记得下一道。
4. **既有 Prompt 分支加第三轴**：原分支断言 journal bytes 与内存 records 两轴，现与 `RequestId`
   分支共用 `prompt_axis_probe`，一并断言出包数不变。属加固。
5. **计数冻结四枚**：`manifest.len()`／反例总枚数／`Fronted`／`Other` 写死为常驻断言。E2 要求回执
   计数据实，这是让「据实」有机器约束的落法；代价是清单每次增删都须同步改四枚字面量。
6. **`safe_token_family_is_fully_accounted_for` 系新增常驻**：`cargo test` 由 161 增至 162。
7. **`read_bootstrap_payload`／`read_prompt_payload` 的函数型判据登记为 `Fronted`**：与同函数内
   `MAX_CASE_ROOT_BYTES`、`MAX_TEXT_BYTES` 等既有 `Fronted` 行同口径——encoder 侧是同一枚前置闭集
   的最后一道，不是另一族。
8. **`.trim()` 扫描面宽于今日实际用法**：见 §二。今日生产段无非门用途的 trim，故不产生额外
   `Other` 行；此为有意留宽，不是漏登记。

## 八、树状态与停点

```
 M apps/desktop/src-tauri/src/pi_loop.rs
 apps/desktop/src-tauri/src/pi_loop.rs | 834 +++++++++++++++++++++++++++-------
 1 file changed, 673 insertions(+), 161 deletions(-)
```

`git clean -nd` 零输出，工作树内无未跟踪残留。跑门所需的构建产物均在 `.gitignore` 内：
`packages/pi-lane/dist` 535 M、`apps/desktop/src-tauri/target` 2.8 G、`node_modules` 1.9 G；
snapshot 由本树 frozen lockfile 自建，sealed CJS 与 1R3 复验读数逐位相同。

最后一个动作是跑门：`cargo test`／`rustfmt --check`／`git diff --check` 三门复跑前后
`pi_loop.rs` 的 SHA 同为 `f84d265a…`，跑门之后无编辑。

未提交、未 push。`current.md` 未动，`PI-WRITE-HOST-1` 未开工，GUI/DMG/Pages 未启动。
停在待独立验收：交全新 Codex 会话从独立 clean worktree 复验，自建 snapshot、自行实注撤门
mutation、七成员清账逐行核。
