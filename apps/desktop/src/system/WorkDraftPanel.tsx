import { useEffect, useRef, useState } from 'react';
import type { WorkDraft } from './work-draft-store';
import { workDraftStore } from './work-draft-store';

interface WorkDraftPanelProps {
  caseId: string;
  caseRoot: string;
  activeDraftId?: string;
  onDraftChange?: (draft: WorkDraft | undefined) => void;
  onFeedback?: (message: string, ok: boolean) => void;
}

/**
 * 工作稿轨编辑面：复用起草画布的 contentEditable 纸面形态 + 自动保存。
 * 与垂类交付轨（编译为 Word）分流——此处无冻结仪式。
 */
export function WorkDraftPanel({
  caseId,
  caseRoot,
  activeDraftId,
  onDraftChange,
  onFeedback,
}: WorkDraftPanelProps) {
  const [drafts, setDrafts] = useState(() => workDraftStore.list(caseId));
  const [selectedId, setSelectedId] = useState<string | undefined>(activeDraftId);
  const editorRef = useRef<HTMLElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const selected = selectedId ? workDraftStore.get(selectedId) : undefined;

  useEffect(() => {
    setDrafts(workDraftStore.list(caseId));
  }, [caseId]);

  useEffect(() => {
    if (activeDraftId) setSelectedId(activeDraftId);
  }, [activeDraftId]);

  const refresh = (draft?: WorkDraft) => {
    setDrafts(workDraftStore.list(caseId));
    if (draft) {
      setSelectedId(draft.id);
      onDraftChange?.(draft);
    }
  };

  const createDraft = () => {
    const result = workDraftStore.create({
      caseId,
      caseRoot,
      title: `工作稿 ${drafts.length + 1}`,
    });
    if (!result.ok) {
      onFeedback?.(result.message, false);
      return;
    }
    refresh(result.draft);
    onFeedback?.('已新建工作稿', true);
  };

  const scheduleSave = () => {
    if (!selectedId || !editorRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const root = editorRef.current;
      if (!root || !selectedId) return;
      const title = root.querySelector('h2')?.textContent?.trim() ?? '';
      const content = [...root.querySelectorAll('p')]
        .map((node) => node.textContent ?? '')
        .join('\n');
      const result = workDraftStore.save(selectedId, { title, content });
      if (!result.ok) {
        onFeedback?.(result.message, false);
        return;
      }
      refresh(result.draft);
    }, 400);
  };

  return (
    <div className="work-draft-panel" data-testid="work-draft-panel">
      <header className="work-draft-toolbar">
        <div>
          <strong>工作稿</strong>
          <span>自动保存 · 仅本案「工作稿」文件夹</span>
        </div>
        <button
          type="button"
          className="primary-button"
          data-testid="new-work-draft"
          onClick={createDraft}
        >
          新建工作稿
        </button>
      </header>

      <div className="work-draft-body">
        <ul className="work-draft-list" data-testid="work-draft-list" aria-label="工作稿列表">
          {drafts.length === 0 && (
            <li className="work-draft-empty">尚无工作稿 · 点击「新建工作稿」开始笔记</li>
          )}
          {drafts.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={item.id === selectedId ? 'selected' : ''}
                data-testid={`work-draft-item-${item.id}`}
                onClick={() => {
                  setSelectedId(item.id);
                  onDraftChange?.(item);
                }}
              >
                <strong className="truncate" title={item.title}>{item.title}</strong>
                <span className="truncate" title={item.fileName}>{item.fileName}</span>
              </button>
            </li>
          ))}
        </ul>

        {selected ? (
          <article
            key={selected.id}
            ref={editorRef}
            className="draft-editor work-draft-editor"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="工作稿编辑"
            data-testid="work-draft-editor"
            onInput={scheduleSave}
            onBlur={scheduleSave}
          >
            <h2>{selected.title}</h2>
            {selected.content
              ? selected.content.split('\n').map((line, index) => <p key={index}>{line}</p>)
              : <p><br /></p>}
          </article>
        ) : (
          <div className="empty-state" role="status">选择或新建一份工作稿</div>
        )}
      </div>
    </div>
  );
}
