# Git分支清理 · 2026-09-15

用户要求派Luna explore，并仅保留一个已冻结分支。Astra按[main接管记录](../../../evidence/main-cutover-20260908/README.md)确认：保留开发主线`main`和冻结浏览分支`archive/courtwork-main@f9ade85`；冻结tag `archive/courtwork-pre-takeover`及其他历史tags不在分支删除范围。

[清理清单](branch-cleanup-20260915.json)记录原SHA、main祖先关系与工作树校验。删除34个本地分支和5个远端分支，清除8组失效branch tracking配置。远端使用原SHA lease的atomic删除，本地使用预期SHA条件事务；没有改写main历史或冻结对象。

清理前在Git外创建并verify完整branches/remotes/tags bundle，清单保存SHA-256和备份目录名；其中10个非main祖先分支同样已保全。恢复可从该bundle按原ref获取对象，不需要保留活动分支列表。

26棵关联工作树保持原HEAD，仅解除symbolic HEAD与分支关联；12棵含未提交修改。前后HEAD、status、index与tracked diff哈希一致，未checkout/reset或修改工作文件，未删除任何目录。此前Composer与RD-006施工内容仍在其原目录，以detached HEAD保留；接续从[RD-006](../../research/RD-006-deferred-workspace-binding.md)与当前owner记录开始。本操作不是把未完成施工合入main。

Luna执行有界只读分支/冻结来源核对，Astra负责保全、元数据清理与远端操作；Luna最终独立核对本地/远端仅两分支、冻结tag仍解析到原SHA，92棵worktree元数据保留且仅main仍附着分支；未进入legacy/fresh内容。产品源码不变，仅运行文档链接/diff及Git状态检查，不重复产品测试。
