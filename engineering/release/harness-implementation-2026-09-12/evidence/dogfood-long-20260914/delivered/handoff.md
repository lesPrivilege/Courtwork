# 接续说明 —— 零依赖任务依赖图调度库

日期：2026-09-14（Dogfooding 20260914）
范围：仅在当前 workspace 的 `out/` 下产出；未修改 CourtWork，未访问个人文件/凭据/外网，未安装任何依赖。
前置检查：`materials/` 不存在，Spark 目录为空（0 条目），因此没有可复用的既有材料或历史结论，全部内容为本轮新写。

## 1. 交付物清单

| 文件 | 大小 | sha256（读回核对） |
| --- | --- | --- |
| `out/scheduler.mjs` | 16,840 B | `32c11281d8c53e8f6b670a41c921415cbc26d83270d942e72ff4ec303256040d` |
| `out/scheduler.test.mjs` | 21,411 B | `ac01171453c636113a02395de53a7bea6c9f6b0b8c5bf694bfe97ac4ec3b367b` |
| `out/README.md` | 11,159 B | `1210a9891622a00760c73e21b448bdc2624e6ac8ac5e7e2cc1686793a1b5adf1` |
| `out/handoff.md` | 本文件 | 本文件在写下这段文字时会改变自身哈希，故不列入（其余三个文件的哈希为最终写入后的 `ws_list` 值） |

零依赖：实现只使用 JS 语言内置能力（`Map` / `Set` / `Array` / `Object.prototype.hasOwnProperty.call` / `TypeError`），不含任何 `import`。

## 2. 完成内容

* **`validateGraph(tasks)`**：永不抛错，返回 `{valid, errors}`。覆盖非数组输入、任务项类型错误、`id` 非字符串、空白 `id`、重复 `id`、`deps` 非数组、依赖项非字符串、重复依赖、未知依赖、自依赖、环（任意长度）。错误顺序稳定：结构错误（输入顺序）→ 未知依赖（输入顺序）→ 每个环一条（按环内最小输入索引）。空图合法。
* **`topologicalOrder(tasks)`**：稳定 Kahn——每轮从全部入度 0 节点中取**原输入索引最小**者；自写最小堆，O(V + E log V)。无效图抛 `TypeError`（`INVALID_GRAPH`）。
* **`getReadyTasks(tasks, states)`**：自身 `pending`（缺省即 pending）且**全部直接依赖** `succeeded`，按原输入顺序返回。
* **`getBlockedTasks(tasks, states)`**：自身 `pending` 且**存在 `failed`/`blocked` 祖先**（多层级联传播），按原输入顺序返回；非 `pending` 的任务一律不列入。
* **错误契约**：`states` 非普通对象 / 含未知 id / 含非法状态 / 图无效 → 抛 `TypeError`，附稳定 `err.code`（`INVALID_STATES` / `UNKNOWN_TASK` / `INVALID_STATE` / `INVALID_GRAPH`）。
* **纯函数**：不修改 `tasks`（含元素与 `deps` 数组）与 `states`，不返回内部引用。
* 内部算法全部为**迭代实现**（迭代式 Tarjan SCC、显式栈、最小堆、反向拓扑传播），无递归，深链不会栈溢出。

## 3. 关键决策

| # | 决策 | 理由 |
| --- | --- | --- |
| 1 | 所有抛错统一 `TypeError` + `err.code` | 调用方可用 `instanceof TypeError` 或 `Error` 单一捕获，同时按 `code` 分流；避免自定义错误类在跨模块 `instanceof` 上失灵 |
| 2 | id 精确匹配、绝不 trim；空白 id 判非法 | 需求明确要求不静默 trim；`''`/`'   '` 只拒绝，不修复 |
| 3 | `deps` 缺失即非法（不默认 `[]`） | 显式优于隐式，暴露任务对象构造缺陷 |
| 4 | 稳定 Kahn 用「最小输入索引」 | 可复现且贴合调用方给出的任务顺序，不用字典序 |
| 5 | `blocked` 用**祖先闭包**，`ready` 用**直接依赖** | 直接依赖全成功但更远祖先失败时任务实际不可完成，必须 blocked；两种语义刻意不同 |
| 6 | 不纠正状态组合 | 需求要求「不额外纠正」；因此 ready 与 blocked 在矛盾输入下**可能重叠**（已在 README 与测试中显式固定） |
| 7 | `states` 严格要求非数组普通对象（含拒绝 `Map`/`Date` 等），任务项则鸭子类型 | `states` 宽松会把 `Map` 静默当作空对象；任务项宽松不产生静默歧义 |
| 8 | 只有 id/依赖完全可解析时才做未知依赖与环检测 | 避免 id 重复等破损输入下输出误导性的环报告 |
| 9 | 查询函数每次调用重新校验图 | 保证「任何输入都不静默产出错误结果」，代价是 O(V+E)；不引入隐藏缓存状态 |

## 4. 已执行的验证

| 验证项 | 方式 | 结果 |
| --- | --- | --- |
| 产物真实写入 | `ws_write` 写出 4 个文件 | 成功 |
| 写回一致性 | `ws_read` 读回 `scheduler.mjs` 全文（分段）、`scheduler.test.mjs` 首尾、`ws_grep` 定位断言、`ws_list` 取字节数与 sha256 | 通过：文件存在、字节数与第 1 节一致、实现四个导出函数与测试导入一一对应、修正后的断言确已落盘 |
| 交叉引用一致性 | 人工比对 README 示例输出与实现语义、handoff 与 README 的决策表述 | 通过（发现并修正 README 示例答案与一处失效交叉引用，见下） |
| 测试执行 | —— | **未执行**（本环境无 shell / exec 工具，只有 workspace 读写与检索工具） |
| 独立测试反馈 | —— | 待外部核查者执行后反馈 |

明确说明：**测试已编写，未执行**。因此本文件不声称任何用例「通过」；第 5 节的手工推演只是**推理核查**，不等于测试结果。

过程中发现并修正的自有缺陷（留痕）：

1. 测试初版中 `getReadyTasks(graph(['a'], ['b',['a']], ['c',['b']]), { b: 'succeeded' })` 的期望值写成 `['c']`；手工推演发现 `a` 未出现在 `states` 中（视为 `pending`）且无依赖，故也应为 ready，正确期望是 `['a','c']`。已把那组断言改成语义更清晰的 `{ c: 'pending' } → ['a']` 与 `{ a:'succeeded', b:'succeeded' } → ['c']`。
2. README 示例中 `getBlockedTasks(tasks, { unit: 'failed' })` 初版写成「`['itest','pack']` 之一」；重算后确认 `itest` 依赖的是 `build` 而非 `unit`，属于「尚未就绪」而非「被阻断」，正确答案是 `['pack']`，已改正并补足解释。
3. `handoff.md` 初版存在一处指向不存在小节的交叉引用，已改为本节表格。

## 5. 推理核查（**不是**测试执行，仅供执行前对照）

以下为我按代码逐条手推的关键路径；若与实际运行结果不符，以运行为准。

* `validateGraph([])` → `{valid:true, errors:[]}`；`validateGraph(null)` → `{valid:false, errors:['tasks must be an array']}`（不抛错）。
* `topologicalOrder([{a,[]},{b,['c']},{c,[]}])` → 初始可选 `{a(0), c(2)}` → `a` → `c` → `b` = `['a','c','b']`。
* `topologicalOrder([{a1,[]},{b1,[]},{a2,['a1']},{b2,['b1']}])` → `['a1','b1','a2','b2']`。
* 菱形 `a → {b,c} → d` → `['a','b','c','d']`。
* `getReadyTasks` 链 `a → b → c`：`{}` → `['a']`；`{a:'succeeded'}` → `['b']`；`{c:'pending'}` → `['a']`。
* `getBlockedTasks` 链 `a → b → c → d`：`{a:'failed'}` → `['b','c','d']`；`{b:'failed'}` → `['c','d']`；`{a:'failed', b:'failed', c:'pending'}` → `['c']`（`b` 自身 failed，不列入）。
* 输入顺序 ≠ 拓扑序：`[{d,['c']},{c,['b']},{b,['a']},{a,[]}]`，`{a:'failed'}` → `['d','c','b']`。
* 矛盾状态 `{a:'failed', b:'succeeded'}`（`b` 依赖 `a`）、`c` 依赖 `b`：`getReadyTasks` → `['c']`，`getBlockedTasks` → `['c']`（刻意允许重叠）。
* 4000 层深链：`validateGraph` 与 `topologicalOrder` 全程迭代，不应出现 `RangeError: Maximum call stack size exceeded`；2000 层深链 `{t0:'failed'}` → blocked 共 1999 项。

置信度限制：我没有运行环境，无法排除拼写级语法错误、`assert` API 用法偏差（如 `assert.match` / `assert.throws` 谓词重载）、或测试期望值本身的算术错误。

## 6. 未执行的验证 / 剩余风险

1. **未执行测试**（最高风险）：`node --test out/` 从未运行。可能存在语法错误、断言期望值与实现不一致、或 `node:test` 用法细节问题。
2. **接口解释风险**：
   * 非数组 `tasks` 我选择「返回 `{valid:false}`」而非抛错（依据是需求把它列为「不合法」，而 `validateGraph` 是校验器）。若外部期望 `validateGraph` 对非数组抛错，需改 `validateGraph` 入口分支。
   * `states` 用「非数组普通对象」严格判定，`Map`/`Date`/类实例被拒绝。若外部测试传入 `Map` 并期望接受，需放宽 `isPlainObject`。
   * `deps` 缺失我判为非法。若外部期望「缺失即空依赖」，需放宽 `validateGraph` 第 6 项与 `analyze`。
   * 「空白 id」按 `id.trim() === ''` 判定（覆盖 `'   '`、`'\t'`），不只是 `''`。
   * 环检测在 id 重复/破损时**跳过**（只报结构错误），因为此时节点集合无定义。若外部同时构造「重复 id + 环」并期望两条错误，需调整 `resolvable` 开关条件。
   * 抛错类型统一为 `TypeError`；若外部要求 `Error` 之外的自定义类型或 `validateGraph` 抛错，需改 `fail()`（单一出口）。
3. **未覆盖的边界**：`tasks` 为稀疏数组、`deps` 为 `arguments`/TypedArray、`states` 为 `Object.create(null)`、getter 抛错的对象、超大图（>10 万节点）性能、`err.code` 之外的错误属性约定。这些按「拒绝或正常处理」的保守方式实现，但未运行验证。
4. **性能未实测**：复杂度为分析结论（O(V+E)、O(V+E log V)），没有基准数据。
5. **`INTERNAL_INVARIANT` 分支不可达**：防御性代码，测试无法覆盖，评审时可视为死代码。

## 7. 接续方式

1. 先跑测试：
   ```bash
   node --test out/          # 期望：全部用例通过
   node out/scheduler.test.mjs
   ```
2. 出现失败时的定位顺序：
   * 语法/加载错误 → 改 `out/scheduler.mjs` 对应函数；
   * 断言期望值错误（大概率是我的推演失误）→ 改 `out/scheduler.test.mjs` 的期望值，并在第 5 节补记；
   * 语义分歧（见 6.2）→ 先确认外部期望语义，再改实现。改动点：
     * 非数组输入：`validateGraph` 入口 `Array.isArray` 分支；
     * `states` 严格性：`isPlainObject`；
     * `deps` 默认值：`validateGraph` 第 6 项 + `analyze` 中的 `tasks[i].deps`；
     * 环检测开关：`validateGraph` 的 `resolvable`；
     * 抛错类型/属性：`fail()`。
3. 外部可依赖的稳定契约：四个导出函数名与签名、`{valid, errors}` 结构、状态字符串集合（`VALID_TASK_STATES`）、`err.code` 取值、返回值均为新数组、输入不被修改、稳定排序规则（最小输入索引）。改动这些须同步更新 `out/README.md`。
4. 若外部核查者反馈失败用例，请把「用例 + 实际输出 + 期望输出」贴回，可据此定点修复并补回归测试。

## 8. 状态声明

本 Run 只完成了**产物写入与自检（含读回核对）**。文件一旦写出即为生成结果，不代表正式评审、批准或验收；形式状态只能由应用侧的人工评审动作改变。测试执行状态：**已编写，未执行**。
