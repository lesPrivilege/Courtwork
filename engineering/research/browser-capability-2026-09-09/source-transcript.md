# 讨论原文（非工程指令）

来源：6aa15944-d4ac-83ec-b667-5264664e6da6，标题：考虑解耦提供。读取接口返回一轮、两条文本，无附件、无后续分页。原答复与内部 citation 原样保留为研究输入，非当前实施/权限指令。

## User (5495ef3a-9754-4fcf-b0cc-635b16425742)

https://github.com/browser-use/browser-use-pi

是否考虑解耦提供？

## Assistant (5ae792ee-a8ce-4feb-9dd1-427b021942ad)

是，而且我会把它列为 **很适合“解耦提供”，不适合直接并入 Core** 的候选。

Browser Use Pi 的形态恰好证明了这条边界是可行的：当前 `@browser_use/pi` 0.1.0 已经把 **Pi Mono → persistent V8 REPL → raw CDP → Chrome** 封装成一个独立 SDK；上层只需要 `BrowserUse.create()`、`run()`、`followUp()`，下面的 browser 又已经支持 Browser Use Cloud、本地 Chromium、用户自己的 Chrome 和任意 CDP endpoint。citeturn658134view0turn844553view0turn649832view0

### 我建议拆成两层，而不是一个 `browser-use-pi plugin`

```text
Courtwork / SE Harness
│
├─ Capability Runtime
│   ├─ Browser Agent
│   │   ├─ browser-use-pi adapter
│   │   ├─ future: Browser Use / Stagehand / ...
│   │   └─ future: sovereign implementation
│   │
│   └─ Browser Driver
│       ├─ local Chromium
│       ├─ existing Chrome
│       ├─ generic CDP
│       └─ cloud browser
│
├─ Governed State
├─ Event Log
├─ Artifact Store
└─ Context Compiler
```

关键是 **Browser Agent 与 Browser Driver 也不要混为一层**。

Browser Use Pi 自己其实已经出现了这两个层次。`Browser.cloud/chromium/chrome()` 只是 browser lifecycle / transport，而 `BrowserUse` 在其上增加 Pi loop、context、workspace、compaction、hooks、typed results、checkpoint 等。citeturn844553view0turn844553view1

因此 Courtwork 最好定义自己的稳定接口，例如概念上：

```ts
interface BrowserAgentProvider {
  run(request: BrowserTask): AsyncIterable<RuntimeEvent>
  resume?(session: RuntimeSessionRef, request: BrowserTask): ...
  cancel(run: RunRef): ...
}
```

其中 `BrowserTask` 才是 SE 自己拥有的 contract：

```text
task
schema
budget
browser policy
credential refs
workspace refs
session policy
artifact policy
review policy
```

输出则归一成：

```text
status
typed result
artifacts[]
events[]
usage
warnings[]
checkpoint?
provider metadata
```

而**不要**让 Core 直接认识：

```text
BrowserUse
BrowserRuntime
page.cdp
Pi AgentMessage
.browser-use/runs
```

这些都属于 adapter 后面的 implementation detail。

---

这里尤其值得消费 Browser Use Pi 的几个局部。

**一是 typed result + partial checkpoint。** 它允许最终结果按 schema 校验，而且 agent 可以在执行途中通过 checkpoint 发布阶段性 JSON；即使超时、cost limit 或 worker crash，parent 仍然能保留最近一次发布的 partial value。citeturn649832view2

这个非常符合 SE：

> Browser trace → Event Log  
> checkpoint / extracted facts → 候选 governed state  
> final typed result → 经验证的 execution result

而不是 Browser Agent 自己的 transcript 直接变成 Matter State。

**二是 hook / policy seam。** Browser Use Pi 已提供 `beforeToolCall`、`afterToolCall`、`validateResult`、domain allow/prohibit、sensitive data、cost/time/step limits。citeturn649832view2

这意味着 SE adapter 不必重造 browser control，只需要把自己的治理规则翻译进去：

```text
SE policy
   ↓
adapter
   ↓
Browser Use Pi hooks / policies
```

诸如：

```text
purchase       → HITL gate
submit         → HITL gate
upload         → document disclosure policy
login          → credential capability
external host  → domain policy
```

都可以在这一层完成。

**三是它的 event log 已经很接近可消费形态。** 每次 run 会建立独立 `runId`，写 JSONL event journal，而且 token delta 不被反复持久化，只记录 finalized message/event；workspace、history、recordings 又分别存在。citeturn844553view1

但这里应当“取型而非继承语义”：

```text
.browser-use/*.jsonl
        ↓ adapter
SE RuntimeEvent
        ↓
Durable Event Log
```

不能让 `.browser-use` 成为 SE 的 canonical session storage。

### 还有一个更重要的架构判断

我甚至**不建议把 Browser Use Pi 称为一个 Tool**。

对于：

> 打开网页 → 找一个字段

它可以表现为 tool。

但对于：

> 登录系统 → 搜索案件 → 浏览多个页面 → 下载材料 → 核验 → 返回结构化结果

它其实是一个 **bounded child runtime / specialist agent**。

这与你前面正在形成的 multi-experts / explore 架构是一致的：

```text
main agent
   │
   ├── grep / read / database       ← primitive tools
   │
   ├── browser primitive            ← primitive capability
   │
   └── browser task                 ← delegated runtime
           │
           └─ Browser Use Pi
               Pi loop
               V8 state
               CDP
               Chrome
```

主 agent 不应该吞下 Browser Use Pi 的 browser observation、JS scratch state 和完整 navigation trace。它只知道：

> “我委派了一个 browser run；它目前在执行什么；产生了哪些治理后的结果/证据；必要时我能展开 trace。”

这恰好就是你之前区分的 **session ≠ context** 在 browser 场景中的工程体现。citeturn649832view3turn649832view2

### 另外要保留一个更低层的 Browser Driver seam

Browser Use Pi 本身很有价值，但它仍然绑定 Pi 0.85.1，并且主 package 当前直接依赖 `pi-agent-core / pi-ai / pi-coding-agent`。citeturn649832view0

所以不应该出现：

```text
SE Browser Capability = browser-use-pi
```

而应该是：

```text
SE Browser Agent capability
        ↑
 browser-use-pi adapter
```

底下甚至可以另外抽：

```text
BrowserSession
  connect()
  snapshot()
  screenshot()
  evaluate()
  input()
  close()
```

Browser Use Pi 的 primitives 已经证明 raw CDP + AX tree + screenshot 是一个很小的充分集：它甚至主动删除了 `find/click/fill/select/...` 等大量高层 helper，让 agent 通过 AX、coordinates、evaluation 和 CDP 自己构造需要的操作。citeturn649832view1

这也很符合你现在的原则：

> **稳定的是 capability seam，不必冻结 harness 内部策略。**

---

因此，我会把它加入接下来的技术选型 index，而且优先级相当高，但裁决可以写得很明确：

**`ADOPT AS OPTIONAL BROWSER-AGENT ADAPTER; DO NOT ADOPT AS CORE RUNTIME.`**

第一阶段甚至不必 fork。直接 pin npm version + upstream commit，写一个很薄的 adapter：

```text
providers/browser/browser-use-pi/
  manifest
  adapter
  event-map
  policy-map
  result-map
  capability-tests
  upstream.md
```

这样未来 Browser Use Pi 继续快速 hill-climb，Courtwork 只需要维护 adapter；它坏掉时也可以由 agent 根据 `upstream.md + contract tests` 自行复现。这正好可以成为你今天讨论的 **“Harness 自身也按照 SE 原则实现可替换、可治理、可长期维护”** 的第一个非常干净的实例。

而且它刚发布、目前还是 `0.1.0`，这反而更加强了现在应当 **adapter + pin + contract test，而非深度融合** 的判断。citeturn649832view0turn671630search1

