import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RevisionEventSchema, type RevisionEvent } from '@courtwork/schemas';
import { createFileRevisionEventStore, createInMemoryRevisionEventStore, MissingSessionIdError } from './revision-store.js';

function sampleEvent(id: string): RevisionEvent {
  return {
    id,
    timestamp: '2026-07-10T00:00:00.000Z',
    actor: { userId: 'demo-lawyer', role: '主办律师' },
    caseId: 'case-linjiang-qiyun-2025',
    artifactType: 'legal.RiskList',
    artifactId: 'case-linjiang-qiyun-2025',
    fieldPath: '/risks/0/dispositionStatus',
    previousValue: 'pending',
    newValue: 'confirmed',
    reason: '与主办律师电话确认，风险属实',
    sessionId: 'session-1',
  };
}

function sampleEventWithoutSessionId(id: string): RevisionEvent {
  return {
    id,
    timestamp: '2026-07-10T00:00:00.000Z',
    actor: { userId: 'demo-lawyer', role: '主办律师' },
    caseId: 'case-linjiang-qiyun-2025',
    artifactType: 'legal.RiskList',
    artifactId: 'case-linjiang-qiyun-2025',
    fieldPath: '/risks/0/dispositionStatus',
    previousValue: 'pending',
    newValue: 'confirmed',
    reason: '与主办律师电话确认，风险属实',
  };
}

describe('createInMemoryRevisionEventStore', () => {
  it('record then list returns what was recorded, in order', () => {
    const store = createInMemoryRevisionEventStore();
    store.record(sampleEvent('rev-1'));
    store.record(sampleEvent('rev-2'));
    expect(store.list().map((e) => e.id)).toEqual(['rev-1', 'rev-2']);
  });

  it('rejects a record without sessionId (core persistence contract is stricter than the schema)', () => {
    const store = createInMemoryRevisionEventStore();
    expect(() => store.record(sampleEventWithoutSessionId('rev-missing-session'))).toThrow(MissingSessionIdError);
  });
});

describe('createFileRevisionEventStore (append-only JSONL, durable)', () => {
  it('records survive as a fresh instance pointed at the same file (捕获落盘)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-revisionstore-'));
    const filePath = join(dir, 'revision-events.jsonl');
    try {
      const writer = createFileRevisionEventStore(filePath);
      writer.record(sampleEvent('rev-1'));

      const reader = createFileRevisionEventStore(filePath);
      reader.record(sampleEvent('rev-2'));

      expect(reader.list().map((e) => e.id)).toEqual(['rev-1', 'rev-2']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a round-tripped record still satisfies RevisionEventSchema (JSON roundtrip does not corrupt the shape)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-revisionstore-'));
    const filePath = join(dir, 'revision-events.jsonl');
    try {
      const store = createFileRevisionEventStore(filePath);
      store.record(sampleEvent('rev-1'));
      const [roundTripped] = store.list();
      expect(RevisionEventSchema.safeParse(roundTripped).success).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('list() on a file that does not exist yet returns an empty array', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-revisionstore-'));
    try {
      const store = createFileRevisionEventStore(join(dir, 'never-written.jsonl'));
      expect(store.list()).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects writing a record without sessionId and leaves the file untouched', () => {
    const dir = mkdtempSync(join(tmpdir(), 'courtwork-core-revisionstore-'));
    const filePath = join(dir, 'revision-events.jsonl');
    try {
      const store = createFileRevisionEventStore(filePath);
      expect(() => store.record(sampleEventWithoutSessionId('rev-missing-session'))).toThrow(MissingSessionIdError);
      expect(store.list()).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
