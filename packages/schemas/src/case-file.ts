import * as z from 'zod';

export const IngestStatusEnum = z.enum(['pending', 'processing', 'done', 'failed']);
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
