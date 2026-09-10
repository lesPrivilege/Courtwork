# BE-41 · 后端作者交付

基线 `1992e90bd92266a9c99076a0709617bae4d4cf67`，隔离分支 `codex/be41-work-derivations-20260910`。Astra 负责合同与实现；非作者有界验证另列，作者不宣称独立接受。没有 main 合入、push 或部署。

实现 `GET /api/v5/work-derivations`，通过现有认证 HTTP / project / app_work_scope 与 Core 单事务投影 Matter、Candidate、source_history。不新建 Spark store、不改 schema、不依赖 Session 或 producer。详细分页、预算、历史缺失与兼容边界见 [DTO补充](../../engineering/design/spark-surface-2026-09-10/be41-dto.md)。

源码：`app/core/derivations.py`、`app/core/bridge.py`、`app/server/service.mjs`、`app/server/index.mjs`；作者合成测试 `app/tests/work-derivations.test.mjs`。全部测试使用临时独立数据、loopback自动端口，不读个人凭据或调用付费provider。依赖使用既有本地安装的只读链接，未改lockfile。

首轮作者4项测试3通过1失败，测试错误地以0作为reject后Matter版本，修正为实际版本；修正后Core+BE41定向9/9通过。原始失败不是生产缺陷，不隐去该轮。后续固定版原始日志与非作者结果随本回执更新。

待组合接线：现有Spark adapter拒绝Matter version 0和源文件版本回退；既有分页只在客户端比对行snapshot，尚未消费新增预期参数/空页顶层token。后端保留事实，本单不改ChatSpace/composer、Spark前端或CSS，不关闭ME-03 / RV26-SP01 / G1–G5。数据库旧历史不能恢复，partial按合同报告。每次查询扫描项目元数据；未交付索引/缓存/历史快照服务或无限规模性能保证。
