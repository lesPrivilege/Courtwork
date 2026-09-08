> 迁移已完成：导入基线 `9f13ca3`；fresh archive `c0c4d81`；远端独立clone和134项后端测试/恢复 smoke通过。下文计划段保留过程，最终事实见本文末回执。

# 2026-09-08 · Fresh integration 文档迁移记录

状态：文档载荷已整理到 `codex/fresh-integration`，代码基线 `05c6947` 加本轮 Home/编排增量；候选仍不是 legacy `main` 的替换实现。本文只记录本次有界迁移，不声称 runtime UI、真实 provider 或最终产品验收完成。

## 来源与当前基线

- UI polish 最终已回报基线：`dd65d2b`（含 `4fab4bd`、`f8e3c19`）。作者补交滑块/运行计时/ledger微光后交付更新、原树干净，已合入本载荷并补验20项前端/权限反例。
- Runtime Control Plane：`8722259`；后端 134/134 确定性检查通过，新的 runtime 控制面 UI 仍待施工。
- Brand：`faef241`；已随候选合流。
- 最终代码合流：`05c6947` 加本轮 Home/编排增量，包含初合流 `5f3c4cd`、权限修复 `787bf1c` 和最新 UI `4fab4bd`。
- Paper 固定：根 [`PAPER.md`](../../../PAPER.md) 指向 SE 9.3 / `f8ecb091895559389bb4e75f3c6f28052b71c5a3`。未把 SE 未提交的 9.6 候选写入产品绑定。

## 公开载荷

公开 `engineering/` 吸收 continuation 的非 `mvp/execution` Markdown，并保留两份 root-only 输入：

- [`se-courtwork-migration-adjudication.md`](se-courtwork-migration-adjudication.md)：T0–T4、数据边界、谱系与 Paper/PR 责任的历史裁决；本文件中的旧绝对路径是来源记录，不是当前工作目录。
- [`claude-design-context.md`](claude-design-context.md)：fresh Design 的委托上下文；仍是 proposed 输入，不是已接受的产品视觉系统。
- [`ui-design-polish-delivery.md`](ui-design-polish-delivery.md)：`f8e3c19` 交付摘要与未测边界。
- [`runtime-control-frontend-intake.md`](runtime-control-frontend-intake.md)：runtime 控制面前端契约接管记录。
- [`runtime-control-frontend-explore.md`](runtime-control-frontend-explore.md)：只读成熟实现对照，作为设计输入，不是技术采纳证明。

历史 `engineering/mvp/execution/` 载荷未整目录公开。当前保留的原 integration 视觉 diff 报告和三张截图是已有跟踪文件，路径为 `../mvp/execution/gui-maturity-visual-diff/`；报告中的旧本机来源路径按历史证据处理，不作为当前实现入口。

## 未公开载荷与证据索引

旧 execution archives、source bundles、SQLite/SQLite journal、logs、临时目录、运行截图和任何可能含个人/账号/凭据边界的捕获不进入公开树。原始路径、私有副本、hash manifest 和可公开摘要见 [`evidence-index.md`](evidence-index.md)。完整工程源树私有副本位于本机 `/Users/lesprivilege/Projects/Courtwork-evidence/2026-09-08/`，目录权限为 0700；该路径不属于产品仓库。

## Git 谱系计划

1. 在 fresh 独立根上固定最终候选源码、文档和依赖检查，并把 fresh 历史保留为 `archive/fresh-pre-courtwork`。
2. 从 legacy frozen `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476` 建立 `codex/fresh-courtwork`，以明确 replacement tree 导入已合流 fresh 候选；不把两个根用无界 `--allow-unrelated-histories` 混成一条历史。
3. 仅推送 `codex/fresh-courtwork` 候选和 `archive/fresh-pre-courtwork` archive ref；远端 `main` 不动。
4. 从远端候选做独立 clone/恢复检查，再决定后续 runtime UI、真实 provider 和 main takeover 门；候选同步不是部署或 takeover 授权。

## 当前门

- **已通过**：代码基线 `05c6947` 加本轮 Home/编排增量 的20项前端/权限反例、timer/active/reduced-motion复核；后端134项在787bf1c通过且后续后端字节不变；品牌包独立验收范围。
- **待执行**：固定文档载荷、远端候选与 source archive 同步、独立 clone/恢复检查。
- **后续产品门**：真实 provider、完整 IME/读屏/触控/缩放、新 runtime UI、main takeover。

## 本轮追加范围

Home 改为 composer 主导；各级文本、卡片、Button、动作组和窄屏留白收敛至 [统一体例](../../design/ui-composition-standard.md)。运行等待不再呈现工作微光；本地重启恢复保留未发送草稿。Court Work 品牌语义注入留给用户在 merge 后交 Claude 的首轮工单。最新来源为 dd65d2b；更早SHA均为历史谱系，不再代表当前UI字节。

## 完成回执

- fresh 来源：`c0c4d811044b08d1982ebd6ad23d50658a05e300`，已推送 `archive/fresh-pre-courtwork`。
- Courtwork 导入：`9f13ca35e3cdada0ad5d2067a74d9c107c2e44c8`，文件树 `b744e545801f55759d1a27057274bf26c9f5c108` 与来源完全一致；已推送 `codex/fresh-courtwork`。
- 新远端 clone 独立安装依赖，后端134/134与runtime恢复 smoke通过，见 [回执](../../../evidence/remote-recovery-20260908/README.md)。真实 provider未跑。
- legacy `main` 保持 `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`；本次没有发布/部署/默认分支接管。
- SE根目录43份工程文件已与原33文件快照+新增10文件准备输入逐文件SHA核验后移至私有归档；SE根仅维护Paper。Continuation历史仍保留，不移动活跃作者旧预览。
- Claude Work Surface Kit的10份准备文件原文迁入 `engineering/mvp/execution/work-surface-kit`；源指纹见 `work-surface-kit-source.json`。其中旧基线与排期是准备时快照，当前以本回执和用户品牌首单安排为准。本轮不自动派发准备工单。
- 仍在同一SE任务空间协作，通过根AGENTS指向 sibling Courtwork-fresh，产品命令显式使用fresh cwd；未更改Codex项目设置，不声称自动载入全部聊天记忆。
- Paper9.6既有未提交候选保持独立，未发布、未混入Courtwork提交。
