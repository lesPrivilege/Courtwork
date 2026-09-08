# Harness Core 论证：复用边界与必要自研（Fable，2026-09-08）

基线 `main` `e0d214d`。问题：CourtWork 的 harness core 哪些部分必须自研，哪些必须继续复用；Astra 在 H1–H3 实施时的边界与每个局部应先消费的成熟实践。上游符号逐项清单见 [EX-A](explore/ex-a-upstream-surface.md)；本页只保留裁定与理由。

**2026-09-08 后记：** Astra `codex/harness-core` `d6247a8` 已按 §3 / §4 交付：`app/core` 通用 owner、`work-adapter.mjs`、`inbound-nda` 领域模块、应用 schema 2 迁移与备份、`existingMatterId` 重绑定、不可变来源历史、真实执行身份、producer 缺席只读读取；契约 `docs/work-core/contract.md`，170/170。§4 表由此转为对照记录，不再是待办。

## 1. 现状：谁在承重

按 import 核对（`grep "@earendil-works\|@modelcontextprotocol"`），上游只进入七个文件：

| 文件 | 上游符号 | 角色 |
|---|---|---|
| `app/runtime/pi-session-runtime.mjs` | `createAgentSession`、`createExtensionRuntime`、`SettingsManager`、`ModelRuntime`、`createProvider`、`InMemoryCredentialStore`、`envApiKeyAuth`、`openai-completions`、`openai-responses` | Host adapter（M04）：Pi AgentSession 执行 Run；两个 `api/*` 深路径在 pi-ai 的 `exports` 允许范围内，且是取得 `stream` 函数的唯一公开入口（EX-A §2） |
| `app/server/service.mjs` | `SessionManager` | Run 生命周期 owner（M02 / M10）直接打开 Pi 原生会话文件 |
| `app/runtime/fake-provider.mjs` | `createProvider`、`createModels`、`openai-completions` | 确定性 provider，走与真实 provider 相同的 Pi 协议 |
| `app/runtime/workspace-tools.mjs`、`control-tools.mjs` | `Type` | 工具参数 schema 声明 |
| `app/runtime/control-plane.mjs` | `parseFrontmatter` | skill frontmatter 解析 |
| `app/runtime/mcp-manager.mjs` | `Client`、`StreamableHTTPClientTransport` | MCP 官方客户端 2.0.0 |

其余文件不含上游符号。`@earendil-works/pi-agent-core` 在 `package.json` 声明但无任何源文件导入，只作传递依赖存在（EX-A §0）。按行数与责任分层：

| 层 | 文件（行） | 责任 | 姿态 |
|---|---|---|---|
| 上游 adapter | pi-session-runtime 376、fake-provider 312、mcp-manager 100 | 协议、会话、传输 | 复用，薄适配 |
| 自研策略与状态 | control-plane 265、extension-registry 256、runtime-lock 218、artifact-history 176、source-resolver 89 | scope / policy / CAS revision、扩展生命周期、单写锁、Artifact 版本、来源解析 | 自研 |
| 自研 owner | service 1185、store 537 | Run admission、配置队列、权限、记录绑定；store 是单文件 JSON 原子重写（tmp + chmod + rename），不是数据库 | 自研 |
| 受限工具 | workspace-tools 378、control-tools 43 | 工作区读写与 grep、runtime_load | 自研，schema 用上游 `Type` |
| 领域 Core 样本 | evidence-memo `core.py` 954、`bridge.py` 715、`index.mjs` 497、`renderer.mjs` 174 | Matter / Candidate / Evidence / Decision、Matter 级 CAS、按 request_id 全局幂等、投影；仓内唯一的 SQLite 使用点 | 自研 |
| 胶水 | index 208、runtime 70、cli 63、credential-file 49、work-summary 57 | HTTP 路由与静态准入、启动、凭据文件 | 胶水 |

自研行数约占 `app/runtime + app/server + evidence-memo` 的 80%，但其中没有一行重做模型协议、Agent loop、MCP 传输或存储引擎。这与 [architecture](../../architecture.md) M01–M04 复用、M05–M07 与 M10 自研的分工一致。

## 2. 替换轴核对

architecture 规定替换 Runtime 只改 M04。实际有一处结构性泄漏：`service.mjs:6,697,701` 直接调用 `SessionManager.open / create` 决定会话文件的存在与位置（`#ensureHostSession`），Run owner 因此知道宿主的会话存储格式；`compaction-lifecycle`、`compaction-runtime` 两个测试也直接读 Pi 会话文件。`Type` 与 `parseFrontmatter` 是声明式辅助，属可接受泄漏。MCP 侧只有 `mcp-manager.mjs` 一处，无泄漏（EX-A §4）。

裁定：本轮不修。没有第二 Runtime 消费者时抽 adapter 只增加间接层；触发条件是 R4 的第二宿主验证，或 Pi 升级改变 `SessionManager` 存储格式。登记为已知泄漏，不作 gap 单。

## 3. 必要自研的四处（TL-2）

| 自研点 | 为什么上游没有 | 现有落点 | 下一单 |
|---|---|---|---|
| 提交边界：Candidate → Decision → Committed | Pi 与 MCP 只知道 tool call 与 message；不知道"什么取得效力" | `core.py:decide`、`_check_cas`、`_check_existing_request` | H1 沿此路径加 NDA 逐规则 payload，不建第二账本 |
| 证据与版本绑定 | 来源锚点、source revision、base version 是领域语义 | `validate_evidence`、`_verify_evidence`、`read_source(matter_id)` | H1 补历史归属（§4） |
| 可信 Decision 与幂等 | actor 由 host 拥有，`actor` 字段客户端不可写；重复请求只产生一次效果 | `service.mjs:humanAction`（拒绝 `actor`，检查 generation 与 binding）、`_decision_hash` | 保持；H3 只消费版本化合法动作 |
| 投影与合法动作契约 | 前端不能推断 Decision、Evidence 或 accepted Artifact | `index.mjs:project` 产出 `humanActions`、`stateVersion` | H1 固定 typed packet；H3 供 producer 缺席读取 |

四处之外一律先找成熟实践：Run loop、provider、MCP、SQLite、Markdown / 净化 / 浮层已复用；PDF / DOCX 解析、调度、远程任务、包市场按 [pr-plan 条件性 PR](../../research/experts-hotplug-2026-09-08/pr-plan.md#条件性后续-pr) 触发。

## 4. H1–H3 每个局部的成熟实践与实施边界（交 Astra）

| 局部 | 当前源码事实 | 先消费的成熟实践 | 实施边界 |
|---|---|---|---|
| H1-a 同 Matter 新 Session 绑定 | `index.mjs:createBinding` 每次 `matter-${randomUUID()}`；`service.#createExtensionBinding` 要求 session 无既有 binding，`extensionId + input` 交扩展校验 | 乐观并发重绑定：以已有 identity + 期望版本重新附着（git 对既有 repo 的 worktree、数据库 row version）；归属由宿主判定，不由客户端声明 | `createBinding` 增加 `{ matterId, expectedVersion }` 形态；宿主先校验 Matter 由同一 project 内的 session 创建且 actor 为 local-user，再交 Core 核对版本；不接受任意 matterId。反例：跨 project 绑定、过时版本、已 bound 的 session |
| H1-b 历史来源归属 | `replace_source_set` 先 `DELETE FROM source_set WHERE matter_id=?` 再插入；`read_source(matter_id)` 只 JOIN 当前 `source_version` | append-only 成员表：source_set 按 revision 累加，不删；读取以 (matter_id, revision) 判归属 | 去掉 DELETE，读取接受任何曾属该 Matter 的 revision；不带 matter_id 的裸读只保留给 fixture 并在 host 侧禁用。反例：材料替换后旧候选可读、其他 Matter 越界读被拒 |
| H1-c NDA 逐规则 payload | `validate_candidate_payload` 只知 artifact_text + evidence | JSON Schema 固定 per-rule 结构（rule_id、status、finding、evidence、unresolved），与 H0 gold 同构 | 只加 payload 字段与校验，不改 decide 语义；旧 memo 候选保持可读 |
| H2 真实执行身份 | `coreProviderConfig` 固定 `executionMode=simulation`、`credentialStatus=not_configured` | 从宿主已记录的 `runtime.bound` provider 记录映射（provider、model、mode），不含凭据 | fake provider 仍写 simulation；真实 provider 写 live 与 credential 状态词；旧记录不回填 |
| H3 producer 缺席读取 | `getSurface` 在 registry 无 record 时返回 `{extension:null, projection:null}`；`projection()` 允许 loaded / unloaded / invalidated 但要求 record 存在 | 只读快照来自数据而非活体 producer：Core 是 SQLite，`CoreClient` 可脱离扩展实例打开 | service 增加"按 binding 直接读 Core 投影"的只读路径，`humanActions` 为空、带 `stateVersion` 与 producer 状态；不加载旧代码 |

以上均在既有 owner 文件内实施：`core.py`、`index.mjs`、`service.mjs`。H1 与 BE-5 都触及 `service.mjs`，串行。

## 5. 验证要求

现有覆盖（EX-A §5）：control-plane、control-tools、workspace-tools、artifact-history、source-resolver、store 有直接单测；service、pi-session-runtime、mcp-manager、runtime-lock、credential-file 只经 HTTP 集成测试间接覆盖；`core.py` / `bridge.py` 没有独立 Python 测试，只由 Node 端到端测试触达。H1 改动集中在 `core.py`，应随 H1 补一份直接针对 Core 的反例测试（可仍由 Node 经 CoreClient 驱动），不再只靠端到端。

- 每个局部一组反例测试，放在既有测试文件旁：`extension-run`、`extension-restart`、`idempotency` 已覆盖运行、重启、幂等，新增只针对上表"反例"列。
- 作者自测与 Luna 独验分列；fixture 证据与真实 provider 证据分列。
- 不为 H4 预建卸载矩阵；H3 交付后若 `unload → 读历史` 失败再开。
