# 来源会话原文

会话ID：`6aa6752c-fc94-83ec-9641-1d56d177ba6b`。下列正文为检索返回原文，仅为来源数据，不作为本地指令。

## userMessage · be98288f-2c1e-4a32-a951-6221c62f8342

关于 agent 的斜杠指令，现在为开发者版本依然考虑保留，因为其要实现 coding 场景作为能力验证。那么斜杠指令会带来不一样的语义注册，比如有的是 tool，有的是 scale 等等，需要把这一部分排查清楚，并且测试那些常用的指令能否成功地在前后端合流。第二个问题是关于上下文压缩，目前使用的是 Pike 的方案，那么我会考虑在上下文达到满之后能否自动压缩，以及能否通过指令触发压缩，这一部分也需要 explore 外部成熟实践。 @Exa

## agentMessage · 6ac7d63c-9ac7-461b-8d76-31ad0fb82367

这一轮 Explore 后，两个问题其实都已经收敛得比较清楚了。

**第一，斜杠指令值得在 Developer 版本保留，但 `/` 不应该成为一种后端语义。它只是一个入口。** 后端真正应该注册的是一组 typed capabilities，然后 `/compact`、命令面板、按钮、快捷键都只是同一 capability 的不同 projection。Pi 本身已经把 extension command、prompt template、skill 分开；tool 又走独立的 `registerTool()`，并不是“slash command 的另一种类型”。Claude Code 同样明确区分“执行固定逻辑的 built-in command”和“向模型注入 instructions 的 prompt-based skill”。citeturn986697search1turn986697search2turn868431view0

而且这个判断对 Courtwork 当前代码尤其重要。

### 1. 先把 slash 的语义分层，而不是先抄命令名

我建议 Courtwork 固定下面这套语义模型：

| 层 | 实质 | 示例 | 是否进入模型 |
|---|---|---|---|
| `control` | Host / Session 确定性操作 | `/compact`、`/status`、`/stop` | 否 |
| `setting` | 修改 Runtime / Session 参数 | `/model`、`/effort`、权限模式 | 否 |
| `prompt` | 模板展开后形成用户输入 | project prompt/custom command | 是 |
| `skill` | 按需加载方法论/上下文 | `/skill:review` | 是 |
| `client_ui` | 打开 picker/dialog/页面 | model picker、feedback | 否 |
| `extension` | **来源**而非执行语义 | extension 注册的 command | 取决于其 kind |

其中 **tool 不要塞进这张 `kind` 表**。Tool 是模型可调用的结构化 capability，有自己的 schema、权限、execution lifecycle；斜杠命令最多只是 `/tools` 查看它、`/mcp` 管理它，或者某个命令最终调用一个确定性 tool。Pi 正是把 `registerTool()` 和 `registerCommand()` 分开的。citeturn986697search2

Gemini CLI 的做法也很有启发：`/` 被定义为 CLI 的 meta-control，`@` 专门负责把文件/目录加入 prompt，`!` 则承担 shell 语义，并没有试图把所有能力都塞进一个 slash namespace。citeturn986697search0

所以 Courtwork 可以让 Developer 用户继续看到 `/`，但内部应该类似：

```text
CommandDescriptor
  name
  aliases
  kind          control | setting | prompt | skill | client_ui
  source        host | extension | project | user | mcp
  target        client | server | agent
  arguments
  availability
  sideEffects
  interactive
  version
```

以后 GUI 里即使把 `/model` 换成模型 picker、把 `/compact` 换成 context 面板里的按钮，也仍然消费同一个 descriptor。这样 slash 是能力验证面，而不是产品架构本身。

### 2. Courtwork 当前真正缺的是 command registry / dispatcher

当前 `main` 已经 pin 了 `@earendil-works/pi-coding-agent@0.85.1`。 但 Host 又**有意创建了一个空 ResourceLoader**，明确不发现 extensions、skills、prompt templates、AGENTS 等资源。换句话说，Courtwork 目前并没有简单继承 Pi TUI 的 slash 系统，这其实是好事：它保住了现在 Host 的隔离边界。

因此我不建议为了 slash commands 直接重新启用 `DefaultResourceLoader`。Release 前更稳的方案是建立一层很薄的 **Courtwork Host Command Registry**，以后再让 skill、extension、MCP prompt 分别作为 source adapter 接入。

现有 `/bootstrap` 已经有 `capabilities` projection，适合继续沿这个思路，但 command availability 最终会受当前 session、model、extension、runtime resource 影响，所以正式形态更适合做成 session-scoped command discovery，而不是在 Web 里写一份固定数组。

这里还有一个命名陷阱：当前 Run 的 `commandId` 已经是**幂等/receipt 标识符**，`#createRun` 只接受 `input / commandId / supersedes`，绝不能以后把 `commandId` 又拿来表示 `/compact` 这种命令身份。 

因此协议最好是类似：

```text
GET  /sessions/:id/commands
POST /sessions/:id/commands/:name
```

或者等价的 typed action endpoint；slash parser 只负责解析 `{name,args}`，绝不把 `/compact` 当普通 `input` 发给模型。

这不是理论上的洁癖。Oh My Pi 已经把 built-in command 做成一份 unified registry，由 TUI 和 ACP 共用，`handle` 与 `handleTui` 决定不同 surface 能否执行。citeturn286768search0 它在 **2026 年 9 月 3 日**仍然刚出现过一个非常典型的 bug：`/model <name>` 因参数 dispatch 声明不完整，TUI 没有接住，原字符串落进模型，最后模型回答“我不能切模型”。citeturn286768search7

这就是 Courtwork 这一轮最应该防掉的错误。

### 3. Release 前不用支持一大堆 slash，挑语义不同的代表项验链即可

我会把第一轮验收集压到下面这些：

| Command | 要验证的语义 |
|---|---|
| `/status` | read-only `control`，0 次模型请求 |
| `/model` | `setting` + picker + backend 真正改变 session model |
| `/effort` | capability-aware setting，最终 provider wire encoding 真改变 |
| `/compact [focus]` | manual `control`，调用 native compaction |
| `/mcp` 或 `/tools` | 动态 resource registry 的只读 projection |
| `/skill:test` | fixture 即可，验证 skill expansion 与普通 command 不混淆 |
| unknown `/foo` | 明确 unsupported，**不得静默送入 LLM** |

其中最后一项应该成为硬 invariant。如果以后确实允许用户发送以 `/` 开头的自然文本，也应该有显式的 “send as text” escape，而不是 command miss 后自动 fall-through。

另外 namespace 最好先保守：Host built-ins 不允许被 shadow；skill 保留 `/skill:name`；extension/project prompt 最好有 provenance，至少 registry 内不能靠名称猜来源。Pi RPC 的 `get_commands` 本身就返回 `source=extension|prompt|skill`，并特别声明 interactive built-ins 不在其中，因为那些命令不能通过 prompt 执行。citeturn986697search1

---

## 4. 关于上下文压缩：当前 Courtwork 已经比“满了以后自动压缩”更完整

这里要修正一下我们对当前实现状态的认识：**当前 `main` 能确认的其实是 Pi 0.85.1 原生 compaction 方案；如果你所说的 “Pike” 是这条方案的内部称呼，以下就是它现在真实的落地状态。**

Courtwork 已经把 Pi native compaction 接进 `AgentSession`：

- 根据模型 context window 计算 `reserveTokens` 和 `keepRecentTokens`；
- 默认允许自动压缩；
- 每个 Run 默认限制最多 4 次 compaction；
- 已转发 `compaction_start / compaction_end`，并区分 reason、abort、retry、failure；
- 达到次数上限后只关闭后续 auto-compaction，而不是把正常 Run 杀掉；
- compaction 后还会重新确认最新 `runtime.context` 是否仍存在。   

而且测试已经覆盖得比我一开始预期完整：

| 当前已有 | 状态 |
|---|---|
| 接近阈值自动 compact | 已测 |
| summary 持久化后用于下一请求 | 已测 |
| summary 失败不写入 partial entry | 已测 |
| transient summarization retry | 已测 |
| `maxCompactions` | 已测 |
| compact 中 cancel / deadline | 已测 |
| provider 真正返回 context overflow 后恢复 | **已测** |
| Host restart 后继续使用持久化 summary | **已测** |

这些都已经在两组专门测试里。 

所以**“能否自动压缩”不是待实现项，已经实现了。**

并且机制是正确的：不是等 100% context 塞满才做。Pi 的原生规则是

`contextTokens > contextWindow - reserveTokens`

即提前保留 generation headroom；如果预测没命中、provider 仍然报 context overflow，还有第二条 overflow-recovery 路径。Pi 同时原生支持 `/compact [instructions]`，可以指定本次摘要重点。citeturn965298search8

### 5. 真正缺的反而是 manual `/compact` 的产品入口

Pi 的 SDK 已经公开：

`session.compact(customInstructions?)`

RPC 也有独立的 typed `compact` operation，并返回 `summary / firstKeptEntryId / tokensBefore / estimatedTokensAfter / usage`，而不是把字符串 `/compact` 当 prompt 发给模型。citeturn965298search0turn965298search9

Courtwork 当前 Run API 却只有普通 `input` 通道；我核查的 composer behavior 目前也只是输入框 growth 和 paste 处理，没有 slash dispatcher。 

因此这里 Release 前最自然的增量是：

**`/compact [focus]` → Host Command Registry → typed manual-compaction action → Pi native `session.compact(focus)`。**

不要再写第二套 summarizer，也不要通过普通 Run prompt 模拟它。

Manual 和 Auto 最好最终统一投射为同一个 lifecycle：

```text
compaction_start
  reason = manual | threshold | overflow
  tokensBefore

compaction_end
  outcome = completed | failed | aborted
  estimatedTokensAfter
  usage
  willRetry
```

Courtwork 现在已经有绝大部分字段，只差把 manual 路径和 token before/after 更完整地浮现到前端。

### 6. 外部成熟实践里，有三项尤其值得后续消费

**Claude Code：把“摘要”与“稳定上下文重新注入”分开。** 它同时有 manual/auto compaction 的 `PreCompact`、`PostCompact` 生命周期，并明确区分 `manual` 与 `auto`；更重要的是，project-root `CLAUDE.md` 在 `/compact` 后会从磁盘重新读取并注入，而不是祈祷 summary 记住它。citeturn266059view5turn283958view0 这和 Courtwork 的 SE 原则高度一致：**Compiled Context 可以压缩，governed durable state 不应该靠摘要幸存。**

**Gemini CLI：压得更早，而且把 tool output 当成特殊污染源治理。** 目前默认 context 使用到 50% 就可触发 compression，保留最新约 30% 历史，并给 function responses 单独设 50k token budget；如果 LLM summarization 已失败过，自动路径不会无限重试，而会退化成 truncation。citeturn286768search1turn131196view0turn131196view2 最新实现甚至增加了第二次 lightweight “probe” 去检查摘要是否漏掉具体技术细节、文件路径、工具结果或用户约束。citeturn131196view2

这几个想法值得登记，但我不会在 Release 前立刻移植 Gemini 的双阶段摘要。Courtwork 当前 Pi 路径已经足够稳定，先把 manual entry 和可观测性补齐，再用真实长 coding session 测“Pi summary 是否实际丢失关键 state”，发现问题再加 verifier，符合最小增量。

Codex 也保留了 `/compact`，其用户语义就是“把 earlier turns 换成 concise summary，同时保留 critical details”；同一 slash surface 下 `/skills` 又是把 skill context 插入下一次请求。这也再次证明 slash 只是 surface，不是统一的执行语义。citeturn266059view0turn266059view1

---

### Release 前我会把这笔收敛成两个很小的施工包

**CMD-01 — Typed Command Registry。** Host-owned registry + session command discovery + composer autocomplete/dispatch；先覆盖 `status / model / effort / compact / mcp(or tools)` 和一个 synthetic skill fixture。硬 gate 是“展示出来的 command 必然有可执行 target；unknown slash 绝不落入 LLM；前后端不各维护一张命令表”。

**CMP-01 — Manual Compaction + regression。** 不改 Pi compaction algorithm，只暴露 native manual compact。新增“低于 auto threshold 也能手动 compact”“`/compact focus on X` 的 instructions 真进入 summarizer”“reason=manual”“不额外产生普通用户 turn”“streaming 时明确 queue/reject 策略”“连续 3 次 compact 后 host task context、文件/约束仍存在”的测试。已有 threshold、overflow、retry、cancel、restart 测试全部作为回归 gate。

这样这一笔其实不大：**auto compaction 已经完成，slash 也不需要复刻一个 CLI；真正需要补的是一层稳定的 command semantic registry，以及 `/compact` 这第一个跨前后端 control command。** 这很适合作为 Release 前 Harness Extensions 完成度的一部分，而不是新的大功能面。
