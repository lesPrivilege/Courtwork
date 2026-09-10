# Courtwork · Pro 架构审查完整正文

本文件按阅读顺序完整拼接主报告与全部工单；与分件共享 HPRO 标识，不产生额外授权。


---

<!-- Original component: README.md -->

# Courtwork · HPR 架构审查返回包

日期：2026-09-10。**这是审查建议与候选施工合同，不是合入、部署或产品验收回执。**

送审文档：`d22eb66ef1b335b95202c8c0a34c425acb59a2f9`；产品代码：`a2b084da09ba14a92f4e94bae49c9540d2e6dced`。本包未改 GitHub 仓库、远端 main 或部署，也未启动另一个模型/执行者。最终接受、修改、拒绝、延后或补查由本地裁决者登记。

**建议：保留 Pi 0.85.1 执行链；先补齐通用能力和可检查的运行合同，再把 Work Core 从普通 Chat 启动路径中拆成可选组合。暂不换 runtime、不迁移 Matter、不重写 Rust。**

完整正文在 [FULL_REVIEW.md](FULL_REVIEW.md)，不是摘要。分件为 [HPR-01 基线与对标](HPR-01-baseline.md)、[架构与最小合同](architecture-contracts.md)、[HPR-02 小 PR 工单](HPR-02-work-orders.md)、[HPR-03 自足节点](HPR-03-gates.md)。每条工单还保存在 `work-orders/`，便于逐个领单。

## 本次实际完成的验证

| 项目 | 本次结果 | 结论上限 |
|---|---|---|
| 固定源码静态审查 | 覆盖见 `source-manifest.json` | 有界架构/调用链审查，不是全仓审计 |
| MCP 原文件字节核验 | 6836 bytes，Git blob `055e66223a91eec4a4aade665f8d96af488e9573` 一致 | 核验的是这一份源文件，不是 12 份输入或整个 checkout |
| 固定源码隔离诊断 | 4/4，含两个缺口复现和两个对照 | SDK 被桩替换；没有真实网络、真实远端副作用或产品全量运行 |
| 分页参考函数 | 10/10 | 只验证本包新函数；未接入 Courtwork |
| npm test / smoke / GUI / 真模型 | **未运行** | 不关闭任何产品或独立验收门 |
| 753 文档／3531 链接／12 哈希 | 用户提供的上游检查结果 | 未由本次重复核验 |

`tests/baseline-mcp.test.mjs` 的 PASS 表示**成功复现了所命名的基线行为**，不表示该行为正确。原始 TAP 与字节核验记录在 `evidence/`。

## 入账顺序

先保存本包及当前回复原文，不用本 README 代替完整正文；核对 `SHA256SUMS` 与 `output-manifest.json`。再按 `decision-register.json` 的 HPRO 编号逐项裁决，最后把采纳项投影至既有 roadmap/工单和交付证据。`localDisposition` 全部为 null，不能从“有工单”推断已经接受或实现。

`implementation-map.json` 同时给出「输出编号 → 工单」和「工单 → 输出编号」；原始来源、参考实现、负例及开放问题也有去向。源文件的 Git blob、已读范围与未核验项见 `source-manifest.json`。网页为本次读取的官方页面，不冒充历史快照。

当前平台消息 ID、会话 URL、平台可验证的原始模型标签未由本环境提供。本包不编造；由本地回收过程补记。附件哈希不覆盖尚未归档的聊天正文。历史对话原文、研究工具原始返回和本次工具日志若可访问，仍应另行原样回收。


---

<!-- Original component: HPR-01-baseline.md -->

# HPR-01 · 当前能力、对标与缺口

## HPRO-0001 · 基线和证据等级

文档入口固定 `d22eb66ef1b335b95202c8c0a34c425acb59a2f9`，产品代码按入口指定 `a2b084da09ba14a92f4e94bae49c9540d2e6dced`。不以不断变化的 main 替换它们。前者的回收规范已读；`current.md`、`roadmap.md` 只读了当前优先级及部分历史段落，完整历史尾部没有读完，已在清单中显式登记。其余本轮直接使用的必读专项文档及实际源码范围逐件列于 `source-manifest.json`。[S01–S14]

本次把“源代码事实”“文档说明”“隔离桩观察”“设计建议”“尚待实测”分开。代码版本是 RuntimeStore12 这一交付基线；较早文档出现的 schema5/9/11 不据此覆盖最新专项合同。原有用户数据与固定目录坐标保持不动。本包没有复跑上游自述的全量检查，也不把历史作者测试改签为本次独立验收。[S05、S14、C11]

## HPRO-0007 · 同任务、同权限的能力矩阵

下表的 GUI 列是已读界面源码或契约中的入口，不是浏览器亲测。保存、有效、已注入、真实执行分别判断。对标只说明可参考的实现/交互，不证明相同任务已经跑通。

| 用户任务 | 当前 GUI／控制面入口 | 实际执行链与持久 owner | 当前证据、缺口 | 对标与裁决 |
|---|---|---|---|---|
| 选择连接、模型、effort，得到流式答复 | Settings/Models；普通 Chat composer；本次未亲测 | RuntimeService → Pi ModelRuntime/AgentSession；连接/Run 属 RuntimeStore，key 属 credential file，native history 属 Pi | 已有两种 OpenAI wire format、compatible connection、catalog extras、generation/verify binding。不能称只有静态模型白名单；真实 provider 能力与 GUI 联调本次未验。[S14、C02、C05] | 保留这条生产路径。Codex `model/list`/会话控制仅作第二 adapter 候选，不为补目录而换整套 runtime。[W01] |
| 读文件、写结果、问人、取消工具 | Chat 的工具/permission/ask-user 面；Runtime Tools | `governTools` → workspace/extension/other executors；Run/Question 为 Host owner；内容历史按原合同 | 已有精确参数绑定、审批后 cancel/open 重查；workspace guard 不是 OS sandbox。新工具仍须走该门。[C04、C14] | 复用 wrapper/receipt；不另建工具执行总线，不把任意 shell 加入“基础完整”。 |
| 给 URL 让 agent 读取正文 | 尚无已证明的模型 `web_fetch` 入口；来源 inspect 接口存在 | `source-resolver` 对 locator 返回 unsupported，不读网、不 clone、不安装；当前实际 custom tools 链无内置 web fetch | 这是真后端缺口；provider `/models` 探测和 MCP 连接不等于通用网页读取。[C10、C02、C13] | 局部适配 OpenCode 的 URL 权限+格式转换分层；不搬它的 Effect/Bun 运行栈，也不凭 donor 声望推断网络安全。P09 新增受限读取。[U03–04] |
| 登记 skill 并按需加载 | Settings/Skills、Runtime catalog/source inspector | control JSON → skill frontmatter metadata → `runtime_load`；content/hash 进入 Run binding | 手动登记、catalog-only 和按需正文已存在；任意目录发现、assets/scripts 不存在。Pi 原生 discovery 被显式关闭。[C03–05、U01] | 保留 parser/loader，增加显式工作区根下的检查/登记；不打开 HOME 自动扫描或脚本执行。 |
| 连接 MCP 并调用工具 | Settings/MCP；显式 lifecycle/exposure/permission | MCPManager 拥有连接句柄，SDK 拥有协议，Host 拥有审批/Run | 支持 unauthenticated Streamable HTTP；resource/prompt 只列目录。分页和效果不确定性有已复现分支缺口。[C06、C13] | 保留 SDK；先修目录完整性和错误后效果语义。stdio/OAuth 不是本节点默认扩权项。 |
| 配置多层指令并查看最终生效值 | Instructions／Context／scope tabs | `compileControlContext` 已按 scope/id 排序；Host system prompt 在 service；隐藏 `runtime.context` 进入 native journal | 不是“system prompt 完全没有编排”；缺的是明确定义的层语义、完整有效快照、冲突说明和 compaction 下的实测保障。现有字符数仅是一个 compiler 的贡献。[C02–05、C12–13] | 扩现有链，不建第二 prompt 真源。先准确记录实际输入，再有界调整层位置与作用。 |
| 编辑、查看、关闭普通自然语言 memory | 当前 Memory providers 是 planned row；Attention 有历史会话读取工具 | `memory_list/read` 从 RuntimeStore 读已保留 user/assistant 事件，按 seq/hash 定位 | 历史会话读取已有；普通可编辑 memory 并未实现。历史陈述不是当前指令，也不等于 Core 正式事实。[C07、C12] | 在控制面增加人维护的文本资源；provider marker 保留原义。禁用注入与清理已有模型上下文必须分开处理。 |
| 用同一批工作来源审阅/接受成果 | 已有 Work/Review projection 与 typed human action | WorkCoreOwner/CoreClient → 原 SQLite Core；扩展产候选；human decision 正式生效 | 基线存在版本/候选/接受边界。普通 Chat 不应因此硬依赖完整 Matter；没有证据要求重建 Core 或迁库。[C08–09、S04、S10] | 保留 Work Core，拆应用组合接缝；不把接受操作泛化成模型可调用的 `approve`。 |
| 失败、取消、重启后继续 | Run/Question 状态及当前 Runtime 配置 | Host 结算、原命令 receipt、Pi journal；pending configuration fence | 已有取消粘性、projection drain、unknown、不盲重放。新组件不能绕过这些机制。完整关闭/恢复反例本次没有产品级重跑。[C02、C05、S14] | 以原行为为回归基线，补现有接缝的负例，不重造 durable workflow。 |
| 查 usage、context、来源、版本 | Runtime/Context、现有 usage 面 | 原生 usage/telemetry + Host projection | admittedCharacters 不是 tokens，也不是整个模型输入；web/skills/memory 新面须展示真实来源与未实现范围。[C03、C05、C13] | 保留 current/next/historical 分层；任何新 UI 都只消费后端能力与真实 receipt。 |

## 对标任务协议：本轮未伪造跨产品跑分

冻结一份合成工作区：两版材料、一个开放义务、一个更正来源、一个人为设置的写作偏好、一个显式 skill、一个两页 MCP catalog、一个可取消的读取。统一权限要求为：仅该工作区读取；写 out/ 每次询问；无 shell；网络显式批准；不得读取其他项目、HOME 或已有凭据。

分别检验：普通 Chat 读材料 → 加载 skill → 询问缺项 → 获批写输出；MCP 分页读取；网页读取；改指令/关闭 memory 后开始下一 Run；取消/断线/重启查询原 receipt。没有某项能力就标 unsupported；不能给 CW 手工塞结果后把它记成原生网络能力。另一产品无法建立同样权限边界时标“未能建立可比条件”，不把默认全权运行和 CW 受限运行直接比较。

本轮该端到端任务在三个产品上均为 **not-run**。实际执行只有下面的 MCP 隔离诊断及参考函数测试。这样的矩阵可用于选型与出工单，不足以支持速度、质量或成本胜出主张。[S11]

## 固定对标来源与负索引

| 来源 | 本次实际读取 | 可借鉴 | 不据此宣称 |
|---|---|---|---|
| Pi 0.85.1，`d981de1229ef899957bbe968bc8dcda02a21f477` | SDK 160–230；CW 已锁 adapter 的实际构造/loop 接缝 | 显式资源 loader、native session/tool loop；关闭 discovery 是 CW 构造选择 | 上游所有工具/skills 在 CW 可用；更高层 AgentHarness/lane 已接生产 |
| Codex，`713caa89f389acd9cbcd77016edbb607273826af` + 当前官方 App Server 文档 | 固定 README 中取消/协议等操作说明；官方 lifecycle/approvals/skills 章节 | 明确 thread/turn、approval request identity、中断 signal 与最终完成分离 | 本次已审完整 app-server 源码、已运行第二 adapter，或实验 dynamic tools 是无条件稳定 ABI |
| OpenCode，`b3f1a96c6dd7adeb28b36dd11add1998fc84d67b`，包版本 1.18.30 | `webfetch.ts` 与包依赖声明 | URL 级权限、传输和 HTML 转换拆分；其声明使用 htmlparser2 8.0.2 / turndown 7.2.0 | 已验证该 HTTP stack 的全部重定向/SSRF/流式体积界限，或应将全部框架搬入 CW |
| MCP 2025-11-25 tools 规范 | nextCursor / execution error 语义 | 合法分页必须有明确完成边界；isError 是执行错误而非效果回滚证明 | 此次已验证 2026-07-28 全协议或真实 SDK 的所有分支 |

Codex 中止某项请求的确认与实际完成/已发生效果是不同事实，且部分动态工具能力仍标 experimental；这是未来 adapter 必须逐项消费的边界，不是现在换 runtime 的理由。[U02、W01]

## HPRO-0008 · MCP 目录完整性：已复现的适配器缺口

固定 `mcp-manager.mjs` 在 connect 时各调一次 `listTools/listResources/listPrompts`，随后按数组长度限制并公布 healthy/connected；没有消费返回的 nextCursor。以合法的两页 SDK 桩返回，实际结果为：只请求一页、只公布第一项、health=healthy。原文件 Git blob 已核验一致。[C06；evidence/baseline-byte-check.json；evidence/baseline-mcp.tap]

这是“适配器收到分页结果时”的反例，不是对真实 SDK 内部行为的全称证明。P01 必须再用安装的 SDK，分别跑基线声明支持的 legacy/modern 路径；若某一路原生已经归并分页，就适配其真实语义，不能再重复翻页。目录可以有硬上限，但超限必须明确 incomplete/error，不能把截短结果标成完整可用。[W03]

## HPRO-0009 · 工具失败与外部效果：已复现的语义缺口

目前 MCP `result.isError` 走 reported 分支，不触发 onUnknown；只有非 reported 异常触发 Host 的未知效果栅栏。隔离反例先递增一个本地“已发生效果”计数，再返回 isError，得到 effectCount=1、unknownCount=0；这说明仅有 isError 不足以判定可安全重试。[C06；evidence/baseline-mcp.tap]

没有真的发送消息或操作远端。建议第一片保守修复：已 dispatch 的未知效应远端调用返回 isError，也沿既有 unknown/fence 路线结算；只对 Host 实际强制只读或存在可信效果证据的调用放宽，不能信任远端 readOnlyHint。保留业务错误可解释性，同时禁止模型静默重试有后果的操作。此次不新建 BG-03 大账本。

## HPRO-0020 · 参考代码与可复现范围

运行 `node --experimental-vm-modules --test tests/baseline-mcp.test.mjs` 得 4/4；运行 `node --test tests/reference-catalog.test.mjs` 得 10/10。前者执行字节一致的 manager、仅替换 SDK 依赖；后者执行本包新写的 `collectCatalog`，覆盖全页、重复游标、跨页重复身份、总数量/字节/页数、取消前后和坏游标。

参考函数只限制**已经解析的**目录，不能替代传输层在分配大响应前的限制，也未对 SDK 特有分页行为背书。它不是对产品的 patch，更不能因本地 10/10 就跳过真实 adapter 集成。测试环境 Node v22.16.0 不是项目要求的 >=22.19.0；只运行了这些无需产品依赖的有界测试。


---

<!-- Original component: architecture-contracts.md -->

# 架构边界与最小合同

## HPRO-0002 · 总体裁决：两个责任层，一个应用组合点

保留 S08 的 D09（Pi 默认、第二 adapter 逐轴验证）、D11（最小必要指令）、D13（两个接入方向）与 S09 的 T19 优先级。普通 Chat 是通用 Harness 的第一消费者；Work、Attention 是应用组合后的额外消费者。**逻辑可拆，不等于现在拆进程、拆仓库、发布通用 SDK 或换语言。**

```text
Web GUI / HTTP façade                     ← 保持既有 /api/v5 与投影
           │
      Application composition              ← 创建/关闭 Core，组合 Attention/Work
       ┌───┴──────────────────┐
       │                      │
Generic Harness           Work application adapter
 Session / Run             来源 / Matter / Candidate / Decision
 control / permissions           │
 input assembly                  └── Semantic Work Core + 原 SQLite
 tool execution
       │
 Pi execution/provider adapter              ← 保留现有 Pi native journal/loop
```

Harness 持有执行状态；Core 持有正式工作效力；UI 不新增权威；compiled context 只是带版本和来源的运行投影。Core 可以独立读，普通 Chat 可以不创建 Matter。外部 agent 读 CW 与 CW 控制外部 runtime 是两条不同入口，不合成一个“万能 agent broker”。[S04、S08–11]

## HPRO-0003 · 实际 owner 与反向依赖

| 内容 | 当前 owner/实际路径 | 应保留或移动的边界 |
|---|---|---|
| 启动和关闭 | `server/runtime.mjs` 无条件构造 WorkCoreOwner，再交 registry/service | 保留原 `createRuntime` 作完整应用兼容入口；新增 `createHarnessRuntime`，Core 实例由应用组合层显式传入 |
| Host service | `service.mjs` 同时导入 Pi SessionManager、Governance/Attention adapter、Core projection | Pi 会话操作移入执行 adapter；Work/Attention query、prompt 与 tools 组装移入应用 adapter；不再让普通 Host 源码解释 Matter |
| Runtime control | `control-plane.mjs` 持有配置，含 Attention scope 的硬编码 | 配置 owner 不变；把 role/scope 允许列表作为应用提供的描述，权限求交仍由 Host 执行 |
| 正式 Core | `core/owner.mjs`、`client.mjs`、原 Python/SQLite | 保留来源/版本/候选/决定语义和原库；owner 文件中混合的 projection/context 可在 Work 层内部拆文件，不搬入 Harness |
| RuntimeStore / native journal | Host 存 commands/Run/events；Pi 存 native session | 不是跨库事务，不再复制整份对话当第二 canonical transcript |
| Attention 历史读取 | `runtime/attention-tools.mjs` 读取保留会话和治理 projection | 它是应用工具贡献，不是通用 memory_provider 的实现 |
| 现有 `app/harness/` | 已用于 Thread/coordination/child 边界 | 不能因本次“通用 Harness”命名而覆盖或重定义；这轮不动其语义 |

“无条件构造 CoreClient”**不等于启动时一定 spawn Python Core worker**；已读 constructor 是惰性的。真正需要修的是依赖方向和可独立构造/失败隔离，而不是先宣称发现了普通 Chat 必然启动数据库的性能 bug。[C01–03、C07–09]

也不能因此承诺纯 Harness 已不需要 Python：当前数据目录锁本来依赖 Python/POSIX，这和 Semantic Core worker 是两项依赖。[S14]

候选新路径为 `app/server/harness-runtime.mjs`、`app/server/work-application.mjs`、`app/runtime/pi-runtime-adapter.mjs`。它们是本稿提议的新文件，不是基线已有文件。优先保留原 HTTP façade；不做大规模目录重排。实际提取 private methods 的清单由 P00 在同一 SHA 上机械列出，不能只凭本文两段 service 源码进行全文件盲改。

## HPRO-0004 · 执行 adapter 与 provider driver 不要混同

最小 RuntimeAdapter 负责：native conversation 的创建/打开、准备一次 execution handle、native ref、事件投影、interrupt、最终 settlement。最小 ProviderDriver 负责：连接对应的模型目录、credential resolution/probe、模型/effort 的实际能力。两者可以由同一个 Pi 模块提供，但不是同一身份，也不能把“换 endpoint”画成“换 runtime”。

保留现有 AgentSession/SessionManager，不换更高层运行框架。工具 loop/retry/compaction 继续交 Pi；Host 保持 cancel 粘性、事件持久化 drain、budget、permission 与 unknown 的责任。`assistant.delta` 当前实际上是累计文本投影，新的 adapter 必须声明 `replace` 或 `append`，不能按名字假定是增量拼接。[C02、C05]

capability 项分 `native / adapted / unsupported / untested`，并绑定 adapter 版本、实际 wire path、模型/连接、测试证据。上游支持 steer/fork，不代表当前 HTTP 已提供。第二 adapter 不能用空成功对象吞掉 unsupported。

## HPRO-0005 · Harness 命令、快照和结算合同

最小语义合同见 `contracts/ports.d.ts`。它是设计面，不替换既有 HTTP DTO 或宣称已发布 API。既有 `commandId`、Session、Run、Question、permission mode、连接配置队列保持原义。

| 接缝 | 必须表达 | 不允许的简化 |
|---|---|---|
| admission | 先查相同 commandId 的旧 receipt，再校验新命令的当前配置/权限；冻结实际 provider、tools、输入版本 | 重试旧命令时用新配置重跑；“收到请求”直接等于执行完成 |
| prepare | 建立取消/usage owner，准备 source/input snapshot 和 native ref；准备失败产生可查询的 terminal receipt | 在取消 owner 安装前先发模型请求 |
| events | 可回放的 Host 序列和 native ref；累计/增量模式明确；收尾等必要 projection writes | SSE断开当 Run 失败；UI输出完成当正式完成 |
| cancel/respond | 绑定原 runId/questionId/callId 和内容版本；取消确认与最终 settlement 分开 | 向当前恰好选中的 Chat 发送旧审批；用 abort 表示撤销已发生效果 |
| restart | 原 receipt 查询；中断未知不自动重放；配置 pending 继续封锁 | 以“续行”名义自动重发外部效果 |

错误层面保持既有 HTTP status/code。新增内部错误必须表达 phase 和安全恢复动作：refresh、query_receipt、explicit_new_command、none。缺失 capability 是明确 unsupported；Core 不可用时，已绑定 Work 的 Run 不能悄悄降级成普通 Chat；未绑定的普通 Chat 不应受 Core 数据不可用牵连。

Run completed 只表示约定执行和必要结算完成。工具 allow、自然语言“同意”、写出文件和 Core accept 是四种不同事实。

## HPRO-0006 · Work 接口与人类决定

应用 adapter 提供 `prepareContribution`：返回受限工具、版本绑定的 context、opaque work ref、执行关闭/结算回调。Harness 不解析 source_version/contract_version 等工作字段；Work adapter 在自己的入口验证这些字段。

普通工具侧只能读取可披露对象、读取指定版本、提出候选、报告执行状态。**正式 decide 走独立 human-action façade**，复用既有 request_id、candidate/base version、action/reason 与 Core CAS；不在模型工具集合暴露一个通用 approve 方法。

Core 和 RuntimeStore 之间不是原子事务。复用已有 extension finish/reconcile：只有双方要求的结算都可确认时才给对应成功；部分失败保留 unknown/recovery_required 与原对象定位。不可建立一个新的“统一超级 Store”把既有独立 owner 掩盖起来。[C02、C08–09、S10]

## HPRO-0010 · 先记录真实有效输入，再重排指令

沿 `control.bind`、`createSessionRun` 的 `beforeInitialInput`/实际 systemPrompt 接缝建立 RunInputSnapshot。包括：schema/compiler/adapter 版本，解析后的 system prompt、实际 tools schema/顺序、当次 Host contribution、input/source hash、来源 scope、被排除项/原因、native journal 的身份和位置引用、生成时间与证据级别。这个快照**不是每个 provider request 的完整 transcript 复制**；完整会话仍只有 native journal owner。

输出 current/next-run/historical 三个视图。历史缺字段即 partial/unknown，不拿当前配置回填历史。`admittedCharacters` 保留原来的 UTF-16 code-unit 口径；whole-context tokens 只有真实测量或明确估算标签时才展示。实际快照中未证明进入 provider 的部分标 prepared，不标 sent。[C03、C05、C13]

冻结 snapshot 写失败时不得开始模型/工具工作；原 command receipt 可查。内容落盘与 Run 元数据之间无跨文件原子性：先写完整不可变 blob，再发布引用；没有引用的暂存 blob 不是一次已执行或已接受事实。未开始的 prepared snapshot 不能冒充 provider 已消费。

## HPRO-0011 · 多级指令：排序、角色和权限是三件事

维持现有 control JSON 为编辑真源。建议形成四个用户可理解层次：Host/system 基础规则；workspace/project 稳定要求；session 要求；invocation/task 的本次要求。user preference 另作低权威文本来源，不能混成权限政策。已有 Attention role 文本由应用贡献，而不是写死在通用 service。

首选窄变更：把**经人明确保存的稳定 instruction 资源**放入带来源标识的稳定 instruction section；本次任务、Work 当前状态和 memory 证据保持独立 section/tail，不把全部 Matter 或 Paper 灌入 system。相同配置下字节稳定；只有真实有效配置改变才形成新 cache 边界。

此项是对目前“全部控制指令跟随 runtime.context”的有界重排建议，不是声称当前完全失效。P06 必须先用 P05 快照证明现状，再用 wire fixture/compaction 反例比较重排前后；如果既有放置已满足行为，就保留字节布局，仅补解释。不能用“system 优先级更高”替代实测，更不能无条件删除 native runtime 必要提示。[C02–05、S08 D11]

更窄层在**可覆盖的偏好/配置槽位**上可覆盖更宽层；权限始终取更严格限制。任意自然语言的语义冲突不能靠 scope 排序完全判定。显式 overrides/source 关系和已知结构化键可以计算，剩余冲突展示原文与顺序，不伪造自动一致性结论。compaction 前后需验证必要 Host invariant 仍能解释；不能把丢失视为完成。

## HPRO-0012 · 普通 memory 的最小形态

增加 `memory_text` 这一人维护的 content resource，复用 RuntimeControlPlane 的 revision、scope、exposure、profile、审计和原子发布方式；`memory_provider` 仍指外部/派生检索 adapter。第一片仅支持人编辑、查看、禁用/删除和下一 Run 有界注入，不自动从每轮对话提炼保存，也不自动提升为 Core 事实。

四类内容分开：人维护的偏好/背景文本；原会话的历史陈述；工作中的临时笔记/候选；Core 已正式接受的对象。临时唯一观察不能当可删 cache，但也不会因被叫作 memory 就取得正式效力。模型可提出待保存草稿，由人明确保存；不开放无限制跨项目 memory 写权。[C07、S08 D07、S10]

`memory_text` 初始只提供 user/local、workspace、session 已可表达的 scope；不新增组织身份/ACL。正文长度、总量、标识、UTF-8、source hash、编辑来源与移除操作必须有固定限制。Task-only 文字留在当次输入，不伪造永久 memory。

## HPRO-0013 · 关闭 memory ≠ 从历史上下文中消失

若 memory 曾进入 native journal，仅禁止下次自动注入不会抹掉旧 message 或 compaction summary。UI 不应只给一个看似“已经忘记”的开关。

最小发布合同分两步：①关闭下一次自动注入；②用户确认开启 clean model context。前者可立即保存（仍受 active Run 冻结规则），但必须提示原会话仍可能含旧内容；后者由 Host 创建新的 native context generation，保持同一个 CW Chat 的可读历史，不把旧 journal/旧摘要自动注入新的 generation。当前明确选定的材料与 Work context 可以重新编译，且重新验证权限。

开启第二步使用独立命令/receipt，失败不销毁旧 journal，也不伪称已清理。老 Run 仍指向老 generation；相同旧 commandId 仍返回旧 receipt。关闭与 reset 跨存储部分失败时状态保持“注入已关／上下文尚未隔离”，不猜原子成功。启用这一按钮前需 P08 完成，P07 单独合入时只能提供真实的 injection-off 语义。

这不保证 provider 删除已发送数据、删除用户导出副本或清除备份；那是另一个明确 retention/purge 合同，不属于本轮“memory 开关”。

## HPRO-0014 · 受限 web_fetch，不把浏览器自动化塞进基础节点

新增模型工具沿现有 `governTools` 与 Host 许可执行。第一版边界：明确 URL 的 HTTPS GET；无用户 cookies/认证/header 模板；无 javascript、浏览器、登录、批量爬取；默认不静默开放任意网络。沿已有 exposure/ask 机制，由人显式允许，并将规范化 URL/目标绑定进精确 call 授权。网络读取也会外发 URL；read-only 不是“没有外发”。

传输与格式转换分开。Node HTTPS/受控 resolver 是候选传输接缝，必须在连接时绑定经验证的地址，重验所有解析结果/IPv4-mapped IPv6 等边界；不能只对 URL 字符串做一次 localhost 黑名单。第一版拒绝重定向，禁止 userinfo、非批准协议/端口和内部/元数据地址；DNS rebinding、abort 后发布、解压膨胀、超时/大包是入场硬门。IP 特殊地址规则和传输实现必须有固定来源/测试，本文不提供未经验证的 SSRF 黑名单。

建议 Host 合同初值：URL ≤2048 字符、总期限15秒、传输及解码后的 body 各≤1MiB、正文投影≤32000 UTF-16 code units；超过正文投影长度返回有界分页引用，不把截断片段宣称全文。超限响应明确失败，不发布半份“完整 source”。这些是本稿设计上限，不是外部测得的最佳值。

支持 text/plain、markdown、JSON 和受限 HTML→text；不把远端 HTML 当本地可信页面渲染。可从 U03/U04 的 htmlparser2 8.0.2 候选切入，仅借解析器与转换分层；安装前固定 license/integrity、检查维护/安全记录并跑反例。尚未验证的 parser/网络依赖必须阻止其格式/传输宣称；不能以“用了 OpenCode 同款”放行。暂不引入 Effect/Bun/Turndown 整套依赖。

原始获准 bytes + SHA-256 + 请求 URL/响应身份/获取时点/转换器版本归 Run input/evidence 存储；source locator 不等于内容版本。其为外部证据，不自动创建正式 Matter Source；需要成为正式来源时沿既有 Core intake。provider-preview 与 runtime-sources/resolve 仍保留原本的窄语义，不增加隐藏网络副作用。

## HPRO-0015 · Skill intake：显式检查，而非全盘发现

保留现有前置 metadata/按需 load。第一版只在已授权的当前 workspace 根下，显式检查 SKILL.md 与固定深度的候选目录；realpath/符号链接/大小/数量/UTF-8/YAML 循环对象均有界。检查不激活，登记要 CAS，正文取当前被人确认的 hash；源文件后来改变只产生 stale/refetch 提示，不偷偷替换已绑定 Run 的内容。

requested tools/兼容声明只是 metadata，不授予 shell、外发、安装或 Core accept。任意 HOME、repo clone、package install、scripts/assets executor 后置。已保存 skill 正文进入历史 binding 后，删除当前源不能令历史记录被伪造；可访问性与 retention 规则另行说明。

## HPRO-0016 · Provider 已交付修复不得倒退

本次不替换 connection identity、每连接 credential slot、catalog extras、unknown reasoning/contextWindow、configuration pending、verify generation binding。新 input snapshot 只绑定当前已发布且 ready 的配置；旧 receipt 幂等返回不能触发新的 provider probe。`/models` 成功不是生成成功；verify 本身可能消耗 provider 资源，必须有用户明确动作。[S14、C02、C05]

## HPRO-0017 · GUI 合流原则

现有 Runtime Workbench 已区分 configured/connected/exposed/permitted，以及当前 Run 编辑只是 draft、不会自动生效。新增面继续使用该 controller 与同一 design grammar，不另建多个 settings authority，也不让 frontend 自算权限 winner。[C12–13]

先落后台 typed capability/source/snapshot，再由唯一 frontend writer 消费。在已有 Settings 组内增加适当编辑/inspector；在 Run detail 显示实际输入版本与 native generation；memory 的 injection-off 和 context-reset 分开显示。不能用新开关伪装 OAuth/stdio/web/browser 已实现。不得在这轮顺便重排 sidebar、换图标库、改全局 tokens 或替换 GUI 框架。

## HPRO-0018 · 状态迁移与回退

依赖方向提取、MCP 分页/保守效果栅栏不应要求数据库迁移。新增 RunInputSnapshot/native generation 元数据才触及 RuntimeStore；从固定基线12出发由唯一 store owner 分配下一版，不能在多个分支各自抢写“13”。普通 memory 的内容版本归 RuntimeControlPlane 自己的格式升级；不要把它混写成 Core schema 更新。

每项迁移先验证旧数据，保留准确原 bytes/hash，使用临时目录和排他锁，升级后旧 host 不得打开新目录。回退是使用对应版本的**完整停机备份**，不是只换旧代码继续用升级后的目录。原绝对 workspace/native journal 坐标不得假装可自由搬迁；当前恢复测试先采用同一实际路径的隔离测试目录。备份包括 runtime-state、control、credentials、workspaces、Pi journals、artifact history、新 input snapshots 及已配置的 Core 库。[S14]

文件权限/凭据不应进入公开附件；备份测试使用合成 key，不读取个人 dataDir。物理断电持久性与进程中断恢复分开标注。

## HPRO-0019 · 关闭链的加固候选，而非已确认数据损坏

`runtime.close` 内的 Core close 与 store close 是串行 await；前者拒绝可能跳过后者。但本次已读 CoreClient.close 在正常路径先封 admission、等待 worker exit，未证实该拒绝在现实运行中可达。因此这里登记为**生命周期反例/审查项**，不是宣告一个已复现的泄锁事故。

修复不能机械改成“无论活跃 writer 是否退场都释放 data lock”。先证明所有可能写者 quiescent，再释放锁；无法确认时保持 admission sealed 并明确 shutdown incomplete。P12 包含 Core 启动中取消、关闭失败、父/子 owner 退场顺序和重启锁反例。本文没有附一个不顾 writer 生命周期的通用 cleanup patch。[C01、C09]


---

<!-- Original component: HPR-02-work-orders.md -->

# HPR-02 · 候选小 PR 工单

## HPRO-0021 · 单一路线与施工纪律

这些编号是本次输出切片，**不是另一套产品 roadmap**。本地接受后映射到既有 owner/任务编号；原 roadmap 的优先级由集成者更新。本稿未创建 GitHub PR、分支或后台任务。

顺序：P00 → P01 → P02 → P03 → P04 → P05 → P06。随后 P07 → P08、P09、P10 可以在清楚文件所有权时准备设计，但它们共享 control/service，**本轮默认串行实现/合流**，不是暗示可以并行改同一文件。全部后台合同冻结后 P11 前端消费，P12 独立验收。现有前端无关工作不必暂停；不要用全局重构阻塞它。

每个 PR 只允许自身列出的产品路径，另可增加该 PR 的 `evidence/hpr02-pNN/` 原始证据和对应交付文档。当前已有文件名由基线或源码证明；带 `[new]` 的路径是待建文件，不能当作已存在的可运行测试。

**通用接受命令（P01–P12）：**在仓库根目录先 `test -f app/tests/hpr_pNN.test.mjs`，再 `(cd app && node --test tests/hpr_pNN.test.mjs)`。把 NN 换成本 PR 编号。每份测试文件必须实际包含下列负例，不能只建一个永远通过的空文件。全量门仍是项目已有 `npm test` / `npm run smoke`。Node 必须满足仓库 engines；本包的参考函数测试不代替这些产品测试。

所有新增 HTTP route/DTO 都显式写成 PROPOSED；现有 `/api/v5`、token/origin 和错误/幂等行为不变。遇到新增接口需要超过允许路径的更新，先由唯一 owner 拆小提交、记录原因，不能在局部施工时自行扩大范围。


---

## HPR02-P00 · 冻结工件、owner 与回归基线

来源输出：HPRO-0001, HPRO-0007, HPRO-0016, HPRO-0018, HPRO-0021, HPRO-0024。Owner：本地集成唯一 owner（Astra）。依赖：无；先对输入固定基线。

**目标。** 原文/附件完整回收；核验送审文档与产品 SHA，机械列出受影响方法、路由、schema 与现有回归命令，逐项登记而不改产品。

**非目标。** 不根据摘要重写已接受的 D09/D11 等裁决，不给本包盖产品验收章；不覆盖原始 inputs。

**只允许路径。** `engineering/research/harness-pro-2026-09-10/outputs/<intake-id>/** [new]`；`engineering/execution/hpr02-p00-baseline.md [new]`；`evidence/hpr02-p00/** [new]`。

**实际依据。** S01–S14；C01–C14；source-manifest.json 的已读和未读范围。

**接口／DTO。** IntakeRecord{inputCommit,codeCommit,artifactPath,sha256,bytes,originalMessageRef?,sourceLabelVerified,dispositions[]}；unknown 字段可空但必须解释。

**请求例。** `LOCAL intake({codeCommit:"a2b084d…", artifact:"courtwork-hpr-review.zip", expectedSha256:"<实际下载哈希>"})`

**错误与恢复例。** {code:"intake_hash_mismatch",action:"stop",installed:false}；找不到原 turn/attachment 时登记 inaccessible，不杜撰已消费。

**不变量。** 完整源文与附件不可由摘要替代；每个 HPRO 有唯一主位置和一个明确处置；每个实施项能回指原 HPRO。

**权限、缺席、取消、恢复负例。** 破损附件、同名不同字节、opaque citation、缺失原回复、旧本地 main、schema 同号冲突、仅 grep 到符号却声称完整读码。

**可执行接受。** 在下载包目录执行 python3 verify-package.py；在清洁 CODE checkout 用项目规定的 Node 版本执行 npm ci --ignore-scripts、npm test、npm run smoke（均在 app/）。记录既有失败与环境，不能把基线失败算本 PR 修复。 

**迁移与回退。** 无状态迁移。只保存 append-only intake；撤销候选映射不删除原附件。

**停线条件。** 任一输入身份不一致；本地代码已前进且未完成针对本包接缝的 diff；无法分清作者测试与独立接受。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P01 · MCP catalog 完整读取与失效边界

来源输出：HPRO-0008, HPRO-0020。Owner：本地后端唯一 writer。依赖：HPR02-P00。

**目标。** 在所用 SDK 的真实分页语义下，完整或明确失败地建立 catalog；不能发布截短的 healthy 结果。

**非目标。** 不加 OAuth、stdio、自动连接或新权限；不复制一套 MCP 协议。

**只允许路径。** `app/runtime/mcp-manager.mjs`；`app/runtime/control-plane.mjs`；`app/runtime/control-contract.d.ts`；`docs/runtime-control/api.md`；`app/tests/hpr_p01.test.mjs [new]`。

**实际依据。** C06 固定源码及 4 项隔离诊断；W03 legacy pagination；实际 2.0.0 SDK 的读取点须在本 PR 追加 pin/source receipt。

**接口／DTO。** 保留原 snapshot；可加 catalogCoverage{tools,resources,prompts:{complete,pages,count}}，是实时投影而非配置 revision。只有各声明能力完整后才 callable。

**请求例。** `POST /api/v5/mcp/local%3Ademo/lifecycle  {"revision":7,"action":"connect"}`

**错误与恢复例。** 沿现有 lifecycle error 返回，并给 catalog_incomplete/catalog_limit/catalog_cursor_cycle 的机器原因；工具不暴露，不把第一页称成功。

**不变量。** 单独端口/身份/配置 hash 绑定不变；同一连接的一组目录要么完整发布，要么 unavailable；重复身份、循环 cursor 和跨页超限拒绝。

**权限、缺席、取消、恢复负例。** 两页/空页/第二页失败、循环/重复 cursor、跨页重名、总量/总字节超限、取消前后、断连/配置变化、旧 late response；分别验证 legacy 和声明支持的 modern 路径。

**可执行接受。** 创建并执行 app/tests/hpr_p01.test.mjs，必须包含真实安装 SDK + loopback 两页 server fixture；参考函数测试可复用但不得代替这一项。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p01.test.mjs。

**迁移与回退。** 无需 RuntimeStore/Core 迁移；失败连接重新显式 connect，不能用旧缓存冒充新目录。回退不改变配置和正式状态。

**停线条件。** 无法确认 SDK 是自动归并还是逐页返回；不能绑定测试到锁定 SDK/protocol；只限制解码后对象却声称能防止传输分配过大。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P02 · MCP isError 的保守效果结算

来源输出：HPRO-0005, HPRO-0009, HPRO-0020。Owner：本地后端唯一 writer。依赖：HPR02-P01。

**目标。** 已 dispatch 的远端调用不能仅因 isError 被当作效果可忽略。复用既有 externalUnknown/notice/Run unknown，不新增大账本。

**非目标。** 不自动重试、代发消息、扩审批权限；不在本片宣布 BG-03 全部完成。

**只允许路径。** `app/runtime/mcp-manager.mjs`；`app/server/service.mjs`；`docs/runtime-control/api.md`；`app/tests/hpr_p02.test.mjs [new]`。

**实际依据。** C06 reported 分支；C02 externalUnknown 与 finalStatus 路径；evidence/baseline-mcp.tap 第二/第三项。

**接口／DTO。** onUnknown detail 增加精确 callId、server/tool、failureKind、effectCertainty:"unknown"；不包含 key、原始敏感参数或未经审查的远端异常文本。

**请求例。** `模型 tools/call 经原 ask 得到授权，调用结果为 {"isError":true,"content":[{"type":"text","text":"业务失败"}]}。`

**错误与恢复例。** 工具仍反馈受控业务错误；Host 标记 mcp_effect_unknown，禁止自动重发；取消确认不清除此事实。

**不变量。** dispatch 与工具完成/外部效果分别记录；只有可信、Host 强制的只读/效果证据可减少 unknown，不信任远端 hint。

**权限、缺席、取消、恢复负例。** 模拟先发生效果再 isError；传输丢失；尚未 dispatch 的本地参数错误；ask 拒绝/取消；onUnknown 持久化失败；模型想接着调用第二次；重启后仍不自动重发。

**可执行接受。** 创建并执行 app/tests/hpr_p02.test.mjs；在新的产品测试中导入当前产品源码，使用同一反例并断言 unknown/fence 必须触发；不得修改本包的固定基线原始探针，再验证 whole Run settlement 和重启 receipt。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p02.test.mjs。

**迁移与回退。** 沿已有 notice/status 结算，不迁 Core；旧 records 无效应证据时维持 unknown，不追写“确认无效果”。回退须保留新产生的 unknown。

**停线条件。** patch 放行“远端说 read-only”的工具；丢失原始 callId；UI 将 failed 和 safe-to-retry 合并；需要真实有副作用的服务才能测试。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P03 · Pi execution seam 提取，不换执行引擎

来源输出：HPRO-0002, HPRO-0004, HPRO-0005, HPRO-0016。Owner：本地后端唯一 writer。依赖：HPR02-P02。

**目标。** 隔离 Host 对 SessionManager/native handle 的直接使用，并将实际 capability/event 模式说清楚；现有 Pi SDK、provider registrations 和模型路由原样保留。

**非目标。** 不加第二 runtime、不重新实现 loop，不把 TypeBox/frontmatter 等成熟工具依赖的保留误判成必须全删除 Pi 包。

**只允许路径。** `app/runtime/pi-runtime-adapter.mjs [new]`；`app/runtime/pi-session-runtime.mjs`；`app/server/service.mjs`；`app/runtime/runtime-port.d.ts [new]`；`app/tests/hpr_p03.test.mjs [new]`。

**实际依据。** C02 direct SessionManager/import；C05 createSessionRun/native state/events；U01 显式 loader。

**接口／DTO。** ExecutionAdapter.openConversation/prepareRun → ExecutionHandle{nativeRef,run,interrupt,settled,capabilities}；ProviderDriver 独立 facet，Run 中现有 provider 身份不变。

**请求例。** `INTERNAL adapter.prepareRun({sessionRef,providerRef,inputSnapshotRef,tools,signal,onEvent}) → prepared handle；真正发请求仍在 install ownership 后 run()。`

**错误与恢复例。** {code:"unsupported_capability",capability:"steer",phase:"admission"}；native open 失败不能偷偷新开丢历史会话。

**不变量。** 一个 native journal owner；相同 user task/配置下提示 bytes、tools 顺序和 Run outcome 不变；primary event drain、sticky abort、usage 缺失口径保持。

**权限、缺席、取消、恢复负例。** 准备中取消；compaction 中取消；event persistence 失败；native history 不可读；累计文本被误拼接；连接 pending；不支持的 steer/fork；原 command 重试。

**可执行接受。** 创建并执行 app/tests/hpr_p03.test.mjs，包含旧/new facade 的 fixture request bytes 与事件/结算 parity；再运行 npm test 和 smoke。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p03.test.mjs。

**迁移与回退。** 纯提取不改 store schema、native journal 路径或 adapterId 的历史解释；可退回旧 façade。

**停线条件。** 必须升级 Pi 才能完成提取；改变 provider credential lane；出现第二套 transcript；需要先迁移数据；无法解释 wire diff。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P04 · Work application façade 与 Core-free Harness 构造

来源输出：HPRO-0002, HPRO-0003, HPRO-0005, HPRO-0006, HPRO-0017, HPRO-0019。Owner：本地后端唯一 writer；前端仍由原 writer 独立消费。依赖：HPR02-P03。

**目标。** 保留原完整应用入口/HTTP façade，增加不构造 Core 的 Harness；将 Work/Attention operations、角色文本、工具贡献放在应用组合侧。

**非目标。** 不迁移 SQLite，不改 Matter/schema/正式接受规则，不让 frontend 直接接 Core；不重命名已有 app/harness coordination。

**只允许路径。** `app/server/runtime.mjs`；`app/server/harness-runtime.mjs [new]`；`app/server/work-application.mjs [new]`；`app/server/service.mjs`；`app/runtime/extension-registry.mjs`；`app/runtime/control-plane.mjs`；`app/runtime/attention-tools.mjs`；`app/tests/hpr_p04.test.mjs [new]`。

**实际依据。** C01–03/C07–09 的实际依赖；S04、S10。尚未全文审计的 service 方法必须先列出并由本地 writer完整读取。

**接口／DTO。** ApplicationContribution{opaqueRef,context,tools,closeAdmission,finish,reconcile}；Core 缺席时贡献为空；正式 human decision 不属于 model tool port。

**请求例。** `INTERNAL createHarnessRuntime({dataDir,executionAdapter,application:null})；旧 createRuntime({...}) 仍提供原 service façade；已绑定 workRef 的 admission 需要可用 Work adapter。`

**错误与恢复例。** 未绑定 Chat 可用；绑定 Work 但 Core 不可用 → capability_unavailable/work_unavailable，返回恢复说明，不降格生成假 Work 成果。

**不变量。** 纯 Harness 构造和普通 Chat 执行没有 Core 构造/读库副作用；Work 仍单 owner；旧 HTTP shape 不变；permission、事件、human decision 所有权不变。

**权限、缺席、取消、恢复负例。** Core 构造/启动/读取失败但纯 Chat 正常；Work Run 硬失败；Core 缺席禁止接受动作；historical accepted data 独立读；晚到回调、取消与 Work finish失败；静态 import guard。

**可执行接受。** 创建并执行 app/tests/hpr_p04.test.mjs：禁止 Core import/constructor 的纯入口测试、旧 façade 与新组合 parity、Core-unavailable 隔离。先单提交提取 Work façade，再单提交 factory 切换；两提交各有绿测。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p04.test.mjs。

**迁移与回退。** 没有数据迁移。保留旧 façade 与目录；不得把运行模式变化当 archive/reopen。若实际文件清单明显大于允许范围，拆 P04a/P04b 并由唯一 owner 明确各自路径，不扩大为全仓重构。

**停线条件。** 需要改正式 Core schema 才能证明逻辑解耦；application hooks 获得裸 store 全量写权；纯入口仍 transitively 构造 Core；关闭失败时无条件释放仍有活跃 writer 的锁。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P05 · 实际 Run input 快照与历史解释

来源输出：HPRO-0005, HPRO-0010, HPRO-0016, HPRO-0018。Owner：RuntimeStore 的唯一后端 owner。依赖：HPR02-P04。

**目标。** 记录实际 system/tools/Host contribution 与 native ref，不再拿一段 compiler 字符数当全部输入。

**非目标。** 不保存第二份完整 transcript，不采集私有 chain-of-thought，不记录 credentials/authorization headers，不在 UI 展示未经授权的跨项目原文。

**只允许路径。** `app/runtime/run-inputs.mjs [new]`；`app/runtime/pi-session-runtime.mjs`；`app/server/service.mjs`；`app/server/store.mjs`；`app/runtime/control-contract.d.ts`；`docs/runtime-control/api.md`；`app/tests/hpr_p05.test.mjs [new]`。

**实际依据。** C03 bind/compile；C05 beforeInitialInput/session.systemPrompt；C13 historical runtime-context。

**接口／DTO。** RunInputSnapshot v1，细节见 contracts/ports.d.ts；prepared、submitted evidence 分开，historical 缺字段明确 partial。

**请求例。** `GET /api/v5/runtime-context?sessionId=SESSION&runId=RUN 增加 inputSnapshot 投影；请求仍用 x-work-token 和既有 session ownership。`

**错误与恢复例。** input_snapshot_write_failed → 不启动请求；context_snapshot_unavailable → 历史返回 partial/明确原因，不能按当前配置重建成“历史原文”。

**不变量。** 先 immutable blob 再发布引用；command receipt 幂等；native journal 唯一；快照的权限与 Run scope 一致；不可变对象与 current config 不混写。

**权限、缺席、取消、恢复负例。** blob写完 metadata失败、metadata完成前 crash、journal缺席、历史字段缺失、wrong session、key-shaped输入脱敏边界、取消先于提交、无 submitted证据、额外模型输入。

**可执行接受。** 创建并执行 app/tests/hpr_p05.test.mjs：实际 fake provider wire 对比、失败窗口、历史读取/隔离；要求准确区分 prepared/sent，不仅断言快照文件存在。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p05.test.mjs。

**迁移与回退。** 只有必要元数据触及 RuntimeStore；P00登记下一 schema，旧数据保留部分快照，绝不伪造。退回必须恢复完整对应版本备份。

**停线条件。** 每个 provider request 都复制整段历史当第二真源；快照错误还继续发请求；schema版本与其他在建PR冲突；含个人 key 的 evidence 被提交仓库。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P06 · 指令层次、冲突解释与 compaction 回归

来源输出：HPRO-0010, HPRO-0011, HPRO-0017。Owner：本地后端唯一 writer。依赖：HPR02-P05。

**目标。** 在现有 control 真源上形成明确 system/project/session/task 生效规则，并用快照证明作用，不按名词重造 prompt平台。

**非目标。** 不把来源/skill/网页当系统指令，不塞 Paper 全文，不承诺自动理解所有自然语言冲突；权限逻辑不改成 last-wins。

**只允许路径。** `app/runtime/control-plane.mjs`；`app/runtime/control-contract.d.ts`；`app/runtime/pi-session-runtime.mjs`；`app/server/service.mjs`；`app/server/work-application.mjs [new in P04]`；`docs/runtime-control/api.md`；`app/tests/hpr_p06.test.mjs [new]`。

**实际依据。** C02 hardcoded prompt/currentContext；C03 scope排序；C05 native输入；S08 D11。

**接口／DTO。** InstructionContribution{sourceRef,scope,placement,order,overrides?,authorityClass}；invocation 不持久伪装 workspace；已知结构化覆盖与自由文本解释分开。

**请求例。** `PUT /api/v5/runtime-control?sessionId=S  {"revision":7,"operation":"put","resource":{"id":"local:style","kind":"instruction","title":"写作","scope":{"type":"workspace","id":"P"},"content":"用中文并标明来源。"}}`

**错误与恢复例。** 原 409 runtime_conflict / active_run 保持；task层未知字段未获支持时400，不静默忽略。冲突文本未能机器裁定时返回解释状态而非“全部一致”。

**不变量。** 稳定配置字节稳定；Host permission ceiling 不被任何文字改写；active Run 不热改；历史快照不重算；注意全局 Attention agent scope 不应泄到普通workspace。

**权限、缺席、取消、恢复负例。** 相反 user/workspace/session要求；同级两个id；active Run修改；旧summary残留；compaction丢失动态context；外部skill尝试提升权限；相同配置重复Run前缀漂移。

**可执行接受。** 创建并执行 app/tests/hpr_p06.test.mjs：完整有效输入断言、前缀稳定、fresh/continued/compacted 3条路径与权限反例。若保持旧放置即可满足，则只补证据，不强迁 system section。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p06.test.mjs。

**迁移与回退。** 优先 additive projection，不移动旧 instructions。确需编译策略变化时增加 compilerVersion 和新Run绑定，不 retroactively改历史。

**停线条件。** 把字符数当token；只有模型答“我收到规则”而没有wire证据；对没有裁定的自由文本矛盾自动判冲突已解决；native必要prompt被删除。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P07 · 人维护的 scoped memory_text CRUD

来源输出：HPRO-0012, HPRO-0013, HPRO-0017, HPRO-0018。Owner：RuntimeControlPlane 唯一后端 owner。依赖：HPR02-P06。

**目标。** 实现普通文本 memory 的查看、编辑、关闭/删除和有界来源注入；复用已有scope/CAS/exposure，不另起memory数据库。

**非目标。** 不自动蒸馏整段历史，不允许模型直接修改永久偏好，不把 retained conversation 改称已验证事实，不注册尚不存在的外部memory provider。

**只允许路径。** `app/runtime/control-plane.mjs`；`app/runtime/control-contract.d.ts`；`docs/runtime-control/api.md`；`app/server/service.mjs`；`app/tests/hpr_p07.test.mjs [new]`。

**实际依据。** C03未实现的memory类型；C07历史读取；C12 planned row；S08/S10的memory分层。

**接口／DTO。** 新增 content kind memory_text；仅人维护。Control文件版本按owner显式升级（现有v1→候选v2），scope仍user/workspace/session，注入来源带hash/revision且为低权威背景。

**请求例。** `PUT /api/v5/runtime-control  {"revision":8,"operation":"put","resource":{"id":"local:writing-preference","kind":"memory_text","title":"写作偏好","scope":{"type":"user","id":"local"},"content":"优先使用自然连贯的中文。"}}`

**错误与恢复例。** memory_text_invalid/too_large、runtime_conflict、active_run；旧格式不兼容必须明确拒绝，不把未知类型跳过后称完整加载。

**不变量。** 正文可见可改可关闭；scope不会凭记忆跨越；关闭仅保证future injection off，须显式告知旧journal仍可能含内容；不自动建立Matter。

**权限、缺席、取消、恢复负例。** 过长/坏UTF8/空id/重复id/越scope/并发CAS、profile不包含memory、runtime_load意外加载关闭资源、控制面重启、oldhost打开v2、导出敏感正文误入公共日志。

**可执行接受。** 创建并执行 app/tests/hpr_p07.test.mjs：CRUD/重启/CAS/注入精确bytes/off后新snapshot无条目；不能仅测JSON保存。P08前不宣传clean-context遗忘。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p07.test.mjs。

**迁移与回退。** Control单文件升级；旧记录原样保留。第一次写新格式前有备份，旧host不得打开；Core数据库不变。

**停线条件。** 需要Core才可保存普通偏好；模型输出自动persist；off按钮宣称provider已忘记；摘要取代用户原文。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P08 · 显式 clean model context 与 native generation

来源输出：HPRO-0005, HPRO-0013, HPRO-0018。Owner：RuntimeStore 的唯一后端 owner。依赖：HPR02-P07。

**目标。** 给用户一个可验证的上下文隔离动作，避免关掉 memory 后旧journal/summary继续自动带入。Chat历史保留只读，模型使用新native generation。

**非目标。** 不删除provider数据/备份，不清除开放义务或unknown，不改CW Thread语义，不把跨Session恢复伪装BG-02旧失败链。

**只允许路径。** `app/server/service.mjs`；`app/server/store.mjs`；`app/server/index.mjs`；`app/runtime/pi-runtime-adapter.mjs [new in P03]`；`app/runtime/control-contract.d.ts`；`app/tests/hpr_p08.test.mjs [new]`。

**实际依据。** C05 persistent SessionManager/native context；C13历史binding；S10/S11continuity边界。

**接口／DTO。** ContextResetCommand{commandId,sessionId,expectedContextGeneration,acknowledgeContextReset:true} → receipt{newGeneration,nativeRef,historyCarried:false}。新HTTP route为本稿候选，不是现有API。

**请求例。** `PROPOSED POST /api/v5/sessions/S/context-reset  {"commandId":"reset-1","expectedContextGeneration":2,"acknowledgeContextReset":true}`

**错误与恢复例。** 409 active_run/context_generation_conflict/effect_reconciliation_required；准备新journal失败返回原receipt，原history不删除。

**不变量。** 相同commandId返回同receipt；新generation不自动继承旧messages/summary；旧Run仍定位旧journal；当前获授权Work引用可重编但不能漏开放义务。

**权限、缺席、取消、恢复负例。** reset重试、reset后cancel、两个并发reset、旧审批迟到、旧journal缺席、memory off成功而reset失败、unknown effect未清算、跨项目history混入、回滚到旧代码后读新schema。

**可执行接受。** 创建并执行 app/tests/hpr_p08.test.mjs；在旧journal和compaction summary中种入合成sentinel，reset后的实际fake-provider请求不得含该sentinel；旧history仍可按授权读取。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p08.test.mjs。

**迁移与回退。** 由同一owner分配Run/Session元数据版本；不搬旧journal、不覆盖原nativeRef。新generation orphan不代表命令成功，可安全登记待清理；回退靠完整停机备份。

**停线条件。** 仅添加一条“忽略旧memory”的prompt却宣称隔离；reset顺便重开Matter；未知效果被清除；无法证明新请求没有旧summary。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P09 · 受限 web_fetch 与版本化响应证据

来源输出：HPRO-0005, HPRO-0014, HPRO-0017, HPRO-0018。Owner：本地后端唯一 writer。依赖：HPR02-P05、HPR02-P06。

**目标。** 支持显式获准的HTTPS页面读取，且输出正文/来源/错误可解释；不复用inspect-only解析器偷偷发网。

**非目标。** 不加浏览器、JS、登录、cookies、POST/上传、任意headers或私网；不开放自动批量研究。

**只允许路径。** `app/runtime/web-fetch.mjs [new]`；`app/runtime/run-inputs.mjs [new in P05]`；`app/runtime/control-tools.mjs`；`app/runtime/control-plane.mjs`；`app/server/service.mjs`；`app/package.json`；`app/package-lock.json`；`app/tests/hpr_p09.test.mjs [new]`。

**实际依据。** C10/C13明确resolver无网络；C04当前URL资源还会落到*；U03/U04仅为工具/转换的局部donor。

**接口／DTO。** 新增网络工具 web_fetch{url}，配套只读 web_read{fetchRef,sha256,offset,limit}；web_fetch须Host mandatory ask并绑定规范化URL/参数，web_read仅可读当前session获准的既存来源、不再次发网。结果{fetchRef,sourceHash,observedAt,mediaType,text,nextOffset,coverage}。

**请求例。** `MODEL web_fetch({"url":"https://example.org/manual"}) → 原ask界面展示目的URL与外发语义；本次获准后GET并返回有界正文与source hash。`

**错误与恢复例。** network_denied、unsupported_url、redirect_rejected、response_too_large、unsupported_media、deadline_exceeded、cancelled；失败/截断不假称完整全文。

**不变量。** 默认不expose；expose也不绕过ask；目标与实际socket地址绑定；所有解析地址/跳转/解码上限受控；不执行远端HTML；原始bytes与转换投影分离；不自动进入Core。

**权限、缺席、取消、恢复负例。** DNS rebinding、IPv4映射IPv6、内网/metadata/loopback地址、非443端口、userinfo、重定向到私网、无限流/压缩炸弹、乱码、HTML脚本、网络批准后URL变更、cancel后响应、hash复用错页面。

**可执行接受。** 创建并执行 app/tests/hpr_p09.test.mjs；注入DNS/transport在隔离fixture测试禁网与边界，不访问真实内网或metadata服务；先固定新依赖integrity/license/source和安全测试，再验证实际Node transport。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p09.test.mjs。

**迁移与回退。** 复用P05的不可变input/evidence存储；新tool初始disabled。无Matter迁移。回退保留已有fetch refs可读，不凭原URL重新fetch补历史。

**停线条件。** 使用单次hostname黑名单或SDK默认redirect作为安全证明；未限制解码后body；用已解析的大buffer上限宣称流式内存安全；parser/地址分类实现未固定来源；测试需要个人认证。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P10 · 授权 workspace 下的 skill 检查与登记

来源输出：HPRO-0011, HPRO-0015, HPRO-0017。Owner：本地后端唯一 writer。依赖：HPR02-P06。

**目标。** 在已获准的当前workspace中显式发现/检查SKILL.md，确认bytes/hash后登记进原catalog。

**非目标。** 不扫描HOME，不native自动加载所有AGENTS，不clone/install，不执行scripts/assets，不让allowed-tools成为授权。

**只允许路径。** `app/runtime/skill-intake.mjs [new]`；`app/runtime/control-plane.mjs`；`app/runtime/control-contract.d.ts`；`app/server/service.mjs`；`app/server/index.mjs`；`docs/runtime-control/api.md`；`app/tests/hpr_p10.test.mjs [new]`。

**实际依据。** C03/C04已有parser/load；C05/U01关闭默认discovery；C10纯resolver语义不能悄悄改变。

**接口／DTO。** PROPOSED inspect-workspace{sessionId,rootRelativePath,maxDepth} → bounded candidates{path,sha256,metadata,diagnostics}；import-workspace带expectedSha256和control revision，重新检查相同字节后按原put发布。

**请求例。** `PROPOSED POST /api/v5/runtime-sources/inspect-workspace  {"sessionId":"S","rootRelativePath":"skills","maxDepth":2}；检查后用户再明确import。`

**错误与恢复例。** source_changed、path_outside_workspace、scan_limit、invalid_skill、runtime_conflict；失败不改catalog或permissions。

**不变量。** inspect≠install≠expose≠execute；登记的正文必须是人确认hash对应字节；既有Run仍按旧binding执行；metadata可信度不随本地路径自动升级。

**权限、缺席、取消、恢复负例。** symlink逃逸/循环、目录爆量、UTF8/YAML循环元数据、大小上限、扫描后换文件、同名skill来源冲突、activeRun改配置、恶意allowed-tools、inspect过程中取消。

**可执行接受。** 创建并执行 app/tests/hpr_p10.test.mjs，真实合成目录+symlink+并发替换；再测model只看catalog，调用runtime_load才得到准确正文。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p10.test.mjs。

**迁移与回退。** 优先原inline resource存储，无新canonical skill库。保留文件来源/hash字段；旧手动登记继续工作。移除当前skill不重写历史Run来源。

**停线条件。** 只能靠开启默认HOME discovery完成；inspect自动执行或安装；source hash只比mtime；registry增加第二份唯一本体。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P11 · 前端消费真实能力与有效输入，不新增权威

来源输出：HPRO-0010, HPRO-0011, HPRO-0012, HPRO-0013, HPRO-0014, HPRO-0015, HPRO-0017。Owner：既有前端唯一 writer；后端只维护冻结合同。依赖：HPR02-P06、HPR02-P08、HPR02-P09、HPR02-P10。

**目标。** 在现有Settings/Context界面消费scoped instruction/memory、skill/web能力与历史快照；不把后台半成品画成可用。

**非目标。** 不改全局token、sidebar层级或icon选型，不另造独立设置数据库、不跨owner改server/static allowlist。若必须新增静态模块，单列后台准入小提交，不扩frontend权限。

**只允许路径。** `app/web/runtime-view.mjs`；`app/tests/hpr_p11.test.mjs [new]`；`app/scripts/hpr-browser-gates.mjs [new]`；`engineering/design/hpr02-ui-consumption.md [new]`。

**实际依据。** C12现有controller/scope/activeRun文案；C13typedAPI；P05–P10接口冻结稿。

**接口／DTO。** 只读snapshot驱动。表单draft与保存revision分离；current/next/historical、prepared/sent、off/reset-pending/reset-completed明确不同。

**请求例。** `使用原GET/PUT runtime-control与runtime-context；context reset、skill inspect只在capability声明supported且后端已交付时出现动作。`

**错误与恢复例。** 409后刷新但保留draft，不自动重试；404/unsupported显示不可用，不画假开关；reset失败保留“注入已关、上下文未隔离”。

**不变量。** backend权威快照决定有效状态；旧Run来源不按当前配置重算；keyboard/focus可达；同一套control grammar；scope切换late reply不污染当前界面。

**权限、缺席、取消、恢复负例。** 连续切scope晚响应、activeRun保存、cancel等问人、source失效、missinghistorical字段、memory关闭再reset失败、未知工具、窄屏/200%缩放、键盘focus。

**可执行接受。** 创建并执行 app/tests/hpr_p11.test.mjs；创建 browser gate runner并执行 node app/scripts/hpr-browser-gates.mjs --case-set hpr-p11 --require-all。该脚本为待建验收物，须复用现有browser依赖并拒绝零用例/skip冒绿。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p11.test.mjs。

**迁移与回退。** 保留既有UI偏好键和当前组件体例；无domain迁移。老后端时退回原只读/planned形态，不把本地偏好当新能力。

**停线条件。** 后台尚未交付就使用hardcoded样例冒真实状态；必须大改全局设计才能加入两个局部；新静态路径未经后台owner准入；浏览器runner只截屏不检查状态/交互。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P12 · 自足节点、恢复/备份反例和独立接受

来源输出：HPRO-0001, HPRO-0005, HPRO-0006, HPRO-0016, HPRO-0018, HPRO-0019, HPRO-0021, HPRO-0022, HPRO-0023, HPRO-0024。Owner：独立验收者；实现作者只修其明确负责的失败。依赖：HPR02-P11。

**目标。** 以有限支持范围冻结一个可用节点；全量回归、取消/重启/拒权、备份恢复和同任务证据分开归档。

**非目标。** 不以合成测试宣称真模型质量、PMF或跨周收益；不因验收困难换runtime/Rust；不拿旧作者回执当本次独立签字。

**只允许路径。** `app/tests/hpr_p12.test.mjs [new]`；`app/scripts/hpr-browser-gates.mjs [new in P11]`；`evidence/hpr02-p12/** [new]`；`engineering/execution/hpr02-stable-node.md [new]`。

**实际依据。** S01/S11/S14；本包HPR-03；C01/C09关闭链和原锁依赖。

**接口／DTO。** GateReceipt{codeCommit,dependencyLock,platform,fixtureHashes,caseIds,rawResults,author,reviewer,realProviderRun,knownFailures,scope}。缺项必须not-run/blocked，不是pass。

**请求例。** `LOCAL stable-node verification on a clean checkout and isolated temporary dataDir；用户另行明确授权后的单次真实provider运行另附receipt。`

**错误与恢复例。** gate_incomplete/unsupported_environment/recovery_failed；任一权威、越权、未知效果重放失败都不能用平均分抵消。

**不变量。** 同command不重复执行、旧审批不漂移、cancel不伪回滚、Core缺席pureChat可用、正式成果跨runtime缺席仍在、恢复不清除开放义务。

**权限、缺席、取消、恢复负例。** 断电宣称与SIGKILL区别；kill每个命名写窗口、shutdown不确定时锁释放、Core startup中cancel、nativejournal缺失、partialprovider config、完整备份丢一类文件、实际路径不匹配。

**可执行接受。** 在合格Node环境 app/ 内 npm ci --ignore-scripts、npm test、npm run smoke；运行新增 hpr_p01…hpr_p12 文件且逐一存在；运行 node app/scripts/hpr-browser-gates.mjs --case-set hpr-stable --require-all；恢复测试使用同一可恢复路径的合成dataDir，不碰个人目录。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p12.test.mjs。

**迁移与回退。** 先停机完整备份并确认所有writers退出；恢复旧代码/完整对应数据。真实凭据只在用户设备授权流程，不进入仓库。按产品范围保留或收窄兼容声明。

**停线条件。** 没有独立验收身份；真实provider运行未经授权；任何硬门失败；试图以mock成功关闭G1–G5；需要搬迁绝对路径才可声称恢复成功。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

<!-- Original component: HPR-03-gates.md -->

# HPR-03 · 有限的自足节点与后续决策树

## HPRO-0022 · 稳定节点的完成定义

不是“复制成熟 Agent 全部能力”，而是**明确支持范围内，每个入口有真实执行、权限、持久结果、错误、取消与恢复**。按 S01/S11 保持模型与工具层、工作效力层、GUI 三者可区分。

建议冻结的范围：Pi 0.85.1 的当前两类 wire format/已支持连接；普通 Chat 与可选 Work；现有文件读写/grep/ask；手动或授权 workspace skill intake；已支持协议的 unauthenticated HTTP MCP；有界网页读取；多级指令/有效输入快照；可编辑 scoped memory 与明确的 context-reset；已有 usage/诊断。任一子项没完成就公开收窄，不让 planned 按钮冒 ready。

明确后置：任意 shell/OS sandbox、浏览器自动化、Google/其他 OAuth、MCP stdio、plugin marketplace、任意脚本安装、自动 scheduler、多 runtime 平台、第二 transcript/通用 memory database、Windows 支持、Rust 全面重写。这些不是本节点的隐含承诺。

| Gate | 必须证明 | 最小证据与失败判定 |
|---|---|---|
| G-H1 基础任务闭环 | 选模型→读取→用skill→ask→获准写→展示输出/usage/来源 | 清洁依赖、固定synthetic inputs、实际fake-provider wire+GUI交互。仅保存配置或截图不算闭环 |
| G-H2 权限与输入 | 指令来源/完整有效snapshot、越scope拒绝、批准绑定原call、无隐藏HOME/key读取 | wrong session/callId/hash、跨项目、source prompt injection、read_only与network外发区别、old审批晚到 |
| G-H3 MCP/网络 | 完整catalog、有界内容、正确效果unknown、拒私网/redirect、cancel后不publish | 真实安装SDK/Node传输的隔离fixtures；本包VM桩不足以关闭此门 |
| G-H4 取消/重启/命令幂等 | 用户cancel、预算、断线、进程kill后不误报成功/不重复外部动作 | 同commandId、pendingconfig、nativejournal缺席、每个命名写窗口、terminal receipt。断网≠操作没发生 |
| G-H5 memory/context | current/next/historical准确；关闭自动注入与clean-context分别兑现 | 在旧消息和summary中种sentinel；reset后实际请求不含旧项；旧Chat历史仍可有权阅读，开放义务不丢 |
| G-H6 Core 可选/正式工作 | pure Harness不构造Core；Core不可用时Chat可用而绑定Work明确失败 | 不偷启动旧producer；正式成果/来源/决定可独立读；candidate不被Run complete自动接受 |
| G-H7 备份恢复 | 停机全量备份可按支持坐标恢复；原版本代码/数据配对 | 缺credentials/control/journal/inputs/Core任一类即失败；合成key；不可将目录随意搬迁支持混入此门 |
| G-H8 独立复核/真实体验 | 作者与复核者分列；产品范围真实provider纵切另有授权receipt | 本次未跑真实provider，不关闭G1–G5。无法授权可标工程fixture节点，不能叫真实模型产品接受 |

以上 G-H 是本报告的验收分组，**不重命名或覆盖仓库既有 G1–G5**。每组映射到原 gate 和具体测试 ID，由本地集成者入账。必须保留 not-run、blocked、failed；不能把 unknown 通过平均分冲淡。

### 双轨验收

确定性轨：工具/来源版本/权限/恢复/GUI合同，以冻结 oracle 的合成材料验证。模型轨：同一任务在明确版本、配置、工具和预算下运行，记录质量、实际tokens/cache/计费、review与修正时间。没有实际cache统计就unknown；不以host首输出代称provider TTFT。

独立质量和安全门先于节省tokens。沿原 S11 的强基线，不以缺搜索、缺正常handoff的raw chat作为唯一对照。跨事件合成时间线不是跨周真实采用，参考函数10/10不是长期收益或PMF。

## HPRO-0023 · 自足节点之后的决策树

**换 provider 还是换 runtime？** 只需更多模型/认证时，先看 ProviderDriver/connection 能否满足，不动执行/工作状态。确实需要另一整套 native session/tool loop，才单开第二 adapter。

**第二 adapter 首选验证对象。** 沿既定决策采用 Codex App Server 的稳定可用子集，先FakeRuntime符合性再真实adapter。逐项验证start/stream/approval/interrupt/terminal/history/auth/usage；native thread不能直接复用为CW Thread，experimental dynamic tools未验证就unsupported。原生TUI/browser DOM不是控制面的替代协议。第二adapter失败只收窄兼容声明，不迁Matter来迁就vendor。[S08–11、U02、W01]

**SDK/RPC 与外部 agent。** 只有真实第二进程/语言消费者需要才开放RPC；外部agent消费CW从已认证、有限额/分页/错误不泄漏的read-only API开始。连接协议没有赋予决定/外部效果权限。capture导入为Source/外部conversation ref，不自动变成CW native Session。

**Rust 条件。** 先量出可归因的CPU、内存、启动、存储/解析/IPC或分发负担，再决定哪个边界值得替换。先冻结state/port/恢复测试，单独替换一个worker或hot path，不把GUI、store、runtime、数据格式同时重写。数据目录在本地不等于全部依赖/模型外发已主权可控。

**自研 Spark/Attention。** 原有跨Matter/治理/有限attention的方向保留；复杂调度、蒸馏和衍生重建收益按原benchmark逐项证伪。没有净收益则删除或缩小派生层，不用更多架构补救未经验证的产品假说。

## HPRO-0024 · 开放项与明确停止边界

本轮可直接进入本地裁决的事项：MCP两项补强；Pi/Work最小接缝；input snapshot；已有control上的prompt/memory能力；有界web与skill；有限稳定门。没有必要等待“全面runtime平台”或“Rust重构”再开始。

仍须在对应工单中补证，而不是本轮默认放行的事项：完整service方法/路由清单；真实MCP SDK的两协议分页路径；网络传输/DNS/IP规则与新parser依赖的pin、license、安全/大小反例；next schema分配与本地main差异；浏览器真实DOM回归；真实provider授权与纵切；正式retention/purge策略。每项已分别进入P00/P01/P05/P08/P09/P11/P12的停线条件。

这些未决点不授权施工者扫描个人HOME、读取已有credentials、调用收费provider、推remote main、部署或发真实外部消息。测试全部采用临时、合成、明确隔离的数据，真实体验另走用户明确授权。


---

<!-- Original component: collection-handoff.md -->

# 原文回收与本地接续

本包的 FULL_REVIEW.md 是完整审查正文，四个主分件与13个工单是同内容的可定位分件；不要只消费 README 或聊天摘要。重复呈现的内容通过相同HPRO编号归一处置，不生成两项独立工程授权。

必须保存当前聊天可访问原回复、所有附件的原始字节、来源/时点/平台实际给出的模型标签，记录未提供的messageId/URL。平台标签未验证时使用unknown，不用助手自称或会话题目冒签。若后续能取得工具/网页原始返回，可另存原文；本包source-manifest是读取清单，不声称那些HTML/JSON原始返回都已经归档。

按SHA256SUMS核验附件内部文件；ZIP外层哈希由同批下载的校验文件或本地实际文件计算。不要把哈希当来源真实性签名。output-manifest不包含自己的哈希以避免循环，SHA256SUMS则覆盖manifest与全部其他deliverable；ZIP本身不递归写入内部manifest。

先完成P00的原文与身份核对，再将24条HPRO逐项填localDisposition、理由、owner、实施目标或延后条件。未采纳参考代码也须写reference-only/rejected的实际理由，不能因为没有施工就无处置。不同意某个方案可以modified/rejected，不必为了“全量消费”把所有建议实现。

每个工单回执应回指对应HPRO；每个已接受HPRO反向指出实际工单/commit/测试/独立接受。只读研究、工程符合性、模型质量、用户体验、正式工作接受不得共用一个pass标签。

当前只有本包附件可以在此环境核验。聊天原文的完整消息标识、原始模型标签、仓库内入账完成与最终本地裁决尚未取得；不得登记“回收闭环已经完成”。
