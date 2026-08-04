import { describe, expect, it } from 'vitest';

import { parsePositiveNumberEnv } from './dev-config.js';

/**
 * dev 入口的数值环境变量（`PI-TOOLS-HONESTY-1` CONTESTED 裁定：startup fail-closed）。
 *
 * 病根是 `Number('十二') === NaN`：NaN 喂进 `budget.ts`，`usd >= limits.maxUsd` 与
 * `turns >= limits.maxTurns` 恒假，于是**预算面整枚失守而进程一声不吭**。端口那一枚同族：
 * `listen(NaN)` 被 Node 当 0 处理，服务起在随机端口而 banner 印着 `NaN`。
 * 两枚都不是「值不好看」，是不变量四（静默降级零容忍）的破口，故在启动处拒绝，不带病开线。
 */
describe('parsePositiveNumberEnv', () => {
  it('未设置即取默认值——不设默认等于逼用户每次都填', () => {
    expect(parsePositiveNumberEnv('PI_LANE_MAX_TURNS', undefined, 12)).toEqual({ ok: true, value: 12 });
  });

  it('合法整数与小数照收', () => {
    expect(parsePositiveNumberEnv('PI_LANE_MAX_TURNS', '24', 12)).toEqual({ ok: true, value: 24 });
    expect(parsePositiveNumberEnv('PI_LANE_MAX_USD', '1.25', 0.5)).toEqual({ ok: true, value: 1.25 });
  });

  it('NaN 一律拒绝：它会让预算判定恒假', () => {
    for (const raw of ['十二', 'abc', '1,5', '0x', '--3']) {
      const parsed = parsePositiveNumberEnv('PI_LANE_MAX_TURNS', raw, 12);
      expect(parsed.ok).toBe(false);
    }
  });

  it('空串不当成 0 收下：`Number("") === 0` 是静默改写，不是用户意图', () => {
    expect(parsePositiveNumberEnv('PI_LANE_MAX_USD', '', 0.5).ok).toBe(false);
    expect(parsePositiveNumberEnv('PI_LANE_MAX_USD', '   ', 0.5).ok).toBe(false);
  });

  it('空值与坏值给的是**两条**理由：`PI_LANE_MAX_USD=` 与 `=十二` 不是同一种错', () => {
    const empty = parsePositiveNumberEnv('PI_LANE_MAX_USD', '', 0.5);
    if (empty.ok) throw new Error('不可达');
    expect(empty.reason).toContain('为空');
    const bad = parsePositiveNumberEnv('PI_LANE_MAX_USD', '十二', 0.5);
    if (bad.ok) throw new Error('不可达');
    expect(bad.reason).not.toContain('为空');
  });

  it('Infinity 与非正数一律拒绝：它们同样让上限形同虚设', () => {
    for (const raw of ['Infinity', '-Infinity', '-1', '0', '-0.5']) {
      expect(parsePositiveNumberEnv('PI_LANE_MAX_USD', raw, 0.5).ok).toBe(false);
    }
  });

  it('拒绝理由点名变量、原值与判据——缺任一项，运维就只能猜', () => {
    const parsed = parsePositiveNumberEnv('PI_LANE_MAX_TURNS', '十二', 12);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) throw new Error('不可达');
    expect(parsed.reason).toContain('PI_LANE_MAX_TURNS');
    expect(parsed.reason).toContain('十二');
    expect(parsed.reason).toContain('有限正数');
  });

  it('拒绝时不返回任何可用值——调用方拿不到「先凑合用」的分支', () => {
    const parsed = parsePositiveNumberEnv('PI_LANE_MAX_USD', 'NaN', 0.5);
    expect(parsed).not.toHaveProperty('value');
  });
});
