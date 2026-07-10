import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { PartyGraph, ReviewMatrix, RiskList, Timeline } from '@courtwork/schemas';
import { ProviderSetup } from './credentials/ProviderSetup';
import { credentialClient, type CredentialStatus } from './credentials/client';
import { createDemoClient } from './demo/client';
import { DEMO_ARTIFACTS } from './demo/recordings';
import {
  EMPTY_SESSION,
  projectSession,
  type ReviewDispositionState,
  type ReviewGateProjection,
  type ScenarioFlow,
} from './protocol/client';
import { buildReviewResolution } from './protocol/review-resolution';
import { Icon } from './workbench/Icon';
import {
  DraftPanel,
  GraphPanel,
  INITIAL_DRAFT,
  MatrixPanel,
  RevisionPanel,
  SignatureLine,
  TimelinePanel,
  type DraftDocument,
} from './workbench/Panels';
import { SplitView, type SplitDirection } from './workbench/SplitView';

type WorkbenchView = 'timeline' | 'graph' | 'matrix' | 'revision' | 'draft';

const client = createDemoClient();

const VIEW_LABELS: Record<WorkbenchView, string> = {
  timeline: '时间线',
  graph: '关系图谱',
  matrix: '矩阵审阅',
  revision: '修订预览',
  draft: '起草画布',
};

const VIEWS = Object.keys(VIEW_LABELS) as WorkbenchView[];

function useWideSplitAvailable() {
  const [available, setAvailable] = useState(() => window.innerWidth >= 1600);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 1600px)');
    const update = () => setAvailable(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return available;
}

export function App() {
  const [flow, setFlow] = useState<ScenarioFlow>('S3');
  const [session, dispatch] = useReducer(projectSession, EMPTY_SESSION);
  const [activeView, setActiveView] = useState<WorkbenchView>('revision');
  const [secondaryView, setSecondaryView] = useState<WorkbenchView>();
  const [splitDirection, setSplitDirection] = useState<SplitDirection>('rows');
  const [splitRatio, setSplitRatio] = useState(50);
  const [gate, setGate] = useState<ReviewGateProjection>();
  const [selectedRiskId, setSelectedRiskId] = useState('risk-03');
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const [dispositions, setDispositions] = useState<Record<string, ReviewDispositionState>>({});
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);
  const [continued, setContinued] = useState(false);
  const [compileOpen, setCompileOpen] = useState(false);
  const [draftFrozen, setDraftFrozen] = useState(false);
  const [draft, setDraft] = useState<DraftDocument>(INITIAL_DRAFT);
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus>();
  const [providerSetupOpen, setProviderSetupOpen] = useState(true);
  const wideSplitAvailable = useWideSplitAvailable();
  const openedAt = useRef<Record<string, number>>({});
  const lastReplayedFlow = useRef<ScenarioFlow | undefined>(undefined);
  const resolvedRequest = useRef<string | undefined>(undefined);

  useEffect(() => {
    void credentialClient.status().then((status) => {
      setCredentialStatus(status);
      setProviderSetupOpen(!status.configured);
    });
  }, []);

  useEffect(() => {
    if (!wideSplitAvailable && splitDirection === 'columns') setSplitDirection('rows');
  }, [splitDirection, wideSplitAvailable]);

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

    const dwellMs = gate.items.reduce((total, item) => total + Math.max(0, Date.now() - (openedAt.current[item.itemRef] ?? Date.now())), 0);
    const expandedEvidenceKeys = gate.items.flatMap((item) => item.evidenceKeys).filter((key, index, all) => all.indexOf(key) === index);
    const resolution = buildReviewResolution(gate.items, dispositions, { dwellMs, expandedEvidenceKeys });
    resolvedRequest.current = requestId;
    void client.confirmation.resolve(requestId, resolution).then(() => setReviewSubmitted(true));
  }, [dispositions, gate, session.confirmation]);

  const riskList = (session.artifacts.RiskList ?? DEMO_ARTIFACTS.riskList) as RiskList;
  const timeline = (session.artifacts.Timeline ?? DEMO_ARTIFACTS.timeline) as Timeline;
  const graph = (session.artifacts.PartyGraph ?? DEMO_ARTIFACTS.partyGraph) as PartyGraph;
  const matrix = (session.artifacts.ReviewMatrix ?? DEMO_ARTIFACTS.reviewMatrix) as ReviewMatrix;
  const selectedRisk = riskList.risks.find((risk) => risk.id === selectedRiskId) ?? riskList.risks[0];
  const gradeByKey = useMemo(() => new Map(session.evidenceGrades.map((item) => [item.key, item.grade])), [session.evidenceGrades]);
  const selectedGate = gate?.items.find((item) => item.itemRef === selectedRisk.id);
  const selectedGrades = selectedGate?.evidenceKeys.map((key) => gradeByKey.get(key)).filter((value): value is 'A' | 'B' | 'C' => Boolean(value)) ?? [];
  const unverifiedRiskIds = gate?.items
    .filter((item) => item.evidenceKeys.some((key) => gradeByKey.get(key) === 'C'))
    .map((item) => item.itemRef) ?? [];
  const allEvidenceOpened = selectedRisk.basis.every((_, index) => expandedEvidence[`${selectedRisk.id}:${index}`]);
  const individualReady = selectedGate?.mode !== 'individual' || allEvidenceOpened;
  const batchRefs = gate?.items.filter((item) => item.mode === 'batch').map((item) => item.itemRef) ?? [];
  const comparing = secondaryView !== undefined;
  const usage = flow === 'S3' ? 91 : 18;

  const selectFlow = (next: ScenarioFlow) => {
    setFlow(next);
    setActiveView(next === 'S1' ? 'timeline' : 'revision');
    setGate(undefined);
    setExpandedEvidence({});
    setDispositions({});
    setReviewSubmitted(false);
    setContinued(false);
    resolvedRequest.current = undefined;
  };

  const choosePrimaryView = (view: WorkbenchView) => {
    if (secondaryView === view && activeView !== view) setSecondaryView(activeView);
    setActiveView(view);
  };

  const startComparison = () => {
    setSecondaryView(activeView === 'draft' ? 'timeline' : 'draft');
    setSplitDirection('rows');
    setSplitRatio(50);
  };

  const resetComparison = () => {
    setSecondaryView(undefined);
    setSplitDirection('rows');
    setSplitRatio(50);
  };

  const expandBasis = (riskId: string, index: number, evidenceRef: string) => {
    const key = `${riskId}:${index}`;
    setExpandedEvidence((current) => ({ ...current, [key]: !current[key] }));
    client.emitReviewTelemetry({ type: 'review_evidence_expanded', sessionId: 'demo-s3', itemRef: riskId, evidenceRef, emittedAt: new Date().toISOString() });
  };

  const dispose = (itemRef: string, disposition: ReviewDispositionState) => {
    setDispositions((current) => ({ ...current, [itemRef]: disposition }));
    const protocolDisposition = disposition === 'confirmed' ? 'confirm' : disposition === 'rejected' ? 'reject' : 'revise';
    client.emitReviewTelemetry({ type: 'review_disposition_submitted', sessionId: 'demo-s3', itemRef, disposition: protocolDisposition, emittedAt: new Date().toISOString() });
  };

  const batchConfirm = () => {
    setDispositions((current) => Object.fromEntries([...Object.entries(current), ...batchRefs.map((ref) => [ref, 'confirmed' as const])]));
  };

  const renderView = (view: WorkbenchView) => {
    if (view === 'timeline') return <TimelinePanel timeline={timeline} grade={session.evidenceGrades[0]?.grade} />;
    if (view === 'graph') return <GraphPanel graph={graph} grade={session.evidenceGrades[0]?.grade} />;
    if (view === 'matrix') return <MatrixPanel matrix={matrix} />;
    if (view === 'draft') return <DraftPanel value={draft} onChange={setDraft} frozen={draftFrozen} onCompile={() => setCompileOpen(true)} />;
    return <RevisionPanel
      riskList={riskList}
      selectedRisk={selectedRisk}
      selectedRiskId={selectedRiskId}
      onSelectRisk={setSelectedRiskId}
      gate={gate}
      selectedGrades={selectedGrades}
      unverifiedRiskIds={unverifiedRiskIds}
      expandedEvidence={expandedEvidence}
      onExpandBasis={expandBasis}
      dispositions={dispositions}
      onDispose={dispose}
      individualReady={individualReady}
      batchRefs={batchRefs}
      onBatchConfirm={batchConfirm}
      submitted={reviewSubmitted}
    />;
  };

  const pane = (view: WorkbenchView, secondary = false) => <section className="workbench-pane" data-pane={secondary ? 'secondary' : 'primary'}>
    <header className="pane-head">
      {secondary
        ? <label><span>对照</span><select aria-label="对照工作面" value={view} onChange={(event) => setSecondaryView(event.target.value as WorkbenchView)}>{VIEWS.map((candidate) => <option value={candidate} key={candidate}>{VIEW_LABELS[candidate]}</option>)}</select></label>
        : <><strong>{VIEW_LABELS[view]}</strong><span>主工作面</span></>}
    </header>
    <div className="pane-content">{renderView(view)}</div>
  </section>;

  return (
    <main className="app-shell" data-testid="workbench">
      <header className="titlebar">
        <div className="brand"><img src="/courtwork-mark.svg" alt="" />Courtwork</div>
        <span className="bar-divider" />
        <strong className="truncate" title="临江精铸 诉 起云智能 设备采购合同纠纷">临江精铸 诉 起云智能 设备采购合同纠纷</strong>
        <span className="case-number">(2025)云章03民初472号</span>
        <span className="spacer" />
        <span className="shortcut"><kbd>⌘</kbd><kbd>K</kbd> 场景与检索</span>
      </header>

      <nav className="toolbar" aria-label="工作台工具栏">
        <span>案件</span><span className="crumb-sep">›</span>
        <strong>{flow === 'S1' ? '阶段一 · 阅卷整理' : '阶段二 · 合同审查'}</strong>
        <span className="spacer" />
        <button className="quiet-button credential-button" onClick={() => setProviderSetupOpen(true)} title="配置文书助手"><Icon name="settings" />模型服务 · {credentialStatus?.configured ? '已连接' : '待连接'}</button>
        <button className="quiet-button" disabled title="审阅记录 · 待生成">审阅记录</button>
        <button className="primary-button" disabled title="导出审阅稿 · 待完成文书生成">导出审阅稿</button>
      </nav>

      <div className={`workspace ${comparing ? 'comparing' : ''}`} data-testid="workspace" data-comparing={comparing ? 'true' : 'false'}>
        <aside className="case-rail">
          <div className="case-expanded">
            <PanelHead title="案件" count="1" />
            <div className="case-scroll">
              <article className="case-card selected">
                <strong className="truncate" title="临江精铸 诉 起云智能 设备采购合同纠纷">临江精铸 诉 起云智能 设备采购合同纠纷</strong>
                <span className="case-number">(2025)云章03民初472号</span>
                <span>卷宗 20 件 · 已归档摄取</span>
              </article>
              <p className="rail-label">阶段</p>
              <button className={`stage-row ${flow === 'S1' ? 'selected' : ''}`} onClick={() => selectFlow('S1')} data-testid="flow-s1"><Icon name="panels" />阶段一 · 阅卷整理<span>已归档</span></button>
              <button className={`stage-row ${flow === 'S3' ? 'selected' : ''}`} onClick={() => selectFlow('S3')} data-testid="flow-s3"><Icon name="panels" />阶段二 · 合同审查<span>{Object.keys(dispositions).length}/6</span></button>
            </div>
            <div className="rail-footer">主办律师 · 林律师</div>
          </div>
          <nav className="collapsed-case-icons" aria-label="折叠的案件栏">
            <button aria-label="当前案件" title="临江精铸案"><Icon name="case" /><span className="unread-count">1</span></button>
            <button aria-label="阅卷整理" title="阅卷整理" onClick={() => selectFlow('S1')}><Icon name="panels" /></button>
            <button aria-label="合同审查" title="合同审查" onClick={() => selectFlow('S3')}><Icon name="conversation" /></button>
          </nav>
        </aside>

        <section className="conversation">
          <PanelHead title="对话" count={flow === 'S1' ? '本阶段 3 轮' : '本阶段 6 轮'} shortcut="J K 逐条" />
          <div className="conversation-scroll">
            <div className="user-message">{flow === 'S1' ? '整理全套卷宗，标出事件矛盾并核对当事人关系。' : '审查这份设备采购合同，重点看付款、验收与违约责任。'}</div>
            <article className="data-card">
              <SignatureLine tone={flow === 'S1' ? 'attention' : undefined} />
              <div className="card-heading"><span className="domain-badge">{flow === 'S1' ? 'D20' : 'D04'}</span><strong>{flow === 'S1' ? '卷宗整理已启动' : '合同审查已完成'}</strong></div>
              <p>{flow === 'S1' ? '已按卷宗顺序识别文书，并把事件与主体关系交叉核对。' : '已完成条款抽取与当事人核对，审查结果已送达右侧工作面。'}</p>
            </article>
            {session.progress.map((message, index) => <div className="progress-card" key={`${message}-${index}`}><span className="progress-pulse" />{message}</div>)}
            <article className="data-card compact-result">
              <SignatureLine tone={flow === 'S3' ? 'danger' : 'attention'} />
              <div className="card-heading"><span className="domain-badge">{flow === 'S3' ? 'R' : 'E'}</span><strong>{flow === 'S3' ? '发现 6 项合同风险' : '时间线与关系图谱已生成'}</strong></div>
              <p>{flow === 'S3' ? '高危 2 项、中危 3 项、低危 1 项。高危与未核验条目需要逐条展开。' : '已形成 47 个事件、14 个主体和 15 条关系；4 处矛盾等待核对。'}</p>
            </article>
            <aside className="generated-callout"><strong>审阅提示</strong><p>{flow === 'S3' ? '先核对验收条款的原文依据，再决定是否接受对应修订。' : '催告主体、收款账户与验收结论存在交叉矛盾，建议优先核对。'}</p></aside>
          </div>
          <div className="scene-strip"><button onClick={() => selectFlow('S1')}>整理卷宗</button><button onClick={() => selectFlow('S3')}>审查合同</button><button onClick={() => choosePrimaryView('draft')}>起草答辩状</button></div>
          <button className="composer" disabled aria-label="自由输入" title="自由输入 · 模型服务待连接"><span>描述要办的事，或从上方场景开始…</span><kbd>⌘</kbd><kbd>K</kbd></button>
        </section>

        <section className="right-workbench">
          <PanelHead title={comparing ? '工作面对照' : VIEW_LABELS[activeView]} count={comparing ? '双面' : viewCount(activeView, draftFrozen)} />
          <div className="view-tabs" role="tablist" aria-label="结构化工作面">
            {VIEWS.map((view) => <button key={view} role="tab" aria-selected={activeView === view} className={activeView === view ? 'active' : ''} onClick={() => choosePrimaryView(view)} data-testid={`view-${view}`}><span>{VIEW_LABELS[view]}</span><i className="tab-indicator" aria-hidden="true" /></button>)}
            <span className="tab-spacer" />
            {!comparing && <button className="view-action" onClick={startComparison} data-testid="split-start" title="开始上下对照"><Icon name="compare" />对照</button>}
            {comparing && <>
              <button className={`icon-button ${splitDirection === 'rows' ? 'active' : ''}`} aria-label="上下对照" title="上下对照" aria-pressed={splitDirection === 'rows'} onClick={() => setSplitDirection('rows')}><Icon name="stack" /></button>
              <button className={`icon-button ${splitDirection === 'columns' ? 'active' : ''}`} aria-label="左右对照" title={wideSplitAvailable ? '左右对照' : '窗口宽度达到 1600 后可用'} aria-pressed={splitDirection === 'columns'} disabled={!wideSplitAvailable} onClick={() => setSplitDirection('columns')}><Icon name="columns" /></button>
              <button className="view-action" onClick={resetComparison} data-testid="split-reset" title="退出对照并恢复三栏"><Icon name="reset" />复位</button>
            </>}
          </div>
          <div className="view-content">
            {secondaryView
              ? <SplitView direction={splitDirection} ratio={splitRatio} onRatioChange={setSplitRatio} primary={pane(activeView)} secondary={pane(secondaryView, true)} />
              : renderView(activeView)}
          </div>
        </section>
      </div>

      <footer className="statusbar">
        <button className="usage-button" onClick={() => setUsageOpen((open) => !open)} aria-expanded={usageOpen} data-testid="usage-ring">
          <span className={`usage-ring ${usage >= 85 ? 'critical' : ''}`} style={{ '--usage': `${usage}%` } as React.CSSProperties} />本阶段用量 {usage}%
        </button>
        {usageOpen && <div className="usage-popover"><strong>本阶段用量</strong><span>卷宗占用 {flow === 'S1' ? '14%' : '62%'}</span><span>对话占用 {flow === 'S1' ? '4%' : '23%'}</span><span>可整理内容 {flow === 'S1' ? '0%' : '6%'}</span></div>}
        <span>摄取余量 <b>1,154</b></span>
        {usage >= 85 && <button className="continuation-button" disabled={continued} title={continued ? '下一阶段已开启' : '开启下一阶段'} onClick={() => void client.continuation.continueSession('demo-s3').then(() => setContinued(true))}>继续本案工作</button>}
        {continued && <span className="continued-note" role="status">已开启下一阶段</span>}
        <span className="spacer" />
        <span>{session.failures.length ? '有步骤需要人工处理' : flow === 'S1' ? '摄取进行中 16 / 20' : `${Object.keys(dispositions).length} / 6 项已处置`}</span>
        <span>{flow === 'S1' ? '阶段一 · 阅卷整理' : '阶段二 · 合同审查'}</span>
      </footer>

      {compileOpen && <div className="modal-backdrop" role="presentation"><section className="compile-dialog" role="dialog" aria-modal="true" aria-labelledby="compile-title"><h2 id="compile-title">编译为 Word 文档</h2><p>定稿后，本画布将转为只读存档。后续修改将在文书修订中逐条处理，无法返回起草状态。</p><div><button className="quiet-button" onClick={() => setCompileOpen(false)}>取消</button><button className="primary-button" onClick={() => { setDraftFrozen(true); setCompileOpen(false); }}>确认定稿并编译</button></div></section></div>}

      <ProviderSetup
        open={providerSetupOpen}
        allowSkip={!credentialStatus?.configured}
        onClose={() => setProviderSetupOpen(false)}
        onStatusChange={setCredentialStatus}
      />
    </main>
  );
}

function PanelHead({ title, count, shortcut }: { title: string; count: string; shortcut?: string }) {
  return <header className="panel-head"><h2>{title}</h2><span>{count}</span><i />{shortcut && <small>{shortcut}</small>}</header>;
}

function viewCount(view: WorkbenchView, draftFrozen: boolean) {
  if (view === 'timeline') return '47 件';
  if (view === 'graph') return '14 · 15';
  if (view === 'matrix') return '10 × 7';
  if (view === 'revision') return '4 处';
  return draftFrozen ? '已定稿' : '起草中';
}
