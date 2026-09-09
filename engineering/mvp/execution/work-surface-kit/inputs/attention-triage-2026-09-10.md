# 输入登记：Attention triage grammar（Sonnet explore，2026-09-10）

用户 2026-09-10 转交的一份 Sonnet explore 报告，自述「更深一轮后用 Exa 看了 **56 个结果、5 条 workstream**」，随附指令「认领 attention assistant 的设计，包括后端架构，和前端 UX」。本页按用户提供的字节转录要点与全部显式链接，供裁定引用；**报告的搜索覆盖、成熟度与性能主张不继承为本项目结果**（沿 WK-135 / WK-149 的来源规则）。

自述的结果数与 workstream 数无法从粘贴文本复核，只登记为上游研究者的自述。八条外部主张的一手核验由 [EX-AT1](../explore/ex-at1-attention-triage.md) 执行；核验前不得用于支撑任何裁定。

与 2026-09-09 已消费的 [attention-human-loop](../../../../research/attention-human-loop-2026-09-09/README.md) 输入（Email/GitHub human decision queue，自述 6 workstream / 约 58 结果）是**同一研究线的后一轮**，不是新方向。

## 主张摘要（逐条编号，供裁定引用）

| 编号 | 报告主张 |
|---|---|
| R-1 | Attention 不应是把 Email 与 GitHub 混在一起的 feed，而应是稳定的「人类注意力收件箱」：统一治理为什么需要我、何时需要我、Agent 已经做了什么；执行时保留各源原生工作语义 |
| R-2 | recall ≠ triage（Slack Activity 2.0 的经验）；用户在 Keep / Move / Read / Skim 之间切换，因此需要 dense/detailed 两档密度、saved views、bulk actions、keyboard flow |
| R-3 | 冻结三条彼此独立的状态轴：`source_state`（原系统事实）/ `attention_state`（人类注意力状态）/ `proposal_state`（Agent 工作状态：none / prepared / needs-review / approved / executed / stale / failed） |
| R-4 | `unread` 只是 presentation signal，不等于「尚未处理」；GitHub 的 read / done / saved / unsubscribe 本来就分开；Superhuman 把 Inbox 当作仍需 action 的 task list |
| R-5 | 永远显示 **why am I seeing this**（GitHub 的 `reason:review-requested / mention / ci-activity`），而不是一个不透明的 AI priority |
| R-6 | GitHub 的核心对象应是 **PR work queue** 而不是 notification（Graphite PR Inbox 的 Needs your review / Returned to you / Waiting / Drafts / Merged） |
| R-7 | 键盘（J/K、snooze、快速搜索）与 contextual toolbar 应是一级能力（Linear Inbox） |
| R-8 | Email 应支持 batching / time-boxing / source grouping（Shortwave 的 Splits、Bundles、delivery schedule），不要所有邮件即时争 attention |
| R-9 | Email 的 attention semantics 已相当稳定，可直接借用而非造词（Superhuman 的 Respond / Waiting / FYI / Notifications；Auto Draft 不自动发送） |
| R-10 | `prepare → review → execute` 应成为通用 Agent UX；敏感 send 默认需批准（Superhuman MCP） |
| R-11 | **最值得收编的一笔**：Gobii review-before-send 是真正的状态机（Needs review → Sending → Failed → Recent）；draft 排队后原 conversation 变化则标记 **Conversation changed**，不能悄悄批准旧版本；recipient 变化要求重新生成 |
| R-12 | 批准应绑定确切版本：Email = `thread_id + source message version + exact draft snapshot`；GitHub = `PR id + head SHA + review proposal + check snapshot`；PR 在准备完 review 后又 push 则 proposal 自动 `stale` |
| R-13 | 顶层不做 `Email | GitHub` 两个大 Tab，而是 `Priority · Inbox · Waiting · Later · Done`，把 Email / GitHub 降为 filter / saved view |
| R-14 | 行不能统一成同一种 notification card：row renderer 应 source-aware（Email 突出 Respond / Waiting / FYI、联系人、thread；GitHub 突出 Review requested / Mention / CI failed / Returned to you、repo/PR、review/CI 状态）；只有外围 grammar 共用（Done / Later / Save / Mute-Unsubscribe / Open source） |
| R-15 | 选中后进入 source-native detail：Email 是 thread + attachments + reply；GitHub 是 PR intent + commits/diff + checks + review threads |
| R-16 | Agent 不占据第三种聊天窗口，而是作为 **proposal layer** 附着在当前对象上（Summary / Why this needs you / What changed since last seen / Proposed action + Review exact draft·diff / Edit / Approve / Deny，页脚 sources · policy · model）；人的主要动作是判定、修订、授权，追问时才进入 conversation |
| R-17 | 用户所示参考图只消费一半：极低噪音 inbox、很紧的 chrome、模型运行状态做成一条 instrument strip 而非大块 Agent 卡片，适合作视觉选型；但该设计师的作品属 design reference，不是成熟行为证据 |
| R-18 | 反对把 `Opus / GPT + usage bars` 放在 inbox 最高信息层级；model / reasoning effort / context / cache hit / **TPS** 应降一级：平时折叠成极薄 Runtime Inspector，Agent 工作时展开成 live instrumentation；TPS 适合活跃执行态，静态 triage 时常驻会抢掉 attention hierarchy |
| R-19 | Email + GitHub 适合作第一组 dogfood，因为覆盖两个极端：Email 是 communication / obligation queue，GitHub 是 structured review / blocking queue；两类都能用同一 attention grammar 而不损坏各自原生语义，这一层才具备推广到 Slack / calendar / approval / agent completion / 跨 Matter attention 的资格 |

## 显式链接（原样保留，核验见 EX-AT1）

- https://slack.design/articles/no-small-task-evolving-the-way-millions-catch-up-in-slack/
- https://docs.github.com/en/subscriptions-and-notifications/how-tos/viewing-and-triaging-notifications/managing-notifications-from-your-inbox
- https://docs.github.com/en/enterprise-cloud@latest/subscriptions-and-notifications/tutorials/customizing-a-workflow-for-triaging-your-notifications
- https://graphite-58cc94ce.mintlify.dev/docs/use-pr-inbox
- https://graphite.com/docs/review-pull-requests
- https://linear.app/docs/inbox
- https://www.shortwave.com/docs/guides/customize-your-shortwave-settings/
- https://help.superhuman.com/hc/en-us/articles/46005854346893-Email-Assistant-by-Superhuman-Mail-Gmail
- https://superhuman.com/mail/features/email-mcp
- https://github.com/gobii-ai/gobii-platform/blob/main/docs/content/using-gobii/review-before-send.mdx

## 报告未提供的

真实账户、真实邮件/通知内容、任何一次真实人类决策样本、任何一次真实外发。报告里的截图评述（R-17 / R-18）指向用户此前提供的一张设计图，本轮未重新提供该图，只沿文字观察，不称本轮重看。
