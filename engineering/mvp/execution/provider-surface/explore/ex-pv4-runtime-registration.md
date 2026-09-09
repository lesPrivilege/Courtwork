# EX-PV4：连接可执行性的运行时基座

作者：Sonnet　仲裁：Fable（主会话）　只读 explore，未修改任何仓库，未读取任何凭证文件，未发起网络请求。

前提：不复述 `ex-pv1-current-state.md`（下称 PV1）与 `ex-pv2-reference-anatomy.md`（下称 PV2）已确立的事实，仅引用其结论并向下钻取到 pi-ai 0.85.1 / pi-coding-agent（`ModelRuntime` 的实际定义处）源码行号。PV2 已指出 Courtwork 使用的 `ModelRuntime` 来自 `@earendil-works/pi-coding-agent`（`app/runtime/pi-session-runtime.mjs:10`），本探索首次读取该类的实现（`pi-coding-agent/dist/core/model-runtime.js`），发现其在裸 `pi-ai` `Models`（PV2 §A 描述的对象）之上叠加了一层"三源合成"（builtin / models.json / extension）与 `registerProvider`/`unregisterProvider` API，这是回答本轮问题的关键新增事实。

---

## 1. 运行时注册生命周期

### 1.1 两条注册路径，语义不同

`ModelRuntime`（`pi-coding-agent/dist/core/model-runtime.d.ts:35-100`）对外暴露三个注册方法：

| 方法 | 语义 | 幂等性 |
|---|---|---|
| `registerNativeProvider(provider)`（`model-runtime.js:549-556`） | **整体替换**：把一个完整的 `pi-ai` `Provider` 对象塞进 `nativeExtensionProviders: Map<id,Provider>`（`Map.set`），随后 `recomposeProvider(id)`。Courtwork 今天对 `deepseek`/`openai`/`fake-openai-loopback` 三者都走这条路（`pi-session-runtime.mjs:71,98`） | 是，`Map.set` 天然按 id 覆盖；旧 Provider 对象被整体丢弃 |
| `registerProvider(providerId, config: ProviderConfigInput)`（`model-runtime.js:558-585`） | **字段级合并**：先 `validateExtensionProvider`（`provider-composer.js:284-289`）校验新配置能独立组装出模型表，通过后清除同 id 的 native 注册（L560），再把 `config` 的**已定义字段**逐个覆盖进 `extensionProviders.get(id)` 的既有条目（L562-568，"Re-registration merges defined values over the previous registration and preserves undefined ones"，注释原文），最后 `recomposeProvider` | 是，且是**合并**而非替换——两次 `registerProvider` 调用，第二次只传 `{apiKey:"new"}` 不会清空第一次传入的 `baseUrl`/`models` |
| `unregisterProvider(id)`（`model-runtime.js:594-599`） | 同时从 `extensionProviders`与`nativeExtensionProviders` 删除该 id，`recomposeProvider(id)` 发现 `base`/`config`/`extension` 三者皆空则 `this.models.deleteProvider(id)`（`model-runtime.js:133-138`） | 是 |

PV2 只读到了裸 `pi-ai` 层的 `MutableModels.setProvider/deleteProvider/clearProviders`（`pi-ai/dist/models.d.ts:147-152`，实现见 `pi-ai/dist/models.js:35-45`：`Map.set`/`Map.delete`，逐 provider 独立、无跨 provider 副作用）。`ModelRuntime` 内部持有一个私有的裸 `pi-ai` `Models` 实例（字段 `models`，`model-runtime.d.ts:36`），`registerNativeProvider`/`registerProvider`/`unregisterProvider` 最终都落到对这个私有实例调用 `setProvider`/`deleteProvider`（经由 `recomposeProvider` → `this.models.setProvider(...)`，`model-runtime.js:133-149`）。**Courtwork 目前只用了 `registerNativeProvider` 这条"整体替换"路径**（`pi-session-runtime.mjs:71,98`），从未调用 `registerProvider`/`unregisterProvider`——这是一个可用但未启用的现成机制，供"用户输入 baseUrl+key+model 列表"场景使用（对应 `ProviderConfigInput` 形状，见 §2）。

`unregisterProvider` **没有**被 Courtwork 任何模块引用（本次未在 `app/` 下检索到调用点，非穷尽搜索，仅限 grep 命中范围）。

### 1.2 in-flight 会话遇到 provider 被替换/删除

关键机制：`pi-ai` 的 `ModelsImpl.stream()`/`streamSimple()` 把 `requireProvider(model)`（按 `model.provider` 字符串重新查 `this.providers.get(...)`，`pi-ai/dist/models.js:274-280`）包在 `lazyStream(model, setup)` 的 `setup` 闭包里（`pi-ai/dist/models.js:344-349`），而 `lazyStream` 同步调用 `setup()`（`pi-ai/dist/api/lazy.js:36-38`：`setup().then(...)`，`setup` 在 `stream()` 被调用后的下一个 microtask 立即执行，不等待订阅）。这意味着：

- **provider 查找的时点 = 调用 `stream()`/`streamSimple()` 的那一刻**，不是模型对象构造时点、也不是订阅时点。一次已经发出的请求（`provider.stream(requestModel, context, requestOptions)` 已经被调用、HTTP 请求已经在途）不会因为随后 `setProvider`/`deleteProvider` 换掉了 `providers` Map 里的条目而被打断或重定向——旧 `Provider` 对象的 `stream` 闭包仍在跑。
- **尚未发起、但已经拿到旧 `model` 引用、还没调用 `stream()` 的调用点**：下一次调用会 `requireProvider` 到**新**注册的 Provider 对象（因为查找按 `model.provider` id 字符串经 `this.providers.get(id)` 现查，不缓存旧对象引用）。若新 Provider 的 `getModels()` 里已经没有旧 `model.id`，请求仍然会被发给新 Provider（`provider.stream(requestModel,...)`——`requireProvider` 只按 provider id 校验，不校验 `model.id` 是否仍在该 provider 的 `getModels()` 列表里，`pi-ai/dist/models.js:274-280`），**这是推断**：新 Provider 若是 openai-compatible 且模型 id 不存在，网关会返回该模型不存在的错误（见 §6），而不是 pi-ai 侧提前拒绝。
- Courtwork 自身对这个窗口的处理：`app/server/service.mjs:686` 用 `store.hasActiveRun()` 门禁 `PUT /provider-config`/`PUT /provider-credential`/`DELETE /provider-credential`（PV1 §1 表已列出 409 `active_run`），也就是说**应用层用一个粗粒度的"有 Run 在跑就整体冻结配置端点"策略规避了这个竞态**，而不是依赖 pi-ai 自身的原子性——pi-ai 本身对此没有锁/事务保证（`setProvider`/`deleteProvider` 是同步 `Map` 操作，无版本号校验请求方持有的是哪一代）。这一层"是否有细粒度 race 防护"pi-ai 代码本身**不回答**，是 Courtwork 用应用锁绕开的。

### 1.3 幂等性

`setProvider`（裸层，`pi-ai/dist/models.js:35-38`）：`Map.set(provider.id, provider)`，同 id 重复调用直接覆盖，无报错、无版本冲突检测——**幂等**（多次相同调用得到相同终态）。`registerProvider`（合成层）在合并前先跑一次 `validateExtensionProvider`（`provider-composer.js:284-289`，内部完整走一遍 `applyModelsJson`+`applyExtension` 来验证新旧合并后的模型表不抛错），失败则整个调用抛错、**不触碰** `extensionProviders` Map（`model-runtime.js:558-561` 的校验发生在 `this.extensionProviders.set(...)` 之前）——即"半失败注册"在这一层被结构性排除，但注意这只保证"这次合并"不会让 Map 处于损坏中间态，不保证跨多次调用的整体语义幂等（因为语义是合并，非替换，见 1.1）。

### 1.4 相同 wire API、不同 baseUrl/key 的两个 provider 隔离性

隔离靠**两个独立的 id 键**，不靠 wire API 类型区分。`Model.provider`（`pi-ai/dist/types.d.ts:722`，`ProviderId`）与 `Model.baseUrl`（同文件 `types.d.ts:721`，**模型级**字段，非仅 provider 级）共同决定一次请求打到哪：`applyAuth`（`pi-ai/dist/models.js:296-311`）里 `requestModel = auth.baseUrl ? {...model, baseUrl: auth.baseUrl} : model`——若 `AuthResult.auth.baseUrl` 存在（来自 `ApiKeyAuth.resolve()` 的返回值，PV2 §A.2 提到 Vertex 场景），它会**覆盖** `model.baseUrl`；否则 `model.baseUrl`（每个 `Model` 记录自带的字段）原样传给 `provider.stream()`。因此，两个 provider id（例如 `my-gateway-a`、`my-gateway-b`）即使都用 `openai-completions` 这同一套 `stream`/`streamSimple` 实现（`createProvider` 的 `api` 参数可以指向同一份函数引用，PV2 §A.4/README 示例），只要各自 `Provider.id` 不同、各自的 `Model.baseUrl` 不同、各自在 `InMemoryCredentialStore`/`RuntimeCredentials`（见 §3）里以自己的 id 存了不同 key，就能并存且互不干扰——隔离边界是 provider id 这个字符串，不是"同一份 stream 函数实例"的物理身份。

---

## 2. 最小 `Model` 记录

### 2.1 类型层要求（`Model<TApi>`，`pi-ai/dist/types.d.ts:716-737`）

| 字段 | 类型 | 必需？ |
|---|---|---|
| `id` `name` `api` `provider` `baseUrl` `reasoning` `input` `cost` `contextWindow` `maxTokens` | 各自类型 | **必需**（接口未标 `?`） |
| `thinkingLevelMap` `samplingParams` `headers` `compat` | 各自类型 | 可选 |

`ProviderConfigInput.models[]`（`pi-coding-agent/dist/core/provider-composer.d.ts:25-39`，即 `registerProvider` 的入参形状，§1.1 的第二条路径）在**这一层**把同一组字段再声明一遍，`id,name,reasoning,input,cost,contextWindow,maxTokens` 全部**非可选**；`api,baseUrl,thinkingLevelMap,samplingParams,headers,compat` 可选（用 provider 级 `config.api`/`config.baseUrl` 兜底，`applyExtension` 内 `definition.api ?? config.api ?? defaults?.api`，`provider-composer.js:127-131`）。

### 2.2 运行时是否真的强制、以及缺失时的行为——两条不同路径给出不同答案

**关键发现**：`pi-coding-agent` 内部有两套"从用户配置装配 `Model`"的函数，行为不同：

| 装配函数 | 触发路径 | 缺字段时的行为 |
|---|---|---|
| `modelFromJson`（`provider-composer.js:46-70`） | 仅服务于**models.json 层**（`applyModelsJson`，`ModelConfig` 文件配置），**不**服务于 `registerProvider` 的 extension 层 | 显式默认值：`reasoning: definition.reasoning ?? false`（L61）；`input: definition.input ?? ["text"]`（L62）；`cost: definition.cost ?? {input:0,output:0,cacheRead:0,cacheWrite:0}`（L63）；`contextWindow: definition.contextWindow ?? 128000`（L64）；`maxTokens: definition.maxTokens ?? 16384`（L65）。若**显式**给出 `contextWindow<=0` 或 `maxTokens<=0` 则抛 `Error`（L55-59），但**不给**（`undefined`）不抛，走默认值。 |
| `applyExtension`（`provider-composer.js:114-133`，`registerProvider` 走这条） | `registerProvider(id, config)` 的 `config.models` | **无默认值兜底**：`{...definition, api, provider, baseUrl, headers: undefined}`（L128-133）——只解析 `api`/`baseUrl` 两个字段的兜底链（`definition.api ?? config.api ?? defaults?.api`），其余字段（`reasoning,input,cost,contextWindow,maxTokens`）**原样透传 `definition` 里的值**，TS 类型要求非可选只是编译期约束，JS 运行时不校验；调用方若省略，字段在结果 `Model` 对象上就是 `undefined`。 |

也就是说：**如果 Courtwork 未来用 `registerProvider`（而非 `registerNativeProvider`）承载"用户输入 baseUrl+key+discover 出的模型 id"这个场景，pi-ai/pi-coding-agent 这一层不会替 host 发明 `contextWindow`/`maxTokens`/`cost` 的值——这些字段留空就是 `undefined`，装配阶段不报错（`validateExtensionProvider` 只验证 `applyExtension` 不抛异常，不检查字段完整性，`provider-composer.js:284-289`）。**只有走 `modelFromJson`（models.json 静态配置文件路径，Courtwork 当前完全未使用这条路径）才会拿到 `128000`/`16384`/全零成本这组兜底值。

### 2.3 下游各字段"缺失/为零"时的具体后果

| 字段 | 消费点 | 缺失/零时行为 | 证据 |
|---|---|---|---|
| `contextWindow` | Courtwork 自己的 `resolveCompactionPolicy`（`pi-session-runtime.mjs:126-143`） | `!Number.isSafeInteger(window)`（`undefined` 不是安全整数）→ 若 `compaction.enabled`（真实 provider 默认 `true`，L132 `model.provider !== FAKE_PROVIDER_ID`）则 **抛 `RangeError`**："compaction requires a known model context window"；若显式 `enabled:false` 则返回一个退化策略而不抛 | `pi-session-runtime.mjs:132-136` |
| `contextWindow` | pi-ai 自身（`getSupportedThinkingLevels`/`clampThinkingLevel`/`calculateCost`，`pi-ai/dist/models.js:530-577`） | 完全不读 `contextWindow`——这三个函数只用 `model.reasoning`/`model.thinkingLevelMap`/`model.cost` | `pi-ai/dist/models.js:551-577`；`contextWindow` 在 pi-ai 内被引用的唯一其他处是类型声明，未在 `dist/*.js` 内搜到运行时消费者（本次未穷尽搜索 api/*.js 各 provider 实现是否读它去做本地截断——**未确认**） |
| `maxTokens` | pi-ai `api/openai-completions.js`/`openai-responses.js`（推断：用于 `max_tokens`/`max_output_tokens` 请求字段） | **未在本次读取范围内逐行确认**其为 `undefined` 时的请求体行为（是否省略该字段、发 `null`、还是抛错）——标记为**未回答** | 仅确认了 `buildParams`（`openai-completions.js:203`）的调用存在，未展开其内部对 `maxTokens` 的处理 |
| `reasoning` | `getSupportedThinkingLevels`（`pi-ai/dist/models.js:551-555`） | `!model.reasoning` → 直接返回 `["off"]`，不读 `thinkingLevelMap`，不抛错——**静默降级**为"不支持推理档位" | `pi-ai/dist/models.js:551-555` |
| `cost`（若 `undefined` 而非 `{...:0}`） | `calculateCost`（`pi-ai/dist/models.js:530-548`） | 直接 `model.cost.tiers`/`rates.input` 等属性访问——若 `cost` 是 `undefined`，这里会 **`TypeError`**（属性访问 `undefined.tiers`）；若 `cost` 是全零对象（models.json 路径的默认值）则安全返回全零 `usage.cost`，不抛，只是费用永远算作 $0 | `pi-ai/dist/models.js:534`（`model.cost.tiers`） |
| `input`（模态） | 本次未找到运行时消费者对 `input` 数组做校验或分支（PV1/PV2 均未见）；推断它仅用于前端展示"该模型接受哪些输入模态"，不影响请求装配 | — | **未回答**：pi-ai 请求构建层（`api/openai-completions.js` 的 `buildParams`）是否用 `model.input` 做输入内容校验，未展开阅读全部 1356 行确认 |

**结论对 Courtwork 的含义**（仅陈述代码事实，非设计建议）：走 `registerProvider` 路径时，`contextWindow`/`maxTokens` 若不填会在 pi-ai 装配阶段"悄悄通过"，但会在 Courtwork **自己的** `resolveCompactionPolicy` 里于**首次真正创建 Run** 时抛 `RangeError`（不是装配期，是使用期）；`cost` 若不填会在首次结算时 `TypeError`；`reasoning` 不填等价于 `false`，不抛错但该模型永远拿不到推理档位。这三者行为不一致（一个抛 host 自定义错误、一个抛原生 `TypeError`、一个静默降级），且都发生在"用户已经保存了连接、发起了一次对话"之后，而不是保存时。

---

## 3. 凭据绑定

### 3.1 绑定粒度：provider id 字符串，单槽位

`ModelRuntime` 在 `pi-coding-agent` 层把凭据存取包了一层 `RuntimeCredentials`（`pi-coding-agent/dist/core/runtime-credentials.js:1-38`）：`overrides: Map<providerId, apiKey_string>`。`setRuntimeApiKey(providerId, apiKey)` 就是 `this.overrides.set(providerId, apiKey)`（L8-10）——**单 Map、单槽位、按 provider id 字符串覆盖**，与 PV1 §3 描述的 `credentials.json` 扁平对象结构（`{[providerId]:apiKey}`）在语义上完全对应（PV1 已指出 `credential-file.mjs:35` `entries[provider]=apiKey` 会覆盖前一个——这条结论在 pi-coding-agent 运行时层被**独立印证**：两层都是"一个 provider id 只能有一把当前生效的 key"）。

`read(providerId,...)`（L17-21）：`overrides` 命中则返回 `{type:"api_key",key:override}`，否则委托给底层 `CredentialStore`（Courtwork 传入的是 `InMemoryCredentialStore`，`pi-session-runtime.mjs:61`，永远为空——即 Courtwork 的凭据**完全**走 `overrides` 这条内存覆盖层，底层 `CredentialStore` 只是形式上满足接口要求，从不被写入）。

### 3.2 两个 provider（同 wire API，不同 id）能否同时持不同 key

能——因为绑定键是 `providerId` 字符串而非 wire API 类型或 baseUrl，`overrides` Map 天然支持任意多个不同 id 各自一条记录（§1.4 已确认 id 是隔离边界）。**不能**的是同一个 provider id 下有两把 key 同时生效——`Map.set` 语义决定第二次 `setRuntimeApiKey(sameId, newKey)` 直接覆盖第一把，无历史、无多态。这与 PV1 §8 "Auth" 行给出的结论一致，本探索把它从"应用层文件格式的观察"上溯到"pi-coding-agent 运行时数据结构的必然结果"这一层。

### 3.3 `resolve()` 结果的 `source` 字段

`AuthResult.source?: string`（`pi-ai/dist/auth/types.d.ts:87-93`）：一个**人类可读标签**，文档注释给的例子是 `"ANTHROPIC_API_KEY"`、`"OAuth"`、`"~/.aws/credentials"`——**不是**一个封闭枚举/类型化 union，是自由字符串，由各 `ApiKeyAuth.resolve()`/`OAuthAuth` 实现自行填写。`composeApiKeyAuth`（`provider-composer.js` 约 L200-250 区间，见上文摘录）里能看到具体取值：`"stored credential"`、`"configured API key"`；`ModelRuntime.getProviderAuthStatus`（`model-runtime.js:415-426`）把它归纳成三种更粗的 `source` 枚举供状态 UI 用：`"runtime"`（`overrides` 命中）/`"stored"`（`snapshot.storedProviders`）/`"environment"`（`configuredRequestAuthStatus` 或 `checkAuth` 的兜底路径）——**这是 pi-coding-agent 层新增的归纳**，裸 `pi-ai` 的 `AuthResult.source` 本身不区分这三类，只是一条自由文本。

**host 在哪里能观察到它**：`Models.getAuth()`/`ModelRuntime.getAuth()` 的返回值（`AuthResult`）里（`pi-ai/dist/models.d.ts:133-134`；`model-runtime.d.ts:78-79`），或更粗粒度的 `ModelRuntime.getProviderAuthStatus(providerId): AuthStatus`（`model-runtime.d.ts:85`，返回 `{configured,source?,label?}`）。**Courtwork 目前完全不消费这个字段**——`service.mjs` 里对凭据状态的呈现只有布尔式 `credentialStatus:"configured"|"not_configured"`（PV1 §1 `getProviderConfig` 行），既不调用 `getAuth()` 也不调用 `getProviderAuthStatus()`；`request-telemetry.mjs`（PV1 §5）记录的字段集里也没有 `source`。**这是一个存在但未被摘取的信号**：pi-coding-agent 已经把"这次请求的 key 到底来自 runtime override 还是 stored 还是 environment"这件事结构化好了，Courtwork 目前一次都没有把它落进任何持久化或可观测面（既不在 telemetry 里，也不在 runtime-control 的 `secret:provider` 只读行里，PV1 §6）。

---

## 4. 持久化与重启

### 4.1 现有启动顺序（`app/server/runtime.mjs:32-47`）

```
createIsolatedModelRuntime()          // runtime.mjs:43 —— 硬编码注册 deepseek/openai 两个 native provider（pi-session-runtime.mjs:68-79）
    ↓
new RuntimeService({modelRuntime,...})// runtime.mjs:46 —— 构造函数同步调用 registerFakeProvider（service.mjs:158）
    ↓
service.initialize()                  // runtime.mjs:47
    ├─ store.getProviderConfig()      // service.mjs:174 —— 读单值指针 {provider,model,api,baseUrl?,reasoningEffort?}
    ├─ readCredentialFile(dataDir)    // service.mjs:178 —— 读 credentials.json 扁平表
    └─ for each entry in ALLOWED_PROVIDER_IDS:
         modelRuntime.setRuntimeApiKey(provider, apiKey)   // service.mjs:182
```

**没有任何一步调用 `modelRuntime.registerProvider(id, config)`**——因为今天不存在"持久化的用户自定义连接"这个数据结构，`providerConfig` 只是"选哪个已注册 provider 的哪个 model"的指针（PV1 §3 已确立），而"已注册 provider"这件事完全由 `createIsolatedModelRuntime()` 里的硬编码循环（`DEEPSEEK_PROVIDER_ID`/`OPENAI_PROVIDER_ID` 两元素数组，`pi-session-runtime.mjs:68`）决定，与 `runtime-state.json`/`credentials.json` 的内容无关。

### 4.2 若要让用户自定义连接（id/baseUrl/apiFormat/模型列表/key）存活过重启，代码隐含的顺序约束

（仅描述现有机制施加的约束，不提出数据结构方案）

1. 必须在 `RuntimeService` 能够响应任何 `PUT /provider-config`/创建 Run 请求**之前**完成注册——因为 `#setProviderConfig`（`service.mjs:688`）与 Run 创建校验（`service.mjs:1002`）都直接调用 `modelRuntime.getModel(provider,model)`，若该 provider 从未被 `registerProvider`/`registerNativeProvider` 注册过，`getModel` 返回 `undefined`（`ModelRuntime.getModel` 委托给裸层 `getModels(providerId).find(...)`，PV2 §A 已确认 `getModels()` 对未注册 id 返回 `[]`），保存/发起 Run 都会走已有的"未知/不支持"错误分支。
2. 注册（`registerProvider`）与凭据注入（`setRuntimeApiKey`）**理论上顺序可互换但注册应先行**：`registerProvider` 内部会自己触发 `recomposeProvider`+`this.refresh({allowNetwork:false})`（`model-runtime.js:571-573`），`setRuntimeApiKey` 也会（经 `synchronizeCredentialState`→`recomposeProvider`，`model-runtime.js:374-384`）——两者都是幂等的重新合成，谁先谁后最终收敛到同一状态；但若 `setRuntimeApiKey` 先于 `registerProvider` 对一个**从未注册**的 id 调用，`recomposeProvider` 发现 `base`/`config`/`extension` 三者皆空会走"删除该 id"分支（`model-runtime.js:133-138`），即这次 `setRuntimeApiKey` 调用把 key 写进了 `RuntimeCredentials.overrides`（内存 Map，不受 `recomposeProvider` 影响，两者是独立的数据结构），但对应的 `Provider` 对象仍不存在——key 被存了、但没有一个可用 provider 去消费它，直到之后某次 `registerProvider` 补上。**这是从代码结构推出的顺序建议，非设计提案**：先 `registerProvider` 让 provider 对象存在，再/同时 `setRuntimeApiKey`。
3. 每个持久化连接必须携带完整的 `ProviderConfigInput.models[]`（§2.2 已证明这条路径**不**补全 `contextWindow`/`maxTokens`/`cost`/`reasoning`）——这意味着"重启后重新装配"这一步要么把这些字段原样带回（若上次保存时用户填过或 discover 补过），要么该字段继续是 `undefined`，行为与首次注册时完全一致（§2.3 的三种失败模式在重启后同样成立，不会因为"曾经跑过一次"而被缓存修正——`ModelsStore`/`modelsPath:null` 的磁盘目录查找被 Courtwork 显式关闭，PV1 §2 已确认）。

### 4.3 保存的模型列表为空/陈旧时的后果

- **空**（`config.models === []` 或 `undefined` 且无 `base` 内置 provider 可继承）：`applyExtension`（`provider-composer.js:115-116`）对 `!config.models` 分支返回"继承 `models` 参数原样"（对全新自定义 provider 而言 `models` 参数本身就是 `[]`，因为没有 `base`），对 `config.models` 是空数组的分支走 `.map()` 得到 `[]`。**两种情况下 `composeModelProvider` 都不抛错**（`getModels()` 立即调用一次做"eager validation"，`provider-composer.js:309`，空数组是合法返回值）——provider 被成功注册，但 `getModels()` 恒为 `[]`。后续任何 `#setProviderConfig`/Run 创建对这个 provider 的任何 model id 校验都会因为"目录里找不到该 model"而走 PV1 §4 已列出的 503 `provider_unsupported`（`service.mjs:1002`）/400（`service.mjs:689` 的等价校验，取决于是保存时还是发起 Run 时触发）——**失败发生在使用时，不发生在重启/注册时**。
- **陈旧**（模型 id 仍在列表里，但网关已经不再提供该 id，或 baseUrl 已失效）：pi-ai/pi-coding-agent 这一层完全不知道"网关侧目录是否仍然认识这个 id"——`getModels()` 是纯同步的本地列表读取，不做任何网络校验（PV2 §A.3 "Static providers 对 `refresh()` 是 no-op"同样适用于手工 `createProvider`/`registerProvider` 装配出的 provider，除非显式提供 `refreshModels`）。陈旧模型 id 会顺利通过装配期与 `#setProviderConfig` 校验（本地目录里"存在"），直到真正发起请求时网关返回错误（见 §6）——**这是推断**：具体错误形态取决于网关如何处理未知 model id（有的网关 400，有的 404，有的静默路由到默认模型），pi-ai 不做归一化。

---

## 5. DeepSeek Harness 对照

PV2 §C 已完整覆盖 `llm-pi-ai` 的机制（`catalog.ts`/`provider.ts`/`config.ts`/`replay.ts`），此处只回答"哪些是真机制、哪些是约定"这一问，不重复摘录代码。

| 维度 | 真机制（有类型/运行时强制） | 约定（文档/命名/流程规范，代码不强制） |
|---|---|---|
| route 定义非内置 provider | `buildProvider(spec)`（`llm-pi-ai/src/provider.ts:167-192`）二选一：`reuseCatalogProvider`（委托内置 `stream`/`streamSimple`）或 `createProvider()`+`PROTOCOLS` 白名单（`provider.ts:47-51`，仅 3 种 API）——**白名单是真机制**，第四种 API 传入会在装配期被拒绝（PV2 已确认，未在此次重新验证具体报错点） | "何时该用 route 而非直接编辑 settings.yaml 的 `models.json` 等价物"——PV2 未见强制入口点，属使用惯例 |
| 持久化 | `settings.yaml` 里的一条 route 配置（宿主 Harness 自己的文件，pi-ai/pi-coding-agent 均不知道其存在）——**这本身就回答了"持久化在哪一层"**：不在 pi-ai 的 `ModelsStore`/`CredentialStore` 里，在 Harness 自己的配置文件层，`resolveRouteModels`（`catalog.ts:446-546`）是**装配期**函数，每次进程启动时把 settings.yaml 的 route 定义重新喂给 `catalogProvider`/`createProvider` | — |
| 启动时重新注册 | PV2 未展开这一具体调用点（`catalog.ts`/`provider.ts` 是"给定 spec 生成 Provider 对象"的**纯函数**，不包含"谁在进程启动时调用它们"的编排代码——那部分代码不在 `packages/llm/llm-pi-ai/src/` 范围内，PV2 也未读到） | **未回答**：本探索与 PV2 均未定位到 Harness 侧"启动时按什么顺序把每条 route 喂给一个 `ModelRuntime`/`Models` 实例"的编排代码，只看到"给定 spec 能生成什么"的装配函数 |
| 缺失目录元数据（`contextWindow` 等） | `resolveRouteModels` 的逐字段回退链（`catalog.ts:510/514/533`：`entry ?? base ?? route.default`）——**真机制**，且严格于 pi-coding-agent 的 `applyExtension`（§2.2）：`applyExtension` 对未提供的字段只会是 `undefined`，`resolveRouteModels` 至少还有 `route.defaultXxx` 这一级兜底（前提是配置者填了 `route.defaultXxx`） | "该给 `contextWindow` 填多大"这类具体数值选择是约定/人工判断，代码只提供合并语义不提供数值来源 |
| 推理档位不对称 | `resolveModelReasoning()`（`catalog.ts:315-369`）显式改写了 pi-ai 原生"5 个基础档位缺 key 代表支持、xhigh/max 缺 key 代表不支持"这条不对称默认——**真机制**（强制配置侧显式声明每一级） | — |
| 凭证分离 | `harnessApiKeyAuth`（`provider.ts:77-85`）不做任何解析，纯透传——**真机制**，且明确**不使用** pi-ai 的 `CredentialStore`（PV2 §C.4 已确认）；`routeAuth`（`provider.ts:131-135`）只在内置 catalog 没有 `apiKey` 方法时才叠加透传层，否则保留 ambient 发现——**真机制** | — |
| 错误分类 | `HarnessError{code}` + `normalizeLlmFailure`（PV2 §C.5）——**真机制**，且这组 code（`CONTEXT_WINDOW_EXCEEDED`/`QUOTA`/`EMPTY_RESPONSE`/`INVALID_CREDENTIAL`）是 pi-ai `ModelsError{code:"oauth"|"auth"}`（本探索 §6 确认的裸 union，`pi-ai/dist/auth/resolve.d.ts:3`）之外的**独立体系**，靠正则文案分类器（`isContextWindowExceededError`等）把不同网关的错误文案统一映射——**这个映射本身是脆弱的约定**（正则匹配文案，非结构化字段），只是它比 Courtwork 当前的 `classifyRuntimeError`（本探索 §6）覆盖的错误类别更多 | 具体正则规则的覆盖完整性（是否涵盖所有网关的错误文案变体）是经验性维护，非类型系统保证 |

---

## 6. 失败面：用户输入端点错误时，pi-ai 边界能区分什么

### 6.1 openai-completions 路径的底层错误来源

`app/api/openai-completions.js`（`stream()` 实现）内部用 `openai` npm SDK 的 `client.chat.completions.create(...).withResponse()`（`openai-completions.js:214-218`，`retryProviderRequest` 包一层重试，仅对可重试错误重试，`pi-ai/dist/utils/provider-retry.js:75-93`）。`openai` SDK 自己抛出**类型化**错误子类（`node_modules/openai/index.mjs:7`）：`APIConnectionError`（网络/DNS 失败——对应"bad host"）、`APIConnectionTimeoutError`、`AuthenticationError`（401）、`PermissionDeniedError`（403）、`NotFoundError`（404——对应"wrong path"/模型路由不存在）、`BadRequestError`（400）、`UnprocessableEntityError`（422）、`RateLimitError`（429）、`InternalServerError`（5xx）、`APIError`（兜底基类）。这些类在 SDK 边界是**可 `instanceof` 区分的值**。

### 6.2 pi-ai 边界把这些类"压扁"成一条字符串

`normalizeProviderError`（`pi-ai/dist/utils/error-body.js:16-30`）从 SDK 错误对象上探测 `status`（`extractStatus`，L36-46：按 `statusCode`→`status`→`$metadata.httpStatusCode`→`$response.statusCode` 顺序取第一个命中的数字字段——对 `openai` SDK 命中的是 `error.status`）与 `body`（`extractBody`/`pickBodyText`，L54-76），返回 `{status,body,message,messageCarriesBody}`——这是一个**结构化的中间对象**，`status` 字段在这里确实是可区分的数值。但紧接着 `formatProviderError`（`error-body.js:111-118`）把它**格式化成一条显示字符串**（`"<status>: <body>"` 或原样 `message`），`openai-completions.js:518` 把这条字符串直接赋给 `output.errorMessage = formatProviderError(...)`——**`AssistantMessage.errorMessage` 是一个纯字符串字段**（PV1 §2 已引用 `mapSessionEvent` 里 `errorMessage:event.message.errorMessage`，PV1/本探索均确认它在整条链路上从未被拆回结构化字段）。

**结论**：HTTP status code 在 pi-ai 内部**曾经**是结构化数值（`normalizeProviderError` 返回值），但在传给 host 之前就被塞回字符串，宿主（Courtwork）拿到的只有 `AssistantMessage.errorMessage: string`。

### 6.3 Courtwork 自己的二次分类——正则匹配字符串，非消费 pi-ai 的结构化 status

`classifyRuntimeError`（`pi-session-runtime.mjs:26-27,116-121`）：

```
NO_API_KEY_PATTERN = /no api key found/i          → "credential_missing"
AUTH_FAILED_PATTERN = /\b(401|403|unauthorized|forbidden|invalid[_ -]?api[_ -]?key|authentication)\b/i → "provider_auth_failed"
（都不匹配）                                        → "provider_error"
```

这组正则是对 `formatProviderError` 产出的**字符串**做文本匹配（其中 `401`/`403` 作为数字子串出现在格式化字符串里才能被匹配到——依赖 `formatProviderError` 恰好把 status 写进了消息前缀，`error-body.js:117` `"${norm.status}: ${norm.body}"` 这条分支）,不是消费 `normalizeProviderError` 返回的结构化 `status` 字段（那个中间对象在 `openai-completions.js` 内部就被丢弃，从未跨越 pi-ai 包边界）。

### 6.4 逐场景可区分性小结

| 用户输入错误场景 | SDK 层是否有专属类 | pi-ai 边界（`AssistantMessage.errorMessage`）是否可区分 | Courtwork `classifyRuntimeError` 是否能分出来 |
|---|---|---|---|
| bad host（DNS/连接失败） | 是，`APIConnectionError`（`openai/index.mjs:7`） | 否——降级为 `normalizeProviderError` 的 `message`（无 `status`，`extractStatus` 对连接错误通常拿不到 HTTP status），落进 `messageCarriesBody` 分支原样返回 `error.message` 文本 | 否——落入默认分支 `"provider_error"`，与其他未知错误不可区分 |
| wrong path（404） | 是，`NotFoundError` | 部分——`status=404` 会被写进格式化字符串（若 `messageCarriesBody` 为假） | 否——`404` 不在 `AUTH_FAILED_PATTERN` 也不在 `NO_API_KEY_PATTERN` 里，落入 `"provider_error"` |
| 401 | 是，`AuthenticationError` | 是——`status=401` 进入格式化字符串 | 是——`AUTH_FAILED_PATTERN` 命中 `\b401\b` |
| non-OpenAI JSON（网关返回的响应体不是 `openai` SDK 期望的 schema） | **未确认**——若 HTTP 状态码是 2xx 但 body 结构不对，`openai` SDK 的反序列化层可能抛 SDK 内部的 schema/parse 错误而非 `APIError` 子类（这类错误通常没有 `.status`）；若 HTTP 状态码非 2xx，则仍归入上述 `APIError` 家族。**本次未读 `openai` SDK 的响应解析源码来源确认这一分支**，标记为推断 | 若无 `status`，`normalizeProviderError` 的 `messageCarriesBody` 判定为真（`error.message.includes(body)`，`body` 为 `undefined` 时该表达式直接为 `norm.status===undefined` 命中，`error-body.js:23`），原样返回 SDK 的内部报错文本，通常是不含 HTTP 语义的解析错误描述 | 否——大概率落入 `"provider_error"` |
| 网关不服务某个 model id | **未确认**——依赖具体网关实现（有的按 400，有的按 404，见 §4.3 "陈旧"讨论） | 与上面 404/400 情形相同——若网关返回结构化 OpenAI 风格错误体，`status`/`body` 均可提取；若网关返回非结构化文本，则退化为纯 `message` | 否，除非文案恰好命中现有两条正则 |

**明确的空白**：pi-ai 在这一条链路上**不存在**一个类似 DeepSeek Harness `HarnessError{code}`（§5）的、provider 中立的结构化错误码体系；`ModelsError{code:"oauth"|"auth"}`（`pi-ai/dist/auth/resolve.d.ts:3`）只覆盖**凭据解析阶段**（`resolveProviderAuth` 失败、`CredentialStore` 读写失败）的两种错误，**不覆盖**请求阶段（HTTP 4xx/5xx、网络错误、响应体不合规）的任何分类——请求阶段的一切都被 `normalizeProviderError`/`formatProviderError` 拍扁成一条对人类可读、对机器不可区分（除非二次正则）的字符串。

---

## 附：本次读取的关键新文件（PV1/PV2 未读或未展开）

- `pi-coding-agent/dist/core/model-runtime.js`（601 行，全文读取）+ `.d.ts`
- `pi-coding-agent/dist/core/provider-composer.js`（401 行，全文读取）+ `.d.ts`
- `pi-coding-agent/dist/core/runtime-credentials.js`（38 行，全文读取）
- `pi-ai/dist/models.js`（422 行主体 + 尾部 `calculateCost`/`getSupportedThinkingLevels`/`clampThinkingLevel`，全文读取）
- `pi-ai/dist/api/lazy.js`（全文读取，确认 `lazyStream` 的同步调用时点）
- `pi-ai/dist/utils/error-body.js`（全文读取）
- `pi-ai/dist/auth/types.d.ts`、`pi-ai/dist/auth/resolve.d.ts`（全文读取）
- `node_modules/openai/index.mjs:7`（错误类导出清单，未展开各子类构造逻辑）
- `Courtwork/app/server/runtime.mjs`（全文读取，启动顺序）
- `Courtwork/app/server/service.mjs:130-195`（`RuntimeService` 构造与 `initialize()` 前段）

**未回答/未确认的问题**（明确列出，供 Fable 判断是否需要追加探索）：
1. `maxTokens`/`input` 在 `api/openai-completions.js`/`openai-responses.js` 请求体装配阶段的具体消费方式（是否为 `undefined` 时省略字段、发送 `null`，还是抛错）——未展开该文件全部 1356 行。
2. `openai` SDK 对"HTTP 2xx 但响应体非预期 schema"（non-OpenAI JSON）的具体抛错类型/是否携带 `status`——未读该 SDK 的响应解析源码。
3. DeepSeek Harness 侧"进程启动时按什么顺序把每条 route 注册进一个运行时 `Models`/`ModelRuntime` 实例"的编排代码位置——`packages/llm/llm-pi-ai/src/` 内只找到装配函数，未找到调用入口。
4. `pi-ai` 各 API 实现（`api/*.js`）内部是否有任何一处读取 `Model.contextWindow` 做本地截断/校验——本次只确认了 pi-ai 顶层 `models.js` 的三个公开函数不读它，未逐个 provider 实现文件排查。

（全文完，未提出任何设计建议，未生成任何 schema 提案。）
