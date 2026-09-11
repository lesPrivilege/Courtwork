# Spark命名参考 · 小单裁决

2026-09-11 / Astra；当前main `3f5daf41aba918622b1ca7a3534eccf81ecfd562`。用户转交[CW Spark 定义](https://chatgpt.com/c/6aa3aad6-c9cc-83ec-b396-7d68b0598543)，请求参考；本次读到完整2turn/4消息，另有1张附件图未消费。以下为摘要与裁决，不是原文归档。

来源定位：用户turn `74048ba7-be6c-4bd2-a44b-ef0ad226a870`、`f06733e1-78c0-423c-98da-a1469d49309d`；assistant消息 `71eddd1e-f748-44dd-bdbc-801c6f78bccd`、`e60aa921-3348-40dd-a8d0-08bcb204b0ba`。讨论从模型命名联想到CW，建议稳定产品名独立于模型档位，并扩展为Spark后台自治、Attention人工介入及双向续行。

| 输入 | Astra裁决 |
|---|---|
| 稳定产品名与可替换模型分层 | **采纳**。CW Spark属于产品语义；provider/model名称在选择器与trace保留完整身份，不因同名禁止或改名 |
| Spark不等于快模型/fast mode | **采纳**。产品无需另造Flash/Lite/Turbo同义档位；实际模型选择按catalog能力，不从名称推导速度或权限 |
| Spark = autonomous background work | **收窄**。现roadmap定义为资料与派生维护责任；自治发现/执行可作长期方向，不能吞并所有后台任务、Home activity、Usage或通用runtime控制 |
| Attention = human-required work | **修订**。Attention组织需要关注、筛选或动作的对象；不能把每个对象都等同于必须人工介入，也不只接收Spark异常 |
| Spark → Attention → resolved → resumes | **仅候选流程**。重新运行须依实际owner、权限、当前版本与效果回执；resolved不自动授权resume，更不能重放未知外部效果 |
| 完成后沉淀Matter / Event Log | **分开**。执行记录由Run/日志owner保存，候选不自动成为Matter正式成果；commit仍走Core Review/Authority边界 |
| scheduler、周期报告、完成量、节省操作、控制开关 | **沿ME-03/04与既有后端路线探索**。需真实owner/测量/执行合同，不由本参考新增按钮或派单 |
| Google命名、Codex Spark退役/定位评价 | **未核验、不消费为论据或公开文案**。不需要判断其他厂商命名优劣来支持CW本地命名纪律 |

可用于当前说明的表述：**Spark 围绕稳定来源组织资料与派生维护，让变化与需要处理的对象可见。** 这是职责说明；当前实际交付是BE-41只读派生投影与现行Spark表面，不声称自动重建/调度/恢复已接通。

依据：[主roadmap](../../roadmap.md)的ME-03/04及资料维护边界、[SP集成裁决](integration-ruling.md)、[BE-41 DTO与后续补充](be41-dto.md)、[Design正式裁决](../se-control-one-shot-2026-09-11/return-intake.md)。历史SP/DTO开头的“未实现”是原时点；最新接收看[current](../../current.md)。

本单仅补命名参考与边界，不改Spark定义owner、不开新PR工作流、不改变Claude绘图范围，不改App/Pages或部署。Claude可消费命名分层与上述候选/已实现标记，不把参考中的自治闭环画成现行能力。

## 有界语义工作补充 · 2026-09-11

[新定义登记](../../research/spark-product-definition-2026-09-11/README.md)消费4轮7消息及用户直接补充：持续准备由有界局部工作组成，翻译可直接唤起；第一阶段是Harness Core受限profile，DeepSeek为首个适配目标。复用既有权限机制但限制授权，不删除Run/恢复记录，不改变现SP/BE-41交付状态。定义已接入最后一轮Design单。
