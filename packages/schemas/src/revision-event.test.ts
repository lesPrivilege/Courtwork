import { describe, expect, it } from 'vitest';
import { RevisionEventSchema } from './revision-event.js';

describe('RevisionEventSchema', () => {
  it('accepts a minimal event with no optional fields', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-001',
      timestamp: '2026-07-09T10:00:00Z',
      actor: { userId: 'user-001' },
      artifactType: 'RiskList',
      artifactId: 'risk-list-case-001',
      fieldPath: '/risks/0/level',
      previousValue: 'medium',
      newValue: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an event with reason, sourceAnchors, and caseId', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-002',
      timestamp: '2026-07-09T10:05:00Z',
      actor: { userId: 'user-002', role: 'lawyer' },
      caseId: 'case-001',
      artifactType: 'Timeline',
      artifactId: 'timeline-case-001',
      fieldPath: '/events/2/date',
      previousValue: { kind: 'fuzzy', text: '2024年初' },
      newValue: { kind: 'exact', date: '2024-01-15' },
      reason: '找到了明确的签订日期证据',
      sourceAnchors: [{ fileId: 'file-001', page: 1, bbox: { x: 0, y: 0, width: 0.3, height: 0.05 } }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts nested object previousValue/newValue', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-003',
      timestamp: '2026-07-09T10:10:00Z',
      actor: { userId: 'user-003' },
      artifactType: 'PartyGraph',
      artifactId: 'party-graph-case-001',
      fieldPath: '/nodes/0/aliases',
      previousValue: ['某某公司'],
      newValue: ['某某公司', '某某有限责任公司'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a fieldPath not starting with /', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-004',
      timestamp: '2026-07-09T10:00:00Z',
      actor: { userId: 'user-001' },
      artifactType: 'RiskList',
      artifactId: 'risk-list-case-001',
      fieldPath: 'risks.0.level',
      previousValue: 'medium',
      newValue: 'high',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid artifactType', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-005',
      timestamp: '2026-07-09T10:00:00Z',
      actor: { userId: 'user-001' },
      artifactType: 'UnknownArtifact',
      artifactId: 'x',
      fieldPath: '/x',
      previousValue: 1,
      newValue: 2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing timestamp', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-006',
      actor: { userId: 'user-001' },
      artifactType: 'RiskList',
      artifactId: 'x',
      fieldPath: '/x',
      previousValue: 1,
      newValue: 2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-ISO timestamp', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-007',
      timestamp: '2026年7月9日',
      actor: { userId: 'user-001' },
      artifactType: 'RiskList',
      artifactId: 'x',
      fieldPath: '/x',
      previousValue: 1,
      newValue: 2,
    });
    expect(result.success).toBe(false);
  });

  it('rejects an actor missing userId', () => {
    const result = RevisionEventSchema.safeParse({
      id: 'rev-008',
      timestamp: '2026-07-09T10:00:00Z',
      actor: {},
      artifactType: 'RiskList',
      artifactId: 'x',
      fieldPath: '/x',
      previousValue: 1,
      newValue: 2,
    });
    expect(result.success).toBe(false);
  });
});
