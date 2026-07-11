import { convertToReadingView } from '@courtwork/reading-view';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ContainerKind } from '../case/container-copy';
import { scopeCommitTitle, scopeCommittedLabel, scopeConfirmBody } from '../case/container-copy';
import { Icon } from '../workbench/Icon';
import { ModelConfigPopover } from '../provider/ModelConfigPopover';
import type { ModelConfig } from '../provider/model-config';
import { AttachmentChip } from './AttachmentChip';
import { createAttachmentShell, resolveAttachmentUpload, withResolvedStatus, type ConvertFn } from './process-upload';
import {
  CONTAINERIZE_COPY,
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

export interface ContainerizeRequest {
  kind: ContainerKind;
  attachmentId: string;
}

export interface ComposerProps {
  /** 左栏案件/工作区投影；禁止默认 DEMO 粘滞到真实容器。 */
  cases?: CaseOption[];
  /** 当前活动容器 id；切换时同步 chip 并清空附件（案件域）。 */
  activeCaseId?: string;
  /** 可注入 reading-view 转换；默认真实 convertToReadingView。 */
  convert?: ConvertFn;
  onSend?: (payload: ComposerSendPayload) => void;
  /**
   * 容器化仪式：无活动容器时「存入」触发（docs/52 #3）。
   * 父层创建案件/项目后应更新 activeCaseId。
   */
  onContainerize?: (request: ContainerizeRequest) => void;
  /** 测试钩：强制某次上传处于 uploading 并推进 startedAt 偏移。 */
  uploadClock?: () => number;
  modelConfig?: ModelConfig;
  modelConfigOpen?: boolean;
  modelLabel?: string;
  connectionPhase?: 'pending' | 'connected' | 'failed';
  onToggleModelConfig?: () => void;
  onModelConfigChange?: (config: ModelConfig) => void;
  onCloseModelConfig?: () => void;
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
  cases,
  activeCaseId,
  convert = convertToReadingView,
  onSend,
  onContainerize,
  uploadClock = () => Date.now(),
  modelConfig,
  modelConfigOpen = false,
  modelLabel,
  connectionPhase = 'pending',
  onToggleModelConfig,
  onModelConfigChange,
  onCloseModelConfig,
}: ComposerProps) {
  // 仅当父层未注入 cases 时用 DEMO 回落（单测/孤立预览）；App 必须注入投影。
  const caseOptions = cases ?? DEMO_CASE_OPTIONS;
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [caseId, setCaseId] = useState(activeCaseId ?? caseOptions[0]?.id ?? '');
  const [caseMenuOpen, setCaseMenuOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [containerizeFor, setContainerizeFor] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const composingRef = useRef(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listId = useId();

  // 容器切换：同步 chip；跨案清空附件（D-1 0a / docs/52 #8-⑤）
  // 容器化仪式创建后父层切换选中：不误清刚确认存入的附件。
  const prevActiveCaseId = useRef(activeCaseId);
  const skipAttachmentClearOnce = useRef(false);
  useEffect(() => {
    if (activeCaseId === undefined) return;
    const prev = prevActiveCaseId.current;
    prevActiveCaseId.current = activeCaseId;
    setCaseId(activeCaseId);
    setCaseMenuOpen(false);
    setPlusOpen(false);
    setContainerizeFor(null);
    if (prev && prev !== activeCaseId) {
      if (skipAttachmentClearOnce.current) {
        skipAttachmentClearOnce.current = false;
      } else {
        setAttachments([]);
      }
    }
  }, [activeCaseId]);

  const selectedCase = caseOptions.find((item) => item.id === caseId);
  const containerKind: ContainerKind = selectedCase?.kind ?? 'case';
  const caseName = selectedCase?.name;
  const hasBoundContainer = Boolean(selectedCase);
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
        // 文件夹选择时 webkitRelativePath 含路径，chip 只显示文件名
        const displayName = file.name;
        shells.push(createAttachmentShell(displayName, bytes, nextAttachmentId(), uploadClock()));
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

  const requestCommitToDossier = (attachmentId: string) => {
    if (!hasBoundContainer) {
      // 先聊后建：无容器时弹仪式（docs/52 #3）
      setContainerizeFor(attachmentId);
      return;
    }
    setAttachments((prev) =>
      prev.map((item) => (item.id === attachmentId ? { ...item, scope: 'dossier' } : item)),
    );
  };

  const confirmContainerize = (kind: ContainerKind) => {
    if (!containerizeFor) return;
    skipAttachmentClearOnce.current = true;
    setAttachments((prev) =>
      prev.map((item) => (item.id === containerizeFor ? { ...item, scope: 'dossier' } : item)),
    );
    setContainerizeFor(null);
    onContainerize?.({ kind, attachmentId: containerizeFor });
  };

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

  const chipLabel = selectedCase ? selectedCase.name : '选择案件';

  return (
    <div className="composer-shell" data-testid="composer" data-active-case={caseId || undefined}>
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
              caseName={caseName ?? '未命名容器'}
              containerKind={containerKind}
              onRemove={() => setAttachments((prev) => prev.filter((item) => item.id !== attachment.id))}
              onRetry={() => retryAttachment(attachment.id)}
              onCommitToDossier={() => requestCommitToDossier(attachment.id)}
            />
          ))}
        </ul>
      )}

      {containerizeFor && (
        <div
          className="scope-popover containerize-popover"
          role="dialog"
          aria-label={CONTAINERIZE_COPY.title}
          data-testid="containerize-popover"
        >
          <strong>{CONTAINERIZE_COPY.title}</strong>
          <p>{CONTAINERIZE_COPY.body}</p>
          <div className="scope-popover-actions">
            <button type="button" className="quiet-button" onClick={() => setContainerizeFor(null)}>
              {CONTAINERIZE_COPY.cancel}
            </button>
            <button
              type="button"
              className="quiet-button"
              data-testid="containerize-workspace"
              onClick={() => confirmContainerize('workspace')}
            >
              {CONTAINERIZE_COPY.createWorkspace}
            </button>
            <button
              type="button"
              className="primary-button"
              data-testid="containerize-case"
              onClick={() => confirmContainerize('case')}
            >
              {CONTAINERIZE_COPY.createCase}
            </button>
          </div>
        </div>
      )}

      <div className="composer-box">
        <div className="composer-tools-left">
          {/* docs/52 #5：+ = 添加内容（附件来源），不承载新建案件 */}
          <div className="composer-plus">
            <button
              type="button"
              className="composer-icon-button"
              data-testid="composer-plus"
              aria-label="添加内容"
              aria-haspopup="menu"
              aria-expanded={plusOpen}
              title="添加内容"
              onClick={() => {
                setPlusOpen((open) => !open);
                setCaseMenuOpen(false);
              }}
            >
              <Icon name="plus" />
            </button>
            {plusOpen && (
              <ul className="composer-plus-menu" role="menu" data-testid="composer-plus-menu">
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="composer-plus-folder"
                    onClick={() => {
                      setPlusOpen(false);
                      folderInputRef.current?.click();
                    }}
                  >
                    <Icon name="folder-open" />
                    选择文件夹
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="is-disabled-feature"
                    data-testid="composer-camera"
                    aria-disabled="true"
                    title={DISABLED_TOOLTIPS.camera}
                    tabIndex={0}
                    onClick={(event) => event.preventDefault()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
                    }}
                  >
                    <Icon name="camera" />
                    拍照或扫描
                  </button>
                </li>
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="is-disabled-feature"
                    data-testid="composer-voice"
                    aria-disabled="true"
                    title={DISABLED_TOOLTIPS.voice}
                    tabIndex={0}
                    onClick={(event) => event.preventDefault()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
                    }}
                  >
                    <Icon name="mic" />
                    语音输入
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* 真实动词平铺：上传 / 案件文件夹 chip / 发送（docs/52 #4） */}
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
          <input
            ref={folderInputRef}
            type="file"
            multiple
            hidden
            data-testid="composer-folder-input"
            onChange={(event) => {
              if (event.target.files?.length) void ingestFiles(event.target.files);
              event.target.value = '';
            }}
            {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          />

          <div className="case-picker">
            <button
              type="button"
              className="case-chip"
              data-testid="composer-case"
              data-case-id={caseId || undefined}
              aria-haspopup="listbox"
              aria-expanded={caseMenuOpen}
              title="选择案件文件夹"
              onClick={() => {
                setCaseMenuOpen((open) => !open);
                setPlusOpen(false);
              }}
            >
              <Icon name="folder-open" />
              <span className="case-chip-label mono-ellip">{chipLabel}</span>
            </button>
            {caseMenuOpen && (
              <ul className="case-menu" role="listbox" aria-label="案件列表" data-testid="composer-case-menu">
                {caseOptions.map((item) => (
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
                <li>
                  <button
                    type="button"
                    role="option"
                    data-testid="composer-case-unbind"
                    aria-selected={!caseId}
                    className={!caseId ? 'selected' : ''}
                    onClick={() => {
                      setCaseId('');
                      setCaseMenuOpen(false);
                    }}
                  >
                    不绑定容器 · 先聊后建
                  </button>
                </li>
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
          {modelConfig && onToggleModelConfig && onModelConfigChange && onCloseModelConfig && (
            <span className="model-config-anchor composer-provider-anchor">
              <button
                type="button"
                className={`quiet-button model-config-trigger phase-${connectionPhase}`}
                data-testid="model-config-trigger"
                data-phase={connectionPhase}
                aria-expanded={modelConfigOpen}
                onClick={onToggleModelConfig}
              >
                <span data-testid="composer-provider" data-phase={connectionPhase}>
                  {connectionPhase === 'connected'
                    ? `${modelLabel} · ${modelConfig.reasoning === 'deep' ? '深思' : '标准'}`
                    : connectionPhase === 'failed' ? '连接失败' : '待连接'}
                </span>
              </button>
              <ModelConfigPopover
                open={modelConfigOpen}
                config={modelConfig}
                onChange={onModelConfigChange}
                onClose={onCloseModelConfig}
              />
            </span>
          )}
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
      <p className="composer-disclaimer" data-testid="composer-disclaimer">
        Courtwork is an agent and can make mistakes. Please double-check responses.{' '}
        <a href="mailto:feedback@courtwork.local?subject=Courtwork%20feedback">Give us feedback</a>
      </p>

      {/* 供测试与 a11y 读出当前作用域文案模板 */}
      <span className="sr-only" data-testid="composer-scope-copy">
        {scopeCommitTitle(containerKind)}/{scopeCommittedLabel(containerKind)}/{scopeConfirmBody(containerKind, caseName ?? '')}
      </span>
    </div>
  );
}
