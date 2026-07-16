// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewCaseDialog } from './NewCaseDialog';
import type { AuthorizeResult, HostAuthReason } from '../host/host-auth-port';

/**
 * CASE-ROOT-1：新建案件的文件夹绑定改经宿主原生 picker（hostAuth port）；
 * `webkitdirectory` 退役；四类失败逐一可见；重选文件夹显式换 grant，旧 ref 不被引用。
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

function typeInto(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

const granted = (grantId: string, label: string): AuthorizeResult => ({
  status: 'granted',
  grant: { grantId, label },
});

describe('NewCaseDialog：宿主 picker 绑定案件根', () => {
  it('生产入口零 webkitdirectory / file input', () => {
    const host = render(createElement(NewCaseDialog, {
      open: true,
      onClose: vi.fn(),
      onCreate: vi.fn(),
      onAuthorizeFolder: vi.fn().mockResolvedValue(granted('g', 'l')),
    }));
    expect(host.querySelector('input[type="file"]')).toBeNull();
    expect(host.innerHTML.includes('webkitdirectory')).toBe(false);
  });

  it('授权成功 → 绑定 grantId+label，预填名称，创建携 opaque 引用（无绝对路径）', async () => {
    const onCreate = vi.fn();
    const onAuthorizeFolder = vi.fn().mockResolvedValue(granted('grant-临江', '临江精铸'));
    const host = render(createElement(NewCaseDialog, { open: true, onClose: vi.fn(), onCreate, onAuthorizeFolder }));

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="new-case-authorize"]')!.click();
    });

    const bound = host.querySelector('[data-testid="new-case-folder-label"]');
    expect(bound).not.toBeNull();
    expect(bound?.getAttribute('data-grant-id')).toBe('grant-临江');
    expect(bound?.getAttribute('data-label')).toBe('临江精铸');
    // 名称建议 = 文件夹 label
    const nameInput = host.querySelector<HTMLInputElement>('input[aria-label="案件名称"]')!;
    expect(nameInput.value).toBe('临江精铸');

    act(() => host.querySelector<HTMLButtonElement>('.primary-button')!.click());
    expect(onCreate).toHaveBeenCalledWith({ title: '临江精铸', grantId: 'grant-临江', label: '临江精铸' });
    // 传出内容不含任何绝对路径
    expect(JSON.stringify(onCreate.mock.calls[0][0])).not.toContain('/');
  });

  it('四类授权失败逐一结构化可见，停留在选择步（不误入命名）', async () => {
    for (const reason of ['denied', 'revoked', 'unavailable', 'out_of_scope'] as HostAuthReason[]) {
      const onAuthorizeFolder = vi
        .fn()
        .mockResolvedValue({ status: 'failed', reason } as AuthorizeResult);
      const host = render(createElement(NewCaseDialog, {
        open: true,
        onClose: vi.fn(),
        onCreate: vi.fn(),
        onAuthorizeFolder,
      }));
      await act(async () => {
        host.querySelector<HTMLButtonElement>('[data-testid="new-case-authorize"]')!.click();
      });
      const failure = host.querySelector('[data-testid="new-case-auth-failure"]');
      expect(failure).not.toBeNull();
      expect(failure?.getAttribute('data-reason')).toBe(reason);
      expect(failure?.getAttribute('role')).toBe('alert');
      // 失败不推进：仍在选择步，命名输入未出现
      expect(host.querySelector('input[aria-label="案件名称"]')).toBeNull();
      act(() => root?.unmount());
      container?.remove();
      root = undefined;
      container = undefined;
    }
  });

  it('重授权：重选文件夹显式换新 grant，旧 ref 不再被创建引用', async () => {
    const onCreate = vi.fn();
    const onAuthorizeFolder = vi
      .fn()
      .mockResolvedValueOnce(granted('grant-old', '旧文件夹'))
      .mockResolvedValueOnce(granted('grant-new', '新文件夹'));
    const host = render(createElement(NewCaseDialog, { open: true, onClose: vi.fn(), onCreate, onAuthorizeFolder }));

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="new-case-authorize"]')!.click();
    });
    expect(host.querySelector('[data-testid="new-case-folder-label"]')?.getAttribute('data-grant-id')).toBe('grant-old');

    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="new-case-reauthorize"]')!.click();
    });
    expect(host.querySelector('[data-testid="new-case-folder-label"]')?.getAttribute('data-grant-id')).toBe('grant-new');

    act(() => host.querySelector<HTMLButtonElement>('.primary-button')!.click());
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0].grantId).toBe('grant-new');
  });

  it('不使用文件夹直接命名 → 创建为未绑定案件（无 grantId）', () => {
    const onCreate = vi.fn();
    const host = render(createElement(NewCaseDialog, {
      open: true,
      onClose: vi.fn(),
      onCreate,
      onAuthorizeFolder: vi.fn(),
    }));
    act(() => host.querySelector<HTMLButtonElement>('.folder-skip-link')!.click());
    expect(host.querySelector('[data-testid="new-case-folder-label"]')).toBeNull();
    const nameInput = host.querySelector<HTMLInputElement>('input[aria-label="案件名称"]')!;
    typeInto(nameInput, '张三诉李四');
    act(() => host.querySelector<HTMLButtonElement>('.primary-button')!.click());
    expect(onCreate).toHaveBeenCalledWith({ title: '张三诉李四', grantId: undefined, label: undefined });
  });
});
