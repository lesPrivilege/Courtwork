// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MatterPackDialog } from './MatterPackDialog';

/**
 * PACK-INTERACT-1 ①/③：matter 级包设置弹层——当前状态 + 全局可用集单选 + 保存/取消。
 * 绑定失效态（绑定指向本制品未准入的包）显式标注，保存清绑即恢复；未声明态跟随全部可用包。
 */

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

function render(node: Parameters<NonNullable<typeof root>['render']>[0]) {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(node));
  return container;
}

const CATALOG = [
  { packageId: 'legal', displayName: '法律包', version: '0.1.0', availability: 'loadable' as const },
  { packageId: 'pm', displayName: '产品管理包', version: '0.1.1', availability: 'catalog-only' as const },
];
const AVAILABLE = ['legal', 'pm'];

describe('MatterPackDialog（matter 级包设置）', () => {
  it('关闭态不渲染；打开态呈现当前状态与全局可用集', () => {
    const closed = render(createElement(MatterPackDialog, {
      open: false,
      caseTitle: '甲案',
      packBinding: ['legal'],
      availablePackageIds: AVAILABLE,
      packCatalog: CATALOG,
      onClose: vi.fn(),
      onApply: vi.fn(),
    }));
    expect(closed.querySelector('[data-testid="matter-pack-dialog"]')).toBeNull();

    const host = render(createElement(MatterPackDialog, {
      open: true,
      caseTitle: '甲案',
      packBinding: ['legal'],
      availablePackageIds: AVAILABLE,
      packCatalog: CATALOG,
      onClose: vi.fn(),
      onApply: vi.fn(),
    }));
    expect(host.querySelector('[data-testid="matter-pack-dialog"]')).not.toBeNull();
    expect(host.textContent).toContain('已加载：法律包');
    expect(host.querySelector('[data-testid="matter-pack-option-none"]')).not.toBeNull();
    expect(host.querySelector('[data-testid="matter-pack-option-legal"]')).not.toBeNull();
    // ADR-015 决定三 2026-08-08：catalog-only 包不得作为普通「加载」选项出现（PM 无场景无 prompt，
    // 渲染成可加载项即以 UI 承诺一件不存在的能力）。
    expect(host.querySelector('[data-testid="matter-pack-option-pm"]')).toBeNull();
    expect(host.textContent).not.toContain('加载产品管理包');
  });

  it('当前绑定为默认选中；卸载（选不加载）保存为 []', () => {
    const onApply = vi.fn();
    const host = render(createElement(MatterPackDialog, {
      open: true,
      caseTitle: '甲案',
      packBinding: ['legal'],
      availablePackageIds: AVAILABLE,
      packCatalog: CATALOG,
      onClose: vi.fn(),
      onApply,
    }));
    const legal = host.querySelector<HTMLInputElement>('[data-testid="matter-pack-option-legal"]')!;
    expect(legal.checked).toBe(true);

    act(() => { host.querySelector<HTMLInputElement>('[data-testid="matter-pack-option-none"]')!.click(); });
    act(() => host.querySelector<HTMLButtonElement>('[data-testid="matter-pack-apply"]')!.click());
    expect(onApply).toHaveBeenLastCalledWith([]);
  });

  it('未加载态呈现「未加载垂类包」；选包保存为单枚绑定', () => {
    const onApply = vi.fn();
    const host = render(createElement(MatterPackDialog, {
      open: true,
      caseTitle: '乙案',
      packBinding: [],
      availablePackageIds: AVAILABLE,
      packCatalog: CATALOG,
      onClose: vi.fn(),
      onApply,
    }));
    expect(host.textContent).toContain('未加载垂类包');
    act(() => { host.querySelector<HTMLInputElement>('[data-testid="matter-pack-option-legal"]')!.click(); });
    act(() => host.querySelector<HTMLButtonElement>('[data-testid="matter-pack-apply"]')!.click());
    expect(onApply).toHaveBeenLastCalledWith(['legal']);
  });

  /**
   * ADR-015 决定三 2026-08-08：历史 `packBinding:['pm']` 不迁移、不清空、不判未准入——
   * 诚实显示「已绑定：产品管理包 · 仅目录与既有产物可用」，用户可保持、可清绑、可改绑 Legal，
   * 但不可新选 PM。默认选中「保持」，避免一次无意的保存把既有绑定悄悄清掉。
   */
  it('历史绑定 catalog-only 包：诚实显示且可保持/清绑/改绑 Legal，不可新选 PM', () => {
    const onApply = vi.fn();
    const host = render(createElement(MatterPackDialog, {
      open: true,
      caseTitle: '戊案',
      packBinding: ['pm'],
      availablePackageIds: AVAILABLE,
      packCatalog: CATALOG,
      onClose: vi.fn(),
      onApply,
    }));
    const stateLine = host.querySelector('[data-testid="matter-pack-state"]');
    expect(stateLine?.textContent).toContain('已绑定：产品管理包 · 仅目录与既有产物可用');
    expect(stateLine?.textContent).not.toContain('已加载');
    // 不判未准入：不得出现失效告警。
    expect(host.querySelector('[data-testid="matter-pack-invalid"]')).toBeNull();
    // 无「加载产品管理包」这一普通选项；保持当前绑定是默认选中项。
    expect(host.querySelector('[data-testid="matter-pack-option-pm"]')).toBeNull();
    const keep = host.querySelector<HTMLInputElement>('[data-testid="matter-pack-option-keep"]')!;
    expect(keep.checked).toBe(true);
    act(() => host.querySelector<HTMLButtonElement>('[data-testid="matter-pack-apply"]')!.click());
    expect(onApply).toHaveBeenLastCalledWith(['pm']);

    act(() => { host.querySelector<HTMLInputElement>('[data-testid="matter-pack-option-none"]')!.click(); });
    act(() => host.querySelector<HTMLButtonElement>('[data-testid="matter-pack-apply"]')!.click());
    expect(onApply).toHaveBeenLastCalledWith([]);
  });

  it('绑定失效态显式标注（当前绑定不在可用集），保存清绑即恢复', () => {
    const onApply = vi.fn();
    const host = render(createElement(MatterPackDialog, {
      open: true,
      caseTitle: '丙案',
      packBinding: ['tender'],
      availablePackageIds: AVAILABLE,
      packCatalog: CATALOG,
      onClose: vi.fn(),
      onApply,
    }));
    const warning = host.querySelector('[data-testid="matter-pack-invalid"]');
    expect(warning).not.toBeNull();
    expect(warning?.textContent).toContain('tender');
    expect(warning?.getAttribute('role')).toBe('alert');
    // 宿主目录缺条目 → 状态行禁裸 id 伪装正常态（不得出现「已加载：tender」）。
    const stateLine = host.querySelector('[data-testid="matter-pack-state"]');
    expect(stateLine?.textContent).toContain('绑定不可用');
    expect(stateLine?.textContent).toContain('tender · 本版本不可用');
    expect(stateLine?.textContent).not.toContain('已加载');
    // 失效绑定不在可用集内，单选落到「不加载」；保存即清绑
    act(() => host.querySelector<HTMLButtonElement>('[data-testid="matter-pack-apply"]')!.click());
    expect(onApply).toHaveBeenLastCalledWith([]);
  });

  it('未声明态显式说明（跟随全部可用包），保存后按选择固定', () => {
    const host = render(createElement(MatterPackDialog, {
      open: true,
      caseTitle: '丁案',
      packBinding: undefined,
      availablePackageIds: AVAILABLE,
      packCatalog: CATALOG,
      onClose: vi.fn(),
      onApply: vi.fn(),
    }));
    expect(host.textContent).toContain('已加载：法律包、产品管理包');
    const note = host.querySelector('[data-testid="matter-pack-undeclared"]');
    expect(note).not.toBeNull();
    expect(note?.textContent).toContain('跟随全部可用包');
    // 未声明态单选不预选任何包（落「不加载」），保存即显式固定为 []。
    const none = host.querySelector<HTMLInputElement>('[data-testid="matter-pack-option-none"]')!;
    expect(none.checked).toBe(true);
  });
});
