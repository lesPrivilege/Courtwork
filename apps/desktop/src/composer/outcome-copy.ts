import type { ReadingViewOutcome } from '@courtwork/reading-view';
import type { AttachmentBlockReason } from './types.js';

/** 空内容阻断文案（办案语言，零技术概念）。 */
export const EMPTY_CONTENT_COPY = '这份文件没有可读取的文字内容 · 请改用含文字的 Word/PDF 或直接粘贴内容';

/**
 * 把 reading-view 结果映射为 chip 失败态办案语言（docs/architecture/system.md 三态 + 零技术概念）。
 * 返回值携带类型级 `reason`（CHAT-MATERIAL-1）：needs_ocr 与其它失败靠 reason 区分，而非文案。
 * 成功路径（ok）返回 null——空内容与就绪判定由 process-upload 根据 markdown 内容裁决。
 */
export function failureCopyForOutcome(
  outcome: ReadingViewOutcome,
): { reason: AttachmentBlockReason; message: string; retryable: boolean } | null {
  if (outcome.status === 'ok') return null;

  if (outcome.status === 'needs_ocr') {
    return {
      reason: 'needs_ocr',
      message: '这份文件需要文字识别 · 当前请上传可选中文字的 PDF 或 Word',
      retryable: false,
    };
  }

  switch (outcome.reason) {
    case 'unsupported_format':
      return {
        reason: 'error',
        message: '暂不支持此文件类型 · 请上传 Word、PDF、Markdown 或纯文本',
        retryable: false,
      };
    case 'file_too_large':
      return {
        reason: 'error',
        message: '文件过大 · 请拆分后重新选择，或换用摘要文本',
        retryable: false,
      };
    case 'zip_bomb_suspected':
    case 'malicious_content':
      return {
        reason: 'error',
        message: '文件内容存在安全风险 · 请改用无宏的 Word 或 PDF',
        retryable: false,
      };
    case 'corrupt_file':
      return {
        reason: 'error',
        message: '文件已损坏或无法打开 · 请重新导出后再试',
        retryable: true,
      };
    case 'fidelity_insufficient':
      return {
        reason: 'error',
        message: '版式过于复杂，无法可靠转成阅读视图 · 请简化表格后重试',
        retryable: true,
      };
    default:
      return {
        reason: 'error',
        message: '处理失败 · 请稍后重试或改用其他格式',
        retryable: true,
      };
  }
}
