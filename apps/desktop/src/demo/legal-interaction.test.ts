import { describe, expect, it } from 'vitest';
import type { ResolvedSourceAnchor, SourceAnchor } from '@courtwork/schemas';

import appSource from '../App.tsx?raw';
import { TurnProtocolClient, createLocalStorageTurnJournalBackend } from '../provider/turn-protocol-client';
import { MATERIAL_READER_BLOCK_REASON_COPY, resolveReaderFocus } from '../material/material-actions';
import { DEMO_CASE_ID } from '../case/case-scope';
import { DEMO_ARTIFACTS } from './recordings';
import {
  CONTRACT_TEXT_LAYER,
  LEGAL_DEMO_ANCHOR_BLOCKED_COPY,
  LEGAL_DEMO_INTERACTION_TURN_ID,
  ensureLegalDemoInteraction,
  openLegalDemoSource,
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
 * DEMO-ANCHOR-1 G1+G2：消费端对齐——判别力的真座位在真实 resolver，不在数据包自含谓词。
 * 直接消费生产 CONTRACT_TEXT_LAYER（零副本）；改生产版本或 block 内容即红。
 */
describe('risk-list.json × resolveReaderFocus 消费端对齐', () => {
  const blocks = CONTRACT_TEXT_LAYER.blocks;
  const version = blocks[0]!.textLayerVersion;
  const textLength = blocks[0]!.text.length;

  function allAnchors() {
    return DEMO_ARTIFACTS.riskList.risks.flatMap((risk) =>
      risk.basis.flatMap((basis) =>
        basis.sourceAnchors.map((anchor) => ({ riskId: risk.id, anchor })),
      ),
    );
  }

  it('6 枚可定位锚点经真实 resolveReaderFocus 解析为 focus', () => {
    const locatable = allAnchors().filter((a) => a.anchor.textLayerVersion);
    expect(locatable).toHaveLength(6);
    for (const { riskId, anchor } of locatable) {
      const result = resolveReaderFocus(blocks, anchor);
      expect(result.status, `${riskId}: ${anchor.quote?.slice(0, 20)}… 不得落 anchor_invalid`).toBe('focus');
    }
  });

  it('risk-02[0] 与 risk-06[0] 指定展品（statute 文本无 textLayerVersion）经 resolver 落 anchor_invalid', () => {
    const exhibits = allAnchors().filter((a) => !a.anchor.textLayerVersion);
    expect(exhibits).toHaveLength(2);
    const ids = exhibits.map((e) => e.riskId);
    expect(ids).toContain('risk-02');
    expect(ids).toContain('risk-06');
    for (const { anchor } of exhibits) {
      const result = resolveReaderFocus(blocks, anchor);
      expect(result.status).toBe('blocked');
      if (result.status === 'blocked') expect(result.reason).toBe('anchor_invalid');
    }
  });

  const INVALID_FIXTURES: Array<[string, Parameters<typeof resolveReaderFocus>[1]]> = [
    ['缺 textLayerVersion', { fileId: '04-设备采购合同.md', quote: '验收标准以甲方提供的技术参数为准', textRange: { start: 756, end: 772 } }],
    ['textLayerVersion 漂移', { fileId: '04-设备采购合同.md', quote: '验收标准以甲方提供的技术参数为准', textRange: { start: 756, end: 772 }, textLayerVersion: 'stale-version' }],
    ['end < start（反转区间）', { fileId: '04-设备采购合同.md', quote: '验收标准以甲方提供的技术参数为准', textRange: { start: 772, end: 756 }, textLayerVersion: version }],
    ['quote 与切片不一致', { fileId: '04-设备采购合同.md', quote: '完全不存在的文本', textRange: { start: 756, end: 772 }, textLayerVersion: version }],
    ['end 越界', { fileId: '04-设备采购合同.md', quote: 'x', textRange: { start: textLength, end: textLength + 1 }, textLayerVersion: version }],
  ];

  it.each(INVALID_FIXTURES)('%s → resolver 落 blocked/anchor_invalid', (label, anchor) => {
    const result = resolveReaderFocus(blocks, anchor);
    expect(result.status, `反例 "${label}" 必须被 resolver 阻断`).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.reason).toBe('anchor_invalid');
    }
  });
});

/**
 * DEMO-ANCHOR-2 · 样板案三面产物（时间线／关系图谱／矩阵审阅）的「回到原件」全链可达。
 *
 * 判别力座位同 `DEMO-ANCHOR-1`：不复制坐标算法，直接把产物锚点喂给**生产 resolver**
 * （`resolveLegalDemoSource` 的路由与 fail-closed 判据 + `resolveReaderFocus` 的坐标算法）。
 * 语料任一处漂移、路由漏一份原件、数据回退占位区间，本谱即红。
 */
function faceAnchors(artifact: unknown): SourceAnchor[] {
  const found: SourceAnchor[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node === null || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (typeof record.fileId === 'string' && typeof record.quote === 'string') {
      found.push(record as unknown as SourceAnchor);
      return;
    }
    Object.values(record).forEach(walk);
  };
  walk(artifact);
  return found;
}

describe('DEMO-ANCHOR-2 · 三面产物 × 生产 resolver 消费端对齐', () => {
  const FACES: Array<[string, unknown, number]> = [
    ['timeline', DEMO_ARTIFACTS.timeline, 49],
    ['party-graph', DEMO_ARTIFACTS.partyGraph, 18],
    ['review-matrix', DEMO_ARTIFACTS.reviewMatrix, 70],
  ];

  it.each(FACES)('%s 的全部锚点经 demo route 开面并按坐标落 focus', (face, artifact, expected) => {
    const anchors = faceAnchors(artifact);
    expect(anchors, `${face}: 锚点枚数`).toHaveLength(expected);
    for (const anchor of anchors) {
      const outcome = openLegalDemoSource(anchor as ResolvedSourceAnchor, DEMO_CASE_ID);
      expect(outcome.kind, `${face} · ${anchor.fileId} · ${anchor.quote?.slice(0, 16)}… 必须可回跳`)
        .toBe('reader');
      if (outcome.kind !== 'reader') continue;
      const focus = outcome.doc.focus;
      expect(focus, '开面必须携焦点').toBeDefined();
      const block = outcome.doc.blocks.find((candidate) => candidate.blockId === focus!.blockId)!;
      expect(block.text.slice(focus!.localStart, focus!.localEnd)).toBe(anchor.quote);
      // 生产坐标算法独立复核一遍：路由给出的文本层必须被 resolveReaderFocus 认。
      expect(resolveReaderFocus(outcome.doc.blocks, anchor).status).toBe('focus');
    }
  });

  it('未在 demo 语料内的 fileId 仍显式阻断（路由不是万能兜底）', () => {
    const anchor = faceAnchors(DEMO_ARTIFACTS.timeline)[0]! as ResolvedSourceAnchor;
    const outcome = openLegalDemoSource({ ...anchor, fileId: '未收录的原件.md' }, DEMO_CASE_ID);
    expect(outcome.kind).toBe('blocked');
  });
});

describe('DEMO-ANCHOR-2 · demo 路径的降级文案不指路重跑', () => {
  it('demo 文案与生产文案分立，且不承诺样板案不存在的「重新运行场景」', () => {
    expect(LEGAL_DEMO_ANCHOR_BLOCKED_COPY).not.toBe(MATERIAL_READER_BLOCK_REASON_COPY.anchor_invalid);
    expect(LEGAL_DEMO_ANCHOR_BLOCKED_COPY).not.toContain('重新运行');
    expect(LEGAL_DEMO_ANCHOR_BLOCKED_COPY).not.toContain('场景');
    expect(LEGAL_DEMO_ANCHOR_BLOCKED_COPY).toContain('样板案');
  });

  it('两枚 statute 指定展品是该文案的活消费者（阻断仍在，只是不再乱指路）', () => {
    const exhibits = DEMO_ARTIFACTS.riskList.risks
      .flatMap((risk) => risk.basis.flatMap((basis) => basis.sourceAnchors))
      .filter((anchor) => !anchor.textLayerVersion);
    expect(exhibits).toHaveLength(2);
    for (const anchor of exhibits) {
      const outcome = openLegalDemoSource(anchor as ResolvedSourceAnchor, DEMO_CASE_ID);
      expect(outcome.kind).toBe('blocked');
      if (outcome.kind === 'blocked') expect(outcome.message).toBe(LEGAL_DEMO_ANCHOR_BLOCKED_COPY);
    }
  });

  it('壳的 demo 两处分流都经 openLegalDemoSource，且不再借生产 anchor_invalid 文案', () => {
    expect(appSource).toContain('openLegalDemoSource');
    expect(appSource).not.toContain('MATERIAL_READER_BLOCK_REASON_COPY.anchor_invalid');
    expect(appSource).not.toContain('resolveLegalDemoSource');
  });
});
