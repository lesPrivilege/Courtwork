# Schema Engineering Longlife coverage and roadmap

**日期：** 2026-09-08  
**范围：** 只读核对 Schema Engineering 全文本，整理长期工作（Longlife）roadmap 的场景、交互、语义对象和证伪门。没有引入法律产品研究，也没有修改仓库。

## 1. “SE 宣言”的实际文本边界

仓库没有另一个名为“Manifesto/宣言”的文件。实际的稳定宣言式文本是 `papers/src/canonical.md`《Schema Engineering：让工作存在于模型之外》：其标题与摘要在当前候选 9.6 的 lines 9-69，核心定义在 lines 71-238。它明确说自己不是某一种垂直 Agent 产品的宣言，而是面向有后果工作的编纂与承诺治理（lines 19-21）。

文本责任是三层：Canonical 保留稳定 Kernel 与证伪边界，Practice 保留当前可执行快照，Practice Index 保存来源、观察、检验、裁决和版本记录（`README.md` lines 7-21；`CONTRIBUTING.md` lines 1-9, 11-55）。因此“全场景”是由稳定边界覆盖的场景族，不是要求一次实现全部产品功能。

版本边界必须显式保留：CourtWork 当前固定采用 SE 9.3、commit `f8ecb091895559389bb4e75f3c6f28052b71c5a3`（CourtWork Fresh `PAPER.md` lines 5-13）。当前工作树是未提交的 9.6 候选；其三份正文当前字节 SHA-256 为：

```text
9771dfce3863933db819029e8679b36bfd0933ac2028bab5b6bb2e1f73e4dc59  papers/src/canonical.md
cb5b106899d23429ff93e24a0470c93f8a22abb34c62c760a15426f61a39fc9d  papers/src/practice.md
5fad1ebb4ff89e2fbe3091c9c9aeaf26c0e16a5517899b59d3787468134c7aef  papers/src/practice-index.md
```

本报告中的“当前候选”坐标指 9.6 工作树；固定 9.3 的对应坐标和差异见第 8 节。

## 2. 全场景 taxonomy：先选治理强度，再选实现形态

### 2.1 三个主轴与两个边界轴

| 轴 | 场景值 | 最小架构含义 | 源坐标（9.6 候选） |
|---|---|---|---|
| **Commitment** | 无正式后果；一次发送/发布/合并/批准/不可逆行动；持续改变共享状态 | 无正式后果通常只需普通 Runtime；一次高后果行动至少需要 Candidate → Authority/Review → Committed Change；持续工作再引入 Matter 与 continuity | Canonical §3 lines 240-270；§12.1 lines 1198-1220 |
| **Continuity** | 单次 Run；跨 Run；跨人员/时间/模型/宿主 | 只跨 Run 时需 State/Artifact/Evidence/Recovery；完整长期工作需 Matter、开放义务、版本和 Context Projection | §4 lines 272-392；§5 lines 394-526；§12.1 lines 1205-1218 |
| **Judgment density** | 低；高 | 低判断工作可用 automation 或传统 workflow；高判断工作需要 Evidence、Review、Escalation 与专业接受标准 | §12.1 lines 1222-1229 |
| **Consequentiality** | 低；高 | 与 Continuity 正交；低连续性仍可能需要权限、提交和审阅边界 | §12.1 lines 1202-1205, 1229 |
| **Responsibility topology** | 单一用户；人 + Agent；多 Lane/Operator；组织与下游系统 | Operator 承担运行义务，Reviewer/Accountable Principal 承担裁决和后果；并行不自动等于多 Agent 或多责任主体 | §4.3-4.5 lines 312-334；§12.2 lines 1277-1294 |

判断密度 × 连续性是场景选择矩阵，而不是产品分类：低/低通常不需要额外 SE；低/高重点是状态流转；高/低重点是一次性 copilot 判断；高/高最可能产生完整 SE 增量。Consequentiality 再单独决定是否启用 Commitment Kernel（§12.1 lines 1222-1229）。

### 2.2 工作场景族

| 场景族 | 典型工作 | Longlife 需要保留的最小内容 | 不应自动增加的内容 |
|---|---|---|---|
| **普通交互** | 翻译、改写、摘要、开放 brainstorming、角色陪伴、普通聊天 | 只保存普通 Runtime 资源或用户选择；若无正式后果、后续义务和责任连续性，保持轻量 | Matter、完整 Evidence、Review Ledger、Expert activation |
| **一次性高后果行动** | 发送、发布、批准、合并、对外传输、不可逆操作 | Target、Candidate、Authority、前置条件、Review（如适用）、Committed effect、可核对结果 | 为一次动作建完整长期 Matter；模型自述完成 |
| **低判断、高连续性** | 传统 workflow、队列、周期处理、长期运营 | 状态流转、期限、owner、依赖、版本、恢复 | 不因长期存在就引入多 Agent 或复杂专家层 |
| **高判断、低连续性** | 专业 copilot、单次研究或建议、强模型辅助 | 来源、适用范围、建议与责任边界；有后果时启用提交门 | 把一次高质量答案当作长期工作能力或 Matter 完成 |
| **高判断、高连续性** | 案件、交易、审计、研究、客户项目、投研/咨询、医疗/合规/财务、长期工程 | 完整 Matter/Assignment/State/Evidence/Artifact/Review/Authority/Completion/Context/Recovery | 把专业判断全部形式化；用 Runtime 成功替代工作接受 |
| **可版本化成果工作** | 文档、表格、redline、finding、decision、plan、代码或结构化 issue set | 不可变 Artifact version、Candidate delta、provenance、Review、active pointer、下游用途 | 只保留最终文件而丢 Evidence、Decision、未决义务 |
| **协作与多责任主体** | 多人、多 Agent、多 Lane、分支方案、跨团队评审 | owner、base version、冲突、分支/Artifact 汇合、Reviewer 与 Accountable Principal | 以消息数量、角色名称或共识人数推断责任和独立证据 |
| **跨系统或可替换宿主** | sidecar、embedded module、remote service、provider-managed 或 thin Runtime | Host Adapter、能力协商、canonical owner、状态迁移、版本/回滚、效果核对 | 让宿主内部命名污染 Work Contract；复制第二份权威状态 |
| **组织级持续演进** | 机构配置、Expert 发布、规则改进、长期监测、下游采用 | owner、scope、freshness、Evaluator、held-out E2E、reversal、rights、deprecation、rollback、采购/采用结果 | 自动从成功 trace 晋升规则或宣称训练飞轮必然成立 |

领域列表不是外延穷尽。Canonical 明确列出法律之外的财务、医疗、咨询、研究、工程、合规、审计和客户管理（lines 67-69）；软件还要区分代码执行层的编译/测试与上层产品意图、架构、迁移、兼容、安全、部署和发布责任（§12.1 lines 1231-1249）。

## 3. 全交互方式：八条可组合的交互轨

| 交互轨 | 主要对象/动作 | 默认用户体验 | 边界 |
|---|---|---|---|
| **Work object** | Matter、Assignment、Artifact、open obligation、outcome | 用户返回工作对象和当前状态，不寻找 Session 或重放 Chat | Conversation 是交互表面，不是工作本体；Topic memory 也不等于 Matter（§3 lines 244-270） |
| **Model ↔ Context** | Stable Contract + State + selected Resources/History → Context Projection | 模型获得当前任务的最小充分工作集 | Store、Retrieve、Compile 不改变正式效力；Context 不应把未知、冲突和旧版本抹平（§5 lines 394-526） |
| **Proposal ↔ Commitment** | Model/Human Proposal → Candidate State/Artifact → Schema/Evidence/Authority/Completion/Review → Committed Event | 用户看到 Current → Proposed → Reviewed → Committed 的差异和后果 | 未提交输出不能改变正式状态；按钮、评论和勾选只有经 typed Decision 与提交路径才生效（§2 lines 104-121；§6 lines 534-625；Practice §5.3-5.4 lines 393-438） |
| **Human Work Surface** | inspect、compare、trace、revise、decide、accept/reject/request evidence/escalate/approve/publish/withdraw | 默认呈现工作对象、证据、差异、未决问题、Authority 和可逆性；技术细节按需展开 | 不把 tool-call confirmation 或 Agent avatar 当作 Review；Review 必须支持独立判断（Practice §5.1-5.3 lines 361-424；Canonical §6.6 lines 609-611） |
| **Capability ↔ external effect** | local tool、MCP/private/SaaS capability、API、structured browser、Computer Use、remote task | Runtime 按 role、Matter、stage、purpose 和 policy 协商可用能力，执行后核对效果 | 工具 JSON schema、读取权或调用成功不自动授予业务 Authority、外传权或不可逆权限（Canonical §6.1, §6.4 lines 534-540, 588-603；Practice §3.1 lines 196-204） |
| **State ↔ History ↔ Recovery** | Event/State/Artifact/Evidence/Raw History；Session/Run 替换、重启、取消、迟到结果 | 新 executor 从权威状态、有效版本、Evidence、open obligations 和 checkpoint 续行 | Transcript、summary、旧 sandbox 和隐含模型记忆不能成为唯一恢复源；Context mutation 不得删除正式记录（§4.6-4.10、§5 lines 336-407；Practice §4.1-4.4 lines 280-357） |
| **Agent/Lane collaboration** | Lane、Operator、branch、bounded Candidate、comparison/merge/discard/reconciliation、必要时消息 | 状态和 Artifact 是默认协作面；消息只在其自身携带必要信息时增加 | Lane 表示并行，不改变 Operator/Accountability；多实例共识不等于独立验证（§4.3-4.5 lines 312-334；Practice §2.7 lines 129-144） |
| **Extension lifecycle** | preset → Expert routing → bounded primitive composition；mount/unmount、dependency、attach、update、migration、rollback、fallback | 普通任务消费已验证的 activation profile；未覆盖任务进入 Candidate-only frontier path | 模型不能自由组合越权能力；卸载代码不能擦除已提交工作；组合/可替换只证明部署性，不证明专业质量（§8.1-8.3 lines 699-812；§13.2-13.3 lines 1332-1374） |
| **Organization/downstream/evolution** | System of Record、person/organization、accepted Artifact、revision、failure attribution、Eval、Environment、revalidation | 成果进入下游后留下接受、修改、撤回、reversal 和责任记录；反馈形成候选修订 | 评分、训练、生产 trace 或市场采用不能互相借用正确性；任何规则提升都需 Authority 与独立验证（§9-§11 lines 967-1190；§12.2 lines 1275-1294） |

Human Work Surface 的 renderer grammar 包括 List/Table、Tree/Outline、Anchored Document、Graph、Timeline、State Graph、Matrix、Diff/Lineage、Queue/Coverage（Practice §5.2 lines 377-391）。这些是交互表示，不是新增 ontology。

## 4. 语义清单：目标、角色、状态、Contract、Context、Review、自治

### 4.1 目标与责任

SE 的目标可压缩为三条嵌套工作链：

```text
Expert demonstration → Human Harness extraction → Work Contract
→ Agent Extension → E2E acceptance

Stable Contract / Current State / Resources → Context Projection
→ Proposal → Candidate → validation/evidence/authority/review
→ Committed Change → updated State / active Artifact

Production use / review / revision / failure → attribution
→ Eval / Environment / regression → Contract or runtime refinement
```

源坐标：Canonical §摘要 lines 31-55；固定 9.3 仍为 lines 31-55。对应角色边界如下：

| 角色 | 责任 | 不能取得的替代身份 |
|---|---|---|
| Model | 产生候选 reasoning、action、finding、proposal | 不能定义事实来源、降低 Completion、直接提交或承担最终问责 |
| Deterministic Runtime | 执行不变量、schema/evidence/authority checks、状态投影、commit protocol、恢复 | 不能代替不可约的专业判断 |
| Operator | 对某范围承担执行、恢复、交付和升级义务 | 不等于最终 Accountability |
| Lane | 同一 Operator 内的独立工作线/执行 cursor，可并行 | 不自动成为新 Operator 或 Accountable Principal |
| Reviewer | 在明确 decision unit、Evidence、Authority 下 accept/reject/revise/escalate | 点击批准不等于独立判断 |
| Accountable Principal | 接受专业、组织或法律后果并作最终问责决定 | 不能由 Agent、自评或多个实例投票替代 |
| Work Extension / Compiled Expert | 提供任务族语义、状态、验证、Review、适用范围和 activation profile | 不是人格化 Agent、单一 Tool 或第二套 Runtime |
| Canonical owner / System of Record | 持有正式状态、active Artifact 和提交事实 | 不能与 sidecar 形成两个互相冲突的权威源 |
| Evaluator | 测量预先声明的 Work Contract 语义、错误类型和趋势 | 评分不授予正式效力或 Authority |

源坐标：Canonical §4.3-4.5 lines 312-334、§6.4-6.6 lines 588-611、§8 lines 677-812；Practice §3.2 lines 206-240。

### 4.2 状态与长期资产

| 层 | 必要对象/状态 | 长期边界 |
|---|---|---|
| 工作对象 | Matter、Assignment、resources、participants、permissions、outcome | Matter 跨模型、Conversation、人员和时间存在；Portfolio/Queue/Program/Practice 在其上组织多个 Matter |
| 执行 | Operator、Lane、Run、session、tools、sandbox、trace | Run 可停止、失败、替换和恢复；其 disposable state 不是唯一恢复源 |
| 正式变化 | Candidate Event/Artifact → checks → Committed Event → State/active Artifact | Candidate 可保存、检索和审阅；只有提交后取得正式效力 |
| 事实认识 | proposed、supported、contradicted、uncertain、working assumption、resolved | Epistemic status 不等于组织批准 |
| 制度效力 | draft、under review、approved、published、superseded、withdrawn | Approved/published 不等于客观事实已证明 |
| 工作生命周期 | not started、in progress、blocked、awaiting review、completed、superseded、cancelled | 完成由 Completion Contract 和 Review/Authority 路由决定，不由 Agent 自述 |
| 来源与成果 | Source/version/location/relation、Evidence Graph、Artifact version/provenance、active pointer | 保存来源、适用范围、版本、冲突、撤销和下游用途；不要以摘要替代原始证据 |
| Expert 生命周期 | Candidate Expert Profile → held-out E2E/risk Review → Committed Expert Version → monitoring → revalidate/narrow/rollback/deprecate | 依赖、政策、模型、来源、分布或 Reviewer outcome 变化可触发折旧 |

源坐标：Canonical §4 lines 272-392、§5 lines 394-526、§8.2 lines 738-797；Practice §4.1-4.3 lines 280-347。

### 4.3 Contract taxonomy

Work Contract 不是一份更大的 system prompt。它同时是执行规格、结果/提交校验器、状态/Context 编纂器和 Post-agentic Refinement 参照；可投影为 state/artifact schema、Evidence、Completion、Authority、Review/Escalation、Context/resource、persistence/expiry/supersession、validators/evaluators、E2E/Work Eval 与 compatibility metadata（Canonical §2.1 lines 123-149）。其配套 Contract 为：

- **Evidence Contract：** claim、source、version、location、supports/contradicts/qualifies/derives-from、actor、method、time、status；可定位不等于语义支持（§6.2 lines 542-564）。
- **Completion Contract：** required Artifact、coverage、unresolved questions、evidence gaps、mandatory checks、dependency、pending input、approval、exceptions（§6.3 lines 566-586）。
- **Authority Contract：** read、propose、modify draft、modify approved state、approve、publish、external transmit、irreversible action、delegate、promote policy 分开；Authority 不等于 Accountability（§6.4 lines 588-603）。
- **Artifact Contract：** type、structure、version、status、引用、审批条件和下游可用性；提交必须指向具体 version（§6.5 lines 605-607）。
- **Review Contract：** 谁在什么状态可以 accept/reject/revise/request/escalate/approve/promote；Review packet 要让具备 Authority 的人形成独立判断（§6.6 lines 609-611）。
- **Escalation Contract：** issue + evidence + alternatives + recommendation + reason；不确定性进入相应 Authority/Accountability（§6.7 lines 613-625）。
- **Search/Context/Runtime Contract：** Search Contract 约束 solution space、来源顺序、冲突和何时升级；Host Adapter 声明能力、历史、恢复、授权拦截和效果核对；Work Extension 依赖版本和 State compatibility（Practice §3.1 lines 196-204、§6.4 lines 479-487；Canonical §8.1 lines 699-719）。
- **Eval/Release Contract：** Work benchmark 从 Work Contract 派生；E2E 同时检查执行、状态提交和 accepted work product；Evaluator/rubric/reason/version 具有 owner、version、monitoring、Review、deployment gate 与 rollback（Canonical §8.4-8.5 lines 814-870、§11.2 lines 1105-1113）。

### 4.4 Context、Review 与自治边界

Context 是 `Store → Govern → Retrieve → Compile` 的任务视图，不是持久事实源。它可以按 recipient、purpose、role、stage、permission 和 State version 变化；Context Mutation 是 Run-local action，必须保留 provenance、scope、lifetime、reason 和 recovery path（Canonical §5.4 lines 427-526；Practice §4.3-4.4 lines 326-357）。

Human Work Surface 从同一 Current Semantic State、Sources/Evidence 和 Candidates 生成三类投影：Context Projection、Human Work Surface、Retrieval Index。Review Item 至少包括 Target、Anchors、Current/Candidate delta、Judgment dimensions、Evidence、automated checks、uncertainty/open questions、commit consequence/reversibility、Decision、Authority、State consequence（Practice §5.1-5.3 lines 361-424）。

自治采用逐层收敛：

1. **Preset binding：** Matter type、institution policy、role、stage 已决定能力；
2. **Expert routing：** 只在批准且兼容的 Expert 中提出选择，Runtime 检查适用范围、版本和权限；
3. **Primitive composition：** 只用于未覆盖、跨域、低置信度或 frontier 情况，默认 least privilege、Candidate-only，不能直接 approve/publish/transmit/irreversible action。

Compiled Expert 必须能够 abstain、fail closed 或升级到 Human/frontier path；更强模型只能减少 imperative orchestration，不能扩大副作用或提交权限（Canonical §8.2 lines 758-797；Practice §3.4-3.5 lines 242-276）。

## 5. Longlife roadmap：六个可独立启用的阶段

这不是“把所有功能一起建完”的清单。每个新场景先通过三轴分类，只启用它需要的最小 profile；上层阶段必须复用下层的唯一状态和提交边界。

| 阶段 | 适用问题 | 主要产物 | 退出门 |
|---|---|---|---|
| **L0 · 场景分流与责任声明** | 判断是否有后果、是否跨时间、判断密度和责任结构 | 四问：What persists / expires / gates action / deserves attention next；canonical owner、Accountable Principal、最小 Artifact 和 Reviewer | 低/低场景保持轻量；高后果场景至少定义 Candidate/Committed；没有真实义务不建 Matter |
| **L1 · Commitment Kernel** | 一次发送、发布、批准、合并、对外传输或不可逆行动 | typed Candidate、Evidence/Authority/Review checks、Committed Event、版本指针、效果核对 | 越权、陈旧 Candidate、伪造身份、重复副作用、未知结果被误报为成功时，保持 proposal-only |
| **L2 · Continuity Kernel** | 跨 Run、Session、模型、人员或时间的工作 | Matter/Assignment、Current Semantic State、Raw History/Evidence、Artifact versions、open obligations、Context Projection、Recovery | Session/model/executor/host replacement 后可从权威状态恢复；旧状态、冲突和证据不被静默重引入 |
| **L3 · Human Work Surface** | 需要专业审阅、修订、接受、升级或有限 attention 的工作 | decision-unit Review packet、Anchored evidence、diff/lineage、uncertainty、reversibility、progressive disclosure、renderer fixtures | 独立 Reviewer 能发现关键错误、请求证据、作出有后果的 Decision；accepted Artifact 可进入下游且无需实质修改 |
| **L4 · Extension / Activation** | 同一任务族需要可复用、可替换、可卸载的能力包 | Work Extension、Host Adapter、capability registry、Preset/Expert/Primitive activation、dependency/version/migration/rollback、fallback renderer | 无 Core Patch；等价宿主/provider/renderer 不改工作语义；卸载 executable contribution 不丢 State、Evidence、Decision 或 Artifact |
| **L5 · Production Evolution** | 规则、模型、来源、组织偏好和任务分布随时间变化 | failure attribution、Evaluator lifecycle、holdout Work Eval、feedback promotion、freshness、revalidation、suspend/deprecate/rollback、rights | 失败可定位而不是归咎模型；候选修订不能静默发布；accepted outcome、reversal、成本和风险分层支持版本决策 |

只有 L0-L5 在一个责任结构中通过，才考虑第二领域/第二宿主/第二 Provider、并行 scheduler、跨 Expert composition 或 selective model post-training。它们是扩展验证，不是 L0 的前置建设。

### 5.1 参考架构形态

长期 roadmap 应保持一套逻辑语义链，物理上可以先落在同一应用、sidecar 或既有 system of record；各层的 owner 和提交边界不能因此消失：

```text
Person / Organization / Downstream Work
                 ↕ accepted artifact / accountable decision
Human Work Surface
                 ↕ inspect / compare / revise / decide
Commitment Boundary
                 ↕ typed Candidate → validation → Committed Event
Work Extension / Compiled Expert + Context Compiler
                 ↕ Work Contract / capability / projection
Matter State / System of Record
                 ↕ state / artifact / evidence / history / obligations
Host Adapter + Agentic Runtime / Harness
                 ↕ tool / session / event / permission / recovery
Model + external channels (API / browser / Computer Use / MCP)
```

核心不变量是：正式状态只有一个 canonical owner；模型和人都只能提出 Candidate；Context、Human Surface、Retrieval Index 从同一权威状态和有边界的来源重建；Runtime 可替换，Work Contract、Evidence、Authority、Review 与接受标准不随宿主命名改变（Practice §3.1 lines 175-204；Canonical §13.2-13.3 lines 1332-1374）。

## 6. NDA 路线容易漏掉的覆盖面

当前 NDA 是一个合适的高判断、高连续性、proposal-only 参考场景，但不能代表完整 Longlife roadmap。应显式保留以下未被它充分覆盖的切片：

1. **普通聊天、Topic memory 和开放探索：** 这些可共享持久 Runtime primitive，却不应被强行建模为 Matter、Evidence 或专业工作（Canonical §3 lines 262-270；§12.1 lines 1220-1229）。
2. **一次性高后果而无长期 Matter：** 发送、发布、合并、批准和不可逆动作只需 Commitment Kernel；不能以 NDA 的完整 continuity 成本作为所有场景默认值（§3 lines 240-279）。
3. **低判断、高连续性：** 队列、周期运行、运营 workflow 重点是状态流转，不自动需要 Expert、multi-agent 或复杂专业 Review（§12.1 lines 1222-1229）。
4. **非法律责任结构：** 财务、医疗、咨询、研究、工程、合规、审计、客户管理，以及软件工程上层的架构/发布/运营判断，需要各自的 Evidence、Completion、Authority、Review 和 acceptance criteria（§摘要 lines 67-69；§12.1 lines 1231-1249；Practice §7.2 lines 527-535）。
5. **多责任主体和协作拓扑：** 多人、多 Lane、分支、冲突、相关错误和消息拓扑需要独立验证；NDA 的单 Generic Agent 顺序路径不能证明 parallel/reconciliation 或独立共识（§4.3-4.5 lines 312-334；Practice §7.3 lines 576-578）。
6. **宿主/部署/通道变化：** sidecar、embedded、remote、provider-managed/thin Runtime，以及 API、browser、Computer Use 和外部 egress 的能力/效果边界需要 adapter 和 canonical-owner 测试（§13.2-13.3 lines 1332-1374；Practice §3.1 lines 175-204）。
7. **完整 Extension 生命周期：** install/enable/attach/update/unload/registration cleanup/schema migration/fallback/rollback；仅 renderer present/absent 或 producer 缺席不能证明 C-06（§8.1 lines 699-719；§14 lines 1376-1421）。
8. **Human attention 与界面等价性：** Review packet、decision unit、证据寻求、progressive disclosure、无 trace 审阅能力和不同 renderer 的相同状态后果，不能由“有一个 approval 按钮”代表（Canonical §6.6 lines 609-611；Practice §5.1-5.4 lines 361-438）。
9. **State 不足以成为唯一 sufficient statistic 的工作：** 执行中才发现 Schema、晚到 Observation、需要审计/调试/解释 trajectory 的工作仍需要 Raw History/Evidence；不能把 State-only 当通用答案（Practice §7.3 lines 554-556；Index PI-10 lines 139-149）。
10. **长期组织演进：** Evaluator/rubric/reason drift、source/policy/model freshness、rights、later reversal、真实下游采用、维护成本和 expert-hour；离线分数或一次 demo 不等于组织能力（Canonical §§9-11 lines 967-1190；§12.2 lines 1275-1294）。

## 7. 可证伪门与既有验证队列

这些门是 roadmap 的退出条件，不是一次烟测的总分。Canonical §14 当前候选 lines 1376-1421 已把 Architecture、Continuity/Governance、Product Value 分开；固定 9.3 对应 lines 1389-1434。Practice §7.3 当前候选 lines 537-578 也明确要求三层结果分开报告。

| 门 | 必须观察 | 证伪/收窄后的动作 |
|---|---|---|
| **场景门** | 额外 Schema 的维护和交互成本低于它节省的 Review、恢复、错误和版本协调成本；低/低场景仍保持轻量 | 降为普通 automation/copilot；删除无可测影响的对象（Canonical §2.4 lines 199-227；§12.1 lines 1220-1229） |
| **Commitment 门** | Candidate 不越过 Schema/Evidence/Authority/Review；伪造身份、陈旧候选、非法 evidence、重复重试、未知副作用均不产生错误正式效力 | 保持 proposal-only；修复唯一 commit owner，不用 Prompt 补权限漏洞 |
| **Continuity 门** | 替换 Session、模型、executor、宿主或 extension 后，重建同一 committed version、Evidence、Decision、open obligations 和 active Artifact | 撤回 Matter/State/Hot-plug durability claim，保留可检索 History 或静态 preset |
| **Evidence/Projection 门** | 来源 version/span/relation、冲突、否定、unknown、supersession 和各角色视图一致；Context mutation 可恢复 | 禁止用 schema-valid、可定位引用或短 Context 冒充语义正确/充分 |
| **Scope/effect 门** | capability visibility、Matter isolation、permission revocation、data egress、外部结果核对在执行边界生效；canonical owner 唯一 | 缩窄能力或拒绝执行；不把额外 agent、MCP 或 prompt 作为越权修补 |
| **Review 门** | 有 Authority 的独立 Reviewer 能在有限 attention 下发现关键错误、请求必要证据、作出可追踪 Decision；accepted Artifact 可进入下游且无需实质修改 | 只报告工程可用性；取消 Review bandwidth/律师负担/专业正确性声明 |
| **Extension 门** | 不改 Host core 即可加载/撤销/恢复；等价 adapter/provider/renderer 保持 Work semantics；版本更新有迁移、回滚、fallback | Extension 降为单宿主实现或静态 preset；不宣称热插拔 |
| **自治门** | Preset 优先，批准的 Expert routing 次之，primitive composition 默认 Candidate-only；未覆盖事项 abstain/fail closed/escalate | 退回 Human/frontier path；不让成功 trace 自动晋升 active Expert |
| **Topology 门** | sequential 与 parallel 在相同 Contract、state、reconciliation、Reviewer 下比较；分支/消息的冲突、重复、错误传播和 accepted outcome 可归因 | 不把并行或多实例共识当作增益；保留 sequential execution |
| **Evolution 门** | Failure attribution 可定位到 Contract/Validator/Evaluator/Context/Tool/Harness/Model/Institution；Evaluator 有 version/monitoring/rollback；holdout、reversal、rights 和风险分层保留 | 冻结 candidate revision；降级为 Index 观察，不进入生产规则或训练 |
| **组织价值门** | Review time、accepted-work-product、恢复成本、下游采用、留存/替换和维护成本在声明范围内改善，且高风险指标不恶化 | 保留架构纪律但放弃产品/市场/训练壁垒声明 |

现有 Practice Index 已有可复用验证队列：V-01/V-05/V-07/V-09/V-10/V-16/V-18/V-19/V-20/V-21/V-22（当前候选 `practice-index.md` lines 303-328）。不要把每个 roadmap 阶段复制成新队列；只有引入未被这些条目表示的新边界时才新增条目。Canonical 的 F1-F27（当前候选 lines 1451-1490；固定 9.3 lines 1464-1498）提供相应失败后的收窄方向。

## 8. 固定 9.3 与候选 9.6 的使用差异

### 固定 9.3：CourtWork 当前有效语义

在 SE 仓库中，可用以下命令读取固定字节：

```bash
git show f8ecb091895559389bb4e75f3c6f28052b71c5a3:papers/src/canonical.md
git show f8ecb091895559389bb4e75f3c6f28052b71c5a3:papers/src/practice.md
git show f8ecb091895559389bb4e75f3c6f28052b71c5a3:papers/src/practice-index.md
```

最相关坐标为：

- **Canonical §3-§6：** lines 240-632，Commitment/Continuity、Matter/Assignment/Operator/Lane/Run/Event/Artifact/State/Review，以及 Evidence/Completion/Authority/Artifact/Review/Escalation Contracts。
- **Canonical §8：** lines 684-842，Agent Extension、Work Extension、runtime adapter、Human Work Surface、State compatibility、Compiled Work Expert、三层 activation、E2E 和 accepted work product。
- **Canonical §13：** lines 1345-1387，Runtime/Work Extension/System of Record 分层、canonical owner，以及 hot swap 不得自动迁移正式 State 或跳过 Authority/Review。
- **Canonical §14：** lines 1389-1434，Architecture、Continuity/Governance、Product Value 的边界测试。
- **Canonical §15：** lines 1436-1498，证据解释纪律和 F1-F27 证伪结果。
- **Practice §2-§7：** fixed headings 从 lines 54、176、278、359、440、515 开始，覆盖 runtime seam、Matter/Context、Human Work Surface、Work Extension、理念认证和必要测试。

所以，长期 roadmap 的最小语义在固定 9.3 已存在，不需要等 9.6 才成立。9.3 已允许一次性 Commitment Kernel、完整 Continuity Kernel、三类投影、三层 activation、可卸载/回滚的 Extension 约束和 Product Value/accepted-work-product 证伪。

### 候选 9.6：可用于讨论的未提交增量

当前 9.6 没有为 Longlife 增加一套新的 Kernel ontology。它主要强化或重写：

- Work Contract 对目标状态、不变量、可替换执行的表达（Canonical §2.1 lines 123-149；Practice §2.2 lines 67-81）；
- Context Projection、授权披露、Candidate 可见性与正式效力的区分（Canonical §5.4-5.5 lines 427-526；Practice §2.5 lines 103-109、§4.3 lines 326-347）；
- capability negotiation、宿主实际召回的信息和效果核对（Practice §3.1 lines 196-204）；
- failure containment/trusted recovery、Projection Consistency、Evaluator Lifecycle、State-mediated Coordination 等验证要求（Practice §7.3 lines 546-578）；
- Work benchmark、failure attribution、Evaluator drift、选择性训练和版本折旧的解释边界（Canonical §§8.5, 10-11 lines 831-1190）。

Practice Index 的 9.6 修订记录（lines 349-374）明确这些是候选修订、局部原始来源核验和未运行的 V-19–V-22 实验；它没有把 9.6 变成 CourtWork 的语义基线。Longlife 计划可以按 9.3 的稳定 Kernel 执行设计，再把 9.6 的增量作为待裁决的 Index/Practice 候选，不能把候选行号或未执行测试写成产品事实。

**最终架构原则：** Longlife 不是一个“全功能 Agent”，而是同一套 `Commitment → Continuity → Context → Review → Capability → Evolution` 边界按场景逐层启用。先声明后果和连续性，再选择最小 State、Contract 和交互面；每一层只有通过自己的 accepted-work-product、恢复、权限、成本和反例门，才向下一层扩展。
