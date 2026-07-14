// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { ProcessTrace } from './ProcessTrace';

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

describe('ProcessTrace state transition', () => {
  it('hard-cuts the running indicator and exposes a keyboard-native settled anchor', () => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    act(() => root?.render(createElement(ProcessTrace, {
      view: { mode: 'reasoning', state: 'running', content: '流式片段' },
    })));
    expect(container.querySelector('[data-state="running"] .brand-thinking')).not.toBeNull();
    expect(container.querySelector('[data-testid="process-trace-body"]')?.textContent).toContain('流式片段');

    act(() => root?.render(createElement(ProcessTrace, {
      view: { mode: 'reasoning', state: 'settled', content: '完整推理' },
    })));
    expect(container.querySelector('.brand-thinking')).toBeNull();
    const toggle = container.querySelector<HTMLButtonElement>('[data-testid="process-trace-toggle"]');
    expect(toggle?.tagName).toBe('BUTTON');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');

    act(() => toggle?.click());
    expect(toggle?.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('[data-testid="process-trace-body"]')?.textContent).toContain('完整推理');

    act(() => root?.render(createElement(ProcessTrace, {
      view: { mode: 'reasoning', state: 'empty' },
    })));
    act(() => root?.render(createElement(ProcessTrace, {
      view: { mode: 'reasoning', state: 'settled', content: '下一轮推理' },
    })));
    expect(container.querySelector('[data-testid="process-trace-toggle"]')?.getAttribute('aria-expanded')).toBe('false');
  });
});
