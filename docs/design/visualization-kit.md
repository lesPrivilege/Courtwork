# Schema 可视化组件库

状态：现行设计索引。图片是选型素材，不是协议真源；renderer 契约以 descriptor、presentation schema、host registry 与测试为准。

## 一、目标

有限的宿主原生原语应覆盖不同垂类的结构化阅读、核对和确认。新场景优先重新编排这些原语，不为每项能力新增白卡，也不让模型决定颜色、位置或动效。

## 二、基础构件

所有 blueprint 复用以下宿主构件：

| 构件 | 承担的信息 | 允许交互 |
|---|---|---|
| `Field` | label、值、缺口 | 复制、展开完整值 |
| `Anchor` | 文件、页码、完整引语 | 展开、回到原件 |
| `Status` | 风险、处置、覆盖、信源 | 查看解释；状态本体零动效 |
| `Evidence` | generated / verified 双通道 | 查看依据、核对原文 |
| `Decision` | 确认、驳回、修正 | first-wins 提交、失败重试 |
| `Estimate` | 单值、区间、缺口状态 | 查看参数来源 |
| `Partial` | 已完成数量、失败项、待补材料 | 定点重试或补材料 |

构件不认识 Legal/PM 字段名，只消费宿主 ViewModel 与 token。

### 宿主 ViewModel 最小字段

以下字段只存在于 UI projection，不进入垂类 payload、事件或持久协议：

| ViewModel | 最小字段 | 防呆 |
|---|---|---|
| `FieldView` | `id / label / value / valueKind` | value 已由 projection 变成人读值；组件不读 JSON pointer |
| `AnchorView` | `id / fileLabel / page? / quote / availability` | `availability=quote_only\|source_ready`；无真实 locator 不显示“回到原件” |
| `StatusView` | `label / tone` | tone 只准 `neutral / generated / verified / warning / critical`，不接受自由颜色 |
| `EvidenceView` | `statement / anchors / verification` | anchors 至少一项；verification 只准 `generated / verified / out_of_coverage` |
| `DecisionView` | `requestId / state / actions / resolvedActionId?` | state 只准 `pending / submitting / resolved / failed`；提交仍由既有 first-wins port 执行 |
| `EstimateView` | `point? / range? / statusLabel? / unit?` | point、range、缺口三形状互斥；倒置或非有限区间整面失败 |
| `PartialView` | `completed / total? / failures / pending` | 只投影事实计数；未知 total 不伪造百分比 |

`id` 只用于稳定 DOM/焦点关系，不是 artifact 身份。所有数组和对象在进入组件前应冻结；组件不得修改
projection、重新解释领域 wire，或把 `undefined` 猜成成功/零值。

## 三、视图原语

| 族 | 适用关系 | 当期状态 | 典型消费 |
|---|---|---|---|
| `table / matrix / compare` | 记录、交叉问题、版本差异 | table 已实现；matrix/compare 待版本化 | RiskList、ReviewMatrix、PrdReview |
| `list` | 条目流、行动项、来源集合 | candidate | FeedbackDigest、ActionItems |
| `timeline / schedule` | 顺序事件、并行日程 | timeline 已实现；schedule deferred | Timeline、会议行动项 |
| `graph / tree / flow` | 主体关系、层级、因果 | graph 已实现；tree/flow deferred | PartyGraph、依赖关系 |
| `document / revision / narrative` | 原件阅读、修订、长文报告 | document/revision 已实现；narrative candidate | 文书、修订指令 |
| `form / checklist / gate` | 参数核改、逐项确认 | gate 已实现；form/checklist candidate | PriorityScore、确认门 |
| `stat / chart / progress` | 数量、区间、分布、真实进度 | progress 局部实现；stat/chart candidate | 声量、得分、长任务 |

`gantt / board / heatmap` 只可出素材样板，保持 deferred，直到真实场景证明 table/timeline/chart 无法表达。

## 四、依赖取舍

当期 `VISUAL-KIT-1` 新增第三方依赖为 **0**：

- table/matrix/compare 使用语义化 `table / caption / th[scope]`；list/timeline 使用 `ul/ol/dl/time`；
  document/revision 使用 `article/section/q/ins/del`；gate 使用 `fieldset/legend/button`；stat/progress 使用
  `dl/progress`；有限 bars/lines/dots 使用宿主 SVG，并提供等价 DOM 数据表。
- 已有 G6 只服务非平凡关系图并继续 route-level lazy load；canvas 不作为读屏真源，必须保留同步 DOM
  主体/关系列表与选择状态。不得用 G6 画表格、统计图或固定流程。
- 当真实场景同时证明高密多系列、缩放、tooltip、legend 与原生 SVG 不足时，才单独复议 ECharts；
  即使引入，option 也必须由宿主白名单生成，垂类/schema/模型不能直传。
- TanStack Table、React Flow 与整套 dashboard/UI kit 当期不引入：前者会在无排序/过滤/虚拟化需求时
  增加第二套行列状态，后者与 G6 重复且把只读证据关系误塑为图编辑器。

调研依据只取官方材料：[G6 扩展](https://g6.antv.antgroup.com/en/manual/graph/extension)、
[TanStack Table 概览](https://tanstack.com/table/v8/docs/overview)、
[ECharts 按需导入](https://echarts.apache.org/handbook/en/basics/import/)、
[ECharts 无障碍](https://echarts.apache.org/handbook/en/best-practices/aria/) 与
[React Flow 无障碍](https://reactflow.dev/learn/advanced-use/accessibility)。这些链接用于实现选型，
不构成运行时依赖。

## 五、有限组合

blueprint 只使用：

- `section`：按证据或任务顺序纵向串接；
- `grid`：`1:1`、`2:1`、`1:2`、`1:1:1` 四种登记比例；
- `repeat`：对已验证数组机械映射同一种原语。

禁止自由定位、嵌套 grid、任意 breakpoint、模型输出坐标/HTML/CSS/SVG。复杂关系图的布局算法可以使用成熟库，主题、交互与 token 映射必须由宿主控制。

## 六、Blueprint 命名与接入

新增 blueprint 使用 `courtwork.<shape>.vN`。当期唯一通用生产 blueprint 仍是兼容名 `courtwork.artifact-table.v1`；后续迁为更短命名时要有 alias 与历史回放测试。Legal 的未版本化面板不得被新包复制。

每个新 blueprint 单独定义：

1. presentation config schema；
2. 完整 payload 验证与 ViewModel projection；
3. 允许的 primitives/actions；
4. pointer/词表/类型漂移的整面失败；
5. 键盘、focus、reduced-motion 与窄宽验收；
6. 至少两个 namespace 或两个真实场景的 conformance fixture。

## 七、样板资产规则

组件母版放入 `docs/design/assets/`，文件名包含版本。母版应同时展示 implemented、candidate、deferred，但不得使用假案号、随机法律段落、假百分比或营销指标。

当前视觉母版：[`assets/schema-visualization-kit-v1.png`](assets/schema-visualization-kit-v1.png)。它只使用抽象字段、占位线和状态词展示十二种结构，明确标记“非业务数据”；其中排版、图标与组合仅供原生实现取舍，不能作为字段、计数、公式或 fixture 权威。

生产实现遵守：浅色、冷调中性层级、数据区静止、tabular numbers、1px hairline、圆角不超过登记 token、零 glow/gradient、证据可换行、状态只消费封闭语义色。新场景应先在原生 gallery 中用真实 fixture 全量绘制，再选择是否升级为生产 blueprint。

gallery 是宿主验收面，不是第三套数据源：Legal/PM fixture 由测试或 demo composition 投影为递归冻结的
ViewModel 后注入；gallery 源码不得 import Node-only demo-data 根出口，不得把 fixture 复制进生产 bundle。
implemented 样板必须使用现行组件；candidate/deferred 只能用同一 token 与原生语义元素绘制静态结构，
并明确状态标签。真机截图必须记录 fixture hash、main SHA、viewport 与 `reduced-motion`。
