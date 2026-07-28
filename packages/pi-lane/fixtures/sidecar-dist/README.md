# `sidecar-dist` fixture · PI-SIDECAR-DIST-1

`ADR-022` 六-E 分发调研票的实验装置。**这不是产品代码**，也不是产品 sidecar：
生产 wire 由 `PI-CODE-STDIO-1` 实现，生产宿主由 `PI-HOST-LOOP-1` 实现，两者本票都不碰。
这里只有一个「会真实 import pi core、真跑一轮 tool loop、能被 abort、能按令崩溃」的
被测进程，外加把它按两条路线装配、量六项指标、探签名形态的脚本。

实测正文与路线建议在 [`docs/engineering/pi-sidecar-dist-1.md`](../../../../docs/engineering/pi-sidecar-dist-1.md)；
本文件只讲怎么跑。

## 复现序（须按序）

```bash
pnpm --filter @courtwork/pi-lane build          # fixture 经 ../../../dist/index.js 载入本包
node scripts/extract-runtime.mjs                # 核 SHA-256 后解包官方 Node 22 LTS
node scripts/build-sealed.mjs                   # 路线甲：runtime + sealed bundle（三档格式）
node scripts/build-sea.mjs                      # 路线乙：Node SEA（两档 blob）
node scripts/measure.mjs                        # 六项实测 → dist/measurements.json
node scripts/sign-probe.mjs                     # ad-hoc 签名与 .app 嵌套形态 → dist/sign-probe.json
node scripts/clean.mjs                          # 清残留（~1.4 GiB）
```

官方 Node 发行包须先手动下载到 `dist/runtime/`（含 `SHASUMS256.txt`）：

```bash
curl -L -o dist/runtime/node-v22.23.1-darwin-arm64.tar.gz https://nodejs.org/dist/v22.23.1/node-v22.23.1-darwin-arm64.tar.gz
```

`extract-runtime.mjs` 校验不过一律抛错；来源不明的运行时不进实验。

## 目录

| 路径 | 作用 |
|---|---|
| `scripts/sidecar-fixture.mjs` | 被测 sidecar。NDJSON stdin/stdout，`ready`/`init`/`run`/`slow`/`abort`/`crash`/`echo`/`ping` |
| `scripts/lib/toolkit.mjs` | 路径、跑命令、量文件、NDJSON 子进程句柄。不含任何判定 |
| `scripts/extract-runtime.mjs` | 核官方 SHA-256 并解包 |
| `scripts/build-sealed.mjs` | 路线甲装配 |
| `scripts/build-sea.mjs` | 路线乙装配 |
| `scripts/measure.mjs` | 体积/SHA、冷启动、stdin/stdout、abort、崩溃回收、双架构 |
| `scripts/sign-probe.mjs` | entitlement、hardened runtime 重签、`.app` 嵌套签名 |
| `scripts/clean.mjs` | 残留清理 |
| `dist/` | 全部产物与读数。**被仓库根 `.gitignore` 的 `dist/` 覆盖，不入库** |

## 两处体例说明

- **文件都住 `scripts/`**：根 `eslint.config.js` 只给 `**/scripts/**/*.mjs` 声明 Node 全局
  （`process`/`console`/`Buffer`/…）。放别处会一片 `no-undef`。这是 lint 面的形状，不是语义分类。
- **不在 `packages/pi-lane/src/` 之内**：ADR-018 门 R3 的 pi lane 扫描面
  （`apps/desktop/scripts/assert-isolation-binding.mjs`）只收 `packages/pi-lane/src` 下的 `.ts`。
  本 fixture 的 `child_process`／fs 写属实验宿主，不是 pi lane 生产码，故不进那本登记册；
  生产码零 Node 执行/写原语的判据不受本票影响。

## 与生产形态的已知偏离（不得反推为产品设计）

1. `ready` 在进程启动即发；生产是 host 先 `bootstrap`、sidecar 再 `ready`（ADR-022 六-B.1）。
   冷启动的定义就是「spawn 到可服务」，先等一个入包会把 host 调度混进读数。
2. 授权根经 `init` 包给出，不是 argv、不是环境变量——方向与生产的 stdin bootstrap 一致，
   但字段与状态机都不是六-B 那份契约。
3. provider 用 pi-ai 自带 faux：确定性、不触网、不耗额度。分发实验量的是进程与打包，不是模型。
