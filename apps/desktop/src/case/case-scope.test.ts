import { describe, expect, it } from 'vitest';
import {
  CASE_SCOPE_AUDIT,
  caseOutputDir,
  createDemoCaseSummary,
  DEMO_CASE_ID,
  isDemoCaseId,
  resolveCaseBinding,
  stageLabel,
} from './case-scope';
import type { CaseSummary } from './types';

const realCase: CaseSummary = {
  id: 'case-new',
  title: '张三诉李四',
  fileCount: 0,
  archived: false,
};

describe('case-scope derivation', () => {
  it('identifies only the demo container id', () => {
    expect(isDemoCaseId(DEMO_CASE_ID)).toBe(true);
    expect(isDemoCaseId('case-1-张三')).toBe(false);
    expect(createDemoCaseSummary().isDemo).toBe(true);
  });

  it('样板案不再携带绝对 folderPath——demo 语义由 binding demo 承载', () => {
    const demo = createDemoCaseSummary();
    expect('folderPath' in demo).toBe(false);
    expect(resolveCaseBinding(demo)).toEqual({ kind: 'demo' });
  });

  it('真实案按 grantId 解析为 opaque grant 绑定，未绑定为 unbound（绝不回落 demo）', () => {
    expect(resolveCaseBinding(realCase)).toEqual({ kind: 'unbound' });
    const bound = resolveCaseBinding({ ...realCase, grantId: 'grant-abc', label: '张三案' });
    expect(bound).toEqual({ kind: 'grant', grantId: 'grant-abc' });
    // 绑定只携 opaque grantId，无任何绝对路径字段
    expect(JSON.stringify(bound)).not.toContain('/');
  });

  it('跨案 grant 绑定互不串扰（各自 grantId）', () => {
    const a = resolveCaseBinding({ ...realCase, id: 'case-a', grantId: 'grant-a' });
    const b = resolveCaseBinding({ ...realCase, id: 'case-b', grantId: 'grant-b' });
    expect(a).toEqual({ kind: 'grant', grantId: 'grant-a' });
    expect(b).toEqual({ kind: 'grant', grantId: 'grant-b' });
  });

  it('isDemo 优先于 grantId：样板案永远是 demo 绑定，不落真实授权', () => {
    const demoWithStrayGrant = { ...createDemoCaseSummary(), grantId: 'grant-ignored' };
    expect(resolveCaseBinding(demoWithStrayGrant)).toEqual({ kind: 'demo' });
  });

  it('derives output dir from a given root only', () => {
    expect(caseOutputDir('/tmp/a')).toBe('/tmp/a/产出');
  });

  it('stage label is empty language for non-demo', () => {
    expect(stageLabel('S3', false)).toBe('尚未开始阶段');
    expect(stageLabel(null, false)).toBe('尚未开始阶段');
    expect(stageLabel('S1', true)).toContain('阅卷');
  });

  it('audit table has no unclassified rows（CASE-ROOT-1 收口后死路由行已删）', () => {
    expect(CASE_SCOPE_AUDIT.length).toBeGreaterThanOrEqual(10);
    expect(CASE_SCOPE_AUDIT.some((row) => row.symbol.includes('Composer'))).toBe(true);
    expect(CASE_SCOPE_AUDIT.some((row) => row.symbol.includes('queuedMessages'))).toBe(true);
    expect(CASE_SCOPE_AUDIT.some((row) => row.symbol.includes('lead attorney'))).toBe(true);
    // 绝对 caseRoot/folderPath 回落死路由不得复活
    expect(CASE_SCOPE_AUDIT.some((row) => row.symbol.includes('DEMO_CASE_ROOT'))).toBe(false);
    expect(CASE_SCOPE_AUDIT.some((row) => row.symbol.includes('folderPath'))).toBe(false);
    for (const row of CASE_SCOPE_AUDIT) {
      expect(['合法全局', '应派生', '死路由']).toContain(row.kind);
    }
  });
});
