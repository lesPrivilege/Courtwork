# Schema Engineering · Paper source

当一件工作跨越多个会话、执行者与人的判断，哪些内容应持续保留，哪些变化需要明确依据？Schema Engineering 从工作状态、变更与上下文之间的关系研究这个问题；CourtWork 将相关边界落实为可运行的工作空间。

Schema Engineering 论文继续在 [Schema-Engineering](https://github.com/lesPrivilege/Schema-Engineering) 独立编订。CourtWork 保存实现、设计与验收，本文只提供入口与版本绑定，不复制可编辑论文正文。

## 固定语义基线

当前工程映射采用 **9.6 / 2026-09-07**，commit `d78fd312955c1f594e59cbdcbb0d3074ac355940`（2026-09-08 发布并采用，见 [DEC-012](engineering/decisions.md)）：

- [Canonical](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md)
- [Practice](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice.md)
- [Practice Index](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice-index.md)

前一采用版本 9.3 / `f8ecb091895559389bb4e75f3c6f28052b71c5a3` 保留为历史映射；研究与证据文档中对 9.3 坐标的引用按其写作时点理解。9.6 相对 9.3 对工程契约的影响与检验记录在 DEC-012。[最新阅读入口](https://lesprivilege.github.io/Schema-Engineering/) 随发版变化。以后升级采用版本时，先在工程 decisions 记录受影响契约与检验，再更新本页 SHA。

## 开发 PR 与论文反馈

产品需求、工单和 pull request 在 CourtWork 编订：写清问题、范围、固定 Paper 条款、实现、验收及未决。论文不承担当前产品功能清单或工单状态。

工程结果影响论文命题时，在 SE 的 Practice Index 记录最小观察、支持范围与 CourtWork commit/证据链接，再按论文修订协议决定是否修正文。完整实验和实施历史留在 CourtWork，避免两个逐项论文账本。
