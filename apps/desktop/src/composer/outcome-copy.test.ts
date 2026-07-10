import { describe, expect, it } from 'vitest';
import { failureCopyForOutcome } from './outcome-copy.js';

describe('failureCopyForOutcome', () => {
  it('returns null for ok outcomes', () => {
    expect(
      failureCopyForOutcome({
        status: 'ok',
        fileId: 'f1',
        fileName: 'a.md',
        view: { fileId: 'f1', markdown: 'hi', paragraphs: [] },
      }),
    ).toBeNull();
  });

  it('maps needs_ocr to a zero-tech alternative path message', () => {
    const copy = failureCopyForOutcome({ status: 'needs_ocr', fileId: 'f', fileName: 'scan.png' });
    expect(copy?.retryable).toBe(false);
    expect(copy?.message).toContain('文字识别');
    expect(copy?.message).not.toMatch(/OCR|API|token/i);
  });

  it('maps unsupported_format without technical jargon', () => {
    const copy = failureCopyForOutcome({
      status: 'disabled',
      fileId: 'f',
      fileName: 'a.docm',
      reason: 'unsupported_format',
    });
    expect(copy?.message).toContain('暂不支持');
    expect(copy?.message).not.toMatch(/OCR|schema|json/i);
  });

  it('marks corrupt_file as retryable', () => {
    const copy = failureCopyForOutcome({
      status: 'disabled',
      fileId: 'f',
      fileName: 'a.docx',
      reason: 'corrupt_file',
    });
    expect(copy?.retryable).toBe(true);
  });
});
