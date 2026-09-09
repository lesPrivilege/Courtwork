# ES-01 / metrics 独立探索回执

2026-09-09，基于 `fd3861b15ce4875b37af674d8c9dd0798d258fd4`，Luna 对固定实现做了非作者有界反例复核。写入范围仅为本目录；不修改 Core、RuntimeStore schema、service 或前端。

独立探针见 [independent-metrics.mjs](./independent-metrics.mjs)，复核记录见 [independent-review.md](./independent-review.md)。探针以临时 dataDir 和 `port: 0` 启动真实 HTTP service，使用 loopback local-fake，仅在内存/临时目录建立数据，结束后清理。

证据结果：

- `node evidence/backend-bounded-20260909/independent-metrics.mjs`：通过五组检查，覆盖 UTC ±1ms、跨午夜结束、代表状态计数与无状态过滤源码核对、run-id 去重、project scope、空/零/partial usage、认证与 query bounds、replay、restart/delete、读前后 state/file 不变、unpublished mutation、lockLost error 和 unsafe aggregate error。
- `node --test app/tests/work-metrics.test.mjs`：5/5；`node --test app/tests/work-summary.test.mjs`：6/6；`node --test app/tests/work-summary-consistency.test.mjs`：2/2。三项均 0 failed / 0 skipped。
- `npm --prefix app run smoke`：通过；provider 为 local-fake，real provider 为 `not_run`。`git diff --check` 通过。

复读结论：metrics 是单一已发布 RuntimeStore state 的同步只读投影；HTTP 入口沿既有 token/origin；UTC 日桶以 `startedAt`；删除 Session 后 retained-record coverage 缩小并标记 historical unknown；summary 的三集合各按自己的日期字段过滤。没有看到丢失重复 Run、把 reported zero 当 no-run、跨项目串值或读请求写回的反例。

契约边界已单列：同一派生扫描中 usage aggregate 超 safe integer 会使 activity 与 usage 都失败，探针得到 HTTP 500 `internal_error`。当前文档要求 unsafe totals fail，故本轮按拒绝潜在错误数据接受；若未来要求 activity 独立于坏 usage，需另立拆分合同。store unavailable 当前同样是失败 envelope，不承诺 503。

不声称真实 provider/billing、完整历史、任意规模性能、浏览器、ES-01 文件接受能力或产品 G1–G5 完成。

## ES-01 原始探索与 Astra 本轮裁定

ES 只读探索基线为 `5ea5ff00cdfe5280f255c372e359dca9e48c88c7`（本轮未修改相关产品文件）。Luna 返回、Astra 对照 ES-00 施工合同收敛如下：

- `app/extensions/work-adapter.mjs:220` 一带按全局 `contractVersion` 绑定/投影/begin。文件 profile 必须按持久 Matter contract 分派，不能全局改版本使旧 memo/NDA 失效。
- `app/runtime/workspace-tools.mjs:257` 一带次序为 history → rename → appendArtifact。`after_write` 的磁盘文件和 history blob 已存在，Run record 尚不存在；`app/tests/artifact-history.test.mjs:269` 一带已有真实 SIGKILL 反例。`app/server/service.mjs:187` 一带恢复只报告未记录文件，不回填执行记录。
- 可信 selector 只能由当前 Run 的持久 `run.artifacts` 解引用至 `ArtifactHistory.read(sessionId,digest,bytes)` 完整 Buffer。HTTP preview 会截断、current workspace 会变化、裸 hash 可存在但未记录；三者均不能作为 ES 执行证据。record 后恢复仍可能得到 unknown Run，不自动具有接受资格。
- 最小后续消费者保持 ES-00：opt-in file memo → recorded 小 UTF-8 文件集合 → Core 私有保存/验证 → 人工 decide → immutable 分页读。沿原合同 Core2/app3 与旧 host 拒绝/备份恢复，runtime4 不动；不另减限额或创 ABI。
- 首个停止条件是实际输入覆盖监测不能证明 complete；unknown-only 可诊断但不得接受或称 ES-01 完工。孤立 blob/未记录路径、跨 Run/Matter、缺失或损坏 history 必须拒绝且不推进 Decision。

本轮选取先解锁近期消费者的 metrics 主线，ES 不占用 Core 写权。详细施工要求继续由 [ES-00](../../engineering/execution/2026-09-09-execution-state/backend-contract-draft.md) 维护，不将本探索替代完整合同。
