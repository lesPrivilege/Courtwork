import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ReviewMatrix, RiskList, Timeline } from '@courtwork/schemas';
import type { ReviewDispositionState, ReviewGateProjection } from '../protocol/client';

export type LineTone = 'danger' | 'attention' | 'revision' | 'authority' | 'neutral';

export function TierBadge({ grade }: { grade?: 'A' | 'B' | 'C' }) {
  if (!grade) return null;
  return <span className={`tier tier-${grade.toLowerCase()}`} aria-label={`信源 ${grade}`}>{grade}</span>;
}

/** 零编码暴露律：来源文件对外显示可读文件名（专业原生编码），剥扩展名不截前缀。 */
export function sourceFileLabel(fileId?: string) {
  return fileId?.replace(/\.(md|docx|pdf|txt)$/i, '') ?? '';
}

/** demo 身份内联治理（RP-2.6 ①）：对外显示名剥（虚构）/（云章）水印段。 */
export function displayEntityName(name: string) {
  return name.replaceAll('（虚构）', '').replaceAll('（云章）', '');
}

export function SignatureLine({ tone }: { tone?: LineTone }) {
  if (!tone) return null;
  return <span className={`signature-line line-${tone}`} data-tone={tone} aria-hidden="true" />;
}

function SettlementFlash({ kind, itemRef, testable = false }: { kind?: 'confirmed' | 'rejected'; itemRef: string; testable?: boolean }) {
  const flashRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const flash = flashRef.current;
    if (!flash || !kind) return;
    const borderColor = getComputedStyle(flash).getPropertyValue('--settle-color').trim();
    const animation = flash.animate(
      [{ borderColor }, { borderColor: 'transparent' }],
      { duration: 150, easing: 'ease-out', fill: 'forwards' },
    );
    return () => animation.cancel();
  }, [kind]);
  if (!kind) return null;
  return <span
    ref={flashRef}
    className="settle-flash"
    data-testid={testable ? `settle-flash-${itemRef}` : undefined}
    data-kind={kind}
    data-duration="150"
    aria-hidden="true"
  />;
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

export function TimelinePanel({ timeline, grade }: { timeline: Timeline; grade?: 'A' | 'B' | 'C' }) {
  const preferred = timeline.events.find((event) => event.id === 'evt-24') ?? timeline.events[0];
  const [selected, setSelected] = useState(preferred?.id);
  const current = timeline.events.find((item) => item.id === selected) ?? timeline.events[0];
  if (!current) return <StaticViewport testId="timeline-static-viewport"><EmptyState noun="时间线事件" shortcut="⌘I" /></StaticViewport>;

  return <StaticViewport testId="timeline-static-viewport">
    <div className="timeline-layout" data-testid="timeline-panel">
      <div className="table-head timeline-grid"><span>日期</span><span>编号</span><span>事件</span><span>来源</span></div>
      <div className="dense-table timeline-events">
        {timeline.events.map((event) => {
          const contradiction = event.markers?.includes('contradiction') ?? false;
          return <button
            className={`dense-row timeline-grid ${selected === event.id ? 'selected' : ''}`}
            key={event.id}
            data-event-id={event.id}
            data-marker={contradiction ? 'contradiction' : undefined}
            title={event.description}
            onClick={() => setSelected(event.id)}
          >
            <SignatureLine tone={contradiction ? 'attention' : undefined} />
            <time>{event.date.kind === 'exact' ? event.date.date : <span className="pending-field">日期待核</span>}</time>
            <span className="domain-badge">{event.id.replace('evt-', 'E')}</span>
            <span>{event.description}</span>
            {/* 零编码暴露律：来源列显示可读文件名（专业原生编码），不截 wire 前缀 */}
            <span
              className="timeline-source truncate"
              title={event.sourceAnchors[0]?.fileId}
              aria-label={`来源 ${sourceFileLabel(event.sourceAnchors[0]?.fileId) || '待补'}`}
            >{sourceFileLabel(event.sourceAnchors[0]?.fileId) || '来源待补'}</span>
          </button>;
        })}
      </div>
      <article className="detail-card">
        <SignatureLine tone={current.markers?.includes('contradiction') ? 'attention' : undefined} />
        <p>{current.description}</p>
        <div className="verified-block"><TierBadge grade={grade} /><button disabled aria-label={`原文定位 · ${sourceFileLabel(current.sourceAnchors[0]?.fileId) || '来源待补'}`} title={`原文定位 · 卷宗原件待连接 · ${current.sourceAnchors[0]?.fileId ?? ''}`}>{sourceFileLabel(current.sourceAnchors[0]?.fileId) || '来源待补'}</button><q>{current.sourceAnchors[0]?.quote || '暂无可引用原文'}</q></div>
      </article>
    </div>
  </StaticViewport>;
}

const CONFIDENCE_LABELS: Record<ReviewMatrix['rows'][number]['answers'][string]['confidence'], string> = {
  high: '置信高', medium: '置信中', low: '置信低',
};

export function MatrixPanel({ matrix }: { matrix: ReviewMatrix }) {
  const questions = matrix.questions.slice(0, 5);
  if (!matrix.rows.length) return <StaticViewport testId="matrix-static-viewport"><EmptyState noun="审阅行" shortcut="⌘I" /></StaticViewport>;
  return <StaticViewport testId="matrix-static-viewport">
    <div className="matrix-wrap" data-testid="matrix-panel"><table><thead><tr><th>文书</th>{questions.map((question) => <th key={question.id} title={question.text}>{question.id.toUpperCase()}</th>)}</tr></thead><tbody>{matrix.rows.slice(0, 10).map((row) => <tr key={row.documentId}><th title={row.documentId}>{displayEntityName(sourceFileLabel(row.documentId))}</th>{questions.map((question) => {
      const cell = row.answers[question.id];
      return <td key={question.id}>
        {/* 批次三 #14：hover 溯源预览（peek）——格内全文 + 引语，goto-source 待原件连接仍禁用 */}
        <span className="cell-peek-anchor">
          <button disabled title="原文定位 · 卷宗原件待连接">{cell?.answer ?? <span className="pending-field">待补</span>}</button>
          {cell && <span className="cell-peek" role="tooltip" data-testid="matrix-cell-peek">
            <strong>{question.text}</strong>
            <span className="cell-peek-answer">{cell.answer}</span>
            {cell.sourceAnchors[0]?.quote
              ? <q>{cell.sourceAnchors[0].quote}</q>
              : <em>该文档未提及此问题，无可引用原文</em>}
            <small>{CONFIDENCE_LABELS[cell.confidence]}</small>
          </span>}
        </span>
      </td>;
    })}</tr>)}</tbody></table><div className="matrix-legend"><span>原文定位将在卷宗原件连接后开放</span><span data-testid="matrix-legend-count">{matrix.rows.length} 份文书 · 显示 {questions.length}/{matrix.questions.length} 个问题</span></div></div>
  </StaticViewport>;
}

export interface RevisionPanelProps {
  riskList: RiskList;
  selectedRisk: RiskList['risks'][number];
  selectedRiskId: string;
  onSelectRisk: (id: string) => void;
  gate?: ReviewGateProjection;
  selectedGrades: ('A' | 'B' | 'C')[];
  unverifiedRiskIds: string[];
  expandedEvidence: Record<string, boolean>;
  onExpandBasis: (riskId: string, index: number, evidenceRef: string) => void;
  dispositions: Record<string, ReviewDispositionState>;
  onDispose: (riskId: string, disposition: ReviewDispositionState) => void;
  individualReady: boolean;
  batchRefs: string[];
  onBatchConfirm: () => void;
  submitted: boolean;
}

function riskLineTone(level: RiskList['risks'][number]['level'], disposition?: ReviewDispositionState, unverified = false): LineTone | undefined {
  if (disposition === 'rejected') return 'neutral';
  if (!disposition && level === 'high') return 'danger';
  if (unverified) return 'attention';
  if (disposition === 'revision') return 'revision';
  if (disposition === 'confirmed') return 'authority';
  return undefined;
}

export function RevisionPanel(props: RevisionPanelProps) {
  const selectedGate = props.gate?.items.find((item) => item.itemRef === props.selectedRisk.id);
  const reviewedCount = props.selectedRisk.basis.filter((_, index) => props.expandedEvidence[`${props.selectedRisk.id}:${index}`]).length;
  const selectedDisposition = props.dispositions[props.selectedRisk.id];
  const selectedSettled = selectedDisposition === 'confirmed' || selectedDisposition === 'rejected' ? selectedDisposition : undefined;
  return <StaticViewport testId="revision-static-viewport">
    <div className="revision-layout" data-testid="revision-panel">
      <div className="batch-bar"><span>可批量：中/低危且依据已核验 · {props.batchRefs.length} 项</span><button onClick={props.onBatchConfirm} disabled={!props.batchRefs.length}>批量确认 {props.batchRefs.length} 项</button><small>高危与未核验条目已拆出</small></div>
      {props.submitted && <div className="submission-note" role="status">{props.gate?.items.length ?? 0} 项处置已逐条提交</div>}
      <div className="risk-master-detail">
        <div className="risk-list"><div className="table-head risk-grid"><span>风险</span><span>等级</span><span>状态</span></div>{props.riskList.risks.map((risk) => {
          const gateItem = props.gate?.items.find((item) => item.itemRef === risk.id);
          const disposition = props.dispositions[risk.id];
          const settled = disposition === 'confirmed' || disposition === 'rejected' ? disposition : undefined;
          return <button className={`dense-row risk-grid ${props.selectedRiskId === risk.id ? 'selected' : ''}`} data-risk-id={risk.id} title={risk.description} key={risk.id} onClick={() => props.onSelectRisk(risk.id)}>
            <SignatureLine tone={riskLineTone(risk.level, disposition, props.unverifiedRiskIds.includes(risk.id))} />
            <SettlementFlash kind={settled} itemRef={risk.id} testable />
            {/* 编号单源：与详情头同一 id 变换（R03），杜绝 index 序号与 id 双轨漂移 */}
            <span><b className="domain-badge">{risk.id.replace('risk-', 'R')}</b>{risk.description}</span><span className={`severity severity-${risk.level}`}>{risk.level === 'high' ? '高' : risk.level === 'medium' ? '中' : '低'}</span><span className={`gate-state ${disposition ?? 'pending'}`}>{disposition === 'confirmed' ? '已确认' : disposition === 'rejected' ? '已驳回' : disposition === 'revision' ? '待修正' : gateItem?.mode === 'individual' ? '逐条' : '待确认'}</span>
          </button>;
        })}</div>
        <article className="risk-detail">
          <SignatureLine tone={riskLineTone(props.selectedRisk.level, selectedDisposition, props.unverifiedRiskIds.includes(props.selectedRisk.id))} />
          <SettlementFlash kind={selectedSettled} itemRef={props.selectedRisk.id} />
          <header><span className="domain-badge">{props.selectedRisk.id.replace('risk-', 'R')}</span><strong>{selectedGate?.mode === 'individual' ? '逐条确认' : '常规审阅'}</strong><span>{reviewedCount}/{props.selectedRisk.basis.length} 依据已展开</span></header>
          {selectedGate?.reason && <div className="individual-note">{selectedGate.reason === 'high_risk' ? '高危条目不进入批量范围' : '含未核验依据，不进入批量范围'}</div>}
          <p>{props.selectedRisk.description}</p>
          <div className="evidence-stack">{props.selectedRisk.basis.map((basis, index) => {
            const open = props.expandedEvidence[`${props.selectedRisk.id}:${index}`];
            return <section className="verified-block" key={`${basis.citation}-${index}`}><TierBadge grade={props.selectedGrades[index] ?? props.selectedGrades[0]} /><button title={basis.citation} onClick={() => props.onExpandBasis(props.selectedRisk.id, index, selectedGate?.evidenceKeys[index] ?? basis.citation)} aria-expanded={open}>{basis.citation}<span>{open ? '收起' : '展开原文'}</span></button>{open && <q>{basis.sourceAnchors[0]?.quote || '暂无可引用原文'}</q>}</section>;
          })}</div>
          <footer><span>{selectedGate?.mode === 'individual' ? `逐条确认 · ${reviewedCount}/${props.selectedRisk.basis.length} 依据已展开` : '可在批量范围内确认'}</span><i /><button className="quiet-button" onClick={() => props.onDispose(props.selectedRisk.id, 'rejected')}>驳回</button><button className="quiet-button" onClick={() => props.onDispose(props.selectedRisk.id, 'revision')}>修正</button><button className="primary-button" disabled={!props.individualReady} onClick={() => props.onDispose(props.selectedRisk.id, 'confirmed')}>确认</button></footer>
        </article>
      </div>
      <div className="document-preview"><header><strong title="精密铸造生产线设备采购合同">精密铸造生产线设备采购合同</strong><span>修订 4 处</span></header><p>乙方应于本合同签订后 7 日内支付预付款。逾期付款的，<del>每逾期一日按未付金额的 1%</del><ins>违约金以实际损失为基础，并依法定标准调整</ins>。</p><p>设备到货后，买方应在 <ins>7 个工作日内书面提出验收异议</ins>；逾期未提出不当然视为验收合格。</p></div>
    </div>
  </StaticViewport>;
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
          <strong>答辩状</strong>
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
