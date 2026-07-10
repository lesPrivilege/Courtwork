import { describe, expect, it } from 'vitest';
import { createRuntimeGuard, RuntimeLimitExceededError } from './runtime-limits.js';

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
});
