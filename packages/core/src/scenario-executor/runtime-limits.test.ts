import { describe, expect, it } from 'vitest';
import {
  createRuntimeGuard,
  RuntimeLimitExceededError,
  type RuntimeBudgetPort,
} from './runtime-limits.js';
import type { WorkRuntimeBudget } from '../work-state/envelope.js';

function budgetPort(
  limits: WorkRuntimeBudget['limits'] = {},
  consumed: Partial<WorkRuntimeBudget['consumed']> = {},
): RuntimeBudgetPort {
  let budget: WorkRuntimeBudget = {
    limits: { ...limits },
    costBasis: {
      currency: 'USD',
      priceTableVersion: 'v1',
      priceTableEffectiveAt: '2026-07-24T00:00:00Z',
      assumptions: ['frozen'],
    },
    consumed: {
      steps: 0,
      toolCalls: 0,
      executionMs: 0,
      estimatedUsd: 0,
      costCoverage: 'complete',
      ...consumed,
    },
  };
  return {
    snapshot: () => structuredClone(budget),
    stageConsumed: (next) => {
      budget = { ...budget, consumed: structuredClone(next) };
    },
  };
}

describe('createRuntimeGuard', () => {
  it('with no limits configured, never throws no matter how many steps/tool calls/seconds pass', () => {
    const guard = createRuntimeGuard({}, () => 0);
    for (let i = 0; i < 1000; i += 1) {
      expect(() => guard.checkStep()).not.toThrow();
      expect(() => guard.checkToolCall()).not.toThrow();
    }
  });

  it('throws RuntimeLimitExceededError once maxSteps is exceeded', () => {
    const guard = createRuntimeGuard({ maxSteps: 2 }, () => 0);
    guard.checkStep();
    guard.checkStep();
    expect(() => guard.checkStep()).toThrow(RuntimeLimitExceededError);
  });

  it('throws RuntimeLimitExceededError once maxToolCalls is exceeded', () => {
    const guard = createRuntimeGuard({ maxToolCalls: 1 }, () => 0);
    guard.checkToolCall();
    expect(() => guard.checkToolCall()).toThrow(RuntimeLimitExceededError);
  });

  it('throws RuntimeLimitExceededError once maxSeconds elapses, using the injected clock', () => {
    let elapsedSeconds = 0;
    const guard = createRuntimeGuard({ maxSeconds: 5 }, () => elapsedSeconds);
    guard.checkStep(); // t=0s, fine
    elapsedSeconds = 4;
    guard.checkStep(); // t=4s, still fine
    elapsedSeconds = 6;
    expect(() => guard.checkStep()).toThrow(RuntimeLimitExceededError);
  });

  it('maxSteps and maxToolCalls track independent counters', () => {
    const guard = createRuntimeGuard({ maxSteps: 1, maxToolCalls: 5 }, () => 0);
    guard.checkStep();
    expect(() => guard.checkToolCall()).not.toThrow();
  });

  it('checkTime catches wall-clock overrun after one long asynchronous operation returns', () => {
    let elapsedSeconds = 0;
    const guard = createRuntimeGuard({ maxSeconds: 5 }, () => elapsedSeconds);
    guard.checkStep();
    elapsedSeconds = 6;
    expect(() => guard.checkTime()).toThrow(RuntimeLimitExceededError);
  });

  it('checkUsd accumulates cost across calls and throws RuntimeLimitExceededError once maxUsd is exceeded', () => {
    const guard = createRuntimeGuard({ maxUsd: 1 }, () => 0);
    guard.checkUsd(0.6);
    expect(() => guard.checkUsd(0.5)).toThrow(RuntimeLimitExceededError);
  });

  it('checkUsd never throws when maxUsd is not configured, no matter how much cost accumulates', () => {
    const guard = createRuntimeGuard({}, () => 0);
    expect(() => {
      guard.checkUsd(1_000_000);
    }).not.toThrow();
  });

  it('a RuntimeLimitExceededError from checkUsd carries limit:"maxUsd" and the configured value', () => {
    const guard = createRuntimeGuard({ maxUsd: 2.5 }, () => 0);
    try {
      guard.checkUsd(3);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(RuntimeLimitExceededError);
      expect((error as RuntimeLimitExceededError).limit).toBe('maxUsd');
      expect((error as RuntimeLimitExceededError).value).toBe(2.5);
    }
  });

  it('seeds all counters from a durable budget and stages only allowed prospective increments', () => {
    const port = budgetPort(
      { maxSteps: 2, maxToolCalls: 1, maxUsd: 1 },
      { steps: 1, toolCalls: 1, estimatedUsd: 0.75 },
    );
    const guard = createRuntimeGuard(port, () => 0);
    guard.checkStep();
    expect(port.snapshot().consumed.steps).toBe(2);
    expect(() => guard.checkStep()).toThrow(RuntimeLimitExceededError);
    expect(port.snapshot().consumed.steps).toBe(2);
    expect(() => guard.checkToolCall()).toThrow(RuntimeLimitExceededError);
    expect(port.snapshot().consumed.toolCalls).toBe(1);
    expect(() => guard.checkUsd(0.5)).toThrow(RuntimeLimitExceededError);
    expect(port.snapshot().consumed.estimatedUsd).toBe(1.25);
  });

  it('adds only this leg execution time to the seeded total and never counts paused wall time', () => {
    let currentLegSeconds = 0;
    const port = budgetPort({ maxSeconds: 10 }, { executionMs: 4_000 });
    const guard = createRuntimeGuard(port, () => currentLegSeconds);
    currentLegSeconds = 2;
    guard.checkTime();
    expect(port.snapshot().consumed.executionMs).toBe(6_000);
    // A new resume leg receives a new clock at zero; a long human pause before construction is absent.
    let resumedLegSeconds = 0;
    const resumed = createRuntimeGuard(port, () => resumedLegSeconds);
    resumedLegSeconds = 3;
    resumed.checkTime();
    expect(port.snapshot().consumed.executionMs).toBe(9_000);
  });

  it('marks unknown paid usage partial without erasing the known estimate', () => {
    const port = budgetPort({}, { estimatedUsd: 0.42 });
    const guard = createRuntimeGuard(port, () => 0);
    guard.markCostCoveragePartial();
    expect(port.snapshot().consumed).toMatchObject({
      estimatedUsd: 0.42,
      costCoverage: 'partial',
    });
  });
});
