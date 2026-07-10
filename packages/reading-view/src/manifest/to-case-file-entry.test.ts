import { describe, expect, it } from 'vitest';
import { toCaseFileEntryProjection } from './to-case-file-entry.js';
import type { ReadingViewOutcome } from '../types.js';

describe('toCaseFileEntryProjection', () => {
  it('ok 状态投影为 done，携带 pageCount', () => {
    const outcome: ReadingViewOutcome = {
      status: 'ok',
      fileId: 'f1',
      fileName: 'a.pdf',
      view: { fileId: 'f1', markdown: '', paragraphs: [] },
      pageCount: 5,
    };
    expect(toCaseFileEntryProjection(outcome)).toEqual({
      fileId: 'f1',
      fileName: 'a.pdf',
      ingestStatus: 'done',
      pageCount: 5,
    });
  });

  it('needs_ocr 状态无损投影为 needs_ocr（schemas 已同步扩展枚举）', () => {
    const outcome: ReadingViewOutcome = { status: 'needs_ocr', fileId: 'f2', fileName: 'scan.pdf' };
    expect(toCaseFileEntryProjection(outcome)).toEqual({
      fileId: 'f2',
      fileName: 'scan.pdf',
      ingestStatus: 'needs_ocr',
    });
  });

  it('disabled 状态（任意 reason）统一投影为 failed', () => {
    const outcome: ReadingViewOutcome = {
      status: 'disabled',
      fileId: 'f3',
      fileName: 'bad.docx',
      reason: 'zip_bomb_suspected',
    };
    expect(toCaseFileEntryProjection(outcome)).toEqual({
      fileId: 'f3',
      fileName: 'bad.docx',
      ingestStatus: 'failed',
    });
  });

  it('投影结果不含 documentType 字段（分类不是本包职责，留给未来装配点）', () => {
    const outcome: ReadingViewOutcome = { status: 'needs_ocr', fileId: 'f4', fileName: 'a.jpg' };
    const projection = toCaseFileEntryProjection(outcome);
    expect('documentType' in projection).toBe(false);
  });
});
