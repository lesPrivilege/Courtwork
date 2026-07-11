import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThinkingStream } from './ThinkingStream';

describe('ThinkingStream three-state closure', () => {
  it('activates the brand mark (navy stem + three bars) while thinking, not the spark star', () => {
    const html = renderToStaticMarkup(createElement(ThinkingStream, { state: 'thinking' }));
    expect(html).toContain('data-state="thinking"');
    // #26.3：推理动画 = app icon 本体（藏青竖线 + 三横杠），非星星
    expect(html).toContain('lucide-brand-mark');
    expect(html).not.toContain('lucide-spark-lines');
    expect(html.match(/<path/g)).toHaveLength(4);
    expect(html).toContain('thinking-stream-glyph');
    expect(html).not.toContain('thinking-stream-skeleton');
    expect(html).not.toContain('thinking-line');
    expect(html).not.toContain('thinking-stream-body');
  });

  it('settles to a static brand-mark review anchor', () => {
    const html = renderToStaticMarkup(createElement(ThinkingStream, { state: 'settled', content: '已核对请求范围。' }));
    expect(html).toContain('data-state="settled"');
    expect(html).toContain('aria-label="Show reasoning"');
    expect(html).toContain('lucide-brand-mark');
    expect(html).not.toContain('lucide-spark-lines');
    expect(html).not.toContain('thinking-stream-skeleton');
    expect(html).not.toContain('思考过程</span>');
  });

  it('leaves no trace without reasoning content', () => {
    expect(renderToStaticMarkup(createElement(ThinkingStream, { state: 'empty' }))).toBe('');
  });
});
