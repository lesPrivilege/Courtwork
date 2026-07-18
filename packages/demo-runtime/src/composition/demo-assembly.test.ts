import { describe, expect, it } from 'vitest';
import { createToolExecutor } from '@courtwork/tools';
import { buildDemoS3Runtime } from './demo-assembly.js';

describe('buildDemoS3Runtime', () => {
  it('registers a B-grade party-verify tool wired to the real demo-data corpus (not a hand-rolled fixture)', async () => {
    const runtime = buildDemoS3Runtime();
    const binding = runtime.tools.get('party-verify');
    expect(binding?.grade).toBe('B');

    const executor = createToolExecutor();
    const result = await executor.execute(binding!.tool, runtime.toolInputs['party-verify']);
    expect(result.verified).toBe(true);
    if (!result.verified) throw new Error('unreachable');
    expect(result.source).toBe('demo-fixture');
    expect(result.data.businessStatus).toBe('存续');
    expect(result.data.relatedRecords.length).toBeGreaterThan(0);
  });

  it('composes the scripted provider and TurnStore behind one TurnRunnerPort', async () => {
    const runtime = buildDemoS3Runtime();
    const response = await runtime.turnRunner.run({
      turnId: 'demo-turn-1',
      providerRequestId: 'demo-provider-request-1',
      request: { messages: [] },
    });
    if (response.status !== 'completed') throw new Error('scripted runtime unexpectedly failed');
    const parsed = JSON.parse(response.assistantMessage);
    // 寻址信封：脚本响应与真管线过同一道按址收货门。
    expect(parsed.target).toEqual({ stepId: 'produce-risk-list', artifactType: 'legal.RiskList' });
    expect(parsed.artifact.caseId).toBe('case-linjiang-qiyun-2025');
    expect(parsed.artifact.risks).toHaveLength(7);
  });
});
