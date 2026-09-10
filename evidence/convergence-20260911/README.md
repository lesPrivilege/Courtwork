# 2026-09-11 收敛节点

接收候选 `035134b919c195fe9454f279c297052bb8e32089`，产品组合 `b57b831`，基线 `9bc6090`。用户授权按自足范围合推并归档任务分支，后续整体polish另行施工。

132项交付manifest已逐字节核对；候选包含原main，`2361a83` Chat actions WIP不在祖先中。历史全量736/736位于0cbbf7e；本次对035134b另行重跑完整套件，结果见下。最初隔离树缺node_modules造成加载失败，接既有固定依赖后重新运行，环境失败记录保留，不当产品缺陷或悄悄删除。

Scope：Summary D1/D2、WORK-3、SD-ENTRY、BE41-A/B。读取[交付回执](../summary-be41-construction-20260911/README.md)及其各阶段非作者范围。Chat actions WIP、Q1/Q3、Chromium147/forced-colors/原生宿主/IME/软键盘/VoiceOver及整体G1–G5等限制保持；新的全量自动测试不等于独立视觉/原生接受。

## 归档规则与召回

本机归档目录约定为 `$CODEX_HOME/archives/Courtwork/convergence-20260911/`，不是新的开发线。`all-refs.bundle`保存清理前全部Git历史，`before.json`记录refs/SHA/worktree，`ref-dispositions.json`区分已消费与archive-only-not-accepted。`uncommitted-backups.json`及tar/patch保全未提交源码和证据；个人凭据与ignored运行数据未复制。

Bundle已通过git bundle verify、完整历史校验。恢复单个退休分支可从bundle显式fetch原refs/heads/<name>到新的codex/分支，再按固定SHA/路径读取；禁止为了恢复一个补丁整树重合历史实现。Chat actions明确召回 `2361a837c23433cc582a386d594dac9a488f377c:evidence/chat-actions-20260911/WIP.md`，尚未接受。

清理只退休已停止且已存档的任务引用。main、冻结legacy来源以及有未提交/正在施工的分支保留；旧worktree目录不强制删除，不删除ignored数据。活动semantic-polish与旧未提交现场是明确例外，不把未完成清理写成零分支。清理清单及最终验证由本次收尾补录。

## 本次最终验证

固定035134b在隔离树重新全量 **736/736**，0失败/跳过/取消（约211.6秒），见[原始全量](full-tests.txt)；[smoke](smoke.txt)通过，未跑真实provider。交付132项manifest逐字节通过，候选包含原main且排除WIP。已有阶段独验仍按其原范围归因，本次集成者全量不冒充重新做了浏览器独验。

## 合推与清理结果

产品035134b已快进main并推送origin，原共享三处dirty状态保持。随后本回执/current作为文档尾提交合推，不改产品树。[清理索引](cleanup.json)记录195条本地引用快照（含临时接收分支）中183条已归档删除，11棵已结束干净工作树仅转detached、文件保留；本接收分支在文档推送后再退休。7条远端任务分支均确认是035134b祖先后删除。PR #2因内容已在主线接收而关闭，不冒充新一次产品验收；没有部署。

保留例外：main；6条archive/冻结引用及codex/fresh-courtwork；正在写入的codex/semantic-polish-prep-20260911；有未提交内容的claude/ic2-controls-b与codex/fresh-web-integration。后三项不并入本次接受；其dirty快照已经保全，现场不改。全量分支不是全部产品完成，独有旧提交只在bundle标为archive-only-not-accepted。

后续整体polish从本次main接收节点起步，先读current与最新用户裁定。Chat actions/WIP按固定SHA恢复到独立工作分支继续Fake UI，不从删除的分支名推断内容已丢失。当前任务的等待heartbeat在合推清理结束后暂停，避免重复执行。
