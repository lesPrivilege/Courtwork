import { describe, expect, it } from 'vitest';
import type { SessionEvent } from '@courtwork/core';
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
    expect(artifact).toMatchObject({ type: 'artifact_produced', artifactType: 'RiskList' });
    if (artifact?.type === 'artifact_produced') expect(artifact.evidenceGrades.map((item) => item.grade)).toEqual(['B', 'C']);
  });

  it('S1 录制包含摄取进度、todo 快照与两个结构化产出', () => {
    assertRecording(S1_RECORDING);
    expect(S1_RECORDING.map((event) => event.type)).toEqual([
      'progress', 'artifact_produced', 'todo_snapshot', 'artifact_produced', 'confirmation_requested', 'progress', 'artifact_produced',
    ]);
  });

  it('机械投影器只按事件字段重建界面状态', () => {
    const projected = S3_RECORDING.reduce(projectSession, EMPTY_SESSION);
    expect(projected.artifacts.RiskList).toBeDefined();
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
    expect(projected.artifacts.RiskList).toBeDefined();
  });

  it('provider 降档 notice 随 artifact 机械投影，供 composer chip 轻提示', () => {
    const event: SessionEvent = {
      type: 'artifact_produced', artifactType: 'RiskList', artifact: { caseId: 'c1', risks: [] }, evidenceGrades: [],
      providerNotices: [{
        code: 'reasoning_downgraded_for_structured_output', message: '结构化输出已使用标准模式', requested: 'deep', applied: 'standard',
      }],
      sessionId: 'demo-s3', seq: 1, emittedAt: '2026-07-12T00:00:00.000Z',
    };
    const projected = projectSession(EMPTY_SESSION, event);
    expect(projected.providerNotices).toEqual(event.providerNotices);
  });
});
