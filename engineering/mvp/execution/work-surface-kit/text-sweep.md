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
2. `runtime-view.mjs` 的长句（见上表末行）：可收敛处不少，但与 RC 的契约检查同源，须同批改，留 WO-WK11。
3. 窄屏顶带只放侧栏开合按钮，未按画布 §8.3 再放 wordmark。品牌符号只允许出现在侧栏 wordmark 一处（WK-51），在顶带另置一份需要先裁定。
