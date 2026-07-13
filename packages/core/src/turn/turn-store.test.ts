import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { createFileTurnStore } from './turn-store.js';
import type { PersistedTurn } from './types.js';

const completed: PersistedTurn = {
  status: 'completed',
  turnId: 'turn-1',
  requestId: 'request-1',
  providerId: 'provider-a',
  modelId: 'model-a',
  assistantMessage: '最终正文',
  reasoning: { status: 'present', content: '推理内容' },
  usage: { inputTokens: 3, outputTokens: 4 },
  finishReason: 'stop',
  completedAt: '2026-07-13T00:00:00.000Z',
};

describe('createFileTurnStore', () => {
  it('lets a fresh instance replay final content, reasoning and usage from append-only storage', () => {
    const directory = mkdtempSync(join(tmpdir(), 'courtwork-turn-'));
    const filePath = join(directory, 'turns.jsonl');
    try {
      createFileTurnStore(filePath).save(completed);

      const fresh = createFileTurnStore(filePath);
      expect(fresh.get('turn-1')).toEqual(completed);
      expect(fresh.list()).toEqual([completed]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects duplicate turn ids instead of overwriting immutable history', () => {
    const directory = mkdtempSync(join(tmpdir(), 'courtwork-turn-'));
    const filePath = join(directory, 'turns.jsonl');
    try {
      const store = createFileTurnStore(filePath);
      store.save(completed);
      expect(() => store.save({ ...completed, assistantMessage: '被改写' })).toThrow(/turn-1/);
      expect(createFileTurnStore(filePath).list()).toEqual([completed]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
