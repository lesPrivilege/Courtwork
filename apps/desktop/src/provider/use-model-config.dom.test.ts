// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { __setModelConfigStoreForTests, type ConfigStore } from './model-config';
import { MODEL_CONFIG_RESET_NOTICE, useModelConfig } from './use-model-config';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  __setModelConfigStoreForTests(null);
});

function Harness({ showSystemFeedback }: { showSystemFeedback: (message: string) => void }) {
  useModelConfig({
    onConnectionInvalidated: vi.fn(),
    // App.tsx 的真实接线是 notify: showSystemFeedback；本门直接观察同一回调缝。
    notify: showSystemFeedback,
  });
  return null;
}

function renderWithStore(store: ConfigStore) {
  __setModelConfigStoreForTests(store);
  const showSystemFeedback = vi.fn();
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(createElement(Harness, { showSystemFeedback })));
  return showSystemFeedback;
}

const stored = (raw: string | null): ConfigStore => ({
  getItem: () => raw,
  setItem: vi.fn(),
});

describe('MODEL-CONFIG-EXPLICIT-1：降级经 showSystemFeedback 缝抵达 UI', () => {
  it.each([
    ['provider_invalid', JSON.stringify({ providerId: 'custom', modelId: 'x', reasoning: 'deep' })],
    ['model_invalid', JSON.stringify({ providerId: 'deepseek', modelId: '', reasoning: 'standard' })],
    ['reasoning_invalid', JSON.stringify({ providerId: 'deepseek', modelId: 'deepseek-v4-flash', reasoning: 'deep-ish' })],
    ['unreadable', '{ 这不是 JSON'],
  ])('%s 会调用一次通知通道', (_reason, raw) => {
    const showSystemFeedback = renderWithStore(stored(raw));
    expect(showSystemFeedback).toHaveBeenCalledTimes(1);
    expect(showSystemFeedback).toHaveBeenCalledWith(MODEL_CONFIG_RESET_NOTICE);
  });

  it('storage_unavailable 会调用一次通知通道', () => {
    const showSystemFeedback = renderWithStore({
      getItem: () => { throw new Error('storage blocked'); },
      setItem: () => { throw new Error('storage blocked'); },
    });
    expect(showSystemFeedback).toHaveBeenCalledTimes(1);
    expect(showSystemFeedback).toHaveBeenCalledWith(MODEL_CONFIG_RESET_NOTICE);
  });

  it('no_stored_value 单独出现时零通知，避免首次运行假警报', () => {
    const showSystemFeedback = renderWithStore(stored(null));
    expect(showSystemFeedback).not.toHaveBeenCalled();
  });
});
