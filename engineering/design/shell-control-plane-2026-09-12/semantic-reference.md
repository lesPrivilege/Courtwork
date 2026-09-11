# 用户三图 · 可见结构与消费

2026-09-12；原始PNG不裁切、不重绘，SHA见[source-sha256](source-sha256.txt)。截图是静态语义参考，不证明外部产品交互或CW能力。

| 原图 | 直接可见 | CW消费与限制 |
|---|---|---|
| [Shell](references/01-shell.png) | 顶部sidebar控制、Back/Forward；产品标题旁Search与带蓝点Bell；下方独立导航项 | 采用低权重全局动作与二级展开的层次。箭头可见不证明其history单位/恢复行为；蓝点不证明read语义。CW先冻结FE-NAV/NOTIFY，不照抄导航分类、颜色或尺寸 |
| [Overview](references/02-usage-overview.png) | Overview/Models、All/30d/7d；两排八指标；七行密度格；底部文字类比 | 采用摘要→时间分布的顺序，复用现Usage。图中无日期轴，不能从它核实每格时间口径，更不能称小时矩阵。Sessions/Messages/tokens/streak等数字只是原图文字，不是CW数据或新指标合同。文学篇幅类比不进入工程口径 |
| [Models](references/03-usage-models.png) | 日期轴堆叠柱、数值轴、六项模型legend、input/output与占比；Models有焦点轮廓 | 采用趋势→可核对明细与可见focus。每个stack系列须按同口径互斥分组，百分比明确分母/覆盖/舍入；原图不能证明actual/configured模型身份、cache口径或点击下钻 |

## 进入当前规范

1. Overview与Models是同一数据范围下不同投影；切换不切换数据owner。现CW只提供有限天数与retained覆盖，不把截图All照搬成“完整历史”。
2. 摘要只显示支持的Metric；不用八个空数字卡填满参考布局。Counts、比例、时间、模型名称分别按各自单位和unknown状态呈现。
3. Stacked chart和legend/detail来自同一snapshot与同一series集合。Other必须可解释；隐藏series不能悄改分母。Input/output/cache没有互斥证据时不叠成同一总量。
4. 日期密度与模型趋势沿已实现Usage grammar扩展；小时矩阵需要新小时事实。图元可点击只有在真实filter/Run reader支持时成立。
5. 新Shell控制保持当前glyph/hit area/focus/tooltip与role色规范，样图蓝色不成为品牌/未读新token。未画新specimen，未替换最终媒体。
