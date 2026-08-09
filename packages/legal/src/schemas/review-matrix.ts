import * as z from 'zod';
import { OutOfCoverageEntrySchema, QuoteClaimSchema, SourceAnchorSchema } from '@courtwork/schemas';

export const ConfidenceEnum = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof ConfidenceEnum>;

const ReviewQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});
export type ReviewQuestion = z.infer<typeof ReviewQuestionSchema>;

const ReviewCellSchema = z.object({
  answer: z.string().min(1),
  /**
   * 允许为空数组：矩阵审阅的合法答案之一是"该文档未提及此问题"，
   * 此时没有可引用的锚点——与 Timeline/PartyGraph 的断言型字段不同，
   * 这里"没有证据"本身就是有效答案，不强制 min(1)。
   */
  sourceAnchors: z.array(SourceAnchorSchema),
  confidence: ConfidenceEnum,
});
export type ReviewCell = z.infer<typeof ReviewCellSchema>;

const ReviewRowSchema = z.object({
  documentId: z.string().min(1),
  answers: z.record(z.string(), ReviewCellSchema),
});
export type ReviewRow = z.infer<typeof ReviewRowSchema>;

export const ReviewMatrixSchema = z
  .object({
    caseId: z.string().min(1),
    questions: z.array(ReviewQuestionSchema).min(1),
    rows: z.array(ReviewRowSchema),
    /**
     * 引用闭环缺口（LEGAL-ANCHOR-BINDING-1）：覆盖单元是**行**（一份文书的整行作答）——
     * 行内任一格的引语不收敛即整行移入本表，其余文书照常呈现。缺省空表。
     */
    outOfCoverage: z.array(OutOfCoverageEntrySchema).default([]),
  })
  .meta({
    title: 'ReviewMatrix',
    description: '矩阵审阅：行 = 文档，列 = 问题，格 = 答案 + 来源锚点 + 置信标记 + 引用闭环缺口表。',
  });

export type ReviewMatrix = z.infer<typeof ReviewMatrixSchema>;

/**
 * 草稿侧格（「模型出引语，系统出坐标」）：携 QuoteClaim，坐标字段结构性不存在。
 * 与最终形一致地**允许空数组**——「该文档未提及此问题」是矩阵审阅的合法答案，
 * 此时没有可引用的原文，不强制 min(1)。
 */
const ReviewCellDraftSchema = z.object({
  answer: z.string().min(1),
  quoteClaims: z.array(QuoteClaimSchema),
  confidence: ConfidenceEnum,
});
export type ReviewCellDraft = z.infer<typeof ReviewCellDraftSchema>;

const ReviewRowDraftSchema = z.object({
  documentId: z.string().min(1),
  answers: z.record(z.string(), ReviewCellDraftSchema),
});
export type ReviewRowDraft = z.infer<typeof ReviewRowDraftSchema>;

export const ReviewMatrixDraftSchema = z
  .object({
    caseId: z.string().min(1),
    questions: z.array(ReviewQuestionSchema).min(1),
    rows: z.array(ReviewRowDraftSchema),
  })
  .meta({
    title: 'ReviewMatrixDraft',
    description: '矩阵审阅草稿（模型侧）：格只携文件+页/块+逐字引语；坐标由 resolver 公证铸造。',
  });
export type ReviewMatrixDraft = z.infer<typeof ReviewMatrixDraftSchema>;
