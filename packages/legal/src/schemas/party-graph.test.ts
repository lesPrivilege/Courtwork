import { describe, expect, it } from 'vitest';
import { PartyGraphDraftSchema, PartyGraphSchema } from './party-graph.js';

describe('PartyGraphSchema', () => {
  it('accepts a single individual node with no edges', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-001',
      nodes: [{ id: 'party-001', kind: 'individual', primaryName: '张三' }],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts an organization node with aliases', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-002',
      nodes: [
        {
          id: 'party-002',
          kind: 'organization',
          primaryName: '某某有限公司',
          aliases: ['某某公司', '某某有限责任公司'],
        },
      ],
      edges: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts two nodes connected by an edge with sourceAnchors', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-003',
      nodes: [
        { id: 'party-003', kind: 'individual', primaryName: '李四' },
        { id: 'party-004', kind: 'organization', primaryName: '某某银行' },
      ],
      edges: [
        {
          id: 'edge-001',
          sourcePartyId: 'party-003',
          targetPartyId: 'party-004',
          relationType: '债务人',
          sourceAnchors: [{ fileId: 'file-001', page: 1, bbox: { x: 0, y: 0, width: 0.5, height: 0.1 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a node with an invalid kind', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-004',
      nodes: [{ id: 'party-005', kind: 'robot', primaryName: '张三' }],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an edge with zero sourceAnchors', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-005',
      nodes: [
        { id: 'party-006', kind: 'individual', primaryName: '王五' },
        { id: 'party-007', kind: 'individual', primaryName: '赵六' },
      ],
      edges: [
        {
          id: 'edge-002',
          sourcePartyId: 'party-006',
          targetPartyId: 'party-007',
          relationType: '担保人',
          sourceAnchors: [],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a node missing primaryName', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-006',
      nodes: [{ id: 'party-008', kind: 'individual' }],
      edges: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an edge missing sourcePartyId', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-007',
      nodes: [{ id: 'party-009', kind: 'individual', primaryName: '孙七' }],
      edges: [
        {
          id: 'edge-003',
          targetPartyId: 'party-009',
          relationType: '原告',
          sourceAnchors: [{ fileId: 'file-002', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts an edge with a contradiction marker', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-008',
      nodes: [
        { id: 'party-010', kind: 'organization', primaryName: '临江精铸（云章）装备有限公司' },
        { id: 'party-011', kind: 'organization', primaryName: '临江精铸科技有限公司' },
      ],
      edges: [
        {
          id: 'edge-004',
          sourcePartyId: 'party-010',
          targetPartyId: 'party-011',
          relationType: '关联公司（受托实际生产与发货，非合同签约主体）',
          markers: ['contradiction'],
          sourceAnchors: [{ fileId: 'file-003', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.edges[0]?.markers).toEqual(['contradiction']);
    }
  });

  it('accepts an edge with markers omitted entirely', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-009',
      nodes: [
        { id: 'party-012', kind: 'individual', primaryName: '周八' },
        { id: 'party-013', kind: 'individual', primaryName: '吴九' },
      ],
      edges: [
        {
          id: 'edge-005',
          sourcePartyId: 'party-012',
          targetPartyId: 'party-013',
          relationType: '担保人',
          sourceAnchors: [{ fileId: 'file-004', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.edges[0]?.markers).toBeUndefined();
    }
  });

  it('rejects a markers array containing an empty string', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-010',
      nodes: [
        { id: 'party-014', kind: 'individual', primaryName: '郑十' },
        { id: 'party-015', kind: 'individual', primaryName: '王十一' },
      ],
      edges: [
        {
          id: 'edge-006',
          sourcePartyId: 'party-014',
          targetPartyId: 'party-015',
          relationType: '担保人',
          markers: [''],
          sourceAnchors: [{ fileId: 'file-005', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects markers that is not an array', () => {
    const result = PartyGraphSchema.safeParse({
      caseId: 'case-011',
      nodes: [
        { id: 'party-016', kind: 'individual', primaryName: '冯十二' },
        { id: 'party-017', kind: 'individual', primaryName: '陈十三' },
      ],
      edges: [
        {
          id: 'edge-007',
          sourcePartyId: 'party-016',
          targetPartyId: 'party-017',
          relationType: '担保人',
          markers: 'contradiction',
          sourceAnchors: [{ fileId: 'file-006', textRange: { start: 0, end: 5 } }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

/** LEGAL-ANCHOR-BINDING-1：模型侧只出引语，坐标字段结构性不存在。 */
describe('PartyGraphDraftSchema（模型侧草稿）', () => {
  const nodes = [
    { id: 'p1', kind: 'organization', primaryName: '甲公司' },
    { id: 'p2', kind: 'organization', primaryName: '乙公司' },
  ];
  const draftEdge = (extra: Record<string, unknown> = {}) => ({
    id: 'e1',
    sourcePartyId: 'p1',
    targetPartyId: 'p2',
    relationType: '买卖合同相对方',
    quoteClaims: [{ fileId: 'file-001', exactQuote: '甲公司与乙公司签订本合同' }],
    ...extra,
  });

  it('接受携逐字引语的关系边', () => {
    expect(PartyGraphDraftSchema.safeParse({ caseId: 'case-101', nodes, edges: [draftEdge()] }).success).toBe(true);
  });

  it('拒绝零引语的关系边（关系断言必须有证据支撑，同最终形 min(1)）', () => {
    expect(
      PartyGraphDraftSchema.safeParse({ caseId: 'case-102', nodes, edges: [draftEdge({ quoteClaims: [] })] }).success,
    ).toBe(false);
  });

  it('引语内不得携坐标：QuoteClaim 是 strict 形状，bbox 直接拒收', () => {
    const result = PartyGraphDraftSchema.safeParse({
      caseId: 'case-103',
      nodes,
      edges: [draftEdge({
        quoteClaims: [{ fileId: 'f', exactQuote: '甲', bbox: { x: 0, y: 0, width: 1, height: 1 } }],
      })],
    });
    expect(result.success).toBe(false);
  });

  it('模型自报的 sourceAnchors 不进草稿形（伪坐标到不了 resolver）', () => {
    const result = PartyGraphDraftSchema.safeParse({
      caseId: 'case-104',
      nodes,
      edges: [draftEdge({ sourceAnchors: [{ fileId: 'f', textRange: { start: 1, end: 2 } }] })],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.edges[0]).not.toHaveProperty('sourceAnchors');
  });
});

describe('PartyGraphSchema 缺口表', () => {
  it('outOfCoverage 缺省为空表', () => {
    const result = PartyGraphSchema.safeParse({ caseId: 'case-105', nodes: [], edges: [] });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.outOfCoverage).toEqual([]);
  });
});
