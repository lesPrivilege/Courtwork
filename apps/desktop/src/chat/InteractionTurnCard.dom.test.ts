// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TurnReplay } from '@courtwork/core/turn-protocol';

import { InteractionTurnCard, interactionViewFromReplay } from './TurnCard';

const requested = {
  type: 'interaction_requested', turnId: 'turn-dom', seq: 0, emittedAt: '2026-07-14T00:00:00.000Z',
  requestId: 'request-dom', packageId: 'pkg', templateId: 'pkg.question', kind: 'confirmation',
  question: '是否确认', options: [{ id: 'confirm', label: '确认' }, { id: 'revise', label: '修正' }],
  skippable: false, anchorPolicy: 'none', uiTemplateId: 'question-card', sourceAnchors: [],
} as const;

const replay: TurnReplay = {
  turnId: 'turn-dom', state: 'pending_interaction', events: [requested], pendingInteraction: requested,
};

const anchoredReplay: TurnReplay = {
  turnId: 'turn-dom',
  state: 'pending_interaction',
  events: [{
    ...requested,
    anchorPolicy: 'required',
    sourceAnchors: [{ fileId: '原件.md', textRange: { start: 2, end: 4 }, textLayerVersion: 'v1', quote: '原文' }],
  }],
  pendingInteraction: {
    ...requested,
    anchorPolicy: 'required',
    sourceAnchors: [{ fileId: '原件.md', textRange: { start: 2, end: 4 }, textLayerVersion: 'v1', quote: '原文' }],
  },
};

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function renderCard(onResolve: (answer: { kind: 'option'; optionId: string } | { kind: 'skip' }) => Promise<void>) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(createElement(InteractionTurnCard, { view: interactionViewFromReplay(replay), onResolve })));
  return container;
}

describe('InteractionTurnCard browser interaction', () => {
  it('提交期间锁住选项，双击只能触发一次 resolve', async () => {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const onResolve = vi.fn(() => pending);
    const host = renderCard(onResolve);
    const confirm = host.querySelector<HTMLButtonElement>('[data-testid="question-option-confirm"]')!;
    await act(async () => {
      confirm.click();
      confirm.click();
      await Promise.resolve();
    });
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(confirm.disabled).toBe(true);
    await act(async () => { release(); await pending; });
  });

  it('resolve 失败保留 pending，可见错误且允许重试', async () => {
    const onResolve = vi.fn()
      .mockRejectedValueOnce(new Error('写入失败'))
      .mockResolvedValueOnce(undefined);
    const host = renderCard(onResolve);
    const confirm = host.querySelector<HTMLButtonElement>('[data-testid="question-option-confirm"]')!;
    await act(async () => { confirm.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('写入失败');
    expect(confirm.disabled).toBe(false);
    await act(async () => { confirm.click(); await Promise.resolve(); });
    expect(onResolve).toHaveBeenCalledTimes(2);
  });

  it('source route reject 被卡片收敛成可见错误', async () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root?.render(createElement(InteractionTurnCard, {
      view: interactionViewFromReplay(anchoredReplay),
      onResolve: async () => undefined,
      onOpenSource: async () => { throw new Error('版本漂移'); },
    })));
    const source = container.querySelector<HTMLButtonElement>('[data-testid="interaction-source-0"]')!;
    await act(async () => { source.click(); await Promise.resolve(); await Promise.resolve(); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('版本漂移');
  });
});
