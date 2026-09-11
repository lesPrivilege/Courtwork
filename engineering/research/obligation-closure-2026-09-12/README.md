# 工作义务闭环 · Astra裁决与后续消费

2026-09-12；基线main `ad5a03fd0fd4597b3320c540d68f005f7c72e48d`。用户要求登记Spark准备/核查与Attention长期闭环职责，不固定调度算法。**本轮采用职责与证据边界，留待后续，不修订发布面、不启动监控或实现。** [输入主题索引](input-notes.md)明确是本次粘贴内容的摘要，不是完整会话导出。

## 采用的责任

| 责任 | Astra裁决 |
|---|---|
| Work obligation | 只有被明确采用、具有责任范围和完成条件的请求/裁定才成为义务；研究候选、引用和roadmap愿景不自动授予执行义务。先记录来源owner、稳定身份、确切修订与采用依据 |
| Work Core | 持有现有Core对象的正式状态、决定、Attention与回执；外部PR/工单保留原系统owner，只作带版本关联，不复制第二份可独立决定的外部状态。不宣称今日已有通用obligation schema |
| Attention | 组织未闭合事项及跟进依据，保持既有Core owner与披露边界；“quiet supervisor”是未来受控投影/触发责任，不新增manager agent、常驻loop或第二权威库 |
| Spark | 准备低噪声、带来源与coverage的工作面，执行有界只读核查；复用既有受限execution profile，默认无工具，必要的只读工具仍需allowlist/实际许可，不因“核查”取得全仓访问 |
| Expert / Runtime | Expert提供领域完成/评估要求，Runtime执行与产生实际运行证据。强模型同样没有天然关闭权；模型档位不等于独立验收者身份 |
| Human / owner action | 决定适用性、歧义、授权和当前合同要求的人类关闭；明确已有授权可继续履行，不把每次核查变成新的确认门 |

沿[Attention现行合同](../../../docs/work-core/attention.md)、[Attention运行入口](../../../app/docs/attention-agent.md)、[Spark定义](../spark-product-definition-2026-09-11/README.md)消费。旧Attention研究稿中“没有Attention表”的盘点是历史基线，不能覆盖已实现ATT-BE-01；本增量不是重派该已交付单。Spark已有整理/抽取/翻译仍可直接满足用户目标，不将所有Spark工作降格为必须交给强模型的中间材料。

## 回执分离，不新增单一直线状态机

采用 `registered ≠ consumed ≠ implemented ≠ verified ≠ closed`。assigned也单列：派单或送达不证明消费者接受，消费者的采用声明不证明真正影响实现。它们是拟议证据维度，不替换当前 `investigating|needs_you|waiting|later|resolved`。一个义务可多次派工、部分消费、多份实现与多次核查，也可明确撤销、替代、豁免或重新开启，不能以缺少commit把合法文档裁决当失败。

后续回执的最小语义（尚非API/DTO）为：

- obligation/source owner、ID与source revision；完成条件/适用范围及其版本；actor、实际观察时间与可用来源时间分别记录。
- assignment关联真实目标role/Run/任务与交付接受情况；consumption关联确切版本、具体去向、采用/调整/不适用理由，保留声明的证据等级。
- implementation_ref固定commit/PR revision/artifact版本；“PR已合并”不等于部署，“文件存在”不等于内容满足条件。
- verification绑定同一义务条件、实现修订、检查方法/范围/coverage、结果、检查者与作者关系；diff/只读审查、测试和独立产品接受分别保留，不能互相冒充。
- closure由当前授权owner给出决定、原因、依据和revision/CAS/幂等回执。来源、完成条件或实现版本改变时旧核查不自动适用于新版；出现冲突先保留失效/待复核依据，reopen仍经现行动作。

外部PR或会话回执无法证明可靠因果关联时保持unknown，不靠同名标题、相近时间或模型推断补造关系。历史证据可保留，同时当前适用性可以失效。

## 核查与升级

Spark候选结果采用 `supported | missing | ambiguous | conflict`，输入中的verified仅可解释为“该固定版本在本次有界检查下有支持”，不直接映射Core resolved。结果携带证据、未读范围、失败和来源版本；confidence只是可选模型判断，不是权限、校准概率或自动关闭阈值。检索不到先检查coverage：完整指定范围内缺证据可记missing，范围不完整/无权/来源不可用为ambiguous或unknown，不能推导未实施。

优先消费已有结构化回执；机械查找优先确定性读取/比较，需要语义核查才运行Spark；领域冲突交适用Expert/更强runtime，需要人类权限或裁决时才浮现。升级也须有授权、预算和真实执行目标，不创建递归委派或无限重试。只读检索仍可能向Provider发送资料并产生费用，受当前披露/执行合同约束。

**不采用“Spark verified → close silently”的当前实现含义。** 当前 `resolve` 是明确human action，runtime只可按grant查询/recordSignal，不能调用人类动作。未来若某类纯机械跟进允许自动结案，必须单独冻结适用对象、完成谓词、既有授权、owner命令、并发/重放/审计/撤销与反例；不得顺带自动接受Matter或批准工具。本轮不改变关闭权限。

## Heartbeat、进展与Tension

沿既有Session/Run/执行关联读取liveness；heartbeat、progress evidence、completion receipt、verification保持四种事实。run_id、last_progress_at、blocked_on等输入字段只是候选，实际来源缺席时unknown；不从轮询成功、token持续输出或自然语言“我还活着”伪造进展。不同钟源/乱序/重启需分开来源时间与接收时间，固定观察窗口和coverage。

“没有evidence delta”仅表示该观察范围未见变化，不自动判stalled、失败或取消；长运行、等待、断线和不可观察分别解释。静默指不反复通知，不是停止记录真实变化或吞掉需处理的失败。实际blocked/conflict经去重与适用性检查后关联既有Attention，不因重复heartbeat创建重复事项。

Tension只作为“未闭合义务引起的注意力需求”的可解释投影候选；原因、等待条件和证据缺口先于分数，不新增权威字段/线性递增公式，不把重要性与逾期混为一谈。Spark局部核查成功不使Tension自动归零；待人裁决、其他未满足条件仍保留。任何排序、stale阈值、频率、周期扫描与自动关闭规则都等真实trace和具体合同，不采用示例3分钟/2小时为门槛。

## 接入现有路线，待后续消费

| 入口 | 本轮补充 | 后续最小反例 |
|---|---|---|
| [ATT既有PR稿](../attention-2026-09-09/courtwork-pr-plan.md) / [当前Core合同](../../../docs/work-core/attention.md) | 义务与来源/执行/核查回执关联，保留当前resolve/reopen与披露owner；不重派ATT-BE-01 | 重复信号不关闭/重复建项；撤权；旧revision；一个义务多份未齐证据；合法替代/撤销 |
| [ME-06](../multi-experts-2026-09-10/pr-plan.md) | 有意义变化、去重/预算/静默跟进、受控新Run；heartbeat复用运行事实 | 无变化不通知、断线不误判停滞、重启/重复事件、无权不唤醒、已关闭不自动复活 |
| [Spark受限profile](../spark-product-definition-2026-09-11/README.md) / [LG检索与finding](../local-governance-2026-09-09/pr-plan.md) | 准备来源索引和固定范围核查；不把结构化结果当接受 | 未读/无权误报missing、恶意来源指令、语义命中但实现不符、作者核查冒充独验、预算耗尽 |
| [Shell通知合同](../../design/shell-control-plane-2026-09-12/notifications.md) | 工作义务/Attention/Notification各自有owner，事件提醒通过原关联流程 | read/unread不resolve，重复通知不重复义务，撤权不泄漏正文 |

首个候选验证场景是一个明确已采用的裁定、固定实现修订与已授权只读fixture，覆盖有证据、缺证据、覆盖不足和冲突四类，再验证只有owner动作改变正式关闭状态。这里只登记场景，不派工、不启用scheduler/heartbeat automation，不更改用户待定的Harness排序。

本轮无UI实现、供应商能力核验、性能结论或Paper修订。发布叙事已有“Spark准备、Attention关注与判断”，无需加入内部receipt阶段或监督算法；所有变化限engineering文档。作者文档链接检查见[checks](checks.json)，不冒称非作者产品验收。
