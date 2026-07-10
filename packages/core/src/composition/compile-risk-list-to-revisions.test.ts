import { describe, expect, it } from 'vitest';
import type { RiskList } from '@courtwork/schemas';
import { createEvidenceLedger, InadmissibleEvidenceError } from '../evidence/grade.js';
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
    expect(() => compileConfirmedRiskListToRevisionInstructions(webSourced, 'x.docx', ledger)).toThrow(InadmissibleEvidenceError);
  });

  it('admits the same C-grade citation once the ledger entry is explicitly confirmed, and stamps the compiled citation with the issued evidenceKey', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    ledger.confirm('web-search');
    const webSourced = riskList({
      basis: [{ citation: 'web-search', sourceAnchors: [{ fileId: 'f1', quote: 'x', textRange: { start: 0, end: 1 } }] }],
    });
    const result = compileConfirmedRiskListToRevisionInstructions(webSourced, 'x.docx', ledger);
    const instruction = result.instructions[0];
    if (instruction.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.annotation.citations[0].evidenceKey).toBe('web-search');
  });

  it('leaves evidenceKey unset (and does not throw) when the citation display text does not exactly match any ledger key, even with an unrelated C-grade-unconfirmed entry present — matches the existing risk-07/party-verify boundary in the S3 demo, not a new gap', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    const decorated = riskList({
      basis: [{ citation: '网络参考：web-search', sourceAnchors: [{ fileId: 'f1', quote: 'x', textRange: { start: 0, end: 1 } }] }],
    });
    const result = compileConfirmedRiskListToRevisionInstructions(decorated, 'x.docx', ledger);
    const instruction = result.instructions[0];
    if (instruction.kind !== 'commentOnly') throw new Error('unreachable');
    expect(instruction.annotation.citations[0].evidenceKey).toBeUndefined();
  });
});
