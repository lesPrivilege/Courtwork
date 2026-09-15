# 合成 coding dogfood：依赖图调度库

请用合成数据实现一个零依赖 JavaScript ESM 任务依赖图库。所有改动只写在当前 Courtwork Session 的 `out/` 内：

- `out/scheduler.mjs`：库实现。
- `out/scheduler.test.mjs`：Node 内置 `node:test` 测试。
- `out/README.md`：用途、API 和至少一个示例。
- `out/handoff.md`：交付内容、实际执行过的验证及未执行项。

不要改 `out/` 外文件，不安装依赖，不访问网络。若工具不能执行测试，明确写“未执行”；不能把写出测试、口头推理或外部检查称为测试通过。

## 输入与验证

图是任务数组，每项为 `{ id: string, deps: string[] }`；`deps` 列出直接前置任务。ID 必须是非空白字符串（空串或 trim 后为空无效）；其他 ID 按原字符串精确匹配、区分大小写，不 trim 或改写，例如 `' a'` 与 `'a'` 是不同 ID。任务 ID 唯一；每项 deps 必须是字符串数组，不得重复依赖 ID。空图有效。任务不得自依赖、引用不存在的任务或形成环。验证必须有确定性结果。

模块导出四个同步函数：

- `validateGraph(tasks)` 返回 `{ valid: boolean, errors: string[] }`。有效图的 errors 为空；无效图返回至少一条可读字符串。
- `topologicalOrder(tasks)` 返回全部任务 ID 的数组；无效图抛异常。顺序必须遵守依赖先后。并列时，每一步从当前所有可运行节点中选择**原输入索引最小**者，包括刚变为可运行的节点；不得按 ID 字典序。
- `getReadyTasks(tasks, states)` 返回原输入顺序中的 ID：任务自身为 pending，且所有直接依赖均为 succeeded。states 是 ID→状态的普通对象；未列出的任务默认为 pending。
- `getBlockedTasks(tasks, states)` 返回原输入顺序中的 ID：任务自身为 pending，且至少一个直接或间接祖先为 failed 或 blocked。此函数只查询、不改写状态。

唯一状态是 pending、running、succeeded、failed、blocked。未知任务 ID、未知状态、无效任务图或非对象状态输入须抛异常。任何函数都不得改变传入的任务、deps 或 states。该库只验证、排序和查询状态；不执行命令、不读写文件、不处理并发或外部副作用。

错误文字不限定措辞，但同一输入须得到相同验证结果。允许忽略任务上的额外字段。不要引入运行时或开发依赖。

## 必须区分的稳定顺序

下面这张图的拓扑顺序必须是 `z, a, b, c, done`。初始可运行项为 z 和 b，必须先选输入位置较早的 z；随后 a、b、c 也按输入索引排序。

```js
[
  { id: 'z', deps: [] },
  { id: 'a', deps: ['z'] },
  { id: 'b', deps: [] },
  { id: 'c', deps: ['z'] },
  { id: 'done', deps: ['a', 'b', 'c'] },
]
```

自带测试应覆盖空图、基础与多层依赖、稳定顺序、状态缺省、ready 判定、failed/blocked 祖先的多层阻塞、非 pending 状态排除，以及重复 ID、重复依赖、未知依赖、自依赖、循环和未知状态。README 示例应能按文档中的命令运行。

## 外部检查

独立 oracle 固定在仓库的 evidence 目录，不应复制进 out。外部检查者可运行：

```sh
node engineering/release/harness-implementation-2026-09-12/evidence/dogfood-long-20260914/oracle.mjs /absolute/path/to/session-workspace/out
node --test /absolute/path/to/session-workspace/out/scheduler.test.mjs
```

两条命令各自的实际结果分开记录。测试文件存在不代表执行通过；失败时保留原产物和回执，再按用户安排修复或续接。
