# EX-A：CourtWork `app/` 对上游包的复用面盘点

范围：只读，工作树 `/private/tmp/se-fable-lines`（Courtwork main @ `e0d214d`）。所有引用均为 `path:line`
或 `node_modules/<pkg>/...` 形式，可复核。“观察”= 我读到的代码/文件事实；“推断”= 我基于观察做的判断，
两者分开标注。

---

## 0. 前提澄清（观察）

`app/package.json:14-18` 锁定四个上游包：

```
"@earendil-works/pi-agent-core": "0.85.1"
"@earendil-works/pi-ai": "0.85.1"
"@earendil-works/pi-coding-agent": "0.85.1"
"@modelcontextprotocol/client": "2.0.0"
```

包名是 `@earendil-works/pi-ai`，不是任务描述里裸写的 `pi-ai`；`@earendil-works/pi-agent-core` 虽然被
`package.json` 直接声明为依赖，但对 `app/` 全目录（含 `web/`、`tests/`）做
`grep -rn "from ['\"]@earendil-works/pi-agent-core"` 零匹配——**没有任何源文件直接 import 它**。
它只出现在：`app/package.json:15`（声明）、`app/package-lock.json`（作为 pi-coding-agent/pi-ai 的
传递依赖再次列出）、`app/docs/dependency-ledger.json:247,495`（自动生成的传递依赖账本）、以及
`app/runtime/workspace-tools.mjs:13` 一处**注释**（"pi-agent-core's AgentToolResult has no isError
field"，用于解释设计决策，不是代码依赖）、`app/tests/workspace.test.mjs:31` 同样只在测试名字符串里
提到它。**结论（观察）：pi-agent-core 是声明但未直接消费的依赖**，实际能力通过 pi-coding-agent 的
`AgentSession`/SDK 间接获得。

---

## 1. 上游符号消费清单

### 1.1 `@earendil-works/pi-coding-agent` 0.85.1（`node_modules/@earendil-works/pi-coding-agent/package.json`: version 0.85.1, license MIT）

| 符号 | 来自 | 引用位置 | 用途（一句话） |
|---|---|---|---|
| `createAgentSession` | `./dist/index.d.ts:16` (`export … from "./core/sdk.ts"`) | `app/runtime/pi-session-runtime.mjs:2,165` | 每个 Run 用它建一个绑定到调用者 tool 闭包的新 `AgentSession` |
| `createExtensionRuntime` | `./dist/index.d.ts:7` | `app/runtime/pi-session-runtime.mjs:3,35` | 构造一个"什么都不发现"的空 ExtensionRuntime，喂给自建的空 `ResourceLoader` |
| `SettingsManager` | `./dist/index.d.ts:20` | `app/runtime/pi-session-runtime.mjs:4,174` | `SettingsManager.inMemory({compaction:{...}})`，只传 compaction 三个字段 |
| `ModelRuntime` | `./dist/index.d.ts:12` | `app/runtime/pi-session-runtime.mjs:9,59` | `ModelRuntime.create({credentials, modelsPath:null, refreshOnCreate:false})`；`.getProvider/.getModels/.registerNativeProvider/.getModel` |
| `parseFrontmatter` | `./dist/index.d.ts:31`(`./utils/frontmatter.ts`) | `app/runtime/control-plane.mjs:5` | 解析 skill/reference 资源内容里的 frontmatter 元数据 |
| `SessionManager` | `./dist/index.d.ts:17`(`./core/session-manager.ts`) | `app/server/service.mjs:6,697,701` | `.open(path)` / `.create(workspaceDir, sessionDir)` / `.getSessionId()` / `.getSessionFile()`——持久化跨 Run 的会话历史 |

以上六个符号全部是 `dist/index.d.ts` 顶层具名导出（见下方“越界导入检查”），无一是深路径导入。

`SessionManager` 还被两个测试文件**独立地**直接 import：`app/tests/compaction-lifecycle.test.mjs:5`、
`app/tests/compaction-runtime.test.mjs:4`（用于在断言里直接检查会话文件内容，不经过 host adapter）。

### 1.2 `@earendil-works/pi-ai` 0.85.1（`node_modules/@earendil-works/pi-ai/package.json`: version 0.85.1, license MIT）

| 符号 | 来自 | 引用位置 | 用途 |
|---|---|---|---|
| `Type`（重导出自 `typebox`，`dist/index.d.ts:2`） | | `app/runtime/control-tools.mjs:2,10`；`app/runtime/workspace-tools.mjs:5`（多处 `Type.Object(...)`） | 给自建工具（`runtime_load`、`ws_*`）声明 JSON-Schema 风格入参 |
| `InMemoryCredentialStore`（`dist/auth/credential-store.d.ts:7`，经 `dist/index.d.ts:15` `export * from "./auth/credential-store.ts"` 转出） | | `app/runtime/pi-session-runtime.mjs:6,60` | 凭证只活在内存里，不落盘 |
| `createProvider`（`dist/models.d.ts:181`，经 `export * from "./models.ts"` 转出，`dist/index.d.ts:21`） | | `app/runtime/pi-session-runtime.mjs:6,70,89`；`app/runtime/fake-provider.mjs:3,271` | 把 DeepSeek/OpenAI/假回环 provider 注册进 `ModelRuntime` |
| `envApiKeyAuth`（`dist/auth/helpers.d.ts:8`，经 `export * from "./auth/helpers.ts"`，`dist/index.d.ts:17`） | | `app/runtime/pi-session-runtime.mjs:6,72,93` | 声明"从环境变量取 key"的认证策略（但宿主已在 `server/runtime.mjs:15-24` 主动清空继承的 `DEEPSEEK_API_KEY`/`OPENAI_API_KEY`，见下） |
| `createModels`（`dist/models.d.ts:158`） | | `app/runtime/fake-provider.mjs:3,282` | 构造一个独立的 `MutableModels` 容器并 `setProvider`——**观察**：该返回值 `.provider`/`.models` 在全仓库无任何调用点消费（`grep "fakeProvider\.\(provider\|models\)\b"` 零匹配），生产路径实际吃的是 `fakeProvider.baseUrl`（`app/server/service.mjs:745`）与 `fakeProvider.model`（经 `registerFakeProvider`，`app/runtime/pi-session-runtime.mjs:88-98`） |
| `openaiCompletions.stream/.streamSimple`（`dist/api/openai-completions.d.ts`，深路径） | | `app/runtime/pi-session-runtime.mjs:7,74,95`；`app/runtime/fake-provider.mjs:4,282` | 把假回环 provider 和真实 openai-completions provider 接到同一套编码器/流解析器 |
| `openaiResponses.stream/.streamSimple`（`dist/api/openai-responses.d.ts`，深路径） | | `app/runtime/pi-session-runtime.mjs:8,75` | 同上，openai-responses 格式 |

### 1.3 `@modelcontextprotocol/client` 2.0.0（`node_modules/@modelcontextprotocol/client/package.json`: version 2.0.0, license MIT）

| 符号 | 引用位置 | 用途 |
|---|---|---|
| `Client` | `app/runtime/mcp-manager.mjs:1,30` | 建立到一个 streamable-http MCP server 的客户端；订阅 `client.onclose`/`client.onerror`（`mcp-manager.mjs:41-42`），调用 `.connect/.getServerCapabilities/.listTools/.listResources/.listPrompts/.callTool/.getNegotiatedProtocolVersion/.getProtocolEra/.getServerVersion/.close` |
| `StreamableHTTPClientTransport` | `app/runtime/mcp-manager.mjs:1,35` | 传输层，強制 `redirect:'error'`、`onInsufficientScope:'throw'`、自定义 15s 超时 `fetch` |

订阅的事件/回调名：`onclose`、`onerror`（`app/runtime/mcp-manager.mjs:41-42`）。全仓库只有这一个文件
import `@modelcontextprotocol/client`。

---

## 2. 越界导入检查（是否深路径 / exports map 是否允许）

| 深路径 | 引用处 | `exports` map 是否显式允许 |
|---|---|---|
| `@earendil-works/pi-ai/api/openai-completions` | `pi-session-runtime.mjs:7`, `fake-provider.mjs:4` | 是——`node_modules/@earendil-works/pi-ai/package.json` 的 `exports["./api/*"]` 通配符覆盖，`dist/api/openai-completions.d.ts` 确实存在 |
| `@earendil-works/pi-ai/api/openai-responses` | `pi-session-runtime.mjs:8` | 同上，`./api/*` 通配符 |

**观察**：两个深路径导入都落在 `pi-ai` 官方 `exports` 字段声明的公开子路径规则内，不是绕过 `exports`
的私有内部路径（`node_modules/@earendil-works/pi-ai/package.json` 的 `exports` 键：
`.`、`./compat`、`./providers/*`、`./api/*`、`./utils/*`、`./oauth`、`./bedrock-provider`、`./bun-oauth`）。
但注意：`dist/index.d.ts`（顶层公开面）只 re-export 这两个模块的**类型**
（`OpenAICompletionsOptions`、`OpenAIResponsesOptions`，见 `index.d.ts:12-13`），不 re-export
`stream`/`streamSimple` 这两个**运行时函数**——CourtWork 拿到它们必须走深路径，说明"把 API 编码器接到
自定义 provider"这件事，pi-ai 顶层门面本身没有提供更短的路子，深路径是这条能力唯一的公开入口。

`@earendil-works/pi-coding-agent` 与 `@modelcontextprotocol/client` 两个包，CourtWork 全部走顶层
`.` 导出，零深路径。

---

## 3. 自建层清单（`app/runtime`、`app/server`、`app/extensions/evidence-memo`）

图例：`adapter over upstream`＝把上游能力包一层给宿主用；`self-built policy or state`＝自己拥有语义/状态；
`glue`＝纯粘合、无独立语义。

### 3.1 `app/runtime`

| 文件 | 行数 | 一句话职责 | 依赖的上游符号 | 分类 |
|---|---|---|---|---|
| `pi-session-runtime.mjs` | 377 | 唯一的 M04 宿主适配器：建 `ModelRuntime`、开一次 Run 的 `AgentSession`、把 `session.subscribe` 的原始事件映射成 `{type,data}` 通用形状（`mapSessionEvent`，`:341-376`），自己发明 cancel-sticky（`:184-200`）和 pending-projection-drain（`:205-226`）语义 | `createAgentSession`、`createExtensionRuntime`、`SettingsManager`、`ModelRuntime`、`InMemoryCredentialStore`、`createProvider`、`envApiKeyAuth`、`openaiCompletions`、`openaiResponses` | **adapter over upstream**（但内部含自建状态机：cancel-sticky、drain、compaction 预算） |
| `control-plane.mjs` | 265 | 自建的 scoped 权限/资源目录：`RuntimeControlPlane` 类持有一份带单调 `revision` 的 JSON 配置（无数据库），`evaluatePolicy`（`:97-113`）做 allow/ask/deny 分层裁决，写路径要求 `input.revision === this.config.revision` 否则抛 `runtime_conflict`（`:113`）——**乐观并发/CAS 语义**，`next.revision++`（`:139`） | `parseFrontmatter`（唯一） | **self-built policy or state** |
| `control-tools.mjs` | 43 | `createRuntimeLoadTool`（暴露目录里 skill/reference 内容）+ `governTools`（所有模型可调用工具的统一准入闸门：过滤未暴露工具、`ws_write` 在 `read_only` 模式下整体禁用、逐次调用 `evaluatePolicy` 并按 `ask` 结果调用 `requestPermission`） | `Type`（仅 schema 声明） | **self-built policy or state** |
| `workspace-tools.mjs` | 378 | 单会话工作区内的 `ws_list/ws_read/ws_write/ws_grep` + `ask_user` 工具实现；无 bash、无网络、路径越界一律 `realpath` 校验后拒绝 | `Type`（schema） | **self-built policy or state**（沙箱边界是自研的，不是复用 pi-coding-agent 自带的 `createReadToolDefinition` 等） |
| `mcp-manager.mjs` | 79 | `MCPManager` 类：连接/断开/工具目录发现/工具调用转译，自建 `parseMcpConfig` 白名单校验（只允许 `streamable-http` + 两个显式协议版本，`:8-13`），把 MCP 工具映射成宿主工具形状 | `Client`、`StreamableHTTPClientTransport` | **adapter over upstream**（协议语义交给 SDK；连接生命周期、目录大小上限、host 工具名映射是自建） |
| `extension-registry.mjs` | 256 | 通用 manifest 校验 + 生命周期（load/unload/restart）+ human action 转发；不含任何领域行为，领域行为留给具体 extension 实例 | 无 | **glue**（自建的通用壳，无上游依赖） |
| `artifact-history.mjs` | 176 | 用 `execFile` 直接调本机 `git` 二进制做内容版本化（写 blob、读 blob），自称"不是第二个 artifact 数据库" | 无（`node:child_process` 调 git） | **self-built policy or state**（存储语义自研，git 只是被当外部工具调用，不是被 import 的库） |
| `source-resolver.mjs` | 89 | 校验 `runtime_source` 五种定位符（url/repository/package/path/manifest）的结构合法性 | 无（依赖同目录 `control-plane.mjs` 的 `validateRuntimeSource`） | **self-built policy or state** |
| `fake-provider.mjs` | 312 | 自建的确定性 HTTP 回环 fixture 服务器（`node:http`），按脚本（`/fixture script`）回放 SSE 分片，模拟真实 provider 错误/重试/慢首 token 行为 | `createModels`、`createProvider`、`openaiCompletions`（见 §1.2 关于死码的观察） | **glue**（外观是"provider"，实质是纯自建的测试夹具+确定性协议模拟器） |
| `grep-worker.mjs` | 44 | worker_threads 里跑的 grep 实现，只匹配模型传入的正则，不 eval 任何模型代码 | 无 | **glue** |
| `test-hooks.mjs` | 53 | 受控的自杀式崩溃点（`SIGKILL`），双开关（`SE_TEST_MODE` + `SE_TEST_CRASH_POINT`）防止生产环境误触发 | 无 | **glue** |

### 3.2 `app/server`

| 文件 | 行数 | 一句话职责 | 依赖的上游符号 | 分类 |
|---|---|---|---|---|
| `service.mjs` | 1185 | `RuntimeService`：Run 准入（`createRun`/`#createRun`）、`admissions` 集合追踪在飞请求、provider 描述符校验（`#resolveModel`，`:687-690`）、直接管理 `SessionManager.open/create`（`:697,701`）以获得跨 Run 会话续存、human action 分发、凭证轮换 | `SessionManager`（直接，非经 `pi-session-runtime.mjs`）；间接依赖 `pi-session-runtime.mjs` 导出的 `createSessionRun`/`mapSessionEvent`/`registerFakeProvider`/`resolveCompactionPolicy` | **self-built policy or state**（Run 准入/生命周期/凭证策略全部自研；`SessionManager` 只是被拿来管文件级持久化） |
| `store.mjs` | 537 | `RuntimeStore`：**观察**——不是 SQLite。是单个 `runtime-state.json` 文件（`:238`，`fileName="runtime-state.json"`），写入走 `<file>.<uuid>.tmp` 全量重写 + `chmod 0o600` + `rename` 原子替换（`:307-322`），`_mutate` 先在 `structuredClone` 的工作副本上跑变更再落盘才切换 `this.state`（`:322`），启动时清理上次崩溃遗留的 `.tmp` 碎片（`:245-263`），schema 版本迁移+备份（`:280-290`） | 无 | **self-built policy or state**（完整的单写者、原子替换、崩溃安全 JSON 存储，是自研持久化而非复用数据库） |
| `runtime.mjs` | 70 | `createRuntime()` 装配入口：清除继承的 provider 环境变量（`:15-24`）→ 开 `RuntimeStore` → 起假回环 provider → 建 `ModelRuntime` → 建 `ExtensionRegistry` → 建 `RuntimeService`，统一 `close()` 顺序 | 无直接（转调 `pi-session-runtime.mjs` 的 `createIsolatedModelRuntime`、`fake-provider.mjs` 的 `createFakeOpenAiProvider`） | **glue** |
| `index.mjs` | 208 | HTTP 层（路由/序列化/错误映射），未直接查到 | 无（grep 零匹配） | **glue** |
| `cli.mjs` | 63 | 命令行入口 | 无 | **glue** |
| `runtime-lock.mjs` + `runtime-lock.py` | 218+~120 | Node 侧用 `readline`/`spawn` 起一个 Python 子进程持有 POSIX 文件锁（`fcntl`），锁的所有权是 fd 不是 marker 文件，显式拒绝非 POSIX 平台 | 无 | **self-built policy or state**（跨进程互斥语义自研） |
| `credential-file.mjs` | 49 | `credentials.json` 独立文件（不进 `runtime-state.json`），同样是 tmp+chmod+rename 的原子写模式 | 无 | **self-built policy or state** |
| `work-summary.mjs` | 57 | 对已发布 store 状态做同步纯投影（分页/排序/按状态分桶），显式声明"不检查事件、宿主会话记录、工作区文件" | 无 | **glue**（读时投影，无独立状态） |

### 3.3 `app/extensions/evidence-memo`

| 文件 | 行数 | 一句话职责 | 依赖的上游符号 | 分类 |
|---|---|---|---|---|
| `index.mjs` | 497 | 扩展入口：`se_read_source`/`se_submit_candidate` 工具声明、宿主契约校验、把请求转发给 `CoreClient` | 无 | **glue**（无上游 import，但是领域语义的入口） |
| `manifest.mjs` | 34 | 声明式清单（id/version/declaredTools/surface），`releaseStatus:'development'`，显式排除"无真实凭证/无自动接受" | 无 | **glue** |
| `renderer.mjs` | 174 | 纯前端渲染器，注释自称"无 fetch/URL/storage/provider/Core 访问"，所有字符串走 `textContent` 防 XSS | 无 | **glue** |
| `server/core-client.mjs` | 257 | Node 侧 `CoreClient`：用 `node:child_process.spawn` 起 `core/bridge.py`，通过 `readline` 逐行 JSON（NDJSON/JSONL）RPC，`MAX_WIRE_LINE=1_500_000` 限帧 | 无 | **adapter over upstream？不——这里"上游"是自家 Python 进程，不是第三方包**；分类为 **glue**（Node↔Python 进程边界） |
| `core/bridge.py` | 715 | "小的可信 JSONL 适配器"，自称"应用拥有这个进程边界；被冻结的 `core.py` 仍是 Candidate/Decision/Evidence 不变量的实现"（`bridge.py:1-7` 原文），加空初始化、应用元数据、给 Node host 的窄 RPC 面 | 无（依赖同目录 `core.py`） | **glue** |
| `core/core.py` | 954 | **领域核心**：`Store` 类（`:292`）用 `sqlite3`（观察，`core.py:14` `import sqlite3`）持有 Matter/Candidate/Decision/Audit 表；`VERSION_CONFLICT`（`:580`）是 **Matter 级 CAS**（"matter CAS mismatch"）；`request_result` 表按 `request_id` 全局键实现**幂等**（`:725` 注释"request_result is globally keyed for idempotency"）；`HookController`/`kill_stage`（`:267-276`）支持真实 `SIGKILL` 自杀以验证 SQLite 崩溃恢复 | 无（stdlib only：`sqlite3`/`hashlib`/`dataclasses`） | **self-built policy or state**（这是本仓库唯一真正用 SQLite 的地方，而且是自研的 CAS + 幂等 + 事件类型系统，不是复用某个 ORM/框架） |

**关键澄清（观察，纠正一个常见误判）**：`app/server/store.mjs` 用的是 JSON 文件原子重写，**不是** SQLite；
`app/extensions/evidence-memo/core/core.py` 才是仓库里唯一直接 `import sqlite3` 的地方
（`core.py:14`）。两者是两套完全独立的持久化实现，分别对应 M06（Matter Repository，SQLite+CAS+幂等）
和宿主自己的运行时状态（JSON 文件，无 CAS，靠单写者+`_mutate`串行化）。

---

## 4. 替换轴检查（对照 `engineering/architecture.md:65-67` "两个独立替换轴"）

> 原文（`architecture.md:67`）："替换 Runtime 只改 M04 及必要运行配置……"；`architecture.md:47` 把 M04
> 定义为"宿主 Session/事件与适配"单元，实现姿态"薄适配"。`app/runtime/pi-session-runtime.mjs` 是本仓库里
> 唯一显式对应 M04 的文件。

### 4.1 Runtime 替换轴：M04 外还有谁 import 了 Pi 符号？

| 文件 | 导入的符号 | 泄漏性质 | 理由 |
|---|---|---|---|
| `app/runtime/control-tools.mjs:2` | `Type` | **trivial** | 只是 typebox 的 schema 构造器，和"换一个 Agent Runtime"无关，任何 JSON-Schema 库都能顶替 |
| `app/runtime/workspace-tools.mjs:5` | `Type` | **trivial** | 同上 |
| `app/runtime/control-plane.mjs:5` | `parseFrontmatter` | **trivial** | 纯文本解析工具函数，和会话/事件模型无耦合 |
| `app/runtime/fake-provider.mjs:3-4` | `createModels`、`createProvider`、`openaiCompletions` | **偏结构，但影响面小** | 这是测试夹具在独立构造一份未被消费的 `Provider`/`Models`（见 §1.2 观察），如果换 Runtime，这个死码路径要么被删要么要重写成新 SDK 的形状，但因为**没有下游读它**，实际重写成本接近零；风险在于"这段代码存在但没人跑到"本身是可维护性负债 |
| `app/server/service.mjs:6,697,701` | `SessionManager` | **结构性（本报告认定的最大泄漏）** | `service.mjs` 直接调 `SessionManager.open(path)` / `SessionManager.create(workspaceDir, sessionDir)` 来决定"这个会话有没有宿主侧历史文件、文件放哪"，这是 Run 准入逻辑（`#ensureHostSession`，`:692-702`）的一部分，而不是通过 `pi-session-runtime.mjs` 转发。换一个 Runtime 意味着 `service.mjs` 自己要跟着改，不是只改 M04 一个文件 |
| `app/tests/compaction-lifecycle.test.mjs:5`、`app/tests/compaction-runtime.test.mjs:4` | `SessionManager` | **测试层结构性泄漏** | 两个测试直接读会话文件断言压缩行为，换 Runtime 时这两个测试文件本身要重写，不只是被测代码变了 |

**推断**：如果把"替换 Runtime 只改 M04"这句话按字面标准取严格解释（"只改一个文件"），当前代码**不满足**，
因为 `service.mjs` 里的 `SessionManager` 调用是决定会话文件路径/续存的准入逻辑，属于结构性而非门面
细节。按宽松解释（"业务/权限/存储语义不因换 Runtime 而改"）当前代码基本满足：`control-plane.mjs`、
`workspace-tools.mjs`、`store.mjs`、`credential-file.mjs` 等自建状态层都不依赖任何 Pi 具体 Runtime
形状，泄漏的只是 `Type`（schema helper）和 `SessionManager`（会话持久化壳）。

### 4.2 MCP 替换轴

`grep -rn "from ['\"]@modelcontextprotocol"` 全仓库只命中 `app/runtime/mcp-manager.mjs:1` 一处
（已在 §1.3 列出）。**观察**：没有其他文件 import `@modelcontextprotocol/client`；`service.mjs` 只 import
`MCPManager`（自建包装类，`app/server/service.mjs:1`），不直接碰 SDK 符号。**推断**：MCP 侧的替换面
干净，比 Runtime 侧收敛得多——只有一个文件、零结构性泄漏。

---

## 5. 测试对自建层的覆盖

| 自建层 | 直接 import 的测试文件（`grep` 结果） | 覆盖方式 |
|---|---|---|
| `control-plane.mjs` | `tests/control-plane.test.mjs:7`、`tests/source-resolver.test.mjs:8` | 直接单测 `evaluatePolicy`/`compileControlContext`/`RuntimeControlPlane` |
| `control-tools.mjs` | `tests/control-plane.test.mjs:8` | 直接单测 `governTools` |
| `workspace-tools.mjs` | `tests/grep-isolation.test.mjs:6`、`tests/workspace.test.mjs:7`、`tests/artifact-history.test.mjs:9`（引用 `MAX_READ_BYTES`） | 直接单测 `createWsGrepTool`/`createWsReadTool`/`resolveWorkspacePath` |
| `artifact-history.mjs` | `tests/artifact-history.test.mjs:8`、`tests/artifact-history-storage.test.mjs:9` | 直接单测 `ArtifactHistory` |
| `source-resolver.mjs` | `tests/source-resolver.test.mjs:7` | 直接单测 `resolveRuntimeSource` |
| `store.mjs` | `tests/artifact-history.test.mjs:10`、`tests/durability.test.mjs:8`、`tests/runtime.test.mjs:4`、`tests/work-summary-consistency.test.mjs:6` | 直接单测 `RuntimeStore`（含崩溃恢复，配合 `test-hooks.mjs` 的 crash point） |
| `pi-session-runtime.mjs` | `tests/credentials.test.mjs:7`、`tests/lifecycle.test.mjs:11`、`tests/work-summary.test.mjs:9`（均只引用其导出的常量 `FAKE_CREDENTIAL_KEY`，不直接测内部函数） | **无直接单测**；只被间接经 `tests/helpers.mjs:6` 的 `startServer` 走完整 HTTP 链路覆盖 |
| `service.mjs` | 无任何测试文件直接 `import` | **无直接单测**；全部通过 `tests/helpers.mjs` 的 `boot()`（起 `startServer`）走 HTTP 集成测试间接覆盖，覆盖面广但缺单元级断言 |
| `mcp-manager.mjs` | 无任何测试文件直接 `import`；`grep -il "mcp"` 只在 `ui-event-mapping.test.mjs`、`control-plane.test.mjs`、`source-resolver.test.mjs` 里以字符串/字段名出现 | **无任何专门的 MCP 集成测试**（既无直接单测，也没找到起真实/模拟 MCP server 的测试） |
| `extension-registry.mjs` | 无直接 import；被 `control-plane.test.mjs`、`extension-restart.test.mjs`、`extension-run.test.mjs`、`idempotency.test.mjs`、`runtime-foundation.test.mjs` 间接经 HTTP 覆盖 | 间接覆盖，含 `extension-restart.test.mjs:8-9` 用 `createRuntime` + `extensions/probe` |
| `fake-provider.mjs` | 无直接 import；被几乎所有 `boot()` 测试间接使用（它是默认注入的 provider） | 间接覆盖（作为测试基础设施本身） |
| `runtime-lock.mjs`/`.py` | `grep -rl "runtime-lock"` 在 `tests/` 零命中 | **无测试覆盖**（观察） |
| `credential-file.mjs` | 无直接 import；`credentials.test.mjs` 走 HTTP 端点间接覆盖 | 间接 |
| `evidence-memo`（全部文件） | `extension-run.test.mjs:13,28,53`（真实起 `/extensions/evidence-memo/lifecycle`，跑 `se_read_source`/`se_submit_candidate` 全链路，含"迟到的重复提交被 Core 拒绝"）、`idempotency.test.mjs`、`extension-restart.test.mjs`、`control-plane.test.mjs` | 端到端覆盖（HTTP→extension→CoreClient→bridge.py→core.py 全链路），但**没有 Python `core.py`/`bridge.py` 自身的单元测试文件**（未在 `app/tests/` 或别处发现 `*.py` 测试） |

**未直接测的层（汇总）**：`service.mjs`、`mcp-manager.mjs`、`pi-session-runtime.mjs`、
`runtime-lock.mjs`/`.py`、`credential-file.mjs`——均只有间接/集成覆盖，无对应的聚焦单测文件。
`core.py`/`bridge.py` 只被 Node 侧集成测试间接跑到，仓库里没找到独立的 Python 测试。

---

## 6. 版本/升级风险（观察，仅读本地文件，未联网）

| 包 | 稳定性姿态（来自本地 README/CHANGELOG 原文） |
|---|---|
| `@earendil-works/pi-coding-agent` | `node_modules/@earendil-works/pi-coding-agent/CHANGELOG.md:1-19`：0.85.1（2026-09-05）是紧跟 0.85.0（2026-09-04）的修复版，其中一条是"Fixed SDK import failures caused by unintentionally publishing internal experimental code … in 0.85.0. The experimental `client` and `experimental/plugin` subpaths … are now source-only"——说明该包近期（0.85.0→0.85.1）刚发生过一次"实验性内部路径意外发布又收回"的事故，公开 SDK 面并不总是稳定不变 |
| `@earendil-works/pi-ai` | `node_modules/@earendil-works/pi-ai/README.md:1-5`：自我定位是"Unified LLM API"，未见版本稳定性声明；CourtWork 消费的 `openai-completions`/`openai-responses` 深路径恰好不在顶层 `index.d.ts` 的运行时导出里（只导出类型），说明这条能力的公开契约本身就绑定在子路径上，不是顶层门面的一部分 |
| `@earendil-works/pi-agent-core` | `node_modules/@earendil-works/pi-agent-core/README.md:1-12`：README 示例代码（`import { Agent } from "@earendil-works/pi-agent-core"`）与 CourtWork **实际未使用**该包形成对照——该依赖目前是纯声明性的，几乎零升级风险（没有消费面） |
| `@modelcontextprotocol/client` | `node_modules/@modelcontextprotocol/client/README.md:6-11`：明确写"**v2 is the stable release line**"，并且"replaces the monolithic `@modelcontextprotocol/sdk` package from v1"——即该包本身经历过一次包名/主版本级的迁移（v1→v2 拆包），提示 MCP 生态的包结构本身不算长期稳定 |

---

## 未检项

- 未运行 `npm test` 或任何测试套件，覆盖率结论完全基于静态 `grep`/`import` 分析，不代表运行时实际断言强度。
- 未检查 `app/tests/helpers.mjs` 内 `boot()`/`reopen()`/`spawnWorker()` 的具体实现细节，只确认了它们经 `startServer` 间接触达 `service.mjs`/`mcp-manager.mjs`/`fake-provider.mjs`。
- 未检查 `app/node_modules/@earendil-works/pi-coding-agent/dist/core/*.js` 的运行时实现（只读了 `.d.ts` 公开类型面），`AgentSession`/`ModelRuntime` 的内部行为细节未验证。
- `mcp-manager.mjs` 缺测试覆盖是本报告的静态观察，未确认是否有仓库外/CI 专用的 MCP 集成测试。
- 未对比 pi 系列包 0.85.0→0.85.1 之间除 CHANGELOG 摘要外的实际 diff（无网络，`node_modules` 只含当前锁定版本，没有旧版本可比对）。
- `docs/dependency-ledger.json` 内容只做了抽样确认（确认 pi-agent-core 作为传递依赖存在），未逐条核对其与 `package-lock.json` 的一致性。
- `web/` 目录按"中等"深度核查：确认了模块清单、`app.mjs` 头部 import 和 vendor 清单（`web/vendor/manifest.json`），但未逐个函数核对每个 `web/*.mjs` 文件的具体渲染逻辑。
