# 合同入口与未交付扩展

已实施部分不再以“草案”模糊其字段：见 [coordination v1生产合同](../../../app/docs/coordination.md) 和 [Astra裁定](README.md)。此页只保留下一阶段扩展的边界。

1. `ChildExecutionSpec` 当前支持 version1 / invoke / origin(Thread, Session, Run) / 精确adapter版本 / 输入 / grant / deadline。生产调度必须先持久intent及provider runtimeRef，明确dispatch尝试与recovery query；不得将当前进程内helper当可恢复任务。
2. `ExpertInvocation` 可以调用现有Work Contract，但必须由host冻结目标与来源scope、effective grant及input coverage。绑定domain的Session当前不暴露消息工具，不能用它绕过ES完整输入覆盖。
3. `OwnershipHandoff` 与message/child invoke独立；需要旧owner/new owner、expected revision、accepted handoff事件与失败恢复。没有被本片实现。
4. `CoreCrossMatterEnvelope` 若携带正式proposal/action，复用目标Core policy与CAS。只有同一Core事务能声称“本地正式转换与outbox原子提交”；当前Runtime通信没有这个后果。
5. `WorkflowSpec/Run` 仅执行控制流；不接管Matter facts。`FindingBundle` 可接synthesizer，但后者输出新proposal，不覆盖原conflict/evidence。
6. `cw.*` 因果身份与OTel字段适配分开，raw内容默认不进入未来telemetry导出。本片只有本地来源身份和已存在的request测量。
