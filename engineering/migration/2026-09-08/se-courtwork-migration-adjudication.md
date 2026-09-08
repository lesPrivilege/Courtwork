# Courtwork Fresh 迁移与清账裁决

2026-09-08，Asia/Singapore。Luna 只读取证，Astra 裁决。本轮确定迁移范围、顺序与门槛；没有执行目录搬迁、merge、commit、push、main 接管或数据升级。Git 状态是取证时快照，执行前须重查。

## 后续执行授权 · 2026-09-08

用户已授权独立品牌 icon 单开工，并指定 **Claude 当前 UI 回报与品牌单完成后，由 Astra 承担搬迁**。本次先在 `codex/brand-symbols` 独立 worktree 交付品牌包，不提前切换 Claude 工作目录，不将工作树暂时干净视为作者已交付。品牌交接见 [CW-BRAND-01](/Users/lesprivilege/.codex/worktrees/se-brand-symbols-20260908/brand/HANDOFF.md)。

迁移后可保留现有 SE 项目/任务空间。建议主目录切为干净的 Courtwork fresh 持久工作区，SE Paper 作附加目录；不附加 legacy checkout 作为默认施工面。SE 空间是任务组织，SE 目录是论文仓，两者不必绑定同一主工作目录。官方说明新任务、默认 Git 和 AGENTS/skills/config 发现依主目录，且每个任务保留各自 transcript；见 [Projects and chats](https://learn.chatgpt.com/docs/projects)。保留空间有助于历史检索，但不能保证新任务自动得到全部旧上下文。续行权威应落在 fresh 的 AGENTS/current/工单证据/PAPER 索引中。

此补充更新执行时点与授权；下列首轮调查保留其当时事实。main 接管仍是独立产品门，不能因目录搬迁或 Git 同步完成而自动放行。

## 决定

工程开发归 Courtwork，Schema Engineering 此后只维护论文体系（Canonical、Practice、Practice Index、祖本与编译发布设施）。**下一节点是清账后迁入 Courtwork fresh 开发分支并同步 Git；main 接管是后续独立节点。** 不再等待完整 SE 平台建成才迁出临时目录，也不以迁移成功替代产品验收。

用户本轮已指定 Courtwork 为目的地，旧交接中“新的 Fresh remote 未指定”不再阻塞目的地裁定。沿用现有 Courtwork 仓库身份，候选施工与 legacy main 隔离；无需新建第二个长期产品仓。本轮的时点裁决不声称已完成远端写入或接管。

## 当前可核事实

| 对象 | 基线与边界 |
|---|---|
| Legacy Courtwork | `/Users/lesprivilege/Projects/Courtwork`，HEAD `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`；冻结索引已有 tag、archive branch 与四条独立历史分支。Luna 于本日 `ls-remote` 核对 main/origin、冻结 tag 与 archive refs 一致，main ahead/behind 为 0/0。当前尚有未跟踪 `.agents/`、`skills-lock.json`，不在冻结 commit 内 |
| Fresh 集成分支 | `/private/tmp/se-agent-v9-web` 内 `codex/gui-completeness` = `b26670c8975bd9bd2666a856be55b80fcb2963fc`；独立 Git 仓，无 remote |
| UI Polish | 同仓 `claude/ui-design-polish` = `891aa13c57443e6458f2b12bc1a5fa329887d8cd`；临时目录检出此分支；初查干净，Luna 后续复查发现活动增量持续变化；00:44:55 快照已涉及 `app/web/app.mjs`、`index.html`、`settings-view.mjs`、`styles.css`、`ui-controls.mjs` 五文件（+456/−54）。此统计不是冻结载荷，T0 须以作者停止写入时的最终 SHA/patch hash 为准。该 SHA 不覆盖新改动；作者交付与活动增量均须分别收口，独立接受仍待完成 |
| Runtime Control Plane | 同仓 `codex/runtime-control-plane` = `87222599b37a9571708d313ee9f7f5fa8137e251`；独立 worktree `se-runtime-control-20260907`；134/134 为交付记录，未覆盖新控制面前端或真实远端 provider |
| 分支关系 | UI 与 Runtime 共同祖先 `b26670c…`，左右各一个提交。更改文件不重叠；尚无包含两者的新集成提交 |
| Runtime 前端 | 执行文档已有接管与 explore 工单，尚未构成实现或验收；不能把后端合入等同于新控制面 UI 完成 |
| SE 论文 | 根仓 HEAD `95c97f807f48030e02b349345f92d8407df50266`，相对 `origin/main` 领先 1、落后 0；Luna 本日 `ls-remote` 核实远端仍为 `f8ecb091895559389bb4e75f3c6f28052b71c5a3`；9.6 源文、构建设施及发布候选仍有未提交改动；祖本已入 `papers/archive/ancestry/`，不用再从 Courtwork 迁一次 |
| SE 工程 | 根目录 `engineering/` 与 continuation worktree 的 `engineering/` 都未跟踪；后者包含实际施工与证据，根 `current.md` 的“无实现、全部未运行”是旧快照，不能再代表全项目 |

主要现场依据：

- [冻结来源索引（历史路径：`ecosystem/local-sources.md`）](evidence-index.md)。
- [UI 作者交付](/Users/lesprivilege/.codex/worktrees/se-continuation-v3-20260906/Schema%20Engineering/engineering/mvp/execution/gui-completeness/ui-design-polish/delivery.md)。
- [Runtime 接入与验收边界](/Users/lesprivilege/.codex/worktrees/se-runtime-control-20260907/docs/runtime-control/acceptance.md)。
- [Runtime 前端接管](/Users/lesprivilege/.codex/worktrees/se-continuation-v3-20260906/Schema%20Engineering/engineering/mvp/execution/gui-completeness/runtime-control-frontend/intake.md)。

这些绝对路径仅为本轮本地取证入口；迁移交付时必须改为目标仓内相对路径或已发布的 commit permalink。

## 时间节点与退出条件

| 节点 | 发生时机 | 必须完成的动作与退出证据 |
|---|---|---|
| T0 清账 | 现在，下一轮 runtime 前端施工前 | 固定三条 fresh tip、清账时最终活动 UI 增量与各文档来源；当前作者先完成或单独 checkpoint 未提交增量，迁移者不能擅自 stash/覆盖或在活动目录切分支；核对根/continuation 工程差异，分别处置 current/decisions/设计与证据，不能整目录覆盖。Paper 9.6 与产品迁移分别提交，不把候选论文当已发布。把施工源码、工程文档与必要证据纳入可恢复 commit/bundle，记录来源 SHA/hash；停止在 SE 新增产品工单 |
| T1 合流并迁开发位置 | T0 可恢复后立即进行，不等待真实模型验收 | 在独立集成工作区按 `b26670c` 建候选，先合入一支，再普通 merge 另一支，再核入 T0 固定的 UI 后续增量；对最终树运行相关后端/交互检查并完成 Polish 独立复核。保存合流 SHA。将 fresh 树与裁定后的工程文档迁入 Courtwork Git 的 `codex/fresh-courtwork` 候选分支及持久工作区。新控制面前端从这个唯一基线继续 |
| T2 首次 Git 同步与 SE 收口 | T1 的源码、文档、依赖与可恢复性检查通过后 | 同步 Courtwork 候选分支及保留 fresh 原历史的 archive ref，再从远端新 clone 验证可恢复；确认工程内容已安全落地后，SE 移除活动 `engineering/`，更新 README/CONTRIBUTING，仅留论文与产品链接。SE 论文发布须独立完成 build/validate/Pages 门槛；不要把两仓提交说成原子事务 |
| T3 Runtime UI 与自足验收 | 候选在 Courtwork 持续施工 | 接通已裁定的控制面路径，绑定一个最终 SHA 完成真实 provider/工具/权限/成果/修改/取消失败/重启续用与独立 clone 验收。新控制面按支持范围显示，未实现 adapter 不伪装可用；无需补齐所有平台与专业扩展 |
| T4 Main takeover | T3 通过，定向 legacy distill 与回退演练完成 | 在冻结 legacy 后继线上形成 replacement commit，通过 Courtwork PR 接管 main；旧 archive/tag 保留，记录边界 commit 与新树来源。只在这里宣布 Fresh 是 main 的 canonical implementation |

**T1 的 Git 修正**：前端接管记录中“两支可各自快进，次序无关”不成立。第一支可以快进，第二支需要普通 merge；没有文件冲突不等于语义兼容。不得重写作者分支来制造快进假象。

**数据边界**：Runtime 引入 schema 3 → 4，旧 host 不能读取升级后的数据。合流检查用独立数据目录，保留升级前备份；迁代码不自动迁 session/凭据，不能让仍运行旧 host 的 8816/8818 共用升级目录。新安装须由锁文件恢复依赖，不能依赖指向 `/private/tmp` 的 node_modules 或其他符号链接。

## Git 谱系与清账方式

Fresh 临时仓有独立 root，不把它与 Courtwork main 作 `--allow-unrelated-histories` 大合并。先保留完整 fresh 源码历史到可达 archive ref（建议 `archive/fresh-pre-courtwork`，记录最终源 tip），再从 frozen legacy 建 Courtwork 候选分支，用明确 replacement 导入已合流的 fresh tree。这样 PR 相对于 main 可正常审阅，开发搬迁发生在分支，main 仍停在冻结点。

Courtwork 冻结 tag 已在远端，不需要再发布附件所说的“69 个未同步提交”，也不重打冻结 tag。早期说法“必须先 push main 才能公开 tag”本身也不成立：推送 tag 会发送其可达对象；本次实际远端两者均已核对。

T4 采用保持 legacy 历史连续性的接管：若仍要求“冻结 legacy 是单个 takeover commit 的直接 parent”，可在 PR 接管时 squash 成单次 replacement；fresh 原开发历史已由 archive ref 保持可达。执行前重查 origin/main 是否仍是冻结 SHA；若发生前移，先归因，不强推覆盖。tag 在 Git 中技术上可以移动，故 provenance 以完整 SHA 为最终锚，tag/branch 作为约定不改写的发现入口。

不合并 SE 仓库历史进 Courtwork。只移交有明确责任的工程文档，保存原路径与来源提交；未跟踪材料先做 hash 清单和可恢复封存。旧实验源码包/截图去 Courtwork 的历史证据位置，当前索引按需链接；不把整个 legacy 源树复制到 fresh 工作树。Courtwork 未跟踪工具配置单独记账、保留，不以目录干净为由删除或顺带纳入产品载荷。

## Paper 入口与 PR 文档

裁定采用 **Courtwork 根目录 `PAPER.md` 指向 SE；产品需求与 PR 记录留在 Courtwork 工程文档**。不再复制一套可编辑 Paper。

| 文档 | 唯一责任 |
|---|---|
| SE `papers/src/canonical.md`、`practice.md`、`practice-index.md` | 论文正文、实践文本、观察与修订裁决账本，继续在 SE 编订与发布 |
| Courtwork `PAPER.md` | 简短说明论文来源、当前采用的 SE 版本与完整 commit、Canonical/Practice/Index 固定链接，并另给最新阅读入口。现有 9.6 未提交，不可先声称已 pin 到 9.6 |
| Courtwork `engineering/README.md`、`current.md`、`decisions.md` | 迁入后工程的唯一入口、当前事实与架构裁决；与现有 `docs/runtime-control/INDEX.md`、UI 契约互链，不复制两份状态表 |
| Courtwork 产品工单 / PR | 问题、范围、所用 Paper 条款与固定版本、实现及验收证据、取舍和未决；若 PR 指产品需求则采用局部需求/验收文档，若指 pull request 则链接同一文档 |
| SE README | 链到 Courtwork 开发入口；`papers/dist/index.html` 继续是论文发布入口，不改为产品跳转 |

工程结果反哺论文时：Courtwork 保存完整实验与 PR 证据，SE Practice Index 只登记最小观察、范围、证据 permalink 与论文处置。不把产品工单复制成另一份 Practice Index。若以后确需离线 Paper，使用标注 commit/hash 的只读发布快照，并从 `PAPER.md` 说明来源；它不是第二编订入口。

## 当前裁定状态

迁移目的地与职责划分已确定；清账、合流、持久候选分支同步是下一执行单。Runtime 控制面 UI、自足验收与 main 接管尚未通过。本轮只核查文件/Git 与交付证据并编订裁决，没有重跑产品测试，也没有改写历史交付的测试结论。
