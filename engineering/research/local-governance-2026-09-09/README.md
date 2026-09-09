# 本地资料治理、Explore 与评测：后续自研准备

2026-09-09，用户授权参考并消费 [本地数据治理查询](chatgpt-conversation://6aa100da-de90-83ec-8921-51d831cf16e7) 全量 turn，形成后续 PR / roadmap 与追溯 index。本包是规划交付；不宣称 Intake、索引或新的 Explore 能力已实现，不引入外部依赖、不执行模型或下载语料。当前工程状态仍由 [current](../../current.md) 唯一维护，既有 FE 队列、ES-01 与 G1–G5 顺序不变。

## 阅读与开工顺序

1. [来源索引](source-index.md)：五个 turn、图片、30 个外链与采用/改写/延后处置；[机器清单](source-manifest.json)提供消息 ID、长度与 SHA-256。
2. [PR 施工稿](pr-plan.md)：LG-00…04，从可复现输入到有界检索、候选与增量失效。
3. [Explore runtime 路线](runtime-roadmap.md)：沿已有 Session/Run、权限与结果合同补接缝，UI 随后消费。
4. [评测计划](benchmark-plan.md)：六层证据、最小对照与扩展触发；不把示意表当成实验结果。

规划基线 `c529923f158f702bcdb8a2952e9fc245d906d212`；集成时主线已接收 FE-02，集成前主线节点为 `4d9714e61ba4f817045e7d275e11738a6b2d34fc`。源码路径用于定位，施工前重读实际 HEAD、owner 合同与交付状态。本文不是 API/schema 冻结合同。

## 从讨论提炼的设计约束

| 层 | 保留什么 | 谁可改变；退出/恢复边界 |
|---|---|---|
| 用户原目录 | 文件与人工组织方式；路径仅是观察位置 | Intake 只读，禁止隐式重命名、移动、写回；目录发生变化形成新观察 |
| 来源记录与确切字节 | 捕获身份、hash、观察记录、已引用来源版本 | 沿现有 ArtifactHistory/Core 接缝；受保留策略管理，不能随索引删除，否则历史引用不能保证重现 |
| rendition / 派生索引 | 抽取文本、OCR、结构、词法/向量视图、查询缓存 | 可按固定来源版本与处理配置重建；派生缓存不持有接受决定 |
| 治理与正式状态 | 接受/拒绝、修订链、责任主体、依据与关联 | 仍由既有 Core/domain 决定合同持有；不可称全部可删除 sidecar |
| runtime / context | 执行事件、进度、选入来源和预算、恢复引用 | Session/Run 表达执行；context 是派生工作集，不替代正式状态或完整来源 |

T03 所说“原目录不改”采纳；“sidecar 全部可删重建”收窄为派生缓存。hash 相同只说明字节相同，不说明文档具有同一法律身份；更名/副本/相同文件名不同字节分别记录。T04 借用 DSH 的事件投影思想，不把 Courtwork Core SQLite 权威迁到新的 session event log。T05 的 span roundtrip 检验定位，不能据此证明 OCR 或专业判断正确。

首条产品假设：同一份资料反复用于时间线、版本关系和缺件检查时，保留确切来源并重用派生视图，能降低重复读取成本且不损伤可追溯性。是否成立由评测决定；不预先建设通用数据库平台、递归 agent 团队或全面 OCR 工厂。代码/数据库资料后续通过同一来源接口试装，法律资料结构不提升为通用 Core schema。

## 与当前工程的关系

[执行文件状态合同](../../execution/2026-09-09-execution-state/backend-contract-draft.md)处理受信 Run recorded artifacts → 完整历史字节 → Core 的选定版本集合；本包处理用户资料 → 只读捕获 → 派生视图 → findings 的输入方向。两者共享历史与决定边界，不重复建设 ArtifactHistory、版本身份或接受服务。

[SE 连续性协议](../se-continuity-2026-09-08/README.md)继续负责已有 S/E 条件、观察关系和续行证据；本包只补来源与检索维度，不另造“SE 总分”。[PAPER.md](../../../PAPER.md)固定独立 doctrine 来源；对话中的 SE 解释是研究输入，不更改论文或替代产品证据。

Astra 负责架构、合同冻结和集成；Luna 可承担独立、有界资料探索或实现，作者不自称独立验收。前端进入既有单写者队列。当前仅完成来源消费和计划；各 PR 的开工、验证、接受状态由未来实际回执记录。

## 现有接缝定位

| 源码 / 证据 | 当前责任与本包约束 |
|---|---|
| [Core](../../../app/core/core.py)、[bridge](../../../app/core/bridge.py)、[client](../../../app/core/client.mjs) | source/history、candidate、artifact、decision及事务验证；当前没有Intake/OCR/index API |
| [Work owner](../../../app/core/owner.mjs) | compileWorkContext给bounded references；EvidenceBundle应是派生DTO，不另建持久正式状态 |
| [work adapter](../../../app/extensions/work-adapter.mjs) | 现有Run/binding/tool/human-action接缝；Intake不另造Run |
| [runtime control](../../../app/runtime/control-plane.mjs) | 声明配置、scope/revision/CAS与compileControlContext；不是语料索引owner |
| [连续性入口](../../../benchmarks/continuity/courtwork.mjs)、[观察合同](../../../benchmarks/continuity/observation-contract.md) | 已有连续性测试不覆盖OCR、检索质量或索引性能；新维度单列 |

Intake的host adapter负责显式读取scope与派生存储；观察目录不会自动建立Core正式来源绑定。选定来源集合须按现有绑定/权限接缝进入Core；OCR与索引结果只提供可验证依据，不直接成为决定真值。具体模块位置由LG-01合同冻结，以上映射不是已授予全service写权。
