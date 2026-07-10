import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Root, RootContent } from 'mdast';
import type { ConvertInput, ReadingView, ReadingViewOutcome, ReadingViewParagraph } from '../types.js';

function blockRange(node: RootContent): { start: number; end: number } | null {
  if (!node.position) return null;
  const { start, end } = node.position;
  if (start.offset === undefined || end.offset === undefined) return null;
  return { start: start.offset, end: end.offset };
}

export async function convertMarkdownToReadingView(input: ConvertInput): Promise<ReadingViewOutcome> {
  let source: string;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(input.data);
  } catch {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: '不是合法的 UTF-8 文本',
    };
  }

  let tree: Root;
  try {
    tree = unified().use(remarkParse).use(remarkGfm).parse(source) as Root;
  } catch (err) {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  const paragraphs: ReadingViewParagraph[] = [];
  let index = 0;
  for (const node of tree.children) {
    const range = blockRange(node);
    if (!range) continue;
    // markdown 字段就是原文子串本身——input 已经是 md，不需要重新序列化，
    // 这样 markdown 与 anchor.quote 永远逐字一致，不存在两者对不上的风险。
    const text = source.slice(range.start, range.end);
    paragraphs.push({
      index: index++,
      markdown: text,
      anchor: { fileId: input.fileId, textRange: range, quote: text },
    });
  }

  const view: ReadingView = {
    fileId: input.fileId,
    markdown: paragraphs.map((p) => p.markdown).join('\n\n'),
    paragraphs,
  };
  return { status: 'ok', fileId: input.fileId, fileName: input.fileName, view };
}
