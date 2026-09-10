# BE-41 · 后端作者交付

基线 `1992e90bd92266a9c99076a0709617bae4d4cf67`，隔离分支 `codex/be41-work-derivations-20260910`。Astra 负责合同与实现；非作者有界验证另列，作者不宣称独立接受。没有 main 合入、push 或部署。

实现 `GET /api/v5/work-derivations`，通过现有认证 HTTP / project / app_work_scope 与 Core 单事务投影 Matter、Candidate、source_history。不新建 Spark store、不改 schema、不依赖 Session 或 producer。详细分页、预算、历史缺失与兼容边界见 [DTO补充](../../engineering/design/spark-surface-2026-09-10/be41-dto.md)。

源码：`app/core/derivations.py`、`app/core/bridge.py`、`app/server/service.mjs`、`app/server/index.mjs`；作者合成测试 `app/tests/work-derivations.test.mjs`。全部测试使用临时独立数据、loopback自动端口，不读个人凭据或调用付费provider。依赖使用既有本地安装的只读链接，未改lockfile。

首轮作者4项测试3通过1失败，测试错误地以0作为reject后Matter版本，修正为实际版本；修正后Core+BE41定向9/9通过。原始失败不是生产缺陷，不隐去该轮。后续固定版原始日志与非作者结果随本回执更新。

待组合接线：现有Spark adapter拒绝Matter version 0和源文件版本回退；既有分页只在客户端比对行snapshot，尚未消费新增预期参数/空页顶层token。后端保留事实，本单不改ChatSpace/composer、Spark前端或CSS，不关闭ME-03 / RV26-SP01 / G1–G5。数据库旧历史不能恢复，partial按合同报告。每次查询扫描项目元数据；未交付索引/缓存/历史快照服务或无限规模性能保证。

## 固定版本与验证归因

- 首片源码 `d40c53affca0a2acb638cd5c32e13a896950ad4a`；最终代码 **`30fd47015039eb68967b5dba1634c54c62099975`**。后者增加整页身份元数据1,000,000 UTF-8字节拒绝保护，防止单行partial仍含超长身份而溢出worker帧；没有迁移或领域状态变更。
- 作者最终Core+BE41定向 **11/11**：[日志](author-targeted-final.log)。新增预算反例检查显式`PROJECTION_BUDGET`后worker仍可继续读另一空项目。
- 作者首轮全量 **690/690**：[施工期间日志](author-full.log)。该轮运行期间补过最终预算边界，不作为最终固定源码全量接受证据。
- 作者最终固定`30fd470`全量（`node --test --test-concurrency=4 app/tests/*.test.mjs tests/*.test.mjs`）**688/691**：[原始日志](author-full-final.log)。三项失败为`artifact-history-storage`注入Git进程5秒启动超时、`runtime-foundation` CLI等待条件5秒超时、`work-summary`递归快照撞上原子rename窗口而读不到`.tmp`。这三处不在BE-41代码路径；不隐去全量红项，也不扩单修复既有测试。三个完整文件随后串行复验 **13/13**：[日志](author-failed-files-recheck.log)；此前history单文件另有 **3/3** [记录](author-history-recheck.log)。这证明隔离复跑通过，不证明并发稳定性已解决。
- 最终固定版 [smoke](author-smoke-final.log)通过，provider为local-fake；[文档链接检查](author-doc-links.log)通过。首轮smoke另存[原始记录](author-smoke.log)。
- Luna非作者在独立干净树固定`d40c53a`复跑BE-41 **5/5**，Core/governance、work-actions、work-summary、Spark view有界回归 **46/46**；对最终`30fd470`另树复跑BE-41 **6/6**，包括整页预算补丁。Luna结论：**有界范围未发现阻断**，不是完整独立产品接受。
- [Luna合成反例输出](independent-counterexamples.json)覆盖跳号/回退、缺当前历史、空current源集、未知领域contract通用计数、候选版本领先、页外变化与policy失效、Run/draft不使投影失效。空修订在当前合法mutation中被拒绝；故没有通用空修订ledger，非法注入/旧缺失历史不能凭此投影恢复，记录的是限制而非新增能力。

原session Astra仍负责组合复核与main合流。分支保留，无push/部署；本回执证据提交仅补文档与日志，产品代码固定上述SHA。

可复现 [非作者反例脚本](independent-counterexamples.mjs)由Luna原稿只作相对import路径转换，原字节hash与验证者报告计数见[来源记录](independent-provenance.json)。作者运行该便携副本的[重放输出](author-counterexamples-replay.json)单独归因，不替代Luna原始输出。
