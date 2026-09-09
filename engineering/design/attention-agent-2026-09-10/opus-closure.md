# Attention Chat · Opus 收尾第一节点

接 [Opus 交接](opus-handoff.md) 第4节。从固定交接提交 `5899765`（其下产品为 Astra 的 `f4f2436`）建隔离工作树 `/private/tmp/cw-opus-attention-chat`，分支 `claude/attention-chat-closure`，合成宿主自用端口，本机数据目录在工作树之外。实读 main 仍为 `ee6df72`，另一位作者的 `current` / atlas / scout / sources / intake 与 Interaction Grammar 输入仍未提交，因此不合流、不代提交、不 stash/reset，`wk98-regression.json` 的既有修改原样保留。

本页是一个有界节点的交付，非完整 UI 验收。作者验证与独立接受分列；`current.md` 仍由 Astra 维护，本单不写入。

## 一 · 两处 Chat 共用呈现（第4节第1项）

三处词表与形态此前各写一套，现收为一处。

- 助手角色名。完整会话用 `.message-role`（11px、字重500、大写、字距 0.66px），弹窗用 `<strong>`。同一角色出现两种排印。现弹窗改用同一个类。
- Run 状态词。弹窗把 `waiting_user` 原样印出，流内一处、状态行一处。现两处都读既有 `runLabels`，与完整会话同表。
- 工具行状态。弹窗写作 `name · phase · failed`，正是 WK-57 所禁的形状：状态词粘在对象名后，且已返回的工具仍带词。现新增纯函数 `toolStateWord(row, status)` 落在 `thread-projection.mjs`，完整会话与弹窗同读；`unfinishedToolWord` 一并移入该模块，`Interrupted` / `Unknown` 的判断只剩一处。WK-115 ① 的源码守卫改钉新地址，规则未变。

长消息的有界预览此前取原文前 280 字符，故以 `#`、`|`、``` 开头的消息，折叠态首行即为标记而非文字。现由 `messageSummary()` 生成：去围栏与分隔行，表行读作单元格，成对强调解包（`some_variable_name` 不受损），链接读作链接文字。原文不经此函数——Read full message、Source 与 Copy 仍是精确原文。

## 二 · 会话入口与管理（第4节第3项）

- 会话名此前居中。`.attention-recent-row > button:first-child` 已写 `text-align: left`，但按钮自身是 `display: flex; justify-content: center`，文本对齐不生效。现补 `justify-content: flex-start`，一列名字对齐同一左缘。
- 管理会话时 `stream` 被隐藏，其余子项均不伸展，输入框因此浮在弹窗中部。现管理态下会话列表取走空高，输入框回到弹窗下缘。
- 已删的死规则：`.attention-agent-message.is-user` 六条。弹窗的作者行现由 `.attention-authored-message` 承担，`.is-user` 不再出现在 DOM。

## 三 · 消息级动作的可见性（须裁定）

用户消息的 Copy / Edit 依既有 WK 约定随消息 hover 或 focus 出现，无指针设备常显；助手整条 Copy 则一直可见。同一层级的两个动作，两种可见规则。现统一到既有约定：助手整条 Copy 随其消息出现，`hover: none` 下常显；围栏代码/文字卡内部的 Copy 属于该块，仍为常驻。

此项改的是可见性，不是位置——用户先前的裁定（消息级 Copy 在气泡与回复正文下方）未动。若判定助手 Copy 应保持常驻，回退只需删去 `styles.css` 中该组四行。

## 四 · 真实 Run flow（第4节第4项，已验部分）

同一运行时当前只允许一个活动 Run（`store.mjs` 的 `singleActiveRun`）。因此另一会话持有未答问题时，本会话发送被服务以 409 拒绝。弹窗照服务原句显示，草稿留在输入框，未丢。此句未说明是哪一个会话持有该 Run；要说明须读取弹窗当前不读的跨会话 Run 事实，本节点不做。

已验：应答后工具行去掉状态词，问题行显示 `Request resolved` 且无应答控件，Run 读作 `Completed`，焦点回落输入框；活动 Run 的 1.5 秒轮询重绘两次，应答文本域的焦点与光标位置均保持。

## 五 · 合成 provider 的换行丢失

`fake-provider.mjs` 以 `/.{1,24}/gu` 切分流式文本，`.` 不匹配行终止符，故每一个换行在切分中丢失：多行回复到达界面时是一整行，第一个块之后的 Markdown 都无法解析。现加 `s` 标志。

由此可知：此前弹窗内"助手长 Markdown"的浏览器证据受限于夹具而非渲染器——在该缺陷存在期间，本地测试适配器无法产出多行回复。修复后已验表格、围栏代码、有序列表、引用与两个外链在弹窗内正常呈现，表格落在自有横向滚动容器且可聚焦，代码卡保留自有 Copy。

## 六 · 未处理，留待后续

| 项 | 缺口 | 归属 |
|---|---|---|
| 拒绝发送的措辞 | 不指明持有 Run 的会话 | 需跨会话 Run 读取接缝，与 owner 定 |
| 深色下作者面 | 作者面与弹窗底色相近，仅靠边框分开 | 材质轮次（FE-05 / material grammar），非本节点 |
| 状态词重复 | 活动 Run 时工具行、状态行与实时状态行同词 | 完整会话形态相同；收敛须裁定 |
| 读失败态 | 会话列表读失败未构造反例 | 第4节第3项余项 |
| 无障碍矩阵 | 200% 缩放、forced-colors、reduced motion、完整键盘走查、真实原生宿主 | 第4节第5项余项 |
| Home 3–7 与 main 并行裁定 | Tabs / Material / Overlay / Glyph / Sidebar 与 WK-139…144、EX-PG1 | 交接第5、6节，未消费 |

## 七 · 验证与限度

作者定向 12/12（`ui-event-mapping` 与 `settings-navigation`）、18/18（attention / 架构边界 / 呈现适配器 / renderer 准入）；色彩、材质两项 lint 与对比度报告通过；有界并发全量见 [本单证据](../../../evidence/attention-chat-closure-20260910/README.md)。合成宿主与浏览器会话同时在跑时的一次全量记为 431/434，其中两项为 `CORE_UNAVAILABLE: bridge ready timeout`，单独运行分别 0.4 秒与 0.2 秒通过；未放宽超时、未删断言。

未运行真实 provider，未迁移个人数据，未发送外部消息，未部署。本节点不关闭 FE-05a、FE-05、CC-I、ATT-FE-01 或 G1–G5。
