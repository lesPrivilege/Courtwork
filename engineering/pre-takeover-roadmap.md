# 夺舍前路线 · PT0–PT9

**2026-09-07 最新施工核对**：后端 Foundation R3 完成三路 Luna 开源溯源；固定 Pi 0.85.1 局部实现与能力边界已核对，发现的扩展重启恢复缺口已修复。完整回归118/118、修复独验2/2；73成员源码与累计补丁已冻结，C3基线副本应用核验通过。活动前端未写入；同一候选真实UI/provider闭环与接管仍未完成。见 [R3裁决及来源论证（历史路径：`mvp/execution/pt2-integration/adjudication-runtime-foundation-r3.md`）](migration/2026-09-08/evidence-index.md)。下方旧快照保留历史。

2026-09-06 冻结。规定 Fresh 壳从当前通用层施工到接管 Courtwork `main` 之间的阶段与门。

编号用 `PT` 前缀，与 [roadmap.md](roadmap.md) 的 R0–R5 区分：后者是 SE 的研究与验证阶梯（工程分解、契约验证、组件验证、单一垂类、通用性、长期维护），本文件是 Fresh 壳的施工阶梯。两套编号不互相映射，引用时须带前缀。

## 两仓职责

| 仓 | 职责 |
|---|---|
| Schema Engineering | doctrine / paper / evidence corpus |
| Fresh Courtwork | executable practice / Work Agent reference implementation |

二者不是 monorepo 上下游，而是理论规范与实践验证的关系。

SE 向下提供 ontology、invariants、governance 原则与可复用概念词汇，不提供须逐行实现的 product specification。Fresh 向上只回流具备泛化性的结论：此前未言明的 invariant、failure attribution、falsification、边界条件、反复出现的 expert 或 runtime 模式。Fresh 的单个实现决策不升级为 SE 理论；Fresh 产出的 evidence、failure attribution 与 practice note 不取得 paper 的权威地位。

## Fresh Courtwork 何时成为独立仓

Fresh implementation 已存在；Fresh Courtwork 作为自足的仓与产品谱系尚不存在。二者不可混谈。

V8 壳是真实实现资产，但仍处在 SE engineering execution workspace 中。它在某个 PT 节点首次满足 shell + runtime + persistence + 一条完整因果链可脱离该 workspace 独立 clone 与运行时，才提升为 Fresh Courtwork repository candidate。成为独立仓本身是一次 maturity transition，不是文件搬家；在此之前不为名称提前建仓或复制一次代码。

完整次序为 execution artifact → self-sufficient Fresh Courtwork tree → candidate lineage → legacy distill → Courtwork main takeover。

## 阶段与门

PT 是一组资格条件，不是时间表。每阶段只由其门决定开合，不附估期；不得维护成「PT2 下周、PT3 下下周」一类排程，否则会随施工估期漂移。


### PT0 · General Shell Closure（当前）

关闭已开出的通用 GUI 基本面，停止继续移动底座。依赖链为 G2 r1 独验 → 冻结已接受的 G2 hash → G1 施工 → G1 独验。

关闭条件：C1–C4 修复在独验下成立；readonly command regression 11/11；connection lost / recovery / pending / Enter path 均有真实断言；尚无安全路径的真实 IME 记 `not_run`，不伪称通过；最终 source archive 与 hash 固定。

意义不是 chat UI 做完，而是取得此后所有 polish、runtime 与 work surface 都能依赖的 stable shell contract。

### PT1 · GUI Composition + Polish Closure

G1 只完成已裁定项：start flow、attachment 与附加 tab chrome、进入 session 的默认布局、coordinator close 与 ownership、[DS-006](design/decisions.md#ds-006--会话主区与独立-tab-工作区) 的 Codex + Chrome tab 式组织。不借机增加 Work Surface 能力。

P1／P2 可继续产出探索证据，最终须 rebind 到已接受的 G2／G1 hash；绑定旧 `6456acd2…` 的样板不作回迁依据。

rebind 是验证设计结论在新 canonical 壳上仍然成立，不是重跑一次 explore。现在不重绑：正确次序为 P1/P2 隔离探索得出 typography／density／icon／button 结论 → G2 r1 接受 → G1 接受 → 样板 rebind → 检查结论是否存活 → 用户视觉裁决。只有 G2／G1 的改动触及被验证的变量本身——composer markup、按钮 geometry、layout ownership——才重新生成相关样板；其余不重跑。探索期间不得回迁。

用户最终只裁四项：T0／T1／T2 中哪些规则留下、是否携带字体资产、icon family 或无图标 baseline、button／focus／density／typography 的最终组合。不必选整套主题。

P3／P5 在 G1 通过后完成：runtime states 视觉体系、success compressed 与 failure salient、connection／pending／cancelled／waiting_user、390／768／1280／1440、reduced-motion、45–90 秒真实演示。

**门**：去掉名字与 logo，Fresh 壳已像一件成熟工具，而非 agent demo。

### PT2 · Fresh Runtime Baseline

从壳进入自足 Work Agent。正式 Runtime 选择在此节点作出，不由 GUI demo 代为决定。目标结构为 shell、runtime adapter、provider、session persistence、tool execution、permissions／confirmation、deterministic state recovery。

原则不变：成熟方案拼装优先，极简 kernel，模型能力能承担的不额外编 harness。本阶段 explore Pi／DSH／OpenCode 的局部机制、provider／session／tool ports、computer use 是否作 generic primitive、sandbox 与受控命令、interruption／resume、context compilation boundary。目标不是发明新的 agent loop。

**门**：clone 后的新环境可启动、创建 matter／session、发出请求、Agent 真正调用工具完成任务、中断恢复、重启后恢复工作状态，且不依赖旧 Courtwork repo。

### PT3 · Matter / Continuity Baseline

PT2 证明 Agent 能工作，PT3 证明它不是另一个 session chatbot。落实 Matter 的 live state、materials、decisions、artifacts、provenance 与 session projections，把 `Store → Govern → Retrieve → Compile` 实现为最小闭环，而非复杂 memory 系统。

至少证明：session 不再是最高组织单位；新 session 可恢复 matter 的 sufficient state；transcript 不需整体重塞；source／material 与 generated conclusion 分离；historical state 可到达但不默认污染当前 context；committed 与 merely proposed 独立。

**门**：跨 session demo——session A 做一半关闭，session B 恢复，Agent 无需完整 transcript 即知当前 matter、待办、依据与未决事项。

### PT4 · One Complete Work Contract Vertical Slice

只选一个纵切，不并行 legal／PM／research。选择标准不是市场规模，而是能否验证 structured input、evidence、proposal、verifier、human review、committed change、continuity 全链。

链路为 Work Contract → context compilation → agent execution → proposal → verification → human review → commit → persistent matter state。第一份 contract 越薄越好，只要能 E2E。真正的 Work Surface 自此引入。

**门**：不是 benchmark 分数，而是外部读者能完整看懂 Agent 做了什么、依据是什么、人裁了什么、最后什么正式进入 matter。

### PT5 · Human Review Surface

对应此前延后的 MVP-09/10。在 PT4 已有真实 proposal 之后设计，不凭空设计专业工作台。

消费三项已成熟原则：review-time compilation（raw execution → bounded representation → evidence binding → decision surface）；三层披露（ledger → bounded preview → canonical evidence）；双轴状态（epistemic state × institutional／commitment state）。此时才 explore diff、citation、source anchor、table、timeline、graph、preview 与逐项 approve／reject／edit，也才有真实需求约束去评估 Pierre、table 或 graph 库。

**门**：人不重读 transcript 即可理解 proposal、检查 evidence、发现 uncertainty、approve／reject／amend，并明白操作后的制度状态。

### PT6 · Product Slice / External Demo

建立面向外部的 Fresh demo，是一条完整因果链而非 feature 巡览：open matter → recover state → ask agent → work happens → bounded progress → proposal appears → inspect evidence → human decision → committed state changes → reopen and continue。控制在 2–4 分钟内可理解。

同时完成 onboarding、empty state、fixture／demo matter、failure branch、README、screenshots／video、release packaging、clone/start instructions。

**门**：陌生人 clone 或打开后，不看 SE paper 也能理解这不是 chat + tools，而是在维护一个持续工作的 matter，并把机器执行编译成人类可以治理的改变。此门通过才具备夺舍资格。

### PT7 · Takeover Readiness Audit

碰旧 Courtwork `main` 前单独开一次只读审计，不夹在任何 feature PR 中。

| 项 | Gate |
|---|---|
| 自足启动 | fresh clone 可运行 |
| Runtime | 真正 E2E，不是 mock |
| Continuity | matter 跨 session 成立 |
| Demo | 至少一个完整 work vertical |
| Review | proposal → commitment 成立 |
| GUI | polish 已通过 |
| Legacy independence | 零运行时依赖 legacy tree |
| Provenance | candidate 当前消费的旧资产均可指 frozen source；不要求历史施工记录仍可直接执行 |
| Acceptance | 独立 reviewer 可复跑 |

随后清账：worktree clean、scratch／tmp 不进入 canonical、archive hash 固定、dependency／license ledger、source archive、docs current state、tests、screenshots、release package。可打 `fresh/courtwork-takeover-candidate-1`。

### PT8 · Legacy Distill

此处才全面打开 frozen Courtwork。PT0–PT7 期间只允许按 `archive/courtwork-pre-takeover:<path>` 定向召回。

`mvp/execution/` 下各批次记录保留当时实际消费的路径，即使其后失效：live index 必须解析到稳定 provenance，historical execution record 保留当时事实，二者分工不混。方式不是「看旧仓有什么可搬」，而是拿 Fresh 已成立的体系去问：旧 Courtwork 还有什么是新系统没有重新发现、却值得保留。只用四种裁定：ADOPT、REIMPLEMENT、REFERENCE、RETIRE。ledger 一行记 frozen source、decision、why、fresh destination，不作百科全书式 review。

尤其值得消费已验证的 UX、fixtures／eval、legal work examples、design ideas、release discipline、edge cases 与 failures，而非旧架构本身。

### PT9 · Courtwork Takeover

保留 Git 历史连续性：`f9ade85` 作 takeover commit 的 parent，一次大 replacement。commit 写明 Fresh Courtwork becomes the canonical implementation of Courtwork；Legacy Courtwork remains frozen evidence and source material。

此后 `main` 为 Fresh，archive 为 legacy，SE 为 theory／canonical doctrine，Fresh Courtwork 为 living reference implementation。

## 当前位置

```text
PT0 General Shell Closure
  ├── G2 r1 → 独立复核（app.mjs 8d68102f…）   ← 当前
  └── G1 待冻结
PT1 GUI Polish
  ├── P0 通过
  ├── P1 进行中
  ├── P2 进行中
  ├── P3 受 G1 门约束
  └── P5 部分受门约束
PT2 Fresh Runtime Baseline（门未过；DEC-009 授权隔离目录受控集成）
  ├── C0 现场接管与组合裁决 → 已交付（2026-09-07）
  ├── C0-E 两路 Sonnet explore → 已回执并消费
  ├── C1 执行骨架接入 → r1 accepted（作者自检层级；独验留 C4）
  ├── C2 生命周期与持久性 → accepted（作者自检层级；冻结候选 f8cf6545…）
  └── 自足节点成立 → 架构 handoff Codex 定稿（handoff-codex.md）；C3 前端 Claude/Opus 待 Codex 冻结；C4 独验 Astra/Luna
```

critical path 只有：G2 accept → G1 → rebind Polish → 视觉裁决 → PT1 关闭。同期可作 PT2 的只读 runtime explore，但不施工 runtime core，避免出现三条互相改底座的线。现在不需要另开大施工线。

**2026-09-07 更新**：用户以施工单授权 PT2 在隔离目录进入受控集成（[DEC-009](decisions.md#dec-009--从只读研究转为受控集成施工2026-09-07)），Core 线与 GUI 线并行、只在 C3/C4 汇合；上一段的「不施工 runtime core」作为历史记录保留，不再约束隔离目录。三线不互改底座的原则不变：Core 不写 `web/*`，Polish/G1 不写 `server/*`。批次与边界见 [pt2-integration/intake.md（历史路径：`mvp/execution/pt2-integration/intake.md`）](migration/2026-09-08/evidence-index.md)。

PT2 只读 explore 现有一份交付：[RD-004](research/RD-004-harness-core-pt2-reconciliation.md) 对账了一次外部 Harness Core 索引与既有 DEC-006/007/008、H1–H5 义务，documentation-only，独立复核未开始，不改变 PT2 门未开的事实。

Legacy 侧不再整理：Courtwork legacy is frozen；除非 Fresh 提出具体的 legacy fact 或 asset 需求，不作进一步 cleanup。冻结锚点与消费方式见 [local-sources](ecosystem/local-sources.md)。

### 2026-09-07 Core独验增量

Astra/Luna完成C4 Core局部独验，发现并修复两项独立反例，冻结修正候选2e1d7718…（52成员），非作者回归80/80及专项通过，详见 [Core裁决（历史路径：`mvp/execution/pt2-integration/adjudication-c4-core.md`）](migration/2026-09-08/evidence-index.md)。后端基线已写入C3草案；GUI合流与真实provider尚未通过，PT2–PT7各门不因本增量自动关闭。

### 2026-09-07 第一层GUI优先级更新

[DEC-010](decisions.md#dec-010--gui两层分工与第一层优先2026-09-07)把当前施工重点放在各级版面、导航/路由和功能闭环，成熟GUI优先复用；精细polish后续Claude另批执行。历史“先rebind/四轴视觉裁决才能继续”的关键路径不再阻断G1/C3功能施工，最终PT7的GUI资格仍保留。Luna实际computer-use参考→Astra采纳→Claude单一web writer；Astra同步推进Core/自足树/独立repo阶段，具体[第一层入口（历史路径：`mvp/execution/gui-completeness/intake.md`）](migration/2026-09-08/evidence-index.md)。不以此更新自动宣布任何门通过或替换legacy main。

本轮执行增量：G2 r2在非作者恢复家族/回归下[接受（历史路径：`mvp/execution/general-ui-g2/adjudication-r2-final.md`）](migration/2026-09-08/evidence-index.md)，G1前置解除；C3执行树已具备本地Git基线da6fc74…和bundle，fresh clone安装后80/80通过，52个Core源文件不变。此为施工版本控制与可恢复性，不替代完整前端/真实provider闭环或Fresh产品谱系晋级。
