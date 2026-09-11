# Governed work loop · 裁决与独立review入口

2026-09-12，Astra；输入基线main `1cf5e9632508345dfdfcb9d311f75744e9eed528`。用户补充四角色围绕受治理工作状态运行，并要求完成裁决、合推清理、部署Pages及提供独立review指引。本轮采用整体模型，文档设计与当前实现严格分开；不因发布而宣称四角色闭环已实现。

## Astra整体裁决

**CourtWork围绕governed work state组织工作闭环；多Agent编排是可选执行机制，不是产品的完整定义。** Chat、Spark、Expert、Attention是可组合职责，不是固定四个agent实例、四套store或四个同时运行的loop。Human持有最终治理权，通过实际角色/授权与owner命令履行，不是第五个Agent；不代表每次读取或已授权操作都需新的人类批准。

| 角色 | 采用的职责 | 不直接取得的权力 |
|---|---|---|
| Chat | 探索、讨论与形成可引用候选；原始conversation保持provisional与来源coverage | 用户随口设想或模型建议不自动产生正式决定/义务；Provider本地投影仍是待实现方向 |
| Spark | scan/index/diff/classify/extract/pre-review，缩小查找范围，准备带出处、版本、unknown与冲突的工作面 | schema合法不等于获准写入；自动capture/去重/关系关联/候选写入需明确授权、原owner命令、CAS/幂等与回执；不自行发布正式状态 |
| Expert / Runtime | 按适用Work Contract消费工作面，渐进补查，执行或形成专业判断/候选 | Expert是能力契约，Runtime承担实际执行；专业判断不自动成为Core accepted state。不能只准看Spark摘要而禁止查原文、发现遗漏或质疑筛选 |
| Attention | 跟踪义务回执及适用性，按范围核查、保持安静、必要时升级 | 不从已阅/heartbeat/模型confidence推出完成，不因Spark supported而自动resolve，不无授权递归委派 |

`Store → Govern → Retrieve → Compile → Act → Verify → Escalate / Close`采用为产品闭环的说明，不替代Paper原链条或现有状态机。阶段可以反馈、部分完成、取消或重开；Verify可由确定性检查、Spark、独立Expert或人承担，不是Spark独占。Close由相应owner依现授权合同执行；当前Attention resolve仍是明确human action。

## 状态、治理与披露

“Agent不成为彼此的memory”采用为权威边界：下一参与者凭稳定ref、版本与获准reader恢复工作，不依赖上一agent摘要作为唯一事实。消息/summary仍可作线索，但须可回源；Runtime protocol state、事件、原始conversation、派生memory、compiled context、Matter正式状态保持独立owner与生命周期。Court是共同工作的范围，不意味着所有数据物理写入Work Core或由单一Core表持有；外部系统仍保有原正式owner。

用户图中的`Event / Matter`不能解读为事件自动入Matter或conversation自动accepted；写入index、关联候选、登记义务都必须验证实际来源、目标范围与已采用的完成要求。捕获授权、治理性写入授权、专业接受权分别处理。重复/相似文字不自动合并真实不同请求；撤回、替代及原始出处继续可追溯。

`Physically available ≠ authorized ≠ disclosed`采用为约束。角色、Court、Matter和data class是policy输入，不是一条自动继承权限的层级；同机、同库、同角色或相关来源均不授予读权。每次query/read/compiler披露沿可信身份与当前grant，预算不代替权限；Provider拿到context属于实际披露，隐藏CW投影不能抵销它。输入示例的Spark repo read等不是当前默认权限表。

“四个角色，一个受治理工作闭环”可作为后续文案候选。本次不替换已发布Hero/README，不添加自动治理、跨Provider memory或闭环调度已可用的承诺。成本/context pollution/attention drift改善是待测假设，不能由职责图证明。

## 当前实现与后续消费

- 已有Core正式决定与Attention状态/回执、Runtime/Session、受限披露和若干来源工具；事实沿[Attention合同](../../../docs/work-core/attention.md)、[Attention运行入口](../../../app/docs/attention-agent.md)、[Runtime canon](../../architecture-runtime-canon.md)。
- [Memory Broker](../../research/chat-memory-broker-2026-09-12/README.md)与[义务闭环](../../research/obligation-closure-2026-09-12/README.md)是已裁文稿：可见/编译/披露分离、版本回执、关闭权、Tension与heartbeat边界；不是已实现的自动摄取、治理写入或监控。
- 施工消费沿BE-19/20/23、LG/RG、ATT/ME-06与[下一Harness节点索引](../harness-next-node-2026-09-12/README.md)。来源已授权的最小只读纵切先提供真实证据，再冻结必要写入与迁移；本次不改变用户待定排单，不新增scheduler或自动任务。

## 给独立review的简短指令

先固定实际main SHA，确认工作区干净，再阅读本页、Memory Broker、义务闭环、Runtime canon及下一Harness索引；只在发现具体争议时沿链接深入源码与原回执。不要把current中的旧时点段落当成最新实现，也不要从发布网页反推能力成熟度。

请独立判断：

1. 各类状态/来源/写入/接受/关闭是否仍有唯一明确owner，是否出现schema合法或Spark核查自动越权。
2. capture、消费、实现、验证和关闭是否有版本、范围与独立证据；unknown、撤权、旧来源、部分完成是否保留。
3. 四角色描述是否隐藏当前Pi耦合、缺失Broker/调度或过早承诺迁移；Expert能否反查原始依据与筛选遗漏。
4. 对下一节点给出建议顺序、依赖及停止条件，分清“必须修正合同”与“后续实现候选”；不要直接实施或替作者声称产品接受。

交付一页 findings：严重度、固定SHA+路径、反例、建议，以及无发现/未覆盖范围。真实API验证另用[8项用户prompts](../frontend-node-2026-09-12/RUNTIME-VALIDATION.md)，本次review不默认付费调用。

## 发布与干净节点范围

本次Pages部署包含已提交的深色“一笔红”修正 `ad5a03f`，沿既有GitHub Pages workflow，不迁移hosting。发布结果见[deployment](deployment.md)。独立review使用与远端main对齐的干净检出；共享Courtwork目录的其他writer未提交内容单独保留，不混入本次提交，也不把保留它们的共享目录称为clean。所有已合入本轮开发分支可退役，archive ref保持。

后续Chat边界：[薄能力层裁决](../../research/chat-memory-broker-2026-09-12/thin-capabilities.md)登记Provider会话与可选检索/connector，避免Chat扩张为通用执行环境；这是本发布节点之后的文档增量，不重写已固定部署或冒称已实现。
