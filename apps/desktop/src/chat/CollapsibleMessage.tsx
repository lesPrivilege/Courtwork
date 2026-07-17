import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface CollapsibleMessageProps {
  /** 收敛阈值行数（user 短于 agent 正文，RP-2.11 ⑧ 值提案）。 */
  lines: number;
  children: ReactNode;
}

/**
 * RP-2.11 ⑧ 长消息收敛：纯呈现层，不动内容与账本。
 * 超阈值则收敛至 N 行 + 底部渐隐遮罩虚化（fade 至底纸，"过渡而非硬切"凡例，与滚动轨遮罩同族）
 * + Show more / Show less 扁平文字钮（hover 深色块）。
 */
export function CollapsibleMessage({ lines, children }: CollapsibleMessageProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    // 自然内容高度 vs N 行阈值——与展开态无关（scrollHeight 恒为未裁高度），避免展开后钮消失。
    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 20;
      const threshold = lineHeight * lines + 4;
      let clamp = threshold;
      let hasMore = el.scrollHeight > threshold;
      // PILOT-LIVE-2 E 块界对齐（裁定：表格/结构块不得截半）：裁线落在 markdown 顶层块中段时，
      // 下探到该块底部（整块不透明可见）+ 一行「窥视行」承接渐隐遮罩示意有更多；整块即末尾则不钳。
      // 纯文本子树（无块元素，如 user 短文本）保持行数阈值。位置量取自布局矩形，collapsed/expanded 等值。
      const blocks = el.querySelector('.chat-markdown')?.children;
      if (hasMore && blocks && blocks.length > 0) {
        const clipTop = el.getBoundingClientRect().top;
        for (const block of Array.from(blocks)) {
          const bottom = Math.ceil(block.getBoundingClientRect().bottom - clipTop) + 1;
          if (bottom >= threshold) {
            hasMore = el.scrollHeight > bottom + 4;
            clamp = hasMore ? bottom + Math.ceil(lineHeight) : el.scrollHeight;
            break;
          }
        }
      }
      el.style.setProperty('--collapse-max', `${Math.ceil(clamp)}px`);
      setOverflowing(hasMore);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children, lines]);

  return (
    <div
      className={`collapsible-message ${expanded ? 'is-expanded' : ''} ${overflowing ? 'is-overflowing' : ''}`}
      data-testid="collapsible-message"
      data-overflowing={overflowing ? 'true' : 'false'}
    >
      <div ref={bodyRef} className="collapsible-body" style={{ '--collapse-lines': lines } as CSSProperties}>
        {children}
      </div>
      {overflowing && (
        <button
          type="button"
          className="collapse-toggle"
          data-testid="collapse-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}
