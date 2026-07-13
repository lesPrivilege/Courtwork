import { describe, expect, it, vi } from 'vitest';
import { createToolExecutor } from './contract.js';
import type { FetchLike, HostResolver } from './web-fetch-ssrf.js';
import {
  createHttpWebFetchAdapter,
  createMockWebFetchAdapter,
  createWebFetchTool,
  WebFetchInputSchema,
} from './web-fetch.js';

describe('WebFetchInputSchema', () => {
  it('accepts an https URL', () => {
    expect(WebFetchInputSchema.safeParse({ url: 'https://example.invalid/a' }).success).toBe(true);
  });

  it('accepts an http URL', () => {
    expect(WebFetchInputSchema.safeParse({ url: 'http://example.invalid/a' }).success).toBe(true);
  });

  it('rejects a non-URL string', () => {
    expect(WebFetchInputSchema.safeParse({ url: 'not a url' }).success).toBe(false);
  });

  it('rejects a file:// URL at the input-validation layer (fail fast, not an adapter_error degrade)', () => {
    expect(WebFetchInputSchema.safeParse({ url: 'file:///etc/passwd' }).success).toBe(false);
  });
});

describe('createMockWebFetchAdapter — never impersonates a verified result', () => {
  it('takes no configuration at all', () => {
    expect(createMockWebFetchAdapter.length).toBe(0);
  });

  it('declares its identity as exactly "mock"', () => {
    expect(createMockWebFetchAdapter().sourceId).toBe('mock');
  });

  it('end to end through the executor: always verified:false with reason web_reference, never verified:true (docs/decisions/ADR-003-evidence-and-anchors.md 红线，mock 也不例外)', async () => {
    const tool = createWebFetchTool(createMockWebFetchAdapter());
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { url: 'https://example.invalid/a' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('web_reference');
    expect(result.webReference?.kind).toBe('page');
    expect('data' in result).toBe(false);
  });
});

function htmlResponse(body: string, extraHeaders?: Record<string, string>): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', ...extraHeaders } });
}

const PUBLIC_RESOLVER: HostResolver = async () => ['8.8.8.8'];

const REAL_ARTICLE_HTML = `<!DOCTYPE html>
<html><head><title>示例文章标题</title></head>
<body>
<nav><a href="/">首页</a></nav>
<article>
<h1>示例文章标题</h1>
<p>这是第一段正文内容，包含足够多的文字以便正文提取逻辑判定这是文章主体而不是导航栏或广告位，这段话本身没有实际意义，只是用来撑够长度。</p>
<p>这是第二段正文内容，继续补充更多文字，确保总字数超过内部的字符数阈值判定，模拟一篇真实文章的长度与结构。</p>
</article>
</body></html>`;

describe('createHttpWebFetchAdapter — successful fetch is C 级信源, never verified:true', () => {
  it('end to end: a successful HTML fetch degrades to verified:false, reason:web_reference, carrying spotlighted content', async () => {
    const fetchImpl: FetchLike = vi.fn(async () => htmlResponse(REAL_ARTICLE_HTML));
    const tool = createWebFetchTool(createHttpWebFetchAdapter({ fetchImpl, resolveHost: PUBLIC_RESOLVER }));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { url: 'https://example.invalid/article' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('web_reference');
    expect('data' in result).toBe(false);
    if (result.webReference?.kind !== 'page') throw new Error('expected kind:page');
    expect(result.webReference.metadata.title).toContain('示例文章标题');
    expect(result.webReference.content.spotlighted).toContain('正文');
    expect(result.webReference.content.raw).not.toContain('<article>');
  });

  it('declares its identity as "http-fetch"', () => {
    expect(createHttpWebFetchAdapter().sourceId).toBe('http-fetch');
  });

  it('a successful fetch is cacheable: the second call through the executor does not invoke fetchImpl again', async () => {
    const fetchImpl: FetchLike = vi.fn(async () => htmlResponse(REAL_ARTICLE_HTML));
    const tool = createWebFetchTool(createHttpWebFetchAdapter({ fetchImpl, resolveHost: PUBLIC_RESOLVER }));
    const executor = createToolExecutor();

    const first = await executor.execute(tool, { url: 'https://example.invalid/article' });
    const second = await executor.execute(tool, { url: 'https://example.invalid/article' });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });
});

describe('createHttpWebFetchAdapter — SSRF block degrades to adapter_error, not a fabricated fetch', () => {
  it('blocks a private-IP URL before ever calling fetchImpl', async () => {
    const fetchImpl: FetchLike = vi.fn();
    const tool = createWebFetchTool(createHttpWebFetchAdapter({ fetchImpl }));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { url: 'http://169.254.169.254/latest/meta-data/' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('adapter_error');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('createHttpWebFetchAdapter — certificate failure degrades to adapter_error, never silently retried with relaxed TLS (docs/decisions/ADR-005-data-security.md 红线)', () => {
  it('propagates a TLS/cert error as adapter_error without retrying', async () => {
    const certError = Object.assign(new TypeError('fetch failed'), {
      cause: Object.assign(new Error('certificate has expired'), { code: 'CERT_HAS_EXPIRED' }),
    });
    const fetchImpl: FetchLike = vi.fn(async () => {
      throw certError;
    });
    const tool = createWebFetchTool(createHttpWebFetchAdapter({ fetchImpl, resolveHost: PUBLIC_RESOLVER }));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { url: 'https://example.invalid/secure' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('adapter_error');
    expect(result.message).toContain('certificate has expired');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('createHttpWebFetchAdapter — non-2xx and unsupported content-type degrade honestly', () => {
  it('degrades to adapter_error on a non-2xx HTTP status', async () => {
    const fetchImpl: FetchLike = vi.fn(async () => new Response('not found', { status: 404 }));
    const tool = createWebFetchTool(createHttpWebFetchAdapter({ fetchImpl, resolveHost: PUBLIC_RESOLVER }));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { url: 'https://example.invalid/missing' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('adapter_error');
  });

  it('degrades to adapter_error for a content-type outside the html/text/json whitelist', async () => {
    const fetchImpl: FetchLike = vi.fn(
      async () => new Response(new Uint8Array([1, 2, 3]), { status: 200, headers: { 'content-type': 'image/png' } }),
    );
    const tool = createWebFetchTool(createHttpWebFetchAdapter({ fetchImpl, resolveHost: PUBLIC_RESOLVER }));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { url: 'https://example.invalid/pic.png' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('adapter_error');
  });
});

describe('createHttpWebFetchAdapter — timeout signal propagation', () => {
  it('passes the executor-managed ctx.signal through to fetchImpl (so the executor timeout can actually abort in-flight requests)', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchImpl: FetchLike = vi.fn(async (_url, init) => {
      capturedSignal = init?.signal ?? undefined;
      return htmlResponse(REAL_ARTICLE_HTML);
    });
    const tool = createWebFetchTool(createHttpWebFetchAdapter({ fetchImpl, resolveHost: PUBLIC_RESOLVER }));
    const executor = createToolExecutor();

    await executor.execute(tool, { url: 'https://example.invalid/article' });

    expect(capturedSignal).toBeInstanceOf(AbortSignal);
  });
});
