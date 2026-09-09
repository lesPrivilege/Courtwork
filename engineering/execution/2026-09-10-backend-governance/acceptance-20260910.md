# BG-01 验收记录

2026-09-10。裁定者 Fable；探查 Sonnet（[EX-BG1](ex-bg1-sonnet-probe.md)，只读）。作者 Astra，固定版本独验 Luna。对象：本地 `main`=`964c37f`，产品 `9a8a13a`，整合 `caa448e`，证据 `a85132b`，合同 [governance.md](../../../docs/work-core/governance.md)，回执 [evidence README](../../../evidence/backend-governance-20260910/README.md)。

## 裁定

BG-01 **有界接受**。接受范围与合同一致：同 owner 对象目录、Matter 披露授权/撤权、global Attention 三步精确读取、Core3/app4→Core4/app5 迁移。授权编辑器 UI、BG-02 Run/attempt、BG-03 外部动作回执不在本次接受范围内；未部署。

## 核对结果

| 项 | 结论 | 依据 |
|---|---|---|
| 写权边界 | `app/web` 零差异；`app/core/attention.py` 零差异；`attention-tools.mjs` 仅追加 | EX-BG1 A1；Fable 复核 `git diff b4e3f71..964c37f -- app/web` 为空 |
| 无第二状态库 | 三张 `matter_disclosure*` 表在既有 WorkCore SQLite，只存政策 JSON，不复制领域状态、来源字节或 Artifact | EX-BG1 A2 |
| 迁移 | 校验旧表 → `O_EXCL` 独占备份 → 单事务发布 schema 与标记；`before_commit`/`after_commit` SIGKILL 反例各一 | EX-BG1 A3 |
| Runtime 不可读政策端点、不可改授权 | HTTP 层 actor 由 host 固定为 `local-user`，请求体注入 `actor` 被丢弃；runtime 路径全部失败统一为 `NOT_FOUND`；adapter 只暴露 `query` | EX-BG1 B4 |
| 撤权不受读预算阻止 | 129 来源反例：`inspect` 报 `GOVERNANCE_LIMIT`，policy-only 查询与 null-hash 撤权仍提交 | EX-BG1 B5 |
| 旧 token / 旧回执 | 旧 `expected_object_version` → `VERSION_CONFLICT`；撤权后重放旧回执返回原回执，授权不复活 | EX-BG1 B6 |
| 隐藏字段不影响 registry hash；描述符 integrity=unchecked，正文读取逐字节校验 | 已确认 | EX-BG1 B7、B8 |
| 定向 21/21 | 日志与三份测试文件名 1:1；Sonnet 重跑 21/21，4.0 s，工作树无变化 | EX-BG1 C9、D |
| 全量 467/467 | 日志尾部 467/0/0/0 | EX-BG1 C10 |
| 独验 | 固定 `caa448e`，`git archive` 到临时目录，五项探针均为真实断言；Sonnet 重跑 PASS | EX-BG1 C12 |
| packets 无敏感字段 | grep 零命中 | EX-BG1 C13 |
| 遗留标记 | 新文件无 TODO/FIXME/skip/only | EX-BG1 E16 |

## 非阻断事项

1. `integration-tests.log` 无命令行、并发参数与 SHA 头；"concurrency 2、针对 `caa448e`"仅见于 README 叙述。此后证据日志宜在首行记录命令、并发与工作树 SHA，使日志自证。
2. 默认并发的中断全量跑中，六个超时里两个是治理测试（`runtime adapter rejects…` 19.2 s，`migration refuses…` 6.4 s）；`timeout-recheck.log` 的 19/19 未覆盖这两项，它们在并发 2 全量与 Sonnet 重跑中通过（0.59 s / 0.83 s）。属并发负载敏感，非产品缺陷；后续 CI 并发设置需考虑。
3. 合同持久化一节未引用崩溃中断 action 的测试（已实现并通过）；可在下次合同修订时补引。

## 后续

- BG-02 Run/attempt、BG-03 外部动作回执按认领文档既定顺序推进；授权编辑器 UI 走前端单 writer 队列。
- 未部署；部署另按 Courtwork 部署门执行。
