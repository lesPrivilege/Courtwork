import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThinkingStream } from './ThinkingStream';

describe('ThinkingStream three-state closure', () => {
  it('thinking 态渲染品牌三横（批次七⑦换装），无 SVG、无字符光标', () => {
    const html = renderToStaticMarkup(createElement(ThinkingStream, { state: 'thinking' }));
    expect(html).toContain('data-state="thinking"');
    // 链注记：RP-2.11 字符版 → 批次七⑦ BrandThinking（与 chat 面 pending 同件收敛）
    expect(html).toContain('brand-thinking');
    expect(html).not.toContain('thinking-cursor');
    expect(html).not.toContain('<svg');
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
