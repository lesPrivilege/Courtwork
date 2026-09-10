# RD：研究与开发验证

RD 是围绕局部工程问题的研究与验证记录，不等同于完整产品 PRD，也不直接批准实现。索引状态以 [current](../current.md) 为准；实际执行证据记入各RD。

| RD | 负责模块 | 判别问题 | SE 对应 |
|---|---|---|---|
| [RD-001](RD-001-runtime-adapter.md) | M01–04、M08、M13–14 | Runtime 能否被薄适配，取消、权限、恢复边界是什么？ | V-01、V-06 |
| [RD-002](RD-002-commit-recovery.md) | M05–07、M10 | 正式状态如何保持原子、幂等、可恢复且不可绕过？ | V-04、V-09、V-11 |
| [RD-003](RD-003-work-surface.md) | M07–12 | GUI 和 Context 是否支持可靠裁决与连续工作？ | V-05、V-08、V-10、V-14/15 |
| [RD-004](RD-004-harness-core-pt2-reconciliation.md) | PT2 | 外部 Harness Core 交付如何与既有 DEC-006/007/008、H1–H5 义务对账？（documentation-only，未验收） | — |
| [SE Continuity Evaluation v0](se-continuity-2026-09-08/README.md) | Core / Work Eval | 普通持久化基线与显式治理在变更、恢复、接管上的差异是什么？ | Paper 9.6 §2.4、§3–4、F12；B0 起步，非论文实证结论 |

V 编号指 [Practice Index 验证队列（历史路径：`../../papers/src/practice-index.md`）](../../PAPER.md)。工程实验只支持自己的范围；对论文命题的影响另行裁决。

## 共同证据格式

每轮追加日期、执行者、复核者、输入/方案 revision、候选版本和 commit、OS/工具环境、模型与预算、样本来源/哈希、命令或操作、期望/实际、日志路径、失败与退出、适用边界、裁决链接。固定不了环境则逐项写明，不声称严格回放。

材料类型标明：官方文档、源码、社区报告、本地历史记录、本次模拟运行、本次真实运行、独立复核。文档和代码表明机制存在；运行证明声明环境中的行为；专业成果与长期效果需要额外证据。

未执行填写“未运行”，不要用空白 PASS 表格。失败样本和中断尝试也进入分母。多项同时改变只能支持组合效果；用于调优的样本不继续冒充独立留出。

## 共同门槛

| Gate | 通过所需证据 |
|---|---|
| G1 执行 | model→tool→model、错误与取消一致，usage 未知不伪造为零 |
| G2 提交 | Candidate 不生效、越权拒绝、同键异内容拒绝、重复请求至多一次状态转换 |
| G3 恢复 | kill/restart、版本冲突、丢通知、换 Session 后成果与义务仍正确 |
| G4 投影 | Context、GUI、索引引用相同正式版本；断线/旧页面不误提交 |
| G5 隔离 | 模型可达工具无法绕过正式写入入口；缺少许可或执行环境时失败可见 |
| G6 兼容 | 插件/Adapter 变更无需改领域语义；不支持能力明确拒绝 |
| G7 工作成果 | Reviewer 在声明范围接受确切成果版本；运行结束不自动视为完成 |

此表G1—G7是RD检查类别；MVP工单包的G0/G1/G2是施工阶段准入，两者不可凭同名互相替代。这些检查按具体 RD 分解。性能先记录 token、延迟、成本、Review 时间与维护改动面，再以基线决定可接受范围；不能事后移动正确性门槛以便通过。

## 新卡最小格式

问题、所属模块、候选与来源、决策影响、固定输入、实验步骤、负例、通过/停止条件、证据记录、未完义务与裁决链接。一个卡只回答一个可以独立决策的问题族；出现不同 owner、不同开工条件或独立迁移责任时拆卡。

## 2026-09-10 · Multi-agent selection

[RD-005](RD-005-multi-agent-selection.md)：完整消费三turn，登记Astra/Luna分工、四通信面、候选PR与成熟参考负索引；研究/架构裁定，不构成产品接受。

## 近期来源消费

- 2026-09-10 · [数据工程与组织工程](data-organization-2026-09-10/README.md)：完整输入、局部选型索引、既有路线映射及 Paper 不修订裁决。
- 2026-09-11 · [Google Workspace CLI / Tool ABI与Attention](google-workspace-cli-2026-09-11/README.md)：原文269行及hash、14项处置与EX-GWS-01～03消费索引已登记；上游主张未核验，候选未派工，不改变前端/通用Harness优先级。


- 2026-09-11 · [语义治理与对齐](semantic-governance-2026-09-11/README.md)：5 turn/9消息、附件与截断补录、25项处置、PR review、Luna explore及统一polish roadmap；待用户merge清洁节点开工。
