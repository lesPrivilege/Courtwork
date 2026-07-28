# PI-SIDECAR-DIST-1 · Node sidecar 分发路线实测（返修版）

调研实施件。权威只认 [`ADR-022`](../decisions/ADR-022-pi-lane.md) 六-E、
[`packages/pi-lane/SPEC.md`](../../packages/pi-lane/SPEC.md)「并行相邻票与合流门」与实现就绪图同名行。

**本件的性质**：只交可复现实验与工程证据。**分发路线由架构裁定并回写 ADR-022**；本件不作选型，
`PI-HOST-LOOP-1` 不得据本件开工。本件不更新 `docs/status/current.md`，不宣称任何发行成熟度。

**版本说明**：`PI-SIDECAR-DIST-1@3207b27` 的独立验收 `9b8142f` 判 **REJECT**；返修
`PI-SIDECAR-DIST-1R@61c2b09` 的独立验收 `f261347` **再判 REJECT**。两次拒绝的读数与原稿的
SEA-default 建议均已被 ADR-022 撤销消费资格。本文是第二次返修 `PI-SIDECAR-DIST-1R2` 的全量重测，
全部数字取自本票装置，不继承任何未经复测的读数。原稿第十节的路线建议**已删除**，
本文**不提任何新的路线建议**，理由见第十三节。

实验装置与全部脚本在
[`packages/pi-lane/fixtures/sidecar-dist/`](../../packages/pi-lane/fixtures/sidecar-dist/README.md)；
机器面读数在 `dist/measurements.json`、`dist/coldstart-rounds.json`、`dist/reproducibility.json`、
`dist/sign-probe.json`、`dist/build-sea.json`、`dist/runtime-source.json`，反例逐枚留
`dist/counterexamples/` 与 `dist/r2-evidence/`，最终一轮另存 `dist/final/`
（`dist/` 被仓库根 `.gitignore` 覆盖，不入库；复现方式见第十八节）。

## 一 · 返修解决的是什么

`9b8142f` 的拒绝理由不是路线功能反证，是装置不成立。两条：

1. **量测不会因关键语义失败而判红。** `measure.mjs:207` 无条件返回 `status:'ok'`；`:246` 只以
   「收到了 `slow-ended`」判 abort 通过，不要求 `stopReason==='aborted'`；`:279` 对四类崩溃的
   code/signal 一律记 `ok`；`:60`／`:74` 对缺文件的产物直接 `continue`。失败被序列化进 JSON 之后
   仍报通过，故「八枚全过」不是由装置证伪出来的。
2. **独立 Node 22 重放被来源门阻断。** 验收环境取得的 arm64 archive 为 49,274,880 B，与官方 SHA
   不符，双架构制品无法独立重建。

返修后的对应处置：

- 判定收进 [`scripts/lib/probe-verdict.mjs`](../../packages/pi-lane/fixtures/sidecar-dist/scripts/lib/probe-verdict.mjs)
  一处（纯函数、零 I/O），`measure`／`coldstart-rounds`／`reproducibility-probe`／`sign-probe`
  四支共用；任一判据不过即顶层 `status:'failed'` 且进程非零。
- 判定层带 102 例定向测试（`node --test`）。施工序为 TDD：先按 `70e6482` 的真实口径落地判定层
  （`verdictStdio`／`verdictCrash`／`verdictInventory` 直接 `return []`，`conclude` 恒报 `ok`），
  在那份口径上 102 例**红 87 例**，红点全部落在既有缺陷而非模块加载；收紧后同件转 **102/102 全绿**。
- 取件本身成门：新增 [`fetch-runtime.mjs`](../../packages/pi-lane/fixtures/sidecar-dist/scripts/fetch-runtime.mjs)，
  详见第二节。
- R1 当时交出 31 枚反例，逐一实注入并全部使生产判定非零。**本票的反例总账不是那一份**——
  R2 的库存、判据与留档全部重跑，逐枚计数见第十二节。

上游对本次实测的独立确认：复核官方 `SHASUMS256.txt` 与 `Content-Length` 后，两份 archive 的字节数
与 SHA 与原稿一致——`9b8142f` 观察到的失配属该验收环境的传输异常，非上游文件变更。

## 一之二 · R2 返修解决的是什么

`f261347` 的拒绝理由同样不是路线功能反证。R1 把判定收进了一处，但其中三处**对着装置自己算出来的
观察值判绿**，另有两处失败根本不进判定。逐条坐实与闭合：

| `f261347` 坐实的 | R1 为什么判绿 | R2 的闭合 |
|---|---|---|
| **blocker 1** 磁盘真多出 `route-a/unexpected-physical/proof.txt`，`measure` 仍 `status:'ok' failures:0` | `observedIds` 由常量 `INVENTORY` 推坐标、再问「这些坐标在不在」，从不枚举磁盘 | 唯一 `dist/assembly`；observation 由 `readdir`+`lstat` 的**实物**构造，与冻结闭集**双向**比对 |
| **blocker 2** 首枚 cold-start 身份错、后 24 枚正确 → 零 failure | `sampleRound` 返回的 `round.identity` 已被换成漂移**后**的正确值，判据又只读它 | 每轮 25 枚样本逐枚留档、逐枚校验身份与 EOF；`identityDrift` 非 null 即红 |
| **blocker 3** SEA default 的 `shas:[null,null]` 被判可复现 | `deterministic()` 只做 JavaScript 相等性，`null === null` 为真 | 先证 exists / regular-file / 正安全整数字节 / 64 位小写 hex，**无效读数不进相等比较** |
| crash 的 ack/exit 可无限等待，整支 probe 挂死则既不写 failed 也不非零 | 只 `await crashing`（不判收没收到）再裸 `await proc.exited` | 五个具名 deadline，超时写结构化 failure、杀残留、最终非零 |
| SEA `remove-signature`/`sign`/`--verify --strict` 非零仍记 `status:'ok'` | 只有 postject 非零被拦，其余三者的退出码收了却不决定状态 | 四个外部阶段逐个进 `verdictSeaBuild`；全过才从干净 staging 原子发布 |

**三枚 blocker 在未改 production 的 R1 tree 上先红**（施工序留档见第十二节之二）：blocker 1 取
物理实验——真落一份多余文件后跑未改的 `measure.mjs`，实测 `status=ok failures=0`、exit 0；
blocker 2/3 取判定层直调，`verdictColdstart`／`verdictReproducibility` 各返回 `[]`，
定向测试以「期望判红，实际零失败」红 3 例（102 → 105 例中红 3）。

**`dist/` 分区是判据能成立的前提**。R1 把六档中间 bundle 直接摊在 `route-a/` 顶层，
随包目录里混着不随包的东西；那种形状下「多一件」无从判起。R2 只让十件随包制品进
`dist/assembly/`，构建 scratch、runtime、corpus、读数 JSON 与反例留档全在其外——
并以一枚**反向对照**反例坐实这些外置件不会误伤闭集判据（第十二节）。

## 一之三 · 第二轮独立审查的五项缺口（与 `f261347` 那五项无关）

`f261347` 的三枚 blocker 与两处失败闭口收紧之后，另一轮独立审查在**收紧后的装置上**又坐实
五项假绿。它们的共同形状不是「判据缺失」，而是**判据存在却绑得不够紧**——
判的是自己算得出的东西，或只证明「红了」而没证明「红得准确」。

| # | 缺口 | 假绿形状 | 闭口 |
|---|---|---|---|
| 1 | 可复现性的 `path` 没绑库存项 | `deterministic()` 只问 path 是不是非空字符串。把 default 行改成另一个合格 cell 的路径、`../outside` 或错扩展名，两枚 fingerprint 保持有效，照样判绿 | `deterministic(label,row,expectedPath,expectIdentical)` 做 **exact equality**；预期坐标由 `sealedBundleAssemblyPath()`／`seaExecutableAssemblyPath()` 单点算出。错 cell、错扩展、`..` 因此同时被拒 |
| 2 | assembly **根**自身的 symlink 会被跟随 | 根只做 `existsSync` 再 `readdirSync`。在临时目录造一棵完整合格的树，用 symlink 当根，verdict 零 failure | 采集侧先 `lstat` 根并记 `rootType`，非真目录一律不递归；判定侧独立守 `assembly.rootType` |
| 3 | cold-start 逐枚样本身份不完整 | 只查 `samples.length===25`、warmup 总数 3、`keptSamples===22`。复制 `sample:0` 顶掉 `sample:1` 总数不变；warmup 挪到第 10–12 枚总数不变；三轮全标 `round:1` | ordinal 严格等于数组下标（`0..24` 各一次）、`warmup === (index<3)`、`keptSamples` 同时等于 22 与**实际**非 warmup 计数、轮号严格 `1,2,3` |
| 4 | 三条 cleanup 分支吞掉 kill-confirm 超时 | initial ready 超时、respawn-ready 超时、respawn 后 EOF 超时三处调完 `killAndConfirm()` 就丢返回值，只有主 exit-timeout 登记得上 | 四处 cleanup 共用 `killAndConfirmInto()`，返回值必须被消费；`ready+kill-confirm`、`respawn-ready+kill-confirm`、`respawn-eof+kill-confirm` 三种组合因此可观察 |
| 5 | SEA 失败证据只证明「红了」 | `verdictSeaBuild()` 只看 stage exit 与 `published`，不核 `row.status`／`row.stage`／失败 stderr／`publishedPath`。把 `stage` 改成 `bogus` 或清空 stderr，测试照样绿 | 成功行核 `status:ok`＋四阶段全 0＋`published`＋有效 path＋`publishDirPresent`；失败行核 `status:failed`＋`stage` 等于**第一个非零阶段**＋该阶段非零 exit 与非空 stderr＋`published:false`＋`publishedPath:null`＋`publishDirPresent:false`，且其后阶段可缺席但不得冒充成功 |

### 施工序与区分力

五项**全部先红后修**：在未改 production 的树上落定向测试，得 **28 枚红**
（缺口一 5、缺口二 4、缺口三 6、缺口四 2、缺口五 11），红点均落在既有缺陷。
缺口四的首红取「把当前的丢弃语义原样搬进窄接缝 `killAndConfirmInto()`」——
红因此落在**被丢弃的返回值**上，而不是「函数不存在」的模块加载错。

收紧后 `probe-verdict.test.mjs` 由 R1 的 102 例增至 **202 例全绿**，再以六枚 source mutation
复核区分力（口径：**保持观察形状不变，只松掉待验证的那一层判据**）：

| 变异 | 松掉的判据 | 红例数 |
|---|---|---|
| G1 | 可复现性 path 的 exact equality 退回「非空字符串」 | 5 |
| G2 | 判定层 `assembly.rootType` 门删除 | 3 |
| G2FS | 采集侧改用会跟随 symlink 的 `statSync` | 1 |
| G3 | cold-start 退回 count-only | 6 |
| G4 | `killAndConfirmInto()` 重新丢弃返回值 | 2 |
| G5 | SEA 只看 stage exit 与 `published` | 10 |

逐枚红面见 `dist/first-red/mutation-matrix.md`；每枚变异下「合格观察即通过」那一例均未变红，
说明红的是判据本身而不是构造件。

### 一处过程失败，如实登记

缺口二的变异 G2 **首轮零红**：判定层的 `rootType` 门被整条删掉，测试却毫无反应。
原因是当时那条用例只断言 `failed()`，而 symlink 根的 `entries` 为空，**光凭闭集缺件也会红**，
旧红把「门被删了」这件事顺带盖住。修正后核具名判据 `assembly.rootType`，并补一枚
判定层独立用例（`rootType:'symlink'` ＋ **完整 entries**，即采集侧若改用跟随 stat 会交上来的
形状），G2 随即红 3 例。

这与缺口五是同一条教训，故并列写在此处：**「红了」不等于「红得准确」**；
凡归因要紧的用例，断言必须落到具名判据上，否则一条无关的旧红就足以掩盖判据被删。

## 二 · 官方运行时来源门

取件只从冻结的 `https://nodejs.org/dist/v22.23.1/`。流程：写同目录唯一 partial → fsync →
逐项核冻结文件名、冻结字节数、冻结 SHA-256、同次下载的 `SHASUMS256.txt` 同名记录、
`tar -tzf` 完整性 → 全过才 `rename` 并 fsync 父目录。正式文件名在校验通过前不出现一次。
现存正式件按同一套复核后才复用；错件拒绝且**不覆盖**，原样留在磁盘上交人处置。

冻结身份是第一见证，下载回来的 SHASUMS 是第二见证。只信 SHASUMS 的话，「archive 与 SHASUMS
一起被替换」可以自洽通过。

**该门证明 HTTPS 传输完整性与冻结身份，非 release-key 供应链认证**——未校验 nodejs.org 的签名密钥，
未验证 `SHASUMS256.txt.sig`。

| 发行包 | 字节 | SHA-256 |
|---|---|---|
| `node-v22.23.1-darwin-arm64.tar.gz` | 50,067,502 | `ef28d8fab2c0e4314522d4bb1b7173270aa3937e93b92cb7de79c112ac1fa953` |
| `node-v22.23.1-darwin-x64.tar.gz` | 51,245,086 | `b8da981b8a0b1241b70249204916da76c63573ddf5814dbd2d1e41069105cb81` |

解包后另核 `node --version` 与 Mach-O 架构：

| 架构 | `bin/node` 字节 | SHA-256 | `--version` | `file -b` |
|---|---|---|---|---|
| arm64 | 112,928,848 | `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d` | `v22.23.1` | Mach-O 64-bit executable arm64 |
| x64 | 115,447,952 | `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b` | `v22.23.1` | Mach-O 64-bit executable x86_64 |

## 三 · 环境

| 项 | 值 |
|---|---|
| 主机 | MacBook Air，Apple M2，8 核，Darwin 25.5.0，arm64 |
| 实验宿主 Node | v25.9.0（只跑 harness，非被测运行时） |
| 被测运行时 | Node v22.23.1（LTS `Jod`） |
| Rosetta 2 | 可用（`arch -x86_64 /usr/bin/true` 退出 0） |
| Tauri | 2.11.5，配置 schema 出自 `tauri-utils` 2.9.3（均取自 `apps/desktop/src-tauri/Cargo.lock`） |

## 四 · fixture 的真实性判据

分发结论只在「被打包的确实是能用的 pi core」时成立。fixture 经 `@courtwork/pi-lane` 的 `dist`
装配真实 `Agent` ＋只读容器＋闸门＋预算，provider 用 pi-ai 自带 faux（确定性、不触网、不耗额度）。
八枚候选逐件实跑一轮 tool loop：

- 模块图 **959 个 input**，三种 bundle 形态一致，esbuild 零 warning；
- `init` 后工具表恰为 `["read","grep","glob"]`；
- `run` 后 `toolsExecuted:["read"]`、`turns:2`、末条消息 `role:"assistant"`，
  即模型请求 → 容器执行 → 结果回灌 → 收尾，整条 loop 在打包后仍通。

工具表的期望值是判定层里的冻结字面量，**不从 `@courtwork/pi-lane` import**：fixture 自己就是从
那里取的 `READ_ONLY_TOOL_NAMES`，两端同源则判据恒真，无区分力。

bundle 体积构成（CJS minified，344,292 B，由 esbuild metafile 逐 input 归并）：

| 包 | 字节 | 占比 |
|---|---|---|
| `typebox` | 164,861 | 47.9% |
| `yaml` | 114,826 | 33.4% |
| `@earendil-works/pi-agent-core` | 21,822 | 6.3% |
| `@earendil-works/pi-ai` | 20,024 | 5.8% |
| `@courtwork/pi-lane`（dist）＋ fixture 自身 | 13,837 | 4.0% |
| `ignore` | 4,378 | 1.3% |
| `partial-json` | 3,815 | 1.1% |

pi core 本体占 6.3%，八成体积在 `typebox` 与 `yaml` 两个传递依赖。`openai` 出现在模块图里但经
tree-shaking 后零字节进产物，`diff` 同。此表是分发体积的归因，非依赖裁剪提案。

## 五 · 库存闭集与负控

库存恰十件：两架构 ×（sealed 三档 + SEA 两档）。角色分工是判据的一部分：

| 角色 | 产物 | 判据 |
|---|---|---|
| 负控（2 枚） | `a/<triple>/esm-naive` | 须以 `Dynamic require of "process" is not supported` 非零失败；跑起来了同样判红 |
| 候选（8 枚） | 其余八枚 | 逐件锁身份三元组、stdio、loop、EOF、abort、四类崩溃 |

### 五之二 · 闭集必须对着实物（R2）

R1 的「十件闭集」只是把常量 `INVENTORY` 展开成十个坐标，再逐个问「这个坐标上有文件吗」。
它从不枚举目录，因此**磁盘上多出来的东西一律看不见**——`f261347` 落一份
`route-a/unexpected-physical/proof.txt` 后跑未改的 `measure.mjs`，十件 probe 全部跑完，
输出 `status=ok failures=0`、exit 0。本票已独立复现该结果（第十二节之二）。

R2 把方向倒过来：

1. 十件随包制品进**唯一** `dist/assembly/`；构建 scratch（`dist/build/`）、runtime、corpus、
   读数 JSON、`final/` 与反例留档**全在其外**。R1 把六档中间 bundle 直接摊在 `route-a/` 顶层，
   那种形状下「多一件」根本无从判起。
2. 采集侧用 `readdir`（取名）+ `lstat`（定类型）逐层枚举实物，**只对真目录递归**。
   用 `lstat` 而非 `withFileTypes` 是有意的：`lstat` 不跟随符号链接，symlink 会如实报成
   `symlink`，而不是它指向的那个类型。
3. 判据侧持冻结的期望闭集，与实物做**双向**比对。

期望闭集恰为 **12 目录 + 16 文件**：

| 层 | 内容 |
|---|---|
| 顶层 | 恰 `route-a/`、`route-b/`（多一条 `route-c/` 即红） |
| `route-a/` | 恰 6 个 `<triple>--<variant>/`，每个恰 executable + 指定 bundle |
| `route-b/` | 恰 4 个 `<triple>--<variant>/`，每个恰 executable |

预期项必须是 **regular file 且字节为正**。额外文件、额外目录、嵌套子目录、symlink、
socket/FIFO/设备、错 basename、少件——逐类各有一枚反例，全部令顶层 `failed` 且进程非零。
另有一枚**反向对照**：读数 JSON 与构建 scratch 就位（即正常状态）时判据必须**判绿**，
证明外置件不会误伤闭集（第十二节）。

少一件、多一件、重复、错名、任一项 blocked，都令顶层 `status:'failed'` 且进程非零。
两枚负控实测均以 `exit code 1` 失败，`errorLine` 为
`Error: Dynamic require of "process" is not supported`。

## 六 · 装配形态：Tauri `externalBin`

`tauri-utils-2.9.3/src/config.rs` 的 `external_bin` 文档注释原文：Tauri 按
`binary-name{-target-triple}{.system-extension}` 找产物，macOS 举例 `my-binary-x86_64-apple-darwin`。
两条路线的可执行文件因此一律命名 `pi-sidecar-<target-triple>`。

同文件另两条默认值（本次一手读 `~/.cargo/registry` 内的 crate 源码）：

- `hardened_runtime: true`（`impl Default for MacConfig`，`config.rs:682`）；
- `entitlements: None`（`config.rs:684`）。

本仓 `apps/desktop/src-tauri/tauri.conf.json` 现行 `macOS` 段只写 `minimumSystemVersion` 与
`signingIdentity: "-"`，`externalBin` 未配置，即**硬化运行时开、entitlements 空**。该组合在本机
已装的 `v0.1.2` 制品上得到实证：`/Applications/Courtwork.app` 主可执行文件
`flags=0x10002(adhoc,runtime)`。

两条路线的装配代价不对称：

- **路线甲是两件产物。** `externalBin` 只收可执行文件，sealed bundle（`sidecar.cjs`）须另走
  `bundle.resources` 或第二条 externalBin，Rust 侧还要解析该资源路径再作为 argv 传给 node。
- **路线乙是一件产物。** blob 已在 Mach-O 里，`externalBin` 一条搞定，Rust 侧 spawn 即用。

该不对称在 R2 的 assembly 形状里是可数的：`route-a/` 六个目录各两件，`route-b/` 四个目录各一件，
合计 16 个随包文件。这只是**装配形态的事实**，不是路线优劣的判断——本文不作选型（第十三节）。

## 七 · 体积与 SHA-256

`shipped` 计入该路线须随包的全部文件。

| 产物 | 角色 | 文件数 | shipped 字节 | MiB |
|---|---|---|---|---|
| `a/aarch64/esm-naive` | 负控 | 2 | 113,273,210 | 108.03 |
| `a/aarch64/esm-createrequire` | 候选 | 2 | 113,273,328 | 108.03 |
| `a/aarch64/cjs` | 候选 | 2 | 113,273,140 | 108.03 |
| `b/aarch64/default` | 候选 | 1 | 112,382,848 | 107.18 |
| `b/aarch64/code-cache` | 候选 | 1 | 112,629,088 | 107.41 |
| `a/x86_64/esm-naive` | 负控 | 2 | 115,792,314 | 110.43 |
| `a/x86_64/esm-createrequire` | 候选 | 2 | 115,792,432 | 110.43 |
| `a/x86_64/cjs` | 候选 | 2 | 115,792,244 | 110.43 |
| `b/x86_64/default` | 候选 | 1 | 115,550,688 | 110.20 |
| `b/x86_64/code-cache` | 候选 | 1 | 115,806,624 | 110.44 |

产物 SHA-256（最终一轮，取自 `dist/final/assembly-manifest.txt` 的 assembly 实物）：

| 产物 | 可执行文件 | 随行 bundle |
|---|---|---|
| `a/aarch64/*` | `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`（官方 node 原样改名） | 见下 |
| `a/x86_64/*` | `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`（同上） | 见下 |
| `a/<triple>/cjs` | 同上 | `33ae719741552da79242a958ea381646928057dca4f3ff53ec43eb1506d5ef3c`（344,292 B） |
| `a/<triple>/esm-createrequire` | 同上 | `463e75a57856f08eee11a41a03c6dbf6c1a5ba720de444e1432eb6c4da0ed232`（344,480 B） |
| `a/<triple>/esm-naive` | 同上 | `34b11452f7979a114f0badc5f36deb06df9c57dda5877ea447898524b5327120`（344,362 B） |
| `b/aarch64/default` | `8b9aa5799e7a62fac2fffc13875bcdb88bd0396dcfcef573eb07c9a2b1d3ed6b` | — |
| `b/aarch64/code-cache` | `ab2d69e87962661e8a313bbcd8ad1c1794ab2de6822433f6c86cce5d3a644aaa` | — |
| `b/x86_64/default` | `fcd9a7012a80f0f4a5149c2ced1ccae70b85071ef808d2308584685d6109b0b8` | — |
| `b/x86_64/code-cache` | `35deb3a9ca2120e0635add52c111478cb0d0212e9d452c341709cb53758df7aa` | — |

三条观察：

1. **路线乙的 `default` 档比路线甲小**（arm64 少 890,292 B）。原因非压缩：SEA 流程要求
   `codesign --remove-signature`，刨掉官方 Developer ID 签名的 CodeDirectory（实读 875,632 B），
   再补 344 KB blob 与 ad-hoc 签名，净额为负。**该体积优势会在 `PI-SIDECAR-RELEASE-1` 换真实
   Developer ID 签名后大部分消失**，不构成选型依据；**Developer ID 后的净体积本票未实测**。
2. 路线甲的 `cjs` bundle 与路线乙 blob 内的 bundle **逐字节相同**（同为 `33ae7197…`）。
   两路线比的是打包方式，非两份不同的 JS。
3. 本票内 SEA `default` 的两枚 SHA（`8b9aa579…`／`fcd9a701…`）在**本会话三次独立的
   从空 assembly 全量重建**中逐次相同；`code-cache` 两枚则每次都变（本轮 `ab2d69e8…`／
   `35deb3a9…`，上一轮 `ac6bd057…`／`3ccb85f0…`）——正是第十节判据要求的方向。

**该「相同」的成立范围只到：同一 worktree、同一绝对路径。** SEA blob 内含入口 CJS 的绝对路径，
换构建路径字节必变；这不是非确定性，是路径进了产物。故 SEA 产物 SHA 与 `3207b27` 稿不同属
已归因的路径效应，字节**数**与旧稿逐行一致。**跨路径与跨机可复现均未实测**，
发行票若要跨机比对 SHA，须先固定或规范化构建路径。

## 八 · 冷启动

「冷启动」定义为外部计时：`spawn` 调用到读到 `ready` 行，即宿主等待 sidecar 可服务的真实时长。
取样固定八候选 × 三轮 × 每轮 25 样本，**逐轮随机化取样次序并记录实际次序**——
固定次序会把「机器越跑越热」系统性地送给排在后面的候选。

**每轮 25 枚样本逐枚留档、逐枚判定（R2）。** `f261347` 坐实 R1 的收束把证据弄丢了：
`sampleRound` 用 `identity ??= seen` 吃下首枚样本，随后把返回的 `round.identity` 换成漂移**后**
的值，而判据只读这一个值——于是「首枚身份错、后 24 枚正确」在读数里查无此事，返回零 failure。

R2 不再收束成一个 identity。每枚样本留 `{sample, warmup, identity, elapsedMs, eof}`，
判据逐枚校验 Node version/arch/SEA 与 EOF；`identityDrift` 非 null 本身即硬失败
（记下了不等于交代过）。**三枚 warmup 只从性能统计排除，不从安全门排除**：
它们同样要过身份与 EOF。R2 另按第二轮审查收紧到**逐枚 ordinal 严格等于数组下标**
（`0..24` 各一次且顺序完整）、`warmup === (index<3)`、`keptSamples` 同时等于 22 与实际非
warmup 计数、轮号严格 `1,2,3`——「复制首枚顶掉次枚」「warmup 挪位但总数不变」「三轮全标
`round:1`」这三种**总数不变**的形状，只有这一层抓得住。

本节只报同机数字，**不设路线胜负阈值**。

| 产物 | 三轮中位数（ms） | 中位数之中位数 | 最优单次 | 轮间跨度 |
|---|---|---|---|---|
| `b/aarch64/code-cache` | 33.3 / 31.4 / 31.6 | **31.6** | 30.2 | 6.1% |
| `b/aarch64/default` | 38.5 / 37.3 / 37.3 | **37.3** | 35.9 | 3.2% |
| `a/aarch64/cjs` | 38.6 / 38.4 / 38.3 | **38.4** | 36.8 | 0.8% |
| `a/aarch64/esm-createrequire` | 39.9 / 39.9 / 39.6 | **39.9** | 37.8 | 0.8% |
| `b/x86_64/code-cache` | 98.9 / 98.9 / 98.8 | **98.9** | 96.8 | 0.1% |
| `b/x86_64/default` | 106.6 / 107.8 / 106.8 | **106.8** | 104.7 | 1.1% |
| `a/x86_64/cjs` | 110.1 / 110.3 / 109.5 | **110.1** | 107.4 | 0.7% |
| `a/x86_64/esm-createrequire` | 119.7 / 117 / 117.9 | **117.9** | 114.9 | 2.3% |

裸运行时基线（`node -e 'process.stdout.write("x")'`，同机同形状取样，22 样本中位数）：
aarch64 **25.2 ms**、x86_64（Rosetta）**86.1 ms**。基线用 `spawnSync` 计时、产物用异步 spawn 等首行，
两者路径不同，**只作量级归因，不作精确差值**。

逐枚留档实测：**600 枚样本**（8 候选 × 3 轮 × 25），其中 `warmup` 72 枚，
**`identityDrift` 非 null 的轮数为 0**。

据此归因：

- pi 模块图载入在 aarch64 约 **+6～15 ms**、x86_64 约 **+13～32 ms**；两条路线的绝对差
  （aarch64 最优 31.6 对最劣 39.9，跨度 8.3 ms）小于 Node 自身启动的 25.2 ms 底座。
- 同架构下 SEA `default` 与 sealed `cjs` 相差 1.1 ms（aarch64）／3.3 ms（x86_64）。
- `useCodeCache` 省 5.7 ms（aarch64，37.3→31.6）／7.9 ms（x86_64，106.8→98.9）。代价见第十节。
- 路线甲的 ESM 形态比 CJS 慢 1.5 ms（aarch64）／7.8 ms（x86_64），属 ESM loader 开销，与打包路线无关。

**这些数字只作同机记录，不构成路线优劣判断**（本节不设胜负阈值，第十三节不作选型）。
轮间跨度本轮为 0.1%～6.1%；作为对照，本会话早前一次在**并发负载下**取的读数曾出现
27.8% 与 39.1% 的跨度——同一装置、同一形状，差别只在机器是否空闲。
该对照坐实了第十五节第三、四条的口径：**冷启读数对负载敏感，须在空闲机器上取**。

## 九 · stdio、abort 与崩溃回收

**stdio**：八枚候选全部通过，逐项判定，无一格靠人工判读。

- ping 往返：aarch64 `0.38～0.44 ms`，x86_64 `3.26～3.75 ms`。
- 三类大 payload 逐条比对字节数与 SHA-256，**全等，零截断零改写**：ASCII 1 MiB（1,048,576 B）、
  UTF-8 多字节（`契約書𝒜😀`×50,000 ＝ 850,000 B）、C0 最坏转义（`U+0001` + `"` + `\` ×80,000
  ＝ 240,000 B，对应 ADR-022 六-B.1 点名的 encoded-packet worst case）。期望字节数由构造谱算出，
  不取采集端自报。
- 工具表 exact 比 `["read","grep","glob"]`；loop 比 `toolsExecuted:["read"]`／`turns:2`／
  `lastRole:"assistant"`；stdin EOF 比 `{code:0, signal:null}`。

**abort**：四条一起判——收到 `aborted` ack 且 `wasRunning:true`（证明打的是在途回合）、
慢流以 `stopReason:"aborted"` 收束、abort 后进程仍能应答 ping、随后 EOF 干净退 0。八枚全过。

abort **延迟数字不可用于比较路线**：实测量化在 1.1／1.6／2.1 s 三档，是 faux provider 按
`tokensPerSecond: 2` 的分块节流边界（每块约 500 ms 才检查一次 signal），非产物属性。
本票能证的是语义（abort 打得断、进程不死），非延迟。

**崩溃回收**：四类终止在八枚候选上给出一致的 exact 结果，无路线差；每类之后**各自复启**一次。

| 注入 | 期望 | 八枚实测 |
|---|---|---|
| 未捕获异常 | `code 1`，无 signal | 一致，复启 ready |
| `process.exit(7)` | `code 7`，无 signal | 一致，复启 ready |
| 挂死后父进程 SIGKILL | `signal SIGKILL`，无 code | 一致，复启 ready |
| SIGTERM | `signal SIGTERM`，无 code | 一致，复启 ready |

**crash 生命周期的每一步等待都有上界（R2）。** `f261347` 坐实 R1 的崩溃探针只 `await crashing`（且不判有没有
收到）再裸 `await proc.exited`：子进程若既不 ack 也不退出，整支 probe 会永久挂起——既不写
failed verdict 也不非零退出，连超时都没有。R2 冻结五个具名 deadline：

| 步骤 | deadline | 超时后 |
|---|---|---|
| `crashing` ack（`throw`/`exit`/`hang` 必收；`sigterm` 是外部信号，不要求） | 15,000 ms | 记 `timeouts:["ack"]` |
| 子进程退出 | 15,000 ms | 记 `timeouts:["exit"]`，转 SIGKILL |
| 复启 ready | 30,000 ms | 记 `timeouts:["respawn-ready"]` |
| 复启后 EOF | 15,000 ms | 记 `timeouts:["respawn-eof"]` |
| SIGKILL 后确认真的走了 | 5,000 ms | 记 `timeouts:["kill-confirm"]` |

任一超时都写进结构化 failure、杀掉仍存活的子进程，并令顶层非零；kill 之后也**不再裸
`await exited`**。该上界由一枚受控子进程反例坐实：它能 `ready`、能答 `ping`，但对 `crash`
一概不理也不退出——整支 probe 在上界内收束判红，而不是挂死（第十二节）。
桩由脚本现生成到 `dist/counterexamples/`，**未改被票面冻结的 `sidecar-fixture.mjs`**。

四处 cleanup 现在共用 `killAndConfirmInto()`，**返回值必须被消费**：确认不了就补记
`kill-confirm`。R1 只有主 exit-timeout 那一条登记得上，另外三条（initial ready 超时、
respawn-ready 超时、respawn 后 EOF 超时）调完就把返回值丢了，于是
`ready + kill-confirm`、`respawn-ready + kill-confirm`、`respawn-eof + kill-confirm`
三种组合结构性观察不到。cold-start 的 EOF 超时同样改为有界 cleanup——它以前只记红、
不收拾子进程，整条失败矩阵会一路漏进程。

**`kill-confirm` 这一格的证据边界，如实说明。** 受控桩实测的四类终止里
**没有出现 `kill-confirm`**——因为该桩是可杀的，SIGKILL 一发即走，确认自然不会超时。
本机也**不去真造一个杀不掉的进程**（那要 uninterruptible sleep 或 D 状态，属制造 OS 病态，
代价与风险都不该由一张调研票承担）。因此这一格由**窄接缝的定向测试**覆盖：
`killAndConfirmInto()` 在 `killAndConfirm()` 回 `null` 时必须追加 `kill-confirm` 而非顶替，
并由变异 G4（重新丢弃返回值）红 2 例证明其区分力。
上表三种组合本身则在判定层逐一验红。**「桩没触发到」与「判据管不管用」是两件事，
本文不把前者当成后者的证据。**

**上界的范围只到这里，不夸大**：有界的是 crash 生命周期与 cold-start 取样两处；
`launchProbe`／`stdio`／`abort`／`sign-probe`／跨架构注入仍是裸 `await proc.exited`，
均跟在一个已有超时的 `waitFor` 之后，失败方向是挂起而非假绿。本票未收窄它们，
README 与本节的措辞也已相应收窄，不写成「每个等待都有上界」。

**SEA 装配的四个外部阶段（R2）。** R1 收了 `codesign --remove-signature`、最终 `--sign` 与
`--verify` 的退出码，却只有 postject 非零被拦，其余三者非零仍写 `status:'ok'`。R2 改为
每 variant 从**干净 staging** 严格走
`copy → remove-signature → postject → ad-hoc sign → codesign --verify --strict → publish`，
四个外部阶段逐个进 `verdictSeaBuild`；任一非零即写精确 stage/exit/stderr、顶层非零，
**且 assembly 内零该 variant 成品**。只有全部通过才把整个 staging 目录 `rename` 进 assembly——
原子发布，不经过「半个目录」的中间态。每格开工先清掉旧成品，故「先成功、后注入失败」
也不可能复用上一轮的 stale executable（四阶段各一枚反例，见第十二节）。

**双架构**：aarch64 原生，x86_64 经 Rosetta 2 翻译执行。x86_64 全部维度与 aarch64 同构通过，
但性能读数含翻译代价；本机无原生 Intel 硬件，**真实 x86_64 性能记 blocked，不外推**。

## 十 · 双 cycle 可复现性与跨架构 code cache

从**空** `dist/assembly/` 与 `dist/build/` 连做两个完整 cycle，逐件比对两次读数。
比对对象是**实际发布在 assembly 里的那一份**，按 assembly 内相对路径现读磁盘，
不取构建摘要自报的 SHA——`f261347` 的 blocker 3 正是「摘要压根没记下 SHA，两个 `null` 互证」。

判定次序在 R2 被硬性前置：**先证有效，再谈相等**。每份读数必须先自证
「路径已记录 / exists / regular-file / 字节为正安全整数 / SHA 是 64 位小写 hex」，
任一不成立即到此为止，无效读数**不进相等比较**。

| 对象 | 期望 | 实测 |
|---|---|---|
| sealed minified（三档） | 两次相同 | 三档均相同 |
| SEA `default`（两架构） | 两次相同 | 两架构均相同 |
| SEA `code-cache`（两架构） | 两次**不同** | 两架构均不同 |

`code-cache` 的「不同」是判据本身：若两次碰巧一致，判定报 `reproducibility.nonDeterministic` 判红，
不当作好消息收。V8 code cache 内含非确定性内容，**开了 `useCodeCache` 即无法用「重建并比对 SHA」
验证发行制品**。

**SEA `default` 的 byte-identical 只在一个很窄的条件下成立**，本文不作任何超出它的宣称：
同一 worktree、同一绝对路径下的**两次空 assembly 构建**逐字节相同。SEA blob 内含入口 CJS 的
绝对路径，故换构建路径后字节必变——这不是非确定性，是路径进了产物。

- **跨路径 / 跨机的 SEA 产物可复现：未实测。**
- **Developer ID 签名后的净体积：未实测**（本机无证书，属 `PI-SIDECAR-RELEASE-1`）。

跨架构注入：arm64 生成的 blob 注入 x64 二进制后，进程**照常启动并正常退出（code 0）**，
只在 stderr 留一句 `(node:NNNNN) Warning: Code cache data rejected.`。即跨架构 code cache 是
**静默降级**——CI 若在单一架构上生成 blob，另一架构会悄悄失去全部 code-cache 收益。该原句现已被
逐字锁进判定，warning 消失即判红。

## 十一 · 签名链（同机 ad-hoc 面）

本机**无 Developer ID 证书、无公证凭据**。本节全部是同机 ad-hoc 事实；Developer ID 签名、
notarize/staple、Gatekeeper 首启、tauri-bundler 的实际签名行为一律 **blocked**，属
`PI-SIDECAR-RELEASE-1`，不以 ad-hoc 冒充。

官方 Node 二进制签名为 `Developer ID Application: Node.js Foundation`，`flags=0x10000(runtime)`，
CodeDirectory 875,632 B，自带六枚 entitlement：

```
com.apple.security.cs.allow-dyld-environment-variables
com.apple.security.cs.allow-jit
com.apple.security.cs.allow-unsigned-executable-memory
com.apple.security.cs.disable-executable-page-protection
com.apple.security.cs.disable-library-validation
com.apple.security.get-task-allow
```

三种重签姿势 × 两条路线各一枚 aarch64 产物，六格结果一致：

| 重签方式 | `codesign --verify` | flags | 实际运行 |
|---|---|---|---|
| ad-hoc（`--sign -`） | 退出 0 | `0x2(adhoc)` | **正常启动** |
| ad-hoc + 硬化运行时，**不带 entitlements** | 退出 0 | `0x10002(adhoc,runtime)` | **SIGTRAP，起不来**（stderr 为空） |
| ad-hoc + 硬化运行时 + 官方 entitlements | 退出 0 | `0x10002(adhoc,runtime)` | **正常启动** |

**`codesign --verify` 在三种姿势下全部退出 0，对「V8 起不起得来」零区分力。**签名验得过不等于跑得起来。
这三行已锁进判定，包括「硬化 + 无 entitlements 须起不来」——它哪天起来了，本节结论即失效，故同样判红。

结合第六节：本仓 Tauri 配置现行就是「硬化运行时开 + entitlements 空」，且该组合已在 `v0.1.2` 制品上
实证。**若照现行配置把 Node sidecar 挂进 `externalBin`，且 Tauri 按同一套选项签嵌套可执行文件，
sidecar 会在首次 spawn 时 SIGTRAP。**

此处标出一条**未核实边界**：tauri-bundler 具体如何对 `externalBin` 施加签名选项与 entitlements
（是否逐件签、是否沿用主 app 的 `hardenedRuntime`／`entitlements`），本机无法一手核实——该 crate
随 `@tauri-apps/cli` 预编译分发，不在 cargo registry（已复核 `~/.cargo/registry` 无
`tauri-bundler-*`；同目录下 `tauri-utils-2.9.3` 在，故第六节的默认值属一手）。上文是「配置默认值
（一手）＋ Node 重签行为（一手实测）」的合成**推论，推论本身未实测**。坐实它须一次真实
`tauri build`，而那要改 `tauri.conf.json`——本票禁止范围。**留给 `PI-SIDECAR-RELEASE-1` 的第一问。**

另一条须提请注意：官方 entitlements 里的 `com.apple.security.get-task-allow` 属调试用途，
**分发件带它会被公证拒绝**。发行票不得整份照抄 Node 的 entitlements，须逐条筛。

`.app` 嵌套形态（路线乙产物，手工搭最小 `.app`）：

- 布局 `Contents/MacOS/pi-sidecar-aarch64-apple-darwin`；
- 按苹果次序**先签嵌套、再签外层**：两步均退出 0；
- `codesign --verify --deep --strict` 退出 0，逐行显示嵌套件 `--validated`、外层
  `valid on disk` 与 `satisfies its Designated Requirement`；
- 从 `.app` 内启动嵌套 sidecar：正常运行（`sea:"sea"`、`node:"v22.23.1"`）；
- `spctl -a -vv` → **`rejected`（退出 3）**。此为「ad-hoc ≠ 公证」的实证，非缺陷；
  该格若退出 0，判定判红——那说明被测面已不是 ad-hoc 面。

## 十二 · 反例总账

**76 枚，逐枚实注入，无一枚等价变异（`applied` 全为 `true`），无一枚逃脱，零不符。**
账目 `dist/r2-evidence/counterexamples.jsonl`，汇总 `dist/r2-evidence/tally.json`。

计数纪律三条，免得数字被重复或掩盖：

1. **按名去重**。SEA 四格在主跑与收尾各跑了一次（见下「一处账目名事故」），同一枚只计一次；
2. 被顶替的 4 条 `sea:vidence` 排除，但**如实报出条数**，不是悄悄消失；
3. `final:`／`phase1:`／`tail0:` 是读数与装配步、`:beforePresent` 是前置态核对，都不算反例，
   另计（读数与装配步 7 条、前置态核对 4 条）。

退出码：`2` ＝ 观察面反例被判据抓住；`1` ＝ 生产判定判红（物理面、形状面与 SEA 走此路）；
`0` ＝ **反向对照**，即该情形本就**不该**判红。

按探针：measure 23、coldstart 15、reproducibility 14、SEA 8、physical 11、fetch 4、extract 1。

| 反例 | 探针 | 退出 | 命中判据 |
|---|---|---|---|
| `identity.node` | measure | 2 | `identity.node` |
| `identity.arch` | measure | 2 | `identity.arch` |
| `identity.sea` | measure | 2 | `identity.sea` |
| `stdio.pong` | measure | 2 | `stdio.pong` |
| `stdio.payload.bytes` | measure | 2 | `stdio.payload.ascii-1MiB.byteLength` |
| `stdio.payload.sha` | measure | 2 | `stdio.payload.utf8-multibyte.sha256` |
| `stdio.tools` | measure | 2 | `stdio.tools` |
| `stdio.loop.tools` | measure | 2 | `stdio.loop.toolsExecuted` |
| `stdio.loop.turns` | measure | 2 | `stdio.loop.turns` |
| `stdio.eof` | measure | 2 | `stdio.eof` |
| `abort.ack` | measure | 2 | `abort.ack` |
| `abort.wasRunning` | measure | 2 | `abort.ack.wasRunning` |
| `abort.stopReason` | measure | 2 | `abort.stopReason` |
| `abort.survived` | measure | 2 | `abort.survived` |
| `crash.throw` | measure | 2 | `crash.throw` |
| `crash.exit` | measure | 2 | `crash.exit` |
| `crash.hang` | measure | 2 | `crash.hang` |
| `crash.sigterm` | measure | 2 | `crash.sigterm` |
| `crash.respawn` | measure | 2 | `crash.exit.respawn` |
| `negativeControl.launched` | measure | 2 | `negativeControl.launched` |
| `negativeControl.reason` | measure | 2 | `negativeControl.reason` |
| `inventory.extra` | measure | 2 | `inventory.unexpected`,`inventory.count` |
| `crash.ignored` | measure | 2 | `crash.throw.deadline`,`crash.throw.ack`,`crash.throw` |
| `identity.firstSample` | coldstart | 2 | `identity.node`,`identity.arch` |
| `identity.warmupSample` | coldstart | 2 | `identity.node`,`identity.arch` |
| `identity.lastSample` | coldstart | 2 | `identity.node`,`identity.arch` |
| `identity.middleSample` | coldstart | 2 | `identity.node`,`identity.arch` |
| `identity.driftRecorded` | coldstart | 2 | `coldstart.round.identityDrift` |
| `sample.missing` | coldstart | 2 | `coldstart.round.sampleCount`,`coldstart.round.keptSelfConsistent` |
| `sample.eof` | coldstart | 2 | `coldstart.sample.eof` |
| `sample.eofSignal` | coldstart | 2 | `coldstart.sample.eof` |
| `sample.warmupCount` | coldstart | 2 | `coldstart.round.warmupCount`,`coldstart.round.keptSelfConsistent`,`coldstart.sample.warmupPosition` |
| `--rounds 1` | coldstart | 1 | — |
| `--samples 10` | coldstart | 1 | — |
| `default.sha` | repro | 2 | `reproducibility.identical` |
| `codeCache.identical` | repro | 2 | `reproducibility.nonDeterministic` |
| `crossArch.warning` | repro | 2 | `reproducibility.crossArch.warning` |
| `sealed.sha` | repro | 2 | `reproducibility.identical` |
| `default.shaNull` | repro | 2 | `reproducibility.sha256` |
| `default.shaEmpty` | repro | 2 | `reproducibility.sha256` |
| `default.shaPlaceholder` | repro | 2 | `reproducibility.sha256` |
| `default.shaUppercase` | repro | 2 | `reproducibility.sha256` |
| `default.missingFile` | repro | 2 | `reproducibility.exists`,`reproducibility.regularFile`,`reproducibility.bytes` |
| `default.zeroBytes` | repro | 2 | `reproducibility.bytes` |
| `default.notRegularFile` | repro | 2 | `reproducibility.regularFile` |
| `removeSignature` | sea | 1 | `seaBuild.removeSignature` |
| `postject` | sea | 1 | `seaBuild.postject` |
| `sign` | sea | 1 | `seaBuild.sign` |
| `verifyStrict` | sea | 1 | `seaBuild.verifyStrict` |
| `extraFile` | physical | 1 | `assembly.unexpected`,`assembly.count` |
| `extraDirF261347` | physical | 1 | `assembly.unexpected`,`assembly.count` |
| `thirdRoute` | physical | 1 | `assembly.unexpected`,`assembly.count` |
| `fifo` | physical | 1 | `assembly.unexpected`,`assembly.count` |
| `symlinkArtifact` | physical | 1 | `assembly.fileType` |
| `missingFile` | physical | 1 | `inventory.missing`,`inventory.count`,`assembly.missingFile` |
| `wrongBasename` | physical | 1 | `inventory.missing`,`inventory.count`,`assembly.missingFile` |
| `nestedSubdir` | physical | 1 | `assembly.unexpected`,`assembly.count` |
| `missingCarried` | physical | 1 | `inventory.missing`,`inventory.count`,`assembly.missingFile` |
| `rootSymlink` | physical | 1 | `assembly.rootType` |
| `reportsOutside` | physical | 0 | — |
| `truncated` | fetch | 1 | — |
| `truncated:notOverwritten` | fetch | 49274880 | — |
| `wrongFile` | fetch | 1 | — |
| `restored` | fetch | 0 | — |
| `restored` | extract | 0 | — |
| `sample.duplicateOrdinal` | coldstart | 2 | `coldstart.sample.ordinal` |
| `sample.ordinalOutOfRange` | coldstart | 2 | `coldstart.sample.ordinal` |
| `sample.warmupPosition` | coldstart | 2 | `coldstart.sample.warmupPosition` |
| `round.duplicate` | coldstart | 2 | `coldstart.roundNumbers` |
| `path.wrongCell` | repro | 2 | `reproducibility.path` |
| `path.escapesAssembly` | repro | 2 | `reproducibility.path` |
| `path.wrongExtension` | repro | 2 | `reproducibility.path` |
| `removeSignature:evidence` | sea | 0 | — |
| `postject:evidence` | sea | 0 | — |
| `sign:evidence` | sea | 0 | — |
| `verifyStrict:evidence` | sea | 0 | — |

### 五项缺口的归因逐条落到具名判据

| 缺口 | 反例 | 命中判据 |
|---|---|---|
| 一 · path 未绑库存项 | `path.wrongCell`／`path.escapesAssembly`／`path.wrongExtension` | 三枚均**只**命中 `reproducibility.path` |
| 二 · 根 symlink 被跟随 | `rootSymlink`（真文件系统） | `assembly.rootType`（而非「闭集缺件」那条旧红） |
| 三 · 样本身份不完整 | `sample.duplicateOrdinal`／`sample.ordinalOutOfRange` | `coldstart.sample.ordinal` |
| 三 · 同上 | `sample.warmupPosition` | `coldstart.sample.warmupPosition` |
| 三 · 同上 | `round.duplicate` | `coldstart.roundNumbers` |
| 四 · cleanup 上界 | `crash.ignored`（受控子进程） | `crash.throw.deadline`＋`crash.throw.ack`＋`crash.throw` |
| 五 · 失败证据准确性 | 四枚 `--fail-stage` | 各自**只**命中 `seaBuild.<该阶段>`，不串味 |

四枚 SEA 反例另经 `verify-sea-ce.mjs` **解析 JSON 逐项核**：`row.status`／`row.stage`／
该阶段非零 exit 与非空 stderr／`published:false`／`publishedPath:null`／其后阶段未冒充成功，
并对整个 `publishDir` 做 `lstat` 证明物理不存在（`sea:<stage>:evidence` 四条，退出 0）。
每枚都先跑一次成功构建、确认成品在位（`sea:<stage>:beforePresent` 四条为 `present`），
再注入失败——**「先成功后失败不留 stale artifact」因此是实测，不是推断**。

### 一枚反向对照

`physical:reportsOutside` 退出 **0**：读数 JSON、`dist/build/` 构建 scratch、`runtime/`、
`corpus/` 就位（即正常状态）时，闭集判据**必须判绿**。没有这一枚，前面十枚物理反例只证明
「判据会红」，不证明「判据只在该红时红」。

### 三条判例价值

- 截断值取 `9b8142f` 当时实际观察到的 49,274,880 B。该门若当时在场，那次验收会在取件阶段就得到
  明确拒绝与三行归因，而非「无法独立重建」。拒绝后磁盘上的错件**原样保留、未被覆盖**
  （`fetch:truncated:notOverwritten` 实测仍为 49,274,880 B），删除错件后重跑即自愈。
- 预置错件那格 `tar -tzf` **通过**：结构完整的错文件靠 tar 检不出来，拦住它的是冻结字节数与 SHA。
  只做完整性校验不足以确认身份。
- 缺口一、三的七枚**生产路径**注入（不只单测）共同特征是：总数、轮数与两枚 fingerprint
  全部保持有效，只把「判据原本看不见的那一处」弄坏。**能被 count-only 或「非空字符串」
  放过的形状，才是这些反例要覆盖的面。**

### 一处账目名事故（不影响判据，影响计数）

主跑记 SEA evidence 时写了 `"sea:$stage:evidence"`，而 zsh 把 `$stage:e` 当成 `:e`
（取扩展名）修饰符，标签被吃成 `sea:vidence`——四条同名，无法逐枚归属。
**判据本身跑对了**（四份 `ce-sea-<stage>-verify.txt` 各自齐全、退出 0）。
处置：脚本改用 `${stage}`，收尾以正确标签重跑一遍，主跑那四条作为**被顶替**行排除并报出条数。
判例：**shell 变量后紧跟 `:` 时一律加花括号**；账目名错不改变结论，但会让「逐枚归属」失效。

## 十二之二 · R2 的施工序与三枚 blocker 的先红留档

票面要求三枚 blocker **在未改 production 的 R1 tree 上直接先红**。逐枚留档如下。

### blocker 1 · 物理实验（不走判定层）

R1 production 里压根没有枚举磁盘的函数，缺函数只会红在模块加载——那不是缺陷红。
故这枚取物理实验，与 `f261347` 的做法一致：在 R1 布局的 `dist/route-a/` 下真落一份
`unexpected-physical/proof.txt`（100 B），既不删也不改任何预期产物，随后跑**未改的**
`node scripts/measure.mjs`。

实测：十件 probe 全部执行完毕（10 件在位，8 枚候选各真跑一轮 loop），输出

```
status=ok failures=0
MEASURE_EXIT=0
```

即一个实际多制品的分发被 production 判绿。原始留档：
`dist/r2-evidence/blocker1-measurements-R1-production.json`（`status:"ok"`、`failureCount:0`）
与同目录的 stdout/stderr、exit 记录。

### blocker 2 / 3 · 判定层直调

在 R1 的 production 判定上加定向测试，喂 `f261347` 坐实的**真实收束形状**：

- blocker 2：`round.identity` 为漂移**后**的正确值、`identityDrift` 非 null（即 R1
  `sampleRound` 的实际返回）→ `verdictColdstart` 返回 `[]`；
- blocker 3：`seaDefault` 两项 `shas:[null,null]`、`identical:true` →
  `verdictReproducibility` 返回 `[]`。

实测：`probe-verdict.test.mjs` 由 102 例增至 105 例，**红 3 例**，失败信息均为
「期望判红，实际零失败」——红点落在既有缺陷，而非模块加载。

### 收紧后的区分力复核（三枚外科变异）

「收紧后全绿」本身不证明判据有区分力——绿也可能是测试写松了。故在 R2 树上对**判定层**做三枚
外科变异，逐枚复核红面归属（观察形状保持 R2 不变，只松判据）：

| 变异 | 松掉的判据 | 红例数 | 红面 |
|---|---|---|---|
| A | `verdictAssembly` 直接 `return []` | **11** | 全部落在 assembly 实物闭集，合格观察仍判绿 |
| B2 | 逐枚样本身份 + `identityDrift` 两层去掉 | **6** | 首/末/warmup/中段身份错、漂移记录、blocker 2b |
| C2 | 删掉 SHA 有效性前置闸 | **10** | null/空串/占位/大写/截断/缺件/非 regular/零字节/无路径、blocker 3 |

三枚变异下「合格观察即通过」那一例**均未变红**，说明红的是判据而非构造件。还原后
`probe-verdict.test.mjs` **158/158 全绿**。

### 一处方法失败，如实登记

首次尝试用「整份 R1 `probe-verdict.mjs` 换回去」来复核，得 `tests 1 / fail 1`——
R1 版本没有 R2 新增的导出，测试文件在 **import 阶段**就崩了。那是模块加载红，不是缺陷红，
**零区分力**，已作废。

第二次尝试（记为变异 B、C）把判定与**观察形状**一起换回 R1，结果红的是「合格观察即通过」
那一例，而三枚 blocker 锁反而仍绿——即变异改坏的是构造件，不是被测判据。
同样**零区分力，已作废**，不计入上表。上表的 A／B2／C2 是第三次、也是唯一有效的一组。

判例价值：**判定与观察形状同批改动时，「把 production 换回旧版」不是有效的区分力探针**——
旧判据读不懂新形状，红会落在形状不匹配上。有效做法是保持新形状不变，只松掉那一层判据。

## 十三 · 原稿路线建议的处置

原稿第十节给出「取路线乙的 `default` 档」的建议。ADR-022 已撤销该建议的消费资格，且本票的权威文件
明载路线由架构裁定。**本返修版删除路线建议，不另提新建议**，只交对照证据。
第十四节按维度列两条路线的实测差异与各自的反对理由，供架构裁定时取用。

## 十四 · 两条路线的证据对照（不裁）

两条路线在功能维度未分出胜负：stdio、真实 loop、abort 语义、四类崩溃回收、双架构装配，
八枚候选逐项同构全过，且每一项都由判定层证伪过（第十二节）。差异如下。

| 维度 | 路线甲（runtime + sealed bundle） | 路线乙（Node SEA） |
|---|---|---|
| 随包文件 | **2 件**（externalBin + resources 两套机制） | **1 件**（externalBin 一条） |
| Rust 侧 | 须解析 resource 路径并作 argv 传入 | spawn 即用 |
| shipped 体积（arm64） | 108.03 MiB | 107.18／107.41 MiB（优势在真实 Developer ID 签名后大部分消失） |
| 冷启（arm64，三轮） | 42.8 ms（CJS） | 41.9 ms（default）／35.2 ms（code-cache） |
| 打包格式约束 | ESM 须加 `createRequire` banner，否则运行即死；CJS 无此坑 | 只收 CJS，无选择余地 |
| 上游风险 | esbuild（稳定，MIT） | esbuild ＋ **alpha 版 postject** ＋ **Stability 1.1 的 SEA** |
| 产物可复现性 | bundle 与 node 二进制均逐字节可复现 | `default` 可复现（同构建路径下）；`code-cache` **不可复现** |
| 排障 | 崩溃栈指向磁盘上可读的 `sidecar.cjs`，可直接改文件复跑 | 栈指向嵌进二进制的内容，改一行要重跑整条注入链 |
| 更新运行时 | 换 node 二进制或换 bundle 可分别进行 | 任一变更都要重跑 remove-signature → postject → 重签 |

各自的主要反对理由，对称列出：

- **反对路线乙**：上游风险叠两层（alpha 版 postject ＋ Stability 1.1 的 SEA）；排障与热修更重；
  产物字节含构建路径，跨机比对 SHA 须先规范化路径。
- **反对路线甲**：两件产物意味着两套装配机制，Rust 侧多一条须解析并传递的路径，多一类
  「资源找不到／路径不对」的失败模式；ADR-022 六-A 已把「WebView 不拥有绝对路径」写成边界。

与路线无关、无论选哪条都须做的两条：

1. 按第十一节筛定 entitlements，并在真实 Tauri 打包链上验证嵌套签名，否则 sidecar 会 SIGTRAP；
2. 打包格式定为 **CJS**。路线甲的 ESM naive 档已实证运行即死（且作为负控常驻装置），
   路线乙根本不收 ESM。

`useCodeCache` 是独立于路线的一项开关，其代价已量化：换 6.7 ms（arm64）要付出产物不可复现，
与本仓「SHA 只锚内容」的验收习惯冲突；跨架构静默降级须构建期断言该 warning 不出现才安全。
**是否开启属 [需架构拍板]，本件不建议。**

## 十五 · 失败与观察记录

### 一 · 路线甲最直觉的 ESM 形态打得出来但跑不起来（路线级，已转为常驻负控）

`format:'esm'` 打包，esbuild 零 warning、退出 0，运行即死：

```
Error: Dynamic require of "process" is not supported
```

退出码 1。根因在 `yaml@2.9.0`（`@earendil-works/pi-agent-core` 的直接依赖）是 CJS 且
`require("process")`；esbuild 在 ESM 产物里把它降成会抛错的 `__require()` 垫片。
两种修法实测有效：加 `createRequire(import.meta.url)` banner（esbuild 官方做法），或直接产 CJS。

返修后该档不再只是「留档红证」，而是**库存里的两枚负控**：它须失败，且须以这句话失败；
跑起来了或换了失败原因，判定同样判红。

判例价值：**「打包成功且零 warning」对「产物能跑」零区分力**。

### 二 · 首轮八枚产物 abort 全红，真因在实验装置（`70e6482` 已修，此处存档）

第一轮全量实测 abort 全部超时。因八枚同形同错，先按装置嫌疑排查而非按路线差归因——定点复现坐实：
fixture 把 stdin 每个包都挂在同一条 `queue.then(...)` 串行链上，`abort` 排在正在跑的回合后面，
永远等不到执行。修法是控制面旁路串行队列。

判例价值：ADR-022 六-B.1 的 `cancel` 按定义就是要打断在途 prompt，**不能与 prompt 共用一条串行链**，
否则取消对在途回合结构性不可达。此点是 `PI-CODE-STDIO-1` 的直接输入。

### 三 · 单轮冷启读数会被负载带偏（方法论，返修后升级为形状门）

原稿实测到同一枚 `b/x86_64/code-cache` 在两次全量实测里给出 111 ms 与 219 ms。返修后冷启形状
（三轮 × 25 样本 × 丢 3 热身）与逐轮随机化次序均成为判据，少轮少样本即非零；
`measure.mjs` 里那份「声明不作数」的单轮读数已整体删除，不再留在读数文件里诱人引用。

### 四 · 装置对机器负载敏感，失败方向为假红（本次新观察）

反例总跑期间，两次出现候选在 30 s 内未发出 `ready` 而被 harness SIGKILL，stderr 为空：
`a/x86_64/cjs` 与 `b/aarch64/code-cache` 各一次。发生窗口与本会话并发执行 `pnpm -r build`／
`pnpm lint`／`pnpm test` 重合；两枚反例在机器空闲后重跑，失败消失，判据回到单一命中项。

估算频次：每轮 measure 约 90 次 spawn，22 轮约 1,980 次，观察到 2 次，约 1/1000。
**未调高 30 s 超时**：正常读数为 35～129 ms，30 s 已是 250 倍余量，放宽只会把真实故障一并吞掉。
失败方向是假红而非假绿，与本票要修的问题相反，故按「跑时机器须空闲」处理并在此登记。

该频次**只登记本次观察，不外推为免责频率**：它不是「装置有 1/1000 的容错额度」，
是「反例总跑期间不得并发跑全仓门」这条操作纪律的出处。

### 五 · R2 据上一条改了操作序（本票）

R1 的观察指出假红窗口与并发 `pnpm -r build`／`lint`／`test` 重合。R2 因此把反例总跑与全仓门
**完全串行**：反例扫完、最终一轮读数取完，才跑四项仓库门。本票反例总跑期间零并发门，
未观察到 30 s 未 ready 的假红。

**未调高任何超时**，与 R1 同口径。

### 六 · 「换回旧 production」不是有效的区分力探针（本票，方法论）

详见第十二节之二。两次作废的尝试与最终有效的做法都已如实登记，不以「作废的探针」充数。

判例价值：**判定与观察形状同批改动时，把 production 整体换回旧版只会红在形状不匹配上**。
有效探针必须保持新形状不变，只松掉待验证的那一层判据。

### 七 · 补跑被排了两次队，三条「不符」是竞争产物（本票，操作失误）

补跑首次尝试出现三条 `repro:path.*` 不符（`expected=2 actual=1`）。**根因不在被测装置，
在实现会话自己的编排**：补跑被两个等待器各排了一次，其中只有一个带互斥标记，
于是主跑标记一落地，两份 `run-gap3-supplement.sh` 同时开跑。两份实例共用同一套
`dist/build/route-b/<cell>/staging/`，互删对方的 staging，`codesign --sign` 报
`No such file or directory` → `build-sea.mjs` 判红 → `reproducibility-probe.mjs` 的
`mustRun()` 抛出、进程以 1 退出，而反例路径本该退 2。

处置：**整批 29 条移出主账**（留档 `dist/r2-evidence/VOID-raced-supplement.*`），
不从中挑「看起来对的」；assembly 与 build scratch 清空重建；补跑改为 `mkdir` 原子锁的
**单实例**，且与最终矩阵合进同一个进程，从根上没有第二次排队的机会。
主跑那 79 条不受影响（`final:residue` 为其末行，`RUN_ALL_FAIL=0`）。

该缺口本身的证据并不依赖那三条：判据侧另有两路且都成立——`probe-verdict.test.mjs`
的五枚定向用例，以及变异 G1（exact path 门退回「非空字符串」）红 5 例。

判例价值：**等同一个信号的等待器之间也要互斥**。两次排队各自看起来都无害，
真正的错是没有把「这一步只能跑一次」做成单点。另一条：**并发污染的批次要整批作废**，
按条挑拣等于用「碰巧没被撞到」冒充证据。

## 十六 · 新增依赖

本票**未改** `packages/pi-lane/package.json` 与根 `pnpm-lock.yaml`；下表是 `70e6482` 引入、
本次逐份重读 LICENSE 复核的结果。

| 包 | 版本（exact） | 许可（一手读 LICENSE） | 用途 | 移除结论 |
|---|---|---|---|---|
| `esbuild` | `0.28.1` | MIT（`LICENSE.md`，Evan Wallace） | 两条路线都要把 ESM 模块图打成单文件；路线乙的 SEA 只收 CJS 入口 | **保留**。任一路线选定，生产分发票都需要它；两路线全否则与该票同批销号 |
| `postject` | `1.0.0-alpha.6` | **Postject 自有部分 MIT**（Postman, Inc）；**package 内 `vendor/LIEF` 为 Apache-2.0** | Node SEA 官方文档指定的 blob 注入工具，路线乙无替代 | **随裁定去留**：选路线乙则转入生产分发票；选路线甲则立即移除 |
| `commander` | `9.5.0` | MIT（`LICENSE`，TJ Holowaychuk） | `postject` 的传递依赖，非直接引入 | 随 `postject` 去留 |

**许可口径（ADR-022 六-E 冻结，本票逐行复核）**：`postject@1.0.0-alpha.6` 的 `LICENSE` 共 236 行，
开篇 MIT 覆盖 Postject 自有部分；第 32 行起写明「LIEF, located at `vendor/LIEF`, is licensed as
follows:」，随后是 Apache License 2.0 正文（第 34 行起）。`package.json` 的 `license` 字段只写
`MIT`，**单看该字段会漏掉 vendor 那一半**。

该 vendor 是否随最终分发件一同交付、以及由此产生的 notice 义务，**归 `PI-SIDECAR-RELEASE-1` 复核**，
不在本票判断范围。

三条附注：

- `esbuild@0.28.1` 本就已在 lock 中解析（vite 的传递依赖），`70e6482` 只加了 importer 声明。
- 本机只装 `@esbuild/darwin-arm64@0.28.1` 一个平台包；跨平台 CI 会按需拉各自平台包，本票未实测。
- `postject` 是 alpha 版本，Node 22 的 SEA 本身标 **Stability 1.1 · Active development**。
  选路线乙即接受「一个 alpha 工具 ＋ 一个活跃开发中的运行时特性」两项上游风险，
  须按 ADR-022 决定五逐版复核。

## 十七 · blocked 与未决

| 项 | 状态 | 原因 |
|---|---|---|
| 分发路线选型 | **[需架构拍板]** | 本件只交证据；ADR-022 六-E 明载由架构裁定并回写 |
| `useCodeCache` 是否开启 | **[需架构拍板]** | 代价已量化（第十节），取舍非本件职权 |
| Developer ID 签名、notarize/staple、Gatekeeper 首启 | **blocked** | 本机无证书无凭据；属 `PI-SIDECAR-RELEASE-1` |
| tauri-bundler 对 `externalBin` 的实际签名选项与 entitlements | **未核实** | crate 随 `@tauri-apps/cli` 预编译分发，不在 cargo registry；坐实须真实 `tauri build`（要改 `tauri.conf.json`，本票禁止范围） |
| 原生 x86_64 硬件上的真实性能 | **blocked** | 本机 Apple M2，x86_64 全程经 Rosetta 2 翻译 |
| Windows / Linux 装配与签名 | **blocked** | 本机 macOS；两平台的 SEA 注入参数与签名模型均不同 |
| 真实 DeepSeek key 端到端 | **未做** | 本票用 faux provider；与分发无关，沿 `packages/pi-lane/SPEC.md` 第七节由持 key 者另记 |
| 跨平台 CI 的 esbuild 平台包与 blob 生成 | **未实测** | 本机只装 `@esbuild/darwin-arm64`；x64 blob 借 Rosetta 生成，真实 CI 拓扑另议 |
| 跨机、跨构建路径的 SEA 产物可复现 | **未实测** | 本次两个 cycle 在**同一 worktree、同一绝对路径**；blob 含入口绝对路径，换路径字节必变（第七、十节） |
| Developer ID 签名后的净体积 | **未实测** | 本机无证书；ad-hoc 与 Developer ID 的签名段大小不可互推，属 `PI-SIDECAR-RELEASE-1` |
| `postject` 的 `vendor/LIEF` 是否随最终制品交付、notice 义务 | **归发行票** | 许可事实已一手核实（第十六节）；是否进分发件属 `PI-SIDECAR-RELEASE-1` |

## 十八 · 复现与残留

复现序见 fixture
[`README.md`](../../packages/pi-lane/fixtures/sidecar-dist/README.md)。判定层的测试单独跑：

```bash
node --test packages/pi-lane/fixtures/sidecar-dist/scripts/probe-verdict.test.mjs
```

本票实测的实际时序：`dist/` 从空开始 → 取件与解包（官方来源门）→ **从空 assembly** 双 cycle 装配
→ 76 枚反例逐枚注入（其间 assembly 与 build scratch 多次从空重建）→ **清洁重建 + 机器空闲下的
最终一轮** measure／冷启／签名／残留清点。本文全部数字取自该最终一轮与
`dist/r2-evidence/` 的逐枚留档；`dist/final/` 是最终一轮的独立副本。

**最终矩阵必须是最后一步**：补跑的 SEA 重建会改掉 `code-cache` 的 SHA（该档按设计不可复现），
故凡在补跑之前取的读数一律不作最终值。

### 残留：三个数**并列**，互不取代

ADR-022 六-E 已把口径拍板为并列而非订正——它们是三个不同的**保全范围**，不是同一个量的三次修正：

| 出处 | 字节 | 保全范围 |
|---|---|---|
| `3207b27` | 2,436,991,750（2.27 GiB） | 原实验的历史峰值 |
| `PI-SIDECAR-DIST-1R` | 2,527,892,648（2.35 GiB） | 含 31 份反例、`cross-arch/` 与 final 读数的较大范围 |
| **`PI-SIDECAR-DIST-1R2`（本票）** | **2,530,884,707（2.36 GiB）** | 含 76 枚反例留档、`first-red/`、作废批次留档与 final 副本 |

本票值取自 `node scripts/clean.mjs --report-only` 的实测输出（原始 JSON
`dist/final/residue.json`），非估算。逐项求和：

| 子目录／文件 | 字节 |
|---|---|
| `assembly/`（十件随包制品） | 1,143,565,916 |
| `sign-probe/`（六份重签副本 + `.app`） | 787,467,416 |
| `runtime/`（两份官方发行包 + 解包树） | 473,562,352 |
| `cross-arch/`（跨架构注入件） | 115,806,624 |
| `build/`（构建 scratch：中间 bundle、sea-config、blob） | 5,854,238 |
| `void-aborted-sweep-2026-07-28/`（作废批次留档） | 1,991,987 |
| `r2-evidence/`（反例逐枚留档与账目） | 1,871,732 |
| `final/`（最终一轮副本 + manifest + residue） | 328,383 |
| `coldstart-rounds.json`（600 枚样本逐枚） | 226,941 |
| `first-red/`（三枚 blocker 与五项缺口的先红留档） | 109,410 |
| `measurements.json` | 66,715 |
| `build-sealed.json` | 10,211 |
| `build-sea.json` | 7,801 |
| `sign-probe.json` | 7,065 |
| `reproducibility.json` | 5,035 |
| `runtime-source.json` | 1,582 |
| `runtime-fetch.json` | 920 |
| `counterexamples/`（现生成的 crash 桩） | 302 |
| `corpus/`（语料） | 77 |

**逐项求和 = 2,530,884,707 B，与总计一致**（脚本内即时复核，见 `report-numbers.mjs` 输出）。

与 R1 的 2.35 GiB 相比多出约 2.99 MB，构成是本票新增的留档面：`r2-evidence/`、
`first-red/`、作废批次与更大的 `coldstart-rounds.json`（逐枚 600 样本比 R1 的收束值大得多）。
二进制制品面（`assembly` + `sign-probe` + `runtime` + `cross-arch`）与 R1 同量级。

全部产物落 `packages/pi-lane/fixtures/sidecar-dist/dist/`，被仓库根 `.gitignore` 的 `dist/` 覆盖，
**不入库**。**独立验收前不要真清**：`dist/r2-evidence/`、`dist/first-red/`、`dist/final/` 与
`dist/void-aborted-sweep-2026-07-28/` 分别是反例红证、先红留档、最终读数与作废批次的留档。
