import { describe, expect, it } from 'vitest';

import { TurnProtocolClient, createLocalStorageTurnJournalBackend } from '../provider/turn-protocol-client';
import { resolveReaderFocus } from '../material/material-actions';
import type { MaterialBlock } from '../material/material-ref';
import { DEMO_CASE_ID } from '../case/case-scope';
import { DEMO_ARTIFACTS } from './recordings';
import {
  LEGAL_DEMO_INTERACTION_TURN_ID,
  ensureLegalDemoInteraction,
  resolveLegalDemoSource,
} from './legal-interaction';
import contractSourceMd from '../../../../packages/demo-data/data/dossier/04-设备采购合同.md?raw';

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
    const replay = ensureLegalDemoInteraction(client, DEMO_CASE_ID);
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
    const original = ensureLegalDemoInteraction(first, DEMO_CASE_ID).pendingInteraction!;
    const anchor = DEMO_ARTIFACTS.riskList.risks[0]!.basis[0]!.sourceAnchors[0]!;
    const originalQuote = anchor.quote;
    (anchor as { quote: string }).quote = '被后续材料更新替换';
    try {
      const refreshed = new TurnProtocolClient(createLocalStorageTurnJournalBackend(storage));
      const replay = ensureLegalDemoInteraction(refreshed, DEMO_CASE_ID);
      expect(replay.events).toHaveLength(1);
      expect(replay.pendingInteraction).toEqual(original);
      expect(replay.pendingInteraction?.sourceAnchors[0]?.quote).toBe(originalQuote);
    } finally {
      (anchor as { quote: string | undefined }).quote = originalQuote;
    }
  });

  it('source route 验证 file/version/range/quote 后才返回原件与 focusAnchor', () => {
    const client = new TurnProtocolClient(createLocalStorageTurnJournalBackend(new MemoryStorage()));
    const anchor = ensureLegalDemoInteraction(client, DEMO_CASE_ID).pendingInteraction!.sourceAnchors[0]!;
    const route = resolveLegalDemoSource(anchor, DEMO_CASE_ID);
    expect(route.markdown.slice(route.focusAnchor.textRange!.start, route.focusAnchor.textRange!.end)).toBe(anchor.quote);
    expect(() => resolveLegalDemoSource({ ...anchor, fileId: '未知.md' }, DEMO_CASE_ID)).toThrow(/未知|unknown/i);
    expect(() => resolveLegalDemoSource({ ...anchor, textLayerVersion: 'stale' }, DEMO_CASE_ID)).toThrow(/版本|version/i);
    expect(() => resolveLegalDemoSource({ ...anchor, quote: '漂移引语' }, DEMO_CASE_ID)).toThrow(/引语|quote/i);
  });

  it('rejects a non-demo caseId before reading legal demo fixtures', () => {
    const client = new TurnProtocolClient(createLocalStorageTurnJournalBackend(new MemoryStorage()));
    expect(() => ensureLegalDemoInteraction(client, 'case-real')).toThrow(/demo/i);
  });
});

/**
 * DEMO-ANCHOR-1 F2：消费端对齐——判别力的真座位在真实 resolver，不在数据包自含谓词。
 * 全文单块文本层与 desktop legal-interaction.ts 的 CONTRACT_TEXT_LAYER 同构。
 */
describe('risk-list.json × resolveReaderFocus 消费端对齐', () => {
  function contentVersion(text: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return `source-text@1:${text.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  const blocks: readonly MaterialBlock[] = [{
    blockId: 'source',
    text: contractSourceMd,
    rangeBase: 0,
    textLayerVersion: contentVersion(contractSourceMd),
  }];

  function allAnchors() {
    return DEMO_ARTIFACTS.riskList.risks.flatMap((risk) =>
      risk.basis.flatMap((basis) =>
        basis.sourceAnchors.map((anchor) => ({ riskId: risk.id, anchor })),
      ),
    );
  }

  it('8 枚锚点全部经真实 resolveReaderFocus 解析为 focus（非 blocked）', () => {
    const anchors = allAnchors();
    expect(anchors).toHaveLength(8);
    for (const { riskId, anchor } of anchors) {
      const result = resolveReaderFocus(blocks, anchor);
      expect(result.status, `${riskId}: ${anchor.quote?.slice(0, 20)}… 不得落 anchor_invalid`).toBe('focus');
    }
  });

  const INVALID_FIXTURES: Array<[string, Parameters<typeof resolveReaderFocus>[1]]> = [
    ['缺 textLayerVersion', { fileId: '04-设备采购合同.md', quote: '验收标准以甲方提供的技术参数为准', textRange: { start: 756, end: 772 } }],
    ['textLayerVersion 漂移', { fileId: '04-设备采购合同.md', quote: '验收标准以甲方提供的技术参数为准', textRange: { start: 756, end: 772 }, textLayerVersion: 'stale-version' }],
    ['end < start（反转区间）', { fileId: '04-设备采购合同.md', quote: '验收标准以甲方提供的技术参数为准', textRange: { start: 772, end: 756 }, textLayerVersion: contentVersion(contractSourceMd) }],
    ['quote 与切片不一致', { fileId: '04-设备采购合同.md', quote: '完全不存在的文本', textRange: { start: 756, end: 772 }, textLayerVersion: contentVersion(contractSourceMd) }],
    ['end 越界', { fileId: '04-设备采购合同.md', quote: 'x', textRange: { start: contractSourceMd.length, end: contractSourceMd.length + 1 }, textLayerVersion: contentVersion(contractSourceMd) }],
  ];

  it.each(INVALID_FIXTURES)('%s → resolver 落 blocked/anchor_invalid', (label, anchor) => {
    const result = resolveReaderFocus(blocks, anchor);
    expect(result.status, `反例 "${label}" 必须被 resolver 阻断`).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.reason).toBe('anchor_invalid');
    }
  });
});
