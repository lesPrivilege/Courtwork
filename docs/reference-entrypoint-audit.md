> 收尾状态：条目 1–6 已落地；第 7 项的跨项目全量导航留待实际规模需求。以下保留实施中审计证据，DSH 为源码参照，Codex 以用户提供截图为参照，均不冒充本轮原生界面实测。

# Reference entrypoint audit

审计对象是 SE 当前可见的 `http://127.0.0.1:8816/`（分支提交基线 `2e2c880`，只读观察）以及本机可见的成熟桌面交互。没有修改实现，也没有启动参考系统。

> **实施快照（2026-09-07）**：本文保留 8816 实施前的 live 观察，作为成熟度基线；findings 1–4 已由 root 实施，5–6 正在补齐。因此正文中的“缺少/建议”描述是基线审计结论，不代表当前代码状态。

## 证据边界

- SE 以 CUA 观察 Home、会话流、Session overview、Workspace/File/Run surface、Settings、New project 和 New session。当前会话的用户消息已右对齐，但可见消息操作栏只有 assistant 的 Copy response；用户消息没有时间、Copy 或 Edit 入口。
- Claude desktop 可见左侧 New、Quick task、Projects、Artifacts、Scheduled、Search/View all 与项目/聊天层级；主区可见 Files、Share、消息 action toolbar 和底部圆角 composer。这里仅记录公开的交互结构，不记录对话正文。
- ChatGPT web app 仅作为补充参照，可见 Recents、Search、Projects/Scheduled，以及用户消息的 Copy/Share/Edit/Download action group；不把它当作 Codex 原生窗口证据。Codex 原生窗口受当前 CUA 安全限制，未读取。
- DeepSeek Harness 窗口当前指向 `127.0.0.1:3080`，可见 `ERR_CONNECTION_REFUSED`；没有启动或改动 DSH 服务，因此本轮没有 DSH 的可见 UI 证据。

以下项目按必要性排序，最多一项只提出一个可复用机制，避免把参考产品的完整功能清单搬进 SE。

## 1. P0：用户消息缺少时间与 Copy/Edit 操作

- **观察证据**：SE 会话流把 `You` 显示为右侧浅灰消息块，但 live AX 结构没有该消息的 timestamp、Copy 或 Edit control；assistant 行有 `Copy response`。Claude 的 message actions 同时显示消息日期和 Retry/Edit/Copy，ChatGPT 的用户消息 action group 也提供 Copy、Share、Edit、Download。
- **用户问题**：用户无法确认一次输入何时进入 run，也不能快速复用长输入或在保留历史的情况下改成新草稿。
- **可复用原则**：消息记录是不可变的；操作栏属于该消息并与其对齐；Edit 只生成新的 composer draft，不重写历史、不自动发送。
- **现有 Core 支持**：`projectThread()` 已产生 `kind: "user"`、`id`、`text`、`runId`；对应 run 已有 `startedAt`；composer draft 持久化和 Send 路径已存在。
- **建议**：沿用右对齐消息块，在底部放本地化时间、`Copy message`、`Edit as new message`。Edit 对话框明确 `Use as draft`，复制失败给 toast；不要伪造事件时间或把编辑当作历史替换。

## 2. P0：任意 Run 缺少稳定的回看入口

- **观察证据**：SE 的 `This session` 只列 Workspace、`Latest run` 和 File permissions；流中每个 run 有 `Inspect this run`，但没有 session 级 run 列表。Claude 有 Chats and tasks、View all、Search；成熟聊天产品都把历史集合从当前流中单独抽出。
- **用户问题**：run 数量增加后，用户只能滚动长流寻找目标，无法按状态/时间重新打开某次检查。
- **可复用原则**：概览显示最新状态，集合入口显示完整历史；历史行只负责定位，详情仍复用同一个 Run inspector。
- **现有 Core 支持**：`state.runs`、`state.events`、每个 run 的 `startedAt/status/usage/artifacts` 和现有 `/runs/:id` 读取接口已经足够。
- **建议**：在 `This session` 的 `Runs` 组增加 `Run history`，按 `startedAt` 倒序显示输入摘要、状态、时间和结果数；点击直接打开既有 `Run details`。不新建第二套 run 状态，也不把历史复制进全局侧栏。

## 3. P1：Workspace 文件入口存在，但层级仍是扁平路径列表

- **观察证据**：SE `Open workspace preview` 的 Workspace tab 直接列出 `materials/brief.md`、`out/result.md`；File tab 能看单文件详情，但用户需要从文件名自行推断目录、材料与产出关系。Claude 把 Artifacts 作为一级入口，并在会话内保留 Files 入口。
- **用户问题**：随着 workspace 文件增加，目录语义、材料/产出边界和当前所在位置变得不清楚；同一文件又可从 Session files dialog 和右侧 surface 进入，缺少一个稳定层级。
- **可复用原则**：浏览层负责目录和集合，详情层负责单文件；路径层级与文件类型在浏览层可见，详情不承担树导航。
- **现有 Core 支持**：`GET /sessions/:id/workspace` 已返回 `tree`，文件 path 已含目录；现有 `openFile()`、Workspace/File tabs、materials dialog 可继续复用。
- **建议**：按目录分组显示 Workspace root、`materials/`、`out/` 等 section，组标题带数量，保留 Add material 与 Refresh；点击文件才切换到 File detail。不要引入完整 IDE 文件树或新的文件状态模型。

## 4. P1：Session overview 需要把“查看”与“配置”分层

- **观察证据**：SE 的 `This session` 是一个小型概览卡，混合 Workspace、Latest run、File permissions；Settings modal 另外承载 Provider/Model、File writes 和 Runtime & extensions。当前概览没有 Run history，也没有明确的 Session settings 跳转。
- **用户问题**：用户不容易判断一个入口是只读上下文、文件浏览、run 检查还是会改变会话设置；Latest run 也会遮蔽更重要的历史入口。
- **可复用原则**：overview 是只读导航；settings 是可变配置；每个组只提供一个清楚的下一步，不在 popover 里复刻设置表单。
- **现有 Core 支持**：session 已有 `permissionMode`、provider/model 与 extension binding；现有 Settings dialog 可以直接作为目标。
- **建议**：把卡片固定为 `Workspace`、`Runs`、`Session settings` 三组：Workspace 进入文件/preview，Runs 保留 Latest 与 Run history，Session settings 进入现有 Settings。权限文案保留“本会话”范围，避免看起来像全局设置。

## 5. P1：Workspace/Run/File 的 surface 需要稳定的对象上下文

- **观察证据**：SE 能在右侧 surface 看到 Workspace、Run、File tabs；打开 run 后面板标题为 `Run details`，打开文件后变为 `File`。这已经具备成熟的二级面板骨架，但在 tab 之间切换时对象路径只在 File 视图中出现，Run 视图缺少“当前来自哪条消息/哪次输入”的简短定位。
- **用户问题**：从长消息流打开 inspector 后，用户容易忘记当前详情对应的输入、run 时间和相关文件；关闭再打开也只能靠视觉记忆。
- **可复用原则**：二级面板可以切换内容面，但面板头部要保留稳定的对象 identity；内容 tab 不应重新创建对象或改变主流位置。
- **现有 Core 支持**：`run.id`、`run.startedAt`、run artifacts、session title 和 File provenance 已存在；现有 tab/surface lifecycle 可复用。
- **建议**：在 Run details 头部补一行紧凑 metadata（session title、run started time、status），File 视图继续显示 path/version；Workspace 只负责浏览。保持现有 Workspace/Run/File tabs，不增加额外 inspector 层。

## 6. P2：Composer 圆角体系可复用，但 Send/Cancel 应共享同一动作语法

- **观察证据**：SE 已有 `--radius-small: 4px`、`--radius-control: 8px`、`--radius-card: 12px`、`--radius-container: 16px`、`--radius-pill`；composer 外框为 16px，普通 quiet controls 为 8px，Send 为圆形。Claude 和 ChatGPT 的 composer 也用一个连续的圆角容器，附件、语音/模型等次级入口在内部，提交/停止是同一位置的主动作。
- **用户问题**：如果运行中把 Cancel 变成另一种矩形按钮，主动作的空间位置和形状会跳变；把所有 composer 入口都做成 pill 也会让 session-level 设置抢过输入焦点。
- **可复用原则**：外框 16、普通次级按钮 8、主提交/停止 44px 圆形；session settings 保持 quiet text/icon，不能变成一排 chips。
- **现有 Core 支持**：composer 已有 Session files、Provider/Model、File writes、Send 和 Cancel 状态；无需新增后端能力。
- **建议**：保留现有 token 和 `Send` 圆形箭头，运行时将同一位置切换为 44px 圆形 Stop/Square；窄屏继续保持 44px 命中区，并给 icon-only controls 保留可见 tooltip 与 aria-label。

## 7. P2：一级导航的“最近/全部”语义需要在规模增长前定下来

- **观察证据**：SE 侧栏当前是 Home、Find a session、Projects → sessions、New session、Settings、Refresh；Claude 明确区分 Chats and tasks、View all、Search、Projects、Artifacts 和 Scheduled，ChatGPT 也有 Recents、Search、Projects、Scheduled。
- **用户问题**：现有搜索只是在 project/session 树中筛选；当 session 多起来，用户没有一个“全部 session / 最近活动 / 需要处理”的稳定跳转语义。
- **可复用原则**：一级导航只承载稳定集合；状态集合（Waiting for you、Needs a look、Recent runs）应从 Home 或 session overview 进入，不能继续把侧栏变成状态仪表盘。
- **现有 Core 支持**：Home 已有 `sessionCandidates`、`pendingItems`、`inspectionCandidates` 分组及分页；projects/sessions 列表和 nav filter 已存在。
- **建议**：先保留当前 sidebar 的 Projects 层级，在 Home 增加/明确 `Recent runs` 或在 `This session` 提供 Run history；只有当跨 project 查找成为真实摩擦时，再增加 `View all sessions`，不要照搬成熟产品的所有一级项。

## DSH 源码参照（本地源码，非本轮 UI 证据）

源码位置：`<private-source>`。以下只抽取可复用结构，不把它当作 8816 的 live 观察：

- `packages/client/ui-layout/src/client/AppFrame.tsx` 与 CSS 保持 sidebar、conversation、details 三列骨架；details 可保持 mounted 并收窄到零宽，且已有拖拽、响应式收起和 reduced-motion 处理。
- `packages/client/ui-workspace/src/client/WorkspaceBrowser.tsx`、`tree.ts` 与 CSS 提供 Workspace/session 分组、Workspace/flat 视图切换、搜索，以及新增、重命名、归档、排序入口；这支持 finding 3 的目录分组原则。
- `packages/client/ui-conversation/src/client/chat/MessageItem.tsx`、`MessageIconActions.tsx` 与 `skeleton/InputBar.tsx` 将用户消息时间/Copy/branch actions 和 Send/Stop 同位切换落在同一条交互语法上，圆角与 icon button 也由 CSS token 约束；这支持 findings 1、6 的 action row 与 composer 结论。

## 结论

当前最有证据的落点是三件事：用户消息的不可变 action row、session 级 Run history、按目录分组的 Workspace 浏览。SE 已有足够的 Core/API 与 surface primitives 支撑它们；composer 圆角和 File/Run inspector 的基础层级已经成立，优先保持 token 一致和入口可回到原对象。DSH 与 Codex 原生窗口本轮没有可见证据，不能据此推断它们的具体布局。
