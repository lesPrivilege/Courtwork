# scheduler.mjs —— 零依赖的任务依赖图调度库

同步、纯函数、零依赖（仅使用 JS 语言内置能力），无 I/O、无随机性、无全局状态。

| 产物 | 说明 |
| --- | --- |
| `out/scheduler.mjs` | 实现，ESM 命名导出 |
| `out/scheduler.test.mjs` | 测试（`node:test` + `node:assert/strict`） |
| `out/README.md` | 本文件：接口、示例、设计取舍、复杂度 |
| `out/handoff.md` | 交付清单、验证状态、剩余风险、接续方式 |

运行环境：Node.js ≥ 18（`node --test` 与 `structuredClone`）。

## 运行命令

```bash
# 运行全部测试（自动发现 out/*.test.mjs）
node --test out/

# 只运行本测试文件
node out/scheduler.test.mjs

# 直接试用（在 workspace 根目录）
node --input-type=module -e "
import { topologicalOrder, getReadyTasks, getBlockedTasks } from './out/scheduler.mjs';
const tasks = [
  { id: 'parse', deps: [] },
  { id: 'lint',  deps: ['parse'] },
  { id: 'test',  deps: ['lint'] },
  { id: 'docs',  deps: [] },
];
console.log(topologicalOrder(tasks));              // ['parse','lint','test','docs']
console.log(getReadyTasks(tasks, { parse: 'succeeded', lint: 'failed' }));   // ['docs']
console.log(getBlockedTasks(tasks, { parse: 'succeeded', lint: 'failed' })); // ['test']
"
```

## 数据模型

```js
tasks  = [ { id: 'string', deps: ['string', ...] }, ... ]
states = { [taskId]: 'pending' | 'running' | 'succeeded' | 'failed' | 'blocked' }
```

* `deps` 只表达**直接**依赖边：`deps[i]` 中的每个 id 必须先完成，任务 `i` 才能运行。
* `states` 是普通对象，键为任务 id；**未出现的任务视为 `pending`**。
* 合法状态集合由 `VALID_TASK_STATES` 导出（冻结数组）。

## 接口

### `validateGraph(tasks) -> { valid: boolean, errors: string[] }`

校验器，**永不抛错**。空数组是合法图。以下情况不合法，`errors` 非空：

1. `tasks` 不是数组（例如 `null` / `undefined` / 对象 / 字符串 / 数字 / `Set`）；
2. 任务项不是对象（`null`、数组、原始值均不行）；
3. `id` 缺失或不是字符串；
4. `id` 为空白（`''`、`'   '`、`'\t'` 等）——**只拒绝，不 trim 修复**；
5. `id` 重复；
6. `deps` 缺失或不是数组；
7. `deps` 中有非字符串项；
8. 同一任务内依赖重复（如 `deps: ['a','a']`）；
9. 依赖未知任务（id 不在图中）；
10. 自依赖（`deps` 含自身 id）；
11. 环（二元、三元、任意长环、环+无关分支）。

`errors` 的顺序是稳定的：先按输入顺序收集第 2–10 类结构错误，再按输入顺序收集未知依赖，最后按「环内最小输入索引」顺序为每个环的强连通分量各输出一条 `cycle detected among tasks: [...]`。

### `topologicalOrder(tasks) -> string[]`

依赖在前、被依赖者在后的稳定拓扑序。**无效图抛 `TypeError`**（`code === 'INVALID_GRAPH'`）。空图返回 `[]`。

稳定性规则：Kahn 算法每轮从「当前全部入度为 0 的可选节点」中选**原输入索引最小**者；不是按 id 字典序，也不依赖对象键顺序。

```
tasks = [ {id:'a',deps:[]}, {id:'b',deps:['c']}, {id:'c',deps:[]} ]
初始可选 {a(索引0), c(索引2)} -> a -> c -> b
结果 = ['a', 'c', 'b']
```

### `getReadyTasks(tasks, states) -> string[]`

返回**自身 `pending`** 且**所有直接依赖均为 `succeeded`** 的任务 id，按**原输入顺序**排列。

* 依赖处于 `running` / `failed` / `blocked` / `pending` 一律不 ready；
* 遗漏在 `states` 中的任务按 `pending` 处理；
* 自身不是 `pending` 的任务不会出现。

### `getBlockedTasks(tasks, states) -> string[]`

返回**自身 `pending`** 且**存在任一祖先（直接或传递依赖）处于 `failed` 或 `blocked`** 的任务 id，按**原输入顺序**排列。

* 多层传播：`a(failed) -> b -> c -> d` 时 `b`、`c`、`d` 全部 blocked；
* 自身处于其他状态（`failed` / `succeeded` / `running` / `blocked`）的任务**不会**被列入；
* 断开子图互不影响；与失败节点无关的上游/旁支不受影响。

### 抛错契约（`getReadyTasks` / `getBlockedTasks`）

以下情况抛 `TypeError`，并带稳定的 `err.code`：

| 情况 | `err.code` | 说明 |
| --- | --- | --- |
| 无效图 | `INVALID_GRAPH` | 等价于 `validateGraph(tasks).valid === false`；`topologicalOrder` 同此码 |
| `states` 不是普通对象 | `INVALID_STATES` | `null`、数组、字符串、数字、布尔、`Map`、`undefined` 均拒绝 |
| `states` 含未知 id | `UNKNOWN_TASK` | 键不在任务 id 集合中 |
| `states` 值非法状态 | `INVALID_STATE` | 值（含 `undefined`）不在 `VALID_TASK_STATES` 中 |
| 内部不变量 | `INTERNAL_INVARIANT` | 防御性分支，校验通过的图不会触发 |

检查顺序：先校验图 → 再校验 `states` 形状 → 再校验每个键/值。`validateGraph` 从不抛错；`getReadyTasks` / `getBlockedTasks` / `topologicalOrder` 的返回值都是新数组，绝不返回内部引用。

## 示例

```js
import { validateGraph, topologicalOrder, getReadyTasks, getBlockedTasks } from './scheduler.mjs';

const tasks = [
  { id: 'build', deps: [] },
  { id: 'unit',  deps: ['build'] },
  { id: 'itest', deps: ['build'] },
  { id: 'pack',  deps: ['unit', 'itest'] },
];

validateGraph(tasks);              // { valid: true, errors: [] }
topologicalOrder(tasks);           // ['build','unit','itest','pack']（菱形，按输入索引稳定）

getReadyTasks(tasks, {});          // ['build']
getReadyTasks(tasks, { build: 'succeeded' });                                     // ['unit','itest']
getReadyTasks(tasks, { build: 'succeeded', unit: 'succeeded', itest: 'running' }); // []

getBlockedTasks(tasks, { unit: 'failed' });                    // ['pack']
getBlockedTasks(tasks, { unit: 'failed', itest: 'failed' });   // ['pack']
getBlockedTasks(tasks, { unit: 'failed', itest: 'running' });  // ['pack']
getBlockedTasks(tasks, { build: 'failed' });                   // ['unit','itest','pack']
```

说明：`unit` 失败后只有 `pack` 被阻断——`itest` 依赖的是 `build` 而不是 `unit`，
它只是「尚未就绪」（`build` 还没成功），并不属于「被阻断」。两种语义刻意分开：
`getReadyTasks` 只看**直接依赖**，`getBlockedTasks` 看**祖先闭包**。

常见反例：

```js
validateGraph([]).valid;                                   // true（空图合法）
validateGraph([{ id: ' a', deps: [] }]).valid;             // true（' a' 是合法非空 id）
validateGraph([{ id: 'a', deps: [' a'] }]).valid;          // false（不 trim，' a' 未知）
validateGraph([{ id: 'a', deps: ['a'] }]).valid;           // false（自依赖）
validateGraph([{ id: '', deps: [] }]).valid;               // false（空白 id）
validateGraph([{ id: 'a' }]).valid;                        // false（deps 缺失）
validateGraph(null).valid;                                 // false（非数组，不抛错）
topologicalOrder([{ id: 'a', deps: ['b'] }, { id: 'b', deps: ['a'] }]); // 抛 TypeError
getReadyTasks([{ id: 'a', deps: [] }], { b: 'pending' });   // 抛 UNKNOWN_TASK
```

## 设计取舍

1. **`validateGraph` 返回结果而不是抛错，查询函数抛错。** 调用方需要的是「错误清单」用于诊断/展示，而查询函数无法在无效图上给出有意义的答案，因此失败即抛。
2. **所有抛错统一为 `TypeError` 并附 `err.code`。** 单一错误类型让调用方能用 `instanceof TypeError`（或 `Error`）一次捕获，同时用 `code` 区分原因，避免自定义错误类造成跨模块 `instanceof` 失灵。
3. **id 精确匹配、绝不 trim。** `' a'` 与 `'a'` 是两个不同任务；空白 id 直接判为非法而不是静默修复。这样可以避免「看起来合法、实际指向别的任务」的隐性错配。
4. **`deps` 必填（不给默认 `[]`）。** 显式优于隐式：遗漏 `deps` 判为不合法，能暴露构造任务对象时的真实缺陷。
5. **稳定 Kahn 用「最小原输入索引」而非 id 排序或依赖字符序。** 结果可复现，且与调用方给出的任务顺序一致（例如按用户界面顺序执行），避免字典序带来的意外跳变。
6. **`getBlockedTasks` 用「祖先闭包」而不是「直接依赖」。** 与 `getReadyTasks` 的「直接依赖」语义不同：直接依赖全部成功但某个更远祖先失败时，任务实际不可能完成，必须算作 blocked。
7. **不做状态纠正。** 合法状态集合内的任意组合都被接受，即使逻辑上自相矛盾（如 `a: 'failed'` 同时 `b: 'succeeded'` 而 `b` 依赖 `a`）。因此 `getReadyTasks` 与 `getBlockedTasks` 的结果在这种输入下**可能重叠**（同一任务既「就绪」又「被阻断」）。这是刻意的：库只回答问题，不替调用方改写状态机。
8. **`states` 必须是非数组的普通对象。** 数组/`null`/原始值/`Map` 等一律抛 `INVALID_STATES`，避免「看起来接受了、其实被当成空对象」的静默错误。任务项本身则采用鸭子类型（只要求有合法的 `id` / `deps`），因为这里不存在静默歧义。
9. **错误收集与图深检分级。** 只有当 id/依赖完全可解析（id 均为非空字符串、唯一、`deps` 均为字符串数组）时才做未知依赖与环检测，避免在 id 重复等情况下给出误导性的环报告。
10. **全程迭代实现（迭代式 Tarjan + 最小堆 + 反向拓扑传播），无递归。** 万级深链不会栈溢出；代价是要自己维护显式栈。
11. **纯函数。** 所有函数只读输入，返回值都是新建数组/对象；测试用 `Object.freeze` + 快照对比来固定这一契约。

## 复杂度

设 `V` = 任务数，`E` = 依赖边数（去重后）。

| 函数 | 时间 | 空间 |
| --- | --- | --- |
| `validateGraph` | O(V + E)（迭代式 Tarjan + 哈希表维护） | O(V + E) |
| `topologicalOrder` | O(V + E log V)（校验 + 最小堆 Kahn） | O(V + E) |
| `getReadyTasks` | O(V + E)（校验 + 一趟扫描） | O(V + E) |
| `getBlockedTasks` | O(V + E log V)（校验 + 拓扑序 + 反向传播） | O(V + E) |

`getReadyTasks` / `getBlockedTasks` / `topologicalOrder` 每次调用都会重新校验图（O(V+E)），换来的是「任何输入都不会静默产生错误结果」；如需在热路径上反复查询同一张静态图，建议由调用方缓存校验结果（本库刻意不引入隐藏缓存状态）。

## 边界与保证清单

* 空图：`validateGraph([])` 合法；`topologicalOrder([]) === []`；两个状态查询返回 `[]`（`states` 仍需是普通对象）。
* 特殊字符串 id：`'__proto__'`、`'constructor'`、`'hasOwnProperty'`、`'toString'` 等全部按普通字符串处理（内部用 `Map` / `hasOwnProperty.call` 查表，不受原型链干扰）。
* 断开子图、菱形依赖、多层传播、深链（测试覆盖 2000–4000 层）。
* 输入不变性：不修改 `tasks`（含任务对象与 `deps` 数组）与 `states`；不返回内部引用。
* 确定性：同一输入永远得到同一输出。
