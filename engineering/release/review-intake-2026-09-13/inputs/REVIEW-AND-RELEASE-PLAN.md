# CourtWork：独立架构审阅与 Release 前施工计划

**日期：2026-09-13（Asia/Singapore）**  
**固定审阅基线：`ad33118a56ae15f1c3244e97147bd63c234e6916`**  
**性质：当前仓库的增量架构审阅、源码接缝抽查及拟议施工/验收计划。不是产品测试报告、远端 PR、合并、部署或 Release 放行。**

## 0. 裁决摘要

建议保留当前架构与技术底座，不启动另一轮泛化设计或重写。首个产品 Release 的目标应是：**一个人在干净安装的 CourtWork 中，使用锁定 Pi 执行组合及明确支持的 Extensions，完成一条有来源、有精确权限、有真实执行、有候选与正式决定、可以换 Session 继续的局部工作路径。**

当前不能仅凭 Pages 成功、架构登记齐全、一次旧版本真实联调或低并发全量通过，就签署产品 Release。最应收口的是最终版本证据、测试环境合同、能力生命周期、最小自助配置与 Core Review 的前后端接线；不是插件数量、第二 Runtime、通用安装器或全部 Work 愿景。[S01][S02][S10][S13][S28]

本轮建议以既有 **P/DF/G 编号**继续施工，不另起第二份总 roadmap。下面的任务 key 只是本包机器映射，不是新增正式 DEC、RD 或 GitHub PR 编号。所有任务均为 proposed/not-run；是否已被本地后续提交覆盖，须在接单时按源码与证据再核，不机械重做。

### 决定保留

Pi 三包 0.85.1、当前 Node Host、Python Work Core、原生 Web UI、Host 显式能力准入、现有 MCP client 2.0.0、已有精确版本 reader 与 jsdiff。Work Core 继续持有正式工作效力。Provider Adapter 与 Runtime Adapter 是两条不同变化轴。[S04][S06][S16]

### 决定前置

最终候选 SHA 的可重复测试与真实小探针；输入/能力绑定与故障回执；DF-06 能力挂起证据；一条不依赖开发者临时代配的发布能力入口；Core 待 Review 的可发现摘要；原 G1–G5 产品门。[S08][S09][S10][S15]

### 决定后置

第二 Runtime 的真实替换、完整 Core-free Harness 组合根、通用 Expert/插件市场、任意 Pi 包安装、热插拔、通用 shell、OCR/图谱/embedding 平台、全量 Spark/Attention 自动闭环与框架/语言迁移。它们不是没有价值，而是当前明确不作为局部产品闭环的前置。[S04][S06][S09][S30]

## 1. 本轮证据边界

通过 GitHub 连接读取当前 main、活动架构/选型/派单、回执、相关源码与 PR 状态。固定 main 为 ad33118；实际 Pages 部署为其父版本 3bd43b6，ad33118 是之后的文档回执。当前开放 PR 查询返回空；历史 PR #1 已合并，#2 关闭但未合并。旧计划中的“PR 卡”不能当作远端 PR 已存在或待合入。[S01][S03][S14][S31]

没有在此环境执行 CourtWork 测试、启动 Host、浏览实际产品、读取个人凭据、调用付费 Provider或修改远端。源码是有目标的接缝抽查，不是全仓逐行安全审计。GitHub 读取成功，但本环境普通 git 网络访问失败，因此没有取得可执行的完整 checkout；**不存在本轮亲自验证的“912/912”**。所引用测试数字均属于仓库内各自固定 SHA 的历史回执。完整读取范围与截断边界见 SOURCES.md。

本报告使用四种判断：

| 判断 | 含义 |
|---|---|
| 已见实现 | 本轮直接抽读到相应源码；不自动推导运行通过 |
| 已有回执 | 仓库保留已执行记录；适用其源 SHA、配置、环境与覆盖范围 |
| 发布证据缺口 | 当前不能据此关闭 Release 门；不等于代码不存在或已证实漏洞 |
| 拟议施工 | 本轮建议；需要本地正式采用并登记，未执行 |

## 2. 架构判断：保留五层，不按目录名误判完成度

| 层 | 当前可证边界 | 本轮处置 |
|---|---|---|
| Provider Adapter | Pi ModelRuntime、模型能力描述、最终 payload hook 等共同承接协议与参数；最新有 schema13 与精确 effort 绑定 | 保留；最终候选验证真实默认省略/显式支持值、工具多轮及记录身份，不另建平行 registry |
| Harness Core | 实际 turn/tool loop 复用 Pi AgentSession；Host 拥有 Run 事实；service 仍直接导入 Pi SessionManager | 认可当前固定组合；不要为“拥有 Harness”重写 loop。真正可替换性的声明暂不放行 |
| Harness Extensions | Host 工具、受控声明式资源、MCP、部分协调能力已经存在；Pi 自动发现关闭 | 以选定能力的完整生命周期验收，不追求扩展种类全集 |
| Work Core | Core owner/bridge/事务持有 Matter、版本、候选、Decision、Attention 等正式事实 | 保留权威；Review 摘要与动作复用此投影，禁止另造 pending 账本 |
| Work Extensions | 静态可信 catalog、development manifest、专业候选/校验/投影已有局部实现 | 首个 Release 使用一个已存在的合成专业消费者；profile 不改名冒充完整 Expert |

依据：S04–S06、S17–S23。`app/harness/` 中的协作 helpers 不等于整个执行内核；`app/runtime/extension-registry.mjs` 也不是通用 Pi 插件安装器。普通 Chat 不必创建 Candidate；工作合同要求正式提议时才进入候选/决定路径。不要为了“统一五层”新增五个服务或挪动全部目录。

**允许替换的单位**是某执行器及其私有能力组合/适配；Host 的权限、来源、共享数据服务及 Work Core 不随其换 owner。完整原生执行器也不被强制先接 Pi 或额外套一层 Model Adapter。跨 Runtime 恢复工作应从授权投影新开 Run，不能把 Pi 私有日志冒充另一执行器的原生会话。[S04][S30]

## 3. 独立审阅发现

### F1 — 高优先级：缺少产品 Runtime 发布检查入口

`.github/workflows/` 当前只有 `pages.yml`。它明确不运行产品，不安装 app 依赖，也不启动 Host。package.json 虽有 test/smoke，但它们不是现有 Pages 工作流的产品 gate。[S16][S28][S29]

**影响：** Pages 绿灯不能回答后端是否可发布。  
**处置：** 复用现有测试，建立独立产品检查工作流或等价、可重复的本地 Release runner。源码 PR 跑无凭据的合成检查；真实 Provider 验证保持独立、受授权且有预算。不要把付费模型接入每次 CI。

### F2 — 高优先级：默认测试命令与验收环境合同尚未收口

最新回执记录默认 `npm --prefix app test` 为 911/912；Core lifecycle 独立重跑为 13/13；并发4的完整回归为912/912。全量通过发生在最终 UI 修复之前，后续只跑了相关集合。[S13]

本轮源码复核进一步确认：测试 fixture 的 ready timeout 为2秒，生产 CoreClient 默认5秒。不能直接把该观察判为“生产桥2秒超时缺陷”，也不能把低并发通过当成根因证明。[S22][S24]

**处置：** 记录 CPU/进程并发与启动耗时，区分测试调度竞争、fixture 同步和生产生命周期问题。冻结一个与公开运行要求一致的默认测试合同；保留单独负载 lane。必要时调整测试调度或 fixture 同步，而非先放宽生产超时。刻意的 no-ready/timeout 故障用例不得被放宽到失去语义。

### F3 — 高优先级：真实 Provider 证据早于最新 wire/schema 修改

真实5 Runs/8 turns的回执来自产品6522eb1及4720027。后续 model/effort 片修改了精确能力、默认省略、最终 payload 与 schema13，记录的验证为合成测试和浏览器检查，未跑付费 Provider。[S11][S12]

**影响：** 可确认“这条组合曾经真实跑通”，不能自动确认“最终 Release 候选经过相同真实验证”。  
**处置：** 最终代码冻结后只做一次有界真实探针集合：普通回复、支持的工具多轮、精确 Deny/Approve/读回、取消/终态、Host 重启连续性。按照支持声明选择默认 effort 与至少一个确证支持的显式值；不扩成模型评测，不要求把所有模型/Provider 都跑一遍。真实异常难以稳定诱发的分支用明确标识的合成故障补齐。

### F4 — 高优先级：待 Review 可发现性是跨前后端缺口

最新 UI 修订仍明确登记：Core surface 的读取随 Sources 折叠延后，`Open work review` 在已验证 workPacket 的折叠内容内；稳定摘要与刷新生命周期尚未接好。[S15]

**处置：** 从现有 Core surface/工作绑定投影最小摘要及可用动作，不靠 Run Completed 猜 pending/accepted。来源面关闭也应知道“需要我决定什么”；展开后再读取具体证据。完成 Accept/Reject/Request evidence 后按原 owner 刷新；断线、旧版本、只读或权限不足不呈现虚假可用动作。[S23]

这不属于用户目测即可全部处理的“小 UI Bug”，但也不需要重做 Chat 或所有容器。

### F5 — 高优先级：需把部分正确性证据收成一个受支持能力的完整回执

P01/P02/P02b 已有实现与独立回执；源码也可见目录有界、精确权限、dispatch 前持久意图与 unknown effect 处理。DF-06 尚未取得当前完整验收，live compaction/cancel 等也不在旧真实回执范围内。[S07–S11][S19][S20]

**处置：** 不重做旧修复，补当前 candidate 上的组合回归：能力挂起/再启用、活动 Run 修改拒绝、旧调用拒绝、审批后取消、MCP 结果未知后封闭后续动作、重启不重放、原始结果保真。线上的传输次数与副作用计数应可检查，不能只数 Host 的一次 `callTool`；未证明远端 exactly-once 时保持 unknown/reconcile。

本轮未复现新的权限绕过或生产数据损坏，以上是放行所需的证明缺口，不将其包装成已确认漏洞。

### F6 — 中优先级、取决于公开承诺：发布能力需要一条完整自助路径

首轮 dogfooding 使用 API 准备 profile/instruction。已有文档记录 MCP 定义导入仍经控制 API，GUI 可对已存在 server connect/disconnect/restart 与配置 exposure/policy。当前 UI 源码区分可配置能力和只读 Inventory；registry 仅接受 development-extension。[S09][S21][S25]

**处置：** 对首版提供二选一的完整体验：随包提供一个可选择的受信固定组合；或补最小 inspect/import/选择/生效回执。不要把“必须用 curl 代配”藏在产品路径里，也不为此做通用包安装器。若自助导入/MCP安装不作为首版承诺，准确保留限制即可；不能为跳过现有 MCP 正确性测试临时移除已经暴露的能力。

### F7 — 后续能力门，不是首版阻断：可替换性仍是设计而非已验能力

service 直接导入 SessionManager/createSessionRun；最新架构和替换矩阵也明确第二 Runtime 尚未实施。[S18][S30]

**处置：** 后续沿 P03/P04/DRT-03 抽最小 Runtime Port并验证第二执行器。当前继续 Pi 固定组合和局部工作闭环，不把这件事重新变成 DF 或首版的前置。当前对外只可陈述替换边界/规划，不可陈述多 Runtime 已可用。

## 4. “Harness 与 Extensions 完成”的最小合同

完成度的单位不是目录、函数或插件数量，而是**一组明确支持的能力能够从配置一直走到故障/退出**。

| 验收面 | 必须成立的事实 | 首版不要求 |
|---|---|---|
| 准入与身份 | 能力来源、scope、内容/配置版本、runtime/model/protocol绑定清楚；required capability缺失拒绝而非静默降级 | 通用市场、任意源自动安装 |
| 执行 | 真正走支持的 turn/tool 路径；声明、skill allowed-tools和材料正文不授予权限 | 重写Pi、通用shell/browser |
| 控制 | deny零动作；approve绑定精确参数；取消与actual terminal区分；变更不会悄悄改写活动Run | 所有能力live swap |
| 证据 | 原始来源引用、入选/延后/加载边界、工具结果与版本可核；未观测字段为unknown | 保存/公开模型私有思考正文 |
| 故障 | 本地拒绝、远端业务错误、结果丢失和副作用未知分开；不能以重试消除unknown | 不可证明的跨系统原子或exactly-once |
| 恢复与退出 | 旧binding保留；重启不重放不可逆动作；挂起阻止新的调用；升级/回退独立目录 | 跨Runtime私有日志互通 |
| 人机闭合 | 受支持入口能独立配置/选择、看见当前生效与本Run绑定、处理审批/错误；Work决定由Core出具 | 全面UI改版或全部规划功能 |

发布声明分开写：Host工具、MCP连接、声明式skill/profile、Pi可执行扩展、Work Extension不是同一类东西。当前 Pi 自动发现为关闭；MCP resources/prompts为目录观察，不因被发现就声明可实际读取/调用。远端MCP仅当前支持的无认证Streamable HTTP；OAuth/stdio不夹带进入此轮。[S17][S20][S21][S26]

## 5. 增量施工队列

建议后端沿既有唯一 writer 串行；当前记录中的 Astra 负责架构/集成、Luna做有界探索或非作者核查。若本地重新分派，先更新责任入口。同一片实现者不能把自己的检查签作独立接受。前端视觉修复可在不重叠文件中并行；涉及相同app.mjs/service/store/Core投影的修改必须排队。

### 5.1 P00：重定基线与逐项消费

**目标：** 把本包登记为现有方案的增量，不生成另一份产品状态。  
**输入：** current、最新架构节点、disposition、公开G门、工作区实际HEAD及未提交变更。  
**建议写入：** current的一个简短入口；原Harness活动索引的采用/覆盖关系；新审阅与证据目录。冻结原输入不改字节。

**交付与退出：** 固定source SHA/dirty状态/lockfile identity、支持的OS与Node/Python/Git、数据schema owner、每个任务的writer与受影响文件。对每张既有卡写 adopt/covered/defer/not-applicable及来源。远端若前进，只审相关delta；不把报告SHA强行覆盖本地用户修改。不能stash/reset/清理其它writer内容，也不自动创建远端PR。

### 5.2 P12-A 前置片：可重复测试合同与产品检查入口

**依赖：** P00。  
**建议写入：** app/package.json测试入口、必要的test fixture/调度、独立Runtime工作流、相应运行说明。生产Core超时不是默认修改目标。

**实施：** 先定位F2，固定稳定资源配置下默认命令与负载检查分工。新工作流安装锁定依赖并执行已有合成测试、smoke和文档检查，不使用个人凭据。至少核查公开最低Node要求对应环境；当前历史Node25.9回执不能替代Node22.19声明的验证。若收窄支持范围，先同步README，而不是让读者猜测。

**退出：** 同一候选默认命令连续3次通过作为本轮工程门，原始失败也保留；故障fixture仍证明拒绝/超时/回收；一个有界并发诊断记录说明剩余风险。三次通过不是永不flaky的统计保证。没有产品回归绿灯则不以Pages替代。

### 5.3 P05/P06：输入、权限与长会话边界的当前版本收口

**依赖：** P00、测试环境合同。  
**建议写入：** 仅实际缺口对应的service、Pi adapter、control-plane/model-capabilities与其测试；不新造context数据库。

先盘点已存在的runtime.bound、来源/hash、loaded事件、reasoningBinding与request telemetry。用当前真实消费者证明初始输入、工具轮、压缩请求、下一Run重编译的边界。保持requested、SDK设置、encoded与observed语义分开；Provider未返回的effective effort保持unknown。测试默认省略与明确支持值；unknown/不支持值拒绝或按合同明确不可用。

**反例：** 材料中同名AGENTS.md或allowed-tools不得扩大权限；关闭loader后不能在新catalog中继续浮现可加载正文；source/model/config版本改变不能回填旧Run；context预算不足不能静默截掉必需的正式工作身份/未决；compaction不成为新指令来源或新的授权。

**退出：** 原权限与来源owner均保留；原始/压缩/工具路径的合成wire证据齐；撤权与已发送历史的区别说明清楚。阻止新的未授权披露，不承诺抹除Provider已经收到的历史。显式clean generation仍按P08实际消费者触发，不为本片全量建设memory。

### 5.4 DF-06 + P01/P02/P02b 回归：选定能力生命周期

**依赖：** 已冻结的Run/input合同。  
**建议写入：** 先写现有control/MCP/permission测试；只有红fixture明确指向代码时修改原owner。

挂起一个工具、下一Run确认provider实际工具列表及Host执行拒绝；恢复后形成新binding，旧记录不变。活动Run中修改仍按现冻结规则拒绝，不把挂起包装为热替换。保留P01目录完整性、P02副作用未知、P02b结构化结果保真，不重复实现。

**反例矩阵：** deny零实际动作；approve精确参数；等待审批时cancel；MCP dispatch后丢响应；业务错误/证据写入失败；结果未知后禁止后续调用；Host crash/restart不自动replay/reconnect；重复目录/cursor循环/越限；旧配置或断开连接不能继续调用。remote effect counter与wire attempt分开计数。

**退出：** 每项有绑定、实际动作计数、终态、错误/unknown原因、用户后续可采取动作。MCP未知不冒称失败无副作用；本地未dispatch拒绝也不误说已发生远端动作。

### 5.5 P11-A/B 的首版子集：最小可用能力控制面

**依赖：** 已接受的能力合同；可提前只读核查UI差额。  
**建议写入：** 现runtime-view/settings/model-picker/telemetry及必要的既有API投影。避开用户正在提交的纯视觉修复文件，或显式串行合流。

干净数据目录下，用户能配置模型并选择一个实际可运行的固定能力组合。用随包预置受信组合或最小inspect/import流程补齐，不建设任意包安装器。显示current configuration与selected Run binding；declared、installed/loaded、connected、exposed、permitted不是一个开关。保留scope和来源，unsupported/unknown不冒充可用。

**退出：** GUI→现API→持久配置→新Run绑定→provider工具/上下文→实际执行→事件→GUI至少走一次；重启可解释，旧binding可查。一个按钮只改变本地视觉状态或仅在fixture中成功，不算接线完成。

### 5.6 既有 H0–H3 / G2–G3：正式工作与 Review 合流

**依赖：** 上述执行组合可用。  
**首选消费者：** 复用既定合成Inbound NDA playbook/gold；不要为了Release新造第二垂类。已有coding profile可继续dogfood，但外部人工执行的测试回执不能写成agent已能运行测试。[S09][S10]

**建议写入：** 原Work Extension、Core查询/投影接缝、Chat Sources/Review与Matter继续入口。正式状态继续由Core事务持有。

**纵切：** 上传/选定精确来源→明确Matter/Contract→真实执行→产生绑定版本的Candidate和依据→人接受/退回/补证→正式Artifact/Decision与Candidate区分→新建Session继续同Matter。来源变更后，既有正式决定保留历史，其相对当前来源的basis可以stale；不删除旧决定或自动把新候选接受。

增加来自Core的最小待Review摘要，在Sources折叠时可发现；实际打开再渐进读取证据。刷新/断线/返回/版本冲突走原owner与view-state合同。工具Approve不等于成果Accept。

**反例：** 旧source/base版本、重复请求、伪造actor、只读投影、已关闭候选、Session切换、网络断开后旧动作、来源更新。用现CAS/幂等契约拒绝或返回原结果，不新造跨Host/Core事务。

**退出：** 同一候选SHA的G2/G3证据：Core状态前后、精确来源/候选/正式结果、可操作UI、跨Session的成果/依据/未决。浏览器键盘与关键遮挡检查覆盖此真实路径。真实模型只证明这条工程路径，不证明法律专业准确率。

### 5.7 P12-A/最终独立接受 + G1–G5：候选冻结、真实回归与发布

**依赖：** 上述所有首版阻断项关闭。  
**建议写入：** evidence、原G门台账、app运行/迁移说明、README/Pages的准确事实；必要的发行文件。没有额外授权不修改私人简历、不创建Release、不push/deploy。

**执行序列：**

1. 固定候选SHA和独立数据目录，按公开说明完成fresh clone/install/start；运行默认测试、smoke与必要浏览器矩阵。
2. 在有效授权下完成F3的小型真实Provider集合。记录model/endpoint/API、adapter/能力/config revision、实际请求数、turn与deadline；不把turn上限称为货币预算，不读取/导出密钥。
3. 在独立合成数据副本上验迁移与恢复：Host schema13、Core4、bridge app5分开记录；旧版本拒绝升级后数据；用相匹配旧Host恢复到另一个目录。备份/回退覆盖各自owner，不把git回退代码等同于数据回退。
4. 固定G2/G3真闭环，录制G4的2–4分钟可公开产品演示。旧媒体可保留其来源身份，不能重标为新版本实录。
5. 做G5能力→证据→公开文案逐项对照。只发布有证据的局部能力，明确synthetic/experimental/unsupported范围。形成非作者签署及未覆盖清单后才进入真正的Release动作。

**退出：** G1–G5在同一baseline成立，或逐项有源码等价关系。任何影响wire、admission、store或Core语义的最终修改后，必须按影响范围重跑，不能沿用修改前结论。保留所有失败，不以抽掉测试、隐藏已暴露能力或弱化原产品门求绿。

### 5.8 条件任务：DF-04 受控测试recipe

仅当所选coding局部工作确实需要“agent自己执行测试”时启动；不作为合成NDA首版默认前置。固定recipe、cwd、命令白名单、超时/取消、输出限额、退出码与执行身份；默认不开放任意shell、网络、包安装或共享仓库写入。普通子进程不等于安全沙箱。先合成反例，再受授权的真实使用。[S09]

### 5.9 后续：P03/P04/DRT-03 与更广Work组合

先移出service的SessionManager生命周期依赖，用最小Port承接创建/打开/运行/观察/控制/关闭及opaque native resume handle；DTO由现消费者反推。随后固定公开接口与schema验证第二Runtime，不从上游文档或fake executor直接宣称可替换。

先验证同类受限普通任务，再保持Expert/Contract/Core不变走同一候选/Review合同。unsupported能力明示；跨lane恢复工作使用授权状态投影，不搬私有日志。完整Work façade/Core-free组合根只在真实消费者需要时扩大。按最新架构不阻塞前述局部工作或首版Release。[S04][S30]

## 6. 既有方案与选型如何消费

| 原项/选型 | 本轮处置 | 不允许的误读 |
|---|---|---|
| P01/P02/P02b | 保留既有实现，进入当前候选回归；红fixture后才改 | 再派一遍同名修复，或以删除MCP跳门 |
| P05/P06 | 按现实现收证与补真缺口 | 认定全部未做，另建输入/权限系统 |
| P11/P12 | 拆成首版必要UI与分阶段接受；最终仍回到G门 | 局部46/46或某一片非作者通过等于产品全通过 |
| DF01/02/03/05 | 沿原回执承认已证范围，保留行号/人工测试等限制 | profile=完整Expert；测试代码生成=测试已执行 |
| DF06 | 前置有界能力生命周期核查 | 扩成热插拔平台 |
| DF04 | 实际coding消费者触发 | 无条件加入通用shell |
| P03/P04/DRT03 | 后续能力门；最小Port先行 | 第二Runtime是首版/DF前置；Provider替换=Runtime替换 |
| P07/P08/P09/P10 | memory_text/clean generation/web_fetch/Skill导入按真实消费者 | 为“完整Harness”一次实现所有候选 |
| RD006、RD007、BE6/7及LG/DS/BG | 保留原owner，优先当前精确引用/范围/版本需求 | 延迟工作区绑定、全盘摄取、OCR、graph、memory平台都成为本轮依赖 |
| Pi、MCP官方SDK、jsdiff、现Web | 保留锁定采用；新需求先查已有能力 | 任意升级SDK、重写loop、切React/TypeScript/Rust |
| Spark/Attention/Expert总体图 | 保留职责与后续闭环；首版只承诺实际贯通的部分 | Spark性能必须胜过Pi；只读Spark投影=通用后台工作已完成 |

本轮无需再做一轮大范围选型搜索。只有具体卡暴露接口不适配、版本不支持或维护成本不可接受时，再沿现有source-index/官方来源做定向复核，并记录采用方式、版本、维护owner、退出与重开条件。[S06][S08][S09]

## 7. 可以 Release 的节点

| 节点 | 可以说什么 | 本轮结论/门槛 |
|---|---|---|
| 当前公开展示节点 | 架构、静态Pages、可复现的已记录局部能力与experimental入口 | 已有；不是本报告新增放行，更不等于产品G门完成 |
| Harness能力验收点 | 固定Pi组合及明确列出的Extensions，具有配置、权限、执行、结果、故障和恢复证据 | 5.2–5.5及对应真实回归通过。可以成为内部/开发者验收里程碑；不能据此给整个CourtWork签G2–G5 |
| **首个CourtWork产品Release** | 本地experimental/alpha工作产品；至少一个真实执行的合成专业闭环，可由人作正式决定并换Session继续 | **建议本轮目标。必须关闭G1–G5及本报告首版阻断项。不等待第二Runtime/市场/热插拔** |
| 替换能力Release | 某固定任务与能力集合下，第二真实Runtime可替换，Work权威连续 | P03/P04/DRT03和同Expert/Core矩阵通过后再宣称；不是全能力等价 |

本报告不指定尚未核对的版本号、不创建tag、不设未经验证的完成日期。正式发行版本应由本地现有tags/package/release策略统一裁定。第一版建议保持pre-release/experimental口径，而不是凭文档与一次成功Run标为stable。

### G门本轮签署状态

| 门 | 已有相关事实 | 本轮状态与尚需证据 |
|---|---|---|
| G1 | 旧SHA真实模型/工具/重启证据；目前可读运行文档 | partial-evidence / unsigned：最终SHA干净安装、声明环境、最新wire与失败/取消/恢复 |
| G2 | Work Core/Extension源码、既有局部测试入口 | unsigned：最终候选真实完整Candidate→Review→Decision/Artifact及反例；不宣称从零缺实现 |
| G3 | 同Chat重启、现UI局部回归和修复回执 | partial-evidence / unsigned：同Matter新Session、当前成果/依据/未决、Review发现性及主路径键盘 |
| G4 | 已有公开媒体/Pages回执 | not-signed-in-this-review：本轮未验收媒体内容；对齐目标闭环、数据身份与源SHA |
| G5 | 公开README与最新架构边界已有维护 | unsigned：最终支持声明逐项证据映射；私人简历只提供可消费事实，不在本单擅改 |

## 8. 本地接单时的第一句话

**不要重做架构、不要机械重跑旧20卡。先固定当前HEAD，消费这份增量审阅，处理测试合同与最终证据断层；沿现Pi组合串行补输入/权限、DF06、必要UI和Core Review，再以原G1–G5决定首个产品Release。第二Runtime保留，但不作前置。**

具体执行约束与包内文件回收见 HANDOFF.md；机器映射见 plan.json；来源与覆盖边界见 SOURCES.md。此包校验只证明交付文件内部一致，不是CourtWork测试或发布接受。
