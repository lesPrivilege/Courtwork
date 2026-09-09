# 用户转交 · Local UI Atlas（Exa 扫描 85 结果 / 7 workstream，2026-09-09）

用户以消息原文转交，Fable 转录（表格与结论逐条保留，链接未经 Fable 核验）。消费裁定见 [intake-round-3 §4w WK-118](../intake-round-3.md)。原文主张：最值得建立的不是"漂亮组件收藏"，而是一套 **Local UI Atlas：局部行为范式 + 状态机 + 可消费源码索引**。

## 第一版局部选型索引

| 局部 | 优先参考 | 最值得直接消费的细节 | 选型判断 |
|---|---|---|---|
| Composer | assistant-ui Composer / Composer Primitive；Vercel AI Elements PromptInput（`prompt-input-cursor.tsx`） | compact→expanded；attachment staging；`/` command、`@` mention 同一 trigger 体系；model/context 放 footer rail；Send→Stop 原位变形；禁止发送时仍允许继续输入 | A+，直接作为 agent composer 基线。行为取 assistant-ui，信息编排多取 AI Elements |
| Chrome / Tab strip | chromium-tabs；Atuin Desktop `Tabs.tsx`；Termany `HTabBar.tsx` | opener-aware close；pin/group；后台 tab keep-alive；LRU discard；4–10px drag threshold；drag 后 suppress click；中键关闭；undo close；active `scrollIntoView`；纵向滚轮转横向滚动 | A+。不要只用普通 Tabs primitive；这是一个有行为模型的工作台组件 |
| Heatmap / activity | 21st Heatmap survey；VLLNT Contribution Graph；uiw react-heat-map | 4–5 档而非连续彩虹；偏态数据用 quantile；zero ≠ no-data；窄屏内部横滚；每格 date+value accessible name；点击单格再 drill-down | A。若只是 agent activity，甚至不必引入 chart lib；SVG/CSS Grid 足够 |
| Popover / 浮出卡片 | Base UI Popover；Radix Popover | collision-aware positioning；focus restore；多 trigger 共用一个 popup；payload 随 anchor 变化；popup 在多个锚点之间平滑移动、变尺寸、换内容 | A+ 巧思来源。尤其适合 tool/file/context inspector，而非给每项重新弹一个孤立窗口 |
| Hover Card / Tooltip | Base UI Tooltip；Radix Hover Card | Tooltip Provider 共享 delay：第一个稍延迟，相邻 tooltip 随后即时出现；HoverCard 只承担 preview | A。重要内容不能藏 Tooltip；agent 状态解释应升格 Popover |
| Button | GitHub Primer Button；Base UI Button；React Aria | default/hover/pressed/focus/loading/inactive/disabled/selected/destructive 明确分离；loading 保持宽度与焦点；spinner 替换 icon slot、不换整块 label；inactive 可点击解释"为何不可用" | A+。视觉可以自研，行为规范不要自研 |
| Split Button | Supabase Button | 主动作 + 同一动作的变体；共享 1px border；focus ring 用 z-index 防邻居裁切 | B。适合 `Run / Run with…`、`Approve / Approve with scope…`；不同语义动作不要硬塞 split |
| Command Palette / Selector | cmdk；assistant-ui Model Selector | dialog 版负责全局命令，popover 版负责局部选择；group + right-aligned shortcut；动态 list height；键盘 first | A+。比堆叠 dropdown 更适合 agent/runtime 高密度能力面 |
| Toast / transient feedback | Sonner implementation notes（emilkowal.ski） | collapsed stack 有纵深；hover 展开；高度不同仍平滑；momentum swipe；pointer capture；document hidden 时暂停计时；`promise` 原地从 loading→success/error | A+，基本可直接选 Sonner |
| Tool Call Card | assistant-ui Tool UI；Vercel AI Elements `tool.tsx` | `pending → approval → running → completed/error/denied` 显式状态机；input/output 分层；partial args streaming；错误可恢复 | A+，Agent UI 一等公民，不要把 tool trace 当普通 markdown |
| Approval / HITL Card | assistant-ui Approval Card；Vercel Confirmation | request/running/done/denied 同一张卡原位变化；`Deny / Always allow / Allow once` 权限梯度；批准后 card 不消失而成为 trace | A+。这是工作 agent 比普通 chat 多出来的核心局部 |
| Reasoning / Process panel | assistant-ui Reasoning Panel | streaming 时 timeline 增量出现；active step pulse；结束后自动收敛为 "Reasoned for 4s" 一行摘要 | A-。更适合作为 process/trace 视觉范式，而不是强绑定"展示模型 CoT" |

## 八条施工共识（原文）

1. 组件要有状态机，而不是一组截图。Composer、Button、Tool Card、Approval Card 都应该先冻结状态集合，再设计视觉。
2. 原位状态变化优于 DOM 换件。Send→Stop、Approve→Running→Done、Toast loading→success 都如此，视觉连续性会立刻提高成熟感。
3. Popover 可以成为统一 Inspector。Base UI 的 multiple/detached triggers + payload + position/size transition 很适合做一个"跟随锚点移动的检查器"：点 tool、file、source、context chip，同一个浮层迁移过去，而不是满屏生成卡片。
4. Chrome tab 是状态容器，不是导航按钮。保留 scroll、draft、run state，后台保持或按 LRU 回收；关闭后知道应该回到哪个 tab。
5. Agent activity 应融进普通 chrome。Termany 已把 agent activity 聚合进 tab indicator。running / waiting-human / attention / error 可用微型 indicator 表达，不必不断制造 banner。
6. 热力图不是装饰。值域、zero/no-data、bucket 方法都应属于数据语义；单格点击后再渐进披露当日 sessions/events。
7. Tooltip、Popover、Toast、Dialog 要严格分工。label → Tooltip；preview → HoverCard；可交互上下文 → Popover；短暂结果 → Toast；必须决策 → Dialog/inline Approval。
8. 基础交互层可以统一借 React Aria / Base UI 的隐性知识。drag-off cancel、pointer/touch 区别、focus restore、disabled/loading focus、collision handling 这些不值得自己重新发现。

## 组织方式（原文）

按用户看到的局部语义组织：`composer/ → tab-chrome/ → button/ → popover-inspector/ → command/ → heatmap/ → toast/ → tool-card/ → approval/ → process-trace/`；每个 entry 固定四层：**Behavior contract → state board → reference implementations → visual adaptations**。最值得单独立项继续深挖：**Popover Inspector、Chrome Tab、Composer**。
