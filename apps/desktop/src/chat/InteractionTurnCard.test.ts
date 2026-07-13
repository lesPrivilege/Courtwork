import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TurnReplay } from '@courtwork/core/turn-protocol';

import { InteractionTurnCard, interactionViewFromReplay } from './TurnCard';

const requested = {
  type: 'interaction_requested', turnId: 'turn-1', seq: 0, emittedAt: '2026-07-14T00:00:00.000Z',
  requestId: 'request-1', packageId: 'pkg', templateId: 'pkg.question', kind: 'single_choice',
  question: '请选择处理方式',
  options: [
    { id: 'accept', label: '接受', description: '采用当前处理方式' },
    { id: 'revise', label: '修正' },
  ],
  skippable: false, anchorPolicy: 'required', uiTemplateId: 'question-card',
  sourceAnchors: [{ fileId: '原件.md', page: 2, textRange: { start: 3, end: 11 }, textLayerVersion: 'v1', quote: '这是一段必须完整换行显示的原文引语。' }],
} as const;

function pendingReplay(): TurnReplay {
  return { turnId: 'turn-1', state: 'pending_interaction', events: [requested], pendingInteraction: requested };
}

describe('InteractionTurnCard', () => {
  it('只从 core replay 快照渲染问题、description 与完整 anchor；non-skippable 无 Skip', () => {
    const view = interactionViewFromReplay(pendingReplay());
    const html = renderToStaticMarkup(createElement(InteractionTurnCard, { view, onResolve: async () => undefined }));
    expect(html).toContain('请选择处理方式');
    expect(html).toContain('采用当前处理方式');
    expect(html).toContain('这是一段必须完整换行显示的原文引语。');
    expect(html).toContain('原件.md');
    expect(html).not.toContain('>Skip<');
    expect(html).not.toContain('Recorded');
  });

  it('resolved 显示只来自 interaction_resolved 回放，不存在 local answer 占位', () => {
    const resolved = {
      type: 'interaction_resolved', turnId: 'turn-1', seq: 1, emittedAt: '2026-07-14T00:00:01.000Z',
      requestId: 'request-1', actor: { channelId: 'desktop', actorId: 'local-user' },
      answer: { kind: 'option', optionId: 'accept' },
    } as const;
    const replay: TurnReplay = {
      turnId: 'turn-1', state: 'resolved_waiting_resume', events: [requested, resolved], resolvedInteraction: resolved,
    };
    const html = renderToStaticMarkup(createElement(InteractionTurnCard, {
      view: interactionViewFromReplay(replay), onResolve: async () => undefined,
    }));
    expect(html).toContain('Recorded');
    expect(html).toContain('接受');
    expect(html).toContain('data-answer="accept"');
  });

  it('skippable snapshot 才出现 Skip', () => {
    const skippable = { ...requested, skippable: true, anchorPolicy: 'optional' as const, sourceAnchors: [] };
    const replay: TurnReplay = { turnId: 'turn-1', state: 'pending_interaction', events: [skippable], pendingInteraction: skippable };
    const html = renderToStaticMarkup(createElement(InteractionTurnCard, {
      view: interactionViewFromReplay(replay), onResolve: async () => undefined,
    }));
    expect(html).toContain('>Skip<');
  });
});
