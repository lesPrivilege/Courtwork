import { describe, expect, it } from 'vitest';
import type { RiskList } from '@courtwork/legal';
import { preflightDocx } from '@courtwork/reading-view/docx-security';
import { compileConfirmedReviewToDocx } from './compile-review-output';

const decode = new TextDecoder();

const SOURCE_MD =
  '# 设备采购合同\n\n第四条 验收标准以卖方提供的技术参数为准。\n\n第六条 乙方逾期付款按日计违约金。';

function riskListWith(risks: RiskList['risks']): RiskList {
  return { caseId: 'case-demo', outOfCoverage: [], risks };
}

const APPLIED_RISK: RiskList['risks'][number] = {
  id: 'risk-applied',
  description: '验收标准模糊需补强',
  level: 'high',
  dispositionStatus: 'pending',
  basis: [{
    citation: '《民法典》第六百二十一条',
    sourceAnchors: [{ fileId: 'contract.md', quote: '验收标准以卖方提供的技术参数为准', textRange: { start: 0, end: 16 } }],
  }],
};

// 首个依据的 quote 是「法条正文」，正文里根本不存在——真实 demo 里 risk-02/06 正是此形。
const NON_APPLIED_RISK: RiskList['risks'][number] = {
  id: 'risk-strayed',
  description: '违约责任条款单向',
  level: 'medium',
  dispositionStatus: 'pending',
  basis: [{
    citation: '《民法典》第四百九十七条',
    sourceAnchors: [{ fileId: 'contract.md', quote: '提供格式条款一方不合理地免除或者减轻其责任加重对方责任', textRange: { start: 0, end: 25 } }],
  }],
};

describe('compileConfirmedReviewToDocx', () => {
  it('全部落点：直接编译产物，无需确认步（排除驳回项）', () => {
    const result = compileConfirmedReviewToDocx({
      riskList: riskListWith([APPLIED_RISK, { ...NON_APPLIED_RISK, id: 'risk-rejected' }]),
      dispositions: { 'risk-applied': 'confirmed', 'risk-rejected': 'rejected' },
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    });

    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') throw new Error('unreachable');
    expect(result.outcomes).toHaveLength(1);
    expect(result.outcomes[0]).toMatchObject({ id: 'instr-risk-applied', status: 'applied' });
    const files = preflightDocx(result.docx).files;
    expect(decode.decode(files['word/comments.xml'])).toContain('验收标准模糊需补强');
    expect(decode.decode(files['word/comments.xml'])).not.toContain('违约责任条款单向');
  });

  it('部分未落点：返回 needs_confirmation，逐条待确认项与实际未落点 outcome 一一对应', () => {
    const result = compileConfirmedReviewToDocx({
      riskList: riskListWith([APPLIED_RISK, NON_APPLIED_RISK]),
      dispositions: { 'risk-applied': 'confirmed', 'risk-strayed': 'confirmed' },
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    });

    expect(result.status).toBe('needs_confirmation');
    if (result.status !== 'needs_confirmation') throw new Error('unreachable');
    // 一一对应：只 risk-strayed 未落点；不多不少
    expect(result.pending).toHaveLength(1);
    expect(result.pending[0]).toMatchObject({
      instructionId: 'instr-risk-strayed',
      riskId: 'risk-strayed',
      summary: '违约责任条款单向',
      reason: 'not_located',
      quote: '提供格式条款一方不合理地免除或者减轻其责任加重对方责任',
    });
  });

  it('逐项确认后落盘：确认全部未落点项即产出 docx，未落点项在 outcomes 中如实保留', () => {
    const base = {
      riskList: riskListWith([APPLIED_RISK, NON_APPLIED_RISK]),
      dispositions: { 'risk-applied': 'confirmed', 'risk-strayed': 'confirmed' } as const,
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    };
    const probe = compileConfirmedReviewToDocx(base);
    if (probe.status !== 'needs_confirmation') throw new Error('预期先撞确认门');
    const ids = probe.pending.map((p) => p.instructionId);

    const landed = compileConfirmedReviewToDocx({ ...base, confirmedNonApplied: ids });
    expect(landed.status).toBe('compiled');
    if (landed.status !== 'compiled') throw new Error('unreachable');
    // 未落点项照实回报（不静默丢弃），只是不再阻断
    expect(landed.outcomes.map((o) => o.id).sort()).toEqual(['instr-risk-applied', 'instr-risk-strayed']);
    expect(landed.outcomes.find((o) => o.id === 'instr-risk-strayed')?.status).toBe('locator_not_found');
    expect(decode.decode(preflightDocx(landed.docx).files['word/document.xml'])).toBeTruthy();
  });

  it('确认清单与实际 outcome 不一致（漏项/错项）不得落盘——针对性确认非笼统放行', () => {
    const base = {
      riskList: riskListWith([APPLIED_RISK, NON_APPLIED_RISK]),
      dispositions: { 'risk-applied': 'confirmed', 'risk-strayed': 'confirmed' } as const,
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    };
    // 确认了一个并不在未落点集合里的错 id：真正未落点项仍未获确认，门禁必须继续阻断。
    const mismatched = compileConfirmedReviewToDocx({ ...base, confirmedNonApplied: ['instr-risk-does-not-exist'] });
    expect(mismatched.status).toBe('needs_confirmation');
    if (mismatched.status !== 'needs_confirmation') throw new Error('unreachable');
    expect(mismatched.pending.map((p) => p.instructionId)).toEqual(['instr-risk-strayed']);
  });

  it('取消即零落盘：needs_confirmation 分支不携 docx', () => {
    const result = compileConfirmedReviewToDocx({
      riskList: riskListWith([APPLIED_RISK, NON_APPLIED_RISK]),
      dispositions: { 'risk-applied': 'confirmed', 'risk-strayed': 'confirmed' },
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    });
    expect(result.status).toBe('needs_confirmation');
    expect(result).not.toHaveProperty('docx');
  });
});
