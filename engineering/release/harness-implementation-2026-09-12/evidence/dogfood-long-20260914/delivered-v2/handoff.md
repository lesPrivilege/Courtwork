# 接续说明 —— 零依赖任务依赖图调度库

日期：2026-09-14（Dogfooding 20260914）
范围：仅在当前 workspace 的 `out/` 下产出；未修改 CourtWork，未访问个人文件/凭据/外网，未安装任何依赖。
前置检查：`materials/` 不存在，Spark 目录为空（0 条目），没有可复用的既有材料，全部内容为本轮新写。

## 0. 本轮修复（v2，外部测试反馈驱动）

外部独立执行 v1 交付的 `out/scheduler.test.mjs`：**54 项，44 通过，10 失败，退出码 1**。反馈的两个已复现根因都能在我的代码里逐行定位，已修复：

### 根因 #1：未知依赖让校验器意外抛错

* **现象**：`validateGraph([{id:'a',deps:['missing']}])` → `TypeError: undefined is not iterable`（期望返回 `valid:false` + 未知依赖错误）。
* **精确定位**：`validateGraph` pass 3 用 `successors.set(ids[i], new Set())` 只给**真实任务 id** 建键，却把所有依赖（含未知依赖 `missing`）加进邻接表；随后 `stronglyConnectedComponents` 里 `Array.from(successors.get(next))` 对 `missing` 取到 `undefined` → `Array.from(undefined)` 抛错。
* **修复**（`out/scheduler.mjs`）：
  1. pass 3 建边时只保留真实节点：`if (dep !== ids[i] && successors.has(dep)) outgoing.add(dep);` —— 指向未知任务的边在 SCC 构建阶段被跳过。这是**语义安全**的：未知节点在图里没有出边，不可能属于任何环，pass 2 已经单独报告了该错误。
  2. `stronglyConnectedComponents` 增加防御性访问器 `outgoingOf(node)`：邻接表缺键的节点按「无出边」处理（共享冻结空数组 `NO_EDGES`），使该函数对任何邻接表都不再可能抛错。
* **保留的语义**：合法图的环检测完全不变（真实边一条不少，`filter(component.length > 1)` 逻辑未动）；未知依赖与真实环并存时两类错误都会报出；三个查询函数对含未知依赖的图仍抛 `INVALID_GRAPH`（`validateGraph` 返回 invalid → `analyze()` 抛错）。

### 根因 #2：多层阻塞传播漏报

* **现象**：`getBlockedTasks([{id:'a',deps:[]},{id:'b',deps:['a']},{id:'c',deps:['b']}], {a:'failed'})` → 实际 `['b']`，期望 `['b','c']`。
* **精确定位**：v1 用 `topoOrderIndices()`（**依赖在前**）后**倒序**遍历，处理 `c` 时读取 `blocked[b]`，而 `b` 的 `blocked` 值要在之后才计算 → 多层级联全部漏掉（链越长漏得越多）。
* **修复**（`out/scheduler.mjs`）：改为**从 `failed`/`blocked` 节点出发、沿 `dependents`（谁依赖我）边单向向下游扩散**的迭代式遍历：
  * 先把所有自身状态为 `failed`/`blocked` 的节点作为传播源入队；
  * 逐个出队，把未访问过的 `dependents`（下游依赖者）标记为 `reached` 并入队，每节点至多访问一次；
  * 最后按**原输入顺序**输出「`reached` 且自身 `pending`」的节点。
  * 方向本身就是「祖先 → 后代」，不再依赖任何遍历顺序假设；穿过 `succeeded` / `running` 等非 `pending` 中间节点也能继续传播。
* **复杂度变化**：`getBlockedTasks` 由 O(V + E log V)（校验 + 最小堆拓扑序 + 反向传播）降为 **O(V + E)**（校验 + 单向扩散），不再需要拓扑序。README 的传播方向与复杂度说明已同步修正。
* **保留的语义**：只输出自身 `pending` 的节点；输出按原输入顺序；`states` 校验（未知 id / 非法状态 / 非普通对象）与 `INVALID_GRAPH` 语义不变。

### 本轮改动清单

* `out/scheduler.mjs`：上述两处修复 + 相关文档注释（`getBlockedTasks` 的传播方向说明、SCC 的缺键防御说明、pass 3 的注释）。
* `out/scheduler.regressions.test.mjs`（**新增**）：10 个回归/不变量用例，含报告用例本身、未知依赖与真实环并存、查询函数 `INVALID_GRAPH`、深链/菱形/乱序/非 pending 中间节点，以及与**独立暴力祖先闭包实现**在 3 张图 × 全部状态组合（5³ + 5⁵ + 5⁵ = 6375 组）上的逐组交叉校验。
* `out/README.md`：变更记录、`getBlockedTasks` 传播方向、复杂度表、设计取舍第 7/10/11 条、边界清单。
* `out/scheduler.test.mjs`：**未改动**（哈希与 v1 一致），既有的 54 项断言一条未删除、未放宽。
* 接口（函数名、参数、返回结构、错误码取值）**未变**。

### 验证状态（必须明确）

**修复后测试未执行。** 本环境没有 shell/exec 工具，只有 workspace 读写与检索工具。v1 的 44/54 是外部执行结果，**不能**视为 v2 的结果；v2 的 `out/scheduler.test.mjs`（54 项）与 `out/scheduler.regressions.test.mjs`（10 项）都等待外部再次执行。我未运行任何测试，也未把推理当作测试结论。

## 1. 交付物清单

| 文件 | 大小 | sha256（读回核对） |
| --- | --- | --- |
| `out/scheduler.mjs` | 18,611 B | `48675f9e7f7e82e77952c50baa8d60805d1da63f2023544c372a790e9fd0b419` |
| `out/scheduler.test.mjs`（未改动） | 21,411 B | `ac01171453c636113a02395de53a7bea6c9f6b0b8c5bf694bfe97ac4ec3b367b` |
| `out/scheduler.regressions.test.mjs`（新增） | 10,467 B | `5cde3ef9fdc864bfdce70d6cf853cae39a47efdf2c7e463f434ec67f321a69ce` |
| `out/README.md` | 13,945 B | `5191e06e84bbe66ab2f6766d65ea71608fc55c484a75c53870eb92f13e369f58` |
| `out/handoff.md` | 本文件 | 本文件改写自身会改变哈希，故不列入（以上为最终写入后 `ws_list` 的值） |

零依赖：实现只使用 JS 语言内置能力（`Map` / `Set` / `Array` / `Object.freeze` / `Object.prototype.hasOwnProperty.call` / `TypeError`），不含任何 `import`。

## 2. 完成内容

* **`validateGraph(tasks)`**：永不抛错，返回 `{valid, errors}`。覆盖非数组输入、任务项类型错误、`id` 非字符串、空白 `id`、重复 `id`、`deps` 非数组、依赖项非字符串、重复依赖、未知依赖、自依赖、环（任意长度）。错误顺序稳定：结构错误（输入顺序）→ 未知依赖（输入顺序）→ 每个环一条（按环内最小输入索引）。空图合法。
* **`topologicalOrder(tasks)`**：稳定 Kahn——每轮从全部入度 0 节点中取**原输入索引最小**者；自写最小堆，O(V + E log V)。无效图抛 `TypeError`（`INVALID_GRAPH`）。
* **`getReadyTasks(tasks, states)`**：自身 `pending`（缺省即 pending）且**全部直接依赖** `succeeded`，按原输入顺序返回。
* **`getBlockedTasks(tasks, states)`**：自身 `pending` 且存在 `failed`/`blocked` **祖先**；传播方向为「祖先 → 后代」（沿 `dependents` 单向扩散，每节点至多访问一次），支持多层与菱形，穿过非 `pending` 中间节点，按原输入顺序返回；非 `pending` 的任务一律不列入。O(V + E)。
* **错误契约**：`states` 非普通对象 / 含未知 id / 含非法状态 / 图无效（含依赖指向未知任务）→ 抛 `TypeError`，附稳定 `err.code`（`INVALID_STATES` / `UNKNOWN_TASK` / `INVALID_STATE` / `INVALID_GRAPH`）。
* **纯函数**：不修改 `tasks`（含元素与 `deps` 数组）与 `states`，不返回内部引用。
* 内部算法全部为**迭代实现**（迭代式 Tarjan SCC、显式栈、最小堆、沿 `dependents` 的扩散），无递归，深链不会栈溢出。

## 3. 关键决策

| # | 决策 | 理由 |
| --- | --- | --- |
| 1 | 所有抛错统一 `TypeError` + `err.code` | 调用方可用 `instanceof TypeError` 或 `Error` 单一捕获，同时按 `code` 分流；避免自定义错误类在跨模块 `instanceof` 上失灵 |
| 2 | id 精确匹配、绝不 trim；空白 id 判非法 | 需求明确要求不静默 trim；`''`/`'   '` 只拒绝，不修复 |
| 3 | `deps` 缺失即非法（不默认 `[]`） | 显式优于隐式，暴露任务对象构造缺陷 |
| 4 | 稳定 Kahn 用「最小输入索引」 | 可复现且贴合调用方给出的任务顺序，不用字典序 |
| 5 | `blocked` 用**祖先闭包**，`ready` 用**直接依赖** | 直接依赖全成功但更远祖先失败时任务实际不可完成，必须 blocked；两种语义刻意不同 |
| 6 | **阻塞传播方向固定为祖先 → 后代**（源 = failed/blocked 节点，沿 `dependents` 扩散） | 反向「查依赖是否 blocked」依赖遍历顺序，v1 因此在多层链上漏报；按边扩散与顺序无关，且降至 O(V+E) |
| 7 | 未知依赖边**不进入 SCC 邻接表**，SCC 对缺键邻接表做防御 | 未知节点无出边、不可能在环里；既保住环检测又让 `validateGraph` 永不抛错 |
| 8 | 不纠正状态组合 | 需求要求「不额外纠正」；因此 ready 与 blocked 在矛盾输入下**可能重叠**（已在 README 与测试中显式固定） |
| 9 | `states` 严格要求非数组普通对象（含拒绝 `Map`/`Date` 等），任务项则鸭子类型 | `states` 宽松会把 `Map` 静默当作空对象；任务项宽松不产生静默歧义 |
| 10 | 只有 id/依赖完全可解析时才做未知依赖与环检测 | 避免 id 重复等破损输入下输出误导性的环报告 |
| 11 | 查询函数每次调用重新校验图 | 保证「任何输入都不静默产出错误结果」，代价是 O(V+E)；不引入隐藏缓存状态 |

## 4. 已执行的验证

| 验证项 | 方式 | 结果 |
| --- | --- | --- |
| 产物真实写入 | `ws_write` 写出 5 个文件 | 成功 |
| 写回一致性（v2） | `ws_read` 读回修复后的 pass 3 段落、`ws_list` 取字节数与 sha256 | 通过：第 1 节字节数/哈希与磁盘一致；`successors.has(dep)` 过滤与 `outgoingOf` 防御访问器确已落盘 |
| 交叉引用一致性 | 人工比对 README 的传播方向/复杂度与实现、handoff 与 README 表述 | 通过（README 复杂度表已改为 O(V+E)；设计取舍第 7/10/11 条同步） |
| 主测试文件未被削弱 | `ws_list` 哈希比对 | 通过：`out/scheduler.test.mjs` 哈希与 v1 完全一致（`ac0117…`），54 项断言原样保留 |
| 测试执行 | —— | **未执行**（修复后未执行；本环境无 shell / exec 工具） |
| 独立测试反馈 | 外部执行 v1：54 项 / 44 通过 / 10 失败 | 已据此定位并修复两个根因；等待对外部再次执行的结果 |

明确说明：**修复后测试未执行**。因此本文件不声称任何用例「通过」。

过程中发现并修正的自有缺陷（留痕）：

1. （v1）测试初版 `getReadyTasks(..., { b: 'succeeded' })` 期望值算错 → 已改为 `{ c: 'pending' } → ['a']` 等。
2. （v1）README 示例 `getBlockedTasks(tasks, { unit: 'failed' })` 答案写错 → 已改为 `['pack']`。
3. （v2 修复中）新增回归文件初版把 `{a:'failed', b:'blocked', c:'running'}` 在 4 节点链上的结果写成 `[]`；重推后确认传播会穿过 `c(running)` 命中末端 `d`，正确结果是 `['d']`，已改正并加注释说明。
4. （v2）v1 handoff 中「未知依赖只在 pass 2 报错、不影响环检测」的推演是**错的**（正是根因 #1），以及「反向拓扑传播」的描述也是错的（正是根因 #2）；两处均已在本文件与 README 中更正。

## 5. 推理核查（**不是**测试执行，仅供执行前对照）

* `validateGraph([{id:'a',deps:['missing']}])` → `{valid:false, errors:['tasks[0].deps[0] references unknown task "missing"']}`，不抛错（pass 3 跳过未知边，无环）。
* `validateGraph([{id:'a',deps:['b','ghost']},{id:'b',deps:['a']}])` → 2 条错误（先 `unknown task` 后 `cycle detected`）。
* 三个查询函数对含未知依赖的图 → `TypeError`，`code === 'INVALID_GRAPH'`。
* `getBlockedTasks(a→b→c, {a:'failed'})` → `['b','c']`；加一层 `d` → `['b','c','d']`。
* `getBlockedTasks` 菱形 `a→{b,c}→d→e`，`{b:'failed'}` → `['d','e']`；`{a:'failed'}` → `['b','c','d','e']`。
* `getBlockedTasks(链 a→b→c→d, {a:'failed', b:'blocked', c:'running'})` → `['d']`（穿过非 pending 中间节点）。
* 乱序输入 `[{d,['c']},{c,['b']},{b,['a']},{a,[]}]`，`{a:'failed'}` → `['d','c','b']`（原输入顺序）。
* 60 节点链 `{t0:'failed', t7:'succeeded', t20:'running', t41:'blocked'}` → 与暴力祖先闭包实现一致。
* 4000 层深链：`validateGraph` 与 `topologicalOrder` 全程迭代，不应出现 `RangeError`。

置信度限制：我无法运行代码，不能排除拼写级语法错误、`assert` API 用法偏差或期望值算术错误；上一轮我正是在这种「推演」中漏掉了这两个缺陷，因此**任何推演都不能替代外部执行**。

## 6. 未执行的验证 / 剩余风险

1. **修复后未执行测试**（最高风险）：`node --test out/` 未运行。可能存在语法错误、断言期望值与实现不一致等问题。v1 的 44/54 不代表 v2。
2. **回归文件未执行**：`out/scheduler.regressions.test.mjs` 的 10 项（含 6375 组暴力交叉校验）从未运行；若其中某条期望值有误，会表现为「新增失败」。注意它只影响新增文件，不影响主测试文件。
3. **接口解释风险（未变）**：
   * 非数组 `tasks` 返回 `{valid:false}` 而非抛错；
   * `states` 严格要求非数组普通对象（`Map`/`Date`/类实例被拒绝）；
   * `deps` 缺失判为非法；
   * 「空白 id」按 `id.trim() === ''` 判定（含 `'   '`、`'\t'`）；
   * 环检测在 id 重复/破损时跳过（此时节点集合无定义）。
4. **未覆盖的边界**：稀疏数组、`deps` 为 `arguments`/TypedArray、`states` 为 `Object.create(null)`、getter 抛错的对象、超大图（>10 万节点）性能。
5. **复杂度为分析结论**，无基准数据；`getBlockedTasks` 降为 O(V+E) 后未实测。
6. **`INTERNAL_INVARIANT` 分支不可达**：防御性代码，测试无法覆盖。

## 7. 接续方式

1. 先跑测试：
   ```bash
   node --test out/                          # 期望：主 54 项 + 回归 10 项全部通过
   node out/scheduler.test.mjs
   node out/scheduler.regressions.test.mjs
   ```
2. 若仍有失败，按根因分类处理：
   * 主测试文件失败 → 先看是不是我在 v2 里改坏了别的语义（本轮只动了 pass 3 的建边、SCC 防御访问器、`getBlockedTasks` 的传播三个点）；
   * 回归文件失败 → 大概率是我新增的期望值/暴力实现对语义理解有误，改期望值并在此留痕；
   * 语义分歧（见 6.3）→ 确认外部期望后改实现。改动点：
     * 非数组输入：`validateGraph` 入口 `Array.isArray` 分支；
     * `states` 严格性：`isPlainObject`；
     * `deps` 默认值：`validateGraph` 第 6 项 + `analyze`；
     * 环检测开关与未知边过滤：`validateGraph` 的 `resolvable` 与 pass 3 的 `successors.has(dep)`；
     * 传播方向：`getBlockedTasks` 的源集合与 `dependents` 扩散循环；
     * 抛错类型/属性：`fail()`。
3. 外部可依赖的稳定契约：四个导出函数名与签名、`{valid, errors}` 结构、状态字符串集合（`VALID_TASK_STATES`）、`err.code` 取值、返回值均为新数组、输入不被修改、稳定排序规则（最小输入索引）、阻塞传播的祖先闭包语义。改动这些须同步更新 `out/README.md`。
4. 若外部再次反馈失败用例，请把「用例 + 实际输出 + 期望输出」贴回，可据此定点修复并补回归测试。

## 8. 状态声明

本 Run 只完成了**修复、产物写入与自检（含读回核对）**。文件一旦写出即为生成结果，不代表正式评审、批准或验收；形式状态只能由应用侧的人工评审动作改变。测试执行状态：**修复后测试未执行**（v1 的外部结果 54 项 / 44 通过 / 10 失败仅用于定位根因，不代表 v2 结果）。
