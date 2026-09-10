# RV26-REL01 · 现有NDA真实闭环：独立于新平台路线收G1–G5

审查基线：`0c60f4ffe0e4d939712df3910d2404c226e8bfdf`。状态：**blocked-by-dependencies**。优先级：P1。

映射原路线：G1–G5, H0–H3。建议owner：集成+非作者验收；独验人不得是作者。

依赖：RV26-Q01, RV26-Q02, RV26-Q04, RV26-HC04。

附加约束：真实provider调用与发布各需用户明确授权；本包不代为执行。

## 目标

不要等LG/Spark/多专家全部完成才验证今天已有产品。

## 写权白名单

- `evidence/real-vertical-20260910/**（新）`
- `engineering/current.md`
- `README.md/Pages事实清单（仅证据更新）`

## 实现步骤

1. 在干净独立clone用合成NDA；按README启动，用户在GUI显式配置其授权provider，不读取个人CLI凭据代劳。
2. 模型产生候选→人核对来源/未决→accept或要求证据→新Session继续同Matter；保留真实错误/取消/重启分支。
3. 使用同一或源码等价且可证明的产品SHA采集UI与结果，不混剪不同实现版本。
4. 按照G1启动、G2正式工作、G3连续性、G4公开演示、G5事实一致逐门记录，不以测试数替代。
5. 真实provider/浏览器/平台未测则门保持open；只在用户授权后录制/发布，不改部署开关。

## 必须命中的反例

1. 重复决定、旧版本、伪actor、producer卸载、网络丢ACK、Rununknown。

## 验收

1. 已有闭环可独立验收；新LG/Spark路线不是所有G门的默认前提。
2. 公开叙事只覆盖实际测得能力与合成专业场景。

## 回退

撤回不成立的对外声称；保留失败证据，数据库不为录制而清洗。

## 必读源头

- [S01 · engineering/current.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/current.md)
- [S23 · docs/work-core/contract.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/docs/work-core/contract.md)
- [S28 · engineering/execution/2026-09-08-main-round/public-readiness.md](https://github.com/lesPrivilege/Courtwork/blob/0c60f4ffe0e4d939712df3910d2404c226e8bfdf/engineering/execution/2026-09-08-main-round/public-readiness.md)

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
