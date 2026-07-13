import { describe, it, expect } from 'vitest';
import { PrdReviewSchema, PrdDefectTypeEnum } from './prd-review.js';

const anchor = (quote: string) => ({ fileId: 'prd-2.4.md', textRange: { start: 0, end: quote.length }, quote });

function validReview() {
  return {
    projectId: 'demo-qiwu-3.0',
    documentId: 'prd-2.4.md',
    findings: [
      {
        id: 'rv-1',
        section: '3.2 离线推送',
        clause: '优化推送体验，让用户及时收到消息。',
        sourceAnchors: [anchor('优化推送体验')],
        defectType: 'vague-metric',
        severity: 'high',
        issue: '"及时"无量化口径，无法验收。',
        suggestion: '给出 P95 到达时延目标（如 ≤5s）。',
        status: 'pending',
      },
    ],
  };
}

describe('PrdReviewSchema', () => {
  it('接受合法评审发现', () => {
    expect(PrdReviewSchema.safeParse(validReview()).success).toBe(true);
  });

  it('拒绝无锚意见（无锚不落格）', () => {
    const r = validReview();
    r.findings[0].sourceAnchors = [];
    expect(PrdReviewSchema.safeParse(r).success).toBe(false);
  });

  it('六类缺陷维度封闭：非法枚举被拒', () => {
    const r = validReview();
    (r.findings[0] as { defectType: string }).defectType = 'typo';
    expect(PrdReviewSchema.safeParse(r).success).toBe(false);
  });

  it('缺陷维度恰为六类（与 docs/product/pm-vertical.md §二 对齐）', () => {
    expect(PrdDefectTypeEnum.options).toHaveLength(6);
  });

  it('处置三态与 S3 同构（pending/confirmed/rejected）', () => {
    const r = validReview();
    r.findings[0].status = 'rejected';
    expect(PrdReviewSchema.safeParse(r).success).toBe(true);
  });
});
