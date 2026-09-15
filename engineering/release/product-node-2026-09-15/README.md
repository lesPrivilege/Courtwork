# 可接续的工作场 · 公开节点消费

2026-09-15 · Astra裁决与文案实现，Luna只读探索。起点为实际main `e8f02dd1152acc9e184a43afdba28f6138921bff`，工作树干净；在隔离分支施工，不改在途RD-006树。

## 输入与责任

用户要求消费《审阅并裁决研究文档》，由Luna explore、Astra裁决。[完整读取快照](input-conversation.json)来自会话 `6aa8ee9b-b988-83ec-aef5-d417743b839b`：1 turn、2条消息，hasMore=false，attachments为空。首次读取未返回附件，用户随后补交两份Markdown及七文件补丁，原字节保存在[裁决原稿](inputs/research-ruling.md.txt)、[产品方向原稿](inputs/product-direction.md.txt)和[原补丁](inputs/product-node.patch)。已在固定基线的独立Git index完整应用补丁，两份新文档与附件逐字相同，见[校验结果](patch-validation.json)。最终采用稿由Astra修订；原稿中的“不合main”、403与局部检查只记录原交付时点，不当作当前命令或当前执行结果。外部Exa结果仅为转述，未作为本轮采用新依赖或外部能力事实的证据。

受影响责任为产品方向、公开文案与工程接续索引；Astra持裁决/整合，资源、Host、Runtime与Core的事实owner不变。最近先例是[Work-first叙事](../work-first-narrative-2026-09-11/DECISION.md)、当前 `site/src/readme.mjs` 的 `renderReadme`、`copy.mjs` 的Hero/Review与 `product-pages.mjs` 的Features/Chat。复用当前页面结构、生成链及截图，不新建产品交互。受影响grammar为UX-01独立承重、UX-08事实与接受分开、前端连续性规范中的资源维度和返回语义；不改控件、动作、token或布局规则。

拟交付：公开声明下一节点，二级文档冻结有限形态与语义，逐项处置接原owner；不以宣言替代功能完成。退出证据为源码审阅、README生成同步、Pages构建/链接/材质检查、仓库文档链接与实际页面文案目验。产品测试、付费provider和迁移不属于本次文案变更。

## 裁决与原单接续

## 本轮上位裁决

**采用“可接续的工作场”作为下一实现节点的产品合同。** 以从问题出发、连接材料、执行、检查和回来继续的闭环收敛；不以完成一个编排平台、增加 Agent 数量或支持所有 Runtime 为目标。

本次是 DEC-014 的产品语义补充，不另立架构层、状态总账或平行 roadmap。[产品方向](../../product-direction.md)承接稳定语义；实现及证据仍由原服务、原 RD 和原任务持有。文档中的采用不构成产品验收。

公开叙事可以明确写产品职责、设计承诺与下一节点。此前各研究单“不进入本次公开面”的编辑范围由本次用户请求覆盖；其未实现事实、授权限制与验证义务不随之改变。对外不逐段附加“尚未实现”等保护性旁白，也不把目标伪装成已发布版本、可点击功能、客户使用或已测性能。

优先级为：工作对象与效力规则 → 用户任务和可接续路径 → 稳定交互语义 → 服务责任与接口 → 局部技术/Provider 选型。后者若与前者冲突，应返回原责任方裁决，而不是先施工再倒改产品定义。

## 研究提升与分流

| 已入账来源 | 本轮处置 | 公开与二级文档 | 后续仍归原 owner |
|---|---|---|---|
| [五层架构](../../research/architecture-node-2026-09-13/architecture.md)、[Substrate](../../research/architecture-node-2026-09-13/workspace-substrate.md) | 提升工作现场独立于单次执行、材料与工作效力分责 | README 开篇、工作如何衔接；product-direction | DEC-014、Runtime/Work canon、原资源/Core owner |
| [Spark/协作增量](../../research/spark-explore-2026-09-13/coordination-20260915.md) | 采用稳定 Spark / 临时 Explorer / 可替换 Provider 的最终区分；少职责、有界结果交接 | README Spark 段、角色与委派语义 | RD-005、Spark 原设计；MA-06/ME-09 评测 |
| [合理遗忘](../../research/chat-memory-broker-2026-09-12/attention-governance-20260915.md) | 提升保留/召回/激活、适用性和可追溯降权；不提升“全量 Memory” | README 保留与接手、Pages 叙事；二级资料语义 | Memory Broker、BE-19/20、LG/RG、RD-007；实现非当前节点前置 |
| [Gateway](../../research/review-surface-2026-09-09/presentation-gateway-20260915.md)、[多源投影](../../research/review-surface-2026-09-09/projection-runtime-20260915.md) | 提升异构 Chat、受限 grammar、同实例多 placement、动作分责；先 facts | README 执行与检查；二级呈现合同 | 原 Presentation / Review Surface，Runtime/Core 动作各自原 owner |
| [延迟绑定与真实仓库](../../research/RD-006-deferred-workspace-binding.md) | 采用 task-first、组织/资源/执行权限分轴；保持 9月14日真实读写施工增量 | 下一节点“开始与连接” | BE-23/DWB-05 与 DWB-01/02/04，不能把只读交付算完整读写 |
| [Object Command](../../design/object-command-grammar-20260914.md)、[UX Grammar](../../design/ux-grammar.md) | 稳定对象命令、出现条件/可执行性、导航与业务撤销分开；不因新功能重绘一套控件 | 二级形态与控制面语义 | 原前端合同与具体对象/命令 owner |
| [Chat 运行态](../../design/chat-flow-2026-09-10/polish-slices-20260914.md) | 保持主对话连贯，Run 聚合与动作时机优先；动效不伪造过程 | README / 二级 Chat 语义 | 原 Chat 分片；不将 Copy/Composer 已交付扩大成 Run 聚合已完成 |
| [Agents API 候选](../../research/agents-api-first-2026-09-14/README.md)、[Runtime 替换](../../research/architecture-node-2026-09-13/runtime-replacement.md) | 替换能力按合同验证；保持 Agents API 优先核验候选，不自动声称已选定可用执行后端 | 二级可替换执行；品牌/SDK 不占公开主叙事 | P03/P04/DRT-03；第二 Runtime 不阻塞当前 dogfooding |
| [独立评审](../independent-review-2026-09-14/README.md) | 生命周期依赖与领域专用分支按真实下一消费者消债 | 二级责任原则，细节不进 Hero | IR-03/04 回原任务；不设全面重构前置 |
| [工作义务闭环](../../research/obligation-closure-2026-09-12/README.md) | 提升未完事项、人的决定与接续；不承诺常驻监控/自动关闭 | Attention 与回来继续 | 原义务/Core/Attention owner；scheduler/watchers 后置 |

外部 Provider 性能排名、吞吐百分比、端云脱敏收益、闭源产品内部机制与“新颖/领先”判断不进入产品宣言。局部选型可以进入 RD，只有固定实验能支持实验结论。

## 下一施工节点：原单组成的真实闭环

本表只是原工单的消费顺序与结果映射，不新发编号、不改各项接受权，也不覆盖 current 中更新的真实交付。

| 顺序 | 有界交付 | 消费既有任务 | 应当留下的证据 |
|---|---|---|---|
| 先收束在途 | 真实仓库连接、受控读写与可见范围；普通 Chat 身份和资源绑定分别接续 | RD-006 / DWB 与原 BE-23；保留当前隔离施工树 | 身份不变、越界/撤权/源冲突拒绝、未知写入不盲重放；GUI 与原回执一致 |
| 真实工作贯通 | 读仓库→获准修改→固定 recipe 检查→在同一工作流阅读结果 | DF-04 / [RD-009](../../research/RD-009-trusted-harness-extensions.md)，沿[Harness实施入口](../harness-implementation-2026-09-12/README.md) | CW 内部的真实执行证据，不把外部 Agent 代跑测试算成 CW 能力；取消、错误与重复请求可解释 |
| 同路径可读 | Run 聚合、真实文件变化、精确来源 Preview；facts 从 Host 到 Chat/Preview 的最小纵切 | Chat 原分片、Presentation / Review Surface | 原件可读、同实例/版本一致、未知 renderer 文字回退；提问/权限/接受不串路由 |
| 准备与再接手 | 已有 Spark 有界结果在工作中被引用；中断后回到成果、未决事项及下一动作 | Spark 原合同、原 continuity / Attention 路径 | 精确源版本、读取/消费分列、旧结果不覆盖新 basis；记录存在不自动接受或自动恢复进程 |

节点收束需要上述真实路径按原验证合同成立；“公开宣言写完”只完成方向登记。不另增 G 编号。普通 Chat 不必成为 Matter；涉及正式工作效力的切片继续走 Core 原 Candidate/Decision 及 G1–G5 等相应检验，不能以 coding 成功代替。

chart、flow 各一例是 facts 之后的优先消费者，不要求所有 family 同时交付。第二 Runtime、完整 Memory Broker、用户通用 Notes、跨会话自动召回与独立 Spark Provider 是后续独立增量；Swarm、自动 GC、企业 serving stack、任意生成 JS、全面 UI framework 迁移不加入本节点。


### Astra对候选的调整与保留

- **adopt**：产品方向原稿的六类职责、保留/召回/激活、异构呈现与动作分责，按原owner合同消费；源稿改为当前裁定入口。
- **adjust**：Spark公开文案保留准备、探索、核对和精确引用；“维护派生索引”留原资源/派生合同演进，不把已有notes/findings扩大成全域索引维护。产品方向补明Agents API优先候选及Pi当前责任。
- **adjust**：七文件文案之外，同步 `site/src/product-pages.mjs` 的Features架构引言与Chat Spark段；既有页面结构/图示不重绘，删除旧先后叙事与角色混写。另在DEC-014/current/release入口登记，避免孤立交付。
- **adjust**：原稿的外部复核结果保留为输入作者的陈述；本轮没有重做Exa检索，不把SDK版本、托管协议或性能转成已核验事实。架构采用依据为已有仓库合同。
- **reject**：以来源存储吞并为Core职责、Spark常驻等于自动后台、普通阅读触发正式Review、完整Memory/第二Runtime作本节点普遍前置的推论；这些均与原owner或有限消费者边界冲突。
- **defer**：Swarm、破坏性自动GC、通用生成界面/云调度、性能排名和全面重构，回原RD与具体消费者/实验，不增本节点完成条件。

原工单接受权与串行规则保持：RD-006每片作者交付后非作者Luna核查，再发下一片，GUI加人类目验；本单仅确立方向，不启动其余产品施工。


## Luna探索接续与Astra处置

Luna只读核对固定 `main@e8f02dd`、完整会话、两份原稿及当前原owner；没有外网复核、文件修改或独立产品接受。其八类建议与上表对应，以下逐项收束额外发现：

| 探索发现 / 建议 | Astra处置 | 采用位置或理由 |
|---|---|---|
| Work Core不吞并字节；工作现场先于执行 | adopt | 产品方向首段补各自owner，公开来源服务/Core分责；接DEC-014 |
| Spark稳定角色、已有串行Assignment/notes/findings；无通用维护/后台 | adopt | README/Chat详页消除Explore等同，索引演进留原合同 |
| Host校验与前端布局分责 | adjust | 产品方向拆出Host身份/版本/数据/权限校验，前端在获准grammar及Host约束内布局；动作回原owner，不冻结新协议 |
| “首个完整消费者”应明确是下一节点 | adopt | 产品方向补“下一节点”，防止被读成已发运支持 |
| Review应保留Candidate语义 | adopt | Proposal改“待检查的候选成果或修订”，不混同正式已接受成果 |
| BE-23/DWB-05已实现，DWB-01/02/04与DF-04仍开放 | adopt | 本节点不重做projectless Chat；先收束真实仓库和内部recipe，证据沿原单 |
| 旧架构/迁移文稿写schema13/14，建议同步 | adjust | 原文属固定旧时点，不改历史；当前入口继续Host15/Core4/bridge5。下一真实迁移由RuntimeStore owner更新当前合同 |
| 保留已批准tagline，补Features/Chat漏项 | adopt | 保留Orchestrate/Govern口号；删除“先后”解释及Spark=Explore混写，未改版式 |
| 原稿包含导航/定价/CSS/Release→Download重做建议 | reject（来源归因） | 两份已交原稿与补丁中无此提案，不能登记为用户需求；本轮本就无相应改动 |
| Memory/Presentation/Agents API/性能不得由讨论升成能力 | adopt / defer实现 | 原RD/评测保持；第二Runtime优先候选不阻塞当前闭环，外部性能与SDK能力未重核 |

## 验证与交付

Astra作者检查：Pages构建、README同步、Pages本地链接与材质、全库文档链接、目标模块语法和diff空白检查；精确结果见[检查日志](verification.log)。暂存后全量空白检查标出原补丁的标准空上下文行（单个空格），为保全来源字节不修剪；采用文档的尾部空行已修正，排除该原始patch后的暂存diff检查通过。原补丁仅在独立index验证，最终采用稿有意不同；未在已编辑树强行覆盖原补丁。

实际IAB目验：1280×720首页、390×844首页/Review/Features架构/Chat Spark相邻段，以及1440×900 Features架构。新增文字完整可读，首页390宽文档宽度390，无页面横向溢出；原架构大图继续在独立可滚动图框中呈现。Chat键盘沿原链接离开，文案与下一段相邻关系可读。视口已恢复。没有改变CSS/控件/状态，未重跑深色、200%缩放、读屏、空/失败/处理中或产品运行矩阵；这些不记为通过。浏览器图像为作者即时目验，未改固定媒体或宣称非作者视觉接受。

不变范围经Git差异核对：`app/`、PAPER、release.json、媒体manifest、历史截图、依赖锁与既有实验记录均未改。Host15/Core4/bridge5、SE9.6、产品媒体/安装fd96f96沿原登记；本次不新增支持能力或升级发行来源。无产品测试、真实provider调用、个人数据迁移或外部检索。

本次交付为本地文档与公开源码提交；不创建远端PR、不push或部署Pages。主线合流前重新核对HEAD与工作树，只允许保留并行修改的快进接收。Luna探索范围与Astra处置另见本页探索接续，不将作者检查写成产品独立接受。

输入SHA-256：

- 会话快照：`4d403353c8ddc2f1f10034f89fe8fe9a5ea7db32568d294fd906a745ca3c22fa`
- 产品方向原稿：`03fcc63f4bd6f0991efaaa3900742b2a965cfb20c1d274bb88469d00a0e83a16`
- 裁决原稿：`23b9164e3c241c9509398c86a5910b5ee305844a1f54aa9a4ea95f3c9b8d1a37`
- 原补丁：`038ab1c19f10bdf4a018e549abb9e8660fc6bb959a5cb9838db323914278ba14`
