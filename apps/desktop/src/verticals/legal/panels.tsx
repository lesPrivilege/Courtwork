import { useEffect, useRef, useState } from 'react';
import type { ReviewMatrix, RiskList, Timeline } from '@courtwork/legal';
import type { SourceAnchor } from '@courtwork/schemas';
import type { ReviewDispositionState, ReviewGateProjection } from '../../protocol/client';
import type { NonAppliedReason, PendingRevisionConfirmation } from './compile-review-output';
import type { ContractReviewOutputResult } from './contract-review-delivery';
import { S3_REVIEW_GATE_LABEL, type ContractReviewState } from './contract-review-flow';
import { displayEntityName, EmptyState, LineTone, SignatureLine, sourceFileLabel, StaticViewport, TierBadge } from '../../workbench/Panels';

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

function SettleSeal({ disposition, itemRef }: { disposition?: ReviewDispositionState; itemRef: string }) {
  if (disposition !== 'confirmed') return null;
  return <svg
    className="settle-seal"
    data-testid={`settle-seal-${itemRef}`}
    viewBox="0 0 96 96"
    aria-hidden="true"
  ><use href="#mark-seal-frame" /></svg>;
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

export type ReviewItemUiState =
  | { status: 'pending' }
  | { status: 'editing'; draft: string }
  | { status: 'confirmed'; correctedDescription?: string }
  | { status: 'rejected' };

export interface InteractiveReviewControls {
  gate: ReviewGateProjection;
  itemStates: Readonly<Record<string, ReviewItemUiState>>;
  submitState: 'idle' | 'submitting' | 'submitted';
  onBeginRevision(itemRef: string): void;
  onChangeRevision(itemRef: string, value: string): void;
  onCancelRevision(itemRef: string): void;
  onCommitRevision(itemRef: string): void;
  onConfirm(itemRef: string): void;
  onReject(itemRef: string): void;
  onSubmit(): void;
}

export function projectReviewItemStates(
  state: ContractReviewState,
  itemRefs: readonly string[],
): Record<string, ReviewItemUiState> {
  const projected: Record<string, ReviewItemUiState> = {};
  for (const itemRef of itemRefs) {
    if (state.editing?.itemRef === itemRef) {
      projected[itemRef] = { status: 'editing', draft: state.editing.draft };
      continue;
    }
    const decision = state.decisions[itemRef];
    if (!decision) {
      projected[itemRef] = { status: 'pending' };
      continue;
    }
    if (decision.disposition === 'reject') {
      projected[itemRef] = { status: 'rejected' };
      continue;
    }
    projected[itemRef] = decision.disposition === 'revise'
      ? { status: 'confirmed', correctedDescription: decision.correctedDescription }
      : { status: 'confirmed' };
  }
  return projected;
}

export interface RevisionPanelCommon {
  riskList: RiskList;
  /** 真实主合同名（production 取自本次会话冻结的材料；固定 demo 标题已退役）。 */
  primaryFileName: string;
  selectedRiskId: string;
  onSelectRisk: (id: string) => void;
  selectedGrades: ('A' | 'B' | 'C')[];
  expandedEvidence: Record<string, boolean>;
  onToggleEvidence: (riskId: string, index: number, evidenceRef: string) => void;
  /** 回到原件：把真实 SourceAnchor 交给 canonical reader 单调用链，失败走显式反馈。 */
  onOpenSource: (anchor: SourceAnchor) => void;
}

export interface InteractiveReviewExtras {
  unverifiedRiskIds: readonly string[];
  submitEnabled: boolean;
  nonApplied: {
    items: readonly PendingRevisionConfirmation[];
    confirmedIds: readonly string[];
    /** production 恒 false（整份阻断，零 waiver）；只有显式 demo 消费者为 true。 */
    allowWaiver: boolean;
    onConfirm: (instructionId: string) => void;
    onCancel: () => void;
  };
  resultMessage?: string;
}

type DeliverableOutput = Extract<ContractReviewOutputResult, { status: 'ready_to_deliver' }>;

type NonDeliverableOutput = Exclude<ContractReviewOutputResult, { status: 'ready_to_deliver' }>;

export type RevisionPanelProps =
  | (RevisionPanelCommon & InteractiveReviewExtras & {
      mode: 'interactive';
      controls: InteractiveReviewControls;
      outputResult?: never;
      onRetryOutput?: never;
    })
  | (RevisionPanelCommon & {
      mode: 'read_only';
      controls?: never;
      outputResult: DeliverableOutput;
      onRetryOutput: () => void;
    })
  | (RevisionPanelCommon & {
      mode: 'read_only';
      controls?: never;
      outputResult: NonDeliverableOutput | undefined;
      onRetryOutput?: never;
    });

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

const BATCH_CONFIRM_VISIBLE = false;

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

/** 界面状态 → 既有处置投影。`editing` 映 `revision`（正在编辑，尚未成为决定）。 */
function dispositionFromUiState(state: ReviewItemUiState | undefined): ReviewDispositionState | undefined {
  if (!state) return undefined;
  if (state.status === 'confirmed') return 'confirmed';
  if (state.status === 'rejected') return 'rejected';
  if (state.status === 'editing') return 'revision';
  return undefined;
}

/** 只读面的处置**只从 replay 后的 RiskList 读**——不得在此另立本地 disposition 第二真源。 */
function dispositionFromLedger(risk: RiskList['risks'][number]): ReviewDispositionState | undefined {
  if (risk.dispositionStatus === 'confirmed') return 'confirmed';
  if (risk.dispositionStatus === 'rejected') return 'rejected';
  return undefined;
}

/**
 * 核验列的诚实边界：核验分级来自 gate 投影与证据台账，**只读面拿不到它们**——
 * 持久 RiskList 不携证据等级。此时渲染「已核验」就是在断言一件本面无从知道的事。
 */
const VERIFICATION_UNKNOWN_HINT = '本面不呈现核验状态：核验分级随门禁投影，只读账本不携证据等级';
function verificationLabel(hasGate: boolean, unverified: boolean): string {
  if (!hasGate) return '—';
  return unverified ? '未核验' : '已核验';
}
function verificationClass(hasGate: boolean, unverified: boolean): string {
  if (!hasGate) return 'unknown';
  return unverified ? 'unverified' : 'verified';
}

/** 只读面的结论说明：阻断与三种正常零文书终态都要说清楚，交付成功则由产物区承载。 */
function readOnlyResultNote(props: RevisionPanelProps): string | undefined {
  if (props.mode !== 'read_only' || !props.outputResult) return undefined;
  const result = props.outputResult;
  if (result.status === 'blocked') return result.message;
  if (result.status === 'not_applicable') return NOT_APPLICABLE_PREVIEW_COPY[result.reason];
  return undefined;
}

/** 产物区文案：interactive 由 mode 固定为「待生成」，只读面才由 outputResult 决定。 */
function outputPreviewCopy(props: RevisionPanelProps): { title: string; body: string; retry: boolean } {
  if (props.mode === 'interactive') {
    return { title: '合同批注预览', body: '本版产出是原合同副本加上已确认风险的批注 · 待生成', retry: false };
  }
  const result = props.outputResult;
  // 尚无结果有两种情形（门禁未到、inspect 未回），二者共同的诚实陈述都是「还没有产物」。
  if (!result) return { title: '合同批注预览', body: '本版产出是原合同副本加上已确认风险的批注 · 待生成', retry: false };
  switch (result.status) {
    case 'ready_to_deliver':
      return { title: '合同批注预览', body: '本次审查可生成批注稿 · 尚未写入本案「产出」目录', retry: true };
    case 'delivered':
    case 'already_present':
      return { title: '合同批注预览', body: `已生成批注稿：${result.fileName} · 需在 Word 中打开查看`, retry: false };
    case 'not_applicable':
      return { title: '合同批注预览', body: NOT_APPLICABLE_PREVIEW_COPY[result.reason], retry: false };
    default:
      return { title: '合同批注预览', body: result.message, retry: false };
  }
}

/** 三种**正常**零文书终态的预览语；措辞不得暗示出错，也不得概括成「未发现风险」。 */
const NOT_APPLICABLE_PREVIEW_COPY = {
  no_risks: '本次审查未形成可提交的风险项，未生成批注稿',
  all_rejected: '本次审查的风险均已驳回，未生成批注稿',
  out_of_coverage: '仍有待索证项，补充材料后可重新开始一次审查',
} as const;

export function RevisionPanel(props: RevisionPanelProps) {
  // 判别一次，之后全用这枚窄化引用——`controls && props.x` 那种写法不会让 TS 收窄 props 本身。
  const interactive = props.mode === 'interactive' ? props : undefined;
  const controls = interactive?.controls;
  const selectedRisk = props.riskList.risks.find((risk) => risk.id === props.selectedRiskId)
    ?? props.riskList.risks[0];
  if (!selectedRisk) return <EmptyState noun="风险" shortcut="从场景按钮启动合同审查" />;

  const dispositionOf = (risk: RiskList['risks'][number]) => (
    controls ? dispositionFromUiState(controls.itemStates[risk.id]) : dispositionFromLedger(risk)
  );
  const descriptionOf = (risk: RiskList['risks'][number]) => {
    const state = controls?.itemStates[risk.id];
    return state?.status === 'confirmed' && state.correctedDescription ? state.correctedDescription : risk.description;
  };
  const unverifiedIds = interactive?.unverifiedRiskIds ?? [];
  const selectedGate = controls?.gate.items.find((item) => item.itemRef === selectedRisk.id);
  const reviewedCount = selectedRisk.basis.filter((_, index) => props.expandedEvidence[`${selectedRisk.id}:${index}`]).length;
  const selectedDisposition = dispositionOf(selectedRisk);
  const selectedDescription = descriptionOf(selectedRisk);
  const selectedState = controls?.itemStates[selectedRisk.id];
  const editingSelected = selectedState?.status === 'editing';
  const selectedSettled = selectedDisposition === 'confirmed' || selectedDisposition === 'rejected' ? selectedDisposition : undefined;
  const selectedUnverified = unverifiedIds.includes(selectedRisk.id);
  const selectedNextStep = displayNextStep(selectedDisposition, selectedGate?.mode, reviewedCount === selectedRisk.basis.length, BATCH_CONFIRM_VISIBLE);
  const individualReady = selectedGate?.mode !== 'individual' || reviewedCount === selectedRisk.basis.length;
  const batchRefs = controls
    ? controls.gate.items.filter((item) => item.mode === 'batch' && !dispositionFromUiState(controls.itemStates[item.itemRef])).map((item) => item.itemRef)
    : [];
  const excludedCount = controls?.gate.items.filter((item) => item.mode === 'individual').length ?? 0;
  const nonApplied = interactive?.nonApplied;
  const resultNote = interactive?.resultMessage ?? readOnlyResultNote(props);
  const preview = outputPreviewCopy(props);
  return <StaticViewport testId="revision-static-viewport">
    <div className="revision-layout" data-testid="revision-panel" data-review-mode={props.mode}>
      {/* 面头呈现真实主合同名。固定 demo 标题与固定「修订 4 处」随本票退役。 */}
      <header className="review-head" data-testid="review-head">
        <strong>风险审查</strong>
        <span className="source-file-meta" title={props.primaryFileName}>{props.primaryFileName}</span>
      </header>
      {controls && BATCH_CONFIRM_VISIBLE && (
        <div className="batch-bar" data-testid="batch-scope">
          <span>本次范围 {batchRefs.length} 项 · 待确认且中/低危、依据已核验</span>
          <button onClick={() => batchRefs.forEach((itemRef) => controls.onConfirm(itemRef))} disabled={!batchRefs.length}>批量确认 {batchRefs.length} 项</button>
          <small>排除 {excludedCount} 项 · 高危或未核验仅逐条处理</small>
        </div>
      )}
      {controls?.submitState === 'submitted' && <div className="submission-note" role="status">{controls.gate.items.length} 项处置已逐条提交</div>}
      {/* 结论说明一处出口：interactive 取提交结果，read_only 取 coordinator 的阻断/正常终态陈述。
          缺了 read_only 这半，提交完成转只读的那一刻用户就会看着结论凭空消失。 */}
      {resultNote && <div className="submission-note" role="status" data-testid="review-result">{resultNote}</div>}
      {props.riskList.outOfCoverage.length > 0 && (
        <section className="nonapplied-confirm" data-testid="review-out-of-coverage">
          <header><strong>仍有 {props.riskList.outOfCoverage.length} 项待索证</strong><span>需补充材料后重新审查</span></header>
          <ul>{props.riskList.outOfCoverage.map((entry) => <li key={entry.summary}>{entry.summary}</li>)}</ul>
        </section>
      )}
      {controls && (
        <div className="review-submit-bar">
          <button
            type="button"
            className="primary-button"
            data-testid="submit-contract-review"
            disabled={!interactive?.submitEnabled || controls.submitState !== 'idle'}
            onClick={controls.onSubmit}
          >{controls.submitState === 'submitting' ? '正在提交处置…' : S3_REVIEW_GATE_LABEL}</button>
        </div>
      )}
      {nonApplied && nonApplied.items.length > 0 && (
        <section className="nonapplied-confirm" data-testid="nonapplied-confirm" aria-label="未能落到文书上的修订">
          <header>
            <strong>有 {nonApplied.items.length} 处修订未能落到文书上</strong>
            <span>{nonApplied.allowWaiver
              ? '请逐条核对；确认后将照常生成文书，这几处不会自动标注。取消则不生成产物。'
              : '这些风险未能唯一落到主合同，整份批注稿未生成。请修正材料后新开审查。'}</span>
          </header>
          <ul className="nonapplied-list">
            {nonApplied.items.map((item) => {
              const confirmed = nonApplied.confirmedIds.includes(item.instructionId);
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
                  {nonApplied.allowWaiver && <button
                    type="button"
                    className="primary-button"
                    data-testid="confirm-nonapplied"
                    disabled={confirmed}
                    onClick={() => nonApplied.onConfirm(item.instructionId)}
                  >{confirmed ? '已确认' : '确认知悉'}</button>}
                </li>
              );
            })}
          </ul>
          <footer>
            {nonApplied.allowWaiver && <button type="button" className="quiet-button" data-testid="cancel-nonapplied" onClick={nonApplied.onCancel}>取消，不生成产物</button>}
            <span className="nonapplied-progress">{nonApplied.allowWaiver
              ? `已确认 ${nonApplied.confirmedIds.length}/${nonApplied.items.length}`
              : '整份阻断 · 未写入文书'}</span>
          </footer>
        </section>
      )}
      <div className="risk-master-detail">
        <div className="risk-list"><div className="table-head risk-grid"><span>风险</span><span>等级</span><span>核验</span><span>处置</span><span>下一步</span></div>{props.riskList.risks.map((risk) => {
          const gateItem = controls?.gate.items.find((item) => item.itemRef === risk.id);
          const disposition = dispositionOf(risk);
          const settled = disposition === 'confirmed' || disposition === 'rejected' ? disposition : undefined;
          const unverified = unverifiedIds.includes(risk.id);
          const evidenceReady = risk.basis.every((_, index) => props.expandedEvidence[`${risk.id}:${index}`]);
          const nextStep = displayNextStep(disposition, gateItem?.mode, evidenceReady, BATCH_CONFIRM_VISIBLE);
          const description = descriptionOf(risk);
          return <button className={`dense-row risk-grid ${props.selectedRiskId === risk.id ? 'selected' : ''}`} data-risk-id={risk.id} title={description} key={risk.id} onClick={() => props.onSelectRisk(risk.id)}>
            <SignatureLine tone={riskLineTone(risk.level, disposition, unverified)} />
            <SettlementFlash kind={settled} itemRef={risk.id} testable />
            {/* 编号单源：与详情头同一 id 变换（R03），杜绝 index 序号与 id 双轨漂移 */}
            <span className="risk-summary"><b className="domain-badge">{risk.id.replace('risk-', 'R')}</b><span>{description}</span></span>
            <span className={`severity severity-${risk.level}`}>{severityLabel(risk.level)}</span>
            <span className={`verification-state ${verificationClass(controls !== undefined, unverified)}`} title={controls ? undefined : VERIFICATION_UNKNOWN_HINT}>{verificationLabel(controls !== undefined, unverified)}</span>
            <span className={`gate-state ${disposition ?? 'pending'}`}>{dispositionLabel(disposition)}</span>
            <span className="risk-next-step" title={`下一步 · ${nextStep}`}>{nextStep}</span>
          </button>;
        })}</div>
        <article className="risk-detail">
          <SignatureLine tone={riskLineTone(selectedRisk.level, selectedDisposition, selectedUnverified)} />
          <SettlementFlash kind={selectedSettled} itemRef={selectedRisk.id} />
          <SettleSeal disposition={selectedDisposition} itemRef={selectedRisk.id} />
          <header><span className="domain-badge">{selectedRisk.id.replace('risk-', 'R')}</span><strong>{selectedGate?.mode === 'individual' ? '逐条确认' : '常规审阅'}</strong><span>{reviewedCount}/{selectedRisk.basis.length} 依据已展开</span></header>
          {selectedGate?.reason && <div className="individual-note">{individualNoteCopy(selectedGate.reason === 'high_risk' ? 'high_risk' : 'unverified', BATCH_CONFIRM_VISIBLE)}</div>}
          <p>{selectedDescription}</p>
          <dl className="risk-status-ledger" data-testid="risk-detail-status">
            <div><dt>严重度</dt><dd>{severityLabel(selectedRisk.level)}</dd></div>
            <div><dt>核验</dt><dd title={controls ? undefined : VERIFICATION_UNKNOWN_HINT}>{verificationLabel(controls !== undefined, selectedUnverified)}</dd></div>
            <div><dt>处置</dt><dd>{dispositionLabel(selectedDisposition)}</dd></div>
            <div><dt>下一步</dt><dd>{selectedNextStep}</dd></div>
          </dl>
          <div className="evidence-stack">{selectedRisk.basis.map((basis, index) => {
            const open = props.expandedEvidence[`${selectedRisk.id}:${index}`];
            const quoteId = `risk-quote-${selectedRisk.id}-${index}`;
            const source = basis.sourceAnchors[0];
            return <section className="verified-block" key={`${basis.citation}-${index}`}>
              <span className="evidence-grade-slot"><TierBadge grade={props.selectedGrades[index] ?? props.selectedGrades[0]} /></span>
              <div className="evidence-body">
                <button
                  type="button"
                  className="evidence-toggle"
                  title={basis.citation}
                  onClick={() => props.onToggleEvidence(selectedRisk.id, index, selectedGate?.evidenceKeys[index] ?? basis.citation)}
                  aria-expanded={open}
                  aria-controls={quoteId}
                  aria-label={`${open ? '收起引语' : '查看引语'} · ${basis.citation}`}
                ><span>{basis.citation}</span><span>{open ? '收起引语' : '查看引语'}</span></button>
                {open && <>
                  <q id={quoteId} data-testid={quoteId}>{source?.quote || '暂无可引用原文'}</q>
                  <div className="evidence-source-actions">
                    <span className="source-file-meta" title={source?.fileId}>来源 · {sourceFileLabel(source?.fileId) || '待补'}</span>
                    {/* 无锚才禁用（没有可去之处）；有锚即可点，定位失败走显式反馈，不用 disabled 假装接线。 */}
                    <button
                      type="button"
                      className="goto-source"
                      data-testid="goto-source"
                      disabled={!source}
                      title={source ? '在只读阅读面打开这处引证' : '本条依据没有可回跳的原件坐标'}
                      onClick={() => { if (source) props.onOpenSource(source); }}
                    >回到原件</button>
                  </div>
                </>}
              </div>
            </section>;
          })}</div>
          {controls && editingSelected ? (
            <div className="review-correction-editor" data-testid="review-correction-editor">
              <label htmlFor={`review-correction-${selectedRisk.id}`}>修正风险结论</label>
              <textarea
                id={`review-correction-${selectedRisk.id}`}
                value={selectedState?.status === 'editing' ? selectedState.draft : ''}
                onChange={(event) => controls.onChangeRevision(selectedRisk.id, event.target.value)}
              />
              <div>
                <button type="button" className="quiet-button" data-testid="cancel-review-correction" onClick={() => controls.onCancelRevision(selectedRisk.id)}>取消</button>
                <button
                  type="button"
                  className="primary-button"
                  data-testid="submit-review-correction"
                  disabled={
                    selectedState?.status !== 'editing'
                    || !selectedState.draft.trim()
                    || selectedState.draft.trim() === selectedRisk.description.trim()
                  }
                  onClick={() => controls.onCommitRevision(selectedRisk.id)}
                >提交修正并确认</button>
              </div>
            </div>
          ) : (
            <footer>
              <span>{selectedGate?.mode === 'individual' ? `逐条确认 · ${reviewedCount}/${selectedRisk.basis.length} 依据已展开` : scopeFooterCopy(BATCH_CONFIRM_VISIBLE)}</span><i />
              {/* 只读面在类型上就拿不到 controls，故这三枚写入控件结构性不存在——不是运行时藏起来。 */}
              {controls && <>
                <button className="quiet-button" onClick={() => controls.onReject(selectedRisk.id)}>驳回</button>
                <button className="quiet-button" data-testid="begin-review-correction" onClick={() => controls.onBeginRevision(selectedRisk.id)}>修正</button>
                <button className="primary-button" disabled={!individualReady} onClick={() => controls.onConfirm(selectedRisk.id)}>确认此项</button>
              </>}
            </footer>
          )}
        </article>
      </div>
      {/*
        CONTRACT-OUTPUT-TRUTH-1 数据面 + CONTRACT-TRACE-1 交互面：固定合同标题、固定「修订 4 处」
        与 `<del>`/`<ins>` 整块**退役**。本版产物是「原合同副本 + 已确认风险批注」，应用内没有
        真实 redline 可呈现，就不摆一个假的——demo 与 production 在此同一诚实空态，无第二形态。
      */}
      <div className="document-preview" data-testid="revision-preview-empty">
        <header><strong>{preview.title}</strong></header>
        <p>{preview.body}</p>
        {props.mode === 'read_only' && props.outputResult?.status === 'ready_to_deliver' && (
          <button type="button" className="primary-button" data-testid="retry-contract-output" onClick={props.onRetryOutput}>生成批注稿</button>
        )}
      </div>
    </div>
  </StaticViewport>;
}
