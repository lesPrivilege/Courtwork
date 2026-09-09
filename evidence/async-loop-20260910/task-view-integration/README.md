# AM-B-T3 非作者接受与组合验证

2026-09-10，用户转交实现回执后，Astra从实际main `5123d0f`（含BE-5）建隔离树，接收产品 `184e3f0` 与作者证据 `bd4b92a`，组合 `7e78f99` 无冲突。后续同步发布面main `8e69032` 为 `c4552f2`，仅README/site/发布证据变化，无app变更。原作者证据保留在 [task-view](../task-view/README.md)。

## 接受范围

Astra审阅确认生产差异仅为新增projectAsyncTask及AsyncTasks.view委托。Session/store/adapter查找仍归owner；纯函数只读context的version/sources，无I/O、时间读取或写入。输出schema1、字段顺序、availability优先级和options沿旧合同，执行/取消/投递各维度不混淆。没有新增权限、自动恢复、UI或另一状态owner。无产品集成修补，Core3/app4/Runtime5与依赖不变。

receipt.taskRevision是读取时的历史revision，后续准备/记录投递可增加task.revision；允许前者小于后者。禁止把旧receipt回填成当前task事实，不将相等作为验收条件。

## 非作者证据

Astra新写 [independent.test.mjs](independent.test.mjs)，未编辑作者9项测试：

- 从固定Git SHA `85693a6d185f284ecc68324e4dda6d7d677abb03` 提取实际旧view方法作oracle，比较7种execution状态 × 2种Session存在态 × 7种adapter/source组合 × 4种options，共392组；逐JSON字节一致。
- 冻结输入，adapter访问Proxy只准version/sources，Date.now设拒绝探针；两个独立输出互不影响，旧receipt仍保留running/null/旧revision，即使当前task已经succeeded且有cancel intent。

独立2/2通过，见 [日志](independent.log)。此函数消费caller提供的有效task/context，不在本层验证未受信输入或授予scope权限。作者144行compat及HTTP packets为作者证据，组合全量复跑含其真实host/Pi/list/detail/401/404/分页测试，不重标为Astra新设计的HTTP独验。

## 组合回归

组合app全量 **361/361**（含BE-5六项与T3九项），smoke passed；独立2项另列，不累加到全量。见 [全量日志](tests.log) 与 [smoke](smoke.log)。复跑（仓库根）：

```sh
node --test evidence/async-loop-20260910/task-view-integration/independent.test.mjs
npm --prefix app test
npm --prefix app run smoke
```

无真实provider、个人数据、外部操作、部署或UI接受。共享main既有前端未提交证据保留；A2与产品门不关闭。
