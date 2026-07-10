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
});
