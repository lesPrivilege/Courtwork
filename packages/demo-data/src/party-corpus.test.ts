import { describe, expect, it } from 'vitest';
import { findPartyRecord, listPartyOutOfCoverage, listPartyRecords } from './party-corpus.js';

describe('listPartyRecords', () => {
  it('loads all entries from data/registries/party-verify.json', () => {
    const records = listPartyRecords();
    expect(records.length).toBeGreaterThan(20);
  });

  it('every entry carries an unmistakably synthetic credit code (DEMO prefix, per the corpus manifest)', () => {
    for (const record of listPartyRecords()) {
      expect(record.unifiedSocialCreditCode).toMatch(/^DEMO/);
    }
  });
});

describe('findPartyRecord', () => {
  it('finds a real corpus entry by its exact entityName', () => {
    const record = findPartyRecord('临江精铸科技有限公司');
    expect(record).toBeDefined();
    expect(record?.registrationStatus).toBe('存续');
    expect(record?.legalRepresentative).toBe('封文昌');
  });

  it('finds the same entry by one of its aliases', () => {
    const byAlias = findPartyRecord('临江精铸');
    const byFullName = findPartyRecord('临江精铸科技有限公司');
    expect(byAlias).toEqual(byFullName);
  });

  it('returns undefined for a name not in the library (library miss, not a claim of nonexistence)', () => {
    expect(findPartyRecord('完全不存在的某某公司')).toBeUndefined();
  });

  it('trims surrounding whitespace before matching', () => {
    expect(findPartyRecord('  临江精铸科技有限公司  ')).toBeDefined();
  });
});

describe('listPartyOutOfCoverage — the manifest-declared coverage gaps', () => {
  it('exposes the three names the corpus deliberately excludes from entries[]', () => {
    const gaps = listPartyOutOfCoverage();
    const names = gaps.map((g) => g.name);
    expect(names).toContain('麦承业');
    expect(names.some((n) => n.includes('起云智能装备') && n.includes('安徽分公司'))).toBe(true);
  });

  it('none of the out-of-coverage names are actually findable as entries (the gap is real, not a stale list)', () => {
    for (const gap of listPartyOutOfCoverage()) {
      expect(findPartyRecord(gap.name)).toBeUndefined();
    }
  });
});
