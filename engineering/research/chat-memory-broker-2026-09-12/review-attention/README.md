# Chat Space / Composer投影 · Human review attention

2026-09-12，仅登记后续投影调整，延续[前端计划](../frontend-plan.md)。本轮不修改生产UI或已交付specimen，不开启实现、部署或新的独立任务。施工基线 `39692d7c34ff3866c4d9a2fe70eb89a13864d496`；读取共享main为 `135492c7d7cf3c0ac634f9248c79530972c53004`，继续在原隔离分支登记，保留其他writer的编辑。

## 输入与证据上限

用户要求：“同时登记 Chat space 和 composer UI 投影调整，以呵护 human review attention”。[附件原文](input.txt)完整保留，SHA-256 `b805cc7bddbfe533a70f8799ceea339d16a8dc6f1a60ea33ba8708ab3d3ecae6`。原文声称检索76个结果/5个方向；本轮没有取得检索清单或原始截图，也没有重跑外部研究。截图拥挤诊断与产品现状说法属于输入判断，不冒称本轮观察。原文外链保留为下一轮局部查证候选，不凭它们确认当前产品能力或引入组件依赖。

## 采用的目标与信息预算

以人工核查注意力为稀缺资源：正文承载理解，待审批、错误、证据缺失/冲突及需要人类判断的变化在需要时优先浮现。减少工具事件、审批回执、文件记录和assistant复述对同一事实的重复强调；不让“正文优先”压过当前必须处理的治理事实。

完成态尝试只保留一个收起的执行摘要与一个消息动作/footer，作为**待测预算**，不是硬性上限。必要的artifact入口、精确来源、失败恢复、版本不一致与待决事实不为凑数量而消失。消息时间、状态、来源入口不属于可整组隐藏的次级动作，继续遵守既有action-only显隐规则。assistant说“完成”不能替代执行、读回或接受回执。

## 五项投影输出

| 面 / 采用方向 | 责任与限制 | 下一轮可测输出 |
|---|---|---|
| Tool disclosure | Runtime事件/工具执行、审批owner及artifact owner分别保持真源。只在同Run及可证明因果关系内聚合，不因相邻就合成workflow；审批通过不等于执行成功，执行完成不等于读回或正式接受 | 同一事实默认重复呈现次数；摘要可展开到完整事件、精确版本与独立回执。等待审批、错误、部分成功、取消请求/已取消分别可辨 |
| Composer与effort收纳 | 输入区加少量一级控件；复用 `createModelPicker`，model与受支持effort进入同一控制树。附加能力只有实际可用/已选择时才出现菜单项或chip；选择资源不等于已披露给模型 | 默认/启用/缺能力/失败状态的控件数量与可发现性；键盘/触屏进入模型、effort与取消路径；切换失败仍保留草稿与身份 |
| Telemetry disclosure | Runtime/provider测量口径拥有来源、单位、时间边界和覆盖。默认按需详情；开发/Eval固定展示仅候选。host首输出与provider TTFT分开，chunk不是token，未知不补精确TPS | 缺usage、仅host时间、真实provider指标、估算四类反例；显示来源与定义，不用stream chunk推算decode TPS；必要错误不随metrics隐藏 |
| Inline-code层级 | Primary/supporting/metadata/machine trace为投影层级候选；code/path/identifier/diff是正交语义。复用现有role与Markdown约束，不以连续opacity或装饰色制造等级 | 长路径/identifier/内联代码/增删差异的扫描与复制；浅深色、200%与forced-colors对比度；文件名可辨且关联真实对象 |
| Motion与阅读连续性 | 只表达空间连续性、实际活动和请求注意。完成步骤静止；FLIP、词级高亮、chip动效均需局部评估，不直接采用外部数值。返回与运行状态各归原owner | 离开底部才浮现回到最新；流式追加不抢滚动/选区；展开/折叠不丢焦点、阅读锚点或草稿；中断和reduced-motion下仍能理解状态 |

自动收起只考虑无待处理异常的完成态；用户主动展开或正在核查的内容不因新事件到达而被强行折叠。摘要按真实回执生成，不凭assistant文本推断文件变化、字节数、批准或读回。收起只改变呈现，完整事件和来源仍能按身份/版本追溯。

## 保留为候选的能力

`Auto / Fast / Balanced / Deep` 不在本轮成为跨Provider标准。其映射、默认值、fallback、成本含义和unsupported行为尚需Runtime/catalog owner逐模型定义；不得把不同模型的同名effort视为等价，也不把thinking开关与effort合并为同一事实。当前先消费真实受支持档位，保留requested/effective/bound差异。

单turn临时override需要明确配置作用域、保存语义与Run绑定回执；现有model picker的“未来runs”语义不能改称“仅本次”或“仅此session”。没有后端支持前只登记，不画可用的override控制。原文示例 `Chat` 模式、Web/MCP/memory入口和active chips同样不能创造capability或跨账号授权。

原文telemetry字段 `ttft_ms/decode_tps/e2e_ms/input_tokens/output_tokens/metric_source` 仅作口径对照，不冻结新DTO。耗时须说明包含排队/工具/网络的哪段；估算不能包装为provider精确测量。缺少有效范围时不作跨模型性能结论。

## 最近先例、范围与验证

遵循[前端连续性合同](../../../design/agent-interface-2026-09-10/frontend-contract.md)。最近实现为 `app/web/app.mjs::renderMessageStream`、`user-message.mjs::renderUserMessage`、`chat-actions.mjs::createChatActions`、`model-picker.mjs::createModelPicker`，以及[三场景specimen](../specimen/README.md)的来源返回/草稿隔离。详细路径沿[本地召回](../final-turn/recall.md)，不新增同义组件或第二个导航store。

受影响grammar为正文/机器事实层级、tool聚合披露、composer能力收纳、指标详情和阅读/动效连续性；改变的是默认投影密度。Session/Run身份、真实effect、审批、来源版本、披露回执与正式接受/关闭权全部由现owner决定。这里的human review attention是人的核查注意力，不新增Attention队列或状态。

下一轮先固定一个真实trace的合成副本，逐项标注owner及重复事实，再做局部方案与独立核查：正常完成、审批待决、拒绝、错误/部分成功、取消、证据缺失与r1/r2不一致，以及用户已展开/选区/离底阅读时的新事件。对比默认非正文元素数量、找到审批/错误/来源的操作步数与核查误读；时间/认知改善只能经实际评测后报告。

实现时按前端合同补1440/1280/390、浅深色、键盘/触屏、200%、reduced-motion、forced-colors，以及消息/Attention共享调用点的定向回归。作者检查与非作者接受分开。本轮仅检查原文hash、登记链接和文档diff，不重跑UI测试或宣称上述候选已验证；不改变Harness在途顺序或新增其前置。
