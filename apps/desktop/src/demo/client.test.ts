import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '@courtwork/core';
import { phaseFor } from './client.js';

// WORK-STORE-1-FIX B2：scenario_failed 是 ADR-010 决定三指派的场景级终局失败，
// phaseFor 此前只认 scenario_completed/step_failed/confirmation_requested，
// 未处理它的会话会被误判为仍在 running。
describe('demo fixture phaseFor', () => {
  it('recognizes scenario_failed as a terminal failed phase, not running', () => {
    const progress: SessionEvent = {
      type: 'progress', message: '起步', sessionId: 'demo-s3', seq: 0, emittedAt: '2026-07-16T00:00:00.000Z',
    };
    const failed: SessionEvent = {
      type: 'scenario_failed', scope: 'scenario', reason: 'runtime_limit',
      message: '运行时保护触发：maxSeconds 已达到配置上限 5', retryable: false,
      sessionId: 'demo-s3', seq: 1, emittedAt: '2026-07-16T00:00:00.001Z',
    };
    expect(phaseFor([progress, failed])).toBe('failed');
  });

  it('still returns completed when scenario_completed is present (regression guard)', () => {
    const completed: SessionEvent = {
      type: 'scenario_completed', sessionId: 'demo-s3', seq: 0, emittedAt: '2026-07-16T00:00:00.000Z',
    };
    expect(phaseFor([completed])).toBe('completed');
  });

  it('still returns running when there is neither a terminal event nor a pending confirmation', () => {
    const progress: SessionEvent = {
      type: 'progress', message: '起步', sessionId: 'demo-s3', seq: 0, emittedAt: '2026-07-16T00:00:00.000Z',
    };
    expect(phaseFor([progress])).toBe('running');
  });
});
