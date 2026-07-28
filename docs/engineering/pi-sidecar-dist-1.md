# PI-SIDECAR-DIST-1 · Node sidecar 分发路线实测

调研实施件。权威只认 [`ADR-022`](../decisions/ADR-022-pi-lane.md) 六-E、
[`packages/pi-lane/SPEC.md`](../../packages/pi-lane/SPEC.md)「并行相邻票与合流门」与实现就绪图同名行。

**本件的性质**：只交可复现实验与路线建议。**分发路线由架构裁定并回写 ADR-022**；在那之前，
本文任何倾向都不是既定路线，`PI-HOST-LOOP-1` 不得据本文开工。本件也不更新
`docs/status/current.md`，不宣称任何发行成熟度。

实验装置与全部脚本在
[`packages/pi-lane/fixtures/sidecar-dist/`](../../packages/pi-lane/fixtures/sidecar-dist/README.md)；
机器面读数在 `dist/measurements.json`、`dist/coldstart-rounds.json`、`dist/sign-probe.json`
（`dist/` 被仓库根 `.gitignore` 覆盖，不入库，复现方式见本文末节）。

## 一 · 环境与来源

| 项 | 值 |
|---|---|
| 主机 | MacBook Air，Apple M2，8 核，macOS 26.5.2（Darwin 25.5.0），arm64 |
| 实验宿主 Node | v25.9.0（Homebrew；只跑 harness，不是被测运行时） |
| 被测运行时 | **Node v22.23.1**（LTS `Jod`，2026-06-22 发布，本次核实为 22.x 最新） |
| Rosetta 2 | 可用（`arch -x86_64 /usr/bin/true` 退出 0） |
| Tauri | 2.11.5（`apps/desktop/src-tauri/Cargo.lock`），配置 schema 出自 `tauri-utils-2.9.3` |
| rustc | 1.97.0，仅装 `aarch64-apple-darwin` target |

官方运行时逐份核过 SHA-256（对 nodejs.org 的 `SHASUMS256.txt`），校验不过即抛，不解包：

| 发行包 | 字节 | SHA-256 |
|---|---|---|
| `node-v22.23.1-darwin-arm64.tar.gz` | 50,067,502 | `ef28d8fab2c0e4314522d4bb1b7173270aa3937e93b92cb7de79c112ac1fa953` |
| `node-v22.23.1-darwin-x64.tar.gz` | 51,245,086 | `b8da981b8a0b1241b70249204916da76c63573ddf5814dbd2d1e41069105cb81` |

解包后的 `bin/node`：arm64 `112,928,848` B / `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`，
x64 `115,447,952` B / `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`。

## 二 · fixture 的真实性判据

分发结论只有在「被打包的确实是能用的 pi core」时才成立，故 fixture 不是空壳 import：
它经 `@courtwork/pi-lane` 的 `dist` 装配真实 `Agent`＋只读容器＋闸门＋预算，provider 用 pi-ai
自带 faux（确定性、不触网、不耗额度）。每枚能启动的产物都实跑一轮 tool loop 并留证：

- 模块图 **959 个 input**（三种 bundle 形态一致）；
- `init` 后工具表为 `["read","grep","glob"]`；
- `run` 后 `toolsExecuted:["read"]`、`turns:2`、末条消息 `role:"assistant"`——
  即模型请求 → 容器执行 → 结果回灌 → 收尾，整条 loop 在打包后仍然通。

bundle 体积构成（CJS minified，344,292 B）：

| 包 | 字节 | 占比 |
|---|---|---|
| `typebox` | 164,861 | 47.9% |
| `yaml` | 114,826 | 33.4% |
| `@earendil-works/pi-agent-core` | 21,822 | 6.3% |
| `@earendil-works/pi-ai` | 20,024 | 5.8% |
| `@courtwork/pi-lane`（dist） | 10,267 | 3.0% |
| `ignore` | 4,378 | 1.3% |
| `partial-json` | 3,815 | 1.1% |
| fixture 自身 | 3,570 | 1.0% |

pi core 本体只占 6.3%，八成体积在 `typebox` 与 `yaml` 两个传递依赖上。`openai` 出现在模块图里
但经 tree-shaking 后**零字节进产物**，`diff` 同。此表是分发体积的归因，不是依赖裁剪提案。

## 三 · 装配形态：Tauri `externalBin`（一手核实）

`tauri-utils-2.9.3/src/config.rs:1660-1672` 原文：Tauri 按
`binary-name{-target-triple}{.system-extension}` 找产物，macOS 举例
`my-binary-x86_64-apple-darwin`。两条路线的可执行文件因此一律命名
`pi-sidecar-<target-triple>`，本票实测的就是这个形态。

同文件另两条默认值直接决定后面第七节的签名结论：

- `macOS.hardenedRuntime` **默认 `true`**（`config.rs:654-656`，`Default` 实现 `682` 行）；
- `macOS.entitlements` **默认 `None`**（`661`／`684` 行）。

本仓 `apps/desktop/src-tauri/tauri.conf.json` 现行 `macOS` 段只写
`minimumSystemVersion` 与 `signingIdentity: "-"`，即**硬化运行时开、entitlements 空**。
该组合在本机已装的 `v0.1.2` 制品上得到实证：`/Applications/Courtwork.app` 主可执行文件
`flags=0x10002(adhoc,runtime)`，`codesign -d --entitlements` 输出为空。

**两条路线的装配代价不对称，这是本票最硬的一条形态差：**

- **路线甲是两件产物**。`externalBin` 只收可执行文件，故 sealed bundle（`sidecar.cjs`）必须另走
  `bundle.resources`（落 `Contents/Resources/`）或第二条 externalBin，Rust 侧还要解析该资源路径
  再作为 argv 传给 node。
- **路线乙是一件产物**。blob 已在 Mach-O 里，`externalBin` 一条搞定，Rust 侧 spawn 即用。

## 四 · 体积与 SHA-256（最终产物）

`measurements.json` `generatedOn 2026-07-28T06:01:32.190Z`。`shipped` 计入该路线**必须随包**的全部文件。

| 产物 | 文件数 | shipped 字节 | MiB | 组成 |
|---|---|---|---|---|
| `a/aarch64/cjs` | 2 | 113,273,140 | 108.03 | node 112,928,848 + bundle 344,292 |
| `a/aarch64/esm-createrequire` | 2 | 113,273,328 | 108.03 | node 112,928,848 + bundle 344,480 |
| `b/aarch64/default` | 1 | 112,382,848 | 107.18 | 单一可执行文件 |
| `b/aarch64/code-cache` | 1 | 112,629,088 | 107.41 | 单一可执行文件 |
| `a/x86_64/cjs` | 2 | 115,792,244 | 110.43 | node 115,447,952 + bundle 344,292 |
| `a/x86_64/esm-createrequire` | 2 | 115,792,432 | 110.43 | node 115,447,952 + bundle 344,480 |
| `b/x86_64/default` | 1 | 115,550,688 | 110.20 | 单一可执行文件 |
| `b/x86_64/code-cache` | 1 | 115,806,624 | 110.44 | 单一可执行文件 |

产物 SHA-256（最终一轮实测）：

| 产物 | 可执行文件 SHA-256 | 随行 bundle SHA-256 |
|---|---|---|
| `a/aarch64/cjs` | `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d` | `33ae719741552da79242a958ea381646928057dca4f3ff53ec43eb1506d5ef3c` |
| `a/aarch64/esm-createrequire` | 同上（官方 node 原样改名） | `463e75a57856f08eee11a41a03c6dbf6c1a5ba720de444e1432eb6c4da0ed232` |
| `a/aarch64/esm-naive` | 同上 | `34b11452f7979a114f0badc5f36deb06df9c57dda5877ea447898524b5327120` |
| `b/aarch64/default` | `7c88748dc3b2a2ab62c20b6767f547925b09a033042c94d99ca4f6a5c9ac34a4` | — |
| `b/aarch64/code-cache` | `1f2b67358fbba49e2ac9db8543f291bfef9495e284b0a98e3f7658a5c0c8abf3` | — |
| `a/x86_64/*` | `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b` | 同 arm64 三档 |
| `b/x86_64/default` | `6b1f170969abbf9b652f1814c04240f606fcc4d98dcff2562b347fe5a86d3cf0` | — |
| `b/x86_64/code-cache` | `3498a6ed503265fa78421d95fd01bc0a747707a11ff7387c4f49f0cba2ca89d3` | — |

两条观察：

1. **路线乙的 `default` 档反而比路线甲小**（arm64 少 890,292 B）。原因不是压缩：SEA 流程要求
   `codesign --remove-signature`，这刨掉了官方 Developer ID 签名约 875 KB 的 CodeDirectory，
   再补上 344 KB blob 与约 219 KB ad-hoc 签名，净额为负。**这个体积优势会在
   `PI-SIDECAR-RELEASE-1` 换成真实 Developer ID 签名后大部分消失**，不应作为选型依据。
2. 路线甲的 `cjs` bundle 与路线乙 blob 里的 bundle **逐字节相同**
   （同为 `33ae7197…`，344,292 B）。两路线比的是打包方式，不是两份不同的 JS。

## 五 · 冷启动

单轮读数会被机器负载带偏——本票实测到同一枚 `b/x86_64/code-cache` 在两次全量实测里给出
111 ms 与 219 ms（后者 max 372 ms）。故冷启动结论一律取
`scripts/coldstart-rounds.mjs` 的**三轮独立取样**（每轮 25 样本丢 3 热身），并公开轮间跨度；
`measurements.json` 里的单轮读数只作原始记录，不作结论。

「冷启动」定义为**外部计时：`spawn` 调用到读到 `ready` 行**，即宿主等待 sidecar 可服务的真实时长。

| 产物 | 三轮中位数（ms） | 中位数之中位数 | 最优单次 | 轮间跨度 |
|---|---|---|---|---|
| `b/aarch64/code-cache` | 36.2 / 33.4 / 33.4 | **33.4** | 31.4 | 8.4% |
| `b/aarch64/default` | 41.4 / 39.5 / 39.4 | **39.5** | 37.9 | 5.1% |
| `a/aarch64/cjs` | 41.2 / 41.0 / 39.5 | **41.0** | 37.8 | 4.3% |
| `a/aarch64/esm-createrequire` | 44.9 / 43.0 / 43.2 | **43.2** | 40.5 | 4.4% |
| `b/x86_64/code-cache` | 107.1 / 101.4 / 104.1 | **104.1** | 99.1 | 5.6% |
| `b/x86_64/default` | 113.3 / 111.9 / 116.9 | **113.3** | 108.5 | 4.5% |
| `a/x86_64/cjs` | 116.9 / 118.6 / 120.3 | **118.6** | 112.8 | 2.9% |
| `a/x86_64/esm-createrequire` | 128.2 / 123.7 / 122.1 | **123.7** | 119.3 | 5% |

裸运行时基线（`node -e 'process.stdout.write("x")'`，同机 17 样本中位数）：
aarch64 **25.2 ms**、x86_64（Rosetta）**88.0 ms**。基线用 `spawnSync` 计时、产物用异步
spawn 等首行，两者路径不同，**只作量级归因，不作精确差值**。

据此归因：

- pi 模块图载入在 aarch64 约 **+8～18 ms**、x86_64 约 **+16～36 ms**；两条路线的绝对差
  （aarch64 最优 33.4 对最劣 43.2，跨度 9.8 ms）远小于 Node 自身启动的 25 ms 底座。
- **`useCodeCache` 是唯一有效的冷启杠杆**：aarch64 省 6.1 ms（39.5→33.4，−15%），
  x86_64 省 9.2 ms（113.3→104.1，−8%）。代价见第七节的可复现性一条。
- 路线甲的 ESM 形态比 CJS 慢 2.2 ms（aarch64）／5.1 ms（x86_64）——ESM loader 的额外开销，
  与打包路线无关。

## 六 · stdin/stdout、abort、崩溃回收

**stdin/stdout**：八枚能启动的产物全部通过，无一例外。

- ping 往返：aarch64 `0.37～0.63 ms`，x86_64 `2.6～4.3 ms`。
- 三类大 payload 逐条 SHA-256 比对，**字节与长度全等，零截断零改写**：
  ASCII 1 MiB（1,048,576 B）、UTF-8 多字节（`契約書𝒜😀`×50,000＝850,000 B）、
  C0 最坏转义（`U+0001` + `"` + `\` ×80,000＝240,000 B，对应 ADR-022 六-B.1 点名的
  encoded-packet worst case）。
- stdin EOF → 退出码 0，无孤儿。

**abort**：八枚全部 `stopReason: "aborted"`，且 **abort 后进程仍存活并能继续应答**
（`survivedAbort: true`），随后 EOF 正常退 0。

abort **延迟数字不可用于比较路线**：实测值量化在 1.1 / 1.6 / 2.1 s 三档上，
这是 faux provider 按 `tokensPerSecond: 2` 的分块节流边界（每块约 500 ms 才检查一次 signal），
不是产物属性。本票能证的是**语义**（abort 打得断、进程不死），不是**延迟**。

**崩溃回收**：四类终止在八枚产物上给出完全一致的结果，无路线差：

| 注入 | 观察 |
|---|---|
| 未捕获异常 | `exitCode 1`，signal 无 |
| `process.exit(7)` | `exitCode 7`，signal 无 |
| 挂死后父进程 SIGKILL | `signal SIGKILL`，exitCode 无 |
| SIGTERM | `signal SIGTERM`，exitCode 无 |

每类回收后复启，八枚 `respawnReady: true`——产物字节未被崩溃影响，宿主可无条件重来。

**双架构**：aarch64 为原生，x86_64 **经 Rosetta 2 翻译执行**。x86_64 全部维度与 aarch64 同构
通过，但性能读数含翻译代价；**本机没有原生 Intel 硬件，真实 x86_64 性能记 blocked，不外推**。

## 七 · 签名链（开发态 ad-hoc 面）

以下全部是 ad-hoc 事实。本机**无 Developer ID 证书、无公证凭据**，故 Developer ID 签名、
notarize/staple、Gatekeeper 首启一律 **external-validated blocked**，属 `PI-SIDECAR-RELEASE-1`，
本票不以 ad-hoc 冒充。

**官方 Node 二进制自带六枚 entitlement**（`codesign -d --entitlements` 实读）：

```
com.apple.security.cs.allow-jit
com.apple.security.cs.allow-unsigned-executable-memory
com.apple.security.cs.disable-executable-page-protection
com.apple.security.cs.disable-library-validation
com.apple.security.cs.allow-dyld-environment-variables
com.apple.security.get-task-allow
```

签名为 `Developer ID Application: Node.js Foundation (HX7739G8FX)`，`flags=0x10000(runtime)`。
路线甲改名后该签名仍 `codesign --verify --strict` 退出 0（改名不动 Mach-O 字节）。

**实测三种重签姿势 × 两条路线（各一枚 aarch64 产物），结果完全一致：**

| 重签方式 | `codesign --verify` | 实际运行 |
|---|---|---|
| ad-hoc（`--sign -`） | 退出 0，`flags=0x2(adhoc)` | **正常启动** |
| ad-hoc + 硬化运行时，**不带 entitlements** | 退出 0，`flags=0x10002(adhoc,runtime)` | **SIGTRAP，起不来** |
| ad-hoc + 硬化运行时 + 官方 entitlements | 退出 0，`flags=0x10002(adhoc,runtime)` | **正常启动** |

**这条最要紧**：`codesign --verify` 在三种姿势下**全部退出 0**，它对「V8 起不起得来」零区分力。
签名验得过不等于跑得起来。

结合第三节：本仓 Tauri 配置现行就是「硬化运行时开 + entitlements 空」，
且该组合已在 `v0.1.2` 制品上实证。**因此无论选哪条路线，若照现行配置把 Node sidecar 挂进
`externalBin`，只要 Tauri 按同一套选项签嵌套可执行文件，sidecar 就会在首次 spawn 时 SIGTRAP。**

此处必须标出一条**未核实边界**：tauri-bundler 具体如何对 `externalBin` 施加签名选项与
entitlements（是否逐件签、是否沿用主 app 的 `hardenedRuntime`／`entitlements`），
本机无法一手核实——该 crate 不在 cargo registry 里，随 `@tauri-apps/cli` 预编译二进制分发。
上文是「配置默认值（一手）＋ Node 重签行为（一手实测）」的合成推论，**推论本身未实测**。
坐实它需要一次真实 `tauri build`，而那要改 `tauri.conf.json`——本票禁止范围。
**留给 `PI-SIDECAR-RELEASE-1` 的第一问**，并附本节的复现命令。

另一条须提请注意：官方 entitlements 里的 `com.apple.security.get-task-allow` 是调试用途，
**分发件带它会被公证拒绝**。发行票不能整份照抄 Node 的 entitlements，须逐条筛。

**`.app` 嵌套形态**（路线乙产物，手工搭最小 `.app`）：

- 布局 `Contents/MacOS/pi-sidecar-aarch64-apple-darwin`；
- 按苹果次序**先签嵌套、再签外层**：两步均退出 0；
- `codesign --verify --deep --strict` 退出 0，且逐行显示嵌套件 `--validated`、
  外层 `valid on disk` 与 `satisfies its Designated Requirement`；
- 从 `.app` 内启动嵌套 sidecar：**正常运行**（`sea: "sea"`）；
- `spctl -a -vv` → **`rejected`（退出 3）**。这正是「ad-hoc ≠ 公证」的实证，不是缺陷。

## 八 · 失败记录

三条，全部可复现，全部留在装置里而非只留叙述。

### 失败一 · 路线甲最直觉的 ESM 形态打得出来但跑不起来（路线级）

`format:'esm'` 打包，esbuild **零 warning、退出 0、产物 852,625 B**，运行即死：

```
Error: Dynamic require of "process" is not supported
```

退出码 1，栈落在 `node:internal/modules/esm/loader`。根因已定位到具体文件：
`yaml@2.9.0`（`@earendil-works/pi-agent-core` 的直接依赖）是 CJS，在
`dist/log.js`、`dist/schema/yaml-1.1/binary.js`、`dist/compose/composer.js`、`dist/parse/parser.js`
四处 `require("process")`；esbuild 在 ESM 产物里把它降成会抛错的 `__require()` 垫片。

两种修法都实测有效：加 `createRequire(import.meta.url)` banner（esbuild 官方做法），
或直接产 CJS。该档以 `esm-naive` 名义**留在装置里作可复现红证**，`measure.mjs` 的 launchProbe
每轮都会重新证伪它，不靠本文这段叙述。

判例价值：**「打包成功且零 warning」对「产物能跑」零区分力**；分发实验必须有一次真启动探针。

### 失败二 · 首轮八枚产物 abort 全红，真因在实验装置

第一轮全量实测 abort 全部超时。因八枚同形同错，先按装置嫌疑排查而非按路线差归因——
定点复现（发 `abort` 后连回执都收不到）坐实：fixture 把 stdin 每个包都挂在同一条
`queue.then(...)` 串行链上，`abort` 排在正在跑的回合后面，**永远等不到执行**。

修法是控制面旁路串行队列。修后八枚全部 `stopReason:"aborted"` 且进程存活。

判例价值：这不是路线差，但它是 `PI-CODE-STDIO-1` 的直接输入——ADR-022 六-B.1 的
`cancel` 按定义就是要打断在途 prompt，**不能与 prompt 共用一条串行链**，否则取消对在途回合
结构性不可达。fixture 里已留注释与红证。

### 失败三 · 单轮冷启读数会被负载带偏（方法论）

同一枚 `b/x86_64/code-cache` 在两次全量实测里给出 111 ms 与 219 ms（后者 max 372 ms）。
若照单轮读数写结论，会得出「SEA code-cache 在 x86_64 上更慢」这个与三轮实测相反的假结论。
处置：另立 `coldstart-rounds.mjs` 三轮取样并公开轮间跨度，第五节全部结论改取该件。

## 九 · 新增依赖（exact pin、许可、用途、移除结论）

只动 `packages/pi-lane/package.json` 的 `devDependencies` 与根 `pnpm-lock.yaml`，
lock 净增 21 行。生产依赖零变化，`packages/pi-lane/src` 零触碰。

| 包 | 版本（exact） | 许可（一手读 LICENSE） | 用途 | 移除结论 |
|---|---|---|---|---|
| `esbuild` | `0.28.1` | MIT（`LICENSE.md`，Evan Wallace） | 两条路线都要把 ESM 模块图打成单文件；路线乙的 SEA 只收 CJS 入口，非打包不可 | **保留**。若架构选定任一路线，生产分发票都需要它；若两路线全否，与该票同批销号 |
| `postject` | `1.0.0-alpha.6` | MIT（`LICENSE`） | Node SEA 官方文档指定的 blob 注入工具，路线乙无替代 | **随裁定去留**：选路线乙则转入生产分发票；选路线甲则**立即移除** |
| `commander` | `9.5.0` | MIT（`LICENSE`） | `postject` 的传递依赖，非直接引入 | 随 `postject` 去留 |

三条附注：

- `esbuild@0.28.1` **本就已在 lock 中解析**（vite 的传递依赖），本票只加了 importer 声明，
  未引入新版本，lock 里无新 resolution 条目。
- 本机只装了 `@esbuild/darwin-arm64@0.28.1` 一个平台包；跨平台 CI 会按需拉各自平台包，
  属已知行为，本票未实测。
- `postject` 是 **alpha 版本**（`1.0.0-alpha.6`，Node SEA 官方文档现行指定件）。
  Node 22 的 SEA 本身也标 **Stability 1.1 · Active development**。选路线乙即接受
  「一个 alpha 工具 + 一个活跃开发中的运行时特性」这两项上游风险，须按 ADR-022 决定五逐版复核。

## 十 · 路线建议（建议，非裁定）

两条路线在**功能维度上没有分出胜负**：stdin/stdout、真实 loop、abort 语义、四类崩溃回收、
双架构装配，八枚产物读数同构全过。差异只在装配形态、体积、冷启与供应链，逐条如下。

| 维度 | 路线甲（runtime + sealed bundle） | 路线乙（Node SEA） |
|---|---|---|
| 随包文件 | **2 件**（externalBin + resources 两套机制） | **1 件**（externalBin 一条） |
| Rust 侧 | 须解析 resource 路径并作 argv 传入 | spawn 即用 |
| shipped 体积（arm64） | 108.03 MiB | 107.18 / 107.41 MiB（该优势在真实 Developer ID 签名后大部分消失） |
| 冷启（arm64，三轮） | 41.0 ms（CJS） | 39.5 ms（default）／**33.4 ms**（code-cache） |
| 打包格式约束 | ESM 须加 `createRequire` banner，否则运行即死；CJS 无此坑 | 只收 CJS，无选择余地 |
| 上游风险 | esbuild（稳定，MIT） | esbuild + **alpha 版 postject** + **Stability 1.1 的 SEA** |
| 产物可复现性 | bundle 与 node 二进制均逐字节可复现 | `default` 档可复现；**`code-cache` 档不可复现**（见下） |
| 排障 | 崩溃栈指向磁盘上可读的 `sidecar.cjs`，可直接改文件复跑 | 栈指向嵌进二进制的内容，改一行就要重跑整条注入链 |
| 更新运行时 | 换 node 二进制或换 bundle 可分别进行 | 任一变更都要重跑 remove-signature → postject → 重签 |

`code-cache` 不可复现是对照实测的结论。控制条件：同一份 `sidecar.cjs`、同一枚 arm64 node、
同一份 sea-config，只切 `useCodeCache`，各连跑两次：

| `useCodeCache` | 两次 blob 字节 | 两次 SHA-256 |
|---|---|---|
| `false` | 344,481 / 344,481 | **一致**（`bb532433e232f158ba4f56c1ca6cd163d98cd08b07b471d6bc65b2a992aab703`） |
| `true` | 601,265 / **601,289** | **不一致**（`f2f129d8…` / `d5f11a9f…`） |

即 V8 code cache 内含非确定性内容，连字节数都不稳定。整条装配链上同样可见：两次完整
`build-sea.mjs` 后，`default` 档可执行文件 SHA-256 完全一致，`code-cache` 档不一致。
这意味着**开了 `useCodeCache` 就无法用「重建并比对 SHA」验证发行制品**。

另一条 `code-cache` 实测：把 arm64 生成的 blob 注入 x64 二进制，进程**照常启动**，只在 stderr
留一句 `Warning: Code cache data rejected.`。即**跨架构 code cache 是静默降级**——
CI 若在单一架构上生成 blob，另一架构会悄悄失去全部 code-cache 收益，只有 stderr 会说。
这与本仓「静默降级零容忍」直接相关：选 `code-cache` 则构建链必须按架构分别生成并断言该 warning 不出现。

**建议（供架构裁定）：取路线乙的 `default` 档，不开 `useCodeCache`。**

理由按权重：

1. **装配形态是唯一的结构性差异，且路线乙更简**。一件产物、一套机制、Rust 侧无路径解析，
   直接少一类「资源找不到／路径不对」的失败模式。ADR-022 六-A 已把「WebView 不拥有绝对路径」
   写成边界，少一条需要在宿主里解析并传递的路径，与该边界同向。
2. **性能与体积都不构成选型依据**。冷启差 1.5 ms（41.0 对 39.5），体积差在真实签名后大部分消失。
   谁也没赢，就别用它们做理由。
3. **不开 `useCodeCache`**：换 33.4 ms（省 6.1 ms）要付出产物不可复现，与本仓「SHA 只锚内容」
   的验收习惯冲突；且跨架构静默降级需要额外的构建期断言才安全。**6 ms 买不到这两笔账**。
   若将来冷启真成瓶颈，再单独立票评估，届时须连同可复现性方案一起交。

**这条建议的最大反对理由，如实列出**：路线乙把上游风险叠了两层（alpha 版 postject +
Stability 1.1 的 SEA），且排障与热修都更重——sealed bundle 是磁盘上一个可读可改的文件，
SEA 改一行就要重跑整条注入链。若架构更看重「上游稳定 + 开发期可改」而非「装配简」，
路线甲的 **CJS 档**（不是 ESM 档）是站得住的选择，其读数与路线乙差距全在噪声量级内。

**无论选哪条，两条动作都必须做**（与路线无关）：

1. 按第七节筛定 entitlements 并在真实 Tauri 打包链上验证嵌套签名，否则 sidecar 会 SIGTRAP；
2. 打包格式定为 **CJS**。路线甲的 ESM 档已实证运行即死，路线乙则根本不收 ESM。

## 十一 · blocked 与未决

| 项 | 状态 | 原因 |
|---|---|---|
| Developer ID 签名、notarize/staple、Gatekeeper 首启 | **blocked** | 本机无证书无凭据；属 `PI-SIDECAR-RELEASE-1` |
| tauri-bundler 对 `externalBin` 的实际签名选项与 entitlements | **未核实** | crate 随 `@tauri-apps/cli` 预编译分发，不在 cargo registry；坐实须真实 `tauri build`（要改 `tauri.conf.json`，本票禁止范围） |
| 原生 x86_64 硬件上的真实性能 | **blocked** | 本机 Apple M2，x86_64 全程经 Rosetta 2 翻译；已如实标注，不外推 |
| Windows / Linux 装配与签名 | **blocked** | 本机 macOS；两平台的 SEA 注入参数与签名模型均不同 |
| 真实 DeepSeek key 端到端 | **未做** | 本票用 faux provider；与分发无关，且沿 `packages/pi-lane/SPEC.md` 第七节由持 key 者另记 |
| 跨平台 CI 的 esbuild 平台包与 blob 生成 | **未实测** | 本机只装 `@esbuild/darwin-arm64`；x64 blob 借 Rosetta 生成，真实 CI 拓扑另议 |

## 十二 · 复现与残留清理

全部产物落 `packages/pi-lane/fixtures/sidecar-dist/dist/`，被仓库根 `.gitignore` 的 `dist/`
覆盖，**不入库**。峰值约 1.4 GiB（两份官方发行包 + 解包树 + 十枚产物），跑完须清。

```bash
pnpm --filter @courtwork/pi-lane build
cd packages/pi-lane/fixtures/sidecar-dist
# 官方发行包与 SHASUMS256.txt 先下到 dist/runtime/
node scripts/extract-runtime.mjs
node scripts/build-sealed.mjs
node scripts/build-sea.mjs
node scripts/measure.mjs
node scripts/coldstart-rounds.mjs
node scripts/sign-probe.mjs
node scripts/clean.mjs            # 清全部；--keep-runtime 只清产物
```

冷启动取样期间机器须空闲，否则读数不可用（见失败三）。`clean.mjs` 会逐项报出清掉多少字节。
