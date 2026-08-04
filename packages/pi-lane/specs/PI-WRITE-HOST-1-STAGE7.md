# PI-WRITE-HOST-1 · 开工序⑦ 回执总表（2026-08-05，全量门实测与偏离总账）

票面：就绪图 `PI-WRITE-HOST-1` 行 ＋ 本包 SPEC 九 ＋ 前六段回执（`-PREFLIGHT` / `-RECON` /
`-STAGE2` … `-STAGE6`）。基线 `claude/pi-write-host-1@cc81eaa`（开工序⑥）。
分支底 `main@4ab5671`。

⑥ §7.3 已判「实现面已闭合，⑦ 只剩全量门与回执总表」。本单因此**零生产码触碰**，
触碰面恰一处：本回执。`/workspace` 回读属 `PI-WORKSPACE-READ-1`，headless 总验属
`PI-BASE-HEADLESS-ACCEPT`，本单一行不碰。

## 一 · 七段链表

| 段 | 提交 | 交付物要点 | 关键读数 |
|---|---|---|---|
| ① | `3908333`（侦察落痕 `b660d15` 随①相入链，不占开工序编号） | cap-std/cap-fs-ext/cap-tempfile `=4.0.2` 一手复核；symlink 边界措辞钉死；ambient 逃逸口穷举；观察②（游标二元性）暂缓裁定；开工序①—⑦ 采纳。RECON 出 TS 装配图、五枚前向债口径、Rust effect 面、born-red 复用装置与退出证据矩阵 | 三件 `4.0.2` 即上游 newest/max_stable、未 yank；`4.0.1` 全家被 yank 但两版**零源码 delta**（仅 9 个 `Cargo.toml` 版本串）；macOS/aarch64 传递图 **18 crate** 实解、零白名单外；四件源码约 **166 KB**；`RUSTSEC-2024-0445` 不适用（fixed 3.4.1）；上游自 2026-02-15 **零 commit**（约 5.5 个月，单一发布者），对冲三条 |
| ② | `32ad737` | 五枚前向债前置门（偿形循 1R6 `encode_outbound_line`，不补第二份手工门）＋电池/D1 增行＋effect 六型真值样本。生产恰新增一枚 `encode_host_result` | 电池 152→**220 枚 / 20 字段 / 拒 126**，效果域独占 **68 行 / 5 字段 / 拒 12**；三道全局下限 `100/10/100`→**`200/18/115`**；D1 清单 11→**16 行**、反例 34→**41 枚**；effect 六型闭集逐值 **23 枚**样本；首红 **7 枚**（BR-1a…BR-5）＋生产 mutation 2 枚＋塌缩守卫 3 枚；cargo 174→**176**；`pi_loop_protocol.rs` 全程 `f9b47ddc…` 未变 |
| ③ | `f9e6a1b` | `pump()` 的 `PacketPayload::HostRequest` 臂 ＋ 四段落账状态机（0.1 能力门→0.4 真件座门→probe→**编码先于效果**→`tool_proposed`/`authorization_decided`→二次 probe→`effect_started`→perform→三态→发包）＋假 effect 注入座 | cargo 176→**185**（净增 9）；M-③E 成对对照唯一变量＝编码位置：实验臂 journal 564→**1243 B**、`perform` **0**，对照臂 564→**2862 B**、`perform` **1**；生产 mutation M-③1…M-③7 **七枚**全红；三枚 durable 屏障逐枚注入、`perform` 恰 0 次；`DanglingEffect` 首份**由生产臂写出**的真数据；diff `pi_loop.rs` +1212/−13、`pi_loop_protocol.rs` +35/−0 |
| ④ | `dcbd53f` | cap-std `=4.0.2` 入依赖 ＋ 新增 `pi_loop_workspace.rs` 真件 ＋ `TempFile` 私有写入与 `replace` ＋ 三道平台屏障 ＋ 22 道反例门 | 探针实测：`TempFile::new` **0o644**、`new_anonymous` **0o000** 且目录项 **0**（macOS 无 `O_TMPFILE`）、`new`＋`set_permissions(0o600)`＋`replace` 后最终 **0o600**；门 G-1…G-22；mutation **M④1…M④16 十六枚**（M④17 等价变异**作废**）；M④3 **三轮剥壳**（root 外→绝对→相对，第三轮才咬得动）；**12 轮真 SIGKILL**；cargo 185→**211**（净增 26）；新增 **18 crate**；`pi_loop_workspace.rs` 1,646 行（生产段 262 行）；五枚**不可构造项**登记 |
| ⑤ | `5ba36f1` | Node 五处装配（主落点分叉／三张 tool 表／两段式 port／`publicToolCallId` 唯一新缝／`pendingHostOperation`）＋ prompt 换 `md-work-v1` ＋ 握手闭集加 `workspace_write`（Rust `EXPECTED_CAPABILITIES` 同批） | pi-lane vitest 450→**463 / 14 files**（净增 13）；cargo **211**（零增，只改握手种子与一枚 seam）；sealed CJS 身份三处同批 `523,235`/`75eff9b9…`→**`534,219`/`8520026c…`**、`reproducible: true`；mutation M5-2…M5-9 **八枚**全红（M5-1 等价变异**作废**并换一枚 characterization）；capability 种子行锚定改写实跑 **`changed: 36 / unmatched: []`**；两道产品闸逐一复核在场 |
| ⑥ | `cc81eaa` | 裁定A 落地（`session_started` 读侧闭集扩员＋写侧记实况）＋双端 golden 两枚 tracked fixture ＋拍板C（`proposalHash` Rust 重算，0.5 门位）＋退出矩阵 29 行收口 | cargo 211→**218**（净增 7）；pi-lane vitest 463→**469 / 15 files**（净增 6）；mutation 裁定A **4/4 红**、拍板C **4/4 红**、双端 golden **8 枚**（4 枚两侧同红、4 枚单侧红——成对看即跨端常量两份各自漂移的实证）；闭集**闭性**另由 7 枚负例锁死；`proposalHash` 七枚 frame 逐枚绑定、各带 `assert_ne!` 变异靶失效守卫；矩阵**残项恰零**；`build:product-sidecar` **`reused-identical`**、身份三处零更新 |
| ⑦ | 本回执提交 | 全量门实测 ＋ 七段链表 ＋ 偏离总账 ＋ 裁定/上浮结余 ＋ 票面退出证据对账 ＋ 移交验收 ＋ 成立范围。零生产码触碰 | 七相全绿（§二）；偏离总账 **38 条**；架构层结余 **A 已裁待追认 / B 上浮 / C 已清偿⑥ / D 新上浮**；回执互核录得 **2 处不合 ＋ 1 处口径变更未登记 ＋ 1 处文档漂移**（§八） |

链上禁区自①贯穿至⑥，逐段自陈并可复核：观察②（`fold()` 推进臂、游标、`turn_finished_follows`）
零触碰；`uncertain` 压扁为 `FileError('unknown')` 零触碰；capability 字面量零批量 `sed`；
未加 edit/diff/CAS/promotion/bash/GUI。

## 二 · 序⑦ 全量门实测（2026-08-05 01:23–01:27，实现 worktree，coordinator 实跑）

| # | 门 | 读数 | 说明 |
|---|---|---|---|
| 1 | `pnpm -r build` | **exit 0** | — |
| 2 | `pnpm lint`（`eslint .`） | **exit 0** | — |
| 3 | 根 `pnpm test`（`vitest run`） | **1813 / 1813** | 分支底 **1794** ＋⑤ **13** ＋⑥ **6** ＝ 1813，逐段账相加恰合 |
| 4 | desktop 单测 | **690 / 690** | 与分支底同值；本票触碰面不含 `apps/desktop/src/` |
| 5 | `build:product-sidecar` | **snapshot `reused-identical`**，`sidecar.cjs` **534,219 B** / `8520026cb78e4fbd773b020a8b59a23082e55790403149de5fb91be332fce562` | 与⑤ 建、⑥ 复核逐值相同；`route-manifest.json` 恒 `0b77e8f1…` |
| 6 | cargo（`apps/desktop/src-tauri`） | **218 过 / 0 败 / 1 忽略** | 门次序：**`build:product-sidecar` 先于 `cargo`** |
| 7 | 隔离端口全量 Playwright（`COURTWORK_E2E_PORT`，`reuseExistingServer:false`） | **352 / 352** | 本票零 e2e 用例增删；`git diff --name-only 4ab5671..cc81eaa` 实测 **27 文件**，恰落在 `apps/desktop/src-tauri/`、`packages/pi-lane/` 两处，**不含** `apps/desktop/src/` 与任何 `*.spec.ts`——Playwright 面结构性未动 |

**cargo 链条自洽**：174（分支底）→176（②）→185（③）→211（④）→211（⑤）→218（⑥），
逐段净增 `+2 +9 +26 +0 +7 = +44`，`174 + 44 = 218`——与⑦ 实测逐值对齐，无缺口。

**root 链条自洽**：1794（分支底）→⑤ `+13`（tool-policy 5 ＋ prompt 六条语义 1 ＋ write 装配 6 ＋
binder characterization 1）→⑥ `+6`（`write-session-golden.test.ts` 全部）＝1813。

## 三 · 偏离总账

38 条，逐条源自各段回执的「偏离与待追认」节，编号形 `<段>-<该段序号>`。

| 编号 | 段 | 要点 | 状态 |
|---|---|---|---|
| ②-1 | ② | journal 侧三处 `1_024` 换 `MAX_LOGICAL_PATH_BYTES`（值零变化），带 M-P 成对对照 | 协调追认 |
| ②-2 | ② | D1 清单新增两道塌缩守卫（出站恰 5 行、清单 ≥16 行） | 协调追认 |
| ②-3 | ② | 电池三道全局下限抬高 `100/10/100`→`200/18/115` | 协调追认 |
| ②-4 | ② | 出站族具名 code 取粗粒度 `protocol`，不新增 `HostError` 变体；精度由逐枚 `InvalidSchema` 断言＋cap 处正向对照承担 | 协调追认 |
| ②-5 | ② | `encode_host_result` 今日无生产调用点（②建门、③接线是①采纳的序） | 协调追认 |
| ③-1 | ③ | 0.1 能力门（`request.capability ∈ 本次握手实收`）票面未点名，带 M-③1 红证 | 协调追认 |
| ③-2 | ③ | `decide` 进注入座（授权二态＋`denied` 出站路径）票面未点名，带 M-③6 红证 | 协调追认 |
| ③-3 | ③ | 第 4 步「授权后 effect 前二次在场判定 ⇒ `state_changed` 零写」，带 M-③3 红证 | 协调追认 |
| ③-4 | ③ | `settle_uncertain` 在 `effect_uncertain` 落不住时立即 `reclaim_leg()`，带 M-③4 红证 | 协调追认 |
| ③-5 | ③ | SafeToken 清账表 `operationId` 行的理由订正（②原文在③后已成假话） | 协调追认 |
| ③-6 | ③ | `probe` 保持不可失败（`-> WriteDisposition`），④放宽签名时同批补失败反例 | 协调追认 |
| ③-7 | ③ | effect 不 publish `HostEvent`；`HostEvent` 闭集未加变体，账本真源恰是 journal | 协调追认 |
| ③-8 | ③ | `probe` 被调用两次（授权前＋effect 前）是本臂固定形，绿形对 `(2,1,1)` 逐值断言 | 协调追认 |
| ④-1 | ④ | 新增模块文件 `pi_loop_workspace.rs`（票面未点名落点）；理由＝G-9 需精确扫描面 | 协调追认 |
| ④-2 | ④ | `WriteDecisionDriver` 与真件 `decide` fail-closed；**副作用如实声明**：产品线上其实有**两道**闸而非③说的一道 | 协调追认 |
| ④-3 | ④ | `probe` 纯读、不建 workspace 根，带 M④1 红证 | 协调追认 |
| ④-4 | ④ | 内容 hash 由 Rust 重算并以 `hash_mismatch` 拒，带 M④8 红证 | 协调追认 |
| ④-5 | ④ | `replace` 失败取保守支 `uncertain`（ADR 原文只覆盖「调用前失败」；禁 errno 分叉），带 M④6 红证 | 协调追认 |
| ④-6 | ④ | `unsupported_filesystem` 以 `fstatfs` 判定，`Cargo.toml` 的 libc 注释随之修订（不默默扩面） | 协调追认 |
| ④-7 | ④ | 0.4 门在④后于产品线上结构性不可达；`install_write_host` 签名放宽为 `Option<..>` 保住反例覆盖 | 协调追认 |
| ④-8 | ④ | 臂上两处改动（第 1 步 `probe` 的 `Err` 走 `settle_failed`；第 4 步 `Err` 原样带 code），带 M④13/M④14 | 协调追认 |
| ④-9 | ④ | `FORBIDDEN_CONSTRUCTS` 含 `create_dir_all` 而正例本就不用它——静态门与行为反例两层各有独立红证 | 协调追认 |
| ④-10 | ④ | grammar 两处如实登记未擅自收紧（`...md`／`..md` 合法；`x .md` 段中空格合法），均入正向对照 | 协调追认 |
| ⑤-1 | ⑤ | tool-policy 是**三张**表而非 RECON 说的两张（保 `READ_ONLY_TOOL_NAMES` 不含写面，新增 `PRODUCT_TOOL_NAMES`） | 协调追认 |
| ⑤-2 | ⑤ | `sessionId`/`requestId` 以 getter 取值，取值时机为执行时；状态机 send 段同一性门是第二道 | 协调追认 |
| ⑤-3 | ⑤ | runtime 侧新增 `settledWriteOutcome`（与状态机 `outcomeFromHostStatus` 同构，但被机器逐值盯着） | 协调追认 |
| ⑤-4 | ⑤ | `DISABLED_REASON` 去掉 `write` 词条，dev 线拒绝理由改走通用支，闸门文案同批改 | 协调追认 |
| ⑤-5 | ⑤ | ③期 `grant_workspace_write` 退役，反向换 `revoke_workspace_write`（保住 0.1 门的可证否形态） | 协调追认 |
| ⑤-6 | ⑤ | capability 种子实测 **36 枚**，非 RECON 记的 33 枚（见 §八.1 的计数不合） | 协调追认 |
| ⑤-7 | ⑤ | RECON 第 6 条前提失效：`basename` 恰 `.md` 的门早在 proof 票就在场，本单未补门只接线（M5-9 实测有牙） | 协调追认 |
| ⑤-8 | ⑤ | prompt 第④条当期不可完全服务（写后回读属读侧票）；六条按 ADR 原文落地不删改，缺口如实登记 | 协调追认 |
| ⑥-1 | ⑥ | 裁定A 修订 `PI-HOST-LOOP-1` 票面 §139 冻结的 `session_started` payload 契约（窄幅） | **待架构追认（已裁）** |
| ⑥-2 | ⑥ | `PROMPT_ID` 常量退役，换 `CURRENT_PROMPT_ID`／`LEGACY_PROMPT_ID`／`LEGAL_PROMPT_IDS` 三枚，旧名零残留 | 协调追认 |
| ⑥-3 | ⑥ | `proposalHash` 门落 0.5 位；副作用如实声明：hash 不符也会消费掉那一枚 `active_tool_call` | 协调追认 |
| ⑥-4 | ⑥ | ③期脚本请求 `write_request_packet` 改带真 `proposalHash`（绑哨兵 `PROBE_SHA`，脚本座本就不重算内容） | 协调追认 |
| ⑥-5 | ⑥ | 两枚 fixture 落 `packages/pi-lane/fixtures/`，Rust 以 `include_bytes!` 跨目录读同一份 tracked blob | 协调追认 |
| ⑥-6 | ⑥ | golden 两枚环境派生字段（`recordedAt`／`routeManifestSha256`）按名替换后再比字节——**放宽**，逐枚给了替代直接断言 | 协调追认 |
| ⑥-7 | ⑥ | `assistant_text_delta` 切分不确定性以「换语料」而非「加豁免」解决，两轮实测证据入回执 | 协调追认 |

**「协调追认」的边界（如实声明）**：②③④ 三段的追认由协调方在⑦ 立单时点名；⑤⑥ 两段按同一
体例登记（⑥ 建在⑤ 之上、⑦ 立在⑥ 之上，逐段推进即逐段受理）。**本列的「协调追认」不等于
架构追认**——架构层结余恰 §四 的 A/B/C/D 四项。

**作废登记不入本表**（如实声明，不冒充红证）：M④17（只动注释的等价变异）、M5-1（binder 五参
被结构性忽略，零区分力）两枚已在各自回执作废，另 M5-1 换出一枚常驻 characterization。

## 四 · 裁定与上浮

### 裁定A · `session_started` 契约窄幅修订（已裁待追认，落痕⑥ §零）

读侧把 `promptId` 合法集扩为**恰** `{'case-read-v1','md-work-v1'}`、`capabilities` 合法集扩为
**恰** `{['case_read'], ['case_read','workspace_write']}`——两者都是**闭集**，不是通配、不是
「非空即可」；写侧 `session_started` 记当刻真值；旧档继续 valid。

| 选项 | 判定 |
|---|---|
| 维持现状（写侧硬编码 `case-read-v1`／`['case_read']`） | **违不变量 4/6**：⑤ 之后真跑的是 `md-work-v1` ＋两枚能力，durable 记录成为一句与事实不符的话，且被此后每一份档继承 |
| 收窄（常量直接换新值） | **毁旧档**：读侧是严格相等，换值即让 `PI-HOST-LOOP-1` 时期既有 journal 整份 quarantine |
| **扩员**（本裁定） | 旧档与新形各自 valid，写侧不再撒谎，闭集仍是闭集 |

修订面**恰**两枚字段：envelope 六规则、十九型闭集、其余字段与 wire schema 一字未动
（`pi_loop_protocol.rs` 与④⑤ 逐字节相同 `cf3aa9aa…`）。红证 M6-A1…A4 四枚双向 ＋ 7 枚闭性负例；
期望串由 `host.capabilities()` **实收值**渲染而非抄常量表，两谱一分叉当场红。

### 拍板C · `proposalHash` 的 Rust 重算 —— **已清偿⑥**

④ 移交 2 ／⑤ §六 登记的未竟项，⑥ 落于臂的 **0.5 门**（0.3 认领之后、第 1 步在场判定之前），
不符即 `settle_failed(HashMismatch)`——请求**从未成为提案**，effect 恰零、workspace 物理根根本不存在。
七枚 frame（domain／sessionId／requestId／operationId／logicalPath／byteLength／contentSha256）
逐枚绑定各一例，每例带变异靶失效守卫；与④ 的**内容 hash** 以「账本形态不同」互不顶名
（`proposal_hash_and_content_hash_are_two_different_gates`）。红证 M6-C1…C4。**本项自此关闭。**

### 上浮B · `logicalPath` 空串两侧异源（②→③→④→⑤→⑥ 五段原样上浮，六单未自裁）

journal 侧 `read_string`（**允许空串**）与 wire 侧 `read_non_empty_string` 非空判据不同源。
今日有三层结构性挡法：wire 判据前置、encode-before-effect（空路径的 `host_result` 编不出来，
故永远走不到 append）、④ 真件 `parse_write_path` 对空串直接 `invalid_path`。
**但 journal codec 单独看仍收空串**。收紧属改既有 journal 解码语义（可能拒既有档），
超出实现会话权限，**[需架构拍板] 保持上浮**。

### 上浮D · resume 路径缺 prompt/capability 漂移门（⑥ 新发现，⑥ 不自裁）

旧档（`case-read-v1` ＋ `['case_read']`）今天仍可被 resume，而新 leg 跑的是 `md-work-v1` ＋两枚能力；
`session_resumed` 不记这两样，故那份档的 `session_started` 会继续声称旧值。现有漂移门覆盖
grant／model／limits／routeManifest **四项，不含这两项**。加门＝让既有档**不可 resume**，
属改既有档的可用性，超出裁定A 的「读侧扩员＋写侧记实况」，**[需架构拍板] 上浮**。

## 五 · 票面退出证据对账

⑥ §五已把 RECON 退出证据矩阵 29 行逐行对账（「已在册」26 枚门名逐枚 `grep -c "fn <name>("`
命中恰 1），**残项恰零**。本节在其上补足**票面层**：就绪图行的「退出证据」列与票面正文
要求各自逐项落到段与门。

### 5.1 就绪图「退出证据」列逐项

| 票面退出证据 | 段 | 门／坐标 | 矩阵行 |
|---|---|---|---|
| prompt snapshot/byte gate 有 mutation 红证 | ⑤ | `md-work-v1 system prompt` 三枚（exact snapshot ＋六条语义 ＋≤2048 bytes 且不夹带）；M5-6 | #1 |
| 四工具 exact set 有 mutation 红证 | ⑤ | `绿证四：闭集恰 read/grep/glob/write` ＋ `红证九：多出一件即装配期失败`；M5-7 | #2 |
| 两端路径 golden 一致 | ⑥ | `dual_end_golden_wire_session_matches_on_the_host_side` §2.2.5 ＋ Node 侧双根枚 ＋ §2.3 三层 | #3 |
| 非 `.md` 在 Node 零 op | ⑤ | `Node 门先拒的一律零 operation`（6 形态）；M5-9 | #4 |
| 注入 Rust 畸形 request 零 effect | ④ | G-2 `counterexample_malformed_requests_are_refused_with_zero_effect` ＋ G-1（31 负例逐枚断言恰是哪一枚 code ＋7 正向对照）；M④12b／M④13 | #5 |
| root 内／外 symlink 父段全拒零 effect | ④ | G-3／G-4／G-5；M④3 三轮剥壳后第三轮才咬得动 | #6 #7 |
| final symlink | ④ | G-5 末段轴；M④4 | #8 |
| swap race | ④ | G-7 两枚（模块内真替换 ＋ 臂上真窗口） | #9 |
| Windows junction/mount/name-surrogate reparse | ④ | **不可构造**：`platform_boundaries_are_registered_not_faked` 显式登记，移植 Windows 时当场红 | #10 |
| cross-container 全拒零 effect | ④ | G-6（两 container ＋两 session 互不串写；`".."` token 被 root confinement 结构性拒） | #11 #12 |
| ambient API／`create_dir_all`／canonicalize 授权／`std::fs` mutation 零出现 | ④ | G-9 三段 fail-closed（16 枚禁用构件恰零；ambient 只许住具名理由行且恰一处；`std::fs::` 逐处清账、未登记即红）；M④16 | #13 |
| remove-then-rename 零出现 | ④ | G-8 `replace_is_a_same_directory_rename_never_remove_then_rename`（inode 换新 ＋旧句柄仍见完整旧版）＋静态门 | #14 |
| `effect_started` append+sync 失败必须零 temp/replace | ③ | G-14（三枚屏障逐枚注入，`perform` 恰 0 次）；M-③5 | #17 |
| 并发 reader 只见 old/new | ④ | G-10 | #15 |
| kill 覆盖 temp sync／replace／parent／journal 屏障 | ④③ | G-11（12 轮真 SIGKILL 子进程注入）＋ `dangling_effect_written_by_the_real_arm_folds_to_uncertain_and_closes_the_session` | #16 #17 |
| Windows 无 delete-share 占用保持旧文件 | ④ | **不可构造**：delete-share 是 Windows 语义；POSIX 等价面已实测（G-8） | #18 |
| 宽权限 temp 与 fallback mutation 必红 | ④ | G-12（带区分力自证，二者相等即硬失败；**可复现前提：本机 umask `0o022`**）；M④2 | #19 |
| unsupported remote/removable FS effect 前拒绝 | ④ | G-13（9 枚未知类型逐枚断言不支持 ＋活体读数 `apfs`）；M④9 | #20 |
| replace 后屏障失败或落账前 crash 只落／派生 uncertain，不伪 failed/completed | ④③ | G-15 `barrier_failures_at_or_after_replace_settle_uncertain`（replace 失败是**真**故障）＋ crash fold 派生 `EffectUncertain`；M④6／M④7 | #21 |

### 5.2 票面正文要求逐项

| 票面正文要求 | 段 | 门／坐标 |
|---|---|---|
| 五枚前向债（`read_host_result_payload`×3／`read_list_entry`／`read_logical_path`）连同前置门一并补 | ② | 偿形＝`encode_outbound_line` 结构性覆盖；D1 清单 16 行/41 反例、电池 220 枚/20 字段、出站族 68 行/5 字段；BR-1a…BR-5 七枚首红；`host_result_axis_probe` 五轴零副作用 |
| proof port 接 Rust exact 同版本 `cap-std`/`cap-fs-ext`/`cap-tempfile@4.0.2` | ①④ | ① 一手复核（版本/许可/安全/体积/维护风险）；④ `Cargo.toml` `=4.0.2` 三件入依赖、18 crate 解树与①登记逐项一致、全程 `--offline` |
| 产品 tool table／session／policy 注册原版 write | ⑤ | `PRODUCT_TOOL_NAMES` ＋ `DISABLED_TOOL_NAMES` 去 `write` ＋ `PRODUCT_CAPABILITIES` 加 `workspace_write`；R1 首红（两表不相交自洽证翻红）；`assertToolsWithinPolicy` 装配期锁 |
| 保持 Host 已固定的 Agent sequential；write binder `executionMode:'sequential'` | ⑤ | proof 票已固定于 `bindWorkspaceWriteTool`；⑤ 全程 `workspace-write-env.ts` **逐字节未动**（`af22f868…`） |
| 逐 toolCall 独立 env／operation | ⑤ | `ProductSidecarSession.publicToolCallId` 只读查询面（唯一真源，不做 runtime 镜像）＋ `pendingHostOperation` 按 operationId 对号；M5-2／M5-3 |
| dev 只读 prompt 换 ADR-022 六-0 六条／≤2048-byte `md-work-v1` | ⑤ | `PRODUCT_PROMPT_ID='md-work-v1'`；R2 首红；四枚门同批锁；M5-6 |
| Rust 逐段 `open_dir_nofollow`、单段建目录再重开 | ④ | 屏障次序第 3／4 步（每段：建一段→父目录项 sync→`open_dir_nofollow` 重开）；M④5（一次吞多段即红） |
| `TempFile` 私有同目录写入／同步／replace | ④ | §零 实测钉死取法（`new`＋`set_permissions(0o600)`，`new_anonymous` 结构性不可用于就位路径）；屏障①②③；M④2、G-8、G-12 |
| 物理根只在 app-data | ④ | 物理坐标只活在 `WorkspaceFsHost` 内部；G-22 断言 journal 文本里既无正文、也无 `pi-workspaces` 与 app-data 绝对路径；⑥ golden 判据 9 复锁 |
| 逐次授权先 durable | ③④ | 四段账序（授权与 `proposalHash` 持久 sync 后才 effect 准备）；G-14／G-18；M-③5／M-③6／M④10 |
| Node 仍零 fs 写 | ⑤ | `workspace-write-env.ts` 生产码逐字节未动；既有 ADR-018 门（SPEC §十：`child_process` 与 `fs:writeFile` 真树注入各触红一次）本票零回退 |
| 不得加 edit/diff/CAS/promotion/bash/GUI | ②③④⑤⑥ | 各段「禁区遵守」节逐段自陈；M5-7（工具表多一件 `edit` 装配期当场拒）为机器判据 |

## 六 · 移交验收

1. **验收读序＝七段回执**。①（`3908333` ＋ 侦察 `b660d15`）→②`32ad737`→③`f9e6a1b`→
   ④`dcbd53f`→⑤`5ba36f1`→⑥`cc81eaa`→⑦本回执。每段自带「本单新增了什么概念、为何非加不可」
   「红绿证」「禁区遵守」「偏离与待追认」「移交下一段」五节；**读序即依赖序**，跳段读会丢掉
   前段明文交代的担保边界（尤以②§八.1「D1 出站探针对『③是否真的先编码后落账』零区分力」
   与⑤§六「两枚 hash 不互相顶名」两处为要）。

2. **验收自建 clean worktree；`build:product-sidecar` 先于 `cargo`**。⑥ 在本树实测
   `reused-identical` **不能代表新树**——新 worktree 必须先建 sidecar 制品，否则
   `pi_loop_process.rs` 的冻结身份表无实物可比。sealed CJS 身份钉在**三处**：tracked
   `route-manifest.json`、`pi_loop_process.rs` 的 `compiled_manifest_decodes_and_matches_the_frozen_truth_table`、
   同文件负注入语料的两处字面量；三处现值 `534,219 B` / `8520026c…`，`route-manifest.json`
   `0b77e8f1…`。

3. **两枚不可构造项与平台边界的登记位置**。矩阵 #10（Windows junction／mount／
   name-surrogate reparse）与 #18（无 delete-share 占用保旧文件）沿④ §三「不可构造项」表
   原样登记，**不伪装成绿**；机器锚点是 `platform_boundaries_are_registered_not_faked`
   （移植到 Windows 时当场红）。同表另登记三项：真实 remote/removable FS 挂载（以闭集分类器
   9 枚 ＋活体读数 `apfs` 承担）、真实 `fsync` 失败（目录项屏障那一支由唯一一枚具名
   `#[cfg(test)]` 标志驱动，`replace` 失败那一支是真故障）、power-loss durability（见 §七）。
   **可复现前提两枚**：本机 umask `0o022`（G-12 的区分力自证依赖它，相等即硬失败）、
   app-data 卷实测 `apfs`（G-13 活体读数，不在闭集内即硬失败）。

4. **两道产品闸与 production driver 诚实边界的核法**。

   | 闸 | 现形 | 核法 |
   |---|---|---|
   | 0.1 能力门 | 对 write **不再是产品线上的挡板**（能力已谈成）；继续挡未谈成的 `workspace_read` | `counterexample_host_request_gates_refuse_before_any_effect` 的「能力未谈成」格 ＋ `revoke_workspace_write`（M5-8 撤门即 `Process(UnexpectedEof)`，该轮真的走到了 effect） |
   | 逐次授权 `WriteDecisionDriver` | **产品线上唯一仍然挡住 write 的那一道**；production 至今**没有** driver，真件 `decide` 恒 `policy_denied` | `real_write_host_without_a_decision_driver_denies_and_writes_nothing`（⑤ 加断言：该例必须跑在**能力已谈成**的路径上，两闸不得互相顶名）＋ `counterexample_missing_decision_driver_denies_instead_of_approving`；M④10／M④15 |

   **诚实边界**：产品线上每一枚 write 请求今日必得 `policy_denied`、零 effect、显式落账。
   这是 ADR-022 六-C 明文（headless 的 decision driver 必须显式注入，不得用 session
   always-allow 冒充产品授权）与总纲不变量 3 的直接结果，**不是缺陷**；宣告
   `workspace_write` 与「每一枚 write 都被拒」不矛盾——能力宣告的是「可以**申请**」，
   授权判的是「这一次准不准」。真 driver 的落点是 A3 GUI（`PI-LANE-UI-1`）与
   `PI-BASE-HEADLESS-ACCEPT` 的显式注入，**不在本票**。验收若要跑通端到端真落盘，
   须自行显式注入 driver 并在验收回执登记该注入。

5. **⑥ 留下的常驻装置可直接消费**（非一次性脚手架）：`inject_window`（真故障窗口）、
   `workspace_crash_writer_child`（子进程 SIGKILL 编排）、`ambient_and_mutation_surface_is_fail_closed`
   （扫描器）、`createHarness(host)` 脚本宿主替身、`hostRequests()` 投影、`revoke_workspace_write`。

## 七 · 成立范围与不宣称

**成立**：write 面在 **package／host 级**成立——wire 双端零 schema 变更（裁定A 只落 journal
codec）、Rust 真落盘与三道屏障、四段账序、双端 golden 两枚 tracked fixture、22 道模块/臂级门
与 29 行退出矩阵残项恰零。

**不宣称**（逐条给出归属票，不以本票全绿代表）：

| 面 | 归属 | 本票的如实登记 |
|---|---|---|
| `/workspace` 回读闭环 | `PI-WORKSPACE-READ-1` | prompt 六-0 第④条「写后回读」当期不可完全服务：今日 read `/workspace/...` 会被 case-only 容器 `denied`。六条按 ADR 原文落地不删改（prompt 非安全边界），缺口登记于⑤ §九.8；⑥ 未顺手开读侧路由 |
| headless 总验（真实 pi Agent 六格矩阵） | `PI-BASE-HEADLESS-ACCEPT` | 本票只到 package/host 级；build 绿只作入场 |
| 真 key 复核 | `PI-BASE-GUI-ACCEPT` | 本包 SPEC §七「真 key 复核步骤」**本票未执行**，留给持 key 者 |
| power-loss durability | 不属任何在途票，**不宣称** | ④ §三 登记：ADR-022 六-C 明文「atomic visibility、durable success 与 power-loss durability 是三个不同主张」。本链只证前两者——原子可见性由 12 轮真 SIGKILL ＋并发采样实证，durable success 由 `F_FULLFSYNC` 兑现；**断电实证不在本链，也不宣称** |

**不更新 `docs/status/current.md`**：released／demo-integrated／package-ready 都不等于
product-live（总纲不变量 9）。能力状态的更新须待独立验收与上述归属票各自放行。

## 八 · 回执互核：两处不合、一处口径变更未登记、一处文档漂移

按「宁记不合，不抹平」执行。

1. **capability 种子计数三谱不合**（实质不合）。RECON §意外与禁区 1 记 **33 处**；③ 回执记
   「33 枚既有逐字节原样，新增 **3** 枚」（⇒36）；④ 回执仍记「**33** 枚既有原样，新增 **4** 枚」
   （既与③的 36 不合，且 33+3+4=40）；⑤ 回执记「实测 **36** 枚，非 RECON 记的 33 枚
   （④ 新增四枚测试各带自己的握手）」——33+4=37≠36。三谱互不相容。
   **唯一带审计输出的实测数是⑤ 的行锚定改写 `changed: 36 / unmatched: []`**（形态未匹配即中止），
   现读以它为准；③④ 两段回执的「既有 33 枚」是沿 RECON 抄写、未各自复测。**本回执不另造计数**
   （树内不存在单一可 `grep` 的种子形，裸计数会数到不同的东西）。对验收的影响：该数只是
   **改写面规模**的记账，不是任何门的判据——门是 `EXPECTED_CAPABILITIES` 逐值比对与
   `revoke_workspace_write` 反例，两者与计数无关。

2. **⑤ 首段「触碰面恰 11 处」的枚举与 diff 不合**（名单不合，计数对）。⑤ 原文作
   「`product-runtime.ts`／`product-stdio.ts`／`tool-policy.ts`／`index.ts` **与它们的四份测试**、
   `product-main.test.ts`、…」。实测 `git diff --name-only dcbd53f..5ba36f1`：触碰的四份测试是
   `product-runtime.test.ts`／`tool-policy.test.ts`／**`workspace-write-env.test.ts`**／
   `product-main.test.ts`；**`product-stdio.test.ts` 一字未动**，`index.test.ts` 在树内不存在。
   计数 11（＋回执＝12）**正确**，错的是「它们的四份测试」这句归属。验收若拿⑤ 首段当扫描面
   会漏掉 `workspace-write-env.test.ts`（M5-1 换来的那枚 characterization 住在里面）。

3. **cargo 计数口径自④ 起变更，未在任一回执登记**（口径变更，非实质不合）。②③ 用
   `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`；④⑤⑥ 改用同命令加 `--lib`。
   该 crate **无 `tests/` 目录**（实测 `ls apps/desktop/src-tauri/`），故两口径在本仓等值——
   链条 174→176→185→211→211→218 逐段相加恰 `+44`，与⑦ 实测 218 逐值对齐，**无实质缺口**。
   登记它是因为口径变更本身应当留痕；若日后该 crate 增设集成测试，两口径将分叉。

4. **`packages/pi-lane/SPEC.md` §十 的单测计数已陈旧**（文档漂移，非回执互相不合）。
   §十 仍记「**450 例 / 14 文件**（2026-08-03 实测）」，而本分支实测 **469 / 15**
   （⑤ 463/14 →⑥ 469/15）。⑤⑥ 只在各自回执记数，未改 SPEC §十——该行的既有体例是
   「本票只据实更新该计数，不追认也不复核其他票面的证据」，故并非违规，但**它今天是一句
   与 HEAD 不符的话**。本回执亦不改（⑦ 触碰面恰一处），如实登记为待处理漂移。

### 已解订正（链内自陈，非遗留不合）

- RECON 第 6 条「basename 恰 `.md` 需装配时补门」——前提在⑤ 实测失效（门早在 proof 票在场），
  已由⑤ §二.6／§九.7 显式登记，坐标以现读为准。
- ③ §七.1「0.1 能力门是那之后**唯一**的产品闸」——④ 装 `WriteDecisionDriver` 后实为**两道**，
  已由④ §七.2 自陈订正，⑤ §五 逐闸复核在场。
- ② SafeToken 清账表「本票 ready capability 恰 `['case_read']`、宿主一枚都不生成」——③ 之后成假话，
  已由③ §六.5 订正为「出站同一枚 operationId 由 encode-before-effect 结构性前置」，判据形状与计数未动。
- 上游 `cap-tempfile` doc 自称 `replace` 后 "read-only"——④ §零 实测本平台为 **0o644**，
  已登记「不引用该句」，取法改由实测钉死。
