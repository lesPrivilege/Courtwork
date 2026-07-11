import { useEffect, useState } from 'react';
import { credentialClient, type CredentialSource, type CredentialStatus } from './client';
import { providerConnectionClient } from '../provider/connection-client';
import {
  effectiveBaseUrl, modelOptions, PROVIDER_OPTIONS, type ModelConfig, type ProviderId, withProvider,
} from '../provider/model-config';

interface ProviderSetupProps {
  open: boolean;
  allowSkip: boolean;
  modelConfig: ModelConfig;
  onModelConfigChange: (next: ModelConfig) => void;
  onClose: () => void;
  onStatusChange: (status: CredentialStatus) => void;
  onSkip?: () => void;
}

export function ProviderSetup({
  open, allowSkip, modelConfig, onModelConfigChange, onClose, onStatusChange, onSkip,
}: ProviderSetupProps) {
  const [source, setSource] = useState<CredentialSource>('pasted');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) { setValue(''); setMessage(''); }
  }, [open]);
  if (!open) return null;

  const validate = async () => {
    setSaving(true);
    setMessage('');
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
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return <div className="modal-backdrop provider-backdrop" role="presentation">
    <section className="provider-dialog" role="dialog" aria-modal="true" aria-labelledby="provider-title" data-testid="provider-setup">
      <header><span className="setup-step">首次使用</span><h2 id="provider-title">连接文书助手</h2><p>选择服务商并用一次最小真实请求验证；凭证只进入电脑安全凭证库。</p></header>

      <label className="credential-field"><span>服务商</span>
        <select data-testid="provider-setup-provider" value={modelConfig.providerId} onChange={(event) => onModelConfigChange(withProvider(modelConfig, event.target.value as ProviderId))}>
          {PROVIDER_OPTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {modelConfig.providerId === 'custom' && <label className="credential-field"><span>Base URL</span>
        <input data-testid="provider-setup-base-url" type="url" value={modelConfig.baseUrl ?? ''} onChange={(event) => onModelConfigChange({ ...modelConfig, baseUrl: event.target.value })} placeholder="https://example.com/v1" />
      </label>}
      {modelConfig.providerId !== 'custom' && <p className="provider-preset-url" data-testid="provider-preset-url">{effectiveBaseUrl(modelConfig)}</p>}

      <div className="credential-modes" role="tablist" aria-label="授权方式">
        <button role="tab" aria-selected={source === 'pasted'} className={source === 'pasted' ? 'active' : ''} onClick={() => { setSource('pasted'); setValue(''); setMessage(''); }}>粘贴访问凭证</button>
        <button role="tab" aria-selected={source === 'environment'} className={source === 'environment' ? 'active' : ''} onClick={() => { setSource('environment'); setValue(''); setMessage(''); }}>使用电脑已有凭证</button>
      </div>
      <label className="credential-field"><span>{source === 'pasted' ? '访问凭证' : '凭证名称'}</span>
        <input type={source === 'pasted' ? 'password' : 'text'} value={value} onChange={(event) => setValue(event.target.value)} autoComplete="off" spellCheck={false} aria-label={source === 'pasted' ? '访问凭证' : '电脑中的凭证名称'} placeholder={source === 'pasted' ? '粘贴后将始终以圆点显示' : '例如：COURTWORK_ACCESS'} />
      </label>
      <label className="credential-field"><span>模型名</span>
        <input data-testid="provider-setup-model" list="provider-model-options" value={modelConfig.modelId} onChange={(event) => onModelConfigChange({ ...modelConfig, modelId: event.target.value })} />
        <datalist id="provider-model-options">{modelOptions(modelConfig).map((id) => <option key={id} value={id} />)}</datalist>
      </label>
      <div className="security-note" data-testid="provider-security-note"><span aria-hidden="true">⌑</span><p>凭证只保存到电脑的安全凭证库；Courtwork 不会查找其他应用的设置。连接状态只以真实请求成功为准，读取到钥匙串不代表服务可用。</p></div>
      {message && <p className="form-message" role="alert" data-testid="provider-setup-error">{message}</p>}
      <footer>
        {allowSkip && <button className="quiet-button" data-testid="provider-skip" onClick={onSkip ?? onClose}>先查看演示</button>}
        {!allowSkip && <button className="quiet-button" onClick={onClose}>取消</button>}
        <button className="primary-button" onClick={() => void validate()} disabled={saving}>{saving ? '正在验证…' : '验证连接'}</button>
      </footer>
    </section>
  </div>;
}
