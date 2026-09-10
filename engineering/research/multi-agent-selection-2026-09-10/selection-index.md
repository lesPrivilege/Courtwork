# Selection / source index

消费时先读 [RD-005](../RD-005-multi-agent-selection.md) 和 [PR映射](pr-plan.md)，再按下表定向读取原文及 donor；源会话建议不覆盖生产合同。

| Donor / mechanism | 消费与负边界 | 去向 |
|---|---|---|
| Codex AgentControl / app-server | control与事件归约、path引用；不复制宿主对象为领域owner | MAS-01/02 |
| Claude subagents / Teams | fresh受限profile；team/mailbox后置，不复制全文或默认peer | MAS-03/05 |
| Anthropic Research / Open Deep Research | isolated worker、artifact refs、单一综合；拒绝昂贵默认fanout | MAS-03/05 |
| PicoAgents | workflow/orchestration分类与plan/execution分离；拒绝shared transcript和raw-event UI | MAS-01/04/05 |
| SoL-Pi | 证据绑定压缩、精确召回、compaction生命周期、可丢弃loop、隔离评测 | ME-01/03/04/09、MAS-05/06 |
| LangGraph | typed state/interrupt语义；非framework依赖 | MAS-01/02 |
| A2A / MCP | remote agent与工具协议分层；不用A2A做本地IPC | ME-07/08后置 |
| AG-UI / Cockpit | activity/inspect与Attention聚合；不替换CW domain model | MAS-04 |
| A2UI | 动态Expert surface另题，不用于本片Agents panel | 后置 |

## 本次外部核验范围

2026-09-10打开 [SoL-Pi仓库](https://github.com/NVlabs/SoL-Pi) 与 [PicoAgents仓库](https://github.com/victordibia/designing-multiagent-systems) 页面。只作README级有界核验，未运行、未固定donor源码SHA，不声称完整源码审计。

SoL-Pi README确认四项opt-in机制、原文保留及reducer失败回退；其测试依赖为Pi 0.84.2，CW既有0.85.1不能据此直接宣称兼容。性能百分比、152提案/存活率、D1…15逐项、disposable演化与具体参数仍为T03来源主张，待固定源码/论文核验。PicoAgents实现细节仍为T02来源主张；本次只确认仓库入口。其他来源均未在本单逐页复核。外部主张与本地架构裁定分开。

## 全量外链召回

以下从六条消息机械提取、按URL去重；保留原URL，T编号指conversation.json的时间正序。标为“会话来源”不表示本次已打开；可变main或短SHA链接在实现前须解析固定版本。

| ID | 来源轮次 | URL |
|---|---|---|
| MAS-S01 | T01 | [会话来源](https://developers.openai.com/codex/subagents) |
| MAS-S02 | T01 | [会话来源](https://github.com/openai/codex/blob/fbe65995/codex-rs/core/src/agent/control.rs) |
| MAS-S03 | T01 | [会话来源](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md) |
| MAS-S04 | T01 | [会话来源](https://github.com/openai/codex/blob/65cc12d7/codex-rs/app-server-client/src/lib.rs) |
| MAS-S05 | T01 | [会话来源](https://github.com/openai/codex/commit/fae270932065355b5d7f197b3f1c72912588369b) |
| MAS-S06 | T01 | [会话来源](https://code.claude.com/docs/en/agent-sdk/subagents) |
| MAS-S07 | T01 | [会话来源](https://www.anthropic.com/engineering/multi-agent-research-system) |
| MAS-S08 | T01 | [会话来源](https://code.claude.com/docs/en/agent-teams) |
| MAS-S09 | T01 | [会话来源](https://www.langchain.com/blog/open-deep-research) |
| MAS-S10 | T01 | [会话来源](https://a2a-protocol.org/latest/specification/) |
| MAS-S11 | T01 | [会话来源](https://github.com/ag-ui-protocol/ag-ui/blob/main/sdks/python/ag_ui/core/events.py) |
| MAS-S12 | T01 | [会话来源](https://docs.ag-ui.com/concepts/events) |
| MAS-S13 | T01 | [会话来源](https://github.com/agent-cockpit/agent-cockpit) |
| MAS-S14 | T02 | [会话来源](https://github.com/victordibia/designing-multiagent-systems) |
| MAS-S15 | T02 | [会话来源](https://github.com/victordibia/designing-multiagent-systems/blob/main/picoagents/src/picoagents/orchestration/_base.py) |
| MAS-S16 | T02 | [会话来源](https://github.com/victordibia/designing-multiagent-systems/blob/main/picoagents/src/picoagents/orchestration/_plan.py) |
| MAS-S17 | T02 | [会话来源](https://github.com/victordibia/designing-multiagent-systems/blob/main/picoagents/src/picoagents/webui/_execution.py) |
| MAS-S18 | T02 | [会话来源](https://github.com/victordibia/designing-multiagent-systems/blob/main/picoagents/src/picoagents/webui/frontend/src/components/shared/debug-panel.tsx) |
| MAS-S19 | T02 | [会话来源](https://github.com/victordibia/designing-multiagent-systems/blob/main/picoagents/src/picoagents/orchestration/_ai.py) |
| MAS-S20 | T02 | [会话来源](https://github.com/victordibia/designing-multiagent-systems/blob/main/picoagents/src/picoagents/orchestration/_round_robin.py) |
| MAS-S21 | T02 | [会话来源](https://github.com/victordibia/designing-multiagent-systems/blob/main/picoagents/src/picoagents/webui/frontend/src/components/orchestrator/orchestrator-view.tsx) |
| MAS-S22 | T03 | [会话来源](https://github.com/NVlabs/SoL-Pi?utm_source=chatgpt.com) |
