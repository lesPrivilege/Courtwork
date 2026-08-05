# PI-HOST-LOOP-1R5 · NUL 前置裁定与 fail-closed 扫描

状态：**待 Fable 实现（第五轮返修）**

角色与纪律同原票与 1R…1R4：Fable 实现、Sonnet 只读跑腿、完成后交全新 Codex 会话独立
验收。五件的全部合同、白名单、九门、既有闭口与禁止面**原样有效**；本件只新增闭口，不回退
任何既有门。

拒绝证据：`PI-HOST-LOOP-1R4@d4163df`（实现 tip `a204d13`）经独立复验
`5271342`（措辞澄清 `be0d9ad`）**REJECT**（报告见其 `packages/pi-lane/ACCEPTANCE.md`
「PI-HOST-LOOP-1R4 独立复验（2026-08-02，拒绝）」节）。requestId 门、七成员清账、
M1–M4、E2 订正与八项偏离全部成立；唯一决定性 blocker：**扫描轴仍由语法白名单定义**
（三枚硬编码函数名＋`MAX_*`＋`.trim()` 特判），协议里已存在的 wire-string NUL 门
（`pi_loop_protocol.rs::scan_string()` 的 `unit == 0`，具名 `InvalidSchema`）不在轴上；
`modelId`/`apiKey` 含 NUL 先 durable `session_started` 并 spawn、prompt `text` 含 NUL 先
durable `user_prompted` 并占用 requestId，encoder 回灌 decoder 才拒。验收另以一枚未登记
`contains('/')` 门证明 allowlist 机制本身 false-green。

## 零、两项裁定（对验收 `[需架构拍板]` 的回答）

**裁定一：NUL 归 D1 `Fronted`。** 三轴理由：① 副作用——NUL 值毒化 durable journal
（落下永远发不出去的 `session_started`/`user_prompted`）、浪费 spawn、占用 requestId，
正是历轮在杀的「先污染后拒绝」形；② 语义——config/prompt 存在的唯一目的是被发送，
不可编码＝无效输入，不存在「合法配置碰上编码事故」这回事；③ 家族——wire 冻结判据
（ADR-022 六-B.1「不得含 NUL 或 lone surrogate」）作用在同一批 host 方向输入上，与
上界/非空/形状同族。**lone surrogate 在 Rust `String` 侧结构性不可达**（String 保证
Unicode scalar 序列），以具名理由行入账，不是静默略过。

**裁定二：扫描器 fail-closed 化，名字清单永久出局。** 常量名单（1R3）与函数名单（1R4）
两轮同败，病根同一：白名单对 unknown 的处置是**跳过**。终局形态是反置：枚举前置函数族的
**全部拒绝分支**，不认识的判据表达式**判红而非跳过**；任何排除只能是票面或清账表的
具名理由行，实现代码里的过滤器/白名单不再是合法排除载体。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r5`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa→
b4175ea→1ab9c03→23f8339→51c823f→51369e4→a0644cd→a204d13→d4163df→5271342→be0d9ad`
十九枚；逐枚 patch-id 与源提交相同，冲突即停回架构。五轮拒绝报告随链入树后
`ACCEPTANCE.md` 只读零触碰。

## 二、三项闭口

### G1 · NUL-free 前置（Rust production）

`modelId`/`apiKey`/prompt `text`/`caseRoot` 四枚自由串输入的 NUL-free 判据前置——
分别落 `validate_start_config()`/`validate_api_key()`/`prompt()` 前置块，先于任何
journal append 与 spawn，具名沿**既有 code 闭集**（config 侧 `invalid_config`、prompt 侧
沿该行既有 code），不新增 code；`scan_string()` 的 wire 检查降为最后防线。SafeToken 四员
由文法排除 NUL（具名理由行，不另设门）。复验三行副作用表转 permanent 首红：断言
journal 字节零增、内存 records 零增、spawn 零、requestId 不占用。

### G2 · 扫描器 fail-closed 化（测试装置）

1. 正向：枚举 host 前置函数族（`validate_start_config`/`validate_api_key`/`prompt` 前置
   块）生产段的**全部拒绝分支判据表达式**，逐条要求 ledger 有行；**不认识的表达式＝红**，
   不是跳过。验收的 `contains('/')` 结构反例转 permanent mutation 形态（加未登记门→红）。
2. 对照面：`pi_loop_protocol` 具名 wire 判据（`scan_string` 的 NUL/lone-surrogate、长度、
   非空、SafeToken、shape…）逐枚入 ledger——`Fronted`（有前置门）或具名理由 `Other`
   （如「lone surrogate：Rust String 结构性不可达」「JSON 深度：结构约束非输入值判据」）；
   协议模块新增具名判据函数不入账即红。
3. 排除载体收口：扫描器内不得存在跳过型过滤器；清账表理由行是唯一排除位置。

### G3 · 新轴全面复扫

新扫描器装上后对四模块 host 方向面复扫一遍，凡浮出的既有成员一律本轮入账（Fronted 补门
或具名理由行），**不留给下一轮**；复扫结果（浮出几枚、各如何处置）入回执。

## 三、first-red、mutation 与门

- **first-red**：复验三枚 NUL 副作用实录（untouched 尖上逐值复现 spawn/journal 增量表）；
  旧扫描下 `contains('/')` 未登记门全绿实录；新扫描器装上后 NUL 判据缺行即红。
- **mutation ≥4**：撤任一 NUL 前置门（行为反例＋ledger 锚点双红）；扫描器退回白名单式
  （unknown→skip）必红；协议模块加具名判据不入账→红；前置函数加未登记门→红。逐枚命中
  校验、定向红、byte-identical 恢复；等价如实登记。
- **门**：原票九门全量非受限域取数，逐门独立退出码；全部既有常驻保持绿；只收紧不回退。
  本轮触碰 Rust production——生产前缀 SHA 必变，如实报新值；sealed CJS 不应漂移（Node
  零触碰），若漂移即停手。fmt/clippy 沿基线口径。
- **E2 卫生条款继续**：回执计数摘实跑原始行；引用真源全在 exact target 树内。

## 四、回执与停点

实现提交先于回执提交；本文件只追加回执。停在待独立验收：全新 Codex 会话从独立 clean
worktree 复验（自建 snapshot、三枚 NUL 反例与未登记门 mutation 自行实注、对照面清账逐行
核）。未获 PASS 前不 push、不 merge、不更新 `current.md`、不开 `PI-WRITE-HOST-1`、
不启动 GUI/DMG/Pages。

## 五、实现回执（2026-08-02，待独立验收）

实现 tip `3f0bc6f`（组合基线 `84f0710`＝main@`bb20cef` + 十九枚 patch-id 等同证据链，五轮拒绝报告随链入树）。Fable 终审独立复跑：vitest 448、cargo 164+1 ignored、diff --check 净；is_nul_free 居生产 :234、PREDICATE_JUDGMENTS 全文零残留、sealed CJS 75eff9b9… 零漂移逐项亲核。


施工树 `/private/tmp/courtwork-pi-host-loop-1r5`，分支 `codex/pi-host-loop-1r5`，
基线 tip `84f0710`（＝main@`bb20cef` + 十九枚证据链）。全程未提交、未 push。
`packages/pi-lane/ACCEPTANCE.md` 零触碰。改动面：`apps/desktop/src-tauri/src/pi_loop.rs`
单文件，`+1584 / -29`。

## 一、first-red

### ① 三枚 NUL 副作用实录（untouched 尖 `84f0710`，临时探针，跑完即撤）

| 输入 | 返回 | code | spawn | journal | records | sidecar writes |
|---|---|---|---:|---|---|---:|
| `modelId = "m\0x"` | `Protocol(InvalidSchema)` | `protocol` | 0 → **1** | 0 B → **555 B** | 0 → **1** | 0 → 0 |
| `apiKey = "k\0x"` | `Protocol(InvalidSchema)` | `protocol` | 0 → **1** | 0 B → **564 B** | 0 → **1** | 0 → 0 |
| prompt `text = "p\0x"` | `Protocol(InvalidSchema)` | `protocol` | 已为 1 | 564 B → **765 B** | 1 → **2** | 1 → 1 |
| 同一 `requestId` 复用 | `ResumeRefused("requestId 在本 logical session 内已用过")` | `resume_refused` | — | — | — | — |
| `caseRoot = "…\0x"` | `CaseRoot("案件根不可 lstat")` | `case_root` | 0 → 0 | 0 B → 0 B | 0 → 0 | 0 → 0 |

三条结构事实与 1R4 复验表逐项一致：具名 `Protocol(InvalidSchema)`、前两枚先 durable
`session_started` 并 spawn、第三枚先 durable `user_prompted` 并**占掉 requestId**、出包为零。
`apiKey` 行的 564 B 与复验表逐字节相同。`modelId` 行 555 B、prompt 行 765 B 与复验表的
563 B / 784 B 有差：该记录的字节数含探针字面量本身（journal 里 `modelId` 由默认 17 字符
换成转义后的 8 字符，恰差 9 字节；`user_prompted` 含 requestId 与文本），复验报告未公布其
探针取值，故按本树实测如实登记，不冒充等值。

`caseRoot` 一行是第四种形态：它先于 journal/spawn 被拒，但**拒错了理由**——以文件系统外观
（`案件根不可 lstat`）代替配置门，与 1R2 复验对 4097 字节案件根的判据同病。

### ② 旧扫描下未登记门全绿实录（`contains('/')` 结构反例还原）

在 `validate_start_config()` 加一条不登记 ledger/manifest 的 `model_id.contains('/')`，
跑 `cargo test --lib pi_loop::tests`：**33 passed / 0 failed / 1 ignored，EXIT=0**——
`bounded_judgment_ledger_matches_the_source_and_covers_every_frozen_bound`、
`safe_token_family_is_fully_accounted_for`、
`counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn` 三枚
自证全部照绿。反例已精确拆除，树回到 untouched（`git status --short` 空）。

### ③ 新扫描器先跑即红

新装置写完、G1 production 未动时跑 `cargo test --lib pi_loop::tests`：
**31 passed / 3 failed，EXIT=101**，三条独立红：

- `bounded_judgment_ledger_…`：`left ["is_absolute_path_shape","is_integer_lexeme","is_safe_container_token","is_safe_token","is_sha256_hex"]` vs `right [… "is_nul_free" …]`——判据函数族缺 `is_nul_free`；
- `host_refusal_branches_are_fail_closed_against_the_source`：拒绝分支扫描集少四行；
- `counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn`：
  `provider.modelId/含 NUL：spawn 计数恰 0`，`left: 1  right: 0`。

## 二、实现 delta（file:line 皆指当前树）

### G1 · production（`apps/desktop/src-tauri/src/pi_loop.rs`）

| 位置 | 内容 |
|---|---|
| `pi_loop.rs:234` | 新增 `fn is_nul_free(value: &str) -> bool`，文档写明 §零裁定一三轴理由、lone surrogate 结构性不可达、SafeToken 文法排除 |
| `pi_loop.rs:257-259` | `validate_start_config`：`modelId` NUL-free，`invalid_config` |
| `pi_loop.rs:276-278` | `validate_start_config`：`caseRoot` NUL-free（先于 `is_absolute_path_shape`，更先于 `lstat`），`invalid_config` |
| `pi_loop.rs:300-302` | `validate_api_key`：`apiKey` NUL-free，`invalid_config`；理由仍是 `&'static str`，key 本体零字节入 reason |
| `pi_loop.rs:722-724` | `prompt` 前置块：`text` NUL-free，沿该行既有 `invalid_prompt` |

四道门全部先于任何 `journal.append` 与 spawn。**不新增 code**：config 侧沿 `invalid_config`，
prompt 侧沿 `invalid_prompt`；`scan_string()` 的同名 wire 检查不动，降为最后一道防线。

### G2 · 测试装置

| 位置 | 内容 |
|---|---|
| `pi_loop.rs:4901` | `scanned_modules()`：四模块源码的唯一入口，两条扫描轴共用 |
| `pi_loop.rs:4958` | `declared_string_predicates()`：判据函数族**由签名派生**（`fn …(: &str…) -> bool`），1R4 的三枚硬编码函数名出局 |
| `pi_loop.rs:4982` | `DECLARED_STRING_PREDICATES`（6 枚）：派生结果的手写冻结对照 |
| `pi_loop.rs:4993` | `NON_EMPTY_JUDGMENT`：裸 `.is_empty()` 记 `non_empty`（新增标记，过度近似、不收窄） |
| `pi_loop.rs:5226-5364` | fail-closed 扫描器件：`attributed_production_lines` / `strip_trailing_comment` / `is_branch_head` / `balanced_from`（字符串感知的定界符配平）/ `last_string_literal` |
| `pi_loop.rs:5367` | **轴 A** `scan_refusal_branches()`：`pi_loop.rs` 生产段每一处 `return Err(` 的 `(函数, 分支头, 拒绝表达式)` |
| `pi_loop.rs:5430` | **轴 B** `scan_wire_rejections()`：`pi_loop_protocol.rs` 生产段每一处 `reject(` / `reject_field(` / `PacketRejection {` 的 `(函数, 理由字面量)` |
| `pi_loop.rs:5475/5483` | `HOST_REFUSAL_CODES`（三枚具名 code）＋ `HOST_PREFLIGHT_FAMILY`（5 名冻结族） |
| `pi_loop.rs:5508` | `host_refusal_branches()`：36 行手写表（17 `HostInput` + 19 具名理由 `Other`） |
| `pi_loop.rs:5750` | 测试 `host_refusal_branches_are_fail_closed_against_the_source`（五段断言） |
| `pi_loop.rs:5860` | `WIRE_REJECTION_LITERAL_SITES`：允许出现 `PacketRejection { … }` 的四枚函数闭集 |
| `pi_loop.rs:5880` | `wire_judgment_ledger()`：90 行对照表（12 `Fronted` + 78 具名理由 `Other`） |
| `pi_loop.rs:6431` | 测试 `wire_judgment_ledger_covers_every_named_protocol_rejection`（四段断言） |
| `pi_loop.rs` D1 清单 | 四行加判据与 NUL 反例：`provider.modelId` / `caseRoot` / `provider.apiKey` / `prompt.text` |
| `pi_loop.rs` `prompt_axis_probe` | 加**第四轴**断言：被拒的这一轮 `requestId` 不得进 `projection.request_ids` |

**扫描器内零跳过型过滤器**：两枚扫描器只有「归属函数、注释行不参与文本」这类**取文本**规则，
没有任何「这一条不认识→跳过」。排除全部住在两张表的具名理由行里。

## 三、对照面清账表（轴 B，90 行 = 12 Fronted + 78 Other）

`Fronted` 12 行逐行指名 D1 清单的 `(input, judgment)`，且该行 `site` 必须落在
host 前置族内：

| 协议函数 | 理由字面量 | 指名的清单行 |
|---|---|---|
| `scan_string` | wire 字符串必须是不含 NUL 与 lone surrogate 的 Unicode scalar 序列 | `provider.modelId` / `caseRoot` / `provider.apiKey` / `prompt.text` × `is_nul_free` |
| `read_string` | 超过 UTF-8 字节上限 | 同四枚 × 各自 `MAX_*` |
| `read_safe_token` | 不满足 SafeToken 形状 | `containerId` / `sessionId` / `grantId` / `prompt.requestId` |
| `read_non_empty_string` | 不得为空 | `caseRoot` × `non_empty` |
| `read_bootstrap_payload` | caseRoot 必须是平台绝对路径 | `caseRoot 绝对形状` |
| `read_bootstrap_payload` | provider.modelId trim 后不得为空 | `provider.modelId` × `trim_non_empty` |
| `read_prompt_payload` | prompt.text trim 后不得为空 | `prompt.text` × `trim_non_empty` |
| `read_integer` | 超出契约范围 | `limits.maxTurns` |
| `read_non_negative_number` × 4 | 不得为负数或 negative zero／必须大于 0／必须是有限数／超出契约上限 | `limits.maxUsd` |

**lone surrogate**：与 NUL 共用同一枚理由字面量，以该行 `note` 具名登记——
「Rust `String` 保证 Unicode scalar 序列，host 方向永远构造不出这一形，故不另设前置门」。

78 行 `Other` 按具名理由归入十四类（计数由源码实测重算）：json_lexical 16、
inbound_only 15、rust_typed 9、envelope 8、framing 7、derived_resume 6、
host_outbound_unused 6、closed_shape 3、constructor_definition 2、json_depth 2、
list_entries 1、closed_enum 1、safe_integer 1、self_produced_digest 1。

轴 A 的 19 行 `Other` 六类：resume_drift 8、fs_fact 4、runtime_state 3、
inbound_shape 2、container_delete 1、dedup 1。

## 四、G3 · 新轴复扫的浮出与处置（本轮全部入账，零留尾）

| 浮出物 | 数量 | 处置 |
|---|---|---|
| `start_inner` 与 `delete_container` 进入 host 前置族（同样返回具名拒绝 code） | 2 枚函数 / 19 条分支 | 全部入轴 A 表，`Other` 具名理由六类：文件系统事实、容器整删入参门、运行时状态、requestId 去重、resume 漂移、入站包形状 |
| `pi_loop_protocol.rs` 全部具名 wire 判据（此前整族不在任何轴上） | 90 行 | 入轴 B 表，12 `Fronted` + 78 具名理由 |
| `is_sha256_hex` / `is_integer_lexeme`（判据族改签名派生后自动进轴） | 6 条消费点 | 入 `bounded_judgment_ledger`，全部 `Other` 具名理由 |
| 裸 `.is_empty()` 非空门（旧轴只认 `.trim()`） | 6 条消费点 | 1 条 `Fronted`（`caseRoot` 的 `non_empty`，并补进 D1 清单）＋ 5 条 `Other` |
| NUL 前置门本体 | 4 条消费点 + 1 条定义行 | 4 `Fronted` + 1 定义行 |

清账表因此由 59 行涨到 **75 行**（26 `Fronted` + 49 `Other`）；D1 清单仍 11 行，常驻反例
30 → **34** 枚。四枚冻结计数全部写死在被测面上。

## 五、mutation（六枚，全部命中校验 → 定向红 → byte-identical 还原）

还原一律用会话内 `cp` 备份，还原后 `shasum -a 256` 与变异前逐字节相同（六次均 EXIT=0）。

| # | 变异 | 结果 | 红在哪 |
|---|---|---|---|
| M1 | 撤 `prompt` 的 NUL 前置门 | 31 passed / **3 failed**，EXIT=101 | 行为红（`prompt.text/含 NUL 须以 invalid_prompt 拒绝，实得 Protocol(InvalidSchema)`）＋ 轴 A 锚点红 ＋ 清账表锚点红 |
| M2 | 扫描器退回 1R4 白名单形态（unknown→skip） | 33 passed / **1 failed**，EXIT=101 | 轴 A：扫描集塌陷，与手写表不等 |
| M3 | 协议模块加一枚具名判据（`read_string` 的 BOM 门）不入账 | 33 passed / **1 failed**，EXIT=101 | 轴 B：`协议模块的具名拒绝必须与对照表逐行相同` |
| M4 | 前置函数加未登记门（`model_id.contains('/')`，1R4 结构反例转常驻形态） | 33 passed / **1 failed**，EXIT=101 | 轴 A：扫描集多出一行 |
| M5 | **只**撤 `caseRoot` 的 NUL 前置门（留住 `modelId` 那一处） | 32 passed / **2 failed**，EXIT=101 | 轴 A 红 ＋ 行为红（`caseRoot/含 NUL 须以 invalid_config 拒绝，实得 CaseRoot("案件根不可 lstat")`）；**清账表照绿**——`(pi_loop.rs, validate_start_config, is_nul_free)` 由同函数另一处调用顶名 |
| M6 | 把 NUL 门搬进新写的前置函数 `validate_model_id_nul` | 32 passed / **2 failed**，EXIT=101 | 族派生红（`host 前置函数族与冻结清单不符`）＋ 清账表红 |

**零等价、零作废。** M5 是本轮最有信息量的一枚：它证明 1R4 的 `(site, judgment)` 双向锁
在「同函数两处调用同一判据」上确有盲区，而新的拒绝分支轴把这个盲区补上了。

## 六、九门（非受限域、逐门独立 exit、串行；退出码先落文件再读）

| 门 | 命令 | 读数 | exit |
|---|---|---|---|
| 1a | `pnpm --filter @courtwork/pi-lane test` | 14 files / 448 tests | 0 |
| 1b | `pnpm --filter @courtwork/pi-lane test:product-sidecar` | 10/10；bundle **523,235 B**、sha256 `75eff9b9…65399b`，两次现编 byte-identical | 0 |
| 1c | `node --test scripts/assert-isolation-binding.test.mjs` | 43/43 | 0 |
| 1d | `pnpm --filter @courtwork/pi-lane test:verified-node-gate` | 8/8 | 0 |
| 2a | `cargo test` | **164 passed / 0 failed / 1 ignored**（基线 162，+2 枚新测试） | 0 |
| 2b | `cargo test --lib -- --ignored` | 1 passed（快照 E2E，16.49 s） | 0 |
| 2c | `rustfmt --check` 本票四模块（逐模块独立跑） | 四枚全零命中 | 0 / 0 / 0 / 0 |
| 2d | `cargo clippy --all-targets -- -D warnings` | 7 处，**全落 `src/lib.rs`**；本票四模块零命中 | 101（既有基线，同 1R4） |
| 3 | verified Node + production sealed CJS | 10 项 PASS | 0 |
| 4 | verified Node + scripted control CJS | 14 项 PASS | 0 |
| 5 | `pnpm -r build` | 全包通过 | 0 |
| 6 | `pnpm lint` | 零命中 | 0 |
| 7 | `pnpm test` | 166 files / 1,771 tests | 0 |
| 8 | `pnpm --filter @courtwork/desktop lint:isolation-binding` | 扫 10 份宿主源码、30 份 pi lane 源码；等级 `none` | 0 |
| 9 | `git diff --check` | 零命中 | 0 |

**生产前缀 SHA（如实报新值）**：`pi_loop.rs` 生产段（`#[cfg(test)]\nmod tests` 之前）
由 49,093 B / `44a7ff55ecef4a0dfca5706c2b7fb4acbe18704fa6764017109076d66f29f33a`
变为 **50,780 B / `67bcfa26238d218fc0cf3f0ea5ec209a2ce887f7a8f7b0650170b33aeea5dfde`**。
本轮触碰 Rust production，SHA 必变，符合票面预期。

**sealed CJS 零漂移**：523,235 B / `75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`，
与 1R4 独立复验自建快照逐字节相同（Node 侧零触碰）。

**只收紧不回退的机器自证**：既有 D1 反例 30 枚一枚未删（30 → 34 只增）；
`bounded_judgment_ledger` 59 → 75 行只增；`safe_token_family_is_fully_accounted_for`
与既有 SafeToken 七成员清账原样通过；全仓门读数全部持平或上升。

## 七、偏离登记

1. **新增一枚 production helper `is_nul_free`**（`pi_loop.rs:234`）。票面授权面是「前置函数族」，
   未逐字写「可新增函数」。取此形而非四处内联，理由有二：① 与既有 `is_safe_token` /
   `is_absolute_path_shape` 判据族同形；② 判据族改签名派生后，具名函数自动进扫描轴，
   四处调用点各自入账，内联写法则整族不可见。**未新增 code、未改 wire/payload 闭集。**
2. **`pi_loop_protocol.rs` 零改动**。票面允许「若需导出判据符号按 1R3 先例只扩可见性」——
   本轮不需要：`is_nul_free` 住 `pi_loop.rs`，轴 B 只读该模块源文本。
3. **host 前置族含 `start_inner` 与 `delete_container`**。票面 G2.1 点名的是
   `validate_start_config` / `validate_api_key` / `prompt` 前置块；族由「返回三枚具名拒绝
   code」派生后必然多出这两名。按 G3「凡浮出成员一律本轮入账」处置，未收窄派生规则去凑
   点名清单——收窄就是又造一份白名单。
4. **轴 B population 取「全部具名拒绝理由字面量」而非「判据函数名」**。票面括注列的
   NUL / lone-surrogate / 长度 / 非空 / SafeToken / shape / JSON 深度七类，只有按理由
   字面量枚举才能一网打尽（`scan_string` 的 NUL 是**内联**判据，没有函数名可取）。
5. **新增判据标记 `non_empty`**（裸 `.is_empty()`）。为让 `caseRoot` 的非空门进得了清单
   与清账表；标记是过度近似的模式而非名单，非门用途的 `.is_empty()` 同样入账。
6. **`bounded_judgment_ledger` 的 `MAX_*` 常量轴保留**。它是模式（任何新 `MAX_*` 自动进轴），
   不是名单，不属「unknown→跳过」病根；轴 A / 轴 B 装上后它降为更窄的冗余交叉核。
   1R4 的 `PREDICATE_JUDGMENTS` 三枚硬编码函数名已**删除**。
7. **first-red ① 的字节增量与 1R4 复验表有差**（modelId 555 vs 563、prompt 765 vs 784）。
   原因是记录体内嵌探针字面量，复验未公布其取值。结构事实（code / spawn / records /
   writes / requestId 占用）逐项一致，`apiKey` 一行字节数完全相同。如实登记，不冒充等值。
8. **`prompt_axis_probe` 增加第四轴断言**（requestId 不占用）。这会连带收紧既有三行
   prompt 反例，属只收紧。

## 八、停点

停在待独立验收：未提交、未 push、未合入，`current.md` 未动，`PI-WRITE-HOST-1` 未开工，
GUI/DMG/Pages 未启动。`git status --short` 只有一行 `M apps/desktop/src-tauri/src/pi_loop.rs`。

## 九、`[需架构拍板]`

无。
