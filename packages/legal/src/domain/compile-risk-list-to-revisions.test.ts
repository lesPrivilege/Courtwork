import { describe, expect, it } from 'vitest';
import type { RiskList } from '../schemas/risk-list.js';
import {
  compileConfirmedRiskListToRevisionInstructions,
  MissingLocatorQuoteError,
  type EvidenceGatekeeper,
} from './compile-risk-list-to-revisions.js';

class StubInadmissibleError extends Error {}

/**
 * 门禁 stub：模拟 core EvidenceLedger 的 D4 语义子集（精确匹配签发 + C 级未确认拒收）。
 * 规则本体的测试住 core/evidence；此处验证 compile 与门禁的交互契约——
 * 签发命中才问门禁、门禁抛错必须外传、未命中不签发不问。
 */
function stubGatekeeper(entries: Record<string, { admissible: boolean }> = {}): EvidenceGatekeeper {
  return {
    issueKey: (citation) => (entries[citation] !== undefined ? citation : undefined),
    assertAdmissible: (key) => {
      if (!entries[key]?.admissible) throw new StubInadmissibleError(`证据 ${key} 未过信源门禁`);
    },
  };
}

function riskList(overrides: Partial<RiskList['risks'][number]> = {}): RiskList {
  return {
    caseId: 'c1',
    outOfCoverage: [],
    risks: [
      {
        id: 'risk-01',
        description: '违约金过高',
        level: 'high',
        basis: [{ citation: '《民法典》第585条', sourceAnchors: [{ fileId: 'f1', quote: '逾期违约金', textRange: { start: 0, end: 4 } }] }],
        dispositionStatus: 'confirmed',
        ...overrides,
      },
    ],
  };
}

describe('compileConfirmedRiskListToRevisionInstructions', () => {
  it('compiles each non-rejected risk into a commentOnly instruction citing its basis', () => {
    const result = compileConfirmedRiskListToRevisionInstructions(riskList(), 'main-contract.docx', stubGatekeeper());
    expect(result).toMatchObject({
      id: 'revset-c1',
      caseId: 'c1',
      targetDocument: { fileId: 'main-contract.docx' },
    });
    expect(result.instructions).toHaveLength(1);
    const instruction = result.instructions[0];
    expect(instruction).toMatchObject({
      id: 'instr-risk-01',
      kind: 'commentOnly',
      locator: { strategy: 'text', quote: '逾期违约金' },
      annotation: { text: '违约金过高' },
    });
    if (instruction.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.annotation.citations[0].citation).toBe('《民法典》第585条');
    // 未在台账中登记的引用（非工具来源，如直接的法条原文）不签发 evidenceKey。
    expect(instruction.annotation.citations[0].evidenceKey).toBeUndefined();
  });

  it('excludes risks with dispositionStatus "rejected"', () => {
    const result = compileConfirmedRiskListToRevisionInstructions(
      riskList({ dispositionStatus: 'rejected' }),
      'x.docx',
      stubGatekeeper(),
    );
    expect(result.instructions).toHaveLength(0);
  });

  it('throws MissingLocatorQuoteError when the primary basis anchor has no quote', () => {
    const noQuote = riskList({ basis: [{ citation: 'x', sourceAnchors: [{ fileId: 'f1', textRange: { start: 0, end: 1 } }] }] });
    expect(() => compileConfirmedRiskListToRevisionInstructions(noQuote, 'x.docx', stubGatekeeper())).toThrow(
      MissingLocatorQuoteError,
    );
  });

  it('propagates the gate rejection when an issued evidence key fails admissibility (D4 语义由 core 台账实现)', () => {
    const webSourced = riskList({
      basis: [{ citation: 'web-search', sourceAnchors: [{ fileId: 'f1', quote: 'x', textRange: { start: 0, end: 1 } }] }],
    });
    expect(() =>
      compileConfirmedRiskListToRevisionInstructions(webSourced, 'x.docx', stubGatekeeper({ 'web-search': { admissible: false } })),
    ).toThrow(StubInadmissibleError);
  });

  it('stamps the compiled citation with the issued evidenceKey when the gate admits it', () => {
    const webSourced = riskList({
      basis: [{ citation: 'web-search', sourceAnchors: [{ fileId: 'f1', quote: 'x', textRange: { start: 0, end: 1 } }] }],
    });
    const result = compileConfirmedRiskListToRevisionInstructions(
      webSourced,
      'x.docx',
      stubGatekeeper({ 'web-search': { admissible: true } }),
    );
    const instruction = result.instructions[0];
    if (instruction.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.annotation.citations[0].evidenceKey).toBe('web-search');
  });

  it('leaves evidenceKey unset (and never consults the gate) when the citation text does not exactly match any ledger key — risk-07/party-verify boundary preserved', () => {
    const decorated = riskList({
      basis: [{ citation: '网络参考：web-search', sourceAnchors: [{ fileId: 'f1', quote: 'x', textRange: { start: 0, end: 1 } }] }],
    });
    const result = compileConfirmedRiskListToRevisionInstructions(
      decorated,
      'x.docx',
      stubGatekeeper({ 'web-search': { admissible: false } }),
    );
    const instruction = result.instructions[0];
    if (instruction.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.annotation.citations[0].evidenceKey).toBeUndefined();
  });
});
