import type { ReactNode, RefObject } from 'react';

import type { MaterialReaderDoc, MaterialReaderFocus } from '../material/material-actions';

/**
 * 原件只读阅读面（FILE-PREVIEW-1「过手即拆」外提；CONTRACT-TRACE-1 改吃 canonical doc）。
 *
 * **只读**：本组件只渲染文本，不提供任何编辑或保存入口（ADR-004 原件只读红线）。
 *
 * **不自行 resolve**：焦点由 `material-actions` 的坐标算法算好后随 doc 送进来。本组件既不做
 * 全文搜索，也不把文本层 offset 套到 markdown 上——`ReaderPaneDoc` 第二 shape 随本票删除。
 *
 * 两条渲染路径同一个 renderer：
 *  - 无 focus：渲染 `markdown`（普通阅读，与 FILE-PREVIEW-1 行为一致）；
 *  - 有 focus：渲染 `blocks` 的**坐标流**——焦点所在块按 block-local 偏移落标记。
 */

interface MarkRange {
  start: number;
  end: number;
}

/** 行内语法只有 `**强调**` 一种；标记与它同处一个 renderer，故星号不会漏到用户面。 */
function renderInline(
  text: string,
  baseOffset: number,
  mark: MarkRange | undefined,
  focusRef: RefObject<HTMLElement | null> | undefined,
): ReactNode[] {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  const nodes: ReactNode[] = [];
  let cursor = baseOffset;
  parts.forEach((part, index) => {
    const strong = index % 2 === 1;
    // 强调段的可见文本从 `**` 之后起算；先定位再拆标记，故 `**` 永不被标记切开。
    const innerStart = cursor + (strong ? 2 : 0);
    cursor = innerStart + part.length + (strong ? 2 : 0);
    if (part.length === 0) return;
    const content = applyMark(part, innerStart, mark, focusRef);
    nodes.push(strong ? <strong key={index}>{content}</strong> : <span key={index}>{content}</span>);
  });
  return nodes;
}

/** 在一段可见文本内按**绝对坐标**切出标记；无交集则原样返回。 */
function applyMark(
  text: string,
  offset: number,
  mark: MarkRange | undefined,
  focusRef: RefObject<HTMLElement | null> | undefined,
): ReactNode {
  if (!mark) return text;
  const from = Math.max(mark.start - offset, 0);
  const to = Math.min(mark.end - offset, text.length);
  if (to <= from) return text;
  return (
    <>
      {text.slice(0, from)}
      <mark
        ref={focusRef}
        tabIndex={-1}
        className="reader-focus-anchor"
        data-testid="reader-focus-anchor"
      >
        {text.slice(from, to)}
      </mark>
      {text.slice(to)}
    </>
  );
}

/**
 * 按行渲染一段文本。`baseOffset` 是该段文本在坐标系里的起点，行内偏移据此累加——
 * 显示侧的 trim 会让可见文本相对原文右移，故左侧空白长度必须算进偏移，标记才不会错位。
 */
function renderLines(
  text: string,
  baseOffset: number,
  mark: MarkRange | undefined,
  focusRef: RefObject<HTMLElement | null> | undefined,
  keyPrefix: string,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let offset = baseOffset;
  for (const [index, line] of text.split('\n').entries()) {
    const lineStart = offset;
    offset += line.length + 1; // 行尾换行符占一位
    const trimmed = line.trim();
    if (!trimmed) continue;
    const visibleStart = lineStart + (line.length - line.trimStart().length);
    if (trimmed.startsWith('#')) {
      // 鱼尾＝节标（SKIN-B4）：原件正文段落众多而节标稀少，记号是节起首的位置线索。
      // 色不写死，由 .reader-pane h3 的 color 给——记号不择纸温。
      nodes.push(
        <h3 key={`${keyPrefix}-${index}`}>
          <svg className="mark mark-fishtail" data-testid="mark-fishtail" aria-hidden="true"><use href="#mark-fishtail" /></svg>
          {trimmed.replace(/^#+\s*/, '')}
        </h3>,
      );
      continue;
    }
    nodes.push(
      <p key={`${keyPrefix}-${index}`}>{renderInline(trimmed, visibleStart, mark, focusRef)}</p>,
    );
  }
  return nodes;
}

export function ReaderPane({ doc, focusRef }: { doc: MaterialReaderDoc; focusRef?: RefObject<HTMLElement | null> }) {
  const focus: MaterialReaderFocus | undefined = doc.focus;
  return (
    <div className="reader-pane" data-testid="reader-pane">
      {focus
        ? doc.blocks.map((block) => (
            <section key={block.blockId} data-block-id={block.blockId}>
              {renderLines(
                block.text,
                0,
                block.blockId === focus.blockId ? { start: focus.localStart, end: focus.localEnd } : undefined,
                block.blockId === focus.blockId ? focusRef : undefined,
                block.blockId,
              )}
            </section>
          ))
        : renderLines(doc.markdown, 0, undefined, undefined, 'md')}
    </div>
  );
}
