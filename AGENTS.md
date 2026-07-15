# Courtwork 会话治理

唯一工程总纲是根目录 `CLAUDE.md`；本文件只规定多会话角色与提交纪律。两者冲突时以 `CLAUDE.md` 为准并上报。

## 三条不变量

1. **实现与验收分离**：同一工单的实现者和验收者必须是不同会话；任何会话不得验收自己或前身会话的实现。
2. **契约拍板属于架构角色**：schema 字段/语义、跨层接口、ADR 与 SPEC 验收标准只能由架构角色决定。实现或验收会话只能标记 `[需架构拍板]`。
3. **纪律对所有模型一致**：角色由工单任命，不由模型名称决定；TDD、边界、门禁与提交卫生一视同仁。

## 架构角色与续行

- 接手或 reconnect 时，先核对 `git status --short --branch`、HEAD 与 `main` 的关系及近期提交；不得用旧聊天或遗留 worktree 推定当前事实。
- 固定读取顺序：`CLAUDE.md` → `docs/README.md` → `docs/status/current.md` → `docs/architecture/implementation-readiness.md` → 相关 roadmap / ADR / `SPEC.md` / `ACCEPTANCE.md`。
- `current.md` 是唯一能力状态真源，implementation-readiness 是唯一开工项与依赖图，roadmap 只定义阶段条件；`archive/`、commit message、调研原稿与聊天记录仅作证据或线索。
- 派单前由架构角色把关键决策、字段、依赖、验收标准和禁止范围写入 ADR / SPEC / implementation-readiness；调研只能提供建议，不能形成隐含契约。
- 工单至少携带：编号、权威文档、依赖、精确层级或文件范围、验收证据、禁止扩张项。完成后更新对应 SPEC / ACCEPTANCE；只有能力成熟度或发布事实变化时才更新 `current.md`。不得把轮次状态或工单清单复制进根治理文件。
- 仓库事实与交接叙述不一致时，以可验证的仓库状态为准并显式上报差异，不得静默补写或重构历史。

## 实现角色

- 只做工单与 SPEC 的范围；跨层需求进入相关层 SPEC 的 TODO/提案区。
- 先写失败测试，再实现；完工更新本层 SPEC，等待独立验收。
- 只有“本工单被阻塞、语义等价、不动契约/导出、在对方 SPEC 留痕”同时成立时，才可做跨包实现级修复。
- 完工以全仓 `pnpm -r build` 为最低构建证据；契约扩展必须 grep 消费点。

## 验收角色

- 使用独立 clean worktree；历史复核不得在共享树 checkout SHA 或 stash。
- 使用独立端口自起服务，禁止复用共享 Playwright dev server。
- 不采信实现自述；测试数字来自完整实跑，drift/guard 必须实际注入反例观察变红。
- 实现级小缺陷可独立提交，message 前缀 `fix-by-acceptance`；契约级问题不得修改。
- 报告写入对应层 `ACCEPTANCE.md`，明确是否放行。

## Git 纪律

- 禁止 `git add -A`、`git add .` 与宽通配 add。
- 显式逐文件暂存；commit 前必须检查 `git diff --cached --name-only`。
- 同文件混有他人改动时，用 `git add -p` 或 cached patch 手术暂存，再裸 `git commit`。
- 仅当文件工作树内容完全属于本会话时，才可使用 pathspec commit。
- 暂存到提交的窗口保持最短；发现非本会话文件先撤出索引。
- 永不重写共享历史。误吞时前进式修正并如实记录。
- 每枚提交必须在自身 tip 上通过所触及门禁，不得引用未来提交才出现的产物。

## 清账与重复派单

- 清账同时要求目标 SHA 是 `main` 祖先，且 SPEC/ACCEPTANCE 有留痕。
- 工单重复领取时，后到会话先核对 HEAD 与提交史；已完成则转独立复验，不重做。
- 未提交工作树不等于分支，不得由其他会话代为“合入”。

完整操作说明见 `docs/engineering/workflow.md`。
