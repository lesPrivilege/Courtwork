# EX-PV2：参考实现剖析（provider / auth / catalog / transport）

作者：Sonnet　仲裁：Fable（主会话）　只读 explore，未修改任何仓库。

来源与权威顺序：
1. `@earendil-works/pi-ai` / `@earendil-works/pi-agent-core` 0.85.1（Courtwork 固定版本），路径 `/Users/lesprivilege/Projects/Courtwork/app/node_modules/@earendil-works/`，读 `dist/*.js`+`dist/*.d.ts`+`README.md`。
2. 本地 fork `/Users/lesprivilege/Projects/Motto`（本次未使用，dist 可读，未触发降级）。
3. DeepSeek Harness `/Users/lesprivilege/Projects/motto-dsh/packages/llm/llm-pi-ai`、`llm-deepseek`、`llm`。

未接触任何凭证文件；未见 `~/.pi/agent/auth.json` 或其他凭证文件路径。

---

## A. pi-ai 0.85.1：provider 记录、auth 声明、catalog 装配、wire API 清单

### A.1 Provider 记录字段

`Provider<TApi>` 接口（`dist/models.d.ts:58-95`）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | provider 唯一键 |
| `name` | `string` | 展示名 |
| `baseUrl?` | `string` | provider 级默认端点，仅展示/兜底，实际请求走 `Model.baseUrl` |
| `headers?` | `ProviderHeaders` | provider 级默认头 |
| `auth` | `ProviderAuth` | **必需**，见 A.2 |
| `getModels()` | `() => readonly Model<TApi>[]` | 同步、不可抛错的当前模型表 |
| `refreshModels?` | 动态 provider 用 | 见 A.3 |
| `filterModels?` | 按凭证过滤模型 | |
| `stream`/`streamSimple`/`fetchDeferred?`/`cancelDeferred?` | 传输实现 | |

`Model<TApi>` 记录（`dist/types.d.ts:716-737`）：`id, name, api, provider, baseUrl(必需，每模型自带), reasoning, thinkingLevelMap?, input, cost, contextWindow, maxTokens, samplingParams?, headers?, compat?`。注意 `baseUrl` 是**模型级**字段而非仅 provider 级——`dist/types.d.ts:721`。

### A.2 Auth 声明种类

`ProviderAuth`（`dist/auth/types.d.ts:227-230`）＝ `{ apiKey?: ApiKeyAuth; oauth?: OAuthAuth }`，至少一项必需，"即使 ambient-credential provider 和无密钥本地服务器也要提供 apiKey 认证，其 resolve() 报告是否已配置"（同文件 222-226 行注释）。

- **`envApiKeyAuth(name, envVars)`**（`dist/auth/helpers.d.ts:8`）：标准 key 认证——已存凭证优先，否则取第一个已设置的环境变量；例如 `providers/google.js:10`：`envApiKeyAuth("Gemini API key", ["GEMINI_API_KEY"])`。
- **自定义 `ApiKeyAuth`（ambient/ADC）**：Google Vertex 在 `providers/google-vertex.js:10-84` 手写 `vertexAuth`，`resolve()` 依次尝试 `credential.key`→`GOOGLE_CLOUD_API_KEY`→（`GOOGLE_APPLICATION_CREDENTIALS` 或默认路径 `~/.config/gcloud/application_default_credentials.json` 文件是否存在）+`GOOGLE_CLOUD_PROJECT`/`GCLOUD_PROJECT`+`GOOGLE_CLOUD_LOCATION`（`google-vertex.js:59-83`）。Amazon Bedrock 同理解析 `AWS_PROFILE`/access key/`AWS_BEARER_TOKEN_BEDROCK`/ECS task role/web identity token（README.md:457）。
- **`lazyOAuth({name, isSubscription?, loginLabel?, load})`**（`dist/auth/helpers.d.ts:16-21`）：包装动态导入的 `OAuthAuth`，例如 `providers/xai.js:13-18` 的 `xAI (Grok/X subscription)`。`OAuthAuth` 接口本身含 `login/refresh/toAuth`（`dist/auth/types.d.ts:202-221`）。
- **headers 型**：`ProviderRequestOptions.headers`（`dist/types.d.ts:86`）允许显式头覆盖，Cloudflare 等用它做租户端点替换（README.md `tenantStreams` 示例）。

`ModelAuth`（请求级解析结果）只有三个字段：`apiKey?, headers?, baseUrl?`（`dist/auth/types.d.ts:6-10`），"若某值无法表示为 apiKey/headers/baseUrl，它是 provider 配置，不是 auth"（同文件注释第 4-5 行）。

### A.3 Catalog 装配

- **静态内置 catalog**：`dist/providers/data/*.json`（39 个 provider 各一份，例如 `providers/data/google.json`、`google-vertex.json`），由 `providers/<id>.models.ts` 通过 `flattenModelCatalog`（`dist/model-catalog.d.ts:15`）转成类型化的 `XXX_MODELS` 常量；`dist/models.generated.js`（82 行）把所有 provider 的模型表汇总为顶层 `MODELS` 常量，供 `getBuiltinModel/getBuiltinModels/getBuiltinProviders`（`providers/all.js:48-65`）读取。
- **on-disk models store**：`ModelsStore` 接口（`dist/models-store.d.ts:18-22`，`read/write/delete`）与默认 `InMemoryModelsStore`；`CreateModelsOptions.modelsStore`（`dist/models.d.ts:155`）允许应用注入持久化存储；`ModelsStoreEntry` 携带 `lastModified/checkedAt/etag`（`dist/models-store.d.ts:2-13`）用于 HTTP 校验。
- **网络刷新标志**：`ModelsRefreshOptions{ allowNetwork?, providers?, force?, signal? }`（`dist/models.d.ts:29-36`）；`RefreshModelsContext.allowNetwork`（false 表示离线/仅缓存初始化）、`force?`（跳过新鲜度检查）（`dist/models.d.ts:12-28`）。README.md:1131-1140 说明 `Models.refresh()` 在未传 signal 时无界，provider 必须自行遵守 signal。
- 静态 provider 对 `refresh()` 是 no-op（README.md:321）。

### A.4 Wire API 清单（`dist/api/*` 模块路径）

`KnownApi`（`dist/types.d.ts:15`）＝ `openai-completions | mistral-conversations | openai-responses | azure-openai-responses | openai-codex-responses | anthropic-messages | bedrock-converse-stream | google-generative-ai | google-vertex | pi-messages`（`Api = KnownApi | (string & {})`，允许任意字符串扩展）。

| API id | 实现模块（.js，均有对应 `.lazy.js`） |
|---|---|
| `openai-completions` | `api/openai-completions.js` |
| `openai-responses` | `api/openai-responses.js`（+ `openai-responses-shared.js`） |
| `azure-openai-responses` | `api/azure-openai-responses.js` |
| `openai-codex-responses` | `api/openai-codex-responses.js` |
| `anthropic-messages` | `api/anthropic-messages.js` |
| `bedrock-converse-stream` | `api/bedrock-converse-stream.js` |
| `google-generative-ai` | `api/google-generative-ai.js`（+ `google-shared.js`） |
| `google-vertex` | `api/google-vertex.js`（+ `google-shared.js`） |
| `mistral-conversations` | `api/mistral-conversations.js` |
| `pi-messages` | `api/pi-messages.js` |
| 图片 | `api/openrouter-images.js`（`KnownImagesApi`） |
| 其他工具模块 | `api/cloudflare-ai-binding.js`, `api/cloudflare.js`, `api/constrained-sampling.js`, `api/github-copilot-headers.js`, `api/openai-prompt-cache.js`, `api/simple-options.js`, `api/transform-messages.js` |

README.md:1180-1197 的"Calling API Implementations Directly"表格与上表一致，列出 9 个可独立调用的 `stream/streamSimple` 模块（不含 `pi-messages`，后者未在该表出现）。

---

## B. 新增 provider 的成本：google / google-vertex(ADC) / 自定义 OpenAI 兼容网关

| 场景 | 配置 or 代码 | 必需字段 | catalog 免费获得 | 凭证路径 |
|---|---|---|---|---|
| (a) `google`：Gemini API key，原生 API | **纯配置**（若走 Courtwork/DSH 现有 `createModels`+`builtinProviders()` 路径，直接复用内置 `googleProvider()`；若要接入自建 `Models` 集合，一行 `models.setProvider(googleProvider())`） | 设置环境变量 `GEMINI_API_KEY`，或存入 `CredentialStore`（`type:'api_key', key:'...'}`） | `GOOGLE_MODELS`（`providers/data/google.json`，含 `gemini-2.5-pro/flash/flash-lite`、`gemini-3.x`、deep-research 等全部字段：cost/contextWindow/maxTokens/thinkingLevelMap） | `envApiKeyAuth` 存储凭证优先，否则 `GEMINI_API_KEY`（`providers/google.js:5-14`；README.md 表 `Environment Variables`第415行） |
| (b) `google-vertex`：ambient credentials (ADC) | **纯配置**，内置 provider 已实现 ADC；无需代码改动 | 二选一：①`GOOGLE_CLOUD_API_KEY`；②ADC 文件存在（`GOOGLE_APPLICATION_CREDENTIALS` 或 `~/.config/gcloud/application_default_credentials.json`）+ `GOOGLE_CLOUD_PROJECT`(或`GCLOUD_PROJECT`) + `GOOGLE_CLOUD_LOCATION` | `GOOGLE_VERTEX_MODELS`（`providers/data/google-vertex.json`），`baseUrl` 模板 `https://{location}-aiplatform.googleapis.com` 由 API 层在请求时替换 `{location}` | `vertexAuth.resolve()`：`google-vertex.js:59-83`；README.md:1552-1568 给出 `gcloud auth application-default login` 后设 `GOOGLE_CLOUD_PROJECT`/`GOOGLE_CLOUD_LOCATION` 的操作步骤 |
| (c) 自定义 OpenAI 兼容网关（任意 base URL） | **消费方代码**（不改 pi-ai 源码，但要在调用方写 TS）：`createProvider({id, baseUrl, auth, models, api: openAICompletionsApi() 或 openAIResponsesApi()})` + `models.setProvider(...)`。README.md:1027-1075 给出 3 个范例（`ollama`/`my-proxy`/`my-gateway`混合 API） | 每个 `Model` 记录需完整字段（`id,name,api,provider,baseUrl,reasoning,input,cost,contextWindow,maxTokens`），`auth` 至少给出 `apiKey`（可用 `envApiKeyAuth` 或自写 `resolve: async()=>({auth:{}})` 表示无密钥） | **不获得**任何内置 catalog（`getBuiltinModel/getBuiltinModels`对未注册 id 返回空，`providers/all.js:60-65`）——模型元数据须手工列出；`compat` 未设时按 `baseUrl` 自动探测（README.md:735、"If not set, auto-detected from baseUrl"） | 由该 provider 自定义 `ApiKeyAuth.resolve` 决定；典型走 `envApiKeyAuth` |

关于「成为**内置** known provider」（写进 pi-ai 自身的 `KnownProvider`/`src/providers/<id>.ts`）则是**代码变更**，且是对 pi-ai 上游仓库的变更，不是 Courtwork/下游消费者能单独完成的：README.md:1622-1707「Adding a New Provider」列出跨 `src/types.ts`、`src/api/<api-id>.ts`、`scripts/generate-models.ts`、`src/providers/<id>.ts`、`src/providers/all.ts`、`test/`、`../coding-agent/`、`README.md`、`CHANGELOG.md` 八项改动，且要求注册进 `builtinProviders()` 数组（`providers/all.js:67-105`）。DeepSeek Harness 的应对方式是不新增内置 provider，而是在消费侧用 `createProvider`/route 配置描述任意网关（见 C 节）。

**ADC 在 0.85.1 是否支持**：支持，且是标准路径，证据见 B(b) 行与 `google-vertex.js:59-83`、README.md:457/1552-1568——不存在"0.85.1 不支持 ambient credentials"的情况。

---

## C. DeepSeek Harness `llm-pi-ai`：provider/model 拆分与增量

路径：`/Users/lesprivilege/Projects/motto-dsh/packages/llm/llm-pi-ai/src/`（`catalog.ts` 546 行, `provider.ts` 192 行, `config.ts` 372 行, `replay.ts` 249 行, `adapter.ts` 366 行）。

### C.1 registry 形状：route（provider）与 model 两层，且以"覆盖内置 catalog"为核心机制

`catalogProvider(id)` 只读内置 `Provider` 索引（一次性 `builtinProviders()` 构建的 `Map`，`catalog.ts:114-134`）；`resolveRouteModels(request: RouteCatalogRequest)`（`catalog.ts:446-546`）把「settings.yaml 里一条 route 配置」与「内置 catalog 默认值」逐字段合并——**这是相对 pi-ai 的真正新增**：pi-ai 本身没有"部分覆盖内置模型字段"的机制，`createProvider` 只能整体替换 `models` 列表。Harness 的合并策略：
- 未配置 `models` → 用内置 catalog 的全部模型，逐个套用 `modelOverrides[id]`（`catalog.ts:480-482`）；
- 每个模型字段独立回退链：`entry字段 ?? base(内置)字段 ?? route.defaultXxx`（如 `contextWindow`，`catalog.ts:510`；`maxTokens`，514；`input`，533）；
- `id` 冲突、空 `id`、`modelOverrides` 引用不存在的 id 等在装配期即报错（"an unserviceable route fails while its configuration is being resolved" —— 模块头注释 `catalog.ts:8-10`）。

`provider.ts` 的 `buildProvider(spec)`（167-192 行）二选一：① route 使用内置 catalog 协议时，`reuseCatalogProvider(base, spec)`（144-159 行）**复用**内置 `Provider` 的 `stream/streamSimple`（委托调用，144-159 行注释："Delegated rather than copied … an implementation holding state on itself keeps working"），只替换 `id/name/baseUrl/auth/getModels`；② route 显式指定/覆写协议（`spec.api`）或 pi-ai 未内置该 provider 时，走 `createProvider()`+`PROTOCOLS`表（47-51 行，仅列 `openai-completions/openai-responses/anthropic-messages` 三种——Bedrock/Vertex/Azure/Codex 因签名/ADC/OAuth 复杂度被显式排除，`provider.ts:35-45` 注释说明）。

### C.2 能力元数据（capability metadata）

`catalog.ts` 定义了三组"drift gate"（`Record<PiAi枚举, true>` 全量映射，编译期检测 pi-ai 升级新增/删除的字面量，`catalog.ts:42-45, 69-77, 100-109`）：`MODALITY_GATE`（`text/image`）、`THINKING_LEVEL_GATE`（`off/minimal/low/medium/high/xhigh/max`）、`THINKING_FORMAT_GATE`（`openai/deepseek/openrouter/together/zai/qwen/string-thinking/ant-ling`，主动排除 `chat-template/qwen-chat-template` 两种"走 chatTemplateKwargs"的格式，`catalog.ts:86-92`）。这些是 pi-ai 本身没有的**配置契约层**：pi-ai 只是把这些值定义为类型，不做"未声明字段代表什么"的策略决定；`resolveModelReasoning()`（`catalog.ts:315-369`）明确了一条 pi-ai 语义不对称之处并做归一化处理——"pi-ai 自身默认行为不对称：对 5 个基础等级，缺失 key 代表'支持'；对 xhigh/max，缺失代表'不支持'"（注释 305-306 行），Harness 强制配置侧显式声明每一级，消解了这个不对称。

### C.3 per-turn snapshot / replay 语义

`replay.ts`（249 行）定义 `PiAiReplayResponse{kind:'pi-ai', version:2, api, provider, model, responseModel?, responseId?, stopReason}` + `PiAiReplayBlock`（按内容块存 `textSignature/thinkingSignature/redacted/thoughtSignature`），用于"在后续请求中重建一条 pi-ai assistant message"（模块头注释 3-6 行）。这是 pi-ai `AssistantMessage`/`Context` 之外的持久化层——pi-ai 本身不提供跨请求重放协议，只提供当次请求的 `Context`/`AssistantMessage` 类型（`dist/types.d.ts`）。`emptyPiUsage()`（`replay.ts:55+`）构造零用量的历史消息占位，说明重放路径不重新计费。

### C.4 凭证分离（credential separation）

`provider.ts` 头注释明确分工（14-17 行）："Credentials never reach this module's storage: the harness resolves a route's key through `ctx.credentials` before the request enters pi-ai and hands it over as a stream option, which `Models` presents to `resolve()` as the credential key."

- `harnessApiKeyAuth(name)`（`provider.ts:77-85`）：不做任何 env/文件解析，只把上游已解析好的 `credential.key` 透传进 `ModelAuth.apiKey`——真正的密钥获取（环境变量/密钥管理）发生在 `ctx.credentials`（`@deepseek-ai/dsh-credentials` 包，`config.ts:19-20` 导入 `credentialRef`），属于 Harness 自己的凭证子系统，pi-ai 只在请求时刻收到一个字符串。
- `routeAuth(spec, catalog)`（`provider.ts:131-135`）：若 route 复用内置 catalog 且该 catalog **没有** `apiKey` 方法（0.85.1 内置里只有 `openai-codex` 是纯 OAuth，`catalog.ts` 未直接列出但 `provider.ts:118-126` 注释指明），则叠加 `harnessApiKeyAuth`，否则保留 provider 原生 ambient 发现（ADC/AWS profile 等）不受影响——"这保留了 provider 原生的 ambient 凭证发现能力"（`provider.ts:112-116` 注释）。
- 配置层 `apiKeyEnv?: CredentialRef`（`config.ts:67, 151`）只存**凭证引用**（环境变量名），从不落盘密钥本身（`config.ts:19` 用 `credentialRef()` 校验）。

这是相对 pi-ai `CredentialStore`（`dist/auth/types.d.ts:57-79`，一 provider 一凭证、`modify()` 串行读改写）的一个真正架构选择：Harness **不使用** pi-ai 的 `CredentialStore`/OAuth store，而是每请求现场注入 key（`provider.ts:80-84` 的 `resolve` 直接从传入的 `credential` 读，不做刷新/落盘）。`catalog.ts:150-158` 注释也说明"OAuth-only provider 在此适配器下无法认证，因为适配器不持有 OAuth store"。

### C.5 错误类

`@deepseek-ai/dsh-llm`（`packages/llm/llm/src/error.ts`）定义 `HarnessError extends Error`，带机器可路由的 `code`（13-21 行）；`adapter-failure.ts` 的 `normalizeLlmFailure()`（16-28 行）把任意 adapter 抛出值归一化为 `{message, code}`（跨包复制时用 own-property 快照校验，`ownFailureSnapshot`/`failureSnapshot`，50-88 行，防止 `instanceof` 失效后被伪造字段欺骗）；预定义的 provider 中立错误码：`CONTEXT_WINDOW_EXCEEDED`（25 行）、`QUOTA`（28 行）、`EMPTY_RESPONSE`（39 行，pi-ai 有些 provider 会返回零内容块的正常终止，Harness 把它归类为失败而非空消息）、`INVALID_CREDENTIAL`（48 行，区别于"缺失"，"凭证提供了但不可用"）。这些都是 pi-ai `ModelsError`（`dist/models.d.ts:5`，仅 `"oauth"|"auth"` 两种 code，`dist/auth/resolve.d.ts` 未展开阅读）之外的、provider-中立的分类体系——**genuine addition**，非重新导出。`isContextWindowExceededError`/`isQuotaExceededError`（`error.ts:80-100`）是基于正则的错误文案分类器，用于把不同 provider 五花八门的报错文案统一映射到上述 code，pi-ai 没有这层。

### C.6 小结：re-export vs 新增

| 维度 | pi-ai 提供 | llm-pi-ai 新增 |
|---|---|---|
| provider 身份/auth/stream | 直接复用（`catalogProvider`/`base.stream`委托） | route 抽象、按需 `createProvider`重建 |
| 模型元数据 | 静态 catalog JSON | 逐字段覆盖合并 + drift gate 编译期校验 |
| 凭证 | `CredentialStore`+OAuth store（未使用） | 现场传值、`CredentialRef`引用分离、ambient 发现保留 |
| 错误 | `ModelsError{code:"oauth"\|"auth"}` | `HarnessError`+多个 provider 中立 code + 正则分类器 |
| 重放 | 无 | `PiAiReplayResponse/Block` 版本化信封 |

---

## D. 三条外部研究笔记声明的独立核实

### D1. "Google 于 2026-06-18 停止消费级 Gemini CLI 的 Login with Google 路径，并迁移到 Antigravity" —— **verified**

官方来源：`https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals`（WebFetch 抓取，2026-09-10）。原文（英文，逐句照录用于核对，未整段翻译）：
> "Starting June 18, 2026, Gemini Code Assist IDE extensions stopped serving requests for the Gemini Code Assist for individuals, Google AI Pro, and Google AI Ultra tiers."
> 用户"can no longer use the **Login with Google** option to access the IDE extensions or Gemini CLI."
> "Users of Gemini Code Assist consumer accounts on both Gemini Code Assist IDE extensions and Gemini CLI can migrate to the [Antigravity family of products]."

日期（2026-06-18）、机制（Login with Google 路径关停）、去向（Antigravity）三点均与官方页面一致。Enterprise/Standard 订阅不受影响（同页）。

### D2. "Gemini CLI 条款规定：第三方软件借助其 OAuth 访问后端服务属于禁止行为" —— **verified**

来源：`https://geminicli.com/docs/resources/tos-privacy/`（Google 官方 Gemini CLI 文档站，WebFetch 抓取）。原文：
> "Directly accessing the services powering Gemini CLI (for example, the Gemini Code Assist service) using third-party software, tools, or services (for example, using OpenClaw with Gemini CLI OAuth) is a violation of applicable terms and policies."

并注明违反者"may be grounds for suspension or termination of your account"。该条款未指名某一份具体子文档（不是单一"Terms of Service"文件里的一条款项，而是该说明页面自身的表述，援引"applicable terms and policies"这一统称），但确系 Google 官方页面文本，与笔记表述的实质一致。另有 gemini-cli 仓库维护者 `jackwotherspoon` 在 GitHub Discussion #20632 的表述作为佐证（措辞近乎相同），但该 discussion 帖不是条款原文，故以 `geminicli.com/docs/resources/tos-privacy/` 页面文本为准。

### D3. "pi 把 Vertex 当作 ambient-credential provider，`gcloud auth application-default login` + project/location 是标准路径" —— **verified**

本地代码直接证实，见 B 节 (b) 行与 A.2：`dist/providers/google-vertex.js:59-83`（`vertexAuth.resolve()` 的 ADC 分支）、`dist/providers/google-vertex.js:4`（`VERTEX_ADC_PATH = "~/.config/gcloud/application_default_credentials.json"`）、README.md:1552-1568（"Vertex AI models support either a Google Cloud API key or Application Default Credentials (ADC)"，并给出 `gcloud auth application-default login` 的操作示例）。未见任何版本差异提示（changelog 未检索），0.85.1 dist 中该逻辑完整存在，不存在"0.85.1 不支持"的反例。

---

（全文完，未提出任何设计建议。）
