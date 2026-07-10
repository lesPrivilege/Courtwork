import type { ConvertInput, ReadingView, ReadingViewOutcome, ReadingViewParagraph } from '../types.js';

export interface TextBlock {
  text: string;
  start: number;
  end: number;
}

/**
 * 以"至少一整行空白"为界切分段落块。用 \r?\n(?:[ \t]*\r?\n)+ 而不是简单的 \n\n，
 * 是为了同时正确处理 LF/CRLF 与"看似空实则含空格/制表符"的空行——原文不做任何
 * 归一化预处理，正则直接吃原始字符串，偏移量因此天然精确对应原文。
 */
const BLANK_LINE_SEPARATOR = /\r?\n(?:[ \t]*\r?\n)+/g;

export function splitBlankLineBlocks(text: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const pushTrimmedBlock = (rawStart: number, rawEnd: number) => {
    const raw = text.slice(rawStart, rawEnd);
    const leading = raw.match(/^\s*/)![0]!.length;
    const trailing = raw.match(/\s*$/)![0]!.length;
    const start = rawStart + leading;
    const end = rawEnd - trailing;
    if (start < end) blocks.push({ text: text.slice(start, end), start, end });
  };

  let cursor = 0;
  let match: RegExpExecArray | null;
  BLANK_LINE_SEPARATOR.lastIndex = 0;
  while ((match = BLANK_LINE_SEPARATOR.exec(text))) {
    pushTrimmedBlock(cursor, match.index);
    cursor = BLANK_LINE_SEPARATOR.lastIndex;
  }
  pushTrimmedBlock(cursor, text.length);
  return blocks;
}

const LEADING_MARKER_PATTERN = /^([ \t]*)((?:[#>*+-])(?=[ \t]|$)|\d+[.)](?=[ \t]|$))/;

/**
 * 只转义每块首行的前导标记，不做穷尽的 CommonMark 转义——纯文本几乎不会在后续行
 * 里重新起一个块级标记，这个已知边界记入 SPEC，不是当期缺口。
 */
export function escapeBlockLeadingMarker(blockText: string): string {
  const match = blockText.match(LEADING_MARKER_PATTERN);
  if (!match) return blockText;
  const [full, leadingSpace, marker] = match as [string, string, string];
  const escaped = marker.length === 1 ? `\\${marker}` : `${marker.slice(0, -1)}\\${marker.slice(-1)}`;
  return leadingSpace + escaped + blockText.slice(full.length);
}

export async function convertTextToReadingView(input: ConvertInput): Promise<ReadingViewOutcome> {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(input.data);
  } catch {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: '不是合法的 UTF-8 文本',
    };
  }

  const blocks = splitBlankLineBlocks(text);
  const paragraphs: ReadingViewParagraph[] = blocks.map((block, index) => ({
    index,
    markdown: escapeBlockLeadingMarker(block.text),
    anchor: {
      fileId: input.fileId,
      textRange: { start: block.start, end: block.end },
      quote: block.text,
    },
  }));

  const view: ReadingView = {
    fileId: input.fileId,
    markdown: paragraphs.map((p) => p.markdown).join('\n\n'),
    paragraphs,
  };
  return { status: 'ok', fileId: input.fileId, fileName: input.fileName, view };
}
