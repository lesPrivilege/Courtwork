# Spark探索代理与 coding dogfooding · 合入复裁登记

2026-09-13；接单 main `ada8657b2a7161a30e1d015bb4fcd6a8ff2e9ea7`。

## 用户顺序与施工归属

用户在当前任务明确同意先补齐能力、实现 coding 场景 dogfooding；另一分支正在施工，稍后合入复裁。本片记录顺序及接收判据，不重复开启生产实现，也不猜测施工分支名、HEAD或交付范围。待实际分支/提交到达，先核代码、合同和证据，再裁合入与Release资格；本记录不是该分支已通过的回执。

这项用户决定使 coding dogfooding 成为本轮优先交付，覆盖此前将其仅列为后续Developer消费者的排期。沿 [DF-04](../../release/harness-implementation-2026-09-12/harness-dogfooding.md) 与 [RD-009](../RD-009-trusted-harness-extensions.md) 落实，不另造Release门；[G1–G5](../../execution/2026-09-08-main-round/public-readiness.md)仍待最终组合证据。既有NDA真实人审、接续和演示缺口不会因coding成功自动关闭。

## 来源与可采用范围

会话“设计 Spark 探索代理”，ID `6aa6a3aa-9088-83ec-bcb3-75e3d8980bf3`；返回1轮2条消息、hasMore=false、attachments为空。[原返回](source-conversation.json)、[正文](source-conversation.md)固定本次实际内容。正文引用的 content-reference 19 完整研究/提示词附件及 filecite 原文未返回；不能声称已收到或核验。内嵌外部引用标识不是可解析的来源快照；模型规格、别名、性能和社区效果保持来源主张，接入选型前另核官方版本与实测。

沿 [Spark已有定义](../spark-product-definition-2026-09-11/README.md)、[当前架构](../architecture-node-2026-09-13/architecture.md)、[RD-005](../RD-005-multi-agent-selection.md)与[RD-007](../RD-007-resource-governance.md)采用以下合同方向：

- Spark承担有界探索、局部核查与资料准备；快速是目标，静默是交互选择。独立调用、接管前准备及主任务委派共用职责，不新写通用模型loop或私有正式状态库。
- TaskBrief / FindingsBundle / ConsumptionReceipt作为待映射的合同词汇：明确问题/范围/预算，保留来源版本、覆盖/未知与可展开引用，区分读取、采用及正式接受。实现须先对应现有任务、Run、派生结果和owner，名称不自动成为新store。
- 优先查现有获准成果，再按版本/覆盖缺口增量探索；检索优先级不提升证据效力、指令层级或权限。主Agent可回源、纠正遗漏，子项完成不证明整体覆盖。
- Host执行准入、预算、取消、重试与结果提交约束；上下文隔离不等于OS隔离。索引/报告可经受控成果接口提交，不能因此获得任意文件修改、shell或外发权限。
- 并行Spark/主任务执行若改变single-active-Run，必须显式裁定合同及迁移；不能仅由UI出现子任务卡或提示词允许并发。默认无递归派生。
- 私域脱敏仍需独立出站批准与精确版本；不自动云端fallback。翻译、外部检索、私域预处理分别按承诺验证，不将全部愿景捆成首片。

## 合入后的复裁顺序

1. 核分支实际HEAD、与main差异、schema/权限变化和其他writer交叉；确认作者与非作者核查范围。
2. Coding闭环：真实模型读取获准仓库、形成修改、调用Host检查，保留精确diff、命令/退出码及Run/call回执；人检查后重开接续。外部人工oracle不能代作agent自行测试。固定recipe也不能冒称安全沙箱。
3. 反例：deny零执行、失败/超时/超输出、取消与进程回收、重启不重放未知副作用、迟到结果不覆盖新结果；源码版本、权限和当前baseline可复核。
4. Spark若在交付范围：两份精确资料核查→有出处成果→主Agent展开原文→消费回执；查旧索引/撤权、网页指令污染、重复完成、取消后迟到及范围遗漏。外部检索若声称可用，需真实工具接入证据。
5. 最终组合独立安装/支持版本CI与关键GUI验证；按实际能力更新supported-preview、first-work、安装pin及对应媒体，再复裁G1–G5和外部试用范围。只发布已验证能力，不用本登记替代实施。

本片仅文档登记，未运行外部模型、改变产品、派发任务或部署；不声称施工分支已完成。原文中的研究结论保留为输入，以上为本地采用边界。

## 独立Agent设计裁决

用户进一步明确Spark为独立Agent；[Astra正式设计](design.md)确定Agent/Assignment身份、数据分区、组织角色、授权、串行调度恢复与消费合同，覆盖仅把Spark视作profile的旧定位。实现与合入接受另记。
