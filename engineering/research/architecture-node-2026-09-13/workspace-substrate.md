# Workspace Substrate · 结构化工作现场与间接披露

2026-09-13，Astra裁决；DEC-014增量。用户要求在Agent入场前组织工作区，多个Agent共用可索引、可查询资料，并将Spark中间数据主要保留在本地、供主Agent按需读取。[本轮原文与外部索引](../court-position-2026-09-13/workspace-substrate/README.md)补充既有[五层架构](architecture.md)、[工作区治理](workspace-governance.md)、[Spark合同](../spark-explore-2026-09-13/design.md)，不改PAPER固定采用版本。

## 架构决定

**Workspace Substrate是既有owner共同提供的结构化工作现场。** 它先于某次Agent执行存在，允许获准的新执行者发现资料、查询版本、展开依据和理解责任。它描述数据与接口责任，不新增第六执行层、全权中央服务或统一数据库。Host、Intake、文件版本、Runtime协议、Work Core和专业扩展继续各守写权；索引只保存必要引用和派生元数据。

`Source / Retained derivation / Index / Model context / Provider cache`是五种不同对象。源由原owner保存；有引用价值的派生结果按精确版本保留；索引定位它们并说明覆盖；Context是一次获准选择后的编译结果；Provider cache是执行端优化。索引可重建，保留成果的引用不可因重建悄悄改指。历史查询不依赖某厂商的原生会话格式，原生会话可按其协议恢复，但不拼成共享工作区总账。

主Agent的默认认知是**存在、用途、范围、读取入口及效力类别**。正文和全部子任务trace不自动入Context。默认路径为`orient → directory → query/index → bounded excerpt → exact source`，有权限者仍可直接读原文。工具目录、标题、计数、摘要和关系亦按当前授权披露；未获准条目不借“仅显示存在”泄露。每次扩展读取重新核查原来源和挂载目标。

## 稳定数据与接口合同

| 责任 | 最小内容与行为 | 现有owner / 即时消费 |
|---|---|---|
| 工作现场身份 | Project、来源root/资源、执行位置、repo/ref/commit/dirty分别有身份；未探测值unknown | RD-006与原Session/Workspace合同；本轮Spark挂载选择Project或Session，不伪造repo/commit |
| 资料manifest | ref、类型、owner、revision/digest、representation、locator、生成者/processor版本、依赖、覆盖/未知 | Intake、ArtifactHistory、Core各自原件；Spark清单只引用精确版本 |
| 派生与本地索引 | 中间笔记、目录、摘要可持久；有界大小，生成与检查来源分列，可按具体依赖重算 | Spark受限Host工具保存本地内容寻址字节与manifest；不授予源目录写入或全局记忆写入 |
| 挂载与复用 | 显式sourceRef→target引用、生命周期、当前可读性；撤挂不删来源、不改变归属；跨域双端检查 | Host协调记录增量；同Project成员资格不替代挂载和源权限。历史资料可再次披露，保留原版本 |
| 查询与渐进披露 | 有界分页、稳定引用、覆盖和下一页；索引读、正文读、原文读、消费分别留迹 | 原reader与Spark目录/展开工具；首片文本/文件资料，不冒称已实现symbol index或全库RAG |
| 协调与通信 | Agent/Assignment/attempt与真实Run/call；message含指向任务/版本的引用 | 现Host协调与Thread；结果、送达、读取、消费、责任接管和正式接受各自独立 |
| Runtime投影 | 入场提供简短定向与工具；按预算编译实际查询结果；记录投射来源 | Pi先消费，其他Runtime按既有替换矩阵；不读取或同步个人凭据/原生私有缓存 |

manifest中的派生类型和“索引”名称不是验证保证；模型提取也可能遗漏。确定性读过哪些版本、模型自报覆盖、非作者检查和正式决定分别记录。索引有效域包含源版本、processor/config版本和授权域；任一改变时重新判定。旧版本可用于历史问题，不能静默冒充当前工作区。未校验live文件时明确workspace freshness unknown。

## Agent原生通信与人的位置

Agent之间以结构化manifest、精确引用、有界摘要及typed receipt协作。普通内部资料读取、索引展开和消费不制造人工Review gate；人可按需检查来源、任务、失败和控制配置。正式工作合同要求人的接受时，继续原Core动作，不能由Spark消息、消费标记或目录挂载替代。

主Agent消费成果可声明用途/采用/拒绝/暂缓及理由，读取观测由Host绑定真实Run和精确来源。消费是主Agent对自己工作过程的声明，不能宣告自身独立核验。主Agent应只为具体缺口补查；如需交接责任，必须另有明确接收与旧执行停止合同，不能以文件挂载或一条handoff消息推定。

本地缓存是物理部署选择，保留效力由用途决定。可重建且无引用的缓存可在未来明确GC策略下清理；一旦被消费或其他成果引用，保留相应版本字节和依赖关系。首片不做破坏性自动清理。暂停Agent、归档任务、撤销挂载均不删除受引用的历史内容。

## 即时采用与后置边界

本轮Spark施工即时采用：稳定Agent/Assignment身份、隔离执行上下文、Host串行调度、本地immutable notes/findings、项目/Session显式挂载、目录存在提示、按版本展开与机器消费回执。右侧subagent卡是任务投影与按需检查入口，复用同一数据owner，不以人工Review收件箱组织全部内部通信。

SCIP/Tree-sitter列为索引adapter候选；先有语言、精度、更新和失效消费者，再固定schema/工具版本及维护成本。MASS/Agent Client Protocol列为第二Runtime supervision参考。Agent Coordination Protocol项目与Agent Client Protocol是同缩写的不同协议，不能互换。succubus的TTL是建议性claim，不是文件锁/写隔离；当前single-active-Run不因参考lease就改为并行。

不因本页增加Temporal/Kubernetes、向量库、broker或跨Runtime自动同步。当前Pi执行能力、索引实现、持久恢复和外部效力都按本地代码及验证回执判断；“共享结构化现场”是正式架构决定，不是所有接口已经完成的声明。

## 必须能反驳的例子

- 替换/清空Provider缓存后，仍可从原owner定位保留版本、责任和资料依赖。
- 同名源出现新版本时，旧索引保持历史指向，并披露其覆盖；无法验证新旧关系时unknown。
- 挂载使目标发现获准引用；撤销后新目录/扩展读取不泄露；源撤权同样生效。
- 主Agent只收到目录存在提示就能按需取索引、笔记和源；没有把子任务全部trace塞入提示。
- 任一Agent停止/重启，持久Assignment可解释状态；未知执行不盲重放；内部消费不触发Core接受。

本页为Astra已裁决的架构合同。实现完成、作者验证和非作者接受由Spark实际交付分列登记。

## 首片实现

[Spark实现合同](../../../app/docs/spark-agent.md)与[验证回执](../../../evidence/spark-agent-20260913/README.md)消费本节点的本地派生字节、精确来源、目录/按需展开、显式挂载、双端当前权限及机器消费。仍只覆盖内部保留文本/文件资料，不将首片扩大成通用symbol索引、第二Runtime互通或全Agent治理完成。
