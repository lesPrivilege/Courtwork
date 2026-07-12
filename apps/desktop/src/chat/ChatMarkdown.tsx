import { Fragment, type ReactNode } from 'react';
import { PasteBlock } from './PasteBlock';

/**
 * 批次七②：chat 回复的 md 富渲染。零依赖手写小解析器，覆盖对话高频子集：
 * 段落/换行、# 标题、- 与 1. 列表、```围栏代码块（paste 块同凡例复用 PasteBlock）、
 * 行内 **加重** 与 `code`。斜体/链接/表格等低频形态刻意不做——宁缺毋滥，需要时随拍板扩。
 */

export type MarkdownBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'code'; text: string };

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
    const paragraph: string[] = [];
    while (index < lines.length) {
      const row = lines[index];
      const rowTrimmed = row.trim();
      if (!rowTrimmed || rowTrimmed.startsWith('```') || /^(#{1,6})\s+/.test(rowTrimmed) || /^[-*]\s+/.test(rowTrimmed) || /^\d+[.)]\s+/.test(rowTrimmed)) break;
      paragraph.push(rowTrimmed);
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

export function ChatMarkdown({ text }: { text: string }) {
  const blocks = parseMarkdownBlocks(text);
  return (
    <div className="chat-markdown" data-testid="chat-markdown">
      {blocks.map((block, index) => {
        if (block.kind === 'code') return <PasteBlock key={index} text={block.text} />;
        if (block.kind === 'heading') return <h4 key={index} className={`md-h md-h-${Math.min(block.level, 3)}`}>{renderInline(block.text, `h${index}`)}</h4>;
        if (block.kind === 'list') {
          const items = block.items.map((item, itemIndex) => <li key={itemIndex}>{renderInline(item, `l${index}-${itemIndex}`)}</li>);
          return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
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
