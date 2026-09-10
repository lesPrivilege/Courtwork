# RV26-OPT04 · 外部副作用与Intent/Receipt恢复

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**conditional**。优先级：P2。

映射原路线：BG-03, ME-06后续。建议owner：Core/connector作者；独验人不得是作者。

依赖：RV26-AT02, RV26-HC04。

**条件门：有真实外部写消费者、明确授权与可测试provider；只读Attention阶段不得实施。**

## 目标

只为一个真实外部写动作建立明确授权与未知结果恢复。

## 写权白名单

- `现有Core owner内的领域intent/outbox模块（准入后）`
- `单一外部connector adapter（准入后）`
- `app/tests/review-external-effects.test.mjs（新）`

## 实现步骤

1. 先选择一个效果动作及scope，如发一封邮件或提交一个GitHub review；禁止通用arbitrary action。
2. 人工批准精确参数/版本与idempotency key，intent先在现有owner持久化，执行/delivery/正式工作决定分开。
3. 远端支持幂等/查询则核对；不支持则unknown交人，不用重新执行来探测旧执行。
4. 副作用撤销是补偿合同，不等于配置rollback或删本地记录。

## 必须命中的反例

1. 外部成功本地ACK丢失、intent后未dispatch、重复callback、scope撤销、来源换版、cancel/成功竞态。

## 验收

1. 不宣称跨远端exactly-once；未知结果可定位、可解释、不会自动重复外发。

## 回退

停止新增dispatch，保留intent/receipt并核对未决；不删除outbox来“回滚”。

## 必读源头

- [S09 · engineering/research/architecture-maintenance-2026-09-09/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/architecture-maintenance-2026-09-09/pr-plan.md)
- [S22 · docs/work-core/attention.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/docs/work-core/attention.md)
- [S05 · engineering/research/multi-experts-2026-09-10/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/multi-experts-2026-09-10/pr-plan.md)

## 每单通用执行纪律

本编号是审查派工别名，不替代仓库正式编号。开工前读取实际AGENTS、current、关联原工单与本单sources；检查新HEAD是否已经完成其中内容。只能在明确分配的独立worktree与合成dataDir施工。上述“新”路径均为建议落点，先确认未被后续分支占用；调整路径需写回派工清单。

实现步骤是本次建议，**不是现有API声明**。任何schema/action变更先由唯一owner预留版本、冻结合法/非法fixture、迁移与回退。一个共享文件同一时刻只有一个writer；backend/Core修改串行合流，前端沿原单writer队列。不得整仓format、升级整套Pi、改Paper、扫描个人目录、读取凭据、调用真实provider或发布站点。

验收必须在作者之外的独立树执行：逐项写command、expected、actual、code SHA、fixture hash及not_run。作者自测不叫独验；mock不证明真实模型质量，process-kill不证明断电耐久性，功能合流不等于产品发布。每张PR关联一个语义单元，可包含紧耦合测试与合同，不能以“改动行数少”替代边界。

## 交付回执

```yaml
status: proposed | implemented | verified | blocked
base_sha: <actual>
code_sha: <actual>
original_work_order: <repo-id and path>
author: <name/session>
independent_reviewer: <different person/session>
worktree: <isolated>
fixture_hashes: []
commands: []
negative_cases: []
schema_changes: []
rollback_exercised: false
not_run: []
limitations: []
```
