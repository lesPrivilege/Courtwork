import * as z from 'zod';

/**
 * 信源分级——机制是底座既定（docs/20），等级语义属包（docs/61 §4.1）。
 * PM 包换词表（docs/62 §〇）：
 *   A = 容器内原文（反馈/纪要/指标导出，带锚）
 *   B = 结构化导入 / 企业内部库（Stage 后话）
 *   C = web 竞品材料（verified:false 族，进对外产出须逐条确认）
 *
 * 只定义"分级"这一维度的取值；具体每级的中文显示名走 descriptor 词表
 * （零编码暴露律 docs/36 §五：机器枚举永不直出），本枚举只承载 wire 值。
 */
export const SourceGradeEnum = z.enum(['A', 'B', 'C']);
export type SourceGrade = z.infer<typeof SourceGradeEnum>;

/**
 * 门禁/处置三态——与法律包 DispositionStatus（pending/confirmed/rejected）字段级同构。
 * PM-2 PRD 评审逐条确认/驳回即消费此三态（docs/62 §二"字段级同构 S3 RiskList"）。
 * 中文枚举（待确认/已确认/已驳回）走 descriptor，不在此硬编码。
 */
export const GateStatusEnum = z.enum(['pending', 'confirmed', 'rejected']);
export type GateStatus = z.infer<typeof GateStatusEnum>;
