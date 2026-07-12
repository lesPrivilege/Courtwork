import { describe, expect, it } from 'vitest';
import type { ScenarioRuntime } from '@courtwork/registry';
import { deriveTodoSnapshot } from './todo-snapshot.js';

// 域盲夹具：合成 test.* 类型；步骤树为具体声明（registry 装载期已派生完）。
const MULTI_GATE_SCENARIO: ScenarioRuntime = {
  id: 'test.Multi',
  packageId: 'test',
  name: '多产出测试场景',
  trigger: { fileTypes: ['pdf'], userActions: [], classifierTags: [] },
  inputArtifacts: [],
  toolIds: [],
  outputArtifacts: ['test.Doc', 'test.Alpha', 'test.Beta'],
  uiTemplateId: 'test-panel',
  confirmationPolicy: {
    mode: 'gates',
    gates: [
      { artifact: 'test.Alpha', label: '确认事件时间线' },
      { artifact: 'test.Beta', label: '确认当事人关系图谱' },
    ],
  },
  promptBody: '测试声明段正文',
  steps: [
    { id: 'produce-test.Doc', title: '登记文档', artifact: 'test.Doc' },
    { id: 'produce-test.Alpha', title: '产出 Alpha', artifact: 'test.Alpha' },
    { id: 'produce-test.Beta', title: '产出 Beta', artifact: 'test.Beta' },
  ],
};

describe('deriveTodoSnapshot (pure function: scenario declaration -> todo list)', () => {
  it('marks every declared step as pending before anything is produced', () => {
    const snapshot = deriveTodoSnapshot(MULTI_GATE_SCENARIO, {});
    expect(snapshot).toEqual([
      { stepId: 'produce-test.Doc', artifactType: 'test.Doc', label: '登记文档', status: 'pending' },
      { stepId: 'produce-test.Alpha', artifactType: 'test.Alpha', label: '确认事件时间线', status: 'pending' },
      { stepId: 'produce-test.Beta', artifactType: 'test.Beta', label: '确认当事人关系图谱', status: 'pending' },
    ]);
  });

  it('marks already-produced artifacts as done', () => {
    const snapshot = deriveTodoSnapshot(MULTI_GATE_SCENARIO, { 'test.Doc': { caseId: 'c1', files: [] } });
    expect(snapshot[0]).toEqual({ stepId: 'produce-test.Doc', artifactType: 'test.Doc', label: '登记文档', status: 'done' });
    expect(snapshot[1].status).toBe('pending');
  });

  it('marks the currently-paused-at artifact as awaiting_confirmation, ahead of done/pending others', () => {
    const snapshot = deriveTodoSnapshot(
      MULTI_GATE_SCENARIO,
      { 'test.Doc': { caseId: 'c1', files: [] }, 'test.Alpha': { caseId: 'c1', events: [] } },
      'test.Alpha',
    );
    expect(snapshot[0].status).toBe('done');
    expect(snapshot[1]).toEqual({
      stepId: 'produce-test.Alpha',
      artifactType: 'test.Alpha',
      label: '确认事件时间线',
      status: 'awaiting_confirmation',
    });
    expect(snapshot[2].status).toBe('pending');
  });

  it('uses the declared step title as label when the step has no confirmation gate', () => {
    const noGateArtifactScenario: ScenarioRuntime = {
      ...MULTI_GATE_SCENARIO,
      outputArtifacts: ['test.Doc'],
      confirmationPolicy: { mode: 'gates', gates: [{ label: '整体确认' }] },
      steps: [{ id: 'produce-test.Doc', title: '登记文档', artifact: 'test.Doc' }],
    };
    const snapshot = deriveTodoSnapshot(noGateArtifactScenario, {});
    expect(snapshot).toEqual([
      { stepId: 'produce-test.Doc', artifactType: 'test.Doc', label: '登记文档', status: 'pending' },
    ]);
  });

  it('无 artifact 的过程步：产出序列一旦启动即 done（工具先于产出的执行语义），否则 pending', () => {
    const withProcessStep: ScenarioRuntime = {
      ...MULTI_GATE_SCENARIO,
      outputArtifacts: ['test.Doc'],
      confirmationPolicy: { mode: 'gates', gates: [{ artifact: 'test.Doc', label: '确认文档' }] },
      steps: [
        { id: 'verify-things', title: '核验主体' },
        { id: 'produce-test.Doc', title: '登记文档', artifact: 'test.Doc' },
      ],
    };
    expect(deriveTodoSnapshot(withProcessStep, {})[0]).toEqual({
      stepId: 'verify-things',
      label: '核验主体',
      status: 'pending',
    });
    expect(deriveTodoSnapshot(withProcessStep, { 'test.Doc': {} })[0]).toEqual({
      stepId: 'verify-things',
      label: '核验主体',
      status: 'done',
    });
    expect(deriveTodoSnapshot(withProcessStep, {}, 'test.Doc')[0].status).toBe('done');
  });

  it('confirmationPolicy none：步骤照步骤树滚动，无 awaiting 态来源', () => {
    const noneScenario: ScenarioRuntime = {
      ...MULTI_GATE_SCENARIO,
      outputArtifacts: ['test.Doc'],
      confirmationPolicy: { mode: 'none' },
      steps: [{ id: 'produce-test.Doc', title: '登记文档', artifact: 'test.Doc' }],
    };
    expect(deriveTodoSnapshot(noneScenario, { 'test.Doc': {} })[0].status).toBe('done');
  });

  it('is a pure function: same inputs always produce a deeply equal (not identical) result', () => {
    const a = deriveTodoSnapshot(MULTI_GATE_SCENARIO, {});
    const b = deriveTodoSnapshot(MULTI_GATE_SCENARIO, {});
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });
});
