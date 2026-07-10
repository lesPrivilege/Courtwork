import { useEffect, useState } from 'react';
import {
  connectionLabel,
  credentialClient,
  type CredentialSource,
  type CredentialStatus,
} from './client';

interface ProviderSetupProps {
  open: boolean;
  allowSkip: boolean;
  onClose: () => void;
  onStatusChange: (status: CredentialStatus) => void;
}

export function ProviderSetup({ open, allowSkip, onClose, onStatusChange }: ProviderSetupProps) {
  const [source, setSource] = useState<CredentialSource>('pasted');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) {
      setValue('');
      setMessage('');
    }
  }, [open]);

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    setMessage('');
    try {
      const status = await credentialClient.save(source, value);
      // 探针结果驱动：失败态不关闭、不乐观已连接
      onStatusChange(status);
      if (status.phase === 'connected') {
        setValue('');
        onClose();
        return;
      }
      setMessage(status.failureMessage ?? '暂时无法完成连接，请检查后重试');
    } catch {
      const failed: CredentialStatus = {
        phase: 'failed',
        source,
        failureMessage: '钥匙串授权未通过，请重试或重新填写',
      };
      onStatusChange(failed);
      setMessage(failed.failureMessage!);
    } finally {
      setSaving(false);
    }
  };

  return <div className="modal-backdrop provider-backdrop" role="presentation">
    <section className="provider-dialog" role="dialog" aria-modal="true" aria-labelledby="provider-title" data-testid="provider-setup">
      <header>
        <span className="setup-step">首次使用</span>
        <h2 id="provider-title">连接文书助手</h2>
        <p>为了在本机完成分析与起草，请选择一种明确授权方式。</p>
      </header>
      <div className="credential-modes" role="tablist" aria-label="授权方式">
        <button role="tab" aria-selected={source === 'pasted'} className={source === 'pasted' ? 'active' : ''} onClick={() => { setSource('pasted'); setValue(''); setMessage(''); }}>粘贴访问凭证</button>
        <button role="tab" aria-selected={source === 'environment'} className={source === 'environment' ? 'active' : ''} onClick={() => { setSource('environment'); setValue(''); setMessage(''); }}>使用电脑已有凭证</button>
      </div>
      <label className="credential-field">
        <span>{source === 'pasted' ? '访问凭证' : '凭证名称'}</span>
        <input
          type={source === 'pasted' ? 'password' : 'text'}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label={source === 'pasted' ? '访问凭证' : '电脑中的凭证名称'}
          placeholder={source === 'pasted' ? '粘贴后将始终以圆点显示' : '例如：COURTWORK_ACCESS'}
        />
      </label>
      <div className="security-note">
        <span aria-hidden="true">⌑</span>
        <p>粘贴的内容只保存到电脑的安全凭证库，不写入案件记录、运行记录或使用统计。Courtwork 不会查找其他应用的设置。</p>
      </div>
      {message && <p className="form-message" role="alert" data-testid="provider-setup-error">{message}</p>}
      <footer>
        {allowSkip && <button className="quiet-button" onClick={onClose}>先查看演示</button>}
        {!allowSkip && <button className="quiet-button" onClick={onClose}>取消</button>}
        <button className="primary-button" onClick={() => void save()} disabled={saving}>{saving ? '正在安全保存…' : '完成连接'}</button>
      </footer>
    </section>
  </div>;
}

export { connectionLabel };
