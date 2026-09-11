# Fresh Claude · Pages可视化 one-shot

状态：**交接准备，尚未派发**。本包由Astra裁决，Luna提供只读索引核对；用户决定后续fresh Claude提交时点。执行前Astra须绑定实际输入commit与已裁A/B返回；当前准备源为 `c127961100871d2db7677a0ebb6ce0b0e1ee3f98`，不是未来施工基线。

## 给Claude的任务正文

为CourtWork独立Pages任务制作可维护的可视化候选。先消费[A/B v2正式接收裁决](../../research/se-control-design-return-2026-09-11/v2/README.md)和原件；可用方向已接收，待修资产不能据作者自述直接复制到发布面。优先复用已交图，只为实际缺口重绘。先读下面L0，再按你实际制作的图读取L1；只从已裁语义推导图，不从外部参考、旧聊天或记忆重建架构。遇到owner/状态/权限争议，列出选项与影响交Astra裁决。

你拥有所派图的可编辑候选源、导出图与说明。不得自行修改架构/领域合同、app/backend、共享Pages生产源码或发布；如需站点上下文，用独立候选预览，不复制用户数据。你不是唯一作者，不覆盖其他人的文件。最终由Astra统一接收、集成到现GitHub Pages并发布。

设计先确定每图claim、受众、最小显示尺寸、节点/边与成熟度，再选静态表达和必要motion。F1解释ownership，F2解释compile/execute/commit，F3解释Runtime组成；F4优先复用continuity旧图，F5只有确需解释Schema/Contract/Expert组合时才做。DR-06五拍是产品故事，与F图各有任务，不能强行合成一张总图。

保留当前产品叙事、Hero、导航、Ideas及真实f137媒体。新图表达目标结构须清楚；样例不得重标为实际运行截图。正文独立承重，省去“本图使用SVG”等施工旁白。source→candidate→review/authority→commit边界不能省略为模型自动写Matter；Spark不等于全体后台自治，Attention也不等于每项都必须人工介入。

采用现有视觉角色与最新八轴grammar；不复制旧板顶部palette，不另造整套token。稳定glyph沿现来源；Spark/Attention A/A仍按adopted specimen及局部光学门消费。图形、材质或动画不授予正式效力。未必要动的现资产保留。

交付每图：claim与状态、消费的source commit/path/hash、节点/边清单、编辑源、SVG及必要PNG、alt/文字等价说明、placement与实际显示尺寸、与旧图差异、source/render hash、桌面/窄屏与适用明暗/reduced-motion作者检查。报告未跑项。不要把作者自检称独立验收，不自行合入main或发布。

## L0 · 每次必读，按序

1. 根AGENTS与[当前状态](../../current.md)：实际branch/HEAD和最新回报接收状态。
2. [Astra统一接收与发布计划](README.md)：A/B绑定表、你收到的具体写入面与时点。
3. [Runtime/Work概念裁决](../../architecture-runtime-canon.md)及[实际架构](../../architecture.md)：target与implemented分开；DEC-013是裁决入口。
4. [F1–F5合同](../architecture-reconciliation-2026-09-11.md)：每图问题、正确关系、复用与禁区。
5. [Design正式返回裁决](../../design/se-control-one-shot-2026-09-11/return-intake.md)：DG/DR、八轴grammar与四处真实错误；旧画布以本裁决修正。

## L1 · 按工作面精确读取

| 工作面 | 入口 | 消费方式 |
|---|---|---|
| 现Pages资产与嵌入 | [site README](../../../site/README.md)、[figures.json](../../../site/src/assets/figures/figures.json)、`site/src/page.mjs`、`site/src/assets/` | 先定位当前图和挂载，再决定复用/修订/新增；registry是现资产目录，不是架构真源 |
| F1/F2/F3 | L0架构与图合同、[Work Core contract](../../../docs/work-core/contract.md)、[runtime foundation](../../../app/docs/runtime-foundation.md) | 只读图中涉及的owner/控制/commit条目，不把目录名当实现层次 |
| F4与五拍 | [Design DG-08](../../design/se-control-one-shot-2026-09-11/return-intake.md)、现anatomy-instrument/state-to-commit图、[Spark命名裁决](../../design/spark-surface-2026-09-10/naming-reference-2026-09-11.md) | continuity与产品故事分别回答问题；自动重建/续行无已交付证明 |
| F5与SE措辞 | [架构组合词表](../../architecture-runtime-canon.md)、根PAPER.md | Schema/Contract/Expert是组合，human expert另词；不改SE原件或固定Paper版本 |
| App截图、局部控件引用 | [frontend-contract](../../design/agent-interface-2026-09-10/frontend-contract.md)、其precedent-map相关行、[Chat阅读合同](../../design/chat-reading-2026-09-11.md) | 仅按引用的控件读最近先例，不将Pages campaign字体/布局反向注入产品 |

## L2 · 参考与待核验层

[DeepSeek/Visual Compilation原始包](../../research/deepseek-runtime-2026-09-11/README.md)保存源与逐项处置；其架构回答末尾截断，不猜补。Kami、LikeC4、Structurizr、Oh My Design等为REFERENCE，未因列入索引完成选型或许可核验；本单不安装新框架。

[早期visual semantic registry](../publishing-visuals-2026-09-10/visual-semantic-registry.md)保留其草案身份，与后续正式裁决冲突时以后者为准。原始7页/19板是审阅输入，不能成为当前pixel baseline；修正版若收到须另存hash并保留旧包。

## L3 · 证据与退出

- [正式Design实拍审阅](../../../evidence/se-design-return-20260911/visual-review.md)：采样范围、排除截图与未跑项。
- [已发布f137媒体回执](../../../evidence/semantic-polish-merge-20260911/publication.md)与[媒体manifest](../../../site/media/main/manifest.json)：真实截图来源，不代表后续新设计已实现。
- [Runtime文档作者验证](../../../evidence/deepseek-runtime-intake-20260911/README.md)：独立架构review尚未到达，不能当独立接受。

最终输出应让Astra只需检查图与claim/source差异即可接收，不要求重新阅读所有历史聊天。未决语义逐条列在返回单，不能埋在SVG或改词来绕过。

## Pages设计粒度 · 用户追加裁定

F1–F5已冻结的是问题与语义边界，不是要求所有发布图都画成工程框线。Claude需要消费现有可编辑原始资产，为选定关键段落提出2–3个真正不同的构图候选，保持同一claim/事实集以便Astra比较；不是只换颜色或圆角。Astra选定后再扩展整组。

- 工程说明图：保留可追查的节点/边/owner与成熟度，允许局部展开；F1/F2可作详细阅读，文件名与Pi实现说明留工程面，Pages用独立精简文案。
- 产品叙事图：围绕五拍的来源变化、过期、定位、判断、继续，采用序列、局部放大、前后状态对照或关系展开；不将五拍重复画成五个框。
- 抽象意象：继承Matter纸面/派生分支、Attention汇聚/提升、state/context投影等已有语汇；可变形、分组、留白或局部动效，但不得模糊候选/正式效力或把红色当装饰。

Attention红是稀疏的注意/判断焦点，按每幅图任务与已裁规则决定，可无红；不机械规定所有图都有红，也不强制将一组多个独立图共用一个红点配额。红需有文字/形状等价线索。纯系统机制图不因画了Review就默认加“待人处理”的红点；人类Review实例可明确其对象/场景。

每个候选先交claim、借用的现资产、抽象程度、读序、红的含义、静态完整图、最小尺寸与可选motion理由。工程图与发布图可以共用语义源、分别持view源；选中的风格不能反向改变架构词表。CR-05用户消息截图是App阅读参考，不能拿来约束Pages campaign编排。

## 已核验的现资产 · 构图起点

| 类型 | 实际源码 | 可借用关系 |
|---|---|---|
| 工程回路 | `site/src/assets/diagram.svg`（registry state-to-commit） | state/context/proposal/candidate/review/commit与下一Run；适配F2/F4 |
| 工程plate | `site/src/assets/figures/pipeline.svg` | Store/Govern/Retrieve/Compile/Run；不机械复制其box-and-arrow到所有图 |
| 双原子故事 | `site/src/page.mjs` productAtoms，`site/src/site.css` atom规则 | source一对多derived；signal汇聚与Attention目标，适合不同后果的对照 |
| 抽象Hero | `site/src/page.mjs` fig-00 archive-stack，`site/src/site.css` archive-stack规则 | 三张纸source/candidate/Matter；候选虚线关系可复用，不改变现Hero |
| 研究意象与编排 | `site/src/assets/figures/spark.svg`、`attention.svg`、`roles.svg`；page.mjs long-work | 可退出derived层、threshold汇聚、可替换method与Matter；双原子后展开故事 |

这些先例由Luna逐路径核对，选择与最终视觉判断归Astra。按figures.json当前规则每幅图最多一个稀疏红焦点；多个独立图不共用页面配额。静态与reduced-motion必须完整；如选motion，另外消费相关motion合同。
