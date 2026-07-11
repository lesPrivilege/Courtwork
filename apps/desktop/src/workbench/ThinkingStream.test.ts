import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThinkingStream } from './ThinkingStream';

describe('ThinkingStream three-state closure', () => {
  it('renders three staged skeleton lines while thinking', () => {
    const html = renderToStaticMarkup(createElement(ThinkingStream, { state: 'thinking' }));
    expect(html).toContain('data-state="thinking"');
    expect(html.match(/data-testid="thinking-line-/g)).toHaveLength(3);
    expect(html).not.toContain('thinking-stream-body');
  });

  it('settles to an icon-only review anchor', () => {
    const html = renderToStaticMarkup(createElement(ThinkingStream, { state: 'settled', content: '已核对请求范围。' }));
    expect(html).toContain('data-state="settled"');
    expect(html).toContain('aria-label="Show reasoning"');
    expect(html).not.toContain('thinking-stream-skeleton');
    expect(html).not.toContain('思考过程</span>');
  });

  it('leaves no trace without reasoning content', () => {
    expect(renderToStaticMarkup(createElement(ThinkingStream, { state: 'empty' }))).toBe('');
  });
});
