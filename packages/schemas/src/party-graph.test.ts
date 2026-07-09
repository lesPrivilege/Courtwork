import { describe, expect, it } from 'vitest';
import { PartyGraphSchema } from './party-graph.js';

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
});
