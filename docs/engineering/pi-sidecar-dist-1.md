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

## 十九 · R3：entitlements 与 security execution domain 证据链

`PI-SIDECAR-DIST-1R3` 只修签名实验的证据链，不改两条路线的构建、runtime 或产品代码。
R2 production 的判定层原有 **203/203** 例先绿；加入 21 枚 R3 定向测试、尚未改 production 时，
得到 **224 例中 203 绿、21 红**。红点分别落在 canonical 输入、execution-domain 分类、
control、official signature、spctl、XML／DER human、六格 actual entitlements 与 tool receipt，
不是 missing import、stub 或脚本未命中。收紧后 **224/224** 全绿。

### 十九之一 · canonical 输入与四层 observation

唯一重签输入是仓内
[`upstream/node-v22.23.1/osx-entitlements.plist`](../../packages/pi-lane/fixtures/sidecar-dist/upstream/node-v22.23.1/osx-entitlements.plist)。
它逐字来自 Node v22.23.1 commit
`bd96dfbf0361576724b65322046e2ca9f9609cb9`：上游签名脚本 blob
`346afdbe66e9fda3349c46b5ccae221160313720`，plist blob
`045df8eaf98e65e4fb4ea9a82b5821d41590dbdd`。仓内实物为 regular file、**632 bytes**、
SHA-256 `a0387464b93dd3d92c9f92c3d3f67713b355cc76d131f0542a69d2ca2cc6d797`，
`/usr/bin/plutil -lint` 通过，六键全为 `true`。脚本没有历史 `dist/`、runtime extraction、
临时生成或路径逃逸 fallback。

四层 observation 都绑定这份 input：

1. **control**：official arm64 Node 的私有副本以 canonical 重签，strict verify 通过，XML
   为 568 bytes、SHA-256
   `cf2c3d27530139c19ee66f289be8169991dc3206322d5df3c22f529c136883e6`，并真跑冻结
   `sidecar-fixture.mjs` 完成 `ready → EOF → exit 0`。
2. **official Node 原签名**：Identifier `node`、CDHash
   `59cdea89a982b05f23e756c08115bebc555ff092`、TeamIdentifier `HX7739G8FX`、
   flags `0x10000(runtime)`，Authority 按序为 Node.js Foundation Developer ID、
   Developer ID Certification Authority、Apple Root CA；synthetic `.app` 的 spctl 为 exact
   exit 3、stdout 0 bytes、第一非空 stderr 行 `<absolute-app-path>: rejected`。
3. **两条独立 entitlement extraction**：XML stdout 568 bytes；DER human-readable stdout
   469 bytes、SHA-256
   `954631d7167d00e90d08416ff1aa128785b111ec68e54f4aa544e55481937147`。
   两者分别严格解析，均逐键等义于 canonical；没有以 XML 结果代填 human observation。
4. **六格签后回读**：两候选 × plain／hardened-no-entitlements／
   hardened-with-node-v22.23.1-entitlements 共六格。六格 sign 与 strict verify 均 exit 0；
   plain 两格可启动、hardened-no-entitlements 两格按冻结形态不可启动、带 canonical 的两格可启动。
   前四格 actual entitlements 为空，后两格 actual 六键全 `true`。嵌套 `.app` 另证
   nested sign → outer sign → deep strict verify → 内嵌 sidecar `ready → EOF → exit 0`，
   其 spctl 同样 exact exit 3／rejected。

### 十九之二 · 两个 execution domain 与工具实物绑定

受限域 final preflight 的独占目录为
`dist/security-domain/impl-seatbelt-final/`。control 自身完整通过，但 official Node strict verify
返回 security service 不可用、Authority 为 `(unavailable)`，spctl 返回 Code Signing subsystem
internal error；因此精确分类为 `security_execution_domain_blocked`，不是普通 `probe_failed`。
其 manifest path 为
`dist/security-domain/impl-seatbelt-final/manifest.json`，外算 SHA-256
`4ef6b974ca69c1bd8cc9328d0cd41735f61985f2f5db4093d4c5fffeddd4b2f0`。

经明确批准的非-seatbelt 域在同一进程先完成 preflight，再跑 full；独占目录为
`dist/security-domain/impl-approved-full-final/`，manifest `status:"ok"`，外算 SHA-256
`cedfd3a35c7da21d298e9adea7a38abee492e3691fa88642ccd0910ec0d449ff`。
该 manifest 逐文件绑定：

- `host-tool-receipt.json`：83,497 bytes，SHA-256
  `d2ae4844c3b02ffada4859805aeaa06ac0ccdd75df069a2a5bff5e720c01798c`；
- `preflight.json`：13,056 bytes，SHA-256
  `1b2e93effd3030dd6f4c86dfbf6b767eb473ef80efeb32c233104786be442a79`；
- `sign-probe.json`：154,831 bytes，SHA-256
  `6a4869df83b34a20a9a18e302f611a709f86019a296f776260157fac449a6c6c`。

所有 Apple 工具只以 `/usr/bin/codesign`、`/usr/sbin/spctl`、`/usr/bin/plutil` 调用；
同轮 receipt 证明 regular、非 symlink、bytes、SHA、Mach-O architectures，所有命令
`LC_ALL=C`，command receipt 再绑同一工具 SHA 与 stdout/stderr bytes+SHA。顶层共享
`dist/sign-probe.json` 不存在；重复使用 `impl-approved-full-final` 与非法 id `../escape`
均在动作前以 exit 2 拒绝，既有目录未被覆盖。

`sign-probe.mjs` 的 ready、EOF、exit、kill-confirm 均为具名 deadline，不含裸
`await proc.exited`。`get-task-allow:true` 只是上游 canonical ad-hoc probe 的控制变量，
没有进入 product signing plan。

### 十九之三 · mutation、全量重跑与残留

三枚 source mutation 保持 observation 形状不变，只短路一层判据：

| mutation | 224 例结果 |
|---|---:|
| preflight 判据短路 | 218 绿、6 红 |
| official XML／DER observation 判据短路 | 218 绿、6 红 |
| host/tool receipt 判据短路 | 222 绿、2 红 |

逐枚恢复后 224/224 绿。另有真实入口反例：受限域准确 blocked、PATH-shim argv 被判红、
spctl internal error 不得冒充 rejected、空 XML、human 少键／多键／false／重复键、六格
canonical SHA／actual entitlements 漂移、重复 execution-domain 目录与非法 id，均有红证。

快速签名门通过后，从空 `dist/assembly` 完整重跑：

- verdict **224/224**（其中 R2 203、R3 21）；
- R2 固定 **76** 枚反例：23 verdict、15 cold-start、14 reproducibility、8 SEA、
  11 physical、4 fetch、1 extract，全部命中冻结退出码；
- normal measurement：十件闭集、8 候选、2 负控，`status:"ok" failures:0`；
- cold-start：8 候选 × 3 轮 × 25 样本 = **600**，`status:"ok" failures:0`；
- 双 cycle：三份 sealed bundle 与两架构 SEA default 指纹各自相同；两架构 code-cache 指纹
  各自不同；跨架构注入观察到 exact `Code cache data rejected.` warning；
- runtime source、受限域 preflight、批准域六格 full 均取自本轮，不回填旧 `dist/final`。

四项仓库门串行实跑：`pnpm -r build` exit 0、`pnpm lint` exit 0、
`pnpm --filter @courtwork/desktop lint:isolation-binding` exit 0。`pnpm test` 在受限域首跑与
单文件复核都只红 `packages/pi-lane/src/sidecar.test.ts` 的 8 例，且八例同样停在
`server.listen(0, '127.0.0.1')` callback 前的 5 s timeout；在明确批准的非-seatbelt 域完整重跑，
**160 files / 1397 tests** 全绿、exit 0。没有修改该测试或产品源码来回避执行域差异。

本轮 `clean.mjs --report-only` 为 **4,664,670,380 bytes（4.34 GiB）**，未清理。
主要保全范围为 `security-domain/` 2,924,845,105 bytes、`assembly/` 1,143,565,916 bytes、
`runtime/` 473,562,352 bytes、`cross-arch/` 115,806,624 bytes、`build/` 5,854,322 bytes、
`r3-evidence/` 716,291 bytes；其余为本轮 JSON 与小型 corpus。旧 R2 残留数字保留其历史口径，
本节只报告 R3 当前物理范围。

本节只登记实验事实与证据边界，**零路线建议**；状态停在待独立验收。

## 二十 · R4：raw→verdict 全链闭口与批准域全矩阵

`PI-SIDECAR-DIST-1R4` 只闭合判定链，不改两条路线的构建、runtime、库存、wire 或产品代码。
本节**零路线建议**：只登记实测、执行域前提与最强反对意见。

### 二十之一 · 三种 execution domain 必须分开读

R3 之前的争议全部源于「把不同执行域的读数混成一次运行」。R4 起三者分列，互不代替：

| 域 | 由谁跑 | id | status | manifest SHA-256 |
|---|---|---|---|---|
| Seatbelt 受限域 | 架构支持会话 | `arch-r4e-seatbelt-frozen` | `security_execution_domain_blocked` | `1d3b06fd1a88a5a81f7015013578258707dad6065d44d79ece209aaabe590f04` |
| 缺 build 混合态 | 架构支持会话 | `arch-r4e-mixed-frozen` | `probe_failed` | `d5c2af8c70b02dac6499f975d34c8e88ab2ebb646f3daedcde3407ea06a55fbf` |
| 实现域 preflight | 实现会话 | `impl-r4g-preflight` | `passed` | `8adc88b2f5dfb991cfa88e80e5393641d857f367effd8e12eaa38436dd7dd3d8` |
| 实现域 full | 实现会话 | `impl-r4g-full` | `ok`（六格全过） | `d257c301fd9afbd24b07baa018a97a775214ea58d851bd0bc0d49dd728e893ca` |

**provenance 必须连读**：前两格由架构支持会话在**同一实现 worktree 的冻结 production bytes**
上代跑，不是实现者自跑，也不替代独立验收自跑。实现会话的功能 preflight 证明本域**非受限**
（control sign/verify/XML 全 0、XML 568 bytes、官方 Node strict verify 通过并解出真实三条
Authority、`spctl` exact exit 3 `rejected`、`blockedReasons` 空），故实现域**不可能**自证
Seatbelt blocked——这正是要由外部域补格的原因。

冻结 production blob（此后任一字节变化都令上面两格作废）：

- `scripts/sign-probe.mjs`：`ebedb76d8cc53c68b01f2bc7dfcdee4c97f9e0e9`
- `scripts/lib/probe-verdict.mjs`：`bf260c53af189e96e27310fce64748e18f5e0c45`
- `scripts/probe-verdict.test.mjs`：`4e08bced058a2cab4c46e42aa8c3723afe4d9a42`
- `fixtures/sidecar-dist/README.md`：`3b64b0dbf2f55db2769f5dd76a2374d2f01c5c87`

### 二十之二 · 判定层闭合了什么

`eb71d6f` 判定的三处 false-green 与其后四轮复核暴露的口子，逐条收紧：

1. **完整同轮 receipt 原样入 verdict**，逐字段硬门 `schemaVersion` / execution-domain id
   （与 probe exact 相同）/ `capturedAt` / host 六字段与 `platform:'darwin'` / harness
   `path===execPath` 与架构一致 / CLT 两字段 / official 双 SHA / canonical source 五值 /
   三工具各至少一条同轮 command。
2. **DER human 由共享纯 parser 从 raw stdout 严格重解析**，与 producer 的
   `parseError/entries/values` 逐值互证；`stderr` 整流逐字节等于 `Executable=<official-path>\n`；
   `expectedExecutable` 取已绑定的 receipt official path，不取 command 自报 argv-last。
3. **preflight 分类次序固定**为 control lifecycle → 已冻结闭集内的具名 security evidence →
   passed → 其余；blocked reason 由判定端从本轮六条 raw receipt 重导并与 producer exact parity。
4. **official 四条命令锁同一条已过 SHA 的 receipt path**；八条关键观察与
   `receipt.commands` 中同一条 receipt 逐字段相同（identity 含 production 已记录的 `error`）。
5. **gate 只从绑定 raw command 重导**：五条成功命令必须 exit 为预期值**且** `signal === null`；
   official identity 从 raw display 重解析；Gatekeeper 首非空行从 raw stderr 重取；`spctl`
   argv exact。四个 gate 由 `deriveGatesFromRaw()` 单一定义构造，classifier 只消费重导值，
   `preflight.gates` 与之做**恰四键 exact flat record** 比对。
6. **XML 语义不自研第二套宽 parser**：绑定绝对 `/usr/bin/plutil` 的 `-lint` 与
   `-convert json -o -` 两条完整 receipt，核落盘件指纹等于 raw codesign stdout、两条 argv exact
   指向该件，再从绑定 JSON stdout 自行解析核六键，producer 摘要只作 parity。

定向测试 **356 例全绿**（`node --test`，exit 0；R2 203 + R3 21 + R4 132）。

### 二十之三 · mutation

**31 枚 source mutation 逐枚验证命中、逐枚定向见红、逐枚 byte-identical 恢复**，
其中 **30 枚有效**，**1 枚（`m22`）等价，如实登记不充作红证**：把 classifier 改回消费
producer 自报的 `preflight.gates` 得 **0 红**——因为 gates parity 会独立抓住任何分叉。
「classifier 只消费重导值」这条性质是与 parity **联合**成立的，不是由一处可单独撤掉的检查守住；
这一点必须照实说，不能记成 mutation 覆盖。

`m1`（`runFullProbe()` 退回 `{tools,commands}` 投影）需要物理 full，故以一次性 disposable
非受限 full 做对照实验：control 7 failures（全部来自当时缺 assembly 的 artifact-missing），
mutated 17，**delta 恰 10 ＝ 8 receipt identity + 2 human-path**，随后 `sign-probe.mjs`
byte-identical 恢复。

另有一条**结构性、无 mutation** 的边界照实登记：full matrix 串味防护由构造保证
（`deriveSecurityBlockedReasons()` 入参是固定六条 preflight receipt 的闭集，`verdictPreflight`
根本拿不到 `resign`），只有通过用例，没有可撤掉的检查，故不声称有 mutation 覆盖。

### 二十之四 · 批准域全矩阵实测

严格串行，未与 Rosetta、冷启或仓库门并发：

- **来源门**：arm64 `50,067,502` B / `ef28d8fa…`，x64 `51,245,086` B / `b8da981b…`，
  SHASUMS 对应项、`tar` 完整性、解包后 `v22.23.1` 与 Mach-O 架构全过；解包后 arm64 实物
  SHA-256 `2e3f1286…b99d`，等于冻结官方值。
- **双 cycle 可复现性**：三份 sealed bundle 与两架构 SEA default 各自 byte-identical；
  两架构 code-cache 各自**不**相同；跨架构注入观察到 exact `Code cache data rejected.`。
  边界：byte-identical 只在**同一 worktree、同一绝对构建路径**下成立（SEA blob 内含入口
  绝对路径），换路径与 Developer ID 后净体积均属未实测。
- **十件库存闭集**：8 候选 + 2 负控，`status:"ok" failures:0`；assembly 恰 12 目录 / 16 文件。
- **stdio / tool loop / abort / 四类崩溃**：十件逐项过，崩溃 exact code/signal 与复启齐备。
- **冷启动**：8 候选 × 3 轮 × 25 样本 ＝ **600** 样本逐枚留档，`status:"ok" failures:0`。
- **六格签名**：两候选 × plain / hardened-no-entitlements / hardened-with-node-v22.23.1
  全部 sign 与 strict verify exit 0；plain 与带 canonical 输入的两格可启动，
  hardened-no-entitlements 两格按冻结形态不可启动；签后回读 actual entitlements 前四格
  `none`、后两格六键逐值等同。嵌套 `.app` 另证 nested → outer → deep strict verify 全 0、
  内嵌 sidecar `ready → EOF → exit 0`、`spctl` exact exit 3 `rejected`。
  该轮 manifest 逐件绑定 `host-tool-receipt.json` 81,831 B `d8a6f6a6…`、
  `preflight.json` 16,014 B `bf80bbb6…`、`sign-probe.json` 166,365 B `86386ac5…`。
- **76 枚反例逐枚串行实注入、零逃脱、零不符**：measure 23（exit 2）、coldstart 15
  （13 枚 exit 2 + `--rounds 1` 与 `--samples 10` 各 exit 1）、reproducibility 14（exit 2）、
  SEA 8（四枚 `--fail-stage` exit 1 + 四枚 `:evidence` exit 0）、physical 11
  （十枚 exit 1 + 反向对照 `reportsOutside` exit 0）、fetch 4、extract 1。
  每枚物理反例还原后复跑 `measure` 均回到 exit 0。

  四枚 SEA `:evidence` 逐项解析同轮 JSON 核：`row.status='failed'`、`row.stage` 等于注入阶段、
  该阶段非零 exit 与非空 stderr、`published:false`、`publishedPath:null`、其后阶段未冒充成功、
  `publishDir` 内成品物理不存在，且顶层 failures **只**命中该阶段（不串味）。每枚注入前先跑一次
  成功构建并确认成品在位，故「先成功后失败不留 stale artifact」是实测而非推断。

  `fetch:truncated:notOverwritten` 取 `9b8142f` 当时实际观察到的 **49,274,880 B**：拒绝后错件
  原样保留、未被覆盖。预置错件那格 `tar` 能过——拦住它的是冻结字节数与 SHA，**只做完整性校验
  不足以确认身份**。

### 二十之五 · 残留与最强反对意见

`clean.mjs --report-only` 实测 **5,225,397,510 B（4.87 GiB）**，逐项求和与 total 相等，
`removed` 全为 `false`——**未执行真实清理**，`dist` 实物完整保留给独立验收。
主要保全范围：`security-domain/` 3,486,411,568 + `assembly/` 1,143,565,916 +
`runtime/` 473,562,352 + `cross-arch/` 115,806,624 + `build/` 5,854,354。
该数与 `3207b27` 的 2.27 GiB、R1 的 2.35 GiB **并列而非订正**：三者是三个不同的保全范围。

最强反对意见，逐条照实：

1. **本轮全部签名读数出自同机 ad-hoc probe**，不覆盖 Developer ID、notarization/staple、
   Tauri bundler 产物或任何公开发行成熟度。`spctl` 的 exact `rejected` 正是未公证件的预期边界，
   不得读成「签名链有问题」，更不得读成「已具备发行条件」。
2. **实现域非受限这一事实本身是前提，不是结论**。Seatbelt blocked 与缺 build 混合态两格由
   架构支持会话代跑；它们绑定的是**冻结 bytes**，源码再变即作废。独立验收仍须在自己的 clean
   worktree 用自己的 fresh id 真跑这两格与批准域 full 六格。
3. **byte-identical 只在同一绝对路径成立**；换构建路径、加 Developer ID 后的净体积、以及
   x86_64 实物在真 Intel 机（而非 Rosetta）上的行为，本票**均未实测**。
4. **`m22` 等价**说明「classifier 只消费重导值」缺少独立可撤检查；full matrix 串味防护同样
   只有结构保证。两处都不该被读成「已有 mutation 红证」。
5. 同轮 receipt 的 `error` 非 null 时是否应直接令成功 gate 失败，本轮**未扩张**，
   属 `[需架构拍板]`；`error` 只进 command identity 的比较面。
6. 本节不含任何路线建议。两条路线的取舍仍未裁，`PI-HOST-LOOP-1` 与 `PI-DEBUG-BUILD-1`
   继续 blocked，直到异会话完整放行本票且架构消费报告后另行裁定。

## 二十一 · R5：evidence-truth 三项 P1 闭口与实现域全矩阵

`PI-SIDECAR-DIST-1R5` 只闭合 `07d2dbc` 被独立验收坐实的三项 P1，不改两条路线的来源、assembly、
cold-start、canonical 四层、双 execution domain、签名模式、库存、wire、deadline、路线候选或
产品 signing plan。本节**零路线建议**：只登记实测、执行域前提与最强反对意见。

### 二十一之一 · 组合基线与 untouched target（git 自证）

| 项 | 实测 |
|---|---|
| base `main` | `5ec9839`（`docs(pi-lane): R5 补拍 preflight official path 的 trusted 锚点`），已核为 `HEAD` 祖先 |
| 组合枝 | `5ec9839..94f662e` 恰 16 枚 |
| 十四枚 cherry-pick | patch-id 与源提交**逐枚相同**（`git patch-id --stable` 实测，见下） |
| 两枚 ACCEPTANCE | 架构内容移植，patch-id 按 SPEC 修订条豁免；added-lines 另法复验 |
| untouched R4 target | `07d2dbc` 与 `94f662e` 在 `fixtures/sidecar-dist`、工程报告、R1–R4 回执上 `git diff` 为空 |

十四枚 patch-id `SAME`：`f0162fd eb806f2 b284764 f7ecd32 20461aa c6a9819 df65ab0 0230bf6
57f91dc 473bc00 7b4184b 47fd7e5 891c23d 07d2dbc`。两枚 `DIFF` 恰为移植枚
（`b6172ca ← ba374d8`、`245c48f ← eb71d6f`，提交主题带 `[架构移植 <源 SHA>]`）。

移植复验（本会话实测，非转述）：源 `ba374d8` 的 diff-added 恰 **74** 行、SHA-256
`cd9c553592a8ebb78c272720feb98b5e1e58c477bb616074da05710cc2452cb4`；源 `eb71d6f` 恰 **122** 行、
SHA-256 `49694a9feb437b28b79c75b90b5891f2454ff6541b11be5d0a4a21ed86564d28`——两值与移植提交
信息记录的 canonical SHA **逐字符相同**。移植区与源的差异**只有一处且已归因**：空行分隔符
从首行（源在文件末尾追加，需前导空行）移到末行（移植插在节间）。剔除空行后两侧
**非空内容行 SHA-256 相等**，空行计数亦相等（16/16、23/23）。故「逐字节等同」在内容行上
成立，分隔符位移是插入点不同的必然结果，不是内容差异。

`fixtures/sidecar-dist` 目录树对象在两枚提交下同为 `f83e798e31e0872778ebad3e504bb915f22b73b9`，
工程报告 blob 同为 `7ae61d757ec4993cbed04c2f0839ff48169837e8`。

### 二十一之二 · 判定层闭合了什么

四道闭口，判据仍只住 `scripts/lib/probe-verdict.mjs`；**新增 25 枚具名判据，旧 R2–R4 判据名
删除数为 0**（机器核实：两枚提交的判据名字面量集合作差，旧集合无一项消失）。

| P1 | R4 为什么绿 | R5 的收紧 |
|---|---|---|
| 跨架构 ready 后裸等，hard verdict 只核 `launched/warning` | `verdictReproducibility` 从不看最终退出与超时 | ready 门保留 60,000 ms；ready 后发 EOF、退出用 `CRASH_DEADLINES.exitMs`、失败再 `killConfirmMs`；observation 显式携 `timeouts` 与 `{code,signal}`；判定端只受 `timeouts:[]`、`launched:true`、exact warning、`{code:0,signal:null}`。该处**不再有裸 `await proc.exited`** |
| command 时间只作两副本 identity | 整列同步删除、全填同一常量都能过 | `verdictCommandTimeline`：逐条可往返 `Date#toISOString()`、逐条 `start<=finish`、相邻 `previous.finishedAt<=next.startedAt`、整轮 `commands[0].startedAt < commands[last].finishedAt`。时间字段继续参加 identity，本门与之**并列** |
| preflight/full 的成功判定可由 producer 摘要洗绿；preflight-only 更是发布前无 verdict | `sign-probe.mjs` 第 119 行 preflight-only 不进 `runFullProbe()`，`finalStatus` 直取 `preflight.status` | `verdictPreflightEvidence` / `derivePreflightFromRaw` / `verdictPreflightRun` 三支；两条路径都在形成 manifest/status **之前**进程内跑 hard verdict，final status 唯一映射（failure→`probe_failed`、恰 `{ok,passed}`→`ok`、恰 blocked→同名 blocked）。producer 自报值降为 exact parity |
| 六格与 `.app` 的 raw 一条不判、role↔occurrence 非一一 | 摘要即真源；`identities` 是 Set，无基数概念 | role→receipt **index** 恰一条且零跨 role/cell 复用；六格与 `.app` 坐标全部由唯一 trusted stage root 加冻结 subject/mode 坐标构造；从 raw 重导 exit/signal/**error**/security stderr/flags/`run`/签后 XML，与 `.app` 的 inner/outer/deep verify、`spctl`、nested run |

**锚点（`2026-07-30` 架构补拍，SPEC R5 第 4 条）**：official Node 的 expected path 由判定层
**自持** `PROBE_ROOT`（`import.meta.dirname` 纯字符串运算）加冻结布局坐标
`dist/runtime/node-v22.23.1-darwin-<host-arch>/bin/node` 独立构造，host-arch 取判定进程实测。
receipt 的 `officialNode.path` 与 raw argv-last 自此都是**被验值**，冻结 SHA 门不变。
采集端与判定端共用同一构造器、同一 flags 解析（`parseCodesignFlags`）与同一 cell 目录口径
（`signCellDirName`），退役了采集端自带的第二份。

**R4 留的 `[需架构拍板]` 就此收口一半**：同轮 receipt 的 `error` 非 null 时是否令成功 gate
失败——R5 在**六格与 `.app`** 上判为「是」（`rawCommandOk` 三项齐核 exit/signal/error），
因为 SPEC R5 第 4 条把 `error` 明列为 raw 真源。preflight 六条关键命令仍只让 `error` 进
command identity 比较面，**未扩张**，仍属未决。

判定层的纯度声明随之**窄化并如实登记**：模块仍不碰 fs、不 spawn、不 `exit`，但新增两枚
具名例外——自持 `PROBE_ROOT` 与 `HOST_ARCH`。二者都不是 I/O，也**不来自被判定的
observation**；正因为观察面移不动它们，才能当锚。

### 二十一之三 · first-red 账（28 例，与 R2/R3/R4 的 356 例分别计数）

Stage A 在**未改 production 的 R4 target** 上先取红：23 枚缺陷红 + 5 枚阳性对照。
每族先证「合格基线判绿」再证「坏了也绿＝假绿」，故测量有区分力而非「什么都红」。
全部打在现行 production 判定路径上（`verdictReproducibility` / `verdictSign` / `runPreflight()`
真实调用的三支导出），无一枚靠 stub、私造函数、helper 缺失或 module-load failure。

| 族 | 红数 | 形态 |
|---|---|---|
| A 跨架构生命周期 | 4 | exact warning 一字不差，但最终非零／带 signal／exit 超时／kill-confirm 超时 |
| B command timeline | 2 | 两副本同步整列缺失；全部 command 同填一枚合法 canonical UTC 常量 |
| C preflight-only | 3 | target 三处同步漂移；official identity 摘要漂移（raw 仍真实）；同一份漂移在 full 路径同样假绿 |
| D full 摘要洗绿 | 4 | 六格 raw 非零／带 signal／spawn error／security stderr，而摘要「正确」 |
| E 串格与深层 raw | 10 | 一枚 occurrence 顶两 role；A 格复用 B 格实物；`.app` 五条 raw（inner/outer/deep verify/spctl/nested run）；`run`；actual-entitlements 两向 |

**C 族第三枚是 Stage A 的实测新发现**：三处同步漂移（observation＋`receipt.commands`＋
`receipt.officialNode.path`）令 `verdictSign` 返回**零 failure**——full 路径与 preflight-only
同样假绿。成因是 expected target 取自自报 path。该发现直接触发上文锚点补拍。

**一枚 R4 绿测的断言被收窄并已架构追认**：「full matrix 命令里的 internal error 不得串味到
preflight 分类」原断言整份观察 `passed()`，那份绿只成立于「R4 压根不判六格 raw」，与 R5 第
1/4 条要求的「六格 raw security stderr 必须失败」不可同真。现收窄到本例真正的主张（串味面
不受影响：五个 preflight 判据名均不得出现，且 raw 重导仍 `{ok,passed}`、`blockedReasons` 空），
并新增「本格自身须红在 `sign.matrix.raw.display.security`」。**只加门不减门**，且 `m-d` 会令
该测试转红，证明它仍有区分力。

### 二十一之四 · mutation 账（四枚，Stage B）

baseline `probe-verdict.mjs` SHA-256 `f2f3d480a13b2450171fbce51f670686af1901c396af833746c25a0caf0ebfc7`。
逐枚校验 patch 确实命中（替换文本在、原文本不在、文件 SHA 变），跑定向测试，再从备份还原并以
SHA-256 前后对照证明 byte-identical；**总用例数每轮恒 384，不漂**。

| 枚 | 撤掉的门 | 变异后 SHA | 红数 | 定向失败测试 |
|---|---|---|---|---|
| `m-a` | 跨架构 exit/deadline | `0645e31ebcac` | 4 | A1／A2／A3／A4 |
| `m-b` | timeline 整轮严格推进（`<`→`<=`） | `61d2b1e61ae9` | 1 | B2（B1 仍由 canonical 门守住＝红得准确） |
| `m-c` | preflight hard verdict（回退 producer status） | `d1a36b4cf4e8` | 2 | C1／C2 |
| `m-d` | full 六格 raw 真源（回退纯摘要） | `ec075dcfe452` | 8 | D1–D4／E3／E4a／E4b／「internal error 不串味」 |

四枚还原后 SHA 均回 `f2f3d480a13b`。**无等价变异作废项。** `m-d` 未波及 E1b 与 E2 五枚，
因它们分别由 occurrence 绑定与 `.app` raw 两处独立守住——红得准确，不是一撤全红。

### 二十一之五 · 执行域必须分开读（R5 实现域）

| 域 | 由谁跑 | id | status | manifest SHA-256（外算） |
|---|---|---|---|---|
| 实现域 preflight（首跑，坐实两处实现缺陷） | 实现会话 | `impl-r5-preflight-1` | `probe_failed` | `5b480f6c706bf04b82088e9653d0817571fe6be0a46caa07ae524ee9ac4d76e1` |
| 实现域 preflight（修后） | 实现会话 | `impl-r5-preflight-2` | `ok` / `passed` | `cba2d511147d14449dd340ee235cc52b3106c13f483b0f733109bdbcd693b4cd` |
| 实现域 full 六格 + 嵌套 `.app` | 实现会话 | `impl-r5-full-1` | `ok` | `26125038e1f390e0efd52fdf3fcb3e3b59441e56eaf0576bd483b99aa726096e` |
| Seatbelt 受限域 | **未跑** | — | — | 见下 |
| 缺 build 混合态 | **未跑** | — | — | 见下 |

三枚 manifest 的外算 SHA-256 与探针自报的 `manifestSha256` 逐枚相同。

**本实现域非受限**，故**不可能**自证 Seatbelt blocked：`impl-r5-preflight-2` 实测 control
sign/verify/XML 全 0、控制 XML **568 bytes** 且 `plutil` 解出 canonical 六键全 `true`、
官方 Node strict verify 通过并解出真实三条 Authority、`spctl` exact exit 3 `rejected`、
`blockedReasons` 空、四个 gate 全 `true`。按诚实协议，Seatbelt blocked 与缺 build 混合
`probe_failed` 两格**本会话不跑、不模拟、不回填**，留待架构按 provenance 例外另行安排或由
独立验收在自己的受限域自跑。

**首跑 `probe_failed` 的归因（重要，不得读成执行域问题）**：该域四个 gate 全真、producer
自报 `ok/passed`，hard verdict 仍判红 5 条——`sign.preflight.control.xml` 与四条
`sign.preflight.rawGateParity`。成因是**实现缺陷**：控制 XML 的摊平投影只存在于
`runFullProbe()`，`runPreflight()` 交出的是 `parseXmlObservation()` 原形，缺
`exit/bytes/sha256/stderr` 四格；preflight-only 把它喂进同一道 verdict，四条 parity 全判 `null`。
同时坐实第二处缺陷：`failureCount` 在 preflight-only 下是占位常量（非 ok 一律报 1），
hard verdict 的 failures 一条也不进输出面——「判红了但不说为什么」本身就是静默降级。
两处均已修（投影上移到 `runPreflight()` 并由 `runFullProbe()` 原样复用；stdout 摊出真实计数、
具名判据与 raw 重导分类），修后同装置在 fresh id 上 `ok/passed`、exit 0、`failureCount` 0。
**这两处是 R5 新门抓出来的自身缺陷，如实登记，不算执行域受限。**

### 二十一之六 · 实现域全矩阵读数（从空 assembly 起，严格串行）

`dist/` 起点为**不存在**（`ls` 实测 no such file），故本轮所有产物与读数都由本会话从零产生，
旧 `dist` 零回填；三枚 execution domain 均用 fresh id（探针对既有 id 直接 exit 2，不覆盖）。

| 项 | 读数 | 退出码 |
|---|---|---|
| 判定层定向测试 | **384/384**（356 baseline + R5 增量 28，分计） | 0 |
| 官方 archive 取件门 | 两架构冻结名/字节/SHA-256/SHASUMS/tar 全过 | 0 |
| 解包身份门 | `node --version` 与 Mach-O 架构逐架构符合 | 0 |
| 双 cycle 可复现性 | sealed 三档各自相同；SEA `default` 两架构各自相同；`code-cache` 两架构各自**不同** | 0 |
| 跨架构 code cache 注入 | `launched=true`、exact `Code cache data rejected.`、`exit={code:0,signal:null}`、`timeouts:[]` | 0 |
| `measure` 十件闭集 | `status:"ok" failures:0`，assembly 实物 **28** 项（12 目录 + 16 文件） | 0 |
| cold-start | 8 候选 × 3 轮 × 25 样本 = **600**，三轮顺序各为排列且非全同 | 0 |
| preflight（修后） | `impl-r5-preflight-2` → `ok`/`passed`、`failureCount:0` | 0 |
| full 六格 + 嵌套 `.app` | `impl-r5-full-1` → `ok`、`failureCount:0`、同轮 **49** 条 command receipt | 0 |
| R5 新增反例（四门） | 5 枚有效全部被抓（exit 1 + 具名判据）；1 枚等价变异**作废** | 见下 |
| 既有 76 枚 counterexample | 见下 | 见下 |

**R5 新增反例与既有 76 枚分别计数**，逐枚「注入 → 真跑 → 核非零与具名判据 → byte-identical
还原」，装置 `scratchpad/r5-stage-c/r5-counterexample.mjs`：

| 枚 | 门 | 形态 | exit | 命中判据 |
|---|---|---|---|---|
| `r5-ce-1` | A | **行为**注入：现生成受控桩，发 exact warning 与 `ready` 后忽略 EOF 永不退出 | 1 | `reproducibility.crossArch.timeouts` |
| `r5-ce-2` | A | 最终非零退出（warning 一字不差） | 1 | `reproducibility.crossArch.exit` |
| `r5-ce-3` | B | 全部 command timestamps 同填一枚合法常量 | 1 | `sign.receipt.commandTimeline.advance` |
| `r5-ce-4` | C | official target 同步漂移（`/bin/../bin/node`：解析到同一实物、字符串不等） | 1 | `sign.receipt.officialNodePath`、`sign.receipt.officialCommandBinding` |
| `r5-ce-5` | D/E | raw `sign.exit=1` 而摘要 `signExit=0` | 1 | `sign.matrix.raw.sign`、`sign.matrix.raw.signExitParity`、`sign.receipt.commandBinding` |

**作废登记（必须连读）**：`r5-ce-5` 首版 patch 是 `row.signExit = signed.exit` →
`row.signExit = 0`。健康轮里 `signed.exit` **本来就是 0**，故该 patch 语义上是 no-op——
实测 exit 0、零命中。它是**等价变异**，如实登记、**不计红证**，已换成让 raw 与摘要真的分叉
的有效形态后才通过。这正是「0 红可能是补丁没生效而非覆盖缺口」那条判例的又一次实证。

`r5-ce-1` 是本组唯一的**行为**注入（真让子进程挂起），故它才是「有界超时真的有界」的证据；
其余四枚是观察面注入，按既有体例落在「采集完成、判定之前」。

**既有 76 枚 counterexample：本会话未完成，如实登记，不以部分冒充全量。** 全量装置已写好且
可复跑（`scratchpad/r5-stage-c/ce76.mjs`，分六组 `measure` 23／`coldstart` 15／`repro` 14／
`sea` 8／`physical` 11／`fetchextract` 5，逐枚「注入 → 真跑 → 核冻结退出码与命名判据 → 还原 →
复绿」；`physical` 每枚还原后另跑一次 `measure`，`sea` 四枚 `:evidence` 按 R2 口径逐项解析同轮
JSON）。**实测代价**：单枚 `measure` 反例要一次完整十件量测（本机约 8 min），单枚 `coldstart`
反例要一次 600 样本取样（约 10 min），76 枚全量约 **6 小时** wall-clock，超出本会话窗口。
已启动 `measure` 组后按纪律**主动中止**——五道仓库门不得与反例注入并发跑（并发会制造 1/1000
量级假红，是既有判例）。中止后即刻复跑 `measure` 确认 assembly 完好（exit 0）、工作树无代码
残留。这一行必须由独立验收或续跑补齐。

需要连读的是：R5 **没有删弱**任何被这 76 枚覆盖的判据（判据名删除数为 0，已机器核实），
故它们是**回归**证据，不是本票新门的证据；本票新门的覆盖来自 384 例中的 R5 23 枚（常驻）
与上表五枚 script 级注入（一次性、可复跑）。

**跨架构读数的时效性**：`reproducibility-probe.mjs` 在首轮读数之后因 `pnpm lint` 的
`no-useless-assignment` 被编辑过一次（死赋值移除，见 T1c）。按「门跑过又编辑就必须重跑」判例，
该读数已在 T1c 的最终 bytes 上**另跑一轮**复核：双 cycle `status:"ok" failures:0` EXIT=0，
跨架构仍 `launched=true`、`warningSeen=true`、`exit={code:0,signal:null}`、`timeouts:[]`。

### 二十一之七 · 残留与最强反对意见

残留实测（`clean.mjs --report-only`，**非估算**）：**4,889,013,119 B（4.55 GiB）**。逐项：
`security-domain` 3,149,904,049；`assembly` 1,143,565,916；`runtime` 473,562,352；
`cross-arch` 115,806,624；`build` 5,854,166；读数 JSON 与反例留档合计约 0.3 MB。
比 R2 的 2.36 GiB 大，主因是本轮保全了三枚 execution domain 的完整证据（含首跑的
`probe_failed` 归因证据）。**独立验收前不要真清。**

最强反对意见，逐条如实登记：

1. **两格执行域缺席**。Seatbelt 受限域 `blocked` 与缺 build 混合 `probe_failed` 本会话**未跑**。
   本实现域实测非受限，不可能自证 blocked；按诚实协议停手，不模拟、不伪造、不回填。
   在这两格补齐前，「三种执行域分开读」这一结论对 R5 只成立两格（preflight 与 full）。
2. **首跑判红是自身缺陷，不是执行域问题**。`impl-r5-preflight-1` 的 `probe_failed` 由 R5 新门
   抓出两处实现缺陷（控制 XML 投影只在 full 路径成型；`failureCount` 是占位常量）。这既证明
   新门有区分力，也证明 Stage B 的绿是**构造件绿**——真装置上仍有两处形状不对。任何「Stage B
   全绿即装置正确」的读法都被这一跑否证。
3. **R5 四门没有常驻脚本级反例**。四门的 script 级反例是 Stage C 的一次性注入（可复跑，装置留档），
   **不是**冻进探针的 `--counterexample` flag。常驻覆盖只在判定层那 23 枚。把这四门冻成探针
   flag 是已登记的后续项，不得读成「已有常驻脚本级反例」。
4. **preflight 的 `error` 门未扩张**。六格与 `.app` 已把 `error !== null` 计入失败
   （SPEC R5 第 4 条明列 `error` 为 raw 真源），但 preflight 六条关键命令仍只让 `error` 进
   command identity 比较面。该不对称是**有意保留**、仍属 `[需架构拍板]`。
5. **判定层纯度被窄化**。模块新增两枚具名例外（自持 `PROBE_ROOT`、`HOST_ARCH`）。它们不是 I/O、
   也不来自被判定的 observation，但「零 I/O 纯函数」这句话此后必须连着这两枚例外读。
6. **`HOST_ARCH` 与冻结 SHA 的耦合未被独立证伪**。非 arm64 宿主上 `officialNodeExpectedPath()`
   会指向 `darwin-<其他架构>`，而 `OFFICIAL_NODE_SHA256` 独立锚定 arm64 实物，故该宿主会先在
   SHA 门失败——这是**推理**，本会话只有 arm64 一台机，未实测。
7. **stage root 只有形状门**。staging 目录名含 pid 与随机段，判定层无法凭冻结数据重建它，故口径
   是「绑定唯一一个 root，并要求它是 `dist/security-domain/` 的直接子目录」，此后全部 cell 坐标
   由该 root 加冻结坐标推出。一个**合法形状但内容被换过**的 stage root 不在本门射程内。
8. 本节不含任何路线建议。两条路线的取舍仍未裁，`PI-HOST-LOOP-1` 与 `PI-DEBUG-BUILD-1` 继续
   blocked，直到异会话完整放行本票且架构消费报告后另行裁定。
