# PM 垂类契约

状态：现行包级产品契约。实现位于 `packages/pm-schemas`；ABI-2B 先将四类 schema/presentation 迁入唯一 Package ABI，保持 catalog-only，不提前声明尚未接通的场景与提示词。通用机制仍以 architecture 与 ADR 为准。

## 一、反馈归集

FeedbackDigest 把多来源反馈聚合为可追溯条目。无法可靠归类的输入进入 `out_of_coverage`，不得硬塞进任一主题。来源等级沿用底座机制，但显示词表由 PM 包提供。

## 二、PRD 评审

PRDReview 使用封闭的六类缺陷维度，并逐条承载来源、判断、建议和确认状态。确认、驳回与修正通过 RevisionEvent 生效；界面不得直接显示 wire 枚举。

## 三、优先级与确定性计算

RICE 等公式由确定性代码计算，不交给模型心算。低置信度输入输出区间而非伪精确单值；排序永远标为建议，最终裁决在人。

负责人、时间与状态变化以显式字段和历史留痕表达，避免“上周说好的事项”在摘要中消失。

## 四、跨纪要行动项

ActionItem 以稳定 id、负责人、截止时间、来源和处置状态跨会议串联。矛盾、逾期与负责人更迭使用结构化 marker，不靠自然语言或颜色猜测。

信源文案、缺陷词表、打分区间与 renderer 归 PM 包所有；core、desktop 和通用 schema 不得内置 PM 语义。

ABI-2B 的 presentation 使用 JSON Pointer：主集合从 artifact 根寻址，字段从集合条目根寻址；枚举/状态/标记/分级的显示词随字段声明。PM 的最终 schema 可以保存系统铸造的 SourceAnchor，但在 draft schema 与 citation binding 落地前，不得把这些 artifact 接成模型输出场景。
