# SPEC: apps/desktop（W9）

状态：v0.1.1 已发布；既有 Provider/Turn/Interaction/UI、`HOST-PORT-1`、`VIEW-ABI-1/1C`、`WORK-PORT-1` 与 `TRACE-UI-1` 均已独立验收放行；后续 Work state/material/live 受 ADR-010 约束。

## TRACE-UI-1 · Chat/Work 同源过程轨迹（已独立验收放行）

权威：ADR-011。目标是复用同一宿主组件与动效，不混淆两种账本语义。

- 新建领域盲 `ProcessTrace`（名称可等义调整），封闭 view state 为 `running | settled | empty | failed`，并显式区分 `reasoning | progress` 文案。Chat reasoning 只从 Turn projection 映射；Work progress 只从 Work projection 映射。
- Chat pending、流式 reasoning、settled disclosure 与 Work thinking/progress 全部消费同一组件和 CSS；不得保留一套 `<details class=chat-reasoning>` 与另一套 `ThinkingStream` 交互实现。
- reasoning absent 不伪造；Work progress 不标为模型思考；失败/取消不显示 completed。running 内容到达时可以逐字增量，语义 terminal 仍 0ms 硬切。
- 现有品牌三横等待指示、focus-visible、键盘展开、reduced-motion 与 Stop 必须保留；数据行与 schema 工作面不消费动画。
- 通用 ask-user 卡继续只消费 Turn interaction snapshot；内容、选项与锚点来自垂类注入。卡底只允许相对 chat 底纸的微差 generated surface + 1px 中性框线、6px 圆角、零阴影；不得写法律 type switch。
- 纯函数/DOM/Playwright 必须覆盖 Chat 与 Work 同一组件身份、running→settled、absent、failed、键盘展开、reduced-motion 和 ask-user 锚点/first-wins 回放。完整 desktop Playwright 由独立会话在独立端口验收。

实现留痕（2026-07-14，待独立验收）：

- 新增领域盲 `chat/ProcessTrace.tsx` 与机械适配器 `chat/process-trace-projection.ts`；四态、双 mode、文案、折叠交互与 CSS 仅此一份。Chat pending/流式/终态 reasoning 只消费 `TurnProjection`，Work 只消费 projected `progress`/failure/terminal，不互抄账本。
- 删除 `ThinkingStream` 与 Chat 原生 reasoning `<details>`；Turn terminal 明示 absent 时返回空，Work body 删除静态兜底。失败、取消、interrupted 优先映射 `failed`，不受 completed 位影响。
- BrandThinking、Stop、原生 button 键盘展开、全局 reduced-motion 与 0ms terminal 卸载保留；ask-user 继续消费 replay snapshot，卡底改为 generated 单语义微差底色，hairline/6px/零阴影不变。
- 旧 `assert-thinking-stream` 退役为 `assert-process-trace`，并把单组件身份、来源隔离、absent、取消优先级、禁双实现、灰阶与 reduced-motion 纳入前置门。红灯基线为新 suite 因组件/适配器缺席 **2 files failed**；实现侧定向 Vitest **7/7**、全仓 Vitest **120 files / 1078 tests**、13 workspace build、ESLint 与静态门全绿；隔离端口定向 Playwright 先跑 **44/44**，最终 tip 复核本单关键路径 **5/5**。完整 Playwright 仍由独立验收会话实跑并填写最终数字。

## VISUAL-KIT-1 · 原生可视化构件与 gallery（实现完成，待独立验收）

权威：ADR-012 与 `docs/design/visualization-kit.md`。先在 desktop 宿主内部建立
`preview/projection`、`preview/primitives`、`preview/blueprints`、`preview/composition` 与
`preview/registry` 边界，暂不抽 `packages/ui`。

- 第一批只实现有真实消费的 `Field / Anchor / Status / Evidence / Decision / Estimate / Partial`，并让至少两个现有工作面或两个 namespace 真消费；禁止只做未引用组件陈列。
- 七类构件只接收 `docs/design/visualization-kit.md` 冻结的宿主 ViewModel；不得接收 descriptor、JSON pointer、artifact 原始对象、自由 tone/color、布局数值或 event/store。
- 第一批生产复用固定为：通用 artifact table 的 field/anchor/estimate/status，以及 Legal 风险/证据或通用 interaction 的 evidence/decision/partial。至少一处 Legal 与一处 PM projection 必须消费同一 primitives 源码；不得按 typeId 写分支。
- gallery 可以展示 implemented/candidate/deferred 全谱，但 candidate/deferred 只能是原生静态样板，不注册生产 blueprint、不造假数据。样板使用 Legal fixture 与后续权威 PM fixture。
- gallery fixture 只能由 demo/test composition 注入递归冻结的 ViewModel；desktop 生产 graph 不得 import `@courtwork/demo-data`、垂类 `/testing` 或 Node builtin。截图清单记录 fixture hash、main SHA、viewport 与 reduced-motion。
- 新 blueprint 独立定义 presentation config 与 fail-closed projection；不得膨胀 `courtwork.artifact-table.v1` 的 fields 为万能 DSL。
- 本单新增第三方依赖为 0；语义 HTML/CSS/SVG 为默认，已有 G6 只保留给复杂 graph 且继续懒加载。不得引入 TanStack Table、React Flow、ECharts 或整套 UI kit。
- 1180/1280/1440/1600、键盘、完整引语、零 wire、reduced-motion 与 de-slop 门必须通过；截图来自已验收 main 的真机 gallery。

实现留痕（2026-07-14，待独立验收）：

- `preview/projection/view-model.ts` 固定七类递归冻结宿主 ViewModel；`preview/primitives/index.tsx` 只消费这些 ViewModel 与可选 callback。Anchor 无真实 source callback 时保持静态，Decision 无 callback/提交中/已回放时逐按钮禁用；Estimate 互斥形状与 Partial 计数均 fail closed。
- 通用 artifact table 拆为纯 `projection/artifact-table.ts` 与现有 renderer：生产复用 Field/Anchor/Status/Estimate；anchor 必须验证 `fileId`，只投影去扩展名的安全 basename 与完整引语，不显示绝对路径。通用 interaction 拆为纯 `projection/interaction.ts`：ask-user 复用 Evidence/Decision，选项、Skip、完整引语与回放答案只从 core snapshot 投影；Partial 不在普通 pending/resolved 卡常驻，只在提交/来源错误时保留旧 `role=alert` 语义。
- `composition/FiniteComposition.tsx` 只登记 section、四种 grid 比例与 repeat；生产 registry 仍只登记 `courtwork.artifact-table.v1`，candidate/deferred 不进入 blueprint。primitive 源码不解释 descriptor/pointer/raw artifact/store/event，不含 Legal/PM import 或 typeId 分支。
- 独立 `visual-gallery.html` / `preview/gallery/main.tsx` 原生绘制十二族连续 hairline 样板面，删除 `01/02` 编号脚手架；Status overview 经 `RepeatComposition` 同面展示 neutral/generated/verified/warning/critical 五个封闭 tone，使有限组合边界有真实消费。生产入口只带抽象 candidate/deferred 结构，不带 fixture。test/demo composition 从公开 `@courtwork/demo-data` 与 `@courtwork/legal/testing` 注入递归冻结 ViewModel，锁 PM hash `e627e10e…082f9c` 与 Legal hash `8cd77784…a36487`，两 namespace 复用同一 Evidence/Anchor 源码。
- 新增第三方依赖为 0；`@courtwork/demo-data` 仅作为 workspace test-only devDependency。生产 `src` 静态门拒绝 demo-data、垂类 `/testing`、Node builtin、新 visual dependency、namespace/typeId switch 与 candidate/deferred registry 回流。
- 红灯基线先由缺失七项边界稳定报错；实现侧定向 Vitest **6 files / 20 tests**、desktop 全量 **39 files / 156 tests**、root Vitest **128 files / 1117 tests**、全仓 **13 workspace build**、ESLint 与 site/de-slop guard 全绿。独立 gallery capture harness 在 1180/1280/1440/1600 四档实际浏览器渲染十二族；最终完整前置门与 Playwright **209/209 passed（4 workers，1.6m）**。这些是实现自证，正式截图清单与放行结论仍由验收会话在 clean worktree/main 产生。

## 现行架构工单（2026-07-14）

### WORK-PORT-1 · Work command/projection 注入缝

权威：[ADR-010](../../docs/decisions/ADR-010-work-live-boundaries.md)。本单只建立行为等价的端口边界，
不宣称 production live：

- 将 `protocol/client.ts` 中混合的 demo `SessionEventClient` 拆为通用 `WorkProjectionPort`、只声明不装配的
  `WorkCommandPort`，以及明确住在 `demo/` 的 fixture review/telemetry adapter；
- `App` 不得模块顶层 `createDemoClient()`，改由 `main.tsx` composition root 显式注入；
- recording replay 查询至少携 `caseId/sessionId`，fixture adapter 只接受 `demo-linjiang` 与固定 demo session；
- 非 demo case 不得 fallback 到 recording、`GATES`、DEMO_ARTIFACTS 或 demo continuation；
- UI projection 继续只机械消费 `SessionEvent`，既有样板案节奏、自动开面、gate、review、continue 与视觉零改动；
- 不导入 core executor、不新增 Tauri command、不接 localStorage Work state、不新增 provider 路径或 PM UI。

静态门至少证明 App 零 `createDemoClient`/recording import，demo client 只由 composition root 装配，非 demo
查询被拒；定向测试用 injected fake projection 证明 App 不依赖模块 singleton。完整 desktop Vitest、全仓门与
隔离端口 Playwright 全绿。实现与验收异会话。

实现留痕（2026-07-14，已独立验收）：

- `protocol/client.ts` 删除混合的 `SessionEventClient`，按 ADR-010 落 `WorkSessionRef`、model route、start/resume/cancel command、六态 projection phase、command outcome，以及通用 `WorkProjectionPort` / 只声明不装配的 `WorkCommandPort`。React 不构造 `ScenarioRunInput`、tool input、provider、actor 或 schema。
- `main.tsx` 成为 demo Work 的唯一 composition root：显式创建 `createDemoWorkFixture()`，分别注入 projection 与 fixture adapter；`App.tsx` 删除模块顶层 singleton、`demo/client` 与 recordings import，只经注入的 `WorkProjectionPort` 查询并机械发布 `SessionEvent`。
- paced replay、固定 `demo-s1` / `demo-s3` recording、`GATES`、fixture artifact、review/continuation 与 telemetry 空 sink 全部收口 `demo/client.ts`。所有入口先校验 `{caseId:'demo-linjiang', sessionId}`；非 demo case、未知 session、跨 session request/telemetry 均 fail closed，未知 gate 不再回落空门禁。
- `replayWorkProjection` 以 injected fake projection 定向证明 UI orchestration 不依赖 singleton；`assert-work-port-contracts` 锁 App 零 recording/client 构造、main 唯一装配、legacy interface 退役、两枚通用 port 存在及 UI 零 executor input，并进入完整 E2E 前置门。
- 红灯基线：新静态门在旧实现上稳定报 **8 项 violations**；新定向 suite 因 `work-replay` / fixture port 缺席整组失败。实现侧转绿：定向 **3/3**，desktop Vitest **35 files / 145 tests**，root Vitest **120 files / 1078 tests**，13 workspace build 与 ESLint 全绿；`COURTWORK_E2E_PORT=1603`、`reuseExistingServer=false` 完整前置门与 Playwright **208/208 passed（4 workers，1.5m）**。既有样板案 pace、自动开面、gate、review、continue 与视觉断言未改。

### VIEW-ABI-1 · Host renderer 与 zero-wire fallback

权威：[ADR-009](../../docs/decisions/ADR-009-runtime-ports-and-harness.md)。desktop composition root 同次准入
`LEGAL_PACKAGE` 与 catalog-only `PM_PACKAGE`；只装载 descriptor/schema/presentation，不为 PM 虚构 scenario、
prompt、导航入口或 demo 数据。

新增 host-owned `HostRendererRegistry`，以版本化 `uiTemplateId` 绑定现有 Legal 面板和
`courtwork.artifact-table.v1` 通用表；package `RendererRegistry` 仍是纯声明，禁止注入 JSX/函数/CSS。
artifact 先从准入后的 artifact registry 取 descriptor，再查 host blueprint；`App.tsx` 与生产 workbench
路由删除 `artifactType === 'legal.*'`、`HOMED_ARTIFACT_TYPES` 和 raw object fallback。Legal 现有面板、
自动打开行为与视觉保持等价，只把路由依据从 type id 换成 `uiTemplateId`。

通用表必须整体验证 payload，再严格执行 presentation：collection pointer 从 artifact 根、field pointer
从 item 根；枚举/status/tags/grade 只显示 field-local `valueLabels`。anchor cell 只显示来源数量、可用页码和
完整 quote，不显示 bbox/textRange/raw JSON。未知 artifact、未知/不兼容 template、payload/schema/pointer/
format 不符统一进入安全兜底：只显示 descriptor 人读 title（无 descriptor 时使用中性标题）和
“当前版本不支持此工作面”。兜底不得出现 type id、wire key、原始枚举、绝对路径、hash 或 raw JSON。

UI 只复用现有 L1 外壳和 ledger/table 分割线，不新增入口、装饰卡、阴影、渐变或空 PM 页面。验收必须
使用 schema-valid PM fixture 证明 labels/valueLabels/完整 quote；分别注入未知 template、pointer drift、
畸形 payload 和 host blueprint 缺席，证明 fail closed 且零 wire 泄漏；静态门证明生产路由零垂类 type-id
switch。Legal 既有交互、desktop Vitest、全仓 build/lint/test 与隔离端口完整 Playwright 必须全绿。
实现与验收异会话。

实现留痕（2026-07-14，已独立验收）：

- `main.tsx` 的 composition root 同次准入 `LEGAL_PACKAGE + PM_PACKAGE`，构成唯一 `PackageRegistries` 并注入 `App`；PM 只贡献 4 个 artifact descriptor/schema/presentation 和通用 renderer 声明，运行时 scenario 仍全部来自 Legal，没有 PM prompt、demo、导航或空页面。
- 新增宿主自有 `HostRendererRegistry`：七个既有 Legal `uiTemplateId` 分别绑定 route/passive blueprint，`courtwork.artifact-table.v1` 绑定宿主 React renderer。`App` 的自动打开与模块展开均先经 admitted descriptor 解析 template，再查 host blueprint；生产路由删除四个 `artifactType === 'legal.*'` 分支、`HOMED_ARTIFACT_TYPES` 与 type-id 模块映射，Legal 面板实现和现有行为未改。
- 通用表先对完整 payload 执行 descriptor schema `safeParse`，再严格按 RFC 6901 从 artifact/item 两级投影；text/mono/number 形状不兼容即整面拒绝，enum/status/grade/tags 只接受当前 field 的 `valueLabels`。anchor 只投影来源数、去重页码与完整 quote，路径、坐标、range、版本/hash 和 raw object 没有展示通道。
- 未知 artifact、未知 template、package/host renderer 缺席、schema 畸形、pointer drift 与 format drift 共用 `UnsupportedArtifactView`：只给 descriptor 人读标题或中性“结构化产出”，正文固定“当前版本不支持此工作面”。旧 `generic-structure`/`GenericStructurePanel` 及其 raw key/value 树化测试已退役。
- UI 只在既有 Preview L1 内增加连续 table ledger：纯白数据面、hairline 分割、完整 quote 换行；无新增外壳、阴影、渐变、圆角或动效。`assert-view-abi-contracts` 收入完整 E2E 前置门，锁定 production route 零 Legal type-id switch 与 raw fallback 不得回流。
- 红灯基线：新增模块未实现时定向 Vitest **5 files failed**（4 missing suites + 3 behavior failures / 2 passed），静态 VIEW-ABI 守卫 **9/9 violations**；实现后同组定向 **5 files / 14 tests passed**、静态守卫 **9/9 passed**。实现侧最终门禁：desktop Vitest **34 files / 137 tests**；全仓 Vitest **120 files / 1044 tests**；全仓 build（13 个 workspace project）、root ESLint、site guard（12 fixtures + 613 active text files）全绿。`COURTWORK_E2E_PORT=1596`、`reuseExistingServer=false`、`--workers=1` 完整前置门与 Playwright **208/208 passed（2.8m）**。

#### VIEW-ABI-1C · estimate renderer 加固（2026-07-14，已独立验收）

- 通用表新增宿主 `estimate` cell：确定值显示 point，合法 `{low,high}` 显示区间，envelope 只在恰有 value 或 range 时显示数值，在二者皆空时显示当前 field 的 status label。
- renderer 不猜 sibling pointer，也不回落 wire status。双值 envelope、倒置/非有限区间、未知 status 或 shape drift 均触发既有整面 zero-wire fallback；schema-valid 区间与缺口状态有定向组件测试。实现侧定向 **1 file / 8 tests**、desktop 全量 **34 files / 142 tests**、VIEW ABI 静态门 **9/9** 全绿；完整 Playwright 留给异会话验收复跑。

### HOST-PORT-1 · Tauri provider transport 适配器

权威：[ADR-009](../../docs/decisions/ADR-009-runtime-ports-and-harness.md)。将 `Channel`/`invoke`、异步 transport queue 与 cancel command 从 chat orchestration 移入 host adapter；chat client/Turn projection 只消费注入的 `ProviderTransport`/factory。desktop composition root 负责选择 Tauri adapter，测试可注入 fake transport。

本单不改 Rust command、请求 body、provider catalog、DeepSeek 产品范围、credential UI、TurnEvent、chat 视觉或持久化语义；不得新增 localhost server、Node sidecar 或第三方 chat runtime。机器门至少证明 chat 业务模块不再 import `@tauri-apps/api`，fake transport 覆盖 stream/cancel/failure，既有 chat/credential 测试与完整 Playwright 零回归。

实现留痕（2026-07-14，待独立验收）：

- 新增 `host/tauri-provider-transport.ts`：`Channel`/`invoke`、异步 raw-event queue、既有 `provider_chat_request` / `cancel_provider_request` 与窄 input 构造全部收口于 host adapter；Rust command、body、失败分型和 keychain 安全边界未改。
- `main.tsx` 作为 composition root，只在 Tauri runtime 创建并向 `App` 注入 `ProviderTransport`；浏览器 E2E 不装配 host adapter，仍只经既有 stream-event hook 注入事件。
- `App` 与 `chat-client.ts` 只消费可注入 transport/provider factory；chat 业务模块移除 Tauri import、runtime 探测、command 名与 queue 实现。DeepSeek-only descriptor、OpenAI-compatible provider、Turn journal 与投影语义保持不变。
- 静态边界红测锁定 chat 不得回引 Tauri；fake host 单测覆盖 raw stream、同 request id cancel、invoke rejection 转 typed non-retryable network failure，并锁 Rust 入参不出现 URL、header 或 key。
- 实现侧门禁：desktop Vitest 31 files / 133 tests；全仓 Vitest 114 files / 981 tests；全仓 build 12 个 workspace、ESLint 均通过；隔离端口 `:1591` 完整静态门与 Playwright 208/208 通过。该组数字为实现侧记录；独立结果见下。

独立验收（2026-07-14）：

- 独立 clean worktree 从实现 tip `ba6426a` 建立；`b881508..ba6426a` 只触及 desktop 的 host adapter、composition root、chat 注入点、测试与本 SPEC。Rust、请求 body、provider catalog/security、Turn、持久化、样式与 UI 语义均无差异。
- `App.tsx` / `chat-client.ts` 对 `@tauri-apps/api` 与 Rust command 名零引用；Tauri adapter 只由 `main.tsx` 在 `__TAURI_INTERNALS__` runtime 注入。浏览器 hook 仍只注入 provider stream events，测试 provider 的 `generate()` 继续硬失败，不能绕过 `runTurn` 注入 final answer。
- 临时向 `chat-client.ts` 注入 Tauri API 边界漂移后，静态守卫真实 **1/5 failed**；精确撤除后 **5/5 passed**。fake adapter、chat client 与边界定向 **12/12**；desktop **133/133**；root **981/981**；Rust **25/25**；desktop/full build 与 desktop/root lint 全绿。
- `COURTWORK_E2E_PORT=1592`、`reuseExistingServer=false`、单 worker 完整前置门与 Playwright **208/208 passed（3.5m）**。另以临时 Tauri config 在独立 `:1593` 启动真实 Rust/Tauri 壳，`target/debug/courtwork-desktop` 存活 13 秒后正常结束，端口与进程均清理。
- **结论：HOST-PORT-1 放行。** 收账合入后，下游可把该 `ProviderTransport` 注入缝作为唯一 Tauri provider transport 边界；本单不代表 WorkCommandPort、CredentialCommandPort 或通用文件 HostTransportPort 已实现。

## 已完成架构工单（2026-07-13）

### CHAT-UI-1 · Turn 投影与通用提问卡

前置：PROVIDER-2、TURN-1、INTERACTION-1 已独立验收并合流。desktop 只消费 core turn/interaction view model：真实流驱动思考、reasoning、正文、错误与取消；删除 Typewriter 假流和 `App.tsx` 硬编码演示问题。刷新后从未决事件恢复卡片，提交回答须等待 core 接收，不允许本地 state 假完成。

`question-card` 使用 generated 冷调底色的轻微差异、1px hairline、既有 6px 圆角、无阴影，不新增 L1 外壳；无装饰入场，选项/主操作只用既有 120ms / scale(.98) press feedback，并覆盖 focus-visible、键盘选择、错误重试与 reduced-motion。卡片内容、选项、锚点来自垂类 manifest，desktop 不含领域文案表。

实现留痕（2026-07-14，待独立验收）：

- 新增 browser-safe `TurnProtocolClient` 与 localStorage journal envelope；core store 仍独占 replay/resolve 校验，known turnId 索引只导航、不绕过 core。损坏 JSON/index drift 与 quota 失败均 fail closed，不清历史；持久层只写 turn terminal/interaction events，不写 prompt、secret 或 transport。
- chat 统一经 `runTurn(provider.stream)`；started/reasoning/content/usage/completed/failed/canceled 全由 core `TurnEvent` 机械投影。正文 delta 在 provider terminal 前可见，terminal 后才做 Markdown；reasoning absent 有显式文案，Stop 只触发 AbortController，删除 Typewriter 与 final-result responder。
- `InteractionTurnCard` 只消费 replay request/resolution 快照；提交锁、失败重试和 first-wins 由 core resolve 驱动，non-skippable 不显示 Skip。本地 answer state 退役，Recorded 只在 `interaction_resolved` 回放后出现。
- legal demo 通过 `LEGAL_PACKAGE → admitPackages/buildPackageRegistries → requestInteraction` 注入。首条真实 risk quote 经当前合同 TextLayer resolver 铸造 range/version；source-open 校验 file/version/range/quote 后才打开原件并 focus/scroll 精确引语，未知或漂移显式失败。
- 问题卡使用 generated/verified 微差底色、1px hairline、6px、零 shadow/入场；选项是连续 ledger，证据引语完整换行。新增 `assert-chat-ui-contracts` 与独立 `chat-interaction.spec.ts`，Playwright 防降下限由 198 升至 208。

### PROVIDER-UI-1 · DeepSeek-first 配置面

随 PROVIDER-1 移除 custom provider 与可编辑 base URL；只显示 DeepSeek API key、模型和 reasoning 选择。UI 分开表达“凭证已存储”和“连接已验证/失败”，不得以填入 key 直接显示 connected。未来 provider 由 descriptor 驱动追加，当前不造空壳 provider 面板。

实现留痕（2026-07-13，待独立验收）：引导卡与 Settings 已删除 provider selector、`custom` 分支和 Base URL 输入，固定显示注册表中的 DeepSeek；key 继续只经既有 credential client 写钥匙串，模型发现/手填与 standard/deep reasoning 保留。`model-config` 从 `@courtwork/provider` descriptor 派生 provider/model/route，旧 `custom/baseUrl` localStorage 值回落默认配置；chat 对伪造 provider id 显式拒绝，不再合成 `json_object + reasoning_content + reasoning_effort` 临时 profile。端点失败文案不再要求用户检查不可编辑的 Base URL。Rust 兼容层未改，归 PROVIDER-2。

### POLISH-P0 · Minimap 生命周期与视觉基线

目标：先消除 Graph 快速卸载时 G6 Minimap 延迟回调访问已销毁 options 的运行时错误，再重建与当前代码同源的视觉证据。

范围：`GraphPanel` 生命周期、对应 Playwright 红测、视觉审计脚本与 `visual-audit/`。不改 `PartyGraph`、renderer ABI、主题语义或布局算法。

验收标准：

1. 先以至少 40 次 Graph ↔ Timeline 快速切换稳定触发当前 `calculateMaskBBox` TypeError；修复后同一测试捕获 `pageerror` / console error 为零。禁止吞异常、全局过滤 console、patch `node_modules` 或移除 minimap 规避。
2. 普通图谱渲染、选择、缩放、fit view 与 minimap 仍可用，图谱数据区无动画。
3. 隔离端口生成 1180 / 1280 / 1440 / 1600 四档工作台截图；manifest 必须记录实际 HEAD、viewport、端口、哈希与 reduced-motion，旧提交截图不得冒充现况。
4. 完成 desktop 定向测试、全量 Playwright、`pnpm -r build`、`pnpm lint`、`pnpm test`；由不同会话在 clean worktree 独立验收。

实现记录（2026-07-13）：

- 基线已有 `7a60764` 的首轮 minimap flush 补丁，但 1180×900 下 40 轮 Graph → Timeline 快切（偶数轮仅等 5ms）仍稳定触发 7 条 `this.options is undefined` pageerror。新回归同时记录未过滤的 `pageerror` 与 console error，末尾等待 1200ms 覆盖 rAF、render 尾段与 minimap 迟发回调交错。
- 最小修复保留 minimap `delay=0`；cleanup 不再依赖提前翻转的 `instance.rendered`，而是始终等完整 render promise settle，再留 32ms 回调清空窗口后销毁 Graph。未吞异常、未过滤 console、未 patch 依赖，也未改 `PartyGraph`、renderer ABI、主题或布局。
- 修后同一回归 `--repeat-each=5` 连续 5/5（共 200 轮）通过；关系选择、14/15 dagre、缩放、fit view 与 minimap 定向 5/5；desktop Vitest 24 files / 106 tests；全仓 Vitest 104 files / 850 tests；隔离端口 `:1525` 全量 Playwright 194/194（single worker）。`pnpm -r build`、`pnpm lint` 均 exit 0，仅保留既有 chunk size warning。
- 视觉审计在独立端口 `:1523` 基于实际 HEAD `304daac` 生成 `polish-p0-graph-{1180,1280,1440,1600}.png`；[`visual-audit/manifest.json`](visual-audit/manifest.json) 逐图记录 viewport、SHA-256、`reducedMotion=reduce` 与动画禁用。生成器强制显式 loopback 隔离端口并拒绝共享 `:1420`，旧截图已退役。
- 全量 E2E 前置门另暴露 `e6d6575` 文档路径迁移把 Thinking CSS slice 的 start/end 改成同一 marker，使门禁结构性必红；阻塞性实现级修复仅恢复紧邻 end marker（`944ee8f`），不改组件、规则或契约。

### SCHEMA-POLISH-1 · 证据、状态与下一步

目标：不新增面板、不改皮肤，让现有结构化工作面更清楚地回答“依据是什么、现在是什么状态、下一步做什么”。

契约边界：只消费现有 `ReviewMatrix.questions[].text`、`sourceAnchors`、`ReviewGateProjection`、disposition 与 usage/continuation 状态；不新增或改写 schema 字段，不把 demo 兜底冒充真实数据。

实现范围：

1. Progress 只保留事件；续行入口迁至 Context 的用量说明附近，使用主操作 ink，不使用风险红色。
2. 矩阵列头显示 `Qn · 问题短名`，完整问题保留可访问 tooltip；短名由现有 `question.text` 确定性裁切，不新增别名字典。
3. 引语在证据详情与 peek 中允许换行并完整呈现；只允许截断次要文件元信息。来源入口必须可聚焦，并诚实区分“查看引语”与尚未接通的“回到原件”。
4. 风险行与详情同时显示严重度、核验状态、处置状态和下一步；批量确认明确范围与排除数量，高危或未核验项仍只可逐条处理。
5. 空态保持文字型；L1 外壳数量不增加，内部优先使用分割线、排版和密度。触及文案遵循 chrome 英文、法律与案件内容中文。
6. 新增行为测试与 1180 / 1280 / 1440 / 1600 视觉证据；不得修改法律包 schema 或 core。

实现记录（2026-07-13，待独立验收）：

- Progress 回归纯事件列表；临界用量续行迁入 Context 用量块后的 `Next step` 行，继续消费既有 `ContinuationClient`，主操作使用 ink，红色只留给 usage critical 状态。
- 矩阵列头由 `question.text` 机械去问式、去括注与定长裁切为 `Qn · 短名`，无别名字典；完整问题以可聚焦、`aria-describedby` 关联的 tooltip 保留。
- 矩阵 cell、时间线详情与风险依据把“查看引语”和禁用的“回到原件 · 尚未接通”拆成两个诚实动词；引语全文换行，只有来源文件元信息省略。
- 风险 master 行在既有紧凑行内同时投影等级、核验、处置与下一步；详情使用分割线台账重复四态。批量条显示本次范围与逐条排除数量，`ReviewGateProjection` 的 batch/individual 资格和确认门禁未改。
- 新增纯函数 Vitest 与 Playwright 行为覆盖键盘 Enter、focus tooltip、完整引语、批量范围及 1180 横向边界；四档自审图只生成于 `/tmp/courtwork-schema-polish-1-{1180,1280,1440,1600}.png`，未修改 `visual-audit/` 或 finale manifest。

### DESLOP-GATE-1 · Courtwork 结构守卫

目标：把反 slop 从通用字符串黑名单升级为仓库专用、可注入反例触红的结构守卫。

验收标准：

1. 保留明确白名单：L1 唯一投影 token、登记圆角、法理之线五态、站点解释性滚动动画；通用 gradient/shadow/radius 检测不得误杀这些例外。
2. 至少覆盖裸色值、未授权阴影/圆角/渐变、L1 卡中卡、占位编号脚手架、泛化营销文案、活动代码引用 `archive/` 七类反例。
3. 扫描逻辑可被测试直接调用；每类规则至少一红一绿 fixture。新增例外必须显式写入按规则分组的 allowlist，并说明消费点，禁止宽泛路径豁免。
4. scoped press feedback 只覆盖主操作、图标按钮与弹层触发器，使用 `motion.press` 的 120ms / scale .98；数据行、表格、卡片与键盘动作不得缩放。popover 从触发器方向出现，且 reduced-motion 下移除位移。
5. 不复制既有 neutral/elevation/signature/motion gate 的全部规则；新守卫聚焦跨文件结构关系，并在根门禁可执行。

DESLOP-GATE-2 实现记录（2026-07-14，待独立验收）：

- `site/scripts/deslop-scan-lib.mjs` 以 rule + file + selector/consumer + property + exact token/value/shape 登记例外；`icon-audit.css`、graph theme、OS traffic chrome 均按消费点锁定，没有整文件通行证。
- CSS 守卫覆盖 raw color、非零 shadow、8/12/16px 圆角消费域和 gradient 完整值；既有渐变内部颜色已改为 token/语义值，任何 gradient 内部裸色都不因完整值或 selector 命中而豁免。
- JSX/HTML 守卫覆盖默认 `SurfaceCard`、raised elevation、静态及可静态判定 className 的 L1 嵌套；archive 守卫覆盖 markdown、URL、fetch/import/require 与 path consumer；站点 motion 锁定 evidence observer、target、statement 和 reduced-motion 的完整关系。
- `motion.press` 单源改为 120ms ease-out / scale(.98)，只供主操作、图标按钮、提问选项与 popover trigger；pointer 按压缩放，数据行、表格、卡片、键盘触发及 reduced-motion 均不缩放，普通/quiet 按钮保留底色反馈。popover 按实际 DOM consumer 与锚点上下方向逐项登记，数据区 cell peek 静止，reduced-motion 移除位移。
- Pages workflow 通过 `pnpm site:guard` 执行 fixture、全活动源扫描及既有四门；fixture 同时断言 workflow 不得退回只跑 scanner。
- 根 `site:guard` 先运行 12 组一红一绿 fixture 与全活动源扫描，再串行调用既有 neutral/elevation/signature/motion 四门；四个既有脚本未修改。另对真实活动文件逐项注入八类基础 drift 及拒绝报告中的宽泛逃逸，完整 scanner 均 exit 1，撤除后 570 个活动文本文件恢复全绿。

## HARNESS-0 单飞行与降档提示（2026-07-12）

- chat 每 turn 只允许一条在途请求：同步 ref 锁防同帧双击/Enter，composer 在途时禁用发送。
- core 事件投影携带 provider notice；若结构化输出迫使深思降为 standard，composer 模型 chip 显示“本次已用标准”。
- 新增 Playwright 单飞行反例；隔离端口 GOAL-1 9/9 实跑通过。

## PRV-1 · provider 自配最小闭环（2026-07-11）

历史实现记录；其中 custom/base URL 产品入口已由 ADR-007 与 PROVIDER-UI-1 覆盖，不再是现行要求。钥匙串明文隔离、连接探针和错误分型仍有效，待 PROVIDER-2 收口请求路径。

- 历史实现：引导卡与设置页曾接入 `base URL + API key + 模型名`，并开放自定义 OpenAI-compatible 档。该产品入口已由 ADR-007 / PROVIDER-1 取代；现行 UI 只登记 DeepSeek，不再允许编辑 URL 或猜测任意端点能力。托管积分档仍只保留禁用占位。

## HARNESS-0.1 实现记录（2026-07-12）

- Rust chat 窄面不再只验 `/chat/completions` 后缀：成功连接探针把 base URL 写入 Rust 可信状态，转发时按 scheme/host/port/完整 path 逐项比对；WebView 入参不能改目标 host，已验证 custom host 仍放行。
- 单飞行 e2e 改为同一 JS task 双击发送，直接咬住 `chatFlightRef` 同步守卫；删守卫时必须变红。
- F5 恢复文案同时覆盖现行单条目 `credential`、legacy `active-source`/`provider-secret` 与 dev service 后缀。
- `验证连接` 在 Rust 内从 FIX-KC-1 钥匙串取 key，先尝试 `GET {base}/models`，再发 `POST {base}/chat/completions` 的 `max_tokens: 1` 真请求；WebView 无读取明文命令。只有冒烟成功才进入 connected。
- 模型发现不支持/失败时保留推荐模型与手输，不阻塞已成功的冒烟；鉴权、限流、端点、模型、超时、网络、非法响应均走闭集分型文案。
- TDD：core quirk 路由测试；desktop 连接客户端测试；Rust 本地 mock HTTP 端点实收 GET+POST；Playwright 新增 4 条分型闭环；与并行 RP-2.10 两例合流后 floor `137 → 143`。
- 并行 RP-2.10 新增 `brand-mark` 后，旧 icon audit 仍锁 19 导致全量门禁阻塞；本单仅把审计清单数同步为 20，未修改品牌图标、ThinkingStream 或任何视觉实现。
- 实跑：desktop Vitest **79/79**；core Vitest **158/158**；Rust **10/10**（含本地 mock HTTP 真 GET+POST）；`pnpm -r build` 9 包通过；Playwright 完整门禁 **143/143**，随后独立端口 `--workers=1` 再跑 **143/143**。全量并行曾暴露 composer 测试只等静态 event-stream 的竞态，补为等待真实首条 progress 后，单文件 repeat 15/15 与两轮全量均绿。

## RP-2 · UI 完全化提案（实现前，2026-07-11）

权威：docs/decisions/ADR-006-ui-host.md + docs/design/principles.md 动效规则。范围只在 desktop；凭证 Rust/TS 与 `packages/*` 不动。

### 宽比固定档（#20）

| 档位 | 左栏 | chat | 右栏 | 触发 |
|---|---:|---:|---:|---|
| `balanced` | 248px | minmax(440px, 0.9fr) | minmax(520px, 1.25fr) | 默认 |
| `work-wide` | 48px | minmax(400px, 0.72fr) | minmax(680px, 1.55fr) | 工作面对照/用户折叠左栏 |
| `chat-focus` | 48px | minmax(0, 1fr) | 48px | 双侧折叠 |

只允许以上离散档位，栏折叠 0ms 硬切，不做拖拽无极缩放；展开钮留在原栏位形成 48px 视觉 bar。

### chat 降噪形制（#21）

- 人类消息右对齐、`bg.selected` 浅底、无描边；agent 正文左对齐直接落 L0 画布，不包框。
- D 编号、请求中/成功/失败、审阅提示合并为单列 `event-stream`：12px 元信息 + 状态点 + 一行办案文案，条目间仅 1px hairline；不再各自成卡。
- reasoning 默认折叠，运行时才显示 motion ladder 允许的呼吸；完成后内容静止。artifact（docx、风险结果等可操作产出）保留纯白承重卡。

### 运行反馈阶梯（#26）

| 阶段 | 形制 | 动效纪律 |
|---|---|---|
| 请求中 | composer 发送键就地禁用 + `正在处理`；事件流追加 active 行 | 2–5s 使用 2000ms opacity 呼吸；不裸奔 spinner |
| 成功 | active 行 0ms 硬切 confirmed + `已完成` | 状态本体零 transition；可用独立 150ms border-color 回执层 |
| 失败 | active 行 0ms 硬切 failed + 就地重试 | 琥珀/红只消费既有 semantic token；不显示模型假态 |
| OCR/摄取 >5s | 事实进度数字 + 当前步骤办案文案 + 骨架块 | 2000ms 骨架呼吸；表格/图谱/文书数据区绝对静止 |

hover 统一 120ms ease-out；动画属性只许 transform/opacity/background-color/border-color；`prefers-reduced-motion` 下长任务动画停用但状态文案与进度必须保留。

### RP-2 实现记录

- #18′：唯一模型声明位迁到 composer 发送键旁；connected 显示模型名·强度，pending/failed 不泄露配置模型名；context、toolbar、statusbar、titlebar 旧声明位清零，复用唯一 popover。
- #19/#20/#23：wordmark 唯一；案件头进 chat 且双击编辑、按案件 id 写入 localStorage；宽比采用上述固定三档；左右栏各有独立折叠/原位 48px 展开 bar。
- #21：D 编号、运行进度、审阅提示合并 `event-stream`；用户消息右对齐浅底无框；artifact 卡保留。
- #24′/#25：定稿英文声明逐字落地，feedback 为 mailto；左下负责人菜单含设置、检查更新路由与 feedback，非 demo 不显示律师名。
- #26：事件流 active/success 反馈、附件既有失败/重试和 >5s 进度文案沿用；长任务仅 opacity 呼吸，reduced-motion 停用，数据区静止。
- TDD：新增 `rp2.spec.ts` 5 例；Playwright floor 90→95；Vitest 70/70；RP-1+RP-2 定向 15/15；四静态门禁与生产构建通过。
- visual-audit：frontier 参照 [`24-rp2-frontier-reference.png`](visual-audit/24-rp2-frontier-reference.png)；改后全栏 [`24-rp2-full-layout-1440.png`](visual-audit/24-rp2-full-layout-1440.png)；双折叠 [`25-rp2-chat-focus-1440.png`](visual-audit/25-rp2-chat-focus-1440.png)。改前基线沿用 RP-1 [`23-rp1-full-layout-1440.png`](visual-audit/23-rp1-full-layout-1440.png)。

### RP-2.1 · 分层悬浮纵向贯通（2026-07-11）

- Cowork 范式优先：app shell 清除 titlebar / toolbar / statusbar 三条跨栏横带；左、右 L1 浮面从窗口内容顶部贯通到底部，中栏保持 L0 chat 画布。
- 左右栏各自折叠；按钮位于各栏顶部，折叠后形成 48px 贯通 bar，展开按钮保持原坐标。
- wordmark 迁左栏顶；chat 顶部仅保留案件名、案号、样板标识、阶段短标签及设置/⌘K，不扩写说明文本。
- 死路由清理：未接通的「审阅记录」「导出审阅稿」常驻按钮移除；用量归 context，运行态归事件流，继续阶段归 progress，产出文件夹归左栏产出入口与 artifact 卡。
- visual-audit：[`26-rp2-1-vertical-full-1440.png`](visual-audit/26-rp2-1-vertical-full-1440.png) / [`27-rp2-1-vertical-collapsed-1440.png`](visual-audit/27-rp2-1-vertical-collapsed-1440.png)。
- RP-2.2：composer 声明移出 L1 输入浮卡，保持同宽底对齐并允许自然换行；chat/rail/module/work-surface 标题统一 `min-width:0 + nowrap + ellipsis`，计数与动作固定，收窄时禁止逐字竖排或越界。Playwright floor 95→96。

### RP-2.3 · 比例与 Schema 工作面收口（架构批准 `43d99cd`）

- 数学闭合写死：`1180–1239px` 自动进入左栏 48px 收敛态；`≥1240px` 才允许左栏展开。禁止依赖用户先手动折叠来消除初始溢出。
- 宽度钩子：左栏 248/min224、chat min420/0.9fr、schema min560/1.25fr、折叠 48；全部由根 CSS 变量进入 `minmax()`，本单不做 resize handle/持久化。
- Schema 四层：通用模块头 → 工作面标题/计数 → Tabs → schema 主工作区；正文消费 `type.dense.bodySize=13px`，Tab/表头/计数消费 `type.dense.metaSize=12px`，编号消费 dense mono。
- 560–700px schema 容器内，风险主从区由左右 38/62 切为上下 34/66；图谱索引下移。选中仍只用 `bg.selected`，内部以 hairline 分隔，不新增卡层。
- **阅读不变量**：document preview / draft reading 固定 `15px / 1.6`，不随 schema dense 或容器宽度缩小。
- 自动验收：1180/1280/1440/1600 四档均断言 `scrollWidth ≤ clientWidth`、标题 nowrap/ellipsis、schema 正文 ≥13px；1440 另锁文书 15px。Playwright floor 96→100。
- visual-audit：[`rp2-3-1180.png`](visual-audit/rp2-3-1180.png) / [`rp2-3-1280.png`](visual-audit/rp2-3-1280.png) / [`rp2-3-1440.png`](visual-audit/rp2-3-1440.png) / [`rp2-3-1600.png`](visual-audit/rp2-3-1600.png)。

### RP-2.4 · 左栏卷宗分区降噪

- 选中底色只覆盖案件摘要行，不再染满整个展开卷宗；展开体固定白底，以 hairline 分区。
- 展开结构明确为「阶段」→「卷宗原件 · 只读」→「工作区」，撤销抽象且重复的「三区」标题。
- 原件由松散 hover 小卡改为 34px 紧凑列表 + 行分隔线；文件名、原名、只读状态与打开动作保持可达。
- visual-audit：[`rp2-4-rail-sections-1440.png`](visual-audit/rp2-4-rail-sections-1440.png)。

## FIX-KC-1 · 凭证授权流（据 DBG-2，2026-07-11）

权威：当时的架构工单册 FIX-KC-1。落点 `src-tauri/src/lib.rs` + `credentials/client.ts` + 设置页诊断/恢复。

| 项 | 实现 |
|---|---|
| DBG-2.1 trace | `COURTWORK_CRED_TRACE=1` → `~/Library/Logs/cn.courtwork.desktop/credential-probe.log`（1MB 轮转）；默认关；无 secret/source 值 |
| F2 ACL 止血 | save：`delete`（忽略 NoEntry）→ `set` 整组重写 |
| F4 分型 | `failKind`：`user_canceled` / `auth_failed` / `acl_denied` / `missing` / `platform`；诊断导出 `credentialFailKind` |
| F5 恢复 | 设置页 failed 态展示钥匙串密码指引 + 手动删除 `cn.courtwork.desktop.provider` 两项 |
| F6 dev 隔离 | `debug_assertions` → service `…provider.dev`；release 仍 `…provider` |
| 不做 | F1 Developer ID（BUILD-2）；F3 单条目合并 |

验证：Rust 9 单测；desktop Vitest 70；Playwright **90/90**（下限 90）。

## Build 记录（SITE-1 下载区引用）

### BUILD-0.1.2-CANDIDATE · 架构收口后的开发构建（2026-07-14，待独立验收）

| 项 | 值 |
|---|---|
| 版本 | **0.1.2**（`package.json` / `tauri.conf.json` / `Cargo.toml` / `SettingsPage.APP_VERSION` 对齐；Cargo.lock 同步） |
| 纳入 main | `0399d0476a7874bc608edd4ed4ddb444f0f57f7f` |
| 产品源码 | `2021c8cd2379739bbd0cef229c0e7d141b5cd8ee`；后续只回填 release/docs/site 真值 |
| 构建时刻 (UTC) | `2026-07-14T13:51:55Z` |
| 标识 / 架构 | `cn.courtwork.desktop` · `Courtwork` · thin `arm64`（Apple Silicon） |
| 工具链 | Node `v25.9.0` · pnpm `9.15.0` · rustc/cargo `1.97.0` · macOS `26.5.2` |
| 签名 / 公证 | **ad-hoc / 未公证**；`Signature=adhoc`、`TeamIdentifier=not set`、identity 0；Apple 公证环境项均 absent |

| 产物 / 校验 | 结果 |
|---|---|
| DMG | `apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.2_aarch64.dmg` · 4,679,277 bytes |
| DMG SHA-256 | `f4af2a44248c7d7af970c8486ccaf7c8d72107565c4d824ce9cb8d69578de83d` |
| 可执行 SHA-256 | `f80d46c0bf1ed03593dbb1ed5e0db512937f3473361b92e47580ec1cd7ae0b51` |
| 前端 dist 清单 SHA-256 | `e3f27e21a833a2fad6f8824ed1946e960e745d529e6f625dad375da76fc0ad9a` |
| 完整性 | App 与挂载副本 `codesign --deep --strict` 通过；`hdiutil verify` VALID；DMG 含 `Applications` symlink |
| Gatekeeper | `spctl` exit 3 / rejected，符合未公证开发构建预期 |
| 挂载启动 | 排除 main 与 `/Applications` 同 bundle id 串包后，直接执行挂载 Mach-O；PID/path 逐字命中挂载点，存活 8 秒后 TERM |

实现侧全门：site guard 产品源码前置门 **25/25 / 685 active files**，真值回填后 **25/25 / 687**；desktop **39 files / 161 tests**、provider **12 / 88**、root **131 / 1127**、Rust **25/25**；全仓 build desktop **3532 modules**；隔离 `:1612`、单 worker Playwright **209/209**。完整证据见 [`release/CANDIDATE_v0.1.2.md`](../../release/CANDIDATE_v0.1.2.md)；本记录不构成独立验收或发布放行。

### BUILD-0.1.1-R2 · 全量验收后 GitHub Release 候选（2026-07-14）

| 项 | 值 |
|---|---|
| 版本 | **0.1.1**（`package.json` / `tauri.conf.json` / `Cargo.toml` / `SettingsPage.APP_VERSION` 对齐） |
| 产品源码 HEAD | `0443e81b1b97cf47b45fa8f2dd7f8ed886c80f31`（CHAT-UI-1 与 SITE-2B 均已独立放行） |
| 构建时刻 (UTC) | `2026-07-14T02:02:57Z` |
| 标识 / 架构 | `cn.courtwork.desktop` · `Courtwork` · `aarch64`（Apple Silicon） |
| 工具链 | Node `v25.9.0` · pnpm `9.15.0` · rustc `1.97.0 (2d8144b78 2026-07-07)` · cargo `1.97.0` · macOS `26.5.2` |
| 构建命令 | `pnpm --filter @courtwork/desktop tauri build --bundles app,dmg` |
| 签名 / 公证 | **ad-hoc / 未公证**；`Signature=adhoc`、`TeamIdentifier=not set`。本机 `security find-identity` 为 0，notarytool profile 与 Apple 环境凭证均不存在 |

| 产物 / 校验 | 结果 |
|---|---|
| App | `apps/desktop/src-tauri/target/release/bundle/macos/Courtwork.app` |
| DMG | `apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.1_aarch64.dmg` · 4,667,331 bytes |
| `codesign --verify --deep --strict` | **OK**；DMG 挂载副本同样通过 |
| `hdiutil verify` | **VALID**；CRC32 `$405ED3DE` |
| 真机启动 smoke | app 进程启动存活，验后正常退出 |
| Gatekeeper | `spctl` exit 3 / rejected，符合未公证开发构建预期；Release 与官网必须显式告知 |
| 可执行文件 SHA-256 | `4f43773ecdfbb21c795d31e84cd9781a500acf0e029bbc8458e872aae546b499` |
| DMG SHA-256 | `37792b767fe08119edab3cc6b793e59cd4511758110f8b42e6242e80a023db7e` |
| 前端 dist 清单 SHA-256 | `d8c6c84e864fe305e27ce1a8ed2114834f15e60ae59333e7478f0cbdbbfb3510` |

发布前主树实跑：site guard **12/12 / 590 active files**；desktop **129**、provider **86**、root **981**、Rust **25**；全仓 build desktop **3504 modules**；隔离 `:1583`、单 worker Playwright **208/208**。Release 元数据提交只修改文档、官网与校验文件，不改变上述产品源码/制品字节。


### BUILD-0.1.1 · Ship Gate 合流后正式 Build（2026-07-12）

| 项 | 值 |
|---|---|
| 版本 | **0.1.1**（`package.json` / `tauri.conf.json` / `Cargo.toml` / 关于页 `SettingsPage.APP_VERSION` 对齐） |
| 裁切 HEAD | `93e7a00`（0.1.1 合流终验放行；main 其后 docs 板面不改产品码） |
| 构建时刻 (UTC) | `2026-07-11T17:28:24Z` |
| 标识 | `cn.courtwork.desktop` · productName `Courtwork` |
| 架构 | `aarch64`（Apple Silicon） |
| 签名 | **ad-hoc**（`signingIdentity: "-"`；`CodeDirectory flags=adhoc,runtime`；TeamIdentifier 未设） |
| 公证 | **未做**（无 APPLE_ID/TEAM_ID/API_KEY；挂账：正式发行需 Developer ID + notarization） |
| 工具链 | Node `v25.9.0` · pnpm `9.15.0` · `rustc 1.97.0 (2d8144b78 2026-07-07)` |

**产物路径（本机构建输出，不入 git）**

| 产物 | 路径 |
|---|---|
| App | `apps/desktop/src-tauri/target/release/bundle/macos/Courtwork.app` |
| DMG | `apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.1_aarch64.dmg` |
| 可执行文件 | `Courtwork.app/Contents/MacOS/courtwork-desktop` |

**校验（B 阶段判例：DMG 级哈希不可复现为唯一真理；签名 + 前端内容哈希做确定性校验）**

| 校验 | 结果 |
|---|---|
| `codesign --verify --deep --strict Courtwork.app` | **OK** |
| `codesign --verify --strict` 可执行文件 | **OK** |
| `hdiutil verify` DMG | **VALID**（CRC32 校验通过） |
| 可执行文件 SHA-256 | `d086e23ee001a0756bc8c1a19f3f7629a14655e0fb351bac9f3d3b5cb7f13d1a` |
| DMG SHA-256（本机本趟） | `dbf0e1c2e31994d02edcad579778152f75cb096db5683bec714dedb182cec39a` |
| 前端 dist 清单 SHA-256（`find dist -type f | sort | xargs shasum -a 256` 再 hash） | `dc0557b4d8719804c7e5c7977dc64c1a6a30024ff25810ee8ac7214b6b526660` |

注：版本号提交与本 Build 记录同批；产品行为零改（仅版本字面量 + 本记录）。用户闸：装包后 DeepSeek「验证连接」真 key 首跑。

### BUILD-1 · 0.1.0 base 定形版（2026-07-11）

| 项 | 值 |
|---|---|
| 版本 | **0.1.0**（`package.json` / `tauri.conf.json` / `Cargo.toml` 对齐） |
| 裁切 HEAD | `a964baa`（含 F-1.1 `287ca17` + 复验报告代提交） |
| 构建时刻 (UTC) | `2026-07-11T00:40:44Z` |
| 标识 | `cn.courtwork.desktop` · productName `Courtwork` |
| 架构 | `aarch64`（Apple Silicon） |
| 签名 | **ad-hoc**（`signingIdentity: "-"`；`CodeDirectory flags=adhoc,runtime`；TeamIdentifier 未设） |
| 公证 | **未做**（无 APPLE_ID/TEAM_ID/API_KEY；挂账：正式发行需 Developer ID + notarization） |

**产物路径（本机构建输出，不入 git）**

| 产物 | 路径 |
|---|---|
| App | `apps/desktop/src-tauri/target/release/bundle/macos/Courtwork.app` |
| DMG | `apps/desktop/src-tauri/target/release/bundle/dmg/Courtwork_0.1.0_aarch64.dmg` |
| 可执行文件 | `Courtwork.app/Contents/MacOS/courtwork-desktop` |

**校验（B 阶段判例：DMG 级哈希不可复现为唯一真理；签名 + 前端内容哈希做确定性校验）**

| 校验 | 结果 |
|---|---|
| `codesign --verify --deep --strict Courtwork.app` | **OK** |
| `codesign --verify --strict` 可执行文件 | **OK** |
| `hdiutil verify` DMG | **VALID**（CRC32 校验通过） |
| 可执行文件 SHA-256 | `1bc04921a0d7079add2e942783a5d0c94b924490b0fcb1b7a98d922892fd9395` |
| DMG SHA-256（本机本趟） | `3eb460953f72805e7aaeb5ef134e27998046014c772971ebaaeb26d3bb656192` |
| 前端 dist 清单 SHA-256（`find dist -type f \| sort \| xargs shasum -a 256` 再 hash） | `e3ad17ebcbaaeffff298b532ee70330e260fd8adac032be10628e50adefe8e94` |

dist 文件级哈希（确定性内容）：

| 文件 | SHA-256 |
|---|---|
| `assets/GraphPanel-COcw8UHa.js` | `5bee450b91d9e6c01c49b269116a2c4741f09f4b700797d6cf19482fad94045b` |
| `assets/index-BhnbIzPD.js` | `1ca6fb9378fba0143ba79e192c359b14a3356daadc318fa69825b39b9000ae91` |
| `assets/index-BJ_am3Ro.js` | `946bea5057385262d78465b8ebc996550727fc2a90531265b9637df5aeca5d7d` |
| `assets/index-DFzbYuJD.css` | `0696faeab653a5322cf4157ac1701589cd3442776b32d882d4bb9dad4dddebde` |
| `assets/index-DuJ_cBxF.js` | `de7f32fb04c81152474c6862034de28f0c56ccbaf619e7add7e7b4b708423c2c` |
| `courtwork-mark.svg` | `674284d99c59879595071b0cce1074874cd57885f92765e60e360de93e557b5e` |
| `index.html` | `f73370c6c4c4c925aa22d97d3e6f878b9d9601fa21718c43d7ee613e18c2744b` |

**构建环境**

| 工具 | 版本 |
|---|---|
| Node | v25.9.0 |
| pnpm | 9.15.0 |
| rustc | 1.97.0 (2d8144b78 2026-07-07) |
| cargo | 1.97.0 (c980f4866 2026-06-30) |
| 主机 | macOS 26.5.2 · arm64 |
| 命令 | `pnpm --filter @courtwork/desktop tauri build --bundles app,dmg` |

**挂账（不冒充已公证发行包）**

- Apple Developer ID 证书与 notarization：正式对外分发前必须补齐；当前产物仅 ad-hoc，适用于本机安装验收与 SITE-1 下载区「开发构建」标注。
- DMG 字节级 SHA-256 因时间戳/元数据可能不可跨机复现；复验以 **codesign 通过 + dist 内容哈希一致 + hdiutil verify VALID** 为准。

## RP-1 desktop 最终重排（2026-07-11，Build 门）

权威：`docs/decisions/ADR-006-ui-host.md`、`docs/decisions/ADR-005-data-security.md` 与 `docs/design/tokens.json`；批次编号只用于本节历史追溯。

### A 左栏

- 混排时序列表：案件 / 工作区 / 未归档对话同列；前置图标承载类型（卷宗 / 文件夹 / 气泡）；未归档行尾「存入」；**不分区**；Pinned 在上。
- 仅案件行 chevron 展开 → 阶段 + 三区（工作结构非对话史）。
- 导航骨架四位：产出（真路由 → 工作区级产出目录）；定时 / 派发（`aria-disabled` + 「即将支持」tooltip）；Customize 不做。
- `#17`：主办律师 = demo persona；非 demo 不显示；`CASE_SCOPE_AUDIT` 补行。

### B 右栏模块栈

- 声明渲染折叠栈：通用三件常驻（progress / working folders / context）+ 垂类工作面同栈；默认面板头可见（名称 + 计数 + 状态点）。
- progress 面板头吸收阶段进度 `N/6`（frontier `17 of 17` 形制）；working folders = 三区树（原件只读标记）；context = 用量明细 + 附件来源 + connected 模型 chip。
- `artifact_produced` 自动展开对应模块；用户手动折叠/展开优先于自动。
- Tab / 对照 / 专注不推翻：同栈三种视图密度，增量迁移。

### C 画布-浮面三层

- L0：对话流坐页面底色（冷灰），去卡壳。
- L1：左栏 / 右栏 / composer = 纯白面 + inset 不贴边 + 圆角 12 + 细描边、**零投影**。
- L2：popover 既有（`surface-popover`）。
- 标题栏透明化：wordmark + 全局动作；模型服务常驻状态条；**仅 failed 态**在标题栏浮现琥珀警示。
- 收缩态：左栏折叠 + 右栏全折 → 画布 + composer 浮卡 + 折叠按钮。
- `#16`：model-config 关闭按钮动词直白（「关闭」），主次按钮层级照 docs/design/principles.md（次要 quiet）。

### Elevation token 提案（实现前写入，供架构过目）

| Token | 提案值 | 用途 |
|---|---|---|
| `elevation.canvas` | `color.bg.app` `#EDEDED` | L0 页面底色 / 对话流地面 |
| `elevation.float` | `color.bg.raised` `#FFFFFF` | L1 浮面填充（左/右/composer） |
| `elevation.floatBorder` | `color.border.hairline` `#EBEBEB` | L1 细描边 |
| `elevation.floatRadius` | `12` | L1 圆角（docs/design/tokens.json；非 `radius.lg` 6 的列表卡） |
| `elevation.floatInset` | `8` | L1 相对画布的 inset 间距（px，4 基阶） |
| `elevation.shellGap` | `8` | 浮面之间水平/垂直缝 |
| `elevation.shadow` | `none` | 硬性：零投影（de-slop #6 / shadow.none） |
| `elevation.titlebar` | `transparent` | 标题栏融入红绿灯 chrome |
| `elevation.warnBg` | `color.semantic.gate.pending.bg` `#FCF6E8` | 标题栏 failed 琥珀警示底（复用既有语义色，不新增色相） |
| `elevation.warnFg` | `color.semantic.gate.pending.fg` `#B45309` | 警示文字 |
| `elevation.warnBorder` | `color.semantic.gate.pending.graphic` `#D97706` | 警示描边 |

纪律：不得引入投影；不得新增语义色相；CSS 只消费 token / CSS 变量。

验证：9 包 build；Vitest 全绿；Playwright 全过且假绿下限随新用例上调；四门禁；e2e 覆盖混排图标与展开、未归档「存入」、progress 面板头计数、artifact 自动展开、标题栏琥珀仅 failed、收缩态。

### RP-1 实现落点（完工自检 2026-07-11）

| 块 | 落点 |
|---|---|
| A 左栏 | `src/rail/CaseRail.tsx` + `types.ts`：混排/Pinned/chevron 展开/导航骨架/存入；#17 `lead-attorney`；**A2** 卷宗计数→展开态 `originals-zone` 滚入/高亮（`focusOriginalsZone` rAF 重试） |
| B 右栏 | `src/modules/*`：progress/working-folders/context + 垂类 Tab 同栈；**B2** context chip 只 `setModelConfigOpen(true)`，与状态条共用同一 popover/`updateModelConfig` |
| C 三层 | elevation 变量；L0/L1；标题栏琥珀仅 failed；收缩态；**C2** 状态条只迁 `N/M` 至 progress 头，用量/摄取/续行/产出/模型原位 |
| #16 | `ModelConfigPopover` 关闭动词「关闭」 |
| #17 audit | `CASE_SCOPE_AUDIT` 补 `rail-footer lead attorney` |
| e2e | `tests/e2e/rp1.spec.ts`（9）；`assert-test-count` floor **87** |
| 截图 | `visual-audit/22-rp1-compact-layout-1440.png` / `23-rp1-full-layout-1440.png` |

Elevation 提案全量（与 tokens.json `elevation` 一致，供架构过目）：

| Token | 值 |
|---|---|
| canvas | `#EDEDED`（bg.app） |
| float | `#FFFFFF`（bg.raised） |
| floatBorder | `#EBEBEB`（border.hairline） |
| floatRadius | `12` |
| floatInset | `8` |
| shellGap | `8` |
| shadow | `none` |
| titlebar | `transparent` |
| warnBg / warnFg / warnBorder | gate.pending 三轨（琥珀，不新增色相） |

## SET-1 设置页（2026-07-11）

规格：当时的 UI 清单「设置页清单」——分组/条目/路由状态不增不减。

- 入口：标题栏齿轮 `open-settings` + ⌘K「设置」；全局层浮面，容器无关；分组切换 0ms；Esc 关闭。
- 真实：key→D-1 探针；provider/模型/推理→`model-config`；maxUsd→`settings-store`（RuntimeGuard）；默认产出目录+reveal；遥测开关；行为数据 opt-in 确认制+时间戳；数据承诺声明页（docs/decisions/ADR-005-data-security.md）；版本/许可/诊断导出（无密钥）。
- 预留禁用+tooltip：来源授权、企微/飞书/邮件/企业库、清除偏好、检查更新。
- 明确不出现：主题、语言、skill 管理。

验证：Vitest settings-store；Playwright `settings.spec.ts`；假绿下限 **78**。

## UX-1 微调批次一（2026-07-11）

实现范围：当时的 UI 清单 #1–#10 + D-1 打回 0a/0b。裁决不重开。

### 0a composer chip 案件作用域

- `App` 注入 `cases` 投影 + `activeCaseId`；禁止非 demo 粘滞 `DEMO_CASE_OPTIONS`。
- 容器切换同步 chip 文案并清空附件；`CASE_SCOPE_AUDIT` 补登 `Composer DEMO_CASE_OPTIONS / case chip`。
- 死路由表补行（下表）；切换矩阵 e2e 断言 chip 不含「临江」。

### 0b e2e 光标依赖

- 统一 `tests/e2e/helpers.ts` → `openWorkbench` 末尾 `page.mouse.move(0,0)`，消除 `onMouseEnter` 抢占初始高亮。

### 批次要点

| # | 落点 |
|---|---|
| 1 | `case-file-count` 点击滚入 `originals-zone` |
| 2 | `container-copy.ts` 双词表；`CaseSummary.kind` |
| 3 | 无容器存入 → `containerize-popover`（创建案件/项目） |
| 4/5 | 平铺上传·chip·发送；`+` 菜单收纳相机/语音/文件夹 |
| 6 | `composer-folder-input` webkitdirectory 批量附件 |
| 7 | `ThinkingStream` 默认折叠 + spark-lines |
| 9 | **结论：G6 minimap 右下角库蓝** → `courtwork-minimap` tokens 压制 |
| 10 | 状态条模型名 → popover 读写 provider/模型/推理强度（标准·深思） |

验证：desktop Vitest **49**；Playwright **74/74**；假绿下限 **74**。

## D-1 真机实测三缺陷修复（2026-07-11）

### 1. 模型连接状态 — 探针驱动三态

| phase | UI 文案 | 条件 |
|---|---|---|
| `pending` | 待连接 | 未配置 |
| `connected` | 已连接 | 钥匙串/内存读取成功 + 格式校验（粘贴 ≥8 字） |
| `failed` | 连接失败 | 授权拒绝 / 格式非法；title 附「钥匙串授权未通过…」等零技术文案 |

- 任何路径不得乐观默认已连接；`save` 失败不关对话框、不写 connected。
- Playwright 三分支 + 短凭证失败：`tests/e2e/d1-case-scope.spec.ts`；Vitest：`credentials/client.test.ts`。
- 测试注入：`window.__CW_FORCE_CREDENTIAL__` / `__courtworkCredentials`（非 demo 装配）。

### 2. demo 语料容器隔离

- `isDemo` / `DEMO_CASE_ID` 标记样板案；角标「样板案·演示」。
- `DEMO_ARTIFACTS` **仅** demo 容器回落；非 demo 工作面/对话为空态虚线框。
- 新建案件 `isDemo: false`，不绑定 demo 根路径。

### 3. 溢出全局审计与修复

| 控件 | 修复 |
|---|---|
| 归档 popover 案名 | `.archive-case-title.truncate` + title tooltip |
| 归档按钮 | 固定 20×20 icon，title 含全案名 |
| 标题栏案名/案号 | activeCase 派生 + truncate |
| 工具栏阶段 crumb | max-width + truncate |
| 凭证按钮 | max-width 200px ellipsis |
| 阶段行 | 主文案 flex truncate |
| 附件 chip / 用户消息文件名 | max-width + ellipsis |
| 数据卡/矩阵/时间线 | 既有 de-slop #11 保留 |

### 4. 死路由 / 容器作用域审计

权威表：`src/case/case-scope.ts` → `CASE_SCOPE_AUDIT`。

| 符号 | 定性 | 处置 |
|---|---|---|
| `DEMO_ARTIFACTS ??` 渲染回落 | 死路由 | 仅 `isDemoCase` 时回落 |
| `caseRoot ?? DEMO_CASE_ROOT` | 死路由 | `resolveCaseRoot` 非 demo 不回落 |
| `DEMO_OUTPUT_*` 直读 | 死路由 | `caseOutputDir(caseRoot)` 派生 |
| 标题栏硬编码临江案 | 死路由 | `selectedCase.title` |
| `flow` / `session` / 处置态 | 应派生 | `selectedCaseId` 切换整体 `__clear__` + 重置 |
| `createDemoClient` 单例 | 合法全局 | 仅 demo 调 replay |
| 凭证 browserStatus | 合法全局 | 本机域非案件域 |
| `Composer DEMO_CASE_OPTIONS` / case chip | 死路由（UX-1 0a 已修） | activeCase 投影注入；随切换重置 |

**容器切换矩阵**（Playwright）：demo(A) 有状态 → 新建 B 零继承（含 composer chip）→ 回 A 恢复 → 再进 B 仍空。

截图：`visual-audit/22-d1-credential-failed-1440.png` / `23-d1-new-case-empty-1440.png`。

验证（D-1 当时）：desktop Vitest 45；Playwright 67/67。**UX-1 后见上节 49 / 74。**

## 定位

三栏工作台：左 = 案件/session 列表（一案一文件夹一持续上下文）；中 = 对话流 + 场景卡片（按钮是主入口，聊天框是兜底）；右 = 结构化交互（时间线 / 关系图谱 / 矩阵审阅 / 修订预览 / 起草画布，全部可点击溯源回原文）+ 确认节点交互。

## 已定约束（Design 阶段的输入）

- 壳选型倾向 Tauri v2（docs/architecture/system.md 结论），Design 阶段最终定
- UI 是 core 事件流协议的纯客户端，不含业务逻辑
- 前端组件基线：vis-timeline / AntV G6 / AG Grid Community / react-pdf-highlighter（license 已核，见 docs/architecture/system.md）
- 每个关键产出节点留人确认（交互护栏，产品纪律）
- 所有对 artifact 的修正是 schema 级操作，经 core 落 RevisionEvent

## B 阶段实现记录

- 完整工作台帧：40px 标题栏、40px 工具栏、三栏等高面板头、32px 全宽状态条；1280/1440 窗口策略无横向溢出。
- 右栏五工作面全部实现：事件时间线、可选择关系图谱、10×7 合同矩阵、风险主从审阅 + Word 修订预览、起草画布与显式单向冻结仪式。
- UI 通过 `SessionEventClient` 只消费 `SessionEvent` 与确认/续行接口；事件投影器只做判别联合的机械映射。demo 装配点回放 S1/S3 录制事件，样板案 artifact 直接来自 `packages/demo-data`。
- 信源角标只从 `artifact_produced.evidenceGrades` 按确认接口提供的稳定 evidence key 读取，组件不按 citation、文件名或内容推断等级。
- 分层确认资格由确认接口的 `ReviewGateProjection` 提供；壳只渲染 `batch` / `individual`。高危与未核验示例均逐条展开后才解锁；批量范围明确枚举并排除二者。
- 生成说明使用常规 sans + `provenance.generatedBg` 无线 callout；核验原文使用 `provenance.verifiedBg` + citation/编号 mono。结构化数据容器始终纯白；法理之线只在右栏白名单场景按红/琥珀/蓝/绿/灰处置态出现，普通卡无线。
- W6.1 尚未落地：三个已拍板遥测事件名已在 `ReviewTelemetryEvent` 建模，打开条目/展开依据/提交处置三个发射点已接，demo sink 为有注释的空实现，未越界修改 core。
- Tauri v2 capability 仅 `core:default`，无 shell、文件系统、网络、对话框或外部程序插件权限；只新增应用内部的系统凭证库命令（状态/保存/移除），不对 WebView 暴露读取明文凭证的命令。CSP 继续显式收紧。

## UX polish 实现记录（2026-07-10）

### 空间与交互物理

- Split-Tab Grid：五工作面默认 Tab 切换；对照默认上下对切，分割条支持指针拖动与键盘 5% 步进；窗口达 1600px 解锁左右对切。启动对照后左栏固定收为 48px 图标条、中栏收为 280–300px，Playwright 在 1440px 视口实测右栏增宽不少于 200px；“复位”恢复三栏、50/50 与默认方向。
- 缩放沙盒：只有关系图谱响应 Ctrl/Cmd+滚轮连续缩放和指针平移，带 G6 minimap、加减与适应窗口控件。P-3 已用 G6 5.1.1 + 内置 dagre 取代手排坐标，默认视野全量渲染 14 节点 / 15 边。时间线、矩阵、修订预览、起草画布用 non-passive wheel 拦截 Ctrl/Cmd+滚轮，零 transform、零视口缩放。
- 验收缺口销账：临界用量已接 `ContinuationClient.continueSession`的“继续本案工作”；图谱连线坐标已统一；其余三项见下文。

### B 阶段三项回归修复

- 起草画布改为结构化渲染态编辑：编辑 DOM 与无障碍树只有文书标题/段落，不出现 `## ` 等源标记；冻结后仍为显式单向编译。
- 时间线法理之线直接消费 `TimelineEvent.markers.includes('contradiction')`；不再读 `description` 判语义。回归用 `evt-24`（文本无“矛盾”、有 marker）与 `evt-25`（文本有“矛盾”、无 marker）反向锁定。
- 批量门禁按 core SPEC 拍板改为逐条响应：`buildReviewResolution` 以门禁的稳定 `itemRef` 输出每项 `confirm/reject/revise`，未处置完整时拒绝生成响应；“批量确认”仅是 UI 聚合手势。单测覆盖混合处置，Playwright 覆盖批量 4 项 + 驳回 1 项 + 修正 1 项的逐条提交。

### Provider 凭证边界

- 首启以“连接文书助手”办案话术引导，只允许用户显式粘贴访问凭证或填写电脑已有凭证名称；不扫描任何第三方配置。粘贴框始终 `type=password`，配置后界面只显示“已连接”。
- Tauri Rust 侧使用 `keyring` 的平台默认安全凭证库（macOS Keychain / Windows Credential Manager / Linux Secret Service）；粘贴值只在 Rust 保存命令中写入。指定电脑已有凭证时，只记住用户填写的名称并当场验证可用，不复制其值。
- WebView 只有 `status/save/clear` 三个命令，无读取明文命令；错误文本不包含凭证或系统路径。Rust 测试锁定 status 序列化仅有 `configured/source`；Playwright 锁定凭证不进 DOM 文本、console、localStorage 或 sessionStorage。审计确认凭证代码路径不调用 SessionEvent 客户端与审阅遥测 sink。

### de-slop 12 条销账

| # | 实现结果 |
|---|---|
| 1 | 静默线移除；`SignatureLine` 无 tone 直接不渲染，只保留红/琥珀/蓝/绿/灰五色封闭集。灰只表达已驳回。 |
| 2 | 进度、依据栈、矩阵与列表内层改水平分割线/Tabular Layout，静态嵌套卡影和多层圆角清零。 |
| 3 | 操作图标统一为 1.35px `currentColor` 线框 SVG，默认板岩灰，无填充与装饰性彩色。 |
| 4 | 列表项 padding-y 6px，数据行 5px，密集行高 28–34px 回归锁定。 |
| 5 | 微按钮/标签 2–4px，卡与输入 6px，弹层 6px，全局无超出 8px 的非圆形圆角。 |
| 6 | 全局 `box-shadow:none`；静态面板、卡、弹层全部依靠 1px 描边与底色差分层。 |
| 7 | `.app-shell` 全域 `font-variant-numeric:tabular-nums`，日期/案号/金额/编号另叠 mono。 |
| 8 | 色彩全部取 `tokens.json` 现有色值；不采 当时的设计提案 第 8 条的示例映射扩展色义。 |
| 9 | 数据区无自发动效；P-2 已将 hover 全站统一为 120ms ease-out，并保留长任务已拍板呼吸点；语义状态仍 0ms 硬切。 |
| 10 | 各工作面无数据时统一文字 + 1px 虚线框 + 快捷键引导，无插画资产。 |
| 11 | 案件名、风险文本、文件名和矩阵单元格单行省略；图谱画布通用裁去公司法定后缀，右侧主体/关系索引以 `title` 保留完整文本。 |
| 12 | 全局 5px 滚动条，静止透明，hover 显示 `border.strong` 滑块。 |

### 逐屏视觉走查（固定截图）

| 截图 | 走查结论 |
|---|---|
| [`00-provider-first-run-1440.png`](visual-audit/00-provider-first-run-1440.png) | 首启文字引导，凭证框掩码，无插画/投影/技术概念文案。 |
| [`01-s3-revision-1440.png`](visual-audit/01-s3-revision-1440.png) | 风险主从台仅语义线发光，内层依据用分割线，10 行级密度无横向溢出。 |
| [`02-s1-timeline-1440.png`](visual-audit/02-s1-timeline-1440.png) | 无 marker 行无线，marker 行琥珀线；日期/编号等宽，长文本省略。 |
| [`03-s1-graph-1440.png`](visual-audit/03-s1-graph-1440.png) | 默认适配全节点，连线精确指向节点中心，缩放控件与 overview 仅存于图谱。 |
| [`04-matrix-1440.png`](visual-audit/04-matrix-1440.png) | 10×6 首屏可见，数据行 30px，纯白表格 + 1px 网格线。 |
| [`05-draft-1440.png`](visual-audit/05-draft-1440.png) | 文书纸面绝对静止，编辑态显示标题/段落而非 Markdown 源符号。 |
| [`06-split-rows-1440.png`](visual-audit/06-split-rows-1440.png) | 默认上下对切；左栏 48px 图标条、中栏紧凑态和一键复位均可见。 |
| [`07-split-columns-1700.png`](visual-audit/07-split-columns-1700.png) | 1700px 解锁左右对照，起草与时间线均保留可读行宽。 |

## P-1 法理之线语义收敛微补丁（2026-07-10）

- 权威规格与 token 已收敛为处置状态单维：高危待处理红、未核验琥珀、已修订未确认蓝、已确认绿、已驳回灰；中/低危待处理无线，严重度只由等级徽章表达。
- P-1 增补按使用域白名单落地：法理之线只进入右栏风险处置、修订预览、时间线矛盾行、确认门禁卡；中栏 D/E 芯片与 AI callout 零线，icon 固定品牌中性色。`lint:signature` 同时锁定白名单、五色封闭集与 icon 不随状态变色。
- UI 只从门禁处置与事件流提供的 evidence grade 计算线态。Playwright 锁定 R5 低危待处理无线、中危 R2 确认转绿、中危 R4 驳回转灰。
- 恢复被删除的状态圆盘用量明细回归，并按当前 S3 演示值锁定卷宗/对话/可整理内容；所有 `font` 简写点显式恢复 `font-variant-numeric: tabular-nums`，避免全域数字特性被静默重置。
- 修复前后截图：[`08-p1-signature-before-1440.png`](visual-audit/08-p1-signature-before-1440.png) / [`09-p1-signature-after-1440.png`](visual-audit/09-p1-signature-after-1440.png)。修复后同屏可见 R2 绿、R4 灰、R5 无线。
- `pnpm --filter @courtwork/desktop test:e2e`：20/20 通过，假绿下限同步升至 20；定向生产构建通过。

## P-2 交互反馈与空路由收尾（2026-07-10）

- 时长阶梯全站落地：按钮按压 120ms、hover 120ms ease-out、Tab 指示器 100ms / 内容 0ms、面板对切 0ms、确认/驳回本体 0ms + 150ms border-color 光效层、续行回执 240ms。
- 确认/驳回光效由 Web Animations API 驱动独立叠加层；其余反馈用 CSS transition/keyframes。新增 `lint:motion` 静态门禁并接入 `test:e2e`，只放行 transform / opacity / background-color / border-color。
- 续行入口落定后保留原位并转禁用态，240ms 回执只动 opacity + `translateY(4px→0)`；未引入任何 motion 依赖。

### 逐路由走查清单

| 结构位 / 路由 | 走查结果 | 空缺处置 |
|---|---|---|
| 三栏帧 + 案件列表 | 标题栏、工具栏、三栏、状态条永久保留；对照态只收窄左/中栏 | 无数据时沿用文字 + 虚线框空态，不隐藏栏位 |
| 时间线 | Tab 永久保留，事件列表/详情正常 | 卷宗原件尚未连接时，原文定位保留禁用入口 + tooltip |
| 关系图谱 | Tab、G6 图谱沙盒、主体/关系列表永久保留 | 节点点击取首条关联边的 SourceAnchor、边点击取自身 SourceAnchor；卷宗原件未连接时保留禁用定位入口 + tooltip |
| 矩阵审阅 | Tab、表头、10×7 网格永久保留 | 原文定位未接通，单元格按钮禁用并在图例/tooltip 说明门槛 |
| 修订预览 | Tab、风险主从台、文书预览永久保留 | 已实现门禁处置，无空路由 |
| 起草画布 | Tab、编辑纸面、冻结仪式永久保留 | Word 文件尚未生成到本机时，“打开 Word 文档”保留禁用入口 + tooltip |
| 工具栏与输入区 | 模型服务入口可打开首启引导 | 审阅记录、导出审阅稿、自由输入均保留原位，以禁用态 + tooltip 如实声明未接通 |

Playwright 逐一切换五工作面并核对对应内容可见，同时抽查工具栏、自由输入、矩阵与时间线的禁用入口和说明；假绿下限升至 24。

### 八禁自查

| # | 自查结论 |
|---|---|
| 1 整卡/整行位移缩放 | 通过：按压回归同时锁定按钮与数据卡 `transform:none`。 |
| 2 弹簧回弹 | 通过：依赖与源码扫描无 spring / motion，实现只用 ease-out。 |
| 3 spinner 裸奔 | 通过：源码无 spinner；既有长任务仍为骨架呼吸/事件流进度。 |
| 4 状态本体淡入淡出 | 通过：门禁徽章与法理之线 `transition:none/0s`，150ms 仅存在于独立边色光效层。 |
| 5 Tab crossfade | 通过：`.view-content` 无 transition/animation，只有指示器 transform 100ms。 |
| 6 hover 阴影升起 | 通过：全站 `box-shadow:none`，hover 仅背景/边色。 |
| 7 动画 layout 属性 | 通过：`lint:motion` 扫描 CSS transition/keyframes 与 WAAPI，只允许四类属性。 |
| 8 入口物理消失重现 | 通过：五 Tab / 三栏帧常驻；续行、工具栏、输入、溯源空缺均保留原位禁用并说明。 |

视觉对照：[`10-p2-feedback-before-1440.png`](visual-audit/10-p2-feedback-before-1440.png) / [`11-p2-feedback-after-1440.png`](visual-audit/11-p2-feedback-after-1440.png)。修复后可见 Tab 指示器及审阅记录/导出/自由输入的诚实禁用态。

验证：`pnpm --filter @courtwork/desktop test:e2e` 24/24、Vitest 6/6、`pnpm lint`、desktop 生产构建、`lint:motion` 全部通过。

## P-3 关系图谱量产化（2026-07-10）

- 渲染栈切换为 AntV G6 5.1.1，默认只注册 Rect / Polyline / dagre / DragCanvas / Minimap 五项可见运行扩展，并补齐 G6 运行时强制要求的五项内部 transform；布局固定为 G6 内置 dagre 横向层次视图，未自研布局、未预做 force/ELK/sigma.js/Observable Plot/ECharts Stage 2。
- `packages/demo-data/data/artifacts/party-graph.json` 的 14 节点 / 15 边全部进入 G6 数据图。画布用通用法定后缀压缩保证首屏可读，右侧索引保留完整名称；Playwright 读取 dagre 产出的中心坐标与 160×44 节点几何，逐对断言节点/标签零重叠。
- 缩放/平移、minimap、加减与适配控件仍封闭在图谱面板；节点与边都可选中并落到既有 SourceAnchor 依据区。节点不擅造新锚点字段，而是使用首条关联边的结构化来源。
- G6 主题完全覆盖库默认 node/edge/combo 皮肤，颜色由 `tokens.json` 映射到 `graphTokens`，节点 1px 描边、浅色唯一、动画关闭；`lint:graph` 静态核对 token 值、边色封闭集、结构化 marker、按需注册和工作面懒加载。
- `[需架构拍板]` 当前 `PartyEdgeSchema` 没有 `markers`（或等价矛盾结构字段），demo e-14/e-15 只有 relationType 自由文本。实现已预留只读可选 `markers.includes('contradiction')` 消费路径并映射琥珀边，但**没有**按文案或边 ID 猜测，因此当前 demo 的结构化矛盾边计数为 0；待架构给出确切字段/语义后再补 schema 与 fixture。

### 包体积实测

| 构建形态 | 首屏主 chunk（raw / gzip） | 图谱懒加载 chunk（raw / gzip） |
|---|---:|---:|
| P-3 前基线 | 277.12 / 81.26 kB | — |
| G6 官方全预设探针 | 275.01 / 80.75 kB | 1,418.06 / 409.58 kB |
| P-3 最终按需注册 + tree-shaking | 275.03 / 80.76 kB | 821.14 / 234.83 kB（图谱 + 必需 transform） |

图谱代码经 `React.lazy` 只在打开关系图谱工作面时下载，首屏主 chunk 未增长；相对全预设探针，图谱路由总 chunk raw 减少 42.1%，gzip 减少 42.7%。生产构建仍提示单 chunk 超过 500 kB raw，已如实保留，Stage 2 再按既定量级判据评估进一步拆分。

视觉对照：[`12-p3-graph-before-1440.png`](visual-audit/12-p3-graph-before-1440.png) / [`13-p3-graph-after-1440.png`](visual-audit/13-p3-graph-after-1440.png)。修复前只手排 10 节点 / 12 边；修复后 14 / 15 全量、dagre 自动分层、minimap 与完整主体/关系索引同屏。

验证：`pnpm --filter @courtwork/desktop test:e2e` 26/26；G6 定向 3/3；`lint:graph`、`lint:signature`、`lint:motion`、desktop 生产构建通过；1440 实机复核控制台零 warning/error。

## Composer 输入区整备（2026-07-10）

规格：`docs/design/principles.md`（架构审定）+ 工单裁决。实现位：`src/composer/`。

### 交付对照

| 裁决 | 落地 |
|---|---|
| 按钮族平铺不聚合 | 上传（曲别针）/ 案件文件夹 chip / 发送；拍照·扫描与语音常驻 `aria-disabled` + tooltip（模板「即将支持 · 当前可通过…」） |
| Lucide 隐喻 + stroke 1.35 | P-4 已改为 `lucide-react` 1.x 静态具名导入，全局 `LucideProvider` 锁定 `strokeWidth=1.35`；不再维护 TSX 内联路径 |
| 附件文件名 chip | 类型图标 + 中间截断文件名 + 移除；失败内联重试；2–5s 边框微光（`chip-glow` 1800ms opacity）；>5s 进度文案位；成功/失败 0ms 硬切 + 150ms border-color 光效层 |
| 仅本条 vs 存入卷宗 | 默认仅本条；徽章 → popover 轻确认 → 硬切绿「已存入卷宗」；无反向操作 |
| 拖放 / 粘贴 | 全窗 overlay 提示落点（工单覆盖 docs/design/principles.md 输入框高亮建议）；⌘V 文件进 chip；纯文本粘贴走 textarea |
| Enter / Shift+Enter + KBD | IME `compositionstart/end` 防误发；底部 `⏎ 发送 · ⇧⏎ 换行`（typography-density §五） |
| reading-view 路由 | `convertToReadingView` 真实调用；`needs_ocr` / `disabled` → chip 失败态办案语言（零 OCR/API 黑话） |
| 协议客户端 | 发送只写入中栏本地消息呈现；不新增 SessionEvent 业务逻辑 |

### 跨包支撑（浏览器可打包）

`@courtwork/reading-view` 原依赖 `node:crypto` / `Buffer`，desktop 打包失败。本工单在 reading-view 内改为纯 DataView + FNV 短哈希（**语义不变：漂移检测用短哈希，非安全用途**），reading-view 136 例回归全绿。属「授权消费方接通」所需的实现级适配，非契约变更。

### 验证

- Vitest（desktop）：17/17（协议 6 + composer 11）
- Playwright：31/31（下限升至 31）；新增 `tests/e2e/composer.spec.ts` 5 例覆盖按钮态 / chip 生命周期与作用域 / 键盘 / 拖放粘贴 / needs_ocr 失败态
- `lint:motion` / `lint:signature` / `lint:graph` / 生产构建通过
- 截图：[`14-composer-input-1440.png`](visual-audit/14-composer-input-1440.png)

## P-4 SVG 图标体系与模型编写规范（2026-07-10）

- 通用图标切换为 `lucide-react` 1.24.0（ISC）静态具名导入；应用根与独立审计页都用 `LucideProvider` 将描边锁定为 1.35px。原 `Icon.tsx` 手排路径表及并发新增的 archive/copy/check/focus 内联 SVG 已全部替换；本批 Lucide 无缺口，未引入 Tabler。
- 权威工程规范见 [`docs/design/svg-standards.md`](../../docs/design/svg-standards.md)：24×24 网格、1.35px / `currentColor` / 禁 fill 和内联色、元素/属性白名单、形状命名、SVGO 4 multipass 与 16px/24px 人审纪律均已成文。
- 当时的图标清单 的 17 个领域概念已建库；其中门禁一行展开为待处理/已确认/已驳回三态，因此落地 19 个形状命名 SVG。`manifest.json` 登记法律用途，生成模块同时导出可 tree-shake 的具名组件与审计用 registry，产品壳不因建库而全量携带尚未使用的领域图标。
- `verify-icons.mjs` 为自写 CI 门禁：检查根属性、标签/属性白名单、色值/fill/脚本禁止项、两位精度、SVGO 漂移、manifest 一一对应、生成物漂移、全 `src/**/*.tsx` 无内联 SVG、Lucide 静态导入与 Tabler 边界；已接入 `test:e2e` 前置链。
- 完整 16px/24px 审计板：[`15-p4-icon-audit-1280.png`](visual-audit/15-p4-icon-audit-1280.png)。人审确认 19 个变体在 16px 仍可辨，门禁三态与生成/核验双通道不混淆。

### Lucide 按需打包实测

| 形态 | 首屏主 chunk（raw / gzip） | 图谱懒加载 chunk（raw / gzip） |
|---|---:|---:|
| 当前 HEAD、P-4 前基线 | 960.32 / 292.93 kB | 817.42 / 233.29 kB |
| P-4 最终（Lucide 具名导入 + 领域图标不入首屏 registry） | 962.61 / 294.25 kB | 817.43 / 233.30 kB |

首屏实增 2.29 kB raw / 1.32 kB gzip；图谱 chunk 只有 0.01 kB 计量波动。基线在同一 HEAD 独立 worktree 重装/构建，避免把并发 F-2 的体积算入 P-4。

验证：`icons:build` 与 `lint:icons` 通过；Vitest 26/26；Playwright 38/38；`pnpm lint` 和 desktop 生产构建通过。Base UI 未触发，未新建 `packages/ui`。

## F-4 文件操作分级与卷宗整理（2026-07-10）

规格：docs/decisions/ADR-004-documents-and-files.md。交付：

| 层 | 内容 |
|---|---|
| schemas | `FileOpsPlan` + CaseFile `originalFileName`/`contentHash`；动词无 delete |
| tools | copy/mkdir 无损级；FileOpsPlan 执行器 + 事务日志撤销（字节一致） |
| registry | S6 卷宗整理（产出 FileOpsPlan，门禁计划确认） |
| desktop | 计划表 / 执行报告 / 撤销 popover；原件区原名留痕 |

验证：tools 204 例；Playwright file-ops 3 例；假绿下限 60。

边界（验收补充，如实声明）：F-4 演示宿主为内存 FS（`file-ops-demo.ts` 的 `createMemoryFileOpsHost`，与 F-3 mock 同构）——计划／执行／撤销／字节一致均在内存验证，不触真实磁盘；真磁盘 / Tauri `FileOpsHost` 装配为已知后续（`file-ops-host.ts` 已留「Node 真 FS / 未来 Tauri」注入点），不阻塞本批。

## F-2 全局动词补全（2026-07-10）

规格：当时的 UI 清单 十项裁决（1/3/6/7 + callout 复制）。五项均落地：

| 项 | 状态 | 落点 |
|---|---|---|
| ⌘K 命令面板 | 真实实现 | `command-palette/`：场景+案件+新建/归档/专注/打开产出文件夹；Meta/Ctrl+K；Esc 关闭 |
| 新建案件 | 真实实现 | 左栏 + ⌘K；`NewCaseDialog` + `webkitdirectory` |
| 归档 | 真实实现 | `ArchiveConfirmPopover` 轻确认，可逆，无删除 |
| 专注模式 | 真实实现 | 条件渲染卸装左中栏，Esc 退出，0ms 硬切 |
| callout/数据卡复制 | 真实实现 | `CopyButton` hover 显现，120ms 按压 |

验证：Playwright global-verbs 21 例 + 全仓 57/57；截图 [`19-f2-command-palette-1440.png`](visual-audit/19-f2-command-palette-1440.png) / [`20-f2-focus-mode-1440.png`](visual-audit/20-f2-focus-mode-1440.png) / [`21-f2-archive-popover-1440.png`](visual-audit/21-f2-archive-popover-1440.png)。

## F-3 最小 work 能力包（2026-07-10）

规格：docs/decisions/ADR-004-documents-and-files.md 双轨增补 + docs/decisions/ADR-004-documents-and-files.md 无损级 + 当时的 UI 清单 先登记。实现位：`packages/tools`（case-path / system-open）+ `apps/desktop/src/system/`。

### 交付对照

| 项 | 落地 |
|---|---|
| reveal-in-folder / open-file | tools 契约 + 案件文件夹白名单；越界 `adapter_error` 可见报错；宿主仅 opener 两动词，永无 shell |
| UI 双路径 | 产出 docx 卡「在访达中显示/打开文件」+ 状态条「打开产出文件夹」；反馈「已在访达中显示」「已为您打开〔文件名〕」 |
| 工作稿轨 | 「工作稿」子目录 md/txt；复用 contentEditable 画布 + 自动保存；左栏入口 |
| 原件只读 | `assertWorkDraftWritable` 结构性拒绝原件/产出写入；左栏原件区 `data-readonly`、无编辑入口（Playwright 锁定） |
| Tauri | `tauri-plugin-opener` + capability 仅 `allow-open-path` / `allow-reveal-item-in-dir` |
| 浏览器打包 | desktop 只 import `@courtwork/tools/{case-path,system-open,contract}` 子路径，不拉 web-fetch 的 `node:net` |

### 验证

- tools：193 例（+24）
- desktop Vitest：35/35；Playwright：42/42（假绿下限 42）
- 截图：[`16-f3-reveal-feedback-1440.png`](visual-audit/16-f3-reveal-feedback-1440.png) / [`17-f3-work-draft-1440.png`](visual-audit/17-f3-work-draft-1440.png) / [`18-f3-originals-readonly-1440.png`](visual-audit/18-f3-originals-readonly-1440.png)

## 验证记录

- `pnpm --filter @courtwork/desktop build`：TypeScript project build + Vite 生产构建通过。
- `pnpm --filter @courtwork/desktop test`：协议录制/回放原测试未改，加逐条门禁响应单测，6/6 通过。
- `pnpm --filter @courtwork/desktop test:e2e`：Playwright 17/17 通过；运行前假绿防护核对用例数，下限 17。
- `pnpm lint`：全仓零 error。
- `pnpm --filter @courtwork/desktop tauri build --bundles app,dmg`：Rust release 编译通过，生成 ad-hoc 签名的 `Courtwork.app` 与 `Courtwork_0.1.0_aarch64.dmg`。
- `cargo test`：凭证状态输出不含 secret/value 字段，1/1 通过。
- `codesign --verify --deep --strict`、`hdiutil verify` 均通过；打包后 `Courtwork.app` 实际启动进程存活。可执行文件 SHA-256：`c10809386eb7fed8a9df2991e24dd4f416a7f815cd443d8d8780807ed0809394`。

探索性 QA：computer use 类 agent（Codex / Claude）按场景剧本自由操作找断点，出缺陷报告，不做回归基础——按 docs/engineering/workflow.md 届时另立 spike 工单。

## TODO（跨层放入区）

## RP-2.5 — Frontier 壳与垂类 Preview 解耦（2026-07-11）

### 规格提案（架构批复 `c17f392`）

- **双宿主**：`UtilityRail` 只承载进度、工作文件夹、上下文等领域无关能力；`PreviewHost` 是按场景声明 `uiTemplateId` 挂载 renderer 的领域无关宿主。法律五工作面是首个 renderer 集，不是宿主内建语义。
- **物理边界**：`utility/**` 与 `preview/renderers/**` 禁止互相 import；`PreviewHost.tsx` 禁法律词汇。`lint:preview` 进入 E2E 前置门禁。
- **状态形态**：基础态为三张独立 Cowork 式能力卡；预览态将能力卡收成顶部 dock，Preview 占据余下空间。既有五工作面行为只迁移结构，不放宽语义断言。
- **通用浮面接口**：L1 外壳统一消费 `SurfaceCard` 与 `elevation.shadow`；组件内禁止裸写阴影，hover 永不抬升，数据卡与阅读区继续零投影。
- **响应式**：场景条宽态显示三项 +「更多」，窄态两项 +「更多」；发送键不可裁切，chat/右栏保持 token 化 8px 间隙。1600px 起免责声明单行，以下允许整体换行，feedback 链接保持原子 nowrap。
- **设置**：L2 居中 modal；导航宽 280–320px，内容按行与分隔线排版；1180px 保证 `scrollWidth <= clientWidth`。
- **消息层级**：用户消息右对齐、浅中性底、最大 78%；agent 内容直接落画布，保留 artifact 卡，不造 agent 气泡。

验收矩阵覆盖 1180/1240/1440/1600：控件边界、免责声明、双宿主切换、设置 modal、import 守卫与全页横向溢出；Playwright floor 只升。

### 实现与验证记录

- `SurfaceCard` + 单一 `elevation.shadow` token 已落地；Utility 基础态、Preview、设置 modal 共用外壳，数据区与 hover 无投影变化。
- `UtilityRail` / `PreviewHost` / `WorkbenchPreviewRenderer` 已物理拆分；基础态三能力卡与 Preview 顶部 dock 可互切，五工作面行为和空态保持。
- 场景区、composer、免责声明、用户消息层级与设置页完成响应式收口；1180 自动收左栏，1600 免责声明单行。
- 门禁：`lint:preview`、Vitest 70/70、Playwright 107/107（floor 107）、全仓 `pnpm -r build` 通过。
- visual-audit：`29-rp25-dual-host-1180.png`、`30-rp25-dual-host-1440.png`、`31-rp25-dual-host-1600.png`、`32-rp25-settings-1180.png`、`33-rp25-utility-base-1180.png`。

## RP-2.5.1 — 验收补丁与 de-slop #6 阴影提案（2026-07-11）

### 阴影修宪提案（架构已按 `1df436e` 一字不改批准）

- 候选 `--elevation-shadow`：`0 1px 2px rgba(10, 37, 64, 0.045), 0 4px 12px rgba(10, 37, 64, 0.035)`。两层均取既有 ink 藏青，近层只收边、远层仅 4px 下移与 12px 模糊；无 hover 增强、无位移。
- 唯一消费白名单：左侧 `CaseRail`；右侧收敛 bar；右侧 `UtilityRail` 卡/dock；`PreviewHost`。全部经 `SurfaceCard elevation="raised"` 或既有 rail 外壳消费。
- 永久零影：L0 chat、composer、artifact/data card、文书预览、设置 modal、popover、图谱与其他数据区。
- `lint:elevation` 扫描组件 shadow 字面量、CSS 非 token 值与消费白名单漂移。拍板值已作为唯一 token 落地。

### 补丁行为

- 四档重叠验收改用 bounding-box：composer/send/provider 右缘不超过 chat 右缘，chat 与右栏坐标差为 8px；`scrollWidth` 仅保留作溢出检查。
- `artifact_produced` 直接驱动 PreviewHost；手动关闭按“案件+场景”记忆，同场景重产不强开，切场景后新 artifact 可自动打开。
- model-config 长期回归覆盖打开、单实例、无遮挡、改配置及 reload 持久化。

当前验证：`lint:elevation` 通过；RP-2.5 定向 10/10；Playwright 全量 110/110（floor 110）；全仓 `pnpm -r build` 通过。视觉证据：`34-rp25-1-shadow-none-1440.png`（落值前）、`36-rp25-1-shadow-approved-1440.png`（落值后）、`35-rp25-1-model-popover-1180.png`。

## RP-2.6 — 第一印象凡例、Demo 身份与 Preview 结构收口（2026-07-11）

### P0 凡例 token（架构 `0d7189b` 当场拍板）

| 组 | 定值 | 不变量 |
|---|---|---|
| 控件 | 28/32px 高，13/14px 字，400/510 字重，16px 图标，6px gap | 按钮与工具栏只消费统一变量；常规操作 400，强调/选中 510 |
| Preview | 12px semantic gutter，2px progress track | gutter 属 renderer 结构位；签名线仍贴语义卡边；轨道本体灰阶 |
| 右栏三区 | Utility 44px / Host head 40px / tabs 36px | Tab 永不物理消失；窄态只允许动作文案收敛，图标与可访问名保留 |

### P1–P5 行为与边界

- **Demo 身份**：`CaseSummary.isDemo` / 固定 ID 数据驱动，禁止按名称猜测。左栏使用 package 图标与卷宗名内联 `样板案` 标签；文案由 `container-copy` 单点供给，不再用绝对水印或未读数字占图标位。
- **首装欢迎态**：无持久选择时 `selectedCaseId = null`，仅呈现左栏、chat 欢迎内容与未绑定 composer；Demo 通过「从样板案开始体验」显式进入。探针静默照常运行，pending 不自动覆盖欢迎页；发送或主动配置才打开既有授权流。凭证存储/探针实现未改。
- **Preview 宿主进度**：`PreviewHost` 消费领域无关 `PreviewProgressModel`，全宿主只有一条只读进度轨；renderer 可声明 markers。轨道灰阶，marker tone 仅 `danger/attention/revision/authority/neutral` 既有白名单。任务进度继续属于 `UtilityRail`。
- **Schema gutter**：时间线与修订 master/detail 工作区从宿主左缘留 12px 结构空隙；法理之线仍在各自语义行/卡的 0 位，文书阅读区维持全宽及 15px reading 不变量。
- **图标与窄态**：Demo package、Preview close 与动作均走既有 Lucide/P-4 链，无内联 SVG。容器窄于 560px 时动作按钮可收文案，但五个 Tab 与端点始终在 DOM 且可见。

### 机器验收

- `lint:rp26` 锁定 P0 token 值、Demo 去水印/去未读、container-copy 文案边界、Preview 单接口与 marker 色彩封闭集。
- Playwright 新增冷启动、显式 Demo、凭证按需上浮、单一滚动轨、12px gutter、44/40/36 三区六项；floor 110 → 116。
- 既有回归通过显式 `openWorkbench` 进入 Demo；需要真实发送/model-config 的用例显式完成授权，避免把冷启动静默态改回旧行为。
- 当前验证：Playwright 116/116，desktop 生产构建通过；visual-audit：`37-rp26-first-install-1440.png`、`38-rp26-demo-preview-1440.png`、`39-rp26-demo-preview-1180.png`。

## RP-2.7 — 省并减法与语言分层（2026-07-11）

### 双宿主语言边界

- 通用 chrome 使用英文：导航、欢迎态、composer、model-config、UtilityRail、命令面板、设置外壳与 Preview 宿主动作。
- schema / 容器内容保持中文：五工作面 Tab 与 renderer、场景、卷宗/样板案词表、确认/驳回/修订、案件与文书内容。
- 设置中的《数据承诺声明》正文与失败态钥匙串恢复说明仍为中文内容，不视为 chrome；它们面向中国律所逐字阅读。
- `credentials/**` 继续遵守 RP-2 总单冻结线，未为翻译修改；授权 modal 的迁移留给凭证热点所有者，避免 UI 单越界触碰 FIX-KC-1。

### 删除 / 合并清单（每项含保留理由）

| 减法 | 处置 | 理由 |
|---|---|---|
| 左栏「工作稿 / 卷宗整理」 | 删除，唯一入口留在 Working folders | 同一 handler 同屏出现两次会让用户无法判断哪个是主路径。 |
| 左栏卷宗计数导航职责 | 降为只读元信息，展开只走 chevron | 计数既是信息又是隐形按钮，端点不可发现；原件已在展开卡内。 |
| Working folders「Output」行 | 删除，唯一入口留在左栏 Output | 两个按钮调用同一输出目录动作，没有提供额外上下文。 |
| 用户菜单 Settings / Check for updates 两行 | 合并为 `Settings & updates` | 两项此前打开同一 about 路由，分列属于假分支。 |
| composer 平铺上传按钮 | 删除，合并到 `+ → Attach files` | `+` 菜单已是附件来源总入口；平铺回形针重复表达同一动作并挤压输入宽度。 |
| composer 附件来源散列 | `Attach files / Add folder / photo / voice` 收进同一菜单 | 来源选择属于一族；主序只保留 Add / case / provider / Send，更接近 frontier。 |
| 左栏三行案件摘要 | 合并为标题 + 单行案号/件数 | 案号与件数同为元信息，分三行会让样板案看起来像一张表单卡。 |
| 中英文混杂 chrome | 通用词统一英文，法律内容不动 | 语言边界与双宿主一致，未来租户词表替换 chrome 时不牵动 schema 断言。 |

### 机器门禁

- `lint:rp27`：锁定 chrome 词表纯英文；CaseRail 不再持有 Working folders 重复 handler；Settings/update 单入口；Attach files 单入口且必须位于 `+` 菜单；schema renderer 保留中文法律词。
- Playwright 新增两组互不依赖的语言断言：chrome 英文组不读取 schema，schema 中文组不依赖 chrome 文案；另锁 composer 四位主序与左栏去重。floor 116 → 121。
- 当前验证：Playwright 121/121；改后首屏视觉证据 `40-rp27-first-install-1440.png`。

## #26 ThinkingStream 三态闭环补全（2026-07-11，架构 `be89d34`）

| 状态 | 形制 | 交互 / 动效纪律 |
|---|---|---|
| `thinking` | 裸 spark-lines 图标 + 三根中性灰骨架线 | 360ms 一行写下后静止，再轮到下一行；只动 transform/opacity；无框、无语义色。 |
| `settled` | 文字与骨架全部消失，只留静止灰阶图标 | 图标是折叠锚；点击展开已保存的推理摘要。默认态安静、不闪、不占一行。 |
| `empty` | 返回 `null` | 无图标、无空壳、零痕迹。 |

四项硬边界：正文到达按父层状态 0ms 硬切；法理之线不 import、不参与动画；骨架只消费灰阶 token；`prefers-reduced-motion` 下当前行直接静止落位。`motion.reasoningLine=360ms` 单点供给，组件内不散落 CSS duration。`lint:thinking` 锁三态封闭集、三行顺序、无框、无语义色与无法理之线依赖；Vitest 覆盖三态输出，Playwright 覆盖静默图标锚展开回看。

视觉证据：`41-thinking-settled-anchor-1440.png`（静默仅留图标）/ `42-thinking-review-open-1440.png`（点击回看）。

### #26.1 turn 归属与图标血统修正（2026-07-11，架构 `42a4e4f`）

- `ThinkingStream` 是 owning assistant turn 的直接子节点：推理在该 turn 内发生，`settled` core 也留在原 turn；页面级/底部常驻位均禁止。
- 推理态只渲染一枚 `spark-lines` SVG：第一根 path 是 core，后三根 path 从 core 的笔画坐标延伸，共用 `1.35` 线宽、round cap 与等距节奏。禁止在 icon 旁另摆 HTML/CSS 骨架条。
- 静默态隐去后三根 path，仅留 core 作回看锚；三态闭环、`motion.reasoningLine`、0ms 硬切、灰阶与法理之线隔离纪律不变。
- `lint:thinking` 同时锁定 turn DOM 归属、SVG `1 core + 3 lines` 和无旁置骨架；Playwright 断言锚在 `assistant-turn-demo` 内且不得直挂 `conversation-scroll`。

修正后视觉证据：`43-thinking-turn-writing-1440.png` / `44-thinking-turn-anchor-1440.png` / `45-thinking-turn-review-open-1440.png`。

## RP-2.8 chat 流减重与 dock L2 下拉（2026-07-11，架构 `c7621be`）

### 注意力主从与 turn 卡 API

- chat 只保留叙事留痕与路由，详情属于右侧 Preview。通用 `TurnCardKind` 封闭为 `event | artifact | file | gate`；机制、样式与图标路由住 `src/chat/TurnCard.tsx`，内容由场景声明填入。
- artifact 卡仅显示类型、标题、数量摘要与 Preview 路由；点击打开对应右侧工作面，高/中/低危等详情不再留在 chat 卡中。file / gate 同理只承担摘要与端点。
- `ToolCallRow` 默认一行收起，展开后仅呈现 `args` / `result` 摘要，消费 `type.dense.mono`；参数与结果不解释法律语义。
- 第九章再补 `5710d6b` 将词表扩为五类：`question` 是可跳过、不阻塞的结构化提问，选项为封闭 enum，回答后用 value 留痕。卡片不调用工具、不锁 composer / Preview；`ask_user` 注入仍属 HARNESS-1。
- 图标一律经 `Icon` / Lucide / 登记 SVG-as-code 管线，禁内联 SVG 与图标框。

### dock 与 composer 减法

- Preview 态的 44px utility dock 点击只打开一个 L2 临时下拉；当前 Preview tab / renderer 不卸载、不置换。同项再点或点外关闭，不改写 `moduleOpen` 持久状态。
- 根据第九章补充 `743da05`，dock 不消费 `SurfaceCard` / `elevation="raised"`，而是坐右栏 L0 底色的嵌套带；`SchemaPreviewHost` 是 Preview 态唯一 L1 主承重浮面。白卡从此只表示工作面，不再同时表示通用 chrome。
- 通用态仍是三张完整 L1 卡竖排；二态宿主约定不变。L2 popover 遵守无投影白名单，仅用边界与层级定位。
- composer 的 folder / case picker 仅在未绑定新对话显示；已绑定卷宗的身份已由左栏与 chat 案件头声明，composer 不再重复。

`lint:rp28` 锁五类封闭集、question enum/skip 留痕、通用层 import 边界、composer 条件位、dock 点外收起与 Preview 不置换；Playwright 增 5 条，floor `121 → 126`。

视觉证据：`46-rp28-turn-cards-1440.png` / `47-rp28-dock-l2-1440.png`。

### RP-2.8.1 验收打回修复（2026-07-11）

- F-1 两项 dock 遮挡：dock/popover 的层叠与 pointer 边界已收窄；`file-ops.spec.ts` 与 `system-open.spec.ts` 在真实按钮中心用 `elementFromPoint` 锁定命中元素，确认“确认并整理”“新建工作稿”均不再被 dock 截获。
- F-2 五项图谱断链：保留 `GraphPanel` 的 `lazy`/`Suspense` 管线，以“当前场景已有手动工作面选择”锁阻止 paced artifact 回放抢回 Preview；关系依据、14/15 dagre、缩放、GraphPanel 挂载、`.courtwork-minimap` #9 主题五项回归恢复。
- F-3 一项图标污染：turn/Thinking 图标使用独立 `turn-icon` 作用域，`line-icon` 继续只承载 P-4 chrome/法理之线审计域；五态色与 icon 品牌单色断言恢复。
- floor 实测保持 126。独立端口 `:1435`、`:1436` 各执行一轮全部静态门禁 + `playwright test --workers=1`，两轮均显示 `Running 126 tests using 1 worker`、`126 passed (1.4m)`、退出码 0。实现复核时额外发现并修正前置提交将 G6 改为同步导入而触发 `assert-graph-theme` 的遗漏；最终懒加载纪律与挂载行为同时成立。

## RP-2.9 `home.*` 密度分档 token 提案（待架构过目，2026-07-11）

依据 docs/decisions/ADR-006-ui-host.md 与 Cowork 真机参照 `visual-audit/24-rp2-frontier-reference.png`，仅为低密度首页/左栏建立一组尺寸别名；不新增颜色、阴影、字重或动效，schema dense 区继续消费既有 `type.dense` / `component.listRow`，严禁反向消费本组。

| token | 提案值 | 复用关系与白名单 |
|---|---:|---|
| `home.inset` | `16px` | `space.4`；欢迎态与左栏主体外边距 |
| `home.sectionGap` | `20px` | `space.5`；欢迎区、继续区、左栏 Pinned/Recents 分节 |
| `home.itemGap` | `12px` | `space.3`；低密度行内图标/文字与相邻项 |
| `home.rowHeight` | `36px` | 比 schema `component.listRow.height=30` 高一档；仅首页/左栏导航与容器行 |
| `home.iconSize` | `18px` | 比通用 control 16px 高一档；仍走 P-4 SVG/Lucide 管线 |
| `home.controlRadius` | `8px` | 首页/左栏按钮、选择行；不进入数据卡或 schema 控件 |
| `home.surfaceRadius` | `16px` | 仅欢迎/provider 引导承重面；L1 工作台外壳仍用 `elevation.floatRadius=12` |
| `home.welcomeMeasure` | `560px` | 欢迎语与一步式引导的最大测宽，避免宽屏散文漂移 |

衬线不进入 token family：只在 `.welcome-state h1` 单点声明系统中文衬线回退栈，并由门禁锁定“全仓恰好一个消费点”；其他首页与左栏文字仍消费全局 sans。提案过目之前不写入 `tokens.json`、CSS 变量或组件。

### RP-2.9 落地记录（2026-07-11，架构批复 `c52102d`）

- `home.*` 八项按批复进入 `docs/design/tokens.json` 与 CSS 单点变量；18px 图标保留光学豁免。16px 只由欢迎主面消费，继续区行卡依授权回落 12，避免行卡与大面同权重。
- 冷启动不再调用 credential status；`data-credential-probed` 与 `lint:rp29` 锁定零启动探针。发送、composer provider、Settings/凭证入口才触发真实 probe；FIX-KC-1 的保存、失败分型与 keychain 语义未改。
- 首启路径为欢迎主面 → 一步式 provider 引导（安全声明/Skip）→ Skip 样板案导览 → 样板案工作面；任何启动都不继承上次卷宗，继续区显式提供最多三项入口。
- macOS 配置使用 `titleBarStyle: Overlay` + `hiddenTitle`，内容提供拖拽标题区；三栏继续上下贯通。Preview dock 收为悬浮三 tap，避开 close/collapse 命中区并保留 L2 点外收起。
- 左栏与欢迎态消费低密度间距、36px 行、18px icon 与 8px control radius；schema renderer 仍消费 dense 组。欢迎标题为全 app 唯一衬线消费点，静态门锁定唯一性。
- composer 采用 frontier 底排顺序 Add / Paste / scope / provider / Send；scope 菜单分 Cases 与 Recent chats 两段。Paste 真接文本 clipboard，图片/文件 paste 继续走既有 attachment 管线。
- 用户气泡加深藏青 hairline；滚动区边缘渐隐、行间贯通细线。请求在途时新消息进入 Queued 列表，可撤回；“停止当前”在执行器接线前诚实禁用，不冒充已实现注入式 steering。message edit 按裁决不做。
- 消息产生时冻结绝对时间，UI 每 30 秒刷新相对时间；copy 真做，赞/踩写本地 feedback ledger，朗读与更多诚实禁用。继续区、两段 scope 选择器与 question 推荐边界不改变容器作用域纪律。
- Playwright floor `126 → 132`；`lint:rp29` 锁 home 八值、衬线唯一、16px 半径唯一、Overlay、懒探针与消息账本。

首启逐屏证据：`48-rp29-welcome-1440.png` → `49-rp29-provider-guide-1440.png` → `50-rp29-skip-sample-tour-1440.png` → `51-rp29-sample-case-1440.png`。

### RP-2.9.1 真机快修（2026-07-11）

- 顶部 chrome 按 Codex 参照拆成独立 44px 窗口层：原生红绿灯区域后只放侧栏折叠与 Search；无 Back/Forward。wordmark 留在左栏内容顶部。
- chat 案件头撤 Settings/⌘K，全局设置改走左下用户菜单或顶部 Search/⌘K 命令面板；案件标题本身仍可双击编辑，不算右上动作。
- 次级按钮统一透明无框；Send、确认/区域唯一主动作保留实底。user message 回到纯平浅底无边框；message edit 仍按 Stage 1 fork 裁决不实现，未来编辑态才获得 input 描边。
- composer 的 Add/Paste/scope/provider 全部沉底无框，Send 保留实底；chat turn artifact/file/gate 由带圆角卡收为透明账本行，只用贯通 hairline 分隔。
- utility dock 不再 absolute 浮压 Preview 标题，而是固定占据右栏上部 44px 通用基座；SchemaPreviewHost 从其下方开始，44/40/36 层级恢复为结构几何事实。
- 左栏案件与未归档行移除外框/卡底，选中态只保留墨色浅底；阶段与卷宗原件沿左侧大纲线自然下排。折叠与归档动作保持可达。
- `lint:rp291` 与 5 条 E2E 锁定：窗口 chrome 无历史动词、chat header 零全局按钮、dock 底边不越 schema 顶边、user/rail/control 平面、turn 卡账本形态。floor `132 → 137`。

视觉证据：`visual-audit/52-rp291-flat-chrome-1440.png`。

### RP-2.10 三卡一纸 + 品牌 icon 推理动画（2026-07-11，Opus 4.8 实现，sol 转验收）

- 三卡一纸（docs/decisions/ADR-006-ui-host.md）：右列两态皆坐底纸、永不成卡——`UtilityRail` 去 `SurfaceCard`，dock 三 tap 为 L0 透明带，base 态其下附 `preview-open` reopen 入口（仍坐底纸），schema（`preview-host`）为右列唯一 L1 卡；折叠钮迁入 `right-rail-chrome` 底纸留空、水平居中不占卡。chat 面（欢迎/空态）保持两栏。
- 线影凡例：composer 外框 `border-strong` 略重（含沉底按钮区，无影，色与两侧一致微深）；默认按钮扁平，唯 Send 实底；user message 扁平藏青微加深底（`color-mix`），编辑态描边仍按 Stage 1 fork 未实现；`conversation-scroll` 两侧留空放大（文字不贴边）。
- chat 卡片清算（第九章修正）：event/artifact/file 保持扁平账本行；唯 question/门禁为轻卡（`border-strong` + 6px 圆角 + 纯白底）；进行态事件行文本灰阶 `breathe` 闪烁，settle 后 demo 收敛为 success（不永久闪烁）。
- #26.2/#26.3：推理指示锚 = 品牌 icon 本体（新增 `brand-mark` SVG 走 P-4 管线：藏青竖线 + 三横杠）；竖线立定、三横杠逐条写下（`reasoningLine=360ms` 序延迟），静默收回静态 icon 作思考流折叠锚；居 turn 尾、message 按钮排之下、左下角位形。四纪律不变（数据区静止 / 内容 0ms 硬切 / 法理之线不参与 / shimmer 灰阶，品牌线例外用藏青 `--text-primary`）。
- 修复（Item 1 域内）：paced 回放代号守卫 `replayGeneration` 作废被取代回放的残余事件，消除重叠回放误触自动开卡的竞态（`rp25:60` 手动关闭优先由偶发翻红转 5/5 稳定）。
- 门禁：`lint:rp210` + `rp210.spec.ts` 5 条 E2E（品牌 icon 位形 / 静默锚回看 / 卡片清算 / 三卡一纸两态无卡 / 折叠钮居中坐底纸）；`lint:thinking` 与 `lint:rp28` 随 #26.3 与卡片清算迁移收严（brand-mark、utility 两态无卡）；`verify-icons` 20 具名 SVG（+brand-mark, RP-2.10）。floor 由并行 PRV-1 已 committed 至 143（本单 +5 使全库计数 146，删本单用例即跌破 143 触红）。
- 已知：`composer.spec.ts:56`（发送→排队）在本机 paced 回放下于发送前门禁已落定，稳定翻红——属 RP-2.9 #11 队列语义、非本单范围，HEAD 95826ac 基线即红（3/3）。

视觉证据：`visual-audit/53-rp210-three-cards-1440.png`、`54-rp210-turn-tail.png`、`55-rp210-brand-anchor.png`、`56-rp210-base-mode-1440.png`。

### QF-1 发送排队语义清账（2026-07-11）

- RP-2.9 #11 的“在途请求”以 session 生命周期为准：`confirmation_requested` 仅表示当前请求进入留人门禁，不表示请求完成；只有 `session_completed` 才结束在途。
- composer 发送判定由“已有进度且无 confirmation”修为“已有进度且未 completed”。因此 paced 回放先落门禁时，新消息仍进入 `queuedMessages`，保留 `Queued`、撤回与诚实禁用的“停止当前”；未开始或已完成的请求仍走 `localMessages`。
- 原 `composer.spec.ts:56` 断言不改、不降级。修前独立端口 4 workers × 12 repeats 为 11/12 红；修后同强度为 12/12 绿。Playwright floor 保持 146。

### QF-2 AUDIT-1 两项阻断清账（2026-07-11）

- #27：`queuedMessages` 每条绑定 `caseId`，消息流仅投影当前 `selectedCaseId`；队列随案件保留而不跨案渗出。`CASE_SCOPE_AUDIT` 增对应行，D-1 切换矩阵锁定“A 排队 → B 零继承 → A 恢复 → B 仍为空”。
- #28：FileOps 执行器、事务日志、动词闭集与哈希证据均不变；仅报告投影依 docs/architecture/schema-engineering.md 五节改为中文动作与案件内相对路径，英文枚举、绝对路径和 hash 留在诊断层。E2E 同时锁正向文案和三类不可见字符串。
- 全门禁：全仓 build 9/9；Vitest 83 files / 725 tests；独立端口 `:1455`、`:1456` 顺序实跑完整静态门禁与 Playwright，两轮均为 146/146（1 worker）；floor 保持 146，未新增或弱化用例。

### RP-2.11 chat|work 二段 + 顶栏秩序 + 字符推理（九条，2026-07-11，Opus 实现，异会话验收）

九条 + 推理改判全落地（MERGE-2 已叠 QF-1/QF-2；合流前本线曾记 151/152 且 composer:56 为 QF-1 前引用）：

- **① 顶部秩序（照搬 Cowork 顶栏重构，用户 crop 定稿）**：`window-chrome` 降**透明绝对浮层**（`app-shell` 去顶栏行 → `grid-template-rows: minmax(0,1fr)`），左右卡片**上下贯通铺到 mac 红绿灯**、顶不留白；红绿灯留白由左卡顶 `padding-top` 让位，wordmark/段控在其下。案件标题迁 `chat-titlebar`——**约束 chat 列居中**、与红绿灯同排、`selectedCase` 门控（不压右卡 dock；`titlebar-case-title` 仅裹标题、badge/stage 兄弟）；chat 面同栏顶显 `Chat` label。浮层仅剩 collapse-left/search（左）+ collapse-right（右）。左栏**除 owner 外全扁平零框线**（rail-head/nav/label/case-card 去边，owner `border-top` 独留）。**composer 扁平**：`composer-box` 改 grid（text 一行占顶、五钮沉 text 下方一排），`composer-float` 横 pad 16px 令两侧留白更宽（尤其 workspace 展开态）。
- **chat|work 中间档**（docs/decisions/ADR-006-ui-host.md）：`viewSegment` 真路由；work=容器工作台 / chat=内存态轻画布（`chat-canvas`，二栏、右栏退场、`chatMessages` 重启即逝——0.1.1 诚实缺口）；`unfiled={[]}` 气泡行退场、Recents 纯容器；`storeChatIntoContainer` 存入桥接容器化仪式后切 work。**不做**剪裁/滚动摘要/落盘（HARNESS 系 0.1.2）。
- **②** 三栏间距 `shellGap/floatInset 8→12`（tokens + css；`@media ≤1280` 已窄列，四档零溢出）。**④** dock 顶对齐左栏（`right-rail-chrome 40px`）。**⑤** composer 五钮沉底零框线：add-folder 提独立钮 + workmode（=viewSegment 同源）。**⑥** message 按钮 24→20 / icon 14→12。**⑦** `--control-hover #e6eaf0`：34 处 `--bg-hover` 扁平按钮 hover 全迁，hover 与 selected 两语义两色。
- **推理字符版改判**：`▏` terminal 硬闪 + `Thinking…` / 静默 `▏ Thought process`；非 SVG（brand-mark 留册待 post-P-4）；`lint:thinking` 迁 char 契约。
- **⑧ 长消息收敛**：`CollapsibleMessage`——超 6 行（user 值提案）收敛 + 底部渐隐遮罩（`mask-image`，过渡而非硬切凡例）+ Show more/less（hover 深色块）；纯呈现层不动账本；应用于 user/chat/local 消息。
- **⑨ 附件 chip**：badge+name+size+remove 已列 composer 顶部；**阴影白名单 +1（`.attachment-chip`，藏青双层极轻值）**，`assert-elevation-shadow` 同步收编。

**迁移的 pinned 断言逐条理由（收尾纪律 1）**：
- `rp2 #19`（案件头位于 chat）→ 顶栏：**用户 Debug 3 指示覆盖 #19**（架构正式记录）；rp2 testid 断言随迁不放宽。
- `rp291:15`（chat header 1 button）→ **0 button + 标题居 `chat-titlebar`**：① 迁中栏顶栏后 chat 头真零按钮（名实一致；顶栏重构后标题在 chat-titlebar 而非 window-chrome）。
- `rp210:77`（折叠钮居右列留空居中 + `right-rail-chrome`）→ **dock 为右卡顶部坐底纸、折叠钮迁顶栏浮层**：顶栏改判后 `right-rail-chrome` 退役、dock 与红绿灯同排，`assert-rp210` 同步撤 right-rail-chrome 断言。
- `rp25:31`（gap≈8）→ `≈12`：② 三栏间距加大，Cowork 参照即 RP-2.9 锁要真机证据。
- `rp1:5/31/46`（unfiled 气泡行 + unfiled-store 存入）→ **Recents 纯容器 + chat 面 store-chat**：气泡行退场，存入桥迁 chat 面（docs/decisions/ADR-006-ui-host.md），仪式/选名词不变。
- `rp29:35`（composer 序 add/paste/scope/provider/send）→ `+add-folder/workmode`：⑤ 五钮沉底。
- `rp210:6`/`ux1:81`（brand-mark 锚 / toggle 无 span）→ 字符版：推理改判，brand-mark 旧断言退役、两套不并存。

门禁：`lint:rp211` + `rp211.spec.ts` 6 例；floor `143→146`（本线 152，合流 main 上由终验设定最终值）。视觉证据：`visual-audit/57-rp211-work-topchrome-1440.png`、`58-rp211-chat-canvas-1440.png`。


- W6.1 最小审阅遥测事件进入 core 后，将 `ReviewTelemetryEvent` 本地兼容类型替换为 core 导出并把空 sink 接到正式事件记录；事件名与字段边界已按裁决预埋。LAUNCH-FIX 已先把三个发射点统一收口到发射时读取 `telemetryEnabled` 的门禁，未来真实 adapter 只能作为门后 sink 接入。
- 正式发行需配置 Apple Developer ID 与 notarization；当前 ad-hoc 签名产物用于本机安装验收，不冒充已公证发行包。

### UX/UI Polish · 设置页表单密度修复（2026-07-13）

- 真实浏览器巡检覆盖欢迎页、样板案三栏、修订预览、Settings 的 Model / Data & privacy，以及 1440、1180 最小支持视口；页面无全局横向溢出、遮挡或双层滚动回归。
- 修复 Settings → Model 的 Reasoning radio 被通用 `.settings-fields label/input` 规则撑成纵向大控件的问题：局部恢复 14px 原生 radio 与横向 `inline-flex` 对齐，保留 fieldset、label、键盘与读屏语义。
- Playwright 增加 radio 尺寸与排列回归断言；desktop Vitest 94/94、全仓 build、定向 settings 5/5 通过。完整 E2E 首轮 187/190，3 个既有并发竞态失败在独立端口单 worker 复跑相关 17/17 通过。

## FABLE-HARNESS · 渲染兜底 + namespaced 消费迁移（2026-07-13，历史实现留痕；raw fallback 已由 VIEW-ABI-1 退役）

- **渲染兜底③（历史）**：当时以 `HOMED_ARTIFACT_TYPES + GenericStructurePanel` 提供 raw 键值树保底；该实现及其生产引用已由 VIEW-ABI-1 的 admitted descriptor → host blueprint → schema/presentation 投影链整体退役，不得作为现行模式召回。
- **触发兜底①消费面**：chat-assembly.ts 真相源上移 `@courtwork/core/generic-chat`（底座义务住底座），快照测试仍在壳侧锁字节。
- **namespaced 迁移补漏**（自查抓获）：App.tsx 四处 `session.artifacts.RiskList` 等点访问读旧裸键——demo 兜底数据掩盖了断链（事件驱动路径 silent 失效）；连同 module-stack 漏网 `FileOpsPlan` 键一并改 `legal.*`。教训同「结构断言绿≠宪法落地」：字面量迁移必须含点访问形态（grep `artifacts\.\w+` 补入自查手册）。

## LEGAL-DEMO-RUN ③ · chat 侧对接 debug（2026-07-13，实现留痕）

- **citationStats 观测字段呈现（章程点名）**：projectSession 原样丢弃 artifact_produced.citationStats（首个发现）——SessionProjection 纯增 `citationStats?` 并机械透传；续行重发（executor 语义：re-emit 不携观测字段）保留最近一次观测不清空。呈现位：S3 artifact 卡摘要尾追「引语公证 N/M」chip（仅事件携带时出现，无 demo 兜底——观测字段不冒充）。
- **artifact 卡取数改投影派生（硬编码计数退役）**：「发现 6 项合同风险」「47 个事件 · 14 个主体」原为字面量——事件里是多少就呈现多少（riskList/timeline/graph 既有类型化访问器取数，demo 兜底行为不变故 e2e 呈现字节不变）；MessageActions/copyText 同步派生。
- **录制对齐声明真值（防录制漂移）**：S3 录制契约层逐字段对齐真 harness——事件序（artifact → todo → confirmation，pauseAt 语义）、todo 步 id/标签（deriveTodoSnapshot 对 legal.S3 步骤树：verify-parties done + produce-risk-list 停门禁取门禁标签原文）、gateLabel（包声明原文）、citationStats（与 artifact 内 8 枚锚点一致——机器锁施工期首咬即中：手填 6 被 anchorCount 断言抓获）。progress 事件为演示旁白（staging）注释明示分界：真 S3 首跑不发 progress。契约测试新增两例：录制 vs LEGAL_PACKAGE 声明的机器锁 + citationStats 投影/重发保留。
- **思考流摘要来源核验**：ThinkingStream content = session.progress 序列（join），S3 demo 呈现即 progress 事件原文——来源正确；真事件流（无 progress）落静态兜底文案，reasoningContent（ScriptedProvider 已回携）到思考流的接线仍属 T-provider.1 挂账，不在本单造新 UI。
- **台账（移交）**：①S1 录制事件序仍为演示节奏（confirmation_resolved 省略、PartyGraph 越门禁出现）——随 S1 流真接线一并对齐；②session.todo 投影无 UI 消费方（todo_snapshot 事件到卡"不丢"的例外位）——归 docs/architecture/schema-engineering.md 提案④ steps 载体化的落地面；③锚点消费方契约（textRange 为块内坐标系，PDF 页内偏移跨页重叠）——溯源 hover/click 接真 PDF 卷宗时必须按 textLayerVersion/page 选块（判例详见 core SPEC LEGAL-DEMO-RUN 节）。

## LAUNCH-FIX · 承诺对照三红修实（2026-07-13，异会话验收通过）

- **遥测真开关**：`telemetry/review-telemetry.ts` 每枚发射时重读设置，不缓存快照；App 三个发射点零直连 sink。反例测试使用真实 spy sink 覆盖 opened/expanded/disposition 三类，关闭时 0 事件，并锁开→关→开即时生效。
- **Word 真接线**：S3 六项门禁完成后，desktop 装配点复用 LEGAL-DEMO-RUN 的 `RiskList → RevisionInstructionSet → applyRevisionInstructionSet` 链，只编译已确认项；确认前 `output-docx-card` 结构性不存在。起草画布走 output 的 `compileDraftToDocx`，两条路径均经 `output/case-output-client.ts` 写案件 `产出` 子目录。
- **bridge 与冻结权威**：Tauri 命令只接受案件根 + 单一 `.docx` 文件名，拒绝穿越/子路径/符号链接，以临时文件同步后 rename；浏览器宿主保持同语义供 E2E。`draftFrozen` 不再有 setter，只由桥查询到 `答辩意见.docx` 存在派生。端到端锁“确认前无产物卡 → 六项门禁 → 卡出现”和“确认编译 → 产出存在 → 冻结”。Playwright 实测 192 条，floor 升至 192。
- **异会话验收补强**：验收发现外部删除产物后同一窗口仍缓存冻结态，先以 E2E 稳定证红，再由 `fix-by-acceptance` `f4a9fb1` 补为窗口重新聚焦时重查宿主存在性；删除后冻结失效。Rust 用真实 37,601-byte DOCX fixture 实盘写入/逐字节核对/删除，并实跑绝对路径与穿越拒绝。完整证据见 `apps/desktop/ACCEPTANCE.md`。

## macOS Overlay 壳层真机纠偏（2026-07-13）

- **官方边界与 API**：Apple 将 macOS 窗口分为系统拥有的 frame 与应用 body；窗口控制与 toolbar 属 frame。透明/全尺寸标题栏只允许内容延伸其下，不把交通灯变成 WebView 控件。实现继续保留 Tauri `titleBarStyle: Overlay` + `hiddenTitle`，不以 CSS 伪造红黄绿按钮；Rust 桥在主线程以 [`NSWindow.standardWindowButton(_:)`](https://developer.apple.com/documentation/appkit/nswindow/standardwindowbutton(_:)) 取得 close/miniaturize/zoom 三枚既有 `NSButton`，保留 AppKit 的 target/action，只调整 frame origin。参考 [Windows HIG](https://developer.apple.com/design/human-interface-guidelines/windows)、[Toolbars HIG](https://developer.apple.com/design/human-interface-guidelines/toolbars)、[`NSWindow.contentLayoutRect`](https://developer.apple.com/documentation/appkit/nswindow/contentlayoutrect)。
- **结构纠偏与磁吸锚**：展开态 `WindowChrome` 是 `CaseRail` 的真实子层；`mac-window-controls-anchor` 由 CSS 容器流排版，`ResizeObserver` 在左卡装卸、窗口 resize、根布局变化时把 `getBoundingClientRect()` 同步给 AppKit。Rust 从系统按钮的真实 frame 派生组宽/按钮高并回灌 CSS 变量，组内间距沿用系统值；不再以屏幕绝对坐标或固定 `padding-left: 152px` 避让。左栏收起或 Focus 时使用无卡背景的 detached chrome，同一锚框随容器迁移。
- **圆角内含，不止 bounding box**：真机 Tauri Overlay 截图实测首枚交通灯半径约 `7px`。左右浮卡外缘统一为 `8px`，L1 圆角维持 `12px`；锚框 leading padding 由 `圆角半径 − AppKit 按钮半径` 派生，使展开态首钮圆心吸附左卡圆角圆心。该 `8/12` 是本机实测对位，不冒充 Apple 公布尺寸。
- **层级与基线**：中间 Chat 继续是 L0 全高画布（`y=0 → viewport bottom`），只让左右 L1 浮卡采用 `8px` 上下外缘；左卡、Preview 卡顶部/底部基线与圆角一致。左卡内部 chrome 占 32px，使 wordmark 的全窗起排位置不因新增 top inset 下漂；中间 `chat-titlebar` 只移动内容带到 `y=8`，恢复与右卡首标题 ±2px 对齐，画布本体不下移。
- **双侧收拢**：右栏收拢时 `right-workbench` 整卡从 DOM/网格退出，不再保留 48px 假卡；展开按钮吸附 `app-shell` 右上边缘且不占列。双侧都收拢时 workspace 退化为单列、横向 padding/gap 清零，Chat 画布占完整视口；标题和 composer 以内容测宽/视口中线居中，1180/1440/1760 resize 不漂移。
- **真机坐标证据**：隔离 Tauri dev 窗在 1440×859 与最小支持 1180×720 两档实跑；1180 档 Accessibility 读取 close/minimize/zoom 均为 `16×16pt`，三者中心 y=`57pt`，同排 WebView collapse 控件中心 y=`58pt`（误差 1pt）。窗口收窄后组内间距、标题中线与右缘按钮均随容器重排，没有留在旧屏幕坐标。
- **机器锁**：`chrome-in-card.spec.ts` 先稳定证红旧假阳性（动态锚不存在、双收拢仍留右卡），再锁卡内所有权、AppKit 锚框/应用按钮互斥、关闭钮圆周内含、左右 8px/12px 同基线、中间 L0 全高，以及三档 resize 的 Chat 中线。Rust 两反例锁按钮组间距/同排与锚框越界拒绝；`lint:rp211` / `lint:rp291` 同步读取 `WindowChrome.tsx`。Playwright floor `193→194`。
- **全量审计连带**：单 worker 全量首轮抓到命令面板挂载后用下一帧才聚焦输入框的竞态；用户在面板出现后立即按 `ArrowDown` 时事件可能落到页面、首项“留在原地”。输入框补原生 `autoFocus` 作同步主路径，既有 `requestAnimationFrame` 保留为 WebView 兜底；原方向键断言不放宽。

## BRAND-1 · CaseRail 静态品牌锁定区（2026-07-13，实现留痕）

- 展开态 CaseRail 的 `Courtwork` 文字左侧接入既有生成组件 `BrandMarkIcon`；母题仍是 `brand-mark.svg` 的一根竖线 + 三根横线，沿用源文件 `1.35` 线宽，不修改 SVG 节点。
- 标记固定为 `17×17px`，与文字间距 `7px`，使用 `--text-primary`；品牌 SVG `aria-hidden`，可访问名称继续由可见 `Courtwork` 标题承担。
- 品牌位不增加底座、背景、边框、圆角、阴影、hover、入场、磁吸或其他动效。`emil-design-eng` 的高频固定元素纪律与本工单的静态边界一致。
- `chrome-in-card.spec.ts` 先在旧纯文字实现上以“SVG 期望 1、实际 0”稳定证红，再锁定：锁定区恰一枚 SVG、无 `img`/`rect`、标记在文字左侧、尺寸 `16–18px`、间距 `6–8px`、垂直中心误差不超过 `1px`，且锁定区与 SVG 均无背景/边框/圆角/阴影。
- 隔离预览 `http://127.0.0.1:1532`、`900px @1x`、`prefers-reduced-motion: reduce`、截图动画禁用；证据位于 `/tmp/courtwork-brand-1-1180.png`（最小视口按既有响应式规则收起 CaseRail，SHA-256 `eac388e81014eaf5982c0ecde5c95b1d8b8615d8481b863dc09dab5155ec5fb7`）与 `/tmp/courtwork-brand-1-1440.png`（展开态品牌锁定区，SHA-256 `331acb299e5a61dbfb3235d441a19292e6f7cda563f8ad4f06fba2493a77dce9`）。
- 最终门禁：全仓 build 12/12 workspace、ESLint 通过、Vitest 106 files / 856 tests；desktop 静态门禁全绿且 Playwright 198 条首轮四 worker 为 195 绿，失败的 follow-scroll / archive popover / chat hierarchy 三项均与本单文件无交集，换独立端口单 worker 完整复跑三文件 29/29 通过。BRAND-1 新契约在两轮均通过。
