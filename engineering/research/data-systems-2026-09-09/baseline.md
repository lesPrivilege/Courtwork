# 有界基线：现有 owner 与差额

读取 `af95bcb94d8373ae424462eb4a09535a6992d04b`。本页是源码及合同核对，不是全仓安全审计，不声称重新运行下列产品测试。架构文档中早期 implementation 接缝含旧路径，当前 Core 以本表和正式合同为准。

| 对象 / 实际入口 | 已有事实 | 本包可补的差额 |
|---|---|---|
| [Core Store](../../../app/core/core.py) `save_candidate`, `decide`, `query_request` | immutable canonical payload/hash；可信决定入口；BEGIN IMMEDIATE、CAS、source/contract检查、同事务Artifact/Decision/audit/request_result | 复用已有机制，补从一个回执出发的有界证据核对体验；不新建批准服务 |
| [bridge](../../../app/core/bridge.py)、[owner](../../../app/core/owner.mjs) | host单一Core worker，Run admission；`workProjection`与`compileWorkContext`区分历史接受和当前basis | 枚举各入口与可信调用者；Core capability对象本身不代表抵御任意同用户恶意进程 |
| [Work Core合同](../../../docs/work-core/contract.md) | 当前生产B0 SQLite state+audit；Core user schema1 / application schema2；迁移备份和旧bridge拒绝；不可补造已删除历史成员 | DS-03明确多种版本轴与旧读写支持范围；N/N-1不等于旧host可写升级目录 |
| [Core Store](../../../app/core/core.py) `rebuild_projection` | B1另有event→projection重建；仅B1可调用 | 不把B1等同当前生产B0，或据此声称所有来源、索引与运行记录可重建 |
| [RuntimeStore](../../../app/server/store.mjs) `_persist`, `_mutate` | schema4，锁与串行JSON临时写/rename，含配置、Session/Run、events/questions、extension记录 | 这些并非全是派生缓存；原子rename不自动证明断电durability或跨Core事务 |
| [service](../../../app/server/service.mjs) `humanAction`, `queryWork`及启动恢复 | actor由host持有；当前generation、binding及active Run准入；重启in-flight变unknown | 保持执行终态与领域接受分离；不存在可据此宣称的跨系统exactly-once |
| [ArtifactHistory](../../../app/runtime/artifact-history.mjs) `save/read`与service `getArtifactFile` | per-session Git immutable bytes，digest与大小校验；service使用Run记录核对读取归属 | hash不是读取授权，也不表示已接受成果；只存blob不证明Run已记录。ES-01沿此导入，不造第二History |
| [Core owner](../../../app/core/owner.mjs) `candidateBasis`, `compileWorkContext` | source/contract/base版本适用性；context v2引用与分页读取；24,000 JS字符预算 | 未实现全依赖闭包或通用选择性失效；字符数不是token数 |
| [LG计划](../local-governance-2026-09-09/pr-plan.md) | LG-01/02/04已设计捕获、rendition、索引generation与增量/全量等价 | planned；DS-02并入其验收，不把尚未存在的索引列作当前产品store |
| [ES-00](../../execution/2026-09-09-execution-state/backend-contract-draft.md) | 已设计recorded bytes、固定basis、可信验证、同事务接受与迁移，ES-01仍待实现 | 文件回执/包/coverage用ES字段；不得用报告的通用envelope绕过ES闭包限制 |
| [AM计划](../architecture-maintenance-2026-09-09/pr-plan.md) | 请求基线、只读任务、生命周期和独立维护演练均有分单 | DS-03只补数据兼容和替换证明；DS-04不将只读AM-B暗中升级成外发任务 |

## 已有证据入口及本次限度

[Core测试](../../../app/tests/work-core.test.mjs)已有身份/CAS/幂等、单writer、真实SIGKILL和迁移反例；[HTTP恢复](../../../app/tests/work-http-recovery.test.mjs)已有提交前/ACK前SIGKILL、回执对账、换源与producer缺席；[History存储测试](../../../app/tests/artifact-history-storage.test.mjs)已有GC、取消和对象类型反例。候选PR必须先查这些覆盖，避免把既有能力重开为全新需求。

[FE-03集成回执](../../../evidence/fe03-main-integration-20260909/README.md)报告228/228及有界浏览器复跑；延迟探测补丁4b6aef4在该回执仍待非作者复核。以上是引用历史证据，未在本次重复执行，也不据本包关闭真实provider、产品使用或G1–G5。
