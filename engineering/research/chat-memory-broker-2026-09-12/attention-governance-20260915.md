# Memory披露与合理遗忘 · 增量登记

2026-09-15，Astra消费与裁决；Courtwork main `7e1a1ff047721e1ca6c871deba7f367ccea55a06`，已有在途修改保留。用户要求将「Agent可视化编排方案」新增量入账，并补充「Chat状态可视化编排」引用。本轮是研究登记，无产品施工。

## 来源差量

[最新输入快照](attention-input-20260915.json)为会话`6aa8c9be-e828-83ec-966f-50ce14e6216f`完整9 turns/18消息，无返回附件，hasMore=false。与[首轮4 turns](../review-surface-2026-09-09/visual-orchestration-input-20260915.json)按turn ID及完整items比较：原4轮均无修订，无删除，新增以下5轮（时间顺序）：

| Turn ID | 新增主题 |
|---|---|
| 596bbeb7-4d9c-4679-87d7-b91f4e5f8cc0 | Memory policy、交互目的与scope；Notes及repository治理分工 |
| 40f702a4-e603-4f52-bf61-7e2ea5e7fa6a | 不召回策略、相关性门控、按任务请求与可解释披露 |
| 2d701647-810c-484c-8fd0-b77e5a4ede11 | disclosure profile、Attention Contract候选、渐进披露与人机注意力 |
| 6811e275-aadd-45e9-b184-1e36458f3219 | 保留/召回双门、休眠、状态代谢与知识进入可执行结构 |
| 6c83a825-71f9-444e-b081-931b2371a287 | 可触达与实际激活分离、可重建表示与有损但可追溯压缩 |

第二会话`6aa76e0c-3c90-83ec-9d15-2ed027159801`[本轮返回](../review-surface-2026-09-09/chat-states-recheck-20260915.json)仍为2 turns/4消息，hasMore=false。两个turn完整items与[9月14日快照](../review-surface-2026-09-09/chat-states-input-20260914.json)一致，**无新增或修订文本**，继续[原Presentation裁决](../review-surface-2026-09-09/presentation-20260914.md)。本次没有重新读取图像，不扩展原附件目验结论。

## 责任、先例与处置

沿[Memory Broker原合同](README.md)的BE-19/20、LG-02/03与Context Compiler接缝；内容保留/Notes接[RD-007](../RD-007-resource-governance.md)，按需读取与精确版本接[Workspace Substrate](../architecture-node-2026-09-13/workspace-substrate.md)。[Spark实际合同](../../../app/docs/spark-agent.md)已有Assignment内immutable notes及有界读取，是局部先例，不等于通用Memory。正式状态与动作继续原Core/domain owner；不新建Attention Controller、全局Memory库或独立agent loop。

| 输入 | Astra处置 | 采用范围与实施前证据 |
|---|---|---|
| Memory不作system of record | adopt | 自动摘要、偏好、模型推断保留来源、效力类别与版本；重复被召回不提高权威。Notes帮助定位复用，正式决定/代码/测试各回原owner。 |
| 按Chat/Research/Coding/Matter工作方式披露 | adopt / adjust | 任务意图决定候选范围、相关性与预算，不以persona模拟权限。用户/项目/会话/对象scope和访问控制继续分轴；合法可读不表示应激活，相关也不能授予权限。不冻结person/workspace/expert/runtime为新scope枚举。 |
| Memory永远Pull、不允许Push | adjust | 采用“Memory不能自行获得Context注入权”；由本次任务与受信policy控制请求/选择。允许未来经明确合同的预算内预取或编译，不将绝对Pull禁令覆盖原proactive compile候选。模型请求不是grant。 |
| Attention Contract与L0–L4 | adopt / adjust | 作为原context manifest/policy的候选设计维度：任务、权威来源、resident、可检索/抑制范围、工具及review/escalation引用。不是新的authority或强制五态层级，不与人的Attention产品对象混同；字段/schema未冻结。 |
| non-retrieval / suppression policy | adopt | 即便语义相似，无关、已取代或不适用来源默认不进入普通召回；显式历史查询可在权限内读取旧版本。suppression只限制激活，不得借此隐去任务必须保留的约束、未决义务与真实错误。 |
| Retention ≠ Recall ≠ Activation | adopt | 原owner决定字节/版本保留，Broker检查当前权限与返回候选，Compiler按任务/预算决定实际披露。eligible、selected、disclosed及confirmed consumed分别记账；不虚构模型内部使用理由。 |
| hot/warm/cold与scratch→note→promoted | adjust | 采用保留、相关性、来源效力、用途分轴。原文链是讨论模型，不是全库统一生命周期；superseded不抹旧决定，archived不等于拒绝合法历史访问，promoted不绕过Core接受。 |
| 合理遗忘扩大触达面 | adopt / adjust | 先实施可撤销的降权、停止默认激活、归档投影及可重建索引；当前不删除任何历史字节。未来GC仍沿RD-007的引用/hold/历史接受/in-flight检查和dry-run，未知依赖阻止删除。源URL存在不是可重取保证。 |
| 可重建图表可不保留全部绘制中间态 | adopt / adjust | 接原导出合同；先证明精确数据版本可读、spec/renderer/theme/依赖版本可用及重建范围。唯一观察、被引用或已接受表示不能仅因有recipe就删；重建失败显示missing/unknown。 |
| episodes→Notes→policy/schema/test/code | adopt / adjust | 作为治理沉淀方式，逐项由原owner审阅、保留来源及替代关系；不让自动distill写AGENTS、改validator或接受自己的结论。旧反例退出默认Context不撤销必要证据。 |
| memory debt / state metabolism | adopt / defer | 可作为问题描述，不新增产品服务、状态或未经测量的指标。先用固定任务比较无Memory、受控召回与无门控召回的相关性、遗漏和成本，再谈效果。 |
| Frontier/provider黑盒、人类dream/attention优劣 | defer | 保留为用户观察与原回答的工程类比。本轮不研究神经科学或供应商内部实现，不采用“已解决”“全量必然污染”等普遍效果断言。 |

## 后续原工单的最小验证

在Memory Broker原只读纵切内补fixture，不重排当前RD-006与Presentation工作：

1. 同一“用户不喜欢这种写法”分别来自临时Chat、项目API讨论、Matter表述限制。Coding任务只取适用且获准的版本，不把局部反馈扩成全局偏好；无Memory仍能工作。
2. 源摘要被再次摘要不得升级为事实或新权威；新版本取代旧版本后普通查询不误取旧结论，明确历史查询仍能回到精确旧源。
3. 查询命中后撤权，read/compile重新拒绝；相似度、source links、缓存、计数和摘要均不得复活权限。无命中、缺件与预算截断明确记录。
4. 分别记录候选、抑制理由、选中与实际披露版本/预算。人可按需理解为什么出现，并在真实owner合同支持后限制后续使用；不先绘制假开关或把returned称为used。
5. 归档/降权后精确引用仍可解释；重建失败不以新网页或新版本替换历史字节。GC只做计划与dry-run，受引用/受hold/未知依赖不删。
6. 比较正确回忆、无关召回、必要约束遗漏、冲突/过期来源与实际token/延迟成本；保留无Memory基线。人类页面沿原Run聚合和渐进披露，不能用摘要隐藏待决事项或制造虚构阶段。

这些是待实施验收条件，不是已运行测试或新的全局gate。纯文档登记按[verification](../../verification.md)核差量、来源路径和diff；无新schema/工具/后台记忆任务、provider调用、产品或论文修改。Astra本轮整合，不把前轮Luna探索署名当作本轮非作者验收。

## 验证回执

- Python按turn ID与完整items比较：第一会话新增5、删除0、旧项修改0；第二会话新增0、删除0、修改0。
- `node tools/check-doc-links.mjs`通过：1343文档、7426链接；`git diff --check`通过。未跑产品测试或浏览器，未commit/push。
- 9轮输入快照SHA-256：`00b729b76a7e3fe578de9ab1da6a3e43b17e233b1f217a0f4ac045bd476efeb7`。
- Chat States复核快照SHA-256：`89339b87022334e8b789a1eeca4a3a54ce1b2af384628b078bbe4569b939290e`。旧快照字节未改。
