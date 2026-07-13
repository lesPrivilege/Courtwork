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

## 变更规则

- 新决定不得靠修改旧段落偷偷覆盖；需要替代时新建 ADR，并在双方状态中写 `Superseded by` / `Supersedes`。
- 每份 ADR 的“来源”只列 commit SHA，不引用归档文档。
- ADR 说明语义，schema 与机器门执行语义；二者冲突时立即登记漂移。
