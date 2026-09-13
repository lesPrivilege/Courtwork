# CourtWork架构 · 五层责任与工作闭环

2026-09-13，Astra。基线与评审分工见[节点入口](README.md)，逐symbol事实见[Luna实现登记](explore/implementation.md)。这是当前架构方向，模块名描述责任，既有文件不必为了命名搬迁。所有实现成熟度按固定代码和回执判断。

## 从工作问题推导边界

一次执行会终止，工作可能继续；输出可以正确却未经接受，也可以执行成功而工作未完成。因此执行身份、协议历史、材料版本、工作决定和人的待处理队列需要不同生命周期。由此推导三个稳定边界：执行器负责实际动作与观察；领域owner负责哪些变化有效；表面负责让人理解事实和表达意图。更强模型、更多agent、统一数据库或更漂亮的UI都不能代替这些边界。

五层按变化原因分开：上游协议变化落Adapter，执行机制变化落Harness Core，可选执行能力落Harness Extension，工作效力规则落Work Core，专业差异落Work Extension。Host组合各层并承接认证、运行资源和持久化；UI通过真实投影与动作使用它们。五层不是五个串行网关，也不是必须五个服务。

工作区作为可接管工作现场的推导、文档/数据/组织治理以及多agent分工见[治理地图](workspace-governance.md)。Work Core的长期语义范围不限于现有Matter表；服务和数据物理owner继续分开。

## 语义与当前落点

| 层 | 输入、输出与责任 | 持久事实 / 当前实现 | 不属于该层 |
|---|---|---|---|
| Adapter | 在外部协议与内部合同间保真转换；区分Provider Adapter与Runtime Adapter | Provider身份、endpoint/协议修订、能力来源与编码由现provider-control/model-capabilities、Pi ModelRuntime与payload hook协作；Runtime侧为pi-session-runtime | 不定义工作完成，不将unknown补成默认支持，不以通用字段抹掉私有恢复要求 |
| Harness Core | 接受有界运行输入，驱动turn/tool循环、事件、终止与恢复协议 | 本地优先复用Pi三包0.85.1；AgentSession执行，Host保存Run事实；service仍直接用SessionManager | 不重新实现模型loop；`app/harness/`目录不是整个Harness Core；不拥有Matter接受权 |
| Harness Extension | 在已准入组合中提供工具、MCP、context hook、通信/子任务、执行环境接入 | control-plane、mcp-manager、source-resolver、tools与coordination等已有部分；Pi私有扩展随Pi组合，Host共享服务保留各自owner | 声明不授予权限；包能执行代码不等于被隔离；Pi TUI贡献不直接成为CW网页组件 |
| Work Core | 对工作对象、来源、版本、候选、决定及义务执行合法查询与状态转换 | WorkCoreOwner/CoreClient、Python bridge与同一SQLite事务；Core schema4 / bridge app schema5 | 不导入Pi/Provider/UI，不根据模型自评或工具成功自动接受、关闭 |
| Work Extension | 定义局部专业结构、Work Contract、候选校验、呈现需求与检查方法，向Core提议 | 可信catalog中的NDA、Evidence Memo、WorkExtension及domain/adapter是局部实现 | 不自授写入权；非完整Expert市场、安装平台或任意脚本renderer |

当前Pi资源loader关闭自动发现extensions/skills/prompts/themes与AGENTS.md，并禁用Pi builtin tools；工具和指令由Host显式注入。“提供Pi生态extensions”是后续按准入合同复用的方向，不能写成今日安装Pi包即可自动进入CW。

**Expert**是可版本化专业能力组合：领域结构、Work Contract、能力需求、验证方法和Review声明。Work Extension承载专业差异；Expert可以引用执行profile，但不把某Provider或Runtime固定为工作语义。`Schema < Contract < Expert`不作为继承关系。**Runtime**是实际执行组合或原生执行器实例；**Environment**是动作发生的位置与约束。**Work Compiler**是将当前合法工作投影与能力编成Run输入的责任，目前分散在context/activation/adapter，尚非完整独立服务。

## 定位与对象词汇补充 · 2026-09-13

[Court定位参考实践](../court-position-2026-09-13/README.md)补充DEC-014。CourtWork面向跨会话、执行者和人的持续工作；“AI work control plane”可作内部架构解释，描述协调执行、受治理工作状态、证据与人的决定的责任，不是新产品名、独立中央服务或已完成全部控制能力的声明。Orchestration是其中一种策略能力。外部参考不证明Court的领先性、可靠性或通用产品完成度。

| 词汇 | CourtWork中的含义 / 当前落点 | 必须区分 |
|---|---|---|
| Work / Matter | Work为工作问题域；Matter为Core拥有的正式工作对象，含来源、候选、决定和版本关系 | 不是每条聊天或每个coding任务都自动成为Matter；不能以Session日志代替正式记录 |
| Task / Assignment | 普通task是待办/任务称呼；产品合同必须说明来自哪个协议或owner。Assignment是拟议有界责任合同，见治理地图 | 外部A2A Task、第三方work graph、Codex开发任务与Core Matter不做同名映射；尚无通用durable assignment服务 |
| Host Session / Run | Session是Host持久对话与配置/绑定范围；Run是一次已准入的执行，有独立身份、输入绑定和终态 | Pi AgentSession/SessionManager是执行协议对象；既不与Host Session等同，也不持有Matter接受权。当前每Run创建/释放AgentSession |
| Provider / Model | Provider是模型访问服务及其endpoint/协议身份；Model是该服务可寻址的模型及有来源的能力声明 | Pi是执行SDK，不是Provider；Claude/Codex名称必须说明具体模型、应用或执行器；requested、encoded与observed分开 |
| Agent Role / Expert | Role描述有界任务职责或profile；Expert是前述可版本化专业能力组合 | 名称不授予权限；reviewer角色、另一个context或更强模型均不自动获得正式接受权 |
| Harness / Runtime | Harness负责执行循环及配套机制；Runtime是实际绑定的执行组合/实例，由Adapter接Host | 不是Provider别名，不强制所有原生执行器绕回Pi；通用Runtime Port与第二执行器仍待验证 |
| Execution Environment / Session Target | Environment是动作所在位置和约束；外部工具的Session Target是其路由/宿主选择词汇，接入时须逐项映射 | 本地/worktree/容器/远端是环境或资源形式；worktree本身不构成沙箱；不为外部词汇新增CW对象 |
| Orchestrator | 在已获准任务范围内安排、观察和协调执行的策略/能力 | 不成为新的正式状态总账，不从worker完成推导工作接受，也不隐含持久调度或无界自动派工 |

这些是关系轴，不是单一上下级目录。Chat、Spark、Attention是产品职责/工作面，Expert是能力组合，Provider是外部服务，Environment是执行约束；不能将它们串成一条固定服务调用链。消息记录、执行事件、正式工作状态和Model Context分别按原owner保存或编译；“只存事实、派生UI”不意味着删除合法草稿、配置、协议历史或正式决定。

活动架构和新adapter合同必须写清对象的owner、身份、版本、范围与转换依据；遇到外部同名词先映射再采用。本片完成上述中央术语补充，未审计并改写所有历史文档、未迁移数据库或重命名现有API，也不新增Release gate。当前实现事实仍查具体源码与交付回执。

## 设计公式及其检验方式

下列公式是合同记法，不是性能定理或当前DTO。每个项都须有版本/身份/范围；缺失依赖保持unknown或拒绝，不用模型文本补齐。

1. `Runtime_pi = bind(Pi Harness Core, admitted private extensions, Provider Adapter, Environment, revision)`。另一接法是`Runtime_native = bind(native engine, native capabilities, Environment, revision)`，由Runtime Adapter接Host。原生执行器可自行持有模型适配；不强制绕回Pi。Host共享资源与Work Core不纳入可替换私有包。
2. `AllowedCapabilities(a,t) = Requested(a) ∩ Granted(actor,scope,t) ∩ HostPolicy(t) ∩ RuntimeSupported(rev) ∩ EnvironmentAllowed(t)`。这是允许能力集合；只有动作全部必需能力`Required(a) ⊆ AllowedCapabilities(a,t)`且其审批/前置条件满足，才能执行，不能把非空交集当整项动作获准。运行启动冻结支持与配置绑定，执行时重新核查动态授权。预算是额外限制，绝不增加权限。反例：同机可读、目录被列出或工具已注册，仍不意味着本次可调用。
3. `Context_r = Compile(AuthorizedVersionRefs, WorkProjection, ExpertContract, Instructions, Budget; selectionRevision)`。Instructions来自已准入的指令源并保留来源/优先关系；材料正文仍是数据，不因读入context升级为指令。输出携带入选/遗漏、版本和来源关系；重新编译不能恢复已撤权的材料，也不能把摘要变原文。向Provider发送context是实际披露，需要经过同一授权边界。
4. `Observation = Execute(Runtime_r, Input_r)`；`Candidate? = ValidateDomain(Observation, Contract_v)`（仅在工作合同要求提议时产生；普通Chat观察不必生成Candidate）；`State_(n+1) = CommitOwner(State_n, typedCommand, actor, expectedRevision, evidenceRefs)`。执行成功、领域校验和正式效力是三个不同判断；CAS、幂等、失败回执在原owner实现，不承诺跨Host/Core/外部系统原子事务。
5. `Close(o) ⇒ AuthorizedClose ∧ ApplicableCompletionContract(o,v) ∧ RequiredEvidenceSatisfied(o,v)`。这是必要条件，不是自动关闭充分条件。现Attention resolve走明确human action；核查者、实现者与最终决定可不同。stale、unknown、冲突、部分完成不会通过数量计数消失。
6. `Recovery = ReconstructAuthorizedWork(refs,versions,obligations)`；`Resume = ContinueCompatibleProtocol(runtime,sessionRevision)`。恢复工作理解不等于恢复进程；跨runtime以获准版本投影重新开Run，不能把Pi私有日志原样冒充Codex会话。
7. `UI = Project(ownerFacts, advertisedActions, viewState)`。UI可以保留草稿、选区和滚动位置，但不生成领域完成事实。工具审批批准执行；Review接受成果；两者不互换。模型选择的requested、encoded、bound和observed分别保留。

可替换性定义为对**固定任务类与已声明能力集合**保持上述可观察合同，而不是逐token相同、通用session互通或全功能等价。检验集合见[替换矩阵](runtime-replacement.md)；未通过的能力标为unsupported或保持候选。

## 状态和数据的唯一owner

| 数据 | owner / 生命周期 | 允许跨层使用方式 |
|---|---|---|
| Host Session、Run、配置、权限、事件与连接检查 | RuntimeStore schema13与Host运行控制；模型能力revision进入Run绑定 | 投影/命令；旧Run不被新catalog改写，迁移使用独立数据 |
| Provider/runtime协议历史 | 对应runtime session持久化owner；由协议修订决定可恢复性 | 兼容恢复；迁移须单独证明，不作为通用memory |
| Intake、保留文件版本、conversation与来源引用 | 各自来源/文件/会话owner；有scope和出处 | 获准精确版本reader/引用；上传不自动入Matter或变accepted |
| 正式Matter、Candidate、Decision、Attention与active版本 | 同一Work Core事务 | 原owner查询/受认证命令；不在Spark或UI复制第二份正式状态 |
| 摘要、索引、Spark准备结果、compiled context | 派生责任的明确owner与版本关系；通用Broker尚缺 | 可回源、可失效、可重建；没有证据不承诺已实现 |
| UI草稿、访问位置、overlay | 浏览器临时状态或已定义偏好owner | 丢弃不改变正式结果；返回按视图历史，关闭overlay返回触发焦点 |

## Chat → Spark → Experts → Attention的产品论证

产品闭环围绕获准工作状态循环，四个名称是职责而非四个固定agent或四个store。Chat可直接讨论而不建立Matter；只有持续工作需要正式义务或成果效力时才进入对应Core合同。

一条可验收纵切：Chat接收来源明确的请求与资料 → 人或已授权动作登记工作范围/义务 → Spark读取获准版本，形成索引、差异或有出处的准备结果 → Expert按Contract执行/提议，并可反查原文、补读和质疑Spark遗漏 → 确定性检查、独立Expert或人验证 → Attention呈现尚需人决定的事项 → 原owner接受/退回/关闭 → 下一次Chat或Expert从当前版本与未完成义务恢复。每条箭头均可失败、返回、撤回或变stale；不以直线流程替换现有状态机。

当前已具有Chat执行/引用/文件阅读、局部Work Extension/Core决定、Attention及受限披露；Spark目前已有work-derivations只读投影；通用Spark摄取、义务消费/检查回执闭环、Broker与恢复巡检尚未整体贯通。Spark采用自有产品封装，优先Pi生态；“自研”不等于自写模型loop，也不以性能胜出作为产品责任存在的前提。Attention既是人的工作队列，也可有受治理的辅助执行；任何自动续行都须有单独范围、停止条件和回执。

Chat网页端材料、检索/connector与成熟交互索引用于论证连续性和按需披露，不能被解释成可复刻第三方未公开能力。网页会话、本地来源、主动上传、执行位置、项目组织和Matter效力继续分开。容器、OCR、跨scope关联、Provider会话接入各按实际消费者施工，不为“统一memory”先搭全能平台。

## 后续产研方向与进入条件

| 顺序 | 下一成果 | 退出证据与停止条件 |
|---|---|---|
| A 当前自足节点 | 五层裁决、旧论断清账、现有UI入口体例与公开部署 | 源码/计划/回执可追溯，修复独立核查；部署不称产品资格全部完成 |
| B 局部Expert真实工作 | 继续Pi + DeepSeek固定coding-profile组合dogfooding，补DF未覆盖项；再按实际Work Contract形成局部Expert纵切，普通profile不冒充Expert。按一个工作消费者补资料绑定/context精度 | 指令来源、输入版本、候选、检查和实际回执；无收益或缺owner则缩小范围，不启动通用平台 |
| C 最小Runtime Port与Codex候选 | 先移出service的SessionManager生命周期依赖，固定协议版本，再实现公开能力足够的受限任务替换 | 同任务控制/失败/恢复/权限矩阵；unsupported不伪装支持；不以C作为B前置 |
| D 同Expert工作替换与闭环 | 保持Expert/Contract/Core不变，在第二runtime产生候选并走相同Review | Core状态转换和接受证据相同合同；再按实际缺口增Compiler、Spark与义务回执 |
| E 分发与规模化 | 由重复局部需求决定包格式、独立进程/沙箱、registry与调度 | 维护成本、权限隔离、迁移/回退、版本兼容有独立证据；不要求热插拔或Rust重写 |

方案以有界工作价值和可证伪边界推进。当前阶段不新增全部五层同名包，也不将架构收尾扩大为实现所有后续能力。性能研究继续沿BM/BE-42口径：host首输出不是Provider TTFT，缺token时间不报decode TPS；真实Provider调用另遵既有具体授权与预算。

## Spark独立身份设计接续 · 2026-09-13

[Spark独立Agent治理设计](../spark-explore-2026-09-13/design.md)补充本页角色定义：Agent实例、版本化定义、Assignment、Session/Run及结果修订分别寻址，data/organization/authority分轴。Host目录与协调服务增量承接身份和分配，沿原owner持执行、字节与正式效力；设计采用不等于现生产已交付。
