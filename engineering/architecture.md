# 工程范围与模块边界

本页提供当前模块入口与长期设计边界。技术候选见 [options](options.md)，交付记录见 [current](current.md)。

全场景、交互与部署的长期设计见 [Long-life Roadmap](roadmap.md)。本页 M01–M14 保存逻辑责任与模块边界；下方“最小交付”限定首个 continuity 纵切。低后果探索可用普通工具，单次 consequential action 可仅实现 commitment boundary，不把完整 Matter 作为所有场景的前置。

## 2026-09-11 · 术语与目标边界

[DEC-013 / Runtime与Work概念](architecture-runtime-canon.md)补充Model Adapter、Runtime Adapter、Runtime执行组合及Work Compiler目标责任；当前仍复用Pi，service仍有直接SessionManager依赖。完整编译服务、第二runtime与热替换证明未交付。下表继续描述实际模块，不能按目标词名推导同名服务已存在。

## 当前实现

BG-01补充：[Governed directory / Matter disclosure](../docs/work-core/governance.md)由既有Core owner查询领域对象；目录不落第二份状态，新增持久记录只保存Matter披露政策、事件与请求回执。Runtime工具只在全局Attention注入，Host每次捕获执行身份，Core每次检查对象范围与当前披露。

模块表起始基线：`00b2f2886e04aa7b7facb588d4375a246f3e341d`；当前交付与后续合流以 [current](current.md) 为准。应用由一个本地 Host 组合，下表按实际写入与执行职责导航。

| 入口 | 职责 | 接口与说明 |
|---|---|---|
| [`app/web/`](../app/web/) | Chat、文件、Review、Settings 与运行资源的浏览器呈现 | [界面组件](../docs/interface-components.md) |
| [`server/runtime.mjs`](../app/server/runtime.mjs)、[`service.mjs`](../app/server/service.mjs) | Host 生命周期、Session/Run、权限、上下文、受认证的人类动作与查询 | [HTTP API](../app/docs/api-v6.md) |
| [`runtime/pi-session-runtime.mjs`](../app/runtime/pi-session-runtime.mjs) | Pi AgentSession 与 ModelRuntime 集成 | [运行基础](../app/docs/runtime-foundation.md) |
| [`runtime/control-plane.mjs`](../app/runtime/control-plane.mjs)、[`mcp-manager.mjs`](../app/runtime/mcp-manager.mjs) | 声明式资源、作用域、调用策略与 MCP 生命周期 | [Runtime Control](../docs/runtime-control/INDEX.md) |
| [`harness/`](../app/harness/) | CW Thread交互成员关系与本地通信；child执行合同的有界入口，非第二个模型loop | [Thread / messaging](../app/docs/coordination.md) |
| [`server/async-tasks.mjs`](../app/server/async-tasks.mjs) | 可选的不可变异步读取任务、取消、恢复与消费记录 | [异步读取契约](../app/docs/async-tasks.md) |
| [`core/owner.mjs`](../app/core/owner.mjs)、[`client.mjs`](../app/core/client.mjs)、[`bridge.py`](../app/core/bridge.py)、[`core.py`](../app/core/core.py) | 同一个 Work Core 与 SQLite 事务，持有 Matter、候选、来源、决定、文件候选与 Attention | [Work Core](../docs/work-core/contract.md) |
| [`extensions/work-adapter.mjs`](../app/extensions/work-adapter.mjs)、[`domains/`](../app/domains/) | 领域输入、提议校验、绑定与呈现；NDA 和 Evidence Memo 共用 Core | [NDA](../docs/work-core/nda.md) |
| [`web/markdown-source.mjs`](../app/web/markdown-source.mjs)、[`web/markdown-reader.mjs`](../app/web/markdown-reader.mjs) | 固定版本 Markdown 来源、分页与只读阅读；Output Review 独立持有所有输出范围 | [双边界](../docs/output-review.md) |
| [`runtime/source-resolver.mjs`](../app/runtime/source-resolver.mjs) | 声明式来源解析，Host 提供受认证的 inspect 接口 | [来源解析](../docs/runtime-control/source-resolver.md) |

### 数据归属

Host 的 runtime JSON（schema 12）、会话日志、文件历史与 Core 数据都放在显式指定的运行数据目录内。Core 使用该目录下既有的 `extensions/evidence-memo/state.db` 坐标，由 `WorkCoreOwner` 创建唯一客户端；这个路径是兼容坐标，NDA 不另建数据库。Core user schema 4 / bridge app schema 5 与 Host schema 12 分别演进。

UI 通过 Host 读取投影和提交动作；Pi 执行模型与工具；领域适配器校验候选并经 Core 提交。Run 事件与已接受成果各有自己的持久化 owner。完整迁移要求见 [运行文档](../app/README.md#store-schema-v5-validated-v3v4-upgrade)。

## 最小交付

一个人围绕一个 Matter，读取材料、让 Agent 提出成果、检查证据与差异、接受或退回候选，在重启或替换 Session 后继续工作。

首个闭环只需一种 Artifact、一个 Reviewer、一个正式接受转换、一个有效版本指针、开放义务和下一次 Context。多用户、市场、自动训练、多 Agent 调度、跨设备同步和不可逆外发后置。单人仍区分 propose 与 approve；研究者使用顺畅不能证明专业能力可分发。

```text
Human Work Surface ── Work API ── Semantic Core ── Matter Repository
                           │            │
                           │       Context / Run Plan
                           │            │
                           └──── Host Adapter ── Generic Agent Runtime
                                                    │
                                              Model / Tools
```

这是逻辑责任图，不要求微服务。正式状态由 Repository 在 Core 的提交边界下维护；Runtime 可拥有执行日志，GUI 可拥有临时交互状态。二者均不能成为第二份已接受成果真源。

## 局部工程单元

| ID | 单元与所有权 | 输入 → 输出 | 依赖与失败责任 | 实现姿态 |
|---|---|---|---|---|
| M01 | Provider 与模型运行 | 请求、模型配置 → 流、usage、错误 | 由宿主处理协议；Adapter 保留未知 usage、超时和模型身份 | 复用 |
| M02 | Loop 与 Run 控制 | 冻结 Run Plan → 运行事件、terminal outcome | Runtime 执行；Adapter 区分排队、steer、cancel、失败和不确定结果 | 复用，不重写循环 |
| M03 | Tools 与执行环境 | scoped capability → tool result | 参数、预算、路径、网络、子进程由执行边界约束 | 受限工具优先；沙箱另验 |
| M04 | Session、事件与适配 | 宿主 Session/events → 标准 Run observation | 隔离宿主 API、事件顺序、重连、恢复、版本差异 | 薄适配 |
| M05 | Semantic Core | Candidate + Decision + 当前版本 → 合法转换或拒绝 | 拥有工作语义、Authority、Completion 与转换规则 | 精密设计 |
| M06 | Matter Repository | 提交事务 → State、Events、active refs | 单一写入所有权、原子性、幂等、迁移、备份与恢复 | 成熟存储 + 自有契约 |
| M07 | Artifact 与 Evidence | 原始来源、候选内容 → 不可变版本、锚点、支持关系 | 不同版本不可串用；解析与格式保真需分别验收 | 成熟解析器 + 自有来源语义 |
| M08 | Registry 与 Activation | manifest、Matter、role、stage → 冻结 profile | 检查版本、适用范围、依赖与权限；未知能力拒绝激活 | 静态 preset 起步 |
| M09 | Context Compiler | 有效状态、义务、相关来源 → Context Projection | 记录选择/遗漏/版本；索引与摘要不可恢复已失效效力 | 确定性组装优先 |
| M10 | Work API 与 Review | 人的意图 → typed Decision / Query | 验证 actor 与 scope；工具审批和成果接受分开 | 自有小接口 |
| M11 | GUI 与投影 | State + Candidate + Evidence → 可判断的表面 | 断线、过时版本、待处理项和失败可见；本地缓存可丢弃 | 复用组件与交互范式 |
| M12 | Trace 与离线 Eval | 运行、版本、检查 → 可追溯证据与比较 | 不从模型自述推出成果接受；区分 mock、真实链与用户效果 | 先文件记录，后评测设施 |
| M13 | 宿主与分发 | 配置、凭证、运行进程 → 可启动和可升级的应用 | 凭证不进入浏览器/日志；打包、签名、平台权限独立验证 | 本地 Web 优先比较 |
| M14 | 依赖与兼容维护 | 上游变更 → 影响分析、适配/回滚 | 锁版本、许可证范围、迁移证据、上游反馈 | 手动维护先行 |

## 必须保持的依赖边界

Core 不导入宿主包、GUI 组件或 provider 名称。Adapter 可以依赖宿主接口，不能定义成果接受标准。Renderer 解释 Work Contract 的呈现声明，不执行任意模型生成脚本。Extension 可以提出状态转换与裁决维度，但不能替自己授予正式写权限。

模型获得材料读取与 Candidate 提交能力；人的接受操作走 Work API。若开放任意 shell，单纯把数据库放在另一目录不足以构成边界，必须证明该执行身份无法访问正式写入能力和凭证。初始 demo 可以关闭 arbitrary shell，并只运行受信实现的受限工具。

## 两个独立替换轴

替换 Runtime 只改 M04 及必要运行配置；替换存储只改 M06，并证明版本、事件和恢复语义保持。更换 GUI 不改变 Decision 后果；更换模型不改变 Completion。用第二实现验证实际被替换的部分，不据一个 Adapter 测试声称全系统可移植。

## 开工粒度

施工单元示例是“比较 SDK 与进程协议的取消/恢复边界”或“验证单写者存储的重复提交行为”。它应能独立形成 RD、裁决和退出路径。源码文件、类、数据库字段全表与 UI 像素规格留到相关单元获准实现之后。
