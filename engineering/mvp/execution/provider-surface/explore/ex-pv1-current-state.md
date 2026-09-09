# EX-PV1 · Provider sur面现状转录

Baseline: `/Users/lesprivilege/Projects/Courtwork` @ `main`，HEAD = `ee6df72`（`git -C ~/Projects/Courtwork log -1 --oneline` 已核实；仅一处未提交改动 `evidence/fe01-main-integration-20260909/wk98-regression.json`，与本探索无关，未触碰）。只读转录，不含设计建议。

## 1. Backend contract table

路由入口：`app/server/index.mjs:98-162`（`routeService`），鉴权：`x-work-token` header 校验于 `app/server/index.mjs:184`（`/bootstrap` 例外）。

| Method | Path | Handler (service.mjs) | 请求体 schema | 响应 schema | 错误码/条件 | Run 期间冻结？ |
|---|---|---|---|---|---|---|
| GET | `/api/v5/provider-models` | `getProviderModels` L277-286 | 无 | `{source:"installed-runtime-catalog", apiFormats:[...API_FORMATS], models:[{id,name,provider,api,contextWindow,maxTokens,reasoning,supportedEfforts,defaultEffort}]}`，过滤 `ALLOWED_PROVIDER_IDS` (L39) | 无自定义错误 | 否（只读） |
| GET | `/api/v5/provider-config` | `getProviderConfig` L667-674 | 无 | `{config:{provider,model,api,baseUrl?,reasoningEffort?}, execution:{mode,realProvider,adapterId}, credentialStatus:"configured"\|"not_configured"}` | 无 | 否（只读） |
| PUT | `/api/v5/provider-config` | `setProviderConfig`→`#setProviderConfig` L683-701 | `{provider,model,api,baseUrl?,reasoningEffort?}`，`assertKeys` 白名单于 `validateProviderDescriptor` L80-109 | 同 GET provider-config | 409 `active_run`(L686) "provider config is frozen during a run"；400 `invalid_provider`(L689/690/692/695，来自 baseUrl 校验 L98/101/106)；400 `invalid_effort`(L697) | 是，`store.hasActiveRun()` 门 L686 |
| PUT | `/api/v5/provider-credential` | `putProviderCredential`→`#putProviderCredential` L703-718 | `{provider, apiKey}`，`assertKeys(["provider","apiKey"])` L708，`apiKey` 长度上限 4000 L711 | `{configured:true, provider}` | 409 `active_run`(L706)；400 `invalid_provider`(L710，非 `ALLOWED_PROVIDER_IDS`) | 是，L706 |
| DELETE | `/api/v5/provider-credential` | `deleteProviderCredential`→`#deleteProviderCredential` L720-733 | `{provider}` | `{configured:false, provider}` | 409 `active_run`(L723)；400 `invalid_provider`(L727) | 是，L723 |
| POST | `/api/v5/provider-models/discover` | `previewProvider(input,'discover')` L153/269-275 | `{protocol:"openai-compatible", baseUrl, apiKey?}`，见 `provider-preview.mjs:15-26` | `{operation,protocol,check:"model-directory",status,message,models:[{id}]}` | 400 `invalid_provider_preview`（`PreviewInputError`，L272） | 否——`provider-preview.mjs` 无 store/runtime 依赖（doc L229-231），不落地任何配置 |
| POST | `/api/v5/provider-connection/test` | `previewProvider(input,'test')` L154 | 同上 | 同上，但 `models` 恒为空数组（`provider-preview.mjs:59`, doc L204） | 同上 | 否 |
| GET | `/api/v5/runtime-info` | `getRuntimeInfo` L371-393 | 无 | 含 `provider: this.getProviderConfig()` 及 capabilities/limits/compaction/recovery | 无 | 否（只读） |
| GET | `/api/v5/bootstrap` | `bootstrap` L259-267，唯一免鉴权路由（`index.mjs:181-183`） | 无 | `{apiVersion,sessionToken,capabilities:{realProvider,mode,externalBrowser}, adapterId}` | 无 | 否 |
| GET | `/api/v5/runtime-control?sessionId=` | `getRuntimeControl` L288-293 | 无 | 含 `resources` 中 `provider:current`/`model:current`/`secret:provider`（见 §4） | 404 `not_found`（sessionId 给了但查不到） | 否（只读） |

`POST /api/v5/sessions/:id/runs`（`createRun`）虽不是 provider 端点本身，但它是 provider 快照被冻结进 Run 的唯一入口，见 §3。

## 2. Runtime registration（`app/runtime/pi-session-runtime.mjs`）

- Provider id 常量：`FAKE_PROVIDER_ID="fake-openai-loopback"` L17，`DEEPSEEK_PROVIDER_ID="deepseek"` L22，`OPENAI_PROVIDER_ID="openai"` L23。`ALLOWED_PROVIDER_IDS` 在 `service.mjs:39` 组装为这三者的 `Set`，是唯一闭集来源。
- `API_FORMATS = ["openai-completions","openai-responses"]`（L24），DeepSeek 的目录 API id 是 `openai-completions`（`service.mjs:38` 常量 `DEEPSEEK_API_ID`，与 `pi-session-runtime.mjs` 的 `FAKE_API_ID` 同值但不同常量对象）。
- `createIsolatedModelRuntime()` L59-81：`ModelRuntime.create({credentials:new InMemoryCredentialStore(), modelsPath:null, refreshOnCreate:false})`——`modelsPath:null` 关闭磁盘目录查找；未传 `allowModelNetwork`，落到 SDK 默认值（false，注释于 L54-56 明示"never refreshes catalogs from the network"）。
- 对 `deepseek`/`openai` 两个 id：从 SDK 内置 provider 读出 `name`/`baseUrl`/`models`（L69-70），用 `createProvider` 重新注册（`registerNativeProvider`, L71-78），`auth:{apiKey:envApiKeyAuth(...)}`（L73，`auth` 只有一种形状：单一 `apiKey` 槽位，来自 pi-ai 的 `envApiKeyAuth` 帮助函数，不是环境变量读取——运行时值由 `modelRuntime.setRuntimeApiKey` 注入，见 §3）。`api` 字段显式列出两个格式各自的 `stream`/`streamSimple` 派发（L74-77），意味着 `model.api` 单独变更不足以切换编解码器，必须走这张表（doc L145-146 也明示这一点）。
- `registerFakeProvider()` L89-99：单模型 `fakeProviderHandle.model`，唯一 api 是 `openai-completions`。
- `getProviderModels`（service.mjs L277-286）暴露给前端的字段集：`id, name, provider, api, contextWindow, maxTokens, reasoning:!!reasoning, supportedEfforts:getSupportedThinkingLevels(model), defaultEffort:clampThinkingLevel(model,"medium")`——均来自 `@earendil-works/pi-ai` 的 `getSupportedThinkingLevels`/`clampThinkingLevel`（导入于 `service.mjs:13`），host 不自行推导。
- Reasoning effort → pi 的映射：`pi-session-runtime.mjs:176` `...(reasoningEffort!==undefined?{thinkingLevel:reasoningEffort}:{})`——直接透传字符串值（`"off"|"minimal"|"low"|"medium"|"high"|"xhigh"|"max"`，白名单见 `service.mjs:89`），无二次转换表。`observeRequestStream` 调用处记录 `requestedEffort:reasoningEffort??null, effectiveEffort:session.thinkingLevel`（L203-204），即请求值与 pi 会话实际生效值分开记录（两者可能不同，例如模型不支持该档位时 pi 内部调整）。

## 3. Persistence

- 凭据文件：`app/server/credential-file.mjs`。路径 `path.join(dataDir,"credentials.json")`（L9）。写入用临时文件 + `rename`（L24-31，原子替换），权限 `0o600`（L28/29）。结构：`{[providerId]: apiKey}` 扁平对象（`setCredential` L33-37, `deleteCredential` L39-49）。无版本号/generation 字段——generation 概念只存在于 `runtime-state.json` 侧（见下）。文件顶部注释（L5-6）明示"独立于 runtime-state.json，从不嵌入 store events 或日志"。
- 运行时状态：`app/server/store.mjs`，文件名 `runtime-state.json`（L248），路径 `path.join(dataDir,fileName)`（L250）。`STATE_KEYS`（L23-26）含 `providerConfig`（单个对象，非数组/表）与 `credentialGeneration`（单调计数器，`number`）。`SCHEMA_VERSION=7`（L22）；schema<7 的记录不含 `reasoningEffort` 字段（`validateDescriptor` L62 条件 `schema>=7`）；升级路径写一份 `runtime-state.schema{N}.{digest}.json` 备份（L299-301，`_persist`/迁移逻辑未在本次读取范围内展开）。
- `providerConfig` 校验：`validateDescriptor`（store.mjs L60-75）——只允许 `provider,model,api,baseUrl?,reasoningEffort?`（`run.provider` 额外允许 `realProvider:boolean`，L62 的 `allowRealProvider` 分支）。这是**唯一一份**当前生效 provider 配置，非表/非数组，无 id 主键、无多条记录能力。
- `credentialGeneration`：`store.mjs:559-566` `bumpCredentialGeneration()`，注释明示"a run freezes the generation it started under, and a restart must not reset it to zero"。每次 PUT/DELETE 凭据成功后 `+1`（`service.mjs:716/731`）。
- Run 级 provider 快照：`store.createRun` 参数 `provider`（`service.mjs:1033-1044`，来自 `service.mjs:996` `{...this.providerConfig, realProvider:...}`）与 `credentialGeneration:this.credentialGeneration`（L1043，冻结当时的计数值）。校验于 `store.mjs:154`（`validateDescriptor(run.provider,"run.provider",{allowRealProvider:true,schema})`）与 L173（`nonNegativeInt(run.credentialGeneration,...)`）。这份快照是逐 Run 持久化的历史记录（`run` 对象整体持久化于 `state.runs`），因此"这次 Run 用的是哪个 provider/model/api/baseUrl/effort/凭据代次"是可回溯的，但仅作为**已完成动作的记录**，不是一个可查询、可重用的连接注册表。
- `state.providerConfig` 被启动时读出/写回：`service.mjs:172-176`——无记录则用 fake provider 默认值初始化并立即持久化。

## 4. Allowlists 与 gates

| 位置 | 条件 |
|---|---|
| `service.mjs:39` | `ALLOWED_PROVIDER_IDS = new Set([FAKE_PROVIDER_ID, DEEPSEEK_PROVIDER_ID, OPENAI_PROVIDER_ID])`——唯一闭集来源，被 `validateProviderDescriptor`(L105-107)、`#putProviderCredential`(L710)、`#deleteProviderCredential`(L727)、`initialize()`(L180)、`getProviderModels`(L282) 共用 |
| `service.mjs:690` | `API_FORMATS.includes(config.api)` 必须是 `["openai-completions","openai-responses"]` 之一 |
| `service.mjs:691-693` | fake provider 必须用 `FAKE_API_ID` 且不带 `baseUrl` |
| `service.mjs:694-696` | DeepSeek 若选 `api!==DEEPSEEK_API_ID` 则必须显式带 `baseUrl`（非目录格式必须有自定义端点） |
| `service.mjs:100-102`（`validateProviderDescriptor` 内联） | `baseUrl` 只允许 `http:`/`https:`，禁止 `username/password/search/hash` |
| `provider-preview.mjs:18-23` | 独立于上表的第二套校验：`protocol` 必须恰为 `"openai-compatible"`；`baseUrl` 正则 `/^https?:\/\//`、禁止空白/`?`/`#`，且 `url.pathname` 会被强制拼接 `/models`（L24）；`apiKey` 若给出必须匹配可打印 ASCII `/^[\x21-\x7e]+$/`，长度≤4096 |
| `service.mjs:1001-1008`（Run 创建时二次校验） | 与 `#setProviderConfig` 同一组约束在**发起 Run 时重新核验一遍**（防止保存后目录/格式漂移），失败返回 503 `provider_unsupported`（不是 400——语义是"当前保存的路由不可用"而非"这次请求非法"） |
| `service.mjs:1010` | `provider.reasoningEffort` 若设置，必须仍在 `getSupportedThinkingLevels(model)` 里，否则 503 `effort_unsupported` |
| `store.mjs:60-75` | 持久化层再校验一次同样字段集（防止绕过 service 层写坏状态文件） |

三层校验（HTTP 输入 → Run 发起时复核 → 持久化层）针对同一个闭集反复出现，但**闭集本身只有一处定义**（`service.mjs:39`），扩展到第二个真实 provider 需要改这一行加其消费点，而非独立注册。

## 5. Telemetry（`app/runtime/request-telemetry.mjs`）

`observeRequestStream`（L11-52）记录字段：

- 有：`elapsedMs`（host 侧观察到的总耗时，L18）、`firstOutputMs`/`firstTextMs`（首个非空 delta / 首个 text_delta 的时间，L32-33）、`context`（序列化请求字符数估算，`estimateRequestContext` L4-9，`method:"serialized-request-utf16-chars-divided-by-4"`，`exact:false`）、`contextWindow`（模型静态值）、`requestedEffort`/`effectiveEffort`（L15）、`usage`（`done` 事件的 `input/output/cacheRead/cacheWrite`，L39，逐字段做 `Number.isSafeInteger`+非负校验，不合格记 `null`）、`observedModel`（provider 实际回报的 `model`，可能与请求的不同，L41）、`phase`（`started/streaming/completed/cancelled/failed/interrupted`）。
- **没有**：`providerTtftMs`（硬编码 `null`，L20）、`decodeTokensPerSecond`（硬编码 `null`，L20）——`missing:['provider_token_timing','token_deltas']` 直接声明这两项不存在（L20）。没有独立的"错误类别"字段：失败只落在 `phase:'failed'`/`'interrupted'`，具体错误文本不记录（`emit('failed',{usage:null,observedModel:null})` 在 catch 分支里连 usage 都清空，L24）。
- 前端消费：`app/web/telemetry-view.mjs` `renderRequestMeasurements`（L18-34）逐字段渲染，`Decode TPS` 行写死文案 `'Unavailable · no token deltas'`（L25），`validMeasurement`（L3-9）拒绝任何 schemaVersion≠1 的记录。落地事件类型 `runtime.request.telemetry`（`service.mjs:1220`，`this.store.appendEvent({runId,type:"runtime.request.telemetry",data})`）——telemetry 是 Run 事件流的一部分，与 usage 统计（`work-usage-details`，见 §6 usage-view）是两条独立管线，互不映射校验。
- Run inspector（`app/web/inspector.mjs`）不直接嵌入 telemetry；`telemetry-view.mjs` 的渲染函数被 runtime-view/inspector 调用方传入 `events` 数组自行过滤。

## 6. Frontend surfaces（`app/web/`）

| 文件 | 读 | 写 | Run-scope 相关文案 |
|---|---|---|---|
| `model-picker.mjs` | `GET /provider-models`+`GET /provider-config`（L19，并发） | `PUT /provider-config`（L63，body 含 `provider,model,api,reasoningEffort`，若 `sameProvider` 则带上现有 `baseUrl`，L60-61） | 固定文案（L70）："Applies to all chats for future runs. Current runs keep their recorded configuration. Credentials and connection settings stay in Models." |
| `settings-view.mjs` | `snapshot`（provider-config 结果）+`catalog`（provider-models 结果），组装于 `createSettingsView`（L340 起）；探测走 `PROBE_ENDPOINT`（L163-166：`test→/provider-connection/test`, `discover→/provider-models/discover`） | `PUT /provider-config`（表单提交，L789-810，body 仅 `provider,model,api,baseUrl?`——不含 effort，与 model-picker 分工）；`PUT /provider-credential`（keySave，未在读取范围内完整摘录但 `keySave`/`keyDelete` 按钮见 L558-567）；`DELETE /provider-credential`（keyDelete） | `lock()`（L719-747）：有 `info?.activeRuns` 或当前会话 `active` 时禁用整个表单/探测按钮，状态行文案 L742-743:"A run is active. Connection and permission changes are available after it ends." |
| `settings-view.mjs`（Connections 列表） | `connectionRows({config,credentialStatus})`（L207-231） | 只读入口，"Configure" 按钮把表单对准同一条（L629-640） | 注释 L204-206（中文）："后端只持有一条生效连接，所以列表只有一行" |
| `runtime-view.mjs` | `resourceById('provider:current')`/`resourceById('secret:provider')`（L2248/2250），渲染只读行 L2259-2272 | 无写入——纯只读镜像 | L2272："The provider does not report an effort value or the values it would accept, so this page cannot state one. Backend request BE-12." |
| `telemetry-view.mjs` | 由调用方传入的 run 事件数组，过滤 `runtime.request.telemetry` | 无写入 | — |
| `usage-view.mjs` | `GET /work-usage-details`（L10）、`POST /work-usage-runs`（drill-down，L16），两者都要求 `snapshotId` 一致（防止跨快照拼数据，L11/18） | 无写入；`label()`（L23）区分 `route==='custom'` 时附加 `route {key.slice(0,6)}` | `data.missing` 前缀 `'≥ '`（L50/74/79）标注"不完整核算" |
| `inspector.mjs` | Run 详情 `run.provider`（可能是 legacy 字符串或对象，L245 有 `typeof`兼容分支）、`run.credentialGeneration`（L253） | 无写入 | — |

`model-picker.mjs` 与 `settings-view.mjs` 两处都能 `PUT /provider-config`，字段集不完全相同（前者带 effort 不带非同provider的baseUrl逻辑更简，后者是完整表单不带 effort），两者共享同一后端端点与同一份 `snapshot` 语义但各自维护独立的本地 state（各自的闭包变量），互不订阅对方的变更（各自 `onSaved`/`onConfig` 回调各自处理）。

## 7. Tests 与 docs

| 文件 | 覆盖内容 |
|---|---|
| `app/tests/credentials.test.mjs`（175行） | T-CRED-1（缺凭据不读 HOME/.pi 失败）、T-CRED-2（API 写入凭据端到端不泄漏）、T-CRED-3（继承的 `DEEPSEEK_API_KEY` 环境变量启动时被剥离并记日志）、T-CRED-4（Run 期间 PUT/DELETE 返 409，Run 用旧凭据跑完，`credentialGeneration` 验证冻结语义，见上方引用）、T-CRED-5（sentinel `~/.pi/agent/auth.json` 与 env var 均不作为凭据来源） |
| `app/tests/provider-preview.test.mjs`（103行） | `provider preview HTTP contract, bounds, authentication and unchanged runtime` 单测覆盖 discover/test 两操作的 HTTP 契约、边界与"不改变运行时状态" |
| `app/tests/models-connections.test.mjs`（189行） | 前端 `settings-view.mjs` 导出的三条 path 闭集校验、`connectionPathOf` 反推逻辑、Connections 列表只列一条、探测控件的可用路径限定（`PROBE_PATHS`）、探测请求体逐字段校验、结果原样呈现（不改写 status/message）、discover 出的模型 ID 不进 Model 下拉/不进保存配置、MCP 与 provider 共享六步形态、以及一条侧栏宽度回归（WK-105 ⑤，与本主题无关） |
| `app/tests/provider-protocol.test.mjs`（75行） | HTTP 层 body 读取（`req` chunks）与 mode 路由测试（`req.url.split('/')[1]`），偏协议边界 |
| `app/docs/runtime-foundation.md` | §"API selection and cache continuity"（L123-160）：真实 provider 闭集是 `openai`/`deepseek`，`PUT /provider-config` 字段集，DeepSeek 非目录格式必须显式 baseUrl，"配置/凭据变更/Run 准入共享一个队列，选定配置在 Run 期间冻结"（L142-143）；§"Unsaved provider preview (BE-17/18)"（L176-236）：discover/test 完整契约、status 表、"帮助函数无 store/ModelRuntime/credential-file 依赖"（L229-231）、"保存任意 compatible/local provider 并绑定执行仍不被现有 allowlist 支持，本次交付不closes完整 FE-02 connection journey"（L234-236，原文已自陈这是未完成状态） |

## 8. Gap 表：现状 vs. 第二个真实 provider + 多重同时连接

| 对象 | 今天存在什么 | 第二 provider / 多连接缺什么 | 证据 |
|---|---|---|---|
| **Provider identity** | 闭集 `Set` 三元素（`fake-openai-loopback`,`deepseek`,`openai`），硬编码于一处常量；`providerConfig` 是**单个**对象而非表 | 无注册表/无 id 主键集合；新增 provider 需要改 `ALLOWED_PROVIDER_IDS` 源码常量并在 `pi-session-runtime.mjs` 里新增一段 `registerNativeProvider` 调用（当前只对 `[DEEPSEEK_PROVIDER_ID,OPENAI_PROVIDER_ID]` 两个 id 做循环注册，L68）；没有"同时保存多个 provider 身份，选一个生效"的模型——`state.providerConfig` 结构本身是单值 | `service.mjs:39`; `store.mjs:33`(`providerConfig:null`，单值初始化); `pi-session-runtime.mjs:68-79` |
| **Auth** | 单一形状：每 provider 一个 `apiKey` 字符串，存于扁平对象 `{[providerId]:apiKey}`；`auth:{apiKey:envApiKeyAuth(...)}` 是 pi-ai 库对 `createProvider` 唯一接受的认证方式 | 无 OAuth/无 mTLS/无多组凭据（例如同一 provider 下两个不同 key 的场景不可表达，因为 key 以 `providerId` 为**唯一**索引，`credential-file.mjs:35` `entries[provider]=apiKey` 会覆盖前一个）；无"per-connection"凭据——凭据与 provider id 绑定，不与"某条连接"绑定 | `credential-file.mjs:33-37`; `pi-session-runtime.mjs:73` |
| **Model catalog/capabilities** | `ModelRuntime.create({modelsPath:null, refreshOnCreate:false})`——纯内存、不联网刷新的安装期快照；`getProviderModels()` 只过滤已注册 provider 的模型；`provider-models/discover` 探测端点**不落地**任何发现结果（`provider-preview.mjs` 无 store 依赖，doc L229-231 明示） | 无目录刷新机制（`allowModelNetwork` 未显式设置，落到 SDK 默认 false，L54-56 注释自陈）；discover 出的模型 ID 明确"不加入 Model 列表也不保存"（`models-connections.test.mjs:167` 标题即此结论，`runtime-foundation.md:231-232` 复述）；没有"自定义模型 ID"路径——`validateProviderDescriptor` 要求 `model` 必须命中已装目录（`service.mjs:689` `if(!catalogModel) throw ...`） | `pi-session-runtime.mjs:59-64`; `provider-preview.mjs:1`（文件头注释"Ephemeral directory probes deliberately have no runtime/store/credential dependencies"） |
| **Wire transport** | 两种 API 格式常量（`openai-completions`/`openai-responses`），每种有固定的 `stream`/`streamSimple` 派发表（`pi-session-runtime.mjs:74-77`）；`baseUrl` 可覆盖但仅限 http/https、无 query/fragment/userinfo | 无自定义 header／无认证头策略选择（doc L136-137 自陈"it does not accept custom headers, alternate auth-header policies, custom model IDs or compat overrides. Gateways requiring those options are outside this interface"）；无第三种协议格式；一次只有一条"生效连接"在 `providerConfig` 里，没有"多个连接并行持有健康状态"的数据结构——`control-plane.mjs:169-171` 里 `provider:current`/`model:current`/`secret:provider` 都是**单数**资源 id（不是按连接 id 参数化的集合），意味着 runtime-control 视图结构上假设只有一条连接 | `runtime-foundation.md:136-137`; `control-plane.mjs:169-171` |

**Per-connection health timestamps**：当前唯一接近"健康"概念的是 `credentialStatus:"configured"\|"not_configured"`（`service.mjs:672`，布尔式，无时间戳）与探测端点的即时 `status`（`ok`/`authentication_failed`/...，非持久化——探测结果只活在前端一次 `probeReading` 渲染里，`settings-view.mjs:424-437`，刷新页面即丢失，见 `runProbe` 无任何持久化调用 L448-475）。没有"上次连接成功于何时"这类字段落在 `runtime-state.json` 或 `credentials.json` 任何一处。
