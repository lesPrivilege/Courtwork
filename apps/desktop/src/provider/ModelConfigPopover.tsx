import {
  modelDisplayName,
  modelOptions,
  REASONING_OPTIONS,
  reasoningRequest,
  type ModelConfig,
  type ReasoningLevel,
} from './model-config';

interface ModelConfigPopoverProps {
  open: boolean;
  config: ModelConfig;
  onChange: (next: ModelConfig) => void;
  onClose: () => void;
}

/**
 * 状态条模型名可点 → popover：provider / 模型 / 推理强度（标准·深思）。
 * 全部读写 model-config；无假活开关（docs/design/principles.md ①）。
 */
export function ModelConfigPopover({ open, config, onChange, onClose }: ModelConfigPopoverProps) {
  if (!open) return null;

  return (
    <div
      className="model-config-popover"
      role="dialog"
      aria-label="Model and reasoning"
      data-testid="model-config-popover"
    >
      <strong>Model</strong>
      {/* 五裁⑤（既裁执行,遵 27d9b2b）：chip 弹层撤 Provider 字段——provider 归 developer 层（收敛令②），
          与设置页口径一致（RELEASE-1 报的并行入口口径不一致就此消解）。 */}
      <label className="model-config-field">
        <span>Model</span>
        <input
          data-testid="model-config-model"
          list="model-config-model-options"
          value={config.modelId}
          onChange={(event) => onChange({ ...config, modelId: event.target.value })}
        />
        <datalist id="model-config-model-options">{modelOptions(config).map((id) => <option key={id} value={id} />)}</datalist>
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
      {/* #40 允许覆盖禁止静默：声明路由若改写所选模型，就地明示实际生效值 */}
      {reasoningRequest(config).model !== config.modelId && (
        <p className="model-config-wire-note" role="status" data-testid="model-config-wire-note">
          实际请求模型：{reasoningRequest(config).model}（由推理档位声明决定）
        </p>
      )}
      <div className="model-config-actions">
        {/* docs/design/principles.md：关闭=取消/收起，动词直白；quiet 次要层级（docs/design 主次按钮） */}
        <button type="button" className="quiet-button" onClick={onClose} data-testid="model-config-close">
          Close
        </button>
      </div>
    </div>
  );
}
