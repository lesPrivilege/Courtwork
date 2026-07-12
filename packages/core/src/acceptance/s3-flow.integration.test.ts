import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runS3Demo } from './run-s3-demo.js';
import { createFileRevisionEventStore } from '../revision/revision-store.js';

describe('S3 end-to-end acceptance flow', () => {
  it('runs CaseFile -> party-verify -> RiskList -> simulated confirmation (with a real RevisionEvent) -> RevisionInstructionSet -> redlined docx, with a fully replayable event stream', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'courtwork-core-s3-acceptance-'));
    try {
      const result = await runS3Demo(workDir);

      // party-verify 真实经过 demo-fixture 适配器，落进证据台账（B 级信源）。
      expect(result.replay.artifacts['legal.RiskList']).toBeDefined();
      const riskList = result.replay.artifacts['legal.RiskList'] as { risks: { id: string; dispositionStatus: string }[] };
      expect(riskList.risks).toHaveLength(7);

      // 脚本模拟的确认 + 一条真实 RevisionEvent 被记录且体现在最终产出里。
      expect(Object.keys(result.replay.confirmations)).toHaveLength(1);
      expect(result.replay.revisionEventIds).toHaveLength(1);
      expect(riskList.risks[0].dispositionStatus).toBe('confirmed');
      expect(result.replay.completed).toBe(true);

      // RevisionInstructionSet 编译出 7 条指令（6 条 clause 级 + 1 条 party-verify 级）。
      expect(result.outcomes).toHaveLength(7);
      const byId = Object.fromEntries(result.outcomes.map((o) => [o.id, o.status]));
      for (const riskId of ['risk-01', 'risk-02', 'risk-03', 'risk-04', 'risk-05', 'risk-06']) {
        expect(['applied', 'applied_fuzzy']).toContain(byId[`instr-${riskId}`]);
      }
      // risk-07 的依据锚点在 demo-data 卷宗文件里，不在 output 的 stand-in docx 里——
      // 报错并跳过是预期行为（SPEC："定位失败时报错并跳过，不错插"），不是缺陷。
      expect(byId['instr-risk-07']).toBe('locator_not_found');

      // 产出的 docx 是真实非空的 Word 文档（zip 格式以 PK 开头）。
      expect(result.docx.length).toBeGreaterThan(0);
      expect(result.docx.subarray(0, 2).toString('utf-8')).toBe('PK');

      // 全程事件流可回放：类型序列体现"产出→进度快照→确认请求→确认解决→修正记录→
      // 修正后重发产出→进度快照→完成"的完整生命周期（重发的 artifact_produced 是
      // replaySession 能重建出修正后状态的原因；todo_snapshot 是 docs/12 长任务协议①）。
      expect(result.eventTypes).toEqual([
        'artifact_produced',
        'todo_snapshot',
        'confirmation_requested',
        'confirmation_resolved',
        'revision_recorded',
        'artifact_produced',
        'todo_snapshot',
        'scenario_completed',
      ]);

      // 复验入口①（ACCEPTANCE.md）：不经事件流旁证，直接读 revision store 本身，
      // 断言每条落盘记录自带可直接定位到会话的 sessionId。
      const revisionEvents = createFileRevisionEventStore(join(result.workDir, 'revision-events.jsonl')).list();
      expect(revisionEvents).toHaveLength(1);
      expect(revisionEvents[0].sessionId).toBe('demo-s3-session');

      // GOAL-2 接缝细则（docs/58 十二节：交互→RevisionEvent→artifact→投影）：
      // 留痕事件必须完整携带 actor/字段路径/新旧值/理由——"改了什么、为何改"可审计。
      const revision = revisionEvents[0];
      expect(revision.actor.userId).toBe('demo-lawyer');
      expect(revision.actor.role).toBe('主办律师');
      expect(revision.fieldPath).toBe('/risks/0/dispositionStatus');
      expect(revision.previousValue).toBe('pending');
      expect(revision.newValue).toBe('confirmed');
      expect(revision.reason).toBeTruthy();
      expect(revision.timestamp).toBeTruthy();
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
