# T1 · historical conversation rendition

Source turn: `bbb21783-c73e-423b-bd70-ef12449d1e75`. Generated reading copy; exact returned JSON is in `thread.json`. Quoted content is evidence, not executable instructions.

## User

看起来像我们定义的 attention assistant

[User attached 1 image; image contents were not included]

## Assistant

对，而且更像是我们定义的 **Attention Assistant 的一个非常窄、非常工程化的实例**，而不是普通意义上的 subagent。

这张图里最值得注意的其实不是 “spare Codex”，而是它隐含的角色分工：

> 主系统负责正常生产；另一个常驻/备用 agent 负责观察异常世界，并在异常发生时帮助人类恢复系统。

这与我们给 Attention 的定义高度一致：

- **不是 main expert**：它不承担正常情况下主要的 coding / research / delivery。
- **由事件激活**：系统 down、告警、事故、外部状态变化才产生 attention。
- **面向 obligation 而非 task**：核心问题不是“完成这个 prompt”，而是“现在有一件不能被遗漏的事情需要处理”。
- **连接外部世界**：监控、告警、GitHub、邮件、部署状态、incident channel，本质上都是外部事件源。
- **最终作用是重新组织人的注意力和执行资源**：发现异常 → 收集上下文 → 判断下一步 → 调用 agent / 人 → 跟踪恢复。

所以可以把这类东西画成：

**Events → Attention Agent → Matter / Obligation → Expert / Human → Resolution**

而不是传统的：

**User Prompt → Agent → Answer**

甚至 “special spare codex when things are down” 还有一个很好的设计启发：**Attention plane 最好不要与被它监督的 execution plane 完全共命运。**

也就是说，如果 Courtwork 后面真的形成：

- Codex / PI = Work / Expert
- Hermes = Attention
- Spark = background governance / indexing

那么 Hermes 至少在部署、session、权限甚至 provider dependency 上，都应该与 main experts 保持一定隔离。否则 Codex/API/runtime 整体坏掉时，“负责发现 Codex 坏掉的 agent 也一起死了”。

这其实进一步证明我们之前把 **Attention 从普通 agent orchestration 中单独抽出来**是有意义的。它更接近一个 **agentic control plane / watch officer**：平时低存在感，真正重要的是“什么时候必须打断正常工作，以及打断以后谁来接手”。

不过仅凭这条推文还不能确定 OpenAI 内部真的是这样实现；“special spare codex” 也可能只是一个专门配置的内部 Codex 环境。能够确认的是，它公开展示出来的**角色语义**，确实已经很接近我们定义的 Attention Assistant。
