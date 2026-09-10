# Primitive canon（WK-93 / FE-04）

2026-09-09，Claude Opus，作者验证。基线 `main` `af95bcb`，分支 `claude/fe04-primitives`。
台账：[EX-WK8 primitive ledger](../explore/ex-wk8-primitive-ledger.md)。硬边界：[review-projection §6](review-projection.md)、[glyph-semantics](glyph-semantics.md)、[frontend-layering-spec](../../../../design/frontend-layering-spec.md) FN-18…28、[copy-convention §3](../../../../design/copy-convention.md)。

本页只做三件事：把台账十一行逐条判成**已对齐 / 本单修 / 不采纳 / 待验接口**；给每个 primitive 一张状态矩阵（WK-112 (d)）；记下哪一行台账被哪一次提交消费。实现仍是原生 ES module，无 React、无新依赖。**可创造 implementation，不可创造 ontology**：本单没有新增一个状态词、一枚 glyph、一个后端字段或一个端点；唯一新增的用户可见字符串是 `Sending…`，而它是 review-projection §6 早已写下的那一个词。

---

## 1. 分类的读法

台账沿用五类：**REUSE**（直接取用）· **REVERSE**（读其行为、自己实现）· **REFERENCE**（只作对照）· **PROTOCOL**（协议边界，不是 UI 原语）· **AVOID-COUPLING**（其实现绑定 React / 图节点 / SDK 类型，不迁移）。

CourtWork 侧只可能是 REVERSE / REFERENCE / PROTOCOL / AVOID-COUPLING 四类：十个来源没有一个是可以 import 的框架无关实现，**REUSE 一格为空不是遗漏，是本仓的既定事实**（EX-WK8 §1 十行的「框架耦合」列）。

判据四档：

| 档 | 含义 | 本单动作 |
|---|---|---|
| **已对齐** | 成熟原语的行为契约与现状同构 | 只记入本页，不改代码 |
| **本单修** | 前端可独立完成，且是一条已登记契约的落实缺口 | 改代码 + 断言 |
| **不采纳** | SE 规则明文禁止 | 记「不采纳 + 依据」，并在测试里钉住它不会被"补全"回来 |
| **待验接口** | 需要后端字段或端点 | 记 BE 请求草案，不以本地状态伪造 |

---

## 2. 十一个 primitive 的 canon 映射

### 2.1 Thread

| 项 | 内容 |
|---|---|
| 来源 | assistant-ui `Thread.Root`（`441168d`）· Vercel AI Elements `Conversation`（`6a9d5b1`） |
| 分类 | REVERSE + REFERENCE；React 组件树 AVOID-COUPLING |
| 迁移的行为 | auto-scroll「到底才跟随，上滚即挂起」——`app.mjs:419-423` `isNearBottom`（48 px）、`app.mjs:425-428` `setJumpLatestVisible`、`app.mjs:430-442` `rememberMessageReading`、`app.mjs:633-640` `scrollToLatestMessage`；streaming 由 `row.pending` 承担（`thread-projection.mjs:40`）；空态三分（无会话 / 无消息 / 有 run 无消息，`app.mjs:2437-2475`） |
| 不采纳 | `Thread.Root` 的 ref/context 容器（AVOID-COUPLING）；AI Elements 的自动滚动阈值未公开，不猜数字（EX-WK8 §2.1 未检） |
| 判据 | **已对齐**。跟随/挂起状态机与外部原语同构，且 CourtWork 多一条：`state.messageReading` 按会话记住滚动位置，切回不跳底 |

### 2.2 Composer

| 项 | 内容 |
|---|---|
| 来源 | assistant-ui `Composer.Root/Input/Send`、`Attachment`；AI Elements `PromptInput` |
| 分类 | REVERSE + REFERENCE；`useComposerRuntime` AVOID-COUPLING |
| 迁移的行为 | **keyboard**：Enter 提交、Shift+Enter 换行、IME 合成中不误触发（`app.mjs:5666-5675` 三路短路 `shiftKey` / `isComposing` / `data-composing`）· **send / cancel**：互斥显隐 + `readOnly` 与 `disabled` 分离语义（`app.mjs:3151-3232` `renderComposer`）· **attachment**：`materials-view.mjs:97-104,123-128` 1 MB 上限与 UTF-8 校验，独立于 surface 状态 · **focus**：`guardRegisterIntent` / `guardHandoffFocus`（`submitSessionRun`）、主动作换手时焦点回落输入框（`renderComposer` 的 `focusMovesWithPrimaryAction`）· **draft**：`scheduleDraftSave`、`storeHomeDraft` / `restoreHomeDraft`、`draftRevision` 版本号 |
| **本单修** | **在途请求是第三类事实**。Send 与 Cancel run 此前在请求飞行期间只被 `disabled`，可见文字一字不动，屏幕上没有任何东西说"已送出、未回执"。现在两者共用 `requestLabel()`（`ui-controls.mjs:369-378`）：飞行期间标签为 `Sending…`，回执到达即收回。**Run 的状态词不受影响**——`paintWorkingClock`（`app.mjs:3108-3125`）只读 `run.status`，取消请求在途时它仍写 `Working` / `Waiting for you`，这正是 FE-T06 的另半条 `cancel requested ≠ stopped` |
| 不采纳 | `BranchPicker`（多候选回复切换）：CourtWork 无分支对象，引入它等于引入一个不存在的领域概念 |
| 判据 | keyboard / attachment / draft / focus **已对齐**；send-cancel 的在途段 **本单修** |

### 2.3 Message

| 项 | 内容 |
|---|---|
| 来源 | assistant-ui `ActionBar` / `MessagePartPrimitive`；AI Elements `Message` |
| 分类 | REVERSE + REFERENCE |
| 迁移的行为 | 「消息是不可变输入记录，编辑产出新草稿而不是原地改写」——`user-message.mjs:1-42` 两个 footer action，`app.mjs:4751-4758` `openMessageEditor` → `applyComposerDraft`，没有一条路径回写原消息 |
| 不采纳 | 对齐外部 sanitize 策略：`ui-controls.mjs:177-219` 的 `ALLOWED_TAGS` 白名单 + DOMPurify + 外链 `rel=noopener` 已自成一套，且两个来源都未公开其策略细节（EX-WK8 §2.3 未检），照抄一个未读过的策略是把安全边界交给传闻 |
| 判据 | **已对齐** |

### 2.4 Tool row

| 项 | 内容 |
|---|---|
| 来源 | assistant-ui Tool UI 三态（`running` / `result` / `incomplete{error\|cancelled}`）；AI Elements `Tool` 四态（**推断转录**，EX-WK8 §4 (3)）；Agent Elements `EditTool` |
| 分类 | REVERSE + REFERENCE；`mapToolStateToStepState` / `useToolArgsStatus` AVOID-COUPLING |
| 台账提出的粒度缺口 | 「CourtWork 只有 `isError` 布尔，未见 error 与 cancelled 两个不同状态词；`Interrupted` 是否覆盖**未核实**」 |
| **审计结论（核实完毕）** | **已对齐，缺口不成立。** 两个词由两个不同的事实给出，不共用一个布尔：`Failed` 只在 `row.isError`（`thread-projection.mjs:64`，来自 `tool.result` 的 `isError`）；`Interrupted` 只在「没有 result（`row.phase !== "result"`）且该 Run 已离开活动态」（`app.mjs:2560-2581`）。两者互斥且各有来源，正对应 assistant-ui 的 `status.reason === "error"` 与 `"cancelled"`。运行证据见 evidence/fe04 `primitive-checks` 第 7 条与本单单测。 |
| **待裁定（不是缺口，是词表边界）** | 当 Run 的终态是 `unknown`（或该 Run 已不在读取范围内）时，未完成的 tool 行仍写 `Interrupted`——那是一个关于"怎么结束的"的正面断言，而我们并不知道（FN-28 `unknown ≠ failed ≠ success`）。诚实的写法需要 glyph-semantics §3 的 tool 行元数据列新增一个词（例如 `Unknown`）。**glyph-semantics 不在本单写权内，且新增状态词是 ontology 而不是 implementation**，因此本单不改，列入待裁定 |
| 不采纳 | agenttrace-ui 的 amber / red 风险徽章配色（与 FN-28「状态不只靠颜色」及"只有 conflict 着色"冲突）；整行变红（WK-47 消融 C-1 已删） |

### 2.5 Approval

| 项 | 内容 |
|---|---|
| 来源 | assistant-ui `respondToApproval`；CopilotKit `verdict`；Gatewerk `expectedVersion`；AgentGate 四态；MCP `elicitation/create`（PROTOCOL）；AG-UI `interrupt`/`resume`（PROTOCOL） |
| 分类 | REVERSE + REFERENCE + PROTOCOL；`useHumanInTheLoop` AVOID-COUPLING |
| 迁移的行为 | 三态信号与暂停-恢复模式（对照 `thread-projection.mjs:132-141` `canAnswer` 单点门控）；身份绑定 questionId + toolCallId + path + bytes + sha256 + preview（`thread-projection.mjs:142-153` `validPermission`） |
| **不采纳（禁止）** | ① **`allow-always` / `Always allow` / `--always-approve`**——review-projection §6 明文"不出现在卡上；策略级放行属 runtime 控制面"；WK-89 词表无此位。② **批量与风险分档**（Suna `approveAllSafe`、agent-indicator 长按）——SE 无 risk / reversibility 字段，`unknown` 即不安全（WK-4）。③ **AgentGate 的多渠道委托与 OWASP 风险标注**——SE 的 approval 是应用内一次写授权，没有跨渠道委托这个对象。④ **agent-approval-card 的 edit-then-approve**——SE 授权不可改参数。以上四条在 `app/tests/primitive-reconciliation.test.mjs` 里各有一条钉子 |
| **本单修** | review-projection §6 那一行「pending → submitting：按钮禁用、文字 `"Sending…"`、不换图标」此前只落实了半条：`aria-disabled` 关掉了按钮，可见文字仍是 `Approve this write` / `Deny this write`。现在按下的那个换成 `Sending…`，另一个保留自己的词并一同关掉——**在途的是哪一个决定也是事实**。在途记号按 decision 登记（`${questionKey}:${decision}`，用的仍是已有的 `state.questionSubmitting` 这一个 Set，没有新状态容器），回执到达时一并撤掉（`app.mjs:895-902`）。同时对齐问题卡早已有的一条：**重试前撤掉上一次的失败**，否则一条 `role="alert"` 与一个 `Sending…` 同时在场会把"刚刚失败了"读成"这一次失败了" |
| **待验接口** | **BE-24 · 乐观并发**。台账 §4 (10) 要求核实 `renderPermission` 是否已有等价 CAS 机制：**没有**。决定的请求体只有 `{ decision }`（`app.mjs:5115-5118`），不回送 `contentSha256` / `toolCallId`；`state.questionSubmitted` 只是前端本地幂等 Set。若同一 questionId 的载荷在人读完与人点下之间被替换，前端无从发现。**不以本地状态伪造版本号**——前端造一个 expectedVersion 只会制造第二个真源。草案见 delivery-fe04 §9 |

### 2.6 Question

| 项 | 内容 |
|---|---|
| 来源 | MCP elicitation `requestedSchema`（PROTOCOL）；assistant-ui `interrupt.payload`（REFERENCE） |
| 分类 | PROTOCOL + REFERENCE |
| 现状 | `app.mjs:2644-2861`；`canAnswer` 单点门控；提交后 `Answer sent; waiting for confirmation.` |
| **本单修** | 提交失败此前只是一段静默的 `<p class="question-error">`；同一族的授权卡用的是 `role="alert"`。同一件事不该只对看得见的人说：读屏用户按下 Answer 之后不会知道它没有被接受（FN-28「loading / error 可辨」）。现在两卡一致 |
| **待验接口** | **BE-25 · 结构化 schema**。今日是自由文本单值输入（`app.mjs:2763`）。MCP 的 `requestedSchema` 限定为扁平对象 + 原始类型，是可安全渲染为表单的约束；**但它与规范同一页的另一句是一个整体**——"Servers MUST NOT use elicitation to request sensitive information"。只取表单渲染而不取该约束，等于用一个更好看的控件去收本不该收的东西。因此前端不先画表单：待后端在 `question/open` 上带出受限 schema 并在服务端复验该约束 |
| 不采纳 | 把 Question 与 Approval 合成一个 Approve（四个来源都这么做，review-projection §6「分离原则」不迁移）：answer 是自然语言，不授权 |

### 2.7 Artifact / File

| 项 | 内容 |
|---|---|
| 来源 | AI Elements `Artifact` / `Code Block` / `File Tree`（overview 级，**未检**）；assistant-ui `Attachment`；Gatewerk 三字段分离 |
| 分类 | REFERENCE + REVERSE |
| 现状 | `inspector.mjs:107-165` artifact 行、`inspector.mjs:319-453` `createFileView`、`inspector.mjs:303-317` `validateFilePayload`（强制 runId / sha256 匹配）；`current` 与 `content-version` 两个读取类别；`Recorded files have not been accepted by a review.`（`inspector.mjs:166-171`） |
| 判据 | **已对齐，且无外部可迁移项**。十来源均未见"当前文件 vs 记录版本"这条二分（EX-WK8 §2.7 观察）。Gatewerk 的 `suggested/approved/edited` 三字段与"已记录 ≠ 已接受"精神一致，字段名不需要迁移 |
| 不采纳 | 把 `Recorded version` 显示成审批状态（IC-1：那是读取类别，不是审批） |

### 2.8 Trace / Run details

| 项 | 内容 |
|---|---|
| 来源 | agenttrace-ui 三层披露（`02b7a85`，5 stars / 0 forks / 未发 npm，**台账明文「权重低，仅作参照，不作为验收基准」**）；AG-UI 起止事件对（PROTOCOL） |
| 分类 | REFERENCE + PROTOCOL；Timeline / Graph 可视化 AVOID-COUPLING |
| 现状 | `inspector.mjs:229-291`：折叠 `Run information` + 折叠 `Activity · N events`，组内每一条是 `<details>`（`#seq` + 事件类型的 `<summary>`，原始 JSON 的 `<pre>`），截断至最近 100 条 |
| **判据：考虑后不做，理由记在案** | 结构上已经是三段（收敛条 → 事件列表 → 原始数据），台账说的"缺中间层"实指**中间层没有把事件读成人话，也没有时间**。这一层若要诚实地存在，需要两样东西：(a) 每条事件的时间——`app/server/store.mjs:214-221` 的 `appendEventToState` 只写 `seq`，**没有任何时间字段**（待验接口 BE-26）；(b) 二十来个事件类型各自的用户可见句子——那是二十条新 ontology，来源是一个 5 stars 的早期项目，而台账已判它不作验收基准。**在没有时间的前提下造一条"时间线"，是用排版冒充一个不存在的事实**（FN-28）。因此本单不加中间层，只把它记成一条有前置条件的加法 |
| 不采纳 | 该来源的 amber / red 风险徽章配色（台账 §3 已判与 FN-28 冲突） |

### 2.9 Inbox / Home sets

| 项 | 内容 |
|---|---|
| 来源 | Suna 三段分区与键盘；VekInbox key 幂等 |
| 分类 | REFERENCE + REVERSE |
| 现状 | `home-view.mjs:23-42` 三集合；`app.mjs:5281,5316-5350` `LIST_KEYS = j/k/o/ArrowDown/ArrowUp/Enter`；`data-nav-item` 由 Home 行 / 卡与未决卡共用，两处读同一条列表键盘（`home-view.mjs:173,223-224,254,284`、`app.mjs:2699,5040`） |
| **不采纳（禁止）** | `a` / `e` / `d` / `x` 与任何批量键（一键 Allow 等于在没读载荷的情况下给出授权，FN-18）；`1-3` 数字键切段与 `/` 搜索（review-projection §6 已单列不采纳）。源码注释是这条裁定唯一已落地的证据（`app.mjs:5268-5280`），本单为它加了一条测试钉子 |
| 键盘审计（WAI-ARIA 对照） | 处理器让位文本录入（`TEXT_ENTRY`）、让位 IME（`isComposing` / `keyCode 229`）、让位修饰键组合、让位对话框与浮层、方向键只在列表已持焦点时接管——与 APG 的"不夺走文本输入"一致。**未做**：`Home` / `End` 跳首尾，以及给列表容器一个显式 role。前者是 APG 列表模式的 SHOULD，后者会把 Home 下带与 Chat Flow 的两段内容合并进同一个语义容器——**那是一次 ontology 判断**（这两处是不是一个 list？），不是实现细节，列入待裁定 |

### 2.10 Work surface

| 项 | 内容 |
|---|---|
| 来源 | OpenHands（CLI 三档确认）；Suna review-center；BoardUI（状态机文档 404，**未检**） |
| 分类 | REFERENCE；三者的 React 容器 AVOID-COUPLING |
| 现状 | `surface-modules.mjs:501-531` `surfaceSlots`、`533-581` `resolveSurfaceSlot`（两个后端事实合并判定挂载）、`583-620` `slotStatusLine`；显式 mount / update / dispose + 三层守卫（`requestId` / `sessionEpoch` / `generation`） |
| **不采纳（禁止）** | OpenHands 的 `--always-approve` 与 `--llm-approve`：槽位挂载与执行分离，`commands: "projection.humanActions"` 不是开放命令通道；不存在"LLM 自行判定后自动执行"的路径 |
| 判据 | **已对齐**。FE-T07 复跑（evidence/fe04 `fe-t07.json`）：迟到的 `/surface` 回包不覆盖屏幕上的会话；展开收起不重发命令、不丢草稿；关闭再打开每个来源至多读一次 |
| **待裁定** | 「展开」这一步会把 preview 面重读一次（`app.mjs:3307-3321` `setSurfaceExpanded` → `loadSurfaceKind` → `loadSurface`）。三次点击里有两次是"收起 → 展开"，所以实测 `/surface` 两次。FN-23 禁的是**重发命令 / 取消 Run / 丢草稿 / 换读取版本**，一次读取不在其列（命令数实测 0）；wk10b-1 当年数到 0 是起点已是展开态所致。「展开是否应当复用上一次读取」是一次缓存裁定，不在本单 |

### 2.11 Decision receipt

| 项 | 内容 |
|---|---|
| 来源 | Gatewerk `audit_log`（不可变 + 链式签名）；AgentGate「决策不可变」；CopilotKit `ApprovalResponse`（更弱，反例参照） |
| 分类 | REVERSE + REFERENCE |
| 现状 | `app.mjs:2382-2409` `decisionReceiptRows`：一行 `flowRow`（`file-text` + 候选短 id + 决定词）+ 一行 `version N · state <12位>`，无按钮 |
| **待验接口** | 无时间字段。**已登记为 BE-14**（delivery-wk10b-2 §3.5），本单不另开编号、不重复请求 |
| 不采纳 | 链式签名 / resolvedBy 防伪（待 Core 契约）；OWASP 风险标注（SE 无 risk 字段） |

---

## 3. 状态矩阵（WK-112 (d)）

每格是 `file:line`，或 `not_applicable` 加一句理由。列：normal · hover · selected · loading · empty · error · disabled · dense · narrow · long-content。
**不新建 gallery 模块**（需 allowlist，WK-112 (d) 已列为候选 CC-G 待裁）；矩阵由源码与本单的运行断言支撑。
`narrow` 一律指 `@media (max-width: 1023px)` / `767px` 两档与 390 视口实测；`dense` 指同一原语在列表 / 组内的紧凑形态。

### 3.1 Thread

| 状态 | 落点 |
|---|---|
| normal | `styles.css:888` `.message-stream`（`--column` 定宽）· `app.mjs:2483` `.message-list` |
| hover | `not_applicable`：Thread 是容器，不是命中目标；悬停语义属于它里面的行 |
| selected | `not_applicable`：一次只显示一条 Thread，没有"选中哪一条"这件事 |
| loading | `app.mjs:2468-2475`「Run has no messages yet / The next event will appear here.」——有活动 Run 而无内容，与"空"分开 |
| empty | `app.mjs:2440-2453`（无会话）· `app.mjs:2462-2481`（有会话无消息）· `styles.css:991` `.empty-state` |
| error | `app.mjs:2907-2919` `run-status` 卡 · `thread-projection.mjs:90-96` `run/error` 行 · `styles.css:1087` `.message.error` |
| disabled | `not_applicable`：容器不接受输入 |
| dense | `styles.css:895-901` `.message-list` 间距；`styles.css:2368` `.activity-group` 把每 Run 的工具行收进一组 |
| narrow | `styles.css:898` `max-width: var(--column)` + `styles.css:2115` 窄屏段；390 实测横向溢出 0（`composition-checks.json`） |
| long-content | `styles.css:1083` `.message-body { overflow-wrap: anywhere }`；代码块与表格各自包一层可滚容器（`ui-controls.mjs:177-219`） |

### 3.2 Composer

| 状态 | 落点 |
|---|---|
| normal | `styles.css:1284-1300` `.composer-area` / `.composer-form`；`app.mjs:3117` `renderComposer` |
| hover | `styles.css:455-456,474,487` 三类按钮的 hover |
| selected | `styles.css:1301` `.composer-form:focus-within`（"选中"在这里就是焦点落在框内） |
| loading | **`app.mjs:3166-3169,3185-3189`（本单新增）** `Sending…`；`app.mjs:3184` `textarea.readOnly` 保住焦点与内容；`app.mjs:3096-3118` 运行中的 hint 与 `startWorkingClock` |
| empty | `app.mjs:3217` `placeholder`（Home / Work / 无会话三句各一）；`app.mjs:3170` 空草稿时 Send 关闭 |
| error | `app.mjs:647-700` `ERROR_COPY` 表 + `setPersistentFeedback`；不确定回执有独立句子，不与失败混同（FN-19） |
| disabled | `app.mjs:3183` `textarea.disabled = !session`；`app.mjs:3190-3196` Send 的五个关闭条件；`app.mjs:3202` Cancel 的两个 |
| dense | `styles.css:1317-1330` `.composer-controls` 单层；Work variant 空态两行内容、随字号扩展、增长到 180 后滚动（WK-97；初始高按合流节点 2026-09-11 裁定改为两行内容，取代 80–96） |
| narrow | `styles.css:1334` `max-width: 170px`（model chip）；`styles.css:2115` 窄屏段；390 实测溢出 0 |
| long-content | `textarea` 自身滚动；草稿按 `draftRevision` 版本化保存（`app.mjs:1212`），长草稿不因重渲染丢失 |

### 3.3 Message

| 状态 | 落点 |
|---|---|
| normal | `styles.css:1014` `.message` · `styles.css:1030` `.message.user` · `styles.css:1109` `.message.assistant` |
| hover | `styles.css:455` footer action 的 hover（`Copy message` / `Edit as new message`） |
| selected | `not_applicable`：消息不是可选对象；没有多选、没有分支切换 |
| loading | `app.mjs:2521` `.message.pending`（`row.pending`，来自 `assistant/delta`） |
| empty | `app.mjs:2519` 空文本的助手消息**整条不渲染**——空字符串不是一条消息 |
| error | `not_applicable`：消息本身不失败；Run 的失败是 `run/error` 的独立行（§3.1 error 格） |
| disabled | `not_applicable` |
| dense | `styles.css:1017` `.message-header` 单行；`styles.css:1033` `max-width: 82%` |
| narrow | `styles.css:2115` 窄屏段；390 实测溢出 0 |
| long-content | `styles.css:1083` `overflow-wrap: anywhere`；markdown 的代码块与表格各自可滚（`ui-controls.mjs:177-219`） |

### 3.4 Tool row

| 状态 | 落点 |
|---|---|
| normal | `app.mjs:2583-2591` `flowRow("summary")` · `styles.css:1178-1188` `.tool-card` |
| hover | `styles.css:1184` `.tool-card summary`（disclosure 的命中区；`styles.css:2665-2672` 尾部 glyph 的 hover） |
| selected | `not_applicable`：工具行不是可选对象；展开与选中是两件事（`details.open`） |
| loading | `app.mjs:2571-2581` `Working` / `Stopping` / `Waiting for you`；`styles.css:3038-3050` `.activity-group.is-working` 的 shimmer，`styles.css:3059` reduced-motion 静态 |
| empty | `not_applicable`：没有调用就没有行；`Activity` 组只在有第一行时才建（`app.mjs:2602-2630`） |
| error | `app.mjs:2571` `Failed` + `styles.css:1146-1147` 只有状态词着色（整卡红已由 WK-47 消融 C-1 删除）；组头 `N failed`（`app.mjs:2631-2645`） |
| disabled | `not_applicable`：行上没有动作控件（IC-1：glyph 不承担授权） |
| dense | `styles.css:2368-2376` `.activity-group > .tool-card`：组内每行 16 glyph + 标题 + ≤1 元数据 |
| narrow | `styles.css:1173` `@media (max-width: 1023px)` 的行段；390 实测行高 ≥ 44（wk10b-1 几何断言，本单未重量） |
| long-content | `styles.css:1187,1194-1199` `.tool-detail` / `.diagnostic-text` `overflow-wrap: anywhere` + `max-width: 100%` |

### 3.5 Approval

| 状态 | 落点 |
|---|---|
| normal | `app.mjs:5038-5069` 卡体 · `styles.css:1204` `.question-card` / `.permission-card` |
| hover | `styles.css:474,487` primary / secondary 两个决定按钮 |
| selected | `app.mjs:5040` `tabindex="-1"` + `data-nav-item`：列表键盘的一站；`styles.css:416` `:focus-visible` |
| loading | **`app.mjs:5098-5102`（本单新增）** 按下的那个换 `Sending…`，另一个保留自己的词；两个都 `aria-disabled="true"`（`app.mjs:5104-5105`） |
| empty | `not_applicable`：没有请求就没有卡；载荷不完整时不画按钮而画一句话（`app.mjs:5070,5072-5085` + `validPermission`） |
| error | `app.mjs:5138-5146` `role="alert"` 的 `.inline-error`；**本单新增**重试前先撤掉它（`app.mjs:5117`） |
| disabled | `app.mjs:5070` `allowed = validPermission(payload) && canAnswer(row, run)`：非 pending / 断连 / 载荷不合法时**不渲染按钮**，而不是渲染一个灰按钮 |
| dense | `app.mjs:4996-5034` 已决定的形态收成一条折叠行（`Write approved` / `Action denied` …），不占卡的面积 |
| narrow | `styles.css:2115` 窄屏段；`styles.css:1225-1233` `.permission-preview` 可滚 |
| long-content | `styles.css:1233,1247-1256` `overflow-wrap: anywhere`；preview 由服务端截到 400 字（review-projection §1） |

### 3.6 Question

| 状态 | 落点 |
|---|---|
| normal | `app.mjs:2686-2750` 卡体 · `styles.css:1204-1223` |
| hover | `styles.css:487` Answer 按钮 |
| selected | `app.mjs:2699` `tabindex="-1"` + `data-nav-item`；`app.mjs:2740` 输入框 `tabindex 0` |
| loading | `app.mjs:2784-2795` `input.readOnly = submitting` + 按钮 `requestLabel("Answer", submitting)`；提交后 `app.mjs:2741`「Answer sent; waiting for confirmation.」 |
| empty | `app.mjs:2763` `required` 的输入 + `reportValidity()`：空答案不发请求 |
| error | **`app.mjs:2796-2809`（本单修）** `.question-error` 加 `role="alert"` |
| disabled | `thread-projection.mjs:132-141` `canAnswer` 单点门控：不可答时整张卡换成折叠的历史行（`app.mjs:2657-2682`），没有灰控件 |
| dense | `app.mjs:2666-2681` 历史行是一条 `flowRow`（问题原文 + `Answered` / `Closed`） |
| narrow | `styles.css:1212-1223` `.question-card form` 换行；390 实测溢出 0 |
| long-content | `styles.css:1233` `overflow-wrap: anywhere`；问题原文作标题不截断 |

### 3.7 Artifact / File

| 状态 | 落点 |
|---|---|
| normal | `inspector.mjs:120-165` `.artifact-row` · `styles.css:1499-1527` |
| hover | `styles.css:2665-2672` `.artifact-open:hover` 的尾部 glyph |
| selected | `not_applicable`：打开一个文件是导航，不是选中；没有多选 |
| loading | `inspector.mjs:99-107`：运行中写「Recorded files will appear here as this run writes them.」，终态写「No files were recorded for this run.」——**两句不同**，正是 FN-28 的 loading ≠ empty |
| empty | 同上第二句 |
| error | `inspector.mjs:303-317` `validateFilePayload`：runId / sha256 不匹配即拒绝渲染，不显示一个"大概是它"的文件 |
| disabled | `not_applicable` |
| dense | `styles.css:1509` `.artifact-meta` 一行放 `Recorded version · N KB` 与 `Current file` |
| narrow | `styles.css:2285` 窄屏下 `.artifact-thread-row > .flow-meta` 让位 |
| long-content | `styles.css:1247` `.file-name { overflow-wrap: anywhere }`；`styles.css:1526,1541` 数据表同 |

### 3.8 Trace / Run details

| 状态 | 落点 |
|---|---|
| normal | `inspector.mjs:229-291` 两个 `.inspector-section` · `styles.css:1487-1497` |
| hover | `styles.css:1495` `.inspector-section summary` · `styles.css:1566` `.event-row summary` |
| selected | `inspector.mjs:36-40`：重绘时按 `data-section` 记住哪些段是展开的——展开态是这里唯一的"被选中" |
| loading | `inspector.mjs:3-11` `runLabels` 八态里的 `Starting` / `Running` / `Stopping` / `Waiting for you`；`styles.css:861-862` `.run-badge.running` |
| empty | `inspector.mjs:258` `Activity · 0 events` 如实写 0（`records.length` 直出，不隐藏该段） |
| error | `styles.css:865-866` `.run-badge.failed` / `.unknown` **两个不同的类**，不合并（FN-28） |
| disabled | `not_applicable`：整段只读 |
| dense | `inspector.mjs:262-268` 超过 100 条时写明「Showing the latest 100 of N」，不静默截断 |
| narrow | `styles.css:2299` 窄屏 `.surface-content`；RC 视口 36/36 覆盖三组视口 |
| long-content | `styles.css:1569,1588` `overflow-wrap: anywhere`；原始 JSON 在 `.diagnostic-text` 里 |

### 3.9 Inbox / Home sets

| 状态 | 落点 |
|---|---|
| normal | `home-view.mjs:165-193` `workRow` · `styles.css:939-947` `.home-row` |
| hover | `styles.css:948` `.home-row:hover` · `styles.css:951` `:active` |
| selected | `home-view.mjs:173,223-224` `data-nav-item` + `styles.css:416` `:focus-visible`；列表键盘把焦点当选中（`app.mjs:5316-5350`） |
| loading | `home-view.mjs:397`「Loading your workspace…」 |
| empty | `home-view.mjs:314,322,331` 三个集合各自的空句；FE-T01 断言「没有」不说成「出错」（`fe-t01-empty.json`） |
| error | `home-view.mjs:391` 失败句 + Retry；tile 保留最后确认值而不塌成 0（`fe-t01-rows.json`） |
| disabled | `not_applicable`：行本身是导航；不可用的目标不进集合 |
| dense | `home-view.mjs:165` row 是常态，`home-view.mjs:197` card 只给可打开的 Work（WK-94 下带中） |
| narrow | `styles.css:2115,2177` 两档；390 实测溢出 0 |
| long-content | `styles.css:965-972` 标题与元数据各自成行；`styles.css:528` `overflow-wrap: anywhere` |

### 3.10 Work surface

| 状态 | 落点 |
|---|---|
| normal | `styles.css:1387` `.surface-panel` · `styles.css:1459` `.surface-content` |
| hover | `styles.css:455` 面上的 quiet-button |
| selected | `app.mjs:3307-3321` `setSurfaceExpanded`：悬浮卡 ↔ 展开面是同一对象的两个显示变体（FN-22），`app-shell.surface-expanded` |
| loading | `surface-modules.mjs:583-620` `slotStatusLine` |
| empty | `surface-modules.mjs:533-581` 四种缺席各有各的句子：`renderer-absent` / `producer-unloaded` / schema 不可解码 / 未声明——三者互不冒充（FE-T08） |
| error | 同上；`fallback: "read-only-row"` |
| disabled | `readOnly: true` + `humanActions: []` 时**不渲染控件**，而不是渲染灰控件 |
| dense | 悬浮卡形态即密态 |
| narrow | `styles.css:2138-2139,2179-2180` 两档 overlay；`styles.css:2747-2749` `[inert]` |
| long-content | `styles.css:1615` `overflow-wrap: anywhere`；面内独立滚动 |

### 3.11 Decision receipt

| 状态 | 落点 |
|---|---|
| normal | `app.mjs:2382-2409` `decisionReceiptRows` |
| hover | `not_applicable`：无按钮、无命中目标——回执是一条只读记录 |
| selected | `not_applicable`：同上 |
| loading | `not_applicable`：回执只在已确认的决定之后出现；在途的那一段由授权卡的 `Sending…` 承担（§3.5 loading 格），两者是不同的对象 |
| empty | `not_applicable`：没有决定就没有行（不画"暂无决定"） |
| error | `not_applicable`：回执读的是已落地的 `projection.decisions[]`；读取失败属工作面（§3.10 error 格） |
| disabled | `not_applicable` |
| dense | 两行定长：决定词一行，`version N · state <12位>` 一行 |
| narrow | `styles.css:1122-1147` `.flow-row` 行解剖在两档下不变 |
| long-content | `not_applicable`：字段是短 id、版本号与 12 位 state，没有可变长内容 |
| **待裁定** | 缺时间字段（BE-14，已登记） |

---

## 4. 消费台账（哪一行台账被哪一次提交消费）

| 台账位置 | 结论 | 提交 |
|---|---|---|
| §2.1 Thread（assistant-ui / AI Elements） | 已对齐，只记入本页 | `docs` 提交（本页 §2.1） |
| §2.2 Composer 行为契约（keyboard / IME / attachment / draft / focus） | 已对齐 | 本页 §2.2 |
| §2.2 Composer send / cancel 互斥 | **本单修**：在途段 | `web` 提交（`ui-controls.mjs` `requestLabel`、`app.mjs` `renderComposer`） |
| §2.3 Message 不可变 + edit-as-new | 已对齐 | 本页 §2.3 |
| §2.4 Tool row「error vs cancelled **待核实**」 | **核实完毕：已对齐**，两词两来源 | `web` 提交的单测 `Failed 与 Interrupted 由两个不同的事实给出` |
| §2.4 同行的 `unknown` 终态 | **待裁定**（需 glyph-semantics 新增词，越权） | 本页 §2.4 + delivery §11 |
| §2.5 / §3 第 1 行 `allow-always` | **不采纳**（review-projection §6） | `web` 提交的单测 `授权卡上不存在 always-allow 这一档` |
| §2.5 / §3 第 3 行 批量与 `a/e/d/x` | **不采纳**（WK-4，无 risk 字段） | `web` 提交的单测 `inbox 键盘没有批量键与数字键` |
| §2.5 submitting 过渡（review-projection §6） | **本单修** | `web` 提交（`renderPermission`） |
| §3 第 2 行 / §4 (10) Approval 乐观并发 | **核实完毕：无等价机制** → 待验接口 | delivery §9 BE-24 草案 |
| §2.6 / §3 Question 结构化 schema | 待验接口（且必须连同 MCP 的安全约束一起） | delivery §9 BE-25 草案 |
| §2.6 Question 提交失败无播报 | **本单修**（审计新发现，非台账行） | `web` 提交（`role="alert"`） |
| §2.7 Artifact `current` / `content-version` | 不适用（走在来源前面） | 本页 §2.7 |
| §2.8 / §3 Trace 三层披露 | **考虑后不做**，前置条件是事件时间 | 本页 §2.8 + delivery §9 BE-26 草案 |
| §2.9 Inbox 键盘 | 已对齐；Home/End 与容器 role 列待裁定 | 本页 §2.9 |
| §2.10 Work surface 自动执行档 | **不采纳**（禁止其自动化前提） | 本页 §2.10；FE-T07 复跑 |
| §2.11 / §3 Decision receipt 时间 | 待验接口，**沿用 BE-14 不另开号** | 本页 §2.11 |
| §4 (1)(2)(8) FlowGate / AgentGate 同名 / agenttrace-react 坐标 | 未解决，非前端可解 | delivery §10 未检项 |
