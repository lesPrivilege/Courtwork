import { describe, expect, it } from 'vitest';
import type { RiskList } from '@courtwork/legal';
import { preflightDocx } from '@courtwork/reading-view/docx-security';
import {
  compileConfirmedReviewToDocx,
  compileDemoConfirmedReviewToDocx,
} from './compile-review-output';

const decode = new TextDecoder();

const PRIMARY_MATERIAL_ID = 'material-primary-contract';

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
    sourceAnchors: [{ fileId: PRIMARY_MATERIAL_ID, quote: '验收标准以卖方提供的技术参数为准', textRange: { start: 0, end: 16 } }],
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
    sourceAnchors: [{ fileId: PRIMARY_MATERIAL_ID, quote: '提供格式条款一方不合理地免除或者减轻其责任加重对方责任', textRange: { start: 0, end: 25 } }],
  }],
};

describe('compileConfirmedReviewToDocx', () => {
  it('全部落点：直接编译产物，无需确认步（排除驳回项）', () => {
    const result = compileConfirmedReviewToDocx({
      riskList: riskListWith([
        { ...APPLIED_RISK, dispositionStatus: 'confirmed' },
        { ...NON_APPLIED_RISK, id: 'risk-rejected', dispositionStatus: 'rejected' },
      ]),
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      primaryMaterialId: PRIMARY_MATERIAL_ID,
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
      riskList: riskListWith([
        { ...APPLIED_RISK, dispositionStatus: 'confirmed' },
        { ...NON_APPLIED_RISK, dispositionStatus: 'confirmed' },
      ]),
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      primaryMaterialId: PRIMARY_MATERIAL_ID,
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

  it('production API 对运行期夹带的 confirmedNonApplied 结构性免疫：即便强行注入也不落盘（fix-by-acceptance 回归锁）', () => {
    const base = {
      riskList: riskListWith([
        { ...APPLIED_RISK, dispositionStatus: 'confirmed' as const },
        { ...NON_APPLIED_RISK, dispositionStatus: 'confirmed' as const },
      ]),
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      primaryMaterialId: PRIMARY_MATERIAL_ID,
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    };
    const probe = compileConfirmedReviewToDocx(base);
    if (probe.status !== 'needs_confirmation') throw new Error('预期先撞确认门');
    const ids = probe.pending.map((p) => p.instructionId);
    // production 输入类型本不携带 confirmedNonApplied；此处以运行期字面量夹带，模拟未来重构
    // 误把该字段透传给 production 包装器的回归——production 编译器必须结构性不读它，仍整份阻断。
    const smuggled = { ...base, confirmedNonApplied: ids } as typeof base;
    const result = compileConfirmedReviewToDocx(smuggled);
    expect(result.status).toBe('needs_confirmation');
    expect(result).not.toHaveProperty('docx');
  });

  it('显式 demo 仍可验证旧逐项 waiver；production API 不消费该本地授权', () => {
    const base = {
      riskList: riskListWith([APPLIED_RISK, NON_APPLIED_RISK]),
      dispositions: { 'risk-applied': 'confirmed', 'risk-strayed': 'confirmed' } as const,
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      primaryMaterialId: PRIMARY_MATERIAL_ID,
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    };
    const probe = compileDemoConfirmedReviewToDocx(base);
    if (probe.status !== 'needs_confirmation') throw new Error('预期先撞确认门');
    const ids = probe.pending.map((p) => p.instructionId);

    const landed = compileDemoConfirmedReviewToDocx({ ...base, confirmedNonApplied: ids });
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
      primaryMaterialId: PRIMARY_MATERIAL_ID,
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    };
    // 确认了一个并不在未落点集合里的错 id：真正未落点项仍未获确认，门禁必须继续阻断。
    const mismatched = compileDemoConfirmedReviewToDocx({ ...base, confirmedNonApplied: ['instr-risk-does-not-exist'] });
    expect(mismatched.status).toBe('needs_confirmation');
    if (mismatched.status !== 'needs_confirmation') throw new Error('unreachable');
    expect(mismatched.pending.map((p) => p.instructionId)).toEqual(['instr-risk-strayed']);
  });

  it('取消即零落盘：needs_confirmation 分支不携 docx', () => {
    const result = compileConfirmedReviewToDocx({
      riskList: riskListWith([
        { ...APPLIED_RISK, dispositionStatus: 'confirmed' },
        { ...NON_APPLIED_RISK, dispositionStatus: 'confirmed' },
      ]),
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      primaryMaterialId: PRIMARY_MATERIAL_ID,
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    });
    expect(result.status).toBe('needs_confirmation');
    expect(result).not.toHaveProperty('docx');
  });

  it('持久 post-revision description 是 Word comment 唯一文本源', () => {
    const result = compileConfirmedReviewToDocx({
      riskList: riskListWith([{
        ...APPLIED_RISK,
        description: '持久修正后的唯一结论',
        dispositionStatus: 'confirmed',
      }]),
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      primaryMaterialId: PRIMARY_MATERIAL_ID,
      evidenceGrades: [],
      now: new Date('2026-07-16T00:00:00.000Z'),
    });
    expect(result.status).toBe('compiled');
    if (result.status !== 'compiled') throw new Error('unreachable');
    expect(decode.decode(preflightDocx(result.docx).files['word/comments.xml'])).toContain('持久修正后的唯一结论');
  });

  it('outOfCoverage 是 production 整份 blocker，即使同时有 confirmed 风险', () => {
    expect(() => compileConfirmedReviewToDocx({
      riskList: {
        ...riskListWith([{ ...APPLIED_RISK, dispositionStatus: 'confirmed' }]),
        outOfCoverage: [{
          summary: '缺少验收附件',
          reason: 'citation_unresolved',
          failures: [{
            claim: { fileId: 'contract.docx', exactQuote: '缺失引语' },
            reason: 'not_found',
          }],
        }],
      },
      sourceMarkdown: SOURCE_MD,
      targetFileName: '设备采购合同.docx',
      primaryMaterialId: PRIMARY_MATERIAL_ID,
      evidenceGrades: [],
    })).toThrow('仍有待索证项，未生成批注稿');
  });
});
