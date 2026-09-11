# 延迟工作区绑定 · 输入与消费账

2026-09-12；基线 Courtwork main `647bc2167efe5437d0ca73a60a406549d9a1e268`。用户要求“登记入账，luna explore，Astra 裁决选型，撰写 PR，以备后续消费”。本包交付研究裁决与本地 PR 文稿，未实施产品或创建远端 PR。

## 来源与完整性

来源会话：探索延迟工作区绑定，ID `6aa42855-d994-83ec-8e0f-f2a3824927ff`。[原始返回](source-conversation.json)完整保留1 turn / 2消息；分页 hasMore=false，源会话无附件；用户随后另附5张截图，见[语义参考与逐图裁决](semantic-reference.md)。首次默认读取的 assistant 正文截断，随后以20000字符上限重读，最终消息无 truncated 标记。时间、原引用token和preview保留在JSON；preview不是另一轮消息。哈希见[清单](source-sha256.txt)。

源assistant自述“34候选”和厂商能力对比是研究输入，不能当本次检索或实测。本次只对Luna回执列出的两项一手来源作有限核验；Codex、Claude、Antigravity、Warp其余主张未重验，不作为当前产品事实。普通projectless Chat的BE-23仍开放，首片限Attention免选入口与既有Session资源扩展。源会话的图片引用token无对应附件，不声称看过该组原图；后续五张用户截图另存并已逐图消费。

## 消费处置

| 输入建议 | Astra处置 |
|---|---|
| Workspace不是入口前提 | 采纳方向；现有全局Attention已免project选择，补的是通用资源绑定契约 |
| Session与execution target分层 | 采纳；沿Runtime Session/Run owner扩展，不新造Task对象 |
| Standalone / Scratch | Standalone为未连接外部资源的建议文案，非唯一锁定词；Scratch为内部托管存储。两者可同时成立，不用Scratch替换用户scope标签 |
| none / scratch / local / remote | 保留概念分类；第一阶段沿现有托管目录，不要求Pi无cwd，不实现remote |
| 同Session后来绑定 | 采纳资源绑定；不改变既有global/project scope或自动转移project/Matter |
| artifact_root、grants挂Session | 不照抄schema；托管成果保留原owner，授权引用现有机制，不建立第二份grant真源 |
| binding属于Matter governed relation | 只在显式Core操作另建关系时成立；普通目录授权由Runtime持有，不强造Matter或Core接受事件 |
| New Work默认Standalone | 方向纳入后续入口PR；今日project创建路径仍保留，产品角色与Chat命名不在本轮重开 |
| tool boundary Connect Workspace | 采纳需求触发，首版在Run终止/完成后绑定并显式重试；不热换活跃Run的cwd |
| 禁止last-used cwd隐式继承 | 采纳硬约束；恢复只读持久绑定与当前有效授权 |
| 共享Chat/Attention/Spark/Experts模型 | 共用Session/Run及工具边界；不据此打开未接通的角色或child capability |

## 后续消费顺序

1. [Luna探索](luna-explore.md)：固定源码事实、外部donor与反例；不是产品独立验收。
2. [RD-006 Astra裁决](../RD-006-deferred-workspace-binding.md)：选型与不变量。
3. [PR文稿](pr-plan.md)：DWB-01→02→03及后置范围，明确开工条件与验收。
4. [验证与交付](verification.md)：只记录本轮实际执行的文档检查。

开工重读实际main、[current](../../current.md)、[Attention合同](../../../app/docs/attention-agent.md)、[Runtime合同](../../../app/docs/runtime-foundation.md)及[前端连续性](../../design/agent-interface-2026-09-10/frontend-contract.md)。不使用旧聊天推断当前schema。Paper仍由[根入口](../../../PAPER.md)固定；本轮无论文修订。
