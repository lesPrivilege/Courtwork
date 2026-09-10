# 七个可替换 seam

| Seam | 消费机制 / 候选来源 | 当前选择 | 不继承与下一个反例 |
|---|---|---|---|
| Child execution | Pi [固定 Harness v2 材料](https://github.com/earendil-works/pi/blob/845d6ff1f6643aba440341cce877ce1c43ebbc39/packages/agent/docs/harness-v2.md)、DSH provider seam、OpenCode fresh context | CW `executeChild`/origin/grant/result entry + synthetic adapter | 不把 runtime lane当Thread；版本不合、迟到结果、取消、超时均须拒绝伪成功。生产 adapter 未接。 |
| Delegation | OpenAI Agents SDK 的 invoke/handoff 区分（来自 MA-S2） | invoke-only child；message独立 | handoff 未交付；发送或调用不改变 owner。 |
| Capability | Cedar PARC/default deny 与现有 Runtime policy（外部内容来自 MA-S2） | CW host grant求交，depth递减；模型通信经既有工具批准 | 不把 manifest/tool visibility 作为授权。通用跨域grant生命周期/审批升级另片。 |
| Reducer | Anthropic research、LangGraph reducer/subgraph（来自 MA-S2） | deterministic union + per-execution evidence/conflict | 不从自由总结重建证据。重复ID矛盾拒绝；乱序相等。 |
| Durable workflow | ADK graph、Restate/Temporal（来自 MA-S2） | 保留graph/state-machine合同；当前无依赖 | 真实跨重启HITL/不可重复副作用压力出现后spike；不能借outbox测试称Workflow恢复。 |
| Messaging | [transactional outbox](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/transactional-outbox.html) 作为材料给出的机制定位 | 纯通信采用RuntimeStore单写者outbox/inbox；精确Thread/Session/Run/call/revision | 不造broker，不写Core事实。Core mutation+outbox同事务是后续独立接缝。外侧A2A另行版本化。 |
| Tracing | OTel GenAI（来自 MA-S2）、当前Host request telemetry | origin保留；child结果/消息无Core接受权 | 本片不加OTel依赖/导出，不把现有telemetry叫因果trace全覆盖。 |

外部项目名称是 donor 定位，不是兼容承诺。生产依赖没有变化；参见 [来源等级](source-index.md) 与 [runtime matrix](runtime-matrix.md)。

## 后续研究消费

[多智能体实践选型](../multi-agent-selection-2026-09-10/README.md) / [RD-005](../RD-005-multi-agent-selection.md)：含PicoAgents、SoL-Pi及原MA-01…06到MAS/ME映射；保留MA2-D15，不重开vendor lane。
