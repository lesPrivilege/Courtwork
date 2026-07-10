import { describe, expect, it, vi } from 'vitest';
import { createAttachmentShell, resolveAttachmentUpload, withResolvedStatus } from './process-upload.js';

describe('process-upload', () => {
  it('creates shells in message_only scope with uploading status', () => {
    const bytes = new TextEncoder().encode('# hi');
    const shell = createAttachmentShell('说明.md', bytes, 'att-1', 1_000);
    expect(shell.scope).toBe('message_only');
    expect(shell.fileKind).toBe('md');
    expect(shell.status).toEqual({ kind: 'uploading', startedAt: 1_000 });
  });

  it('resolves ok outcomes to ready and keeps markdown', async () => {
    const shell = createAttachmentShell('说明.md', new TextEncoder().encode('# hi'), 'att-1');
    const convert = vi.fn(async () => ({
      status: 'ok' as const,
      fileId: 'att-1',
      fileName: '说明.md',
      view: { fileId: 'att-1', markdown: '# hi', paragraphs: [] },
    }));
    const resolved = await resolveAttachmentUpload(shell, convert);
    expect(resolved.kind).toBe('ready');
    expect(resolved.readingMarkdown).toBe('# hi');
    expect(withResolvedStatus(shell, resolved).status.kind).toBe('ready');
  });

  it('resolves needs_ocr to failed chip status with alternative path copy', async () => {
    const shell = createAttachmentShell('scan.png', new Uint8Array([1, 2, 3]), 'att-2');
    const convert = vi.fn(async () => ({
      status: 'needs_ocr' as const,
      fileId: 'att-2',
      fileName: 'scan.png',
    }));
    const resolved = await resolveAttachmentUpload(shell, convert);
    expect(resolved.kind).toBe('failed');
    if (resolved.kind !== 'failed') throw new Error('unreachable');
    expect(resolved.message).toContain('文字识别');
    expect(resolved.retryable).toBe(false);
  });

  it('resolves disabled outcomes through failure copy', async () => {
    const shell = createAttachmentShell('x.docm', new Uint8Array([1]), 'att-3');
    const convert = vi.fn(async () => ({
      status: 'disabled' as const,
      fileId: 'att-3',
      fileName: 'x.docm',
      reason: 'unsupported_format' as const,
    }));
    const resolved = await resolveAttachmentUpload(shell, convert);
    expect(resolved.kind).toBe('failed');
    if (resolved.kind !== 'failed') throw new Error('unreachable');
    expect(resolved.message).toContain('暂不支持');
  });
});
