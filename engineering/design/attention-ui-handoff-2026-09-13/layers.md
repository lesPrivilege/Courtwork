# Attention UI 分层标注

固定输入基线：`main@6e211bd5f5169a603bc801024d16f87eec16a071`。本表标记已实现语义，不是截图验收或新合同。L1=默认决策层；L2=补充原因、关系与约束；L3=按需技术检查。后层增加信息，不重复前层。决定所需的权限、版本、失败与未知须留在动作附近。

## 区域标注

| 区域 / 当前实现 | L1 默认可见 | L2 上下文 | L3 检查 | 事实来源、可见条件与交互边界 |
|---|---|---|---|---|
| **Home · Attention 摘要** `attentionCard` | 项目范围、标题入口、同项目可见条数、最多两行的标题/五状态；仅首行可附 reason 与 next | 用户选中行后同对象详情：summary、reason、next step、记录的 due time；注明只读 | `Recorded context` 仅 revision；失败时可看 Details/last loaded 并 Retry | 仅 Home Modules 布局、项目与查询可用时显示；`limit:2`，显示可见结果计数/分页。无动作控件。返回 Home 时焦点回原行；不能把 Home 摘要变成第二套处置表单。 |
| **事项面 · 标题/范围/视图** `createAttentionWorkspace` | Attention items、Back to workspace、项目选择、Refresh；All + 五个同名状态筛选 | 当前筛选和可见记录数 | 无额外机器字段 | 六个按钮是 `role=group` 的查询，不是 ARIA tabs 或新状态；切换项目/视图会重查并清选区。视图名与状态名须保持原词表。 |
| **事项面 · registry 行/分页** | 标题、状态、`Updated …`；选中对象；Previous/Next 与 `n–m of count` | 选择行才取 detail | `revision`/`freshness` 虽在输入事实内，当前行未显示；不得用装饰推导 | Core registry 最小字段，经 `toHomeAttention` 投影；每页20，All保留服务端顺序，不跨页客户端排序。行只有 title/status/updatedAt；无 reason、next、source、seen。Enter 打开；J/K/方向键只移动焦点、不换对象。 |
| **详情 · 判断** `attention-detail-head`, `attention-decision` | 状态、title、可选summary；Why this needs attention；Next step；适用时 `Recorded due time` | 原因/下一步可按层级重排，但仍应默认可读：它们是这条 Attention 决策的上下文 | 版本与出处进入下一行披露 | 来自授权 detail/inspect；due 是记录时间，不是提醒或 scheduler。打开/读取不会 acknowledge、resolve 或开始 Run。窄屏选中后转单列详情。 |
| **详情 · Recorded context** `attention-basis` | L1 若动作/权限会受影响，须在相关处说明 | 关联对象与必要来源背景 | 当前 disclosure 按条件呈现 revision/updated、静态只读说明、locator、grant fields/expiry、basis revision/event、relation ids | 来源数组缺省、空数组、locator 无效分别是 unavailable / none / 忽略无效 locator；`core` 显示 retained source，`external` 只显示惰性 locator。grant只读，外部可用性不确认，执行引用是历史观察；不新增外部状态镜像。 |
| **动作 / 表单 / 回执恢复** `actionSurface`, `actionEditor` | 仅显示 detail 当前 `human_actions` 中本 UI 识别且 schema/revision 匹配的动作；一表单、一主提交；Sending、拒绝或未知结果清楚可见 | reason、next action kind/label/trigger；`at` 才显示 due 字段及“只记录，不投递”说明 | 错误 code、request/revision/回执恢复细节可增补，不可遮住用户的下一步 | 可见动作：Mark as seen、Resume、Set waiting、Snooze、Resolve、Reopen；未接 relation/grant 编辑器。acknowledge 单向置 `seen=true`、状态不变；resolve 是本地人类判断，不批准外部效果。成功须收到并核对 receipt 后重读；冲突保留草稿/重检；未知结果沿同 request_id 原样重试。字段错误/服务拒绝使用 alert，焦点回错误字段或动作。 |
| **Home ↔ 事项面 ↔ 全局 Attention assistant** | 显式标题/行进入事项面；全局 Attention shell 按钮与详情内 Open Attention 打开助手 | 事项面可带同项目/选中 item 导航；助手内 Attention items 命令进入事项面 | 助手自身 `Runtime & memory` disclosure、测量及 Runtime 配置归它自己的 owner | Home/事项面共享 Core 对象，不共享处置权限；assistant 是独立 global conversation，无 item 自动附着。原生 dialog 关闭恢复 opener；关闭不取消 Run。此单只调整相邻入口/返回，不重设计对话、Run、权限或模型 UI。 |

## 可改与不可改

- **Claude 可设计**布局、行密度、阅读节奏、明暗层级与有任务理由的转场/披露动效；可附加独立 Board/Time 视觉探索。当前配色、几何与截图是参照，不要求复刻；新增 token/primitive/依赖交 Astra 裁决。
- **不可改义**：五状态原名；All 是查询；列表字段保持最小且服务端分页/顺序为准；广告动作及 revision/CAS/receipt/未知恢复；read ≠ seen，acknowledge=seen，resolve≠外部批准；`due_at` ≠ scheduler；assistant/Matter/Run 与 Attention 是不同对象。不得增加默认字段或假能力。
- **Board/Time 只可分开展示为探索**：Board 要有完整集合/分组/分页口径；拖动须映射合法 typed action。Time 缺日期查询与覆盖合同；`updated_at` 不能画成规划时间，`due_at` 也不会触发调度。它们不进入主流程、不声明已接线。
- **Context window / TPS 不在 Claude 本单**；按 [Astra 后续串行记录](astra-context-tps.md) 另行基于真实视觉处理。不得画假百分比、真实 decode TPS 或把估算/Host timing包装成实测。

## 动效现状索引

当前 Home Attention 行箭头有140ms hover 位移且跟随系统/显式 reduce-motion 停止；事项面 list/detail 由响应式布局即时切换，未登记 Attention 专属 transition。原生 details/dialog 保持各自开合/焦点生命周期。动效可探索对象选中、详情往返、披露和回执反馈；不可延迟键盘/焦点或将动画完成表现成动作成功。动效基准见 [Atlas Motion](../atlas/README.md) 与 [Review 条件](acceptance.md)。
