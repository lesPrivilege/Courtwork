这轮 complex explore 已经可以进一步收敛。Exa 共扫了 **181 个候选结果，按 10 条研究线**交叉看了文献/文档管理、DMS、CAS/版本存储、消息协议、Agent Task/Artifact、runtime persistence、metadata governance、annotation、provenance、observability 与资源 UI；下面只保留我认为能被现有研发理念直接消费的机制，以官方规范和一手实现为主。

核心判断是：**不应先做“Agent 文件管理器”，而应先做一层通用的 Content / Resource Governance Fabric。** 文件、消息、上传附件、Agent 产物、引用资料都进入同一个治理平面；Project、Matter、Agent、Run、Conversation 只是它们的不同挂载与语义作用域。Finder 或传统目录最多成为 projection，而不再决定对象身份。

### 1. 最值得立即冻结的，是这几个对象之间的边界

我建议最小模型先形成下面这组关系：

```text
                          ┌── Annotation
                          │
Blob ──► Revision ──► Artifact ◄──── Binding ──── Project
  │          │              │                    Matter
  │          ├─ Representation                    Agent
  │          │   (OCR / preview / text)           Run
  │          │                                    Conversation
  │          └─ Derived Projection
  │              (chunks / index / embedding)
  │
Message ─────── Parts ──────┘

Run / Task ── used ───────► Artifact
           └─ generated ──► Artifact

Event / Provenance
      └──────── tracks all accepted state changes
```

其中几个词必须严格分开：

| 对象 | 应承担的东西 | 不应该承担的东西 |
|---|---|---|
| **Blob** | 不可变 bytes、hash、size、MIME、storage locator | 项目归属、标题、业务状态 |
| **Artifact** | 一个稳定的“东西”的身份，例如某份合同、报告、截图、Agent 输出 | 物理文件路径 |
| **Revision** | Artifact 某次有意义的内容版本 | preview/OCR 等可重建缓存 |
| **Representation** | 同一 revision 的 PDF、纯文本、缩略图、OCR 等表示 | 新业务版本 |
| **Message** | 用户/Agent 的一次交流事件，由若干 Part 构成 | 最终工作交付物本身 |
| **Run / Task** | 一次明确执行的生命周期与 provenance | 长期知识库 |
| **Binding** | Artifact/Message 与 Matter、Agent、Project、Run 等的关系 | 复制文件 |
| **Annotation** | 面向整个资源或资源局部的标注、判断、review、引用 | 修改原文件 |
| **Projection** | 全文索引、chunks、embedding、摘要、搜索文档 | canonical truth |

这个拆法并不是为了抽象好看，而是几个成熟体系在不同领域独立收敛到了非常接近的边界。

尤其是 A2A 当前规范已经明确把 **Message 与 Artifact 分离**：Message 是沟通，Artifact 是 Task 产生的交付物，而且规范明确建议“不要把 Task 输出塞进 Message”。Task 结束后也不重开，follow-up/refinement 应形成新 Task、新 Artifact，由客户端管理版本关系。这个语义几乎可以原样吸收进内部模型。 [A2A Definition](https://a2a-protocol.org/dev/definitions/) · [Life of a Task](https://a2a-protocol.org/dev/topics/life-of-a-task/)

### 2. Agent 中间文件不能一股脑进入“公共区”，需要 Promotion Lifecycle

这是这一轮我认为最重要的新增裁决。

Agent 运行会产生大量有用程度极不均匀的东西：下载文件、网页快照、临时 CSV、转换后的 Markdown、OCR、代码生成的 PNG、阶段报告、失败尝试、最终 deliverable。如果默认全部进入长期 Library，很快又会得到一个比 Finder 更糟的垃圾场。

比较合理的是四级状态：

| Tier | 用途 | 默认持久化 | 搜索/索引 | 进入 Matter Library |
|---|---|---:|---:|---:|
| **Scratch** | 临时下载、转换、工具中间产物 | TTL | 否/轻量 | 否 |
| **Working** | 恢复 Run、调试、阶段性结果 | 中期 | 可选 | 默认隐藏 |
| **Shared** | 用户上传、被引用的资料、正式 Agent 输出 | 长期 | 是 | 是 |
| **Record** | 已采纳证据、正式交付、需审计材料 | policy-controlled | 是 | 是，强治理 |

这个模式可以直接消费 DVC、OCFL、Paperless 与 LangGraph 各自成熟的部分。

[DVC](https://docs.dvc.org/user-guide/project-structure/internal-files) 已经证明 content-addressable cache 很适合把“逻辑路径”与 bytes 分离，相同内容只存一次；run cache 又单独记录运行复现信息。[OCFL](https://ocfl.io/1.1/spec/) 更进一步，把内容地址、逻辑路径、immutable version、manifest/fixity 分开，并明确把“正在组装的新版本”先放在不会被正式 reader 看见的临时区域，最后原子晋升。这几乎就是 Scratch → governed Revision 的成熟版本。

而 [LangGraph persistence](https://docs.langchain.com/oss/python/langgraph/persistence) 的区分也非常有用：checkpointer 是 **thread-scoped short-term execution state**，store 才是 cross-thread durable information。它甚至特别提醒 checkpoints 会无限增长，需要 retention/pruning。因此即便未来 Runtime 可替换，这个边界也应该独立存在：

```text
Runtime Checkpoint ≠ Governed Shared State
```

也就是说，Runtime 可以自己维护 checkpoint，但只有通过 promotion 才进入长期治理面。

### 3. 用户上传附件应当从 Message 中“升格”为公共资源，而不是永远困在对话里

例如用户在某条 Message 上传 `contract.pdf`：

```text
upload bytes
    ↓
Blob #sha256...
    ↓
Artifact A
    └─ Revision A1 / original
          ↓
          ├─ Representation: extracted text
          ├─ Representation: page previews
          ├─ Search Projection
          └─ Annotation targets
```

然后建立关系：

```text
Message M7 ──attached──► Artifact A
Conversation C ────────► Artifact A
Matter X ──source──────► Artifact A
Agent Contract ─used───► Artifact A
Workspace Library ─────► Artifact A
```

**没有任何一份 PDF 被复制四次。**

JMAP 是这方面非常成熟的旁证。它把结构化对象与 binary Blob 完全分开，Blob 有独立 ID；[RFC 9404](https://datatracker.ietf.org/doc/html/rfc9404) 甚至提供反向 lookup，“哪些结构化对象正在引用这个 Blob”。这正适合以后做 retention / GC：

```text
blob 没有任何有效 reference
+ 不在 legal hold / retention window
→ 才有资格 GC
```

这比按文件夹扫“这个文件还能不能删”稳健得多。[JMAP Core](https://datatracker.ietf.org/doc/html/rfc8620) 的 state/change/optimistic-concurrency 机制也值得借，但无需实现整套 JMAP。

### 4. “公共区”最好不是 Public，而是 Workspace Library

`Public` 容易和权限语义混淆。我更建议产品语义叫 **Library / Shared Resources / Workspace Library**。

它不是一个物理目录，而是一组 virtual collections：

```text
Library
├─ Inbox             新进入、尚未治理
├─ Shared            可跨 Run / Conversation 复用
├─ Generated         Agent 生成的 durable artifacts
├─ Sources           用户上传 / 外部资料
├─ Cited             已被正式结果引用
├─ Needs review      待确认
└─ Unfiled           已持久化但尚无 Matter binding
```

这些都应该是查询，不必成为真实文件夹。

[Paperless-ngx](https://docs.paperless-ngx.com/usage/) 已经把这套 UX 做得相当成熟：consumption directory 只是临时入口，文件随后进入受管理存储；原件永远保留；OCR、归档版和搜索是下游结果；dashboard 本质上由 Saved Views 构成，而 tag 比 folder 更基本。

[Mayan EDMS](https://docs.mayan-edms.com/chapters/features.html) 的做法更加值得消费：它同时支持 **Cabinet（人为层级）** 和 **自动 Index Tree（按 metadata 生成的动态层级）**，同一个 Document 可以同时存在于多个 Cabinet，而且还能把这些虚拟结构暴露成 **只读 filesystem** 给旧软件使用。

所以以后甚至可以反过来兼容 Finder：

```text
Matter / Project / Agent UI
        ↓ canonical
Resource Fabric
        ↓ projection
read-only Finder/filesystem view
```

而不是：

```text
Finder folder
    ↓
强行反推 Matter / Agent 语义
```

这恰好解决你说的“用户自己到 Finder 里面找，它又不会挂在 Matter Agent 下”的问题。

### 5. 前端值得做，而且不应该做成普通 Finder clone

我会把它做成 Matter/Project 内嵌的 **Resource Surface**。

桌面宽屏最自然的是：

```text
Scope                Virtual collection                 Inspector

Matter X             contract.pdf                       Preview
├ Sources            evidence.xlsx                     Metadata
├ Outputs            memo-v3.docx                     Provenance
├ Messages           screenshot.png                   Relations
├ Runs               research-notes.md                Annotations
└ Shared                                             Versions
                                                    Index status
```

这里非常关键的一点是：

**拖一个文件进入 Matter，不应等于移动物理文件，而是新增一个 Binding。**

于是同一 Artifact 可以同时出现在：

```text
Matter / Acquisition
Agent / Legal Expert
Run / 2026-09-12-004
Shared / Sources
Tag / governing-law
Saved View / Needs Review
```

不会复制。

进一步可以有 `List / Cards / Timeline / Lineage` 四种投影，但 Graph/Lineage 我会放得较深。普通工作状态首先应该看“有什么”“什么需要 Attention”“是谁产生的”“现在是不是正式版本”，而不是被一张巨大关系图淹没。

MCP 2026-07-28 的 Resource 规范甚至已经明确说，Host 可以把 resources 暴露成 tree/list、搜索过滤或自动纳入 context，而且每个 resource 可以有 URI、MIME、size、`audience`、`priority`、`lastModified`。[MCP Resources](https://modelcontextprotocol.io/specification/2026-07-28/server/resources)

因此内部完全可以有：

```text
courtwork://artifact/01K...
courtwork://artifact/01K.../revision/3
courtwork://matter/M123/resources
courtwork://message/MSG456
courtwork://annotation/ANN789
```

然后 MCP adapter 只是把 governed resource 投影出去，而不是让 MCP server 直接碰底层目录。

### 6. Annotation 应该成为一等公民，而不是某种 PDF reader feature

这一轮 W3C Web Annotation 的命中很高。[W3C Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) 从一开始就是为了让 annotation **可以跨平台共享和复用**，核心非常简单：

```text
Annotation
   ├─ Body
   └─ Target
        └─ Selector
```

Target 不只能是一整份文件，也可以是文本 quote、字符区间、图片区域等。

所以以后可以统一表示：

```text
用户高亮
Agent 抽取字段
Agent 判断“这一条存在冲突”
Citation
Review comment
Classification
Needs verification
Expert approval
```

区别只体现在 `motivation / type / actor / confidence / review_state`。

这比：

```text
PDF annotation table
Message annotation table
Contract extraction table
Agent review table
```

各造一套，更适合长期治理。

更重要的是，Annotation 的 target 应指向 **Artifact Revision**，而不是“当前文件名”。否则版本更新之后，老判断会悄悄漂移。

### 7. Index 也应该降格为可重建 Projection

公共区里做全文、chunk、embedding 很值得，但必须防止它重新变成事实源。

建议索引键至少包含：

```text
source_artifact_id
source_revision_id
pipeline_id
pipeline_version
security_domain
created_at
```

这样同一 revision 已经做过 OCR/解析/chunk 时，可以跨 Message、Run、Matter Binding 复用，不需要重新算；但一旦 Revision 或 parser/chunker 版本变化，就知道旧 projection 是否失效。

这也意味着：

```text
Raw Blob
   ↓
Normalized text
   ↓
Chunk set
   ↓
Embedding / Fulltext Index
```

下面三层都可以扔掉重建。

而 `Annotation / Matter State / accepted metadata` 不属于这一类，不能因为重建 index 就丢失。

### 8. 对话数据则建议走“事件账本 + 当前投影”，不要把 Message 当普通 mutable row

Matrix 与 JMAP 在这一点上提供了很好的成熟范式。内部可以保持：

```text
Conversation
   └─ MessageEvent*
        ├─ text Part
        ├─ ArtifactRef Part
        ├─ structured Part
        └─ relation
             ├ reply-to
             ├ supersedes/edit
             ├ redacts
             └ references
```

Message 拿稳定 ID。Edit 不直接改原事件，而是产生一个 revision/relation；默认 UI 只 materialize 最新状态。

这样你同时获得：

```text
audit history
current clean chat UI
引用稳定性
attachment reuse
message-level annotation
cross-session retrieval
```

而 Run trace 只**引用** message/artifact ID。

这点也需要强约束：

```text
Conversation Record ≠ Runtime Trace ≠ Model Context
```

[OpenTelemetry](https://opentelemetry.io/docs/concepts/signals/traces) 很适合 Run / model call / tool call 的 tracing，但不应该拿来当对话数据库。Span 记录操作、时间、attributes、links；真正的大文本、附件和业务对象放治理层。这样还避免为了“可观测”把敏感用户内容复制一份到 telemetry backend。

同理，模型内部隐藏推理内容也不应因为我们建设治理层而被当成普通 Artifact 保存；治理对象应是显式输出、工具结果、可恢复运行状态与实际产生的文件。

### 9. Provenance 不用自创一整套语义

W3C PROV 其实非常贴这一层。[PROV-DM](https://www.w3.org/TR/prov-dm/) 的核心只有：

```text
Entity
Activity
Agent

Activity used Entity
Activity generated Entity
Entity wasDerivedFrom Entity
Entity wasAttributedTo Agent
```

对应过来非常直接：

```text
ArtifactRevision = Entity
Run / Tool invocation = Activity
User / Agent / Runtime = Agent

Run used Source A
Run generated Output B
B wasDerivedFrom A
B wasAttributedTo Agent X
```

不建议内部真的全部 RDF 化；但是关系命名和语义可以向 PROV 对齐。以后导出、企业治理、专家审计都会轻松很多。

### 10. 因而“消费还是自研”可以明确分层了

| 外部体系 | 当前处置 | 吸收什么 |
|---|---|---|
| **A2A** | **协议语义直接对齐** | Message / Task / Artifact / Part |
| **MCP Resources** | **外部资源接口直接兼容** | URI、ResourceLink、annotation hints、subscription |
| **W3C Annotation** | **数据模型直接借鉴** | Body / Target / Selector / Motivation |
| **W3C PROV** | **provenance vocabulary 对齐** | used/generated/derived/attributed |
| **OCFL** | **存储与版本原则借鉴** | immutable revision、manifest、fixity、logical/physical separation |
| **DVC** | **CAS/GC 机制借鉴** | content hash、dedup、reference-driven retention |
| **JMAP** | **Blob/Record 与同步模型借鉴** | Blob 独立、reverse references、state/changes |
| **Paperless / Mayan** | **主要消费 UX 与 DMS grammar** | inbox、saved views、virtual cabinet/index、history/inspector |
| **DataHub / OpenMetadata** | **消费 schema/aspect/lineage 思想；后期 connector** | Entity/Aspect/Relationship、ownership、change stream |
| **LangGraph 等 Runtime store** | **仅作为 Runtime adapter** | checkpoint，不成为 canonical store |
| **OpenTelemetry** | **直接用于 telemetry** | trace/span/link，不承载 canonical content |

因此我**不建议现在把 Paperless、Mayan、DataHub 或任意 DMS 整个嵌成 Courtwork Core**。它们可以成为外部 connector 或设计来源。真正需要自研的是薄而稳定的一层：

```text
Resource Identity
+ Blob / Revision
+ Binding
+ Lifecycle / Retention
+ Annotation
+ Provenance
+ Index Projection Contract
```

这层其实不大，却是以后 Zotero、email、GitHub、MCP、Agent runtime、文件系统、专家包全部汇流时最不容易折旧的一层。

### 建议的施工顺序

第一轮可以暂时完全不碰复杂 Graph UI，而冻结 `Blob / Artifact / Revision / Message / Run / Binding / Annotation` 七个对象和 lifecycle；同时实现最小 ingest/promotion。第二轮接全文 extraction/index 和 provenance，再做 Matter 内的 Library/Inspector。第三轮才暴露 MCP Resource URI、Finder read-only projection、外部 DMS/metadata connector。

其中 **Binding + Promotion** 是我认为最值得先验证的两个 primitive：前者解决“一个东西到底属于哪个 Project/Matter/Agent”的问题，后者解决“Agent 运行产生的一大堆东西，到底哪些值得成为长期资产”的问题。

它也与现有治理方向完全对齐：**存储先接受事实，治理决定其身份和生命周期，检索只消费受治理对象，Context 再从这些对象编译，而不是从某个目录或完整 transcript 直接塞回模型。**
