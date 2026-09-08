# B1 下一能力施工边界

本文件固定顺序与接口，不表示已有后台任务运行。当前状态见 [current](../../current.md)，总协议见 [README](README.md)。

## B1a NDA 与宿主正常续行

从最新 main 重查 SHA/工作树，使用独立 worktree、临时 dataDir 和 port 0。只扩展 benchmark 目录；若生产契约缺陷需改 service/core，先按现有 writer 分工形成独立修复，不让 benchmark 偷渡新 authority。

消费 [NDA 契约](../../../docs/work-core/nda.md)、[共享契约](../../../docs/work-core/contract.md) 和 `app/tests/nda-runtime.test.mjs`、`app/tests/work-continuity.test.mjs` 的实际接口。测试 helper 可用于 loopback host，但新语料/期望不得导入生产 NDA verifier 或开发/holdout fixture 模块作为 oracle。

最小交付：一条合法 NDA 候选→人工裁决→新 Session attach 的正向轨迹；一条替换来源→旧候选拒绝→有效新候选成功的轨迹；保存 HTTP 请求/结果、规范化状态与 raw projection。脚本生成候选不标记真实模型。工作成果接受不等于 NDA 签署/发送。

再添加 producer unload/restart 只读历史，记录旧成果/来源可读、动作不可用；不把不可写当恢复失败，也不把读取历史当完成续行。可执行恢复另测兼容 producer 重新加载。

## B1b 强制中断与回执

复用真实进程 kill 方法，注入提交前与提交后未回执两个窗口。执行前冻结触发点、请求 ID 和预期状态；重开宿主→查询 receipt→同请求 retry，检查仅一个正式效应和未完义务。优先独立故障驱动，不在业务路径增加 benchmark 依赖。覆盖丢通知与真正 SIGKILL，二者分别报告。

## B2 开始条件

B1 的正常与异常控制均可复现、grader 有独立复核；至少准备不同基础事项并冻结样本来源和分组；T/S/E 三种条件使用共同 observable schema 和相同信息/权限，S 具备正常持久化与审批能力。先用少量已获授权真实模型调用量测成本，再决定正式 pilot 规模。未配置/授权的付费运行记 not_run，不读个人凭据填空。

独立复核不得由本实现作者自称完成。任何新增 rubric/样本修订都提升版本，已读/已调优样本不进入新的留出分母。
