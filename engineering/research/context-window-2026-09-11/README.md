# Context Window 产品化 · 待消费输入

2026-09-11 · 用户要求“登记入账，稍后消费”。**状态：已归档、待后续研究与裁定；未派单、未提高实施优先级。** 不影响已授权的Claude Paper串行任务。

## 来源完整性

会话：[Context Window 产品化](https://chatgpt.com/c/6aa3d30b-74ec-83ec-9817-9a0fbc5d9ead)，ID `6aa3d30b-74ec-83ec-9817-9a0fbc5d9ead`。本次取得1轮、2条消息（1用户、1助手）及1张截图，`hasMore=false`，未报告单条截断。preview重复助手回复，不重复计数。

- [原始连接器响应](connector-response.json)：保留来源与实际返回。
- [可读消息快照](input-snapshot.txt)：完整可取得正文。
- [用户截图](reference.png)：已查看，包含context类别/占用/预留/延迟加载与账户usage分区；原图字节保留，不推断其中示例数值为CW真实遥测。
- [引用链接](reference-links.json)：原回复中的外部来源清单；本轮仅归档，未复核链接内容、PR状态或协议成熟度。
- [来源清单与hash](source-manifest.json)。

## 稍后消费的主题

下列均为源会话中的问题与建议，尚未成为Astra产品裁决或已实现接口。

| 输入主题 | 留待后续处理 |
|---|---|
| 用户询问Context Window是否进入composer及成熟范式 | 结合CW实际composer、现有context/usage入口和运行时能力决定是否及如何进入，不直接接受原助手“一级语义、优先级不低”的结论 |
| composer meter → Context Inspector → compaction timeline | 比较常驻密度、百分比可读性、渐进披露和历史事件表达；不把占用下降自行解释为压缩完成 |
| context与quota/cost分开 | 核对session/window遥测与provider/account计费的来源、命名与口径，避免一个百分比混用两种资源 |
| used/size、reserve、free、included/deferred、类别breakdown | 核对运行时可提供字段及measured/estimated/unknown语义，检查重叠分类、预留和缓存计数口径；示例数字、阈值与名称不是合同 |
| Matter projection与per-source provenance | 区分正式状态、可用资料和实际本轮投影；“Agent知道什么”是待审文案，不能由资料可访问性或token估计直接证明 |
| CompactionEvent与当前UsageSnapshot | 分别核对快照、事件生命周期、持久化、before/after口径和保留内容可见范围；源回复给出的DTO只是候选 |
| 小环、百分比、横向堆叠条和压力色 | 待实际数据合同与界面先例确定后比较；不预先写死全局阈值、配色或所有runtime必须提供分类 |
| Claude Code / Codex / Gemini CLI / Cline / ACP | 引用已固定；成熟范式、PR演进和RFD状态均待按原始来源验证。会话中的“已探索”不等于本轮已核验 |

## 后续入口与边界

后续正式消费时，从[实际架构](../../architecture.md)、[Runtime/Work裁定](../../architecture-runtime-canon.md)、[RD-001](../RD-001-runtime-adapter.md)与[RD-003](../RD-003-work-surface.md)进入，核对现有source/owner后再决定是否需要后端接口、设计合同或工单。UI落地先读[frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md)和相关先例；此处仅导航，不修改这些合同。

本次只保存来源、主题和待验证项，不调用外部研究、不运行模型/provider、不制作UI、不改schema、优先级或Claude派单。未来消费须重新核对实际branch/HEAD与当时交付，不能从本登记推断功能现状。
