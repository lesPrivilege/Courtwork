import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

export const RiskLevelEnum = z.enum(['high', 'medium', 'low']);
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

export const DispositionStatusEnum = z.enum(['pending', 'confirmed', 'rejected']);
export type DispositionStatus = z.infer<typeof DispositionStatusEnum>;

const RiskBasisSchema = z.object({
  citation: z.string().min(1),
  sourceAnchors: z.array(SourceAnchorSchema).min(1),
});
export type RiskBasis = z.infer<typeof RiskBasisSchema>;

const RiskItemSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  level: RiskLevelEnum,
  basis: z.array(RiskBasisSchema).min(1),
  dispositionStatus: DispositionStatusEnum,
});
export type RiskItem = z.infer<typeof RiskItemSchema>;

export const RiskListSchema = z
  .object({
    caseId: z.string().min(1),
    risks: z.array(RiskItemSchema),
  })
  .meta({
    title: 'RiskList',
    description: '风险清单：风险点 + 等级 + 依据（法条/判例引用 + 来源锚点）+ 处置状态。',
  });

export type RiskList = z.infer<typeof RiskListSchema>;
