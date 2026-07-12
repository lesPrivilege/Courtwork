import * as z from 'zod';

const BoundingBoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
});

const TextRangeSchema = z
  .object({
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  })
  .refine((range) => range.end >= range.start, {
    message: 'textRange.end 必须大于或等于 start',
    path: ['end'],
  })
  .meta({
    description: '文本层字符区间；end 必须大于或等于 start，允许 start === end 的零长区间。',
    'x-courtwork-invariant': 'end >= start',
  });

const SourceAnchorObjectSchema = z.object({
  fileId: z.string().min(1),
  page: z.number().int().positive().optional(),
  bbox: BoundingBoxSchema.optional(),
  textRange: TextRangeSchema.optional(),
  /**
   * 本区间相对哪个 OCR 文本层版本（版本号或内容哈希，由 ingest 侧填写）。
   * 重跑 OCR 会导致文本层重新分段，旧的 textRange 偏移量随之失配；
   * 该字段用于标记 textRange 的有效范围，现在加是一个字段的成本，
   * 以后加是全量数据迁移的成本。
   */
  textLayerVersion: z.string().optional(),
  /**
   * 展示与重锚定辅助用的可读原文片段，不是权威定位器。
   * 权威定位只认 bbox / textRange；quote 不参与匹配逻辑，仅供 UI 显示
   * 或在源文件不可达时提供可读上下文。
   */
  quote: z.string().optional(),
});

export const SourceAnchorSchema = SourceAnchorObjectSchema.refine(
  (value) => value.bbox !== undefined || value.textRange !== undefined,
  {
    message: 'bbox 与 textRange 至少提供一个，否则不构成可溯源锚点',
    path: ['bbox'],
  },
)
  .refine((value) => value.bbox === undefined || value.page !== undefined, {
    message: 'bbox 存在时 page 必填：无页码的坐标区域没有意义',
    path: ['page'],
  })
  .meta({
    title: 'SourceAnchor',
    description:
      '来源引用锚：一切可溯源交互的地基。定位到具体文件的页面坐标区域（bbox）和/或文本层字符区间（textRange）。quote 仅作展示与重锚定辅助，不是权威定位器。',
  });

export type SourceAnchor = z.infer<typeof SourceAnchorSchema>;
