import type { RefObject } from 'react';

/**
 * 原件只读阅读面（FILE-PREVIEW-1「过手即拆」外提）。
 *
 * 原本内联在 `App.tsx` 的 view-content 分支里。本单同时给 demo 语料与真实案材料喂这个面，
 * 它已是两条入口的共用渲染器，再留在装配代码里既测不到、也在顶着高水位门。
 *
 * **只读**：本组件只渲染 markdown，不提供任何编辑或保存入口（ADR-004 原件只读红线）。
 * 渲染语法刻意窄——语料 md 行内只有 `**强调**` 一种；焦点锚与之同处一个 renderer，
 * 故星号不会漏出到用户面。
 */

export interface ReaderPaneDoc {
  name: string;
  markdown: string;
  focusAnchor?: { quote?: string };
}

function renderInline(text: string, focusQuote?: string, focusRef?: RefObject<HTMLElement | null>) {
  return text.split(/\*\*([^*]+)\*\*/g).map((part, index) => {
    const quoteAt = focusQuote ? part.indexOf(focusQuote) : -1;
    const content = quoteAt >= 0 && focusQuote ? (
      <>
        {part.slice(0, quoteAt)}
        <mark
          ref={focusRef}
          tabIndex={-1}
          className="reader-focus-anchor"
          data-testid="reader-focus-anchor"
        >
          {focusQuote}
        </mark>
        {part.slice(quoteAt + focusQuote.length)}
      </>
    ) : part;
    return index % 2 === 1 ? <strong key={index}>{content}</strong> : <span key={index}>{content}</span>;
  });
}

export function ReaderPane({ doc, focusRef }: { doc: ReaderPaneDoc; focusRef?: RefObject<HTMLElement | null> }) {
  return (
      <div className="reader-pane" data-testid="reader-pane">
        {/* 鱼尾＝节标（SKIN-B4）：原件正文段落众多而节标稀少，记号是节起首的位置线索。
            色不写死，由 .reader-pane h3 的 color 给——记号不择纸温。 */}
        {doc.markdown.split('\n').map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          if (trimmed.startsWith('#')) return <h3 key={index}>
            <svg className="mark mark-fishtail" data-testid="mark-fishtail" aria-hidden="true"><use href="#mark-fishtail" /></svg>
            {trimmed.replace(/^#+\s*/, '')}
          </h3>;
          // 语料 md 行内语法仅 **强调** 一种；focus mark 住在同一 renderer 内，星号不会漏出。
          return (
            <p key={index} data-focus-source={doc.focusAnchor?.quote && trimmed.includes(doc.focusAnchor.quote) ? 'true' : undefined}>
              {renderInline(trimmed, doc.focusAnchor?.quote, focusRef)}
            </p>
          );
        })}
      </div>
  );
}
