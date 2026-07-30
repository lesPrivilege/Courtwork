# PI-SIDECAR-DIST-1R4 路线裁定备料（2026-07-30）

性质：架构裁路线的备料消化件，由 Opus 跑腿只读产出、Fable 主会话对两条载重事实亲测复核。
**R4 数字在独立验收 PASS 前不得作主线事实**；本件不含路线建议，不替代放行后的报告消费。

读取面：分支 `codex/pi-sidecar-dist-1r4`（tip `07d2dbc`）的回执
`packages/pi-lane/specs/PI-SIDECAR-DIST-1R4.md`、工程报告 `docs/engineering/pi-sidecar-dist-1.md`
（1,184 行，第二十节为 R4 新增）、fixture README，以及 main（`6908009`）上的 ADR-022 六-E。
全程只读，未进 worktree、未跑仓内脚本。工程报告正文只存在于该分支。

## 一、路线候选对照

候选集由 ADR-022 六-E 决定一预先冻结为两条；报告未调研 Bun/Deno/pkg/nexe 等其他形态；
`route-c` 在库存闭集里是必须判红的形状。库存恰十件：两架构 ×（sealed 三档 + SEA 两档），
其中两枚 `esm-naive` 是负控。

| 维度 | 甲：官方 runtime + sealed bundle | 乙：Node SEA | 锚点 |
|---|---|---|---|
| 随包文件 | 2 件（`externalBin` + `bundle.resources` 两套机制） | 1 件（`externalBin` 一条） | §六、§十四 |
| Rust 侧 | 须解析 resource 路径并作 argv 传入 | spawn 即用 | §六、§十四 |
| shipped 体积 arm64 | `cjs` 113,273,140 B（108.03 MiB） | `default` 112,382,848 B／`code-cache` 112,629,088 B | §七 |
| shipped 体积 x86_64 | 115,792,244 B（110.43 MiB） | 110.20／110.44 MiB | §七 |
| 体积差归因 | — | 乙少 890,292 B 来自 `--remove-signature` 刨掉官方 CodeDirectory（实读 875,632 B）再补 344 KB blob；换真实 Developer ID 后大部分消失，且换后净体积未实测 | §七 观察一、§十七 |
| 冷启 arm64（三轮中位数之中位数） | `cjs` 38.4 ms、`esm-createrequire` 39.9 | `default` 37.3 ms、`code-cache` 31.6 ms | §八 |
| 冷启 x86_64（Rosetta） | 110.1／117.9 ms | 106.8／98.9 ms | §八 |
| 冷启区分力 | 全体跨度 8.3 ms，小于裸 Node 启动底座 25.2 ms（x86_64 底座 86.1 ms） | 同左 | §八 |
| 功能维度 | stdio 三类 payload 字节与 SHA 全等、工具表 exact `["read","grep","glob"]`、abort 四条齐判、四类崩溃 exact code/signal 与复启 | 与甲同构全过，无路线差 | §九、§十四 |
| 打包格式 | ESM 须 `createRequire` banner；`esm-naive` 运行即死（`yaml@2.9.0` 的 `require("process")`），已转常驻负控 | 只收 CJS | §十五-一、§十四 |
| 上游风险 | `esbuild@0.28.1`（MIT，一手读 LICENSE） | 另叠 `postject@1.0.0-alpha.6`（自有 MIT + `vendor/LIEF` Apache-2.0）与 Node SEA Stability 1.1 | §十六 |
| 产物可复现 | bundle 与 node 二进制均逐字节可复现 | `default` 仅同 worktree、同绝对构建路径下 byte-identical；`code-cache` 按判据必须每次不同 | §七 观察三、§十 |
| 跨路径/跨机可复现 | 已证（不含路径） | 未实测；SEA blob 内含入口 CJS 绝对路径，换路径字节必变 | §十、§十七 |
| 跨架构 code cache | 不适用 | 静默降级：arm64 blob 注入 x64 后照常 exit 0，仅 stderr 留 exact `Code cache data rejected.` | §十 |
| 排障与热修 | 崩溃栈指向磁盘上可读的 `sidecar.cjs`，可直接改文件复跑 | 栈指向嵌入内容，改一行须重跑整条注入链 | §十四 |
| 更新运行时 | 换 node 二进制与换 bundle 可分别进行 | 任一变更都要重跑 remove-signature → postject → 重签 | §十四 |
| 签名（同机 ad-hoc） | 六格 sign 与 strict verify 全 exit 0；plain 与带 canonical 六键可启动；hardened 空 entitlements 必 SIGTRAP | 同左；另证嵌套 `.app` 三层 strict verify 全 0、内嵌 sidecar `ready→EOF→exit 0`、`spctl` exact exit 3 `rejected` | §十一、§十九之一、§二十之四 |
| 报告对称列出的反对理由 | 两件产物即两套装配机制，多一类「资源找不到/路径不对」失败模式；六-A 已把「WebView 不拥有绝对路径」写成边界 | 上游风险叠两层；排障更重；产物字节含构建路径，跨机比 SHA 须先规范化路径 | §十四 |

路线无关的两条：entitlements 须逐条筛并在真实 Tauri 打包链上验证嵌套签名（否则 sidecar
SIGTRAP）；打包格式定 CJS。`useCodeCache` 是独立于路线的开关。

已证/未证分界：功能、体积、同机冷启、同路径可复现、同机 ad-hoc 签名属已实测；
Developer ID 后净体积、跨路径与跨机 SEA 可复现、真 Intel 硬件性能、tauri-bundler 对
`externalBin` 的实际签名选项、Windows/Linux 装配均未实测或 blocked（§十七）。

## 二、路线裁定决策点

execution domain 证据效力：实现域经功能 preflight 证明为非受限域，故「实现域」与「批准非
受限域」本轮是同一台主机；seatbelt blocked 与缺 build 混合态两格由架构支持会话按 provenance
例外（main `51cc8ae`）代跑，绑定冻结 production bytes；独立验收自跑层当前为零。

| # | 须拍板 | R4 内证据 | 域 |
|---|---|---|---|
| 1 | 甲/乙选型 | 成立但不判胜负：功能对等已证；体积与冷启差小于噪声；报告零建议 | 实现域 |
| 2 | `useCodeCache` 开关 | 成立：省 5.7 ms（arm64）/7.9 ms（x86_64），代价产物不可复现＋跨架构静默降级 | 实现域 |
| 3 | 打包格式定 CJS | 成立：`esm-naive` 双架构 exit 1 实证 | 实现域 |
| 4 | 产品 entitlements 逐件冻结 | 部分：ad-hoc 面已证（硬化空 entitlements 必 SIGTRAP；带 canonical 六键可启动）；`get-task-allow` 不得进分发件属规则判断；Developer ID 面 blocked | 实现域＋规则 |
| 5 | tauri-bundler 是否按主 app 选项签 `externalBin` | 不成立：现有结论是配置默认值＋Node 重签行为的合成推论，未实测（crate 随 `@tauri-apps/cli` 预编译分发） | 未取得 |
| 6 | `postject` 去留 | 成立：MIT + `vendor/LIEF` Apache-2.0，`package.json` license 字段只写 MIT；alpha 版 + Stability 1.1 | 一手 LICENSE |
| 7 | 跨机/跨路径 SEA 可复现是否列放行条件 | 不成立：未实测 | 未取得 |
| 8 | x86_64 是否进当期支持矩阵 | 不成立：本机 M2，x86_64 全程 Rosetta 2 | blocked |
| 9 | 同轮 receipt `error` 非 null 是否直接令成功 gate 失败 | 本轮未扩张，报告标 `[需架构拍板]` | 待裁 |
| 10 | 残留 4.87 GiB 何时真清 | 成立：`clean.mjs --report-only` 实测 5,225,397,510 B，`removed` 全 `false`，`dist` 完整保留给验收 | 实现域 |
| 11 | `PI-DEBUG-BUILD-1` 派单前置（signing plan 顶层含 `routeId`） | 依赖 1 与 4 先落 | ADR 六-E |
| 12 | 两枚代跑观察是否接受为执行域证据 | 成立：回执逐项登记，四枚冻结 blob 与登记值一致（跑腿复核） | 代跑 |

1、2、3、6、10 证据可读；4、11 部分；5、7、8 结构性缺失（属发行票或另派）；9、12 纯裁定。

## 三、六条最强反对意见（§二十之五，压缩不失真）

1. 全部签名读数出自同机 ad-hoc probe，不覆盖 Developer ID、notarization、Tauri bundler
   产物或任何公开发行成熟度；`spctl` 的 exact `rejected` 是未公证件预期边界。
2. 实现域非受限是前提不是结论；两格代跑绑定冻结 bytes，源码再变即作废；独立验收仍须
   自跑三格。
3. byte-identical 只在同一绝对路径成立；换路径、Developer ID 后净体积、真 Intel 行为未实测。
4. `m22` 等价说明「classifier 只消费重导值」缺独立可撤检查；full matrix 串味防护同样只有
   结构保证。两处不得读成已有 mutation 红证。
5. 同轮 receipt `error` 非 null 的判定语义未扩张，属 `[需架构拍板]`。
6. 本报告零路线建议；HOST-LOOP 与 DEBUG-BUILD 在放行与裁路线前继续 blocked。

## 四、残留与未闭合

- 残留 4.87 GiB 未真清；口径为并列非订正（`3207b27` 2.27 GiB、R1 2.35 GiB 与本值是三个
  保全范围）；报告内实际存在五个数（§十八 R2=2,530,884,707；§十九之三 R3=4,664,670,380），
  README 的「三个数」表未随之扩写。
- 受限域签名矩阵：受限域只能取得 preflight blocked 分类，六格 full 只能在批准非受限域取得，
  这是判定层设计而非缺陷；受限域报 `passed` 或混合态报 blocked 均判红。
- §十七 blocked/未核实全表：路线选型与 `useCodeCache` `[需架构拍板]`；Developer ID/notarize/
  staple/Gatekeeper 首启 blocked（属 parked 的 RELEASE-1）；tauri-bundler 签名选项未核实；
  原生 x86_64 blocked；Windows/Linux blocked；真实 DeepSeek key 端到端未做；跨平台 CI 的
  esbuild 平台包与 blob 生成未实测；`vendor/LIEF` 交付与 notice 义务归发行票。
- 判定层自认缺口：`m22` 等价 0 红如实登记；`launchProbe`/`stdio`/`abort` 三处仍是裸
  `await proc.exited`（跟在已超时 waitFor 之后，失败方向挂起非假绿）；`kill-confirm` 格未被
  真桩触发，只由窄接缝定向测试加变异覆盖。

## 五、跑腿另核出三处（Fable 亲测复核前两处）

1. **R4 分支树内 ADR-022 比 main 恰缺 38 行**（分支 blob `de938fb`，main blob `e50777c`；
   Fable 以 `git rev-parse` + `git diff --stat` 复核坐实）。缺失内容＝`fd5590b`（R4
   hard-verdict 闭口契约）与 `51cc8ae`（provenance 代跑例外）。**验收与裁定须以 main 的
   ADR-022 为契约真源**；只读分支树会按缺 R4 契约条款的旧文本打分。回执自述「只读消费、未
   cherry-pick」与实测一致。
2. **`esbuild@0.28.1` 与 `postject@1.0.0-alpha.6` 已进入 pi-lane devDependencies 与根
   lockfile**（Fable 以 `git diff efcd0ab..07d2dbc` 复核坐实），来自分支携带的 R1–R3 血缘
   （fixture 器材，属票面）；R4 自身两枚提交只碰六文件、零依赖变化。含义：合入 R4 分支即把
   postject 带进 main；若裁甲路，清账时同批评估移除乙路器材。
3. **§十四 对照表冷启行是 R1 期旧值**（42.8/41.9/35.2，由 `e9ffff6` 写入未随 §八 重测更新；
   §八 实测 38.4/37.3/31.6）。相对次序未变，「换 6.7 ms」应为 5.7 ms。裁定引用须取 §八。
   另：回执「最终 tip 六道仓库门」表写在它描述的提交自身里（与 `COMPOSER-SPEC-SYNC-1` 判例
   同形），验收须在真实 tip 亲跑六门，不采信表值。

## 六、验收面预览（要点）

完整账见 R4 回执本体；独立验收会话须逐项复核：first-red 四轮
（285=229/56、313=290/23、355=342/13、356=355/1，末枚另在真实 observation 上 7→7/7→8
复证）；行为等价抽取以 64 组入参穷举 `mismatch=0`＋既有 224 例保持绿后才动次序；定向测试
356/356；31 枚 source mutation（30 有效、`m22` 等价 0 红如实登记）；`m1` 以 disposable full
对照 delta 恰 10；76 counterexample 零逃脱；批准域全矩阵（来源门双架构、双 cycle、十件闭集、
600 冷启样本、六格签名、`spctl` exact exit 3）；四格 manifest（`arch-r4e-seatbelt-frozen`
blocked／`arch-r4e-mixed-frozen` probe_failed／`impl-r4g-preflight` passed／`impl-r4g-full`
ok）；六道仓库门独立退出码。**验收无法由 R4 替代的三格**：seatbelt blocked、缺 build 混合态
`probe_failed`、批准非受限域 full 六格——各在自己的 clean worktree 用自己的 fresh id。
