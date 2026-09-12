# Chat Memory Broker · 长期架构增量登记

2026-09-12；Astra裁决，基线main `1213fdf11bc66919e0e2336040467177eded5220`。[用户输入索引](input-notes.md)是本轮直接粘贴讨论的主题摘录。结论：**不涉及本次发布面定义修订，只登记并接入已有合同/PR文稿，供后续消费。** 无新产品实现或能力接受。

## 与现有Chat定义的关系

[Chat产品理由](../chat-attention-2026-09-11/product-rationale/README.md)已包含本地会话、来源、可携带与跨Provider memory方向；本增量解释如何消费同一套受治理context，没有新增另一个Chatbot产品或要求替换现Harness。当前发布的Chat页面以持续对话、保留引用、交接给工作为叙事，不承诺Memory Broker已经可用，因此不用改README、Pages或已接受媒体。

长期组合可记为 `Provider Session + Local Conversation Projection + optional Governed Memory Sidecar`。optional表示通道与用户授权允许时启用：没有该能力仍是可用的Chat方向，不把所有网页Provider都宣称支持隐藏context。现普通项目Session和未来跨Provider Conversation身份继续分别核账，不通过改名产生迁移。

采用以下责任分工；它们是逻辑接缝，不要求新建四个服务或第二套数据库：

| 责任 | 采用边界 |
|---|---|
| Conversation capture / projection | 保留获准捕获的原始出处、source conversation/turn定位、版本与coverage；缺失/截断明确标注。缓存产出不自动变成长期memory或正式事实 |
| Memory / Matter sources | 归既有或后续明确冻结的状态owner；Matter正式状态继续Core，个人/Chat-local memory沿BE-19，不归MCP或Broker；不会把所有偏好强制变为Core Artifact |
| Memory Broker | 在每次检索和读取时执行身份、范围、版本、披露预算与审计；只组合原owner合法reader，不成为新的memory权威库 |
| Context Compiler | 选择获准版本、按实际channel能力编译本次输入，记录manifest；复用LG-02/context接缝，不拥有新的agent loop，也不等同完整Work Compiler已实现 |
| Provider adapter | 只承接已验证通道的协议与实际回执；MCP/App/Connector/Tool API是可替换访问方式，不授予数据权限 |

`Event Log ≠ Memory/State ≠ Compiled Context ≠ Visible Conversation`作为既有边界的直接消费，不修改[PAPER语义基线](../../../PAPER.md)或[DEC-013](../../architecture-runtime-canon.md)。

## 本轮裁决与需收紧的输入

1. **采用模型可见与CW可见分离。** 内部context不伪装成用户发言，也不默认渲染为普通assistant消息。这里的ephemeral仅指本次编译用途，不保证Provider不保存、不训练、不在原生UI显示工具记录；传输仍是向该Provider披露，不能用隐藏投影绕开用户授权。
2. **采用Broker渐进读取。** 初始候选是有界search与exact revision/range read。get_thread/get_matter_state只在既有reader可表达的权限内组合；首片不暴露任意文件根、SQL、全库export或provider任意指定的scope。工具名只是示意，不是已冻结API。
3. **检索结果是数据。** 历史对话、附件、网页或memory中的指令不能修改policy、增加scope或变成高优先级system规则。模型提交query、scope或conversation_id都只是请求，可信principal、连接和grant由Host/受信通道绑定；若通道不能证明当前conversation，不伪造turn归属，缩窄到可验证grant或拒绝该能力。
4. **跨Provider合流不跨安全域。** Provider通常是来源维度，但账号、租户、项目、会话和授权边界仍需保留；换Provider不自动继承全部旧对话读权。Personal/current Matter/related conversations都不能仅凭标签默认allow，关系也不是披露授权。search结果、计数、缓存和游标不得泄露隐藏对象；read再次检查撤权和源版本。
5. **缓存与保留分开。** 自动capture须有明确授权、范围和保留规则，遵循来源coverage；BE-20 temporary chat不读写持久memory。capture、index、memory consolidation、compiled context各有生命周期；删缓存不能删除历史接受证据，停用connector不能承诺撤回已外发内容。
6. **写入只先提案。** propose_memory是未来命令候选，目标、来源版本、主体、幂等/并发、冲突与决定回执先沿BE-19/LG-03冻结。普通偏好由其memory owner决定；正式Matter结果仍通过Core Candidate/Review。相似文本、模型同意、provider工具成功均不自动accept。
7. **凭据排除是实现边界，不是口号。** Broker不接credential store或任意私有文件reader；获准对话本身仍可能含敏感文本，需来源分类、字段/内容披露规则与负例，不能用输入中的“credentials impossible”替代检查。
8. **可审计不等于可窥知模型。** 记录选择/拒绝的可解释策略原因、源版本、compiler/policy版本、预算/截断、目标连接与通道实际提供的发送/读取回执；不补造模型内部检索理由或实际使用证据。Provider原生memory无证据时是unknown，不显示off。
9. **传输另定。** 远端Provider不能因登记了MCP就默认能访问本机localhost。正式实现前冻结受支持的本地/远端传输、身份绑定、授权撤销与网络边界；本轮不开放端口、公网代理、connector或Provider注册，也不声称特定供应商当前支持某种接法。

这些是CW设计约束；本轮未做外部协议/供应商功能或条款核验。更低token成本、改善跨模型连续性等动机须在具体fixture/profile下测量，不预先作为发布效果。

## 消费到既有PR文稿

2026-09-12读取实际远端open PR列表为空，本地活动开发分支只有main；相关文稿已经随RD-007等合入main，没有待合并的独立相关PR。以下是既有路线的消费补充，不新造平行工单或提前排定实施顺序。

| 既有入口 | 本增量接入点 | 实现前的最小证据 |
|---|---|---|
| [BE-19 / BE-20 / BE-23](../../mvp/execution/work-surface-kit/backend-requests.md)及[Chat原方向](../chat-attention-2026-09-11/product-rationale/README.md) | Memory owner、temporary语义、普通Chat身份；capture/用户授权和关闭入口 | 两个独立合成Provider来源的conversation/revision/coverage；跨范围拒绝、重复捕获与temporary隔离 |
| [RG-BE-01/02/03](../mature-practices-2026-09-12/pr-plan.md) | exact来源/消息引用、retention与目标owner关系 | capture不是memory、旧版本仍可定位、删除/撤权/缺件不可由当前内容补造 |
| [RG-BE-04](../mature-practices-2026-09-12/pr-plan.md) / [LG-02](../local-governance-2026-09-09/pr-plan.md) | Broker只读query/read、预算context、来源manifest | query成功后撤权read拒绝；同名ID跨scope、旧cursor、预算截断、恶意来源指令、无命中coverage |
| [LG-03](../local-governance-2026-09-09/pr-plan.md) / BE-19 | propose_memory与实际目标owner的决定接缝 | 重复/冲突提案、源已变、模型直接写长期状态被拒绝；Matter接受仍走Core |
| [GUI控制面](../gui-agent-control-plane-2026-09-12/README.md)与[Runtime索引](../../release/harness-next-node-2026-09-12/README.md) | 注册/连接仅暴露获准能力；明确现有MCP客户端接缝不等于已实现Provider侧Broker服务端 | unsupported channel明确拒绝；可信身份绑定、撤销、错误/未知结果、端到端实际SDK证明 |

先冻结单一只读合成纵切：来源A的获准片段→原owner exact reader→连接B在限定grant内检索/续读→披露回执→CW按事实显示。该场景尚未派工；真实Provider注册和调用不因本登记而执行。其后才决定proactive compile、跨通道试验和提案写入；用户对下一Harness节点的独立审阅/排单保持。

## 后续界面语义候选

Turn context inspector仅登记，未绘制或接线。按[前端合同](../../design/agent-interface-2026-09-10/frontend-contract.md)复用最近已实现的[Runtime详情](../../../app/web/runtime-view.mjs) `renderRecordedContext`（旧binding缺席保持unknown）和[Settings事实/权限](../../../app/web/settings-view.mjs) `settingsRow` / `preferenceProvenance` 披露方式；popover仅采用先例索引`popover.inspector`已适用的connection/context行为，不外推为已统一通用Inspector；受影响的是Projection/Control与渐进披露grammar，Review语义不变。

需要区分eligible、selected、disclosed/returned和confirmed consumed。只有实际回执可显示“已披露给本次请求”；不能因为search返回3项就标“Used for this response 3”。用户可按需查看出处、版本、范围、截断与unknown；未验证能力不画可用开关或固定示例数量。未来UI另按实际owner DTO、最近先例和截图验证，不以本轮文字登记声称UI验收。

## 本轮验证与边界

本轮仅文档检查和作者裁决，无非作者产品验收、运行时测试或真实Provider调用。检查记录见[verification](verification.md)。发布源、App、brand、schema与原始历史快照均保持；不存在因本文而关闭的Memory、Chat或通用Harness产品门。

整体模型接续见[governed work loop](../../release/governed-work-loop-2026-09-12/README.md)：Court是共同工作范围，不是把conversation、protocol state和正式Matter塞进同一owner；物理可用不授予披露，自动capture/治理写入仍待具体合同。

2026-09-12补充：[Chat薄能力层裁决](thin-capabilities.md)将可选search/retrieval/user connectors限制在讨论与上下文取得；Chat与Agent互补，不把网页产品视为裸模型。设置分类仅候选，实际effect/权限与handoff仍沿原owner，未改实现或发布面。

2026-09-12最后一轮补充：[来源登记与采用](final-turn/README.md)拆开原生容器和资料能力，逐项接入原owner；[前端先行方案](frontend-plan.md)提供结构图、状态到合同的映射与跨Chat消息操作规则。独立分支登记，不表示资料/容器实现或产品接受。
