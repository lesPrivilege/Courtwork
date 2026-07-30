# PI-SIDECAR-DIST-1R · 返修回执

状态：待独立验收。权威契约只认父级 [`SPEC.md`](../SPEC.md)「并行相邻票与合流门」、
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-E 与实现就绪图同名行；本文件是该
工单的独占实施回执，不得在这里裁分发路线、改 probe 判据或宣称发行成熟度。

实施会话只更新本回执，不改旧回执、ACCEPTANCE 或父级文档：

- **组合后的目标 SHA**：`7a500d1da966b04379bfcc8fd712d52d62fd888d`。
  从票面指定的 `main@0e50b03` 新建 clean worktree／分支 `codex/pi-sidecar-dist-1r`，
  顺取 `70e6482 → 01ff5e7 → 3207b27 → 9b8142f`，四枚 cherry-pick 无冲突；
  `0e50b03..7a500d1` 恰为 15 文件（fixture 10、独立报告、旧独占回执、ACCEPTANCE 的拒绝记录、
  `packages/pi-lane/package.json`、根 lockfile），与 `9b8142f` 复核的范围一致。
  施工期间 `main` 前进至 `74d76f36`（`PI-CODE-STDIO-1R2` 的架构提交），
  其 diff 只触 stdio 票面，**未改本票的 SPEC 段、ADR-022 六-E 或就绪图同名行**，基线仍有效。

- **实施提交**：`ba71df8c868ac0a015fcbd58a9a96af5ec69f41b`。改动 14 文件：
  fixture `README.md`，`scripts/` 下 `fetch-runtime.mjs`（新增）、`extract-runtime.mjs`、
  `build-sealed.mjs`、`build-sea.mjs`、`measure.mjs`、`coldstart-rounds.mjs`、`sign-probe.mjs`、
  `reproducibility-probe.mjs`（新增）、`clean.mjs`，`scripts/lib/toolkit.mjs`、
  `scripts/lib/probe-verdict.mjs`（新增）、`scripts/probe-verdict.test.mjs`（新增），
  原独立报告 `docs/engineering/pi-sidecar-dist-1.md`。
  被测 `sidecar-fixture.mjs` 与 `7a500d1` **逐字节相同**（`git diff` 空）。
  未改旧回执、`ACCEPTANCE.md`、`package.json`／lockfile、生产源码、父级文档、Tauri/Rust/GUI；
  未 push、未 merge。

- **官方 Node archive / SHASUMS / 解包身份**：
  新增 `fetch-runtime.mjs` 把取件做成门——只从冻结的 `https://nodejs.org/dist/v22.23.1/` 取，
  写同目录唯一 `<name>.partial`，fsync 后逐项核冻结文件名、冻结字节数、冻结 SHA-256、
  同次下载的 `SHASUMS256.txt` 同名记录与 `tar -tzf` 完整性，全过才 `rename` 并 fsync 父目录；
  正式文件名在校验通过前一次都不出现。现存正式件按同一套复核后才复用，错件拒绝且**不覆盖**。
  冻结身份是第一见证、下载的 SHASUMS 是第二见证，只信后者则「两者一起被换」可自洽通过。
  实测：arm64 `50,067,502` B／`ef28d8fa…`，x64 `51,245,086` B／`b8da981b…`，均与官方
  `SHASUMS256.txt` 及 `Content-Length` 相符；解包后 `node --version` 均为 `v22.23.1`，
  Mach-O 分别为 arm64／x86_64，`bin/node` 为 `112,928,848` B／`2e3f1286…` 与
  `115,447,952` B／`03afb361…`。
  **该门只证 HTTPS 传输完整性与冻结身份，不是 release-key 供应链认证**（未验签名密钥、
  未验 `SHASUMS256.txt.sig`），报告与 README 均如此措辞。
  `9b8142f` 观察到的 archive 失配经本次复核确认属该验收环境的传输异常，非上游文件变更。

- **十件库存、八候选与两枚负控**：闭集固定为两架构 ×（sealed 三档 + SEA 两档），
  由 `probe-verdict.mjs` 的 `INVENTORY` 单点推出，`toolkit.resolveInventory()` 再推磁盘坐标，
  **不做存在性跳过**——缺件以「解析得出但文件不在」交判定。少一、多一、重复、错名、
  任一项 blocked 均令顶层 `status:'failed'` 且进程非零。
  两枚 `a/<triple>/esm-naive` 为负控，实测均 `exit code 1`，`errorLine` 为
  `Error: Dynamic require of "process" is not supported`；负控跑起来、以 0 退出、换失败原因或
  失去原因，四种都判红。八候选逐件锁 `ready` 的 `node`／`arch`／`sea` 三元组。

- **shared verdict 与直接反例红证**：
  判定全部住 `scripts/lib/probe-verdict.mjs`（纯函数、零 import、零 I/O），
  `measure`／`coldstart-rounds`／`reproducibility-probe`／`sign-probe` 四支共用同一份。
  工具表期望是冻结字面量，**不从 `@courtwork/pi-lane` import**——fixture 自己就取自那里，
  两端同源则判据恒真。
  TDD 序：判定层先按 `70e6482` 的真实口径落地（`verdictStdio`／`verdictCrash`／
  `verdictInventory` 直接 `return []`，`conclude` 恒报 `ok`），`probe-verdict.test.mjs`
  102 例在那份口径上 **红 87 例**，红点全部落在既有缺陷而非模块加载；收紧后同件
  **102/102 全绿**。
  直接反例 **31 枚**，逐枚校验「变异确实改动了观察值」，**全部命中、无一等价变异、无一逃脱**；
  逐枚原始 JSON 与日志留 `dist/counterexamples/`，总账见报告第十二节。覆盖：
  缺产物（物理移走随行 bundle）、多产物、负控两式、身份三元组、pong、payload 字节与 hash、
  工具表、loop 两式、EOF、abort 四岔、四类崩溃与逐类复启、冷启少轮与少样本、
  sealed／default SHA 漂移、code-cache 误报可复现、跨架构 warning 消失、
  archive 截断至 49,274,880 B、预置错件。退出码：`2`＝观察面反例被抓住，`1`＝生产判定判红。

- **stdio / loop / EOF**：八候选全过且逐项判定。ping 往返 aarch64 `0.38～0.44 ms`、
  x86_64 `3.26～3.75 ms`；三类 payload（ASCII 1 MiB＝1,048,576 B、UTF-8 多字节＝850,000 B、
  C0 最坏转义＝240,000 B）字节数与 SHA-256 全等，期望字节数由构造谱算出、不取采集端自报；
  工具表 exact 比 `["read","grep","glob"]`；loop 比 `toolsExecuted:["read"]`／`turns:2`／
  `lastRole:"assistant"`；stdin EOF 比 `{code:0, signal:null}`。

- **abort / crash / respawn**：abort 四条一起判——收到 `aborted` ack 且 `wasRunning:true`、
  慢流以 `stopReason:"aborted"` 收束、abort 后仍能应答 ping、随后 EOF 干净退 0，八枚全过。
  采集侧订正一处竞态：ack 与 `slow-ended` 两个监听须在 `send` 之前挂上，先 await ack 会漏掉
  抢先到达的收束包。abort 延迟量化在 1.1／1.6／2.1 s 三档，属 faux 分块节流边界，
  报告已明记**不可用于比较路线**。
  四类崩溃 exact：`throw`→`code 1`、`exit`→`code 7`、`hang`→`SIGKILL`、`sigterm`→`SIGTERM`，
  八枚一致；**复启改为逐类各一次**（原件只在四类跑完后统一复启一次），八枚每类均 ready。

- **三轮随机化冷启**：固定八候选 × 三轮 × 每轮 25 样本（丢前 3 热身），**逐轮随机化取样次序
  并把实际次序写进读数**；轮数、样本数、候选闭集、逐轮 EOF 与身份全部经判定，少轮／少样本／
  异常 EOF／身份漂移均非零。「已打乱」这条只识别**压根没打乱**（三轮次序全同），
  不宣称能证明随机性，报告已如此登记。
  最终一轮（机器空闲）中位数之中位数：aarch64 `35.2`／`41.9`／`42.8`／`43.8` ms，
  x86_64 `109.9`／`119.1`／`120.8`／`128.7` ms，轮间跨度 1.4%～5.6%；
  裸 runtime 基线 aarch64 `27.9` ms、x86_64（Rosetta）`93.0` ms。
  **只报同机数字，未设任何路线胜负阈值。**
  `measure.mjs` 里那份原本就声明「不作结论」的单轮冷启读数已整体删除，不再留在读数文件里。

- **双 cycle 可复现性与跨架构 warning**：新增 `reproducibility-probe.mjs`，从**空**
  `route-a/`、`route-b/` 连做两个完整 cycle。实测 sealed 三档 minified 与 SEA `default`
  两架构均两次逐字节相同；`code-cache` 两架构均两次不同——「碰巧一致」判
  `reproducibility.nonDeterministic` 判红，不当好消息收。arm64 blob 注入 x64 后进程照常启动
  并退 0，stderr 留 `(node:NNNNN) Warning: Code cache data rejected.`，该原句已逐字锁死，
  warning 消失即判红。
  **新登记一条边界**：SEA blob 内含入口 CJS 的**绝对路径**，故 `default` 的字节一致只在
  同一构建路径下成立；本次 SEA 产物 SHA 与 `3207b27` 稿不同即由此而来（字节**数**逐行一致），
  已在报告第七节归因，并在第十七节列为「跨机／跨构建路径可复现——未实测」。

- **ad-hoc sign matrix**：两候选（`a/aarch64/cjs`、`b/aarch64/default`）× 三姿势
  （plain／hardened-no-entitlements／hardened-with-official-entitlements）六格全过且逐格判定：
  `signExit`／`verifyExit` 均 0，`launched` 逐格锁既知形态——**硬化且不带 entitlements 须起不来**
  （实测 `SIGTRAP`、stderr 为空），它哪天起来了同样判红。`codesign --verify` 在三种姿势下
  全部退出 0，对「V8 起不起得来」零区分力，此条复现无误。
  synthetic `.app` 按苹果次序先内后外签名：两步退出 0、`--deep --strict` 退出 0 且逐行显示
  嵌套件 `--validated`、嵌套 sidecar 从 `.app` 内正常运行、`spctl -a -vv` `rejected`（退出 3）；
  spctl 若退出 0 则判红。
  **只宣称同机 ad-hoc 探针**，未宣称 Tauri bundler、Developer ID、notarize 或跨机可复现。

- **报告与 README 一致性**：两处统一取实测残留 **2,527,892,648 B（2.35 GiB）**
  （`node scripts/clean.mjs --report-only`，逐子目录字节见报告第十八节），并统一写完整的
  `pnpm --filter @courtwork/desktop lint:isolation-binding`，同时记明仓库根没有无限定的
  同名 script（无限定形式退出 254）。`clean.mjs` 新增 `--report-only` 以支持「只清点、不清理」。

- **全仓门结果**：本回执写入前于同一 clean worktree 各自单独跑，均 exit 0——
  `node --test packages/pi-lane/fixtures/sidecar-dist/scripts/probe-verdict.test.mjs`（102/102）、
  `pnpm -r build`、`pnpm lint`、
  `pnpm --filter @courtwork/desktop lint:isolation-binding`（等级 `none`；扫描 6 份宿主源码、
  18 份 pi lane 源码）、`pnpm test`（160 files／1397 tests；计数与返修前同，
  新增的 `.mjs` 测试不进 root vitest，其 include 只收各包 `src` 下的 `.test.ts`）。

- **待独立验收项**：
  1. 本单只叫「待独立复验」，**不自放行**；分发路线与 `useCodeCache` 取舍均 **[需架构拍板]**，
     本单不裁、不建议。
  2. **一处须请示的自主删除**：原报告第十节的路线建议（「取路线乙 `default` 档」）已被
     ADR-022 撤销消费资格，本次**整段删除**并改为对称列两条路线的证据与各自反对理由
     （报告第十三、十四节）。票面未明令删除该段，此为实施会话的判断，请架构追认或驳回。
  3. **装置对机器负载敏感，方向为假红**：反例总跑期间两次出现候选 30 s 内未发 `ready` 被
     SIGKILL（`a/x86_64/cjs`、`b/aarch64/code-cache` 各一次），窗口与本会话并发跑
     build／lint／test 重合；空闲后重跑失败消失，约 1/1000 次 spawn。**未调高超时**（正常读数
     35～129 ms，30 s 已是 250 倍余量，放宽会把真实故障一并吞掉），按「跑时机器须空闲」
     登记于报告第十五节记录四。两枚受影响的反例已在空闲态重跑，总账取重跑值。
  4. `postject` 许可登记的精度订正：旧稿记「MIT」，实为自身代码 MIT ＋ vendor 的 LIEF 另有许可
     （含 Apache-2.0 正文）。依赖本身未改动，仅订正登记。
  5. `dist/` 原始 JSON（含 `counterexamples/` 的 31 枚留档与 `final/` 最终一轮）**保全未清**，
     供独立验收复核；验收通过后再按 `clean.mjs` 清理。
  6. 独立验收若要从空 `dist/` 全量重跑，须一台空闲机器与约 2.4 GiB 磁盘；
     复现序见 fixture `README.md`。
