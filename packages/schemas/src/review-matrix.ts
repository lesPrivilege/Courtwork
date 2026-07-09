import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

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
  })
  .meta({
    title: 'ReviewMatrix',
    description: '矩阵审阅：行 = 文档，列 = 问题，格 = 答案 + 来源锚点 + 置信标记。',
  });

export type ReviewMatrix = z.infer<typeof ReviewMatrixSchema>;
