# 工程决策记录

裁决对象是局部工程选择。状态使用 proposed、accepted、deferred、superseded；实验是否通过记录在 RD，不由决策状态代替。用户是当前最终裁决者；未给出技术采纳时保持 proposed。

## DEC-001 · 文档先行与独立工程目录

- 日期 / 状态：2026-09-05 / accepted。
- 裁决依据：用户明确同意在 SE 新建子目录，落定工程拆解、索引、RD、生态消费与长期维护文档；先用手动 loop 治理软件工程工作。
- 决定：本目录只承载研究、方案、记录与验证设计；局部解耦工程选型是最小单元。Courtwork 与 Career kit 作为来源，不在原项目续写。先精密设计长期承重机制，通用基础设施优先复用。
- 接受者：用户（本次明确指令）；文档整理：当前 Agent。
- 影响：建立本目录、根入口与贡献协议的范围说明。Canonical/Practice 语义与版本不因工程文档创建而变化。
- 边界：技术候选、实验通过、自动化监控、对外发送和应用搭建未因此成立。
- 重开条件：用户改变工程范围、将某部分授权进入实现，或论文语义变化影响工程边界。

## DEC-002 · 首个 Runtime 与语言组合

- 日期 / 状态：2026-09-05 / proposed。
- 问题：OpenCode Server 的 GUI 集成成本，与 Pi SDK 的嵌入和控制成本，哪条更适合首个闭环？
- 建议：OpenCode + 薄 Work Surface 作为 GUI 路线；Pi coding-agent SDK 作为嵌入路线；DeepSeek 插件路线作为架构对照。应用层先比较 TypeScript 贯穿闭环。
- 证据：[公开快照](ecosystem/2026-09-05.md)、[本地材料](ecosystem/local-sources.md)。前轮分队对优先级有分歧；未以共识掩盖。
- 替代与成本：复用完整产品壳会带来第二套配置/状态与升级节奏；只拿底层 loop 会增加持久化、权限、GUI 适配。两者均需估算。
- 决策依赖：[RD-001](research/RD-001-runtime-adapter.md)。已有固定版本探针，真实Runtime与SDK模拟分列；最终独立结论未收口。
- 退出路径：Work Core 不消费宿主对象，保留独立 State 与导出。不能只用接口外观声称迁移成功。

## DEC-003 · 存储与正式提交

- 日期 / 状态：2026-09-05 / proposed。
- 问题：怎样用最少基础设施维持 Candidate/Committed 隔离、版本一致与恢复？
- 建议：SQLite + 单一提交服务；小型文本成果同事务保存；状态迁移、Evidence、Authority 和幂等语义自行定义。
- 替代：事务 State + 审计记录与完整事件溯源在 [RD-002](research/RD-002-commit-recovery.md) 比较；不先承诺全事件溯源。普通文件只作成本/失败行为对照。
- 代价与重开：未来大文件、多写者、外部 system of record 或同步需求将重开存储边界；不保证数据库文件级回滚就是语义回滚。
- 证据状态：本项目已执行事务、SIGKILL、迁移拒绝、备份及工具入口测试；v2独立黑盒63/63，B1最终库18+6份事件对账通过；本地固定范围建议B0 State+audit，正式切片仍待12汇合。详见RD-002，不能把局部结果外推为产品验收。

## DEC-004 · Design 系列与 Prototype 并行研究

- 日期 / 状态：2026-09-05 / accepted（研究范围）。
- 输入：用户要求重视成熟 Agent GUI、探索陌生化设计语言，建立 Design 系列与候选裁决，并派 Luna 研究 Vercel、Linear、Apple 资料及 OpenWork/DSH 完成面。
- 决定：建立 [Design](design/README.md)，以官方资料分类、状态/恢复完成面、三方向候选和 D0–D5 原型计划展开。低保真/状态原型研究提前，真实联调仍依赖相关 RD。
- 接受者：用户明确提出的工作方向；作者整理与局部推荐：当前 Agent。
- 边界：没有采纳任何视觉方向、组件库、字体、动效数值；没有宣称已审计上游 UI、生成 prototype 或通过可访问性验收。
- 具体设计选择：在 [Design decisions](design/decisions.md) 记录，工程状态仍由 current 汇总。

## 后续记录格式

每项包括 ID、日期、状态、问题、候选、证据/RD、决定与责任人、后果、兼容/退出路径、重开条件和被取代 ID。低成本可逆的实现细节留在 Assignment；只有改变接口、所有权、长期依赖或验证边界才新增 DEC。

## DEC-005 · 按局部门槛执行 MVP

- 日期 / 状态：2026-09-05 / accepted（执行授权）；Astra落实。
- 依据：用户在 [fresh交接](mvp/astra-handoff.md) 明确从编单转入研究、可逆实验及通过门槛后的施工，指定Astra架构与fresh Luna执行/独立检查。
- 决定：[执行章程（历史路径：`mvp/execution/charter.md`）](migration/2026-09-08/evidence-index.md) 采用现有文本备忘录拟议范围为局部验证基线，零付费先行；原始资料只读，SE记录，临时目录实验。正式Runtime/provider和视觉仍未采纳。
- 后果：DEC-001的原文“未因此授权”只描述当时授权，不能阻断本次已授权动作。G0/G1/G2证据和作者/Reviewer分离继续生效。
- 退出：实验失败只退回相关依赖；真实provider具体预算与用户视觉选择独立处理，不停其他分支。

### DEC-003 追加裁决依据（仍proposed）

2026-09-05，Astra实际读取[Microsoft Event Sourcing pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)：其区分事件权威与投影，提示事件版本、重放及迁移增加维护面，传统存储在许多情境足够。本项目仍需B0/B1同门槛实际对照；该资料不证明B0已更小，也不要求引入消息队列。阶段一B1事件载荷缺口见RD-002，必须先修再比，不能以对照实现有bug直接淘汰模式。

### DEC-002 v3 证据更新（仍proposed）

2026-09-05，Astra依据 [OpenCode工具表面独验（历史路径：`mvp/execution/opencode-surface-v3-review.md`）](migration/2026-09-08/evidence-index.md)：固定1.15.11可用官方C1配置将模型可见工具收窄至两项，并拒绝未知名称。此前基于默认/ask配置的“危险工具仍可见”不再构成淘汰该候选或优先Pi的充分理由。两者继续按真实Core联接、取消、执行预算和宿主责任比较；本轮不正式选择Runtime/provider/语言栈。C2配置无新增必要证据而不加入；B0本轮默认对照无效，不称最小方案证明。

### DEC-002 v3.1 组合局部裁决（仍proposed）

2026-09-06，Astra依据 [组合独验（历史路径：`mvp/execution/runtime-combined-v3-review.md`）](migration/2026-09-08/evidence-index.md)：固定Pi0.83.0与Core B0可继续作为下一轮本地受限切片的实验基线，限已测Matter/Run闭包、Candidate准入、provider callback守卫、终态与snapshot数据重开。旧版assistant错误误报completed的反例保留；新v3.1受影响项独验通过，不把旧hash的24次证据改写为新版全量通过。

组合删除对照支持在本fixture保留call/deadline/零预算fake白名单守卫；此前重复JS身份检查和自建trace可删的裁决不变，Core trusted Context保留。source/contract宿主检查未经完整独立消融，不宣称必要性已证明。没有正式选语言栈/provider、没有产品准入、没有全局最小方案结论。

原作者两轮局部调试后，针对独验发现的错误终态和缺失竞态追加一次明确限额修复；保留全部失败并停止本批继续修复。该执行偏差不改变G1/G2、真实预算0或作者不得自验的门槛。pending/reply/resume是否可在正式切片声明unsupported，仍需11/12及人的工作路径验证。

## DEC-006 · 先实现前后端框架，真实key与最终Design后置

- 日期 / 状态：2026-09-06 / accepted（用户本轮明确授权的施工顺序与职责）。
- 用户决定：provider采用Pi及DSH的统一策略方式；GUI完成后由用户测试真实key；先定义完善前后端框架，Design选型与Codebase取舍/消融由用户后审；在不依赖这两笔前持续实现。Astra掌架构工单，fresh Luna实现源码细节。
- 执行解释：允许原13—21中本轮接口/功能骨架所需局部施工，不再以07真实调用、09最终选图和11人的实验全部完成作为任何应用代码的前置。具体边界见[清账（历史路径：`mvp/execution/decision-ledger-v4.md`）](migration/2026-09-08/evidence-index.md)及[方案（历史路径：`mvp/execution/next-round-plan-v4.md`）](migration/2026-09-08/evidence-index.md)。
- 初始框架：Node ESM宿主、私有Python Core服务、B0 SQLite、可替换Web投影。保留已验Core源码，新增安全初始化、Run/草稿元数据、可信Review/API；原生Web功能壳不采纳最终Design/Codebase，也不宣称已证明最小必要。
- Provider：核实Pi/DSH的具体配置/认证/适配模式，二者不是模型服务商；真实key/调用后置，当前不消费已有凭证。框架模拟运行必须显式标识。
- 保留门槛：作者不能自验；新应用边界实际测试；G1完整证据、人的Review、真实模型及G2未被追认为通过。用户后续测试不等于现在授权Agent读取或花费真实key。
- 重开：用户变更能力/技术路径，或新的真实验证否定当前框架假设；仅重开受影响项。

### DEC-006 补充：PT2 Harness Core 候选与 Provider 范围核对（2026-09-06）

一次外部 Harness Core 只读交付（[RD-004](research/RD-004-harness-core-pt2-reconciliation.md)）的 provisional selection matrix 把 Provider 列为"采用所选宿主的 provider"，与本决议"provider采用Pi及DSH的统一策略方式"（本节原文）并列时出现一处未核对的范围重叠：本决议的"统一策略"可能指（a）产品层面的 provider 配置/认证一致体验，（b）具体复用 Pi/DSH 的 provider 实现，或（c）以 Pi+DSH 组合作为执行拓扑本身——三者对 PT2（[pre-takeover-roadmap.md](pre-takeover-roadmap.md) "正式 Runtime 选择在此节点作出"）的约束程度不同，原文本身未指明取哪一种。RD-004 §2 逐条核对了原文支持程度，认为（c）的原文证据弱于（a）（b）。

**本条只记录该核对结果与待裁决问题，不改变 DEC-006 的状态字段（仍为 accepted），也不因新交付的 provisional matrix 而静默变更本决议的执行含义。** 是否需要正式修订、修订为何，留待用户裁决；裁决前 PT2 候选比较应把"host + provider 组合"作为同一比较单元，而非分别独立选择后再拼合。

## DEC-007 · 通用 Agent 地基与可加载 SE 工作面优先

- 日期 / 状态：2026-09-06 / accepted（用户明确产品方向与阶段次序；具体实现仍待取证和验收）。
- 从新地基构建薄 Harness Core 与普通 agent UI Core，优先研究 DSH 式适配/热插拔和 Pi 极简内核；provider优先ds，按语境理解为DeepSeek，精确model/route未选。不开fork后微调路线。
- Web快速迭代：左侧项目/会话、中间chat及通用ask-user，右侧解耦preview/browser表面承载额外扩展UI和非聊天HITL。只调整页面逻辑；Paper特有产品表达的Polish后置。Codex/Claude实查取证未做，交下一轮。
- 第一个SE最小专业场景作为扩展测试完整链；不使其定义通用Core。Expert稀疏激活类比MoE不等同模型架构，不取消Paper的authority/commitment边界。单场景不等于Practice §7完整泛化认证。
- Courtwork只按需蒸馏历史材料；新实现成熟后计划承接品牌与repo，本轮不迁移。Paper优先，不能实现的命题须记录反例并依Practice Index裁决修订/悬置。
- 本轮收工交接，用户手动调整Codex功能后开启下一轮；无自动化。真实key仍由用户GUI后测试，当前Agent真实付费调用0。
- 取代：v4垂直卡片壳继续增长为主产品、先完整SE专业表面再通用agent的推进方向；保留v4已有局部证据与可复用语义，不作全部重写或技术采纳结论。详见[fresh handoff](mvp/fresh-handoff-v5.md)。

## DEC-007 补充：V5 实施与参考边界（2026-09-06）

用户再次明确 Court Work、DSH 的成熟 Web UI，以及 Court Work Codex/Claude 施工 session 可以具体参考；Harness Core 与 UX 均可在 SE 理念下生长。Astra将此作为 DEC-007 的解释更新：从新地基构建不等于拒绝成熟机制，按具体问题蒸馏、核对权限/状态语义后采纳。

[V5结果（历史路径：`mvp/execution/framework-v5-result.md`）](migration/2026-09-08/evidence-index.md)仅裁定一个fake首切片局部可操作，未裁定最小必要方案、adapter替换消融、真实模型质量或Compiled Expert成立。当前同源受信renderer不是完整内嵌浏览器。下一步优先按具体参考补当前交互与Harness缺口，Design Polish与真实key测试仍由用户后续开启。

## DEC-007 补充：V6 成熟 UX 的来源与迁移（2026-09-06）

用户授权深入操作 Claude，Courtwork 文档、归档、工单和commit先作索引，有价值的具体裁决再让Luna查源码。用户随后明确extensions/experts下一轮，本轮仅通用Harness Core/UI及SE必要接入兼容；SE作为额外preview tab。已写renderer增强隔离为deferred，不进入本轮活动源码。本轮实际观察Claude的搜索定位、文件阅读切换、工具详情及浏览器关闭重开状态；从Courtwork选取身份门、信息分层和同作用域状态保留三组机制。迁移进入现有V5通用UI/preview宿主，不搬源产品的schema/store/权限或继承治理结论。见[来源裁定（历史路径：`mvp/execution/source-selection-v6.md`）](migration/2026-09-08/evidence-index.md)与[V6结果（历史路径：`mvp/execution/framework-v6-result.md`）](migration/2026-09-08/evidence-index.md)。

## DEC-007 补充：Fresh Astra 前端回溯与 Core 分轮（2026-09-06）

用户在 V6 收尾后明确：fresh Astra 收缴和消费 Courtwork、DSH Web UI、Claude Desktop 前端；Harness Core 独立一轮，runtime 的实现按 SE 编排理念收敛开源生态和 frontier 局部实现思路。工作方式不变，explore agent 优先 Luna，出现能力瓶颈可升级。该裁决控制下一轮范围与分工，不把 V6 或参考产品实现定为最终架构，也不将 deferred extensions/experts 自动纳入前端轮。接手材料见[最新 handoff](mvp/fresh-astra-handoff-v7.md)；本次仅编制交接，没有创建或启动 fresh thread。

## DEC-007 补充：V7 前端编排的有界实施记录（2026-09-06）

- 依据：用户按fresh-astra-handoff-v7开启本轮，延续已授权可逆实现；不改变最终Design/Codebase技术采纳责任。
- 局部实施：普通命令/草稿/读取持有明确目标与修订/观察边界；单槽工作面布局与renderer生命周期分开，Bind动作完成可见路由和焦点交接。来源原则和拒绝迁移项见[V7取舍（历史路径：`mvp/execution/frontend-v7/source-selection.md`）](migration/2026-09-08/evidence-index.md)。
- 工程验证：最终hash的非作者命令11/11、工作面完整场景1/1，Astra通用UI10/10及Preview13/13；实际页面与新目录恢复启动另有证据。见[V7结果（历史路径：`mvp/execution/frontend-v7/result.md`）](migration/2026-09-08/evidence-index.md)。这是局部工程验收，不是用户对技术栈或Paper的最终认证。
- Core边界：本次不改runtime/Core/API/SE renderer；命令回执幂等、一致快照/恢复、等待预算、多对象协议、adapter替换单列[下一轮义务（历史路径：`mvp/execution/frontend-v7/core-round-obligations.md`）](migration/2026-09-08/evidence-index.md)。新任务须按用户下一轮安排开启。

## DEC-008 · 两仓职责与夺舍前路线（2026-09-06）

- 依据：用户在 Courtwork Legacy Freeze 闭环后裁定，把 Fresh 壳施工与未来夺舍之间插入一条明确的 pre-takeover roadmap，避免某个 GUI milestone 看似完成就提前替换 Courtwork `main`。
- 两仓职责定死：Schema Engineering 为 doctrine / paper / evidence corpus，Fresh Courtwork 为 executable practice / Work Agent reference implementation。二者是理论规范与实践验证的关系，不是 monorepo 上下游。Fresh 可反向产生 evidence、failure attribution 与 practice note，但不成为 paper 的权威来源；Fresh 的单个实现决策不升级为 SE 理论。
- 阶段与门见 [夺舍前路线](pre-takeover-roadmap.md)，编号 PT0–PT9，与 [roadmap.md](roadmap.md) 的 R0–R5 不互相映射。当前位于 PT0，critical path 为 G2 accept → G1 → rebind Polish → 视觉裁决 → PT1 关闭。
- 边界：本裁决不授权开新的大施工线，不改变正式 Runtime 未选的事实（选择落在 PT2），也不使任何 PT 阶段的门自动通过。PT2 只读 runtime explore 可与 PT0/PT1 同期，但不施工 runtime core。
- Legacy 侧关闭：Courtwork legacy 已冻结，除非 Fresh 提出具体 legacy fact 或 asset 需求，不作进一步整理。

## DEC-009 · 从只读研究转为受控集成施工（2026-09-07）

- 依据：用户交付施工单《Fresh Courtwork — 通用 Agent 集成至夺舍就绪》（原文快照 [pt2-integration/inputs（历史路径：`mvp/execution/pt2-integration/inputs/fable-integration-to-takeover-ready.md`）](migration/2026-09-08/evidence-index.md)，sha256 `ff75c033…`），并指定 main Fable 掌架构、Sonnet 5 explore。状态：accepted（用户授权范围），实现选择仍待证据。
- 授权增量：允许在明确隔离的候选目录（`/private/tmp/se-agent-v9-core/`，端口 8804）安装已核定依赖、运行有界接缝探针、编写薄适配与测试、接入用户提供 key 的真实 provider、在测试资源中执行恢复与权限反例，并把候选推进到独验交付。DEC-008 中"PT2 只读 explore，不施工 runtime core"一句就此局部取代；PT2 的门仍未通过，PT 编号与其余 DEC-008 内容不变。
- 不授权：覆盖 legacy Courtwork `main`、批量迁移或删除旧数据、读取 `~/.pi/agent/auth.json` 等既有凭证、新云服务或付费资源、生产部署、改动仍在独验或施工中的 G2/G1/Polish 活动目录、宣布 SE 理念认证。授权到 takeover-ready，不到 takeover-executed。
- 选择单位与首个候选：host + provider + 执行环境 + 薄 GUI adapter 的可运行组合。架构裁定主候选 K1（Pi coding-agent v3 AgentSession 固定 0.85.x + DeepSeek 经 pi-ai + 本地 workspace 受限工具 + 现有 `/api/v5` service 作唯一命令 owner），对照 K0（现有简单 Agent 路径）。见 [C0 接管记录（历史路径：`mvp/execution/pt2-integration/intake.md`）](migration/2026-09-08/evidence-index.md)。这是可撤销实现选择，不是 Runtime 最终采纳。
- 与 DEC-006 的关系（用户 2026-09-07 确认按此推进）：本阶段的**有范围的选择**是统一 provider 使用体验并复用 Pi 的 provider 实现（RD-004 的 (a)+(b)），不为体现 "Pi+DSH" 引入两个执行宿主（不取 (c)）；DeepSeek 是首个真实链验证对象，不自动成为最终唯一 provider，原有 provider/model 覆盖要求不因此缩减。这不是对 DEC-006 原文含义的裁定：若原文被确认含更强的实现承诺，差异须列为 DEC-006 的局部修订后组合才能最终接受，不得以"工作解读"隐去。K0 只作对照，不是 K1 出错后的静默生产回落。
- 保留门槛：作者不自验；每次验收绑定完整 hash manifest；fixture 证据与真实 provider 证据分列；未实现的正式批准能力不画成可用按钮；一个 Run 只有一个执行生命周期 owner；持久数据不放进可销毁的执行目录。
- 重开：用户改裁 DEC-006 范围、主候选在 Q1/Q6 类接缝上需要 core patch、或真实闭环暴露需自研的语义缺口时，只重开受影响批次。

## DEC-009 补充：自足节点后的架构 handoff（2026-09-07）

用户指令：本轮施工（C1–C2）到自足节点后，架构 handoff 给 Codex；前端继续在 Claude 由 Opus 施工；Astra 与 Luna 集群独立验收并沿 pre-takeover roadmap 继续消费 Harness Core。自足节点条件、交接事实与未决项见 [handoff-codex.md（历史路径：`mvp/execution/pt2-integration/handoff-codex.md`）](migration/2026-09-08/evidence-index.md)；前端合流工单草案 [assignment-c3-draft.md（历史路径：`mvp/execution/pt2-integration/assignment-c3-draft.md`）](migration/2026-09-08/evidence-index.md) 由 Codex 架构冻结。main Fable 在 handoff 定稿后停止派工。角色分工仍是开发工作流，不改变验收要求或产品运行拓扑。用户另裁：DeepSeek key 只在 web UI 中输入测试，届时同时验 harness runtime 与 UI；真实 provider 证据入口因此落在 C3 的 key 配置面，C3 就绪前真实链证据保持 `not_run`。

## DEC-010 · GUI两层分工与第一层优先（2026-09-07）

用户明确：web UI迭代先完成各级版面、路由与功能齐全，对标Claude、Codex、DeepSeek web、Open work等成熟agent GUI，少自研；SE当前主要保留兼容性及独立preview tab，为后期任务留接缝。第二层美观和精细UI/UX polish后续另交Claude消费index与成熟库。Codex侧由Luna真实computer use并记录成熟GUI，Astra消费形成Claude工单，同时推进自足前后端至Courtwork takeover-ready，自足节点后的独立Fresh仓同步git沿既有计划执行。

本决策调整当前优先级，不废弃已经取得的L4证据，也不把纯polish未定当作G1/C3功能施工阻塞。焦点/可达性/遮挡/诚实状态是基本功能要求。Astra仍负责Core与集成裁决，Claude仍为单一前端writer；真实key仍由用户在GUI输入，legacy main未授权自动替换。执行入口：[GUI第一层接管（历史路径：`mvp/execution/gui-completeness/intake.md`）](migration/2026-09-08/evidence-index.md)。

## 2026-09-07 后端持续施工补充

用户进一步明确：真实闭环仍在 Web UI 建立阶段；其余可施工部分由 Codex 从第一性原理落实基础 Harness Core 与 runtime，不因等待 UI 停止，也不以过量保护性测试代替实现；按 SE 理念保留后续迭代性。此授权更新此前“后台转入等待合流”的工作建议，真实 provider 仍通过用户 Web UI 路径合流验证。

本批落点为 runtime foundation：可独立运行的生命周期 owner、当前上下文接入、事件落盘后再完成、正常退出、能力/模型查询和可复现启动。沿用 Pi 执行与原生会话，正式接受仍归领域 Review；未来 orchestra 为外部命令调用方。只补本批关键行为验证并运行现有回归，不新增重复故障矩阵。前端活动目录与 legacy main 不在本批写入范围。


### DEC-009 补充 · runtime 开源溯源审阅（2026-09-07）

用户要求对来自开源成熟实践的局部选型派 Luna 溯源做 diff 审阅：build 绿不等于
功能实现，需要按局部与成熟行为的差异确定完成颗粒度，并论证组合架构是否成立。
据此对固定 Pi 0.85.1 的协议/缓存、session 生命周期/压缩、工具/存储/扩展分三路只读
审查，以精确上游版本、真实本地调用和可观察行为为证据。Astra 汇总并修复确认缺口；
不以来源成熟代替本地实现，不要求无差别追平上游 CLI 全功能。最终见
[开源溯源裁决（历史路径：`mvp/execution/pt2-integration/review/runtime-upstream-adjudication.md`）](migration/2026-09-08/evidence-index.md)。


## DEC-011 · Fresh integration 文档搬迁授权

- 日期 / 状态：2026-09-08 / accepted（本次有界文档搬迁授权；Astra 负责集成与迁移裁决，Luna 负责指定文档整理与独立证据索引）。
- 范围：在 `codex/fresh-integration` 工作树内整理 `engineering/` 文档；把 SE root 与 continuation 的完整工程树保存在本地私有证据副本；公开树只吸收 continuation 的非 `mvp/execution` Markdown、当前 UI polish/runtime-control-frontend 必要文本，以及迁移裁决和 fresh Design context。不得改应用源码、legacy `main`、SE 原件、用户凭据或活动作者工作树。
- 当前基线：UI `4fab4bd`、Runtime `8722259`、Brand `faef241` 与权限修复 `787bf1c`，最终代码合流 `d44fb28`。后端134项在787bf1c通过且随后未改后端；最终前端18项和权限2项通过。Claude补交4fab4bd后delivery更新、原树干净，已一并消费，未遗漏该增量。
- Paper：产品根 [`PAPER.md`](../PAPER.md) 固定 SE Paper 9.3 / `f8ecb091895559389bb4e75f3c6f28052b71c5a3`；不复制第二套可编辑 Paper。
- 谱系：保留 fresh 独立根为 `archive/fresh-pre-courtwork`；在 legacy `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476` 父提交上以替换 tree 形成 `codex/fresh-courtwork`，避免把 SE/fresh 与 legacy 历史混成一条无审阅关系的合并历史。只推送候选分支和 archive ref；`main` 保持不动。
- 退出：候选源码、必要工程文档、依赖与可恢复性证据均固定并复核后，才可同步远端；main takeover 仍需独立的自足、legacy 蒸馏、回退和产品验收门。
