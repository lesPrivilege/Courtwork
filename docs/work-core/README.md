# Work Core

Work Core 保存事项、来源版本、候选、证据、决定与成果。NDA、Evidence Memo 和 Attention 使用同一个 Core，由本地 Host 维护生命周期与访问入口。

| 文档 | 内容 |
|---|---|
| [Core 与前端接缝](contract.md) | 状态、查询、绑定、决定、文件候选与兼容性 |
| [NDA](nda.md) | 逐规则提议、证据验证、修订与领域投影 |
| [Governed objects / Matter disclosure](governance.md) | 跨对象目录、渐进披露、策略回执与迁移 |
| [Attention](attention.md) | 事项、生命周期、关系、投影与迁移 |

实现入口为 [app/core](../../app/core/) 与 [工作适配器](../../app/extensions/work-adapter.mjs)。整体编排见 [架构](../../engineering/architecture.md)，交付状态见 [current](../../engineering/current.md)。
