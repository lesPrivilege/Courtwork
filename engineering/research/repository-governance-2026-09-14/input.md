我用 Exa 按四条线扫了约 40 个结果：Agent repository instructions、ADR/architecture governance、设计系统治理、Agent coding workflow。结论相当一致：你现在缺的不是更多架构文档，而是一层把“已有文档 → 当前任务 → 可执行约束 → PR 验收”编译起来的仓库治理层。

换言之，README 已经解决了 Store / Index；下一步应该解决 Govern / Retrieve / Compile / Enforce。

我建议把它定义成 Repository Governance Compiler

核心不是再写一份巨大 AGENTS.md，而是形成四层：

层	作用	建议载体
Knowledge Registry	有什么规范、决定、索引	现有 README.md
Standing Contract	Agent 每次进仓必须怎么工作	根 AGENTS.md
Scoped Contract	改前端 / Harness / Runtime 时分别继承什么	子目录 AGENTS.md + canonical docs
Enforcement	不符合体例就不能宣称完成/不能 merge	scripts + tests + CI + reviewer

这其实已经有很成熟的外部共识。OpenAI 当前明确建议：AGENTS.md 保存 durable guidance，包括 repo layout、build/test/lint、engineering conventions、PR expectations、do-not rules、definition of done；而且应该保持简短，详细 architecture / review 规则应链接出去。Codex 还会从 repo root 一路向当前目录合并 AGENTS.md，越靠近修改位置的规则优先。

GitHub Copilot 现在也已经采用几乎相同的模型：repo-wide instructions + applyTo 路径规则 + 任意目录内的 AGENTS.md。这说明 “全局契约 + path-scoped contract”正在成为 coding agent 的事实标准。

⸻

1. 根 AGENTS.md 不应该再装知识，而应该成为“入口协议”

我会让 Courtwork 根目录的 AGENTS.md 非常短，只规定 进入仓库后必须执行的协议。

例如逻辑上只有六件事：

1. Locate
   确认 task 涉及哪些 surface。
2. Resolve
   从 README registry / governance registry 找到对应 canonical docs、ADR、grammar。
3. Inspect precedent
   修改前必须找到现有同类实现；不得凭当前 task 自创新体例。
4. Plan
   非 trivial 修改先形成 change contract / execution plan。
5. Implement
   smallest sufficient diff；不得顺手重构无关区域。
6. Verify
   执行 surface-specific checks + diff review + registration checks。

尤其重要的是：

AGENTS.md 只告诉 Agent 去哪里找真相，不复制真相。

否则 README、ADR、architecture docs、frontend grammar、AGENTS.md 很快就会出现五份相互漂移的描述。

OpenAI 自己现在也明确建议：AGENTS.md 太长以后，不要继续往里面堆，而应链接 planning、code review、architecture 等专项文档。

⸻

2. 真正缺的一层，是一个 change contract

这是我认为最值得加的东西。

你现在已经有：

Architecture / DEC / frontend docs / backend docs / PR records

但它们描述的是“系统是什么”。

下一次 Agent 接一个具体任务时，还需要一个极薄的编译结果：

这次修改要继承哪些既有事实？

可以叫：

engineering/execution/<task>.md

也可以更抽象地叫 change-contract.md。

其 schema 最好稳定：

intent:
  "Add X behavior"
surfaces:
  - frontend
  - harness
in_scope:
  - ...
out_of_scope:
  - ...
authority:
  architecture:
    - docs/architecture/...
  decisions:
    - DEC-00X
  frontend_grammar:
    - docs/frontend/...
  exemplars:
    - src/.../ExistingThing.tsx
    - runtime/.../existing-adapter.ts
registration_obligations:
  - component registry
  - command registry
  - Storybook/state board
  - docs index
verification:
  deterministic:
    - ...
  visual:
    - ...
  integration:
    - ...
architecture_significance:
  none | local | architectural
human_gates:
  - visual approval

这里最关键的不是格式，而是 authority + exemplar + obligations。

Agent 不只是知道：

“遵守前端规范。”

而是知道：

“这个任务修改 composer；必须继承 WS-06 / button grammar / icon grammar；实现应参考 X；如果新增 semantic state，要登记到 Y；若只是复用现有 state，则不得发明新的 token。”

这会明显减少现在 Code Agent 最典型的“局部自说自话”。

⸻

3. README 应继续做“登记册”，不要升级成 Agent prompt

你现在 README 注册 architecture docs / decisions / PR / 前后端文档，本身方向非常正确。

下一步只需要使登记项具有一点 机器可解析语义。

例如额外有一个：

engineering/governance/registry.yaml

概念上：

frontend:
  paths:
    - "src/ui/**"
  read:
    - "docs/frontend/grammar.md"
    - "docs/frontend/tokens.md"
    - "docs/frontend/interaction.md"
  checks:
    - "ui-grammar"
    - "visual-regression"
harness:
  paths:
    - "src/harness/**"
  read:
    - "docs/architecture/harness.md"
    - "docs/decisions/DEC-006.md"
  checks:
    - "architecture-boundaries"
    - "harness-tests"

于是可以有一个极薄的：

governance resolve <git diff / task paths>

输出：

Affected surfaces:
- frontend
- harness
Required reading:
- ...
- ...
Applicable decisions:
- DEC-006
- DEC-008
Required registrations:
- UI state registry
- Harness extension registry
Required checks:
- ...

这一步非常符合 Schema Engineering 自己的理念：

repository docs 不直接 stuffing 给模型。

而是：

Store → Govern → Retrieve → Compile

Agent 每次只得到 与当前 diff 相关的 compiled governance context。

这其实比简单维护一个越来越大的 CLAUDE.md / AGENTS.md 更先进。

⸻

4. 前端尤其应该实行“注册制”，而不是“遵守设计风格”

你提到：

一个局部功能加入，应继承原有前端体例，并在前端注册对应规范和语法。

这里已经有非常好的成熟案例。

Amsterdam Design System 的 Agent 规则几乎就是你想做的东西：

1. 先判断修改了 token / CSS / React / Storybook 哪一层；
2. 阅读 root AGENTS + 对应 package AGENTS；
3. 查相关 docs；
4. 做最窄修改；
5. 必须搜索已有 component/token/story，而不是创造新的；
6. 其正式管线就是 Tokens → CSS → React → Storybook。

它甚至明确规定：“新增 Storybook category 需要 human approval”，以及 visual change 必须经过视觉回归批准。

这个模型非常适合 Courtwork。

你可以把前端拆成：

Semantic grammar
    ↓
Design token
    ↓
Primitive / component
    ↓
Interaction/state
    ↓
Product surface
    ↓
Story / fixture / screenshot

因此 Agent 新增一个东西时，不是问：

能不能写出来？

而是问：

它属于已有哪个语义？
是否已有 token？
是否已有 component？
是否已有 interaction grammar？
是否已有状态？
是否需要增加新语义？
若增加，是否必须登记？

于是：

已有语义

直接消费，不得扩展 grammar。

新 variant

更新 component contract + story/state fixture。

新 semantic primitive

进入 grammar registry，需要单独 review。

新 design language

已经不是 feature PR，而是 design/architecture decision。

这正是防止“每一个 Agent 都设计一次产品”的办法。

⸻

5. 不要只靠 prompt；稳定规则应该逐步成为 executable governance

这是另一个外部实践非常明确的地方。

Canonical 的 Pragma Design System 已经把 architecture convention 做成 webarchitect：用 JSON Schema 检查 package structure、TypeScript config、lint config、license 等。它们明确称这些 schema 是 executable documentation——既描述合法结构，又直接检查合法结构。PR CI 同时跑 architecture validation、tests 和 visual regression。

所以 Courtwork 可以把规则分成三类：

类型	例子	Enforcement
Deterministic	不得 hardcode token、layer import direction、registry entry 必须存在	CI 阻断
Semantic	是否应该创建一个新的 UI primitive、是否违反 DEC	Agent reviewer + 人
Taste	spacing 是否舒服、动画是否自然	screenshot / human review

能编译成规则的，不要永远留在 prompt 里。

例如未来完全可以有：

check:architecture
check:ui-grammar
check:registry
check:docs-impact
check:visual

Agent 在 final handoff 里不能只说：

Tests pass.

而必须报告适用的 governance gates。

⸻

6. ADR 负责“为什么”，AGENTS 负责“怎么工作”，不要混在一起

AWS 的 ADR 指南仍然是很好的边界定义：

ADR 记录 architecturally significant decision 的 context / decision / consequences；接受后保持不可变，如果发生变化则新建 ADR supersede 旧 ADR，而且 code review 应检查实现是否违反现有 ADR。

所以我会明确设一个 Architecture Significance Test。

每个 Agent plan 在开工前判断：

A0 — implementation only
复用既有架构和 grammar。
无需新决定。
A1 — local contract change
改变一个 component/API/state contract。
更新对应规范/fixture。
A2 — cross-surface architectural change
改变 frontend/backend/runtime 边界、persistent model、
provider abstraction、extension model 等。
必须 ADR / DEC。
A3 — foundational change
修改 repo-wide architecture / governance。
必须单独设计 PR，不允许夹带在 feature PR。

这会非常有效。

否则 coding agent 很容易在“修一个 button”的过程中顺手创造一套状态体系。

⸻

7. Agent 编排本身，我建议固定为四段，而不是一个 Agent 从头做到尾

目前成熟 coding agent 的官方实践也在明显向这个方向收敛。

OpenAI 对复杂任务明确推荐 plan before code，并支持 PLANS.md 这种 execution-plan；同时要求 Agent 在完成前测试、检查、review diff。

对 Courtwork，我会固定为：

Resolve / Explore
        ↓
Plan / Change Contract
        ↓
Implement
        ↓
Independent Accept

其中角色最好不同：

Resolve / Explore
只读。查 README registry、相关 architecture、DEC、现有 precedent。

Planner / owner
把检索结果编译成 change contract。裁定是否涉及 architectural significance。

Worker
只拿已经 decision-complete 的 packet 施工。

Reviewer
新 context，只看：

* task contract
* applicable rules
* diff
* verification evidence

而不是读取 Worker 的全部思考过程。

这与你目前 G2 / G1 / Codex 独立验收的思路其实完全同构。

⸻

8. PR 也应该成为 governance artifact，而不仅是代码说明

最终 PR template 可以非常小，但要求回答几个固定问题：

Change surface
Inherited contracts
Existing precedent reused
New semantic/architectural decisions
Registries updated
Verification evidence
Known exceptions

最有价值的一项是：

New semantic/architectural decisions

默认答案应为：

None — this change only instantiates existing contracts.

一旦不是 None，就触发更高治理级别。

这实际上会成为很好的“反过度设计”门槛。

⸻

最终结构我会收敛成这样

不需要一下子造复杂系统：

README.md
AGENTS.md
engineering/
  governance/
    repository-governance.md
    registry.yaml
    code-review.md
    architecture-significance.md
  architecture/
    ...
  decisions/
    DEC-...
  execution/
    <task/change-contract>.md
frontend/
  AGENTS.md
  ...
  
runtime/
  AGENTS.md
  ...
.github/
  pull_request_template.md
scripts/
  governance/
    resolve
    check

其中真正的 authority 顺序建议明确写死：

Accepted DEC / ADR
        ↓
Architecture contract
        ↓
Domain grammar / design system
        ↓
Existing canonical implementation
        ↓
Current change contract
        ↓
Agent implementation

而不是让“当前 Agent 的判断”处于最上层。

⸻

我认为最值得立下的一条总原则

可以把整个 governance 体系概括成一句：

Agent may instantiate an existing pattern by default; creating a new pattern is a governed act.

这正好解决你说的“不会使它显得自说自话”。

所以我不会再继续增加很多说明性文档。你现在文档层已经相当充分，下一阶段真正值得施工的是 一张 registry + 一个 root AGENTS router + 一个 change-contract schema + 一组逐步机器化的 gates。

这样 README 是 知识索引，ADR 是 历史裁决，Architecture 是 现行结构，Grammar 是 可复用语言，Change Contract 是 本次编译后的任务上下文，CI/Reviewer 是 执行约束。这几者职责会非常干净。