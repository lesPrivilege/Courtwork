# Court定位参考实践 · 增量完整召回

输入档案；嵌入建议不作为当前执行指令。旧两轮原件保持不变；本次返回4轮/6条消息、1个附件、hasMore=false。

## Turn b8aed049-e57f-4a22-9e4e-19e4127f5a0c

### userMessage · b8aed049-e57f-4a22-9e4e-19e4127f5a0c

Court 的定位有些接近 orchestra ，有哪些可以参考？或许还有其他成熟实践 @Exa

[User attached 1 image; image contents were not included]

## Turn 41a96957-3c73-4bbe-a5d5-faa1a5f26835

### userMessage · 41a96957-3c73-4bbe-a5d5-faa1a5f26835

https://meathill.com/posts/tech/my-great-ai-workflow-with-different-ai-models

这类 workflow 亦可参

### agentMessage · b77ad61e-0484-4083-a093-e69aa15b45ff

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

## Turn 12b8a869-95a6-44df-bfed-b81b31b9b1e4

### userMessage · 12b8a869-95a6-44df-bfed-b81b31b9b1e4

不过可以考虑看看有没有对于多个不同的 coding agent 进行编排管理的成熟实践。那么原先他们手动来编排的东西，现在可以做一个容器来实现了，也就是我们之前考虑的可替换的 runtime。那么一个好处就是对于不同的 coding agent，比如 CodeX 或者 Cloud Code，他们本身自己有一套数据存储或者缓存的规则。那么现在之后呢，是我想对于这个工作区的一些索引，是双方都可以共用的。然后跨 agent 之间的通信也会更简单一些。 @Exa

## Turn 110b3275-4457-430e-a0a5-627e2ef3cf8f

### userMessage · 110b3275-4457-430e-a0a5-627e2ef3cf8f

其本质依然是在 Agent 入场之前把工作区本身建立为一个比较好的结构化的工作面，可以附有若干的索引，以备模型入场后进行间接式的披露。那么对于多个 Agent 来说，他们入场之后都能够得到一些效果的辅助。

### agentMessage · 3c096c40-5f67-42dd-b3de-0cf5751167e7

对。这样一来，“可替换 Runtime”这件事的重点就不是**把 Claude Code、Codex 等塞进同一个容器里统一管理**，而是更前置的一层：

> **Agent 进入之前，Court 先把 Workspace 编译成一个可治理、可索引、可查询的工作面；Agent 只是这个工作面的不同执行 Runtime。**

这轮沿着这个方向继续查，外部已经出现了几种非常接近的实践，而且可以拼成一套相当清晰的结构。

### 1. Runtime 层：MASS 的类 containerd 结构很值得参考

[MASS](https://github.com/wjueyao/mass) 的抽象相当干净。它直接类比 OCI/containerd：

```text
Court / Orchestrator
        ↓
Workspace Runtime API
        ↓
Runtime Supervisor
   ├── Claude adapter
   ├── Codex adapter
   ├── OpenCode adapter
   └── ...
        ↓
actual coding agent
```

它自己对应成：

```text
containerd        → agentd
runc              → agent-run
CRI               → ARI
container image   → workspace spec
```

而 Claude、Codex 最后一层统一通过 ACP 等协议进入。

这和 Court 很适合，因为 **Court 不必模拟 Claude Code 或 Codex 的内部 loop**。Provider 自己的 session、prompt caching、compaction、tool semantics 都继续归它自己负责；Court 管的是它们外面的：

**workspace preparation → launch → observe → communicate → recover → handoff → stop。**

所以 Runtime Adapter 的稳定接口可以很薄。

---

### 2. 但更重要的是你刚才说的：Workspace 应该先于 Runtime 存在

这方面，[Agent Coordination Protocol](https://github.com/chrismichaelps/acp) 有一句非常准确：

> independent agents coordinate through shared state instead of a shared conversation.

它把共享对象定义成：

`Workspace / Worker / Work Unit / Lease / Checkpoint / Memory / Artifact / Review / Event`

而不是“大家共享一个聊天记录”。

这非常适合 Court。

甚至可以进一步规定：

```text
Workspace
├── Source
├── Governed Artifacts
├── Indexes
├── Work State
├── Coordination State
└── Runtime-local State
```

其中前三四层是 **Court-owned**，最后一层才分别属于 Claude/Codex。

这就避免了一个很大的架构陷阱：试图把

```text
~/.claude/projects/.../*.jsonl
~/.codex/...
OpenCode session DB
```

这些厂商内部格式直接拼成一个“大统一 memory”。

**不应该这么做。**

这些东西可以观察、导出、归档，但不能成为 Court 的公共数据模型。

---

## 3. 真正共享的应该是“索引”，而不是“Cache”

这轮搜索里，SCIP 这一条线尤其吻合。

[SCIP](https://github.com/scip-code/scip) 本身就是语言无关的静态代码索引格式，可以把不同语言统一成：

- symbol
- definition
- reference
- implementation
- relationship

现在已经有不少 Agent-first 工具在做同一个结构：

```text
Repository
   ↓
Tree-sitter        → cheap structural index
SCIP               → precise semantic index
git                → revision / diff / provenance
docs parser        → spec / ADR / runbook / plan index
   ↓
Shared Workspace Index
   ↓
MCP / CLI / RPC
   ↓
Claude / Codex / OpenCode / Spark / Expert
```

例如 [Tessera](https://github.com/razasaad/tessera) 已经明确把 SCIP 索引做成一个 MCP 服务，让 Claude Code、Cursor 等多个 Agent 共用同一份 code intelligence。

另一个很接近 Court 理念的 [codescout](https://github.com/mareurs/codescout)，甚至不只索引代码，还把：

`spec / plan / ADR / runbook / memory / audit / handoff / roadmap`

这些工作区 artifact 建成有类型的 catalog 和关系图。

所以这里其实可以形成 Court 很稳定的一层：

### Workspace Index ≠ Model Context

Index 可以很大，也可以长期存在：

```text
File manifest
Symbol index
Dependency graph
Artifact registry
Decision index
Test/build entrypoints
Task/work ownership
Source/provenance links
```

模型入场时只进行：

```text
Query
  ↓
Retrieve
  ↓
Compile
  ↓
Runtime-specific context
```

而不是：

```text
把整个 Workspace Index
→ 塞进 context
```

这正是之前 `Store → Govern → Retrieve → Compile` 在 coding 场景里的具体化。

---

## 4. “间接披露”会成为很重要的设计原则

我甚至认为应该把你刚才的这个词保留下来。

Agent 不需要在启动时知道整个 Workspace。

例如一个 Codex Runtime 入场：

```text
Court Workspace
│
├─ manifest
│  ├─ repo identity
│  ├─ branch / commit
│  ├─ languages
│  └─ active work
│
├─ indexes
│  ├─ symbols
│  ├─ dependencies
│  ├─ docs
│  ├─ decisions
│  └─ tests
│
└─ disclosure tools
   ├─ orient()
   ├─ search_symbols()
   ├─ find_references()
   ├─ related_artifacts()
   ├─ active_work()
   ├─ get_decision()
   └─ read_source()
```

启动上下文只需要告诉它：

> 这里有什么；需要时到哪里查；哪些来源具有何种 authority。

然后模型自己按需披露。

这样 Claude、Codex、Spark 首次进入同一 repo，就不再分别消耗几十个 grep/read 去重新“认识世界”。

而且更重要的是，**Court 可以知道某条索引对应哪个 commit**。

如果 Agent 已经修改了工作区：

```text
Index @ abc123
Workspace @ abc789
```

那么 Court 可以明确告诉模型：

> structural index is stale after abc123; use live source for modified paths.

这比把 RAG 结果当真相安全得多。

---

## 5. 多 Agent 通信也因此不需要通过互相读 transcript

[succubus](https://github.com/enowdev/succubus) 是这方面一个很好的小型实践。

它用：

```text
Claude #1 ─┐
Claude #2 ─┤
OpenCode  ─┼→ daemon → SQLite
Codex     ─┘
```

共享：

- plan
- tasks
- file claims
- agent identity
- questions/messages

还用 TTL lease 防止多个 Agent 同时抢同一个文件。

我认为 Court 可以吸收它的机制，但进一步把通信语义变得更“工作化”，而不是建立一个 Agent 聊天室。

例如跨 Runtime 的消息可以是：

```text
Message
  from: codex/session-17
  to: claude/session-4

  kind: finding | question | handoff | conflict | decision-request

  work_item: CW-142
  summary: ...
  evidence:
    - src/foo.ts:L42-L78
    - decision://DEC-014
  requires_ack: true
```

这样 Claude Code 不需要读取 Codex 的 80k token transcript。

它只得到：

**Codex 留下了什么判断 + 证据在哪里 + 是否需要我回应。**

如果需要深入，再沿引用展开。

这也是“间接披露”。

---

## 6. Provider 自己的 Memory / Cache 应该保留，但降级成 Runtime 私有优化

这一点尤其重要。

Claude Code 目前已经有很完整的自身体系：

- session transcript
- prompt cache
- `CLAUDE.md`
- project auto memory
- rules
- skills
- hooks
- MCP

而且它的 auto-memory 本身就是按 repo 跨 worktree 共享的。

所以 Court 没必要和它竞争。

更合理的是：

```text
                 Court Workspace
                /      |       \
               /       |        \
      Shared Index   Work State   Artifacts
             ↓          ↓           ↓
      ┌──────────┬──────────┬──────────┐
      │ Claude   │ Codex    │ OpenCode │
      │ Adapter  │ Adapter  │ Adapter  │
      └──────────┴──────────┴──────────┘
          ↓          ↓           ↓
      native      native       native
      memory      cache        state
```

也就是：

**Court owns durable cross-runtime knowledge.**  
**Runtime owns provider-specific optimization.**

两边可以有投影关系，但没有必要强行同步。

---

## 7. 一个很好的外部旁证是 Coding Agent Fabric 的做法

[Coding Agent Fabric](https://github.com/matteblack9/agent-fabric) 已经开始明确区分：

```text
AGENTS.md      → runtime-neutral shared contract
CLAUDE.md      → Claude-specific
.claude/       → Claude-specific
.cursor/rules  → Cursor-specific
opencode.json  → OpenCode-specific
```

这个方向是对的。

Court 可以把它进一步产品化：

```text
Canonical Workspace Policy
        ↓ compile
 ┌─────────────┬─────────────┬─────────────┐
 ↓             ↓             ↓
AGENTS.md    CLAUDE.md    runtime config
Codex view   Claude view   OpenCode view
```

也就是说，最终甚至不一定要求用户维护五套文件。

**Court 持有一个 canonical semantic layer，然后 Runtime Adapter 负责生成/暴露适配视图。**

---

# 因而我现在会把这一层正式叫作 `Workspace Substrate`

不是 Memory，也不是 RAG，更不是 Orchestrator。

它的位置大概是：

```text
                 Human
                   │
          Chat / Attention
                   │
              Court Work
                   │
        ┌────────────────────┐
        │ Workspace Substrate│
        │                    │
        │ Source             │
        │ Governed State     │
        │ Artifact Registry  │
        │ Shared Index       │
        │ Coordination       │
        │ Provenance         │
        └────────────────────┘
                   │
            Runtime Interface
        ┌──────────┼──────────┐
        ↓          ↓          ↓
     Claude      Codex      OpenCode
     Runtime     Runtime    Runtime
```

而 Spark 甚至也可以消费这个 substrate：它预先做 cheap explore、文档分类、索引核对、diff 检查，然后把结果登记进去；等昂贵 Runtime 入场时直接使用。

### Release 前可以先收敛得很小

现在完全不需要实现知识图谱或大型 RAG。我会优先冻结五个接口：

1. **Workspace Identity**：repo/root/ref/commit/dirty-state。
2. **Artifact Registry**：文件、spec、decision、handoff、test 等对象及 provenance。
3. **Index Interface**：先支持 file/text/symbol，SCIP/Tree-sitter 后挂。
4. **Coordination Interface**：worker、work item、lease、message、checkpoint。
5. **Runtime Projection**：同一份 workspace 事实怎样分别披露给 Claude/Codex/其他 Harness。

其中最关键的原则可以直接写进架构裁决：

> **Agent-native session state is not shared workspace state. Shared knowledge must be reconstructible independently of any provider runtime.**

这样未来 Claude Code、Codex 哪怕把自己的 memory、cache、session 格式全部重写，Court 的工作区都不会跟着折旧。

