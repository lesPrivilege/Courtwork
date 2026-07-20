# 架构决定索引

本目录是跨层契约的唯一决定集。只有状态为 `Accepted` 的 ADR 具有约束力。

| ADR | 主题 | 状态 |
|---|---|---|
| [ADR-001](ADR-001-package-abi.md) | 包 ABI 与依赖边界 | Accepted |
| [ADR-002](ADR-002-schema-workflow.md) | schema、场景与人工确认 | Accepted |
| [ADR-003](ADR-003-evidence-and-anchors.md) | 信源、引用与锚点 | Accepted |
| [ADR-004](ADR-004-documents-and-files.md) | 文档生命周期与文件操作 | Accepted |
| [ADR-005](ADR-005-data-security.md) | 状态、隐私与安全 | Accepted |
| [ADR-006](ADR-006-ui-host.md) | UI 宿主与设计系统 | Accepted |
| [ADR-007](ADR-007-provider-turn-protocol.md) | Provider、Turn 与受控交互协议 | Accepted |
| [ADR-008](ADR-008-schema-conformance-and-authority.md) | Schema 包一致性与字段职权 | Accepted |
| [ADR-009](ADR-009-runtime-ports-and-harness.md) | Runtime Ports、双 Harness 与 Package 双平面 | Accepted |
| [ADR-010](ADR-010-work-live-boundaries.md) | Work live 的材料、状态与命令边界 | Accepted |
| [ADR-011](ADR-011-minimal-harness-kernel.md) | 最小 Harness Kernel 与扩展边界 | Accepted（2026-07-20 修订两处） |
| [ADR-012](ADR-012-vertical-package-kit-and-visual-blueprints.md) | 垂类包体例、企业编排与可视化 Blueprint | Accepted |
| [ADR-013](ADR-013-chat-session-and-memory.md) | Chat 会话生命周期与自动记忆 | Accepted |
| [ADR-014](ADR-014-preview-tabs-and-package-tiers.md) | Preview 分页宿主与三层包体系 | Accepted |
| ADR-015 | （预留：包的装载与生命周期，需求到来才立） | — |
| [ADR-016](ADR-016-uniform-slot-filling-protocol.md) | 统一填格协议 | Accepted |
| [ADR-017](ADR-017-controlled-command-execution.md) | 受控命令执行（bash 入界） | Accepted（**决定一至七封存**） |
| [ADR-018](ADR-018-execution-isolation-and-sandbox.md) | 执行隔离与沙箱边界 | Accepted |
| [ADR-019](ADR-019-dossier-container-and-local-cache.md) | 卷宗容器与本地缓存分区 | Accepted |

四份由 `HARNESS-CORE-1` Stage A 提出，2026-07-20 逐项裁决（材料见 [`docs/status/harness-core-1-stage-a.md`](../status/harness-core-1-stage-a.md)）。

**`ADR-017` 的特殊状态**：其决定零成立——**bash 当期不入界**；决定**一至七**为「若入界」的既定受控形态，随 ADR 一并 `Accepted` 但**封存不生效**，重启须携新的必要性证据提修订、不得从零辩论已封存形态。**决定八生效**（reading/edits/writing 走既有工具契约，其中 edits/writing 属 effect 面另票）。`ADR-011` 的两处修订记录落在该 ADR 末节。

## 变更规则

- 新决定不得靠修改旧段落偷偷覆盖；需要替代时新建 ADR，并在双方状态中写 `Superseded by` / `Supersedes`。被修订的 ADR 在末节加「修订记录」登记条目与落点，正文段落保持原样。
- 每份 ADR 的“来源”优先列 commit SHA。**史料引用例外（2026-07-18 拍板，与 [`docs/README.md`](../README.md) 文档体例同口径）**：来源段可引 `archive/` 具体路径作为**历史证据线索**（只说明结论从何而来，不构成现行依据）；此例外不扩大到 ADR 正文、其他现行文档、SPEC、源码与脚本。
- ADR 说明语义，schema 与机器门执行语义；二者冲突时立即登记漂移。
