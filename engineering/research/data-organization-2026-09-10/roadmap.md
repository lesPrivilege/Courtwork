# 后续路线与 PR index

先消费现有合同，避免新增一套组织工程施工线。本表是可触发的研究/合同增量，不声明已实施；实际 owner 以开工时 main 为准。

| 增量 | 接入现有路线 | 开工条件与可审阅交付 | 验收 / 停止条件 |
|---|---|---|---|
| DO-01 合同完整性 | [DS-00 / DS-03](../data-systems-2026-09-09/pr-plan.md) | 在一个真实 Matter 合同逐项映射 identity、version、authority、evidence、completion、compatibility，列现有字段/缺口/不适用 | 不引入第二份权威状态；旧版本读写与拒绝路径有反例；现有合同足够即停止加字段 |
| DO-02 来源与执行关系 | [LG](../local-governance-2026-09-09/pr-plan.md) / BG-02 | 第二个 lineage 消费者出现时，画 source-version → run-attempt → candidate → decision 的实际关联，区分观察与提交 | 重试、旧来源、失败 run、人工决定均可解释；缺少来源不能由 facet 补造 |
| DO-03 角色接口 | [ME selection](../multi-experts-2026-09-10/selection-index.md) / [AM](../architecture-maintenance-2026-09-09/pr-plan.md) | 第二个 Expert 消费者需要接口时，先用现有 role/binding/execution 写一份有界 TeamAPI 风格说明 | 执行身份、作用域、review义务明确；目录缺席仍可读历史，发现角色不获得权限 |
| DO-04 策略可解释性 | BG / Core / Runtime policy | 出现跨合同重复策略或冲突难以解释时，固定 PARC 输入与 deny/allow 负例，对照现有确定性代码 | 不修改 owner；记录错误、默认拒绝、规则版本；现有检查已充分则不采用 Cedar/OPA |
| DO-05 等待与外部效果 | AM-B / MA / DS-04 | 真实长等待或不可重试效果出现，再对照 BPMN/Temporal 官方接缝 | restart、重复投递、取消、未知外部效果逐项有证据；无需求不引 workflow engine |

## 本轮 PR

- [Draft #1：Benchmark contract](https://github.com/lesPrivilege/Courtwork/pull/1)：BM-01 契约；BM-02 manifest、BM-03 状态机、BM-04 故障重放、BM-05 Disclosure 的执行简报。无新评测结果。
- [Draft #2：Public narrative](https://github.com/lesPrivilege/Courtwork/pull/2)：基于 #1 的公开页面与 README、语义图，以及本研究登记。保持堆叠基线，合入前重新对齐实际 main。

DO-01…05 是既有路线的消费别名，不新开重复产品 PR。本轮已经完成可公开叙事与登记；内部实现留给相应合同的下一次真实需求与实际基线。SE 是否修订见 [Paper 裁决](README.md#paper-裁决本轮不修改)。
