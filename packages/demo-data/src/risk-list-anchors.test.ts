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

function allAnchors() {
  const result: Array<{ riskId: string; basisIndex: number; anchorIndex: number; anchor: typeof riskList.risks[0]['basis'][0]['sourceAnchors'][0] }> = [];
  for (const risk of riskList.risks) {
    for (let bi = 0; bi < risk.basis.length; bi++) {
      for (let ai = 0; ai < risk.basis[bi]!.sourceAnchors.length; ai++) {
        result.push({ riskId: risk.id, basisIndex: bi, anchorIndex: ai, anchor: risk.basis[bi]!.sourceAnchors[ai]! });
      }
    }
  }
  return result;
}

describe('risk-list.json 锚点对齐样板案原文（结构真值）', () => {
  const anchors = allAnchors();
  const locatable = anchors.filter((a) => a.anchor.textLayerVersion);
  const exhibit = anchors.filter((a) => !a.anchor.textLayerVersion);

  it('恰 8 枚锚点（6 可定位 + 2 指定展品）', () => {
    expect(anchors.length).toBe(8);
    expect(locatable.length).toBe(6);
    expect(exhibit.length).toBe(2);
  });

  it('6 个 risk-id 各至少一枚锚点', () => {
    const ids = new Set(anchors.map((a) => a.riskId));
    expect(ids.size).toBe(6);
    for (let i = 1; i <= 6; i++) expect(ids.has(`risk-0${i}`)).toBe(true);
  });

  it.each(locatable.map((a) => [`${a.riskId}[${a.basisIndex}][${a.anchorIndex}]`, a] as const))(
    '%s: slice===quote、start>0、end≤length',
    (_label, { anchor }) => {
      expect(anchor.fileId).toBe('04-设备采购合同.md');
      expect(anchor.textLayerVersion, 'textLayerVersion 必须存在且为非空字符串').toBeTruthy();
      const { start, end } = anchor.textRange;
      expect(start, 'start 不得恒为 0').toBeGreaterThan(0);
      expect(end).toBeGreaterThan(start);
      expect(end, 'end 不得越界').toBeLessThanOrEqual(contractSource.length);
      expect(contractSource.slice(start, end), `offset [${start},${end}) 切片必须逐字等于 quote`).toBe(anchor.quote);
    },
  );

  it('指定展品恰两枚：risk-02[0] 与 risk-06[0]（statute 文本，结构性不可锚于合同）', () => {
    expect(exhibit).toHaveLength(2);
    const ids = exhibit.map((e) => `${e.riskId}[${e.basisIndex}]`);
    expect(ids).toContain('risk-02[0]');
    expect(ids).toContain('risk-06[0]');
    for (const e of exhibit) {
      expect(e.anchor.textLayerVersion).toBeUndefined();
      expect(e.anchor.quote.length).toBeGreaterThan(2);
    }
  });

  it('6 枚 textLayerVersion 彼此相等（内部一致）', () => {
    const versions = new Set(locatable.map((a) => a.anchor.textLayerVersion));
    expect(versions.size, '所有可定位锚点应指向同一文本层版本').toBe(1);
    const version = [...versions][0]!;
    expect(version.length).toBeGreaterThan(0);
  });

  it('quote 不含控制字符且长度 > 2（非退化引文）', () => {
    for (const { anchor } of anchors) {
      expect(anchor.quote.length).toBeGreaterThan(2);
      // eslint-disable-next-line no-control-regex
      expect(anchor.quote).not.toMatch(/[\x00-\x08\x0b\x0c\x0e-\x1f]/);
    }
  });
});
