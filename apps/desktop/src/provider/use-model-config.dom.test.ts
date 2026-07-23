// @vitest-environment jsdom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  __setModelConfigStoreForTests,
  DEFAULT_MODEL_CONFIG,
  type ConfigStore,
} from './model-config';
import { MODEL_CONFIG_RESET_NOTICE, useModelConfig } from './use-model-config';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
let hookResult: ReturnType<typeof useModelConfig> | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  hookResult = undefined;
  __setModelConfigStoreForTests(null);
});

function Harness({ onConnectionInvalidated }: { onConnectionInvalidated: () => void }) {
  hookResult = useModelConfig({ onConnectionInvalidated });
  return null;
}

function renderWithStore(store: ConfigStore, onConnectionInvalidated = vi.fn()) {
  __setModelConfigStoreForTests(store);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(createElement(Harness, { onConnectionInvalidated })));
  return {
    current: () => {
      if (!hookResult) throw new Error('useModelConfig did not render');
      return hookResult;
    },
    onConnectionInvalidated,
  };
}

const stored = (raw: string | null): ConfigStore => ({
  getItem: () => raw,
  setItem: vi.fn(),
});

const SAVE_NOT_PERSISTED_NOTICE = '模型配置未能保存；本次会话仍使用当前选择，重新打开应用后可能恢复为先前配置';

describe('MODEL-CONFIG-EXPLICIT-1R：hook 持有唯一 session-local notice', () => {
  it.each([
    ['provider_invalid', JSON.stringify({ providerId: 'custom', modelId: 'x', reasoning: 'deep' })],
    ['model_invalid', JSON.stringify({ providerId: 'deepseek', modelId: '', reasoning: 'standard' })],
    ['reasoning_invalid', JSON.stringify({ providerId: 'deepseek', modelId: 'deepseek-v4-flash', reasoning: 'deep-ish' })],
    ['unreadable', '{ 这不是 JSON'],
  ])('%s 生成精确 reset notice', (_reason, raw) => {
    const rendered = renderWithStore(stored(raw));
    expect(rendered.current().notice).toEqual({
      kind: 'reset_to_default',
      message: MODEL_CONFIG_RESET_NOTICE,
    });
  });

  it('storage_unavailable 生成精确 reset notice', () => {
    const rendered = renderWithStore({
      getItem: () => { throw new Error('storage blocked'); },
      setItem: () => { throw new Error('storage blocked'); },
    });
    expect(rendered.current().notice).toEqual({
      kind: 'reset_to_default',
      message: MODEL_CONFIG_RESET_NOTICE,
    });
  });

  it('no_stored_value 单独出现时 notice 为 null，避免首次运行假警报', () => {
    const rendered = renderWithStore(stored(null));
    expect(rendered.current().notice).toBeNull();
  });

  it('写失败保留当前选择并切为 save notice；下一次成功保存才清除', () => {
    let raw = JSON.stringify({ ...DEFAULT_MODEL_CONFIG, reasoning: 'deep' });
    let writeBlocked = true;
    const onConnectionInvalidated = vi.fn();
    const rendered = renderWithStore({
      getItem: () => raw,
      setItem: (_key, value) => {
        if (writeBlocked) throw new Error('quota');
        raw = value;
      },
    }, onConnectionInvalidated);

    act(() => rendered.current().update({ ...DEFAULT_MODEL_CONFIG, reasoning: 'standard' }));
    expect(rendered.current().config.reasoning).toBe('standard');
    expect(rendered.current().notice).toEqual({
      kind: 'save_not_persisted',
      message: SAVE_NOT_PERSISTED_NOTICE,
    });
    expect(onConnectionInvalidated).toHaveBeenCalledTimes(1);

    writeBlocked = false;
    act(() => rendered.current().update({ ...DEFAULT_MODEL_CONFIG, reasoning: 'deep' }));
    expect(rendered.current().notice).toBeNull();
    expect(onConnectionInvalidated).toHaveBeenCalledTimes(2);
  });
});
