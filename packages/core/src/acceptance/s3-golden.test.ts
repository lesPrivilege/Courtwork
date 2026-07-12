import { describe, expect, it } from 'vitest';
import { evaluateS3DemoGolden, S3_GOLDEN_EVENT_TYPES, S3_MINIMUM_PRELOADED_FINDINGS } from './run-s3-demo.js';
import { S3_RISK_LIST_RESPONSE } from '../composition/s3-risk-list-response.js';

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
      riskList: { caseId: S3_RISK_LIST_RESPONSE.caseId, risks: [] },
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
});
