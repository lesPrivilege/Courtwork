# Runtime matrix · 本地证据优先

| Runtime / provider | 当前角色 | 本片实际验证 | 未证明 |
|---|---|---|---|
| 当前 Pi AgentSession / 0.85.1 | 现行模型loop与governTools | local-fake真实SDK工具调用、消息单次permission与无自动目标Run | parallel child lanes、native async、child跨重启续行 |
| `executeChild` synthetic adapter | Harness contract conformance | identity、grant、工具逐次执行边界、cancel/timeout、reducer | 持久child journal、真实模型质量、OS隔离、生产provider |
| 固定Pi Harness v2 / `845d6ff1…` | MA-S2的第一升级候选 | 独立探索单列，未接入生产 | 全套C1–C10和当前SDK迁移兼容 |
| DSH | 第二adapter/反证候选 | 本片无执行 | compatible、真实撤销/恢复 |
| OpenCode / Claude Code / OpenAI Agents SDK / ADK / LangGraph | 产品语义或局部委派/reducer参考 | 本片无执行 | CW权限继承、ontology适用或生产接受 |
| Restate / Temporal | 后续durability provider候选 | 本片无spike | workflow kill/resume/side-effect去重 |
| Cedar / A2A / OTel | policy evaluator / perimeter / trace候选 | 本片无adapter | 内部权限真源或Core事务能力 |

一段可调用adapter代码不是原生multi-agent证据。UI `capabilities.explore/handoff/workflow:false` 必须与本表一致；版本升级需固定完整SHA和consumer fixture，不能仅更新名称。

## Luna一手源码复核后的修正

Luna按固定commit只读核验，以下是源码观察，不是conformance执行：

- 材料钉的 `845d6ff1f6643aba440341cce877ce1c43ebbc39` 对应 **v0.83.0**。[agent-harness.ts](https://github.com/earendil-works/pi/blob/845d6ff1f6643aba440341cce877ce1c43ebbc39/packages/agent/src/harness/agent-harness.ts) 仍是单一session；同commit的harness-v2.md描述lanes/subagents，但不能用设计文档证明已实现。fork/parentSessionPath仅证明储存复制与来源关系。
- 当前锁定 **0.85.1** 对应 `d981de1229ef899957bbe968bc8dcda02a21f477`。[AgentHarness API](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/agent/src/harness/agent-harness.ts) 已有lane/lanes/create；[runtime/harness.ts](https://github.com/earendil-works/pi/blob/d981de1229ef899957bbe968bc8dcda02a21f477/packages/agent/src/harness/runtime/harness.ts) 可创建/恢复named lanes，但`watchSession`仍抛`SliceNotImplemented`。这些接口不等于child model scheduler或message_other_agent服务。
- 独立分支 `harness-v2/i2@61112d96a7c0f6d17ba2165acd9fbbaab4e30cfa` 自标0.84.1，与0.85.1不是同一个版本事实；不能把分支特征、设计文档和当前包合并成已验证能力。
- CW生产调用 `createSessionRun` / coding-agent AgentSession，没有调用AgentHarness.create。下一步应首先对**已经锁定的0.85.1**建消费者fixture，不能因为材料建议“升级到v2”而重复升级或直接切宿主。

该修正覆盖MA-S2的“Pi权重上升”中未经本地验证的实现推断。保留Pi作为优先conformance target，但没有授予生产并行/恢复兼容。完整有界复核见 [Luna记录](../../../evidence/multi-agent-20260910/luna-review.md)。
