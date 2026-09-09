# 设计方法与 Chat Space：讨论消费索引

2026-09-09。读取基线 `main@f9bafb697f0ee7d7859914e44a83a581bca1ae23`；本轮为研究入账与设计交接补充，沿现有前端单 writer 队列消费。

## 来源与覆盖

[设计索引方法论](chatgpt-conversation://6aa1211c-2a18-83ec-a9b0-5f4e8bf73a57)完整读取5个turn、8条文本（5条用户、3条回答）；接口单页hasMore=false，无truncated标记。两条Download/局部UI追问没有独立回答，其内容由最后一轮继续讨论，不补造缺失回复。

逐字快照及用户截图仅留个人项目private/sources，不复制到产品仓库。文本 `chat-space-design-conversation.md`：2061个换行、49592字节，SHA-256 `47d44134349301a5a8e3784774b79b491f1760f040e5cca065d88d1402b28ebe`。截图 `chat-space-design-screenshot.png`：SHA-256 `9ed16f0ef6bce3ca6d3ad84e711933897504ded553bc309d91094fbbc9a6766d`；Astra已目视，支持“长用户文本可按标题、列表和代码块阅读”的设计观察，不证明其底层选型、交互或可访问性。

| turn | 输入与回答范围 | 入账位置 |
|---|---|---|
| `670e0cb3-81f6-40ce-a9e7-720a80f42346` | How I Design with AI全文；约束、差异方案、减法、showcase与preview方法 | 既有WK-112交接与设计文档；外部出处见来源索引 |
| `e5ca4780-e333-49d7-ac3c-c10042cc0dba` | 用户Markdown截图及MR-000…018选型建议 | 消息原文/显示分离、静态/流式差额与候选依赖 |
| `1046840c-b65f-4812-9f01-7dbe991834cf` | output Download选型追问 | File/Artifact的确切字节与下载接缝 |
| `7bab7981-1c03-4d09-8dd0-7ab9e5f86bf4` | 补充局部UI | 现有控件、Inspector与状态示例 |
| `ebdc1bfc-29fb-4541-9641-b1153fc0302c` | Ask User及Chat Space十类局部；问答/授权、成果/下载与生命周期 | 现有服务owner、显示适配与反例，不新建通用权威对象 |

[来源索引](source-index.md)逐项区分原文URL与本轮有界核验。原回答自述的36、约62和71条Exa搜索结果没有原始结果清单，不计作本轮已读来源；“canonical / P0 / freeze”均属原讨论建议，不自动成为本仓合同。

## Astra消费裁决

1. **方法接入已有交接。** 约束、正反参考、结构差异方案、减法复核和状态样例可供Claude消费；复用WK-112与现有design/工作面kit，不再建立另一套设计系统或强制所有小修先探索多版本。反馈是局部缺陷则直接修；改变布局/状态约束才回到相邻方案比较。运行预览优先使用隔离fixture，材料中的“真实数据/preview deploy”不构成读取个人数据或部署授权。
2. **Markdown是显示能力。** 原文仍由既有消息存储持有；静态、流式和编辑是不同生命周期，不能仅按角色定义能力。用户消息可读性值得接入现有字阶/密度设计，但新parser、GFM全量、消息编辑/分支都需要各自范围与证据。当前已有marked + DOMPurify与GFM，先评估复用；markdown-it、Streamdown等保留为替换/扩展候选，不因入账安装依赖或迁框架。原文、copy与edit语义先核实；渲染后的HTML及只读任务框不得回写正式状态。
3. **Chat局部复用owner。** CS-01…10可作设计检查表，不能替换当前消息、question、permission、run、File、Artifact和Core对象。共享外观/交互壳可以显示不同服务事实；不新增一个`InteractionSurface.status`数据库承接所有正式生命周期。
4. **回答、授权、执行、接受分别成立。** 普通ask_user回复不能替代确切工具许可；MCP的`accept`是该协议中的输入动作，不等于Core成果接受。界面可以在有服务回执后压缩历史，但“已批准”不能显示成“已发送”；decline、cancel、expired、error也不能先造状态再要求后端追认。已授权策略内的维护沿既有合同执行，不增设泛化human gate。
5. **下载绑定确切成果。** Preview与原始文件必须区分身份/表示关系，不强制每个文件都存在两份对象或两套API；若预览本就是原文件，允许同一字节来源。下载需明确版本、文件名、MIME与实际bytes，避免预览转码冒充原格式。缺失/过期/无权限时应显示真实不可用状态；下载成功、文件生成与正式accept互不替代。
6. **渐进增强与可访问性。** pending展开、resolved收敛、输出不抢焦点都作为局部候选，以确切回执、可回看详情、键盘焦点和长内容/窄屏验证为条件。后台进度未知时不造百分比。外部认证只登记协议适配候选，不在聊天表单收集凭据，也不把链接出现当授权完成。
7. **Paper不修订。** 本单是实现参考和设计方法，没有发现现有治理原则无法表达的新事实；不改SE正文、Practice Index或本仓PAPER.md采用版本。

## 消费与验证

[当前实现映射](courtwork-mapping.md)标出代码/契约、已有与待做、owner及首个反例。CC-W、CC-D0-a、FE-05a、FE-05、CC-I继续既定串行次序；未覆盖的消息/下载接缝先由Astra按既有后端台账界定，不能由本研究自行插单或把规划画成可用操作。与[AM](../architecture-maintenance-2026-09-09/README.md)、[LG](../local-governance-2026-09-09/README.md)、[Attention](../attention-2026-09-09/README.md)共用边界。

Luna负责来源核验与本地映射；Astra完整消费文本/截图、作关键裁决并整合。仅核验文档路径、来源覆盖、hash与diff，不运行产品/provider测试，不声称UI独立验收；未部署、安装外部项目或启动新施工会话。ES-01及G1–G5保持原状态。

后续[CodeRabbit Review Surface PR准备](../review-surface-2026-09-09/README.md)补充对象范围、证据定位与历史版本阅读；与本包共用既有owner及前端队列。
