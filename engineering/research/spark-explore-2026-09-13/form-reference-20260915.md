# Spark形态与Context/Handoff · 参考登记

2026-09-15 · 状态：仅登记以备参考，不施工。接单main `caf3edbceb8cf9b535a28c547088874852752a1e`。本次负责保存输入和检索入口，归属现有Spark研究；最近先例为[协作瓶颈登记](coordination-20260915.md)。不产生新的采用裁决或跨层改动。

## 来源与保全

会话[总结Spark形态](chatgpt-conversation://6aa90852-5b14-83ec-9484-8cf996dca82a)，完整返回5轮、10条消息，`hasMore=false`、`nextCursor=null`。已阅读全部正文及[附件截图](form-reference-20260915/IMG_2469.png)。[结构化原文](form-reference-input-20260915.json)保留返回的消息正文、turn ID、时间及最新在前顺序；去掉重复preview，将临时附件路径换为仓库相对路径。附件原字节保存，截图下方被截断的原帖没有补写。

SHA-256：

- 原文JSON：`4c11e03a4cd2d0e27189c16db31325585fd3f06d24ef68d0419c3baf9211750d`
- 截图PNG：`b5bfee4f9c7824ce9b8f74baf7c11d6bd591e506698e7d40804447e7bb367911`

会话中的“建议冻结”“建议Codex入账方式”、合同YAML及外部探索请求均为历史输入；本轮遵循用户的参考登记范围。内嵌search/filecite标识保留在原文，未取得其对应网页和文件；不声称已照回这些历史资料。供应商版本、性能、token倍率、研究失败率与“成熟共识”均未在本轮核源，不作为采用或能力证据。

## 对话演进与后续检索

| 顺序 | 输入内容 | 参考用途与原owner |
|---|---|---|
| 1 | Muse、Codex-Spark、Flash、Haiku的模型与后台执行谱系；初提throughput-first | 供应商与性能线索，待核版本与适用条件；接[RD-005](../RD-005-multi-agent-selection.md) |
| 2 | 用户指出CW定义已外推，回答修正为持续工作空间中的有界准备角色 | 后文明确修正首轮吞吐优先定义；对照[Spark设计](design.md)与[既有协调记录](coordination-20260915.md)，不把脱敏/常驻愿景当作现有能力 |
| 3 | 截图讨论handoff损耗、context boundary及Fresh/Fork；回答提出Workstream、Context View、Handoff、Receipt | 保存产品语义候选，后续先映射现有任务/Run/成果/权限owner；不改Agent身份与责任合同 |
| 4 | 外部Explore快照：continue/fork/fresh、SDK handoff与agent-as-tool、A2A、provider Thread、并发提交、失败种子 | 接RD-005、[工作底座研究](../architecture-node-2026-09-13/workspace-substrate.md)与[RD-007](../RD-007-resource-governance.md)，核源后再供具体任务消费 |
| 5 | CW/SE治理语义的权重及复利；提议semantic impact分类 | 保存为方法假说。未建立新分类字段、SE论文结论或成本降低实测；现有[产品方向](../../product-direction.md)保持其已裁定范围 |

## 待消费问题

- 上下文边界能否独立形成可核查任务；continue/fork/fresh是否可映射为现有上下文构造策略。Fresh不继承父对话与从工作记录取材的关系，可对照[Memory治理](../chat-memory-broker-2026-09-12/attention-governance-20260915.md)。本轮不新增模式枚举或执行API。
- Workstream/Lane是否同义、跨Run连续性由谁负责；Handoff/Receipt如何对应已有TaskBrief、FindingsBundle、ConsumptionReceipt及正式状态。会话草案不是新数据库对象或状态机。
- “Agent只是metadata”“只有authority才升级Attention”可能压平已有身份、权限与待办事实；后续消费须保留原owner边界，不能由此删改Agent或Attention语义。UI命名建议留在原文，不登记组件改名工单。
- 并行探索、隔离候选与提交仲裁可作为未来核查问题；原single-active-Run、授权、取消、外发和独立验收约束不因参考登记改变。失败种子须绑定具体任务与证据后才能形成评测。
- 语义稳定性与“复利”可供后续判断排序；尚无本轮实测，不能将候选名词自动列为既定canon。

后续有具体研发任务时，由原owner读取本记录和原文，核对精确外部来源、当前合同及反例，再作采用/调整/拒绝/延期处置。本次不新增路线图，不改变当前开工顺序。

## 验证范围

核对5轮10条消息与读取结果一致、附件字节一致、JSON可解析，执行文档链接与diff空白检查。仅原文归档及索引修改，无产品代码、公开页面、SE论文或部署变更；本记录不作独立产品验收。
