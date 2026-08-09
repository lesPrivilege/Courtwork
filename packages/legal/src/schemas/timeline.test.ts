import { describe, expect, it } from 'vitest';
import { TimelineDraftSchema, TimelineSchema } from './timeline.js';

describe('TimelineSchema', () => {
  it('accepts an event with an exact date', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-001',
      events: [
        {
          id: 'evt-001',
          description: '签订合同',
          date: { kind: 'exact', date: '2024-03-15' },
          sourceAnchors: [{ fileId: 'file-001', page: 1, bbox: { x: 0, y: 0, width: 0.5, height: 0.1 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an event with a fuzzy date range', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-002',
      events: [
        {
          id: 'evt-002',
          description: '双方开始协商',
          date: {
            kind: 'fuzzy',
            text: '2024年初',
            rangeStart: '2024-01-01',
            rangeEnd: '2024-02-29',
          },
          sourceAnchors: [{ fileId: 'file-002', textRange: { start: 0, end: 10 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an event with multiple partyIds and sourceAnchors', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-003',
      events: [
        {
          id: 'evt-003',
          description: '双方代表会面',
          date: { kind: 'exact', date: '2024-05-01' },
          partyIds: ['party-001', 'party-002'],
          sourceAnchors: [
            { fileId: 'file-003', page: 2, bbox: { x: 0, y: 0, width: 1, height: 0.2 } },
            { fileId: 'file-004', textRange: { start: 5, end: 20 } },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an event with zero sourceAnchors', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-004',
      events: [
        {
          id: 'evt-004',
          description: '无来源事件',
          date: { kind: 'exact', date: '2024-01-01' },
          sourceAnchors: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a fuzzy date missing text', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-005',
      events: [
        {
          id: 'evt-005',
          description: '模糊日期缺文本',
          date: { kind: 'fuzzy' },
          sourceAnchors: [{ fileId: 'file-005', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid date kind literal', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-006',
      events: [
        {
          id: 'evt-006',
          description: '非法 kind',
          date: { kind: 'approximate', text: '大概三月' },
          sourceAnchors: [{ fileId: 'file-006', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an event missing description', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-007',
      events: [
        {
          id: 'evt-007',
          date: { kind: 'exact', date: '2024-01-01' },
          sourceAnchors: [{ fileId: 'file-007', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts an event with a contradiction marker', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-008',
      events: [
        {
          id: 'evt-008',
          description: '验收单载明验收合格，与会议纪要陈述矛盾',
          date: { kind: 'exact', date: '2024-12-10' },
          markers: ['contradiction'],
          sourceAnchors: [{ fileId: 'file-008', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events[0]?.markers).toEqual(['contradiction']);
    }
  });

  it('accepts an event with markers omitted entirely', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-009',
      events: [
        {
          id: 'evt-009',
          description: '无标记的普通事件',
          date: { kind: 'exact', date: '2024-01-01' },
          sourceAnchors: [{ fileId: 'file-009', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events[0]?.markers).toBeUndefined();
    }
  });

  it('rejects a markers array containing an empty string', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-010',
      events: [
        {
          id: 'evt-010',
          description: '标记数组含空字符串',
          date: { kind: 'exact', date: '2024-01-01' },
          markers: [''],
          sourceAnchors: [{ fileId: 'file-010', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects markers that is not an array', () => {
    const result = TimelineSchema.safeParse({
      caseId: 'case-011',
      events: [
        {
          id: 'evt-011',
          description: '标记字段类型错误',
          date: { kind: 'exact', date: '2024-01-01' },
          markers: 'contradiction',
          sourceAnchors: [{ fileId: 'file-011', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('outOfCoverage 缺省为空表（存量最终形夹具零迁移）', () => {
    const result = TimelineSchema.safeParse({ caseId: 'case-012', events: [] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.outOfCoverage).toEqual([]);
  });
});

/** LEGAL-ANCHOR-BINDING-1：模型侧只出引语，坐标字段结构性不存在。 */
describe('TimelineDraftSchema（模型侧草稿）', () => {
  const draftEvent = (extra: Record<string, unknown> = {}) => ({
    id: 'evt-101',
    description: '签订合同',
    date: { kind: 'exact', date: '2024-03-15' },
    quoteClaims: [{ fileId: 'file-001', exactQuote: '第一条 双方签订本合同。' }],
    ...extra,
  });

  it('接受携逐字引语的事件', () => {
    const result = TimelineDraftSchema.safeParse({ caseId: 'case-101', events: [draftEvent()] });
    expect(result.success).toBe(true);
  });

  it('拒绝零引语事件（无证据支撑的事件不可信，同最终形 min(1)）', () => {
    const result = TimelineDraftSchema.safeParse({
      caseId: 'case-102',
      events: [draftEvent({ quoteClaims: [] })],
    });
    expect(result.success).toBe(false);
  });

  it('引语内不得携坐标：QuoteClaim 是 strict 形状，textRange 直接拒收', () => {
    const result = TimelineDraftSchema.safeParse({
      caseId: 'case-103',
      events: [draftEvent({
        quoteClaims: [{ fileId: 'file-001', exactQuote: '第一条', textRange: { start: 0, end: 3 } }],
      })],
    });
    expect(result.success).toBe(false);
  });

  it('模型自报的 sourceAnchors 不进草稿形（坐标字段在模型侧不存在，伪坐标到不了 resolver）', () => {
    const result = TimelineDraftSchema.safeParse({
      caseId: 'case-104',
      events: [draftEvent({ sourceAnchors: [{ fileId: 'file-001', textRange: { start: 9999, end: 10000 } }] })],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.events[0]).not.toHaveProperty('sourceAnchors');
  });

  it('草稿根不得携最终形的缺口表（缺口由系统剪枝写入，不是模型的字段）', () => {
    const result = TimelineDraftSchema.safeParse({
      caseId: 'case-105',
      events: [draftEvent()],
      outOfCoverage: [{ summary: 'x', reason: 'citation_unresolved', failures: [] }],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty('outOfCoverage');
  });
});
