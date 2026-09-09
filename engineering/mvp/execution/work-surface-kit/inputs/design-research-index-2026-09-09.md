# 用户转交 · Claude Design Research Index（Anti-Slop / Constraint-Driven Design Loop）

2026-09-09，用户以消息原文转交，Fable 转录，消费裁定见 [intake-round-3 §4q WK-112](../intake-round-3.md)。以下为原文。

---

Purpose: 给 Claude Design 提供可检索、可渐进披露的设计依据。这不是另一份"审美 prompt"，也不是要求一次性消费所有来源；它是一套 design evidence index + operating loop。

## 0. Canonical Loop

```text
constraints → reference / anti-reference retrieval → multiple genuinely different directions → human comparison → remove → component / state isolation → interactive prototype → real-data preview → human review → misfit / papercut ledger → revise constraints ↺
```

核心原则：1 Constraint before generation；2 Explore before implementation；3 Compare, do not merely refine；4 Removal is a mandatory pass；5 Views first; production logic later；6 Evaluate states, not screenshots；7 Real runtime is part of design review；8 Feedback 先判断是否改变 constraint，而非直接 patch UI；9 Taste should compound into reusable evidence；10 Production code is downstream of design decisions。

## I. Primary Sources

**D-001 — Ref / Matt Dailey, How I Design with AI**（https://ref.tools/blog/how-i-design-with-ai）P0 / canonical practitioner source / design operating method。Extract：先列 constraints；同一约束下探索多个方案；新反馈首先判断是否意味着 constraint 改变；避免 "design wackamole"；Agent 默认倾向增加东西，人类应主动删除；避免直接在 production code 中设计，防止 prototype gravity；每轮生成 3–4 个方向，而不是连续 prompt 一个方案；view / logic 分离；`/showcase` 中先设计组件；frontend PR 用 preview deploy + real backend 做人类验收；搜集真实产品截图作为 agent context；taste = 对自己为何喜欢/不喜欢某方案持续反思形成的 solution library。Claude Design consumption：这是 workflow source，不是 style source。不得要求 "make it look like Ref"；应消费 "apply Ref's constraint → variants → removal → isolated component → real preview review loop."

**D-002 — Christopher Alexander, Notes on the Synthesis of Form**（https://www.hup.harvard.edu/books/9780674627512）P0 / theoretical foundation / constraint model / feedback semantics。design 是 form 与 context 的 fit；复杂系统无法靠一次整体跃迁达到 fit；应识别具体 misfit；把问题分解为相对独立、但最终能够融合的 subsystem；设计的演化本质上是逐步减少 misfit。Translation：用户反馈不要立即映射成 feedback → UI patch，而应 feedback → is this a local defect? yes → local correction；no → constraint / subsystem mismatch → revisit sibling solutions。这可以成为 Claude Design review 的默认推理框架。

**D-003 — Anthropic / Claude Design**（https://claude.com/blog/how-the-product-designer-who-built-claude-design-uses-it-to-explore-ideas-before-building-them；https://claude.com/blog/claude-design-stays-on-brand-for-daily-work）P0 / tool-native practice。Design 用于 early exploration / alignment，production software 下游交给 Claude Code；Nate Parrott 实际会一次探索 15 个 flow versions；fidelity 不重要时先 wireframe；提前提供真实 assets、fonts、colors、brand principles；recurring choices 固化成 design system；小修最后直接在 canvas 上操作，而非继续 prompt 整个设计；Claude Design ↔ Claude Code 双向 round-trip；连接 GitHub 后，应优先消费已有 screens/components，而非重新"想象一个产品"。Courtwork implication：Claude Design 应成为 design exploration workspace，而不是 frontend implementation agent。即：Claude Design 冻结方向 → Claude Code / 本地 agent 施工 → preview → 再回 Design review。

## II. Component / State Layer

**D-004 — Storybook**（https://storybook.js.org/）P0 / mature engineering analogue / `/showcase` 的成熟实现参考。Storybook 提供：component/page isolation；difficult states / edge cases；story = reproducible known-good state；visual / interaction / accessibility tests；design + implementation documentation；published component catalogue；当前甚至明确将 validated Storybook patterns 暴露给 AI agents。Recommended abstraction：Courtwork 不必机械引入 Storybook，但应有一个 Design Workshop / Component Gallery，至少覆盖 component ├ normal ├ hover ├ selected ├ loading ├ empty ├ error ├ disabled ├ dense ├ narrow └ long-content。Claude Design 不应该只收到一个漂亮截图，而应看到一个组件的 state-space。

## III. Runtime Review Layer

**D-005 — Preview Deployments / Vercel**（https://vercel.com/docs/deployments/environments）P0 / design → reality boundary。Preview deployment 的价值并非部署方便，而是把 design review 升级为 running-system review。成熟语义：branch URL → 始终指向该方向最新版；commit URL → 固定某次裁决对象；与 production 隔离；可以接真实/近真实数据与 backend；PR 可以成为 design review boundary。Recommended Courtwork flow：backend behavior → automated verification；frontend behavior → preview deployment → human visual/interaction review；cross-boundary UX → preview + realistic data。不要把截图通过视为 frontend done。

## IV. Perceptual Context

**D-006 — mood-protocol**（https://github.com/Owl-Listener/mood-protocol）P2 / schema reference only。adoption 很小，不建议直接成为依赖；但其分层值得取型：perceptual context → mood / references / anti-references；systemic context → tokens / components / rules；procedural context → agent instructions / workflow。Suggested internal vocabulary：不要把所有设计知识塞入 `DESIGN.md`；逻辑上区分 references/（positive/ negative/）、design-intent（mood / material / density / rhythm / motion / anti-references）、design-system（tokens / components / states / layout constraints）。Claude Design 按需检索，而非每次全量注入。

## V. Community Implementations — Borrow, Do Not Adopt Blindly

**D-007 — design-builder**（https://github.com/app-builders-club/design-builder）P3 / experimental。Borrow：spec-first；references before generation；design/build separation；explicit review stage；screenshot/URL visual audit；anti-pattern gate；design artefacts versioned in repo。Do not inherit：项目自造的大量设计 taxonomy；固定 aesthetic dials；把 anti-slop 规则本身变成新的统一模板。当前 adoption 很低，应视为 prototype evidence。

## VI. Claude Design Handoff Contract

每一个进入 Claude Design 的实际设计任务，建议至少携带以下 index，而不是一段巨型 prompt：

```yaml
design_task:
  intent: {user_goal, primary_action, information_priority}
  constraints: {functional, business_states, navigation, density, responsive, accessibility}
  existing_system: {components, tokens, screens, assets}
  references:
    positive: [{source, exact_element_to_borrow, why}]
    negative: [{source, avoid, why}]
  unresolved: [{question, competing_constraints}]
  exploration: {variant_count: 3-5, require_structural_difference: true}
  review: {removal_pass: required, constraint_recheck: required, state_review: required, real_data_review: required}
```

## VII. Variant Rule

禁止 "Variant A: blue / B: purple / C: bigger cards"。需要的是 structural alternatives：A — navigation-first；B — document-first；C — workspace-first；D — command/composer-first。视觉变量随后再探索：composition → density → typography → material → motion → micro-detail。不能同时随机化所有维度，否则无法知道为什么某方案更好。

## VIII. Papercut / Misfit Ledger

建议为设计建立一个持续积累但不立即施工的 ledger：`- surface / observation / severity / recurrence / suspected_constraint / local_fix_safe / related_items`。周期性聚类后再决定 isolated papercut vs systemic design constraint。这样可以抑制 agent 最危险的行为之一：每收到一句 feedback 就增加一个 icon / divider / badge / affordance。

## IX. Anti-Slop Review Gate

每轮至少检查：**Necessity**（删除此元素后任务还能完成吗？copy 是否在解释一个本可由结构表达的东西？icon 是否真的增加信息？）**Hierarchy**（页面是否只有一个明确的主要 focal point？sibling actions 是否被随机赋予不同 prominence？）**System**（是否复用了已有 component？是否偷偷产生新的 radius / shadow / spacing convention？）**Reference fidelity**（引用的是具体设计原理，还是只模仿表皮？是否混合了至少两个独立来源进行判断？）**AI tells**（gratuitous cards、excessive rounded containers、unnecessary explanatory copy、decorative badges、meaningless gradients、icon-per-row、fake dashboard density、arbitrary floating panels）**Reality**（long text？empty/error/loading？narrow viewport？real data？repeated daily use 后是否仍合理？）

## X. Canonical Design Principle

Do not design by accumulating solutions. Maintain an explicit model of constraints and misfits; explore multiple forms against it, remove aggressively, validate components in isolation and workflows in a running system, then allow successful decisions to compound into the design system and reference corpus. `anti-slop` 只是结果。真正的治理对象是：constraints / references / components / states / decisions / misfits / runtime evidence。视觉完成度是这些被持续治理后的涌现结果。
