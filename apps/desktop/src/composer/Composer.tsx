import { convertToReadingView } from '@courtwork/reading-view';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../workbench/Icon';
import { AttachmentChip } from './AttachmentChip';
import { createAttachmentShell, resolveAttachmentUpload, withResolvedStatus, type ConvertFn } from './process-upload';
import {
  DEMO_CASE_OPTIONS,
  DISABLED_TOOLTIPS,
  type CaseOption,
  type ComposerAttachment,
} from './types';

export interface ComposerSendPayload {
  text: string;
  attachments: ComposerAttachment[];
  caseId: string;
}

export interface ComposerProps {
  cases?: CaseOption[];
  initialCaseId?: string;
  /** 可注入 reading-view 转换；默认真实 convertToReadingView。 */
  convert?: ConvertFn;
  onSend?: (payload: ComposerSendPayload) => void;
  /** 测试钩：强制某次上传处于 uploading 并推进 startedAt 偏移。 */
  uploadClock?: () => number;
}

let attachmentSeq = 0;
function nextAttachmentId() {
  attachmentSeq += 1;
  return `att-${attachmentSeq}-${Date.now().toString(36)}`;
}

async function readFileBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

export function Composer({
  cases = DEMO_CASE_OPTIONS,
  initialCaseId,
  convert = convertToReadingView,
  onSend,
  uploadClock = () => Date.now(),
}: ComposerProps) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [caseId, setCaseId] = useState(initialCaseId ?? cases[0]?.id ?? '');
  const [caseMenuOpen, setCaseMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const composingRef = useRef(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listId = useId();

  const selectedCase = cases.find((item) => item.id === caseId) ?? cases[0];
  const caseName = selectedCase?.name ?? '当前案件';
  const canSend =
    text.trim().length > 0 || attachments.some((item) => item.status.kind === 'ready' || item.status.kind === 'uploading');
  const busy = attachments.some((item) => item.status.kind === 'uploading');

  const ingestFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;

      const shells: ComposerAttachment[] = [];
      for (const file of list) {
        const bytes = await readFileBytes(file);
        shells.push(createAttachmentShell(file.name, bytes, nextAttachmentId(), uploadClock()));
      }
      setAttachments((prev) => [...prev, ...shells]);

      for (const shell of shells) {
        void resolveAttachmentUpload(shell, convert).then((resolved) => {
          setAttachments((prev) =>
            prev.map((item) => (item.id === shell.id ? withResolvedStatus(item, resolved) : item)),
          );
        });
      }
    },
    [convert, uploadClock],
  );

  const retryAttachment = useCallback(
    (id: string) => {
      setAttachments((prev) => {
        const target = prev.find((item) => item.id === id);
        if (!target) return prev;
        const shell: ComposerAttachment = {
          ...target,
          status: { kind: 'uploading', startedAt: uploadClock() },
          readingMarkdown: undefined,
        };
        void resolveAttachmentUpload(shell, convert).then((resolved) => {
          setAttachments((current) =>
            current.map((item) => (item.id === id ? withResolvedStatus(item, resolved) : item)),
          );
        });
        return prev.map((item) => (item.id === id ? shell : item));
      });
    },
    [convert, uploadClock],
  );

  const handleSend = useCallback(() => {
    if (!canSend || busy) return;
    if (attachments.some((item) => item.status.kind === 'failed')) return;
    const readyAttachments = attachments.filter((item) => item.status.kind === 'ready');
    onSend?.({ text: text.trim(), attachments: readyAttachments, caseId });
    setText('');
    setAttachments([]);
    textareaRef.current?.focus();
  }, [attachments, busy, canSend, caseId, onSend, text]);

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      dragDepth.current += 1;
      setDragging(true);
    };
    const onDragLeave = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setDragging(false);
    };
    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    };
    const onDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.files?.length) return;
      event.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      void ingestFiles(event.dataTransfer.files);
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, [ingestFiles]);

  const onPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) {
      event.preventDefault();
      void ingestFiles(files);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (composingRef.current || event.nativeEvent.isComposing) return;
    event.preventDefault();
    handleSend();
  };

  return (
    <div className="composer-shell" data-testid="composer">
      {dragging && (
        <div className="composer-drop-overlay" data-testid="composer-drop-overlay" role="status">
          <div className="composer-drop-card">
            <Icon name="paperclip" />
            <strong>松手即可附到本条</strong>
            <p>文件将先保留在输入区；需要进卷宗时再在附件上确认。</p>
          </div>
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="attachment-list" aria-label="待发送附件" id={listId}>
          {attachments.map((attachment) => (
            <AttachmentChip
              key={attachment.id}
              attachment={attachment}
              caseName={caseName}
              onRemove={() => setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
              onRetry={() => retryAttachment(attachment.id)}
              onCommitToDossier={() =>
                setAttachments((prev) =>
                  prev.map((item) => (item.id === attachment.id ? { ...item, scope: 'dossier' } : item)),
                )
              }
            />
          ))}
        </ul>
      )}

      <div className="composer-box">
        <div className="composer-tools-left">
          <button
            type="button"
            className="composer-icon-button"
            data-testid="composer-upload"
            aria-label="上传文件"
            title="上传文件"
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name="paperclip" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            data-testid="composer-file-input"
            onChange={(event) => {
              if (event.target.files?.length) void ingestFiles(event.target.files);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            className="composer-icon-button is-disabled-feature"
            data-testid="composer-camera"
            aria-label="拍照或扫描"
            aria-disabled="true"
            title={DISABLED_TOOLTIPS.camera}
            tabIndex={0}
            onClick={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
            }}
          >
            <Icon name="camera" />
          </button>
          <div className="case-picker">
            <button
              type="button"
              className="case-chip"
              data-testid="composer-case"
              aria-haspopup="listbox"
              aria-expanded={caseMenuOpen}
              title="选择案件文件夹"
              onClick={() => setCaseMenuOpen((open) => !open)}
            >
              <Icon name="folder-open" />
              <span className="case-chip-label mono-ellip">
                {selectedCase ? selectedCase.name : '选择案件'}
              </span>
            </button>
            {caseMenuOpen && (
              <ul className="case-menu" role="listbox" aria-label="案件列表" data-testid="composer-case-menu">
                {cases.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={item.id === caseId}
                      className={item.id === caseId ? 'selected' : ''}
                      onClick={() => {
                        setCaseId(item.id);
                        setCaseMenuOpen(false);
                      }}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <textarea
          ref={textareaRef}
          className="composer-input"
          data-testid="composer-input"
          rows={1}
          placeholder="描述要办的事，或从上方场景开始…"
          value={text}
          aria-label="自由输入"
          aria-controls={attachments.length ? listId : undefined}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onCompositionStart={() => {
            composingRef.current = true;
          }}
          onCompositionEnd={() => {
            composingRef.current = false;
          }}
        />

        <div className="composer-tools-right">
          <button
            type="button"
            className="composer-icon-button is-disabled-feature"
            data-testid="composer-voice"
            aria-label="语音输入"
            aria-disabled="true"
            title={DISABLED_TOOLTIPS.voice}
            tabIndex={0}
            onClick={(event) => event.preventDefault()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
            }}
          >
            <Icon name="mic" />
          </button>
          <button
            type="button"
            className="composer-send"
            data-testid="composer-send"
            aria-label="发送"
            title="发送"
            disabled={!canSend || busy || attachments.some((item) => item.status.kind === 'failed')}
            onClick={handleSend}
          >
            <Icon name="send-horizontal" />
          </button>
        </div>
      </div>

      <p className="composer-kbd-hint" data-testid="composer-kbd-hint">
        <kbd>⏎</kbd>
        <span>发送</span>
        <span className="composer-kbd-sep">·</span>
        <kbd>⇧</kbd>
        <kbd>⏎</kbd>
        <span>换行</span>
      </p>
    </div>
  );
}
