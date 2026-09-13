# Attention 定位与多视图 · 增量消费

2026-09-13 · Astra。接单本地 main `7852882fda9eb5eade49a482059978c22abceae5`。本片消费用户再次引用的“信息架构收敛 Auditing”新增一轮，接续 [IA 计划](ia-plan.md)，不重开已交付 IA-0…5。

## 来源与实际增量

重新读取对话 `6aa650b4-361c-83ec-a2ae-d72162a6fa5c`，返回两轮、无更多页。新增 turn `e257ec5b-0b83-486b-8a85-176dfc5a4e36` 讨论 Attention 与 Tasktori 多视图。完整返回留在 [attention-source.json](attention-source.json)，附件 [Tasktori 参考图](evidence/42-tasktori-reference.png) 已打开检查：同一 Tasks 下有 Overview / Lists / Board / Timeline / Files，当前显示状态分栏。图片只证明参考布局，不证明其产品行为或 Courtwork 能力。旧 ia-source.json 原字节保留；其中“无附件”仅指旧读取时点。

源对话自述 Exa 88 个结果未逐条复现。本片独立核验三个官方来源：

- [Linear Board layout](https://linear.app/docs/board-layout)：FAQ 明确 Inbox/Triage 不提供 Board；支持因任务而选择布局，不构成所有 triage 产品禁止 Board 的普遍规则。
- [Notion views](https://www.notion.com/help/views-filters-and-sorts)：同一数据库可以切换多视图，Board 按属性分组、Calendar 按日期属性呈现。采用对象和视图分离，不导入通用数据库架构。
- [PagerDuty Incidents](https://support.pagerduty.com/main/docs/incidents)：acknowledge 表示认领处置且尚未解决。它与 Courtwork 同名动作含义不同，不能直接移植。Slack/Sentry/Asana/Intercom/GitHub 的其余主张保留为来源候选，本片不以未重查内容作裁决依据。

## Astra 采用与修订

| 输入 | 采用范围与现有事实 | 后续边界 |
|---|---|---|
| Attention 为人类介入/分诊层 | Core Attention item 保留独立身份与生命周期；源对象、Run、Matter 与 Attention 各自有 owner。读取、运行完成、resolve 均不代替外部效果授权或正式工作接受 | “Signal → Attention → Work”是概念关系，不是每个 signal 自动创建 item、每个 item 自动创建 Work 的流水线；全局 Attention 助手角色也不被删去 |
| 列表扫描、详情判断 | `app/web/attention-view.mjs` 已采用最小 registry、按需 inspect、Why/Next step、Recorded context 与广告动作；五状态＋All 查询已经实现 | 不重复施工；不将来源内容塞回最小 registry，也不凭空补 PR/邮件来源标签 |
| 对象集合 → 查询 → 投影 → grammar | 沿既有 presentation adapters 与各面 query/snapshot，统一审阅维度：scope、filter、grouping、ordering、density、visible fields、open/return behavior | 这是设计检查项，不新增通用 View DTO、持久化引擎或客户端跨分页排序；saved views/density 仍是后续范围 |
| Inbox / State / Time | 事项面维持 List–Detail；现有状态按钮是服务端查询，不是新状态或多个产品入口 | 不新增同义 Inbox tab。Board/Time 仅候选；即使有五状态，也须说明横向比较任务与完整分组/分页口径。拖拽还需映射合法动作、revision、payload、回执和失败恢复 |
| due / snooze / resurfacing | 现有 next_action.due_at 与 Later 表达记录的时间/意图 | 记录时间不是 scheduler；不能据此显示“即将自动回来”、倒计时或自动 resurfaced。Time view 还缺日期查询/覆盖合同，不从 updated_at 画规划 Timeline |
| seen / acknowledged / resolved | 本地 acknowledge 只置 seen=true，status 不变；resolve 需人类 reason。保留五状态和独立 seen | 修订来源的 seen ≠ acknowledged：Courtwork 中 acknowledge 是标为 seen 的动作，不是独立认领状态；不新增 acknowledged 状态 |
| Overview 克制 | 只呈现帮助选择下一项的、同 scope 且覆盖明确的事实；沿 Home 摘要 owner | 当前页长度不能冒充全局 Needs you 总数；不新增 resolve rate、SLA、热力图或未拥有的 overdue 指标 |

## 最近实现、合同与证据

最近先例为 [attention-view.mjs](../../../app/web/attention-view.mjs)（文件头、VIEWS、ACTION_WORDS、详情和 recorded disclosure）、[presentation-adapters.mjs](../../../app/web/presentation-adapters.mjs)。对象/动作/查询以 [Core Attention 合同](../../../docs/work-core/attention.md) 与 [词表 §6](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) 为准；全局对话角色见 [Attention agent](../../../app/docs/attention-agent.md)。

[WO-ATT-FE01 执行回执](../../mvp/execution/work-surface-kit/work-orders/WO-ATT-FE01.md)已记录切片 d 合流 `055cffc`；[Luna 独立证据](../../../evidence/delivery-rollup-20260910/attention/independent-verification.md)记录候选 `1097fd4` 的浏览器 116 断言及定向 29/29。它们是历史固定候选证据，本轮不冒称重跑。活动 precedent 索引仍写“只读/typed actions待做”，本片据回执修正；原历史设计稿不改写。

## 后续消费顺序

1. 已有 List–Detail / 五状态 / typed actions 作为当前先例；新改动沿既有 IA 与 WO-ATT-FE01 验证返回焦点、CAS、未知回执、窄屏与披露。
2. 来源识别和 source-native detail 接原 HL-A0；proposal/外部效果批准接 HL-A1；不把外部源状态或批准权写成 Attention 状态。
3. 若后续施工 saved view、density、Board 或 Time，先在原 Attention 工单明确用户任务、query/分页/排序/日期覆盖与持久化归属，再做 specimen 与独立验证。没有新增生产控件的实施声明。

本轮交付是来源归档、语义采用和活动索引修正。无产品源码/视觉变化，不跑产品测试或浏览器回归；无外部调用效果、push 或部署。检查仅覆盖文档链接、差异与源文件身份。

来源 SHA-256：JSON `6287a169a2fcb8efc5eeb0c55675ce261b10605e6f38a89e708c09d8e4dd97f0`；PNG `3cc2ae190e090ebdf84e073a68771be16c91d685e16454b084bee0379fb5abff`。

验证结果：`node tools/check-doc-links.mjs` 通过（1188 份文档、6144 个链接）；`git merge-base --is-ancestor 055cffc HEAD` 通过，确认上述交付在接单main谱系内；暂存差异检查通过。
