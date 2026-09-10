# 转 Astra 的后端契约请求（Fable，2026-09-09）

| 编号 | 请求 | 依据 |
|---|---|---|
| BE-1 | `GET /work-activity?days=N`：按日（UTC 日界）返回 recorded run 计数，供 Heatmap（G-1） | WK-37 / WK-46 |
| BE-2 | 多文档 tab 的 surface 状态（当前为单值 kind / runId / fileRef）（G-2） | WK-46 |
| BE-3 | "今日"口径的 work-summary 过滤字段与时区声明（G-3） | WK-46 |
| BE-4 | RC gap：B-1 `provenance[]` 含 MCP 服务器闸门；B-2 `catalog-only` characters 语义；B-4 `prompt_template` 不入 `context[]`；B-10 `mcp_effect_unknown` fixture 入口 | WK-50 |
| BE-5 | R2 Source Resolver：`runtime.resolve(source)` → ResolvedRuntimeArtifact（identity、provenance、portable、native[]、capabilities、requirements、trust、adapters） | WK-64 / 65 |
| BE-6 | R4 Runtime Proposal：`runtime.propose` → { source, target, operations[], effectiveDiff, permissions delta, contextImpact, trustImpact, persistence, rollback }；`runtime.apply(proposalId)` 走 CAS revision | WK-64 |
| BE-7 | R5 事务化 apply：fail-back 到 current 指针；proposal / apply / rollback 记录持久化并可 inspect；批准按包版本逐次留 DecisionReceipt，无"未来版本"批准 | WK-68 |
| BE-8 | R6 Expert 快照：composition generation（session-mount-once + version / hash + 重发现事件）；overlay（preference / requirement / policy 三类字段）；Save runtime… → Expert | WK-68 / 讨论转录 §8 |
| BE-9 | R3 兼容矩阵：adapter 按固定 commit 登记（DSH `c389f96`、Pi、OpenCode …），Native / Semantic / Lossy / Unsupported 四档，无静默降级 | WK-68 |
| BE-10 | `operation: 'profile'` 与 `'policy'` 的前端可用契约说明（RC B-8 / B-9） | WK-50 |
| BE-11 | Hooks / memory providers / registries / secrets / sandboxes 的资源 kind（现 Planned） | WK-63 |
| BE-12 | `provider-models` / `provider-config` 暴露模型的推理强度（effort / thinking）字段与可选值，供 composer 模型 chip 显示与设置 | WK-73 |
| BE-13 | MCP lifecycle：disconnect 后快照状态不回翻（RC verify `mcp-lifecycle` 反例；WK10a 复现 put 200 → connect 翻转、disconnect 不翻转），wire 侧待查 | WK-74 |

## WK10b 第二段回执（2026-09-08，Fable 转 Astra）

| 编号 | 请求 | 阻塞的前端 | 来源 |
|---|---|---|---|
| BE-14 | Decision 记录带 `decidedAt`（或独立 decision 事件），供回执行显示时间 | Chat Flow 决定回执行的时间列 | delivery-wk10b-2 §3.5 / 消融 R-8 |
| BE-15 | `GET /projects/:id/work` 返回 Matter `title` 与最近决定时间 | Continue existing 列表只显 id 短形 | delivery-wk10b-2 §3.6 / 消融 R-13 |
| BE-16 | `GET /runtime-info` 返回数据目录路径或稳定工作区标识（不含凭据） | Settings › General › Data 行；本设备偏好键 `cw:prefs:<id>` | delivery-wk12 §9 / §13 |

## 第四轮（2026-09-09，Fable 转 Astra）

| 编号 | 请求 | 阻塞的前端 | 来源 |
|---|---|---|---|
| BE-17 | 对未保存的连接表单执行 Fetch models（Base URL + credential → 模型列表），不持久化 | FE-02 Add provider 的 compatible / local 路径 | WK-91 |
| BE-18 | Test connection（不创建 Run 的最小握手），返回可显示的失败原因 | FE-02 | WK-91 |
| BE-19 | Memory adapter（Matter memory / Global memory，来源可披露、可关闭） | FE-03 Memory scope 与 Settings › Memory | WK-92 |
| BE-20 | Temporary chat（不读写持久 memory 的会话标记） | FE-03 | WK-92 |
| BE-21 | 连接注册表：多条连接各自持有 provider 身份、端点、凭据状态与 display name；provider ID 由后端生成；兼容端点作为独立连接而非"给目录身份换端点" | FE-02 Connections 多行、Display name 行、Compatible endpoint 独立身份（今日只画后端真有的一条） | WK-107 ①②③⑤ |
| BE-22 | MCP server 注册端点（新增一条 server 的 endpoint / transport），`/mcp/:id/lifecycle` 今日只对已声明的 server 动作 | FE-02 Tools › Adding an MCP server 的 Add / Configure 两步（今日只留位） | WK-107 |
| BE-23 | 无项目的 Chat：`POST /api/v5/sessions` 不带 `projectId`（不建 `workspaceDir`）的创建路径，或一个宿主默认容器 | FE-03 Chat 两态（今日只在既有能力上说清，不画无项目入口） | WK-109 ① |
| BE-25 | `GET /work-activity`（BE-1/3）落地时附带并发写入下的去重规则（按 run id 而非计数增量）与"覆盖是否完整"的回答；时区声明沿 BE-3 | CC-D0 Activity 模块（热力图）；落地前不安装 | WK-114 / EX-CC2 |
| BE-28 | `provider-config`（或 `runtime-info`）增加连接健康时间戳（`lastVerifiedAt`；须绑定被检查配置/凭据版本与 check kind，配置改变即失效，临时 BE-17/18 表单探测不得直接更新全局健康时间），使 Models 摘要能诚实呈现 stale | CC-D0 Models 入口行；Settings › Models 连接行 | WK-114 / EX-CC2 |
| BE-36 | provider 描述符上的显式认证方式：`authMethods`（`api_key` / `oauth` / `ambient_credentials`）与每种方式所需字段，供前端据数据编排凭据表单，而非按 provider id 分支；今日只有 `api_key` 有实现，其余先立契约位 | PV 前端连接面；Settings › Models 凭据行 | PV-4 |
| BE-37 | 目录扩集：新增一个真实 provider 身份（首轮候选 `google` + Gemini API key）所需的允许集、目录条目与传输格式；保存与执行仍受允许集与凭据绑定约束（BE-17/18 的握手成功不等于可保存执行） | PV 首轮 dogfood；模型面按 provider 分组 | PV-11 / PV-12 |
| BE-38 | 请求遥测的错误类别字段：失败与中断落一个闭集 error class（认证 / 配额 / 传输 / 目录 / 取消 / 其他），与 `phase` 分列；今日失败只落 `phase` 且清空 usage | PV-13 可追溯性；Run inspector 与 usage 面 | PV-18 |
| BE-39 | 连接冒烟端点：对一条**已保存**的连接发一次最小的真实生成（同一 provider / 凭据解析 / wire 格式 / 模型 id，最小输出上限、无工具、无 workspace、不进会话历史），返回可显示的回执（时间、连接、模型、凭据来源档、`observedModel`、模型回复的首行、失败类别），回执绑 `{providerConfig 版本, credentialGeneration}` 持久化、二者一变即失效；只在用户显式触发时执行 | PV 连接面的第三级阶梯；WO-PV-FE01 第 6 项 | PV-35 / PV-37 / PV-38 / PV-39 |
| BE-40@Provider | `GET /provider-connections` 的每条记录附 capability（至少 contextWindow 已知与否、压缩是否启用），使连接列表每一行都能说出与生效行同一句能力原话，而不必由前端硬编码后端句子 | PV 连接列表非生效行 | PV-56 |
| BE-29 | 跨 run / 会话的 usage 聚合端点：输入 / 输出 / 缓存 token 分列、计费来源是否等于账单、统计区间与时区、聚合层面的 "Not reported"（对应单 run `missing`） | CC-D0 Usage 模块；落地前不安装 | WK-114 / EX-CC2 |
| BE-30 | 授权决定的乐观并发：`POST /runs/:id/questions/:qid` 接受可选 `expectedContentSha256` / `expectedToolCallId`，与服务端未决载荷比对，不一致返回 409 `version_mismatch`；前端不自造版本号 | Approval 卡（今日请求体只有 `{decision}`） | WK-115 / FE-04 §10 |
| BE-31 | Question 的受限结构化 schema（`string` / `number` / `boolean` / `enum`，无嵌套）**连同**服务端复验 MCP "MUST NOT request sensitive information"；两句一体 | 问题卡（今日自由文本单值） | WK-115 ⑦ / FE-04 §10 |
| BE-32 | 事件时间：`appendEventToState` 只写 `seq`，Trace 中间层（时间线）没有时间不成立 | Trace 三层披露（暂缓） | WK-115 ⑤ / FE-04 §10 |
| BE-33（低优先） | tool 结果带未完成原因 `reason: error \| cancelled \| timeout`；今日 `Interrupted` 由"无 result 且 Run 离开活动态"推出 | tool 行元数据词；交付前用 `Unknown`（WK-115 ①） | WK-115 ① / FE-04 §10 |
| 候选 BE-34 | 可逆变更窗口：哪些动作可撤、窗口多久、谁能撤、撤销的事件与审计形状（Undo Pill / "能 undo 就不要 confirmation" 的前提） | reversible-action（atlas）；无此契约前界面不画 Undo | WK-122 (c)(d) |
| 候选 BE-35 | 策略级 Auto 模式：四个介入触发条件（新增权限 / 不可逆 / 关键方向 / 阻塞）的后端判定与来源字段、合并提问的载荷形状（多问一次、含选项与建议）、审计与撤销（依赖 BE-34） | Session / Run 模式词；Settings › Permissions 一档；ask_user / permission 投影 | WK-123 (a) |
| 候选 BE-26 / BE-27 | Mail / Calendar 只读来源 adapter 最小契约（账户身份、连接状态、`lastRefreshedAt`、1–2 条摘要与深链；日历另需时区与全天事件边界） | 已有模块路线意向；具体账户、provider、scope 与接入排期待裁，当前仅候选合同研究 | WK-114 / EX-CC2 |

## Astra 后端交付（2026-09-09）

BE-17/18 的有界探测部分已交付：作者代码 `f58c28c`，纳入 FE-01 主线后的组合节点 `f4774e5` 全量213/213与smoke通过。[实际协议](../../../../app/docs/runtime-foundation.md#unsaved-provider-preview-be-1718)冻结 `POST /api/v5/provider-models/discover` 与 `/api/v5/provider-connection/test`：临时 `protocol:'openai-compatible'`、API根 `baseUrl`、可选 `apiKey`，返回目录握手状态和发现的模型ID；保留旧GET本地catalog语义，不修改保存配置、凭据、Run或Session绑定。作者与非作者结果见 [证据](../../../../evidence/backend-dispatch-20260909/README.md)。

消费边界：成功只说明目录接受该请求，不证明key被检查、可推理或已配置。任意compatible/local provider与目录新发现模型的保存/执行仍受现有allowlist限制，需要独立的registry/credential/Session绑定单；不得以本次探测交付关闭完整FE-02。无key时省略字段，API根自己包含需要的`/v1`，服务仅追加`/models`。前端按当前单写者队列消费，不由本记录代为开工。


## Astra 有界后端交付：Activity / Usage（2026-09-09）

BE-1/3/25与BE-29由`fd3861b`实现，交付头`52f75dd`；正式消费沿[work-metrics协议](../../../../app/docs/work-metrics.md)。新增认证只读`GET /api/v5/work-activity`、`work-usage`（days 1–366、可选projectId），以及work-summary的可选UTC日期过滤；按Run id去重与startedAt归日。coverage只承诺保留记录范围，删除Chat后的历史完整性为unknown；usage保留partial/missing，不能当账单。summary日期过滤可能排除往日仍待处理的问题，全量待办应继续使用不带date的查询。

[合流证据](../../../../evidence/backend-bounded-main-integration-20260909/README.md)分列作者、Luna独验和来源Astra组合验证。前端未改；CC-D0后续模块须按既有单writer队列消费。极端usage总和超安全整数时两个metrics端点均返回错误，作为明确可用性限制保留；不返回舍入数字。无schema/迁移/新依赖。BE-2、BE-14/15/16、BE-30…33、ES-01、Attention及原生async不随本交付关闭。


## Astra 后端合流：BE-30 / AM / ES-01（2026-09-09）

BE-30后端已交付并合流：可选expectedContentSha256/expectedToolCallId在排队resolve事务内比较，409 version_mismatch无副作用，旧body保持兼容。前端Approval卡按[协议](../../../../app/docs/permission-cas.md)消费，不静默换hash重试；前端消费未随本单完成。

ES-01完整文件候选后端以最终 `b1ff74b`（证据 `95cfb16`）合流，Core2/app3、Runtime4；[正式合同](../../../../docs/work-core/contract.md#es-01-opt-in-recorded-file-memo)与[集成证据](../../../../evidence/harness-next-main-integration-20260909/README.md)给出范围、迁移和290/290组合验证。文件profile无创建GUI，旧renderer只读fallback，文件Review前端需按capability/version显式消费。AM import负例同时合流，不是完整安全解析。Attention接下轮后端，BE-31/32/33与真实provider等不随此单关闭。


## Astra 后端合流：Attention（2026-09-09）

ATT-BE-01以最终产品 `d37704e`、作者证据 `ae595ed` 经来源Astra非作者反例审阅接收；[正式合同](../../../../docs/work-core/attention.md)、[实际packets](../../../../app/tests/fixtures/work-core/attention-packets.json)、[独验记录](../../../../evidence/attention-independent-20260909/README.md)。同库Attention状态/事件/回执、project scope、CAS/重放、typed actions、披露/查询及Runtime signal后端已可消费；Core3/app4、Runtime4。来源Astra发现的旧ES备份悬空链接已修复并复验，最终全量305/305与smoke通过。

ATT-FE沿既有单writer队列接入，不将最小registry视图当详情权限，处理action schema/expected_revision与真实不可用状态。Runtime seam不等于已安装Pi工具或完整ATT-RT；暂无scheduler、外部发送或UI交付。BE-31/32/33、AM-B和真实provider等仍各自待办。


## BE-5 HTTP检查接缝接收（2026-09-10）

作者 `9cbae87` / `470498b` 的认证inspect-only服务经Astra非作者复核接收，见 [合流证据](../../../../evidence/runtime-source-service-integration-20260910/README.md) 与 [HTTP合同](../../../../docs/runtime-control/api.md)。现有解析器可经POST调用；不新增locator获取、安装、权限或模型工具。UI与完整R2获取仍未实现；共享body超限断连事实已明确，不宣称可见JSON 413。


## BE-40@Attention · Attention registry 排序口径（Fable，2026-09-10）

| 编号 | 请求 | 依据 |
|---|---|---|
| BE-40@Attention | **`GET /attention/registry` 与 `query{kind:registry}` 的返回顺序写进合同。** 现合同 §Queries 定义了 `items / count / offset / next_offset / truncated / disclosure`，但没有声明排序。triage 面的默认顺序是产品事实，前端不能在分页边界上自行重排（客户端排序跨页错乱）。请求默认序 `needs_you > investigating > waiting > later > resolved`，同档内 `updated_at` 降序，并在合同写明；若 `app/core/attention.py` 已有确定顺序，写明现状即可，不必改实现 | WK-156 / WK-157；[设计页 §2](../../../design/attention-triage-2026-09-10/README.md) |

**明确不请求**（附理由，免得后续 session 重开）：registry 加 `reason` 摘要——合同刻意的最小视图边界，WO 约束表原话「不把 registry 当详情权限」；每状态计数——WK-117 (b) 不以 count 代替条目，且需五次查询；snooze 到期自动回归——需 scheduler owner，合同明说 due time 不是调度器。

编号消歧（RV26-00，2026-09-10）：原 BE-40 两条来源均保留，现使用 `BE-40@Provider`（PV-56）与 `BE-40@Attention`（WK-156/157）作为唯一限定别名；裸 BE-40 不得用于领取或关闭。不是删除或关闭任一需求。

## BE-41 · Spark 派生失效只读投影（冻结，未实现）

[冻结 DTO](../../../design/spark-surface-2026-09-10/be41-dto.md)与[SP-10…12 裁决](../../../design/spark-surface-2026-09-10/integration-ruling.md)已接入。后端由 Astra 沿现有 Core / project 权限承担：`GET /api/v5/work-derivations?projectId=<id>&limit=<n>&offset=<n>`，只读现有 Matter / candidate / source_history 事实，不建立 Spark 私有 store。

状态仍为**后端未实现**。前端可先按冻结形状独立验收；真实 host 的 404 显示 unimplemented，不显示合成数值或把缺测当零。客户端分页保留预期 snapshot 并拒绝变化，不代表服务端快照回读或真实维护覆盖已交付。BE-41 接线与真实覆盖继续按原顺序施工；本轮前端合流不关闭 RV26-SP01 或 ME-03。

## 通用 Harness 缺口 · 每请求 decode 终值（Claude 转 Astra，2026-09-10）

用户裁定（TPS D-1）：此项进入通用 Harness 缺口队列，排在基本功能之后，不抢先施工。编号由 Astra 分配；BE-40 曾出现过撞号，所以这里不自取编号。main 在 `a2b084d` 之后把基本 GUI 与通用 harness 完备排在前面，并开了 Pro 评审单 `engineering/execution/2026-09-10-harness-pro-review.md`；本条作为 HPR-01 矩阵 provider/streaming 行的一项输入，由 Astra 决定并入哪一张施工单。

| 拟编号 | 请求 | 依据 |
|---|---|---|
| （待 Astra 编号） | 研究在 provider/runtime 遥测边界上，给每个请求记录一个 decode 终值：owner 计数的首 token 之后的输出 token 数，owner 单调钟上从首 token 到末 token 的时长，以及时钟来源。失败、取消、中断时记 null。provider 时钟与 `host-tokenizer` + 宿主收包时钟是两种测量，分开命名、分开记录，后者不称推理引擎 decode TPS。先不做逐 token 时间序列。不属于 BE-38（BE-38 是错误类别）。 | [TPS specimen](../../../design/tps-specimen-2026-09-10/README.md) §3 与 §11；[参考核验](../../../design/tps-specimen-2026-09-10/reference/README.md)；`app/docs/request-telemetry.md` 第 9 行；WK-141 (b) |
