我用 Exa 看了约 30 个结果，分成 Data Mesh / Team Topologies、组织设计、2025–2026 agentic organization 三条线。一个很值得收进 SE 的结论是：

> **数据工程与组织工程正在合流。**
>
> 数据工程解决的已不只是“数据怎么流”；组织工程解决的也不只是“人怎么分组”。两者共同处理的是：**谁对什么状态负责，依据什么规则，经过什么接口，与谁协作，什么可以改变，以及改变之后如何留下可追溯的组织事实。**

这可能比单独谈“memory / context engineering”更上位。

### 1. 两条路线实际上已经走到了同一个地方

Zhamak Dehghani 的 Data Mesh 很明确：它不是换一套 data stack，而是同时改变**技术架构与组织结构**。四个核心恰好是：

| Data engineering | 对应的 organization engineering |
|---|---|
| Domain data product | 责任边界 / domain |
| Product owner | ownership |
| Schema / SLA / contract | team / domain interface |
| Self-serve data platform | 降低组织认知负担的平台 |
| Federated computational governance | 分布式 decision rights |
| lineage / metadata | accountability / organizational memory |
| policy-as-code | 可执行的组织规则 |

Dehghani甚至把 data product 定义为可以独立演化的 **architectural quantum**；它同时也是一个 ownership quantum。也就是说，“这份数据是什么”已经不能脱离“谁维护它、谁保证它、谁允许改变它”来定义。  
[Data Mesh Principles](https://martinfowler.com/articles/data-mesh-principles.html)

而 Team Topologies 从另一边抵达同一位置。它真正有用的地方并非“四类团队”，而是：

**把组织间交互也做成 interface。**

Collaboration、X-as-a-Service、Facilitation 都是在约束**什么交互需要高带宽、什么应该被稳定接口替代**；platform 的首要目的也不是“大一统”，而是减少 stream-aligned team 的认知负载。  
[Team Topologies](https://teamtopologies.com/key-concepts)

所以可以写成：

```text
software architecture
      ↕
data architecture
      ↕
organization architecture
```

三者不是彼此独立的设计问题，而是同一个 socio-technical system 的三种投影。

---

### 2. Agent 出现以后，这个合流突然变成了工程问题

过去“组织规则”大量存在于：

```text
人的脑子
会议
SOP
政策文件
权限系统
组织惯例
邮件
历史案例
```

它们可以含糊，因为最终执行者是人。

Agent 要执行工作之后，这种含糊无法维持。2026 年一篇很贴近这个问题的论文直接提出 **Organizational Memory for Agentic Business Process Execution**：

> 企业不应给每个 agent 各塞一套 prompt / RAG，而需要一个共享、受治理、agent-consumable 的组织记忆层。

它提出的要求几乎可以直接翻译成 SE：

**原子化、冲突管理、来源追踪、按 context 渐进披露、版本演化、ownership、read/write 权限、人类治理。**

尤其值得注意的是作者明确反对：

```text
组织知识 → 转成一大坨纯文本 → RAG
```

而要求把规则分解为**可独立寻址、比较、更新、治理的 process atoms**。  
[Organizational Memory for Agentic Business Process Execution](https://doi.org/10.48550/arxiv.2607.03228)

这和 SE 的方向高度接近。

---

### 3. 因而我会把“组织工程”定义得比传统 Org Design 更窄、更硬

不是：

> 用工程方法管理员工。

而是：

> **把一个组织完成工作的稳定结构，编码成可治理、可查询、可执行、可演化的状态与接口。**

可以有六类一等公民：

```text
Actor / Role
    谁

Authority
    可以决定或改变什么

Policy
    应当/不得怎样

Process
    工作状态如何迁移

Interface / Contract
    跨边界交换什么

Record / Evidence
    为什么这样做、依据是什么
```

这样一来：

**组织结构不再等于 org chart。**

org chart 只是 Actor / reporting relationship 的一个 projection。

真正的 organization state 是一个不断演化的、typed + versioned + attributable system。

---

### 4. 这恰好解释 SE 为什么不应该退化成 Memory Engineering

我认为可以形成一个相当漂亮的层级：

```text
Data Engineering
治理“事实如何存在、变化和流动”

Organization Engineering
治理“责任、权力、规则和工作如何存在、变化和流动”

Schema Engineering
提供二者共同的可执行表述与治理基底

Agent Harness
在某次任务中消费这些被治理的状态
```

因此 SE 的：

> **Store → Govern → Retrieve → Compile**

突然有了更大的解释力。

它不仅适用于 knowledge。

例如组织中的“合同金额超过 X 必须由谁复核”：

- 不是 prompt；
- 不是 memory；
- 不是 transcript；
- 甚至主要不是“知识”。

它首先是一个**组织规则对象**。

Agent runtime 只是在某一个 task/matter 中把它 compile 进当前可执行世界。

---

### 5. 这也进一步支持你此前坚持的三层切分

```text
Event Log
发生了什么

Matter State
这个具体工作对象现在是什么状态

Compiled Context
这个 agent 此刻需要看到什么
```

现在可以再看到一个横向的东西：

```text
          Organization State
                 │
       ┌─────────┼─────────┐
       ↓         ↓         ↓
    Matter A  Matter B  Matter C
```

但我**不建议因此机械增加第四个 Store**。

Organization State 更像一个跨 matter 的 governed namespace：

```text
roles/
policies/
authorities/
procedures/
experts/
schemas/
contracts/
precedents/
```

具体 matter 引用它；runtime 根据 task、role、authority、matter state 编译需要的 slice。

所以：

> **全量 organizational memory 的意义不是全部塞入 context，而是系统知道这些组织事实存在，并能根据工作状态和权限精确披露。**

这与此前你说的“知晓其存在，再渐进披露”完全吻合。 

---

### 6. Courtwork 会成为非常好的 Organization Engineering specimen

法律工作尤其适合，因为法律组织本身就是高度显式的责任系统：

```text
Matter
 ├─ participants
 ├─ engagement scope
 ├─ authority
 ├─ governing rules
 ├─ evidence
 ├─ work products
 ├─ review requirements
 ├─ decisions
 └─ provenance
```

然后 Experts 不再只是：

> Contract Expert Prompt

而可以变成：

```text
Expert
├── capability
├── permitted matter slices
├── tools
├── procedures
├── governing schemas
├── review obligations
├── escalation conditions
└── output contracts
```

这就把 **multi-experts** 从“多 agent UX”提升为了**组织拓扑**。

Attention 也随之获得更准确的位置：

> Attention 不是 inbox widget，而是 **organizational exception / decision routing plane**。

当 autonomy 越界、证据不足、authority 不够、schema 无法收敛、规则冲突时，工作对象才进入 human attention。

这比“human-in-the-loop”精确很多。

---

### 7. 最新 agent 研究已经开始碰到这一点，但整体仍很早

例如 2026 年的 *Governance by Design* 基于一家大型 IT 服务企业的 agent 部署案例，发现规模扩大以后核心问题从“agent 能做什么”转成：

> **decision rights、memory configuration、data access 怎么被编程。**

其架构开始出现：

```text
governed data
→ orchestrator
→ specialist agents
→ independent review
→ human checkpoint
→ audit trace
```

而且 governance 不再是外围 compliance，而进入 tool selection、source constraint、memory、review loop 本身。  
[Governance by Design](https://arxiv.org/html/2605.20210v1)

这正是 **organization engineering becoming software architecture**。

不过这里要保持一点克制：2026 年出现了不少“Agent Organization”预印本，目前大量仍是 prototype、synthetic eval 或单案例研究。概念信号很强，经验结论还远没有 Data Mesh / Team Topologies 那么成熟。

---

### 我认为可以给 SE 加入一个非常有力量的命题

不是把 Paper 改写成 Organization Engineering，而是在合适的位置指出：

> **As agents move from answering questions to performing organizational work, data engineering becomes inseparable from organization engineering. The system must govern not only what is known, but who owns it, which rules are binding, who may change state, and how responsibility crosses boundaries.**

然后 SE 可以被定位为两者之间缺失的 substrate：

```text
             Organization
           /              \
 responsibility          work
        /                  \
    Schema ─────────────── Data
        \                  /
     provenance          state
           \              /
              Runtime
```

这比“我们提出一种新的 agent memory”大得多，也比泛泛的“AI-native organization”要硬得多。

甚至可以浓缩为一句：

> **数据工程使组织事实可计算；组织工程使组织责任可计算；Schema Engineering 使二者可治理。**

我认为这条值得单独建立一个 research index，并进一步做 **Organization Stress Benchmark**：policy supersession、ownership transfer、authority conflict、cross-matter disclosure、expert handoff、human escalation、contradictory SOP、source provenance 等。它会比普通 long-memory benchmark 更能证明 SE 究竟解决了什么。
