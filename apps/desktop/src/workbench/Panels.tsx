import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ReviewMatrix, RiskList, Timeline } from '@courtwork/legal';
import type { ReviewDispositionState, ReviewGateProjection } from '../protocol/client';
import type { NonAppliedReason, PendingRevisionConfirmation } from '../output/compile-review-output';

export type LineTone = 'danger' | 'attention' | 'revision' | 'authority' | 'neutral' | 'settled';

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
  const [quoteOpen, setQuoteOpen] = useState(true);
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
            onClick={() => { setSelected(event.id); setQuoteOpen(true); }}
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
        <div className="verified-block evidence-detail">
          <span className="evidence-grade-slot"><TierBadge grade={grade} /></span>
          <div className="evidence-body">
            <div className="evidence-source-actions">
              <button
                type="button"
                className="evidence-toggle"
                aria-expanded={quoteOpen}
                aria-controls={`timeline-quote-${current.id}`}
                onClick={() => setQuoteOpen((open) => !open)}
              >
                {quoteOpen ? '收起引语' : '查看引语'} · {sourceFileLabel(current.sourceAnchors[0]?.fileId) || '来源待补'}
              </button>
              <button type="button" className="goto-source" disabled title="卷宗原件尚未接通">回到原件 · 尚未接通</button>
            </div>
            {quoteOpen && <q id={`timeline-quote-${current.id}`}>{current.sourceAnchors[0]?.quote || '暂无可引用原文'}</q>}
            <span className="source-file-meta" title={current.sourceAnchors[0]?.fileId}>来源 · {sourceFileLabel(current.sourceAnchors[0]?.fileId) || '待补'}</span>
          </div>
        </div>
      </article>
    </div>
  </StaticViewport>;
}

const CONFIDENCE_LABELS: Record<ReviewMatrix['rows'][number]['answers'][string]['confidence'], string> = {
  high: '置信高', medium: '置信中', low: '置信低',
};

/** 从 question.text 机械裁切短名；不维护领域别名表，不写回 schema。 */
export function questionShortName(text: string) {
  const normalized = text.trim().replace(/\s+/g, '').replace(/^(是否|有无)/, '');
  const phrase = normalized.split(/（|\(|如何|是多少|为多长|\?|？|，|,|；|;/, 1)[0] ?? normalized;
  const withoutMeasure = phrase.replace(/(比例|情况|条款)$/u, '');
  const shortName = Array.from(withoutMeasure || normalized).slice(0, 7).join('');
  return shortName || '问题';
}

function matrixCellKey(documentId: string, questionId: string) {
  const documentKey = documentId.match(/^V\d+/i)?.[0].toLowerCase() ?? 'document';
  return `${documentKey}-${questionId.toLowerCase()}`;
}

export function MatrixPanel({ matrix }: { matrix: ReviewMatrix }) {
  const questions = matrix.questions.slice(0, 5);
  const [openCell, setOpenCell] = useState<string>();
  if (!matrix.rows.length) return <StaticViewport testId="matrix-static-viewport"><EmptyState noun="审阅行" shortcut="⌘I" /></StaticViewport>;
  return <StaticViewport testId="matrix-static-viewport">
    <div className="matrix-wrap" data-testid="matrix-panel"><table><thead><tr><th>文书</th>{questions.map((question) => {
      const tooltipId = `matrix-question-tooltip-${question.id.toLowerCase()}`;
      return <th key={question.id}>
        <span
          className="matrix-question-header"
          tabIndex={0}
          aria-describedby={tooltipId}
          data-testid={`matrix-question-${question.id.toLowerCase()}`}
        >
          <span>{question.id.toUpperCase()} · {questionShortName(question.text)}</span>
          <span role="tooltip" id={tooltipId} data-testid={tooltipId}>{question.text}</span>
        </span>
      </th>;
    })}</tr></thead><tbody>{matrix.rows.slice(0, 10).map((row) => <tr key={row.documentId}><th className="source-file-meta" title={row.documentId}>{displayEntityName(sourceFileLabel(row.documentId))}</th>{questions.map((question) => {
      const cell = row.answers[question.id];
      const cellKey = matrixCellKey(row.documentId, question.id);
      const peekId = `matrix-cell-peek-${cellKey}`;
      const open = openCell === cellKey;
      return <td key={question.id}>
        {/* 查看引语是真入口；回到原件未接通，保持独立禁用动词。 */}
        <span className="cell-peek-anchor">
          {cell
            ? <button
                type="button"
                data-testid={`matrix-source-${cellKey}`}
                aria-label={`查看引语 · ${question.text}`}
                aria-expanded={open}
                aria-controls={peekId}
                onClick={() => setOpenCell((current) => current === cellKey ? undefined : cellKey)}
              >{cell.answer}</button>
            : <span className="pending-field">待补</span>}
          {cell && <span className="cell-peek" role="group" aria-label="引语详情" id={peekId} data-open={open || undefined} data-testid={peekId}>
            <strong>{question.text}</strong>
            <span className="cell-peek-answer">{cell.answer}</span>
            {cell.sourceAnchors[0]?.quote
              ? <q>{cell.sourceAnchors[0].quote}</q>
              : <em>该文档未提及此问题，无可引用原文</em>}
            <span className="cell-peek-meta">
              <small className="source-file-meta" title={cell.sourceAnchors[0]?.fileId}>来源 · {sourceFileLabel(cell.sourceAnchors[0]?.fileId) || '待补'}</small>
              <small>{CONFIDENCE_LABELS[cell.confidence]}</small>
            </span>
            <button type="button" className="goto-source" disabled title="卷宗原件尚未接通">回到原件 · 尚未接通</button>
          </span>}
        </span>
      </td>;
    })}</tr>)}</tbody></table><div className="matrix-legend"><span>引语可核对 · 回到原件尚未接通</span><span data-testid="matrix-legend-count">{matrix.rows.length} 份文书 · 显示 {questions.length}/{matrix.questions.length} 个问题</span></div></div>
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
  // OUTPUT-CONFIRM-UI-1：未能落到文书上的修订，逐条交用户确认后才生成产物。
  nonAppliedPending: PendingRevisionConfirmation[];
  confirmedNonAppliedIds: string[];
  onConfirmNonApplied: (instructionId: string) => void;
  onCancelNonApplied: () => void;
}

/** 未落点原因的产品文案：只讲「发生了什么」，不出现工程词。 */
function nonAppliedReasonLabel(reason: NonAppliedReason) {
  if (reason === 'ambiguous') return '文书中有多处相同表述，无法确定位置';
  if (reason === 'text_changed') return '文书原文已改动，与这处修订不再吻合';
  if (reason === 'unsupported') return '这类修订暂不支持自动定位';
  return '未能在文书中找到对应原文';
}

function riskLineTone(level: RiskList['risks'][number]['level'], disposition?: ReviewDispositionState, unverified = false): LineTone | undefined {
  if (disposition === 'rejected') return 'neutral';
  if (!disposition && level === 'high') return 'danger';
  if (unverified) return 'attention';
  if (disposition === 'revision') return 'revision';
  // 朱＝印记色非状态色（2026-07-19 拍板）：逐条确认是**人**把它按下去的，故落定取朱不取绿；
  // 绿保持系统/权威确认的既有语义位（tier.a / gate.confirmed 不动）。
  if (disposition === 'confirmed') return 'settled';
  return undefined;
}

function severityLabel(level: RiskList['risks'][number]['level']) {
  return level === 'high' ? '高危' : level === 'medium' ? '中危' : '低危';
}

function dispositionLabel(disposition?: ReviewDispositionState) {
  if (disposition === 'confirmed') return '已确认';
  if (disposition === 'rejected') return '已驳回';
  if (disposition === 'revision') return '待修正';
  return '待确认';
}

/**
 * CONFIRM-GRANULARITY-1（版本收尾拍板 f28ad41，2026-07-17）：批量确认 UI 收起，
 * 逐条确认（确认此项/驳回/修正）为唯一可见路径。实现与配套单测保留不删——
 * 回归条件=试点真实反馈证明逐条成本过高，经架构拍板再放出（翻此常量即可）。
 */
const BATCH_CONFIRM_VISIBLE = false;

/**
 * 补丁（架构裁定，清零 off 态可见「批量」字样）：三处措辞按 BATCH_CONFIRM_VISIBLE 双态——
 * on 态原文逐字节保留（翻常量即回归），off 态改分级语义（等级 + 下一步，零「批量」子串）。
 * riskNextStep 本体与其单测零动；纯函数导出供双态单测。
 */
export function individualNoteCopy(reason: 'high_risk' | 'unverified', batchVisible: boolean): string {
  if (batchVisible) return reason === 'high_risk' ? '高危条目不进入批量范围' : '含未核验依据，不进入批量范围';
  return reason === 'high_risk' ? '高危 · 需逐条处置' : '含未核验依据 · 展开核验后可确认此项';
}

export function scopeFooterCopy(batchVisible: boolean): string {
  return batchVisible ? '可在批量范围内确认' : '中/低危 · 已核验，可确认此项';
}

export function displayNextStep(
  disposition: ReviewDispositionState | undefined,
  mode: ReviewGateProjection['items'][number]['mode'] | undefined,
  evidenceReady: boolean,
  batchVisible: boolean,
): string {
  const label = riskNextStep(disposition, mode, evidenceReady);
  if (!batchVisible && label === '可批量确认') return '可确认此项';
  return label;
}

export function riskNextStep(
  disposition: ReviewDispositionState | undefined,
  mode: ReviewGateProjection['items'][number]['mode'] | undefined,
  evidenceReady: boolean,
) {
  if (disposition === 'confirmed') return '已完成';
  if (disposition === 'rejected') return '已退出';
  if (disposition === 'revision') return '修正后确认';
  if (mode === 'individual') return evidenceReady ? '逐条确认' : '展开依据';
  return mode === 'batch' ? '可批量确认' : '等待门禁';
}

export function RevisionPanel(props: RevisionPanelProps) {
  const selectedGate = props.gate?.items.find((item) => item.itemRef === props.selectedRisk.id);
  const reviewedCount = props.selectedRisk.basis.filter((_, index) => props.expandedEvidence[`${props.selectedRisk.id}:${index}`]).length;
  const selectedDisposition = props.dispositions[props.selectedRisk.id];
  const selectedSettled = selectedDisposition === 'confirmed' || selectedDisposition === 'rejected' ? selectedDisposition : undefined;
  const selectedUnverified = props.unverifiedRiskIds.includes(props.selectedRisk.id);
  const selectedNextStep = displayNextStep(selectedDisposition, selectedGate?.mode, reviewedCount === props.selectedRisk.basis.length, BATCH_CONFIRM_VISIBLE);
  const excludedCount = props.gate?.items.filter((item) => item.mode === 'individual').length ?? 0;
  return <StaticViewport testId="revision-static-viewport">
    <div className="revision-layout" data-testid="revision-panel">
      {BATCH_CONFIRM_VISIBLE && (
        <div className="batch-bar" data-testid="batch-scope">
          <span>本次范围 {props.batchRefs.length} 项 · 待确认且中/低危、依据已核验</span>
          <button onClick={props.onBatchConfirm} disabled={!props.batchRefs.length}>批量确认 {props.batchRefs.length} 项</button>
          <small>排除 {excludedCount} 项 · 高危或未核验仅逐条处理</small>
        </div>
      )}
      {props.submitted && <div className="submission-note" role="status">{props.gate?.items.length ?? 0} 项处置已逐条提交</div>}
      {props.nonAppliedPending.length > 0 && (
        <section className="nonapplied-confirm" data-testid="nonapplied-confirm" aria-label="未能落到文书上的修订">
          <header>
            <strong>有 {props.nonAppliedPending.length} 处修订未能落到文书上</strong>
            <span>请逐条核对；确认后将照常生成文书，这几处不会自动标注。取消则不生成产物。</span>
          </header>
          <ul className="nonapplied-list">
            {props.nonAppliedPending.map((item) => {
              const confirmed = props.confirmedNonAppliedIds.includes(item.instructionId);
              return (
                <li
                  className="nonapplied-item"
                  data-testid="nonapplied-item"
                  data-instruction-id={item.instructionId}
                  data-confirmed={confirmed}
                  key={item.instructionId}
                >
                  <SignatureLine tone={confirmed ? 'settled' : 'attention'} />
                  <div className="nonapplied-body">
                    <span className="nonapplied-head"><b className="domain-badge">{item.riskId.replace('risk-', 'R')}</b><span className="nonapplied-summary">{item.summary}</span></span>
                    <span className="nonapplied-reason">{nonAppliedReasonLabel(item.reason)}</span>
                    {item.quote && <q className="nonapplied-quote">{item.quote}</q>}
                  </div>
                  <button
                    type="button"
                    className="primary-button"
                    data-testid="confirm-nonapplied"
                    disabled={confirmed}
                    onClick={() => props.onConfirmNonApplied(item.instructionId)}
                  >{confirmed ? '已确认' : '确认知悉'}</button>
                </li>
              );
            })}
          </ul>
          <footer>
            <button type="button" className="quiet-button" data-testid="cancel-nonapplied" onClick={props.onCancelNonApplied}>取消，不生成产物</button>
            <span className="nonapplied-progress">已确认 {props.confirmedNonAppliedIds.length}/{props.nonAppliedPending.length}</span>
          </footer>
        </section>
      )}
      <div className="risk-master-detail">
        <div className="risk-list"><div className="table-head risk-grid"><span>风险</span><span>等级</span><span>核验</span><span>处置</span><span>下一步</span></div>{props.riskList.risks.map((risk) => {
          const gateItem = props.gate?.items.find((item) => item.itemRef === risk.id);
          const disposition = props.dispositions[risk.id];
          const settled = disposition === 'confirmed' || disposition === 'rejected' ? disposition : undefined;
          const unverified = props.unverifiedRiskIds.includes(risk.id);
          const evidenceReady = risk.basis.every((_, index) => props.expandedEvidence[`${risk.id}:${index}`]);
          const nextStep = displayNextStep(disposition, gateItem?.mode, evidenceReady, BATCH_CONFIRM_VISIBLE);
          return <button className={`dense-row risk-grid ${props.selectedRiskId === risk.id ? 'selected' : ''}`} data-risk-id={risk.id} title={risk.description} key={risk.id} onClick={() => props.onSelectRisk(risk.id)}>
            <SignatureLine tone={riskLineTone(risk.level, disposition, unverified)} />
            <SettlementFlash kind={settled} itemRef={risk.id} testable />
            {/* 编号单源：与详情头同一 id 变换（R03），杜绝 index 序号与 id 双轨漂移 */}
            <span className="risk-summary"><b className="domain-badge">{risk.id.replace('risk-', 'R')}</b><span>{risk.description}</span></span>
            <span className={`severity severity-${risk.level}`}>{severityLabel(risk.level)}</span>
            <span className={`verification-state ${unverified ? 'unverified' : 'verified'}`}>{unverified ? '未核验' : '已核验'}</span>
            <span className={`gate-state ${disposition ?? 'pending'}`}>{dispositionLabel(disposition)}</span>
            <span className="risk-next-step" title={`下一步 · ${nextStep}`}>{nextStep}</span>
          </button>;
        })}</div>
        <article className="risk-detail">
          <SignatureLine tone={riskLineTone(props.selectedRisk.level, selectedDisposition, selectedUnverified)} />
          <SettlementFlash kind={selectedSettled} itemRef={props.selectedRisk.id} />
          <header><span className="domain-badge">{props.selectedRisk.id.replace('risk-', 'R')}</span><strong>{selectedGate?.mode === 'individual' ? '逐条确认' : '常规审阅'}</strong><span>{reviewedCount}/{props.selectedRisk.basis.length} 依据已展开</span></header>
          {selectedGate?.reason && <div className="individual-note">{individualNoteCopy(selectedGate.reason === 'high_risk' ? 'high_risk' : 'unverified', BATCH_CONFIRM_VISIBLE)}</div>}
          <p>{props.selectedRisk.description}</p>
          <dl className="risk-status-ledger" data-testid="risk-detail-status">
            <div><dt>严重度</dt><dd>{severityLabel(props.selectedRisk.level)}</dd></div>
            <div><dt>核验</dt><dd>{selectedUnverified ? '未核验' : '已核验'}</dd></div>
            <div><dt>处置</dt><dd>{dispositionLabel(selectedDisposition)}</dd></div>
            <div><dt>下一步</dt><dd>{selectedNextStep}</dd></div>
          </dl>
          <div className="evidence-stack">{props.selectedRisk.basis.map((basis, index) => {
            const open = props.expandedEvidence[`${props.selectedRisk.id}:${index}`];
            const quoteId = `risk-quote-${props.selectedRisk.id}-${index}`;
            const source = basis.sourceAnchors[0];
            return <section className="verified-block" key={`${basis.citation}-${index}`}>
              <span className="evidence-grade-slot"><TierBadge grade={props.selectedGrades[index] ?? props.selectedGrades[0]} /></span>
              <div className="evidence-body">
                <button
                  type="button"
                  className="evidence-toggle"
                  title={basis.citation}
                  onClick={() => props.onExpandBasis(props.selectedRisk.id, index, selectedGate?.evidenceKeys[index] ?? basis.citation)}
                  aria-expanded={open}
                  aria-controls={quoteId}
                  aria-label={`${open ? '收起引语' : '查看引语'} · ${basis.citation}`}
                ><span>{basis.citation}</span><span>{open ? '收起引语' : '查看引语'}</span></button>
                {open && <>
                  <q id={quoteId} data-testid={quoteId}>{source?.quote || '暂无可引用原文'}</q>
                  <div className="evidence-source-actions">
                    <span className="source-file-meta" title={source?.fileId}>来源 · {sourceFileLabel(source?.fileId) || '待补'}</span>
                    <button type="button" className="goto-source" disabled title="卷宗原件尚未接通">回到原件 · 尚未接通</button>
                  </div>
                </>}
              </div>
            </section>;
          })}</div>
          <footer><span>{selectedGate?.mode === 'individual' ? `逐条确认 · ${reviewedCount}/${props.selectedRisk.basis.length} 依据已展开` : scopeFooterCopy(BATCH_CONFIRM_VISIBLE)}</span><i /><button className="quiet-button" onClick={() => props.onDispose(props.selectedRisk.id, 'rejected')}>驳回</button><button className="quiet-button" onClick={() => props.onDispose(props.selectedRisk.id, 'revision')}>修正</button><button className="primary-button" disabled={!props.individualReady} onClick={() => props.onDispose(props.selectedRisk.id, 'confirmed')}>确认此项</button></footer>
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
