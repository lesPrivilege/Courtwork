# PI-HOST-LOOP-1R6 · encode-before-effect 与普适不变量

状态：**待 Fable 实现（第六轮返修）**

角色与纪律同原票与 1R…1R5。六件的全部合同、九门、既有闭口与禁止面原样有效；本件新增
结构性裁定一项、装置替换一项，并明确一处**受契约祝福的装置退役**（见 §二 H2——这不是
回退行为担保，是把担保从「文本同步验证」升级为「结构性成立」后拆除失效脚手架）。

拒绝证据：`PI-HOST-LOOP-1R5@a082257`（实现 tip `3f0bc6f`）经独立复验 `9d4013e`
**REJECT**。G1 四道 NUL 门、四类副作用边界、撤门阳性对照全部成立；唯一决定性：
`scan_refusal_branches()` 以 `body.find("return Err(")` 识别拒绝分支——字面 marker 即
隐式 allowlist，unknown 在进入种群之前已被当作不存在。验收把票面 M4 门改写为合法等价
`return Err::<(), HostError>(...)`，扫描/账本/行为反例/整套 pi-loop 全部 FALSE_GREEN。

## 零、结构性裁定（对三层同败的回答）

常量名（1R3）→函数名（1R4）→`return Err(` 字面量（1R5）三层同败，病根同一：**在富语言
里用文本模式枚举语义构造，合法拼写无穷，枚举器的种群谓词永远追不上**。第七个更聪明的
模式不会赢。裁定改道：

**裁定一 · encode-before-effect。** Host 在任何 journal append 与 spawn 之前，先把将要
发出的 exact wire packet **真实编码成 bytes**（bootstrap 于 `start_inner`、prompt 于
`prompt()`）；编码失败即以既有具名 code 拒绝（config 侧 `invalid_config`、prompt 侧沿
既有 code，携 codec 的通用文案、零值回显），成功后**同一份 bytes** 供后续发送（复用或
重编码后 byte-equality 断言）。效果：codec 是唯一校验真源，**每一条今日与未来的 wire
判据自动前置**——需要在「codec 规则」与「前置门」之间同步的账**结构性消失**，扫描器
失业。既有 G1 四道手写门保留在编码之前（它们给出带字段归属的更好文案）；caseRoot 的
shape/lstat 与 `delete_container` 的 SafeToken 等非 wire 判据维持显式前置门。

**裁定二 · 普适不变量替换文本扫描。** 新常驻探针以逐字段违规电池（自 protocol 常量与
判据族派生：NUL/超长/空串/纯空白/非法 token 字符/非法 shape/控制字符/分隔符等，电池
构成入回执）驱动完整 `start`/`prompt` 入口，断言**普适不变量**：`结果为 Err ⇒ 副作用
恰零`（spawn 零、journal 字节零增、内存 records 零增、writes 零、requestId 不占用）。
它不需要知道门在哪里——任何位置、任何拼写的门，只要拒绝了电池内输入而副作用已发生，
即红。验收的 turbofish 形态转为 permanent mutation。

**担保边界（如实声明）**：wire 判据的前置自此结构性成立（∀今日与未来 codec 规则）；
非 wire 判据靠显式门＋清单行为反例；未来若有人在 journal 之后**故意**新增非 wire 拒绝
门且其输入不在电池内，装置不宣称能证——这由违规电池的广度、两相结构的代码形状与独立
验收承担，不再假装文本扫描能证。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r6`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa→
b4175ea→1ab9c03→23f8339→51c823f→51369e4→a0644cd→a204d13→d4163df→5271342→
be0d9ad→3f0bc6f→a082257→9d4013e` 二十二枚；逐枚 patch-id 与源提交相同，冲突即停回
架构。六轮拒绝报告随链入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、三项闭口

### H1 · encode-before-effect（Rust production）

- `start_inner`：secret/root/既有前置门通过后、`session_started` append 与 spawn **之前**，
  用真实 StartConfig 编码 exact bootstrap packet；编码失败→`invalid_config`（携 codec
  通用文案，key/root 值零回显——canary 断言随附）；成功 bytes 存留，spawn 后发送时复用
  （或重编码＋byte-equality 断言，二选一并在回执写明取舍）。
- `prompt()`：requestId/text 既有门后、`user_prompted` append 与发包**之前**编码 exact
  prompt packet；失败→沿既有 prompt 侧 code，requestId 不占用；成功 bytes 同上复用。
- cancel/shutdown 同形（字段本已受验，代价极小，形状统一）。
- 不改 wire/payload 闭集、不改 codec 本身；`scan_string` 等继续原位（现在它天然在
  效果之前运行）。

### H2 · 装置替换（受契约祝福的退役＋新常驻）

- **退役**：`scan_refusal_branches` 轴 A（36 行表）、协议对照面轴 B（90 行表）与
  `bounded_judgment_ledger`（75 行同步账）整体删除——它们验证的同步已被裁定一结构性
  消灭；其死代码留存即双轨第二真源（复杂度节制条）。退役理由与本票坐标写入代码删除处
  的提交信息，不在源码留注释残骸。
- **保留**：D1 手写清单（11 行）与全部行为反例（34 枚）、G1 四道 NUL 门及其常驻、
  1R4 的 SafeToken 七成员清账、四轴 `prompt_axis_probe`——凡行为级证据全数保留。
- **新增**：裁定二的普适不变量探针（违规电池 ≥ 既有 34 枚反例的输入面并集＋每字段
  逐违规类，电池清单入回执）；电池由 protocol 常量派生处直接 import，不另抄值。

### H3 · first-red、mutation 与复扫

- **first-red**（untouched 尖 `9d4013e` 组合后）：① 复验 turbofish 门原形——旧装置四件
  全绿实录（逐值复现验收表）；② 同一 turbofish 门下跑新普适探针的雏形——红（Err 而
  journal 已增）；③ 临时撤一道 G1 手写门（如 modelId NUL）——旧装置下行为反例红在
  `Protocol(InvalidSchema)`（后置），装 encode-early 后同输入转为**前置具名拒绝且零副作
  用**（结构性担保的对照实证，绿形也入回执）。
- **mutation ≥5**：撤 encode-early（编码移回 journal 之后）→探针红；撤 G1 某门＋撤
  encode-early→探针红；turbofish 未登记后置门（permanent 形态）→探针红；发送路径改
  重编码且 bytes 不等→equality 断言红；编码失败映射丢具名 code→具名断言红。逐枚命中
  校验、定向红、byte-identical 恢复；等价如实登记。
- 装置替换后以违规电池对四模块 host 方向面复跑一遍（G3 同义复扫），结果入回执。

## 三、门与卫生

原票九门全量非受限域取数，逐门独立退出码；全部保留的常驻绿；「只收紧」按**行为担保**
衡量（wire 前置从枚举子集升为全称成立），装置退役按 H2 契约条款执行并在回执列明删除的
测试/函数名（此清单是本轮唯一允许的判据名删除，逐名对应 H2 退役条）。生产前缀 SHA 必变
如实报；sealed CJS 零漂移（Node 零触碰）。E2 卫生条款继续：计数摘实跑原始行、真源在
exact target 树内。

## 四、回执与停点

实现提交先于回执提交；本文件只追加回执。停在待独立验收：全新 Codex 会话从独立 clean
worktree 复验（自建 snapshot、turbofish 与电池反例自行实注、退役清单逐名核对 H2 授权）。
未获 PASS 前不 push、不 merge、不更新 `current.md`、不开 `PI-WRITE-HOST-1`。

## 五、实现回执（2026-08-02，待独立验收）

实现 tip `e3118a7`（组合基线 `601ba56`＝main@`4dc8e85` + 二十二枚 patch-id 等同证据链，六轮拒绝报告随链入树）。Fable 终审独立复跑：vitest 448、cargo 164+1 ignored、diff --check 净、退役符号全文零残留、sealed CJS 75eff9b9… 零漂移逐项亲核。**架构追认（偏离·M1 等价）**：票面「撤 encode-early→探针红」写在「codec 存在未前置判据」的假设上；实测 1R3–1R5 D1 已把 codec 今日全部 host 向判据手工前置（104 枚拒绝全出显式门、codec 单独拒 0），encode-early 在今日行为面为设计性纵深冗余，其区分力证据以 M2/M6 成对对照（唯一变量=encode-early 在否）替代——追认该形态为本票 mutation 合同的正解，等价如实登记不计红证。


对象：施工树 `/private/tmp/courtwork-pi-host-loop-1r6`，分支 `codex/pi-host-loop-1r6`，
基线 tip `601ba56`（＝main@`4dc8e85` ＋ 二十二枚证据链）。`packages/pi-lane/ACCEPTANCE.md`
零触碰；`pi_loop_protocol.rs` 零改动；本轮只改 `apps/desktop/src-tauri/src/pi_loop.rs` 一份。
`git status --short` 恰一行 `M apps/desktop/src-tauri/src/pi_loop.rs`；`git diff --stat`
＝ **+894 / −2367**（文件 6,531 → 5,058 行）。未提交、未 push、未合入，`current.md` 未动。

## 一、first-red 账（全部落在 untouched 尖 `601ba56` 上，逐枚还原）

pristine blob SHA-256 `0f3519f2340b667a4385831420bf11c8529ca709f72ec562593cb091e404fca8`
（＝1R5 复验报告登记的恢复值），三件跑完逐字节还原、SHA 复核一致。

### ① turbofish 门原形——旧装置四件全绿（逐值复现验收表）

在 `validate_start_config()` 的 modelId NUL 门之后加入验收报告原文代码块
`return Err::<(), HostError>(HostError::InvalidConfig("modelId 不得含路径分隔符"))`：

| 证据 | 本机实得 | 1R5 复验表 |
|---|---:|---:|
| `host_refusal_branches_are_fail_closed_against_the_source` | 1 passed / 0 failed | 1 passed / 0 failed |
| `bounded_judgment_ledger_matches_the_source_and_covers_every_frozen_bound` | 1 passed / 0 failed | 1 passed / 0 failed |
| `counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn` | 1 passed / 0 failed | 1 passed / 0 failed |
| 完整 `pi_loop::tests` | **34 passed / 0 failed / 1 ignored** | 34 passed / 0 failed / 1 ignored |

四值逐枚一致，FALSE_GREEN 在本机复现。

### ② 普适探针雏形——同一 turbofish 构造，两处落点，两种读数

| 落点 | 新普适探针 | 轴 A | 清账表 | D1 行为反例 |
|---|---|---|---|---|
| 前置（`validate_start_config` 内，即验收原形） | **绿** | 绿 | 绿 | 绿 |
| 后置（journal append 之后、spawn 之前） | **红** | **绿** | **绿** | **绿** |

后置形的红文（原始行）：

```
provider.modelId/含路径分隔符：被拒的一轮在 journal 树里写下了 550 字节（cnt-1/sess-1.jsonl）
```

**如实说明**：验收报告用的前置落点在新探针下是绿的，且这是**设计如此**——普适不变量判的是
「Err ⇒ 副作用恰零」，任何位置、任何拼写的**前置**门都不违反它，无须被枚举。旧三轴对**后置**
的未登记门全部失明（三枚全绿），新探针独红。这正是 §零裁定二要换的区分力方向：不判形状、判结果。

### ③ 临时撤 modelId NUL 手写门——旧装置的后置收场

untouched 尖上撤该门（不含 encode-early）：

| 证据 | 结果 |
|---|---|
| `counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn` | **红**：`provider.modelId/含 NUL：spawn 计数恰 0`，left = 1 |
| 新普适探针 | **红**：`被拒的 start 不得 spawn（实得 Protocol(InvalidSchema)）`，left = 1 |
| `host_refusal_branches_are_fail_closed_against_the_source` | 红（删门对它可见） |
| `bounded_judgment_ledger_...` | **绿**（同函数另一处 `is_nul_free` 顶名——1R5 M5 已登记的盲区） |

**对照绿形（装 encode-early 之后，同一撤门）**——结构性担保实证，逐值实测：

```
code=invalid_config  error=InvalidConfig("配置无法编成 bootstrap packet")
spawns=0  writes=0  journal 字节 0 → 0
journal 树内文件：[("cnt-1/sess-1.jsonl", 0), ("cnt-1/sess-1.jsonl.lock", 0)]
```

同一枚输入从「spawn 之后 `Protocol(InvalidSchema)`、盘上多 550 字节」转为
「**前置具名拒绝** `invalid_config` ＋ 零 spawn ＋ 零出包 ＋ journal 零字节」。绿形不计红证。

## 二、H1 delta（production，`apps/desktop/src-tauri/src/pi_loop.rs`）

| 位置 | 内容 |
|---|---|
| `:38` | import 增 `PacketRejection`（`pi_loop_protocol.rs` **零改动**，可见性无须窄扩） |
| `:306-362` | 新段「编码-先于-效果」：`CONFIG_NOT_ENCODABLE` / `PROMPT_NOT_ENCODABLE` 两枚静态文案、`struct OutboundLine{seq,bytes}`、`fn encode_outbound_line(outbound_seq, session_id, request_id, payload)`、`fn config_codec_refusal` / `fn prompt_codec_refusal` 两枚唯一映射点 |
| `:529-632` | `start_inner` 两相化：fresh/resume 两臂只定 `started`/`leg`/`opening`，`journal.set_leg` 与 `append` 提出到 match 之后 |
| `:585-628` | **编码点**：resume 块与 bootstrap payload 就位后 `encode_outbound_line(0, &config.session_id, None, bootstrap).map_err(config_codec_refusal)?` |
| `:631-632` | 落账：`journal.set_leg(leg)` → `records.push(journal.append(None, None, opening)?)` |
| `:658` | `host.write_encoded(bootstrap_line)?`——发的就是验过的那一份 |
| `:675-690` | `write_encoded`（只搬运，seq 由编码时定下）；`send` 改为「编码→写」两相合成，供 cancel/shutdown 用（这两条路编码与发送之间本无效果） |
| `:798-820` | `prompt` 两相化：既有四门后编码，`user_prompted` 落账与 `write_encoded` 排在其后 |

**取舍：复用（不重编码）。** 理由三条：① 「验过的那一份」与「发出去的那一份」是同一份字节，
是结构性的，不靠一句 compare 的善意——重编码＋比对会留下「比对被删掉」这个新藏身处；
② 成本：bootstrap 与 prompt 各省一次全量编码＋一次 decoder 回灌自检；③ byte-equality 断言
改由常驻测试 `the_bytes_validated_before_the_effect_are_the_bytes_put_on_the_wire` 承担，期望侧
**独立手写** exact packet 重编，与被测路径不同源（M4 定向红见 §五）。

**journal 事件顺序契约未变**：`session_started` / `session_resumed` 仍在全部 preflight 通过之后、
spawn 之前 durable。resume 三值改取**落账前**投影——`pi_loop_journal::fold`（`:2063-2067`）对
`SessionResumed` 只改 `leg`/`leg_open`/`interrupted`，`prior_observed_turns`/`prior_turns`/`prior_usd`
一字不动，与旧写法（落账后再 fold）逐值等价；`limits` 在 fresh 路来自 config、在 resume 路已被
既有 `limits 漂移` 门锁成与 config 相等。

## 三、H2 退役清单（逐名对应 §二 H2 授权条）

整体删除 **2,258 行**（pristine `pi_loop.rs:4274-6531`）。删除的测试三枚：

| 测试名 | H2 授权条 |
|---|---|
| `host_refusal_branches_are_fail_closed_against_the_source` | 「退役：`scan_refusal_branches` 轴 A（36 行表）」 |
| `wire_judgment_ledger_covers_every_named_protocol_rejection` | 「退役：协议对照面轴 B（90 行表）」 |
| `bounded_judgment_ledger_matches_the_source_and_covers_every_frozen_bound` | 「退役：`bounded_judgment_ledger`（75 行同步账）」 |

随之删除的函数／类型／常量（全部只被上述三枚消费，无保留面引用）：

- 轴 A：`scan_refusal_branches`、`host_refusal_branches`、`struct RefusalBranch`、`enum BranchDisposition`、`const HOST_REFUSAL_CODES`
- 轴 B：`scan_wire_rejections`、`wire_judgment_ledger`、`struct WireJudgment`、`enum WireDisposition`、`const WIRE_REJECTION_MARKERS`、`const WIRE_REJECTION_LITERAL_SITES`
- 清账表：`bounded_judgment_ledger`、`struct BoundedJudgmentUse`、`enum Consumption`、`bounded_constants_in`、`declared_string_predicates`、`bounded_predicates_in`、`scan_bounded_judgment_uses`、`declared_bounded_constants`、`const DECLARED_STRING_PREDICATES`、`const TRIM_JUDGMENT`、`const NON_EMPTY_JUDGMENT`
- 三轴共用扫描器底座：`scanned_modules`、`production_section`、`function_name`、`attributed_production_lines`、`normalize_ws`、`strip_trailing_comment`、`is_branch_head`、`balanced_from`、`last_string_literal`
- 跨轴共用：`const HOST_PREFLIGHT_FAMILY`

**保留面逐字节自证**：pristine `mod tests {` 起至退役块起点共 3,129 行，在现行文件里**逐字节保留**
（分两段核对：pristine 1145–4113 共 2,969 行、4114–4273 共 160 行，两段均原样出现）。因此
D1 手写清单 11 行、34 枚行为反例、G1 四道 NUL 门常驻、SafeToken 七成员清账、四轴
`prompt_axis_probe` 全部未被触碰。`#[test]` 计数 35 → 35（退役 3、新增 3）。

## 四、新装置（H2 新增）

### 4.1 普适不变量探针 `universal_invariant_refused_host_input_leaves_zero_side_effects`（`:4616`）

断言一条：**Err ⇒ 副作用恰零**——start 侧 `spawn == 0`、出包 `== 0`、journal 字节零增；
prompt 侧 journal 字节零增、内存 `records` 零增、出包零增、`requestId` 不占用。另附
**零回显 canary**（apiKey、物理案件根、被变异的入参值三者一个字节都不许进错误）。

**电池构成（142 枚 = 10 字段 × 违规类）**：

- 字符串违规类闭集 16 枚（`string_violations`，`:4296`）：空串／纯空白／含 NUL／含 C0 控制字符／
  含 DEL／含 LF 分隔符／含 CR／含 TAB／含双引号／含反斜杠／含 U+2028／含路径分隔符／含空格／
  首字符非字母数字／lone-surrogate 转义文本／**超上界 +1 字节**
- 上界一律由 protocol 常量 import 派生：`MAX_MODEL_ID_BYTES`、`MAX_CASE_ROOT_BYTES`、
  `MAX_API_KEY_BYTES`、`MAX_TEXT_BYTES`、`MAX_TURNS_LIMIT`、`MAX_USD_LIMIT`；测试里**没有**第二份数字
- SafeToken 上界没有 `MAX_*` 可 import，由 `safe_token_limit()`（`:4284`）**问判据函数本人**逐长探出

| 字段 | 枚数 | 驱动 | 拒 / 放行 |
|---|---:|---|---:|
| `containerId` | 16 | 完整 `start` | 16 / 0 |
| `sessionId` | 16 | 完整 `start` | 16 / 0 |
| `grantId` | 16 | 完整 `start` | 16 / 0 |
| `provider.modelId` | 16 | 完整 `start` | 4 / 12 |
| `caseRoot` | 19（16 枚挂合法绝对前缀 ＋ 3 枚 shape 违规） | 完整 `start` | 18 / 1 |
| `provider.apiKey` | 16 | 注入 `CredentialPort` → 完整 `start` | 4 / 12 |
| `limits.maxTurns` | 3（0 / 上界+1 / `u64::MAX`） | 完整 `start` | 3 / 0 |
| `limits.maxUsd` | 8（0 / 负 / NaN / ±inf / 上界+1 / 上界×1e6 / 次正规最小正数） | 完整 `start` | 7 / 1 |
| `prompt.text` | 16 | 已起 leg 后完整 `prompt` | 4 / 12 |
| `prompt.requestId` | 16 | 已起 leg 后完整 `prompt` | 16 / 0 |
| **合计** | **142** | | **104 / 38** |

**靶未打空守卫（四道）**：① 电池 ≥ 100 枚；② 覆盖字段 ≥ 10 枚；③ 全电池拒绝数 ≥ 100；
④ 每一枚字段至少有一类违规真被拒。承在案判例「静默零＝空枚举与全通过同形，枚举为空一律硬失败」
——把电池删空、把字段删剩几枚、把拒绝全变放行，三种动作在没有这四道断言时都是一片绿。
守卫本身经两枚自检有齿：把 start 族「被拒」计数打成恒零 → 红文
`caseRoot：整族违规一枚都没被拒，本族断言恒真`；把 `prompt.text` 一族删空 → 红文
`电池只覆盖 9 枚字段：host 方向输入面塌缩`。

**对照**：闭集内输入照常起 leg（spawn = 1）、照常问得出一句、出包恰 2。

### 4.2 `the_bytes_validated_before_the_effect_are_the_bytes_put_on_the_wire`（`:4814`）

期望侧手写字面量独立重编 exact bootstrap（seq 1）与 exact prompt（seq 2），与真正写进 leg 的两行
逐字节比对。

### 4.3 `a_codec_refusal_surfaces_as_a_named_refusal_without_echoing_the_input`（`:4741`）

直接驱动 `encode_outbound_line` 造出真 codec 拒绝（含 NUL 的 modelId / prompt 正文），
过两枚映射点，断言 ① code 为 `invalid_config` / `invalid_prompt`（不退化成通用 `protocol`），
② 渲染出的错误不含 apiKey canary、不含物理案件根 canary。**前提校验随附**：先断言 codec 自己的
`reason` 非空——否则「不回显」这一条恒真。

## 五、H3 mutation 账（逐枚命中校验、逐枚 byte-identical 恢复；恢复基线 SHA `084cadc6…`）

| # | 变异 | 命中 | 结果 | 红在哪 |
|---|---|---|---|---|
| M1 | 撤 encode-early（start ＋ prompt 双入口，编码移回落账／spawn 之后） | 1+1 | **34 passed / 0 failed ⇒ 等价** | — |
| M2 | 撤 `modelId` NUL 门 ＋ 撤 encode-early | 3 | **红** | 探针：`provider.modelId/含 NUL：被拒的 start 不得 spawn（实得 InvalidConfig("配置无法编成 bootstrap packet")）`，left = 1 |
| M2-对照 | 只撤 `modelId` NUL 门（留 encode-early） | 1 | **绿** | — |
| M3 | turbofish **未登记后置门**（permanent 形态，`return Err::<PiLoopHost, HostError>(…)` 落在 append 之后） | 1 | **红（定向：33 绿 / 1 红）** | 探针：`provider.modelId/含路径分隔符：被拒的一轮在 journal 树里写下了 550 字节` |
| M4 | 发送路径改重编码且 bytes 不等（`prompt` 改走 `send` 并重编 `format!("{text} ")`） | 1 | **红（定向：33 绿 / 1 红）** | `the_bytes_validated_...`：`prompt 出线字节须与效果之前验过的那一份逐字节相同` |
| M5 | 编码失败映射丢具名 code（`config_codec_refusal` 返回 `Protocol(rejection.code)`） | 1 | **红（定向：33 绿 / 1 红）** | `a_codec_refusal_surfaces_...`：code 断言 |
| M6 | 撤 `prompt` NUL 门 ＋ 撤 prompt 侧 encode-early | 2 | **红** | 探针：`prompt.text/含 NUL：既有 journal 文件 cnt-1/sess-1.jsonl 被改写` |
| M6-对照 | 只撤 `prompt` NUL 门（留 encode-early） | 1 | **绿** | — |
| GUARD-1 | 把 start 族「被拒」计数打成恒零 | 1 | **红** | 靶未打空守卫：`caseRoot：整族违规一枚都没被拒` |
| GUARD-2 | 把 `prompt.text` 一族删空（`.take(0)`） | 1 | **红** | 塌缩守卫：`电池只覆盖 9 枚字段：host 方向输入面塌缩` |

**M1 等价，如实登记（本轮最有信息量的一枚）。** 撤掉 encode-early 而不动任何 G1 门，整套 34 枚
全绿。原因经实测坐实：**今日 142 枚电池里，被拒的 104 枚全部由 `pi_loop.rs` 的显式前置门拒**
（`invalid_ref` 64 / `invalid_config` 23 / `case_root` 13 / `invalid_prompt` 4），
**codec 单独拒绝的枚数为 0**——1R3–1R5 的 D1 已经把 codec 今日施加在 host 方向输入上的每一条
wire 判据都手工前置完了。因此 encode-before-effect 的价值**不是**补今日的洞，而是：
① 把这条担保从「每轮手工同步、扫描器盯梢」变成结构性成立（∀ 未来 codec 规则）；
② 让同步账消失，扫描器失业。M2／M6 两组对照实验（同一撤门，唯一差别是 encode-early 在不在）
把 encode-early 的贡献隔离得一清二楚：**留则绿、撤则红**。

## 六、G3 同义复扫（以违规电池对四模块 host 方向面复跑）

装置替换后文本扫描面已按 H2 退役，复扫改以**行为归属**实施：逐枚电池行记录实际拒绝 code，
按 code → 模块归属汇总。104 枚拒绝的归属：

| 模块 | 拒绝枚数 | 明细 |
|---|---:|---|
| `pi_loop.rs`（host 前置面） | **104** | `invalid_ref` 64（containerId 16 / sessionId 16 / grantId 16 / prompt.requestId 16）、`invalid_config` 23（caseRoot 5 / modelId 4 / apiKey 4 / maxTurns 3 / maxUsd 7）、`case_root` 13、`invalid_prompt` 4 |
| `pi_loop_protocol.rs`（codec） | 0 | 今日无一枚 host 输入走到编码才被拒（＝M1 等价的同一事实） |
| `pi_loop_journal.rs` | 0 | 电池无一枚走到 journal 判据 |
| `pi_loop_process.rs` | 0 | 电池无一枚走到 spawn／route 判据 |

## 七、九门（非受限域、逐门独立 exit、串行；退出码先落文件再读）

九门在**装上塌缩守卫之后重跑了一遍**（承在案判例「门跑过之后又编辑就必须重跑，提交前最后一个
动作是跑门」）；下表是重跑读数，源码自此零编辑，blob SHA-256
`59ec768de49fd75533716c179f77f8cf3f2feecf18e0ee13a5c81ae2ecd11655`。

| 门 | 命令 | 读数 | exit |
|---|---|---|---|
| 1a | `pnpm --filter @courtwork/pi-lane test` | 14 files / 448 tests | 0 |
| 1b | `pnpm --filter @courtwork/pi-lane test:product-sidecar` | 10/10；bundle **523,235 B**、sha256 `75eff9b9…65399b`，两次现编 byte-identical | 0 |
| 1c | `node --test scripts/assert-isolation-binding.test.mjs` | 43/43 | 0 |
| 1d | `pnpm --filter @courtwork/pi-lane test:verified-node-gate` | 8/8 | 0 |
| 2a | `cargo test` | **164 passed / 0 failed / 1 ignored**（＝基线 164；退役 3 ＋ 新增 3） | 0 |
| 2b | `cargo test --lib -- --ignored` | 1 passed（快照 E2E，15.94 s） | 0 |
| 2c | `rustfmt --check` 四模块（逐模块独立跑） | 四枚全零命中 | 0 / 0 / 0 / 0 |
| 2d | `cargo clippy --all-targets -- -D warnings` | 7 处，**全落 `src/lib.rs`**（5 枚 unnecessary unsafe ＋ 2 枚 unneeded return）；本票四模块零命中 | 101（既有基线，同 1R4／1R5） |
| 3 | verified Node ＋ production sealed CJS | 10 PASS | 0 |
| 4 | verified Node ＋ scripted control CJS | 14 PASS | 0 |
| 5 | `pnpm -r build` | 全包通过 | 0 |
| 6 | `pnpm lint` | 零命中 | 0 |
| 7 | `pnpm test` | 166 files / 1,771 tests | 0 |
| 8 | `pnpm --filter @courtwork/desktop lint:isolation-binding` | 等级 `none`；扫 10 份宿主源码、30 份 pi lane 源码 | 0 |
| 9 | `git diff --check` | 零命中 | 0 |

**生产前缀 SHA（如实报新值）**：`pi_loop.rs` 生产段（`#[cfg(test)]\nmod tests` 之前）由
50,780 B / `67bcfa26238d218fc0cf3f0ea5ec209a2ce887f7a8f7b0650170b33aeea5dfde` 变为
**55,787 B / `c6cc789aa4ce2f579a190fd5f108d3b6d92297d1b9bd2df19f1b8df95ddc82ea`**。本轮触碰 Rust
production，SHA 必变。

**sealed CJS 零漂移**：523,235 B / `75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`，
与 1R4／1R5 独立复验自建快照逐字节相同（Node 侧零触碰）。

**「只收紧」按行为担保衡量**：G1 四道 NUL 门原位保留；D1 清单 11 行 / 34 枚行为反例逐字节保留；
SafeToken 七成员清账、四轴 `prompt_axis_probe` 逐字节保留；新增 142 枚电池的普适不变量常驻。
唯一的判据名删除是 §三 退役清单，逐名对应 H2 授权条。全仓门读数与 1R5 持平（1a 448、
2a 164、7 1,771、8 `none`）。

## 八、偏离登记

1. **新增两枚 production 映射函数 `config_codec_refusal` / `prompt_codec_refusal`（`:357`/`:361`）**。
   票面写的是「编码失败→具名 code ＋ codec 通用文案」，未逐字授权新增函数。取具名函数而非内联
   闭包，理由：① 唯一映射点，两处编码失败出口不会各走各的；② 让「具名 code」与「零回显」两条
   担保**可达且可红**——绿构建里 codec 拒绝路径不可达（见 §五 M1 说明），不做成函数就无法在
   常驻测试里驱动它，M5 与 canary 断言也就无处落脚。承 1R5 偏离 1（`is_nul_free`）先例。
   未新增 code、未改 wire/payload 闭集。
2. **新增两枚 production 常量 `CONFIG_NOT_ENCODABLE` / `PROMPT_NOT_ENCODABLE`（`:311`/`:312`）**。
   `&'static str` 由类型层面保证零回显。理由同上。
3. **新增第三枚常驻测试 `a_codec_refusal_surfaces_as_a_named_refusal_without_echoing_the_input`**。
   票面 H2「新增」只点名普适探针一枚。理由同偏离 1；票面 H1 另要求「canary 断言随附」，这一枚
   就是它的落点。
4. **`start_inner` 把 `journal.set_leg` ＋ `append` 从两条 match 臂内提出到 match 之后**（新增局部
   变量 `opening`）。这是 encode-early 的结构前提。journal 事件顺序契约未变；resume 三值改取落账
   前投影，等价理由见 §二。
5. **编码点落在 `load_session` 之后、append 之前**，而非 `load_session` 之前。理由：exact bootstrap
   的 resume 块必须由 journal fold 得出，放在 load 之前就只能编一枚「非 exact」的探针包——那正是
   第二份真源，与本轮裁定相悖。代价如实登记：编码失败时 app-data 下会留下 `load_session` 建的
   **零字节** journal 与 lock（实测 `[("cnt-1/sess-1.jsonl", 0), ("cnt-1/sess-1.jsonl.lock", 0)]`）。
   普适探针按票面口径判「journal **字节**零增」，此形通过；D1 既有 34 枚反例更严的
   `!journal_tree_exists` 口径未改也未放宽，且照绿——它们全部由 load 之前的 D1 门拒。
6. **`send` 的 seq 推进时机从「编码前」改为「编码成功后」**。编码失败时 `outbound_seq` 不再空转 +1。
   绿路不可观测（cancel/shutdown 今日的编码不会失败），如实登记。
7. **`pi_loop_protocol.rs` 零改动**。票面允许「编码入口按需窄扩可见性（沿 1R3 先例）」——本轮
   不需要：`encode_packet_line`、`PacketRejection` 及其字段本就是 `pub(crate)`，import 即可。
8. **电池的 SafeToken 上界由判据函数探出，而非 import 常量**。该判据是函数型、没有 `MAX_*` 可 import；
   逐长探测比在测试里抄一份 `128` 更抗漂移（1R3/1R4 正是栽在「两谱各抄一份」）。
9. **G3 同义复扫改以行为归属实施**（拒绝 code → 模块），不再做源码文本复扫——文本扫描面本轮已按
   H2 退役，再做一次就是把刚拆掉的脚手架又搭回来。
10. **M1 实测等价，非红**。票面把它列为应红项。如实登记并给出坐实原因与两组对照实验（§五）。

## 九、`[需架构拍板]`

**`docs/architecture/implementation-readiness.md:389` 的 `PI-WRITE-HOST-1` 行指向已退役的装置。**
该行登记的 5 枚 `host_result` 前向债（`read_host_result_payload`×3、`read_list_entry`、
`read_logical_path`）本身完好、不受本轮影响；但同一行的偿还方式写的是「扩 1R3 的手写清单与
**源码扫描双向自证**（新增有界成员不入清单即红）」，而这套源码扫描（轴 A／轴 B／清账表）已按
本票 H2 整体退役。WRITE-HOST 开工时的偿还形态需要改写为新装置口径（例如：新增 `host_result`
出包后，把它的字段并入违规电池并驱动完整出包入口）。本轮不越层改该文档，挂请架构裁定。

## 十、停点

停在待独立验收：未提交、未 push、未合入，`ACCEPTANCE.md` 与 `current.md` 零触碰，
`PI-WRITE-HOST-1` 未开工，GUI/DMG/Pages 未启动。`git status --short` 恰一行
`M apps/desktop/src-tauri/src/pi_loop.rs`。
