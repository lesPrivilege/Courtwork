/**
 * 凭证表单共用件（#43/#44）：引导卡（ProviderSetup dialog）与设置页（embedded）同源。
 * 五裁④（2026-07-12）：文案统一英文（第八章 chrome 律执行到底,信任声明句英译）;F4 分型/恢复指引词表归宿另裁未动。
 * #44 契约：验证全程宿主稳定在场——成功不自动关闭，结果就地呈现
 * （connected 绿徽/失败分型文案）；关闭动作永远由用户显式触发。
 */

import { useState } from 'react';
import { credentialClient, type CredentialSource, type CredentialStatus } from './client';
import { providerConnectionClient } from '../provider/connection-client';
import {
  effectiveBaseUrl, modelOptions, PROVIDER_OPTIONS, type ModelConfig, type ProviderId, withProvider,
} from '../provider/model-config';

export interface CredentialFormProps {
  variant: 'dialog' | 'embedded';
  modelConfig: ModelConfig;
  onModelConfigChange: (next: ModelConfig) => void;
  onStatusChange: (status: CredentialStatus) => void;
  /** 验证成功后的回调（宿主据此切换页脚动作等），不得用于自动关闭浮层。 */
  onValidated?: () => void;
}

export function CredentialForm({
  variant, modelConfig, onModelConfigChange, onStatusChange, onValidated,
}: CredentialFormProps) {
  const [source, setSource] = useState<CredentialSource>('pasted');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [verified, setVerified] = useState(false);

  const idPrefix = variant === 'dialog' ? 'provider-setup' : 'settings-credential';

  const validate = async () => {
    setSaving(true);
    setMessage('');
    setVerified(false);
    try {
      const stored = await credentialClient.save(source, value);
      if (stored.phase !== 'connected') {
        onStatusChange(stored);
        setMessage(stored.failureMessage ?? 'Couldn\u2019t save the credential. Check and retry.');
        return;
      }
      const result = await providerConnectionClient.validate(modelConfig);
      onStatusChange(result as CredentialStatus);
      if (result.phase !== 'connected') {
        setMessage(result.failureMessage ?? 'Couldn\u2019t complete the connection. Check and retry.');
        return;
      }
      if (result.models?.length) {
        const next = { ...modelConfig, discoveredModels: result.models };
        if (!result.models.includes(next.modelId)) next.modelId = result.models[0]!;
        onModelConfigChange(next);
      } else if (result.modelDiscovery === 'unsupported') {
        setMessage('Provider returned no model list; recommended and manual entries remain. Connection unaffected.');
      }
      setValue('');
      setVerified(true);
      onValidated?.();
    } catch (error: unknown) {
      // 异常路径也必须有反馈（真机反馈"key 配置没有反馈"的跨版本洞）：
      // invoke/IPC 异常不落 status 三态,此处诚实呈现,绝不静默吞掉
      setMessage(error instanceof Error ? error.message : typeof error === 'string' ? error : 'Couldn\u2019t complete verification. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="credential-form" data-testid={`${idPrefix}-form`}>
    <label className="credential-field"><span>Provider</span>
      <select data-testid={`${idPrefix}-provider`} value={modelConfig.providerId} onChange={(event) => onModelConfigChange(withProvider(modelConfig, event.target.value as ProviderId))}>
        {PROVIDER_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    {modelConfig.providerId === 'custom' && <label className="credential-field"><span>Base URL</span>
      <input data-testid={`${idPrefix}-base-url`} type="url" value={modelConfig.baseUrl ?? ''} onChange={(event) => onModelConfigChange({ ...modelConfig, baseUrl: event.target.value })} placeholder="https://example.com/v1" />
    </label>}
    {/* 兼容既有 e2e：dialog 变体保留 FIX-KC-1 时代的 provider-preset-url 名 */}
    {modelConfig.providerId !== 'custom' && <p className="provider-preset-url" data-testid={variant === 'dialog' ? 'provider-preset-url' : `${idPrefix}-preset-url`}>{effectiveBaseUrl(modelConfig)}</p>}

    <div className="credential-modes" role="tablist" aria-label="Authorization method">
      <button type="button" role="tab" aria-selected={source === 'pasted'} className={source === 'pasted' ? 'active' : ''} onClick={() => { setSource('pasted'); setValue(''); setMessage(''); }}>Paste a credential</button>
      <button type="button" role="tab" aria-selected={source === 'environment'} className={source === 'environment' ? 'active' : ''} onClick={() => { setSource('environment'); setValue(''); setMessage(''); }}>Use existing credential</button>
    </div>
    <label className="credential-field"><span>{source === 'pasted' ? 'Access credential' : 'Credential name'}</span>
      <input type={source === 'pasted' ? 'password' : 'text'} value={value} onChange={(event) => setValue(event.target.value)} autoComplete="off" spellCheck={false} aria-label={source === 'pasted' ? 'Access credential' : 'Credential name on this Mac'} placeholder={source === 'pasted' ? 'Always displayed as dots once pasted' : 'e.g. COURTWORK_ACCESS'} />
    </label>
    <label className="credential-field"><span>Model</span>
      <input data-testid={`${idPrefix}-model`} list={`${idPrefix}-model-options`} value={modelConfig.modelId} onChange={(event) => onModelConfigChange({ ...modelConfig, modelId: event.target.value })} />
      <datalist id={`${idPrefix}-model-options`}>{modelOptions(modelConfig).map((id) => <option key={id} value={id} />)}</datalist>
    </label>
    {message && <p className="form-message" role="alert" data-testid={`${idPrefix}-error`}>{message}</p>}
    {verified && <p className="form-success" role="status" data-testid={`${idPrefix}-verified`}>Connected: verified by a minimal real request.</p>}
    <div className="credential-form-actions">
      <button type="button" className="primary-button" data-testid={`${idPrefix}-validate`} onClick={() => void validate()} disabled={saving}>
        {saving ? 'Verifying\u2026' : 'Verify connection'}
      </button>
    </div>
  </div>;
}
