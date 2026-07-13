import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LEGAL_DEMO_GOLDEN_EVENT_TYPES, runLegalDemo } from './run-legal-demo.js';

/**
 * LEGAL-DEMO-RUN 全链穿越集成测试：把"合同 PDF → ReadingView → 六段组装 → 模型 →
 * 真锚 → 门禁逐条 → 修订 docx"锁成常驻门禁——首跑目击的每一站从此不许静默漂移。
 * Scripted 档剧本回放，但公证/门禁/编译/落笔全部走真管线（与真 key 档同一条）。
 */
describe('LEGAL-DEMO 全链穿越（scripted 档）', () => {
  it('八站齐全、黄金对照零违规、修订 docx 落产出', async () => {
    const result = await runLegalDemo({ workDir: mkdtempSync(join(tmpdir(), 'legal-demo-it-')) });

    expect(result.goldenIssues).toEqual([]);
    expect(result.tier).toBe('scripted');
    expect(result.stations.map((s) => s.station)).toEqual([
      'material',
      'reading_view',
      'runtime',
      'model_and_anchor',
      'gate_paused',
      'gate_resolved',
      'compile_revisions',
      'redline_docx',
    ]);
    expect(result.eventTypes).toEqual([...LEGAL_DEMO_GOLDEN_EVENT_TYPES]);

    // 引用闭环观测：11 条引语全部首过公证，零重试零剪枝（锚点经济性满分基线）。
    expect(result.citationStats).toEqual({
      claims: 11,
      firstPassResolved: 11,
      retryRounds: 0,
      resolvedAfterRetry: 11,
      outOfCoverage: 0,
    });

    // 门禁逐条处置的最终形：7 确认 + 1 驳回（risk-05 律师驳回）。
    expect(result.riskList.risks.filter((r) => r.dispositionStatus === 'confirmed')).toHaveLength(7);
    expect(result.riskList.risks.filter((r) => r.dispositionStatus === 'rejected').map((r) => r.id)).toEqual([
      'risk-05',
    ]);

    // 修订落笔：驳回项不编译；信用查询单引语在合同 docx 里定位失败即跳过（不错插）。
    expect(result.outcomes.map((o) => [o.id, o.status])).toEqual([
      ['instr-risk-01', 'applied'],
      ['instr-risk-02', 'applied'],
      ['instr-risk-03', 'applied'],
      ['instr-risk-04', 'applied'],
      ['instr-risk-06', 'applied'],
      ['instr-risk-07', 'applied'],
      ['instr-risk-08', 'locator_not_found'],
    ]);
    expect(result.docx.length).toBeGreaterThan(0);
    expect(result.replay.completed).toBe(true);
    expect(result.replay.revisionEventIds).toHaveLength(8);

    // 六段组装标记物在每次请求的 wire 上逐一在场。
    for (const wire of result.wires) {
      expect(Object.values(wire.segmentMarkers).every(Boolean)).toBe(true);
    }
  });

  it('双跑确定性：修订指令集字节稳定（docx zip 级哈希循安装包判例不作断言，部件内容由 output 测试守护）', async () => {
    const first = await runLegalDemo({ workDir: mkdtempSync(join(tmpdir(), 'legal-demo-a-')) });
    const second = await runLegalDemo({ workDir: mkdtempSync(join(tmpdir(), 'legal-demo-b-')) });
    const firstSet = readFileSync(join(first.workDir, 'revision-instruction-set.json'), 'utf-8');
    const secondSet = readFileSync(join(second.workDir, 'revision-instruction-set.json'), 'utf-8');
    expect(firstSet).toBe(secondSet);
    expect(first.eventTypes).toEqual(second.eventTypes);
    // 确定性边界（首跑目击）：system 侧四段跨跑字节稳定；user 侧语料段内嵌工具信封，
    // 信封的 checkedAt 是核验时刻证词、随真实时钟走——跨跑 user 哈希不同是正确行为，
    // 不作相等断言（组装器对相同输入的字节稳定由 assembly golden 守护）。
    expect(first.wires.map((w) => w.systemPromptSha256)).toEqual(second.wires.map((w) => w.systemPromptSha256));
  });
});
