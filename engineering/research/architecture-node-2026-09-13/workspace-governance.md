# 工作区治理 · 接管、披露、分工与Attention

2026-09-13，Astra。用户提出Work Core可能包括文档管理、数据治理和组织治理，要求先完成原理与初步地图，可以后置实现。Astra据此采用三类问题域作为后续治理研究方向；并不把用户的可能性表述改写为已确定的全部功能范围。本页是CourtWork在当前SE治理基线下的工程推导，不改写[PAPER](../../../PAPER.md)或宣称论文新命题。外部机制与已登记选型的核查见[Luna探索](explore/workspace-governance.md)；采用范围由本页确定。

## 第一性问题：让下一位执行者可靠接管

工作区的价值不只是容纳文件，而是让接管者用有限context回答：这里有什么、哪些可读、哪一版有效、为何形成当前判断、根据实际assignment/Run回执谁正在做什么（presence或选中状态不足以证明）、我有权做什么、尚欠什么证据、什么需要人决定。若这些答案只能从上一agent的记忆或散落聊天里猜出，持久文件仍不足以形成可接管的工作区。

由此，`GovernedWorkspace = AddressableResources + VersionedMeaning + ScopedAuthority + TraceableChange + RecoverableObligations`。加号是共同必要的责任集合，不是要求一个物理store。`Takeover(actor,task,t)`读取当前获准的工作投影、精确来源指针、活动责任与未完成义务，输出“已知/未知、可行动/待判断”的有界工作面，而不是把所有文件灌入context。

文档管理回答字节、身份、版本、表述与引用；数据治理回答出处、质量、处理、保留、披露与失效；组织治理回答角色、范围、责任、委派、独立核查及决定权。这三者都属于Work治理的长期问题域。Work Core应承载其中稳定的效力与转换语义；Intake、索引、Runtime、外部系统与UI继续提供各自存储和服务。当前Core的Matter/Decision表是起点，不是长期边界的定义。

## 治理内核与配套能力地图

| 问题域 | 稳定的治理语义 | 初步owner与现有消费 | 缺口与首个验证 |
|---|---|---|---|
| 文档身份与版本 | identity、revision、来源、当前/历史、保留与缺件；同名不等于同对象，同hash不等于同权属 | Intake保留上传；ArtifactHistory持运行版本；Core持正式source/accepted成果；[RD-007](../RD-007-resource-governance.md) | Session精确读/比较已实现；跨来源统一descriptor及显式关系仍待首个消费者冻结 |
| 可发现资源目录 | 只列获准存在的对象、可用性与版本；metadata可见和全文可读分权 | [BG-01](../../../docs/work-core/governance.md)已提供获准Core registry/inspect；Session Files为局部来源视图 | workspace获准文件inventory未整体建立；先一个范围list→descriptor→exact read，验证隐藏计数不泄露 |
| 表述、解析与来源链 | 原件与OCR/摘要/抽取分开；transform/config/source revision可追溯；派生失败保持partial/unknown | [LG/DS/RG](../mature-practices-2026-09-12/roadmap.md)已登记 | 首片一个格式、一个processor，重建可验证；先精确/lexical，不预设向量库 |
| 内容关系与用途 | 引用、归属、采用、替代、撤回是不同关系；scope变化不转移正式效力 | Core source membership、Runtime引用、Intake记录各持写权 | 显式跨owner关联与失败对账；不以“加入Library”合并保存、公开与接受 |
| 数据政策与维护 | classification、disclosure、retention/hold、integrity、lineage分轴 | BG现查询时重验；DS核对/迁移与RG保留盘点已有方案 | 保留盘点先只读dry-run；未知引用阻止清理，脱敏展示不宣称原字节删除 |
| 组织、角色与授权 | actor、role、assignment、scope、review责任与authority分开；同组织不自动全读 | 现单人Host信任边界、Core决定与Harness Thread/child约束 | 组织级principal/role policy尚未完整实现；先单人多执行者的显式责任票，未来多用户另定义认证与审计 |
| 接管与连续性 | 工作版本、义务、决定依据和活动责任可恢复；访问位置不等于执行状态 | [恢复面裁决](../obligation-closure-2026-09-12/recovery-surface.md)、[Memory Broker](../chat-memory-broker-2026-09-12/README.md) | 有界handover投影/receipt待实现；重启、源更新、撤权和原agent缺席都可重新构建 |
| Review与Attention | 实现回执、独立验证、接受/关闭分别留证；只把可行动差额送人 | Core Review/Attention已有局部能力；[义务闭环](../obligation-closure-2026-09-12/README.md) | 工作级消费/验证回执、提醒合并与静默调度尚未贯通；先一条义务的生成—消费—核查—人决定 |

这张map分的是语义责任，当前不要求新建八个service。进入Work Core的应是跨领域需要一致解释的正式约束与命令；专业分类法、检查标准由Work Extension提供，解析/检索由可替换服务实现。外部DMS/组织系统若已有正式owner，通过明确协议读写和回执接入，不能复制一份“更正式”的CW状态。

## 渐进披露：先定位，再读取，始终验权

披露路径为 `D0获准目录 → D1对象说明/版本 → D2任务相关摘要或片段 → D3精确原文/成果`。这只是读取成本与认知负担的阶梯，不是强制权限继承。目录条目、标题、总数、关系和缺失提示都可能泄露存在；每层均须按当前授权过滤。允许直接读原文的消费者无需先经过摘要，Expert始终可以在权限内反查与补读。

`Disclose(actor,ref,view,t) = Authorize(actor,scope,view,t) ∧ ResolveExact(ref,revision) ∧ Bound(view,budget)`。相关性决定在获准集合内先看什么，不能决定可读什么。摘要、embedding和索引不能复活撤权的来源；未知字节、源不可用、旧索引和校验失败必须可见，不能静默回退到同名当前文件。

接管目录的目标descriptor至少能表达稳定ref、owner、kind、revision、availability、允许的下一读取动作、来源/更新时间的已知范围。无需为全部对象编造mtime、生命周期或完整metadata。BG现object_version与collection_version的有界一致性机制可作先例，不能宣称跨Host/Core/外部目录已经有同一全局snapshot。

## 接管投影与执行交接分离

拟议handover不是第二份工作账本，而是带生成时间、覆盖、owner revision与引用的只读投影。最小内容是工作目的/当前约束、获准资源地图、当前决定及其依据、开放义务、候选成果、有实际回执支撑的活动assignment/Run状态（未有分配事实则记unknown）、已做/未做核查和下一可行动项。自然语言摘要只作导航；每个重要断言须指向原owner事实，unknown保留unknown。

交接消费应记录谁在何任务范围读取了哪版投影，及发现哪些stale/缺件；这不等于接收责任、接受成果或关闭义务。跨owner读取不是原子snapshot：投影应带各owner revision与捕获范围，执行前重验关键依赖；不一致时重建对应部分。未来若需要强一致交接，先证明真实失败及事务需求再设计协议。

工作接管不能悄然接管旧进程。旧Run可能仍运行或effect unknown；新的执行者先辨明活动责任，避免重复动作。Runtime恢复走相同lane的兼容协议；更换runtime从获准工作状态重新开始。租约、fencing或持久调度可以成为后续实现机制，但当前没有这些事实时不展示“已独占接管”。

## 多agent分工：按证据和责任分，而非按人格分

| 责任 | 主要产物 | Review与Attention边界 |
|---|---|---|
| Chat / 澄清与探索 | 需求、问题、来源线索与可引用讨论 | 原讨论保持provisional；需要持久义务时用显式原owner动作 |
| Spark / 资料准备 | inventory、索引、差异、抽取、覆盖/unknown与出处 | 自动化优先处理重复准备；摘要不是唯一证据，不能压掉冲突或替人接受 |
| Expert / 实现者 | 固定Contract与scope下的候选成果、实际执行回执、未做项 | 写权有界、可追溯；作者检查不称独立核查 |
| 独立核查者 | 对固定成果/来源版本的反例、检查方法和结果 | 同模型的另一上下文可做非作者检查，但不宣称统计独立或专业资格；需要领域判断时交合适的人 |
| Attention / 协调辅助 | 待人决定项、版本变化、失败、阻塞及关联义务 | 不把每个事件变提醒；升级应带原因、证据、影响与可选动作，不隐式递归派工 |
| Human / 有权决定者 | 授权、取舍、接受、退回或关闭的明确命令 | 已有授权持续有效；无需为每次可逆动作重新确认，但越出权限范围必须停在边界 |

拟议assignment至少明确任务目标、scope、输入/Contract版本、输出、每种正式effect的唯一提交owner及获准执行者、验证者/方法、预算/停止条件和升级路径。它是未来有界合同，不声称现Thread消息已有完整assignment管理。可并行的单位必须有独立写权或明确协调；串行依赖不靠多agent数量解决。合流者检查依赖与版本，独立核查不由作者自己宣告完成。

## 呵护人的Attention

人的注意力应用在不确定的取舍和需要权威的决定上。执行进度、重复发现与无变化观察优先留在可展开的trace；新风险、证据失效、失败、授权缺口和可供决定的成果才进入相应待处理面。`Escalate = (RelevantToOpenObligation ∧ MaterialChangeOrDecisionNeed) ∨ NewMaterialRisk`是设计筛选原则。在获准范围内新发现的重要风险即使尚无义务也须走适用的升级/事件路径，随后由获准owner创建或关联义务，不能因缺少既有条目被过滤。具体阈值/去重/静默策略须按实际任务检验，不能据该式自动丢弃义务。

每个提醒应能回答“为何现在、关联什么、已查什么、还缺什么、谁可决定”；已读不等于解决，静默不等于不存在，合并提醒不合并不同义务。评价除提醒数与context成本，还应记录漏报、错误关闭、重复劳动、回源正确率和恢复理解耗时。没有实测不能声称Spark已降低成本或提升注意力质量。

## 初步验证路线

先把同一合成工作区交给两个相继接管的执行者：第一位登记两版资料、一个候选、一条未完成义务；第二位不依赖第一位聊天摘要，通过获准目录定位并逐步读取，发现一处改版/撤权，恢复下一动作。另一个非作者核查确切版本与遗漏；Attention只呈现需要人的取舍。验证集合包含明确授权范围的完整目录oracle，检验分页和覆盖声明，不能只预挑两份文件而漏掉其它获准存在项；隐藏对象不进入目录或计数，可见但缺件与尚未盘点的unknown分别表示。成功条件是覆盖如实、找对版本、无越权、无重复副作用、无错误关闭、依据可回源，不是接管者能复述全部文件。

优先复用已实现Session Files/精确reader/BG目录和Core Review，补一个消费者的跨owner只读投影。组织级ACL、完整DMS、OCR/embedding、自动巡检、包市场与调度按真实缺口逐步增加。此节点先登记原理、map与反例；实现成熟度和正式支持继续由各合同/交付负责。

## Astra对探索材料的采用

[Luna的Exa探索](explore/workspace-governance.md)覆盖四个检索方向、20个请求结果槽，最终核验五份一手文档；检索量不冒充已核验来源数。Astra采用其支持的机制原则：PROV用于解释来源关系，MCP的目录/读取分离用于比较披露接缝，职责/权限/审计分离用于检查组织合同，多agent实践用于约束独立任务的范围与协调成本。它们均不替代CW原owner、权威、版本或接受合同。

本次不选定RDF、完整安全控制框架、MCP内部存储、永续manager或新的第三方治理平台。已登记LG/DS/RG/BG的消费者继续优先；真正缺口是跨owner覆盖可知的目录与接管投影、显式责任/检查回执及有实测支持的Attention策略。初步map与反例可以指导下一份有界施工合同，无需先采购或实现全部候选。
