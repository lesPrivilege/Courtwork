# EX-WK6 · DeepSeek Harness 插件系统与 web UI 溯源（Sonnet，只读）

状态：已派发 2026-09-09。输出 `../explore/ex-wk6-dsh-plugins-webui.md`，卷首标 `带溯源索引`。

问题：WK-63 / 64 / 67 需要 DSH 在 runtime self-modification（R5 事务化 apply / rollback）、preset / generation（R6 Expert 快照）、inspect（R1）与 web UI 页面结构上的具体机制。来源限：本机 DSH 相关副本（若存在）、`deepseek-ai/deepseek-harness` 官方仓库与文档（固定 commit）、本机 skill `~/.pi/agent/skills/deepseek-harness/SKILL.md`（只读其索引，不套用其模板）。交付：溯源索引行；机制表（Observed mechanism · Source/pinned version · Borrow · Do not borrow · Adapter seam · Compatibility risk · Open verification · Acceptance implication）；web UI 页面清单（页面 · 对象 · 控件 · 状态词 · 与 WK-63 IA 节点的对应）；与 SE 冲突清单；结论 ≤ 10 行。

## 更正（用户，2026-09-09）

本机 `~/Projects/motto-dsh` 不是官方副本（受控下游），DSH 迭代快、可能含破坏性更新：**来源优先级改为 官方仓库（固定 HEAD commit）> 二手评析**；本机副本只作对照，不作转录来源。首派已在运行且不可中途改写，其产出视为草稿；回卷后立即派 r2：以官方 `deepseek-ai/deepseek-harness` 固定 commit 重核每一行机制与页面，标出与 rc.7 本机副本的差异（尤其破坏性变更），r2 为定本。
