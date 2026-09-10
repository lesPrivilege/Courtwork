# 前后端合流评审实践 · Micro-surface review输入

Luna fast已返回[Rename真实接缝与候选验收单](luna-consumption.md)：已有Session PATCH与持久化，不是local-only；optimistic/CAS没有现成合同，不默认引入。外部来源核验尚未交付，未改变其核验等级。

用户授权入账并立即派Luna fast消费。来源对话当前标题[前后端合流评审实践](chatgpt-conversation://6aa2d0e5-665c-83ec-a0cd-72bfc9ee3f4a)，用户链接原标签New chat。成功读取1个completed turn、2条消息，无附件，hasMore=false、nextCursor=null；[完整原文](inputs/conversation.json)保留。原答“48候选/5方向/8来源”仅其自述，本地不据此宣称核验过8来源。

## 处置与立即消费范围

| ID | 研究建议 | 本地消费边界 |
|---|---|---|
| MSR-01 | Semantic/Interaction/Provider/Visual/Context五层review | 作为已有前端连续性合同的检查增量，Provider此处解释为后端动作契约，不混淆模型provider |
| MSR-02 | Rename inline edit及read/edit/validating/pending/committed/cancel/error状态 | 先查现有rename入口/合同，不将所有rename强行改成inline，也不把建议当已建立canonical specimen |
| MSR-03 | 默认optimistic、rollback/reconcile | 不接受无条件乐观更新；先核并发/乱序/失败与服务端canonical值，必要时保持pending后确认 |
| MSR-04 | page integration为主、少量E2E和视觉对照 | 复用本仓现有测试方式，不因外部React/MSW/Storybook实践引入依赖；真实smoke优先本地HTTP，不默认付费模型 |
| MSR-05 | Inline Mutation/Card Action状态板复用 | 先选择一个已有后端动作作候选，不给pin/archive/delete等不存在能力画可用入口；危险动作不能仅因UI小就低风险 |
| MSR-06 | L0–L3风险分流 | 候选分类；持久rename归mutation，跨面与数据/权限风险可叠加，不视为单一线性等级；文案改变权限含义也需合同审查 |
| MSR-07 | 用户可观察行为、role/label优先 | 与现有键盘/焦点/错误/数据守恒验证结合；几何检查仍用于有明确布局不变量的项目 |
| MSR-08 | 新review lane先Rename reference implementation | 用户此轮授权Luna探索消费，不自动授权实现。先交真实源码/缺口/候选小工单，根裁决后沿Claude单writer实施 |

## Luna fast 已派的有界任务

核对实际main/候选分支中rename入口、HTTP/validation/返回值/并发与现有测试，查最近canonical precedent及EX-IC2重叠；给状态矩阵、5–8反例、最小review模板与候选工单owner/允许路径。只读核验最相关2–3个官方来源，分列全文/失败/未核；不重新做宽泛研究，不改产品、不合main/push。实际结果返回后另行登记，不预称已完成。

挂接[现有前端连续性入口](../../design/agent-interface-2026-09-10/README.md)及[下一轮准备](../../execution/2026-09-10-next-round/README.md)，不建第二套grammar、不改变summary D1/D2→CI/CS→EX-IC2 C顺序。
