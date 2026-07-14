import { describe, it, expect } from 'vitest';
import { FeedbackDigestSchema } from './feedback-digest.js';

const anchor = (fileId: string, quote: string) => ({
  fileId,
  textRange: { start: 0, end: quote.length },
  quote,
});

function validDigest() {
  return {
    projectId: 'demo-qiwu-3.0',
    clusters: [
      {
        id: 'cl-offline-push',
        name: '设备离线推送延迟',
        memberIds: ['fb-1'],
        evidence: [anchor('reviews.csv', '离线后推送要等好几分钟')],
      },
    ],
    items: [
      {
        id: 'fb-1',
        quote: '设备离线后推送要等好几分钟才到',
        sourceAnchors: [anchor('reviews.csv', '离线后推送要等好几分钟')],
        channel: 'app-review',
        clusterId: 'cl-offline-push',
        rootCause: '离线状态推送通道延迟',
        volume: 1,
        severity: 'high',
        status: 'triaged',
      },
      {
        id: 'fb-noise',
        quote: '＄＄＄限时优惠点击链接＄＄＄',
        sourceAnchors: [anchor('reviews.csv', '限时优惠')],
        channel: 'app-review',
        clusterId: null,
        rootCause: null,
        volume: 0,
        severity: 'low',
        status: 'out_of_coverage',
      },
    ],
  };
}

describe('FeedbackDigestSchema', () => {
  it('接受合法归集：聚类 + 已归类条目 + OOC 噪声条目', () => {
    expect(FeedbackDigestSchema.safeParse(validDigest()).success).toBe(true);
  });

  it('拒绝无锚条目（无锚不落格）', () => {
    const d = validDigest();
    d.items[0].sourceAnchors = [];
    expect(FeedbackDigestSchema.safeParse(d).success).toBe(false);
  });

  it('拒绝 OOC 条目却挂了聚类（诚实置出）', () => {
    const d = validDigest();
    d.items[1].clusterId = 'cl-offline-push';
    expect(FeedbackDigestSchema.safeParse(d).success).toBe(false);
  });

  it('拒绝已归类条目缺根因', () => {
    const d = validDigest();
    d.items[0].rootCause = null;
    expect(FeedbackDigestSchema.safeParse(d).success).toBe(false);
  });

  it('拒绝条目引用不存在的聚类', () => {
    const d = validDigest();
    d.items[0].clusterId = 'cl-ghost';
    expect(FeedbackDigestSchema.safeParse(d).success).toBe(false);
  });

  it('拒绝聚类 memberId 指向不存在的条目', () => {
    const d = validDigest();
    d.clusters[0].memberIds = ['fb-ghost'];
    expect(FeedbackDigestSchema.safeParse(d).success).toBe(false);
  });
});
