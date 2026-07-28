# `sidecar-dist` fixture · PI-SIDECAR-DIST-1R

`ADR-022` 六-E 分发调研票的实验装置。**这不是产品代码**，也不是产品 sidecar：
生产 wire 由 `PI-CODE-STDIO-1` 实现，生产宿主由 `PI-HOST-LOOP-1` 实现，两者本票都不碰。
这里只有一个「会真实 import pi core、真跑一轮 tool loop、能被 abort、能按令崩溃」的
被测进程，外加把它按两条路线装配、逐项判定、探签名形态的脚本。

实测正文在 [`docs/engineering/pi-sidecar-dist-1.md`](../../../../docs/engineering/pi-sidecar-dist-1.md)；
本文件只讲怎么跑。**路线未裁**——本装置只交证据，不作选型。

## 返修要点：判定住一个地方，且一定会判红

`PI-SIDECAR-DIST-1` 的独立验收（`9b8142f`）判 **REJECT**，首要理由是装置把 stdio/abort/crash
的失败**只序列化进 JSON**、顶层照报 `status:'ok'`，缺产物还会静默跳过。返修后：

- 判据全部住 [`scripts/lib/probe-verdict.mjs`](scripts/lib/probe-verdict.mjs)（纯函数、零 I/O），
  `measure` / `coldstart-rounds` / `reproducibility-probe` / `sign-probe` **共用同一份**；
- 库存是**恰十件的闭集**：两架构 ×（sealed 三档 + SEA 两档）。其中两枚 `esm-naive` 是
  **负控**，必须以既知 `Dynamic require of "process"` 非零失败；其余八枚才是候选。
  少一件、多一件、重复、错名、任一项 blocked 或失败，都令顶层 `status:'failed'` 且**进程非零**；
- 判定层自带定向测试，`node --test` 跑（见下）。

## 复现序（须按序）

```bash
pnpm --filter @courtwork/pi-lane build     # fixture 经 ../../../dist/index.js 载入本包
cd packages/pi-lane/fixtures/sidecar-dist
node scripts/fetch-runtime.mjs             # 官方 Node 22：partial → 全项校验 → 原子落名
node scripts/extract-runtime.mjs           # 解包并核 node --version / Mach-O 架构
node scripts/reproducibility-probe.mjs     # 从空 route 目录连做两个 cycle（**这一步同时是装配步**）
node scripts/measure.mjs                   # 十件库存的身份/stdio/loop/abort/崩溃 → dist/measurements.json
node scripts/coldstart-rounds.mjs          # 八候选 × 三轮 × 25 样本，逐轮随机化 → dist/coldstart-rounds.json
node scripts/sign-probe.mjs                # ad-hoc 签名矩阵与 .app 嵌套 → dist/sign-probe.json
node scripts/clean.mjs --report-only        # 清点残留（**独立验收前不要真清**）
```

`reproducibility-probe.mjs` 自己会跑两轮 `build-sealed.mjs` + `build-sea.mjs`，跑完磁盘上留的是
第二个 cycle 的产物，后面三支直接用。要单独装配一次也可以：

```bash
node scripts/build-sealed.mjs && node scripts/build-sea.mjs
```

运行时**不再需要手动 `curl`**：`fetch-runtime.mjs` 只从冻结的
`https://nodejs.org/dist/v22.23.1/` 取，先写同目录唯一 partial，fsync 后逐项核冻结文件名、
冻结字节数、冻结 SHA-256、同次下载的 `SHASUMS256.txt` 记录与 `tar` 完整性，**全过才**原子
rename 并 fsync 父目录；现存正式件先按同一套复核再复用，错件拒绝且**不覆盖**。

该门只证明 **HTTPS 传输完整性 + 冻结身份**，**不是** release-key 供应链认证——
未校验 nodejs.org 的签名密钥，也未验证 `SHASUMS256.txt.sig`。

## 判定层的测试

```bash
node --test packages/pi-lane/fixtures/sidecar-dist/scripts/probe-verdict.test.mjs
```

不进 root `pnpm test`：`vitest.config.ts` 的 include 只收各包 `src` 下的 `.test.ts`。
体例与 `site/scripts` 下的同类 `.test.mjs` 一致，走 `node --test`。

## 反例（验证判据确实拦得住）

被测 `sidecar-fixture.mjs` 由票面**冻结**，故观察面的反例落在「采集完成、判定之前」：
真起进程、真跑一轮、真收包，然后只坏一处，并校验「确实坏到了」——改不动的是**等价变异**，
须如实登记，不算覆盖。物理面的反例（删产物、截断 archive、预置错件）直接动磁盘。

```bash
node scripts/measure.mjs --list-counterexamples
node scripts/measure.mjs --counterexample stdio.payload.sha
node scripts/reproducibility-probe.mjs --counterexample codeCache.identical
node scripts/coldstart-rounds.mjs --rounds 1          # 少轮
```

退出码：`0`＝干净全过；`1`＝正式实测判红；`2`＝反例被判据抓住（**期望结果**）；
`3`＝反例没被抓住，或压根没改动观察值。

## 目录

| 路径 | 作用 |
|---|---|
| `scripts/lib/probe-verdict.mjs` | **唯一判定层**：库存闭集、身份/stdio/abort/crash/冷启/可复现/签名/来源判据。纯函数 |
| `scripts/probe-verdict.test.mjs` | 判定层的定向测试（`node --test`） |
| `scripts/sidecar-fixture.mjs` | 被测 sidecar。NDJSON stdin/stdout，`ready`/`init`/`run`/`slow`/`abort`/`crash`/`echo`/`ping`。**本票冻结** |
| `scripts/lib/toolkit.mjs` | 路径、跑命令、量文件、NDJSON 子进程、库存→磁盘坐标。**不含判定** |
| `scripts/fetch-runtime.mjs` | 官方发行包取件门：partial → 校验 → 原子落名 |
| `scripts/extract-runtime.mjs` | 解包并核解包后身份，消费 `verdictRuntimeSource` |
| `scripts/build-sealed.mjs` | 路线甲装配（三档 bundle × 两 triple） |
| `scripts/build-sea.mjs` | 路线乙装配（两档 blob × 两 triple） |
| `scripts/reproducibility-probe.mjs` | 双 cycle 可复现性 + 跨架构 code cache 注入 |
| `scripts/measure.mjs` | 十件库存的体积/SHA、身份、stdio、loop、abort、四类崩溃 |
| `scripts/coldstart-rounds.mjs` | 三轮随机化冷启与裸 runtime 基线 |
| `scripts/sign-probe.mjs` | entitlement、三姿势重签、`.app` 嵌套签名 |
| `scripts/clean.mjs` | 残留清点（`--report-only`）与清理 |
| `dist/` | 全部产物与读数。**被仓库根 `.gitignore` 的 `dist/` 覆盖，不入库** |

## 残留

跑完整套（含 31 枚反例的逐枚留档）实测 **2,527,892,648 B（2.35 GiB）**，逐子目录字节见
报告[第十八节](../../../../docs/engineering/pi-sidecar-dist-1.md)。该数取自
`node scripts/clean.mjs --report-only` 的实测输出，非估算；它取代 `3207b27` 的 2.27 GiB
（差额构成见报告同节）。

**独立验收前不要真清**：`dist/counterexamples/` 与 `dist/final/` 是反例红证与最终读数的留档。

## 两处体例说明

- **文件都住 `scripts/`**：根 `eslint.config.js` 只给 `**/scripts/**/*.mjs` 声明 Node 全局
  （`process`/`console`/`Buffer`/`fetch`/…）。放别处会一片 `no-undef`。这是 lint 面的形状，不是语义分类。
- **不在 `packages/pi-lane/src/` 之内**：ADR-018 门 R3 的 pi lane 扫描面
  （`apps/desktop/scripts/assert-isolation-binding.mjs`）只收 `packages/pi-lane/src` 下的 `.ts`。
  本 fixture 的 `child_process`／fs 写属实验宿主，不是 pi lane 生产码，故不进那本登记册；
  生产码零 Node 执行/写原语的判据不受本票影响。该门的完整命令是：

  ```bash
  pnpm --filter @courtwork/desktop lint:isolation-binding
  ```

  仓库根**没有**无限定的 `lint:isolation-binding` script；`pnpm lint:isolation-binding` 会退出 254。

## 与生产形态的已知偏离（不得反推为产品设计）

1. `ready` 在进程启动即发；生产是 host 先 `bootstrap`、sidecar 再 `ready`（ADR-022 六-B.1）。
   冷启动的定义就是「spawn 到可服务」，先等一个入包会把 host 调度混进读数。
2. 授权根经 `init` 包给出，不是 argv、不是环境变量——方向与生产的 stdin bootstrap 一致，
   但字段与状态机都不是六-B 那份契约。
3. provider 用 pi-ai 自带 faux：确定性、不触网、不耗额度。分发实验量的是进程与打包，不是模型。
