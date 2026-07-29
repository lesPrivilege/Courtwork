# `sidecar-dist` fixture · PI-SIDECAR-DIST-1R3

`ADR-022` 六-E 分发调研票的实验装置。**这不是产品代码**，也不是产品 sidecar：
生产 wire 由 `PI-CODE-STDIO-1` 实现，生产宿主由 `PI-HOST-LOOP-1` 实现，两者本票都不碰。
这里只有一个「会真实 import pi core、真跑一轮 tool loop、能被 abort、能按令崩溃」的
被测进程，外加把它按两条路线装配、逐项判定、探签名形态的脚本。

实测正文在 [`docs/engineering/pi-sidecar-dist-1.md`](../../../../docs/engineering/pi-sidecar-dist-1.md)；
本文件只讲怎么跑。**路线未裁**——本装置只交证据，不作选型。

## 返修要点：判定住一个地方，且一定会判红

`PI-SIDECAR-DIST-1` 的独立验收（`9b8142f`）判 **REJECT**，首要理由是装置把 stdio/abort/crash
的失败**只序列化进 JSON**、顶层照报 `status:'ok'`，缺产物还会静默跳过。R1 返修后：

- 判据全部住 [`scripts/lib/probe-verdict.mjs`](scripts/lib/probe-verdict.mjs)（纯函数、零 I/O），
  `measure` / `coldstart-rounds` / `reproducibility-probe` / `sign-probe` **共用同一份**；
- 库存是**恰十件的闭集**：两架构 ×（sealed 三档 + SEA 两档）。其中两枚 `esm-naive` 是
  **负控**，必须以既知 `Dynamic require of "process"` 非零失败；其余八枚才是候选。
  少一件、多一件、重复、错名、任一项 blocked 或失败，都令顶层 `status:'failed'` 且**进程非零**；
- 判定层自带定向测试，`node --test` 跑（见下）。

## R2 返修要点：判据要对着**实物**，且 crash 生命周期的每个等待都有上界

`PI-SIDECAR-DIST-1R` 的独立验收（`f261347`）再判 **REJECT**：R1 的判定虽然集中了，
却仍有三处对着**自己算出来的观察值**判绿。R2 逐条闭合：

| `f261347` 的坐实 | R1 为什么绿 | R2 的收紧 |
|---|---|---|
| 磁盘真多出 `route-a/unexpected-physical/proof.txt`，`measure` 仍 `status:'ok'` | `observedIds` 由常量 `INVENTORY` 推出，从不枚举磁盘 | 唯一 `dist/assembly`，observation 由 `readdir`+`lstat` 的**实物**构造，与冻结闭集双向比对 |
| 首枚 cold-start 身份错、后 24 枚正确 → 零 failure | 只判一个收束后的 `round.identity`，而它已被换成漂移**后**的值 | 每轮 25 枚样本逐枚留档、逐枚校验身份与 EOF；`identityDrift` 非 null 即红 |
| SEA default 的 `shas:[null,null]` 被判可复现 | `deterministic()` 只做 `===`，`null===null` 为真 | 先证 exists / regular-file / 正字节 / 64 位小写 hex，**无效读数不进相等比较** |
| crash 的 ack/exit 可无限等待 | 只 `await crashing` 再裸 `await proc.exited` | 五个具名 deadline（ack 15s、exit 15s、respawn-ready 30s、respawn-EOF 15s、kill-confirm 5s），超时写结构化 failure、杀残留、非零 |
| SEA remove-signature/sign/strict-verify 非零仍记 `ok` | 只有 postject 非零被拦 | 四个外部阶段逐个判，全过才从干净 staging 原子发布；任一失败零成品，也不复用旧件 |

**`dist/` 的分区是判据能成立的前提**：只有十件随包制品进 `dist/assembly/`，
构建 scratch（`dist/build/`）、runtime、corpus、读数 JSON 与反例留档全在其外——
否则「多一件」这条判据会被装置自己的中间件误伤，等于没判。

## R3 返修要点：entitlements 证据必须绑定输入、工具与 execution domain

R3 不改两条分发路线，只收紧签名实验的证据链：

- canonical 输入是仓内冻结的
  [`upstream/node-v22.23.1/osx-entitlements.plist`](upstream/node-v22.23.1/osx-entitlements.plist)：
  exact 632 bytes、SHA-256
  `a0387464b93dd3d92c9f92c3d3f67713b355cc76d131f0542a69d2ca2cc6d797`，六键全为
  `true`；不从历史 `dist/`、运行时 extraction 或临时生成文件回退。
- 签名前先在**同一进程、同一 execution domain**完成 control：official Node 私有副本以
  canonical 输入重签、strict verify、XML 等义，并真跑冻结的 `sidecar-fixture.mjs`
  `ready → EOF → exit 0`。受限域只写
  `security_execution_domain_blocked`，不得冒充普通 `probe_failed`。
- `/usr/bin/codesign`、`/usr/sbin/spctl`、`/usr/bin/plutil` 均以绝对路径和 `LC_ALL=C`
  调用；同轮 receipt 绑定工具实物 SHA、命令 argv 与 stdout/stderr bytes+SHA。
- official Node 的 XML 与 DER human-readable 是两条独立 observation；六格重签后再回读
  actual entitlements。plain / hardened-no-entitlements 必须为空，带 canonical 输入的
  hardened 格必须逐值等义。
- 每次运行只写 `dist/security-domain/<id>/`，staging 原子落名；既有 id 拒绝覆盖，
  顶层不再生成共享 `dist/sign-probe.json`。

### 上界的**准确范围**（不夸大）

有上界的是 **crash 生命周期**（`measure.mjs` 的 `crashes()`）与 **cold-start 取样**
（`coldstart-rounds.mjs` 的 EOF 等待）这两处，共用 `CRASH_DEADLINES` 五个具名值，
且每次 cleanup 都经 `killAndConfirmInto()` 消费返回值——确认不了就补记 `kill-confirm`。

**其余等待仍是裸 `await proc.exited`，如实登记，不冒充有界**：
`measure.mjs` 的 `launchProbe`／`stdio`／`abort` 与
`reproducibility-probe.mjs` 的跨架构注入各一处。它们都跟在一个**已有超时的 `waitFor`**
之后（进程已确认可服务），失败方向是挂起而非假绿；本票未收窄它们，也不声称已收窄。
R3 新写的 `sign-probe.mjs` 不含裸 `await proc.exited`；ready、EOF、exit 与 kill-confirm
各走具名 deadline。

## 复现序（须按序）

```bash
pnpm --filter @courtwork/pi-lane build     # fixture 经 ../../../dist/index.js 载入本包
cd packages/pi-lane/fixtures/sidecar-dist
node scripts/fetch-runtime.mjs             # 官方 Node 22：partial → 全项校验 → 原子落名
node scripts/extract-runtime.mjs           # 解包并核 node --version / Mach-O 架构
node scripts/reproducibility-probe.mjs     # 从空 assembly 连做两个 cycle（**这一步同时是装配步**）
node scripts/measure.mjs                   # assembly 实物闭集 + 十件的身份/stdio/loop/abort/崩溃
node scripts/coldstart-rounds.mjs          # 八候选 × 三轮 × 25 样本（逐枚留档）→ dist/coldstart-rounds.json
node scripts/sign-probe.mjs --execution-domain-id acceptor-preflight --preflight-only
# 上一条在受限域应准确 blocked；正式 full 必须在明确批准的非-seatbelt 域用新 id：
node scripts/sign-probe.mjs --execution-domain-id acceptor-full
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

当前定向测试为 **224 例**（R2 203 + R3 21）。不进 root `pnpm test`：
`vitest.config.ts` 的 include 只收各包 `src` 下的 `.test.ts`。
体例与 `site/scripts` 下的同类 `.test.mjs` 一致，走 `node --test`。

## 反例（验证判据确实拦得住）

被测 `sidecar-fixture.mjs` 由票面**冻结**，故观察面的反例落在「采集完成、判定之前」：
真起进程、真跑一轮、真收包，然后只坏一处，并校验「确实坏到了」——改不动的是**等价变异**，
须如实登记，不算覆盖。物理面的反例（删产物、截断 archive、预置错件）直接动磁盘。

```bash
node scripts/measure.mjs --list-counterexamples
node scripts/measure.mjs --counterexample stdio.payload.sha
node scripts/coldstart-rounds.mjs --list-counterexamples
node scripts/coldstart-rounds.mjs --counterexample identity.firstSample
node scripts/reproducibility-probe.mjs --counterexample codeCache.identical
node scripts/coldstart-rounds.mjs --rounds 1          # 少轮
```

R2 另有三类**不走注入面**的反例：

```bash
# 物理面：真往 assembly 里落一份多余文件／目录／symlink／FIFO，再跑未改的 measure
mkdir -p dist/assembly/route-a/unexpected-physical
printf p > dist/assembly/route-a/unexpected-physical/proof.txt
node scripts/measure.mjs                              # 期望 exit 1

# SEA 四阶段：真让某个外部命令失败（给它一个必然失败的实参），非改观察值
node scripts/build-sea.mjs --fail-stage verifyStrict --fail-cell 'aarch64-apple-darwin|default'

# crash 上界：对一枚**能 ready、但忽略 crash/exit** 的受控子进程跑崩溃探针。
# 桩由脚本现生成到 dist/counterexamples/，不改被票面冻结的 sidecar-fixture.mjs。
node scripts/measure.mjs --counterexample crash.ignored
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
| `scripts/sign-probe.mjs` | execution-domain preflight、canonical entitlement、三姿势重签、`.app` 嵌套签名 |
| `upstream/node-v22.23.1/osx-entitlements.plist` | Node v22.23.1 上游冻结的 632-byte canonical 重签输入 |
| `scripts/clean.mjs` | 残留清点（`--report-only`）与清理 |
| `dist/assembly/` | **唯一随包目录**：恰 `route-a/`（六目录 × 两件）+ `route-b/`（四目录 × 一件）＝ 12 目录 + 16 文件 |
| `dist/build/` | 构建 scratch：中间 bundle、`sea-config.json`、blob、staging。**不随包** |
| `dist/counterexamples/` | 反例红证留档（含现生成的受控子进程桩） |
| `dist/security-domain/<id>/` | 每个执行域独占的 host/tool、preflight、full 与 manifest；拒绝覆盖 |
| `dist/r3-evidence/` | R3 本轮 first-red、mutation、76 反例与 final 重跑留档 |
| `dist/final/` | 最终一轮读数与 assembly 的 SHA 清单 |
| `dist/` | 全部产物与读数。**被仓库根 `.gitignore` 的 `dist/` 覆盖，不入库** |

## 残留

三个数**并列，互不取代**——它们是三个不同的保全范围，不是同一个量的三次修正：

| 出处 | 字节 | 保全范围 |
|---|---|---|
| `3207b27` | 2,436,991,750（2.27 GiB） | 原实验的历史峰值 |
| `PI-SIDECAR-DIST-1R` | 2,527,892,648（2.35 GiB） | 含 31 份反例、`cross-arch/` 与 final 读数的较大范围 |
| `PI-SIDECAR-DIST-1R2` | 见报告[第十八节](../../../../docs/engineering/pi-sidecar-dist-1.md)逐项求和 | 本票范围（assembly/build 分区后，反例留档更多） |

三个数均取自 `node scripts/clean.mjs --report-only` 的实测输出，非估算。

**独立验收前不要真清**：`dist/counterexamples/`、`dist/final/` 与 `dist/r2-evidence/`
是反例红证、最终读数与 blocker 复现留档。

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
