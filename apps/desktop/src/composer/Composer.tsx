import { convertToReadingView } from '@courtwork/reading-view';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ContainerKind } from '../case/container-copy';
import { scopeCommitTitle, scopeCommittedLabel, scopeConfirmBody } from '../case/container-copy';
import { CHROME_COPY } from '../chrome/copy';
import { Icon } from '../workbench/Icon';
import { ModelConfigPopover } from '../provider/ModelConfigPopover';
import { reasoningRequest, type ModelConfig } from '../provider/model-config';
import { useDismissOnOutside } from '../hooks/useDismissOnOutside';
import { shouldBlockPaste } from '../chat/PasteBlock';
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
  /** RP-2.12 ②：粘贴的长文本/代码/命令块（mono 折叠块,与行内文本分离）。 */
  pasteBlocks: string[];
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
  /** 返回 false = 未受理（如未连接被引导层拦截）：composer 保留草稿不清空（批次七 Button 核验 #3）。 */
  onSend?: (payload: ComposerSendPayload) => boolean | void;
  /**
   * 容器化仪式：无活动容器时「存入」触发（docs/design/principles.md）。
   * 父层创建案件/项目后应更新 activeCaseId。
   */
  onContainerize?: (request: ContainerizeRequest) => void;
  /** 测试钩：强制某次上传处于 uploading 并推进 startedAt 偏移。 */
  uploadClock?: () => number;
  modelConfig?: ModelConfig;
  modelConfigOpen?: boolean;
  connectionPhase?: 'unverified' | 'verifying' | 'ready' | 'failed';
  onToggleModelConfig?: () => void;
  onModelConfigChange?: (config: ModelConfig) => void;
  onCloseModelConfig?: () => void;
  /** 外层生成请求在途：禁止按钮与 Enter 再次触发，保证每 turn 单飞行。 */
  requestPending?: boolean;
  /** RP-2.11 ⑤：composer 底排 workmode 钮 = chat|work 同源（与顶部段控同一状态源）。 */
  viewSegment?: 'chat' | 'work';
  onSegmentChange?: (next: 'chat' | 'work') => void;
  /**
   * CASE-ROOT-1：「+」菜单「Add folder」经宿主原生 picker 取文件夹授权（替代浏览器目录选择控件，
   * ADR-010 决定四）。父层注入（App → hostAuth.authorizeFolder + 反馈）；材料导入属 MATERIAL-INGRESS-1。
   */
  onAddFolder?: () => void;
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
  connectionPhase = 'unverified',
  onToggleModelConfig,
  onModelConfigChange,
  onCloseModelConfig,
  requestPending = false,
  viewSegment,
  onSegmentChange,
  onAddFolder,
}: ComposerProps) {
  // 仅当父层未注入 cases 时用 DEMO 回落（单测/孤立预览）；App 必须注入投影。
  const caseOptions = cases ?? DEMO_CASE_OPTIONS;
  const controlledCases = cases !== undefined;
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [caseId, setCaseId] = useState(activeCaseId ?? (controlledCases ? '' : caseOptions[0]?.id ?? ''));
  const [caseMenuOpen, setCaseMenuOpen] = useState(false);
  const [plusOpen, setPlusOpen] = useState(false);
  const [pasteBlocks, setPasteBlocks] = useState<string[]>([]);
  const [containerizeFor, setContainerizeFor] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const composingRef = useRef(false);
  const dragDepth = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const providerAnchorRef = useRef<HTMLSpanElement>(null);
  const plusAnchorRef = useRef<HTMLDivElement>(null);
  const casePickerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // popover 收敛纪律：点别处/Esc 即收（含 trigger 的 anchor 作容器，toggle 不闪烁）
  useDismissOnOutside(modelConfigOpen, onCloseModelConfig ?? (() => {}), providerAnchorRef);
  // 批次七 Button 核验 #2：+ 菜单与 case 下拉此前是收敛纪律的孤立缺口（全局仅这两处不收）
  useDismissOnOutside(plusOpen, () => setPlusOpen(false), plusAnchorRef);
  useDismissOnOutside(caseMenuOpen, () => setCaseMenuOpen(false), casePickerRef);

  // 容器切换：同步 chip；跨案清空附件（D-1 0a / docs/design/principles.md）
  // 容器化仪式创建后父层切换选中：不误清刚确认存入的附件。
  const prevActiveCaseId = useRef(activeCaseId);
  const skipAttachmentClearOnce = useRef(false);
  useEffect(() => {
    if (activeCaseId === undefined && !controlledCases) return;
    const prev = prevActiveCaseId.current;
    prevActiveCaseId.current = activeCaseId;
    setCaseId(activeCaseId ?? '');
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
  }, [activeCaseId, controlledCases]);

  const selectedCase = caseOptions.find((item) => item.id === caseId);
  const containerKind: ContainerKind = selectedCase?.kind ?? 'case';
  const caseName = selectedCase?.name;
  const hasBoundContainer = Boolean(selectedCase);
  const canSend =
    text.trim().length > 0 || pasteBlocks.length > 0 || attachments.some((item) => item.status.kind === 'ready' || item.status.kind === 'uploading');
  const busy = requestPending || attachments.some((item) => item.status.kind === 'uploading');

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
    const accepted = onSend?.({ text: text.trim(), attachments: readyAttachments, caseId, pasteBlocks });
    if (accepted === false) return; // 未受理（如连接引导拦截）：草稿原样保留
    setText('');
    setAttachments([]);
    setPasteBlocks([]);
    textareaRef.current?.focus();
  }, [attachments, busy, canSend, caseId, onSend, pasteBlocks, text]);

  const requestCommitToDossier = (attachmentId: string) => {
    if (!hasBoundContainer) {
      // 先聊后建：无容器时弹仪式（docs/design/principles.md）
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
      return;
    }
    // RP-2.12 ②：多行/长文粘贴 → 折叠 mono 块（不塞进行内输入）
    const pasted = event.clipboardData?.getData('text/plain') ?? '';
    if (shouldBlockPaste(pasted)) {
      event.preventDefault();
      setPasteBlocks((current) => [...current, pasted]);
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    if (composingRef.current || event.nativeEvent.isComposing) return;
    event.preventDefault();
    handleSend();
  };

  const chipLabel = selectedCase ? selectedCase.name : CHROME_COPY.composer.chooseCase;

  return (
    <div className="composer-shell" data-testid="composer" data-active-case={caseId || undefined} aria-busy={requestPending}>
      {dragging && (
        <div className="composer-drop-overlay" data-testid="composer-drop-overlay" role="status">
          <div className="composer-drop-card">
            <Icon name="paperclip" />
            <strong>Drop files to attach</strong>
            <p>Files stay with this message until you explicitly choose their scope.</p>
          </div>
        </div>
      )}

      {pasteBlocks.length > 0 && (
        <div className="composer-paste-list" data-testid="composer-paste-list">
          {pasteBlocks.map((block, index) => (
            <div className="composer-paste-chip" key={index}>
              <Icon name="clipboard" />
              <span className="composer-paste-preview">{block.split('\n')[0].slice(0, 48) || '粘贴内容'}</span>
              <small>{block.split('\n').length} 行</small>
              <button type="button" aria-label="移除粘贴块" onClick={() => setPasteBlocks((current) => current.filter((_, i) => i !== index))}><Icon name="x" /></button>
            </div>
          ))}
        </div>
      )}
      {attachments.length > 0 && (
        <ul className="attachment-list" aria-label="Pending attachments" id={listId}>
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
          {/* docs/design/principles.md：+ = 添加内容（附件来源），不承载新建案件 */}
          <div className="composer-plus" ref={plusAnchorRef}>
            <button
              type="button"
              className="composer-icon-button"
              data-composer-slot="add"
              data-testid="composer-plus"
              aria-label={CHROME_COPY.composer.add}
              aria-haspopup="menu"
              aria-expanded={plusOpen}
              title={CHROME_COPY.composer.add}
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
                    data-testid="composer-upload"
                    onClick={() => {
                      setPlusOpen(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    <Icon name="paperclip" />
                    {CHROME_COPY.composer.attachFiles}
                  </button>
                </li>
                {/* CASE-ROOT-1：文件夹入口从浏览器目录选择控件（ADR-010 决定四禁令）改经宿主原生 picker，
                    取得可持久复验的宿主授权（grant）；实际材料导入接入属 MATERIAL-INGRESS-1。 */}
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="composer-plus-folder"
                    onClick={() => {
                      setPlusOpen(false);
                      onAddFolder?.();
                    }}
                  >
                    <Icon name="folder-open" />
                    {CHROME_COPY.composer.addFolder}
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
                    {CHROME_COPY.composer.takePhoto}
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
                    {CHROME_COPY.composer.voiceInput}
                  </button>
                </li>
                {/* #37/RP-2.11 ⑤ 拍板：paste 独立钮撤销——⌘V 原生 + 此处收纳 */}
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    data-testid="composer-paste"
                    onClick={() => {
                      setPlusOpen(false);
                      void navigator.clipboard?.readText().then((value) => {
                        if (value) setText((current) => `${current}${value}`);
                      }).catch(() => textareaRef.current?.focus());
                    }}
                  >
                    <Icon name="clipboard" />
                    Paste text
                  </button>
                </li>
              </ul>
            )}
          </div>

          {/* 2026-07-12 省并：独立 add-folder 钮撤——与「+」菜单内「Add folder」完全重复（RP-2.7 重复收「+」）;
              且其 folder-open 图标与 case-chip 撞脸。文件夹附加唯一入口归「+」菜单。 */}

          {/* RP-2.11 ⑤：workmode 钮 = chat|work 同源（与顶部段控同一状态） */}
          {viewSegment && onSegmentChange && (
            <button
              type="button"
              className={`composer-icon-button ${viewSegment === 'work' ? 'is-active-mode' : ''}`}
              data-testid="composer-workmode"
              data-composer-slot="workmode"
              aria-pressed={viewSegment === 'work'}
              aria-label={`Mode: ${viewSegment === 'work' ? CHROME_COPY.segment.work : CHROME_COPY.segment.chat}`}
              title={`${CHROME_COPY.segment.chat} / ${CHROME_COPY.segment.work}`}
              onClick={() => onSegmentChange(viewSegment === 'work' ? 'chat' : 'work')}
            >
              <Icon name="panels-top-left" />
            </button>
          )}

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

          {!hasBoundContainer && <div className="case-picker" data-composer-slot="scope" ref={casePickerRef}>
            <button
              type="button"
              className="case-chip"
              data-testid="composer-case"
              data-case-id={caseId || undefined}
              aria-haspopup="listbox"
              aria-expanded={caseMenuOpen}
              title={CHROME_COPY.composer.chooseCase}
              onClick={() => {
                setCaseMenuOpen((open) => !open);
                setPlusOpen(false);
              }}
            >
              <Icon name="briefcase-business" />
              <span className="case-chip-label mono-ellip">{chipLabel}</span>
            </button>
            {caseMenuOpen && (
              <ul className="case-menu" role="listbox" aria-label="Case list" data-testid="composer-case-menu">
                <li className="case-menu-section" role="presentation">Cases</li>
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
                <li className="case-menu-divider" role="separator" />
                <li className="case-menu-section" role="presentation">Recent chats</li>
                <li><button type="button" role="option" aria-selected="false" onClick={() => setCaseMenuOpen(false)}><Icon name="message-circle" /> Untitled chat</button></li>
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
                    {CHROME_COPY.composer.unbound}
                  </button>
                </li>
              </ul>
            )}
          </div>}
        </div>

        <textarea
          ref={textareaRef}
          className="composer-input"
          data-testid="composer-input"
          rows={1}
          placeholder={CHROME_COPY.composer.placeholder}
          value={text}
          aria-label={CHROME_COPY.composer.inputLabel}
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
            <span ref={providerAnchorRef} className="model-config-anchor composer-provider-anchor" data-composer-slot="provider">
              <button
                type="button"
                className={`quiet-button model-config-trigger phase-${connectionPhase}`}
                data-testid="model-config-trigger"
                data-phase={connectionPhase}
                aria-expanded={modelConfigOpen}
                onClick={onToggleModelConfig}
              >
                <span data-testid="composer-provider" data-phase={connectionPhase}>
                  {connectionPhase === 'ready'
                    // 收敛令②：唯一旋钮=档位;chip 主显档位（标准/深思）+ 生效模型小字（单源取声明路由,禁静默偏差）
                    ? <>{modelConfig.reasoning === 'deep' ? CHROME_COPY.composer.deep : CHROME_COPY.composer.standard}<small className="composer-provider-model">{reasoningRequest(modelConfig).model}</small></>
                    : connectionPhase === 'failed' ? CHROME_COPY.composer.connectionFailed : CHROME_COPY.composer.connect}
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
            data-composer-slot="send"
            data-testid="composer-send"
            aria-label={CHROME_COPY.composer.send}
            title={CHROME_COPY.composer.send}
            disabled={!canSend || busy || attachments.some((item) => item.status.kind === 'failed')}
            onClick={handleSend}
          >
            <Icon name="send-horizontal" />
          </button>
        </div>
      </div>

      {/* 2026-07-12 减法（重申，防合并回流）：⏎/⇧⏎ 是品类通用规则不作提示；行为不变 */}
      {/* 供测试与 a11y 读出当前作用域文案模板 */}
      <span className="sr-only" data-testid="composer-scope-copy">
        {scopeCommitTitle(containerKind)}/{scopeCommittedLabel(containerKind)}/{scopeConfirmBody(containerKind, caseName ?? '')}
      </span>
    </div>
  );
}
