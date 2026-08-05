# PI-WRITE-HOST-1 · 开工序⑥ 实现回执（2026-08-05，双端 golden ＋ 矩阵收口）

票面：就绪图 `PI-WRITE-HOST-1` 行 ＋ 本包 SPEC 九 ＋ `PI-WRITE-HOST-1-PREFLIGHT.md`／`-RECON.md`
＋ `-STAGE4.md` §八 ＋ `-STAGE5.md` §十 移交五项。基线 `claude/pi-write-host-1@5ba36f1`（开工序⑤）。

本阶段范围恰按 PREFLIGHT §三 开工序⑥：**裁定A 落地 ＋ 双端 golden ＋ `proposalHash` 债清偿
＋ 退出矩阵残项对账**。全量门属⑦；`/workspace` 回读属 `PI-WORKSPACE-READ-1`。本单一行不碰。

触碰面恰五处：`pi_loop.rs`／`pi_loop_journal.rs`、**新增** `packages/pi-lane/fixtures/`
两枚 tracked golden、**新增** `packages/pi-lane/src/write-session-golden.test.ts`，以及本回执。

**生产 TS 零触碰**：`workspace-write-env.ts` `af22f868…`／`product-runtime.ts` `1ee9cc51…`
与⑤ 逐字节相同。故 sealed CJS 身份**不需要**重建重录——`build:product-sidecar` 实跑复核
`534,219 B`／`8520026cb78e4fbd773b020a8b59a23082e55790403149de5fb91be332fce562`、
`reproducible: true`、snapshot `reused-identical`，`route-manifest.json` 恒为
`0b77e8f17a0688a0343b6c18c48d34cb6fbce0c1d04ac48de1bd30bdd3addc2c`（⑤ 记的三处身份一处未动）。

**Rust 两文件零触碰**：`pi_loop_protocol.rs` `cf3aa9aa…`／`pi_loop_workspace.rs` `16cce7dd…`
与④⑤ 逐字节相同——wire schema 零改（裁定A 只动 journal codec，不动 wire）。

## 零 · 裁定A：journal `promptId`／`capabilities` 的读侧闭集扩员 ＋ 写侧记实况

**裁定文（协调裁定在案，随批可被架构推翻，本节即落痕）**：读侧把 `promptId` 合法集扩为**恰**
`{'case-read-v1','md-work-v1'}`、把 `capabilities` 合法集扩为**恰**
`{['case_read'], ['case_read','workspace_write']}`；两者都是**闭集**，不是通配、不是「非空即可」。
写侧 `session_started` 记当刻真值。旧档继续 valid。

**理由（三选一里为何只有扩员是诚实形）**：

| 选项 | 判定 |
|---|---|
| 维持现状（写侧硬编码 `case-read-v1`／`['case_read']`） | **违不变量 4/6**。⑤ 之后真跑的是 `md-work-v1` ＋ 两枚能力，durable 记录因此是一句与事实不符的话，且这句话会被此后每一份档继承 |
| 收窄：把常量直接换成新值 | **毁旧档**。读侧是严格相等，换值即让 `PI-HOST-LOOP-1` 时期的既有 journal 整份 quarantine——改既有档的解码语义 |
| **扩员**（本裁定） | 旧档与新形各自 valid，写侧不再撒谎，闭集仍然是闭集 |

**「记录值须等于该会话实际握手集」的落地形**：`session_started` 在 `start_inner` 里排在 spawn
**之前**（R6/R7 的 encode-before-effect），此刻 ready 握手尚未发生，故「实收集」在写的那一刻
还不存在。可写的唯一诚实值是本会话**必须**谈成的那张表 `EXPECTED_CAPABILITIES`——第 7 步
ready 若不逐值等于它，leg 当场以 `StateViolation` 收束、连首枚 prompt 都到不了。因此在**任何
能继续往下跑的路径**上，「记下的」与「谈成的」恒等。这条不是宣称：
`session_started_records_the_prompt_and_capabilities_actually_in_force` 的期望串由 **`host.capabilities()`
的实收值渲染**，不抄常量表——两谱一分叉当场红。

**契约修订登记**：这是对 `PI-HOST-LOOP-1` 票面 §139 冻结的 `session_started` payload 契约的
**窄幅**修订——`promptId`／`capabilities` 由「codec 里的两枚字面量」改为「payload 里的两枚字段
＋ 读侧闭集」。envelope 六规则、十九型闭集、其余字段与 wire schema **一字未动**。
**[需架构拍板]A 转「已裁待追认」。**

### born-red 三枚（先证会红，再做最小实现）

判据形态取**文本**而非结构体字段——受验的正是「今天真的跑起来的那一形会话，能不能被自家
读侧收下」，故它在扩员之前就能编译、就能红。

| 族 | 装置 | 实测红形（基线 `5ba36f1`） |
|---|---|---|
| R-A1 新形被自家读侧拒 | `CURRENT_SESSION_STARTED`（`md-work-v1` ＋ `['case_read','workspace_write']`）过 `decode_record` | `新形 必须 valid，实得 PacketRejection { code: InvalidSchema, reason: "promptId 不在契约闭集内" }` |
| R-A2 写侧未记实况 | 真起一枚 leg，读盘上 journal | `journal 必须记实收握手集 "capabilities":["case_read","workspace_write"]，实得 …"promptId":"case-read-v1"…"capabilities":["case_read"]` |
| R-A3 闭集撤员 | 见 §四 M6-A1〜A4 | 撤旧值⇒旧档红、撤新值⇒新档红，两向各自成立 |

R-A1 同批带**逐字节往返**判据：扩员之后 `promptId`／`capabilities` 必须是**被记住的值**，
而不是解码时丢弃、编码时按常量补回去的假往返。

## 一 · 本单新增了什么概念、为何非加不可

| # | 概念 | 非加不可的理由 |
|---|---|---|
| 1 | `SessionStartedPayload` 的 `prompt_id`／`capabilities` 两枚字段 | 裁定A 的写侧「记当刻真值」结构性要求：值不进 payload，写侧就只能写常量，两谱必然分叉。读侧同批返回它们，往返才是真往返 |
| 2 | `LEGAL_PROMPT_IDS`／`LEGAL_CAPABILITY_SETS` 两张闭集表 | 扩员必须仍是**闭集**。写成「非空字符串」「每一员都合法」就是把闭集换成通配——次序漂移、重复项、集外组合会全部静默通过（§四 反例七枚逐枚证否） |
| 3 | `WORKSPACE_WRITE_PROPOSAL_DOMAIN`（Rust 侧） | 拍板C 要求 Rust **重算**。域分隔串是 ADR-022 六-B.2 的契约组成部分，不能借道 Node 自报 |
| 4 | `PiLoopHost::workspace_write_proposal_hash` | 同上。它必须住在**臂**上而不是 `pi_loop_workspace`：绑定的 `sessionId`／`requestId` 只有臂知道，真件按设计连会话身份都看不见 |
| 5 | 两枚 tracked golden（`write-session-wire-v1.jsonl`／`write-session-journal-v1.jsonl`） | ⑥ 的正题。两侧此前各有各的门，**没有任何一枚判据能让「Node 说的」和「Rust 记的」当面对质**；跨端常量（prompt 身份、能力闭集、提案 hash 域串）因此是两份可以各自漂移的字面量 |

**刻意不新增的五样**（复杂度节制）：不给 journal 加新记录型、不动 codec 的十九型闭集；
不为 `promptId` 另立版本协商（闭集扩员就够）；不加第二份提案 hash 实现供生产复用（测试侧那份
是**独立重写**，同源就零区分力）；不把 golden 做成会被测试重写的生成物；不加 resume 期的
prompt/capability 漂移门（见 §七.3 移交）。

## 二 · 双端 golden：同一逻辑会话的两端字节谱

### 2.1 两枚 fixture 与「谁产出、谁复验」

| fixture | 产出侧 | 复验侧 |
|---|---|---|
| `write-session-wire-v1.jsonl` 的 **sidecar→host** 段（8 行：`ready`／4 枚 `agent_event`／`host_request`／…／`terminal`） | Node 侧真跑 | Rust 侧：自家 codec 双向唯一 ＋ **`proposalHash` 本侧独立重算** ＋ 真件落盘回读 hash/长度 |
| 同枚的 **host→sidecar** 段（2 行：`prompt`／`host_result`） | Rust 侧真跑 | Node 侧：原字节喂进状态机消费 |
| `write-session-journal-v1.jsonl`（5 行：`session_started` ＋ 四段账） | Rust 侧真跑 | Node 侧：跨端常量（`promptId`／`capabilities`／`caseRoot`／逻辑路径形态） |

**没有任一侧只验证自己**：Node 产出的 `host_request` 由 Rust 用**自己写的** framing 重算
`proposalHash` 复核并真的落盘；Rust 产出的 `prompt`／`host_result` 由 Node 的状态机真的消费。

**bootstrap 行不入 golden**（如实登记）：它携带机器本地案件根与内存 key，两者都不许冻进
tracked 文件。Node 侧因此在本地构造 bootstrap，其余两行取 golden 原字节。

**会话取形的两处刻意选择**（承「静默零一律硬失败」的反面：不让不确定性伪装成绿）：
本会话**不含读工具**、最终短语取一枚 chunk 之内（`好`）。原因是实测发现
`assistant_text_delta` 的**切分边界逐轮不同**（两轮实测：`已写入 /workspace/纪` ＋ `要.md。`
vs `已写入 /workspa` ＋ `ce/纪要.md。`）。取短语之后连跑三轮字节全同，故 golden 里
**没有任何字段被豁免**——`turn_finished` 的 token 读数与 budget 也逐字节固定。

### 2.2 判据清单

**Rust 侧**（`dual_end_golden_wire_session_matches_on_the_host_side`）：

1. 每行**恰一个方向**解得开（`^` 异或，两向都成或都不成一律红）。
2. 把 8 行 sidecar 段原样喂进臂 → 本侧三枚出包（bootstrap ＋ prompt ＋ host_result）中
   后两枚与 golden **逐字节**相同。
3. 盘上真落字节的 sha256／长度逐值等于 golden 自报的 `contentSha256`／`byteLength`。
4. **跨端钉子**：按 ADR-022 六-B.2 在测试里独立重写的 framing 算出的 `proposalHash`
   逐值等于 Node 侧算的那一枚。
5. 双根：golden 每一行都不带 `/case/`；`/workspace/` 只许出现在 `assistant_text_delta`
   （那是**模型输出**，不是路径字段）。

**Rust 侧**（`dual_end_golden_journal_ledger_matches_byte_for_byte`）：

6. golden 每行 canonical 往返（decode → encode 逐字节回原样）。
7. 实跑账里 golden 点名的每一枚 `eventId` 都在，且**逐字节**相同。
8. 四段账序在实跑账里恰按 `tool_proposed → authorization_decided → effect_started →
   effect_succeeded`、恰一次。
9. journal 里没有正文、没有物理根、没有 app-data 绝对路径；唯一的根是 `"caseRoot":"/case"`。

**两枚环境派生字段按名替换后再比字节，各自另有直接断言、不靠 golden 兜**（如实登记）：

| 字段 | 为何不能进 golden | 替代判据 |
|---|---|---|
| `recordedAt` | 真实 wall clock | 实跑值逐枚 `> 0` 且非递减 |
| `routeManifestSha256` | 随 sidecar 制品变（进 golden 就成了第四处身份钉，且会造出「改数字转绿」的通路） | 实跑值必须等于 `sha256_bytes(EXPECTED_ROUTE_MANIFEST)` |

**Node 侧**（`write-session-golden.test.ts`，6 枚）：文件卫生（无 BOM/CR/空行/重复行）＋
每行方向唯一且 canonical 往返；**本侧产出的每一枚 sidecar→host 帧与 golden 逐字节相同**
（含末字节必须是 LF——framing 也在判据里）；`proposalHash`／`contentSha256`／`byteLength`
用 `node:crypto` 独立重算（production 走 `crypto.subtle`，避免同源假绿）；跨端常量
`PRODUCT_PROMPT_ID`／`PRODUCT_CAPABILITIES`／`CASE_LOGICAL_ROOT` 逐值等于 journal golden；
四段账序在场且逻辑路径与 wire 同源、是裸路径；双根投影。

### 2.3 双根一致性（`/case/...` 与 `/workspace/...`）

三层，缺一层都不算「入 golden」：

1. **wire 与 journal 上恒是裸逻辑路径**——两枚 golden 逐行扫，`/case/` 零出现，
   `/workspace/` 只许出现在模型自己说的那句话里。
2. **两端的根→裸路径映射同源**：`resolveWorkspaceLogicalPath(纪要.md).virtualPath`
   恰为 `/workspace/纪要.md`；反向，`/case/纪要.md` **不是**合法 workspace 目标（当场 `ok:false`）。
3. **真跑一遍读＋写**：模型可见面上 `glob` 把命中逐条以 `/case/备忘.md` 展示、写面报
   `/workspace/纪要.md`，物理案件根一次都不出现。

## 三 · 拍板C：`proposalHash` 的 Rust 重算（④ 移交 2 ／⑤ §六 的未竟部分）

落点是臂的 **0.5 门**：排在 0.3「一 tc 一 op」认领之后、**第 1 步在场判定之前**。不符即
`settle_failed(HashMismatch)`——请求**从未成为提案**（`tool_proposed`／`effect_started` 一枚不落），
effect 恰零次，workspace 物理根根本不存在。

**两枚 hash 不互相顶名**（票面明令，`proposal_hash_and_content_hash_are_two_different_gates`）：

| | `proposalHash`（本单） | 内容 hash（④ G-17） |
|---|---|---|
| 位置 | 提案**之前** | 授权**之后**、`replace` 之前 |
| 账本形态 | 只有 `effect_failed` | `tool_proposed`／`authorization_decided`／`effect_started` 三段齐备后才 `effect_failed` |
| code | `hash_mismatch` | `hash_mismatch` |

两者 code 同名，**账本形态不同**——这正是「不顶名」的可观测判据。判据用**同一形语料**
（正文与自报 `contentSha256` 不符）分两路喂：`proposalHash` 算在自报值上 ⇒ 过提案门、
被内容 hash 拦下；算在正文真值上 ⇒ 连提案都不是。

**七枚 frame 逐枚绑定**（`counterexample_proposal_hash_is_recomputed_and_binds_every_bound_field`）：
构造法是「wire 上每一枚字段都留真值，只把 `proposalHash` 算在一枚**被篡改过**的字段上」，
于是唯一不符的就是这枚 hash，别的门一概轮不到。domain／sessionId／requestId／operationId／
logicalPath／byteLength／contentSha256 逐枚各一例，每例带 `assert_ne!` 的**变异靶失效守卫**
（承 1R2 判例：靶必须真的换出另一枚 hash）。

长度前缀在场，故「拼串」式域混淆（`a|bc` 与 `ab|c`）结构性不成立——这条写进 doc，不另立门。

## 四 · mutation（双向唯一锚定 ＋ 命中恰 1 校验 ＋ 还原后 SHA 复核）

变异器逐枚校验「命中 == 1」，还原后复核文件 SHA 与变异前逐字节相同（不等即 assert 中止）。

### 裁定A（4/4 红）

| 编号 | 变异 | 实测红形 |
|---|---|---|
| M6-A1 | `LEGAL_PROMPT_IDS` 撤旧值 | `旧档 必须 valid，实得 …"promptId 不在契约闭集内"` |
| M6-A2 | `LEGAL_PROMPT_IDS` 撤新值 | `新形 必须 valid，实得 …"promptId 不在契约闭集内"` |
| M6-A3 | `LEGAL_CAPABILITY_SETS` 撤旧集 | `旧档 必须 valid，实得 …"capabilities 必须恰为 ['case_read'] 或 ['case_read','workspace_write']"` |
| M6-A4 | `LEGAL_CAPABILITY_SETS` 撤新集 | `新形 必须 valid，实得 同上` |

闭集的**闭性**另由 7 枚负例正向锁死（集外 promptId／空 promptId／只有 `workspace_write`／
含未谈成的 `workspace_read`／次序漂移／重复项／空集），每枚带受替换锚点唯一性校验。

### 拍板C（4/4 红）

| 编号 | 变异 | 实测红形 |
|---|---|---|
| M6-C1 | 撤 0.5 提案 hash 门 | `domain：拒绝理由必须恰是 hash_mismatch`，left `Ok(Write { … })`——**篡改域串的那一轮真的写成了** |
| M6-C2 | hash 不符改判 `state_changed` | left `Failed { code: StateChanged, … }` |
| M6-C3 | 生产侧 framing 少一枚 `sessionId` frame | `real_write_host_lands_bytes…` 红：账退化成 `[…, EffectFailed, …]` |
| M6-C4 | 长度前缀 `u32be` → `u32le` | 同上 |

C3／C4 的靶是**正向端到端**：它们证明「测试里独立重写的 framing」与生产件逐字节一致这件事
是被机器盯着的——两份实现只要有一处不同，正例当场垮。

### 双端 golden（8 枚，红位如实分列）

| 编号 | 变异 | cargo | vitest |
|---|---|---|---|
| M6-G1 | golden 的 `proposalHash` 改一字符 | RED | RED |
| M6-G2 | journal golden 的 `promptId` 退回 `case-read-v1` | RED | RED（`expected 'case-read-v1' to be 'md-work-v1'`） |
| M6-G3 | journal golden 的 `capabilities` 退回单枚 | RED | RED |
| M6-G4 | golden 的 `host_result.disposition` 改 `overwritten` | RED | **GREEN** |
| M6-G5 | Rust 侧 `CURRENT_PROMPT_ID` 单侧漂移 | RED | **GREEN** |
| M6-G6 | Node 侧 `PRODUCT_PROMPT_ID` 单侧漂移 | **GREEN** | RED |
| M6-G7 | Node 侧提案 hash 域串单侧漂移 | **GREEN** | RED |
| M6-G8 | Rust 侧提案 hash 域串单侧漂移 | RED | **GREEN** |

**四枚单侧 GREEN 不是等价变异，是分工**（如实登记，不冒充红证）：G-4 那一行属 Rust 的
**产出**面，Node 只消费不复核 disposition；G-5/G-8 是 Rust 侧常量，Node 看不见它；G-6/G-7
是 Node 侧常量，Rust 看不见它。**成对看**才是本节的结论：G-5/G-6 与 G-7/G-8 各是一对
「同一枚跨端常量的两份」，任一侧单独漂移**都会在那一侧红**——这正是双端 golden 存在的理由，
也是它此前不存在时那两份字面量可以各自漂移的实证。

### 时效性补跑（承「门跑过之后又编辑就必须重跑」判例）

整批变异跑在 clippy 修与 `rustfmt` **之前**的树上。终树另取三枚跨面代表复跑，逐枚仍红、
还原 SHA 复原：M6-A2R（journal 读侧闭集）、M6-C1R（臂上提案 hash 门）、M6-G7R（Node 侧
跨端常量）。

### 自伤登记（工程卫生）

把 `workspace_write_proposal_hash` 插进 `serve_host_request` 的**上方**时，插入点落在了
`serve_host_request` 的 doc 注释与函数签名**之间**——那一整块「次序即语义」的七步 doc 于是
悄悄改挂到了新函数身上。测试全绿、`cargo build` 全绿，**唯一发现它的是 clippy 的
`doc_lazy_continuation`**（首行报「doc list item without indentation」，因为它继承了上一块
doc 的列表上下文）。已把整块新代码移到 doc 之前，doc 归位。判例：**新增私有方法的插入点
必须避开既有 doc 与签名之间的缝；文档归属漂移不触测试，只触 lint**。

## 五 · RECON §退出证据矩阵逐项对账

「已在册」列的 26 枚门名逐枚 `grep -c "fn <name>("` 实测命中恰 1（④／⑤ 之外零重名）。

| # | 票面矩阵行 | 覆盖 | 门 |
|---|---|---|---|
| 1 | prompt snapshot／byte gate | ⑤ | `md-work-v1 system prompt` 三枚（exact snapshot ＋ 六条语义 ＋ ≤2048 bytes 且不夹带）；M5-6 红证 |
| 2 | 四工具 exact set mutation 红证 | ⑤ | `绿证四：闭集恰 read/grep/glob/write`＋`红证九：多出一件即装配期失败`；M5-7 红证 |
| 3 | **两端路径 golden 一致** | **⑥ 本段** | `dual_end_golden_wire_session_matches_on_the_host_side` §2.2.5 ＋ Node 侧「双根」枚 §2.3 |
| 4 | 非 `.md` Node 零 op | ⑤ | `Node 门先拒的一律零 operation`（6 形态）；M5-9 红证 |
| 5 | Rust 畸形 request 零 effect | ④ | `counterexample_malformed_requests_are_refused_with_zero_effect`（G-2）＋ `counterexample_write_path_grammar_refuses_every_closed_violation`（G-1，31 负例） |
| 6 | root **外** symlink 父段 | ④ | `counterexample_symlink_above_the_capability_root_is_refused`（G-3） |
| 7 | root **内** symlink 父段 | ④ | `counterexample_symlinks_inside_the_root_are_never_followed`（G-4）＋ `counterexample_symlinks_within_the_root_are_still_never_followed`（G-5，M④3 三轮剥壳后才咬得动的那一枚） |
| 8 | final symlink | ④ | G-5 的末段轴；M④4 红证 |
| 9 | swap race | ④ | `counterexample_swapping_a_segment_mid_effect_cannot_redirect_the_bytes` ＋ `counterexample_segment_swapped_between_authorization_and_effect_refuses_with_zero_write`（G-7） |
| 10 | junction／reparse | ④ | **不可构造**：概念不在 macOS 存在，由 `platform_boundaries_are_registered_not_faked` 显式登记（移植到 Windows 时当场红） |
| 11 | cross-container | ④ | `counterexample_containers_cannot_reach_each_other`（G-6） |
| 12 | 全拒零 effect | ④ | G-2 ＋ `counterexample_failures_before_replace_leave_the_target_and_directory_untouched`（G-16） |
| 13 | ambient／`create_dir_all`／canonicalize 授权／`std::fs` mutation 零出现 | ④ | `ambient_and_mutation_surface_is_fail_closed`（G-9，三段 fail-closed 判据）；M④16 红证 |
| 14 | remove-then-rename 零出现 | ④ | `replace_is_a_same_directory_rename_never_remove_then_rename`（G-8） |
| 15 | 并发 reader 只见 old/new | ④ | `concurrent_readers_only_ever_see_the_old_or_the_new_version`（G-10） |
| 16 | kill 覆盖 temp sync／replace／parent 屏障 | ④ | `counterexample_real_sigkills_never_leave_a_torn_workspace_file`（G-11，12 轮真 SIGKILL 子进程注入） |
| 17 | kill 覆盖 **journal** 屏障 | ③④ | `counterexample_any_durable_barrier_failure_leaves_the_effect_at_zero`（G-14）＋ `dangling_effect_written_by_the_real_arm_folds_to_uncertain_and_closes_the_session`（崩在 `effect_started` 与收束之间 ⇒ 派生 `EffectUncertain`） |
| 18 | 无 delete-share 占用保旧文件 | ④ | **不可构造**：delete-share 是 Windows 语义；POSIX 等价面已实测（G-8：旧句柄仍读到完整旧版） |
| 19 | 宽权限 temp 与 fallback mutation 必红 | ④ | `counterexample_temp_permissions_are_narrowed_not_left_to_umask`（G-12，带区分力自证；可复现前提：本机 umask `0o022`） |
| 20 | unsupported FS effect 前拒 | ④ | `unsupported_filesystem_is_a_closed_set_decided_before_any_mutation`（G-13） |
| 21 | replace 后屏障失败只落 uncertain | ④ | `barrier_failures_at_or_after_replace_settle_uncertain`（G-15） |
| 22 | 逐次授权不得自动放行 | ④⑤ | `counterexample_missing_decision_driver_denies_instead_of_approving` ＋ `real_write_host_without_a_decision_driver_denies_and_writes_nothing`（G-18） |
| 23 | `probe` 纯读 | ④ | `counterexample_probe_is_pure_read_and_creates_nothing`（G-19） |
| 24 | `created/overwritten` 走真 capability 查询 | ④ | `disposition_comes_from_a_real_capability_lookup`（G-20） |
| 25 | `ensure_runtime_cwd` 禁 cwd 落 workspace | ④ | `runtime_cwd_never_lands_inside_the_workspace_root`（G-21） |
| 26 | 端到端真落盘 ＋ 四段账 ＋ 物理根不泄漏 | ④ | `real_write_host_lands_bytes_and_settles_the_four_stage_ledger`（G-22） |
| 27 | **内容 hash 必须 Rust 重算** | ④ | `counterexample_content_hash_is_recomputed_before_any_mutation`（G-17） |
| 28 | **`proposalHash` 必须 Rust 重算** | **⑥ 本段** | `counterexample_proposal_hash_is_recomputed_and_binds_every_bound_field` ＋ `proposal_hash_and_content_hash_are_two_different_gates` |
| 29 | **journal `session_started` 记实况** | **⑥ 本段（裁定A）** | `session_started_accepts_exactly_the_two_prompt_and_capability_forms`／`counterexample_prompt_and_capability_sets_are_closed_not_open`／`session_started_records_the_prompt_and_capabilities_actually_in_force` |

**残项恰零**：矩阵 29 行全部有门或有登记；本段新补 3 行（#3／#28／#29），其余 26 行核引④⑤
在册门（逐枚命中校验，未重造）。两枚不可构造项（#10／#18）沿④ 登记体例原样保留，
**不伪装成绿**。

## 六 · 计数与门

- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --lib --offline`：
  **218 passed / 0 failed / 1 ignored**（基线⑤ 211；净增 7＝裁定A 3 ＋ `proposalHash` 2 ＋
  双端 golden 2）。每次 `cargo` 之前 `pgrep -f 'chrome-headless-[s]hell|[p]laywright'` 复核，
  全程 **0**。
- `pnpm --filter @courtwork/pi-lane test`：**469 passed / 15 files**（基线⑤ 463 / 14；
  净增 6＝`write-session-golden.test.ts` 全部）。
- `cargo clippy --offline --all-targets`：**7 warnings，逐条归属 `src/lib.rs`**
  （199/531/1553/1554/1560/1564/1566——与③④⑤ 同一集合），**本单归属 0**，未新增任何 `allow`
  （首轮引入的 `doc_lazy_continuation` 与 `manual_contains` 已就地消除）。
- `rustfmt`：只对 `pi_loop.rs`／`pi_loop_journal.rs` 执行，`--check` 复核 clean。
- `tsc -p packages/pi-lane --noEmit`：clean。`eslint` 新增的 1 份 TS：零输出。
- `build:product-sidecar`：**snapshot `reused-identical`**，bundle 恒为 `534,219 B`／
  `8520026c…`、`reproducible: true`；`route-manifest.json` 逐字节未动。**身份三处零更新**
  （生产 TS 零触碰，见首段）。
- **不跑仓级 pnpm 门与 Playwright**（属⑦）。

## 七 · 禁区遵守与偏离

### 7.1 禁区

- **`uncertain` 压扁勿修**：binder 把 uncertain 压成 `FileError('unknown')` 原样保留，
  `workspace-write-env.ts` 逐字节未动。
- **[需架构拍板]B（`logicalPath` 空串）继续上浮，不自裁**：journal 侧 `read_string`
  （允许空串）与 wire 侧 `read_non_empty_string` 仍不同源。本单改的是 `promptId`／
  `capabilities` 两枚字段的读侧闭集，**没有顺手收紧 `logicalPath`**——那属改既有解码语义。
- **`fold()` 推进臂零触碰**：`fold` 函数体、游标、`turn_finished_follows` 一处未碰
  （裁定A 只动 `write_payload`／`read_session_started` 与 payload 结构体）。
- **不加 edit/diff/CAS/promotion/bash/GUI**；未碰 `package.json`、`Cargo.toml`、lock。
- **wire schema 除裁定A 窄幅外零改**：`pi_loop_protocol.rs` 与④⑤ 逐字节相同
  （`cf3aa9aa…`）；裁定A 只落在 journal codec，wire 上本就没有 `promptId`／`capabilities`。
- **capability 字面量零批量 `sed`**：本单未新增 capability 种子；`EXPECTED_CAPABILITIES`
  一字未动，只是被 `start_inner` **读**去写进 payload。

### 7.2 偏离与待追认

1. **裁定A 修订了 `PI-HOST-LOOP-1` 冻结的 `session_started` payload 契约**（§零）。
   协调裁定在案，本回执单列节记裁定文与理由，**[需架构拍板]A 转「已裁待追认」**。
2. **`PROMPT_ID` 常量退役，换成 `CURRENT_PROMPT_ID`／`LEGACY_PROMPT_ID`／`LEGAL_PROMPT_IDS` 三枚**。
   旧名在仓内零残留（`grep` 复核）。
3. **`proposalHash` 门落在 0.5 位（0.3 认领之后）**。票面只说「Rust 必须重算」，未定位次。
   取此位的理由：`settle_failed` 需要 `plan.tool_call_id`，而 `tool_call_id` 的唯一真源是
   0.3 的认领。副作用如实声明：**hash 不符也会消费掉那一枚 `active_tool_call`**——与
   ④ 的 `probe` 失败路同形（同一枚 tool call 的第二枚 host_request 当场无主）。
4. **③ 期的脚本请求 `write_request_packet` 改带真 `proposalHash`**（`scripted_proposal_hash`）。
   它绑定的是脚本座认得的哨兵 `contentSha256`（PROBE_SHA），不是正文真值——脚本座本就不重算
   内容。同批更新了 `tool_proposed` 断言里的那一枚字面量。
5. **两枚 fixture 落在 `packages/pi-lane/fixtures/`**，与既有 `product-wire-v1.jsonl` 同处；
   Rust 以 `include_bytes!` 跨目录读同一份 tracked blob（沿 `PI-HOST-LOOP-1` H2 先例）。
6. **golden 的两枚环境派生字段按名替换后再比字节**（§2.2 表）。这是**放宽**，逐枚给了
   替代直接断言，不以 golden 兜。
7. **`assistant_text_delta` 的切分不确定性以「换语料」而非「加豁免」解决**（§2.1）。
   实测证据（两轮不同切分）写在本节，不留在聊天里。

### 7.3 移交⑦（开工前必读）

⑦ **只剩全量门与回执总表**，实现面已闭合。三件必须带进⑦：

1. **仓级门次序**：`build:product-sidecar` 先于 `cargo`（本单已实测 `reused-identical`，
   ⑦ 若在别的树上跑仍须先建）；`pnpm -r build`／`pnpm lint`／`pnpm test`；desktop 行为
   未变但 Rust 变了，Playwright 按⑦ 票面判定是否需要。
2. **[需架构拍板] 结余两项**：A 已裁待追认（§零）；**B（`logicalPath` 空串两侧不同源）
   自②→③→④→⑤→⑥ 原样上浮，六单未自裁**。
3. **本单发现、本单不自裁的一项（新）**：**resume 路径没有 prompt/capability 漂移门**。
   旧档（`case-read-v1` ＋ `['case_read']`）今天仍可被 resume，而新 leg 跑的是 `md-work-v1`
   ＋ 两枚能力；`session_resumed` 不记这两样，故那份档的 `session_started` 会继续声称旧值。
   现有漂移门覆盖 grant／model／limits／routeManifest 四项，**不含这两项**。加门＝让既有档
   不可 resume，属改既有档的可用性，超出裁定A 的「读侧扩员＋写侧记实况」，故如实登记上浮，
   **[需架构拍板]D**。
