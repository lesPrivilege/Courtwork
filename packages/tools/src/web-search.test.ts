import { describe, expect, it } from 'vitest';
import { createToolExecutor, ToolNotConfiguredError, ToolNotImplementedError } from './contract.js';
import {
  createMockWebSearchAdapter,
  createSerperWebSearchAdapter,
  createWebSearchTool,
  WebSearchInputSchema,
} from './web-search.js';

describe('WebSearchInputSchema', () => {
  it('accepts a bare query', () => {
    expect(WebSearchInputSchema.safeParse({ query: '公司法 股东出资' }).success).toBe(true);
  });

  it('accepts a query with a limit', () => {
    expect(WebSearchInputSchema.safeParse({ query: 'x', limit: 5 }).success).toBe(true);
  });

  it('rejects an empty query', () => {
    expect(WebSearchInputSchema.safeParse({ query: '' }).success).toBe(false);
  });

  it('rejects limit <= 0', () => {
    expect(WebSearchInputSchema.safeParse({ query: 'x', limit: 0 }).success).toBe(false);
  });

  it('rejects limit above 20', () => {
    expect(WebSearchInputSchema.safeParse({ query: 'x', limit: 21 }).success).toBe(false);
  });
});

describe('createMockWebSearchAdapter — never impersonates a verified result (docs/decisions/ADR-003-evidence-and-anchors.md 红线对 search 同样适用)', () => {
  it('takes no configuration at all', () => {
    expect(createMockWebSearchAdapter.length).toBe(0);
  });

  it('declares its identity as exactly "mock"', () => {
    expect(createMockWebSearchAdapter().sourceId).toBe('mock');
  });

  it('end to end through the executor: verified:false, reason web_reference, kind search_results with spotlighted title/snippet', async () => {
    const tool = createWebSearchTool(createMockWebSearchAdapter());
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { query: '公司法 股东出资' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('web_reference');
    expect('data' in result).toBe(false);
    if (result.webReference?.kind !== 'search_results') throw new Error('expected kind:search_results');
    expect(result.webReference.query).toBe('公司法 股东出资');
    expect(result.webReference.results.length).toBeGreaterThan(0);
    const [first] = result.webReference.results;
    expect(first.title.spotlighted).toContain(first.title.boundaryToken);
  });
});

describe('createSerperWebSearchAdapter — no implicit fallback to mock (honest skeleton, 仿 qcc/public-law-db 先例)', () => {
  it('declares its identity as "serper"', () => {
    expect(createSerperWebSearchAdapter(undefined).sourceId).toBe('serper');
  });

  it('degrades to not_configured (never a fabricated search) when no apiKey is supplied', async () => {
    const tool = createWebSearchTool(createSerperWebSearchAdapter(undefined));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { query: 'x' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('not_configured');
  });

  it('still refuses to fabricate results when apiKey is configured (skeleton has no real request mapping yet)', async () => {
    const tool = createWebSearchTool(createSerperWebSearchAdapter({ apiKey: 'fake-key' }));
    const executor = createToolExecutor();

    const result = await executor.execute(tool, { query: 'x' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('not_implemented');
  });

  it('throws the documented error classes directly at the adapter level (not just through the executor)', async () => {
    const noConfigAdapter = createSerperWebSearchAdapter(undefined);
    await expect(noConfigAdapter.run({ query: 'x' }, { signal: new AbortController().signal })).rejects.toThrow(
      ToolNotConfiguredError,
    );

    const withKeyAdapter = createSerperWebSearchAdapter({ apiKey: 'fake-key' });
    await expect(withKeyAdapter.run({ query: 'x' }, { signal: new AbortController().signal })).rejects.toThrow(
      ToolNotImplementedError,
    );
  });
});
