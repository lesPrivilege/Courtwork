# 归档索引

历史材料唯一存放处。本索引是归档的**唯一入口**：续行会话按此定位历史证据，不逐文件回读原文。

## 使用纪律

归档材料是历史证据链，不是现行规范。`archive/` 全部内容不参与实现或验收，不得被现行文档、源码、脚本或 SPEC 直接引用（唯一例外见 `docs/README.md`「史料引用例外」：ADR 来源段与就绪图工单行可引路径作历史线索）。归档结论——即便文内标有「架构定调」——只有经现行 ADR、SPEC 或就绪图工单逐条吸收后才具约束力；升格动作须经架构拍板并在现行文档留痕。归档报告中的行号、计数、版本号与外部事实是当时工作树的历史坐标，会漂移；当前验收只认 `docs/status/current.md` 与现行 SPEC/ACCEPTANCE，不得从归档恢复字段、状态或验收标准。reconnect 时架构层文档（`docs/README.md` 起）自足开工，仅在追查现行规则历史成因或核实调研结论是否被推翻时按本索引定位。

## handoffs/fable-pi-foundation-2026-07-29.md（现行接棒索引，非权威契约）

Pi 基础线合流后的 Fable 长会话接棒件：索引现行 authority、串行收敛链、Fable/Sonnet 分工、
GUI/Design 边界、调研召回与 OSS 复用闸门，以及未落仓线索。它只帮助新会话恢复 context；
实际能力、字段、依赖与开工条件仍只认 `current.md`、implementation-readiness、ADR、SPEC 和
ACCEPTANCE。后续 handoff 取代它时，应更新本索引，不得让两个“现行接棒”并存。

## research-design-anti-slop-recall-2026-07-30.md（Fable Design / GUI 召回补记）

核读 René Wang `Field Notes`、仓外 `anti-ai-slop-kit` 与用户再次提供的两份 `.dc.html`；
确认两份 HTML 已以相同 SHA 进入 VERSIONAL-LANG 证据链，kit 的八站数据与旧归档大量重复且有
观察漂移、整包无可复用许可。裁定只借 before/after 决策日志、参考“3 借 3 拒”、状态矩阵与
人工 anti-slop 问题集；拒绝复制 token、prompt、法律布局、截图和外部皮层。附 GUI/OSS
证据状态速查与 Fable 固定召回顺序。本件是归档输入，不替代 `docs/design/` 或当票上游复核。

## handoffs/desktop-audit-handoff-2026-07-13.md（历史审计交接，已封存）

原 `apps/desktop/AUDIT-HANDOFF.md` 原内容迁档并加归档说明，记录 `main@2e5c014` 时的视觉批、旧机器门数字、
并行索引清理与 lint 假绿判例。2026-07-28 从活动 desktop 层移除，避免其“最新/待办”措辞被误作
现行事实；仍保留为旧验收证据入口。现行数字只认 desktop `ACCEPTANCE.md` 与 `current.md`。

## harness-core-1-stage-a.md（Stage A 决策材料，裁决已闭合）

`HARNESS-CORE-1` Stage A 全文：口径核实（含「减法八条不存在」的坐标订正）、四份 ADR 草案、`TOOL-READ-1` 票面重建、Stage B 实现分解，末附 R-1…R-27 与架构逐项裁决。

**已闭合**——四份 ADR（016 统一填格协议 / 017 受控命令执行 / 018 执行隔离与沙箱 / 019 卷宗容器与本地缓存）均已 `Accepted` 且决定与理由全文在 ADR 本体；Stage B 各票已入实现就绪图。本件此后只作历史证据线索。

## harness-core-1-stage-c.md（Stage C 九域对照，裁决已闭合）

`HARNESS-CORE-1` Stage C 全文：chat/work 面九域功能对照、存疑取舍自评、顺带发现与批次建议，末附 R-1…R-16 与架构逐项裁决（含「重新生成/多回答分支」与「`/command` 上下文操作」两条裁死、附录 A 减法八条现行锚点对照）。

**已闭合**——C3-1…C3-5 已入实现就绪图并标注 `App.tsx` 串行约束与波次；两条「已裁不做」入 roadmap；i18n 取舍入 `voice.md`。本件此后只作历史证据线索。

## arch-scope-2026-07-20.md（事件性评估单，裁决已闭合）

2026-07-20 架构评估单全文：候选盘点（就绪图开放工单／案头队列／归档待立项／长期缺口逐项判定与排序）、对外叙事口径审查、设计体例实况评估，末附 R-1…R-17 裁决请求与架构逐项裁决。

**已闭合，结论已全部落入现行文档**——就绪图 ARCH-DEBT 清单与 B5 销号、`typography-density.md` 发凡六（洇染拒迁／朱印互斥）、`voice.md` 门的边界与 chrome 语言口径、`apps/desktop/SPEC.md` 的 ledger 契约节，以及 `maturity-claim`／`source-hashes`／ledger target 三道新门。本件此后只作历史证据线索，不构成现行依据；能力状态仍只认 `docs/status/current.md`。

## arch-rulings-2026-07-26.md（裁决备忘录，已落痕闭合）

2026-07-26 架构裁决备忘录全文：ARCH-DEBT 裁定会三笔半定谳、调研消费 pass 七条清零、GUI 候选八项裁决。**已闭合**——裁定与新票（`UI-TOAST-1`／`WORK-PLAN-PANEL-1` 等）已于 2026-07-27 落入实现就绪图（裁定会记录节＋2026-07-26 裁决批新增票节）、roadmap 不做留痕批与 workflow 依赖许可节。本件此后只作历史证据线索。

## research-gui-design-direction-2026-07-28.md（pi 基础 GUI / Design 复核，已部分消费）

复核 Moda Micro-interaction Pack、OpenDesign、Logue、Open WebUI 0.11.0、assistant-ui 与旧
Radix/cmdk/dockview/OpenWork 供料，区分“成熟 GUI 机制”与“Courtwork Design”。结论为浅色
先行、冷白与深墨拉开、扁平、版本目录学、克制反乌托邦及 anti-slop 禁区；同时明确不在 Opus
开工前冻结 wireframe、最终色值或逐处间距，构图/浅色 token 微调/微交互/截图迭代由其承担。
**已部分消费**至 ADR-022 六-D 与 `PI-LANE-UI-1` 就绪行；本件只作参考证据，不是组件或 token
真源，外部许可边界亦不得从归档反推为可依赖。

## design-prototype-2026-07-19-r2/（历史 R2 原型，部分结论已被现行设计覆盖）

封版原型、构图盘点与当时的 consolidation survey；可用于追查版式取舍和反例，但不是现行 token、
字体、线级或组件真源。进入新 GUI 票时必须与 `docs/design/` 现行规范以及
`site/craft-evidence/SKIN-R2-*`、`VERSIONAL-LANG-*`、`SITE-CRAFT-2*` 的真实验收证据对照；
旧原型与现行证据冲突时，以后者为准，不得照图复刻。

## adr-drafts-2026-07-26.md（ADR 草案两份，已成文闭合）

甲（ADR-017 修订案）、乙（ADR-021 草案）、丙（ADR-021 增补：CONTEXT-SURVEY-1 调研回执与产品裁量）。**已闭合**——甲已按修订案三件落入 ADR-017（修订记录 2026-07-26）；乙丙已合并成文为 ADR-021（Draft 占号）。本件此后只作历史证据线索。

## benchmark-openwork-2026-07-26.md（OpenWork 标杆实测，已消费）

`different-ai/openwork` tip `1f41a52` 源码实测：agent loop 100% 外包 opencode 的结构判定（GUI 标杆成立、harness 标杆是 pi/opencode 本体）、三栏对照（已裁不做全部经受实测／有票项获借形坐标／真空白仅三项）、差异化资产清单（预算硬限额/持久授权/原件只读/fail-closed 门禁均在其空白区）。**已消费**——三枚裁决（`CHAT-QUEUE-1` 入票池、OPENWORKER-SURVEY-1 续档、opencode 定向调研挂 `TOOL-READ-1` 前置）已落就绪图与本索引；导航栈与产物面板动作排不采纳入 roadmap 留痕。时效随对象仓演进折旧，结论锚定上述 tip。

**2026-07-28 时效订正（部分过时）**：二次复核锚定 OpenWork `dev@1aba9e3`、OpenCode
`dev@3f9dad3`。旧报告仅“OpenWork 把 agent loop 委托给 OpenCode”这一结构结论仍有效；
原 file:line、薄壳归纳及 busy/steer 生命周期已漂移。当前 OpenCode 会先持久 user message，
再由运行中的 loop 重读形成 immediate steer；OpenWork 同时提供 immediate steer 与 Zustand
内存队列，Stop 会清队列，队列不耐久。`CHAT-QUEUE-1` 不再以上游“无 steer/busy reject”为
事实依据。GUI 成熟度未经当前截图、交互、恢复与源码验收，不构成选型放行。

## pi-ecosystem-2026-07-26.md（pi 生态摸底，已消费）

云端网页层调研：官方 registry 5,312 包实存、五类扩展编目（权限确认/sandbox/compaction-memory/工具扩展/UI-TUI）、textbook 零命中改拼装消费（作者博客四篇＋官方 extensions 文档）、深读名单五项。**已消费**——三枚裁决（`SANDBOX-PROBE-1` 候选对＝sandbox-runtime vs gondolin、`TOOL-READ-1` 借形坐标＝官方三例＋cc-safety-net、新增 clone 三仓待各票取用）已落就绪图。注意：WebFetch 数字（star/日期）不可靠已被调研自证，机制描述系多源交叉。

## research-2026-07-27-parallel-survey/（并行时效调研批，只读，不进权威链）

DEBT-DOSSIER-1 在途期间的四路云端并行调研：opencode 定向三题（TOOL-READ-1 前置）、沙箱案头对照（SANDBOX-PROBE-1 前置）、历史论断五组时效核查、竞品态势脉搏。批内 README 载文件表、时效三态与消费去向；全部裁决已于 2026-07-27 落就绪图（TOOL-READ 前置销记、SANDBOX-PROBE 案头补记、CHAT-QUEUE 口径订正）与 roadmap 复核行。**已消费**。

**2026-07-28 时效订正**：批内 Q3 所据“server 无 steer、忙时拒绝”已被当前 OpenWork/OpenCode
源码复核替代；其余结论不随之自动失效。现行行为事实与 Courtwork 排队裁决只认实现就绪图，
不得从本批恢复旧口径。

## research-2026-07-27-memory-continuation/（记忆与续行对照批，只读，不进权威链）

产品负责人提议、架构派发的两路 Sonnet 调研：OpenClaw（注入组装/缓存边界二分/记忆写入/压缩生命周期/心跳）与 pi 生态记忆扩展（pi-hermes-memory/官方 handoff.ts/pi-rewind/pi-observational-memory）。批内 README 载消费 pass（加固三条、反例实证一条、新输入一条、深读 +1、显式不采纳两条、license 红线一条）。**已消费**——ADR-021 评审素材已挂指针，深读清单与 DOSSIER-FLOW-1 行已更新。

## docs-legacy-2026-07-13/

2026-07-13 文档重整时退出权威链的第一代 `docs/` 全量快照（基线 `f03e742`，143 文件，原编号 00–94 + superpowers/plans）。MANIFEST.md 逐段标注归档原因（已省并/已由 ADR 重述/已被后续契约替代/证据快照）。整体视为已升格或已过时的历史底稿；只在追查某条现行规则历史成因时按原编号定位。

## research/（workbuddy-interaction-bench-2026-07-16）

- `BEHAVIOR-MATRIX.md` — WorkBuddy 只读行为语料枚举（六段体例）。定调：行为语料源非正确性真源。已升格：`WORKBUDDY-INTERACTION-BENCH` 工单。

## research-2026-07-14/（A–F 批，全部已升格）

`durable-work-state`→ADR-010/WORK-STORE-1；`host-file-authorization`→ADR-004/005 + CASE-ROOT/HOST-AUTH-LITE；`legal-scan-corpus`→ingest SPEC；`package-machine-gates`→registry/tools SPEC；`wps-compat`→output SPEC；`deepseek-usage-billing`→provider SPEC + USAGE-LEDGER-1；`INTAKE-RAW` 为过程性文件（已过时）。

## research-2026-07-15-round-2/（R1–R6，须按目录 README「阅读校正」读取）

R1 多宿主解耦→system.md 复用边界；R2 多写者×跨案矛盾→roadmap 前置；R3 材料链真实度→current.md/就绪图实测清单。**已过时**：R4 output 真实度（「真实产品可达」判断被校正推翻）、R5 触发/门禁推演（未被采纳部分）、R6 claimed-vs-real（v0.1.1 口径过期）。

## research-2026-07-19-work-agent-landscape/（WORK-AGENT-LANDSCAPE-1，只读，不进权威链）

市场流通 work agent 架构全景（WorkBuddy / TRAE Work / QoderWork / Kimi Work + frontier 旁节）。八问对照：工具集·授权·容器·工作流·记忆·知识包·toolResult·降级。不重做 WORKBUDDY-INTERACTION-BENCH / session-recall-survey。

| 文件 | 主题 | 时效三态 | 消费状态 | 消费去向（吸收前无约束力） |
|---|---|---|---|---|
| `landscape.md` | 逐家八问表 + 横表 + 三桶（可借形/反面教材/中性事实） | **有效**（2026-07-19 一手抓取） | **已消费**（消费 pass 2026-07-19，逐条裁定见下） | 见消费 pass 记录 |
| `README.md` | 批次入口与范围 | 有效 | 已消费（随批） | — |

**消费 pass 记录（2026-07-19 架构逐条裁定，零悬置）**：可借形六条全采——①TRAE 命令三态+白名单+高风险弹窗、②Qoder `evaluated_permission` 事件（授权决定持久化先于 effect 的同行实现）→ **bash 受控 ADR 素材袋**（②兼入 TOOL-READ-1 票面参照）；③WorkBuddy 先批后执行 vs Full Access 双面 → **effect 授权语义材料**；④Qoder 回收站/tool 默认展开/Task Monitor/定时 missed 显式 → 分三处：回收站佐证 ARCHIVE-MANAGE-1 既采防呆、tool 展开形态入 TOOL-READ-1 journal 侦察、missed 显式入未来 scheduled ADR 素材；⑤Qoder Dreams COW+无 bash consolidation → **ADR-013 memory 演进正对照**（与 Mimo 静默压缩反例、OWASP 四态同袋）；⑥Expert Kit/指令+RAG 为垂类知识包最近流通物而契约/锚点/事实等级为空白带 → **产品定位佐证**（vision 一行：schema ABI 是行业空位非行业常识）。反面教材五条**显式留档不入票**（各条已点名不变量③④⑥与 Stage3 时序，作反例语料；公开链分享一条另挂后续 ADR 队列第 3 项 shared state/ACL 素材）。中性两条留档。

**时效用法**：有效=可作线索；监控=竞品大版本后复扫；过时=被更新调研或 ADR 吸收声明替代。消费：未消费→部分消费（若干条入 ADR 草稿）→已吸收（就绪图/ADR 留痕）。

## research-2026-07-20-pi-first-source/（PI-FIRST-SOURCE，只读，不进权威链）

`HARNESS-CORE-1` Stage A 立的一手源核实批。因 `pi-harness-comparison.md`（round-3）全文 17 行、未展开工具接口，而就绪图 Round 5 方向②以「四项基础工具采 pi 成熟范式」立论，故回一手源 `~/Projects/pi`（v0.75.4，MIT）核实。

| 文件 | 主题 | 时效三态 | 消费状态 |
|---|---|---|---|
| `pi-tools-first-source.md` | read/edit/write/bash 精确接口、bash 权限模型、toolResult 形态与回灌、agent loop 控制结构 | **部分过时**（write 裁决于 2026-07-28 窄修订） | 已消费（ADR-017/018/022、TOOL-READ-1 票面） |
| `README.md` | 批次入口、核实边界 | 有效 | 已消费（随批） |

**关键结论**：pi 的 bash 范式**就是不做权限模型**（无白名单/黑名单/确认/授权持久化），安全性整体外包给容器；沙箱只是示例扩展非运行时依赖。故「采 pi 范式」与就绪图「沙盒后期」互相排斥。read/edit 的接口与截断纪律可借形，write 的无确认覆盖写与 ADR-004 冲突不采纳。**核实边界**：本机快照无 `.git`，提交日期与 issue/PR 响应时延无法从本地判定。

**2026-07-28 产品窄修订**：历史“不采纳 write”结论对用户原件、工作稿、产出和 Node 直写仍
成立；仅 app-data、session-scoped agent workspace 例外采用上游覆盖式 `write`，由 Rust 宿主
逐次授权、先落账再执行。该例外不包含 edit、revision、diff、CAS、promotion 或 bash，且归档
说明本身不构成现行契约。

## research-2026-07-15-round-3/（现行最新批，无被推翻项）

**已升格为工单/ADR**：`interaction-visual-regression`→UI-RESIDUE-1；`oss-gui-source-patterns`→UI-RESIDUE/CHAT-SESSION 等工单供料；`geist-design-md`→VOICE-SPEC-1/DESIGN-MD-1；`vault-site-craft`→SITE-CRAFT-1（三修终局）；`grok-build-patterns`→OUTPUT-CONFIRM-UI-1/CHAT-MEMORY-1；`pi-harness-comparison`→WORK-TURN-1（含真机 G/H 根因）；`session-handoff-survey`→PROJECTION-RESUME-1；`chinese-display-font`→SITE-CRAFT-2（已拍板：朱雀仿宋，SIL OFL）。

**方向已定、工单待立（发版后队列）**：`skill-refinery-feasibility`（炼化管线成立，SKILL-REFINERY-1 待立；补记：Build schema 定位内部 dogfood）；`invest-daily-brief-testbed` + `invest-daily-digest-field`（invest 实验田，后段挂 scheduled ADR 门槛）。

**定调型（监控/口径资产，无需进一步升格动作）**：`anysearch-retrieval-tier`（检索类 plugin 三原则：具名/fail-closed/外部检索恒为未锚定线索级）；`generic-connectors-tier`（通用连接器层位）；`frontier-vertical-scan-2026h1`（LAB 供弹格局 + Economic Index 量化 + 判定层监控线；追踪 LAB leaderboard 与可靠性平台期论文）；`harness-landscape-2026h1`（口径弹药五条 + 三档过滤；Manus breakpoint 已入实测表；**监控补记 2026-07-26，2026-07-27 已核实**：Opus 5 发布属实〔2026-07-24，官方公告〕；「系统提示删约 80%」为团队成员炉边口头声明——changelog 零记录，且按模型条件加载非版本删减，引用按口头声明级；详见 research-2026-07-27-parallel-survey）；`kimi-k3-capability-audit`（法律库传言证伪，不立 provider 单）；`newmax-competitive-teardown`（生成式 HTML 瓶颈在裁决；本地优先降格为门槛）。

**论证素材/词表（仍有效，按需取用）**：`provider-switch-mechanisms`（第二 provider 时立 ADR）；`fortune-invest-schema-stress-test`（schema 可表达性双域证据）；`coding-agent-strategies-subtraction`（减法纪律；两候选挂起）；`chat-as-dossier-thesis`（容器同构论，待立项升 ADR）；`emil-skills-polish-input`（polish R2 工具）；`cognitive-debt-mapping`（可执行业务说明书命名已采）；`namethatui-vocabulary`（UI 正名词典）；`trae-work-landscape`（技能 vs 场景包分野）；`upstream-positioning`（内部定位，不入公开叙事）。

**消费 pass 补记（2026-07-26 架构逐条，余量清零；裁决原件 `arch-rulings-2026-07-26.md`）**：oss-gui #4（cmdk ResizeObserver→CSS 变量高度动画）入 `UI-TOAST-1`／`WORK-PLAN-PANEL-1` 素材；#3（面板显隐双模式＋onShow/onHide 生命周期）挂 `UI-RESIDUE-1` 批二；#8（分隔条命令式直写 DOM）显式不采纳（重启判据＝分栏拖拽出现可测卡顿）；emil polish 规则包挂 polish R2 既有通道不另立票；namethatui 词典并入 voice 词表扩展便利单；SkillsBench 归因协议显式后置（eval 线立项素材）；OWASP Memory Guard 四态显式后置（就绪图「后续 ADR 队列」memory 演进议题池）。

## research-2026-07-19-agent-pedagogy/（AGENT-PEDAGOGY-SURVEY，只读，不进权威链）

两教材仓摸底：microsoft/ai-agents-for-beginners（官方入门课，多为通识）+ bojieli/ai-agent-book（工程细节密度高）。

| 文件 | 时效三态 | 消费状态 | 消费 pass 记录（2026-07-19 架构逐条，零悬置） |
|---|---|---|---|
| `survey.md` | 有效 | **已消费** | 可借形六条全采：bojieli 三簇——①proposer-reviewer+Sidecar 执行安全、②幂等/先检后确认 → **bash 受控 ADR 素材袋**（与 TRAE 三态/Qoder 授权事件同袋）；③结构化输出实践 → **统一填格协议 ADR**；④toolResult 工程细节 → **TOOL-READ-1**；⑤自底向上因子发现+聚类的司法案例分析管线 → **法律垂类评测集**（自研加固点，最高价值一条）；⑥（bash 簇计三）。反面三条留档：MS L08 与 bojieli ch10 多 agent 编排（ADR-011 拒项佐证）、双方 memory 分类学（ADR-013 刻意窄设计的对照）。中性四条留档。**警示一条独立记**：MS `18-securing-ai-agents` 含疑似注入/营销内容（伪引用+三方包推装 nobulex/protect-mcp 等），已隔离不采不装——公开教材仓属不可信输入面，引用前逐条核真，判例「一手来源」适用于仓外一切材料 |
| `README.md` | 有效 | 已消费（随批） | — |

## OPENWORKER-SURVEY-1（只读，不进权威链，报告存于仓外）

调研对象 andrewyng/openworker（MIT，Tauri 2 + React 18 壳 / Python FastAPI 本地服务 / aisuite 模型层）。核心问题：其实现方式与 `schema-engineering.md` 是否相似。结论——相似仅在最浅一层，双方都用 JSON Schema 约束模型工具调用；`schema-engineering.md` 真正花复杂度预算的层（双后端编译、descriptor 闭合、字段职权三分、来源锚点、包化 ABI）在 OpenWorker 逐条缺席或退化为中央硬编码 / 自由文本 / 人工约定同步。报告全文与 file:line 证据见 `~/Projects/openworker-survey/survey/openworker-{structure,vs-schema-engineering}.md`。

| 位置 | 主题 | 时效三态 | 消费状态 | 消费去向（吸收前无约束力） |
|---|---|---|---|---|
| `~/Projects/openworker-survey/survey/openworker-structure.md` | 目录/依赖/四机制（风险分级审批引擎、工具连接器声明、交付物产出链、unattended 收件箱）/测试实态，全部带 file:line | **有效**（2026-07-24 一手，锚定 commit `4766e59c`） | **已消费**（消费 pass 2026-07-24，逐条裁定见下） | 见消费 pass 记录 |
| `~/Projects/openworker-survey/survey/openworker-vs-schema-engineering.md` | 对 `docs/architecture/schema-engineering.md` 八问逐条对照 | 有效（同上） | 已消费（随批，见下） | 见消费 pass 记录 |

**消费 pass 记录（2026-07-24 架构逐条裁定，零悬置）**：

- **桶一（已验证，佐证既有裁定，不新增动作）**：OpenWorker 只有模型后端，人类后端是硬编码 React 组件按工具名分支、与 schema 无编译关系（`ApprovalCard.tsx` 对 `replace_in_file`/`apply_patch` 只读 `args.path`、不呈现 diff 载荷）。此为「干线运力型通用 agent 不自发长出最后一公里」的外部实证，佐证 `schema-engineering.md` 一之二命题——双后端编译是护城河所在。另佐证 ADR-017：其 path-scope 是纯 Python `resolve()`+`relative_to`、与 agent 进程同权限、非 OS 沙箱，`run_shell` 按设计不限定路径，安全全押权限门——即「取形弃容器 = 承接其明确拒绝的风险」的实例。对外叙事可引此对照，措辞落「结构性差异」，过 maturity-claim 门。
- **桶二（可借形，入素材袋，当期零实现）**：排程自动化的 `_scheduled_approver` 旁路（`manager.py:2320-2350`）——cron 触发的 run 对四个本地写盘工具（`write_file`/`replace_in_file`/`apply_patch`/`apply_unified_diff`）无条件 auto-approve，不查 `is_unattended`、无需既往授权、首次运行即成立，且因写盘工具无 `target_arg` 而从不出现在自动化的同意卡片上；README「unattended 只入箱不自行动作」对此写盘路径为假。登记为未来 scheduled/webhook ADR 的负面判例（见 `implementation-readiness.md`「后续 ADR 队列」）。
- **桶三（不采纳，留痕）**：第一方连接器中央硬编码枚举（改一个连接器手改三处中心文件）与第三方 MCP 整体信任远端 schema，两极端均非版本化可移除包，正是 ADR-008 / 唯一 ABI 明令反对的形态；工具层零运行时 schema 校验（声明而不校验）同不采纳。

**同族负面判例续档（2026-07-26，源 `benchmark-openwork-2026-07-26.md`，对象为 `different-ai/openwork` tip `1f41a52`——另一仓，判例同族）**：`_scheduled_approver` 类标识符在该仓不存在，但行为判例换名存续——桌面内嵌 server 硬编码 `approvalMode:"auto"`（`apps/desktop/electron/runtime.mjs:1208`），19 处 host/write API 的 `requireApproval` 事实上无条件放行；真正门控工具调用的是 opencode 侧 permission.ask（once/always/reject，事前、always 持久化为 pattern 许可）。两层分明：工具级审批外包且形态尚可，自建 host API 层仍是 auto 直放。scheduled 线其 roadmap 标注 Building/Next，仓内零实现。负面判例效力不变。**2026-07-27 复核**：`approvalMode:"auto"` 于 dev 分支仍现行、scheduled 仍 Building/Next 零发布、07-19 后无 release（见 research-2026-07-27-parallel-survey）。

**2026-07-28 时效注**：上段 OpenWork 审批坐标本轮未重核，不作当前事实；只保留其锚定旧 tip
的历史判例效力。

**时效**：随对象仓库演进折旧，结论锚定上述 commit，上游日更不追。
