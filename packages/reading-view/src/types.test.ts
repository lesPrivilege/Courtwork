import { describe, expect, it } from 'vitest';
import type { ReadingViewOutcome, DisabledReason } from './types.js';

describe('ReadingViewOutcome 判别联合', () => {
  it('ok 分支携带 view 与可选 pageCount', () => {
    const outcome: ReadingViewOutcome = {
      status: 'ok',
      fileId: 'f1',
      fileName: 'a.md',
      view: { fileId: 'f1', markdown: 'hello', paragraphs: [] },
      pageCount: 3,
    };
    expect(outcome.status).toBe('ok');
    if (outcome.status === 'ok') {
      expect(outcome.view.markdown).toBe('hello');
    }
  });

  it('needs_ocr 分支不携带 view', () => {
    const outcome: ReadingViewOutcome = { status: 'needs_ocr', fileId: 'f2', fileName: 'a.pdf' };
    expect(outcome.status).toBe('needs_ocr');
  });

  it('disabled 分支必须携带 reason', () => {
    const reason: DisabledReason = 'zip_bomb_suspected';
    const outcome: ReadingViewOutcome = { status: 'disabled', fileId: 'f3', fileName: 'a.docx', reason };
    expect(outcome.status).toBe('disabled');
    if (outcome.status === 'disabled') {
      expect(outcome.reason).toBe('zip_bomb_suspected');
    }
  });
});
