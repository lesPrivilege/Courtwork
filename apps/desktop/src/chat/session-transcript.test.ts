import { describe, expect, it } from 'vitest';
import type { PersistedTurn } from '@courtwork/core/turn-protocol';
import {
  TurnProtocolClient,
  createLocalStorageTurnJournalBackend,
  TURN_JOURNAL_STORAGE_KEY,
} from '../provider/turn-protocol-client';
import { readTranscriptSessions, transcriptSessionsFromTurns } from './session-transcript';

/**
 * CHAT-SESSION-1（ADR-013 §1 / 后果 3）：历史 session 只读 transcript 由既有 Turn journal 派生。
 * journal 是 transcript 真源（且按既有不变量不含 user prompt），本模块只按窗口把持久化的
 * 助手 turn 分组成只读会话；篡改 journal 必须 fail closed，不静默修复、不清除原件。
 */

const MIN = 60_000;
const BASE = Date.parse('2026-07-15T09:00:00.000Z');

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function completedTurn(turnId: string, atMs: number, assistantMessage: string): PersistedTurn {
  return {
    status: 'completed',
    turnId,
    providerRequestId: `provider-${turnId}`,
    providerId: 'deepseek',
    modelId: 'deepseek-chat',
    reasoning: { status: 'absent' },
    assistantMessage,
    finishReason: 'stop',
    completedAt: iso(atMs),
  };
}

function failedTurn(turnId: string, atMs: number, partial?: string): PersistedTurn {
  return {
    status: 'failed',
    turnId,
    providerRequestId: `provider-${turnId}`,
    providerId: 'deepseek',
    modelId: 'deepseek-chat',
    reasoning: { status: 'absent' },
    ...(partial === undefined ? {} : { assistantMessage: partial }),
    failure: { kind: 'network', message: '掉线', retryable: true },
    failedAt: iso(atMs),
  };
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('transcriptSessionsFromTurns：按窗口把持久 turn 分组为只读会话', () => {
  it('空 turn 列表得空会话', () => {
    expect(transcriptSessionsFromTurns([])).toEqual([]);
  });

  it('窗口内多 turn 归同一会话，按时间升序、附起止时间与稳定 id', () => {
    const turns = [
      completedTurn('t1', BASE, '答一'),
      completedTurn('t2', BASE + 25 * MIN, '答二'),
    ];
    const sessions = transcriptSessionsFromTurns(turns);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('t1');
    expect(sessions[0].startedAt).toBe(BASE);
    expect(sessions[0].endedAt).toBe(BASE + 25 * MIN);
    expect(sessions[0].turns.map((turn) => turn.turnId)).toEqual(['t1', 't2']);
    expect(sessions[0].turns[0]).toMatchObject({ status: 'completed', assistantMessage: '答一', at: BASE });
  });

  it('相邻 turn 间隔 > 窗口处断为新会话', () => {
    const turns = [
      completedTurn('t1', BASE, '答一'),
      completedTurn('t2', BASE + 61 * MIN, '答二'), // 61 分 → 新会话
      completedTurn('t3', BASE + 61 * MIN + 5 * MIN, '答三'),
    ];
    const sessions = transcriptSessionsFromTurns(turns);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].turns.map((t) => t.turnId)).toEqual(['t1']);
    expect(sessions[1].turns.map((t) => t.turnId)).toEqual(['t2', 't3']);
  });

  it('失败 turn 也纳入 transcript：状态 failed，正文取部分正文否则空', () => {
    const sessions = transcriptSessionsFromTurns([
      failedTurn('t1', BASE, '写到一半'),
      failedTurn('t2', BASE + 5 * MIN),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].turns[0]).toMatchObject({ status: 'failed', assistantMessage: '写到一半' });
    expect(sessions[0].turns[1]).toMatchObject({ status: 'failed', assistantMessage: '' });
  });

  it('乱序时间戳按 at 升序分组（journal 追加序不作分组唯一依据）', () => {
    const sessions = transcriptSessionsFromTurns([
      completedTurn('late', BASE + 20 * MIN, '后'),
      completedTurn('early', BASE, '先'),
    ]);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].turns.map((t) => t.turnId)).toEqual(['early', 'late']);
  });

  it('时间戳无法解析 → fail closed（不静默丢弃或误分组）', () => {
    const broken = { ...completedTurn('t1', BASE, '答一'), completedAt: '不是日期' } as PersistedTurn;
    expect(() => transcriptSessionsFromTurns([broken])).toThrow();
  });
});

describe('readTranscriptSessions：从持久 journal store 派生只读 + 篡改 fail closed', () => {
  it('从持久 journal 派生只读会话', () => {
    const storage = new MemoryStorage();
    const client = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
    client.store.save(completedTurn('t1', BASE, '答一'));
    client.store.save(completedTurn('t2', BASE + 90 * MIN, '答二')); // 跨窗

    const sessions = readTranscriptSessions(client.store);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].turns[0].assistantMessage).toBe('答一');
    expect(sessions[1].turns[0].assistantMessage).toBe('答二');
  });

  it('journal 被涂改 → 抛错 fail closed，原始存储不被清除', () => {
    const storage = new MemoryStorage();
    storage.setItem(TURN_JOURNAL_STORAGE_KEY, '{broken-json');
    const client = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
    expect(() => readTranscriptSessions(client.store)).toThrow(/corrupt/i);
    expect(storage.getItem(TURN_JOURNAL_STORAGE_KEY)).toBe('{broken-json');
  });

  it('分叉不改写历史（不变量 6）：追加新 turn 不涂改既有 journal 条目', () => {
    const storage = new MemoryStorage();
    const client = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
    client.store.save(completedTurn('t1', BASE, '首答'));
    const firstEntry = JSON.parse(storage.getItem(TURN_JOURNAL_STORAGE_KEY) ?? '{}').entries[0];

    // 续行/分叉 = 追加，不回改历史
    client.store.save(completedTurn('t2', BASE + 5 * MIN, '次答'));
    const persisted = JSON.parse(storage.getItem(TURN_JOURNAL_STORAGE_KEY) ?? '{}');
    expect(persisted.entries).toHaveLength(2);
    // 既有条目原样保留在原位（历史不可涂改）
    expect(persisted.entries[0]).toEqual(firstEntry);
    // 只读派生仍能读回未被改写的首答
    expect(readTranscriptSessions(client.store)[0].turns[0].assistantMessage).toBe('首答');
  });
});
