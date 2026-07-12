import * as z from 'zod';
import { OutOfCoverageEntrySchema, QuoteClaimSchema, SourceAnchorSchema } from '@courtwork/schemas';

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
    /**
     * 引用闭环缺口（HARNESS-1 拍板一，2026-07-13）：受限修复重试后仍无法唯一锚定的
     * 风险条目移入本表——缺口如实呈现并携原判与失败原因（主动索证）。缺省空表，
     * 存量最终形夹具零迁移。
     */
    outOfCoverage: z.array(OutOfCoverageEntrySchema).default([]),
  })
  .meta({
    title: 'RiskList',
    description: '风险清单：风险点 + 等级 + 依据（法条/判例引用 + 来源锚点）+ 处置状态 + 引用闭环缺口表。',
  });

export type RiskList = z.infer<typeof RiskListSchema>;

/** 草稿侧依据：模型出引语（QuoteClaim），坐标字段结构性不存在。 */
const RiskBasisDraftSchema = z.object({
  citation: z.string().min(1),
  quoteClaims: z.array(QuoteClaimSchema).min(1),
});
export type RiskBasisDraft = z.infer<typeof RiskBasisDraftSchema>;

const RiskItemDraftSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  level: RiskLevelEnum,
  basis: z.array(RiskBasisDraftSchema).min(1),
  dispositionStatus: DispositionStatusEnum,
});
export type RiskItemDraft = z.infer<typeof RiskItemDraftSchema>;

/**
 * 模型侧草稿形状（「模型出引语，系统出坐标」）：与最终形唯一的差别是依据携
 * QuoteClaim 而非 SourceAnchor——resolver 唯一精确匹配后铸造坐标与文本层版本，
 * 模型机制性失去伪造 offset 的能力。
 */
export const RiskListDraftSchema = z
  .object({
    caseId: z.string().min(1),
    risks: z.array(RiskItemDraftSchema),
  })
  .meta({
    title: 'RiskListDraft',
    description: '风险清单草稿（模型侧）：依据只携文件+页/块+逐字引语；坐标由 resolver 公证铸造。',
  });
export type RiskListDraft = z.infer<typeof RiskListDraftSchema>;
