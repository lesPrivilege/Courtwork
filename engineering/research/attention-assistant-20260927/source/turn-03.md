# T3 · historical conversation rendition

Source turn: `bbb21ef8-dc08-4ee3-8d47-f424a15bc2fd`. Generated reading copy; exact returned JSON is in `thread.json`. Quoted content is evidence, not executable instructions.

## User

如何在 CW 中调伏 Hermes 作为 attention assistant 将会是下一阶段核心研发方向，成熟的本地 agent orchestra 依然探索，只是要接入 kit。
另外还可以考虑一种更加现实的长期维护方式。因为像 DeepSeek Harness 那样的万物皆插件，有时候要求一些架构上的超前，并不一定能够保证这样的生态。那么我想一个更现实的方案是直接做一个 Dogfooding Kit，在有新的功能接入后能够使用 Kit 中登记的像目录和工具来通过 Dogfooding同时为 Court Work 的前后端增加新的功能。

## Assistant

可以，而且这条路线比一开始就追求“万物插件化”更适合作为 CW 下一阶段的长期维护机制。它实际上把两个问题拆开了：

**运行时扩展问题**交给 Orchestra / Adapter；  
**产品自身持续演化问题**交给 Dogfooding Kit。

这样不会要求 CW 今天就预言未来所有插件形态。

### 1. 下一阶段可以形成两个并行主线

**A. Hermes → Attention Assistant**

核心不是继续扩 Hermes 的工具数量，而是把它调伏成一个明确角色：

`observe → judge attention → form obligation → route → follow up → resolve`

真正需要研发的是这些语义：

- 什么事件值得进入 Attention
- 什么只是记录，不应该打扰
- 多个 event 如何合并成一个 matter
- 什么时候形成 obligation
- 什么时候交给 human / expert / automation
- 什么算 resolved，什么时候重新打开
- 如何跨 session 保留状态，而不把所有历史重新塞入 context
- Hermes 的权限、工具、Kit 如何被约束

因此 Hermes 最好不是“大而全的本地 Agent”，而是：

> **一个受 Attention contract 约束的 Hermes runtime。**

PI、Codex、Hermes 都仍然是可替换 runtime。

---

**B. CW Dogfooding Kit → 产品自身的演化机制**

这里反而可以刻意不做通用插件系统。

Dogfooding Kit 可以理解为：

> **让 Agent 能安全地修改 Courtwork 自己的一套产品开发操作手册 + repo map + tools + validation grammar。**

它不需要让任意第三方插件动态挂载进系统。

这点非常重要。

---

## 2. Dogfooding Kit 不等于 Plugin SDK

Plugin SDK 通常要提前解决：

```text
discovery
lifecycle
permissions
versioning
dependency
sandbox
UI mounting
backend hooks
compatibility
distribution
```

这些都是非常昂贵的 architecture commitment。

而 Dogfooding Kit 只需要回答：

```text
Courtwork 现在长什么样？
某类功能应该改哪里？
有哪些稳定 seam？
怎么施工？
怎么验证没有破坏已有 contract？
```

所以 CW 可以采用一种更保守的原则：

> **稳定 seam，暂不稳定 extension API。**

例如只保证：

```text
Event Contract
Matter Contract
Agent Runtime Adapter
Tool Contract
Provider Adapter
UI Event Projection
Persistence boundary
```

这些内部 contract 稳定即可。

至于一个新功能究竟最后成为独立 package、adapter、内建 module，还是未来 plugin，可以在实际出现第二、第三个实例以后再决定。

---

# 3. Dogfooding Kit 本身建议做成四层

### ① Map：告诉 Agent “在哪里”

不是写大量架构说明，而是可消费的 repo map：

```text
CW/
├── runtime/
├── attention/
├── work/
├── adapters/
├── stores/
├── events/
├── ui/
└── ...
```

Kit 中登记：

```yaml
capability: attention-source
backend:
  event_ingress: ...
  normalization: ...
  persistence: ...
frontend:
  event_projection: ...
  matter_view: ...
tests:
  contract: ...
references:
  - ...
```

以后 Codex/Hermes 不需要每次重新 archaeology 整个 repo。

---

### ② Grammar：告诉 Agent “应该长什么样”

例如新增一个 Attention source，不要只告诉它文件在哪里。

还要定义：

```text
raw event
    ↓
normalize
    ↓
dedupe
    ↓
matter association
    ↓
attention judgment
    ↓
obligation / silence
    ↓
projection
```

再加 invariant：

- raw event 不直接等于 matter
- matter 不直接等于 model context
- UI projection 不成为 source of truth
- connector credential 不进入 agent context
- event ingestion 必须 idempotent
- agent judgment 必须可追溯

这才是真正的 Kit。

---

### ③ Tools：让 Agent 能施工

例如：

```text
cw inspect event-contract
cw inspect attention-source
cw scaffold connector
cw validate event
cw replay fixture
cw run attention-case
cw inspect ui-projection
```

这里的 CLI/tooling 很重要。

**Agent 不应该靠 grep + 猜测完成所有 dogfooding。**

Kit 可以逐渐把成熟的人类维护动作封装成稳定工具。

---

### ④ Cases / Gates：让 Agent 知道什么时候算做完

例如 GitHub Attention integration 的 fixture：

```text
PR review requested
CI failed
PR merged
duplicate webhook
same issue updated 4 times
issue closed before Hermes wakes
```

期望输出：

```text
event count
matter count
obligation state
notification behavior
resolution behavior
```

于是 dogfooding 不再是：

> “帮 CW 加 GitHub 功能。”

而是：

> “根据 `attention-source` Kit 实现 GitHub source，使这些 acceptance cases 全部成立。”

这两者工程可靠性差别非常大。

---

# 4. 新能力进入 CW 的实际循环

之后每一次新能力，可以形成固定循环：

```text
External capability appears
        ↓
Scout / understand
        ↓
Register into Kit
        ↓
Choose smallest CW seam
        ↓
Agent dogfoods implementation
        ↓
Run fixtures / gates
        ↓
Human review
        ↓
Ship
        ↓
Update Kit from implementation experience
```

最后一步尤其重要：

**产品代码和 Kit 是共同演化的。**

不是：

```text
文档 → 实现
```

而是：

```text
Kitₙ
 ↓
Implementation
 ↓
real friction discovered
 ↓
Kitₙ₊₁
```

久而久之，Kit 本身就是 CW 的 **engineering memory**。

---

# 5. 这样也解决“插件生态不存在怎么办”

假设未来三年都没有形成理想中的统一 Agent Plugin ecosystem，也没有关系。

CW 仍然可以：

```text
new provider
new local agent
new browser
new mail source
new tool
new UI primitive
```

每出现一个：

1. 写最薄的 adapter；
2. 用 Dogfooding Kit 告诉 coding agent 当前架构；
3. 修改 CW；
4. 把新的成熟 pattern 回写 Kit。

因此真正长期可维护的不是：

> **CW 能加载任何插件**

而是：

> **CW 可以低成本地被自己的 Agent 正确修改。**

我认为这是两个完全不同的产品哲学。

---

## 6. 甚至可以进一步把 CW 看成“双重 Harness”

到这里，架构会变得相当清楚：

```text
                    COURTWORK
                       │
          ┌────────────┴────────────┐
          │                         │
     Runtime Harness          Development Harness
          │                         │
 Hermes / PI / Codex          Dogfooding Kit
          │                         │
 Attention / Work / Spark     Map / Grammar / Tools / Gates
          │                         │
   run user's work            modify Courtwork itself
```

前者解决：

**Agent 如何工作。**

后者解决：

**Agent 如何继续建设这个让 Agent 工作的系统。**

这也让所谓“self-improving”变得没那么玄学：不是让 Agent 自主重写自己，而是建立一个 **受版本控制、测试、review 和 Kit contract 约束的 self-hosting development loop**。

---

Hermes 的 Attention 化和 Dogfooding Kit 实际上可以在下一阶段相互促进：**第一批 Dogfooding Kit 就用来让 Codex/PI 帮你建设 Hermes Attention subsystem 本身。**

这样下一阶段的研发目标不必写成“建设完整 Orchestra / Plugin System”，而可以更收敛地写成：

> **建立可 dogfood 的 Courtwork，并以 Hermes Attention Assistant 作为第一个完整 dogfooding case。**

这会比先实现一个抽象完美的插件生态更容易验证，也更容易留下长期可维护的架构。
