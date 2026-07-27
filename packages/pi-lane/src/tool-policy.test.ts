import { describe, expect, it } from 'vitest';

import {
  assertToolsWithinPolicy,
  createToolGate,
  DISABLED_TOOL_NAMES,
  READ_ONLY_TOOL_NAMES,
} from './tool-policy.js';

/**
 * 禁用面（ADR-022 决定二：升档前 edit/write/bash 不可授）。
 *
 * pi 的默认语义是「无扩展注册即放行」（`beforeToolCall` 返回 undefined 即通过）。
 * 本闸门把默认反过来：**不在只读闭集内的一律拒绝**，且拒绝理由必须可见——
 * 静默吞掉一次越权请求，与放行没有区别。
 */

const gate = createToolGate();

const call = (name: string) => gate.beforeToolCall({ toolCall: { name } });

describe('只读工具闭集', () => {
  it('绿证一：闭集内的三件工具放行', async () => {
    for (const name of READ_ONLY_TOOL_NAMES) {
      expect(await call(name)).toBeUndefined();
    }
  });

  it('绿证二：只读闭集与禁用面不相交（词表自洽）', () => {
    const overlap = READ_ONLY_TOOL_NAMES.filter((name) => (DISABLED_TOOL_NAMES as readonly string[]).includes(name));
    expect(overlap).toEqual([]);
  });
});

describe('禁用面显式拒绝', () => {
  it('红证一：bash 被拒，且理由点名能力与依据', async () => {
    const verdict = await call('bash');
    expect(verdict?.block).toBe(true);
    expect(verdict?.reason).toContain('bash');
    expect(verdict?.reason).toContain('未授权');
  });

  it('红证二：edit 与 write 被拒', async () => {
    for (const name of ['edit', 'write']) {
      const verdict = await call(name);
      expect(verdict?.block).toBe(true);
      expect(verdict?.reason).toBeTruthy();
    }
  });

  it('红证三：闭集外的未知工具名同样被拒（默认拒绝，不是默认放行）', async () => {
    const verdict = await call('exec_anything');
    expect(verdict?.block).toBe(true);
    expect(verdict?.reason).toContain('exec_anything');
  });

  it('红证四：拒绝理由非空——静默拦截等同放行', async () => {
    for (const name of [...DISABLED_TOOL_NAMES, '随便编一个']) {
      const verdict = await call(name);
      expect(verdict?.reason?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('红证五：isAllowed 与 beforeToolCall 判定一致（两处真源不得漂移）', async () => {
    for (const name of [...READ_ONLY_TOOL_NAMES, ...DISABLED_TOOL_NAMES, '未知']) {
      const allowed = gate.isAllowed(name);
      const verdict = await call(name);
      expect(allowed).toBe(verdict === undefined);
    }
  });
});

describe('装配期校验：工具表不得越出闭集', () => {
  it('绿证三：只读三件通过校验', () => {
    expect(() => assertToolsWithinPolicy([...READ_ONLY_TOOL_NAMES], gate)).not.toThrow();
  });

  it('红证六：工具表混入闭集外的工具，装配期即失败并点名', () => {
    expect(() => assertToolsWithinPolicy(['read', 'bash'], gate)).toThrow(/bash/);
  });

  it('红证七：闸门收窄后，原本合法的工具也会被拦下——校验读的是闸门而非硬编码清单', () => {
    expect(() => assertToolsWithinPolicy(['read', 'grep'], createToolGate(['read']))).toThrow(/grep/);
  });
});
