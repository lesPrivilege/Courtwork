# Exa 定向核查

2026-09-13，Luna只读快速探索。读取Exa Search技能及searching指引，消费[既有source-index](../../research/architecture-maintenance-2026-09-09/source-index.md)的MCP条目后作3次定向搜索，每次5条，sources_reviewed=15（搜索结果计数，不代表15篇均全文验证）；随后读取3个官方页面。不重新做框架选型，不修改依赖。

| 官方来源 | 可消费机制 | 本地映射及限制 |
|---|---|---|
| [MCP Tools 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/server/tools) | 用户拒绝/确认、输入和访问验证、非可信server注解不自行可信 | P05/P06、DF-06：Host精确授权不从工具声明或材料文案推导；规范不定义本地approval schema，也不提供沙箱 |
| [MCP Tasks Extension SEP-2663](https://modelcontextprotocol.io/seps/2663-tasks-extension) | 可选能力协商；取消表达意图，ack与任务终态可不同步 | DF-06：cancel请求与actual terminal分开。当前CourtWork是否支持此扩展须另验，本轮不引入Tasks |
| [MCP Specification 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/index) | 协议本身不能强制实现consent，实现方承担访问控制 | P02组合回归：dispatch后结果丢失保持unknown，不能据协议宣称exactly-once或回滚 |
| [MCP Architecture 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28/architecture) | Host承担连接生命周期、安全政策与consent，能力由双方协商 | 支持沿Host owner设计；per-Run冻结配置/工具集合是CourtWork本地裁决，不是协议规定的freeze算法 |

Astra采用上述责任边界与反例方向。这里的最新版文档是机制参考，不能推导锁定MCP client 2.0.0实现了全部新规范；不升级依赖，不给本地测试签署通过。
