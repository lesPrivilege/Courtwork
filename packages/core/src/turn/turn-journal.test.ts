import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  DuplicateInteractionRequestError,
  InvalidInteractionActorError,
  InvalidInteractionAnswerError,
  TurnInteractionStateError,
  UnknownInteractionRequestError,
  createMemoryTurnStore,
  type TurnStore,
} from './turn-store.js';
import { createFileTurnStore } from './turn-store-file.js';
import type { InteractionRequestedEventInput, PersistedTurn } from './types.js';

const requested: InteractionRequestedEventInput = {
  type: 'interaction_requested',
  turnId: 'turn-1',
  requestId: 'interaction-1',
  packageId: 'pkg',
  templateId: 'pkg.review',
  kind: 'single_choice',
  question: '请选择',
  options: [{ id: 'accept', label: '接受' }, { id: 'revise', label: '修正' }],
  skippable: false,
  anchorPolicy: 'none',
  uiTemplateId: 'question-card',
  sourceAnchors: [],
};

const completed: PersistedTurn = {
  status: 'completed',
  turnId: 'turn-1',
  providerRequestId: 'provider-1',
  providerId: 'provider-a',
  modelId: 'model-a',
  assistantMessage: '正文',
  reasoning: { status: 'absent' },
  finishReason: 'stop',
  completedAt: '2026-07-14T00:00:03.000Z',
};

const failed: PersistedTurn = {
  status: 'failed',
  turnId: 'turn-failed',
  providerRequestId: 'provider-failed',
  providerId: 'provider-a',
  modelId: 'model-a',
  reasoning: { status: 'absent' },
  failure: { kind: 'network', message: 'offline', retryable: false },
  failedAt: '2026-07-14T00:00:03.000Z',
};

function resolve(store: TurnStore, requestId = 'interaction-1') {
  return store.resolveInteraction({
    requestId,
    actor: { channelId: 'cli', actorId: 'user-1' },
    answer: { kind: 'option', optionId: 'accept' },
  });
}

describe.each([
  ['memory', () => createMemoryTurnStore(() => '2026-07-14T00:00:00.000Z')],
  ['file', () => {
    const directory = mkdtempSync(join(tmpdir(), 'courtwork-interaction-journal-'));
    return createFileTurnStore(join(directory, 'turns.jsonl'), () => '2026-07-14T00:00:00.000Z');
  }],
])('%s TurnStore journal', (_label, createStore) => {
  it('replays idle -> pending -> resolved_waiting_resume -> completed with contiguous journal seq', () => {
    const store = createStore();
    expect(store.replayTurn('turn-1')).toMatchObject({ state: 'idle', events: [] });

    const pending = store.appendInteractionRequested(requested);
    expect(pending).toMatchObject({ seq: 0, emittedAt: '2026-07-14T00:00:00.000Z' });
    expect(store.replayTurn('turn-1')).toMatchObject({
      state: 'pending_interaction', pendingInteraction: pending,
    });

    const resolved = resolve(store);
    expect(resolved).toMatchObject({ seq: 1, turnId: 'turn-1', requestId: 'interaction-1' });
    expect(store.events('turn-1')).toEqual([pending, resolved]);
    expect(store.replayTurn('turn-1')).toMatchObject({
      state: 'resolved_waiting_resume',
      resolvedInteraction: resolved,
    });

    store.save(completed);
    expect(store.get('turn-1')).toEqual(completed);
    expect(store.list()).toContainEqual(completed);
    expect(store.replayTurn('turn-1')).toMatchObject({ state: 'completed', terminal: completed });
  });

  it('rejects a duplicate request id globally without appending', () => {
    const store = createStore();
    store.appendInteractionRequested(requested);
    expect(() => store.appendInteractionRequested({
      ...requested, turnId: 'turn-2',
    })).toThrow(DuplicateInteractionRequestError);
    expect(store.events('turn-2')).toEqual([]);
  });

  it('rejects a second pending interaction on the same turn', () => {
    const store = createStore();
    store.appendInteractionRequested(requested);
    expect(() => store.appendInteractionRequested({
      ...requested, requestId: 'interaction-2',
    })).toThrow(TurnInteractionStateError);
    expect(store.events('turn-1')).toHaveLength(1);
  });

  it('rejects interaction requests after a terminal snapshot', () => {
    const store = createStore();
    store.save(completed);
    expect(() => store.appendInteractionRequested(requested)).toThrow(TurnInteractionStateError);
    expect(store.events('turn-1')).toEqual([]);
  });

  it('replays a failed terminal snapshot as failed', () => {
    const store = createStore();
    store.save(failed);
    expect(store.replayTurn('turn-failed')).toMatchObject({ state: 'failed', terminal: failed });
  });

  it.each([
    {
      label: 'empty channel',
      input: { requestId: 'interaction-1', actor: { channelId: '', actorId: 'u' }, answer: { kind: 'option', optionId: 'accept' } },
      error: InvalidInteractionActorError,
    },
    {
      label: 'empty actor',
      input: { requestId: 'interaction-1', actor: { channelId: 'cli', actorId: ' ' }, answer: { kind: 'option', optionId: 'accept' } },
      error: InvalidInteractionActorError,
    },
    {
      label: 'malformed actor',
      input: { requestId: 'interaction-1', actor: null, answer: { kind: 'option', optionId: 'accept' } },
      error: InvalidInteractionActorError,
    },
    {
      label: 'unknown option',
      input: { requestId: 'interaction-1', actor: { channelId: 'cli', actorId: 'u' }, answer: { kind: 'option', optionId: 'missing' } },
      error: InvalidInteractionAnswerError,
    },
    {
      label: 'forbidden skip',
      input: { requestId: 'interaction-1', actor: { channelId: 'cli', actorId: 'u' }, answer: { kind: 'skip' } },
      error: InvalidInteractionAnswerError,
    },
    {
      label: 'malformed answer',
      input: { requestId: 'interaction-1', actor: { channelId: 'cli', actorId: 'u' }, answer: null },
      error: InvalidInteractionAnswerError,
    },
  ])('does not consume pending on $label', ({ input, error }) => {
    const store = createStore();
    store.appendInteractionRequested(requested);
    expect(() => store.resolveInteraction(input as Parameters<TurnStore['resolveInteraction']>[0])).toThrow(error);
    expect(store.events('turn-1')).toHaveLength(1);
    expect(store.replayTurn('turn-1').state).toBe('pending_interaction');
  });

  it('allows skip only when the immutable request snapshot is skippable', () => {
    const store = createStore();
    store.appendInteractionRequested({ ...requested, skippable: true });
    expect(store.resolveInteraction({
      requestId: 'interaction-1',
      actor: { channelId: 'cli', actorId: 'u' },
      answer: { kind: 'skip' },
    })).toMatchObject({ answer: { kind: 'skip' } });
  });

  it('rejects answer fields outside the closed discriminated union without consuming pending', () => {
    const store = createStore();
    store.appendInteractionRequested(requested);
    expect(() => store.resolveInteraction({
      requestId: 'interaction-1',
      actor: { channelId: 'cli', actorId: 'u' },
      answer: { kind: 'option', optionId: 'accept', rawBody: 'must-not-persist' },
    } as unknown as Parameters<TurnStore['resolveInteraction']>[0])).toThrow(InvalidInteractionAnswerError);
    expect(store.replayTurn('turn-1').state).toBe('pending_interaction');
    expect(JSON.stringify(store.events('turn-1'))).not.toContain('must-not-persist');
  });

  it('rejects unknown and already resolved requests without overwriting the first answer', () => {
    const store = createStore();
    expect(() => resolve(store)).toThrow(UnknownInteractionRequestError);
    store.appendInteractionRequested(requested);
    const first = resolve(store);
    expect(() => store.resolveInteraction({
      requestId: 'interaction-1',
      actor: { channelId: 'cli', actorId: 'user-2' },
      answer: { kind: 'option', optionId: 'revise' },
    })).toThrow(UnknownInteractionRequestError);
    expect(store.events('turn-1')).toEqual([expect.anything(), first]);
  });

  it('commits only the first of concurrent answers', async () => {
    const store = createStore();
    store.appendInteractionRequested(requested);
    const attempts = await Promise.allSettled([
      Promise.resolve().then(() => resolve(store)),
      Promise.resolve().then(() => store.resolveInteraction({
        requestId: 'interaction-1',
        actor: { channelId: 'cli', actorId: 'user-2' },
        answer: { kind: 'option', optionId: 'revise' },
      })),
    ]);
    expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(attempts.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(store.events('turn-1').filter((event) => event.type === 'interaction_resolved')).toHaveLength(1);
  });
});

describe('file TurnStore refresh', () => {
  it('rebuilds pending and resolved state from fresh JSONL instances', () => {
    const directory = mkdtempSync(join(tmpdir(), 'courtwork-interaction-refresh-'));
    const filePath = join(directory, 'turns.jsonl');
    try {
      createFileTurnStore(filePath).appendInteractionRequested(requested);
      expect(createFileTurnStore(filePath).replayTurn('turn-1').state).toBe('pending_interaction');
      resolve(createFileTurnStore(filePath));
      const fresh = createFileTurnStore(filePath);
      expect(fresh.replayTurn('turn-1').state).toBe('resolved_waiting_resume');
      expect(fresh.events('turn-1')).toHaveLength(2);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('lets only one fresh file-store instance append a concurrent resolution', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'courtwork-interaction-concurrent-'));
    const filePath = join(directory, 'turns.jsonl');
    try {
      createFileTurnStore(filePath).appendInteractionRequested(requested);
      const first = createFileTurnStore(filePath);
      const second = createFileTurnStore(filePath);
      const attempts = await Promise.allSettled([
        Promise.resolve().then(() => resolve(first)),
        Promise.resolve().then(() => second.resolveInteraction({
          requestId: 'interaction-1', actor: { channelId: 'cli', actorId: 'user-2' },
          answer: { kind: 'option', optionId: 'revise' },
        })),
      ]);
      expect(attempts.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
      expect(createFileTurnStore(filePath).events('turn-1')).toHaveLength(2);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
