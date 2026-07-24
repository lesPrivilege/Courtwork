import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PackageRegistries } from '@courtwork/registry';
import { createMemoryTurnStore } from '@courtwork/core/turn-protocol';
import type { ProviderTransport, ProviderTransportRequest } from '@courtwork/provider/types';

const registries = {
  artifactSchemas: { get: () => undefined },
} as unknown as PackageRegistries;

async function captureRuntimeDeps(priceTable?: unknown, transport?: ProviderTransport) {
  vi.resetModules();
  if (priceTable) {
    vi.doMock('@courtwork/provider/pricing', () => ({ PRICE_TABLE: priceTable }));
  }
  const capture = vi.fn((deps: unknown) => deps);
  vi.doMock('./work-command', () => ({ createLegalS3WorkCommand: capture }));
  const { createDesktopWorkCommand } = await import('./work-runtime');
  createDesktopWorkCommand({
    registries,
    materialResolver: { resolveForProvider: vi.fn() },
    loadRuntimeLimits: () => ({ maxUsd: 2.345 }),
    ...(transport ? { transport } : {}),
  });
  return capture.mock.calls[0]![0] as {
    createRuntimeBudget(route: { providerId: string; modelId: string; reasoning: 'standard' }): {
      limits: { maxUsd?: number };
      costBasis: { priceTableVersion?: string; priceTableEffectiveAt?: string; assumptions: string[] };
      consumed: { costCoverage: string };
    };
    makeTurnRunner(
      store: ReturnType<typeof createMemoryTurnStore>,
      route: Readonly<{ providerId: string; modelId: string; reasoning: 'standard' | 'deep' }>,
    ): { run(input: unknown): Promise<unknown> };
  };
}

afterEach(() => {
  vi.doUnmock('@courtwork/provider/pricing');
  vi.doUnmock('./work-command');
});

describe('WORK-BUDGET-1 desktop runtime', () => {
  it('freezes known DeepSeek price metadata and complete coverage', async () => {
    const deps = await captureRuntimeDeps();
    const budget = deps.createRuntimeBudget({
      providerId: 'deepseek',
      modelId: 'deepseek-v4-pro',
      reasoning: 'standard',
    });
    expect(budget.limits).toEqual({ maxUsd: 2.345 });
    expect(budget.costBasis.priceTableVersion).toBeTruthy();
    expect(budget.costBasis.priceTableEffectiveAt).toBeTruthy();
    expect(budget.costBasis.assumptions.length).toBeGreaterThan(0);
    expect(budget.consumed.costCoverage).toBe('complete');
    const assumptions = [...budget.costBasis.assumptions];
    budget.costBasis.assumptions.push('caller mutation');
    const second = deps.createRuntimeBudget({
      providerId: 'deepseek',
      modelId: 'deepseek-v4-pro',
      reasoning: 'standard',
    });
    expect(second.costBasis.assumptions).toEqual(assumptions);
  });

  it('keeps valid snapshot metadata but marks an unpriced DeepSeek model partial', async () => {
    const deps = await captureRuntimeDeps();
    const budget = deps.createRuntimeBudget({
      providerId: 'deepseek',
      modelId: 'deepseek-unlisted',
      reasoning: 'standard',
    });
    expect(budget.costBasis.priceTableVersion).toBeTruthy();
    expect(budget.consumed.costCoverage).toBe('partial');
  });

  it('does not attach DeepSeek metadata to another provider', async () => {
    const deps = await captureRuntimeDeps();
    const budget = deps.createRuntimeBudget({
      providerId: 'other',
      modelId: 'model',
      reasoning: 'standard',
    });
    expect(budget.costBasis).toEqual({ currency: 'USD', assumptions: [] });
    expect(budget.consumed.costCoverage).toBe('partial');
  });

  it('drops invalid metadata/rates as a pair and clears assumptions', async () => {
    const deps = await captureRuntimeDeps({
      version: 'broken',
      effectiveAt: '',
      rmbToUsdRate: Number.NaN,
      assumptions: ['must-not-leak'],
      prices: { deepseek: { 'deepseek-v4-pro': { inputPerMillionRmb: 1, outputPerMillionRmb: 2 } } },
    });
    const budget = deps.createRuntimeBudget({
      providerId: 'deepseek',
      modelId: 'deepseek-v4-pro',
      reasoning: 'standard',
    });
    expect(budget.costBasis).toEqual({ currency: 'USD', assumptions: [] });
    expect(budget.consumed.costCoverage).toBe('partial');
  });

  it('production fake transport receives provider/model/reasoning from the frozen route only when run starts', async () => {
    let captured: ProviderTransportRequest | undefined;
    const transport: ProviderTransport = {
      async *stream(request) {
        captured = request;
        yield {
          type: 'failed',
          requestId: request.requestId,
          kind: 'network',
          message: 'stop after capture',
          retryable: false,
        };
      },
    };
    const deps = await captureRuntimeDeps(undefined, transport);
    const route = { providerId: 'deepseek', modelId: 'deepseek-v4-pro', reasoning: 'deep' as const };
    const runner = deps.makeTurnRunner(createMemoryTurnStore(), route);
    route.providerId = 'caller-mutated';
    expect(captured).toBeUndefined();
    await expect(runner.run({
      turnId: 'turn-1',
      providerRequestId: 'request-1',
      request: { systemPrompt: 'x', messages: [{ role: 'user', content: 'y' }] },
    })).resolves.toMatchObject({ status: 'failed' });
    expect(captured).toMatchObject({
      providerId: 'deepseek',
      modelId: 'deepseek-v4-pro',
    });
    expect(JSON.parse(captured!.body)).toMatchObject({ thinking: { type: 'enabled' } });
  });
});
