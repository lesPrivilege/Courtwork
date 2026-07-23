import { useState } from 'react';
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
 * 降级只在**本地 UI 与返回值**显式（票面 #5）：配置 state 仍是剥离标记后的纯值；
 * 唯一 session-local notice 留在本 hook，直到成功保存才清除，不入持久化、不外传 provider。
 */
export const MODEL_CONFIG_RESET_NOTICE = '模型配置已重置为默认';
export const MODEL_CONFIG_SAVE_NOTICE = '模型配置未能保存；本次会话仍使用当前选择，重新打开应用后可能恢复为先前配置';

export type ModelConfigNotice =
  | { kind: 'reset_to_default'; message: typeof MODEL_CONFIG_RESET_NOTICE }
  | { kind: 'save_not_persisted'; message: typeof MODEL_CONFIG_SAVE_NOTICE };

export interface UseModelConfigResult {
  config: ModelConfig;
  /** 用户改配置：落盘 + 连接态失效判定（判定结果经 onConnectionInvalidated 回调告知宿主）。 */
  update: (next: ModelConfig) => void;
  notice: ModelConfigNotice | null;
  open: boolean;
  setOpen: (next: boolean | ((current: boolean) => boolean)) => void;
}

export function useModelConfig(deps: {
  onConnectionInvalidated: () => void;
}): UseModelConfigResult {
  const [initial] = useState(loadModelConfig);
  const [config, setConfig] = useState<ModelConfig>(() => stripDegradation(initial));
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState<ModelConfigNotice | null>(() => (
    isUserVisibleDegradation(initial.degradation)
      ? { kind: 'reset_to_default', message: MODEL_CONFIG_RESET_NOTICE }
      : null
  ));

  const update = (next: ModelConfig) => {
    const connectionChanged = next.providerId !== config.providerId
      || next.modelId !== config.modelId
      || next.reasoning !== config.reasoning;
    setConfig(next);
    const saveResult = saveModelConfig(next);
    setNotice(saveResult.persisted
      ? null
      : { kind: 'save_not_persisted', message: MODEL_CONFIG_SAVE_NOTICE });
    if (connectionChanged) deps.onConnectionInvalidated();
  };

  return { config, update, notice, open, setOpen };
}
