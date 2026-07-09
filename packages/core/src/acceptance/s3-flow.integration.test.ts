import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runS3Demo } from './run-s3-demo.js';

describe('S3 end-to-end acceptance flow', () => {
  it('runs CaseFile -> party-verify -> RiskList -> simulated confirmation (with a real RevisionEvent) -> RevisionInstructionSet -> redlined docx, with a fully replayable event stream', async () => {
    const workDir = mkdtempSync(join(tmpdir(), 'courtwork-core-s3-acceptance-'));
    try {
      const result = await runS3Demo(workDir);

      // party-verify 真实经过 demo-fixture 适配器，落进证据台账（B 级信源）。
      expect(result.replay.artifacts.RiskList).toBeDefined();
      const riskList = result.replay.artifacts.RiskList as { risks: { id: string; dispositionStatus: string }[] };
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

      // 全程事件流可回放：类型序列体现"产出→确认请求→确认解决→修正记录→修正后重发产出→完成"
      // 的完整生命周期（重发的 artifact_produced 是 replaySession 能重建出修正后状态的原因）。
      expect(result.eventTypes).toEqual([
        'artifact_produced',
        'confirmation_requested',
        'confirmation_resolved',
        'revision_recorded',
        'artifact_produced',
        'scenario_completed',
      ]);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});
