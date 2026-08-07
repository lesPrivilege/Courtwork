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
  { packageId: 'legal', displayName: '法律包', version: '0.1.0' },
  { packageId: 'pm', displayName: '产品管理包', version: '0.1.1' },
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
    expect(host.querySelector('[data-testid="matter-pack-option-pm"]')).not.toBeNull();
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
    act(() => { host.querySelector<HTMLInputElement>('[data-testid="matter-pack-option-pm"]')!.click(); });
    act(() => host.querySelector<HTMLButtonElement>('[data-testid="matter-pack-apply"]')!.click());
    expect(onApply).toHaveBeenLastCalledWith(['pm']);
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
