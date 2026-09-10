# RV26-LG02B · 有界资料工具与Context manifest

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**blocked-by-dependencies**。优先级：P2。

映射原路线：LG-02, M03/M09。建议owner：Harness/Core接缝作者；独验人不得是作者。

依赖：RV26-LG02A, RV26-Q01。

## 目标

模型只获得有授权的定位器和预算内证据，不得到全盘目录或一份无法溯源的摘要。

## 写权白名单

- `app/intake/tools.mjs（新）`
- `app/intake/context-manifest.mjs（新）`
- `app/core/owner.mjs（限定context接缝）`
- `app/runtime/control-tools.mjs（必要接入）`
- `app/extensions/work-adapter.mjs（限定接缝）`
- `app/tests/review-context-evidence.test.mjs（新）`

## 实现步骤

1. 新增工具概念read_source_range/search_sources/list_sources，实际名字在合同冻结时与现有se_*命名对齐；host绑定scope，不接受caller注入actor/Matter。
2. manifest包含选入/排除原因、source/rendition/generation、精确span、读取ledger与未读范围；工具回执可核验。
3. 保留现有24k JS字符元数据硬门；tokenBudget另设unit/tokenizer/version/estimate，不把text.length写成tokens。
4. 短期不得截断blocking obligations、conflicts、unknown effects以满足预算；超预算显式拒绝或使用有合同的逐步披露。
5. ES file coverage对新输入仍按现有observer保守标unknown；没有独立证明前，不向ES已宣称complete路径注入这些新工具。

## 必须命中的反例

1. 非BMP字符分页、超限cursor、作用域伪造、过时generation、已撤销grant。
2. 预算不足时未知仍未知；“未检索到”保留coverage而非输出绝对否定。
3. 配置变更或撤权后prefix影响可追溯；UI-only变更不改变模型输入。

## 验收

1. 同一查询scope与版本可重放；每段模型证据可回到持久来源。
2. 工具read permission与Matter accept authority无混淆。

## 回退

禁用新工具，恢复原se_read_source/artifact路径；已记录context manifest保留历史可读。

## 必读源头

- [S08 · engineering/research/local-governance-2026-09-09/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/local-governance-2026-09-09/pr-plan.md)
- [S18 · app/core/owner.mjs](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/core/owner.mjs)
- [S23 · docs/work-core/contract.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/docs/work-core/contract.md)
- [S19 · app/runtime/pi-session-runtime.mjs](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/app/runtime/pi-session-runtime.mjs)

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
