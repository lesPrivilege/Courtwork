# 语义 → glyph 契约（WK-71）

2026-09-08，Opus，[WO-WK10b 第一段](../work-orders/WO-WK10b-work-surface.md)。清单取自 [text-sweep](../text-sweep.md)，判据取自 [icon-controls](../../../../design/icon-controls.md) IC-1 / IC-2 / IC-3 与 [copy-convention](../../../../design/copy-convention.md) §2–§4；分层与准入按 [frontend-layering-spec](../../../../design/frontend-layering-spec.md) FN-26 / 27 / 28。

**来源**：Lucide static SVG 1.41.0，固定 `bca7e75a816dcf1e75e8feb5a3198a68cbb8a052`（IC-5）。逐枚静态 vendoring 进 `app/web/vendor/icons.svg`，来源与 hash 见 `app/web/vendor/manifest.json`，许可见 `LICENSES.txt`。**本表不新增任何 glyph**：下列 24 枚全部已在 sprite 内，本轮只登记语义、落点与可访问名，不临时绘制、不引入第二个家族、不做 runtime 扫描。

**三条贯穿规则**

1. **glyph 不承担授权、后果、范围与对象名。** 授权词（Allow this write / Deny / Answer）、状态后果（Not accepted by a review.）、路径、版本、hash 一律保持文字（IC-1「文字优先」行）。glyph 只回答"这是哪一类东西 / 哪一个通用操作"。
2. **可见文字、accessible name、tooltip 同词根。** icon-only 控件的 accessible name 必须是完整动作名；缩短的可见标签（`Open` / `Retry`）不缩短 accessible name（copy-convention §2 末句）。
3. **尺寸与命中区分开。** 行 16 / 控件 18 / 导航 20；命中区 32 桌面 / 44 窄屏与触屏，从 `--control` 来，不从 viewBox 推（IC-1 末段、FN-27）。本轮把尺寸写进 `icon(name, { size })` 的调用处，不再由选择器事后改写。

字段说明：**频率**＝同一屏内可能出现的次数量级（每屏一次 / 每会话若干 / 每行一次）；**裁取**＝ IC-1 档位，`P0 图标` / `P0 图标+文字` / `P1 可图标化` / `保留文字`。

## 1. 壳与导航（位置稳定，每屏一次）

| 语义 | 出现面 | 频率 | 裁取 | glyph | accessible name | tooltip |
|---|---|---|---|---|---|---|
| 关闭一个浮层 / 抽屉 | 导航、工作面、Settings、Files、Run history、连接卡 | 每屏 ≤1 次/浮层 | P0 图标 | `x` | `Close navigation` · `Close work surface` · `Close settings` · `Close files` · `Close run history` · `Close session overview` · `Close connection card` | 同 accessible name |
| 清除筛选输入 | 侧栏会话筛选 | 每屏一次 | P0 图标 | `x` | `Clear filter` | 同 |
| 开合侧栏 | 主区 header | 每屏一次 | P0 图标 | `panel-left` | `Toggle navigation` | 同；`aria-expanded` 表达当前态 |
| 开合工作面 | 主区 header | 每屏一次 | P0 图标 | `panel-right` | `Open work surface` / `Close work surface`（随实际动作变化，IC-1 首行） | 同 |
| 放大工作面 / 回到对话 | 工作面 header | 每屏一次 | P0 图标 | `maximize-2` / `minimize-2` | `Expand work surface` / `Return to chat` | 同；`aria-expanded` 表达当前态。**Back 与 Close 不共用一个箭头**（IC-1） |
| 回到首页 | 侧栏主导航 | 每屏一次 | P0 图标+文字 | `house` | `Home` | 文字即标签，不另设 tooltip |
| 打开设置 | 侧栏页脚 | 每屏一次 | P0 图标 | `settings-2` | `Settings` | 同 |
| 打开运行时资源 | Settings 内的入口行 | 每屏一次 | P0 图标 | `settings-2` | `Open runtime resources` | 同 |
| 改连接 | Settings 连接卡 | 每屏一次 | P0 图标 | `settings-2` | `Change connection` | 同 |
| 连接身份（非按钮） | 侧栏页脚 badge | 每屏一次 | 装饰 | `plug` | 由同一行文字承担；SVG `aria-hidden` | — |
| 会话筛选框的检索标记 | 侧栏 | 每屏一次 | 装饰 | `search` | 由 input 的 label 承担；SVG `aria-hidden` | — |

## 2. 创建与运行控制

| 语义 | 出现面 | 频率 | 裁取 | glyph | accessible name | tooltip |
|---|---|---|---|---|---|---|
| 新建 project | 侧栏 Projects 头、Home 空态 | 每屏 ≤2 次 | P0 图标+文字（Home 空态可见文字，侧栏 icon-only） | `plus` | `New project` | 同。**加号本身不区分 project 与 session**，故两者的 name 必须点名对象（IC-1） |
| 新建 session（全局） | 侧栏主导航 | 每屏一次 | P0 图标+文字 | `square-pen` | `New session` | 文字即标签 |
| 在某 project 内新建 session | 侧栏 project 行（hover / focus-within 显露，保留布局位） | 每 project 一次 | P0 图标 | `plus` | `New session in <project name>` | 同（承担对象名） |
| 发送 | composer 圆槽 | 每屏一次 | P1 可图标化 | `arrow-up` | `Send` | 同 |
| 取消运行 | composer 同一圆槽（运行中替换 Send） | 每屏一次 | P1 可图标化 | `square` | `Cancel run` | 同。**不与关闭浮层混同**：`Cancel run` 是后果词，不缩为 `Cancel`（copy-convention §2、§3） |
| 附件 / 会话文件 | composer 框内 | 每屏一次 | P0 图标 | `paperclip` | `Session files` | 同 |
| 刷新一个已命名的读取 | 工作区、会话文件、Run 详情、Runtime 快照、扩展清单 | 每面 ≤1 次 | P0 图标 | `refresh-cw` | `Refresh workspace` · `Refresh workspace files` · `Refresh session files` · `Refresh run details` · `Refresh the runtime snapshot` · `Refresh extensions`（各自点名刷新对象，IC-1） | 同 |
| 失败后重试同一次读取 | File 视图、Home、会话文件、Workspace 面、Runtime 面、侧栏项目组 | 每错误态一次 | 保留文字（可加图标） | `refresh-cw` + 可见文字 `Retry` | 各自完整句：`Retry loading this file` 等 | 同。**重试读取与另起 Run 后果不同，不合成同一个循环箭头**（IC-1） |
| 复制一段确切字节 | 用户消息、助手回复、hash、arguments hash | 每行一次 | P0 图标 | `copy` | `Copy message` · `Copy response` · `Copy source hash` · `Copy proposed content hash` · `Copy proposed arguments hash` | 同；成功后短反馈 `Copied`，失败 `Copy unavailable`，都不改文件状态 |
| 以此消息新起草稿 | 用户消息页脚 | 每消息一次 | P0 图标 | `square-pen` | `Edit as new message` | 同 |

## 3. Chat Flow 行的类型 glyph（WK-57，本轮新登记）

行解剖＝ **glyph 16 + 标题（对象名）+ 一个元数据词 + 至多一个主动作**。glyph 一律 `aria-hidden`，类型信息同时由标题文字给出，读屏用户不因去掉 glyph 而少一条事实。

| 语义 | 出现面 | 频率 | 裁取 | glyph | 标题（对象名）| 元数据词 |
|---|---|---|---|---|---|---|
| 一组工具动作（Activity 组头） | Chat Flow，每个 Run 一次 | 每 Run 一次 | P0 图标 | `activity` | `N tool actions` | `Completed` / `Working` / `Stopping` / `Waiting for you` / `Interrupted` / `Unknown` / `N failed` |
| 写入类工具调用 | Activity 组内 | 每次调用一行 | P0 图标 | `square-pen` | 工具标识（`ws_write`） | 无（完成）／`Failed` / `Working` / `Stopping` / `Waiting for you` / `Interrupted` / `Unknown` |
| 读取类工具调用 | 同上 | 同上 | P0 图标 | `file-text` | `ws_read` · `se_read_source` | 同上 |
| 列目录类工具调用 | 同上 | 同上 | P0 图标 | `folder` | `ws_list` | 同上 |
| 检索类工具调用 | 同上 | 同上 | P0 图标 | `search` | `ws_grep` | 同上 |
| 运行时装载类工具调用 | 同上 | 同上 | P0 图标 | `settings-2` | `runtime_load` | 同上 |
| 其它 / 未识别工具调用 | 同上 | 同上 | P0 图标 | `activity` | 工具标识原样 | 同上。**不猜家族**：未登记的名字保持中性 glyph |
| 向人提问（未决） | Chat Flow 卡 | 每 Run ≤1 次 | P0 图标 | `message-square` | 问题原文 | 无。未答的输入框与 `Answer` 即状态，Run 状态行已写 `Waiting for you`（本轮消融 C-5） |
| 向人提问（已答 / 已关闭） | Chat Flow 折叠行 | 每 Run ≤1 次 | P0 图标 | `message-square` | 问题原文 | `Answered` / `Closed` |
| 已记录的产出文件 | Chat Flow 行 | 每次写入一行 | P0 图标 + 行尾 `chevron-right` | `file-text` | 文件路径 | `Recorded version`（读取类别，不是审批状态，IC-1） |
| 已决定的文件写入请求（折叠行） | Chat Flow 折叠行 | 每请求一行 | P0 图标 | `square-pen` | 写入目标路径 | `Write allowed` / `Write denied` / `Write closed` |
| 已决定的远程工具调用（折叠行） | 同上 | 同上 | P0 图标 | `plug` | `<server name> · <serverId>` | `Action allowed` / `Action denied` / `Action closed` |
| 已决定的本地工具调用（折叠行） | 同上 | 同上 | P0 图标 | `activity` | 工具标识 | 同上 |
| 展开 / 收起一行（disclosure） | 上列每一个 `<summary>` | 每行一次 | P0 图标 | `::after` 的 `›`（字符，非 sprite；旋转 90°） | 由 `<summary>` 的行内文字承担 | — |
| 已确认的正式决定回执（WO-WK10b 第二段新登记） | Chat Flow，该 Run 之后一行 | 每决定一行 | P0 图标 | `file-text` | 由行内的候选短 id 与决定词承担 | — |

**未决的授权卡不进本表的行解剖**：`Allow this file write?` / `Allow this tool action?` / `Allow this remote tool call?` 及其 `Allow this write` / `Deny write` / `Allow this action` / `Deny action` 保持整卡与整句，路径、字节、hash、来源逐项可见（copy-convention Astra 补充、FN-18）。不用勾、叉或盾牌承担授权（IC-1）。

## 4. 工作面与模块

| 语义 | 出现面 | 频率 | 裁取 | glyph | accessible name | tooltip |
|---|---|---|---|---|---|---|
| Run 模块 | 悬浮卡头 / tab | 每屏 ≤1 次 | P0 图标+文字 | `activity` | 由卡标题 `Run` 承担；SVG `aria-hidden` | — |
| File 模块 | 同上 | 同上 | P0 图标+文字 | `file-text` | 卡标题 `File` | — |
| Workspace 模块 | 同上 | 同上 | P0 图标+文字 | `folder` | 卡标题 `Workspace` | — |
| Runtime 模块 | 同上 | 同上 | P0 图标+文字 | `settings-2` | 卡标题 `Runtime` | — |
| 打开某模块的展开面 | 每张悬浮卡的尾部动作 | 每卡一次 | P0 图标+文字 | 可见文字 `Open` + `chevron-right` | `Open run` / `Open file` / `Open workspace` / `Open runtime` | 同 accessible name |
| 宽度不足时的模块竖条 | 主区右缘 | 每模块一枚 | P0 图标 | 各模块自身 glyph | 模块名（`Run` / `File` / `Workspace` / `Runtime`） | 同 |
| 会话概览 | 主区 header | 每屏一次 | P0 图标 | `activity` | `Session overview` | 同 |
| 打开某个 Run 的详情 | Chat Flow 的 run 状态行 | 每 Run 一次 | P0 图标 | `chevron-right` | `Inspect this run` | 同 |
| 打开一个文件行 | 悬浮卡、工作区面、会话文件 | 每文件一行 | P0 图标 | `file-text` | 由同一行的路径承担 | 完整路径 |
| 进入下一层（列表行） | 侧栏 project 行、Home 行、run history 行 | 每行一次 | P0 图标 | `chevron-right` | 由同一行标题承担 | — |
| 折叠 / 展开 project | 侧栏 | 每 project 一次 | P0 图标 | `chevron-down` / `chevron-right` | project 名 + `aria-expanded` | — |
| 未挂载的贡献工作面（本轮新登记） | 工作面首行、悬浮 Workspace 卡 | 每会话 ≤1 次 | P0 图标 + **保留文字** | `plug` | 由同一行的 producer 名与状态词承担；行本身**不是控件** | — |

### 4.1 领域 Review 的行（WO-WK10b 第二段新登记，**新增 glyph 数 = 0**）

行解剖与第 3 节相同：glyph 16 + 对象名 + 至多一个元数据词。所有 glyph `aria-hidden`；状态词、版本、锚点与授权后果一律保持文字（第 5 节）。

| 语义 | 出现面 | 频率 | 裁取 | glyph | 标题（对象名） | 元数据词 |
|---|---|---|---|---|---|---|
| 一个候选（一份提出的 Review） | 工作面候选卡头 | 每候选一次 | P0 图标 | `file-text` | 候选 id 短形 | packet 的候选状态词（`pending` / `accepted` / `rejected` …） |
| 一条规则的 finding | 候选卡内，一行一规则 | 每规则一行 | P0 图标 | `file-text` | `ruleId` | packet 的状态词原值（`pass` / `deviation` / `missing` / `conflict` / `unknown`）。**只有 `conflict` 可着色**，且词永远在（FN-28）；`unknown` 保持灰：unknown 不是 failed |
| packet 自己记的事实 / 字节（disclosure） | 候选卡内 `Recorded facts`；只读 fallback 的 `Recorded fields` | 每候选 / 每面一次 | P0 图标 | `folder` | `Recorded facts` / `Recorded fields` | — |
| 提出一份修订（disclosure） | 候选控件内 | 每候选 ≤1 次 | P0 图标 | `square-pen` | `Propose a revision` | — |
| 领域工作面首行 | 工作面首行 | 每会话 ≤1 次 | P0 图标 | `plug` | 工作标题 | `Read only`（仅只读时） |
| 已有的工作条目（续行） | `#binding-panel` 的 Continue existing | 每条目一行 | P0 图标 | `plug` | Matter id 短形 | `version N` |

**决定按钮不给 glyph**：`Accept this version` / `Reject` / `Request evidence` 承担范围与后果，勾 / 叉 / 盾牌表达不了「这一版、这一次」（IC-1「文字优先」、FN-18）。`Read the recorded source` 同理保持文字：它是一种**读取类别**（读该候选冻结的那一版），不是刷新，也不是打开当前文件。

## 5. 保留文字、不给 glyph 的语义（IC-1「文字优先」行）

| 语义 | 为什么不能交给 glyph |
|---|---|
| `Allow this write` / `Deny write` / `Allow this action` / `Deny action` | 授权范围与后果；勾/叉/盾牌无法表达"这一次、这个字节" |
| `Answer` | 提交的是人给出的内容，不是一次确认 |
| `Not accepted by a review.` / `Recorded files have not been accepted by a review.` | 后果：已记录 ≠ 已接受 |
| `Frozen until this run ends.` | 后果：延后而非拒绝 |
| `renderer not loaded` / `not installed` / producer 状态词 | 三种不同的下一步；一个"断开"图标会把它们合成一个 |
| `Current file` / `Recorded version(s)` | 两种读取类别；IC-1 明令不得只靠一个文件图标区分 |
| 路径、版本、hash、字节数、错误原文、用量、Run / question 状态 | 对象身份与事实 |
| `Show more` / `Back to latest` / `Retry` | 目的地与后果 |

## 6. sprite 现状与缺口

| 项 | 事实 |
|---|---|
| sprite 内 glyph 数 | 24（`activity` `arrow-down` `arrow-up` `chevron-down` `chevron-right` `copy` `external-link` `file-text` `folder` `house` `maximize-2` `message-square` `minimize-2` `panel-left` `panel-right` `paperclip` `plug` `plus` `refresh-cw` `search` `settings-2` `square-pen` `square` `x`） |
| 本轮新增 | 0。第 3 节与第 4.1 节的类型 glyph 全部取自已准入子集（WO-WK10b 第一段与第二段各新增 0 枚） |
| 已 vendoring 但产品未消费 | `arrow-down`、`external-link`。`arrow-down` 原为 `Back to latest` 预留，该控件当前是纯文字 pill；`external-link` 无外部导航入口。**登记为缺口，不为了用掉它们而造入口**（FN-29：未消费不等于能力） |
| 未登记来源的图形 | 无。`›`（Activity 与行 disclosure 的旋转标记）是字符不是 SVG，沿用既有实现 |
| tooltip 框架 | 沿 `installTooltips`（Floating UI DOM 1.8.0，IC-5）；本轮未新增 tooltip 行为，未新造计时器 |

## 7. 验收与未检

IC-4 五组代表控件（Close/Expand、复制版本、更多菜单、Send/Cancel、Allow/Deny）的本轮结果见 [delivery-wk10b-1](../delivery-wk10b-1.md) §验证。**更多菜单当前不存在**（Chat Flow 行的解剖是"至多一个主动作"，没有溢出菜单），故该组只验证"没有隐藏在菜单里的动作"，不验证菜单键盘行为。

未检：真实触控、真实读屏（VoiceOver / NVDA）对单词标签与 `aria-hidden` glyph 的读法、真实 provider。视口模拟不等于触控实测（WO-WK10b「必须验证」）。


WK-115 ①（2026-09-09）：第六个状态词 `Unknown` —— 只在 Run 终态为 `unknown` 且工具无 result 时出现；`Interrupted` 保留给 Run 终态明确为 cancelled / failed 的情形。FN-28 `unknown ≠ failed`，也 ≠ interrupted。实现由 CC-S 第 0 项落地；BE-33 交付后由后端原因替代推断。
