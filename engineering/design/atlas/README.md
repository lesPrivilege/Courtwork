# Local UI Atlas · 局部行为索引

WK-118 设立，WK-122 升级为六级格式：**Semantic Contract → Interaction Pattern → Anatomy → Behavior Primitive → Motion Recipe → Local Adaptation**。来源分四层（A 语义契约 / B 解剖 / C 微交互 donor / D 探索池，见 [inputs/ui-source-tiers](../../mvp/execution/work-surface-kit/inputs/ui-source-tiers-2026-09-09.md)）。语义契约的正式所在是 [ui-state-vocabulary](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md)（映射后端已有状态）、[primitive-canon](../../mvp/execution/work-surface-kit/contracts/primitive-canon.md) 与 [review-projection](../../mvp/execution/work-surface-kit/contracts/review-projection.md) §6；A 层外部来源（Linear、Primer）只用来检查语义齐全，不替代 Core owner。upstream 是 donor 不是 runtime dependency：一律本地实现（原生 ES module），不引 React / Tailwind / Motion。本页只做索引，不复制内容；一个 entry 有实体前不建子目录。链接未经 Fable 核验。

| entry | 1 semantic contract | 2 interaction pattern | 3 anatomy（B 层） | 4 behavior primitive | 5 motion recipe（C 层，只取行为） | 6 local adaptation / 状态 |
|---|---|---|---|---|---|---|
| composer | Run 词表 §1；在途 `Sending…` | 发送 / 取消原位变态；禁止发送时仍可输入 | assistant-ui Composer；AI Elements PromptInput | Enter / Shift+Enter / IME 三路（已对齐） | Text States（transitions.dev 上游）——已是 `requestLabel` | 已对齐；`/` `@` 同一 trigger、attachment 待契约 |
| tab-chrome | Work surface（canon §2.10）；单文档（BE-2 前） | tab 是状态容器；关闭回目录、焦点归还 | AI Elements FileTree / Sources 只作参照 | WAI-ARIA tablist（现有）；S12 frontier 结构 | chromium-tabs / Atuin / Termany 行为模型 | CC-W 施工中 |
| button | 在途 = 第三类事实（FN-19） | loading 保持宽度与焦点（M-9）；inactive 可解释（未裁） | Primer Button 状态集 | Base UI / React Aria 语义 | Text States morph | CC-W 第 0 项 |
| popover-inspector | 只读 / 可操作两种 payload（WK-119） | 同一浮层随锚点迁移；click / focus 触发 | — | Base UI Popover（多 trigger）；本地 tooltip generation 先例 | Expandable Action Bar（beUI 上游）作局部动作 chrome 参照 | CC-I 骨架（FE-05 后） |
| command | 无全局命令面（`/` 只聚焦搜索） | dialog = 全局命令；popover = 局部选择；渐进披露 | cmdk；Spectrum Command Search（A-） | 键盘 first、group + shortcut | — | 未立项 |
| heatmap | BE-1/3/25：值域、zero ≠ no-data、bucket、时区 | 单格 → 当日 drill-down | Spectrum Recent Activity（B+）作 dashboard 摘要参照 | SVG / CSS grid，每格 accessible name | Skeleton Reveal 只作 hydration 参照 | CC-D0-b 待后端 |
| toast | 短暂结果，不承载决策（FN-26 分工） | loading → success / error 原位；hidden 暂停计时 | — | 现有 `showToast` | Toast Stack（beUI 上游）；Sonner 笔记 | 候选，不引库 |
| tool-card | Run / 工具行词表 §1；`Unknown` 第六词 | pending → running → completed / failed / cancelled / unknown | assistant-ui Tool UI；AI Elements Tool | `<details>` 原位展开（现有） | — | 已对齐；partial args 待 runtime 事件 |
| approval | Question / Permission 词表 §2；**无 Always allow** | 同一张卡原位变化；批准后成为回执行 | assistant-ui Approval Card（不含 Always allow） | 焦点与 alert（FE-04） | — | 已对齐 |
| process-trace | 事件流；时间线待 BE-32 | collapsed → timeline → raw 三层 | assistant-ui Reasoning Panel（process 范式）；S12 Codex Review 面 | — | Skeleton Reveal 不用于 trace | 待后端 |
| reversible-action | **无契约**（词表 §4；候选 BE-34 可逆窗口） | 能 undo 就不要 confirmation（Primer）；摩擦来自 reversibility / blast radius / authority | — | — | Undo Pill（A，仅 motion 参照）；Hold to Confirm 只限特殊 destructive，SE 今日无 | 候选，等后端 |

附：Astra [chat-space 研究索引](../../research/chat-space-2026-09-09/README.md)（main `5ea5ff0`）的 CS-01…10 只作设计检查表，不替换现有消息 / question / permission / run / File / Artifact / Core 对象；Markdown 是显示能力，先评估复用 marked + DOMPurify；回答、授权、执行、接受分别成立；下载绑定确切成果。队列不变。
