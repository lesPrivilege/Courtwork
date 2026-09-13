# Attention UI 内外参考索引

输入基线 `main@6e211bd5f5169a603bc801024d16f87eec16a071`。读法：owner/合同定语义，代码定当前投影与控制，固定证据定历史实际检查，外部参考只提供结构关系。任何参考都不自动成为Courtwork能力或新视觉golden。

## 内部索引

| 参考 | 消费什么 | 不从中推导什么 |
|---|---|---|
| [AGENTS](../../../AGENTS.md)、[current](../../current.md)、[前端合同](../agent-interface-2026-09-10/frontend-contract.md) | 当前main、单一owner、L1/L2/L3信息预算；本单由作者绘制、Astra独立裁决 | 工作区或截图的旧状态；独立验收/发布授权 |
| [precedent-map](../agent-interface-2026-09-10/precedent-map.md)（`attention.triage`, `home.composition`）、[precedents](../agent-interface-2026-09-10/precedents.md) | 从实际Attention与Home实现起步；按钮/披露/返回沿本地 grammar | 旧索引所载“只读/typed actions未交付”；以当前文件/回执为准 |
| [UI composition](../ui-composition-standard.md) §信息预算、[copy-convention](../copy-convention.md) §3.8/IA标记 | 默认层先回答对象、状态、关键事实、下一动作；动作词与文本用途可逐项核对 | 僵硬字段黑名单；把工程进度号作为产品文案 |
| [Core Attention contract](../../../docs/work-core/attention.md)、[词表 §6](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md) | 五状态、最小registry、detail/source/relation/grant、typed actions、due/seen/CAS | 浏览器按钮授予authority；外部ref可被抓取；resolve影响Matter/外部系统 |
| [Attention workspace](../../../app/web/attention-view.mjs)、[presentation adapters](../../../app/web/presentation-adapters.mjs) | 当前六视图、行字段、详情披露、动作识别/表单/错误与焦点符号 | 未识别 schema 的通用表单；当前服务端顺序之外的稳定排序 |
| [Home view](../../../app/web/home-view.mjs)、[app navigation/focus](../../../app/web/app.mjs) | 模块只读预览、Home→事项面选中与返回焦点的真实路径 | Home计数是Attention服务之外的统计；重复处置控件 |
| [Attention agent implementation](../../../app/web/attention-agent-view.mjs)、[agent product contract](../../../app/docs/attention-agent.md)、[agent design](../attention-agent-2026-09-10/README.md) | 独立 global assistant、native dialog、关闭保留Run/恢复焦点、不同对话有独立身份 | 点Open Attention就绑定当前item；重新设计Runtime或授权 |
| [WO-ATT-FE01](../../mvp/execution/work-surface-kit/work-orders/WO-ATT-FE01.md)、[当前消费裁定](../frontend-audit-2026-09-13/attention-consumption.md) | typed actions已实现；来源/外部效果仍沿HL-A0/A1；Board/Time/saved views仍为候选 | 历史[triage设计稿](../attention-triage-2026-09-10/README.md)中的旧只读结论；它用于追溯决策，不覆盖当前裁定 |
| [IA plan](../frontend-audit-2026-09-13/ia-plan.md)、[IA delivery](../frontend-audit-2026-09-13/ia-delivery.md) | 已通过的Home/Attention文案收敛和邻接页面检查 | 将IA交付记录误当成这次设计的视觉接受 |
| [HL work orders](../../research/attention-human-loop-2026-09-09/work-orders.md) | 来源识别HL-A0、proposal/外部效果批准HL-A1的owner缺口 | 本单补造source-native detail、proposal或外部批准流程 |
| [Atlas Motion](../atlas/README.md) §Motion、[Scout](../scout/README.md) | 可从60fps / transitions donor取动作行为与时序描述；reduced-motion降级；本地motion仍须提案 | 复制录屏/动效资产；引入库；误称已有Attention motion specimen |

## 固定实现与证据

- 当前视觉/源码比较以 main 固定包为准；历史独立 Attention 行为复核：[Luna回执](../../../evidence/delivery-rollup-20260910/attention/independent-verification.md)、[浏览器断言](../../../evidence/delivery-rollup-20260910/attention/independent-browser-verification.json)。它覆盖五状态、All+五筛选、动作/CAS/未知结果、键盘、390与明暗，但运行在旧固定候选，不是当前HEAD新验收。
- [Attention截图集](../../../evidence/delivery-rollup-20260910/attention/screenshots/all-1440-light.png)、[窄屏选中详情](../../../evidence/delivery-rollup-20260910/attention/screenshots/detail-390-light.png)是历史结构参照；其他dark/list/unavailable文件在同目录。近期Home/Attention基线画面另见 [semantic polish 记录](../../../evidence/semantic-polish-20260911/README.md) `baseline/08-attention-1440.jpg`、`baseline/09-attention-item-1440.jpg`。
- [SK-3独立复核](../../../evidence/dystopia-sk3-20260910/README.md)含Slate/Dystopia × light/dark × 1440/1280/390 Home/Attention画面与范围说明；只借当前布局/层级线索，不要求复刻skin或将历史截图当本轮视觉通过。

## 外部参考（仅结构关系）

| 来源 | 可消费的关系 | Courtwork 不照搬 |
|---|---|---|
| 用户提供的 [Tasktori截图](../frontend-audit-2026-09-13/evidence/42-tasktori-reference.png)（[原始消费记录与SHA](../frontend-audit-2026-09-13/attention-consumption.md)） | 同一Tasks对象可从Overview/Lists/Board/Timeline/Files切换；Board列按状态分组，卡片保留对象标题和少量元信息 | 产品品牌、To Do/In Progress/In Review/Done词表、priority/due/assignee字段、拖动语义、Files能力。图是静态画面，不证明服务/权限行为。 |
| [Linear Board layout](https://linear.app/docs/board-layout) | 结构因任务而定；List与Board共享对象/排序，卡片细节可另行打开；官方说明Triage/Inbox等不同工作流可无Board | 将其“多数views支持Board”推广成所有队列必须/禁止Board；状态顺序、拖动、键盘快捷键及字段合同 |
| [Notion database views](https://www.notion.com/help/views-filters-and-sorts) | 同一集合可以有不同呈现；Board需要分组属性，Timeline/Calendar需要真实日期属性；各视图可有自己的过滤/排序 | Notion数据库、saved-view偏好和任意layout配置。本地对象/查询/分页owner不变；候选视图须先证明数据覆盖。 |
| [PagerDuty Incidents](https://support.pagerduty.com/main/docs/incidents) | 作为动作命名反例：PagerDuty的acknowledge意味着认领处置并暂停升级，解决另有状态 | 其同名含义不能移植。Courtwork `acknowledge` 只置`seen=true`，状态不变。 |
| [原对话X链接](https://x.com/alswl/status/2098812199578005644?s=46) | 仅作为用户研究输入入口；转录与附件按上列固定来源读取 | 不把无法独立恢复的帖子正文当已核验依据；外部主张以上述官方页面及仓库合同为准。 |

## 需分开的探索

Tasktori/Linear/Notion支持“对象与视图可分开思考”，不意味着Courtwork已接Board/Time。若Claude附图，须放独立候选并列出需要的查询、日期/分组/覆盖、动作及返回焦点合同。Context window与TPS资料转 [Astra串行片](astra-context-tps.md)，不进入本次Claude包的设计范围。
