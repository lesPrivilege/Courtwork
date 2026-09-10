# RV26-OPT01 · 慢Intake任务消费现有AsyncTasks

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**conditional**。优先级：P2。

映射原路线：AM-B增量, ME-01/03。建议owner：Harness作者；独验人不得是作者。

依赖：RV26-LG01B, RV26-HC04。

**条件门：同步有界Intake已产生可测阻塞，且现有AM-B生产adapter缺口已核定。**

## 目标

只为已测慢读取提供可恢复handle，不把所有工具变成长任务。

## 写权白名单

- `app/intake/async-adapter.mjs（新）`
- `app/server/async-tasks.mjs（仅证明必要的缺口）`
- `app/tests/review-intake-async.test.mjs（新）`

## 实现步骤

1. 只注册有界只读capture/rendition任务，沿现有AsyncTasks execution/delivery分离、cancel/reconcile和scope。
2. 当前Async tools只在特定unbound路径暴露；不得直接塞进Matter-bound/ES complete Run。需要新绑定时先补scope和input coverage合同。
3. 等待A不阻塞已完成B的独立步骤；late/retry回执按原run/call，不投最近Session。

## 必须命中的反例

1. 两任务乱序、重复wait、失联、cancel竞态、撤权、旧binding、生产adapter不存在。

## 验收

1. 仅宣称adapted handle/get/wait，不宣称provider native async或通用scheduler。

## 回退

关闭新adapter，保留历史结果可读；未决任务settle/unknown后再退出。

## 必读源头

- [S09 · engineering/research/architecture-maintenance-2026-09-09/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/architecture-maintenance-2026-09-09/pr-plan.md)
- [S15 · app/server/service.mjs](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/server/service.mjs)
- [S21 · app/docs/coordination.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/docs/coordination.md)

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
