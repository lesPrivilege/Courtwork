import { describe, expect, it } from 'vitest';
import {
  QuoteClaimSchema,
  ResolvedSourceAnchorSchema,
  CitationFailureSchema,
} from './citation.js';

describe('QuoteClaim（引用闭环拍板一：模型出引语，系统出坐标）', () => {
  it('模型侧只交 fileId + 页/块 + 精确引语', () => {
    const parsed = QuoteClaimSchema.safeParse({
      fileId: '设备采购合同.pdf',
      page: 1,
      exactQuote: '乙方逾期支付任何一期款项的，每逾期一日应按未付金额的1%向甲方支付违约金。',
    });
    expect(parsed.success).toBe(true);
  });

  it('blockId 形态亦合法（md/docx 无页码文书）', () => {
    expect(
      QuoteClaimSchema.safeParse({ fileId: 'a.md', blockId: '3', exactQuote: '引语' }).success,
    ).toBe(true);
  });

  it('空引语拒收', () => {
    expect(QuoteClaimSchema.safeParse({ fileId: 'a.pdf', page: 1, exactQuote: '' }).success).toBe(false);
  });

  it('QuoteClaim 不承载坐标字段——模型机制性失去伪造 offset 的通道', () => {
    const withOffsets = QuoteClaimSchema.safeParse({
      fileId: 'a.pdf',
      page: 1,
      exactQuote: '引语',
      textRange: { start: 0, end: 2 },
    });
    // strict 形状：多余的坐标键即拒收
    expect(withOffsets.success).toBe(false);
  });
});

describe('ResolvedSourceAnchor（resolver 铸造后的公证形态）', () => {
  it('textRange + textLayerVersion + quote 三者必备', () => {
    const ok = ResolvedSourceAnchorSchema.safeParse({
      fileId: 'a.pdf',
      page: 1,
      textRange: { start: 5, end: 12 },
      textLayerVersion: 'reading-view-pdf@1+abc123',
      quote: '精确引语内容',
    });
    expect(ok.success).toBe(true);
    expect(
      ResolvedSourceAnchorSchema.safeParse({
        fileId: 'a.pdf',
        page: 1,
        textRange: { start: 5, end: 12 },
      }).success,
    ).toBe(false);
  });
});

describe('CitationFailure（拒收理由封闭枚举，供受限修复重试携带）', () => {
  it('not_found / ambiguous / file_unavailable 三型', () => {
    for (const reason of ['not_found', 'ambiguous', 'file_unavailable'] as const) {
      expect(
        CitationFailureSchema.safeParse({
          claim: { fileId: 'a.pdf', page: 1, exactQuote: 'x' },
          reason,
          occurrences: reason === 'ambiguous' ? 3 : undefined,
        }).success,
      ).toBe(true);
    }
    expect(
      CitationFailureSchema.safeParse({
        claim: { fileId: 'a.pdf', page: 1, exactQuote: 'x' },
        reason: 'hallucinated',
      }).success,
    ).toBe(false);
  });
});
