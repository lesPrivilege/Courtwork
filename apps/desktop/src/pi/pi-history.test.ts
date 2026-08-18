import { describe, expect, it } from 'vitest';
import {
  PI_HISTORY_MAX_SESSIONS,
  PI_HISTORY_SCHEMA_VERSION,
  PI_HISTORY_STORAGE_KEY,
  priorSessionsFor,
  readPiHistory,
  writePiHistory,
  type PiHistoryBackend,
  type PiHistorySession,
} from './pi-history';

function backendFrom(store: Map<string, string>): PiHistoryBackend {
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
  };
}

function session(overrides: Partial<PiHistorySession> = {}): PiHistorySession {
  return {
    containerId: 'matter-1',
    grantId: 'grant-new',
    sessionId: 'session-prior',
    recordedAt: 1,
    drafts: [{
      logicalPath: '上一段.md',
      byteLength: 12,
      contentSha256: 'c'.repeat(64),
      disposition: 'created',
      recordedAt: 1,
    }],
    ...overrides,
  };
}

describe('WORK-AGENT-GUI-1 R1 · pi-history v2', () => {
  it('storage key 与 envelope version 同步升 v2', () => {
    expect(PI_HISTORY_STORAGE_KEY).toBe('courtwork.pi-drafts.v2');
    expect(PI_HISTORY_SCHEMA_VERSION).toBe(2);
  });

  it('v2 reader 不读 v1 key：v1 旧缓存整库当空', () => {
    const backend = backendFrom(new Map([[
      'courtwork.pi-drafts.v1',
      JSON.stringify({
        version: 1,
        sessions: [{
          containerId: 'matter-1',
          sessionId: 'session-prior',
          recordedAt: 1,
          drafts: [],
        }],
      }),
    ]]));
    expect(readPiHistory(backend)).toEqual([]);
  });

  it('写唯一性按 {containerId, grantId, sessionId} 三元组：同 container+session 不同 grant 不互相覆盖', () => {
    const store = new Map<string, string>();
    const backend = backendFrom(store);
    writePiHistory(backend, session({ grantId: 'grant-old', sessionId: 's1', recordedAt: 1 }));
    writePiHistory(backend, session({ grantId: 'grant-new', sessionId: 's1', recordedAt: 2 }));
    const all = readPiHistory(backend);
    expect(all.map((s) => s.grantId).sort()).toEqual(['grant-new', 'grant-old']);
    expect(all).toHaveLength(2);
  });

  it('写唯一性：同三元组覆盖为最新', () => {
    const store = new Map<string, string>();
    const backend = backendFrom(store);
    writePiHistory(backend, session({ sessionId: 's1', recordedAt: 1 }));
    writePiHistory(backend, session({ sessionId: 's1', recordedAt: 5 }));
    expect(readPiHistory(backend)).toHaveLength(1);
    expect(readPiHistory(backend)[0].recordedAt).toBe(5);
  });

  it('v2 记录缺 grantId 或空 grantId：整库不可读（fail-closed，不猜测归属）', () => {
    for (const grantId of [undefined, '']) {
      const record = {
        containerId: 'matter-1',
        grantId,
        sessionId: 'session-prior',
        recordedAt: 1,
        drafts: [],
      };
      const backend = backendFrom(new Map([[
        PI_HISTORY_STORAGE_KEY,
        JSON.stringify({ version: PI_HISTORY_SCHEMA_VERSION, sessions: [record] }),
      ]]));
      expect(readPiHistory(backend)).toEqual([]);
    }
  });

  it('prior 派生按 {containerId, grantId} 过滤并排除当前段', () => {
    const sessions = [
      session({ grantId: 'grant-old', sessionId: 's-old', recordedAt: 1 }),
      session({ grantId: 'grant-new', sessionId: 's-new', recordedAt: 2 }),
      session({ grantId: 'grant-new', sessionId: 's-current', recordedAt: 3 }),
    ];
    expect(priorSessionsFor(sessions, 'matter-1', 'grant-new', 's-current').map((s) => s.sessionId))
      .toEqual(['s-new']);
  });

  it('容量仍每 container 最多 3 段，不因 grant 数放大', () => {
    expect(PI_HISTORY_MAX_SESSIONS).toBe(3);
    const store = new Map<string, string>();
    const backend = backendFrom(store);
    writePiHistory(backend, session({ grantId: 'g1', sessionId: 'a', recordedAt: 1 }));
    writePiHistory(backend, session({ grantId: 'g2', sessionId: 'b', recordedAt: 2 }));
    writePiHistory(backend, session({ grantId: 'g1', sessionId: 'c', recordedAt: 3 }));
    writePiHistory(backend, session({ grantId: 'g2', sessionId: 'd', recordedAt: 4 }));
    const all = readPiHistory(backend);
    expect(all).toHaveLength(3);
    expect(all.map((s) => s.sessionId)).toEqual(['d', 'c', 'b']);
  });
});
