import { describe, expect, it } from 'vitest';
import { findCaseCitation, findStatuteCitation, listCitationRecords } from './citation-corpus.js';

describe('listCitationRecords', () => {
  it('loads all entries from data/registries/cite-check.json (57 effective + 7 repealed + 3 demo per the manifest)', () => {
    const records = listCitationRecords();
    expect(records.length).toBe(67);
  });

  it('every statute-shaped record carries officialTextVerified: false (manifest declares none rechecked against an official source yet)', () => {
    for (const record of listCitationRecords()) {
      if (record.status === 'effective' || record.status === 'repealed') {
        expect(record.officialTextVerified).toBe(false);
      }
    }
  });
});

describe('findStatuteCitation', () => {
  it('finds a real, currently-effective statute article', () => {
    const record = findStatuteCitation('中华人民共和国民法典', '第一百四十三条');
    expect(record).toBeDefined();
    expect(record?.status).toBe('effective');
    expect(record?.text).toMatch(/行为人具有相应的民事行为能力/);
  });

  it('finds a repealed article and exposes what superseded it', () => {
    const record = findStatuteCitation('中华人民共和国合同法（已失效）', '第一百零七条');
    expect(record).toBeDefined();
    if (record?.status !== 'repealed') throw new Error('unreachable');
    expect(record.repealedBy).toBe('中华人民共和国民法典');
    expect(record.supersededByArticle).toContain('第五百七十七条');
  });

  it('returns undefined for a law/article combination not in the library', () => {
    expect(findStatuteCitation('《不存在的法典》', '第一条')).toBeUndefined();
  });
});

describe('findCaseCitation', () => {
  it('finds a fictional demo case by case number and marks it clearly as non-authoritative', () => {
    const record = findCaseCitation('(2023)云章03民终0000号（虚构）');
    expect(record).toBeDefined();
    expect(record?.status).toBe('demo');
    expect(record?.court).toContain('虚构');
  });

  it('returns undefined for a case number not in the library', () => {
    expect(findCaseCitation('(2099)不存在01民初0000号')).toBeUndefined();
  });
});
