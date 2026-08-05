# PI-SIDECAR-DIST-1R4 · R3 hard-verdict 闭口回执

状态：实现完成，待独立验收。

权威契约只认父级 [`SPEC.md`](../SPEC.md)「并行相邻票与合流门」、
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-E 与实现就绪图同名行；本文件只是
本工单的独占实现回执，不得在这里改 R3 四层证据、canonical bytes、路线、库存、签名模式、
deadline 或产品 signing plan。

实现会话从当前架构 `main` tip 新建 clean worktree/branch，顺取父级 SPEC 固定的十四枚提交；
冲突即停。只更新本回执和六路径白名单，不改 toolkit/canonical fixture、旧回执、
ACCEPTANCE、父级文档、依赖、产品源码、Rust/Tauri 或 GUI：

- 架构锚点、十四枚 cherry-pick、组合基线与目标 SHA：架构锚点
  `efcd0ab3b06ed41e28bd1a0bb2c56bf2ac5b54df`（派单时 `main` tip）。自该 tip 新建
  `codex/pi-sidecar-dist-1r4`，顺取 `f0162fd→eb806f2→b284764→f7ecd32→20461aa→c6a9819→
  df65ab0→0230bf6→57f91dc→473bc00→ba374d8→7b4184b→47fd7e5→eb71d6f` 十四枚，全部无冲突落地；
  组合目标 `60d466e81d84f4a6d32499448eff36fb570b6563`，与 `eb71d6f` 在票面路径上零差异
  （唯一差异是架构 tip 自带的 R4 条款与本回执骨架）。施工期间 `main` 前进至 `51cc8ae`
  （provenance-bound seatbelt 支持）与 `fd5590bf1f6faade1d5ce1e1bf83e672b8f20b0a`
  （bind R4 verdicts to raw commands），两者只读消费，未 cherry-pick、未修改。
- 实现提交：见本文件末「提交坐标」。
- `eb71d6f` 的三项 REJECT 与 R2/R3 既有门保全：三项逐条闭合（完整 receipt 入 verdict、
  DER human 从 raw stdout 严格重解析、preflight 次序改为 control/ordinary 优先）。R2 的
  `850fa11` exact-cell publishedPath 门、R3 的 canonical 上游输入、四层证据、双 execution
  domain、签后回读、绝对 Apple 工具、具名 deadline 与不可覆盖 manifest 全部保留，无一回退。
- 行为等价 classifier 抽取的前后证据：抽取当轮以全 **64** 组入参穷举证明与 R3 内联 blocked-first
  表达式逐值同结果（`mismatch=0`），既有 **224** 例保持全绿后才动次序。
- 未改 R3 判定上的 first-red：四枚 identity 删除、raw `[Array]`、混合 preflight 六枚验收反例
  在未改 production 上首红为 **285 tests ＝ 229 pass / 56 fail**；四枚 identity 删除与 raw
  `[Array]` 均为 `实际 []`（零 failure 的 false-green），混合 preflight 实测
  `security_execution_domain_blocked` 而断言要求 `probe_failed`。其后三轮返修各自先红：
  **313 ＝ 290 / 23**（official path 与同轮 command 绑定、DER stderr exact、blocked reason
  重导）、**355 ＝ 342 / 13**（成功形状 `signal===null`、`gates` parity、`control.xml.stderr`
  parity、`spctl` argv exact）、**356 ＝ 355 / 1**（`gates` 恰四键 exact flat record）。
  末一枚另在**真实 observation** 上复证：注入 `gates.unexpected` 前后为 **7 → 7**，
  收紧后为 **7 → 8**。
- full probe 传递完整 receipt，而非 `{tools,commands}` 投影：`runFullProbe()` 原样交出同轮
  `hostToolReceipt`；`m1` 以 disposable 非受限 full 对照实验坐实 delta 恰
  **10 ＝ 8 receipt identity + 2 human-path**，随后 `sign-probe.mjs` byte-identical 恢复。
- receipt id、host/harness/Developer Tools/official/canonical/tool+command 的逐字段 hard gate：
  `schemaVersion:1`、receipt id 与 probe id exact、`capturedAt` 合法、host 六字段非空且
  `platform:'darwin'`、harness `path===execPath` 且架构等于 host process arch、CLT 两字段非空、
  official 双 SHA 等于冻结 `2e3f1286…b99d` 且 regular/non-symlink、canonical source 五值逐值
  exact。macOS/CLT 具体版本只登记不冻结（另有一枚换版本仍判绿的用例守住这一点）。
- 三 Apple tool 均至少一条同轮 command、argv/tool SHA/`LC_ALL=C`/双流自洽：既有门不退，另补
  三工具 command coverage 反例与 PATH-shim、tool SHA 不一致两枚。
- DER human 共享纯 parser 的 raw stdout grammar、stderr executable 行与 producer/verdict 互证：
  `parseDerHumanEntitlements()` 单一实现，采集端与判定端共用；stdout 只收一个根 `[Dict]` 与恰
  六组 `[Key]/[Value]/[Bool] true`；stderr **整流**逐字节等于 `Executable=<official-path>\n`
  （实测形状：147 B、单个 `0x0a`）；`expectedExecutable` 取已绑定 receipt official path，
  不取 command 自报 argv-last。
- preflight 的 control/ordinary failure → security blocked → passed 固定优先级：
  `classifyPreflight()` 四层次序固定，blocked reason 另收进已冻结闭集
  （`authority_unavailable` / `invalid_entitlements_blob` /
  `security_subsystem_internal_error` / `control_xml_empty`）。
- receipt id/canonical source/harness path/official SHA/unknown hierarchy/command 缺件补充反例：
  全部到位，另补 official 四命令 exact path 绑定、raw→summary parity、raw identity/Gatekeeper
  重导、plutil 实物绑定、command `error` identity、成功形状 `signal===null`、
  `preflight.gates` 恰四键 exact flat record 等反例。
- 三枚 production mutation 的 applied 校验、定向红数、逐枚恢复与最终 source SHA：
  **31 枚**逐枚验证命中、定向见红、byte-identical 恢复，总用例数全程锁在基线（不掉数即未改崩）。
  其中 **30 枚有效**；**`m22` 等价（0 红），如实登记不充作红证**——把 classifier 改回消费
  producer 自报 gates 不产生任何红，因为 gates parity 会独立抓住分叉，故「classifier 只消费
  重导值」是与 parity **联合**成立，而非单独可撤检查所守。另有一处结构性边界（full matrix
  串味防护由 `deriveSecurityBlockedReasons()` 的六条 receipt 入参闭集保证，`verdictPreflight`
  根本拿不到 `resign`）只有通过用例、无可撤检查，同样不声称 mutation 覆盖。
- built seatbelt control 的 blocked manifest path/SHA：`arch-r4e-seatbelt-frozen`，
  `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/arch-r4e-seatbelt-frozen/manifest.json`，
  外算 SHA-256 `1d3b06fd1a88a5a81f7015013578258707dad6065d44d79ece209aaabe590f04`，
  status `security_execution_domain_blocked`。**由架构支持会话在本实现 worktree 的冻结
  production bytes 上代跑**（ADR-022 六-E 2026-07-29 provenance 例外），非实现者自跑，
  不替代独立验收自跑。
- 缺 sidecar build 混合态的 `probe_failed` manifest path/SHA：`arch-r4e-mixed-frozen`，
  `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/arch-r4e-mixed-frozen/manifest.json`，
  外算 SHA-256 `d5c2af8c70b02dac6499f975d34c8e88ab2ebb646f3daedcde3407ea06a55fbf`，
  status `probe_failed`。provenance 同上。
- 批准非受限域 preflight/full 六格的 execution-domain id、manifest path/SHA：
  preflight `impl-r4g-preflight`（`passed`，manifest SHA-256
  `8adc88b2f5dfb991cfa88e80e5393641d857f367effd8e12eaa38436dd7dd3d8`）；
  full `impl-r4g-full`（`ok`、六格全过、`failureCount:0`，manifest SHA-256
  `d257c301fd9afbd24b07baa018a97a775214ea58d851bd0bc0d49dd728e893ca`，逐件绑定
  `host-tool-receipt.json` 81,831 B / `d8a6f6a6…`、`preflight.json` 16,014 B / `bf80bbb6…`、
  `sign-probe.json` 166,365 B / `86386ac5…`）。实现域功能 preflight 证明本域**非受限**，
  故本域不可能自证 Seatbelt blocked——这正是前两格须由外部域补的原因。
- fixture README 对 blocked 分类的窄化与原工程报告 R4 追加：README 已把「受限域只写 blocked」
  窄化为「control lifecycle/ordinary gate 成立后才可写 blocked」，并登记 R4 四轮收紧；
  原工程报告新增第二十节，只追加 R4 实测，不改路线结论。
- 从空 assembly 的 verdict 总数、76 counterexamples、600 cold-start、双 cycle、
  十件 inventory/source 与六格 sign：定向测试 **356/356**（既有 224 未回退）；
  **76** 枚反例逐枚串行实注入、零逃脱零不符（measure 23 exit 2 / coldstart 15＝13 枚 exit 2 ＋
  `--rounds 1` 与 `--samples 10` 各 exit 1 / reproducibility 14 exit 2 / SEA 8＝四枚
  `--fail-stage` exit 1 ＋ 四枚 `:evidence` exit 0 / physical 11＝十枚 exit 1 ＋ 反向对照
  `reportsOutside` exit 0 / fetch 4 / extract 1），每枚物理反例还原后复跑 `measure` 均回 exit 0；
  冷启 8 候选 × 3 轮 × 25 样本 ＝ **600**，`status:"ok" failures:0`；双 cycle 三 sealed 与两
  SEA default 各自 byte-identical、两 code-cache 各自不同、跨架构 `Code cache data rejected.`
  实测；十件闭集 8 候选 ＋ 2 负控、assembly 恰 12 目录 / 16 文件；来源门双架构
  字节/SHA/SHASUMS/tar/版本/架构全过、解包后 arm64 实物等于冻结官方 SHA；六格签名与嵌套
  `.app` 全过。
- `pnpm -r build`、`pnpm lint`、`pnpm test`、
  `pnpm --filter @courtwork/desktop lint:isolation-binding`、`git diff --check` 独立退出码：
  见本文件末「最终 tip 仓库门」。逐门单取退出码，未经管道。
- 原工程报告的零路线建议、旧 `dist` 零回填与实测/推论/blocked 分界：报告第二十节零路线建议，
  并列出六条最强反对意见；全部读数取自本轮从空 assembly 的重建，未从任何旧 `dist`、旧报告或
  已作废的 disposable 域回填。本轮**只引用** `arch-r4e-*` 两格与 `impl-r4g-*` 两格；此前所有
  `impl-r4`/`impl-r4b`…`impl-r4f` 与 `arch-r4-*` 域均因源码变更而作废，未在报告或本回执引用。
- 零新依赖、零新产品概念、复杂度扫描与待独立验收项：无 `package.json`/lock 改动，无新依赖；
  新增概念仅为判定层的共享纯函数（`classifyPreflight`、`parseDerHumanEntitlements`、
  `deriveSecurityBlockedReasons`、`parseOfficialSignatureIdentity`、`deriveGatesFromRaw`）与
  一处 XML 实物绑定，全部服务「判定只认同轮 raw 证据」这一本质复杂度，未引入新持久化格式、
  新状态机或新通用抽象。待独立验收项：Seatbelt 与混合两格须由验收会话在自己的 clean worktree
  以自己的 fresh id 自跑；本票不裁路线。

## 提交坐标

- implementation commit（四份冻结实现文件）：`891c23db9525c7118e79be3ce0382017232a6630`
- report + receipt commit：本提交。

冻结 production blob（此后任一字节变化即令架构支持的两格观察作废）：

| 文件 | Git blob |
|---|---|
| `packages/pi-lane/fixtures/sidecar-dist/scripts/sign-probe.mjs` | `ebedb76d8cc53c68b01f2bc7dfcdee4c97f9e0e9` |
| `packages/pi-lane/fixtures/sidecar-dist/scripts/lib/probe-verdict.mjs` | `bf260c53af189e96e27310fce64748e18f5e0c45` |
| `packages/pi-lane/fixtures/sidecar-dist/scripts/probe-verdict.test.mjs` | `4e08bced058a2cab4c46e42aa8c3723afe4d9a42` |
| `packages/pi-lane/fixtures/sidecar-dist/README.md` | `3b64b0dbf2f55db2769f5dd76a2374d2f01c5c87` |

## 最终 tip 仓库门

| 门 | 退出码 |
|---|---|
| `node --test .../probe-verdict.test.mjs` | `0（356/356）` |
| `pnpm -r build` | `0` |
| `pnpm lint` | `0` |
| `pnpm test` | `0（160 files / 1397 tests）` |
| `pnpm --filter @courtwork/desktop lint:isolation-binding` | `0（6 宿主 / 18 pi lane 源码）` |
| `git diff --check` | `0` |

## 残留

`clean.mjs --report-only` 实测 **5,225,397,510 B（4.87 GiB）**，逐项求和与 total 相等，
`removed` 全为 `false`：未执行真实清理，`dist` 实物完整保留给独立验收。主要保全范围
`security-domain/` 3,486,411,568 ＋ `assembly/` 1,143,565,916 ＋ `runtime/` 473,562,352 ＋
`cross-arch/` 115,806,624 ＋ `build/` 5,854,354。该数与 `3207b27` 的 2.27 GiB、R1 的
2.35 GiB **并列而非订正**——三者是三个不同的保全范围。

## 停止边界

本票停在**待独立验收**。不 push、不 merge、不自验收、不裁 sidecar 路线、不启动
`PI-HOST-LOOP-1`、`PI-DEBUG-BUILD-1`、DMG、Pages 或对外叙事更新。本轮全部签名证据只到同机
ad-hoc probe，**不覆盖 Developer ID、公证/staple、Tauri bundler 产物或任何公开发行成熟度**；
`spctl` 的 exact `rejected` 是未公证件的预期边界，不得读成签名链有问题或已具备发行条件。
