值得，而且这类调研最好独立成一条 **“成熟系统设计谱系”**，不要做成普通竞品功能盘点。我用 Exa 按 9 条线扫了 90 个结果，并进一步复核了核心官方文档。比较明显的结论是：**传统软件真正积累了二三十年的部分，不是界面上有多少功能，而是对象怎样存在、状态怎样变化、谁可以修改、修改怎样留下历史、数据怎样与附件/索引/执行解耦，以及怎样保证几十年后还能迁移出去。**

你截图里对 Zotero 的抱怨反而是一个很好的切口。Zotero 今天可以越来越像“工作台”，但它最值得继承的并不是 PDF 阅读器和笔记，而是底下那个相当克制的资料治理模型。

| 谱系 | 代表系统 | 最值得研究的成熟做法 | 对后续自研最有价值的部分 |
|---|---|---|---|
| 文献 / 来源管理 | [Zotero](https://www.zotero.org/support/dev/web_api/v3/local_api)、[Tropy](https://docs.tropy.org/before-you-begin/metadata) | canonical item；附件/笔记作为附属对象；collection 与 tag 正交；metadata template；标准 vocabulary；本地数据库 + API | **记录 ≠ 文件 ≠ 阅读界面**；专家 schema 可以模板化，但自由 tag 仍保留 |
| 数据治理 | [DataHub](https://docs.datahub.com/docs/metadata-modeling/metadata-model)、[OpenMetadata](https://docs.open-metadata.org/v2.0.x/api-reference/main-concepts/high-level-design) | Entity / Aspect / Relationship；强类型 schema；ownership、glossary、lineage；版本与 timeseries 分离；变更事件 | 一个对象不必是不断膨胀的大 JSON；可以由可独立演化的 typed facets 组成 |
| 数据工程 | [dbt](https://docs.getdbt.com/docs/dbt-apis/project-state)、[Dagster](https://docs.dagster.io/guides/build/assets/metadata-and-tags/asset-observations) | definition state ≠ applied state；asset graph；materialization；observation；partition；test/check | **“定义的是什么”≠“真实跑成了什么”≠“刚观察到什么”** |
| 数据版本治理 | [lakeFS](https://docs.lakefs.io/guides/version-data/) | immutable commit；mutable branch/ref；zero-copy branch；merge/revert；pre-merge gate | Agent 或人都先在隔离状态施工，验证后再 promotion；历史状态可重现 |
| 长任务执行 | [Temporal](https://docs.temporal.io/encyclopedia/architecture/temporal-architecture) | append-only Event History；current mutable state；replay；Workflow / Activity 分离；Signal / Query | 执行日志不等于当前业务状态；决策逻辑与有副作用执行明确分开 |
| 知识工作 / 组织工程 | [Flowable CMMN](https://www.flowable.com/open-source/docs/cmmn/ch06-cmmn) | Case、Stage、Milestone、Plan Item、Sentry；optional/manual/repeatable task；case file | **不要把知识工作硬画成 BPMN 流水线**；维护“当前情境下什么可做/必须做/已经达到什么里程碑” |

### Zotero 这一支尤其值得拆

Zotero 的底层甚至比它现在的 GUI 更值得看。bibliographic item 是核心对象，attachment 和 note 是 child item；collection 更像 playlist，同一个 item 可以属于多个 collection，并不复制；tag 又是一条独立分类轴；Saved Search 则是动态投影。它的 metadata 在 SQLite，本地 API 又把数据库内部结构包在一个稳定接口后面，并有 object version 和增量读取机制。官方甚至明确不建议第三方直接修改 SQLite，而要求通过受验证的接口写入。

这其实给出了一个很强的原则：

> **canonical record 应该很无聊、很稳定；丰富体验应该主要发生在它上方。**

所以截图中的用户如果只需要“书目信息”，正确方向未必是重新造一个小 Zotero，而可能是一个很薄的 **reference registry / projection**：只消费 canonical metadata，PDF 阅读、批注、全文索引乃至 AI 问答全部成为可替换 downstream capability。

Tropy 又把这条路推进了一步。它不是把所有研究资料强行塞进固定 schema，而是区分 **structured template fields** 与 **free-form tags/notes**，同时要求 template property 尽可能映射到已有 metadata vocabulary。这个模式对任何“专家领域数据”都比让用户随便新增一百个 JSON key 更成熟。

### 数据治理软件给出的另一个重要提示：不要只有“一个 Matter JSON”

DataHub 的 `Entity → Aspect → Relationship` 很值得长期留作参照。Aspect 是最小写入单元，所以 Ownership、Description、Status、Glossary 等可以各自版本化和更新，而不需要一次重写整个 Entity。OpenMetadata采取了类似思路，并进一步把 entity document、relationship、version/change event、time-series extension 分开。

这意味着未来即便自己的对象叫 Matter、Source、Artifact、Expert、Tool，也完全可以是：

```text
Identity
  ├─ Descriptive metadata
  ├─ Ownership / authority
  ├─ Status
  ├─ Provenance
  ├─ Relations
  ├─ Policy
  ├─ Review state
  └─ Runtime observations
```

它们共同描述一个对象，却不必共享同一种生命周期。

这比“先做一个万能 schema，以后字段不断增加”更抗演化。

### dbt / Dagster 这一组甚至可能比很多 Agent framework 更值得借

dbt 很明确地区分 **Definition State** 和 **Applied State**：代码里宣称应该存在什么，与最后一次成功执行后现实里真正存在什么，是两个状态。一次最新 run 失败，并不会抹掉上一次成功 materialization 的事实。

Dagster又专门定义了 `AssetObservation`：**观察到了资产的新信息，并不意味着资产被修改了。**

这个区分非常重要。以后无论是人、脚本还是模型，都可能报告：

> “我发现合同日期可能是 9 月 3 日。”

这只是 observation；并不应该因此把 governed field `effective_date` 直接覆盖掉。

于是可以自然形成：

```text
Observation
     ↓
Proposal
     ↓
Validation / Review
     ↓
Accepted mutation
     ↓
New governed state
```

DataHub 自己甚至已经有相当接近的 **MetadataChangeProposal → MetadataChangeLog** 语义。

### Temporal 与 CMMN 则补上“真实工作是怎样发生的”

Temporal 的成熟点不是工作流 UI，而是把 **Event History、当前状态、Task、Worker、副作用 Activity** 分清。历史是 append-only 的事实来源，可以 replay；但用户查询的“现在怎么样”并不等于把 history 全部重新展示出来。

CMMN 更值得关注，因为它针对的恰好不是流水线型工作，而是律师、研究者、调查者、审批者这类 **case-based knowledge work**。一个 Case 可以有 Stage、Milestone、当前 available 的 actions；某个任务可能 required，也可能 discretionary；可以由条件激活，也可以等待人手动决定是否启动。

换句话说，它并不企图提前预测“Agent 从第 1 步走到第 17 步”，而是：

> **维护一个受治理的情境，并持续计算在这个情境里现在允许、要求、建议发生什么。**

这一点比很多今天的 `workflow builder` 更接近成熟的工作软件。

### 最后可以收敛成一套自己的选型原则

从这九条线看，我会把后续底座抽象成：

```text
                    ┌─ Search / Graph / Vector projection
                    ├─ GUI / mobile / report
Canonical State ────┼─ Agent compiled context
                    └─ external specialized software
       ↑
Govern / validate / review
       ↑
Proposal / observation / execution result
       ↑
Event / provenance / external source
```

文件和大对象再单独作为 Blob / Artifact 层，用稳定 ID、hash、URI 与 canonical state 关联，而不是让 PDF、图片、网页快照成为“数据库本身”。

这样以后接 Zotero、Tropy、DataHub、数据库、文件系统甚至新的 Agent runtime 时，接入的都是某个明确的边界，而不是又把一个庞大的“工作台”嵌进来。

所以我认为这一笔应当继续，而且**优先研究的不是“什么软件功能最多”，而是四件事：对象模型、状态机/变更模型、持久化与版本模型、外部互操作契约**。UI 可以作为第五层单独消费。这样传统软件几十年的工程经验可以被吸收，而它们积累下来的产品包袱不必一起继承。

下一轮若落成正式 explore，我建议直接做成一张 **Traditional Systems → Courtwork Primitives 映射表**：逐项登记 `可借鉴机制 / 不应照搬的历史包袱 / 可直接接入的协议或 API / 何时才值得实现`。这会比再做一份泛泛的竞品报告有用得多。
