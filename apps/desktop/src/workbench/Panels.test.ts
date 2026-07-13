import { describe, expect, it } from 'vitest';
import { questionShortName, riskNextStep } from './Panels';

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
