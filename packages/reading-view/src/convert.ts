import { resolveLimits, type ResolvedLimits } from './security/limits.js';
import { convertTextToReadingView } from './text/text-to-reading-view.js';
import { convertMarkdownToReadingView } from './markdown/markdown-to-reading-view.js';
import { convertDocxToReadingView } from './docx/docx-to-markdown.js';
import { convertPdfToReadingView } from './pdf/pdf-to-reading-view.js';
import type { ConvertInput, ConvertOptions, ReadingViewOutcome, SupportedFormat } from './types.js';

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`转换超时（>${timeoutMs}ms）`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

function inferFormat(fileName: string): SupportedFormat | undefined {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'docx':
      return 'docx';
    case 'md':
    case 'markdown':
      return 'md';
    case 'txt':
      return 'txt';
    case 'pdf':
      return 'pdf';
    case 'jpg':
    case 'jpeg':
      return 'jpg';
    case 'png':
      return 'png';
    default:
      return undefined;
  }
}

async function runConversion(input: ConvertInput, limits: ResolvedLimits): Promise<ReadingViewOutcome> {
  if (input.data.byteLength > limits.maxFileSizeBytes) {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'file_too_large',
      detail: `文件 ${input.data.byteLength} 字节超过上限 ${limits.maxFileSizeBytes} 字节`,
    };
  }

  const format = input.format ?? inferFormat(input.fileName);
  switch (format) {
    case 'jpg':
    case 'png':
      return { status: 'needs_ocr', fileId: input.fileId, fileName: input.fileName, detail: '图片格式无文本层，需要 OCR' };
    case 'txt':
      return convertTextToReadingView(input);
    case 'md':
      return convertMarkdownToReadingView(input);
    case 'docx':
      return convertDocxToReadingView(input, limits);
    case 'pdf':
      return convertPdfToReadingView(input);
    default:
      return {
        status: 'disabled',
        fileId: input.fileId,
        fileName: input.fileName,
        reason: 'unsupported_format',
        detail: `不支持的文件格式：${input.fileName}`,
      };
  }
}

/**
 * 契约：永不 throw。任何内部异常（包括调用方传入运行时非法输入）都兜底为
 * disabled/corrupt_file，而不是让异常冒泡——调用方永远只需要处理三态判别联合，
 * 不需要额外包 try/catch。
 */
export async function convertToReadingView(
  input: ConvertInput,
  options?: ConvertOptions,
): Promise<ReadingViewOutcome> {
  const limits = resolveLimits(options);
  try {
    return await withTimeout(runConversion(input, limits), limits.timeoutMs);
  } catch (err) {
    return {
      status: 'disabled',
      fileId: input?.fileId ?? 'unknown',
      fileName: input?.fileName ?? 'unknown',
      reason: 'corrupt_file',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}
