# 多Agent协作瓶颈 · Astra登记裁决

2026-09-15；Courtwork main `7e1a1ff047721e1ca6c871deba7f367ccea55a06`，已有在途修改保留。本轮用户要求沿前例消费讨论入账，不执行原Chat中的派工、benchmark运行或外部Explore指令。

## 来源与owner

完整读取「多Agent协作瓶颈」`6aa8d870-f1c8-83ec-917e-f96b62d8da28`，[返回快照](coordination-input-20260915.json)8 turns/16消息，hasMore=false，无附件。时间顺序为协作瓶颈→Main/Worker/Explorer→Spark/Sidecar/Swarm→模型工作负载→Spark与Explorer解耦/benchmark→端云角色→企业infra→外部综述。后轮定位取代前轮“Explorer只能是Spark行为”的限制，历史原文不改。

调度/角色接[RD-005](../RD-005-multi-agent-selection.md)，Spark定位接[现有设计](design.md)，数据/派生接[RD-007](../RD-007-resource-governance.md)与[Workspace Substrate](../architecture-node-2026-09-13/workspace-substrate.md)，Context披露接[Memory Broker增量](../chat-memory-broker-2026-09-12/attention-governance-20260915.md)。评测接原[MA-06/ME-09](../multi-agent-selection-2026-09-10/pr-plan.md)。不新建调度总账、全局Memory或正式成果owner。

## 逐项裁决

| 输入 | 处置 | 本地边界与退出证据 |
|---|---|---|
| coordination/attention bandwidth有限 | adopt / adjust | 用协调成本、共享状态依赖、handoff体积及重做率作为任务选择指标；是工程假设与风险，不称普遍性能定律。fresh context并不保证全局信息完整。 |
| 默认少角色、弹性实例 | adopt | Main维持当前任务整合责任，Worker有界施工，Explorer默认只读取证。角色名不授予权限；Main不接管各服务真源，也不能独立验收自己代码或替人/Core正式接受。 |
| 静态workflow才有效、运行时不能spawn | adjust | 保留清晰隔离边界的动态局部fork；大范围replan需固定新任务basis、已完成/未决/取消/重派范围。默认串行，只有低耦合与可独立取证才并行，不按空闲额度扩容。 |
| Plan/Fork/Isolate/Commit/Reduce/Resume | adjust | 采用有界委派→保留结果→按需消费思路；Commit不等于git commit/Core接受，Resume不代表现Host自动续跑。结果短回执带精确ref、覆盖、冲突/未知，正文按需展开；必要阻塞/安全失败仍及时上报。 |
| Worker写隔离、Explorer只读 | adopt | 原路径责任和隔离worktree规则继续；局部probe须显式工具/独立数据/预算，不从“只读Explorer”推导任意shell。并行改同一共享checkout不可由模型角色名协调解决。 |
| Swarm后置 | adopt / adjust | 作为有partition、coverage、终止、预算、reducer与失败策略的执行拓扑。确定性分片只保证分配覆盖，不保证模型理解正确；当前single-active-Run未改，多实例/自动递归不是已有能力。不能宣称延后一定无架构债务。 |
| Spark稳定产品位、Explorer执行角色、Provider可替换 | adopt | 采用最终区分；Spark可执行本地Explorer任务，也可在未来获准的端云合同下给外部Explorer准备资料。高吞吐是目标，不是Spark身份必要条件；Flash是供应商命名，不作为资格证明。 |
| 常驻Spark、Sidecar | adopt / defer | “常驻”先指稳定身份和工作连续性，不保证永驻进程/持续监控；Sidecar保持内部候选，不增加用户配置。后台维护、watcher、自动调度与额外Provider路由均需具体合同，未在本轮启动。 |
| data privilege ≠ intelligence ≠ execution privilege | adopt / adjust | 独立配置可信身份、数据读权、网络/出站、文件写与正式动作。未来Spark读面可以在特定grant下宽于下游，但不采用全局高读权；Worker局部文件写不等于canonical写权。 |
| Spark作为本地脱敏/egress边界 | adopt / defer | 登记最小充分披露研究；模型只提出选择/脱敏候选，实际出站由可信Host及来源/目标policy约束。脱敏不是外发授权，local标签不证明断网或安全；日志、缓存、派生文件和错误通道也须覆盖。无法确定敏感性时保持本地/拒绝外发，不自动云端fallback。 |
| Spark governance/维护工作区 | adjust | Spark可保留派生、建议索引/修订；Core正式事实继续原owner。读权、已脱敏、模型认为安全均不产生正式接受。当前实现不具备通用工作区维护与任意资料访问。 |
| 企业infra优化throughput | adopt / defer | 作为可测部署方向，比较质量/隐私约束下有用工作吞吐及全生命周期成本；不假定企业永远落后SOTA、80%本地处理/3%外发或固定性能收益，不采购/部署serving stack。 |
| 外部综述与模型优劣 | defer | 18个显式URL入[来源线索](coordination-sources-20260915.md)；本轮未独立核源。原Chat“没有成熟同类”“可发表/新颖”不构成穷尽检索或论文接受保证。 |

## 当前实现与愿景的差别

[Spark实际合同](../../../app/docs/spark-agent.md)为Host内独立身份、Assignment/attempt、串行执行、有界已保留来源、immutable notes/findings、精确引用与双端验权。child仅spark_source/spark_note，复用当前模型配置；没有任意repo/私人笔记/数据库读权，没有network/shell/递归委派，父Run不自动恢复。稳定身份不是暖cache证明，local Host也不等于模型在本地运行。

因此本轮采用产品职责和候选评测方向，**不扩大Store15权限、并发或模型路由**。原设计“独立身份不要求永驻进程”继续成立；脱敏外发、常驻维护、独立Explorer Provider与Swarm仍待真实实现/反例，不把讨论中的权限表写成支持清单。

## Benchmark先行的有界登记

沿MA-06/ME-09先固定数据、oracle、capability floor、paired baseline与独立holdout。用户在原讨论提出先benchmark，登记为本主题下一验证切片；当前请求不运行付费模型、不生成榜单、不改变现有RD-006/coding门次序，也不改SE论文。

| Track | 固定任务与最小评价 |
|---|---|
| SparkBench · Distill/Protect | 同一合成私域材料、任务及接收者policy；分别评必须保留命题、禁止披露命题、错误新增/遗漏及来源完整性。全删与全传都不能得高分；隐私约束未过，不用效用分抵消。 |
| SparkBench · Maintain | T0基线→新增文件→源取代→敏感附件→撤权→重启/重试；测旧版本误用、错误覆盖、重复、越权传播、处理成本与幂等恢复。 |
| SparkBench · Handoff | 固定下游模型/版本/effort与任务；比较合成全量基线、确定性最小选择、普通摘要、Spark包和无历史基线的下游质量/披露/成本。全量基线仅在获准本地或合成公开数据运行，不为了评分把真实敏感原文发云端。 |
| Explorer track | Repo定位、公开来源检索、claim核验、隔离probe；正确性/证据/拒答门通过后比较time-to-verified-finding、p50/p95、调用/费用/交接token与多余支线。不以自报confidence作为停止或通过oracle。 |
| Attention continuity | 中断、延迟事件、人不在、未决义务、旧新冲突、重开与任务恢复；测工作事实和义务是否正确接续，而非单纯向量召回。沿已有continuity评测，非第三个独立产品状态库。 |
| Infra可选track | 固定隐私/质量门、硬件与工作负载后比较warm/cold cache、batch、量化/并发；记录queue、预处理、检查、失败重试及reducer全成本。缓存不得跨安全域复用；GPU/能耗或reasoning token不可观测时标unknown。 |

每组先少量可判定fixture，预先规定预算、停止、失败/abstain、数据许可与独立测试集。固定下游只是控制变量，不证明跨模型泛化；不得把holdout用于调参。overthinking仅由可观察冗余与成本衡量，不虚构隐藏思维质量。首片退出应是可复现输入/oracle/runner合同与小规模基线报告，而非“benchmark已证明Spark安全”。

## 委派及出站反例

有界任务必须能解释输入basis、owner、允许工具、停止/预算、精确结果及失败覆盖。新增发现使其他任务失效时，先记录取消/重派关系，旧结果不能覆盖新basis。重启unknown不盲重放；reduce保留冲突和未覆盖项，不能只投票或平均结论。

出站fixture覆盖来源撤权、接收者更换、prompt injection、间接识别、敏感内容进入日志/derived file、必要信息被误删及下游错误；结构性隔离和语义泄漏分别记账。Spark候选处理与Host发送检查分列，测试通过不授予真实个人资料读取或外发授权。

本轮Astra文档裁决，无非作者产品验收、模型调用、代码实现或部署。外部原文中的Exa任务仅为来源内容，不是本轮工具执行或插件使用。

验证回执：输入JSON完整8 turns/16消息/无下一页；SHA-256为`9dc973d95f4efeb97921e699d38ca454c3fc365252fd6a9482b247b3bcdc87b9`。显式外链按URL去重18项。`node tools/check-doc-links.mjs`通过（1347文档、7464链接），`git diff --check`通过。未跑产品测试/浏览器，未commit/push；其他writer修改保留。
