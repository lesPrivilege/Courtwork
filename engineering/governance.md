# 软件工程作为 Work：手动治理 loop

当前由人和 Agent 手动执行，不先开发治理系统。这里复用 SE 的 Matter、Assignment、Candidate、Evidence、Decision 与 Obligation，不增加一套任务 ontology。

## 工作如何发生

```text
观察问题 / 上下游变化
→ 建立有边界的 RD 或工程 Assignment
→ 冻结问题、输入和验收条件
→ 调研 / 提出候选 / 获准后验证
→ 独立检查证据与反例
→ 人工裁决：接受 / 退回 / 延后 / 缩窄 / 停止
→ 更新现行方案、决策和未完义务
→ 编译下一次工作的最小上下文
```

## 文档中的 SE 映射

| SE 对象 | 手动载体 | 谁拥有正式状态 |
|---|---|---|
| Matter | 一个具有连续版本责任的局部工程问题，如运行时适配 | 对应 RD 记录 |
| Assignment / Run | 某轮调查或验证的范围、输入、预算和执行者 | RD 的轮次记录 |
| Candidate Artifact | 候选方案、文档 diff、实验报告 | 生成者保留候选，不能自升为通过 |
| Evidence | 固定来源、实验配置、日志、失败样本与可复核路径 | RD 链接证据，索引不复制原始事实 |
| Decision | 采用、退回、延后、取代的理由及责任人 | decisions 中的具名裁决 |
| Current State / Obligations | 哪些已成立、仍欠什么、下一步先看什么 | current 汇总并链接 RD |

## 角色与接受边界

用户是当前工程范围与技术采纳的最终裁决者。Agent 可在已授权范围完成调研、文档和局部修正；明确区分作者建议、复核意见与用户已接受的决定。本轮同意文档落地不自动批准表中候选技术或 Agent 搭建。

方案作者不能将自己的执行描述标成独立验收。需要独立验收时由未参与该候选实现的人或会话复核；尚未安排则记录“未独立复核”，不虚构 Reviewer。多 Agent 共享来源或前提时不以多数同意代替独立证据。

同一人可以在个人 demo 中承担多个角色，但每次角色转换和利益边界应明确。专业成果是否可用仍由有资格的 Reviewer 判断。

## 最小施工 / 验证 Assignment

```text
问题和所属模块 / RD
预期改变及不做范围
当前 base：方案版本、来源版本、环境、样本
执行者 / 复核者 / 最终裁决者（未指定写待指定）
允许动作与预算：只读、文档、临时实验或产品实现
验收标准、必须失败的反例、停止条件
交付位置、来源索引、剩余义务
```

只有相关模块需要的规格与验证条件确定后才开局部实现；不等待全项目所有问题都解决，也不从一个局部通过推出整套应用可搭建。付费、外发和发布按实际授权单独确定范围，不重复询问已明确授权的动作。

## 每次续行与收工

续行读取 current、相关 RD 和决策，核对文件状态与来源版本；不以旧摘要覆盖新事实。选最小未完义务，说明本轮产物和证据边界。

收工记录输入、观察、候选改变、检查、失败、裁决状态和下一步。文档中“已实现”“已通过”“当前支持”须有对应可核查证据；未运行、模拟运行、真实运行、历史验收分别标记。Git commit 是版本坐标，不是验收证明。

人工接受后更新现行完整方案，并在 decisions 保留被取代者；工程状态变更同步 current。仅文档修正检查链接、状态一致和 diff；实际代码变更按影响面测试；不为文件索引变更运行应用或论文发布构建。

## 变更传播与停止

Core 语义变化检查 RD-002、RD-003 和相关 Extension；Adapter 变化检查 RD-001 及其真实链；上游只影响 UI 的变更不触发全量 Core 重验。Contract、来源、Evaluator 或权限变化须重验依赖它们的候选，不能继续引用失效通过记录。

依赖无法固定、实验不可复核或必要权限无法约束时，缩窄能力或保持阻塞。已经验证的局部可保留，不因一个阻塞重写整个工程。

## 对外沟通

按 [生态工作方式](ecosystem/README.md) 先准备可复核的问题与材料。用户要求保持上下游沟通，在本阶段落实为渠道索引、问题队列、响应消费和版本回馈；尚未授权实际向维护者发送 issue、PR、邮件或消息，不在文档创建时自动外发，也不建立定时自动化。

## Status and history

[current](current.md) is a snapshot, edited in place: baseline, who holds which lane, open work, dormant residuals and standing boundaries. When work changes state, update its owner record first (task contract, evidence packet), then edit the matching row in current. Do not prepend dated entries, paste receipts or test output, or restate a fact another document owns. Remove a row when its thread is accepted with nothing left open.

Standing rule and method pages (architecture, verification, contracts, product direction) are revised so the current text stands alone. When a ruling changes one, edit the affected section; do not add a dated paragraph above the body that the reader must splice. Keep the ruling itself in [decisions](decisions.md) or its research packet, and state there what it replaced and why. Git history keeps earlier wording.

## Consuming inputs

An input — a web-chat report, an external review, an exploration, a reference scan — is consumed when every question in it that matters to this repository has an actual disposition:

```text
save the source (identity, scope, completeness; see repository layout)
→ extract the questions and claims that concern this repository
→ check the external sources that would change a choice
→ rule within the existing owner's scope: adopt / adjust / reject / defer
→ write adopted content into its consumer: contract, method, existing task, code/test
→ record where each disposition landed and what remains
→ close the intake, or name the smallest question still open
```

The unit of disposition is a question that can be judged on its own, not each sentence. A short input needs one paragraph; a larger one a table with columns *question · ruling and reason · actual consumer · remaining work or trigger*. "Adopted" needs a real landing place — a contract section, the owning task, code and tests, or an existing rule. "Consider later" is recorded as defer or reference, not as adopted. An intake may close with nothing adopted, may leave material as dormant reference outside any backlog, and may close while the implementation it informed continues. Having read, saved or indexed an input is not consuming it.

A deferred question names its owner task and a concrete trigger ("when the runtime adapter changes", "when cross-session cancellation is needed", "when the upstream API version changes"). Without one, it becomes dormant reference and leaves active entry points; it is not presented as authorized work.

## Retiring material

- **Temporary plans, comparison drafts and interim reviews.** Before retiring one, move any still-valid rule, reason or counterexample into the long-lived owner and hand unfinished obligations back to the original task. Then mark its outcome or replacement and take it off the default reading path. Only rules, reasons and counterexamples with reuse value are refined into long-term documents. A regenerable draft with no trace value may be deleted within a stated scope; a sole failing counterexample, an adoption basis or an unfinished obligation may not.
- **Superseded rules and decisions.** The replacement text stands alone. The old decision stays, stating the period it applied, what replaced it and why. Quoted historical originals are not silently rewritten; a correction or package note explains the new reading. "Not re-checked recently" is different from "superseded": a pinned historical observation can still support the conclusion of its time.
- **Archive.** Prefer logical archiving: leave files in place, remove them from default entry points, and give the package README a line on why it is kept, what it can no longer be used to show, the current replacement, and which question would justify reopening it. Physical moves follow [repository layout](../docs/repository-layout.md). Evidence stays in its execution packet; the [archive index](archive/README.md) navigates by the questions people will ask, with dates and SHAs as coordinates. Evidence that still supports a current rule stays reachable from that rule.
