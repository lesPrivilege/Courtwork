import { describe, expect, it } from 'vitest';
import {
  CASE_SCOPE_AUDIT,
  caseOutputDir,
  createDemoCaseSummary,
  DEMO_CASE_ID,
  isDemoCaseId,
  resolveCaseRoot,
  stageLabel,
} from './case-scope';

describe('case-scope derivation', () => {
  it('identifies only the demo container id', () => {
    expect(isDemoCaseId(DEMO_CASE_ID)).toBe(true);
    expect(isDemoCaseId('case-1-张三')).toBe(false);
    expect(createDemoCaseSummary().isDemo).toBe(true);
  });

  it('never falls real cases back to demo root', () => {
    const real = {
      id: 'case-new',
      title: '张三诉李四',
      fileCount: 0,
      archived: false,
    };
    expect(resolveCaseRoot(real)).toBeUndefined();
    expect(resolveCaseRoot({ ...real, folderPath: '/tmp/my-case' })).toBe('/tmp/my-case');
    expect(resolveCaseRoot(createDemoCaseSummary())).toContain('临江');
  });

  it('derives output paths from case root only', () => {
    expect(caseOutputDir('/tmp/a')).toBe('/tmp/a/产出');
  });

  it('stage label is empty language for non-demo', () => {
    expect(stageLabel('S3', false)).toBe('尚未开始阶段');
    expect(stageLabel(null, false)).toBe('尚未开始阶段');
    expect(stageLabel('S1', true)).toContain('阅卷');
  });

  it('audit table has no unclassified rows', () => {
    expect(CASE_SCOPE_AUDIT.length).toBeGreaterThanOrEqual(12);
    expect(CASE_SCOPE_AUDIT.some((row) => row.symbol.includes('Composer'))).toBe(true);
    expect(CASE_SCOPE_AUDIT.some((row) => row.symbol.includes('queuedMessages'))).toBe(true);
    expect(CASE_SCOPE_AUDIT.some((row) => row.symbol.includes('lead attorney'))).toBe(true);
    for (const row of CASE_SCOPE_AUDIT) {
      expect(['合法全局', '应派生', '死路由']).toContain(row.kind);
    }
  });
});
