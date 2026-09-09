# EX-WK8 · Primitive 消费台账

2026-09-09，Sonnet，只读（子代理无写权，由 Fable 原文落盘）。派单：WK-93 / FE-04。基线：`claude/fable-round4` HEAD `4df3db7`（worktree `/private/tmp/se-fable-lines`）。已读：`inputs/review-semantics-2026-09-09.md` §5、`intake-round-3.md` WK-88/89/93、`work-orders/WO-FE-round4.md` FE-04、`engineering/design/frontend-layering-spec.md` §4.2/§5、`contracts/review-projection.md`、`contracts/glyph-semantics.md`、`delivery-wk10b-1.md`、`delivery-wk10b-2.md`、`explore/ex-wk1-canon-map.md`、`explore/ex-wk2-review-sources.md`。**不复述 EX-WK1/EX-WK2 已定的字段映射与十来源冲突清单，只引用并向本单要求的三个新增维度扩展**：REUSE/REVERSE/REFERENCE/PROTOCOL/AVOID-COUPLING 分类、按 CourtWork 11 个 primitive 重新切分、以及本单新增来源（assistant-ui、Vercel AI Elements、OpenHands、AgentGate、agenttrace-ui、MCP、AG-UI）。EX-WK2 已覆盖 CopilotKit（SRC-01/02）、Suna（SRC-09）、Gatewerk（SRC-06）、21st-dev/Agent Elements（SRC-08）、agent-indicator（SRC-05）——本卷对这五个只标注分类与迁移行为，不重新访问其原始文档。

## 0 · 方法与限制

只读 WebFetch / GitHub REST API（`api.github.com`，未认证，公开只读）；未 clone、未安装、未执行任何外部源码。全部 pinned 版本取自访问当日（2026-09-09）该仓库默认分支的最新 commit——**多数来源不是 tag 版本发布，是"访问日 HEAD"**，这与 EX-WK2 的做法一致（EX-WK2 §1 体例）。CourtWork 侧的 `path:line` 取自本 worktree 当前源码（`app.mjs` 5857 行，比 delivery-wk10b-2 记录的基线多约 1100 行，行号已按当前文件重新核对，不沿用旧交付文档里的行号）。

## 1 · 外部来源登记

| 来源 | Pinned 版本/commit + URL | 许可 | 框架耦合 | 备注 |
|---|---|---|---|---|
| assistant-ui | `441168d`（2026-09-08）https://github.com/assistant-ui/assistant-ui；docs https://www.assistant-ui.com/docs | MIT | React 组件树 + `@assistant-ui/react` runtime/context；CLI 起步模板绑定 Radix UI 或 Base UI | `@assistant-ui/react@0.15.18`（npm，访问日） |
| Vercel AI Elements | `6a9d5b1`（2026-09-08）https://github.com/vercel/ai-elements；docs https://elements.ai-sdk.dev | 仓库标注 `Other`（`shadcn/ui` 注册表条款，非标准 OSI 许可，未逐条核实） | 建立在 shadcn/ui 之上，源码以 `npx ai-elements add` 复制进项目（同 BoardUI 模式，非依赖）；深度绑定 Vercel AI SDK 的 `useChat`/message parts 类型 | 是 registry 不是可 import 的包 |
| Agent Elements（21st-dev） | 沿用 EX-WK2 SRC-08：`b04b36c`，MIT，`@pierre/diffs/react` 私有 CSS 变量 | — | — | 不重复访问 |
| BoardUI | `3e76e28`（2026-09-08）https://github.com/BoardUI/boardui；https://www.boardui.com | 仓库标注 MIT；官网页未见许可声明（未核实两处是否一致） | React 19.2 + React Aria Components 1.17 + Tailwind v4；同样是"复制源码进项目"模式，非运行时依赖 | 官网未列出 chat/composer/agent-log 组件的状态机文档（本卷已尝试 `/docs/components`，404）——组件存在但状态语义**未检** |
| CopilotKit | 沿用 EX-WK2 SRC-01/02：MIT，绑定 LangGraph TS 图节点与 React hook 生命周期 | — | — | 不重复访问 |
| OpenHands | `6f240cc`（2026-09-08，仓库已由 `All-Hands-AI/OpenHands` 重命名为 `OpenHands/OpenHands`）https://github.com/OpenHands/OpenHands；docs https://docs.openhands.dev | MIT | 前端 React + TypeScript + Vite + React Router；CLI 另有独立 Python 实现 | 本卷读了 docs 的 CLI confirmation-mode 页，未读 Web 前端的 review/diff 组件源码（**未检**：`frontend/src` 具体路径与状态机文件未展开） |
| Suna | 沿用 EX-WK2 SRC-09：`ef2a0c7`，Elastic License 2.0，`review-center.tsx` reducer 纯函数但仍是内存 React state | — | — | 不重复访问 |
| Gatewerk | 沿用 EX-WK2 SRC-06：`9b4f740`（master），AGPL-3.0（server）/ Apache-2.0（client SDK） | — | — | 不重复访问 |
| AgentGate | `abb46ee`（2026-09-08）https://github.com/agentkitai/agentgate | MIT | 服务端策略引擎 + 多渠道通知（Slack/Discord/email/dashboard），前端非其重点；TypeScript SDK + MCP 客户端集成 | 命名冲突：GitHub 上至少 5 个不同项目都叫 `agentgate`（selfradiance 的质押担保版本语义完全不同）——本卷取与"action gate、approval lifecycle"语义最贴的 `agentkitai/agentgate`，**其余候选未逐一核实是否为该工单原意** |
| FlowGate | **未找到匹配仓库**（见 §4） | — | — | — |
| agenttrace-react | 未找到名为 `agenttrace-react` 的仓库；最贴近的是 `NikitaKharya09/agenttrace-ui`，`02b7a85`（2026-09-08）https://github.com/NikitaKharya09/agenttrace-ui | MIT | React + Next.js，要求 AI SDK v6 `useChat`；**5 stars、0 forks、未发布 npm**，源码以复制方式分发 | 早期项目，成熟度远低于其它来源，结论按低权重对待 |
| MCP | 规范仓库 `aa8ce04`（2026-09-08）https://github.com/modelcontextprotocol/modelcontextprotocol；本卷读的是 elicitation 规范页 `2025-06-18` 版；仓库内已有更新的 `2025-11-25`、`2026-07-28` 版目录，**差异未核实** | 规范文本 `Other`（CC BY 4.0，未逐字核实） | 协议本身语言无关；SDK 各语言各自实现 | 协议边界，见 §2 |
| AG-UI | `393c20c`（2026-09-08）https://github.com/ag-ui-protocol/ag-ui；docs https://docs.ag-ui.com | MIT | 协议为 transport-agnostic 事件流；参考客户端含 React 绑定，未强制 | HITL 走 `interrupt`/`resume` 草案扩展，非稳定 |

## 2 · 十一个 primitive 逐项台账

体例：**现状**（CourtWork 当前实现的 `path:line`，只引用不复述实现细节，详见 EX-WK1）；**来源 × 分类 × 可迁移行为**。

### 2.1 Thread（消息列表、自动滚动、跳到最新、空态、streaming）

现状：`app.mjs:2409` `renderMessageStream`；自动滚动判据 `app.mjs:429-434` `isNearBottom`（阈值 48px）；`app.mjs:435-438` `setJumpLatestVisible`；`app.mjs:440-452` `rememberMessageReading`（离开底部即挂起 follow，`jump-latest-button` 现身）；`app.mjs:643-648` `scrollToLatestMessage`。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| assistant-ui | REVERSE + REFERENCE | `Thread.Root` 承担 auto-scroll + 空态 + 消息渲染（docs/primitives）；行为规范可迁移：*滚动到底部时才跟随新增内容，用户上滚即停止跟随*——与 CourtWork `isNearBottom` 判据同一原语，可作为验收基准，不取其 React 组件树 |
| Vercel AI Elements | REFERENCE | `Conversation` 容器 + 流式 status 内建；未读到其自动滚动阈值的具体数字（**未检**），只作锚点参照 |
| React-specific（两者） | AVOID-COUPLING | `Thread.Root`/`Conversation` 均是 React 组件，内部持有 ref 与 context；CourtWork 不取其实现，只取"跟随/挂起"状态机描述 |

### 2.2 Composer（submit、Enter/Shift+Enter、IME、cancel/stop swap、draft 持久化、附件、focus 归位）

现状：`app.mjs:3102-3167` `renderComposer`（send/cancel 互斥显隐、`readOnly` 语义、`aria-disabled`）；Enter 提交 `app.mjs:5658-5667`（`shiftKey`/`isComposing`/`data-composing` 三路短路，IME 未合成不误触发）；`submitSessionRun` `app.mjs:4452-4520`（连接丢失守卫、`draftRevision` 版本号、`guardRegisterIntent`/`guardHandoffFocus` 焦点回归）；`cancelCurrentRun` `app.mjs:4617-4660`（`pendingCancels` 幂等、失败回执 `describeCommandError`）；草稿持久化 `scheduleDraftSave` `app.mjs:1212`、`storeHomeDraft`/`restoreHomeDraft` `app.mjs:287-317`；`Edit as new message` → `applyComposerDraft` `app.mjs:4677-4696`；附件 `materials-view.mjs`（EX-WK1 已记：1 MB 上限 + UTF-8 校验 `materials-view.mjs:97-104,123-128`）。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| assistant-ui | REVERSE + REFERENCE | `Composer` 子部件 `Root/Input/Send`；文档明言行为契约"submit-on-enter, focus management, empty-state disabling, and streaming state"（docs/primitives）——与 CourtWork 的 send/cancel 互斥显隐、`textarea.disabled`/`readOnly` 分离语义高度一致，可迁移的是**行为断言**（Enter 提交、Shift+Enter 换行、IME 不误触发、streaming 时 Send→Cancel 互换），不取其 `useComposerRuntime` context |
| assistant-ui | REFERENCE | `Attachment` primitive（文件/图片渲染）——CourtWork 的 materials 独立于 surface 状态（`materials-view.mjs`），两者边界不同，只作对照 |
| Vercel AI Elements | REFERENCE | `PromptInput` 组件；文档称"Streaming, status states and type safety built-in"，具体 keyboard map 未读到（**未检**） |
| React-specific（两者） | AVOID-COUPLING | Composer 状态全部落在 React `useState`/`useComposerRuntime`；CourtWork 的 `state.draftCache`/`state.draftDirty`/`scheduleDraftSave` 已是独立于框架的持久化实现，不需要迁移其状态容器 |

### 2.3 Message（用户消息、copy/edit-as-new、助手 markdown/sanitize）

现状：`user-message.mjs:1-42` `renderUserMessage`（`Copy message`/`Edit as new message` 两个 footer action，`app.mjs:4667-4676` `openMessageEditor`）；助手正文 `appendAssistantBody`（`app.mjs:2045-2051` 调用点）经 `ui-controls.mjs:177-219` `markdown()`（`marked` + `DOMPurify`，`ALLOWED_TAGS` 白名单、外链强制 `target=_blank rel=noopener`、代码块与表格分别包一层可滚动/复制容器）。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| assistant-ui | REVERSE + REFERENCE | `ActionBar`（copy/reload/edit）、`MessagePartPrimitive`（text/image/streaming parts）；可迁移的是"消息是不可变输入记录、编辑产出新草稿而非原地改写"这条不变量（CourtWork `user-message.mjs` 注释已同此，EX-WK1 已记） |
| Vercel AI Elements | REFERENCE | `Message` 组件族；文档未展示其 sanitize 策略细节（**未检**），CourtWork 的白名单标签与 `DOMPurify` 策略已自成一套，无需对齐 |
| React-specific | AVOID-COUPLING | `BranchPicker`（在多个候选回复间切换）依赖 React 状态树维护分支；CourtWork 无该功能，不引入 |

### 2.4 Tool row（working/completed/failed/interrupted 四相、结果披露）

现状：`thread-projection.mjs:41-65`（`tool/start`/`tool/update`/`tool/result` 合并为一行，`phase: "started" | "result"`，`isError` 布尔）；行解剖 `ui-controls.mjs:87-100` `flowRow`（16 glyph + 标题 + 至多一个元数据词）；状态词落点 `contracts/glyph-semantics.md` §3（`Working`/`Stopping`/`Waiting for you`/`Interrupted`/`N failed`）；消融判据见 `delivery-wk10b-1.md` C-1…C-3（状态从对象名里独立出来、失败态只有状态词着色、整卡红删除）。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| assistant-ui | REVERSE + REFERENCE | Tool UI 状态三分：`running`（进行中反馈文案）/`result`（`status.type === "complete"`）/`incomplete`（`status.reason === "error" \| "cancelled"`）——**区分 error 与 cancelled 是 CourtWork 当前未做的一个粒度**：CourtWork 只有 `isError` 布尔 + 行状态词，未见"因用户取消而未完成"与"因错误而未完成"两个不同的行状态词（见 §3 gap 表） |
| Vercel AI Elements | REVERSE + REFERENCE | `Tool` 组件四态：`input-streaming`/`input-available`/`output-available`/`output-error`（overview 页列出组件名，具体 state 值来自公开 AI SDK 类型定义，本卷未逐一读取子页确认精确取值——**未检**，按已知 AI SDK 惯例转录，标记为**推断**）；`ToolHeader`/`ToolContent`/`ToolInput`/`ToolOutput` 的拆分方式与 CourtWork `flowRow` 的"标题+元数据+披露"三段结构可对照，取其**拆分粒度**，不取组件 |
| Agent Elements（21st-dev） | REVERSE | `EditTool` 卡：`isPending` 由 `state === "animating"` 判定（EX-WK2 §2.2）；结果 disclosure 展开/收起——与 CourtWork `<details>` 折叠一致，行为已独立到达同一实现，无需迁移 |
| React-specific（全部） | AVOID-COUPLING | `mapToolStateToStepState`、`useToolArgsStatus` 均是 React hook 状态派生；CourtWork 的 `row.phase`/`row.isError` 已是纯数据字段 |

### 2.5 Approval（permission card：exact call、allow/deny once、submitting、expired/cancelled、无 always-allow）

现状：`app.mjs:4908-5040` `renderPermission`；字段绑定 `thread-projection.mjs:142-153` `validPermission`（path+toolCallId+bytes+contentSha256+preview）；语义呈现 `thread-projection.mjs:158-179` `permissionPresentation`（write/remote/action 三分，各自 glyph 与文案）；按钮只有 `deny`/`allow` 两个（`app.mjs:5000-5006`），`aria-disabled` 随 `questionSubmitting`/`questionSubmitted` 切换（`app.mjs:5009`），失败落 `state.questionErrors`（`app.mjs:5024,5042`）；**无 always-allow 分支，源码内不存在该按钮**（已读全函数体确认，非推断）。契约层裁定见 `contracts/review-projection.md` §6 微交互附注："Always allow — 不出现在卡上；策略级放行属 runtime 控制面"。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| assistant-ui | REVERSE + REFERENCE | 三态信号 `approval: undefined \| true \| false`（server-side approval gate，AI SDK v7）；`respondToApproval({approved, reason?, optionId?})`；**其 approval options 支持 `"allow-once"` / `"allow-always"` 两档**——`allow-always` 与 SE"不出现 always-allow"的裁定直接冲突，**不迁移这一档**，只迁移三态信号与 `interrupt.payload`/`resume(payload)` 的暂停-恢复模式（其暂停语义可对照 CourtWork 的 `canAnswer()` 门控） |
| CopilotKit | REVERSE（沿 EX-WK2） | `verdict: allow \| deny \| require_approval`；`require_approval` 是"进卡片前"的前置态，CourtWork 目前无此分档（问题/授权一律直接开卡），可迁移为一个可选的"是否需要人工"判断层，但**不迁移 `Always allow` 概念本身**（beUI 一侧 EX-WK2 已定为不采纳） |
| Gatewerk（沿 EX-WK2） | REVERSE | 乐观并发（`expectedVersion` 比对、`version_mismatch`）——可迁移的是"过期请求被拒绝而非静默接受"这条不变量；CourtWork 目前的 `questionKey` 幂等靠前端本地 Set（`state.questionSubmitted`），**没有服务端版本号做冲突检测**（见 §3 gap） |
| AgentGate | REVERSE | 状态四态 `pending/approved/denied/expired`；决策不可变 + 全量审计日志；**auto-approve 策略与多渠道分发（Slack/Discord/email）不迁移**——SE 的 approval 是应用内一次写授权，没有跨渠道委托这个对象 |
| MCP | PROTOCOL | `elicitation/create` 三态响应 `accept/decline/cancel`，规范明文"Servers MUST NOT use elicitation to request sensitive information"；这是**协议边界**而非 UI primitive，CourtWork 的 permission 卡是应用层实现，不经过 MCP elicitation（除非某工具本身是 MCP server，Astra 联调补充已覆盖此路） |
| AG-UI | PROTOCOL | `RunFinished` 携带 `interrupt` outcome + `interrupts[]`，客户端以新 run 的 `resume[]` 数组逐个回应——**expired/late 响应处理未在文档中明确**（**未检**），只作协议边界参照，不迁移 UI |
| React-specific（assistant-ui/CopilotKit） | AVOID-COUPLING | `respondToApproval`/`useHumanInTheLoop` 均绑定 React hook 与（CopilotKit 侧）LangGraph 图节点生命周期 |

### 2.6 Question（ask_user 回答）

现状：`app.mjs:2622-2850`（问题卡渲染，含未决/已答/已关闭三分支）；`thread-projection.mjs:132-141` `canAnswer()` 唯一收口（`questionStatus === "pending"` ∧ run 处于 `running`/`waiting_user` ∧ `admissionOpen !== false`）；提交后 `state.questionSubmitted` 标记乐观占位，`Answer sent; waiting for confirmation.`（`app.mjs:2735-2743`）。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| MCP | PROTOCOL | elicitation 的 `requestedSchema` 限定为扁平对象 + 原始类型（`string`/`number`/`boolean`/`enum`），可迁移的约束原则是"结构化请求应能被安全渲染为表单"，但 CourtWork question 目前是自由文本单值输入（`app.mjs:2757-2765` 单一 `<input type=text>`），**未支持结构化 schema**（见 §3 gap，属能力缺口而非矛盾） |
| assistant-ui | REFERENCE | `interrupt.payload` 的自由载荷模式，与 CourtWork `row.prompt` 自由文本一致，无迁移动作 |

### 2.7 Artifact/File（recorded bytes、preview、versions）

现状：`inspector.mjs:107-165`（`renderRun` 内 artifact 行）、`inspector.mjs:319-453`（`createFileView`，`current`/`content-version` 两个读取类别）；`inspector.mjs:303-317` `validateFilePayload`（强制 `runId`/`sha256` 匹配）；glyph 语义 `contracts/glyph-semantics.md` §4"已记录的产出文件"行（`file-text` + `chevron-right`，元数据词 `Recorded version`，非审批状态）。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| Vercel AI Elements | REFERENCE | `Artifact`/`Code Block`/`File Tree`/`Commit` 组件族（overview 页列出，未展开读取 props——**未检**）；可对照的是"内容容器与版本标注分离显示"的拆分方式 |
| assistant-ui | REFERENCE | `Attachment` primitive 只覆盖上传态，不覆盖"已记录版本 vs 当前文件"的读取类别区分；CourtWork 的 `current`/`content-version` 二分在这些来源中**均未见对应实现**（观察，非矛盾） |
| Gatewerk | REVERSE（沿 EX-WK2） | `suggested_value`/`approved_value`/`edited_payload` 三字段分离——与 CourtWork"已记录 ≠ 已接受"的不变量（`inspector.mjs:166-171`）精神一致，字段名不需迁移 |

### 2.8 Trace/Run details（progressive disclosure）

现状：`inspector.mjs:33-291` `renderRun`（状态徽标 `run-badge`、`runLabels` 八态 `inspector.mjs:3-11`、`Run information` 折叠 `inspector.mjs:229-256`、`Activity · N events` 折叠且截断至 100 条 `inspector.mjs:258-291`）。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| agenttrace-ui | REFERENCE | 三层披露："collapsed bar for a glance, expanded timeline for understanding, raw data panel for full verification"——与 CourtWork 当前"状态行 + 折叠 Run information + 折叠 Activity 事件表"的两层结构相近，可迁移的是**第三层"raw data panel"这一分级**（CourtWork 目前折叠 Activity 直接是原始 `JSON.stringify(event.data)`，`inspector.mjs:281-286`，等同于把第二/三层合并，未做时间线可视化中间层）；该来源 5 stars、未发布 npm，**权重低，仅作参照，不作为验收基准** |
| agenttrace-ui | AVOID-COUPLING（部分） | Timeline/Graph 可视化模式依赖 AI SDK v6 `useChat` message parts 与 React；不迁移其实现，也不迁移其"amber/red 风险徽章"配色（与 CourtWork FN-28"状态不只靠颜色"及"只有 conflict 着色"的既有裁定冲突，见 §3 gap） |
| AG-UI | PROTOCOL | `TextMessageStart/Content/End` 与 `ToolCallStart/Args/End/Result` 的起止事件对——协议层的"分段起止"概念，与 CourtWork `thread-projection.mjs` 按事件类型累积同一 `row` 的做法（`tool/start`→`tool/result` 合并一行）同构，不需迁移实现 |

### 2.9 Inbox/Home sets（waiting / in-progress / needs-a-look，j/k）

现状：`home-view.mjs:23-42`（三集合定义与标签，`pendingItems`/`sessionCandidates`/`inspectionCandidates`）；键盘 `app.mjs:5155-5223`（`LIST_KEYS = j/k/o/ArrowDown/ArrowUp/Enter`，**明确不含** `a/e/d/x/1-3`，源码注释直接写明理由："SE has no risk or reversibility field and no batch decision, so a one-key Allow would be an authorisation granted without the payload being read"，`app.mjs:5158-5163`）；契约裁定 `contracts/review-projection.md` §6"inbox 键盘"行同一裁定。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| Suna（沿 EX-WK2） | REFERENCE | 三段分区 `needs_you/waiting/done` 语义为"审阅进度"而非"下一步做什么"，与 CourtWork 三集合语义不同（EX-WK2 §2.3 已定），**只取键盘导航实现**：`j/k`/`Enter`/`o` 完全对应，`a/e/d/x/1-3/?` 批量与搜索键**明确不迁移**（CourtWork 键盘处理函数的注释是这条裁定唯一的、已落地的代码证据） |
| VekInbox（沿 EX-WK2） | REVERSE（幂等字段） | `key`-based idempotency + 唯一索引——CourtWork 目前请求身份靠 `questionScopeKey`/`toolScopeKey` 前端拼接（`app.mjs:421-427`），无数据库层幂等约束，是能力缺口而非矛盾 |

### 2.10 Work surface（floating card ↔ expanded pane、slot）

现状：`surface-modules.mjs:501-531` `surfaceSlots`（`work.surface` 声明：`input: "ReviewProjection"`、`intents: ["open","refresh"]`、`commands: "projection.humanActions"`、`fallback: "read-only-row"`）；`surface-modules.mjs:533-581` `resolveSurfaceSlot`（两个后端事实合并判定挂载：控制面 `uiSlots` 声明 + `/sessions/:id/surface` 扩展注册记录）；`surface-modules.mjs:583-620` `slotStatusLine`；四种缺席态见 `delivery-wk10b-1.md` §3.4 表。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| OpenHands | REFERENCE | Agent Canvas 定位为"self-hosted developer control center"，具体 confirmation/security-analyzer 与前端工作面拼装关系**未展开读取**（**未检**，仅读到 CLI 三种确认模式：`Always ask`/`--always-approve`/`--llm-approve`）；`--always-approve` 与 SE 的 no-always-allow 裁定直接矛盾，**不迁移**（见 §3 gap，作为对照案例） |
| Suna（沿 EX-WK2） | REFERENCE | review-center 的三段式 UI 拼装模式，可对照工作面的"收敛卡/展开面共享一次读取"（CourtWork `resolveSurfaceSlot` 已实现"两处不可能给出不同答案"，`delivery-wk10b-1.md` §3.3） |
| BoardUI | REFERENCE / REVERSE | 定位为"agent work surface / composition"的组件库，但本卷未能读到其具体 slot/composition 状态机文档（`/docs/components` 404，**未检**）；无法给出比"分类占位"更具体的可迁移行为 |
| React-specific（全部） | AVOID-COUPLING | 三者的工作面/画布拼装均以 React 组件树 + context 承载生命周期；CourtWork 的槽位挂载已是显式 mount/update/dispose + 三层守卫（`requestId`/`sessionEpoch`/`generation`），不需要迁移其容器实现 |

### 2.11 Decision receipt

现状：`app.mjs:2381-2408` `decisionReceiptRows`（读 `projection.decisions[]` 落一行 `flowRow`：`file-text` + 候选短 id + `Accepted this version`/`Rejected`/`Evidence requested`，下一行 `version N · state <12位>`，无按钮）；回执源 `app.mjs:3955-3990` `loadWorkReceipts`/`loadWorkThread`；已知契约缺口（无时间字段）见 `delivery-wk10b-2.md` §3.5"契约缺口"段，已请求 Astra（BE-14），未解决。

| 来源 | 分类 | 可迁移行为 |
|---|---|---|
| Gatewerk（沿 EX-WK2） | REVERSE | `audit_log` 表不可变 + 链式签名（`prev_signature`）——是十来源中唯一满足"不可变记录"技术前提的实现（EX-WK2 §4 结论 9）；CourtWork 的 Decision 记录**没有时间字段**，比 Gatewerk 更弱，属已知缺口非新发现 |
| AgentGate | REVERSE | "every request, decision, and action logged" + OWASP 风险标注——可迁移的是"决策不可变"这条原则；风险标注（OWASP LLM Top-10）**不迁移**：SE 无 risk 字段（review-projection §6 已定"SE 无 risk/reversibility 字段，unknown 即不安全"） |
| CopilotKit（沿 EX-WK2） | REFERENCE | `ApprovalResponse {approved, actionId, reference}` 只是内存相等性比对，不落盘——比 CourtWork 当前实现（有 `projection.decisions[]` 落地记录）更弱，仅作反例参照 |

## 3 · CourtWork gap 表

| Primitive | 现状（path:line） | 成熟 primitive 有而 CourtWork 缺 / 矛盾之处 | SE 规则是否禁止 |
|---|---|---|---|
| Approval | `app.mjs:4995-5006`（仅 `allow`/`deny` 两按钮） | assistant-ui `respondToApproval` 的 `"allow-always"` 档；OpenHands `--always-approve`；beUI `Always allow`（EX-WK2） | **禁止**——`contracts/review-projection.md` §6 明文"不采纳"；WK-89 词表未留 always-allow 位置。此处是已裁定的主动不迁移，不是遗漏 |
| Approval | `thread-projection.mjs:132-141` `canAnswer` 单点门控；无服务端版本号 | Gatewerk `expectedVersion` 乐观并发防止过期请求被误批 | 未禁止，是能力缺口；`request_id` 幂等只在 Work packet 决定动作里实现（`delivery-wk10b-2.md` §3.3），permission 卡未见同等版本绑定——**待核实**是否已有等价机制（本卷未在 `renderPermission` 找到 CAS 字段，标记为观察） |
| Approval | 无批量、无 `a/e/d/x` 键（`app.mjs:5158-5163` 注释明文） | Suna `approveAllSafe`（仅动 `isSafeRisk` 的项）；agent-indicator 长按批量 | **禁止**——SE 无 risk/reversibility 字段，`unknown` 即不安全（review-projection §6、WK-4）；已是代码注释里显式记录的裁定，非未决问题 |
| Tool row | `thread-projection.mjs:64-65`（仅 `isError` 布尔 + `phase`） | assistant-ui 区分 `status.reason === "error"` vs `"cancelled"` | 未禁止，是粒度缺口；CourtWork 目前无法从 UI 分辨"工具失败"与"因 run 被取消而未完成"这两种行状态（`Interrupted` 状态词存在于 glyph-semantics §3，但与 tool 层的 error/cancelled 是否一一对应**未核实**——观察，待确认是否已由 `Interrupted` 覆盖） |
| Trace/Run details | `inspector.mjs:258-291`（Activity 折叠直接是原始 JSON，截断 100 条） | agenttrace-ui 的"时间线中间层"（collapsed → timeline → raw data 三层，非两层） | 未禁止，是可选加法；FN-28"状态不只靠颜色"与该来源的 amber/red 风险徽章配色相冲突，**若迁移三层披露，不得带其配色方案** |
| Decision receipt | `app.mjs:2381-2408`；无时间字段（`delivery-wk10b-2.md` §3.5） | Gatewerk `audit_log` 不可变 + 时间戳 + 链式签名 | 未禁止，是后端契约缺口（BE-14 已登记，待 Astra），非前端可独立解决 |
| Work surface | `surface-modules.mjs:533-581` 显式 mount/update/dispose + 三层守卫 | OpenHands `--always-approve`、`--llm-approve` 自动化执行档 | **禁止其自动化前提**——SE 的槽位挂载与执行分离（`commands: "projection.humanActions"` 不是开放命令通道，`delivery-wk10b-1.md` §3.3），不存在"LLM 自行判定后自动执行"的路径；OpenHands 该档与 permission ≠ proposal review ≠ commit 的分离原则相悖 |
| Question | `app.mjs:2757-2765`（自由文本单值输入） | MCP elicitation 的 `requestedSchema`（string/number/boolean/enum 结构化表单） | 未禁止，是能力缺口；MCP 规范同时明文"MUST NOT request sensitive information"，若迁移需一并迁移该安全约束，不能只取表单渲染 |
| Inbox/Home | `app.mjs:5155-5223`（j/k/o/Enter，无 `1-3`/`/`） | Suna 数字键切段 + `/` 搜索 | 未禁止（review-projection §6 已单列"不采纳"该组，属已裁定不迁移，非遗漏） |
| Composer | `app.mjs:5658-5667`（Enter/Shift+Enter/IME 三路短路） | 与 assistant-ui 文档描述的行为契约字面一致 | 不适用——已对齐，无差异 |
| Artifact/File | `inspector.mjs:107-165,319-453`（`current`/`content-version` 二分） | 十来源均未见对应的"当前文件 vs 记录版本"二分实现（观察，非矛盾） | 不适用——CourtWork 此处走在前面，无外部可迁移项 |
| Message | `user-message.mjs:1-42`（copy/edit-as-new） | 与 assistant-ui `ActionBar` 的"消息不可变、编辑产出新草稿"原则一致 | 不适用——已对齐 |

## 4 · 未检项（源不可达 / 版本未 pin）

1. **FlowGate**：未找到任何与"action gate、approval lifecycle"语义匹配的仓库（三次 WebSearch 均指向不同语义的 AgentGate 变体）。WK-93 派单原文将其与 Gatewerk / AgentGate 并列，本卷**未能确认该来源是否存在于公开 GitHub**，需用户或 Fable 提供准确坐标。
2. **AgentGate 命名冲突**：至少 5 个不同项目同名（`selfradiance/agentgate`、`sjh9714/Agent-Gate`、`monteslu/agentgate` 等），本卷选取语义最贴的 `agentkitai/agentgate`，**其余候选未逐一排除**。
3. **Vercel AI Elements** 的 `Tool`/`Confirmation` 组件精确 API 子页均返回 404，只读到 overview；四态取值按 AI SDK 公开类型定义**推断转录**。
4. **BoardUI** 具体组件状态机文档未读到（`/docs/components` 404）。
5. **OpenHands** 前端 review/diff/confirmation 组件源码未展开读取，只读 CLI 模式页。
6. **MCP 规范版本**：读取 `2025-06-18` 版 elicitation 页；`2025-11-25`、`2026-07-28` 版差异**未核实**。
7. **AG-UI** `interrupt`/`resume` 为草案扩展；过期 / 迟到响应处理**未读到**。
8. **agenttrace-ui** 是否等价工单原意的 `agenttrace-react`**未确认**；成熟度证据薄弱。
9. 除 Gatewerk 外，其余来源均只读文档页，未读一手源码验证。
10. CourtWork `renderPermission` 是否已有等价乐观并发 / CAS 机制**未核实**，留待 Opus 审计阶段确认。
