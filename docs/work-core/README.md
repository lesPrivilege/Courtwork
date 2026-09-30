# Work Core

Work Core owns Matters, source versions, candidates, evidence, decisions and accepted results. NDA, Evidence Memo and Attention use one Core; the local Host owns its lifecycle and authenticated access paths.

These are Courtwork-owned work semantics, separate from the reused Pi execution loop and Harness capabilities. SQLite is the storage mechanism, not the definition of a lawful Work transition. Runtime completion, a passing tool/check or an upstream reference cannot accept a candidate. Work Extensions supply domain validation through the Work adapter; the Core does not import provider, runtime or UI packages. Public execution identity retained with a Work Run is immutable provenance, not an input that grants formal authority.

The [reuse and ownership boundary](../../engineering/architecture.md#reuse-and-courtwork-owned-semantics) defines allowed dependencies and the Host integration responsibility. Implementation exceptions and their verification remain in the original task; this page does not claim complete runtime replaceability.

| 文档 | 内容 |
|---|---|
| [Core 与前端接缝](contract.md) | 状态、查询、绑定、决定、文件候选与兼容性 |
| [NDA](nda.md) | 逐规则提议、证据验证、修订与领域投影 |
| [Governed objects / Matter disclosure](governance.md) | 跨对象目录、渐进披露、策略回执与迁移 |
| [Attention](attention.md) | 事项、生命周期、关系、投影与迁移 |

实现入口为 [app/core](../../app/core/) 与 [工作适配器](../../app/extensions/work-adapter.mjs)。整体编排见 [架构](../../engineering/architecture.md)，交付状态见 [current](../../engineering/current.md)。
