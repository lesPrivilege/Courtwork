/**
 * 凭证表单共用件（#43/#44）：引导卡（ProviderSetup dialog）与设置页（embedded）同源。
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
        setMessage(stored.failureMessage ?? '暂时无法保存凭证，请检查后重试');
        return;
      }
      const result = await providerConnectionClient.validate(modelConfig);
      onStatusChange(result as CredentialStatus);
      if (result.phase !== 'connected') {
        setMessage(result.failureMessage ?? '暂时无法完成连接，请检查后重试');
        return;
      }
      if (result.models?.length) {
        const next = { ...modelConfig, discoveredModels: result.models };
        if (!result.models.includes(next.modelId)) next.modelId = result.models[0]!;
        onModelConfigChange(next);
      } else if (result.modelDiscovery === 'unsupported') {
        setMessage('服务商未提供模型列表；已保留推荐模型与手动填写，不影响连接。');
      }
      setValue('');
      setVerified(true);
      onValidated?.();
    } catch (error: unknown) {
      // 异常路径也必须有反馈（真机反馈"key 配置没有反馈"的跨版本洞）：
      // invoke/IPC 异常不落 status 三态,此处诚实呈现,绝不静默吞掉
      setMessage(error instanceof Error ? error.message : typeof error === 'string' ? error : '暂时无法完成验证，请重试');
    } finally {
      setSaving(false);
    }
  };

  return <div className="credential-form" data-testid={`${idPrefix}-form`}>
    <label className="credential-field"><span>服务商</span>
      <select data-testid={`${idPrefix}-provider`} value={modelConfig.providerId} onChange={(event) => onModelConfigChange(withProvider(modelConfig, event.target.value as ProviderId))}>
        {PROVIDER_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
      </select>
    </label>
    {modelConfig.providerId === 'custom' && <label className="credential-field"><span>Base URL</span>
      <input data-testid={`${idPrefix}-base-url`} type="url" value={modelConfig.baseUrl ?? ''} onChange={(event) => onModelConfigChange({ ...modelConfig, baseUrl: event.target.value })} placeholder="https://example.com/v1" />
    </label>}
    {/* 兼容既有 e2e：dialog 变体保留 FIX-KC-1 时代的 provider-preset-url 名 */}
    {modelConfig.providerId !== 'custom' && <p className="provider-preset-url" data-testid={variant === 'dialog' ? 'provider-preset-url' : `${idPrefix}-preset-url`}>{effectiveBaseUrl(modelConfig)}</p>}

    <div className="credential-modes" role="tablist" aria-label="授权方式">
      <button type="button" role="tab" aria-selected={source === 'pasted'} className={source === 'pasted' ? 'active' : ''} onClick={() => { setSource('pasted'); setValue(''); setMessage(''); }}>粘贴访问凭证</button>
      <button type="button" role="tab" aria-selected={source === 'environment'} className={source === 'environment' ? 'active' : ''} onClick={() => { setSource('environment'); setValue(''); setMessage(''); }}>使用电脑已有凭证</button>
    </div>
    <label className="credential-field"><span>{source === 'pasted' ? '访问凭证' : '凭证名称'}</span>
      <input type={source === 'pasted' ? 'password' : 'text'} value={value} onChange={(event) => setValue(event.target.value)} autoComplete="off" spellCheck={false} aria-label={source === 'pasted' ? '访问凭证' : '电脑中的凭证名称'} placeholder={source === 'pasted' ? '粘贴后将始终以圆点显示' : '例如：COURTWORK_ACCESS'} />
    </label>
    <label className="credential-field"><span>模型名</span>
      <input data-testid={`${idPrefix}-model`} list={`${idPrefix}-model-options`} value={modelConfig.modelId} onChange={(event) => onModelConfigChange({ ...modelConfig, modelId: event.target.value })} />
      <datalist id={`${idPrefix}-model-options`}>{modelOptions(modelConfig).map((id) => <option key={id} value={id} />)}</datalist>
    </label>
    {message && <p className="form-message" role="alert" data-testid={`${idPrefix}-error`}>{message}</p>}
    {verified && <p className="form-success" role="status" data-testid={`${idPrefix}-verified`}>已连接：最小真实请求验证通过。</p>}
    <div className="credential-form-actions">
      <button type="button" className="primary-button" data-testid={`${idPrefix}-validate`} onClick={() => void validate()} disabled={saving}>
        {saving ? '正在验证…' : '验证连接'}
      </button>
    </div>
  </div>;
}
