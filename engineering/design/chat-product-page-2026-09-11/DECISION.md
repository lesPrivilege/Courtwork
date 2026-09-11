# Astra · Chat独立产品页面裁定

2026-09-11，基线 `8250bac1a30bdcc049a75c145ec1525131b726e6`。用户明确要求：Chat进入产品面时，应有与Spark、Attention同级的页面及专门视觉设计；Astra先写定裁决/定义，Luna索引此前Design消费链，再由下一笔Claude串行增量绘制与施工。本单替代先前“只补一个导航按钮/局部文案即完成Chat”的交付范围，不提前实现后端。

## 产品定义与承诺

**Chat 是人主导的连续对话入口，让讨论有机会被保留、引用、携带并交给工作执行者。** 用户选择交谈对象，形成想法与判断；长期产品价值是减轻不同供应商客户端造成的对话历史、身份与记忆割裂。Chat产品不绑定某一家网页、API或runtime拓扑。

Attention围绕跨工作的变化、对象与判断；Spark围绕来源和可持续的派生工作。三者同级是产品目的与入口地位，不表示三个agent人格、三份事件库或三套runtime。Matter仍持有工作对象与正式状态；Provider拥有其原生能力，Runtime执行、Review/Authority接受的责任不交给Chat页面。

Chat谈论一个意图不自动产生正式决定或文件副作用。观察到Provider回答不等于取得完整trace、权限或已验证成果。所有可执行动作依真实capability和既有owner合同；没有后端就不显示可用的Capture/Handoff/Memory状态。

## 两个交付面

| 面 | 本次必须交付 | 当前能力边界 |
|---|---|---|
| App Chat页面 | 左侧与Attention/Spark同层的入口、独立完整页面、清楚标题/目的/规划说明、宽窄与浅深设计；可返回既有普通聊天与工作，不吞并Attention或将其弹窗改名 | 当前为前端预留，不接外部Provider、不新建本地Conversation/Memory schema；不能用普通coding session伪装跨Provider Chat |
| Pages Chat产品展示 | 专门Chat产品画面与独立叙事，说明持续交谈→引用/携带→交接的用户价值；按既有发布壳增加独立 `chat.html` 并从合适的产品入口可达，Home是否加入第三构图由同包整体编排决定 | 以清楚的产品方向/设计预览语境呈现，真实样例标明；不在Features已实现功能表勾选跨Provider会话/Memory；不冒称真实产品截图 |

当前site并无独立 `spark.html`/`attention.html`：它们已有Home双原子与Tour段落。同级要求指同等完整的产品理由、视觉质量和入口地位，不虚构已有路由，也不为了对称额外重造两页。新增Chat页消费现有product-pages壳/nav/footer/build登记规则。

App预留页用成熟的页面编排表达未来价值，避免堆满disabled Provider、Memory、Handoff开关。可使用非交互的结构示意或明确标记的设计样例；若没有真实聊天数据则保持规划空态，不能伪造已连接账号、已保存对话或后台运行。与现有项目聊天的区别和返回路径必须易懂。

## 增量设计合同

先读[参考消费索引](reference-index.md)，再消费[产品理由](../../research/chat-attention-2026-09-11/product-rationale/README.md)、[Design正式裁决](../se-control-one-shot-2026-09-11/return-intake.md)及[前端连续性规范](../agent-interface-2026-09-10/frontend-contract.md)。源图和历史golden不自动成为当前接受基线，后续Astra裁决优先于原作者标签。

- 原样继承已裁的字体角色/级差、网格与留白关系、冷灰材质层级、控件密度、边线与图形尺度、focus/selected/Review语义。禁止另加陌生的气泡组件库、渐变玻璃风或品牌图标族。
- Chat有自己的视觉主语：连续对话及其可携带/引用的片段。Spark的source→fan-out与Attention的streams→ring继续归原产品；不复制二者的图形再换标题，不把Chat画成另一个Review队列。
- 采用同一画板系统增量补画：App主页面、Pages产品主画面、与Spark/Attention三面并置。交可编辑原生SVG/HTML源、宽/窄构图、浅/深适配和文字等价说明；不只交孤立PNG。
- 单红diff属于修改展示语言；可以按其既定范围出现在Settings/Pages，但不强迫Chat页面成为红色diff展板，也不将品牌红赋予Chat身份/在线/权限意义。
- 作者可在一份既有方向上提交精修主案和有明确理由的局部备选；不重开全站/整套App视觉选型。增量设计先形成可审阅画板，再沿同包串行实现；仅遇未定语义冲突回到Astra，常规排版无需逐项再批准。

## 消费与验证

Luna只负责源索引与消费等级；Claude负责设计及同包前端施工；Astra独立裁定/集成。作者不能宣称独立接受自己的画面。

返回材料含：每一视觉决定的最近先例/源坐标、继承和改变的grammar、App/Pages完整场景、1440/1280/390浅深、键盘/返回焦点/200%/reduced-motion与必要forced-colors，真实和模拟分别标注。新增路由/build/links检查、前端相关行为和源manifest/hash随包返回。设计preview与真实功能清楚区分，不靠一行脚注抵消整个界面的假可用暗示。

本轮写定定义及施工合同，不直接实现App/site或发布。发布收尾队列为单红diff与Settings、Chat专门设计及前端/Pages、既有工程图局部修补、必要回归与最终发布验证；DR-02–05及runtime未闭门继续单列，不因页面齐全自动接受。

## 工作场合叙事补充

用户最新明确Court指有机协作与正式编排下的工作场合；[Astra Work优先裁定](../../release/work-first-narrative-2026-09-11/DECISION.md)为发布定义入口。Chat专门设计不做人物扮演/律师工作流，不添加法庭符号或剧情。场景先解释人的工作目的，再逐步引出术语；已有NDA仅是应用示例。
