import * as z from 'zod';

/**
 * needs_ocr：文件本身可读但无可提取文本层（如扫描件、纯图片），需要 OCR 能力才能继续摄取。
 * 这是预期内的能力边界声明（缺口三态"禁用态"的字段级体现），不是 failed 那样的异常/出错状态——
 * 两者对下游展示（"即将支持"提示 vs 错误提示）与重试逻辑的含义不同，不应合并表达。
 */
export const IngestStatusEnum = z.enum(['pending', 'processing', 'done', 'failed', 'needs_ocr']);
export type IngestStatus = z.infer<typeof IngestStatusEnum>;

const CaseFileEntrySchema = z.object({
  fileId: z.string().min(1),
  fileName: z.string().min(1),
  /**
   * 文书类型分类。刻意不设枚举：真实分类体系由 ingest（W8）的分类器
   * 结果决定，在此提前锁定会在分类体系调整时构成 breaking change。
   */
  documentType: z.string().min(1),
  ingestStatus: IngestStatusEnum,
  pageCount: z.number().int().positive().optional(),
});
export type CaseFileEntry = z.infer<typeof CaseFileEntrySchema>;

export const CaseFileSchema = z
  .object({
    caseId: z.string().min(1),
    files: z.array(CaseFileEntrySchema),
  })
  .meta({
    title: 'CaseFile',
    description: '案件档案：卷内文件清单、文书类型分类、摄取状态。',
  });

export type CaseFile = z.infer<typeof CaseFileSchema>;
