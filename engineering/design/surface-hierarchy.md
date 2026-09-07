# 线、面、卡片与浮层体例

2026-09-07 · Astra。消费用户最新要求：减少拥挤，文字承担语义，导航/交互与成熟 agent 习惯一致，善用阴影、框线与 hover/focus。**本页的用途选择与状态规则作为施工约束接受；新增视觉值仍须在真实 C3 页面验收，不以文档代替像素通过。** “fever”在本次按 hover/focus 理解。

## SH-1 · 先按用户任务选容器

| 用户在做什么 | 默认表示 | 边界方式 | SE 落点 |
|---|---|---|---|
| 连续阅读、扫同类对象 | 扁平文段 / 列表行 | 留白、对齐、字阶；需要时一条行分隔 | Thread 正文与成功 ledger；Dashboard Continue |
| 比较相同字段、查多条记录 | Table / DataList | 表头、列对齐、行分隔；不把每个字段包装成卡 | Run usage、运行元数据、Evidence 表、版本列表 |
| 阅读一个有共同标题的区块 | 平面 section | 标题 + 间距，或一条顶部分界 | Run 内“成果 / 运行记录”的各段 |
| 识别一个可独立打开/选择/处理的对象，且多种内容需成组 | 一个对象卡 | 内距 + 轻表面或 1px 边；默认无外投影 | 等待回答/授权的决定对象、非表格式多字段对象 |
| 做真正的单选/多选 | 原生 radio/checkbox；选项较复杂时选择卡 | 持久选中标记、标题；整卡触达不取消表单语义 | 长描述选择、provider 方案等确有能力的选择界面 |
| 输入、编辑草稿 | 输入表面 | 一圈明确输入边界，内部说明不再嵌卡 | Composer 锚定卡 |
| 临时操作、辅助解释、覆盖当前工作 | Menu / tooltip / popover / sheet | 浮层表面 + 合适阴影；需要时轻描边 | 更多菜单、图标提示、选择器、窄屏工作面 |

“看起来重要”不足以成为卡片理由。卡片至少应有一个清楚的整体对象身份或整体交互意图。普通统计、hash、时间、事件行不能只因它们各占一行就各成卡。反过来，真实的授权范围/问题及其动作也不能为了扁平而拆散失去整体可辨识性。

## SH-2 · 视觉通道各司其职

| 通道 | 表达 | 不承担 |
|---|---|---|
| 留白、对齐、字阶 | 阅读分组与重要性 | 未说明的对象状态 |
| 1px 次级边线 | 容器界限、重复行分隔 | 每个嵌套层都套框 |
| 较强主界 | 主工作区/导航、header/body 的结构边界 | 让全部小区块一样重 |
| 轻表面色 | 输入区域、相关对象分组、hover/selected 的上下文 | 整片成功/失败着色 |
| 2px 状态侧线 + 状态文字 | 现有等待/失败注意力语言 | 替代错误解释或仅凭色表达结果 |
| 阴影 | 抬升、覆盖或滚动遮挡的物理关系 | 内容正确性、审批状态或通用装饰 |
| SVG | 常见操作与位置识别 | 对象名称、授权范围、风险与状态后果 |

同一边界先选一种主手段，避免“深底色 + 强边框 + 大阴影 + 内部全套小卡”同时出现。轻描边和阴影可以共同保证浮层在复杂背景中的边缘，但不能再给它的每行重复阴影。Focus ring 属于键盘反馈，不受“只有一种装饰”限制。

## SH-3 · 四种表面角色，少量 token

| 角色 | 默认处理 | 何时例外 |
|---|---|---|
| 基础平面 | `--panel` / `--canvas`，无阴影 | 各主区用已有 rule 区分 |
| 有界对象 / 输入 | 复用 `--panel-muted`、`--rule-minor` 与既有 6/8 圆角；无默认投影 | 需要整体拖动或单一焦点对象时，才考虑轻抬升 |
| 轻抬升对象 | 低强度阴影 + 对应明暗表面；同一阅读区不要反复叠高 | 当前普通 Dashboard 行、usage、trace 不属于此类 |
| 浮层 | 复用 `--shadow-float` 与浮层表面；菜单/tooltip/popover 聚合操作 | 边缘看不清时增加轻描边；窄屏 sheet 主要靠遮罩与层关系，不能靠巨大阴影表现 modal |

优先沿用 L4r1 已有 `--space-*`（4/8/12/16/24）、`--radius-control/card`（6/8）、`--rule-minor/major` 与 `--shadow-float`。不为每一种组件另起圆角、灰色和投影。确需轻抬升时，从固定版本 Radix shadow 小档取源后映射到语义角色，不照搬其完整六档或混用多家阴影。明暗模式分别验证表面/阴影组合；阴影不能承担唯一边缘识别。

官方依据：Radix [Card](https://www.radix-ui.com/themes/docs/components/card) 明确单独表面容器；[Table](https://www.radix-ui.com/themes/docs/components/table) 默认 ghost、可选 surface，说明表格式数据并不默认需要外壳；[Shadows](https://www.radix-ui.com/themes/docs/theme/shadows) 提供小档到大档来源。Atlassian [Elevation](https://atlassian.design/foundations/elevation/) 将普通、抬升、覆盖关系分开，强调谨慎用 raised、hover/pressed 用表面反馈，暗色下表面也参与层级表达。这里采纳用途原则，SE 的角色映射是本页裁定，不声称是上述规范原文。

## SH-4 · Hover、pressed、focus、selected 不能混为一态

| 状态 | SE 规则 |
|---|---|
| default | 重要动作可发现；普通信息没有可点击的假外观 |
| hover | 仅真实交互对象获得轻背景/前景变化；不改变行高、内距或对象位置；非交互小卡不悬浮抬升 |
| pressed | 使用更明确的表面反馈；工具栏高频操作不依赖缩放动画，不同时叠加弹跳与抬升 |
| focus-visible | 持续清楚的焦点圈；不能只复用 hover；在菜单/sheet 上不被裁掉 |
| selected / current | 离开鼠标仍保留；语义上对应 aria-selected/current/checked，不能与 hover 完全相同 |
| disabled / unavailable | 保留原因与能力边界；无能力则无控件，有能力但当前不可用才禁用 |
| loading / submitting | 保留原尺寸和对象身份，明确正在处理；不能用 spinner 伪造成功或把其他对象锁死 |

Hover 才出现的复制/更多等次要动作必须同时在 focus-within 出现，预留空间避免文字跳动；触屏提供常驻更多入口或等价点击路径。授权、错误恢复、主要下一步不能只放在 hover 中。Tooltip 显示短标签/快捷键/简短补充，不承载不可缺少的授权范围、错误原因或唯一说明；需要链接/交互内容时改用 popover/menu，而非可交互 tooltip。

默认保持现有低运动体系；新动画另按频率与作用裁定，不借这份表面体例引入弹性运动库。emil-design-eng 在本次用于高频交互克制与反馈检查，其示例不是 SE 必须逐字采用的值表。

## SH-5 · 对现有画板的落位

| 当前稿 | 消费后 | 为什么 |
|---|---|---|
| Outcome 每个 Target/Delta/Evidence/Uncertainty 都用相同小卡 | Target 与版本状态尽量合成一条对象行；Evidence 用可定位事件行；Uncertainty 用按来源区分的安静说明 | 减少多层重复轮廓，先看这次留下了什么 |
| Run 元数据和 usage | 保持 DataList、trace 表格，不倒退成统计小卡 | 同字段比较比卡片分组更有价值 |
| Thread 已解决授权仍占强表面 | 保留必要身份与已处理文字，降回 ledger；未解决授权保持清楚整体范围和动作 | 表面强调当前要处理的对象，历史证据仍可展开 |
| Dashboard 每个重复会话都像独立表单卡 | 同一集合用扁平行与必要分隔；waiting/failed 用既有侧线 | 三档注意力与列表归属都清楚，避免六张小卡争抢 |
| Close / Expand / Copy 等重复文字动作 | 使用单一 SVG 家族的原生按钮 + 可访问名称与二级提示 | 把文字预算留给对象与工作语义 |

这张表是下一次画板/实现的改动输入，没有据此声称源码已经变化。Outcome 与 Run details 的容器裁定仍见 [O-1（历史路径：`../mvp/execution/gui-completeness/dashboard-design/adjudication-outcome-astra.md`）](../migration/2026-09-08/evidence-index.md)。

## SH-6 · 交付与验收

Claude 每新增一类表面，写一行：用户任务 → 行/section/卡/浮层选择 → 使用 token → 交互状态 → 例外理由。优先复用已接受组件，不写通用设计引擎。

目标场景验收：390 与桌面宽屏、长对象名/长错误/多成果、hover/focus/selected 区别、无鼠标路径、暗色模式（若产品支持）、高缩放、打开/关闭浮层和恢复焦点。看是否靠正文仍能识别对象与后果，是否真正减少重复轮廓；不能仅以“每个按钮有 SVG”“每张卡有阴影”计作完成。

## 固定源码补证

Radix shadow CSS 已固定到 `1faff10ac26ae17f09944d418c6949b93fc6b566`，见 [永久源码](https://github.com/radix-ui/themes/blob/1faff10ac26ae17f09944d418c6949b93fc6b566/packages/radix-ui-themes/src/styles/tokens/shadow.css) 与 [manifest（历史路径：`../mvp/execution/gui-reference-intake/surface-source-manifest.json`）](../migration/2026-09-08/evidence-index.md)。这里只作取值来源，未把第三方 CSS 安装进产品。
