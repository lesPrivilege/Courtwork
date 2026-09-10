我用 Exa 扫了 46 个结果，分成 3 条 workstream：**data contract / lineage、ownership / organizational interface、policy / workflow / provenance**。比较下来，真正适合后续局部选型的不是再找一个“大框架”，而是取已经稳定了十年以上或已经形成开放标准的“小语法”。

我会先建立下面这张 index。

| Courtwork / SE 局部 | 最值得消费的成熟实践 | 建议消费什么 | 不建议照搬 |
|---|---|---|---|
| **Matter / governed object contract** | [ODCS 3.1](https://github.com/bitol-io/open-data-contract-standard) | `id/version/schema/quality/SLA/owner/role/reference/support` 的组织方式；JSON Schema 验证；Git versioning | 不把 Matter 生硬叫 Data Product |
| **Schema 演化** | Confluent Schema Registry compatibility model | `backward / forward / full / transitive`；breaking-change gate；deprecation window | 不绑定 Kafka |
| **Event / Run trace** | [OpenLineage](https://github.com/OpenLineage/OpenLineage/blob/main/spec/OpenLineage.md) | `Job ≠ Run`、START/COMPLETE/FAIL、input/output、parent run、source code SHA、extensible Facet | 不把所有 Courtwork event 强行做成 data lineage |
| **Provenance** | [W3C PROV-DM](https://www.w3.org/TR/prov-dm/) | `Entity / Activity / Agent`；used / generated / derived / associated / attributed；Role / Plan | 不必引 RDF/OWL runtime |
| **组织资产目录** | [Backstage Software Catalog](https://backstage.io/docs/features/software-catalog/) | entity registry、`owner / domain / system / dependsOn / provides / consumes`、source-controlled metadata | 不引整个 Backstage |
| **Expert / team interface** | [Team API as Code](https://github.com/TeamTopologies/TeamAPI-As-Code) | machine-readable capability/interface、依赖、interaction mode、channel、service、duration | 不照搬人类会议字段 |
| **组织决策历史** | ADR + 2026 Team Topologies **SDR** | `status / context / decision / owner / consequences / informed / date`；当前接口和历史决策分离 | 不把每次小操作写成 decision record |
| **Authority / permission** | [Cedar](https://docs.cedarpolicy.com/overview/patterns.html) | Principal–Action–Resource–Context；RBAC + ABAC + ReBAC；resource relationship；deny/permit | 不拿它处理任意业务规则 |
| **一般治理规则** | OPA / Rego | policy-as-code、PDP/PEP、CI validation、外部数据参与决策 | 不把 authorization 也全部塞进 Rego |
| **Human workflow semantics** | [BPMN / Camunda workflow patterns](https://docs.camunda.io/docs/components/concepts/workflow-patterns/) | user task、wait、timer、message correlation、escalation、interrupt/non-interrupt、compensation、parallel join | 暂不采用 BPMN 作为 Courtwork UI 或 canonical runtime |
| **长任务 durability** | [Temporal durable execution](https://temporal.io/blog/what-is-durable-execution) | replay、durable wait、signal、retry、child workflow、crash recovery | 不让 Temporal workflow model 反过来定义 Matter |
| **Control plane / discoverability** | DataHub / OpenMetadata | governed metadata graph、ownership、lineage、contract、quality、progressive disclosure | 产品太重，只学模型/UI |
| **创建时治理** | Backstage Scaffolder / golden path | schema-first creation、默认 owner、policy gate、模板化起点 | 不建设通用 developer portal |

这里有几项我认为与 SE **尤其同构**。

### 1. ODCS：最适合拿来重新审视 Matter Schema

ODCS 已经证明一个“contract”不应该只有字段定义。它同时容纳：

```text
identity
version
status

schema
semantics
quality

owner
team
roles

SLA
support
references
infrastructure
```

这很值得 Courtwork 消费，因为一个 `Matter` / `Expert` / governed artifact 的 schema 同样不能只有：

```text
type
fields
value
```

而应天然考虑：

```text
Matter Schema
├── identity
├── lifecycle
├── semantics
├── constraints
├── authority
├── ownership
├── provenance
├── review policy
└── evolution policy
```

关键不是复制 ODCS 字段，而是消费它已经成熟的判断：

> **Schema 是 contract 的组成部分，而不是 contract 本身。**

这会很好地防止 Schema Engineering 被误解成 JSON Schema Engineering。

---

### 2. OpenLineage：几乎可以直接给 Courtwork 的 Run/Event 设计做 precedent

OpenLineage 有一个非常漂亮的切分：

```text
Job = 相对稳定的定义
Run = 一次执行实例
Run Event = 实例发生的事件
Dataset = 工作对象
Facet = 可扩展观察面
```

放到 Courtwork：

```text
Expert / Procedure
        ↓
       Run
        ↓
Run Events ──────→ Matter / Artifact
        │
        └──── facets
             model
             tool
             policy
             review
             cost
             provenance
```

特别值得借的是 **Facet**。

Core event schema 可以非常薄，而：

```text
modelFacet
toolFacet
reviewFacet
authorityFacet
attentionFacet
evidenceFacet
```

均可独立 version。

这与目前“Durable State Interface 稳定，Harness context policy 不急于冻结”的原则很合适。 

---

### 3. W3C PROV：不需要使用其技术栈，但应该消费 ontology

它十几年前已经解决了一套我们今天又会重新发明的命名：

```text
Entity
Activity
Agent

Entity wasGeneratedBy Activity
Activity used Entity
Entity wasDerivedFrom Entity

Activity wasAssociatedWith Agent
Entity wasAttributedTo Agent

Agent hadRole Role
Activity hadPlan Plan
```

对于 Courtwork，这能让：

```text
谁
用什么
依据什么
做了什么
产生什么
由什么派生
承担什么角色
```

有一个成熟、跨领域的底层词汇。

我会将其列为 **semantic precedent，而非 implementation dependency**。

---

### 4. Backstage：这是“组织工程”一侧非常值得深挖的 precedent

Backstage 的巧处并不只是 developer portal，而是把现实组织编码成一个很薄的 entity graph：

```text
Domain
  ↓
System
  ↓
Component
  ↓
API / Resource

        ↑
      ownedBy
        ↑
      Group
        ↑
      User
```

再加：

```text
dependsOn
partOf
providesApi
consumesApi
```

而 source of truth 可以只是 repo 里的 YAML，owner 自己通过 Git workflow 维护。

Courtwork 可以产生一个非常相似但更工作导向的 registry：

```text
Matter
Expert
Procedure
Schema
Policy
Tool
Source
Artifact
Actor
```

relations：

```text
ownedBy
governedBy
performedBy
reviewedBy
dependsOn
produces
consumes
derivedFrom
supersedes
```

这可能比一上来构建“knowledge graph”更加克制。

---

### 5. Team API + SDR：可能是“组织工程”中最值得 Courtwork 原样吸收思想的一组

Team API 已经真的有 machine-readable YAML：

```yaml
team
focus
services
dependencies
interactions
interaction.mode
purpose
expectedDuration
```

而今年 Team Topologies 又进一步提出 **Social Decision Record**，沿用 ADR 体例：

```text
Status
Owners
Informed
Date
Context
Decision
Consequences
```

二者的关系非常漂亮：

```text
SDR = 为什么形成今天这个组织关系
Team API = 今天这个组织关系是什么
```

对应 SE：

```text
Decision/Event history
          ↓ fold
Current governed state
```

这几乎就是：

> **Event Log ≠ Matter State**

在人类组织设计里的成熟 precedent。

而 Experts 也可以采用类似思想：

```text
Expert manifest = 当前能力接口
DEC / change record = 为什么现在如此
```

这样 Agent 不需要从一堆历史 commit/聊天中猜当前 Expert 到底负责什么。

---

### 6. Cedar：Authority 很可能应该单独选型，而不要和 Prompt Policy 混在一起

Cedar 的基本问题非常干净：

```text
Can
Principal
perform Action
on Resource
under Context?
```

它把：

- RBAC：因为你是什么角色；
- ABAC：因为你/对象具有某属性；
- ReBAC：因为你与这个对象有什么关系；

分开处理。

这对 Matter 尤其重要。

例如：

```text
Actor: ContractExpert
Action: propose_revision
Resource: Matter/123
→ allow

Actor: ContractExpert
Action: execute_external_signature
Resource: Matter/123
→ deny

Actor: HumanReviewer
Action: approve
Resource: Matter/123
when risk < threshold
→ allow
```

这里最好不要让模型决定。

所以我倾向形成明确的：

```text
Model policy
    ≠
Execution authority
```

Cedar 可以成为后者的 precedent。

而 **OPA** 留给更一般的：

```text
是否满足组织 policy
是否允许进入某 workflow state
是否满足发布条件
是否需要 attention
```

也就是 **Cedar for authority，OPA-style policy for governance**，先作为概念选型，不急于同时引入两个 runtime。

---

### 7. BPMN：非常值得“消费语法”，但目前不值得采用框架

Camunda 文档里几十年积累下来的 workflow primitives 很有价值：

```text
sequence
exclusive choice
parallel split/join
multi-instance
wait
timer
message
signal
escalation
error
compensation
subworkflow
human task
```

对于 Courtwork，我特别建议消费五个：

```text
wait
human task
escalation
compensation
message correlation
```

Attention 可以因此不再自说自话。

例如：

```text
agent working
     │
     ├── wait(external reply)
     │
     ├── escalation(human judgment)
     │
     ├── user task(review)
     │
     └── compensation(revert action)
```

这些都是有几十年工作流经验沉淀的语义。

但我**不建议现在引 Camunda，也不建议让 BPMN 成为 SE ontology**。它太偏 execution topology，而 Matter State 应比某个 workflow 更稳定。

---

### 8. Temporal：适合以后 Harness runtime 选型，不适合定义产品 ontology

Temporal 最值得消费的不是 API，而是：

> **execution itself can be durable.**

于是无需：

```text
run
→ save progress manually
→ crash
→ inspect DB
→ reconstruct state
→ guess next step
```

而是 execution history 可 replay。

这与 Courtwork 长任务、human wait、外部系统等待、多 experts 都天然相合。

但边界应该保持：

```text
Matter State        ← stable domain truth
Event Log           ← durable evidence
Temporal Workflow   ← one execution mechanism
```

而不是：

```text
Matter = Temporal Workflow State
```

否则 runtime 就侵入了 SE 的稳定层。

---

## 因而后续可以形成 4 个局部 Explore 包

如果交给本地 agent，我会按这个顺序，而不是一次建设“大型组织工程层”：

1. **Contract & Evolution Index**：ODCS + Schema Registry + dbt contract，产出 Courtwork `governed-object` / schema lifecycle 选型。
2. **Provenance & Event Index**：OpenLineage + W3C PROV + CloudEvents/Trace Context，专门裁 Event Log envelope、Run/Activity/Artifact relations 与 facets。
3. **Ownership & Organization Index**：Backstage Catalog + Team API + SDR + CODEOWNERS，裁 Expert manifest、ownership、dependency、organizational registry。
4. **Authority & Work Index**：Cedar + OPA + BPMN patterns + Temporal，裁 permission/privilege、Attention escalation、human task、durable execution，**只到 interface / precedent，不急于 runtime 施工**。

这里面我认为**最近就值得进入 Courtwork roadmap 的四笔**是：

**OpenLineage Facet → Event 伸缩机制；Backstage entity relations → registry；Team API/SDR → Expert + organizational interaction；BPMN escalation/user-task/wait → Attention 状态语法。**

它们共同的优点是：不要求引入重型依赖，却能显著减少现在继续“临时造词”的风险。真正涉及 runtime 的 Cedar/OPA/Temporal，可以待 Harness 下一轮架构选型再决定。
