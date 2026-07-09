import { describe, it, expect } from 'vitest';
import { citationExists } from './citation-exists.js';

describe('citationExists', () => {
  it('passes when every citation resolves in the cite-check registry', () => {
    const candidate = {
      risks: [
        { basis: [{ citation: '《中华人民共和国民法典》第五百八十五条' }] },
        { basis: [{ citation: '《中华人民共和国民法典》第四百九十六条' }] },
      ],
    };

    const result = citationExists(candidate);

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it('flags citations that do not resolve, with the offending citation named', () => {
    const candidate = {
      risks: [
        { basis: [{ citation: '《中华人民共和国民法典》第五百八十五条' }] },
        { basis: [{ citation: '《中华人民共和国民法典》第九千九百九十九条' }] },
      ],
    };

    const result = citationExists(candidate);

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0.5);
    expect(result.reason).toMatch(/第九千九百九十九条/);
  });

  it('resolves nested citation fields regardless of scenario shape (e.g. RevisionInstructionSet annotations)', () => {
    const candidate = {
      instructions: [
        {
          annotation: {
            citations: [{ citation: '《中华人民共和国民法典》第五百八十五条' }],
          },
        },
      ],
    };

    const result = citationExists(candidate);

    expect(result.pass).toBe(true);
  });

  it('fails with a clear reason when no citation field is present at all', () => {
    const result = citationExists({ nothing: 'here' });

    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reason).toMatch(/citation/);
  });
});
