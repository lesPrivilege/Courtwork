# 2026-07-15 Round 2 架构审阅原始报告

状态：低权威原始材料，仅供考古；现行文档、源码与验收不得引用本目录。

本目录原样保存 Round 2 前置代码审阅的 R1–R6 六份报告。报告帮助发现待核实边界，但没有经过逐条架构拍板，也不是实现计划、字段契约或当前状态真源。仍有效的最小结论已经省并到现行 roadmap、实现就绪图、ADR/SPEC 与状态文档；后续开工只读现行文档。

## 文件

- `multi-host-decoupling.md`（R1）
- `multiwriter-and-cross-case.md`（R2）
- `material-chain-and-sources.md`（R3）
- `output-docx-reality.md`（R4）
- `trigger-and-gate-capacity.md`（R5）
- `claimed-vs-real.md`（R6）

2026-07-14 的 A–F 调研已经在上一批归档，本目录不重复复制。

## 阅读校正

- 六份报告没有精确、统一地记录审阅 baseline；其中行号和计数只是当时工作树的历史坐标，不能用于当前验收。
- R6 使用的 `v0.1.1` 发布口径已经过期；现行公开版本为 `v0.1.2`，其 tag、Release、DMG 与 Pages 真值只认 `docs/status/current.md` 和 `release/DEPLOYMENT.md`。
- R4 所称 output 路径“真实产品已触发”不成立：demo/output bundle 可以到达该路径，真实案件 production Work 仍不可达。现行能力边界只认 `packages/output/SPEC.md`。
- R5 对 `external_send`/门禁、scheduled invocation 和 WeCom 跨进程接入的部分推演没有被采纳。存在后置 gate 不能追认 gate 前 effect；scheduled 与 gateway wire 仍需未来 ADR；通道名也不构成现行跨进程协议。
- 报告中的建议、竞品/平台事实和外部链接会随时间变化；未经现行 ADR/SPEC 吸收，不得变成实现或宣传依据。

## 已吸收目标

| 主题 | 现行承载位置 |
|---|---|
| 产品阶段、团队化、跨案与监控前置 | `docs/product/roadmap.md` |
| maturity、Round 2 工单依赖、实测清单、未来 ADR 队列 | `docs/architecture/implementation-readiness.md` |
| 产品/包/demo/外部验证/发布事实 | `docs/status/current.md` |
| 第二宿主复用边界 | `docs/architecture/system.md` |
| Work command、store、材料、预算与 effect 顺序 | `docs/decisions/ADR-010-work-live-boundaries.md` |
| docx 正确性与 Word/WPS 记录 | `packages/output/SPEC.md`、`packages/output/verification-checklist.md` |
| 法律扫描样本许可与服务未定 wire | `services/ingest/SPEC.md` |

本 README 是对原始材料的摄入说明，不提升报告权威；若报告正文与上述现行文件冲突，以现行权威链为准。
