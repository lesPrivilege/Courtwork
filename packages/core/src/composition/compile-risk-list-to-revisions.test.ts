import { describe, expect, it } from 'vitest';
import type { RiskList } from '@courtwork/schemas';
import { createEvidenceLedger, InadmissibleCitationError } from '../evidence/grade.js';
import { compileConfirmedRiskListToRevisionInstructions, MissingLocatorQuoteError } from './compile-risk-list-to-revisions.js';

function riskList(overrides: Partial<RiskList['risks'][number]> = {}): RiskList {
  return {
    caseId: 'c1',
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
    const ledger = createEvidenceLedger();
    const result = compileConfirmedRiskListToRevisionInstructions(riskList(), 'main-contract.docx', ledger);
    expect(result).toMatchObject({
      id: 'revset-c1',
      caseId: 'c1',
      targetDocument: { fileId: 'main-contract.docx' },
    });
    expect(result.instructions).toHaveLength(1);
    expect(result.instructions[0]).toMatchObject({
      id: 'instr-risk-01',
      kind: 'commentOnly',
      locator: { strategy: 'text', quote: '逾期违约金' },
      annotation: { text: '违约金过高', citations: [{ citation: '《民法典》第585条' }] },
    });
  });

  it('excludes risks with dispositionStatus "rejected"', () => {
    const ledger = createEvidenceLedger();
    const result = compileConfirmedRiskListToRevisionInstructions(riskList({ dispositionStatus: 'rejected' }), 'x.docx', ledger);
    expect(result.instructions).toHaveLength(0);
  });

  it('throws MissingLocatorQuoteError when the primary basis anchor has no quote', () => {
    const ledger = createEvidenceLedger();
    const noQuote = riskList({ basis: [{ citation: 'x', sourceAnchors: [{ fileId: 'f1', textRange: { start: 0, end: 1 } }] }] });
    expect(() => compileConfirmedRiskListToRevisionInstructions(noQuote, 'x.docx', ledger)).toThrow(MissingLocatorQuoteError);
  });

  it('rejects (via the D4 gate) a citation whose evidence is C-grade and unconfirmed', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    const webSourced = riskList({
      basis: [{ citation: 'web-search', sourceAnchors: [{ fileId: 'f1', quote: 'x', textRange: { start: 0, end: 1 } }] }],
    });
    expect(() => compileConfirmedRiskListToRevisionInstructions(webSourced, 'x.docx', ledger)).toThrow(InadmissibleCitationError);
  });

  it('admits the same C-grade citation once the ledger entry is explicitly confirmed', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    ledger.confirm('web-search');
    const webSourced = riskList({
      basis: [{ citation: 'web-search', sourceAnchors: [{ fileId: 'f1', quote: 'x', textRange: { start: 0, end: 1 } }] }],
    });
    expect(() => compileConfirmedRiskListToRevisionInstructions(webSourced, 'x.docx', ledger)).not.toThrow();
  });
});
