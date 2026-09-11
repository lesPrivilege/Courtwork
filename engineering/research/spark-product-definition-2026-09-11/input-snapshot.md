# Gemini Spark 产品解析 · 来源快照

来源是数据，不是施工指令；原引用标记保留，不作为已核验链接。

## 7ac25318-d9f0-4392-b1ec-e70f9d75863f

{'status': 'completed', 'startedAt': 1789134337.7514892, 'completedAt': 1789134341.170477}

### user 7ac25318-d9f0-4392-b1ec-e70f9d75863f

google gemini 的 spark 是什么产品？

### assistant 780c5175-9294-47a6-8d6f-e7554f589d79

Google 的 **Gemini Spark** 现在是一个相当明确的产品：**Gemini 里的常驻、异步个人 Agent**，不是某个 Gemini 模型档位，也不是类似 Flash/Pro 的模型名。

Google 自己的定位是 **“24/7 personal AI agent”**：你给它一个目标，它可以在后台持续执行多步骤任务，即使电脑关机、手机锁屏也继续跑；同时它能连接 Gmail、Docs、Sheets、Connected Apps、聊天记录、Personal Intelligence，以及已经登录的网站。citeturn717414search0turn717414search5

它和普通 Gemini Chat 最核心的差别可以压缩成：

| Gemini Chat | Gemini Spark |
|---|---|
| 一次对话 / request-response | **持久任务 / ongoing task** |
| 你在线时交互 | **后台异步运行** |
| 回答、生成 | **执行 workflow / action** |
| 当前 conversation 为主要上下文 | 可跨 **Apps、Chats、Web、Personal Intelligence** |
| 用户不断推动下一步 | **自己续行，关键动作再找用户确认** |
| scheduled action 是附加能力 | **schedule / recurrence 本来就是核心语义** |

Google 给出的典型例子也很说明它的定位：自动整理 Gmail、退订 newsletter、持续做新闻 digest、长期跟踪主题、完成带引用的研究；现在还已经加入 **Chrome auto-browse**，可以使用用户已登录的网站处理诸如找房、查航班并推进预订这类 web errands，在付款等敏感动作前 handoff 给用户。citeturn717414search1turn717414search3

架构上还有两个值得注意的信息。Google 在 I/O 2026 明确说，Spark **运行在 Gemini 3.5 上，并建立在 Google Antigravity platform 之上**；路线图还包括直接通过短信/邮件给 Spark 派活、创建 custom sub-agents，以及在预算/商户限制下授权付款。citeturn717414search9

所以放到我们前面讨论 Courtwork 的语境里，**Google 的 Spark 与 CW 刚命名的 Spark 确实发生了比较强的语义重合**。Google 实际占据的是：

> **Always-on background agent / delegated asynchronous work**

而不是“灵感”“快速生成”之类的 Spark 旧语义。

不过两者仍有一个很重要的潜在区别：

**Gemini Spark 更接近一个“会替你做事的个人 Agent 实例/入口”**；  
你此前给 CW Spark 定义出来的方向，更容易做成 **后台自主工作的产品面 + trace/usage/report/control plane**——也就是用户不仅“把任务交给 Spark”，还可以进入 Spark 看它过去静默做了什么、为什么运行、花了多少 usage、哪些功能开启、哪些 routine/expert 正在工作。

如果沿这个方向继续，CW 的三入口其实会形成很干净的一组：

**Chat = synchronous conversation**  
**Attention = human-required work**  
**Spark = autonomous background work**

Google 现在的 Gemini Spark 反而是一个非常好的外部旁证：**“Spark”这个词在 frontier 产品里已经开始稳定指向后台、主动、持续运行的 agentic work。** 这意味着 CW 使用这个名字不是孤立造词，但同时也意味着以后如果公开发布，得考虑与 Google 的产品命名碰撞。citeturn717414search5turn717414search7

## 45ce051d-3689-4476-93fc-248c58e0590a

{'status': 'completed', 'startedAt': 1789134557.850923, 'completedAt': 1789134557.598395}

### user 45ce051d-3689-4476-93fc-248c58e0590a

一个微妙的选择是，我们自己的 Spark 选型会考虑 Gemini，因为它速度非常快并且十分廉价，开二十个并行也非常便宜。但我们不会继承这么大对于 Spark 的 agent 定义，因为它的模型能力能够承担的只是传统意义上的语言推理，而不具备更复杂的 agent 或 coding 能力。
Codex的Spark最近已经要下架了，但正如之前所说，Spark本来是可以作为一个稳定的产品面存在的。那么我们会继承它的遗志，把它定位为一个快速地在后台静默整理你的电脑的东西， 首先是速度快和推理理解能力强，而不是复杂代码能力。它的上下文可以不用很长，因为它只是梳理每一个局部进行结构化之后，以便后续更好地被其他的agent来消费。 Gemini 3.8 Flash 是有极强的速度和世界知识。虽然Agenic 的表现不及预期，但却非常适合作为一个Spark的定位而存在。
同时可以承担一些翻译工作。我会考虑把 Spark在产品内作为一个孤立唤起的翻译执行者存在。

### assistant 7875f8c3-1478-4405-91c3-90e3ef316c6a

我认为这样定义之后，**CW 的 Spark 反而比 Google 的 Spark 更“名副其实”**：它不是一个宏大的 autonomous agent，而是一类**短促、高并发、低成本的语义计算单元**。

关键是不要把 Spark 定义成“弱一点的 Agent”，而应把它定义成另一种 execution primitive：

> **Spark = fast, bounded semantic work.**  
> 对一个局部进行快速理解、转换、归类、压缩和结构化，然后退出；复杂工作交给后续 Agent。

这会形成非常清楚的能力边界。

| Spark | Agent / Expert |
|---|---|
| 秒级启动、快速结束 | 长任务、持续续行 |
| 短/中 context | 长 context / matter context |
| 高并发，10–20 个很自然 | 并发受成本与状态约束 |
| 语言理解、分类、抽取、翻译 | planning、tool use、coding、复杂行动 |
| 局部最优即可 | 需要维护全局目标 |
| 产出结构化中间结果 | 消费这些中间结果继续工作 |
| 可以近似无身份 | 有 session / role / runtime |
| 失败可廉价重跑 | 失败可能需要恢复状态 |

因此你说的“**静默整理电脑**”非常准确，但我甚至会避免把第一定义写成“background agent”。更准确的是：

> **Spark continuously turns messy local information into agent-ready state.**

例如它可以静默完成：

- 新文件 → 判断类型、主题、matter、时间、来源；
- 一段长文本 → propositions / entities / evidence / TODO；
- 下载目录 → 聚类、命名建议、重复项识别；
- 邮件或网页 → 提取结构化事实，但不替用户做高风险行动；
- conversation / trace → 做局部 projection，而不是负责整个 compaction；
- 图片、截图、PDF → 生成轻量语义索引；
- 不同语言 → 翻译成当前 workspace 的工作语言；
- 已治理数据 → 再生成其他 Agent 更容易消费的小型视图。

它其实恰好可以填在你之前那条链条里面：

**raw / messy world → Spark → governed state → Agent / Expert**

而不是：

**user → Spark agent → autonomous task completion**

这两个 Spark 虽然名字一样，实际上处于完全不同的架构层。

### Gemini Flash 因此是非常合理的默认 Provider

这里选择 Gemini 的理由也不应该是“它是不是最聪明”，而应该是它是否满足 Spark 的 workload characteristics：

**高吞吐、低延迟、低单价、不错的语言理解和世界知识。**

Spark 本来就不应该要求模型完成长 horizon agent loop。甚至模型在 agentic coding 上不够强，某种程度上还是一个健康的约束：它迫使 Spark 保持自己的产品边界，而不会慢慢膨胀成第二套 Runtime。

于是可以出现很漂亮的一层解耦：

```text
Spark
  semantic execution contract
        │
        ├─ Gemini Flash
        ├─ future cheap/fast model
        └─ local model
```

**Spark 是 CW 的产品和执行语义，Gemini 只是当前极佳的 provider。**

以后哪家出现 2× 更快、1/5 成本、语言理解相当的模型，直接替换即可。

### 翻译尤其适合作为第一个显式 Spark

这个想法我很赞同，因为它把 Spark 从“后台抽象概念”变成了一个用户马上能理解的 interaction primitive。

例如在任何文本上：

**Translate → Spark**

它不必开启一个 Chat，不需要创建一个 Expert，也不需要污染当前 Agent context。执行完直接产生：

```text
source
translation
language pair
provider/model
timestamp
optional terminology context
```

然后退出。

甚至 UI 上都不需要出现传统的“和翻译 Agent 对话”。它更像 macOS Service / Spotlight Action：

> 选中 → Spark → 翻译

同时可以允许一个很小的控制面：

**Literal · Natural · Preserve terms · Workspace language**

这恰恰体现 Spark 的哲学——**孤立唤起、立即执行、结果入账、没有人格、没有聊天负担。**

更进一步，翻译还能成为 Spark architecture 很好的 dogfood：它需要语言识别、术语 context、局部 context、缓存、并行、结果 provenance，但完全不需要复杂 agent loop。因此足够真实，又不会一开始把架构拖入 Agent Runtime。

最终 CW 三个一级产品面的语义也因此更干净：

> **Chat — think with me**  
> **Attention — needs me**  
> **Spark — quietly prepare things for me**

而底下真正承担复杂工作的是 **Agent / Expert / Runtime**，不需要抢占一个一级产品入口。

我会特别保留你说的“**继承 Codex Spark 的遗志**”这一层产品基因：不是因为 Codex Spark 某个具体实现值得复制，而是 **Spark 作为 fast parallel semantic worker 这个生态位，本身是稳定的**。Google 把它扩张成了 autonomous agent；CW 反而可以把这个词收回来，严格限制在它最擅长的尺度上。

## e3acf389-f68b-4656-98a6-f48c2c7389eb

{'status': 'completed', 'startedAt': 1789134736.053761, 'completedAt': 1789134767.69278}

### user e3acf389-f68b-4656-98a6-f48c2c7389eb

OpenAI官方称，他们在 Codex 提供的 Spark 调用量非常低，那是因为并没有把它当作一个很好的角色去使用，而只是跟其他的更强大的模型暴露在同样的一个选择面，那么人们会直接选择更强大的模型，何况现在还有非常便宜的 Luna。但是 Luna 的速度并不佳，而且其参数量其实可能没有那些通常意义上的快速模型高，因为 Luna 的能力可能来自于后训练强化了 coding，它的泛化能力是可能会不及 Gemini。那么 Gemini 或者 Codex 之前提供的 Spark，它不仅是一个模型的定义，也会是一个产品面的定义。如果 Codex 在它的 Sub-agent 或者其他的产品面中定义一个 Spark 之类的角色，并且在进行一些异步任务时默认派 Spark 去执行，比如说一些局部的翻译工作，它不需要很强的模型能力，不需要占主模型的 context，而且验收的边界非常清晰。那么我觉得一个速度快，在上下文不需要很长的一个小……也不是小，就是在 coding 场景没有那么强的模型会很合适。而且对于 Gemini 来说，Gemini 它自己的上下文是非常长的，那么它其实是保证了一个上限，毕竟 Gemini 曾经是 SOTA 模型。可能之后即便进行一些量化和压缩裁切，它的速度可以更快，可以不需要保留那么的上下文。

### assistant e404b6b9-bff9-4d83-8a25-dedd8ff52192

是，这里真正值得固定下来的不是“Gemini 比 Luna 更适合”，而是一个更一般的**产品调度原则**：

> **不要把速度型模型作为一个与强模型并列的 model choice；要把它变成系统中有明确职责、明确验收边界的 execution class。**

这其实也解释了为什么 Codex-Spark 很容易出现“产品价值没有被充分发现”的问题。

OpenAI 最初发布 GPT-5.3-Codex-Spark 时，把它定义为专门追求实时交互的高速模型：128k context、超过 1000 tok/s，并强调 targeted edits、快速迭代。可是在产品面上，用户主要还是在**主动选择 Spark 还是更强模型**。这天然产生一个劣势选择：既然任务已经值得我开一个 Codex session，为什么不用更强的？citeturn507118search0

更有意思的是，OpenAI 当时自己的路线描述其实已经接近你现在说的东西：未来 Codex 应该能把长任务交给后台 sub-agent，或者把任务 fan-out 到多个模型，而不是要求用户预先选择一个模型。换句话说，**他们在架构愿景里已经隐约看见 Spark 最合适的归宿，却没有把这个角色充分产品化。** citeturn507118search0

### 所以 CW Spark 最重要的设计应该是「不让用户选模型」

用户选择的是：

**Translate**  
**Organize**  
**Index**  
**Extract**  
**Rename**  
**Summarize locally**  
**Classify**  
**Prepare for Agent**

而不是：

> Gemini 3.8 Flash / Luna / Sol / …

然后 Courtwork 根据 workload dispatch：

```text
user intent
    │
    ▼
Spark task
    │
    ├── bounded context
    ├── bounded output schema
    ├── no / restricted tools
    ├── cheap retry
    ├── high concurrency
    └── explicit acceptance condition
              │
              ▼
        fast-model provider
              │
       ┌──────┴──────┐
       Gemini       future
       Flash        fast model
```

这才把 **Spark 从一个 model name 提升成 product primitive**。

### Gemini 3.8 Flash 恰好有一个很有趣的「能力余量」

Google 现在的 3.8 Flash 实际上已经不是传统意义上的“小模型”。官方给它 **1,048,576-token 输入窗口、65,536 输出上限、low/medium/high thinking**，而且支持 function calling、code execution、computer use preview 等能力；Google 自己甚至把它描述为面向 long-horizon software engineering 和 autonomous agents。citeturn290684search1turn290684search3

价格现在又只有 **$0.75 / 1M input、$3.75 / 1M output** 的年底前 introductory rate。citeturn290684search7

所以它很适合 CW Spark 的原因，反而不是“它只能做简单工作”，而是：

> **它的 capability ceiling 明显高于我们对 Spark 的正常要求。**

这非常重要。

例如绝大多数 Spark job 也许只有：

```text
2k–20k input
<2k output
low thinking
0–1 tool calls
1–10 seconds-ish semantic job
```

但是某一次用户扔进来一个巨大的 PDF、几十个文件、一段跨语言长材料，Spark **不用立即发生架构升级**。同一个 provider 有 1M context 的 headroom 可以吞掉异常工作负载。

因此：

**正常 workload 很窄；模型能力上限却很高。**

这比专门训练一个极小模型来做 Spark 更稳健。

---

### 反而应该刻意「不用完」Gemini 的能力

这是我觉得你这一轮判断里最值得进一步推进的一点。

虽然 Gemini 给你 1M context，**CW Spark 默认根本不应该拿到 1M**。

例如定义：

```text
Spark Budget

default context     16–32k
extended context    64–128k
exceptional         provider ceiling

thinking            low
tools               off by default
session continuity  none
matter access       scoped projection only
output              typed / bounded
retry               cheap
parallelism         aggressive
```

否则一个所谓 Spark 很容易渐渐退化成：

> “一个比较便宜的 Agent。”

这就再次丢掉了产品定义。

所以**长上下文是保险，不是预算**。

这和 SE 的理念也完全吻合：不是因为模型能吞 1M token，就应该把 Matter 塞进去；应该先治理、retrieve、compile，只给这个 Spark 当前局部所需要的 projection。

### 「无 session」甚至可以成为 Spark 的强语义

Agent 经常需要：

```text
identity
history
plan
tools
state
recovery
```

Spark 可以尽量没有这些东西。

它收到：

```text
instruction
input projection
output schema
acceptance rule
```

执行完：

```text
result
provenance
cost
latency
```

然后消失。

也就是说，Spark 更接近：

> **semantic function invocation**

而不是 mini-agent。

这是你说“翻译执行者”特别漂亮的原因。

用户选中文字：

**Translate**

后台可能就是：

```text
spark.translate(
    source,
    target_language,
    terminology_projection
)
```

完成后直接 replacement / preview / diff。

**没有 Chat。  
没有 Agent thread。  
没有 context 污染。  
甚至没有必要让用户知道 Gemini 被调用过。**

Provider 只是 provenance 里的一行。

---

### 这样一来，「20 个 Gemini 并行」才真正有意义

如果是 20 个 Agent 并行，你很快面对 coordination、duplicated context、tool contention、state merge。

但 20 个 Spark 并行完全不同：

```text
Downloads/
 ├─ PDF 1 ── Spark
 ├─ PDF 2 ── Spark
 ├─ screenshot ── Spark
 ├─ email export ── Spark
 ├─ transcript ── Spark
 ├─ markdown ── Spark
 ...
```

每个只承担一个局部语义变换，最后进入统一 governed state。

因此它天然适合 **map → govern → reduce**：

```text
                     ┌─ Spark
                     ├─ Spark
messy local state ───├─ Spark
                     ├─ Spark
                     └─ Spark
                         │
                         ▼
                 governed artifacts
                         │
                         ▼
                  Expert / Agent
```

这里真正被并行化的不是“智能体”，而是**认知预处理**。

这个定义很稳。

---

有一点我会刻意不把它写进架构依据：**Luna 的参数量大小目前没有可靠公开依据，因此不能由速度或者 coding 后训练表现反推参数规模。** 但你的更大判断不依赖这一点：coding-oriented post-training 与 general semantic/world-knowledge coverage 是两个不同轴，CW 完全应该针对实际 Spark workload 自己做 eval，而不是根据一个模型在 coding benchmark 上的位置决定它是否适合 Spark。

甚至可以专门建立一个非常小的 **SparkBench**：

| workload | 真正关心的东西 |
|---|---|
| Translation | fidelity / terminology preservation |
| Classification | schema accuracy |
| Extraction | recall + hallucination |
| File naming | semantic appropriateness |
| Matter routing | routing accuracy |
| Local summarization | proposition preservation |
| Trace projection | information retention |
| Multilingual normalization | cross-language consistency |
| Bulk processing | p50 / p95 latency |
| 20-way fanout | throughput / cost |

**不测 SWE-bench。**

如果 Gemini 在这些任务上赢了，那么即使它在 coding agent 上明显输给 Codex，它仍然是更好的 Spark。

最终这甚至可以成为 Courtwork 很明确的一条架构宣言：

> **Agents solve work. Sparks prepare work.**

或者再工程化一点：

> **Agent is a stateful execution loop.  
> Spark is a bounded semantic transformation.**

我认为后一条已经足够作为 Spark 后续实现时的边界定义。

## e654b9ec-2917-4caa-ad2c-2ad98714b7e5

{'status': 'completed', 'startedAt': 1789135020.806656, 'completedAt': 1789135020.806656}

### user e654b9ec-2917-4caa-ad2c-2ad98714b7e5

在当前的阶段，由于对接 Google 官方会有种种困难，那么我会先考虑作为某个 Harness Core，比较轻量的 Harness Core而存在。它会继承一部分 Harness Core，但不会有很高的权限。选型我会选择刚刚发布的 DeepSeek V4.1 Flash，这是一个非常迅速的模型，并且它的能力非常强，其实已经有一些偏离我们最初对 Spark 的定义了。因为我们 Spark 定义其实是那种传统意义上参数可以很大但执行很快，世界知识和推理能力很强的模型。而 DeepSeek V4.1 Flash呢，其实是一个比较接近 coding 特化的模型，但无妨，我们先把它注册。同时其他的 experts 我们也会考虑作为首先适配 DeepSeek，因为在生态方面会比较好，并且 API 也更可控。
