import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const contractPath = join(import.meta.dirname, '..', 'data', 'dossier', '04-设备采购合同.md');
const riskListPath = join(import.meta.dirname, '..', 'data', 'artifacts', 'risk-list.json');
const contractSource = readFileSync(contractPath, 'utf8');
const riskList = JSON.parse(readFileSync(riskListPath, 'utf8')) as {
  risks: Array<{
    id: string;
    basis: Array<{
      sourceAnchors: Array<{
        fileId: string;
        quote: string;
        textRange: { start: number; end: number };
        textLayerVersion?: string;
      }>;
    }>;
  }>;
};

/** FNV-1a — same algorithm as apps/desktop/src/demo/legal-interaction.ts contentVersion. */
function contentVersion(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `source-text@1:${text.length}:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

const EXPECTED_VERSION = contentVersion(contractSource);

function allAnchors(): Array<{ riskId: string; basisIndex: number; anchorIndex: number; anchor: typeof riskList.risks[0]['basis'][0]['sourceAnchors'][0] }> {
  const result: typeof allAnchors extends () => infer R ? R : never = [];
  for (const risk of riskList.risks) {
    for (let bi = 0; bi < risk.basis.length; bi++) {
      for (let ai = 0; ai < risk.basis[bi]!.sourceAnchors.length; ai++) {
        result.push({ riskId: risk.id, basisIndex: bi, anchorIndex: ai, anchor: risk.basis[bi]!.sourceAnchors[ai]! });
      }
    }
  }
  return result;
}

describe('risk-list.json 锚点对齐样板案原文', () => {
  const anchors = allAnchors();

  it('至少有 6 条锚点（risk-01 ~ risk-06 各 basis 至少一枚）', () => {
    expect(anchors.length).toBeGreaterThanOrEqual(6);
  });

  it.each(anchors.map((a) => [`${a.riskId}[${a.basisIndex}][${a.anchorIndex}]`, a] as const))(
    '%s: textRange 切片 === quote 且 textLayerVersion 匹配',
    (_label, { anchor }) => {
      expect(anchor.fileId).toBe('04-设备采购合同.md');
      expect(anchor.textLayerVersion, 'textLayerVersion 必须存在').toBe(EXPECTED_VERSION);
      const { start, end } = anchor.textRange;
      expect(start, 'start 不得恒为 0').toBeGreaterThan(0);
      expect(end).toBeGreaterThan(start);
      expect(contractSource.slice(start, end), `offset [${start},${end}) 切片必须逐字等于 quote`).toBe(anchor.quote);
    },
  );
});

describe('anchor_invalid 反例保全', () => {
  const INVALID_ANCHORS = [
    { label: '缺 textLayerVersion', anchor: { fileId: '04-设备采购合同.md', quote: '验收标准', textRange: { start: 756, end: 760 } } },
    { label: 'textLayerVersion 不匹配', anchor: { fileId: '04-设备采购合同.md', quote: '验收标准', textRange: { start: 756, end: 760 }, textLayerVersion: 'stale-version' } },
    { label: 'start=0 恒零', anchor: { fileId: '04-设备采购合同.md', quote: '验收标准', textRange: { start: 0, end: 4 }, textLayerVersion: EXPECTED_VERSION } },
    { label: 'quote 与切片不一致', anchor: { fileId: '04-设备采购合同.md', quote: '完全不存在的文本', textRange: { start: 756, end: 772 }, textLayerVersion: EXPECTED_VERSION } },
    { label: 'end 越界', anchor: { fileId: '04-设备采购合同.md', quote: 'x', textRange: { start: contractSource.length, end: contractSource.length + 1 }, textLayerVersion: EXPECTED_VERSION } },
  ];

  it.each(INVALID_ANCHORS.map((c) => [c.label, c.anchor] as const))(
    '%s → 至少一项校验失败',
    (_label, anchor) => {
      const fails = [];
      if (!anchor.textLayerVersion || anchor.textLayerVersion !== EXPECTED_VERSION) fails.push('version');
      if (anchor.textRange.start <= 0) fails.push('start');
      if (anchor.textRange.end > contractSource.length) fails.push('bounds');
      if (contractSource.slice(anchor.textRange.start, anchor.textRange.end) !== anchor.quote) fails.push('slice');
      expect(fails.length, `反例 "${_label}" 必须触发至少一项失败`).toBeGreaterThan(0);
    },
  );
});
