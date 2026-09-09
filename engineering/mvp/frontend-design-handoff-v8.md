# 前端设计交接：V7清账、独立Claude与Chat explore待消费

2026-09-06。本轮已清账并停止施工。用户将提交给独立Claude进行前端设计；Chat端另有部分explore等待消费。本文取代fresh-astra-handoff-v7.md作为下一阶段首读入口，旧文保留历史。

## 给接手者的任务

以SE编排理念为边界，为首页、chat、sessions、settings、composer设计完整的日常工作路径。work surface、subagent、context、doc preview是通用壳的附加tab；preview保持解耦兼容，不再作为设计中心。现有V7是行为基线和待改对象，不是必须保留的视觉方案。用户给出的Codex截图仅说明主路径和附加tab关系，不要求像素复制，也不消费其私人聊天文字。

先读本交接和九步审计，再做信息架构、关键流程、桌面/窄屏布局和组件状态设计。每个设计决定说明解决的用户问题、状态归属、现有能力、所需接口及验收方式；不要只给静态首页或美化现有Runtime setup。设计交付形式由用户与Claude确定，本交接不擅自授权部署、外部消息或Core改写。

Chat端explore目前仅获知其存在，尚未收到材料、路径、版本或结论；状态为“待接收/待消费”。不要把它算作已完成研究，也不要为了补齐清单编造其内容。可独立进行现有证据支持的设计；依赖新explore的决定标为暂定，待用户带入后合并裁定。

## 首读材料

持久工作树：`<isolated-checkout>`。原`<private-source>`摘要较旧，保持只读。当前工程文档尚在工作树中，不能只凭git提交历史寻找交付。

1. [当前状态](../current.md)、[治理](../governance.md)、[决策](../decisions.md)、[CONTRIBUTING（历史路径：`../../CONTRIBUTING.md`）](../migration/2026-09-08/evidence-index.md)。按具体设计问题参照[Canonical（历史路径：`../../papers/src/canonical.md`）](../../PAPER.md)与[Practice（历史路径：`../../papers/src/practice.md`）](../../PAPER.md)，不要求重新通读所有历史。
2. [通用层范围（历史路径：`execution/general-ui-audit/scope.md`）](../migration/2026-09-08/evidence-index.md)、[九步实际截图与发现（历史路径：`execution/general-ui-audit/audit.md`）](../migration/2026-09-08/evidence-index.md)、[编排裁定和G1–G4工单（历史路径：`execution/general-ui-audit/orchestration.md`）](../migration/2026-09-08/evidence-index.md)。这些是本轮最新主线；工单是建议工程顺序，未实施，不限制Claude提出更好的设计。
3. [SE责任核查（历史路径：`execution/general-ui-audit/se-general-responsibility.md`）](../migration/2026-09-08/evidence-index.md)、[Courtwork选定机制（历史路径：`execution/general-ui-audit/courtwork-general-selected.md`）](../migration/2026-09-08/evidence-index.md)、[DSH选定机制（历史路径：`execution/general-ui-audit/dsh-general-selected.md`）](../migration/2026-09-08/evidence-index.md)。来源说明在这些材料中自足，上游测试源码不能当作本轮已执行结果。
4. [V7局部结果（历史路径：`execution/frontend-v7/result.md`）](../migration/2026-09-08/evidence-index.md)、[UI编排契约（历史路径：`execution/frontend-v7/ui-orchestration-contract.md`）](../migration/2026-09-08/evidence-index.md)、[Core专轮欠项（历史路径：`execution/frontend-v7/core-round-obligations.md`）](../migration/2026-09-08/evidence-index.md)、[清账核验（历史路径：`execution/general-ui-audit/closeout-check.json`）](../migration/2026-09-08/evidence-index.md)。

## 清账：已完成、未完成、证据限制

| 项目 | 交接状态 |
|---|---|
| V7-01命令/草稿/读取身份 | 已实现并接受。首await前防重复；迟到回执不污染另一会话、不回退已观察终态；旧保存不清新dirty；不明确发送失败保稿且不自动重发。 |
| V7-02 Bind与附加工作面 | 已实现并接受。Bind焦点、展开/返回/关闭保留renderer局部状态，展开态焦点隔离。普通窄屏overlay仍有新发现，不能继承展开态PASS。 |
| V7验证 | 最终hash非作者命令11/11、工作面1个12步场景；Astra回归UI10/10、preview13/13；未改底座13项通过。恢复安装与新数据启动已通过。它们是历史行为证据，本次清账仅重验包和文件完整性。 |
| 通用层审计 | 已完成9步截图和AX/键盘实操、定向源码消费与G1–G4定义；这部分没有修改应用源码。 |
| 首页/composer | 待实现：接通项目前置流程、创建后输入、发送后焦点连续性、草稿反馈随session/operation归属。 |
| Sessions/settings | 待设计和实现：同名辨识/current语义、真实管理动作、日常设置入口及配置owner。没有接口的动作不得绘制成可用能力。 |
| Chat完整体验 | 仅验基础阅读、fake发送及终态；长历史、富文本/附件、完整恢复、真实IME/读屏器等未完成。 |
| 独立Claude设计 | 用户计划提交，本任务没有启动或联系Claude，没有代建新任务。 |
| Chat explore | 待用户带入；不得声称已经消费。 |
| Harness Core与其它范围 | 独立后续轮次；extensions/experts/deferred、真实adapter、Paper与真实provider未自动准入。 |

审计截图01和09文件hash相同：视觉状态相同，09的新结论由真实Shift+Tab及独立AX记录支持；不要把截图本身当焦点变化证据。中文typeText也不代表IME composition测试。

两次历史流程偏差不可隐去：代理曾向旧只读项目写入两份新索引，已按hash移回并移除新增空目录；作者曾覆盖原9/11失败结果JSON，原始JSON已丢失，保留了当时观察和确切harness，后续非作者另存11/11复核。见[完整偏差记录（历史路径：`execution/frontend-v7/workflow-deviation.json`）](../migration/2026-09-08/evidence-index.md)。不能伪造丢失证据，也不能将作者覆盖结果当独验。

## 设计中必须保留的行为边界

会话身份、命令目标、当前展示、草稿修订与读取代次是不同责任。美化或组件重构不得恢复重复发送、跨会话回执污染、旧读取覆盖新状态的问题。清稿以Host准入为依据；异步焦点恢复不能抢走用户已转向的意图。终态问题不能仅因重新绘制而可回答。

首页可改变交互组织，但projectless/延迟正式创建等语义须显式形成Host契约；会话管理和设置持久化也不得以UI本地伪成功替代。附加tab的位置、可见性与关闭不产生正式权限，Candidate不自动变成果。

当前preview是同源可信单槽renderer，不是安全sandbox或任意URL浏览器。保留原内容接缝，按主路径需要设计chrome；不要求继续扩展preview内部生命周期。真实provider预算0，不读取现有凭证，所有现有展示数据为合成数据。

## 可恢复交付

应用源主要位于归档而非持久工作树app目录：

- [V7源码包（历史路径：`execution/archives/framework-v7-source.tar.gz`）](../migration/2026-09-08/evidence-index.md)及[manifest（历史路径：`execution/archives/framework-v7-source.json`）](../migration/2026-09-08/evidence-index.md)：35成员，SHA-256 `fa5d8dfdc3569bbd00abc73556f0051f5e914fedbf2c8401ac1183147da80fb0`。
- [V7证据包（历史路径：`execution/archives/framework-v7-evidence.tar.gz`）](../migration/2026-09-08/evidence-index.md)及[manifest（历史路径：`execution/archives/framework-v7-evidence.json`）](../migration/2026-09-08/evidence-index.md)：67成员，SHA-256 `ce35e1e8e5a5a81a3b699a3c7fe32042004733591bb6945844091bb7eb445ca6`。
- [恢复说明（历史路径：`execution/frontend-v7/restore.md`）](../migration/2026-09-08/evidence-index.md)：新目录解包、逐成员验证、按锁安装、独立新数据。V7归档不包含其后新增的通用层审计；该审计目录和本文须一起交接。

本轮清账重新核验两包全部成员、9张审计截图及活动Web源码，均一致。当前app.mjs为`8ac0dc921eedb5c9bc16d8bdb54e6bf311b3884dec3a63d0f19c3a116a58c61b`。逐文档交接坐标见[输入清单（历史路径：`frontend-design-handoff-v8-inputs.json`）](../migration/2026-09-08/evidence-index.md)，后续材料有变更时比较差异，不能盲目覆盖。

便捷入口为`<isolated-checkout>/app`与`http://127.0.0.1:8797/`；审计曾另用8798和独立合成数据。临时进程可能失效，不是恢复依赖。本轮未做git提交、发布或后台自动推进；现有CONTRIBUTING/README的工作树修改不属于本轮清账，不应撤销。

## 新材料回来后的消费方式

分别登记Claude设计和Chat explore的入口、版本/日期、范围及证据类型。按“问题→建议→现有证据→SE责任→接口影响→采纳/拒绝/待验”合并，冲突留给综合裁定，不按来源声望或多数表决。未收到的新材料不阻止无依赖分析，也不能被静默视为已接受。

后续工程沿用Astra架构/综合裁定、Luna优先有界探索与施工、非作者独验；研究先于依赖它的实现，共享文件明确所有权，作者不覆盖独验输出。此次在handoff处结束，不自动开G1/G2，也不自动开始Core专轮。
