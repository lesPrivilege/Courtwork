# PI-SIDECAR-DIST-1R5 · R4 evidence-truth 闭口回执

状态：待独立验收。

权威契约只认父级 [`SPEC.md`](../SPEC.md)「并行相邻票与合流门」、
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-E 与
[`implementation-readiness.md`](../../../docs/architecture/implementation-readiness.md) 同名行。
本文件只是本工单的独占实现回执，不得在这里改变 R2–R4 已冻结的来源、assembly、canonical
四层、双 execution domain、签名模式、库存、wire、deadline、路线候选或产品 signing plan。

R4 目标 `07d2dbc`（实现 `891c23d`）经独立验收判定 REJECT；验收树五文件约 1800 行的
未提交返修只作诊断输入，不能由实现会话接管、复制或代提交。实现须从当前架构 `main` tip
新建 clean worktree/branch，按父级 SPEC 顺取 R4 链及两枚 R4 提交，在 untouched R4 target
上自行取得 first-red。

只更新本回执和父级 SPEC 的七路径白名单；不改 toolkit/canonical fixture、其他
fixture/build/runtime 脚本、旧回执/ACCEPTANCE、父级文档、依赖、产品源码、Rust/Tauri 或 GUI：

- 架构锚点、十四枚 cherry-pick 逐枚 patch-id、两枚 ACCEPTANCE 架构移植的
  added-lines 逐字节对照、组合基线与 untouched R4 target SHA：
  base `main` = `5ec9839`（已核为 `HEAD` 祖先）；组合枝 `5ec9839..94f662e` 恰 16 枚。
  十四枚 cherry-pick 的 `git patch-id --stable` 与源提交**逐枚相同**：`f0162fd eb806f2
  b284764 f7ecd32 20461aa c6a9819 df65ab0 0230bf6 57f91dc 473bc00 7b4184b 47fd7e5
  891c23d 07d2dbc`。恰两枚 `DIFF` 为架构内容移植（提交主题带 `[架构移植 <源 SHA>]`）：
  `b6172ca ← ba374d8`、`245c48f ← eb71d6f`，patch-id 按 SPEC 配方修订条豁免。
  移植复验（本会话实测）：源 `ba374d8` diff-added 恰 **74** 行、SHA-256
  `cd9c553592a8ebb78c272720feb98b5e1e58c477bb616074da05710cc2452cb4`；源 `eb71d6f` 恰
  **122** 行、SHA-256 `49694a9feb437b28b79c75b90b5891f2454ff6541b11be5d0a4a21ed86564d28`
  ——两值与移植提交信息记录的 canonical SHA 逐字符相同。移植区与源**唯一差异已归因**：
  空行分隔符从首行（源在文件末尾追加）移到末行（移植插在节间）；剔除空行后两侧非空
  内容行 SHA-256 相等、空行计数相等（16/16、23/23）。
  untouched R4 target：`07d2dbc` 与 `94f662e` 在 `fixtures/sidecar-dist`、
  `docs/engineering/pi-sidecar-dist-1.md` 与 R1–R4 回执上 `git diff` 为空；fixture 目录树
  对象同为 `f83e798e31e0872778ebad3e504bb915f22b73b9`，工程报告 blob 同为
  `7ae61d757ec4993cbed04c2f0839ff48169837e8`。
- 旧脏验收树零接管、零复制及实现起点 clean 证据：
  实现自 `94f662e` 起工，Stage A 开工前 `git status --short` 为空，唯一改动面是自写红测。
  验收树的五文件未提交返修**从未被读取、复制或提交**；本票 23 枚 first-red 全部由本会话在
  untouched target 上自行构造，判据名与失败形态见工程报告 §二十一之三。
- first-red A：跨架构 exact warning + 非零 exit、exit timeout/kill-confirm：
  4 枚全红。A1 `exit={code:1,signal:null}`；A2 `exit={code:null,signal:'SIGKILL'}`；
  A3 `timeouts:['exit']`；A4 `timeouts:['exit','kill-confirm']`。四枚均保持
  `launched:true` 与 exact `Code cache data rejected.` 不变（测试内 `assertWarningIntact`
  逐格坐实），故红只可能来自新门。命中 production 缺口：`verdictReproducibility` 原第
  846-858 行只核 `launched/warning`。
- first-red B：command timestamps 两副本同时缺失、全填同一 canonical UTC 常量：
  2 枚全红。B1 对同轮共享 receipt 对象整列 `delete startedAt/finishedAt`（observation 侧
  四个取样位同步坐实缺失）；B2 全部 command 同填可往返的
  `2026-07-29T00:00:01.000Z`，整轮首尾零推进。命中缺口：时间字段原先只经
  `commandIdentity` 参加两副本 identity，`validTimestamp` 只用于 `receipt.capturedAt`。
- first-red C：preflight-only target 同步漂移：
  3 枚全红。C1 official target 三处同步漂到 `/private/tmp/bogus/node`（observation＋
  `receipt.commands`＋`receipt.officialNode.path`），preflight-only 决策仍报
  `{ok,passed}`；C2 只坏 producer 自报 `cdhash`、raw display 仍带真实 CDHash，full 路径
  命中 `sign.preflight.official.cdhash` 而 preflight-only 照报 ok；C3 同一份三处漂移令
  `verdictSign` 返回**零 failure**——full 与 preflight-only 同样假绿。C3 是本票实测新发现，
  直接触发 SPEC R5 第 4 条的 official path 锚点补拍。
- first-red D：full raw 非零/signal/error/security stderr 被摘要洗绿：
  4 枚全红。D1 raw sign `exit=1` 而 `signExit=0`；D2 raw verify `signal='SIGKILL'`（exit 仍
  0）；D3 raw sign `error='spawn /usr/bin/codesign EPERM'`（exit 仍 0）；D4 raw display
  stderr 追加 `invalid entitlements blob` 而 `flags` 摘要仍正确。四枚均逐格 assert 摘要
  保持「正确」。命中缺口：`verdictSign` 原第 968-1029 行逐格只读 producer 摘要。
- first-red E：A/B physical cell 串格、run/actual-entitlements/nested `.app` raw 失败：
  10 枚全红。E1a 一枚 occurrence 同时顶下 `control.sign` 与 `control.verify` 两 role（真实
  verify 命令仍在同轮 receipt 中）；E1b A 格（`a/…/cjs|adhoc-plain`）三条 raw 全换成 B 格
  （`b/…/default|adhoc-plain`）实物；E2 五枚为 `.app` 的 inner／outer／deep verify／`spctl`
  （Gatekeeper 竟然放行）／nested run raw 失败而摘要七格一字不改；E3 某格 `run` raw 失败而
  `launched` 报真；E4a actual-entitlements raw 读取失败而摘要仍 present + canonical 六键；
  E4b 无 entitlements 格的 raw stdout 带六键而摘要仍报 none。命中缺口：`identities` 是 Set
  （无基数概念，原第 1650 行）、`.app` 原第 1031-1064 行只读摘要整数、`run` 与
  actual-entitlements 的 raw 一条不判。
- ready 60,000 ms、`CRASH_DEADLINES.exitMs`、`killConfirmMs` 的显式状态与最终
  `timeouts:[]` / `{code:0,signal:null}` hard gate：
  `reproducibility-probe.mjs` 命名 `CROSS_ARCH_READY_MS = 60_000` 保留 ready 门；ready 后
  `stdin.end()` 发 EOF，退出走 `proc.waitForExit(CRASH_DEADLINES.exitMs)`，失败再
  `proc.killAndConfirm(CRASH_DEADLINES.killConfirmMs)`；三段超时各自写入 `timeouts`，
  observation 显式携 `exit`（确认不到退出时为 `{code:null,signal:null}`，不留 undefined）。
  该处**不再有裸 `await proc.exited`**（可执行码中残留计数 0，唯一 grep 命中在解释性注释）。
  判定端只接受 `timeouts:[]`、`launched:true`、exact warning 与 `{code:0,signal:null}`。
  实现域实测：`launched=true`、warning `(node:4971) Warning: Code cache data rejected.`、
  `exit={code:0,signal:null}`、`timeouts:[]`。该文件在首轮读数后因 lint 被编辑过一次（T1c 的
  死赋值移除），故已在 T1c 最终 bytes 上**另跑一轮**复核：双 cycle `status:"ok" failures:0`
  EXIT=0，跨架构仍 `launched=true`、`warningSeen=true`、`exit={code:0,signal:null}`、
  `timeouts:[]`（留档 `scratchpad/r5-stage-c/15-repro-recheck-T1c.txt`）。
- 每条 canonical UTC、逐条 `start<=finish`、相邻 `finish<=start`、全轮首尾严格推进的
  command timeline：
  `verdictCommandTimeline()` 四道门并列；canonical 判据用**可往返** `Date#toISOString()`
  （比旧 `validTimestamp` 严，后者放过 `'2026-07-29'`、RFC-1123 与带偏移的本地时间）。
  由 `verdictHostToolReceipt` 调用；时间字段继续参加 command identity，本门是额外 hard gate。
- preflight-only 在发布 manifest/status 前执行 production-used hard verdict：
  `sign-probe.mjs` 在 `manifest` 成型**之前**调用 `verdictPreflightRun({executionDomainId,
  canonical, preflight, hostToolReceipt})`；`finalStatus` 只取其 `status` 再叠 full failures。
  verdict 是进程内消费，**未新增持久化 verdict 文件**。
- preflight raw receipt membership、target/exit/signal/error/streams、四 gates、official
  identity、XML/plutil 与 Gatekeeper 重导及 summary parity：
  `verdictPreflightEvidence()` 收「与分类无关的证据完整性」：domain id、canonical 输入、
  `verdictHostToolReceipt`（含 timeline 与 official path 锚点）、八条 preflight role 的
  唯一 occurrence 绑定、official 两条命令的独立构造 target，以及 producer 自报
  status/classification 的 **exact parity**（新判据 `sign.preflight.producerStatusParity`
  ——blocked 路径不跑 passed 形状门，若这里也不核，「raw 判 blocked、producer 自称 passed」
  就没人看得见）。分类相关的形状门仍住 `verdictPreflight()`，仅在 raw 重导为 `passed` 时追加，
  故受限域的合法 blocked 不被「必须 passed」误伤。
- semantic role + subject + mode → 唯一 command occurrence/index、零跨 role/cell 复用，
  以及从 trusted stage root + 冻结 coordinate 独立构造 expected target：
  `verdictRoleOccurrenceBinding()` 退役 Set membership，改按 index 绑定：每 role 必须**恰好**
  匹配一条 receipt（0 条 → `sign.receipt.commandBinding`，>1 条 →
  `sign.receipt.commandOccurrence`），且该 index 不得被第二个 role 认领（→
  `sign.receipt.commandOccurrenceReuse`）。坐标由 `verdictStageRoot()`（要求 stage root 是
  `dist/security-domain/` 的**直接**子目录，`..` 逃逸与多层嵌套一律不算）加冻结
  `signCellPath()` / `appBundlePath()` / `appBundleNestedPath()` 推出。official expected path
  由判定层自持 `PROBE_ROOT`（`import.meta.dirname` 纯字符串运算）+ `HOST_ARCH`（判定进程实测）
  + 冻结布局坐标 `dist/runtime/node-v22.23.1-darwin-<host-arch>/bin/node` 独立构造；receipt
  `officialNode.path` 与 raw argv-last 均降为被验值（新判据 `sign.receipt.officialNodePath`），
  冻结 SHA 门不变。采集端 `officialNodeFingerprint()` 改用同一构造器。
- preflight/full hard verdict → final manifest/status 的唯一映射；producer 自报值只作 parity：
  `verdictPreflightRun()` 内一处收口：任一 failure → `probe_failed`；恰
  `{status:'ok',classification:'passed'}` → `ok`；恰
  `{status:'failed',classification:'security_execution_domain_blocked'}` → 同名 blocked；
  其余 → `probe_failed`。`sign-probe.mjs` 不再由 `preflight.classification` 或 full summary
  重算 final status。
- full 六格的 stage root、subject/mode physical cell、sign/verify/display、launch、
  Node/SEA source、actual-entitlements、nested `.app` inner/outer/deep verify、spctl 与 run
  raw 真源闭口：
  `verdictSignCellRaw()` 逐格从 raw 重导 argv 目标、`exit/signal/error` 三项齐核
  （`rawCommandOk`）、具名 security evidence、flags（共享 `parseCodesignFlags` 重解析，
  `row.flags` 只作 parity）、`run` 的 `exit/timeouts` → launched（并与 `SIGN_MODES.launches`
  冻结形态互证）、签后 XML（带 entitlements 的格经绑定 plutil 重核六键；无 entitlements 的格
  raw stdout 必须**真的空**）。`verdictAppBundleRaw()` 闭合 `.app` 四条 raw 与 `nestedRun`，
  并退役原先由 `app.appPath` 反推预期 `spctl` 行的那一步（新判据 `sign.app.appPath`）。
  采集端补齐 `stageRoot`、`canonicalInputAbsolutePath` 与 actual-entitlements 的
  `artifact/lint/json`（R4 在 `readActualEntitlements()` 里把后三者丢掉了）。
- 至少四枚 production mutation 的 applied 校验、定向红数、结构性等价项、逐枚恢复与最终
  source SHA：
  baseline `probe-verdict.mjs` SHA-256
  `f2f3d480a13b2450171fbce51f670686af1901c396af833746c25a0caf0ebfc7`。
  `m-a` 撤跨架构 exit/deadline（变异后 `0645e31ebcac`，红 4：A1–A4）；
  `m-b` 撤 timeline 整轮严格推进（`<`→`<=`，`61d2b1e61ae9`，红 1：B2——B1 仍由 canonical 门
  守住，故红得准确）；`m-c` 撤 preflight hard verdict（回退 producer status，`d1a36b4cf4e8`，
  红 2：C1／C2）；`m-d` 撤 full 六格 raw 真源（`ec075dcfe452`，红 8：D1–D4／E3／E4a／E4b／
  「internal error 不串味」）。四枚逐枚校验 patch 命中（替换文本在、原文本不在、文件 SHA 变），
  还原后 SHA 均回 `f2f3d480a13b`（byte-identical），**总用例数每轮恒 384 不漂**。
  **无等价变异作废项**；`m-d` 未波及 E1b 与 E2 五枚，因它们由 occurrence 绑定与 `.app` raw
  两处独立守住。装置见 `scratchpad/r5-stage-b/mutate.mjs`，逐枚留档 `mut-m-*.txt`。
- built seatbelt control 的 blocked execution-domain id、manifest path/SHA：
  **未跑（受阻，按诚实协议停手）**。本实现域实测**非受限**（见下），不可能自证 Seatbelt
  blocked；不模拟、不伪造、不回填。留待架构按 provenance 例外另行安排，或由独立验收在自己的
  受限域自跑。
- 缺 sidecar build 混合态的 `probe_failed` execution-domain id、manifest path/SHA：
  **未跑（受阻，同上）**。
- 批准非受限域 preflight/full 六格的 execution-domain id、manifest path/SHA：
  三枚，manifest SHA-256 均为**外算**且与探针自报的 `manifestSha256` 逐枚相同；
  路径同构于 `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/<id>/manifest.json`：
  `impl-r5-preflight-1` → `probe_failed`（首跑，坐实两处实现缺陷）、
  `5b480f6c706bf04b82088e9653d0817571fe6be0a46caa07ae524ee9ac4d76e1`；
  `impl-r5-preflight-2` → `ok`/`passed`、
  `cba2d511147d14449dd340ee235cc52b3106c13f483b0f733109bdbcd693b4cd`；
  `impl-r5-full-1` → `ok`（六格 + 嵌套 `.app` 全过，同轮 49 条 command receipt）、
  `26125038e1f390e0efd52fdf3fcb3e3b59441e56eaf0576bd483b99aa726096e`。
  本域非受限的实测依据：control sign/verify/XML 全 0、控制 XML **568 bytes** 且绑定 `plutil`
  解出 canonical 六键全 `true`、官方 Node strict verify 通过并解出真实三条 Authority、
  `spctl` exact exit 3 `rejected`、`blockedReasons` 空、四个 gate 全 `true`。
  六格实测：两 subject × 三姿势 `signExit=0`/`verifyExit=0`，flags 逐格
  `0x2(adhoc)`／`0x10002(adhoc,runtime)`／`0x10002(adhoc,runtime)`，`launched` 逐格
  `true`／**`false`**／`true`（硬化无 entitlements 必须起不来的既知形态成立），
  actual-entitlements 逐格 `none`／`none`／`present`；`.app` 四条 exit 全 0、
  `nestedLaunched=true`、`nestedRun.timeouts=[]`、`spctlExit=3`。
- 从空 assembly 的 verdict baseline→R5 增量、既有 76 counterexamples 全量、R5 新增反例
  另计、600 cold-start、双 cycle、十件 inventory/source 与六格 sign：
  verdict **384/384 EXIT=0**（R2 203 + R3 21 + R4 132 = 356 baseline，R5 增量 **28**：
  23 枚 first-red + 5 枚阳性对照，分计）。
  双 cycle：从**空** assembly 连做两轮，`status:"ok" failures:0` EXIT=0——sealed 三档指纹各自
  相同、两架构 SEA `default` 各自相同、两架构 `code-cache` 各自**不同**（误报可复现同样判红）、
  跨架构注入 exact warning + `exit={code:0,signal:null}` + `timeouts:[]`。
  `measure`：`status:"ok" failures:0` EXIT=0，assembly 实物闭集 **28** 项（12 目录 + 16 文件）。
  cold-start：8 候选 × 3 轮 × 25 样本 = **600**，`status:"ok" failures:0` EXIT=0，三轮顺序
  各自为排列且非全同。runtime source 与来源门：`status:"ok" failures:0`。
  六格 sign：见上 `impl-r5-full-1`。既有 76 枚与 R5 新增反例见下两行。
- 既有 76 枚 counterexample 全量（逐枚实注入、还原、复绿）：
  **76/76 全量已闭合，escape 0**，在 tip `9466b51` 上以 `scratchpad/r5-stage-c/ce76.mjs`
  六组**严格串行**跑完（全程未并发任何仓库门、测试或其他矩阵项）。逐组：
  `sea` **8**（4 枚 `--fail-stage` exit 1 + 4 枚 `:evidence` exit 0）｜`fetchextract` **5**
  （fetch 4 + extract 1）｜`repro` **14**｜`measure` **23**｜`coldstart` **15**
  （13 枚 `--counterexample` exit 2 + `--rounds 1` / `--samples 10` 各 exit 1）｜
  `physical` **11**（10 枚 exit 1 + 反向对照 `reportsOutside` exit 0）＝ **76**，
  与 R2 冻结的分组口径逐组相同。逐枚「注入 → 真跑 → 核冻结退出码与命名判据 → 还原」；
  `physical` 每枚还原后另跑一次 `measure` 复绿；`sea` 四枚 `:evidence` 按 R2 口径逐项解析
  同轮 JSON（`row.status`/`row.stage`/该阶段非零 exit 与非空 stderr/`published:false`/
  `publishedPath:null`/后续阶段未冒充成功/`publishDir` 物理不存在/顶层 failures 只命中该阶段），
  九项子判据全 `true`。**每组结束后** `measure` 复核 assembly 全部 exit 0、
  代码残留行数全部 0。留档 `ce76-<组>.txt`、`ce76-<组>-postmeasure.txt`、`ce76-driver.txt`。
  **计数口径须连读**：`sea` 组打印 **9** 行记录 = 8 枚反例 + 1 行 `sea:restore→measure`
  还原复核（后者是组后 assembly 复建验证，**不是**反例）。故记录行合计 77、反例合计
  **76**。把 9 直接计入反例会得出 77 的错数——本回执按 76 记。
  耗时按 driver 实测（`ce76-driver.txt`）：跨度 12:57:33 → 17:25:02 ≈ **4 h 27 min**，
  其中约 **2 h 12 min** 是下述假停空转（13:03:15 → 15:15:17）；六组**净跑约 2 h 0 min**
  （sea 4m14s、fetchextract 29s、measure 37m27s、coldstart 21m58s、physical 34m49s、
  repro 补跑 20m55s）。此前回执里「约 6 小时」是**估算且偏高**，现按实测更正。
  **两处 harness 缺陷必须连读——它们属反例装置、不属 production，但「76 枚全量」这一宣称
  若不带下述说明即为失实**：
  1. **假停**：driver 的 `esc=$(grep -c '^XX ' … || echo 0)` 在零命中时，`grep -c` 先打印
     `0` 并以退出码 1 收束，`|| echo 0` 再补一枚，变量遂成两行 `"0\n0"` ≠ `"0"`，
     halt 条件被**计数管道自身**触发。sea 组 9/9 干净却被判停约 2 小时。真实逃逸为零。
     已修（取首行 + 空值兜底）并自第二组续跑。日志中的 `HALT_ON_GROUP … escapes=0\n0` 与
     `DRIVER_HALTED` 两行**原样保留**，是过程真相。
  2. **静默零**：`repro` 组首轮**14 枚从未注入**。`reproducibility-probe.mjs` 不支持
     `--list-counterexamples`（源码实测：`measure.mjs` 命中 2 处、`coldstart-rounds.mjs`
     1 处、`reproducibility-probe.mjs` **0** 处），未知 flag 被忽略、照常跑完整探针并
     exit 0 输出 JSON，枚举正则零匹配，于是「零枚待跑」被打印成
     `[repro] 共 0 枚，符合 0 枚，不符 0 枚`——**读起来像通过**。识别线索是它自称最慢组却只
     花 65 秒（15:17:17 → 15:18:22），且 harness 头注写明 14 枚。已修 `ce76.mjs` 两条：
     枚举为空**一律抛错硬失败**；不支持该 flag 的探针改从源码 `COUNTEREXAMPLES` 表直取名单。
     **首轮那行「共 0 枚」作废，不得作为通过证据**；`repro` 的 14 枚是**第二次运行**
     （17:04:07 → 17:25:02）才真实注入，逐枚 `applied=true caught=true`、期望 2 实测 2，
     post-measure exit 0、代码残留 0、逃逸 0。
  R5 未改动 R2–R4 的任何被这 76 枚覆盖的判据（判据名删除数为 0，已机器核实），故它们是
  **回归**证据而非本票新门证据——本票新门的覆盖见下一行与 384 例中的 R5 23 枚。
- R5 新增反例（四道新门，与 76 枚**分别计数**）：
  5 枚有效、1 枚等价变异作废，逐枚「注入 → 真跑 → 核非零与具名判据 → byte-identical 还原」。
  装置 `scratchpad/r5-stage-c/r5-counterexample.mjs`，逐枚留档 `ce-r5-ce-*.txt`：
  `r5-ce-1` 门 A**行为**注入（现生成受控桩：发 exact warning 与 ready 后忽略 EOF 永不退出）
  → exit 1、命中 `reproducibility.crossArch.timeouts`，还原 `bb12060193d9`；
  `r5-ce-2` 门 A 最终非零退出 → exit 1、命中 `reproducibility.crossArch.exit`，还原同上；
  `r5-ce-3` 门 B command timestamps 整列同填一常量 → exit 1、命中
  `sign.receipt.commandTimeline.advance`，还原 `056d014ba342`；
  `r5-ce-4` 门 C official target 同步漂移（`/bin/../bin/node`，解析到同一实物、字符串不等）
  → exit 1、命中 `sign.receipt.officialNodePath` 与 `sign.receipt.officialCommandBinding`，
  还原同上；`r5-ce-5` 门 D/E raw 失败摘要洗绿（raw `sign.exit=1`、摘要 `signExit=0`）
  → exit 1、命中 `sign.matrix.raw.sign`、`sign.matrix.raw.signExitParity`、
  `sign.receipt.commandBinding`，还原同上。
  **作废登记**：`r5-ce-5` 首版 patch 为 `row.signExit = signed.exit` → `row.signExit = 0`；
  健康轮里 `signed.exit` 本来就是 0，故该 patch 语义上是 no-op——实测 exit 0、零命中，
  属**等价变异**，如实登记、**不计红证**，已换成让 raw 与摘要真的分叉的有效形态。
  这四门尚未冻成探针常驻 `--counterexample` flag，属已登记的后续项，不得读成常驻脚本级反例。
- `pnpm -r build`、`pnpm lint`、`pnpm test`、
  `pnpm --filter @courtwork/desktop lint:isolation-binding`、`git diff --check` 独立退出码：
  **取数 tip = T1c `825f3bb`**（五门逐门独立跑、不用管道吞退出码，留档
  `scratchpad/r5-stage-c/gates.txt` 与 `g1`–`g5`）：
  `pnpm -r build` **0**；`pnpm lint` 首跑 **1** → 修后 **0**；`pnpm test` **0**
  （163 file / **1664** test 全过）；`pnpm --filter @courtwork/desktop lint:isolation-binding`
  **0**；`git diff --check` **0**。
  `pnpm lint` 首跑非零是**本票自身缺陷**，如实登记：`reproducibility-probe.mjs` 跨架构生命周期
  里 `let exit = null` 的初值被两条分支必然覆盖，`no-useless-assignment` 判死赋值（唯一一条
  error）。已改为不给初值（纯死赋值移除，无行为面：两分支各自必赋值，下游
  `exit ?? {code:null,signal:null}` 对 undefined 与 null 收束相同），提交为 T1c。
  因该文件在跨架构读数之后被编辑，按「门跑过又编辑就必须重跑」判例，跨架构读数已在 T1c 的
  最终 bytes 上**另跑一轮复核**（结果见下）。
  docs 提交后另跑一次 `git diff --check`，退出码与 T2 见回报。
- README 与原工程报告的 R5 追加、零路线建议、旧 `dist` 零回填：
  README 三处只追加/订正 R5 实测：上界准确范围（跨架构那一处已收窄；`measure.mjs` 恰四处裸
  `await proc.exited` 逐行点名，如实登记未收窄）、定向测试 356→**384** 并写明 R5 的 28 例
  分计口径、R5 四门 script 级反例与既有 `--counterexample` 分类说明。
  工程报告新增 §二十一（六小节：组合基线与 untouched target／判定层闭合了什么／first-red 账／
  mutation 账／执行域分开读／残留与最强反对意见），**零路线建议**。
  旧 `dist` 零回填：本轮全部读数取自本会话从空 assembly 起的运行，三枚 execution domain 均用
  fresh id，`dist/security-domain/` 下无既有 id 被覆盖（探针对既有 id 直接 exit 2）。
  残留实测（`clean.mjs --report-only`）：**4,889,013,119 B（4.55 GiB）**，逐项
  `security-domain` 3,149,904,049／`assembly` 1,143,565,916／`runtime` 473,562,352／
  `cross-arch` 115,806,624／`build` 5,854,166／读数 JSON 与反例留档合计约 0.3 MB。
  比 R2 的 2.36 GiB 大，主因是本轮留了三枚 execution domain 的完整证据。
- 实现提交、回执提交、最终 tree clean 与七路径精确改动面：
  实现提交先于回执提交。T1 `eb90bc6`（四个代码文件一枚：`lib/probe-verdict.mjs`、
  `probe-verdict.test.mjs`、`reproducibility-probe.mjs`、`sign-probe.mjs`）；
  T1b `7e2eb31`（Stage C 矩阵坐实的两处实现缺陷修复，只改 `sign-probe.mjs`）；
  docs 提交 T2 见回报。最终 `git status` 干净（`dist/` 为 `.gitignore` 覆盖的未跟踪产物）。
- 交付不可变实现 SHA 后待架构冻结的 `PI-SIDECAR-DIST-1R5-ACCEPT` target/允许面/反例/mutation：
  实现 SHA = T2（见回报）。建议冻结面：四个代码文件 + 本回执 + README + 工程报告 §二十一；
  反例面 = 23 枚 first-red + 5 枚阳性对照 + 76 枚既有 counterexample + 5 枚 R5 新增（作废项
  须保留其作废登记）；mutation 面 = `m-a`–`m-d` 四枚及其 baseline/变异/还原 SHA。
  **两格必须由验收或架构补跑**：Seatbelt 受限域 blocked 与缺 build 混合 `probe_failed`；
  本实现域非受限，二者不可由本会话自证。

实现提交先于回执提交，最终停在待独立验收。未获异会话 PASS 前，不 push、不 merge、不裁
sidecar 路线，不启动 `PI-HOST-LOOP-1` / DMG / Pages，不更新 `current.md` 或对外发布叙事。
