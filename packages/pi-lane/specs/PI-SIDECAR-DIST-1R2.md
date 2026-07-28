# PI-SIDECAR-DIST-1R2 · 物理证据闭口返修回执

状态：待独立验收。权威契约只认父级 [`SPEC.md`](../SPEC.md)「并行相邻票与合流门」、
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-E 与实现就绪图同名行；本文件是该
工单的独占实现回执，不得在这里裁分发路线、改 inventory/timeout/SHA 语义或宣称发行成熟度。

实现会话只更新本回执，不改父级文档、1/1R 旧回执或 ACCEPTANCE：

## 组合基线与目标 SHA

`166a89ab4810c97320677b21dbb1ec948131dad2`。从票面指定的 `main@deb9d6b` 新建 clean worktree／分支
`codex/pi-sidecar-dist-1r2`（`/private/tmp/courtwork-pi-sidecar-dist-1r2`），顺取
`e364868 → 43c1ae7 → 1d4329e → 7a500d1 → ba71df8 → 61c2b09 → f261347`，
七枚 cherry-pick **全部无冲突**。组合后的树与 `f261347` 的差异恰为 `deb9d6b` 基线自带的五文件
（`docs/architecture/implementation-readiness.md`、`docs/decisions/ADR-022-pi-lane.md`、
`packages/pi-lane/SPEC.md`、`specs/PI-CODE-STDIO-1R2.md`、`specs/PI-SIDECAR-DIST-1R2.md`）；
fixture 与报告部分逐字节相同。

**施工期间 `main` 前进至 `197274d`**（`docs(architecture): make thin pi the debug-only
convergence gate`）。该提交触碰 `ADR-022` 与实现就绪图两份本票权威文件，故逐项复核：
六-E 的 **`PI-SIDECAR-DIST-1R2` 条款零变动**（assembly 闭集、cold-start 逐枚、SHA 有效性、
五个 deadline、SEA 四阶段、残留三口径并列均原文未改）；就绪图对本票的行亦未改，
新增的是**下游** `PI-DEBUG-BUILD-1` 行，其依赖写明「`PI-SIDECAR-DIST-1R2` 已放行并裁路线」。
六-E 另两处变动是 `PI-SIDECAR-RELEASE-1` 由「released 前置」改记 **parked**、
新增 `PI-DEBUG-BUILD-1` 第 3 条——两者都在本票下游，不改本票验收口径。
**故组合基线仍然有效，本票未 rebase。**

## 实现提交

`42858b2f011535d9e3d9cf4fc0d599a4a0df3c78`。改动 11 文件，全部在票面白名单内：
fixture `README.md`，`scripts/` 下 `build-sealed.mjs`、`build-sea.mjs`、`measure.mjs`、
`coldstart-rounds.mjs`、`reproducibility-probe.mjs`、`clean.mjs`，
`scripts/lib/toolkit.mjs`、`scripts/lib/probe-verdict.mjs`、`scripts/probe-verdict.test.mjs`，
原工程报告 `docs/engineering/pi-sidecar-dist-1.md` 与本回执。

**冻结面逐项复核为 `git diff` 空**：`fetch-runtime.mjs`、`extract-runtime.mjs`、
`sidecar-fixture.mjs`、`sign-probe.mjs`、1/1R 旧回执、`ACCEPTANCE.md`、
`packages/pi-lane/package.json`、根 `pnpm-lock.yaml`、`packages/pi-lane/SPEC.md`、
`ADR-022`、生产源码、`apps/**`、Tauri/Rust/GUI。未 push、未 merge。

## `f261347` 三枚 blocker 的逐项先红

三枚**均在未改 production 的 R1 tree 上先红**，留档 `dist/first-red/`：

- **blocker 1（磁盘多一件）** 取物理实验，与 `f261347` 同法：R1 布局的 `dist/route-a/` 下真落
  `unexpected-physical/proof.txt`（100 B），不删不改任何预期产物，跑**未改的** `measure.mjs`。
  实测十件 probe 全部执行完毕（10 件在位、8 枚候选各真跑一轮 loop），输出
  `status=ok failures=0`，进程 **exit 0**。原始留档
  `dist/first-red/blocker1-measurements-R1-production.json`（`status:"ok"`、`failureCount:0`）。
  未走判定层，是因为 R1 production 里压根没有枚举磁盘的函数，缺函数只会红在模块加载。
- **blocker 2 / 3** 取判定层直调，喂 `f261347` 坐实的真实收束形状：`round.identity` 为漂移**后**
  的正确值且 `identityDrift` 非 null → `verdictColdstart` 返回 `[]`；`seaDefault` 两项
  `shas:[null,null]`、`identical:true` → `verdictReproducibility` 返回 `[]`。
  定向测试由 102 例增至 105 例、**红 3 例**，失败信息均为「期望判红，实际零失败」。

## 第二轮独立审查五项缺口的先红与闭口

五项与上面三枚无关，是**收紧之后**另一轮独立审查坐实的假绿。全部先红后修，
共 **28 枚首红**（缺口一 5、缺口二 4、缺口三 6、缺口四 2、缺口五 11），留档
`dist/first-red/five-gaps-first-red.txt`：

1. **可复现性 `path` 未绑库存项**：`deterministic()` 只问非空字符串。改为
   `deterministic(label,row,expectedPath,expectIdentical)` 的 **exact equality**，预期坐标由
   `sealedBundleAssemblyPath()`／`seaExecutableAssemblyPath()` 单点算出；错 cell、`../outside`、
   错扩展名因此同时被拒。另修正 good fixture：sealed `cjs` 档原写成 `sidecar.mjs`，正确为 `.cjs`。
2. **assembly 根自身的 symlink 被跟随**：根原只做 `existsSync` 再 `readdirSync`。改为先对根
   `lstat`、observation 明记 `rootType`，只有真实 `dir` 才递归；判定层独立守 `assembly.rootType`。
   首红含**真实文件系统**反例（临时目录造完整合格树、以 symlink 作根）。
3. **cold-start 逐枚样本身份不完整**：原只查 `samples.length===25`、warmup 总数 3、
   `keptSamples===22`。改为 ordinal 严格等于数组下标（`0..24` 各一次且顺序完整）、
   `warmup === (index<3)`、`keptSamples` 同时等于 22 与**实际**非 warmup 计数、轮号严格 `1,2,3`。
4. **三条 cleanup 分支吞掉 kill-confirm 超时**：initial ready 超时、respawn-ready 超时、
   respawn 后 EOF 超时三处调完 `killAndConfirm()` 即丢返回值。新增窄接缝
   `killAndConfirmInto(proc,timeoutMs,timeouts)`，四处 cleanup 共用，返回 `null` 即追加
   `kill-confirm`（不顶替既有超时）。**首红取「把当前的丢弃语义原样搬进该接缝」**，
   故红落在被丢弃的返回值上，不是「函数不存在」的模块加载错。
5. **SEA 失败证据只证明「红了」**：`verdictSeaBuild()` 原只看 stage exit 与 `published`。
   改为成功行核 `status:'ok'`＋四阶段全 0＋`published`＋有效 `publishedPath`＋`publishDirPresent`；
   失败行核 `status:'failed'`＋`stage` 等于**第一个非零阶段**＋该阶段非零 exit 与非空 stderr＋
   `published:false`＋`publishedPath:null`＋`publishDirPresent:false`，其后阶段可缺席但不得冒充
   成功。`build-sea.mjs` 相应产出 `stage`／`publishedPath`／`publishDirPresent`／`stagingPresent`，
   物理存在性一律用 `lstat`（不是 `-f`），file/dir/symlink 任何一种都算残留。

## 有效 source mutation

口径：**保持观察形状不变，只松掉待验证的那一层判据**。基线 **202/202 全绿**。

| 变异 | 松掉的判据 | 红例数 |
|---|---|---|
| G1 | repro path exact equality → 非空字符串 | 5 |
| G2 | 判定层 `assembly.rootType` 门删除 | 3 |
| G2FS | 采集侧改用会跟随的 `statSync` | 1 |
| G3 | cold-start 退回 count-only | 6 |
| G4 | `killAndConfirmInto()` 重新丢弃返回值 | 2 |
| G5 | SEA 只看 stage exit 与 `published` | 10 |

每枚变异下「合格观察即通过」那一例均未变红。矩阵留档 `dist/first-red/mutation-matrix.md`。

**过程失败如实登记（三处，均不计入证据）**：

1. G2 首轮 **200/200 全绿**——判定层 `rootType` 门被删也测不出来，因为当时那条用例只断言
   `failed()`，而 symlink 根的 `entries` 为空、光凭闭集缺件也会红。修正为核具名判据
   `assembly.rootType`，并补一枚判定层独立用例（`rootType:'symlink'` ＋**完整 entries**），
   G2 随即红 3 例。
2. 更早两次作废探针：整份换回 R1 判定层 → 红在 import；判定与观察形状一起换回 →
   红在「合格观察即通过」。均零区分力。
3. **补跑被排了两次队**：两个等待器各排一次、只有一个带互斥，主跑标记落地后两份实例
   并发互删 `staging/`，产出三条 `repro:path.*` 假不符（`expected=2 actual=1`，实为
   `mustRun()` 抛出）。**整批 29 条移出主账**（留档 `dist/r2-evidence/VOID-raced-supplement.*`），
   不按条挑拣；补跑改 `mkdir` 原子锁单实例并与最终矩阵合进同一进程。主跑 79 条不受影响。
   该缺口证据不依赖那三条：定向用例 5 枚 + 变异 G1 红 5 例，两路独立成立。

## fixture 内 `dist/assembly` 的 repo-relative 根与实物闭集

唯一随包目录 `packages/pi-lane/fixtures/sidecar-dist/dist/assembly/`；构建 scratch
（`dist/build/`）、`runtime/`、`corpus/`、读数 JSON、`final/`、`counterexamples/` 与
`r2-evidence/` 全在其外。采集侧用 `readdir`（取名）+ `lstat`（定类型）逐层枚举，
**只对真目录递归**，故 symlink 如实报成 `symlink` 而非其指向的类型。
期望闭集恰 **12 目录 + 16 文件**：顶层恰 `route-a`／`route-b`，其下恰 6／4 个
`<triple>--<variant>`，route A 每目录恰 executable + 指定 bundle，route B 每目录恰 executable。

## 额外 file/dir/non-regular 与报告外置反例

见「反例总账」。物理面覆盖额外文件、额外目录（`f261347` 原形状）、第三条 route、FIFO、
symlink 制品、**symlink 根**、缺件、缺随行 bundle、错 basename、嵌套子目录，
外加一枚**反向对照**：读数 JSON／build scratch／runtime／corpus 就位时判据必须判绿。

## 逐 cold-start sample identity/EOF

每轮保留 25 枚 `{sample,warmup,identity,elapsedMs,eof}`，逐枚校验身份三元组与 EOF；
三枚 warmup 只从**性能统计**排除，安全门一视同仁。`identityDrift` 非 null 即硬失败。
另按第二轮审查收紧：ordinal 严格等于数组下标（`0..24` 各一次且顺序完整）、
`warmup === (index<3)`、`keptSamples` 同时等于 22 与实际非 warmup 计数、轮号严格 `1,2,3`。
实测 **600 枚样本**（8×3×25），warmup **72** 枚，`identityDrift` 非 null 轮数 **0**。

## regular-file/bytes/64hex SHA 门

双 cycle 每项先证「path 等于唯一预期坐标 / exists / regular-file / 正安全整数 bytes /
64 位小写 hex SHA」，**任一不成立即到此为止，无效读数不进相等比较**。
测试构造件已全面改用真 SHA 形状，`sea-arm` 一类占位值只出现在反例里。

## crash ack/exit/respawn deadlines 与超时清理

五个具名 deadline 冻结为 ack 15,000 / exit 15,000 / respawn-ready 30,000 /
respawn-EOF 15,000 / kill-confirm 5,000 ms。`throw`/`exit`/`hang` 必须收到 `crashing` ack，
`sigterm` 不要求 ack 但同样要求有界退出。任一超时写结构化 failure、杀残留、顶层非零；
kill 之后不再裸 `await exited`。四处 cleanup 共用 `killAndConfirmInto()`。

**上界范围如实登记，不夸大**：有界的是 crash 生命周期与 cold-start 取样两处；
`launchProbe`／`stdio`／`abort`／`sign-probe`／跨架构注入仍是裸 `await proc.exited`，
均跟在已有超时的 `waitFor` 之后，失败方向是挂起而非假绿。README 的
「每个等待都有上界」已收窄为「crash 生命周期的等待」。

## SEA 四阶段失败、原子发布与 stale-artifact 反例

每 variant 从干净 staging 走
`copy → remove-signature → postject → ad-hoc sign → codesign --verify --strict → publish`；
全过才把整个 staging 目录 `rename` 进 assembly（原子，无「半个目录」中间态）。
每格开工先清旧成品，故「先成功、后注入失败」不可能复用 stale executable。
四枚 `--fail-stage` 反例给真命令必然失败的实参（走真实失败路径），逐枚**解析 JSON 核对**
stage/exit/stderr/published/publishedPath，并对整个 `publishDir` 做 `lstat` 证明物理不存在。

## R1 的 102 tests / 31 counterexamples 回归

R1 的 102 例全部保留并随本轮重跑（现为 202 例）。R1 的 31 枚反例全部复跑，
含 R2 注入面之外的四枚：coldstart `--samples 10`、路线甲随行 bundle 缺件、
官方来源门的 archive 截断与预置错件。总账见下。

## 空 assembly 双架构全量重跑

从**空** `dist/assembly` 与 `dist/build` 起跑，双 cycle 装配 → 76 枚反例 → 清洁重建 →
机器空闲下的最终一轮。最终读数五支**全部 `status:'ok'`、`failureCount:0`**：
`measure`、`coldstart-rounds`、`reproducibility-probe`、`sign-probe`、`build-sea`。

- assembly 实物恰 **12 目录 + 16 文件**，`readdir`/`lstat` 枚举与冻结闭集双向比对无差。
- cold-start：8 候选 × 3 轮 × 25 ＝ **600 枚样本**逐枚留档，warmup 72 枚，
  `identityDrift` 非 null 轮数 **0**；轮间跨度 0.1%～6.1%。
  裸 runtime 基线 aarch64 25.2 ms、x86_64（Rosetta）86.1 ms。
- 双 cycle：sealed 三档全同、SEA `default` 两架构全同、`code-cache` 两架构全异、
  跨架构注入观察到 `Code cache data rejected.` 原句。
- SEA `default` 的两枚 SHA（`8b9aa579…`／`fcd9a701…`）在本会话**三次独立的从空全量重建**中
  逐次相同；`code-cache` 每次都变。该「相同」只在同 worktree、同绝对路径下成立。
- 双架构：aarch64 原生、x86_64 经 Rosetta 2，全部维度同构通过；原生 x86_64 性能记 blocked。

## 反例总账

**76 枚，零不符，无一枚等价变异，无一枚逃脱。** 账目 `dist/r2-evidence/counterexamples.jsonl`，
汇总 `dist/r2-evidence/tally.json`，逐枚表见报告第十二节。

按探针：measure 23、coldstart 15、reproducibility 14、SEA 8、physical 11、fetch 4、extract 1。
另计读数与装配步 7 条、前置态核对 4 条；被顶替的 4 条 `sea:vidence` 排除并报出条数。

五项缺口的归因逐条落到具名判据：`reproducibility.path`（缺口一，三枚只命中这一条）、
`assembly.rootType`（缺口二，真文件系统 symlink 根）、`coldstart.sample.ordinal`／
`coldstart.sample.warmupPosition`／`coldstart.roundNumbers`（缺口三）、
`crash.throw.deadline`＋`crash.throw.ack`（缺口四，受控子进程，整支 probe 135.9 s 内收束判红
而非挂死）、四枚 `seaBuild.<该阶段>` 各自不串味（缺口五）。

四枚 SEA 反例另经 `verify-sea-ce.mjs` 解析 JSON 逐项核，并对整个 `publishDir` 做 `lstat`
证明物理不存在；每枚先跑成功构建确认成品在位（`beforePresent` 四条为 `present`）再注入失败，
故「先成功后失败不留 stale artifact」是实测。

一枚**反向对照** `physical:reportsOutside` 退出 0：读数 JSON、`dist/build/`、`runtime/`、
`corpus/` 就位时闭集判据必须判绿——没有它，十枚物理反例只证明判据会红，
不证明判据只在该红时红。

## 报告的实测/推论、许可与残留双口径订正

- 报告**不提任何路线建议**，全文零推荐措辞（已扫描复核）。
- SEA `default` 的 byte-identical 只称：**同一 worktree、同一绝对路径下两次空 assembly 构建**
  逐字节相同。**跨路径变化与 Developer ID 后净体积均标「未实测」**。
- 负载超时只登记本次观察，**不外推为免责频率**；本轮反例总跑期间零并发全仓门。
- 许可口径：**Postject 自有部分 MIT**；package 内 **`vendor/LIEF` 为 Apache-2.0**
  （`LICENSE` 共 236 行，第 32 行起写明 `LIEF, located at vendor/LIEF`，第 34 行起为
  Apache-2.0 正文；`package.json` 的 `license` 字段只写 `MIT`，单看会漏掉 vendor 那一半）。
  是否随最终分发件交付及 notice 义务**归 `PI-SIDECAR-RELEASE-1`**。
- 残留**三个数并列、互不取代**（ADR-022 六-E 冻结口径）：`3207b27` 的 2,436,991,750 B
  （2.27 GiB）、R1 的 2,527,892,648 B（2.35 GiB）、R2 的 **2,530,884,707 B（2.36 GiB）**。
  R2 另附逐项求和与原始 JSON 路径。

## 全仓门结果

反例总跑与最终读数**全部结束之后**串行跑，期间零并发（R1 曾实测并发导致约 1/1000 假红）：

| 门 | 结果 |
|---|---|
| `pnpm -r build` | **exit 0** |
| `pnpm lint` | **exit 0** |
| `pnpm test` | **exit 0**，160 files / **1397 tests passed** |
| `pnpm --filter @courtwork/desktop lint:isolation-binding` | **exit 0**（等级 `none`，扫描 6 份宿主源码、18 份 pi lane 源码） |
| `node --test .../probe-verdict.test.mjs` | **202/202**（19 suites） |

未用 `PIPESTATUS`，四门各自独立取退出码。

## 新增概念及必要性

本单**未加**任何依赖、持久化格式、状态机或通用抽象。新增的都是判据面与采集面的最小件：

| 新增 | 为何非加不可 |
|---|---|
| `dist/assembly` / `dist/build` 分区 | 闭集判据若与构建 scratch 共处一目录，「多一件」会被装置自己的中间件误伤，等于没判 |
| `verdictAssembly` + `observeAssembly`（含 `rootType`） | blocker 1 与缺口二：没有实物枚举就没有物理闭集 |
| `verdictSeaBuild` | `f261347` 失败闭口与缺口五：四阶段退出码收了却不决定状态 |
| `CRASH_DEADLINES` / `CRASH_ACK_REQUIRED` | 无上界等待会让整支 probe 挂死而不判红 |
| `killAndConfirmInto()` | 四处 cleanup 的返回值必须被统一消费，且该语义本身要可被定向测试打 |
| `sealedBundleAssemblyPath()` / `seaExecutableAssemblyPath()` | 缺口一：预期坐标须单点算出，否则两谱各拼一份字面量后各自漂移 |
| cold-start 逐枚样本形状 | blocker 2 与缺口三：收束成一个 identity 就把证据弄丢了 |
| repro 的 `cycles` 指纹形状 | blocker 3：先证有效再谈相等，无效读数不得互证 |
| `--fail-stage` / `--fail-cell` | 让 SEA 四阶段失败走**真实**失败路径，而不是改观察值 |
| 现生成的 crash 桩 | `sidecar-fixture.mjs` 由票面冻结，桩落 gitignore 的 `dist/`，不是新增源文件 |

## 待独立验收项

1. 五项缺口的闭口是否足够（尤其缺口五「红得准确」的判据边界）；
2. `killAndConfirmInto()` 这一窄接缝是否属可接受的测试缝，还是应改由更上层观察；
3. 裸 `await proc.exited` 的五处未收窄，是否接受本票的「如实登记不收窄」处置；
4. 残留三口径并列的表述是否符合 ADR 冻结意图；
5. 报告第十二节之二登记的三次作废探针（含 G2 首轮零红）是否已充分说明区分力；
6. 分发路线仍 **[需架构拍板]**，本票不裁、不提建议。
