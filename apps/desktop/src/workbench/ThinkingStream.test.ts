import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThinkingStream } from './ThinkingStream';

describe('ThinkingStream three-state closure', () => {
  it('shows a terminal-style navy vertical-line cursor while thinking, no SVG glyph', () => {
    const html = renderToStaticMarkup(createElement(ThinkingStream, { state: 'thinking' }));
    expect(html).toContain('data-state="thinking"');
    // RP-2.11 改判：最小字符版——竖线字符 terminal 式书写指示，非 SVG 图标（lucide 缺席即证）
    expect(html).toContain('thinking-cursor');
    expect(html).not.toContain('lucide');
    expect(html).not.toContain('thinking-stream-glyph');
    expect(html).not.toContain('thinking-stream-body');
  });

  it('settles to a character review anchor with no SVG glyph', () => {
    const html = renderToStaticMarkup(createElement(ThinkingStream, { state: 'settled', content: '已核对请求范围。' }));
    expect(html).toContain('data-state="settled"');
    expect(html).toContain('aria-label="Show reasoning"');
    expect(html).not.toContain('lucide');
    expect(html).not.toContain('思考过程</span>');
  });

  it('leaves no trace without reasoning content', () => {
    expect(renderToStaticMarkup(createElement(ThinkingStream, { state: 'empty' }))).toBe('');
  });
});
