# AM-B 续行：Astra 核心与 Terra 有界派单

2026-09-09，读取基线 `main@0480c1766cfd8c429e33c136fc7e4f973f01a731`。用户要求后端 PR 续行、Luna explore；成熟实践且验收明确的任务可派 Terra，模型能力瓶颈及关键 harness core 由 Astra 亲写。本文是可派工合同，不表示 Terra 已启动或 AM-B 已实现；当前产品状态仍由 [current](../../current.md) 维护。

原 main 有一项前端证据未提交修改，本单从固定 HEAD 建隔离树。Fable 前端继续原单 writer 队列，本单不派前端、不编辑 `app/web/`、brand、发布面或其证据。ES-01、Attention、BE-30、AM-C 离线基线与 AM import 边界已合流，不能重复派作未实现工作。

## 裁定与开工次序

沿 [AM-B 原计划](../../research/architecture-maintenance-2026-09-09/pr-plan.md) 做两项延迟只读任务：launch 返回持久 handle，继续独立步骤，仅 get/wait 所需结果；先证明恢复与归属，再评价模型能否正确等待。继续使用 Pi，不创建第二套 Work/Attention authority。

| 顺序 | 单号 / owner | 最小结果 | 开工条件 |
|---|---|---|---|
| 可并行 | AM-B-T1 / Terra | 锁定版本的协议兼容探针与最终出站增量证据 | 可立即派；只写隔离测试/证据 |
| 可并行 | AM-B-T2 / Terra | 两文档慢任务与故障注入夹具 | 可立即派夹具；连接真实 host 验收须等 A1 |
| 主路径 | AM-B-A0 → A1 / Astra | 冻结执行/交付/恢复合同，再亲写首条 adapted loop | A0 先审 T1/T2 发现，A1 持独占 service/store/runtime 写权 |
| A1 后 | AM-B-T3 / Terra | 已冻结任务快照的纯只读投影与 packets | A1 固定 DTO/身份/权限/游标；Astra 挂接路由 |
| A1 后 | AM-B-T4 / Terra，非 A1 作者 | 重启/崩溃/旧 host 拒绝与退出演练 | 冻结产品 SHA、迁移支持矩阵和断言；Astra 接收 |
| 确定性验收后 | AM-B-A2 / Astra | 模型选择性等待与依据完整性评测；必要时 native 兼容裁定 | 使用明确授权的 provider 与预算；本轮不运行 |

T1 与 T2 可和 Astra 的 A0 并行；T3 与 T4 可在 A1 固定后分头执行。服务与数据写权始终串行。这里的 loop 指产品执行 loop，本文件不创建定时自动化或常驻轮询代理。

## AM-B-T1：协议与请求兼容探针

**为什么可派 Terra。** 锁版本、捕获真实出站、输入/输出合同与负例已有成熟方法；不需要模型替系统设计状态语义。继承 AM-A/C，禁止重做已有三项 local-fake golden。

**写权。** 新增 `app/tests/async-protocol.test.mjs`、`app/tests/fixtures/async-protocol/`、`evidence/async-loop-20260909/protocol/`。只读 `app/package{,-lock}.json`、Pi 已锁源码、`app/runtime/{pi-session-runtime,mcp-manager}.mjs` 与既有 architecture-maintenance 测试。无产品、依赖、lock 或 node_modules 修改。

**交付。** 仅新增 async-specific probe/evidence。对当前 Pi 0.85.1 / MCP client 2.0.0 写实际调用链与包内路径/hash；分别标 provider/API/model/adapter/mode 和 tested/unsupported/not-tested。只测所需组合，不做全生态矩阵。若依赖 seam 不能被无侵入捕获，交具体缺口给 Astra，不自改生产 hook。

**验收。** loopback 捕获在最终 payload 阶段；旧同步请求行为保持；partial 参数不被计为已执行；未知异步字段不得静默吞掉后标兼容。新旧 MCP task 形状与取消回执用独立 fixture，证明当前 client 的实际接受/拒绝，不能因为 SDK 存在类型就报端到端支持。所有 native 结论须分 serializer、parser、loop、continuation 四段；纯 fake 不证明模型原生能力。输出复现命令、基线和机器结果；Astra 审阅并复跑新反例。

## AM-B-T2：确定性慢任务与故障夹具

**为什么可派 Terra。** 可控进程、barrier、延迟响应、重复消息与进程终止是成熟故障测试手法，结果不依赖模型推理。

**写权。** 新增 `app/tests/fixtures/async-loop/`、`app/tests/async-fixture.test.mjs`、`evidence/async-loop-20260909/fixture/`。夹具暴露 launch 接收、执行开始、结果生成、回执发送四个可控 barrier；临时两文档、独立目录/port0。夹具状态不充当产品 task store；不改 service/store/Core，不模拟一套被宣称为真实产品的 continuation。

**验收。** A/B 可分别释放且 A 先完成时 B 保持阻塞；重复回执保留同一身份；支持丢 launch ACK、丢 result ACK、结果后断线、cancel/成功两种顺序、强制进程终止及重启后 query；能记录启动次数供检测盲重跑。测试用 barrier 而非毫秒性能阈值。夹具自测通过只关闭 fixture 单，Astra A1 必须通过真实 service 消费它再接受产品。

## AM-B-A0 / A1：Astra 亲写的最小 harness core

**责任。** Host 持有 job/invocation 的 origin、lineage、Run、provider call、能力/input 版本、执行结算及交付证据；Core 继续持有候选/决定，Attention 继续持有独立对象生命周期。任务完成不自动解决 Attention、不直接接受 Matter。

**A0 必须冻结。** 现有 RuntimeStore 如何承载持久任务、哪些转换同次提交；handle 不是权限令牌；execution 与 delivery 分开；未知如何核对；同 lineage 用户新回合与 callback 的串行/CAS；删除/分支/晚到回执与合法后继；取消/撤权/预算/来源变化；结果字节与引用保留、任务数量/结果大小/等待期限上限及清理规则。采用新 schema 时先写备份、旧 host 拒绝、独立恢复合同，不把升级数据交给旧 host。不得让 Terra 根据字段名自行决定这些语义。

**A1 写权。** `app/server/{service,store}.mjs`、`app/runtime/pi-session-runtime.mjs`、必要的薄 task 模块、对应正式协议/定向测试与迁移证据。Core/bridge 改动只有实际需要且经 Astra 记录责任后进入；不因 AM-B 顺手改 Attention 或 ES。`app/server/index.mjs` 的路由接线仍由 Astra 集中完成。

**必须穿过真实 host 的验收。** 两个已登记只读任务，独立步骤在 B 完成前继续、依赖 A 的步骤只等 A；完整参数和权限前无 dispatch；乱序/重复不会错绑；同 lineage 竞争不分叉；原会话删除不复活、不投最近会话；丢 ACK 后保留 unknown 并查询可查询任务，无证据不盲重跑；cancel 意图不篡改已成功结算；撤权后新执行被阻断；旧版本结果不静默适用于新输入；重启恢复身份/结果，关闭实验入口仍可读取和结算已有任务。旧同步路径回归通过。原 [八组故障矩阵](../../research/architecture-maintenance-2026-09-09/pr-plan.md)全部保留，不以脚本生成 final 代替依赖已满足。

原生 async 是后续单独裁定。当前进程内 Promise、Pi batch 并行、MCP task handle 三者都不能单独证明 provider 原生异步续行。Astra 才能决定是否需要窄补丁、显式 transcript 回放或 provider 状态；不先添加 response pointer 再假定可恢复。

## AM-B-T3：只读投影与 Fable 消费包

**写权。** A1 后新增 `app/server/async-task-view.mjs`、`app/tests/async-task-view.test.mjs`、`app/tests/fixtures/async-task-view/` 与消费说明。模块名是本单保留路径；参数/输出字段必须来自 A0 正式合同。Astra 接 HTTP/鉴权/事件端点，Terra 不修改 service/index 或 FE 文件。

**验收。** 输入单次已授权 owner snapshot；execution、delivery、时间/unknown、来源版本和可用动作分别投影，不写库、不推断 accepted。覆盖乱序快照、重复、cancel 竞争、重连游标、删除目标、旧来源、producer 缺席、stale revision；隐藏对象不得通过计数/分页/过滤泄露，纯投影不能代替端点认证测试。packets 带 schema/version、空值和明确 unavailable；Fable 决定 UI 排期，不将本单当作 UI 接受。

## AM-B-T4：恢复与退出独验

**写权。** `evidence/async-loop-20260909/recovery/` 内独立 runner、fixture、结果。只读被验产品；发现问题交作者修复，固定新 SHA 后原反例复跑。若同一 Terra 写过相关生产实现，应换未参与该实现的 Luna/Terra 做独验；作者修改过的验收代码另行标记。

**验收。** 从固定 Git SHA 提取产品，独立数据与进程，SIGKILL 落在 A0 声明的关键持久窗口；检查重启任务身份、重复投递、unknown、无盲重跑、历史缺席读取。若迁移存在，支持矩阵内正例全过、已有备份/损坏/不支持版本明确拒绝、旧 host 拒新库，备份在独立目录用对应旧 host 恢复。无迁移则标 N/A，不为演练制造迁移。shutdown/cancel/禁用入口不删除待核对记录。进程崩溃测试不宣称机器掉电耐久性。

## AM-B-A2：模型能力瓶颈与 native 决策

Astra 亲写任务与评分准则：同资料/工具/预算，对照同步与 adapted；测是否继续无依赖工作、仅等所需任务、是否错误 final、是否引用未完成/过期结果，另外报告时延、token 与失败。确定性脚本只证明 host 行为；真实模型评测另列实际 model/API/adapter/version。若模型不会正确调度，优先调整工具合同、上下文/依赖表达和模型选择，不把瓶颈发给 Terra 用大量轮询掩盖。没有测得需求前不做通用 DAG、swarm、自动 planner 或替换 Pi。

## 实践来源与采用边界

2026-09-09 有界读取以下官方页面；它们提供方法/协议参考，没有在 Courtwork 安装或运行。

- [Temporal 幂等与持久执行](https://temporal.io/blog/idempotency-and-durable-execution)：借重复执行下的稳定身份与幂等设计；[Activity execution](https://docs.temporal.io/activity-execution) 用于执行/取消/重试测试维度。只借机制，不引入 Temporal 服务或 exactly-once 承诺。
- [MCP Tasks 2026-07-28](https://tasks.extensions.modelcontextprotocol.io/specification/2026-07-28/tasks)：handle 先持久、get 查询含结果、update 补输入、按建议节奏轮询及协作取消作为兼容测试输入。[2025-11-25 实验 Tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks) 独立保留；不能混用 wire 或由相同状态词推导相同取消保证。沿既有 [AM 来源索引](../../research/architecture-maintenance-2026-09-09/source-index.md)，不将协议设计参考称为当前已验证能力。
- 本仓 [AM-C 证据](../../../evidence/backend-bounded-20260909/am-baseline.md)、[Attention 独验](../../../evidence/attention-independent-20260909/README.md) 已提供最终请求观测、固定 SHA、独立 fixture 和迁移反例方法。复用方法，原范围不会自动覆盖 async。

BE-31 含敏感输入约束、BE-32 含事件时间/历史迁移、BE-33 含可信结算原因，均应由 Astra 先冻结合同才可拆实现；不作为“顺手小 CRUD”并行争抢 service/store。AM-D 热替换、外发对账、Browser、多 agent 编排后置，当前两文档纵切不依赖它们。

## 回执规则

每单记录 base/代码 SHA、独立树、writer、命令/fixture、正反例、结果、未检项及独立验收人。产品变更运行相应定向检查、`cd app && npm test` 与 `npm run smoke`；纯文档只检查链接和 diff。合流前重读 main/status，显式 stage 路径，保留其他作者编辑。真实 provider、个人数据、外部发信、部署与 Paper 不由本派单启动。G1–G5 状态保持。

## Luna 只读探索回执

基线仍为 `0480c1766cfd8c429e33c136fc7e4f973f01a731`；Luna 未编辑产品、未运行模型，返回结论由主单 Astra 整理入本节。

- `app/server/service.mjs:156–186,882–1210,1337–1377`：active Map 与每 Run 的 entry.task 在进程内；initialize 把重启中 Run 标 unknown，cancel 缺本地 entry 时保留 unknown/not_in_process。不是 pending task resume。
- `app/server/store.mjs`：schema4 无持久 job/invocation/delivery 记录。`app/server/index.mjs` 没有可供 AM-B 消费的 task launch/get/wait 控制面。现有 Run API 不代表已有持久任务 API。
- `app/runtime/pi-session-runtime.mjs`：每 Run 新建 Pi AgentSession，pending/drain 是本地 Promise；wrapper 的 steer/followUp 未经当前 HTTP service 成为持久续行。不能将库方法存在当成产品交付。
- Luna 确认 T1/T2 可先派、T3/T4 依赖 A1，无重大范围冲突。三项收窄已纳入：仅 async-specific 增量、不把 T2 fixture API 当产品合同、MCP 只报告锁定 client 实际接受/拒绝。四段 native 链缺任一段，native 保持未验证，adapted 必须另有其实际证据。

本节是源码探索与拆单意见，不是产品测试或独立接受。主单完成本包本地链接检查与 `git diff --check`；没有产品代码变更，未重跑全量与 smoke。

## Email/GitHub human-loop 后续输入

用户补充 handoff 已入 [Attention human-loop 包](../../research/attention-human-loop-2026-09-09/README.md)。新增可派的仅为 provider 响应/故障夹具和 trace 合成向量；生产来源/trace DTO 及外发 gate/effect 沿 Astra 合同、AM恢复与DS-04接续。它们不阻塞本单两只读任务，也不将本单升级为发信/PR mutation。SDK resumable state 是参考，本仓 Pi 持久恢复仍须 A0/A1 实现验证。

## 2026-09-10 执行增量

用户已同意派单，以上“未启动/仅准备”为原始时点。Terra T1/T2与HL三项离线夹具已交付，Astra亲写A0/A1，正式合同为 [adapted read tasks](../../../app/docs/async-tasks.md)，[本轮证据](../../../evidence/async-loop-20260909/README.md)区分作者与非作者。A1 Runtime schema5新增asyncTasks，Core3/app4不变。T4写权具体化为新增 `app/tests/async-recovery-independent.test.mjs`、`app/tests/fixtures/async-loop/{host-child,host-adapter}.mjs` 与 `evidence/async-loop-20260909/recovery-independent/`；额外边界独验写 `async-boundaries-independent.test.mjs` 与独立证据目录。均不授予Terra产品修复权。

Astra在A1提供最小owner读视图与认证路由；T3专门纯投影/前端packets尚未派，避免从尚未接受的实现抢派前端。A2真实模型评测及native能力另单。本批不启动生产Gmail/GitHub摄取、写入或自动跟进。Fable队列由current的最新裁定维护。

## AM-B-T3 接收增量（2026-09-10）

用户自行唤醒实现agent后转交产品 `184e3f0` / 证据 `bd4b92a`，Astra非作者复核接受，见 [组合回执](../../../evidence/async-loop-20260910/task-view-integration/README.md)。T3按冻结的projectAsyncTask(task,{sessionExists,adapter},options)完成纯投影提取及实际HTTP packets；仅async-tasks.view委托新模块，service/store/策略不变。T3不再待派；UI消费仍须单独实施，A2保持后置。
