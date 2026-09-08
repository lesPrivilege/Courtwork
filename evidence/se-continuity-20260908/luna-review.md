# Luna 只读探索与有界独立复核

2026-09-08；非作者 Luna 探索后复核 B0，未修改文件。Astra 根据其回报记录本页；[Luna 原始运行](luna-independent.json) 固定实际 HEAD/哈希/环境。

`node benchmarks/continuity/run.mjs --output <new-result.json>`：5/5，退出码 0。`node --test benchmarks/continuity/grade.test.mjs` 通过。观察到过期、同键异内容、actor 字段拒绝后均无非法正式效应；未发现阻断 B0 交付的误通过。报告只接受其声明的 Core 机制范围，不是完整 benchmark 或产品接受。

独立审查确认 grader 无生产 validator import，原始 snapshot 和逐 checkpoint 结果可查，单一开发族、优雅重启、无真实模型等边界已明确。Luna 额外 NDA domain 8/8 回报仅作探索，未附其原始日志，不纳入本轮 benchmark 统计。

环境缺口：该隔离树未安装 `@earendil-works/pi-ai`，Luna 尝试 runtime/NDA host 测试无法启动。此项保留为未运行，不是 B0 失败，也不算通过。B1 应先执行锁定依赖安装。

## 下一层必须处理

1. 当前 oracle 只测拒绝及状态后果，不区分不同拒绝原因。B1 增加跨实现语义拒绝类别映射及其评分；不得仅靠任一允许的错误码得分。
2. 当前 actor case 是 Core payload schema。B1 经 HTTP 验证 host-owned actor 拒绝，不外推工具隔离或身份安全。
3. 当前 restart 为优雅关闭/重开。B1b 分开提交前与提交后未回执的真实 SIGKILL 探针。
4. B1a 使用真实 lifecycle/binding/runs/surface/actions/work-query 路由；producer 缺席的读取与动作禁用分别评分。

源码入口：`app/tests/work-core.test.mjs`、`app/tests/work-continuity.test.mjs`、`app/tests/nda-runtime.test.mjs`、`app/domains/inbound-nda/fixtures.mjs`。生产 fixtures 与 buildReview 可帮助理解格式，不能作为独立新语料或新 oracle。具体契约及下一步见 [B1 施工边界](../../engineering/research/se-continuity-2026-09-08/next-capability.md)。
