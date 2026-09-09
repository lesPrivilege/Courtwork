# EX-WK1 · 本地 Canon 映射

状态：`直接可消费`。

来源：只读检查 `<isolated-checkout>`，分支 `codex/fresh-courtwork`，HEAD `f8aff61`（`git log -1 --oneline` 已核）。本卷未修改任何文件（工作树自带的既有未提交改动与本次 explore 无关，未触碰）；未启动服务；未访问任何 URL；未读取数据目录或凭据文件。全部转录值直接落在本卷内（无需另建 `evidence/ex-wk1/`）。

对照来源：`engineering/mvp/execution/work-surface-kit/inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md` §3.1（五类）、§3.2（ReviewItem 信封）、§10（组件树词表）——仅作对照列，不作评价标准，未提出"应改为"。

---

## 1. 本地摸底表

列：表面 · 文件:行 · 事实 owner · Canon 类 · 是否重复上游原语（仅指出，不评价）· 是否编码 SE 不变量 · 未核实项。

| 表面 | 文件:行 | 事实 owner | Canon 类 | 是否重复上游原语 | 是否编码 SE 不变量 | 未核实项 |
|---|---|---|---|---|---|---|
| Navigator（项目/会话树、过滤、Show more） | `app/web/app.mjs:1597-1785`（`renderProjectList`） | app.mjs（`state.projects`/`state.sessionsByProject`/`state.openProjectIds`/`state.navigationLimits`） | observation | 是（index §10 `chrome/` 下 `MatterTabs` 一类的导航树，仅命名重叠，未取用其实现） | 是：会话切换不隔离旧读取即为反例来源——本函数只渲染已加载列表，异步加载见 `loadSessionsForProject`（未在本卷读取其实现体） | `loadSessionsForProject` 的会话身份隔离细节未读 |
| Home 三集合：Waiting for you | `app/web/home-view.mjs:33-40`；标签取自 `summary.pendingItems` | 服务端 `/work-summary` 契约（app.mjs `loadHome` 消费，`app.mjs:3897-3934`） | observation（列表本身），指向的对象在 elicitation/permission | 否（本地组件命名与 index §10 `ReviewInbox` 概念相邻，未取用） | 是：`ux-conventions.md:14` "等待你回应不推断紧迫或截止"——`home-view.mjs` 未画倒计时/紧迫态 | `/work-summary` 服务端契约文本本卷未读 |
| Home 三集合：Continue | `app/web/home-view.mjs:35`（`sessionCandidates`） | 同上 | observation | 否 | 未见专属不变量编码于此文件（仅标题/项目名展示） | 无 |
| Home 三集合：Needs a look | `app/web/home-view.mjs:36`（`inspectionCandidates`） | 同上 | observation | 否 | 是：状态词经 `runLabels`（`app/web/inspector.mjs:2-11`）统一取用，未在 home-view 另造词表 | 无 |
| Home composer（项目选择、权限模式、开始状态） | `app/web/app.mjs:3421-3530`（`homeProjectId`/`renderHomeComposerContext`/`submitHomeRun`） | app.mjs | elicitation（发起新工作，非对既有提案的判断） | 否 | 是：`storeHomeDraft()` 先于 POST（`app.mjs:3472-3474` 注释），编码"创建接口无幂等协议，先持久化再发送"不变量（`ui-composition.md:17`） | 无 |
| Thread 用户消息 | `app/web/user-message.mjs:1-44` | `user-message.mjs`（呈现），app.mjs 持草稿/编辑回调（`openMessageEditor` `app.mjs:3752-3759`） | observation | 是（index §10 `conversation/Turn`/`MessagePart`，仅命名相邻） | 是：`interface-components.md:19` "后端无独立消息时间戳，时间标注为 run start"——`user-message.mjs:18-32` 只用 `row.startedAt` | 无 |
| Thread 助手正文 | `app/web/app.mjs:2194-2225`（`appendAssistantBody` 调用点，函数体 `2045-2051`） | app.mjs | observation | 是（`conversation/MessagePart`，仅命名相邻） | 未见专属不变量编码于此片段（正文渲染，无状态判断） | `appendAssistantBody` 内 Markdown 处理细节未展开读 |
| Thread 工具 ledger 行 | `app/web/app.mjs:2226-2253`（单个 `tool-card`） | app.mjs（`thread-projection.mjs:41-65` 提供 `row.request/result/isError/phase`） | observation | 是（index §10 `work-events/ToolCall`，仅命名相邻） | 是：`ux-conventions.md:31` "`tool.start` 只有 callId/name，不猜参数"——`thread-projection.mjs:57-63` 只从事件 `data` 字段读取，未合成参数 | 无 |
| Thread 活动行（连续工具收成 Activity） | `app/web/app.mjs:2254-2291`（`activityGroup`） | app.mjs | observation | 是（index §10 `EventGroup`，仅命名相邻） | 是：`ux-conventions.md:20` "失败自动展开属 app.mjs 逻辑"——`details.open = ... : row.isError`（`app.mjs:2231-2233`, `2264-2266`） | 无 |
| 问题卡 | `app/web/app.mjs:2292-2475`（`row.kind === "question"` 分支） | app.mjs（数据来自 `thread-projection.mjs:66-89`） | elicitation | 是（index §10 `review/Question`，仅命名相邻） | 是：非 pending 永不显示回答表单——`canAnswer()`（`thread-projection.mjs:132-141`）先决 | 无 |
| 授权卡（permission card） | `app/web/app.mjs:3958-4088`（`renderPermission`） | app.mjs；校验函数 `thread-projection.mjs:142-153`（`validPermission`） | permission | 是（index §10 `review/PermissionGate`，仅命名相邻，无 trace/policy 字段取用） | 是：`ux-conventions.md:32` 授权卡绑定 questionId+toolCallId+path+bytes+contentSha256+preview——字段清单与 `validPermission` 完全对应；`app.mjs:3980-3983` allow/deny 文案明确"仅此次写入"而非成果接受 | 无 |
| Run 检查栏 · Results | `app/web/inspector.mjs:90-173`（`renderRun` 内 Results 区） | `inspector.mjs`（事实来自 `run.artifacts`） | observation | 是（index §10 `artifacts/ArtifactFrame`，仅命名相邻） | 是：`inspector.mjs:166-171` "Recorded files are results of this run. They have not been accepted by a review." | 无 |
| Run 检查栏 · Usage | `app/web/inspector.mjs:174-206` | `inspector.mjs` | observation | 否 | 是：`ux-conventions.md:33` "missing 显示至少 N，不显示为零"——`inspector.mjs:177,198-203` | 无 |
| Run 检查栏 · 诊断（Run information / Activity 折叠） | `app/web/inspector.mjs:223-283` | `inspector.mjs` | observation | 是（index §10 `work-events/TraceTree`，仅命名相邻） | 未见专属不变量编码于本片段外的额外声明（仅折叠、截断至 100 条 `inspector.mjs:257-263`） | 无 |
| File · Current | `app/web/inspector.mjs:319-453`（`createFileView`，`kind==="current"` 分支） | `inspector.mjs`（服务端端点 `workspace/file`） | observation | 是（index §10 `artifacts/DocumentPreview`，仅命名相邻） | 是：`kind`（current/content-version）是"文件读取与版本引用类别，不是成果审批状态"（`ux-conventions.md:11`）——`renderRun`/`createFileView` 未把 `current` 当接受态 | 无 |
| File · Recorded version | `app/web/inspector.mjs:107-165`（`renderRun` 内 artifact 行）、`319-453`（`kind==="content-version"`） | `inspector.mjs` | observation | 同上 | 是：`validateFilePayload`（`inspector.mjs:303-317`）强制 `runId`/`sha256` 匹配，防止把不同来源内容当同一记录版本 | 无 |
| Workspace（文件分组、Add material） | `app/web/workspace-view.mjs:4-64`（`renderWorkspaceFilesView`） | `workspace-view.mjs`（数据来自 app.mjs `renderWorkspaceFiles` `app.mjs:2951-2990`） | observation | 是（index §10 `workspace/FileTree`，仅命名相邻） | 是：`interface-components.md:27` "按实际父目录分组，目录名不重解释为 review 状态"——`workspace-view.mjs:21-27` 只用 `path.lastIndexOf("/")` | 无 |
| Materials | `app/web/materials-view.mjs:1-176`（`createMaterialsView`） | `materials-view.mjs`（独立于 surface 状态，绑定 `sessionId` 局部变量） | observation/elicitation（表单提交属输入） | 否 | 是：1 MB 上限、UTF-8 校验（`materials-view.mjs:97-104,123-128`）——写入前置校验，非事后声明成功 | 无 |
| Settings（Provider/Model/Runtime debug/Session 权限段） | `app/web/settings-view.mjs:118-511`（`createSettingsView`） | `settings-view.mjs`（`app.mjs` 经 `openRuntimeDialog`/`closeRuntimeDialog` 承载弹层生命周期，`app.mjs:4149-4171`） | observation（Runtime debug）/ 无表单动作对象的常规配置 | 否 | 未见——`request("/runtime-info")`（`settings-view.mjs:475`）是独立于 `app/runtime/control-contract.d.ts` 的旧端点，见 §3 备注 | `/runtime-info` 与 `/provider-config`/`/provider-models` 的服务端字段契约本卷未读 |
| 连接卡 / popover | `app/web/settings-view.mjs:56-117`（`renderConnectionCard`），触发于 `app.mjs:3788-3827`（`openConnectionCard`） | `settings-view.mjs`（渲染）+ app.mjs（弹层生命周期与 `permission-mode` PUT） | observation + 局部 elicitation（权限模式切换） | 否 | 是：`active`（有运行中的 run）时权限段禁用并提示"Available after this run ends."（`settings-view.mjs:108-111`）——不在运行中静默改变权限配置 | 无 |
| composer | `app/web/app.mjs:2674-2735`（`renderComposer`） | app.mjs | elicitation（对已有会话）/ 非 Canon（Home 态下的首次发起另计） | 是（index §10 `conversation/Composer`，仅命名相邻） | 是：`ux-conventions.md:55` "run-active 保持可编辑，Send 不可用并显示 hint"——`app.mjs:2701-2720` 精确对应（textarea 不 disable，仅 send.disabled） | 无 |
| 放大工作面（expanded work surface） | `app/web/app.mjs:2745-2884`（`setSurfaceExpanded`/`surfaceIsModal`/`closeSurface`/`renderSurfaceVisibility`/`activateSurface`） | app.mjs | 非 Canon（容器/生命周期，不持有决定对象） | 是（index §10 `workspace/SplitView`，仅命名相邻） | 是：`ui-composition.md:17` "面板关闭不取消 Run，不提交输入，不卸载同一 renderer"——`closeSurface()`（`app.mjs:2759-2768`）只 `pause()` fileView、不触碰 run/draft 状态 | 无 |
| `outcome` kind | 本卷检索范围内**未找到**该 kind 的任何实现（`thread-projection.mjs` 的行 kind 枚举为 `user/assistant/tool/question/permission/error/artifact/notice/run-status`，`app/web/thread-projection.mjs:21-105`；未见 `"outcome"` 字符串） | 无（不存在的对象无 owner） | 规划中，指向 proposal review / commit gate | 不适用 | 不适用 | `outcome` 仅出现在规划文档：`engineering/mvp/execution/work-surface-kit/intake.md:23`"`outcome` kind（只读摘要，无端点）"、`engineering/design/ux-conventions.md:76,84`（O-1 裁定：与 run 详情共用容器，preview 独立；nested-card/证据措辞仍待作者消费 O-2/SH-5，不重新引入 outcome kind）。本卷未在 `app.mjs`/`thread-projection.mjs`/`inspector.mjs` 源码中找到对应实现——记为未核实/未落地，不建议补 |

---

## 2. 状态词表

| 词表 | 值 | 投影位置（file:line） |
|---|---|---|
| run 八态 | `created` | `app/web/inspector.mjs:3`（`runLabels.created = "Starting"`） |
| | `running` | `app/web/inspector.mjs:4`；样式 `app/web/styles.css:566-567`（`.run-badge.running`） |
| | `waiting_user` | `app/web/inspector.mjs:5`；样式 `app/web/styles.css:567`；ledger 后缀 `app/web/app.mjs:2245`（" · waiting for you"） |
| | `stopping` | `app/web/inspector.mjs:6`；ledger 后缀 `app/web/app.mjs:2245` |
| | `completed` | `app/web/inspector.mjs:7`；样式 `app/web/styles.css:575`（`.run-badge.completed`） |
| | `cancelled` | `app/web/inspector.mjs:8` |
| | `failed` | `app/web/inspector.mjs:9`；样式 `app/web/styles.css:570-571`（与 `unknown` 共用选择器） |
| | `unknown` | `app/web/inspector.mjs:10`；样式 `app/web/styles.css:571` |
| | 消费点：`renderMessageStream` 的 `status` 判断 `app/web/app.mjs:2177-2179,2234-2246`；`renderRun` 徽标 `app/web/inspector.mjs:57-60`；`home-view.mjs:94`（`runLabels[item.status \|\| item.latestRun?.status]`） |
| question 四态 | `pending` | 写入 `app/web/thread-projection.mjs:77`（`question/open` 初始值）；消费 `canAnswer`（`thread-projection.mjs:132-141`，要求 `questionStatus === "pending"`） |
| | `resolved` | 写入 `app/web/thread-projection.mjs:84`（`question/resolved` 事件，`data.status \|\| "resolved"`）；显示 `app/web/app.mjs:2349`（"Answered:"） |
| | `expired_restart` | 未见专属分支；落入 `app/web/app.mjs:2350-2351` 的通用兜底文案（`row.questionStatus.replaceAll("_"," ")`），未核实服务端是否发出该确切字符串 |
| | `cancelled`（question 语境，与 run 的 cancelled 同名不同域） | 同上兜底路径 `app/web/app.mjs:2350-2351` |
| connection 状态 | `connectionLost: boolean` | `app/web/app.mjs:103`（state 字段）；切换 `setConnectionLost` `app/web/app.mjs:977-990`；DOM 呈现 `renderConnectionStatus` `app/web/app.mjs:992-996`（仅 `hidden` 切换，无红色——核对 `ux-conventions.md:40`"连接条是应用级灰条，不用红"，本卷未逐一核对 CSS 颜色值） |
| work-summary 三集合字段 | `pendingItems` / `sessionCandidates` / `inspectionCandidates`，每项含 `items[]`/`total`/`truncated`/`hasMore`/`nextOffset` | 消费于 `app/web/home-view.mjs:33-37`（集合定义）、`38-122`（逐项渲染 truncated/hasMore，`106-121`）；请求于 `app/web/app.mjs:3897-3934`（`loadHome`，字段名 `sessionsOffset`/`pendingOffset`/`inspectionOffset` 见 `3903-3907`） |

---

## 3. ReviewItem 映射草表

索引 §3.2 信封字段 → 既有本地字段（file:line）或 `无`。不建议补齐 `无` 项，只登记。

| ReviewItem 字段 | 既有本地对应 | 备注 |
|---|---|---|
| `id` | 问题：`row.id`（`thread-projection.mjs:74`，取 `data.id \|\| data.questionId \|\| event.seq`）；授权同源 | — |
| `matterId` | `无` | 本地无 Matter 概念落地于前端；`core-contracts.md:5-9` 提到 Matter 属 Core 层，前端未见对应字段 |
| `sessionId` | `event.sessionId` 经 `projectThread(events, runs, sessionId)` 过滤（`thread-projection.mjs:6,17`），未作为行内字段单独携带 | — |
| `kind` | 局部对应：`row.kind`（`"question"` / `"permission"`，`thread-projection.mjs:71`）；索引信封的 `'change'/'artifact'/'commit'` 三值 `无` | `artifact`（`thread-projection.mjs:97-103`）是本地既有 kind，但语义为"记录版本产生"，非索引信封的 proposal artifact |
| `actor` | `无`（`ActorRef` 结构未见） | `core-contracts.md:15` 提到 actor 字段需可信人机通道，模型文本 actor 不构成身份；本地问题/授权卡不携带 actor |
| `target` | 授权卡：`payload.path`（`thread-projection.mjs:145-146`，经 `validPermission` 校验） | 问题卡无等价 target 字段 |
| `summary` | 问题：`row.prompt`（`thread-projection.mjs:74`）；授权：`payload.preview`（400 字，`ux-conventions.md:32`） | — |
| `proposal` | `无` | proposal review 类尚未有本地实现（`intake.md` WK-3："proposal review 的动作按钮在 Core 契约成立前不出现"） |
| `patch` | `无` | 同上 |
| `evidence` | `无`（无 `EvidenceRef[]` 结构） | — |
| `provenance` | 局部对应：File 视图的 `readingNote`（`inspector.mjs:390-401`，区分 content-version/current 来源说明） | 非结构化字段，仅文案 |
| `risk` | `无` | — |
| `reversibility` | `无` | — |
| `policy` | `无`（`PolicyVerdict` 未见）；`app/runtime/control-contract.d.ts:11-17` 定义了 `PolicyRule`/`ScopedPolicy`/`PermissionExplanation`，但该协议未被 app.mjs 消费（见 §4 备注） | 两套"policy"概念不等价：control-contract 的是 runtime 资源准入策略，非 ReviewItem 的单次决定策略 |
| `status` | 问题：`row.questionStatus`（`pending`/`resolved`/…，`thread-projection.mjs:77,84`）；授权：`row.decision`（`allow`/`deny`/`无`，`thread-projection.mjs:86`） | 索引信封的 `status` 枚举（`waiting`/`approved`/`rejected`/`changes_requested`/`dismissed`/`expired`/`executing`/`committed`/`failed`）与本地 `questionStatus`/`decision` 两个独立字段不是一一映射，`无`对应的枚举值：`approved`/`rejected`/`changes_requested`/`dismissed`/`executing`/`committed` |
| `expiresAt` | `无` | — |
| `decision` | 授权：`row.decision`（`thread-projection.mjs:86`，来自 `permission/resolved` 事件 `data.decision`） | 问题侧对应 `row.answer`（自由文本，非 `DecisionRef` 结构） |

---

## 4. app.mjs 职责分区（供 WO-WK4 判断最小写入面）

行号区间按函数簇列出（基于 `grep -n "^function \|^const "` 的定义起点，区间上界为下一簇起点，非精确函数体结尾）：

| 区间 | 职责簇 | 代表函数 |
|---|---|---|
| 43-132 | 会话状态：唯一 `state` 对象与 DOM 快捷方式 | `state`、`$`、`dialogReturns` |
| 134-262 | 草稿/回执基础设施：本地存储读写、UI 状态持久化、Home 草稿 | `storeUnconfirmedRuns`、`readUiState`/`writeUiState`、`storeHomeDraft`/`restoreHomeDraft` |
| 262-322 | 导航准入守卫（WS-03） | `guardRegisterIntent`、`guardAdmitNavigation`、`guardHandoffFocus` |
| 322-361 | 会话/草稿版本号与作用域 key 生成 | `draftRevision`、`sessionScopeKey`、`questionScopeKey`、`toolScopeKey` |
| 361-430 | 阅读位置与运行状态判定（非渲染） | `isNearBottom`、`rememberMessageReading`、`isActiveRun`、`currentSession`/`currentRun` |
| 430-582 | composer 反馈存储（WS-08） | `setTransientFeedback`、`setPersistentFeedback`、`renderFeedback` |
| 582-694 | 错误文案映射 | `ERROR_COPY`、`describeCommandError` |
| 694-782 | 工作面（surface）身份比较，供跨会话隔离用 | `surfaceIdentity`、`sameSurfaceIdentity`、`guardForSurface`、`guardForSurfaceFetch` |
| 782-977 | run 准入 / 事件合并 / 轮询 | `mergeEvents`、`mergeRun`、`schedulePolling`、`stopPolling` |
| 977-1137 | 连接丢失与恢复探测 | `setConnectionLost`、`startRecoveryProbe`、`scheduleRecoveryProbe` |
| 1137-1263 | 草稿保存调度、工作面容器解绑、会话内 run 归属 | `scheduleDraftSave`、`detachOwnedSurfaceContainer`、`sessionRuns` |
| 1263-1405 | 会话详情装载（导航落点后的会话级 hydrate） | `applySessionDetail` |
| 1405-1597 | 清空当前会话（离开会话/回 Home 前的重置） | `clearActiveSession` |
| 1597-1787 | 导航：Navigator 渲染（项目树、会话列表、过滤） | `renderProjectList` |
| 1787-2045 | 扩展注册表与绑定面板、Provider 面板（旧 extension 生命周期，非 `control-contract.d.ts` 协议） | `renderExtensionList`、`renderBindingPanel`、`renderProviderPanel` |
| 2045-2086 | 消息渲染小工具 | `appendRunBadge`、`appendAssistantBody`、`appendToolDetails` |
| 2086-2593 | Dialog/renderer 生命周期核心：Thread 消息流渲染（用户/助手/工具/问题/授权/artifact/notice/run-status 全部行 kind 的 DOM 生成） | `renderMessageStream` |
| 2593-2674 | Chat 头部、运行计时 | `renderChatHeader`、`paintWorkingClock` |
| 2674-2745 | composer 渲染 | `renderComposer`、`renderChat` |
| 2745-2894 | 工作面（surface）开合、Tab 切换、可访问性状态机 | `setSurfaceExpanded`、`renderSurfaceVisibility`、`activateSurface`、`openRun`、`openFile` |
| 2894-2992 | Run/Workspace 内容装载（依赖 surface 是否打开） | `renderInspector`、`readRunDetails`、`renderWorkspaceFiles` |
| 2992-3403 | 扩展 renderer ABI 承载（extension 自渲染工作面的宿主逻辑） | `renderProjectionValue`、`renderSurfaceFallback` |
| 3403-3427 | 草稿清理、错误不确定性判断 | `clearSubmittedDraft`、`isUncertainCommandError` |
| 3421-3752 | run 准入/恢复：Home 发起、常规发送、取消 | `submitHomeRun`、`submitSessionRun`、`cancelCurrentRun` |
| 3752-3788 | 消息编辑对话框（Edit as new message） | `openMessageEditor`、`useEditedMessage` |
| 3788-3944 | 连接卡、会话概览弹层、Run 历史弹层、Home 状态装载、Home 导航 | `openConnectionCard`、`openContextSummary`、`openRunHistory`、`renderHomeState`、`loadHome`、`goHome` |
| 3958-4088 | 问题/授权处理：授权卡渲染与 allow/deny 提交 | `renderPermission` |
| 4089-4134 | 未确认 run 恢复 | `recoverRunReceipt` |
| 4134-4171 | Dialog/renderer 生命周期：原生 `<dialog>` 开合、Runtime 弹层 | `openDialog`、`closeDialog`、`openRuntimeDialog`、`closeRuntimeDialog` |
| 4171-4332 | 单一关闭协调者：Escape 处理 | `handleSurfaceEscape` |
| 4332-4715 | 事件总线：全部 DOM 事件监听器绑定（导航、composer、surface、dialog、connection、settings 等一次性装配） | `wireEvents` |
| 4715-4732 | 首帧/整体重渲染入口 | `renderAll` |

WO-WK4 若要落地 Review 纵切（问题卡/授权卡 inline + Dashboard 三集合双投影），最小写入面预计落在：`2086-2593`（Thread 内问题/授权分支）、`3958-4088`（`renderPermission`）、`3882-3944`（`renderHomeState`/`loadHome`）三段，加 `home-view.mjs` 与 `thread-projection.mjs` 全文件；不必触碰导航（1597-1787）、扩展注册表（1787-2045）、工作面 Tab 机制（2745-2992）。此为观察，不构成裁定。

---

## 5. 结论（≤10 行，仅观察）

1. 现有五个 Canon 类里，observation / elicitation / permission 三类在本地有对应实现且字段可对照（授权卡字段与 `validPermission` 完全一致）；proposal review / commit gate 两类在源码中未见任何实现痕迹，仅在规划文档（`ux-conventions.md`、`intake.md`）中以文字预留。
2. `outcome` kind 在 `intake.md`/`ux-conventions.md` 中被列为"已有 Canon 对应"，但本卷未在 `thread-projection.mjs`/`app.mjs`/`inspector.mjs` 源码中找到该 kind 的任何分支或字符串常量。
3. `app/runtime/control-contract.d.ts` 定义的 `RuntimeControlClient`（`inspect`/`configure`/`evaluatePermission` 等）未被 `app.mjs`/`settings-view.mjs` 调用；Settings 面板实际消费的是更简单的 `/runtime-info`、`/provider-config`、`/provider-models` 与旧式 `/extensions/{id}/lifecycle`。
4. `app.mjs` 单文件内，Thread 渲染（问题/授权/工具/正文全部行 kind）与工作面（surface）开合、导航、扩展绑定、composer、Home 发起共享同一 `state` 对象，无子模块状态。
5. `thread-projection.mjs` 的 `canAnswer()`/`validPermission()` 是问题卡/授权卡是否可交互的唯一收口点，`app.mjs` 内三处调用（`2293-2298`、`2369-2373`、`3962`）均复用同一函数而非各自重判。
6. 状态词（run 八态、question 四态）的显示文案集中在 `inspector.mjs` 的 `runLabels` 常量与散落于 `app.mjs` 的内联三元表达式（如 `2245` 行的 waiting/stopping 后缀），未见第二套并行词表。
7. ReviewItem 信封字段中 `matterId`/`actor`/`proposal`/`patch`/`evidence`/`risk`/`reversibility`/`policy`/`expiresAt` 九个字段在本地无对应实现。
8. Home 三集合、composer、Thread 均已引用同一批服务端字段（`work-summary`、`questions`、`permission-mode`），未见前端另造第二套业务字段。
9. `app.mjs` 的函数簇按行号呈块状分布（Thread 渲染最大块约 500 行），簇间边界与文件顶部 `grep` 得到的函数定义顺序一致，未见明显交叉散落。
10. 索引 §10 组件树词表中的名字（`ToolCall`/`PermissionGate`/`Question` 等）与本地实际 DOM class（`tool-card`/`permission-card`/`question-card`）字面相近，但本卷未核实两者是否共享任何实现或仅命名巧合。

## 未核实项

- `loadSessionsForProject` 的跨会话隔离实现细节未读（Navigator 表面备注）。
- `/work-summary`、`/runtime-info`、`/provider-config`、`/provider-models`、`/extensions/{id}/lifecycle` 各服务端契约的字段清单本卷均未读（仅从前端消费点反推字段名）。
- `expired_restart` 与 question 侧 `cancelled` 是否确有服务端事件产出对应字符串，未核实（前端仅有兜底文案分支）。
- `renderConnectionStatus` 的实际 CSS 颜色值（是否为灰条、是否曾使用红色）未逐一核对 `styles.css` 的 `.connection-status` 规则体。
- `appendAssistantBody`/`appendToolDetails`（`app.mjs:2045-2085`）内部 Markdown/DOMPurify 处理细节未展开读。
- 索引 §10 组件树词表与本地 DOM class 命名是否存在实际取用关系（而非巧合），未核实。
- `app/runtime/control-contract.d.ts` 协议是否在服务端已有对应实现但前端尚未接线，还是服务端也未实现，本卷未跨到服务端代码核实。
