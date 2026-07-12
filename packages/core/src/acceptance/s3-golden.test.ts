import { describe, expect, it } from 'vitest';
import { evaluateS3DemoGolden, S3_GOLDEN_EVENT_TYPES, S3_MINIMUM_PRELOADED_FINDINGS } from './run-s3-demo.js';
import { S3_RISK_LIST_RESPONSE } from '@courtwork/legal';

describe('S3 golden 门：事件骨架 + 预埋考点同时有牙', () => {
  it('脚本化 golden 同时命中完整事件序列与至少 N 个预埋风险锚点', () => {
    const report = evaluateS3DemoGolden({
      eventTypes: [...S3_GOLDEN_EVENT_TYPES],
      riskList: S3_RISK_LIST_RESPONSE,
    });
    expect(report.pass).toBe(true);
    expect(report.matchedPreloadedFindings).toBeGreaterThanOrEqual(S3_MINIMUM_PRELOADED_FINDINGS);
  });

  it('空 RiskList 即使事件骨架完整也必须失败', () => {
    const report = evaluateS3DemoGolden({
      eventTypes: [...S3_GOLDEN_EVENT_TYPES],
      riskList: { caseId: S3_RISK_LIST_RESPONSE.caseId, risks: [], outOfCoverage: [] },
    });
    expect(report.pass).toBe(false);
    expect(report.issues.join('\n')).toMatch(/预埋考点/);
  });

  it('事件序列漂移必须失败', () => {
    const report = evaluateS3DemoGolden({
      eventTypes: ['artifact_produced'],
      riskList: S3_RISK_LIST_RESPONSE,
    });
    expect(report.pass).toBe(false);
    expect(report.issues.join('\n')).toMatch(/事件骨架/);
  });

  it('平凡输出（通用法律词短引语）必须失败——docs/68 审计探针转常驻门（单向匹配的牙）', () => {
    // 任何合同审查都会写出的五个词：曾以反向 substring 骗过旧门（docs/68 五节实证）。
    const trivialQuotes = ['违约金', '人民法院', '质保期', '三十日', '附表一'];
    const report = evaluateS3DemoGolden({
      eventTypes: [...S3_GOLDEN_EVENT_TYPES],
      riskList: {
        caseId: S3_RISK_LIST_RESPONSE.caseId,
        outOfCoverage: [],
        risks: trivialQuotes.map((quote, index) => ({
          id: `trivial-${index}`,
          description: '平凡描述',
          level: 'low' as const,
          dispositionStatus: 'pending' as const,
          basis: [{ citation: 'x', sourceAnchors: [{ fileId: 'f', quote, textRange: { start: 0, end: 1 } }] }],
        })),
      },
    });
    expect(report.pass).toBe(false);
    expect(report.matchedPreloadedFindings).toBeLessThan(S3_MINIMUM_PRELOADED_FINDINGS);
  });
});
