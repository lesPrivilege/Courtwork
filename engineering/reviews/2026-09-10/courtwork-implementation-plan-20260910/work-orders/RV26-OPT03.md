# RV26-OPT03 · 第二Runtime：只选Codex app-server一个轴

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**conditional**。优先级：P2。

映射原路线：ME-08, D09/D13。建议owner：Runtime作者；独验人不得是作者。

依赖：RV26-HC04, RV26-HC02。

**条件门：Pi符合性已成立且第二runtime有实际消费者；本轮不同时实现ACP/TUI/MCP App。**

## 目标

证明可替换执行器，不重写Pi、Core或前端。

## 写权白名单

- `app/runtime/codex-adapter.mjs（准入后新）`
- `app/tests/review-codex-conformance.test.mjs（新）`
- `docs/runtime-control/codex-admission.md（新）`

## 实现步骤

1. 固定app-server版本、协议、许可与实际调用入口；按HC04相同capability/permissions/unknown矩阵测试。
2. 保证单控制者与原始身份，native TUI与CW不能同时对同Session发控制。
3. 不兼容字段明确unsupported/lossy，不能为兼容吞掉输入来源/批准或rewrite system prompt。

## 必须命中的反例

1. 重复事件、restart、未知effect、并行控制者、unsupported approvals、producer离场。

## 验收

1. 一条读→候选→人决定→换Session路径经第二runtime成立，Pi仍默认可退。

## 回退

禁用新adapter，按原来源保留历史读取；不把旧runtime任务转移成新任务重放。

## 必读源头

- [S05 · engineering/research/multi-experts-2026-09-10/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/multi-experts-2026-09-10/pr-plan.md)
- [S06 · engineering/research/multi-experts-2026-09-10/selection-index.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/multi-experts-2026-09-10/selection-index.md)
- [S19 · app/runtime/pi-session-runtime.mjs](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/runtime/pi-session-runtime.mjs)
- [S20 · app/harness/child-execution.mjs](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/harness/child-execution.mjs)

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
