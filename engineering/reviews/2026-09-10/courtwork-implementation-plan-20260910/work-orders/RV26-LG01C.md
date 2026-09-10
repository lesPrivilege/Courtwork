# RV26-LG01C · 原始Capture到现有Core来源的原子绑定

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**blocked-by-dependencies**。优先级：P1。

映射原路线：LG-01/03, M05/M07。建议owner：Core作者；独验人不得是作者。

依赖：RV26-LG01B, RV26-Q01, RV26-LG00。

## 目标

Intake持有确切字节；Core仍独占被选来源集合、版本与接受依据。

## 写权白名单

- `app/core/core.py（来源绑定事务接缝）`
- `app/core/bridge.py`
- `app/core/client.mjs`
- `app/extensions/work-adapter.mjs（精确接缝）`
- `app/intake/core-binding.mjs（新）`
- `app/tests/review-source-binding.test.mjs（新）`

## 实现步骤

1. 由host持有project/Matter与grant，把selected rendition text映射到既有Core source id/version/digest；Core的text digest绝不能被raw PDF hash替换。
2. 必要时在同一Core数据库增加app-owned provenance映射：matter/source-set revision/source/version→capture/rawHash/renditionHash/config；不新建平行Source acceptance服务。
3. 来源membership、provenance映射与绑定receipt同一SQLite事务；不能先调用会commit的replace_sources再写映射并宣称原子。
4. 先durably保留raw/rendition，再提交Core绑定；跨文件系统/SQLite不声称单一事务。崩溃留下可回收未引用blob，不留下已接受但缺字节的引用。
5. source-set发生变化继续使用现有保守STALE_INPUT/CAS规则；不因某span hash未变就自动绕过旧候选过时检查。

## 必须命中的反例

1. 绑定前/事务中/commit后ACK前崩溃；同request重放和改内容冲突。
2. 跨Matter/project、错误raw/text digest、撤权、来源换版、独立原路径删除。
3. 含新表时严格迁移与旧host拒绝；旧receipt hash不重写。

## 验收

1. 新Session与producer缺席情况下，仍能检查已保留来源与映射。
2. 正式接受链依旧为Candidate→可信决定→Artifact，不将manifest发布视为accept。

## 回退

禁止新增绑定；旧绑定保持可读；带schema迁移只能用匹配版本的独立目录恢复。

## 必读源头

- [S08 · engineering/research/local-governance-2026-09-09/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/local-governance-2026-09-09/pr-plan.md)
- [S16 · app/core/core.py](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/core/core.py)
- [S17 · app/core/bridge.py](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/core/bridge.py)
- [S23 · docs/work-core/contract.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/docs/work-core/contract.md)

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
