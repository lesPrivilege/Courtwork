# PROVIDER-1 独立验收报告

验收日期：2026-07-13

验收角色：独立验收会话

实现提交：`7450819`（父提交 `5462989`）

前向合并：`f3aaea3`（合入当时 `main`：`dd4f19a`）

## 结论

**放行。** `@courtwork/provider` 已成为 provider 实现的唯一归宿；本批没有发现契约级或实现级阻塞，也没有验收修复提交。验收报告提交可直接合入 `main`。

PROVIDER-1 的六项验收面均通过：包边界与 core 兼容层、既有 OpenAI 行为迁移、DeepSeek-only 产品注册表、desktop 产品入口、钥匙串明文边界，以及 Rust/turn/interaction/schema/vertical 零越界。

## 合并与范围核对

- 从实现 tip `7450819` 建立独立 worktree/验收分支，再前向合并 `main@dd4f19a`。
- 仅 `apps/desktop/SPEC.md` 与 `packages/core/SPEC.md` 出现文档冲突；机械保留双方有效记录后生成 merge commit `f3aaea3`。没有产品代码冲突。
- `7450819` 未修改 `apps/desktop/src-tauri/`、`packages/schemas/`、`packages/legal/`、`packages/pm-schemas/`、`packages/registry/src/` 或 ADR；因此 Rust、turn/interaction、schema 与 vertical 契约均无 scope creep。
- git rename 检测确认原 provider 实现与测试均保留源流：除 `types.ts` 因注释归宿更新为 97% 相似外，HTTP、OpenAI adapter、SSE、structured output、pricing、quirks、smoke、scripted provider 与错误类型均为 100% rename。

## 逐项验收

### 1. 唯一实现与依赖边界

**通过。** `packages/provider/package.json` 的运行时依赖只有 `zod`；生产源码不引用 core、desktop、legal/vertical、demo-data 或 registry 包。原 `packages/core/src/provider/` 已无生产实现。

core 只留下三个兼容入口，且每个文件只有一条纯重导出：

- `provider-openai.ts` → `@courtwork/provider/openai`
- `provider-quirks.ts` → `@courtwork/provider/quirks`
- `provider-types.ts` → `@courtwork/provider/types`

core barrel 也直接消费新包子路径，不存在 DeepSeek wire 或第二份实现。

现场反例：临时向 `packages/provider/src/errors.ts` 注入 `@courtwork/core` import 后，`package-boundary.test.ts` 的生产源码扫描按预期失败，并准确报告 `errors.ts references @courtwork/core`；恢复后 package 测试全绿。

### 2. OpenAI wire 与行为迁移

**通过。** 迁移保留了 OpenAI Chat Completions wire、HTTP 错误分型、SSE 分帧/异常 EOF、structured-output 降档与重试、pricing、reasoning route、smoke env 解析和 ScriptedProvider 行为。相关源码与测试均保持 rename 源流；`@courtwork/provider` 实跑 **10 files / 72 tests** 全部通过。

desktop chat 只导入新包的浏览器安全子路径，继续由同一 adapter 组装请求和解析 SSE；完整 E2E 的成功轮、失败分型、单飞行与 reasoning 展示均通过。

### 3. DeepSeek-only 产品注册表

**通过。** `ProviderId` 从 `PRODUCT_PROVIDER_IDS` 推导，当期闭集只有 `deepseek`；descriptor 固定官方 `https://api.deepseek.com/v1`、reasoning route 与 structured-output capability。`custom`、未知 id 和任意 URL 都不会获得 descriptor。

现场反例：临时把 `custom` 加入 `PRODUCT_PROVIDER_IDS` 后，registry 测试 **2/2 变红**，分别击中“唯一 DeepSeek”与“拒绝 custom”断言；恢复后全绿。任意 URL 的拒绝断言也在正向测试中通过。

### 4. Desktop 产品入口

**通过。** `ModelConfig` 只含受控 `providerId`、`modelId`、reasoning 和发现模型，不含 `baseUrl`；旧本地存储中的 `custom/baseUrl` 不能进入有效配置。凭证引导与 Settings 不显示 provider selector、custom 或可编辑 Base URL。E2E 专项明确通过：产品配置只显示 DeepSeek key/model/reasoning。

阶段性边界如实记录：PROVIDER-1 没有改 Rust。连接探针在 PROVIDER-2 前仍接收由受控 descriptor 推导的固定 DeepSeek `baseUrl`，chat 桥也仍传 adapter 生成的固定 URL；用户不能显示、编辑或提交 custom URL。这是 SPEC 已声明的迁移桥，不是本批阻塞；Rust 内部旧 custom 注释与 descriptor 解析归 PROVIDER-2 清账。

### 5. 凭证明文边界

**通过。** WebView 只有保存凭证、读取无密钥状态、清理凭证、探针与 chat 窄桥；Tauri command 表没有读取明文凭证的命令。JS 保存时把用户当次输入交给 Rust 写钥匙串，但没有明文读回路径。

chat adapter 使用无敏感性的 `__keychain__` 占位符；桥接层丢弃全部 headers，只向 Rust 发送 URL/body。真实 Bearer 由 Rust `active_secret()` 从钥匙串读取后注入，状态响应不序列化 secret。E2E“页面存储或运行输出不含凭证”用例通过。

### 6. 全量门禁

在合入当前 `main` 后、独立端口上实跑：

| 门禁 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 13 workspace projects，成功 |
| `pnpm --filter @courtwork/provider test` | **10 files / 72 tests** 通过 |
| `pnpm -r build` | **12/12** 有 build 脚本的 workspace 通过；desktop Vite 生产构建通过 |
| `pnpm lint` | 通过，零 error |
| `pnpm test`（build 后顺序实跑） | **106 files / 856 tests** 通过 |
| desktop 完整 E2E，独立端口 15412 | 前置 guards 全部通过；**198/198，1 worker，3.2m** |

冷 worktree 首次把 `pnpm test` 与 `pnpm -r build` 并行启动时，测试在依赖包 `dist` 尚未生成前出现 36 个 package-entry 解析失败、588 个已加载测试通过；build 完成后按正确顺序重跑即得到 856/856。没有产品断言失败。

工单给出的 `pnpm --filter @courtwork/desktop test:e2e -- --workers=1` 已完整执行并通过 198/198，但 pnpm 将其展开成 `playwright test "--" "--workers=1"`，Playwright 实际用了 4 workers。为满足单 worker 的验收语义，随后从同一 `test:e2e` 脚本入口执行 `pnpm --filter @courtwork/desktop test:e2e --workers=1`；没有绕过任何前置 guard，输出明确为 `Running 198 tests using 1 worker`，最终 198/198 通过。

## 最终判定

- PROVIDER-1：**放行**。
- 实现级修复：无。
- 契约级问题：无。
- 可否合入 `main`：**可以**；应连同前向 merge 与本验收报告一起合入。
- 后续边界：Rust descriptor 解析、单一请求路径与真实逐帧流仍严格留给 PROVIDER-2。

---

# PROVIDER-2 独立验收报告

验收日期：2026-07-13

验收角色：独立验收会话

实现提交：`6d7851e`（基线 `main@896e6bf`）

验收分支修复：`0fa585e`、`753e5e3`、`87eeda8`

## 结论

**带验收修复放行。** 原始实现 `6d7851e` 单独存在三项实现级协议缺陷，不应单独合入；三枚 `fix-by-acceptance` 均不改变 ADR/SPEC 或公开类型，修复后全量门禁通过。`codex/accept-provider-2` 的完整提交链可合入 `main`。

没有发现契约级问题。实现没有进入 Turn、Interaction、schema、registry 或 vertical 契约；现有 core 变化只为 Provider port 新增 `stream()` 后补齐 acceptance/test fake。

## 逐项验收

### 1. Catalog 单源与端点边界

**通过。** `packages/provider/catalog/deepseek.json` 是唯一机器源，声明 id、HTTPS base URL、推荐模型及 chat/models 路径。TS descriptor 由脚本生成；Rust 使用 `include_str!` 内嵌同一 JSON。手写 `quirk-profile.ts`、`registry.ts` 与 Rust 生产源码没有 DeepSeek 端点字面量。

现场把生成 TS 的 base URL 改成攻击者地址后，`pnpm --filter @courtwork/provider catalog:check` 明确失败并报告 generated descriptor drift；恢复后 build 中同一检查通过。

现场再临时放开 Rust `catalog_for()` 的 providerId 比对，`embedded_catalog_rejects_arbitrary_provider_ids` 立即变红；恢复后 Cargo 全绿。生产 handler 只从 catalog 解析 URL，旧 verified arbitrary base URL/custom host 状态已经删除，当前 verified binding 只保存 providerId/modelId。

### 2. WebView 窄入参与 Rust 权威字段

**通过（含验收修复）。** probe/chat invoke 入参只有 requestId、providerId、modelId、reasoningBody 与 chat body；没有 URL、headers、Authorization 或 key。Rust input 使用 `deny_unknown_fields`，现场/既有测试确认注入 `url`、`headers`、`apiKey` 均拒绝。key 仍只由 Rust 从钥匙串读取并用 `bearer_auth` 注入；Channel、错误、日志和 readiness 不含 URL/body/key。

验收发现原始实现把 `reasoningBody` 最后合并，伪造的 `model` 或 `stream` 可覆盖 Rust 控制字段。现场把 `{"model":"forged-model","stream":false}` 注入真实 mock-server 用例后，`stream:true` 断言按预期变红。`87eeda8` 改为先合并可选推理参数，再由 Rust 最后写入 catalog 绑定 model、固定 probe 消息/限额和 stream；真实 mock-server 与 Cargo 25/25 复验通过。

### 3. Rust raw Channel 真分片

**通过。** Rust `ProviderTransportEvent` 只发布 `response_started | chunk(Vec<u8>) | end | failed`，使用 `reqwest::Response::bytes_stream()` 逐块转发，不调用 `.text()`，也不解析 reasoning/content delta。probe 与 chat 共用 catalog、HTTP client、Bearer 注入及 HTTP 闭集分型。

Rust mock server 把汉字“法”的 UTF-8 三字节跨两次 socket 写入并延迟终片；Rust 至少收到两个 raw chunk，拼接后字节仍可还原“法”。Provider 层的 terminal gate 测试在释放 `[DONE]/end` 前已经观察到首个 `content_delta`，证明公共流没有等待终帧聚合。

401/403 → auth，429 → rate_limit，400/422 → model，404/5xx → endpoint；连接/流读取的 timeout/network 与取消在 Rust 侧均进入闭集 failed。取消发生在 response headers 前时只产生一个 canceled 终态。

### 4. Provider 增量 SSE 与公共事件

**通过（含两枚验收修复）。** Provider 使用 streaming `TextDecoder` 和增量 SSE parser，reasoning/content/usage 保持原序；requestId 一致性、从 0 单调递增的 seq、`[DONE]`、空正文、异常 EOF、非法 JSON/SSE、状态码和取消竞态都收敛到唯一 `completed | failed`。

验收新增两个失败反例：

1. 非法 UTF-8 `0xff` 原会被替换成 `�`，最终错误产生 `completed`。`0fa585e` 启用 fatal UTF-8 解码，并将错误归为唯一 protocol 终态。
2. fetch/CLI transport 原会隐藏明确的非 SSE Content-Type，使 `application/json` 响应被当作 SSE 成功。`753e5e3` 保留实际 Content-Type，让 normalizer 按 invalid_response 拒绝；旧测试夹具同步声明真实 `text/event-stream`。

修复后 Provider **12 files / 84 tests** 全绿。UTF-8 跨 chunk、首 delta 早于终帧、异常 EOF、空正文、非法 SSE/JSON、401/403、429、400、500/503、timeout、network、cancel race 与密钥不泄漏均有实跑证据。

### 5. `generate()` 单路径聚合

**通过。** 非结构化 `generate()` 只迭代同一实例公开的 `provider.stream()`，不另开 HTTP 路径；注入 transport 的测试断言结果为同一 stream 的 content/reasoning/usage 聚合，且只有一次 transport request。结构化输出继续保留既有校验/反馈重试语义，但 `generate()` 本身仍通过同一 `stream()` 入口消费结果。

阶段边界：当前 desktop chat 为兼容既有 UI 仍调用 `generate()` 取得最终消息；Tauri transport 与 Provider 公共 stream 已是真分片。Turn 持久化与 UI 逐 delta 消费属于后续 TURN-1/Chat-UI，不在本批新增事件契约。

### 6. Readiness 正交状态

**通过。** 状态形状明确分离 `credential: absent | stored` 与 `connection: unverified | verifying | ready | failed`：

- 保存 key 只得到 `stored + unverified`，不会乐观显示 connected；
- UI 在 probe 期间显式进入 verifying，只有本次真实 probe 成功才 ready；
- key 保存与 clear 都清除 Rust verified binding；进程重启只从钥匙串恢复 stored，连接回 unverified；
- verified binding 同时绑定 providerId/modelId，换模型后 Rust 拒绝旧 ready，desktop 也立即显示 unverified；
- 失败保留 credential 状态并发布闭集 failKind/用户文案。

Rust restart/model-binding 测试、desktop readiness 单测，以及 Playwright 的未配置、失败、成功、模型切换、设置页与冒烟流程均通过。

### 7. 范围与依赖纪律

**通过。** 实现提交没有改动 `packages/schemas`、`packages/legal`、`packages/pm-schemas`、`packages/registry` 或 ADR，也没有新增 Turn/Interaction 协议。core 的四处变化仅给 acceptance/test provider fake 补 `stream()`，生产执行器继续只消费 Provider port；DeepSeek quirk 仍只住 `packages/provider`。

## 验收修复提交

- `0fa585e fix-by-acceptance: reject invalid UTF-8 provider streams`
- `753e5e3 fix-by-acceptance: reject non-SSE provider responses`
- `87eeda8 fix-by-acceptance: keep Rust provider fields authoritative`

三枚均为实现级小修，没有修改公开事件形状、schema、ADR 或跨层验收标准。

## 最终门禁

| 门禁 | 实测结果 |
| --- | --- |
| `cargo test` | **25/25** Rust tests 通过；doc tests 通过 |
| `cargo fmt --check` | 通过 |
| `pnpm --filter @courtwork/provider test` | **12 files / 84 tests** 通过 |
| `pnpm -r build` | **12/12** 有 build 脚本的 workspace 通过；catalog drift check 与 desktop Vite build 通过 |
| `pnpm lint` | 通过，零 error |
| `pnpm test` | **108 files / 868 tests** 通过 |
| Desktop 完整 E2E（端口 15422） | 所有前置 guards 通过；**198/198，1 worker，3.1m** |

## 最终判定

- 原始 `6d7851e`：**不可单独合入**，缺陷已由三枚验收提交关闭。
- `codex/accept-provider-2` 完整提交链：**放行，可合入 `main`**。
- 契约级阻塞：无。
- 后续范围：TURN-1 承接可回放 turn 生命周期；Chat-UI 再消费公共 delta，不得回退到 transport body 聚合。
