# PI-TIMEOUT-SWEEP-1 · 实现回执（2026-08-10，`packages/pi-lane` 超时同族普查）

票面：`docs/architecture/implementation-readiness.md` `PI-TIMEOUT-SWEEP-1` 行（2026-08-10
`PI-SCAN-TIMEOUT-2` 验收建议③立行，微票）。判例「异步前置不赌时长」／「否定断言没有正向派生
信号」（`docs/engineering/workflow.md`）同族背景；范式承袭 `PI-SCAN-TIMEOUT-1`/`PI-SCAN-
TIMEOUT-2` 已确立的处置形态（保规模＋显式上界，规模不可缩减）。

基线 `claude/pi-timeout-sweep-1@89c266a`（≡ main@89c266a）。

---

## 一 · 判据本体核定（处置前必答）

票面要求「静态枚举『无显式 timeout 且判据本体为重计算或真 I/O』的用例」。全包扫描发现该族
在 `packages/pi-lane` 内有**两种结构形状**，判据本体不同，扫描面因此分两条：

### 形状 A：`it()` 体内内联 `.repeat(MAX_*)` / `Array.from({ length: MAX_* })`

用生产边界常量（`MAX_TEXT_BYTES`=131072、`MAX_PACKET_BYTES`=1048576、`MAX_DELTA_BYTES`=
65536、`MAX_LIST_ENTRIES`=2000、`MAX_WORKSPACE_CONTENT_BYTES`=131072 等）驱动的真实字符串/
数组构造，随即整段过 `JSON.stringify`／编码／解码——真实计算量对赌 vitest 5000ms 缺省超时。
全包 grep `\.repeat\(MAX_|length:\s*MAX_` 命中 13 处 `it()`（`product-protocol.test.ts` 11
处、`workspace-write-env.test.ts` 2 处），逐条读过判定：全部 13 处的判据本体都是「生产边界
常量真被驱动构造」，缩小即改写生产边界、判据随之消失，规模不可缩减——与 `PI-SCAN-TIMEOUT-1`
已核定的 `raw cap` 判据本体同族。

### 形状 B：共享 `beforeAll` 建真实磁盘文件树，`it()` 只引用 fixture 变量

`tools.test.ts` 的 `单次调用上限：扫描与命中是两类，各自出字段与注记` describe：`beforeAll`
用 `createFiles(directory, 250, …)`／`createFiles(directory, 2001, …)` 真实写 N 份磁盘文件
（`scan`/`hits` 两枚 fixture），`it()` 只以变量名引用。此形状已由 `PI-SCAN-TIMEOUT-1`（`grep
满 2000 份扫描`）与 `PI-SCAN-TIMEOUT-2`（`glob 满 2000 份扫描`、`grep/glob 满 200 条命中`）
四枚全部处置完毕（`60_000` 上界），本票不重复处置，只复裁其中最重成员的上界取值（见 §四）。

### `sidecar.test.ts`：结构性排除在两种形状之外

`sidecar.test.ts` 全文件 10 枚 `it()` 均无显式 timeout，且判据本体是真实 HTTP 回环往返（真
`listen`＋真 `fetch`）——票面边界②明确排除，须独立归因、不与超时族合并处置，见 §五。

---

## 二 · 负载形态冻结（票面边界①）

沿用 `PI-SCAN-TIMEOUT-1/2` 已证有效的形状：**K 路 `vitest run --root . packages/pi-lane/`
包级并发**（每路独立跑满全套 `packages/pi-lane` 测试），以 `uptime` 1m 读数轮询记录峰值。

本票在本机（8 核，`hw.ncpu`/`hw.physicalcpu` 均为 8）多路复测，**冻结 K=20** 作为红绿配对的
主对照臂——该量级下红信号干净、无环境级噪声（K=23/28 时已观察到与本票判据无关的轻量用例
零星陪跑变红，K=40 时 `uptime` 峰值 794.09 已致 vitest 自身 `Failed to start forks worker`，
判定为环境级噪声、不构成有效负载形态，详见 §四与 §六附注）：

| K | `uptime` 1m 峰值 | 判定 |
|---|---|---|
| 20 | 191.42（before）／191.33（after，见 §八） | 冻结对照臂，干净 |
| 23 | 413.56 | 探测臂（辅助取值，非主对照） |
| 28 | 637.16 | 探测臂，已现轻量用例陪跑噪声 |
| 40 | 794.09 | 无效（worker 起不来） |
| 60（`tools.test.ts` 自争用，非包级） | 106.91 | `PI-SCAN-TIMEOUT-1` 原始定标同源，见 §四 |

---

## 三 · 逐枚处置表（形状 A，13 处）

判据本体核定结论对全部 13 处一致：规模不可缩减，处置为**加显式 `60_000` 超时上界**，不新开
数字（复杂度节制：沿用 `PI-SCAN-TIMEOUT-1` 已确立且经独立验收 PASS 的量级）。断言字面量
**逐字未改**。

| 文件 | 用例 | 冻结负载(K=20)下命中 | 更高负载探测(K=23/28)下命中 | 处置 |
|---|---|---|---|---|
| `product-protocol.test.ts` | `raw cap 内的最坏编码膨胀仍在 framing 内` | **11/20**（`Test timed out in 5000ms`，5958–9457ms） | K=28: 1/28 | 加 `60_000`（已知稳定重合红之一，票面点名） |
| `product-protocol.test.ts` | `行内容 + LF 恰为 1 MiB 时框内放行（随后按 schema 判）` | 0/20 | 0 | 加 `60_000` |
| `product-protocol.test.ts` | `行内容 + LF 超 1 MiB 即 packet_too_large，且不进 parse` | 0/20 | 0 | 加 `60_000` |
| `product-protocol.test.ts` | `prompt text trim 后非空且不超 131072 bytes` | 0/20 | **K=28: 1/28**（`Test timed out in 5000ms`） | 加 `60_000` |
| `product-protocol.test.ts` | `read_file ok 的 byteLength 必须等于 content 的 UTF-8 实长…` | 0/20 | 0 | 加 `60_000` |
| `product-protocol.test.ts` | `list ok：2000×255 bytes 的极大正例整包仍在 1 MiB 内` | 0/20 | 0 | 加 `60_000` |
| `product-protocol.test.ts` | `list 条目上限、name 字节上限与 kind/byteLength 互洽` | 0/20 | 0 | 加 `60_000` |
| `product-protocol.test.ts` | `delta 非空且不超 65536 bytes` | 0/20 | 0 | 加 `60_000` |
| `product-protocol.test.ts` | `write arguments 是闭集：byteLength 必须等于实长，content 不超 131072` | 0/20 | 0 | 加 `60_000` |
| `product-protocol.test.ts` | `编码后超 1 MiB 在写流前失败，且先于 schema 判定` | 0/20 | 0 | 加 `60_000` |
| `product-protocol.test.ts` | `超 raw cap 在写流前失败` | 0/20 | 0 | 加 `60_000` |
| `workspace-write-env.test.ts` | `恰好 131072 UTF-8 bytes 通过，131073 拒绝` | 0/20 | 0 | 加 `60_000` |
| `workspace-write-env.test.ts` | `raw cap 以内的最坏 JSON 转义不撞破 1 MiB framing` | 0/20 | **K=28: 1/28**（`Test timed out in 5000ms`） | 加 `60_000` |

**为何 11 处冻结负载下零命中仍同批处置**：判据本体核定结论是族成员，非负载命中率——
`raw cap` 的判据本体是**五轮**约 131072 字节量级构造＋encode＋**完整 decode 回读校验**
（`product-protocol.ts:1579` 的 `decodePacketLine` 对称校验），是本族最重成员；其余 12 处
均为**单发** encode 或 decode（无 `raw cap` 那样的循环＋回读校验），结构同族但代价显著更低，
这正解释了它们在同一负载下命中率远低于 `raw cap`——但两处已在**更高**负载探测臂（K=23/28）
下各自命中过一次真实 `Test timed out in 5000ms`（非假设性风险，非静默悬挂），其余 10 处虽未
在本票任何负载探测中实测命中，仍按票面「静态枚举…按范式成批处置」的指示同批处理：加同一
显式上界零成本零回归风险，逐枚论证「多接近安全」不如同批统一处置（复杂度节制）。

---

## 四 · SCAN-1 最重成员复裁（`grep 满 2000 份扫描`）

`PI-SCAN-TIMEOUT-2` 独立验收（`ACCEPTANCE.md` §七.2 观察②）记录：该验收席在其 armA 实测
**`60_000` 上界被击穿**——6/20 红，红耗时 60003–60115ms（撞满上界判死），绿臂最长已迫近
上界的 57618ms；登记「上界余量已不充裕」，移交下一枚同族票裁定是否抬升。

### 4.1 本票复现尝试（冻结负载形态与探测臂）

| 负载形态 | `uptime` 1m 峰值 | 该用例结果 |
|---|---|---|
| K=20 包级并发（冻结对照臂） | 191.42 | 零命中，未进 FAIL 列表 |
| K=23 包级并发 | 413.56 | 零命中 |
| K=28 包级并发 | 637.16 | 零命中 |
| K=40 包级并发 | 794.09 | 判定负载形态本身无效（`Failed to start forks worker`），不采信 |
| 60 路 `tools.test.ts` 自争用（`PI-SCAN-TIMEOUT-1` 原始定标同源形状，零外部自旋） | 106.91 | **60/60 真实完成，零超时，最长实测 20159ms** |

本票在多种负载形态、含高于该验收席登记峰值（335.95–364.39）的探测臂（637.16、794.09）下，
均**未能复现**该验收席记录的近撞线。按判例「红绿数字不可跨环境移植」，此为跨环境/跨时刻的
正常现象，不构成对该验收席实测数字真实性的否定——该席的 60003–60115ms／57618ms 是其自身
环境下的一手实测，本票不代为推翻，只如实登记「本席复现失败」。

### 4.2 取值决定

**抬升至 `120_000`ms**，理由：

1. 该验收席记录是**具体、有数字支撑的一手实测**（非猜测），且逼近上界的方向与 `PI-SCAN-
   TIMEOUT-1` 自己的结论一致——该形状（真实同步磁盘扫描）耗时对负载**非线性**敏感，不存在
   「一次校准即可永久安全」的上界，越极端的负载环境越可能逼近甚至击穿任何有限上界。本票
   自身未复现，不能反证「该验收席的复现不可能再发生」。
2. **不新开第三个数字**——复杂度节制下直接复用同包 `product-main.test.ts` 已在用、已经
   `PI-LANE-UI-1`/`PI-HOST-LOOP-1` 等多轮独立验收放行过的 `120_000`ms 精确量级（真实子进程
   spawn 场景的既有上界），不新增需要单独论证安全边界的第三个数字。
3. `120_000` 对该验收席记录的近撞线（60115ms）与本票新测最长值（20159ms）均有 **≥2×** 余量；
   对 `PI-SCAN-TIMEOUT-1` 原始定标本身（60 路+24 枚外部自旋，load 峰值 111.63 → 最长实测
   30103ms）也有 4× 余量。
4. 仍是**有界值**，不放弃对真实挂死（死锁、无限循环）的捕获能力。

处置只改 `tools.test.ts` 该一枚 `it(...)` 的第三参数 `60_000` → `120_000`，断言字面量逐字
未改，附详解注释（见 diff）。

---

## 五 · `sidecar.test.ts` 网络枚独立归因（票面边界②）

### 5.1 归因过程

`sidecar.test.ts` 是全仓唯一真发网络往返的测试（`PI-LANE-SIDECAR-HANG-1` 在案）。其判据本体
是真实 `net.Server.listen()` ＋真实 `fetch()`，fail-fast 机制是**请求级**显式
`AbortSignal.timeout(ROUND_TRIP_BUDGET_MS = 2000)`（`sidecar.test.ts:44,70`），不是 `it()`
级超时——设计意图正是让"连得上却不回话"这类情形具名快红，而非被动等 vitest 缺省 5000ms
先行截断成一句无信息的超时（`PI-LANE-SIDECAR-HANG-1` 原始病根）。

在本票冻结负载形态（K=20 包级并发）下，`sidecar.test.ts` 两枚用例出现真实红：

| 用例 | before（本票改动前，K=20，峰值 191.42） | after（本票改动后，K=20，峰值 191.33） |
|---|---|---|
| `提问链路 > 绿证三：SSE 逐条推送工具调用与模型回复，收尾带预算` | 5/20 | 9/20 |
| `dev 入口路由 > 绿证一：根路径回 dev 页面` | 1/20 | 0/20 |

抽样两组失败堆栈（before 与 after 各一）：

```
TimeoutError: The operation was aborted due to timeout
 ❯ packages/pi-lane/src/sidecar.test.ts:70 (fetch AbortSignal.timeout)
```
```
Error: 回环往返未在 2000ms 内完成（连得上但没回话，或被静默丢包）：http://127.0.0.1:64998/
（node v25.9.0；NODE_USE_ENV_PROXY=未设；HTTP_PROXY=已设；NO_PROXY=已设）
 ❯ call packages/pi-lane/src/sidecar.test.ts:76
```

两种失败信息都是 `ROUND_TRIP_BUDGET_MS=2000` 的**具名**预算被真实突破，不是 vitest 缺省
5000ms 的截断（截断会报 `Test timed out in 5000ms`，本文件全程未出现这句话），也不是无信息
悬挂（`PI-LANE-SIDECAR-HANG-1` 已修复的病根）。

### 5.2 归因结论

**该红是真实网络/host 环境负载红，不是「赌时长」形状。** 判据：

1. 失败机制是**请求级显式预算**（2000ms）而非 `it()` 级缺省超时——本票超时族的病根是「判据
   本体真实计算量对赌 vitest 5000ms」，而 `sidecar.test.ts` 的预算已经比缺省值更**紧**（2s
   < 5s），命中的是"真实回环往返在极端主机争用下确实超过 2s"，是**主机层面真实资源争用**
   的直接观测，不是测试代码对赌了一个不够用的等待策略。
2. `PI-LANE-SIDECAR-HANG-1` 的设计意图就是让这类情形**具名快红**而非无信息悬挂——本票观测
   到的正是该设计按预期工作：负载越高，真实网络/进程调度延迟越可能超过预算，这是**该文件
   注释自己承认的已知代价**（"预算必须显著小于 vitest 的 5s 通用超时"，本票未改动该文件）。
3. before/after 两组数据里，改动**完全未触及** `sidecar.test.ts`（`git diff` 对该文件零
   改动），命中率从 5/20→9/20（绿证三）与 1/20→0/20（绿证一）的浮动是**同一份未改代码**在
   不同时刻的真实环境噪声，不因本票任何处置而系统性改变——进一步坐实这是环境维度的红，
   与本票的处置对象（判据本体本身）无因果关系。

### 5.3 处置

**登记，不改代码。** 不加大 `ROUND_TRIP_BUDGET_MS`（把赌注调大不解决真实主机争用，且会
削弱该文件本身的设计意图——快速暴露连得上但不回话的情形）；不给该文件的 `it()` 加显式
timeout（会把两层预算叠加成两个数字，且与本超时族的病根不同源，混淆归因）。机器形态守卫
（§七）对 `sidecar.test.ts` 全文件显式豁免并带理由注释，不在超时族普查范围内产生候选。

---

## 六 · 处置范围外观察（不处置，登记供后继参考）

`before` 负载对照批次（K=20，峰值 191.42）里，`product-main.test.ts` 出现一枚与本票判据
**无关**的真实红：

```
FAIL packages/pi-lane/src/product-main.test.ts > route manifest 与 product source 的跨侧核验
> tracked manifest 的 bundle bytes/SHA 恰等于现编 product CJS
Error: 同一份 source 连编两次不 byte-identical，拒绝产出 snapshot
 ❯ Module.buildDeterministicBundle packages/pi-lane/scripts/build-product-sidecar.mjs:274
```

失败耗时 7978ms，该用例**已有** `180_000`ms 显式超时（远未触及），失败原因是 esbuild 两次
编译输出**真的不 byte-identical**（该失败断言本身就是「二次编译比对不相等」，不是超时）。
**不属于本票族**（本票族定义是「无显式 timeout 且判据本体重计算/真 I/O」，该用例已有显式
超时且失败原因非超时）。`after` 批次（同负载、K=20、峰值 191.33）**零复现**（0/20）——单批
20 中 1 次、跨两批 40 中 1 次，量级上更像极端负载下 esbuild 自身对主机资源争用的确定性
敏感度，而非本票处置对象的同类缺陷。登记在案，不扩票、不处置；若后继同族普查或验收复现，
建议另立票核实 esbuild 输出确定性在高争用负载下的行为。

---

## 七 · 机器形态守卫

新增 `packages/pi-lane/src/timeout-family-guard.test.ts`（零生产代码，纯测试侧静态扫描 +
断言），随 `pnpm test`/包级门自动跑。

### 7.1 族定义与两条扫描面

- **形状 A**（`hasHeavyMarker`）：`it()` 体内文本命中 `\.repeat\(\s*[^)]*\bMAX_[A-Z0-9_]+\b`
  或 `length:\s*[^,}]*\bMAX_[A-Z0-9_]+\b`。
- **形状 B**（`findHeavyFixtureVarNames` + 变量名引用匹配）：某 `describe` 内经
  `createFiles(dir, N>=200, …)` 建真实磁盘文件树的 fixture 变量，且目标 `it()` 体内以独立
  标识符引用该变量。**判据刻意收窄到 `createFiles(` 这一具名 helper**、且粒度收在**变量名
  引用**而非整个 describe 一刀切（理由与实现过程中的两个真实反例见 §七.3）。
- `sidecar.test.ts` 全文件豁免（§五结论），文件顶注释登记理由。
- 未豁免命中项若无显式 `it()` 第三参数超时（多行三参数体例或单行 `}, N);` 合并体例均可）即
  判红，并指路处置方式；判定不需处置的新候选须先进 `EXEMPT_WITHOUT_TIMEOUT`（带理由）而非
  让门静默放行——终局形态取「fail-closed 扫描，不认识的候选判红而非跳过」（承 `PI-HOST-
  LOOP-1` 系列判例）。当前 `EXEMPT_WITHOUT_TIMEOUT` 为空集：13 处形状 A ＋ 4 处形状 B 候选
  （tools.test.ts 的 `grep`/`glob` × `200`/`2000` 四枚，`PI-SCAN-TIMEOUT-1/2` 已处置）全部
  已有显式 timeout。

### 7.2 Born-red 验证（两次真实注入，验证后撤除复原）

1. **形状 B**：临时撤除 `tools.test.ts` 的 `grep 满 2000 份扫描` 显式 `120_000`（改回
   `60_000`→再改为裸 `);` 收尾，模拟"有人删掉了超时参数"的真实回归）→ 守卫红且精确点名
   该用例；`git diff` 核对复原后与原文件逐字节相同。
2. **形状 A**：临时撤除 `product-protocol.test.ts` 的 `list 条目上限、name 字节上限与
   kind/byteLength 互洽` 显式 `60_000` → 守卫红且精确点名该用例；同样复原后逐字节核对相同。

两次注入均只让守卫在**精确该用例**上判红，不牵连其余候选，坐实检测器有区分力（不是恒红或
恒绿的死断言）。

### 7.3 实现过程中的两个真实反例（登记，按「不上也要登记」判例同一精神——治理过程本身留痕）

1. **通用 `.repeat(N>=200)` 数值阈值产生两位数假阳性**：本包大量边界测试用
   `.repeat(255)`/`.repeat(1024)`/`.repeat(4096)` 一类构造单个小字符串（对应
   `MAX_SEGMENT_BYTES`=255、`MAX_LOGICAL_PATH_BYTES`=1024、`MAX_CASE_ROOT_BYTES`=4096 等
   小生产常量的边界值探针），量级远非"真" heavy；把阈值判据设成通用 `.repeat(N)` 时一次
   扫出 40+ 条与磁盘 I/O 无关的边界字面量测试。改判据为专指 `createFiles(` 具名 helper
   （`tools.test.ts` 独有，真实建 N 份磁盘文件的唯一动作）后消除。
2. **`describe` 提取器逐字符括号计数在字符串字面量上失配**：`product-protocol.test.ts` 内
   多处 JSON 语料字面量含 `{"pad":""}` 一类字符串——对 `describe(...)` 块用 `{`/`}` 逐字符
   计数定位收尾行，会把这类字符串里的花括号也计入深度，导致块边界扫飞到文件中段才收尾，
   把上百枚无关 `it()` 一并划进候选。改用与 `extractItBlocks` 同源的「缩进锚定收尾行」
   （非逐字符解析，与本仓既有 eslint/prettier 体例耦合，同其既有声明的限制）后消除。
3. **fixture 变量名 lookahead 窗口越界吃进邻近 fixture**：`tools.test.ts` 的 `longFile`
   fixture（`.repeat(250)` 构造单文件，非 heavy）与紧邻其后的 `scan` fixture
   （`createFiles(directory, 2001, …)`，heavy）赋值语句相距仅两三行；固定行数 lookahead
   窗口在扫描 `longFile` 时越过其自身 `sandbox(...)` 回调的收尾 `}));`，"借"到了下一枚
   fixture 的 `createFiles` 调用，将 `longFile` 误判为 heavy。改为 lookahead 遇到本枚
   `sandbox(...)` 自身收尾行或下一枚 fixture 赋值行即停后消除。

---

## 八 · 负载对照（红→绿配对，冻结负载形态，K=20 包级并发）

| 用例 | before（改动前，峰值 191.42） | after（改动后，峰值 191.33） |
|---|---|---|
| `product-protocol.test.ts::raw cap 内的最坏编码膨胀仍在 framing 内` | **11/20**（真实 `Test timed out in 5000ms`） | **0/20** |
| `sidecar.test.ts::绿证三 SSE…`（票面边界②，不处置） | 5/20 | 9/20（未改动该文件，环境噪声） |
| `sidecar.test.ts::绿证一 根路径回 dev 页面`（票面边界②，不处置） | 1/20 | 0/20（环境噪声） |
| `product-main.test.ts::tracked manifest…`（§六，票面外观察，不处置） | 1/20 | 0/20 |

**选择性验证**：`raw cap` 从 11/20 系统性转绿（0/20），`sidecar.test.ts` 两枚（本票零改动）
维持同量级环境噪声波动而非系统性转绿——因果隔离到本票实际改动的文件。

**mutation 撤回复红**（§七.2）：两次独立撤除守卫应保护的既有超时参数，均精确复红对应候选，
撤销后 `git diff` 逐字节复原。

---

## 九 · 既有用例回归

**订正（返修，源验收 REJECT `1c1c181` §八.1 观察）**：`workspace-write-env.test.ts` 的
`it(` 计数原回执写「改前改后相同（40）」，实为**45**（文件另有 5 处 `it.each(...)`，
原计数口径 `grep -c "^\s*it("` 未含 `it.each` 前缀，是取数方法的疏漏，非文件本身变化——
`45` 在本票所有改动前后逐字相同）。返修版守卫的块提取器已同口径处理 `it`/`it.each` 两种
起手形态（见 §十一 附「返修判例」）。

- `product-protocol.test.ts`：`it(`（含 `it.each`）计数改前改后逐字相同（**73**）；断言
  字面量除 §三表格所列 13 处**追加**第三参数外逐字未改。
- `workspace-write-env.test.ts`：计数改前改后相同（**45**，订正见上）；本轮返修新追加 M2
  一处第三参数（`60_000`），断言字面量逐字未改。
- `tools.test.ts`：计数改前改后相同（**67**）；本轮返修新追加 M1 簇三处第三参数
  （`60_000`），SCAN-1 最重成员一处仍是 `120_000`（首轮已定），断言字面量逐字未改。
- `product-stdio.test.ts`（返修新触碰文件）：计数改前改后相同（**104**）；新追加 M3 一处
  第三参数（`60_000`），断言字面量逐字未改。
- `timeout-family-guard.test.ts`（返修整体重写，换轴）：**12** 枚测试（7 枚检测器自证含
  验收等价注入复现装置与 M1/M2/M3 覆盖断言 + 5 枚全量候选普查含两张登记表的陈旧性与理由
  非空校验），零生产代码。
- `pi-lane` 包级：`vitest run --root . packages/pi-lane/` 首轮改前 **17 files / 553
  tests**，首轮改后 **18 files / 561 tests**，本轮返修后 **18 files / 565 tests**（净增
  4，即守卫测试数 8→12；既有 561 逐数吻合，零回归）。

---

## 十 · 全仓门禁

| 门 | 命令 | 读数 |
|---|---|---|
| 依赖安装 | `pnpm install` | `+1157` 包，`Done` |
| sidecar 前置 | `pnpm --filter @courtwork/pi-lane run build:product-sidecar`（缓存自主仓 `/Users/lesprivilege/Projects/Courtwork/packages/pi-lane/dist/runtime` 预播，脚本自身三重 SHA256 校验） | **EXIT 0**，`bundle.bytes=547893`，`sha256=951acf8e…74bc6c`，`reproducible:true`，两枚 archive 均 `origin:"reused"` |
| sidecar 前置 | `pnpm --filter @courtwork/pi-lane run build:headless-sidecar` | **EXIT 0**，`bytes=555314`，`sha256=061248fa…8a9bea`，`reproducible:true` |
| 构建 | `pnpm -r build` | **EXIT 0**（15/15 workspace projects） |
| lint | `pnpm lint`（`eslint .`） | **EXIT 0**，零诊断 |
| 根测试 | `pnpm test`（`vitest run`） | 首轮：**EXIT 0**，`174 files / 2167 tests passed`（10.60s，负载衰减后干净复测；与参考基线 2159 相差 +8，逐数吻合新增守卫文件）。**返修后见 §十三.七**：`174 files / 2171 tests`。 |
| 包级测试 | `vitest run --root . packages/pi-lane/` | 首轮：**EXIT 0**，`18 files / 561 tests passed`（与参考基线 553 相差 +8，逐数吻合）。**返修后见 §十三.七**：`18 files / 565 tests`。 |

按票面不跑 Playwright。

**门禁自伤登记**：首两轮根测试在本会话自身此前的重负载探测（K=40/28 等，峰值一度 794）刚
结束后立即跑，`uptime` 1m 峰值仍残留 20+，命中 `packages/output`/`packages/demo-runtime`
等**与本票零关联包**的若干真实 `Test timed out in 5000ms`（首轮 6 枚红／二轮 3 枚红，两轮
命中集合不同、均落在与本票零关联的包，该批负载系本票探测活动自身产生，非常态环境）；
显式等待 `uptime` 1m 降至 <5 后第三轮干净复绿（174/174，2167/2167，10.60s），坐实为环境
残留噪声、非本票改动引入的回归（判例「隔离绿对全链红零区分力，异步前置不赌时长」的对称
提醒：**批次噪声也要给干净复现窗口**，不得把跑腿本身制造的负载算作产品/测试缺陷）。

---

## 十一 · 处置范围与偏离

- **只动测试侧**：`product-protocol.test.ts`（11 处加 `60_000`）、`workspace-write-env.test.ts`
  （2 处加 `60_000`）、`tools.test.ts`（1 处 `60_000`→`120_000`）三份既有测试文件 ＋ 新增
  `timeout-family-guard.test.ts` 一份守卫测试。**零生产源码改动**（`product-protocol.ts`、
  `workspace-write-env.ts`、`tools.ts`、`sidecar.ts` 逐字未动）。
- 断言字面量除追加显式超时第三参数外**逐字未改**（§九）。
- `sidecar.test.ts` **零改动**（§五结论：登记不改）。
- 未发现需要 `[需架构拍板]` 的项——本票不触及生产代码、schema 或跨层语义，纯测试侧等待
  策略调整＋一份新增守卫测试。
- 偏离：票面点名的「已知稳定重合红三枚」中，`product-protocol raw cap` 一枚经本票处置；
  `sidecar.test.ts` 两枚经独立归因登记不改（票面边界②本即如此要求，非偏离，特此确认）；
  另有 12 枚**未点名但结构同族**的候选（形状 A 11 处、SCAN-1 最重成员复裁 1 处）按票面
  「静态枚举…按范式成批处置」的指示同批纳入处置范围，不是范围外扩张，是票面方法论本身
  要求的枚举完整性。

---

## 十三 · 返修（源独立验收 REJECT `1c1c181`）

### 十三.一 · 拒因引用

> 拒因一枚，落在票面交付物本身——**枚举不完备**：族定义是「无显式 timeout 且判据本体为
> 重计算或真 I/O」，而实现的枚举轴是语法标记 `MAX_*` 标识符的字面在场。同一份重计算换用
> 数字字面量书写即同时躲过枚举与机器门；本席静态扫出三枚在族未处置成员，其中一枚**在本席
> 负载臂上真实红出 `Test timed out in 5000ms`**……该形态与 `docs/engineering/workflow.md`
> §「闭口按族」补正条（2026-08-02，源 1R3 复验：「扫描谓词必须与族定义同宽……语法标记
> 只是实现便利，不得反过来定义族」）逐字同形。
> ——`1c1c181`

三枚在族未处置成员：`tools.test.ts:249`「grep 命中投影成 /case[/...]，行号与 details
不变」（**M1**，验收席负载臂真实红 `Test timed out in 5000ms`，5734ms，1/20）、
`workspace-write-env.test.ts:557`「按 UTF-8 实长而非 UTF-16 长度计量：32768 个四字节
emoji 恰好压线」（**M2**，`32_768 × 4 字节 = 131072 bytes`，与紧邻已处置枚同价）、
`product-stdio.test.ts:362`「分片到达可拼行；一行超 framing 立即 packet_too_large」
（**M3**，`'a'.repeat(1_048_600)`，重于全部已处置成员）。另登记验收观察②：`sidecar.test.ts`
整文件豁免写在扫描器代码的 `basename === 'sidecar.test.ts'` 分支里，不在登记表内。

### 十三.二 · 换轴：数值量级求解，不按标识符拼写

`timeout-family-guard.test.ts` 整份重写（保留族定义与 fail-closed 精神，扫描机制换血）。
新轴两条独立扫描面：

**形状 A（`it()` 体内内联构造）**：对 `.repeat(...)`／`Array.from({ length: ... })`／
`Buffer.alloc(...)`／`new Array(...)`／`.padEnd(...)`／`.padStart(...)` 的实参做**数值
求解**——极简递归下降算术求值器（`+ - * /` 与括号，数字含下划线分隔）+ 常量表（本文件本地
`const NAME = NUMBER` 声明 + 单跳 import 解析：`import { MAX_X } from './y.js'` 读
`./y.ts` 的 `export const MAX_X = N`，把值拉进常量表，兼容 `as` 别名）。字面量、具名常量、
`常量 / 4`、`60 * 1024` 一类简单算式均可解；解出的数值按字节轴（`HEAVY_BYTE_THRESHOLD =
8192`，取 `MAX_API_KEY_BYTES` 量级，介于本仓已知最大边界探针 4097 与最小真重构造 32768
之间）或计数轴（`HEAVY_COUNT_THRESHOLD = 200`，与 `MAX_MATCHES` 同阈值，同时覆盖
`MAX_LIST_ENTRIES`/`MAX_FILES_SCANNED`=2000 一类）判族；**求解不出的实参（含成员访问如
`shell.length`、含未知标识符）一律按候选处理，不当作安全豁免**（fail-closed）。

**形状 B（`describe`/文件级作用域内真实磁盘写 fixture）**：不再钉 `createFiles(` 这一具名
helper。改为：①扫描本文件全部顶层函数定义，任何函数体内含 `writeFile`/`mkdir`/`symlink`
真实调用即登记为「real-write helper」（不问名字）；②在每个 `describe`（及文件级
`beforeAll`/`beforeEach`，若不在任何 describe 内）的 setup 文本里，扫描对 `writeFile` 的
直接调用（内容量级走形状 A 同一套字节轴）与对已登记 helper 的调用（实参量级走计数轴，
解不出同样按候选）；③该作用域一旦判heavy，其内以已知读入口（`\brun\w*\(`／`.execute(`／
`readFile(`／`readTextLines(`，覆盖本包 `run`/`runWith`/`runProduct`/`runDual` 命名习惯）
触达的每一枚 `it()` 都进候选集。

两条扫描面的结果按 `<basename>::<title>` 去重合并；候选集减去登记豁免、减去已有显式
`timeout`，剩者即违规，测试体直接把清单摔进 `Error` message。

### 十三.三 · M1/M2/M3 处置

| 枚 | 位置 | 处置 |
|---|---|---|
| M1 | `tools.test.ts`「grep 命中投影成 /case[/...]，行号与 details 不变」 | 加显式 `60_000` |
| M2 | `workspace-write-env.test.ts`「按 UTF-8 实长而非 UTF-16 长度计量：32768 个四字节 emoji 恰好压线」 | 加显式 `60_000`（与紧邻上一枚 `MAX_WORKSPACE_CONTENT_BYTES` 同批同量级） |
| M3 | `product-stdio.test.ts`「分片到达可拼行；一行超 framing 立即 packet_too_large」 | 加显式 `60_000`（量级重于本文件其余已处置成员） |

### 十三.四 · M1 所在 describe 整簇结论

`tools.test.ts` 的 `createReadOnlyTools({ logicalRoot: "/case" })` describe（`beforeAll`
写入 `超长行.md`——`'甲'.repeat(60 * 1024)` ≈ 184 KiB 单行真实磁盘文件）共 11 枚 `it()`；
守卫新轴按「是否以读入口触达该作用域」筛出 8 枚候选，逐枚人工核定：

| it() | 候选？ | 处置 | 理由 |
|---|---|---|---|
| 装配面与 dev 形态同名同数 | 否 | 不处置 | 零 I/O，纯 metadata 断言 |
| read 保持上游 name/label/description 原文与同一枚 parameters 对象 | 否 | 不处置 | 零 I/O，引用/字符串相等断言 |
| glob/grep 的 schema 与 dev 形态是同一枚对象 | 否 | 不处置 | 零 I/O，引用相等断言 |
| read 归一后只调用一次原版 execute，且真读到内容 | 是 | **豁免**（登记） | 真读，但目标是 起诉状.md（数十字节），非 超长行.md |
| read 接受 /case 绝对写法，与相对写法同结果 | 是 | **豁免**（登记） | 同上，两次真读均针对小文件 |
| 上游截断提示里的 path 也只能是逻辑绝对路径 | 是 | **加 `60_000`** | 真读 超长行.md 全文（M1 同族） |
| 归一失败即拒，原版 execute 一次都不跑 | 是 | **豁免**（登记） | 全路径在 execute 前被拒，自身断言 `binaryReads===0` |
| glob 命中投影成 /case[/...]，且 details 与 dev 形态逐值相同 | 是 | **豁免**（登记） | glob 只 readdir+路径匹配，不读文件内容字节 |
| grep 命中投影成 /case[/...]，行号与 details 不变（**M1**） | 是 | **加 `60_000`** | product+dev 双跑两遍 grep，全文扫描 超长行.md |
| symlink 子树在 glob/grep 里同样不出现 | 是 | **加 `60_000`** | 单跑 grep 扫描 超长行.md（M1 同族，代价约半） |
| 无参调用的 dev 形态逐字不变：read 是原版对象，命中仍是相对路径 | 是 | **豁免**（登记） | 只调用 glob，不读文件内容字节 |

同批复核 `tools.test.ts` 的 `单次调用上限：扫描与命中是两类，各自出字段与注记`
describe（`beforeAll` 经 `createFiles` 建 `hits`=250/`scan`=2001 两份真实文件树）：
新轴同样筛出全部 6 枚 `it()` 为候选（因 6 枚均调用 `runWith`），其中 4 枚（`glob`/`grep`
× `200`/`2000`）已由 `PI-SCAN-TIMEOUT-1/2` 处置，另 2 枚（`未触任一来源时诸字段都出空值`
`grep 单文件内命中超限`）人工核定后**豁免**（登记）——分别只触达自建小 sandbox 与
`longFile`（单文件 250 行 ≈2750 bytes），非 `hits`/`scan` 两枚真正的重 fixture，与
`PI-SCAN-TIMEOUT-1/2` 的既有裁定一致（两票从未给这两枚加 timeout）。

另有 1 枚形状 A 候选因实参含运行时字符串 `.length`（`workspace-write-env.test.ts`「单段
恰好 255 bytes 与总长恰好 1024 bytes 均通过」的 `.repeat(1024 - directories.length - 1 -
3)`）求解不出、按 fail-closed 落入候选，人工核实其真实目标为 `MAX_WORKSPACE_PATH_BYTES=
1024` 这一边界值本身（`directories` 恒为 1019 字符，故 repeat 次数恒为 1），**豁免**
（登记，理由含推导过程）。

**全量候选普查最终态**：30 枚候选，8 枚豁免（各带理由，见 `EXEMPT_WITHOUT_TIMEOUT`），
22 枚已有显式 `timeout`，**0 枚违规**。

### 十三.五 · 两处订正

1. `workspace-write-env.test.ts` 的 `it(` 计数：`40` → **`45`**（原口径未含 `it.each`
   前缀，SPEC §九已订正；`45` 在本票改动前后逐字相同，不是文件被改动）。
2. `sidecar.test.ts` 的整文件豁免：由守卫代码内 `path.basename(block.file) ===
   'sidecar.test.ts'` 分支，迁入具名登记表 `FILE_LEVEL_EXEMPTIONS`（`{file, reason}[]`），
   与 `EXEMPT_WITHOUT_TIMEOUT`（逐 title）同级对外可见、可审计；`isExempt` 现为纯查表。

### 十三.六 · 红绿证

**换轴自证（等价注入双命中）**：按验收 §3.1 装置复现——向 `packages/pi-lane/src/` 注入
临时文件，含两枚语义等价、仅书写方式不同的用例（`'a'.repeat(MAX_PROBE_BYTES)` 具名常量
形 vs `'a'.repeat(131_072)` 数字字面量形，均无显式 timeout）。返修后守卫：**候选 2 枚，
违规 2 枚，双双命中**（旧轴只报 1 枚）。验证后撤除注入文件，守卫复绿 12/12。该等价对同时
固化为守卫自身的永久回归测试（`检测器自证` 组）。

**M1 冻结负载形态红绿配对**（K 路包级并发，`vitest run --root . packages/pi-lane/`）：

| 臂 | K | `uptime` 1m 峰值 | M1 结果 |
|---|---|---|---|
| 红（临时撤除 M1 的 `60_000`） | 30 | 738.98 | **13/30 `Test timed out in 5000ms`** |
| 绿（保持返修后代码） | 30 | **773.53**（高于红臂，绿不是靠负载回落换来的） | **0/30** |

两臂紧邻同批次跑，唯一变量是 M1 是否带显式超时；撤除/复原后 `diff` 逐字节核对与返修态
相同。K=20 时曾复测两轮（峰值 207.56、274.19）均 0/20——量级敏感、非线性（同族既有判例，
见 SPEC §四），故取更高 K 才稳定复现红臂，与 `PI-SCAN-TIMEOUT-1/2` 已确立的「具体命中率
不可跨环境/跨批次移植，需同批次紧邻配对」判例一致。

**M1/M2/M3 born-red 覆盖断言**：守卫新增专项测试直接核对三枚均在候选集内且已有显式
`timeout`（`检测器自证` 组「M1/M2/M3……现均被判为候选且已达标」），任一遭回归撤除
timeout 即由该专项测试与全量普查测试双重命中。

**mutation 撤回复红（补充，M1 专项）**：临时撤除 `tools.test.ts` 内 M1 的 `60_000`（保留
其余改动），守卫两处同时报红（专项断言点名 M1、全量普查列出 `tools.test.ts:125`）；
`cp`/`diff` 复原后逐字节相同，守卫复绿 12/12。

### 十三.七 · 门重跑

| 门 | 命令 | 读数 |
|---|---|---|
| 构建 | `pnpm -r build` | **EXIT 0**（15/15 workspace projects） |
| lint | `pnpm lint`（`eslint .`） | **EXIT 0**，零诊断 |
| 根测试 | `pnpm test` | **EXIT 0**，`174 files / 2171 tests passed`（11.32s，负载衰减后干净复测；与首轮 2167 相差 +4，逐数吻合守卫测试 8→12） |
| 包级测试 | `vitest run --root . packages/pi-lane/` | **EXIT 0**，`18 files / 565 tests passed`（与首轮 561 相差 +4，逐数吻合） |

按票面不跑 Playwright。sidecar 制品未重建（生产源码零改动，首轮身份 `bundle.bytes=
547893`/`sha256=951acf8e…74bc6c` 原样有效）。

**门禁自伤登记（返修批次同族）**：M1 红绿配对所用的 30 路探测本身在本机产生 `uptime` 1m
峰值 645–773 的极端负载；紧随其后立即跑的门禁批次残留负载未散尽，须显式等待 `uptime` 1m
降至 <5（约 8 分钟衰减）后再跑，方得干净读数——与首轮登记的同一判例同源，不重复展开。

### 十三.八 · 返修判例（供后继同族票参考）

1. **枚举轴必须从族谓词出发，不能是语法标记的副产品**——`workflow.md` 1R3/1R4/1R5 判例的
   再一次复现：本票首轮以 `grep '\.repeat\(MAX_|length:\s*MAX_'` 圈定候选，谓词即枚举轴，
   `MAX_*` 拼写与「判据本体重计算」在本仓语料里高度相关但不等价，数字字面量书写即可
   逃逸。数值求解（哪怕只是字面量+常量表+四则运算这种「极简」水平）比语法白名单更贴近
   真实族谓词，但仍非通用解释器——不可解的表达式必须留在候选集里而不是被悄悄放行。
2. **块提取器的收尾探测不能借用另一类调用的收尾形状**——返修中一次真实自伤：`describe`
   提取器复用了 `it()` 专属的单行 `}, N);` 收尾判据，被内部某个 `beforeAll(...)}，
   120_000);` 提前截断，导致该 describe 只提出十几个字符的残片、内部 `it()` 全部消失于
   候选集之外。修法是把该收尾形状按 `keyword === 'it'` 与缩进双重限定，不能对
   describe/beforeAll 通用。
3. **数值阈值必须分轴，「一刀切」会两头出错**——「元素/文件计数」（`Array.from length`、
   真实建文件数）与「字节/字符量级」（`repeat`、`Buffer.alloc`）合用同一阈值时，取小
   阈值会把 `MAX_MATCHES=200` 一类计数轴命中之外的边界字符串探针（255/1024/4096 一类）
   也扫成候选（一次实测：通用 `.repeat(N≥200)` 阈值扫出 40+ 条与磁盘 I/O 无关的边界字面量
   测试），取大阈值又会漏掉计数轴本身（`Array.from({length: MAX_LIST_ENTRIES=2000})` 的
   `2000` 若拿字节阈值 8192 去卡就漏判）。按物理单位分轴（计数用 `MAX_MATCHES=200`、
   字节用 `MAX_API_KEY_BYTES=8192`）两头都对。
4. **真 I/O 判定的「具名 helper」陷阱有两层，不是钉一个名字就完**——第一层是「只认
   `createFiles` 这个名字」（验收拒因本身）；第二层更隐蔽：改成「函数体含 writeFile 即算
   helper」后，若再用固定行数窗口去这个 helper 调用点附近找「规模参数」，窗口会越界吃进
   **下一个不相关 fixture** 的调用（真实事故：`longFile` 借用了紧邻 `scan` 那行的
   `createFiles(directory, 2001, …)`，被误判为 heavy）。修法是让窗口在遇到本次调用自身的
   收尾符号或下一次同类调用的开头时立即停止，不允许跨调用点。

---

## 十四 · 移交

- 报交验点即停：本会话不自我验收、不合并 `main`、不 `push`。
- 建议下一位（独立验收）复核路径：
  1. §十三.二 换轴：核对数值求解器（字面量/常量表/简单算式）与 fail-closed（求解不出 →
     候选）是否符合「谓词从族本身出发」的判例要求；核对 §十三.六 的等价注入双命中自证在
     其自身环境可复现。
  2. §十三.三/四 M1/M2/M3 与 M1 所在 describe 的整簇结论：8 枚豁免逐条核对理由是否成立，
     是否认同「候选但豁免」优于「候选即处置」（复杂度节制 vs 过度加固的取舍）。
  3. §十三.五 两处订正：核对 `45` 的取数口径与 `FILE_LEVEL_EXEMPTIONS` 的查表实现。
  4. §十三.六 M1 红绿配对：核对 30 路负载形态是否仍在「本票冻结负载形态」的合理外延内
     （K 从 20 抬到 30 属误差范围内的同族探测，非重新定义负载形态）；如认为需要更贴近
     K=20 的证据，可在验收环境自行争取更多批次。
  5. §四/§五/§六（首轮内容）未改，若认可首轮结论可不重跑，聚焦本轮改动面即可（沿用
     首轮验收 `1c1c181` 自己给出的建议：「返修后建议聚焦复验……无需重跑全套」）。

---
