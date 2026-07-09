import { describe, expect, it } from 'vitest';
import { createScenarioRegistry } from './query.js';
import type { ScenarioDefinition } from './scenario.js';

const s1: ScenarioDefinition = {
  id: 'S1',
  name: '卷宗阅卷',
  trigger: { fileTypes: ['pdf', 'jpg'], userActions: ['upload-case-files'], classifierTags: [] },
  inputArtifacts: [],
  toolIds: [],
  outputArtifacts: ['CaseFile', 'Timeline', 'PartyGraph'],
  uiTemplateId: 'case-intake-panel',
  confirmationGates: [{ artifact: 'Timeline', label: '确认时间线事件' }],
  promptTemplateRef: 'S1-v0',
};

const s3: ScenarioDefinition = {
  id: 'S3',
  name: '合同审查',
  trigger: { fileTypes: ['docx'], userActions: [], classifierTags: ['contract'] },
  inputArtifacts: ['CaseFile'],
  toolIds: ['party-verify'],
  outputArtifacts: ['RiskList'],
  uiTemplateId: 'risk-review-panel',
  confirmationGates: [{ artifact: 'RiskList', label: '确认风险清单' }],
  promptTemplateRef: 'S3-v0',
};

describe('createScenarioRegistry', () => {
  it('list() returns every registered scenario', () => {
    const registry = createScenarioRegistry([s1, s3]);
    expect(registry.list().map((s) => s.id)).toEqual(['S1', 'S3']);
  });

  it('list() returns a snapshot that does not expose the internal array for mutation', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const first = registry.list();
    first.push(s1);
    expect(registry.list()).toHaveLength(2);
  });

  it('findByTrigger matches on fileType', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ fileType: 'jpg' });
    expect(matched.map((s) => s.id)).toEqual(['S1']);
  });

  it('findByTrigger matches on userAction', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ userAction: 'upload-case-files' });
    expect(matched.map((s) => s.id)).toEqual(['S1']);
  });

  it('findByTrigger matches on classifierTags via set intersection', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ classifierTags: ['contract', 'something-else'] });
    expect(matched.map((s) => s.id)).toEqual(['S3']);
  });

  it('findByTrigger returns scenarios matching any dimension (OR semantics)', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ fileType: 'docx', userAction: 'upload-case-files' });
    expect(matched.map((s) => s.id).sort()).toEqual(['S1', 'S3']);
  });

  it('findByTrigger returns an empty array when nothing matches', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({ fileType: 'xlsx' });
    expect(matched).toEqual([]);
  });

  it('findByTrigger returns an empty array when the context has no fields set', () => {
    const registry = createScenarioRegistry([s1, s3]);
    const matched = registry.findByTrigger({});
    expect(matched).toEqual([]);
  });
});
