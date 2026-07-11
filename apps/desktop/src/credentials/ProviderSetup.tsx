import { useEffect, useState } from 'react';
import type { CredentialStatus } from './client';
import { CredentialForm } from './CredentialForm';
import type { ModelConfig } from '../provider/model-config';

interface ProviderSetupProps {
  open: boolean;
  allowSkip: boolean;
  modelConfig: ModelConfig;
  onModelConfigChange: (next: ModelConfig) => void;
  onClose: () => void;
  onStatusChange: (status: CredentialStatus) => void;
  onSkip?: () => void;
}

/**
 * 首启/未连接时的引导卡（#43 后唯一宿主场景——设置页凭证面已内嵌，不再路由到此）。
 * #44 契约：验证成功不自动关闭——就地绿徽 + 页脚切换为「开始使用」，
 * 系统钥匙串弹窗期间任何关闭逻辑不得被触发（Esc 用 capture 且只关自身）。
 */
export function ProviderSetup({
  open, allowSkip, modelConfig, onModelConfigChange, onClose, onStatusChange, onSkip,
}: ProviderSetupProps) {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!open) setVerified(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // capture 先于任何宿主（如 Settings）的 window 监听：只关自身，不连带卸载宿主
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return <div className="modal-backdrop provider-backdrop" role="presentation">
    <section className="provider-dialog" role="dialog" aria-modal="true" aria-labelledby="provider-title" data-testid="provider-setup">
      <header><span className="setup-step">首次使用</span><h2 id="provider-title">连接文书助手</h2><p>选择服务商并用一次最小真实请求验证；凭证只进入电脑安全凭证库。</p></header>
      <CredentialForm
        variant="dialog"
        modelConfig={modelConfig}
        onModelConfigChange={onModelConfigChange}
        onStatusChange={onStatusChange}
        onValidated={() => setVerified(true)}
      />
      <div className="security-note" data-testid="provider-security-note"><span aria-hidden="true">⌑</span><p>凭证只保存到电脑的安全凭证库；Courtwork 不会查找其他应用的设置。连接状态只以真实请求成功为准，读取到钥匙串不代表服务可用。</p></div>
      <footer>
        {!verified && allowSkip && <button className="quiet-button" data-testid="provider-skip" onClick={onSkip ?? onClose}>先查看演示</button>}
        {!verified && !allowSkip && <button className="quiet-button" onClick={onClose}>取消</button>}
        {verified && <button className="primary-button" data-testid="provider-setup-done" onClick={onClose}>开始使用</button>}
      </footer>
    </section>
  </div>;
}
