import { describe, expect, it } from 'vitest';

import type { InteractionTemplateRegistry, InteractionTemplateSnapshot } from '@courtwork/registry';
import type { QuoteClaim } from '@courtwork/schemas';

import type { MaterialTextLayer } from '../citation/resolver.js';
import {
  InteractionAnchorPolicyError,
  InteractionAnchorResolutionError,
  InvalidInteractionRequestError,
  UnknownInteractionTemplateError,
  requestInteraction,
} from './interaction-coordinator.js';
import { createMemoryTurnStore } from './turn-store.js';

const TEMPLATE: InteractionTemplateSnapshot = {
  id: 'pkg.review',
  kind: 'single_choice',
  question: '请选择处理方式',
  options: [
    { id: 'accept', label: '接受' },
    { id: 'revise', label: '修正', description: '补充材料后修正' },
  ],
  skippable: false,
  anchorPolicy: 'required',
  uiTemplateId: 'question-card',
};

const LAYERS: MaterialTextLayer[] = [
  {
    fileId: 'file-1',
    blocks: [
      {
        blockId: 'block-1',
        page: 1,
        text: '前文。需要确认的原句。后文。',
        rangeBase: 0,
        textLayerVersion: 'sha256:text-v1',
      },
    ],
  },
];

const CLAIM: QuoteClaim = {
  fileId: 'file-1',
  page: 1,
  blockId: 'block-1',
  exactQuote: '需要确认的原句',
};

function registryFor(template: InteractionTemplateSnapshot | undefined = TEMPLATE): InteractionTemplateRegistry {
  return {
    get(packageId, templateId) {
      return packageId === 'pkg' && templateId === 'pkg.review' ? template : undefined;
    },
  };
}

function input(anchorRefs: QuoteClaim[] = [CLAIM]) {
  return {
    turnId: 'turn-1',
    requestId: 'interaction-1',
    packageId: 'pkg',
    templateId: 'pkg.review',
    anchorRefs,
  };
}

describe('requestInteraction', () => {
  it('resolves the registry by package/template double key and journals only an immutable template + system anchor snapshot', () => {
    const store = createMemoryTurnStore(() => '2026-07-14T00:00:00.000Z');
    const mutableTemplate = structuredClone(TEMPLATE) as unknown as InteractionTemplateSnapshot;
    const event = requestInteraction(input(), {
      templateRegistry: registryFor(mutableTemplate),
      materials: LAYERS,
      store,
    });

    expect(event).toEqual({
      type: 'interaction_requested',
      turnId: 'turn-1',
      seq: 0,
      emittedAt: '2026-07-14T00:00:00.000Z',
      requestId: 'interaction-1',
      packageId: 'pkg',
      templateId: 'pkg.review',
      kind: 'single_choice',
      question: '请选择处理方式',
      options: [
        { id: 'accept', label: '接受' },
        { id: 'revise', label: '修正', description: '补充材料后修正' },
      ],
      skippable: false,
      anchorPolicy: 'required',
      uiTemplateId: 'question-card',
      sourceAnchors: [
        {
          fileId: 'file-1',
          page: 1,
          textRange: { start: 3, end: 10 },
          textLayerVersion: 'sha256:text-v1',
          quote: '需要确认的原句',
        },
      ],
    });
    expect(event).not.toHaveProperty('providerRequestId');
    expect(event).not.toHaveProperty('anchorRefs');

    (mutableTemplate.options[0] as { label: string }).label = '被升级改写';
    (mutableTemplate as { question: string }).question = '升级后的问题';
    expect(store.events('turn-1')[0]).toEqual(event);
    expect(store.events('turn-1')[0]).not.toEqual(expect.objectContaining({ question: '升级后的问题' }));
  });

  it('uses both registry keys and rejects an unknown or cross-package template without journaling', () => {
    const store = createMemoryTurnStore();
    expect(() => requestInteraction({ ...input(), packageId: 'other' }, {
      templateRegistry: registryFor(), materials: LAYERS, store,
    })).toThrow(UnknownInteractionTemplateError);
    expect(store.events('turn-1')).toEqual([]);
  });

  it('rejects empty identifiers before registry lookup without journaling', () => {
    const store = createMemoryTurnStore();
    expect(() => requestInteraction({ ...input(), turnId: ' ' }, {
      templateRegistry: registryFor(), materials: LAYERS, store,
    })).toThrow(InvalidInteractionRequestError);
    expect(store.events('turn-1')).toEqual([]);
  });

  it.each([
    { policy: 'none' as const, refs: [CLAIM], allowed: false },
    { policy: 'none' as const, refs: [], allowed: true },
    { policy: 'optional' as const, refs: [], allowed: true },
    { policy: 'optional' as const, refs: [CLAIM], allowed: true },
    { policy: 'required' as const, refs: [], allowed: false },
    { policy: 'required' as const, refs: [CLAIM], allowed: true },
  ])('enforces $policy anchor policy for $refs.length refs', ({ policy, refs, allowed }) => {
    const store = createMemoryTurnStore();
    const template = { ...TEMPLATE, anchorPolicy: policy } as InteractionTemplateSnapshot;
    const invoke = () => requestInteraction(input(refs), {
      templateRegistry: registryFor(template), materials: LAYERS, store,
    });
    if (allowed) expect(invoke).not.toThrow();
    else expect(invoke).toThrow(InteractionAnchorPolicyError);
    expect(store.events('turn-1')).toHaveLength(allowed ? 1 : 0);
  });

  it.each([
    {
      reason: 'not_found',
      claim: { ...CLAIM, exactQuote: '不存在的原句' },
      materials: LAYERS,
    },
    {
      reason: 'ambiguous',
      claim: { fileId: 'file-ambiguous', exactQuote: '重复' },
      materials: [{
        fileId: 'file-ambiguous',
        blocks: [{ blockId: 'b', text: '重复，然后重复', rangeBase: 0, textLayerVersion: 'v1' }],
      }],
    },
    {
      reason: 'file_unavailable',
      claim: { ...CLAIM, fileId: 'missing-file' },
      materials: LAYERS,
    },
  ])('rejects $reason atomically with zero journal entries', ({ reason, claim, materials }) => {
    const store = createMemoryTurnStore();
    expect(() => requestInteraction(input([claim]), {
      templateRegistry: registryFor(), materials, store,
    })).toThrow(InteractionAnchorResolutionError);
    expect(store.events('turn-1')).toEqual([]);
    expect(store.replayTurn('turn-1').state).toBe('idle');
    expect(reason).toBeTruthy();
  });

  it('rejects a mixed valid/invalid anchor batch atomically without journaling the valid prefix', () => {
    const store = createMemoryTurnStore();
    expect(() => requestInteraction(input([
      CLAIM,
      { ...CLAIM, exactQuote: '不存在的第二条引语' },
    ]), {
      templateRegistry: registryFor(), materials: LAYERS, store,
    })).toThrow(InteractionAnchorResolutionError);
    expect(store.events('turn-1')).toEqual([]);
    expect(store.replayTurn('turn-1').state).toBe('idle');
  });

  it('runtime-validates strict QuoteClaim and rejects model-supplied coordinates with zero journal entries', () => {
    const store = createMemoryTurnStore();
    const forged = { ...CLAIM, textRange: { start: 3, end: 11 }, bbox: { x: 0, y: 0, width: 1, height: 1 } };
    expect(() => requestInteraction(input([forged as QuoteClaim]), {
      templateRegistry: registryFor(), materials: LAYERS, store,
    })).toThrow(InteractionAnchorResolutionError);
    expect(store.events('turn-1')).toEqual([]);
  });

  it('rejects coordinator extras and never persists registry extras, material text, transport data or keys', () => {
    const store = createMemoryTurnStore();
    const secret = 'interaction-transport-api-key-secret';
    const maliciousTemplate = {
      ...TEMPLATE,
      apiKey: secret,
      transport: { authorization: `Bearer ${secret}` },
    } as unknown as InteractionTemplateSnapshot;
    expect(() => requestInteraction({
      ...input(),
      apiKey: secret,
      transport: { rawBody: secret },
    } as unknown as ReturnType<typeof input>, {
      templateRegistry: registryFor(maliciousTemplate),
      materials: LAYERS,
      store,
    })).toThrow(InvalidInteractionRequestError);
    expect(store.events('turn-1')).toEqual([]);

    const event = requestInteraction(input(), {
      templateRegistry: registryFor(maliciousTemplate),
      materials: LAYERS,
      store,
    });

    const serialized = JSON.stringify({ event, journal: store.events('turn-1') });
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('前文。');
    expect(serialized).not.toContain('authorization');
    expect(serialized).not.toContain('rawBody');
  });
});
