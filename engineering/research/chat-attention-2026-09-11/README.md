# Chat与Attention分工 · 2026-09-11时间快照

用户要求登记入账，部分属于长期roadmap，不做完整裁决；保留时间快照，一笔小单留待稍后合流处理。本轮只保存来源与候选边界，不实施产品或后端，不写跨会话长期memory，不改变Claude Paper预发布工单。

## 来源与时间

会话 `6aa3e21f-3c00-83ec-836a-72d6ed1aa1c0`，标题“Chat与Attention分工”。本次取得5轮、10条消息（5用户／5助手），无附件，分页hasMore=false；原始返回未标文本截断。保留原始createdAt、updatedAt与逐轮startedAt/completedAt，不修正源记录中可能不一致的时间顺序。

- [连接器原始返回](connector-response.json)
- [按startedAt排列的可检索原文](input-snapshot.md)
- [9个外部项目链接](reference-links.json)
- [计数与文件hash](source-manifest.json)

来源助手声称Exa扫描60结果、5条workstream、复核8项目，并给出成熟度、star数、能力与风险判断。这些都是2026-09-11会话中的外部研究主张；本轮未重跑Exa、访问仓库或独立核验，不能当作当前生态事实或选型结论。项目包括goose、chatgpt-use、chatgpt-web-mcp-bridge、Chat-Plus、Agent Inbox、attnbox、gooselake、PanCode、shunt。

## 保留而不全裁

| 来源主题 | 本轮处置 |
| --- | --- |
| 连续对话与静默本地写入／登记／溯源分工 | 长期交互假设；用户明确尚未完全划分Chat与Attention，不用助手总结覆盖这一未决。 |
| Chat／Attention／Spark三个入口 | 产品角色探索；先占位、共享后端只是用户提出的可行阶段，不等于三套运行系统已存在。 |
| Chat personal context／角色化，Attention全局事项 | 保留角色意图；不把personality、memory、全局队列变成新增已实现能力。 |
| 同一Attention对象在Chat内与全局面呈现 | 助手提出的架构候选；对象owner、权限、投影与消费行为待现有合同核对。 |
| ChatGPT Web、Local Worker／Codex桥接、其他网页Provider、可替换Runtime | 长期roadmap和后期选型；不启动桥接、采集凭据、安装社区实现或调用付费provider。 |
| Provider Channel ≠ Runtime ≠ Work Surface | 作为待未来消费的分层假设登记，不能用来源示意图替换现行Runtime canon。 |
| 示例ConversationRuntime.mode、AttentionItem、surface字段及事件因果链 | 来源助手示例，不作为schema/API裁决；不要求今天新增字段或改事件类型。 |
| “Chat作出裁定→静默结算”“Attention是升格地”等表述 | 保留原文，不直接采用为权限或提交语义；实际执行仍依既有授权、completion、review与owner合同。 |
| 对memory的最后纠正 | 用户明确交本地assistant，不把大量探索写长期memory；本次作为repo可检索工件保存。 |

未来消费入口：[Runtime canon](../../architecture-runtime-canon.md)、[RD-005](../RD-005-multi-agent-selection.md)、[Chat阅读工单](../../design/chat-reading-2026-09-11.md)、[前端连续性规范](../../design/agent-interface-2026-09-10/frontend-contract.md)。仅建立检索连接，不修改其当前裁定。

## 稍后合流小单 · CA-01（尚未施工）

触发：下一次已授权UI合流时顺带核对，不单独打断当前Paper发布准备。

范围：检查左侧导航当前Chat／Attention／Spark入口与真实能力；依据当时源码，整理Attention助手的实际名称，并评估／预留纯Chat位点。若仅有占位，应明确不可用／规划状态，不能把现有Attention能力伪装成已实现纯Chat。保留既有聊天历史、路由、键盘入口和后端绑定，不以改标签默默迁移对象。

小单不包含provider/runtime拆分、personal memory、后台settlement queue、Attention schema或桥接实现。合流执行者先读最新HEAD和既有合同，发现命名或入口已调整则记录已覆盖，不重复施工；确有语义冲突由Astra就该小项裁定，不把整篇长期roadmap一并接受。

当前状态：待合流消费；未改UI、未派发新实现任务、未主张此处示例为现行事实。

## 同轮CW图标问题 · 设计建议，未改资产

用户另问CW核心icon是否可在某一横引入红色，尤其最下方短横。当前[canonical geometry](../../../brand/geometry/mark.svg)保持竖笔与长／长／短三行；最下方短横为19.2×9.6，上两横为28×9.6（64网格）。Astra建议优先比较底部短横红：其面积较小、位置较低，可在保留主体黑色的同时形成品牌强调；这是视觉判断，不是定量重心结论或已接受稿。

建议保留单色宗，以固定底部短横红形成彩色品牌变体；与les Privilege的上横红建立同家族、不同角色的联系。不得根据未读数、错误或Review动态点亮品牌红。现有[品牌契约](../../../brand/CONTRACT.md)的actor／record／amendment及八个状态样板已有独立语义；后续若制作，只先在静态品牌实例比较，不一笔全局覆盖--cw-record或review颜色。本轮未修改CW canonical geometry、renderer、favicon、App或Pages。

## 后续授权 · 2026-09-11

用户随后明确由Claude串行施工并顺带加入Chat tab bar。CA-01已进入[正式接续工单](../../release/claude-ui-followthrough-2026-09-11/ONE-SHOT.md)，排在diff与Settings共享预览之后；当前是已授权待实现，长期分层研究仍未全裁。

## 产品理由扩展登记

[新增4轮、累计9轮/18消息的产品理由快照](product-rationale/README.md)固定Chat连续对话与可移植性、Attention跨工作判断、Spark持续来源工作三种用户理由；README小幅补方向，Pages纳入Claude局部文案工单。外部72结果生态及条款主张仍未独立核验，旧快照字节保留。
