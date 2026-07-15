import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import type { GenerationResponse, Provider, ProviderStreamEvent } from '@courtwork/provider/types';

import { runTurn } from './turn-runner.js';
import { createFileTurnStore } from './turn-store-file.js';
import type { PersistedTurn } from './types.js';

const completed: PersistedTurn = {
  status: 'completed',
  turnId: 'turn-1',
  providerRequestId: 'request-1',
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

  it('round-trips the extended usage projection (cache/reasoning slots + rawUsage) without dropping or corrupting it', () => {
    // USAGE-LEDGER-1：drift 门必须接受并原样回放全部可选槽位与 rawUsage（计量真源），
    // 旧 isUsage 只认 input/output 两键 → 本测先红。
    const withFullUsage: PersistedTurn = {
      ...completed,
      turnId: 'turn-usage',
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        cacheHitInputTokens: 80,
        cacheMissInputTokens: 20,
        reasoningOutputTokens: 30,
        rawUsage: { prompt_tokens: 100, completion_tokens: 50, prompt_cache_hit_tokens: 80, prompt_cache_miss_tokens: 20 },
      },
    };
    const directory = mkdtempSync(join(tmpdir(), 'courtwork-turn-'));
    const filePath = join(directory, 'turns.jsonl');
    try {
      createFileTurnStore(filePath).save(withFullUsage);
      expect(createFileTurnStore(filePath).get('turn-usage')).toEqual(withFullUsage);
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

  it('persists only the provider-neutral turn snapshot and replays it without transport or prompt secrets', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'courtwork-turn-'));
    const filePath = join(directory, 'turns.jsonl');
    const provider: Provider = {
      id: 'provider-a',
      modelId: 'model-a',
      async *stream() {
        yield {
          type: 'started', requestId: 'request-1', seq: 0,
          providerId: 'provider-a', modelId: 'model-a',
          rawBody: 'acceptance-raw-body-secret',
          authorization: 'Bearer acceptance-api-key',
        } as unknown as ProviderStreamEvent;
        yield { type: 'content_delta', requestId: 'request-1', seq: 1, delta: '最终正文' };
        yield { type: 'completed', requestId: 'request-1', seq: 2, finishReason: 'stop' };
      },
      async generate(): Promise<GenerationResponse> {
        throw new Error('TURN-1 only consumes Provider.stream');
      },
    };

    try {
      const store = createFileTurnStore(filePath);
      const record = await runTurn({
        turnId: 'turn-1',
        providerRequestId: 'request-1',
        provider,
        request: {
          systemPrompt: 'acceptance-system-prompt-secret',
          messages: [{ role: 'user', content: 'acceptance-user-message-secret' }],
        },
        store,
      });

      expect(record).toMatchObject({ status: 'completed', assistantMessage: '最终正文' });
      expect(createFileTurnStore(filePath).get('turn-1')).toEqual(record);
      expect(readFileSync(filePath, 'utf8')).not.toMatch(
        /acceptance-(?:raw-body-secret|api-key|system-prompt-secret|user-message-secret)/,
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
