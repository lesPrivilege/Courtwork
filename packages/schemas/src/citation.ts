import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';

/**
 * 引用闭环（HARNESS-1 拍板一，2026-07-12）：「模型出引语，系统出坐标」。
 * 模型侧只交 fileId + 页/块 + 精确引语；resolver 对文本层唯一精确匹配后铸造
 * start/end 与 textLayerVersion。QuoteClaim 为 strict 形状——坐标字段在模型侧
 * 结构性不存在，模型机制性失去伪造 offset 的能力。引语即证词，坐标即公证。
 */
export const QuoteClaimSchema = z
  .object({
    fileId: z.string().min(1),
    /** 页码定位（PDF 等分页文书）。 */
    page: z.number().int().positive().optional(),
    /** 块定位（md/docx 等无页码文书的段索引）。 */
    blockId: z.string().min(1).optional(),
    /** 原件真实子串，一字不差；resolver 以此为唯一匹配键。 */
    exactQuote: z.string().min(1),
  })
  .strict()
  .meta({
    title: 'QuoteClaim',
    description: '模型侧引语声明：文件 + 页/块 + 精确引语。不承载坐标——坐标由 resolver 铸造。',
  });
export type QuoteClaim = z.infer<typeof QuoteClaimSchema>;

/**
 * resolver 铸造后的公证形态：在通用 SourceAnchor 之上收严——textRange、
 * textLayerVersion、quote 三者必备，且满足 anchor.quote === 文本层.slice(start, end)
 * 的终验等式（等式校验在 resolver 内执行，此处锁形状）。
 */
export const ResolvedSourceAnchorSchema = SourceAnchorSchema.refine(
  (anchor) =>
    anchor.textRange !== undefined &&
    anchor.textLayerVersion !== undefined &&
    anchor.quote !== undefined,
  { message: '公证锚点必须同时具备 textRange、textLayerVersion 与 quote' },
).meta({
  title: 'ResolvedSourceAnchor',
  description: 'resolver 铸造的公证锚点：坐标 + 文本层版本 + 引语三者齐备，坐标是裁决性事实。',
});
export type ResolvedSourceAnchor = z.infer<typeof ResolvedSourceAnchorSchema>;

/** 拒收理由封闭枚举：未命中 / 多义（非唯一命中）/ 文件不可达。 */
export const CitationFailureReasonEnum = z.enum(['not_found', 'ambiguous', 'file_unavailable']);
export type CitationFailureReason = z.infer<typeof CitationFailureReasonEnum>;

/**
 * 引语拒收记录：受限修复重试携带原判与失败原因（docs/architecture/schema-engineering.md 校准语义）；
 * ambiguous 时附命中次数，供模型补足上下文使引语唯一化。
 */
export const CitationFailureSchema = z
  .object({
    claim: QuoteClaimSchema,
    reason: CitationFailureReasonEnum,
    occurrences: z.number().int().nonnegative().optional(),
  })
  .strict();
export type CitationFailure = z.infer<typeof CitationFailureSchema>;

/**
 * out_of_coverage 条目（缺口三态的引用闭环形态）：受限修复重试不收敛的条目
 * 从 artifact 主体移入本表——整 artifact 部分成功呈现，缺口如实标注并说明缺什么
 * （兜底同时是主动索证：failures 携原判与失败原因）。
 */
export const OutOfCoverageEntrySchema = z
  .object({
    summary: z.string().min(1),
    reason: z.literal('citation_unresolved'),
    failures: z.array(CitationFailureSchema).min(1),
  })
  .strict();
export type OutOfCoverageEntry = z.infer<typeof OutOfCoverageEntrySchema>;
