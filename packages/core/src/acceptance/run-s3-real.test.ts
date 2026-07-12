import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import type { Provider } from '../provider/types.js';
import { assertNoDemoInReal, runS3Real } from './run-s3-real.js';

const workRoot = mkdtempSync(join(tmpdir(), 'courtwork-s3-real-test-'));
afterAll(() => rmSync(workRoot, { recursive: true, force: true }));

const REAL_QUOTE = '乙方逾期付款的，按日千分之一支付违约金。';

function writeRealContract(): string {
  const path = join(workRoot, '真实合同.md');
  writeFileSync(path, `# 真实合同\n\n第一条 ${REAL_QUOTE}\n\n第二条 其余条款从略。\n`, 'utf-8');
  return path;
}

/** 真形状假 provider：id/modelId 像真的一样，返回引用真材料的草稿信封——用于通道级验证，不冒充真机证据。 */
function realShapedProvider(fileId: string): Provider {
  return {
    id: 'deepseek',
    modelId: 'deepseek-v4-flash',
    async generate() {
      return {
        content: JSON.stringify({
          target: { stepId: 'produce-risk-list', artifactType: 'legal.RiskList' },
          artifact: {
            caseId: `real-${fileId}`,
            risks: [
              {
                id: 'risk-01',
                description: '违约金日千分之一偏高',
                level: 'medium',
                basis: [{ citation: '合同第一条', quoteClaims: [{ fileId, exactQuote: REAL_QUOTE }] }],
                dispositionStatus: 'pending',
              },
            ],
          },
        }),
        usage: { inputTokens: 1000, outputTokens: 300 },
      };
    },
  };
}

describe('runS3Real（LEGAL-REAL 真跑通道）', () => {
  it('无 provider（无 key）在读材料之前拒跑——无 key 无全文（证据七项）', async () => {
    // 路径指向不存在的文件：若实现先读材料后查 key，会以 ENOENT 而非拒跑语义失败——
    // 本断言同时证明"拒跑发生在任何材料读取之前"。
    await expect(
      runS3Real({ contractPath: join(workRoot, '不存在的文件.pdf'), provider: undefined }),
    ).rejects.toThrow(/无 key|拒绝启动/);
  });

  it('真形状 provider + 真材料：门禁暂停 + 证据七项齐备 + 防污染零违规', async () => {
    const contractPath = writeRealContract();
    const result = await runS3Real({
      contractPath,
      provider: realShapedProvider('真实合同.md'),
      workDir: join(workRoot, 'run-ok'),
    });
    expect(result.status).toBe('paused');
    expect(result.requestId).toBeTruthy();
    const { evidence } = result;
    expect(evidence.materialSha256['真实合同.md']).toMatch(/^[0-9a-f]{64}$/);
    expect(evidence.promptSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(evidence.versionTriple).toEqual({ corePackage: '0.1.0', legalPackage: '0.1.0', legalSchemaVersion: 1 });
    expect(evidence.modelEvents).toEqual({ providerId: 'deepseek', modelId: 'deepseek-v4-flash' });
    expect(evidence.citationStats).toEqual({ claims: 1, firstPassResolved: 1, retryRounds: 0, resolvedAfterRetry: 1, outOfCoverage: 0 });
    expect(evidence.gatePaused).toBe(true);
    expect(evidence.noDemoViolations).toEqual([]);
  });
});

describe('assertNoDemoInReal（防 Demo 污染断言——变异敏感）', () => {
  const cleanInput = {
    providerId: 'deepseek',
    events: [] as never[],
    materials: [{ fileId: 'a.md', sha256: 'x', readingMarkdown: 'y' }],
    realMaterialFileIds: ['a.md'],
  };

  it('洁净输入零违规', () => {
    expect(assertNoDemoInReal(cleanInput)).toEqual([]);
  });

  it('scripted provider 即违规（demo 装配点挂载被抓）', () => {
    expect(assertNoDemoInReal({ ...cleanInput, providerId: 'demo-scripted-provider' })).not.toEqual([]);
  });

  it('事件流含 demo-fixture 来源标记即违规', () => {
    const events = [
      { type: 'step_failed', scope: 'tool', toolId: 'party-verify', reason: 'x', message: 'source: demo-fixture', sessionId: 's', seq: 1, emittedAt: 't' },
    ] as never[];
    expect(assertNoDemoInReal({ ...cleanInput, events })).not.toEqual([]);
  });

  it('demo 素材混入材料集即违规', () => {
    expect(
      assertNoDemoInReal({
        ...cleanInput,
        materials: [...cleanInput.materials, { fileId: 'sample-sale-contract-v1.docx', sha256: 'z', readingMarkdown: 'w' }],
      }),
    ).not.toEqual([]);
  });

  it('锚点指向非真材料文件即违规', () => {
    const events = [
      {
        type: 'artifact_produced',
        sessionId: 's',
        seq: 1,
        emittedAt: 't',
        artifactType: 'legal.RiskList',
        evidenceGrades: [],
        artifact: {
          caseId: 'c',
          outOfCoverage: [],
          risks: [
            {
              id: 'r1',
              description: 'x',
              level: 'low',
              dispositionStatus: 'pending',
              basis: [{ citation: 'c', sourceAnchors: [{ fileId: 'demo-其他文件.md', textRange: { start: 0, end: 1 } }] }],
            },
          ],
        },
      },
    ] as never[];
    expect(assertNoDemoInReal({ ...cleanInput, events })).not.toEqual([]);
  });
});
