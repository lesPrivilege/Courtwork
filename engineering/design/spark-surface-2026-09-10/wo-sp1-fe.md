# WO-SP1-FE · Spark 只读读面（合成数据）

状态补记（2026-09-10）：前端修补 `936239d` 已经非作者 Luna 独立验收并合流 `d0118ab`，见[交付补记](delivery-sp1-fe.md)。BE-41 后端及 RV26-SP01 / ME03 仍开放。下文保留派单时点。

作者 Luna。开工基线 main `0c60f4f`，工作树 `/private/tmp/cw-spark-fe-20260910`，分支 `codex/spark-fe-20260910`。数据目录 `/private/tmp/cw-spark-fe-data`，端口 8861。

前置：[集成裁决 SP-1…SP-12](integration-ruling.md)、[BE-41 冻结 DTO](be41-dto.md)。样本 [SP0](../../../evidence/delivery-rollup-20260910/spark/source-852bd3e/README.md.txt) 位于 `codex/multi-experts-longlife-20260910` 的 `852bd3e`，作视觉与交互参考，**不整页搬入**。

## 范围

写权限于 `app/web/**` 与 `app/tests/**`。单 writer，串行。

不得改动：`app/server/**`、`app/core/**`、`app/runtime/**`、`docs/**`、composer 与 Chat Flow 相关既有文件。不新增依赖。

`app/server/index.mjs` 的静态准入由 Astra 补，Luna **不改该文件**；交付时列出新增模块路径，Astra 登记。

## 交付

`app/web/spark-view.mjs`、`app/web/spark-projection.mjs`，签名沿 `createUsageView` 惯例：

```js
createSparkView({ request, onOpenMatter })
```

`request` 由宿主注入，测试与浏览器检查注入桩。`onOpenMatter(matterId)` 复用既有 Work 面路由，不新建面。

投影模块把 BE-41 报文映射为视图模型，纯函数，无 DOM、无 fetch。

侧栏入口按 SP-10 置于 `#attention-button` 之后（[index.html:119](../../../app/web/index.html)）。入口不带 badge：例行维护不制造未读。

## 两页

**Overview**：按 Matter 一行，显示标题、现行 `sourceVersion`、失效数与总数、按 status 的分布、`sourceSetChange` 的成员差摘要。全部 current 的 Matter 归入安静区，不与失效项混排。

**Activity**：`staleRefs` 逐条列出，按 Matter 与 status 过滤。每条显示候选 id、status、候选源修订与现行源修订之差。截断时显示"显示 20 条，共 N 条"。

页内不出现 Reports、Context path、Work mix、Usage、Controls、Ask about this、Run now、schedule、budget、paused、retention、model tier。空 tab 不留。

## 必须覆盖的九态

| 态 | 表达 |
|---|---|
| loading | request 未决 |
| unimplemented | request 返回 404：显示尚无来源，不显示任何数字 |
| error | request 抛错：显示错误与 retry，retry 复用同一查询 |
| empty | `matters: []` |
| quiet | 全部 `stale` 为 0：安静态，不生成提示 |
| stale | 主场景，`stale.json` |
| partial | `availability` 非 `observed`：显示 Unavailable，**不画零** |
| truncated | `staleRefsTruncated` 为 true |
| paged | `page.total` 大于 `limit` 时的翻页，携同一 `snapshotRef` |

`null` 与 `0` 在任何位置都不得同形。两次不同 `snapshotRef` 的数字不得并列。

## 验证

作者须给出：全量测试、lint、contrast、smoke 全通过；九态的浏览器检查逐条记录；明暗两主题；390 宽度无横向溢出；键盘可达与焦点可见；投影模块的单元测试含 `null` 与 `0` 的区分反例、截断反例、`snapshotRef` 不一致的拒绝反例。

回执写明开工 SHA、worktree、端口、结果、未检项与新增模块路径。作者验证不构成独立接受。

## 反例与上限

不得从合成 fixture 声称任何真实维护能力已实现。不得把 `unimplemented` 态画成"暂时没有数据"以外的任何承诺。不得在 Spark 内 resolve、创建或修改 Attention 事项。不得引入 Spark 私有 store 或本地持久化。

`app/web/coordination-view.mjs` 与 `coordination-projection.mjs` 为样本基线之后新增（SP-8），接单第 0 项先核对布局、路由与语义是否与 Spark 读面冲突，结论写入回执。

原始 SP0 三份输入按固定 `852bd3e01a06077c105d356004b64021d821b888` 的 SHA + path 原字节归档，见 [来源清单](../../../evidence/delivery-rollup-20260910/spark/source-852bd3e/manifest.json)。`.md.txt` 保留历史正文与当时相对链接，不作为当前实现状态；本合同的后续裁决优先。
