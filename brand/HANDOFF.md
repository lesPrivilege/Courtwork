# CW-BRAND-01 · Astra integration handoff

用户 2026-09-08 授权本品牌单施工，并指定：**等 Claude 当前 UI 回报与本单完成后，由 Astra 承担搬迁。** 本包只在 `codex/brand-symbols` 独立 worktree 新增 `brand/`，未合入活动 UI。

## 合流门

1. Claude 提供最终 UI commit 与交付；确认无仍在写入的未提交增量。不能用早期 `891aa13` 替代后续活动成果。
2. 本品牌包完成独立验证，固定最终 commit。素材预览通过不替代整个 UI 的验收。
3. Astra 在独立集成目录汇合 UI、Runtime 与品牌分支。先计算真实 ancestry，分叉使用普通 merge；品牌代码不碰 `app/web`，接入 UI 的标记/资源 allowlist 作为单独可审阅增量。
4. 同一最终 SHA 的必要回归通过后迁入持久 Courtwork fresh 工作区、同步候选分支；main接管继续遵守自足/真实验收与legacy distill门。

## SE space 与目录分离

保留当前 SE 项目/任务空间承接既有讨论。迁移后建议同一项目把**干净的 Courtwork fresh 持久工作区设为主目录**，SE 论文目录作为附加目录；不把旧 Courtwork legacy checkout 设为默认施工入口。SE 文件系统仍只维护 Paper，产品源码/工单/验收全部在 fresh Courtwork。

官方项目说明：新任务从主目录开始，Git、AGENTS.md、skills、config的默认发现基于主目录；附加目录可以读写但不自动发现这些项目文件。PR/worktree操作也针对主仓。来源：[Projects and chats](https://learn.chatgpt.com/docs/projects)（2026-09-08实际核验）。因此只保留 SE 名称、却让 Git 默认目录仍指向论文仓，会增加误操作。

同一项目不等于完整聊天自动合并进新上下文，官方说明每个任务仍有各自 transcript。保留空间帮助继续查找历史；可依赖的工程续行由 fresh 的 `AGENTS.md → engineering/current.md → 本项工单/证据 → PAPER.md` 保证。旧Courtwork按frozen SHA显式召回，不能让旧CLAUDE.md、roadmap或旧实现重新取得当前治理权。

本单没有修改 Codex 项目设置、移动任务或创建第二个产品仓。设置切换在搬迁收口时进行，届时记录真实主目录和附加目录。若项目配置无法自动修改，保留现有任务，并在每次开工显式绑定 fresh cwd 与新AGENTS，而非退回legacy checkout。
