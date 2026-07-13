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
