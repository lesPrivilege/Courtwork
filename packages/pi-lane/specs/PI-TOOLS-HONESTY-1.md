# `PI-TOOLS-HONESTY-1` 实现回执

冻结票面：`docs/architecture/implementation-readiness.md`「2026-08-04 审计双确认批」同名行。
基线 `f0d6df0`（`main`），分支 `claude/pi-tools-honesty-1`，worktree `.claude/worktrees/pi-tools-honesty-1`。
链：首轮实现 `f9cbc26` → 首轮回执 `39271f8` → 独立验收 REJECT `fa01eca` →
1R 实现 `801f522` → 1R 回执 `5528222` → 独立复验 REJECT `13eab2e` →
2R 实现 `84b8b7b` → 本回执（分支 tip）。

本票只做一件事：让只读检索面**说出它没做到的部分**。两枚缺陷同源——结果的不完整性
（截断、拒读）在结果里无处可说，于是残缺被报成完整。ADR-022 决定三与不变量四的落点。

## 一 · 结论速览

| 项 | 结果 |
|---|---|
| 缺陷① 200 条命中上限静默截断 | 已修：`matchesTruncated` 独立出字段与注记，与扫描上限两类可分辨 |
| 缺陷② 容器拒读整棵子树静默丢弃 | 已修：`skipped: {path, code}[]` 出 `details` 与文本注记 |
| **1R 拒因** `MAX_LINE_LENGTH` 行截断静默 | 已修（处方甲）：行尾具名标记＋原长、`lineTruncated` 计数、独立注记子句 |
| **1R 二次证伪** symlink 跳过 | 已修：`symlinksSkipped` 计数＋独立注记子句 |
| **1R 二次证伪** 产品 grammar 排除 | 本层结构上不可见（容器内 `continue`）→ 按边界显式登记＋全称句收窄＋随 env 契约移交 |
| **2R 拒因** 裸 NUL 行压掉真命中 | 已修：`nulLinesSkipped` 计数＋具名注记子句（点明「其中可能有命中」）；判据位置与二进制策略未动 |
| **2R 终局动作** 九条丢弃分支族表 | 十节，逐条带坐标与账目；`incompleteNote` 文档与 SPEC 五-8 均指向它，改函数先对表 |
| **2R 上浮** `readFile` U+FFFD 静默替换 | env 契约面，**不修**，随 grammar 排除、单条目 `lstat` 一并移交 `PI-WORKSPACE-READ-1` |
| CONTESTED（`PI_LANE_MAX_TURNS`/`MAX_USD` NaN） | 裁定 **startup fail-closed**；`PI_LANE_PORT` 同批同处置 |
| SPEC 五-5 / 五-7 / 五-8 | 随实装同批订正；另订六节（dev 环境变量）与九节（移交条） |
| 包级门 | `test` **500 例 / 16 文件**、`build`、`lint` 三枚 EXIT=0 |
| 变异 | **20 枚**逐一定向复红（首轮 11 ＋ 1R 六 ＋ 2R 三），全部还原、零残留 |

## 二 · 本单新增了什么概念、为何非加不可

只新增**两个**，都由「不完整性必须分因可见」直接拉动，没有引入抽象层、状态机或依赖：

1. **`SkippedEntry = { path, code }`**（含投影前的 `RawSkip`）。拒读是一类事实，既有字段里
   没有它的位置：`truncated` 归扫描上限、`matched` 归命中数，把拒读折进任何一枚都会造出
   第二种语义。`code` 直接取 `FileErrorCode`（上游闭集 8 枚），不自造第二套拒因词表。
2. **`matchesTruncated`**。它与 `truncated` 是两类来源，不是同一件事的两种说法：前者说
   「看到的命中没全列」（换更窄的模式），后者说「还有文件没看」（换起始目录）。合成一个布尔，
   两条行动路径都指不出来——这正是缺陷①的病理，不是它的表征。

`incompleteNote()` 与 `summarizeSkipCodes()` 是把上面两笔渲染成一句话的纯函数，不是新概念；
`projectSkipped()` 复用既有 `HitProjection`，**刻意不新建第二条投影链**。

**1R 追加**：零新概念，只把同一条账扩到剩下两类事实——`lineTruncated`（被裁尾的命中行数）与
`symlinksSkipped`（未跟随的链接数）都是计数，不是新抽象；`clipLine()` 是把既有
`line.slice(0, MAX_LINE_LENGTH)` 换成「文本与是否被裁同源返回」的 6 行纯函数，为的是让标记与
计数不可能各说各话。`incompleteNote` 的子句由三扩到五，形状不变。详见 8.2。

**2R 追加**：同样零新概念——`nulLinesSkipped` 是第三枚计数，子句由五扩到六。真正新增的不是
概念而是**一张表**（十节的九行族表）：本票被拒两次都是「按点名的实例收口，不是按族收口」，
族清单从此由实现方持有，`incompleteNote` 的文档与 SPEC 五-8 都指向它。表不是抽象层，是清单。

第三个落点 `dev-config.ts` 是 CONTESTED 裁定的实现位（见五节），29 行纯函数 + 无依赖。
它单独成文件的唯一理由：`sidecar-main.ts` 是顶层 `await` + `process.exit` 的装配壳，
结构上进不了单测面；判定逻辑放在壳里就等于放在测不到的地方。

**成熟开源优先（四选一）：保留自研，零新依赖。** 本票不新增能力面，只让既有 15 行 glob 翻译与
遍历如实出账。替换候选（`fast-glob`／`minimatch`／ripgrep 绑定）一律直接触碰 `node:fs` 或起子进程，
会把 ADR-022 决定二「工具只经 `ExecutionEnv` 取文件系统」这条容器边界打穿，且本票要的诚实字段
它们都不产出——引入等于既丢边界又要自己补账。

## 三 · 实装逐处（`packages/pi-lane/src/tools.ts`）

| # | 位置 | 改动 |
|---|---|---|
| 1 | `walkFiles` | 返回 `{ scanned, truncated, skipped }`；`listDir` 失败由 `continue` 改为**先登记后** `continue`。起始目录本身不可读也走这一支 |
| 2 | `glob.execute` | `matcher.test && matches.length < MAX` 拆开：命中但满额置 `matchesTruncated`（**真有第 201 条被丢**才置） |
| 3 | `grep.execute` 跨文件处 | 满额早返前置 `matchesTruncated = true`——「因命中已满而停止继续搜」是停止，不是搜完 |
| 4 | `grep.execute` 行层处 | NUL 判据与满额判据拆成两句（原先 `||` 合并）；满额置 `matchesTruncated` |
| 5 | `grep.execute` 读文件处 | `readTextLines` 失败由裸 `return` 改为登记进 `skippedFiles` |
| 6 | `incompleteNote` / `summarizeSkipCodes` | 三类来源各自成句、`；` 连缀，共用一句「结果可能不完整」；一条都不成立即**不出注记** |
| 7 | `projectSkipped` / `identityProjection` | 拒读路径与命中共用一条投影链；dev 形态空相对路径显示成 `.` |
| 8 | 两件工具的 `details` | 同批出 `matchesTruncated` 与 `skipped`，与文本注记两条通道各自被锚（M8/M9） |

`MAX_FILES_SCANNED`/`MAX_MATCHES`/`MAX_LINE_LENGTH` 三枚值、glob 语法、symlink 保守解、
write 与 host 面、wire 一概未动。`details` 不上 wire（`product-runtime.ts` 只读 `details.denied`），
故新增键不触碰 journal 或 golden。

**如实登记的两处语义边界**（已同批写入 SPEC 五-7）：

- glob 与 grep 的 `matchesTruncated` 精度不同。glob 遍历全程不停，故它的置位是精确的
  「确有命中被丢」；grep 满额即停止读后续文件/行，故满 200 条整时即便余下恰好零命中也置位。
  要让 grep 同样精确就得把该读的都读完，那正是上限要省的 I/O。宁可多报一次不完整。
- 命中满额之后遇到的拒读文件**不再进** `skipped`：那时已经不读了，由 `matchesTruncated` 一并说明。

## 四 · 证据表

命令一律 `pnpm --filter @courtwork/pi-lane <script>`，退出码单独取，无管道吞码。

### 4.1 先红后绿

| 相 | 命令 | 结果 | EXIT |
|---|---|---|---|
| 基线（改动前） | `test` | 469 例 / 15 文件 全绿 | 0 |
| **先红**（只加测试，实装未动） | `test` | **11 红** / 469 绿（480）；`dev-config.test.ts` 整文件加载失败（模块尚不存在），其 7 枚未计入 | 1 |
| 实装后首跑 | `test` | 1 红：`route manifest 与 product source 的跨侧核验`（expected 534219 / received **535040**）——见七节 D1 | 1 |
| 身份重录后 | `test` | 487 例全绿 | 0 |
| 终态 | `test` | **489 例 / 16 文件** 全绿 | 0 |
| 终态 | `build`（`tsc -p`） | 通过 | 0 |
| 终态 | `lint`（`eslint .`） | 通过 | 0 |

11 枚先红逐条（皆因 `details.skipped`/`matchesTruncated` 为 `undefined` 或注记缺席）：
两枚上限描述面 5 枚（未触上限、glob 满命中、grep 满命中、glob 满扫描、grep 满扫描）、
拒读面 6 枚（glob 子树、grep 目录+文件、拒读 vs 真无命中、起始目录、授权根自身、产品形态零泄漏）。

反例装置的**前置实证**写进 `beforeAll`：`readdir(密室)` 与 `readFile(不可读.md)` 必须真的抛
（以 root 身份跑时 `chmod 0` 不生效，那时此行显式红）——反例失效要自报，不能让后面几枚绿证空转。

### 4.2 变异（逐枚 apply → 跑 → restore，命中数校验恰为 1，否则拒绝改写）

**结构性附带红**：`tools.ts` 的每一枚变异都额外红一枚 `route manifest 跨侧核验`——sealed CJS
身份是 product source 的函数，源码一动即红。下表「定向红」已扣除该枚。

| 变异 | 内容 | 定向红 | 打中的判据 |
|---|---|---|---|
| M1 | glob `else matchesTruncated = true` → `false` | 1 | glob 满 200 命中 |
| M2 | grep 跨文件满额判据撤 `matchesTruncated` | 1 | grep 满 200 命中（250 份单行文件） |
| M3 | grep 行层满额判据撤 `matchesTruncated` | 1 | grep 单文件 250 行 |
| M4 | 撤目录拒读登记（`skipped.push`） | 5 | glob 子树／grep 两笔／起始目录／授权根／产品形态 |
| M5 | 撤文件拒读登记（`skippedFiles.push`） | 2 | grep 两笔／产品形态 |
| M6 | 注记退回「只报文件上限」旧文案（`details` 不动） | 7 | 三枚命中上限 + 四枚拒读文本 |
| M7 | 撤拒读路径投影（`path: absolute`） | 4 | dev 形态四枚 |
| M8 | 只撤 glob `details.matchesTruncated`（文本不动） | 3 | 未触上限／glob 满命中／glob 满扫描 |
| M9 | 只撤 grep `details.skipped`（文本不动） | 2 | grep 两笔／产品形态 |
| M10 | `dev-config` 有限正数门 → `value < 0` | 5 | NaN／Infinity／理由具名／不返回值／两条理由 |
| M11 | `dev-config` 撤空值专属分支 | 1 | 空值与坏值给两条理由 |

M6 与 M8/M9 是**成对**的：前者只动文本、后者只动字段，两侧各自有专属红——「双向唯一锚定」由此
成立，不是同一枚断言数了两遍。M2/M3 同理：250 份单行文件只打得到跨文件判据，250 行单文件只打得到
行层判据，两处互不遮蔽。

**M7 的读数须收窄**（否则会读成一句过头话）：撤投影只红 dev 形态四枚，**产品形态那枚仍绿**——
因为 `createProductCaseEnv` 是「逻辑进、逻辑出」，其 `listDir` 交出的 `entry.path` 本来就是
`/case/...`。产品面的物理根零泄漏由**容器**结构性给出，`projectSkipped` 在产品形态实为恒等；
它真正管的是 dev 形态的相对化与授权根空串那一支。测试名里的「零泄漏」因此锚的是容器，不是投影。

**M11 曾是等价变异**：`Number('') === 0`、`Number('   ') === 0` 都会被后面的「非正数」门接住，
撤掉空值分支时 `ok:false` 不变。故本票**补了一枚锚**——空值与坏值必须给出两条不同理由
（`PI_LANE_MAX_USD=` 与 `=十二` 不是同一种错），该分支这才有专属红。如实登记：这枚锚是在变异相
补的，不是先红后绿的顺序（同 D7）。

**M10/M11 不红 route-manifest 跨侧门**，这本身是一条证据：`dev-config.ts` 确实不在 product bundle 里，
CONTESTED 的修法没有把 dev 面的判定漏进产品制品。

## 五 · CONTESTED 裁定

**裁定：startup fail-closed。** 不取「dev-only 显式登记」。

核实的事实链：`sidecar-main.ts` 三处 `Number(process.env.X ?? 默认)` 无校验 → `PI_LANE_MAX_TURNS=十二`
得 `NaN` → `budget.ts` 的 `evaluate()` 里 `usd >= limits.maxUsd` 与 `turns >= limits.maxTurns`
双双恒假（`NaN` 参与的比较恒假）→ `exceeded` 永远为 `false`，ADR-022 决定三要的那道上限**整枚失守**，
且进程一声不吭。`PI_LANE_PORT` 同族但形态不同：`listen(NaN)` 被 Node 当 0 处理，服务起在随机端口，
而 banner 印着 `http://127.0.0.1:NaN`——用户按 banner 打不开，也不知道为什么。

取 fail-closed 的三条理由：

1. 它是不变量四的破口，不是「值不好看」。dev 线同样受不变量四约束，`SPEC` 六节此前也没登记这个例外；
2. 修法成本三行，且**先例就在同一文件**里：缺授权文件夹 → stderr 具名 + `exit(1)`；
3. 「dev-only 登记」要写的那段话，篇幅比修它更长，而且留下一枚活体陷阱：这条 dev 入口正是真 key
   复核（SPEC 七节）的唯一通道，预算失守在那里等于用别人的额度做无上限实验。

实现：`dev-config.ts` 的 `parsePositiveNumberEnv(name, raw, fallback)` —— 未设置取默认值；
设置了就必须是**有限正数**，否则回 `{ ok:false, reason }`，由 `sidecar-main.ts` 写 stderr 并 `exit(1)`。
**不回落默认值**：把用户写错的上限静默换成另一个上限，是同一种静默降级换了个位置。
判据只到「有限正数」——超端口值域、非整数端口这类，Node `listen` 自己抛 `ERR_SOCKET_BAD_PORT`，
已经是显式失败，不在此层再抄一份值域（少一处可漂移的真源）。

## 六 · 对 `PI-WORKSPACE-READ-1` 的移交

本票先行的收益就落在这里：`WORKSPACE-READ` 要动的正是 `walkFiles` 与这两件工具。

**便于双根扩展的断言形状**（本票已按此写，不实现双根）：

1. `walkFiles` 现在回 `{ scanned, truncated, skipped }` 一个整体。双根做法是**按根各跑一次、
   再归并三笔**（`scanned` 相加、`truncated` 或运算、`skipped` 拼接），字段形状与注记不必再改。
2. `skipped` 记的是**路径**（`{ path, code }`），不是「第几个根」。`/case/密室` 与
   `/workspace/稿件` 天然共存于同一数组，不需要新增 `root` 判别字段；
   测试断言用 `skipped.map(e => e.path).sort()`，加第二个根只是数组多两条，判据不必重写。
3. 路径出面**只经一枚 `HitProjection`**。第二个根接进来时改的是投影的构造（按前缀选根），
   `projectSkipped`／命中面／注记三处一律不动——今天没有第二条投影链可漂移，明天也不该有。
4. 上限字段是**全次调用**口径（一次 `glob`/`grep` 一份账），不是按根。双根若要按根出账，
   那是契约扩张，须回票面；本票的形状不预先替它决定。
5. 反例装置可直接复用：`sandbox(label, build)` 造独立容器、`runWith(context, ...)` 把同一批
   无状态工具跑在另一个容器上。加第二个根＝多一个 `sandbox` 与一个 `runWith`。

**同批交出的未收口缺口**（本票边界外，不静默）：`ExecutionEnv.listDir` 契约只回一个 `Result`，
目录内**单个条目** `lstat` 失败时，`scoped-env.ts:144` 与 `product-case-env.ts:312` 各有一处
`if (info.ok) entries.push(...)` 仍是静默略过。要修得动 env 契约本身（多一条 per-entry 的失败通道），
与双根改造是同一处接缝，故交给 `WORKSPACE-READ` 一并裁。已写入 SPEC 五-8 末段与九节。

**票面提到的 `specs/PI-WORKSPACE-READ-1-RECON.md` 在本树不存在**（见 D5），定序理由改据就绪图。

## 七 · 偏离登记

| # | 偏离 | 理由与处置 |
|---|---|---|
| D1 | **越了「不动 host 面」的字面边界**：改 `apps/desktop/src-tauri/pi-sidecar/route-manifest.json`（bytes/sha256）与 `apps/desktop/src-tauri/src/pi_loop_process.rs` 四处（冻结表 bytes、冻结表 sha、负注入语料 `"bytes":535040`、负注入语料 sha）+ 一段变迁注释 | sealed CJS 身份是 product source 的函数，`tools.ts` 一改必移。`product-main.test.ts` 的跨侧门**就是**为此设计的（本票实测红：534219→535040），Rust 冻结表注释亦自陈「不许只改一边」。零语义改动，只重录一枚测量值。首轮实测 535,040 B / `b3d974ef…`（验收本树独立重建逐值相同）；**1R 再移一次，现值 `buildDeterministicBundle()` 实测 535,827 B / `a9ae0f93f20bce27a42c3630ab5f76f6c19b7f511fe4b7b38c13913a03172072`、`reproducible: true`**（见 D11）。不改则包级门永远红，与票面「包级全绿」直接冲突 |
| D2 | 新增文件 `src/dev-config.ts` + `src/dev-config.test.ts` | CONTESTED 裁定的可测落点；`sidecar-main.ts` 结构上不可测（顶层 await + `process.exit`）。29 行纯函数、零依赖、不进 product bundle（M10/M11 实证） |
| D3 | SPEC §十 单测计数 469/15 → **489/16** | 该行体例自陈「每票只据实更新该计数」；不改即当日第二句活体假话 |
| D4 | SPEC 订正面大于票面点名的 五-7/五-8：另订 六节（dev 环境变量 fail-closed 段）与 九节（移交条） | 同一裁定的落点，留在旧措辞就是「不留两版真值」的反面 |
| D5 | 票面参考件 `packages/pi-lane/specs/PI-WORKSPACE-READ-1-RECON.md` **不存在** | 全仓 grep（去 `archive/`）只在就绪图 401/420 行、`ADR-022`、`SPEC.md`、`ACCEPTANCE.md` 与 `PI-WRITE-HOST-1-STAGE*` 里见到 `PI-WORKSPACE-READ-1` 引用，无 RECON 文件。定序理由改据就绪图 420 行「须早于 `PI-WORKSPACE-READ-1`」与 401 行票面；移交按六节自行编写 |
| D6 | `identityProjection` 由严格恒等改为「空相对路径 → `.`」 | 只在**授权根自身被拒读**时可达；命中面拿不到空相对路径（命中的是文件），故 dev 形态可观察输出仍逐字不变。注释与 SPEC 已登记 |
| D7 | 两枚测试是在变异相补的，非先红后绿：`grep 单文件内命中超限`（红证＝M3）、`空值与坏值给两条理由`（红证＝M11） | 前者补的是行层判据的专属语料（250 份单行文件打不到它），后者把一枚等价变异变成有区分力的变异。如实登记，不冒充先红 |
| D8 | **cargo 未跑** | 票面「不跑仓级门」；且本树无 `packages/pi-lane/dist/product-sidecar` 制品，cargo 需先跑 `build:product-sidecar`（下载并封装 ~112 MB runtime）。Rust 改动的机械核验已做：把 manifest 去空白后逐字核对负注入语料的 `replace` 靶——`"bytes":535040`、新 sha（小写）、`"machoArch":"arm64"` 三枚全部命中，旧值 `534219`/`8520026c` 零残留。**靶落空即静默 no-op**，那正是「变异没生效」的假绿形态，故这一步不能省。cargo 实跑留给验收/合入相 |
| D9 | `docs/status/current.md` 的 sidecar 身份叙事（`534,219 B`/`8520026c…`）**未改** | 它记的是 `PI-WRITE-HOST-1` 清账当时的事实，本身仍成立；但被当作「现值」读时会过时。能力状态只由架构在 current.md 更新——合入相请同批改为 `535,040 B`/`b3d974ef…` |
| D10 | `specs/PI-WRITE-HOST-1-STAGE5/6/7.md` 与 `ACCEPTANCE.md` 里的旧身份值未动 | 它们是历史回执，记的是当时实测；改历史回执才是造假 |
| **D11**（1R） | sealed CJS 身份**第三录**：535,040 / `b3d974ef…` → **535,827 / `a9ae0f93…`**。同批改七处：`route-manifest.json` 二值、`pi_loop_process.rs` 冻结表二值＋负注入二靶＋变迁注释一处 | 与 D1 同理，1R 再动 `tools.ts` 必再移。已复核负注入 `replace` 三枚靶在去空白 manifest 上全部命中、旧值零残留（靶落空＝静默 no-op 假绿）。**验收首轮跑过的 cargo 218/0/1 须随 1R 复跑**——本树仍无制品，未跑（见 D8） |
| **D12**（1R） | 改了一枚**首轮已被验收独立复现通过**的测试：`未触任一上限时两枚字段都出 false，且不附注记` → 改用无 symlink 的干净 sandbox 并更名为 `未触任一来源时诸字段都出空值，且不附注记` | 该枚原跑在主 fixture 上，而主 fixture 含一条 `外链` symlink——在 1R 口径下那棵树本就不完整，用它证「无注记」等于自证前提。属验收「勿重做」范围内的**必要**改动，如实登记：首轮那条正面证据当时是在一棵不完整的树上取得的 |
| **D13**（1R） | 全称句由「无注记即完整」收窄为「无注记 ⇒ **容器交给本层的**每个条目都被检索、每条命中都完整列出」，并把容器层两处排除登记为显式边界 | 验收给的甲／乙两方案按**可观察性分层合成**：本层看得见的两形按甲收口，看不见的一形按乙登记——后者按甲**结构上不可实施**（工具收不到那些条目，`ExecutionEnv` 无第二通道）。分层本身请架构追认 |
| **D14**（1R） | glob 的 `details` 不出 `lineTruncated`（只 grep 出），`incompleteNote` 对 glob 恒传 0 | glob 出文件名、无行可截；恒 0 的字段会诱人误读成「glob 也会截行」。取「字段只在有意义处出现」，如实登记这不是遗漏 |
| **D15**（2R） | sealed CJS 身份**第四录**：535,827 / `a9ae0f93…` → **536,123 / `060cc00a…`**（`reproducible: true`）。同批改**九处**：`route-manifest.json` 二值、`pi_loop_process.rs` 冻结表二值＋负注入二靶＋变迁注释（本次把注释改写成「第四次换、其中三轮各移一次」的完整链，不再只留末值） | 与 D1／D11 同理。已复核负注入三枚靶在去空白 manifest 上全部命中、旧值 `535827`／`a9ae0f93` 在源码与配置中零活体残留。cargo 须三验重跑（本树无制品，按票面未跑） |
| **D16**（2R） | `nulLinesSkipped` 的**命名与粒度**属契约，本票按协调指令取「按**行**计」并命名 `nulLinesSkipped` | 复验给的两种粒度（按行／按份）都被认可，协调指令明确点名 `nulLinesSkipped`。按行＝与分支同位、零新增状态；按份更好读但要引入文件级状态与路径投影两个新概念。已在 SPEC 五-8 登记这一取舍，**请架构追认粒度** |
| **D17**（2R） | 回执新增十节「九行丢弃分支族表」，并由 `incompleteNote` 文档与 SPEC 五-8 双向指回 | 协调指令第 3 条要求；同时是本票两次被拒的终局教训落痕——族清单由实现方持有，不再靠逐次验收发现成员 |

## 八 · 1R 返修（独立验收 `fa01eca` 判 REJECT 后）

一至七节是**首轮记录**，除下列被 1R 取代的数字外原样保留（改历史回执才是造假）：
一节速览表、D1／D9 的制品身份值已随 1R 更新为现值，其余保持首轮真值。

### 8.1 拒因与裁定

单一拒因（验收报告第二节）：`tools.ts` 的 `line.slice(0, MAX_LINE_LENGTH)` 仍在**无标记地**
切掉命中行尾部——1211 字的合同条款切到 400 字，`truncated`／`matchesTruncated`／`skipped`
三枚全报完整；而首轮**新写入** SPEC 五-8 与 `incompleteNote` 文档的「来源恰三类／没有注记即
结果完整」是一句闭集全称句，被同函数邻行当场证伪。ADR-022:110–111 把「截断未显式」逐字列为
harness 缺陷。同句另被两条既有行为二次证伪：symlink 跳过、产品 grammar 排除。

自评：这枚拒得准。三枚上限都被点到眼前，只把两枚诚实化，第三枚连一行登记都没有；更糟的是
**首轮亲手把断言写强**（旧 五-7 只说「超限须显式告知」，没有闭集承诺），于是把一个既有缺口
变成一句新的活体假话——D3 自己的判据在这里反向适用。

协调裁定取**处方甲**（诚实机器形）。1R 按可观察性分层执行，这一分层请架构追认（D13）：

| 形态 | 本层能否观察 | 1R 处置 |
|---|---|---|
| 行截断（`MAX_LINE_LENGTH`） | 能（就在本函数里） | 甲：行尾具名标记＋原长、`lineTruncated` 计数、独立注记子句 |
| symlink 不跟随 | 能（`entry.kind === 'symlink'`） | 甲：`symlinksSkipped` 计数＋独立注记子句 |
| 产品 grammar 排除 | **不能** | 乙：`ExecutionEnv` 无第二通道，工具连条目存在都不知道；按边界显式登记（SPEC 五-8）＋全称句收窄＋随 env 契约移交 |

第三形按甲无法实施：`product-case-env.ts:310` 在**容器内**就 `continue` 掉了保留名条目，
`listDir` 的 `Result<FileInfo[], FileError>` 没有位置放「我丢了什么」。硬要工具替它作保，
就是用第二句假话补第一句。故全称句收窄为**有明确含义**的那一句：

> 没有注记 ⇒ **容器交给本层的**每一个条目都被检索、每一条命中都完整列出。

### 8.2 实装（`tools.ts`）

| # | 位置 | 改动 |
|---|---|---|
| 9 | `clipLine()`（新） | 出面文本与「是否被裁」**同源返回**：撤标记就不可能仍报未裁。标记形如 `…（本行截断：原 1211 字符，只给前 400）`——原长一并给，模型据此判断还差多少、要不要改用 `read` |
| 10 | `grep` 行层 | `lineTruncated` 计数；`hits.push` 改用 `clipLine().text` |
| 11 | `walkFiles` | symlink 分支由裸 `continue` 改为**先计数**；返回值增 `symlinks` |
| 12 | `incompleteNote` | 子句由三类扩到**五类**（新增行截断、symlink），文档同批改写为收窄后的全称句与「不替容器作保」的边界 |
| 13 | 两件工具 `details` | glob 增 `symlinksSkipped`；grep 增 `lineTruncated` 与 `symlinksSkipped` |

`MAX_LINE_LENGTH=400` 逐字未动（禁区）。glob 的 `details` **不出** `lineTruncated`——glob 出的是
文件名，没有行可截，恒 0 的字段只会诱人误读（D14）。

### 8.3 先红后绿

| 相 | 结果 | EXIT |
|---|---|---|
| 1R 先红（只加测试，实装未动） | **7 红** / 488 绿（495） | 1 |
| 实装后 | 1 红：`route manifest 跨侧核验`（expected 535040 / received **535827**） | 1 |
| 身份第三录后 | 495 全绿 | 0 |
| 拆分标记/字段两枚锚后（终态） | **496 例 / 16 文件** 全绿；`build`、`lint` 各 0 | 0 |

7 枚先红：验收反例（1211 字行）、行截断进注记、未超长零标记、symlink 双工具、symlink 产品形态、
grammar 收窄形、以及**首轮那枚「无注记即完整」正面语料**——它原本跑在含 symlink 的主 fixture 上，
在 1R 口径下那棵树本就不完整，故改用无 symlink 的干净 sandbox（D12）。这一枚红本身就是拒因的
独立复现：首轮的正面证据当时是**在一棵不完整的树上**取得的。

### 8.4 1R 变异（同一夹具，命中数校验恰为 1；结构性 route-manifest 红已扣除）

| 变异 | 内容 | 定向红 | 打中的判据 |
|---|---|---|---|
| M12 | 撤行截断**标记**（字段与注记仍在） | 1 | 验收反例·标记与原长 |
| M13 | 撤 grep `details.lineTruncated`（标记与注记仍在） | 2 | 验收反例·计数／未超长零标记 |
| M14 | 撤行截断**注记子句**（标记与字段仍在） | 1 | 行截断进注记 |
| M15 | 撤 glob `details.symlinksSkipped` | 4 | 干净树无注记／symlink 双工具／symlink 产品形态／grammar 收窄形 |
| M16 | 撤 symlink **注记子句** | 2 | symlink 双工具／symlink 产品形态 |
| M17 | 撤 `walkFiles` 的**计数源**（`symlinks += 1`） | 2 | symlink 双工具／symlink 产品形态 |

M12／M13／M14 是**三向互斥**的：标记、字段、注记各有专属红，任一撤除都不被另两条遮蔽——
首版把标记与字段写在同一枚断言里，M12 与 M13 会红同一枚，遂拆成两枚测试再复跑，上表是拆后实测。
M15／M16／M17 同理覆盖 symlink 的字段、注记与计数源三层。

### 8.5 SPEC 订正

- **五-5**：symlink 不跟随的保守解不变，追加「跳过要出账」与字段/注记形态；
- **五-7**：改写为「单次调用上限**恰三枚**」，行截断入列，登记标记形态与 UTF-16 代理对切半的已知边界；
- **五-8**：全称句收窄为上引那一句，并**逐条登记**容器层两处不可观察排除（grammar 排除、单条目
  `lstat` 失败）与移交去向；
- **九节移交条**：`walkFiles` 返回值增 `symlinks`，交出的未收口缺口由一处增为两处；
- **§十 订数**：489/16 → **496/16**。

## 九 · 2R 返修（独立复验 `13eab2e` 判 REJECT 后）

### 9.1 拒因与自评

单一再拒因：`grep` 的裸 NUL 分支（判据在 `matcher.test` **之前**）压掉整行且不进任何账。
复验三臂反例：案卷内一份「像 PDF 的」件，正文含 `合同编号 HT-2024-081` 且该行带裸 NUL →
dev 与产品两形态皆报 `无命中`、六枚字段全净、**且附着一句结构性的「结果完整」保证**；
去 NUL 对照臂立刻 `matched:1`——被压掉的是一条真命中，不是「本来就没有」。

自评：这枚也拒得准，而且比 1R 那枚更该早发现。1R 我已经把处置规则立成「本层可观察 → 甲路」，
NUL 判据 100% 落在规则内（判断就写在本层、用本层手里的整行数据做出），**但我没有按自己立的
规则把函数扫一遍**，于是又留下一枚落在规则内、却被新写的闭集句（「恰五类」）盖住的成员。
判例「闭口按族不按验收点名的实例」在本票第二次适用：首轮是没立族，1R 是立了族没点完成员。
2R 的实际处方因此不止是修这一枚，而是**把族清单做出来交给下一个人**（十节）。

### 9.2 实装

| # | 位置 | 改动 |
|---|---|---|
| 14 | `grep` 行层 NUL 分支 | 裸 `return` 改为**先计数**（`nulLinesSkipped += 1`）；判据位置与「二进制不喂给模型」的策略**一字未改** |
| 15 | `incompleteNote` | 第六类子句：「另有 N 行含裸 NUL，已按二进制跳过（未按文本检索，**其中可能有命中**）」——判据在 matcher 之前，故这句必须点明可能有命中 |
| 16 | grep `details` | 增 `nulLinesSkipped`；glob 恒传 0（不读行内容，与 `lineTruncated` 同理，D14） |
| 17 | `incompleteNote` 文档 | 「五类」→「六类」，并写明该口径来自**九条分支的逐条扫描**、改函数先对十节的表 |

粒度取**行**（与分支同位、零新增状态）。按文件报「哪几份疑似二进制」更好读，但要引入第二个
概念（文件级状态 + 路径投影），复杂度节制下本票不加，已在 SPEC 五-8 登记这一取舍。

### 9.3 先红后绿

| 相 | 结果 | EXIT |
|---|---|---|
| 2R 先红（只加测试，实装未动） | **4 红** / 496 绿（500） | 1 |
| 实装后 | 2 红：`route manifest 跨侧核验`（535827 → **536123**）＋对照臂**自伤一枚** | 1 |
| 修自伤 ＋ 身份第四录后（终态） | **500 例 / 16 文件** 全绿；`build`、`lint` 各 0 | 0 |

**自伤一枚如实登记**：对照臂原写 `expect(text).not.toContain('二进制')`，而语料正文本身就含
「二进制」三字（`附件二进制尾`），命中行一出面即自撞。改为只认注记子句 `按二进制跳过`。
教训与首轮的「反例装置须自证有效」同族：**断言的判别词不得与语料词表相交**。

### 9.4 2R 变异（结构性 route-manifest 红已扣除）

| 变异 | 内容 | 定向红 | 打中的判据 |
|---|---|---|---|
| M18 | 撤 grep `details.nulLinesSkipped`（计数与注记仍在） | 3 | 对照臂／dev 计数／产品形态 |
| M19 | 撤 NUL **注记子句**（计数与字段仍在） | 2 | dev 注记／产品形态 |
| M20 | 撤**计数源** `nulLinesSkipped += 1`（字段与注记管道仍在） | 3 | dev 注记／dev 计数／产品形态 |

三向窗口成立：M18 不红「dev 注记」、M19 不红「dev 计数」、M20 不红对照臂（0 仍是 0）。
与 1R 的 M12/M13/M14（行截断族）同形。

### 9.5 SPEC 订正与同批上浮

- **五-8**：「恰五类」→「**恰六类**」，写明口径来自九分支逐条扫描并链到十节族表；补记 NUL
  判据位置（matcher 之前，故跳过的行里可能有真命中）与计数粒度取舍；
- **五-8 末段容器层清单由两处增为三处**：新增复验上浮的
  `readFile(…, 'utf8')` 把非法 UTF-8 静默换成 U+FFFD——它是「改内容」而非「丢条目」，
  但同属 env 契约面，**本票不修**，随 `PI-WORKSPACE-READ-1` 一并收口（ADR-022 六-B.1 只禁了
  wire 侧的「替换后继续」，读取侧无对应条款，这一条同批交出）；
- **九节移交条**：未收口处两处→三处，另交出族表；
- **§十 订数**：496/16 → **500/16**。

## 十 · `tools.ts` 检索路径丢弃/限幅分支族表（改本函数先对表）

坐标以 2R tip 的 `packages/pi-lane/src/tools.ts` 为准（行号会漂，条件与函数名不漂）。
**九条丢弃/限幅分支，现全部有账**：

| # | 位置 | 分支条件 | 账目 | 出账形态 |
|---|---|---|---|---|
| 1 | `walkFiles:104` | `!listed.ok`（目录/起始目录拒读） | `skipped` | `details` 逐条 `{path,code}` ＋注记「N 处不可读已跳过：<拒因计数>」 |
| 2 | `walkFiles:112` | `entry.kind === 'symlink'` | `symlinksSkipped` | 计数 ＋注记「N 处符号链接未跟随」 |
| 3 | `walkFiles:120` | `scanned >= MAX_FILES_SCANNED` | `truncated` | 布尔 ＋注记「已达扫描上限 2000 份文件」 |
| 4 | `glob:257-258` | `matches.length >= MAX_MATCHES`（第 201 条命中被丢） | `matchesTruncated` | 布尔 ＋注记「已达命中上限 200 份」 |
| 5 | `grep:318` | `hits >= MAX_MATCHES`（跨文件：不再读下一份） | `matchesTruncated` | 同上（量词「条」） |
| 6 | `grep:324` | `!read.ok`（文件拒读） | `skipped` | 同 #1，与目录拒读同账 |
| 7 | `grep:334` | `line.includes('\u0000')`（裸 NUL 行） | `nulLinesSkipped` | 计数 ＋注记「N 行含裸 NUL，已按二进制跳过（其中可能有命中）」 |
| 8 | `grep:338` | `hits >= MAX_MATCHES`（行层：不再看下一行） | `matchesTruncated` | 同 #5 |
| 9 | `clipLine:140/142` | `line.length > MAX_LINE_LENGTH` | `lineTruncated` | 计数 ＋**行尾具名标记**（带原长） |

**同函数内不属于本族的分支**（一并点名，否则「九条」无法自证穷尽）：

- `globToRegExp:73/77` 两处 `continue`——模式**解析**推进，不丢内容；
- `walkFiles:101` `if (directory === undefined) break;`——队列取空的防御性守卫，`queue.length > 0`
  已保证不可达；
- `walkFiles:117` `entry.kind === 'directory'` → `queue.push`——入队继续走，不是丢弃；
- `glob:256`、`grep:342` 两处 `!matcher.test(...)`——「不命中」是检索**结论**，不是丢弃；
  把它们计入就会把「没有」报成「可能有」。

六类口径与九条分支的对应：#4/#5/#8 同账 `matchesTruncated`，#1/#6 同账 `skipped`，
其余各占一类 → 9 条分支 ⇒ **6 类来源**。`incompleteNote` 的子句数与此表逐条对得上。

## 十一 · 停止边界

- 未跑仓级门（`pnpm -r build` / `pnpm lint` / root `pnpm test` / desktop / cargo / Playwright），按票面。
  **2R 特别提示**：复验在 `5528222` 跑过的八相全量门（root **1881**、cargo 218/0/1、PW 352）
  **不覆盖 2R**——2R 又动了 `tools.ts` 与七处 Rust/manifest 钉值，root 例数应为 1881＋4＝**1885**
  （本会话未跑，只作对账口径），cargo 与 PW 须三验重跑。
- 未动 `write` 与 host 行为面、未改 wire、未改三枚上限值（含 `MAX_LINE_LENGTH`）、未扩 glob 语法、
  未改 symlink 保守解与 NUL 二进制判据（只让跳过出账，判据位置一字未动）。
- 容器层**三处**（产品 grammar 排除、单条目 `lstat` 失败、`readFile` U+FFFD 静默替换）**未修**，
  按边界登记并移交——它们都要改 `ExecutionEnv` 契约，属 `PI-WORKSPACE-READ-1`。
- 未更新 `docs/status/current.md` 与就绪图（架构面）。合入相请把 sidecar 身份改为
  **536,123 B / `060cc00a…`**（既不是首轮的 535,040，也不是 1R 的 535,827）。
- 未 merge、未 push、未开下游票；验收 worktree `.claude/worktrees/accept-pth` 由验收员保留待三验。
