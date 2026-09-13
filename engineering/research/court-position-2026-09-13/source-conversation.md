# Court定位参考实践 · 来源原文

会话 `6aa682f1-2024-83ec-b099-351239cd1b30`；按时间顺序排列工具返回的两轮。此文件为输入档案，不是当前指令或事实裁决。

## userMessage · b8aed049-e57f-4a22-9e4e-19e4127f5a0c

Court 的定位有些接近 orchestra ，有哪些可以参考？或许还有其他成熟实践 @Exa

[User attached 1 image; image contents were not included]

## userMessage · 41a96957-3c73-4bbe-a5d5-faa1a5f26835

https://meathill.com/posts/tech/my-great-ai-workflow-with-different-ai-models

这类 workflow 亦可参

## agentMessage · b77ad61e-0484-4083-a093-e69aa15b45ff

可以。这个补充很关键：**Court 不应只参考“多 Agent 编排器”，还应该参考成熟的人类研发 workflow 如何把不同能力的人稳定地组织成可验收的生产系统。**

我用 Exa 沿 6 条线看了约 60 个结果，并进一步读了 Agent Orchestrator 架构、Kandev、Warden、VS Code Harness、Temporal、Kubernetes Controller，以及你补充的 [Meathill workflow](https://meathill.com/posts/tech/my-great-ai-workflow-with-different-ai-models)。目前我会把 Court 的位置重新描述为：

> **Court 更接近 AI work control plane，而不只是 Agent Orchestrator。**  
> Harness 管一个 Agent session；Orchestrator 管多个 worker；Court 再往外一层，管理工作状态、上下文、runtime、治理、验证与人类 Attention。

这里有几条非常值得直接消费。

| 参考体系 | 最值得 Court 吸收的东西 | 翻译到 Court | 不建议照搬 |
|---|---|---|---|
| [Agent Orchestrator](https://github.com/Untrivial-ai/agent-orchestrator) | `OBSERVE → UPDATE → DERIVE`；只持久化事实，UI 状态读取时派生；Agent/Runtime/Workspace/SCM 全部 adapter 化 | Event Log / Matter State / UI projection 分离；Attention 状态不要自己成为真相 | 把 Git、PR、Kanban 当成整个产品本体 |
| [AO durable work graph #2764](https://github.com/Untrivial-ai/agent-orchestrator/issues/2764) | **Session 是 runtime unit，Work Graph 是独立 coordination overlay**；重启以后无需读聊天也能回答“谁负责什么、被什么阻塞” | 这几乎直接验证 Court 的 `Event Log ≠ Matter State ≠ Model Context` | 把 plan 塞回 orchestrator prompt 或 session metadata |
| [Meathill workflow](https://meathill.com/posts/tech/my-great-ai-workflow-with-different-ai-models) | 不追求偶发模型上限，而是通过规范、测试、文档、Review、Skill **抬高稳定下限** | Provider/Model 可替换；Court 提供稳定 workflow、policy、verification、knowledge substrate | 把 `WIP.md/TODO.md/DEV_NOTE.md` 这些具体文件名固化成产品 ontology |
| [Kandev](https://github.com/dionet/kandev) | ACP 统一不同 Agent；Executor 与 Agent 分离；Local/Docker/SSH/Cloud；多 repo；Task-Agent MCP | 很适合 Court 的 Harness Adapter / Execution Environment / Expert Extension 边界 | 做成另一个功能密集型 IDE |
| [Warden](https://github.com/Gentoflakes/warden) | 把**人类 review attention 当成稀缺资源**；fresh-context audit；evidence-ranked queue；运行中 steering + acknowledged ledger | Attention 不只是“通知中心”，而应成为证据化的人类裁决面 | coding 特有的 branch risk score 直接泛化到所有工作 |
| [VS Code Harness 定义](https://code.visualstudio.com/docs/agents/concepts/agent-harnesses) | 明确区分 Model / Agent Role / Harness / Execution Environment / Session Target，并支持 handoff | Court 文档术语可以直接参考这一层级，避免 Provider、Runtime、Harness 混词 | 跟随 VS Code 的产品层级和入口 |
| [Temporal](https://docs.temporal.io/encyclopedia/architecture/temporal-architecture) | Event History、Task Queue、Worker、Signal/Query、durable resume、idempotency | 长任务、断点续行、等待人类、异步 worker 的后台语义参考 | 现在就引入 Temporal 或做完整 workflow DSL |
| [Kubernetes Controller](https://kubernetes.io/docs/concepts/architecture/controller/) | Desired State / Observed State / Reconciliation；level-triggered；多个小 controller 而非一个全知 orchestrator | Email、PR、Matter、Runtime、Approval 都可以各有观察器/reconciler | 把 Kubernetes 术语泄漏给最终用户 |

其中 **AO #2764 是这轮最有价值的一条旁证**。它现在自己遇到的问题是：最初拥有 orchestrator session、worker session、worktree、PR 和 Kanban，但后来发现这些仍不足以代表“工作本身”。于是提出一个**与 session 并列的 durable work domain**：

> Sessions remain the runtime unit. The work graph is the coordination overlay.

而且它给自己的成功标准是：**杀掉 orchestrator、重启 daemon 后，人仍然能知道什么被什么阻塞、谁拥有它，不需要读聊天记录。**

这正是 Court 已经更早划出的边界：session/context 不能承担 Matter 的长期真相。

### 你补充的 Meathill workflow 特别适合成为另一类参考

那篇文章不是在发明新的 Agent 架构，反而价值正在于它很传统：

`行为规范 → 理解/计划 → 测试 → 实现 → 验证 → 小步提交 → 知识沉淀 → 周期维护 → SOP/Skill`

它实际上表达了一个非常适合 Court 的原则：

**模型能力是可替换变量，工作制度才是稳定资产。**

例如文章里的几个东西，可以被 Court 往更一般的层级翻译：

`AGENTS.md` 不必理解成一个文件，而是 **Policy / Working Agreement**；  
`WIP.md` 是短期的 **Active Matter State / Plan Projection**；  
`TODO.md` 是 backlog；  
`DEV_NOTE.md` 是经过治理的 durable knowledge；  
TDD / typecheck / build / review 是 **Verification Gates**；  
code-maintenance Skill 是一种 **Expert / Harness Extension**；  
Fable、Sonnet、廉价模型之间的分工，本质上是 **routing policy**。

真正值得 Court 做的不是自动生成这几个 Markdown 文件，而是让这一套关系成为可配置、可观察、可版本化的工作机制。Markdown 只是其中一种 projection。

### 因此我反而不建议把 Court 对外叫“Orchestrator”

`Orchestrator` 很容易让人想到：

> objective → task DAG → spawn N agents → merge results

这只是 Court 的一个局部能力，而且 Coding 场景最容易把这个词占满。

Court 的结构更像：

**Matter / Work**  
↓  
**policy + governed state + provenance**  
↓  
**Chat / Attention / Spark**  
↓  
**Orchestrator / Expert / Harness**  
↓  
**Claude / Codex / Pi / sovereign model / browser provider**  
↓  
**local / worktree / sandbox / remote / cloud**

所以以后甚至可以出现：

> Court uses Agent Orchestrator as one coding runtime.

而不是 Court 自己被定义成 Agent Orchestrator。

这也正好解释现在的三个入口：**Chat 是交互面，Spark 是廉价后台工作面，Attention 是人类稀缺判断力的调度面；它们都不是 Matter 本身，更不是某个具体 Harness。**

如果把这轮参考直接转成 Release 前架构审计，我建议新增一项明确门槛：**任何架构文档都不能再把 Session、Task、Matter、Runtime、Harness、Provider、Agent Role 混为同一级对象**。AO、VS Code、Temporal 和这篇传统 workflow 的交集，已经足够支持我们把这套 vocabulary 在发布前正式裁定。
