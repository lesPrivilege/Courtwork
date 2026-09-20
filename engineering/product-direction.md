# 产品方向 · 可接续的工作场

2026-09-15 · Astra裁定；原稿与处置见[消费记录](release/product-node-2026-09-15/README.md)。本文规定下一实现节点的产品合同与稳定语义，承接[五层架构](research/architecture-node-2026-09-13/architecture.md)与[Workspace Substrate](research/architecture-node-2026-09-13/workspace-substrate.md)。

## 2026-09-19 · Orchestra composition direction

[The Local Agent Orchestra registration](research/architecture-node-2026-09-13/orchestra-direction-20260919.md) connects product roles to execution compositions without changing Work, Host, Core, or Composer ownership. Role is intent; Kit is an admitted instruction/source/work-contract/verification composition; Agent Instance is the frozen `Role + Kit + Runtime + Provider/Model where supported + Environment + grants + revisions` binding; ExpertDefinition remains a versioned professional capability composition with a Work Contract, while ExpertInstance is the binding that satisfies it. A lightweight profile is not an accepted Expert loop.

Hermes + a general Attention Kit + Praxis and Pi/Codex + coding Kits are target compositions, not installed or accepted capabilities. Kit precedes on-demand Skill in Context compilation under Host rules and the current task, but does not raise authority, carry credentials, or turn materials into instructions; use the existing Context Compiler/activation/resource resolver. Each Runtime family/version reuses one Adapter; instances keep separate Session/config/permission/budget/Kit bindings. An Expert does not fork a wrapper, and shared process execution is not required. Composer continues to obey the existing Models card's `All chats · future runs`, `expectedVersion`, and active-Run freeze. A future role-first selection must resolve and freeze the binding before Run admission. Later Pages registration is recorded in [the authorized plan](execution/claude-frontend-harness-2026-09-16/orchestra-pages-registration-20260919.md).

## 从工作出发

CourtWork 为人和 Agent 提供共同的工作现场。材料、成果、版本、决定与未完事项共同构成工作关系；材料字节与正式效力仍由各自责任方持有。模型、执行器与任务角色围绕它参与。工作的连续性来自可理解、可寻址、可继续的记录，而不是某个 Agent 持有全部历史。

由此确定三个优先级：工作对象与效力规则先于执行拓扑；人的交谈与判断先于运行细节；可接续的小闭环先于能力数量。新的局部选型应当解释它怎样服务这些关系，而不是反过来要求产品围绕框架重新组织。

## 下一节点的完整路径

**从问题开始 → 明确连接材料 → 执行有界工作 → 展开成果与依据 → 作出决定或留下未决事项 → 回来继续。**

下一节点的首个完整消费者是电脑上的资料与仓库工作：理解材料、检索文件、进行获准修改、执行受控检查、阅读结果并接续任务。Coding 检验电脑操作的基本能力；正式 Matter 工作则继续检验候选、来源与接受之间的关系。两类工作共用基本体例，各自保留完成条件。

这一节点以真实闭环为完成面。扩展数量、模型数量、并行实例数和界面图表数量不代替闭环。

## 经典而有限的产品形态

| 工作面 | 稳定职责 | 交互语义 |
|---|---|---|
| 项目与最近记录 | 找到工作、回到上次位置 | 项目组织、会话身份、资料绑定与执行位置分开；先交谈，按需连接材料 |
| Chat 与 Composer | 表达意图、交谈、开始和调整执行 | 主对话保持连贯；模型、能力与权限范围可理解；运行过程聚合，细节按需展开 |
| 资料与 Preview | 定位来源、打开确切版本、理解产物 | 原件、保留的派生结果与临时呈现分开；目录、索引、片段与原文逐步展开 |
| Review | 对成果和依据作判断 | 作者说明、实际变化、检查结果与正式接受分源；决定绑定对象和版本 |
| Attention | 回到需要人跟进的工作 | 待决、阻塞、冲突与未完事项保持可定位；阅读通知不等于完成工作 |
| 模型与能力设置 | 管理连接、扩展、适用范围与运行配置 | 配置、启用、授权、本次绑定和实际使用各有含义；停用能力不改写历史 |

这些是职责与入口，不要求六个等权面板同时占据屏幕。Chat 保持主工作流，资料、过程与检查按需要展开。已有设计语言、组件和图标语义继续复用。

返回与前进恢复访问位置、草稿和视图状态；关闭 Preview 回到原对象与焦点。它们不撤销文件变化或正式决定。撤销必须由对应业务命令提供。通知提示需要注意的变化，不把每次工具调用变成人工收件箱。

## Chat、Spark、Attention 与执行角色

Chat 是人主导的交谈与工作入口。普通交谈不需要先建立 Matter；需要正式管理的工作再进入相应合同。

Spark 是稳定的准备与核对角色：整理获准材料、保留可引用的探索笔记与发现、承担有界的比较和核验。索引维护沿资源与派生结果的原合同演进。Explorer 是一次任务中的探索职责；它可以由 Spark 承担，也可以由其他获准执行者承担。产品角色、Agent 身份、模型 Provider 与执行权限分别定义。

Attention 组织人的跟进与判断。它不复制工作状态的第二份总账，也不要求人审阅每次内部检索、索引展开和 Agent 之间的资料消费。

默认用少量清楚的职责组织协作。委派说明目标、输入版本、允许动作、预算、结束条件与结果位置；返回简短发现、精确引用、冲突和未覆盖项，正文按需取用。是否并行取决于工作可否隔离与独立检查，而不是模型额度是否空闲。

## 资料保留与合理遗忘

**保留、召回与激活是三件事。** 资源服务保留字节和版本；检索按当前权限返回候选；Context 按任务、适用性与预算选择实际披露的内容。可读不代表应当进入每次上下文，语义相似也不代替适用性判断。

源材料、保留的派生结果、可重建索引、Model Context 与 Provider cache 分开。索引说明覆盖范围与新旧关系；摘要保留来源，不因重复引用成为更高权威。普通查询优先当前适用材料，历史查询可以回到确切旧版本。

合理遗忘先表现为停止默认激活、降低优先级、归档视图与重建索引；它不是悄悄删除被引用的历史。必要约束、未决义务、冲突和失败不因摘要更简短而消失。没有 Memory，基本工作路径仍然成立。

本地工作现场不等于所有模型都在本地运行。资料选择与向外部 Provider 披露分别受来源、接收方和当前授权约束；模型给出的脱敏建议不代替发送权限。

## 可组合呈现

Chat 容纳文字、运行事实、资料引用、结构化呈现和需要人回应的交互。共享同一外观或位置，不代表它们拥有同一类权力。

| 来源 | 呈现与动作归属 |
|---|---|
| 系统命令与运行事实 | Host 或对应运行服务提供事实；可确定的查询不必绕经模型 |
| 模型生成的结构化表达 | 使用受限语义、可信组件目录和预编译 renderer；保留文字回退与来源 |
| 文件及其他资源预览 | 按资源引用、确切版本与表示形式打开；展示位置不改变资源归属 |
| 提问、执行授权与工作接受 | 分别回到各自的动作处理方；不能因都是按钮就合并为通用 approve |

通用表达从 facts、表格、简单 chart 与 flow 及少量组合关系生长。模型提出内容和关系；Host 校验身份、版本、数据与权限，前端在获准语法和Host约束内决定布局与呈现位置，动作回到原处理方。复杂度、来源效力和权限彼此独立：简单表格可以展示正式数据，复杂图也可以只是推测。

同一呈现实例可在 Chat 内展开或进入 Preview，身份、版本与动作对象保持不变。局部排序、筛选和展开属于视图状态；正式动作仍调用原处理方。浏览器实时操作、可执行 HTML 和外部应用各自保留执行边界，不由打开 Preview 自动获得授权。

运行时的文字浮现、活动提示和动效负责可读与反馈；进度、用量和检查结论必须来自真实可观察事实。不能用阶段文案、颜色或动画补出不存在的运行状态。

## 可替换执行与专业能力

五层继续按变化责任划分：Adapter 接外部协议，Harness Core 驱动执行，Harness Extension 提供可组合能力，Work Core 管理正式工作变化，Work Extension 承载专业差异。Host 与 UI 组合这些责任，不把它们变成五个强制串行网关。

模型切换、执行器替换与工作接手是不同合同。工作接手使用获准的来源、成果与义务；原生会话只按其兼容协议恢复。可替换性以固定任务类别和明确能力集合检验，不以原生会话全量互转定义。

Expert 组织领域结构、工作契约、能力需求、验证方法与 Review 要求。它可以选择执行配置，但不把某个模型或 Runtime 写成专业语义。工具、Skill、MCP、Prompt 与其他扩展沿共同的配置、准入、范围、本次绑定及回执体例接入。

## 节点的收敛边界

下一节点完成一条真实的材料与仓库工作路径、一条有依据的成果检查路径，以及一次中断后的工作接续。已有 Spark 的有界准备结果与精确引用进入同一条路径；结构化呈现先打通 facts 的最小纵切。

第二 Runtime、独立 Spark Provider、完整 Memory Broker、更多图表和专业扩展按独立消费者推进。[Agents API](research/agents-api-first-2026-09-14/README.md)保持第二执行组合的优先核验候选；当前 Pi dogfooding 沿原任务继续。Swarm、全量后台维护、破坏性自动清理、通用云端调度与任意界面代码生成不加入这个节点的完成条件。

[施工分流](release/product-node-2026-09-15/README.md)连接原有任务与验证；[current](current.md)继续维护实际工程状态。

## 2026-09-20 · Understandable agent configuration

An experienced agent user should understand and use CW after a brief introduction to its purpose. The everyday explanation is: choose an agent for the work, apply a Kit when useful, execute through a connected Runtime/model within granted scope, inspect the result and continue. Use upstream Pi consistently and preserve existing underlying IDs. Expert composition need not become another setup stage. Composer, Settings, README and Pages use the same object names and actual configuration scope; the [presentation contract](research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#comprehension-presentation-and-document-ownership) records ownership and task-based comprehension checks. Multica is a reference for organized architecture, documentation and UI relationships. This target does not claim a completed onboarding or usability test.
