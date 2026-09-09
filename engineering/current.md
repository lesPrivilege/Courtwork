# 当前工程状态

更新：2026-09-10。唯一开发入口为 `Courtwork`，主线 `main`。本次Attention后端合流读取main基线 `fa90763a4da1cdede47778b6487c801c0acb74cc`；此前合流已接收 Harness Core `d6247a8`（代码 `1332691`）与 Fable 文档 `99a9279`，实际合流证据见 [清洁节点回执](../evidence/harness-main-integration-20260908/README.md)。实际接单前重查HEAD与工作树，不按历史fresh/current路径继续。

## 本轮责任与完工节点

用户指定：**Claude Opus建立README/Pages；Astra负责current、架构、契约与下一轮派单。完工以足以修订resume并公开Pages的产品证据为准。** [本轮派单](execution/2026-09-08-main-round/README.md)已形成，[G1–G5完工条件](execution/2026-09-08-main-round/public-readiness.md)尚未满足，不以本轮文档交付或main接管关闭。

Core主单已交付：[Fresh Astra：通用Harness Core＋首个NDA场景](execution/2026-09-08-main-round/fresh-astra-core-handoff.md)，整合H0–H3进入实际实施；Fable在分支从前端逆向。Core允许从样本提炼通用owner，保持单写者并复用Pi运行循环；BE-5/完整Workbench后置。fresh指新任务上下文，不指退休目录。

| 面 | 本轮实际状态 | 下一步与owner |
|---|---|---|
| 对外口径 / README / Pages | PS-24 与 public-copy-v2 准备包已合流；WO-PS-01 仍待正式回执，主线尚无新 site/workflow | Astra 接手回执复核；按 [当前发布面批次](release/publishing-surface-2026-09-09/README.md) 接收 PS-01，再处理 PS-02 |
| 通用工作面 / Workbench | CC-D0-a 与 r4d 5b4c981 已合流（4f7278f），验证与归因见页末 | Astra 接手清账；后续 FE-05a → FE-05 → ATT-FE-01 → CC-I；[第五轮工单](mvp/execution/work-surface-kit/work-orders/WO-CC-round5.md) |
| 领域主链 | ES-01文件候选与Attention后端已合流（当前Core3/app4，GUI待）；H0–H3后端已实现：单一Core、NDA规则/候选/决定、来源历史、跨Session/删除保留、producer缺席读取 | Fable消费冻结契约；Review与续行GUI已通过合成浏览器复验；真实运行纵切仍待，不关闭G2/G3 |
| Runtime来源 | Runtime R2纯声明解析模块已合流；无HTTP/UI/model工具，locator获取未实现 | BE-5服务接缝单可接，串行避开H1的service写权；不阻塞最小公开纵切 |
| 真实模型 | 最终联调与远端clone使用local-fake/loopback；真实provider未跑 | 沿用户GUI配置与授权补G1/G2；不读取凭据、不假定现成配置 |
| 旧实现召回 | 已冻结并完成15条Luna只读索引，15/15路径核验 | 从 [召回索引](ecosystem/legacy-recall-index.md)定向读SHA/path，不默认继承旧代码 |
| Benchmark / SE 连续性 | Pro指出旧评分盲区与Context续行边界；现已修复观察关系/角色/raw绑定，E与普通S各六条开发符合性通过；Context v2引用+分页读与HTTP局部续行通过 | [Pro处置/证据](../evidence/pro-review-remediation-20260908/README.md)、[协议](research/se-continuity-2026-09-08/README.md)；D1/D2有界独立复核已完成，合流应用183/183与smoke通过；下一步冻结S/E差异与独立任务，后做有界模型pilot；真人/法律质量后置，不关闭产品门 |

Harness Core交付 `d6247a8` 已接收：代码 `1332691`，作者170/170与smoke通过，Core/adapter/abort与收尾恢复非作者复验有界通过，原始来源消费、Paper历史映射与Pro逐项处置见 [交付证据](../evidence/harness-core-20260908/README.md)。Pro初审针对旧 `e0d214d`，本轮修复收尾误报成功、未知结算恢复、partial tool事件与底层abort窗口，不冒充Pro已审新分支。

Fable文档交付 `claude/fable-settings` `99a9279` 已接收：WK-83按两分支合流后的清洁main开工，前端单一writer串行，WK10b第二段进入序2。Paper9.6、MIT与首屏文案既有裁定保留；Core历史9.3证据不重标为9.6验证。该清洁节点遗留的修订动作声明与renderer准入由下述Astra接缝单补齐；实际renderer由Opus第二段实现，其他新增静态路径仍由Astra串行处理。

WK10b第一段已接收：Opus代码 `84803ad`、作者回执 `f1ef5ae`、Fable复核 `d408961`，与main `7941bdb` 无冲突合流。Astra复跑浏览器22/22（含FE-T05/T07）、覆盖态5/5、全量174/174与smoke；合流时修正NDA renderer路径已声明但文件尚缺席的槽位失败状态，详见 [合流证据](../evidence/wk10b-main-integration-20260908/README.md)。第二段从本次清洁main建树。Astra后端前置交付 `codex/work-review-actions`，从同一main基线建独立树；版本化 `revise_candidate` 动作声明、NDA proposal schema与精确renderer准入已实现，代码 `3d97beb`，作者174/174与smoke通过，非作者接缝独验6/6；证据见 [本单回执](../evidence/work-review-actions-20260908/README.md)。该接缝已由第二段renderer消费，合成GUI证据见下；不关闭真实运行门。

WK10b第二段已接收：Opus实现 `e118992`、作者回执 `10f185a`、Fable复核 `a60187e`，与main `d879e2f` 无冲突合流为 `bf44b8f`。Astra复跑全量178/178、浏览器26/26与缺席/历史11/11（FE-T06/T08/T11），授权卡与取消补验见 [第二段合流证据](../evidence/wk10b2-main-integration-20260908/README.md)。WK-85受信renderer静态kit导入与conflict唯一着色按复核裁定接收；绑定面顺序已由WK13实现。BE-14决定时刻、BE-15事项标题/最近决定时间保持已登记后端请求，未实现、不阻塞本段。WK13已从该段清洁main节点建树交付，接收结果见下。

WK13 r2已接收：Opus实现 `f1875ae`、r2 `6de394e`、Fable复核 `a271d95`，与main `7a906a1` 无冲突合流为 `fbb18f1`；Astra在 `5fe8b38` 补入 `/web/presentation-adapters.mjs` 精确静态准入。合流全量190/190（183+7）、smoke、lint、contrast、Home浏览器46/46、三态4/4+2/2+2/2、既有几何4/4+4/4与Home回归7/7通过；[合流证据](../evidence/wk13-main-integration-20260908/README.md)分列作者、Fable与Astra验证。WK-86已实施：18vh留白退役、In progress为Continue集合可见名、两个只读adapter签名入契约。空态31vh（WK-11）原样保留，等用户裁定，不阻塞合流。WK12已从该次清洁节点建树交付，接收结果见下；新增静态路径继续由Astra准入，不扩大前端server写权。

WK12已接收：Opus实现 `7599a91`、Fable复核 `a2223e2`，与main `7982663` 无冲突合流为 `e2ec7f5`，保留Luna两单证据。无新增静态路径，未改server/runtime/core/runtime-view/home-view。Astra复跑全量204/204、lint、contrast、smoke、七支浏览器55/55（含FE-T09/T10与provider/key/lifecycle/绑定入口回归）；[合流证据](../evidence/wk12-main-integration-20260909/README.md)分列作者、Fable与Astra验证。WK-87保留This session行与当前内联首帧脚本；Appearance预览合一、用户skin接受前对比度警告（不阻止）随WK11实施。BE-16稳定工作区标识已登记未实现，偏好目前按origin分键；绑定入口异步焦点落body的既有缺陷仍记录在交付，不称修复。WK11从本次最终清洁main回执SHA建树，消费delivery-wk12 §10五组挂载点；空态31vh继续等用户裁定。

WK11已接收：Opus实现 `644cc43`、Fable复核 `3acff2d`，从main `14ebd61` 无冲突合流为 `f8643f8`；随后Fable第四轮文档 `19deb1e` 无冲突合流为 `54c0d24`。Astra全量208/208、lint、contrast、smoke与RC 20/9/36通过；FE-T03/T04及MCP unknown的实际范围见 [合流证据](../evidence/wk11-main-integration-20260909/README.md)。没有集成产品代码修补或静态准入变更。WK-98接受删除L2 Runtime面板，导轨卡打开Settings Runtime；WK-87两项已实施。Explain permission裸`null`与深链bootstrap 401竞态交FE-01首项，BE-13未复现仍保留。

第四轮WK-88…98与交接已进入主线。三项前置判断已定：恢复Chat用户词、Runtime移入Developer、Home以composer为唯一L1锚点；空态31vh退役随FE-01实施，覆盖此前“等待裁定”，不称已改代码。前端单一writer串行FE-01 → FE-02 → FE-03 → FE-04，材质/动效后置；BE-1/3、12、14…20按 [后端台账](mvp/execution/work-surface-kit/backend-requests.md)提供实际接缝，FE-02/FE-03未交付能力不画可用按钮。此处只接收交接，未启动新的执行会话；G4/G5等FE-01词表后施工。

FE-01已接收：Opus交付 `bfefcd2`、Fable复核 `2694001`，从当前main `a431650` 无冲突合流为 `6bdc6db`；随后Fable文档 `3eba008` 合流为 `ccc1076`，保留执行文件状态PR准备文档。产品词表、Settings九组、chrome与Home/Work composition已实现；WK-105六项裁定按 [交付§13](mvp/execution/work-surface-kit/delivery-fe01.md)接收。合流复跑212/212、两项lint、contrast、smoke、composition16/16与FE-T02/T09/T10反例12/12；新版RC与WK-98追加回归见 [本次证据](../evidence/fe01-main-integration-20260909/README.md)。Astra补修资源展开面把可选DOM的null写成文本的遗漏；该补丁当时为Astra作者验证；现由Fable在WK-106非作者复核接受（读码、212/212、WK-98回归10/10），不套用此前对2694001的接受。

FE-01节点交接时安排Fable以agent定义文件Low档派Opus FE-02，现已交付并接收，见下。第0项--nav 250→256附几何断言；Fetch models/Test connection现可消费下述BE-17/18固定契约，任意compatible/local provider的保存与执行仍未交付，不因探测成功画成可用。FE-03 Low、FE-04 Medium沿串行队列；FE-05按WK-104补本设备Reduce transparency等材质接缝。FE-01完成不等于public-copy已同步：发布面仍有旧Session/Ask/Write/Read词与旧截图基线说明，须按当前UI和证据另行更新后再施工README/Pages。G1–G5保持未闭合。

FE-02修订已接收：初版 `38717bd`、移除本设备display name修订 `a82c192`、Fable复核头 `565d18c`，与当前main `c529923` 合流为 `a9d1d15`；再合r4c `7026b09` 为 `2ab0193`。唯一冲突在backend-requests末尾，保留BE-17/18既有交付说明并加入BE-21/22，不回退后端接缝。--nav已256；Connections只画后端现有的一条，不以设备偏好制造连接属性；WK-107其余裁定按 [delivery-fe02§13](mvp/execution/work-surface-kit/delivery-fe02.md)接收。Astra组合版本全量219/219（FE-02修订218 + 主线provider preview 1）、两项lint、contrast、smoke、Models16/16、composition16/16；FE-T03与RC结果见 [本次合流证据](../evidence/fe02-main-integration-20260909/README.md)。无集成产品代码补丁、无新增allowlist。

FE-02节点按旧基线完成有界界面交付，当时Test/Fetch未接入且两句旧说明待更正；现由下述FE-03第0项消费并改正。不称完整Models连接工作流已验收。BE-21连接注册表（含display name与独立provider身份）、BE-22 MCP注册未交付；错误文案统一为FE-03后议题，尚未排期。该节点安排Fable派FE-03（Low），现已交付；FE-04用opus-wo-medium。public-copy及G1–G5状态不变。

FE-03已接收：Opus实现 `81390de`、交付 `fabfd22`、Fable复核 `f995778`，与main `386fbc6` 无冲突合流为 `6c77b54`；再合r4d固定提交 `00e33f9` 为 `f3d1785`，保留研究/设计包。BE-17/18已在compatible表单接入，结果只作目录探测显示，不注入Model、不保存配置；Chat/Work只读extensionBinding、Continue in Work复用原路由、Memory Off与Temporary chat均无控件。七项裁定按WK-109接收；BE-23无项目Chat创建仍待，BE-19/20/21/22不关闭。Astra全量228/228、两项lint、contrast、smoke及全部分配浏览器回归见 [合流证据](../evidence/fe03-main-integration-20260909/README.md)。

合流补验发现延迟探测回包会在地址/key/provider改变后重新显示旧ok；Astra补丁 `4b6aef4` 给结果加失效标记，改变表单后不消费旧回包，无新API或权限变化。延迟反例补前0/3、补后3/3，原探测8/8与Models18/18复跑通过；该补丁当时为Astra作者验证，现由Fable在WK-111独立复核接受（af95bcb：228/228、两项lint、延迟3/3、探测8/8、Models18/18），不套用WK-109。FE-04随后由Fable以opus-wo-medium派出并交付，见下。

FE-04已接收：Opus交付 `af29456`、Fable复核头 `4ac5ac9`，先合代码再合r4d固定头 `e8a950b`，组合产品提交 `ed9584e`；无冲突、无集成产品补丁、无新allowlist或依赖。Astra重跑237/237、两项lint、contrast、smoke、primitive11/11与FE-T07 6/6，见 [合流证据](../evidence/fe04-main-integration-20260909/README.md)。WK-115有界接收；Unknown实现、Inbox Home/End及两条列表role进入CC-S第0项，BE-30…33为待验接口，不称已有能力。下一单由Fable从最终main提交新建清洁树派CC-S（opus-wo-low），第0项显式修订Settings旧约，WK-116在派单时登记；本次未代派。

WK-112研究索引作为方法输入接收，WK-113/114为设计与候选接缝输入，画布仍待用户选向；必须一并消费 [r4d接缝评审](design/clean-cool-2026-09-09/r4d-review.md) R4D-1…6。合流已限定BE-28不得用临时probe冒充已保存配置健康；CC-D0外壳与Activity依赖拆分，导航恢复及renderer失效条件保留。邮件/日历已有路线意向，具体来源、scope、接入排期待裁。public-copy、ES-01与G1–G5保持。

CC-S已接收：Opus交付 `ca548ed`、Fable复核头 `45625b2`，先合为 `85c4e73`，再合r4d固定头 `66bd820` 为 `4fc3de2`，无冲突、无集成产品补丁或新依赖/allowlist。Settings-active全局导航hidden+inert、独立设置导航与Back已落地，Unknown及Home/End与列表语义已消费；七项裁定按WK-121接受，M-12视图状态整理、M-13未保存表单离开拦截仍待，不称已有跨表单dirty保护。Astra244/244、两项lint、contrast、smoke、composition32/32、Models18/18、shell12/12、探测8/8、第0项4/4（独立fixture播种→SIGKILL→重启）与RC结果见 [合流证据](../evidence/cc-s-main-integration-20260909/README.md)。下一单由Fable从最终main提交建清洁树派CC-W（opus-wo-medium），消费Back顶带槽位未决项；本次不代派。

WK-120成熟感原则及队列已接收：密度收敛、留白/对齐、层级先成立，材质与光后加。CC-W → CC-D0-a → FE-05a（字阶/密度）→ FE-05（材质/光）→ CC-I；FE-05a先由Fable给约束表，再由Opus用Settings与Work头部两张变体消融，用户比较后全站落地；anti-slop hierarchy检验字号/字重能否不靠颜色与框线建立层级。ATT-FE-01仍在FE-05后按接缝交付进入，不把序列当已派单或实现。

本表“可接单/下一步”不代表每张工单已有执行会话在运行。各作者回执记录实际开工SHA、worktree/端口、结果与未检项；Astra统一合流，不维护第二份产品状态表。

CC-W已接收：先合Opus/Fable固定交付 `67a6d8d`，再合r4d固定头 `c8d8ddb`，组合提交 `73ce524`；无冲突，无新增依赖、后端写入或allowlist。视口分档、单文档tab、关闭焦点归还、scope标题带与activity记号按WK-126接受，M-14视图状态双写与M-15 B态标题对齐留既定后单。[合流证据](../evidence/cc-w-main-integration-20260909/README.md)分列原交付复验与补丁作者验证；全量263/263包含并行后端新增8项，不能与作者255项直接混称。

Astra补丁 `48693ad`：短标签Answer/Send发送时原有影子只预留静止态，补前浏览器组件检查9/15，补后15/15；现在静止/在途两种标签始终占位。同步将未被终态调用的activity映射unknown改为Unknown，不称已验证终态记号展示。两处为Astra作者补丁，待Fable非作者复核，不套用WK-126对旧交付的接受。既有composer重绘丢失图标、文字挤入圆形按钮另记在[截图10输入](design/attention-surface-2026-09-09/README.md)，未声称由本补丁解决。

WK-122…127作为设计/契约输入接收：Visual Grammar在atlas之上，Shape/Identity仍待specimen与后续成单；WK-127单层backdrop blur + mask渐变只先用于滚动header，保留line回退、reduced-transparency清mask、<768关闭扩采样，帧时间只以真机验收。现不宣称材质实现或性能接受。下一步由Fable从最终main回执SHA建树派CC-D0-a（opus-wo-low），范围仍为现有事实与模块外壳；BE-1/3/25、BE-29已交付也不自动扩大到D0-b。EX-CC5/CS1/GI1仍沿原任务回执消费，r4d工作树保留，本次未代派、未push/部署；G1–G5不关闭。

## 执行文件状态：前后端 PR 准备（2026-09-09）

用户授权按第一性原理撰写前后端 PR 供后续消费，不依赖 LayerFS。[准备包](execution/2026-09-09-execution-state/README.md)从实际 `main@1688a7b` 核对既有 Core/工具接缝，分为 ES-BE-01（确切文件候选、验证绑定与接受恢复）和 ES-FE-01（既有 Work Review 的文件候选投影）。本次仅文档草案；新增 API/schema/测试尚未实施或验收。后端沿原 Core owner，前端等冻结接缝并进入单写者队列；保持 FE-01…04 与 G1–G5 当前顺序，不新增正式状态服务、不自动写回用户目录。

## 后端独立派工（2026-09-09）

用户授权后端先行，关键设计与实现由 Astra light 亲自撰写，explore 用 Luna 集群。本轮从 `main@a431650` 建隔离树，[派工包](execution/2026-09-09-backend-dispatch/README.md)启动三个 Luna max 只读分片，已返回后端/文件状态/前端消费事实；两个 Astra `gpt-6-astra/low` 分片分别交付 BE-17/18 代码 `f58c28c` 和 ES-00 施工合同 `42a4c2f`。根 Astra 非作者复读与集成，在纳入 FE-01 主线 `2b6c221` 后的 `f4774e5` 复跑全量213/213、smoke通过；原a431650基底209/209另列。实际结果见 [证据包](../evidence/backend-dispatch-20260909/README.md)。

BE-17/18以现有token保护两个POST，使用请求中的临时API根/可选key完成有界模型目录探测，不持久配置、不读保存key、不建Run、不注册模型。后续前端接缝按 [实际协议](../app/docs/runtime-foundation.md#unsaved-provider-preview-be-1718)消费；握手不证明key被验证或模型可推理，custom compatible/local的保存与执行另单。ES-00改为受信Run recorded artifacts → 完整历史字节 → Core的选定文件版本集合，避免inline提议冒充执行证据；ES-01代码仍待按合同实施，不称已有文件接受能力。前端实际进度以本页FE-04合流记录为准，单写者顺序及G1–G5保持。

## 本地资料治理：后续研究与 PR 准备（2026-09-09）

用户授权消费 [本地数据治理查询全量turn](research/local-governance-2026-09-09/source-index.md)。已读取接口返回的五个turn、九条文本和一张图片，T02未返回研究答复；30个外链完整索引，其中六个原始页面有界抽查。[准备包](research/local-governance-2026-09-09/README.md)给出只读Intake/rendition、派生索引、现有Core候选决定、Explore接缝与六层评测施工稿。仅规划和追溯交付，无新产品代码/API、模型运行或依赖；不把外文性能与示例数字记为本项目结果。沿Core历史/决定与既有Session/Run，派生缓存可重建，正式治理记录不随sidecar删除；FE串行队列、ES-01与G1–G5状态不变。

## 局部解耦与长期维护：研究并账（2026-09-09）

用户要求将“架构插件化调研”一并入账，并补充handoff.md；已消费一轮完整问答及366行交接原文。[准备包](research/architecture-maintenance-2026-09-09/README.md)在实际main4c1c420核对当前owner，提供AM-A…F后续PR、局部选型/来源index、缓存/维护契约草案和前后端合流Design。保持Pi与既有Core；先请求基线再两项只读慢任务纵切，区分执行/交付/接受、native/adapted和MCP协议代际。与上一单LG/EX及ES-00交叉连接，不复制任务/来源/成果owner。此次仅文档与有界只读核验，未实施async或插件平台、未运行真实provider；FE队列、ES-01及G1–G5不变。

## 数据系统原则：研究吸收与候选 PR（2026-09-09）

用户授权从第一性原理消费“架构设计参考”及672行（671个换行符）报告。已在实际main `af95bcb`核对Core/RuntimeStore/ArtifactHistory责任，并有界补查七个原始来源；[准备包](research/data-systems-2026-09-09/README.md)保留原文hash、来源限度、基线和DS-00…04候选计划。回执/确切接受复用Core及ES，重建并LG，兼容/替换并AM；外部效果对账仅保留条件触发。此次为文档交付，未实现新API/schema/迁移、安装依赖或运行产品/模型测试；不改变Paper、FE队列、ES-01与G1–G5状态。

## Clean and Cool：前端视觉审查与 Claude 输入（2026-09-09）

WK-110已接收为设计输入：只用现有brand包，生成图不作逐像素合同；80×52安全区既有合同保留，Settings/折叠态缺口并入CC-S。三面贯通与tab strip需先修订composition law、宽度折叠策略和tab identity，1440不得静默压窄中面；模块Home为布局版本，不替代简洁Home。次序FE-04 → CC-S → CC-W → CC-D0 → FE-05，CC-D1…随各数据源合同。用户回执称Sonnet EX-CC1/CC2已派，本次只接收r4d@00e33f9，不纳入尚未裁定的探索结果、不代派新代理；前端单writer，探索不构成实施或验收。

最新用户补充已并入设计交接：桌面window control安全区、左/中/右三面上下贯通、composer优先且热力图/统计缩为辅助模块；熟悉的frontier交互范式作为默认参照。沿既有shell合同，旧图不相容尺寸退为参考；本次仅文档，无产品实现或验收。

用户后续用七张截图补充：保留可解耦的模块首页（热力图、邮件、日历、Attention、Models/Usage），Settings以专用导航替换全局项目/会话栏，右侧工作区展开采用标签式chrome，并保留必要边距与呼吸感。[补充交接](design/clean-cool-2026-09-09/shell-refinement.md)及三张修订图已记录；这些结构方向覆盖旧图不相容部分，具体视觉细节仍可调整。仅设计输入，尚未实施或另启Claude任务；统计、来源、多实例等后端接缝分单，前端仍单writer。

用户要求复查已实现及待做前端PR/commit并提供更自由的图稿；从`main@61ab863`隔离启动local-fake，捕捉Home、Models和NDA Review的桌面流程及Models窄屏。[设计包](design/clean-cool-2026-09-09/README.md)附提交/工单索引、三张Image Gen图、完整prompt、偏差校正及Claude交接。图稿尚未选择或实施；Home几何/命名和Review全幅模式均为显式提案，BE-17/18探测不代表custom连接已可保存。仅文档与图像交付，无产品代码变更；FE单writer队列与G1–G5保持。

## 新接两单：Luna 首轮有界交付

2026-09-08 用户指定“code base 优化和 harness Core 验证”，并确认“落工单并启动 Luna 有界执行”。从实际 main `429fdd68febb9998f322a0b53c323651fc8cd7fd` 建临时隔离分支 `codex/luna-maintenance-core-validation`；[两单合同](execution/2026-09-08-luna-two-orders/README.md)已形成并启动三个 Luna max 分片：clarity Finder、Core 独立反例验证、agent capability compatibility index。首阶段仅各写对应证据；代码候选必须经另一人验证后才授予修复写权。Astra 负责架构、current 与合流，不触碰 WK12/WK11 前端写权。

[CB-01](execution/2026-09-08-luna-two-orders/WO-CB01-clarity-pilot.md)只做四文件 clarity 试点；[HC-01](execution/2026-09-08-luna-two-orders/WO-HC01-core-capabilities.md)检查 Core 不变量与基础 agent 能力/开放控制面缺口。首轮结果见 [证据包](../evidence/luna-two-orders-20260908/README.md)：CB-01两候选经非Finder复读与35/35复跑均拒绝，以四文件no-change完成本次试点；HC-01定向18/18与两个独立探针通过，探针另经非作者复跑，基础能力兼容性首版矩阵已交付。Astra接收有界证据，未修改产品代码；未声称全仓优化、全生态兼容或产品验收。不自动实现整个能力列表，不关闭 G1–G5，现有产品施工顺序保持。

## 已成立的证据

| 范围 | 已有证据 | 支持边界 |
|---|---|---|
| Harness Core与NDA后端 | 170/170、smoke与独立Core/adapter/故障注入；固定代码1332691 | [回执](../evidence/harness-core-20260908/README.md)；合成/loopback、无真实provider或前端验收 |
| 本地/远端恢复 | 独立clone安装、146/146、runtime smoke与启动静态资源通过 | [联调同步](../evidence/final-integration-20260908/sync.md)；测试提交与当前产品app/tests/brand一致，非真实provider |
| Web↔后端主链 | 回答/精确工具授权、File身份、Preview、deny/Stop/断连恢复9/9；MCP unknown回执3/3；extension恢复6/6 | [联调回执](../evidence/final-integration-20260908/README.md)；fixture、实际HTTP与浏览器，不代表完整NDA/专业正确性 |
| Runtime控制面 | CAS、parent gate、Source/Effective、历史Context与MCP生命周期；RC契约20/20、反例9/9、视口36/36 | 同上；characters非tokens，安装/连接/曝光/许可分别成立 |
| 当前GUI与品牌 | Home空/列表、1440/390浅深几何8/8；既有L0–L3、悬浮工作面/composer；brand独立包 | [联调回执](../evidence/final-integration-20260908/README.md)、[品牌验收](../brand/evidence/ACCEPTANCE.md)；部分画面目视，不宣称全面视觉/读屏/触控验收 |
| Runtime R2解析 | inline六kind、exact hash、unverified来源、inspect-only与locator unsupported | [解析契约](../docs/runtime-control/source-resolver.md)、[证据](../evidence/runtime-resolver-20260908/README.md)；不是R3兼容矩阵或R4/R5安装方案 |
| Main谱系与目录 | replacement `d20fbc3`继承旧`f9ade85`，文档后继`d86eba4`已同步；原Courtwork目录检出main，迁目录后smoke通过 | [接管回执](../evidence/main-cutover-20260908/README.md)；不代表Pages/DMG发行或产品G1–G5已完成 |

146/146、9/9等是不同范围的既有回执，不累加成一个“产品完成度”数字；本次Core作者全量验证与独验按各自SHA/范围分列；合流验证见清洁节点回执。

## 仍未闭合

- G1真实provider仍not_run；可信执行身份贯通已由loopback验证。G2/G3后端闭环已成立，Review/新Session GUI已有合成复验；Home/待处理卡键盘已有合成浏览器复验，真实IME、读屏与真实运行纵切尚待；不以工具allow代替成果accept。
- H1历史来源归属与H3 producer缺席后端读取已实现。领域renderer与版本化修订动作声明已交付并通过合成复验；H4完整卸载/重装/升级矩阵仍按实际需要验证。
- BE-1/3/25与BE-29保留记录投影已交付（见下），前端消费/完整历史仍待；BE-2多文档实例；BE-12模型effort；Runtime R2获取、R3兼容、R4 Proposal、R5事务apply/rollback、R6 Expert版本。分别消费既有契约，不为导航或演示造能力。
- VoiceOver/NVDA、IME/触控、桌面壳、200%缩放的完整产品验证及数据回退演练；旧135/1无栈flaky未复现，不称已修复。
- README/Pages真实媒体与发布；新DMG/签名公证/外部用户试点未完成。Paper已采用 [9.6固定SHA](../PAPER.md) `d78fd312955c1f594e59cbdcbb0d3074ac355940`（DEC-012）；版本采用不关闭产品验证门。

## 责任与历史

[架构](architecture.md)保持M01–M14所有权，[长期路线](roadmap.md)保持R0–R5与H0–H5；本轮不改Paper、不新增并行正式状态，此前已结束的Fable loop不自动覆盖用户本次新开工安排。过去的迁移条件已经由用户“先切main”的授权调整，不再当作当前分支门；其中真实验收/恢复要求继续由本轮产品完成度承接。

历史细节按需读 [第二节点](../evidence/node2-independent/README.md)、[最终联调](../evidence/final-integration-20260908/README.md)、[清账](../evidence/reconciliation-20260908/README.md)、[main接管](../evidence/main-cutover-20260908/README.md)。历史回执原文保留，其旧目录、等待状态与分支称呼不覆盖本页。

## 个人 Attention：讨论消费与 PR 准备（2026-09-09）

用户授权消费“解释 GoRaven”网页讨论，并建立独立 Attention Assistant 手动 loop。本轮从实际 main `683b6d1419242bd08d20b7deec77ce12af7dcf12` 隔离开工，Luna 分别研究产品接缝、局部选型与 Paper 提案；[准备包](research/attention-2026-09-09/README.md)与[关键裁决](research/attention-2026-09-09/adjudication.md)将 Attention 独立生命周期、受策略约束的存在性发现、schema/grep渐进披露、Human Attention UI与runtime替换分单。独立个人目录只运行文件化手动实践，不成为第二产品开发线或Core状态服务；应用项目注册尚需UI添加文件夹。Paper按独立仓协议先登记候选观察，未升级本仓PAPER.md固定采用版本。此次仅研究、文档与手动起步，无产品API/schema/迁移、外部发信、定时器或真实provider验证；既有FE单writer队列、ES-01与G1–G5状态保持。

## 截图复读与Attention前端衔接（2026-09-09）

用户提供七张线框及两张真实agent产品截图，已做静态复读；[交接包](design/attention-surface-2026-09-09/README.md)支持B+C与D0-B有条件方向，指出长文行宽、composer缺席与Home待办下沉。Attention建议常驻全局入口/独立工作面，Home仅可选摘要，复用并行研究ATT-BE-01/ATT-FE-01/ATT-RT-01，不复制对象owner或台账；并行研究当时未合流。CC-S继续，CC-W→D0-a→FE-05次序不变，Attention待后端接缝后进入单writer队列。本次仅文档与用户图片证据，不升级为产品验收或Paper修订。

本次文档合流同时接收Attention研究准备包与上述截图交接；常驻入口/独立工作面和可选Home摘要共用同一对象与service，后端接缝交付后再进入FE队列。Paper由Astra仅登记PI-22，Canonical/Practice正文不改。

## 多专家资源治理：TeamAI研究入账（2026-09-09）

后续同一讨论扩展为4个turn、8条文本；[增量索引](research/teamai-2026-09-09/attention-delta.md)补入MyContext与Attention两轮。核验来源采集/依赖负例、去重抑制、snooze和介入策略；保留原2-turn证据。Context快照可持久用于审计，不能替代正式状态；抑制通知不承诺事件永存。复用ATT/LG/AM，未启动产品或Paper施工。

用户授权消费“多专家架构分析”，本轮完整读取2个turn、4条文本与唯一上游仓库入口。从实际main `3af83eb` 隔离核对，[TeamAI索引](research/teamai-2026-09-09/README.md)将scope、原生格式转换、资源生命周期、recall来源锚点、friction与owned patch映射至已有AM/LG/ATT和Runtime接缝。原回答的12个内部citation没有URL映射，不冒称恢复原检索；上游另行有界核验。仅研究入账，不安装TeamAI、不新增并行registry或编排平台，不改变Paper、现有施工顺序及G1–G5。

## 设计方法与Chat Space：研究入账（2026-09-09）

用户授权消费“设计索引方法论”，从实际main `f9bafb6` 隔离完整读取5个turn、8条文本及1张截图。[研究索引](research/chat-space-2026-09-09/README.md)把约束/方案/减法方法、用户Markdown、ask_user/permission和File/Artifact下载映射至既有WK-112、前端工作面与服务合同。外部协议/库建议按原文与本轮核验分列；共享局部UI不合并状态owner，输入accept、工具allow、执行完成和Core接受分别成立。仅文档入账，不安装依赖或实现新状态/API，不改Paper、单writer队列、ES-01及G1–G5。


## 后端并行施工：Activity / Usage与AM离线基线（2026-09-09）

用户授权fresh Astra与Luna explore并行推进后端。本轮交付`codex/backend-bounded-20260909@52f75dd`，基线`5ea5ff0`；BE-1/3/25、BE-29代码`fd3861b`提供认证只读Activity/Usage与summary UTC日期过滤，无Core/Runtime schema迁移、前端、新依赖或静态准入变化。[正式协议](../app/docs/work-metrics.md)明确保留记录complete、历史unknown，partial/missing非账单；极端usage溢出时两端点均报错，未作为已修复缺陷。

AM-C配套`87c8818`仅固定local-fake最终出站请求golden与语义差异，不称原生async或真实cache收益。[合流证据](../evidence/backend-bounded-main-integration-20260909/README.md)记录代码审阅与组合验证，原作者/Luna独验在[交付包](../evidence/backend-bounded-20260909/README.md)分列。ES-01只完成可信record/history、输入覆盖与迁移边界探索；Attention仍研究。BE-2按最新CC-W范围交合同owner，不新增backend tab账本；后续前端模块消费沿现有队列，G1–G5不关闭。


## 可选浏览能力：研究入账（2026-09-09）

后端任务消费用户“考虑解耦提供”讨论，研究提交`5163ae95c3ce950dcc2b380ef93c37cedd84dbec`基于`751be02`。[Browser研究包](research/browser-capability-2026-09-09/README.md)完整登记1轮2条文本，固定上游`browser-use/browser-use-pi@e0df2743e680125a4378d4d578420917620711f2`；Astra/Luna只读核验后裁为可选Browser Agent adapter候选，Driver资源归属单列，不采用原答复的ADOPT结论。hooks不是sandbox、导航域名规则不是网络隔离、partial/事件日志不是持久成果或Core接受；Browser输入不能绕过ES输入覆盖。

来源Astra复读研究包、原文及合同/PR边界，核对逐字稿hash、15个本地链接和diff后接收文档。上游21文件hash由研究作者核验，不冒称本次重复独立核验。未安装/执行上游、浏览器或模型，npm发布artifact未验；不启动BR-01…03、Core或前端施工，不改Paper及G1–G5。


## Review Surface：CodeRabbit自研PR入账（2026-09-09）

用户授权消费“分析CodeRabbit巧思”，从实际main `a7a08f0` 隔离完整读取1轮2条文本、核验6个显式官方URL。[准备包](research/review-surface-2026-09-09/README.md)将15项机制归入历史定位/版本提示、阅读分组、领域比较与覆盖、Attention/局部对话四个有界PR建议，复用Core/ES/ATT与既有前端队列。分组不授予接受权，缺席不表示已解决，历史读取与逐动作当前基线分别成立。仅文档入账；未实现、未建立远端PR、未改Paper或关闭产品门。ES后端在途交付应由实际固定SHA另行接受。


## BE-30 / AM / ES-01：后端合流（2026-09-09）

从最新CC-W main `0b5ccd2` 无冲突接收 `95cfb16`，最终产品 `b1ff74b` 已包含 `429a2f2` 的验证记录损坏修复，不单独接受旧中间提交。BE-30可选permission载荷CAS在resolve事务内检查，AM有界依赖正负例已合流；ES-01完成opt-in file-memo-v1记录字节→Core候选/验证→人类接受→跨Session/producer缺席读取。正式接口、limits和输入覆盖见[协议](../docs/work-core/contract.md#es-01-opt-in-recorded-file-memo)。本段更新此前ES待做/仅探索的时点记录。

[合流证据](../evidence/harness-next-main-integration-20260909/README.md)：来源Astra代码审阅、组合290/290与smoke通过，BE-30七组及固定SHA迁移/Core反例复跑通过；作者与两位Luna证据分列，无集成产品补丁。Core2/app3仅从验证过的Core1/app1或app2备份迁移；旧host拒新库，恢复用独立目录。RuntimeStore仍4；没有升级用户数据。

文件GUI/catalog创建入口未做，旧renderer只读fallback；完整输入coverage限洁净Session且compaction禁用，额外输入保守unknown；结构PASS不等于专业质量。Attention fresh Astra任务已启动边界准备，本次合流后从最终main接Core/service写权；前端继续CC-D0-a → FE-05a → FE-05 → CC-I，main/current/台账由来源Astra持有。真实provider、Paper、发布和G1–G5保持原边界。


## Attention：后端独立接受与合流（2026-09-09）

用户授权fresh Astra沿ES完成后接续ATT-BE-01。来源Astra从main `fa90763` 独立审阅，接受最终产品 `d37704e` 与证据头 `ae595ed`：Attention current/event/receipt与Matter同属Core SQLite；project复合身份、revision/CAS与精确重放、typed human actions、最小registry/详情/来源/事件查询及默认拒绝的Runtime披露/signal接缝已实现。[正式合同](../docs/work-core/attention.md)与[实际HTTP/Pi/Core packets](../app/tests/fixtures/work-core/attention-packets.json)供后续消费。Session/Run结束或缺席不解决Attention，signal不产生Matter接受或工具许可。

[非作者证据](../evidence/attention-independent-20260909/README.md)记录来源Astra独立发现旧ES前置备份悬空链接缺陷、作者修复及原反例最终通过；de38中间产品不单独接受。五组新设计披露/状态反例、固定SHA迁移矩阵、作者15项定向复跑、最终全量305/305与smoke通过。Luna被作者补写的测试初稿不计独立接受；作者和来源非作者证据分别归因，无集成产品补丁。

当前Core3/app4、RuntimeStore4；支持既定旧schema经独占备份分阶段升级，回退用独立目录和对应旧host，未升级个人数据。ATT-FE可按稳定合同进入现有单writer队列，具体插入点由Fable按已排工单协调；本次无Attention UI、自动调度、外部发送、自动Pi工具安装或完整ATT-RT兼容矩阵。Core/service本轮写权交回来源Astra；Paper、真实provider、发布及G1–G5不随本单关闭。

## AM-B 异步 loop：后端续行派单准备（2026-09-09）

用户要求后端PR续行、Luna explore，成熟实践且验收明确的任务可派Terra，关键harness core与模型能力瓶颈由Astra亲写。从实际 `main@0480c17` 隔离形成 [可派工合同](execution/2026-09-09-async-loop/README.md)：T1协议/请求兼容探针与T2慢任务故障夹具可先并行；Astra A0冻结归属、结算、投递、选择性等待与恢复，A1实现两项只读任务的adapted纵切；固定接口后T3只读投影、T4非作者恢复演练，A2另评模型调度与native路径。Luna只读探索已返回并在合同末尾记录持久任务缺口与三项收窄；本轮交付派单准备，不表示Terra已启动或AM-B已有产品实现。Fable前端继续现有单writer队列；Core3/app4、Runtime4、真实provider与G1–G5保持。

## Attention human decision queue：handoff 消费（2026-09-09）

从实际 `main@fb50d21` 隔离消费用户 Email/GitHub handoff，[研究与派单增量](research/attention-human-loop-2026-09-09/README.md)保留原文hash、全部显式来源核验和Luna只读映射。采用先记录人类判断证据再治理偏好；五对象映射现有owner，不复制Attention状态；邮件disposition独立于生命周期。Gmail/GitHub离线同步反例与trace合成向量可派Terra，生产DTO/来源持久化、proposal批准、effect核对与恢复由Astra先冻结，继续AM-B只读主路径。Trace从P0记录，P5再分析；原生draft也属写操作，旧批准不覆盖新payload/目标版本。此包仅文档、未启动Terra或真实账户/外发/自动化，不将SDK的same-run恢复当Pi已实现。前端仍由Fable原队列，Core3/app4、Runtime4、Paper与G1–G5保持。

## CC-D0-a / Scout v2：合流与前端队列（2026-09-10）

从实际 main `7c07ef6` 隔离，依次接收 CC-D0-a `30014cf`（含 Fable §16 非作者接受）与 r4d `5b4c981`，两次无冲突。Home 模块带与 Scout v2、V1 基线和 FE-05a 提示词进入主线；[合流证据](../evidence/ccd0a-main-integration-20260910/README.md)分列本轮验证与既有 Fable 浏览器复核。共享树既有未提交证据原样保留。

Astra 按本次换序授权裁定：**FE-05a → FE-05 → ATT-FE-01 → CC-I**，覆盖此前队列。Attention 后端已稳定且不依赖 CC-I；四项文档前置仍由 Fable 补齐，grant 编辑器仍归候选 CC-P，PropertyRow modified/reset 仍归 CC-I。FE-05a 只落 V1，消费 M-15/16/17、Shape 与 M-18，由 Fable 从最终 main SHA 新建树派单；本次未派 writer。真实 provider、发布、Paper 与 G1–G5不变。

## 发布面 / 品牌接口清账（2026-09-10）

Astra 接手 Claude limit 后的清账。从实际 `4f7278f` 承接已合流的 CC-D0-a / r4d，接收发布面与品牌准备包固定头 `dcae9d7`。[本节点回执](../evidence/cleanup-20260910/README.md)记录范围与未结项。PS-24：公共站七行问题归 PS 批次，施工中不派 sweep；交付四轴复核判弱后才按“30 样本 → 3 候选 → specimen”补一次。真实 pricing 不适用与第 07 段概念研究稿并存。60fps 只作为品牌第 3 层（06）的 motion donor；第 1、2 层不派 sweep，站点继续零运动。

WK-136 换序沿 `4f7278f` 裁定：FE-05a → FE-05 → ATT-FE-01 → CC-I。当前 Opus 在途仍为 WO-PS-01 站点、WO-BR-01 glyph 板；分支中间提交不视为正式回执或接受。Astra 接收回执后复核，glyph 选向仍归用户，PS-02 待 PS-01。此节点只合流准备文档并对齐账本，不接收两条在途实现，不关闭 G1–G5。
