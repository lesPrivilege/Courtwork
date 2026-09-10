# RV26 · 固定审查入账与依序施工

用户在 2026-09-10 授权入账并依序开工：Astra 掌架构；Luna 承接探索、参考成熟实现及有界局部工作；模型能力瓶颈、关键自研 Core 与裁决由 Astra 亲自撰写。附件中的执行建议作为审查输入，不能独立扩大用户授权。

[原包](courtwork-implementation-plan-20260910/README.md)按原始字节保存，全部 SHA256SUMS 项核验通过。原包的 proposed/status 字段保留历史含义。[baseline](baseline.json)记录本轮实际状态；[dispatch](dispatch.json)是现有路线的执行别名和写权清单，不替代原 BE/ME/LG/AM/BG 合同。33 单依赖检查无环且无悬空引用。

## Astra 裁决

保留 Pi 薄接入、单一 Core 与既有 SQLite 事务 owner。先生命周期、配置持久化、持锁发布与产品质量门，再资料治理 → Spark 派生/恢复 → 稀疏 Attention。ArtifactHistory 不冒充 Intake；模型观察与人类决定保留，不能靠再次调用模型重现历史。第二 runtime、外部写、认证扩展及存储替换均按条件证据另行领取。REL01/G1–G5 不等待整个 Spark 平台，但真实 provider 的准入仍须按实际授权与配置处理。

## RV26-00 基线

施工从共享设计交接 HEAD `12eb2208f931c1b530f54c7f947351a041c92c1d` 隔离，保留 `main@2e9da09` 及其后的设计检索交接。相对审查 `0c60f4f` 只有六份设计文档变化，没有产品代码差异，因此附件缺陷不能标已修。共享目录的两项未提交证据没有纳入本单。初始 origin/main 仅为缓存；随后 `git ls-remote origin refs/heads/main` 确认远端当时同为 `2e9da09`，没有将远端内容写回共享目录。

实际常量为 RuntimeStore 10、Core 4、bridge app 5；修正 architecture 当前入口，历史 evidence 不改版本。未预留或修改任何新 schema。BE-40 原两条分别限定为 `BE-40@Provider`（PV-56）与 `BE-40@Attention`（WK-156/157），原来源、需求与未完成状态保留；裸编号不能领取/关闭。

## 写权与顺序

Astra 独占本轮 Core client 与合同、current/architecture 和串行合流。Luna 可写所分配的新测试/fixture，或在只读探索后承接局部实现；非作者复核须分列证据。现有 UI writer 不变，本轮不写 web/Pages。

首片 Q01 产品 `74ab7ca` 已完成有界独验：Astra 写 `app/core/client.mjs` 与 `docs/work-core/contract.md`；Luna 写独立故障测试路径。下一片 Q02 的 service/store 接缝等待 Q01 交付后串行领取；Q04、Q05、LG00 只有在基线清账和各自文件写权明确后可并行。后续严格消费 dispatch 的 depends_on；queued 不表示已经开工。

回执与未检项见 [本轮证据](../../../evidence/rv26-20260910/README.md)。功能实现、作者自测与有界非作者复核分别记录，不关闭产品接受门。

## 原路线清账与有界非作者复核

Luna `baseline_explore` 对固定 `12eb220` 只读核对了源码、合同、原交付与本轮 baseline/dispatch；无源码产品验证或完整独立接受声明。其首次含 Pi 测试因隔离树当时未配置依赖而失败，不能计为通过。

| 原路线 | 本轮状态处置 | 精确现有依据与剩余边界 |
|---|---|---|
| AM-B | bounded adapted task 已实现；整体 partial | [合同](../../../app/docs/async-tasks.md)、[交付](../../../evidence/async-loop-20260909/README.md)：opt-in、at-most-once dispatch、unknown 后 query-only；非 native continuation/scheduler。OPT01 保留实测慢任务触发 |
| MA/Thread | 通信首片已实现；整体 partial | [能力](../../../app/harness/coordination.mjs)、[合同](../../../app/docs/coordination.md)、[证据](../../../evidence/multi-agent-20260910/README.md)：message true，explore/handoff/workflow false；不重复新建 Thread/outbox |
| BG-02 | 同 Session supersedes 已实现；后续 partial/not-tested | [合同](../../../app/docs/run-attempts.md)、[测试](../../../app/tests/run-lineage.test.mjs)、[接受边界](../../execution/2026-09-10-backend-governance/acceptance-bg02.md)：不扩大跨 Session 连续性；文件链/并发等原未检项保留 |
| 原 BE 请求 | 逐项沿原包映射复用或保留，未测者不关闭 | [逐项原账](courtwork-implementation-plan-20260910/BACKLOG-DISPOSITION.md)覆盖所有原 BE 需求；没有产品 delta 足以新增关闭结论 |
| 前端 | 原单 writer 队列保持 | FE-05a → FE-05 → ATT-FE-01 → CC-I；[Home backlog](../../design/home-backlog-2026-09-10/README.md)的 Runtime/Usage 已交付，余项不能由 RV26 UI 越队 |

RV26-00 完成的是本地固定基线清账、owner/依赖、编号消歧与上述只读有界复核；没有据此宣称所有旧门重跑通过。后续每单进入实际新 HEAD 时重查 delta。

可复验的账本检查：`node engineering/reviews/2026-09-10/verify-ledger.mjs` 验证源包字节、33单原依赖/映射、唯一编号与owner，并执行重复ID和环的拒绝反例。

Q04 待办补充（本轮真实观察）：service lifecycle 的6秒worker-ready断言失败后，fixture未清理子进程；并行全量存在400ms预算与等待用例的时序敏感性。沿产品CI单补失败清理与环境稳定性调查，不能放宽断言或将分次通过伪称一次全量通过。
