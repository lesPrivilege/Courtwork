# SPEC: packages/provider

状态：ADR-007 已接受；PROVIDER-1 已实现，待独立验收

## 职责

唯一 provider 边界：provider port、OpenAI Chat Completions adapter、SSE 归一、结构化输出降档、能力 profile、定价与当期 DeepSeek 产品登记。不得依赖 core、desktop、垂类包或 demo-data。

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

在 PROVIDER-1 独立验收并合流后启动：Rust 从受控 descriptor 解析 DeepSeek 固定端点，探针与正式调用共享同一 wire builder；凭证与连接状态正交。通过 Tauri channel 逐帧发布 `started | reasoning_delta | content_delta | usage | completed | failed`，删除 `.text()` 聚合和 UI 模拟打字。取消、空正文、异常 EOF 与错误分型必须有可注入反例。
