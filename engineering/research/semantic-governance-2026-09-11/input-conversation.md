# 语义治理与对齐 · 接口原文

注意：turn 5f52fcdc 的 assistant 消息被接口截为 20000 字符，完整性见 README；其余按工具返回保存，不补写。

## Turn 1 · 5bc431b0-b71d-4ed2-a9f3-578159e66412

### userMessage · 5bc431b0-b71d-4ed2-a9f3-578159e66412

关于 run，这不是一个常见的语义，我们提 runtime 太多，但理解可能会与外部共识有偏差，这需要治理，收敛为稳定的 agent 用户可知的语义，一方面核对 cw repo，另一方面对齐成熟实践@exa

### agentMessage · 9f424f17-720a-4de6-afaa-256395e80b6f

需要治理，而且结论已经比较明确：**`Run` 不应继续作为 Courtwork 的一级用户语义；`Runtime` 也应从产品语言降级回基础设施语言。** 现在的问题主要不是后端抽象错了，而是内部抽象向 UI 和产品叙事泄漏得太多。

### 外部共识：不是统一叫法，而是稳定的“语义分层”

Exa 扫描后再核对官方资料，可以看到几套成熟体系其实相当一致：

| 层级 | 成熟实践 | 稳定含义 | 对 CW 的启示 |
|---|---|---|---|
| **Session** | Claude Code、GitHub Copilot、OpenAI Agents SDK | 可继续、恢复、追加上下文的工作/对话连续体 | 应成为普通用户最稳定的连续性概念 |
| **Task** | A2A、Copilot 的 delegation 叙事 | 有目标、生命周期、状态和产出的工作单元 | 适合未来真正的异步/委派工作，不应轻率等同现有 Run |
| **Run** | OpenAI Agents SDK | 一次 `Runner.run()` 执行；Session 跨多个 run 保持历史 | SDK/执行层概念 |
| **Run** | LangSmith | 甚至只是一个 span：LLM call、retrieval、formatting 都能叫 run | 证明这个词在生态里非常不稳定，不适合产品本体 |
| **Runtime** | AWS AgentCore | 承载 agent 的 hosting/execution environment | 基础设施、部署、隔离、能力承载层 |
| **Session / Context** | A2A | 多次 Task/Message 的连续上下文 | 再次把 continuity 与 execution 分开 |

Claude Code直接定义 Session 为“绑定到项目目录的已保存对话”，用户围绕 resume、branch、switch 来理解它；GitHub Copilot 也让用户管理、steer、stop、archive 的对象首先是 agent session。citeturn419938view0turn959769search0

A2A 则更明确：**Task 是有状态、有生命周期的 fundamental unit of work，`contextId` 用来把多个 Task/Message 组织成同一个 conversational session。** citeturn959769search1

OpenAI Agents SDK 恰好提供一个很好的反证：一次 `Runner.run()` 是一个 logical turn，一次 run 内可以经过多个 agent、LLM 和 tool；而 Session 跨多个 run 保存连续性。citeturn876814search9turn876814search10 LangSmith 更进一步，把 Run 定义成 trace 里的 span，甚至一次 retrieval 都可以是一个 Run。citeturn733366search0

`Runtime` 的共识反而非常稳定。AWS AgentCore 把 Runtime 定义为部署、运行 agent/tool 的 hosting environment，而把用户连续交互仍然放在 Session；Runtime 负责 compute、隔离、运行环境等。citeturn876814search0turn876814search1

所以可以得到一句很重要的治理规则：

> **Session / Task 是 agent 产品语义；Run / Runtime 是 execution / infrastructure 语义。**

---

## 回看 Courtwork：底层其实已经接近这个分层

CW 当前并不是需要推倒重来。

`runtime-foundation.md` 已经明确：Runtime 独立于 Web UI，负责 store、provider、execution service 等；持续的 Pi journal 属于 Session，而每一次新的输入产生一个新的 Run。每个 per-Run `AgentSession` 可以销毁，下一 Run 再重新打开持久 Session。换言之，**CW 后端事实上已经是 `Session = continuity`、`Run = execution`。** 

真正值得警惕的是 `run-attempts.md`：一个失败 Run 由另一个 Run `supersedes`，文档自己都把这套东西称为 attempts，但又明确没有独立 Attempt entity。于是 **Run 同时承担了 execution identity 和 retry/continuation identity**。作为 RuntimeStore 内部账本没有问题，但一旦暴露给用户，就会要求用户理解一个非常工程化的执行对象。

而另外两个对象恰好证明不能粗暴 `Run → Task`：

CW 的 `asyncTasks` 是非常窄的 host-owned bounded read operation，绑定 Session、Run、tool call、adapter/source；它甚至明确是 Run 内产生、由后续 Run get/wait 的执行性对象。它不是用户委派的“工作任务”。

`Thread` 又是另一个明确独立的对象：它是跨 Session 的 agent interaction/mailbox membership，而不是 Session、model context 或 Matter。

所以 **现在若把 Run 全部重命名成 Task，只会把歧义从一个地方搬到另一个地方。**

---

## 真正需要修的是产品表层

这里已经有明显的内部术语泄漏。

目前 `runtime-view.mjs` 直接向用户说：

- `A run is active`
- `every run of this chat`
- `The runtime answered...` 
- `Loading the runtime…`
- `A runtime is composed for a chat`
- `The runtime the next run in this chat would be composed from`
- `Active runs`
- `Recorded bindings`
- `No run has been recorded in this chat yet`
- `Package Runtime configuration`
- `Runtime profiles` 

Settings 甚至还有 `Run inspector`、`Run usage`、`runtime contract` 这样的产品文案。

这里的根本问题是：**用户明明是在配置 Agent 能看什么、能做什么、使用什么模型和权限，却被要求理解 RuntimeStore 的对象模型。**

我建议最终冻结成下面这套 ontology：

**Matter → Session → [Task] → Execution → Step**

其中 `Matter` 是 Courtwork 自己独特且值得保留的一等工作语义；`Session` 是人与 Agent 持续交互和恢复的连续体；`Task` 暂时是**保留槽位**，只有出现真正“委派一个有独立生命周期和结果的工作”时才建立；`Execution` 是当前内部 `Run` 最自然的产品投影；`Step` 是 tool/model/handoff/read operation 等细粒度 trace。

而 **Runtime 不在这条用户工作层级里**。它应该在侧面：

**Runtime / Host → provides Environment + Models + Capabilities + Policies + Tools**

这和 AWS AgentCore 的用法基本对齐。

### 因此我会这样裁

现阶段**不迁移 RuntimeStore、不改 `/runs` API、不改 runId**。内部 Run 是一个完全合理的 host execution record，迁移它收益很低。

但从现在开始建立明确的 product projection：

| 当前产品文案 | 建议 |
|---|---|
| Runtime Workbench | **Agent setup** |
| Runtime configuration | **Agent configuration** |
| Runtime profiles | **Agent profiles** |
| Package Runtime configuration | **Agent profile** / **Capability profile** |
| Loading the runtime… | **Loading agent setup…** |
| The runtime … composed from | **What the agent can use in this chat** |
| A run is active | **The agent is working in this chat** |
| Active runs | **Active work**，或普通界面直接不显示 |
| Recorded bindings | **Configuration history** |
| Run inspector | **Execution details** |
| Run usage | **Usage for this execution** |
| Run ID | 只在 Advanced / Diagnostics 显示为 **Execution ID** |
| Runtime changed while editing | **Agent settings changed while you were editing** |

尤其是 **“The runtime answered” 应当彻底禁止**。Runtime 是机器/宿主，不是产品 actor；回答、请求权限、执行工作的 actor 是 Agent，Runtime 只是执行和裁决基础设施。

---

### 对 `Task` 我建议暂时克制

长远看，我认为 CW **最终会需要 Task**，而且 A2A 的定义很适合作为外部兼容锚点：goal + lifecycle + status + artifacts。citeturn959769search1

但不是现在把 Run 改名为 Task。

更自然的未来结构是：

```text
Matter
  └─ Session                  continuity / conversation
       ├─ Task A              delegated goal
       │    ├─ Execution 1    failed
       │    └─ Execution 2    continued / succeeded
       └─ Task B
            └─ Execution 3
```

现有 `Run.supersedes` 到那时甚至可以自然成为 **Execution attempt lineage**；而现有 `asyncTasks` 最终最好治理成 `AsyncOperation / ReadJob / BackgroundOperation` 一类更准确的内部名，给真正的 agent Task 腾出语义空间。

Thread 则保持正交：

```text
Coordination Thread
   ↔ Session A
   ↔ Session B
```

不要让它变成另一个 conversation/session 同义词。CW 文档目前已经正确坚持了这个边界。

### 建议作为一笔独立 semantic-governance PR

- 冻结一个 `product-language / agent-ontology`：Matter、Session、Task、Execution、Step、Runtime、Thread 各自唯一 owner；明确 `Run` 为 internal/legacy execution noun。
- 对 `app/web/**`、Pages、用户文档做 lexical audit；普通 UI 禁止裸 `run/runtime`，Advanced/Developer/Diagnostics 设置 allowlist。
- **只改 projection/copy，不迁移 schema/API**；例如后端仍返回 `run`，前端 view model 投影成 `execution`。
- 加一个 product-copy gate：以后 agent 局部施工若重新写出 `Runtime profile`、`active Run` 之类文案，CI 直接指出需要使用稳定产品语义。

这一笔我认为优先级不低，因为它不是单纯改词，而是在 **Matter / Session / Task / Execution / Runtime** 之间建立 Courtwork 此后所有 Attention、Spark、Experts、多 Agent、远程控制都会复用的语言边界。现在做，恰好可以避免后面的前端继续沿着 `runtime-view.mjs` 的既有措辞扩散。

## Turn 2 · c43aca4f-f8c7-468c-a73d-218c75f737d3

### userMessage · c43aca4f-f8c7-468c-a73d-218c75f737d3

我建议都用稳定和共识的单词，甚至减少词组，让每一个单词都选择独立承重的，后端管理的字段可以更详细，但不应该前端同样暴露，这值得一轮 polish。是否 explore 后做裁定 handoff？

### agentMessage · 6a000143-f4ed-431d-8029-bc250e3ad39e

是。已按这个方向用 Exa 做了一轮，**46 个结果、4 条 workstream**，并重新对照了 Courtwork 当前前端。结论比上一轮还可以再收紧一层：

**不是把 `Run → Execution`、`Runtime → Agent setup` 做同义替换，而是尽量让这些内部对象根本不需要一个前端对应名词。** 用户面对的是 `Chat / Agent / Model / Tools / Access / Activity`；`runId / binding / exposure / adapter / revision` 继续存在，但属于实现与诊断。

目前 `runtime-view.mjs` 把 `Source · Requested · Effective · Bound`、`Installed / Running / Exposed / Permitted` 以及 descriptor、policy action、owning scope 等直接投影出来，已经明显超过普通用户需要理解的对象模型。 Settings 里也仍然出现 `runtime contract`、`host adapter`、provider/endpoint 等实现语言。 相比之下 Home 的 `Today / Activity / Attention / Models` 已经明显更接近正确方向，只剩 `Run started`、`recorded runs` 等泄漏需要清掉。

下面可直接作为裁定 handoff。

:::writing{variant="document" id="58341" title="Courtwork Product Language Polish · Adjudicated Handoff"}
# Courtwork Product Language Polish

## 0. Decision

This pass governs **product language**, not backend ontology.

Courtwork may keep precise internal objects, schemas, IDs, lineage, receipts, bindings, revisions, adapters, projections and execution records. The frontend does not mirror that vocabulary unless the user must understand it to make a decision.

The governing rule is:

> One concept, one word.  
> One word, one job.  
> No implementation noun without a user job.

Prefer an established ordinary word over a technically exact phrase when the ordinary word preserves the user's decision.

Do not replace one internal term with another internal term merely to sound cleaner.

In particular:

**`Run` does not become `Execution` across the product.**  
Most ordinary UI should name neither.

**`Runtime` does not become `Agent setup`.**  
Most ordinary UI should name the concrete thing the user is changing instead.

Backend names remain backend names.

---

## 1. External basis

The decision follows convergent product and content practice.

Apple's 2026 naming guidance favors names that already belong in the user's world, set the expected meaning immediately, and travel across contexts. Its worked example chooses the ordinary industry term **Balance** over more descriptive or inventive alternatives. Naming by implementation or technology is explicitly the wrong starting point.

Microsoft Fluent asks product copy to prune excess words and remove expert jargon. Microsoft's UI guidance further prefers concrete verbs such as **Connect**, **Save**, and **Install** over generic verbs such as configure or manage.

Shopify states the rule nearly verbatim: identify and eliminate synonyms, then use one noun, verb, or phrase for one concept.

Mature agent products converge on similarly small vocabularies: **Agent, Chat/Session, Model, Tools, Skills, Plugins, Memory, Permissions, Tasks, Settings**. Their SDKs and infrastructure introduce **Run, Runner, Runtime, Invocation, Trace**, but these primarily describe execution machinery.

A2A 1.0 gives **Task** an especially useful stable meaning: a durable unit of delegated work with identity, lifecycle and artifacts. It must therefore not be spent as a prettier synonym for Courtwork's current `Run`.

References:

[Apple · Craft clear names](https://developer.apple.com/videos/play/wwdc2026/290/)  
[Apple · Labels](https://developer.apple.com/design/human-interface-guidelines/labels)  
[Microsoft Fluent · Content design](https://fluent2.microsoft.design/content-design)  
[Shopify · Product content](https://shopify.dev/docs/apps/design/content)  
[Claude Code · Glossary](https://code.claude.com/docs/en/glossary)  
[OpenAI · Running agents](https://developers.openai.com/api/docs/guides/agents/running-agents)  
[A2A 1.0 specification](https://a2a-protocol.org/latest/specification/)  
[AWS AgentCore Runtime](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/runtime-how-it-works.html)  
[Linear · Concepts](https://linear.app/docs/conceptual-model)

---

## 2. Frontstage vocabulary

These are the preferred user-facing load-bearing nouns.

| Word | Owns exactly this meaning |
|---|---|
| **Home** | entry and orientation |
| **Inbox** | items that require or may require the user's attention |
| **Project** | general durable work container |
| **Chat** | one continuous human-agent conversation |
| **Agent** | the actor/specialist the user works with |
| **Model** | the selected model |
| **Tools** | actions available to the agent |
| **Skills** | reusable agent procedures |
| **Plugins** | installed capability packages |
| **Sources** | material the agent may read |
| **Instructions** | persistent behavioral guidance |
| **Connections** | external/model services connected to Courtwork |
| **Access** | what an agent is allowed to use or do |
| **Files** | user-visible files and artifacts |
| **Memory** | retained information across chats where that behavior genuinely exists |
| **Activity** | chronological events and work that happened |
| **History** | earlier versions or earlier user-addressable records |
| **Usage** | tokens, requests, cost and related consumption |
| **Settings** | persistent user configuration |
| **Advanced** | uncommon but still user-comprehensible controls |
| **Status** | current condition of an object |
| **Review** | human inspection of substantive work |
| **Approval** | one-time human authorization before an action |
| **Tasks** | reserved for durable delegated work with its own lifecycle and result |

`Task` is reserved now even if the full product object does not yet exist.

`Activity` and `History` are not synonyms. Activity answers **what happened**. History answers **what existed before**.

`Access`, `Approval`, and `Review` are also distinct. Access is standing authority. Approval is an action gate. Review is judgment of work or content.

---

## 3. Product-specific nouns

**Attention** remains a proper product/agent name only where it denotes the Attention agent or role.

The queue of things needing human attention becomes **Inbox**.

Do not use `Attention` both for an actor and for its queue. One word cannot own two product objects.

**Matter** remains valid where the professional domain itself uses *matter* as its natural term, especially legal work. It is not promoted into the universal shell vocabulary. Generic shell navigation uses **Project**.

**Profile** may remain only when the user creates or selects a real reusable named profile. Inside an Agent surface, prefer simply **Profile**, not `Agent profile`. If no reusable user object exists, do not invent Profile merely to expose backend composition.

---

## 4. Backstage vocabulary

The following terms remain legitimate implementation nouns but are not ordinary product-navigation or settings nouns.

| Internal term | Frontend rule |
|---|---|
| `runtime` | infrastructure/developer docs/diagnostics only |
| `run` / `runId` | internal execution record; normally unnamed |
| `execution` | diagnostics or technical explanation only |
| `session` | API/store term; ordinary UI uses **Chat** |
| `binding` / `bound` | backend and diagnostics |
| `composition` | backend |
| `admission` | backend |
| `exposure` / `exposed` | backend |
| `provenance` | backend/diagnostic evidence |
| `receipt` | backend |
| `adapter` | backend |
| `descriptor` | backend |
| `revision` | concurrency/history implementation; expose only when the revision itself is useful |
| `policy action` | backend |
| `owning scope` | backend |
| `host` | backend/diagnostics |
| `provider` | connection detail, not an information-architecture noun |
| `endpoint` / `base URL` / `protocol` | Advanced connection detail |
| `trace` | diagnostics |
| `asyncTask` | current narrow backend operation; **not** product Task |

Raw backend vocabulary may appear in a dedicated diagnostic/raw-data disclosure. `Advanced` alone is not permission to dump the backend model into the UI.

---

## 5. Courtwork adjudications

| Current surface | Decision |
|---|---|
| Runtime Workbench | remove as a product name |
| Runtime configuration | remove; name the concrete section |
| Runtime profile | **Profile**, only if it is a genuine reusable object |
| runtime snapshot | no ordinary UI equivalent |
| runtime contract | remove from product copy |
| host adapter | remove from product copy |
| active run | UI state **Working**; prose may say “The agent is working” |
| Run started… | show timestamp/status without the `Run` noun |
| recorded runs | **Activity** |
| Run inspector | **Trace** only inside Diagnostics; otherwise **Details** |
| Run usage | **Usage** |
| Run ID | **ID** inside Trace/Diagnostics |
| Recorded bindings | remove from normal UI; configuration history may become **History** |
| Source · Requested · Effective · Bound | collapse normal surface; do not teach this backend lifecycle |
| Installed · Running · Exposed · Permitted | collapse to user decisions, principally **Status** and **Access** |
| Descriptor | **Details**, with only useful fields |
| Permission explanation | **Access** in standing settings; **Approval** at one-time gates |
| Provider configuration | **Models** or **Connections**, according to the job |
| Catalog provider | provider/model names directly |
| Compatible endpoint | **Custom** |
| Local endpoint | **Local** |
| Backend pending | never production UI copy |
| Needs a look | **Review**, where the item genuinely needs review |
| Waiting for you | prefer **Waiting** when surrounding context already supplies what is waiting |
| In progress | prefer **Working** only when it actually denotes active work |

Do not simplify a state until its meaning is known.

For example, backend `unknown` must not automatically become `Error`. An interrupted local execution, an uncertain external side effect, and missing telemetry are epistemically different. Use a precise ordinary word such as **Interrupted** or **Uncertain** where supported by the cause, and retain explanatory prose when one word cannot tell the truth.

Clarity outranks word-count.

---

## 6. Controls

The same compression applies to verbs.

Prefer:

| Prefer | Avoid as a default |
|---|---|
| Add | Configure |
| Connect | Set up connection |
| Test | Test connection, when the section already says Connection |
| Choose | Configure selection |
| Save | Apply configuration |
| Edit | Manage |
| Remove | Manage/remove |
| Retry | Attempt again |
| Cancel | Stop operation |
| Resume | Continue previous execution |
| Review | Inspect for review |
| Open | View details, when context makes the destination clear |

A one-word control is acceptable only when its surrounding noun already supplies the missing object.

This resolves an existing Courtwork tension around file permissions. `Ask / Write / Read` was previously ambiguous because the axis itself was unclear. Do not solve that by permanently expanding every option.

Instead structure the control:

**Edits** → `Ask / Allow / Block`

The field owns the noun; the options only carry the decision.

Exact words must still match backend truth. No visual simplification may collapse materially different authority states.

---

## 7. Settings information architecture

Do not create a replacement umbrella such as `Agent configuration` unless needed.

Within Settings, prefer direct sections:

| Section | Contents |
|---|---|
| **Agent** | agent/profile choice |
| **Model** | model and effort |
| **Tools** | tools and skills when appropriate |
| **Access** | persistent authority |
| **Connections** | external/model connections |
| **Context** | only if a genuine user-level context surface remains necessary |
| **Memory** | retained memory controls |
| **Usage** | consumption |
| **Advanced** | technically useful but infrequent controls |

When a concrete category such as Sources, Instructions, Skills or Plugins communicates more information than `Context`, use the concrete category and omit the umbrella.

Do not reproduce the backend resource registry as navigation.

---

## 8. Home polish

Home is the strongest existing precedent and should become the reference style.

Preserve the general pattern of short independent nouns such as **Today**, **Activity**, and **Models**.

Change the human-attention queue from **Attention** to **Inbox** while keeping **Attention** available as the agent/role name.

Remove residual `Run` language from timestamps, empty states, heatmap labels and accessibility text.

Activity should count or describe **work**, **actions**, or simply display the count where the section itself supplies the meaning. Do not invent `executions` merely to replace `runs`.

---

## 9. Scope of implementation

This is a frontend semantic-polish PR.

No RuntimeStore migration.  
No API-route rename.  
No schema migration.  
No `runId` or `sessionId` migration.  
No broad CSS/class/function rename merely for terminology aesthetics.

Internal source identifiers may continue to say `runtime`, `run`, `binding`, etc. Changing implementation names is explicitly not the objective.

Audit all user-visible text, including navigation, headings, labels, buttons, tooltips, ARIA labels, banners, empty states, errors, placeholders and test fixtures that assert visible copy.

Primary surfaces include:

`app/web/runtime-view.mjs`  
`app/web/settings-view.mjs`  
`app/web/home-view.mjs`  
`app/web/inspector.mjs`  
`app/web/usage-view.mjs`  
`app/web/model-picker.mjs`  
Attention/coordination views  
`app/web/index.html`

Product-facing Pages copy should consume the same vocabulary after the application surface is adjudicated.

---

## 10. Implementation discipline

Do not perform mechanical global replacement.

For each visible string, first identify:

**object → user question → decision → shortest established word**

Example:

`resource.exposed` is a backend fact.

The user question is not “is this resource exposed?”

It is “can the agent use this?”

Therefore the product concept is **Access**.

Likewise, `activeRuns = 1` is backend state.

The user does not need to know that an execution record exists.

The useful product state is **Working**.

This translation boundary is the core of the PR.

---

## 11. Copy gate

Add a small product-language regression gate or equivalent targeted tests.

Ordinary user-visible literals should reject or explicitly allowlist terms such as:

`runtime`, `run`, `binding`, `bound`, `exposure`, `exposed`, `admission`, `provenance`, `composition`, `descriptor`, `host adapter`, `runtime contract`, `backend pending`, `policy action`, `owning scope`.

Do not scan arbitrary source identifiers and comments: those words remain valid internally.

The check should target rendered copy, ARIA text, tooltips and user-facing constants.

Diagnostics/developer disclosures receive an explicit allowlist rather than weakening the rule globally.

---

## 12. Acceptance

The work is accepted when an unfamiliar user can operate Home, Chat, Settings, Models, Connections, Access and Inbox without learning Courtwork's backend object model.

Every recurring user concept has one canonical word.

No two visible words are synonyms for the same product object without a documented reason.

No single visible word denotes two materially different product objects.

Technical precision remains available through progressive disclosure without becoming the default interface.

No uncertainty, authority boundary, provenance guarantee or irreversible-effect warning is weakened merely to shorten copy.

The final review should be performed visually as well as by grep: terminology is part of hierarchy, and a word that is correct in isolation can still be redundant once the surrounding section already supplies its context.
:::

这版可以直接交给本地 agent；关键裁定是 **不做术语替换，而做 abstraction projection**。后端继续详细，前端通过删除名词而不是发明新名词来变简单。

## Turn 3 · d703cd35-5f70-4877-974e-49b887301697

### userMessage · d703cd35-5f70-4877-974e-49b887301697

pages 也需要同步整治，可以提出理念，但不应该自说自话。
比如在先前一轮的讨论（可以召回并对比 repo 裁定的口径）中，已经确定 Spark 和 Attention 是两个核心自研语义，编排在 SE 的理念下， 同时架构设计上，harness core 与 work core 解耦，后者可以调伏其他 provider 的 runtime 比如 Codex，Matter／Experts／Runtime，后者不应该是一等语义。

已 push 和部署，推荐从各个维度 review，对比成熟实践，包括内容编排和视觉层级等等，这会是首先的触达面。定位和期待是，一个完成商业化发布的 fake 产品，不做旁白式、保护性措辞，只讲产品本身，因为正在这些理念下快速迭代，可以将对外面提前做好。

已推送并部署 `main@9bc6090`，线上主要页面检查通过。

[打开 CourtWork](https://lesprivilege.github.io/Courtwork/) · [部署记录](https://github.com/lesPrivilege/Courtwork/actions/runs/34515737079)

13 个截图位暂时留空，后续补齐。

## Turn 4 · 5f52fcdc-570d-4608-98a1-7eea92b6ffc9

### userMessage · 5f52fcdc-570d-4608-98a1-7eea92b6ffc9

@exa

### agentMessage · 21f42f94-5a31-4db2-9a77-577c5b8423ac

可以。这一轮我用 Exa 重新扫了 **40 个结果、4 条外部 workstream**，并全文对照了 Courtwork 线上首页及主要子页、`main@9bc6090` 的 Pages 源码、架构/roadmap、Attention 与 Spark 裁定、旧 copy convention。结论已经足够稳定，可以直接进入一轮 **Pages product-language + information-hierarchy polish**。

最关键的判断是：**现在的 Pages 已经有很好的产品基因，但仍然有两套叙事叠在一起。** 上半段是产品——`Work that survives the model`、Matter、Spark、Attention、Review；下半段经常突然变成架构说明书——Run、Runtime、Binding、Context Projection、Host runtime、Provider contract。repo 自己其实早已把两者分开：Work Core 持有 Matter、Candidate、Evidence、Decision，Generic Runtime 在 Host Adapter 之后，是独立替换轴。 roadmap 也已经明确“通用 agent harness 与 Semantic Work Core 分开”，Codex 等是后续 runtime 替换验证对象，而非产品本体。

外部对照也很一致。[Cursor](https://cursor.com/product)、[Devin Desktop](https://devin.ai/desktop)、[Claude Code](https://claude.com/product/claude-code)、[Kimi Work](https://www.kimi.com/resources/kimi-work-introduction)、[Linear](https://linear.app/homepage) 都把首页留给**用户工作、产品对象和可见结果**。Devin 虽然甚至支持 ACP 和多种 agent，但把 interoperability 放在“All the models, All the agents”这样的后段能力里；只有 [Vercel](https://vercel.com/) 会把 Infrastructure 放 Hero，因为基础设施本身就是它出售的产品。Courtwork 显然属于前一类。

另外，召回的旧裁定与当前 repo 有一个必须一起修掉的冲突：9 月 9 日的 `copy-convention.md` 曾把 `Run` 定为用户词，把 Matter 隐在产品 UI 后面；但之后 Spark、Attention、Work Core、多 Expert 与 runtime replaceability 的裁定已经反转了这个权重。 因此不能只改 Pages 文案，否则 canonical copy spec 会继续把旧词重新带回来。

下面可直接交本地 agent。

:::writing{variant="document" id="27463" title="CourtWork Pages · Commercial Surface Polish Handoff"}
# CourtWork Pages · Commercial Surface Polish

**Baseline:** `main@9bc6090`

## 0. Product ruling

Pages represents CourtWork as a finished commercial product.

It is not the README rendered large.  
It is not an architecture diagram with marketing typography.  
It is not a progress report.

The public surface talks about the product that exists in the user's mental model.

The architecture may be more detailed than the product. The product must not inherit that complexity merely because the backend can name it precisely.

CourtWork's public hierarchy is:

| Level | Product meaning |
|---|---|
| **CourtWork** | the product |
| **Matter** | durable work |
| **Spark** | rebuildable knowledge around changing sources |
| **Attention** | the resident agent and human-attention surface |
| **Experts** | specialized roles that work within Matters |
| **Review** | where proposals meet evidence and human judgment |
| Models · Tools · Connections | replaceable capabilities |
| Runtime · Run · Binding · Host · Adapter | implementation |

`Runtime` is therefore not a peer of Matter, Experts, Spark or Attention.

`Run` is not a public product object.

Runtime interchangeability remains an important architectural property, but Pages expresses its **benefit**:

> Use the right model or agent without moving the work.

not its implementation:

> Choose a Runtime for each Run.

---

## 1. Preserve the strongest existing decisions

The current Hero stays conceptually intact:

**Work that survives the model.**  
**模型可以离场，工作继续。**

This is CourtWork's strongest positioning line because it describes the product consequence of the architecture without teaching the architecture.

Preserve the archival Matter object as the distinctive Hero visual language. Do not replace it with a generic full-width SaaS screenshot.

Preserve **Spark** and **Attention** as branded CourtWork concepts. Their independent naming is justified because they are first-party product ideas rather than generic UI features.

Preserve the sparse judgment/accent color policy. Human attention and consequential review may carry the exceptional color; ordinary navigation and decoration do not.

Preserve **Proposal / Evidence / Decision** as the Review grammar.

Preserve the local-first acquisition story and model choice.

---

## 2. Correct the public ontology

Current Pages incorrectly elevate several implementation concepts.

Immediate removals from ordinary marketing copy:

| Current | Ruling |
|---|---|
| Runtime | remove as feature/category |
| Host runtime | remove |
| Local runtime | remove |
| Hosted runtime | remove |
| Managed runtime | remove |
| Expert runtime | remove |
| Runtime controls | remove from marketing links |
| A choice for each run | remove |
| Choose for each run | remove |
| Run as a Matter-tour step | describe the visible work instead |
| Run context | remove |
| Binding | remove |
| ROLE → BINDING → EXECUTION | replace |
| Context Projection as headline concept | demote to research/developer depth |
| Provider contract | developer documentation only |

`run` may remain an ordinary English **verb** where natural, such as `Run locally` or `Run tests`. The ban concerns `Run` as a product noun.

Do not mechanically substitute `Execution` for `Run`.

Delete the noun when the user does not need an object.

---

## 3. Spark, Attention, Matter and Experts

These four must no longer appear as four interchangeable “architecture pieces”.

They have different roles.

### Matter

Matter is the durable object.

A concise public definition is sufficient:

> Sources, proposals, files and decisions stay with the work.

The reader does not need Matter Repository, stateVersion, CAS or Core ownership to understand it.

### Spark

Spark is a **branded capability**, not another truth store.

Public promise:

> Sources change. Knowledge catches up.

Show source → derived view → changed source → rebuilt view.

Its distinction is not “RAG” or “memory”. It is that derivations can change while the underlying work retains provenance.

### Attention

Attention is a **branded agent/surface**.

Public promise:

> Work keeps moving. You step in when judgment matters.

Do not use Attention as the generic name of every notification list or colored state.

Attention can surface things that need the person; the item itself can simply be Waiting, Review, Approval, etc.

### Experts

Experts are reusable professional roles inside durable work.

Public promise:

> Bring the right expertise to the same work.

They do not own a separate world. They operate on the same Matter, sources, evidence and review boundary.

Replace:

`ROLE → BINDING → EXECUTION`

with a product-level composition such as:

`MATTER → EXPERT → REVIEW`

or a visual in which Matter is the common work object and multiple Experts contribute proposals back into Review.

The important point is not the literal arrow order. It is that **Runtime disappears from the conceptual diagram**.

---

## 4. Homepage information hierarchy

Current homepage has too many similarly weighted editorial sections.

`page.mjs` currently renders Hero → Spark/Attention → Paper/Tour → Home → Matter → Review → long-work → Eval → Architecture → Portability → Three Views → Pricing → Build.

That sequence treats product, research, architecture and acquisition as peers.

Change the homepage narrative to:

| Order | Question answered | Surface |
|---|---|---|
| 1 | What is CourtWork? | **Hero** |
| 2 | Is this a real product? | **real product UI** |
| 3 | What is different? | **Spark + Attention** |
| 4 | What stays? | **Matter** |
| 5 | Who does the work? | **Experts** |
| 6 | How do I stay in control? | **Review** |
| 7 | Am I locked to one intelligence stack? | **Models & tools** |
| 8 | Can I trust the work? | short **Eval / Privacy** proof |
| 9 | What does it cost? | **Pricing** |
| 10 | What do I do now? | **Download / final CTA** |

The Paper, architecture anatomy, raw state projections and build internals become secondary destinations.

**Schema Engineering should be the grammar behind the page, not homework before understanding the product.**

A lower Research link may say that CourtWork is designed around Schema Engineering and lead to the paper. The homepage itself demonstrates those ideas through product behavior.

---

## 5. Move product proof upward

The current archival Hero can remain.

But the actual application currently arrives too late, after Spark/Attention and the “Two ways into CourtWork” Paper/Tour block.

Move the real Home/product surface into the first product-proof band.

Preferred rhythm:

**Hero → Product proof → Spark + Attention → Matter…**

or, if the current Spark/Attention composition is visually exceptional:

**Hero → Spark + Attention → Product proof → Matter…**

Both are acceptable.

`Paper / Tour` must not stand between the visitor and the first real product image.

Cursor, Claude Code, Devin and Linear all make the working surface visible extremely early. CourtWork should do the same without adopting their generic giant-Hero-screenshot composition.

---

## 6. Navigation

There are currently two competing navigation systems:

top-level `Tour / Paper / Release`, followed on product pages by nine product links.

This makes the product feel like a published research project with a product microsite underneath.

Use one commercial global navigation.

Recommended public set:

**Product · Experts · Eval · Pricing · Download**

`Product` may route to Features or the Tour depending on final information architecture.

Move these downward:

**Paper / Research · GitHub · CLI · Changelog · Models · Privacy**

They remain accessible through footer, contextual links, or developer navigation.

Specific rulings:

`Release` → **Download**

`Get CourtWork` may remain as contextual CTA copy, but the stable navigation noun should be **Download**.

`Paper` is no longer primary navigation.

`Models` remains a useful secondary product page, not a top-level product pillar.

Do not retain a second nine-item horizontal product-nav beneath the masthead.

---

## 7. Features page

Current feature hierarchy:

Matter  
Spark  
Attention  
Experts  
Runtime

is wrong because it makes execution infrastructure appear to be the fifth product principle.

Recompose around:

**Matter**  
Work that remains.

**Spark**  
Knowledge that rebuilds.

**Attention**  
Judgment at the right moment.

**Experts**  
Specialists for the same work.

**Review**  
Evidence before commitment.

Models, tools and connections form a lower compatibility/control section, not a fifth ontology element.

---

## 8. Experts page

Current copy repeatedly states:

“角色定义责任，Runtime 承担执行，Matter 保留共同依据。”

This is architecturally defensible and commercially weak.

Replace the story with the work relationship:

> Experts bring specialized judgment to the same Matter.

Show:

Matter  
→ Expert contribution  
→ Proposal + Evidence  
→ Review  
→ Decision

Models and tools may differ between Experts, but that is supporting capability.

A later compact section can say:

> Use different models and tools without fragmenting the work.

No Runtime noun is needed.

---

## 9. Models page

The page should answer four user questions only:

**Models** — What intelligence can I use?  
**Connections** — Where does it come from?  
**Control** — What can it access?  
**Usage** — Who accounts for consumption?

Remove:

`RUNTIME`  
`A choice for each run.`  
`Connect once. Choose for each run.`  
`Runtime controls`

A suitable product thesis is simply:

**Bring your models.**

or retain the current:

**Bring your intelligence.**

Provider, Base URL and protocol details belong beneath Connections / Advanced, not in the page's conceptual hierarchy.

This page is the place to demonstrate runtime replaceability **without naming runtime**.

---

## 10. Download page

Remove:

**A few commands. Your own runtime.**

Prefer:

**Start locally.**

or:

**Run CourtWork on your machine.**

The installation command is the evidence.

`Run locally` as an action is fine because `run` is an ordinary verb here.

`Source host`, POSIX adapter and comparable implementation labels belong in installation details rather than acquisition headline material.

The page should visually make the future signed desktop build the primary commercial object and source installation the developer route.

The currently empty desktop/download affordance can already own that hierarchy before packaging is complete.

---

## 11. Pricing

Pricing is valuable because it makes the fictional product feel complete. Keep it.

Remove topology from what the plans sell.

### Local

Sell:

Local work  
Own models  
Spark + Attention  
Matter history  
Review and evidence  
Open source

### Professional

Sell:

Desktop app  
Sync  
Updates  
Integrations  
Longer history  
Managed services

### Organization

Sell:

Shared Matters  
Experts  
Access  
Review policy  
Audit  
SSO  
Private deployment

Delete `Local runtime`, `Hosted runtime`, `Managed runtime`, and `Expert runtime`.

The pricing diagrams should show **who owns the work and what capability becomes available**, not which execution substrate hosts it.

Model usage can remain explicitly separate. That is a comprehensible commercial fact.

---

## 12. Tour and the 13 screenshots

Do not delete the 13 capture slots.

Do not let 13 screenshots create 13 product concepts either.

The current flat sequence makes `Agent running`, `Permission`, `Artifact`, `Matter`, `Integrations`, two Attention screens, Models and Settings all appear semantically equal.

Group them into a small number of stories while preserving individual capture IDs.

Recommended grouping:

| Story | Captures |
|---|---|
| **Start** | Home · Agent working · File |
| **Know** | Spark · Matter · Continue |
| **Judge** | Attention · Approval · Review |
| **Specialize** | Experts · Models |
| **Control** | Integrations · Settings · Attention conversation where appropriate |

The screenshot heading describes what the visitor is seeing, not the backend state that generated it.

Examples:

`Agent running` → **Working**

`Permission / a specific action` → **Approval**

`Artifact / file` → **Files**

`Models / configure deliberately` → **Models**

`Integrations / explicit scope` → **Connections** or **Tools**, according to the screenshot.

The full screenshot can contain richer product vocabulary. The campaign caption should not teach the internal implementation.

---

## 13. Changelog

Current Changelog still speaks as an engineering journal:

“Models 重构为 Connections 与 Add provider”

“Provider inspection”

This breaks the fictional-commercial frame.

A commercial changelog describes observable product changes.

For example:

**More model connections**  
Connect compatible model services from one place.

**Review before connecting**  
Inspect a model directory before saving it.

**A new Home**  
Return to active work, Attention and usage from one place.

Commit links may remain beneath the copy as open-source evidence.

The headline never needs to explain which component was refactored.

---

## 14. Eval

Eval is a legitimate CourtWork differentiator and can remain public.

But the commercial question is:

**Can the work continue correctly?**

That current headline is strong.

Keep Continuity / State Machine / Fault & Replay / Disclosure as deeper dimensions, but lead each with the failure the user cares about rather than test-infrastructure terminology.

Do not insert maturity disclaimers into the selling narrative.

Methodology, synthetic/real distinctions, hashes and exact evidence boundaries live in the detailed Eval/report surface.

---

## 15. Privacy

Privacy is already one of the stronger secondary pages.

This is an appropriate place for more technical nouns because a reader is explicitly asking where data goes.

Keep the distinctions among:

Matter data  
Model requests  
Credentials  
Tool effects

Provider and endpoint can appear when materially necessary.

Still avoid Runtime as an explanatory shortcut.

Local storage must never be written as though it means every model/tool action stays local.

---

## 16. Research / Schema Engineering

Current homepage gives the Paper too much navigational weight while simultaneously explaining SE repeatedly inside product sections.

Consolidate.

One lower-confidence/research band is enough:

**Designed for work that outlives a conversation.**

Briefly connect CourtWork to Schema Engineering, then link:

Paper  
Practice  
GitHub

The product sections themselves should simply behave according to SE:

sources have versions  
derived knowledge can rebuild  
decisions remain  
review has evidence  
new agents can continue

No paragraph needs to say “this is the SE principle of…” before the visitor sees the benefit.

---

## 17. Visual hierarchy

The content problem is currently reinforced by CSS.

The homepage `h1` tops out around 46px while secondary product-page headings reach roughly 88px. Secondary pages therefore have a stronger campaign voice than the primary landing page.

The homepage Hero must own the strongest typographic level.

Also, nearly every major homepage section currently uses the same:

88px separation  
top rule  
similar H2 scale  
same approximately 1040px stage

This visually says “thirteen equal chapters”.

Introduce distinct hierarchy:

**L0 — Hero**  
largest type, archival object, clear CTA.

**L1 — Signature product**  
Spark / Attention and the real product proof. Large compositions, little explanatory prose.

**L2 — Work story**  
Matter / Experts / Review. Alternating screenshot or diagram compositions.

**L3 — Trust and compatibility**  
Models / Eval / Privacy. Quieter and denser.

**L4 — Acquisition / footer**  
Pricing, Download, Research, GitHub.

Not every transition needs a horizontal rule.

Not every section needs an uppercase monospace eyebrow.

The archival/figure vocabulary should remain a distinctive accent rather than becoming the default wrapper around every feature.

---

## 18. Screenshot stage

Keep the text reading measure constrained.

Allow real product screenshots to escape the editorial measure and become the visual evidence.

The page does not need to become a 1440px generic SaaS canvas, but selected screenshots can use a wider stage than the current prose/content column.

Screenshots should demonstrate a user job:

Matter continuity  
Spark rebuild  
Attention intervention  
Expert work  
Review with evidence

Do not spend prime screenshot slots proving Settings implementation or backend diagnostics unless the section is specifically about control.

---

## 19. Canonical language governance

This PR must not patch Pages alone.

Update `engineering/design/copy-convention.md` in the same semantic change.

The newer ruling supersedes its 2026-09-09 assumption that `Run` is a normal product noun and Matter should remain invisible.

Add a three-tier vocabulary:

**Product**  
Matter · Spark · Attention · Experts · Review · Models · Tools · Sources · Files · Access · Activity · Usage

**Contextual / advanced**  
Provider · Connection · Endpoint · Trace · History

**Developer**  
Runtime · Run ID · Binding · Admission · Composition · Adapter · Host · RuntimeStore

Then add Pages to the same lexical regression checks as application copy.

A future local frontend PR must not be able to reintroduce Runtime as a product feature merely because the backend exports that field.

---

## 20. Acceptance

The Pages polish passes when a visitor can understand the product without knowing what a runtime is.

Within the first two major scroll regions, the visitor can answer:

**What is CourtWork?**  
**What does it look like?**  
**Why is it different?**

Spark and Attention are visibly first-party CourtWork concepts.

Matter and Experts have stable, non-overlapping meanings.

Runtime does not appear as a product pillar.

Run does not appear as a recurring product noun.

The Home page is visually stronger than its secondary pages.

Research and architecture deepen the product rather than interrupt its first explanation.

The 13 screenshots form several coherent product stories rather than thirteen equally weighted ontology nodes.

Pricing describes value.

Changelog describes shipped product changes.

Privacy describes boundaries.

Eval describes what is tested.

The final page feels like a product whose architecture happens to be rigorous, not an architecture project trying to explain why it might become a product.
:::

我会把这轮的优先级定成 **P0 语义与 IA → P1 首

## Turn 5 · 043dd1f0-05af-4ede-9069-6d17f7500e55

### userMessage · 043dd1f0-05af-4ede-9069-6d17f7500e55

这是一个好的节点，把按钮图标的治理也纳入语义之中，稳定的符合用户常识的，首先用图标来表达，其次才是文字，尤其应该减少那些装饰性文字，这个是目前agent design 的路径依赖，提供了充足的选型参考之后，我会优先消费这一单。
并且不只是装饰性文字，现在 UI 中很多文字都会暴露在外，有的会看起来令人非常费解， 不像一个可交互的产品，而像一篇文章。 或许可以优先考虑用更多的可视化图形化表达和治理，否则不引入这么多文字，只留下必要稳定的部分，和必要的引导
尤其是对一些数据的统计和 trace 的记录，现在大多数是用文本来组织的，那么需要一次全量的审计，并考虑应该做可视化的做可视化，这会是比较大的一笔单。我会提交一个 full write 的 Astra 来循环做完。

[User attached 1 image; image contents were not included]

### agentMessage · 9bc9998d-85e5-4874-85ed-360efd8ec7f8

是，这一笔应当优先于继续堆功能，而且我建议把它定义成 **Visual Semantics / Interface Grammar**，而不是“icon polish”。

我用 Exa 对照了图标体系、agent 产品、trace/observability、usage dashboard 四条线，也重新核了 `main`；当前远端仍是 `9bc6090`。结论很明确：**Courtwork 已经有不少正确底座，问题不是缺少组件，而是信息仍过度依赖语言模型最擅长生成的“解释性文字”**。这正是 agent design 很容易形成的路径依赖。

当前 `ui-controls.mjs` 已经有一个很好的起点：统一 `icon()`、`action()`、`setAction()`，16/18/20 的 glyph slot、icon-only tooltip/accessibility、统一 hit-area 观念都已经存在；实际 SVG 也是一套 24×24、2px stroke、round cap/join 的 Lucide 语言。  因此**不应该为了“图标更多”同时把五套库混入 production**。

### 图标先裁一个很明确的方向

我建议：

| 层 | 裁定 |
|---|---|
| **Primary family** | **Lucide**，继续作为 Courtwork system icon 基线 |
| **State variants / richer specimen donor** | **Phosphor**，用于研究 fill / regular / duotone 如何表达状态，不默认直接混用 |
| **Gap index** | Remix / Hugeicons / MingCute，只用于缺失语义检索和形态比较 |
| **Courtwork-native** | Spark / Attention / Matter / Expert 等真正一等产品语义可以自绘 SVG |
| **Platform** | 后续原生 macOS 壳若采用 AppKit/SwiftUI，再映射 SF Symbols，不反向污染 Web grammar |

理由不是审美偏好。Lucide 官方自己要求 24×24、2px stroke、低密度、统一 optical weight，并明确说它是“一套一致的 icon set，而不是 unrelated icons collection”；这与 CW 已有实现完全吻合。[Lucide design language](https://lucide.dev/contribute/icons/design-principles)

Phosphor 真正值得消费的是其 **thin / light / regular / bold / fill / duotone** 六种 weight。同一个语义可以通过 outline→fill 表示 selected，通过层级/双色表示内部结构，这和 SF Symbols 的 outline/fill/hierarchical 思路接近。[Phosphor](https://github.com/phosphor-icons/react) · [SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)

所以不是：

> Lucide 找不到这个图 → 换 Hugeicons；那个不好看 → 换 MingCute。

而是：

> semantic slot → canonical metaphor → Courtwork optical grammar → Lucide 有则取 → 无则从 donor 寻找隐喻 → 按 CW grammar 重绘。

这样一年后还是“一人所写”。

---

## 更重要的是：建立 **Representation Grammar**

上一轮我们治理的是“哪个**词**承重”；这一轮应治理“这个事实**是否还需要词**”。

建议 Astra 对每个前端事实做这样的裁定：

| 信息类型 | 默认表达 | 文字角色 |
|---|---|---|
| 熟悉动作 | **icon** | tooltip / a11y |
| 当前选择 | icon + fill/selection/state | 通常无解释句 |
| 单一状态 | glyph / dot / shape + 1 个词 | 必要时一句原因 |
| 数量 | numeral | noun 由所在 section 提供 |
| 比例 / capacity | bar / ring / meter | 精确值辅助 |
| 时间变化 | sparkline / line / heatmap | 标题 + selected value |
| 分类比较 | bar | 标签 |
| 一次 agent 工作 | compact activity rail | 当前动作一句 |
| nested tools / subagents | tree | drill-down 才显示参数 |
| 并行调用 | grouped branch / lanes | 展开后看个体 |
| latency | timeline / waterfall | 数字作为 annotation |
| token composition | stacked bar | tooltip 给精确值 |
| work sequence | step rail / timeline | label |
| provenance | relation / source trail | 精确来源仍可展开 |
| diff / review | native diff / structured candidate | prose 只解释判断 |
| raw/debug | text / JSON | **Developer disclosure only** |

这里有一条非常重要的负约束：

**visualization ≠ decoration。**

如果两个数字没有可比较关系，不画图；如果一个状态一个单词已经说明，不加 chart；如果一张图会模糊 `unknown / incomplete / zero / not observed` 的区别，则宁可留文字。

这符合 SE：图形是 **projection**，不是第二份事实。

---

## 现在 repo 已经能看到很典型的三个改造靶点

### 1. Inspector：目前是“数据库字段阅读器”

`inspector.mjs` 当前把状态、Started、输入、Usage 五个字段、request measurement、run notes、runtime context、Run ID、Command ID、Provider、Model、API format、Adapter、Native session、credential generation，再加最多 100 条 event JSON 全部串成文字和 `<dl>`。

这不是数据不足，而是**projection 太接近 backend record**。

建议最终形成：

**Summary → Activity → Files → Usage → Details**

其中默认可见面只需要类似：

`Working` · `Opus 5` · `18s` · `12 tool calls` · `3 files`

下面是一条 activity rail：

`Search → Read ×6 → Edit ×3 → Test → Done`

点某一步才展开参数/result。

最底层 **Trace / Raw** 才出现 event name、ID、adapter、JSON。

这和 Claude Code Desktop 最新做法高度一致：它直接提供 **Summary / Normal / Verbose** 三档 transcript；Normal 折叠 tool calls，Summary 只看结果和变更，Verbose 才看每次 read/tool/intermediate step。[Claude Code Desktop](https://code.claude.com/docs/en/desktop)

---

### 2. Telemetry：现在几乎可以逐项变成图形

当前 `telemetry-view.mjs` 是：

`Host first output`  
`Host first text`  
`Observed request time`  
`Effort`  
`Decode TPS unavailable`  
`Request context estimate`  
`Requested model`  
`Observed model`  
四类 tokens  
最后再跟一整段 caveat。

这是本单最明显的 visualization target。

可以变成一条 request strip：

**2.4 s** total  
`0 ├── first output 0.8s ── first text 1.1s ───────── done 2.4s`

再配一个 token composition：

`input █████████████░ cache ██████░ output ██`

旁边只留：

`Opus 5 · High`

`Incomplete` 如果数据不全，用稳定的 visual state + tooltip，而不是重新写一段说明。

详细定义仍保留在 disclosure。

---

### 3. Usage：其实已经走对一半

`usage-view.mjs` 已有 daily heatmap、model stacked chart、filter、drill-down、精确 table，这说明 CW 已经有“数据 → visual projection → exact record”的基本能力。

问题是图下面又叠了大量诸如：

> Relative scale over positive reported days...  
> Top four configured models plus Other...  
> historical coverage unknown...  
> Cache fields may overlap...

于是视觉化之后又用文章把视觉化解释一遍。

这一轮应该改成：

**图负责读形状；tooltip/focus 负责精确值；legend 负责编码；info disclosure 负责测量定义；Raw/Table 负责复核。**

不是把 caveat 删除，而是把 caveat **移到正确层级**。

这一点和 Vercel AI Gateway 很接近：Overview 放 request/model、TTFT、tokens、spend 的图；请求列表才给 model/provider/status/usage/cost/duration；点进去才是完整 request detail。[Vercel AI Gateway Observability](https://vercel.com/docs/ai-gateway/observability-and-spend/observability)

---

## Trace 这一块可以直接消费成熟实践，而不自造

我认为最值得 Astra 研究并转译的不是某一张漂亮 graph，而是这几个产品已经趋同出来的 **三视图模型**。

Braintrust 的 Trace Viewer 明确提供：

**Spans** — nested call graph  
**Thread** — chronological conversation  
**Timeline** — execution + token efficiency

Timeline 还能按 duration / total tokens / prompt tokens / completion tokens / cost 改变 bar scale，并单独显示缓存组成。[Braintrust trace viewer](https://www.braintrust.dev/docs/observe/examine-traces)

LangSmith 最近也把同一个东西拆成：

**Messages** — 先找问题  
**Turns** — 看结构  
**Details** — debug 精确字段

而不是打开一条 execution 就先倾倒所有字段。[LangSmith View Traces](https://docs.langchain.com/langsmith/view-traces)

Langfuse 又补了一刀：

**Aggregated** 看“这个 agent 一般怎样工作”  
**Expanded** 看“这一次究竟怎样跑的”

重复步骤在前者折叠为计数，后者才全部展开。[Langfuse Agent Graphs](https://langfuse.com/docs/observability/features/agent-graphs)

这和 Courtwork 特别契合，因为可以直接对应：

**Work → Activity → Trace**

而不需要让 `Run` 成为产品 ontology。

---

# 给 full-write Astra 的 handoff

建议整笔单叫：

**WO-VS-01 · Visual Semantics & Interface Grammar**

目标不是“减少文案 XX%”，也不是“增加图表”。

> **让 Courtwork 默认表面表达 work，而不是解释 implementation。**

### Phase A — exhaustive inventory

扫描整个 `app/web/**` 和 `site/**`，对所有用户可见元素建 ledger。

每一项至少记录：

`surface · datum/action · current representation · semantic owner · consequence · proposed representation · disclosure level`

不要只搜 string literal。

必须覆盖：

buttons  
icon-only controls  
navigation  
headings  
helper text  
empty states  
errors  
status  
tool calls  
agent activity  
Attention  
Spark  
Matter  
Review  
files  
usage  
telemetry  
trace  
settings  
provider/model  
coordination  
Pages

并统计：

**visible prose blocks / visible words / icon slots / raw fields / numerical fields / charts / tables / expandable disclosures**

这是 baseline，不以“看起来文字多”代替测量。

---

### Phase B — freeze the grammar before polishing screens

先产出三份 canonical spec：

**icon-grammar.md**  
canonical slots、metaphor、family、尺寸、weight、selected/disabled/attention/error variants、hit target、a11y。

**representation-grammar.md**  
什么事实使用 text / icon / status / metric / timeline / graph / heatmap / table / raw disclosure。

**product-language.md**  
承接上一单：一个词一个 owner，Run/Runtime 等 backstage vocabulary。

这三份被 app + Pages 共同消费。

禁止每个施工 PR 自己判断“这里加个 icon/chart 看起来不错”。

---

### Phase C — icon specimen before migration

不要一上来 wholesale replace。

做真实语义 board，至少覆盖：

`Home`
`New`
`Search`
`Settings`
`Chat`
`Files`
`Sources`
`Models`
`Tools`
`Connections`
`Spark`
`Attention`
`Matter`
`Expert`
`Review`
`Approve`
`Deny`
`Edit`
`Copy`
`Open`
`Close`
`Retry`
`Refresh`
`Pause/Stop`
`Working`
`Waiting`
`Complete`
`Failed`
`Unknown`

每格比较：

**current Lucide → Lucide alternate → Phosphor → strongest external donor → optional CW-native**

必须在真实 16 / 18 / 20px 和 light/dark 下比较，不能看图库 32px showcase 后裁。

最终每个 semantic slot 只能有一个 canonical glyph。

---

### Phase D — representation audit

把每一个文字/数据块归入四种裁决：

**KEEP** — 文字就是最准确表示  
**COMPRESS** — paragraph → word/label/value  
**VISUALIZE** — 数据关系更适合图形  
**DISCLOSE** — 移到 Details / Trace / Raw

不得增加第五类“美化”。

特别检查：

`<dl>`  
`form-help`  
`caption`  
`note`  
`eyebrow`  
`details/summary`  
event tables  
status prose  
diagnostic prose

这些是 agent 实现最容易滥用的“安全容器”。

---

### Phase E — representative migrations

不要按文件名平均施工，按信息类型迁移。

建议顺序：

**Inspector / Activity**  
→ **Telemetry**  
→ **Usage**  
→ **Attention / coordination**  
→ **Settings / runtime-control projection**  
→ **Home**  
→ **Pages**

前几个稳定后，再让其他页面消费同一 grammar。

否则一开始扫全站，Astra 很可能生成六套不同的 visualization。

---

### Phase F — progressive disclosure

全局确立至少三个信息深度：

**Glance**  
用户一眼知道发生什么。

**Inspect**  
用户理解为什么、看输入输出与关键指标。

**Trace**  
完整技术记录、IDs、events、JSON、provenance。

不是每个页面都必须显示这三个 tab；这是信息架构级规则。

尤其禁止：

> 为了“透明”把 Trace 层永远展开。

真正成熟的透明性是 **随时可验证**，不是 **永远占据注意力**。

---

### Phase G — visual QA

验收不只比较截图“更清爽”。

每个迁移 surface 必须回答：

| Gate | 问题 |
|---|---|
| Recognition | 常见动作是否不用读句子就能找到 |
| Ambiguity | icon-only 是否存在多义 |
| Scan | 5 秒能否找到 working / waiting / failed |
| Density | 默认状态是否只暴露完成当前判断需要的信息 |
| Truth | visual encoding 是否保留 unknown / incomplete / zero |
| Drill-down | 精确事实是否仍可获得 |
| Keyboard | 图形化后是否仍可完整操作 |
| Screen reader | 图标/图表是否有等价语义 |
| 390px | visual projection 是否退化而非截断 |
| 200% | 信息层级是否仍成立 |
| Dark/light | optical weight 与状态对比一致 |
| Regression | 新 PR 是否重新引入 paragraph-like UI |

---

## 一个可以冻结的总原则

我建议直接写进 design constitution：

> **Recognition before reading.  
> Structure before explanation.  
> Detail on demand.**

但下面再接一条 SE 约束：

> **Visualization is a projection, never a new source of truth.**

这样就不会滑向另一个极端——从“文字太多”变成“dashboard 太多”。

这尤其重要：OpenRouter 新 Activity dashboard 已经把 **spend / requests / tokens / cache hit / cost** 放成 KPI + sparkline，并且所有 chart 都能直接 drill 到原始 request；Braintrust Timeline 也从视觉 bar 回到 span detail。也就是说，成熟做法不是“图代替数据”，而是 **图负责定位，记录负责证明**。[OpenRouter Activity](https://openrouter.ai/blog/announcements/activity-dashboard/) · [Braintrust Traces](https://www.braintrust.dev/docs/observe/examine-traces)

这实际上与 Courtwork 的 SE 理念非常一致。

最后我会对 icon 单再加一条硬裁定：**目前不要引入第二个 icon runtime/library dependency。** 现有 `vendor/icons.svg + icon()` 的薄实现非常好。先扩充 canonical SVG registry；Phosphor/Hugeicons/MingCute 等是 design donor，而不是依赖树。等整轮 specimen 证明某一 family 在大量 CW-native semantic slots 上系统性优于 Lucide，再讨论迁移。这样 Astra 可以 full-write，但不会借“full write”之名把已经稳定的视觉基因一起推翻。
