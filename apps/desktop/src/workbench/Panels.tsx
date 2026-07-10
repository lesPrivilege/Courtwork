import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type WheelEvent } from 'react';
import type { PartyGraph, ReviewMatrix, RiskList, Timeline } from '@courtwork/schemas';
import type { ReviewDispositionState, ReviewGateProjection } from '../protocol/client';
import { Icon } from './Icon';

export type LineTone = 'danger' | 'attention' | 'revision' | 'authority';

export function TierBadge({ grade }: { grade?: 'A' | 'B' | 'C' }) {
  if (!grade) return null;
  return <span className={`tier tier-${grade.toLowerCase()}`} aria-label={`信源 ${grade}`}>{grade}</span>;
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
            <time>{event.date.kind === 'exact' ? event.date.date : '日期待核'}</time>
            <span className="domain-badge">{event.id.replace('evt-', 'E')}</span>
            <span>{event.description}</span>
            <span title={event.sourceAnchors[0]?.fileId}>{event.sourceAnchors[0]?.fileId.slice(0, 3)}</span>
          </button>;
        })}
      </div>
      <article className="detail-card">
        <SignatureLine tone={current.markers?.includes('contradiction') ? 'attention' : undefined} />
        <p>{current.description}</p>
        <div className="verified-block"><TierBadge grade={grade} /><button title={current.sourceAnchors[0]?.fileId}>{current.sourceAnchors[0]?.fileId}</button><q>{current.sourceAnchors[0]?.quote}</q></div>
      </article>
    </div>
  </StaticViewport>;
}

const GRAPH_WIDTH = 720;
const GRAPH_HEIGHT = 460;
const GRAPH_FIT_ZOOM = .78;
const GRAPH_POSITIONS = [
  { x: 100, y: 75 }, { x: 360, y: 65 }, { x: 620, y: 80 },
  { x: 160, y: 190 }, { x: 380, y: 180 }, { x: 600, y: 205 },
  { x: 90, y: 350 }, { x: 280, y: 340 }, { x: 480, y: 350 }, { x: 650, y: 350 },
];

export function GraphPanel({ graph, grade }: { graph: PartyGraph; grade?: 'A' | 'B' | 'C' }) {
  const visibleNodes = graph.nodes.slice(0, 10);
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = graph.edges.filter((edge) => visibleNodeIds.has(edge.sourcePartyId) && visibleNodeIds.has(edge.targetPartyId)).slice(0, 12);
  const positions = useMemo(() => new Map(visibleNodes.map((node, index) => [node.id, GRAPH_POSITIONS[index]])), [visibleNodes]);
  const [selectedEdge, setSelectedEdge] = useState(visibleEdges[0] ?? graph.edges[0]);
  const [zoom, setZoom] = useState(GRAPH_FIT_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | undefined>(undefined);

  if (!visibleNodes.length) return <div className="graph-layout"><EmptyState noun="关系节点" shortcut="⌘I" /></div>;

  const changeZoom = (next: number) => setZoom(Math.min(2.4, Math.max(.55, next)));
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    changeZoom(zoom * Math.exp(-event.deltaY * .002));
  };
  const beginPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button')) return;
    drag.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const movePan = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPan({ x: drag.current.panX + event.clientX - drag.current.x, y: drag.current.panY + event.clientY - drag.current.y });
  };

  return <div className="graph-layout" data-testid="graph-panel">
    <div
      className="graph-canvas"
      role="group"
      aria-label="当事人关系图谱"
      data-testid="graph-zoom-sandbox"
      data-zoom={zoom.toFixed(3)}
      onWheel={handleWheel}
      onPointerDown={beginPan}
      onPointerMove={movePan}
      onPointerUp={() => { drag.current = undefined; }}
      onPointerCancel={() => { drag.current = undefined; }}
    >
      <div className="graph-controls" aria-label="图谱视图控制">
        <button aria-label="放大图谱" title="放大" onClick={() => changeZoom(zoom + .15)}><Icon name="plus" /></button>
        <button aria-label="缩小图谱" title="缩小" onClick={() => changeZoom(zoom - .15)}><Icon name="minus" /></button>
        <button aria-label="复位图谱" title="适应窗口" onClick={() => { setZoom(GRAPH_FIT_ZOOM); setPan({ x: 0, y: 0 }); }}><Icon name="fit" /></button>
      </div>
      <div
        className="graph-world"
        data-testid="graph-world"
        style={{ width: GRAPH_WIDTH, height: GRAPH_HEIGHT, marginLeft: -GRAPH_WIDTH / 2, marginTop: -GRAPH_HEIGHT / 2, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
      >
        <svg aria-hidden="true" viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}>
          {visibleEdges.map((edge) => {
            const source = positions.get(edge.sourcePartyId);
            const target = positions.get(edge.targetPartyId);
            return source && target ? <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} /> : null;
          })}
        </svg>
        {visibleNodes.map((node) => {
          const position = positions.get(node.id) ?? { x: 0, y: 0 };
          return <button
            className={`graph-node ${node.kind}`}
            style={{ left: position.x, top: position.y }}
            key={node.id}
            title={node.primaryName}
          >{node.primaryName.replace('有限公司', '')}</button>;
        })}
      </div>
      <div className="graph-overview" aria-label="图谱概览">
        <svg viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`} aria-hidden="true">
          {visibleEdges.map((edge) => {
            const source = positions.get(edge.sourcePartyId);
            const target = positions.get(edge.targetPartyId);
            return source && target ? <line key={edge.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} /> : null;
          })}
          {visibleNodes.map((node) => { const point = positions.get(node.id)!; return <circle key={node.id} cx={point.x} cy={point.y} r="12" />; })}
        </svg>
        <span style={{ transform: `translate(${-pan.x / 18}px, ${-pan.y / 18}px) scale(${1 / zoom})` }} />
      </div>
    </div>
    <div className="relation-list">{visibleEdges.map((edge) => <button key={edge.id} title={edge.relationType} className={selectedEdge?.id === edge.id ? 'selected' : ''} onClick={() => setSelectedEdge(edge)}><span>{edge.relationType}</span><small>{edge.id}</small></button>)}</div>
    {selectedEdge && <article className="verified-block relation-evidence"><TierBadge grade={grade} /><button title={selectedEdge.sourceAnchors[0]?.fileId}>{selectedEdge.sourceAnchors[0]?.fileId}</button><q>{selectedEdge.sourceAnchors[0]?.quote}</q></article>}
  </div>;
}

export function MatrixPanel({ matrix }: { matrix: ReviewMatrix }) {
  const questions = matrix.questions.slice(0, 5);
  if (!matrix.rows.length) return <StaticViewport testId="matrix-static-viewport"><EmptyState noun="审阅行" shortcut="⌘I" /></StaticViewport>;
  return <StaticViewport testId="matrix-static-viewport">
    <div className="matrix-wrap" data-testid="matrix-panel"><table><thead><tr><th>文书</th>{questions.map((question) => <th key={question.id} title={question.text}>{question.id.toUpperCase()}</th>)}</tr></thead><tbody>{matrix.rows.slice(0, 10).map((row) => <tr key={row.documentId}><th title={row.documentId}>{row.documentId.replace('.md', '')}</th>{questions.map((question) => <td key={question.id}><button title={row.answers[question.id]?.answer}>{row.answers[question.id]?.answer ?? '—'}</button></td>)}</tr>)}</tbody></table><div className="matrix-legend"><span>单击单元格查看原文依据</span><span>10 份合同 · 7 个问题</span></div></div>
  </StaticViewport>;
}

export interface RevisionPanelProps {
  riskList: RiskList;
  selectedRisk: RiskList['risks'][number];
  selectedRiskId: string;
  onSelectRisk: (id: string) => void;
  gate?: ReviewGateProjection;
  selectedGrades: ('A' | 'B' | 'C')[];
  expandedEvidence: Record<string, boolean>;
  onExpandBasis: (riskId: string, index: number, evidenceRef: string) => void;
  dispositions: Record<string, ReviewDispositionState>;
  onDispose: (riskId: string, disposition: ReviewDispositionState) => void;
  individualReady: boolean;
  batchRefs: string[];
  onBatchConfirm: () => void;
  submitted: boolean;
}

function riskLineTone(level: RiskList['risks'][number]['level'], disposition?: ReviewDispositionState): LineTone | undefined {
  if (disposition === 'rejected') return undefined;
  if (level === 'high') return 'danger';
  if (level === 'medium') return 'attention';
  if (disposition === 'revision') return 'revision';
  if (disposition === 'confirmed') return 'authority';
  return 'attention';
}

export function RevisionPanel(props: RevisionPanelProps) {
  const selectedGate = props.gate?.items.find((item) => item.itemRef === props.selectedRisk.id);
  const reviewedCount = props.selectedRisk.basis.filter((_, index) => props.expandedEvidence[`${props.selectedRisk.id}:${index}`]).length;
  return <StaticViewport testId="revision-static-viewport">
    <div className="revision-layout" data-testid="revision-panel">
      <div className="batch-bar"><span>可批量：中/低危且依据已核验 · {props.batchRefs.length} 项</span><button onClick={props.onBatchConfirm} disabled={!props.batchRefs.length}>批量确认 {props.batchRefs.length} 项</button><small>高危与未核验条目已拆出</small></div>
      {props.submitted && <div className="submission-note" role="status">{props.gate?.items.length ?? 0} 项处置已逐条提交</div>}
      <div className="risk-master-detail">
        <div className="risk-list"><div className="table-head risk-grid"><span>风险</span><span>等级</span><span>状态</span></div>{props.riskList.risks.map((risk, index) => {
          const gateItem = props.gate?.items.find((item) => item.itemRef === risk.id);
          const disposition = props.dispositions[risk.id];
          return <button className={`dense-row risk-grid ${props.selectedRiskId === risk.id ? 'selected' : ''}`} data-risk-id={risk.id} title={risk.description} key={risk.id} onClick={() => props.onSelectRisk(risk.id)}>
            <SignatureLine tone={riskLineTone(risk.level, disposition)} />
            <span><b className="domain-badge">R{index + 1}</b>{risk.description}</span><span className={`severity severity-${risk.level}`}>{risk.level === 'high' ? '高' : risk.level === 'medium' ? '中' : '低'}</span><span className={`gate-state ${disposition ?? 'pending'}`}>{disposition === 'confirmed' ? '已确认' : disposition === 'rejected' ? '已驳回' : disposition === 'revision' ? '待修正' : gateItem?.mode === 'individual' ? '逐条' : '待确认'}</span>
          </button>;
        })}</div>
        <article className="risk-detail">
          <SignatureLine tone={riskLineTone(props.selectedRisk.level, props.dispositions[props.selectedRisk.id])} />
          <header><span className="domain-badge">{props.selectedRisk.id.replace('risk-', 'R')}</span><strong>{selectedGate?.mode === 'individual' ? '逐条确认' : '常规审阅'}</strong><span>{reviewedCount}/{props.selectedRisk.basis.length} 依据已展开</span></header>
          {selectedGate?.reason && <div className="individual-note">{selectedGate.reason === 'high_risk' ? '高危条目不进入批量范围' : '含未核验依据，不进入批量范围'}</div>}
          <p>{props.selectedRisk.description}</p>
          <div className="evidence-stack">{props.selectedRisk.basis.map((basis, index) => {
            const open = props.expandedEvidence[`${props.selectedRisk.id}:${index}`];
            return <section className="verified-block" key={`${basis.citation}-${index}`}><TierBadge grade={props.selectedGrades[index] ?? props.selectedGrades[0]} /><button title={basis.citation} onClick={() => props.onExpandBasis(props.selectedRisk.id, index, selectedGate?.evidenceKeys[index] ?? basis.citation)} aria-expanded={open}>{basis.citation}<span>{open ? '收起' : '展开原文'}</span></button>{open && <q>{basis.sourceAnchors[0]?.quote}</q>}</section>;
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

export function DraftPanel({ value, onChange, frozen, onCompile }: { value: DraftDocument; onChange: (value: DraftDocument) => void; frozen: boolean; onCompile: () => void }) {
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
      <header><div><strong>答辩状</strong><span>{frozen ? '已定稿 · 2026-07-10 17:40' : '起草中 · 自动保存'}</span></div>{frozen ? <button className="primary-button">打开 Word 文档</button> : <button className="primary-button" onClick={onCompile}>编译为 Word 文档</button>}</header>
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
