import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '@courtwork/core';
import { LEGAL_PACKAGE, type RiskList } from '@courtwork/legal';
import { S1_RECORDING, S3_RECORDING } from '../demo/recordings';
import { EMPTY_SESSION, projectSession } from './client';

function assertRecording(events: SessionEvent[]) {
  expect(events.length).toBeGreaterThan(3);
  events.forEach((event, index) => {
    expect(event.seq).toBe(index + 1);
    expect(event.sessionId).toMatch(/^demo-s[13]$/);
    expect(Number.isNaN(Date.parse(event.emittedAt))).toBe(false);
  });
}

describe('core 事件录制回放契约', () => {
  it('S3 录制保持严格序号并由 artifact_produced 提供信源投影', () => {
    assertRecording(S3_RECORDING);
    const artifact = S3_RECORDING.find((event) => event.type === 'artifact_produced');
    expect(artifact).toMatchObject({ type: 'artifact_produced', artifactType: 'legal.RiskList' });
    if (artifact?.type === 'artifact_produced') expect(artifact.evidenceGrades.map((item) => item.grade)).toEqual(['B', 'C']);
  });

  it('S3 录制契约层对齐包声明（LEGAL-DEMO-RUN ③ 防录制漂移）：顺序/todo 步/门禁标签/公证观测', () => {
    // 契约层顺序 = executor pauseAt 语义：artifact → todo → confirmation（progress 为演示旁白，允许先行）。
    expect(S3_RECORDING.map((event) => event.type)).toEqual([
      'progress', 'artifact_produced', 'todo_snapshot', 'confirmation_requested',
    ]);

    const scenario = LEGAL_PACKAGE.scenarios.find((item) => item.id === 'legal.S3');
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const declaredGateLabel = scenario.confirmationPolicy.mode === 'gates' ? scenario.confirmationPolicy.gates[0]!.label : undefined;

    const declaredSteps = scenario.steps ?? [];
    expect(declaredSteps.length).toBeGreaterThan(0);
    const todo = S3_RECORDING.find((event) => event.type === 'todo_snapshot');
    if (todo?.type === 'todo_snapshot') {
      // 步 id 与声明步骤树逐一对齐；停门禁步的 label 按 deriveTodoSnapshot 规则取门禁标签。
      expect(todo.steps.map((step) => step.stepId)).toEqual(declaredSteps.map((step) => step.id));
      expect(todo.steps.at(-1)).toMatchObject({ label: declaredGateLabel, status: 'awaiting_confirmation' });
    }

    const confirmation = S3_RECORDING.find((event) => event.type === 'confirmation_requested');
    if (confirmation?.type === 'confirmation_requested') {
      expect(confirmation.gateLabel).toBe(declaredGateLabel);
    }

    const artifact = S3_RECORDING.find((event) => event.type === 'artifact_produced');
    if (artifact?.type === 'artifact_produced') {
      const anchorCount = (artifact.artifact as RiskList).risks
        .flatMap((risk) => risk.basis.flatMap((basis) => basis.sourceAnchors)).length;
      expect(artifact.citationStats).toEqual({
        claims: anchorCount,
        firstPassResolved: anchorCount,
        retryRounds: 0,
        resolvedAfterRetry: anchorCount,
        outOfCoverage: 0,
      });
    }
  });

  it('citationStats 随 artifact 机械投影，且续行重发（无观测字段）不清空既有观测', () => {
    const projected = S3_RECORDING.reduce(projectSession, EMPTY_SESSION);
    expect(projected.citationStats).toEqual({ claims: 8, firstPassResolved: 8, retryRounds: 0, resolvedAfterRetry: 8, outOfCoverage: 0 });
    const reEmit: SessionEvent = {
      type: 'artifact_produced', artifactType: 'legal.RiskList', artifact: { caseId: 'c1', risks: [] }, evidenceGrades: [],
      sessionId: 'demo-s3', seq: 5, emittedAt: '2026-07-13T00:00:05.000Z',
    };
    expect(projectSession(projected, reEmit).citationStats).toEqual(projected.citationStats);
  });

  it('S1 录制包含摄取进度、todo 快照与两个结构化产出', () => {
    assertRecording(S1_RECORDING);
    expect(S1_RECORDING.map((event) => event.type)).toEqual([
      'progress', 'artifact_produced', 'todo_snapshot', 'artifact_produced', 'confirmation_requested', 'progress', 'artifact_produced',
    ]);
  });

  it('机械投影器只按事件字段重建界面状态', () => {
    const projected = S3_RECORDING.reduce(projectSession, EMPTY_SESSION);
    expect(projected.artifacts['legal.RiskList']).toBeDefined();
    expect(projected.confirmation?.requestId).toBe('demo-s3-risk-gate');
    expect(projected.evidenceGrades).toHaveLength(2);
    expect(projected.lastSeq).toBe(4);
  });

  it('step_failed 只进入失败列表，不吞掉既有产出', () => {
    const produced = S3_RECORDING.reduce(projectSession, EMPTY_SESSION);
    const failed: SessionEvent = {
      type: 'step_failed', scope: 'tool', toolId: 'party-verify', reason: 'timeout', message: '核验超时',
      sessionId: 'demo-s3', seq: 5, emittedAt: '2026-07-10T09:00:05.000Z',
    };
    const projected = projectSession(produced, failed);
    expect(projected.failures).toEqual([failed]);
    expect(projected.artifacts['legal.RiskList']).toBeDefined();
  });

  it('scenario_failed 收敛为场景级终局失败，不落入 default 分支丢弃（WORK-STORE-1-FIX B2）', () => {
    const event: SessionEvent = {
      type: 'scenario_failed', scope: 'scenario', reason: 'runtime_limit',
      message: '运行时保护触发：maxSeconds 已达到配置上限 5', retryable: false,
      sessionId: 'demo-s3', seq: 0, emittedAt: '2026-07-16T00:00:00.000Z',
    };
    const projected = projectSession(EMPTY_SESSION, event);
    expect(projected.scenarioFailure).toEqual({ reason: 'runtime_limit', message: event.message });
    expect(projected.completed).toBe(false);
    expect(projected.lastSeq).toBe(0);
  });

  it('provider 降档 notice 随 artifact 机械投影，供 composer chip 轻提示', () => {
    const event: SessionEvent = {
      type: 'artifact_produced', artifactType: 'legal.RiskList', artifact: { caseId: 'c1', risks: [] }, evidenceGrades: [],
      providerNotices: [{
        code: 'reasoning_downgraded_for_structured_output', message: '结构化输出已使用标准模式', requested: 'deep', applied: 'standard',
      }],
      sessionId: 'demo-s3', seq: 1, emittedAt: '2026-07-12T00:00:00.000Z',
    };
    const projected = projectSession(EMPTY_SESSION, event);
    expect(projected.providerNotices).toEqual(event.providerNotices);
  });
});
