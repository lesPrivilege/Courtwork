import type { ConvertInput, ReadingViewOutcome } from '@courtwork/reading-view';
import { failureCopyForOutcome } from './outcome-copy.js';
import { inferFileKind } from './file-kind.js';
import type { AttachmentStatus, ComposerAttachment } from './types.js';

export type ConvertFn = (input: ConvertInput) => Promise<ReadingViewOutcome>;

export function createAttachmentShell(fileName: string, bytes: Uint8Array, id: string, now = Date.now()): ComposerAttachment {
  return {
    id,
    fileName,
    fileKind: inferFileKind(fileName),
    scope: 'message_only',
    status: { kind: 'uploading', startedAt: now },
    bytes,
  };
}

/**
 * 调用 reading-view 转换并把结果折叠为 chip 状态。
 * 不在此写入卷宗、不发 SessionEvent——壳只呈现 outcome。
 */
export async function resolveAttachmentUpload(
  attachment: ComposerAttachment,
  convert: ConvertFn,
): Promise<AttachmentStatus & { readingMarkdown?: string }> {
  const outcome = await convert({
    fileId: attachment.id,
    fileName: attachment.fileName,
    data: attachment.bytes,
  });

  const failure = failureCopyForOutcome(outcome);
  if (failure) {
    return { kind: 'failed', message: failure.message, retryable: failure.retryable };
  }

  if (outcome.status === 'ok') {
    return { kind: 'ready', readingMarkdown: outcome.view.markdown };
  }

  return { kind: 'failed', message: '处理失败 · 请稍后重试', retryable: true };
}

export function withResolvedStatus(
  attachment: ComposerAttachment,
  resolved: AttachmentStatus & { readingMarkdown?: string },
): ComposerAttachment {
  const { readingMarkdown, ...status } = resolved;
  return {
    ...attachment,
    status,
    readingMarkdown: readingMarkdown ?? attachment.readingMarkdown,
  };
}
