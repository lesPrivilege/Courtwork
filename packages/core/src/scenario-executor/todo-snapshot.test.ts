import { describe, expect, it } from 'vitest';
import type { ScenarioDefinition } from '@courtwork/registry';
import { deriveTodoSnapshot } from './todo-snapshot.js';

const MULTI_GATE_SCENARIO: ScenarioDefinition = {
  id: 'S1',
  name: '卷宗阅卷',
  trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
  inputArtifacts: [],
  toolIds: [],
  outputArtifacts: ['CaseFile', 'Timeline', 'PartyGraph'],
  uiTemplateId: 'test-panel',
  confirmationGates: [
    { artifact: 'Timeline', label: '确认事件时间线' },
    { artifact: 'PartyGraph', label: '确认当事人关系图谱' },
  ],
  promptTemplateRef: 'test-v0',
};

describe('deriveTodoSnapshot (pure function: scenario declaration -> todo list)', () => {
  it('marks every declared output as pending before anything is produced', () => {
    const snapshot = deriveTodoSnapshot(MULTI_GATE_SCENARIO, {});
    expect(snapshot).toEqual([
      { artifactType: 'CaseFile', label: 'CaseFile', status: 'pending' },
      { artifactType: 'Timeline', label: '确认事件时间线', status: 'pending' },
      { artifactType: 'PartyGraph', label: '确认当事人关系图谱', status: 'pending' },
    ]);
  });

  it('marks already-produced artifacts as done', () => {
    const snapshot = deriveTodoSnapshot(MULTI_GATE_SCENARIO, { CaseFile: { caseId: 'c1', files: [] } });
    expect(snapshot[0]).toEqual({ artifactType: 'CaseFile', label: 'CaseFile', status: 'done' });
    expect(snapshot[1].status).toBe('pending');
  });

  it('marks the currently-paused-at artifact as awaiting_confirmation, ahead of done/pending others', () => {
    const snapshot = deriveTodoSnapshot(
      MULTI_GATE_SCENARIO,
      { CaseFile: { caseId: 'c1', files: [] }, Timeline: { caseId: 'c1', events: [] } },
      'Timeline',
    );
    expect(snapshot[0].status).toBe('done');
    expect(snapshot[1]).toEqual({ artifactType: 'Timeline', label: '确认事件时间线', status: 'awaiting_confirmation' });
    expect(snapshot[2].status).toBe('pending');
  });

  it('uses the artifactType itself as label when the step has no confirmation gate', () => {
    const noGateArtifactScenario: ScenarioDefinition = {
      ...MULTI_GATE_SCENARIO,
      outputArtifacts: ['CaseFile'],
      confirmationGates: [{ label: '整体确认' }],
    };
    const snapshot = deriveTodoSnapshot(noGateArtifactScenario, {});
    expect(snapshot).toEqual([{ artifactType: 'CaseFile', label: 'CaseFile', status: 'pending' }]);
  });

  it('is a pure function: same inputs always produce a deeply equal (not identical) result', () => {
    const a = deriveTodoSnapshot(MULTI_GATE_SCENARIO, {});
    const b = deriveTodoSnapshot(MULTI_GATE_SCENARIO, {});
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
