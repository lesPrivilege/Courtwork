# Multi-agent / Thread / messaging · 本单入账与裁定

用户于 2026-09-10 指定本单认领 multi-agent、Thread、message other agent 的入账与裁定，同时建立 Harness Core 和前端入口，Luna explore。Astra 持有架构、关键实现与合流；Luna 有界只读探索与反例核验。实际开工 `main@27d37dad75c07f0bc0aa394c19d208e92c8c9a1f`，工作树有另一单的 WK98 回归修改，未动。隔离开发期间接入 `6921dbd18de153020c87e4438eebe5260762fee0` 的 telemetry/effort；本单分配 RuntimeStore **8**，不占用该单已落地的 7。

两份输入均原字节入账，见 [来源索引](source-index.md) / [manifest](source-manifest.json)。输入是待逐项判断的研究材料；其中的产品建议、140 候选/14 线研究自述及外部成熟度不能直接作为本地已验证事实。

## 本轮裁定

| ID | 输入主张 | Astra 裁定与实际落点 |
|---|---|---|
| MA-D01 | multi-agent 成为核心模型？ | 不新增 Agent/Swarm 领域真源。Multi-agent 是 Explore/Workflow 的执行拓扑。复用 Work Core 与 Pi 单一生命周期 owner。 |
| MA-D02 | Thread ≠ Session ≠ context ≠ agent | 采纳。Thread 是 CW 的持久交互工作线，初版持有显式成员关系与通信收件箱；可关联同 scope 多个 Session。没有把旧 Session 重命名成 Thread，也没有迁移/合并旧 transcript。 |
| MA-D03 | Attention 是特殊 Matter 上的 singleton | **不按材料直接迁移。** 当前已接受方向是一个全局角色、多个 global Session。初版允许 global Thread，`matterId:null`；没有虚构 Attention Matter 或自动 Home Thread。将来引入特殊 Matter 要单独给迁移与治理消费者。 |
| MA-D04 | Expert 是 durable specialization，与 capability 正交 | 采纳边界；现有 Work Contract/extension/profile 各守职责。未新增 Expert entity、注册表或导航。profile 不自动授予能力或持久工作所有权。 |
| MA-D05 | subagent 产品名称 Explore；默认 child Session | 产品词采纳；实现约束改为 **fresh child execution/context**，由 adapter 决定 runtime session/lane/process。不得强求独立进程，也不自动创建 Thread。 |
| MA-D06 | 委派权限单调递减 | 采纳。child conformance 的 action/resource 求交与 depth 递减；每次 tool 调用再检查。它不是 OS sandbox。实际模型消息另经现有 governTools 单次 ask；read_only 禁止发送。 |
| MA-D07 | Expert message/raise Attention；Attention create Matter/Expert | 消息只是通信。不得由来源文本或“Attention”名字取得创建/接受/全局策略权限。现有 Core Attention adapter 保持；本片不交付 create_expert、raise_attention 或 create_attention_agent。 |
| MA-D08 | invoke 与 handoff 分离 | 采纳。child entry 只支持 invoke；消息既不是 invoke 也不是 handoff。没有 ownership transfer 动作。 |
| MA-D09 | Workflow 显式 graph/state machine | 采纳方向。普通 presets / developer spec 为后续接口；本片不安装 durable engine。 |
| MA-D10 | Reducer 与 synthesis 分开 | 首片 deterministic finding reducer 保留 claims、evidence、conflict、gap 及逐 execution attribution，重复一致结果去重，矛盾同 ID 拒绝。未接 LLM synthesis，更不接正式接受。 |
| MA-D11 | Core audit / Runtime log / OTel 三本账 | 采纳。Thread/message 在 Host 交互账；Matter truth 在既有 SQLite Core；OTel 映射后置。消息的 delivered 不代表模型读到或 Core accepted。 |
| MA-D12 | SQLite transactional outbox 起步 | 对**涉及 Core 事实的跨 Matter 转换**保留该后续设计。当前通信没有 Core 状态变化，使用既有 RuntimeStore 单写者原子发布 outbox/inbox，避免再造第二 writer 或假称跨 JSON/SQLite 事务。 |
| MA-D13 | MCP / A2A / provider 选择 | MCP 管既有工具接入；A2A 留外侧。Pi 0.85.1 保持生产宿主；Harness v2 等是 conformance 候选，不升级 vendor 或换宿主。 |
| MA-D14 | 先做什么 UI | Attention 的 “Threads & messages” 可管理显式工作线并收发本地通信；现有 Chat/Session 导航不替换。主轨迹和消息正文不混入相邻最新对话。Explore/handoff/Workflow 明确未连接，不画伪可用按钮。 |

## 已建立的入口与剩余范围

- [Harness 模块](../../../app/harness/)：Thread 生命周期/成员关系、消息 envelope、幂等 outbox/inbox、模型目录/收件箱/发送工具；child contract、权限求交与 deterministic reducer 的 adapter conformance entry。
- [生产合同](../../../app/docs/coordination.md)：准确 API、角色/范围、恢复、容量和 schema8 迁移。Thread 通信不是正式 Matter 事件流或统一 transcript。
- [前端](../../../app/web/coordination-view.mjs)：真实 authenticated HTTP；原始消息用 textContent；精确来源/目标；未知回执重试同 ID；关闭面板不撤销已准入通信。
- [七 seam 选型](selection-index.md)、[runtime matrix](runtime-matrix.md)、[C1–C10 验证](verification.md)、[施工账](local-handoff.md) 分开记候选、首片和未交付。
- [交付证据](../../../evidence/multi-agent-20260910/README.md)分列作者测试、Luna 只读意见与浏览器观察。生产 Pi child parallel、持久 child recovery、通用 grant/approval escalation、Expert handoff、Core 跨 Matter 事务和 Workflow 仍待。

本单只建立首片生产通信与执行契约入口，不宣称完整 multi-agent 系统或 G1–G5 接受。Paper 仍按 [PAPER.md](../../../PAPER.md) 的独立 9.6 SHA；没有个人数据迁移、真实付费 provider、外部消息或部署。
