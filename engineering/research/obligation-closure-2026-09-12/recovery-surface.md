# 工作现场恢复与有界巡检 · Astra补充裁决

2026-09-12，基线main `5c78535ceedefd833bba89be7ec042c6325cab10`。用户本轮补充的主题是Spark维护可理解性、Attention维护闭环；仅巡检未冻结的工作集合，以obligation↔evidence而非文件存在性核对消费情况，最终编译Matter Recovery Surface。本文是主题摘要与裁决，不是完整逐字导出。沿上一轮登记范围接入main，调度/实现/发布后置。

## 采用方向

**工作现场恢复是从受治理来源重建可行动、可解释的工作面，不是让接手者重新通读整个目录。** Spark准备有范围、出处、版本、coverage与unknown的巡检投影；Attention依据原义务及核查结果决定是否需要跟进。两者不获得新的状态权或默认全盘读权。

“Spark maintains legibility; Attention maintains closure”采用为内部职责概括；实际关闭仍沿[原裁决](README.md)的owner与授权，不宣称当前产品已提供周期巡检或恢复包。低成本、降噪与连续性收益待具体trace/任务验证。

## 工作集合边界

1. 采用“只检查明确纳入的、获准读取的工作集合”，不周期性全扫历史。active/blocked/waiting/review/frozen/closed是输入提出的分类候选，**不是现有Matter枚举或本次新增schema**；不能把Attention的waiting/resolved或Run状态直接映射为Matter状态。开工时由Matter owner冻结生命周期、参与标志/暂停与重新纳入命令，再编译检查集合。
2. frozen/closed默认退出周期巡检是拟议策略；退出不删除来源/回执、不撤回正式决定、不取消运行或清除已有Pending Attention。冻结、关闭与暂停巡检各自含义须分开；依赖变化或显式请求需要再检查时，沿owner规则重新纳入或发出待决，不静默reopen。
3. 检查集合固定版本/筛选条件与观察窗口；检查前及读取时重验scope。循环中冻结、撤权或源变化需停止相应读取/标stale，不继续提交基于旧集合的“已核查”。数量、描述、游标和异常摘要同样受披露限制。
4. 第一片可只覆盖Matter；普通Chat、projectless事项及全局Attention不能因此被宣称已全部检查。新ingest、文件保存或候选finding仍不自动成为已采用的义务，非Matter范围明确记录out-of-scope而不制造虚假全局coverage。

## Obligation与证据

核查采用原义务身份、source revision、完成条件及真实采用依据，对照消费声明、Run/实现ref、测试或review和owner决定。stored/consumed/implemented/verified/closed继续分轴；缺receipt不一定是缺实现，缺coverage不一定是未消费。superseded/waived须有原owner的明确决定及关联，不能凭“较新的一段话”自动废止旧要求。

Spark异常面包含检查范围、各owner来源修订/观察时间、支持证据、未读/无权/缺失、冲突及检查自身失败。不得将检索索引或Spark摘要变成第二份当前义务状态；Attention可按需反查原文，不能只允许消费筛选后的摘要。计数和“healthy/no intervention”只限已观测范围，不从heartbeat或无异常推出完成。

重新派给原Expert、换Expert、合并事项或暂缓都不是纯投影。实际派工需目标/授权/输入版本/幂等/预算与原运行可用性检查；运行中或未知外部效果不能无条件再执行。相似标题不自动合并独立义务；合并关系保留来源和决定回执。核查signal不取得人类resolve权，不自动启动跟催或递归升级。

## Matter Recovery Surface候选

可编译的栏目为当前正式状态、已接受决定、未闭合义务、近期证据、冲突、关联Run/执行者、Pending Attention、相关文件及建议动作。每项绑定其真源、版本、coverage、可用性与合法reader；未取得的来源显示unknown/unavailable。编译按当前授权与预算渐进披露，建议动作不等于已授权/已执行动作。

跨Core、Runtime和外部PR的读取不能冒称单一原子快照：分别记录owner revision/观察时间或可靠watermark，标明不一致/过期；跳转或执行前重验当前事实与CAS。文件定位到确切版本，不在原件丢失时悄悄读同路径新内容。闭包内的历史证据保留并不保证源字节永久存在。

**恢复工作理解不等于恢复执行。** 换Runtime、Session结束或compaction后可按获准来源重新编译工作面；不承诺无损迁移Provider私有context、运行中的进程/工具或未知副作用。执行恢复继续沿[Run lineage](../../../app/docs/run-attempts.md)与[Runtime canon](../../architecture-runtime-canon.md)，无真实能力则只提供inspect/建议，不伪造可resume。

## 后续消费与验证

沿[ME-06](../multi-experts-2026-09-10/pr-plan.md)的有意义变化/跟进、[LG-02/04](../local-governance-2026-09-09/pr-plan.md)的范围索引/重建、BE-41现有只读派生面及[Core Attention](../../../docs/work-core/attention.md)继续；BE-41不等于已提供通用Recovery Surface或生命周期调度。首片只读合成场景应覆盖集合变更/冻结、撤权、部分来源、旧决定替代、同名不同义务、索引重建、跨owner修订错位、未知运行效果、重复跟进和原执行者缺席。未冻结调度频率/stale门槛，不新增后台automation或UI。

本轮只做作者文档链接与范围检查，不作独立产品接受；原发布面及现有API/schema不变。

## Matter Recovery Contract · 2026-09-12收敛

用户进一步要求恢复路径成为状态治理的一部分，而非每次临时生成大HANDOFF。采用最低回答集合：哪些工作活跃、什么已裁定、还欠什么、证据在哪里、什么被阻塞、最近变化、下一步应读取什么。每个答案绑定原owner/确切修订、观察时间、coverage与合法reader；空/未知/无权分开。index、decision/obligation/receipt查询、当前活动与recovery projection是逻辑接口，不新造平行ledger真源；Markdown/SQLite/JSONL等物理形式待实际合同与迁移裁决。

兼容Agent须能理解相应schema/版本、scope及拒绝语义；只给必要启动投影与按需展开引用，不强制遍历全仓。handoff可作为有版本的便利快照，但不能成为唯一事实；源更新后须重编译/标失效，不能用旧摘要覆盖新决定。Spark只生成授权内的索引、异常或修复提案，Attention跟进未决，二者不自行裁定冲突或产生关闭事实。该合同仍待实现：工作恢复不承诺恢复进程、私有provider context或未知外部效果。

对外采用稳定产品理念，使用Chat形态名；工程缺口保留本账，不在发布文案添加“尚未实现”旁白。本次不修订Paper定本，不开启自动扫描/修复/调度。
