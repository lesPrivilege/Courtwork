# Taste Memory · 本次入账裁定

用户追加的[全文](../../research/ui-ecology-2026-09-11/taste-input.txt)及hash已保存。40来源/4workstream、研究样本数与模型效果是输入作者主张，未持有原始检索结果或复现实验，不记作Courtwork实测。文中的乘法公式是概念框架，不是经过标定的测量公式。

## 本次采纳

沿现有Scout、precedent-map、裁决与证据目录建立四类检索关系，不再新造一套设计权威：

| 资产 | 归属 / 本次Design须返回 |
|---|---|
| Grammar | 现有surface/type/color/material/motion/control合同；明确适用范围、反例、例外与复核门 |
| Exemplars | 版本固定的真实场景、before/after与被拒候选；已shipping只是证据，须有明确裁决才升为先例 |
| Preference Log | 真实比较或明确指令的上下文、裁决者、选项、理由、确定程度、不可推广的范围；不要把所有工程fix伪装成用户A/B投票 |
| Open Taste | 分歧、信息不足、两个都合格的候选与待试验问题；允许defer/no-change，不强行编规则 |

本次one-shot在每个关键候选返回以上四类中的所属项，区分craft错误、情境判断和可接受方案之间的产品偏好。被拒方案和理由一并保留。由Astra在Design回报后确定什么进入grammar、example、后续实验或不改。

## 首条有据记录

| 字段 | 值 |
|---|---|
| ID | CW-PREF-20260911-01 |
| 记录类型 | 用户明确修正指令；非盲测pairwise实验 |
| context | dark theme；Chat和Attention用户消息、composer；持续阅读与输入 |
| 先前方案 | 用户气泡沿用两主题固定暗底，dark中低于阅读面 |
| 指定方向 | 深色composer和用户气泡比阅读面更浅 |
| 裁决者 / 执行者 | 用户 / Astra |
| strength | 未采集，不补填strong或数值 |
| rationale归属 | 用户说此类表面一般更浅；Astra适配现有L2 float，composer已满足、气泡修正 |
| 证据 | [修正前后与测量](../../../evidence/dark-authored-20260911/README.md) |
| 不推广到 | Light原裁定、所有卡片、review语义、overlay材质、全局亮度排序 |
| 接受状态 | 用户方向已裁；具体实现需独立复核和合流回执 |

## 后续实验（未派工）

Consistency、discrimination、agreement、transitivity、predictability可作研究维度，不能把上下文变化或合理不传递性直接记为设计错误。Pairwise模型输出通常是条件于候选/标注者/采样的偏好尺度，不自动得到通用latent空间、因果解释或客观美。

若以后开展Taste Eval，先取得真实有上下文的裁决数据，保留标注者/版本/不确定与无偏好，避免重复变体或同源场景跨训练/holdout泄漏；报告样本数、类别分布、基线、置信区间和留出策略。不得提前宣称78%/82%准确率或模型优劣。当前不训练模型、不搭新产品服务、不创建评分体系。
