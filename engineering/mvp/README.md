# MVP 工单包

2026-09-06 最新顺序由 DEC-007 与 [fresh handoff v5](fresh-handoff-v5.md) 接续；本页保留本批历史范围及证据，不覆盖新方向。

**2026-09-06执行顺序更新**：[DEC-006](../decisions.md)已明确允许先施工前后端框架及必要功能骨架，真实key由用户GUI完成后测试，最终Design/Codebase后审。以下原始工单依赖仍用于完整能力/验收汇合，但不再阻塞本次已授权骨架。当前派发范围见[方案v4（历史路径：`execution/next-round-plan-v4.md`）](../migration/2026-09-08/evidence-index.md)，不把排序变更写成G1/G2已通过。

最新执行授权与角色/消融规则见 [Astra 开工交接](astra-handoff.md)；下文保留编单时的基线，执行时结合最新授权解释准入，不能把编单时“尚未授权”变成反复请示的理由。

本包将方案转为可派发的局部工程任务。它是**完整的 MVP 计划草案，不是全量开工令**；运行事实以 [current](../current.md) 和 RD 证据为准。工单编写不代表技术已选定、实验已通过或实现已授权。

## 拟议范围

供 MVP-01 裁决的基线：单人、本地桌面 Web、一个被选定的 Runtime、一个真实 provider、同一时刻一个 Run；多个 Matter 可保存和切换。首个任务为使用合成或脱敏纯文本来源形成有 Evidence 的短备忘录。中文输入、长文本阅读、人工 Review、持久恢复属于主路径。

支持文本附件；其他格式给出明确不支持状态。不开放任意 shell、浏览器控制、外部写入和发布；模型工具只读批准的工作输入并提交 Candidate。Extension 用一个静态版本化个人预设论证替换边界，无商店、热加载或第三方代码执行。零 Extension 仍可工作。

不纳入：多人/远程/同步、后台多 Run、队列编辑、桌面壳及自动更新、通用文档解析、搜索/归档/删除/分支、自动 Review、外发。若真实任务必须加入其中之一，先变更范围与工单，不借“成熟 GUI”默默扩容。备份恢复、错误处理、凭证边界和 P0 可访问性不延期。

## 工单与准入

| 工单 | 内容 | 文件 |
|---|---|---|
| MVP-01—06 | 范围、版本、契约、样本、fresh brief、上游 UI 取证 | [准备](01-preparation.md) |
| MVP-07—12 | Runtime/Core RD、视觉裁决、状态原型、Review 实验、施工裁决 | [验证](02-validation.md) |
| MVP-13—22 | 宿主、适配器、Core、Evidence、Context、GUI、真实切片 | [施工](03-construction.md) |
| MVP-23—26 | 故障验收、GUI 验收、维护交接、MVP 裁决 | [交付](04-acceptance.md) |

26 张工单覆盖本基线。技术冻结后可拆执行子项，但不能把待选技术写成已知源码任务。各工单列出的依赖是完成关系；获得执行授权仍须遵守以下门槛：

- G0：01 接受范围及角色，02—05 冻结各实验所需输入。07—11 的局部试验分别派发，不必等待其他无关实验完成；代码、目录、网络/模型预算在 Assignment 中明确。
- G1：12 依据 RD 与 Design 证据准许一个真实应用切片，才进入 13—22。验证失败先修对应局部，不以创建应用代替论证。
- G2：23—25 有实际证据后，由 26 作 MVP 接受/退回裁决。模拟、真实运行、独立检查分别记录。

可并行：02/03/04/05/06 的调研；07 与 08；09→10 的设计线与 Runtime/Core 线。11 汇合 Review 材料；12 是施工汇合点。进入施工后 14、15、16、17、18 可按依赖并行，19→20 与 21 并行，22 汇合；23 与 24 并行，25→26 收尾。依赖未完成时可读资料，但不能把依赖假设当事实交付。

## 统一派发和完成规则

每张卡的“产物”是未来交付要求，尚非现有结果。编单基线中的角色尚未指派；本轮实际角色和动作见 [执行章程（历史路径：`execution/charter.md`）](../migration/2026-09-08/evidence-index.md) 与 [current](../current.md)。每次派发补姓名/agent、日期、基线版本、允许动作、实现位置、预算、停止条件及证据位置。作者自检不能标作独立验收，用户承担最终范围和产品裁决。

共用完成条件：范围内正常路径和指定反例都有期望/实际/证据；来源和环境可定位；偏差与遗留义务明确；Reviewer 对照原标准检查；必要裁决写入 [decisions](../decisions.md) 或 [Design decisions](../design/decisions.md)，实验事实写回对应 RD。只在 [current](../current.md) 维护当前总体状态，执行记录按工单 ID 索引，不复制多套进度表。

文档和报告继续落在 SE。将来应用/实验代码的位置由 Assignment 决定，不能默认写入本目录；原始项目只读。没有默认外发、部署、付费调用或常驻自动化。变更技术只重开受影响工单；增加主路径必须同步覆盖表和验收。

## 覆盖与范围变化检查

| 承诺 | 责任工单 |
|---|---|
| M01—04 provider、loop、tools、session | 02、07、13、14、17、23 |
| M05—06 Core、Repository | 03、08、15、21、23 |
| M07—09 Evidence、Registry、Context | 04、16、18、22、23 |
| M10—11 Review/API/GUI | 05—06、09—11、19—22、24 |
| M12 验证与诊断 | 04、07—08、11、22—26 |
| M13—14 宿主、依赖与维护 | 02、12—13、17、25 |
| UI01—05、18 | 19、24 |
| UI06—13 | 20、23—24 |
| UI14—17 | 21—24 |
| 六条完整路径 | 10 模拟；22—24 真实 |
| UI19—22 | 本范围不开放；静态 Extension 的失效由 18/19 显示，不开放其管理市场 |

长期 R4 的第二宿主/第二任务、R5 的持续升级治理保留在 [roadmap](../roadmap.md)。25 交付首次兼容和恢复依据，不宣称证明长期可维护性。

## V5 首批重排状态（2026-09-06）

旧26工单义务继续保留，但不以旧视觉选型顺序阻塞新地基。V5-01契约和Paper映射已落；V5-02 Claude部分实查、Codex访问unknown，Court Work/DSH具体来源继续按问题消费；V5-03/04/05已实现fake通用Agent与首扩展并局部独验；V5-06仅局部反例通过，adapter替换等欠项见[结果（历史路径：`execution/framework-v5-result.md`）](../migration/2026-09-08/evidence-index.md)。完整产品、真实provider、Expert与G1/G2仍未关闭。

## V6 通用地基增量（2026-09-06）

当前范围只含通用work agent UI/Preview宿主兼容；SE renderer保留V5原字节，extensions/experts留下一轮。见[结果（历史路径：`execution/framework-v6-result.md`）](../migration/2026-09-08/evidence-index.md)、[范围纠偏（历史路径：`execution/scope-correction-v6.md`）](../migration/2026-09-08/evidence-index.md)与[恢复说明（历史路径：`execution/restore-v6.md`）](../migration/2026-09-08/evidence-index.md)。V5底座与旧义务保留；此轮不关闭真实provider、adapter替换、Expert或G1/G2。
