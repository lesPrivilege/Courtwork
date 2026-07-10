import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { PartyGraph, ReviewMatrix, RiskList, Timeline } from '@courtwork/schemas';
import { createDemoClient } from './demo/client';
import { DEMO_ARTIFACTS } from './demo/recordings';
import { EMPTY_SESSION, projectSession, type ReviewGateProjection, type ScenarioFlow } from './protocol/client';

type WorkbenchView = 'timeline' | 'graph' | 'matrix' | 'revision' | 'draft';
type Disposition = 'confirmed' | 'rejected' | 'revision';

const client = createDemoClient();

const VIEW_LABELS: Record<WorkbenchView, string> = {
  timeline: '时间线',
  graph: '关系图谱',
  matrix: '矩阵审阅',
  revision: '修订预览',
  draft: '起草画布',
};

function TierBadge({ grade }: { grade?: 'A' | 'B' | 'C' }) {
  if (!grade) return null;
  return <span className={`tier tier-${grade.toLowerCase()}`} aria-label={`信源 ${grade}`}>{grade}</span>;
}

function SignatureLine({ tone = 'neutral' }: { tone?: string }) {
  return <span className={`signature-line line-${tone}`} aria-hidden="true" />;
}

export function App() {
  const [flow, setFlow] = useState<ScenarioFlow>('S3');
  const [session, dispatch] = useReducer(projectSession, EMPTY_SESSION);
  const [activeView, setActiveView] = useState<WorkbenchView>('revision');
  const [gate, setGate] = useState<ReviewGateProjection>();
  const [selectedRiskId, setSelectedRiskId] = useState('risk-03');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [dispositions, setDispositions] = useState<Record<string, Disposition>>({});
  const [usageOpen, setUsageOpen] = useState(false);
  const [compileOpen, setCompileOpen] = useState(false);
  const [draftFrozen, setDraftFrozen] = useState(false);
  const [draft, setDraft] = useState('## 答辩意见\n\n起云智能认为，涉案设备验收标准与异议期限约定不明，应结合验收单、会议纪要及履行过程综合判断。');
  const openedAt = useRef<Record<string, number>>({});
  const lastReplayedFlow = useRef<ScenarioFlow | undefined>(undefined);
  const resolvedRequest = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (lastReplayedFlow.current === flow) return;
    lastReplayedFlow.current = flow;
    void client.replay(flow, dispatch);
  }, [flow]);

  useEffect(() => {
    const requestId = session.confirmation?.requestId;
    if (!requestId) return;
    void client.confirmation.getGateProjection(requestId).then(setGate);
  }, [session.confirmation]);

  useEffect(() => {
    openedAt.current[selectedRiskId] = Date.now();
    client.emitReviewTelemetry({ type: 'review_item_opened', sessionId: 'demo-s3', itemRef: selectedRiskId, emittedAt: new Date().toISOString() });
  }, [selectedRiskId]);

  useEffect(() => {
    const requestId = session.confirmation?.requestId;
    if (!requestId || !gate?.items.length || resolvedRequest.current === requestId) return;
    if (!gate.items.every((item) => dispositions[item.itemRef])) return;
    resolvedRequest.current = requestId;
    const dwellMs = gate.items.reduce((total, item) => total + Math.max(0, Date.now() - (openedAt.current[item.itemRef] ?? Date.now())), 0);
    const expandedEvidenceKeys = gate.items.flatMap((item) => item.evidenceKeys).filter((_, index, all) => all.indexOf(all[index]) === index);
    void client.confirmation.resolve(requestId, 'confirm', { dwellMs, expandedEvidenceKeys });
  }, [dispositions, gate, session.confirmation]);

  const riskList = (session.artifacts.RiskList ?? DEMO_ARTIFACTS.riskList) as RiskList;
  const timeline = (session.artifacts.Timeline ?? DEMO_ARTIFACTS.timeline) as Timeline;
  const graph = (session.artifacts.PartyGraph ?? DEMO_ARTIFACTS.partyGraph) as PartyGraph;
  const matrix = (session.artifacts.ReviewMatrix ?? DEMO_ARTIFACTS.reviewMatrix) as ReviewMatrix;
  const selectedRisk = riskList.risks.find((risk) => risk.id === selectedRiskId) ?? riskList.risks[0];
  const gradeByKey = useMemo(() => new Map(session.evidenceGrades.map((item) => [item.key, item.grade])), [session.evidenceGrades]);
  const selectedGate = gate?.items.find((item) => item.itemRef === selectedRisk.id);
  const selectedGrades = selectedGate?.evidenceKeys.map((key) => gradeByKey.get(key)).filter((value): value is 'A' | 'B' | 'C' => Boolean(value)) ?? [];
  const allEvidenceOpened = selectedRisk.basis.every((_, index) => expandedEvidence[`${selectedRisk.id}:${index}`]);
  const mustReviewIndividually = selectedGate?.mode === 'individual';
  const individualReady = !mustReviewIndividually || allEvidenceOpened;
  const batchRefs = gate?.items.filter((item) => item.mode === 'batch').map((item) => item.itemRef) ?? [];

  const selectFlow = (next: ScenarioFlow) => {
    setFlow(next);
    setActiveView(next === 'S1' ? 'timeline' : 'revision');
    setGate(undefined);
    setExpandedEvidence({});
    setDispositions({});
  };

  const openRisk = (riskId: string) => {
    setSelectedRiskId(riskId);
  };

  const expandBasis = (riskId: string, index: number, evidenceRef: string) => {
    const key = `${riskId}:${index}`;
    setExpandedEvidence((current) => ({ ...current, [key]: !current[key] }));
    client.emitReviewTelemetry({ type: 'review_evidence_expanded', sessionId: 'demo-s3', itemRef: riskId, evidenceRef, emittedAt: new Date().toISOString() });
  };

  const dispose = (itemRef: string, disposition: Disposition) => {
    setDispositions((current) => ({ ...current, [itemRef]: disposition }));
    client.emitReviewTelemetry({ type: 'review_disposition_submitted', sessionId: 'demo-s3', itemRef, disposition: disposition === 'confirmed' ? 'confirm' : disposition === 'rejected' ? 'reject' : 'revise', emittedAt: new Date().toISOString() });
  };

  const batchConfirm = () => {
    setDispositions((current) => Object.fromEntries([...Object.entries(current), ...batchRefs.map((ref) => [ref, 'confirmed' as const])]));
  };

  return (
    <main className="app-shell" data-testid="workbench">
      <header className="titlebar">
        <div className="brand"><img src="/courtwork-mark.svg" alt="" />Courtwork</div>
        <span className="bar-divider" />
        <strong>临江精铸 诉 起云智能 设备采购合同纠纷</strong>
        <span className="case-number">(2025)云章03民初472号</span>
        <span className="spacer" />
        <span className="shortcut"><kbd>⌘</kbd><kbd>K</kbd> 场景与检索</span>
      </header>

      <nav className="toolbar" aria-label="工作台工具栏">
        <span>案件</span><span className="crumb-sep">›</span>
        <strong>{flow === 'S1' ? '阶段一 · 阅卷整理' : '阶段二 · 合同审查'}</strong>
        <span className="spacer" />
        <button className="quiet-button">查看卷宗</button>
        <button className="quiet-button">审阅记录</button>
        <button className="primary-button" disabled={!draftFrozen && Object.keys(dispositions).length < 4}>导出审阅稿</button>
      </nav>

      <div className="workspace">
        <aside className="case-rail">
          <PanelHead title="案件" count="1" />
          <div className="case-scroll">
            <article className="case-card selected">
              <strong>临江精铸 诉 起云智能<br />设备采购合同纠纷</strong>
              <span className="case-number">(2025)云章03民初472号</span>
              <span>卷宗 20 件 · 已归档摄取</span>
            </article>
            <p className="rail-label">阶段</p>
            <button className={`stage-row ${flow === 'S1' ? 'selected' : ''}`} onClick={() => selectFlow('S1')} data-testid="flow-s1">
              <i />阶段一 · 阅卷整理<span>已归档</span>
            </button>
            <button className={`stage-row ${flow === 'S3' ? 'selected' : ''}`} onClick={() => selectFlow('S3')} data-testid="flow-s3">
              <i />阶段二 · 合同审查<span>{Object.keys(dispositions).length}/6</span>
            </button>
          </div>
          <div className="rail-footer">主办律师 · 林律师</div>
        </aside>

        <section className="conversation">
          <PanelHead title="对话" count={flow === 'S1' ? '本阶段 3 轮' : '本阶段 6 轮'} shortcut="J K 逐条" />
          <div className="conversation-scroll">
            <div className="user-message">{flow === 'S1' ? '整理全套卷宗，标出事件矛盾并核对当事人关系。' : '审查这份设备采购合同，重点看付款、验收与违约责任。'}</div>
            <article className="data-card">
              <SignatureLine tone={flow === 'S1' ? 'attention' : 'neutral'} />
              <div className="card-heading"><span className="domain-badge">{flow === 'S1' ? 'D20' : 'D04'}</span><strong>{flow === 'S1' ? '卷宗整理已启动' : '合同审查已启动'}</strong></div>
              <p>{flow === 'S1' ? '已按卷宗顺序识别文书，并把事件与主体关系交叉核对。' : '已完成条款抽取与当事人核对，审查结果已送达右侧工作面。'}</p>
            </article>
            {session.progress.map((message, index) => <div className="progress-card" key={`${message}-${index}`}><span className="progress-pulse" />{message}</div>)}
            <article className={`data-card ${flow === 'S3' ? 'compact-result' : ''}`}>
              <SignatureLine tone={flow === 'S3' ? 'danger' : 'attention'} />
              <div className="card-heading"><span className="domain-badge">{flow === 'S3' ? 'R' : 'E'}</span><strong>{flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}</strong></div>
              <p>{flow === 'S3' ? '高危 2 项、中危 3 项、低危 1 项。高危与未核验条目需要逐条展开。' : '已形成 47 个事件、14 个主体和 15 条关系；4 处矛盾等待核对。'}</p>
            </article>
            <aside className="generated-callout"><strong>审阅提示</strong><p>{flow === 'S3' ? '先核对验收条款的原文依据，再决定是否接受对应修订。' : '催告主体、收款账户与验收结论存在交叉矛盾，建议优先核对。'}</p></aside>
          </div>
          <div className="scene-strip">
            <button onClick={() => selectFlow('S1')}>整理卷宗</button>
            <button onClick={() => selectFlow('S3')}>审查合同</button>
            <button onClick={() => setActiveView('draft')}>起草答辩状</button>
          </div>
          <div className="composer"><span>描述要办的事，或从上方场景开始…</span><kbd>⌘</kbd><kbd>K</kbd></div>
        </section>

        <section className="right-workbench">
          <PanelHead title={VIEW_LABELS[activeView]} count={activeView === 'timeline' ? '47 件' : activeView === 'graph' ? '14 · 15' : activeView === 'matrix' ? '10 × 7' : activeView === 'revision' ? '4 处' : draftFrozen ? '已定稿' : '起草中'} />
          <div className="view-tabs" role="tablist" aria-label="结构化工作面">
            {(Object.keys(VIEW_LABELS) as WorkbenchView[]).map((view) => (
              <button key={view} role="tab" aria-selected={activeView === view} className={activeView === view ? 'active' : ''} onClick={() => setActiveView(view)} data-testid={`view-${view}`}>{VIEW_LABELS[view]}</button>
            ))}
          </div>
          <div className="view-content">
            {activeView === 'timeline' && <TimelinePanel timeline={timeline} grade={session.evidenceGrades[0]?.grade} />}
            {activeView === 'graph' && <GraphPanel graph={graph} grade={session.evidenceGrades[0]?.grade} />}
            {activeView === 'matrix' && <MatrixPanel matrix={matrix} />}
            {activeView === 'revision' && (
              <RevisionPanel
                riskList={riskList} selectedRisk={selectedRisk} selectedRiskId={selectedRiskId} onSelectRisk={openRisk}
                gate={gate} selectedGrades={selectedGrades} expandedEvidence={expandedEvidence} onExpandBasis={expandBasis}
                dispositions={dispositions} onDispose={dispose} individualReady={individualReady} batchRefs={batchRefs} onBatchConfirm={batchConfirm}
              />
            )}
            {activeView === 'draft' && <DraftPanel value={draft} onChange={setDraft} frozen={draftFrozen} onCompile={() => setCompileOpen(true)} />}
          </div>
        </section>
      </div>

      <footer className="statusbar">
        <button className="usage-button" onClick={() => setUsageOpen((open) => !open)} aria-expanded={usageOpen} data-testid="usage-ring">
          <span className="usage-ring" style={{ '--usage': flow === 'S1' ? '18%' : '41%' } as React.CSSProperties} />本阶段用量 {flow === 'S1' ? '18%' : '41%'}
        </button>
        {usageOpen && <div className="usage-popover"><strong>本阶段用量</strong><span>卷宗占用 {flow === 'S1' ? '14%' : '28%'}</span><span>对话占用 {flow === 'S1' ? '4%' : '13%'}</span><span>可整理内容 {flow === 'S1' ? '0%' : '6%'}</span></div>}
        <span>摄取余量 <b>1,154</b></span>
        <span className="spacer" />
        <span>{session.failures.length ? '有步骤需要人工处理' : flow === 'S1' ? '摄取进行中 16 / 20' : `${Object.keys(dispositions).length} / 6 项已处置`}</span>
        <span>{flow === 'S1' ? '阶段一 · 阅卷整理' : '阶段二 · 合同审查'}</span>
      </footer>

      {compileOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="compile-dialog" role="dialog" aria-modal="true" aria-labelledby="compile-title">
            <h2 id="compile-title">编译为 Word 文档</h2>
            <p>定稿后，本画布将转为只读存档。后续修改将在文书修订中逐条处理，无法返回起草状态。</p>
            <div><button className="quiet-button" onClick={() => setCompileOpen(false)}>取消</button><button className="primary-button" onClick={() => { setDraftFrozen(true); setCompileOpen(false); }}>确认定稿并编译</button></div>
          </section>
        </div>
      )}
    </main>
  );
}

function PanelHead({ title, count, shortcut }: { title: string; count: string; shortcut?: string }) {
  return <header className="panel-head"><h2>{title}</h2><span>{count}</span><i />{shortcut && <small>{shortcut}</small>}</header>;
}

function TimelinePanel({ timeline, grade }: { timeline: Timeline; grade?: 'A' | 'B' | 'C' }) {
  const [selected, setSelected] = useState(timeline.events[30]?.id ?? timeline.events[0]?.id);
  const current = timeline.events.find((item) => item.id === selected) ?? timeline.events[0];
  return <div className="timeline-layout" data-testid="timeline-panel">
    <div className="table-head timeline-grid"><span>日期</span><span>编号</span><span>事件</span><span>来源</span></div>
    <div className="dense-table">
      {timeline.events.slice(0, 16).map((event) => <button className={`dense-row timeline-grid ${selected === event.id ? 'selected' : ''}`} key={event.id} onClick={() => setSelected(event.id)}>
        <SignatureLine tone={event.description.includes('矛盾') ? 'attention' : 'neutral'} />
        <time>{event.date.kind === 'exact' ? event.date.date : '日期待核'}</time><span className="domain-badge">{event.id.replace('evt-', 'E')}</span><span>{event.description}</span><span>{event.sourceAnchors[0]?.fileId.slice(0, 3)}</span>
      </button>)}
    </div>
    {current && <article className="detail-card detail-line-attention"><SignatureLine tone="attention" /><p>{current.description}</p><div className="verified-block"><TierBadge grade={grade} /><button>{current.sourceAnchors[0]?.fileId}</button><q>{current.sourceAnchors[0]?.quote}</q></div></article>}
  </div>;
}

function GraphPanel({ graph, grade }: { graph: PartyGraph; grade?: 'A' | 'B' | 'C' }) {
  const [selectedEdge, setSelectedEdge] = useState(graph.edges[0]);
  return <div className="graph-layout" data-testid="graph-panel">
    <div className="graph-canvas" role="img" aria-label="当事人关系图谱">
      {graph.nodes.slice(0, 10).map((node, index) => <div className={`graph-node ${node.kind}`} style={{ left: `${8 + (index % 3) * 31}%`, top: `${8 + Math.floor(index / 3) * 22}%` }} key={node.id}>{node.primaryName.replace('有限公司', '')}</div>)}
      <svg aria-hidden="true" viewBox="0 0 900 520" preserveAspectRatio="none">{graph.edges.slice(0, 12).map((edge, index) => <line key={edge.id} x1={110 + (index % 3) * 280} y1={70 + Math.floor(index / 3) * 110} x2={220 + ((index + 1) % 3) * 280} y2={150 + Math.floor(index / 3) * 100} />)}</svg>
    </div>
    <div className="relation-list">{graph.edges.slice(0, 8).map((edge) => <button key={edge.id} className={selectedEdge.id === edge.id ? 'selected' : ''} onClick={() => setSelectedEdge(edge)}><span>{edge.relationType}</span><small>{edge.id}</small></button>)}</div>
    <article className="verified-block relation-evidence"><TierBadge grade={grade} /><button>{selectedEdge.sourceAnchors[0]?.fileId}</button><q>{selectedEdge.sourceAnchors[0]?.quote}</q></article>
  </div>;
}

function MatrixPanel({ matrix }: { matrix: ReviewMatrix }) {
  const questions = matrix.questions.slice(0, 5);
  return <div className="matrix-wrap" data-testid="matrix-panel"><table><thead><tr><th>文书</th>{questions.map((question) => <th key={question.id} title={question.text}>{question.id.toUpperCase()}</th>)}</tr></thead><tbody>{matrix.rows.slice(0, 10).map((row) => <tr key={row.documentId}><th>{row.documentId.replace('.md', '')}</th>{questions.map((question) => <td key={question.id}><button title={row.answers[question.id]?.answer}>{row.answers[question.id]?.answer ?? '—'}</button></td>)}</tr>)}</tbody></table><div className="matrix-legend"><span>单击单元格查看原文依据</span><span>10 份合同 · 7 个问题</span></div></div>;
}

interface RevisionPanelProps {
  riskList: RiskList;
  selectedRisk: RiskList['risks'][number];
  selectedRiskId: string;
  onSelectRisk: (id: string) => void;
  gate?: ReviewGateProjection;
  selectedGrades: ('A' | 'B' | 'C')[];
  expandedEvidence: Record<string, boolean>;
  onExpandBasis: (riskId: string, index: number, evidenceRef: string) => void;
  dispositions: Record<string, Disposition>;
  onDispose: (riskId: string, disposition: Disposition) => void;
  individualReady: boolean;
  batchRefs: string[];
  onBatchConfirm: () => void;
}

function RevisionPanel(props: RevisionPanelProps) {
  const selectedGate = props.gate?.items.find((item) => item.itemRef === props.selectedRisk.id);
  const reviewedCount = props.selectedRisk.basis.filter((_, index) => props.expandedEvidence[`${props.selectedRisk.id}:${index}`]).length;
  return <div className="revision-layout" data-testid="revision-panel">
    <div className="batch-bar"><span>可批量：中/低危且依据已核验 · {props.batchRefs.length} 项</span><button onClick={props.onBatchConfirm} disabled={!props.batchRefs.length}>批量确认 {props.batchRefs.length} 项</button><small>高危与未核验条目已拆出</small></div>
    <div className="risk-master-detail">
      <div className="risk-list"><div className="table-head risk-grid"><span>风险</span><span>等级</span><span>状态</span></div>{props.riskList.risks.map((risk, index) => {
        const gateItem = props.gate?.items.find((item) => item.itemRef === risk.id);
        return <button className={`dense-row risk-grid ${props.selectedRiskId === risk.id ? 'selected' : ''}`} key={risk.id} onClick={() => props.onSelectRisk(risk.id)}>
          <SignatureLine tone={risk.level === 'high' ? 'danger' : risk.level === 'medium' ? 'attention' : 'neutral'} />
          <span><b className="domain-badge">R{index + 1}</b>{risk.description}</span><span className={`severity severity-${risk.level}`}>{risk.level === 'high' ? '高' : risk.level === 'medium' ? '中' : '低'}</span><span className={`gate-state ${props.dispositions[risk.id] ?? 'pending'}`}>{props.dispositions[risk.id] === 'confirmed' ? '已确认' : props.dispositions[risk.id] === 'rejected' ? '已驳回' : props.dispositions[risk.id] === 'revision' ? '待修正' : gateItem?.mode === 'individual' ? '逐条' : '待确认'}</span>
        </button>;
      })}</div>
      <article className={`risk-detail detail-line-${props.selectedRisk.level}`}>
        <SignatureLine tone={props.selectedRisk.level === 'high' ? 'danger' : props.selectedRisk.level === 'medium' ? 'attention' : 'neutral'} />
        <header><span className="domain-badge">{props.selectedRisk.id.replace('risk-', 'R')}</span><strong>{selectedGate?.mode === 'individual' ? '逐条确认' : '常规审阅'}</strong><span>{reviewedCount}/{props.selectedRisk.basis.length} 依据已展开</span></header>
        {selectedGate?.reason && <div className="individual-note">{selectedGate.reason === 'high_risk' ? '高危条目不进入批量范围' : '含未核验依据，不进入批量范围'}</div>}
        <p>{props.selectedRisk.description}</p>
        <div className="evidence-stack">{props.selectedRisk.basis.map((basis, index) => {
          const open = props.expandedEvidence[`${props.selectedRisk.id}:${index}`];
          return <section className="verified-block" key={`${basis.citation}-${index}`}><TierBadge grade={props.selectedGrades[index] ?? props.selectedGrades[0]} /><button onClick={() => props.onExpandBasis(props.selectedRisk.id, index, selectedGate?.evidenceKeys[index] ?? basis.citation)} aria-expanded={open}>{basis.citation}<span>{open ? '收起' : '展开原文'}</span></button>{open && <q>{basis.sourceAnchors[0]?.quote}</q>}</section>;
        })}</div>
        <footer><span>{selectedGate?.mode === 'individual' ? `逐条确认 · ${reviewedCount}/${props.selectedRisk.basis.length} 依据已展开` : '可在批量范围内确认'}</span><i /><button className="quiet-button" onClick={() => props.onDispose(props.selectedRisk.id, 'rejected')}>驳回</button><button className="quiet-button" onClick={() => props.onDispose(props.selectedRisk.id, 'revision')}>修正</button><button className="primary-button" disabled={!props.individualReady} onClick={() => props.onDispose(props.selectedRisk.id, 'confirmed')}>确认</button></footer>
      </article>
    </div>
    <div className="document-preview"><header><strong>精密铸造生产线设备采购合同</strong><span>修订 4 处</span></header><p>乙方应于本合同签订后 7 日内支付预付款。逾期付款的，<del>每逾期一日按未付金额的 1%</del><ins>违约金以实际损失为基础，并依法定标准调整</ins>。</p><p>设备到货后，买方应在 <ins>7 个工作日内书面提出验收异议</ins>；逾期未提出不当然视为验收合格。</p></div>
  </div>;
}

function DraftPanel({ value, onChange, frozen, onCompile }: { value: string; onChange: (value: string) => void; frozen: boolean; onCompile: () => void }) {
  return <div className={`draft-panel ${frozen ? 'frozen' : ''}`} data-testid="draft-panel"><header><div><strong>答辩状</strong><span>{frozen ? '已定稿 · 2026-07-10 17:40' : '起草中 · 自动保存'}</span></div>{frozen ? <button className="primary-button">打开 Word 文档</button> : <button className="primary-button" onClick={onCompile}>编译为 Word 文档</button>}</header>{frozen ? <article className="draft-reading">{value.split('\n').map((line, index) => line ? <p key={index}>{line.replace(/^##\s*/, '')}</p> : <br key={index} />)}</article> : <textarea aria-label="文书起草画布" value={value} onChange={(event) => onChange(event.target.value)} />}</div>;
}
