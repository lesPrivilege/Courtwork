import { describe, expect, it } from 'vitest';
import { EMPTY_CONTENT_COPY, failureCopyForOutcome } from './outcome-copy.js';

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

  it('needs_ocr 以 reason 判别并给零技术替代路径文案', () => {
    const copy = failureCopyForOutcome({ status: 'needs_ocr', fileId: 'f', fileName: 'scan.png' });
    expect(copy?.reason).toBe('needs_ocr');
    expect(copy?.retryable).toBe(false);
    expect(copy?.message).toContain('文字识别');
    expect(copy?.message).not.toMatch(/OCR|API|token/i);
  });

  it('disabled 类失败统一归 reason error，且无技术术语', () => {
    const copy = failureCopyForOutcome({
      status: 'disabled',
      fileId: 'f',
      fileName: 'a.docm',
      reason: 'unsupported_format',
    });
    expect(copy?.reason).toBe('error');
    expect(copy?.message).toContain('暂不支持');
    expect(copy?.message).not.toMatch(/OCR|schema|json/i);
  });

  it('marks corrupt_file as retryable error', () => {
    const copy = failureCopyForOutcome({
      status: 'disabled',
      fileId: 'f',
      fileName: 'a.docx',
      reason: 'corrupt_file',
    });
    expect(copy?.reason).toBe('error');
    expect(copy?.retryable).toBe(true);
  });

  it('空内容文案为办案语言、零技术术语', () => {
    expect(EMPTY_CONTENT_COPY).toContain('没有可读取的文字');
    expect(EMPTY_CONTENT_COPY).not.toMatch(/OCR|markdown|json/i);
  });
});
