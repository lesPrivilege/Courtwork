# Attention fresh Astra 开工交接

用户本轮明确：先ES-01，Attention届时另开fresh Astra任务。此任务为Courtwork后端延续，不是个人Attention实践目录、另一个正式状态库或新的FE队列。

开工重读实际cwd/branch/HEAD/status、`engineering/current.md`、`AGENTS.md`。ES-01代码固定 `b1ff74b08c053fa0e3ab47fb20f510eabb9440e9`，独验见本分支 `evidence/harness-next-20260909/es-*-independent.md`；来源Astra负责main集成与当前台账。在实际main确认ES交付已合流后从清洁隔离树施工；若仍在合流，先读研究、确定边界和反例，不并发修改Core/service，也不把缺失ES的main当升级基线。

## 执行目标

落实 [ATT-BE-01](../../research/attention-2026-09-09/courtwork-pr-plan.md)：同一Core owner中的Attention对象、revision/CAS、事件与审计、关系引用、schema-aware查询、披露策略和typed human action、Runtime adapter接缝。先由Astra基于真实Core2/app3冻结对象schema、app_run关联策略、迁移与恢复，再实施完整有界后端纵切；用户已授权可逆施工，无需重复索要开工确认。

消费 [研究裁决](../../research/attention-2026-09-09/adjudication.md)、[契约草案](../../research/attention-2026-09-09/contract-draft.md)、[交付检查](../../research/attention-2026-09-09/delivery-checks.md)和 [MyContext/Attention增量](../../research/teamai-2026-09-09/attention-delta.md)。草案坐标须按当前代码复读，不能照抄旧schema。Astra owns Core/service/迁移/集成；用户允许Luna做有界探索、模块实施或非作者独验，明确路径写权并保护其他writer。

正例至少创建Attention，关联多个Matter与执行ref，经typed人类动作或明确受信策略维护后，在Session删除/替换后仍能读取正式状态并解释来源。反例至少覆盖stale CAS、跨scope的registry/descriptor/计数泄漏、重复请求、恢复、信号误当授权，以及运行结束自动resolved。UI、缓存、RuntimeStore和个人实践文件均不能取得第二份Attention事实权。读/通知抑制与正式解决分别成立。

交付固定代码SHA、作者测试、非作者反例、消费fixture与迁移/回退证据，发给来源Astra任务 `01a085d3-1dcc-72b1-b3df-74e1f565f451`；main/current/台账由其整合。只有稳定后端接缝进入既有ATT-FE-01单writer队列。保持无真实provider、无外发、无scheduler、无跨用户ACL声明、无Paper正文改动、无部署；G1–G5不因后端交付关闭。
