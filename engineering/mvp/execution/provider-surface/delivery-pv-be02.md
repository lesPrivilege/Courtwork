# 交付 WO-PV-BE02：连接身份与发现模型准入（薄切片）

作者：Claude Opus（本单唯一 writer）。作者验证，非独验；独验与合流归 Astra。
日期：2026-09-10。树：`/private/tmp/se-agent-pvbe02`，分支 `claude/pv-be02-connections`。
全程 local-fake / loopback，未联网，未读取任何凭据文件。

## 1. 基线与提交

| 项 | 值 |
|---|---|
| 基线 SHA | `b4e3f719ff6b4a6853b4f246d85c91dc49693d29`（本 worktree 的 `main` 头，`docs: hand the interaction grammar inputs to CC-I`） |
| 工单所写基线 | `ee6df72` 或其后 main 头 —— 与本树不一致，见 §8 待裁定 ① |
| 分支 | `claude/pv-be02-connections` |
| 提交 | 见 §1.1 |

### 1.1 commit 表

| SHA | 标题 |
|---|---|
| `d4b5fa6` | `feat: make a provider connection the unit of identity, credential and admission` |
| （分支 HEAD） | `docs: record the BE02 commit SHA on the delivery page` —— 本页自身的提交，SHA 见 `git log` |

均为显式路径 `git add`，无 `git add -A`。作者验证的三条命令跑在 `d4b5fa6` 的树上；HEAD 这条只改本页。

## 2. 改动文件

| 文件 | 性质 | 做了什么 |
|---|---|---|
| `app/server/provider-connections.mjs` | 新增 | 连接记录的形状、身份派生、输入校验、`registerProvider` 入参装配、凭据键迁移。纯函数，无 store / ModelRuntime / 凭据依赖 |
| `app/server/service.mjs` | 改 | 连接注册表、连接 CRUD、连接作用域凭据、连接感知的三层校验、run 记录溯源、未知窗口的压缩策略 |
| `app/server/store.mjs` | 改 | schema 8 → 9：`providerConnections` 入 state 并逐字段校验；`run.provider` 增四个仅 run 作用域的溯源字段 |
| `app/server/credential-file.mjs` | 改 | 键语义改为连接 id；新增 `replaceCredentialFile`（迁移一次性重写） |
| `app/server/index.mjs` | 改 | `/api/v5/provider-connections` 四条路由 |
| `app/runtime/pi-session-runtime.mjs` | 改 | `registerConnectionProvider` / `unregisterConnectionProvider` / `credentialSourceOf` 三个运行期接缝 |
| `app/runtime/fake-provider.mjs` | 改 | loopback fixture 增 `GET /v1/models`，使兼容连接的"发现 → 保存 → 跑"能全程在 loopback 上验证 |
| `app/docs/runtime-foundation.md` | 改 | 新增 "Provider connections (WO-PV-BE02)" 一节；订正 BE-17/18 节末尾"保存兼容 provider 仍不被支持"的旧陈述 |
| `app/tests/provider-connections.test.mjs` | 新增 | 10 条用例，见 §6（全量 456 条中的 10 条） |
| `app/tests/*.test.mjs`（15 个）与 `app/tests/fixtures/async-loop/host-child.mjs` | 改 | 凭据端点字段 `provider` → `connectionId`；schema 断言与迁移用例按 9 更新（造旧 state 的用例补 `delete …providerConnections`）。均为契约更新，无一处放宽断言 |

未改：`app/web/**`、`app/core`、`app/extensions`、`domains`、`brand`、`intake.md`、任何 `contracts/*`。

## 3. 字段与迁移表

### 3.1 连接记录（持久化在 `runtime-state.json` 的 `providerConnections`）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | string | 目录连接 `catalog-<providerId>`；用户连接 `conn-<12 hex>`。**这就是 `credentials.json` 的键** |
| `kind` | `catalog` \| `compatible` | |
| `providerIdentity` | string | 运行期 provider id。目录连接 = 目录身份（`openai` / `deepseek` / `fake-openai-loopback`）；用户连接 = 连接 id 本身，与目录闭集天然不重叠（PV-31） |
| `api` | string | `openai-completions` \| `openai-responses` |
| `baseUrl` | string \| null | 目录连接为 `null` |
| `models` | `[{id, contextWindow}]` | `contextWindow` 未知时为 `null`，不猜值 |

服务层返回时另加两项派生值，均不持久化：每个模型的 `contextWindowSource`（`catalog` / `user` / `unknown`）与连接的 `credentialStatus`。`credentialStatus` 不落记录是刻意的——凭据文件是"有没有 key"的唯一真相，落进记录会造第二个真相源（见 §8 待裁定 ⑨）。

### 3.2 run 记录新增（`run.provider`，仅 run 作用域，`providerConfig` 形状不变）

| 字段 | 值 |
|---|---|
| `connectionId` | 这次用的连接 id |
| `credentialSource` | 取自 `ModelRuntime.getProviderAuthStatus(...).source`，不自造分类（PV-33）；未配置时 `null` |
| `contextWindowSource` | `catalog` / `user` / `unknown` |
| `capabilityNotice` | 窗口未知时为 `context window unknown, compaction disabled`，否则 `null` |

`providerConfig`（`PUT /provider-config` 的请求体与持久化形状）保持 `{provider, model, api, baseUrl?, reasoningEffort?}` 不变。

### 3.3 迁移

| 迁移 | 从 | 到 | 处置 |
|---|---|---|---|
| state schema | 8 | 9 | 打开时一次性升级，`providerConnections` 置空数组后由 `initialize()` 播种三条目录连接；原始字节存 `runtime-state.schema8.<sha256>.json` |
| 凭据键空间 | `{ "<providerId>": key }` | `{ "<connectionId>": key }` | 启动时一次性重写：`openai` → `catalog-openai`、`deepseek` → `catalog-deepseek`、`fake-openai-loopback` → `catalog-fake-openai-loopback`；不命名任何连接的键**丢弃**。两类都写日志（`startup: migrated credential key … to connection …` / `startup: dropped N credential key(s) naming no connection: …`） |
| HTTP 字段 | `PUT/DELETE /provider-credential {provider}` | `{connectionId}` | 破坏性改动，不留兼容层。旧字段现在 400 |

## 4. 三层校验对照表

| 层 | 位置 | 对连接施加什么 |
|---|---|---|
| HTTP 输入 | `provider-connections.mjs: validateConnectionInput`；`service.mjs: #saveProviderConnection` / `#setProviderConfig` / `validateProviderDescriptor(value, this.#knownIdentities())` | 字段闭集（`api` / `baseUrl` / `models` / `apiKey`）；`api` 必在 `API_FORMATS`；`baseUrl` 只允许 http(s)、无 userinfo / query / fragment / 空白；模型 id 非空、≤240 字符、无控制字符、不重复；`contextWindow` 缺省或正安全整数；`provider-config` 的身份必须是已存连接，用户连接的 `api` 必须等于连接的 `api`、`baseUrl` 必须等于连接的 `baseUrl`、`model` 必须在该连接自己的模型列表里 |
| Run 发起复核 | `service.mjs: #createRun` | 连接仍存在；用户连接分支复核 `api` / `baseUrl` / 模型仍在连接列表 / `modelRuntime.getModel` 仍解析；目录连接分支维持原有 `API_FORMATS` + `getModel` + DeepSeek 非目录格式必须带 `baseUrl`。任一不成立 → 503 `provider_unsupported`（不是 400） |
| 持久化层 | `store.mjs: validateConnections` / `validateDescriptor` | 连接记录字段闭集；`id` 与 `providerIdentity` 各自唯一；`kind` 闭集；`baseUrl` 形状复核；模型 id 唯一、`contextWindow` 为 `null` 或正整数；`compatible` 必须有 `baseUrl` 且模型列表非空；`run.provider` 的四个溯源字段只在 run 作用域（`allowRealProvider`）且 schema ≥ 9 时被接受 |

保存失败的三类区分（PV-34）：

| 类 | 判据 | 返回 |
|---|---|---|
| 认证失败 | 探测 `status === 'authentication_failed'` | 400 `connection_authentication_failed`，`error.status` 原样带回探测枚举值 |
| 目录不可达 | 探测 `status` 非 `ok` 的其余各值（`unreachable` / `timeout` / `http_error` / `unsupported` / `redirect_rejected` / `malformed_directory` / `response_too_large`） | 400 `connection_directory_unavailable`，同样带 `error.status` |
| 模型不在该目录 | 探测 `ok` 但选中的模型 id 不在返回的 `data` 里 | 400 `connection_model_not_in_directory`，`error.models` 列出缺席的 id |

## 5. 未知能力的呈现原文

窗口未知时，`GET /api/v5/provider-config` 的 `capability` 与 run 记录的 `provider.capabilityNotice` 都给出同一句，逐字：

```
context window unknown, compaction disabled
```

对应的完整 `capability` 对象：

```json
{"contextWindow":null,"contextWindowSource":"unknown","compactionEnabled":false,"notice":"context window unknown, compaction disabled"}
```

用户填入窗口后：

```json
{"contextWindow":8192,"contextWindowSource":"user","compactionEnabled":true,"notice":null}
```

`GET /api/v5/provider-models` 对这类模型不填 `contextWindow`（字段缺席，不是 `128000` 一类兜底值），`supportedEfforts` 为 `["off"]`——因为 `reasoning: false` 是唯一诚实的取值，不是宿主对"这个模型会不会推理"的判断。

## 6. 新增用例原文

`app/tests/provider-connections.test.mjs`，10 条，全部通过：

| 标题（原文） |
|---|
| `PV-32 · 旧 credentials.json 的 provider 键一次性迁到连接 id` |
| `PV-25 · 兼容连接：发现 → 保存 → 选中 → 真跑一次 run，run 记录读得出连接与凭据来源` |
| `PV-26 · 两条连接各持自己的 key，互不覆盖` |
| `PV-31 · 用户连接注册在独立 provider id 上，删除即注销` |
| `PV-30 · 未知 contextWindow 不猜值：关压缩并显式记录，用户填值后来源标为 user` |
| `PV-24 · 零成本的 Model 记录不会在 usage 面变成事实上的 $0` |
| `重启后连接与凭据仍可用；列表落空的连接不阻止启动` |
| `PV-34 · 保存失败区分认证失败 / 目录不可达 / 模型不在该目录` |
| `连接的增删改查受同一条配置队列与 active_run 冻结约束` |
| `T-CRED · 用户连接路径同样不读 HOME/.pi 与环境变量` |

端到端那条不是 mock：连接指向 loopback fake 的 `baseUrl`，先 `POST /provider-models/discover` 拿到目录，再把发现来的 id 存进连接，选中后真起一次 Run，断言 `status === "completed"`、`run.provider.connectionId` 等于该连接、`run.provider.credentialSource === "runtime"`，并断言 fake 收到的 `Authorization` 里是这条连接自己的 key。

## 7. 作者验证

| 命令 | 结果 | 证据 |
|---|---|---|
| `npm --prefix app ci` | 277 包，0 漏洞（依赖来自本地 npm cache；这是唯一一条可能触及 registry 的命令，测试与 smoke 全程 loopback） | `evidence/pv-be02/npm-ci.txt` |
| `npm --prefix app test` | `tests 456 / pass 456 / fail 0`，退出码 0 | `evidence/pv-be02/npm-test.txt` |
| `npm --prefix app run smoke` | `{"status":"passed","provider":"local-fake","realProvider":"not_run"}` | `evidence/pv-be02/npm-smoke.json` |
| 兼容连接端到端 | loopback fixture（fake provider 的 `GET /v1/models` + `POST /v1/chat/completions`），未联网 | `evidence/pv-be02/npm-test.txt` 内的 `PV-25` 一条 |

**真实 provider 证据：`not_run`。** 理由：凭据只在 Web UI 输入，本单不持有任何真实 key，也不读取任何凭据文件（包括 `~/.pi/agent/auth.json`）。

## 8. 待裁定

① **基线不一致**。工单写基线 `main ee6df72` 或其后的 main 头；派单给到的 worktree 基线是 `b4e3f71`。以代码为事实取 `b4e3f71`，两处都记在此。另：EX-PV1 记录的 `SCHEMA_VERSION = 7`，本树已是 8（本单升到 9）；`store.mjs` 行号相应漂移。

② **前端会有一段窗口是坏的**。`PUT/DELETE /api/v5/provider-credential` 的请求体从 `{provider, …}` 改成 `{connectionId, …}`，而 `app/web/settings-view.mjs` 仍发旧字段，因此在 BE02 合流到 WO-PV-FE01 落地之间，Settings 里的"保存 / 删除密钥"会 400。工单把前端明确划给 FE01 且禁止本单改 `app/web/**`，所以这是按裁定接受的代价，不是疏漏。请裁定：是否要 Astra 把 BE02 与 FE01 作为一次合流，还是接受这段窗口。

③ **BE-17/18 的 status 枚举只覆盖三类里的两类**。枚举里没有"模型不在该目录"这一档。本单直接消费枚举表达前两类（并把枚举值原样放进 `error.status`），第三类以服务层错误码 `connection_model_not_in_directory` 表达，没有往探测枚举里塞新值。若裁定要求第三类也进枚举，那是 `provider-preview.mjs` 的契约变更，需另开。

④ **凭据来源三档在本宿主只可能取到 `runtime`**。Courtwork 的凭据全程走 `setRuntimeApiKey`，`getProviderAuthStatus` 先命中 `credentials.hasRuntimeApiKey` 分支；`stored` 需要 `snapshot.storedProviders`（本宿主的 `InMemoryCredentialStore` 永远为空），`environment` 需要 env 兜底（启动时已被剥离）。另：该枚举实为六值（`stored` / `runtime` / `environment` / `fallback` / `models_json_key` / `models_json_command`），不是三值。本单如实记录 pi 返回的值，不裁剪成三值，也不改写。

⑤ **成本：宿主没有成本面，所以不存在把零显示成 $0 的地方**。全仓 `grep cost` 在 `app/server` / `app/runtime` / `app/core` 只命中 `fake-provider.mjs` 的模型记录一处；`usage-details` / `work-metrics` / run 记录一律只有 token 计数与 `missing` 布尔，没有任何价格字段或 `$` 文案。给用户连接的模型记录填显式零成本只为避开 `calculateCost` 对 `model.cost.tiers` 的 `TypeError`。按工单"若现有 usage 结构区分不了，如实写进待裁定，不自造字段"，本单未新增任何成本字段；新增用例 `PV-24 · 零成本的 Model 记录不会在 usage 面变成事实上的 $0` 把"没有价格面"这件事钉成断言。日后要上成本面，须先有"成本未知"的表达位，否则这条零会变成谎。

⑥ **`maxTokens` 未知时留空，工单未裁定**。`applyExtension` 不兜底（EX-PV4 §2.2），本单让它保持 `undefined`——填任何值都是宿主编造。已核：`stream()` 路径的 `if (options?.maxTokens)` 会跳过该字段，端到端 fixture 验证通过；`streamSimple` 路径的 `buildBaseOptions` 会用 `model.maxTokens`（`undefined`）去做 `clampMaxTokensToContext`，但本宿主的 AgentSession 走 `stream`，`streamSimple` 未被覆盖。若日后有走 `streamSimple` 的路径，须重新裁定。

⑦ **`models-connections.test.mjs` 的 WK-108 用例与 PV-24 现在方向相反**。该用例断言"目录报来的模型 ID 不进 Model 下拉，也不进保存的配置"，断言对象是 `app/web/settings-view.mjs` 的源码。后端已经能保存了，但前端事实未变，所以该用例仍然成立且仍然通过。它应由 FE01 改写，本单未动。

⑧ **schema 8 → 9 波及五个既有迁移用例**。`coordination` / `async-tasks` / `async-recovery-independent` / `attention-agent` / `control-plane` / `request-telemetry` / `durability` 里断言 schema 版本号或用"从当前 state 删键造旧 state"手法的用例，按新版本更新，并补上 `delete …providerConnections`。这是契约更新（版本号是事实），不是断言放宽：没有一条断言的强度被降低。

⑨ **`credentialStatus` 未持久化在连接记录上**。工单的字段表把它列进记录。本单把它作为服务层派生值返回、不落盘：凭据文件是"有没有 key"的唯一真相，落进 state 会造第二个真相源并要求两处同步。若裁定要求持久化，须一并裁定两者不一致时以谁为准。

⑩ **loopback fixture 增了一个端点**。`app/runtime/fake-provider.mjs` 新增 `GET /v1/models`。这是为了让兼容连接的完整旅程（discover → save → run）能在不联网的前提下端到端验证，属工单"兼容连接用本地 fixture 目录验证"的落点；它没有改变 fake 的对话行为。

## 9. 未检项

- 真实 provider 未跑：DeepSeek / OpenAI / 任何远端兼容网关都未接触，`not_run`（凭据只在 UI 输入）。
- `openai-responses` 格式的**兼容连接**未端到端跑：loopback fixture 只实现 chat/completions。保存与准入路径对该格式是同一条代码，但没有真实的 responses fixture 佐证。
- `registerProvider` 的 `refreshModels`、`oauth`、`headers`、`authHeader`、`compat` 分支未触及（本单不做网关完整形态，PV-D2）。
- `unregisterProvider` 只在删除连接时验证；未验证"删除后同 id 立即重建"的时序。
- 端口 8911 / 8912 **未使用**：fixture 用的是 `port: 0` 的 loopback fake 与测试内起停的临时 HTTP server，不需要固定端口，也就没有起服务占端口。
- 运行期错误分类未动（BE-38 / PV-D3）；`lastVerifiedAt` 未做（BE-28）；Vertex / ambient credentials 未做（PV-D1）；多连接并列切换与连接管理页未做。
- 未读取任何凭据文件；未联网；未改动本树以外的任何目录。
