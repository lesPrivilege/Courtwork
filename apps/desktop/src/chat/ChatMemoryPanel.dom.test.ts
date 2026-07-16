// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatMemoryPanel } from './ChatMemoryPanel';
import { MEMORY_SCHEMA_VERSION, MEMORY_STORAGE_KEY, type MemoryBackend } from './chat-memory';

/**
 * CHAT-MEMORY-1（ADR-013 §2 用户面）：设置页仅「查看 + 一键清除」，不提供编辑/分条管理/导入导出。
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

function backendWith(seed?: string): MemoryBackend & { map: Map<string, string> } {
  const map = new Map<string, string>();
  if (seed !== undefined) map.set(MEMORY_STORAGE_KEY, seed);
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => void map.set(k, v) };
}

const seeded = () =>
  JSON.stringify({
    version: MEMORY_SCHEMA_VERSION,
    entries: [
      { id: 'preference:简短回答', kind: 'preference', text: '简短回答', source: { sessionId: 's1', turnId: 't1' }, createdAt: 1 },
      { id: 'entity:李明', kind: 'entity', text: '李明', source: { sessionId: 's1', turnId: 't2' }, createdAt: 2 },
    ],
  });

/** 编辑性/管理性控件不得存在（只允许查看 + 清除）。 */
function assertNoEditControls(host: HTMLElement) {
  expect(host.querySelector('input, textarea, select')).toBeNull();
  for (const key of ['settings-memory-edit', 'settings-memory-add', 'settings-memory-export', 'settings-memory-import']) {
    expect(host.querySelector(`[data-testid="${key}"]`)).toBeNull();
  }
}

describe('ChatMemoryPanel：查看 + 一键清除', () => {
  it('渲染记忆列表（含来源坐标），无编辑/管理控件', () => {
    const host = render(createElement(ChatMemoryPanel, { backend: backendWith(seeded()) }));
    const items = [...host.querySelectorAll('[data-testid="settings-memory-item"]')];
    expect(items).toHaveLength(2);
    expect(host.textContent).toContain('简短回答');
    expect(host.textContent).toContain('李明');
    // 每条携来源坐标（可追溯）
    const source = host.querySelector('[data-testid="settings-memory-source"]');
    expect(source?.textContent).toContain('t1');
    assertNoEditControls(host);
  });

  it('一键清除：点击后列表清空、写回干净 v1 空信封、示空态', () => {
    const backend = backendWith(seeded());
    const onFeedback = vi.fn();
    const host = render(createElement(ChatMemoryPanel, { backend, onFeedback }));
    expect(host.querySelectorAll('[data-testid="settings-memory-item"]')).toHaveLength(2);
    const clear = host.querySelector<HTMLButtonElement>('[data-testid="settings-memory-clear"]');
    act(() => clear?.click());
    // 清除后 UI 示空态，无残留条目（残留即触红）
    expect(host.querySelectorAll('[data-testid="settings-memory-item"]')).toHaveLength(0);
    expect(host.querySelector('[data-testid="settings-memory-empty"]')).not.toBeNull();
    // 底层写回干净 v1 空信封
    expect(backend.map.get(MEMORY_STORAGE_KEY)).toBe(JSON.stringify({ version: MEMORY_SCHEMA_VERSION, entries: [] }));
    expect(onFeedback).toHaveBeenCalledWith(expect.any(String), true);
  });

  it('空记忆：示空态，清除按钮禁用', () => {
    const host = render(createElement(ChatMemoryPanel, { backend: backendWith() }));
    expect(host.querySelector('[data-testid="settings-memory-empty"]')).not.toBeNull();
    const clear = host.querySelector<HTMLButtonElement>('[data-testid="settings-memory-clear"]');
    expect(clear?.disabled).toBe(true);
    assertNoEditControls(host);
  });

  it('未知版本：显式示不可读（不静默空），清除按钮可用以重置', () => {
    const backend = backendWith(JSON.stringify({ version: 99, entries: [] }));
    const host = render(createElement(ChatMemoryPanel, { backend }));
    expect(host.querySelector('[data-testid="settings-memory-unreadable"]')).not.toBeNull();
    const clear = host.querySelector<HTMLButtonElement>('[data-testid="settings-memory-clear"]');
    expect(clear?.disabled).toBe(false);
    act(() => clear?.click());
    expect(host.querySelector('[data-testid="settings-memory-empty"]')).not.toBeNull();
    expect(backend.map.get(MEMORY_STORAGE_KEY)).toBe(JSON.stringify({ version: MEMORY_SCHEMA_VERSION, entries: [] }));
  });
});
