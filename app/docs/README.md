# Runtime 实现与 API

## 运行基础

- [Runtime foundation](runtime-foundation.md)：Host、Pi 集成、模型与能力接口、关闭与恢复。
- [HTTP 基础契约](api-v6.md)：`/api/v5` 下的会话、运行、凭据、文件与事件。
- [历史文件与 compaction](api-runtime-mx-r1.md)：MX-R1 增量接口。
- [运行数据与迁移](../README.md#store-schema-v8-validated-v3v4v5v6v7-upgrade)：当前 Host schema 8。
- [权限 CAS](permission-cas.md)：批准动作的 payload 与版本条件。

## 工作与运行投影

- [Work summary](work-summary-api.md)：工作索引与摘要。
- [Activity 与 Usage](work-metrics.md)：已记录的运行指标。
- [异步读取任务](async-tasks.md)：任务状态、取消、恢复与消费。
- [Runtime Control Plane](../../docs/runtime-control/INDEX.md)：资源、策略、来源解析与 MCP。
- [Work Core](../../docs/work-core/README.md)：候选、来源、决定与领域工作。

## 集成与来源

- [Pi / MCP 集成](upstream-integration.md)
- [每轮执行归属](turn-ownership-review.md)
- [依赖账本](dependency-ledger.json)
- [历史 API 提案](runtime-api-proposal.md)

模块位置见 [应用入口](../README.md#modules)，验证记录与当前交付见 [工程状态](../../engineering/current.md)。

- [Attention global agent](attention-agent.md)：全局对话、渐进历史读取与共享 Runtime 配置。

- [Thread / local messaging](coordination.md)：持久工作线、本地outbox/inbox、权限与child conformance边界。
- [Usage detail and snapshot drilldown](usage-details.md)：每日、模型与精确Run读面。
