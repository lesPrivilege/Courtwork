# Spark Surface · SP0 前端先行样本

2026-09-10，用户要求从前端施工补Spark UI，可用Design Scout与Luna explore。Astra在现有隔离分支、产品基线 `8b1e0b143f7091da0acba3ee24af58595e721eb8` 上实现。**已交付可交互SP0，未接产品后端、未加生产入口或scheduler。** [原始输入](inputs/spark-surface.txt)完整保留；原文“66结果/6workstream”属于转交材料自述，本轮只做[六项定向Scout](scout.md)。

## 打开与阅读

在仓库根启动 `python3 -m http.server 4387 --bind 127.0.0.1`，打开 [SP0 页面](http://127.0.0.1:4387/engineering/design/spark-surface-2026-09-10/index.html)。[index.html](index.html)加载当前仓库CSS角色token与同一静态icon sprite，不改`app/web/**`，不引依赖。

- 顶部切S0–S8、明暗主题；左侧试验Today/Attention/Spark同级关系，Matter切换是样本scope。
- Overview：维护变化、Context path、Work mix、Attention引用与最近活动。
- Activity：类型/scope/时间窗过滤；Inspect → Technical trace / Ask about this（仅准备问题与refs）。
- Reports：日/周报告与来源活动；数字来自同一过滤后的固定记录。Candidate outcomes另列当前cohort。
- Usage：按UTC日的维护check次数、固定刻度、键盘/触摸检查、精确表、模型input/output与Unavailable项。
- Controls：scope/trigger/capability、model tier/budget/retention/privacy、草稿保存/冲突/拒绝；仅页内样本状态。Preview run只切换Working场景。

[接缝与计量](projection-contract.md)记录每个字段的owner与缺口；[施工交接](construction-handoff.md)定义SP0→真实读面→Controls的分片；[验证](verification.md)分开作者UI检查与Luna只读来源/数据复核。

## Astra裁决

1. **Attention与Spark同级入口先作为可用设计候选。** Attention显示需要人的事项；Spark显示维护事实。Routine activity不增加Attention badge。生产常驻入口仍进入现有Home/composer单writer队列，不在本样本抢写。
2. 保留五个surface；trace只做下钻。Overview先解释有何改变，Usage后放技术指标，Reports只投影已有事实。
3. Context Funnel收窄为**Context path**：四个阶段的数值有各自scope/内容，不画假定单调递减的漏斗，不显示“97.8%被排除”或收益百分比。原材料的 Relevant index 单独阶段后置，等待可定义的计量。
4. Work mix按互斥的maintenance operation计数；human decisions是另一类责任，不能与机器操作混成成本占比。fast/strong只是fixture分类，不按模型名/价格推断。
5. Promotion Funnel收窄为当前candidate cohort的outcome表。Schema validity、evidence sufficiency、正式接受是不同轴，不按一组假漏斗互相相减；现有Core未提供通用事件时钟，生产期内conversion后置。
6. “Since you were away”暂以明确UTC窗口的“What changed”呈现。没有Spark last-seen cursor，不借Attention.seen推断用户未读维护。
7. Controls不拿数值范围自动生成slider；first layer是意图与scope，高级层才预算/保留/隐私。Budget/paused/schedule均为**合成未来语义**，不改当前生产词表为已实现。

## S0–S8

| Scene | 首屏事实/反例 | 样本用途与限制 |
|---|---|---|
| S0 Quiet / healthy | 只有无变化检查；不生成report或Attention item | 演示no-op silence，不自动删除或archive技术历史 |
| S1 Actively maintaining | Working，无测量分母，不画progress | 已完成计数与在途记录分开 |
| S2 Maintenance completed | 正常来源变化、派生刷新与索引结果 | Completed是执行状态，不是accepted |
| S3 Source drift | 新版本影响旧notes；保留历史 | 派生失效不自动成为human Attention |
| S4 Human review | 两个当前needs_you引用 | 只读，不创建/resolve/approve真实对象 |
| S5 Partial / recovery | interrupted read为Unknown，计数下界、缺测明确 | 不重放工具，不把unknown当failure或success |
| S6 Budget exhausted | model work等待，deterministic可继续 | 生产无此Spark预算合同，fixture-only |
| S7 Paused | 新维护暂停，旧记录可读 | 生产无Spark paused字段；暂停不意味着取消在途 |
| S8 Empty | 尚未开始；进入scope样本 | 无真实账户、模型或来源接入 |

该样本沿[多专家/long-life研究](../../research/multi-experts-2026-09-10/README.md)的ME-01/03/06/09提供M10/M11输入。它只发现消费者所需事实，不能决定新的canonical Spark store或越过现有Core/Attention/Runtime owner。未合入main、未部署、未宣称独立产品接受或G1–G5完成。
