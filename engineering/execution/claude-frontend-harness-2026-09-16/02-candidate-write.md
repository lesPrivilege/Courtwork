# 02 · 写入必须是真实效果

2026-09-16 · Claude（Fable 5.1）作者与裁决；Sonnet 5 有界实现两条 Host 只读路由与投影去敏。owner 事实回写见 [RD-006 · 2026-09-16 节](../../research/RD-006-deferred-workspace-binding.md)。

```text
Task / scope: DWB-04 GUI 接线：私有 candidate 的创建/撤销、repo_write 精确批准卡、从 Host 打开精确 diff；写入效果的持久结算沿恢复树既有实现（prepared/confirmed/failed/unknown、重启不重放）
Base SHA / branch: 01 片末 cf20122 / claude-frontend-harness-20260916
Writer / reviewer: Claude 作者；Sonnet 5 实现 `GET …/repository-candidate/diff`、`GET …/repository-candidate/effects` 与 HTTP 投影去敏（`ecb8dfb`）；非作者复核与人的目验未做

Owner fact + contract: app/docs/repository-binding.md「Private Git candidate」；候选命令 `PUT /sessions/:id/repository-candidate`（create 需完整 baseCommit，revoke 保留文件）；`repo_write` 的 ask 载荷带 candidateId/revision/writeRevision/expectedSha256
Semantic / projection / control / placement: Workspace 卡新增 Edits 区（对象词 Private candidate）；批准卡沿 ws_write 同一解剖，仅加一行范围；diff 在 runtime-dialog 里按文件分节，标题是路径；This chat 概览加 Review changes 行
Affected UX rule IDs: UX-02（落点与前态在动作旁：Private candidate · new file / replaces the file whose hash starts …）、UX-03（Start/Stop 是命令，Writes 是事实）、UX-06（Stop edits 有真实撤销合同且后果句在旁；不提供假 Undo）、UX-08（模型自述、Host 文件变化、检查回执、Core 接受分列——本片只接前两者）
Action result / feedback / recovery: 候选命令后读回 Session；无 commit 的目录不能开始（CANDIDATE_NO_GIT）；活动 Run 中命令禁用；打开卡片时向 Host 读回 Session，避免 Writes 计数陈旧
Nearest precedent: renderPermission / permissionPresentation（ws_write 卡）；materials-dialog（runtime-dialog 解剖）；diff-view renderDiff（materials 比较）；固定 SHA cf20122
Evidence type: implemented precedent
Governance status: candidate（无非作者复核）
Kept relationships: 绑定 source 只读；ws_* 不变；批准仍绑定 toolCallId 与内容 hash；Core 接受不在本片
Intentional changes: diff-view 新增 parseUnifiedPatch；permissionPresentation 新增 scope；candidate-dialog；Workspace 卡 Edits 区；概览 Review changes 行
New terms / primitives / dependencies: 词见 copy-convention §3.2b（Start private candidate · Stop edits · Review changes · Changes in the private candidate）；无新 token/依赖
Exceptions: 无

Fixture: 同 01 合成仓库；Local test provider 的 `/fixture script` 发起 repo_write
Checks: 见下
Independent review: 无
```

## 提交

| 提交 | 内容 |
|---|---|
| `20158c6` | Edits 区、批准卡范围行、candidate 变更对话框、概览行、parseUnifiedPatch 与 6 项 UI 测试 |
| `051c197` | 打开卡片时向 Host 读回 Session，Writes 计数不再陈旧 |
| `ecb8dfb` | Host 路由：candidate diff（与 `repo_diff` 同一份有界 patch，不做逐文件策略排除）与写入回执列表；HTTP 投影去掉 `contentRef`（candidate Host 路径原已在该边界投影掉） |

## 作者检查

| 检查 | 结果 |
|---|---|
| `node --test tests/candidate-ui.test.mjs tests/workspace-card.test.mjs tests/thread-projection.test.mjs` | 16/16 |
| Host 路由定向（Sonnet） | `node --test tests/repository-candidate.test.mjs tests/repository-binding.test.mjs` 34/34（含 diff/effects/去敏/409/401） |
| 浏览器目验（Local test，合成仓库） | 绑定的 Chat → Workspace 卡 Start private candidate → `from 7c8dd3fc8709 · Writes 0` → `/fixture script` 发起 `repo_write NOTES.md` → 批准卡 `Approve this file write? / NOTES.md / Private candidate · new file / 16 B` → Approve → Execution 1 successful tool action → 重开卡片 Writes 1 → This chat 概览 Review changes → 对话框 `Changes in the private candidate / From commit 7c8dd3fc8709 · 1 write / NOTES.md · added · 16 B / 1 added, 0 removed / +fixed pagination / Patch <sha256>` |
| `npm test` | 1093/1093（Node 25.9，并发 4） |
| lint（copy/interaction/colors/semantics）与 `git diff --check` | 通过 |

## 用户中途指令处置

"blur 轻一些，与框线二选一" → transient 弹层 blur 由 16px 降为 8px，去掉弹层框线，边缘只由 rim 高光与阴影承担；"窄屏 composer 背景分界线未完全取消" → 停靠的 composer 带用 20px 渐变 mask 让玻璃淡入（沿 WK-127 滚动 header 的做法），不再有硬边。

## 未完项

- 写入结算的 GUI 呈现（prepared/confirmed/failed/unknown 的回执行、重启后 unknown 的恢复面）未做；后端结算已在恢复树内。
- 冲突反例（批准后源文件改变 → 拒绝并保留意图）只有后端测试，GUI 未走。
- Core 正式接受（Candidate→Decision→Artifact）与检查回执分列属 03/08。
- 非作者复核、真实 provider、1440/1280/200%/读屏未做。
