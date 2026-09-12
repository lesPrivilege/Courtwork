# CourtWork · Release 前 Harness 架构裁定与下一轮实施包

日期：2026-09-12（Asia/Singapore）  
审阅基线：`1ac28980c4877f4a86adf586aeb1b66980e23504`  
交付性质：架构裁定、PR 施工设计和研究编排；不是代码实现、远端 PR、合入、发布或产品验收回执。

## 本轮结论

**采用 Work Core 主导的模块化单体；当前执行内核继续复用锁定 Pi。先修真实接缝正确性，再完成 Runtime 与 Work application 两条解耦。自研重心是工作治理、运行组合、受控能力与输入编译，不是为“拥有 Harness”重写通用 loop。**

保留后续薄执行器与外部 runtime 并存的路线。Spark 首先是有界准备/核查职责和受限 profile；独立薄执行器须经对照实验决定。真实第二 runtime 的首个 probe 选 Codex App Server 的受支持接口，不从网页包装或 fake provider 推导已具备替换能力。

架构路线可以据此进入本地采用与施工；产品 release 暂不签署通过。仓库记载真实 provider 与 G1–G5 仍有开放项，本轮也没有运行产品测试。Pages 已发布不等于这些门已关闭。[R02](SOURCES.md#r02)[R03](SOURCES.md#r03)[R14](SOURCES.md#r14)

## 阅读顺序

[架构裁定](01-ARCHITECTURE-RULING.md) → [接缝与契约](02-BOUNDARIES.md) → [PR 计划](03-PR-PLAN.md) → [研发实验](04-RD-PLAN.md) → [发布验收](05-RELEASE-GATES.md)。

[文档归属与消费](06-DOCUMENTATION-MAP.md)说明怎样回填既有入口而不另起总路线；[本地接单指令](HANDOFF.md)可直接交给集成会话；[来源与证据上限](SOURCES.md)固定本轮所据。`plan.json` 是同一施工图的机器投影，不拥有第二份产品状态。

## 状态纪律

本文“采用/调整/后置”指本轮设计结论。全部 PR 均为 `proposed-not-created`，实验均为 `not-run`。不替本地集成者假定 clean worktree，不代替非作者签署，也不自动授权 provider 消费、远端写入或部署。

本包继续使用 P00–P12、DRT-01～04、RD-006/007 和既有 BE/LG/DS/BG 编号。卡片后缀只是本轮拆分，不占用新的 DEC/RD 正式编号。P12-A 是有界阶段验收，**不等于**旧 P12 全包接受，也不等于 G1–G5 自动通过。
