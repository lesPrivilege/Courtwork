import type { ReadingViewOutcome } from '@courtwork/reading-view';

/**
 * 把 reading-view 结果映射为 chip 失败态办案语言（docs/41 缺口三态 + principles 零技术概念）。
 * 成功路径返回 null。
 */
export function failureCopyForOutcome(outcome: ReadingViewOutcome): { message: string; retryable: boolean } | null {
  if (outcome.status === 'ok') return null;

  if (outcome.status === 'needs_ocr') {
    return {
      message: '这份文件需要文字识别 · 当前请上传可选中文字的 PDF 或 Word',
      retryable: false,
    };
  }

  switch (outcome.reason) {
    case 'unsupported_format':
      return {
        message: '暂不支持此文件类型 · 请上传 Word、PDF、Markdown 或纯文本',
        retryable: false,
      };
    case 'file_too_large':
      return {
        message: '文件过大 · 请拆分后重新选择，或换用摘要文本',
        retryable: false,
      };
    case 'zip_bomb_suspected':
    case 'malicious_content':
      return {
        message: '文件内容存在安全风险 · 请改用无宏的 Word 或 PDF',
        retryable: false,
      };
    case 'corrupt_file':
      return {
        message: '文件已损坏或无法打开 · 请重新导出后再试',
        retryable: true,
      };
    case 'fidelity_insufficient':
      return {
        message: '版式过于复杂，无法可靠转成阅读视图 · 请简化表格后重试',
        retryable: true,
      };
    default:
      return {
        message: '处理失败 · 请稍后重试或改用其他格式',
        retryable: true,
      };
  }
}
