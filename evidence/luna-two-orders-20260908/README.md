# Luna 两单执行证据 · 2026-09-08

源码基线 `429fdd68febb9998f322a0b53c323651fc8cd7fd`；隔离分支 `codex/luna-maintenance-core-validation`。本地临时执行树 `<isolated-checkout>`，不是第二持久开发入口。工单见 [派单包](../../engineering/execution/2026-09-08-luna-two-orders/README.md)。证据路径相对本仓，可在包含本包的检出中复跑。

用户明确授权本轮落单并启动 Luna 有界执行。三个 Luna max 子代理实际完成第一轮分片，并交叉复核。Astra 阅读两候选、独验回执、Core 两探针与回执，接收以下有界结果。产品源码没有修改；没有 fixer 或 post-patch 验收可声称。当前状态仍由 engineering/current.md 维护。

| 分片 | 实际交付 | 裁定 |
|---|---|---|
| CB-01 Finder | [四文件测量与两候选](clarity-findings.md)，现状相关测试35/35 | 候选是提案，不直接改代码 |
| CB-01 独立 Verifier | [非Finder复读与35/35复跑](clarity-verification.md) | 两项均拒绝：新helper未证明维护收益。四文件hash/行数不变，no-change结束本次试点 |
| HC-01 Core | [范围与18/18定向复跑、两新探针](core-verification.md)、[原始测试日志](core-existing-tests.log) | 本次合成范围通过，未发现需修复问题；不关闭产品门 |
| HC-01 探针交叉复核 | [非作者复读、稳定hash及再次运行](core-probe-review.md) | 两探针通过；同事务注入不是双writer竞态，actor字段拒绝不是OS隔离 |
| HC-01 能力兼容性 | [本仓入口与外部官方来源矩阵](agent-capability-compatibility-index.md) | 首版盘点；host暴露、upstream文档与not_run分开。实施切片由Astra排序 |

[架构裁定](architecture-disposition.md)处理历史资料的时间边界、现有owner与多入口约束。测试35/35、18/18及探针有范围重叠，不累加成产品分数。探针使用仓外临时合成数据并清理，provider/GUI/法律质量未运行；不访问个人凭据、不push、不部署。

## 可复跑探针

仓库根目录，Node及Python运行环境：

```sh
node evidence/luna-two-orders-20260908/core-probe-generic-authority.mjs
node evidence/luna-two-orders-20260908/core-probe-cas-race.mjs
```

作者结果见 [generic日志](core-probe-generic-authority.log)、[CAS日志](core-probe-cas-race.log)，非作者执行结果与固定hash见交叉复核。现有测试命令完整记录在相应回执。本次没有产品代码变化，因此不为文档包再跑全量runtime/smoke；Git空白、证据路径与受限改动范围由Astra检查。

## 尚未执行的下一步

能力差距是待裁定实现单，不是本轮已实现功能。先以当前API事实补能力声明及GUI/非GUI入口合同，串行衔接BE-5/BE-12与MCP兼容；fork/delegation/task/goal、coding工作面、ACP适配分别定义最小边界，避免挤占WK12/WK11与G1–G5主链。Shell仍按现有明确限制，开放需独立执行隔离与恢复证据。全仓cleanup、全生态实测、真实provider和产品验收均未完成。
