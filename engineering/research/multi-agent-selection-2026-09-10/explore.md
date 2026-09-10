# Luna fast explore · 有界回执与 Astra 处置

2026-09-11；Luna Max，只读源码/合同，无产品测试、无文件编辑。固定 HEAD `9097cbfd4b2b3b4c7b1117db5558b73568db67cc`。这不是产品独立接受，也不把Luna重述本次Astra草稿当成第二份架构证据。

## 本地接缝

- [coordination.mjs](../../../app/harness/coordination.mjs)：Thread/scope/CAS、消息血缘、outbox/inbox与恢复，继续由RuntimeStore持有，不改Core事实。
- [tools.mjs](../../../app/harness/tools.mjs)：模型目录/收件箱/消息工具，Run/call身份绑定。
- [service.mjs](../../../app/server/service.mjs)：Coordination组合、恢复、Pi AgentSession与现有active Run并发；MA2-D15必须沿此路线接受控child Session/Run。
- [store.mjs](../../../app/server/store.mjs)：本固定基线Runtime schema为12。current早期段的10和coordination标题的8属于对应交付时点，不将它们重写为当前schema。
- [child-execution.mjs](../../../app/harness/child-execution.mjs)：仅conformance入口，非生产child scheduler；前端已有[coordination-view](../../../app/web/coordination-view.mjs)与[projection](../../../app/web/coordination-projection.mjs)。

## 既有编号，不与源会话MA编号混用

| 既有编号 | 当前范围 / 后续 |
|---|---|
| MA-00 | Thread/HTTP/模型通信入口；统一事件投影仍另题 |
| MA-01 | child invoke/synthetic；持久intent/admission/query-only recovery待 |
| MA-02 | Pi conformance；MA2-D15关闭vendor lane，第二Session/Run待接 |
| MA-03 | grant求交/depth/逐工具；Matter policy与审批升级待 |
| MA-04 | deterministic reducer/归因/冲突；typed evidence与Core消费待 |
| MA-05 | 本地outbox/inbox；Core跨Matter事务与reply UI待 |
| MA-06 | 三账及身份；OTel与真实因果拓扑待 |
| MA-07 | Workflow方向，依赖与engine后置 |

## Astra 消费

采纳源码定位与原MA编号映射；MAS PR必须增量接已有owner。Luna指出本包explore链接尚缺，现由本回执补齐。Luna回执的“工作树干净”与Astra同时执行的git status（有本次文档修改）不一致，不采纳该状态表述；没有产品测试结果可转记PASS。其引用首轮目录时的重复年份笔误不继承，正确入口为[既有MA账](../multi-agent-2026-09-10/README.md)。
