import { useState } from 'react';
import {
  hostAuthReasonCopy,
  type AuthorizeResult,
  type HostAuthReason,
} from '../host/host-auth-port';

/**
 * CASE-ROOT-1：案件文件夹绑定改经宿主原生 picker（hostAuth port），退役浏览器目录选择控件。
 * 授权、绝对路径与失败分类都留宿主；dialog 只拿 opaque grantId + 展示 label。
 * 取消/TCC 拒绝/卷卸载/越权四类失败逐一可见；重选文件夹显式换 grant，旧 ref 不再被引用。
 */
interface NewCaseDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; grantId?: string; label?: string }) => void;
  /** 系统 picker 取授权；App 注入 `hostAuth.authorizeFolder`。 */
  onAuthorizeFolder: () => Promise<AuthorizeResult>;
}

export function NewCaseDialog({ open, onClose, onCreate, onAuthorizeFolder }: NewCaseDialogProps) {
  const [step, setStep] = useState<'folder' | 'name'>('folder');
  const [name, setName] = useState('');
  const [grantId, setGrantId] = useState<string | undefined>(undefined);
  const [label, setLabel] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<HostAuthReason | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const reset = () => {
    setStep('folder');
    setName('');
    setGrantId(undefined);
    setLabel(undefined);
    setFailure(null);
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const authorizeFolder = async () => {
    setBusy(true);
    setFailure(null);
    try {
      const result = await onAuthorizeFolder();
      if (result.status === 'granted') {
        // 重选即显式换 grant：新 grantId/label 覆盖旧绑定，旧 ref 不再被本案引用。
        setGrantId(result.grant.grantId);
        setLabel(result.grant.label);
        setName((current) => current.trim() || result.grant.label);
        setStep('name');
      } else {
        setFailure(result.reason);
      }
    } catch {
      setFailure('unavailable');
    } finally {
      setBusy(false);
    }
  };

  const skipFolder = () => {
    setGrantId(undefined);
    setLabel(undefined);
    setName('');
    setFailure(null);
    setStep('name');
  };

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate({ title: trimmed, grantId, label });
    reset();
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="new-case-dialog" role="dialog" aria-modal="true" aria-labelledby="new-case-title" data-testid="new-case-dialog">
        <h2 id="new-case-title">新建案件</h2>
        {step === 'folder' && <>
          <p>选择案件对应的文件夹，Courtwork 会用文件夹名称作为案件名称建议。</p>
          <button
            type="button"
            className="folder-pick-button"
            data-testid="new-case-authorize"
            disabled={busy}
            onClick={authorizeFolder}
          >
            选择案件文件夹
          </button>
          {failure && (
            <div
              className="settings-recovery"
              data-testid="new-case-auth-failure"
              data-reason={failure}
              role="alert"
            >
              {hostAuthReasonCopy(failure)}
            </div>
          )}
          <button type="button" className="folder-skip-link" onClick={skipFolder}>不使用文件夹，直接命名</button>
          <footer><button className="quiet-button" onClick={close}>取消</button></footer>
        </>}
        {step === 'name' && <>
          <label className="credential-field">
            <span>案件名称</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              aria-label="案件名称"
              placeholder="例如：张三诉李四买卖合同纠纷"
            />
          </label>
          {label && (
            <p className="setup-step" data-testid="new-case-folder-label" data-grant-id={grantId} data-label={label}>
              已绑定文件夹〔{label}〕
              <button
                type="button"
                className="folder-skip-link"
                data-testid="new-case-reauthorize"
                disabled={busy}
                onClick={authorizeFolder}
              >
                重新选择
              </button>
            </p>
          )}
          {failure && (
            <div
              className="settings-recovery"
              data-testid="new-case-auth-failure"
              data-reason={failure}
              role="alert"
            >
              {hostAuthReasonCopy(failure)}
            </div>
          )}
          <footer>
            <button className="quiet-button" onClick={close}>取消</button>
            <button className="primary-button" onClick={confirm} disabled={!name.trim()}>创建案件</button>
          </footer>
        </>}
      </section>
    </div>
  );
}
