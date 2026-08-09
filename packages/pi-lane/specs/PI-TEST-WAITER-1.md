# PI-TEST-WAITER-1 · 实现回执（2026-08-09，拔除裸墙钟等待器，改派生信号）

票面：`docs/architecture/implementation-readiness.md` `PI-TEST-WAITER-1` 行；判例「异步前置不赌时长／对照实验须能同时产出红与绿」（`docs/engineering/workflow.md`）。
两处独立既有观察：`packages/pi-lane/specs/PI-UNKNOWN-TOOL-1.md:163-171`（实现者，`load average 6.79`）与
`packages/pi-lane/ACCEPTANCE.md:3913-3921`（验收者，load 峰值 `7.50`）——同一枚裸墙钟塌红。

基线 `claude/pi-test-waiter-1@f96937c`（≡ main@f96937c）。本单 tip **待提交后回填**。

范围锚点：`packages/pi-lane/src/workspace-write-env.test.ts`。票面行号（`:705`/`:724`/`:755`/`:774`/`:926`）
系票面撰写时刻的坐标，现树上因文件早段无关内容漂移 +4 行（本回执改用符号名／函数体定位，不复用票面行号）。

---

## 一 · 改法

`describe('串行化真源', …)` 内的 `settle = () => new Promise((resolve) => setTimeout(resolve, 20))`
是裸墙钟赌注：赌 20ms 够上游 mutation queue／binder 把第一条 `enter` 记进 `port.trace`（三处调用点，见下）。
在系统负载升高、Node 事件循环被同机其他 CPU 密集进程抢占的场景下，20ms 内实际只推进不到期望的轨迹长度，
断言随即塌红——这正是 `PI-UNKNOWN-TOOL-1` 与其验收者各自独立撞见的同一枚 flake。

处置：**只改测试文件的等待器与其调用点**，不碰 `workspace-write-env.ts`（被测语义）、不改任何
`expect(...)` 的期望值、不加依赖。

`RecordingPort`（本文件内的测试替身，非生产代码）新增 `waitForTraceLength(length, timeoutMs = 3000)`：

- `write()` 在同步 `trace.push('enter:…')` / `trace.push('exit:…')` 之后立即调用内部 `notifyWaiters()`——
  事件驱动，不是轮询；一旦 `trace.length` 真达到目标长度，等待立刻解除，不依赖任何墙钟窗口是否「恰好够用」。
- 上界只兜底「永远不会发生」的场景（默认 3000ms，小于 vitest 默认单测 5000ms 超时，超时时先由本等待器
  报出诊断信息，而不是被 vitest 的通用超时截断）；超时错误信息里带上**当时的实际 `trace`**
  （`waitForTraceLength(3) 在 3000ms 内未达标；实际 trace=[...]`），供归因用，不是把赌注换个地方藏起来。

三处调用点全部替换：

| 用例（票面旧坐标） | 新等待条件 | 依据 |
|---|---|---|
| 「characterization：共享同一 env 对象时，上游 mutation queue 按 canonical path 串行」（旧 `:711`/`:764`) | `waitForTraceLength(1)` | 第二件被队列挡在门外，`trace` 终态锁定在 `['enter:a.md']`，不会再长 |
| 「invocation-scoped env 不共享该 queue……」（旧 `:750`） | `waitForTraceLength(3)` | 第一件卡在 port 里，第二件已整趟跑完，`trace` 终态 3 项 |
| 「经 binder 的同路径并发调用同样不被串起来……」（旧 `:781`，即票面 `:764` 塌红实例本体） | `waitForTraceLength(3)` | 同上一栏终态 |

三处后续的 `expect(port.trace).toEqual([...])` 断言字面量**逐字未改**——等待器只决定「何时查」，不决定
「查到什么才算过」，闭合的仍是原判据。

## 二 · `:926`（现坐标 `:971`）核定：有意的延迟注入，不改

`同一回合两枚 write：顺序执行、两枚独立 operation、无交错` 用例里，`recordingPort` 的 handler 带
`await new Promise((resolve) => setTimeout(resolve, 5))`。核对角色：

- 它**不是**「等待结算再查状态」——该用例唯一的 `expect(port.trace).toEqual([...])` 断言挂在
  `await agent.prompt('写两份')` **整趟 resolve 之后**的终态，不依赖这 5ms 是否「恰好够用」。
- 它是**有意的延迟注入**：把 port 造慢，撑大两枚 `write` 之间可能出现交错的窗口，让「若上游
  `toolExecution: 'sequential'` 真的没有严格顺序执行」这件事有机会被 `enter/enter` 相邻的轨迹逮到。
  顺序保证来自 pi-agent-core 的 `sequential` 执行语义（结构性），不来自这 5ms 的具体取值——改成 0
  或 500 结论不变。

核定结论（票面二选一）：**登记为有意的延迟注入，随本票不改**，已在该用例上方补一段中文注释固定这一核定，
避免下一位读者把它误判为同族赌注再次「顺手改掉」。

## 三 · 退出证据

### 3.1 无负载对照（改动前置，单跑）

```
npx vitest run --root . packages/pi-lane/src/workspace-write-env.test.ts
```
`Test Files 1 passed (1)` / `Tests 100 passed (100)`，`340ms`。

### 3.2 注入负载下必绿（两种负载形态，均针对**改后**文件）

**负载形态 A：8 枚 `yes > /dev/null &` 纯 CPU 自旋（8 核机）。**
`uptime` 1-分钟读数区间 **16.71 → 34.56**（10 轮期间实测，逐轮登记于运行日志）。
顺序单文件跑 10 轮：

| 轮次 | load average(1m) | 结果 |
|---|---|---|
| 1 | 16.71 | 100/100 passed |
| 2 | 16.71 | 100/100 passed |
| 3 | 18.41 | 100/100 passed |
| 4 | 18.41 | 100/100 passed |
| 5 | 18.41 | 100/100 passed |
| 6 | 19.34 | 100/100 passed |
| 7 | 19.34 | 100/100 passed |
| 8 | 19.34 | 100/100 passed |
| 9 | 22.92 | 100/100 passed |
| 10 | 22.92 | 100/100 passed |

**10/10 通过（`TOTAL PASS=10 FAIL=0`）**，退出码逐轮以 `cmd > log 2>&1; echo $?` 读取，未经管道吃码。

**负载形态 B：同机真跑 `cargo build`（`apps/desktop/src-tauri`，clean build，实际编译中，非缓存命中）。**
`uptime` 1-分钟读数区间 **17.01 → 17.73**。顺序单文件跑 10 轮，**10/10 通过**（同表结构，`TOTAL PASS=10 FAIL=0`）。

两种负载形态下，票面点名的两枚原塌红用例（「characterization：共享同一 env 对象时……」与
「经 binder 的同路径并发调用同样不被串起来……」）均含在每轮 100/100 里，逐轮通过。

### 3.3 mutation（负决对照，须在同一注入负载下复红）

先按票面把三处 `waitForTraceLength(1|3)` 撤回 `setTimeout(resolve, 20)`，其余代码不动。

**首次尝试（形态 A/B 同款负载，顺序单文件跑 10 轮）：0/10 复红。** 如实登记：这说明「单文件顺序执行 + 外部无关
进程抢 CPU」这种负载形状，对这枚 flake **不构成有效负载注入**——`yes` 自旋与单条 `cargo build`
虽然把 `uptime` 读数推到远高于票面登记的 6.79/7.50，但没有真正压缩到 Node 自身事件循环在两次
`setTimeout` 触发之间能拿到的调度窗口。按判例「不复红说明负载注入无效，须先修注入再判」，改用第二种负载形状。

**第二次尝试（20 路并发自竞争：同一测试文件的 20 个 vitest 进程在 8 核机上同时跑，互相抢占）：**

- 突变版（`setTimeout(20)`）：**2/20 复红**（`run5`、`run10`），报错分别是
  `expected [] to deeply equal ['enter:a.md', 'enter:a.md', …]`（用例「invocation-scoped env 不共享该 queue……」）
  与 `expected [] to deeply equal ['enter:a.md']`（用例「characterization：共享同一 env 对象时……」）——
  两枚失败都指向同一根因：20ms 窗口内，`trace` 一条都没来得及推进。
- 同批、同条件（20 路并发）跑**改后（`waitForTraceLength`）版本：20/20 通过，零复红**。

两臂在完全相同的并发条件下对照（唯一变量＝等待器实现），**红/绿同时产出**，满足判例「对照实验须能同时产出红与绿」。
如实登记：负载注入的有效形状是「同文件多进程自竞争」而非「无关外部进程占 CPU」——本票据此归档，供后续同族
测试参考负载形状选择，不再需要额外裁定。

### 3.4 既有用例回归

- `packages/pi-lane/src/workspace-write-env.test.ts` 单文件：改前后测试数量逐字相同，均为 **40 枚 `it(` 字面量
  ＋ `it.each` 展开后合计 100 枚测试**（`grep -cE '^\s*it\('` 改前改后皆 40）。
- `packages/pi-lane` 包级 `npx vitest run --root . packages/pi-lane/src/*.test.ts`：`git stash` 还原改动前
  跑一遍取基线 **17 files / 553 tests passed**；`git stash pop` 复原改动后再跑一遍同为
  **17 files / 553 tests passed**。**净增 0／净减 0**，零回归。（票面写「约 540 枚」是较早时点的引用数，
  现树因其间新增文件已增长到 553，与本单改动无关，已用改动前/后同树对照锁定净变化为零。）

## 四 · 全仓门禁

| 门 | 命令 | 读数 |
|---|---|---|
| 依赖安装 | `pnpm install` | `+1157` 包，`Done` |
| sidecar 前置 | `pnpm --filter @courtwork/pi-lane build:product-sidecar` | 成功，`bundle.bytes=547893` |
| sidecar 前置 | `pnpm --filter @courtwork/pi-lane build:headless-sidecar` | 成功，`bytes=555314` |
| 构建 | `pnpm -r build` | **EXIT 0**（14/15 workspace projects；`apps/desktop` 含 `tsc -b && vite build`） |
| lint | `pnpm lint`（`eslint .`） | **EXIT 0**，零输出 |
| 根测试 | `pnpm test`（`vitest run`） | **EXIT 0**，`170 files / 1941 tests passed` |

退出码一律以 `cmd > log 2>&1; echo $?` 读取，未经管道吃码。desktop 行为零变更，未跑 Playwright（票面范围声明一致）。

## 五 · 偏离清单

1. **未采用轮询式等待器**，改用事件驱动（`write()` 内同步 `notifyWaiters()`）——比票面暗示的「轮询直到达标」
   更贴近「派生信号」的本意：条件真正成立的那一刻立即解除等待，不存在轮询间隔带来的次级墙钟依赖。
2. **`waitForTraceLength` 挂在测试替身 `RecordingPort` 上**，而非写一个独立的模块级 helper 函数——判断依据是
   它需要访问 `recordingPort()` 闭包内的 `trace`/`waiters` 私有状态，且该替身本身即整份测试文件的一部分、
   不进生产，符合「只改该测试文件的等待器与其调用点」的边界表述（等待器的载体从裸函数变成 port 方法，
   调用点从 `settle()` 变成 `port.waitForTraceLength(n)`，本体行为不变）。
3. **`:926`（现 `:971`）核定为「有意延迟注入，不改」**，并新增六行中文注释固定该核定，供后续读者不再重新
   核对。属票面「二选一，不得悬置」条款下的显式选择，非默认沉默保留。
4. **mutation 首轮负载注入无效（0/10）之事如实登记而非隐去**，改用 20 路并发自竞争负载后才拿到有效对照
   （突变 2/20 红／修复 20/20 绿）。此举本身即遵循「不复红说明负载注入无效，须先修注入再判」判例，非结论
   本身的偏离，登记于此供归档留痕。

## 六 ·〔需架构拍板〕

无。本单未触及契约、schema 或跨层语义。

---

## 七 · 移交

- tip SHA：见提交历史（本文件与代码改动同批提交，`git log -1` 可查）。
- 报交验点即停：本会话不自我验收、不合并 `main`、不 `push`。
- 下一位（独立验收）建议复核路径：①在其自身环境重跑 §3.3 的 20 路并发对照，确认「突变红 / 修复绿」在其
  机器上同样可复现（负载有效形状可能随核数/OS 调度器而异，不保证 2/20 这一具体比例可移植，但「修复版
  在同等并发下零复红」应可复现）；②抽查 `waitForTraceLength` 的超时分支是否真的会在超时时携带诊断
  `trace`（可临时把默认超时改极小值人工触发一次验证报错文案，验后复原）。
