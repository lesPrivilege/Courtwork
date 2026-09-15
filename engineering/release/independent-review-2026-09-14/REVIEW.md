# CourtWork Release 前独立 Review

**日期：2026-09-14 · 状态：审阅完成；GitHub 写入被拒绝；待本地消费**

## 一、裁定摘要

**已完成的源码预览与 Pages 发布证据应保留；但目前不足以签署“首个正式工作闭环已验收”，也不足以签署完整 coding dogfooding 能力。** 五层责任已进入中央架构并有实际实现，不是空白设计；当前仍是固定 Pi 组合，而不是已验证可自由替换的通用 Runtime / Expert 平台。[C01][C02][C04][C07]

首要问题不是再做一层总架构，而是完成真实纵切、明确当前可用集合，并修正少数当前入口的语义漂移。下文 IR 编号只定位本次发现，不建立第二份路线图。原 G1–G5、DF-04 与 Runtime replacement 仍由既有合同、工单和 owner 持有。本报告为独立审阅意见，不替代本地架构裁决或人的正式 Decision。

### 固定身份

| 对象 | 身份 |
|---|---|
| Courtwork 审查基线 | `7e1a1ff047721e1ca6c871deba7f367ccea55a06`；提交尝试前重新查询 main，仍为此 SHA |
| 当前媒体中的产品源 | `fd96f96bc40725e301a4c92e0f2f50fd3245458c`；批次 `publication-release-20260914` |
| Schema-Engineering | `ec8d57ea9d2e69e84ebdc187472c5c50795804f7` |
| 当前论文修订 | 9.8 中文；英文仍是9.6历史绑定，当前英文入口 withheld |
| Courtwork 工程采用 | SE 9.6 / `d78fd312955c1f594e59cbdcbb0d3074ac355940`，不是自动跟随最新论文 |

身份依据：[C22][C26][S01][S02]，以及本次 GitHub branch/API 读取。当前论文版本与工程采用版不同是明确边界，不是错误。

### 本轮独立证据与限制

独立完成：通过 GitHub connector 读取当前合同、选定代码接缝、研究消费记录、发布源码、manifest、Actions 状态及 Runtime job 步骤；定向核对三个官方外部来源。源码逐文件范围见 `SOURCES.md`。

没有完成：全仓逐行审计、所有历史聊天逐项核对、在本环境重跑测试、真实模型调用、安装迁移、浏览器交互、截图及无障碍验收、全部原始运行字节复核。本环境 Git clone 因 DNS 失败；GitHub connector 读取正常。线上 Pages 直接读取失败，故本轮发布面判断依据固定源码、工作流及仓库已有回执，不冒称重新目验线上页面。

Exa 已实际调用，但返回402 / credits exhausted，未获得结果；外部机制核对来自普通网页读取的官方资料，不记为已完成 Exa 扫描。

## 二、五层架构：责任成立，泛化程度各不相同

| 责任 | 当前可定位实现 | 独立判断 |
|---|---|---|
| Adapter：Model / Provider 注册与协议 | `provider-definitions.mjs`、模型能力、connection/config、Pi 协议集成 | Provider definition、连接身份、凭据槽与模型能力已分开。注册源码明确支持的 API 与 endpoint 要求，不只是按模型名称选择。仍是当前固定组合，不是任意 adapter 安装或第二 Runtime。 |
| Harness Core：agent loop / contract | Pi `createAgentSession`；`pi-session-runtime.mjs`；Host Session/Run/event | 实际 turn/tool loop 复用 Pi，`app/harness/` 的协作对象不是第二 loop。Host 提供本次获准 tools/context，Pi 持有 native transcript。Host 生命周期尚有直接 Pi 依赖，见 IR-03。 |
| Harness Extension：执行能力 | Control Plane、Host tools、MCP、`subagents.mjs` | 有受控工具与真实的有界 Spark 委派实现。源码明确 `parallel:false`、`handoff:false`、不递归。尚非通用团队、任意插件、可执行 hooks 或桌面/浏览器自动化平台。 |
| Work Core：数据与工作效力、编排约束 | 单一 Core owner / SQLite、领域版本、候选、决定、治理与 Attention 合同 | 正式效力不从 Run 成功推导；投影可重建。数据治理不等于所有文件迁入一份 DB；执行调度策略也不能取得正式状态写权。当前编译/组合职责分布在已有模块，不能称独立通用 WorkCompiler 服务已完成。 |
| Work Extension：垂类工作契约 | Work adapter、domain policy、可信静态 registry | 已有领域候选校验及共享 Core 消费者，不是仅换 prompt。仍是受限 development 组合；共享投影内存在垂类分支，见 IR-04；通用 Expert 安装分发未验证。 |

依据：[C01][C02][C07][C09][C10][C11][C12][C13][C15]。其中模型能力完整实现与全部控制面未作全文件审计，不能把模块入口表当成所有路径均通过的证明。

**关键不变量应继续保留：** Event Log ≠ Work/Matter State ≠ Compiled Context；Provider 可替换 ≠ Runtime 已可替换；工具授权 ≠ 成果接受；Agent/Expert/Profile/Runtime ≠ 同一对象；消息通信成功 ≠ 正式工作推进。

不建议按五个名字创建五个服务或五套目录。长期应验证的是：普通 Provider、执行能力或垂类增量能沿对应合同完成，而不复制状态、改主 loop、发明另一套 UI 方言。这个性质需要通过实际增量验证，不能由目录或测试总数推导。

## 三、发现、影响与退出条件

### IR-01 · P1 / 正式工作 Release：真实 G 门未闭合

**事实。** 最新发布准备仍保留真实工作门：历史真实 Run 6 的候选 pending，没有人的 Decision；合成候选与新截图不关闭真实工作验收。源码预览发布与首个工作闭环 Release 是两种不同声明。[C04][C05]

**影响。** 已有机制及局部路径，不足以证明当前候选已完成“真实模型提出候选 → 人检查决定 → 正式 Artifact → 新 Session 接续已接受工作”。这不是要求一次演示证明一般专业准确性，而是完成项目自身已采用的最小产品闭环。

**最小退出。** 沿原 G1–G5 归并证据：固定候选，或明确各证据的源码等价关系；按既有授权完成必要真实模型路径，由真实人检查并作决定；保留 Decision、Artifact、basis、source 版本及新 Session 接续记录。原要求的过时依据、重复请求、错误 actor、失败/取消/恢复反例按实际接缝提供；复用旧证据应说明相关性。G4 仍需原门的2–4分钟可公开闭环演示，G5 逐项映射当前支持声明。[C05]

不得靠脚本代签人审、把 pending 改称 accepted、把旧截图重标为新真实回执。也不需要为了补一个缺口反复跑无变化的全部测试。[C19]

### IR-02 · P1 / 完整 coding 声明：Agent 自己执行检查的环节缺失

**事实。** 当前支持清单明确没有 agent-invoked repository test runner；指令文档明确没有 Host slash dispatcher 或 public manual-compaction。旧 coding 证据汇总明确测试由人执行，不能改称 Agent 执行。当前 Pi 集成关闭 builtin tools 与默认资源发现，上游 coding 能力不能自动算作本 Host 的暴露能力。[C07][C08][C11][C27]

**影响。** 读、查、改、查看结果已有承载路径，但“Agent 运行检查 → 读退出结果 → 修正 → 人审 → 再次接续”的 coding 闭环未完整成立。DF-04 在原 NDA 首版中是条件项；本次明确关注 coding dogfooding，所以它是完整 coding 声明的前置，而不是追溯性地使普通 NDA 预览失败。[C06]

**最小退出。** 沿 DF-04 选一个受控仓库检查 recipe，不直接开放通用 shell。合同需明确 cwd、命令/argv、环境与凭据边界、超时、输出限额、取消与退出身份，记录 input/result 版本、diff 与 Run/tool 关联。固定 recipe 仍可能执行仓库代码，allowlist 不是 sandbox：先限定可信合成仓库，或独立验证隔离。

使用一个真实 Agent 走完“定位 → 改动 → 执行检查 → 读取失败或成功 → 修正 → 人审 → 接续”。失败、取消、未知结果必须保持可辨；工作接受继续由原 Work owner 管理。

Slash 只是入口，不是能力本体。自动 compaction 已实现，不应重开为完全缺失；未来 typed command 应复用同一操作 owner，未知命令在 command 路径上拒绝，并保留明确 literal-text 方式。模型声称“压缩完成”不能成为权威回执。[C08]

### IR-03 · P2 / 架构债务：Host 生命周期仍直接依赖 Pi

**源码观察。** `service.mjs` 直接从 `@earendil-works/pi-coding-agent` 导入 `SessionManager`，并组合 Provider、MCP、Subagents、Intake、Work projection。`createSessionRun` 接受 Pi SessionManager 并使用 native session 身份。这与中央架构自述一致，不是只靠旧探查报告推断。[C10][C11]

**影响。** Provider 配置可替换不等于 Runtime 即插即用；更换执行器仍涉及 Host 生命周期。

**建议。** 下一实际 Runtime replacement 消费者触发时，先建立最小生命周期 Port：session open/create、run start、event/terminal mapping、stop/close 与 recovery 能力声明。保持 Host 身份和 Work owner 不变；先保留现有 Pi 契约回归，再由第二执行器证明实际替换范围。Resume native transcript 与从 Work State 开新执行应分别声明。

第二 Runtime、完整 Core-free 组合根不新增为当前源码预览前置。已有实现可先保持，不为“纯粹解耦”在首发前大改。

### IR-04 · P2 / 架构债务：共享 Core 投影知道具体垂类

**源码观察。** `app/core/owner.mjs` 同时定义 `MEMO_PROPOSAL_SCHEMA`，在 `workProjection` 中直接判断 `se-file-memo-v1`，选择 action schema、file capability、revision 行为与 queries。[C12]

**影响。** 当前领域可以工作，但“普通新垂类只新增 Work Extension”的长期性质未完全成立。领域行为增加可能使共享投影成为热点。这里没有据此认定越权接受、事务损坏或现有结果错误；它是可定位的耦合，也可以是阶段性产品选择。

**建议。** 在下一 Work Extension 增量中，将专用呈现/动作描述交回可信领域 policy 或既有 extension descriptor。Core 保留通用状态、actor、版本、basis、幂等与正式转换检查，不能把正式接受 authority 下放给插件。用小型新 contract 或现有两领域的参数化反例证明：领域投影可变，而共享 owner 不需要再新增 contract-id 分支。不引入模型生成脚本 renderer。

### IR-05 · P2 / 发布与治理收尾：当前入口存在语义漂移

| 当前入口 | 可复核对照 | 最小修订 |
|---|---|---|
| `engineering/architecture.md` 数据归属 | 写 Host schema 13；当前 `store.mjs` 为 `SCHEMA_VERSION = 15`。`AGENTS.md` 还保留未明确分层的 Runtime schema 4 措辞。 | 当前入口分别指向 Host/Core/bridge 的实际版本与迁移 owner；明确旧4指什么。 |
| `site/README.md` | 多处称 `publication-integrated-20260912 / 0768822` 为当前；实际 main manifest 为 `publication-release-20260914 / fd96f96`。 | 更新当前批次指针或增加明确 superseding 说明，保留历史截图与回执。 |
| SE 当前 README / CHANGELOG | 9.8 仍写“未推送或部署”；同仓 HEAD 提交记录 verified 9.8 Pages publication，Courtwork 最新发布记录也记载已发布。 | SE 发布 owner 同步当前发行状态并链接回执；不抹掉历史候选记录。 |

依据：[C01][C14][C20][C21][C22][C04][S01][S02]。这是链接绿灯不能发现的语义一致性问题。

**不能误修的两点。** `site/release.json` 的 `9e5384f` 是旧标本/benchmark 的独立固定源，不应为了所有 SHA 一致而改写。Paper 最新9.8与产品采用9.6也是正常分轨。[C21][C23][C26]

## 四、长期维护与“研究皆有回音”

已有可消费的治理基础：owner 入口、固定证据、原始输入与裁决分离、UI precedent / grammar、简短 PR 模板、风险驱动验证与独立 Runtime CI。仓库治理裁决明确不采用普遍 YAML resolver、每目录 AGENTS、超级 schema 或强制四 Agent 流程；本 review 不重引入这些机制。[C17][C18][C19]

实际跨层变化比文件大小更重要。Git tree 中 `service.mjs` 为141,684 bytes，`store.mjs` 为59,558 bytes；这里只将其作为组合压力指标，不以长度判定质量。IR-03/04 提供具体接缝，后续应按真实增量串行提取责任，不按行数阈值发动重构。

一次变更的最小回音可以沿现有记录保持：

> 输入/任务身份 → 对应 owner 与最近先例 → 采用、调整、不采用或推迟及理由 → 合同/实现差异 → 相应反例和固定证据 → 被允许的产品声明。

继续在原工单/receipt 中保存，PR 只索引，不复制第二套进度真源。正式变化的 authority 按对象归属处理，不发明一条覆盖所有领域的万能线性权威顺序。

对稳定、反复失守的边界，可在现有 Node 检查中增加小范围确定性断言：Core 不新增 SDK/provider/UI import；新 capability 不绕过 admission 和权限；普通垂类增量不继续在共享 owner 增加专用 ID 分支。这是针对性建议；本轮未完成全仓 import graph 审计，不能断言这些自动守卫全部不存在。语义和视觉判断仍由既有 owner 与独立 review 承担。

### 最近讨论的抽查映射

| 主线 | 已读落点 | 判断 |
|---|---|---|
| Court / orchestrator、五层与可替换执行 | 中央架构；Features ownership/runtime-anatomy；Expert/compile-commit 图注 | 已进入架构和发布源码，不能将目标泛化能力误作当前可用能力。 |
| Chat / Attention / Spark；无预选 Project 入口 | Chat 页面源码；当前支持集；Spark Assignment 源码 | 已吸收。Spark 不再只是只读视图，但尚非后台并行、多 Runtime 或外部网络探索。 |
| 数据 / 组织工程、治理后披露 | SE9.8 Practice §2.5 canonical owner/Sidecar，§2.7 state-mediated coordination，§2.8 文档角色 | 已进入实践正文，不是仅堆产品功能；也没有据此证明成本收益。 |
| 人类 attention、长期 UI 体例 | UX Grammar 消费记录、模板、README/AGENTS 入场路径 | 有明确采用与不采用；规范存在不等于全 UI 已获视觉/行为验收。 |
| 仓库治理、测试外部实践 | repository-governance 与 verification | 有回音包括拒绝/推迟，不要求每篇研究都转化为实现。 |
| Coding、slash、computer use、通用扩展 | 支持说明、commands、原 DF-04 等 | 研究/裁决有响应，但未全部变成当前能力，特别是 IR-02。 |
| Paper ↔ 工程反馈 | PAPER.md 的固定采用与 Practice Index 反馈规则 | 机制存在；本次未逐项核对所有近期开工结果回写 Index，不签完整双向覆盖。 |

依据：[C02][C07][C08][C15][C17][C18][C24][C25][C26][S03]。本次没有逐条核对所有原始 Chat，所以“主要方向已吸收”可以成立，“所有历史讨论均完整消费”尚无本轮证据。

## 五、Pages 与 Paper 发布面

发布源码已经明确表达工作治理而非仅做 Code Agent：Home 有 Event log / Work state / Context projection 三视图；Features/Experts 解释工作状态和执行层、候选与正式变化；Chat 表达无 Project 开始以及来源片段进入待审候选，Spark 表达独立 Explore 与精确来源版本。[C24][C25]

Get 源码将安装入口限定为 source preview、固定安装 SHA、固定 Pi 组合，并链接 supported-preview。应继续让首页讲稳定产品定义、让安装/支持面准确交代今天可用范围，而不是把内部工单和所有未完标签铺满首页。[C25]

当前媒体 manifest 明确 synthetic、无外部模型调用、没有独立视觉接受声明；这不能被重述为本轮已完成独立视觉验收。[C22] 此次未能直接读取线上页面，因此不评价新的像素布局、动效、200%缩放或读屏效果。

Paper 9.8 已将既有系统 authority、状态/检索/文档分层、state-mediated multi-agent 等内容纳入 Practice；工程仍绑定9.6，应先经过受影响合同/验证的升级裁决再改变 pin。Paper 正文不承担产品功能清单，产品施工细节也不必全部进入论文；只有能改变命题的最小观察才应回到 Index。[S03][C26]

## 六、已解决项：不把旧问题再派一次

本次实际读取的 Runtime CI run `34782126973` 绑定审查 HEAD，Node22.19.0与24.x两个job均成功：锁定依赖安装、历史输入校验、synthetic tests、smoke、文档链接步骤均为success。Pages run `34782127384` 同一 HEAD 也success。

因此，较早“只有 Pages workflow、没有 Runtime CI”的问题不再作为当前 blocker。历史838/839及隔离重跑不覆盖成当前数字；当前 CI success 也不解释为真实模型或全产品能力通过。

Core review summary 已有从真实 projection 推导的实现，不应继续以旧“缺 pending 摘要”为当前结论。[C12] Spark 已有实际子任务和精确来源工具，不应继续按旧固定基线中的只读视图定性。[C15][C27] Provider 注册已有独立声明，不应再按完全散落的模型名称判断。[C09]

## 七、外部机制核对

**OpenAI Agents SDK Models：** Model / ModelProvider 接入与 Runner 使用区分，API shape 与 Provider 能力有差异。可借鉴“协议接口与能力声明分离”，不能据此推导本仓已替换 Runtime。[E01]

**Anthropic 长任务 harness 实践：** 增量工作、可接续工件和真实测试用于避免过早宣称完成；compaction 本身不足。这支持检查环境中的结果，不要求照抄其全部流程。[E02]

**LangGraph Persistence：** thread-scoped checkpoint 与 graph state 之外的 application store 分开。可参照运行连续性和应用数据分离；它不自动提供 Courtwork 的正式 Authority / Decision 合同。[E03]

本轮不建议引入 LangGraph、替换 Pi、重写技术栈或增加框架。五层精确分类是本地设计裁决，并非以上资料共同认证的行业标准。

## 八、串行消费与关闭条件

先保持声明边界：源码预览、首个正式工作闭环、含完整 coding 验证的开发者版不能混称。IR-01/02 保留原门；IR-05 可作为下一笔发布/治理收尾优先修正；IR-03/04 登记架构债务，在真实消费者到来时兑现，不为这一轮审阅启动泛化重构。

本报告被关闭只表示已消费，不自动表示 Release 批准。建议原 owner 在已有记录中给 IR-01至IR-05逐项登记处置、理由、施工入口及证据，真实能力与合成 UI、作者与非作者范围分列；当前入口修正不重标旧证据；未核对的历史覆盖继续保留为未核对。

**最终意见：架构方向和治理基础可以继续，现有预览证据有效；正式工作与完整 coding 能力暂不签收。优先补真实纵切和少数入口矛盾，不再新建一层总架构。**

## 九、远端提交回执

按用户请求已实际尝试提交：

1. `GitHub.create_issue`，目标 `lesPrivilege/Courtwork`，包含完整独立 review 正文，返回 HTTP403：`Resource not accessible by integration`。
2. 改用独立文档分支 `review/independent-release-20260914`，基于审查 SHA 调用 `GitHub.create_branch`，同样返回 HTTP403。

因此没有新增 issue、分支、commit、PR 或部署。未尝试改 main、绕过权限或改用其他身份。随包提供 Markdown 正文、来源索引、JSON回执与可提交的 issue payload；它们是本地交付，不是远端提交成功的证明。


## 来源链接

[C01]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/architecture.md "当前模块与依赖边界"
[C02]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/research/architecture-node-2026-09-13/architecture.md "五层架构裁决"
[C03]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/current.md "当前工程状态"
[C04]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/release/final-preparation-2026-09-13/README.md "最新发布准备及收尾"
[C05]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/execution/2026-09-08-main-round/public-readiness.md "原 G1–G5"
[C06]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/release/review-intake-2026-09-13/README.md "原独立审阅消费及 DF-04 裁决"
[C07]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/app/docs/supported-preview.md "当前支持范围"
[C08]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/app/docs/commands-and-compaction.md "指令与压缩边界"
[C09]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/app/runtime/provider-definitions.mjs "Provider 注册"
[C10]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/app/server/service.mjs "Host 组合及 Pi 依赖"
[C11]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/app/runtime/pi-session-runtime.mjs "Pi 执行集成"
[C12]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/app/core/owner.mjs "Core owner、投影与上下文编译"
[C13]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/app/extensions/work-adapter.mjs "Work adapter"
[C14]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/app/server/store.mjs "Host schema"
[C15]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/app/harness/subagents.mjs "Spark / Subagents"
[C16]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/.github/workflows/runtime.yml "Runtime CI 定义"
[C17]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/research/repository-governance-2026-09-14/README.md "仓库治理消费与裁决"
[C18]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/research/ux-grammar-2026-09-14/README.md "UX Grammar 消费与裁决"
[C19]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/verification.md "风险驱动验证"
[C20]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/AGENTS.md "Agent 入场规则"
[C21]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/site/README.md "Site 当前说明"
[C22]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/site/media/main/manifest.json "当前媒体 manifest"
[C23]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/site/release.json "旧标本独立来源"
[C24]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/site/src/copy.mjs "发布文案"
[C25]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/site/src/product-pages.mjs "发布页面"
[C26]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/PAPER.md "论文采用 pin 与双向反馈"
[C27]: https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/research/architecture-node-2026-09-13/explore/implementation.md "历史固定基线探查"
[S01]: https://github.com/lesPrivilege/Schema-Engineering/blob/ec8d57ea9d2e69e84ebdc187472c5c50795804f7/README.md "SE 当前 README"
[S02]: https://github.com/lesPrivilege/Schema-Engineering/blob/ec8d57ea9d2e69e84ebdc187472c5c50795804f7/CHANGELOG.md "SE CHANGELOG"
[S03]: https://github.com/lesPrivilege/Schema-Engineering/blob/ec8d57ea9d2e69e84ebdc187472c5c50795804f7/papers/src/practice.md "SE 9.8 Practice"
[E01]: https://openai.github.io/openai-agents-python/models/ "OpenAI Agents SDK — Models"
[E02]: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents "Anthropic — Effective harnesses for long-running agents"
[E03]: https://docs.langchain.com/oss/python/langgraph/persistence "LangGraph — Persistence"
