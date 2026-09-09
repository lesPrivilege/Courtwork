# Review Surface：CodeRabbit 自研 PR 准备

2026-09-09；读取基线 `main@a7a08f035cc5a716b8c7a93024cdfe4e44e4c07d`。用户授权将讨论转为自研 PR 入账；本包登记实现边界、消费次序和验证反例，尚未实现产品或创建远端 PR。

## 来源与覆盖

完整读取[分析CodeRabbit巧思](chatgpt-conversation://6aa163f5-b608-83ec-8c4c-0c5029bb7888)：1个turn、2条文本，无附件，接口hasMore=false、无截断。turn为 `c270619e-9c15-43b8-959e-30578ecf5eae`。原文15项机制、6个显式URL均已入账；原回答自述Exa 30条结果不等于本轮已读30条。

逐字稿仅留个人项目private/sources中的 `coderabbit-conversation.md`，117个换行、9748字节，SHA-256 `35440cd41d14cf6cf31c1a2682c22c618797e0923896736ee93a6bd02e5e4707`。[来源索引](source-index.md)区分官方描述、本轮核验与Courtwork推论；未进行CodeRabbit运行/UI审计。

## Astra裁决

- **先使用已有身份和证据。** Review分组是可质疑的派生阅读路线，保留Sources原顺序、未分组内容与确切锚点。无需引入新的Review Stack数据库、Claim本体或第二套正式状态。图和摘要的每个实质判断应能下钻到其依据；缺少依据时明确显示，不能制造locator。
- **阅读版本与动作基线分别检查。** Core已有不可变candidate、来源版本、历史读取和服务端动作校验。历史接受事实不会因当前basis变旧被撤销；stale也不代表所有动作禁用，现有revise允许从历史candidate形成新提案。UI消费humanActions，服务端逐动作重验。原文“危险操作一律freshness gate”不能直接取代现有合同。
- **缺席不是解决。** Finding比较需要领域身份、规则版本和本轮覆盖证据；摘要里不再出现、producer没运行或来源缺失都不足以宣布已解决。原文混合了CodeRabbit driver状态与跨轮finding比较，不能直接抄成统一状态枚举。持久生命周期若确有需要，先由领域合同定义，再考虑迁移。
- **判断与权限分别成立。** 风险、处理成本、置信度和是否存在可执行动作是独立信息。CodeRabbit四轴/四栏仅是候选参照，法律合成规则不自动采用其枚举。Attention沿既有ATT owner投影；severity不直接决定现在必须通知人，也不产生accept权限。
- **局部交互需要明确范围。** 选中对象后显示对话范围与版本；导航到新版本不能悄悄让旧对话改谈新材料。普通Chat仍有价值，object-scoped chat本身也不等于正式review/Decision。Context可以持久留审计快照，不采用原文“只能ephemeral”的绝对化说法。
- **渐进实现。** 优先确切来源与版本提示，再做分组/比较/局部对话；semantic不可用时仍能读source。PDF页坐标、OCR、DOCX和图片对比各需adapter与验证，不能从代码range推导通用文档协议。默认折叠不隐藏未处理风险，恢复展开与键盘焦点必须可用。

## 消费入口

[PR计划](pr-plan.md)是既有Core、ES、Review UI和ATT工作的补充验收条目，不另立施工队列。前端仍沿CC-W → CC-D0-a → FE-05a → FE-05 → CC-I，由单writer统筹；后端ES-01正在独立任务施工，消费时必须重读实际交付，不能以本包宣称其已合流。

Astra完成来源复读、本地合同/代码映射与文档整合。本次检查来源覆盖、hash、相对路径及diff；无产品代码变更，无产品测试或独立产品验收。不修Paper，不安装CodeRabbit，不启动模型/provider或部署。相关入口：[Chat Space](../chat-space-2026-09-09/README.md)、[Attention](../attention-2026-09-09/README.md)、[当前状态](../../current.md)。
