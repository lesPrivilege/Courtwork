import { Fragment, type CSSProperties, type ReactNode } from 'react';
import { PasteBlock } from './PasteBlock';

/**
 * 批次七②：chat 回复的 md 富渲染。零依赖手写小解析器，覆盖对话高频子集：
 * 段落/换行、# 标题、- 与 1. 列表、```围栏代码块（paste 块同凡例复用 PasteBlock）、
 * 行内 **加重** 与 `code`。CHAT-MD-TABLE-1 扩审慎 GFM 子集：管道表格 + `---` hr 分隔线。
 * 其余形态（斜体/链接/嵌套列表等）仍刻意不做——宁缺毋滥边界收窄不废除，需要时随拍板扩
 * （现渲染缺口清点见 SPEC.md CHAT-MD-TABLE-1 条目）。
 */

export type TableAlign = 'left' | 'right' | 'center' | null;

export type MarkdownBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; text: string }
  | { kind: 'hr' }
  | { kind: 'table'; align: TableAlign[]; header: string[]; rows: string[][] };

const BLOCK_START = {
  fence: (t: string) => t.startsWith('```'),
  heading: (t: string) => /^(#{1,6})\s+/.test(t),
  list: (t: string) => /^[-*]\s+/.test(t) || /^\d+[.)]\s+/.test(t),
};

/** 独占一行的 3+ 短横线（trim 后纯 `-`）。不识别 Setext 标题下划线语义——不猜测意图，恒读作 hr。 */
function isHrLine(trimmed: string): boolean {
  return /^-{3,}$/.test(trimmed);
}

/** 管道行拆单元格：首尾竖线可选剥离，按 `|` 切分后逐格 trim；纯空行（无格内容）判非表格行。 */
function splitTableRow(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.includes('|')) return null;
  let inner = trimmed;
  if (inner.startsWith('|')) inner = inner.slice(1);
  if (inner.endsWith('|')) inner = inner.slice(0, -1);
  if (!inner.trim()) return null;
  return inner.split('|').map((cell) => cell.trim());
}

const TABLE_DELIM_CELL = /^:?-+:?$/;

/** 分隔行合法性：每格须匹配 `:?-+:?`；不合法（含列数为 0）一律返回 null——上层据此判定非表格,不猜测补全。 */
function parseDelimiterRow(line: string): TableAlign[] | null {
  const cells = splitTableRow(line);
  if (!cells) return null;
  const align: TableAlign[] = [];
  for (const cell of cells) {
    if (!TABLE_DELIM_CELL.test(cell)) return null;
    const left = cell.startsWith(':');
    const right = cell.endsWith(':');
    align.push(left && right ? 'center' : right ? 'right' : left ? 'left' : null);
  }
  return align;
}

/** 表格起手式：当前行是候选表头且下一行是列数相符的合法分隔行——两者皆真才算合法语法。 */
function isTableStart(lines: string[], index: number): boolean {
  if (index + 1 >= lines.length) return false;
  const header = splitTableRow(lines[index]);
  if (!header) return false;
  const align = parseDelimiterRow(lines[index + 1]);
  return align !== null && align.length === header.length;
}

/** 段落只在遇到其它块起始行时止步；hr/table 判定与既有 fence/heading/list 同列。 */
function isBlockBoundary(lines: string[], index: number): boolean {
  const trimmed = lines[index].trim();
  if (!trimmed) return true;
  if (BLOCK_START.fence(trimmed) || BLOCK_START.heading(trimmed) || BLOCK_START.list(trimmed)) return true;
  if (isHrLine(trimmed)) return true;
  if (isTableStart(lines, index)) return true;
  return false;
}

export function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) { index += 1; continue; }
    if (trimmed.startsWith('```')) {
      const fence: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        fence.push(lines[index]);
        index += 1;
      }
      index += 1; // 吃掉闭栏（缺闭栏时到文末，容错不吞行）
      blocks.push({ kind: 'code', text: fence.join('\n') });
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    const unordered = /^[-*]\s+/.test(trimmed);
    const ordered = /^\d+[.)]\s+/.test(trimmed);
    if (unordered || ordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].trim();
        if (unordered && /^[-*]\s+/.test(item)) items.push(item.replace(/^[-*]\s+/, ''));
        else if (ordered && /^\d+[.)]\s+/.test(item)) items.push(item.replace(/^\d+[.)]\s+/, ''));
        else break;
        index += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    if (isHrLine(trimmed)) {
      blocks.push({ kind: 'hr' });
      index += 1;
      continue;
    }
    if (isTableStart(lines, index)) {
      const header = splitTableRow(lines[index])!;
      const align = parseDelimiterRow(lines[index + 1])!;
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length) {
        if (isBlockBoundary(lines, index)) break;
        const cells = splitTableRow(lines[index]);
        // 列数与表头不符＝歧义：表格在此止步，不猜测补全/截断该行——该行回到主循环重新判定归属。
        if (!cells || cells.length !== header.length) break;
        rows.push(cells);
        index += 1;
      }
      blocks.push({ kind: 'table', align, header, rows });
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length) {
      if (isBlockBoundary(lines, index)) break;
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ kind: 'paragraph', lines: paragraph });
  }
  return blocks;
}

/** 行内两种：**加重** 与 `code`。先切代码段（内部不再解析），再在文本段里切加重。 */
export function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const codeSplit = text.split(/`([^`]+)`/g);
  codeSplit.forEach((segment, codeIndex) => {
    if (codeIndex % 2 === 1) {
      nodes.push(<code key={`${keyBase}-c${codeIndex}`}>{segment}</code>);
      return;
    }
    const boldSplit = segment.split(/\*\*([^*]+)\*\*/g);
    boldSplit.forEach((piece, boldIndex) => {
      if (!piece) return;
      if (boldIndex % 2 === 1) nodes.push(<strong key={`${keyBase}-b${codeIndex}-${boldIndex}`}>{piece}</strong>);
      else nodes.push(<Fragment key={`${keyBase}-t${codeIndex}-${boldIndex}`}>{piece}</Fragment>);
    });
  });
  return nodes;
}

const TABLE_ALIGN_STYLE: Record<Exclude<TableAlign, null>, CSSProperties> = {
  left: { textAlign: 'left' },
  right: { textAlign: 'right' },
  center: { textAlign: 'center' },
};

function tableCellStyle(align: TableAlign): CSSProperties | undefined {
  return align ? TABLE_ALIGN_STYLE[align] : undefined;
}

export function ChatMarkdown({ text }: { text: string }) {
  const blocks = parseMarkdownBlocks(text);
  return (
    <div className="chat-markdown" data-testid="chat-markdown">
      {blocks.map((block, index) => {
        if (block.kind === 'code') return <PasteBlock key={index} text={block.text} />;
        if (block.kind === 'hr') return <hr key={index} className="md-hr" />;
        if (block.kind === 'heading') return <h4 key={index} className={`md-h md-h-${Math.min(block.level, 3)}`}>{renderInline(block.text, `h${index}`)}</h4>;
        if (block.kind === 'list') {
          const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, `l${index}-${itemIndex}`)}</li>);
          return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
        }
        if (block.kind === 'table') {
          return (
            <div key={index} className="md-table-wrap">
              <table className="md-table" data-testid="chat-markdown-table">
                <thead>
                  <tr>
                    {block.header.map((cell, c) => (
                      <th key={c} style={tableCellStyle(block.align[c])}>{renderInline(cell, `t${index}-h${c}`)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, c) => (
                        <td key={c} style={tableCellStyle(block.align[c])}>{renderInline(cell, `t${index}-r${r}-${c}`)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((row, rowIndex) => (
              <Fragment key={rowIndex}>
                {rowIndex > 0 && <br />}
                {renderInline(row, `p${index}-${rowIndex}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
