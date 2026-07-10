import type { SourceAnchor } from '@courtwork/schemas';

export interface ReadingViewParagraph {
  index: number;
  /** 渲染给模型/UI 的 md 片段，可能含 #、**、| 等 md 语法装饰。 */
  markdown: string;
  /** 指向原件（fileId + page?/bbox?/textRange?/quote?），quote 是原件真实子串，不是 markdown 字段的子串。 */
  anchor: SourceAnchor;
}

export interface ReadingView {
  fileId: string;
  /** 全文拼接，模型阅读的"母语"。 */
  markdown: string;
  paragraphs: ReadingViewParagraph[];
}

export type DisabledReason =
  | 'unsupported_format'
  | 'file_too_large'
  | 'zip_bomb_suspected'
  | 'malicious_content'
  | 'corrupt_file'
  | 'fidelity_insufficient';

export type ReadingViewOutcome =
  | { status: 'ok'; fileId: string; fileName: string; view: ReadingView; pageCount?: number }
  | { status: 'needs_ocr'; fileId: string; fileName: string; detail?: string }
  | { status: 'disabled'; fileId: string; fileName: string; reason: DisabledReason; detail?: string };

export type SupportedFormat = 'docx' | 'md' | 'txt' | 'pdf' | 'jpg' | 'png';

export interface ConvertInput {
  fileId: string;
  fileName: string;
  /** 原始字节，不接受文件路径——保持包纯净、不假设 Node fs 可用。 */
  data: Uint8Array;
  /** 缺省时从 fileName 后缀推断；显式提供时完全信任调用方，不再看扩展名（.docm 拦截只在推断路径生效）。 */
  format?: SupportedFormat;
}

export interface ConvertOptions {
  maxFileSizeBytes?: number;
  maxDecompressionRatio?: number;
  maxUncompressedBytes?: number;
  timeoutMs?: number;
}
