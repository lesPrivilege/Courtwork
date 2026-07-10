import type { IngestStatus } from '@courtwork/schemas';
import type { ReadingViewOutcome } from '../types.js';

/**
 * 契约取子集，本包结果存全集：CaseFileEntry.documentType 必填，但文书分类是
 * ingest 分类器（W8）的职责，本包不产出、也不猜测占位。投影责任留给未来的
 * 装配点（沿用 demo-data/tools 已验证过的先例）——调用方拿到这个投影后自行
 * 补上 documentType 才能得到合法的 CaseFileEntry。
 */
export interface CaseFileEntryProjection {
  fileId: string;
  fileName: string;
  ingestStatus: IngestStatus;
  pageCount?: number;
}

export function toCaseFileEntryProjection(outcome: ReadingViewOutcome): CaseFileEntryProjection {
  switch (outcome.status) {
    case 'ok':
      return {
        fileId: outcome.fileId,
        fileName: outcome.fileName,
        ingestStatus: 'done',
        pageCount: outcome.pageCount,
      };
    case 'needs_ocr':
      return { fileId: outcome.fileId, fileName: outcome.fileName, ingestStatus: 'needs_ocr' };
    case 'disabled':
      return { fileId: outcome.fileId, fileName: outcome.fileName, ingestStatus: 'failed' };
  }
}
