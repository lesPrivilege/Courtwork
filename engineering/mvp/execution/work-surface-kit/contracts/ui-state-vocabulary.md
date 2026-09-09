# UI 语义投影词表（WK-122）

一层很薄的映射：**后端已有的状态字段 → 界面上的词**。它不是新状态机——每一行的左边必须是 store / 契约里真有的值（file:line），右边是 copy-convention / glyph-semantics 里已登记的词。没有后端事实的状态在 §4 单列为"无契约"，界面不画。参照层（Linear Agent Session、Primer scenario patterns）只用来检查语义是否齐全，不替代 Core owner。

## 1. Run（`app/server/store.mjs:8-10`）

| 后端值 | 集合 | UI 词（glyph-semantics §3 / copy-convention） | 备注 |
|---|---|---|---|
| `running` | active | `Working` | Linear `active` |
| `waiting_user` | active | `Waiting for you` | Linear `awaitingInput` |
| `stopping` | active | `Stopping` | 取消已回执但未停；`cancel requested ≠ stopped`（FE-04） |
| `completed` | terminal | `Completed` | Linear `complete` |
| `cancelled` | terminal | `Cancelled` | 工具行 `Interrupted` |
| `failed` | terminal | `Failed` | 工具行 `Interrupted`；Linear `error` |
| `unknown` | terminal | `Unknown`（Needs a look 集合） | 工具行 `Unknown`（WK-115 ①）；≠ failed |
| — | — | — | **无 `queued`**：没有排队状态的后端事实，界面不画 queue（Linear `pending` 无对应） |
| — | — | — | **无 `stale`**：需要 BE-28 / BE-32 一类时间戳才能诚实说 stale |

## 2. Question / Permission（`store.mjs:15`、review-projection §1）

| 后端值 | UI 词 | 备注 |
|---|---|---|
| `pending`（kind `ask_user`） | 未决卡 + `Answer` | 在途：`Sending…`（同一在途词） |
| `pending`（kind `permission`） | 授权卡 `Approve this write` / `Deny this write` | 闭集两个决定；**无 Always allow**（review-projection §6，策略级放行属 runtime 控制面） |
| `resolved` | `Answered` / `Write allowed` / `Write denied` | 决定回执行，不记成果接受 |
| `expired_restart` | `Closed` | 运行重启后关闭 |
| `cancelled` | `Closed` / `Write closed` | Run 取消时关闭 |

assistant-ui 的 `request | running | done | denied` 对应：pending → (在途 `Sending…`) → resolved(allow) 后工具行另有自己的状态 → resolved(deny)。"running" 不是问题的状态，是工具行的。

## 3. Artifact / File（presentation-primitives.d.ts:24、work-core contract）

| 后端事实 | UI 词 | 备注 |
|---|---|---|
| `kind: 'current'` | 当前文件 | 读取类别，不是审批状态（IC-1） |
| `kind: 'content-version'`（path / sha256 / writtenAt） | `Recorded version` | 记录版本 |
| 候选 `accepted` / `rejected` / `request evidence`（review-projection §3） | 决定回执 | 成果接受与写入授权分面 |
| — | — | **无 `superseded` / `pending` 产出**：产出要么记录了要么没有；不画"生成中"的占位 |

## 4. 无契约（界面不画，登记为候选）

| 参照层概念 | 状态 | 去向 |
|---|---|---|
| Mutation `reversible → committing → committed → rolled_back`（Undo Pill 的前提） | 无撤销端点、无可逆窗口 | 候选 BE-34：可逆变更窗口（哪些动作、多久、谁能撤）；在此之前 Undo Pill 只作 motion 参考 |
| Run `queued` | 无 | 不画 |
| `stale` | 无时间戳 | BE-28 / BE-32 |
| Activity `thought` / `plan`（Linear） | 事件流有 tool / status / artifact，无 plan 对象 | 不画 evolving plan |
| Approval `Always allow` | 明确不采纳 | review-projection §6 |

## 5. 使用规则

组件不得自造状态机：每个组件的状态矩阵（primitive-canon §3）每一格都要指向本表的一行或写 `not_applicable`。参照层新增语义时先在 §4 登记"无契约"，再由后端台账决定是否成为事实。
