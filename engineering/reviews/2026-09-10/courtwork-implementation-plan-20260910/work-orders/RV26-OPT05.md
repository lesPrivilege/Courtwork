# RV26-OPT05 · Runtime持久化Backend替换门

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**conditional**。优先级：P2。

映射原路线：M06, ME-09。建议owner：持久化作者；独验人不得是作者。

依赖：RV26-Q05, RV26-Q03, RV26-HC04。

**条件门：Q05预注册门失败且小范围措施不能满足已确认目标规模。**

## 目标

只有测得全量JSON写放大阻塞目标规模，才替换执行存储实现。

## 写权白名单

- `app/server/store.mjs（保持公共接口）`
- `app/server/runtime-store-backend.*（准入后新）`
- `app/tests/review-store-conformance.test.mjs（新）`

## 实现步骤

1. 以相同Store API/事件排序/command receipt/迁移和恢复反例作为符合性合同；不是迁移Core权威或增加第二execution owner。
2. 先比较有限batch与单owner SQLite实现；合并stream delta不得丢失治理所需边界/进度恢复。
3. 选择单次切换：旧JSON精确备份只读，新backend单写；不长期dual-write、不两边任选真源。
4. 如果SQLite解决目标瓶颈，无理由捆绑Rust/桌面壳/完整event-sourcing重写。

## 必须命中的反例

1. 迁移中断、旧host、双writer、重复command、顺序/cursor、schema缺字段、备份冲突。

## 验收

1. 在Q05同设备/规模/任务下证明确有收益且全部语义反例不退化。

## 回退

回到匹配旧host和独立备份目录；切换后新增历史需明确导出/不可回退边界。

## 必读源头

- [S13 · app/server/store.mjs](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/server/store.mjs)
- [S16 · app/core/core.py](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/core/core.py)
- [S29 · app/server/runtime-lock.mjs](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/server/runtime-lock.mjs)

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
