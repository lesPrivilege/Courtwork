# PI-WRITE-HOST-1 · 开工序⑤ 实现回执（2026-08-05，Node/TS 五处装配 ＋ `md-work-v1`）

票面：就绪图 `PI-WRITE-HOST-1` 行 ＋ 本包 SPEC 九 ＋ `PI-WRITE-HOST-1-PREFLIGHT.md`／`-RECON.md`
＋ `-STAGE2.md` §八 ＋ `-STAGE3.md` §七 ＋ `-STAGE4.md` §八 移交六项。
基线 `claude/pi-write-host-1@dcbd53f`（开工序④）。

本阶段范围恰按 PREFLIGHT §三 开工序⑤：**Node 装配五处 ＋ prompt 换 `md-work-v1` ＋ 握手闭集
加 `workspace_write`（Rust `EXPECTED_CAPABILITIES` 同批）**。双端 golden 与 crash/symlink/并发
矩阵属⑥；全量门属⑦；`/workspace` 回读属 `PI-WORKSPACE-READ-1`。本单一行不碰。

触碰面恰 11 处：`product-runtime.ts`／`product-stdio.ts`／`tool-policy.ts`／`index.ts` 与它们的
四份测试、`product-main.test.ts`、`pi_loop.rs`、`pi_loop_process.rs`（身份字面量）、
tracked `route-manifest.json`，以及本回执。
**`workspace-write-env.ts`（proof 生产码）、`pi_loop_journal.rs`、`pi_loop_protocol.rs`、
`pi_loop_workspace.rs` 与基线逐字节相同**——SHA 分别恒为 `af22f8689629…`／`f7fe4c0415f4…`／
`cf3aa9aa71a3…`／`16cce7dd0f4b…`（`git show dcbd53f:` 对照）。

## 一 · 本单新增了什么概念、为何非加不可

| # | 概念 | 非加不可的理由 |
|---|---|---|
| 1 | `PRODUCT_TOOL_NAMES`（tool-policy 第三张表） | 产品闭集是**四件**，dev 闭集仍是三件。把 `write` 塞进 `READ_ONLY_TOOL_NAMES` 会让一张自称「只读」的表含写面（命名说谎），也会连带把 dev 闸门与 dist fixture 的读面真值一起改掉。以 `satisfies readonly ProductToolName[]` 与 wire 闭集钉在编译期 |
| 2 | `ProductSidecarSession.publicToolCallId`（只读查询面） | RECON 点名的**唯一新缝**。binder 要把一次上游 tool call 归到公开 tc 上，而真源只在状态机的 `tool_started`。二选一里取查询面而非 runtime 镜像：镜像当场产生第二份可漂移的 tc 表，「查不到即拒、绝不代分配」只有在唯一真源上才成立 |
| 3 | `pendingHostOperation`（runtime 侧在途槽） | `deliverHostResult` 与 write 工具之间必须有一枚接缝：工具那侧 await 一枚 promise，宿主结果到达时按 operationId 对号 resolve。对不上号显式抛出——静默接受等于给「谁都能收束别人 operation」留默认通路 |
| 4 | `settledWriteOutcome`（write 工具账只认 host status） | 状态机已冻结「write 进 pending 后 `tool_finished.outcome` 只认 host status」。binder 把 denied/failed/uncertain 一并压成 `FileError`，runtime 若仍按 `isError` 二分，就会把「未获授权」报成「失败」，与状态机当场不符并被判 upstream 违约。带 M5-4 红证 |
| 5 | `revoke_workspace_write`（Rust 测试专用，取代③ 的 `grant_`） | ⑤ 之后握手闭集恒含 `workspace_write`，0.1 能力门在产品线上再无法由真实握手证否。反向撤销是让那道门**仍有可被证否形态**的唯一办法。带 M5-8 红证 |

**刻意不新增的四样**（复杂度节制）：不加 runtime 侧 tc 镜像表；不加第二份 capability/工具词表；
不给 port 接 abort 语义（见 §二.4）；不为 write 另立 `HostEvent` 或投影分支。

## 二 · RECON §TS 侧装配图逐条兑现

1. **主落点分叉**：`capabilities()` 里 `createReadOnlyTools` 之后追加 write binder，
   `tools` 数组由「读面三件经 `{ env }` 注入」＋「binder 原样」两段拼成。
   **write 不走 `tools.map` 的 `{ env }` 注入**（case env 覆盖 workspace env 之坑）。
   实测补记见 §四 M5-1 的作废登记与它换来的 characterization。
2. **闭集同批**：`PRODUCT_TOOL_NAMES` 得 `write`、`DISABLED_TOOL_NAMES` 失 `write`，
   「两表不相交」自洽证翻红即 first-red（§三 R1）。`PRODUCT_CAPABILITIES` 加 `workspace_write`，
   Rust `EXPECTED_CAPABILITIES` 同批、同字典序；**33→36 枚种子逐枚复核**（§九.6）。
3. **两段式 port**：`registry.allocateOperationId` → `reserveHostOperation`，
   `port.write` → `sendReservedHostRequest`，`deliverHostResult` 由显式抛出改为 promise resolve。
   「一 tc 一 op」的判据仍在状态机（`writeOperationSent`），runtime 不复制第二份。
4. **唯一新缝**：取 stdio 只读查询面；`workspace-write-env.ts` 的「查不到即拒、绝不代分配」
   一字未放宽（该文件逐字节未动）。
5. **prompt**：`PRODUCT_PROMPT_ID` 换 `md-work-v1`，正文换 ADR-022 六-0 六条，
   exact snapshot ＋ 六条语义 ＋ ≤2048 bytes ＋ 「不夹带 schema/plan/垂类正文」四枚门同批锁。
6. **`basename` 恰 `.md`**：**RECON 第 6 条的前提已失效（坐标以现读为准）**——门早在 proof 票就
   在场（`basename.length <= '.md'.length` 即拒），本单未新增门，只把它接到装配面并以
   M5-9 实测其有牙（放宽后 `.md` 真的上了 wire）。Rust 侧同一格由④ G-1 覆盖。
7. **双根显示**：glob/grep 仍只投影 `/case/...`，一处 `../workspace` 都不构造；`/workspace` 回读
   属 `PI-WORKSPACE-READ-1`。工具闭集恰 `read/glob/grep/write` 四件，装配期由
   `assertToolsWithinPolicy` 锁（M5-7 红证：多一件当场拒）。

## 三 · born-red 三族（先证会红，再做最小实现）

| 族 | 装置 | 实测红形 |
|---|---|---|
| R1 闭集自洽 | `PRODUCT_TOOL_NAMES` 进表而 `write` 仍在 `DISABLED_TOOL_NAMES` | `expected [ 'write' ] to deeply equal []` |
| R2 prompt | snapshot 与六条语义两枚同批翻转 | `expected 'case-read-v1' to be 'md-work-v1'`；`expected '你是一名只读文档助手…' to contain '实际读到'` |
| R3 装配 | RECON 点名的「host_request 全程为零」翻转，扩为六枚 | `expected [] to have a length of 1`；`[ [ 'write','failed' ] ] ≠ [ [ 'write','succeeded' ] ]`；`[ 'failed' ] ≠ [ 'denied' ]`；`expected [] to deeply equal [ 'request-1','request-2' ]`；`deliverHostResult` 旧文案 `本票不申请 host operation` |

R3 同批**退役一枚零区分力判据**：首轮以「`product-runtime.ts` 源码不出现
`reserveHostOperation`」兼作「读面零 operation」的证据；⑤ 把这两个名字真的接进来之后该扫描
恒红且对读面零区分力，故改为行为判据（读面跑完 `host_request` 仍恰零）。

## 四 · mutation（双向唯一锚定 ＋ 命中恰 1 校验 ＋ 还原 SHA 复核）

还原后 SHA 恒为 `product-runtime.ts` `1ee9cc51c1f0…`、`workspace-write-env.ts` `af22f8689629…`、
`pi_loop.rs` `b059836dfba8…`（逐枚 revert 后实测复原）。

| 编号 | 变异 | 实测红形 |
|---|---|---|
| M5-1 | write binder 改走 readTools 那一层 `{ env }` 注入 | **无红 ⇒ 等价变异，作废**（见下） |
| M5-2 | `allocateOperationId` 自铸 `op_local_*`，不经状态机 reserve | `expected [] to have a length of 1`（send 段拒收非本 prompt 的 reservation） |
| M5-3 | `deliverHostResult` 不对号，见谁收谁 | `expected [Function] to throw an error` |
| M5-4 | write 工具账退回 `isError` 二分 | `expected 'failed' to be 'completed'`（状态机判 upstream 违约） |
| M5-5 | `PRODUCT_CAPABILITIES` 退回单枚 | ready 两处 ＋ 真跑 sealed CJS 那一枚同红 |
| M5-6 | prompt 六条删成五条 | snapshot 红 ＋ `expected '你没有 edit…' to contain '回读'` |
| M5-7 | 装配面工具表多一件 `edit` | 装配期 `assertToolsWithinPolicy` 抛出，bootstrap 依赖的整族红 |
| M5-8 | Rust 撤 0.1 能力门 | `能力未谈成：实得 Process(UnexpectedEof)`（该轮真的走到了 effect） |
| M5-9 | Node 的 `.md` 门放宽（`<=` → `<`） | 装配面 `.md: expected [ { operationId: 'op_1_1', … } ] to deeply equal []` ＋ 门自身单测红 |

### M5-1 的作废登记（如实声明，不冒充红证）

RECON 点名的坑是「case env 覆盖 workspace env」。实测**在本 binder 上不可构造**：
`bindWorkspaceWriteTool` 的 `execute` 是 **Agent 四参**，容器在它内部自建，调用方多塞的第五参
被结构性忽略。故「把 write 也塞进 `{ env }` 注入」是等价变异，**零红即零区分力，作废**。

分叉照 RECON 原样保留（读面注入与写面 binder 各走各的），并补一枚 characterization 把这条
结构性事实钉住：`characterization：多塞的第五参不改变容器`。它的意义是**前瞻**——若来日有人把
binder 改成五参并真的消费第五参，那条注入路径立刻变成能被 case 容器顶掉 workspace 容器的真口子，
该测试当场红。

## 五 · 两道产品闸复核记录（④ 移交 1，`workspace_write` 开闸后逐一验在场）

| 闸 | ⑤ 之后的实际形态 | 证据 |
|---|---|---|
| 0.1 能力门 | 对 write **不再是产品线上的挡板**（能力已谈成）；继续挡未谈成的 `workspace_read`（`PI-WORKSPACE-READ-1` 之前恒拒）。可证否形态由 `revoke_workspace_write` 保留 | `counterexample_host_request_gates_refuse_before_any_effect`「能力未谈成」格 ＋ M5-8 |
| 逐次授权（`WriteDecisionDriver`） | **产品线上唯一仍然挡住 write 的那一道**。production 至今**没有** driver，真件 `decide` 恒 `policy_denied` | `real_write_host_without_a_decision_driver_denies_and_writes_nothing`（本单加断言：该例必须跑在**能力已谈成**的路径上，两道闸不得互相顶名） |

**生产 driver 当期供给形态（如实登记，按 ADR-022 六-C 判定，不自造）**：production 仍为 `None`，
故产品线上每一枚 write 请求必得 `policy_denied`、零 effect、显式落账。这是当期**诚实边界**而非
缺陷：ADR-022 六-C 明文「headless 验收的 decision driver 必须显式注入，不得用 session
always-allow 冒充产品授权」，总纲不变量 3 亦把授权判给用户；headless 阶段没有可代表用户的
在场者，硬编码 `Approved` 恰是 ADR 明禁的那一形。**真 driver 的落点是 A3 GUI（`PI-LANE-UI-1`）
与 `PI-BASE-HEADLESS-ACCEPT` 的显式注入**，不在本单。

宣告 `workspace_write` 而每一枚 write 都被拒，两者不矛盾：能力宣告的是「可以**申请**」，
授权判的是「这一次准不准」——逐次授权的拒绝是正常出口，不是能力宣告不实。

## 六 · `proposalHash` 生产者债（④ 移交 2）

**TS 侧已落**：生产者自本单起真实存在于 wire 上（此前只有测试喂的常量）。装配面加一枚
**独立重算**断言：按 ADR-022 六-B.2 的 `frame(x)=u32be(len)||UTF8(x)` 在测试里重算，
逐值等于出包值——它同时证明绑定的 session/request/operation 三枚 id 都是**本次**的。

**Rust 重算 ＋ `hash_mismatch` 反例仍是债，移交⑥**。它与④ 已落地的**内容 hash** 重算是
**两枚不同的 hash**，本回执不以后者顶名前者。今日 Rust 侧对 `proposalHash` 只做格式与逐值搬运，
不重算——ADR-022 六-B.2 的「Rust 必须重算」在这一枚上尚未兑现，如实登记为未完成项。

## 七 · 计数与门

- `pnpm --filter @courtwork/pi-lane test`：**463 passed / 14 files**（基线 450；净增 13＝
  tool-policy 5 ＋ prompt 六条语义 1 ＋ write 装配 6 ＋ binder characterization 1。
  「读面零 operation」是既有用例改判据，不增计数）。
- `cargo test --lib --offline`：**211 passed / 0 failed / 1 ignored**（与④ 同数：本单只改既有
  测试的握手种子与一枚 seam，未增删测试）。每次 cargo 之前
  `pgrep -f 'chrome-headless-[s]hell|[p]laywright'` 复核，两次均 **0**。
- `cargo clippy --offline --all-targets`：7 warnings，逐条归属 `src/lib.rs`
  （199/531/1553/1554/1560/1564/1566），**本单归属 0**，未新增任何 `allow`。
- `rustfmt`：只对 `pi_loop.rs` 执行，`--check` 复核 clean。
- `tsc -p packages/pi-lane`：clean。`eslint` 触碰的 8 份 TS：零输出。
- `build:product-sidecar`：**snapshot created**，`sidecar.cjs` 534,219 B /
  `8520026cb78e4fbd773b020a8b59a23082e55790403149de5fb91be332fce562`、`reproducible: true`，
  两枚 runtime 与冻结身份表逐值一致（archive 复用，零重下载）。
- **不跑仓级 pnpm 门与 Playwright**（属⑦）。

### sealed CJS 身份漂移（三处同批更新）

Node 产品源改动必然换 bundle 字节。身份钉死在三处，逐处更新并复验：
`523,235`/`75eff9b9…` → **`534,219`/`8520026c…`**——tracked `route-manifest.json`、
`pi_loop_process.rs` 的 `compiled_manifest_decodes_and_matches_the_frozen_truth_table`、
同文件负注入语料的两处字面量。承在案判例「门先于自查再验」：三处更新排在**最后一次源码编辑
之后**，随后 vitest／cargo／tsc 全部重跑一遍取本回执的计数。

## 八 · 禁区遵守

- **Rust 三文件零触碰**：`pi_loop_journal.rs`／`pi_loop_protocol.rs`／`pi_loop_workspace.rs`
  与基线逐字节相同（§首 SHA 对照）。wire schema 零改、journal codec 零改。
- **观察②**：`fold()` 推进臂、游标、`turn_finished_follows` 一处未碰。
- **`uncertain` 压扁勿修**：binder 把 uncertain 压成 `FileError('unknown')` 原样保留；
  runtime 侧只把 `uncertain` 如实转成工具账 outcome，不在 Node 造第二份判定。
- **不加 edit/diff/CAS/promotion/bash/GUI**；未碰 `package.json`、`Cargo.toml`、lock。
- **capability 种子零批量 `sed`**：36 枚逐枚复核后以**行锚定**改写，逐行打印审计，
  形态未匹配即中止（实跑 `changed: 36 / unmatched: []`）；既有 drift 反例
  （`[WorkspaceRead, WorkspaceWrite]`）一字未动，在新期望集下仍是漂移。

## 九 · 偏离与待追认

1. **tool-policy 是三张表而非 RECON 说的两张**。RECON 要求改 `READ_ONLY_TOOL_NAMES` 与
   `DISABLED_TOOL_NAMES`；实作保 `READ_ONLY_TOOL_NAMES` 不变（dev 闸门与
   `fixtures/sidecar-dist/scripts/sidecar-fixture.mjs` 都消费它作**读面**真值，且一张自称只读
   的表不得含写面），新增 `PRODUCT_TOOL_NAMES`、`DISABLED_TOOL_NAMES` 去掉 `write`。
   RECON 要的 first-red 形态未丢：自洽律加在产品表上照样翻红。
2. **`sessionId`/`requestId` 以 getter 取值**（binder 一 leg 一枚、requestId 每 prompt 一换）。
   取值时机因此是执行时；状态机 send 段的 request 同一性门是第二道，两侧都验。
   带专门的行为红证（第二个 prompt 的 write 必须带第二枚 requestId）。
3. **runtime 侧新增 `settledWriteOutcome`**（§一.4）。它与状态机的
   `outcomeFromHostStatus` 是同构的两份，但状态机在 `tool_finished` 当场逐值比对，
   漂移即当场违约收束——属**被机器盯着的**复制，不是第二个自由真源。
4. **`DISABLED_REASON` 去掉 `write` 词条**。dev 线的 write 拒绝理由因此走通用支
   （「不在本线工具闭集内」）而不再谎称它属于某个被锁的能力面；闸门文案同批改为
   「写面只以提案形态存在、物理 effect 由受信宿主经 workspace_write 兑现」。
5. **③ 期 `grant_workspace_write` 退役，反向换成 `revoke_workspace_write`**（§一.5）。
6. **capability 种子实测 36 枚，非 RECON 记的 33 枚**（RECON 写于④ 之前，④ 新增四枚测试各带
   自己的握手）。以现读为准，逐枚复核后全量改写。
7. **RECON 第 6 条前提失效**：`basename` 恰 `.md` 的门早已在场，本单未补门（§二.6）。
8. **prompt 第④条当期不可完全服务**：六-0 原文要求「写后必回读」，而 `/workspace` 回读属
   `PI-WORKSPACE-READ-1`，今日 read `/workspace/...` 会被 case-only 容器 `denied`。
   六条按 ADR 原文落地不删改（prompt 非安全边界），此处**如实登记该缺口**：
   在读侧票放行前，模型照做会得到一枚 denied 工具账——这是显式拒绝，不是静默失败。

### [需架构拍板]（三项，本单不自裁）

- **A（本单新发现，⑥ 前必须有结论）**：journal 侧 `PROMPT_ID` 仍是 `'case-read-v1'`、
  `session_started.payload.capabilities` 仍硬编码 `['case_read']`
  （`pi_loop_journal.rs`：常量 `:53`、写侧 `:398`／`:415`、读侧严格相等 `:675`／`:729-735`、
  物理 golden `:3378`），而实跑的 prompt 身份与握手闭集已是 `md-work-v1` /
  `['case_read','workspace_write']`。**两谱已分叉，durable 记录因此与事实不符**。
  未自行收敛的理由有三：该文件在本单禁区内；读侧是**严格相等**校验，改值会让既有档
  quarantine（改既有 journal 解码语义）；且 `promptId`/`capabilities` 是
  `PI-HOST-LOOP-1` 票面 §139 冻结的 payload 契约。**这是⑥「双端 golden」的正题**，
  本回执把它登记为**阻断项**而非「已知边界」——不得以本单全绿代表该记录已经诚实。
- **B（②→③→④ 原样上浮）**：journal 侧 `logicalPath` 用 `read_string`（允许空串），
  wire 侧用 `read_non_empty_string`，非空判据两侧不同源。
- **C（④ 移交 2 的未竟部分）**：Rust 侧 `proposalHash` 重算与 `hash_mismatch` 反例（§六）。

## 十 · 移交⑥（开工前必读）

1. **先解 §九 [需架构拍板] A**。⑥ 的双端 golden 若在 `promptId`/`capabilities` 分叉之上建立，
   golden 会把错的形状固化——承在案判例「golden 固化坏形」。
2. **`proposalHash` 的 Rust 重算是⑥ 的第一件活**。本单已在 wire 上放了真生产者，并在测试里
   留下逐值可比对的独立重算（`product-runtime.test.ts` 首枚 write 装配用例），照它实现即可。
3. **矩阵可直接消费本单装置**：`createHarness(host)` 的脚本宿主替身（收到 `host_request` 就按
   脚本回 `host_result`，回包排在 microtask 里）、`hostRequests()` 投影、
   `revoke_workspace_write`（0.1 门反例）三枚都是常驻件。
4. **身份三处同批**：任何 Node 产品源改动都会换 sealed CJS 字节，`route-manifest.json` 与
   `pi_loop_process.rs` 两处字面量必须同批更新，并把三处更新排在最后一次编辑之后再跑门。
5. **`/workspace` 回读仍属 `PI-WORKSPACE-READ-1`**；⑥ 不得顺手开读侧路由来「让 prompt 第④条
   说得通」（见 §九.8）。
