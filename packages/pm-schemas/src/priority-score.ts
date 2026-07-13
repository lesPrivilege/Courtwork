import * as z from 'zod';
import { SourceAnchorSchema } from '@courtwork/schemas';

/** 打分公式族（CalcArtifact 同族第二租户）。权重表团队自定义，零年更（docs/product/pm-vertical.md §四）。 */
export const ScoreFormulaEnum = z.enum(['RICE', 'ICE', 'WSJF']);
export type ScoreFormula = z.infer<typeof ScoreFormulaEnum>;

/** 参数填充方式：auto=LLM 从语料预填、manual=人核定。 */
export const ParamFillEnum = z.enum(['auto', 'manual']);
export type ParamFill = z.infer<typeof ParamFillEnum>;

const ScoreRangeSchema = z
  .object({ low: z.number(), high: z.number() })
  .refine((r) => r.high >= r.low, { message: 'range.high 必须 ≥ low', path: ['high'] });

/**
 * 单个打分参数（reach/impact/confidence/effort 之一）。
 * 裁量区间纪律（docs/product/pm-vertical.md §三）：confidence 低者出区间不出单值——
 *   - filled 且确定：value 为单值、range 为 null；
 *   - filled 但裁量：range 为区间、value 为 null（供人定档，不伪造单值）；
 *   - 无锚且无值：status=out_of_coverage（诚实置空，绝不编数）。
 * 有锚预填走 auto，人核改走 manual。
 */
const ScoreParamSchema = z
  .object({
    fill: ParamFillEnum,
    value: z.number().nullable(),
    range: ScoreRangeSchema.nullable(),
    sourceAnchors: z.array(SourceAnchorSchema).default([]),
    status: z.enum(['filled', 'out_of_coverage']),
  })
  .superRefine((p, ctx) => {
    if (p.status === 'out_of_coverage') {
      if (p.value !== null || p.range !== null) {
        ctx.addIssue({
          code: 'custom',
          message: 'out_of_coverage 参数必须 value 与 range 均为 null（诚实置空，不编数）',
          path: ['status'],
        });
      }
      return;
    }
    // filled：单值与区间恰有其一。
    const hasValue = p.value !== null;
    const hasRange = p.range !== null;
    if (hasValue === hasRange) {
      ctx.addIssue({
        code: 'custom',
        message: 'filled 参数必须 value 与 range 二者恰居其一（确定出单值 / 裁量出区间）',
        path: ['value'],
      });
    }
  });
export type ScoreParam = z.infer<typeof ScoreParamSchema>;

/** 优先级分档（wire 值；专业词"立即启动/本迭代/排队/暂搁"走 descriptor）。 */
export const PriorityBandEnum = z.enum(['P0', 'P1', 'P2', 'P3']);
export type PriorityBand = z.infer<typeof PriorityBandEnum>;

const PriorityRowSchema = z.object({
  id: z.string().min(1),
  /** 需求名。 */
  item: z.string().min(1),
  /** 需求池条目引用（可选）。 */
  requirementRef: z.string().min(1).nullable(),
  params: z.object({
    reach: ScoreParamSchema,
    impact: ScoreParamSchema,
    confidence: ScoreParamSchema,
    effort: ScoreParamSchema,
  }),
  /** 脚本计算结果（零 LLM）；参数含裁量区间时得分传导为区间（敏感度标注）。 */
  score: z.union([z.number(), ScoreRangeSchema]),
  /** 排序**提案**——永远标注"建议"，裁决在人（docs/product/pm-vertical.md §三 轻确认门禁）。 */
  rank: z.number().int().positive(),
  band: PriorityBandEnum,
});
export type PriorityRow = z.infer<typeof PriorityRowSchema>;

export const PriorityScoreSchema = z
  .object({
    projectId: z.string().min(1),
    formula: ScoreFormulaEnum,
    /** 公式版本号（参数表零年更，但公式可声明替换）。 */
    formulaVersion: z.string().min(1),
    rows: z.array(PriorityRowSchema),
  })
  .meta({
    title: 'pm.PriorityScore',
    description:
      'PM-3 需求优先级打分：RICE/ICE/WSJF 确定性计算（零 LLM），参数带锚预填、低置信出区间、排序永为提案。计算器族第二租户。',
  });

export type PriorityScore = z.infer<typeof PriorityScoreSchema>;
