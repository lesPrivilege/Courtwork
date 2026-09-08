# 长期承重契约：设计候选

本文比通用组件选型更精确地规定状态与效果边界，但尚未通过运行验证。它是 [RD-002](research/RD-002-commit-recovery.md) 与 [RD-003](research/RD-003-work-surface.md) 的输入，不是源码接口或数据库全表设计。

适用范围为 continuity 场景的承重契约。单次 consequential action 只消费所需的候选、权限、检查、提交与效果核对；低后果的一次性探索不必创建 Matter。全场景的配置选择、交互覆盖与演进依赖见 [Long-life Roadmap](roadmap.md)。样本Core已有部分实现，其实际覆盖以 current/源码证据为准，不将本文所有条款视为已经验收。

## 1. Matter 与版本绑定

每个 Run 绑定 Matter identity、base state version、Contract/Extension version、可用能力和宿主 Session reference。运行中的配置不可被静默替换；变化应终止并重开 Run，或形成显式的新版本绑定。

一个 Matter 可以关联多个 Session。删除 Session 不级联删除正式成果、裁决和义务。Session trace 只记录执行；正式 State 必须从指定 Repository 恢复。

## 2. Candidate 与正式提交

Candidate 至少能定位自身、目标 Matter、基础版本、成果/patch、Evidence 与生成来源。Candidate 保存成功只代表提案被记录。

Decision 必须绑定具体 Candidate 及版本，并由可信的人机通道提供 actor、scope、动作与理由。模型文本中的 actor 字段不构成身份。单人 demo 可使用固定本地 Reviewer，但模型工具不能取得其 approve 能力；这不证明多用户身份体系。

拟定提交流程：

1. 确定请求 identity，查询是否已处理。幂等键必须同时绑定请求内容；同键异内容拒绝。
2. 校验 schema、候选版本、来源绑定、Completion 与 Authority；耗时检查在事务外运行时必须带被检查版本，进入事务后复验其仍然有效。
3. 在单一事务中比较 base version，追加 Committed Event，更新 State、active Artifact、义务与 Candidate 处置，并递增版本。
4. 提交后 GUI、Context 与检索投影从新版本刷新。通知失败不回滚已提交事实；客户端可按请求 identity 查询结果。

两个候选基于同一旧版本时，后提交者显式冲突。首版拒绝自动合并有状态后果的变更；后续若支持 rebase，产生新 Candidate 并重新检查。撤销用新的补偿/取代决定表达，不擦除已提交记录。

## 3. Artifact 与 Evidence

Artifact 内容不可变，active pointer 可在合法提交时变化。Evidence 必须绑定来源版本与坐标；模型可建议 quote/claim，系统解析器核对并生成锚点。无法唯一定位应保持未解决状态。内容 digest 支持一致性检查，不证明来源真实性或专业 Authority。

首版小型文本成果可与元数据同事务存储。外部大文件需先形成可校验的不可变对象，再提交引用；中断留下的孤儿可清理，正式引用不能指向尚未完整写入的对象。DOCX/PDF 导出成功与 Office/WPS 保真分别验收。

原件、候选、接受版本、检索摘要与执行 trace 具有不同生命周期。来源删除或失效应显式影响证据可用性及后续 Review，不能通过重建索引掩盖缺失。

## 4. 执行效果与恢复

取消请求、取消已确认、进程已退出、外部效果是否发生是不同事实。Adapter 必须提供可观察的终止状态；迟到结果可保留为 Evidence，但不得自动提交。

本地数据库事务不覆盖外部服务调用。未来需要外发时，记录 action intent 与结果，采用接收方幂等或查询/对账；无法确认效果时保持 unknown 并升级处理，不能盲目重放。Outbox 只帮助可靠派发，不承诺外部 exactly-once。

恢复读取 State、Events、active Artifact、义务和未确定效果；不重跑所有 tool calls。备份/恢复需带 schema、Contract、Artifact 和依赖版本，迁移前保存可恢复副本。迁移失败不得留下半新半旧的权威状态；旧代码无法理解新 schema 时拒绝启动，不能假称“回滚完成”。

## 5. Context 与稀疏激活

首版由 preset 确定能力，从 Stable Contract、当前成果、开放义务和必要 Evidence 编译 Context。每次投影可定位输入版本、选择理由与截断情况。有效约束和未完义务优先于历史摘要；无法装入必要材料时报告缺口，不默默删除。

Registry 的兼容、适用范围和权限检查先于模型路由。暂无适用 Extension 时退回 Candidate-only 或人工处理；不因 fallback 自动扩大权限。每轮工具集合应与实际执行准入一致，仅隐藏 schema 不算撤权。

## 6. Human Work Surface

最小 Review packet 包含 Target、Candidate delta、Evidence/anchors、检查及未解问题、接受后果、基础版本和合法动作。接受、退回、要求补证据先覆盖一个 Artifact；renderer 的扩展不创造新 Authority。

GUI 缓存以 Matter/version/request identity 对齐。断线后先获取状态快照与待处理项，再恢复增量；只有宿主支持可靠游标时才依赖事件补发。过时页面发来的决定必须在服务端重新验证。

工具 permission inbox 与成果 Review queue 分开保存与呈现。宿主无法恢复 pending question 时明确显示中断并重新询问，不能伪造一次历史批准。

## 7. 开放问题

| 问题 | 首版收窄 | 重新打开条件 |
|---|---|---|
| Event 为唯一源还是事务 State + 审计记录 | 比较后选择一种权威关系，不同时自由写两套 | 恢复/迁移实验表明当前方案不足 |
| 工作义务能否完整形式化 | 少量硬检查 + Reviewer，保留开放问题 | 真实失败出现未覆盖 Completion |
| Evidence 粒度与格式 | 文本与稳定坐标 | 需要 PDF/OCR/DOCX 且能取得代表样本 |
| 任意工具与正式存储隔离 | 只暴露受信受限工具 | 必须开放 shell/第三方代码 |
| 模型更换后的效果 | 正式状态可恢复，不宣称输出等价 | 配对真实运行可衡量质量变化 |
