# Harness 下一轮后端交付

2026-09-09。用户授权先ES-01，Attention稳定后另开fresh Astra。开发基线 `a7a08f035cc5a716b8c7a93024cdfe4e44e4c07d`，隔离分支 `codex/harness-next-round`；main/current/后端台账由来源Astra集成。本文件是代码交付回执，不是main合流或G1–G5产品接受。

| 单项 | 固定代码 | 结果 |
| --- | --- | --- |
| BE-30 permission载荷CAS | `757ea768b8ea9702c7534f5f67b950bbd9dafc7d` | 可选expected hash/toolCallId在实际resolve事务内比较；[独验](be30-independent.md) |
| AM依赖边界正负例 | `fe73001c841ba3f5234b1071482739a093a114ab` | 有界import owner守卫，无新依赖或架构重写 |
| ES-01完整文件候选后端 | `b1ff74b08c053fa0e3ab47fb20f510eabb9440e9` | 最终产品版本；包括前继429a2f2及其验证记录完整性修复。作者279/279、smoke通过 |

ES [实施回执](../backend-dispatch-20260909/es01-implementation.md)与[正式协议](../../docs/work-core/contract.md#es-01-opt-in-recorded-file-memo)给出实际接口、limits、输入覆盖、记录字节、候选验证/接受、分页/diff和迁移边界。[独立迁移](es-schema-independent.md)与[独立Core反例](es-core-independent.md)分别列被测SHA、作者身份及范围。旧429a2f2的损坏验证结果反例保留，不将修复前作者通过当作最终独立接受；来源合流必须包含b1ff74b。

最终作者命令：`cd app && npm test`（279 pass/0 fail/0 skip），`npm run smoke`（pass，realProvider:not_run）。Core12/12、HTTP/Pi连续性7/7包含在全量，非叠加完成度。测试使用独立合成目录和端口，没有升级用户数据库、读取凭据、调用付费provider、外发或部署。

Core2/app3保持单一SQLite owner，RuntimeStore仍schema4。迁移备份不得覆盖；旧host拒新schema，回退在独立目录配旧host恢复。初始429a2f2的临时合成Core2/app3库不是受支持迁移来源；它未交付main或用户数据，最终形状增加verification record摘要，异常形状拒绝。

当前文件profile无catalog/创建GUI，现有memo renderer抑制为只读fallback；HTTP/Pi完整闭环不等于文件Review GUI或专业质量接受。完整输入覆盖仅支持洁净Session与compaction禁用，其余unknown并拒绝接受。真实provider、GUI、发布和产品G1–G5仍待。

后续执行见 [Attention fresh Astra交接](../../engineering/execution/2026-09-09-harness-next/attention-fresh-astra.md)：Astra先确认ES实际main合流与Core/service单writer，再沿ATT-BE-01施工；已有FE队列、Paper和个人实践目录保持各自责任。
