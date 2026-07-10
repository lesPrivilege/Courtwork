import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';
import {
  createToolEnvelopeSchema,
  createToolExecutor,
  defineTool,
  ToolFailureReasonEnum,
  ToolInputValidationError,
  ToolNotConfiguredError,
  ToolNotImplementedError,
  ToolOutOfCoverageError,
  ToolWebReferenceError,
  type ToolAdapter,
  type WebReferencePayload,
} from './contract.js';

const FakeInputSchema = z.object({ id: z.string().min(1) });
const FakeDataSchema = z.object({ value: z.number() });
type FakeInput = z.infer<typeof FakeInputSchema>;
type FakeData = z.infer<typeof FakeDataSchema>;

function tool(adapter: ToolAdapter<FakeInput, FakeData>, overrides?: { timeoutMs?: number; cacheTtlMs?: number }) {
  return defineTool(
    {
      id: 'fake-tool',
      inputSchema: FakeInputSchema,
      dataSchema: FakeDataSchema,
      timeoutMs: overrides?.timeoutMs ?? 1000,
      cacheTtlMs: overrides?.cacheTtlMs,
    },
    adapter,
  );
}

const fakeWebReference: WebReferencePayload = {
  kind: 'page',
  metadata: {
    url: 'https://example.invalid/a',
    finalUrl: 'https://example.invalid/a',
    fetchedAt: '2026-07-10T00:00:00.000Z',
    contentType: 'html',
    truncated: false,
    possiblyIncomplete: false,
  },
  content: {
    raw: '正文内容',
    spotlighted: '<<<UNTRUSTED_WEB_DATA_tok_START>>>正文^内容<<<UNTRUSTED_WEB_DATA_tok_END>>>',
    boundaryToken: 'tok',
  },
};

describe('ToolFailureReasonEnum — web_reference', () => {
  it('accepts "web_reference" as a valid reason literal (the 7th, C 级信源承载形态)', () => {
    expect(ToolFailureReasonEnum.safeParse('web_reference').success).toBe(true);
  });
});

describe('createToolEnvelopeSchema — web_reference payload coupling', () => {
  const envelopeSchema = createToolEnvelopeSchema(FakeDataSchema);
  const baseFailure = { verified: false as const, message: 'ok', checkedAt: '2026-07-10T00:00:00.000Z' };

  it('accepts a web_reference failure envelope that carries a webReference payload', () => {
    const result = envelopeSchema.safeParse({ ...baseFailure, reason: 'web_reference', webReference: fakeWebReference });
    expect(result.success).toBe(true);
  });

  it('rejects a web_reference failure envelope missing the webReference payload (structural coupling, not adapter self-discipline)', () => {
    const result = envelopeSchema.safeParse({ ...baseFailure, reason: 'web_reference' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-web_reference failure envelope that carries a webReference payload', () => {
    const result = envelopeSchema.safeParse({ ...baseFailure, reason: 'adapter_error', webReference: fakeWebReference });
    expect(result.success).toBe(false);
  });

  it('still rejects a failure envelope with no data field leaking through (webReference is not a back door for data)', () => {
    const result = envelopeSchema.safeParse({ ...baseFailure, reason: 'adapter_error' });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error('unreachable');
    expect('data' in result.data).toBe(false);
    expect('webReference' in result.data).toBe(false);
  });
});

describe('defineTool — adapter identity is required at construction time', () => {
  it('throws immediately when the adapter declares an empty sourceId (construction-time failure, not a runtime degrade)', () => {
    expect(() => tool({ sourceId: '', run: async () => ({ value: 1 }) })).toThrow(/sourceId/);
  });
});

describe('createToolExecutor().execute — success path', () => {
  it('returns a verified envelope carrying the adapter data and its declared sourceId', async () => {
    const t = tool({ sourceId: 'stub-source', run: async () => ({ value: 42 }) });
    const executor = createToolExecutor();

    const result = await executor.execute(t, { id: 'x' });

    expect(result).toEqual({
      verified: true,
      data: { value: 42 },
      source: 'stub-source',
      checkedAt: expect.any(String),
    });
  });
});

describe('createToolExecutor().execute — input validation', () => {
  it('throws ToolInputValidationError for malformed input instead of degrading', async () => {
    const run = vi.fn(async () => ({ value: 1 }));
    const t = tool({ sourceId: 's', run });
    const executor = createToolExecutor();

    await expect(executor.execute(t, { id: '' })).rejects.toThrow(ToolInputValidationError);
    expect(run).not.toHaveBeenCalled();
  });
});

describe('createToolExecutor().execute — degradation never carries data', () => {
  it('degrades to invalid_response when the adapter data fails the output schema, with no data field', async () => {
    const t = tool({ sourceId: 's', run: async () => ({ value: 'not-a-number' }) as unknown as Promise<FakeData> });
    const executor = createToolExecutor();

    const result = await executor.execute(t, { id: 'x' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('invalid_response');
    expect('data' in result).toBe(false);
  });

  it('degrades to adapter_error when run() rejects, carrying the error message', async () => {
    const t = tool({
      sourceId: 's',
      run: async () => {
        throw new Error('vendor API 500');
      },
    });
    const executor = createToolExecutor();

    const result = await executor.execute(t, { id: 'x' });

    expect(result).toEqual({
      verified: false,
      reason: 'adapter_error',
      message: expect.stringContaining('vendor API 500'),
      checkedAt: expect.any(String),
    });
    expect('data' in result).toBe(false);
  });

  it('unwraps a chained Error.cause into the adapter_error message, not just the outer wrapper message (native fetch wraps TLS/DNS/connection failures in a generic TypeError with the real reason nested in .cause)', async () => {
    const wrapped = Object.assign(new TypeError('fetch failed'), {
      cause: new Error('certificate has expired'),
    });
    const t = tool({
      sourceId: 's',
      run: async () => {
        throw wrapped;
      },
    });
    const executor = createToolExecutor();

    const result = await executor.execute(t, { id: 'x' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('adapter_error');
    expect(result.message).toContain('fetch failed');
    expect(result.message).toContain('certificate has expired');
  });

  it('degrades to not_configured when run() throws ToolNotConfiguredError', async () => {
    const t = tool({
      sourceId: 's',
      run: async () => {
        throw new ToolNotConfiguredError('fake-tool', '缺少 apiKey');
      },
    });
    const executor = createToolExecutor();

    const result = await executor.execute(t, { id: 'x' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('not_configured');
    expect(result.message).toContain('缺少 apiKey');
  });

  it('degrades to not_implemented when run() throws ToolNotImplementedError', async () => {
    const t = tool({
      sourceId: 's',
      run: async () => {
        throw new ToolNotImplementedError('fake-tool', '真实响应映射未接入');
      },
    });
    const executor = createToolExecutor();

    const result = await executor.execute(t, { id: 'x' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('not_implemented');
  });

  it('degrades to out_of_coverage when run() throws ToolOutOfCoverageError (library miss ≠ nonexistence)', async () => {
    const t = tool({
      sourceId: 's',
      run: async () => {
        throw new ToolOutOfCoverageError('fake-tool', '演示库未收录该主体');
      },
    });
    const executor = createToolExecutor();

    const result = await executor.execute(t, { id: 'x' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('out_of_coverage');
    expect('data' in result).toBe(false);
  });

  it('degrades to web_reference when run() throws ToolWebReferenceError, carrying the payload but no data field (C 级信源永远不是 verified:true)', async () => {
    const t = tool({
      sourceId: 's',
      run: async () => {
        throw new ToolWebReferenceError('fake-tool', '已抓取 C 级信源，仅供参考', fakeWebReference);
      },
    });
    const executor = createToolExecutor();

    const result = await executor.execute(t, { id: 'x' });

    expect(result.verified).toBe(false);
    if (result.verified) throw new Error('unreachable');
    expect(result.reason).toBe('web_reference');
    expect(result.webReference).toEqual(fakeWebReference);
    expect('data' in result).toBe(false);
  });
});

describe('createToolExecutor().execute — timeout', () => {
  it('degrades to reason "timeout" when run() does not resolve within timeoutMs', async () => {
    vi.useFakeTimers();
    try {
      const t = tool({ sourceId: 's', run: () => new Promise(() => {}) }, { timeoutMs: 1000 });
      const executor = createToolExecutor();

      const resultPromise = executor.execute(t, { id: 'x' });
      await vi.advanceTimersByTimeAsync(1000);
      const result = await resultPromise;

      expect(result.verified).toBe(false);
      if (result.verified) throw new Error('unreachable');
      expect(result.reason).toBe('timeout');
      expect('data' in result).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('aborts the signal passed to run() once the timeout fires', async () => {
    vi.useFakeTimers();
    try {
      let capturedSignal: AbortSignal | undefined;
      const t = tool(
        {
          sourceId: 's',
          run: (_input, ctx) => {
            capturedSignal = ctx.signal;
            return new Promise(() => {});
          },
        },
        { timeoutMs: 500 },
      );
      const executor = createToolExecutor();

      const resultPromise = executor.execute(t, { id: 'x' });
      await vi.advanceTimersByTimeAsync(500);
      await resultPromise;

      expect(capturedSignal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not leak the timeout timer once the adapter resolves before the deadline', async () => {
    vi.useFakeTimers();
    try {
      const t = tool({ sourceId: 's', run: async () => ({ value: 1 }) }, { timeoutMs: 1000 });
      const executor = createToolExecutor();

      await executor.execute(t, { id: 'x' });

      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('createToolExecutor().execute — caching', () => {
  it('serves a cached success on the second call without invoking run() again', async () => {
    const run = vi.fn(async () => ({ value: 1 }));
    const t = tool({ sourceId: 's', run }, { cacheTtlMs: 60_000 });
    const executor = createToolExecutor();

    const first = await executor.execute(t, { id: 'x' });
    const second = await executor.execute(t, { id: 'x' });

    expect(run).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('does not cache a degraded result: the second call retries run()', async () => {
    const run = vi.fn(async () => {
      throw new Error('boom');
    });
    const t = tool({ sourceId: 's', run }, { cacheTtlMs: 60_000 });
    const executor = createToolExecutor();

    await executor.execute(t, { id: 'x' });
    await executor.execute(t, { id: 'x' });

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('never caches when the tool declares no cacheTtlMs', async () => {
    const run = vi.fn(async () => ({ value: 1 }));
    const t = tool({ sourceId: 's', run });
    const executor = createToolExecutor();

    await executor.execute(t, { id: 'x' });
    await executor.execute(t, { id: 'x' });

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('treats different inputs as different cache entries', async () => {
    const run = vi.fn(async (input: FakeInput) => ({ value: input.id.length }));
    const t = tool({ sourceId: 's', run }, { cacheTtlMs: 60_000 });
    const executor = createToolExecutor();

    await executor.execute(t, { id: 'a' });
    await executor.execute(t, { id: 'bb' });

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('never caches an out_of_coverage result: a library miss is retried every call, not remembered as permanent', async () => {
    const run = vi.fn(async () => {
      throw new ToolOutOfCoverageError('fake-tool', '演示库未收录');
    });
    const t = tool({ sourceId: 's', run }, { cacheTtlMs: 60_000 });
    const executor = createToolExecutor();

    await executor.execute(t, { id: 'x' });
    await executor.execute(t, { id: 'x' });

    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does not let two different adapters sharing the same tool id contaminate each other via a shared cache', async () => {
    const cacheTtlMs = 60_000;
    const adapterA = { sourceId: 'source-a', run: async () => ({ value: 1 }) };
    const adapterB = { sourceId: 'source-b', run: async () => ({ value: 2 }) };
    const executor = createToolExecutor();

    const resultA = await executor.execute(tool(adapterA, { cacheTtlMs }), { id: 'x' });
    const resultB = await executor.execute(tool(adapterB, { cacheTtlMs }), { id: 'x' });

    expect(resultA.verified).toBe(true);
    expect(resultB.verified).toBe(true);
    if (!resultA.verified || !resultB.verified) throw new Error('unreachable');
    expect(resultA.source).toBe('source-a');
    expect(resultB.source).toBe('source-b');
    expect(resultB.data).toEqual({ value: 2 });
  });

  it('caches a web_reference result even though verified is false: the second call does not invoke run() again (docs/20 允许 C 级抓取本身可缓存，只是永远不是 verified:true)', async () => {
    const run = vi.fn(async () => {
      throw new ToolWebReferenceError('fake-tool', 'ok', fakeWebReference);
    });
    const t = tool({ sourceId: 's', run }, { cacheTtlMs: 60_000 });
    const executor = createToolExecutor();

    const first = await executor.execute(t, { id: 'x' });
    const second = await executor.execute(t, { id: 'x' });

    expect(run).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
  });

  it('does not cache other failure reasons even after web_reference becomes cacheable (adapter_error stays a retry-every-time family)', async () => {
    const run = vi.fn(async () => {
      throw new Error('boom');
    });
    const t = tool({ sourceId: 's', run }, { cacheTtlMs: 60_000 });
    const executor = createToolExecutor();

    await executor.execute(t, { id: 'x' });
    await executor.execute(t, { id: 'x' });

    expect(run).toHaveBeenCalledTimes(2);
  });
});
