# 外部来源索引 · 全链接处置

核验日：2026-09-10。S01…S44 按原文首次出现编号，原文有 45 次显式 Markdown 外链（S32 类似页面另有独立URL，按原URL保留）。本表“已读”仅指列明范围；无项代表独立运行/性能复现。网页当前内容与原对话可能不同。末轮补查遇到网络401后未把失败记成验证通过。

| ID / 原链接 | 原文 turn | 已读范围 / 状态 | 施工可用结论与限制 | 去向 |
|---|---|---|---|---|
| S01 · [Harvey II](https://www.harvey.ai/blog/introducing-harvey-ii) | T01 | 产品介绍相关段 | 资料/权限/协作空间与模型可分；厂商产品叙述不证明CW收益。 | D01/D02 |
| S02 · [Unlocking Codex harness](https://openai.com/index/unlocking-the-codex-harness/) | T01, T12 | 原URL未复读；以S32官方接口文档补核 | 仅用已核验的app-server机制；不据博客宣称与CW现成兼容。 | D09 |
| S03 · [ACP introduction](https://agentclientprotocol.com/get-started/introduction) | T01 | 协议概览 | editor↔agent控制协议；不等于工作状态/效果协议。 | D09 |
| S04 · [Zed ACP](https://zed.dev/acp) | T01 | 生态页面 | 入口与生态定位；具体agent逐个固定版本验能力。 | D09 |
| S05 · [GitHub custom agents config](https://docs.github.com/en/copilot/reference/custom-agents-configuration) | T01 | 配置字段 | 当前该配置的infer迁移为disable-model-invocation/user-invocable；tools默认范围须显式收窄。 | D01/D11 |
| S06 · [GitHub Copilot SDK custom agents](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/custom-agents) | T01 | SDK配置相关段 | 独立上下文与生命周期；SDK字段与S05产品配置不混成单一规范。 | D01/D09 |
| S07 · [Claude Code sub-agents](https://code.claude.com/docs/en/sub-agents) | T01 | 权限/插件相关段 | plugin subagents有不支持的配置字段；父模式可能覆盖子模式，必须验执行处实际权限。 | D01/D05 |
| S08 · [OpenCode agents](https://opencode.ai/v2/docs/agents) | T01 | system/permission/model配置段 | agent system可替换provider基础提示；权限最后匹配生效；切agent不等于自动换session模型。 | D01/D11 |
| S09 · [Microsoft agent entry points](https://learn.microsoft.com/en-us/agents/design-guidelines/agent-entry-points) | T01 | 入口与可见控制相关段 | 借鉴可见agent身份和控制消息；不由视觉状态生成业务Authority。 | D02 |
| S10 · [Atlassian AI work items](https://support.atlassian.com/jira-software-cloud/docs/collaborate-on-work-items-with-ai-agents/) | T01 | 页面定位；正文消费不足 | 仅作工作项协作入口候选，不采用自动事件/reopen行为。 | D02/D03 |
| S11 · [MCP client best practices](https://modelcontextprotocol.io/docs/2025-03-26/develop/clients/client-best-practices) | T04 | 渐进工具发现/执行与缓存相关正文 | catalog→inspect→execute、先复用provider搜索；tool hint/visibility不授予执行权。 | D06/D13 |
| S12 · [Anthropic context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) | T04 | 上下文策略相关正文 | 最小充分上下文、失败驱动规则；需要本地消融而非提示词越短越好。 | D06/D11 |
| S13 · [Harvey Vault search](https://www.harvey.ai/blog/agentic-vault-search-and-organization) | T04 | 已读页面概要；未复现搜索 | 目录与检索分层候选；不声称搜索性能或后台机制等价。 | D04/D06 |
| S14 · [Harvey ingestion](https://www.harvey.ai/blog/building-new-file-ingestion-system-to-scale-firm-knowledge) | T04 | 已读页面概要；未复现摄取 | 摄取与资料治理分层，具体manifest实现仍按LG合同，不移植厂商未知内部。 | D04 |
| S15 · [MCP filesystem server](https://github.com/modelcontextprotocol/servers/blob/main/src/filesystem/README.md) | T04 | README工具/只读提示段 | 现成filesystem含写工具，readOnlyHint仅metadata；只读mount/执行处约束才是边界。 | D04/D13 |
| S16 · [Claude workflows](https://code.claude.com/docs/en/workflows) | T04 | 页面定位；未逐工作流深读 | 按需检索单个workflow；不设CW loop框架依赖。 | D15 |
| S17 · [Copilot CLI fleet](https://docs.github.com/en/copilot/concepts/agents/copilot-cli/fleet) | T04 | 页面定位；未跑fleet | 并行候选，仅在MA真实生产接缝有需求时复核。 | D05/D15 |
| S18 · [Temporal agent harness](https://temporal.io/blog/temporal-agent-harness-durable-agent-infrastructure) | T04 | 早期预览定位 | early look 不作成熟度保证；只有持久等待/效果压力触发spike。 | D10 |
| S19 · [DSpark 2607.05147](https://arxiv.org/abs/2607.05147) | T05 | 摘要 | token级推测；60–85%是论文特定实验主张，不是Spark任务收益。 | D05 |
| S20 · [SpecReason NeurIPS 2025](https://proceedings.neurips.cc/paper_files/paper/2025/file/12c45a68e8433b21b91cd47731387fa4-Paper-Conference.pdf) | T05 | 摘要与引言 | 近似语义推测不是lossless；1.4–3倍不是本项目验收阈值。 | D05 |
| S21 · [DeepSpec](https://github.com/deepseek-ai/DeepSpec) | T05 | 仓库定位；未读实现/运行 | 仅保留donor指针，不能据仓库名认定任务级verification可复用。 | D05 |
| S22 · [ACL Findings 2026.333](https://aclanthology.org/2026.findings-acl.333.pdf) | T05 | PDF可打开；未完整抽取/核验数值 | 原讨论数值不进入成本/质量假设；实施前按论文题名/方法/数据重读。 | D05 |
| S23 · [2609.01345 verifier blindspots](https://arxiv.org/abs/2609.01345) | T05 | v2摘要（2026-09-04） | 自评提升可掩盖blindspot；需要外部oracle、false-accept分项。 | D05/D12 |
| S24 · [ChatGPT memory dreaming](https://openai.com/index/chatgpt-memory-dreaming/) | T08 | 原URL未复读；内部实现不可据此推断 | 记忆/梦境作为原主张保留，不写成可复制的官方内部算法。 | D07 |
| S25 · [Linear delete/archive](https://linear.app/docs/delete-archive-issues) | T10 | 归档与删除正文 | 当前自动archive、恢复及删除保留是Linear自身策略；不设CW固定保留天数，不假定手动归档。 | D08 |
| S26 · [Claude managed memory](https://platform.claude.com/docs/en/managed-agents/memory) | T10 | memory页面相关内容；未核验Dream机制 | 跨运行记忆候选；该页不足以证明原文Dream细节。 | D07 |
| S27 · [OpenAI memory/compaction cookbook](https://developers.openai.com/cookbook/examples/agents_sdk/building_reliable_agents_memory_compaction) | T10 | 官方示例相关正文 | 当前运行压缩与可重用memory分层；示例备忘不等于正式业务事实。 | D07/D11 |
| S28 · [Intercom handoffs](https://www.intercom.com/learning-center/ai-human-collaboration-procedures-handoffs) | T10 | 页面定位；指定handoff note未定位 | 仅人机交接参考；不使用未定位模板作为验收合同。 | D08/D10 |
| S29 · [Claude Agent SDK sessions](https://code.claude.com/docs/en/agent-sdk/sessions) | T10 | 恢复与fork相关正文 | 当前支持SessionStore/mirror，fork只复制对话不复制文件系统；文档不证明新session普遍更可靠。 | D08/D09 |
| S30 · [Zed agent settings](https://zed.dev/docs/ai/agent-settings) | T12 | 模型/compaction设置相关正文 | feature-specific设置可借鉴；默认主模型与90%阈值不成为CW常量。 | D01/D08 |
| S31 · [Zed external agents](https://zed.dev/docs/ai/external-agents) | T12 | 配置/历史导入相关正文 | 外部auth/config由runtime持有；打开导入archive可恢复是Zed行为，CW读历史不因此resume。 | D09 |
| S32 · [Codex app-server](https://learn.chatgpt.com/docs/app-server.md) | T12 | 官方完整接口页面（规范URL见补充） | stdio JSONL、初始化、thread/turn/item、approval、resume/fork与版本生成schema；WS实验，不保证所有CLI/应用功能可远程控制。 | D09 |
| S33 · [ACP config options](https://agentclientprotocol.com/protocol/v2/session-config-options) | T12 | select/boolean与更新正文 | 未知选项默认处理、返回完整配置；category只助UI不能作语义校验。 | D09 |
| S34 · [GPT-5.6-luna model](https://developers.openai.com/api/docs/models/gpt-5.6-luna) | T12 | 未复读动态型号页面 | 历史模型价格/能力不成为Spark默认策略；实施时按可用目录和实际测量选择。 | D05 |
| S35 · [Codex automations](https://developers.openai.com/codex/app/automations) | T12 | 官方当前scheduled tasks文档 | standalone/同chat日程功能不证明app-server暴露调度API；不照搬旧Triage界面词。 | D10 |
| S36 · [Claude 5 context rules](https://claude.com/blog/the-new-rules-of-context-engineering-for-claude-5-generation-models) | T14 | 厂商工程叙述正文 | 80%删除是其特定评测/时间点主张，不直接删CW规则。 | D11 |
| S37 · [Codex skill-creator example](https://github.com/openai/codex/blob/main/codex-rs/skills/src/assets/samples/skill-creator/SKILL.md) | T14 | 原固定路径未复读；S38补核 | 作为提示词分层线索；不能用示例规则替代仓库AGENTS或执行约束。 | D11 |
| S38 · [Codex customization](https://developers.openai.com/codex/concepts/customization) | T14 | 官方AGENTS/skills/memory/MCP相关正文 | 有持久规则和按需能力层；不支持无差别去掉全部instructions。 | D11 |
| S39 · [Gemini CLI FAQ fixed ref](https://github.com/google-gemini/gemini-cli/blob/f8541cf7/docs/resources/faq.md) | T17 | 固定短ref解析/页面定位 | 完整ref f8541cf7a2912e8a99ee21445195c87780912cac；auth叙述待采用时核验。 | D13 |
| S40 · [Gemini Code Assist deprecation](https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals) | T17 | 页面定位；未复核全部条款 | 历史订阅/弃用叙述不可作许可结论。 | D13 |
| S41 · [Gemini Interactions](https://ai.google.dev/gemini-api/docs/interactions-overview) | T17 | 页面定位 | 保持候选，未核验CW适配能力。 | D09/D13 |
| S42 · [Gemini latest models](https://ai.google.dev/gemini-api/docs/latest-model) | T17 | 页面定位 | 动态型号指针，非固定benchmark配置。 | D13 |
| S43 · [Gemini API key](https://ai.google.dev/gemini-api/docs/api-key) | T17 | 页面定位 | 接入时让用户配置；不读取/复制个人凭据，不推导CLI与API配额可互换。 | D13 |
| S44 · [Gemini CLI extensions](https://google-gemini.github.io/gemini-cli/docs/extensions/) | T17 | 页面定位 | 候选扩展接口；T18后置，不安装、不称兼容。 | D09/D13 |

## 补充材料与未恢复引用

- [Codex app-server 规范页](https://learn.chatgpt.com/docs/app-server)：补核 S02/S32。执行 shell 等接口须由adapter显式限制；标准transport不能自动继承CW的权限边界。
- [Secure MCP tunnels](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)：本次官方搜索定位，未完整复读；仅作为候选。采用前核验目标账户、客户端、授权、数据路径、部署限制，不能声称本地存储就不外发。
- [Gulli / Springer 书目](https://link.springer.com/book/10.1007/978-3-032-01402-3)与[Google Cloud架构指南](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)：是不同来源，见[模式负索引](selection-index.md)。书目/目录不代表阅读全部21章。
- HiGMem、APEX-MEM：原文有名无显式URL，Luna已补定位精确论文，见[探索回执](exploration.md)；只能称新增公开旁证，不反解历史citation。ResourceSync、Memento、Perma 以及 Slack/Zendesk auto-reopen 仍只作未核验候选；外部回复如何重开工作必须由CW自己的生命周期/授权规则决定。
- `codex-from-chatgpt`、`pi-acp-agents`、Antigravity SDK 与部分 MCP Apps 引文：原文 citation ID 不是可访问URL。Luna探索结果见[补充探索](exploration.md)；找到同名仓库也不证明就是原文引用的版本。未核验的组件/plan限制不能进入可用能力表。
- T08、T11、T18、T23 等不透明 `cite…` 与 image 标记原样保留在原文。不伪造search ID→网页映射，不把原作者工具调用次数计为本轮阅读证据。

## 实施前再读取的最小包

每个要采用的donor必须补：固定版本/commit、许可证与依赖、实际入口、支持/缺失能力、权限/取消/重启反例、维护退出条件。模型价格/速率/计划权限按实验当日快照记录，不进入领域schema。需要全文才能判断的方法保持research-only，不能让“已登记”自动晋升成“已选型”。
