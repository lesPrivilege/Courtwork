import { useState } from 'react';

/**
 * 粘贴文本块（RP-2.12 ②,2026-07-12 拍板）：不是新卡类,是 user message 的内容形态。
 * mono 排版、N 行收敛 + 渐隐展开（长消息 ⑧ 同族）、命令块零语法高亮修饰（dense mono 凡例）。
 * 文件粘贴走附件 chip（既裁）;此件只承文本/代码/命令。
 */
export function PasteBlock({ text, lines = 6 }: { text: string; lines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const rowCount = text.split('\n').length;
  const overflowing = rowCount > lines;
  return (
    <div
      className={`paste-block ${expanded ? 'is-expanded' : ''} ${overflowing ? 'is-overflowing' : ''}`}
      data-testid="paste-block"
      data-overflowing={overflowing ? 'true' : 'false'}
    >
      <pre className="paste-block-body" style={{ ['--collapse-lines' as string]: lines }}>{text}</pre>
      {overflowing && (
        <button
          type="button"
          className="collapse-toggle"
          data-testid="paste-collapse-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : `Show ${rowCount} lines`}
        </button>
      )}
    </div>
  );
}

/** 粘贴内容判定为块（多行或长文）而非行内插入的阈值。 */
export function shouldBlockPaste(text: string): boolean {
  return text.includes('\n') || text.length > 220;
}
