# PI-FETCH-TIMEOUT-1 · 实现回执（2026-08-10，下载超时与有界重试）

票面：`docs/architecture/implementation-readiness.md` `PI-FETCH-TIMEOUT-1` 行（2026-08-09
PI-SCAN-TIMEOUT-1 验收观察③转出，微票）。`build-product-sidecar.mjs` 裸 `fetch` 无超时无重试——
网络失速即静默无限挂起（验收环境实测两次各 14/16 分钟）。加显式超时＋有界重试＋失败具名报错；
SHA 校验链不变。

范围锚点：`packages/pi-lane/scripts/build-product-sidecar.mjs` 的 `download()`（票面坐标 `:315`
的裸 `fetch`；现树同坐标已漂移到重构前的 `:315` 附近，语义定位见下）。headless 构建脚本
`build-headless-sidecar.mjs` 现读复查：它只复用 `buildDeterministicBundle`（纯 esbuild，零
网络 I/O），不含任何 `fetch(` 调用，非同族缺陷，未处置。

基线 `claude/pi-fetch-timeout-1@1c22389`（≡ `main@1c22389`）。

---

## 一 · 处置形态

新增三枚冻结常量（`build-product-sidecar.mjs`）：

```js
export const DOWNLOAD_TIMEOUT_MS = 60_000;
export const MAX_DOWNLOAD_ATTEMPTS = 3;
export const DOWNLOAD_RETRY_DELAY_MS = 5_000;
```

取值依据（2026-08-09 本机实测，`curl -w time_total`，各 3 次独立探测，`nodejs.org` 官方 CDN，
均为健康网络下的成功传输）：

| 文件 | 字节数 | 三次实测耗时 |
|---|---|---|
| `node-v22.23.1-darwin-arm64.tar.gz` | 50,067,502 | 7.522s / 7.334s / 7.441s |
| `node-v22.23.1-darwin-x64.tar.gz` | 51,245,086 | 7.490s / 7.198s / 6.736s |
| `SHASUMS256.txt` | 3,777 | 0.644s |

最大单文件实测 ≈7.5s。`DOWNLOAD_TIMEOUT_MS` 取 60s（≈8× 安全系数）：既远高于健康下载的真实
耗时（60s 内传完 50MB 换算最低可容忍吞吐约 833 KB/s，容忍明显变慢但仍在工作的网络），又远
低于验收环境登记的 14/16 分钟静默挂起——任何真实失速都会在分钟级内转成具名失败，不再无限
等待。不采用「无负载基线 × 极大倍数」的写法：本场景不存在 `PI-SCAN-TIMEOUT-1` 那种随负载
非线性走高的真实工作量，健康值本身是稳定读数，8× 已是充分安全系数。

有界重试：`MAX_DOWNLOAD_ATTEMPTS = 3`（小而显式，兜住瞬时丢包/路由抖动，不掩盖持续性故障）；
`DOWNLOAD_RETRY_DELAY_MS = 5_000`（固定间隔，不做指数退避——构建脚本非高频客户端，该复杂度
非本质复杂度）。全失速下最坏总时长 `3×60_000 + 2×5_000 = 190_000ms`（≈3.2 分钟），显式有界，
且远小于登记事故的 14 分钟下限（已写成机器断言，见 §三 第一枚测试）。

新增导出函数 `fetchWithTimeoutRetry(url, options)`：连不上、连上不回话（失速）、HTTP 层非
2xx、**body 流式读取途中失速**，一律按同一套有界重试处置；耗尽后抛出具名错误——含 URL 与
已试次数，用 `{ cause }` 保留原始错误（不吞）。`download()` 内的调用点改为：

```js
async function download(name) {
  const url = new URL(name, NODE_DIST_BASE);
  if (url.origin !== 'https://nodejs.org' || !url.pathname.startsWith('/dist/')) {
    throw new Error(`拒绝非官方来源：${url.href}`);
  }
  const { body } = await fetchWithTimeoutRetry(url);
  return Buffer.from(body);
}
```

来源 origin 白名单（拒绝非 `nodejs.org` `/dist/` 前缀）与下载后的 SHA/`SHASUMS256.txt`/`tar`
三重校验链（`archiveProblems`/`runtimeProblems`/`inspectArchive`）**零改动**。

### 一枚在实现过程中发现并修正的真实缺陷（非票面既有认知，属本轮新发现）

首版实现只把 `fetch()` 本身包进 `AbortSignal.timeout` 保护，`response.arrayBuffer()`（body 流式
读取）留在保护范围外——这在**真实网络全量下载复测**（见 §四）时当场复现：某次归档下载在
63s 后抛出**未经包装**的裸 `The operation was aborted due to timeout`，而非预期的「下载失败
（已尝试 N 次）…」具名错误。根因：真实归档是 50MB 量级，多数传输时间花在 body 流式阶段而非
header 阶段；`AbortSignal.timeout` 创建的同一枚 signal 同时绑定 header 与 body 两个阶段，
若只在 `fetch()` 那一步的 try/catch 内，body 阶段的中止会绕过重试与具名包装、直接冒泡。

处置：把 `readBody(response)`（默认 `(response) => response.arrayBuffer()`）挪进与 `fetch()`
同一枚 try 块，两阶段共享同一次尝试的保护与重试计数。修正后同一枚全量下载复测通过（§四）。
`readBody` 开放为可选参数只为定向测试注入假实现，生产路径恒用默认值。

---

## 二 · 红绿证

### 2.1 真实本地 TCP 黑洞（对旧形态与新形态的直接对照）

`HTTPS_PROXY`/`NODE_USE_ENV_PROXY=1` 在本机 Node v25.9.0 的全局 `fetch`（undici）上**实测
不生效**（三次探测，代理指向不可达端口 `127.0.0.1:1`，请求均直接绕过代理成功完成）——票面建议
的黑洞代理路径在本环境不可用，遂改用**本机真实 TCP 黑洞**（`net.createServer` 接受连接后故意
零响应、不关闭）：与代理注入相比，这是更直接的「连得上但永不回话」真失速，且不依赖环境是否
支持代理协议。

**对照旧形态（裸 `fetch`，无 signal）：**

```
node -e '... fetch("http://127.0.0.1:<blackhole-port>/x") ...' &
PID=$!; sleep 8; kill -0 $PID  # 仍存活
```

10 秒后进程仍存活（须手动 `kill -9`）——确认旧形态在真实失速下无限挂起，非猜测。（本机无
`timeout`/`gtimeout` 二进制，改用「后台起 + sleep N + `kill -0` 探活 + 必要时 `kill -9`」
达到等价截断效果，偏离见 §六。）

**对照新形态（`fetchWithTimeoutRetry`）：** 同一黑洞、`timeoutMs=200, maxAttempts=2,
retryDelayMs=50`，465-495ms 内具名失败（`已尝试 2 次`，含 URL）——已固化为
`build-product-sidecar.test.mjs` 的永久回归用例（`node:test` 自身再包一层 `{ timeout: 5000 }`
兜底，杜绝该用例自身在未来回归下真无限挂起）。

### 2.2 变异：撤回超时参数复挂（同装置）

对同一枚黑洞测试，手工把 `fetch(url, { signal: AbortSignal.timeout(timeoutMs) })` 改成
`fetch(url, {})`（去掉 signal，等价于回退到旧形态），用
`node --test --test-name-pattern="真实本地 TCP 黑洞" --test-timeout=200000` 跑，同样用
「后台起 + sleep 10s + 探活」截断：**10 秒后进程仍存活**（`node:test` 自身的 `{ timeout: 5000 }`
在 5006ms 处标记该用例 `✖`失败，但底层进程未随之退出，仍需手动 `kill -9`）——命中校验：
mutation 前（撤除 signal）后（恢复 signal）在同一装置上分别复现「挂起」与「465-495ms 内
具名失败」，红绿双证俱全。复测后立即 `diff` 确认文件已字节级还原到 mutation 前状态，且
全 18 枚用例复跑绿（见 §三）。

### 2.3 body 流式阶段的等价反例（针对本轮自查发现的缺陷，见一节末段）

新增回归用例：mock `fetchImpl` 在 header 阶段立即「成功」返回，但 `response.arrayBuffer()`
挂起直至同一枚 `signal` 触发中止（忠实复刻 undici 语义：body 流绑定同一 `AbortSignal`）。
对**修正前**的实现（`fetchWithTimeoutRetry` 只在 `fetch()` 那步的 try 内、`readBody` 挪到
try 外）跑该用例：`AssertionError: Missing expected rejection`（promise 意外 resolve，因为
修正前的一版 mutation 把 body 错误吞掉返回 `undefined`）——证明该用例对这一类缺陷有区分力，
非「零区分力的对照」。对**修正后**代码：18/18 全绿。

---

## 三 · 单元测试（`node --test packages/pi-lane/scripts/build-product-sidecar.test.mjs`）

新增 10 枚定向用例（原有 8 枚零改动，逐字保留）：

1. 冻结值与「最坏总时长 190s ＜ 14 分钟事故下限」的机器断言。
2. 首次即成功——零重试、零等待，body 与 fetch 落在同一次尝试内读出。
3. 前 N-1 次失败、最后一次成功——重试计数与延时逐次正确（`sleepImpl` 记录逐次调用值）。
4. 耗尽次数抛具名错误——含 URL、已试次数，`error.cause` 恒等于触发该次抛出的原始 `cause`
   （不吞，且满足 ESLint 10 新规则 `preserve-caught-error`，见 §五）。
5. HTTP 非 2xx 视为可重试失败，耗尽后具名（`HTTP 503`）。
6. 真实 `AbortSignal` 到期即可重试超时——信号驱动而非墙钟猜测（80ms 超时，数百毫秒内失败）。
7. **body 流式读取途中失速的回归锁**（§2.3 的反例装置，作为永久用例保留）。
8. 真实本地 TCP 黑洞（§2.1 的新形态永久回归用例）。

全量：**18/18 通过**，`node --test` 独立跑三轮（首次实现后、`preserve-caught-error` 修正后、
lint 修正后）均 18/18。

---

## 四 · 正常路径零回归（真实全量下载 + 缓存复用两态均已实测，未 blocked）

本环境网络可达（`curl` 探测 `nodejs.org` 通），未走 §PI-SCAN-TIMEOUT-1 §建议的「缓存预播」
退路，直接做了两轮真实全量：

**第一轮（清缓存后首次真实下载，暴露 §一末段的 body 阶段缺陷，修正前代码）：**

```
rm -rf packages/pi-lane/dist
node packages/pi-lane/scripts/build-product-sidecar.mjs
```

63s 后失败，`snapshot.reason = "The operation was aborted due to timeout"`（裸消息，无
「已尝试 N 次」包装）——即 §一末段登记的缺陷，触发修正。

**第二轮（修正后代码，清缓存重跑）：**

```
rm -rf packages/pi-lane/dist
node packages/pi-lane/scripts/build-product-sidecar.mjs
```

39s 内 **EXIT=0**，两枚 archive 均 `"origin": "downloaded"`，两枚 runtime 身份、SHA、Mach-O
判据全过，`versionProbe` 本机架构（arm64）实跑 `v22.23.1`；`bundle`：

```
bytes = 547893
sha256 = 951acf8ed3b541988041cd4b1ed80402c02c643d7d95f4cbce0b25a3ff74bc6c
```

与在册基线（`product 547,893 B / 951acf8e…`）**逐字节一致**；`snapshot.action = "created"`。

**第三轮（同一份 snapshot 上原地复跑，验 `reused` 分支零回归）：**

```
node packages/pi-lane/scripts/build-product-sidecar.mjs
```

EXIT=0，两枚 archive 均 `"origin": "reused"`，`snapshot.action = "reused-identical"`——
`ensureArchive`/`snapshotReuseProblems` 的 byte-identical 复用判据在改动后路径下仍成立，
`fetchWithTimeoutRetry` 未被触发（本地已有 archive 时 `ensureArchive` 走本地校验分支，不再
下载），零回归。

外网轮**未 blocked**：三轮均为真实网络，无需登记降级路径。

---

## 五 · 门禁实测

| 门 | 命令 | 结果 |
|---|---|---|
| 依赖安装 | `pnpm install` | `+1157` 包，成功（新 worktree 首次安装） |
| 构建 | `pnpm -r build` | **EXIT 0**（15/15 workspace projects，含 `apps/desktop` `tsc -b && vite build`） |
| lint | `pnpm lint`（`eslint .`） | **EXIT 0**，零诊断（过程中修正两类：`AbortSignal` 缺全局声明——`eslint.config.js` 的 `**/scripts/**/*.mjs` 全局表补一行；ESLint 10 新规则 `preserve-caught-error` 要求 `cause` 字面即取自触发抛出的那个 catch 参数，去掉中转变量 `lastError` 后过） |
| 根测试 | `pnpm test`（`vitest run`） | **EXIT 0**，`173 files / 2135 tests passed`（`24.74s`，独立跑；首次与 pi-lane 包测并发跑时出现 21 枚超时假红，全部是 `Test timed out in 5000ms` 且与本票代码零关联——`packages/demo-runtime` S3 集成测试等，串行重跑后清零，判为 CPU 争用，非回归；证据见 `/tmp/pft-roottest.log` vs `/tmp/pft-roottest-seq.log`） |
| 包测 | `pnpm --filter @courtwork/pi-lane test` | **EXIT 0**，`17 files / 553 tests passed`（`4.60s`，独立跑；同上，首次并发跑出现 2 枚超时假红，`product-protocol.test.ts`/`product-main.test.ts`，串行重跑清零） |
| 定向门 | `node --test packages/pi-lane/scripts/build-product-sidecar.test.mjs` | **EXIT 0**，`18/18`（不在 `pnpm test`/`pnpm -r build` 路径上，独立命令） |

退出码一律单独 `echo $?` 读取，未经管道吃码。

不跑 Playwright（零 desktop 面，票面已注明）。

---

## 六 · 处置范围与偏离

- **只动三处**：`packages/pi-lane/scripts/build-product-sidecar.mjs`（新增常量与
  `fetchWithTimeoutRetry`，`download()` 改调用）、`packages/pi-lane/scripts/build-product-sidecar.test.mjs`
  （新增 10 枚定向用例，原 8 枚逐字未改）、`eslint.config.js`（补 `AbortSignal` 全局声明一行，
  与既有 `AbortController` 同批次登记项同源，非新架构面）。
- SHA/`SHASUMS256.txt`/`tar` 三重校验链、stage→rename 落名协议、`SNAPSHOT_INVENTORY` 闭集、
  冻结 `TARGETS` 表**逐字未改**。
- headless 构建脚本 `build-headless-sidecar.mjs` 现读复查后确认零网络 I/O，非同族缺陷，
  未处置（票面「若同病同批处理并登记」的登记项）。
- **偏离一**：票面建议的红绿证装置是「本地黑洞代理（`HTTPS_PROXY` 指向不回包端口）」；本机
  Node v25.9.0 全局 `fetch` 实测不读 `HTTPS_PROXY`/`NODE_USE_ENV_PROXY` 环境变量（§2.1 三次
  探测复现），遂改用**本机真实 TCP 黑洞**（`net.createServer` 接受连接后零响应）——两者都是
  「连得上但永不回话」的真失速，后者更直接、不依赖代理协议支持，且已固化为永久回归测试。
- **偏离二**：票面建议用 `timeout` 命令截断旧形态复现；本机无 `timeout`/`gtimeout` 二进制，
  改用「后台起进程 + `sleep N` + `kill -0` 探活 + 必要时 `kill -9`」达到等价截断与命中校验
  （§2.1/§2.2）。
- **一枚超出票面字面、但仍在「显式超时＋有界重试」范围内的自查修正**：body 流式读取阶段的
  保护缺口（§一末段），发现于本轮真实全量下载复测，非返工——首版实现即因这次真实网络验证
  而暴露，随即修正并补永久回归用例（§2.3），未留一次已知的部分实现。
- 未发现需要 `[需架构拍板]` 的项——本票不触及生产 schema、跨层接口或验收标准语义，只是
  构建脚本内部的传输可靠性处置。

---

## 七 · 移交

- 报交验点即停：本会话不自我验收、不合并 `main`、不 `push`。
- 建议独立验收复核路径：①在其自身环境重跑 §2.1/§2.2 的黑洞装置对照（若其环境 `HTTPS_PROXY`
  对全局 `fetch` 生效，可选择改用票面原始代理路径复核，两者应给出一致结论）；②核对 §一
  「取值依据」是否认同 8× 安全系数与 190s 最坏总时长；③复核 §四两轮真实下载的 SHA/字节数
  与在册基线逐位相等；④如认为 60s/3 次/5s 的具体取值需要调整，可在验收报告提出替代取值
  连同同等量级的实测支持。
