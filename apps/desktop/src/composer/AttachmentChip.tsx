import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '../workbench/Icon';
import { truncateFileName } from './truncate.js';
import { DEMO_CASE_OPTIONS, SCOPE_COPY, type ComposerAttachment } from './types.js';

function kindIcon(kind: ComposerAttachment['fileKind']): IconName {
  if (kind === 'image') return 'image';
  if (kind === 'other') return 'file';
  return 'fileText';
}

function useElapsed(startedAt: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active]);
  return Math.max(0, now - startedAt);
}

export function AttachmentChip({
  attachment,
  caseName,
  onRemove,
  onRetry,
  onCommitToDossier,
}: {
  attachment: ComposerAttachment;
  caseName: string;
  onRemove: () => void;
  onRetry: () => void;
  onCommitToDossier: () => void;
}) {
  const flashRef = useRef<HTMLSpanElement>(null);
  const prevKind = useRef(attachment.status.kind);
  const [scopeOpen, setScopeOpen] = useState(false);
  const status = attachment.status;
  const uploading = status.kind === 'uploading';
  const failed = status.kind === 'failed';
  const ready = status.kind === 'ready';
  const elapsed = useElapsed(uploading ? status.startedAt : 0, uploading);
  const longUpload = uploading && elapsed > 5_000;

  useEffect(() => {
    const prev = prevKind.current;
    const next = attachment.status.kind;
    prevKind.current = next;
    if (prev === next) return;
    if (next !== 'ready' && next !== 'failed') return;
    const flash = flashRef.current;
    if (!flash) return;
    const borderColor = getComputedStyle(flash).getPropertyValue('--settle-color').trim();
    flash.animate([{ borderColor: 'transparent' }, { borderColor }, { borderColor: 'transparent' }], {
      duration: 150,
      easing: 'ease-out',
    });
  }, [attachment.status.kind]);

  const displayName = truncateFileName(attachment.fileName);
  const inDossier = attachment.scope === 'dossier';

  return (
    <li
      className={[
        'attachment-chip',
        uploading ? 'is-uploading' : '',
        failed ? 'is-failed' : '',
        ready ? 'is-ready' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-testid={`attachment-chip-${attachment.id}`}
      data-status={status.kind}
      data-scope={attachment.scope}
    >
      <span
        ref={flashRef}
        className="attachment-chip-flash"
        data-kind={failed ? 'failed' : ready ? 'ready' : undefined}
        aria-hidden="true"
      />
      <Icon name={kindIcon(attachment.fileKind)} />
      <span className="attachment-name" title={attachment.fileName}>
        {displayName}
      </span>
      {uploading && !longUpload && <span className="attachment-meta">正在处理…</span>}
      {longUpload && status.kind === 'uploading' && (
        <span className="attachment-meta" data-testid={`attachment-progress-${attachment.id}`}>
          {status.progressLabel ??
            `正在处理《${truncateFileName(attachment.fileName, 18)}》${
              status.progress !== undefined ? ` ${status.progress}%` : ''
            }`}
        </span>
      )}
      {failed && status.kind === 'failed' && (
        <span className="attachment-fail">
          <span className="attachment-fail-msg">{status.message}</span>
          {status.retryable && (
            <button type="button" className="attachment-inline-action" onClick={onRetry} data-testid={`attachment-retry-${attachment.id}`}>
              <Icon name="rotateCw" />
              重试
            </button>
          )}
        </span>
      )}
      {ready && (
        <div className="attachment-scope">
          <button
            type="button"
            className={`scope-badge ${inDossier ? 'is-dossier' : 'is-message'}`}
            data-testid={`attachment-scope-${attachment.id}`}
            aria-haspopup="dialog"
            aria-expanded={scopeOpen}
            disabled={inDossier}
            title={inDossier ? SCOPE_COPY.dossier : '点击选择是否存入卷宗'}
            onClick={() => {
              if (!inDossier) setScopeOpen((open) => !open);
            }}
          >
            {inDossier ? SCOPE_COPY.dossier : SCOPE_COPY.message_only}
          </button>
          {scopeOpen && !inDossier && (
            <div className="scope-popover" role="dialog" aria-label={SCOPE_COPY.confirmTitle} data-testid={`scope-popover-${attachment.id}`}>
              <strong>{SCOPE_COPY.confirmTitle}</strong>
              <p>{SCOPE_COPY.confirmBody(caseName || DEMO_CASE_OPTIONS[0]!.name)}</p>
              <div className="scope-popover-actions">
                <button type="button" className="quiet-button" onClick={() => setScopeOpen(false)}>
                  {SCOPE_COPY.cancelAction}
                </button>
                <button
                  type="button"
                  className="primary-button"
                  data-testid={`scope-confirm-${attachment.id}`}
                  onClick={() => {
                    setScopeOpen(false);
                    onCommitToDossier();
                  }}
                >
                  {SCOPE_COPY.confirmAction}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      <button
        type="button"
        className="attachment-remove"
        aria-label={`移除 ${attachment.fileName}`}
        data-testid={`attachment-remove-${attachment.id}`}
        onClick={onRemove}
      >
        <Icon name="x" />
      </button>
    </li>
  );
}
