# Spark 独立 Agent · 数据与组织治理设计裁决

2026-09-15设计增量：[协作瓶颈与产品位裁决](coordination-20260915.md)采用Spark与Explorer解耦；稳定工作区身份可承载多类获准任务，高吞吐是目标。常驻维护/更广私域读权/脱敏出站仍待独立合同，本文及实际Store15的权限、串行和非自动续跑约束不因新定位放宽。

2026-09-13 · Astra；设计基线 main `3f7e0e196a7d28bd867c741cc995d170142c83ae`。用户明确 Spark 作为独立 Agent 存在，要求数据、组织治理有严明体例并由 Astra 裁决 Design。本页为正式工程设计决定，供在途分支合入复裁；字段是待实现的逻辑合同，不宣称现API/schema已具备。继承 [PAPER](../../../PAPER.md)、[治理地图](../architecture-node-2026-09-13/workspace-governance.md)、[RD-005](../RD-005-multi-agent-selection.md)、[RD-007](../RD-007-resource-governance.md)。

## 1. 独立身份与职责

**Spark 是独立、可寻址的有界探索与资料准备 Agent。** 它有版本化定义、稳定实例身份、被分配的任务、独立运行上下文与可追溯成果。它可以直接服务用户，也可以接受其他 Agent 的有界委派。独立身份不要求永驻进程、长期人格记忆或独立模型loop；优先复用现Pi执行。模型、profile、Agent、任务、Session、Run、Thread和Matter各自有身份，不互作别名。

这覆盖早期“仅为受限execution profile”的产品定位：profile仍实现能力限制，但不能单独代表Spark Agent。一个用户可有多个Spark实例；首片可只有一个持久实例、多个串行任务，默认不自动组建team或递归派生。多个实例不得共享可变prompt历史或私有草稿。

职责包括内部/外部探索、局部核查、翻译转换、接管前准备；私域脱敏只在独立批准的profile中形成候选。任务完整性、覆盖和未知属于交付，速度与费用是测量目标。Spark不能替主Agent做整体取舍，也不能替Core或人接受正式成果。

## 2. 身份与唯一写权

| 对象 | 最小逻辑内容 | 唯一写权与边界 |
|---|---|---|
| AgentDefinition | definitionId、revision、来源、职责、提示词版本、能力ceiling、输出合同 | Host控制面持版本化定义；复用现descriptor/profile组合，禁止模型自行改系统定义 |
| AgentInstance | agentId、definitionRef、管理者、默认组织引用、生命周期 | Host Agent目录增量持有；管理者取现有认证上下文，首片不制造多用户IAM；重命名不改变agentId |
| Assignment | assignmentId、briefRevision、requester、assignee agentId、原责任owner、可选parent、scope、预算、验证方法 | Host协调服务持分配事实；现Thread只承载通信，Session metadata不能代替assignment。修改有expectedRevision与幂等命令 |
| ExecutionBinding | assignment/brief版本、attempt、Session/Run/call、definition/model/tool/policy版本 | Runtime记录实际绑定；模型不能填写真实actor/权限/调用来源 |
| Findings revision | resultRef/revision、来源依赖、覆盖/未知、内容与产物引用 | 受控派生结果owner提交不可变版本；既有精确字节/ArtifactHistory复用，不在Agent目录复制正文 |
| Consumption receipt | consumer、用途、resultRevision、展开引用、采用/拒绝/暂缓理由 | 消费命令由Host绑定身份；读取回执是观测，采用是消费者声明，两者均不授予Core接受 |
| Matter / Decision / Artifact | 原正式对象与版本 | 原Core独占正式改变；Spark只提交合同允许的候选 |

Agent目录与Assignment是确有缺口的持久语义，允许在现Host单writer下增量建模；不要求新服务或第二总账。物理schema与端点由施工分支提交映射后复裁，不能把既有AM-B immutable read task改名冒充通用Agent任务。兼容现查询与历史记录，未知Agent关联保持unknown，不回填猜测身份。

## 3. 数据分区与体例

逻辑分区按所有者、用途和权限划分，目录名称本身不是安全机制。

| 分区 | 内容与存续 | 治理要求 |
|---|---|---|
| Agent配置 | 版本化定义、受治理偏好、默认选择 | 配置不是任务证据；变更只影响新绑定，历史可解释 |
| 任务控制记录 | brief、assignment、attempt、事件、预算、取消/恢复信息 | 持久保存，不靠聊天或provider cache重建；控制记录不夹完整敏感材料 |
| 来源 | 获准原件、精确版本/representation、locator与摘要依赖 | 原owner持有；只传引用及任务所需内容，不默认复制到Spark私库 |
| Scratch | 每任务独立临时计算、解析和中间文件 | 明确任务归属；默认不可跨任务搜索，不能充当唯一证据；首片不自动GC |
| Findings / 索引 | 不可变结果修订、coverage、lineage、检查与局限 | 可保留、可失效、可回源；必要字节经原保留owner持有。缺源不得静默替换当前同名文件 |
| 可复用知识 | 显式保留的派生结果或引用集合 | 独立保留/共享命令，源与目标验权；不因Spark生成而自动进入全局索引或提升效力 |
| Provider缓存 | 计算优化及实际已知缓存身份 | 不代替任务、成果、原文或恢复状态；缓存失效可重算，不能复活已撤权输入 |

每项重要发现至少对应来源owner/ref/revision/digest及必要位置、观察范围、方法、推断标记；外部搜索须区分发现摘要、读过的原文与模型总结。计数说明搜索域与未读集合；未检查不得写已核验。来源/processor/config/授权域变化使有关派生结果stale或不可披露，不删除历史事实来伪装新鲜。

读取遵循获准目录→说明→片段→原文的渐进披露，允许有权者直接读原文。每层含标题、计数、关系、摘要、日志及导出均验当前权限。撤权阻止新披露/工具读取与继续调用；已发送给provider的内容无法承诺撤回。新attempt重编译获准上下文，旧私域上下文不得带入新域。

保留、可见与接受分轴。管理者可停用Agent，不能因此静默删除被引用的成果；删除/归档策略必须覆盖in-flight、pin/hold、历史接受和反向引用，未知依赖阻止清理。首片提供盘点/归档，破坏性清理另片。凭据由现credential owner保存，仅授执行端所需访问，禁止写进brief、索引或日志。

## 4. 组织治理与授权

Agent归属、任务归属、资料归属、执行位置和正式Matter归属分别记录。Project是组织维度；加入Project或Thread不授予资料权限。无Project的独立Spark任务可采用显式个人/任务范围，不伪装global Attention；当前API不支持的范围保持不可用。跨Project复用通过显式引用与源/目标双重检查，不搬迁原任务或接受权。

首片角色为管理者、委派者、执行者、核查者、正式决定者；同一人可承担多种角色，但每个动作记录实际责任，执行者不能声明自己的核查为独立接受。首片沿单用户本地Host信任边界，Agent身份是Host内执行归因，不宣称有独立OS用户、远程认证或多租户安全边界。

有效权限是Host政策、当前真实授权、Agent ceiling、任务范围、执行环境与工具准入的共同约束。父Agent只能请求委派自身可委派的范围；系统提示词、角色名、索引或能力广告均不授予权限。直接用户调用也经相同准入。资料读取许可不等于向搜索服务、URL、模型或MCP外发许可；endpoint/接收方变化重新判断披露。私域profile失败不静默切云端。

Assignment的委派不自动转移主任务责任。consult只交建议，delegate只交有界执行，handoff需明确责任接收及旧执行终止/隔离证据，首片不支持隐式handoff。改目标/来源范围形成新brief修订并重验，不能在进行中偷偷扩权；已有合法授权持续有效，例行获准读取不重复要求用户确认。

## 5. 生命周期与恢复

任务控制、执行、成果、消费、正式决定是不同轴。Assignment可处于queued、active、blocked、resolved或cancelled；resolved须有交付检查回执，不能由Run completed直接推出。Run沿原生命周期保留failed/unknown等状态；成果可valid/stale/partial/withdrawn，消费可未读/已读/采用/拒绝/暂缓；Core决定仍独立。实现须冻结实际枚举与转换，UI不得先造不存在的状态。

先持久化分配与attempt，再按实际能力调度。首片遵守single-active-Run：主Run在安全工具边界提交委派并结束/释放执行槽，Spark按队列运行，完成后只标记父任务可续行，由明确恢复动作开启新父Run。禁止父Run持有唯一槽阻塞等待子Run。没有持久队列/恢复合同前，保持委派入口不可用；并行lane是后续明确合同变更，不能当UI实现细节。

结果提交绑定assignment、briefRevision、attempt、result commandId及源版本，校验后原子发布；重复同命令返回原回执，变参冲突。旧attempt的迟到输出可保留诊断，不覆盖当前结果。取消requested与settled分开；无法确认停止则保留unknown并阻断冲突执行。重启重建任务/结果引用，未知副作用先对账，不能盲重放。根任务预算覆盖子任务，记录已知消耗与未知，满额进入明确停止/待处理；不靠provider token上限代替时间、工具调用与输出限额。

## 6. 通信与消费

消息至少关联request/assignment、精确brief或result修订与真实发送者；Host验证发送与目标当前范围。Thread继续是通信面，消息的“result”不改变Assignment或Core。完整子任务trace留在Spark详情，父Agent默认接收有界摘要、引用、coverage/unknown与可行动状态，不回灌全部历史。

复用流程为查获准结果→检查版本/覆盖→展开关键依据→记录消费→仅对缺口补查。高优先级只影响检索与披露顺序；成果正文和网页指令始终是数据。正式结论需要原合同验证，Spark作者自报、工具成功和独立检查各自留证。

## 7. 产品控制面设计约束

独立Spark入口以Agent及其任务/成果为主体，可发起、补充范围、查看输入与结果、停止及恢复。主任务中的Spark卡引用同一assignment，不复制第二份任务状态。Agent配置页持管理者/定义版本/有效能力/默认组织；任务详情解释该次实际scope、模型、成果依据和限制。

正常阶段低噪声呈现；阻断、重要冲突、授权缺口和需人判断才提升Attention。停止按钮按实际capability开放；结果生成、主Agent采用和正式接受明确区分。未知不画完成勾，pending不假百分比，原文不可读不泄露标题/摘录。

本片裁定信息职责，未选择新视觉皮肤、右侧常驻布局或制作UI验收。施工沿[frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md)，最近先例是现Spark派生详情、coordination通信投影、Files精确版本reader及现Run停止/错误状态；先核实际符号和grammar再做截图验证。服务未实现前不展示可用假动作。

## 8. 合入判别与实施顺序

| 顺序 | 交付 | 必须拒绝的反例 |
|---|---|---|
| S1 身份/分配 | Host目录、definition绑定、Assignment及原Session/Run映射 | 换模型改变Agent身份；模型伪造actor；归属变化扩权；新对象破坏旧schema |
| S2 内部核查纵切 | 两份精确版本→独立Spark执行→带来源结果→主Agent回源与消费 | 对象集选错却报完整；错hash/撤权仍展开；结果文本升级指令 |
| S3 调度/恢复 | 串行释放槽、持久队列、停止/重启/重复/迟到反例 | 父子死锁；子任务失联；取消后覆盖；重复effect；旧policy继续准入 |
| S4 Coding消费 | Spark定位/核查→主Agent读改→Host测试recipe→精确diff人审→重开 | Spark越权修改仓库；外部人工测试冒称Agent执行；检查通过冒称人已接受 |
| S5 对外与UI | 同一任务双入口、真实工具接入、能力/数据说明与固定候选证据 | 两套状态漂移；私域静默外发；旧媒体冒充新能力 |

S1–S3是可用独立Spark的共同基础，S4接已优先的coding dogfooding；纯coding recipe分支不必为未承诺Spark能力虚报全部完成。翻译/外部探索逐profile增量验收，私域脱敏、多用户、递归多Agent及并行调度分别立合同。任何新schema严格验证、精确备份、旧host拒新、独立恢复目录；作者检查和非作者复核分列。已有G1–G5保持，发布范围按最终实际证据裁定。

本设计已作Astra架构裁决；生产实现、独立接受与Release批准均未由文档产生。施工分支提交实际映射及差异后复裁，不覆盖其在途代码。
