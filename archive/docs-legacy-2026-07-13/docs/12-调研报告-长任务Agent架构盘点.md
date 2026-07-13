# 调研报告：长任务 Agent 架构盘点（2025 下半年–2026）

调研目的：`docs/06` 已经就 deep research 范式与长任务机制做过一轮调研，结论是"循环骨架可借、五处法律垂类特判必须自研"。本报告不重复那份结论，聚焦一个更基础的问题：**Courtwork 的薄核心（pi-mono 借壳、场景注册表固定编排、`docs/24` 已拍板"LLM 不自主选工具"）要不要、以及怎么补长任务能力**——目标场景是"傻瓜式 oneshot 长任务"（一句话/一个按钮发起，如"整理这套卷宗"），要维护可见进度、能断点续行、局部出错不崩全局，且未来监控类后台任务复用同一骨架。W6 `packages/core` 目前状态"未开工"（无代码），本报告的建议是**开工前的输入**，不是对既有代码的修改建议。

结论先放最前面，正文按调研范围展开，第 5 节是对照裁定（报告核心），第 6 节收口对 W6 SPEC 的具体补丁建议。

---

## 0. 结论摘要

1. **deepagents（LangChain）代表的"deep agents 范式"四件套——显式规划 / 子agent隔离 / 文件系统记忆 / 详细系统提示词——是四个可拆开评估的独立技术，不是一个必须整体照搬的架构。** 其官方安全模型明确写着"trust the LLM：agent 能做它工具允许的任何事，边界靠工具/沙箱层，不能指望模型自我克制"——这条前提与 Courtwork「留人确认是产品纪律」直接冲突，**deepagents 整体架构不可引入**，但拆开看，"文件系统卸载大内容""子agent 上下文隔离""显式待办复述"三项技术本身与"谁来决定做什么"无关，可以在不采纳其"LLM 自主规划+自主选工具"内核的前提下单独借用。
2. **Claude Code 的任务追踪机制在 2026 年已经从 TodoWrite 演进为更细粒度的 TaskCreate/TaskUpdate/TaskGet/TaskList**（v0.2.82 起，TodoWrite 默认禁用），这个演进方向（任务态从"一个大 markdown 清单"拆成"可编程查询的任务对象"）恰好和 Courtwork 的场景注册表天然契合——我们的"todo"本来就该是结构化对象（对应场景声明的步骤），不是模型写的自由文本。
3. **Anthropic 两篇官方长任务工程博客（2025-11 与更早的三 agent harness 报告）给出的核心工程手段是"结构化进度文件 + 显式 checkpoint（git commit）"，不是更聪明的模型循环。** 这与 Courtwork 现有"artifact 即记忆"的直觉一致，是外部验证而非新发现。
4. **Manus 的上下文工程六条经验里，"todo.md 复述对抗注意力漂移"与"错误保留在上下文里"两条对 Courtwork 直接可用，且与场景是否自主规划无关**——前者可以套在"声明式步骤"的复述上，后者可以直接用于摄取管线的失败步骤呈现。
5. **检查点/恢复（LangGraph interrupt+checkpointer、Temporal workflow/activity 分离、OpenAI AgentKit 的 snapshot+rehydration）三家的共同形状是"编排层确定性可重放、执行层可以任意重试"**——这条形状与 `docs/24`"场景=声明式固定编排，LLM 只在生成节点工作"完全同构，Courtwork 不需要引入这些框架，只需要把这条分离在 W6 事件流协议里显式建模。
6. **失败隔离的行业共识是"步骤级显式失败态 + 部分完成时的清楚交代"，而非静默失败或推倒重来**——第三方数据显示"说清楚做到哪一步、卡在哪、用户该做什么"能带来约 60% 的满意度提升（口径见 5.4，样本来源为行业博客，非严格统计）。这条应该直接写进 W6 core 的事件协议。
7. **裁定：Courtwork 四个 MVP 场景（S1–S4）的"todo"应该 100% 由场景注册表声明的执行计划自动生成，不应该、也不需要 LLM 自己写 todo。** deep agents 的"LLM 自己写 todo"解决的是"步骤集合本身不可枚举"的问题（探索式研究、开放式编程），而 Courtwork 的场景步骤在注册表加载时就是已知的有限集合——这不是同一个问题，套用会倒退到`docs/24`明确否决的"模型自主编排"路线。

---

## 1. Deep agents 范式：架构与 2026 现状

### 1.1 LangChain deepagents

`langchain-ai/deepagents`（MIT，GitHub 25.1k star，2026-06 仍在活跃发版，最新 `deepagents==0.6.11`）定位为"自带全套装备的 agent harness"，建在 LangGraph 之上，四个支柱：

- **Planning（`write_todos` 工具/中间件）**：给模型一个显式待办工具，模型自己写、自己更新，目的是"降低长任务里的目标漂移"——这是一种**上下文工程手段**，不是推理范式本身，值得单独注意。
- **Sub-agents**：为独立子任务派生隔离上下文的子 agent，父 agent 只拿到摘要，不拿到完整轨迹。
- **Filesystem**：可插拔后端（内存 / 本地磁盘 / LangGraph store / 自定义）的虚拟文件系统，用于"上下文放不下就卸载到文件，子agent 之间用文件系统做协作面"。
- **详细系统提示词**：定义行为边界。

关键信息（决定能否引入）：
- **技术栈绑死 LangGraph**（streaming/persistence/checkpointing 全部基于 LangGraph state），作为 library 引入即引入第二套编排框架，与 `docs/06` 已经拍板的"pi-mono 借壳、不引入 LangGraph 作为第二套 agent 循环依赖"直接冲突——**只能抄形状，不能 import 代码**，这条结论和 `docs/06` 对 open_deep_research/deer-flow 的裁定完全一致，本报告只是把它扩展到 deepagents 本身。
- **安全模型是"trust the LLM"**：README 原文——"Deep Agents follows a 'trust the LLM' model. The agent can do anything its tools allow. Enforce boundaries at the tool/sandbox level, not by expecting the model to self-police."——这与 `docs/24`"选择权属于用户与声明，不属于模型"以及 CLAUDE.md"留人确认是产品纪律"是两种根本不同的信任模型。**这一条决定了 deepagents 整体架构对 Courtwork 不适用，不是"暂缓引入"，是"架构前提冲突，不引入"。**
- Deep Agents Code（预构建终端编码 agent，类似 Claude Code/Cursor）进一步说明 deepagents 定位是通用编码/研究 agent，不是"低认知用户一键长任务"这类受限场景的合适底座。

### 1.2 Claude Code 的任务机制（TodoWrite → Task 工具族）

2026-05-15（v0.2.82）起，Claude Code 将 TodoWrite 拆分为 `TaskCreate`/`TaskUpdate`/`TaskGet`/`TaskList` 四个更细粒度工具，v2.1.142 起 TodoWrite 默认禁用。这个演进方向本身值得记一笔：**从"一份可被模型任意重写的 markdown 清单"演化为"可编程查询的任务对象集合"**——任务态数据结构化程度在提高，这与 Courtwork"todo 应该是结构化对象而非自由文本"的判断（见第 5 节）方向一致，是外部趋势对我们判断的佐证。

Claude Code 上下文管理的公开细节（第三方分析文章，非 Anthropic 一手源）：五层压缩管线——Tier1 微压缩（零成本重排以命中缓存）、Tier2 Snip（LRU 丢弃最旧消息）、Tier3 Collapse（分段摘要）、Tier4 Auto（启动完整 LLM 摘要子agent）、Tier5 Reactive（仅在 413 错误时触发，只保留最后 4 条消息的应急处理）。子agent 只把摘要文本返回给父会话，不返回完整轨迹；"fork"（继承完整历史的子agent变体）用于需要完整上下文但希望隔离副作用轨迹的场景。

### 1.3 OpenAI Codex / AgentKit 侧的长任务机制

- **Codex**：2026 年案例显示单次运行可持续约 25 小时、消耗约 1300 万 token、产出约 3 万行代码；架构上是"manager 分解任务→派发给并行 worker，每个 worker 独立沙箱+独立 git worktree"，强调"中途纠偏不清空已有进度"（course correction 不重置整个 run）。
- **AgentKit / Agents SDK**：官方博客明确提出**durable execution** 概念——"当 agent 状态被外部化后，丢失一个沙箱容器不等于丢失这次运行；内置的 snapshot 与 rehydration 能在全新容器里恢复状态、从最近一个检查点继续"。同时明确给出编排范式判断：**"用代码编排比用 LLM 编排更确定，在速度、成本、可预测性上更好"**——这条判断与 `docs/24`"执行=声明写死的编排骨架"的拍板完全一致，是行业头部对同一判断的独立复现，可以作为该拍板的外部佐证写入立场依据。

---

## 2. 上下文工程实践：Manus 与 2026 新研究

### 2.1 Manus 团队公开复盘（Context Engineering for AI Agents: Lessons from Building Manus）

六条经验中与 Courtwork 直接相关的四条：

1. **KV-cache 命中率是生产级 agent 最重要的单一指标**——直接决定延迟和成本（以 Claude Sonnet 为例，缓存命中 token 与非命中 token 价格差约 10 倍）。工程手段：prompt 前缀只增量追加、不做历史内容的原地修改、避免在 prompt 里塞时间戳等易变内容、手动标记缓存断点以保证前缀一致性。
2. **工具屏蔽而非移除**：不动态增删可用工具集（这会破坏前缀缓存并让模型困惑），而是用 logits masking 让模型"看不见"当前不该调用的工具。
3. **文件系统作为外部记忆**：把长期记忆存进虚拟文件系统按需读写，而不是把一切都塞进上下文——上下文只留引用/摘要，大内容卸载到文件。Manus 的输入输出 token 比约 100:1，KV-cache 机制是把这个比例的成本压下来的关键。
4. **todo.md 复述机制对抗注意力漂移**：Manus 在处理复杂任务时会创建 todo.md 并逐步更新、勾选，这不只是"看起来贴心"，而是刻意操纵注意力——通过不断重写待办清单，把全局计划复述进上下文末尾，推到模型最近的注意力窗口里，避免"lost-in-the-middle"、减少目标偏移。
5. **错误保留在上下文里（未在本轮搜索摘要中重复展开，但为 Manus 六条经验之一）**：不清洗失败轨迹，让模型看到自己刚犯的错误，作为"不要重复同样错误"的隐式监督信号，比清空重试更有效。

**这五条里，第 1/2 条是纯工程优化（KV-cache/工具屏蔽），第 3 条与 Courtwork"artifact 即记忆"同构（见 5.5），第 4/5 条是本报告认为最值得直接搬的两条**——因为它们和"计划是谁写的"无关，纯粹是"如何让模型在长任务里不走神/不重复犯错"的机制，可以叠加在声明式固定编排之上，不需要让模型自己规划。

### 2.2 2026 年新研究：Context Rot 与效率型上下文管理

- Chroma 的 "Context Rot" 研究（扩展 Needle-in-Haystack + LongMemEval）发现：包括 Claude Sonnet 4/GPT-4.1/Qwen3-32B/Gemini 2.5 Flash 在内的主流模型，性能都随输入 token 数增长而下降——这是注意力复杂度随长度呈二次增长的架构性问题，不是某个模型的调优缺陷，**说明"尽量少往上下文塞东西"是通用工程纪律，不是权宜之计**。
- "Less Context, Better Agents"（2606.10209）：对长跨度工具调用 agent，把上下文裁剪到"最近 5 次工具调用"配合摘要，比不裁剪的完整轨迹在完成率和 token/耗时上都更优（论文数据：裁剪+摘要方案达到 91.6% 完整率，token 用量与耗时同时下降）。这条支持 Courtwork 摄取场景"每份文书处理完就摘要落 artifact、不把整份 OCR 原文长期留在主上下文"的设计方向。

---

## 3. 检查点与恢复

### 3.1 LangGraph checkpointer / interrupt

`interrupt()` 在节点内调用会暂停图执行、持久化当前状态，等待外部输入后从同一节点恢复；生产环境要求持久化（非内存）checkpointer + thread ID，静态中断可以设在节点执行前或执行后（后者常用于"审阅后再决定是否继续"）。局限提示：中断前的代码在恢复时可能被重新执行，审批边界的位置需要谨慎设计——这条对 Courtwork 的"确认门禁"落点选择有直接参考价值。

### 3.2 Temporal 式 durable execution

Temporal 的核心分离是 **Workflow（编排层，必须确定性，负责让 agent 在崩溃/中断后能从原地恢复）vs Activity（执行层，可以是任意不确定的操作，如调用 LLM、调用工具、发 HTTP 请求）**。恢复机制主要靠 replay：保存关键输入与决策，重启后据此重放到中断点，不需要从头跑。

**这个"编排层确定性、执行层允许任意重试"的分离，和 `docs/24`"场景=声明式固定编排（确定性）+ LLM 只在生成节点工作（执行层的一种，允许失败重试）"是同一个形状**——Courtwork 不需要引入 Temporal 依赖，因为这条分离本来就已经隐含在既有拍板里，只是还没有在 W6 core 的协议层显式写出来。

### 3.3 与 Courtwork 既有设计的对照

`packages/core/SPEC.md` 已经预留两条相关 TODO：
- 确认请求/响应需要跨进程、跨通道、可延迟数小时回流（面向未来的 IM/OA 网关）；
- session 续行基于"从案件 artifact 结构化状态再水化"，需要 lineage（会话链 ID）、跨链可溯的确认记录。

这两条已经是"检查点+恢复"在法律场景下的具体形态，且比 LangGraph/Temporal 的通用方案更严格——因为我们的"检查点"不是任意的执行状态快照，而是**必须是 schema 校验过的 artifact**（RiskList/Timeline/PartyGraph 等），"恢复"不是重放执行轨迹，而是"从上一个已确认的 artifact 版本重新进入下一个声明步骤"。这意味着 Courtwork 实际上不需要通用 checkpointer 库，需要的是**把"当前场景执行到第几步、上一个已产出/已确认的 artifact 是哪个版本"这两件事定义成协议里的可序列化字段**——这是对现有 SPEC TODO 的具体化，不是新增拍板。

---

## 4. 失败隔离

### 4.1 步骤级重试 vs 全局崩溃

行业共识（AgentWorks/naitive.cloud 等实践博客总结，非学术来源）：**pipeline 某一步失败时不应该把垃圾结果静默传给下一步**，应该产出显式的"步骤 X 因原因 Y 失败"状态，交给专门的失败处理逻辑；对有副作用的重试要用幂等键（如 `hash(run_id + step_id)`）防止重复执行副作用。对"创建订单成功、扣款失败"这类跨步骤部分成功场景，公认模式是 **Saga/补偿事务**——每一步配一个补偿步骤用于撤销其副作用。

对应到 Courtwork：卷宗摄取里"OCR 成功、实体对齐失败"是同构问题；合同审查里"风险点抽取成功、引用校验失败"也是同构问题。这条应该体现为 W6 core 事件流里的**显式失败态事件**（不只是笼统的 `error` 事件），以及场景执行器"单步失败允许继续跑其余可推进步骤，不整体中断"的执行语义。

### 4.2 部分成功的呈现

第三方行业博客（中文，样本量与方法未知，仅供方向参考，非严谨统计）给出的方向性数据：用户不怕 agent 做不到，怕的是"做不到还说不清楚"；清楚交代"做到哪一步、卡在哪、用户需要做什么"的产品，满意度比静默失败/含糊报错高出约 60%。UX 界的通用建议是进度指示器要具体到"第 3/7 步：分析财务报表"这种颗粒度，而不是一个笼统的转圈动画。

对应到卷宗摄取：80% 完成的卷宗摄取（比如 42 份文书里 38 份成功、4 份因印章遮挡/手写批注无法可靠 OCR）应该呈现为**三态清单**——已完成 / 待人工确认 / 失败需人工处理，而不是"整体失败重跑"或"直接吞掉失败的 4 份"。这与 CLAUDE.md 的"敏感数据/留人确认"纪律、`docs/09`（防呆交互）方向完全一致，只是本报告把它落到了"事件协议需要哪几种事件类型"这一具体设计问题上。

### 4.3 超时与预算控制

多篇 2026 年生产实践文章收敛到同一套最小控制集：**`max_steps` + `max_seconds`（wall-clock）+ `max_tool_calls` + `max_usd`**，四件套覆盖约 90% 的失控场景（步数上限 25、时限 5 分钟是引用文章给出的默认起点，非普适阈值，需按 Courtwork 场景实测调整）。这是纯工程基础设施，与场景是否声明式无关，可以直接作为 W6 core 执行器的运行时保护写入验收项。

---

## 5. 对照评估（报告核心）

### 5.1 逐项裁定：哪些模式适合装进薄核心

| 模式 | 是否适合 Courtwork 薄核心 | 理由 |
|---|---|---|
| deepagents 整体架构（LLM 自主规划+自主选工具+"trust the LLM"） | **不适合，不引入** | 安全模型前提与"留人确认""LLM 不自主选工具"直接冲突；且技术栈绑死 LangGraph，违反依赖纪律 |
| write_todos 式"LLM 自己写待办"机制本身 | **不适合作为 MVP 四场景的 todo 生成方式** | 我们的步骤集合在注册表加载时已知，不需要模型自己规划（详见 5.2） |
| 待办"复述进上下文末尾"的注意力管理技巧 | **适合，直接借** | 与计划由谁写无关，是纯粹的长任务注意力工程，可以套在声明式步骤上 |
| 子agent 上下文隔离（返回摘要不返回轨迹） | **适合，在摄取场景借** | 与"是否自主选工具"无关，是一种执行器内部的资源管理手段（详见 5.3） |
| 文件系统卸载大内容、上下文只留引用 | **已经隐含在现有架构里，不需要新引入** | schemas 的 SourceAnchor 设计本来就是"引用而非内联全文"，本报告是验证而非新增 |
| KV-cache 前缀一致性优化 | **适合，工程细节，W6 实现期直接采纳** | 纯性能/成本优化，不涉及架构决策 |
| LangGraph interrupt/checkpointer、Temporal workflow/activity 分离 | **形状可借、代码不可借** | 与 `docs/24` 已拍板的"编排确定性+生成节点允许失败"同构，需要的是把这条分离在协议里写明，不需要引入依赖 |
| Saga/步骤级显式失败态 | **适合，直接借，建议写入协议** | 与"留人确认"纪律高度契合，是防呆设计的具体化 |
| max_steps/max_seconds/max_tool_calls/max_usd 运行时保护 | **适合，直接借** | 纯工程基础设施 |
| 部分成功三态呈现（完成/待人工/失败） | **适合，直接借** | 与摄取场景"80% 完成"的产品需求直接对应 |

### 5.2 核心裁定：声明式步骤生成 todo vs LLM 自己写 todo

这是本次调研被要求重点回答的问题，裁定如下：

**判据不是"哪个方式更先进"，而是"任务的步骤集合在设计期是否可枚举"。**

- **可枚举（Courtwork 现有四个场景 S1–S4 全部属于此类）**：场景注册表在加载时已经声明了完整的编排骨架（触发条件→输入 schema→工具集→生成节点→产出 schema→确认门禁）。这种情况下，"todo"本质上就是**执行计划的可视化投影**——把注册表声明的步骤列表原样映射成用户可见的进度条/清单即可，不需要、也不应该让 LLM 参与撰写或增删这份清单。让 LLM 写这份清单，等于在执行层之上又叠加了一层"LLM 决定接下来做什么"的权力，这正是 `docs/24` 明确否决的路线（"选择权属于用户与声明，不属于模型"）。deepagents 式的 write_todos 解决的是另一个问题域：探索式任务（研究、通用编程）里步骤集合本身要在运行中才能确定，LLM 写 todo 是它唯一的规划入口。Courtwork 没有这个问题，因为规划已经在场景声明阶段由人（产品/工程）完成了。
- **不可枚举（Courtwork 目前唯一潜在的例子是"聊天兜底"分支里 LLM 建议场景，或未来若引入 deep research 类场景里"发现矛盾后追查来源"这类子任务，`docs/06` 已经讨论过后者）**：这类子任务如果确实需要模型在运行中决定下一步查什么、读什么，可以在**该生成节点内部**允许一个局部的、生命周期不超出该节点的 scratchpad/待办（例如 ReAct 式的"发现矛盾→追查来源"循环），但这个局部 todo 不能升级为跨节点的整体编排权——节点做完之后必须把结果收敛回声明式产出 schema，交回场景执行器手里。这与 `docs/06` 已经给出的 ReAct 适用边界（"路径不可预测的子任务"）是同一个判断在"todo 归属"这个具体问题上的延伸。

**结论**：对 W6 core 的具体要求是——事件流协议里的"进度/todo"事件应该定义为**从场景声明的步骤列表自动派生**（一个纯函数：场景定义 → todo 快照），而不是开放一个"LLM 可写"的 todo 工具给生成节点内部的模型；如果未来某个生成节点确实需要局部探索式子循环，那个子循环的中间状态不进入对外的 todo 事件流，只有它收敛后的产出结果进入。

### 5.3 Sub-agent 并行在摄取场景的适用性

Anthropic 官方给出的多agent适用边界——"真正可并行的独立子任务、agent 间不需要共享同一上下文、任务分解在设计期就已知（不是要模型动态决定）"——摄取管线"每份文书一个工作单元"完全符合：不同文书的 OCR/分类/初步实体抽取互不依赖同一上下文，且到底要不要并行、并行度多少，**在设计期就能定（甚至可以是"文书数 N → worker 数 min(N, 上限)"这种确定性规则），不需要 LLM 运行中决定**。这意味着摄取场景的子agent 并行不违反"LLM 不自主选工具"的拍板——因为"是否派生子agent、派生几个"本身也是声明式规则，不是模型的自由裁量。

具体建议（落在 W8 ingest-v1，不是 W6 core 的通用行为，避免"core 写场景/管线特判"）：
- 每份文书一个工作单元，各自独立上下文（不需要共享同一次摄取的其他文书内容）；
- 子任务向上只返回结构化摘要（分类结果+抽取的实体候选+SourceAnchor），不返回 OCR 原始大段文本，原文留在磁盘/对象存储，通过引用访问——这与 Manus 的"文件系统卸载"、Anthropic 的"子agent返回摘要"两条经验直接对应；
- 单份文书失败（印章遮挡/手写批注导致 OCR 不可靠）不应该让整卷宗摄取失败，按 4.2 的三态呈现（已完成/待人工/失败）汇总。

### 5.4 compaction / 文件系统记忆对"artifact 即记忆"架构的补充点

Courtwork 现有架构（schemas 定义的 typed artifact + SourceAnchor 引用锚 + RevisionEvent 修正记录）本质上已经是一种比 deepagents 虚拟文件系统更严格的外部记忆——因为我们的"记忆单元"是 schema 校验过的结构化对象，不是自由格式的 markdown 便签。这意味着：
- **不需要引入 deepagents 的 ls/read_file/write_file 工具集本身**，那是给"自由格式笔记"用的，我们的记忆已经是结构化的；
- **需要补的是"大内容不进上下文，只留引用"这一条纪律在实现层的落实**——摄取产生的 OCR 全文、判决书原文这类大文本，进 core 的上下文时应该只带 SourceAnchor 引用和必要摘要，全文留在磁盘/ingest 输出物里，这是 Manus/deepagents 经验对 Courtwork 已有 schema 设计的**实现纪律补充**，不是架构补充；
- **compaction（对话历史压缩）与"artifact 即记忆"是两个不同层面的问题**：compaction 解决的是"同一次执行内，工具调用轨迹过长"，artifact 化解决的是"跨确认节点/跨 session 的长期记忆"。Anthropic「claude-progress.txt + git commit」式的结构化进度文件，本质上就是我们"确认门禁落盘续行"的通用版；`packages/core/SPEC.md` 已经预留的"session 续行基于 artifact 结构化状态再水化"这条 TODO，方向已经是对的，本报告的调研没有推翻它，只是提供了外部同构案例作为佐证。

---

## 6. 对 W6 SPEC 的具体补丁建议

W6 `packages/core` 当前状态"未开工"，无既有代码需要改动。建议在 W6 开工时把以下几点补进 `packages/core/SPEC.md`（作为验收项或 TODO，不改变已拍板的架构方向）：

1. **事件流协议新增"进度快照"事件类型**：payload 是"从当前场景定义 + 当前执行位置派生的 todo 列表"，生成方式是纯函数（场景声明 → todo），不开放"LLM 可写"的 todo 工具。
2. **事件流协议新增"步骤级失败"事件类型**，区别于笼统的 `error` 事件：允许场景执行器在某步骤失败后继续推进其余可推进的步骤，最终在确认节点前呈现三态摘要（完成/待人工/失败）。
3. **运行时保护验收项**：`max_steps`/`max_seconds`/`max_tool_calls`/`max_usd` 四件套，具体阈值按 Courtwork 场景（"午休之内出时间线"等时延目标）实测定，不是照抄行业默认值。
4. **确认门禁的"检查点"定义具体化**：不是通用执行状态快照，而是"当前场景执行到第几个声明步骤 + 最近一个已通过 schema 校验的 artifact 版本引用"，与 SPEC 已有的两条 session 续行 TODO 对齐、具体化，不新增拍板。
5. **摄取场景的子agent并行不放进 core 的通用能力**，作为 W8 ingest-v1 层的声明式配置项（并行度规则、每 worker 的独立子流程），避免 core 出现"场景/管线特判"。

---

## 7. 来源清单

### Deep agents 范式
- [GitHub - langchain-ai/deepagents](https://github.com/langchain-ai/deepagents)
- [Deep Agents overview - Docs by LangChain](https://docs.langchain.com/oss/python/deepagents/overview)
- [DeepAgents Architecture: Planning Tools, Sub-agents, and File System - BetterLink Blog](https://eastondev.com/blog/en/posts/ai/deepagents-architecture/)
- [deepagents/libs/deepagents/deepagents/middleware/filesystem.py](https://github.com/langchain-ai/deepagents/blob/main/libs/deepagents/deepagents/middleware/filesystem.py)
- [The Agent 2.0 Era: Mastering Long-Horizon Tasks with Deep Agents (Part 3) - Medium](https://medium.com/@amirkiarafiei/the-agent-2-0-era-mastering-long-horizon-tasks-with-deep-agents-part-3-745705e13b16)

### Claude Code / Anthropic
- [Effective harnesses for long-running agents - Anthropic](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Harness design for long-running application development - Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Claude Agent SDK Python | TodoWrite Deprecation and Migration to Task Tools - Clauder Navi](https://www.clauder-navi.com/en/claude-agent-sdk-python-task-tools)
- [Todo Lists - Claude API Docs](https://platform.claude.com/docs/en/agent-sdk/todo-tracking)
- [Context Compaction Deep Dive: Codex CLI, Claude Code, OpenCode](https://codex.danielvaughan.com/2026/04/14/context-compaction-deep-dive-codex-cli-claude-code-opencode/)
- [Dive into Claude Code: The Design Space of Today's and Future AI Agent Systems (arXiv 2604.14228)](https://arxiv.org/html/2604.14228v1)
- [Claude Code Subagents: A 2026 Practical Guide - Tembo.io](https://www.tembo.io/blog/claude-code-subagents)

### OpenAI Codex / AgentKit
- [Run long horizon tasks with Codex - OpenAI Developers](https://developers.openai.com/blog/run-long-horizon-tasks-with-codex)
- [Codex-maxxing for long-running work - OpenAI](https://openai.com/index/codex-maxxing-long-running-work/)
- [Codex Is No Longer Just a Coding Tool. It Is Becoming a Long-Running Task Workbench](https://silenceper.com/en/article/2026-05-23-codex-long-task-workbench/)
- [Introducing AgentKit - OpenAI](https://openai.com/index/introducing-agentkit/)
- [Orchestration and handoffs - OpenAI API](https://developers.openai.com/api/docs/guides/agents/orchestration)

### 上下文工程（Manus 与 2026 新研究）
- [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Manus: Context Engineering Strategies for Production AI Agents - ZenML LLMOps Database](https://www.zenml.io/llmops-database/context-engineering-strategies-for-production-ai-agents)
- [Manus 创始人复盘构建 AI Agent 的"上下文工程"实践 - OSCHINA](https://www.oschina.net/news/361386)
- [100:1性能优化：基于Manus看Agent的上下文工程最佳实践 - 知乎](https://zhuanlan.zhihu.com/p/1930365720929210506)
- [Less Context, Better Agents: Efficient Context Engineering for Long-Horizon Tool-Using LLM Agents (arXiv 2606.10209)](https://arxiv.org/html/2606.10209v1)
- [Context Engineering: Agent Reliability Playbook 2026](https://www.digitalapplied.com/blog/context-engineering-agent-reliability-playbook-2026)

### 检查点与恢复
- [Interrupts - Docs by LangChain](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [Durable Execution for AI Agent Runtimes: Checkpointing, Replay, and Recovery - Zylos Research](https://zylos.ai/research/2026-04-24-durable-execution-agent-runtimes/)
- [Durable Execution meets AI: Why Temporal is ideal for AI agents & Generative AI Apps - Temporal](https://temporal.io/blog/durable-execution-meets-ai-why-temporal-is-the-perfect-foundation-for-ai)
- [Of course you can build dynamic AI agents with Temporal](https://temporal.io/blog/of-course-you-can-build-dynamic-ai-agents-with-temporal)
- [从无状态到有状态：长时运行 Agent 的 5 种架构模式 - 阿里云开发者社区](https://developer.aliyun.com/article/1731966)

### 失败隔离
- [AI Agent Retries and Idempotency: Tool Failure Patterns](https://www.motomtech.com/blog-post/ai-agent-retries-idempotency-tool-failures/)
- [Agent Error Handling and Recovery Patterns: Production-Ready Resilience - AgentWorks](https://agent-works.ai/insights/agent-error-handling-recovery-patterns)
- [Multi-Agent Error Recovery Patterns](https://blog.naitive.cloud/error-recovery-multi-agent-systems-key-patterns/)
- [AI Agent Timeout & Circuit Breaker Patterns - 2026 Guide](https://www.buildmvpfast.com/blog/agent-timeout-circuit-breaker-patterns-runaway-ai-workflows-2026)
- [Budget Controls For AI Agents: How To Limit Runtime Spend - Agent Patterns](https://www.agentpatterns.tech/en/governance/budget-controls)
- [Your AI Agent Didn't Fail — It Stopped Halfway - Medium](https://medium.com/data-science-collective/your-ai-agent-didnt-fail-it-stopped-halfway-cc5a6cc58b0c)
- [Agent用户体验设计：人机交互的最佳实践 - 腾讯云开发者社区](https://cloud.tencent.com/developer/article/2553570)

### 编排范式对比
- [AI Workflows vs. AI Agents - Prompt Engineering Guide](https://www.promptingguide.ai/agents/ai-workflows-vs-ai-agents)
- [What are agentic workflows? Design patterns & when to use them - Neo4j](https://neo4j.com/blog/agentic-ai/what-are-agentic-workflows/)
- [How we built our multi-agent research system - Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)（`docs/06` 已引用，本报告 5.3 复用其多agent适用边界判断）

---

**免责声明**：本报告基于 2026-07 调研时点的公开信息（官方工程博客、GitHub 仓库、第三方分析文章）。部分数据（如"满意度提升 60%"“step-level 完成率区间”）来自第三方行业博客的方向性总结，未核实原始样本量/方法论，仅供方向参考，不作为量化决策依据；deepagents/Claude Code 等项目的版本号、star 数为调研时点快照，实际引入前需重新核实。
