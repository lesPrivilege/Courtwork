# RD-002 · Matter 提交与恢复

状态：experimenting；阶段一作者实际运行已记录，独立验收未结论。架构：Astra；执行：Luna local_evidence；独立复核：Luna runtime_evidence；正式采纳：用户。

## 问题与范围

判断 SQLite 单写服务能否以足够小的实现维持 [Core 契约](../core-contracts.md)。比较事务 State + 审计事件，与严格事件溯源的恢复/维护成本。首轮一个 Matter、一种文本 Artifact、固定本地 Reviewer；不需要模型或 GUI。

输入包括初始 State、两个同 base 的 Candidate、合法与越权 Decision、带来源版本的 Evidence、开放义务。先接受一版，再制造退回、修订、旧版本提交和崩溃。DB schema/SQLite/driver 版本及故障注入位置在执行前固定。

## 必要反例

| 编号 | 注入 | 期望 |
|---|---|---|
| C1 | 只保存 Candidate；模型伪造 approve actor | active version 不变；越权拒绝并保留可解释结果 |
| C2 | 同请求重复提交；同幂等键改内容 | 前者返回此前结果；后者拒绝；版本只前进一次 |
| C3 | 两个客户端提交同一 base 的不同候选 | 至多一个成功，另一个显式冲突，无静默覆盖 |
| C4 | 事务前/中/后 kill；提交后通知丢失 | 恢复只能见完整旧状态或完整新状态；重试不重复转换 |
| C5 | 检查完成后替换 Evidence/Contract | 事务内检测版本失效，不接受过期检查 |
| C6 | Artifact 部分写入、引用缺失、外部文件被替换 | 不提交悬空/错版引用；原始证据不被摘要替代 |
| C7 | 索引删除并重建、Session 删除或换模型 | State/active refs/义务不变，旧 rejected 内容不复活 |
| C8 | 迁移中断、旧程序读新 schema、备份恢复 | 无半迁移权威状态；不兼容显式拒绝；恢复关系可校验 |
| C9 | 工具绕过 API 访问 DB/写凭证 | 在声明威胁模型下不可达；进程分离本身不算通过 |

每个案例断言 State version、Event、active pointer、Candidate 处置、义务与实际 Artifact 内容的一致关系；不能只验证函数返回值。权威关系一旦选择，检查投影重建或审计对账是否符合该关系。

## 收窄与后续

首轮不测外发；需要外发时另开 action intent、接收方幂等与 unknown 对账实验。多用户身份、跨设备同步与大文件存储独立立项。不能从本地事务推出远端 exactly-once，也不能从固定 Reviewer 推出机构级权限正确。

结果用于 [DEC-003](../decisions.md)。若普通事务状态足以支持恢复，就不因架构偏好增加全量事件溯源框架。

## 证据与未完义务

当前执行记录见下节；正式存储选择仍待全量故障、消融及独立检查，不从阶段一结果外推。

## 2026-09-05 · MVP-08 阶段一实际运行

执行者：Luna local_evidence；独立Reviewer：Luna runtime_evidence（已派发，尚未结论）。[作者实验记录（历史路径：`../mvp/execution/core-experiment.md`）](../migration/2026-09-08/evidence-index.md) 保存冻结输入、代码hash、命令和结果目录；B0 State+audit与B1 event+projection各对baseline/C1—C4运行3次，共30/30作者断言满足。

已实际运行两个OS进程争用同base以及六个SIGKILL位置（包括COMMIT后ack前），不是用mock返回代替。该阶段当时不能关闭08：C5—C9与A1—A6尚欠实际运行和独立复验（后续进展见下文），C9最终Runtime工具面独立未测。暂不采纳正式存储，不宣称已得到最小必要方案，也不外推断电/OS隔离/GUI/模型质量。

### 阶段一独立复核

[独立报告（历史路径：`../mvp/execution/core-independent-review.md`）](../migration/2026-09-08/evidence-index.md) 已对同hash快照实际重跑30/30，并直接查DB及额外负向探针。B0局部C1—C4结果可复现；B1虽runner全绿，DecisionRecorded.new_state在当前decision/request result写入前生成，违反v1.1完整新状态要求，故B1存在契约阻断。已回交作者修复及新增event payload断言，不能改变契约来消除失败。C2真实第二Matter和C8newer拒启列入下一阶段。

阶段一独立源码与合成运行证据已归档到 [core-phase1-independent.tar.gz（历史路径：`../mvp/execution/archives/core-phase1-independent.tar.gz`）](../migration/2026-09-08/evidence-index.md)，149个文件逐项复算与[归档manifest（历史路径：`../mvp/execution/archives/core-phase1-independent.json`）](../migration/2026-09-08/evidence-index.md)一致。归档保留B1首次缺陷，不是产品交付包，避免临时目录消失后仅剩无法复核的PASS摘要。

### 阶段二的架构检查义务

Astra在阶段二live源码做静态检查，发现需以冻结副本实测的候选问题：ModelDispatcher缺少可信Matter/Run上下文，read_source按全局Source ID访问；_full_state的request_results未按Matter过滤；_check_obligations保留existing_raw可能使有依据关闭和新增义务无法进入State。已交作者和独立Reviewer验证并补合法恢复路径。这些是当前静态观察，非已运行反例；作者后续修复须给实际hash和正反用例，不以全拒绝代替闭环。

### 消融解释的局部限制

Astra审查冻结A3实现：它只删除after_audit后的第二次_recheck_binding，初次事务内来源/契约检查仍在；失败由持锁事务内同连接hook人工修改引发。因此该结果只支持此内部故障模型下二次检查的作用，不能直接证明正常同步事务中的所有重复检查最小必要。已要求另立A3b（保留旧快照）：事务前检查→另一连接真实更新→BEGIN后复验/无复验，另比较保留初次复验但删除二次复验的无内部突变路径。待独立检查，不预写结论。

阶段二独立原始结果（报告待收口）：冻结core hash `8444bf3e099ff780cf8ce798fc023962777f82e7727805d49d65be31e4e90610` 的B1完整payload与重放等价检查已通过；独立A6重放健壮性探针3次发现未知event type/version未拒绝。此处独立A6包含额外B1健壮性测试，不等于作者“去掉重放用B0”A6变体；两份同名统计不得相加混写。已回交作者修复闭集拒绝，再以新快照复验，暂不关闭08。

## v2 独立复验与当前架构判断

[独立结构化结果（历史路径：`../mvp/execution/core-results/reviewer-phase2/run-summary-v2.json`）](../migration/2026-09-08/evidence-index.md) 已验证冻结core `0382d1877491e3eb2694d20c81e6088b5696b007b52af535ea38c74dfcc9f9ef`：作者runner独立重跑phase1 30/30、phase2 30/30，Reviewer自有黑盒63/63。B1未知event类型/版本现在明确拒绝，失败重放回滚；v1失败保持原记录。

[A3b独立结果（历史路径：`../mvp/execution/core-results/reviewer-phase2/a3b-review-v2.json`）](../migration/2026-09-08/evidence-index.md) 使用v2基线与相同冻结runner，18次对照复现：事务内首检捕获6次外部来源更新，删首检6次误接受，无内部突变的6次控制中删后续复验无观察差异。它支持缩小二次检查的必要性结论，不支持删除事务内首检。

[B1事件对账（历史路径：`../mvp/execution/core-results/reviewer-phase2/event-reconciliation-v2.json`）](../migration/2026-09-08/evidence-index.md) 对18份C4最终库检查决定与事件唯一关联及重放等价。作者runner没有保留重试前数据库副本；重试前旧状态仅由当时结构化观察支持，不能冒充直接重查旧库。备份、日志版本和未知类型结果按该报告的实际范围解读。

[责任面比较（历史路径：`../mvp/execution/core-results/storage-cost-comparison.md`）](../migration/2026-09-08/evidence-index.md) 显示B1增加事件append、载荷、闭集版本和projection重建责任。当前建议后续切片优先B0 State+audit：在固定确定性检查中已满足相同Core不变量，没有观察到必须用event authority才能实现的需求。此为局部技术推荐，不是“全局最小已证明”，也不采用B1早期实现缺陷作为淘汰理由。正式采纳仍由DEC-003与12汇合处理；07真实工具适配、11及用户输入未完成。

可复核包：[v2独立归档（历史路径：`../mvp/execution/archives/core-v2-independent.tar.gz`）](../migration/2026-09-08/evidence-index.md) 与 [685文件manifest（历史路径：`../mvp/execution/archives/core-v2-independent.json`）](../migration/2026-09-08/evidence-index.md)，归档sha256 `b5d14ebc7f22ae29fff2ff886b7ff1b1f87fe8b9599a717ff14c8a6c221ff281`。作者v2和A3b旧基线另存归档，不依赖临时目录永久存在。
