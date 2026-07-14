# SPEC: packages/provider

状态：PROVIDER-1 / PROVIDER-2 / TURN-WORK-1 均已独立验收并合流；notice 已进入 stream → Turn → Work 单一真源

## 职责

唯一 provider 边界：provider port、OpenAI Chat Completions adapter、SSE 归一、结构化输出降档、能力 profile、定价与当期 DeepSeek 产品登记。不得依赖 core、desktop、垂类包或 demo-data。

## USAGE-LEDGER-1 · 已知缺口

- 当前 `provider-stream.ts` 归一化只保留 input/output token，DeepSeek wire 已提供的 cache hit、cache miss 与 reasoning token 会被丢弃；实现前须由架构角色冻结通用可选槽位，并同步 adapter、HTTP/SSE、ScriptedProvider、Turn 持久与消费点。
- 当前 `estimateCostUsd` 返回没有价目表版本、假设或“估算”判别的裸数。后续输出必须同时保存原始 usage、price table 版本/生效时间与 assumptions；历史记录不得用新价格静默重算为旧账单真值。
- usage 缺失表示 unknown，不表示 0；失败/取消竞态必须有反例。价格、峰谷时段与别名日期不写入本 SPEC，更新只以当期官方 catalog/price table 与独立验收为准。

## TURN-WORK-1 · notice 进入统一 stream

权威：[ADR-007](../../docs/decisions/ADR-007-provider-turn-protocol.md) 与
[ADR-009](../../docs/decisions/ADR-009-runtime-ports-and-harness.md)。

- `ProviderStreamEvent` 增加 `notice`，承载闭集 `GenerationNotice`；只允许在 `started` 后、终态前出现。
- structured-output/deep-reasoning 降档必须从真实 `stream()` 发布 notice；`generate()` 只聚合同一 stream，删除按 request 重算与 scripted side map。
- `runTurn` 校验 notice 形状与同 code 去重，并把 notice 写入 `provider_notice` 瞬态事件和 completed/failed `PersistedTurn`。
- 本单不得改 DeepSeek catalog、Rust transport 帧、credential、OpenAI wire、定价、产品 provider 范围或引入第三方 runtime。

验收必须注入：started 前 notice、重复 code、未知/畸形 notice、terminal 后 notice，均收敛为单一
`invalid_response`；合法降档在 stream → Turn → Work artifact 三层同值且一次网络/脚本消费；failed Turn
仍保留终态前 notice。实现与验收异会话。

## PROVIDER-1 · 抽包与 DeepSeek-first

实现范围：

1. 新建 workspace 包，把 `packages/core/src/provider/` 中通用类型、错误、OpenAI adapter、HTTP/SSE、结构化输出、pricing、smoke 与 DeepSeek profile 迁入；保留 git 源流。core 改为消费新包，必要时可做薄重导出，但不得保留第二份实现。
2. 用 registry/descriptor 暴露 provider；产品注册表当期只含 DeepSeek。provider id 通过注册表校验，不把 `'custom'` 固化进公共联合类型。
3. desktop 的普通产品入口只保留 DeepSeek API key、模型与 reasoning 选择；移除 custom provider 和可编辑 base URL，不再猜测结构化输出或推理字段。保留未来 descriptor 驱动的扩展席位，不造禁用 provider 卡片。
4. 当批不改 Rust 请求生命周期、不实现 Tauri 真流、不改 turn/session 事件；这些属于 PROVIDER-2 与 TURN-1。

验收：

- import boundary 测试能以反例证明 provider 包不依赖 core/desktop/vertical/demo，core 生产代码不再含 DeepSeek wire 分支；
- 既有 OpenAI wire、SSE、structured-output、pricing、reasoning route 与 smoke 测试迁移后全绿，并有 custom profile/任意 base URL 不进入产品注册表的触红测试；
- desktop 不再显示或提交 custom/base URL；key 仍只写钥匙串且 JS 无读回明文路径；
- `pnpm -r build`、`pnpm lint`、`pnpm test` 与隔离端口 desktop 全量 Playwright 实跑；由不同会话独立验收。

### PROVIDER-1 实现留痕（2026-07-13）

- `@courtwork/provider` 已成为唯一实现位置：provider port、错误、ScriptedProvider、OpenAI Chat Completions adapter、HTTP/SSE、结构化输出、计价、smoke 与 DeepSeek quirk 均从 core 迁入；core 内部直接消费新包，`src/provider-compat/` 只保留三个显式薄重导出以兼容既有 `@courtwork/core/provider-*` ABI。
- `registry.ts` 以 descriptor 登记产品 provider；`ProviderId` 从 `PRODUCT_PROVIDER_IDS` 推导，当期闭集仅 `deepseek`。未知 id、`custom` 与任意 URL 不会得到能力 profile，也不能进入 chat 组装。
- desktop 直接消费新包的浏览器安全子路径；遗留 `custom/baseUrl` 本地配置回落 DeepSeek 默认值。凭证引导和 Settings 不再渲染 provider selector 或 Base URL，仍保留钥匙串 key、模型发现/手填与 standard/deep reasoning。
- `package-boundary.test.ts` 同时扫描 manifest/生产源码，并以注入的 core/demo 反例自证；另锁 core provider 目录只能是薄重导出。原 OpenAI wire、SSE、structured-output、pricing、reasoning route、smoke 与 ScriptedProvider 测试随源码迁移。
- 本批明确未修改 `apps/desktop/src-tauri/`：Rust 仍携旧 base URL/custom 兼容注释与请求形态，统一 descriptor 解析、真实逐帧流和连接状态正交继续属于 PROVIDER-2。

## PROVIDER-2 · 单一请求路径与真实流

### 权威端点与 Rust 边界

- 新增单一机器源 `packages/provider/catalog/deepseek.json`，至少声明 id、HTTPS base URL、models 与 chat/models 路径。TS descriptor 与 Rust 用同一文件生成/嵌入，drift 测试必须可触红；Rust 不维护第二份字符串常量。
- WebView 的 probe/chat command 只提交 `requestId`、`providerId`、`modelId`、reasoning 参数与已组装请求 body，永不提交 URL/header/key。Rust 只接受 catalog 中的 providerId，从 descriptor 解析固定端点；删除 verified arbitrary base URL 状态与 custom host 放行。
- probe 与正式调用复用同一个 Rust client/endpoint/auth/error classifier。Rust 负责钥匙串取 key、目标约束、HTTP 状态与原始字节传输，不解析 `reasoning_content` 或其他 provider delta 字段。

### 两层流协议

Rust 通过 Tauri channel 发布私有 transport 帧，保留跨 UTF-8 chunk 边界的原始字节：

```ts
type ProviderTransportEvent =
  | { type: 'response_started'; requestId: string; status: number; contentType?: string }
  | { type: 'chunk'; requestId: string; bytes: number[] }
  | { type: 'end'; requestId: string }
  | { type: 'failed'; requestId: string; kind: ProviderFailureKind; message: string; retryable: boolean };
```

`@courtwork/provider` 使用 streaming `TextDecoder` + 增量 SSE parser 归一为公共事件；每个 request 的 `seq` 从 0 单调递增，恰有一个终态，终态后不得再发 delta：

```ts
type ProviderFailureKind =
  | 'auth' | 'rate_limit' | 'endpoint' | 'model' | 'timeout'
  | 'network' | 'protocol' | 'invalid_response' | 'canceled';

type ProviderStreamEvent =
  | { type: 'started'; requestId: string; seq: number; providerId: string; modelId: string }
  | { type: 'notice'; requestId: string; seq: number; notice: GenerationNotice }
  | { type: 'reasoning_delta'; requestId: string; seq: number; delta: string }
  | { type: 'content_delta'; requestId: string; seq: number; delta: string }
  | { type: 'usage'; requestId: string; seq: number; inputTokens: number; outputTokens: number }
  | { type: 'completed'; requestId: string; seq: number; finishReason: 'stop' | 'length' | 'content_filter' | 'unknown' }
  | { type: 'failed'; requestId: string; seq: number; kind: ProviderFailureKind; message: string; retryable: boolean };
```

provider port 新增可取消的 `stream(request): AsyncIterable<ProviderStreamEvent>`；既有 `generate()` 只作为聚合兼容层消费该 stream，不得另走第二条 HTTP 路径。正常 EOF 前没有 `[DONE]`、终态时正文为空、非法 JSON/SSE、重复终态、取消竞态都必须结构化失败。

### TURN-WORK-1 实现留痕（2026-07-14）

- OpenAI-compatible structured 路径与 ScriptedProvider 都在 `started` 后从公开 stream 发布 notice；`generate()` 只聚合该事件，原请求参数重算与 request side map 已删除。
- core Turn 对 notice 外层/内层精确形状、当前闭集 code 与同 code 去重做运行时校验；合法 notice 机械转发为 `provider_notice`，并进入 completed/failed 终态快照。
- 合成 downgrade profile 锁定 stream 与 generate 同值、单请求；ScriptedProvider 锁定脚本 notice 不再走旁路。本节只记录实现，不构成验收放行。
- 实现会话定向门禁：provider 12 files / 88 tests，build/catalog check 与 ESLint 均通过；未修改 DeepSeek catalog、Rust、credential 或产品 provider 范围。

`started` 固定是 provider 请求生命周期的 `seq: 0`，不是 HTTP 2xx 的同义词；因此 401/429/5xx、transport network 与 cancel 也必须先发布一次 `started`，再发布闭集 `failed`。私有 `response_started` 只完成 transport handshake，成功路径不得再发布第二个 `started`。

### 凭证与连接状态

用一个 view model 正交表达：

```ts
type ProviderReadiness = {
  credential: { phase: 'absent' | 'stored'; source?: 'pasted' | 'environment' };
  connection: {
    phase: 'unverified' | 'verifying' | 'ready' | 'failed';
    failKind?: ProviderFailureKind | 'platform';
    failureMessage?: string;
    models?: string[];
    modelDiscovery?: 'available' | 'unsupported';
  };
};
```

保存 key 只能进入 `stored + unverified`；只有本次 probe 成功才进入 `ready`。更换 key/model、清除凭证、应用重启均使连接回到 unverified；不得把“钥匙串可读”显示成“服务已连接”。JS 无 secret 读回路径不变。

### 验收

- Rust mock server 分片发送一个汉字的 UTF-8 字节、reasoning/content 多帧、usage 与 `[DONE]`，前端按原顺序实时收到；首个 delta 必须在服务器释放终帧前可观察，证明未聚合 body；
- 注入 arbitrary URL/providerId、endpoint catalog drift、异常 EOF、空正文、非法 SSE、401/429/5xx、timeout/network 与 cancel race 均触发预期闭集终态；日志/错误不含 URL、body、key；
- `generate()` 与 stream 聚合结果一致且只产生一次网络请求；DeepSeek quirk 仍只在 provider 包；
- key 保存/重启/换模型/探针成功失败的双状态测试与 UI 文案实测；
- Rust、provider、desktop 定向测试，`pnpm -r build`、`pnpm lint`、`pnpm test`、隔离端口完整 desktop Playwright；不同会话独立验收。

### PROVIDER-2 实现留痕（2026-07-13）

- `catalog/deepseek.json` 成为端点与推荐模型的单一机器源；生成脚本产出 TS descriptor，Rust 通过 `include_str!` 内嵌同一文件。生成检查和源码扫描会对 descriptor drift、手写端点常量触红。
- WebView probe/chat 入参已收窄为 request/provider/model/reasoning/body，Rust wire 使用 `deny_unknown_fields` 拒绝 URL/header/key 注入；生产端点只由 catalog providerId 解析，旧 verified arbitrary base URL/custom host 准入已删除。
- Rust 复用 catalog、HTTP client、鉴权与 HTTP 闭集分型，通过 Tauri `Channel` 只发送 `response_started/chunk(bytes)/end/failed`；不读取完整 body，也不解析 reasoning/content。请求从发起前即可取消，取消竞态只落一个 `canceled` 终态。
- provider 包以 streaming `TextDecoder` 和增量 SSE parser 归一公共事件；覆盖 UTF-8 跨 chunk、首 delta 先于终帧、异常 EOF、空正文、非法 SSE/JSON、重复终态和取消竞态。公开 `generate()` 只聚合公开 `stream()`，单路径测试锁定一次 transport 请求。
- readiness 已迁移为 credential/connection 正交状态：保存只到 `stored + unverified`，probe 期间 `verifying`，成功才 `ready`；换 key/model/reasoning、clear 与进程重启均撤销 ready。JS 仍无 secret 读回路径。
- 本节只记录实现证据，不构成放行；Rust、provider、desktop 与全仓门禁由本实现会话实跑，最终仍须不同会话在 clean worktree 独立验收并写入对应 `ACCEPTANCE.md`。
- 2026-07-14 阻塞修复：`normalizeProviderTransport` 在读取 transport 前发布唯一 lifecycle `started`；HTTP/transport 失败不再因缺失首事件被 core 重分型为 `invalid_response`。401/network 反例锁定 `started(seq 0) → failed(seq 1)`，公开 union 与字段未改。
