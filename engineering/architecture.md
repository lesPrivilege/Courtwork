# 工程范围与模块边界

本页提供当前模块入口与长期设计边界。技术候选见 [options](options.md)，交付记录见 [current](current.md)。

全场景、交互与部署的长期设计见 [Long-life Roadmap](roadmap.md)。本页 M01–M14 保存逻辑责任与模块边界；下方“最小交付”限定首个 continuity 纵切。低后果探索可用普通工具，单次 consequential action 可仅实现 commitment boundary，不把完整 Matter 作为所有场景的前置。

## 2026-09-13 · 当前五层架构

[五层架构裁决](research/architecture-node-2026-09-13/architecture.md)提供Adapter、Harness Core/Extension、Work Core/Extension的当前责任、设计公式及Chat/Attention/Spark/Experts闭环。既往术语与DRT排序已经distill，归档从[canon入口](architecture-runtime-canon.md)回溯；实际代码/owner/缺口见[Luna固定基线核查](research/architecture-node-2026-09-13/explore/implementation.md)。下表仍导航实现，不按目标名推导同名服务已存在。

## 2026-09-19 · Local Agent Orchestra direction

[The Astra ruling and Luna baseline](research/architecture-node-2026-09-13/orchestra-direction-20260919.md) register Local Agent Orchestra as the current research direction: continue the five layers and continuable workspace without adding a sixth layer, second ledger, or generic workflow engine. CW owns Host admission/effect/recovery, capability/permission/version binding, result references, cross-Runtime delegation, and diagnostics while reusing the locked Pi loop; Local and Hosted Runtimes meet the same minimum lifecycle obligations. Role, Kit, Agent Instance, ExpertDefinition/Instance, Runtime, Provider, Model, and Environment remain separate target vocabulary; this does not imply a Kit catalog/schema or a closed product loop.

The minimum Runtime Port reuses the existing RD-001 / Agents API contract: `describe/admit`, `start/continue`, `observe/recover`, `reply/tool-result`, `interrupt/cancel`, and `dispose`. Host/CW Run and native references stay separate, and a cancellation request is distinct from confirmed termination; unresolved outcomes retain unknown semantics. Staging follows the existing RD-006/DF-04/RD-009, P03/DRT-03, and RD-005 records without a new route.

The [2026-09-20 local-runtime and Settings ruling](research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md) specifies upstream maintenance, bounded-job versus managed-session adapters, and target Agents → Agent profiles / Runtimes configuration. Models retains provider ownership, Developer retains diagnostics, and CC Switch is consumed only as a Provider control-plane precedent. Connection removal, native uninstall and active-run cancellation remain separate operations.

The [personal credentials and hooks ruling](research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#personal-credentials-hooks-and-browser-dogfooding--2026-09-20) keeps configuration in the existing Models/Agents/Tools owners, with Host-held secret references and RD-009 hook governance. It is a deferred personal Settings improvement; enterprise identity/quota/gateway control belongs to separate FDE work. Secure storage is a target, not a claim of current encryption or process isolation.

## 2026-09-21 · Implemented Pi execution seam

[P03-B acceptance](execution/claude-frontend-harness-2026-09-16/evidence/p03b-pi-runtime-port-review-20260921/README.md) fixes source `c2be594`: `server/runtime.mjs` explicitly constructs `createPiRuntimePort` and passes it to `RuntimeService`. The port owns native journal open/create/history, execution/steer, compaction and Pi-event translation. Host retains Run identity/admission/status, tools/permissions, effects, credentials and recovery arbitration. Journals and schema are unchanged. Provider/model helpers and Pi-shaped options/outcomes remain coupling; this is the minimal execution seam, not completed arbitrary-runtime replacement. Unsupported recovery/tool-result submission stays explicit; no public steering route is added.

## 2026-09-21 · Preview and browser surface boundary

[Browser/Preview selection](research/architecture-node-2026-09-13/browser-preview-ruling-20260921.md) separates real artifact/dev-target Preview, human-visible Browser projection and Host-governed browser control. CW retains Node/Web and existing surface owners; Playwright-controlled isolated Chromium is the first later control candidate, while WebContentsView is conditional on a separately chosen native host. No package/runtime capability is adopted by research. The first authorized UI increment is tabbed Preview over existing readers, replacing card launchers; real browser execution and left-rail changes follow later contracts. Browser resources are not automatically Work Core Matter state, and closing/hiding a view is not execution cancellation or profile deletion.

## 2026-09-22 · Kit context planning seam

[Accepted reference-only K1/K2](execution/claude-frontend-harness-2026-09-16/evidence/kit-final-20260922/README.md) adds [`planKitContext`](../app/runtime/kit-context.mjs) as a pure Harness contribution over existing Runtime Control bindings and source identities. It verifies and attributes already-admitted content; it does not admit resources, grant permissions or own profile/Run persistence. No-Kit preserves the existing compiler. Kit catalog/selection/import and production Kit→Run freezing remain separate missing consumers under Runtime Control/Host/Adapter.

## 2026-09-23 · Selected profile draft preview

[Accepted K4](execution/claude-frontend-harness-2026-09-16/evidence/kit-profile-preview-final-20260923/README.md) overlays only an existing selected imported profile's source in memory through Runtime Control validation/resolution. Host derives scope/executor and shares pure K1/K3 planning and payload limits; preview never persists or grants authority. Save retains whole-config CAS and Run admission independently freezes context. The [K5 frontend consumer](execution/claude-frontend-harness-2026-09-16/evidence/kit-profile-editor-final-20260924/README.md) is now independently accepted for editing the existing selected source through these owners; it adds no persistence or permission authority.

## 变更边界

动产品代码前，在原任务合同注明本次改变的责任、事实owner、最近实现先例及必要的跨层修改理由。普通Provider、执行能力或垂类增量应沿对应合同接入；评审检查是否复制权威状态、使领域差异侵入主loop，或增加另一套UI语义。需要跨层修改时说明真实接缝与不变量，不能仅按目录数量判断解耦。

执行、领域校验与正式接受分别归原owner。Extension可提供候选、专用动作与能力描述；Core继续检查actor、basis、版本、幂等及正式转换。工具获准执行、模型完成运行或领域校验通过，均不能替代成果接受。

架构债务在原合同记录具体耦合、真实消费者触发条件与最小退出证据。Runtime替换、新领域接入或可复现的不变量失败触发必要重构；文件长度与目录整齐不能单独构成理由。新增自动守卫须有明确可判定的合同边界。具体recipe、生命周期接口和领域迁移方案留在各自施工合同。

## 当前实现

BG-01补充：[Governed directory / Matter disclosure](../docs/work-core/governance.md)由既有Core owner查询领域对象；目录不落第二份状态，新增持久记录只保存Matter披露政策、事件与请求回执。Runtime工具只在全局Attention注入，Host每次捕获执行身份，Core每次检查对象范围与当前披露。

模块表起始基线：`00b2f2886e04aa7b7facb588d4375a246f3e341d`；当前交付与后续合流以 [current](current.md) 为准。应用由一个本地 Host 组合，下表按实际写入与执行职责导航。

| 入口 | 职责 | 接口与说明 |
|---|---|---|
| [`app/web/`](../app/web/) | Chat、文件、Review、Settings 与运行资源的浏览器呈现 | [界面组件](../docs/interface-components.md) |
| [`server/runtime.mjs`](../app/server/runtime.mjs)、[`service.mjs`](../app/server/service.mjs) | Host 生命周期、Session/Run、权限、上下文、受认证的人类动作与查询 | [HTTP API](../app/docs/api-v6.md) |
| [`runtime/pi-runtime-port.mjs`](../app/runtime/pi-runtime-port.mjs)、[`pi-session-runtime.mjs`](../app/runtime/pi-session-runtime.mjs) | Explicit Pi execution port; native session loop and ModelRuntime integration | [运行基础](../app/docs/runtime-foundation.md) |
| [`runtime/local-pi-process.mjs`](../app/runtime/local-pi-process.mjs)、[`local-pi-host.mjs`](../app/runtime/local-pi-host.mjs) | Explicit offline Spark process consumer; Host/Store retain child admission, typed Run receipts and unknown fences | [Tool-less consultation](../app/docs/spark-agent.md#local-pi-process-consultation) |
| [`runtime/control-plane.mjs`](../app/runtime/control-plane.mjs)、[`mcp-manager.mjs`](../app/runtime/mcp-manager.mjs) | 声明式资源、作用域、调用策略与 MCP 生命周期 | [Runtime Control](../docs/runtime-control/INDEX.md) |
| [`harness/`](../app/harness/) | CW Thread交互成员关系与本地通信；child执行合同的有界入口，非第二个模型loop | [Thread / messaging](../app/docs/coordination.md) |
| [`server/async-tasks.mjs`](../app/server/async-tasks.mjs) | 可选的不可变异步读取任务、取消、恢复与消费记录 | [异步读取契约](../app/docs/async-tasks.md) |
| [`core/owner.mjs`](../app/core/owner.mjs)、[`client.mjs`](../app/core/client.mjs)、[`bridge.py`](../app/core/bridge.py)、[`core.py`](../app/core/core.py) | 同一个 Work Core 与 SQLite 事务，持有 Matter、候选、来源、决定、文件候选与 Attention | [Work Core](../docs/work-core/contract.md) |
| [`extensions/work-adapter.mjs`](../app/extensions/work-adapter.mjs)、[`domains/`](../app/domains/) | 领域输入、提议校验、绑定与呈现；NDA 和 Evidence Memo 共用 Core | [NDA](../docs/work-core/nda.md) |
| [`web/markdown-source.mjs`](../app/web/markdown-source.mjs)、[`web/markdown-reader.mjs`](../app/web/markdown-reader.mjs) | 固定版本 Markdown 来源、分页与只读阅读；Output Review 独立持有所有输出范围 | [双边界](../docs/output-review.md) |
| [`runtime/source-resolver.mjs`](../app/runtime/source-resolver.mjs) | 声明式来源解析，Host 提供受认证的 inspect 接口 | [来源解析](../docs/runtime-control/source-resolver.md) |

### 数据归属

Host runtime JSON (accepted schema22), session journals, ArtifactHistory and Core data live under an explicitly selected data directory. Core retains `extensions/evidence-memo/state.db`, created through the single WorkCoreOwner client; NDA does not create another database. Core user schema4 / bridge app schema5 evolve independently from Host schema22. Runtime22 stores the Session's executor choice and the Run's actual port identity; the first new Run in a migrated Session pins its factory reference atomically. The [K3 contract](execution/claude-frontend-harness-2026-09-16/kit-run-binding-20260922.md) adds Run-owned Kit summaries with immutable plan/context payloads through ArtifactHistory. Profile source v2 uses existing Runtime Control/CAS; ordinary Chats can choose only an eligible executor before any Run/native history, while Kit admission remains verified in-process Pi only. The [R1 adoption](execution/claude-frontend-harness-2026-09-16/evidence/runtime-selection-r1-final-20260923/README.md) accepts this bounded backend. Existing-Chat profile selection is accepted under E1; the K5 existing-profile source editor is accepted, while executor management UI, structured Kit creation/acquisition and live managed-runtime availability remain separate.

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

替换 Runtime 的目标接缝为 M04 及运行配置；当前service的Pi SessionManager耦合还需先移出，不能把该目标当成今天仅改一个adapter即可完成的事实。替换存储只改 M06，并证明版本、事件和恢复语义保持。更换 GUI 不改变 Decision 后果；更换模型不改变 Completion。用第二实现验证实际被替换的部分，不据一个 Adapter 测试声称全系统可移植。

## 开工粒度

施工单元示例是“比较 SDK 与进程协议的取消/恢复边界”或“验证单写者存储的重复提交行为”。它应能独立形成 RD、裁决和退出路径。源码文件、类、数据库字段全表与 UI 像素规格留到相关单元获准实现之后。

## 2026-09-20 · Pi identity and understandable configuration

Pi remains the upstream runtime name and development target; existing underlying IDs are retained. No fork-specific product identity or migration is introduced. The [comprehension and document-ownership contract](research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#comprehension-presentation-and-document-ownership) keeps the five engineering layers internal while presenting consistent Agent/Kit/Runtime/Provider/Model relationships through existing owners. Multica informs coherent architecture, documentation and Settings organization; it does not add another state authority.
