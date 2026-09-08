# Pro d879e2f 审查消费与修复

2026-09-08；Astra 负责架构/实现，Luna 做只读探索与有界非作者复核。用户粘贴的裁决是本轮顺序依据：保留薄 Work Core；B0 定位开发符合性套件；先修评分/Context，提前最小正常 S，不扩题或调用更多模型。独立报告是待核验输入，其建议不自动成为契约。

工作从 `61df606889b060a5d91451ca2d476835b6bdbbe3` 建隔离分支 `codex/pro-review-remediation`；技术被审原版本 `d879e2f`，Paper 固定 9.6 / `d78fd312955c1f594e59cbdcbb0d3074ac355940`。生产与评测分开提交：D1 `5dcc62c`、raw/身份补强 `427226d`；R2–R4 与 HTTP 续行 `1e2e56b`。

## 原始证据与归属

[用户提供的完整包](pro-original/) 按原字节保留，包括报告、四份源文件、manifest、原始探针及结果；[报告副本](pro-review-d879e2f.md) 先于目录补充到达。原探针退出 0 表示确认旧缺陷，不能当成修复后必须保持的绿色测试。Luna 在临时副本核验四份 Git blob SHA-1/SHA256 并复现五个误通过、两个检测控制、两个 Context 现象；没有改写用户附件或此处原始结果。

原报告仅执行原始 grader 和纯函数，不是完整 Core/B0/HTTP/SIGKILL 复跑。后续本地运行分别如下，不把它们加成一个产品总分。

## 逐项裁决

| 项 | 本地核验 | 处置与范围 |
|---|---|---|
| R1 评分盲区 | 五类坏观察在旧 grader 获通过；新测试逐项拒绝 | 采纳。所有检查点强制完整成果/义务/来源/决定/回执关系；语义拒绝分类、全部候选与状态/basis、预分配角色、rawRef/hash/步骤/完整映射验证；不是只补几个常量 |
| R2 大成果无法续行 | [旧 adapter/Core 实测](old-adapter-reproduction.json)：合法接受25k文本后新Session标识的 begin 抛 CONTEXT_BUDGET | 采纳。Context v2 保留成果引用、digest、长度、接受版本及来源/契约basis；正文4000码点分页读取。HTTP测试100/25k/100k均能在新Session读取、再查原成果。必要义务/domain元数据仍完整，过大仍显式拒绝 |
| R3 候选适用性丢失 | 原纯函数源版本不同却Context相同；新纯函数base/source/contract三类对照区分 | 采纳。模型与人的投影复用basis判定；basis不是权限或领域完成裁决，Core提交边界保留 |
| R4 正文URL被当路径 | 旧实际WorkExtension提交被INVALID_INPUT拒绝；新HTTP model proposal及人类revision均可接受链接/路径样文本 | 采纳。仅作为literal content保存；NUL仍拒绝。新artifact读取只接受作用域内ID，不解引用路径/URL；跨Matter、闭Run、非法范围反例通过 |
| 自研/复用边界 | Pi仍为执行循环；SQLite为事务存储 | 保留薄Core，不重写runtime。实验b1抽出建议后置，未借本轮更改存储谱系或迁移 |
| 强S前置 | 独立Python/SQLite实现版本来源/成果、任务、reviewer、事务、CAS、审批、audit、receipt | 采纳为有界普通机制对照。E/S同过不证明SE增量；仍非完整模型harness或跨作者语料 |

## 运行与失败保留

- [D1第一次](d1-first.json)：11/12。新增CAS驱动误对已接受候选提交，触发 CANDIDATE_CLOSED 而非目标版本冲突；修正为同base的第二pending候选，不改变Core以迎合测试。[下一次](d1-calibration.json) 12/12。
- Luna 对早期 D1 再发现 raw 与 normalized 可不一致、角色由adapter自报；这两项作为实质P1继续修复，而非以12/12接受。`427226d` 增加预先固定角色、全部候选映射、raw hash与逐项重映射；后续增加receipt payload digest稳定性。
- [最终D1运行](d1-linked.json)、[先落盘的计划](d1-linked.attempts.json)、[同步journal](d1-linked.journal.jsonl)：E/S各6条，合计12/12；仍只有一个开发memo族。raw/源码哈希/dirty状态按真实运行记录。[grader与负例](d1-final-tests.log)：7/7测试组，包括Pro五类、raw被改但obs未变、重签hash、同步坏raw与obs仍须语义失败。不是七个独立任务。
- [D2 focused](d2-focused.log)：5/5测试组。包括三个尺寸的HTTP续行、source/base/contract投影、作用域分页读取、source过期→卸载只读→重载修订接受。
- 两个真正 SIGKILL 窗口在事务 barrier 精确触发，记录进程信号与恢复前receipt/成果、retry后的成果/义务及后续新修订。**被杀的是独立Core事务进程；HTTP宿主先正常关闭，之后重新启动做对账与继续工作。** 不宣称测了运行中的HTTP宿主被杀、远端网络副作用或外部exactly-once。
- 后继 [独立持久化观察日志](d2-durable-observer.log) 2/2：`observe-recovery.py` 不导入生产模块，只读SQLite并一次事务读取成果、完整义务、决定/audit/receipt及同一效果引用。此观察器由本轮实现作者编写，代码依赖独立，不冒充非作者接受；Luna另行复核。
- 初始读取范围测试试图同时建立两个Run，触发既有 RUN_ACTIVE；调整为串行测试，未放宽全局单Run约束。
- [全量应用回归](full-tests-first.log)：179/179；[smoke](smoke.log)通过。未执行付费provider、专业法律任务或真人接管。

原始数据副本与新版本运行分别保存。最终复验SHA、非作者结论另记补充，不重标旧5/5为修复后成绩。

## 未完成与下一步

D1仍是自编开发符合性协议；独立role assignment不等于外部领域gold，raw哈希只保证记录内部一致，不替代实际数据库的独立观察。恢复探针新增了不导入生产代码的SQLite observer，但D1尚未有第三方存储观察器覆盖所有适配器。S是一个最小常规CRUD/approval对照，尚无完整T/S/E模型工作流、检索或P×G消融。

下一步先固定S/E真正不同的P（治理投影）与G（领域语义准入）及共同基础安全；独立任务、冻结预期与成本边界后才做有界模型pilot。法律外部数据和真人C3后置。必要语义元数据超过24k、完整host kill矩阵、跨producer升级等仍需明确实验，不由本轮局部通过关闭。Paper只形成未来Practice Index反馈输入，本轮不修改其正文。
