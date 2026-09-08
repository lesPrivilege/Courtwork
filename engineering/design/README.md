# Design · Work Agent GUI

设计目标是具有独立语言、能持续完成工作的 Agent GUI。设计研究、原型比较与工程验证并行：先探索人的工作方式，再把交互契约交给 Adapter/Core 验证，不等待全部后端完成才设计界面。

文档、静态候选、交互和实测状态以 [current](../current.md) 与 [RD-003](../research/RD-003-work-surface.md) 为准；视觉候选不等于已选择方向或已通过交互验收。

## 系列索引

| 文档 | 责任 |
|---|---|
| [principles.md](principles.md) | 设计目标、成熟行为底线与陌生化边界 |
| [completion-surface.md](completion-surface.md) | 成熟 GUI 的状态—动作—恢复覆盖；明确首版和后置范围 |
| [directions.md](directions.md) | 三个有实质差异的设计语言候选与比较任务 |
| [prototype-plan.md](prototype-plan.md) | 从设计取证到可交互状态原型、真实联调的步骤与退出条件 |
| [decisions.md](decisions.md) | 局部设计选择与裁决格式；作者推荐和用户选择分开 |
| [sources.md](sources.md) | 官方 skill、官方规范、社区转译和产品能力资料的来源边界 |
| [reference-consumption.md](reference-consumption.md) | 历史本地巧思、网页端建议与外部工具的裁取，隔离旧 context |
| [work-surface-boundaries.md](work-surface-boundaries.md) | Chrome / Domain / Expert责任，Review与commit语义、同源投影和组件adapter边界；连接Fable现有契约 |
| [UX Polish研究包](../research/ux-polish-2026-09-08/README.md) | 材质/层级与局部motion/hover的来源、源码现状及build联调绘制切片 |

## 与工程治理的关系

Design 是 M10/M11 和 RD-003 的设计输入，也可能暴露 M02/M04/M06 的接口缺口。完成面决定需要哪些可见状态；实际语义仍由 [Core 契约](../core-contracts.md) 定义。设计不自行创造 approve、cancelled 或已保存事实。

设计范围和工程承诺记在 [工程 decisions](../decisions.md)；本系列的视觉/交互决策记在 Design decisions，不重复技术采纳记录。设计研究推进不改变任何 RD 的运行状态。

## 维护粒度

一个设计单元可以是“长运行时输入与停止的关系”“证据回跳和返回位置”“候选接受的过期冲突”，而不是一个源码组件或一整套皮肤。每项保留目标、必要状态、候选、取舍、证据、可访问替代、版本/恢复要求和裁决。只有在 prototype 中出现可独立验证的分歧时才继续拆分文档。
