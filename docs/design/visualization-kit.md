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

## 四、有限组合

blueprint 只使用：

- `section`：按证据或任务顺序纵向串接；
- `grid`：`1:1`、`2:1`、`1:2`、`1:1:1` 四种登记比例；
- `repeat`：对已验证数组机械映射同一种原语。

禁止自由定位、嵌套 grid、任意 breakpoint、模型输出坐标/HTML/CSS/SVG。复杂关系图的布局算法可以使用成熟库，主题、交互与 token 映射必须由宿主控制。

## 五、Blueprint 命名与接入

新增 blueprint 使用 `courtwork.<shape>.vN`。当期唯一通用生产 blueprint 仍是兼容名 `courtwork.artifact-table.v1`；后续迁为更短命名时要有 alias 与历史回放测试。Legal 的未版本化面板不得被新包复制。

每个新 blueprint 单独定义：

1. presentation config schema；
2. 完整 payload 验证与 ViewModel projection；
3. 允许的 primitives/actions；
4. pointer/词表/类型漂移的整面失败；
5. 键盘、focus、reduced-motion 与窄宽验收；
6. 至少两个 namespace 或两个真实场景的 conformance fixture。

## 六、样板资产规则

组件母版放入 `docs/design/assets/`，文件名包含版本。母版应同时展示 implemented、candidate、deferred，但不得使用假案号、随机法律段落、假百分比或营销指标。

当前视觉母版：[`assets/schema-visualization-kit-v1.png`](assets/schema-visualization-kit-v1.png)。它只使用抽象字段、占位线和状态词展示十二种结构，明确标记“非业务数据”；其中排版、图标与组合仅供原生实现取舍，不能作为字段、计数、公式或 fixture 权威。

生产实现遵守：浅色、冷调中性层级、数据区静止、tabular numbers、1px hairline、圆角不超过登记 token、零 glow/gradient、证据可换行、状态只消费封闭语义色。新场景应先在原生 gallery 中用真实 fixture 全量绘制，再选择是否升级为生产 blueprint。
