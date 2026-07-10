import { readDocxBlocks, DocxReadError, type DocxBlock } from './docx-reader.js';
import { computeTextLayerVersion } from '../text-layer-version.js';
import type { ConvertInput, ReadingView, ReadingViewOutcome, ReadingViewParagraph } from '../types.js';
import type { ResolvedLimits } from '../security/limits.js';

const CONVERTER_NAMESPACE = 'reading-view-docx@1';

function renderMarkdownTable(rows: string[][]): string {
  if (rows.length === 0) return '';
  const escapeCell = (cell: string) => cell.replace(/\|/g, '\\|');
  const header = rows[0]!.map(escapeCell);
  const separator = header.map(() => '---');
  const bodyRows = rows.slice(1).map((r) => r.map(escapeCell));
  return [header, separator, ...bodyRows].map((r) => `| ${r.join(' | ')} |`).join('\n');
}

function plainTextOf(block: DocxBlock): string {
  return block.kind === 'paragraph' ? block.text : block.rows.map((r) => r.join(' ')).join('\n');
}

export async function convertDocxToReadingView(
  input: ConvertInput,
  limits: ResolvedLimits,
): Promise<ReadingViewOutcome> {
  let blocks: DocxBlock[];
  try {
    blocks = readDocxBlocks(input.data, limits);
  } catch (err) {
    if (err instanceof DocxReadError) {
      return { status: 'disabled', fileId: input.fileId, fileName: input.fileName, reason: err.reason, detail: err.message };
    }
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'corrupt_file',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  if (blocks.some((b) => b.kind === 'table' && b.merged)) {
    return {
      status: 'disabled',
      fileId: input.fileId,
      fileName: input.fileName,
      reason: 'fidelity_insufficient',
      detail: '文档包含合并单元格的表格，md 表格语法无法安全表达，整文件降级（不静默丢表格内容）',
    };
  }

  // 单一权威来源：先把每个块的纯文本形态按文档序线性拼接（\n 分隔）成文本层，
  // 边拼接边记录每块在这份文本层里的 [start,end)——textRange 与 textLayerVersion
  // 的哈希都读同一份 plainTexts，不会出现"拼接逻辑改了一处忘了改另一处"的偏移漂移。
  const plainTexts = blocks.map(plainTextOf);
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  for (const plain of plainTexts) {
    const start = cursor;
    const end = start + plain.length;
    ranges.push({ start, end });
    cursor = end + 1;
  }
  const plainTextLayer = plainTexts.join('\n');
  const textLayerVersion = computeTextLayerVersion(CONVERTER_NAMESPACE, plainTextLayer);

  const paragraphs: ReadingViewParagraph[] = blocks.map((block, i) => ({
    index: i,
    markdown:
      block.kind === 'paragraph'
        ? block.heading
          ? `## ${block.text}`
          : block.text
        : renderMarkdownTable(block.rows),
    anchor: {
      fileId: input.fileId,
      textRange: ranges[i]!,
      quote: plainTexts[i]!,
      textLayerVersion,
    },
  }));

  const view: ReadingView = {
    fileId: input.fileId,
    markdown: paragraphs.map((p) => p.markdown).join('\n\n'),
    paragraphs,
  };
  return { status: 'ok', fileId: input.fileId, fileName: input.fileName, view };
}
