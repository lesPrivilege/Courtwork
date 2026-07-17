import { describe, expect, it } from 'vitest';
import {
  WORK_SESSION_SCHEMA_VERSION,
  WORK_SESSION_STORAGE_KEY,
  clearWorkSession,
  loadWorkSessions,
  persistWorkSession,
  readWorkSession,
  type WorkSessionBackend,
  type WorkSessionRecord,
} from './work-session-store';

/** 内存背板：单张 Map 背书，跨「实例」共享 → 模拟 localStorage 跨重载存活。隔离每例。 */
function makeBackend(seed?: string): WorkSessionBackend & { map: Map<string, string> } {
  const map = new Map<string, string>();
  if (seed !== undefined) map.set(WORK_SESSION_STORAGE_KEY, seed);
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  };
}

/** 同一底层存储的「另一个实例」——重载后新 backend 读同一字节。 */
function reopen(backend: { map: Map<string, string> }): WorkSessionBackend {
  return {
    getItem: (key) => backend.map.get(key) ?? null,
    setItem: (key, value) => void backend.map.set(key, value),
  };
}

const RECORD: WorkSessionRecord = { sessionId: 'sess-abc', contractMaterialId: 'mat-1' };

describe('work-session-store：版本化单键持久（chat-memory 先例）', () => {
  it('persist → read 往返取回该案记录', () => {
    const backend = makeBackend();
    persistWorkSession('case-1', RECORD, backend);
    expect(readWorkSession('case-1', backend)).toEqual(RECORD);
  });

  it('无记录时 read 返回 null', () => {
    const backend = makeBackend();
    expect(readWorkSession('case-1', backend)).toBeNull();
  });

  it('重载后 ref 存活：新 backend 实例读同一底层存储仍取回记录', () => {
    const backend = makeBackend();
    persistWorkSession('case-1', RECORD, backend);
    // 模拟重启/重载：丢弃旧实例，用新实例读同一底层字节。
    expect(readWorkSession('case-1', reopen(backend))).toEqual(RECORD);
  });

  it('写入的信封携当前 schema 版本（不另造格式）', () => {
    const backend = makeBackend();
    persistWorkSession('case-1', RECORD, backend);
    const raw = backend.map.get(WORK_SESSION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).version).toBe(WORK_SESSION_SCHEMA_VERSION);
  });

  it('多案隔离：persist 一案不动他案；clear 只清目标案', () => {
    const backend = makeBackend();
    persistWorkSession('case-1', RECORD, backend);
    persistWorkSession('case-2', { sessionId: 'sess-xyz', contractMaterialId: 'mat-2' }, backend);
    expect(readWorkSession('case-1', backend)).toEqual(RECORD);
    clearWorkSession('case-1', backend);
    expect(readWorkSession('case-1', backend)).toBeNull();
    // case-2 不受影响
    expect(readWorkSession('case-2', backend)).toEqual({ sessionId: 'sess-xyz', contractMaterialId: 'mat-2' });
  });

  it('fail-closed：未知 schema 版本 → 整库判不可读，read 返回 null（不静默误用）', () => {
    const seed = JSON.stringify({ version: 999, sessions: { 'case-1': RECORD } });
    const backend = makeBackend(seed);
    expect(loadWorkSessions(backend).status).toBe('unreadable');
    expect(readWorkSession('case-1', backend)).toBeNull();
  });

  it('fail-closed：坏 JSON → 不可读，read 返回 null', () => {
    const backend = makeBackend('{not json');
    expect(loadWorkSessions(backend).status).toBe('unreadable');
    expect(readWorkSession('case-1', backend)).toBeNull();
  });

  it('fail-closed：畸形记录（缺 contractMaterialId）→ 不可读，read 返回 null', () => {
    const seed = JSON.stringify({ version: WORK_SESSION_SCHEMA_VERSION, sessions: { 'case-1': { sessionId: 'sess-abc' } } });
    const backend = makeBackend(seed);
    expect(loadWorkSessions(backend).status).toBe('unreadable');
    expect(readWorkSession('case-1', backend)).toBeNull();
  });

  it('persist 在既有不可读信封上以干净当前版本重写（不静默保留畸形字节）', () => {
    const backend = makeBackend('{not json');
    persistWorkSession('case-1', RECORD, backend);
    // 重写后可读且只含本次记录。
    const loaded = loadWorkSessions(backend);
    expect(loaded.status).toBe('ok');
    expect(readWorkSession('case-1', backend)).toEqual(RECORD);
  });

  it('clear 对未知版本亦重置为干净空信封（不留旧字节）', () => {
    const backend = makeBackend(JSON.stringify({ version: 999, sessions: { 'case-1': RECORD } }));
    clearWorkSession('case-1', backend);
    const loaded = loadWorkSessions(backend);
    expect(loaded.status).toBe('ok');
    expect(readWorkSession('case-1', backend)).toBeNull();
  });
});
