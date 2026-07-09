import { describe, expect, it } from 'vitest';
import { continueSession, createSession, type Session } from './types.js';

describe('createSession', () => {
  it('starts a new chain where chainId equals its own id', () => {
    const session = createSession('session-1', () => '2026-07-10T00:00:00.000Z');
    expect(session).toEqual({ id: 'session-1', chainId: 'session-1', createdAt: '2026-07-10T00:00:00.000Z' });
  });
});

describe('continueSession', () => {
  it('carries the predecessor chainId forward and points predecessorSessionId at it', () => {
    const first = createSession('session-1', () => '2026-07-10T00:00:00.000Z');
    const second = continueSession('session-2', first, () => '2026-07-10T01:00:00.000Z');
    expect(second).toEqual({
      id: 'session-2',
      chainId: 'session-1',
      predecessorSessionId: 'session-1',
      createdAt: '2026-07-10T01:00:00.000Z',
    });
  });

  it('a third session in the chain still carries the original chainId, not its immediate predecessor id', () => {
    const first = createSession('session-1', () => 't0');
    const second = continueSession('session-2', first, () => 't1');
    const third: Session = continueSession('session-3', second, () => 't2');
    expect(third.chainId).toBe('session-1');
    expect(third.predecessorSessionId).toBe('session-2');
  });
});
