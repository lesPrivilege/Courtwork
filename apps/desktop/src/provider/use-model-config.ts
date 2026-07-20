import { useEffect, useRef, useState } from 'react';
import {
  isUserVisibleDegradation,
  loadModelConfig,
  saveModelConfig,
  stripDegradation,
  type ModelConfig,
} from './model-config';

/**
 * 模型配置状态面（MODEL-CONFIG-EXPLICIT-1「过手即拆」外提）：
 * 原先散在 `App.tsx` 的 `modelConfig` state、`modelConfigOpen` state 与 `updateModelConfig`
 * 三处，连同本票新增的降级提示，一并收进本模组。App.tsx 只留一次调用与解构。
 *
 * 降级只在**本地 UI 与返回值**显式（票面 #5）：`degradation` 不入 state、不入持久化、
 * 不外传 provider——加载时读一次、提示一次即弃。
 */
export const MODEL_CONFIG_RESET_NOTICE = '模型配置已重置为默认';

export interface UseModelConfigResult {
  config: ModelConfig;
  /** 用户改配置：落盘 + 连接态失效判定（判定结果经 onConnectionInvalidated 回调告知宿主）。 */
  update: (next: ModelConfig) => void;
  open: boolean;
  setOpen: (next: boolean | ((current: boolean) => boolean)) => void;
}

export function useModelConfig(deps: {
  onConnectionInvalidated: () => void;
  /** 复用宿主既有显式态通道（本票不新造通知系统）。 */
  notify: (message: string) => void;
}): UseModelConfigResult {
  // 初次加载单独取一次，降级标记留在 ref 里交给下方 effect 提示，不进 state。
  const initial = useRef(loadModelConfig()).current;
  const [config, setConfig] = useState<ModelConfig>(() => stripDegradation(initial));
  const [open, setOpen] = useState(false);
  const notified = useRef(false);

  useEffect(() => {
    // 一次性：同一次加载只提示一次，重渲染不重复打扰。
    if (notified.current || !isUserVisibleDegradation(initial.degradation)) return;
    notified.current = true;
    deps.notify(MODEL_CONFIG_RESET_NOTICE);
  }, [initial.degradation, deps]);

  const update = (next: ModelConfig) => {
    const connectionChanged = next.providerId !== config.providerId
      || next.modelId !== config.modelId
      || next.reasoning !== config.reasoning;
    setConfig(next);
    saveModelConfig(next);
    if (connectionChanged) deps.onConnectionInvalidated();
  };

  return { config, update, open, setOpen };
}
