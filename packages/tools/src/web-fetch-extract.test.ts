import { describe, expect, it } from 'vitest';
import { classifyContentType, extractHtmlContent, readBodyWithLimit } from './web-fetch-extract.js';

describe('classifyContentType — content-type 白名单', () => {
  it.each([
    ['text/html', 'html'],
    ['text/html; charset=utf-8', 'html'],
    ['TEXT/HTML', 'html'],
    ['text/plain', 'text'],
    ['text/plain; charset=utf-8', 'text'],
    ['application/json', 'json'],
    ['application/json; charset=utf-8', 'json'],
    ['text/json', 'json'],
    ['image/png', undefined],
    ['application/pdf', undefined],
    ['application/octet-stream', undefined],
    ['', undefined],
  ])('%s → %s', (header, expected) => {
    expect(classifyContentType(header)).toBe(expected);
  });
});

function textResponse(body: string): Response {
  return new Response(body);
}

describe('readBodyWithLimit — 大小上限流式读取', () => {
  it('returns the full body untruncated when under the limit', async () => {
    const result = await readBodyWithLimit(textResponse('hello world'), 1000);
    expect(result.text).toBe('hello world');
    expect(result.truncated).toBe(false);
  });

  it('returns an empty body without throwing', async () => {
    const result = await readBodyWithLimit(textResponse(''), 1000);
    expect(result.text).toBe('');
    expect(result.truncated).toBe(false);
  });

  it('truncates the body once it exceeds maxBytes and flags truncated:true', async () => {
    const body = 'a'.repeat(2000);
    const result = await readBodyWithLimit(textResponse(body), 1000);
    expect(result.text.length).toBeLessThanOrEqual(1000);
    expect(result.truncated).toBe(true);
  });

  it('does not flag truncation when the body length exactly equals maxBytes', async () => {
    const body = 'a'.repeat(1000);
    const result = await readBodyWithLimit(textResponse(body), 1000);
    expect(result.text).toBe(body);
    expect(result.truncated).toBe(false);
  });
});

const ARTICLE_HTML_EN = `<!DOCTYPE html>
<html>
<head><title>A Real Article About Contracts</title></head>
<body>
<nav><a href="/">Home</a><a href="/about">About</a><a href="/contact">Contact</a></nav>
<article>
<h1>A Real Article About Contracts</h1>
<p>This is the first paragraph of a real article discussing the fundamentals of contract law, written with enough substantive text that a readability heuristic should recognize it as the main body content rather than boilerplate navigation or advertising.</p>
<p>This is the second paragraph, continuing the discussion with more detail about offer, acceptance, and consideration as the three pillars of a valid contract under common law jurisdictions, adding further length to the article body.</p>
<p>This is the third paragraph, wrapping up the discussion of contract fundamentals and reiterating the importance of a meeting of the minds between the contracting parties before any enforceable agreement can be said to exist.</p>
</article>
<footer>Copyright 2026</footer>
</body>
</html>`;

const THIN_JS_SHELL_HTML = `<!DOCTYPE html>
<html>
<head><title>App</title></head>
<body>
<div id="root"></div>
<script src="/bundle.js"></script>
</body>
</html>`;

describe('extractHtmlContent — happy path', () => {
  it('extracts the article body text and title from a well-formed article page', () => {
    const result = extractHtmlContent(ARTICLE_HTML_EN, 'https://example.invalid/article');
    expect(result.title).toContain('A Real Article About Contracts');
    expect(result.text).toContain('offer, acceptance, and consideration');
    expect(result.possiblyIncomplete).toBe(false);
  });

  it('excludes navigation boilerplate from the extracted text', () => {
    const result = extractHtmlContent(ARTICLE_HTML_EN, 'https://example.invalid/article');
    expect(result.text).not.toContain('About');
    expect(result.text).not.toContain('Contact');
  });
});

const ARTICLE_HTML_ZH = `<!DOCTYPE html>
<html>
<head><title>关于合同效力的一篇文章</title></head>
<body>
<nav><a href="/">首页</a><a href="/about">关于我们</a><a href="/contact">联系方式</a></nav>
<article>
<h1>关于合同效力的一篇文章</h1>
<p>这是这篇真实文章的第一段正文，讨论合同法的基本原理，文字量应当足够让正文提取的启发式算法判定这是文章主体内容，而不是导航栏或者广告位这类不相关的页面元素。</p>
<p>这是第二段正文，继续展开讨论要约、承诺与对价这三项构成有效合同的核心要素，在普通法体系下这三者缺一不可，这段话在第一段的基础上进一步补充篇幅与实质内容。</p>
<p>这是第三段正文，对合同基本原理的讨论做一个总结，并且再次强调双方当事人在意思表示上达成一致，是任何可执行协议成立之前的必要前提条件。</p>
</article>
<footer>版权所有 2026</footer>
</body>
</html>`;

describe('extractHtmlContent — Chinese-language article (主要真实使用场景)', () => {
  it('extracts Chinese article body text and title (Readability 对中文长文本同样有效)', () => {
    const result = extractHtmlContent(ARTICLE_HTML_ZH, 'https://example.invalid/zh-article');
    expect(result.title).toContain('关于合同效力的一篇文章');
    expect(result.text).toContain('要约、承诺与对价');
    expect(result.possiblyIncomplete).toBe(false);
  });

  it('excludes Chinese navigation boilerplate from the extracted text', () => {
    const result = extractHtmlContent(ARTICLE_HTML_ZH, 'https://example.invalid/zh-article');
    expect(result.text).not.toContain('关于我们');
    expect(result.text).not.toContain('联系方式');
  });
});

describe('extractHtmlContent — JS-rendered shell degrades honestly', () => {
  it('flags possiblyIncomplete:true for a near-empty JS-shell page instead of pretending success', () => {
    const result = extractHtmlContent(THIN_JS_SHELL_HTML, 'https://example.invalid/spa');
    expect(result.possiblyIncomplete).toBe(true);
  });
});

describe('extractHtmlContent — scripts are never executed', () => {
  it('does not let an embedded <script> mutate document.title (no JS execution, per docs/27 red line)', () => {
    const html = `<!DOCTYPE html><html><head><title>Original Title</title><script>document.title = "HACKED";</script></head><body><article><p>${'正文内容需要足够长才能通过 Readability 的最小字数判定，这里再补充一些说明性文字以确保长度充足，避免被误判为内容不足的降级路径，从而干扰这个测试用例真正想验证的行为：脚本标签内的赋值语句绝不能被执行。'.repeat(2)}</p></article></body></html>`;
    const result = extractHtmlContent(html, 'https://example.invalid/x');
    expect(result.title).toBe('Original Title');
    expect(result.text).not.toContain('HACKED');
  });
});
