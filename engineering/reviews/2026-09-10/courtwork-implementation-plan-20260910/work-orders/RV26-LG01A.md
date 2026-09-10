# RV26-LG01A · 只读Capture与不可变原始字节

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**blocked-by-dependencies**。优先级：P2。

映射原路线：LG-01, ME-01/D04。建议owner：Intake作者；独验人不得是作者。

依赖：RV26-LG00, RV26-Q03。

## 目标

保存一次可解释的观察，而不是把任意目录扫描包装成原子snapshot。

## 写权白名单

- `app/intake/capture.mjs（新）`
- `app/intake/blob-store.mjs（新）`
- `app/intake/manifest.mjs（新）`
- `app/tests/review-intake-capture.test.mjs（新）`

## 实现步骤

1. 只有显式host选择的root/scope进入Intake；模型拿scopeId，不能传任意绝对路径。
2. 不跟随目录外symlink；对实际打开的文件做身份/大小/前后stat检查并检测变动；race时重试或unstable，不发布complete。
3. 流式计算原字节SHA-256，写专用Intake content-addressed blobs；路径观察、逻辑来源身份和内容hash分离。
4. 先完成不可变blobs及manifest，再原子发布capture；metadata-only对象的contentHash必须为null。
5. 限定文件数、单文件与总字节、深度和总耗时；本轮不解压归档、不递归下载、不写原目录。

## 必须命中的反例

1. 同名改字节、更名同字节、重复副本、读到一半变更、权限失败、路径逃逸与嵌套symlink。
2. 任何异常后用户目录hash不变；未完成manifest不出现在complete目录。

## 验收

1. 重读捕获版本不依赖当前用户路径；删除派生索引不删除raw blobs。
2. Core、ArtifactHistory与Runtime state未被Intake越权写入。

## 回退

关闭capture入口；保留已绑定raw；只清理未发布且未引用的staging。

## 必读源头

- [S07 · engineering/research/local-governance-2026-09-09/README.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/local-governance-2026-09-09/README.md)
- [S08 · engineering/research/local-governance-2026-09-09/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/research/local-governance-2026-09-09/pr-plan.md)

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
