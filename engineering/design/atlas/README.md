# Local UI Atlas · 局部行为索引

WK-118（2026-09-09）设立。按用户看到的**局部语义**组织，每个 entry 四层：behavior contract → state board → reference implementations → visual adaptations。前两层的正式所在是 [primitive-canon](../../mvp/execution/work-surface-kit/contracts/primitive-canon.md)（FE-04，§2 映射 + §3 状态矩阵）与 [review-projection](../../mvp/execution/work-surface-kit/contracts/review-projection.md) §6；第三层引用 [EX-WK8 台账](../../mvp/execution/work-surface-kit/explore/ex-wk8-primitive-ledger.md) 与 [Local UI Atlas 输入](../../mvp/execution/work-surface-kit/inputs/local-ui-atlas-2026-09-09.md)（链接未经 Fable 核验）；第四层归 FE-05 材质与光。本页只做索引，不复制内容；一个 entry 有实体前不建目录。

| entry | behavior contract / state board | reference implementations | visual adaptations | 状态 |
|---|---|---|---|---|
| composer | canon §2.2 / §3.2（Enter / Shift+Enter / IME；Send→Sending…；cancel requested ≠ stopped） | assistant-ui Composer（REUSE 行为）；AI Elements PromptInput（信息编排） | FE-05 | 已对齐；`/` `@` 同一 trigger 体系、attachment staging 为候选（无后端 attachment 契约前不做） |
| tab-chrome | CC-W 工单（WO-CC-round5 §CC-W）：四类型 tab + 一个文档 tab；关闭 / 邻近 / 焦点归还 | chromium-tabs、Atuin Tabs、Termany HTabBar（行为模型：drag threshold、suppress click after drag、undo close、active scrollIntoView、纵滚转横滚）；S12 frontier 桌面端（每 tab 关闭区 + 末尾 +，与内容面共享顶部 chrome） | FE-05 | 第一段单文档；keep-alive / LRU / pin / group 等 BE-2 多实例后 |
| button | canon §3（loading 保持焦点；`Sending…` 换词）；WK-118 补：loading 保持宽度（M-9） | Primer / Base UI / React Aria 状态集 | FE-05 | inactive-with-explanation 未裁 |
| popover-inspector | WK-119：只做轻详情、click / focus 触发、单点互斥状态、`connection-popover` 为种子、"Open in surface" 不钉住（[EX-CC3](../../mvp/execution/work-surface-kit/explore/ex-cc3-popover-inspector.md)） | Base UI Popover（多 trigger 共用 popup、随锚点迁移）；本地先例：单例 tooltip 的 generation 竞态保护；S12 frontier 桌面端（文件卡 hover 局部动作而非常驻按钮） | WK-101 transient 材质，FE-05 消融后 | 工单 CC-I 骨架已写（FE-05 后，`opus-wo-medium`） |
| command | 现有 `/` 聚焦 Settings 搜索（WK-78）；无全局命令面 | cmdk 分工：dialog = 全局命令，popover = 局部选择 | — | 未立项 |
| heatmap | CC-D0-b（BE-1/3/25：值域、zero ≠ no-data、bucket、时区） | SVG / CSS grid，不引 chart lib | FE-05 | 待后端 |
| toast | 现有 `showToast`（app.mjs）；分工：短暂结果 → toast，须决策 → inline approval | Sonner 的行为笔记（堆叠纵深、hidden 暂停计时、promise 原地变态）——**只取行为，不引库**（原生 ES module，无 React） | FE-05 | 候选：hidden 暂停计时、loading→result 原地 |
| tool-card | canon §2.4 / §3.4；`Unknown` 第六词（WK-115 ①） | assistant-ui Tool UI / AI Elements tool.tsx 状态机 | FE-05 | partial args streaming 待 runtime 事件 |
| approval | canon §2.5 / §3.5；review-projection §6 | assistant-ui Approval Card（**Always allow 不采纳**：策略级放行属 runtime 控制面） | FE-05 | 已对齐 |
| process-trace | canon §2.8 / §3.8；三层披露待 BE-32 事件时间 | assistant-ui Reasoning Panel 作为 process 视觉范式，不绑 CoT 展示；S12 Codex Review 面（轮次选择 + 计数 + 逐文件折叠，与聊天并列） | FE-05 | 待后端 |

附：Astra [chat-space 研究索引](../../research/chat-space-2026-09-09/README.md)（main `5ea5ff0`）的 CS-01…10 只作设计检查表，不替换现有消息 / question / permission / run / File / Artifact / Core 对象；Markdown 是显示能力，先评估复用 marked + DOMPurify；回答、授权、执行、接受分别成立；下载绑定确切成果。队列不变。
