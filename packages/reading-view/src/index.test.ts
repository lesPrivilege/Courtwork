import { describe, expect, it } from 'vitest';
import { convertToReadingView, toCaseFileEntryProjection, DEFAULT_LIMITS } from './index.js';

describe('包根导出', () => {
  it('convertToReadingView 可从包根直接调用并端到端跑通', async () => {
    const outcome = await convertToReadingView({
      fileId: 'f1',
      fileName: 'a.md',
      data: new TextEncoder().encode('# 标题\n\n正文段落。'),
    });
    expect(outcome.status).toBe('ok');
  });

  it('toCaseFileEntryProjection 可从包根直接调用', async () => {
    const outcome = await convertToReadingView({ fileId: 'f2', fileName: 'a.jpg', data: new Uint8Array([1]) });
    expect(toCaseFileEntryProjection(outcome)).toEqual({ fileId: 'f2', fileName: 'a.jpg', ingestStatus: 'needs_ocr' });
  });

  it('DEFAULT_LIMITS 可从包根读取', () => {
    expect(DEFAULT_LIMITS.maxFileSizeBytes).toBeGreaterThan(0);
  });
});
