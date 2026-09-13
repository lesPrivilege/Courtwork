# DF-06 · MCP故障组合补证

2026-09-13，隔离基线 `321014a9ec942f542e4db17407335f03b698ea31`。Sol作者，Luna非作者源码复核/独立执行，Astra裁定缺口、源码审阅与集成。唯一代码增量为 [release-mcp-failures.test.mjs](../../app/tests/release-mcp-failures.test.mjs)，无生产改动。

Node22.19 / macOS arm64，沿[测试合同环境](../release-test-contract-20260913/README.md)。作者[新片3/3](sol-focused.tap)、[相邻27/27](sol-adjacent.tap)，Luna[独立27/27](luna-independent.tap)通过。组合命令为 `node --test app/tests/release-mcp-failures.test.mjs app/tests/hpr_p02.test.mjs app/tests/hpr_p02b.test.mjs app/tests/release-capability-lifecycle.test.mjs`。文件hash见[清单](files.sha256)。

三项补证：

- 明确deny MCP审批后，无durable dispatch/result、无tools/call与remote effect；区别于仅隐藏工具。
- 待审批取消后Run为cancelled，晚到allow被拒绝，仍无dispatch/effect；不混同派发后的unknown。
- 远端已返回结果，Host `store.appendEvent` 在 `runtime.mcp.result` 处失败：恰好一次wire call和fixture effect，durable dispatch存在但result receipt缺失，Run为unknown且admission关闭。重开保留围栏，同command幂等返回旧Run，superseding continuation以effect_unreconciled拒绝，不重放。

wire请求与effects是fixture分别记录的数组，但同属一个受控HTTP服务；不是独立外部服务的审计。结果回执失败是注入持久化owner接缝，不冒称真实磁盘损坏或SIGKILL。实际in-flight进程杀死、丢response、dispatch-intent写失败、结果保真继续由本次组合中的原P02/P02b测试承载；正常重开不取代崩溃恢复。

[前一生命周期片](../release-test-contract-20260913/capability-lifecycle.md)继续承载disconnect旧executor、新binding与曝光收缩；本片不额外声称旧配置hash变更executor反例已执行。它与[P05/P06](../release-input-binding-20260913/README.md)组成有界合成证据，不代签最终同候选真实Provider、GUI或G1–G5。未push/部署。
