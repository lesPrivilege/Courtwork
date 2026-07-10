import { describe, expect, it } from 'vitest';
import { assertEvidenceKeyAdmissible, createEvidenceLedger, InadmissibleEvidenceError } from './grade.js';

describe('EvidenceLedger', () => {
  it('records and retrieves an evidence entry by key', () => {
    const ledger = createEvidenceLedger();
    ledger.record('party-verify', { grade: 'B', sourceId: 'demo-fixture', confirmed: false });
    expect(ledger.get('party-verify')).toEqual({ grade: 'B', sourceId: 'demo-fixture', confirmed: false });
  });

  it('returns undefined for an untracked key', () => {
    const ledger = createEvidenceLedger();
    expect(ledger.get('unknown-key')).toBeUndefined();
  });

  it('confirm() flips the confirmed flag without touching other fields', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    ledger.confirm('web-search');
    expect(ledger.get('web-search')).toEqual({ grade: 'C', sourceId: 'web-search', confirmed: true });
  });

  it('confirm() on an untracked key is a harmless no-op', () => {
    const ledger = createEvidenceLedger();
    expect(() => ledger.confirm('never-recorded')).not.toThrow();
  });

  it('snapshot() projects every recorded entry with its key', () => {
    const ledger = createEvidenceLedger();
    ledger.record('party-verify', { grade: 'B', sourceId: 'demo-fixture', confirmed: false });
    ledger.record('cite-check', { grade: 'A', sourceId: 'public-law-db', confirmed: false });
    const snapshot = ledger.snapshot();
    expect(snapshot).toHaveLength(2);
    expect(snapshot).toContainEqual({ key: 'party-verify', grade: 'B', sourceId: 'demo-fixture', confirmed: false });
    expect(snapshot).toContainEqual({ key: 'cite-check', grade: 'A', sourceId: 'public-law-db', confirmed: false });
  });

  describe('issueKey()', () => {
    it('returns the candidate key unchanged when it matches a recorded entry', () => {
      const ledger = createEvidenceLedger();
      ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
      expect(ledger.issueKey('web-search')).toBe('web-search');
    });

    it('returns undefined when the candidate key matches nothing recorded', () => {
      const ledger = createEvidenceLedger();
      expect(ledger.issueKey('never-recorded')).toBeUndefined();
    });
  });
});

describe('assertEvidenceKeyAdmissible', () => {
  it('admits an A-grade citation by its issued evidenceKey', () => {
    const ledger = createEvidenceLedger();
    ledger.record('cite-check', { grade: 'A', sourceId: 'public-law-db', confirmed: false });
    expect(() => assertEvidenceKeyAdmissible(ledger, ledger.issueKey('cite-check'))).not.toThrow();
  });

  it('admits a B-grade citation by its issued evidenceKey', () => {
    const ledger = createEvidenceLedger();
    ledger.record('party-verify', { grade: 'B', sourceId: 'demo-fixture', confirmed: false });
    expect(() => assertEvidenceKeyAdmissible(ledger, ledger.issueKey('party-verify'))).not.toThrow();
  });

  it('rejects an unconfirmed C-grade citation with InadmissibleEvidenceError', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    expect(() => assertEvidenceKeyAdmissible(ledger, ledger.issueKey('web-search'))).toThrow(InadmissibleEvidenceError);
  });

  it('admits a C-grade citation once explicitly confirmed', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    ledger.confirm('web-search');
    expect(() => assertEvidenceKeyAdmissible(ledger, ledger.issueKey('web-search'))).not.toThrow();
  });

  it('rejects when no evidenceKey is supplied at all (fail closed, per schema JSDoc: 无 key 引用按 C 级未确认待遇)', () => {
    const ledger = createEvidenceLedger();
    expect(() => assertEvidenceKeyAdmissible(ledger, undefined)).toThrow(InadmissibleEvidenceError);
  });

  it('rejects a key that does not resolve to any ledger record (fail closed, same treatment as a missing key)', () => {
    const ledger = createEvidenceLedger();
    expect(() => assertEvidenceKeyAdmissible(ledger, 'forged-key-not-in-ledger')).toThrow(InadmissibleEvidenceError);
  });

  it('reproduces and closes the W6 acceptance bypass: an unconfirmed C-grade citation stays blocked no matter how its display text is edited afterward, because the gate never takes display text as an input — only the evidenceKey issued at compile time', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    // 编译期正确签发的 key（对照 W6 验收报告的原始反例：ledger key 是 'web-search'）。
    const evidenceKey = ledger.issueKey('web-search');
    // 此后展示文本可以被编辑成任何样子（如加前缀"网络参考："）——门禁函数的参数
    // 列表里根本不存在"citation 展示文本"这个入口，不可能再被拿来绕过。
    const editedDisplayText = '网络参考：web-search';
    expect(editedDisplayText).not.toBe(evidenceKey);
    expect(() => assertEvidenceKeyAdmissible(ledger, evidenceKey)).toThrow(InadmissibleEvidenceError);
  });
});
