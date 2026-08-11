import { useEffect, useRef, type ReactNode } from 'react';

export type LineTone = 'danger' | 'attention' | 'revision' | 'authority' | 'neutral' | 'settled';

export function TierBadge({ grade }: { grade?: 'A' | 'B' | 'C' }) {
  if (!grade) return null;
  return <span className={`tier tier-${grade.toLowerCase()}`} aria-label={`信源 ${grade}`}>{grade}</span>;
}

export function sourceFileLabel(fileId?: string) {
  return fileId?.replace(/\.(md|docx|pdf|txt)$/i, '') ?? '';
}

export function displayEntityName(name: string) {
  return name.replaceAll('（虚构）', '').replaceAll('（云章）', '');
}

export function SignatureLine({ tone }: { tone?: LineTone }) {
  if (!tone) return null;
  return <span className={`signature-line line-${tone}`} data-tone={tone} aria-hidden="true" />;
}

export function StaticViewport({ children, testId }: { children: ReactNode; testId: string }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const stopViewportZoom = (event: globalThis.WheelEvent) => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    };
    viewport.addEventListener('wheel', stopViewportZoom, { passive: false });
    return () => viewport.removeEventListener('wheel', stopViewportZoom);
  }, []);
  return <div ref={viewportRef} className="static-viewport" data-testid={testId}>{children}</div>;
}

export function EmptyState({ noun, shortcut }: { noun: string; shortcut: string }) {
  return <div className="empty-state" role="status">暂无{noun}，按 <kbd>{shortcut}</kbd> 快速开始</div>;
}

export interface DraftDocument {
  title: string;
  paragraphs: string[];
}

export const INITIAL_DRAFT: DraftDocument = {
  title: '答辩意见',
  paragraphs: ['起云智能认为，涉案设备验收标准与异议期限约定不明，应结合验收单、会议纪要及履行过程综合判断。'],
};

export function DraftPanel({
  value,
  onChange,
  frozen,
  onCompile,
  onOpenDocx,
}: {
  value: DraftDocument;
  onChange: (value: DraftDocument) => void;
  frozen: boolean;
  onCompile: () => void;
  /** 定稿后打开产出 docx（F-3 open-file）；未接通时保持禁用入口 */
  onOpenDocx?: () => void;
}) {
  const editorRef = useRef<HTMLElement>(null);
  const captureDocument = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const title = editor.querySelector('h2')?.textContent?.trim() ?? '';
    const paragraphs = [...editor.querySelectorAll('p')].map((node) => node.textContent?.trim() ?? '').filter(Boolean);
    onChange({ title, paragraphs });
  };

  return <StaticViewport testId="draft-static-viewport">
    <div className={`draft-panel ${frozen ? 'frozen' : ''}`} data-testid="draft-panel">
      <header>
        <div>
          {/* 中性抬头（GENERIC-SCENARIOS-1 收尾追修）：起草画布是 ADR-015 成品律点名的**通用**
              主工作面，基线「送入起草画布」落地后它在零垂类绑定 matter 上真实可达，抬头写死
              一种文书名即是壳内垂类文案泄漏。与产物名 `起草文稿.docx` 同词。 */}
          <strong>起草文稿</strong>
          <span>{frozen ? '已定稿 · 2026-07-10 17:40' : '起草中 · 自动保存'}</span>
        </div>
        {frozen
          ? (
            <button
              className="primary-button"
              data-testid="open-word-doc"
              disabled={!onOpenDocx}
              title={onOpenDocx ? '打开 Word 文档' : '打开 Word 文档 · 文件生成完成后可用'}
              onClick={onOpenDocx}
            >
              打开 Word 文档
            </button>
          )
          : <button className="primary-button" onClick={onCompile}>编译为 Word 文档</button>}
      </header>
      {frozen
        ? <article className="draft-reading"><h2>{value.title}</h2>{value.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>
        : <article
            ref={editorRef}
            className="draft-editor"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="文书起草画布"
            onBlur={captureDocument}
          ><h2>{value.title}</h2>{value.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</article>}
    </div>
  </StaticViewport>;
}
