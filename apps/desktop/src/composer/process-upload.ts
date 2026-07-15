import type { ConvertInput, ReadingViewOutcome } from '@courtwork/reading-view';
import { EMPTY_CONTENT_COPY, failureCopyForOutcome } from './outcome-copy.js';
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
    return { kind: 'failed', reason: failure.reason, message: failure.message, retryable: failure.retryable };
  }

  if (outcome.status === 'ok') {
    const markdown = outcome.view.markdown;
    // 空内容显式阻断：reading-view 对空文件返回 ok + 空 markdown，ready 态不得携带空正文。
    if (markdown.trim().length === 0) {
      return { kind: 'failed', reason: 'empty', message: EMPTY_CONTENT_COPY, retryable: false };
    }
    return { kind: 'ready', readingMarkdown: markdown };
  }

  return { kind: 'failed', reason: 'error', message: '处理失败 · 请稍后重试', retryable: true };
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

export interface OutgoingContentInput {
  text: string;
  attachments: readonly ComposerAttachment[];
  pasteBlocks: readonly string[];
}

/**
 * 出站消息正文的唯一组装点（CHAT-MATERIAL-1）——Chat 请求路径与回显路径共用同一函数，
 * 杜绝旧 `payload.text || attachment-placeholder` 分支各自漂移。
 *
 * 逐字纳入：用户文本、每个粘贴块、每个「就绪」附件的 readingMarkdown。
 * 只读 ready 附件；failed（含 needs_ocr / empty）已被 Composer 阻断在发送之前，
 * 这里再做一次防御性过滤，绝不把占位符或空内容塞进请求。
 */
export function assembleRequestContent(input: OutgoingContentInput): string {
  const sections: string[] = [];

  const text = input.text.trim();
  if (text.length > 0) sections.push(text);

  for (const block of input.pasteBlocks) {
    if (block.trim().length > 0) sections.push(block);
  }

  for (const attachment of input.attachments) {
    if (attachment.status.kind !== 'ready') continue;
    const markdown = attachment.readingMarkdown;
    if (!markdown || markdown.trim().length === 0) continue;
    sections.push(`【附件 · ${attachment.fileName}】\n${markdown}`);
  }

  return sections.join('\n\n');
}
