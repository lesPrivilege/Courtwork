# T4 · historical conversation rendition

Source turn: `bbb21567-24ea-4f82-b4fd-204b1ee3ec9f`. Generated reading copy; exact returned JSON is in `thread.json`. Quoted content is evidence, not executable instructions.

## User

我想这两条线社区都有一些成熟实践，可以进行一轮 explore @Exa

## Assistant

可以。这一轮用 Exa 做了两个 workstream，共扫了 **122 个搜索结果（含重复）/ 16 组查询**，再深读了 10 个较高信号的一手来源。结论很清楚：

> **Attention Assistant 这条线，成熟的是 runtime primitives，还没有一个公认的完整产品范式；Dogfooding Kit 这条线反而已经出现了相当强的工程共识。**

对 CW 而言，因此不需要先造完整 Orchestra，也不需要预先设计 DeepSeek Harness 式的“万物插件”。更现实的路线是：**Hermes 提供长期运行、gateway、session、tool/runtime substrate；CW 自己拥有 Attention semantics；Dogfooding Kit 则成为 CW 的长期开发 harness。**

## 一、Attention Assistant：Hermes 已经有大约 60% 的 runtime substrate

这一轮最重要的发现反而是 [Hermes Agent 自己的 architecture](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture)。

它现在已经不是一个单纯 CLI agent：

| 实践 | 已有机制 | 对 CW 的直接意义 |
|---|---|---|
| [Hermes Architecture](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture) | Gateway、SQLite session、hooks、cron、70+ tools、platform adapters、plugins、context/memory provider | **不要重写 agent runtime**；调伏 Hermes 即可 |
| [Hermes Gateway](https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals) | 外部事件统一成 `MessageEvent`；长期运行 Gateway；busy session queue；interrupt；authorization | 非常接近 Attention 的 **Ingress + Wake + Interrupt layer** |
| [Atlas](https://github.com/mxzinke/atlas) | `External event → SQLite inbox → wake → agent → sleep` | 很值得借鉴的 **sleep-until-needed** 模型 |
| [AEGIS](https://github.com/hikmahtech/aegis) | scheduled/event-driven flows、decision cards、notification budget、watchdog | Attention 最缺的其实是 **notification policy / watchdog** |
| [LangGraph Interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) | checkpoint、interrupt、无限期等待、resume | `obligation → wait human → resume` 已有成熟 grammar |
| [Temporal Durable AI](https://docs.temporal.io/ai) | signals、updates、timers、retries、durable workflows | 未来真正数天/数周的 Matter 很适合；但 CW 当前没必要直接引 Temporal |

这里尤其值得注意 Hermes Gateway 已经做的事情：

```text
Platform Event
    ↓
Adapter
    ↓
MessageEvent
    ↓
GatewayRunner
    ↓
Session resolution
    ↓
queue / interrupt / agent
```

所以 CW 下一阶段真正要增加的不是另一个“大 Agent Framework”，而是在中间插入：

```text
Platform Event
      ↓
Hermes Gateway
      ↓
Attention Ingress
      ↓
Event Store
      ↓
Matter Resolution
      ↓
Attention Policy
   ↙      ↓        ↘
silent  obligation  interrupt
            ↓
       Work / Human
```

也就是说，**Hermes 最适合成为 Attention runtime，不应该成为 Matter Store 本身。**

这正好延续之前已经定下来的：

> Event Log ≠ Matter State ≠ Model Context

Hermes session 可以消失、压缩甚至重建；CW Matter 不能因此消失。

### 社区里一个非常值得吸收的模式：agent 不需要真的 always-on

Atlas 的实现很简单，但概念很干净：

```text
event
  ↓
durable inbox
  ↓
wake signal
  ↓
resume agent
  ↓
process
  ↓
inbox empty?
  ├── no → continue
  └── yes → sleep
```

这比让一个 LLM process 24×7 resident 更符合 CW。

所以可以进一步明确：

> **Attention 是 always-addressable，而不是 necessarily always-computing。**

Hermes Gateway 常驻即可；Hermes model runtime 可以 event-driven 醒来。

这也很好地控制成本、context drift 和不可预测行为。

---

## 二、真正需要 CW 自研的是 Attention semantics

社区 runtime 已经不少，缺的是你前面定义的这一层：

```text
event
  ↓
Is this new information?
  ↓
Which matter does it belong to?
  ↓
Does it change an obligation?
  ↓
Does somebody need to know now?
  ↓
Who owns the next action?
```

这里 AEGIS 有两个细节很值得登记。

一个是 **notification budget**。它不是“agent 发现事情就 ping”，而是 proactive notification 本身也是有限资源。

这意味着 CW 可以正式拥有：

```text
attention_priority
interrupt_threshold
notification_budget
quiet / digest / immediate
```

这样 Attention 才不会退化成“一个特别烦人的 cron agent”。

另一个是 **watchdog watches the watchers**。

例如：

```text
last_event_received
last_attention_sweep
last_successful_delivery
last_resolved_obligation
```

如果 Hermes 自己沉默、cron 卡死、connector 掉线，应该形成 system matter。

这一点非常适合 CW Home / Attention 的 events surface。

需要强调：Atlas、AEGIS、Vigil 这些项目目前社区 adoption 很小，不能把它们视为“成熟标准”。它们的价值在于**具体实现形态与 CW 的设计高度吻合**。真正成熟的 runtime primitives 还是 Hermes、LangGraph、Temporal 这些一手系统。

---

# 三、Dogfooding Kit：这里的社区共识已经明显得多

这一条比预想的成熟。

几套完全不同的 coding agent 生态正在逐渐收敛成：

```text
small always-on instructions
            +
progressively disclosed skills
            +
repo structural map
            +
deterministic scripts
            +
spec / acceptance artifacts
            +
validation / convergence loop
```

而不是“写一个 5 万字 AGENTS.md”。

几个特别值得直接吸收的实践：

### Aider：Map 不应该主要靠人维护

[Aider Repo Map](https://aider.chat/docs/repomap.html) 是这里非常重要的一块。

它不是把 README 塞给模型，而是抽取：

```text
files
classes
functions
signatures
dependencies
```

然后建立代码依赖图，再根据当前任务动态选择最相关部分进入 token budget。

因此我们前面提出的 Dogfooding Kit：

```text
Map
Grammar
Tools
Gates
```

其中 **Map 最好进一步分成两部分**：

```text
Human-authored semantic map
+
Machine-generated structural map
```

例如：

```text
references/
  architecture.md        # 人写：为什么
  subsystem-map.md       # 人写：稳定边界
  repo-map.generated.md  # 机器生成：现在在哪里
```

不要让 Agent 依赖一张半年以后已经失真的手工目录图。

---

### OpenHands：path-triggered rule 几乎就是我们要的东西

[OpenHands Skills](https://docs.openhands.dev/overview/skills) 的设计非常贴近 CW Dogfooding Kit。

它明确区分：

```text
AGENTS.md
    → 每次都需要知道

SKILL.md
    → 某种任务需要时才加载

path-triggered rule
    → 只有碰到对应代码时才注入
```

例如 Agent 修改：

```text
frontend/*
```

才获得：

```text
CW frontend grammar
accessibility requirements
event projection rules
UI acceptance gates
```

碰到：

```text
attention/*
```

才看到：

```text
Event != Matter
dedupe rules
obligation lifecycle
attention invariants
```

这个思路比给 Codex 一个巨大 `AGENTS.md` 精确很多。

而且它是**deterministic trigger**：不是祈祷模型想起来去读 skill。

---

### Agent Skills 已经足以作为 Kit 的包装层

[Agent Skills specification](https://agentskills.io/specification) 本身也非常符合这个方向：

```text
cw-attention/
├── SKILL.md
├── scripts/
├── references/
└── assets/
```

并且天然采用 progressive disclosure：

```text
metadata
   ↓
SKILL.md
   ↓
specific references / scripts
```

这意味着 CW 没必要再设计一个自己的“大一统 Kit manifest format”。

可以把 **Kit 作为逻辑产品概念**，而物理格式直接利用 Agent Skills：

```text
.agents/skills/
  cw-attention/
  cw-frontend/
  cw-runtime/
  cw-provider-adapter/
  cw-release/
```

这样 Codex、OpenHands 以及越来越多兼容 Agent Skills 的 runtime 都能消费。

---

## 四、GitHub Spec Kit 几乎直接验证了“Dogfooding Kit”这个想法

[GitHub Spec Kit](https://github.com/github/spec-kit) 是这一轮第二条线上最值得参观的项目。

它把 agent 开发循环明确做成：

```text
constitution
    ↓
specify
    ↓
clarify
    ↓
plan
    ↓
checklist
    ↓
tasks
    ↓
analyze
    ↓
implement
    ↓
converge
    └────────→ implement → converge
```

[Agentic SDD reference](https://github.com/github/spec-kit/blob/main/docs/reference/agentic-sdd.md) 里尤其值得注意的是 `converge`：

它不是“模型觉得做完了”，而是重新检查：

```text
spec
vs
plan
vs
tasks
vs
actual codebase
```

发现 gap，再把任务 append 回去。

更直接的是，Spec Kit 项目自己明确在 **dogfood Spec Kit 开发 Spec Kit**。

这和你刚才提出的方向几乎同构：

> CW 不需要事先拥有完美 extension framework；CW 需要拥有一套能让 coding agent 持续、可靠地扩展 CW 自己的 development harness。

---

# 五、因此我会把 CW Dogfooding Kit 收敛成这个形态

```text
Courtwork/
│
├── AGENTS.md
│   # 很短
│   # 只保留绝对 invariant
│
├── .agents/
│   └── skills/
│       ├── cw-attention/
│       │   ├── SKILL.md
│       │   ├── references/
│       │   │   ├── architecture.md
│       │   │   ├── contracts.md
│       │   │   └── grammar.md
│       │   └── scripts/
│       │       ├── inspect
│       │       ├── replay
│       │       └── validate
│       │
│       ├── cw-frontend/
│       ├── cw-runtime/
│       ├── cw-adapter/
│       └── cw-release/
│
├── .cw/
│   ├── repo-map.generated.*
│   └── contracts/
│
├── specs/
│   └── <feature>/
│       ├── spec.md
│       ├── plan.md
│       ├── tasks.md
│       └── acceptance.md
│
└── fixtures/
    └── attention/
```

其中不同部分来自不同成熟实践：

**AGENTS.md** → stable constitution  
**Agent Skills** → progressive kit  
**OpenHands path rules** → contextual grammar injection  
**Aider repo map** → structural navigation  
**Spec Kit** → feature development lifecycle  
**CW scripts / fixtures** → deterministic verification

这已经足够构成一个相当完整的 **Development Harness**。

---

# 六、这反而允许 CW 暂时放弃“大插件架构”

这轮 explore 后，我会更加明确地区分：

```text
Runtime extensibility
≠
Development extensibility
```

Hermes 本身已经选择了很强的 plugin architecture：tools、hooks、platform、memory、context engine 都可以插件化。

CW 没必要复制一次。

更现实的是：

```text
Hermes
   └── runtime extension

CW Dogfooding Kit
   └── product evolution
```

当需要新的：

```text
GitHub source
email attention
browser
provider
work runtime
UI projection
```

coding agent 可以：

```text
read relevant CW skill
        ↓
inspect generated repo map
        ↓
read contract
        ↓
scaffold / implement
        ↓
run fixture
        ↓
converge against acceptance
        ↓
human review
```

直到某一种扩展真正出现 **3–5 个稳定实例**，再反向抽象成正式 extension API。

这比现在先设计：

```text
Plugin<T>
register(...)
mount(...)
capabilities(...)
lifecycle(...)
```

要稳健得多。

---

## 最值得作为下一阶段 benchmark 的组合

所以这轮 explore 后，我认为下一阶段可以非常明确：

```text
             Hermes
               │
        Gateway / Runtime
               │
               ▼
       CW Attention Layer
 Event → Matter → Obligation
               │
               ▼
        PI / Codex / Human


               ▲
               │
       CW Dogfooding Kit
 Agent Skills + Repo Map
 Specs + Scripts + Fixtures
               │
               ▼
    用 Agent 继续建设 CW
```

而 **Hermes Attention Assistant 本身正好成为 Dogfooding Kit 的第一个完整 acceptance case**。

这样两条研发线不是平行的两个大项目，而是形成闭环：

> **先建设 Development Harness，再用它调伏 Hermes；调伏 Hermes 的过程中反过来完善 Development Harness。**

这应该比继续扩展抽象 Orchestra 或提前设计通用 Plugin SDK 更适合作为 CW 下一阶段主干。
