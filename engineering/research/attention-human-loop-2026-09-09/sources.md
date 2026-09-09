# 显式来源的有界核验

观察日2026-09-09。均为公开官方文档；核验的是页面陈述，没有安装/运行这些产品、复跑其测试或审其实现。以下短摘要与 Courtwork 采用判断分开；用户研究规模没有本轮证据。

| 来源 | 本轮支持的陈述 | 采用与限制 |
|---|---|---|
| [OpenLoomi Loop](https://openloomi.ai/docs/loop) | decision card、dry-run 预览和批准后 connector 执行 | 卡片工作流参考；“never act”是其文档承诺，不是本轮安全/耐久实测，不移植 memory |
| [Superhuman Email Assistant](https://help.superhuman.com/hc/en-us/articles/46005854346893-Email-Assistant-by-Superhuman-Mail-Gmail) | Gmail 标准 draft 不自动发送；移除错误标签只作用当前 thread，不教会后续分类 | 分类和草稿/发送分离；CW 将 correction 留 evidence 是本仓设计，不称已实现 |
| [Notion Mail permissions](https://www.notion.com/help/connect-mail-to-custom-agents) | Modify inbox、Draft、Send 与 Require confirmation 分开；Modify 本身含多种动作 | 借权限划分，host 的删除/退订等细粒度闸门不能由一个 broad Modify scope 替代 |
| [GitHub About notifications](https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications) | 通知订阅和参与交互是 provider 现成语义 | 消费来源身份；notification/read/Done 不直接关闭 CW Attention |
| [GitHub Notifications REST](https://docs.github.com/en/rest/activity/notifications?apiVersion=2026-03-10) | Last-Modified/304/X-Poll-Interval；reason 可随同 thread 后续事件变化；列通知端点不支持 GitHub App tokens 或 fine-grained PAT | 保存观察 snapshot，按响应节奏读；账户认证兼容必须单测。`participating` 是过滤参数，不是该页 reason 枚举，不能编造 reason 值 |
| [CodeRabbit Triage](https://docs.coderabbit.ai/triage) | card 是投影、各信号可能异步刷新；review 信号对应被审 commit，新 push 后部分旧信号撤去 | proposal/input version 绑定与 stale 参考；不能将单一 updatedAt 当所有字段新鲜度 |
| [Hermes Inbox Triage](https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/email/email-email-inbox-triage) | 有界完整 thread、批准批次、apply/readback；SMTP 成功但 Sent 保存失败时盲重试可重复发信 | 操作步骤和丢 ACK 反例参考；readback 未能建立结果时 CW 保留 unknown，不强行二值归类成功/失败 |
| [OpenAI Guardrails and human review](https://developers.openai.com/api/docs/guides/agents/guardrails-approvals) | Agents SDK interruption 返回 resumable state；可序列化、批准或拒绝，再从同 state 继续；side-effect 校验靠近工具 | SDK 模式支持 handoff 的设计方向，不证明当前 Courtwork/Pi 能持久恢复。沿 AM-B，不引入新 SDK |
| [Gmail push](https://developers.google.com/workspace/gmail/api/guides/push) | watch 至少每7天续，建议每天；通知可迟到/丢失，应补 history.list；push 载荷提供 historyId | cursor/renew/reconciliation 分开；watch 通知不是完整消息，收到通知不代表已消费全部变化 |
| [Gmail sync](https://developers.google.com/workspace/gmail/api/guides/sync)（本轮补查） | 过期 startHistoryId 返回404，需要 full sync | 断档显式记录并重建受权范围快照；全量同步不能恢复未观察的全部历史事件 |

来源均按页面URL与观察日固定。需要采用代码时另固定源码版本、许可、依赖与退出条件；本包不以文档“成熟”推导所有 provider API 支持幂等、原子条件写或任意令牌。
