# PV 批次 intake（Fable，2026-09-10）

用户 2026-09-10 交办："认领 provider 前后端施工，Sonnet explore"，并转发一份 provider 抽象与模型面调研（[inputs](inputs/provider-research-2026-09-10.md)）。用户同时给出三条边界：转发材料仅供参考、并非全部事实；UI 须从当前状态自然长出，不临时生造；Design scout 目录皆可用。

## 1. 现状转录（Fable 读码，基线 `main` `ee6df72`）

以下为读码所得，非转述。

| 对象 | 今日实现 | 位置 |
|---|---|---|
| Provider 身份 | 允许集三条：`fake-openai-loopback`、`deepseek`、`openai`；`provider` 与 `model` 已分开，路由主键即 `{provider, model}` | `app/server/service.mjs:39`、`app/runtime/pi-session-runtime.mjs:17,22` |
| 认证 | 仅 API key；凭据文件按 provider id 存，写入即 `bumpCredentialGeneration`；运行期 key 交给 pi-ai `ModelRuntime` | `app/server/credential-file.mjs`、`service.mjs:706-731` |
| 模型目录 | pi-ai 0.85.1 `ModelRuntime`，`modelsPath:null`、`allowModelNetwork` 保持默认 false，目录不联网刷新；provider 注册时带 `auth:{apiKey:envApiKeyAuth(...)}` 与 `api:{stream,streamSimple}` | `pi-session-runtime.mjs:54-96` |
| 传输 | `API_FORMATS = ['openai-completions','openai-responses']`，另有可选 `baseUrl` 走兼容端点；DeepSeek 换非目录 api 必须显式给 `baseUrl` | `pi-session-runtime.mjs:24`、`service.mjs:694` |
| 配置读写 | `GET/PUT /api/v5/provider-config`，配置体 `{provider, model, api, reasoningEffort?, baseUrl?}`；运行中改配置或改凭据一律 409 `active_run` | `service.mjs:668-731` |
| 目录探测 | BE-17/18 已交付：`POST /api/v5/provider-models/discover`、`/api/v5/provider-connection/test`，临时 `protocol:'openai-compatible'`，不落盘、不碰凭据与 Session 绑定 | `app/server/provider-preview.mjs` |
| 每次运行的快照 | run 记录 provider descriptor，含 `executionMode`（real / simulation）与 `credentialStatus`；无凭据即 `credential_missing` 错误落账 | `service.mjs:1054,1107-1121` |
| 推理强度 | 目录给 `supportedEfforts` / `defaultEffort`，服务校验后映射成 pi 的 `thinkingLevel`，运行记录 `requestedEffort` 与 `effectiveEffort` | `service.mjs:697`、`pi-session-runtime.mjs:176,204` |
| 一级模型面 | 共享原生 `<dialog>` 模型选择器：搜索框、按 provider 分组的 `optgroup`、effort 下拉、一行路由说明（provider · api · custom endpoint · context window）、"Applies to all chats for future runs" | `app/web/model-picker.mjs` |
| Settings | Models & Connections（FE-02 已合流），连接与凭据入口在此 | `app/web/settings-view.mjs` |

即：调研材料所说的四个对象（Provider identity / Auth / Model catalog / Wire transport），Courtwork 今日已经各有实现，且 provider 实现本就来自 pi-ai。本批次不是引入一套抽象，而是把已有四者补齐到多连接、多认证方式可用，并让模型面从现有 dialog 长出来。

## 2. 裁定

**PV-1（认领与边界）** 本批次统管 provider 的后端契约与前端模型面。后端条目仍登记进 BE 序列由 Astra 施工，Fable 只裁契约与消费边界；前端沿单 writer 队列。范围内：provider 身份、认证方式、目录、传输、模型面与连接面。范围外：路由 / fallback / 配额策略、成本策略、多 agent 分模型——本批次不开这些单（理由见 PV-13）。

**PV-2（不造第二套抽象）** 四对象采纳为分工命名，映射到现有代码名，不改名、不加中间层：Provider identity = `provider` id 与允许集；Auth = 凭据存储与 provider 注册的 `auth` 段；Catalog = `ModelRuntime` 与 `/provider-models`；Wire transport = `api` 加可选 `baseUrl`。任何新单不得引入与这四者并列的第五个概念。

**PV-3（路由主键）** 模型身份恒为 `{provider, model}`，已是现状，继续持有。新增的任何存储、快照、遥测与 UI 状态不得只存 `modelId`。

**PV-4（认证方式成为数据）** 认证方式升为 provider 描述符上的显式字段（候选 BE-36：`authMethods: ['api_key'|'oauth'|'ambient_credentials']` 及每种方式所需字段），前端据此编排表单，不写 `if (provider === 'google')`。今日只有 `api_key` 有实现；`oauth` 与 `ambient_credentials` 先立契约位，未经单独裁定不实现。

**PV-5（消费级 Google OAuth 不采纳）** Courtwork 不实现"用另一产品的登录态取 token 再调其后端"的路径，也不读取 `~/.pi/agent/auth.json`。此条不依赖调研材料中的弃用与条款说法成立；该说法本身交 EX-PV2 独立核验，核验结果只影响文档措辞，不影响本裁定。

**PV-6（每轮冻结）** 运行期配置冻结已由 409 `active_run` 与 run 内 descriptor 实现，继续持有：多连接改造不得使进行中的 run 半途换配置，也不得使 run 记录里的 provider 快照可被后续编辑覆盖。前端不得把切换模型呈现为影响当前 run；现有 dialog 的说明句是既有正解。

**PV-7（推理强度语义统一）** 一级 UI 只出 `Off` 与目录声明的档位；`thinkingBudget`、`reasoning_effort` 原始值一类 wire 参数不得进入一级 UI，映射留在 provider 与运行层。这一条今日已成立，改造中不得倒退。

**PV-8（UI 从现状长出）** 一级面沿用既有共享模型选择器（`web/model-picker.mjs`），二级面沿用 Settings › Models & Connections。调研材料的 popover、Recent/Favorites、capability chip、底部 Manage models / Connect provider 两出口，均按**假说**处理：先由 EX-PV3 取成熟先例，再作 specimen（一次一变量，真实模型行），方可裁定。dialog 改 popover 属于 chrome 形态变更，须服从 WK-101 的层级规则（内容不 blur；浮于滚动内容之上者才可用 chrome-glass；transient 层 `--glass-muted` + blur 16）与 WK-120 的密度序（FE-05a 之后）。

**PV-9（capability 标签只映射目录字段）** 模型行上的标签只允许来自目录真有的字段：`contextWindow`、`supportedEfforts`、`api`、连接健康。`Fast`、`Vision`、`1M` 一类须先在目录里有对应字段与来源，方可上 UI；无 schema 不画控件（WK-129）。营销参数不入。

**PV-10（连接是复数）** BE-21 是本批次的后端主干：连接注册表使每条连接各自持有 provider 身份、端点、凭据状态；兼容端点作为独立连接，而非给目录身份换端点。前端在多连接落地前只画后端真有的一条（WK-107 既有裁定）。BE-28（`lastVerifiedAt` 绑定配置与凭据版本）随之，使 Models 摘要能诚实显示 stale。

**PV-11（探测与保存分离）** BE-17/18 的探测语义不得被复用为"已连通即可保存执行"：握手成功只说明目录接受该请求。新增 provider 的保存与执行仍受允许集与凭据绑定约束，扩集须显式过单。

**PV-12（首轮 dogfood 矩阵）** 建议首轮为 DeepSeek API key 与 `google` provider 的 Gemini API key 两条：前者已通，后者以最小施工验证"第二个真实 provider 身份 + Google 原生传输 + 目录扩集"。Vertex ADC（ambient credentials）留作第二轮——它验证的是 PV-4 的认证抽象，代价是 gcloud 环境、GCP 配额与计费，与首轮要验证的东西正交。选型归用户（见 §4）。

**PV-13（先可追溯，后自动）** 本轮每次调用显式固定 provider / model / auth source 并留下 TTFT、TPS、cache、context、reasoning、usage 与 error class 的记录（既有 `runtime/request-telemetry.mjs` 已有基线，缺口由 EX-PV1 列出）；自动路由、配额 fallback、cheap/fast 策略待有真实 dogfood trace 后再议。

**PV-14（队列位置）** PV 不抢占 FE-05a（字阶与密度）与 FE-05（材质）。后端主干（BE-36、BE-21、BE-28、目录扩集）与三条探索即刻并行；PV 前端单排在 FE-05a 合流之后——模型面是密度敏感面，先定字阶再改形态可省一次返工。

## 3. 探索派单（Sonnet，2026-09-10 发出）

三条均为只读，报告写 `/private/tmp/se-fable-pv/explore/`，由 Fable 复核后入库；探索不改代码、不改本仓文档。

| 单 | 题目 | 交付 |
|---|---|---|
| EX-PV1 | 现状全量转录：`main ee6df72` 上 provider / model / credential / catalog / telemetry 的全部触点，含端点与载荷 schema、存储、允许集、运行期注册、测试与文档 | 契约表 + 缺口表，不出方案 |
| EX-PV2 | 参照解剖：本地 pi 0.85.1（`~/Projects/Motto`）与 DeepSeek Harness（`~/Projects/motto-dsh/packages/llm/llm-pi-ai`、`llm-deepseek`）如何分离身份 / 认证 / 目录 / 传输；在 Courtwork 固定的 pi-ai 0.85.1 上新增 `google`、`google-vertex` 与自定义 OpenAI 兼容网关各需要什么；ambient credential 支持到什么程度；并独立核验调研材料中的三条外部说法 | 逐条 verified / refuted / unverified，附文件与行号 |
| EX-PV3 | 先例采集：按 scout 索引的 `onboarding · 首次运行（Models & Connections）` 与 `control` 两问，取 SaaSFrame product precedent 与 OpenCode / Cline 一类已发布产品，回答两个问题——composer 处切模型、Settings 处连 provider | 每问 ≤ 3 候选（URL + 产品 + 文字观察），淘汰写原因；不出 moodboard，不下载资产 |

## 4. 升报用户（一次问完）

1. **首轮 dogfood 矩阵**：建议 DeepSeek key + `google` provider 的 Gemini API key（PV-12），Vertex ADC 留第二轮。若用户要的正是"不手贴 key、用 Google 身份登录"，则首轮改 Vertex ADC，须接受 gcloud 环境与 GCP 计费。
2. **队列位置**：建议 PV 前端排在 FE-05a 之后（PV-14）；若要求 PV 前端提前，则 FE-05a 顺延，模型面会在字阶未定的状态下成形。

两项均不阻塞：后端契约与三条探索按 PV-14 即刻并行。

## 5. 回执与增补裁定

**EX-PV1 收（2026-09-10，Fable 复核接受）**：[explore/ex-pv1-current-state.md](explore/ex-pv1-current-state.md)，10 条端点、三层校验、持久化与前端触点均带 file:line。Fable 非作者抽验三处成立：凭据以 provider id 为唯一索引（`credential-file.mjs:35` 覆盖写）、`providerConfig` 在 `runtime-state.json` 中是单值而非表（`store.mjs:23-33`）、Settings 连接表单的 PUT 体不含 `reasoningEffort`（`settings-view.mjs:794-798`）。

**PV-15（单值配置是多连接的真障碍）** 阻碍不在允许集那一行，而在三处结构单数：`state.providerConfig` 单对象、`credentials.json` 以 provider id 为键（同一 provider 两把 key 不可表达）、`control-plane` 资源 id `provider:current` / `model:current` / `secret:provider` 为单数。BE-21 的验收须同时覆盖这三处，只扩允许集不算交付。

**PV-16（模型面与连接面的写入必须合一）** 缺陷：模型选择器 PUT 带 `reasoningEffort`、Settings 连接表单 PUT 不带，而后端整体替换配置——保存连接会静默清掉已选推理档位。登记为 PV-M-1，修复入 PV 前端单第 0 项：两处写入合流为一条投影（读同一 snapshot、提交同一字段集），不是各自补字段。

**PV-17（探测结果不落盘是现状而非缺陷）** discover / test 的结果只活在一次前端渲染里，刷新即失。BE-28 落地前，UI 不得把探测结果呈现为连接的持久健康状态；BE-28 的 `lastVerifiedAt` 须绑定被检查的配置与凭据代次（既有裁定），并与 `credentialStatus` 的布尔语义分列两列。

**PV-18（遥测缺口按现状披露）** `providerTtftMs` 与 `decodeTokensPerSecond` 今日恒为 `null`（`request-telemetry.mjs:20` 自陈 `missing:['provider_token_timing','token_deltas']`），且失败只落 `phase`，无错误类别字段。PV-13 所需的 error class 因此是一条新后端条目（候选 BE-38），不能由前端从文案反推分类。

**EX-PV2 收（2026-09-10，Fable 复核接受）**：[explore/ex-pv2-reference-anatomy.md](explore/ex-pv2-reference-anatomy.md)。Fable 非作者抽验四处成立：`google` provider 的 auth 只有 `envApiKeyAuth("Gemini API key", ["GEMINI_API_KEY"])`（`dist/providers/google.js:10`）；pi 的 OAuth 只给 anthropic / github-copilot / kimi-coding / openai-codex / openrouter / radius / xai，**不含 google**；`vertexAuth.resolve` 的 ADC 分支读 `GOOGLE_APPLICATION_CREDENTIALS` 或 `~/.config/gcloud/application_default_credentials.json` 加 `GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION`，并回报 `source`（`dist/providers/google-vertex.js:4,59-83`）；D1 / D2 已核实。

**PV-19（`google` + Gemini API key 的真实成本）** pi 侧纯配置，且免费得到完整目录（contextWindow / maxTokens / thinkingLevelMap）。Courtwork 侧成本三处：允许集加一条、`API_FORMATS` 与 `pi-session-runtime` 的 `api` 派发表加 `google-generative-ai`、目录暴露照旧。不新增抽象，可作首轮第二条。

**PV-20（Google Auth 的瓶颈不在 pi，在凭据教条）** 消费级 Login with Google：pi 本体未实现，Google 亦已停该路径并在条款上禁止第三方借道（D1 / D2 verified），PV-5 因此有据。Vertex ADC：pi 0.85.1 已实现且是标准路径，瓶颈在 Courtwork——今日的凭据教条明确剥离继承的环境变量、拒绝把 ambient 文件当凭据来源（T-CRED-1 / 3 / 5），而 ADC 本质就是 ambient。采纳 ADC 等于显式开一类新的凭据来源，须同时满足：① 逐 run 披露凭据来源（pi 的 `resolve` 已回报 `source`，直接消费，不自造）；② 仍不读其他产品的登录态（`~/.pi/agent/auth.json` 之禁不变）；③ 增补对应 T-CRED-* 级测试；④ 连接行须显示来源与所属 GCP project / location，不得呈现为"已连接"而不说来源。未经用户裁定不实施。

**PV-21（自定义兼容网关排在内置 provider 之后）** 消费侧 `createProvider` 可描述任意网关，但不获得任何内置目录，每条 Model 记录须手写；这正是 PV-17 所述"探测结果不落盘"的另一面。次序：先第二个内置 provider（PV-19），后网关（须与 BE-21 的兼容连接与模型录入路径一并成单）。

**PV-22（DSH 增量按需取用）** 取其错误分类学作 BE-38 的形状参照；catalog 覆盖与 drift gate 今日无对应需求（Courtwork 不覆写目录字段），replay envelope 不入本批次；凭据分离与既有做法一致，无须移植。

**EX-PV3 收（2026-09-10，Fable 复核接受）**：[explore/ex-pv3-precedent.md](explore/ex-pv3-precedent.md)。两问各 3 候选，淘汰原因齐备。

**PV-23（先例的可移植半边）** OpenCode 两条列为 canonical candidate：composer 下方触发器加按 provider 分组的列表（与今日结构同形），以及 Settings 的 catalog / custom-compatible / local 三分（与 `CONNECTION_PATHS` 同形）；其"切换立即作用于当前会话"一半不可移植，与 PV-6 的每轮冻结相冲。Zed 只取星标与键盘循环（specimen），其以 provider logo 代替分组、一模型多 provider 的身份模型与 PV-3 冲突，不取。Cursor 的双入口（点击 / 循环）作 specimen，其把推理档位并入模型身份与 PV-7 冲突，不取。SaaSFrame 的 API key 解剖（遮蔽值 / 揭示 / 复制 / 上次使用时间）作 donor，`Regenerate` 不移植——Courtwork 的凭据契约只有保存与移除。Superlist 的一键 Google OAuth 作反例留档（PV-5）。BE-17 / 18 / BE-28 的验证与 stale 呈现在采集到的先例中无对应物，属 Courtwork 自有问题，须由 specimen 自行解决。

## 6. 用户裁定（2026-09-10）

**DEC-PV-a 首轮矩阵**：第二条取 `google` + Gemini API key，Vertex ADC 顺延第二轮。工单 [WO-PV-BE01](work-orders/WO-PV-BE01-google-admission.md)。

**DEC-PV-b 队列**：PV 前端单排在 FE-05a 之后，PV-14 持有；后端主干不受此约束。

## 7. 用户改约（2026-09-10，第二次）

用户："可以先记 pr，目前先实现更广泛的 provider UI，保证前端的填写能够真实消费。"

**DEC-PV-c（覆盖 DEC-PV-b）** provider UI 提前，不再等 FE-05a。代价照说：模型面与连接面是密度敏感面，FE-05a 落地后这两处大概率重排一次；本批次接受这次返工，不据此放宽 FE-05a 的约束表。

**DEC-PV-d** Vertex ADC 记为待办 PV-D1，不开工。四项代价原样留存（逐 run 披露来源、不读他产品登录态、增补 T-CRED-* 级测试、连接行显示来源与 project / location），随时可升为工单。

**PV-24（"真实消费"的定义）** 表单里能填的每一项，保存后必须进入执行路径，并在 run 记录里可回溯到它。填得出、却不能保存或不能执行的字段只有两种下场：实现它，或从表单删掉。今日的反例是"Fetch models"——发现出的模型 ID 明确不入 Model 列表、不入保存配置（`models-connections.test.mjs` 以此为断言标题，`runtime-foundation.md:231-232` 复述）；这是本轮要消除的，不是要保留的诚实说明。

**PV-25（最小可执行层）** 端到端最小版本为：一条兼容连接，持有自己的 Base URL、api 格式、自己的 key、以及一个来自发现的模型 ID，保存后能真跑一次 run，run 记录里能读出它用的是哪条连接与哪个来源。多连接并列、连接切换、健康时间戳在此之后。不先做大而全的连接管理页。

**PV-26（前端单独做不成）** 这一层做不成纯前端改动：凭据今日以 provider id 为唯一键（`credential-file.mjs:35` 覆盖写），一条挂在 `openai` 身份下的兼容连接会与真实 OpenAI 的 key 互相覆盖。所以连接必须先有自己的身份（connection id）与连接作用域的凭据——BE-21 的一个薄切片是前置，不是后续。本轮因此是后端 + 前端配对成单，后端先落。

**PV-27（未知能力如实呈现）** 发现来的模型没有 contextWindow、cost、推理档位等元数据。UI 一律显示"unknown"，后端一律存 null，不得由 host 猜值或套用同名模型的目录值（PV-9 的延伸）。推理档位在未知时只出 `Off`，不出档位选择器。

**PV-28（三条路径的收敛）** `CONNECTION_PATHS` 的 catalog / compatible / local 三分保持（EX-PV3 认其与 OpenCode 同形），本轮只让 compatible 一条真正通到执行；catalog 路径随 WO-PV-BE01 增加 `google`；local 不动。

**PV-29（次序与资源）** WO-PV-BE02（连接身份 + 连接作用域凭据 + 发现模型准入的薄切片）先落，WO-PV-FE01（连接面与模型面消费真实连接，含 PV-M-1 写入合一）随后。EX-PV4 已派（运行期 provider 注册生命周期、最小 Model 记录、凭据绑定、重启恢复、错误类），其回执决定 BE02 的字段集。PV 前端树端口 8911，fixture 8912（2026-09-10 已核空闲）。

## 8. 待办登记

| 号 | 事项 | 状态 |
|---|---|---|
| PV-D1 | Vertex ADC（ambient credentials）：pi 侧纯配置已具备，Courtwork 侧须显式开一类新凭据来源，代价四项见 PV-20 | 记录，未开工（DEC-PV-d） |
| PV-D2 | 自定义网关的完整形态（任意 provider 身份 + 手工模型录入），在 PV-25 的最小层之后 | 记录 |
| PV-D3 | BE-38 错误类；BE-28 `lastVerifiedAt`；BE-12 已部分交付 | 记录 |
| PV-D4 | 成本面：上线前须先有"成本未知"的表达位，否则用户连接的显式零成本会变成谎（PV-48） | 记录 |
| PV-D5 | `streamSimple` 路径：若日后有路径走它，`clampMaxTokensToContext` 会拿到 `undefined` 的 `maxTokens`，须重新裁定（PV-49） | 记录 |

## 9. EX-PV4 回执与增补裁定（2026-09-10）

**EX-PV4 收，Fable 复核接受**：[explore/ex-pv4-runtime-registration.md](explore/ex-pv4-runtime-registration.md)。Fable 非作者抽验两处成立：`resolveCompactionPolicy` 在窗口未知且 `enabled:false` 时返回降级策略而不抛（`app/runtime/pi-session-runtime.mjs:132-136`）；`classifyRuntimeError` 只用两条正则认出 `credential_missing` 与 `provider_auth_failed`，其余一律 `provider_error`。

**PV-30（未知窗口不靠猜值，靠关压缩）** 缺 `contextWindow` 会在首次 Run 抛错，但既有代码已有诚实出口：该连接默认关闭压缩并显式记录 "context window unknown, compaction disabled"，而不是给一个宿主编造的窗口值。用户可选填窗口以启用压缩，填了要标明来源是用户输入。此条优先于任何"给个保守默认值"的做法。

**PV-31（用户连接用独立 provider id，用 merge 注册）** 运行期为每条用户连接派生独立 provider id，用未被调用过的 `registerProvider`（字段级合并）注册，删除走 `unregisterProvider`；禁止注册到目录身份上——凭据是"id → 单槽"，会互相覆盖。

**PV-32（凭据键从 provider id 改为连接 id）** 破坏性改动，一次迁移，不留兼容层（项目工程原则）。这是 PV-26 的落点。

**PV-33（凭据来源直接消费 pi 的分档）** run 记录里记 `runtime` / `stored` / `environment` 三档，取自 `getProviderAuthStatus`，不自造分类；`AuthResult.source` 是自由文本，不入契约。

**PV-34（错误分类分两层）** 保存时的三类区分直接消费 BE-17/18 的 `status` 枚举；运行期分类今日只能从扁平字符串正则回收，属 BE-38（PV-D3），本轮不动，也不得在前端重新分类冒充精度。

工单：[WO-PV-BE02](work-orders/WO-PV-BE02-connection-slice.md)（后端薄切片，先落）、[WO-PV-FE01](work-orders/WO-PV-FE01-connection-consumption.md)（前端消费，待 BE02 合流后填基线派出）。

## 10. 前端写权（2026-09-10）

**DEC-PV-e** `app/web/**` 的单一 writer 原为 Astra（Home backlog slices 3–7，见 Interaction Grammar 线的既有约束"Fable 侧工单不得进入 app/web"）。用户裁定：本轮 **Astra 让出 `app/web`**，PV 前端由 Fable 派本地 Opus 在独立分支施工。单一 writer 规则不破——写权转移，不是并列两个 writer。Astra 的 Home slices 若已在途，其与 `settings-view.mjs` / `model-picker.mjs` 的交集须在合流时由 Astra 裁决先后。

WO-PV-FE01 的派出条件随之改为：WO-PV-BE02 交付后，以 `claude/pv-be02-connections` 为基线建树（不以 main 为基线），使前端能对着真实端点写，避免对空契约施工。

## 11. 连接冒烟与"绿灯"（2026-09-10）

用户问：连接 provider 时是否做一个冒烟 / green 提示。分两半答。

**PV-35（冒烟采纳，但是动作加回执，不是状态灯）** 今日的两个探测只走到目录：`test` 证明那个目录接受了这次请求，`discover` 读出它报的模型 ID——两者都不证明 key 有效，更不证明该模型能回答。缺的正是最后一级。因此设三级阶梯，每级都写明它**不**证明什么：① 目录可达（`test`）；② 目录接受这把 key（探测的认证分支）；③ **该模型真的回答了**（冒烟）。第三级是把"填写能真实消费"（PV-24）在保存当刻就验一次，而不是等第一次真跑 run 才发现填错。

**PV-36（绿灯不做）** 两条既有裁定挡住它：色彩治理已定"状态色范围：只 failed（danger）与 waiting_user（accent）允许彩色；completed / cancelled / unknown 灰字"（[color-governance](../work-surface-kit/contracts/color-governance.md)），成功不着色；[ui-state-vocabulary](../work-surface-kit/contracts/ui-state-vocabulary.md) §1 明载"无 `stale`：需要 BE-28 一类时间戳才能诚实说 stale"，而一个常驻绿点恰恰是在断言"此刻健康"——今日既没有持久化的验证事实（PV-17），也没有失效规则。所以：**回执是一行带时间的灰字**，不是一个点；等 BE-28 落地、`lastVerifiedAt` 绑定配置与凭据版本之后，再谈是否需要常驻标记，那时也先考虑文字而非色点。

**PV-37（冒烟必须走真实执行路径）** 同一 provider / 凭据解析、同一 wire 格式、同一模型 id；另起一条"轻量校验"路径等于证明了别的东西。但有界：最小输出上限、无工具、无 workspace、不进正常会话历史。它是否记成一条带 probe 标记的 run、还是完全瞬态，由 BE-39 作者按最小改动定，写进待裁定。

**PV-38（绝不自动触发）** 冒烟真的调用一次模型：花钱，且在 provider 侧留日志。只在用户显式点击时发生，按钮文案要说明这一点。不得在输入 key、保存连接、打开设置页时自动跑。

**PV-39（回执内容与失效）** 一行回执写：时间、用的哪条连接与哪个模型、凭据来源档（`runtime` / `stored` / `environment`，取自 pi，PV-33）、provider 回报的 `observedModel`；失败写类别（保存期三类沿 BE-17/18 枚举；运行期分类今日粗，见 PV-34，不冒充精度）。连接配置或凭据一改，回执即作废并从界面消失——与 BE-28 的失效规则同源。

后端条目 BE-39（冒烟端点）已登记；它依赖连接身份，故排在 WO-PV-BE02 之后、与 WO-PV-FE01 同期。WO-PV-FE01 增第 6 项：冒烟按钮与回执行，按 PV-36…39 实现；BE-39 未落地前只留位不画假状态。

## 12. 成功回执的形式（2026-09-10，修订 PV-36）

用户澄清：green 指的是 success 提示，不是绿灯；形式可另选。PV-36 的色彩部分成立但答非所问，此节接住真问题——**成功要看得见，形式由 Fable 定**。

**PV-40（证据即提示，长在既有回执块上）** 不新造一个提示物。今日连接面已有一个 `role="status"` 的探测结果块（`settings-view.mjs:413-437`），其注释写明为何不是 toast——"读者要能回头再读一次它说了什么，而它说的是后端原话"；且表单一改就 `clearProbeResult` 作废。冒烟结果落在同一个块里，载荷是**模型自己回的那一句**（截断一行）加时间、模型、凭据来源档。成功不靠一个色点让人相信，靠它产出的东西本身：目录探测只能给一句状态词，冒烟能给一句真话，这就是第三级与前两级的差别所在。

**PV-41（阶梯完成态用字与形，不用色）** `CONNECTION_STEPS` 的五步里，冒烟这一步从"未交付"变成有回执的完成步：已登记的 check glyph 加灰字状态词加时间。色彩治理不改（成功不着色，失败仍走 danger 与既有 `is-failed`）；这不是把提示藏起来，是让"完成"由字形与内容承担，与 Run 的终态词一致。

**PV-42（这一回执就是第一条诚实的健康事实）** BE-39 的回执绑 `{providerConfig 版本, credentialGeneration}` 持久化，二者一变即失效并从界面消失。绑定成立后，连接行可以显示一行文字 "Answered 14:32 · <model>"——它有确切的失效规则，因而不是 PV-36 所拒的那种会烂掉的承诺。这把 BE-28 在本面上的需求提前满足；BE-28 仍需覆盖非冒烟类检查，条目不撤。

**PV-43（toast 留给保存，不给冒烟）** `notify("Connection saved.")` 一类瞬时提示继续用于保存成功；冒烟结果不上 toast——理由与既有注释同源：它是要回头再读的证据，不是一闪而过的确认。

**留待消融的一个变量**：回执行显示模型回复原文（截断一行）还是只显示"已回答 + 用时/字数"。我选原文——它是唯一自证的东西；若真机上原文噪声太大（模型寒暄、多语言、控制字符），再退回计数，一次一变量，记进 misfit。

## 13. WO-PV-BE02 复核（Fable，2026-09-10）

交付页 [delivery-pv-be02](delivery-pv-be02.md)，分支 `claude/pv-be02-connections`，基线 `b4e3f71`，两提交 `d4b5fa6` / `e61c9d5`。Fable 非作者复核：读码抽验四处 + 独立重跑测试。独立重跑结果 **456/456，fail 0，exit 0**（Fable 自跑，非引用作者日志），与作者所报一致。

抽验成立：`conn-` 与 `catalog-` 两个前缀使用户连接的 provider id 不可能落到目录身份上（`provider-connections.mjs:13-47`，PV-31）；注册与注销走 `registerProvider` / `unregisterProvider`（`pi-session-runtime.mjs:103-114`，PV-31）；凭据键改连接 id 且以 `replaceCredentialFile` 一次迁移、无兼容层（`credential-file.mjs`，PV-32）；未知窗口有唯一常量 `UNKNOWN_WINDOW_NOTICE = "context window unknown, compaction disabled"`，被 `/provider-config` 的 capability 与 run 记录共同消费，压缩显式关闭（`service.mjs:733-761,1187`，PV-27 / PV-30）。`app/web/**` 零改动，写权边界守住。

逐项裁定（对交付页 §8）：

**PV-44（①基线）** 接受以 `b4e3f71` 为事实。工单写 `ee6df72` 是我派单时的旧头，作者取代码为准是对的。EX-PV1 的 `SCHEMA_VERSION = 7` 同此——探索是某一刻的转录，不是长期契约，后续引用须以代码为准。

**PV-45（②合流单元）** **BE02 不单独合流**。凭据请求体改字段会让 Settings 的存/删密钥 400，这段窗口不接受。合流单元是 BE02 + FE01：FE01 从 `claude/pv-be02-connections` 分出，Astra 合流 FE01 分支时一并带入 BE02 的两个提交。作者按裁定不碰 `app/web` 是对的，代价由合流次序消化，不由作者越界消化。

**PV-46（③第三类失败）** 接受服务层错误码 `connection_model_not_in_directory`，不改探测枚举。探测契约是"目录握手"的契约，"模型不在目录"是保存动作的判断，两者不该混进一个枚举。FE01 按错误码显示，不自行归类（PV-34）。

**PV-47（④凭据来源，修订 PV-33）** 我原写"三档"，实为六值，且本宿主只可能取到 `runtime`。修订：run 记录原样落 pi 返回的值，不裁剪、不改写；FE01 **不得**为另外五个值造分支或选择器——今日不可达的值不进 UI（无契约不画，WK-122）。何时可达由后续变更再裁。

**PV-48（⑤成本）** 接受。宿主没有成本面，显式零成本不会被读成 `$0`；新增断言把"没有价格面"钉住，是正解。日后要上成本面，前置条件是先有"成本未知"的表达位——记入待办 PV-D4。

**PV-49（⑥ `maxTokens`）** 接受留空。填任何值都是宿主编造。约束记死：本宿主走 `stream`；若日后有路径走 `streamSimple`，`clampMaxTokensToContext` 会拿到 `undefined`，须重新裁定——记入待办 PV-D5。

**PV-50（⑦ WK-108 用例）** 该用例断言的是前端事实，后端能力变了而前端未变，故仍成立且仍应通过。由 FE01 改写，并在交付页写明改的是哪一条、为何不再成立（FE01 第 1 项已含）。

**PV-51（⑧ schema 8→9）** 接受。版本号是事实，随迁移更新既有用例不是放宽断言；作者已核每条断言强度未降。

**PV-52（⑨ `credentialStatus` 派生不落盘）** 采纳作者做法，**修订工单字段表**：凭据文件是"有没有 key"的唯一真相，落进 state 会造第二个真相源。工单原表列它是我写漏了边界，以此裁定为准。

⑩ fixture 增 `GET /v1/models` 接受——它使兼容连接的完整旅程能在不联网下端到端验证，且未改 fake 的对话行为。

未检项照收：真实 provider `not_run`（凭据只在 UI 输入）；`openai-responses` 的兼容连接无真实 fixture 佐证；网关完整形态、`lastVerifiedAt`、错误分类、Vertex 均按既有裁定不在本单。

**结论：接受（作者验证级）。** 独立验收仍归 Astra（C4 体例）。下一步按 PV-45 派 WO-PV-FE01，基线 `e61c9d5`。

## 14. WO-PV-FE01 复核（Fable，2026-09-10）

交付页 [delivery-pv-fe01](delivery-pv-fe01.md)，分支 `claude/pvfe01-connections`，基线 `e61c9d5`（含 BE02），三提交 `062170c` / `5a27f09` / `88e8339`。Fable 独立重跑 **461/461，fail 0，exit 0**（自跑），与作者一致；读码抽验：两处写入确由同一 `projectProviderConfig` 装配（`settings-view.mjs:56`、`model-picker.mjs:2,87`），PV-M-1 闭合；`app/server` / `app/runtime` 零改动。

逐项裁定（对交付页 §7）：

**PV-53（④模型面的分组标签，本单最显眼的不可读）** 模型选择器把用户连接的模型分组在原始 `conn-<hex>` 下（`model-picker.mjs:68`）。连接列表那边已经用端点主机名作名字，两处不一致。裁定：模型面同样用**端点主机名**——它是用户自己填过的事实，不是宿主编造的友好名；不新增 display name 字段（FE-02 已移除它），取不到连接列表则退回原始 id，不猜不留空。已作有界补丁派回原作者，一次一变量。

**PV-54（①投影未能独立成模块）** `app/server/index.mjs` 的静态白名单枚举可服务的 web 模块，而 `app/server` 不在前端写权内，作者以一次真实 404 证实后把投影留在 `settings-view.mjs` 内并加注释——处置正确，没有为了模块化去越权。合流时由 Astra 拆出 `app/web/provider-config.mjs` 并补一行白名单；记入合流须知，不另开单。

**PV-55（②"Compatible endpoint"含义变了）** 接受。目录身份 + 自定义 Base URL 没有失去落点（仍在 catalog 路径的 Advanced，后端 `providerConfig.baseUrl` 未变），变的只是这个入口的含义：它现在登记一条真连接。文案已随之改写，合流时按 copy-convention 复看一遍即可。

**PV-56（③能力原话只出现在生效行）** `GET /provider-connections` 的记录不带 `capability`，所以未知窗口的那句后端原话只能落在生效连接那一行，其余行退到"N models with an unknown context window"这句较弱但为真的话。作者拒绝把后端句子硬编码进前端以免造第二个真相源，是对的。要让每一行都说同一句，须后端按连接给出 capability——登记 **BE-40**，不在本单。

**PV-57（六项完成度）** 冒烟按裁定只留位：`CONNECTION_STEPS` 增 `smoke` 一步、`available:false`、note 写明宿主没有这个端点（BE-39），没有按钮、没有假状态、没有许诺日期——与"一个按不动的按钮和一句还没有说的是同一件事，但前者先许诺再收回"的既有体例一致。三类保存失败全部按后端错误码取文案，未登记的错误码原样转述 host 的话，不塞进三类冒充精度（PV-34 / PV-46 守住）。

**结论：接受（作者验证级），待 PV-53 补丁回来后一并交 Astra 独立验收。** 合流单元按 PV-45 = BE02 + FE01（+ PV-53 补丁），Astra 合 `claude/pvfe01-connections` 一支即带入全部。

## 15. PV-53 补丁复核与批次节点（Fable，2026-09-10）

补丁两提交 `56cfe71` / `84c39a7`，分支头 `84c39a7`。Fable 独立重跑 **462/462，fail 0，exit 0**；读 diff 核实形状与裁定一致：只改 `model-picker.mjs` 一处，标签走连接面既有的 `connectionLabel`（即 `baseUrl` 的 host），第三路请求挂 `.catch(()=>[])` 退回原始 provider 身份，模型行文案、capability 行、搜索字段集全部未动，`conn-` id 仍可搜到。目录组名一字未改。**接受。**

### 批次节点（2026-09-10）

| 单 | 状态 | 头 |
|---|---|---|
| WO-PV-BE02 连接身份与准入 | Fable 复核接受（作者级），456/456 | `e61c9d5` |
| WO-PV-FE01 连接面与模型面消费 | Fable 复核接受（作者级），461/461 | `88e8339` |
| PV-53 分组标签补丁 | Fable 复核接受，462/462 | `84c39a7` |

合流单元按 PV-45 为一支：Astra 合 `claude/pvfe01-connections` 即带入 BE02、FE01 与补丁的全部提交，独立验收（C4 体例）与合流次序归 Astra；合流时另做两件事——按 PV-54 把投影拆成 `app/web/provider-config.mjs` 并补一行静态白名单，按 PV-55 复看"Compatible endpoint"改义后的文案。

PV-24 的验收句在本节点成立：兼容连接的 Base URL、wire 格式、自己的 key、发现来的模型 ID 均可保存、可执行，且 run 记录能回溯到连接 id 与凭据来源。

**留待后续施工**（用户 2026-09-10 "一时难以实现的，留待后续"）：WO-PV-BE01（`google` 准入，已成文待排）、BE-39 冒烟端点（前端已留位）、BE-40 每连接 capability、PV-D1 Vertex ADC、PV-D2 完整网关、PV-D3 BE-38 / BE-28、PV-D4 成本未知表达位、PV-D5 `streamSimple` 路径。



## 2026-09-12 · Model / effort能力精度后续登记

用户要求[统一model入口与逐Provider/model适配](../../../research/chat-memory-broker-2026-09-12/model-adaptation/README.md)，并采用adapter作为上游握手中间层；能力描述由Host校验并登记到已有connection/model owner，再交既有UI projector。对PV-7“Off与目录档位”补充条件：Off必须是该model/API真实支持且可编码的关闭语义；省略值不是Off，reasoning=true或SDK通用梯子不是已握手档位。已有PV连接/verify交付保持，不重复派其已实现功能。

[固定main核查及实施差额](../../../research/chat-memory-broker-2026-09-12/model-adaptation/implementation.md)列出布尔声明→假精确档位、默认medium、陈旧完整配置覆盖，以及SDK effective与Provider实际观察混同风险。后续沿原字段/store/service/Pi adapter/model-picker writer串行补齐；未新编号、未改API/schema，单turn override仍独立后置。
