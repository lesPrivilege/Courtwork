import { describe, expect, it } from 'vitest';
import { locateQuote } from './locate.js';

describe('locateQuote', () => {
  it('finds an exact unique match', () => {
    const result = locateQuote(['第一段无关内容', '任何一方违反本合同约定，应向守约方支付合同总价款百分之十的违约金。'], '百分之十的违约金');
    expect(result).toEqual({ status: 'exact', paragraphIndex: 1 });
  });

  it('reports ambiguous when the quote appears in two paragraphs verbatim', () => {
    const result = locateQuote(['甲方应向乙方支付违约金', '乙方应向甲方支付违约金'], '支付违约金');
    expect(result.status).toBe('ambiguous');
  });

  it('finds a fuzzy match after a light single-character edit (十 -> 十五)', () => {
    const paragraphs = ['任何一方违反本合同约定，应向守约方支付合同总价款百分之十五的违约金。'];
    const result = locateQuote(paragraphs, '百分之十的违约金');
    expect(result.status).toBe('fuzzy');
    if (result.status === 'fuzzy') {
      expect(result.paragraphIndex).toBe(0);
      expect(result.score).toBeGreaterThan(0.8);
    }
  });

  it('reports not_found (not a guess) when the edit is too large to trust automatically', () => {
    const paragraphs = ['任何一方违反本合同约定，应向守约方支付合同总价款百分之十（含税，另加银行同期利率上浮）的违约金及利息。'];
    const result = locateQuote(paragraphs, '百分之十的违约金');
    expect(result.status).toBe('not_found');
  });

  it('reports not_found when the quote text no longer exists anywhere close', () => {
    const paragraphs = ['本条款已被双方协商一致完全删除，替换为全新的争议解决机制。'];
    const result = locateQuote(paragraphs, '百分之十的违约金比例条款');
    expect(result.status).toBe('not_found');
  });

  it('reports not_found rather than guessing when similarity is only moderate', () => {
    const paragraphs = ['completely unrelated english sentence with no overlap whatsoever here'];
    const result = locateQuote(paragraphs, '百分之十的违约金');
    expect(result.status).toBe('not_found');
  });
});
