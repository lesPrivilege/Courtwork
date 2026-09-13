# Court定位参考实践 · 登记与Astra即时消费

2026-09-13；接单本地 `main@24bd9545936dd19a498fc6b7eed5de106ac0d5e8`。Astra裁决与集成，Luna有界explore、选型与来源快照。共享工作区存在其他写者修改，本片在隔离分支编订；没有生产代码、依赖、schema、UI或公开品牌变更。论文采用继续由[PAPER](../../../PAPER.md)固定。

## 来源与覆盖

- [工具原始返回](source-conversation.json)、[按时间排列的原文](source-conversation.md)：会话 `6aa682f1-2024-83ec-b099-351239cd1b30`，工具返回2轮/3条消息、无下一页。第一轮仅返回用户消息；没有返回的助手研究过程不补写。
- [原图](attachments/IMG_2441.jpeg)：已实际查看，内容是社交平台介绍Agent Orchestrator的帖子；其stars、支持数量及营销主张是输入，不作当前事实或选型依据。图中文字有平台机器翻译标记，不能作作者原文。
- [Luna探索与选型](explore.md)：逐项核验一手来源，区分文档、提案、源码与未运行；快照入口由该文链接。[接收及文件哈希](manifest.json)固定原件、源码基线和本片产物。

源会话中的“Exa约60个结果”、项目效果、Court“更早划出边界”等自述没有原始检索日志或比较实验，本轮不追认。输入中的层级图和新增Release门槛是建议，不是用户执行指令。源码/文档快照不是安装、运行或产品接受。

## Astra裁决及即时落点

采用“持续工作控制责任”解释Court定位：执行可以结束，工作状态、证据和人的决定继续由各自owner持有。`AI work control plane`只作内部概念说明；不改产品名称、不创立全权中央服务、不宣称已完成通用工作平台。当前五层责任继续有效。

| 来源建议 | 裁决 | 现在消费到哪里 / 保留边界 |
|---|---|---|
| Court不应仅按多agent编排器定义 | 采用责任解释，调整固定层级图 | [正式架构](../architecture-node-2026-09-13/architecture.md)新增定位/对象词汇；Chat/Attention/Spark、Expert、Runtime与Environment是关系轴，不能排成一条固定调用链 |
| AO事实更新与派生视图 | 采用机制比较 | 继续原Event/Runtime/Core/UI owner；领域状态、配置、协议历史和合法UI草稿均可持久化，不把“只持久事实”误读成全部event sourcing或删除其他store |
| AO durable work graph / #2764 | 作为工作与Session分离的提案旁证；API关闭原因字段为completed，但同次关闭时间的评论为not planned，保留两份记录的差异 | 不把关闭状态解释成实现完成，不据此认定Court领先；工作依赖、分配、阻塞与恢复投影接治理地图/RD-005，不把外部work graph直接映射为Matter schema |
| Meathill规范/测试/Review/知识沉淀 | 采用工作制度原则 | 现AGENTS、合同、验证和证据链承担开发制度；Markdown文件名不变成产品ontology，长期知识接RD-007，模型分工是有界策略，不是天然质量保证 |
| Kandev执行器/环境分离 | 选为adapter边界参考 | 保留当前Pi，沿Runtime替换矩阵评估真实消费者；不采用整个IDE，不仅因ACP存在就新增协议接线 |
| Warden人的Review attention | 采用证据优先及非作者核查方向 | 继续现Attention/Core Review与义务闭环；评分、fresh context及steering ACK不授予接受权，不把coding branch risk泛化为所有工作的风险真值 |
| VS Code Harness词汇 | 参考词汇边界，按CW合同映射 | 中央表区分Host Session/Run、原生Session、Task/Assignment、Matter、Provider/Model、Role/Expert、Harness/Runtime、Environment/Target；不引入同名新对象 |
| Temporal / Kubernetes机制 | 保留持久恢复/协调反例 | 观察、意图、幂等与重验机制用于后续合同；不引入Temporal/Kubernetes或DSL，不宣称外部副作用exactly-once。Reconciliation只能执行当前获准动作，不能自动重放effect-unknown操作 |
| 新增Release前全架构词汇门 | 调整为现有文档检查义务 | 当前中央架构及options已消费；其他活动合同逐消费者核对。原G门不扩项，不改写历史档案，不声称本轮已全仓语义审计 |

[选型入口](../../options.md)和[DEC-014补充](../../decisions.md)已接收本次裁决。这里的即时消费是正式文档/架构取舍，不是产品实现声明。

## 缺口沿既有owner登记

| 缺口 / 进入条件 | 现有承接 | 首个有界判别 |
|---|---|---|
| durable assignment、依赖/阻塞及跨Session接管；出现具体协作消费者后冻结合同 | [RD-005](../RD-005-multi-agent-selection.md)、[MA/ME候选](../multi-agent-selection-2026-09-10/pr-plan.md)、[治理地图](../architecture-node-2026-09-13/workspace-governance.md) | 停掉执行者并重开，只从获准owner投影回答责任与阻塞；缺分配事实标unknown，不靠旧聊天猜测、不重复effect |
| 配置化工作制度与持久知识；出现版本化消费者后实施 | [RD-007](../RD-007-resource-governance.md)及LG/DS/RG | 规则来源/版本、知识出处/失效与权限可追溯；新摘要不能复活撤权原文，不为AGENTS/WIP/TODO文件名建立专有schema |
| Review证据排序、steering回执与低噪声跟进 | [义务闭环](../obligation-closure-2026-09-12/README.md)、[恢复投影](../obligation-closure-2026-09-12/recovery-surface.md) | 同一旧证据/重复通知不自动关闭；指令送达、执行采用、成果接受各有回执；无变化静默不吞新风险 |
| 第三方Runtime/ACP/执行环境接入 | [Runtime替换矩阵](../architecture-node-2026-09-13/runtime-replacement.md) | 固定任务/能力组合，验证权限、取消、恢复、失败与退出成本；本地worktree不能冒充沙箱 |

以上是既有路线的增量判别，不新建重复RD、后台automation或产品派工。进入顺序仍按当前Release与局部Expert消费者；没有本次新增框架依赖。

## 验证与上限

作者检查原文/附件完整性、哈希与相对链接，检查文档差异；Luna承担来源探索，未把其研究作者身份写成产品独立接受。固定源码读取确认Host调用SessionManager并按Run创建AgentSession、原Core持有Matter/决定；具体路径与哈希见manifest。生产代码未改，不重跑无关全量测试；没有真实Provider请求、上游项目运行、性能/质量对照或UI验收。本轮不关闭Release门，不push/部署。最终检查结果见[checks](checks.json)。

原始source-conversation.md保留工具返回正文中的Markdown行末空格；仅此原件不做whitespace规范化。
