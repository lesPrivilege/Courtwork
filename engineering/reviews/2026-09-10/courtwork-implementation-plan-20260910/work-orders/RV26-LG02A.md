# RV26-LG02A · 可重建、固定Generation的exact/lexical检索

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**blocked-by-dependencies**。优先级：P2。

映射原路线：LG-02, ME-01/D06。建议owner：检索作者；独验人不得是作者。

依赖：RV26-LG01C。

## 目标

先用可解释检索验证复用价值，不先引入向量数据库。

## 写权白名单

- `app/intake/index-store.py（新）`
- `app/intake/search.mjs（新）`
- `app/intake/query-contract.mjs（新）`
- `app/tests/review-source-search.test.mjs（新）`

## 实现步骤

1. 最小可用路径为known-ID元数据+literal范围匹配；可重建SQLite索引与Core DB分离，不能写Core正式状态。
2. 词法候选采用SQLite FTS5；英文unicode61与CJK trigram/有界literal路径分开测。短于3字符查询走显式fallback，不把trigram无命中当“不存在”。
3. 构建generation绑定source/rendition/config，完成后发布指针；查询固定generation，不能一页旧版下一页新版。
4. 所有命中在输出snippet前交叉检查Core绑定与当前授权；权限/撤回变化优先于缓存命中。
5. scope/filters/generation/compiler/预算/授权版本进入cache key；返回命中理由、source ref、span、coverage与有界cursor。

## 必须命中的反例

1. 中文两字/三字词、合同编号、大小写、标点、百分号/下划线和FTS运算符注入。
2. 重建中断、旧cursor、新source generation、撤权后旧cache命中、同内容跨Matter。

## 验收

1. exact结果与独立扫描oracle一致；lexical recall/误命中在冻结fixture上单列。
2. 索引删除后能重建同一逻辑视图；未构建完成generation不可见。

## 回退

回到上一合法generation或有界exact read；正式来源/候选/决定不变。

## 必读源头

- [S08 · engineering/research/local-governance-2026-09-09/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/local-governance-2026-09-09/pr-plan.md)
- [S06 · engineering/research/multi-experts-2026-09-10/selection-index.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/multi-experts-2026-09-10/selection-index.md)

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
