# 架构决定索引

本目录是跨层契约的唯一决定集。只有状态为 `Accepted` 的 ADR 具有约束力。

| ADR | 主题 | 状态 |
|---|---|---|
| [ADR-001](ADR-001-package-abi.md) | 包 ABI 与依赖边界 | Accepted |
| [ADR-002](ADR-002-schema-workflow.md) | schema、场景与人工确认 | Accepted |
| [ADR-003](ADR-003-evidence-and-anchors.md) | 信源、引用与锚点 | Accepted |
| [ADR-004](ADR-004-documents-and-files.md) | 文档生命周期与文件操作 | Accepted（2026-07-28：pi workspace 窄修订） |
| [ADR-005](ADR-005-data-security.md) | 状态、隐私与安全 | Accepted |
| [ADR-006](ADR-006-ui-host.md) | UI 宿主与设计系统 | Accepted |
| [ADR-007](ADR-007-provider-turn-protocol.md) | Provider、Turn 与受控交互协议 | Accepted |
| [ADR-008](ADR-008-schema-conformance-and-authority.md) | Schema 包一致性与字段职权 | Accepted |
| [ADR-009](ADR-009-runtime-ports-and-harness.md) | Runtime Ports、双 Harness 与 Package 双平面 | Accepted（2026-07-28：pi GUI 窄例外） |
| [ADR-010](ADR-010-work-live-boundaries.md) | Work live 的材料、状态与命令边界 | Accepted |
| [ADR-011](ADR-011-minimal-harness-kernel.md) | 最小 Harness Kernel 与扩展边界 | Accepted（2026-07-20 修订两处；2026-07-27 修订三——pi lane） |
| [ADR-012](ADR-012-vertical-package-kit-and-visual-blueprints.md) | 垂类包体例、企业编排与可视化 Blueprint | Accepted |
| [ADR-013](ADR-013-chat-session-and-memory.md) | Chat 会话生命周期与自动记忆 | Accepted |
| [ADR-014](ADR-014-preview-tabs-and-package-tiers.md) | Preview 分页宿主与三层包体系 | Accepted |
| ADR-015 | （预留：包的装载与生命周期，需求到来才立） | — |
| [ADR-016](ADR-016-uniform-slot-filling-protocol.md) | 统一填格协议 | Accepted |
| [ADR-017](ADR-017-controlled-command-execution.md) | 受控命令执行（受控脚本执行） | Accepted（2026-07-26 启封；2026-07-28 pi write 窄修订） |
| [ADR-018](ADR-018-execution-isolation-and-sandbox.md) | 执行隔离与沙箱边界 | Accepted（2026-07-28：host workspace 例外与沙箱路线纠正） |
| [ADR-019](ADR-019-dossier-container-and-local-cache.md) | 卷宗容器与本地缓存分区 | Accepted |
| [ADR-020](ADR-020-release-distribution-truth.md) | 发行许可、候选制品与公开真值 | Accepted |
| [ADR-021](ADR-021-dossier-work-semantics.md) | 卷宗工作语义层（standing brief） | Accepted（2026-07-28，触发/合成/预算/事务边界已冻结） |
| [ADR-022](ADR-022-pi-lane.md) | 通用 agent loop 线（pi lane） | Accepted（2026-07-27；2026-07-28 冻结薄 harness→基础 GUI→原生能力生长阶梯） |

四份由 `HARNESS-CORE-1` Stage A 提出，2026-07-20 逐项裁决；决定与理由已全文落入各 ADR 本体，无须回读材料。原始材料 `harness-core-1-stage-a.md` 随裁决闭合归档，按归档索引条目定位（史料线索，非现行依据）。

**`ADR-017` 的现行状态**：决定一至八已按决定零重启条款携新必要性证据启封，能力面命名
「受控脚本执行」——启封的是 argv 受控形态，不是 bash；决定七禁项与「宿主零 shell」承诺
继续成立。`SANDBOX-PROBE-1` 只证明原语可行，没有放行产品沙箱选型；因成熟外采方案尚未裁定，
`EXEC-SCRIPT-1` 继续 parked。2026-07-28 的 pi `write` 窄修订只允许 Rust host-mediated
app-data workspace，不放行 Node 直写或脚本。修订记录见各 ADR 末节。`ADR-021` 已于
2026-07-28 完成上游源码复核并转 `Accepted`；实现仍只可按 `DOSSIER-FLOW-1` 票面与依赖开工。

## 变更规则

- 新决定不得靠修改旧段落偷偷覆盖；需要替代时新建 ADR，并在双方状态中写 `Superseded by` / `Supersedes`。被修订的 ADR 在末节加「修订记录」登记条目与落点，正文段落保持原样。
- 每份 ADR 的“来源”优先列 commit SHA。**史料引用例外（2026-07-18 拍板，与 [`docs/README.md`](../README.md) 文档体例同口径）**：来源段可引 `archive/` 具体路径作为**历史证据线索**（只说明结论从何而来，不构成现行依据）；此例外不扩大到 ADR 正文、其他现行文档、SPEC、源码与脚本。
- ADR 说明语义，schema 与机器门执行语义；二者冲突时立即登记漂移。
