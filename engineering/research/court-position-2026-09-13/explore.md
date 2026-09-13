# Court 定位参考实践 · 有界核验

2026-09-13；本探索以会话原文 [source-conversation.json](source-conversation.json) 中列出的八项为范围。仓库基线 `24bd9545936dd19a498fc6b7eed5de106ac0d5e8`，当前实现与owner按 [options.md](../../options.md)、[架构节点](../architecture-node-2026-09-13/architecture.md)、[RD-005](../RD-005-multi-agent-selection.md) 和 [RD-007](../RD-007-resource-governance.md) 对照。这里只登记外部机制的核实范围与候选映射；架构及是否采用由 Astra 裁决。

外部快照索引、固定版本、访问UTC及 SHA-256 见 [snapshots/manifest.json](snapshots/manifest.json)。快照只留支撑判断的短片段；GitHub 路径固定到检查时 commit。所有远端代码/文档均为源码阅读，未 clone、安装或运行上游项目，也未运行其测试。README、issue正文和文档是作者声明/设计资料，不能当作实测结果。

## 核验矩阵

| 参考机制 | 已核实范围 | 未核实与边界 | 对 Court 的采用建议 / 既有 owner | 不选整个框架的原因 |
|---|---|---|---|---|
| [Agent Orchestrator](https://github.com/Untrivial-ai/agent-orchestrator) | 固定 `c1538a9…` 的架构文档描述外部事实入库、读时派生显示状态；源码 `service/session/kanban.go` 调用纯合同 reducer，contract 测试含人类Review与自动Review例子。仅确认源码/测试存在，未运行。 | 该Kanban以Session/PR/CI/review为中心；不证明跨领域Work/Matter持久事实、状态恢复质量或评审成本。文档与测试不是独立生产验收。 | 只借鉴事实与投影分层，按现有 Runtime/Work Core/Attention 投影边界落位；长久工作义务继续归Work owner。见架构节点及 RD-005。 | 它是围绕 coding session、git、PR、CI 和 board 的执行/监督产品；直接搬入会把局部coding工作台误作Court的Work语义或总账。 |
| [AO #2764](https://github.com/Untrivial-ai/agent-orchestrator/issues/2764) | Issue正文把 work graph 标为协调overlay，并列出 SQLite work item/dependency/session ownership 方案；正文称 design `proposed`，验收清单仍有未勾选项。API在本次访问返回 `state=closed`、`state_reason=completed`；关闭评论却写“closing as not planned”。两者并列记录，不把评论替代API字段，也不把关闭状态当实现证明。 | 状态字段与评论语义冲突；没有在此做完整关联PR/代码历史审计。Issue是方案/讨论证据，不是运行证据或可复用实现。固定主线树未见专名 `work_item`/`work-graph` 源文件路径，也不构成功能不存在的穷尽证明。 | 仅作为“执行Session不能自动充当持久工作图”的设计问题旁证。Court已有 Matter/义务/Runtime事实 owner；由架构节点、RD-005和义务闭环消费，不新增另一份图账本或重复RD。 | 这是一份Issue提案，不是可选依赖/框架；其状态还存在显式矛盾。 |
| [Kandev](https://github.com/dionet/kandev) | 固定 `805a36b…` 源码将 `ExecutorBackend` 定义为环境运行接口（创建、停止、恢复实例），并实现ACP transport adapter；这是对协议与执行环境分层的代码结构证据。 | 未运行、未测ACP互操作、Docker/SSH/云环境隔离强度、可靠性、权限或产品效果；README中的Agent/Executor覆盖面不是实测。 | 可作 Adapter、Harness 与 Environment 词汇及接缝的参考；当前由架构节点五层及已有Pi/Host合同承载，不导入Kandev运行时。 | Kandev把多Agent任务、kanban、review、IDE工作区与executor打包成一个coding产品；Court已存在不同Work Core与权限owner，整体替换会扩大范围并重复能力。 |
| [Warden](https://github.com/Gentoflakes/warden) | 固定 `3983833…` 源码有独立 `verify_branch` 路径：构造 detached worktree、重跑声明检查并请求结构化独立审计；源码把基础设施错误与FAIL区分。只做静态阅读，未运行。 | 未验证其实际模型独立性、审计误报/漏报、风险分数校准、合流正确性或成本。README/代码docstring的产品效果声明不是本次试验结果。 | 可借鉴固定scope、可重跑检查、独立核查回执和unknown不算pass；由RD-005既有作者/核查者边界和Attention合同承接。不要复用其coding branch风险分数覆盖一般工作。 | Warden针对多分支coding波次、worktree、commit与merge；Court已有Release、Core Review、Verification owner，整套并行波次编排并非本轮缺口。 |
| [Meathill · 多模型AI工作流](https://meathill.com/posts/tech/my-great-ai-workflow-with-different-ai-models) | 作者文章实际描述个人做法：协作规范、先理解/计划、修复前复现、测试与格式/类型/构建检查、分阶段提交、知识文档维护、周期性维护与Skill沉淀；文章明确强调这是持续摸索的个人经验。 | 单一作者自述，无受控对照、独立质量数据或普适成效验证；文中具体文件名/Skill结构不构成Court的领域本体。 | 只消费可复用工作法：规范给目标/边界，验证前置，知识记录由owner维护；现有 AGENTS、各RD/交付回执和Verification gate已承载，不另造WIP/TODO/DEV_NOTE或Skill制度。 | 它是个人流程经验，不是可安装的workflow框架；硬编码作者的文件与步骤会将个人偏好误作跨领域合同。 |
| [VS Code · Agent harnesses](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses) | 官方概念文档将model、agent role、harness、execution environment、session target分别解释，并区分handoff与工作区隔离；本文只核查概念文本。 | 文档分类不能证明Court采用相同UI/实现最佳，也不代表不同厂商协议完全互换；页面内容不等于互操作测试。 | 借鉴词汇分层以避免Provider/Role/Harness/Environment/Session混用；按当前架构节点五层映射，沿用本项目既有入口，不复制VS Code产品层级。 | 这是产品内的Harness概念说明，不是Work/Matter governance framework；照搬会把一个特定编辑器入口当成Court本体。 |
| [Temporal · Architecture](https://docs.temporal.io/encyclopedia/architecture/temporal-architecture) | 官方文档描述Workflow Event History、History Service、Task Queue/Worker派发，以及按历史恢复/replay，并提到determinism/idempotency。 | 未测Temporal对Court任务的适合度、运维/成本、等待授权语义、effect-once保证或迁移复杂度；文档概念不是本地实现证据。 | 只作长任务恢复、幂等和事件历史设计的机制参考；优先复用Runtime事件、Core事务与现有义务owner。RD-005已把compaction/replay按既有owner切分；RD-007只规定无实际需求时不新增消息总线/outbox平台。本轮不新增Temporal/DSL依赖是本次探索处置。 | 现在没有证明需要独立持久调度平台；引入Temporal会增加数据库、worker、迁移与运营责任，并重复既有Runtime/Core持久化。 |
| [Kubernetes · Controllers](https://kubernetes.io/docs/concepts/architecture/controller/) | 官方概念文档描述controller观察资源状态、朝desired state采取/请求动作、报告观察结果，并由许多小controller各管局部状态。 | Kubernetes控制环面向集群资源控制；并非所有Court动作都可安全重试/持续收敛。未验证其具体机制对人类决定、来源权限或外部不可逆副作用的适配。 | 可将观察/派生/局部reconcile作为owner内机制参考；写入仍归既有Core/Runtime/资源owner，授权和幂等由既有合同保障。 | Kubernetes控制器和API Server是基础设施控制平台，不是一般Work/Attention产品框架；移植其抽象会泄漏术语并添加不必要控制循环。 |

## 与既有选型的映射

这一轮没有形成新的平台/RD owner。`architecture-node-2026-09-13/architecture.md` 已将Adapter、Harness Core/Extension、Work Core/Extension分责，并区分Runtime、Environment、Expert及尚未独立的Work Compiler；本次核验只给词汇与机制对照，不要求重构层级。`options.md` 已记录Pi + Host、DeepSeek首适配、本地JS前端、Node/Python Core边界及待验证方向，因此这些外部项目不构成新默认依赖。

多agent topology、独立核查、source refs/归因、权限与Attention由 [RD-005](../RD-005-multi-agent-selection.md) 已接：本次不另登记Agent Orchestrator/Warden路线。内容资源的来源、精确版本、权限、引用与外部协议owner由 [RD-007](../RD-007-resource-governance.md) 已接；该RD明确无实际需求时不加消息总线/outbox平台。本轮不引入Temporal workflow/DSL或controller总线属于此次探索处置，不是RD-007已有裁定。若需要后续施工，应从原owner合同提出具体缺口与验收例，不从某框架的产品表面派生新工单。

## 限制

本记录不是框架横评、软件质量审计或运行试验；没有启动上游服务、执行上游测试、测量用户结果，也没有核查所有引用链接及每个未读功能。GitHub仓库按快照commit静态浏览；HTTP文档按本次正文快照及访问时间锚定。对应的快照文件、原始来源SHA-256与明确未核实项见manifest。
