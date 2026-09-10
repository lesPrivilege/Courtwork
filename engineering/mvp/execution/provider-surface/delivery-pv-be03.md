# 交付 WO-PV-BE03：开放准入与接入回执

作者：Claude Sonnet 5（本单唯一 writer）。作者验证，非独验；独验与合流归 Fable/Astra。
日期：2026-09-10。树：`/private/tmp/se-agent-pvbe03`，分支 `claude/pv-be03-open-admission`。
全程 local-fake / loopback，未联网，未读取任何凭据文件（包括 `~/.pi/agent/auth.json`）。

## 1. 基线与提交

| 项 | 值 |
|---|---|
| 基线 SHA | `9c8b64e85e1b4a906dcd23cd5be621da1ba90638`（工单所写基线，与本树 `main` 头一致） |
| 分支 | `claude/pv-be03-open-admission` |
| 分支头（作者验证跑在此 SHA） | `c419ec71895279380d3933b111ff96d399280df9` |

### 1.1 commit 表

| SHA | 标题 |
|---|---|
| `3f2ec27` | `feat: add schema 12 for provider config version, verify receipts, and reasoning tri-state` |
| `998ee8c` | `feat: register a catalog connection's extra models onto its native provider id` |
| `cba91d3` | `feat: unify model admission and add the BE-39 connection verify endpoint` |
| `688b259` | `docs: record schema 12 and the WO-PV-BE03 open admission / verify contract` |
| `c419ec7` | `test: cover open admission, reasoning tri-state, and BE-39 verify; update schema-12 fixtures` |

全部提交使用显式路径 `git add`，无一处 `git add -A`。未合并、未推送。

## 2. 改动文件

| 文件 | 性质 | 做了什么 |
|---|---|---|
| `app/server/provider-fields.mjs` | 改 | `normalizeProviderReasoning`（PV-61 三态：`true`/`false`/`null`，缺省 `null`）；`validateModelEntry` 接受可选 `reasoning` |
| `app/server/provider-connections.mjs` | 改 | `publicConnection`/`registrationInput` 消费 `reasoning`；新增 `registrationExtras`（目录连接额外模型的 pi 注册形状）与 `validateCatalogConnectionInput`（目录连接 PUT 只接受 `{models}`） |
| `app/server/store.mjs` | 改 | schema 11 → 12：`providerConfigVersion`（单调计数，`providerConnections`/`providerConfig` 任一写入即 +1）、`providerVerifications`（回执账本，`setProviderVerification`/`getProviderVerification`）；`validateConnections` 按 schema 门控 `reasoning` 字段；迁移时给旧连接的模型补 `reasoning: null` |
| `app/runtime/pi-session-runtime.mjs` | 改 | 按 `ModelRuntime` 实例（`WeakMap`）而非模块级单例捕获原生目录模板；新增 `registerCatalogExtraModels`（目录连接额外模型的注册，见 §4）、`nativeCatalogModelIds`（影子校验用）、`classifyVerifyOutcome`（PV-62 分类器，见 §5.2） |
| `app/runtime/fake-provider.mjs` | 改 | 新增两个仅测试可触发的分支：请求的 `model` 以 `unknown-` 开头恒 404（与 prompt 无关，因为 verify 的 prompt 固定）；连接的 key 等于 `FIXTURE_WRONG_KEY` 恒 401 |
| `app/server/service.mjs` | 改 | 新增私有 `#admissibleModel`，`#setProviderConfig`、`#createRun`（含此前硬编码 `FAKE_MODEL_ID` 的 fixture 分支）与新端点三处共用同一判据；`#saveProviderConnection` 对目录连接分流到新 `#saveCatalogConnectionModels`；`initialize()` 在原生注册后重注册全部目录连接的额外模型；`getProviderModels()` 新增 `origin`/`reasoningSource`；`#publicConnection` 新增 `lastVerification`；新增 `verifyProviderConnection`/`#verifyProviderConnection`（PV-62/BE-39） |
| `app/server/index.mjs` | 改 | `POST /api/v5/provider-connections/:id/verify` 一条路由 |
| `app/docs/runtime-foundation.md` | 改 | 新增 "WO-PV-BE03: open admission and verify" 一节；`/provider-models`、连接记录字段表补充新字段 |
| `app/README.md` | 改 | schema 段落更新到 v12；修正一处过期注释（`credentials.json` 早在 WO-PV-BE02 起已按连接 id 键，README 仍写着旧的 provider id） |
| `app/tests/provider-open-admission.test.mjs` | 新增 | 8 条用例，见 §6 |
| `app/tests/provider-connections.test.mjs`、`app/tests/review-provider-publication-migration.test.mjs`、`app/tests/async-recovery-independent.test.mjs`、`app/tests/async-tasks.test.mjs`、`app/tests/attention-agent.test.mjs`、`app/tests/control-plane.test.mjs`、`app/tests/coordination.test.mjs`、`app/tests/durability.test.mjs`、`app/tests/request-telemetry.test.mjs`、`app/tests/run-lineage.test.mjs`、`app/tests/runtime.test.mjs` | 改 | schema 12 波及：手工构造的连接/模型 fixture 补 `reasoning` 字段；每处 schema 降级模拟补删 `providerConfigVersion`/`providerVerifications`（新增字段，不删就不是真的旧字节）；`schemaVersion` 断言与"旧宿主拒绝"的错误消息正则从 11 改到 12。全部是契约更新，无一处放宽断言（见 §8① 的详细说明） |

未改：`app/web/**`、`app/core`、`app/extensions`、`domains`、`brand`、`intake.md`、任何 `contracts/*`。

## 3. 准入判据前后对照

| | 改动前 | 改动后 |
|---|---|---|
| `#setProviderConfig` | 兼容连接：`connection.models.some(...)` 与 `modelRuntime.getModel(...)` 两次独立检查；目录连接：只有 `getModel` | 两类连接统一走 `#admissibleModel(connection, modelId)`：兼容连接仍先查自己的列表，再 `getModel`；目录连接只 `getModel`（因为额外模型已在保存时注册进 pi，见 §4） |
| `#createRun`（兼容/目录分支） | 同上两次独立检查 | 同上，改用 `#admissibleModel` |
| `#createRun`（fixture 身份分支） | **硬编码** `provider.model !== FAKE_MODEL_ID` 即拒 | 改为 `!this.#admissibleModel(connection, provider.model)`：`api`/`baseUrl` 仍钉死（fixture 身份的传输是固定的，这与 PV-59 无关），但模型改成与其它两类连接同一判据。这条硬编码是作者在实现过程中才发现的——它是本单端到端验证"目录连接加额外模型可以真的跑"这件事的唯一障碍，因为 `deepseek`/`openai` 两个目录连接的原生 `baseUrl` 指向真实网络，额外模型的 Run/verify 只能在 fixture 身份上做到不联网的端到端验证（见 §9 未检项） |
| "unknown provider model" 这道门 | 是——因为 pi 里除了已装目录模型外没有第二个模型来源 | 概念上不再是闭集门，但代码没有删除 `getModel` 检查本身：目录连接的额外模型现在会在保存时（`#saveCatalogConnectionModels`）与启动时（`initialize()`）注册进 pi，之后 `getModel` 对它们和已装目录模型一视同仁地解析。删除的是"造成闭集效果的机制"，不是检查语句本身 |

## 4. `registerProvider` 合并语义的核证与所取路径

**核证结论：`ModelRuntime.registerProvider(providerId, config)` 对模型列表是整体替换，不是字段级合并追加；且对一个已有原生注册（`registerNativeProvider`）的 provider id，会先删除该原生注册再重组。两者叠加意味着直接对 `deepseek`/`openai`/fixture 身份调用 `registerProvider({models:[...extras]})` 会丢失这三个 id 的自定义能力（本宿主为它们手工拼的双 API 格式派发表），且模型表只剩传入的 `extras`，原生模型整体消失。**

依据（`app/node_modules/@earendil-works/pi-coding-agent/dist/core/model-runtime.js` 与 `.../core/provider-composer.js`，与 `/private/tmp/se-fable-pv/explore/ex-pv5-flow-and-runtime.md` §4 的独立核证一致，行号互相印证）：

1. `registerProvider(providerId, config)`（`model-runtime.js:558-572`）第 562 行 `this.nativeExtensionProviders.delete(providerId)`：无条件删除该 id 在原生表里的注册。`deepseek`/`openai`/`fake-openai-loopback` 三个身份都是通过 `registerNativeProvider` 存在于这张表里的（`pi-session-runtime.mjs` 原 `createIsolatedModelRuntime`/`registerFakeProvider`）。
2. `recomposeProvider`（`model-runtime.js:133-146`）随后取 `base = this.nativeExtensionProviders.get(providerId) ?? this.builtins.get(providerId)`：因为上一步删了原生表条目，`base` 回退到 `this.builtins.get(providerId)`——pi-ai SDK 自带的、未经本宿主重新注册的内置 provider，只有单一默认传输，不含本宿主显式拼的 `openai-completions`/`openai-responses` 双格式派发表。
3. `composeModelProvider`→`applyExtension`（`provider-composer.js:118-141`）：`if (!config.models) return ...; return config.models.map(definition => {...})`——只要 `config.models` 存在，直接丢弃 base 的模型列表，返回值恰好等于 `config.models`（逐条补全 `api`/`baseUrl` 默认值后）。原生模型不是"追加在后面"，是整体消失。
4. `registerProvider`（`model-runtime.js:558-592`）全文未调用 `this.credentials.*`/`setRuntimeApiKey`/`removeRuntimeApiKey`：凭据槽位（`RuntimeCredentials.overrides`，与 `nativeExtensionProviders`/`extensionProviders` 完全独立的另一张 Map）不受影响——但因为 ①②③，即使凭据槽位没坏，配的 provider 对象本身已经被换掉。

**所取路径（后者：显式重组，不用 `registerProvider`）：**

`registerCatalogExtraModels(modelRuntime, providerId, extraModels)`（`pi-session-runtime.mjs`）从 `createIsolatedModelRuntime()`/`registerFakeProvider()` 在启动时捕获的"原生定义快照"（`{template, models}`，按 **`ModelRuntime` 实例**存进一个 `WeakMap`，不是模块级单例——测试里会并存多个 `ModelRuntime`，各自的 fixture `baseUrl` 不同，模块级单例会把后起的实例覆盖先起的实例，是本单实现过程中先犯后改的一个错误，见 §9）取出该身份的**纯原生模型数组**与**完整 provider 模板**（`name`/`baseUrl`/`auth`/`api` 派发表），按 id 去重合并进额外模型，再整体通过 `registerNativeProvider` 重新注册。这不依赖 `registerProvider` 的任何合并行为，凭据槽位天然不被触碰（`registerNativeProvider` 与凭据操作是两条完全不相交的代码路径），且每次调用都从纯原生基线重新计算（不是在"当前已注册的"列表上累加），所以删除额外模型（PUT 一个更短的列表）后重新计算即等价于"不再解析"，不需要单独的注销步骤。

## 5. 接入回执

### 5.1 回执字段表

```json
{
  "connectionId": "catalog-fake-openai-loopback",
  "model": "fake-extra-model",
  "status": "ok",
  "message": "The model answered.",
  "observedModel": "fake-model",
  "replyFirstLine": "SIMULATED fake response: This is a connection check...",
  "latencyMs": 12,
  "checkedAt": "2026-09-10T12:00:00.000Z",
  "credentialSource": "runtime",
  "binding": { "providerConfigVersion": 3, "credentialGeneration": 1 }
}
```

| 字段 | 说明 |
|---|---|
| `connectionId`/`model` | 请求所指的连接与模型（`model` 来自请求体，不是 providerConfig 当前选中的模型——verify 探测的是任意一个该连接admissible 的模型，与"当前生效模型"无关） |
| `status` | 见 §5.2 |
| `message` | 成功时固定 `"The model answered."`；失败时是上游错误原话（经 `redact` 防御性脱敏已知密钥后）；`unknown` 分类下**不**冒充更精确的说法 |
| `observedModel` | `AssistantMessage.responseModel`（`pi-ai/dist/api/openai-completions.js:375-376`：仅当响应流某个 chunk 的 `model` 字段与请求的 `model.id` 不同才设置，是上游真实报回的模型名，不是本宿主编的）；本宿主的 fixture 恒回报 `"fake-model"`，所以对额外模型的探测天然出现 `observedModel !== model`，这不是 bug，是 fixture 的真实行为 |
| `replyFirstLine` | 仅成功时非 `null`：模型回复文本的第一行，截断到 200 字符，经 `redact` 防御性脱敏 |
| `latencyMs` | 本次调用的墙钟耗时（`Date.now()` 差值），不是 provider 报的 TTFT/TPS |
| `checkedAt` | 调用发起时刻的 ISO 时间戳 |
| `credentialSource` | 与 run 记录同源，`credentialSourceOf(modelRuntime, connection.providerIdentity)`，不自造分类（PV-33 的既有约束） |
| `binding` | 见 §5.3 |

### 5.2 类别 ← 依据表（PV-62 ①）

**只有 `ok`、`timeout`、`unknown` 三类在 pi-coding-agent 0.85.1 下经 `ModelRuntime.complete()` 真的可达。** 依据（`classifyVerifyOutcome`，`pi-session-runtime.mjs`，与 ex-pv5 §3.1 独立核证一致）：

| 类别 | 依据（file:line） | 本宿主下可达？ |
|---|---|---|
| `ok` | `AssistantMessage.stopReason` 是结构化字段，非 `"error"` 且非 `"aborted"`（`pi-ai/dist/types.d.ts` 的 `AssistantMessage` 定义） | **可达**——唯一走结构化判据的成功分支 |
| `timeout` | 本宿主自己持有的 `AbortController`/`setTimeout`：超时回调设 `timedOut=true` 再 abort，是本宿主自己的状态，不是从 `errorMessage` 猜的 | **可达**——本宿主自控，结构化 |
| `authentication_failed` | 若可达，本应来自上游 HTTP 401/403 | **不可达**：`openai-completions.js:518` `output.errorMessage = formatProviderError(normalizeProviderError(error))` 把 `normalizeProviderError` 探测到的 `status`（含 401/403）拍扁进一条字符串后丢弃；`AssistantMessage` 上没有并行的 `status`/`code` 字段（`event-stream.js` 的 `AssistantMessageEventStream` 把 `"error"` 事件的 `error` 与 `"done"` 事件的 `message` 走同一 `.result()` 出口） |
| `model_not_found` | 若可达，本应来自上游 HTTP 404 | **不可达**，同上——404 与 401 经过完全相同的拍扁路径，没有留下可供程序判断的结构化差异 |
| `unreachable` | 若可达，本应来自 fetch 失败（网络层） | **不可达**：网络异常同样落进 `openai-completions.js` 的同一 `catch` 块，`normalizeProviderError` 对无 `.status` 的错误只返回 `{message}`，`formatProviderError` 原样透传 `message`——不比 HTTP 错误更结构化 |
| `http_error` | 若可达，本应来自任意非 2xx 状态 | **不可达**，理由同 `authentication_failed`/`model_not_found` |
| `malformed_response` | 若可达，本应来自响应体无法解析 | **不可达**：SDK 要么成功解析要么把解析失败同样折成 `errorMessage` 字符串，没有第三条路径能把"解析失败"与"其它失败"区分开 |
| `unknown` | `errorMessage` 是唯一幸存的信息，原样透传进 `message` | **是本宿主实际落地的失败出口**——本项目自己的 `provider-preview.mjs`（`/provider-connection/test`、`/provider-models/discover`）**能**达到 `authentication_failed`/`http_error`/`unreachable` 等类别，因为那个模块直接读原始 `fetch` Response，是完全不同的代码路径；verify 走的是 pi 的生成 API，两者不能类比 |

**设计含义**：`status` 枚举保留全部 8 个值（并非本单擅自收窄契约），但如实记录哪些在**当前 pi 版本**下可达。若未来 pi 升级后在生成路径上暴露结构化状态，`classifyVerifyOutcome` 可以在不改回执 schema 的前提下扩展判据。

### 5.3 绑定与失效（PV-42）

`providerConfig` 今日没有版本号，本单以最小方式引入：`store.mjs` 新增 `providerConfigVersion`（从 0 开始的单调计数），`setProviderConnections` 与 `setProviderConfig` 任一次写入都 +1。**故意做成全局粗粒度**：任何连接的保存都会让**所有**连接的回执一并失效，而不是只让被改的那条失效——因为今天没有"连接自己的版本号"这个概念，引入一个全局计数比引入一套新的、每连接独立的版本机制更小；代价是过度失效（例如改了 A 连接的密钥，B 连接一条早就正确的回执也被标记 `null`），但过度失效是安全的方向，一条读起来仍然新鲜、实际已经过期的回执才是不安全的方向。`GET /provider-connections` 的 `lastVerification` 字段在绑定失配时返回 `null`，不返回旧回执。

## 6. 新增用例原文

`app/tests/provider-open-admission.test.mjs`，8 条：

| 标题（原文） |
|---|
| `PV-59 · 目录连接 PUT 只接受 models；api/baseUrl/apiKey 出现即 400` |
| `PV-59 · 追加的模型 id 不得与已装目录冲突` |
| `PV-59 · 目录连接加一个不在已装目录的模型：可保存、可选为生效、run 发起门放行；删掉后 run 发起门 503；原生模型仍可解析` |
| `PV-61 · reasoning 三态：true → supportedEfforts 非 off；null → off + reasoningSource unknown；false → off + reasoningSource user` |
| `PV-62 · verify 三类 fixture 结果：成功 ok、401→unknown、未知模型→unknown，且不冒充精度` |
| `PV-62 · verify 的三道门：模型不可准入 400、连接无凭据 400、活动 run 期间 409` |
| `PV-42 · 回执绑定失配返回 null；重启后额外模型与回执可用` |
| `T-CRED-VERIFY · fixture 除外：fake 连接的 verify 不要求预先配置凭据；兼容连接仍要求，且不读 HOME/.pi 与环境变量` |

关键断言摘录：
- 目录连接 PUT 非 `{models}`-only 请求体（含 `api`/`baseUrl`/`apiKey` 任一）→ 400 `invalid_connection`。
- 追加模型 id 与已装目录冲突（对 fixture 身份即 `fake-model`）→ 400 `invalid_connection`，`error.models` 列出冲突 id。
- 额外模型注册后 `/provider-models` 能查到它（`origin:"connection"`），原生模型同时仍在（`origin:"catalog"`，`reasoningSource:"catalog"`）；选中额外模型后一次真实 Run 走到 `completed`；原生模型选中后仍可正常 Run；PUT 一个不含该额外模型的更短列表后，同一 session 新起的 Run 遇 503 `provider_unsupported`。
- `reasoning:true` 的连接模型行 `supportedEfforts` 非 `["off"]`；`reasoning` 缺省（`null`）时 `supportedEfforts:["off"]` 且 `reasoningSource:"unknown"`；`reasoning:false`（显式声明关闭）同样 `["off"]` 但 `reasoningSource:"user"`——三态里 "缺省" 与 "显式声明关闭" 的区别只体现在 `reasoningSource`，不体现在 `supportedEfforts`，这是刻意的（PV-61 原文）。
- fixture 三类可证结果：成功（`status:"ok"`，`message`、`replyFirstLine`、`credentialSource`、`binding` 均有值）；模型 id 以 `unknown-` 开头（本地已放行、fixture 上游 404）→ `status:"unknown"`，`message` 含上游原话 `"does not exist"`；连接凭据等于 `FIXTURE_WRONG_KEY`（fixture 401）→ `status:"unknown"`，`message` 含 `"Incorrect API key"`，且断言 key 字符串本身不出现在回执里。
- 不可准入模型 → 400 `invalid_provider`；无凭据的兼容连接 → 400 `credential_missing`；活动 run 期间 → 409 `active_run`；不存在的连接 → 404。
- 一条回执写入后 `GET /provider-connections` 的 `lastVerification` 与该回执逐字相等；任意连接写入（哪怕是另一条连接的凭据）后该字段变回 `null`；重启后，binding 未变的回执仍能读到，额外模型也仍能解析。
- `fake` 目录连接在从未配置凭据的情况下 verify 仍返回 `status:"ok"`（`credentialSource:"runtime"`）；同一进程里一条兼容连接（同样没配凭据）verify 得 400 `credential_missing`；全程 `HOME/.pi/agent/auth.json` 的哨兵字节不变、目录下无新文件。

## 7. 作者验证

| 命令 | 结果 |
|---|---|
| `npm --prefix app ci` | 277 包，0 漏洞 |
| `npm --prefix app test` | `tests 651 / pass 651 / fail 0`，退出码 0 |
| `npm --prefix app run smoke` | `{"status":"passed","provider":"local-fake","realProvider":"not_run"}` |

三条命令均在分支头 `c419ec71895279380d3933b111ff96d399280df9` 上跑，并发度为 Node 内置 test runner 默认并发（未显式指定 `--test-concurrency`，未联网）。原始输出留在本地 `evidence/pv-be03/`（`npm-ci.txt`/`npm-test.txt`/`npm-smoke.json`/`HEAD-sha-at-verification.txt`），**未提交**——见 §8①。

**真实 provider 证据：`not_run`。** 理由同 BE02：凭据只在 Web UI 输入，本单不持有任何真实 key，也不读取任何凭据文件。

## 8. 待裁定

① **验证命令原始输出未提交**。工单写权表明列 `app/server`、`app/runtime`、`app/tests`、`app/docs`、`app/README.md` 加交付页，没有列 `evidence/`（BE02 交付页引用过 `evidence/pv-be02/`，但那是否是本单也可以写入的路径，工单没有重新授权）。本单选择保守：三条命令的原始输出与 SHA 生成在本地 `evidence/pv-be03/`（供复核时我可以直接提供），但**未 `git add`、未提交**——交付页正文（§7）已经以文字形式记全了命令、SHA、通过/失败计数,不依赖这些文件存在。若裁定 `evidence/` 是本批次沿用的既有约定、本单也可以写入，我可以把这个目录补提交进同一分支。

② **verify 记成完全瞬态，不记一条带 probe 标记的 run（PV-37 授权作者按最小改动定）**。`#verifyProviderConnection` 完全不经过 `store.createRun`/`this.active`/`AgentSession`：直接调用 `this.modelRuntime.complete()`，只把回执写进新的 `providerVerifications` 账本。理由：① Run 记录天然绑定 session/workspace/lineage，而 verify 只绑定连接，没有 session；把它塞进 Run 模型意味着要么发明一个"无 session 的 Run"，要么借用某个 session 挂账，两者都比"回执是连接的一个独立账本"更复杂。② `AssistantMessage.stopReason`/`responseModel`/`errorMessage` 已经是 `modelRuntime.complete()` 的现成返回值，不需要 `createSessionRun` 的 AgentSession 全套机制（工具、compaction、事件投影）来获得它们，而 PV-62 本就要求"无工具、无 workspace、不进会话历史"——用最小的 API 表面自然满足，不需要先搭一个会话再逐项关掉它的功能。

③ **verify 路由进 `#withConfiguration` 队列，而非独立于配置队列（与 Run 创建不同）**。Run 创建有自己的 `admissions` 集合，不占用配置队列；verify 选择了占用配置队列，代价是一次 verify 调用（最长可达 `VERIFY_TIMEOUT_MS`=20s）期间，其它连接/凭据/配置写入会排队等待。选择的理由：verify 读取的连接定义（`api`/`baseUrl`/`models`）与凭据必须在探测过程中保持不变，否则回执绑定的 `{providerConfigVersion, credentialGeneration}` 在探测尚未结束前就可能已经不代表"探测时实际用的状态"；把 verify 放进同一把队列锁，用已有机制换取正确性，不新增一把锁。若这个 20 秒阻塞在真实使用中造成体验问题，是后续可调的实现细节，不是契约。

④ **`VERIFY_TIMEOUT_MS = 20_000`、`VERIFY_MAX_TOKENS = 16` 的具体取值**。工单给的是"建议"值（20s、16 token），本单原样采纳,未做进一步论证（例如没有测过更短超时是否会在真实网络延迟下产生大量误判 `timeout`，因为本单没有真实 provider 证据）。

⑤ **"fixture 除外" 的读法（PV-62 原文"连接无凭据（fixture 除外）400 credential_missing"）**。作者最终按"fixture 身份的 verify 完全不要求预先配置凭据，与既有 Run 执行路径的既有豁免（`#executeRun` 的 `credentialConfigured = provider.provider === FAKE_PROVIDER_ID || ...` 与其后的 `setRuntimeApiKey(FAKE_PROVIDER_ID, FAKE_CREDENTIAL_KEY)` 自动补齐）保持一致"来实现——`#verifyProviderConnection` 在信任判据之前先对 fixture 身份补齐运行时 key，credential_missing 这道门因此对 fixture 天然不可达。这是作者读到"fixture 除外"四个字后，比对既有 Run 代码路径得出的唯一自洽读法；本单最初曾按"该检查普遍适用、只是没把 fixture 单独拿出来测"实现并写测试，跑起来才发现与 Run 路径的既有豁免矛盾（catalog-fake 一条连接如果被 verify 拦在 credential_missing，而同一条连接的 Run 从不会因为没配 key 而失败,是两套不一致的规则）,遂改为现状。请复核这个读法是否是原意。

## 9. 未检项

- 真实 provider 未跑：DeepSeek / OpenAI / 任何远端兼容网关都未接触，`not_run`（凭据只在 UI 输入）。
- **`deepseek`/`openai` 两个目录连接的额外模型只验证了"保存 → 注册 → `/provider-models` 可见"，未验证"选中 → Run/verify 端到端成功"**——它们的原生 `baseUrl` 指向真实网络端点，端到端验证只能在联网环境或有真实凭据时进行。本单选择的替代证据是 fixture 身份（`catalog-fake-openai-loopback`）的额外模型端到端 Run 与 verify（§6），因为它是三个目录连接里唯一 `baseUrl` 指向 loopback 的一个；`#createRun` 的 fixture 分支因此也被本单改动触及（§3），这是保持"不联网也能端到端验证 PV-59"的必要代价，不是范围外的顺手改动。
- `openai-responses` 格式的额外模型（无论目录连接还是兼容连接）未端到端跑：loopback fixture 只实现 `openai-completions` 语义的 chat/completions。
- `classifyVerifyOutcome` 的判据（§5.2）核实基于 `openai-completions.js`；未逐行核对 `openai-responses.js`/`anthropic-messages.js` 等其它 API 模块是否用完全相同的 `normalizeProviderError`/`formatProviderError` 落地方式——`error-body.js` 是共享工具，大概率一致，但未逐一确认调用点（与 EX-PV5 未检项 ③ 相同的空白）。
- `retryProviderRequest`（`pi-ai` 内部对某些错误的自动重试）在 verify 路径上的行为未单独验证：`latencyMs` 若包含了一次内部重试的耗时，不会体现为回执里的任何单独字段——如实记录墙钟耗时,重试是否发生对调用方不可见,这点未做进一步探测。
- `registerCatalogExtraModels`/`nativeCatalogModelIds` 的按-`ModelRuntime`-实例 `WeakMap` 设计只由"多个 `ModelRuntime` 实例共存于测试进程"这一事实驱动，未验证在真实单进程单实例部署下是否还有其它需要多实例隔离的场景。
- 未读取任何凭据文件；未联网；未改动本树以外的任何目录。
