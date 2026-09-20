# RD-005 · Multi-agent 实践选型与执行分工

## 2026-09-20 · Current execution routing

The user prefers DeepSeek for its observed capability and speed while retaining Luna for exploration. This is an operational preference, not a repository benchmark result. Astra retains architecture, difficult cross-layer decisions and integration; Luna retains bounded exploration and non-author verification. Clearly scoped implementation with established contracts, precedents and executable checks may be assigned to DeepSeek (the configured `deepseek_worker` when available). Escalate ambiguity in architecture, permissions, recovery or acceptance to the existing owner instead of expanding a worker's scope. Computer-use execution remains on an OpenAI provider; a DeepSeek implementation author can hand off that verification to an appropriate OpenAI agent.

This updates future assignment choices without transferring active Claude/Sonnet work, granting a new provider budget, or changing runtime/model configuration. Each worker receives explicit file ownership, inputs, exit evidence and existing authority limits; authors do not independently accept their own changes. The original serial construction → fresh-node verification → merge → preserved cleanup → first core slice order remains in force. Earlier dated routing below is historical where it differs from this entry.

2026-09-20 · [Hermes/Praxis consultation receipt](architecture-node-2026-09-13/evidence/hermes-praxis-20260920/README.md): the user authorized one bounded CW work order through the installed `praxis` profile. The CLI returned a native session/result and a grounded advisory `not_ready` decision in 32.587 seconds, with no model tool events. Astra adopts the useful handoff/communication analysis with recorded corrections for stale inventory, output length and an infeasible next-test specification. This is a direct CLI consultation, not a production CW child/runtime adapter, Kit admission, or permission-enforcement acceptance; Claude's serial writer and merge/cleanup sequence remain unchanged.

2026-09-15增量：[多Agent协作瓶颈裁决](spark-explore-2026-09-13/coordination-20260915.md)消费8轮，采用少角色/有界fork/精确结果reduce，Spark产品位与Explorer角色解耦；Swarm继续后置。评测接MA-06/ME-09，Main整合不取代服务owner或独立/正式接受；未改single-active-Run或权限。

2026-09-10；状态：研究已消费、架构方向与候选 PR 已裁定，产品实现未由本次登记接受。Astra 负责架构、取舍、集成及 PR 裁决；Luna 负责 fast explore、边界明确且有成熟参考的实现；瓶颈在模型能力的实现仍由 Astra 撰写。作者不能独立接受自己的代码。

## 问题与输入

如何复用成熟 subagent / explorer / team / remote agent 实践，而不增加第二份工作真源或重写现有 Pi 生命周期？模块为 Runtime/Harness、Context、Attention 与其投影；继承 RD-001/002/003 的 owner 边界，Paper 采用仍由根 PAPER.md 固定。

完整消费《多智能体实践选型》三个 turn，包括初始选型、PicoAgents、SoL-Pi。原文、逐轮处置、外部来源等级和候选 PR 见[消费包](multi-agent-selection-2026-09-10/README.md)。源会话的建议与研究自述不构成用户指令或本地实现证据。

## Astra 裁决

1. 稳定层保持现有 service/runtime、Core、event、artifact/evidence、disclosure 与 verification owner；调度策略位于其上。拒绝新增笼统 multi-agent framework、永久 Orchestrator 总账或 shared transcript 状态库。
2. Explorer 是只读、fresh + scoped refs 的受限 profile；worker、peer、remote 是不同拓扑。consult 返回建议且 main 保持执行所有权；delegate 有界执行；handoff 必须独立所有权协议，今日未交付。
3. control、events、context、results 四面分开。AgentPath 可作逻辑寻址/展示引用，不能替代 Session/Run ID、权限或正式 owner。事件 reducer 不使 Runtime 事件升级为 Core 接受；流完成仅表示执行终态。
4. 生产 child 沿 MA2-D15：受控第二 Session/Run，复用现有并发。关闭 vendor lane / AgentHarness 迁移路线；未接通前 capability 继续 false。不因 donor 存在 API 就宣称 CW 支持。
5. 子结果保留 source ref、locator、hash、归因、unknowns；语义压缩须由确定性绑定校验，失败保留可召回原文。引用相符不证明结论正确，verifier receipt 不授予正式接受权。
6. UI 沿现有 Attention/coordination 面渐进披露 activity → tree/list → inspect；原始事件不直连产品语义。仅有 owner 能力才呈现控制。Attention 汇总须复用原有授权/去重机制。
7. A2A 外侧、MCP 工具侧；AG-UI 是事件语法 donor，A2UI 与常驻 team 后置。默认串行；可独立取证才有界并行，不按任务长度或空闲额度自动 fan-out。
8. SoL-Pi 升为机制与评测优先参考，PicoAgents 为模式教学/负例参考；均不采为运行时依赖。ObservationPack、compaction 与 disposable loop 按现有 ME/LG/AM 责任切分。

## 验证方案与停止条件

固定 CW SHA、donor SHA/path、工具/模型配置、独立 synthetic data，先盘点生产调用方。Explorer 首片检查权限求交/撤权、超范围读取、取消/超时、重复与迟到结果、重启后 unknown 与不可重放效果；不通过即保持能力关闭。Reducer 检查错 hash、伪引用、来源撤回/旧版、冲突/空结果与原文回退。UI 检查断流、旧快照、无权限、不支持与 input-required 不误呈现成功。

机制评测复用 ME-09 / SE continuity：先锁 capability floor、paired baseline 与独立 holdout，再比较全生命周期成本、父 agent 实际复用、延迟与质量。作者验证和非作者判别分开；holdout 不回流调参。没有生产消费者、不能确定性约束、质量退化或总成本无收益则停止/删除候选层。

本次只运行来源完整性、链接与 diff 检查；未运行产品或模型试验，不追加产品 PASS。后续 PR 的开工条件、owner、反例及退回位置见[PR 裁决](multi-agent-selection-2026-09-10/pr-plan.md)。


2026-09-11补充输入：[WCI-02–04](work-capability-input-2026-09-11/README.md)接本路线；Explore/有界Worker/可选Code capability与same-worker/child/hybrid为合同及对照候选，权限不由角色名授予，未新增自主MAS或实施派工。

2026-09-13补充：[Court定位参考实践](court-position-2026-09-13/README.md)将AO durable work提案、Kandev执行接缝和Warden Review证据列为机制参考；durable assignment/依赖/接管反例沿本路线冻结，不将Session metadata或第三方work graph升级成新的正式账本，未选新Runtime依赖。

## 2026-09-19 · Orchestra direction disposition

[The Local Agent Orchestra ruling](architecture-node-2026-09-13/orchestra-direction-20260919.md) keeps the two child ownership paths explicit: a CW-controlled child is a bounded second Session/Run with shared admission, permissions, receipts, result references, and unknown semantics; a runtime-native child remains runtime-owned and is only projected where facts are exposed. No shadow scheduler, shared transcript, or double cancellation authority is added. The current conformance child entry, mailbox coordination, and serial Spark dispatch remain their existing bounded capabilities; native trees do not make CW support true by donor presence alone.

The direction also separates Role, Kit, Agent Instance, ExpertDefinition/Instance, Runtime, Provider, Model, and Environment. A Kit is a versioned context/work/verification composition and does not grant authority or credentials. One Runtime family/version reuses one Adapter while instances keep independent session, config, permission, budget, and Kit bindings. Heterogeneous child work remains on this RD's existing MA slices and stops when there is no bounded consumer or evidence benefit.

## 2026-09-20 · Local-agent delegation seam

The [local-runtime ruling](architecture-node-2026-09-13/local-agent-runtimes-20260920.md) adopts a future typed delegation tool backed by existing Host admission, attempt identity and result consumption. A native parent may select an approved agent binding and scoped packet; it may not choose arbitrary launch commands or confer grants. Keep native-owned children separate from CW-owned attempts. Pi subprocess examples and DeepSeek Harness provider/capability patterns are reference inputs; their source availability does not turn CW's conformance entry into a production scheduler. First validate deterministic transport and failure fixtures, then separately authorized native trials; preserve unknown outcomes and never kill a shared upstream daemon as a substitute for task cancellation. Implementation remains after the original dogfood/runtime owners and the user-authorized merge/cleanup sequence.

The user further authorizes Pi as a Codex subordinate-worker candidate. The [two-path ruling](architecture-node-2026-09-13/local-agent-runtimes-20260920.md#codex-parent-with-local-pi-workers) distinguishes direct Codex process-tool delegation (parent-owned work order and acceptance) from later CW-managed children (Host-owned attempt/grants/receipts). Native CLI output is not a native Codex subagent record or a CW receipt. Installed interface/version, isolated scope and explicit inference budget remain concrete execution facts; no new invocation or product implementation is claimed here.

## 2026-09-20 · Multica lifecycle reference

The [Multica ruling](architecture-node-2026-09-13/multica-consumption-20260920.md) consumes claim/wakeup/recovery and work-versus-run distinctions as inputs to the existing child contract. CW retains exact attempt/native identity, source/grant bindings and unknown-effect handling; heartbeat loss and retry eligibility do not prove that a previous effectful process stopped. Multica Issue transitions do not become CW formal work acceptance. Its broad Squad/Autopilot and daemon-fleet topology are deferred; the next child sample remains bounded and follows the authorized integration sequence.
