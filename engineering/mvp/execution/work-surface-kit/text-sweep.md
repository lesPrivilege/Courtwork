# 全站文本清退扫描（WK-44 / WK-59 / WK-40）

2026-09-09，Opus，WO-WK10a。范围 = `app/web/index.html` 与 `app/web/*.mjs` 中每一条可见 UI 字符串（含 icon-only 控件的 accessible name）。判准取自 WK-12 / WK-40：**一段文字若不承担定义、条件、后果或对象名，删**；WK-59：**Button 与文本协同时用单词，词组只在必须承载范围或后果时出现**；单词化后 accessible name 仍写完整。

三列：**删** / **单词化** / **保留（承担何种事实）**。本轮已实施的行标 ✅；未实施的行写明原因。

## 1. 删

| # | 字符串 | 位置 | 去掉后失去的判断 | 结果 |
|---|---|---|---|---|
| D-1 | `Inspect`（eyebrow） | `index.html` `#surface-eyebrow` | 无。同一带内的 `Work surface` 标题与 tab 名已陈述这是什么面 | ✅ 删（连同 DOM 节点） |
| D-2 | `Current files, grouped by folder.` | `workspace-view.mjs` `.workspace-description` | 无。上一行标题写 `Workspace files`，下方每组的文件夹名本身就是分组证据 | ✅ 删（含 `.workspace-description` 死样式） |
| D-3 | `Prepare a new draft from this message.` | `index.html` 编辑弹窗 help 首句 | 无。弹窗标题 `Edit as new message` 与草稿输入框同义反复。第二句（原文继续保留）才承担后果 | ✅ 删首句 |
| D-4 | `Add a material below.` | `materials-view.mjs` help 首句 | 无。弹窗标题 `Add text material` 与其下的表单同义反复 | ✅ 删首句，保留承担条件的第二句（改写见 W-7） |
| D-5 | `Recorded files are results of this run.` | `inspector.mjs` Results 段 | 无。该句就在 `Results` 标题之下、run 身份之内 | ✅ 删，与第二句合并为 W-6 |
| D-6 | Run 卡内的 usage `DataList`（Input / Output / Cached / Turns 四行） | 导轨 Run 卡（WK9 画布曾绘） | 无。用量不回答"该做什么 / 发生了什么 / 依据在哪"三问中的任何一问；它是成本细节，属展开面 | ✅ 未实现（消融表 A-4） |
| D-7 | Runtime 卡内按 kind 逐行计数（本地 fixture 下 13 行） | `runtime-view.mjs` `summary()` 草案 | 无。十三个数字回答不了"下一次 Run 装了什么"，只把展开面的清单缩小重画一遍 | ✅ 删，改为 Capabilities / Context 两行（消融表 A-6） |

## 2. 单词化

可见文字缩到一个词，`aria-label` 写完整动作名（IC-2：icon-only 与缩短标签都必须有明确 accessible name）。

| # | 原可见文字 | 新可见文字 | accessible name | 位置 | 结果 |
|---|---|---|---|---|---|
| W-1 | `Retry loading` | `Retry` | `Retry loading this file` | `inspector.mjs` File 视图错误态 | ✅ |
| W-2 | `Retry loading` | `Retry` | `Retry loading your workspace` | `home-view.mjs` | ✅ |
| W-3 | `Retry loading` | `Retry` | `Retry loading session files` | `materials-view.mjs` | ✅ |
| W-4 | `Retry loading workspace` | `Retry` | `Retry loading workspace`（原样） | 导轨 Workspace 面错误态 | ✅ |
| W-5 | `Retry loading sessions` | `Retry` | `Retry loading sessions`（原样） | `app.mjs` 导航项目组 | ✅ |
| W-6 | `Recover run receipt` | `Recover` | `Recover run receipt`（原样） | `app.mjs` composer 反馈行 | ✅ |
| W-7 | `Remove saved key` | `Remove` | `Remove saved key`（原样） | `settings-view.mjs` | ✅ |
| W-8 | `Open run` / `Open file` / `Open workspace` / `Open runtime` | `Open` | 各自原句 | 导轨四张模块卡的尾部动作 | ✅（卡片标题行已写出对象名，所以可见处只需动词） |
| W-9 | `Open workspace preview` | —（icon-only） | `Open work surface` | `#show-surface-button` | ✅ 该按钮现在打开的是整条导轨而非 workspace 一种，原名与实际动作不符（编排体例："同一动作的可见文字、accessible name 与 tooltip 使用同一词"） |
| W-10 | `Restore work surface` | —（icon-only） | `Return to chat` | `#surface-expand-button` 展开态 | ✅ 展开态收起后回到的是对话，画布 r2 用同一措辞 |

## 3. 保留（并注明承担何种事实）

| 字符串 | 承担 | 依据 |
|---|---|---|
| `Allow this write` / `Deny` | **范围与后果**：绑定确切的一次写入，不等于接受成果 | WK-59 明列；IC-1「不用勾/叉承担授权」 |
| `Cancel run` | **后果**：与表单 Cancel、浮层 Close 区分 | ui-composition-standard 文本表 |
| `Send` / `Answer` / `Open` / `Retry` / `Close` / `Cancel` / `Save` | 已是单词 | WK-59 |
| `New project` / `New session` / `Create project` / `Create session` / `Save connection` / `Create binding` / `Add material` | **对象名**：打开创建流程与确认创建是两件事，都必须点名对象 | ui-composition-standard 文本表 |
| `Use as draft` + `Fills the composer. Nothing is sent.` | **后果**：这个动作永不发送 | WK-25 |
| `Discard the draft` | **后果**：丢弃的是哪一份 | RC（见下） |
| `Waiting for you` / `Running` / `Stopping` / `Completed` / `Cancelled` / `Failed` / `Unknown` | **状态事实**，来自 Host，不由前端推断 | 编排体例运行状态行 |
| `Not accepted by a review.`（导轨 Run 卡） | **后果**：已记录的文件不是已接受的成果 | boundaries §5；WK-3 |
| `Recorded files have not been accepted by a review.`（Run 面） | 同上（D-5 合并后的单句） | 同上 |
| `Frozen until this run ends.`（导轨 Runtime 卡） | **后果**：改动不是被拒绝，而是延后到下一次 Run | RC-4 / WK-45 (2) |
| `Current file` / `Recorded version(s)` | **对象身份**：读当前文件与读历史版本是两件事 | IC-1；docs/ui-composition.md `:14` |
| `No files yet. Add material or ask the agent to create a file.` | **条件 + 两条去路**（空态一句） | WK-12 |
| `A place for related sessions and their files.` | **定义**：project 是什么 | WK-12「定义」 |
| `Choose or create a project to send` | **条件**：无项目时不能发送 | WK-12 |
| `Run in progress — your input will not be sent automatically.` | **后果**：输入不会自动发出 | WS-08 |
| `Connection lost. Reconnecting…` | **条件** | — |
| `Files written by the agent also appear here.` | **条件**：这个列表还会长出别的东西 | D-4 改写后 |
| `The original message and its run remain in history.` | **后果** | D-3 改写后 |
| `Backend pending` / `Planned` 行 | **能力边界**：画了但后端未成立 | WK-27 |
| `runtime-view.mjs` 全部文案（`declared, not executed`、`different act from exposing`、`characters, not tokens`、`Token usage is reported by the host.`、`Nothing is admitted into the next run beyond the session's own history.`、precedence 句、四态说明等） | **定义 / 条件 / 后果 / 出处**，逐句在 WO-RC 交付 §2 的中英映射表内被裁定 | WK-50 (1)。**另有一层原因**：`evidence/rc/runtime-ui-checks.mjs` 与 `runtime-ui-counterexamples.mjs` 以原文断言其中多句，改写即改契约检查。本轮不动，若要收敛须与 RC 检查同批改 |
| `Show more` | **分批增加条目**的既有措辞 | docs/ui-composition.md `:11` |
| `Back to latest` | **目的地名**：回到的是最新消息，不是关闭 | IC-1「Back 导航和 Close 关闭不能只共用一个箭头」 |

## 4. 本轮未处理

1. `Load more` 与 `Show more` 在不同表面表达同一动作。`Show more` 是 `docs/ui-composition.md` 已记的措辞；统一到一个词属编排体例的一次裁定，不在本单自决。
2. ~~`runtime-view.mjs` 的长句：可收敛处不少，但与 RC 的契约检查同源，须同批改，留 WO-WK11。~~ **已结清（WO-WK11，2026-09-09）**：`runtime-view.mjs` 与三支 RC 检查在同一批内改。删去的与改写的逐条见 [delivery-wk11 §8](delivery-wk11.md)；被断言引用的原句在 [evidence/wk11/rc](evidence/wk11/rc/) 的副本内同步更新，且每处改动都在脚本注释里写明改的是什么、为什么改的不是断言本身。
3. 窄屏顶带只放侧栏开合按钮，未按画布 §8.3 再放 wordmark。品牌符号只允许出现在侧栏 wordmark 一处（WK-51），在顶带另置一份需要先裁定。


## 5. 后续轮次的增量

同一体例（删 / 单词化 / 保留并注明承重）逐轮追加在该轮交付内，本页只登记入口：

| 轮次 | 增量所在 |
|---|---|
| WO-WK10b 第一段（2026-09-08，Chat Flow 行解剖与工作面缺席态） | [delivery-wk10b-1 §5](delivery-wk10b-1.md)（D-8…D-13、W-11…W-16、17 条新增字符串的承重说明）；语义 → glyph 的对照见 [contracts/glyph-semantics.md](contracts/glyph-semantics.md) |
| WO-WK10b 第二段（2026-09-08，NDA 逐规则 Review、决定与修订、回执、续行、只读历史） | [delivery-wk10b-2 §5](delivery-wk10b-2.md)（D-14…D-16、W-17 / W-18、24 条新增字符串的承重说明）；语义 → glyph 见同上对照表第 3 / 4 节 |
| WO-WK13（2026-09-08，Home 三带、StatTile / WorkCard adapter、列表键盘、绑定面顺序） | [delivery-wk13 §6](delivery-wk13.md)（D-17 / D-18、W-19…W-21、16 条新增字符串的承重说明）；W-19 的集合命名（`In progress` 与 `Continue`）为待裁项 |
| WO-WK12（2026-09-09，Settings 整页、外观自定义、用户 skin、快捷键只读表） | [delivery-wk12 §7](delivery-wk12.md)（D-19 / D-20、W-22、38 条新增字符串的承重说明）；词表新增 Scheme · Skin · Text size · Code font 见 [copy-convention §3](../../../design/copy-convention.md) |
| WO-WK11（2026-09-09，Runtime Workbench、四层、Configurable / Inventory、policy 编辑、WK-87 两条） | [delivery-wk11 §8](delivery-wk11.md)（D-21…D-26、W-23 / W-24、41 条新增字符串的承重说明）；本页 §4 第 2 条（`runtime-view.mjs` 长句与 RC 检查同源）在该单结清 |
| WO-FE-01（2026-09-09，产品词表、Settings IA、chrome、Home / Work composition） | 本页 §6（旧词 · 新词 · 位置三列，D-27…D-30 与 13 条新增字符串的承重说明）；改写后的词表见 [copy-convention §3](../../../design/copy-convention.md)，其余见 [delivery-fe01](delivery-fe01.md) |


## 6. FE-01 词表替换（2026-09-09，WK-89）

前五节是**逐条克制**（删 / 单词化 / 保留）；本节是一次**词表替换**：概念本身换了词，所以三列是 **旧词 · 新词 · 位置**。裁定见 [intake-round-3 WK-89](intake-round-3.md)，改写后的词表在 [copy-convention §3](../../../design/copy-convention.md)。位置一列给的是可见字符串的落点，不是每一处代码引用。

### 6.1 会话对象 → Chat

| 旧词 | 新词 | 位置 |
|---|---|---|
| `New session` | `New chat` | `index.html` 侧栏按钮；`app.mjs` `setAction` accessible name；`index.html` 新建弹窗标题 |
| `New session in <project>` | `New chat in <project>` | `app.mjs` 项目行的新建入口 |
| `Create session` | `Create chat` | `index.html` 新建弹窗主动作 |
| `Session title` | `Chat title` | `index.html` 新建弹窗字段标签 |
| `Untitled session` | `Untitled chat` | `app.mjs` 项目列表项、tooltip、创建默认名 |
| `Find a session` · `Find a project or session` | `Find a chat` · `Find a project or chat` | `index.html` 侧栏过滤框与其 label |
| `Projects and sessions` · `Project sessions` | `Projects and chats` · `Project chats` | `index.html` 侧栏与项目导航的 aria-label |
| `Session overview` | `Chat overview` | `index.html` `#context-popover`；`app.mjs` `show-run-button` |
| `Session files` | `Chat files` | `index.html` `materials-button`；`app.mjs` accessible name |
| `Session`（材料弹窗 eyebrow） | `Chat` | `index.html` `#materials-session-title` |
| `Loading session…` | `Loading chat…` | `app.mjs` 顶带标题占位 |
| `Select a session to chat` | `Select a chat to continue` | `app.mjs` composer placeholder |
| `No session selected` · `Choose a session from the left or create one.` · `Create a project and session from the left.` | `No chat selected` · `Choose a chat from the left or create one.` · `Create a project and a chat from the left.` | `app.mjs` 空态 |
| `Your sessions will appear here.` | `Your chats will appear here.` | `home-view.mjs` 空态条件句 |
| `Loading sessions…` · `No sessions yet.` · `Retry loading sessions` | `Loading chats…` · `No chats yet.` · `Retry loading chats` | `app.mjs` 项目组三态 |
| `Loading session files…` · `Retry loading session files` | `Loading chat files…` · `Retry loading chat files` | `materials-view.mjs` |
| `Open session` | `Open chat` | `presentation-adapters.mjs` 三处缺名回退 |
| `This session` | `This chat` | `settings-view.mjs` Settings 块标题；`workspace-view.mjs` 概览标题 |
| `New sessions` | `New chats` | `settings-view.mjs` General 块标题 |
| `Sessions with recorded activity, …` | `Chats with recorded activity, …` | `presentation-adapters.mjs` Today 第二个 tile 的定义句 |
| `Bind to session` · `Release this session's binding…` · `Extension bound to this session.` · `This session continues the existing work.` | 同句，`session` → `chat` | `app.mjs` 绑定面与其 toast |
| `Session creation is unconfirmed…` · `Session created; …` · `Session creation returned no matching receipt.` | `Creating the chat is unconfirmed…` · `The chat was created; …` · `Creating the chat returned no matching receipt.` | `app.mjs` Home 起始流程的三条回执 |
| `Check session history before retrying.` | `Check this chat’s history before retrying.` | `app.mjs` 两条不确定回执 |
| `Starting your session…` · `Your session is ready. Send to continue in it.` | `Starting your chat…` · `Your chat is ready. Send to continue in it.` | `app.mjs` `#home-start-status` |
| `The session changed before the read completed.` | `The chat changed before the read completed.` | `app.mjs` 只读历史读取 |
| `Choose a session to load its local renderer slot.` | `Choose a chat to load its local renderer slot.` | `app.mjs` 工作面缺席态 |
| `…every run of this session` · `No run has been recorded in this session yet.` · `…beyond the session's own history.` · `A runtime is composed for a session.` · `Session context` | 同句，`session` → `chat` | `runtime-view.mjs`（Skills / Tools / Developer 三组内的用户可见句） |

`Session` 仍出现在 Developer › Runtime 的架构叙述、代码标识符、HTTP 契约与 DOM id 里，按 WK-89 §3.6 保留。

### 6.2 一次动作 → Approval

| 旧词 | 新词 | 位置 |
|---|---|---|
| `Allow this file write?` · `Allow this remote tool call?` · `Allow this tool action?` | `Approve this file write?` · `Approve this remote tool call?` · `Approve this tool action?` | `thread-projection.mjs` `permissionPresentation` |
| `Allow this write` · `Allow this action` | `Approve this write` · `Approve this action` | `app.mjs` `renderPermission` 主动作 |
| `Deny write` · `Deny action` | `Deny this write` · `Deny this action` | 同上，次动作 |
| `Write allowed` · `Action allowed` | `Write approved` · `Action approved` | `app.mjs` 已决行的状态词与已决说明 |
| `Permission recorded for this exact write.` · `Permission denied for this exact write.` · `Permission for this exact write only` | `Approval recorded…` · `Approval denied…` · `Approval for this exact write only` | `app.mjs` 已决行与待决卡 |
| `Questions and write requests will appear here.` | `Questions and approval requests will appear here.` | `home-view.mjs` 空态条件句 |
| `Open questions and write requests, …` | `Open questions and approval requests, …` | `presentation-adapters.mjs` Today 第一个 tile 的定义句 |

### 6.3 文件模式 → File access

| 旧词 | 新词 | 位置 |
|---|---|---|
| `File writes`（标签）+ `Ask` / `Write` / `Read`（单词） | 一个控件，写全 `Ask before editing` ▾ | `index.html` composer 上下文行；`app.mjs` `renderChatHeader` |
| `Ask before writing` · `Workspace writes allowed` · `Read only` | `Ask before editing` · `Allow edits` · `Read only` | `settings-view.mjs` `permissionLabels`（Home 选择器、新建弹窗、Settings 两处、连接卡共用） |
| `permissionWords`（`Ask` / `Write` / `Read` 三个单词的第二套说法） | 取消导出；全部改用整句 | `settings-view.mjs`（导出移除）、`app.mjs`（引用移除） |
| `File writes for new sessions` · `Session file writes` | `File access for new chats` · `File access for this chat` | `settings-view.mjs` 分段控件 accessible name |
| `File writes · this session` | `File access · this chat` | `settings-view.mjs` 连接卡分组标题 |
| `File writes: <sentence>`（toast） | `File access: <sentence>` | `app.mjs` 连接卡改模式后的回执 |
| `Each write asks first. Allowing one write never accepts the result.` | `Each edit asks first. Approving one edit never accepts the result.` | `settings-view.mjs` `permissionHelp` |
| `Connection and file writes` | `Connection and file access` | `index.html` 连接卡 aria-label |

### 6.4 外观

| 旧词 | 新词 | 位置 |
|---|---|---|
| `Scheme` | `Theme` | `settings-view.mjs` Appearance 行标题与分段控件 label |
| `Skin` | `Palette`，并退到 `Advanced` disclosure 内 | `settings-view.mjs` Appearance |
| `Your tokens` | `Custom tokens` | 同上，Palette 的第三档 |

存储键（`scheme` / `skin` / `customSkin`）与 `data-skin` 属性不变：那是实现，不是用户词。

### 6.5 删

| # | 字符串 | 位置 | 去掉后失去的判断 | 结果 |
|---|---|---|---|---|
| D-27 | `Local test`（header capability badge） | `index.html` `#capability-badge` | 无。连接身份在同一屏的 composer 上下文行已说过一次（视觉审查 §7「同一事实一屏只说一次」） | ✅ 删（连同 DOM 节点与 `setCapabilityBadge`） |
| D-28 | 侧栏脚的头像盘与连接名 | `index.html` `#account-avatar` / `#account-name` | 无。这是同一屏的第三遍，且头像盘背后没有一个可打开的身份（WK-39 自陈「it is a label, not a menu」）；一个不指向任何东西的圆盘正是 WK-94 禁的持久装饰物 | ✅ 删 |
| D-29 | `Activity by day` + `Backend pending` | `home-view.mjs` `renderHomeBand` | 无。实现态文案不上 production Home（WK-94 (6)）；能力缺口仍逐条登记在 Settings › Developer › Planned | ✅ 删 |
| D-30 | `Model, provider and environment`（h5） | `runtime-view.mjs` `environmentFacts` | 无。它现在落在 Models 组的 `In force` 块标题之下，两个标题说同一件事 | ✅ 删 |

### 6.6 新增字符串（承重说明）

| 字符串 | 承担什么 | 位置 |
|---|---|---|
| `Today` | Home 下方第一个模块的名字；三个数字属于它 | `home-view.mjs` |
| `Local runtime unavailable` | **对象身份 + 状态**：不可达的是本地 runtime，不是"工作区" | `home-view.mjs` 连接行 |
| `Details`（disclosure） | 后果分级：宿主原话是诊断，不是首屏事实 | 同上 |
| `Ask before editing` ▾ 等三句 | **后果**：这个 Chat 往后对文件能做什么 | `settings-view.mjs` `permissionLabels` |
| `CourtWork does not carry memory between chats. …` | **能力边界**：现在没有跨 Chat 记忆，也没有可复核可删除的东西 | `settings-view.mjs` Memory 组 |
| `Instructions, Skills and references are configured under Skills, …` | **范围**：sources 不是 memory | 同上 |
| `Policy` · `In force` | 两个块标题，分别落在 Permissions 与 Models | `runtime-view.mjs` |
| `Instructions, skills and references` · `Tools, MCP servers and plugins` | 块标题按其所在组的用户词重述，不再用内部意图名 | 同上 |
| `The runtime is the architecture underneath a chat: …` | **定义 + 边界**：Developer › Runtime 说明它不是 Permissions | `index.html` Developer 组 |
| `The same record the Connection above edits, read back from the host. …` | **来源 + 时点**：只读，且描述的是下一次 Run | `runtime-view.mjs` `environmentFacts` |
| `The runtime answered without an effect for this capability, …` | **缺数据 ≠ 空值**（FN-28），替代原先渲染出的裸 `null` | `runtime-view.mjs` `explanationBlock` |
| `Advanced`（Appearance disclosure） | **分级**：换色阶是少数人做的事 | `settings-view.mjs` |
| `Connection · <provider> · <model>`（accessible name） | icon 化后的 composer 连接控件的完整读法 | `app.mjs` `renderChatHeader` |
