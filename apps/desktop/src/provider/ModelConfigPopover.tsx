import {
  modelDisplayName,
  PROVIDER_OPTIONS,
  REASONING_OPTIONS,
  type ModelConfig,
  type ProviderId,
  type ReasoningLevel,
  withProvider,
} from './model-config';

interface ModelConfigPopoverProps {
  open: boolean;
  config: ModelConfig;
  onChange: (next: ModelConfig) => void;
  onClose: () => void;
}

/**
 * 状态条模型名可点 → popover：provider / 模型 / 推理强度（标准·深思）。
 * 全部读写 model-config；无假活开关（docs/52 #10 ①）。
 */
export function ModelConfigPopover({ open, config, onChange, onClose }: ModelConfigPopoverProps) {
  if (!open) return null;

  const provider = PROVIDER_OPTIONS.find((item) => item.id === config.providerId) ?? PROVIDER_OPTIONS[0]!;

  return (
    <div
      className="model-config-popover"
      role="dialog"
      aria-label="Model and reasoning"
      data-testid="model-config-popover"
    >
      <strong>Model</strong>
      <label className="model-config-field">
        <span>Provider</span>
        <select
          data-testid="model-config-provider"
          value={config.providerId}
          onChange={(event) => onChange(withProvider(config, event.target.value as ProviderId))}
        >
          {PROVIDER_OPTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="model-config-field">
        <span>Model</span>
        <select
          data-testid="model-config-model"
          value={config.modelId}
          onChange={(event) => onChange({ ...config, modelId: event.target.value })}
        >
          {provider.models.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="model-config-reasoning" data-testid="model-config-reasoning">
        <legend>Reasoning</legend>
        {REASONING_OPTIONS.map((item) => (
          <label key={item.id} className="model-config-radio">
            <input
              type="radio"
              name="reasoning-level"
              value={item.id}
              checked={config.reasoning === item.id}
              onChange={() => onChange({ ...config, reasoning: item.id as ReasoningLevel })}
            />
            <span>{item.id === 'deep' ? 'Deep' : 'Standard'}</span>
          </label>
        ))}
      </fieldset>
      <p className="model-config-summary" data-testid="model-config-summary">
        Current: {modelDisplayName(config)} · {config.reasoning === 'deep' ? 'Deep' : 'Standard'}
      </p>
      <div className="model-config-actions">
        {/* docs/52 #16：关闭=取消/收起，动词直白；quiet 次要层级（docs/32 主次按钮） */}
        <button type="button" className="quiet-button" onClick={onClose} data-testid="model-config-close">
          Close
        </button>
      </div>
    </div>
  );
}
