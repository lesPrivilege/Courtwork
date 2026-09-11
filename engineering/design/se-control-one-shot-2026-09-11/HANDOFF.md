# SE control surfaces · 独立 Design one-shot

**任务：为 Courtwork 设计一套可统一落地的原生图标、控制面和功能性动效。Spark 与 Attention 是本阶段的核心产品命题；App 与发布面必须用具体控制面共同说明 SE 如何治理持续工作。** 本包由 Astra 定义问题、Luna 核对来源与实现；用户将提交独立 Design。Design 输出返回后，由 Astra 逐项裁决、拆施工 PR、复核并合流。本包不是 Design 已接受或新界面已实施的声明。

## 0. 固定节点与必读顺序

- 历史截图源：`f1373cde341b5a17299fad6ba5921ba3fcc43824`。App tree `1bf4df93764cb54b490404d9b1c18b26b5c11261`。
- 当前产品修正：`5e3a504`（dark用户气泡→现有float；composer已满足）。[修正证据](../../../evidence/dark-authored-20260911/README.md)覆盖新界面，不能把f137图组改标为新源码。
- 发布媒体整合基线：`a01dee89e752111e63012b705ef81350ce518446`，已进入 main。13图位×明暗共26张原生1440×900截图；[当前 manifest](../../../site/media/main/manifest.json)与[独立图像/API回执](../../../evidence/semantic-polish-merge-20260911/capture-review.md)给出状态、来源及限制。不要用旧图替代当前面。
- Paper：沿 [PAPER.md](../../../PAPER.md) 固定 SE 9.6、`d78fd312955c1f594e59cbdcbb0d3074ac355940`；产品设计不改写论文。
- **先读本页 → [决策与 PR 索引](decision-index.md) → [缺口／PR提案](proposals.md) → [本次生态来源](../../research/ui-ecology-2026-09-11/source-review.md) → [返回模板](RETURN.md)。** 具体实现与历史材料按 [source-index.json](source-index.json) 的问题键及固定 SHA 检索。
- **必须消费 Design Scout 系列**：来源分层 → Scout v1 → EX-SC1负例裁定 → Scout v2 → 当前按问题索引 → Home control/material/tab/overlay补充 → agent-interface → 本次生态摘要。须在返回材料逐项写出采用／适配／拒绝及原因；不能只列“已阅读”。具体路径和顺序在决策索引中。

## 1. 需要表达的产品命题

模型参与一次执行，工作对象、来源版本、正式决定和未完义务持续存在。产品把“发生了什么”“现在什么有效”“谁可做什么”“下一次需要读什么”变成可检查、可操作的工作面。视觉解释这些关系，正式状态仍由各自服务与合同决定。

| 核心面 | 用户的问题 | 本阶段必须画清的控制关系 |
|---|---|---|
| Spark | 来源变了，哪些派生还可靠，什么应重做？ | project／Matter范围、来源revision、current/stale、变更清单与历史、刷新与准确的缺失／错误态；重建控制需区分设计候选与真实能力 |
| Attention | 现在需要我看什么，为什么，由谁继续？ | 全局助手与Attention items队列各自身份；队列/详情、筛选、披露scope、待决动作、响应/恢复；不要把普通运行或每次来源变化一律升级为人的警报 |
| Review / Approval | 我是在判断证据，还是允许一次操作？ | Review绑定候选与来源，Approval绑定精确操作；读取、披露、确认、授权、接受分别呈现 |
| Pages | SE治理给专业工作带来了什么？ | Spark与Attention的连续控制面故事：来源变化→发现失效→定位相关工作→人的有据介入→工作继续。文字、真实状态图与原生概念图互相解释 |

当前 Spark 查询及前端已经接收，不能把历史 `be41-dto` 的“后端未实现”或404兜底注释当作当前能力。**重建/恢复等后续范围仍开放**。Attention的队列与全局会话是真实面，首次截图的item revision1与后来披露grant revision2有明确时间边界。`Running`、工具成功、文件已记录都不等于正式Review接受。

## 2. 一次完整 Design 的交付范围

| 系列 | Design 必交内容 | 当前先例与边界 |
|---|---|---|
| Spark / Attention 原生图标 | 两者的独立识别原理；入口、标题与小尺寸控件中的SVG；至少一个保留文字的基线对照；16/18/20/24px光学与明暗/单色矩阵 | 当前text-reserved为有意政策；用户本单明确重开这两个槽。不要直接借通用sparkle/bell填空；新glyph不能承担权限或状态。整族Lucide迁移未获授权 |
| Spark 控制面 | Overview/Activity与范围、当前/过期/未知/空/部分/错误/冲突；窄屏完整场景；重建动作的候选解剖及所需后端 | `spark-view`/`spark-projection`与BE41-A/B；现有查询只读，Refresh不等于重建 |
| Attention 系列 | 队列、详情、全局会话、披露scope/授权请求、Question、动作回执与恢复；不同入口的相邻整体场景 | `attention-view`、`attention-agent-view`、真实typed actions与governance；不要再造Inbox/第二registry或本地调度器 |
| Chat Space 图标与组件 | user/assistant/tool/file/source/actions/composer/attachments/model/stop的共同解剖；全名、tooltip、focus、hover/touch、disabled/unavailable/inflight/error/resolved | 已有47项呈现registry与36枚静态glyph。Chat≠Run≠Thread；文件版本与读取来源不能被同一图标抹平。未有production handler的动作继续列能力缺口 |
| Composer / thinking / streaming | 输入、发送在途、首输出前、文本流、工具调用、等待人、停止请求/已停止、失败/重试的功能性动效；键盘和reduced-motion对照 | 复用当前120/180ms与curve；编辑/焦点/选区/草稿/阅读位置不能因动效丢失。Thinking不伪造思维内容、百分比、token速度或剩余时间 |
| Explore agent / 协作 | 单/多任务、排队/执行/等输入/终态、返回结果与来源的视觉系列；身份、时间线和任务关系的设计方案 | 当前coordination是通信事实，不是统一执行中心。没有owner的计划/百分比/子agent生命周期只能画在明确的设计样本adapter里，回报接口缺口 |
| Settings / tab / tap 控制 | PropertyRow、select/segmented、manual-activation tabs、view-switch、popover/tooltip/inspector、错误和reset；点击/触摸与键盘动作反馈 | 原文“tap”同时覆盖触摸反馈与tab/view-switch研究。九个Settings组不是九个可关闭文档；筛选值不是tab；新增数值控件先有单位/边界/commit schema |
| Visual Grammar / Taste Memory | Surface/Color/Material/Type/State合法组合、明暗depth映射；grammar/exemplars/preference log/open judgments四类资产；保留被拒方案及上下文 | 复用现有治理，不设总审美分数，不将助手例子伪装用户偏好；量化与holdout只作后续实验 |
| 发布面 | 首页核心Spark/Attention故事、相应Features/Tour完整控制面段落、静态和动效版概念SVG；继承现有Hero→Spark/Attention→Paper/Tour阅读脉络 | 现行Tour/Paper/Release导航、默认展开Ideas、既有Hero对象/小图尺度有裁决；若改须给具体收益、前后对照和旧理由处置，不能凭最新助手建议覆盖 |

必须给出一套推荐系统及少量真正不同的关键候选，不提交散落的组件moodboard。图标原生SVG、组件使用真实文字与对象关系、动效给出可复现时间线和静态退化；样本与生产能力的状态分别登记。Pages允许更有解释性表现，App保持持续阅读和高频操作的稳定性。

## 3. 复用的解剖与明确可重开的部分

复用当前原生DOM/CSS/SVG、`ui-controls`的action/tooltip/popover、`semantic-controls`、`settingsRow`、model picker、work-surface tab和版本固定reader。图标vendor由源文件、sources manifest与生成器一致产生；不手改生成sprite。`brand/`仍是零依赖独立身份包，不能把其presence/authority概念直接变成业务glyph或正式事件。

新原生Spark/Attention标识属于**用户授权的局部设计重开**：保留可读文字及可访问名称，记录语义碰撞、邻接Lucide的光学匹配、构造和授权出处。Design可提出必要的局部grammar调整，但必须写出影响面与迁移条件；Astra随后裁决，不因有新SVG就默认进入canonical。

现有可访问性/语义约束不是图像风格建议：焦点与返回路径、选中/激活区别、touch可发现性、缩放、forced-colors、reduced-motion、错误和未知态都要保留。已经采用的“减少动效=静态回退”不因外部skill主张淡入必须保留而自动推翻。进入/退出如采用动效，按真实中断/关闭/重开从当前状态继续，不能把内容逐字重播或劫持滚动。

## 4. 状态样本与检查矩阵

每组Design至少给出目标局部、最近相邻面、包含它的完整场景，统一真实内容。1440/1280/390、light/dark、长文本与200%重排；键盘、触摸、reduced-motion、forced-colors按影响覆盖。缩放/原生辅助技术若无法执行，写明未验，不以截图取代。

必须包含：空/加载/成功/部分/未知/失败；权限未授/已授/撤回；请求在途/已回执/旧版本冲突；active与selected分离；输入法组合、反复开关、中途停止、切项目/对象及旧请求晚到；大段流式文本上滚阅读、选区和焦点保持。只有实际合同存在的状态进入production接线；候选状态要提供清楚的sample adapter和逆向接口账。

当前截图是合成资料经真实宿主/API形成的状态。它们能证明面和记录存在，不能证明模型质量或全部状态接受；本包不要求沿用旧截图作golden，也不准仅替换基线来消除回归。

## 5. 返回与裁决

按 [RETURN.md](RETURN.md) 返回：推荐系统、资产/组件/动效清单、既往资料消费账、状态及来源映射、对比与验证、必要的后端缺口、建议PR顺序、仍需裁决的明确分歧。每项带本包gap ID和固定输入SHA。

Astra只在收到Design之后填 `adopt / adapt / reject / defer`，写明原因、影响的既有裁决与验证要求；随后把获准项拆为有界PR，由非作者复核，最后报告合流节点。用户负责提交/唤醒独立Design；本轮没有替用户发外部消息、建立新Design任务或预报其已接受。

新增 [Taste Memory裁定](taste-memory.md) 是本次one-shot的必读与返回要求。候选、作者判断、用户裁决、非作者复核分别署名，不把已上线代码自动升级为先例。

## Design Scout渐进披露

先读[Luna蒸馏摘要L0](scout-digest.md)，按目标问题展开L1，再用[L2固定来源与hash](scout-digest-index.json)召回原文。摘要附Astra当前适用边界，历史角色/待办不自动恢复；Design必须在返回消费账中说明实际采用和拒绝。

## 独立Design回报接收

已收完成摘要；[Astra待核裁决与PR边界](return-intake.md)区分可裁工程原则与未见资产。实际zip/RETURN及画布待取得，不先填视觉接受。
