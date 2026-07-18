import { describe, expect, it } from 'vitest';
import { displayNextStep, individualNoteCopy, questionShortName, riskNextStep, scopeFooterCopy } from './Panels';

describe('schema polish presentation helpers', () => {
  it('derives deterministic matrix short names from question text without an alias table', () => {
    expect(questionShortName('违约金比例（买方逾期付款）是多少？')).toBe('违约金');
    expect(questionShortName('争议解决管辖如何约定？')).toBe('争议解决管辖');
    expect(questionShortName('是否约定了书面验收异议期限？')).toBe('约定了书面验收');
  });

  it('derives the next review action from the existing gate and disposition projection', () => {
    expect(riskNextStep('confirmed', 'batch', true)).toBe('已完成');
    expect(riskNextStep('rejected', 'batch', true)).toBe('已退出');
    expect(riskNextStep('revision', 'batch', true)).toBe('修正后确认');
    expect(riskNextStep(undefined, 'individual', false)).toBe('展开依据');
    expect(riskNextStep(undefined, 'individual', true)).toBe('逐条确认');
    expect(riskNextStep(undefined, 'batch', false)).toBe('可批量确认');
  });
});

/**
 * CONFIRM-GRANULARITY-1 补丁（架构裁定）：off 态清零可见「批量」字样——措辞改分级语义
 * （等级 + 下一步）；on 态原文逐字节保留（翻常量即回归）。riskNextStep 本体与上方单测零动。
 */
describe('feature-off 措辞（零「批量」字样；on 态原文逐字节回归）', () => {
  it('off 态三处文案零「批量」子串，且说清等级与下一步', () => {
    for (const copy of [
      individualNoteCopy('high_risk', false),
      individualNoteCopy('unverified', false),
      scopeFooterCopy(false),
      displayNextStep(undefined, 'batch', false, false),
    ]) {
      expect(copy).not.toContain('批量');
    }
    expect(individualNoteCopy('high_risk', false)).toContain('高危');
    expect(individualNoteCopy('high_risk', false)).toContain('逐条');
    expect(individualNoteCopy('unverified', false)).toContain('未核验');
    expect(scopeFooterCopy(false)).toContain('可确认此项');
    expect(displayNextStep(undefined, 'batch', false, false)).toBe('可确认此项');
  });

  it('on 态原文逐字节回归（翻常量即复原）', () => {
    expect(individualNoteCopy('high_risk', true)).toBe('高危条目不进入批量范围');
    expect(individualNoteCopy('unverified', true)).toBe('含未核验依据，不进入批量范围');
    expect(scopeFooterCopy(true)).toBe('可在批量范围内确认');
    expect(displayNextStep(undefined, 'batch', false, true)).toBe('可批量确认');
    expect(displayNextStep('confirmed', 'batch', true, false)).toBe('已完成');
    expect(displayNextStep(undefined, 'individual', true, false)).toBe('逐条确认');
  });
});
