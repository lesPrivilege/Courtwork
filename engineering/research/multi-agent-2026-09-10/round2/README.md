# Multi-agent 第二轮 · 后端测试与前端施工

用户于 2026-09-10 认领本轮：在[首片](../README.md)之上做 multi-agent 后端测试与前端施工，Sonnet 只读探查。基线 `main@5b405b3`，工作树带有另一单未提交的 `evidence/fe01-main-integration-20260909/wk98-regression.json`，本轮不动。Astra 持有架构、实现与合流；Luna 只读探查与独立反例。

首片交付的范围见[生产合同](../../../../app/docs/coordination.md)与[C1–C10 账](../verification.md)：显式 Thread、成员关系、本地 outbox/inbox、受认证 HTTP 与模型工具已落地；生产并行 child、持久 child recovery、handoff、Workflow、跨 Matter Core 事务与 OTel 未接通，`capabilities.explore/handoff/workflow` 为 false。

## 两条线的边界

| 线 | 本轮范围 | 不在本轮 |
|---|---|---|
| 后端测试 | 关闭 C1–C10 中今日可测的缺口；对已锁定的 Pi 0.85.1 建消费者 fixture（MA-02 的既定下一步）；补 grant 组合、迟到结果、重启恢复的反例 | 升级 vendor、换宿主、装 durable workflow 依赖、接 OTel |
| 前端施工 | coordination 合同的消费面，落在 Attention 对话面内：显式选择来源 Session 与目标 Thread，回执与 Run/Core 接受分离，收件箱分页 | 第二个 composer writer、Home backlog 队列中未轮到的片、Chat Flow 中判为待定的 CF 项 |

## 本轮暂定裁定

- MA2-D01 不升级 vendor。先对已安装的 0.85.1 建消费者 fixture；升级候选须先跑同一套 fixture 再裁定。承自[runtime matrix](../runtime-matrix.md) Luna 修正。
- MA2-D02 前端只建消费面。复用既有 shell/overlay 与单一 composer writer 约束，不新造第二条 app/web 写入线。
- MA2-D03 `capabilities` 三项保持 false，直到对应能力真正接通且有本地 fixture；不以合同文字或 adapter 代码提前置真。
- MA2-D04 不为迁就测试改动生产准入。测试暴露的准入差异按事实修正测试或修正实现，逐项记明。
- MA2-D05 两条线共用基线，分片合入；后端测试片先行，前端片在其上消费。

以上为开工前的暂定边界，待探查回执逐项收敛；探查回执不自动成为已验证事实。

## 已派探查

| 单 | 范围 | 状态 |
|---|---|---|
| EX-MA-R1 | 后端实现清点、现有断言与 C1–C10 对照、缺口按今日可测/需新 fixture/被生产代码阻塞三分、测试体例与 fixture 复制清单 | 已派 |
| EX-MA-R2 | 已安装 0.85.1 vendor 源码实况：lane/child/取消/恢复的真实实现与桩、Courtwork 实际调用点、今日可断言的 fixture 性质 | 已派 |
| EX-MA-R3 | 前端消费接缝：已撤出原型 `105458a^:app/web/coordination-view.mjs` 的实际做法、视图注册与取数体例、准入与 lint 门、合同与服务端实现的差异 | 已派 |
| EX-MA-R4 | 现行设计语法约束：material/typography/glyph/overlay 与 CF-01–10 的裁定状态、机械检查脚本、相互冲突与需升级裁定的开放项 | 已派 |

## 本轮基线

`main@5b405b3` 全量 `node --test tests/*.test.mjs ../tests/*.test.mjs` **446/446**，0 失败，61s。首片记的 446/446 属于组合提交 `c1f2122`，两者数目相同但不是同一次运行；本轮以此次为回归基线。日志暂存于会话临时目录，施工片合入时另立证据目录。

回执落在 [explore/](explore/)。本轮尚未改动产品代码，未新增依赖，未运行真实 provider，未部署；G1–G5 与 Paper 不变。
