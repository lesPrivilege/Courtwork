# SKIN-R2 P2 · 版式编排逐靶提案（已签署）

状态：**`P2-L01…L16` 已于 `main@ee0f288` 全签；`P2-L17…L18` 由 2026-07-19
23:30 Safari 实机缺陷幀追加签署。** 编制基线 `main@967694e`；签署原文及证据哈希见
[`ARCHITECTURE-SIGNATURE.md`](./ARCHITECTURE-SIGNATURE.md)。

本批只审现有 DOM、数据与行为内的皮层。三档逐处回答如下：Agent 通用壳为**中间档**；
SchemaParts、结构化预览与 schema 工作面为**最克制档**。不存在把 Pages 激进档许可倒灌壳侧的行。

## 逐靶表

| 请求行 | 唯一 target | 档位 | 提案 | 实物理由 | 消费值影响 |
|---|---|---|---|---|---|
| `P2-L01` | `apps/desktop/src/styles.css#.workspace` | 中间档 | **留**现行三栏网格及浮卡/画布层级 | 1280×720 真帧仍能辨认左案卷、中对话、右工作面；2400×1000 真帧没有把中栏拉成不可读通栏，层级与任务流均在 | 零 |
| `P2-L02` | `apps/desktop/src/styles.css#.workspace.right-narrow` | 中间档 | **留**右栏未开预览时的窄轨 | 右栏摘要与主工作面不应常驻同权；这条是成熟交互状态的皮层投影，不是新布局模式 | 零 |
| `P2-L03` | `apps/desktop/src/styles.css#.workspace.left-collapsed.right-collapsed` | 中间档 | **留**双侧收拢的单列测宽 | 保持专注态正文测宽与 composer 同轴；撤销会让宽屏正文随视口摊平 | 零 |
| `P2-L04` | `apps/desktop/src/styles.css#.risk-grid` | 最克制档 | **留**紧凑列表/表格，不改卡片阵列 | RiskList 是同构数据；原则已明定同构数据不堆卡片，真帧行级比较效率高于卡片化 | 零 |
| `P2-L05` | `apps/desktop/src/styles.css#.risk-master-detail` | 最克制档 | **留**主从详情分栏；窄面仍沿既有单列媒体规则 | 结构化选择与证据详情有明确语义边界；不增加框廓、背景层或装饰容器 | 零 |
| `P2-L06` | `apps/desktop/src/chat/ProcessTrace.tsx#ProcessTrace` | 中间档 | **留**三态工序轨，拒 spinner 替换 | 摸底与原型审计均判“工序显示替代 spinner”已覆盖；再造 hero 工序容器会重复编码 | 零 |
| `P2-L07` | `docs/design/typography-density.md#四档密度-版式实用法` | 中间档 | **留** reading/body/dense/meta 四档及九槽用法 | 原型在此维空跑；现行壳有真实文书、普通正文、表格和元信息消费点，不以字号整齐化抹平语义 | 零 |
| `P2-L08` | `apps/desktop/src/styles.css#.interaction-card` | 中间档 | **留**仅交互决策使用的卡形；不得外扩为数据卡系统 | 卡形承载需要人回应的边界，不与同构数据列表争声部；属于行为语义而非装饰预算 | 零 |
| `P2-L09` | `apps/desktop/src/styles.css#.settings-body` | 中间档 | **留**设置页导航/内容二栏与现行断点 | 1440×900 真帧显示信息层级清楚，未出现无意义卡片化；该面不是 schema 工作面 | 零 |
| `P2-L10` | `apps/desktop/src/styles.css#.artifact-table-view` | 最克制档 | **留**零新装饰；只消费 P1 已签线级 | schema 表须从结构自然长出；P2 不加边框、底纹、卷容器、hero 或新的视觉 primitive | 零 |
| `P2-L11` | `apps/desktop/src/styles.css#.workspace.welcome-mode` | 中间档 | **留**克制欢迎面，拒计数型 hero 容器 | Agent 本体不是 Pages；把“卷一/卷二”计数 hero 搬入会引入未建模的卷语义，并抢任务入口 | 零 |
| `P2-L12` | `apps/desktop/src/styles.css#P1-line-consumers` | 中间档/最克制档逐消费点 | **留** P1 已签隔断，不在 P2 重开线级值 | P1 已按 8 主界/105 次界逐行签署并独立验收；P2 只能证明版式在该线谱上成立，不能借版式批复活双线或均一 1px | 零 |
| `P2-L13` | `apps/desktop/src/App.tsx#case-rail-information-architecture` | 中间档 | **拒迁**四卷容器 | “卷一…卷四”需要新的案件/卷宗数据模型与导航语义；这是 ADR/跨层接口，不是皮层，且被本批红线明确排除 | 零；另案才可开 |
| `P2-L14` | `apps/desktop/src/App.tsx#output-placement` | 中间档 | **拒迁**“产出先入卷”新路径 | 现有确认账本与写入路径是成熟行为资产；未建立卷容器契约前不得改写产出落点 | 零；LEGAL-FIELD-1 亦不夹带 |
| `P2-L15` | `apps/desktop/src/styles.css#decorative-quote-frame` | 中间档 | **拒迁**引语卡乌丝栏装饰框 | 引语已有来源、字体与证据语义；新增框廓无独有辖区，且会与已签线级争声部 | 零 |
| `P2-L16` | `apps/desktop/src/styles.css#product-shell-gold-mark` | 中间档 | **拒迁**泥金记号到产品壳 | 泥金是 Pages hero 的激进档预算，壳侧没有等价 hero 语义；跨档许可不得继承 | 零 |
| `P2-L17` | `apps/desktop/src/styles.css#.composer-stack|inline-end` | 中间档 | **修正** composer 不得越过对话工作面右界 | Safari exact 1600×900 真幀中 composer 横跨右工作面；这是既有输入行为的几何完整性，不是新装饰 | 只改既有皮层几何；行为、数据与 DOM 不变 |
| `P2-L18` | `apps/desktop/src/styles.css#.workspace.comparing.left-collapsed|grid` | 中间档 | **修正**比较态收左栏后不得保留 48px 幽灵轨 | 同一真幀左缘仍有空白窄轨，而 `CaseRail` 已撤挂；空轨没有语义辖区且挤压主工作面 | 比较态由三轨收为对话＋工作面两轨；其余状态不动 |

## 签署后验证形状

本表若按“留/拒迁”签署，版式侧的正确实现是**零消费 diff**，但不是零验证：

1. 档位账逐行登记 `P2-L01…P2-L18`，每一 target 只绑一行；机器门验证引用与漂移。
2. 1180×720、1280×720、1440×900、1600×900、2400×1000 覆盖 welcome、RiskList、
   Settings、Compare、折叠/窄栏/聚焦/预览和四档密度；前后帧若代码零改，可用同哈希证明“审计后不动”。
3. 注入四卷容器、同构数据卡片化、schema 新装饰、P1 隔断漂移与未登记 target，均须定点翻红。
4. 行为与数据保持：desktop e2e floor 不降，焦点/写入/折叠路径不变，数据节点字符与包围盒不漂移。

## 架构需回复

逐行签/退 `P2-L01…P2-L16`。任何希望产生视觉消费 diff 的版式项，须在退回时给出唯一 target、
精确值与语义理由；不得以“P2 应该有改动”为由越过本表重新发明信息架构。
