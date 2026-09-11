# 三个产品理由与发布面处置

2026-09-11。来源为“Chat与Attention分工”扩展快照：[完整原文](input-snapshot.md)、[连接器返回](connector-response.json)、[时间/计数/hash](source-manifest.json)。此前5轮/10消息的归档保持字节不变；本次累计9轮/18消息，新增4轮围绕结构化消费、Provider Session封装、本地会话与memory可移植性。用户明确三个产品理由已经建立，允许登记，并询问README及其他发布面是否修订。

## 产品理由登记

| 产品入口 | 用户的问题 | 产品理由与边界 |
|---|---|---|
| Chat | 我想和谁持续交谈？ | 用户主导连续对话；长期方向是减少历史、身份与memory被不同供应商客户端割裂的成本，让对话可引用、可携带、可交接。多Provider统一会话及memory不是当前已实现能力。 |
| Attention | 哪些事情值得我处理？ | 汇聚跨工作的变化与判断对象，让依据、版本和可用动作一起出现；不是另一个必须时刻陪聊的人格。沿既有Attention/Review owner，不把所有Attention都收窄为强制人工审批。 |
| Spark | 哪些工作可以持续替我推进？ | 围绕稳定来源与派生知识，把重复维护变成可持续的工作；当前来源/派生视图与未来routine/调度能力分开，不改写Spark为已交付通用后台agent平台。 |

这三者是入口的产品理由，不替代Matter的工作对象、Runtime的执行责任或Expert的专业契约。底层可以暂时共享，不以三种体验推导三套runtime/store/schema。Chat讨论与真实操作/正式接受继续由既有授权与状态合同区分。

## 发布面裁定

- README现在小幅修订：增加清楚标为产品方向的三入口段落，保留Matter/Runtime/Spark现行事实与运行说明。不把README改成外部生态报告。
- Pages加入已授权Claude串行工单，沿当前Home双原子与Tour读序做局部产品文案编排；Chat明确为规划方向/前端预留，不能和已接能力混为同一完成状态。不新增三套agent的营销承诺，不重开Hero/全站架构大改。
- Features/功能表仅列真实能力；多Provider会话、memory、导入导出、Web封装不进入现有功能勾选。需要讲远期价值时放Ideas/方向语境。
- 架构canon、PAPER、runtime schema及正式能力清单本轮不改。未来探索按conversation合同、导入导出、provider接入、memory治理分别展开，本文只登记检索入口，不采用来源中的示例字段为合同。

## 对新增研究主张的处理

来源助手声称Exa约72结果并推荐ChatALL、multi-ai-chat-desktop、Kept、hstry、Context-Sync、ChatHub、SillyTavern、RisuAI、chronicler；star、成熟度、能力与提供方条款均未在本轮独立核验。完整保留来源，不用于对外证明“成熟可用”或当前法律结论；实际选型再核官方来源与允许的接入方式。产品理由不依赖某种未经确认的网页自动化。

对话投影不等于provider内部执行证据；plugin/sandbox不等同一段提示词，conversation portability不等于迁移私有memory、sandbox或tool trace。本轮不读取登录态/个人存储、不安装社区项目、不运行provider，也不写长期memory。

## Claude Chat小单的相应修订

[既有串行工单](../../../release/claude-ui-followthrough-2026-09-11/ONE-SHOT.md)继续先做前端位点，不抢做后端。新Chat产品方向独立于既有项目session/chat；不能仅把现有coding会话改标签就称跨Provider Chat已实现。占位说明用真实的规划文案，避免来源shell里的“Memory Local / Handoff Available”假可用状态；保留现有普通聊天与Attention入口行为。

## 独立页面追加裁定

用户进一步要求Chat具备与Spark/Attention同级的页面和专门视觉设计；见[Astra先行裁定](../../../design/chat-product-page-2026-09-11/DECISION.md)。此前仅占位按钮/Pages局部文案的最小交付升级为独立页面及同一Design系统增量绘制，后端边界保持。

## 2026-09-12 · Memory Sidecar增量

[Local Memory Broker登记](../../chat-memory-broker-2026-09-12/README.md)细化既有跨Provider连续性方向：可选受治理检索/编译，内部context与可见对话分开，Broker不持有第二份memory权威状态。通道能力与可信身份先验证，已披露不冒充模型实际使用；本轮只接BE-19/20/23、LG/RG既有文稿，不追加发布面定义或产品实现。
