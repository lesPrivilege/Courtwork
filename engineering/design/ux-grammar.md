# UX Grammar · 开工与维护入口

2026-09-14 · Astra裁定维护规则；[输入与逐项处置](../research/ux-grammar-2026-09-14/README.md)。本页组织已有语义、交互、文案与视觉合同的读取顺序，并补充跨面审查规则。对象、状态、权限和保存事实仍由各服务合同负责；规则采用不代表全站实现已逐项接受。

## 开工先读

先确认实际分支、HEAD和[当前状态](../current.md)，再读[架构](../architecture.md)及工单对应的owner合同。UI工作从本页进入[前端连续性规范](agent-interface-2026-09-10/frontend-contract.md)，只加载相关[实现先例](agent-interface-2026-09-10/precedents.md)。不要把历史候选索引或外部规范当作当前实现。

先写清“对哪个对象做什么，什么条件下可做，成功与失败留下什么，如何恢复”，再选组件和文案。相同意图复用相同规则；新页面不获得重新解释Save、Approval或Unknown的权利。

| 决策 | 权威入口 | 本轮维护要求 |
|---|---|---|
| 对象、状态与作用域 | [状态词表](../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md)、[前端分层](frontend-layering-spec.md)、对应Core/Host合同 | 投影已有事实，区分请求、已保存、已生效、正式接受 |
| 动作与用词 | [文案体例](copy-convention.md) | 采用唯一动作方言；领域typed action优先，不按通用词表改API语义 |
| 控件、导航与披露 | [Atlas](atlas/README.md)、[Disclosure](home-composition-2026-09-10/disclosure-overlay.md)、[Shell控制面](shell-control-plane-2026-09-12/README.md) | 先选任务承载面，再选控件；保留键盘、Escape、返回焦点和作用域 |
| 编排、间距与密度 | [编排标准](ui-composition-standard.md)、[表面层级](surface-hierarchy.md) | 相同关系沿同一token/模式；阅读与决定区不复制工具栏密度 |
| 图标、颜色与材质 | [Icon](icon-controls.md)、[色彩](../mvp/execution/work-surface-kit/contracts/color-governance.md)、[Skin边界](skin-injection-2026-09-10/skin-constitution.md) | 原生SVG承载已建立的动作；不以装饰暗示新状态或权力 |
| 保存、反馈与恢复 | [前端连续性规范](agent-interface-2026-09-10/frontend-contract.md)、[历史UX索引](ux-conventions.md)、具体服务合同 | 回执绑定对象、scope、revision和草稿身份；失败可恢复且不丢输入 |

## 跨面规则

以下ID是审查定位符，不是新runtime枚举或CSS token。状态`adopted`表示规范已裁定；实现验证另在交付记录中。后续规则先记`proposed`，替代规则记`superseded`并指向接替条款，保留历史证据。

| ID · 状态 | 规则与反例 | 验证方式 |
|---|---|---|
| UX-01 · adopted | 常驻文字必须帮助识别、行动、判断状态或避免/恢复错误。组件支持subtitle不构成添加理由；不重复标题、控件和值 | 文本去留记录注明承重与披露层；先尝试删除，再检查任务是否仍可完成 |
| UX-02 · adopted | 必需的对象名、决定依据、权限范围、失败和未知留在动作附近；长原理按需查看。不能把全部helper搬入tooltip，也不能把全部设置塞进dialog | 验证默认层能正确行动，键盘/触屏可取得补充信息；必要信息不依赖hover |
| UX-03 · adopted | Link去可寻址上下文，Button发起动作；Tab切同级视图，Disclosure原位展开。Switch只改真实可写二值状态；待Save的选项使用表单选择语义 | 检查实际保存时点、role、选中态和键盘；只读事实不画假开关 |
| UX-04 · adopted | 反馈的语义与承载面分开：字段错误靠近字段，持续故障留在受影响区域，需决定才使用集中决定面。结果已清楚可见时通常不再加通用Success toast | 核对回执与可见结果；必要的读屏状态通告仍保留，不能把减视觉反馈等同于静默 |
| UX-05 · adopted | 运行状态只消费owner有限枚举；连接、请求在途、前后台位置和运行结果分别表达。Thinking轮播不产生新状态，超过10秒不自动获得后台执行能力 | 检查断连、取消请求、终态、重开；无真实进度不画百分比或预计完成时间 |
| UX-06 · adopted | 恢复优先，但Undo、重试、撤销必须有服务合同。按真实后果选择确认；不因为出现Delete就机械加确认，也不因希望少打断就声称可撤销 | 检查目标/范围/后果、失败保留、重复请求和旧回执；无恢复能力不提供假Undo |
| UX-07 · adopted | 间距表示关系，层级表示任务优先级。相关项靠近，同类节奏一致，分组边界可辨；不为减字删除新产品概念的稳定名称 | 相邻面和完整场景目验；沿既有token，不新增一套space.*值或全页统一紧密模式 |
| UX-08 · adopted | Agent扩展使用共同UX：来源、工具、授权、历史可按任务查到；普通Save/Search不另造AI装饰。模型结果、机器采纳、人审决定各自保留 | 核对来源版本和真实typed actions；动效或glyph不能赋予接受、可信或权限语义 |
| UX-09 · adopted 2026-09-19 | 页面分区：chrome、身份、主动作、工作对象、状态/事件、轨迹/证据、环境历史各占可辨的区；区内密度随状态自适应（空→一句或不出现，有对象→对象行，加载/失败→原位）。状态/事件默认一行，轨迹与证据进原位披露或二级工作面。可变文字不改变其后各区内部与区间的对齐关系；为零的类别不占整块区域。同一内容区内按相对重要性排序（可行动→近期→环境历史），具体锚点与先后由各表面合同裁定；不预留会裁切的固定高度框 | 按[收敛登记](../execution/claude-frontend-harness-2026-09-16/gui-grammar-convergence-20260919.md)状态矩阵核对阅读/Tab顺序与稳定对齐线；200%缩放退回同序文档流且不裁切（WCAG F69/F104） |
| UX-10 · adopted 2026-09-19 | 事件按对人的要求定权重：待人输入/授权为决定对象，阻塞与失败为异常，结果与新产物为正文，普通进度聚合、原始工具细节进披露。摘要行按“主体·动作·对象·结果·时间”取owner事实，缺项省略不补；状态标记只表达状态。这是审查词表，不是新runtime枚举 | 事件爆发fixture中失败、授权、产物单独可见，成功过程聚合；逐行核对thread各row kind的归类 |

## 变更如何进入公共规则

在原[变更记录](agent-interface-2026-09-10/change-template.md)登记受影响ID、最近实现先例、保留关系及有意变化。现有模式能表达时复用；确有缺口，写清任务、反例、owner、允许的组件映射、可访问性与验证范围，再由Astra裁决。规则不重复复制进各页面目录；新动作/状态回写原词表或服务合同。

例外必须说明规则ID、具体表面、理由、负责人和复查条件。改规则需列受影响消费者及迁移次序；旧候选不能因新文档出现而自动升为canonical。文案、链接类变更跑对应检查；行为或视觉变更按前端连续性规范验证实际影响，不为纯登记声称全站回归、读屏或200%缩放通过。

现有lint只覆盖各自登记规则；本轮建立人工可执行的检查合同，尚无自动判定文案承重、信息层级或交互语义的全库lint。不得把构建绿灯当作UX接受。

合流前定向任务入口：[Frontend Attention Audit 输入与 Luna 委派范围](../research/frontend-attention-audit-2026-09-14/README.md)；此登记不增加 UX-01…08 规则或全站接受结论。
