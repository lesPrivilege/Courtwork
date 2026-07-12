import * as z from 'zod';
import { IngestStatusEnum, type IngestStatus } from '@courtwork/schemas';

// IngestStatus 为基座词汇（材料管线状态），随迁包上移 @courtwork/schemas；re-export 保持包内消费面。
export { IngestStatusEnum, type IngestStatus };

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
  /**
   * 上传时的原始文件名（docs/47 原件红线精细化）。
   * 移形（move/rename）后 fileName 可变，originalFileName 永久保留。
   */
  originalFileName: z.string().min(1).optional(),
  /**
   * 内容哈希（如 sha256 hex）。移形前后比对证明证据零字节变动。
   */
  contentHash: z.string().min(1).optional(),
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
