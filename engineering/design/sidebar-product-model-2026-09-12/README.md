# Sidebar · 产品模型优先的审阅与探索

2026-09-12 · 用户要求Expert icon前端注入，后端保留后续计划；随后要求扩展sidebar review/explore、Runtime自然语义与Expert区分，并明确“优先从第一性原理出发和产品面定义，而非工程面”。本页按该最新优先级消费参考图。Astra做产品裁定和实际界面检查，Luna分别探索Expert形象、产品对象/Runtime边界与首页发布口径。实现与仅探索项分开记录。

## 从用户的工作开始

用户来到Courtwork，是为了把一项工作交代清楚、推进下去、带走可继续使用的成果，并在关键处掌握判断。导航帮助他回答：从哪里开始、上次做到哪、哪里需要我、怎样获得合适的帮助、结果在哪里。

因此，一个模块在架构中存在，不构成一级入口的理由。先定义用户可以理解且能兑现的任务与对象，再让架构支撑它；内部owner、生命周期和权限是验证承诺的依据，不是导航目录的模板。提升“语义层级”也不等于增加顶级按钮：同一需求下的多个设置可以聚合，一个混杂页面也可能需要拆分。

Expert的产品问题是“如何获得可重复依赖的领域专长”。它应让用户理解擅长什么、适合什么任务、如何协作及结果如何判断。仅保存模型、工具和上下文的配置，尚不能回答这些问题。图标可以先形成角色形象，产品承诺不能靠图标建立。

## 当前界面审阅

1. **主导航：入口可读，但开始动作重复占高。** [原侧栏](../../../evidence/expert-sidebar-glyph-20260912/before-1440.png)将New chat、Home、Chat、Attention、Spark各占一行；新增Expert后，任务入口与产品身份继续挤占项目空间。Home与New在代码上分别返回首页/创建会话，因此按用户后续要求合在同一行，保留独立动作与名称，不把“返回旧草稿”改称“新建成功”。
2. **能力准备：现有内容跨多个Settings分组。** [Models实页](../../../evidence/expert-sidebar-glyph-20260912/audit-models-1440.png)首先是Connections，而不仅是模型选择。用户目标是连上可用的帮助、选择适合当前工作的模型；这适合自然任务语言，未必值得同时增加Models和Connections两个sidebar入口。
3. **Runtime：工程诊断直接进入主阅读层。** [Developer实页](../../../evidence/expert-sidebar-glyph-20260912/audit-developer-1440.png)先出现adapter、requested/effective/bound、exposed资源与配置层。高级诊断需要保留，但用户配置“怎样工作”时不应先学习这些内部关系。可以把日常配置组织到产品面的Customize/自定义中，并把精确层级、来源和记录放在高级详情；不是把整页标题Runtime简单改名就完成产品化。

以上检查使用独立空数据实际App，而非用户工作区数据。访问Settings仅观察本地测试连接，不配置或调用真实provider。截图支持本次可见结构判断；不声称竞品完整行为或全部可访问性合规。

## 参考图取用

[Codex](references/01-codex.png)、[Claude More](references/02-claude-more.png)、[Claude Projects](references/03-claude-projects.png)、[ChatGPT](references/04-chatgpt.png)原图及hash保存在[source manifest](source-manifest.json)。它们展示的共同方法是让用户能识别动作、对象集合与低频自定义入口，项目/最近工作则单列。

采用这种组织方法，不照搬栏目数量或品牌产品名。Artifacts/Library只有在用户能稳定找回成果时才成立；Scheduled只有在用户能查看、修改和停止未来安排时才成立；More不是暂存所有未想清楚功能的篮子。参考截图不证明Courtwork已经具备这些能力。

## 本轮实际施工

[Expert Quiet profile与接入](EXPERT.md)：App静态Expert / Planned行、原创侧影glyph及完整生成链，后端与Pages glyph不变。按用户追加要求合并Home/New为一行，Home仍回首页，尾部New chat保留独立创建动作；用户随后纠正为只扩宽hover范围：新建按钮横向44px、桌面高32px/窄屏44px，向内收4px；图标保留原18px，不增大。相邻导航间距4→2px，其他主导航仍32px、窄屏44px；不缩字号。桌面相较加入Expert后的两行Home/New方案回收44px，窄屏回收56px。

其他sidebar对象与Runtime仅在此探索，未批量新增目的地、改生产名词或把后端能力标为可用。首页文案/红色若施工，另在本目录记录准确发布来源与角色用途。

## 产品对象的提升建议

| 用户问题 | 产品面 | 当前与建议位置 | 架构核验只承担的工作 |
|---|---|---|---|
| 从哪里开始、上次做到哪？ | Home / 首页；Projects / 项目 | Home与New同行；项目保留为具体工作集合 | 保留草稿、项目/会话选择与真实创建行为 |
| 我想把一个问题谈清楚 | Chat / 对话 | 明确的对话入口 | 不把所有Agent运行、Attention会话都改称普通Chat |
| 有什么重要变化需要我？ | Attention | 持续留意并协助处理变化；保留其助手入口，待处理清单是它的一个视图 | `attention.agent`与`attention.queue`分开，未知/静默不生成假待办 |
| 把眼前的小任务迅速处理好 | Spark | 轻量处理入口；产品定义含整理、抽取、分类、翻译 | 当前source/derivation能力与未来能力分开，不能因新文案新增假操作 |
| 这类工作应该找什么专长？ | Expert | 当前静态身份；未来以专长、适用任务与协作方式组织 | `agent_profile`仅配置底座，不能自动被发布为领域Expert |
| 怎样让助手按我的方式工作？ | Customize / 自定义（产品组织方向） | 可把日常连接、工具、技能、指令与工作配置组织成自然任务面；暂不新增一级槽位 | 复用Settings真实能力，精确policy/scope/source/effective/bound放可展开详情 |
| 工作产生了什么，能否找回来？ | 成果 / Library（待产品定义） | 先改善项目内成果可找回性；跨项目稳定索引成立后再考虑集合入口 | 不把文件树、任意tool output或capture图直接冒充成果库 |

Runtime不需要一个万能新名字。连接与模型回答“用什么服务”，工具与来源回答“能用什么材料和操作”，指令与上下文回答“怎样理解这次任务”，运行配置回答“这套组合如何复用”。Expert则回答“能把哪一类工作做得可靠”。这些是不同用户问题：可以相互关联，不应互相改名。

Luna只读核验main 1b8bd3c的index/app导航、runtime-view工作台和architecture-runtime-canon：Settings现有连接/配置/工具/指令/权限可消费；Expert完整定义、验证与发布还未形成可用产品。精确诊断继续留在Developer与当前工作详情，正式scope/权限仍由原owner决定。本段为产品探索建议，未更名后端实体、未移除高级诊断、未批量改sidebar。
