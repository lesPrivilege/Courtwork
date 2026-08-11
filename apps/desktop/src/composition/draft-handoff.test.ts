import { describe, expect, it } from 'vitest';
import {
  DRAFT_HANDOFF_ARTIFACT_TYPE,
  DRAFT_HANDOFF_LABEL,
  planDraftHandoff,
} from './draft-handoff.js';

/**
 * GENERIC-SCENARIOS-1 收尾件一：`generic.DraftDocument` → 通用起草画布的显式移交。
 *
 * 判定住受信组合根：**移交合法性由包冻结的 schema 说了算**，不由壳按形状猜。壳只问一句
 * 「这枚载荷能不能进画布」，答不上来就显式拒绝——静默不渲染动作、或把半份文稿塞进画布
 * 都属不变量四禁止的静默降级。
 */
describe('planDraftHandoff（产出 → 起草画布的移交判定）', () => {
  const DOCUMENT = { title: '季度工作说明', paragraphs: ['第一段。', '第二段。'] };

  it('声明面：移交只认基线起草产物这一枚地址，动作文案是动词+名词', () => {
    expect(DRAFT_HANDOFF_ARTIFACT_TYPE).toBe('generic.DraftDocument');
    expect(DRAFT_HANDOFF_LABEL).toBe('送入起草画布');
  });

  it('合规载荷 → ready，且交出的是画布形制的副本（标题与段落逐字保留）', () => {
    const plan = planDraftHandoff({ payload: DOCUMENT, frozen: false });
    expect(plan).toEqual({ status: 'ready', document: { title: '季度工作说明', paragraphs: ['第一段。', '第二段。'] } });
  });

  it('画布已定稿 → 显式拒绝（定稿转只读是既有确认账，移交不得绕过）', () => {
    const plan = planDraftHandoff({ payload: DOCUMENT, frozen: true });
    expect(plan.status).toBe('blocked');
    if (plan.status !== 'blocked') throw new Error('unreachable');
    expect(plan.message).toContain('已定稿');
  });

  it('载荷不合包冻结 schema → 显式拒绝，不半份塞进画布', () => {
    for (const payload of [undefined, {}, { title: '只有标题' }, { title: '', paragraphs: ['x'] }, { title: 't', paragraphs: 'x' }]) {
      const plan = planDraftHandoff({ payload, frozen: false });
      expect(plan.status).toBe('blocked');
    }
  });

  it('定稿判定先于结构判定：两者同时不成立时报的是定稿（用户下一步不同）', () => {
    const plan = planDraftHandoff({ payload: {}, frozen: true });
    if (plan.status !== 'blocked') throw new Error('unreachable');
    expect(plan.message).toContain('已定稿');
  });
});
