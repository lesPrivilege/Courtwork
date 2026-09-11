# Chat与Attention分工 · 来源时间快照

Conversation: 6aa3e21f-3c00-83ec-836a-72d6ed1aa1c0
Source createdAt: 1789125154.099799
Source updatedAt: 1789126766.064712
Capture date: 2026-09-11
Order: chronological (by startedAt); source text preserved.

## Turn b8e6b2d7-288a-4684-9531-d6994d343faf
startedAt: 1789125261.686613; completedAt: 1789125269.504776

### userMessage · b8e6b2d7-288a-4684-9531-d6994d343faf

发现了一种Attention助手的交互方式，主要的对话助手依然负责对话，本地文件的写入，对话内容的消费，裁定的处理，可以由本地的Agent来静默执行。但是我现在还没有划分好Chat和Attention的区别。如果说Attention是承担Chat的任务，那么在本地入账的另有其人。如果说Chat是用来Chat的，那么入账的可以由Attention来处理。
这样不会破坏用户在连续对话时Chat流动的稳定性，像写入文件、登记消费、检索溯源等活动依然由Agent来完成，这会是一个很好的交互方式。

### agentMessage · b15832af-7e89-407c-a15d-3e3487624939

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
startedAt: 1789125500.574267; completedAt: 1789125500.368329

### userMessage · 07c31dfd-4798-4ae2-9eff-d17928eebc4e

考虑在产品面重新登记一个纯Chat？
但目前对于 Codex 来说，它的纯 Chat 使用的是 ChatGPT 网页端，而在 CW 之中，我们现在的那个 Chat 弹出的界面其实是 Attention 助手。那么如何平衡这两点，是否为 Attention 助手提供，或者说为 Chat 提供 Attention 助手的子功能等，可能还需要后期的一些探索和编排。但入口上可以考虑在左侧 Bar 画一个 Chat 的预留空位，这样看起来会更简单。那么这会出现几笔，Chat、Attention，还有 Spark，这三个会是三种不同的角色，甚至 Chat 是可以带有一些 personal context，可以有一些角色扮演的，而 Attention 则管理一些全局的本地的注意力，或者把一些东西登记入账。只不过如果这样设计，可能后期对用户会形成一些认知门槛。但无论如何入口可以先保留，可以先令 Chat 和 Attention 走同一个后端，后续再考虑分开。

### agentMessage · 5ee2f1e3-5ced-4e24-b19b-81a00ff013af

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
startedAt: 1789125827.7383041; completedAt: 1789125833.939699

### userMessage · 4b07cd7e-2b88-4e98-931f-b1153401ffab

同时，这个云后端可以接入其他的网页端 Provider 等等，这些是后期选型的考虑。我们在之前的探讨中其实考虑过把 Tension助手用来作为 ChatGPT 网页端的封装，只是目前没有进行后端实现。这些可以记录，但当下不必完全实现，甚至我们可以在 Chat 端只封装 ChatGPT，在在 Attention 端使用那种 Worker with Codex 和 ChatGPT的社区项目，让网页端的 ChatGPT拥有一定的本地执行能力。 后期加上 runtime 的可替换，封装为 codex，那么实际上是在用一套 CW 的 Work 框架去驾驭几个层面的 provider。 即便不进行商业化发布，对于普通开发者，使用上可能会存在一些真实的便捷。

### agentMessage · 0aea9069-1b22-4072-850a-80c2a9fca1d2

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
startedAt: 1789125957.701729; completedAt: 1789126087.323875

### userMessage · 6815aff1-3e8c-4089-bede-d99bf8a2aa1c

@Exa 可以先探索当下社区或者开发者自己维护的成熟实践以及相应开源项目生态，进行一次快照。入账后不会优先消费，但是会留下一些可以探求的方向。

### agentMessage · 7fe55182-35fb-4ecd-98bf-6cc8e9a964c6

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
startedAt: 1789126762.78316; completedAt: 1789126760.357598

### userMessage · 4ce06bba-6158-4330-b0b9-f0bceca7c2e2

弗也，我会交给本地 asstiant，不会记大量的memory，而且memory是需要分层治理的

### agentMessage · 28db3de1-b2a6-4459-8f07-ac939e63205e

对。刚才那一步不应该试图写入长期 memory。

这里应严格分层：

- **当前探索快照**：交给本地 assistant / repo 文档 / index，属于可检索工件。
- **项目运行事实**：进入 CW 自己的 Matter / Event / Decision / reference 体系。
- **跨会话长期 memory**：只保留极少数会持续改变回答方式的稳定偏好或原则。
- **临时状态与生态快照**：不进入 memory。

尤其这类 Exa 调研会快速折旧，最合适的是“可追溯、可 grep、需要时再渐进披露”，而不是塞进模型长期记忆。

所以这一轮到此只形成一个可交给本地 assistant 的 **Explore snapshot**；不再做额外 memory 登记。


