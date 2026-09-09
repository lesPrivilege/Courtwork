# Personal Attention：研究吸收与 Courtwork PR 准备

日期：2026-09-09。基线为 Courtwork `683b6d1419242bd08d20b7deec77ce12af7dcf12`，Paper 采用版本为 `d78fd312955c1f594e59cbdcbb0d3074ac355940`（9.6）。本包是研究、契约草案和候选施工设计；没有产品代码、API、schema、迁移、依赖、外发或产品验收。

本轮已完整消费 13 个 turn 和 1 张截图；消费入口是 [来源索引](source-index.md)，外部成熟实践按索引登记原始定位、核验等级和未检项。原始对话只作为个人资料保留，后续公开工程材料不把未核验网页主张写成 Courtwork 事实。`engineering/current.md` 仍是产品状态权威；本包不改变 FE 单 writer 队列、ES-01、G1–G5 或 Paper。Paper 正文不在本包修订；候选观察只按 Index 流程登记。

## 结论

Attention 是与 Matter 同级的个人关注对象。它可以跨多个 Matter，也可以暂时不关联 Matter；Session 和 Runtime 只提供可替换的执行关联。Attention 的正式当前事实、事件和决定由一个 Core owner 负责，首个产品纵切建议复用现有数据库。未来物理存储可另行裁定，但不能由独立目录、UI、缓存或常驻 wrapper 取得第二份状态权或并列事实源。

“全量 memory”在本包中表示在允许范围内可寻址和可重建，不表示把所有内容塞进每个 context。对象存在、descriptor、registry 和计数也可能受披露策略约束。默认披露顺序为 registry（若允许）→ schema-aware typed lookup → exact/有界 grep → relation lookup → 有界语义检索 → 指定来源范围；来源中的 signal 不是授权，也不是正式决定。

人类 Attention UI 是独立前端工作单。它消费 Core 事实和下一动作，提交 typed human action，并显示 stale、unknown、未授权和等待状态。`session finished`、notification/read 或一条模型信号都不能自动把关注事项标为 `resolved`。

当前只把 Codex 手动 loop 当作观察 fixture。Practice 文本可移植不等于 Pi、Courtwork-native 或任意 provider 已兼容；每个 Runtime 都需要自己的权限、恢复、事件和合同测试。

## 现有实现与缺口

| 责任 | 当前可核对的事实 | Attention 缺口 |
|---|---|---|
| Core owner / 数据库 | [`WorkCoreOwner`](../../../app/core/owner.mjs) 共享 Core client、`dataDir`、extensions 和 evidence memo；[`core.py`](../../../app/core/core.py) 拥有 B0 state/audit、CAS、来源、Candidate 和 Decision | 没有 Attention 表、状态转换、来源/关系查询或 disclosure gate；需沿同一 owner 扩展 |
| Runtime / Session / Run | [`runtime.mjs`](../../../app/server/runtime.mjs) 启动一个 RuntimeStore、WorkCoreOwner 和 ExtensionRegistry；[`store.mjs`](../../../app/server/store.mjs) 的 schema 4 保存 Session/Run/events/questions/config | 这些记录可作执行历史和 ref，不能成为 Attention 正式状态；当前 `app_run.matter_id` 约束不能被静默泛化 |
| Extension / Service | [`work-adapter.mjs`](../../../app/extensions/work-adapter.mjs) 建立 binding、Core run 和 scoped tools；[`service.mjs`](../../../app/server/service.mjs) 持有 host actor、generation、binding 和 humanAction；[`index.mjs`](../../../app/server/index.mjs) 显式登记 `/api/v5` 路由 | 没有 Attention adapter、service seam 或 typed action 路由；候选 PR 必须由 Core 先提供稳定读写合同 |
| Projection / UI | [`work-summary.mjs`](../../../app/server/work-summary.mjs) 是 RuntimeStore 投影；[`home-view.mjs`](../../../app/web/home-view.mjs) 只有 Waiting/In progress/Needs a look 等现有 UI 词；Work 投影由 [`thread-projection.mjs`](../../../app/web/thread-projection.mjs) 派生 | 不能把现有三类 badge 当 Attention schema；新增 UI 只能消费后端事实，不能直接读 Core 或自行推导 resolved |
| 独立实践 | 本机另有 Attention Assistant 目录，含 registry、state、events 和手动 loop | 该目录是个人文件实践，不是 Courtwork 第二开发线；无事务 CAS、ACL 服务或后台监控，不能当产品能力证据 |

兄弟目录的实际入口要求用户在 Codex UI 中自行添加目录；目录存在不表示已注册，也不表示已读取邮件、发送消息或创建自动化。其 `events.jsonl`、state 和 registry 按步骤写入，恢复依赖人工比较 revision；因此只能验证字段和续行习惯，不能证明产品的原子提交或 exactly-once。

## 候选 PR 顺序

详细的文件范围、依赖、反例、验收和回退见 [PR 计划](courtwork-pr-plan.md)；字段、操作和披露草案见 [契约草案](contract-draft.md)。候选状态都是 `planned / not_started`，Astra 负责架构、Core/service 集成和迁移裁定，作者不自称独立接受。

| ID | 交付 | 依赖 | 暂不声称 |
|---|---|---|---|
| ATT-BE-01 | 沿同一 Core owner 增加 Attention domain、事件/审计、关系 ref、schema-aware 查询、disclosure gate、typed action 和 Runtime adapter seam；首个纵切建议复用现有数据库 | Astra 冻结对象 schema、`app_run` 关联策略和 Core migration/recovery 方案 | 首个纵切不另建 sidecar 事实源、没有自动化、没有跨用户 ACL、没有外部发送 |
| ATT-FE-01 | 现有前端单 writer 队列中的 Human Attention surface，消费稳定 HTTP/Work seam，显示事实、依据、下一动作和错误态 | ATT-BE-01 稳定且进入 FE 队列；仅改 `app/web` allowlist | 没有模型调用、没有前端状态权、没有把 badge/已阅当决定 |
| ATT-RT-01 | 用手动 Codex loop 和合成 fixture 验证 discover/inspect/propose/recover/replace 的适配能力矩阵 | ATT-BE-01；独立 runtime 与数据目录 | 不把 Practice 文件格式当作任意 runtime 兼容，不建 scheduler 或 sidecar |

## 证据边界与停点

- 本包的源码坐标是基线读取结果，不是对当前 main 的新实现验收；开工前必须重读实际 main、branch、HEAD、status 和目标文件。
- 研究采用的成熟度、性能、规模、兼容性和法律效果主张只保留在 [来源索引](source-index.md) 的对应核验等级；未核验项不得变成选型或发布承诺。
- 首个有意义的正例是：创建一个 Attention，关联一个或多个 Matter 和一个执行 ref，经人类 action 或已有 policy 授权且可验证的维护 adapter 更新，在删除/替换 Session 后仍能从 Core 读回并解释其来源。首个关键反例是：同一运行结束后自动变成 `resolved`，或未经 disclosure 许可泄露 registry/descriptor；两者都必须失败。
- 若现有 Core 合同已经满足某个读取消费者，交付索引和反例证据即可停止，不为了“memory”名词另建总控服务。若无法在同一 owner 内保持对象、事件和恢复语义，先升级架构裁决，不进入 UI。

关键裁决、独立目录限制和 Paper 处置记录在 [本轮裁决](adjudication.md)。

交付导航：[逐turn与外链索引](source-index.md) · [局部选型](selection-index.md) · [外部核验](verification.md) · [本轮交付检查](delivery-checks.md)。

后续[TeamAI局部实践索引](../teamai-2026-09-09/README.md)补充资源治理、原生格式转换、recall锚点与friction候选来源，复用本包ATT接缝，不另立Attention状态owner。
