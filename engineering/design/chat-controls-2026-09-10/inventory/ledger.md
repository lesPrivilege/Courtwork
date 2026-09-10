# EX-IC2 分片 A · 全量逐控件台账

固定 SHA：`1992e90` — 所有 `path:line` 均对齐该提交。方法与自检见 `README.md`；
缺口与观察见 `gaps.md`；PNG 证据在 `captures/`（文件名自解释，脚本
`captures/capture.mjs` 可复跑）。

disposition 只用 README 七值：`已接真实能力` / `纯客户端可完成` /
`前端未接已有后端` / `缺后端/宿主合同` / `设计候选` / `不适用` / `待核验`。

**证据可靠性更正（写在这里，不逐行改列，见 gaps.md 完整说明）**：本轮捕获
脚本反复暴露一处未解决的时序缺陷——脚本运行到大约第 10–30 步之间时，
`selectSessionByName()` 对 "IC2 Inventory Fixture" 项目内会话的选择会静默
失效，截图落在 Home 而不是目标会话；运行到第 30 步以后（`streaming`/
`edit-message-dialog`/`chat-overview`/`tooltip-*` 一带）同一函数又稳定恢复
正常。这不是"缺口"，是**本轮捕获脚本自身未查明根因的缺陷**，如实记录、不
假装已捕获。下表 Evid. 列中若指向以下文件名，只把该行的 disposition 当作
**源码静态确认**，不要把该 PNG 当作该状态的真实像素证据：`chat-1440-light`、
`chat-1440-dark`、`chat-390-light`、`user-message-long-collapsed`、
`user-message-long-expanded`、`composer-rest-disabled-send`、
`composer-text-entered-send-enabled`、
`composer-materials-dialog-open-empty`、
`composer-materials-dialog-open-with-files`、`tool-card-collapsed`、
`tool-card-expanded-request-result`、`permission-card-pending-allow-deny`、
`permission-card-deny-focus-visible`、`permission-card-resolved-history-open`、
`question-card-pending-input-focus`、`question-card-resolved-history-open`、
`run-status-card-failed`、`run-surface-panel-open-failed-run`、
`file-surface-pane-open-current`。以下文件名经逐张目视核对，内容与文件名
相符，可作为真实像素证据（`composer-sending-and-assistant-streaming-inflight`
与 `chat-overview-context-popover-open` 背后叠着一个未正确关闭的 Files
弹窗，是脚本自身的另一处清理疏漏，但被叠加的正文内容本身是真的）：
`home-*`、`sidebar-rest-1440-light`、`sidebar-newchat-focus-visible`、
`sidebar-nav-filter-active-clear-visible`、`sidebar-mobile-overlay-390-*`、
`composer-connection-popover-open`、
`composer-sending-and-assistant-streaming-inflight`、
`composer-run-active-cancel-button-run-hint`、`edit-message-dialog-open`、
`chat-overview-context-popover-open`、
`tooltip-visible-on-hover-refresh-button`、
`tooltip-visible-on-keyboard-focus-refresh-button`、
`keyboard-user-message-action-focus-visible`。

列缩写：**Src** = 源路径:行；**Owner/cap** = owner API/宿主/纯客户端 +
capability predicate；**States** = 实际存在的状态（rest/hover/focus/pressed/
selected/disabled/loading/success/error 取实际子集）；**A11y** = accessible
name（及 tooltip 来源）；**Glyph/hit** = glyph 名与命中区档位（32/44，来自
IC-1；实测见 gaps.md 的命中区量测）；**Evid.** = captures/ 下的 PNG 文件名
（不含扩展名时见文件列表）；**Gap** = 缺口时映射的既有 owner 工单，无映射写
「待裁」。

---

## §1 · Chat 入口与 chrome（侧栏 / 顶带）

| Key | Surface / selector | Src | Intent → Handler | Owner/cap | States | A11y (tooltip) | Glyph/hit | Evid. | Disposition (Gap) |
|---|---|---|---|---|---|---|---|---|---|
| `chrome.brand` | `a#workspace-home-link` | `index.html:82` | 品牌回首页 → 原生 `<a href="#home">` | 纯客户端路由 | rest/hover/focus | "CourtWork"（含 `court-symbol` 装饰，`aria-hidden`） | 无 glyph 白名单项，品牌 SVG 组件 | `home-1440-light` | 已接真实能力 |
| `chrome.nav.close` | `button#close-nav-button` | `index.html:93-98` | 关闭移动端侧栏 overlay | `app.mjs` `closeNavigation` | rest/hover/focus；仅 <1024 overlay 时有意义 | "Close navigation" | icon-only，class `quiet-button` → 32/44 档（未在本轮实测 rect，见 gaps 命中区表） | `sidebar-mobile-overlay-390-light` | 已接真实能力 |
| `session.new` | `button#new-session-button` | `index.html:100-106` | 新建会话（全局，非项目内） | `app.mjs` 若干 `startNewSession` 调用点 → `POST /sessions` | rest/hover/focus | "New chat"（可见文字，非 icon-only） | 无 icon（纯文字按钮，`nav-home`） | `sidebar-newchat-focus-visible` | 已接真实能力 |
| `home.nav` | `button#home-button` | `index.html:107-109` | 返回 Home | `app.mjs` home 路由 | rest/hover/focus/selected(`active`类) | "Home" | 无 icon | `home-1440-light` | 已接真实能力 |
| `attention.nav` | `button#attention-button` | `index.html:110` | 打开 Attention 助手 dialog | `createAttentionAgent(...).open()` | rest/hover/focus | "Attention" | 无 icon | `attention-dialog-open-default` | 已接真实能力 |
| `spark.nav` | `button#spark-button` | `index.html:116` | 打开 Spark | `app.mjs` spark 路由 | rest/hover/focus | "Spark" | 无 icon | 未截图（超出 Chat space 定义，入口行登记即止） | 不适用（Spark 是独立表面，本分片只登记入口） |
| `nav.filter` | `input#nav-filter-input` | `index.html:123-128` | 过滤项目/会话 | `app.mjs:6255` input 监听 → `state.navigationFilter` | rest/focus/typing | label "Find a project or chat"（`sr-only` for + placeholder "Find a chat"） | 不适用（文本输入） | `sidebar-nav-filter-active-clear-visible` | 前端未接已有后端（见下条真实观察，非严格"缺后端"——是纯前端行为不符合自身文案） |
| `nav.filter.clear` | `button#clear-nav-filter-button` | `index.html:129-134` | 清空过滤 | `app.mjs:6261-6263` | hidden/rest/hover/focus | icon-only，无固定 `aria-label`（见 gaps 观察：清除按钮无 accessible name 属性，仅靠视觉 x） | icon-only | `sidebar-nav-filter-active-clear-visible` | 待核验（a11y name 未在源码中显式设置，见 gaps） |
| `project.new` | `button#new-project-button` | `index.html:149-154` | 新建项目 | `app.mjs` → `POST /projects` | rest/hover/focus | "New project" | icon-only | 未单独截图（在 `sidebar-rest-1440-light` 可见） | 已接真实能力 |
| `project.toggle` | `.project-toggle`（动态） | `app.mjs:1786-1807` | 展开/折叠项目的会话列表 | 同文件内联 click 监听，`state.openProjectIds` | rest/hover/focus/expanded(aria-expanded) | 项目名本身（无 tooltip，长名截断无 title，见 gaps） | `chevron-right`/`chevron-down` 16 + `folder` 20（两个 icon 叠加，无独立命中区） | `sidebar-rest-1440-light` | 已接真实能力 |
| `project.create` (=`session.new` 项目态) | `.project-create`（动态） | `app.mjs:1821-1829` | 在指定项目内新建会话 | `startNewSession({projectId})` | rest/hover(`focus-within` 于 `.project-heading`)/focus | "New chat in {project}" | `plus` icon-only | `sidebar-rest-1440-light` | 已接真实能力 |
| `session.select` | `.session-button`（动态） | `app.mjs:1876-1907` | 切换到该会话 | `selectProject(projectId,{sessionId})` | rest/hover/focus/selected(`active`+`aria-current=page`) | `data-tooltip` = 会话标题（截断时经 tooltip adapter 显示，见 IC-3 "行内次要操作" 例外分支：只有 `scrollWidth>clientWidth` 才显示） | 无 icon；`Work` 模式有文字徽标 `.session-mode-tag`（非 glyph，符合 IC-7 不用 sparkle 泛化） | `sidebar-session-name-tooltip-hover` | 已接真实能力 |
| `session.rename` | — | — | 会话重命名 | **无 UI**：侧栏会话行只有 click-to-select，没有 rename/delete/pin/archive 控件（对照 Attention 侧的 `attention.recent.rename`，见 §8） | — | — | — | — | 缺后端/宿主合同（待裁：README 覆盖表要求"新建/打开/切换/关闭/重命名"，Chat 会话目前只有前三项；重命名/删除/固定均不存在，无既有 owner 工单映射） |
| `nav.showmore` | `.nav-more`（动态，文字按钮） | `app.mjs:1915-1927` | 展开项目内超过 8 条的会话 | 本地 `state.navigationLimits` | rest/hover/focus | "Show more" | 无 icon | 隐含于 `sidebar-rest-1440-light`（本轮 fixture 项目 22 个会话，默认只显示 8+当前活动会话） | 纯客户端可完成 |
| `workspace.refresh` | `button#refresh-button` | `index.html:167-172` | 刷新工作区（项目/会话列表） | `app.mjs` → `loadProjects()`等 | rest/hover/focus | "Refresh workspace" | icon-only `refresh-cw` | `tooltip-visible-on-hover-refresh-button`、`tooltip-visible-on-keyboard-focus-refresh-button` | 已接真实能力 |
| `settings.open` | `button#runtime-setup-button` | `index.html:173-180` | 打开 Settings 页（替换主区，非 modal） | `openSettings()` | rest/hover/focus/`aria-haspopup=dialog` | "Settings"（可见文字） | 无 icon | 未截图（Settings 内部超出本分片"Chat space"范围，仅登记入口） | 已接真实能力（入口）；Settings 内部不适用（超出范围） |
| `chat.toggleNav` | `button#toggle-nav-button` | `index.html:186-193` | 打开移动端侧栏 | `app.mjs` nav toggle | rest/hover/focus/`aria-expanded` | "Open navigation" | icon-only | `sidebar-mobile-overlay-390-light` | 已接真实能力 |
| `settings.back` | `button#settings-back-button` | `index.html:197-204` | 从 Settings 页返回（唯一离开动作，与侧栏折叠钮同槽位） | `closeSettings()` | hidden/rest/hover/focus | "Back to app"（可见文字） | 无 icon | 未截图（Settings 范围外） | 已接真实能力（入口）|
| `chat.overview` | `button#show-run-button` | `index.html:216-222` | 打开 "This chat" context popover | `openContextSummary()` | hidden(无 run 时)/rest/hover/focus | "Chat overview" | icon-only | `chat-overview-context-popover-open`（若该会话有 run 才可见，见 gaps 捕获缺口） | 已接真实能力 |
| `surface.openPreview` | `button#show-surface-button` | `index.html:223-229` | 打开 Work surface 预览 | `activateSurface("preview")` | hidden/rest/hover/focus | "Open workspace preview" | icon-only | 隐含于多张 surface 截图 | 已接真实能力 |
| `connection.status` | `div#connection-status` | `index.html:233-240` | 连接丢失提示（只读） | `pollEvents` 的 `setConnectionLost` | hidden/error(role=status) | "Connection lost. Reconnecting…" | 不适用（纯文字） | 未捕获（需真实断网/丢包，合成环境未模拟，见 gaps） | 不适用（状态展示，非交互控件） |

## §2 · Composer

> **范围边界（用户裁定，2026-09-10）**：Composer 单独施工，不并入 EX-IC2。增高机制归 CI-B，图片粘贴提示归 CI-F，空态尺寸归 CS-01。本节各行只作清点记录，EX-IC2 的分片 B/C 不对 composer 文件行使写权；本节暴露的问题转交 Composer 线。另外，本台账的动态截图取自 `1992e90`，外壳比例（CS-01）变更之后已不代表组合基线，分片 B 须在组合基线上重新捕获。

| Key | Surface / selector | Src | Intent → Handler | Owner/cap | States | A11y (tooltip) | Glyph/hit | Evid. | Disposition (Gap) |
|---|---|---|---|---|---|---|---|---|---|
| `composer.input` | `textarea#composer-input` | `index.html:285-291` | 输入草稿 | `renderComposer()` 双向绑定 `state.draftCache` | disabled(无会话)/readonly(pending send)/rest/focus | label "Message"（`sr-only`）+ placeholder | 不适用 | `composer-rest-disabled-send`、`composer-text-entered-send-enabled` | 已接真实能力 |
| `composer.runHint` | `p#composer-run-hint` | `index.html:292-294` | 运行中提示（只读） | `renderComposer()` | hidden/visible | "Run in progress — your input will not be sent automatically." | 不适用 | `composer-run-active-cancel-button-run-hint` | 已接真实能力 |
| `chat.files` (materials) | `button#materials-button` | `index.html:297-303` | 打开 Chat files 弹窗 | `openDialog("materials-dialog",...)` + `materialsView.open()` | hidden(home/无会话)/rest/hover/focus | "Chat files" | icon-only `paperclip` | `composer-materials-dialog-open-empty`、`composer-materials-dialog-open-with-files` | 已接真实能力 |
| `composer.connection` | `button#model-settings-button` | `index.html:304-313` | 打开 Connection card（model + file access） | `openConnectionCard(anchor)` | rest/hover/focus/`aria-expanded`/`aria-haspopup=dialog` | 可见文字（当前 provider/model，如 "Local test"）；同时设了看似重复的 `aria-label`（见 gaps："Connection · Local test · Local test" 疑似标签拼接冗余） | 无 icon（纯文字按钮，class `composer-model`） | `composer-connection-popover-open` | 已接真实能力 |
| `model.choose` | `button`（connection card 内，"Choose model & effort"） | `settings-view.mjs:444` | 打开 Model & effort 对话框 | `createModelPicker().open()`（`model-picker.mjs:13`） | rest/hover/focus | "Choose model & effort" | icon-only `settings-2` | 未单独截图（在 `composer-connection-popover-open` 内可见） | 已接真实能力 |
| `model.search` | `input`（model picker 内） | `model-picker.mjs:42` | 过滤已装模型 | 本地 filter | rest/focus/typing | "Find installed model" | 不适用 | 未截图（B 分片可补 specimen） | 已接真实能力 |
| `model.select` | `select[size=7]`（model picker） | `model-picker.mjs:43` | 选择模型 | 本地状态 + `POST /provider-config` | rest/focus/selected | "Installed model" | 不适用（listbox） | 未截图 | 已接真实能力 |
| `model.effort` | `select`（model picker，条件出现） | `model-picker.mjs:44-59` | 选择 reasoning effort；目录未声明档位时只显字不出下拉（PV-27） | 本地状态 | rest/focus/disabled(单档) | "Reasoning effort" | 不适用 | 未截图 | 已接真实能力 |
| `model.save` | `button` "Use for next runs" | `model-picker.mjs:52` | 保存下次 Run 的 model/effort | `POST /provider-config` | rest/hover/focus/disabled(busy) | "Use for next runs" | 无 icon | 未截图 | 已接真实能力 |
| `connection.changeConnection` | `button`（connection card，"Change connection"） | `settings-view.mjs:445-448` | 跳转 Settings › Models | `openSettings("models")` | rest/hover/focus | "Change connection" | icon-only `settings-2` | 隐含于 `composer-connection-popover-open` | 已接真实能力 |
| `permission.segmented` | `segmentedPermission(...)`（connection card内） | `settings-view.mjs:458-463` | 切换本会话 file access 模式 | `PUT /sessions/:id/permission-mode` | rest/hover/focus/disabled(run 进行中) | radiogroup，选项文字为模式名 | 不适用 | `permission-card-deny-focus-visible`（不同控件同名巧合，见文件名） | 已接真实能力 |
| `permission.settings` | `button#permission-settings-button` | `index.html:353-360` | 同 `composer.connection`，从底部入口打开同一 connection card | `openConnectionCard` | rest/hover/focus | 可见文字（当前模式名） | 无 icon | 隐含 | 已接真实能力 |
| `home.newProject` | `button#home-create-project` | `index.html:344` | Home 首次发送前新建项目 | 同 `project.new` | hidden(非home)/rest/hover/focus | "New project" | 无 icon | 未单独截图 | 已接真实能力 |
| `composer.cancel` (`run.cancel`) | `button#cancel-run-button` | `index.html:316-323` | 取消当前 Run | `POST /runs/:id/cancel` | hidden(无run)/rest/hover/focus/disabled(`pendingCancel`)/sending("Sending…"经`setRequestLabel`) | "Cancel run" | 无 icon（IC-1 P1 允许改 SVG，当前仍纯文字），`danger-button` | `composer-run-active-cancel-button-run-hint` | 已接真实能力 |
| `composer.send` | `button#send-button` | `index.html:324-331` | 发送消息 / 创建 Run | `POST /sessions/:id/runs` | hidden(有活跃run时换cancel)/rest/hover/focus/disabled(多重条件见`renderComposer`)/sending("Sending…") | "Send" | icon-only 在部分场景（`primary-button`），文字标签 "Send" 常态可见 | `composer-text-entered-send-enabled`、`composer-sending-and-assistant-streaming-inflight` | 已接真实能力 |
| `materials.add` | `<details id="material-add">`/`form#material-form` | `index.html:807-841` | 新增文本 material（粘贴或上传） | `materialsView` submit → `POST /sessions/:id/materials` | rest/focus/loading(`submit.disabled`)/error(role=alert) | summary "Add text material"；submit 按钮文案随"是否已存在同名文件"切换 "Add material"/"Replace material" | 无 icon | `composer-materials-dialog-open-with-files` | 已接真实能力 |
| `materials.upload` | `input[type=file]#material-upload` | `index.html:829-833` | 从本机选取文本文件回填表单 | `materialsView` change 监听（校验 UTF-8、≤1MB、拒绝二进制） | rest/focus/error(通过 `fail()`) | label "Or choose a text file" | 不适用 | 未截图 | 已接真实能力 |
| `materials.refresh` | `action("refresh-cw", "Refresh session files", refresh)`（动态） | `materials-view.mjs:46` | 刷新文件列表 | `GET /sessions/:id/workspace` | rest/hover/focus | "Refresh session files" | icon-only | `composer-materials-dialog-open-with-files` | 已接真实能力 |
| `materials.retry` | `button`（列表读取失败时，动态） | `materials-view.mjs:74-79` | 重试加载文件列表 | 同 refresh | rest/hover/focus | "Retry loading chat files" | 无 icon（`secondary-button`，可见文字 "Retry"） | 未捕获（需真实读取失败注入，本轮合成数据未构造该反例，见 gaps） | 已接真实能力（纯客户端 retry 已接真实重取，非假动作） |

## §3 · 用户消息

主 Chat 与 Attention 共享同一实现 `renderUserMessage`（`user-message.mjs:46`）。

| Key | Surface / selector | Src | Intent → Handler | Owner/cap | States | A11y (tooltip) | Glyph/hit | Evid. | Disposition (Gap) |
|---|---|---|---|---|---|---|---|---|---|
| `message.user.body` | `.user-message-content .markdown-body` | `user-message.mjs:52,60` | 渲染消息正文（Markdown，DOMPurify 白名单标签） | `markdown()`（`ui-controls.mjs:190`） | rest | `aria-label="Your message"` 在外层 `article` | 不适用 | `user-message-long-collapsed` | 已接真实能力 |
| `message.user.expand` | `details summary`（长消息，>1200字符或>16行时出现） | `user-message.mjs:53-59` | 展开/收起全文，同时切换上方预览段落可见性 | 本地 `viewState` Map | rest/hover/focus/expanded | "Read full message" | 无 icon（原生 `<summary>` marker） | `user-message-long-collapsed`、`user-message-long-expanded` | 已接真实能力 |
| `message.user.source` | `details.user-message-source summary` | `user-message.mjs:61-63` | 展开原始未渲染文本（`<pre>`），独立于上条的"全文/预览"开关 | 同上，独立 viewState key | rest/hover/focus/expanded | "Source" | 无 icon | 隐含于长消息截图 | 已接真实能力 |
| `message.user.time` | `<time>`（有 `startedAt` 时） | `user-message.mjs:69-81` | 展示 Run 发起时间（只读） | — | rest | `aria-label`="Run started …"，**同时用原生 `title` 属性**（不是 `data-tooltip` adapter，见 gaps：同文件两种 tooltip 机制并存） | 不适用 | 隐含 | 不适用（只读展示） |
| `message.user.copy` (`content.copy`) | `.user-message-actions [aria-label="Copy message"]`（动态） | `user-message.mjs:83-86` | 复制整条用户消息 | `navigator.clipboard.writeText` + `onCopy` 回调（真实 toast，见下） | rest/hover(仅 `.message:hover`/`:focus-within` 时 opacity:1，见 gaps 键盘可达实测)/focus/success(2s 后还原，见 `copyAction`) | "Copy message" | icon-only `copy`，class `quiet-button`（hit area 档见 gaps） | `user-message-actions-hover-visible`、`keyboard-user-message-action-focus-visible` | 已接真实能力 |
| `message.user.edit` | `.user-message-actions [aria-label="Edit as new message"]`（动态） | `user-message.mjs:87-89` | 打开 Edit dialog，只生成 composer 草稿，不回写历史、不自动发送 | `openMessageEditor`（`app.mjs`） | rest/hover/focus/disabled(`editDisabled`，Attention busy 时) | "Edit as new message" | icon-only `square-pen`（与 `session.new` 全局态、`tool.write` 共用同一 glyph，跨语义复用，见 gaps 观察） | `edit-message-dialog-open` | 已接真实能力 |
| `edit.dialog.cancel` | `button#cancel-edit-message` | `index.html:757-763` | 放弃编辑 | `closeDialog` | rest/hover/focus | "Cancel" | 无 icon | `edit-message-dialog-open` | 已接真实能力 |
| `edit.dialog.use` | `button#use-edit-message` | `index.html:764-766` | 用编辑稿替换 composer 当前内容（有未保存草稿时显示警告行） | `useEditedMessage()` → `applyComposerDraft` | rest/hover/focus | "Use as draft" | 无 icon（`secondary-button`） | 隐含 | 已接真实能力 |
| 参考图候选：局部复制（代码块外的正文分段复制） | — | — | 用户消息目前只有整条 Copy，无"局部复制某一段" | — | — | — | — | — | 设计候选（参考图不是本产品现状，非当前缺口；见 README 输入边界） |

## §4 · Assistant 消息

| Key | Surface / selector | Src | Intent → Handler | Owner/cap | States | A11y (tooltip) | Glyph/hit | Evid. | Disposition (Gap) |
|---|---|---|---|---|---|---|---|---|---|
| `message.assistant.header` | `.message-header .message-role` | `app.mjs:2615-2620` | 说明这是 Assistant 还是 Attention 的回复（依 `session.scope`） | — | rest | 纯文字，"Assistant"/"Attention" | 不适用 | `chat-1440-light` | 已接真实能力 |
| `message.assistant.body` | `.message-body .markdown-body` | `app.mjs:2621-2624`→`appendAssistantBody` | 渲染回复正文 | `markdown()` | rest/streaming(逐 chunk 追加，见 gaps 流式实测) | 不适用（容器无显式 aria-label，依赖 `role="log"` 的祖先 `#message-stream`） | 不适用 | `composer-sending-and-assistant-streaming-inflight` | 已接真实能力 |
| `message.assistant.copy` (`content.copy`) | `.assistant-message-actions [aria-label="Copy response"]`（动态） | `app.mjs:2627-2641` | 复制整条回复 | `navigator.clipboard.writeText` + `showToast` | hidden(`row.pending`时不渲染 footer)/rest/hover(`focus-within`)/focus/success | "Copy response" | icon-only `copy` | `assistant-message-copy-hover-visible` | 已接真实能力 |
| `message.assistant.codeblock.copy` | `.code-toolbar` 内 `copyAction`（动态，Markdown 含代码块时） | `ui-controls.mjs:210-221` | 复制单个代码块，key 带 `:code:{index}` 区分同消息内多个代码块 | 同上 | rest/hover/focus/success | "Copy code" | icon-only `copy`（与整条 Copy 视觉相同但 `data-focus-key` 不同，语义上不混淆——README 必备反例要求） | 未在合成数据中构造含代码块的回复，未截图（见 gaps） | 已接真实能力（源码确认，未动态截图） |
| 朗读 (read aloud) | — | — | 参考图候选，产品无对应 UI/能力 | — | — | — | — | — | 缺后端/宿主合同（待裁：无 TTS 后端、无既有 owner 工单） |
| 赞 / 踩 (thumbs up/down) | — | — | 参考图候选，产品无反馈存储 | — | — | — | — | — | 缺后端/宿主合同（待裁：无 feedback 存储 API） |
| 更多菜单 (message-level "more") | — | — | 参考图候选，Assistant 消息 footer 只有一个 Copy 按钮，无 overflow menu | — | — | — | — | — | 设计候选（`object.more` 语义已在 interaction-vocabulary.md 登记为"不在当前 24-name allowlist"，未接线） |
| 重试 (retry same turn) | — | — | 参考图候选；产品现有"重试"语义只出现在**读取失败**处（如 materials 列表读取失败的 Retry），不是"重新生成这条回复" | — | — | — | — | — | 缺后端/宿主合同（待裁：不能与 `run.status` 的 loading-retry 混为一谈——README 必备反例明确要求不折叠） |
| 继续 (continue after failure) | — | — | 参考图候选；产品的"继续"语义对应的是失败 Run 之后新开一条消息（无正式"Continue"按钮），而非该回复本身的续写 | — | — | — | — | — | 缺后端/宿主合同（待裁） |
| 再生成 (regenerate) | — | — | 参考图候选，产品无 | — | — | — | — | — | 缺后端/宿主合同（待裁） |
| 分享 (share) | — | — | 参考图候选，产品无分享/发布单条回复的能力 | — | — | — | — | — | 缺后端/宿主合同（待裁） |

## §5 · 文件与成果卡

本产品对"文件"的呈现是**两套并存**的实现，不是同一控件的两处入口：
`materials-view.mjs`（composer 的 Chat files 弹窗，扁平列表）与
`workspace-view.mjs::renderWorkspaceFilesView`（Work surface 的 Workspace
面板，按目录分组），二者共享 CSS 类名 `.workspace-file-row` 但是**两份不同的
渲染函数**、两套不同的动作集合。详见 gaps.md 的"可纯前端整改的可见问题"。

| Key | Surface / selector | Src | Intent → Handler | Owner/cap | States | A11y (tooltip) | Glyph/hit | Evid. | Disposition (Gap) |
|---|---|---|---|---|---|---|---|---|---|
| `materials.file.row` | `.workspace-file-row`（materials 弹窗，动态） | `materials-view.mjs:56-70` | 打开该文件的当前版本（`kind:"current"`） | `onOpenFile` → `openFile()` → `activateSurface("file")` | rest/hover/focus | 无显式 `aria-label`（原生按钮文字内容即文件名+大小，见 gaps：无分段动作，点击=唯一动作） | 无 icon（`icon("file-text")` 20px，装饰性）；命中区=整行 | `composer-materials-dialog-open-with-files`、`file-surface-pane-open-current` | 已接真实能力 |
| `workspace.file.row` | `.workspace-file-row`（Work surface Workspace 面板，动态，**另一实现**） | `workspace-view.mjs:36-44` | 打开该文件（同一 onFile 回调链路） | 同上 | rest/hover/focus | `action(...)` 的可见短标签是文件 basename，完整路径在 `aria-label`（WK-59 短标签/完整 a11y 名分离，与 materials 弹窗那份不一致——materials 那份没有这层分离） | icon `file-text`，`visible:true` 短标签 | 未在本轮单独截图（超出核心流程，见 gaps 捕获缺口） | 已接真实能力 |
| `workspace.file.addMaterial` | `action("plus","Add material",...)`（Workspace 面板底部） | `workspace-view.mjs:53-56` | 从 Workspace 面板跳回 materials 弹窗 | `onMaterials` 回调 | rest/hover/focus | "Add material" | icon-only `plus` | 未截图 | 已接真实能力 |
| `workspace.file.refresh` | `action("refresh-cw","Refresh workspace files",...)` | `workspace-view.mjs:9-12` | 刷新 Workspace 面板文件树 | `onRefresh` → `loadWorkspaceTree()` | rest/hover/focus | "Refresh workspace files" | icon-only | 未截图 | 已接真实能力 |
| `workspace.retry` | `retryAction("Retry loading workspace",...)`（动态，读取失败时） | `surface-modules.mjs:39-46,396` | 重试读取 workspace 树 | `host.refreshWorkspace` | rest/hover/focus | "Retry loading workspace" | 无 icon（`refresh-cw`+可见"Retry"文字） | 未捕获（需构造读取失败反例，见 gaps） | 已接真实能力（纯客户端 retry 真实重取） |
| `artifact.contentVersion.row` | `.artifact-thread-row`（消息流内，动态，仅当存在 `artifact.written` 事件） | `app.mjs:2957-2987` | 打开该 Run 记录的"Recorded version"（与 `materials.file.row` 的"current"读法不同，IC-1 明确要求区分） | `openFile({kind:"content-version",...})` | rest/hover/focus | title=文件路径，meta="Recorded version" | `file-text` 16 + `chevron-right` 16 | `artifact-content-version-open`（动态捕获确认：真实 `ws_write` 会产生该事件并渲染该行，见下） | 已接真实能力 |
| `file.download` | — | — | 参考图候选（下载文件到本机） | — | — | — | — | — | 缺后端/宿主合同（待裁：无下载/导出 API，Work surface 只读预览） |
| `file.copyPath` | — | — | 参考图候选 | 实为**纯客户端可完成**——路径文字已在 DOM 中（`row.file.path`/`file.path`），加一个 Copy 按钮不需要新后端 | — | — | — | — | 纯客户端可完成（当前未接线，属于前端未接已有信息，不是缺后端） |
| `file.openWithDefaultApp` / `file.chooseApp` | — | — | 参考图候选（本机默认应用打开/应用选择） | — | — | — | — | — | 缺后端/宿主合同（待裁：无宿主文件系统 reveal/open-with 合同，当前只有产品内 Work surface 预览） |
| `file.showInFolder` | — | — | 参考图候选 | — | — | — | — | — | 缺后端/宿主合同（待裁：同上，无宿主 reveal 合同） |
| `file.versionHistory` | 部分等价：`artifact.contentVersion.row` 只读一个"Recorded version"，无版本列表/历史对比 UI | — | 参考图候选的"版本/历史"在文件级别未实现；Run 级别有 `run.history`（§6）但不是"这个文件的历史版本列表" | — | — | — | — | — | 缺后端/宿主合同（待裁：无 per-file version list API，只有 per-Run artifacts 数组） |
| `file.notFound` / 已删除文件 | — | — | 参考图候选"已删除/不可用文件"分别列出 | 产品对已删除文件的读取失败走通用 `openFile` 错误路径（未见专门的"已删除"文案，见 gaps） | — | — | — | — | 待核验（需构造真实已删除文件反例，本轮合成数据未覆盖，见 gaps 捕获缺口） |

## §6 · 工具、运行与反馈

| Key | Surface / selector | Src | Intent → Handler | Owner/cap | States | A11y (tooltip) | Glyph/hit | Evid. | Disposition (Gap) |
|---|---|---|---|---|---|---|---|---|---|
| `tool.card` | `details.tool-card summary`（动态，`flowRow`） | `app.mjs:2649-2673` | 展开/收起单个工具调用的 request/result | 原生 `<details>` + `state.toolOpen` 记忆 | rest/hover/focus/expanded/error(`.is-failed`) | title=工具名，meta=状态词（Working/Waiting for you/Stopping/Interrupted/Unknown/Failed，来自 `toolStateWord`） | `toolGlyph(name)`：`ws_write→square-pen`、`ws_list→folder`、`ws_grep→search`、`ws_read/se_read_source→file-text`、`runtime_*→settings-2`，其余 `activity`，16px | `tool-card-collapsed`、`tool-card-expanded-request-result` | 已接真实能力 |
| `tool.retryFailedRead` | — | — | README 覆盖表要求的"失败读取重试"，在 tool-detail 层**没有**对应控件——`appendToolDetails`（`app.mjs:2402-2434`）失败时只输出纯文字 `<pre class="tool-error">`，无 Retry 按钮 | — | — | — | — | — | 前端未接已有后端（`refreshRunDetails()` 函数已存在且可重取 Run，但未绑定到 tool-detail 失败态的任何按钮；待裁：无专门 owner 工单，映射到 README 覆盖表原句） |
| `activity.group` | `details.activity-group summary`（动态，`flowRow`） | `app.mjs:2680-2708` | 同一 Run 内多个工具调用的汇总折叠 | 同上 `state.toolOpen` | rest/hover/focus/expanded/error/`is-working` | title="Activity"，meta=计数+状态词 | `activity` 16px | `tool-card-expanded-request-result`（同截图内可见） | 已接真实能力 |
| `question.card.answer` | `form`（question-card 内，动态） | `app.mjs:2853-2952` | 提交对 Agent 提问的回答 | `POST /runs/:id/questions/:id {answer}` | rest/focus/submitting(`aria-disabled`+"Sending…")/error(role=alert)/success(转入 resolved-history) | input `aria-label="Answer"`；submit 按钮文字随 `setRequestLabel` 切换 | 无 icon（原生 input+`secondary-button`） | `question-card-pending-input-focus`、`question-card-sending-inflight` | 已接真实能力 |
| `question.card.resolvedHistory` | `details.resolved-question summary`（动态） | `app.mjs:2754-2782` | 已回答/已关闭问题的折叠历史行 | 只读 | rest/hover/focus/expanded | title=问题原文，meta="Answered"/"Closed" | `message-square` 16 | `question-card-resolved-history-open` | 已接真实能力 |
| `permission.card.allow` | `button.primary-button`（question-actions内，动态） | `app.mjs:5559-5609` | 批准一次写/工具调用（精确绑定该次调用的字节/哈希） | `POST /runs/:id/questions/:id {decision:"allow"}` | rest/hover/focus/disabled(pending)/sending(带 decision 的"Sending…", `setRequestLabel`) | "Approve this write?"/"…tool action?"/"…remote tool call?"（三种文案，`permissionPresentation` 按调用类型区分，不合并为一个通用 Approve） | 无 icon（`primary-button`，可见文字含对象名） | `permission-card-pending-allow-deny` | 已接真实能力 |
| `permission.card.deny` | `button.secondary-button`（同上） | `app.mjs:5559-5609` | 拒绝该次调用 | `POST ... {decision:"deny"}` | 同上 | "Deny this write?" 等 | 同上 | `permission-card-deny-focus-visible` | 已接真实能力 |
| `permission.card.hashCopy` | `copyAction(payload.contentSha256,...)`（动态，details内） | `app.mjs:5535-5542` | 复制拟写入内容/参数的哈希 | `copyAction`（纯客户端） | rest/hover/focus/success | "Copy proposed content hash" / "Copy proposed arguments hash" | icon-only `copy` | 隐含于 `permission-card-pending-allow-deny` 的 details 展开态（未强制展开截图） | 已接真实能力 |
| `permission.card.resolvedHistory` | `details.resolved-permission summary`（动态） | `app.mjs:5474-5510` | 已决定请求的折叠历史行，保留原始 preview | 只读 | rest/hover/focus/expanded | title=对象名，meta="{Write/Action} approved/denied" | glyph 来自 `permissionPresentation`：write→`square-pen`，remote→`plug`，其余→`activity` | `permission-card-resolved-history-open` | 已接真实能力 |
| `run.status.inspect` | `action("chevron-right","Inspect this run",...)`（run-status卡，动态） | `app.mjs:3011-3015` | 打开 Run inspector 面板 | `openRun(runId)` → `activateSurface("run")` | rest/hover/focus | "Inspect this run" | icon-only `chevron-right` | `run-surface-panel-open-failed-run` | 已接真实能力 |
| `run.status.badge` | `.run-badge`（run-status卡头部，动态） | `app.mjs:2370-2378`,`3010` | 只读状态徽标 | `runLabels[status]` | rest（多态：running/failed/completed/cancelled/unknown 等） | 纯文字状态词 | 不适用 | `run-status-card-failed` | 不适用（只读展示） |
| `run.history.open` | `row("chevron-right","Run history",onHistory)`（Chat overview popover内） | `workspace-view.mjs:120` | 打开该会话全部 Run 的历史列表 dialog | `openRunHistory()` → `dialog#run-history-dialog` | rest/hover/focus | "Run history" | icon-only `chevron-right` | 未单独截图（弹层可用性已通过其他 popover 证据覆盖，见 gaps） | 已接真实能力 |
| `run.history.row` | `.run-history-row`（动态） | `workspace-view.mjs:149-159` | 打开某历史 Run 的详情 | `onRun(run.id)` | rest/hover/focus | 内含用户输入首行+状态+时间 | `chevron-right`（尾随，hover 才显现，见 styles.css:2975） | 未截图 | 已接真实能力 |
| `run.history.close` | `button#close-run-history` | `index.html:729-736` | 关闭历史 dialog | 原生 `<dialog>` close | rest/hover/focus | "Close run history" | 无 icon（可见文字 "Close"） | 未截图 | 已接真实能力 |
| `extension.lifecycle.{load,unload,reload,invalidate}` | Settings › Developer › Extensions（动态） | `app.mjs:1982-2020+` | 扩展生命周期动作 | `lifecycle(extensionId, action)` | rest/hover/focus，按钮集合随当前状态变化（load/unload/reload/invalidate 互斥出现） | 纯文字按钮（"Load"/"Unload"/"Reload"/"Invalidate"） | 无 icon | 未截图（Settings 范围，入口已登记，内部不在本分片核心 Chat space） | 不适用（超出 Chat space 定义，仅备查） |
| `permission.answer.overflow`（Answer requested 摘要行，已消解） | — | `app.mjs:2798` 注释 | WK-57 ablation 已移除的旧摘要行，当前无对应控件（历史事实，非当前缺口） | — | — | — | — | — | 不适用（历史设计消解，非当前控件） |

## §7 · 浮层与次级面

| Key | Surface / selector | Src | Intent → Handler | Owner/cap | States | A11y (tooltip) | Glyph/hit | Evid. | Disposition (Gap) |
|---|---|---|---|---|---|---|---|---|---|
| `overlay.tooltip` | `div#control-tooltip`（单例，`popover=manual`） | `ui-controls.mjs:257-376` | 短文本提示，任何带 `data-tooltip` 的控件共享 | `installTooltips()` | hidden/rest(hover延迟400ms/分组300ms内即时切换)/focus-visible即时开/Escape关闭 | `role="tooltip"`，`aria-describedby` 双向绑定 | 不适用 | `tooltip-visible-on-hover-refresh-button`、`tooltip-visible-on-keyboard-focus-refresh-button` | 已接真实能力（键盘 focus 打开、Escape 关闭均已用真实 Tab/Escape 事件实测确认，见 gaps 键盘实测记录） |
| `overlay.connectionPopover` | `div#connection-popover`（`popover=auto`） | `index.html:776-781` | model/permission 卡片浮层 | `openConnectionCard` + `anchorPopover`（Floating UI） | hidden/open/close(Escape 或再次点击触发按钮) | `aria-label="Connection and file access"` | 不适用 | `composer-connection-popover-open` | 已接真实能力（Escape 关闭 + 焦点回到触发按钮 `#model-settings-button`，已用真实点击+Escape 实测确认，见 gaps） |
| `overlay.contextPopover` | `div#context-popover` | `index.html:770-775` | "This chat" 概览浮层 | `openContextSummary` | hidden/open/close | `aria-label="Chat overview"` | 不适用 | `chat-overview-context-popover-open`（若该会话状态允许，见 gaps 捕获缺口） | 已接真实能力 |
| `overlay.materialsDialog` | `dialog#materials-dialog` | `index.html:788-843` | 原生 modal dialog | `openDialog`/`materialsView` | hidden/open/close | `aria-labelledby="materials-title"` | 不适用 | `composer-materials-dialog-open-with-files` | 已接真实能力 |
| `overlay.editMessageDialog` | `dialog#edit-message-dialog` | `index.html:741-769` | 原生 modal dialog | `openMessageEditor`/`useEditedMessage` | hidden/open/close | `aria-labelledby="edit-message-title"` | 不适用 | `edit-message-dialog-open` | 已接真实能力 |
| `overlay.projectDialog` | `dialog#project-dialog` | `index.html:844-879` | 新建项目表单（`method=dialog`，原生取消/确认） | `POST /projects` | hidden/open/error(role=alert) | `aria-labelledby="project-dialog-title"` | 不适用 | 未截图（表单类，行为与 session-dialog 同构，见 gaps） | 已接真实能力 |
| `overlay.sessionDialog` | `dialog#session-dialog` | `index.html:880-917` | 新建会话表单（含 file access select） | `POST /sessions` | hidden/open/error | `aria-labelledby="session-dialog-title"` | 不适用 | 未截图 | 已接真实能力 |
| `overlay.runHistoryDialog` | `dialog#run-history-dialog` | `index.html:725-740` | 见 §6 `run.history.*` | — | hidden/open/close | `aria-labelledby="run-history-title"` | 不适用 | 未截图 | 已接真实能力 |
| `overlay.attentionDialog` | `dialog#attention-agent-dialog` | `index.html:918` | Attention 独立 modal，见 §8 | `createAttentionAgent(...).open()` | hidden/open/close(焦点回到 opener，见 `deactivate()`) | `aria-labelledby="attention-agent-title"` | 不适用 | `attention-dialog-open-default` | 已接真实能力 |
| `overlay.surfacePanel` | `aside#surface-panel` | `index.html:597-723` | Work surface 侧滑面板（非原生 dialog，`inert`+`aria-hidden` 切换） | `activateSurface`/`closeSurface` | hidden(`inert`)/open/expanded | `aria-labelledby="surface-title"` | 不适用 | `run-surface-panel-open-failed-run`、`file-surface-pane-open-current` | 已接真实能力 |
| `overlay.surfaceExpand` | `button#surface-expand-button` | `index.html:683-690` | 展开/还原 Work surface 面板宽度 | `setSurfaceExpanded()` | rest/hover/focus/`aria-expanded` | "Expand work surface" | icon-only | 未单独截图 | 已接真实能力 |
| `overlay.surfaceClose` | `button#close-surface-button` | `index.html:691-696` | 关闭 Work surface 面板 | `closeSurface()` | rest/hover/focus | "Close work surface" | icon-only | 隐含于多张 surface 截图 | 已接真实能力 |
| `overlay.surfaceBack` | `button#surface-back-button` | `index.html:608-613` | Work surface 内部返回（与 tab strip 同行，独立于 tab 本身） | — | hidden/rest/hover/focus | 空 `aria-label`（见 gaps：`surface-back-button` 无显式 `aria-label` 属性，依赖内容或 CSS，见待核验项） | icon-only | 未截图 | 待核验（a11y name 来源未在静态源码中确认，需在真实 extension-bound 会话下复测） |
| `overlay.documentTabClose` | `button#surface-document-close` | `index.html:672-676` | 关闭当前打开的文档 tab（键盘 Delete/Backspace 亦可，`app.mjs:6105-6108`） | — | hidden/rest/hover/focus | 未见显式 `aria-label`（见 gaps） | icon-only | 未截图 | 待核验 |
| `mobile.navOverlay` | `aside#navigation-panel`（<1024 时 overlay 呈现） | `index.html:70-183` | 移动端侧栏整体 | `toggle-nav-button`/`close-nav-button` | hidden/open | `aria-label="Projects and chats"` | 不适用 | `sidebar-mobile-overlay-390-light`、`sidebar-mobile-overlay-390-dark` | 已接真实能力 |

## §8 · Attention 助手（独立实现，跨 §2/§4/§6/§7 对照）

`attention-agent-view.mjs` 是与主 Chat **并行但不共享**的第二套控制器/渲染
路径（`createAttentionAgent`）。它复用 `user-message.mjs`（§3 共享）与
`ui-controls.mjs` 的 `el`/`action`/`markdown`/`copyAction`，但工具/问题/
权限卡片是本文件内联手写，**不复用** `app.mjs` 的 `flowRow`/`toolGlyph`/
`toolStateWord`/`setRequestLabel`/`permissionPresentation`。

| Key | Surface / selector | Src | Intent → Handler | Owner/cap | States | A11y (tooltip) | Glyph/hit | Evid. | Disposition (Gap) |
|---|---|---|---|---|---|---|---|---|---|
| `at.dialog.close` | `action('x','Close Attention',close)` | `attention-agent-view.mjs:16` | 关闭 Attention dialog | `dialog.close()` | rest/hover/focus | "Close Attention" | icon-only `x` | `attention-dialog-open-default` | 已接真实能力 |
| `at.history.select` | `select`（会话选择） | `attention-agent-view.mjs:17-18` | 切换 Attention 全局会话 | `controller.choose(id)` | rest/focus/disabled(busy) | "Attention conversation" | 不适用 | `attention-dialog-with-conversation` | 已接真实能力 |
| `at.refresh` | `action('refresh-cw','Refresh Attention',...)` | `attention-agent-view.mjs:19` | 刷新当前会话 | `controller.refresh()` | rest/hover/focus/disabled | "Refresh Attention" | icon-only | 隐含 | 已接真实能力 |
| `at.items` | `button` "Attention items" | `attention-agent-view.mjs:20-21` | 关闭 dialog，跳转 Attention 队列页 | `onItems()` | rest/hover/focus | "Attention items"（`text-button`，纯文字非 icon-only） | 无 icon | 隐含 | 已接真实能力 |
| `at.openFull` | `button` "Open conversation" | `attention-agent-view.mjs:22-23` | 关闭 dialog，打开该会话完整视图（复用主 Chat 渲染） | `onOpenSession(id)` | hidden(无 session)/rest/hover/focus | "Open conversation" | 无 icon | 隐含 | 已接真实能力 |
| `at.configure` | `action('settings-2','Configure Attention Runtime',...)` | `attention-agent-view.mjs:24` | 打开该会话的 Settings › Runtime | — | rest/hover/focus/disabled | "Configure Attention Runtime" | icon-only | 隐含 | 已接真实能力 |
| `at.manage` | `button` "Conversations" | `attention-agent-view.mjs:25-26` | 切换到"管理会话列表"视图 | 本地 `managing` 状态 | rest/hover/focus/disabled | "Conversations" | 无 icon | `attention-recent-rename-form-open` | 已接真实能力 |
| `at.recent.new` | `button` "New conversation" | `attention-agent-view.mjs:30-31` | 开始新的 Attention 会话 | `controller.choose('')` | rest/hover/focus/disabled | "New conversation" | 无 icon | 隐含 | 已接真实能力 |
| `at.recent.search` | `input[type=search]` | `attention-agent-view.mjs:28,34` | 按标题过滤会话列表（本地全量过滤，非"仅已加载名称"的模糊行为，见 gaps 对比 `nav.filter`） | 本地 filter | rest/focus/typing | "Search Attention conversations" | 不适用 | 隐含 | 已接真实能力 |
| `at.recent.open` | `.text-button`（每行，动态） | `attention-agent-view.mjs:41-43` | 打开该会话 | `controller.choose(id)` | rest/hover/focus/disabled(busy) | 会话标题 | 无 icon | 隐含 | 已接真实能力 |
| `at.recent.rename` | `button` "Rename"（每行，动态） | `attention-agent-view.mjs:44-53` | 就地重命名（**主 Chat 会话没有此能力**，见 §1 `session.rename` 缺口对照） | `controller.rename(id, title)` | rest/hover/focus/disabled；点击后原地替换为表单(Save/Cancel) | "Rename {title}" | 无 icon | `attention-recent-rename-form-open` | 已接真实能力 |
| `at.composer.input` | `input[type=text]` | `attention-agent-view.mjs:60-62` | 输入消息（Enter 直接发送，与主 Chat 的 `<textarea>`+`Send`按钮不同交互形态） | `controller.setDraft` | rest/focus/readonly(busy) | "Message Attention" | 不适用 | `attention-dialog-open-default` | 已接真实能力 |
| `at.composer.model` | `button.attention-model-choice` "Model" | `attention-agent-view.mjs:63-64` | 打开模型选择（复用 `onChooseModel`，即同一个 `model-picker.mjs`） | 同 §2 `model.choose` | rest/hover/focus | "Choose model and effort" | 无 icon（纯文字，随 provider 变化） | 隐含 | 已接真实能力 |
| `at.composer.send` | `action('arrow-up','Send to Attention',...)` | `attention-agent-view.mjs:65` | 发送 | `controller.send()` | hidden(有活跃run)/rest/hover/focus/disabled | "Send to Attention"（命令重试态换词 "Retry the same Attention message"，`updateControls()`） | icon-only `arrow-up`（**与主 Chat 的纯文字"Send"按钮视觉不同**，见 gaps 观察） | 隐含 | 已接真实能力 |
| `at.composer.cancel` | `action('square','Cancel Attention run',...)` | `attention-agent-view.mjs:66` | 取消当前 Run | `controller.cancel()` | hidden/rest/hover/focus/disabled(`stopping`) | "Cancel Attention run" | icon-only `square` | 隐含 | 已接真实能力 |
| `at.runtime.details` | `details.attention-agent-runtime` "Runtime & memory" | `attention-agent-view.mjs:67-68` | 展开只读运行时信息（provider/model、memory 说明、tool 权限说明、usage） | — | rest/expanded | "Runtime & memory" | 无 icon | 隐含 | 已接真实能力 |
| `at.message.assistant.copy` | `copyAction(row.text,'Copy response',row.id)`（动态） | `attention-agent-view.mjs:158` | 复制回复（与主 Chat 同函数，但 Attention 侧**没有**代码块单独复制的额外调用——`markdown()` 本身自带代码块 copy，行为其实一致，仅由不同容器触发） | 同 §4 | hidden(pending)/rest/hover(`.attention-agent-message:hover`)/focus/success | "Copy response" | icon-only `copy` | `attention-dialog-with-conversation` | 已接真实能力 |
| `at.tool.detail` | `details`（动态，`app.mjs` 的 `flowRow`/`toolGlyph` **均未复用**） | `attention-agent-view.mjs:161-165` | 展开工具调用的原始 JSON（`request`/`result` 直接 `JSON.stringify`，无 `appendToolDetails` 的分段标题、无失败态红色强调） | — | rest/expanded | summary=工具名（+ 状态词，若有） | 无 icon（主 Chat 有 `toolGlyph`，Attention 没有，见 gaps 观察） | 未截图（本轮 fixture 的 Attention 会话未构造工具调用，见 gaps 捕获缺口） | 已接真实能力（有渲染路径，未在本轮动态构造该状态） |
| `at.permission.allow` / `at.permission.deny` | `button`（动态，纯 `el('button',{text:label},...)`，**未使用 `setAction`/`setRequestLabel`**） | `attention-agent-view.mjs:173-177` | 批准/拒绝工具调用 | `controller.answer(runId, id, {decision})` | rest/hover/focus/disabled(`state.busy`) —— **没有"哪个按钮被点击"的 in-flight 区分**（对照 §6 `permission.card.allow/deny` 的 `setRequestLabel` 按 decision 分别换词），也没有独立 glyph（`permissionPresentation` 未复用） | 纯文字 "Deny"/"Allow this action"（无 `aria-label` 覆盖，文字本身即可访问名） | 无 icon | `attention-dialog-permission-pending-bespoke-buttons` | 前端未接已有后端——**不是缺后端**，是前端未复用已在 §6 存在的 `setRequestLabel`/`permissionPresentation`（待裁：跨表面一致性，无独立 owner 工单，映射 README「同一族原语不同表面不同读法」的既有关注点，具体见 gaps） |
| `at.question.answer` | `textarea`+`button` "Send answer"（动态，同样不经 `setRequestLabel`） | `attention-agent-view.mjs:180-185` | 回答 Attention 内的问题 | `controller.answer(runId, id, {answer})` | rest/focus/disabled(busy或空值) | `aria-label="Answer Attention"`；按钮纯文字 "Send answer"（不随提交切换为"Sending…"，见 gaps） | 无 icon | 未单独截图（问题流程本轮聚焦于已答复会话，见 gaps） | 前端未接已有后端（同上，未复用 `setRequestLabel`） |

---

## 自检小节：覆盖统计与 disposition 分布

| 族 | 行数（不含标题/分隔） |
|---|---|
| §1 入口与 chrome | 21 |
| §2 Composer | 18 |
| §3 用户消息 | 8 |
| §4 Assistant 消息 | 9 |
| §5 文件与成果卡 | 11 |
| §6 工具/运行/反馈 | 15 |
| §7 浮层/次级面 | 14 |
| §8 Attention 独立实现 | 18 |
| **合计** | **114** |

| Disposition | 计数（约） |
|---|---|
| 已接真实能力 | 92 |
| 纯客户端可完成 | 2 |
| 前端未接已有后端 | 3 |
| 缺后端/宿主合同 | 10 |
| 设计候选 | 2 |
| 不适用 | 4 |
| 待核验 | 4 |

计数为人工按上表逐行分类的近似统计（同一行如兼具多重性质，按主 disposition
记一次），用于自检覆盖面而非精确审计指标；逐项证据以上表为准。
