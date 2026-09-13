同意。这一笔很适合作为合流前最后一次 **Frontend Attention Audit**。外部成熟实践已经足够形成硬约束，而且普通产品与 Agent 产品最后其实收敛到了同一个原则：

> **前端不是后端状态的可视化转储，也不是 Agent 的旁白区。前端只承担人类需要识别、判断、操作和恢复的那部分语义。**

换句话说，可以允许 Developer Preview 有更多控制面，但不能因此把 trace、runtime metadata、provider explanation、Agent 自我解释一股脑投射给人。

## 外部共识非常强

普通产品一侧，Shopify Polaris 的表述几乎可以直接作为这一轮的总纲：**每一个词、甚至每一个标点都会增加噪音；组件支持 subcopy 不代表应该填写 subcopy；把界面当 Jenga，不断删除，直到再删就影响理解和行动为止。**它还明确建议一个概念或动作只使用一个稳定 noun / verb / phrase，避免同义词漂移。[Shopify Polaris — Content fundamentals](https://github.com/Shopify/polaris/blob/main/polaris.shopify.com/content/content/fundamentals.mdx)

Apple 今年关于 naming 的设计课更进一步：最好的名称往往不是技术上最精确的描述，而是**用户已经知道是什么意思的那个词**。他们用 `Balance` 而不是 `Current Funds` 的例子说明：行业标准词已经承担了大量解释工作，就不要重新造一句话。[Apple WWDC26 — Craft clear names](https://developer.apple.com/videos/play/wwdc2026/290/)

所以你举的例子是成立的，但要区分控件语义：

| UI 对象 | 首选语言 |
|---|---|
| 地点 / 区域 / picker label | **noun**：`Workspace` |
| 模式 | **noun**：`Model`、`Effort` |
| 状态 | **state**：`Running`、`Paused`、`Failed` |
| 立即动作 | **verb**：`Save`、`Retry`、`Cancel` |
| 需要说明对象的动作 | **verb + noun**：`Delete session` |
| 风险 / 错误 | 简短事实 + next action |
| 原理解释 | disclosure / help / docs |
| runtime metadata | diagnostics / inspector |

也就是说，`Choose workspace` 如果实际上是一个 field/picker，完全可以收成 **Workspace**；但如果真的是一个命令按钮，动词仍然有意义。不是机械地把所有文案缩成单词，而是让**控件类型自己承担句法**。

---

## Agent 产品一侧，反而更支持“大幅删字”

Microsoft 的 Agent UX 原则有一个非常关键的判断：Agent 应该在适当时候**几乎不可见地在后台工作**；真正需要前端呈现的是状态、重要动作、控制权，而完整活动路径可以存在 dashboard / settings / log 里。[Microsoft Design — UX design for agents](https://microsoft.design/articles/ux-design-for-agents/)

他们更新后的 Agent 设计规范还明确要求 UI 使用**中性、任务导向语言**，避免把 Agent 写成人，比如少用 `think / understand / feel` 一类人格化表达。[Microsoft — Human-centered design for agents](https://learn.microsoft.com/en-us/agents/design-guidelines/human-centered-design)

更贴近 Courtwork 的，是微软今年给 MCP Agent UI 写的规则：

> **Show summaries, not systems.**  
> **Clarity over duplication.**  
> **Progressive complexity.**

并且明确要求：模型文字和结构化 UI 不能重复；状态不能依赖模型写一段话来告诉用户；简单任务应该保持 glanceable，需要复杂操作才升级到更大的 workspace。[Microsoft — Agent UI widgets](https://github.com/MicrosoftDocs/m365copilot-docs/blob/main/docs/declarative-agent-ui-widgets-guidelines.md)

这几乎就是“反 Agent slop”规范。

GitLab 的措辞也非常准确：

> **Be transparent but unobtrusive. Users should always understand what AI is doing, but it shouldn't demand constant attention.**

甚至 AI CTA 本身也不建议反复写 “GitLab Duo” 或 “AI”，因为身份信息已经由周边界面承担，CTA 只需要表达动作。[GitLab Pajamas — AI-human interaction](https://design.gitlab.com/patterns/ai-human-interaction)

---

# 最值得 Courtwork 收编的一条：State ≠ Narration

AWS Cloudscape 现在把 Agent 的 **Thinking** 与 **Execution** 明确拆开了。

Thinking 是 reasoning disclosure。

Execution 是：

`Checking nodes`

`Searching files`

`Running tests`

这种现实世界发生的动作。

而对于 execution，他们明确要求：

**status concise and unobtrusive**

详细信息放进：

`popover / expandable section / substeps`

最终完成后，完整 steps 默认应当 **collapsed**。[AWS Cloudscape — Progressive steps](https://cloudscape.design/gen-ai/patterns/progressive-steps/)

这正好可以解决 Code Agent 最容易产生的一种 slop：

```text
I'm now going to inspect the repository to understand...
I've found that...
Next I will...
I am checking...
```

这些句子既不是状态，也不是结果，只是模型在替 UI 写旁白。

应该被编译成：

```text
Inspecting repository
Reading 4 files
Running tests
2 issues found
```

甚至如果持续时间很短：

```text
Running…
```

就够了。

**自然语言旁白不是 UI state。**

---

# 因此可以冻结一套 Courtwork「Attention Grammar」

我建议把所有 persistent frontend copy 强制归入下表；不能归类的字符串默认删除：

| Semantic class | 前端形式 | 示例 |
|---|---|---|
| Identity | noun | `Model` |
| Object | noun | `Workspace` |
| Action | verb / verb+noun | `Retry` |
| State | finite state | `Running` |
| Value | value | `75%` |
| Consequence | very short phrase | `Deletes local history` |
| Recovery | actionable phrase | `Reconnect` |
| Help | disclosure | `About context` |
| Diagnostics | inspector/log | connection ID |
| Narration | **delete** | `Next runs will use…` |
| Implementation explanation | **move down** | `Provider default omits…` |
| Duplicate description | **delete** | 重复当前控件已经表达的意思 |

这比普通 “UX copy guide” 更适合给 coding agent 使用，因为它是可判定的。

---

# 你截图里的 modal 正好可以作为 audit fixture

现在：

```text
Model & effort

CURRENT MODEL
Context-fixture

conn-3fab... · openai-completions · Provider default

Next runs: context-fixture · conn-... · Provider default.

Change model

Reasoning effort
Reasoning effort is not verified for this model.
Provider default will be used.

conn-... openai-completions custom endpoint.
Context window: unknown.
Added on this connection.
Supported reasoning settings are unknown.
Provider default omits the parameter.
Reasoning effort is not verified for this model;
provider default will be used.
Applies to all chats for future runs.
Current runs keep their recorded configuration.
Credentials and connection settings stay in Models.

Use for next runs
```

这里真正属于默认 human-facing surface 的信息，我认为只有大约：

```text
Model

Context-fixture
Provider default

Effort
Provider default

Set default
```

甚至如果这是一个即时保存式设置：

```text
Model
Context-fixture

Effort
Default
```

就已经够了。

剩下的东西并不是完全没有价值，而是 **surface 错了**。

| 当前内容 | 去向 |
|---|---|
| connection ID | Diagnostics |
| `openai-completions` | Diagnostics |
| custom endpoint | Diagnostics |
| context window unknown | Model details / Diagnostics |
| unsupported reasoning settings | tooltip / disabled-state explanation |
| `Next runs…` | 删除；状态/按钮已经表达 |
| `Applies to all chats…` | 只有第一次行为不显然时才 disclosure |
| credentials stay in Models | 删除或 docs |
| Provider default will be used | `Default` 本身即可表达 |

这里能删掉 **70–85% 左右的可见文本**，信息实际上没有损失，只是把 authority 放回正确的 surface。

---

# Developer Preview 也不应该例外

这一点值得明确写给 Explore Agent。

Developer mode 可以拥有：

`Trace`

`Provider`

`Connection`

`Cache`

`Context`

`Tool calls`

`Raw event`

但应该通过一个明确的：

**Inspect / Diagnostics / Details**

入口进入。

而不是让普通 dialog 同时承担：

**操作面 + 文档 + telemetry + debug dump + compatibility report**

开发者也是人，也只有一套 attention。

而且你说的另一点尤其重要：**Agent 自己根本不需要靠这个视觉面读取这些信息。**

Agent 可以直接读取：

schema / state / runtime / API / log。

所以把 backend metadata 平铺成前端文字，实际上是一个双输设计：

人类不想看，Agent 又不需要看。

---

# 可以给 Explore Agent 一个非常机械的 Audit Protocol

这一轮甚至不需要让它“设计”。

让它逐屏扫描所有可见 strings，每个 string 只能得到一个 disposition：

```text
KEEP
SHORTEN
RENAME
ICONIZE
DISCLOSE
MOVE_TO_DIAGNOSTICS
MOVE_TO_DOCS
DELETE
```

然后要求它对每条文字回答：

**Does the human need this now to identify, decide, act, understand state, or recover?**

不是，就不能留在默认 surface。

再做第二轮：

**Is this already communicated by position, component, icon, selection, state, or nearby text?**

是，就删除重复文案。

第三轮：

**Is this describing implementation rather than user meaning?**

是，就翻译或下沉。

第四轮：

**Would a stable noun / verb / state replace this sentence without ambiguity?**

能，就替换。

这非常适合 Luna / Explore 去做，因为不涉及主观重设计，只是在执行一套稳定的减法规则。

---

## 我建议顺便建立三个 project-specific lint 约束

这不是行业硬标准，而是很适合 Courtwork 的本地 grammar：

**Persistent labels** 默认一个稳定 noun / short phrase。

**Actions** 默认一个 verb，必要时 `verb + object`。

**Persistent explanatory prose** 默认视为 lint warning，作者必须证明为什么 label + state + disclosure 不能承担它。

也就是说未来 Code Agent 如果产生：

> Reasoning effort is not verified for this model. Provider default will be used.

Reviewer 第一反应不是润色它，而应该问：

> 能不能只是 `Effort · Default`？

这会从源头改变生成 UI 的方式。

---

# 最后我会把这一轮的总原则写得比“少写文案”更严格

不是追求极简，也不是讨厌文字。

而是：

> **Optimize for decision density, not information density.**

默认界面只呈现人类此刻能消费的：

**object → state → action → consequence**

其余内容按照需要逐层展开：

**detail → diagnostic → trace → documentation**

Agent 产品再加一条：

> **Show the work that changes the world; hide the narration about the work.**

也就是工具调用、文件修改、审批需求、失败、结果应该清楚可见；模型自我叙事、provider plumbing、协议字段-attention-audit`**：逐屏 strings inventory + disposition + semantic replacement + diagnostics migration map。完成以后再让施工 Agent 按这张表做纯减法，作为 Release 前最后一轮视觉治理。