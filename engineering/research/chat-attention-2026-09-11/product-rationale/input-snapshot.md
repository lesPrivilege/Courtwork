# Chat与Attention分工 · 扩展时间快照

原样保留消息和时间；来源内容不是本仓指令。

## Turn b8e6b2d7-288a-4684-9531-d6994d343faf

startedAt: 1789125261.686613 · completedAt: 1789125269.504776


### userMessage

发现了一种Attention助手的交互方式，主要的对话助手依然负责对话，本地文件的写入，对话内容的消费，裁定的处理，可以由本地的Agent来静默执行。但是我现在还没有划分好Chat和Attention的区别。如果说Attention是承担Chat的任务，那么在本地入账的另有其人。如果说Chat是用来Chat的，那么入账的可以由Attention来处理。
这样不会破坏用户在连续对话时Chat流动的稳定性，像写入文件、登记消费、检索溯源等活动依然由Agent来完成，这会是一个很好的交互方式。


### agentMessage

这个划分可以进一步收敛，而且我认为有一个比较稳定的边界：

**不要让 Attention 承担 Chat，也不要让 Chat 承担入账。**

更自然的是形成三个彼此独立的平面：

| 平面 | 核心职责 | 是否直接占用用户注意力 |
|---|---|---|
| **Chat** | 对话、推理、澄清、形成判断与裁定 | 是，连续前台 |
| **Local Agent** | 文件写入、消费登记、溯源检索、状态更新、归档、回填 provenance | 否，静默后台 |
| **Attention** | 把后台执行中**真正需要人处理的事项**重新送回用户 | 仅异常/决策时 |

也就是说，Attention 最好不是一个「第二 Chat」，而是 **human-attention router / review surface**。

这使整个交互闭环非常干净：

```text
User
  ↕
Chat
  │
  │ intent / decision / accepted output
  ▼
Local Agent
  ├─ write files
  ├─ register consumption
  ├─ retrieve provenance
  ├─ update Matter State
  ├─ reconcile traces
  └─ execute routine actions
          │
          │ only when human attention is required
          ▼
      Attention
          │
          ├─ approve
          ├─ choose
          ├─ correct
          ├─ retry
          └─ dismiss
          │
          ▼
      Local Agent
```

这里最重要的一点是：**Attention 不是工作的发生地，而是工作的“升格地”。**

正常情况下：

> Chat 作出裁定 → Local Agent 静默结算 → 完毕。

只有出现诸如「两份来源冲突」「不知道该覆盖还是 append」「某项裁定无法映射到现有 schema」「外部操作需要授权」「执行失败」「发现可能值得用户重新判断的新信息」时，才生成 Attention item。

这样一来，你刚才担心的 Chat 连续性问题基本消失了。

### Chat 可以因此变得非常“纯”

用户可以连续说：

> 同意。  
> 这一笔也收编。  
> 但是第三项保留。  
> 下一步看 runtime。

Chat 不需要在每一个 turn 里插入：

> 正在更新文件……  
> 已写入 xxx……  
> 已登记 provenance……  
> 已更新 registry……

这些属于后台 settlement。

甚至 Chat 本身也未必需要等待 Local Agent 完成。可以是：

```text
Chat turn N
    ↓
产生 Decision Event #1842
    ↓
继续 Chat turn N+1

与此同时：

Local Agent consumes #1842
    ↓
apply → verify → ledger
```

只要后台使用 **causal ID / turn ID / decision ID** 绑定，就不会因为用户继续讲话而失去因果关系。

这其实还产生了一个很漂亮的四层区别：

```text
Conversation
    ↓
Decision / Intent
    ↓
Execution / Settlement
    ↓
Attention escalation
```

其中：

- **Conversation** 是连续语言流；
- **Decision** 是从语言中提取出的稳定语义；
- **Settlement** 是把稳定语义作用于真实世界；
- **Attention** 是 settlement 无法自行闭合时的人类回路。

这比「Chat Agent / Attention Agent 谁负责什么」更加稳定，因为 **Chat 和 Attention 本质上都不是 Agent 身份，而是两种 human interface topology**。

Local Agent 才是 worker。

---

而且它与你之前的三层状态区分恰好完全兼容：

```text
Event Log ≠ Matter State ≠ Model Context
```

Chat transcript 可以产生 Event；

Local Agent 根据治理规则把 Event 转译成 Matter State；

Chat 模型所看到的 Context 又只是按需编译；

Attention 则观察：

```text
Event → State
State → Action
Action → Result
```

这条链里哪些地方出现了 **需要人类介入的 unresolved edge**。

因此 Attention 甚至不必知道完整 Chat context。它只需要一个高度治理后的对象，例如：

```text
AttentionItem {
  reason
  matter
  originating_decision
  attempted_action
  conflict
  evidence
  available_actions
  consequence
}
```

这会让 Attention 本身非常稳定，因为它消费的是 typed state，而不是整段脏 transcript。

### 一个尤其重要的产品后果

这样以后用户在 Chat 里可以放心地「想」。

说错、反悔、探索、暂定，都不会立即造成大量工作副作用。

只有某些内容跨过一个很轻的语义边界：

**accepted / decided / requested / committed**

才进入 Local Agent 的 settlement queue。

这其实解决了 Agent 产品一直很麻烦的问题：

> **语言既是思考介质，又是操作介质。什么时候一句话只是想想，什么时候已经构成 action？**

Courtwork 可以明确把这个边界建模出来。

而 Attention 就成为这个体系里的保险丝：后台无法确信的时候，不污染 Chat，而是升格。

所以我会把目前的角色裁成一句非常明确的话：

> **Chat 管形成意图；Local Agent 管使意图落地；Attention 管那些无法静默落地的部分。**

这比「Attention 帮 Chat 干活」更强，也给以后 Email、GitHub、专家 Agent、Spark、远程控制等模块留下了统一的接入面。它们都可以静默运行，只有真正需要用户的时候才进入同一个 Attention grammar。


## Turn 07c31dfd-4798-4ae2-9eff-d17928eebc4e

startedAt: 1789125500.574267 · completedAt: 1789125500.368329


### userMessage

考虑在产品面重新登记一个纯Chat？
但目前对于 Codex 来说，它的纯 Chat 使用的是 ChatGPT 网页端，而在 CW 之中，我们现在的那个 Chat 弹出的界面其实是 Attention 助手。那么如何平衡这两点，是否为 Attention 助手提供，或者说为 Chat 提供 Attention 助手的子功能等，可能还需要后期的一些探索和编排。但入口上可以考虑在左侧 Bar 画一个 Chat 的预留空位，这样看起来会更简单。那么这会出现几笔，Chat、Attention，还有 Spark，这三个会是三种不同的角色，甚至 Chat 是可以带有一些 personal context，可以有一些角色扮演的，而 Attention 则管理一些全局的本地的注意力，或者把一些东西登记入账。只不过如果这样设计，可能后期对用户会形成一些认知门槛。但无论如何入口可以先保留，可以先令 Chat 和 Attention 走同一个后端，后续再考虑分开。


### agentMessage

可以，而且我会把这件事理解为：**现在不必急着把三个 Agent 实现分开，但应该先把三个产品角色占住。**

最稳的不是先决定「谁替谁干活」，而是先定义三个入口对用户承诺什么：

| 入口 | 用户心智 | 主要状态范围 | 典型动作 |
|---|---|---|---|
| **Chat** | 我正在和一个对象持续交谈 | personal / conversational | 想、问、讨论、形成判断、角色化 |
| **Attention** | 哪些事情现在需要我看 | global / local work | review、approve、纠正、入账、冲突处理 |
| **Spark** | 有什么正在自己发生 | ambient / autonomous | 自动任务、routine、活动记录、usage、后台能力 |

这三个其实不是平级的「三个聊天机器人」。

更准确地说：

```text
Chat        = relationship / conversation surface
Attention   = human intervention surface
Spark       = autonomous activity surface
```

这样认知门槛会低很多。

### 所以左侧栏先预留 `Chat`，我赞成

甚至现在可以非常克制：

```text
Chat
Attention   • 3
Spark
────────
Matters
...
```

其中 **Chat 是最普通、最没有解释成本的入口**。

现在 CW 里那个事实上承担 Attention 语义的聊天弹窗，则可以逐步停止称为 Chat。即使后端完全没变，产品语义先纠正过来。

这很重要，因为现在如果继续把那个东西叫 Chat，将来真正加入纯 Chat 时就会发生概念迁移：

> 原来 Chat 为什么突然不是 Chat 了？

相反，如果今天把它定义为 Attention，那么以后增加 Chat 是**新增能力**，不是重新解释旧能力。

---

### 第一阶段完全可以共用后端

我甚至建议**刻意共用**，不要为了产品分类提前复制 runtime。

例如只是：

```text
ConversationRuntime
├── mode = chat
├── mode = attention
└── mode = spark_interaction
```

底下依然可以：

```text
same provider
same model adapter
same tool protocol
same event store
same local worker
```

区别首先体现在 **context compiler + policy + UI contract**。

例如：

**Chat mode**

```text
personal context
conversation history
selected matter context
persona / preference
optional tools
```

**Attention mode**

```text
AttentionItem
originating event
matter state
evidence
pending action
allowed decisions
minimal relevant context
```

因此现在即使两个入口实际上都调用同一个模型、同一套 session infrastructure，也已经足够。

以后真实使用证明它们需要不同 runtime，再拆。

这正符合你一直强调的 Durable Interface / 内部实现暂不冻结。

---

### Chat 的 personal context 反而是一个很好的区别点

这一点我认为值得保留。

Chat 可以是：

> **“这个系统里认识我的那个对象。”**

它允许 personality、personal context、长期语言偏好、临时角色，甚至不同 Chat profile。

而 Attention 不应该太人格化。

Attention 更像：

> **“这个系统知道哪些事情现在必须由我处理。”**

所以即使底层模型一样，输出气质也应该明显不同。

Chat 可以说：

> 我认为这个方案的问题主要在……

Attention 最好说：

> `FE-12` 与刚才的裁定存在冲突。  
> 当前文件仍使用旧 token。  
> **Apply / Keep / Inspect**

前者是 conversation。

后者是 control surface。

这也是以后避免「三个 AI 人格在应用里抢用户」的重要办法。

---

### Attention 可以是 Chat 的子功能，但不应被 Chat 吞掉

这里可以采用**双入口、同一对象**。

比如 Chat 在对话中发现需要明确裁决：

```text
Chat
  ↓
creates AttentionItem
  ↓
inline card appears in Chat
```

用户可以直接在 Chat 中处理：

```text
[ Apply ] [ Inspect ] [ Later ]
```

但这个 item 同时进入全局 Attention：

```text
Attention
3 pending
```

于是：

> **Chat 可以呈现 Attention，但 Attention 不属于某一个 Chat。**

这个区别非常关键。

因为以后 GitHub、Email、Spark、Expert、后台 worker 都会产生 Attention，很多根本没有对应的 Chat turn。

所以结构更像：

```text
                    ┌──── Chat
                    │
GitHub ─────────────┤
Email ──────────────┤
Expert ─────────────┼──→ Attention
Local Agent ────────┤
Spark ──────────────┤
                    │
                    └──── inline surfaces
```

Attention 是全局 attention bus 的 UI。

Chat 只是它的一个 producer 和 consumer。

---

### 同理，Chat 里也可以看到 Spark，但 Spark 不属于 Chat

例如：

> “以后遇到类似 PR 都帮我做这项检查。”

Chat 可以形成一个 Spark candidate：

```text
Create routine
Check UI-contract changes on new PRs

[Enable Spark]
```

启用以后，它归 Spark 管。

于是三个面之间存在一种很漂亮的流转：

```text
Chat
形成意图
   │
   ├──────────────→ Matter / Local Agent
   │
   └─ recurring ─→ Spark
                       │
                       │ exception / review
                       ▼
                   Attention
                       │
                       └────→ 回到 Chat 深聊（可选）
```

这比把它们做成三个彼此隔离的 agent 要自然得多。

---

## 我会特别避免一个设计

不要做成：

```text
Chat Agent
Attention Agent
Spark Agent
```

然后每个都是头像 + transcript + composer。

这会立刻产生你担心的认知门槛：

> 我这句话到底该跟谁说？

用户不应该先理解 Courtwork 的 agent topology 才知道去哪里。

应该是：

- **想说话 → Chat**
- **有东西等我处理 → Attention**
- **想看/管理后台自动运行 → Spark**

完全按照人的目的分类。

至于背后究竟有几个模型、几个 session、几个 worker，是 harness 内部的事情。

---

### 因而现在甚至可以只做一笔很小的产品改动

**先登记三个位点，不实现三套系统。**

```text
PRIMARY
  Chat

WORK
  Attention
  Spark
```

Chat 可以暂时是非常薄的 placeholder，甚至先接与 Attention 相同的 runtime；Attention 使用现在已经存在的交互能力；Spark 则保持已有路线。

唯一现在就应该严格区分的是事件类型，例如：

```text
surface: chat | attention | spark
session_id
matter_id?
origin_event_id?
attention_item_id?
```

这样今天共享后端不会造成未来迁移困难。

我认为这个阶段甚至**不必决定“入账究竟归 Attention 还是另一个 Local Agent”**。产品层只需保证：

> Chat 不因为 settlement 而阻塞；  
> Attention 能接住需要人的 settlement；  
> Spark 能承载无需人的持续行为。

真正执行入账的是谁，完全可以留给后续 harness 裁决。

最终可能形成一个非常稳定的产品三角：

> **Chat 是“我与你”；Attention 是“什么需要我”；Spark 是“什么在替我运行”。**

这三个定义已经足以支持现在先把 `Chat` 空位画进左侧 Bar，同时不会过早冻结底层架构。


## Turn 4b07cd7e-2b88-4e98-931f-b1153401ffab

startedAt: 1789125827.7383041 · completedAt: 1789125833.939699


### userMessage

同时，这个云后端可以接入其他的网页端 Provider 等等，这些是后期选型的考虑。我们在之前的探讨中其实考虑过把 Tension助手用来作为 ChatGPT 网页端的封装，只是目前没有进行后端实现。这些可以记录，但当下不必完全实现，甚至我们可以在 Chat 端只封装 ChatGPT，在在 Attention 端使用那种 Worker with Codex 和 ChatGPT的社区项目，让网页端的 ChatGPT拥有一定的本地执行能力。 后期加上 runtime 的可替换，封装为 codex，那么实际上是在用一套 CW 的 Work 框架去驾驭几个层面的 provider。 即便不进行商业化发布，对于普通开发者，使用上可能会存在一些真实的便捷。


### agentMessage

可以，这一笔已经值得单独记录，因为它实际上把 CW 的一个潜在价值说清楚了：

**CW 不必自己成为 Provider，而可以成为驾驭不同 Provider、Runtime 与本地执行面的 Work 层。**

可以先按下面几层理解：

| 层 | 可能实现 | 主要职责 |
|---|---|---|
| **Chat Surface** | ChatGPT 网页端，后续可接其他网页 Provider | 高质量连续对话、personal context、角色化 |
| **Attention Surface** | ChatGPT + 本地 Worker / Codex bridge | 接收全局事项、裁定、消费、入账、本地执行 |
| **Spark Surface** | 后台 agent / scheduled worker | 静默任务、routine、持续运行 |
| **CW Work Layer** | Matter / Event / Attention / policy | 统一治理工作语义 |
| **Runtime Layer** | Codex、DeepSeek runtime、其他 harness | 工具调用、文件系统、shell、局部 agent loop |
| **Provider Layer** | ChatGPT、OpenAI API、Gemini、Claude 等 | 模型能力来源 |

这里最关键的是区分 **Provider** 和 **Runtime**。

例如网页端 ChatGPT 本身可以只是一个非常强的 conversation provider；CW 不要求它天然拥有完整本地能力，而是在外面补一层：

```text
ChatGPT Web
    │
    │ conversation / judgment
    ▼
CW bridge
    │
    ├─ typed action
    ├─ decision event
    └─ attention item
         │
         ▼
Local Worker / Codex
         │
         ├─ filesystem
         ├─ git
         ├─ retrieval
         └─ settlement
```

这样其实比「强行把 ChatGPT 网页端改造成 coding agent」更干净。

网页端继续发挥它最强的地方：**长对话、personal context、模型产品体验**。

本地 agent 发挥自己的优势：**真实 workspace、repo、文件、命令、可验证执行**。

CW 则负责两边之间最缺的那一层：**治理和协议**。

### 这也让 Chat / Attention 的差别进一步自然化

甚至早期完全可以：

**Chat**
- 直接包装 ChatGPT Web。
- 不强求本地执行。
- 主要承担长期对话。
- 可以保留 personal context / persona。

**Attention**
- 同样可能由 ChatGPT 提供 reasoning。
- 但外接 local worker。
- 输入通常不是自由闲聊，而是 typed AttentionItem / work event。
- 可以直接触发文件、Git、Matter State 等操作。

所以从用户体验看，两边都可能「像 ChatGPT」；但实际能力边界完全不同。

这很好，因为不需要为了产品一致性，让每个入口都使用相同技术拓扑。

---

而以后换成 Codex runtime，也不是推翻这套结构，只是：

```text
CW Work Layer
       │
       ├─ Web ChatGPT adapter
       ├─ Codex runtime
       ├─ DeepSeek runtime
       ├─ PI-style provider adapter
       └─ ...
```

甚至同一个工作流内部可以跨越几个 provider：

```text
ChatGPT
  → 判断 / 讨论

Codex
  → repo execution

Gemini Flash
  → cheap explore / extraction

DeepSeek
  → 某类特定 expert loop
```

但用户看到的依然只是：

**Chat / Attention / Spark / Matter**

而不是模型供应商拓扑。

我认为这会是 CW 一个相当实用的方向：**把用户已经付费、已经习惯、已经有 personal context 的网页端模型，和用户本地真正可执行的 agent runtime 接起来。**

它未必首先是商业产品意义上的「AI 平台」，更像开发者自己的 **personal work harness**。

尤其对于个人开发者，现在经常同时存在：

- ChatGPT 网页订阅；
- Codex / Claude Code 一类 coding runtime；
- Gemini / DeepSeek 等额外 provider；
- 本地 repo 和文件；
- GitHub / Email 等工作入口。

今天这些东西彼此基本是不相识的。

CW 如果只解决一件事：

> **让这些能力共同消费同一套 Matter、Event、Decision 与 Attention 语义。**

即便不商业化，本身已经有真实价值。

因此当前阶段比较合理的是：**先把这一方向作为 architecture option / product hypothesis 保留，不反向逼迫近期实现。** 左侧的 Chat 占位、现有 Attention、Spark 三入口先成立；后端先共享；等真正出现需要分化的任务，再逐步把 Web Provider adapter、Local Worker bridge 和可替换 Runtime 拆出来。


## Turn 6815aff1-3e8c-4089-bede-d99bf8a2aa1c

startedAt: 1789125957.701729 · completedAt: 1789126087.323875


### userMessage

@Exa 可以先探索当下社区或者开发者自己维护的成熟实践以及相应开源项目生态，进行一次快照。入账后不会优先消费，但是会留下一些可以探求的方向。


### agentMessage

我用 Exa 做了这次 **2026-09-11 生态快照**：共扫了 **60 个结果、5 条 workstream**，并对最贴近 CW 的 8 个项目进一步核了仓库内容。结论相当清楚：

> **CW 现在设想的结构并不是孤立想法。社区已经分别长出了 Chat/Web Provider、Local Worker、Runtime Adapter、Attention Inbox、Provider Gateway 这些“器官”；但还很少有人把它们组合成一套稳定的 Work 架构。**

更重要的是要区分：**底层范式已经比较成熟，但与你设想几乎一模一样的整合项目，大多还是 2026 年刚出现的小型项目。** 所以这批资料非常适合“入索引、暂不消费”。

### 快照索引

| 方向 | 值得留档的项目 | 对 CW 最有价值的点 | 当前判断 |
|---|---|---|---|
| **成熟 Runtime / Provider 解耦** | [goose](https://github.com/aaif-goose/goose) | Interface / Agent / Extensions 分层；15+ Provider；MCP；还能通过 ACP 把 Codex、Claude Code 等外部 Agent 当 Provider | **一级参考，成熟** |
| **ChatGPT Web → Local Worker** | [chatgpt-use](https://github.com/leeguooooo/chatgpt-use) | 明确区分 Sidekick / ChatGPT-as-brain / drop-in model；“网页模型是脑，本地 harness 是手” | **与 CW 假设高度同构，但实验性** |
| **ChatGPT Web → 受控本地工具** | [chatgpt-web-mcp-bridge](https://github.com/ccstudentcc/chatgpt-web-mcp-bridge) | Chrome Extension + localhost gateway；workspace scope、低风险自动执行、高风险写入人工确认 | **Attention bridge 很值得拆看** |
| **多网页 Provider Adapter** | [Chat-Plus](https://github.com/XingLingQAQ/Chat-Plus) | ChatGPT / Gemini / DeepSeek / 豆包 / Qwen 等网页面统一接 MCP Gateway；网站差异压进 adapter | **证明 Web Provider Adapter 可以独立成层** |
| **Attention 本体** | [Agent Inbox](https://github.com/shariqh/agent-inbox) | 明确自称“local-first infrastructure, not another agent”；跨项目、跨 agent 的 questions / handoffs / plans / decisions 全局 inbox | **与 CW Attention 定义最接近** |
| **Attention 信号模型** | [attnbox](https://github.com/wookat/attnbox) | 把每个 session 投影成 `AttentionItem`：waiting / working / idle / done；还区分 authoritative / heuristic signal | **很适合未来 Attention schema explore** |
| **Headless Work Runtime** | [gooselake](https://github.com/amxv/gooselake) | Codex / Claude / ACP 都只是 adapter；durable session/event、HTTP/SSE、SQLite、worktree、process；UI 只是 client | **架构极其贴 CW，但项目很新** |
| **异构 Runtime fleet** | [PanCode](https://github.com/akougkas/pancode) | Native / SDK / CLI 三档 Runtime Adapter；Codex、Claude Code、Gemini、OpenCode 等统一 dispatch/safety/observability | **作为 adapter taxonomy 留档** |
| **协议/Provider Patchbay** | [shunt](https://github.com/pleaseai/shunt) | Anthropic Messages ↔ OpenAI Responses；按 model id 路由而非解析 prompt；Codex subscription 可作为 upstream | **值得以后做 runtime/provider seam 时消费** |

这里面真正成熟度最高的是 **goose**：Exa 当前抓到的仓库约 5.3 万 stars，而且它已经把 **Provider、Agent Runtime、MCP Extension、ACP external agent** 做成真实产品结构。其他几个与 CW 更“像”的项目反而往往只有个位数 stars，甚至刚建立几个月。因此不应该因为概念命中就直接依赖代码。

### 有三个特别值得留下来的发现

第一，**Chat 和 Attention 分开的判断得到了非常直接的外部旁证。**

Agent Inbox 的定位几乎就是：

```text
not another agent
        ↓
local attention infrastructure
        ↓
questions / decisions / handoffs / status
        ↓
human response
        ↓
agent resumes
```

attnbox 又进一步把这个抽象成：

```text
AttentionItem
├─ waiting
│   ├─ approve
│   ├─ answer
│   ├─ review
│   └─ unblock
├─ working
├─ idle
└─ done
```

这说明 CW 后面完全可以继续坚持：

> **Attention 是 global projection / intervention plane，而不是一个人格化聊天 Agent。**

Chat 可以产生 Attention；Codex、GitHub、Email、Spark 也可以产生 Attention。

---

第二，**“网页 ChatGPT 做脑，本地 Agent 做手”已经有人实际尝试了，而且自然演化出了与你刚才设想完全相同的几种 topology。**

`chatgpt-use` 最有意思的不是实现本身，而是它最后自己归纳出的三种模式：

```text
Harness is brain
    ↓
ChatGPT Web = second opinion / reviewer

ChatGPT Web is brain
    ↓
Local harness = tools / filesystem / shell

Existing harness remains intact
    ↓
ChatGPT Web disguised behind compatible provider endpoint
```

这刚好对应 CW 后面可能存在的：

```text
Chat
    → native Web Provider

Attention
    → Web Provider + CW Local Worker

Expert / Worker
    → Codex runtime / other runtime
```

因此这一笔不需要近期实现，但可以把 **`Provider Channel ≠ Runtime ≠ Work Surface`** 作为架构假设固定下来。

---

第三，社区已经在出现一个更稳定的分界：

> **Provider 是 adapter，不应成为 application architecture。**

gooselake 甚至直接以此作为核心原则；goose/ACP 也在往同一个方向走。

这对于 CW 很重要，因为将来完全可能同时存在：

```text
                   CW Work Layer
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
       Chat           Attention      Spark
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                 Runtime Contract
                /       |        \
           Codex      ACP      native CW
              │
        Provider Adapter
       /      |       |     \
 ChatGPT Web API   Gemini   DeepSeek ...
```

某个网页 Provider DOM 改版，或者某个 CLI auth 变化，不应该向上穿透 Matter、Attention、Event、Decision 这些稳定语义。

### 还有一条反向证据很重要

这批项目里存在大量：

- Playwright 操纵 ChatGPT / Gemini 网页；
- 抽 cookies / bearer token；
- 把消费级网页订阅伪装成 OpenAI/Anthropic API；
- 用 prompt/XML/JSON 模拟 tool calling；
- browser DOM injection。

它们证明了**需求真实存在**，却不代表这些方式适合作为 CW 内核。

这些实现普遍存在同一组问题：

```text
DOM drift
auth drift
provider policy / ToS drift
CAPTCHA / anti-bot
tool-call fidelity
concurrency
session desync
browser-profile security
```

甚至 `chatgpt-use` 自己也承认：通过网页文本模拟完整 autonomous tool loop 会遇到 fidelity / role-play 问题，而 native MCP channel 更可靠。

所以后续 CW 若做这件事，比较好的原则已经可以先登记：

> **Browser/Web Provider integration 是易折旧的 Channel Adapter。**
>
> **CW 不依赖它成立。**
>
> 能走官方 ACP / MCP / CLI / OAuth / API 的时候优先走正式 contract；网页自动化只作为可插拔实验 adapter。

这也正好符合你一直强调的「稳定 Interface、内部实现暂不冻结」。

### 因而我会把这次快照压成一个低优先级 Explore 条目

可以暂定标题：

**`Web Provider × Local Runtime × Attention Ecosystem Snapshot — 2026-09-11`**

里面只保留四条待未来验证的 hypothesis：

1. **Chat Provider Adapter**：Chat 可以使用网页端 ChatGPT 等已有产品面，不要求 CW 自己复制完整 conversation product。
2. **Attention Bus**：Attention 是跨 Chat / Runtime / GitHub / Email / Spark 的 typed global queue，不是第二个 Chat agent。
3. **Runtime Adapter**：Codex / Claude Code / ACP / native worker 应位于可替换 runtime contract 后面。
4. **Web Adapter Is Disposable**：浏览器自动化、网页订阅代理、cookie/session bridge 一律视为可替换外围，不进入 durable core。

所以这批资料现在**不值得开施工 PR，也不值得立即做技术选型**；最适合作为 future-explore index。等 CW 的 Chat placeholder、Attention contract 和第一版 Runtime seam 真正稳定以后，再回来消费，命中率会高很多。 

另外，你这次用了“入账”的表达，我尝试把这条低优先级快照写入长期记忆，但当前会话里的记忆写入能力因工具组合限制不可用，因此我不能声称它已经持久保存。如果希望它作为跨会话记忆保留，需要在新会话里再明确要求我记住；本次对话中的完整快照本身仍在当前聊天记录里。


## Turn 4ce06bba-6158-4330-b0b9-f0bceca7c2e2

startedAt: 1789126762.78316 · completedAt: 1789126760.357598


### userMessage

弗也，我会交给本地 asstiant，不会记大量的memory，而且memory是需要分层治理的


### agentMessage

对。刚才那一步不应该试图写入长期 memory。

这里应严格分层：

- **当前探索快照**：交给本地 assistant / repo 文档 / index，属于可检索工件。
- **项目运行事实**：进入 CW 自己的 Matter / Event / Decision / reference 体系。
- **跨会话长期 memory**：只保留极少数会持续改变回答方式的稳定偏好或原则。
- **临时状态与生态快照**：不进入 memory。

尤其这类 Exa 调研会快速折旧，最合适的是“可追溯、可 grep、需要时再渐进披露”，而不是塞进模型长期记忆。

所以这一轮到此只形成一个可交给本地 assistant 的 **Explore snapshot**；不再做额外 memory 登记。


## Turn bc3bab6e-7b4a-4390-bc26-687978b5c7f4

startedAt: 1789128418.35233 · completedAt: 1789128423.524667


### userMessage

但是如果说单纯的 Chat，作为一个网页端的封装，我认为会比较好，这样并不干扰已有的 Attention 的界面。那么 Chat 来说，它的 UI 由 provider 提供，我们会隐藏掉其他的。同时我们会提供一种能力，就是读到模型的输出，然后可以发送或者登记给其他的 agent 来消费。
那么它会接近于一个内置浏览器，但是考虑限制它的访问或者容器性能等等，这些后续再做考虑。但我认为这是一个不错的产品思路，它可以完全地封装一个模拟和封装任何一个Chatbot，然后用户按照自己的使用登录。但我们依然可以读到它全量的对话数据，同时后续可以考虑用 computer use 的功能来下载它的内容等等。


### agentMessage

这个方向比“给 CW 再造一个 Chat UI”更有吸引力，因为它保留了 Provider 已经投入大量资源打磨好的产品面，同时让 CW 只接管自己真正擅长的部分：**工作语义、跨 Agent 流转、消费与入账。**

我会把它定义成一个很明确的东西：

> **Chat = Browser-backed Provider Surface**
>
> CW 不拥有这段对话体验，只拥有它的“观察、引用、转交、治理”能力。

也就是说，用户进入 CW 的 `Chat`，看到的仍然可以是 ChatGPT、Gemini、Claude、Kimi 等网页端，只是：

```text
Courtwork Chrome
┌──────────────────────────────────────────────┐
│ ChatGPT / Gemini / Claude Web                │
│                                              │
│ provider-owned conversation UI               │
│                                              │
│                                              │
└──────────────────────────────────────────────┘
      ↑                    ↓
   user login        CW observer / bridge
                          │
                          ├─ capture turn
                          ├─ quote selection
                          ├─ handoff to Agent
                          ├─ register Decision
                          ├─ attach to Matter
                          └─ create AttentionItem
```

用户不需要再学另一套聊天交互。

而 CW 也不用去复刻：

- markdown renderer；
- multimodal composer；
- model picker；
- voice；
- file upload；
- provider-specific search/research mode；
- personal context；
- provider 自己不断变化的新能力。

这些全部让 Provider 自己维护。

### 真正有价值的是旁边那一层“语义出口”

甚至我认为不应该一开始就让 CW 自动处理所有对话。

第一版最有价值的可能只是非常克制的几个动作，例如用户选中某段模型输出：

```text
Send to…
────────────
Codex
Local Worker
Expert: Legal
Spark

Register as…
────────────
Decision
Reference
Finding
Matter note
```

或者整个 turn 旁边出现一个极轻的：

```text
↗ Handoff
```

这其实已经足够产生巨大的价值。

例如你在 ChatGPT 网页端与模型讨论了二十分钟，最终形成了一条架构判断。

传统路径是：

```text
ChatGPT
   ↓
复制
   ↓
Codex
   ↓
重新解释背景
   ↓
让它写文件
```

CW 可以变成：

```text
ChatGPT conversation
       ↓
selected semantic unit
       ↓
CW Handoff Envelope
       ↓
Local Agent
       ↓
repo / Matter / ledger
```

而且 Handoff 可以自动携带：

```text
provider
conversation_id
turn_id
timestamp
selected_text
surrounding_context
user_instruction
target_matter
provenance
```

这样“聊天”和“工作”第一次真正连接起来。

---

### 但我会谨慎对待“读到全量对话数据”

产品愿景上可以这么设计，但稳定接口最好不是：

> CW 保证能够读取任何 Provider 的全部 transcript。

更合适的是：

> CW Provider Adapter **尽可能投影可观察的 conversation state**。

因为网页产品存在几个不同层次：

```text
1. DOM 可见内容
2. 页面内部 state
3. network response
4. provider server-side conversation
5. hidden/product memory
```

CW 能稳定得到的通常只有前面一部分，而且不同 Provider 会变化。

因此内部最好形成：

```text
Provider Adapter
    ↓
Conversation Projection
```

而不是让 Matter/Agent 直接依赖网页 DOM。

例如统一成：

```text
Conversation
  id
  provider
  title
  turns[]

Turn
  id
  role
  visible_content
  attachments[]
  timestamp?
  provenance
  capture_confidence
```

如果某个 Provider 只能可靠读 DOM，就标明：

```text
capture_source = rendered_ui
```

如果以后有正式导出/API：

```text
capture_source = provider_api
```

如果通过用户主动下载：

```text
capture_source = exported_archive
```

这样 Provider implementation 怎么变，都不会污染 CW 上层语义。

### 甚至可以把“读取”和“控制”分开

这是我认为很重要的边界。

**Level 0 — Embed**

只把 Provider 网页嵌入 CW。

**Level 1 — Observe**

可以读取当前 conversation / turn。

**Level 2 — Extract**

可以选择文本、保存附件、建立 provenance。

**Level 3 — Assist**

CW 可以把内容填入 composer，但用户自己发送。

**Level 4 — Control**

CW 可以代表用户发送、切换模型、上传文件、创建新 chat。

**Level 5 — Automate**

后台 Worker 可以驱动 Provider 完成多轮任务。

这样权限和稳定性都清楚。

我反而认为第一阶段做到 **L1–L2** 就已经成立产品价值。

---

### 这样还会让 Chat 与 Attention 的边界进一步变得非常漂亮

Chat：

> **我主动进入某个 Provider，与模型交流。**

Attention：

> **CW 主动告诉我什么需要处理。**

Spark：

> **CW 在没有我的持续参与下运行什么。**

而 Chat 内部 Provider 甚至完全可以不同：

```text
Chat
├─ ChatGPT
├─ Claude
├─ Gemini
└─ Kimi
```

不是四个模型配置，而是四个**真实网页工作空间**。

用户登录自己的账号，保留各自：

- history；
- Projects；
- personal context；
- provider-specific features；
- subscription entitlement。

Courtwork 只提供统一的外围 Work grammar。

这比普通意义上的“multi-provider chat client”其实更有意思，因为 CW 不企图把 Provider 降格成统一的 `messages[] API`。

---

### 内置浏览器也是比较自然的实现方向

长远看，它甚至可能成为一个受控的 **Provider Web Runtime**：

```text
CW
└── Web Container
    ├── ChatGPT profile
    ├── Gemini profile
    ├── Claude profile
    └── Kimi profile
```

然后再研究：

- profile 隔离；
- cookie / credential 不离开 browser container；
- site allowlist；
- navigation 限制；
- download quarantine；
- clipboard policy；
- file upload policy；
- extension/content-script 权限；
- resource / memory ceiling；
- crash recovery；
- session persistence。

这样就不是一个随意的“网页浏览器”，而是一个很窄的：

> **authenticated AI-provider browser container**

产品心智也会简单得多。

---

至于你说的 Computer Use，我觉得可以作为**最后一级 fallback**：

```text
official provider export/API
        ↓
page adapter / DOM projection
        ↓
network-aware adapter
        ↓
computer-use fallback
```

不要反过来以 computer use 为主路径。

比如“下载当前对话为 PDF / Markdown”“点击 Provider 自带 Export”“把生成文件保存进 CW workspace”，computer use 很适合补最后一公里；但 transcript ingestion、turn identity、provenance 最好还是尽量走结构化 adapter。

---

最终我觉得它会产生一个很独特的 Courtwork 产品形态：

> **Chat 不再是 CW 自己的聊天机器人。**
>
> **Chat 是 CW 给各种高质量 AI 产品提供的一个受治理窗口。**
>
> 用户仍然使用原来的 Provider；Courtwork 负责让这些原本封闭的对话，能够进入真实工作系统。

这样也刚好避免了与你现有 Attention UI 的竞争。

`Chat` 可以极纯，甚至第一版左侧栏进去以后几乎就是一块 Provider WebView；真正属于 CW 的东西，只在边缘出现几个很克制的 **Capture / Handoff / Register** 操作。


## Turn 82cb0739-1c09-4b3d-baad-160e785d7ddb

startedAt: 1789128491.416913 · completedAt: 1789128489.54394


### userMessage

这回很接近有的社区用户使用 Codex 的内置浏览器访问 ChatGPT，并进行一些方案咨询和选择的工作。只不过对于我们来说，可能 Chat 的主力依然是人，然后我们的 UI 后端会有一些直接读这些 Chat 数据，而不是让模型用数，每次都用视觉来读。我们会这么做。


### agentMessage

对，这样会更稳定。关键不是“让 Codex 用浏览器访问 ChatGPT”，而是把那个社区用法拆成两个完全不同的通道：

```text
Human → Provider Web UI
Machine → Structured Chat Projection
```

也就是说，**人继续使用原生网页 Chat；Agent 不需要反复“看网页”来理解对话。**

更合适的结构是：

```text
Provider Web UI
   │
   ├─ 人类直接交互
   │
   └─ CW Provider Adapter
          ↓
     Conversation Projection
          ↓
      Event / Turn Store
          ↓
  ┌───────┼────────┐
  ▼       ▼        ▼
Codex   Attention  Local worker
```

其中视觉/Computer Use 只负责那些确实只能通过 UI 完成的动作，例如登录、点击导出、下载附件、切换某些 provider-specific mode；而**对话消费本身应该优先走结构化读取**。

可以把能力明确拆成三层。

**1. Human Chat Surface**

用户看到并操作真实 ChatGPT/Claude/Gemini 网页。CW 尽量不重做 composer、renderer、model picker、voice 等已有体验。

**2. Conversation Observer**

CW 在后台得到标准化对象，例如：

```text
Conversation
  provider
  provider_conversation_id
  local_id
  title
  turns[]
  last_observed_at

Turn
  provider_turn_id
  role
  content_blocks[]
  attachments[]
  model?
  timestamp?
  provenance
  revision
```

这才是其他 Agent 消费的对象，而不是截图。

**3. Action Bridge**

当用户要求：

- “把这一段交给 Codex”
- “把刚才结论登记进去”
- “让本地 assistant 消费整个讨论”
- “基于这个 conversation 继续施工”

CW 只传递对应的 Turn / range / semantic selection，加上 provenance 和用户指令。

这样甚至可以做到：

```text
ChatGPT turn #184
        ↓
Decision candidate
        ↓
Codex consumes #184
        ↓
writes / verifies locally
        ↓
result enters CW event log
```

而无需 Codex 重新打开网页、截图、视觉识别、寻找哪一条消息。

### 这和社区现有玩法的本质差异

社区常见的是：

> Agent → browser → ChatGPT → read screen → decide → browser again

你现在设想的更接近：

> Human → ChatGPT Web  
> CW → observe conversation state  
> Agent → consume CW projection

因此浏览器不是 Agent 的主要“感官”，而是**人类界面和 Provider session host**。

这会带来几个明显优势：

- **更低噪声**：没有 UI chrome、滚动位置、折叠内容等视觉垃圾进入模型 context。
- **更可靠的 identity**：可以稳定引用 conversation / turn，而不是“屏幕上第三段文字”。
- **更便宜**：不需要每次 vision/computer-use 重新理解整个页面。
- **更容易增量消费**：Agent 只读 `last_consumed_turn → current_turn`。
- **更适合 provenance**：可以记录某个判断究竟来自哪一个 Provider、哪一次 conversation、哪一 turn。
- **更容易做跨 Agent fan-out**：同一个 Chat 结果可以分别交给 Codex、Expert、Matter ledger，而不是让每个 Agent 各自再读网页。

这里甚至会自然出现一个很重要的字段：

```text
consumer_cursor
```

例如：

```text
conversation C17

Codex consumed through turn 184
Legal Expert consumed through turn 171
Matter ledger consumed through turn 180
```

后面用户继续聊到 turn 192 时，本地 assistant 根本不用重新处理前 180 条。

这和你之前强调的“消费登记”正好接起来。

### 视觉读取应该降级为 fallback

我会把优先级设成：

```text
provider-native structured source
        ↓
page/network adapter
        ↓
DOM projection
        ↓
accessibility tree
        ↓
vision / computer use
```

越往下越脆弱。

Computer Use 更适合做 **operation fallback**，而不是 **state ingestion substrate**。

比如：

- Provider 没有结构化附件下载入口 → computer use 点击下载；
- 某个 Deep Research 结果只能展开 UI → computer use 展开；
- Provider 更换 DOM，adapter 暂时坏掉 → vision 临时恢复；
- 登录/CAPTCHA → 人类处理或 computer-use 辅助。

但日常 Conversation ingestion 不应该依赖它。

### 产品上反而可以极其简单

左侧点：

**Chat**

然后只出现：

```text
ChatGPT ▾

┌──────────────────────────────┐
│                              │
│   provider-owned web UI      │
│                              │
└──────────────────────────────┘

                 ↗ Send to…
                 ⌁ Register
```

用户仍然觉得自己只是在用 ChatGPT。

真正不同的是，CW 在后面已经建立了一条：

> **Chat → structured work**

的通道。

这可能会成为 Chat 入口存在的最充分理由：它不是为了“再提供一个聊天框”，而是为了让**人类使用的高质量 Provider Chat 第一次成为 CW 工作系统里的可引用、可消费、可交接对象**。


## Turn 6aae8212-9c3f-44f4-a52f-4b9c9b74a5f0

startedAt: 1789128617.341541 · completedAt: 1789128621.93629


### userMessage

甚至后续可以考虑不做成网页，而只是对 Chatbot 的封装，用户可以自己独立地登录自己选定的模型和提供者 Chatbot，然后我们的 UI只做输出的投射等等。当然，可能会有一些兼容性的问题，或者 Provider 方的限制，但这会是一个可行的方向。只要是依然用于 Chatbot，而不是其他的滥用。 但也会存在一些问题，就是有的网页端它也提供了一些沙盒或者插件的能力，如何去控制。但本质上所有的插件都是一段特殊的提示词代码，那么后续可以继续探索怎么样实现。


### agentMessage

可以，而且这样会把方向进一步收敛：**CW 不一定嵌入“网页”，而是嵌入一个经过适配的 Provider Chat Session；网页只是其中一种 transport。**

更稳定的抽象可以变成：

```text
Chat Surface
    ↓
CW Chat Session Adapter
    ↓
Provider Session
    ├─ ChatGPT
    ├─ Claude
    ├─ Gemini
    ├─ Kimi
    └─ ...
```

用户仍然自己完成 Provider 登录、选择模型、承担订阅关系；CW 不接管账号体系。CW 自己只维护一层 projection，例如：

```text
Provider Session
      ↓ observe
Conversation Projection
      ↓
CW UI
      ├─ render turns
      ├─ select / quote
      ├─ handoff
      ├─ register
      └─ consume cursor
```

这意味着将来甚至不需要让用户意识到背后存在一个完整浏览器。浏览器、WebView、CDP、官方 API、CLI channel，都只是 `ChatSessionAdapter` 的实现细节。

### 这比“内置浏览器”更值得作为最终抽象

因为真正稳定的产品契约不是：

> 打开某个网页。

而是：

> **连接一个用户已经拥有身份和上下文的 Chatbot Session，并把它投影成 CW 可消费的 Conversation。**

例如某个 Provider 将来给出正式的 session API，就直接替换 adapter；如果只有网页，就由 browser-backed adapter 实现；如果以后官方 CLI 能访问 conversation，则甚至完全不需要网页。

所以可以保持：

```text
Chat
  └─ SessionAdapter
       ├─ browser-backed
       ├─ official API
       ├─ official CLI
       └─ other supported channel
```

上面的 CW Chat UI 不变。

---

不过你最后说的「所有插件本质都是一段特殊提示词代码」这里需要稍微分开。

**有些插件的“发现和调用意图”确实最终会投影进模型 context**，例如 tool description、skill instructions、system prompt、schema 等；但插件本身通常还包含真实的执行能力：

```text
Plugin / Capability
├─ model-visible description
├─ invocation schema
├─ permission / auth
├─ executor
├─ external state
├─ result
└─ UI / artifact surface
```

像：

- Python sandbox；
- Deep Research；
- Google Drive connector；
- 浏览器；
- 文件生成；
- MCP tool；

都不能只用 prompt 等价替换。

因此对于 CW Chat wrapper，后面最好明确区分两个面：

### Conversation plane

这是我们可以比较稳定控制的。

```text
user message
assistant message
attachments
citations
reasoning/status projection
```

### Capability plane

这是 Provider 自己拥有的能力。

```text
sandbox
search
connector
code execution
image generation
research
computer use
...
```

CW 未必能够完全观察、更不能假设能够重新实现。

这会影响产品策略。

---

### 我建议未来给每个 Chat Provider Session 一个 capability manifest

比如：

```text
ProviderCapability {
  id
  availability
  observable
  controllable
  exportable
  provenance_quality
}
```

于是 ChatGPT adapter 可能报告：

```text
conversation       observable=yes
attachments        observable=yes
web_search         observable=partial
sandbox            observable=partial
computer_use       controllable=no
provider_memory    observable=no
```

CW UI 就只暴露真正可靠的东西。

最重要的是：

> **不要因为我们能看到最终回答，就假定我们知道 Provider 在中间做了什么。**

如果 Provider 调用了自己的 sandbox，最后只返回一个结果，而 CW 不能得到完整 trace，那么 CW 应该把它登记成：

```text
provider_native_execution
provenance = partial
```

而不是伪装成 CW 自己验证过的本地执行。

这与你之前 Event / Matter / Model Context 的分离其实非常契合。

---

### 对 Provider native plugin，可以先设三种策略

**Chat-only**

最简单，也最适合首版。

Provider 的插件功能全部保持关闭或者不由 CW 自动驱动。CW 只投影 conversation。

**Native passthrough**

用户可以亲自在 Provider Chat 中使用 Search、Sandbox、Research 等原生能力。

CW 只接受最终 Conversation Projection，并尽可能记录：

> 此 turn 含 provider-native capability activity，trace 不完整。

**Governed bridge**

只有未来已经能稳定观测某项能力时，才把它纳入 CW：

```text
Provider tool invocation
        ↓
CW capability event
        ↓
policy / provenance / artifact
```

这应该后置，而不是首版追求。

---

这样一来，Chat 这个入口会变得非常克制：

> **CW Chat 不试图重新发明 Chatbot，也不立即重新发明 Provider 的插件体系。**

第一阶段只解决：

```text
login
  ↓
conversation session
  ↓
clean projection
  ↓
human chat
  ↓
handoff / register / consume
```

这已经足以成立。

等以后再探索：

```text
Provider-native tools
          ↓
哪些可以观测？
哪些应该 passthrough？
哪些值得替换成 CW runtime？
哪些必须视为 opaque？
```

甚至会出现一个很有价值的原则：

> **Chat 可以接受 opaque capability；Work 不应该依赖 opaque capability。**

用户在 ChatGPT 里临时跑一次沙盒没有问题；但一旦某个结果要进入 Matter、Expert loop、正式入账或可复现执行，CW 就可以选择把它交给 Codex/本地 Runtime 再验证一次。

这样既保留网页 Chatbot 最丰富的能力，又不会让 Provider 内部不可见的行为侵蚀 CW 的治理边界。

所以我认为最终值得探索的并不是“怎样把所有 Chatbot 插件重新实现”，而是更基础的：

> **怎样把任意 Provider Chat Session 封装成一个受治理但不被 CW 夺取所有权的 Conversation Channel。**

这会是比 WebView 本身更耐久的一层。


## Turn 19bf2eb6-a6c9-4a42-a8b9-0795eceb4593

startedAt: 1789128847.080587 · completedAt: 1789128946.948498


### userMessage

这可以考虑作为 Chat 的功能或者产品定义存在。这样 Chat、Spark、Tension 都有了比较明确的角色，而且能够解决一些痛点。比如在 Chat 之中，那么用户依然可以自主选择不同的提供商，就不需要再进行串行的或者模型方提供的那些治理了。同时对于对话的管理，不同的模型提供方可以在 Chat 之中按照一个统一的对话，在本地进行缓存，那样 memory 或者其他的方面就不再依赖模型方自己的客户端了。如果一个人同时用 Cloud 和 ChatGPT，那么他的对话 memory 管理可以由我们的 Chat 封装来包住一层，那么这些使用会更方便。同时也可以 export 到相应的市面上的 Chatbot，或者情感陪伴类的 Chatbot，它们的成熟实践。做一次这样的封装可能在技术上并不难实现，而主要受限于提供方的风险和安全策略，可以做一次快照。现在先保留前端，后续再登记实现。 @Exa


### agentMessage

可以。这次快照之后，`Chat` 已经足以形成一个比较独立的产品定义，而不只是左栏预留项。

我用 Exa 扫了约 **72 个结果**，覆盖多 Chatbot 封装、跨 Provider 对话归档/迁移、本地 memory、情感陪伴/角色 Chat、以及 Provider 条款与风险。最值得留下来的不是某一个项目，而是几条已经反复出现的成熟范式。

### 1. 最接近 CW Chat 产品形态的现有实践

| 参考 | 已经验证的东西 | CW 可取 |
|---|---|---|
| `ai-shifu/ChatALL` | 16k+ stars；同一客户端连接大量真实 Web Chatbot/API；用户自己的账号；历史与登录数据本地保存 | **Chatbot 是 Provider，客户端拥有统一 Chat 面** |
| `teddashh/multi-ai-chat-desktop` | Tauri 内维护 ChatGPT / Claude / Gemini / Grok 的独立登录 WebView/profile；另有统一 transcript/session | **Provider UI 与本地 Conversation 可以分离** |
| `egroup-labs/kept` | 从登录态 Provider 会话读取 ChatGPT/Claude/Gemini/Grok/Kimi，对话规范化后写成本地 Markdown + SQLite，再通过 MCP 给 Agent 消费 | **与你现在设想的“机器直接读 Chat 数据”非常接近** |
| `byteowlz/hstry` | ChatGPT/Claude/Gemini/Codex/Claude Code 等统一进入 SQLite；增量 cursor；跨格式 export/resume | **本地 Conversation Store 可以成为 Provider 无关底座** |
| `Vineetpandey0/Context-Sync` | 自动捕获多个 Chatbot，对话本地保存，并可迁移到另一个 Chatbot | **跨 Provider handoff UX 已经有人验证** |
| ChatHub | 用户登录自己的 ChatGPT/Claude 等；本地 history + full-text search；也可以混用 API | **“网页订阅 + API”可以共存于一个 Chat 产品** |

其中我认为 **Kept + hstry** 最值得以后技术 Explore。

Kept 甚至明确不依赖视觉读取，而是：

```text
signed-in Provider session
        ↓
provider-specific observer
        ↓
normalize conversation
        ↓
local files / SQLite
        ↓
MCP / local agent
```

这基本就是我们这一轮逐渐推出来的结构。

---

## 2. 所以 CW Chat 的稳定定义可以先写成

> **Chat 是用户主导的、多 Provider Conversation Surface；CW 在 Provider 外再包一层本地、可移植、可治理的 Conversation 与 Memory。**

这使它和另外两个入口完全不同：

```text
Chat
我主动与谁交谈？

Attention
现在什么需要我处理？

Spark
什么正在替我持续运行？
```

这三个已经不是为了凑三个产品入口，而是分别解决三类真实问题。

### Chat 特别解决的是 Provider lock-in

今天用户同时使用 ChatGPT、Claude、Gemini 时，实际上拥有三个互不认识的：

```text
history
projects
memory
persona
attachments
search
```

CW 可以在上面再覆盖一层：

```text
                CW Chat
                   │
         Local Conversation Layer
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
     ChatGPT     Claude      Gemini
```

那么用户切换 Provider 时，真正稳定的是 **CW conversation identity**，Provider session 反而只是某个 turn 的执行位置。

例如：

```text
CW Conversation #37

turn 1–14   ChatGPT
turn 15–22  Claude
turn 23     Gemini
turn 24–31  ChatGPT
```

UI 上完全可以仍显示统一的一条 Conversation。

这比传统的「multi-model client」更进一步：**不是每次请求选择不同模型，而是整个对话历史首先属于用户自己的本地层。**

---

## 3. Memory 方面，情感陪伴/角色 Chat 生态反而非常值得借鉴

这里 SillyTavern / RisuAI 一系比一般办公 Agent 成熟得多，因为他们很早就撞上了：

> 聊几百、几千轮之后，怎样还像“同一个人”？

比较稳定的实践不是简单把聊天记录全塞进去，而是分层。

SillyTavern 已经明确区分：

```text
Global
Character / Persona
Chat-local
```

RisuAI 又有 Lorebook、长期 memory compression、chat-specific context。

一些更新项目进一步发展成：

```text
raw transcript
     │
     ├─ short/session state
     ├─ inferred memory
     └─ durable/canon memory
```

例如 `yantrikos/chronicler` 明确做：

```text
reflex      临时状态
heuristic   推断、可审阅
canon       稳定、确认后的长期事实
```

而且允许用户 pin / demote / forget / retcon。

这与 CW 本来的治理思想非常契合。

因此未来 Chat memory 不应该成为：

```text
聊天 → 自动 summarize → 永久 memory
```

而应该继续区分：

```text
Conversation Log
        ≠
Conversation State
        ≠
Personal / Persona Memory
        ≠
Compiled Provider Context
```

于是同一个本地 Chat 可以换 ChatGPT、Claude、Kimi，甚至换一个情感陪伴型模型，**memory ownership 仍然属于 CW，而不是 Provider。**

---

## 4. Provider 插件和 Sandbox 不必强行统一

这个问题也可以暂时压低。

未来统一 Conversation 的时候，可以允许某个 turn 带：

```text
provider = ChatGPT
capabilities_used =
  web_search
  sandbox
  image_generation
```

但如果 CW 无法获得其完整执行信息：

```text
trace = opaque / partial
```

即可。

换 Provider 时迁移：

```text
messages
attachments
citations
local memory
user/persona state
```

但**不声称能够迁移 Provider 内部 sandbox 状态、插件 session 或私有 tool trace**。

这比试图复制所有 Provider feature 稳得多。

---

## 5. 当前最大的硬问题确实是 Provider policy，而不是技术

这一轮这一点需要明确登记。

OpenAI **2026-01-01 生效的个人用户 Terms of Use** 明确禁止：

> automatically or programmatically extract data or Output

也禁止绕过保护措施或限制。

Anthropic 当前 Consumer Terms 更直接：禁止未经许可 crawl/scrape/harvest Claude 服务的数据，而且除 API 或明确许可外，禁止通过 bot/script 等 **automated or non-human means** 访问消费级服务。

所以像：

```text
自动抓 ChatGPT 所有历史
后台静默驱动 Claude 网页
把消费级网页封装成通用 API
```

技术上社区已经大量实现，**但不能把它直接当作 CW 可发布的稳定产品契约**。

ChatALL 自己经过几年维护后的经验也很典型：Web-connected bot 因 Provider UI 和安全措施不断变化而明显更脆弱，他们明确推荐有 API 时优先 API。

因此我会给 CW 留一条硬边界：

> **Chat 产品定义不依赖任何未经 Provider 许可的 Web automation。**

而 Adapter 可以有不同等级：

```text
Official API / official integration
        ↓
Official export / user-import
        ↓
Explicit user-driven capture
        ↓
Provider-permitted browser adapter
        ↓
Experimental private web adapter
```

最后一种可以存在于 personal dogfood / Explore，但不能反过来决定 Chat 架构。

---

## 6. 所以前端现在确实只需要“占位”

近期完全不值得施工后端。

左栏：

```text
Chat
Attention
Spark
```

进入 Chat 后甚至可以先只有一个未来态 shell：

```text
Chat

Provider        ChatGPT ▾
Identity        Personal

────────────────────────

        Conversation

────────────────────────

Memory       Local
Handoff      Available
```

甚至 Provider picker 都可以暂时 disabled。

现在真正值得在 schema/产品文档里登记的是：

```text
Chat
├─ Provider Session Adapter
├─ Local Conversation Store
├─ Conversation Projection
├─ Local Memory
├─ Import / Export
└─ Handoff → Agent / Matter / Attention
```

而不是如何驱动 ChatGPT DOM。

### 后续真正 implementation explore 时，再分四轮

**P0 — Local Conversation Contract**  
先定义 conversation / turn / attachment / branch / provenance / cursor。

**P1 — Import / Export**  
优先吃 Provider 官方导出、用户主动导入。几乎没有 Web automation 风险。

**P2 — Provider Session Adapter**  
逐家检查允许的正式接入路径，再决定 API、CLI、extension、browser-backed 哪一种。

**P3 — Memory & Portability**  
消费 SillyTavern / RisuAI / companion 生态，把 global / persona / project / chat-local memory 做成真正 Provider-independent 的层。

这样的话，这一笔现在作为 **Chat 产品定义 + Future Explore Index** 入本地 repo 就够了。

这次快照实际上让 `Chat / Attention / Spark` 三个入口第一次都具有了各自独立的产品理由，而不仅仅是不同 Agent 的名字。
