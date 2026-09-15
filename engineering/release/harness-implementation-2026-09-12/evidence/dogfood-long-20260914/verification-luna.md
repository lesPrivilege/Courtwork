# V2 独立复验（Luna）

日期：2026-09-14。对象为 `delivered-v2/` 五个交付文件；固定规格见 [spec.md](spec.md)。复验使用 Node.js v25.9.0，在本地合成交付副本执行；没有访问凭据、调用 Provider 或操作浏览器，也没有改动 `delivered-v2/`。

## Oracle 修订

我先前的 Oracle 曾以 `getBlockedTasks(tasks)` 省略必需的 `states` 参数。这不符合固定签名 `getBlockedTasks(tasks, states)`；合同只规定 `states` 中缺少单个任务条目时按 `pending` 处理。因此已修正 Oracle，显式传入 `{}`，并在 [oracle.mjs](oracle.mjs#L91) 留下注释及回归断言。此修订纠正的是复验器调用错误，不是对实现的豁免。

## 执行结果

以下命令从本文件所在的 evidence 目录执行：

```sh
node oracle.mjs delivered-v2
node --test delivered-v2/scheduler.test.mjs delivered-v2/scheduler.regressions.test.mjs
node --test delivered-v2/scheduler.regressions.test.mjs
```

| 检查 | 结果 |
|---|---|
| `node oracle.mjs delivered-v2` | 8 项检查通过，0 失败；退出码 0。覆盖导出、精确 ID、稳定拓扑顺序、ready/blocked 语义、无效图、状态输入和输入不变性。 |
| `node --test delivered-v2/scheduler.test.mjs delivered-v2/scheduler.regressions.test.mjs` | 70 项中 69 通过、1 失败；退出码 1。 |
| `node --test delivered-v2/scheduler.regressions.test.mjs` | 16/16 通过；退出码 0。包含与独立祖先闭包实现逐组合比较的 6,375 组状态组合。 |

完整主测试失败见 [self-tests-v2.log](self-tests-v2.log)。唯一失败位于 [scheduler.test.mjs](delivered-v2/scheduler.test.mjs#L161)：`graph(['a', [' a']], ['a'])` 同时创建了两个 ID 都为 `a` 的任务，却断言首条错误必须是 `unknown task`。重复 ID 使图在进入未知依赖检查前已无效；实现返回重复 ID 错误符合此验证顺序，失败来自测试夹具未隔离其意图。要测试精确、不 trim 的依赖，应改为单节点 `graph(['a', [' a']])`。我未改测试或实现。

## 独立代码复核

- 未知依赖仍由校验 pass 2 报错；构造 SCC 邻接表时跳过不存在的节点，迭代 Tarjan 对缺失邻接项也按无出边处理，避免意外 `TypeError`（[scheduler.mjs](delivered-v2/scheduler.mjs#L244)、[scheduler.mjs](delivered-v2/scheduler.mjs#L258)）。Oracle 的未知依赖验证及新增回归均通过。
- `getBlockedTasks` 从 `failed`/`blocked` 源节点沿 `dependents` 向后代做迭代扩散，最后按原输入顺序筛出自身为 `pending` 的任务；三层链、菱形、非 pending 中间节点和逆序输入回归通过（[scheduler.mjs](delivered-v2/scheduler.mjs#L520)）。
- 交接文档记新增回归“10 项”，但 Node 实际发现该文件 16 项；本报告按执行器实测数记录。

独立 Oracle 与新增回归均通过，但提交的自带测试集仍有一个失败，因此这份候选尚非全绿。修正测试夹具并重跑两份测试文件后，才能确认套件全绿。此处记录的是 Luna 在交付代码上的外部执行，不证明 Agent 在 Courtwork 内自运行过测试，也不关闭 DF-04、完整 coding dogfooding 或 G1–G5。
