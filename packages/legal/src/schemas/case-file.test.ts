import { describe, expect, it } from 'vitest';
import { CaseFileSchema } from './case-file.js';

describe('CaseFileSchema', () => {
  it('accepts a case file with an empty file list', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-001',
      files: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a case file with one pending entry', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-002',
      files: [
        {
          fileId: 'file-001',
          fileName: '起诉状.pdf',
          documentType: 'complaint',
          ingestStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts originalFileName and contentHash for move provenance (docs/decisions/ADR-004-documents-and-files.md)', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-hash',
      files: [
        {
          fileId: 'file-001',
          fileName: '设备采购合同.pdf',
          documentType: 'contract',
          ingestStatus: 'done',
          originalFileName: '合同扫描件(1).pdf',
          contentHash: 'deadbeef',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts multiple entries with mixed statuses and pageCount', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-003',
      files: [
        {
          fileId: 'file-001',
          fileName: '起诉状.pdf',
          documentType: 'complaint',
          ingestStatus: 'done',
          pageCount: 4,
        },
        {
          fileId: 'file-002',
          fileName: '证据材料.pdf',
          documentType: 'evidence',
          ingestStatus: 'processing',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an entry with needs_ocr ingestStatus (scanned file, no text layer)', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-007',
      files: [
        {
          fileId: 'file-001',
          fileName: '扫描件.pdf',
          documentType: 'evidence',
          ingestStatus: 'needs_ocr',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a case file missing caseId', () => {
    const result = CaseFileSchema.safeParse({
      files: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an entry with an invalid ingestStatus', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-004',
      files: [
        {
          fileId: 'file-001',
          fileName: '起诉状.pdf',
          documentType: 'complaint',
          ingestStatus: 'unknown-status',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an entry missing fileName', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-005',
      files: [
        {
          fileId: 'file-001',
          documentType: 'complaint',
          ingestStatus: 'pending',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an entry with a non-positive pageCount', () => {
    const result = CaseFileSchema.safeParse({
      caseId: 'case-006',
      files: [
        {
          fileId: 'file-001',
          fileName: '起诉状.pdf',
          documentType: 'complaint',
          ingestStatus: 'pending',
          pageCount: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
