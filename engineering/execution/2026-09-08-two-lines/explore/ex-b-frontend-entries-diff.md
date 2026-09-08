# EX-B · 合并复检 + 前端入口盘点

只读探索，工作树 `/private/tmp/se-fable-lines`（main = `e0d214d`）。所有引用均为 `path:line`；未特别标注处均为直接读取源码得到的 observed 事实，`推断：` 前缀标出的判断为 inferred。

## PART 1 — 合并复检

### 1a. 产品代码自集成基线以来未变

```
git diff 0a3b9b22f47f5605ccedc227106b0c17a4df6120 e0d214d -- app brand tests
```
输出为空（`git diff --stat` 同样为空）。observed：Astra 集成基线到当前 main，`app/`、`brand/`、`tests/` 目录字节级未变。

### 1b. `bcbca1b`（Fable 最终分支）→ `e0d214d`（main）逐 hunk 核对

`git diff --stat bcbca1b3b6b848f8976a12e697e0972cf975b3bf e0d214d -- app/web app/runtime app/server app/tests`：

```
app/runtime/control-plane.mjs       |  24 ++++++--
app/runtime/source-resolver.d.ts    |  39 +++ (new file)
app/runtime/source-resolver.mjs     |  89 +++ (new file)
app/tests/source-resolver.test.mjs  | 115 +++ (new file)
app/tests/ui-event-mapping.test.mjs |  19 ++
app/web/app.mjs                     |  29 +++----
app/web/home-view.mjs               |   2 +-
app/web/styles.css                  |   2 +-
app/web/thread-projection.mjs       |  22 ++
```
`app/server/*` 无差异。共 9 个文件，323 行新增 / 18 行删除，**全部为 (i) Astra 在 Fable 之上的新增功能**，未发现 (ii) Fable 内容被丢弃或回退的 hunk。逐 hunk：

| 文件:行 | 内容 | 分类 |
|---|---|---|
| `app/runtime/control-plane.mjs:44-80`（对应 diff `@@ -44,15 +44,31 @@`） | `validateResource` 拆出 `export function validateRuntimeSource`（当前 `app/runtime/control-plane.mjs:53`），供导入前校验与新增只读 resolver 共用；同时给 skill frontmatter 解析加 try/catch、给 YAML 别名循环加 JSON 序列化前置检查 | (i) Astra 新增，为 source-resolver 功能的前置重构 |
| `app/runtime/source-resolver.d.ts`（新文件，39 行）+ `app/runtime/source-resolver.mjs`（新文件，89 行）+ `app/tests/source-resolver.test.mjs`（新文件，115 行） | Runtime R2 本地声明式 source 只读解析器（`resolveRuntimeSource`），显式声明"不安装、不暴露、不连接、不执行" | (i) Astra 新增，与前端入口无直接关联（未被 `app/web` 任何 UI 调用） |
| `app/tests/ui-event-mapping.test.mjs:98-116`（新增） | 新增 `permission presentation` 测试，覆盖 remote/write/missing-binding 三种场景 | (i) Astra 新增测试，配套下面的 permission 文案改动 |
| `app/web/app.mjs:41`（新增 import）、`app/web/app.mjs:4242-4364`（`renderPermission` 重写，现文件行号） | 原来无条件把所有 permission 卡片渲染成"Write ...allowed/denied"；改为按 `permissionPresentation(payload, binding)` 的 `display.title/label/noun/target/source` 动态生成标题、按钮文案，新增"Recorded source: ..."行 | (i) Astra 新增（把仅支持文件写入权限的措辞扩展为覆盖 MCP 远程工具调用），非回退——Fable 原有的 "Write allowed/denied" 文案在 `write` 分支下逐字保留（`thread-projection.mjs:161-171` 的 `write` 三元分支输出与旧文案相同） |
| `app/web/home-view.mjs:92` | `"Write permission requested"` → `"Permission requested"` | (i) Astra 新增（同一措辞泛化的一部分），非回退 |
| `app/web/styles.css:2811` | `.home-start-status` 从 `margin: var(--space-2) var(--space-1) 0;` 改为 `max-width: var(--column); margin: var(--space-2) auto 0; padding-inline: var(--space-3);`（水平留白与正文列对齐） | (i) Astra 新增（视觉细化），**不是** WK10c 要求核对的 `clamp(48px, 18vh, 200px)`——那一行位于 `app/web/styles.css:2783`，本次 diff 完全未触碰 |
| `app/web/thread-projection.mjs:158-181`（新增 `export function permissionPresentation`） | 新函数：按 `payload.tool === "ws_write"` 判定 write，按 `binding.resources` 中是否有 `.mcp` 判定 remote，返回 title/noun/label/target/source/details/hashLabel | (i) Astra 新增 |

**WK10c 四项逐条核对**（均在 diff 范围内的文件里查找，结果：diff 未触及，即自 `bcbca1b` 起未变，全部存活于 `e0d214d`）：

| WK10c 项 | 位置（e0d214d） | 结果 |
|---|---|---|
| `styles.css` 首屏留白 `clamp(48px, 18vh, 200px)` | `app/web/styles.css:2783` `.home-active .composer-area { padding: clamp(48px, 18vh, 200px) var(--page-gutter) 0; }` | 存活，diff 未触及该行 |
| composer textarea 64–160px | `app/web/styles.css:2811`（同一 diff hunk 前一行）`.home-active #composer-input { min-height: 64px; max-height: 160px; }` | 存活，diff 未触及该行（改动的是紧邻的 `.home-start-status`） |
| `#home-start-status` 在 composer `<form>` 之外 | `app/web/index.html:199` `<form id="composer-form">` … `</form>` 于 `:248` 闭合；`#home-start-status` 在 `:251`，晚于 `</form>` | 存活，`index.html` 完全不在本次 diff --stat 列表中 |
| `engineering/design/copy-convention.md` 存在 | 见 1c | 存活（且已被 tracked，内容有 Astra 增补，见下） |

### 1c. 旧 `Courtwork-fresh` 未跟踪文件 → 是否已 tracked，字节对比

先确认均已 `git ls-files` 命中（tracked in main）：

| 路径 | tracked? |
|---|---|
| `engineering/design/copy-convention.md` | 是 |
| `engineering/mvp/execution/work-surface-kit/delivery-wk10c.md` | 是 |
| `engineering/mvp/execution/work-surface-kit/user-message-audit.md`（提示词写的 `user-message-audit.md` 实际路径在 `work-surface-kit/` 子目录下，未在仓库根目录发现同名文件） | 是 |
| `engineering/release/2026-09-08/pages-preparation/{README.md,evidence-contract.md,reference-index.json,source-chat.md}` | 均是 |

与 `/Users/lesprivilege/Projects/Courtwork-fresh/<同路径>` 字节对比（`cmp`/`diff`，只读）：

| 路径 | 结果 |
|---|---|
| `engineering/design/copy-convention.md` | **differs**：main 版本比 fresh 版本新增两处——"人机请求"术语表行把 `Question · Write permission` 扩为 `Question · Write permission · Tool permission`（对应上面 permission 文案泛化）；文末新增一节"Astra 联调补充：通用工具授权"，说明非写工具也走既有 permission 事件、措辞规则与 `runtime.bound` 来源展示规则。属于随 1b 的 permission 文案改动同步更新的文档，非冲突 |
| `engineering/mvp/execution/work-surface-kit/delivery-wk10c.md` | identical |
| `engineering/mvp/execution/work-surface-kit/user-message-audit.md` | identical |
| `engineering/release/2026-09-08/pages-preparation/source-chat.md` | identical |
| `engineering/release/2026-09-08/pages-preparation/README.md` | **differs**：main 版本在开头新增两段——一段说明施工入口已恢复为 `Courtwork`/`main`（链接到 `../../../../evidence/main-cutover-20260908/README.md`），一段"后续清账"说明本包已合入联调后候选、user-message-audit 已固定、前后端联调已完成（链接到 `../../../current.md`）。属于 main 接管后补的时间戳批注，正文其余部分未变 |
| `engineering/release/2026-09-08/pages-preparation/evidence-contract.md` | identical |
| `engineering/release/2026-09-08/pages-preparation/reference-index.json` | identical |

Part 1 结论：产品代码自集成基线起字节未变（1a）；Fable 最终分支到 main 之间的全部 frontend/runtime diff 都是 Astra 在其上的新增（MCP 权限措辞统一 + Runtime R2 source-resolver），未发现任何 WK10c 交付物被回退；旧 `Courtwork-fresh` 快照中的未跟踪文件均已入库，仅 2 个文档因后续联调 / main 接管追加了说明段落，内容不冲突。

---

## PART 2 — 前端入口盘点

`engineering/execution/2026-09-08-main-round/public-readiness.md` 定义的门（摘要）：G1 独立启动 + 真实 provider + 真实运行；G2 H0 固定输入→H1/H2 产生候选与依据→H3 人工 accept/return/require-evidence，正式成果与候选区分；G3 新 Session 恢复同一 Matter 的成果/依据/未决，关键路径键盘可达、无遮挡。

### 表一：入口清单

| 入口 | 文件:行（UI 绑定） | HTTP 路由 | 后端 owner | 服务门 |
|---|---|---|---|---|
| Provider/Model 选择 + 保存连接 | `app/web/settings-view.mjs:229-236,363-409`（`form.addEventListener("submit", ...)` at `:385`） | `PUT /provider-config` | `app/server/service.mjs:563 setProviderConfig`（真正逻辑在 `:565 #setProviderConfig`），路由声明 `app/server/index.mjs:130` | G1 |
| API key 保存 | `app/web/settings-view.mjs:237-263,410-436`（提交在 `:410`） | `PUT /provider-credential` | `service.mjs:582 putProviderCredential`（`:584 #putProviderCredential`），路由 `index.mjs:131` | G1 |
| API key 删除 | `app/web/settings-view.mjs:253-257,437-457` | `DELETE /provider-credential` | `service.mjs:599 deleteProviderCredential`（`:601 #deleteProviderCredential`），路由 `index.mjs:132` | G1 |
| Settings 打开入口 | `app/web/index.html:110-118`（`#runtime-setup-button`），绑定 `app/web/app.mjs:4761 $("runtime-setup-button").addEventListener("click", openRuntimeDialog)` | 打开后触发 `GET /provider-config`、`GET /provider-models`、`GET /runtime-info` 等（`app/web/settings-view.mjs:548-552`） | `service.mjs:247 getProviderModels`、`:547 getProviderConfig`、`:340 getRuntimeInfo`；路由 `index.mjs:127-129` | G1 |
| Runtime 资源开关（Runtime & extensions 面板） | `app/web/runtime-view.mjs:118-207`（`read`/`submit`），暴露开关在 `:331-363 exposureCell` | `GET/PUT /runtime-control` | `service.mjs:258 getRuntimeControl`、`:264 changeRuntimeControl`；路由 `index.mjs:124-125` | G1 |
| MCP 服务生命周期（connect/disconnect） | `app/web/runtime-view.mjs:219-224 lifecycle` | `POST /mcp/:id/lifecycle` | `service.mjs:278 mcpLifecycle`；路由 `index.mjs:123` | G1 |
| Runtime 资源用作草稿（prompt template "Use as draft"） | `app/web/runtime-view.mjs:225-245 useAsDraft` | `POST /runtime-resources/:id/invoke` | `service.mjs:326 invokeRuntimePrompt`；路由 `index.mjs:120` | 无（`disposition: "draft-only"`，仅落入 composer，不构成正式运行） |
| Runtime 资源详情检查 | `app/web/runtime-view.mjs:246-268 inspectSource` | `GET /runtime-resources/:id` | `service.mjs:333 getRuntimeResource`；路由 `index.mjs:126` | G1（可观测性） |
| 新建 Project | `app/web/index.html:37-42 #new-project-button`；绑定 `app/web/app.mjs:4731`；表单 `app/web/index.html:573-607 #project-form`，提交 `app/web/app.mjs:4924 → createProject(event) → createEntity(event,"project")`（`app.mjs:4528-4612`） | `POST /projects` | `service.mjs:367 createProject`；路由 `index.mjs:101` | G3（Matter/Project 组织的前置，非门内条目本身） |
| 新建 Session（导航栏 / Home 两条路径） | `app/web/index.html:51-57 #new-session-button` → `app/web/app.mjs:4737 addEventListener("click", startNewSession)`（`app.mjs:4228-4241`）；对话框提交 `app.mjs:4925 createSession → createEntity`；Home 直发路径 `app.mjs:3724 submitHomeRun`（内部同样 `POST /sessions`，`:3750`） | `POST /sessions` | `service.mjs:396 createSession`；路由 `index.mjs:103` | G3（新 Session 本体） |
| Composer 发送（会话内 / Home） | `app/web/index.html:199-248 #composer-form` submit 绑定 `app.mjs:4873 → submitRun`（`:3804`）→ `submitSessionRun`（`:3809`，POST 在 `:3900`）或 `submitHomeRun`（`:3724`，内部于 `:3790` 调 `submitSessionRun`） | `POST /sessions/:id/runs` | `service.mjs:706 createRun`；路由 `index.mjs:112` | G2（H1/H2 触发的入口） |
| Cancel run | `app/web/index.html:230-237 #cancel-run-button` → `app.mjs:4874 addEventListener("click", cancelCurrentRun)`（`:3974`，POST 在 `:3988`） | `POST /runs/:id/cancel` | `service.mjs:1114 cancelRun`；路由 `index.mjs:117` | G1（失败/取消可核查） |
| Permission allow/deny | `app/web/app.mjs:4242 renderPermission` 渲染按钮 `:4328-4365`，POST 在 `:4350-4353` | `POST /runs/:runId/questions/:id`（body `{decision}`） | `service.mjs:1079 answerQuestion`；路由 `index.mjs:118` | G2（人工把关的一种，但**不是**正式成果 accept——见下方"缺口"里 public-readiness.md 明文"不以工具 allow 代替正式决定"） |
| Question 回答（自由文本） | `app/web/app.mjs:2440-2517`，POST 在 `:2489-2492`（body `{answer}`） | `POST /runs/:runId/questions/:id`（同一路由，body 判别） | 同上 `service.mjs:1079` | G2 |
| 素材（Materials）添加 | `app/web/index.html:535-568 #material-form`；打开入口 `#materials-button`（`index.html:213-219`）绑定 `app.mjs:4697`；提交在 `app/web/materials-view.mjs:116-134`（`createMaterialsView`，未在题面列出的文件里，但被 `app.mjs:4994 materialsView = createMaterialsView({...})` 直接装配） | `POST /sessions/:id/materials` | `service.mjs:448 addMaterial`；路由 `index.mjs:108` | G2（H0 固定输入的一种载体） |
| 文件写入权限模式切换（会话级 Ask/Write/Read） | `app/web/index.html:267-274 #permission-settings-button` 打开连接卡片，卡片内 `onPermission` 回调 `app.mjs:4084-4098` | `PUT /sessions/:id/permission-mode` | `service.mjs:433 setPermissionMode`（`:#setPermissionMode`）；路由 `index.mjs:107` | G1/G2 边界（写入授权，不是正式决定） |
| 工作面 Tab：Workspace/Preview | `app/web/index.html:302-311 #surface-preview-tab`；模块定义 `app/web/surface-modules.mjs:274-380 workspaceModule` | `GET /sessions/:id/workspace`、文件读取 `GET /sessions/:id/workspace/file` | `service.mjs:477 getWorkspaceTree`、`:483 getWorkspaceFile`；路由 `index.mjs:109-110` | G3（continuity 展示的一部分） |
| 工作面 Tab：Runtime | `app/web/index.html:312-321 #surface-runtime-tab`；`app/web/surface-modules.mjs:386-427 runtimeModule` | 复用上面 `GET/PUT /runtime-control` 等 | 同上 | G1 |
| 工作面 Tab：Run | `app/web/index.html:322-332 #surface-run-tab`（默认 `hidden`，有 `runId` 才出现）；`surface-modules.mjs:137-201 runModule` | `GET /runs/:id`（会话进入时已随 `getSession`/轮询获得，Run 面板本身不二次请求，用 `state.runs`） | `service.mjs:1157 getRun`；路由 `index.mjs:116` | G2/G3（可核查性） |
| 工作面 Tab：File | `app/web/index.html:333-343 #surface-file-tab`；`surface-modules.mjs:208-267 fileModule` | `GET /sessions/:id/workspace/file` 或 `GET /sessions/:id/artifacts/file` | `service.mjs:483 getWorkspaceFile`、`:520 getArtifactFile`；路由 `index.mjs:110-111` | G2（依据/成果可核查） |
| `#binding-panel`（扩展绑定表单） | 见下方专门小节 | `POST /sessions/:id/extension` | `service.mjs:614 createExtensionBinding`（`:616 #createExtensionBinding`）；路由 `index.mjs:113` | G2（把会话接到某个 Matter 上，是 H0 的前置） |
| Surface `humanActions`（extension 通用动作分发） | `app/web/app.mjs:3336-3365`（渲染动作按钮）→ `app.mjs:3394-3454 dispatchSurfaceAction`，POST 在 `:3404-3411` | `POST /sessions/:id/actions` | `service.mjs:665 humanAction`；路由 `index.mjs:115` | G2（`save_draft`/`decide` 等具体动作见下） |
| evidence-memo renderer 动作：`save_draft` | `app/extensions/evidence-memo/renderer.mjs:70-82 draftPanel`，按钮 `dispatch('save_draft', {text})` | 经上一行同一路由 `POST /sessions/:id/actions` | `service.mjs:665 humanAction` → `extensionRegistry.humanAction` → `app/extensions/evidence-memo/index.mjs:458 humanAction(input)`，第 463-468 行处理 `action === 'save_draft'`，落到 `this.core.saveDraft(binding.matterId, input.payload.text)` | G2（H0/草稿维护） |
| evidence-memo renderer 动作：`decide`（accept/reject/request_evidence） | `app/extensions/evidence-memo/renderer.mjs:84-120 reviewPanel`，按钮 `dispatch('decide', {request_id, candidate_id, base_version, action, reason})` | 同上 `POST /sessions/:id/actions` | 同上 `index.mjs:458 humanAction`，第 470-477 行处理 `action === 'decide'`，落到 `this.core.decide(request)`；`humanActions` 列表本身由 `index.mjs:189-216` 从 `candidates` 派生，`action: 'decide'` 写死在 `:193` | **G2 核心**（H3 人工 accept/reject/request-evidence 的唯一实现，`action` 取值恰好对应 public-readiness.md 的"接受/退回/要求补证据"） |
| 运行历史对话框 | `app/web/index.html:396-411 #run-history-dialog`；打开 `app.mjs:4145-4157 openRunHistory`（纯前端过滤 `state.runs`，不二次请求） | 无独立路由，数据来自会话进入时的 `GET /sessions/:id`（含 `runs`，`service.mjs:416-425 getSession`） | `service.mjs:416 getSession`；路由 `index.mjs:104` | G3（continuity 的历史侧） |
| Edit as new message | `app/web/index.html:412-440 #edit-message-dialog`；打开 `app.mjs:4024-4031 openMessageEditor`；确认 `app.mjs:4055-4062 useEditedMessage → applyComposerDraft`（`:4034-4054`，仅写入 composer 草稿，不发请求） | 无直接路由；随后走 composer 发送才命中 `POST /sessions/:id/runs` | 同"Composer 发送" | G2/G3（编辑历史消息重发，但不产生新的正式决定） |

### `#binding-panel` 专门追踪：`createBinding` 如何从 UI 到达

1. `app/web/index.html:496-509` Settings 对话框里的 "Runtime & extensions" `<details>`，列出 `#extension-list`；每条扩展若 `session && !session.extensionBinding` 才渲染 "Bind to session" 按钮：`app/web/app.mjs:1910-1922`。
2. 点击后：`state.bindingExtensionId = extension.id`，关闭 Settings 对话框，调用 `app.mjs:1944 renderBindingPanel()` 把 `app/web/index.html:175 #binding-panel` 从 `hidden` 翻开，并按 `extension.bindingFields`（清单声明的字段，如 evidence-memo 的 `title`/`sourceText`）动态生成表单（`app.mjs:1966-1999`）。
3. 表单提交 `app.mjs:2019-2049`：`POST /sessions/${session.id}/extension`，body `{extensionId, input}`（`input` 只含表单里声明的字段，没有任何 matterId 输入框）。
4. 路由 `app/server/index.mjs:113` → `service.mjs:614 createExtensionBinding` → `:616 #createExtensionBinding` → `service.mjs:627 this.extensionRegistry.createBinding({extensionId, input: value.input})`。
5. `app/extensions/evidence-memo/index.mjs:261-276 createBinding(input)`：`exactKeys(input, ['title', 'sourceText'])`——**只接受这两个字段**，第 266 行 `const matterId = \`matter-${randomUUID()}\`` 无条件生成新 matterId，第 268-274 行 `this.core.createMatter({matterId, ...})` 无条件建新 Matter，无任何"传入已有 matterId 复用"的分支。

结论（observed）：从 UI 到 `createBinding` 的路径完整可达，但该函数本身**结构性地**不接受既有 matterId——不是 UI 少做了一步，而是扩展契约里根本没有这个入参。

### G1–G3 覆盖速览

- **G1**（provider 配置 + 真实运行）：Settings 面板的 provider/model/API key 表单、Runtime 面板的 MCP/资源开关，均有完整前后端路径；实际"真实模型路径是否跑通"取决于用户在 GUI 里真实配置的 provider，本次只读探索未做（也不应做）任何写操作去验证。
- **G2**（H0→H1/H2→H3 正式闭环）：Composer 发送 = H1/H2 触发；Materials 添加 = H0 载体的一部分；`decide`（accept/reject/request_evidence）= H3 的唯一 UI 实现，但**只存在于 evidence-memo 这一个扩展的 renderer 里**，不是通用平台能力——`humanActions` 是扩展自报的动作列表（`app.mjs:3336-3337 projection.humanActions`），generic UI 只是"渲染 Run action 按钮"（`app.mjs:3341-3359`），具体语义完全由扩展决定。
- **G3**（同 Matter 换 Session 续接）：新建 Session 有完整路径（导航栏 / Home 两处），但**没有**"把新 Session 绑定到已有 Matter"的入口——见下方缺口表第一行。

### 表二：缺口

| 缺口 | 现状（observed） | 需要先存在的后端接缝（observed，行号） |
|---|---|---|
| 绑定已有 Matter 到新 Session（G3 续接） | `renderBindingPanel` 表单只暴露扩展声明的 `bindingFields`（evidence-memo 是 `title`+`sourceText`，纯文本输入），不存在"选择既有 Matter"的下拉或 ID 输入；`createSession`（`service.mjs:396-414`）本身也不接受 `extensionBinding` 参数 | `app/extensions/evidence-memo/index.mjs:261-276 createBinding`：`exactKeys(input, ['title','sourceText'])` 无 matterId 分支，第 266 行始终 `matter-${randomUUID()}`。要支持"续接"，至少要新增一个接受既有 matterId 的绑定路径（如 `bindExisting(matterId)`），当前完全不存在 |
| Producer（extension 绑定记录）缺失时读历史 | `getSurface`（`service.mjs:650-663`）：第 653 行 `if (!session.extensionBinding) return { extension: null, projection: null }`；第 654-655 行 `if (!record) return { extension: null, projection: null }`（扩展被卸载/记录消失时同样返回空） | 会话侧仍持有 `session.extensionBinding.binding.matterId`（`service.mjs:628` 写入时保存），但没有任何"扩展不在时直接读 Core Matter 快照"的旁路——`projection()` 只能经 `extensionRegistry.projection()` 调用活跃扩展实例（`service.mjs:656-662`）。要支持"producer 缺席仍可读历史"，需要一条不依赖 `record.status === 'loaded'` 的只读路径 |
| 逐规则的 finding/发现列表 | `renderer.mjs:53-68 evidencePanel` 只把 `projection.evidence` 拍平成一行行 `source_id:version [start,end] quote`，没有"按规则分组"的呈现，也没有对应的 `humanActions` 动作 | 无（`projection` schema 本身未见 rule 分组字段；本条为 UI 层面缺失，后端投影结构需先扩展） |
| Accept / Return / Request-evidence 的会话级状态回执 | `decide` 动作（`renderer.mjs:97-116`）只对单个 candidate 生效，`app.mjs` 侧的 `dispatchSurfaceAction`（`:3394-3454`）把结果重新塞回 `projection`，但没有独立于扩展项目的"正式决定"事件类型进入 `state.events`/timeline——决定记录完全内嵌在扩展自己的 projection 里，主线消息流看不到 | `service.mjs:665-686 humanAction` 把 `result`/`projection` 一起返回，不区分"这是正式决定"还是"这是草稿保存"；要在时间线上区分正式决定，需要 host 层（`store`/events）新增专门的 decision 事件类型，当前不存在 |

---

## 未检项

- `app/server/service.mjs` 中 `extensionRegistry.humanAction`/`extensionRegistry.projection` 的实现（是否在 `app/extensions/registry.mjs` 或类似文件）未读取，无法确认 `humanAction` 调用扩展时的具体分派逻辑与错误处理。
- `app/web/workspace-view.mjs`、`app/web/inspector.mjs`、`app/web/ui-controls.mjs`、`app/web/home-view.mjs`（除已引用的一行）未逐行通读，只做了定点 grep，可能遗漏其中的次要入口（如工作区文件树内的次级操作按钮）。
- G1"真实模型/工具路径是否跑通"未做任何实测（只读探索，未配置 provider、未启动服务器、未发起真实请求），仅确认前后端路径存在。
- Home 页 `getWorkSummary`（`service.mjs:373`）驱动的候选/待办列表（`pendingItems`/`sessionCandidates`/`inspectionCandidates`）与 G2/G3 的具体映射关系未展开分析，只在 `renderHomeState`（`app.mjs:4158-4168`）层面确认了它读取 `state.home.data`。
- `app/extensions/catalog.mjs:4-7` 另注册了 `probe` 扩展（`app/extensions/probe/index.mjs`），其 `bindingFields`/`humanActions`/`createBinding` 是否与 evidence-memo 同构（例如是否同样无法绑定既有 matterId）未读取，本报告的表一/表二仅覆盖 evidence-memo。
