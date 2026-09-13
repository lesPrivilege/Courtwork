# Release 独立审阅 · 本地增量裁决

2026-09-13。Astra负责架构、集成及模型能力瓶颈实现；Luna fast explore负责仓库召回与Exa定向核查。本轮交付是审阅消费与施工计划，未实施产品代码、运行产品验收或签署Release。

## 输入与现场

接单为 `main@ad33118a56ae15f1c3244e97147bd63c234e6916`，与附件审阅SHA相同，但共享工作区存在在途修改；精确文件hash、dirty清单与lockfile身份见[接收回执](receipt.json)。隔离分支 `codex/release-review-intake-20260913` 编订，不覆盖现有前端writer。

本次仅收到[REVIEW-AND-RELEASE-PLAN.md原件](inputs/REVIEW-AND-RELEASE-PLAN.md)，SHA-256为 `931b836ccfdc4f9a4ab5004fae4806b8fccc4d2cfc4b0636adc18498ae88e2f4`。引用对话为“制定Release计划”（`6aa64b1a-fe34-83ec-a84e-26e0859836fa`），本轮只消费提供的缓存预览与完整本地附件。附件提及的HANDOFF.md、plan.json、SOURCES.md未收件；不冒称收到完整包，也不把S01等未解析编号当已核来源。附件中的派工语句是提案，当前采用由本文明确给出；远端PR状态沿旧审阅时点记录，本轮未重新查询。

当前权威是[架构节点](../../research/architecture-node-2026-09-13/README.md)、[实际交付](../../research/architecture-node-2026-09-13/delivery.md)、[原逐卡表](../harness-implementation-2026-09-12/disposition.md)、[dogfooding修订](../harness-implementation-2026-09-12/harness-dogfooding.md)与[原G门](../../execution/2026-09-08-main-round/public-readiness.md)。当前状态仍由[engineering/current](../../current.md)持有。Paper继续绑定[SE 9.6](../../../PAPER.md)，不改论文。

## Astra裁决

采用固定Pi组合与一个正式工作闭环作为首个本地experimental/alpha Release目标。保留Pi三包0.85.1、MCP client 2.0.0、Node Host、Python Core、原生Web与既有reader/jsdiff；不引入新依赖。Provider适配与Runtime替换保持两条轴。五层责任不推导五个新服务。

Harness/Extensions按一组明确支持能力的完整路径收口：准入和版本绑定→实际权限→执行→结果/副作用→故障结算→挂起/恢复/退出→UI理解。Host工具、MCP、声明式Skill/Profile、Pi可执行扩展和Work Extension分别声明支持范围。现有MCP暴露面仍须验收；目录观察不自动等于resources/prompts调用，取消也不证明远端无副作用。

首版优先沿既有合成Inbound NDA消费者跑来源→Matter/Contract→Candidate→人的Review→Decision/Artifact→新Session继续同Matter。工具Approve与成果Accept分别由原owner管理。待Review摘要列为G2/G3必要接线；它虽在前端显示，事实必须来自Core，不新增pending账本。

第二Runtime、完整Core-free组合根、广义治理、插件市场、任意安装和热插拔后置。DF-04仅在coding消费者要求agent实际运行测试时触发；合成NDA首版不依赖通用shell。P07–P10按真实消费者触发。

## 九项增量处置与顺序

以下是原编号的消费切片，不增加第二份总路线图。adopt表示采用为施工/验收范围，尚不表示执行通过。

| 附件段落 / 原项 | 处置 | 写权与依赖 | 必须交付的退出证据 |
|---|---|---|---|
| 5.1 / P00 | adopt；本轮完成接收登记 | Astra文档集成；Luna只读召回 | SHA、dirty、lock、输入原件和逐项处置；最终候选环境仍须实测 |
| 5.2 / P12-A前置 | adopt；首片施工 | Luna可承接测试/runner有界实现，Astra先定合同；非作者独验 | 稳定默认资源合同、独立产品检查入口、故障fixture有效、同候选默认命令连续3次通过及有界负载诊断 |
| 5.3 / P05/P06 | adopt；已有能力先收证 | Astra唯一service/adapter/control writer；依赖测试合同 | initial/tool/compaction/next Run的wire与来源证据；越权、旧binding与不支持值反例 |
| 5.4 / DF-06、P01/P02/P02b | adopt组合回归；旧修复covered于原SHA | Luna可实现独立测试片，Astra处理红fixture指向的产品缺口 | 挂起后下一Run工具列表及旧调用拒绝、恢复新binding、活动Run变更拒绝、unknown封闭与重启不重放 |
| 5.5 / P11-A/B首版子集 | adopt受支持组合入口；通用导入defer | Astra裁定DTO，UI writer串行领取；依赖能力合同 | 干净数据下GUI配置/选择→API持久化→Run绑定→实际执行→事件→GUI；当前配置与历史binding分开 |
| 5.6 / H0–H3、G2/G3 | adopt；待Review摘要未完成 | Astra定Core接缝及关键实现；有界UI片可派Luna；依赖可用执行组合 | Sources折叠时摘要可发现、CAS/actor/重复/断线反例、正式决定及换Session连续性 |
| 5.7 / P12最终、G1–G5 | adopt；尚未签署 | 非作者验收，Astra整合；依赖全部首版阻断项 | 固定候选安装/真实探针/迁移恢复/工作闭环/演示/公开事实映射 |
| 5.8 / DF-04 | 条件触发；首版not-applicable | 实际coding消费者触发后另定有界writer | 固定recipe的cwd/命令/超时/输出限额/取消/退出身份，普通子进程不称安全沙箱 |
| 5.9 / P03/P04/DRT-03 | defer | Astra架构与实现，Luna来源/反例 | 最小Runtime Port与真实第二执行器；同Expert/Core验证后才声明替换 |

DF-01/02/03/05保留原回执范围，人工执行测试不改称Agent已执行；P01/P02/P02b的旧有界接受不自动升级成当前候选全量通过。RD-006/007、BE-6/7、LG/DS/BG保持原owner，不额外扩展本轮依赖。

## 第一施工片：测试合同，先归因再修改

本轮源码已核：`app/package.json`默认test未限制文件并发；README声明Node22.19+、Python3、Git2.36+；`app/tests/review-core-client-lifecycle.test.mjs`普通fixture ready为2000ms，no-ready专用反例为80ms；`app/core/client.mjs`生产默认5000ms。前述不同值不是生产超时缺陷的证明。当前工作流只有Pages，不能给Runtime签绿灯。

首片允许写入：`app/package.json`、该lifecycle测试及必要fixture、独立产品runner或workflow、README运行说明、对应evidence。Luna承担成熟做法的有界实现；Astra承担并发/支持环境合同及出现生产生命周期问题时的裁决。产品Core超时、service/store与当前UI均不在初始写权内；发现真实缺口后由Astra接手，不靠放宽生产超时掩盖。

先固定独立源码SHA/Node/Python/Git/OS/CPU与进程并发，比较默认与有界并发的worker启动/ready时间。诊断结果决定默认调度或fixture同步修改；单独负载lane保留竞争观察。采用同一候选默认命令三次通过作为本次工程退出门，不把它说成永不flaky保证。no-ready、请求超时、崩溃和进程回收反例必须继续有效。CI安装锁定依赖，跑既有合成测试、smoke和文档检查；真实Provider不进入无凭据CI。公开最低Node版本须有对应验证，不能由更高版本回执推导。

## 后续接缝与验收

P05/P06先盘点runtime.bound、source/hash/loaded、reasoningBinding与request telemetry，保持requested、SDK设置、encoded、observed分离；未观测的Provider effective值为unknown。材料正文、AGENTS.md和allowed-tools不赋权；压缩不生成新的权限，修改来源/配置不回填旧Run。

DF-06使用独立合成工具/MCP服务，分开wire attempts与remote effect counter，覆盖deny零动作、精确approve、审批等待取消、dispatch后丢响应、持久证据失败、断开/旧配置、重启不自动重放以及结果保真。只有失败证据指向产品代码才重开已完成的P01/P02/P02b。

能力控制面先盘点干净安装路径，优先交付一个现有受信固定组合；若现有产品已经满足，不再新造预置。仅在确有入口缺口时增加最小选择/配置。UI实施前必须读frontend-contract及最近已实现precedent，记录grammar、文件writer和浏览器证据。当前在途Settings/Attention等文件不能由本片覆盖。

Review摘要来自既有Core surface/工作绑定；展开才渐进读取详细证据。状态刷新、Session切换、来源更新、CAS冲突、只读和网络断开必须保留原owner语义；不能用Run Completed推断pending或accepted。

## 可Release节点

| 节点 | 放行条件 | 当前判断 |
|---|---|---|
| Harness内部验收 | P12前置、P05/P06、DF-06、P11首版子集及对应真实路径通过 | 尚未完成；不代签G2–G5 |
| 首个本地产品Release | 同一候选或明确源码等价的G1–G5闭合，局部专业闭环可由人决定并跨Session继续 | 目标采用，未放行 |
| Runtime替换能力 | 第二真实执行器在固定任务/能力集合保持Work权威连续 | 后续；不是首版前置 |

G1缺最终候选干净启动与最新wire真实小探针；G2缺最终完整候选/正式决定及反例；G3缺同Matter新Session与Review发现性主路径；G4仍需原门规定的2–4分钟合成/可公开演示及source SHA；G5需支持声明逐项映射。原媒体、912/912和修复相关51/51、33/33各保留其原SHA/覆盖范围，均不是本轮新测试。

最终冻结后再做有界真实Provider探针与Host schema13/Core4/bridge app5的独立合成迁移恢复；每项按实际候选复核，凭据不进入证据。既有有效授权继续按原范围消费，不从附件派工措辞扩张授权。版本号、日期、tag和发行动作在候选证据成立后按现有策略处理；本次没有发行操作或私人简历修改。

[外部实践核查](external-practices.md)只提供机制参考，不能替代锁定依赖与本地验收。[检查与交付](verification.md)记录本轮实际范围。

## 用户同意施工后的接续

用户随后授权开始施工，分工更新为Luna explore、Sol worker、Astra裁决/架构与模型能力瓶颈实现。上文“本轮仅计划”指接收时点。首片[测试合同与有界生命周期证据](../../../evidence/release-test-contract-20260913/README.md)已进入本地main；后续P05/P06、其余DF-06及G门保持各自退出条件，未push/deploy。

后续施工已完成[P05/P06合成输入绑定](../../../evidence/release-input-binding-20260913/README.md)、[DF-06 MCP审批/回执失败补证](../../../evidence/release-mcp-failures-20260913/README.md)及[Core Review摘要接线](../../../evidence/release-core-summary-20260913/README.md)。固定09f9177产品检查932/932、smoke和链接通过；用户追加Execution排版/去角色头后非作者18/18与浏览器复验，Work review精简后非作者14/14与明暗1440/1280/390复验。该增量不重写原G门：最终候选fresh install/真实Provider合成NDA闭环、2–4分钟可公开演示及G5支持声明映射仍须另留证；通用导入与第二Runtime保持后置。未push/tag/deploy。

## Release前串行筹备增量

[干净安装、GUI与迁移证据](../../../evidence/release-preflight-20260913/README.md)已交付：本地canonical clone实际安装与全GUI Local test闭环、跨Session/正常重开、9文件65/65合成恢复。真实模型准备揭示NDA工具提交协议缺口，Astra补完整静态schema/reason规则，Luna非作者18/18；未预注入当前答案或放宽接受。完整934项中933通过、唯一语义登记漏项已修，独立守卫3/3、smoke/links复验通过，保留原失败且不称第二轮全量。G1真实Provider探针、G4可公开2–4分钟演示及G5 owner最终映射仍开放；[操作稿与边界](../../../evidence/release-preflight-20260913/live-probe-plan.md)和[支持声明映射](../../../evidence/release-preflight-20260913/public-facts.md)已备妥。未push/tag/deploy。
