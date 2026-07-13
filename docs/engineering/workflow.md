# 工程工作流

状态：现行定本

## 角色

- 架构：拍板 schema 语义、跨层接口、ADR 与验收标准；不承担同工单验收。
- 实现：只实现工单和 SPEC 划定范围；跨层变化先提案。
- 验收：独立会话实测；可修实现级小缺陷，但不得改契约。

同一工单的实现者与验收者必须不同。模型名称不绑定角色，工单任命才绑定角色。

## 开工

依次读取：`CLAUDE.md`、相关 ADR、本层 `SPEC.md`、直接依赖层的公开契约。先复述范围和不变量，再写失败测试。

## TDD 与门禁

1. 用测试或静态守卫证明缺口会红；
2. 做最小实现；
3. 跑定向测试；
4. 跑包级测试与 build；
5. 完工跑全仓 `pnpm -r build`、`pnpm lint`、`pnpm test`；
6. desktop 行为变更再用隔离端口跑完整 Playwright；
7. 契约变更 grep 全部消费点。

测试数字必须来自完整实跑原始输出；`--list`、选择性运行、缓存或实现者自述不能替代验收。

## Git 纪律

- 多 worktree 环境下，历史复核必须用独立 worktree；共享树禁止 checkout 历史 SHA 或 stash 他人工作。
- 禁止 `git add -A`、`git add .` 和宽通配暂存。
- 逐文件显式暂存，立即检查 `git diff --cached --name-only`，然后尽快提交。
- 混合文件用 `git add -p` / cached patch + 裸 `git commit`；只有整文件完全归本会话时才可 pathspec commit。
- 不重写共享历史。误吞他人内容时前进式修正并如实记录。
- 每枚提交必须在自身 tip 上通过它触及的门禁，不能依赖未来提交补产物。

## 验收

- 使用 clean worktree 和独立 dev-server 端口；`reuseExistingServer` 不得连接共享服务。
- 验证 drift/guard 时实际注入反例并观察变红，再撤除反例恢复全绿。
- 报告写入对应层 `ACCEPTANCE.md`，明确回答是否放行。
- 清账同时满足：提交是 `main` 祖先，且 SPEC/ACCEPTANCE 有留痕。

## 文档

工单过程不再追加到中央大册。跨层决定进 ADR；层内状态进 SPEC；验收证据进 ACCEPTANCE；全局当前态只进 `docs/status/current.md`。
