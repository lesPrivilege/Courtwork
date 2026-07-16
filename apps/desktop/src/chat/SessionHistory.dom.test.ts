// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionHistory } from './SessionHistory';
import type { TranscriptSession } from './session-transcript';

/**
 * CHAT-SESSION-1（ADR-013 §1）：UI 只呈现会话列表作为导航；不提供任何 session 管理入口
 * （重命名/归档/置顶/删除）。历史 session 只读——读态视图无 composer、无可编辑控件。
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

const AT = (h: number, m: number) => Date.parse(`2026-07-15T0${h}:0${m}:00.000Z`);

const sessionOld: TranscriptSession = {
  id: 'turn-old-1',
  startedAt: AT(8, 0),
  endedAt: AT(8, 3),
  turns: [
    { turnId: 'turn-old-1', status: 'completed', at: AT(8, 0), assistantMessage: '旧会话首答 **要点**' },
    { turnId: 'turn-old-2', status: 'failed', at: AT(8, 3), assistantMessage: '' },
  ],
};
const sessionNew: TranscriptSession = {
  id: 'turn-new-1',
  startedAt: AT(9, 0),
  endedAt: AT(9, 1),
  turns: [{ turnId: 'turn-new-1', status: 'completed', at: AT(9, 0), assistantMessage: '新会话答复内容' }],
};

const MANAGEMENT_HINTS = ['重命名', '归档', '置顶', '删除', 'rename', 'archive', 'pin', 'delete'];

function assertNoManagementControls(host: HTMLElement) {
  const buttons = [...host.querySelectorAll('button')];
  for (const button of buttons) {
    const label = `${button.textContent ?? ''} ${button.getAttribute('aria-label') ?? ''} ${button.getAttribute('data-testid') ?? ''}`.toLowerCase();
    for (const hint of MANAGEMENT_HINTS) {
      expect(label.includes(hint.toLowerCase())).toBe(false);
    }
  }
  // 也不得存在明确的管理入口 testid
  for (const key of ['session-rename', 'session-archive', 'session-pin', 'session-delete']) {
    expect(host.querySelector(`[data-testid="${key}"]`)).toBeNull();
  }
}

describe('SessionHistory：会话列表导航', () => {
  it('渲染会话列表（新→旧），无任何管理入口', () => {
    const host = render(createElement(SessionHistory, { sessions: [sessionOld, sessionNew], onClose: vi.fn() }));
    expect(host.querySelector('[data-testid="session-history"]')).not.toBeNull();
    const entries = [...host.querySelectorAll('[data-testid="session-entry"]')];
    expect(entries).toHaveLength(2);
    // 新会话排在前
    expect(entries[0].getAttribute('data-session-id')).toBe('turn-new-1');
    expect(entries[1].getAttribute('data-session-id')).toBe('turn-old-1');
    // 列表项是导航按钮
    expect(entries.every((entry) => entry.tagName === 'BUTTON')).toBe(true);
    assertNoManagementControls(host);
  });

  it('空历史显示空态，仍无管理入口', () => {
    const host = render(createElement(SessionHistory, { sessions: [], onClose: vi.fn() }));
    expect(host.querySelector('[data-testid="session-history-empty"]')).not.toBeNull();
    expect(host.querySelectorAll('[data-testid="session-entry"]')).toHaveLength(0);
    assertNoManagementControls(host);
  });

  it('journal 涂改 fail closed：显示错误文案，不渲染任何会话项', () => {
    const host = render(createElement(SessionHistory, {
      sessions: [],
      error: 'Turn journal is corrupt: invalid JSON',
      onClose: vi.fn(),
    }));
    const alert = host.querySelector('[data-testid="session-history-error"]');
    expect(alert).not.toBeNull();
    expect(alert?.getAttribute('role')).toBe('alert');
    expect(host.querySelectorAll('[data-testid="session-entry"]')).toHaveLength(0);
  });

  it('选中历史会话 → 只读 transcript：含助手正文、无 composer/可编辑控件', () => {
    const host = render(createElement(SessionHistory, { sessions: [sessionOld, sessionNew], onClose: vi.fn() }));
    const oldEntry = host.querySelector<HTMLButtonElement>('[data-session-id="turn-old-1"]');
    act(() => oldEntry?.click());

    const readonly = host.querySelector('[data-testid="session-transcript-readonly"]');
    expect(readonly).not.toBeNull();
    expect(readonly?.textContent).toContain('旧会话首答');
    // 两条 turn（含一条 failed）都进入只读记录
    expect(host.querySelectorAll('[data-testid="session-transcript-turn"]')).toHaveLength(2);
    // 只读：无输入框、无发送 composer
    expect(host.querySelector('input, textarea')).toBeNull();
    expect(host.querySelector('[data-testid="composer-input"]')).toBeNull();
    assertNoManagementControls(host);

    // 返回列表
    const back = host.querySelector<HTMLButtonElement>('[data-testid="session-transcript-back"]');
    act(() => back?.click());
    expect(host.querySelector('[data-testid="session-transcript-readonly"]')).toBeNull();
    expect(host.querySelectorAll('[data-testid="session-entry"]')).toHaveLength(2);
  });

  it('返回当前会话按钮回调 onClose', () => {
    const onClose = vi.fn();
    const host = render(createElement(SessionHistory, { sessions: [sessionNew], onClose }));
    const close = host.querySelector<HTMLButtonElement>('[data-testid="session-history-close"]');
    act(() => close?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
