# RV26-LG01B · 有界Rendition：UTF-8文本与文字层PDF

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**blocked-by-dependencies**。优先级：P2。

映射原路线：LG-01, ME-01/D04。建议owner：Intake/extractor作者；独验人不得是作者。

依赖：RV26-LG01A。

附加约束：pypdf是本报告新增有界候选，非仓库已有依赖；版本/许可门通过后方安装。

## 目标

让抽取结果可以定位和失效，但不把抽取成功当成专业正确。

## 写权白名单

- `app/intake/rendition.mjs（新）`
- `app/intake/extractors/text.mjs（新）`
- `app/intake/extractors/pdf_worker.py（新）`
- `app/intake/requirements-pdf.lock（新）`
- `app/tests/review-rendition.test.mjs（新）`

## 实现步骤

1. 文本reader严格UTF-8；保持BOM/换行原貌与原字节hash；模型/界面span统一Unicode code point，JS UTF-16转换在边界处理。
2. PDF候选锁定pypdf6.18.0（BSD-3-Clause），安装在独立extractor环境，不让Core启动依赖它；采纳前校验版本/许可/hash。
3. 只支持允许的文字层PDF，逐页存text与page map；bbox未验证时为null，不制造视觉精确定位；扫描件不偷偷OCR。
4. worker输入为捕获blob而非任意路径；总超时、输出/内存/页数预算；资源限制不是OS安全沙箱，不宣称可安全运行任意插件。
5. cache key=rawHash+extractorVersion+configHash；failed/partial/unsupported单列，空文字不是complete语义抽取。

## 必须命中的反例

1. 中文、跨页、连字、旋转页、重复页码、无文字层、恶意膨胀流、损坏/加密PDF。
2. 相同版本命中；换版本/配置失效；半途失败没有complete标记。

## 验收

1. text span能回到固定rendition和原始PDF页；抽取误差与gold人工核验分列。
2. PDF不可用时文本基线和Core正常启动，UI诚实显示unsupported。

## 回退

停用PDF adapter并只删其派生缓存；保留raw、曾使用的rendition版本和已记录决定依据。

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
