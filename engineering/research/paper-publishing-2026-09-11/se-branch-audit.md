# Schema Engineering 分支只读审计

审计日期：2026-09-11（Asia/Singapore）。本审计只消费 Git refs、提交 metadata、路径/统计摘要与 worktree 状态，不读取旧版论文正文或 legacy 内容，也不执行 checkout、reset、stash、merge、push、delete。已在现场执行 `git fetch origin` 以刷新远端 refs。

## 现场与基线

Astra任务稿给出的连字符目录名 `Schema-Engineering` 不存在；现场实际目录名是 `Schema Engineering`（含空格）。该目录是 Git 根目录，`origin` 为 `https://github.com/lesPrivilege/Schema-Engineering.git`，因此以下结果基于这个可核验的同仓库目录。根级 `AGENTS.md` 已读取，并确认这是 Schema Engineering 论文工作区。

- 实际 cwd：SE工作区（目录名 `Schema Engineering`；下列路径以用户Projects或Codex worktrees为逻辑根，避免绑定个人绝对路径）
- 当前分支：`main`
- 本地 `main`：`2817b8240c34d0754caf623e2a867cc168a260ab`
- 刷新后 `origin/main`：`8b2839a476267cdc0f223040191b59306ce30996`
- 计数格式：`ahead/behind`，均相对对应列中的 baseline。
- 远端 refs 只有 `origin/main` 与指向它的 `origin/HEAD`；没有远端 DSH、paper-skin 或 reader-controls 分支。

## 分支对照

| ref | tip | merge-base / local main | ahead/behind local main | merge-base / origin main | ahead/behind origin main | 判定 |
|---|---|---|---:|---|---:|---|
| `main` | `2817b8240c34d0754caf623e2a867cc168a260ab` | `2817b8240c34d0754caf623e2a867cc168a260ab` | `0/0` | `8b2839a476267cdc0f223040191b59306ce30996` | `1/0` | 仅本地 `main` 领先远端 1 个提交 |
| `origin/main` | `8b2839a476267cdc0f223040191b59306ce30996` | `8b2839a476267cdc0f223040191b59306ce30996` | `0/1` | `8b2839a476267cdc0f223040191b59306ce30996` | `0/0` | 远端基线 |
| `codex/attention-proposal-20260909` | `96e9b9eaae4a185735bb97641139408ef93879a9` | `96e9b9eaae4a185735bb97641139408ef93879a9` | `0/10` | `96e9b9eaae4a185735bb97641139408ef93879a9` | `0/9` | tip 是两条 main 的 ancestor，已合入 |
| `codex/dsh-observation-20260910` | `fa71b782a7c29c701a9e90b0c0aef069eb38f5a8` | `8b2839a476267cdc0f223040191b59306ce30996` | `3/1` | `8b2839a476267cdc0f223040191b59306ce30996` | `3/0` | 唯一真正未合入；相对两条 main 都有 3 个独有提交 |
| `codex/paper-skin-english-20260910` | `8b2839a476267cdc0f223040191b59306ce30996` | `8b2839a476267cdc0f223040191b59306ce30996` | `0/1` | `8b2839a476267cdc0f223040191b59306ce30996` | `0/0` | 与 `origin/main` 同一提交，已合入 |
| `codex/reader-controls-20260911` | `2817b8240c34d0754caf623e2a867cc168a260ab` | `2817b8240c34d0754caf623e2a867cc168a260ab` | `0/0` | `8b2839a476267cdc0f223040191b59306ce30996` | `1/0` | 与本地 `main` 同一提交；该提交尚未进入远端main；不据Git状态推断线上部署 |

`git merge-base --is-ancestor` 核验结果：`attention-proposal`、`paper-skin-english` 均进入本地及远端 main；`reader-controls` 进入本地 main；`dsh-observation` 未进入任一 main。

## patch 等价与独有提交

以本地 `main` 为 upstream 执行 `git cherry -v main <branch>`，没有 `-`（patch 等价/cherry-pick）标记。`dsh-observation` 的 3 个提交全部为 `+`，所以当前证据不支持把它们视为已由另一提交等价吸收。对 `origin/main` 执行同样核对时，本地 `main` 只有 `2817b824…` 一个 `+` 提交。

`dsh-observation` 的独有提交仅列路径和统计摘要：

| commit | subject | 路径/摘要 |
|---|---|---|
| `038657808f2ecb65cb5ef7290c1ebf0fbb8abcb0` | `observe: index DSH model-harness candidate` | `papers/src/practice-index.md`，22 行新增 |
| `0df1fcf44c30970e4f398b9aaebbb8ff306819d6` | `observe: adjudicate DSH as index-only candidate` | `papers/src/practice-index.md`，3 行新增、3 行删除 |
| `fa71b782a7c29c701a9e90b0c0aef069eb38f5a8` | `observe: pin DSH discussion identity` | `papers/src/practice-index.md`，1 行新增 |

本地 `main` 相对 `origin/main` 的独有提交是 `2817b8240c34d0754caf623e2a867cc168a260ab`（`Polish reader navigation into two aligned control groups`），改动摘要为 `papers/build.py`、双语 reader 产物、`papers/evidence/reader-controls-20260911/`、`papers/notes/publication-surface.md`、`papers/reader/reader.css` 共 9 个路径。

## worktree 未提交现场

| worktree | ref/HEAD | 状态 |
|---|---|---|
| `Projects/Schema Engineering` | `main` → `2817b824…` | 工作树干净；相对 `origin/main` ahead 1 |
| `Projects/.worktrees/se-reader-controls-20260911` | `codex/reader-controls-20260911` → `2817b824…` | 工作树干净 |
| `Temporary/schema-paper-skin-english` | `codex/paper-skin-english-20260910` → `8b2839a…` | 路径不存在，Git 标记 `prunable`；无法判断该已消失 worktree 是否曾有未提交改动 |
| `Temporary/se-dsh-observation-20260910` | `codex/dsh-observation-20260910` → `fa71b782…` | 路径不存在，Git 标记 `prunable`；无法判断该已消失 worktree 是否曾有未提交改动 |
| `Codex worktrees/abd0/Schema Engineering` | detached `f8ecb091…` | 未提交：`M CONTRIBUTING.md`、`M README.md`、`?? engineering/` |
| `Codex worktrees/se-continuation-v3-20260906/Schema Engineering` | detached `f8ecb091…` | 未提交：`M CONTRIBUTING.md`、`M README.md`、`?? engineering/` |

两个 detached worktree 不是分支，且其未提交内容未读取；不把它们归入“已合入”或“未合入”分支结论。

## 建议与未知项

1. 优先由 owner review `codex/dsh-observation-20260910`：它是唯一同时相对本地和远端 main 未合入的分支，且只改 `papers/src/practice-index.md`。如需保留其观察记录，应在确认语义与提交归属后有意整合；本审计不代替合并决定。
2. 单独 review 本地 `main` 的 `2817b824…` 是否应推入远端main（部署需另看发布回执）；`codex/reader-controls-20260911` 只是同一提交的分支指针，不需要再次 merge。
3. `attention-proposal` 与 `paper-skin-english` 已是 main ancestor，暂不重复合并。两个 prunable worktree 与两个有未提交改动的 detached worktree 先由 owner 处理，再考虑任何清理动作。
4. 路径名存在未决事项：任务稿给出的连字符目录不存在，当前结果采用的是远端身份相同的含空格目录；已确认同一origin身份，不因目录名差异阻塞本次审计。
5. 因远端只有 `origin/main`，无法对其他远端分支做比较；prunable worktree 的历史未提交状态也不可恢复为本次证据。
