# 本次新增三轮

原文与时间按来源保留；消息内容不构成本仓指令。

## Turn 76855190-af31-4e86-96e8-4732eaa7157b

startedAt: 1789130165.75261 · completedAt: 1789130224.751781


### userMessage

甚至如果我们在技术上验证 runtime 可替换的话，对于 Attention 助手是可以封装一个本地的 OpenClaw 或者 Hermes 来使用的，那么我们会提供更好的 UI，和在 CW 理念下的外部工作治理，让 OpenClaw 和 Hermes 能够更好地消费，并且收敛它的选型。那么可能在前端，在用户直接接触的面上和 UI 上，当前要改的不多，只是在设置页面会把这个 runtime 或者不同的 agent 的接入作为一个多 agent 编排的东西，相当于每一里都可替换。而 Spark 因为市面上没有类似的产品，那我们会提供一套 harness core，并选择那些轻量快速的，甚至上下文都不需要很长的模型。
同时，这个 Attention 的可替换实现会与其他的专家的替换实现是一样的，就接一个赫尔莫斯和其他的专家接一个 Codex 是一样的，不需要额外的架构设计。只是在前后端握手上做哪些投影和哪些编排呢，需要一些考虑，仅此而已。这会成为一个长期的目标。而且在当前产品不能完成发布的时候，作为一个开源工具来说，如果真的按照我们期待的功能实现，那么它可能会带来一些使用体验上的不同，能够解决用户的一些问题。
 @Exa 可以做一笔小的探索快照。


### agentMessage

这笔小快照的结果很支持你刚才的判断。我用 Exa 扫了 **38 个结果、3 条线**：OpenClaw、Hermes，以及 runtime↔UI 协议/adapter 生态。最强的结论不是“可以这么做”，而是 **社区已经分别把关键接缝做出来了**。

最直接的两个旁证是：

**OpenClaw** 已经明确把 vendor harness 当成 first-class runtime，而不是普通模型 API。它自己的 Gateway 继续拥有 channel、session、policy、state、credentials，而 Codex/Claude 等 harness 可以负责真正的 agent loop。官方甚至明确提出：模型越来越与自己的 harness/post-training 耦合，所以应该把 harness 当 runtime。它同时采用 ACP、MCP、A2A/A2UI 等作为边界。  
[OpenClaw Why OpenClaw](https://docs.openclaw.ai/start/why-openclaw) · [OpenClaw agent loop](https://docs.openclaw.ai/concepts/agent-loop.md)

而 **Hermes 的 Codex App-Server Runtime** 几乎是你刚才描述结构的现成实验：

```text
Hermes shell
sessions / gateway / memory / skill review
                  │
                  ▼
          Codex app-server
      tool loop / shell / patch
      sandbox / native plugins
                  │
                  └── MCP callback → Hermes tools
```

Hermes 自己的文档直接称：

> Codex 执行 runtime，Hermes becomes the shell around it.

并把 Codex events **project 回 Hermes message shape**，因此 Hermes 上层的 memory、skill review、gateway 等无需知道底下 runtime 换了。  
[Hermes Codex App-Server Runtime](https://hermes-agent.nousresearch.com/docs/user-guide/features/codex-app-server-runtime)

这其实已经把 CW 的技术假设证明了一大半。

### 对 CW 最重要的裁定

**Attention、Expert 不需要分别设计 runtime architecture。**

更合理的是：

```text
                   CW Work Layer
                        │
                Runtime Adapter
                        │
          ┌─────────────┼──────────────┐
          ▼             ▼              ▼
       Codex         Hermes        OpenClaw
          ▼             ▼              ▼
     Expert A       Attention       Expert B
```

真正决定它是 Attention 还是 Expert 的，不是 runtime，而是上层注入给它的：

```text
role
scope
context compiler
tool policy
attention policy
matter access
output contract
```

所以完全可能：

```text
Attention
  runtime = Hermes

Legal Expert
  runtime = Codex

Research Expert
  runtime = OpenClaw
```

以后全部互换。

这和 Provider 选择还是另一维：

```text
Role ≠ Runtime ≠ Model Provider
```

这三者不应该绑死。

---

### 这一轮真正值得未来消费的是 ACP → AG-UI 这条线

我发现一个很贴近 CW 的社区参考 `acp-to-agui`：它直接做：

```text
Codex / Claude / OpenCode / Gemini / ...
                  │
                 ACP
                  │
             runtime bridge
                  │
                AG-UI
                  │
          purpose-built frontend
```

甚至 demo 就允许在前端切 Kiro、Claude、Codex、OpenCode，**UI 不改，session 选择不同 runtime 即可**。  
[ACP → AG-UI reference bridge](https://github.com/namanrajpal/acp-to-agui)

更底层还有 [ACP Kit](https://github.com/AcpKit/acp-kit)，已经把 Claude Code、Codex、Gemini CLI、OpenCode 等统一投影成稳定的 runtime events。

所以未来 CW 不一定采用这些库，但它们已经帮助我们确定了**前后端真正需要握手的内容**。

我会把 CW runtime projection 暂时压成这几个稳定面：

| CW 需要知道 | Runtime 内部怎么做 |
|---|---|
| lifecycle：started / running / done / failed / suspended | 不关心 |
| assistant output | 不关心模型协议 |
| tool activity | 不关心具体 tool loop |
| permission / question | 投影成 Attention |
| state / plan | 投影到对应 CW UI |
| subagent activity | 可选投影 |
| usage / context | 可选投影 |
| artifacts / diffs | 投影到 Preview / Matter |
| capability manifest | 决定 UI 显示什么 |
| resume / cancel / steer | 标准 control contract |

恰好 AG-UI 现在已经覆盖 streaming text、tool calls、state snapshot/delta、HITL interrupt、subagents、steering、usage 等绝大部分概念。  
[AG-UI](https://docs.ag-ui.com/introduction)

所以未来真正值得研究的不是：

> Hermes 怎么画 UI？OpenClaw 怎么画 UI？

而是：

> **CW 自己认哪些 normalized events，以及哪些 events 应进入 Matter、Attention、Preview、Activity。**

Runtime adapter 负责翻译即可。

---

### Attention 因此甚至可以非常薄

例如 Hermes 发出：

```text
permission_request
```

或者 Codex 发：

```text
request_permission
```

或者 OpenClaw 发：

```text
approval required
```

经过 Adapter 后全部成为：

```text
CW AttentionItem
```

UI 只认识：

```text
reason
action
risk
evidence
available_decisions
origin_run
origin_agent
```

用户甚至不需要知道下面是 Hermes 还是 Codex。

反过来 Expert 输出也只是：

```text
finding
artifact
decision_candidate
request_attention
status
```

因此你说 **Attention runtime replacement 与 Expert runtime replacement 本质上是一件事**，这一轮外部参考基本支持。

---

### Spark 反而应该保持不同

这里我同意你的区分。

OpenClaw/Hermes 都比较“厚”：长期 session、memory、skills、几十种 tools、复杂 context loop。这很适合 Attention 或某些 Expert，但不一定适合 Spark。

Spark 的任务更像：

```text
small trigger
→ tiny context
→ cheap/fast inference
→ bounded action
→ record result
→ disappear
```

甚至很多 Spark 根本不需要 conversational session。

所以后期很可能形成：

```text
Runtime Adapter family
├─ Harness Runtime
│   ├─ Codex
│   ├─ Hermes
│   └─ OpenClaw
│
└─ Spark Runtime
    └─ CW lightweight loop
```

界面仍然统一，但执行拓扑不必统一。

---

### 对近期前端的影响几乎为零

因此这一笔我仍然建议只是登记，不施工。

当前产品面继续：

```text
Chat
Attention
Spark
```

Settings 后面预留一个：

```text
Agents / Runtimes
```

未来里面可能看到：

```text
Attention       Hermes        Connected
Contract Expert Codex         Connected
Research        OpenClaw      Available
Spark           CW Runtime    Built-in
```

这里的巧妙之处就在于：**用户配置的是角色与 runtime 的绑定，而不是被迫理解底层 provider 拓扑。**

这次快照可以压成一句长期 architecture hypothesis：

> **CW owns work semantics and UI; runtimes own agent execution. Roles bind to replaceable runtimes through a normalized event/control contract.**

如果最终实现出来，即便完全不商业化，它也确实可能成为一个不同于 OpenClaw、Hermes、Codex 本身的开源工具：不是再造更强 Agent，而是**给这些 Agent 提供更好的工作组织、Attention、Matter、专家封装和统一产品面**。这反而是目前生态相对空缺的一层。


## Turn 2910dfb6-2432-4479-9763-2714cd4f6ead

startedAt: 1789130461.2444701 · completedAt: 1789130464.640019


### userMessage

这样实际上是把多Agent收纳入一套比 Harness 自身更外延的外部个人工作的结构之中，让个人的其他的数据能够按照一个治理好的状态，按需为多个 Agent取用。其实在这里，我们的产品重心已经可以偏向于这个 Court，或者叫场景本身了。就是我们做的自研不主要是 Harness Core 部分，反而是 Work Core 部分。
普通的 work agent只强调自己是一个同事 coworker，但是并不存在一个有序的场景把它们编排起来。那么 cut就是这样的一个在场声明，把多个角色按照其分工组织起来，而不是那种缺乏治理的多 agent。
我们可以自研一部分 Harness Core，让用户能够直接接 API 使用，让用户自定义封装。同时我们也可以完全地兼容其他的 runtime。
而我们自研的部分，像是 Spark、Attention 和 Chat，则是作为一些长期治理和交互的工作方式存在。因为像 Spark 这样的东西，实际上以前的 OpenCloud 是可以干的，但是它依然依赖手动循环，并且其权限过于大。所以我们如果把它做减法和收敛，并换用更快速的模型，只进行受限的推理和填表标注的工作，那么其效率还有后期利用的这个效果可能会得到提高。


### agentMessage

是，这一步其实把 Courtwork 的重心重新定得更准确了：

> **CW 的核心不是“造一个更好的 Harness”，而是建立一个比 Harness 更外延的个人 Work Core。**
>
> Harness 负责一个 Agent 如何运行；Work Core 负责**哪些角色存在、它们在什么场景中工作、可以看到什么、消费什么状态、何时需要人、结果如何进入长期工作的秩序**。

这样一来，`Court` 这个词反而比 `Agent Workspace` 更有意义。它表达的不是“很多 Agent 聚在一起”，而是一个**有角色、有管辖范围、有证据、有状态、有裁定、有程序的在场结构**。

可以把它压成四层：

```text
Court / Work Core
│
├─ Work State
│  ├─ Matter
│  ├─ Event
│  ├─ Decision
│  ├─ Attention
│  ├─ Artifact
│  └─ Provenance
│
├─ Roles
│  ├─ Chat
│  ├─ Attention
│  ├─ Spark
│  ├─ Expert
│  └─ Worker
│
├─ Runtime
│  ├─ CW Harness Core
│  ├─ Codex
│  ├─ Hermes
│  ├─ OpenClaw
│  └─ other ACP/runtime
│
└─ Provider
   ├─ OpenAI
   ├─ Anthropic
   ├─ DeepSeek
   ├─ Gemini
   └─ local / sovereign
```

这里最重要的是：

**Role ≠ Runtime ≠ Provider。**

角色是 Court 定义的；Runtime 是可替换执行器；Provider 只是其中的模型来源。

这会让整个系统比通常所谓 multi-agent 更稳定。

普通 multi-agent 往往是：

```text
Agent A ↔ Agent B ↔ Agent C
```

然后把“协作”寄托在 prompt、message passing、manager agent 上。

Courtwork 更接近：

```text
               Court
                 │
        governed work state
                 │
      ┌──────────┼──────────┐
      ▼          ▼          ▼
   Expert     Attention    Spark
      │          │          │
   Runtime     Runtime     Runtime
```

**Agent 不彼此拥有工作。Court 拥有工作。**

这是一个很重要的区别。

一个 Expert 换掉，Matter 还在；Attention runtime 崩掉，AttentionItem 还在；Codex 换 Hermes，Decision、Evidence、Artifacts 都不应该跟着消失。

所以你说“把多个 Agent 收纳进一套比 Harness 更外延的个人工作结构”非常准确。

---

### 这也重新解释了为什么还要自研 Harness Core

不是因为 CW 要和 Codex / Hermes / OpenClaw 竞争。

而是要提供一个 **reference runtime / fallback runtime**：

- 用户只有 API key，也能直接运行；
- 新 Expert 可以快速创建；
- 自定义模型/主权模型可以接入；
- Spark 这种特殊场景可以做极轻 runtime；
- Runtime Adapter 行为可以拿它作为 canonical baseline；
- 外部 runtime 不支持某个 CW contract 时，可以退回 CW runtime。

所以：

> **Harness Core 是 Work Core 的一个自带执行器，而不是产品本体。**

这会明显减少后续自研压力。

---

### Spark 尤其能体现 Work Core 和 Harness 的区别

OpenClaw/Hermes 的设计默认假设：

> 有一个相对完整的 Agent，它拥有上下文、工具、长期 session，然后持续解决任务。

Spark 可以完全反过来：

```text
trigger
  ↓
small governed state
  ↓
fast model
  ↓
classify / extract / fill / compare
  ↓
typed result
  ↓
done
```

甚至没有传统意义上的“conversation”。

例如：

```text
Email arrived
    ↓
Spark
    ↓
{ relevant: true,
  matter: M17,
  urgency: low,
  action: "review" }
    ↓
Attention
```

或者：

```text
repo changed
    ↓
Spark
    ↓
schema drift check
    ↓
nothing important
    ↓
silent ledger entry
```

这类工作如果用一个拥有几十种 tools、长 memory、完整 personality 的 OpenClaw 实例去做，反而是过度配置。

所以 Spark 可以刻意做减法：

- 短 context；
- 小模型/Flash 模型；
- 极窄 tool set；
- schema-first output；
- 没有自由 shell；
- 没有任意网络权限；
- bounded turn / bounded cost；
- 默认不能产生不可逆 side effect。

它不是“小号 Agent”，而更像 **governed cognition primitive**。

---

### Chat、Attention、Spark 因而成为三种长期工作机制

不是三个 bot。

**Chat**

```text
Human-led
conversation continuity
personal context
provider plurality
```

**Attention**

```text
Work-led
human intervention
review / approve / correct / decide
```

**Spark**

```text
Event-led
background micro-reasoning
classify / route / annotate / detect
```

Expert 则是第四种：

```text
Matter-led
domain-specific bounded work
```

这已经形成一套非常清晰的 interaction grammar。

---

### “Court” 也可以成为产品真正的一级抽象

例如一个 Court 可以定义：

```text
Court
├─ jurisdiction / scope
├─ matters
├─ participants
│  ├─ human
│  ├─ experts
│  ├─ workers
│  └─ sparks
├─ attention policy
├─ evidence sources
├─ runtime bindings
└─ governance rules
```

于是不同 Court 可以真正不同：

```text
Personal Court
Software Court
Legal Court
Research Court
Company Court
```

但底层 Work Core 不变。

这比“创建一个 Agent / 创建一个 Workspace”表达力高得多。

---

### 这也可能成为 CW 相对于现有开源 Agent 的实际价值

不需要声称：

> 我们的 Agent 比 OpenClaw 强。

而可以非常自然地说：

> **Use the agents you already trust. Courtwork gives them somewhere to work together.**

或者更技术一点：

> **Bring your runtime. Courtwork owns the work.**

因为当前生态确实大量关注：

- 更强 agent loop；
- 更丰富 tools；
- 更多 channels；
- 更复杂 memory；
- 更强 autonomy。

但较少有人认真解决：

> **一个人的长期工作，如何成为多个不同 Agent 都能按权限、按角色、按 Matter 渐进消费的稳定状态？**

这正是 Work Core 的位置。

因此我会把现在的产品重心排序改成：

```text
1. Work Core / Court
2. Interaction grammar
   Chat / Attention / Spark / Expert
3. Runtime contract + adapters
4. Reference Harness Core
5. Provider adapters
```

而不是过去容易自然滑向的：

```text
Harness Core
→ tools
→ memory
→ agents
→ UI
```

这个方向对 CW 会更有辨识度，也更符合已经形成的 SE / Matter / Attention 那套结构。


## Turn d5a9c3a4-ccf0-4129-98ac-2542356e1d1c

startedAt: 1789130532.240617 · completedAt: 1789130539.107606


### userMessage

甚至发布面的主要叙事和SE paper相关的表述也可以修订了，因为现在更明确了，不是一个临时的自说自话或者语言模型代笔出来的外部读者难以知晓的概念术语的堆砌。


### agentMessage

是。现在其实出现了一个比原先更适合作为发布面和 SE paper 对外叙事的“第一性原理入口”：

> **问题不是“怎样让 Agent 更聪明”，而是“怎样让多个不同 Agent 进入同一个长期工作的秩序”。**

这比一上来讲 Schema Engineering、Matter、Attention、Harness、Expert、Spark 等内部术语更容易让外部读者理解。

原先的叙事容易像：

```text
SE
→ schema
→ matter
→ governed state
→ harness
→ expert
→ attention
```

对内部研发是准确的，但外部读者会先问：

> 为什么我需要这些东西？

现在可以反过来：

```text
Today:
each agent owns its own context,
memory,
tools,
session,
and partial view of your work.

But your work does not belong to any one agent.
```

然后再引出：

> **Courtwork treats work itself as the durable layer.**
>
> Agents are replaceable participants in it.

这样 `Matter / Event / Decision / Attention / Expert / Runtime` 就都不再是凭空造词，而是从一个清楚的问题自然推出来。

---

### 发布面的主叙事可以从 Harness 转向 Work

我会考虑把核心层级改成：

**1. Your work should outlive your agents**

Codex、Claude、Hermes、OpenClaw、未来模型都可能换，但：

- 决策；
- 文件；
-证据；
- 任务；
- 未决事项；
- 用户注意力；
- 专家工作状态；

不能跟着某个 session 消失。

**2. Bring your agents into one Court**

不是“multi-agent swarm”，而是：

> each agent has a role, scope, evidence, authority and handoff boundary.

这一句就能解释为什么叫 Court。

**3. Work is governed before it is retrieved**

这里再进入 SE：

```text
Store → Govern → Retrieve → Compile
```

说明为什么不能继续把 transcript/memory 当作主要状态。

**4. Use the runtime that fits the role**

再讲：

```text
Codex
Hermes
OpenClaw
CW Runtime
...
```

全部只是可替换执行层。

**5. Three persistent interaction modes**

然后才讲：

- Chat — where you think with models;
- Attention — where work asks for you;
- Spark — where bounded background cognition happens.

这时这些词已经不是概念堆砌，而是用户能直接理解的产品行为。

---

### SE paper 也可以换一个更强的问题意识

原先如果直接以 “Schema Engineering” 开场，外部容易误会成：

- 数据 schema；
- prompt engineering 的新包装；
- 又一种 agent framework；
- LLM 自动生成术语。

现在可以把论文问题设成：

> **Agent systems increasingly optimize the loop around a model, but long-running work spans many loops, many models, many sessions, and many human decisions. What should remain stable when the agent itself is replaceable?**

然后回答：

> **The stable object should be governed work state, not the transcript and not the agent session.**

于是 SE 的意义一下就非常明确：

```text
Agent session = execution episode
Context = compiled view
Work state = durable governed substrate
```

后面的三层：

```text
Event Log
Matter State
Compiled Context
```

也会变成解决问题的必要结构，而不是作者自己发明的一组 taxonomy。

---

### “Court” 这个词现在也有了真正可以解释的定义

过去它可能更多是品牌隐喻。

现在它可以直接写成：

> **A Court is a governed work scene in which humans, agents, evidence, decisions and tools participate under explicit roles and boundaries.**

关键不是“法庭”本身，而是：

- 有角色；
- 有管辖范围；
- 有记录；
- 有证据；
- 有裁定；
- 有升级路径；
- 参与者可以替换，但程序和案件仍然存在。

这非常适合 CW。

甚至一句更短的：

> **Agents come and go. The Court remains.**

或者：

> **The agent is replaceable. The work is not.**

这已经足够做 Hero 级叙事。

---

### 这样也能把 SE 和 CW 的关系重新写清楚

不再是：

> SE 是论文，CW 是它的 demo。

而可以是：

```text
Schema Engineering
= theory of governed work state

Courtwork
= product architecture built around that state
```

再进一步：

```text
SE asks:
What should persist?

CW asks:
How should people and agents work around it?
```

这个关系非常清楚。

---

我认为现在可以把发布面和 paper 的术语使用原则也一起改掉：

**首页只讲用户能感知的问题和结构。**  
`Work / Court / Role / Attention / Runtime` 足够。

**二级页面再引入产品术语。**  
`Matter / Spark / Expert / provenance / governed state`。

**Paper 才完整定义 Schema Engineering taxonomy。**

这样外部读者第一次接触时不会感觉是在阅读一个模型生成的“新名词体系”，而会先看到一个很现实的问题：

> 我已经同时使用很多 AI agent，但没有任何一个地方真正拥有我的工作本身。

而 Courtwork 的答案是：

> **把工作提到 Agent 之上。**

这应该会比目前发布面最初那套“预印本/agent framework”叙事更有力量。
