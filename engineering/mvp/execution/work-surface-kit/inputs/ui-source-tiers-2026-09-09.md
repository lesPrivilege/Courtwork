# 用户转交 · 来源分层与 Spectrum UI 定位（Exa 38 结果 / 4 检索方向，2026-09-09）

用户以两段消息转交，Fable 转录要点（链接未经 Fable 核验）。消费裁定见 [intake-round-3 §4aa WK-122](../intake-round-3.md)。

## 第一段：Spectrum UI 的价值
粒度是局部构件而非整页模板（Command Search / AI Chat Card / Recent Activity / Expandable Action Bar / Toast Stack / Tree Nav / Undo Pill / Hold to Confirm / Text States）；栈保守（shadcn/ui、Tailwind、Motion、Next.js），可"取局部，不引入整个世界"；以 MCP 作分发面，同时允许浏览与 copy-paste（人类浏览 index，agent 渐进消费实现）；最值得参考的是 micro-interaction vocabulary，可映射到 agent 的 pending / executing / reversible / committed / background activity。定位 Tier B：局部交互与 motion pattern source，不是 design system foundation；底层仍以 Radix / shadcn / Geist / APG 约束 token、可访问性与基础组件。首批：Command Search、AI Chat Card、Recent Activity、Expandable Action Bar、Tree Nav、Toast Stack、Undo Pill、Hold to Confirm、Text States、Skeleton Reveal、Metal Prompt Bar。

## 第二段：收敛后的四层来源
| 层 | 来源 | 消费什么 | 定位 |
|---|---|---|---|
| A · Semantic Contract | Linear Agent Interaction、GitHub Primer scenario patterns | session / activity / action / approval / error / recovery 的稳定语义 | 优先级最高 |
| B · Agent UI Anatomy | AI Elements（v6）、assistant-ui、21st Agent Elements | composer、tool、approval、queue、checkpoint、source、artifact 解剖 | 直接取型 |
| C · Micro-interaction donor | Spectrum UI、transitions.dev、beUI | motion、state morph、undo、compact action、loading / reveal | 局部移植 |
| D · Exploratory donor | Velora、Smithers UI、Nexus / Agents UI | 新出现的 agent-specific pattern | 只进候选池 |

Spectrum 下调到 C，不承担语义定义。首批定级：Undo Pill A（可逆变更 / 撤销窗口）、Text States A（Save → Saving… → Saved）、Toast Stack A-、Expandable Action Bar A-、Command Search A-、Recent Activity B+、Skeleton Reveal B、Hold to Confirm C / 谨慎（仅特殊 destructive）、AI Chat Card C（不作 composer 基线）。Primer："能 undo 就不要 confirmation"——低风险可恢复操作直接执行 + Undo，普通不可逆才 dialog，高 blast radius 才加摩擦；摩擦应来自 action schema 的 reversibility / blast radius / authority。

Linear 的 Agent Session：`pending → active → awaitingInput → complete`，另 `error / stale`；Activity 分 thought / action / elicitation / response / error，支持 ephemeral activity 与 evolving plan。建议 Courtwork 先建一个很薄的 UI semantic projection vocabulary（Run / Action / Mutation / Artifact 各自状态集），由 Event Log → governed semantic state → UI projection，不让几十套组件各有状态机。assistant-ui Approval 为 `request | running | done | denied` 并提供 Allow once / Always allow / Deny；AI Elements 有 Queue / Task / Plan / Checkpoint / Tool / FileTree / Terminal / Sources / PromptInput，shadcn 式 source ownership——upstream 是 donor 不是 runtime dependency。Spectrum 部分组件另有上游：Toast Stack / Expandable Action Bar → beUI；Skeleton Reveal / Text States → transitions.dev。索引格式升级为 **Semantic Contract → Interaction Pattern → Anatomy → Behavior Primitive → Motion Recipe → Local Adaptation**。
