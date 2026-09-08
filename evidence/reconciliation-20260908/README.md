# 清账、merge 与目录冻结

2026-09-08，用户同意清账、merge、push CourtWork，并按原定计划freeze旧目录。

- 已验证产品载荷：`2c2f3fbbefcbedb5c580d0e013bb6e4f2d7ee4fc`；联调与远端146/146、恢复/启动回执见 [上一节点](../final-integration-20260908/README.md)。
- 待提交Pages准备文件从原fresh checkout按原字节保存，固定为`6799ef6`，通过真实no-ff merge合流：`13f15dc445c2d4078d07d001ce98078eb8c0463e`。来源hash见`sources.json`。这些是准备材料，不代表Pages实现或发布；原研究快照末尾空白原样保存。
- 已有Fable intake/user-message audit已在联调节点接收。copy-convention差异为联调权限文案澄清，delivery差异按最终Fable交付保留，不用旧副本覆盖新修订。
- 原暂停轮UI修改已由后续联调修订承接；暂停轮patch/证据和原fresh未提交文档另作仓外私有归档，hash见`private-archive-hashes.json`。不删除、不stash、不重置原writer文件；遗留dirty是已保存历史输入，不是当前开发入口。
- 干净集成worktree迁到持久开发目录`Courtwork-current`；停止使用临时集成路径作为handoff入口。候选远端仍为`codex/fresh-courtwork`。
- Legacy目录`Courtwork`新增本地`FROZEN-LEGACY.md`入口标记，停止产品开发/运行；原跟踪字节、既有未跟踪文件及共享Git元数据保留。冻结是工作约定，不对共享Git目录chmod或施加不可写标记。
- legacy本地/远端main与archive/courtwork-main仍固定`f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`。按原计划T4仍为独立节点，本次合并到fresh候选；未部署、未改Paper、未接管main。

验证：产品app/tests/brand相对已远端测试提交无diff；45个源码hash一致。新增准备文档的本地链接与JSON检查；本节点不重复运行未变更产品测试。最终推送后再次从远端核对merge祖先与固定源码，结果由交付消息给出。
