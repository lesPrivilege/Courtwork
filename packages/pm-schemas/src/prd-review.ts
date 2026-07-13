import * as z from 'zod';
import { SourceAnchorSchema } from '@courtwork/schemas';
import { GateStatusEnum } from './source-grade.js';

/**
 * PRD 评审缺陷六类（docs/62 §二 步骤）。维度集在声明中封闭——
 * 与 S3 RiskList 字段级同构，仅枚举表不同（法条依据 → 评审维度）。
 * wire 值稳定，中文维度名（模糊指标/缺验收标准/…）走 descriptor 词表。
 */
export const PrdDefectTypeEnum = z.enum([
  'vague-metric', // 模糊指标
  'missing-acceptance', // 缺验收标准
  'undefined-boundary', // 未定义边界
  'missing-dependency', // 依赖缺失
  'conflicting-requirement', // 冲突需求
  'untestable', // 不可测表述
]);
export type PrdDefectType = z.infer<typeof PrdDefectTypeEnum>;

export const PrdSeverityEnum = z.enum(['high', 'mid', 'low']);
export type PrdSeverity = z.infer<typeof PrdSeverityEnum>;

const PrdFindingSchema = z.object({
  id: z.string().min(1),
  /** PRD 章节定位（human 可读，如"3.2 离线推送"）。 */
  section: z.string().min(1),
  /** 被评审的条款原文摘录。 */
  clause: z.string().min(1),
  /** 无锚意见不落格——评审发现必须定位到 PRD 具体段落。 */
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
  defectType: PrdDefectTypeEnum,
  severity: PrdSeverityEnum,
  /** 问题陈述（generated 通道）。 */
  issue: z.string().min(1),
  /** 修改建议（generated 通道，待 amend）。 */
  suggestion: z.string().min(1),
  /**
   * 可选：引用已确认 artifact（反馈洞察/指标）作佐证。
   * 引用对象必须是已落格 artifact 的条目 id，握手层不放宽（docs/53 优先级律）。
   */
  evidenceRefs: z.array(z.string().min(1)).optional(),
  /** 逐条确认/驳回三态；确认后写回文档并落 RevisionEvent（docs/62 §二 门禁）。 */
  status: GateStatusEnum,
});
export type PrdFinding = z.infer<typeof PrdFindingSchema>;

export const PrdReviewSchema = z
  .object({
    projectId: z.string().min(1),
    /** 被评审的 PRD 文档 id（素材区/工作稿内文件）。 */
    documentId: z.string().min(1),
    findings: z.array(PrdFindingSchema),
  })
  .meta({
    title: 'pm.PrdReview',
    description:
      'PM-2 PRD 评审：章节 × 缺陷维度带锚评审矩阵。字段级同构 S3 合同审查（RiskList.riskItem→finding），逐条确认/驳回落 RevisionEvent。',
  });

export type PrdReview = z.infer<typeof PrdReviewSchema>;
