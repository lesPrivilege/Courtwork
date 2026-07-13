import { describe, expect, it } from 'vitest';

import { TurnProtocolClient, createLocalStorageTurnJournalBackend } from '../provider/turn-protocol-client';
import { DEMO_ARTIFACTS } from './recordings';
import {
  LEGAL_DEMO_INTERACTION_TURN_ID,
  ensureLegalDemoInteraction,
  resolveLegalDemoSource,
} from './legal-interaction';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe('legal demo interaction adapter', () => {
  it('从真实 risk anchor + contract text layer 机械派生 required immutable snapshot', () => {
    const storage = new MemoryStorage();
    const client = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
    const replay = ensureLegalDemoInteraction(client);
    const source = DEMO_ARTIFACTS.riskList.risks[0]!.basis[0]!.sourceAnchors[0]!;
    expect(replay).toMatchObject({
      turnId: LEGAL_DEMO_INTERACTION_TURN_ID,
      state: 'pending_interaction',
      pendingInteraction: {
        packageId: 'legal', templateId: 'legal.risk-evidence-confirmation', anchorPolicy: 'required', skippable: false,
        sourceAnchors: [{ fileId: source.fileId, quote: source.quote }],
      },
    });
    expect(replay.pendingInteraction?.sourceAnchors[0]?.textRange).toBeDefined();
  });

  it('刷新后非 idle 不重复写，并且源 fixture 后续 mutation 不改事件快照', () => {
    const storage = new MemoryStorage();
    const first = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
    const original = ensureLegalDemoInteraction(first).pendingInteraction!;
    const anchor = DEMO_ARTIFACTS.riskList.risks[0]!.basis[0]!.sourceAnchors[0]!;
    const originalQuote = anchor.quote;
    (anchor as { quote: string }).quote = '被后续材料更新替换';
    try {
      const refreshed = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
      const replay = ensureLegalDemoInteraction(refreshed);
      expect(replay.events).toHaveLength(1);
      expect(replay.pendingInteraction).toEqual(original);
      expect(replay.pendingInteraction?.sourceAnchors[0]?.quote).toBe(originalQuote);
    } finally {
      (anchor as { quote: string }).quote = originalQuote;
    }
  });

  it('source route 验证 file/version/range/quote 后才返回原件与 focusAnchor', () => {
    const client = new TurnProtocolClient(createLocalStorageTurnJournalBackend(new MemoryStorage()));
    const anchor = ensureLegalDemoInteraction(client).pendingInteraction!.sourceAnchors[0]!;
    const route = resolveLegalDemoSource(anchor);
    expect(route.markdown.slice(route.focusAnchor.textRange!.start, route.focusAnchor.textRange!.end)).toBe(anchor.quote);
    expect(() => resolveLegalDemoSource({ ...anchor, fileId: '未知.md' })).toThrow(/未知|unknown/i);
    expect(() => resolveLegalDemoSource({ ...anchor, textLayerVersion: 'stale' })).toThrow(/版本|version/i);
    expect(() => resolveLegalDemoSource({ ...anchor, quote: '漂移引语' })).toThrow(/引语|quote/i);
  });
});
