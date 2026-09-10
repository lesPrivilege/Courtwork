# RV26-OUT01 · 一个只读外部消费面：先CLI后MCP选择门

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**conditional**。优先级：P2。

映射原路线：ME-07, AT1, BG-01。建议owner：接口作者；独验人不得是作者。

依赖：RV26-HC02, RV26-HC04。

**条件门：存在实际的第二只读消费者；否则不阻塞首条闭环。**

## 目标

验证第二消费者复用同一Core，而不建立第二权限层。

## 写权白名单

- `app/cli/read-work.mjs（建议新）或一个MCP server模块（二选一）`
- `app/tests/review-external-read.test.mjs（新）`
- `docs/runtime-control/external-read.md（新）`

## 实现步骤

1. 默认先实现本地CLI list/inspect/exact-read，复用同一授权query facade；只有实际MCP消费者确定后才选MCP server，不能同时做两套。
2. 输出versioned DTO、source refs、分页与unavailable，所有scope由已验证caller权限求交。
3. 不要直接暴露CoreClient通用call/op，不开放rawSQL、任意path或accept/resolve。
4. 外部访问令牌不等于Core写能力；不顺手加tunnel/公网服务。

## 必须命中的反例

1. 越权枚举、缓存跨caller、旧token、已撤销来源、隐藏对象计数泄露、任意op注入。

## 验收

1. 第二消费者读同一决定/引用，与GUI一致；没有复制领域状态。
2. 一条CLI或MCP路径可独立复现，未选路径明确not_implemented。

## 回退

关闭外部入口与凭据，Core数据及GUI不受影响。

## 必读源头

- [S05 · engineering/research/multi-experts-2026-09-10/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/multi-experts-2026-09-10/pr-plan.md)
- [S06 · engineering/research/multi-experts-2026-09-10/selection-index.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/multi-experts-2026-09-10/selection-index.md)
- [S22 · docs/work-core/attention.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/docs/work-core/attention.md)

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
