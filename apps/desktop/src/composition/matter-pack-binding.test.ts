import { describe, expect, it } from 'vitest';
import { createDesktopPackageRuntime, resolveMatterPackBinding } from './package-runtime.js';
import {
  loadCaseList,
  projectPersistableCases,
  type CaseListBackend,
} from '../case/case-store.js';

function backendWith(raw: string): CaseListBackend {
  const store = new Map<string, string>([['courtwork.case-list.v1', raw]]);
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => { store.set(key, value); },
    removeItem: (key) => { store.delete(key); },
  };
}

const envelope = (cases: unknown[]) => JSON.stringify({ version: 1, cases });
const baseCase = { id: 'case-1', title: '甲', kind: 'case' as const };

describe('matter ↔ 垂类包绑定契约（GENERIC-PACK-1 ④ · ADR-015 决定三）', () => {
  it('三态在持久面各自可表达：未声明 / 显式零 / 显式一枚', () => {
    const read = loadCaseList(backendWith(envelope([
      baseCase,
      { ...baseCase, id: 'case-2', packBinding: [] },
      { ...baseCase, id: 'case-3', packBinding: ['legal'] },
    ])));

    expect(read.status).toBe('ok');
    if (read.status !== 'ok') throw new Error('unreachable');
    expect(read.cases.map((item) => item.packBinding)).toEqual([undefined, [], ['legal']]);
  });

  it('长度 > 1 判整库不可读——多包激活是 ADR-014 明确拒绝项，不静默取第一枚', () => {
    const read = loadCaseList(backendWith(envelope([{ ...baseCase, packBinding: ['legal', 'pm'] }])));

    expect(read).toEqual({ status: 'unreadable', reason: 'malformed record' });
  });

  it('空串成员与非数组同样 fail-closed', () => {
    expect(loadCaseList(backendWith(envelope([{ ...baseCase, packBinding: [''] }]))).status).toBe('unreadable');
    expect(loadCaseList(backendWith(envelope([{ ...baseCase, packBinding: 'legal' }]))).status).toBe('unreadable');
  });

  it('投影带上绑定且拷贝而非共享引用——持久面不得被调用方事后改写', () => {
    const source = ['legal'];
    const [projected] = projectPersistableCases([{ ...baseCase, packBinding: source }]);

    expect(projected.packBinding).toEqual(['legal']);
    expect(projected.packBinding).not.toBe(source);
  });

  it('未声明取全局可用集；显式零即零；显式一枚逐字取', () => {
    const available = ['legal', 'pm'];

    expect(resolveMatterPackBinding(undefined, available)).toEqual({ status: 'undeclared', packageIds: available });
    expect(resolveMatterPackBinding([], available)).toEqual({ status: 'declared', packageIds: [] });
    expect(resolveMatterPackBinding(['legal'], available)).toEqual({ status: 'declared', packageIds: ['legal'] });
  });
});

describe('逐 matter registry 派生', () => {
  it('绑定 legal 时只见 legal artifact；绑定为零时一枚 artifact 也没有', () => {
    const runtime = createDesktopPackageRuntime();

    const legalOnly = runtime.registriesFor(['legal']).artifactSchemas.list().map((entry) => entry.descriptor.typeId);
    expect(legalOnly).toContain('legal.RiskList');
    expect(legalOnly.some((typeId) => typeId.startsWith('pm.'))).toBe(false);

    // ADR-023 决定三：零绑定的生效 registry ＝ 基线 registry 本身。判据由「一枚也没有」收窄为
    // 「一枚**垂类**也没有」——基线恒在不是垂类泄漏，它是产品本体。
    const unbound = runtime.registriesFor([]).artifactSchemas.list();
    expect(unbound.every((entry) => entry.packageId === 'generic')).toBe(true);
    expect(unbound.some((entry) => entry.packageId === 'legal' || entry.packageId === 'pm')).toBe(false);
  });

  it('全局可用集与「绑定全部」同集——未声明态与今日行为逐字一致', () => {
    const runtime = createDesktopPackageRuntime();
    const all = runtime.packageRegistries.artifactSchemas.list().map((entry) => entry.descriptor.typeId);
    const bound = runtime.registriesFor(runtime.packageIds).artifactSchemas.list().map((entry) => entry.descriptor.typeId);

    expect(bound).toEqual(all);
  });

  it('绑定到本制品没有的包即拒载，不静默降级成「加载了别的」', () => {
    const runtime = createDesktopPackageRuntime();

    expect(() => runtime.registriesFor(['tender'])).toThrow(/not admitted in this build/);
  });
});
