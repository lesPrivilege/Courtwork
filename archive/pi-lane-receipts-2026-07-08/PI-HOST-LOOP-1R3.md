# PI-HOST-LOOP-1R3 · 按族闭口与覆盖自证

状态：**待 Fable 实现（第三轮返修）**

角色与纪律同原票 `PI-HOST-LOOP-1.md`、`PI-HOST-LOOP-1R.md`、`PI-HOST-LOOP-1R2.md`：
Fable 实现、Sonnet 只读跑腿、完成后交全新 Codex 会话独立验收。三件的全部合同条款、文件
白名单、九门、十一项＋四项闭口与禁止面**原样有效**；本件只新增闭口，不回退任何既有门。

拒绝证据：`PI-HOST-LOOP-1R2@1ab9c03`（实现 tip `b4175ea`）经独立复验 `23f8339`
**REJECT**（报告见其 `packages/pi-lane/ACCEPTANCE.md`「PI-HOST-LOOP-1R2 独立复验
（2026-08-02，拒绝）」节）。1R2 四枚原形已全部转常驻绿，六项登记偏离逐项获追认；两枚
blocker 均落在**同一批判据的未点名同族成员**上。

## 零、本轮方法订正（架构自陈）

前两轮返修按验收报告点名的实例逐条闭口，于是每轮都由下一位验收者找到同族的另一个实例：

- C2 补了 `maxTurns/maxUsd/modelId` 三项上界——因为那是 1R 报告点的三项；而 ADR-022
  同批冻结的 `caseRoot ≤4096`、`apiKey ≤8192` 从未有人管，1R2 复验一试即中。
- C4 冻了 `routeId/nodeVersion/useCodeCache/targets`——因为那是 1R 报告点的字段；而
  `bundle.bytes/sha256` 被显式注释成「构建产出不冻结」，于是 resolver 拿被判 manifest
  的自报值当期望，正中在案判例「被测物不得给自己出考卷」（2026-07-20，源
  FILE-PREVIEW-1）。

**结论：验收报告点名的是样本，不是清单。** 本轮起，闭口的完成态是「该判据辖下的闭集
被穷举覆盖，且覆盖本身有机器自证」，不是「报告里那几项已修」。D1/D2 按族收紧，D3 对本票
冻结面做一次穷举清账，把「下一轮再找到一个兄弟」这条路堵死。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r3`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa→
b4175ea→1ab9c03→23f8339` 十二枚；逐枚 patch-id 与源提交相同，冲突即停回架构。三枚拒绝
报告随链入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、三项闭口

### D1 · 有界输入闭集全部前置于 journal/spawn/effect（Rust）

复验红证：`apiKey = 'k'×8193` 实得 `spawns=1, journal_exists=true` 后才由 packet encoder
报 `Protocol(InvalidSchema)`；4097-byte `caseRoot` 的 `validate_start_config()` 返回
`Ok(())`，最终以 `CaseRoot("案件根不可 lstat")` 收——**拿文件系统外观代替配置门**。

收紧（族级）：凡进入 host→sidecar 方向、且在 `pi_loop_protocol` 有冻结上界或非空要求的
输入，一律在 **journal append 与 spawn 之前**以具名 `invalid_config`（既有 code 闭集内）
拒绝，零副作用；encoder 的同名检查降为纵深防御的**最后一道**，不得是第一道。已知闭集
（值一律 import 常量，禁另抄）：

| 输入 | 冻结判据 | 现状 |
|---|---|---|
| `maxTurns` | `1..=MAX_TURNS_LIMIT` | 1R2 已前置 |
| `maxUsd` | `null` 或 `(0, MAX_USD_LIMIT]` 有限数 | 1R2 已前置 |
| `modelId` | 非空且原串 `≤MAX_MODEL_ID_BYTES` | 1R2 已前置 |
| `caseRoot` | 非空且 `≤MAX_CASE_ROOT_BYTES`，**长度门先于 lstat** | **缺** |
| `apiKey` | credential 解析后、journal/spawn 前，非空且 `≤MAX_API_KEY_BYTES` | **缺** |
| `containerId`/`sessionId`/`grantId` | SafeToken 语法与既有上界 | 实现须自证前置或补门 |
| prompt `text` | `≤MAX_TEXT_BYTES`，须先于 durable `user_prompted` 与发包 | 实现须自证前置或补门 |

**覆盖自证（机器，双向）**：一枚常驻测试持**手写冻结清单**（输入名 → 常量名 → 具名
拒绝 code），并双向核对——① 清单每项都有 pre-journal/pre-spawn 红例，每例双轴断言
（具名外观＋`spawns=0 && journal_absent`）；② 以源码扫描（体例可参照既有
isolation-binding scanner）证明 encoder 的 host→sidecar 分支所消费的每一枚有界常量都
出现在清单内——**在 encoder 新增一道上界而不补前置项即红**。期望侧必须是手写字面量，
不得从被测结构或 encoder 派生（承「被测物不得给自己出考卷」）。

### D2 · gate 判据的 expected side 一律独立于被判物（Node 门装置）

复验红证：合成 layout 里把 sealed CJS 换成 29-byte 实物、同时把该 layout manifest 的
`bundle.bytes/sha256` 同步改成新值，production resolver **exit 0，FALSE_GREEN**。成因是
`FROZEN_ROUTE.bundle` 只含 `resourceRelativePath`（`:60-66`），`assertManifestFrozen()`
只比 path（`:147-163`），resolver 再把实物与**同一份被判 manifest** 比（`:230-235`）。

收紧（族级）：

1. **唯一 expected side 是 tracked manifest**——按 repo 路径读取
   `apps/desktop/src-tauri/pi-sidecar/route-manifest.json`，与 Rust `include_bytes!`
   同源锚（§二.4 已冻结「不得从 runtime/CJS 实物重算一份 manifest 后把自报值当
   expected」，本条把该规则补到 Node 门）。
2. **layout 内 manifest 只是被判物**——若被测 layout 携带 manifest，须先与 tracked
   bytes **byte-identical** 才允许 closed-decode（镜像 Rust 侧「resource 必须先与编译
   bytes 逐字节相同」的次序），不得作为期望来源。
3. **实物逐值比对锚回 tracked**——sealed CJS 与两枚 runtime 的 bytes+SHA 一律与 tracked
   manifest 的对应值比；`FROZEN_ROUTE` 继续冻不随构建变的字段。`:145` 那条
   「`bundle.bytes/sha256` 不冻结故不比」的注释按本裁定改写。
4. **覆盖自证**：gate 比较的每一类值（bundle／runtime×2／manifest 字段）各有一枚
   **同步漂移**反例（实物与 layout manifest 同改）必红；另有一枚清单核对，逐条指名每个
   expected 值的独立锚点（tracked manifest 或 `FROZEN_ROUTE` 常量），出现第三类来源
   （从被判物自取）即红。

### D3 · 冻结面穷举清账（本票范围内一次性）

对本票冻结面做一次穷举清点并把结果写入回执，不留「下一轮再发现一个兄弟」的空间：

1. **有界输入清账**：`pi_loop_protocol` 全部 `MAX_*` 常量逐枚登记——消费点、方向
   （host→sidecar／sidecar→host／journal／内部）、是否属 D1 前置闭集；不属者写明
   理由（如只辖入站解码、或本票不生成该 payload）。
2. **expected-side 清账**：本票全部判据（Rust preflight／编译期真值表／Node gate／
   跨侧门／builder 冻结表）逐条登记其期望来源，标明是「独立锚点」还是「与被判物同源」；
   同源者当场补门或显式登记为不适用并说明理由。
3. 清账表随回执交付；**不得以「已跑门全绿」代替清点**，也不得静默截断（承「no silent
   caps」：若某项本轮不处理，须显式登记原因，不得省略行）。

## 三、first-red、mutation 与门

- **first-red**：两枚复验反例在 untouched 链尖（`23f8339` 组合后、未改 production）以
  production-used 路径先红；D1 的清单自证与 D2 的同步漂移各自另有先红。
- **mutation**：每闭口 ≥2 枚有效 production mutation，其中 D1 须含「encoder 加新上界而
  不补清单」一枚、D2 须含「expected 改回从被判 manifest 自取」一枚；逐枚验证命中、
  定向红、byte-identical 恢复；结构性等价如实登记不计红证（承 1R2 M3 判例：冗余判据的
  变异必等价，零红是覆盖缺口信号而非实现多余）。
- **门**：原票九门全量非受限域取数，逐门独立退出码；十一项＋四项常驻、R1–R8 与全部既有
  反例保持绿；只收紧不回退（旧判据名删除数为 0 的机器自证随回执）。sealed CJS 身份若因
  production 改动漂移，按 1R Stage-2 仪式在同一提交内同步三处钉死值并复绿留证。

## 四、回执与停点

实现提交先于回执提交；本文件实现完成后只追加回执，不改前述合同。停在待独立验收：由全新
Codex 会话从独立 clean worktree 复验（自建 snapshot、不消费实现者 ignored 产物、两类
blocker 原形与 D3 清账表逐项自行核）。未获 PASS 前不 push、不 merge、不更新 `current.md`、
不开 `PI-WRITE-HOST-1`、不启动 GUI/DMG/Pages。

## 五、实现回执（2026-08-02，待独立验收）

实现 tip `51c823f`（组合基线 `5396ad8`＝main@`7992b3a` + 十二枚 patch-id 等同证据链，三枚拒绝报告随链入树）。以下为回执正文，Fable 终审已独立复跑 vitest 448、cargo 161+1 ignored、gate 8/8、builder 10/10、isolation passed、diff-check 净、fmt 56 hunk 全落五枚既有文件（本票四模块零命中）。


状态：**实现完成，未提交、未 push，停在待独立验收。**
施工树 `/private/tmp/courtwork-pi-host-loop-1r3`，分支 `codex/pi-host-loop-1r3`，
基线 tip `5396ad8`（main@`7992b3a` + 十二枚证据链）。`packages/pi-lane/ACCEPTANCE.md` 零触碰。

## 一、first-red 账

| # | 闭口 | 反例 | 跑法（未改 production 时） | 实得 |
|---|---|---|---|---|
| 1 | D1 | `caseRoot` 空串 / 4097 字节 | `cargo test --lib -- pi_loop::tests::counterexample_every_bounded` | `case_root("案件根不可 lstat")` ≠ `invalid_config`——拿文件系统外观代替配置门 |
| 2 | D1 | `apiKey` 空串 / 8193 字节 | 同上（补完 caseRoot 后的下一枚红） | `spawns == 1`（副作用轴先红），journal 已落 |
| 3 | D1 | 清账表与源码双向锁 | `cargo test --lib -- pi_loop::tests::bounded_constant_ledger` | 扫描面缺 `(pi_loop.rs, validate_api_key, MAX_API_KEY_BYTES)` 与 `(pi_loop.rs, validate_start_config, MAX_CASE_ROOT_BYTES)` 两行 |
| 4 | D2 | 合成 layout：sealed CJS 换 29 B 实物 + layout manifest 的 `bundle.bytes/sha256` 同步改 | scratchpad `d2-first-red-probe.mjs` 调 production `resolveVerifiedRoute` | **FALSE_GREEN，exit 0**，返回 `bundleSha=00d6765c…`（伪造物自己的 SHA） |

原始输出：`03-d1-first-red-caseroot.log`、`04-d1-first-red-apikey.log`、`06-d2-first-red-probe.log`。
第 4 枚的探针是临时件，只活在 scratchpad，未入库。

## 二、实现 delta

### D1（Rust）

| 落点 | 内容 |
|---|---|
| `pi_loop_protocol.rs:1159` | `is_absolute_path_shape` 由私有改 `pub(crate)`——host 前置门 import 同一枚形状判据，不另抄一份 |
| `pi_loop.rs:36-41` | import 增 `is_absolute_path_shape`、`MAX_API_KEY_BYTES`、`MAX_CASE_ROOT_BYTES` |
| `pi_loop.rs:247-258` | `validate_start_config()` 增 caseRoot 三门：非空、`≤MAX_CASE_ROOT_BYTES`、绝对形状。判的是 `to_string_lossy()`，与 bootstrap 出包同一串；**全在 lstat 之前**（第 0 步，纯入参零 I/O） |
| `pi_loop.rs:262-278` | 新增 `validate_api_key()`：`trim` 非空 + `≤MAX_API_KEY_BYTES`，只带 `&'static str`，key 不进 reason |
| `pi_loop.rs:424` | `validate_api_key(&api_key)?` 紧接 `credentials.resolve()`，仍在 `load_session`（journal）与 `spawner.spawn()` 之前 |
| `pi_loop.rs:343-347, 421-423` | `start_inner` 全序 doc 同步订正 |

覆盖自证（常驻）：
- `pi_loop.rs:3745` `bounded_input_manifest()`：9 行手写清单（输入 → 判据名 → 拒绝 code），
  共 26 枚反例；`pi_loop.rs:3870` 逐行驱动，双轴断言
  （Config/Credential 轴＝`spawns==0` 且 app-data 下**没有 journal 树**；Prompt 轴＝盘上 bytes 逐字节不变 + 内存账本不增），末尾三枚正向对照。
- `pi_loop.rs:4396` `bounded_constant_ledger_matches_the_source_and_covers_every_frozen_bound`：
  扫 `pi_loop{,_journal,_process,_protocol}.rs` **生产段**（认 `#[cfg(test)] mod` 边界）的
  `(模块, 函数, MAX_*)` 去重对，与 39 行手写清账表 `assert_eq`；再核
  ① 15 枚声明常量逐枚有登记消费点、② 每条 `Fronted` 行都能在手写清单里找到同名判据、
  且在 `pi_loop.rs` 生产段真有前置消费点、③ 清单的拒绝 code 只允许三枚具名值。

### D2（Node 门装置）

| 落点 | 内容 |
|---|---|
| `verified-node-gate.mjs:146-152` | `:145` 旧注释「`bundle.bytes/sha256` 不冻结故不比」按新裁定改写，写明病灶与锚点裁定 |
| `verified-node-gate.mjs:154` | `assertManifestFrozen` 导出，供 manifest 逐字段反例单独驱动 |
| `verified-node-gate.mjs:207` | 新 `readTrackedRoute()`：**唯一 expected side**，按 repo 路径读 tracked manifest 原始 bytes → closed decode → 逐值核 `FROZEN_ROUTE`，返回 `{bytes, manifest, byTriple}` |
| `verified-node-gate.mjs:234` | 新 `ARTIFACT_CHECKS`：7 行逐值比对表，每行显式声明锚点（`tracked` / `frozen`），`expected` 一律写成以锚点为根的单条属性路径 |
| `verified-node-gate.mjs:287-297` | `resolveVerifiedRoute` 参数改为 `{snapshotDir, layoutManifestFile, triple}`——**期望侧不再可注入**（`manifestFile`/`frozen` 两枚旧接缝取消）；layout 自带 manifest 须先与 tracked bytes `Buffer.equals` 才算数 |
| `verified-node-gate.mjs:308-333` | **两枚** runtime 与 sealed CJS 一律 bytes+SHA 双核，逐值走 `ARTIFACT_CHECKS`，锚回 tracked |

覆盖自证（常驻，`verified-node-gate.test.mjs` 8/8）：
- `:148` 对照——合成 layout（三件实物 CoW 克隆自真快照、manifest 复制 tracked 原件）必须通过，携带/不携带 layout manifest 两形态都过；
- `:157/:172` 注入一/二（runtime 尾字节 XOR、symlink）保留并收紧为**指名落点**断言；
- `:185` 注入三——16 枚 manifest 冻结字段删改逐枚红，仍由 `readTrackedRoute` 直接驱动，字段级牙口未退；
- `:242` 注入四——**同步漂移**四类（sealed CJS / runtime×2 / manifest 冻结字段），实物与 layout manifest 同改，必红且必须红在「layout manifest 与 tracked manifest 不是逐字节相同」这条上；
- `:287` 注入五——实物**单独**漂移六类（bundle bytes/sha、runtime×2 各 bytes/sha），必红且落点必须恰是该类值自己那一条，证明每一枚比较各自有牙；
- `:313` 清单核对——`[label, anchor]` 与手写字面量 `deepEqual`；每个 `expected` 的源码须匹配
  `/^\((tracked|frozen)\) => \1(\.\w+|\['…'\])+$/` 且与自称锚点一致；`assertManifestFrozen`
  的 9 次 `frozenEqual` 期望位只允许 `frozen.*|expected.*`、被判位只允许 `manifest.*|row.*`。

## 三、D3 清账表

### 表① 有界输入清账（39 行，机器锁死）

完整表见 `12-d3-table1.md`；真源是 `pi_loop.rs:4010 bounded_constant_ledger()`，
由 `bounded_constant_ledger_matches_the_source_and_covers_every_frozen_bound` 与源码扫描双向核对。
`pi_loop_protocol` 声明的 15 枚 `MAX_*` 全部有登记消费点，无一省略。
归属分布：**前置闭集 11 行**（`pi_loop.rs` 6 + `read_bootstrap_payload` 4 + `read_prompt_payload` 1）；
非前置 28 行，逐行写明理由，其中 5 行（`read_host_result_payload`×3、`read_list_entry`、
`read_logical_path` 的出站面）显式标注「本票 ready capability 恰 `['case_read']`，宿主一枚
`host_result` 都不生成；**PI-WRITE-HOST-1 开工时须连同前置门一并补**」。

### 表② expected-side 清账

| # | 判据 | 被判物 | 期望来源 | 独立锚点？ |
|---|---|---|---|---|
| 1 | `preflight_route_pair` manifest byte-identity（`pi_loop_process.rs`） | 运行时 resource manifest | `EXPECTED_ROUTE_MANIFEST`（`include_bytes!` 编译期） | 独立 |
| 2 | `verify_artifact`（runtime / sidecar.cjs） | 磁盘实物 | 已证 byte-identical 的编译期 manifest 的 digest | 独立（锚回 1） |
| 3 | `decode_route_manifest` 闭集 | manifest bytes | 本文件手写闭集键与范围 | 独立 |
| 4 | `compiled_manifest_decodes_and_matches_the_frozen_truth_table` | 编译期 manifest | 测试内手写字面量（523,235 / `75eff9b9…` 等） | 独立 |
| 5 | `session_started.routeManifestSha256` resume 漂移门 | journal 历史值 | 对已验证 manifest 原始 bytes 重算 | 独立（锚回 1） |
| 6 | Node `assertManifestFrozen` | tracked manifest | `FROZEN_ROUTE`（builder 冻结表） | 独立 |
| 7 | Node `ARTIFACT_CHECKS`（bundle / runtime×2 的 bytes+SHA） | snapshot 实物 | tracked manifest（按 repo 路径读） | **本轮修复：1R2 取自被判 manifest 自报值** |
| 8 | Node layout manifest 判据 | layout 自带 manifest | tracked manifest 原始 bytes（`Buffer.equals`） | **本轮新增** |
| 9 | 跨侧门 `product-main.test.ts`「bundle bytes/SHA」 | tracked manifest | 从 product entry **现编**一次 CJS 的实测值 | 独立 |
| 10 | 跨侧门「顶层与两枚 target」 | tracked manifest | `build-product-sidecar.mjs` 的 `TARGETS` 冻结表 | 独立 |
| 11 | builder `冻结表逐值等于票面 §二.4` | `TARGETS`/`ROUTE_ID`/… | 测试内手写字面量 | 独立 |
| 12 | builder archive/runtime 身份 | 下载物 | `TARGETS` 冻结表 + 同次 `SHASUMS256.txt` 第二见证 | 独立（双见证） |
| 13 | builder 「现编两次 byte-identical」 | 两次产物 | 互比 —— **同源，但判的是「可复现」这条性质本身**，不是身份；身份由 9/10 独立锚 | 同源，已说明，不适用补门 |
| 14 | wire golden（Rust `include_bytes!` × TS `readFile` 同一 `product-wire-v1.jsonl`） | 两侧 codec | tracked blob（双侧共用唯一真源） | 独立（两侧互不产样本） |
| 15 | `deadline_table_matches_the_frozen_values` | 常量 | 测试内手写字面量 | 独立 |
| 16 | `spawn_call_site_stays_inside_spawn_verified_sidecar` + isolation-binding 登记册 | 生产源码 | 手写登记册 + ADR-018 正文解析 | 独立 |
| 17 | D1 手写清单 + 清账表（本轮新增） | 四模块生产段源码 | 测试内手写字面量 | 独立 |
| 18 | D1 前置门的阈值 | 入参 | `pi_loop_protocol` 常量（import，不另抄） | 单一真源 |
| 19 | 门 3/4 出包判定层 | product wire 实际出包 | 裸 `JSON.parse` + 手写逐字段断言，刻意不复用仓内 codec | 独立 |

第 13 行是全表唯一「与被判物同源」项；已说明它判的是可复现性而非身份，身份另有 9/10 两枚
独立锚，故登记为**不适用补门**，不静默省行。

## 四、mutation 账（逐枚命中校验 → 定向红 → byte-identical 还原）

三份被变异文件的还原后 SHA 与变异前逐字节相同（`10-mutation-baseline-sha.txt`）：
`pi_loop.rs 44ea06ee…`（注：rustfmt 与 clippy 修复在 mutation 之后另行落地，见 §六）、
`pi_loop_protocol.rs f9b47ddc…`、`verified-node-gate.mjs 2321ae10…`。

| 编号 | 闭口 | 变异 | 命中校验 | 结果 |
|---|---|---|---|---|
| M-D1-1 | D1 | `read_bootstrap_payload` 新增一道 `MAX_SEGMENT_BYTES` 上界，**不补清账表** | `count==1` | 红 —— 扫描面多出 `(pi_loop_protocol.rs, read_bootstrap_payload, MAX_SEGMENT_BYTES)` |
| M-D1-2 | D1 | `validate_start_config` 的 caseRoot 上界放宽为 `MAX_CASE_ROOT_BYTES * 2`（常量仍被消费，清账表保持绿） | `count==1` | 红 —— 恰 `caseRoot/4097 字节` 一行，实得 `CaseRoot("案件根不可 lstat")` |
| M-D1-3 | D1 | `validate_api_key` 调用点从 credential 解析后**移到 spawn 之后** | `count==1` | 红 —— `provider.apiKey/空串：spawn 计数恰 0` 实得 1（副作用轴先红） |
| M-D2-1 | D2 | `resolveVerifiedRoute` 的 expected 改回从被判 layout manifest 自取（`readTrackedRoute({manifestFile: layoutManifestFile ?? MANIFEST_FILE})`） | `count==1` | 红 —— 注入四整枚失守（`Missing expected exception: 同步漂移 sealed CJS`），其余 7 枚仍绿 |
| M-D2-2 | D2 | `ARTIFACT_CHECKS` 删去 x86_64 两行（回退成「只核宿主那一枚 runtime」） | `count==1` | 红 —— 注入五 x86_64 两行 + 清单核对 |
| M-D2-3 | D2 | `frozenEqual(manifest.routeId, **manifest**.routeId, …)`，期望位换成被判物 | `count==1` | 红 —— 注入三 `改 routeId` + 清单核对「期望位取自被判物」 |

**作废一枚（如实登记，不计红证）**：M-D2-2 首次写法是把 `for (const target of TARGETS)`
过滤成宿主 triple，导致 `ARTIFACT_CHECKS` 读到 `undefined` 抛 `TypeError`，三枚测试红（含阳性
对照）。那是**改崩了**、不是语义变异（承在案判例「红数异常高可能是改崩了」）。重做为「删表里
两行」后得到干净的定向红，阳性对照保持绿。

## 五、九门 exit 表

各门单独取 exit，不经管道，串行，全部跑在非受限域。

| 门 | 命令 | 读数 | exit |
|---|---|---|---|
| 1a | `pnpm --filter @courtwork/pi-lane test` | 14 files / 448 tests | 0 |
| 1b | `pnpm --filter @courtwork/pi-lane test:product-sidecar` | 10/10 | 0 |
| 1c | `node --test apps/desktop/scripts/assert-isolation-binding.test.mjs` | 43/43 | 0 |
| 1d | `pnpm --filter @courtwork/pi-lane test:verified-node-gate` | **8/8**（1R2 为 5/5） | 0 |
| 2a | `cargo test` | **161 passed / 1 ignored**（1R2 基线 159/1） | 0 |
| 2b | `cargo test --lib -- --ignored` | 1 passed（快照 E2E，16.79 s） | 0 |
| 2c | `rustfmt --check` 本票四模块 | 零命中 | 0 |
| 2d | `cargo clippy --all-targets -- -D warnings` | 7 处，**全落 `src/lib.rs`**；本票四模块零命中 | 101（既有基线，同 1R/1R2 归属） |
| 3 | `gate:verified-node-production` | 10 PASS / 0 FAIL | 0 |
| 4 | `gate:verified-node-control` | 14 PASS / 0 FAIL | 0 |
| 5 | `pnpm -r build` | 全包通过 | 0 |
| 6 | `pnpm lint` | 零命中 | 0 |
| 7 | `pnpm test` | **166 files / 1,771 tests**（1R2 为 1,756） | 0 |
| 8 | `pnpm --filter @courtwork/desktop lint:isolation-binding` | 扫 10 份宿主源码 / 30 份 pi lane 源码 | 0 |
| 9 | `git diff --check` | 零命中 | 0 |

Route A 身份未漂移（product source 未改）：sealed CJS `523,235` /
`75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`，
runtime `112,928,848`/`2e3f1286…`、`115,447,952`/`03afb361…`，与 tracked manifest 逐值相同。
本轮**不需要** 1R Stage-2 的三处钉死值同步仪式。跑完全部门后复核真快照三件 SHA 未变。

## 六、「只收紧」机器自证

`11-names-{before,after,deleted}.txt`：以 `5396ad8` 为基线，比对四份 Rust 模块的函数名
（归一化 `pub(crate)` 可见性）与两份 Node 门文件的 `test('…')` / `function` 名。

- **删除的判据名：0**。唯一消失的标识符是 `syntheticFrozen`——test-local **fixture 构造器**
  （旧法用合成小文件伪造一套冻结描述子），不是判据。它被真快照 CoW 克隆 + tracked manifest
  取代，判据只增不减（旧五枚 test 名全部保留并收紧）。此项如实登记，不冒充「0 删除」。
- 新增：Rust 11 枚（含生产件 `validate_api_key`）、Node 8 枚（3 枚 test + 5 枚 helper/导出）。

## 七、偏离登记

1. **`is_absolute_path_shape` 由私有改 `pub(crate)`**（`pi_loop_protocol.rs:1159`）。为让 host
   前置门 import 同一枚形状判据，避免两谱各抄一份。属白名单内、只扩可见性、无语义变更。
2. **caseRoot 绝对形状门属主动扩边**。票面 §二 D1 表只列「非空且 ≤MAX_CASE_ROOT_BYTES」；
   相对路径同族（可能相对 cwd 解析成功，一路走到 spawn 之后才由 encoder 拦），按 §零「按族
   收口」一并前置，并在清单里单列一行（判据名 `is_absolute_path_shape`）。
3. **`validate_api_key` 的空白判定用 `trim().is_empty()`，严于 encoder 的 `read_non_empty_string`**。
   口径取自既有 production `KeychainCredentials`（`!secret.trim().is_empty()`）与 `modelId`
   的同形门，属只收紧。
4. **`resolveVerifiedRoute` 取消 `manifestFile` 与 `frozen` 两枚注入接缝**。期望侧可注入正是
   D2 病灶的载体；常驻测试改用真快照 CoW 克隆后不再需要它们。`readTrackedRoute` 保留同名参数，
   只供 manifest 逐字段反例单独驱动，`resolveVerifiedRoute` 不转发。
5. **`verified-node-gate.test.mjs` 的合成 layout 改为消费真快照**。因此该文件现在**硬依赖**
   `dist/product-sidecar`（缺件即 `requireSnapshot()` 硬失败并打印补救命令，不静默跳过）。
   代价是单跑约 3.7 s（两枚 runtime 逐次 SHA）。旧法零依赖但只能拿合成冻结表当期望，
   正是 1R2 放行同步漂移的原因。
6. **新增 `ARTIFACT_CHECKS` 一张声明式比对表**（复杂度节制留痕）。新增概念一个：「比较行显式
   声明期望值锚点」。非加不可的理由：票面 D2.4 要求「逐条指名每个 expected 值的独立锚点，出现
   第三类来源即红」，没有可被机器读取的锚点声明就只能靠人读；表本身连同 `toString()` 正则是
   最小可机检形态，未引入新依赖、新持久化格式或新状态机。
7. **`type ConfigCounterexample` / `TextCounterexample` 两枚类型别名**为消 clippy
   `type_complexity`（`-D warnings` 下是 error）。仅测试段，无语义。
8. **对 `pi_loop.rs` 跑了 `rustfmt`**。变更严格限于本轮新增测试块的 5 处换行（已用
   pre/post 逐 hunk 比对留证：`@@ -3769`、`-3822`、`-3879`、`-3906`、`-4325`），未触及既有代码，
   与「fmt 既有文件基线不动」不冲突。

无 `[需架构拍板]` 悬置项。

## 八、现场

```
$ git status --short
 M apps/desktop/src-tauri/src/pi_loop.rs
 M apps/desktop/src-tauri/src/pi_loop_protocol.rs
 M packages/pi-lane/scripts/verified-node-gate.mjs
 M packages/pi-lane/scripts/verified-node-gate.test.mjs

$ git diff --stat
 apps/desktop/src-tauri/src/pi_loop.rs              | 821 ++++++++++++++++++++-
 apps/desktop/src-tauri/src/pi_loop_protocol.rs     |   5 +-
 packages/pi-lane/scripts/verified-node-gate.mjs    | 176 ++++-
 .../pi-lane/scripts/verified-node-gate.test.mjs    | 345 ++++++---
 4 files changed, 1211 insertions(+), 136 deletions(-)
```

未提交、未 push、未合并；`ACCEPTANCE.md`、旧回执、三件合同、`product-protocol.ts`、lockfile
与依赖全部零触碰。`docs/status/current.md` 不更新，`PI-WRITE-HOST-1` 不开工，
GUI/DMG/Pages 未启动。
