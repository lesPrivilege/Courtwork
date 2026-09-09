# MyContext / Attention：同一讨论的增量消费

2026-09-09；基线`main@1226bad4bcfaa963c8f32210e20846045e7344c1`。这是既有TeamAI索引的追加输入，不重开多专家平台或Attention立项。

## 覆盖与追溯

[多专家架构分析](chatgpt-conversation://6aa14cb0-1718-83ec-a738-684f6137b6c2)目前完整返回4个turn、8条文本，无附件、无truncated标记，hasMore=false。此前2个turn的快照与核验保留原样。本轮新增：

| turn | 新内容 | 处置 |
|---|---|---|
| `191526f3-fb96-4630-801e-a6c06de056ea` | MyContext个人上下文、采集、vault、来源、包依赖与action边界 | 按工程机制消费，不继承“落后/上一代”的评级 |
| `f193d18d-0930-4dbe-9af2-69a714af068e` | Attention去重、延后、路由、打断策略及8个外部入口 | 并入既有ATT参考与反例，不冻结新schema或状态枚举 |

完整新快照仅保留个人项目private/sources的`teamai-expanded-conversation.md`：1338个换行、38015字节，SHA-256 `81e47428bae5e8dc85e68e0d02aa4aca832d8d17d37bb793ee9a776dd1e282af`。原2-turn快照仍为`teamai-conversation.md`，hash见[原索引](README.md)。新增MyContext回答的3个内部citation（turn335939search0/1、turn839285search0）无URL映射；Attention回答自述“Exa看24来源”无结果清单，不计为本轮已读24来源。

## 一手来源与限度

下列为本轮独立读取的页面；原文链接、替代来源、源码观察和实际运行分开，不恢复或继承旧检索。

| 原文入口 | 本轮核验 |
|---|---|
| [Slack原链接](https://slack.com/intl/en-gb/blog/news/slack-activity-triage-for-notifications) | 正文读取失败。另读[官方Activity帮助](https://slack.com/help/articles/46751260742035-Introducing-the-new-Activity-view-in-Slack)：统一来源、自定义视图、清除后可回看与键盘操作；[Today公告](https://slack.com/blog/news/today-daily-briefing)支持Today/Activity/Slackbot分工。不继承效率数字 |
| [Linear Triage](https://linear.app/docs/triage) | 核实accept/duplicate/decline/snooze，以及到期或新activity先发生者唤回。产品语义参考，不是Courtwork接受协议 |
| [Linear Priority inbox](https://linear.app/changelog/2026-09-03-priority-inbox) | 2026-09-03公告核实Priority/Other与可定制来源/过滤；不决定本仓导航 |
| [PagerDuty Event Management](https://support.pagerduty.com/main/docs/event-management) | 核实dedup_key及integration范围；抑制保留alert，但不创建incident或通知。不能外推“事件永存”或跨scope任意合并 |
| [incident.io](https://docs.incident.io/alerts/escalations-from-alerts) | 核实triage/active起始状态与条件升级；其规则不自动授予Courtwork动作权限 |
| [VekInbox](https://github.com/LatticeAG/VekInbox) | 仅默认分支README自述Postgres请求、幂等key、timeout/escalation、HMAC webhook与polling。未固定commit、未验实现/重放/恢复；不采纳“guaranteed delivery”为保证 |
| [AgentAbstain](https://arxiv.org/abs/2607.10059) | 仅v1摘要（2026-07-11）：263 paired任务、42 sandbox、17模型/4 harness、最佳59.5%为作者报告，paired要求两侧均正确。非Courtwork成功率或能力上限，未复跑 |
| [PRISM](https://arxiv.org/abs/2602.01532) | 仅v1摘要（2026-02-02）：按接受概率与误报/漏报成本决定介入，响应策略与介入gate解耦。未核完整p_need/p_accept公式；论文acceptance不是授权或Core accept |

MyContext原文无明文仓库地址。本轮找到叙事/架构吻合的[openTrinity/mycontext](https://github.com/openTrinity/mycontext)，固定`23c6f609fb1d392f922e19dae7bee174075a2569`；这是匹配推断，不凭命名确认“阿里来源”，不与同名mycontext-ai混用。只读[README](https://github.com/openTrinity/mycontext/blob/23c6f609fb1d392f922e19dae7bee174075a2569/README.md)、[ESLint配置](https://github.com/openTrinity/mycontext/blob/23c6f609fb1d392f922e19dae7bee174075a2569/eslint.config.mjs)及[分层测试源码](https://github.com/openTrinity/mycontext/blob/23c6f609fb1d392f922e19dae7bee174075a2569/tests/unit/eslint-layering.test.ts)。README说明本地SQLite、增量采集、来源回看与受控AI消费；未审全部store/权限/connector实现。

配置有分层import限制和构造违规import的负例测试，值得借鉴。但严格树状分层注释不是全范围保证：测试明确允许persona引用retrieval，persona/search禁令不能概括为同层一律不可见。未安装依赖或执行lint；只取针对实际owner的窄断言，不照抄包层次。完整checkout因大量vendor产物停止，随后从固定Git对象定向读文件，没有执行上游脚本。

核验源码SHA-256：

| 固定SHA内路径 | SHA-256 |
|---|---|
| `README.md` | `0d16581841cbed00e629ebce2d06c885fd8f674aafa85e880d07ff74ce85f12c` |
| `eslint.config.mjs` | `1f5fab81b2d17d304b11cb28deb19ae0522c1be96cae9579a78a3e5b902cfe09` |
| `tests/unit/eslint-layering.test.ts` | `911c1c691ea2a255db92bf653423dc1900df1e1eb2702c9dfc830cdd638366c5` |

## Astra裁决与后续消费者

| 机制 | 既有归属与首个反例 |
|---|---|
| 增量checkpoint、来源回看 | 沿[LG](../local-governance-2026-09-09/README.md)的只读Intake/source revision；重试不得跳过未发布资料，撤回后缓存不应继续披露 |
| 依赖规则与负例 | 沿[AM](../architecture-maintenance-2026-09-09/pr-plan.md)按实际owner约束；错误import应失败、合法依赖应通过。AM-C出站golden不证明包依赖或完整兼容 |
| friction / conflict / blocked候选 | 沿[ATT-BE-01](../attention-2026-09-09/courtwork-pr-plan.md)既有Core owner；探测、Attention维护、Matter决定分别成立。不从错误计数自动生成learning/resolve，不建第二Attention Store |
| dedup / correlation / suppression | 同来源身份/scope的重复可去重；跨Matter/权限域不能仅凭相似文本合并。分组保留来源版本与可拆关系；抑制不删除决定，保留由policy规定 |
| snooze与唤回 | 复用snooze/resume候选合同，后续明确条件与revision；到期/来源变更/撤权/resolve竞争时迟到timer不得复活对象。本轮不启动scheduler |
| need / timing / recipient / burden | 分清是否需判断、提示时机、处理权限与打断成本。低评分不能绕过许可，高评分不能授权执行；既有policy内维护不新增人工门 |
| 已阅/清除/批量与详情 | 沿[ATT-FE截图交接](../../design/attention-surface-2026-09-09/README.md)常驻入口/独立工作面；清除提醒不等于resolve。批量需逐对象权限/revision/结果，不由一张卡合并批准 |

原文“Context根本不该保存”收窄为：持久来源、治理状态、检索索引和编译输入须区分authority。保存确切Context快照用于审计/续行可以成立，但不能替代当前正式状态或绕过撤权。个人域、Matter与跨Matter Attention可并存，不强迫所有工作围绕单一中心。

Approval可在Attention工作面呈现，但仍引用既有permission/typed action的确切请求，不把权限记录迁到通用Attention状态机。原文candidate/queued/claimed等枚举只作比较，不能静默替换ATT合同。Attention可与Task关联，不把概念区分解释为禁止引用。

当前`app/server/work-metrics.mjs`仅统计保留Run，`work-summary.mjs`是投影，均不是Attention权威对象。BE metrics/AM-C已交付不等于ATT-BE已实现。按[Chat Space边界](../chat-space-2026-09-09/README.md)保持回答、许可、执行、接受分开。本单不派后端/前端任务，不改Paper、FE队列或G1–G5。

## 验证

Astra完整读取新turn并核对上述一手页面/有限源码，作本地消费裁决；检查快照hash、历史记录保留、相对路径与diff。仅文档交付，未运行产品、上游测试、模型或浏览器；不将网页评级、原检索数、论文结果或README提升为本项目验收。
