# 接缝设计 · 沿现有 owner 施工

本页是候选合同，不新增schema。固定基线与实际实现范围见 [README](README.md)。对象命名先映射现有契约；下述字段清单只是需表达的语义，实施者不得据此机械建表。

## 1. 状态所有权

| 内容 | 当前 owner / 入口 | 本次增量设计 |
|---|---|---|
| 正式Matter、Source、Candidate、Decision、accepted Artifact、披露 | [Work Core](../../../docs/work-core/governance.md)、`app/extensions/governance-adapter.mjs` | Spark通过既有候选/来源入口工作；任何新Note须说明原观察与候选分别持久在哪个owner |
| Session/Run、已解析运行配置、取消/unknown、attempt lineage | `app/server/store.mjs`、`service.mjs`、`runtime.mjs`、[BG-02](../../../app/docs/run-attempts.md) | adapter refs附属Run；不建第二attempt表、不把跨session恢复伪装supersedes |
| Thread成员、本地消息、child来源/grant/result | `app/harness/coordination*.mjs`、`child-execution.mjs` | 沿MA逐片接生产；消息仍纯通信；不将外部conversation ID复用为CW身份 |
| 只读异步任务 | [AM-B](../../../app/docs/async-tasks.md)、`app/server/async-tasks.mjs` | 复用get/wait/cancel/查询恢复；模型是否会选择等待另验 |
| Attention信号/状态/人类动作 | [Attention合同](../../../app/docs/attention-agent.md)、现有domain与adapter | 事件关联、静默、去重只消费同owner状态；不另设Spark inbox账本 |
| manifest/rendition、lexical/context索引 | [LG计划](../local-governance-2026-09-09/pr-plan.md) | 派生材料绑定source/schema/index版本，可删可重建；不持有唯一正式事实 |
| UI/品牌 | 当前presentation adapters、Fable单writer；独立brand包 | 显示配置来源、Run与适用动作；presence不生成Authority |

“Core”在原讨论有时泛指整个产品；不能据此把RuntimeStore、Attention、领域Core合成新的超级状态服务。保留各自事务边界；跨owner动作需明确成功、失败及部分完成，不能假定多次HTTP原子。

## 2. Expert 激活与 runtime 边界

激活前需要解释：目标工作/Session、Expert/contract版本、runtime adapter及协议版本、model/effort、工具集合、权限上限、来源/context版本与取消/恢复能力。优先引用现有配置，只有缺少历史解释的字段才补持久快照。个人偏好可在允许范围覆盖，不覆盖domain规则或权限。

候选 adapter 操作集合：start、inspect、interrupt、respond；continue/steer/fork按原生能力独立声明。close只是释放执行资源，不等于归档Matter；archive由工作owner决定。统一事件仅表达CW实际可观察事实，并保留native event/ref以诊断信息损失。未知字段不能用空成功吞掉；event delivery与execution settlement分开。

能力行至少区分 `native / adapted / unsupported / untested`，并绑定runtime版本、API、模型和调用路径。当前Pi采用coding `AgentSession`/`createSessionRun`，不能把上游 `AgentHarness.create`/lane 文档当现有生产入口；锁定0.85.1与固定上游差异沿[MA runtime matrix](../multi-agent-2026-09-10/runtime-matrix.md)处理。SDK优先，RPC仅在进程隔离/跨语言消费者需要时增加；不先替换能工作的调用链。

每个运行/子运行/工具执行的有效权限由宿主允许范围、当前对象披露、绑定限制与本次合法授权共同约束；以执行处当前策略为准。撤权不能被旧context、旧receipt、父级native模式或fallback工具恢复。approval request按来源Run、请求ID、action/payload版本返回原执行者，不能发给当前UI恰好选中的agent。

## 3. Spark / index / context 数据流

```text
authorized source bytes + source identity/version
  → deterministic manifest / rendition
  → rebuildable exact + lexical / typed index
  → optional model extraction / notes / relations (candidate)
  → existing Core validation + decision, when formal effect is required
  → versioned context / human review / retrieval projections
```

来源更新先登记新版本，再失效依赖；不能原位改历史来源。source version、note/candidate revision、schema version、index build与Matter revision是不同维度。缓存键/manifest必须足以判定适用性，不能只用mtime；解析失败、权限变化、删除/移动/重名、符号链接、内容被替换均有明确结果。

原子笔记若是唯一观察不能放进可删cache；先由现有来源/候选合同保留带provenance的记录。Dream/蒸馏生成新候选，记录输入版本与转化方式，允许拒绝；不得重写accepted事实。模型输出的relation置信度不是domain接受状态。检索返回定位/版本与可读范围，调用者按需展开，不能把旧摘要作为当前事实。

## 4. 生命周期与安全遗忘

| 动作 | 必须保留/核验 | 不能顺便发生 |
|---|---|---|
| discard | 被丢弃对象是可重建或未被其他证据唯一依赖；理由可解释 | 删除canonical事实/开放义务 |
| downgrade | 搜索/显示优先级降低，适用状态原样保留 | 改成无效或已完成 |
| supersede | 新旧版本关系及生效owner | 原位覆盖历史、自动重跑工具 |
| compress | 回指、版本、遗漏范围与恢复路径 | 把模型概括当批准事实 |
| filter | 当前scope、用户需要、权限、时间与相关性 | 把不可见等同不存在或取消权限 |

closeout packet最少表达当前成果refs、未决/冲突、未核对效果、下一触发、有效来源/规则版本、必要历史指针。工作归档与缓存冷热分离；历史读取无需resume。rehydrate重编当前context；reopen是领域生命周期动作，可能需要新的授权判断。purge按真实rights/retention规则处理，tombstone也不能违法保留敏感内容。

Session复用须检查scope、expert/runtime/model/tool兼容、policy与context版本；不兼容时新建并显式rehydrate。缓存命中是优化结果，不是续线程理由。BG-02只允许同Session失败Run的单链续行；跨Session关联、完成Run重做、自动唤醒都需独立合同。

## 5. Attention 与外部入口

event→Matter关联先用精确external key，歧义留未关联或交人；匹配成功不授予读写权。timer只记录/检查候选工作条件，预算、静默时段、相同变化去重与关闭条件先确定。新Run必须重新解析绑定和权限；旧grant/旧消息不是长期自动授权。BG-03未解决的effect unknown不能被heartbeat绕开。

外部agent读取CW与CW控制外部runtime是两条独立接缝。第一条从BG-01最小只读接口开始，身份/scope/限额/分页/错误不泄漏与本地读面一致；有界read tool先于嵌入UI。需要写时才单列proposal/decision/effect与授权，不以MCP标记替代业务合同。

Courtwork UI、MCP App、CLI/SDK是投影/入口，authority在owner。ChatGPT或其他对话capture只形成外部Source与ExternalConversationRef，保留provider、外部ID、取样/导入时点、缺口、字节hash与选定范围；不自动变CW Session、不声称实时双向同步。原生TUI若不能证明只有一个合法控制者就不附着同一运行，禁止通过ANSI推断正式结算。
