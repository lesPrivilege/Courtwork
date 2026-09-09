# TeamAI：多专家讨论消费与局部实践索引

**后续增量：** 同一讨论已扩展为4个turn、8条文本；[MyContext / Attention追加索引](attention-delta.md)消费新增两轮。下文保留首次2-turn快照及原核验时点。

2026-09-09。Courtwork读取基线 `3af83ebd35a09b4d029a9b8ce6e9c1979b7f6c54`。本次是研究入账；不安装TeamAI，不实现产品功能，不调整前端队列，不修订Paper或其采用版本。

## 原始来源与完整性

[多专家架构分析](chatgpt-conversation://6aa14cb0-1718-83ec-a738-684f6137b6c2)已完整读取2个turn、4条文本；接口单页hasMore=false、无truncated标记、无附件。逐字快照只保留于个人项目private/sources，不进入产品仓库：`teamai-conversation.md`，590行、19818字节，SHA-256 `b3ea07e0f1a20c345faac6fce4c7788b980bdc13bac3d6561247eb9846d49520`。

| turn | 讨论输入 | 本轮处置 |
|---|---|---|
| `ba22d3e1-c3bd-46b7-81ad-b3fcc13b51ed` | 用户提供TeamAI仓库并提出“多专家”；回答列出role/project、agent资源、原生渲染、recall与Git治理 | 按资源治理、适配和披露机制查证；不把工具自述兼容矩阵当Courtwork兼容性，也不认定完整多专家编排已成立 |
| `45617fda-1571-4b88-9943-252aeee27205` | 用户要求结合理念探索局部；回答进一步提出scope继承、anchors、hooks、friction、promote与卸载回收 | 分别映射既有AM/LG/ATT与Runtime契约；“直接取型”降为待验证候选，自动upvote不得升级治理效力 |

原文只有一个上游仓库的两种明文URL：[标准入口](https://github.com/Tencent/teamai-cli)、[带追踪参数的原文入口](https://github.com/Tencent/teamai-cli?utm_source=chatgpt.com)。回答还含12个不同的内部citation标识，接口没有给出其URL映射，因此不能恢复为原研究已读页面。本轮另行取得的官方仓库文件见[上游索引](upstream-index.md)，与原引用分列；“Exa扫28个结果”只是原回答自述，不记作本轮检索数量。

## Astra消费裁决

TeamAI进入Expert资源治理、分发与runtime适配的局部参考索引；是否改变编排实现须有独立消费者和证据。当前继续复用Pi执行与Core正式提交，不引入TeamAI总平台、第二registry或新的权威memory数据库。

- **分层资源与格式转换**：scope是适用性选择，不等于Authority。不能仅凭同名优先级、角色并集、Git合并或成功渲染授予执行/读取权限；生效仍需适用的授权规则。原生格式适配需保留语义差额、确切版本和能力缺失。
- **Recall与来源入口**：relevance、source anchors和有界深度可用于LG-02与Attention披露。本轮所读TeamAI `SourceAnchor`主要是path/desc，Courtwork仍须补足确切source版本、generation与range。相关性gate是检索策略，不能替代存在性、内容与传播路径上的授权检查；某个recall agent遵守prompt也不证明强制边界。
- **Friction与反馈**：中断、拒绝和重复错误可以形成待检查signal；不自动成为已验证learning、正式Matter事实或人的待办义务。先判断噪声、重复与证据，再按既有policy/Authority维护；不为已授权维护增设重复human gate。
- **生命周期**：资源review/merge、分发、安装、激活、模型曝光、执行授权及正式成果接受分别成立。卸载应只移除可证明拥有的注入物，保留用户修改与恢复证据。Hook的fail-soft仅适合外围观察；授权/提交检查失败不可静默继续。
- **反馈计数**：retrieved、referenced、accepted、corrected、superseded分开。召回次数可作使用统计，不因被读到自动提高正确性或Authority。
- **引用纠正**：原回答提及“DEC-006式判断”，但本仓DEC-006并非该句的直接依据。稳定接口与执行层替换应沿当前architecture及AM契约核对，不用聊天重解释既有决议。
- **Paper**：本轮材料没有触发Kernel缺口或正文证伪条件；只在Courtwork登记实现参考。将来确需正文修订，仍由Astra在SE源目录亲自撰写。

## 进入已有工作，不重复派单

具体当前代码/合同、差额与首个反例见[本地消费映射](courtwork-mapping.md)。沿[AM局部解耦](../architecture-maintenance-2026-09-09/README.md)、[LG本地治理](../local-governance-2026-09-09/README.md)和[Attention准备包](../attention-2026-09-09/README.md)消费。该映射不关闭Runtime R3–R6、ES-01或G1–G5，也不自动创建实现会话。

## 核验责任与范围

Luna分别做上游有界来源核验与本地契约映射；Astra完整消费讨论、判断架构边界并整合文档。版本/路径、证据等级、未检项在上游索引逐项标明。仅检查文档链接、输入hash、turn覆盖及Git diff；未安装或执行外部项目，未运行provider、产品测试、外发消息或发布。
