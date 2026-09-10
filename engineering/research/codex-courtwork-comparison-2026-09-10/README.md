# Codex 与 Courtwork 对比 · research intake

状态：**已登记研究输入；不构成产品实现、架构裁决或独立验收。** 本包从交接基线 2eca4885a7f1ebab4c6e8b7d38e76ffbe3d09a50 隔离创建，仅保存可访问对话与有界处置。

## 来源与覆盖

[Codex 与 Courtwork 对比](chatgpt-conversation://6aa27a87-e3ac-83ec-8999-789ddc1f40f9) 已通过 mcp__codex_app__read_thread 完整读取可访问页：请求 turnLimit=10，单页 order=newest_first、hasMore=false、nextCursor=null，因此无需后续 cursor；无附件。可访问内容为 1 个 completed turn（5f131689-037b-429e-8a54-512c3ae19cc4）和 2 条消息：1 条用户输入、1 条回答。原始接口 JSON 保存在 [inputs/conversation.json](inputs/conversation.json)，50 行、11,609 bytes，SHA-256 219d9de8e13c7be0f13b2be722325a5b570838fd68cf937f5dbbcc6fea2cfb6e；机器覆盖与限制见 [source-manifest.json](source-manifest.json)。

回答中的 turn850230search0 等 opaque citation ID 在接口返回中没有 URL 映射。本轮没有浏览或核验 OpenAI/Codex 的外部能力、版本、发布日期、吞吐、上下文长度或路线；这些内容保持为**用户提供的讨论材料/未验证主张**，不能当作外部事实或可点击来源。

## Claims disposition

| 对话主张或观察 | 入账处置 | 现有 Courtwork 范围 |
|---|---|---|
| Codex-Spark 是模型；Courtwork Spark 是资料治理链中的派生、失效与恢复/重建工作面。两者同名但不是同一对象。 | **保留术语分离；不改架构。** 这是本次对比的核心防混淆结论。 | Spark 的当前只读投影与 source-version 派生失效边界见 [Spark integration ruling](../../design/spark-surface-2026-09-10/integration-ruling.md)；来源治理与可重建派生的研究背景见 [multi-experts intake](../multi-experts-2026-09-10/README.md)。 |
| Codex 的 foreground 协作、background agents/automation、fan-out 与 human attention 拓扑可作为 Courtwork 的 external precedent / convergence case。 | **采用为比较观察，不作为成熟度或功能等价证明。** 不新增 runtime、scheduler、broker 或 UI authority。 | Attention 的全局会话、progressive disclosure 与 Runtime 组合见 [Attention design](../../design/attention-agent-2026-09-10/README.md)；Spark 仍沿已有 owner 与只读投影合同。 |
| Event Log ≠ Matter State ≠ Compiled Context。 | **保留为边界提醒。** 对话不得把 transcript、event log、缓存或模型回忆提升为 Matter/Core 真源。 | Work Core 继续持有 Matter、来源、候选、决定与成果；Attention 的事件/receipt 与 Core 状态分列，见 [Work Core contract](../../../docs/work-core/contract.md) 与 [Attention contract](../../../docs/work-core/attention.md)。 |
| Attention 对应人类的 review、answer、change direction、approve 等介入面。 | **仅映射为 human-loop projection。** UI 显示不授予 authority；typed human action、revision/CAS、receipt 与正式 Matter 决定仍由现有 Core 合同负责。 | [Attention contract](../../../docs/work-core/attention.md) 明确人类动作影响 Attention，不自动成为 Matter decision、tool permission 或外部效果。 |
| “Codex 2026 已发布/提供 GPT-5.3-Codex-Spark、>1000 tok/s、128k context、command center、Automations、移动端 step-in”等能力与日期。 | **未验证用户主张。** 不引用 opaque citation，不写入当前状态，不据此宣称采用或竞争结论。若未来需要产品决策，另开有明确官方来源与版本固定的核验单。 | 本包只做输入登记；不改 current.md、roadmap、Paper、产品代码或 schema。 |
| 对外一级名称可能发生 Spark 语义冲突。 | **记录为后续命名研究候选；不在本单裁决改名。** 内部 Courtwork Spark 仍按当前文档边界理解。 | 现有设计/路线文档拥有命名与施工上下文；本 intake 不覆盖 Astra 的架构、集成或发布决定。 |

## 使用边界

- 这是一份可追溯的 research input，不是 Codex/OpenAI 产品说明书，也不是 Courtwork 的接受证据。
- 本轮未安装、运行或调用真实 provider，未读取个人数据，未发送外部消息，未修改产品代码、schema、current.md、roadmap 或 Paper。
- 后续消费者必须重查实际 main 与对应 delivery；本包的交接 SHA、对话内容和未验证限制不能覆盖当前状态。
