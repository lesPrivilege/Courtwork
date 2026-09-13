# WO-ATT-UI02 · Board / Time 判断（未绘制）

工单允许附加有任务理由的 Board/Time 探索。本轮未绘制，理由与所需合同如下，供 Astra 决定是否另开片。本页不声明任何能力已接线。

## Board

任务理由不足。Attention 的主任务是逐条判断：扫描、读原因、执行合法动作、返回。五个状态是处置结果，不是工作阶段；Linear 官方说明亦承认 Triage/Inbox 类流程可以没有 Board（references.md）。

若日后仍需 Board，至少缺以下几项：

| 需要 | 现状 |
|---|---|
| 按状态分组的完整集合与每组计数 | 有 `exact(field=status)`，一次只查一组；五列须五次查询，各自分页，列间计数是五个独立事实，不能合成“总览” |
| 列内顺序 | registry 按 `attention_id` 排序，合同未写排序语义；不能画成优先级或时间顺序 |
| 卡片字段 | registry 只有 title / status / freshness / revision / updated_at；reason、next_action、seen 需逐条 inspect，卡片不能默认显示 |
| 拖放 → 动作 | 列间移动必须映射到合法 typed action，且多数需要 reason 或 next_action：拖入 Later = `snooze`（reason + next_action ≠ none），拖入 Waiting = `set_waiting`（同），拖入 Resolved = `resolve`（reason），移出 Resolved = `reopen`（reason，目标仅 investigating / needs_you），拖入 Needs you 在未解决时 = `resume(status=needs_you)`。拖放后仍须打开编辑器，拖放本身不能提交 |
| 返回焦点 | 卡片离开列后的焦点落点尚无规则 |

## Time

数据合同不足，不应绘制。

| 需要 | 现状 |
|---|---|
| 日期查询与覆盖 | 无按 `due_at` 或时间范围的查询；只能逐条 inspect 后在客户端聚合，结果只覆盖已读取对象，不是完整时间视图 |
| 日期字段语义 | `due_at` 是记录时间，不是提醒或调度；`updated_at` 是记录变更时间，不是计划时间；两者都不能画成日程 |
| 无日期对象 | trigger 为 manual / after / external 的对象没有 `due_at`，需要单独的“无时间”分区及其计数合同 |

## 结论

主交付停在 List–Detail 与 typed actions。若开 Board 片，先由 Core owner 给出分组查询与排序语义；若开 Time 片，先给出 `due_at` 范围查询与覆盖说明。
