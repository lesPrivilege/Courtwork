# PI-SCAN-TIMEOUT-2 · 实现回执（2026-08-09/10，扫描上限同族三枚统一处置＋一枚独立归因）

票面：`docs/architecture/implementation-readiness.md` `PI-SCAN-TIMEOUT-2` 行（`PI-SCAN-TIMEOUT-1`
2026-08-09 验收观察①转出，微票）。判例「否定断言没有正向派生信号」/「异步前置不赌时长」（`docs/
engineering/workflow.md`）同族——三枚 tools.test.ts 用例是**正向侧赌时长对生产边界**（`PI-SCAN-
TIMEOUT-1` 同族），第四枚 product-main.test.ts 用例经本票独立归因证实是**另一种赌时长**（固定
`delayMs` 赌前置到位，而非判据本体对赌 vitest 缺省超时）。

基线 `claude/pi-scan-timeout-2@1c22389`（≡ main@1c22389）。

---

## 一 · 三枚同族用例：判据本体核定与处置（tools.test.ts）

`describe('单次调用上限：扫描与命中是两类，各自出字段与注记', …)` 下，三枚用例与 `PI-SCAN-
TIMEOUT-1` 已处置的 `grep 满 2000 份扫描`（`:459` 附近，本树未漂移地址见现行文件）同一
`describe` 块，共用两份 fixture：

| 用例 | fixture | 生产判据本体 |
|---|---|---|
| `glob 满 200 条命中` | `hits`（250 份） | `MAX_MATCHES = 200`（`tools.ts:32`）真被触发 |
| `grep 满 200 条命中` | `hits`（250 份） | 同上 |
| `glob 满 2000 份扫描` | `scan`（2001 份） | `MAX_FILES_SCANNED = 2000`（`tools.ts:31`）真被触发 |

三枚都是**生产常量真被触发**，缩小 fixture 规模会让 `matched: 200`/`scanned: 2000` 等断言
结构性不可达——同 `PI-SCAN-TIMEOUT-1` 已核定的判据本体核定结论，规模不可缩减。

`PI-SCAN-TIMEOUT-1` 验收独立复核（`ACCEPTANCE.md` §三）已证否「`glob` 无同族问题」的经验宣称：
20 路包级并发负载下 `glob 满 2000 份扫描` 6/20 红、`grep/glob 满 200 条命中` 分别 7/20、5/20 红。
本票在同机复测同形负载（20 路 `vitest run --root . packages/pi-lane/`，见 §三）独立复现：
`glob 满 2000 份扫描` 10/20 红、`grep 满 200 条命中` 16/20 红、`glob 满 200 条命中` 6/20 红——
方向一致（具体命中率数字按既有判例不可跨环境移植），坐实该族确有同族问题。

**处置：三枚统一加显式 `60_000` 超时上界，断言字面量逐字不动。** 取值不独立另开一个数字——
同 `describe` 块内 `grep 满 2000 份扫描` 已用 `60_000` 并经独立验收 PASS（`1f01c79`），三枚
本身负载更轻（250 份小 fixture，或 `glob` 零文件内容读取），复杂度节制下沿用既有量级优于新增
需要单独论证的第二个数字。§三 的峰值实测（`uptime` 1m 峰值 **606.55**，远超 `PI-SCAN-TIMEOUT-1`
登记事故量级 121.79）验证余量：`glob 满 200 条命中` 最长 576ms（>100× 余量）、`grep 满 200 条
命中` 最长 1826ms（>30× 余量）、`glob 满 2000 份扫描` 最长 3660ms（>16× 余量）——三枚均远比
已处置的 `grep 满 2000 份扫描`（60000ms 上界、峰值实测曾达 30103ms）宽松，60000ms 对三枚都是
保守值。

## 二 · 第四枚：独立归因（product-main.test.ts）

票面点名「`同一枚 runtime factory + scripted provider…`」在 20 路负载下两臂皆红（20/20），
且明确「与超时票无因果，须独立归因」。

### 2.1 归因过程

先假设与 tools.test.ts 同族（赌 vitest 缺省 5000ms），但该用例**已带 `120_000ms` 显式超时**
（`}, 120_000);`，改动前既有），若是超时对赌，60/120 秒级上界应早已盖住——与「20/20 稳定红」
矛盾，判定假设不成立，转为实测归因。

临时在 `expect(run.code).toBe(0)` 前插入诊断 `console.error`（诊断结束已撤除，未入交付
diff——见 §五偏离登记），在 20 路包级并发负载下捕获全部 20 次红的失败断言：

```
AssertionError: expected 1 to be +0 // Object.is equality
```

即 `run.code === 1`，不是 `Test timed out`——**多笔失败耗时（3752ms/4619ms/4913ms 等）本身
低于 5000ms**，直接排除「判据本体对赌 vitest 缺省超时」。诊断包转出的真实内容：

```json
{"code":1,"stderr":"","packets":[
  {"type":"ready", ...},
  {"type":"protocol_error","payload":{"code":"state_violation","message":"shutdown 只能在 idle 发出","fatal":true}}
]}
```

对照生产源码 `product-stdio.ts`：`shutdown` 只在 `phase === 'idle'` 时合法
（`:719-720` `rejectFatal('state_violation', 'shutdown 只能在 idle 发出')`），而 `phase` 由
`terminate()`（`:495`）在发出首枚 `type: 'terminal'` 包时**同步**置回 `'idle'`——`terminate()`
只有在 prompt 的真实回合（tool 调用 + 流式文本响应两轮）走完才会被调用。

旧写法 `drive(controlBundle, [bootstrap, prompt, shutdown], { delayMs: 900 })` 对每枚包写入后
固定 `sleep(900ms)` 再发下一枚——**赌「到发 shutdown 时 prompt 的真实回合早已处理完」**，无负载
下 900ms 确实够用（基线单跑 2707-2716ms，且该 2700ms 几乎全由三次固定 sleep 本身构成，
真实工作量占比很小）。负载下 prompt 的真实处理（子进程调度、流式响应）可能仍未结束，host 在
`prompting` 期发 shutdown，被状态机**正确**拒绝并 `exit(1)`——这是「正向前置被赌时长」
（判例「异步前置不赌时长」的直接实例），不是判据本体对赌 vitest 超时，故不适用「显式上界」
处置（该用例已有 `120_000ms` 上界，加大也无法修复——赌注本身与超时值无关）。

### 2.2 处置

改 `drive()` 的等待策略：`shutdown` 前不再固定 `sleep`，改为等派生信号本身——`out` 数组里
出现首枚 `type: 'terminal'` 包（与生产 `terminate()` 的 `phase` 置位时机同源，不是近似）。
新增 `waitForTerminal(out)` 轮询（25ms 间隔），仅在 `options.awaitTerminalBeforeShutdown` 为
真且当前发送的包是 `prompt` 时启用；外层测试既有 `120_000ms` testTimeout 本身即是这条等待的
违例上界，不再叠加第二个数字。`drive()` 的其余调用点（`production sealed CJS：bootstrap → ready
→ shutdown`，仅 bootstrap+shutdown、无 prompt）不触发新分支，零行为变化——`bootstrap` 处理是
同步的，`phase` 在其后立即为 `idle`，从未观察到该路径命中过这一竞态。

`toHaveLength(2)` 等既有断言字面量逐字未改；`waitForTerminal` 不改变任何断言的期望值，只改变
「何时安全发下一枚包」。副作用：基线耗时从 ~2716ms 降到 ~1835ms（不再无谓 sleep 满 900ms×3，
一有信号立即继续）。

## 三 · 负载对照（20 路包级并发，`vitest run --root . packages/pi-lane/`，同 `PI-SCAN-TIMEOUT-1`
先例形状：K 路并发跑满 553 枚）

机器：8 核（`hw.ncpu`/`hw.physicalcpu` 均为 8）。

### 3.1 处置前红证（mutation 基线＝改动前代码，四枚未处置）

| 用例 | 红/总 |
|---|---|
| `glob 满 2000 份扫描` | 10/20 |
| `grep 满 200 条命中` | 16/20 |
| `glob 满 200 条命中` | 6/20 |
| `grep 满 2000 份扫描`（`PI-SCAN-TIMEOUT-1` 已处置，做对照基线） | 0/20（维持绿，未回归） |
| `同一枚 runtime factory + scripted provider…` | 20/20（`state_violation`，非超时） |

`uptime` 1m 峰值 **183.89**。

### 3.2 处置后复测（同批次紧邻，四枚全处置）

| 用例 | 红/总 |
|---|---|
| `glob 满 2000 份扫描` | 0/20 |
| `grep 满 200 条命中` | 0/20 |
| `glob 满 200 条命中` | 0/20 |
| `grep 满 2000 份扫描` | 0/20 |
| `同一枚 runtime factory + scripted provider…` | 0/20 |

`uptime` 1m 峰值 **341.76**（高于 §3.1 红臂，绿不是靠负载回落换来的）。

### 3.3 上界取值峰值实测（临时放宽 `tools.test.ts` 三枚至 `90_000` 探测真实完成耗时，20 路，
`uptime` 1m 峰值 **606.55**——远超 `PI-SCAN-TIMEOUT-1` 登记事故量级 121.79，20/20/20/20 全通过）

| 用例 | 最长实测完成耗时 |
|---|---|
| `glob 满 200 条命中` | 576ms |
| `grep 满 200 条命中` | 1826ms |
| `glob 满 2000 份扫描` | 3660ms |
| `同一枚 runtime factory + scripted provider…`（`awaitTerminalBeforeShutdown` 生效） | 16811ms |

`同一枚 runtime factory…` 用例的 `120_000ms` 既有上界对该峰值仍有 >7× 余量，未改动此数字。

### 3.4 mutation 复红对照（同批次，仅撤 `grep 满 200 条命中` 的 `60_000` 与
`awaitTerminalBeforeShutdown: true`，其余三枚维持处置态；`uptime` 1m 峰值 **297.41**）

| 用例 | 红/总 |
|---|---|
| `glob 满 2000 份扫描`（未撤，维持处置） | 0/20 |
| `grep 满 200 条命中`（**撤** `60_000`） | **13/20 红**（`Test timed out in 5000ms.`） |
| `glob 满 200 条命中`（未撤，维持处置） | 0/20 |
| `grep 满 2000 份扫描`（未撤，维持处置） | 0/20 |
| `同一枚 runtime factory…`（**撤** `awaitTerminalBeforeShutdown`） | **20/20 红**（`expected 1 to be +0`，即 `state_violation`，同 §2.1 复现） |

红证与处置前（§3.1/§2.1）失败信息逐字同形，坐实处置本身是红转绿的因，非批次噪声。撤销后
立即按 §一/§二 的最终值复原（`60_000` 与 `awaitTerminalBeforeShutdown: true`），复原后 diff
与处置态逐字相同（见 §六 diffstat 前后一致）。

**观察项（不入本票处置范围，登记供后继参考）**：§3.2/§3.4 两批次 20 路包级并发下，`pi-lane`
包内另有少量与本票四枚**无关**的文件级红（如 `write-session-golden.test.ts`、`sidecar.test.ts`、
`product-runtime.test.ts`、`product-protocol.test.ts` 各别用例），出现于 `uptime` 峰值 300+
的极端负载（远高于 `PI-SCAN-TIMEOUT-1` 登记事故量级 121.79，属本票为取上界余量主动加压的
产物，非典型 CI 负载）。这些用例不在票面点名范围，本票不处置、不扩票。

## 四 · 既有用例回归

- `tools.test.ts`：`it(` 字面量计数改前改后逐字相同（**67**）。
- 根 `pnpm test`：**173 files / 2135 tests passed**，与参考值 2135 逐数吻合。
- `pi-lane` 包级：**17 files / 553 tests passed**，与参考值 553 逐数吻合。
- 净增/净减 0，零回归。

## 五 · 处置范围与偏离

- **只动两份测试文件**：`packages/pi-lane/src/tools.test.ts`（三枚 `it(...)` 改写为三参数形式
  加 `60_000`、各附判据本体核定注释）、`packages/pi-lane/src/product-main.test.ts`
  （`drive()` 新增 `waitForTerminal` 与 `awaitTerminalBeforeShutdown` 选项、目标用例调用点
  加该选项）。**零生产源码改动**（`tools.ts`、`product-stdio.ts`、`product-runtime.ts` 逐字
  未动）。
- 断言字面量三处（`tools.test.ts` 三枚）与一处（`product-main.test.ts` 目标用例）**逐字未改**；
  `drive()` 的既有调用点（无 `prompt` 包的两枚）零行为变化。
- 诊断过程中临时插入的 `console.error` 与临时探测脚本（`scripts/tmp-repro-scan-timeout-2.mjs`）
  均已在诊断完成后撤除，未出现在交付 diff 内（`git status --short` 仅两份测试文件）。
- 未发现需要 `[需架构拍板]` 的项——本票不触及生产代码、schema 或跨层语义。

## 六 · 全仓门禁

| 门 | 命令 | 读数 |
|---|---|---|
| 依赖安装 | `pnpm install` | `+1157` 包，`Done` |
| sidecar 前置 | `pnpm --filter @courtwork/pi-lane run build:product-sidecar` | 成功（复用主仓缓存归档，脚本自身三重 SHA256 校验：`ef28d8fa…fa953`(arm64)/`b8da981b…5cb81`(x64) 逐份核对通过；`bundle.bytes=547893`，`sha256=951acf8e…74bc6c`，`reproducible:true`） |
| sidecar 前置 | `pnpm --filter @courtwork/pi-lane run build:headless-sidecar` | 成功，`bytes=555314`，`sha256=061248fa…8a9bea`，`reproducible:true` |
| 构建 | `pnpm -r build` | **EXIT 0**（15/15 workspace projects） |
| lint | `pnpm lint`（`eslint .`） | **EXIT 0**，零诊断 |
| 根测试 | `pnpm test`（`vitest run`） | **EXIT 0**，`173 files / 2135 tests passed`（36.01s） |
| 包级测试 | `vitest run --root . packages/pi-lane/` | **EXIT 0**，`17 files / 553 tests passed`（3.95s） |

退出码一律以脚本内 `echo "EXIT:$?"` 单独读取，未经管道吃码；均在独立后台进程运行、经
Monitor 等待完成后读取，非轮询估计。

按票面不跑 Playwright。

## 七 · 移交

- 报交验点即停：本会话不自我验收、不合并 `main`、不 `push`。
- 建议下一位（独立验收）复核路径：
  1. 三枚同族用例：重跑 §三 的 20 路包级并发对照（自身环境的具体命中率数字不保证可移植，
     判据是「同批次紧邻配对下红/绿同时可产出」）；核对 `60_000` 与已处置的 `grep 满 2000 份
     扫描` 同量级的复用理由是否认同。
  2. 第四枚独立归因：核对 §2.1 的诊断包内容（`state_violation`/`shutdown 只能在 idle 发出`）
     与 `product-stdio.ts:719-720`/`:495` 的状态机代码是否确实对应；核对 `waitForTerminal`
     的等待条件（首枚 `type: 'terminal'` 包）是否确系「安全发 shutdown」的正确充分信号，
     而非又一次近似的赌时长。
  3. §三末段登记的观察项（`write-session-golden.test.ts` 等，极端负载下的少量无关红）是否需要
     转出新票——本票判断不需要（负载量级远超典型 CI 条件，且与本票四枚判据无关联）。

---
