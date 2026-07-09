import { describe, expect, it } from 'vitest';
import { assertCitationAdmissible, createEvidenceLedger, InadmissibleCitationError } from './grade.js';

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
});

describe('assertCitationAdmissible', () => {
  it('admits an A-grade citation', () => {
    const ledger = createEvidenceLedger();
    ledger.record('cite-check', { grade: 'A', sourceId: 'public-law-db', confirmed: false });
    expect(() => assertCitationAdmissible(ledger, 'cite-check')).not.toThrow();
  });

  it('admits a B-grade citation', () => {
    const ledger = createEvidenceLedger();
    ledger.record('party-verify', { grade: 'B', sourceId: 'demo-fixture', confirmed: false });
    expect(() => assertCitationAdmissible(ledger, 'party-verify')).not.toThrow();
  });

  it('rejects an unconfirmed C-grade citation with InadmissibleCitationError', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    expect(() => assertCitationAdmissible(ledger, 'web-search')).toThrow(InadmissibleCitationError);
  });

  it('admits a C-grade citation once explicitly confirmed', () => {
    const ledger = createEvidenceLedger();
    ledger.record('web-search', { grade: 'C', sourceId: 'web-search', confirmed: false });
    ledger.confirm('web-search');
    expect(() => assertCitationAdmissible(ledger, 'web-search')).not.toThrow();
  });

  it('admits a key with no tracked evidence at all (not tool-sourced, e.g. a direct case-file quote)', () => {
    const ledger = createEvidenceLedger();
    expect(() => assertCitationAdmissible(ledger, '《中华人民共和国民法典》第五百八十五条')).not.toThrow();
  });
});
