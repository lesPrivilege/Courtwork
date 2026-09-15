# 异步节奏与Attention Assistant · 增量参考

2026-09-15；接单main `7a47168`。承接[首批参考](form-reference-20260915.md)，本次仅保存新增讨论及检索关系，不施工、不作新采用裁决。登记责任沿Spark研究，Attention相关消费回原owner。

## 输入与增量

同一会话“总结Spark形态” `6aa90852-5b14-83ec-9484-8cf996dca82a`现返回9轮18条消息，`hasMore=false`、`nextCursor=null`。首次默认读取截断正文，已以每条20000字符重读；最终所有消息均无truncated标记。原5轮按完整turn对象逐条比较无修改，新增4轮8条消息。完整阅读新增正文与[新截图](form-reference-20260915/IMG_2472.png)，原快照保持原字节。

[第二次完整快照](async-attention-input-20260915.json)保存9轮原文及元数据，省略重复preview，附件路径改为仓库相对路径。新截图为关于“防止过度工程化却造出新框架”的社交帖；只保存可见内容，不由截图推导普遍模型能力结论。

- JSON SHA-256：`81972a491d4df9eec97f19bbdea16539ced3c0a2e317f8ce0103570a56c76739`
- 新截图SHA-256：`09a8717b62d90d018dda39a86846eedd9fe151529d3e8766dff07045034ce8a9`

## 新增讨论索引

| 新增turn | 内容 | 后续消费归属 |
|---|---|---|
| `92ba62af-81e3-4647-9f59-940b6d68441f` | 异步执行机制、完成事件与模型时间调度能力分开；等待依赖时推进独立工作，Ready Set、basis变化、取消和完成通知节奏 | [RD-005](../RD-005-multi-agent-selection.md)及原Runtime合同；Operation、dependency/readiness草案保持候选 |
| `747940e1-b310-40c6-96c6-2794a98deda4` | Attention Assistant以小型意图/义务投影观察长任务，发现未消费结果；完成不等于读取、消费、纳入或义务满足 | [Attention原任务](../../design/attention-agent-2026-09-10/README.md)、[工作底座](../architecture-node-2026-09-13/workspace-substrate.md)；AttentionFrame与消费阶段不是新增schema |
| `35a0650e-6c40-400e-9e39-656a9222cf30` | Goal记录义务、Scheduler判断可执行、Attention维持相关性；对照意图、核算义务/消费、发现偏移 | [Memory治理](../chat-memory-broker-2026-09-12/attention-governance-20260915.md)与原Attention owner；临时Todo与长期义务关系待映射 |
| `58ec7baf-58e7-4d6a-8da5-5de562695830` | 将高层原则转成当前任务的少量具体约束；在结构变化与完成声明等节点检查，避免治理本身过度工程化 | 原Attention/架构责任；AttentionCheck及Canon→Attention→Worker结构仅为研究假设 |

## 保留的消费边界

讨论中的核心候选关系包括：逻辑依赖不等于执行占用；结果已完成不等于已消费；可执行不等于与当前目标相关；记下目标不等于及时重新激活目标。后续可用这些关系查找真实遗漏与反例，本次不新增调度器、后台观察者、常驻loop或评测实现。

Attention Assistant的观察、提醒、派发Spark与steer建议仍须先映射现有权限、预算、准入、取消及义务关闭owner；草案不能授予新的派发权或正式接受权。用户意图及已接受修订由原记录承重，不能由模型自述覆盖。既有Agent身份、single-active-Run和人审责任保持原合同；不将“低权限观察者”自动等同于已实现能力。

将原则编译为局部约束的建议，不改变现有AGENTS.md效力或架构职责，也不允许Worker忽略适用规则。保留作者关于低频、小上下文、避免第二个Main和新治理框架的设计意图，具体触发点、数据字段与收益待后续任务验证。

原文的OpenAI Async Tool Calling、DeepSeek Harness、Deep Agents 0.5、AsyncTool、TPS-Bench及597条训练样本、14%/6%等数字均为未核外部线索。内部citation不是已取得的网页/论文；本轮没有重新外部探索，也不执行历史会话中的建议。若未来用于选型、训练或评测，先核官方来源/论文版本与实际任务适用性。

## 验证

原5轮与首批JSON完全相同，新增4轮，全部18条消息无截断；附件原字节及哈希核对，文档链接与diff空白检查通过。仅参考归档及索引，无产品代码、公开文案、SE论文或部署变更，不改变既定开工顺序。
