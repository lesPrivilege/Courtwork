# PI-SIDECAR-DIST-1 · Node sidecar 分发路线实测（返修版）

调研实施件。权威只认 [`ADR-022`](../decisions/ADR-022-pi-lane.md) 六-E、
[`packages/pi-lane/SPEC.md`](../../packages/pi-lane/SPEC.md)「并行相邻票与合流门」与实现就绪图同名行。

**本件的性质**：只交可复现实验与工程证据。**分发路线由架构裁定并回写 ADR-022**；本件不作选型，
`PI-HOST-LOOP-1` 不得据本件开工。本件不更新 `docs/status/current.md`，不宣称任何发行成熟度。

**版本说明**：`PI-SIDECAR-DIST-1@3207b27` 的独立验收 `9b8142f` 判 **REJECT**，其读数与
SEA-default 建议已被 ADR-022 撤销消费资格。本文是返修票 `PI-SIDECAR-DIST-1R` 的全量重测，
全部数字取自返修后的装置，不继承旧稿任何未经复测的读数。原稿第十节的路线建议**已删除**，
理由见第十三节。

实验装置与全部脚本在
[`packages/pi-lane/fixtures/sidecar-dist/`](../../packages/pi-lane/fixtures/sidecar-dist/README.md)；
机器面读数在 `dist/measurements.json`、`dist/coldstart-rounds.json`、`dist/reproducibility.json`、
`dist/sign-probe.json`、`dist/runtime-source.json`，反例逐枚留 `dist/counterexamples/`，
最终一轮另存 `dist/final/`（`dist/` 被仓库根 `.gitignore` 覆盖，不入库；复现方式见第十八节）。

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
- 31 枚反例逐一实注入，全部使生产判定非零，详见第十二节。

上游对本次实测的独立确认：复核官方 `SHASUMS256.txt` 与 `Content-Length` 后，两份 archive 的字节数
与 SHA 与原稿一致——`9b8142f` 观察到的失配属该验收环境的传输异常，非上游文件变更。

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

产物 SHA-256（最终一轮）：

| 产物 | 可执行文件 | 随行 bundle |
|---|---|---|
| `a/<triple>/cjs` | 官方 node 原样改名 | `33ae719741552da79242a958ea381646928057dca4f3ff53ec43eb1506d5ef3c`（344,292 B） |
| `a/<triple>/esm-createrequire` | 同上 | `463e75a57856f08eee11a41a03c6dbf6c1a5ba720de444e1432eb6c4da0ed232`（344,480 B） |
| `a/<triple>/esm-naive` | 同上 | `34b11452f7979a114f0badc5f36deb06df9c57dda5877ea447898524b5327120`（344,362 B） |
| `b/aarch64/default` | `1d4ec320f26ea1e403427039f788b88aedabec0f6ec256d86a49cc01c59698cc` | — |
| `b/aarch64/code-cache` | `cf3de6b24ae070737dc35245258fac5328957f11db68d8ade82660f6654648b4` | — |
| `b/x86_64/default` | `cecf8174790ba3ff391e020042127f330179974862056c788363d154360f3c30` | — |
| `b/x86_64/code-cache` | `ba500d83a12e410aec0a5c9c19088ac79ca7669b5a54792fb1ad3c26eaeb331b` | — |

两条观察：

1. **路线乙的 `default` 档比路线甲小**（arm64 少 890,292 B）。原因非压缩：SEA 流程要求
   `codesign --remove-signature`，刨掉官方 Developer ID 签名的 CodeDirectory（实读 875,632 B），
   再补 344 KB blob 与 ad-hoc 签名，净额为负。**该体积优势会在 `PI-SIDECAR-RELEASE-1` 换真实
   Developer ID 签名后大部分消失**，不构成选型依据。
2. 路线甲的 `cjs` bundle 与路线乙 blob 内的 bundle **逐字节相同**（同为 `33ae7197…`）。
   两路线比的是打包方式，非两份不同的 JS。

SEA 产物的 SHA 与 `3207b27` 稿不同，属已归因的构建路径效应，非非确定性：SEA blob 内含入口 CJS 的
绝对路径，本次构建路径与旧稿不同，故 blob 与最终可执行文件字节随之不同；字节**数**与旧稿逐行一致。
发行票若要跨机比对 SHA，须先固定或规范化构建路径。

## 八 · 冷启动

「冷启动」定义为外部计时：`spawn` 调用到读到 `ready` 行，即宿主等待 sidecar 可服务的真实时长。
取样固定八候选 × 三轮 × 每轮 25 样本（丢前 3 热身），**逐轮随机化取样次序并记录实际次序**——
固定次序会把「机器越跑越热」系统性地送给排在后面的候选。轮数、样本数、EOF 与身份全部经判定；
少轮、少样本、异常 EOF 或身份漂移均判红。

本节只报同机数字，**不设路线胜负阈值**。

| 产物 | 三轮中位数（ms） | 中位数之中位数 | 最优单次 | 轮间跨度 |
|---|---|---|---|---|
| `b/aarch64/code-cache` | 35.8 / 35.2 / 34.5 | **35.2** | 33.0 | 3.8% |
| `b/aarch64/default` | 43.4 / 41.9 / 41.1 | **41.9** | 39.5 | 5.6% |
| `a/aarch64/cjs` | 42.8 / 42.7 / 44.3 | **42.8** | 40.8 | 3.7% |
| `a/aarch64/esm-createrequire` | 45.7 / 43.8 / 43.7 | **43.8** | 42.1 | 4.6% |
| `b/x86_64/code-cache` | 108.4 / 109.9 / 109.9 | **109.9** | 103.4 | 1.4% |
| `b/x86_64/default` | 117.9 / 119.1 / 122.2 | **119.1** | 114.8 | 3.6% |
| `a/x86_64/cjs` | 119.7 / 120.8 / 122.6 | **120.8** | 116.4 | 2.4% |
| `a/x86_64/esm-createrequire` | 128.7 / 131.7 / 125.7 | **128.7** | 122.9 | 4.8% |

裸运行时基线（`node -e 'process.stdout.write("x")'`，同机同形状取样，22 样本中位数）：
aarch64 **27.9 ms**、x86_64（Rosetta）**93.0 ms**。基线用 `spawnSync` 计时、产物用异步 spawn 等首行，
两者路径不同，**只作量级归因，不作精确差值**。

据此归因：

- pi 模块图载入在 aarch64 约 **+7～16 ms**、x86_64 约 **+17～36 ms**；两条路线的绝对差
  （aarch64 最优 35.2 对最劣 43.8，跨度 8.6 ms）小于 Node 自身启动的 27.9 ms 底座。
- 同架构下 SEA `default` 与 sealed `cjs` 相差 0.9 ms（aarch64）／1.7 ms（x86_64），均在轮间跨度之内。
- `useCodeCache` 省 6.7 ms（aarch64，41.9→35.2）／9.2 ms（x86_64，119.1→109.9）。代价见第十节。
- 路线甲的 ESM 形态比 CJS 慢 1.0 ms（aarch64）／7.9 ms（x86_64），属 ESM loader 开销，与打包路线无关。

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

**双架构**：aarch64 原生，x86_64 经 Rosetta 2 翻译执行。x86_64 全部维度与 aarch64 同构通过，
但性能读数含翻译代价；本机无原生 Intel 硬件，**真实 x86_64 性能记 blocked，不外推**。

## 十 · 双 cycle 可复现性与跨架构 code cache

从**空** `route-a/`、`route-b/` 连做两个完整 cycle，逐件比对两次 SHA：

| 对象 | 期望 | 实测 |
|---|---|---|
| sealed minified（三档） | 两次相同 | 三档均相同 |
| SEA `default`（两架构） | 两次相同 | 两架构均相同 |
| SEA `code-cache`（两架构） | 两次**不同** | 两架构均不同 |

`code-cache` 的「不同」是判据本身：若两次碰巧一致，判定报 `reproducibility.nonDeterministic` 判红，
不当作好消息收。V8 code cache 内含非确定性内容，**开了 `useCodeCache` 即无法用「重建并比对 SHA」
验证发行制品**。

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

31 枚，逐枚实注入并校验「变异确实改动了观察值」。观察面的反例落在采集完成、判定之前——
被测 `sidecar-fixture.mjs` 由票面冻结，故真起进程、真跑一轮、真收包，然后只坏一处。
物理面的反例直接动磁盘。**无一枚等价变异（`applied` 全为 `true`），无一枚逃脱。**

退出码约定：`2` ＝ 观察面反例被抓住；`1` ＝ 生产判定判红（物理面与形状面反例走此路）。

| 反例 | 探针 | 退出 | 命中判据 |
|---|---|---|---|
| `missing-artifact`（移走随行 bundle） | measure | 1 | `inventory.missing`,`inventory.count` |
| `inventory.extra` | measure | 2 | `inventory.unexpected`,`inventory.count` |
| `negativeControl.launched` | measure | 2 | `negativeControl.launched` |
| `negativeControl.reason` | measure | 2 | `negativeControl.reason` |
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
| `sealed.sha` | reproducibility | 2 | `reproducibility.identical` |
| `default.sha` | reproducibility | 2 | `reproducibility.identical` |
| `codeCache.identical` | reproducibility | 2 | `reproducibility.nonDeterministic` |
| `crossArch.warning` | reproducibility | 2 | `reproducibility.crossArch.warning` |
| `--rounds 1` | coldstart | 1 | `coldstart.shape.rounds`,`coldstart.orders.rounds`,`coldstart.rounds` |
| `--samples 10` | coldstart | 1 | `coldstart.shape.samples`,`coldstart.round.keptSamples` |
| archive 截断至 49,274,880 B | fetch-runtime | 1 | 字节／SHA／tar 三项同时不过；`extract-runtime` 续判 `runtime.blocked` |
| 预置错件（x64 发行包冒充 arm64 名） | fetch-runtime | 1 | 字节／SHA 不过（`tar` 完整性**通过**） |

两条判例价值：

- 截断值取 `9b8142f` 当时实际观察到的 49,274,880 B。该门若当时在场，那次验收会在取件阶段就得到
  明确拒绝与三行归因，而非「无法独立重建」。两次拒绝后磁盘上的错件均**原样保留、未被覆盖**，
  删除错件后重跑即自愈。
- 预置错件那格 `tar -tzf` **通过**：结构完整的错文件靠 tar 检不出来，拦住它的是冻结字节数与 SHA。
  只做完整性校验不足以确认身份。

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

## 十六 · 新增依赖

本票**未改** `packages/pi-lane/package.json` 与根 `pnpm-lock.yaml`；下表是 `70e6482` 引入、
本次逐份重读 LICENSE 复核的结果。

| 包 | 版本（exact） | 许可（一手读 LICENSE） | 用途 | 移除结论 |
|---|---|---|---|---|
| `esbuild` | `0.28.1` | MIT（`LICENSE.md`，Evan Wallace） | 两条路线都要把 ESM 模块图打成单文件；路线乙的 SEA 只收 CJS 入口 | **保留**。任一路线选定，生产分发票都需要它；两路线全否则与该票同批销号 |
| `postject` | `1.0.0-alpha.6` | 自身代码 MIT（Postman, Inc）；**另 vendor 外部维护库 LIEF，许可另计（含 Apache-2.0 正文）** | Node SEA 官方文档指定的 blob 注入工具，路线乙无替代 | **随裁定去留**：选路线乙则转入生产分发票；选路线甲则立即移除 |
| `commander` | `9.5.0` | MIT（`LICENSE`，TJ Holowaychuk） | `postject` 的传递依赖，非直接引入 | 随 `postject` 去留 |

**对旧稿的一处精度订正**：旧稿将 `postject` 记为「MIT（`LICENSE`）」。其 `LICENSE` 共 236 行，
MIT 只覆盖 postject 自身代码，文件后段另列 vendor 的 LIEF 及其许可（含 Apache-2.0 正文）。
选路线乙即同时接受该 vendor 许可，发行票须逐项过一遍。

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
| 跨机、跨构建路径的 SEA 产物可复现 | **未实测** | 本次两个 cycle 在同一路径；blob 含入口绝对路径，跨路径必不同（第七节） |

## 十八 · 复现与残留

复现序见 fixture
[`README.md`](../../packages/pi-lane/fixtures/sidecar-dist/README.md)。判定层的测试单独跑：

```bash
node --test packages/pi-lane/fixtures/sidecar-dist/scripts/probe-verdict.test.mjs
```

本次实测的实际时序：`dist/` 从空开始 → 取件与解包 → 双 cycle 装配 → 首轮 measure／冷启／签名 →
31 枚反例逐枚注入（其间 `dist/route-*` 由反例流程再次从空重建两轮）→ 机器空闲后重跑
measure／冷启／签名作为最终读数，另存 `dist/final/`。本文全部数字取自该最终一轮与
`dist/counterexamples/` 的逐枚留档。

全部产物落 `packages/pi-lane/fixtures/sidecar-dist/dist/`，被仓库根 `.gitignore` 的 `dist/` 覆盖，
**不入库**。跑完整套（含 31 枚反例的逐枚留档）实测 **2,527,892,648 B（2.35 GiB）**，
取自 `node scripts/clean.mjs --report-only` 的实测输出：

| 子目录 | 字节 |
|---|---|
| `sign-probe/`（六份重签副本 + `.app`） | 787,467,416 |
| `route-a/`（三档 × 两 triple + 中间件） | 690,813,900 |
| `runtime/`（两份官方发行包 + 解包树） | 473,562,352 |
| `route-b/`（两档 × 两 triple + blob） | 458,606,090 |
| `cross-arch/`（跨架构注入件） | 115,806,624 |
| `counterexamples/`（31 枚反例的 JSON 与日志） | 1,525,408 |
| 读数 JSON、`final/` 留档与语料 | 110,858 |

该值取代 `3207b27` 的 2,436,991,750 B（2.27 GiB）。差额的构成：本次装置多出 `cross-arch/`
（115,806,624 B）与 `counterexamples/`（1,525,408 B）两个目录；`runtime/` 较旧稿少 27,528,226 B，
**该差额原因未核**——旧稿的 `runtime/` 内部构成未留更细拆分，本票不作推断。
README 与本节取同一实测值。

清理须在**独立验收之后**：

```bash
node scripts/clean.mjs --report-only    # 只清点
node scripts/clean.mjs                  # 清全部；--keep-runtime 只清产物
```

冷启动取样期间机器须空闲（第十五节记录四）。
