import { describe, expect, it } from 'vitest';
import {
  ConfirmationPolicySchema,
  SideEffectClassEnum,
  sideEffectsPermitNoGate,
} from './confirmation-policy.js';

describe('ConfirmationPolicySchema（ABI 拍板③：none|gates[]）', () => {
  it('gates 模式：至少一道门禁', () => {
    const parsed = ConfirmationPolicySchema.safeParse({
      mode: 'gates',
      gates: [{ artifact: 'legal.RiskList', label: '确认风险清单后再生成修订' }],
    });
    expect(parsed.success).toBe(true);
  });

  it('gates 模式拒绝空数组（留人确认不许空转）', () => {
    expect(ConfirmationPolicySchema.safeParse({ mode: 'gates', gates: [] }).success).toBe(false);
  });

  it('gates 的 artifact 引用必须是 namespaced id', () => {
    expect(
      ConfirmationPolicySchema.safeParse({
        mode: 'gates',
        gates: [{ artifact: 'RiskList', label: 'x' }],
      }).success,
    ).toBe(false);
  });

  it('none 模式合法（准入约束由 ABI/executor 双门另行判定）', () => {
    expect(ConfirmationPolicySchema.safeParse({ mode: 'none' }).success).toBe(true);
  });

  it('拒绝未知模式', () => {
    expect(ConfirmationPolicySchema.safeParse({ mode: 'auto' }).success).toBe(false);
  });
});

describe('副作用分级（confirmationPolicy none 的机器判据，core 强制包无权放宽）', () => {
  it('枚举封闭：五类', () => {
    expect(SideEffectClassEnum.options).toEqual([
      'pure_read',
      'file_write',
      'external_send',
      'mcp_side_effect',
      'authoritative_mutation',
    ]);
  });

  it('全 pure_read 才允许免门禁', () => {
    expect(sideEffectsPermitNoGate(['pure_read', 'pure_read'])).toBe(true);
    expect(sideEffectsPermitNoGate([])).toBe(true);
  });

  it('任一非 pure_read 即禁 none', () => {
    expect(sideEffectsPermitNoGate(['pure_read', 'file_write'])).toBe(false);
    expect(sideEffectsPermitNoGate(['external_send'])).toBe(false);
    expect(sideEffectsPermitNoGate(['mcp_side_effect'])).toBe(false);
    expect(sideEffectsPermitNoGate(['authoritative_mutation'])).toBe(false);
  });
});
